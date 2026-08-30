"use client";

import { useId } from "react";
import { FiAlertTriangle } from "react-icons/fi";
import Button from "./Button";
import Portal from "./Portal";
import { useFocusTrap } from "./useFocusTrap";
import styles from "./Modal.module.css";

export default function Modal({
    open,
    title,
    description,
    confirmLabel,
    cancelLabel,
    onConfirm,
    onCancel,
}: {
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    const trapRef = useFocusTrap(open);
    const titleId = useId();
    const descId = useId();
    if (!open) return null;

    return (
        <Portal>
            <div className={styles.scrim} onClick={onCancel} aria-hidden="true" />
            <div className={styles.wrap}>
                <div
                    ref={trapRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={titleId}
                    aria-describedby={descId}
                    className={styles.modal}
                >
                    <div aria-hidden="true" className={styles.icon}>
                        <FiAlertTriangle />
                    </div>
                    <h2 id={titleId} className={styles.title}>{title}</h2>
                    <p id={descId} className={styles.description}>{description}</p>
                    <div className={styles.actions}>
                        {/* Безопасное действие первое — на нём же автофокус от ловушки. */}
                        <Button variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
                        <Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
                    </div>
                </div>
            </div>
        </Portal>
    );
}
