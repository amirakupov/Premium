import { describe, expect, it } from "vitest";
import {
    A11Y_DEFAULTS,
    A11Y_INIT_SCRIPT,
    a11yDataset,
    parseA11ySettings,
    serializeA11ySettings,
} from "./a11y";

/**
 * Прогоняет inline-скрипт из <head> с подставными localStorage и document.
 * Ключи dataset — camelCase, как у настоящего DOMStringMap: там `a11yScheme`
 * соответствует атрибуту `data-a11y-scheme`.
 */
function runInitScript(raw: string | null): Record<string, string> {
    const dataset: Record<string, string> = {};
    const localStorage = { getItem: () => raw };
    const document = { documentElement: { dataset } };
    new Function("localStorage", "document", A11Y_INIT_SCRIPT)(localStorage, document);
    return dataset;
}

describe("parseA11ySettings", () => {
    it("без сохранённого значения даёт выключенный режим по умолчанию", () => {
        expect(parseA11ySettings(null)).toEqual(A11Y_DEFAULTS);
    });

    it('понимает "1" от прежней версии переключателя', () => {
        expect(parseA11ySettings("1")).toEqual({ ...A11Y_DEFAULTS, on: true });
    });

    it('понимает "0" от прежней версии переключателя', () => {
        expect(parseA11ySettings("0")).toEqual(A11Y_DEFAULTS);
    });

    it("читает полный набор настроек", () => {
        const raw = serializeA11ySettings({
            on: true,
            scheme: "white-on-black",
            font: "huge",
            letter: "wide",
            images: false,
        });
        expect(parseA11ySettings(raw)).toEqual({
            on: true,
            scheme: "white-on-black",
            font: "huge",
            letter: "wide",
            images: false,
        });
    });

    it("отбрасывает неизвестные значения полей, сохраняя понятные", () => {
        const raw = JSON.stringify({
            on: true,
            scheme: "neon",
            font: "huge",
            letter: "диагональный",
            images: false,
        });
        expect(parseA11ySettings(raw)).toEqual({
            on: true,
            scheme: "black-on-white",
            font: "huge",
            letter: "normal",
            images: false,
        });
    });

    it("на битом JSON не бросает, а возвращает значения по умолчанию", () => {
        expect(parseA11ySettings("{не json")).toEqual(A11Y_DEFAULTS);
    });
});

describe("a11yDataset", () => {
    it("выключенный режим оставляет data-a11y нулём", () => {
        expect(a11yDataset(A11Y_DEFAULTS).a11y).toBe("0");
    });

    it("включённый режим описан пятью атрибутами", () => {
        expect(a11yDataset({
            on: true,
            scheme: "brown-on-beige",
            font: "large",
            letter: "wide",
            images: false,
        })).toEqual({
            a11y: "1",
            a11yScheme: "brown-on-beige",
            a11yFont: "large",
            a11yLetter: "wide",
            a11yImages: "off",
        });
    });
});

describe("A11Y_INIT_SCRIPT", () => {
    const cases: (string | null)[] = [
        null,
        "1",
        "0",
        "{не json",
        serializeA11ySettings({
            on: true,
            scheme: "white-on-black",
            font: "huge",
            letter: "wide",
            images: false,
        }),
        JSON.stringify({ on: true, scheme: "neon", font: "large" }),
    ];

    it.each(cases)(
        "ставит ровно те же атрибуты, что и parseA11ySettings, на входе %s",
        (raw) => {
            expect(runInitScript(raw)).toEqual(a11yDataset(parseA11ySettings(raw)));
        },
    );
});
