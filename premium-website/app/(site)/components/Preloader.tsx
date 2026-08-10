'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import styles from './Preloader.module.css';

export const PRELOADER_SEEN_KEY = 'preloaderSeen';
export const PRELOADER_DONE_EVENT = 'preloaderFinished';

const word = 'ПРЕМИУМ';

export default function Preloader({ onComplete }: { onComplete?: () => void }) {
  const preloaderRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onCompleteRef.current?.();
      return;
    }

    const letters = preloaderRef.current?.querySelectorAll(`.${styles.letter}`);
    if (!letters?.length) return;

    const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });

    timeline.fromTo(
      letters,
      { y: 60, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.08, duration: 0.6 }
    );
    timeline.fromTo(
      subtitleRef.current,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8 },
      '-=0.3'
    );
    timeline.to(preloaderRef.current, {
      x: '-100vw',
      opacity: 0,
      duration: 0.8,
      delay: 1.3,
      onComplete: () => onCompleteRef.current?.(),
    });

    return () => {
      timeline.kill();
    };
  }, []);

  return (
    <div ref={preloaderRef} className={styles.preloader}>
      <div className={styles.centered}>
        <div className={styles.word}>
          {word.split('').map((letter, i) => (
            <span key={`${letter}-${i}`} className={styles.letter}>
              {letter}
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
