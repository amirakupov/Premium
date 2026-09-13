'use client';

/**
 * Тиры производительности.
 *
 * Сцена сквозная — она живёт под всей страницей и рисуется, пока страница
 * открыта. Поэтому профиль определяется один раз при монтировании и от него
 * зависит не только DPR, но и сама геометрия: глубина ветвления и число
 * импульсов задают размер буферов, их нельзя менять покадрово.
 *
 * Понижение тира одностороннее (см. `downshift`): скакать туда-обратно хуже,
 * чем работать на ступень ниже — пользователь видит не «оптимизацию», а
 * мерцание качества.
 */

export type Tier = 'low' | 'mid' | 'high';

export type TierProfile = {
    tier: Tier;
    /** верхняя граница device pixel ratio */
    dpr: number;
    /**
     * Потолок кадров в секунду для сцены; `null` — без потолка, Canvas в режиме
     * frameloop 'always' и идёт вровень с монитором.
     *
     * В v2 потолок стоял на всех тирах (60/40/30) как компенсация дорогой
     * страницы: каждый кадр сцены перекомпоновывал размытие под десятками
     * стеклянных карточек. После блока B (стекло дешевле, запись фона не на
     * :root) замер показал 8–15 % главного потока и ~10 % GPU на high при 60 Гц
     * (docs/perf-v3/report.md, C7) — потолок стал вреден: под ним сцена шла
     * ступеньками под плавным текстом. Остаётся только на low, где ступени
     * менее заметны из-за общего упрощения сцены.
     */
    fps: number | null;
    /** глубина рекурсии ветвления: +1 примерно утраивает число веток */
    branchDepth: number;
    /** одновременных импульсов */
    signalCount: number;
    /** соседних нейронов в главе «Сеть» */
    neighbours: number;
    ssao: boolean;
    dof: boolean;
    /**
     * Постпроцессинг вообще. `false` — EffectComposer не монтируется: на low три
     * полноэкранных прохода (блум, виньетка, зерно) заменяет статичный
     * CSS-оверлей (NeuronCanvas.module.css, .grain), а сглаживание даёт нативный
     * MSAA рендерера, которому без постпроцессинга ничего не мешает.
     */
    postprocessing: boolean;
    /**
     * Лак и иризация кроны. Это отдельные ветки шейдера MeshPhysicalMaterial;
     * ноль, а не малое значение, — чтобы three выкинул define и не платить за
     * ветку. Иризация 0.12 на тонких синих трубках почти не читается, поэтому
     * остаётся только на high.
     */
    clearcoat: number;
    iridescence: number;
    /** mipmapBlur даёт мягкий широкий ореол, но это лишний проход */
    bloomMipmap: boolean;
    /**
     * physical — MeshPhysicalMaterial с transmission на ветвях; shader — тот же
     * материал без преломления (по стоимости примерно Standard).
     */
    branchMaterial: 'shader' | 'physical';
    /**
     * Преломление в мембране сомы. Оно включает в three отдельный проход
     * рендера сцены в буфер — на слабом железе этого не может быть, там
     * мембрана работает на обычной альфе.
     */
    somaTransmission: boolean;
    /**
     * Оставлять ли странице стеклянное размытие. Карточки сайта используют
     * backdrop-filter, а под ними теперь едет анимированный canvas — на слабом
     * железе это перекомпозиция всего вьюпорта каждый кадр. На LOW стекло
     * гасится (см. globals.css, html[data-scene-tier="low"]).
     */
    pageGlass: boolean;
};

