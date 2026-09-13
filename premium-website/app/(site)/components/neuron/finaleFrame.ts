'use client';

import { EEG, FINALE } from './params';
import { lerp } from './utils';

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
 * боролся блок B perf-v3 (docs/perf-v3/report.md). Раз в resize — это никогда
 * по меркам горячего цикла.
 *
 * ── Одна система отсчёта: CSS-пиксели вьюпорта ──
 *
 * В v4 коробка возвращалась ДОЛЯМИ прямоугольника липкого контейнера
 * (`.verdictSticky`, `height: 100svh`), а сцена применяла эти доли к размеру
 * канваса (`position: fixed; inset: 0` — динамический вьюпорт). Пока
 * `svh == innerHeight`, это одно и то же, и на десктопе расхождения не было.
 * Как только адресная строка мобильного браузера отнимает свои проценты,
 * `100svh` меньше канваса, и диаграмма уезжала на `cy × (h_канваса − h_коробки)`
 * — десятки пикселей (docs/neuron-v5/baseline.md, 1.1).
 *
 * Теперь коробка измеряется в пикселях и в пикселях же приводится к канвасу:
 *   • по горизонтали — прямо в координатах вьюпорта (по x ничто не едет);
 *   • по вертикали — как смещение от ВЕРХА липкого контейнера. Контейнер
 *     приклеен `top: 0` всю главу-стоп-кадр (NarrativeActs.module.css,
 *     `.verdictSticky`; проверяется тестом), то есть его верх и есть верх
 *     вьюпорта, а высота контейнера в расчёт больше не входит вообще.
 * Абсолютные координаты документа не годятся: страница под фиксированной
 * сценой едет, а липкий контейнер — нет.
 *
 * `finaleFrame()` переводит пиксели в мировые единицы по размеру КАНВАСА —
 * той же поверхности, на которой рисуется диаграмма. Обе функции чистые:
 * инвариант «коробка и кадр в одной единице» проверяется в
 * lib/finale-frame.test.ts без DOM.
 */
export type FinaleBox = {
    /** центр коробки в CSS-пикселях вьюпорта (y — от верха приклеенного контейнера) */
    cx: number;
    cy: number;
    /** ширина коробки в CSS-пикселях */
    w: number;
};

export type RectLike = { left: number; top: number; width: number; height: number };

/** Видимая высота на плоскости диаграммы: от соотношения сторон не зависит. */
export const FINALE_VISIBLE_H = 2 * FINALE.CAMERA_Z * Math.tan((FINALE.FOV * Math.PI) / 360);
/** Ширина квада сетки в локальных единицах группы диаграммы. */
export const GRID_W = EEG.WIDTH + FINALE.GRID_PAD_X * 2;

/**
 * Коробка из двух прямоугольников: самой `.rig` и её липкого родителя. Родитель
 * нужен только ради вертикали — чтобы не зависеть от того, приклеен он в
 * момент замера или ещё едет.
 */
export function boxFromRects(rig: RectLike, host: RectLike): FinaleBox {
    return {
        cx: rig.left + rig.width / 2,
        cy: rig.top - host.top + rig.height / 2,
        w: rig.width,
    };
}

/**
 * Запасная коробка на случай, когда `.rig` нет вовсе: сцена смонтирована не на
 * главной, либо режим деградации её скрыл. Диаграмма тогда стоит по центру чуть
 * ниже середины кадра — доли применяются к канвасу, то есть к той же единице.
 */
export function fallbackBox(canvasW: number, canvasH: number): FinaleBox {
    return {
        cx: canvasW * 0.5,
        cy: canvasH * FINALE.CENTER_VH,
        w: Math.min(canvasW * FINALE.BOX_VW, FINALE.BOX_MAX_PX),
    };
}

export function measureFinaleBox(): FinaleBox | null {
    if (typeof document === 'undefined') return null;
    const rig = document.querySelector<HTMLElement>('#outro-verdict [data-reveal="rig"]');
    const host = rig?.parentElement;
    if (!rig || !host) return null;

    const box = rig.getBoundingClientRect();
    const frame = host.getBoundingClientRect();
    // коробку скрыли (reduced-motion, data-scene=off, data-a11y) — диаграммы нет
    if (box.width < 1 || frame.width < 1 || frame.height < 1) return null;

    return boxFromRects(box, frame);
}

/** Два замера считаются одинаковыми, если разошлись меньше чем на четверть пикселя. */
export function sameBox(a: FinaleBox | null, b: FinaleBox | null): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    return Math.abs(a.cx - b.cx) < 0.25 && Math.abs(a.cy - b.cy) < 0.25 && Math.abs(a.w - b.w) < 0.25;
}

export type FinaleFrame = {
    /** масштаб группы диаграммы */
    scale: number;
    /** положение группы в мировых координатах на плоскости диаграммы */
    x: number;
    y: number;
    /** толщина ленты и шаг клетки в локальных единицах группы (с компенсацией) */
    thickness: number;
    gridStep: number;
    /** размер спрайта пера в пикселях кадрового буфера */
    penPx: number;
};

/**
 * Кадр диаграммы из коробки и размера канваса. Камера финала стоит на
 * `FINALE.CAMERA_Z` от плоскости диаграммы с `FINALE.FOV`, поэтому один
 * CSS-пиксель канваса — это `FINALE_VISIBLE_H / canvasH` мировых единиц, и
 * этим коэффициентом переводится всё: и положение, и ширина.
 */
export function finaleFrame(
    box: FinaleBox | null,
    canvasW: number,
    canvasH: number,
    dpr: number,
): FinaleFrame {
    const w = Math.max(1, canvasW);
    const h = Math.max(1, canvasH);
    const b = box ?? fallbackBox(w, h);
    const worldPerPx = FINALE_VISIBLE_H / h;
    const scale = (b.w * worldPerPx) / GRID_W;

    /* Экранная толщина ленты и шаг клетки тянутся обратно к своим целям:
       честный масштаб на телефоне оставил бы ~1.8 px линии и ~8 px клетки,
       то есть серый мазок вместо записи. Компенсация частичная — при полной
       лента на узком экране выглядела бы верёвкой. */
    const compensate = (world: number, targetPx: number) => {
        const naturalPx = (world * scale) / worldPerPx;
        const px = lerp(naturalPx, targetPx, FINALE.COMPENSATION);
        return { world: (px * worldPerPx) / scale, px };
    };
    const thickness = compensate(EEG.THICKNESS, FINALE.THICKNESS_PX);
    const gridStep = compensate(FINALE.GRID_STEP, FINALE.GRID_STEP_PX);

    return {
        scale,
        x: (b.cx - w / 2) * worldPerPx,
        y: (h / 2 - b.cy) * worldPerPx,
        thickness: thickness.world,
        gridStep: gridStep.world,
        /* gl_PointSize задаётся в пикселях КАДРОВОГО БУФЕРА, а thickness.px
           посчитан в CSS-пикселях — отсюда множитель на dpr. */
        penPx: thickness.px * FINALE.PEN_SIZE * dpr,
    };
}
