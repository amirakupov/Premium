/** Валидация форм админки. Чистые функции: одна форма → карта ошибок по полям. */

import type { DoctorPayload, ServicePayload } from "@/lib/types";

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
