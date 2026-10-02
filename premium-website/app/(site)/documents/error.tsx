"use client";

import { CLINIC } from "@/lib/constants";

/** Бэкенд недоступен, а прошлой удачной версии в кеше нет. */
export default function DisclosureError({ reset }: { error: Error; reset: () => void }) {
    return (
        <div className="page">
            <h1>Раскрытие информации</h1>
            <p role="alert">
                Сведения временно недоступны. Их можно получить по телефону{" "}
                <a href={CLINIC.phoneHref}>{CLINIC.phone}</a>.
            </p>
            <button type="button" className="btn" onClick={reset}>
                Попробовать снова
            </button>
        </div>
    );
}
