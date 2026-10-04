'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import {
    Bloom,
    DepthOfField,
    EffectComposer,
    Noise,
    SMAA,
    SSAO,
    Vignette,
} from '@react-three/postprocessing';
import type {
    BloomEffect,
    DepthOfFieldEffect,
    EffectComposer as EffectComposerImpl,
    NoiseEffect,
    SSAOEffect,
    VignetteEffect,
} from 'postprocessing';
import * as THREE from 'three';

import { BLOOM, CAMERA, CHOREO, EEG, FINALE, FOG, LIGHT, NEURON, SOMA } from './params';
import type { TierProfile } from './perf';
import { chapterIndex, createSceneState, resolveSceneState } from './sceneScript';
import { useScrollDirector } from './useScrollDirector';
import { clamp01, damp, easeInOut, easeOut, lerp, range, smoothstep } from './utils';
import { createPageTheme } from './pageTheme';
import {
    GRID_W,
    finaleFrame,
    measureFinaleBox,
    sameBox,
    type FinaleBox,
} from './finaleFrame';
import { createSignalSystem } from './signals';
import { createMicroEvents } from './events';
import { growNeuron } from './geometry/growNeuron';
import { buildDendriteGeometry } from './geometry/dendrites';
import { buildSignalPaths } from './geometry/signalPaths';
import { buildEeg } from './geometry/eeg';
import { buildElectrodeGeometry } from './geometry/electrodes';
import {
    buildLinkGeometry,
    buildNeighbourGeometry,
    buildNeighbourLayout,
} from './geometry/neighbours';
import { createSignalMaterial } from './materials/signal';
import { createAuraMaterial } from './materials/aura';
import {
    createEegGridMaterial,
    createEegMaterial,
    createEegPenGeometry,
    createEegPenMaterial,
} from './materials/eeg';
import { createElectrodeMaterial } from './materials/electrodes';
import { createLinkMaterial } from './materials/link';
import {
    createCoreMaterial,
    createDendriteMaterial,
    createMembraneMaterial,
    setGrowClip,
    setTransparent,
} from './materials/tissue';

const BREATH_RATE = (Math.PI * 2) / SOMA.BREATH_PERIOD;
const PEN_PULSE_RATE = (Math.PI * 2) / FINALE.PEN_PULSE_PERIOD;
/**
 * Ниже этой главы прочерченность сбрасывается. Монотонность нужна внутри
 * финала — при повторном заходе эффект обязан отыграться заново.
 */
