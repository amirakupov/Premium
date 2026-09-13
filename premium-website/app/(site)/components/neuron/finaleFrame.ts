'use client';

import { FINALE } from './params';

/**
 * ─────────── ГДЕ НА ЭКРАНЕ СТОИТ ДИАГРАММА ───────────
 *
 * Раскладкой финала владеет CSS: коробка `.rig` в `#outro-verdict` лежит в
 * потоке под текстом расплаты, и это единственный источник правды о положении
 * диаграммы. Сцена её ЧИТАЕТ.
 *
 * Читает ровно один раз на resize — не в кадре. Разница принципиальная: чтение
 * `getBoundingClientRect()` в `useFrame` заставляло бы браузер синхронно
 * пересчитывать раскладку посреди кадра, и это было бы то же самое, с чем
 * боролся блок B прошлой итерации (docs/perf-v3/report.md). Раз в resize — это
 * никогда по меркам горячего цикла.
 *
 * Почему не доли вьюпорта числом в params (первая попытка): одна пара чисел не
 * может быть верной сразу на 16:9 и 9:19.5. На широком экране кнопка налезала
 * на рамку графика, на узком между ними оставалась дыра в треть экрана — текст
 * занимает почти одинаковую высоту, а вьюпорт отличается вдвое.
 *
 * Координаты возвращаются В ДОЛЯХ ВЬЮПОРТА. Коробка живёт внутри липкого
 * контейнера высотой ровно в экран (`.verdictSticky`), поэтому её положение
 * ОТНОСИТЕЛЬНО этого контейнера и есть положение на экране в тот момент, когда
 * контейнер приклеен, — то есть всю главу-стоп-кадр. Абсолютные координаты
 * документа для этого не годятся: страница под фиксированной сценой едет.
 */
export type FinaleBox = {
    /** центр коробки в долях ширины и высоты вьюпорта */
    cx: number;
    cy: number;
    /** ширина коробки в долях ширины вьюпорта */
    w: number;
};

/**
 * Запасные доли на случай, когда коробки нет вовсе: сцена смонтирована не на
 * главной, либо режим деградации её скрыл. Диаграмма тогда просто стоит по
 * центру чуть ниже середины кадра.
 */
export const FINALE_FALLBACK: FinaleBox = {
    cx: 0.5,
    cy: FINALE.CENTER_VH,
    w: FINALE.BOX_VW,
};

export function measureFinaleBox(): FinaleBox {
    if (typeof document === 'undefined') return FINALE_FALLBACK;
    const rig = document.querySelector<HTMLElement>('#outro-verdict [data-reveal="rig"]');
    const host = rig?.parentElement;
    if (!rig || !host) return FINALE_FALLBACK;

    const box = rig.getBoundingClientRect();
    const frame = host.getBoundingClientRect();
    // коробку скрыли (reduced-motion, data-scene=off, data-a11y) — диаграммы нет
    if (box.width < 1 || frame.width < 1 || frame.height < 1) return FINALE_FALLBACK;

    return {
        cx: (box.left + box.width / 2 - frame.left) / frame.width,
        cy: (box.top + box.height / 2 - frame.top) / frame.height,
        w: box.width / frame.width,
    };
}
