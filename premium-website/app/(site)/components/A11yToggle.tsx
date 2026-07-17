"use client";

import { useEffect, useState } from "react";

const KEY = "a11y";
const CHANGE_EVENT = "a11y-change";

/**
 * Кнопок на странице может быть несколько (шапка и футер) —
 * состояние синхронизируется через кастомное событие.
 */
export default function A11yToggle({ className = "" }: { className?: string }) {
    const [on, setOn] = useState(false);

    useEffect(() => {
        const sync = () => setOn(document.documentElement.dataset.a11y === "1");
        sync();
        window.addEventListener(CHANGE_EVENT, sync);
        return () => window.removeEventListener(CHANGE_EVENT, sync);
    }, []);

    const toggle = () => {
        const next = !on;
        localStorage.setItem(KEY, next ? "1" : "0");
        document.documentElement.dataset.a11y = next ? "1" : "0";
        window.dispatchEvent(new Event(CHANGE_EVENT));
    };

    return (
        <button
            type="button"
            onClick={toggle}
            aria-pressed={on}
            className={className}
        >
            {on ? "Обычная версия" : "Версия для слабовидящих"}
        </button>
    );
}
