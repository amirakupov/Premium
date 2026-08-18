/** Сортировка и фильтрация строк дата-грида. Чистые функции, вход не мутируется. */

export type SortDir = "asc" | "desc";
export type SortKind = "text" | "number";
export type SortState<K extends string> = { key: K; dir: SortDir };

/** Русский порядок: ё после е, регистр не главнее буквы. */
const collator = new Intl.Collator("ru", { sensitivity: "base", numeric: true });

export function sortRows<T>(rows: T[], key: keyof T, dir: SortDir, kind: SortKind): T[] {
    const sign = dir === "asc" ? 1 : -1;
    // Array.prototype.sort устойчива по спецификации — равные строки не переставляются.
    return [...rows].sort((a, b) => {
        const left = a[key];
        const right = b[key];
        const diff =
            kind === "number"
                ? Number(left) - Number(right)
                : collator.compare(String(left ?? ""), String(right ?? ""));
        return diff * sign;
    });
}

export function filterRows<T>(rows: T[], query: string, fields: (keyof T)[]): T[] {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
        fields.some((field) => String(row[field] ?? "").toLowerCase().includes(needle)),
    );
}

/** Клик по активной колонке разворачивает порядок, по новой — начинает с возрастания. */
export function toggleSort<K extends string>(current: SortState<K>, key: K): SortState<K> {
    if (current.key === key) {
        return { key, dir: current.dir === "asc" ? "desc" : "asc" };
    }
    return { key, dir: "asc" };
}

export function ariaSort(
    state: SortState<string>,
    key: string,
): "ascending" | "descending" | "none" {
    if (state.key !== key) return "none";
    return state.dir === "asc" ? "ascending" : "descending";
}
