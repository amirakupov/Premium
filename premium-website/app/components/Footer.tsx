import React from 'react';
import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>

        {/* Верхний блок: карта + колонки */}
        <div className={styles.topArea}>

          <div className={styles.mapWrapper}>
<iframe src="https://yandex.ru/map-widget/v1/?um=constructor%3Ad327fce798422fcd5d920a9ccc441768bc8681acc45894d3adc940841067f112&amp;source=constructor" width="500" height="400" frameBorder="0"></iframe>

          </div>

          <div className={styles.columns}>
            <div className={styles.column}>
              <h4 className={styles.title}>Клиника</h4>
              <Link href="/" className={styles.link}>Главная</Link>
              <Link href="/contacts" className={styles.link}>Контакты</Link>
            </div>

            <div className={styles.column}>
              <h4 className={styles.title}>Услуги</h4>
              <Link href="/contacts" className={styles.link}>Заявка</Link>
              <Link href="/documents" className={styles.link}>Документы</Link>
            </div>

            <div className={styles.column}>
              <h4 className={styles.title}>Адрес</h4>
              <p className={styles.text}>
                г. Уфа, ул. Даяна Мурзина, 7/1<br/>
                Респ. Башкортостан, 450018
              </p>
              <p className={styles.text}>
                Пн–Сб: 9:00–19:00
              </p>
              <p className={styles.text}>
                <a href="tel:+7(987)369-55-09" className={styles.link}>+7(987)369-55-09</a>
              </p>
              <p className={styles.text}>
                <a
                  href="https://www.instagram.com/premium_ufa102/"
                  target="_blank"
                  rel="noopener"
                  className={styles.link}
                >
                  Instagram
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Нижний центрированный блок */}
        <div className={styles.bottom}>
          <p className={styles.text}>© {new Date().getFullYear()} Клиника «Премиум»</p>
        </div>
      </div>
    </footer>
  );
}

