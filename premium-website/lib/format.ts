/** «7990» → «7 990 ₽»; нечисловые значения возвращаются как есть. */
export function formatPrice(price: number | string): string {
    const numeric = typeof price === "string" ? Number(price) : price;
    if (!Number.isFinite(numeric) || numeric <= 0) return String(price);
    return `${numeric.toLocaleString("ru-RU")} ₽`;
}

/**
 * Дата поста из CMS. Бекенд отдаёт Java LocalDateTime; Spring Boot по
 * умолчанию сериализует его ISO-строкой, но конфигурация Jackson может
 * переключить это на массив чисел. Терпим оба варианта: неверно понятая
 * дата не должна давать «Invalid Date» на странице статьи.
 */
function toDate(value: unknown): Date | null {
    if (typeof value === "string" && value.trim()) {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (Array.isArray(value) && value.length >= 3 && value.every((n) => typeof n === "number")) {
        const [year, month, day, hour = 0, minute = 0, second = 0] = value as number[];
        const parsed = new Date(year, month - 1, day, hour, minute, second);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
}

/** «2026-08-25T12:34:56» → «25 августа 2026 г.»; на мусоре — пустая строка. */
export function formatArticleDate(value: unknown): string {
    const date = toDate(value);
    if (!date) return "";
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

/** Машинная дата для атрибута datetime и JSON-LD; на мусоре — пустая строка. */
export function articleDateIso(value: unknown): string {
    const date = toDate(value);
    return date ? date.toISOString() : "";
}
