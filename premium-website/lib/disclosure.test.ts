import { describe, expect, it } from "vitest";
import {
    CLINIC_CATEGORIES,
    formatRuDate,
    groupDocuments,
    guaranteeProgram,
    omsNotice,
} from "./disclosure";
import type { DisclosureDocument, DocumentCategory } from "./types";

describe("omsNotice", () => {
    it("подставляет наименование организации", () => {
        expect(omsNotice('ООО «Премиум»')).toBe(
            'Внимание: ООО «Премиум» НЕ оказывает медицинские услуги в рамках программы обязательного медицинского страхования (ОМС).',
        );
    });

    it("пока наименование не заполнено, подставляет название клиники", () => {
        expect(omsNotice("")).toContain("Клиника «Премиум»");
        expect(omsNotice("   ")).toContain("Клиника «Премиум»");
    });
});

function doc(id: number, category: DocumentCategory, sortOrder = 0): DisclosureDocument {
    return {
        id,
        title: `Документ ${id}`,
        category,
        kind: "FILE",
        url: `/uploads/${id}.pdf`,
        note: "",
        sortOrder,
        doctorId: null,
        updatedAt: "2026-09-30T12:00:00",
    };
}

describe("groupDocuments", () => {
    it("раскладывает по категориям в порядке сайта и сохраняет порядок внутри", () => {
        const groups = groupDocuments([
            doc(1, "OTHER"),
            doc(2, "PRICE_LIST", 1),
            doc(3, "CONTRACT"),
            doc(4, "PRICE_LIST", 0),
        ]);
        expect(groups.map((g) => g.category)).toEqual(["CONTRACT", "PRICE_LIST", "OTHER"]);
        expect(groups[1].documents.map((d) => d.id)).toEqual([4, 2]);
        expect(groups[0].label).toBe("Договор");
    });

    it("не выводит программу госгарантий и документы врачей", () => {
        const groups = groupDocuments([doc(1, "GUARANTEE_PROGRAM"), doc(2, "CERTIFICATE"), doc(3, "DIPLOMA")]);
        expect(groups).toEqual([]);
    });

    it("CLINIC_CATEGORIES не содержит категорий врача", () => {
        expect(CLINIC_CATEGORIES).not.toContain("CERTIFICATE");
        expect(CLINIC_CATEGORIES).not.toContain("DIPLOMA");
    });
});

describe("guaranteeProgram", () => {
    it("берёт первый документ программы госгарантий", () => {
        expect(guaranteeProgram([doc(1, "CONTRACT"), doc(5, "GUARANTEE_PROGRAM", 1), doc(6, "GUARANTEE_PROGRAM", 0)])?.id).toBe(6);
    });

    it("null, если программы нет", () => {
        expect(guaranteeProgram([doc(1, "CONTRACT")])).toBeNull();
    });
});

describe("formatRuDate", () => {
    it("дата и дата-время ISO → ДД.ММ.ГГГГ без сдвига часового пояса", () => {
        expect(formatRuDate("2022-09-06")).toBe("06.09.2022");
        expect(formatRuDate("2026-09-30T23:59:59.123")).toBe("30.09.2026");
    });

    it("пустое и мусор → пустая строка", () => {
        expect(formatRuDate("")).toBe("");
        expect(formatRuDate("06.09.2022")).toBe("");
    });
});
