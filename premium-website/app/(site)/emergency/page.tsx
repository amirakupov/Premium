import type { Metadata } from "next";
import styles from "./page.module.css";
import { CLINIC } from "@/lib/constants";
import {
  homeUltrasoundPrices,
  homeVisitPrices,
  transportPrices,
  type EmergencyPrice,
} from "./pricesData";

export const metadata: Metadata = {
  title: "Санитарный транспорт и выезд врача на дом",
  description:
    "Санитарный транспорт в Уфе и по Башкортостану 24/7: перевозка лежачих и маломобильных пациентов, выезд врача, анализы и УЗИ на дому. Цены на все услуги.",
};

function PriceTable({ caption, rows }: { caption: string; rows: EmergencyPrice[] }) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.servicesTable}>
        <caption className={styles.tableCaption}>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Услуга</th>
            <th scope="col">Цена</th>
            <th scope="col">Тарификация</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td>{row.name}</td>
              <td>{row.price}</td>
              <td>{row.unit ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function EmergencyPage() {
  return (
    <main className={styles.container}>
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>Санитарный транспорт</h1>
        <p className={styles.heroSubtitle}>
          Профессиональная помощь 24/7 — безопасно, быстро, с медицинским
          сопровождением. Перевозка пациентов по Уфе и Республике Башкортостан.
        </p>
        <a href={CLINIC.phoneHref} className={styles.heroPhone}>
          {CLINIC.phone}
        </a>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Почему выбирают нас?</h2>
        <ul className={styles.whyList}>
          <li>
            <strong>Профессиональная команда</strong>: водители с медицинским образованием, санитары с опытом от 5 лет
          </li>
          <li>
            <strong>Полная оснащённость</strong>: автомобили с реанимационным оборудованием, носилки, кресла-каталки, аптечка
          </li>
          <li>
            <strong>Круглосуточная работа</strong>: доставка в любое время суток, включая праздники
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Наши услуги и цены</h2>
        <PriceTable caption="Санитарный транспорт" rows={transportPrices} />
        <PriceTable caption="Выезд врача и процедуры на дому" rows={homeVisitPrices} />
        <PriceTable caption="УЗИ на дому" rows={homeUltrasoundPrices} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Как мы работаем?</h2>
        <ol className={styles.workList}>
          <li>Звонок — оформление заявки по телефону</li>
          <li>Перевозка — с соблюдением всех медицинских норм</li>
          <li>Отчёт — передача пациента и документов медработникам</li>
        </ol>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Кому подойдёт наш транспорт?</h2>
        <ul className={styles.whyList}>
          <li>Послеоперационные больные — бережная доставка из стационара</li>
          <li>Пожилые люди — комфортная перевозка на обследование</li>
          <li>Пациенты с травмами — безопасная транспортировка</li>
          <li>Лежачие больные — специально оборудованные машины</li>
        </ul>
      </section>

      <a href={CLINIC.phoneHref} className={styles.callButton}>
        Вызвать санитарный транспорт
      </a>
    </main>
  );
}
