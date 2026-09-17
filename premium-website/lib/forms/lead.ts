/** Черновик заявки из формы на витрине. */
export interface LeadDraft {
    name: string;
    email: string;
    phone: string;
    message: string;
    consent: boolean;
}

export type LeadErrors = Partial<Record<keyof LeadDraft, string>>;

/**
 * Согласие на обработку персональных данных обязательно: без него отправка
 * формы — обработка данных без основания (ст. 9 152-ФЗ, требование
 * Постановления № 659).
 */
export const CONSENT_ERROR =
    "Без согласия на обработку персональных данных отправить заявку нельзя";

/** Не полноценная проверка по RFC, а отсев опечаток вроде «ivan@». */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Пустой объект — форму можно отправлять. Возвращаем сразу все ошибки:
 * форма, которая показывает их по одной, заставляет отправлять вслепую.
 */
export function validateLead(draft: LeadDraft): LeadErrors {
    const errors: LeadErrors = {};

    if (!draft.name.trim()) errors.name = "Укажите имя";
    if (!EMAIL.test(draft.email.trim())) errors.email = "Укажите корректный e-mail";

    // Телефон необязателен, но если введён — это должен быть телефон целиком.
    const digits = draft.phone.replace(/\D/g, "");
    if (digits && digits.length < 10) errors.phone = "Укажите телефон полностью";

    if (!draft.message.trim()) errors.message = "Напишите сообщение";
    if (!draft.consent) errors.consent = CONSENT_ERROR;

    return errors;
}
