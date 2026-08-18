"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Пока слой открыт, Tab не выпускает фокус наружу; при закрытии фокус
 * возвращается на элемент, с которого слой открыли (строку таблицы).
 */
export function useFocusTrap(open: boolean) {
    const ref = useRef<HTMLDivElement>(null);
    const restoreTo = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!open) return;

        restoreTo.current = document.activeElement as HTMLElement | null;
        const node = ref.current;
        node?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

        function onKeyDown(e: KeyboardEvent) {
            if (e.key !== "Tab" || !node) return;
            const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
            if (items.length === 0) return;
            const first = items[0];
            const last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }

        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            restoreTo.current?.focus();
        };
    }, [open]);

    return ref;
}
