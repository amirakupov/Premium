"use client";

import { useCallback, useRef } from "react";

/**
 * Блик ведёт себя как отражение: слой-градиент centered на --mx/--my,
 * которые пишутся из pointermove. Это CSS-переменные, а не стили —
 * запрет на инлайн-стили они не нарушают.
 */
export function useCursorGlow<T extends HTMLElement>() {
    const ref = useRef<T>(null);

    const onPointerMove = useCallback((e: React.PointerEvent<T>) => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${((e.clientX - rect.left) / rect.width) * 100}%`);
        el.style.setProperty("--my", `${((e.clientY - rect.top) / rect.height) * 100}%`);
    }, []);

    const onPointerLeave = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        el.style.setProperty("--mx", "50%");
        el.style.setProperty("--my", "0%");
    }, []);

    return { ref, glowProps: { onPointerMove, onPointerLeave } };
}
