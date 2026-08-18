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
    onPointerMove,
    onPointerLeave,
    "aria-busy": ariaBusy,
    ...rest
}: Props) {
    const { ref, glowProps } = useCursorGlow<HTMLButtonElement>();
    const glow = variant === "primary";

    return (
        <button
            ref={glow ? ref : undefined}
            type="button"
            className={`${styles.btn} ${styles[variant]} ${styles[size]} ${className}`}
            {...rest}
            disabled={disabled || loading}
            aria-busy={loading || ariaBusy}
            // Блик и обработчики вызывающего кода живут вместе: спред не должен
            // молча отключать эффект, ради которого кнопка primary и существует.
            onPointerMove={(e) => {
                if (glow) glowProps.onPointerMove(e);
                if (onPointerMove) onPointerMove(e);
            }}
            onPointerLeave={(e) => {
                if (glow) glowProps.onPointerLeave();
                if (onPointerLeave) onPointerLeave(e);
            }}
        >
            {glow ? <span aria-hidden="true" className={styles.glow} /> : null}
            <span className={styles.label}>
                {loading ? (busyLabel ?? children) : children}
            </span>
        </button>
    );
}
