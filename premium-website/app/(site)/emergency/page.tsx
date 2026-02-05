'use client';

import React from 'react';
import Image from 'next/image';
import styles from './page.module.css';

export default function TransportPage() {
  return (
    <main className={styles.container}>
      {/* Desktop frame */}
      <div className={styles.frameDesktop}>
        <Image
          src="/infoblock/Emergency-3.svg"
          alt="Transport Frame"
          fill
          style={{ objectFit: 'contain' }}
        />
      </div>

      {/* Mobile frame */}
      <div className={styles.frameMobile}>
        <Image
          src="/mobile/emergency2.svg"
          alt="Transport Frame Mobile"
          fill
          style={{ objectFit: 'contain' }}
        />
      </div>
      <p className={styles.subtitle}>
        Безопасная перевозка пациентов в Уфе по Республики Башкортостан
      </p>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Почему выбирают нас?</h2>
        <ul className={styles.whyList}>
          <li>
            <strong>Профессиональная команда</strong>: водители с медицинским образованием, санитары с опытом от 5 лет
          </li>
          <li>
            <strong>Полная оснащенность</strong>: автомобили с реанимационным оборудованием, носилки, кресла-каталки, аптечка
          </li>
          <li>
            <strong>Круглосуточная работа</strong>: доставка в любое время суток, включая праздники
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Наши услуги и цены</h2>
        <table className={styles.servicesTable}>
          <thead>
            <tr>
              <th>Услуга</th>
              <th>Цена, ₽</th>
              <th>Тарификация</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Доставка из больницы домой</td>
              <td>2200</td>
              <td></td>
            </tr>
            <tr>
              <td>Перевозка на обследование</td>
              <td>3000</td>
              <td>час</td>
            </tr>
            <tr>
              <td>Перевозка по Уфе в одном направлении</td>
              <td>2200</td>
              <td></td>
            </tr>
            <tr>
              <td>Трансфер в аэропорт Уфы</td>
              <td>2800</td>
              <td></td>
            </tr>
            <tr>
              <td>По Республике Башкортостан</td>
              <td>55р</td>
              <td>км</td>
            </tr>
            <tr>
              <td>Спуск/подъём (до 90 кг)</td>
              <td>200</td>
              <td>этаж</td>
            </tr>
            <tr>
              <td>Спуск/подъём (более 90 кг)</td>
              <td>350</td>
              <td>этаж</td>
            </tr>
            <tr>
              <td>Доп. ожидание (30 мин)</td>
              <td>от 400</td>
              <td></td>
            </tr>
            <tr>
              <td>Выезд санитаров (спуск/подъём)</td>
              <td>1800</td>
              <td></td>
            </tr>
            <tr>
              <td>Аренда санитарного автомобиля</td>
              <td>3300</td>
              <td>час</td>
            </tr>
            <tr>
              <td>Трансфер в ж/д вокзал</td>
              <td>2800</td>
              <td></td>
            </tr>
            <tr>
              <td>Анализы на дому</td>
              <td>500р</td>
              <td>км</td>
            </tr>
            <tr>
              <td>ЭКГ на дому</td>
              <td>500р</td>
              <td>км</td>
            </tr>
            <tr>
              <td>Сопровождение мероприятий</td>
              <td>2000</td>
              <td>час</td>
            </tr>
            <tr>
              <td>Сопровождение выездных мероприятий</td>
              <td>2000</td>
              <td>час</td>
            </tr>
            <tr>
              <td>Выезд медсестры на дом</td>
              <td>500р</td>
              <td>км</td>
            </tr>
            <tr>
              <td>Транспортировка лежачих больных</td>
              <td>3500</td>
              <td>час</td>
            </tr>
            <tr>
              <td>Транспортировка маломобильных больных</td>
              <td>3000</td>
              <td>час</td>
            </tr>
            <tr>
              <td>Выезд и прием врача невролога до 5 км</td>
              <td>4000</td>
              <td></td>
            </tr>
            <tr>
              <td>Выезд и прием врача невролога до 10 км</td>
              <td>6000</td>
              <td></td>
            </tr>
            <tr>
              <td>Выезд и прием врача невролога до 15 км</td>
              <td>7000</td>
              <td></td>
            </tr>
            <tr>
              <td>Выезд и прием врача невролога до 20 км</td>
              <td>8000</td>
              <td></td>
            </tr>
            <tr>
              <td>Выезд и прием врача невролога до 25 км</td>
              <td>9000</td>
              <td></td>
            </tr>
            <tr>
              <td>Выезд и прием врача невролога до 30 км</td>
              <td>10000</td>
              <td></td>
            </tr>
            <tr>
              <td>Выезд и прием врача невролога до 35 км</td>
              <td>11000</td>
              <td></td>
            </tr>
            <tr>
              <td>Выезд и прием врача невролога до 40 км</td>
              <td>12000</td>
              <td></td>
            </tr>
            <tr>
              <td>Выезд и прием врача невролога до 45 км</td>
              <td>13000</td>
              <td></td>
            </tr>
            <tr>
              <td>Выезд и прием врача терапевта до 50 км</td>
              <td>13000</td>
              <td></td>
            </tr>

            <tr>
              <td>Выезд и прием врача невролога до 5 км</td>
              <td>4000</td>
              <td></td>
            </tr>
            <tr>
            <td>Ультразвуковое исследование органов брюшной полости (ОБП: печень, желчный пузырь, поджелудочная железа, селезёнка), Выезд</td>
            <td>500</td>
            <td>1 км</td>
          </tr>
          <tr>
            <td>Ультразвуковое исследование органов брюшной полости и мочевыделительной системы (почки, мочевой пузырь), Выезд</td>
            <td>500</td>
            <td>1 км</td>
          </tr>
          <tr>
            <td>Ультразвуковое исследование мочевыделительной системы (почки, надпочечники, мочевой пузырь), Выезд</td>
            <td>500</td>
            <td>1 км</td>
          </tr>
          <tr>
            <td>Ультразвуковое исследование мочевого пузыря, Выезд</td>
            <td>500</td>
            <td>1 км</td>
          </tr>
          <tr>
            <td>Ультразвуковое исследование поверхностных структур (мягкие ткани, лимфатические узлы, одна анатомическая область), Выезд</td>
            <td>500</td>
            <td>1 км</td>
          </tr>
          <tr>
            <td>Ультразвуковое исследование щитовидной железы с региональными лимфоузлами, Выезд</td>
            <td>500</td>
            <td>1 км</td>
          </tr>
          <tr>
            <td>Ультразвуковое исследование молочных желез с региональными лимфоузлами, Выезд</td>
            <td>500</td>
            <td>1 км</td>
          </tr>
          <tr>
            <td>Ультразвуковое исследование суставов (отдельно каждый, второй сустав сравнивается только с проблемной зоной), Выезд</td>
            <td>500</td>
            <td>1 км</td>
          </tr>
          <tr>
            <td>Вызов медсестры на дом</td>
            <td>500</td>
            <td>1 км</td>
          </tr>

          </tbody>
        </table>
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
      <a href="tel:+7(917)369-55-09" className={styles.callButton}>
        Вызвать Санитарный Транспорт
      </a>
    </main>
  );
}


