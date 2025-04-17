'use client';

import React, { useState } from 'react';
import styles from './DoctorCard.module.css';

interface DoctorCardProps {
  imgSrc: string;
  name: string;
  specialty: string;
  bio?: string;         // New prop for back‑side text
  onBook?: () => void;
}

export default function DoctorCard({
  imgSrc,
  name,
  specialty,
  bio = 'Опытный специалист с индивидуальным подходом.',
  onBook,
}: DoctorCardProps) {
  const [flipped, setFlipped] = useState(false);

  const handleFlip = () => setFlipped((f) => !f);

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();   // don’t flip on button click
    onBook?.();
  };

  return (
    <div
      className={styles.cardContainer}
      onClick={handleFlip}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' ? handleFlip() : null)}
    >
      <div
        className={`${styles.cardInner} ${
          flipped ? styles.flipped : ''
        }`}
      >
        {/* === FRONT === */}
        <div className={styles.cardFace}>
          <img src={imgSrc} alt={name} className={styles.image} />
          <div className={styles.overlay}>
            <div className={styles.info}>
              <h3 className={styles.name}>{name}</h3>
              <p className={styles.specialty}>{specialty}</p>
              <button
                onClick={handleButtonClick}
                className={styles.button}
              >
                Записаться
              </button>
            </div>
          </div>
        </div>

        <div className={styles.cardFace}>
          <div className={styles.backContent}>
            <h3 className={styles.name}>{name}</h3>
            <p className={styles.bio}>{bio}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

