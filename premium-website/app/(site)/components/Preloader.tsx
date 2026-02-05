'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import styles from './Preloader.module.css';

const word = "PREMIUM";

export default function Preloader({ onComplete }: { onComplete?: () => void }) {
  const preloaderRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const letters = gsap.utils.toArray('.letter');
    const timeline = gsap.timeline({
      defaults: { ease: "power3.out" }
    });

    // Анимация букв
    timeline.fromTo(
      letters,
      { y: 60, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        stagger: 0.08,
        duration: 0.6,
      }
    );

    // Плавно появляется подзаголовок
    timeline.fromTo(
      subtitleRef.current,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8 },
      "-=0.3"
    );

    // Через 2.2s сдвигаем preloader влево и скрываем
    timeline.to(
      preloaderRef.current,
      {
        x: '-100vw',
        opacity: 0,
        duration: 0.8,
        delay: 1.3,
        // А вот тут — используем GSAP onComplete
        onComplete: () => {
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 100); // 100–150 мс задержки хватает, чтобы DOM успел убрать preloader
        }
      }
    );

    return () => {
      gsap.killTweensOf(letters);
      gsap.killTweensOf(preloaderRef.current);
      gsap.killTweensOf(subtitleRef.current);
    };
  }, [onComplete]);

  return (
    <div ref={preloaderRef} className={styles.preloader}>
      <div className={styles.centered}>
        <div className={styles.word}>
          {word.split('').map((l, i) => (
            <span key={i} className="letter" style={{ display: 'inline-block' }}>
              {l}
            </span>
          ))}
        </div>
        <div ref={subtitleRef} className={styles.subtitle}>
          медицинская клиника
        </div>
      </div>
    </div>
  );
}


