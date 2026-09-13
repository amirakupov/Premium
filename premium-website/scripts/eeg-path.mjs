#!/usr/bin/env node
/**
 * Генератор атрибута `d` фирменной линии из EEG_PROFILE.
 *
 * Профиль — единственный источник правды для обеих версий кривой: 3D-ленты
 * финала (geometry/eeg.ts) и SVG-орнамента (EegLine.tsx). До этой задачи `d`
 * был зашит в разметку руками, и prompt v2 требовал держать их одинаковыми
 * честным словом. После микрошума и переменной толщины 3D-версия отличается от
 * SVG уже по построению — но отличается ТОЛЬКО этим: опорные точки обязаны
 * совпадать, иначе на странице окажутся две разные кривые.
 *
 * Запуск:
 *   npm run eeg:path          — напечатать текущее значение
 *   npm run eeg:path -- --check  — упасть, если EegLine.tsx разошёлся с профилем
 *
 * Профиль читается из geometry/eeg.ts разбором исходника, а не импортом: файл
 * тянет three и params, а этому скрипту нужны только числа.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SOURCE = path.join(ROOT, 'app/(site)/components/neuron/geometry/eeg.ts');
const TARGET = path.join(ROOT, 'app/(site)/components/EegLine.tsx');

function readProfile() {
    const src = fs.readFileSync(SOURCE, 'utf8');
    const start = src.indexOf('export const EEG_PROFILE');
    const open = src.indexOf('[', start);
    const close = src.indexOf('];', open);
    if (start < 0 || open < 0 || close < 0) throw new Error('EEG_PROFILE не найден в ' + SOURCE);
    const body = src.slice(open + 1, close);
    const points = [...body.matchAll(/\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/g)].map(
        (m) => [Number(m[1]), Number(m[2])],
    );
    if (points.length < 2) throw new Error('в EEG_PROFILE меньше двух точек');
    return points;
}

/**
 * Ломаная относительными командами: H/V там, где сегмент строго горизонтален
 * или вертикален, иначе l. Так `d` остаётся читаемым и коротким, а
 * прямоугольность калибровочного импульса видна прямо в разметке.
 */
function toPath(points) {
    const n = (v) => String(Math.round(v * 100) / 100);
    const out = [`M${n(points[0][0])} ${n(points[0][1])}`];
    for (let i = 1; i < points.length; i += 1) {
        const dx = points[i][0] - points[i - 1][0];
        const dy = points[i][1] - points[i - 1][1];
        if (dy === 0 && dx === 0) continue;
        if (dy === 0) out.push(`h${n(dx)}`);
        else if (dx === 0) out.push(`v${n(dy)}`);
        else out.push(`l${n(dx)} ${n(dy)}`);
    }
    return out.join(' ');
}

const expected = toPath(readProfile());

if (process.argv.includes('--check')) {
    const tsx = fs.readFileSync(TARGET, 'utf8');
    const found = /d="([^"]+)"/.exec(tsx)?.[1];
    if (found !== expected) {
        console.error('EegLine.tsx разошёлся с EEG_PROFILE.\n  в разметке: %s\n  из профиля: %s', found, expected);
        console.error('\nПочинить: npm run eeg:path -- --write');
        process.exit(1);
    }
    console.log('EegLine.tsx совпадает с EEG_PROFILE');
} else if (process.argv.includes('--write')) {
    const tsx = fs.readFileSync(TARGET, 'utf8');
    const next = tsx.replace(/d="[^"]+"/, `d="${expected}"`);
    fs.writeFileSync(TARGET, next);
    console.log('EegLine.tsx обновлён');
} else {
    console.log(expected);
}
