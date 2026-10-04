export type Frameloop = 'always' | 'demand' | 'never';

/**
 * Режим кадрового цикла Canvas.
 *
 *   reduced  — prefers-reduced-motion: ровно один кадр по требованию, сцена
 *              статична, прогрев не нужен;
 *   never    — сцена смонтирована, но ещё не прогрета или занавес ещё идёт:
 *              кадры не рисуются, компиляция идёт асинхронно (Neuron.tsx);
 *   always   — вровень с монитором (high/mid);
 *   demand   — такт задаёт FrameDriver с потолком (low).
 *
 * `live` = прогрев завершён И занавес снят. Пока это не так, первый
 * настоящий кадр компилировал бы все программы синхронно уже на открытой
 * странице — 83–117 мс (docs/perf-v4/report.md, провал #1).
 */
export function frameloopFor(input: { reduced: boolean; fps: number | null; live: boolean }): Frameloop {
    if (input.reduced) return 'demand';
    if (!input.live) return 'never';
    return input.fps ? 'demand' : 'always';
}
