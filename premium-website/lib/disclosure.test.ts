import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
    DISCLOSURE_DOCS,
    REGULATORS,
    omsNotice,
} from "./disclosure";

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
