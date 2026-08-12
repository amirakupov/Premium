"use client";

import type { TextareaHTMLAttributes } from "react";
import styles from "./Textarea.module.css";

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & {
    id: string;
    label: string;
    error?: string;
    /** Лимит символов: показывается счётчиком и краснеет при превышении. */
    max?: number;
    value: string;
};

export default function Textarea({
    id,
    label,
    error,
    max,
    value,
    className = "",
    ...rest
}: Props) {
    const errorId = `${id}-error`;
    const countId = `${id}-count`;
    const over = max !== undefined && value.length > max;
    const describedBy = [error ? errorId : null, max !== undefined ? countId : null]
        .filter(Boolean)
        .join(" ");

    return (
        <div className={styles.field}>
            <div className={styles.head}>
                <label className={styles.label} htmlFor={id}>{label}</label>
                {max !== undefined ? (
                    <span id={countId} className={`${styles.count} ${over ? styles.over : ""}`}>
                        {value.length} / {max}
                    </span>
                ) : null}
            </div>
            <textarea
                id={id}
                value={value}
                className={`${styles.area} ${error ? styles.invalid : ""} ${className}`}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy || undefined}
                {...rest}
            />
            {error ? (
                <p id={errorId} role="alert" className={styles.error}>{error}</p>
            ) : null}
        </div>
    );
}
