import React from 'react';
import styles from './Footer.module.css';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
      <div className={styles.mapWrapper}>
          <iframe
            src="https://yandex.ru/map-widget/v1/?um=constructor%3A5ff40ac253ae2979a1b81d15e6cd49c5b7d6c190e4021e5566827d64d79f59e4&amp;source=constructor"
            width="80%"
            height="300"
            frameBorder="0"
            title="Clinic location on Yandex Map"
            className={styles.map}
            loading="lazy"
          ></iframe>
        </div>
        <div className={styles.columns}>
          <div className={styles.column}>
            <h4 className={styles.title}>Клиника</h4>
            <Link href="/about" className={styles.link}>О нас</Link>
            <Link href="/contacts" className={styles.link}>Контакты</Link>
            <Link href="/map" className={styles.link}>Карта</Link>
          </div>
          <div className={styles.column}>
            <h4 className={styles.title}>Услуги</h4>
            <Link href="/form" className={styles.link}>Отправить МРТ</Link>
            <Link href="/request" className={styles.link}>Заявка</Link>
            <Link href="/documents" className={styles.link}>Документы</Link>
          </div>
          <div className={styles.column}>
            <h4 className={styles.title}>Адрес</h4>
            <p className={styles.text}>г. Уфа, ул. Попкина, 12</p>
            <p className={styles.text}>Пн–Сб: 9:00–19:00</p>
            <p className={styles.text}>8(999) 999-999</p>
            <p className={styles.text}>инстаграм</p>
          </div>
        </div>


        <p className={styles.text}>made by kukei</p>
      </div>
    </footer>
  );
}
