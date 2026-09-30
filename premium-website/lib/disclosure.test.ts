import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
    CLINIC_CATEGORIES,
    DISCLOSURE_DOCS,
    REGULATORS,
    REQUISITES,
    formatRuDate,
    groupDocuments,
    guaranteeProgram,
    omsNotice,
} from "./disclosure";
import type { DisclosureDocument, DocumentCategory } from "./types";

describe("DISCLOSURE_DOCS", () => {
    it("на каждый объявленный документ есть файл в public/", () => {
        for (const doc of DISCLOSURE_DOCS) {
            const path = join(process.cwd(), "public", doc.href);
            expect(existsSync(path), `нет файла для «${doc.title}»: ${doc.href}`).toBe(true);
        }
    });

    it("у каждого документа есть заголовок и ссылка", () => {
        for (const doc of DISCLOSURE_DOCS) {
            expect(doc.title.trim().length).toBeGreaterThan(0);
            expect(doc.href.startsWith("/")).toBe(true);
        }
    });

    it("ссылки не повторяются", () => {
        const hrefs = DISCLOSURE_DOCS.map((doc) => doc.href);
        expect(new Set(hrefs).size).toBe(hrefs.length);
    });
});

describe("REQUISITES", () => {
    // Реквизиты переносятся руками из карты предприятия, а опечатка в ИНН на
    // странице раскрытия — это неверные сведения о юрлице, а не косметика.
    // Длины кодов заданы законом, поэтому их можно проверить, не зная значения.
    it("ИНН — 10 цифр, КПП — 9, ОГРН — 13", () => {
        expect(REQUISITES.inn).toMatch(/^\d{10}$/);
        expect(REQUISITES.kpp).toMatch(/^\d{9}$/);
        expect(REQUISITES.ogrn).toMatch(/^\d{13}$/);
    });

    it("дата регистрации в формате ДД.ММ.ГГГГ", () => {
        expect(REQUISITES.registeredAt).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
    });

    it("наименования и адреса заполнены", () => {
        expect(REQUISITES.legalName.trim().length).toBeGreaterThan(0);
        expect(REQUISITES.shortName.trim().length).toBeGreaterThan(0);
        expect(REQUISITES.legalAddress.trim().length).toBeGreaterThan(0);
        expect(REQUISITES.actualAddress.trim().length).toBeGreaterThan(0);
    });
});

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

describe("REGULATORS", () => {
    it("у каждого ведомства есть название и сайт по https", () => {
        expect(REGULATORS.length).toBeGreaterThanOrEqual(3);
        for (const org of REGULATORS) {
            expect(org.name.trim().length).toBeGreaterThan(0);
            expect(org.site.startsWith("https://")).toBe(true);
        }
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
