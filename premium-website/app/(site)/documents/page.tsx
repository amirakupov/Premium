"use client";

import React from "react";

export default function LegalPage() {
    const items = [
        { title: "Выписка из реестра лицензий", href: "/docs/reestr.pdf" },
        { title: "Свидетельство ИНН/КПП", href: "/docs/nalog.pdf" },
        { title: "Прайс-лист", href: "/docs/price.pdf" },
        { title: "Договор (типовой)", href: "/docs/contract.pdf" },
    ];

    return (
        <div className="page">
            <h1 style={{ margin: 0, fontSize: 28 }}>Документы</h1>
            <p style={{ marginTop: 8, color: "var(--muted)" }}>
                Официальные документы клиники (открываются в новом окне/скачивании).
            </p>

            <ul className="link-list" style={{ marginTop: 16 }}>
                {items.map((x) => (
                    <li key={x.title} className="link-item">
                        <a href={x.href} target="_blank" rel="noreferrer">
                            {x.title}
                        </a>
                        <span style={{ color: "var(--muted)" }}>Открыть</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}