export const TIERS: Record<Tier, TierProfile> = {
    low: {
        tier: 'low',
        dpr: 1,
        fps: 30,
        branchDepth: 2,
        signalCount: 12,
        neighbours: 0,
        ssao: false,
        dof: false,
        postprocessing: false,
        clearcoat: 0,
        iridescence: 0,
        bloomMipmap: false,
        branchMaterial: 'shader',
        somaTransmission: false,
        pageGlass: false,
    },
    mid: {
        tier: 'mid',
        /* Ниже, чем в таблице ТЗ (1.5): та таблица писалась под канвас размером
           с хиро, а этот — во весь вьюпорт и под ним ещё десятки стеклянных
           карточек. Пиксели здесь дороже, чем казалось. */
        dpr: 1.25,
        fps: null,
        branchDepth: 3,
        signalCount: 28,
        neighbours: 4,
        /* SSAO требует NormalPass — это ещё один полный проход рендера сцены.
           То же с transmission в мембране: three рисует сцену в отдельный буфер.
           На среднем тире два лишних полноэкранных прохода не оправданы, там
           остаются только блум, виньетка и зерно. */
        ssao: false,
        dof: false,
        postprocessing: true,
        clearcoat: 0.55,
        iridescence: 0,
        bloomMipmap: true,
        branchMaterial: 'shader',
        somaTransmission: false,
        pageGlass: true,
    },
    high: {
        tier: 'high',
        /* 2.0 на полноэкранном канвасе с четырьмя проходами — это 4-5 млн
           пикселей на кадр несколько раз. Сцена мягкая и с зерном, разницы
           между 1.5 и 2.0 на ней практически не видно.
           1.25, а не 1.5 — по замеру perf-v3 (docs/perf-v3/report.md, C7):
           без потолка FPS сцена на M3 при 1.5 с SSAO+DoF+Bloom+SMAA держит
           44 к/с (GPU-bound), при 1.25 — 58–60. В v2 потолок 60 через
           demand-цикл на деле давал ~28 рендеров/с, и 1.5 «влезало» именно
           поэтому. */
        dpr: 1.25,
        fps: null,
        branchDepth: 3,
        signalCount: 48,
        neighbours: 12,
        ssao: true,
        dof: true,
        postprocessing: true,
        clearcoat: 0.55,
        iridescence: 0.12,
        bloomMipmap: true,
        branchMaterial: 'physical',
        somaTransmission: true,
        pageGlass: true,
    },
};

/**
 * Адаптивный дауншифт. Меряем медианное время кадра, а не среднее: одна
 * пятидесятимиллисекундная задержка от сборщика мусора не должна опускать тир,
 * а вот устойчивая просадка — должна.
 */
export const PERF = {
    /** окно замера, секунды */
    WINDOW: 2,
    /** сколько не трогаем сцену после монтирования: компиляция шейдеров и
        запекание окружения дают честные, но неинформативные лаги */
    WARMUP: 2.5,
    /** медиана выше этого — тир вниз (22 мс ≈ ниже 45 fps) */
    BUDGET_MS: 22,
    /**
     * Бюджет считается не ниже REFRESH_FACTOR × интервал кадра монитора.
     * Гвард меряет интервал между кадрами, а не время рендера: на 30-герцовом
     * мониторе (у владельца такой — внешний 5K по кабелю, см.
     * docs/perf-v3/baseline.md) интервал всегда 33 мс, и с фиксированным
     * бюджетом гвард принимал медленный дисплей за медленное железо и через
     * 4,5 с опускал high до mid. Оценка интервала монитора — 10-й процентиль
     * окна: самые быстрые кадры и есть частота обновления.
     */
    REFRESH_FACTOR: 1.6,
} as const;

const ORDER: readonly Tier[] = ['low', 'mid', 'high'];

/** Понижение на ступень; ниже `low` не опускаемся. */
export function downshift(tier: Tier): Tier {
    const index = ORDER.indexOf(tier);
    return ORDER[Math.max(0, index - 1)];
}

/**
 * Программный рендерер (SwiftShader, ANGLE Software, «Basic Render Driver») —
 * это WebGL на процессоре. Там не поможет никакой тир, кроме самого низкого.
 */
function isSoftwareRenderer() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
        if (!gl) return true;
        const info = gl.getExtension('WEBGL_debug_renderer_info');
        const renderer = info
            ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))
            : '';
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /swiftshader|software|basic render|llvmpipe/i.test(renderer);
    } catch {
        return true;
    }
}

/** WebGL доступен вообще: без него сцену не монтируем и страница об этом знает (html[data-scene="off"]). */
export function hasWebGL(): boolean {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
        if (!gl) return false;
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return true;
    } catch {
        return false;
    }
}

export function detectTier(): Tier {
    if (typeof window === 'undefined') return 'mid';
    /* Принудительный тир для замеров и отладки: /?tier=low|mid|high.
       Профили сравниваются на одном железе — иначе цифры тиров несопоставимы. */
    const forced = new URLSearchParams(window.location.search).get('tier');
    if (forced === 'low' || forced === 'mid' || forced === 'high') return forced;
    if (isSoftwareRenderer()) return 'low';

    const cores = navigator.hardwareConcurrency ?? 4;
    // Device Memory API есть не везде; отсутствие трактуем как «средне».
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const narrow = window.innerWidth < 820;

    // Мобильный или планшетный профиль: даже флагманы тут не получают HIGH —
    // сквозная сцена плюс стеклянные карточки съедают запас.
    if (coarse || narrow) return cores >= 8 && memory >= 8 ? 'mid' : 'low';

    if (cores <= 4 || memory <= 4) return 'mid';
    return 'high';
}