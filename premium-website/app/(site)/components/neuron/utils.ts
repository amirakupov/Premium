import * as THREE from 'three';

/** Детерминированный ГПСЧ: форма нейрона не «прыгает» между перезагрузками. */
export function mulberry32(seed: number) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const clamp = (v: number, min: number, max: number) =>
    v < min ? min : v > max ? max : v;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Нормирует x внутри [a,b] в 0…1 — основной инструмент раскладки по главам. */
export const range = (x: number, a: number, b: number) => clamp01((x - a) / (b - a));
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
export const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * Кадронезависимый демпфер. Наивное `v += (target - v) * k` зависит от FPS:
 * на 144 Гц догоняет вдвое быстрее, чем на 60. Экспонента убирает эту связь.
 */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
    current + (target - current) * (1 - Math.exp(-lambda * dt));

export const smoothstep = (edge0: number, edge1: number, x: number) => {
    const t = clamp01((x - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
};

/**
 * Насколько «темён» цвет фона: 0 — светло, 1 — тёмная точка нарратива.
 *
 * На входе линейные компоненты (three держит цвета в линейном пространстве).
 * Светлота берётся гамма-скорректированной: по линейной яркости середина
 * перехода получалась бы почти чёрной, и токены текста переключались бы рывком
 * в самом начале. Порог подобран так, что токены слегка опережают фон — текст
 * успевает стать светлым до того, как фон потемнеет по-настоящему.
 *
 * Это единственный источник правды о «темноте»: отдельного поля в таблице глав
 * нет намеренно, темнота — свойство самого цвета.
 */
export function darknessOf(r: number, g: number, b: number) {
    return 1 - smoothstep(0.25, 0.75, Math.pow(clamp01(luminanceOf(r, g, b)), 1 / 2.2));
}

/**
 * Линейная относительная яркость. По ней pageTheme решает, на какой стороне
 * находится пара «текст + поверхность» и насколько мы внутри опасной полосы:
 * это ровно та величина, которой оперирует формула контраста WCAG.
 */
export function luminanceOf(r: number, g: number, b: number) {
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Равномерное распределение направлений по сфере (спираль Фибоначчи). */
export function sphereDir(i: number, n: number) {
    const y = 1 - (i / Math.max(1, n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const phi = i * 2.399963229728653;
    return new THREE.Vector3(Math.cos(phi) * r, y, Math.sin(phi) * r).normalize();
}