"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import styles from "./InlineEdit.module.css";

/**
 * Клик по значению превращает его в поле. Enter и blur сохраняют,
 * Esc отменяет. validate отсекает недопустимый ввод на лету
 * (например, всё, кроме цифр, в цене).
 */
export default function InlineEdit({
    value,
    label,
    onCommit,
    validate,
    children,
}: {
    value: string;
    label: string;
    onCommit: (next: string) => void;
    validate?: (raw: string) => boolean;
    children: ReactNode;
}) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editing) inputRef.current?.select();
    }, [editing]);

    function commit() {
        setEditing(false);
        if (draft !== value) onCommit(draft);
    }

    function cancel() {
        setDraft(value);
        setEditing(false);
    }

    if (!editing) {
        return (
            <button
                type="button"
                className={styles.trigger}
                onClick={() => {
                    setDraft(value);
                    setEditing(true);
                }}
                aria-label={`${label}: изменить`}
            >
                {children}
            </button>
        );
    }

    return (
        <input
            ref={inputRef}
            className={styles.input}
            value={draft}
            aria-label={label}
            onChange={(e) => {
                const next = e.target.value;
                if (!validate || validate(next)) setDraft(next);
            }}
            onBlur={commit}
            onKeyDown={(e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    commit();
                }
                if (e.key === "Escape") {
                    // Esc здесь не должен закрывать sheet или палитру.
                    e.stopPropagation();
                    cancel();
                }
            }}
        />
    );
}
