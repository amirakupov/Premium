import * as THREE from 'three';
import { NEURON, SOMA } from '../params';
import type { TierProfile } from '../perf';
import { SNOISE3 } from './glsl';

/**
 * Материалы «плоти» нейрона: крона, мембрана сомы, ядро.
 *
 * Всё построено на `MeshPhysicalMaterial`, а не на самодельном шейдере. ТЗ
 * предлагало для слабых тиров писать свою аппроксимацию Lambert + rim + wrap,
 * но замерить оба варианта в этой сессии нельзя (FPS снимает владелец), а два
 * несовпадающих освещения в одной сцене — гарантированный рассинхрон между
 * тирами. Поэтому путь один: физический материал везде, а по тирам
 * отключается только дорогое — transmission (преломление) и толщина. Это и есть
 * основная стоимость: без transmission материал стоит примерно как Standard.
 *
 * Кастомные атрибуты (aPathT, aLengthT, aDepth, aBranchId) подмешиваются в
 * шейдер через onBeforeCompile: так остаётся полноценный физический свет и
 * тени от окружения, но появляются прочерчивание роста (uGrow) и сканирующая
 * волна (uScan). Значения по умолчанию нейтральны — анимирует их этап 3.
 */

export type DendriteMaterial = {
    material: THREE.MeshPhysicalMaterial;
    uniforms: {
        uGrow: { value: number };
        uScan: { value: number };
        uScanWidth: { value: number };
        uScanGain: { value: number };
        uJitterBranch: { value: number };
        uJitter: { value: number };
        uTime: { value: number };
    };
};

export function createDendriteMaterial(profile: TierProfile): DendriteMaterial {
    const physical = profile.branchMaterial === 'physical';

    const material = new THREE.MeshPhysicalMaterial({
        // цвет берётся из вершинного атрибута: градиент от сомы к кончикам
        color: 0xffffff,
        vertexColors: true,
        roughness: 0.25,
        metalness: 0,
        clearcoat: 0.55,
        clearcoatRoughness: 0.3,
        iridescence: 0.12,
        iridescenceIOR: 1.25,
        ior: 1.4,
        transmission: physical ? 0.35 : 0,
        thickness: physical ? 0.55 : 0,
        transparent: true,
        side: THREE.FrontSide,
    });

    const uniforms = {
        /** 0…1 — до какой доли aPathT ветви прочерчены */
        uGrow: { value: 1 },
        /** положение сканирующей волны по aPathT; -1 — волны нет */
        uScan: { value: -1 },
        uScanWidth: { value: 0.14 },
        uScanGain: { value: 0 },
        /** aBranchId «дрожащей» ветки; -1 — дрожания нет */
        uJitterBranch: { value: -1 },
        uJitter: { value: 0 },
        uTime: { value: 0 },
    };

    material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms);

        shader.vertexShader = `
            attribute float aPathT;
            attribute float aLengthT;
            attribute float aDepth;
            attribute float aBranchId;
            uniform float uJitterBranch;
            uniform float uJitter;
            uniform float uTime;
            varying float vPathT;
            varying float vLengthT;
            varying float vDepth;
            varying float vBranchId;
        ` + shader.vertexShader.replace(
            '#include <begin_vertex>',
            `
            #include <begin_vertex>
            vPathT = aPathT;
            vLengthT = aLengthT;
            vDepth = aDepth;
            vBranchId = aBranchId;
            /* Сбой проводимости: одна выбранная ветка мелко дрожит. Адресуем её
               по aBranchId, поэтому дрожать может любая — достаточно сменить
               uniform, пересобирать геометрию не нужно. */
            if (uJitter > 0.0 && abs(aBranchId - uJitterBranch) < 0.004) {
                float wave = sin(uTime * 34.0 + aLengthT * 12.0);
                transformed += normal * wave * uJitter * 0.05 * aLengthT;
            }
            `,
        );

        shader.fragmentShader = `
            uniform float uGrow;
            uniform float uScan;
            uniform float uScanWidth;
            uniform float uScanGain;
            varying float vPathT;
            varying float vLengthT;
            varying float vDepth;
            varying float vBranchId;
        ` + shader.fragmentShader
            .replace(
                '#include <clipping_planes_fragment>',
                `
                #include <clipping_planes_fragment>
                /* Прочерчивание роста: отсекаем во фрагментном шейдере по
                   расстоянию от сомы. Пересобирать геометрию на каждый кадр
                   роста было бы в разы дороже. */
                if (vPathT > uGrow) discard;
                `,
            )
            .replace(
                '#include <dithering_fragment>',
                `
                #include <dithering_fragment>
                /* Сканирующая волна: узкая полоса подсветки, бегущая от сомы к
                   кончикам. Это «приборный» слой поверх материала, поэтому она
                   добавляется после освещения, а не участвует в нём. */
                float band = 1.0 - smoothstep(0.0, uScanWidth, abs(vPathT - uScan));
                gl_FragColor.rgb += vec3(0.28, 0.52, 0.95) * band * uScanGain;
                `,
            );
    };

    /* Без своего ключа three сложит в кэш программу от «обычного» physical и
       вернёт её другим материалам без наших инъекций. */
    material.customProgramCacheKey = () => `dendrite-${physical ? 'transmission' : 'plain'}`;

    return { material, uniforms };
}

