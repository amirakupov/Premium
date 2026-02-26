'use client';

import React from 'react';
import Image from 'next/image';
import styles from './Quote.module.css';

export default function Quote() {
  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>
        МЫ СТОИМ НА СТРАЖЕ ЗДОРОВЬЯ ВАШЕЙ НЕРВНОЙ СИСТЕМЫ
      </h2>

      <p className={styles.quoteText}>
        Неврология — это точная наука, и мы подходим к лечению с научной строгостью. 
        С первых дней наша клиника специализируется на диагностике и терапии заболеваний центральной и периферической нервной системы.
      </p>
      <p className={styles.quoteText}>
        За 3 года мы помогли более 10 000 пациентам избавиться от боли, головокружений, 
        невритов и других неврологических симптомов — без лишних медикаментов и операций.
      </p>
      <p className={styles.quoteText}>
        Мы применяем только доказательные, щадящие и современные методы лечения.
      </p>

      <div className={styles.signatureContainer}>
        {/* Блок для портрета (круглый) */}
        <div className={styles.doctorImageWrapper}>
          <Image
            src="/quote/portrait.jpg"
            alt="Иллюстрация доктора"
            width={80}
            height={80}
            className={styles.doctorImage}
          />
        </div>

        {/* Блок текста (имя + должность) */}
        <div className={styles.doctorText}>
          <p className={styles.doctorName}>Ингa Данировна</p>
          <p className={styles.doctorTitle}>Невролог, основатель клиники «Премиум»</p>
        </div>
      </div>
    </div>
  );
}

