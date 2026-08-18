'use client';

import { clamp01, smoothstep } from './utils';

/**
 * ─────────────── ПЕРЕХОД ФОНА: ОДИН ИСТОЧНИК ПРАВДЫ ───────────────
 *
 * Цвет фона живёт в таблице глав. Отсюда он расходится в два места:
 *   1) туман и сцена — их красит Neuron.tsx;
 *   2) CSS-переменные на documentElement — их пишет этот модуль.
 *
 * Из того же цвета выводятся три величины, и других источников нет:
 *   dark — насколько темно (по ней гаснут светлые «обои»);
 *   swap — на какой стороне сейчас пара «текст + поверхность»;
 *   band — насколько мы внутри опасной полосы яркости.
 *
 * ── ПОЧЕМУ ПАРА «ТЕКСТ + ПОВЕРХНОСТЬ» ПЕРЕБРАСЫВАЕТСЯ СТУПЕНЬЮ ──
 *
 * Наивное решение — плавно вести и фон, и цвет текста — не работает, и это
 * арифметика, а не вкус: в середине перехода оба оказываются серединно-серыми
 * и контраст падает до 1:1.
 *
 * Причём непрерывного решения не существует вообще. Чтобы тёмная краска
 * #0f1f38 давала 4.5:1, фон должен быть светлее L≈0.26; чтобы светлая #eaf1fb
 * давала 4.5:1 — темнее L≈0.15. Диапазоны не пересекаются, значит любой путь из
 * светлого в тёмное проходит полосу, где ни одна краска не годится.
 *
 * Отсюда решение: фон едет плавно, а пара текст+поверхность перебрасывается
 * ступенью в один кадр. Они всегда по разные стороны яркости, поэтому контраст
 * текста к своей подложке не деградирует никогда. Цена — заметная смена тона
 * текста в один кадр, как переключение тёмной темы. Это осознанный компромисс:
 * альтернатива — «почти читаемо», чего на медицинском сайте быть не должно.
 *
 * ── ЗАЧЕМ «ПОЛОСА» (band) ──
 *
 * Ступени мало. Пока фон проходит середину, он мутный, и поверхность, которая
 * его просвечивает, тащит эту мутность в себя: полупрозрачная карточка
 * становится серой, и текст на ней пропадает. Поэтому внутри полосы все
 * поверхности густеют почти до непрозрачных и перестают зависеть от фона, а по
 * краям возвращаются к воздушному стеклу. Там же проявляется подложка под
 * корпусным текстом, который лежит прямо на фоне (нарративные экраны).
 *
 * Границы полосы взяты не на глаз: это ровно те яркости фона, при которых
 * активная краска перестаёт давать 4.5:1. Всё вместе проверяется скриптом
 * docs/neuron-v2/contrast.py по всей длине шкалы, а не в трёх точках.
 *
 * ── СТОИМОСТЬ ЗАПИСИ ──
 *
 * Запись переменной на :root инвалидирует стили ВСЕГО документа, а на главной
 * десятки элементов с backdrop-filter, и каждый после этого пересобирает
 * размытие. Делать это на каждом кадре — самая дорогая строчка во всей сцене.
 * Поэтому:
 *   — значения квантуются;
 *   — непрерывные (цвет фона и «темнота») пишутся не чаще MIN_WRITE_INTERVAL:
 *     переход медленный, десяти шагов в секунду ему достаточно;
 *   — ступень и полоса пишутся немедленно: это читаемость текста, её
 *     откладывать нельзя.
 */

type Rgba = [number, number, number, number];

/**
 * Токен: значение вне полосы и внутри полосы, для каждой из двух сторон.
 * `null` в «полосе» означает «то же самое» — цвету текста густеть незачем.
 */
type TokenSpec = readonly [
    name: string,
    light: string,
    lightBand: string | null,
    dark: string,
    darkBand: string | null,
];

