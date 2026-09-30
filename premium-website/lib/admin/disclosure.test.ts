import { describe, expect, it } from "vitest";
import type { ClinicRequisites, DisclosureDocument, DocumentCategory } from "@/lib/types";
import {
    backendErrorMessage,
    changedRequisites,
    checkPdfFile,
    createLatestGate,
    formatBytes,
    missingRequiredCategories,
    moveId,
    restorableDraft,
    tabAfterKey,
} from "./disclosure";

function doc(id: number, category: DocumentCategory): DisclosureDocument {
    return {
        id,
        title: "Документ",
        category,
        kind: "FILE",
        url: `/uploads/${id}.pdf`,
        note: "",
        sortOrder: 0,
        doctorId: null,
        updatedAt: "",
    };
}

describe("missingRequiredCategories", () => {
    it("пустой раздел — не хватает всех обязательных, в порядке сайта", () => {
        expect(missingRequiredCategories([])).toEqual([
            "CONTRACT",
            "PRICE_LIST",
            "LICENSE",
            "REGULATION",
            "GUARANTEE_PROGRAM",
        ]);
    });

    it("«Прочее» и документы врачей обязательных не закрывают", () => {
        expect(missingRequiredCategories([doc(1, "OTHER"), doc(2, "CERTIFICATE")])).toHaveLength(5);
    });

    it("всё на месте — пусто", () => {
        const all: DocumentCategory[] = ["CONTRACT", "PRICE_LIST", "LICENSE", "REGULATION", "GUARANTEE_PROGRAM"];
        expect(missingRequiredCategories(all.map((c, i) => doc(i, c)))).toEqual([]);
    });
});

describe("moveId", () => {
    it("сдвигает вверх и вниз", () => {
        expect(moveId([1, 2, 3], 2, -1)).toEqual([2, 1, 3]);
        expect(moveId([1, 2, 3], 2, 1)).toEqual([1, 3, 2]);
    });

    it("за край и неизвестный id — null, запрос не нужен", () => {
        expect(moveId([1, 2, 3], 1, -1)).toBeNull();
        expect(moveId([1, 2, 3], 3, 1)).toBeNull();
        expect(moveId([1, 2, 3], 9, 1)).toBeNull();
    });
});

describe("backendErrorMessage", () => {
    it("400 — текст бэкенда без служебного префикса", () => {
        expect(backendErrorMessage(400, "Invalid input: ИНН — 10 цифр")).toBe("ИНН — 10 цифр");
        expect(backendErrorMessage(400, "Файл не PDF")).toBe("Файл не PDF");
    });

    it("права и отсутствие — понятные фразы вместо английского", () => {
        expect(backendErrorMessage(401, "Invalid credentials")).toBe("Сессия истекла — войдите заново");
        expect(backendErrorMessage(403, "Access denied")).toBe("Недостаточно прав для этого действия");
        expect(backendErrorMessage(404, "Документ не найден")).toBe("Документ не найден");
    });

    it("500 и пустой ответ — общая фраза", () => {
        expect(backendErrorMessage(500, "Internal server error")).toBe("Ошибка сервера — попробуйте позже");
        expect(backendErrorMessage(400, "")).toBe("Запрос отклонён сервером");
    });
});

describe("checkPdfFile", () => {
    it("PDF до 30 МБ проходит, в том числе с пустым MIME и расширением в верхнем регистре", () => {
        expect(checkPdfFile({ name: "price.pdf", type: "application/pdf", size: 1024 })).toBeNull();
        expect(checkPdfFile({ name: "LICENSE.PDF", type: "", size: 1024 })).toBeNull();
    });

    it("не PDF и слишком большой файл — текст ошибки", () => {
        expect(checkPdfFile({ name: "scan.jpg", type: "image/jpeg", size: 10 })).toBe("Подойдёт только PDF");
        expect(checkPdfFile({ name: "scan.pdf", type: "application/pdf", size: 30 * 1024 * 1024 + 1 })).toBe(
            "Файл больше 30 МБ",
        );
        expect(checkPdfFile({ name: "empty.pdf", type: "application/pdf", size: 0 })).toBe("Файл пустой");
    });
});

describe("formatBytes", () => {
    it("КБ и МБ с одним знаком", () => {
        expect(formatBytes(512)).toBe("1 КБ");
        expect(formatBytes(4_162_290)).toBe("4,0 МБ");
    });
});

describe("changedRequisites", () => {
    const saved: ClinicRequisites = {
        legalName: "Общество",
        shortName: "ООО «ПРЕМИУМ»",
        inn: "0276970983",
        kpp: "027401001",
        ogrn: "1220200030710",
        registeredAt: "2022-09-06",
        legalAddress: "Уфа",
        actualAddress: "Уфа",
    };

    it("отправляет только изменённые поля — пустая форма после сбоя загрузки не стирает реквизиты", () => {
        const empty = { ...saved, legalName: "", shortName: "", kpp: "", ogrn: "", registeredAt: "", legalAddress: "", actualAddress: "", inn: "" };
        expect(changedRequisites({ ...empty, inn: "0276970983" }, empty)).toEqual({ inn: "0276970983" });
        expect(changedRequisites({ ...saved, kpp: "" }, saved)).toEqual({ kpp: "" });
    });

    it("ничего не изменилось — пустой объект", () => {
        expect(changedRequisites(saved, saved)).toEqual({});
    });
});

describe("tabAfterKey", () => {
    const tabs = ["documents", "requisites", "dms", "regulators"] as const;

    it("стрелки двигают по кругу, Home и End — к краям", () => {
        expect(tabAfterKey(tabs, "documents", "ArrowRight")).toBe("requisites");
        expect(tabAfterKey(tabs, "documents", "ArrowLeft")).toBe("regulators");
        expect(tabAfterKey(tabs, "regulators", "ArrowRight")).toBe("documents");
        expect(tabAfterKey(tabs, "dms", "Home")).toBe("documents");
        expect(tabAfterKey(tabs, "dms", "End")).toBe("regulators");
    });

    it("прочие клавиши вкладку не меняют", () => {
        expect(tabAfterKey(tabs, "dms", "Enter")).toBeNull();
    });
});

describe("createLatestGate", () => {
    it("ответ старого запроса, пришедший последним, отбрасывается", () => {
        const gate = createLatestGate();
        const first = gate.begin();
        const second = gate.begin();
        expect(gate.isLatest(second)).toBe(true);
        expect(gate.isLatest(first)).toBe(false);
    });
});

describe("restorableDraft", () => {
    it("черновик восстанавливается, только если запись на сервере с тех пор не менялась", () => {
        const stored = { value: { url: "/uploads/old.pdf" }, basis: "2026-09-30T10:00:00" };
        expect(restorableDraft(stored, "2026-09-30T10:00:00")).toEqual({ url: "/uploads/old.pdf" });
        expect(restorableDraft(stored, "2026-09-30T12:00:00")).toBeNull();
    });

    it("нет черновика или старый формат без basis — null", () => {
        expect(restorableDraft(null, "")).toBeNull();
        expect(restorableDraft({ url: "x" } as unknown as { value: unknown; basis: string }, "")).toBeNull();
    });
});
