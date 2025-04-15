'use client';

import React from 'react';
import Image from 'next/image';
import styles from './Quote.module.css';

export default function Quote() {
  return (
    <div className={styles.container}>
      {/* Big, bold heading (Inter) */}
      <h2 className={styles.heading}>
        МЫ ЛЮБИМ МИНИМАЛИСТИЧНЫЙ СТИЛЬ
      </h2>

      {/* Three sentences, or paragraphs, in Inter */}
      <p className={styles.quoteText}>
        Мы эксперты в лечении грыж межпозвонкового диска. Как основатель клиники, я горжусь
        тем, что наша команда стала первой в России, кто разработал и внедрил метод
        модулируемой резорбции.
      </p>
      <p className={styles.quoteText}>
        За прошедшие 17 лет мы помогли свыше 50 000 пациентам вылечить боли
        в спине и межпозвоночные грыжи без операции.
      </p>
      <p className={styles.quoteText}>
        В нашей клинике применяем только доказанные и безопасные методы
        диагностики, терапии лечения, снятия болевого синдрома.
      </p>

      {/* Figma frame image at the bottom (instead of a signature) */}
      <div className={styles.figmaImageContainer}>
        <Image
          src="/quote/signature.svg" 
          alt="Figma Frame Example"
          layout="responsive"
          width={120}        /* we set a smaller width in code. can tweak */
          height={80}        /* adjust for aspect ratio */
        />
      </div>
    </div>
  );
}
