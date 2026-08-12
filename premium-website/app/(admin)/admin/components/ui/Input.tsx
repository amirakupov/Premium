"use client";

import type { InputHTMLAttributes } from "react";
import styles from "./Input.module.css";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
    id: string;
    label: string;
    /** Сообщение валидации: подсвечивает поле и озвучивается скринридером. */
    error?: string;
    hint?: string;
    required?: boolean;
};

export default function Input({
    id,
    label,
    error,
    hint,
    required,
    className = "",
    ...rest
}: Props) {
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    const describedBy = [error ? errorId : null, hint ? hintId : null]
        .filter(Boolean)
        .join(" ");

    return (
        <div className={styles.field}>
            <label className={styles.label} htmlFor={id}>
                {label}
                {required ? <span aria-hidden="true" className={styles.star}>*</span> : null}
            </label>
            <input
                id={id}
                className={`${styles.input} ${error ? styles.invalid : ""} ${className}`}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy || undefined}
                aria-required={required || undefined}
                {...rest}
            />
            {hint ? <p id={hintId} className={styles.hint}>{hint}</p> : null}
            {error ? (
                <p id={errorId} role="alert" className={styles.error}>{error}</p>
            ) : null}
        </div>
    );
}
