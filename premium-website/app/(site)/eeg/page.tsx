// app/eeg/page.tsx
'use client';

import React from 'react';
import Image from 'next/image';
import styles from './page.module.css';

export default function EegPage() {
  return (
    <main className={styles.container}>
      {/* Hero */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>
          <span className={styles.accent}>ЭЭГ-мониторинг</span> в клинике Premium
        </h1>
        <h2 className={styles.heroSubtitle}>
          Точная диагностика эпилепсии и неврологических расстройств
        </h2>
      </section>

      {/* Apparatus Image */}
      <section className={styles.imageSection}>
        <div className={styles.imageWrapper}>
          <Image
            src="/services/eeg.png"
            alt="Аппарат ЭЭГ-мониторинг"
            fill
            style={{ objectFit: 'cover' }}
          />
        </div>
      </section>

      {/* Pricing */}
      <section className={styles.pricing}>
        <h3 className={styles.sectionTitle}>Форматы и цены</h3>
        <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Тип исследования</th>
              <th>Длительность</th>
              <th>Цена (₽)</th>
              <th>Когда назначают?</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Дневной</td>
              <td>10 мин – 5 ч</td>
              <td>1 200 – 7 000</td>
              <td>Первичная диагностика, контроль терапии</td>
            </tr>
            <tr>
              <td>Ночной</td>
              <td>10 ч</td>
              <td>11 500</td>
              <td>Подозрение на приступы и другие нарушения</td>
            </tr>
            <tr>
              <td>Суточный</td>
              <td>24 ч</td>
              <td>20 000</td>
              <td>Сложные случаи, неясная форма эпилепсии</td>
            </tr>
          </tbody>
        </table>
        </div>
        <p className={styles.note}>Запись результатов на CD/DVD — бесплатно.</p>
      </section>

      {/* Process */}
      <section className={styles.process}>
        <h3 className={styles.sectionTitle}>Как проходит исследование</h3>
        <ol className={styles.processList}>
          <li>
            <strong>Подготовка (15–30 мин):</strong> наложение электродов, провокационные пробы.
          </li>
          <li>
            <strong>Основная часть:</strong> отдых или сон в комфортной палате.
          </li>
          <li>
            <strong>Результаты:</strong> заключение врача-эпилептолога через 1–2 дня.
          </li>
        </ol>
      </section>

      {/* Preparation */}
      <section className={styles.preparation}>
        <h3 className={styles.sectionTitle}>Подготовка к ЭЭГ</h3>
        <div className={styles.prepContainer}>
          <div>
            <h4>Перед исследованием:</h4>
            <ul className={styles.prepList}>
              <li>Не спать днём (для ночного мониторинга).</li>
              <li>Вымыть голову, не использовать косметику.</li>
              <li>Удобная одежда, сменная обувь и развлечения для детей.</li>
            </ul>
          </div>
          <div>
            <h4>Противопоказания:</h4>
            <ul className={styles.prepList}>
              <li>Лихорадка, ОРВИ, педикулёз, кашель.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Experts */}
      <section className={styles.experts}>
        <h3 className={styles.sectionTitle}>Наши специалисты</h3>
        <div className={styles.expertCard}>
          
          <div>
            <h4 className={styles.expertName}>Габдрахманова Инга Данировна</h4>
            <p className={styles.expertRole}>Эпилептолог, невролог, кандидат наук</p>
            <blockquote className={styles.expertQuote}>
              «ЭЭГ — это окно в работу мозга. Мы поможем расшифровать его язык.»
            </blockquote>
            <ul className={styles.featureList}>
              <li>Диагностика и лечение эпилепсии у взрослых и детей.</li>
              <li>Подбор терапии на основе данных ЭЭГ.</li>
              <li>Комплексная реабилитация после приступов.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className={styles.faq}>
        <h3 className={styles.sectionTitle}>Частые вопросы</h3>
        <div className={styles.question}>
          <h4 className={styles.questionTitle}>Больно ли делать ЭЭГ?</h4>
          <p className={styles.questionAnswer}>
            Нет, это неинвазивный метод — только электроды на голове.
          </p>
        </div>
        <div className={styles.question}>
          <h4 className={styles.questionTitle}>Можно ли есть перед исследованием?</h4>
          <p className={styles.questionAnswer}>
            Да, но исключите кофе и шоколад — они влияют на результаты.
          </p>
        </div>
        <div className={styles.question}>
          <h4 className={styles.questionTitle}>Как часто нужно повторять ЭЭГ?</h4>
          <p className={styles.questionAnswer}>
            Обычно 1–2 раза в год по рекомендации врача.
          </p>
        </div>
      </section>
      
        <a href="tel:+7(917)369-55-09" className={styles.ctaButton}>
          Записаться на ЭЭГ
        </a>
    </main>
  );
}
