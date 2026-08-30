/** Санитайзер путей к картинкам из CMS. */

/**
 * `next/image` принимает только корневой путь («/photo.png») или абсолютный
 * http(s)-URL. На любой другой строке он бросает исключение прямо в рендере,
 * то есть одно недозаполненное поле в CMS роняет страницу целиком (500).
 * Поэтому мусор превращаем в пустую строку, а вызывающий код рисует заглушку.
 */
export function normalizeImageSrc(value: unknown): string {
    if (typeof value !== "string") return "";

    const src = value.trim();
    if (!src) return "";

    // Протокол-относительный «//host/x» next/image отвергает отдельной ошибкой.
    if (src.startsWith("//")) return "";
    if (src.startsWith("/")) return src;

    try {
        const url = new URL(src);
        // data:, ftp: и прочее не проходят remotePatterns и тоже дают ошибку.
        return url.protocol === "http:" || url.protocol === "https:" ? src : "";
    } catch {
        return "";
    }
}