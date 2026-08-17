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
    /** глубина рекурсии ветвления: +1 примерно утраивает число веток */
    branchDepth: number;
    /** одновременных импульсов */
    signalCount: number;
    /** соседних нейронов в главе «Сеть» */
    neighbours: number;
    ssao: boolean;
    dof: boolean;
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
        branchDepth: 2,
        signalCount: 12,
        neighbours: 0,
        ssao: false,
        dof: false,
        bloomMipmap: false,
        branchMaterial: 'shader',
        somaTransmission: false,
        pageGlass: false,
    },
    mid: {
        tier: 'mid',
        dpr: 1.5,
        branchDepth: 3,
        signalCount: 28,
        neighbours: 4,
        ssao: true,
        dof: false,
        bloomMipmap: true,
        branchMaterial: 'shader',
        somaTransmission: true,
        pageGlass: true,
    },
    high: {
        tier: 'high',
        dpr: 2,
        branchDepth: 3,
        signalCount: 48,
        neighbours: 12,
        ssao: true,
        dof: true,
        bloomMipmap: true,
        branchMaterial: 'physical',
        somaTransmission: true,
        pageGlass: true,
    },
};

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

export function detectTier(): Tier {
    if (typeof window === 'undefined') return 'mid';
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