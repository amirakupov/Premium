'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './DoctorCard.module.css';

interface DoctorCardProps {
  imgSrc: string;
  name: string;
  specialty: string;
  bio?: string;
}

/**
 * Карточка врача с оборотом-биографией.
 *
 * Переворотом управляет настоящая <button> на каждой стороне, а не контейнер:
 * `role="button"` на div со ссылкой «Записаться» внутри — интерактивный элемент
 * внутри интерактивного, скринридеры и клавиатура ведут себя непредсказуемо.
 * Невидимая сторона получает `inert`: её ссылка и кнопка выпадают из порядка
 * табуляции и из дерева доступности, без ручного tabIndex. При перевороте
 * фокус переносится на кнопку видимой стороны — иначе он пропадал бы вместе с
 * инертной кнопкой, которую только что нажали.
 */
export default function DoctorCard({ imgSrc, name, specialty, bio }: DoctorCardProps) {
  const [flipped, setFlipped] = useState(false);
  const backId = useId();
  const frontButton = useRef<HTMLButtonElement>(null);
  const backButton = useRef<HTMLButtonElement>(null);
  const userFlipped = useRef(false);

  const flip = () => {
    userFlipped.current = true;
    setFlipped((f) => !f);
  };

  useEffect(() => {
    if (!userFlipped.current) return;
    (flipped ? backButton : frontButton).current?.focus();
  }, [flipped]);

  return (
    <div className={styles.cardContainer} data-reveal="card-tilt">
      <div className={`${styles.cardInner} ${flipped ? styles.flipped : ''}`}>
        <div className={styles.cardFace} aria-hidden={flipped} inert={flipped}>
          {imgSrc ? (
            <Image
              src={imgSrc}
              alt={name}
              fill
              sizes="285px"
              className={styles.image}
            />
          ) : null}
          <div className={styles.overlay}>
            <div className={styles.info}>
              <h3 className={styles.name}>{name}</h3>
              <p className={styles.specialty}>{specialty}</p>
              <div className={styles.actions}>
                <Link href="/contacts" className={styles.button}>
                  Записаться
                </Link>
                {bio ? (
                  <button
                    ref={frontButton}
                    type="button"
                    className={styles.flipButton}
                    onClick={flip}
                    aria-expanded={flipped}
                    aria-controls={backId}
                  >
                    Биография
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.cardFace} id={backId} aria-hidden={!flipped} inert={!flipped}>
          <div className={styles.backContent}>
            <h3 className={styles.backName}>{name}</h3>
            {bio && <p className={styles.bio}>{bio}</p>}
            <button
              ref={backButton}
              type="button"
              className={styles.flipButtonBack}
              onClick={flip}
              aria-expanded={flipped}
              aria-controls={backId}
            >
              Скрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
