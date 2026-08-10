import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Документы",
    description:
        "Официальные документы клиники «Премиум»: лицензии, свидетельства, прайс-лист и типовой договор.",
};

const items = [
    { title: "Выписка из реестра лицензий", href: "/docs/reestr.pdf" },
    { title: "Свидетельство ИНН/КПП", href: "/docs/nalog.pdf" },
    { title: "Прайс-лист", href: "/docs/price.pdf" },
    { title: "Договор (типовой)", href: "/docs/contract.pdf" },
];

export default function DocumentsPage() {
    return (
        <div className="page">
            <h1>Документы</h1>
            <p>
                Официальные документы клиники (открываются в новом окне/скачивании).
            </p>

            <ul className="link-list">
                {items.map((x) => (
                    <li key={x.title} className="link-item">
                        <a href={x.href} target="_blank" rel="noreferrer">
                            {x.title}
                        </a>
                        <span>Открыть</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}