/**
 * Оптимистичные операции над коллекцией админки.
 * applyOp — редьюсер для useOptimistic, commitOp — фиксация ответа сервера.
 * Отката здесь нет: при провале транзакции useOptimistic сам возвращает
 * базовое состояние, а пользователю показывается тост с «Повторить».
 */

export type Identified = { id: number };

/** Строка, чей запрос ещё в полёте: рисуется бейджем «Отправка» и приглушённой. */
export type Pending<T> = T & { pending?: true };

export type CollectionOp<T extends Identified> =
    | { kind: "create"; tempId: number; draft: Omit<T, "id"> }
    | { kind: "update"; id: number; patch: Partial<Omit<T, "id">> };

/** Временный id отрицательный — так он никогда не столкнётся с id бэкенда. */
export function nextTempId(rows: Identified[]): number {
    const min = rows.reduce((acc, row) => Math.min(acc, row.id), 0);
    return min - 1;
}

export function applyOp<T extends Identified>(
    rows: Pending<T>[],
    op: CollectionOp<T>,
): Pending<T>[] {
    if (op.kind === "create") {
        // Новая запись встаёт первой: пользователь видит результат действия.
        const row = { ...op.draft, id: op.tempId, pending: true } as Pending<T>;
        return [row, ...rows];
    }
    return rows.map((row) =>
        row.id === op.id ? ({ ...row, ...op.patch, pending: true } as Pending<T>) : row,
    );
}

export function commitOp<T extends Identified>(
    rows: Pending<T>[],
    op: CollectionOp<T>,
    saved: T,
): Pending<T>[] {
    const target = op.kind === "create" ? op.tempId : op.id;
    const found = rows.some((row) => row.id === target);
    // Строку могли смахнуть обновлением списка — тогда просто добавляем ответ.
    if (!found) return [saved, ...rows];
    return rows.map((row) => (row.id === target ? saved : row));
}

export function isPending<T extends Identified>(row: Pending<T>): boolean {
    return row.pending === true;
}
