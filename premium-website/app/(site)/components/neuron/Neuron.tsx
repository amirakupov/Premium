'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import {
    Bloom,
    DepthOfField,
    EffectComposer,
    Noise,
    SSAO,
    Vignette,
} from '@react-three/postprocessing';
import type {
    BloomEffect,
    DepthOfFieldEffect,
    NoiseEffect,
    SSAOEffect,
    VignetteEffect,
} from 'postprocessing';
import * as THREE from 'three';

import { BLOOM, CAMERA, CHOREO, EEG, FOG, LIGHT, NEURON, SOMA } from './params';
import type { TierProfile } from './perf';
import { createSceneState, resolveSceneState } from './sceneScript';
import { useScrollDirector } from './useScrollDirector';
import { clamp01, damp, easeOut, lerp } from './utils';
import { createPageTheme } from './pageTheme';
import { createSignalSystem } from './signals';
import { createMicroEvents } from './events';
import { growNeuron } from './geometry/growNeuron';
import { buildDendriteGeometry } from './geometry/dendrites';
import { buildSignalPaths } from './geometry/signalPaths';
import { buildEegGeometry } from './geometry/eeg';
import { buildElectrodeGeometry } from './geometry/electrodes';
import {
    buildLinkGeometry,
    buildNeighbourGeometry,
    buildNeighbourLayout,
} from './geometry/neighbours';
import { createSignalMaterial } from './materials/signal';
import { createAuraMaterial } from './materials/aura';
import { createEegMaterial } from './materials/eeg';
import { createElectrodeMaterial } from './materials/electrodes';
import { createLinkMaterial } from './materials/link';
import {
    createCoreMaterial,
    createDendriteMaterial,
    createMembraneMaterial,
} from './materials/tissue';

const BREATH_RATE = (Math.PI * 2) / SOMA.BREATH_PERIOD;

/** Насколько выражен каждый режим главы прямо сейчас. Всё сглажено. */
type Gains = {
    collect: number;
    faltering: number;
    scan: number;
    network: number;
    sync: number;
};

