"use client";

import Link from "next/link";

/**
 * Галочка согласия под формой сбора персональных данных. Ссылка на политику
 * открывается в новой вкладке: уводить человека со страницы, когда форма уже
 * заполнена, значит потерять заполненное.
 */
export default function ConsentCheckbox({
    id = "consent",
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
    const errorId = `${id}-error`;

    return (
        <div className={className}>
            <label htmlFor={id} className="consent">
                <input
                    id={id}
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
