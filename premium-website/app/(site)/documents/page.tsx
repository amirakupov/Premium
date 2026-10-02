import type { Metadata } from "next";
import { CLINIC } from "@/lib/constants";
import { getDisclosure } from "@/lib/cms";
import { formatRuDate, groupDocuments, guaranteeProgram, omsNotice } from "@/lib/disclosure";
import type { DisclosureDocument } from "@/lib/types";
import styles from "./page.module.css";

export const metadata: Metadata = {
    title: "Раскрытие информации",
    description:
        "Реквизиты, лицензия, прейскурант, образец договора, сведения об ОМС и ДМС и контакты контролирующих органов клиники «Премиум» в Уфе.",
};

/**
 * Рендер на запрос, данные — из кеша с тегом (lib/cms.ts). Так страница не
 * ходит на бэкенд при сборке образа, а правка в админке видна при следующем
 * заходе: admin actions сбрасывают тег. revalidate = 0 не трогает fetch с
 * явным положительным revalidate — он остаётся в data cache.
 */
export const revalidate = 0;

/** Строка реквизита печатается, только если значение заполнено. */
function Requisite({ label, value }: { label: string; value: string }) {
    if (!value.trim()) return null;
    return (
        <div className={styles.requisite}>
            <dt className={styles.requisiteLabel}>{label}</dt>
            <dd className={styles.requisiteValue}>{value}</dd>
        </div>
    );
}

function DocumentLink({ doc }: { doc: DisclosureDocument }) {
    const kind = doc.kind === "FILE" ? "PDF" : "Внешний сайт";
    const updated = formatRuDate(doc.updatedAt);
    return (
        <li className="link-item">
            <div className={styles.docTitle}>
                <a href={doc.url} target="_blank" rel="noreferrer">
                    {doc.title} ({kind})
                </a>
                {doc.note ? <div className={styles.note}>{doc.note}</div> : null}
                {updated ? <div className={styles.note}>Обновлено {updated}</div> : null}
            </div>
            <span aria-hidden="true">{kind}</span>
        </li>
    );
}

export default async function DisclosurePage() {
    const { requisites, documents, dmsPartners, regulators } = await getDisclosure();
    const groups = groupDocuments(documents);
    const program = guaranteeProgram(documents);

    return (
        <div className="page">
            <h1>Раскрытие информации</h1>
            <p className={styles.lead}>
                Сведения, которые медицинская организация обязана публиковать в
                соответствии с Постановлением Правительства РФ № 659.
            </p>

            <nav className={styles.toc} aria-label="Разделы страницы">
                <a href="#requisites">Реквизиты</a>
                <a href="#docs">Документы</a>
                <a href="#oms">ОМС и ДМС</a>
                <a href="#regulators">Контролирующие органы</a>
            </nav>

            <section id="requisites" className={styles.section}>
                <h2>Реквизиты организации</h2>
                <dl className={styles.requisites}>
                    <Requisite label="Полное наименование" value={requisites.legalName} />
                    <Requisite label="Сокращённое наименование" value={requisites.shortName} />
                    <Requisite label="ИНН" value={requisites.inn} />
                    <Requisite label="КПП" value={requisites.kpp} />
                    <Requisite label="ОГРН" value={requisites.ogrn} />
                    <Requisite label="Дата регистрации" value={formatRuDate(requisites.registeredAt)} />
                    <Requisite label="Юридический адрес" value={requisites.legalAddress} />
                    <Requisite label="Фактический адрес" value={requisites.actualAddress} />
                    <Requisite label="Телефон" value={CLINIC.phone} />
                    <Requisite label="Электронная почта" value={CLINIC.email} />
                    <Requisite label="Режим работы" value={`${CLINIC.hoursWeekdays}; ${CLINIC.hoursWeekend}`} />
                </dl>
            </section>

            <section id="docs" className={styles.section}>
                <h2>Документы</h2>
                <p>Файлы открываются в новой вкладке.</p>
                {groups.map((group) => (
                    <div key={group.category}>
                        {groups.length > 1 ? <h3>{group.label}</h3> : null}
                        <ul className="link-list">
                            {group.documents.map((doc) => (
                                <DocumentLink key={doc.id} doc={doc} />
                            ))}
                        </ul>
                    </div>
                ))}
            </section>

            <section id="oms" className={styles.section}>
                <h2>Обязательное и добровольное медицинское страхование</h2>

                <p className={styles.omsNotice}>{omsNotice(requisites.shortName)}</p>

                {program ? (
                    <p>
                        <a href={program.url} target="_blank" rel="noreferrer">
                            {program.title}
                        </a>
                    </p>
                ) : null}

                <h3>Страховые компании-партнёры по ДМС</h3>
                {dmsPartners.length > 0 ? (
                    <ul className={styles.partners}>
                        {dmsPartners.map((partner) => (
                            <li key={partner.id}>
                                {partner.site ? (
                                    <a href={partner.site} target="_blank" rel="noreferrer">{partner.name}</a>
                                ) : (
                                    partner.name
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>
                        Список партнёров уточняйте по телефону{" "}
                        <a href={CLINIC.phoneHref}>{CLINIC.phone}</a>.
                    </p>
                )}
            </section>

            <section id="regulators" className={styles.section}>
                <h2>Контролирующие органы</h2>
                <ul className={styles.regulators}>
                    {regulators.map((org) => (
                        <li key={org.id} className={styles.regulator}>
                            <h3 className={styles.regulatorName}>{org.name}</h3>
                            {org.address ? <p className={styles.regulatorLine}>{org.address}</p> : null}
                            {org.phone ? (
                                <p className={styles.regulatorLine}>
                                    <a href={`tel:${org.phone.replace(/[^\d+]/g, "")}`}>{org.phone}</a>
                                </p>
                            ) : null}
                            {org.site ? (
                                <p className={styles.regulatorLine}>
                                    <a href={org.site} target="_blank" rel="noreferrer">{org.site}</a>
                                </p>
                            ) : null}
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}
