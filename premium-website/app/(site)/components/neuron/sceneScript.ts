import * as THREE from 'three';
import { FINALE } from './params';
import { darknessOf, lerp, luminanceOf } from './utils';

/**
 * ─────────────────────── РЕЖИССЁРСКИЙ СЦЕНАРИЙ ───────────────────────
 *
 * Декларативная таблица глав. Логика кадра (Neuron.tsx) читает её и ничего не
 * хардкодит — сценарий можно переверстать, не трогая рендер.
 *
 * Главы — это КЛЮЧЕВЫЕ КАДРЫ, привязанные к центрам реальных DOM-секций через
 * `anchor`. Между двумя соседними главами всё интерполируется линейно по
 * непрерывной позиции таймлайна p ∈ [0, N-1]. Долей 0…1 от длины документа
 * здесь нет намеренно: добавили услугу или врача с длинной биографией —
 * хореография остаётся приклеенной к своему тексту, а не разъезжается.
 *
 * Порядок глав обязан совпадать с порядком секций в DOM. Если якоря нет на
 * странице (например, сцена смонтирована не на главной), глава выпадает, а
 * таймлайн сшивается по оставшимся — см. useScrollDirector.
 */

export type Vec3 = readonly [number, number, number];

/**
 * Режим импульсов. Не интерполируется — берётся у ближайшей главы.
 *   idle       — редкие одиночные, ровный ход
 *   faltering  — часть импульсов не доходит до кончика и гаснет на середине
 *   scan       — плюс сканирующая волна снизу вверх по всему дереву
 *   jump       — импульсы перепрыгивают между клетками сети
 *   sync       — фазы стягиваются в общий ритм, частота нарастает
 *   converge   — все импульсы сходятся к соме
 *   quiet      — импульсов нет
 */
export type SignalMode = 'idle' | 'faltering' | 'scan' | 'jump' | 'sync' | 'converge' | 'quiet';

export type Chapter = {
    id: string;
    /** человекочитаемое имя — только для отладки и комментариев */
    title: string;
    /** CSS-селектор DOM-секции, к центру которой прибит этот ключевой кадр */
    anchor: string;
    camera: { position: Vec3; lookAt: Vec3; fov: number };
    /** Цвет фона страницы на этой главе: уходит и в туман, и в CSS-токены. */
    background: string;
    neuron: {
        position: Vec3;
        rotation: Vec3;
        scale: number;
        /** 0…1 — насколько ветви прочерчены от сомы к кончикам */
        grow: number;
        /** 0…1 — растворение в финале */
        dissolve: number;
        /**
         * 0…1 — вспышка. Держится в таблице, а не считается гауссианой от
         * прогресса: ноль у соседей и единица у главы-кульминации дают ровно
         * ту же огибающую, но её видно в данных и можно сдвинуть, не трогая код.
         */
        flash: number;
    };
    signals: {
        /** доля от максимума импульсов тира (0…1) */
        load: number;
        /** множитель базовой скорости из params.SIGNAL */
        speed: number;
        color: string;
        /** цвет ядра импульса: на светлом он темнее оболочки, на тёмном — светлее */
        core: string;
        mode: SignalMode;
    };
    fx: { bloom: number; dof: number; ao: number; grain: number; vignette: number };
    /**
     * Финальная диаграмма. Три величины, а не одна: лента прочерчивается,
     * приборная обвязка проявляется и уходит отдельно от неё, а яркость пера
     * ведётся по главам — в `exit-draw` перо горячее, в `exit-verdict` остывает
     * до мягкого пульса.
     */
    eeg: {
        /** 0…1 — прочерченность ленты */
        draw: number;
        /** 0…1 — приборная обвязка: сетка, рамка, калибровка */
        rig: number;
        /** множитель яркости пера поверх EEG.HEAD_HDR */
        head: number;
    };
    /**
     * 0…1 — насколько кадр «замер»: гасит параллакс мыши и медленный дрейф
     * поворота. Финалу это нужно дважды. Во-первых, `exit-verdict` — стоп-кадр
     * по смыслу: прибор закончил запись, двигаться в кадре нечему. Во-вторых,
     * параллакс двигает КАМЕРУ, а экранный прямоугольник диаграммы посчитан от
     * неподвижного вьюпорта — без этого DOM-метки разъезжались бы с сеткой при
     * каждом движении мыши.
     */
    still: number;
};

