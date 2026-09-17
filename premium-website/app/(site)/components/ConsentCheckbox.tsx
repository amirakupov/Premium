"use client";

import { useId } from "react";
import Link from "next/link";

/**
 * Галочка согласия под формой сбора персональных данных. Ссылка на политику
 * открывается в новой вкладке: уводить человека со страницы, когда форма уже
 * заполнена, значит потерять заполненное.
 */
export default function ConsentCheckbox({
    id,
    checked,
    onChange,
    error,
    className = "",
}: {
    id?: string;
    checked: boolean;
    onChange: (next: boolean) => void;
    error?: string;
    className?: string;
}) {
    // useId(), а не литерал "consent" по умолчанию: на одной странице скоро
    // будут формы отзыва и обращений, и два экземпляра с одинаковым id
    // сломали бы связку label/aria-describedby. Проп остаётся — для явного
    // переопределения, если оно понадобится.
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const errorId = `${fieldId}-error`;

    return (
        <div className={className}>
            <label htmlFor={fieldId} className="consent">
                <input
                    id={fieldId}
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                />
                <span>
                    Я даю согласие на обработку персональных данных и принимаю{" "}
                    <Link href="/privacy" target="_blank" rel="noreferrer">
                        Политику обработки персональных данных
                    </Link>
                </span>
            </label>
            {error ? (
                <p id={errorId} role="alert" className="consent-error">
                    {error}
                </p>
            ) : null}
        </div>
    );
}
