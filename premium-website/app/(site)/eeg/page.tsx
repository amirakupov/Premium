import type { Metadata } from 'next';
import Image from 'next/image';
import styles from './page.module.css';
import { CLINIC } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'ЭЭГ-мониторинг в Уфе',
  description:
    'ЭЭГ-мониторинг в клинике «Премиум» в Уфе: дневной, ночной и суточный форматы. Точная диагностика эпилепсии и неврологических расстройств, заключение эпилептолога.',
};

export default function EegPage() {
  return (
    <main className={styles.container}>
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>
          <span className={styles.accent}>ЭЭГ-мониторинг</span> в клинике «Премиум»
        </h1>
        <p className={styles.heroSubtitle}>
          Точная диагностика эпилепсии и неврологических расстройств
        </p>
      </section>

      {/* Apparatus Image */}
      <section className={styles.imageSection}>
        <div className={styles.imageWrapper}>
          <Image
            src="/services/eeg.png"
            alt="Аппарат ЭЭГ-мониторинг"
            fill
            sizes="(max-width: 720px) 100vw, 680px"
            className={styles.image}
          />
        </div>
      </section>

      {/* Pricing */}
      <section className={styles.pricing}>
        <h2 className={styles.sectionTitle}>Форматы и цены</h2>
        <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Тип исследования</th>
              <th scope="col">Длительность</th>
              <th scope="col">Цена (₽)</th>
              <th scope="col">Когда назначают?</th>
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
        <h2 className={styles.sectionTitle}>Как проходит исследование</h2>
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
        <h2 className={styles.sectionTitle}>Подготовка к ЭЭГ</h2>
        <div className={styles.prepContainer}>
          <div>
            <h3 className={styles.subhead}>Перед исследованием:</h3>
            <ul className={styles.prepList}>
              <li>Не спать днём (для ночного мониторинга).</li>
              <li>Вымыть голову, не использовать косметику.</li>
              <li>Удобная одежда, сменная обувь и развлечения для детей.</li>
            </ul>
          </div>
          <div>
            <h3 className={styles.subhead}>Противопоказания:</h3>
            <ul className={styles.prepList}>
              <li>Лихорадка, ОРВИ, педикулёз, кашель.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Experts */}
      <section className={styles.experts}>
        <h2 className={styles.sectionTitle}>Наши специалисты</h2>
        <div className={styles.expertCard}>

          <div>
            <h3 className={styles.expertName}>Габдрахманова Инга Данировна</h3>
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
        <h2 className={styles.sectionTitle}>Частые вопросы</h2>
        <div className={styles.question}>
          <h3 className={styles.questionTitle}>Больно ли делать ЭЭГ?</h3>
          <p className={styles.questionAnswer}>
            Нет, это неинвазивный метод — только электроды на голове.
          </p>
        </div>
        <div className={styles.question}>
          <h3 className={styles.questionTitle}>Можно ли есть перед исследованием?</h3>
          <p className={styles.questionAnswer}>
            Да, но исключите кофе и шоколад — они влияют на результаты.
          </p>
        </div>
        <div className={styles.question}>
          <h3 className={styles.questionTitle}>Как часто нужно повторять ЭЭГ?</h3>
          <p className={styles.questionAnswer}>
            Обычно 1–2 раза в год по рекомендации врача.
          </p>
        </div>
      </section>

      <div className={styles.ctaRow}>
        <a href={CLINIC.phoneHref} className="btn btn--brass">
          Записаться на ЭЭГ
        </a>
      </div>
    </main>
  );
}