/**
 * Палитра импульсов только синяя (DESIGN.md: золота, латуни и тёплых тонов
 * нет). «Тревожность» второй и третьей главы строится не оттенком, а
 * поведением: тусклый глубокий синий, рваный ритм, часть импульсов гаснет на
 * полпути. К финалу — ровный частый ход фирменным #2563eb.
 */
/**
 * Камера финала одна на все три главы — и это не лень, а требование.
 * Экранный прямоугольник диаграммы считается из fov, расстояния и соотношения
 * сторон (params.FINALE), и по тем же долям вьюпорта расставлен DOM-слой меток.
 * Поехала бы камера — поехала бы и диаграмма относительно меток. Движение в
 * финале несут не камера, а сама запись: перо, сетка, обвязка.
 */
const FINALE_CAMERA = {
    position: [0, 0, FINALE.CAMERA_Z] as Vec3,
    lookAt: [0, 0, 0] as Vec3,
    fov: FINALE.FOV,
};

/**
 * ── A/B: чем заканчивается страница ──
 *
 * A — свет возвращается: последняя глава уходит в светлый, дальше тёмный футер.
 * B — тёмное течёт в тёмное: последняя глава берёт ровно цвет футера
 *     (--brand-deep #12294d), и ступени переброса токенов в финале нет вовсе.
 *
 * Разбор и кадры обоих — docs/neuron-v4/report.md. В сборке с обвязкой замеров
 * вариант переключается через ?exit=A|B; в прод попадает только EXIT_DEFAULT, а
 * ветка с разбором URL вырезается вместе с остальными крюками харнеса.
 */
const EXIT_BACKGROUND = { A: '#eaf1ff', B: '#12294d' } as const;
type ExitVariant = keyof typeof EXIT_BACKGROUND;
const EXIT_DEFAULT: ExitVariant = 'B';

const EXIT_VARIANT: ExitVariant = (() => {
    if (process.env.NEXT_PUBLIC_PERF_HARNESS !== '1' || typeof window === 'undefined') {
        return EXIT_DEFAULT;
    }
    const q = new URLSearchParams(window.location.search).get('exit');
    return q === 'A' || q === 'B' ? q : EXIT_DEFAULT;
})();