const TOKENS: readonly TokenSpec[] = [
    ['--paper', '#f4f8fd', null, '#0a1628', null],
    ['--surface', '#ffffff', null, '#16283f', null],
    ['--ink', '#0f1f38', null, '#eaf1fb', null],
    ['--ink-soft', '#42546d', null, '#a7bcda', null],
    ['--border', 'rgba(15, 31, 56, 0.12)', null, 'rgba(234, 241, 251, 0.18)', null],
    /* Фирменный #2563eb на тёмном грунте даёт около 3:1 — для корпуса мало,
       поэтому на тёмном действие несёт светло-голубой из той же семьи. */
    ['--brand', '#2563eb', null, '#6aa8f5', null],
    ['--brand-tint', '#e6f0fd', null, '#16304f', null],
    /* Стекло на тёмной стороне тонируется тёмным, а не белым. Белила поверх
       navy дают светлую плёнку, и светлый текст на такой карточке проваливается
       — это была бы та же ошибка, что и плавная интерполяция краски. */
    [
        '--glass-bg',
        'rgba(255, 255, 255, 0.2)',
        'rgba(255, 255, 255, 0.96)',
        'rgba(10, 22, 40, 0.42)',
        'rgba(10, 22, 40, 0.96)',
    ],
    [
        '--glass-bg-strong',
        'rgba(255, 255, 255, 0.34)',
        'rgba(255, 255, 255, 0.97)',
        'rgba(10, 22, 40, 0.62)',
        'rgba(10, 22, 40, 0.97)',
    ],
    ['--glass-border', 'rgba(255, 255, 255, 0.06)', null, 'rgba(255, 255, 255, 0.12)', null],
    [
        '--glass-tint',
        'rgba(214, 232, 255, 0.28)',
        'rgba(214, 232, 255, 0.95)',
        'rgba(12, 26, 45, 0.5)',
        'rgba(12, 26, 45, 0.95)',
    ],
    /* Плотная плашка на обороте карточки врача: единственное место в модулях
       секций, где стоял почти непрозрачный белый. */
    [
        '--plate-a',
        'rgba(255, 255, 255, 0.92)',
        'rgba(255, 255, 255, 0.99)',
        'rgba(22, 40, 63, 0.92)',
        'rgba(22, 40, 63, 0.99)',
    ],
    [
        '--plate-b',
        'rgba(233, 242, 255, 0.88)',
        'rgba(233, 242, 255, 0.99)',
        'rgba(12, 26, 45, 0.9)',
        'rgba(12, 26, 45, 0.99)',
    ],
    /* Подложка под корпусным текстом на фоне: вне полосы её нет вовсе. */
    [
        '--panel-bg',
        'rgba(255, 255, 255, 0)',
        'rgba(255, 255, 255, 0.96)',
        'rgba(10, 22, 40, 0)',
        'rgba(10, 22, 40, 0.96)',
    ],
];

const HEX = /^#([0-9a-f]{6})$/i;

function parseColor(css: string): Rgba {
    const hex = HEX.exec(css.trim());
    if (hex) {
        const value = parseInt(hex[1], 16);
        return [(value >> 16) & 255, (value >> 8) & 255, value & 255, 1];
    }
    const parts = css
        .replace(/^rgba?\(|\)$/g, '')
        .split(',')
        .map((part) => Number(part.trim()));
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1];
}

const format = (c: Rgba) =>
    `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${
        Math.round(c[3] * 1000) / 1000
    })`;

const mix = (a: Rgba, b: Rgba, t: number): Rgba => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
    a[3] + (b[3] - a[3]) * t,
];

/* Разбор один раз при загрузке модуля. */
const PARSED = TOKENS.map(([name, light, lightBand, dark, darkBand]) => ({
    name,
    light: parseColor(light),
    lightBand: parseColor(lightBand ?? light),
    dark: parseColor(dark),
    darkBand: parseColor(darkBand ?? dark),
}));

/**
 * Граница переброса по ЛИНЕЙНОЙ яркости фона. Значение выбрано так, что крупный
 * текст держит 3:1 по обе стороны: тёмная краска даёт ~3.9:1, светлая ~3.3:1.
 */
const SWAP_LUMINANCE = 0.22;

/**
 * Полоса, внутри которой поверхности обязаны стать самодостаточными. Границы —
 * яркости фона, при которых активная краска перестаёт давать 4.5:1: светлая
 * сторона выдыхается ниже L≈0.56, тёмная — выше L≈0.07.
 */
const BAND_LIGHT_EDGE = [0.62, 0.5] as const;
const BAND_DARK_EDGE = [0.04, 0.07] as const;

/** мс между записями непрерывных значений */
const MIN_WRITE_INTERVAL = 90;

export type PageTheme = {
    /**
     * `css` — цвет фона строкой (#rrggbb); `lum` — его линейная яркость;
     * `dark` — 0…1 из darknessOf (по ней гаснут «обои»).
     * Ничего не делает, если режим доступности или reduced-motion запрещают
     * странице темнеть.
     */
    apply: (css: string, lum: number, dark: number) => void;
    /** снять все переменные: страница возвращается к статике из globals.css */
    reset: () => void;
    dispose: () => void;
};

/**
 * `glass: false` — низкий тир: размытие на странице выключено целиком
 * (см. globals.css, html[data-scene-tier="low"]). Инлайновый стиль победил бы
 * тот CSS-блок, поэтому фильтр подложки здесь просто не пишется.
 */
