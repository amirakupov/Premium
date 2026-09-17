"use client";

import { useEffect, useState } from "react";
import { FiEye } from "react-icons/fi";
import { A11Y_OPEN_EVENT, A11Y_STATE_EVENT } from "@/lib/a11y";

/**
 * Кнопок на сайте три (витрина, футер, топбар админки), панель одна: кнопка
 * только просит её открыть событием.
 *
 * Подпись выбирает CSS, а не состояние. Режим включается inline-скриптом в
 * <head> ещё до первого пейнта (html[data-a11y]), а сервер про него не знает и
 * всегда рендерит «Версия для слабовидящих». Ленивый useState из атрибута не
 * спасает: при расхождении текста React с suppressHydrationWarning оставляет
 * серверный текст, а эффект ставит то же значение состояния и перерисовки не
 * даёт — подпись остаётся неверной, пока кнопку не нажмут (проверено в
 * perf-v3). Поэтому в разметке обе подписи, а нужную показывает правило по
 * атрибуту на <html> (globals.css, .a11y-label-on/.a11y-label-off).
 *
 * aria-expanded, в отличие от подписи, — состояние, а не CSS: панель либо
 * есть в DOM, либо нет, скринридеру нужен именно факт. Панель одна на три
 * кнопки, поэтому состояние приходит событием A11Y_STATE_EVENT, а не пропом:
 * до открытия панели ни разу ещё не смонтированной и до первого события
 * aria-expanded="false" — то же самое, что и в реальности (панель закрыта).
 */
export default function A11yTrigger({ className = "" }: { className?: string }) {
    const [panelOpen, setPanelOpen] = useState(false);

    useEffect(() => {
        const onState = (e: Event) => {
            setPanelOpen(Boolean((e as CustomEvent<boolean>).detail));
        };
        window.addEventListener(A11Y_STATE_EVENT, onState);
        return () => window.removeEventListener(A11Y_STATE_EVENT, onState);
    }, []);

    // Базовый класс всегда на кнопке, а не только в className хозяйского
    // стиля: зазор между иконкой и подписью не должен зависеть от того,
    // передали ли className вообще (на витрине кнопка стоит и без него).
    return (
        <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(A11Y_OPEN_EVENT))}
            aria-haspopup="dialog"
            aria-expanded={panelOpen}
            className={`a11y-trigger ${className}`.trim()}
        >
            <FiEye aria-hidden="true" />
            <span className="a11y-label-off">Версия для слабовидящих</span>
            <span className="a11y-label-on">Настройки отображения</span>
        </button>
    );
}
