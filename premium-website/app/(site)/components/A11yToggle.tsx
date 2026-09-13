"use client";

import { useEffect, useState } from "react";

const KEY = "a11y";
const CHANGE_EVENT = "a11y-change";

/**
 * Кнопок на странице может быть несколько (шапка и футер) —
 * состояние синхронизируется через кастомное событие.
 *
 * Подпись до гидрации. Режим включается inline-скриптом в <head> ещё до
 * первого пейнта (html[data-a11y]), а сервер про него не знает и всегда
 * рендерит «Версия для слабовидящих». Ленивый useState из атрибута не спасает:
 * при расхождении текста React с suppressHydrationWarning оставляет серверный
 * текст, а эффект ставит то же значение состояния и перерисовки не даёт —
 * подпись остаётся неверной, пока кнопку не нажмут (проверено в perf-v3).
 * Поэтому в разметке обе подписи, а нужную выбирает CSS по атрибуту на <html>:
 * это верно и до гидрации, и после, без расхождения с сервером. Состояние
 * стартует серверным (false) и выравнивается в эффекте — тогда aria-pressed
 * обновляется настоящей перерисовкой.
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
            <span className="a11y-label-off">Версия для слабовидящих</span>
            <span className="a11y-label-on">Обычная версия</span>
        </button>
    );
}