export const SCENE_SCRIPT: readonly Chapter[] = [
    {
        id: 'awaken',
        title: 'Пробуждение',
        anchor: '#hero',
        camera: { position: [0, 0.2, 9.5], lookAt: [0, 0, 0], fov: 45 },
        background: '#eaf1ff',
        neuron: { position: [1.4, -0.15, 0], rotation: [0.06, 0.2, 0], scale: 1, grow: 1, dissolve: 0, flash: 0 },
        signals: { load: 0.3, speed: 0.55, color: '#1d4ed8', core: '#12294d', mode: 'idle' },
        fx: { bloom: 0.35, dof: 0, ao: 0.7, grain: 0.03, vignette: 0 },
        eeg: { draw: 0, rig: 0, head: 0 },
        still: 0,
    },
    {
        id: 'symptom',
        title: 'Симптом',
        anchor: '#symptom',
        camera: { position: [3.4, 0.7, 7.4], lookAt: [0, 0.2, 0], fov: 45 },
        background: '#dae5f8',
        neuron: { position: [-1.5, 0.1, 0], rotation: [0.12, 1.4, 0.05], scale: 1, grow: 1, dissolve: 0, flash: 0 },
        signals: { load: 0.26, speed: 0.34, color: '#12294d', core: '#0b1a30', mode: 'faltering' },
        fx: { bloom: 0.4, dof: 0.15, ao: 0.85, grain: 0.03, vignette: 0.05 },
        eeg: { draw: 0, rig: 0, head: 0 },
        still: 0,
    },
    {
        id: 'diagnostics',
        title: 'Диагностика',
        anchor: '#diagnostics',
        camera: { position: [1.2, 0.45, 3.1], lookAt: [0, 0.3, 0], fov: 48 },
        background: '#0f2547',
        neuron: { position: [0, 0, 0], rotation: [-0.04, 2.6, -0.06], scale: 1, grow: 1, dissolve: 0, flash: 0 },
        signals: { load: 0.7, speed: 0.6, color: '#4b90e2', core: '#a7cbf7', mode: 'scan' },
        fx: { bloom: 0.95, dof: 1, ao: 1, grain: 0.04, vignette: 0.3 },
        eeg: { draw: 0, rig: 0, head: 0 },
        still: 0,
    },
    {
        id: 'network',
        title: 'Сеть',
        anchor: '#quote',
        camera: { position: [-2.1, 1.3, 12.4], lookAt: [0, 0.2, 0], fov: 45 },
        background: '#0a1a33',
        neuron: { position: [2.2, 0.35, -1.6], rotation: [-0.1, 3.6, 0.08], scale: 0.92, grow: 1, dissolve: 0, flash: 0 },
        signals: { load: 0.8, speed: 0.72, color: '#6aa8f5', core: '#d6e8ff', mode: 'jump' },
        fx: { bloom: 1.1, dof: 0.6, ao: 0.9, grain: 0.04, vignette: 0.28 },
        eeg: { draw: 0, rig: 0, head: 0 },
        still: 0,
    },
    {
        id: 'therapy',
        title: 'Терапия',
        anchor: '#services',
        camera: { position: [-1.3, 0.2, 8.2], lookAt: [0, 0, 0], fov: 45 },
        background: '#0d2244',
        neuron: { position: [0, 0, -2.6], rotation: [0.05, 4.6, 0], scale: 0.86, grow: 1, dissolve: 0, flash: 0 },
        signals: { load: 1, speed: 0.95, color: '#3b82f6', core: '#e6f0fd', mode: 'sync' },
        fx: { bloom: 1.2, dof: 0.4, ao: 0.85, grain: 0.04, vignette: 0.22 },
        eeg: { draw: 0, rig: 0, head: 0 },
        still: 0,
    },
    {
        id: 'climax-build',
        title: 'Кульминация: сбор',
        anchor: '#clinic-photos',
        camera: { position: [-2.3, 0.1, 6.4], lookAt: [0, 0, 0], fov: 45 },
        background: '#0a1628',
        neuron: { position: [-2.2, 0, -1.4], rotation: [0, 5.4, 0.05], scale: 0.9, grow: 1, dissolve: 0, flash: 0 },
        signals: { load: 1, speed: 1.15, color: '#2563eb', core: '#f2f7ff', mode: 'converge' },
        fx: { bloom: 1.4, dof: 0.5, ao: 0.8, grain: 0.04, vignette: 0.3 },
        eeg: { draw: 0, rig: 0, head: 0 },
        still: 0,
    },
    {
        id: 'climax-flash',
        title: 'Кульминация: вспышка',
        anchor: '#doctors',
        camera: { position: [0, 0, 5.6], lookAt: [0, 0, 0], fov: 45 },
        background: '#0a1628',
        neuron: { position: [0, 0, -0.8], rotation: [0, 5.9, 0], scale: 1.05, grow: 1, dissolve: 0.15, flash: 1 },
        signals: { load: 1, speed: 1.35, color: '#2563eb', core: '#ffffff', mode: 'converge' },
        fx: { bloom: 2.2, dof: 0.2, ao: 0.5, grain: 0.04, vignette: 0.18 },
        eeg: { draw: 0, rig: 0, head: 0 },
        still: 0.35,
    },
    /* ─────────────────────────── ФИНАЛ ───────────────────────────
       Одна глава не могла отыграть три события — рождение линии, её завершение
       и выход в футер: между ключевыми кадрами всё интерполируется линейно, и у
       финала не оставалось ни ритма, ни стоп-кадра. Отсюда три главы.

       Фон держится тёмным (#0a1628, тот же, что у вспышки) до конца линии.
       Раньше он светлел РОВНО в те кадры, когда линия прочерчивалась, и это
       ломало сразу три вещи: блум падал с 2.2 до 0.4 и всё равно не работал
       (прибавлять свет к почти белому некуда), перо приходилось делать темнее
       линии вместо того, чтобы оно светилось, а ступень переброса токенов
       (pageTheme, SWAP_LUMINANCE) приходилась на самый заметный момент
       страницы. Тёмный фон снимает все три разом. */
    {
        id: 'exit-draw',
        title: 'Финал: запись',
        anchor: '#outro-draw',
        camera: FINALE_CAMERA,
        background: '#0a1628',
        neuron: { position: [0, 0, 0], rotation: [0, 6.2, 0], scale: 1, grow: 1, dissolve: 1, flash: 0 },
        signals: { load: 0, speed: 0, color: '#2563eb', core: '#f2f7ff', mode: 'quiet' },
        fx: { bloom: 1.8, dof: 0.25, ao: 0.4, grain: 0.04, vignette: 0.3 },
        eeg: { draw: 0.35, rig: 1, head: 1 },
        still: 1,
    },
    {
        id: 'exit-verdict',
        title: 'Финал: заключение',
        anchor: '#outro-verdict',
        camera: FINALE_CAMERA,
        background: '#0a1628',
        neuron: { position: [0, 0, 0], rotation: [0, 6.2, 0], scale: 1, grow: 1, dissolve: 1, flash: 0 },
        signals: { load: 0, speed: 0, color: '#2563eb', core: '#f2f7ff', mode: 'quiet' },
        /* Стоп-кадр: DoF выключен, блум приглушён, в кадре не движется ничего,
           кроме тихого пульса запаркованного пера. */
        fx: { bloom: 1, dof: 0, ao: 0.4, grain: 0.04, vignette: 0.22 },
        eeg: { draw: 1, rig: 1, head: 0.45 },
        still: 1,
    },
    {
        id: 'exit-exit',
        title: 'Финал: выход в футер',
        anchor: '#outro-exit',
        camera: FINALE_CAMERA,
        background: EXIT_BACKGROUND[EXIT_VARIANT],
        neuron: { position: [0, 0, 0], rotation: [0, 6.2, 0], scale: 1, grow: 1, dissolve: 1, flash: 0 },
        signals: { load: 0, speed: 0, color: '#2563eb', core: '#f2f7ff', mode: 'quiet' },
        fx: { bloom: 0.3, dof: 0, ao: 0.5, grain: 0.03, vignette: 0 },
        /* Лента остаётся, обвязка уходит: диаграмма передаёт эстафету статичному
           SVG-орнаменту футера и гаснет. */
        eeg: { draw: 1, rig: 0, head: 0 },
        still: 0.6,
    },
] as const;

