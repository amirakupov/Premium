"use client";

import {
    type ReactNode,
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
} from "react";
import { FiX } from "react-icons/fi";
import Button from "./Button";
import styles from "./Toast.module.css";

const SUCCESS_TTL = 4200;

export type ToastInput = {
    tone: "success" | "error";
    title: string;
    /** «Повторить» для проваленного запроса — подпись задаёт вызывающий код. */
    action?: { label: string; onClick: () => void };
};

type Toast = ToastInput & { id: number };

const ToastContext = createContext<{ push: (t: ToastInput) => void } | null>(null);

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast вызван вне ToastProvider");
    return ctx;
}

export default function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const seq = useRef(0);

    const dismiss = useCallback((id: number) => {
        setToasts((list) => list.filter((t) => t.id !== id));
    }, []);

    const push = useCallback(
        (input: ToastInput) => {
            seq.current += 1;
            const id = seq.current;
            setToasts((list) => [...list, { ...input, id }]);
            // Ошибка не гаснет сама: её надо прочитать и, возможно, повторить.
            if (input.tone === "success") {
                setTimeout(() => dismiss(id), SUCCESS_TTL);
            }
        },
        [dismiss],
    );

    const value = useMemo(() => ({ push }), [push]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className={styles.stack} aria-live="polite">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`${styles.toast} ${toast.tone === "error" ? styles.error : styles.success}`}
                    >
                        <span aria-hidden="true" className={styles.dot} />
                        <p className={styles.title}>{toast.title}</p>
                        {toast.action ? (
                            <Button
                                variant="quiet"
                                size="sm"
                                // Закрываем сразу, не дожидаясь исхода повтора: иначе при
                                // успехе рядом с «Сохранено» повиснет противоречащая ошибка.
                                // Исход виден и без тоста — статус в топбаре показывает
                                // «Сохраняем…», а повторный провал присылает новый тост.
                                onClick={() => {
                                    toast.action?.onClick();
                                    dismiss(toast.id);
                                }}
                            >
                                {toast.action.label}
                            </Button>
                        ) : null}
                        <Button
                            variant="quiet"
                            size="icon"
                            aria-label="Закрыть уведомление"
                            onClick={() => dismiss(toast.id)}
                        >
                            <FiX aria-hidden="true" />
                        </Button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
