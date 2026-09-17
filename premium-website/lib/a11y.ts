/**
 * Режим для слабовидящих по ГОСТ Р 52872. Единственный источник правды:
 * отсюда берут значения и панель настроек, и inline-скрипт в <head>.
 */

/** Ключ в localStorage. Тот же, что у прежнего переключателя, — см. parseA11ySettings. */
export const A11Y_KEY = "a11y";
/** Кнопка просит открыть панель. Кнопок несколько, панель одна. */
export const A11Y_OPEN_EVENT = "a11y-open";

export type A11yScheme = "black-on-white" | "white-on-black" | "brown-on-beige";
export type A11yFont = "normal" | "large" | "huge";
export type A11yLetter = "normal" | "wide";

export interface A11ySettings {
    on: boolean;
    scheme: A11yScheme;
    font: A11yFont;
    letter: A11yLetter;
    images: boolean;
}

export const A11Y_SCHEMES: A11yScheme[] = [
    "black-on-white",
    "white-on-black",
    "brown-on-beige",
];
export const A11Y_FONTS: A11yFont[] = ["normal", "large", "huge"];
export const A11Y_LETTERS: A11yLetter[] = ["normal", "wide"];

export const A11Y_DEFAULTS: A11ySettings = {
    on: false,
    scheme: "black-on-white",
    font: "normal",
    letter: "normal",
    images: true,
};

/**
 * Прежняя версия писала в этот же ключ строку "1"/"0". Её нужно понимать:
 * иначе у посетителя, включившего режим до обновления сайта, он молча
 * выключится. Всё, что не разбирается, — настройки по умолчанию: сломанный
 * localStorage не должен оставлять страницу без стилей.
 */
export function parseA11ySettings(raw: string | null): A11ySettings {
    if (raw === "1") return { ...A11Y_DEFAULTS, on: true };
    if (!raw || raw[0] !== "{") return { ...A11Y_DEFAULTS };

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return { ...A11Y_DEFAULTS };
    }
    if (!parsed || typeof parsed !== "object") return { ...A11Y_DEFAULTS };

    const p = parsed as Partial<A11ySettings>;
    return {
        on: p.on === true,
        scheme: A11Y_SCHEMES.includes(p.scheme as A11yScheme)
            ? (p.scheme as A11yScheme)
            : A11Y_DEFAULTS.scheme,
        font: A11Y_FONTS.includes(p.font as A11yFont)
            ? (p.font as A11yFont)
            : A11Y_DEFAULTS.font,
        letter: A11Y_LETTERS.includes(p.letter as A11yLetter)
            ? (p.letter as A11yLetter)
            : A11Y_DEFAULTS.letter,
        images: p.images !== false,
    };
}

export function serializeA11ySettings(settings: A11ySettings): string {
    return JSON.stringify(settings);
}

/**
 * Атрибуты для <html>. Ключи в стиле DOMStringMap: `a11yScheme` — это
 * атрибут `data-a11y-scheme`, по которому и написаны селекторы в globals.css.
 */
export function a11yDataset(settings: A11ySettings): Record<string, string> {
    return {
        a11y: settings.on ? "1" : "0",
        a11yScheme: settings.scheme,
        a11yFont: settings.font,
        a11yLetter: settings.letter,
        a11yImages: settings.images ? "on" : "off",
    };
}

/** Чтение с диска браузера. В приватном режиме доступ к localStorage бросает. */
export function readA11ySettings(): A11ySettings {
    try {
        return parseA11ySettings(localStorage.getItem(A11Y_KEY));
    } catch {
        return { ...A11Y_DEFAULTS };
    }
}

/**
 * Запись настроек и атрибутов на <html>. Отдельного события об изменении нет:
 * кнопки состояния не держат (подпись выбирает CSS), а сцена нейрона следит за
 * data-a11y своим MutationObserver — см. neuron/pageTheme.ts.
 */
export function writeA11ySettings(settings: A11ySettings): void {
    try {
        localStorage.setItem(A11Y_KEY, serializeA11ySettings(settings));
    } catch {
        /* без localStorage выбор проживёт до перезагрузки */
    }
    const dataset = a11yDataset(settings);
    for (const [key, value] of Object.entries(dataset)) {
        document.documentElement.dataset[key] = value;
    }
}

/**
 * Тот же разбор, но строкой: скрипт выполняется в <head> до первого пейнта,
 * когда модулей ещё нет, — иначе страница мигает обычной версией (проверено
 * в perf-v3, см. комментарий в A11yTrigger). Расхождение с parseA11ySettings
 * ловит lib/a11y.test.ts: он прогоняет обе ветки на одних и тех же входах.
 */
export const A11Y_INIT_SCRIPT = `try{
var r=localStorage.getItem("a11y");
var s={on:false,scheme:"black-on-white",font:"normal",letter:"normal",images:true};
if(r==="1")s.on=true;
else if(r&&r.charAt(0)==="{"){
var p=JSON.parse(r);
if(p&&typeof p==="object"){
s.on=p.on===true;
if(["black-on-white","white-on-black","brown-on-beige"].indexOf(p.scheme)>=0)s.scheme=p.scheme;
if(["normal","large","huge"].indexOf(p.font)>=0)s.font=p.font;
if(["normal","wide"].indexOf(p.letter)>=0)s.letter=p.letter;
s.images=p.images!==false;}}
var d=document.documentElement.dataset;
d.a11y=s.on?"1":"0";d.a11yScheme=s.scheme;d.a11yFont=s.font;d.a11yLetter=s.letter;d.a11yImages=s.images?"on":"off";
}catch(e){
var f=document.documentElement.dataset;
f.a11y="0";f.a11yScheme="black-on-white";f.a11yFont="normal";f.a11yLetter="normal";f.a11yImages="on";
}`;
