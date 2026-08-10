import Image from 'next/image';
import styles from './Quote.module.css';

export default function Quote() {
  return (
    <section className={styles.container}>
      <blockquote className={styles.quote}>
        <h2 className={styles.heading}>
          Мы стоим на страже здоровья вашей нервной системы
        </h2>

        <p className={styles.quoteText}>
          Неврология — это точная наука, и мы подходим к лечению с научной строгостью.
          С первых дней наша клиника специализируется на диагностике и терапии заболеваний
          центральной и периферической нервной системы.
        </p>
        <p className={styles.quoteText}>
          За 3 года мы помогли более 10 000 пациентам избавиться от боли, головокружений,
          невритов и других неврологических симптомов — без лишних медикаментов и операций.
        </p>
        <p className={styles.quoteText}>
          Мы применяем только доказательные, щадящие и современные методы лечения.
        </p>

        <footer className={styles.signatureContainer}>
          <div className={styles.doctorImageWrapper}>
            <Image
              src="/hero/founder.jpg"
              alt="Габдрахманова Инга Данировна — основатель клиники «Премиум»"
              width={96}
              height={96}
              className={styles.doctorImage}
            />
          </div>

          <div className={styles.doctorText}>
            <p className={styles.doctorName}>Инга Данировна</p>
            <p className={styles.doctorTitle}>Невролог, основатель клиники «Премиум»</p>
          </div>
        </footer>
      </blockquote>
    </section>
  );
}