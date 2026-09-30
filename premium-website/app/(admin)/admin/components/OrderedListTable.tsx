"use client";

import { type CSSProperties, useState } from "react";
import { FiArrowDown, FiArrowUp, FiTrash2 } from "react-icons/fi";
import { moveId } from "@/lib/admin/disclosure";
import { useDisclosureData } from "./data/DisclosureDataProvider";
import { useAdminUi } from "./shell/AdminUiProvider";
import Button from "./ui/Button";
import EmptyState from "./ui/EmptyState";
import InlineEdit from "./ui/InlineEdit";
import Input from "./ui/Input";
import Modal from "./ui/Modal";
import { TableCell, TableColumnLabel, TableHead, TableRow, TableShell } from "./ui/Table";
import styles from "./Disclosure.module.css";

export type ListColumn<T> = { key: keyof T & string; label: string; placeholder: string; width: string };

export default function OrderedListTable<T extends { id: number }>({
    title,
    rows,
    columns,
    emptyTitle,
    emptyDescription,
    validate,
    onCreate,
    onPatch,
    onDelete,
    onReorder,
    itemName,
}: {
    title: string;
    rows: T[];
    columns: ListColumn<T>[];
    emptyTitle: string;
    emptyDescription: string;
    validate: (draft: Record<string, string>) => Partial<Record<string, string>>;
    onCreate: (draft: Record<string, string>) => Promise<{ ok: boolean }>;
    onPatch: (id: number, key: string, value: string) => void;
    onDelete: (id: number) => void;
    onReorder: (ids: number[]) => void;
    itemName: (row: T) => string;
}) {
    const { busy } = useDisclosureData();
    const { setModalOpen } = useAdminUi();
    const blank = Object.fromEntries(columns.map((c) => [c.key, ""]));
    const [draft, setDraft] = useState<Record<string, string>>(blank);
    const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
    const [removing, setRemoving] = useState<T | null>(null);

    const cols = `${columns.map((c) => c.width).join(" ")} 130px`;
    const ids = rows.map((r) => r.id);

    async function add() {
        const found = validate(draft);
        setErrors(found);
        if (Object.keys(found).length > 0) return;
        const result = await onCreate(draft);
        if (result.ok) setDraft(blank);
    }

    function move(id: number, delta: -1 | 1) {
        const next = moveId(ids, id, delta);
        if (next) onReorder(next);
    }

    return (
        <>
            <TableShell title={<span>{title}</span>}>
                <TableHead cols={cols}>
                    {columns.map((c) => (
                        <TableColumnLabel key={c.key}>{c.label}</TableColumnLabel>
                    ))}
                    <TableColumnLabel>Действия</TableColumnLabel>
                </TableHead>

                {rows.length === 0 ? <EmptyState title={emptyTitle} description={emptyDescription} /> : null}

                {rows.map((row, index) => (
                    <TableRow key={row.id} cols={cols}>
                        {columns.map((c) => {
                            const value = String(row[c.key] ?? "");
                            return (
                                <TableCell key={c.key}>
                                    <InlineEdit
                                        value={value}
                                        label={`${c.label}: «${itemName(row)}»`}
                                        onCommit={(next) => onPatch(row.id, c.key, next)}
                                    >
                                        <span className={value ? styles.cellValue : styles.cellEmpty}>
                                            {value || c.placeholder}
                                        </span>
                                    </InlineEdit>
                                </TableCell>
                            );
                        })}
                        <TableCell>
                            <div className={styles.actions}>
                                <Button variant="quiet" size="icon" disabled={busy || index === 0} onClick={() => move(row.id, -1)} aria-label={`Поднять «${itemName(row)}»`}>
                                    <FiArrowUp aria-hidden="true" />
                                </Button>
                                <Button variant="quiet" size="icon" disabled={busy || index === rows.length - 1} onClick={() => move(row.id, 1)} aria-label={`Опустить «${itemName(row)}»`}>
                                    <FiArrowDown aria-hidden="true" />
                                </Button>
                                <Button
                                    variant="quiet"
                                    size="icon"
                                    disabled={busy}
                                    onClick={() => {
                                        setRemoving(row);
                                        setModalOpen(true);
                                    }}
                                    aria-label={`Удалить «${itemName(row)}»`}
                                >
                                    <FiTrash2 aria-hidden="true" />
                                </Button>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}

                <form
                    className={styles.addRow}
                    style={{ "--cols": cols } as CSSProperties}
                    onSubmit={(e) => {
                        e.preventDefault();
                        void add();
                    }}
                >
                    {columns.map((c) => (
                        <Input
                            key={c.key}
                            id={`add-${title}-${c.key}`}
                            label={c.label}
                            placeholder={c.placeholder}
                            value={draft[c.key]}
                            error={errors[c.key]}
                            onChange={(e) => setDraft((d) => ({ ...d, [c.key]: e.target.value }))}
                        />
                    ))}
                    <Button type="submit" variant="primary" size="sm" loading={busy} busyLabel="Добавляем…">
                        Добавить
                    </Button>
                </form>
            </TableShell>

            <Modal
                open={removing !== null}
                title="Удалить запись?"
                description={`«${removing ? itemName(removing) : ""}» пропадёт со страницы раскрытия информации.`}
                cancelLabel="Оставить"
                confirmLabel="Удалить"
                onCancel={() => {
                    setRemoving(null);
                    setModalOpen(false);
                }}
                onConfirm={() => {
                    if (removing) onDelete(removing.id);
                    setRemoving(null);
                    setModalOpen(false);
                }}
            />
        </>
    );
}
