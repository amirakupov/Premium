"use client";

import { FiEye } from "react-icons/fi";
import { A11Y_OPEN_EVENT } from "@/lib/a11y";

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
 */
export default function A11yTrigger({ className = "" }: { className?: string }) {
    // Базовый класс всегда на кнопке, а не только в className хозяйского
    // стиля: зазор между иконкой и подписью не должен зависеть от того,
    // передали ли className вообще (на витрине кнопка стоит и без него).
    return (
        <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(A11Y_OPEN_EVENT))}
            aria-haspopup="dialog"
            className={`a11y-trigger ${className}`.trim()}
        >
            <FiEye aria-hidden="true" />
            <span className="a11y-label-off">Версия для слабовидящих</span>
            <span className="a11y-label-on">Настройки отображения</span>
        </button>
    );
}
