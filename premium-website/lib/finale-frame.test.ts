import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Связки финала, которые разошлись бы молча.
 *
 *  1. Положение диаграммы на экране задано ОДИН раз — коробкой `.rig` в CSS;
 *     сцена читает её прямоугольник. Но пропорция этой коробки обязана
 *     совпадать с размером квада сетки из `FINALE`, иначе 3D-сетка не сядет
 *     в DOM-рамку. Сцена также читает коробку по `[data-reveal="rig"]` — этот
 *     атрибут должен быть в разметке.
 *  2. Порядок якорей финала в разметке обязан совпадать с порядком глав в
 *     таблице: `useScrollDirector.measure()` требует монотонных меток.
 *  3. Окно прочерчивания должно закрываться раньше главы-стоп-кадра.
 *  4. Кривая фирменного орнамента генерируется из `EEG_PROFILE`. После правки
 *     профиля `npm run eeg:path -- --write` могли забыть.
 *  5. `#outro-verdict` не имеет права скрываться ни в одном режиме деградации:
 *     в нём текст расплаты и кнопка записи.
 *
 * Файлы читаются исходниками, а не импортируются: `params.ts` и `eeg.ts` тянут
 * three, а проверять надо именно то, что написано в тексте.
 */

const ROOT = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const PARAMS = read('app/(site)/components/neuron/params.ts');
/* Комментарии вырезаются: иначе шапка правила уезжает в «селектор» и разбор
   правил превращается в гадание. */
const CSS = read('app/(site)/components/NarrativeActs.module.css').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
);
const MARKUP = read('app/(site)/components/NarrativeActs.tsx');
const SCRIPT = read('app/(site)/components/neuron/sceneScript.ts');

/** Значение числового параметра из `params.ts` по имени. */
function param(name: string): number {
    const m = new RegExp(`\\b${name}:\\s*(-?\\d+(?:\\.\\d+)?)`).exec(PARAMS);
    expect(m, `в params.ts нет ${name}`).not.toBeNull();
    return Number(m![1]);
}

describe('коробка диаграммы: CSS ↔ params.ts', () => {
    it('пропорция коробки совпадает с размером квада сетки', () => {
        const m = /aspect-ratio:\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/.exec(CSS);
        expect(m, 'в .rig нет aspect-ratio').not.toBeNull();

        const width = param('WIDTH') + param('GRID_PAD_X') * 2;
        const height = param('HEIGHT') + param('GRID_PAD_Y') * 2;
        // сравниваем отношения, а не пары чисел: 11.68/4.2 и 2.781 — одно и то же
        expect(Number(m![1]) / Number(m![2])).toBeCloseTo(width / height, 3);
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
        const m = /\.rig\s*\{[^}]*?width:\s*min\(([^)]*)\)/.exec(CSS);
        expect(m, 'в .rig нет width: min(...)').not.toBeNull();
        const args = m![1].split(',').map((a) => a.trim());
        expect(args.length).toBe(3);
        expect(args.some((a) => a.endsWith('vw'))).toBe(true);
        expect(args.some((a) => a.endsWith('px'))).toBe(true);
        expect(args.some((a) => a.endsWith('svh'))).toBe(true);
    });
});

describe('порядок якорей финала', () => {
    it('разметка идёт в том же порядке, что и главы сцены', () => {
        const anchors = [...SCRIPT.matchAll(/anchor:\s*'#([\w-]+)'/g)].map((m) => m[1]);
        const finale = anchors.filter((a) => a.startsWith('outro'));
        expect(finale).toEqual(['outro-draw', 'outro-verdict', 'outro-exit']);

        const inMarkup = [...MARKUP.matchAll(/id="(outro-[\w-]+)"/g)].map((m) => m[1]);
        expect(inMarkup).toEqual(finale);
    });

    it('окно прочерчивания заканчивается раньше главы-стоп-кадра', () => {
        // иначе линия дописывалась бы уже при показанном тексте расплаты
        expect(param('DRAW_END')).toBeLessThan(1);
        expect(param('DRAW_START')).toBeGreaterThan(0);
        expect(param('DRAW_START')).toBeLessThan(param('DRAW_END'));
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