export default function Neuron({
    profile,
    reduced,
}: {
    profile: TierProfile;
    reduced: boolean;
}) {
    const director = useScrollDirector(!reduced);
    const { camera, scene, invalidate } = useThree();

    const groupRef = useRef<THREE.Group>(null);
    const membraneRef = useRef<THREE.Mesh>(null);
    const coreRef = useRef<THREE.Mesh>(null);
    const neighboursRef = useRef<THREE.InstancedMesh>(null);
    const bloomRef = useRef<BloomEffect>(null);
    const ssaoRef = useRef<SSAOEffect>(null);
    const dofRef = useRef<DepthOfFieldEffect>(null);
    const vignetteRef = useRef<VignetteEffect>(null);
    const noiseRef = useRef<NoiseEffect>(null);
    const parallax = useRef(new THREE.Vector2());
    /* Точка фокуса глубины резкости: DoF держит на неё ссылку, поэтому вектор
       создаётся один раз и дальше только мутируется. */
    const focus = useRef(new THREE.Vector3());
    /* Цвет фона строкой пересобирается только когда он реально изменился:
       getHexString() на каждом кадре — это мусор в горячем цикле. */
    const backgroundHex = useRef({ packed: -1, css: '#eaf1ff' });
    const intro = useRef(0);
    const gains = useRef<Gains>({
        collect: 0,
        faltering: 0,
        scan: 0,
        network: 0,
        sync: 0,
    });

    const state = useMemo(() => createSceneState(), []);
    /* Переход фона выключен при reduced-motion: страница остаётся светлой. */
    const theme = useMemo(
        () => createPageTheme(!reduced, profile.pageGlass),
        [reduced, profile.pageGlass],
    );
    useEffect(() => () => theme.dispose(), [theme]);

    /* — Геометрия и материалы: строятся один раз на профиль тира — */
    const built = useMemo(() => {
        const morphology = growNeuron(profile.branchDepth);
        const dendrites = buildDendriteGeometry(morphology);
        const signalPaths = buildSignalPaths(morphology.paths);

        const dendrite = createDendriteMaterial(profile);
        const membrane = createMembraneMaterial(profile);
        const coreMaterial = createCoreMaterial();
        const auraMaterial = createAuraMaterial();

        const signals = createSignalSystem(profile.signalCount, signalPaths, NEURON.SEED + 1);
        const signalMaterial = createSignalMaterial();

        const electrodeGeometry = buildElectrodeGeometry(morphology.paths, NEURON.SEED + 17);
        const electrodeMaterial = createElectrodeMaterial();

        // На низком тире сети нет вообще — ни инстансов, ни связей.
        const hasNetwork = profile.neighbours > 0;
        const neighbourGeometry = hasNetwork ? buildNeighbourGeometry() : null;
        const neighbourLayout = hasNetwork
            ? buildNeighbourLayout(profile.neighbours, NEURON.SEED + 23)
            : null;
        const neighbourMaterial = hasNetwork
            ? new THREE.MeshStandardMaterial({
                  vertexColors: true,
                  roughness: 0.9,
                  metalness: 0,
                  transparent: true,
                  opacity: 0,
              })
            : null;
        const linkGeometry = neighbourLayout ? buildLinkGeometry(neighbourLayout.centers) : null;
        const linkMaterial = hasNetwork ? createLinkMaterial() : null;

        const eegGeometry = buildEegGeometry();
        const eegMaterial = createEegMaterial();

        const events = createMicroEvents(NEURON.SEED + 41);

        return {
            dendrites,
            dendrite,
            membrane,
            /** базовая непрозрачность мембраны зависит от тира — растворение её множит */
            membraneOpacity: membrane.material.opacity,
            coreMaterial,
            auraMaterial,
            signals,
            signalMaterial,
            electrodeGeometry,
            electrodeMaterial,
            neighbourGeometry,
            neighbourLayout,
            neighbourMaterial,
            linkGeometry,
            linkMaterial,
            eegGeometry,
            eegMaterial,
            events,
        };
    }, [profile]);

    /* — Явный dispose: R3F освобождает то, что смонтировано в граф, но эти
         объекты созданы вручную в useMemo, поэтому убираем сами — */
    useEffect(
        () => () => {
            built.dendrites.dispose();
            built.dendrite.material.dispose();
            built.membrane.material.dispose();
            built.coreMaterial.dispose();
            built.auraMaterial.dispose();
            built.signals.dispose();
            built.signalMaterial.dispose();
            built.electrodeGeometry.dispose();
            built.electrodeMaterial.dispose();
            built.neighbourGeometry?.dispose();
            built.neighbourMaterial?.dispose();
            built.linkGeometry?.dispose();
            built.linkMaterial?.dispose();
            built.eegGeometry.dispose();
            built.eegMaterial.dispose();
        },
        [built],
    );

    /* — Раскладка соседей ставится один раз: она не анимируется, меняется
         только их непрозрачность — */
    useLayoutEffect(() => {
        const mesh = neighboursRef.current;
        const layout = built.neighbourLayout;
        if (!mesh || !layout) return;
        layout.matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
        mesh.instanceMatrix.needsUpdate = true;
    }, [built]);

    /** Единая раскладка кадра по состоянию сцены — и для анимации, и для статики. */
    const applyState = (time: number) => {
        const group = groupRef.current;
        if (!group) return;
        const g = gains.current;

        // Камера: положение и точка взгляда приходят из таблицы глав, параллакс
        // мыши добавляется поверх — он живёт независимо от сценария.
        camera.position.set(
            state.cameraPos.x + parallax.current.x * CAMERA.PARALLAX,
            state.cameraPos.y + parallax.current.y * CAMERA.PARALLAX * 0.6,
            state.cameraPos.z,
        );
        camera.lookAt(state.cameraLookAt);
        if (camera instanceof THREE.PerspectiveCamera && camera.fov !== state.fov) {
            camera.fov = state.fov;
            camera.updateProjectionMatrix();
        }

        group.position.copy(state.neuronPos);
        // Медленный дрейф поверх поворота из таблицы: он не должен затирать
        // сценарий, иначе в главах не останется стоп-кадров.
        group.rotation.set(
            state.neuronRot.x + parallax.current.y * CAMERA.TILT,
            state.neuronRot.y + time * 0.02,
            state.neuronRot.z + parallax.current.x * CAMERA.TILT * 0.4,
        );

        const dissolve = state.dissolve;
        const flash = state.flash;
        const alive = 1 - dissolve;
        group.scale.setScalar(
            Math.max(0.001, state.neuronScale * lerp(1, 0.12, easeOut(dissolve)) * (1 + flash * 0.22)),
        );

        /* Прорастание: ветви прочерчиваются от сомы к кончикам. Идёт по времени
           с момента монтирования, а глава может только ограничить результат. */
        const grown = easeOut(clamp01(intro.current / CHOREO.INTRO_DURATION));
        built.dendrite.material.opacity = alive;
        built.dendrite.uniforms.uTime.value = time;
        built.dendrite.uniforms.uGrow.value = Math.min(grown, state.grow);

        /* Сканирующая волна: идёт снизу вверх по всему дереву, между проходами
           пауза. Вне главы «Диагностика» усиление нулевое, и полосы не видно. */
        const cycle = (time % CHOREO.SCAN_CYCLE) / CHOREO.SCAN_CYCLE;
        built.dendrite.uniforms.uScan.value =
            cycle < CHOREO.SCAN_SWEEP ? -0.2 + 1.4 * (cycle / CHOREO.SCAN_SWEEP) : 1.4;
        built.dendrite.uniforms.uScanGain.value = g.scan;

        // Сбой проводимости: одна ветка мелко дрожит.
        built.dendrite.uniforms.uJitter.value = g.faltering;
        built.dendrite.uniforms.uJitterBranch.value = CHOREO.JITTER_AT;

        // Дыхание сомы: медленное, период SOMA.BREATH_PERIOD. В покое именно оно
        // отличает живой объект от модели.
        built.membrane.uniforms.uTime.value = time;
        built.membrane.uniforms.uBreath.value = Math.sin(time * BREATH_RATE) * SOMA.BREATH_AMP;
        built.membrane.material.opacity = built.membraneOpacity * alive;
        // В кульминации сома разгорается изнутри: ядро → мембрана → вспышка.
        built.membrane.material.emissiveIntensity = flash * 2.4;
        built.coreMaterial.emissiveIntensity = SOMA.CORE_GLOW + flash * 5;
        built.coreMaterial.opacity = alive;

        if (membraneRef.current) membraneRef.current.scale.setScalar(1 + flash * 1.6);
        if (coreRef.current) coreRef.current.rotation.y = time * SOMA.CORE_SPIN;

        /* Френель-ореол остался, но теперь он акцент поверх настоящего света, а
           не единственный источник объёма — отсюда вдвое меньшая база. */
        built.auraMaterial.uniforms.uIntensity.value = (0.45 + flash * 5) * alive;

        built.signalMaterial.uniforms.uColor.value.copy(state.signalColor);
        built.signalMaterial.uniforms.uCore.value.copy(state.signalCore);

        /* Электроды видны в «Диагностике» в полную силу и приглушённо — пока
           держится слой данных, иначе вспышка одиночного синапса из
           микрособытий разгоралась бы в пустоте. */
        built.electrodeMaterial.uniforms.uOpacity.value =
            Math.max(g.scan, g.network * 0.5, g.sync * 0.35) * alive;
        built.electrodeMaterial.uniforms.uTime.value = time;
        built.electrodeMaterial.uniforms.uFlash.value = built.events.synapse;
        built.electrodeMaterial.uniforms.uFlashId.value = built.events.synapseId;

        if (built.neighbourMaterial) built.neighbourMaterial.opacity = g.network * 0.85;
        if (built.linkMaterial) {
            built.linkMaterial.uniforms.uOpacity.value = g.network;
            built.linkMaterial.uniforms.uTime.value = time;
        }

        // Линия ЭЭГ прочерчивается в последней главе.
        built.eegMaterial.uniforms.uProgress.value = easeOut(state.eeg) * 1.02;
        built.eegMaterial.uniforms.uOpacity.value = clamp01(state.eeg * 8);

        /* ── Фон: один источник правды ──
           Цвет главы уходит одновременно в туман сцены и в CSS-переменные
           страницы. Туман обязан совпадать с фоном страницы — иначе дальние
           ветки растворяются не в тот цвет, и глубина читается как грязь. */
        const fog = scene.fog;
        if (fog) fog.color.copy(state.background);

        const packed = state.background.getHex();
        if (packed !== backgroundHex.current.packed) {
            backgroundHex.current.packed = packed;
            backgroundHex.current.css = `#${state.background.getHexString()}`;
        }
        theme.apply(backgroundHex.current.css, state.lum, state.dark);

        /* ── Постпроцессинг ──
           Все эффекты, кроме блума, регулируются через blendMode.opacity: это
           стабильная часть API postprocessing, одинаковая у SSAO, виньетки и
           зерна. Возиться с внутренними материалами каждого эффекта не нужно. */
        if (bloomRef.current) bloomRef.current.intensity = state.bloom;
        if (ssaoRef.current) ssaoRef.current.blendMode.opacity.value = state.ao;
        if (vignetteRef.current) vignetteRef.current.blendMode.opacity.value = state.vignette;
        if (noiseRef.current) noiseRef.current.blendMode.opacity.value = state.grain;
        if (dofRef.current) {
            // Фокус держится на самом нейроне: в главе с пролётом внутри кроны
            // он уезжает вместе с камерой, а ветки у объектива уходят в бокэ.
            focus.current.copy(state.neuronPos);
            dofRef.current.target = focus.current;
            dofRef.current.bokehScale = state.dof * 6;
        }
    };

    /* — Статичный кадр для prefers-reduced-motion: раскладываем один раз — */
    useLayoutEffect(() => {
        if (!reduced) return;
        resolveSceneState(0, state);
        // прорастание уже завершено: анимации выключены, показываем результат
        intro.current = CHOREO.INTRO_DURATION;
        built.signals.frame(0, {
            load: state.signalLoad,
            speed: 0,
            velocity: 0,
            faltering: 0,
            sync: 0,
            collect: 0,
            intensity: lerp(0.7, 1.25, state.signalLoad),
        });
        applyState(0);
        invalidate();
        // applyState читает только рефы и константы, пересборка эффекта не нужна
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reduced, built]);

    useFrame((frame, delta) => {
        if (reduced) return;
        // Кадр может быть сколь угодно длинным (переключили таб, залип поток) —
        // без ограничения демпферы получают огромный dt и всё дёргается.
        const dt = Math.min(delta, 1 / 20);
        const time = frame.clock.elapsedTime;
        intro.current += dt;

        // Параллакс мыши: догоняем указатель, а не прыгаем за ним.
        parallax.current.x = damp(parallax.current.x, frame.pointer.x, 3.2, dt);
        parallax.current.y = damp(parallax.current.y, frame.pointer.y, 3.2, dt);

        director.step(dt);
        resolveSceneState(director.p, state);

        /* Режим главы переключается мгновенно, а поведение должно въезжать
           плавно: каждый режим держит свой сглаженный вес. */
        const g = gains.current;
        const mode = state.signalMode;
        const L = CHOREO.GAIN_LAMBDA;
        g.collect = damp(g.collect, mode === 'converge' ? 1 : 0, 2.2, dt);
        g.faltering = damp(g.faltering, mode === 'faltering' ? 1 : 0, L, dt);
        g.scan = damp(g.scan, mode === 'scan' ? 1 : 0, L, dt);
        g.network = damp(g.network, mode === 'jump' ? 1 : 0, 1.2, dt);
        g.sync = damp(g.sync, mode === 'sync' ? 1 : 0, 1, dt);

        built.events.update(dt, (duration) => built.signals.burst(duration));

        const alive = 1 - state.dissolve;
        built.signals.frame(dt, {
            load: state.signalLoad,
            speed: state.signalSpeed,
            velocity: director.velocity,
            faltering: g.faltering,
            sync: g.sync,
            collect: g.collect,
            intensity: lerp(0.7, 1.25, state.signalLoad) * alive + state.flash * 0.5,
        });

        applyState(time);
    });

    return (
        <>
            {/* Воздушная перспектива: дальние ветки растворяются в тон страницы. */}
            <fog attach="fog" args={[FOG.COLOR, FOG.NEAR, FOG.FAR]} />

            {/* Трёхточечная схема. Тени выключены намеренно: контактное
                затенение в развилках даст SSAO (этап 4), а карты теней на
                сотне тонких веток стоят дорого и почти не читаются. */}
            <ambientLight intensity={LIGHT.AMBIENT} />
            <directionalLight
                position={LIGHT.KEY_POS as unknown as [number, number, number]}
                intensity={LIGHT.KEY_INTENSITY}
                color={LIGHT.KEY_COLOR}
            />
            <directionalLight
                position={LIGHT.FILL_POS as unknown as [number, number, number]}
                intensity={LIGHT.FILL_INTENSITY}
                color={LIGHT.FILL_COLOR}
            />
            <directionalLight
                position={LIGHT.RIM_POS as unknown as [number, number, number]}
                intensity={LIGHT.RIM_INTENSITY}
                color={LIGHT.RIM_COLOR}
            />

            {/* Окружение собрано вручную из Lightformer-ов и печётся один раз
                (frames={1}). Именно оно даёт стеклу читаемые блики — без него
                transmission и clearcoat отражают пустоту. HDR-файл из сети не
                тянем: лишний вес и внешняя зависимость. */}
            <Environment resolution={LIGHT.ENV_RESOLUTION} frames={1}>
                <color attach="background" args={[LIGHT.ENV_BACKGROUND]} />
                <Lightformer
                    form="rect"
                    intensity={2.2}
                    color={LIGHT.KEY_COLOR}
                    position={[4, 5, 4]}
                    scale={[7, 7, 1]}
                    target={[0, 0, 0]}
                />
                <Lightformer
                    form="circle"
                    intensity={1.1}
                    color={LIGHT.FILL_COLOR}
                    position={[-5, -2, 3]}
                    scale={[5, 5, 1]}
                    target={[0, 0, 0]}
                />
                <Lightformer
                    form="rect"
                    intensity={2.6}
                    color={LIGHT.RIM_COLOR}
                    position={[-2, 3.5, -6]}
                    scale={[9, 3, 1]}
                    target={[0, 0, 0]}
                />
            </Environment>

            <group ref={groupRef}>
                <mesh geometry={built.dendrites} material={built.dendrite.material} />

                {/* Сома двухслойная: сквозь мембрану видно ядро, у каждого слоя
                    своё вращение. Это самый дешёвый способ прочитать объект как
                    объём, а не как круг. */}
                <mesh ref={membraneRef} material={built.membrane.material}>
                    <icosahedronGeometry args={[NEURON.SOMA_RADIUS, SOMA.MEMBRANE_DETAIL]} />
                </mesh>
                <mesh ref={coreRef} material={built.coreMaterial}>
                    <icosahedronGeometry args={[SOMA.CORE_RADIUS, 3]} />
                </mesh>

                <mesh material={built.auraMaterial}>
                    <icosahedronGeometry args={[NEURON.SOMA_RADIUS * 2.1, 3]} />
                </mesh>

                <points
                    geometry={built.signals.geometry}
                    material={built.signalMaterial}
                    frustumCulled={false}
                />

                {/* Слой данных: метки-электроды на кончиках дендритов. */}
                <points
                    geometry={built.electrodeGeometry}
                    material={built.electrodeMaterial}
                    frustumCulled={false}
                />

                {/* Сеть: соседние клетки одним инстансом и связи к соме. */}
                {built.neighbourGeometry && built.neighbourMaterial && built.neighbourLayout && (
                    <instancedMesh
                        ref={neighboursRef}
                        args={[
                            built.neighbourGeometry,
                            built.neighbourMaterial,
                            built.neighbourLayout.matrices.length,
                        ]}
                    />
                )}
                {built.linkGeometry && built.linkMaterial && (
                    <lineSegments geometry={built.linkGeometry} material={built.linkMaterial} />
                )}
            </group>

            <mesh
                geometry={built.eegGeometry}
                material={built.eegMaterial}
                position={[0, EEG.Y, 0]}
            />

            {/* Порядок важен и он не случаен:
                SSAO   — контактное затенение в развилках; на светлом фоне это
                         главный источник объёма, важнее блума
                DoF    — фокус на нейроне, бокэ на дальних ветках
                Bloom  — работает всерьёз только на тёмном отрезке, поэтому его
                         интенсивность ведёт таблица глав
                Vignette — слабая, фактически только на тёмном
                Noise  — обязателен: спасает градиенты фона от бандинга на
                         8-битных панелях

                Хроматической аберрации и глитча нет намеренно: это против
                интонации медицинского бренда.

                SSAO требует NormalPass — это отдельный проход рендера сцены,
                поэтому на низком тире выключены оба. */}
            <EffectComposer multisampling={0} enableNormalPass={profile.ssao}>
                {profile.ssao ? (
                    <SSAO
                        ref={ssaoRef}
                        intensity={22}
                        radius={0.12}
                        luminanceInfluence={0.6}
                        worldDistanceThreshold={12}
                        worldDistanceFalloff={4}
                        worldProximityThreshold={1.4}
                        worldProximityFalloff={0.4}
                    />
                ) : null}
                {profile.dof ? (
                    <DepthOfField
                        ref={dofRef}
                        worldFocusRange={4.5}
                        bokehScale={0}
                        resolutionScale={0.5}
                    />
                ) : null}
                <Bloom
                    ref={bloomRef}
                    intensity={0.35}
                    luminanceThreshold={BLOOM.THRESHOLD}
                    luminanceSmoothing={BLOOM.SMOOTHING}
                    radius={BLOOM.RADIUS}
                    mipmapBlur={profile.bloomMipmap}
                />
                <Vignette ref={vignetteRef} offset={0.32} darkness={0.7} />
                <Noise ref={noiseRef} premultiply />
            </EffectComposer>
        </>
    );
}
