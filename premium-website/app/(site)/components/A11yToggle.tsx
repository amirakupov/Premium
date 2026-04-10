"use client";

import { useEffect, useState } from "react";

const KEY = "a11y";

export default function A11yToggle({ className = "" }: { className?: string }) {
    const [on, setOn] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem(KEY) === "1";
        setOn(saved);
        document.documentElement.dataset.a11y = saved ? "1" : "0";
    }, []);

    const toggle = () => {
        const next = !on;
        setOn(next);
        localStorage.setItem(KEY, next ? "1" : "0");
        document.documentElement.dataset.a11y = next ? "1" : "0";
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