export type MembraneMaterial = {
    material: THREE.MeshPhysicalMaterial;
    uniforms: {
        uTime: { value: number };
        uNoiseAmp: { value: number };
        uNoiseScale: { value: number };
        uBreath: { value: number };
    };
};

/**
 * Мембрана сомы: полупрозрачная оболочка с преломлением и noise-displacement.
 *
 * Нормаль после смещения считается конечными разностями по двум касательным —
 * без этого силуэт становится неровным, а освещение остаётся идеально
 * сферическим, и обман виден сразу на блике clearcoat.
 */
export function createMembraneMaterial(profile: TierProfile): MembraneMaterial {
    const refracts = profile.somaTransmission;

    const material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(NEURON.COLOR_SOMA),
        roughness: 0.12,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        ior: 1.45,
        transmission: refracts ? 0.82 : 0,
        thickness: refracts ? 0.85 : 0,
        // Без transmission прозрачность даёт обычная альфа, иначе ядра не видно.
        opacity: refracts ? 1 : 0.62,
        transparent: true,
        emissive: new THREE.Color(SOMA.CORE_EMISSIVE),
        emissiveIntensity: 0,
        side: THREE.FrontSide,
    });

    const uniforms = {
        uTime: { value: 0 },
        uNoiseAmp: { value: SOMA.NOISE_AMP },
        uNoiseScale: { value: SOMA.NOISE_SCALE },
        /** дыхание: относительное изменение радиуса */
        uBreath: { value: 0 },
    };

    material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms);

        shader.vertexShader = `
            uniform float uTime;
            uniform float uNoiseAmp;
            uniform float uNoiseScale;
            uniform float uBreath;
            ${SNOISE3}
            float somaBump(vec3 p) {
              return snoise(p * uNoiseScale + vec3(0.0, 0.0, uTime * ${SOMA.NOISE_DRIFT})) * uNoiseAmp;
            }
        ` + shader.vertexShader
            .replace(
                '#include <beginnormal_vertex>',
                `
                vec3 sNrm = normalize(position);
                float sLen = length(position) * (1.0 + uBreath);
                vec3 sBase = sNrm * sLen;
                vec3 sDisp = sBase + sNrm * somaBump(sBase);
                // две касательные к сфере: направление произвольное, важна лишь
                // их взаимная ортогональность
                vec3 sT1 = normalize(cross(sNrm, vec3(0.0, 1.0, 0.0001)));
                vec3 sT2 = cross(sNrm, sT1);
                vec3 sP1 = normalize(sBase + sT1 * 0.09) * sLen;
                vec3 sP2 = normalize(sBase + sT2 * 0.09) * sLen;
                vec3 sD1 = sP1 + normalize(sP1) * somaBump(sP1);
                vec3 sD2 = sP2 + normalize(sP2) * somaBump(sP2);
                vec3 sNormal = normalize(cross(sD1 - sDisp, sD2 - sDisp));
                if (dot(sNormal, sNrm) < 0.0) sNormal = -sNormal;
                vec3 objectNormal = sNormal;
                #ifdef USE_TANGENT
                  vec3 objectTangent = vec3(tangent.xyz);
                #endif
                `,
            )
            .replace('#include <begin_vertex>', 'vec3 transformed = sDisp;');
    };

    material.customProgramCacheKey = () => `membrane-${refracts ? 'transmission' : 'alpha'}`;

    return { material, uniforms };
}

/**
 * Ядро внутри мембраны. Видно сквозь оболочку, вращается само по себе — именно
 * рассогласование двух вращений и читается как объём.
 */
export function createCoreMaterial() {
    return new THREE.MeshStandardMaterial({
        color: new THREE.Color(SOMA.CORE_COLOR),
        emissive: new THREE.Color(SOMA.CORE_EMISSIVE),
        emissiveIntensity: SOMA.CORE_GLOW,
        roughness: 0.38,
        metalness: 0.05,
        // растворение в финале гасит и ядро — без transparent opacity не работает
        transparent: true,
    });
}
