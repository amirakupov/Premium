/** Статус строки дата-грида: одна метка, никаких выдуманных метрик. */

import type { Doctor, Service } from "@/lib/types";

export type BadgeTone = "success" | "danger" | "brand";
export type Badge = { label: string; tone: BadgeTone };

const SENDING: Badge = { label: "Отправка", tone: "brand" };
const PUBLISHED: Badge = { label: "Опубликовано", tone: "success" };
const NO_PHOTO: Badge = { label: "Нет фото", tone: "danger" };
const NO_PRICE: Badge = { label: "Без цены", tone: "danger" };

/**
 * Цена важнее фото: услуга без цены не попадает в прайс, а без картинки
 * всё равно продаётся. Нулевая цена в CMS почти всегда означает
 * «не заполнили», поэтому она тоже подсвечивается.
 */
export function serviceBadge(s: Pick<Service, "imageSrc" | "price">, pending: boolean): Badge {
    if (pending) return SENDING;
    if (!Number.isFinite(s.price) || s.price <= 0) return NO_PRICE;
    if (!s.imageSrc) return NO_PHOTO;
    return PUBLISHED;
}

export function doctorBadge(d: Pick<Doctor, "imgSrc">, pending: boolean): Badge {
    if (pending) return SENDING;
    if (!d.imgSrc) return NO_PHOTO;
    return PUBLISHED;
}

/** Сколько строк требуют внимания — подпись под цифрой на Обзоре. */
export function countAttention<T>(rows: T[], badge: (row: T) => Badge): number {
    return rows.filter((row) => badge(row).tone === "danger").length;
}