/* Цвета парсим один раз при загрузке модуля: THREE.Color(string) на каждом
   кадре — это разбор строки 60 раз в секунду. */
const BACKGROUNDS = SCENE_SCRIPT.map((c) => new THREE.Color(c.background));
const SIGNAL_COLORS = SCENE_SCRIPT.map((c) => new THREE.Color(c.signals.color));
const SIGNAL_CORES = SCENE_SCRIPT.map((c) => new THREE.Color(c.signals.core));

/** Раскладка одного кадра. Мутируется на месте — в useFrame ничего не аллоцируем. */
export type SceneState = {
    /** ближайшая глава: по ней берутся неинтерполируемые величины (режим) */
    chapter: number;
    cameraPos: THREE.Vector3;
    cameraLookAt: THREE.Vector3;
    fov: number;
    background: THREE.Color;
    /** 0…1 — производная от фона: насколько страница должна быть «тёмной» */
    dark: number;
    /** линейная яркость фона: по ней считаются переброс токенов и опасная полоса */
    lum: number;
    neuronPos: THREE.Vector3;
    neuronRot: THREE.Euler;
    neuronScale: number;
    grow: number;
    dissolve: number;
    flash: number;
    signalLoad: number;
    signalSpeed: number;
    signalColor: THREE.Color;
    signalCore: THREE.Color;
    signalMode: SignalMode;
    bloom: number;
    dof: number;
    ao: number;
    grain: number;
    vignette: number;
    /** 0…1 — прочерченность ленты (в кадр уходит монотонный максимум, см. Neuron.tsx) */
    eegDraw: number;
    /** 0…1 — приборная обвязка */
    eegRig: number;
    /** множитель яркости пера */
    eegHead: number;
    /** 0…1 — насколько кадр замер: гасит параллакс и дрейф */
    still: number;
};

