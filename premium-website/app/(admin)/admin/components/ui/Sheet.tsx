"use client";

import type { ReactNode } from "react";
import { FiX } from "react-icons/fi";
import Button from "./Button";
import Portal from "./Portal";
import { useFocusTrap } from "./useFocusTrap";
import styles from "./Sheet.module.css";

/**
 * Выезжающая панель справа. Список под ней остаётся на месте —
 * форма не уводит со страницы, а уходит в глубину: блюр и лёгкий отъезд
 * содержимого делает .recessed в layout.module.css. Панель обязана жить
 * в портале: иначе тот же блюр накрыл бы и её саму.
 */
export default function Sheet({
    open,
    title,
    onClose,
    footer,
    children,
}: {
    open: boolean;
    title: string;
    onClose: () => void;
    footer?: ReactNode;
    children: ReactNode;
}) {
    const trapRef = useFocusTrap(open);
    if (!open) return null;

    return (
        <Portal>
            <div className={styles.scrim} onClick={onClose} aria-hidden="true" />
            <div
                ref={trapRef}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={styles.sheet}
            >
                <header className={styles.head}>
                    <h2 className={styles.title}>{title}</h2>
                    <Button
                        variant="quiet"
                        size="icon"
                        onClick={onClose}
                        aria-label="Закрыть панель"
                    >
                        <FiX aria-hidden="true" />
                    </Button>
                </header>
                <div className={styles.body}>{children}</div>
                {footer ? <footer className={styles.foot}>{footer}</footer> : null}
            </div>
        </Portal>
    );
}
