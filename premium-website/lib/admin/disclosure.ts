/** Правила экрана «Раскрытие информации» в админке. Чистые функции. */

import type { ClinicRequisites, DisclosureDocument, DocumentCategory } from "@/lib/types";

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

/**
 * Для PATCH реквизитов — только то, что правили. Пустая строка на бэкенде
 * означает «очистить», поэтому отправка всей формы стёрла бы реквизиты, если
 * форма открылась пустой (загрузка не удалась) или их правил коллега.
 */
export function changedRequisites(form: ClinicRequisites, saved: ClinicRequisites): Partial<ClinicRequisites> {
    const changed: Partial<ClinicRequisites> = {};
    for (const key of Object.keys(form) as (keyof ClinicRequisites)[]) {
        if (form[key] !== saved[key]) changed[key] = form[key];
    }
    return changed;
}

/** Клавиатура по вкладкам (WAI-ARIA tabs): стрелки по кругу, Home и End. */
export function tabAfterKey<T>(tabs: readonly T[], current: T, key: string): T | null {
    const index = tabs.indexOf(current);
    if (key === "ArrowRight") return tabs[(index + 1) % tabs.length];
    if (key === "ArrowLeft") return tabs[(index - 1 + tabs.length) % tabs.length];
    if (key === "Home") return tabs[0];
    if (key === "End") return tabs[tabs.length - 1];
    return null;
}

/**
 * Два перечитывания подряд могут ответить в обратном порядке — тогда старый
 * снимок затёр бы свежий. Принимается только ответ последнего запроса.
 */
export function createLatestGate() {
    let latest = 0;
    return {
        begin: () => ++latest,
        isLatest: (id: number) => id === latest,
    };
}

export type StoredDraft<T> = { value: T; basis: string };

/**
 * Черновик помнит updatedAt записи, от которой его начали. Если запись с тех
 * пор поменяли (коллега заменил прейскурант), черновик устарел: восстановив
 * его, редактор молча вернул бы старый файл.
 */
export function restorableDraft<T>(stored: StoredDraft<T> | null, basis: string): T | null {
    if (!stored || typeof stored !== "object" || !("basis" in stored)) return null;
    return stored.basis === basis ? stored.value : null;
}
