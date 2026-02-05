'use client';

import React from 'react';
import styles from './page.module.css';

export default function PrivacyPolicyPage() {
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Политика конфиденциальности</h1>
      <p className={styles.intro}>
        В клинике «Премиум» мы дорожим вашей приватностью и заботимся о защите персональных данных. 
        В этой политике описано, какие данные мы собираем, как используем и защищаем их.
      </p>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>1. Сбор и использование информации</h2>
        <ul className={styles.list}>
          <li><strong>Персональные данные:</strong> ФИО, телефон, e-mail — при записи на приём или обратном звонке.</li>
          <li><strong>Медицинская информация:</strong> данные направлений и историй болезни — только с вашего согласия.</li>
          <li><strong>Технические данные:</strong> IP-адрес, тип устройства, браузер — автоматически через сервер.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>2. Cookies и аналогичные технологии</h2>
        <ul className={styles.list}>
          <li>Наш сайт использует Cookies для корректного отображения контента и запоминания ваших предпочтений.</li>
          <li>Вы можете отключить Cookies в настройках браузера, но некоторые функции (например, карта) могут перестать работать.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>3. Виджеты и сторонние сервисы</h2>
        <ul className={styles.list}>
          <li><strong>Yandex Map:</strong> мы встраиваем карту через iframe-конструктор — никакого API-ключа не требуется, но данные об IP и браузере могут передаваться Яндексу.</li>
          <li><strong>Сторонние виджеты:</strong> аналитика, чаты и т. д. работают по своим правилам, их политика доступна на сайтах разработчиков.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>4. Передача третьим лицам</h2>
        <p className={styles.text}>
          Мы не продаём и не передаём ваши персональные данные сторонним организациям, кроме:
        </p>
        <ul className={styles.list}>
          <li>Поставщики хостинга и IT-инфраструктуры;</li>
          <li>Аналитические сервисы (Google Analytics и т. п.);</li>
          <li>Медицинские учреждения — только по вашему предварительному согласию.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>5. Безопасность данных</h2>
        <ul className={styles.list}>
          <li>Все соединения защищены через SSL/TLS (https://).</li>
          <li>Доступ к персональным данным имеют только уполномоченные сотрудники клиники.</li>
          <li>Регулярные бэкапы и мониторинг безопасности.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>6. Сроки хранения</h2>
        <p className={styles.text}>
          Мы храним ваши данные не дольше, чем это необходимо для целей, для которых они были собраны, но не более 5 лет, если иное не предусмотрено законодательством.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>7. Права пользователя</h2>
        <ul className={styles.list}>
          <li>Запрашивать доступ к своим данным и их копию;</li>
          <li>Вносить изменения или удалять данные;</li>
          <li>Отзыв своего согласия в любой момент;</li>
          <li>Подавать жалобу в орган по защите персональных данных.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>8. Изменения в политике</h2>
        <p className={styles.text}>
          Мы можем обновлять эту политику. Дату последнего изменения см. вверху страницы. После значительных правок мы оповестим вас на главной.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>9. Контакты</h2>
        <p className={styles.text}>
          Если у вас есть вопросы по обработке данных, свяжитесь с нами:
        </p>
        <p className={styles.text}>
          Электронная почта: <a href="mailto:privacy@premiumclinic.ru" className={styles.link}>privacy@premiumclinic.ru</a><br/>
          Телефон: <a href="tel:+79173695509" className={styles.link}>+7(987)369-55-09</a><br/>
          Адрес: г. Уфа, ул. Даяна Мурзина, 7/1
        </p>
      </section>
    </main>
  );
}