export function createSceneState(): SceneState {
    return {
        chapter: 0,
        cameraPos: new THREE.Vector3(),
        cameraLookAt: new THREE.Vector3(),
        fov: 45,
        background: new THREE.Color(),
        dark: 0,
        lum: 1,
        neuronPos: new THREE.Vector3(),
        neuronRot: new THREE.Euler(),
        neuronScale: 1,
        grow: 1,
        dissolve: 0,
        flash: 0,
        signalLoad: 0,
        signalSpeed: 0,
        signalColor: new THREE.Color(),
        signalCore: new THREE.Color(),
        signalMode: 'idle',
        bloom: 0,
        dof: 0,
        ao: 0,
        grain: 0,
        vignette: 0,
        eegDraw: 0,
        eegRig: 0,
        eegHead: 0,
        still: 0,
    };
}

const lerpVec3 = (out: THREE.Vector3, a: Vec3, b: Vec3, t: number) =>
    out.set(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));

/**
 * Интерполирует состояние сцены на непрерывной позиции таймлайна.
 * `p` — не доля страницы, а позиция в главах: 2.4 значит «40 % пути от
 * третьей главы к четвёртой».
 */
export function resolveSceneState(p: number, out: SceneState): SceneState {
    const last = SCENE_SCRIPT.length - 1;
    const clamped = p < 0 ? 0 : p > last ? last : p;
    const i = Math.min(last - 1, Math.floor(clamped));
    const t = clamped - i;
    const a = SCENE_SCRIPT[i];
    const b = SCENE_SCRIPT[i + 1];

    out.chapter = Math.round(clamped);
    lerpVec3(out.cameraPos, a.camera.position, b.camera.position, t);
    lerpVec3(out.cameraLookAt, a.camera.lookAt, b.camera.lookAt, t);
    out.fov = lerp(a.camera.fov, b.camera.fov, t);
    out.background.copy(BACKGROUNDS[i]).lerp(BACKGROUNDS[i + 1], t);
    // «Темнота» не хранится в таблице, а считается из самого цвета — так у
    // перехода остаётся один источник правды.
    out.dark = darknessOf(out.background.r, out.background.g, out.background.b);
    out.lum = luminanceOf(out.background.r, out.background.g, out.background.b);

    lerpVec3(out.neuronPos, a.neuron.position, b.neuron.position, t);
    out.neuronRot.set(
        lerp(a.neuron.rotation[0], b.neuron.rotation[0], t),
        lerp(a.neuron.rotation[1], b.neuron.rotation[1], t),
        lerp(a.neuron.rotation[2], b.neuron.rotation[2], t),
    );
    out.neuronScale = lerp(a.neuron.scale, b.neuron.scale, t);
    out.grow = lerp(a.neuron.grow, b.neuron.grow, t);
    out.dissolve = lerp(a.neuron.dissolve, b.neuron.dissolve, t);
    out.flash = lerp(a.neuron.flash, b.neuron.flash, t);

    out.signalLoad = lerp(a.signals.load, b.signals.load, t);
    out.signalSpeed = lerp(a.signals.speed, b.signals.speed, t);
    out.signalColor.copy(SIGNAL_COLORS[i]).lerp(SIGNAL_COLORS[i + 1], t);
    out.signalCore.copy(SIGNAL_CORES[i]).lerp(SIGNAL_CORES[i + 1], t);
    // режим — величина дискретная: у ближайшей главы, без смешивания
    out.signalMode = (t < 0.5 ? a : b).signals.mode;

    out.bloom = lerp(a.fx.bloom, b.fx.bloom, t);
    out.dof = lerp(a.fx.dof, b.fx.dof, t);
    out.ao = lerp(a.fx.ao, b.fx.ao, t);
    out.grain = lerp(a.fx.grain, b.fx.grain, t);
    out.vignette = lerp(a.fx.vignette, b.fx.vignette, t);
    out.eegDraw = lerp(a.eeg.draw, b.eeg.draw, t);
    out.eegRig = lerp(a.eeg.rig, b.eeg.rig, t);
    out.eegHead = lerp(a.eeg.head, b.eeg.head, t);
    out.still = lerp(a.still, b.still, t);

    return out;
}

/**
 * Индекс главы по идентификатору. Нужен коду, который завязан на конкретную
 * главу (сброс монотонного прочерчивания в финале), чтобы не хардкодить число:
 * добавили главу в середину — ничего не разъехалось.
 */
export function chapterIndex(id: string): number {
    const i = SCENE_SCRIPT.findIndex((c) => c.id === id);
    if (i < 0) throw new Error(`sceneScript: нет главы «${id}»`);
    return i;
}
