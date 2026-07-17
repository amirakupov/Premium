/** «7990» → «7 990 ₽»; нечисловые значения возвращаются как есть. */
export function formatPrice(price: number | string): string {
    const numeric = typeof price === "string" ? Number(price) : price;
    if (!Number.isFinite(numeric) || numeric <= 0) return String(price);
    return `${numeric.toLocaleString("ru-RU")} ₽`;
}
