'use client';

import React from 'react';
import Image from 'next/image';
import styles from './page.module.css';

export default function EmergencyPage() {
  return (
    <main className={styles.container}>
      {/* Desktop frame */}
      <div className={styles.frameDesktop}>
        <Image
          src="/infoblock/Emergency.svg"
          alt="Emergency Frame"
          fill
          style={{ objectFit: 'contain' }}
        />
      </div>

      {/* Mobile frame */}
      <div className={styles.frameMobile}>
        <Image
          src="/mobile/emergency1.svg"
          alt="Emergency Frame Mobile"
          fill
          style={{ objectFit: 'contain' }}
        />
      </div>

      <h1 className={styles.title}>Экстренная помощь</h1>
      <p className={styles.subtitle}>
        Нужна скорая помощь? Мы на связи круглосуточно.
      </p>

      <button className={`${styles.slideButton} ${styles.emergencyButton}`}>
        Вызвать скорую
      </button>
    </main>
  );
}
