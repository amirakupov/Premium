"use client";

import type { CSSProperties, ReactNode } from "react";
import { type SortState, ariaSort } from "@/lib/admin/sort";
import type { Badge } from "@/lib/admin/badges";
import styles from "./Table.module.css";

/** Стеклянный контейнер списка. backdrop-filter живёт только здесь. */
export function TableShell({
    title,
    actions,
    children,
}: {
    title: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className={styles.shell}>
            <header className={styles.shellHead}>
                <div className={styles.shellTitle}>{title}</div>
                {actions ? <div className={styles.shellActions}>{actions}</div> : null}
            </header>
            <div className={styles.body} role="table">{children}</div>
        </section>
    );
}

export function TableHead({ cols, children }: { cols: string; children: ReactNode }) {
    return (
        <div
            role="row"
            className={styles.head}
            style={{ "--cols": cols } as CSSProperties}
        >
            {children}
        </div>
    );
}

export function TableHeadCell({
    sortKey,
    state,
    onSort,
    children,
}: {
    sortKey: string;
    state: SortState<string>;
    onSort: (key: string) => void;
    children: ReactNode;
}) {
    const active = state.key === sortKey;
    return (
        <div role="columnheader" aria-sort={ariaSort(state, sortKey)}>
            <button
                type="button"
                className={`${styles.headButton} ${active ? styles.headActive : ""}`}
                onClick={() => onSort(sortKey)}
            >
                {children}
                <span aria-hidden="true" className={styles.arrow}>
                    {active ? (state.dir === "asc" ? "↑" : "↓") : ""}
                </span>
            </button>
        </div>
    );
}

/** Строка держится на --surface: blur на сотне строк убивает скролл. */
export function TableRow({
    cols,
    muted = false,
    children,
}: {
    cols: string;
    muted?: boolean;
    children: ReactNode;
}) {
    return (
        <div
            role="row"
            className={`${styles.row} ${muted ? styles.rowMuted : ""}`}
            style={{ "--cols": cols } as CSSProperties}
        >
            {children}
        </div>
    );
}

export function TableCell({ children }: { children: ReactNode }) {
    return <div role="cell" className={styles.cell}>{children}</div>;
}

export function StatusBadge({ badge }: { badge: Badge }) {
    return <span className={`${styles.badge} ${styles[badge.tone]}`}>{badge.label}</span>;
}

/* ── Хром шапки контейнера. Общий для всех списков, поэтому живёт здесь,
      а не дублируется в модуле каждой таблицы. ─────────────────────── */

export function TableCounter({ shown, total }: { shown: number; total: number }) {
    return <span className={styles.counter}>{shown} из {total}</span>;
}

export function TableChip({ children }: { children: ReactNode }) {
    return <span className={styles.chip}>{children}</span>;
}

/** Заголовок несортируемой колонки: выглядит как остальные, но не кликается. */
export function TableColumnLabel({ children }: { children: ReactNode }) {
    return (
        <div role="columnheader" className={styles.columnLabel}>
            {children}
        </div>
    );
}
