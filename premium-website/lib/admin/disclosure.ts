/** Правила экрана «Раскрытие информации» в админке. Чистые функции. */

import type { DisclosureDocument, DocumentCategory } from "@/lib/types";

/** Без документа этих категорий раздел не соответствует Постановлению № 659. */
export const REQUIRED_CATEGORIES: DocumentCategory[] = [
    "CONTRACT",
    "PRICE_LIST",
    "LICENSE",
    "REGULATION",
    "GUARANTEE_PROGRAM",
];

export function missingRequiredCategories(documents: DisclosureDocument[]): DocumentCategory[] {
    const present = new Set(documents.filter((d) => d.doctorId === null).map((d) => d.category));
    return REQUIRED_CATEGORIES.filter((category) => !present.has(category));
}

/** Новый порядок после сдвига строки; null — двигать некуда, запрос не нужен. */
export function moveId(ids: number[], id: number, delta: -1 | 1): number[] | null {
    const from = ids.indexOf(id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= ids.length) return null;
    const next = [...ids];
    [next[from], next[to]] = [next[to], next[from]];
    return next;
}

const INVALID_PREFIX = "Invalid input: ";

/**
 * Текст ответа бэкенда → фраза для тоста или поля. Сообщения 400 и 404
 * бэкенд раздела пишет по-русски для редактора; 401/403/5xx приходят
 * по-английски из GlobalExceptionHandler и заменяются.
 */
export function backendErrorMessage(status: number, text: string): string {
    if (status === 401) return "Сессия истекла — войдите заново";
    if (status === 403) return "Недостаточно прав для этого действия";
    if (status >= 500) return "Ошибка сервера — попробуйте позже";
    const message = text.startsWith(INVALID_PREFIX) ? text.slice(INVALID_PREFIX.length) : text;
    return message.trim() || "Запрос отклонён сервером";
}

export const PDF_MAX_BYTES = 30 * 1024 * 1024;

/**
 * Проверка до отправки — чтобы не гнать 30 МБ ради отказа. Окончательно
 * решает бэкенд по сигнатуре файла; MIME в браузере бывает пустым, поэтому
 * достаточно расширения.
 */
export function checkPdfFile(file: { name: string; type: string; size: number }): string | null {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) return "Подойдёт только PDF";
    if (file.size === 0) return "Файл пустой";
    if (file.size > PDF_MAX_BYTES) return "Файл больше 30 МБ";
    return null;
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} МБ`;
}
