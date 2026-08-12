/** Черновики форм админки: набранное не теряется при закрытии панели. */

export type DraftScope = "service" | "doctor";
export type DraftId = number | "new";

export interface DraftStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

/** На сервере localStorage нет — тогда все операции становятся пустыми. */
export function defaultStorage(): DraftStorage | null {
    return typeof localStorage === "undefined" ? null : localStorage;
}

export function draftKey(scope: DraftScope, id: DraftId): string {
    return `admin:draft:${scope}:${id}`;
}

export function saveDraft<T>(
    scope: DraftScope,
    id: DraftId,
    value: T,
    storage: DraftStorage | null = defaultStorage(),
): void {
    if (!storage) return;
    try {
        storage.setItem(draftKey(scope, id), JSON.stringify(value));
    } catch {
        // квота или приватный режим — черновик не критичен, молчим
    }
}

export function loadDraft<T>(
    scope: DraftScope,
    id: DraftId,
    storage: DraftStorage | null = defaultStorage(),
): T | null {
    if (!storage) return null;
    const raw = storage.getItem(draftKey(scope, id));
    if (raw === null) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        // битый черновик игнорируем, а не роняем форму
        return null;
    }
}

export function clearDraft(
    scope: DraftScope,
    id: DraftId,
    storage: DraftStorage | null = defaultStorage(),
): void {
    storage?.removeItem(draftKey(scope, id));
}

/** Формы плоские (строки и числа) — поверхностного сравнения достаточно. */
export function isDirty<T extends object>(a: T, b: T): boolean {
    const keys = Object.keys(a) as (keyof T)[];
    if (keys.length !== Object.keys(b).length) return true;
    return keys.some((key) => a[key] !== b[key]);
}
