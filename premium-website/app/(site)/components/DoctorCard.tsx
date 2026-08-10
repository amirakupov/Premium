'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './DoctorCard.module.css';

interface DoctorCardProps {
  imgSrc: string;
  name: string;
  specialty: string;
  bio?: string;
}

export default function DoctorCard({ imgSrc, name, specialty, bio }: DoctorCardProps) {
  const [flipped, setFlipped] = useState(false);

  const handleFlip = () => setFlipped((f) => !f);

  return (
    <div
      className={styles.cardContainer}
      onClick={handleFlip}
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      aria-label={`${name} — показать биографию`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleFlip();
        }
      }}
    >
      <div className={`${styles.cardInner} ${flipped ? styles.flipped : ''}`}>
        <div className={styles.cardFace} aria-hidden={flipped}>
          <Image
            src={imgSrc}
            alt={name}
            fill
            sizes="285px"
            className={styles.image}
          />
          <div className={styles.overlay}>
            <div className={styles.info}>
              <h3 className={styles.name}>{name}</h3>
              <p className={styles.specialty}>{specialty}</p>
              <Link
                href="/contacts"
                className={styles.button}
                onClick={(e) => e.stopPropagation()}
                tabIndex={flipped ? -1 : 0}
              >
                Записаться
              </Link>
            </div>
          </div>
        </div>

        <div className={styles.cardFace} aria-hidden={!flipped}>
          <div className={styles.backContent}>
            <h3 className={styles.backName}>{name}</h3>
            {bio && <p className={styles.bio}>{bio}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}