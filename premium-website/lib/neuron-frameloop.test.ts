import { describe, expect, it } from 'vitest';
import { frameloopFor } from '../app/(site)/components/neuron/frameloop';

/**
 * Режим кадрового цикла — единственное место, где решается, рисует сцена
 * или ждёт. Таблица маленькая, но каждая строка — отдельный провал:
 * «never» на reduced-motion оставил бы пустой слой навсегда, «always» до
 * прогрева вернул бы кадр компиляции на открытую страницу
 * (docs/perf-v4/report.md, провал #1).
 */
describe('frameloopFor', () => {
    it('reduced-motion — один кадр по требованию, прогрев не ждём', () => {
        expect(frameloopFor({ reduced: true, fps: null, live: false })).toBe('demand');
        expect(frameloopFor({ reduced: true, fps: 30, live: true })).toBe('demand');
    });

    it('до прогрева и до снятия занавеса сцена не рисует', () => {
        expect(frameloopFor({ reduced: false, fps: null, live: false })).toBe('never');
        expect(frameloopFor({ reduced: false, fps: 30, live: false })).toBe('never');
    });

    it('после прогрева: без потолка — always, с потолком — demand под FrameDriver', () => {
        expect(frameloopFor({ reduced: false, fps: null, live: true })).toBe('always');
        expect(frameloopFor({ reduced: false, fps: 30, live: true })).toBe('demand');
    });
});
