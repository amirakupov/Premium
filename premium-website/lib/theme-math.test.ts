import { describe, expect, it } from 'vitest';
import {
    BAND_STEP,
    SWAP_HYSTERESIS,
    SWAP_LUMINANCE,
    bandOf,
    swapOf,
} from '../app/(site)/components/neuron/themeMath';

/**
 * Полоса и переброс — единственные записи сцены на :root, и каждая стоит
 * полного пересчёта стилей (docs/perf-v4/report.md, раздел 3). Квантование
 * задаёт, сколько их будет за переход; гистерезис — чтобы на границе
 * яркости токены не дёргались туда-обратно при каждом щелчке колеса.
 */
describe('bandOf', () => {
    it('вне полосы — ноль с обеих сторон', () => {
        expect(bandOf(0.9)).toBe(0);
        expect(bandOf(0.01)).toBe(0);
    });

    it('внутри полосы — единица', () => {
        expect(bandOf(0.3)).toBe(1);
    });

    it('значения лежат на сетке BAND_STEP', () => {
        for (let lum = 0; lum <= 1; lum += 0.004) {
            const b = bandOf(lum);
            expect(Math.abs(b / BAND_STEP - Math.round(b / BAND_STEP))).toBeLessThan(1e-9);
        }
    });

    it('за проход полосы не больше 1/BAND_STEP различных значений на каждом склоне', () => {
        const seen = new Set<number>();
        for (let lum = 0.7; lum >= 0.4; lum -= 0.001) seen.add(bandOf(lum));
        expect(seen.size).toBeLessThanOrEqual(Math.round(1 / BAND_STEP) + 1);
    });
});

describe('swapOf', () => {
    it('без истории переключается ровно на SWAP_LUMINANCE', () => {
        expect(swapOf(SWAP_LUMINANCE + 0.001, -1)).toBe(0);
        expect(swapOf(SWAP_LUMINANCE - 0.001, -1)).toBe(1);
    });

    it('с историей — гистерезис: внутри зазора сторона не меняется', () => {
        expect(swapOf(SWAP_LUMINANCE - SWAP_HYSTERESIS / 2, 0)).toBe(0);
        expect(swapOf(SWAP_LUMINANCE + SWAP_HYSTERESIS / 2, 1)).toBe(1);
    });

    it('за зазором — меняется', () => {
        expect(swapOf(SWAP_LUMINANCE - SWAP_HYSTERESIS * 1.5, 0)).toBe(1);
        expect(swapOf(SWAP_LUMINANCE + SWAP_HYSTERESIS * 1.5, 1)).toBe(0);
    });
});
