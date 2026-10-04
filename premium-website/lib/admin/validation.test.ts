import { describe, expect, it } from "vitest";
import type { ClinicRequisites, DisclosureDocumentPayload } from "@/lib/types";
import {
    isHttpsUrl,
    validateDmsPartner,
    validateDocument,
    validateRegulator,
    validateRequisites,
} from "./validation";

const FILE: DisclosureDocumentPayload = {
    title: "Прейскурант цен",
    category: "PRICE_LIST",
    kind: "FILE",
    url: "/uploads/0b8e7c1a-2f4d-4a55-9d0e-3c1b2a4f5e6d.pdf",
    note: "",
};

const REQUISITES: ClinicRequisites = {
    legalName: "Общество с ограниченной ответственностью «ПРЕМИУМ»",
    shortName: "ООО «ПРЕМИУМ»",
    inn: "0276970983",
    kpp: "027401001",
    ogrn: "1220200030710",
    registeredAt: "2022-09-06",
    legalAddress: "450018, г. Уфа",
    actualAddress: "450018, г. Уфа",
};

describe("validateDocument", () => {
    it("корректный файл и корректная ссылка проходят", () => {
        expect(validateDocument(FILE)).toEqual({});
        expect(validateDocument({ ...FILE, kind: "LINK", url: "https://health.bashkortostan.ru" })).toEqual({});
    });

    it("нет названия и не загружен файл", () => {
        const errors = validateDocument({ ...FILE, title: "  ", url: "" });
        expect(errors.title).toBeDefined();
        expect(errors.url).toBe("Загрузите PDF");
    });

    it("ссылка не https", () => {
        expect(validateDocument({ ...FILE, kind: "LINK", url: "javascript:alert(1)" }).url).toContain("https://");
    });

    it("примечание длиннее 500", () => {
        expect(validateDocument({ ...FILE, note: "x".repeat(501) }).note).toBeDefined();
    });
});

describe("validateRequisites", () => {
    it("реальные реквизиты и пустая форма проходят", () => {
        expect(validateRequisites(REQUISITES)).toEqual({});
        expect(validateRequisites({ ...REQUISITES, inn: "", kpp: "", ogrn: "", registeredAt: "" })).toEqual({});
    });

    it("пробелы по краям не ошибка — бэкенд их обрежет", () => {
        expect(validateRequisites({ ...REQUISITES, inn: " 0276970983 " })).toEqual({});
    });

    it("пробел внутри, буквы и неверная длина — ошибка у своего поля", () => {
        const errors = validateRequisites({ ...REQUISITES, inn: "0276 970983", kpp: "02740100", ogrn: "122020003071O" });
        expect(errors.inn).toBe("ИНН — 10 цифр");
        expect(errors.kpp).toBe("КПП — 9 цифр");
        expect(errors.ogrn).toBe("ОГРН — 13 цифр");
    });
});

describe("validateDmsPartner / validateRegulator", () => {
    it("название обязательно, сайт — пусто или https", () => {
        expect(validateDmsPartner({ name: "", site: "" }).name).toBeDefined();
        expect(validateDmsPartner({ name: "СОГАЗ", site: "sogaz.ru" }).site).toBeDefined();
        expect(validateDmsPartner({ name: "СОГАЗ", site: "" })).toEqual({});
        expect(validateRegulator({ name: "Минздрав РБ", address: "", phone: "", site: "https://health.bashkortostan.ru" })).toEqual({});
    });
});

describe("isHttpsUrl", () => {
    it("только https с хостом", () => {
        expect(isHttpsUrl("https://02.rospotrebnadzor.ru")).toBe(true);
        expect(isHttpsUrl("http://02.rospotrebnadzor.ru")).toBe(false);
        expect(isHttpsUrl("https://")).toBe(false);
        expect(isHttpsUrl("не ссылка")).toBe(false);
    });
});
