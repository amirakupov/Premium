import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    FINALE_VISIBLE_H,
    GRID_W,
    boxFromRects,
    finaleFrame,
    sameBox,
} from '../app/(site)/components/neuron/finaleFrame';
import { FINALE } from '../app/(site)/components/neuron/params';
import { SCENE_SCRIPT, chapterIndex } from '../app/(site)/components/neuron/sceneScript';
import { easeOut, lerp } from '../app/(site)/components/neuron/utils';

/**
 * Связки финала, которые разошлись бы молча.
 *
 *  1. Положение диаграммы на экране задано ОДИН раз — коробкой `.rig` в CSS;
 *     сцена читает её прямоугольник. Но пропорция этой коробки обязана
 *     совпадать с размером квада сетки из `FINALE`, иначе 3D-сетка не сядет
 *     в DOM-рамку. Сцена также читает коробку по `[data-reveal="rig"]` — этот
 *     атрибут должен быть в разметке.
 *  2. Коробка и кадр — в ОДНОЙ единице (CSS-пиксель вьюпорта). В v4 коробка
 *     возвращалась долями липкого контейнера высотой 100svh, а сцена применяла
 *     их к канвасу высотой в динамический вьюпорт; пока svh == innerHeight, это
 *     совпадало, на телефоне с адресной строкой — нет. Проверяется на чистых
 *     функциях без DOM: пиксель, возвращённый из кадра обратно на экран, равен
 *     пикселю коробки при ЛЮБОЙ высоте контейнера и ЛЮБОЙ высоте канваса.
 *  3. Вертикаль коробки отсчитывается от верха липкого контейнера, поэтому
 *     контейнер обязан быть приклеен `top: 0`.
 *  4. Кадр посчитан для камеры на оси с fov FINALE.FOV на расстоянии
 *     FINALE.CAMERA_Z — с главы вспышки и дальше камера обязана быть такой
 *     (плоскость диаграммы едет перед ней, Neuron.tsx `planeZ`).
 *  5. Порядок якорей финала в разметке обязан совпадать с порядком глав.
 *  6. Ритм передачи: полёт заканчивается до передачи, перо трогается после
 *     неё, окно прочерчивания закрывается раньше главы-стоп-кадра.
 *  7. Кривая фирменного орнамента генерируется из `EEG_PROFILE`.
 *  8. `#outro-verdict` не имеет права скрываться ни в одном режиме деградации.
 *
 * CSS и разметка читаются исходниками: проверять надо то, что написано в
 * тексте. Модули сцены импортируются напрямую — их инварианты числовые.
 */

const ROOT = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/* Комментарии вырезаются: иначе шапка правила уезжает в «селектор» и разбор
   правил превращается в гадание. */
const CSS = read('app/(site)/components/NarrativeActs.module.css').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
);
const MARKUP = read('app/(site)/components/NarrativeActs.tsx');

