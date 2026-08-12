"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useCursorGlow } from "./useCursorGlow";
import styles from "./Button.module.css";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "ghost" | "quiet" | "danger";
    size?: "md" | "sm" | "icon";
    /** Запрос в полёте: кнопка блокируется и показывает подпись занятости. */
    loading?: boolean;
    busyLabel?: string;
    children?: ReactNode;
};

export default function Button({
    variant = "ghost",
    size = "md",
    loading = false,
    busyLabel,
    className = "",
    children,
    disabled,
    ...rest
}: Props) {
    const { ref, glowProps } = useCursorGlow<HTMLButtonElement>();
    const glow = variant === "primary";

    return (
        <button
            ref={glow ? ref : undefined}
            type="button"
            className={`${styles.btn} ${styles[variant]} ${styles[size]} ${className}`}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            {...(glow ? glowProps : {})}
            {...rest}
        >
            {glow ? <span aria-hidden="true" className={styles.glow} /> : null}
            <span className={styles.label}>
                {loading ? (busyLabel ?? children) : children}
            </span>
        </button>
    );
}