const DRAW_RESET_BEFORE = chapterIndex('climax-build');

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
    smaa = true,
    onWarmed,
}: {
    profile: TierProfile;
    reduced: boolean;
    /** SMAA в композиторе; false — только для A/B-замера */
    smaa?: boolean;
    /** шейдеры скомпилированы и один кадр отрисован — сцену можно показывать */
    onWarmed: () => void;
}) {
    const director = useScrollDirector(!reduced);
    const { camera, scene, invalidate, advance, gl, size, viewport } = useThree();

    const groupRef = useRef<THREE.Group>(null);
    const membraneRef = useRef<THREE.Mesh>(null);
    const coreRef = useRef<THREE.Mesh>(null);
    const neighboursRef = useRef<THREE.InstancedMesh>(null);
    const composerRef = useRef<EffectComposerImpl>(null);
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
    /* Своё время, а не frame.clock: THREE.Clock объявлен устаревшим в three
       0.185, а при frameloop 'demand' полагаться на внутренние часы рендерера
       и не нужно — мы сами знаем, сколько прошло. */
    const elapsed = useRef(0);
    /* Состояния материалов кроны (см. materials/tissue.ts): отсечение роста
       включено, пока идёт прорастание; альфа — только на растворении. Оба
       переключаются по смене состояния, не покадрово: смена — перекомпиляция. */
    const growClipOn = useRef(true);
    const alphaOn = useRef(false);
    const gains = useRef<Gains>({
        collect: 0,
        faltering: 0,
        scan: 0,
        network: 0,
        sync: 0,
    });
    const eegGroupRef = useRef<THREE.Group>(null);
    const penRef = useRef<THREE.Points>(null);
    /* Прочерченность как МАКСИМУМ достигнутого, а не мгновенное значение:
       самописец не всасывает чернила обратно в перо, а в конце страницы люди
       скроллят вверх-вниз постоянно. */
    const drawn = useRef(0);
    /* Опрос кривой из кадра: векторы создаются один раз, как focus и parallax. */
    const penPoint = useRef(new THREE.Vector2());
    const penStart = useRef(new THREE.Vector2());
    /* Медленный дрейф поворота копится сам, а не берётся как time * k: иначе
       при включении стоп-кадра (Chapter.still) поворот прыгал бы. */
    const drift = useRef(0);
    /* Режим для слабовидящих переключается на живой странице (панель A11yPanel), а
       3D-диаграмма в нём не показывается вовсе — см. ниже. */
    const a11y = useRef(false);

    const state = useMemo(() => createSceneState(), []);
    /* Переход фона выключен при reduced-motion: страница остаётся светлой. */
    const theme = useMemo(() => createPageTheme(!reduced), [reduced]);
    useEffect(() => () => theme.dispose(), [theme]);

    /* — Геометрия и материалы: строятся один раз на профиль тира — */
    const built = useMemo(() => {
        performance.mark(`neuron:build:start:${profile.tier}`);
        const morphology = growNeuron(profile.branchDepth);
        const dendrites = buildDendriteGeometry(morphology);
        const signalPaths = buildSignalPaths(morphology.paths);

        const dendrite = createDendriteMaterial(profile);
        const membrane = createMembraneMaterial(profile);
        const coreMaterial = createCoreMaterial(profile);
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

        /* Лента и таблица опроса кривой — из одного вызова: это буквально одни
           и те же точки, разойтись им негде. */
        const eeg = buildEeg();
        const eegMaterial = createEegMaterial();

        /* Сетка — один квад с аналитическим шейдером, не инстансы линий и не
           текстура. Чуть позади ленты по z, чтобы DoF мог мягко размыть её по
           краям кадра. */
        const gridGeometry = new THREE.PlaneGeometry(GRID_W, EEG.HEIGHT + FINALE.GRID_PAD_Y * 2);
        const gridMaterial = createEegGridMaterial();

        const penGeometry = createEegPenGeometry();
        const penMaterial = createEegPenMaterial(profile.penHalo);

        const events = createMicroEvents(NEURON.SEED + 41);
        performance.mark(`neuron:build:end:${profile.tier}`);

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
            eegGeometry: eeg.geometry,
            eegPath: eeg.path,
            eegMaterial,
            gridGeometry,
            gridMaterial,
            penGeometry,
            penMaterial,
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
            built.gridGeometry.dispose();
            built.gridMaterial.dispose();
            built.penGeometry.dispose();
            built.penMaterial.dispose();
        },
        [built],
    );

    /**
     * ── Кадрирование финала ──
     *
     * До этой задачи диаграмма стояла в мировых координатах фиксированного
     * размера, и на телефоне в кадр влезала меньше трети ленты: при fov 45°
     * видимая ВЫСОТА на плоскости диаграммы постоянна (≈ 7.12 единиц), а ширина
     * = высота × aspect, то есть 12.7 на 16:9 и 3.3 на 9:19.5 при ленте
     * шириной 11.
     *
     * Лечится масштабом ГРУППЫ, а не шириной ленты и не положением камеры:
     * камерой владеет таблица глав, а масштаб — свойство объекта, и так проще
     * ничего не сломать в хореографии.
     *
     * Куда именно ставить диаграмму, решает не сцена, а CSS: коробка `.rig`
     * лежит в потоке под текстом расплаты, и сцена читает её прямоугольник
     * (finaleFrame.ts) — в CSS-пикселях, и в пикселях же приводит к канвасу.
     * Пересчёт — на resize, повороте экрана, загрузке шрифтов и изменении
     * размеров самой секции, то есть ровно тогда, когда раскладка
     * действительно поехала.
     *
     * Замер идёт прямо в rAF-колбэке, а не через счётчик в состоянии: адресная
     * строка мобильного браузера выдаёт resize пачками во время скролла, и
     * ре-рендер компонента сцены на каждый из них был бы лишней работой.
     * Состояние меняется только если коробка реально сдвинулась (sameBox —
     * четверть пикселя); иначе React получает тот же объект и не рендерит.
     */
    const [box, setBox] = useState<FinaleBox | null>(null);
    const remeasure = () => {
        const next = measureFinaleBox();
        setBox((prev) => (sameBox(prev, next) ? prev : next));
    };

    useEffect(() => {
        if (reduced) return;
        let raf = 0;
        const schedule = () => {
            if (raf) return;
            raf = requestAnimationFrame(() => {
                raf = 0;
                remeasure();
            });
        };
        window.addEventListener('resize', schedule);
        window.addEventListener('orientationchange', schedule);
        window.addEventListener('load', schedule);
        document.fonts?.ready.then(schedule).catch(() => {});

        /* Секция меняет высоту не только от вьюпорта: подгрузился шрифт —
           переносы в абзаце другие, включили режим для слабовидящих — коробка
           диаграммы вообще исчезла. Наблюдатель ловит и то и другое. */
        const observer = new ResizeObserver(schedule);
        const target = document.getElementById('outro-verdict');
        if (target) observer.observe(target);

        return () => {
            if (raf) cancelAnimationFrame(raf);
            window.removeEventListener('resize', schedule);
            window.removeEventListener('orientationchange', schedule);
            window.removeEventListener('load', schedule);
            observer.disconnect();
        };
        // remeasure читает только DOM и пишет состояние, зависимостей у неё нет
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reduced]);

    /* Канвас сменил размер (R3F меряет его своим ResizeObserver) — раскладка
       страницы к этому моменту уже другая, перемеряем и коробку. Обычно это
       тот же resize, что выше, и замер тогда возвращает тот же объект. */
    useLayoutEffect(() => {
        remeasure();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [size.width, size.height]);

    const frame = useMemo(
        () => finaleFrame(box, size.width, size.height, viewport.dpr),
        [box, size.width, size.height, viewport.dpr],
    );

    /* Размеры, зависящие только от кадрирования, пишутся при его пересчёте, а
       не в useFrame: это буквально раз в resize. */
    useLayoutEffect(() => {
        built.eegMaterial.uniforms.uThickness.value = frame.thickness;
        built.gridMaterial.uniforms.uStep.value = frame.gridStep;
        invalidate();
    }, [built, frame, invalidate]);

    /**
     * Режим для слабовидящих: страница в нём не темнеет вообще (pageTheme
     * сбрасывает переменные), то есть финал играл бы на белом — а на белом не
     * работает ни HDR-свечение пера, ни низкоконтрастная сетка, ни блум.
     * Решение: 3D-диаграммы в этом режиме нет вовсе, вместо неё показывается
     * статичный SVG-орнамент в #outro-verdict (NarrativeActs.module.css).
     * Блёклая диаграмма была бы хуже честной линии.
     */
    useEffect(() => {
        const root = document.documentElement;
        const read = () => {
            const next = root.dataset.a11y === '1';
            if (next === a11y.current) return;
            a11y.current = next;
            invalidate();
        };
        read();
        const observer = new MutationObserver(read);
        observer.observe(root, { attributes: true, attributeFilter: ['data-a11y'] });
        return () => observer.disconnect();
    }, [invalidate]);

    /* Новый профиль — новые материалы в исходном состоянии. */
    useLayoutEffect(() => {
        growClipOn.current = true;
        alphaOn.current = profile.somaTransmission;
    }, [built, profile.somaTransmission]);

    /**
     * Прогрев. `compileAsync` собирает программы всех материалов сцены через
     * KHR_parallel_shader_compile и резолвится, когда драйвер их дособрал,
     * не блокируя главный поток. Проходы композитора в сцене не числятся, а
     * стоят дороже самой сцены (замер perf-v4: ручной кадр 7 мс на low без
     * композитора, 33 на mid, 100 на high) — поэтому их полноэкранные
     * материалы компилируются вторым заходом на временной сцене из квадов.
     * Остаток (внутренние проходы эффектов, запекание окружения
     * Environment frames={1}) добирает один ручной кадр `advance()`: он идёт
     * за скрытым слоем или под занавесом. Потом NeuronCanvas переводит цикл в
     * always/demand и показывает слой.
     *
     * Страховка по времени: без расширения, при потере контекста или если
     * обещание не резолвится, сцена всё равно обязана появиться — иначе
     * повторный заход (без занавеса) остался бы с пустым слоем.
     * Повторный прогрев при смене профиля (дауншифт) безвреден: onWarmed
     * идемпотентен.
     */
    useEffect(() => {
        if (reduced) return;
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            try {
                advance(performance.now());
            } catch {
                /* ручной кадр — оптимизация, не условие показа */
            }
            performance.mark('neuron:warm:end');
            onWarmed();
        };
        performance.mark('neuron:warm:start');
        const fallback = window.setTimeout(finish, 1500);
        const warmComposer = async () => {
            const composer = composerRef.current;
            if (!composer) return;
            const quad = new THREE.PlaneGeometry(2, 2);
            const stage = new THREE.Scene();
            for (const pass of composer.passes) {
                const material = (pass as { fullscreenMaterial?: THREE.Material | null }).fullscreenMaterial;
                if (material) stage.add(new THREE.Mesh(quad, material));
            }
            try {
                await gl.compileAsync(stage, camera);
            } finally {
                quad.dispose();
            }
        };
        gl.compileAsync(scene, camera)
            .catch(() => undefined)
            .then(() => warmComposer())
            .catch(() => undefined)
            .then(() => {
                window.clearTimeout(fallback);
                finish();
            });
        return () => {
            done = true;
            window.clearTimeout(fallback);
        };
    }, [built, reduced, gl, scene, camera, advance, onWarmed]);

    /* Возврат из фоновой вкладки: за время паузы страницу могли прокрутить, а
       сглаженная позиция директора осталась старой — первый кадр догонял бы
       цель через половину нарратива. snap() приравнивает её к мгновенной. */
    useEffect(() => {
        const onVisibility = () => {
            if (!document.hidden) director.snap();
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, [director]);

    /* Отладочный крюк для измерительной обвязки (docs/perf-v3): в прод-сборке
       без NEXT_PUBLIC_PERF_HARNESS ветка вырезается целиком. */
    useEffect(() => {
        if (process.env.NEXT_PUBLIC_PERF_HARNESS !== '1') return;
        (window as unknown as { __neuron?: unknown }).__neuron = {
            built,
            gl,
            camera,
            director,
            pointer: () => ({ x: parallax.current.x, y: parallax.current.y }),
            memory: () => ({ ...gl.info.memory, programs: gl.info.programs?.length ?? 0 }),
            /* Состояние финала: по нему проверяются монотонность прочерчивания и
               совпадение 3D-диаграммы с DOM-коробкой меток. */
            finale: () => ({
                p: director.p,
                progress: built.eegMaterial.uniforms.uProgress.value,
                opacity: built.eegMaterial.uniforms.uOpacity.value,
                rig: built.gridMaterial.uniforms.uOpacity.value,
                pen: built.penMaterial.uniforms.uOpacity.value,
                headHDR: built.eegMaterial.uniforms.uHeadHDR.value,
                group: eegGroupRef.current
                    ? {
                          x: eegGroupRef.current.position.x,
                          y: eegGroupRef.current.position.y,
                          z: eegGroupRef.current.position.z,
                          scale: eegGroupRef.current.scale.x,
                      }
                    : null,
            }),
        };
    }, [built, gl, camera, director]);

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

        /* Насколько кадр «замер». В финале это не только интонация: параллакс
           двигает КАМЕРУ, а экранный прямоугольник диаграммы посчитан от
           неподвижного вьюпорта — уехала бы камера, и DOM-метки разъехались бы
           с сеткой. */
        const moving = 1 - state.still;

        // Камера: положение и точка взгляда приходят из таблицы глав, параллакс
        // мыши добавляется поверх — он живёт независимо от сценария.
        camera.position.set(
            state.cameraPos.x + parallax.current.x * CAMERA.PARALLAX * moving,
            state.cameraPos.y + parallax.current.y * CAMERA.PARALLAX * 0.6 * moving,
            state.cameraPos.z,
        );
        camera.lookAt(state.cameraLookAt);
        if (camera instanceof THREE.PerspectiveCamera && camera.fov !== state.fov) {
            camera.fov = state.fov;
            camera.updateProjectionMatrix();
        }

        // Медленный дрейф поверх поворота из таблицы: он не должен затирать
        // сценарий, иначе в главах не останется стоп-кадров.
        group.rotation.set(
            state.neuronRot.x + parallax.current.y * CAMERA.TILT * moving,
            state.neuronRot.y + drift.current,
            state.neuronRot.z + parallax.current.x * CAMERA.TILT * 0.4 * moving,
        );

        const dissolve = state.dissolve;
        const flash = state.flash;
        const alive = 1 - dissolve;

        /* ── Передача эстафеты: вспышка становится пером ──
           Раньше нейрон растворялся на месте, а линия отдельно проявлялась
           внизу кадра — зритель видел, что одно исчезло и появилось другое, а
           весь смысл финала в том, что одно СТАЛО другим.

           `collapse` — доля пути от вспышки (#doctors) до начала записи
           (#outro-draw); `handoff` — единый скаляр передачи: одна яркость
           затухает ровно тем же числом, которым нарастает другая. Двумя
           независимыми кривыми свет в кадре либо провалился бы между ними,
           либо подскочил. Окна — в params.FINALE, там же почему. */
        const collapse = clamp01(range(dissolve, 0.15, 1));
        /* Порог не на глаз: масштаб группы идёт как lerp(1, 0.015, easeOut(dissolve)),
           и ниже 0.12 — то есть до состояния «точка» — он уходит на collapse ≈ 0.45.
           К началу передачи (HANDOFF_START) нейрон уже точка и уже на месте
           (FLIGHT_END), к её концу перо зажглось, а движение пера начинается ещё
           чуть позже (DRAW_START): ни в одном кадре нет двух светящихся точек. */
        const handoff = smoothstep(FINALE.HANDOFF_START, FINALE.HANDOFF_END, collapse);

        /* Плоскость диаграммы держится на FINALE.CAMERA_Z ПЕРЕД КАМЕРОЙ, а не на
           z = 0 мира. Камера едет от вспышки (z 5.6) к финальной оптике (8.6) весь
           отрезок, а экранный прямоугольник диаграммы посчитан для расстояния
           8.6: пока камера в пути, диаграмма на z = 0 была бы крупнее и ниже
           расчётного, и нейрон летел бы в точку, где перо потом НЕ зажжётся
           (docs/neuron-v5/baseline.md, 1.4). Фиксированное расстояние до камеры
           снимает это без чтения раскладки и без пересчёта кадра: в трёх главах
           финала камера стоит на 8.6, и это ровно z = 0, как раньше. Кадр
           верен, пока камера смотрит вдоль оси с fov 45 — оба условия для глав
           от вспышки и дальше проверяет lib/finale-frame.test.ts. */
        const planeZ = state.cameraPos.z - FINALE.CAMERA_Z;

        /* Левый конец ленты в мировых координатах: туда стягивается нейрон.
           Там же стоит калибровочный импульс, с которого начинается запись.
           Полёт заканчивается к FLIGHT_END — до того, как начнётся передача. */
        built.eegPath.sample(0, penStart.current);
        const toPen = easeInOut(range(collapse, 0, FINALE.FLIGHT_END));
        group.position.set(
            lerp(state.neuronPos.x, penStart.current.x * frame.scale + frame.x, toPen),
            lerp(state.neuronPos.y, penStart.current.y * frame.scale + frame.y, toPen),
            lerp(state.neuronPos.z, planeZ, toPen),
        );

        /* 0.015, а не 0.12: нейрон обязан схлопнуться именно в ТОЧКУ — иначе в
           момент зажигания пера рядом с ним висит различимый комок. */
        group.scale.setScalar(
            Math.max(0.001, state.neuronScale * lerp(1, 0.015, easeOut(dissolve)) * (1 + flash * 0.22)),
        );

        /* Уголёк: пока сома схлопывается, её ядро не гаснет, а РАЗГОРАЕТСЯ —
           это и есть будущее перо. Гаснет он только тогда, когда перо уже
           зажглось (1 - handoff). */
        const ember = collapse * collapse * (1 - handoff);

        /* Прорастание: ветви прочерчиваются от сомы к кончикам. Идёт по времени
           с момента монтирования, а глава может только ограничить результат. */
        const grown = easeOut(clamp01(elapsed.current / CHOREO.INTRO_DURATION));
        const growTarget = Math.min(grown, state.grow);
        built.dendrite.material.opacity = alive;
        built.dendrite.uniforms.uTime.value = time;
        built.dendrite.uniforms.uGrow.value = growTarget;

        /* Рост завершён — discard больше ничего не отсекает, а early-Z из-за
           него выключен для всей кроны. Снимаем define один раз. */
        const clipNeeded = growTarget < 1;
        if (clipNeeded !== growClipOn.current) {
            growClipOn.current = clipNeeded;
            setGrowClip(built.dendrite.material, clipNeeded);
        }
        /* Прозрачный проход — только когда крона и ядро реально растворяются
           (глава «Выход»); остальное время они непрозрачны и не сортируются.
           С преломлением мембраны прозрачность держится всегда — иначе крона
           рендерилась бы второй раз в буфер преломления (см. tissue.ts). */
        const alphaNeeded = dissolve > 0.001 || profile.somaTransmission;
        if (alphaNeeded !== alphaOn.current) {
            alphaOn.current = alphaNeeded;
            setTransparent(built.dendrite.material, alphaNeeded);
            setTransparent(built.coreMaterial, alphaNeeded);
        }

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
        built.coreMaterial.emissiveIntensity = SOMA.CORE_GLOW + flash * 5 + ember * 6;
        // ядро держится непрозрачным, пока перо не зажглось: гаснуть ему рано
        built.coreMaterial.opacity = Math.max(alive, 1 - handoff);

        if (membraneRef.current) membraneRef.current.scale.setScalar(1 + flash * 1.6);
        if (coreRef.current) coreRef.current.rotation.y = time * SOMA.CORE_SPIN;

        /* Френель-ореол остался, но теперь он акцент поверх настоящего света, а
           не единственный источник объёма — отсюда вдвое меньшая база. */
        built.auraMaterial.uniforms.uIntensity.value = (0.45 + flash * 5) * alive + ember * 2.5;

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

        /* ── Финальная диаграмма ──
           Кадрирование посчитано вне кадра (useMemo по размеру канваса), здесь
           только раскладка. */
        const eegGroup = eegGroupRef.current;
        if (eegGroup) {
            eegGroup.position.set(frame.x, frame.y, planeZ);
            eegGroup.scale.setScalar(frame.scale);
        }

        /* Монотонность прочерчивания. Раньше uProgress считался прямо из
           позиции скролла, и прокрутка вверх СТИРАЛА уже записанное — чего
           самописец не делает: чернила не всасываются обратно в перо. Держим
           максимум достигнутого и сбрасываем только при заметном уходе вверх из
           финала, чтобы при повторном спуске эффект отыгрался заново. */
        const drawTarget = range(state.eegDraw, FINALE.DRAW_START, FINALE.DRAW_END);
        if (director.p < DRAW_RESET_BEFORE) drawn.current = drawTarget;
        else if (drawTarget > drawn.current) drawn.current = drawTarget;
        // 1.02 — запас, чтобы последний пиксель ленты дописался гарантированно
        const progress = drawn.current * 1.02;

        // В режиме для слабовидящих 3D-диаграммы нет вовсе — вместо неё DOM-линия
        const visible = a11y.current ? 0 : 1;
        const rig = state.eegRig * visible;

        /* Непрозрачность ленты ведётся тем же `handoff`, что и перо: чернила —
           это след пера, и видны они ровно тогда, когда перо в руках прибора.
           В v4 она зависела только от прочерченности, и на пути ВВЕРХ полностью
           записанная лента висела поверх вернувшегося нейрона от #doctors до
           #clinic-photos, а на p = 5 гасла скачком за один кадр вместе со сбросом
           drawn (baseline.md, 1.2). Теперь на пути вверх лента гаснет там же, где
           разгорается уголёк сомы — передача идёт в обратную сторону, — а сброс
           drawn ниже climax-build случается при уже нулевой непрозрачности.
           Монотонность прочерченности внутри прохода при этом не тронута.

           `eegInk` — выход: дописанная лента гаснет вместе с обвязкой, пока
           липкая коробка ещё приклеена (глава exit-exit). */
        built.eegMaterial.uniforms.uProgress.value = progress;
        built.eegMaterial.uniforms.uOpacity.value =
            handoff * clamp01(drawn.current * 12) * clamp01(state.eegInk) * visible;
        built.eegMaterial.uniforms.uHeadHDR.value = EEG.HEAD_HDR * state.eegHead;

        /* Перо — отдельный объект, а не градиент на хвосте ленты: у записи
           должен быть физический наконечник. Позиция берётся опросом той же
           кривой, без аллокаций. */
        built.eegPath.sample(progress, penPoint.current);
        const pen = penRef.current;
        if (pen) pen.position.set(penPoint.current.x, penPoint.current.y, 0.02);

        /* Сетке — положение пера в долях ШИРИНЫ квада, из той же точки кривой.
           `progress` — доля длины дуги, и дуга набирается неравномерно; отдавать
           её сетке значило бы светить бумагу мимо пера (materials/eeg.ts). */
        built.gridMaterial.uniforms.uPenX.value = clamp01((penPoint.current.x + GRID_W / 2) / GRID_W);
        built.gridMaterial.uniforms.uOpacity.value = rig * profile.gridInk;
        // не мигание, а дыхание прибора: прибор работает, а не «анимация кончилась»
        const pulse = 1 + FINALE.PEN_PULSE_AMP * Math.sin(time * PEN_PULSE_RATE);
        built.penMaterial.uniforms.uSize.value = frame.penPx * pulse;
        built.penMaterial.uniforms.uHDR.value = EEG.HEAD_HDR * state.eegHead;
        built.penMaterial.uniforms.uOpacity.value =
            handoff * clamp01(state.eegHead * 3) * visible;

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
        elapsed.current = CHOREO.INTRO_DURATION;
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
        if (elapsed.current === 0) performance.mark('neuron:first-frame');
        // Кадр может быть сколь угодно длинным (переключили таб, залип поток) —
        // без ограничения демпферы получают огромный dt и всё дёргается.
        const dt = Math.min(delta, 1 / 20);
        elapsed.current += dt;
        const time = elapsed.current;

        // Параллакс мыши: догоняем указатель, а не прыгаем за ним.
        parallax.current.x = damp(parallax.current.x, frame.pointer.x, 3.2, dt);
        parallax.current.y = damp(parallax.current.y, frame.pointer.y, 3.2, dt);

        director.step(dt);
        resolveSceneState(director.p, state);

        /* Дрейф поворота копится, а не берётся как time × k: иначе при входе в
           стоп-кадр финала (Chapter.still) поворот прыгнул бы на накопленное. */
        drift.current += dt * 0.02 * (1 - state.still);

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

            {/* Диаграмма одной группой: лента, сетка и перо масштабируются и
                ставятся вместе — иначе кадрирование под соотношение сторон
                развалило бы их взаимное положение. */}
            <group ref={eegGroupRef}>
                {/* Сетка чуть позади ленты по z: так DoF мягко размывает её по
                    краям кадра, и «бумага» уходит за «чернила», а не спорит с
                    ними за одну плоскость. */}
                <mesh
                    geometry={built.gridGeometry}
                    material={built.gridMaterial}
                    position={[0, 0, -0.06]}
                />
                <mesh geometry={built.eegGeometry} material={built.eegMaterial} />
                <points
                    ref={penRef}
                    geometry={built.penGeometry}
                    material={built.penMaterial}
                    frustumCulled={false}
                />
            </group>

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
                поэтому на низком тире выключены оба.

                На low композитора нет вовсе (profile.postprocessing): зерно и
                виньетку даёт CSS-оверлей в NeuronCanvas, блум там не нужен —
                фон почти не темнеет по времени пребывания. SMAA — первым:
                сглаживание тонких веток до блума; MSAA с постпроцессингом не
                работает, поэтому multisampling={0}. */}
            {profile.postprocessing ? (
            <EffectComposer ref={composerRef} multisampling={0} enableNormalPass={profile.ssao}>
                {smaa ? <SMAA /> : null}
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
            ) : null}
        </>
    );
}
