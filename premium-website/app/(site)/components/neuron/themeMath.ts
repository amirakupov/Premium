import { smoothstep } from './utils';

/**
 * Арифметика перехода фона, вынесенная из pageTheme ради теста.
 *
 * Граница переброса по ЛИНЕЙНОЙ яркости фона: крупный текст держит 3:1 по
 * обе стороны (тёмная краска ~3.9:1, светлая ~3.3:1).
 */
export const SWAP_LUMINANCE = 0.22;
/**
 * Гистерезис переброса. Без него на границе каждый щелчок колеса в обе
 * стороны перебрасывал бы 17 токенов туда-обратно — два полных пересчёта
 * стилей документа на ровном месте.
 */
export const SWAP_HYSTERESIS = 0.015;
/**
 * Полоса, внутри которой поверхности обязаны стать самодостаточными. Границы —
 * яркости фона, при которых активная краска перестаёт давать 4.5:1: светлая
 * сторона выдыхается ниже L≈0.56, тёмная — выше L≈0.07.
 */
export const BAND_LIGHT_EDGE = [0.62, 0.5] as const;
export const BAND_DARK_EDGE = [0.04, 0.07] as const;
/**
 * Шаг квантования полосы. Было 0,01 — до 25 перебросов 17 токенов на :root за
 * секунду скролла (docs/perf-v4/report.md, раздел 3). Поверхности густеют от
 * прозрачного к 0,96 за несколько сотен пикселей хода, двадцати ступеней на
 * это хватает с запасом: на глаз шаг 0,05 альфы не виден.
 */
export const BAND_STEP = 0.05;

export function bandOf(lum: number): number {
    const raw =
        smoothstep(BAND_LIGHT_EDGE[0], BAND_LIGHT_EDGE[1], lum) *
        smoothstep(BAND_DARK_EDGE[0], BAND_DARK_EDGE[1], lum);
    return Math.round(raw / BAND_STEP) * BAND_STEP;
}

/** Сторона пары «текст + поверхность»: 1 — тёмная. `previous` −1 — истории нет. */
export function swapOf(lum: number, previous: -1 | 0 | 1): 0 | 1 {
    if (previous === 1) return lum < SWAP_LUMINANCE + SWAP_HYSTERESIS ? 1 : 0;
    if (previous === 0) return lum < SWAP_LUMINANCE - SWAP_HYSTERESIS ? 1 : 0;
    return lum < SWAP_LUMINANCE ? 1 : 0;
}
