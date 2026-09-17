import type { Metadata } from "next";
import { CLINIC } from "@/lib/constants";
import {
    DISCLOSURE_DOCS,
    DMS_PARTNERS,
    GUARANTEE_PROGRAM,
    REGULATORS,
    REQUISITES,
    omsNotice,
} from "@/lib/disclosure";
import styles from "./page.module.css";

export const metadata: Metadata = {
    title: "Раскрытие информации",
    description:
        "Реквизиты, лицензия, прейскурант, образец договора, сведения об ОМС и ДМС и контакты контролирующих органов клиники «Премиум» в Уфе.",
};

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

export default function DisclosurePage() {
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
                    <Requisite label="Полное наименование" value={REQUISITES.legalName} />
                    <Requisite label="ИНН" value={REQUISITES.inn} />
                    <Requisite label="ОГРН" value={REQUISITES.ogrn} />
                    <Requisite label="Дата регистрации" value={REQUISITES.registeredAt} />
                    <Requisite label="Юридический адрес" value={REQUISITES.legalAddress} />
                    <Requisite label="Фактический адрес" value={REQUISITES.actualAddress} />
                    <Requisite label="Телефон" value={CLINIC.phone} />
                    <Requisite label="Электронная почта" value={CLINIC.email} />
                    <Requisite
                        label="Режим работы"
                        value={`${CLINIC.hoursWeekdays}; ${CLINIC.hoursWeekend}`}
                    />
                </dl>
            </section>

            <section id="docs" className={styles.section}>
                <h2>Документы</h2>
                <p>Файлы открываются в новой вкладке.</p>
                <ul className="link-list">
                    {DISCLOSURE_DOCS.map((doc) => (
                        <li key={doc.href} className="link-item">
                            <span className={styles.docTitle}>
                                <a href={doc.href} target="_blank" rel="noreferrer">
                                    {doc.title}
                                </a>
                                {doc.note ? <span className={styles.note}>{doc.note}</span> : null}
                            </span>
                            <span>PDF</span>
                        </li>
                    ))}
                </ul>
            </section>

            <section id="oms" className={styles.section}>
                <h2>Обязательное и добровольное медицинское страхование</h2>

                <p className={styles.omsNotice}>{omsNotice(REQUISITES.legalName)}</p>

                {GUARANTEE_PROGRAM.href ? (
                    <p>
                        <a href={GUARANTEE_PROGRAM.href} target="_blank" rel="noreferrer">
                            {GUARANTEE_PROGRAM.title}
                        </a>
                    </p>
                ) : null}

                <h3>Страховые компании-партнёры по ДМС</h3>
                {DMS_PARTNERS.length > 0 ? (
                    <ul className={styles.partners}>
                        {DMS_PARTNERS.map((name) => (
                            <li key={name}>{name}</li>
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
                    {REGULATORS.map((org) => (
                        <li key={org.site} className={styles.regulator}>
                            <h3 className={styles.regulatorName}>{org.name}</h3>
                            {org.address ? <p className={styles.regulatorLine}>{org.address}</p> : null}
                            {org.phone ? (
                                <p className={styles.regulatorLine}>
                                    <a href={`tel:${org.phone.replace(/[^\d+]/g, "")}`}>{org.phone}</a>
                                </p>
                            ) : null}
                            <p className={styles.regulatorLine}>
                                <a href={org.site} target="_blank" rel="noreferrer">
                                    {org.site}
                                </a>
                            </p>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}
