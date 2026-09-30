/** Валидация форм админки. Чистые функции: одна форма → карта ошибок по полям. */

import type {
    ClinicRequisites,
    DisclosureDocumentPayload,
    DmsPartner,
    DoctorPayload,
    Regulator,
    ServicePayload,
} from "@/lib/types";

export const DESCRIPTION_MAX = 160;
export const BIO_MAX = 400;

/** Слаг уходит в адрес /services/<slug> — только то, что не ломает URL. */
const SLUG_RE = /^[a-z0-9-]+$/;
/** Инлайн-правка цены: пустая строка допустима как промежуточное состояние ввода. */
const PRICE_INPUT_RE = /^\d*$/;

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export type ServiceField = "serviceName" | "slug" | "price" | "description";
export type DoctorField = "name" | "specialty" | "bio";

/** Порядок обхода полей формы — по нему выбирается, куда вести фокус. */
export const SERVICE_FIELD_ORDER: ServiceField[] = [
    "serviceName",
    "slug",
    "price",
    "description",
];
export const DOCTOR_FIELD_ORDER: DoctorField[] = ["name", "specialty", "bio"];

export function validateService(v: ServicePayload): FieldErrors<ServiceField> {
    const errors: FieldErrors<ServiceField> = {};

    if (!v.serviceName.trim()) errors.serviceName = "Укажите название услуги";

    const slug = v.slug.trim();
    if (!slug) errors.slug = "Укажите слаг";
    else if (!SLUG_RE.test(slug)) errors.slug = "Только строчные латинские буквы, цифры и дефис";

    // Ноль допустим: у клиники есть бесплатная первичная консультация.
    if (!Number.isInteger(v.price) || v.price < 0) {
        errors.price = "Цена — целое число не меньше нуля";
    }

    if (v.description.length > DESCRIPTION_MAX) {
        errors.description = `Не длиннее ${DESCRIPTION_MAX} символов`;
    }

    return errors;
}

export function validateDoctor(v: DoctorPayload): FieldErrors<DoctorField> {
    const errors: FieldErrors<DoctorField> = {};

    if (!v.name.trim()) errors.name = "Укажите полное имя";
    if (!v.specialty.trim()) errors.specialty = "Укажите специализацию";
    if (v.bio.length > BIO_MAX) errors.bio = `Не длиннее ${BIO_MAX} символов`;

    return errors;
}

/** Первое проблемное поле в порядке формы, а не в порядке ключей объекта. */
export function firstErrorField<K extends string>(
    errors: FieldErrors<K>,
    order: K[],
): K | null {
    return order.find((field) => errors[field] !== undefined) ?? null;
}

export function isPriceInput(raw: string): boolean {
    return PRICE_INPUT_RE.test(raw);
}

export const DOCUMENT_TITLE_MAX = 300;
export const DOCUMENT_NOTE_MAX = 500;

export type DocumentField = "category" | "title" | "url" | "note";
export const DOCUMENT_FIELD_ORDER: DocumentField[] = ["category", "title", "url", "note"];

export type RequisitesField = keyof ClinicRequisites;
export const REQUISITES_FIELD_ORDER: RequisitesField[] = [
    "legalName",
    "shortName",
    "inn",
    "kpp",
    "ogrn",
    "registeredAt",
    "legalAddress",
    "actualAddress",
];

const FILE_URL_RE = /^\/uploads\/[0-9A-Za-z-]+\.pdf$/;
const REGISTERED_AT_RE = /^\d{4}-\d{2}-\d{2}$/;
const CODES: [RequisitesField, RegExp, string][] = [
    ["inn", /^\d{10}$/, "ИНН — 10 цифр"],
    ["kpp", /^\d{9}$/, "КПП — 9 цифр"],
    ["ogrn", /^\d{13}$/, "ОГРН — 13 цифр"],
];

/** Те же правила, что у DisclosureValidator на бэкенде: https и есть хост. */
export function isHttpsUrl(raw: string): boolean {
    try {
        const url = new URL(raw);
        return url.protocol === "https:" && url.hostname.length > 0;
    } catch {
        return false;
    }
}

export function validateDocument(v: DisclosureDocumentPayload): FieldErrors<DocumentField> {
    const errors: FieldErrors<DocumentField> = {};
    if (!v.title.trim()) errors.title = "Укажите название документа";
    else if (v.title.length > DOCUMENT_TITLE_MAX) errors.title = `Не длиннее ${DOCUMENT_TITLE_MAX} символов`;
    if (v.note.length > DOCUMENT_NOTE_MAX) errors.note = `Не длиннее ${DOCUMENT_NOTE_MAX} символов`;

    const url = v.url.trim();
    if (v.kind === "FILE") {
        if (!url) errors.url = "Загрузите PDF";
        else if (!FILE_URL_RE.test(url)) errors.url = "Файл должен быть загружен через админку";
    } else if (!isHttpsUrl(url)) {
        errors.url = "Ссылка должна начинаться с https://";
    }
    return errors;
}

export function validateRequisites(v: ClinicRequisites): FieldErrors<RequisitesField> {
    const errors: FieldErrors<RequisitesField> = {};
    for (const [field, re, message] of CODES) {
        const value = v[field].trim();
        if (value && !re.test(value)) errors[field] = message;
    }
    const date = v.registeredAt.trim();
    if (date && !REGISTERED_AT_RE.test(date)) errors.registeredAt = "Дата в формате ГГГГ-ММ-ДД";
    return errors;
}

export type ListItemField = "name" | "site";

export function validateDmsPartner(v: Pick<DmsPartner, "name" | "site">): FieldErrors<ListItemField> {
    const errors: FieldErrors<ListItemField> = {};
    if (!v.name.trim()) errors.name = "Укажите название страховой компании";
    if (v.site.trim() && !isHttpsUrl(v.site.trim())) errors.site = "Сайт должен начинаться с https://";
    return errors;
}

export function validateRegulator(
    v: Pick<Regulator, "name" | "address" | "phone" | "site">,
): FieldErrors<ListItemField> {
    const errors: FieldErrors<ListItemField> = {};
    if (!v.name.trim()) errors.name = "Укажите название органа";
    if (v.site.trim() && !isHttpsUrl(v.site.trim())) errors.site = "Сайт должен начинаться с https://";
    return errors;
}
