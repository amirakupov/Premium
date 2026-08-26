import { describe, expect, it } from "vitest";
import { articleDateIso, formatArticleDate } from "./format";

describe("formatArticleDate", () => {
    it("форматирует ISO-строку от Jackson по-русски", () => {
        expect(formatArticleDate("2026-08-25T12:34:56")).toBe("25 августа 2026 г.");
    });

    it("принимает массив чисел — вторую возможную форму LocalDateTime", () => {
        expect(formatArticleDate([2026, 8, 25, 12, 34, 56])).toBe("25 августа 2026 г.");
    });

    it("на мусоре возвращает пустую строку, а не Invalid Date", () => {
        expect(formatArticleDate("не дата")).toBe("");
        expect(formatArticleDate(null)).toBe("");
        expect(formatArticleDate(undefined)).toBe("");
        expect(formatArticleDate([])).toBe("");
    });
});

describe("articleDateIso", () => {
    it("отдаёт машинную дату для <time> и JSON-LD", () => {
        expect(articleDateIso("2026-08-25T12:34:56")).toMatch(/^2026-08-25T/);
    });

    it("на мусоре возвращает пустую строку", () => {
        expect(articleDateIso("нет")).toBe("");
    });
});