const rule = (selector: string) => {
    const m = new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`).exec(CSS);
    expect(m, `в CSS нет правила ${selector}`).not.toBeNull();
    return m![1];
};

describe('коробка диаграммы: CSS ↔ params.ts', () => {
    it('пропорция коробки совпадает с размером квада сетки', () => {
        const m = /aspect-ratio:\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/.exec(rule('.rig'));
        expect(m, 'в .rig нет aspect-ratio').not.toBeNull();
        const height = 2.6 + FINALE.GRID_PAD_Y * 2;
        // сравниваем отношения, а не пары чисел: 11.68/4.2 и 2.781 — одно и то же
        expect(Number(m![1]) / Number(m![2])).toBeCloseTo(GRID_W / height, 3);
    });

    it('коробка помечена атрибутом, по которому её находит сцена', () => {
        expect(MARKUP).toMatch(/data-reveal="rig"/);
        expect(read('app/(site)/components/neuron/finaleFrame.ts')).toContain(
            'data-reveal="rig"',
        );
    });

    it('ширина коробки ограничена и высотой тоже', () => {
        /* Без третьего ограничения (по svh) на низком экране 4:3 диаграмма
           вылезает за нижний край: ширина влезает, а высота уже нет. */
        const m = /width:\s*min\(([^)]*)\)/.exec(rule('.rig'));
        expect(m, 'в .rig нет width: min(...)').not.toBeNull();
        const args = m![1].split(',').map((a) => a.trim());
        expect(args.length).toBe(3);
        expect(args.some((a) => a.endsWith('vw'))).toBe(true);
        expect(args.some((a) => a.endsWith('px'))).toBe(true);
        expect(args.some((a) => a.endsWith('svh'))).toBe(true);
    });
});

describe('коробка и кадр — в одной единице', () => {
    /* Коробка стоит на одном и том же месте относительно верха липкого
       контейнера; меняется только высота контейнера (svh при выехавшей и
       убранной адресной строке) и высота канваса (динамический вьюпорт). */
    const rigIn = (host: { left: number; top: number; width: number; height: number }) => ({
        left: host.left + 250.2,
        top: host.top + 385.6,
        width: 939.6,
        height: 337.9,
    });
    const hosts = [
        { left: 0, top: 0, width: 1440, height: 810 },
        { left: 0, top: 0, width: 1440, height: 729 }, // 90 % — адресная строка
        { left: 0, top: 0, width: 1440, height: 900 },
        { left: 0, top: -640, width: 1440, height: 810 }, // контейнер ещё не приклеен
    ];

    it('пиксель коробки не зависит от высоты липкого контейнера', () => {
        const boxes = hosts.map((h) => boxFromRects(rigIn(h), h));
        for (const b of boxes) {
            expect(b.cx).toBeCloseTo(250.2 + 939.6 / 2, 6);
            expect(b.cy).toBeCloseTo(385.6 + 337.9 / 2, 6);
            expect(b.w).toBeCloseTo(939.6, 6);
        }
    });

    it('кадр, возвращённый на экран, попадает в пиксель коробки при любой высоте канваса', () => {
        const box = boxFromRects(rigIn(hosts[1]), hosts[1]);
        for (const canvasH of [729, 810, 900]) {
            const frame = finaleFrame(box, 1440, canvasH, 2);
            const worldPerPx = FINALE_VISIBLE_H / canvasH;
            const cxPx = 1440 / 2 + frame.x / worldPerPx;
            const cyPx = canvasH / 2 - frame.y / worldPerPx;
            const wPx = (frame.scale * GRID_W) / worldPerPx;
            expect(cxPx).toBeCloseTo(box.cx, 6);
            expect(cyPx).toBeCloseTo(box.cy, 6);
            expect(wPx).toBeCloseTo(box.w, 6);
        }
    });

    it('незаметный сдвиг коробки не считается изменением, заметный — считается', () => {
        const a = { cx: 720, cy: 554.5, w: 939.6 };
        expect(sameBox(a, { ...a, cy: 554.5 + 0.1 })).toBe(true);
        expect(sameBox(a, { ...a, cy: 554.5 + 1 })).toBe(false);
        expect(sameBox(null, null)).toBe(true);
        expect(sameBox(a, null)).toBe(false);
    });

    it('липкий контейнер приклеен к верху вьюпорта', () => {
        // вертикаль коробки отсчитывается от его верха — см. finaleFrame.ts
        const sticky = rule('.verdictSticky');
        expect(sticky).toMatch(/position:\s*sticky/);
        expect(sticky).toMatch(/(^|;)\s*top:\s*0\s*(;|$)/);
    });

    it('глава выхода завершается ровно в момент отклеивания коробки', () => {
        /* Метка #outro-exit стоит внутри .verdict на половину высоты липкой
           коробки выше её низа: центр вьюпорта доходит до метки тогда же,
           когда низ секции касается низа вьюпорта. Разойдись эти числа — сетка
           и лента снова остались бы висеть под уезжающими метками. */
        const sticky = /height:\s*(\d+)svh/.exec(rule('.verdictSticky'));
        const marker = rule('.outroExit');
        const bottom = /bottom:\s*(\d+)svh/.exec(marker);
        expect(sticky, 'у .verdictSticky нет height в svh').not.toBeNull();
        expect(bottom, 'у .outroExit нет bottom в svh').not.toBeNull();
        expect(Number(bottom![1])).toBe(Number(sticky![1]) / 2);
        expect(marker).toMatch(/position:\s*absolute/);
        expect(marker).toMatch(/height:\s*0/);
        // и метка обязана лежать внутри секции стоп-кадра, а не после неё
        const verdictOpen = MARKUP.indexOf('id="outro-verdict"');
        const exitAt = MARKUP.indexOf('id="outro-exit"');
        const sectionClose = MARKUP.indexOf('</section>', verdictOpen);
        expect(exitAt).toBeGreaterThan(verdictOpen);
        expect(exitAt).toBeLessThan(sectionClose);
        // и у секции есть приклеенный ход, в котором выход помещается
        const min = /min-height:\s*(\d+)svh/.exec(rule('.verdict'));
        expect(Number(min![1])).toBeGreaterThan(Number(sticky![1]));
    });
});

describe('оптика финала', () => {
    const from = chapterIndex('climax-flash');
    const draw = chapterIndex('exit-draw');

    it('с главы вспышки камера на оси с fov финала', () => {
        for (const chapter of SCENE_SCRIPT.slice(from)) {
            expect(chapter.camera.position[0], chapter.id).toBe(0);
            expect(chapter.camera.position[1], chapter.id).toBe(0);
            expect(chapter.camera.lookAt, chapter.id).toEqual([0, 0, 0]);
            expect(chapter.camera.fov, chapter.id).toBe(FINALE.FOV);
        }
    });

    it('в трёх главах финала камера стоит на FINALE.CAMERA_Z', () => {
        for (const chapter of SCENE_SCRIPT.slice(draw)) {
            expect(chapter.camera.position[2], chapter.id).toBe(FINALE.CAMERA_Z);
        }
    });
});

describe('ритм передачи эстафеты', () => {
    const flash = SCENE_SCRIPT[chapterIndex('climax-flash')];
    const draw = SCENE_SCRIPT[chapterIndex('exit-draw')];

    it('полёт к перу заканчивается не позже начала передачи', () => {
        expect(FINALE.FLIGHT_END).toBeLessThanOrEqual(FINALE.HANDOFF_START);
        expect(FINALE.HANDOFF_START).toBeLessThan(FINALE.HANDOFF_END);
    });

    it('к началу передачи нейрон уже точка', () => {
        // та же формула, что в Neuron.tsx: dissolve по отрезку, масштаб по easeOut
        const dissolve = lerp(flash.neuron.dissolve, draw.neuron.dissolve, FINALE.FLIGHT_END);
        const scale = lerp(1, 0.015, easeOut(dissolve));
        expect(scale).toBeLessThan(0.12);
    });

    it('перо трогается только после того, как зажглось', () => {
        // eeg.draw на отрезке вспышка → запись идёт линейно от flash к draw
        const drawAtHandoffEnd = lerp(flash.eeg.draw, draw.eeg.draw, FINALE.HANDOFF_END);
        expect(FINALE.DRAW_START).toBeGreaterThan(drawAtHandoffEnd);
    });

    it('окно прочерчивания заканчивается раньше главы-стоп-кадра', () => {
        // иначе линия дописывалась бы уже при показанном тексте расплаты
        expect(FINALE.DRAW_END).toBeLessThan(1);
        expect(FINALE.DRAW_START).toBeLessThan(FINALE.DRAW_END);
    });
});

describe('порядок якорей финала', () => {
    it('разметка идёт в том же порядке, что и главы сцены', () => {
        const finale = SCENE_SCRIPT.map((c) => c.anchor.slice(1)).filter((a) => a.startsWith('outro'));
        expect(finale).toEqual(['outro-draw', 'outro-verdict', 'outro-exit']);

        const inMarkup = [...MARKUP.matchAll(/id="(outro-[\w-]+)"/g)].map((m) => m[1]);
        expect(inMarkup).toEqual(finale);
    });
});

describe('деградация финала', () => {
    it('#outro-verdict не скрывается ни в одном режиме', () => {
        /* Разгоны свернуть можно и нужно, а в #outro-verdict лежат текст и
           кнопка «Записаться» — их нельзя прятать нигде. */
        const hidden = [...CSS.matchAll(/([^{}]+)\{[^}]*display:\s*none[^}]*\}/g)].map((m) =>
            m[1].trim(),
        );
        for (const selector of hidden) {
            expect(selector, `display: none на «${selector}»`).not.toMatch(/\.verdict\b/);
            expect(selector).not.toMatch(/\.verdictSticky/);
            expect(selector).not.toMatch(/\.verdictCta/);
        }
    });
});

describe('SVG-орнамент и профиль записи', () => {
    it('EegLine.tsx собран из текущего EEG_PROFILE', () => {
        const check = require('node:child_process').spawnSync(
            process.execPath,
            [path.join(ROOT, 'scripts/eeg-path.mjs'), '--check'],
            { encoding: 'utf8' },
        );
        expect(check.stderr + check.stdout).toContain('совпадает');
        expect(check.status).toBe(0);
    });
});

describe('появление текста финала', () => {
    const MOTION = read('app/(site)/components/SectionMotion.tsx');

    it('заголовок появляется не раньше прилипания коробки', () => {
        /* До прилипания DOM едет, а 3D стоит: любое `top N%` с N > 0 въезжает
           в нарисованную сетку (docs/perf-v4/report.md, UI-дефект 1). */
        const m = /const start = \(\) => \(stuck\(\) \? '([^']+)' : '([^']+)'\)/.exec(MOTION);
        expect(m, 'в SectionMotion нет выбора точки старта по высоте секции').not.toBeNull();
        expect(m![1]).toBe('top top');
    });

    it('абзац, кнопка и обвязка ведутся scrub-твином, который заканчивается в момент прилипания', () => {
        /* Однократного появления мало: доскроллив до стоп-кадра и чуть
           вернувшись, пользователь отклеивает коробку снова — текст должен
           гаснуть вместе с ней. */
        const end = /const fadeEnd = \(\) => \(stuck\(\) \? '([^']+)' : '([^']+)'\)/.exec(MOTION);
        expect(end).not.toBeNull();
        expect(end![1]).toBe('top top');
        const verdictTween = /toArray<HTMLElement>\('\[data-reveal="verdict"\]'[\s\S]*?scrollTrigger: \{[\s\S]*?\}/.exec(MOTION);
        expect(verdictTween).not.toBeNull();
        expect(verdictTween![0]).toMatch(/scrub: true/);
        expect(verdictTween![0]).not.toMatch(/once: true/);
    });

    it('scrub абзаца и кнопки не трогает transform: у кнопки свой hover/active на transform', () => {
        /* Бессрочный scrub-твин оставляет инлайновый transform навсегда, а
           инлайн побеждает :hover/:active кнопки «Записаться» (globals.css,
           .btn). Поэтому по скроллу ведётся только непрозрачность. */
        const verdictTween = /toArray<HTMLElement>\('\[data-reveal="verdict"\]'[\s\S]*?scrollTrigger: \{[\s\S]*?\}/.exec(MOTION);
        expect(verdictTween).not.toBeNull();
        expect(verdictTween![0]).not.toMatch(/\by: ?\d/);
    });

    it('в режимах деградации (короткая секция) остаётся ранний старт', () => {
        const m = /const start = \(\) => \(stuck\(\) \? '([^']+)' : '([^']+)'\)/.exec(MOTION);
        expect(m![2]).toBe('top 80%');
        const fs = /const fadeStart = \(\) => \(stuck\(\) \? '([^']+)' : '([^']+)'\)/.exec(MOTION);
        expect(fs![2]).toBe('top 80%');
    });
});
