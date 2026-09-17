import { describe, expect, it } from "vitest";
import { CONSENT_ERROR, type LeadDraft, validateLead } from "./lead";

const valid: LeadDraft = {
    name: "Иван",
    email: "ivan@example.com",
    phone: "+7 917 000-00-00",
    message: "Хочу записаться на приём",
    consent: true,
};

describe("validateLead", () => {
    it("на заполненной форме с согласием ошибок нет", () => {
        expect(validateLead(valid)).toEqual({});
    });

    it("без согласия отправка запрещена", () => {
        expect(validateLead({ ...valid, consent: false })).toEqual({
            consent: CONSENT_ERROR,
        });
    });

    it("имя из одних пробелов не считается заполненным", () => {
        expect(validateLead({ ...valid, name: "   " }).name).toBe("Укажите имя");
    });

    it("требует правдоподобный e-mail", () => {
        expect(validateLead({ ...valid, email: "ivan@" }).email).toBeDefined();
        expect(validateLead({ ...valid, email: "" }).email).toBeDefined();
    });

    it("телефон необязателен, но недописанный отвергает", () => {
        expect(validateLead({ ...valid, phone: "" }).phone).toBeUndefined();
        expect(validateLead({ ...valid, phone: "+7 917 12" }).phone).toBeDefined();
    });

    it("требует текст сообщения", () => {
        expect(validateLead({ ...valid, message: " " }).message).toBeDefined();
    });

    it("сообщает обо всех ошибках сразу, а не об одной", () => {
        const errors = validateLead({
            name: "",
            email: "",
            phone: "",
            message: "",
            consent: false,
        });
        expect(Object.keys(errors).sort()).toEqual([
            "consent",
            "email",
            "message",
            "name",
        ]);
    });
});