export function createPageTheme(enabled: boolean, glass: boolean): PageTheme {
    const root = typeof document === 'undefined' ? null : document.documentElement;
    let lastDark = -1;
    let lastSwap = -1;
    let lastBand = -1;
    let lastBackground = '';
    let lastWriteAt = Number.NEGATIVE_INFINITY;
    let a11y = root?.dataset.a11y === '1';

    const reset = () => {
        if (!root) return;
        root.style.removeProperty('--scene-dark');
        root.style.removeProperty('--page-bg');
        root.style.removeProperty('--panel-filter');
        root.style.removeProperty('--glass-gloss');
        root.style.removeProperty('--glass-sheen');
        PARSED.forEach(({ name }) => root.style.removeProperty(name));
        lastDark = -1;
        lastSwap = -1;
        lastBand = -1;
        lastBackground = '';
        lastWriteAt = Number.NEGATIVE_INFINITY;
    };

    /* Режим для слабовидящих переключается на живой странице, поэтому за
       атрибутом надо следить, а не читать его один раз при монтировании. */
    let observer: MutationObserver | null = null;
    if (root && enabled) {
        observer = new MutationObserver(() => {
            const next = root.dataset.a11y === '1';
            if (next === a11y) return;
            a11y = next;
            if (a11y) reset();
        });
        observer.observe(root, { attributes: true, attributeFilter: ['data-a11y'] });
    }

    return {
        apply(css: string, lum: number, dark: number) {
            if (!root || !enabled || a11y) return;

            const quantizedDark = Math.round(clamp01(dark) * 200) / 200;
            const swap = lum < SWAP_LUMINANCE ? 1 : 0;
            const band =
                Math.round(
                    smoothstep(BAND_LIGHT_EDGE[0], BAND_LIGHT_EDGE[1], lum) *
                        smoothstep(BAND_DARK_EDGE[0], BAND_DARK_EDGE[1], lum) *
                        100,
                ) / 100;

            if (
                quantizedDark === lastDark &&
                swap === lastSwap &&
                band === lastBand &&
                css === lastBackground
            ) {
                return;
            }
            const surfacesChanged = swap !== lastSwap || band !== lastBand;
            /* Ступень и полоса — читаемость, их нельзя откладывать. Цвет фона —
               атмосфера, он ждёт своей очереди. */
            const now = performance.now();
            if (!surfacesChanged && now - lastWriteAt < MIN_WRITE_INTERVAL) return;
            lastWriteAt = now;
            lastDark = quantizedDark;
            lastSwap = swap;
            lastBand = band;
            lastBackground = css;

            root.style.setProperty('--scene-dark', String(quantizedDark));
            root.style.setProperty('--page-bg', css);

            if (!surfacesChanged) return;

            PARSED.forEach(({ name, light, lightBand, dark: d, darkBand }) => {
                const base = swap ? d : light;
                const dense = swap ? darkBand : lightBand;
                root.style.setProperty(name, format(mix(base, dense, band)));
            });

            /* Прозрачная подложка всё равно размывала бы фон за собой, поэтому
               вне полосы фильтр гасится целиком, а не в blur(0). */
            root.style.setProperty(
                '--panel-filter',
                !glass || band < 0.02 ? 'none' : `blur(${Math.round(band * 18)}px) saturate(150%)`,
            );

            /* Блики стекла живут не цветом, а альфой белого: на тёмном грунте их
               надо приглушить, иначе кромка карточки светится сильнее самой
               карточки. */
            const sheen = 1 - 0.55 * swap;
            root.style.setProperty(
                '--glass-gloss',
                `linear-gradient(148deg,` +
                    ` rgba(255, 255, 255, ${0.55 * sheen}) 0%,` +
                    ` rgba(255, 255, 255, ${0.14 * sheen}) 22%,` +
                    ` rgba(255, 255, 255, 0) 46%,` +
                    ` rgba(255, 255, 255, 0) 74%,` +
                    ` rgba(255, 255, 255, ${0.1 * sheen}) 88%,` +
                    ` rgba(255, 255, 255, ${0.3 * sheen}) 100%)`,
            );
            root.style.setProperty(
                '--glass-sheen',
                `inset 1.5px 2px 1.5px -1.5px rgba(255, 255, 255, ${1 * sheen}),` +
                    ` inset -1.5px -2px 1.5px -1.5px rgba(255, 255, 255, ${0.9 * sheen}),` +
                    ` inset 0 0 0 1px rgba(255, 255, 255, ${0.4 * sheen}),` +
                    ` inset 0 1.5px 14px -7px rgba(18, 42, 77, 0.3),` +
                    ` inset 0 -10px 22px -20px rgba(18, 42, 77, 0.45)`,
            );
        },
        reset,
        dispose() {
            observer?.disconnect();
            reset();
        },
    };
}
