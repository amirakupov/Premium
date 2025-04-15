'use client';

import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './MobileLanding.module.css';

const slidesData = [
  { src: '/mobile/about1.svg', label: 'О нас' },
  { src: '/mobile/services1.svg', label: 'Сервисы' },
  { src: '/mobile/emergency1.svg', label: 'Скорая' },
];

export default function MobileLanding() {
  const slidesRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Listen to scroll events to figure out which slide is in view
  useEffect(() => {
    const slidesEl = slidesRef.current;
    if (!slidesEl) return;

    function handleScroll() {
      const containerWidth = slidesEl.clientWidth;
      const scrollLeft = slidesEl.scrollLeft;
      const slideWidthWithGap = containerWidth * 0.8 + 16; 
        /* 0.8 if each slide is 80% of container, plus gap=16px (~1rem) */
      const index = Math.round(scrollLeft / slideWidthWithGap);
      setCurrentSlide(index);
    }

    slidesEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => slidesEl.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll to a given slide index
  const handleScrollToSlide = (slideIndex: number) => {
    const slidesEl = slidesRef.current;
    if (!slidesEl) return;

    const containerWidth = slidesEl.clientWidth;
    const slideWidthWithGap = containerWidth * 0.8 + 16; // matching what's in handleScroll
    slidesEl.scrollTo({
      left: slideWidthWithGap * slideIndex,
      behavior: 'smooth',
    });
    setCurrentSlide(slideIndex);
  };

  return (
    <div className={styles.container}>
      {/* Title */}
      <h1 className={styles.heading}>Клиника неврологии в Уфе</h1>

      {/* Buttons row – tapping a button scrolls to that slide */}
      <div className={styles.buttonsContainer}>
        {slidesData.map((slide, index) => (
          <button
            key={slide.label}
            className={
              index === currentSlide
                ? `${styles.navButton} ${styles.activeNavButton}`
                : styles.navButton
            }
            onClick={() => handleScrollToSlide(index)}
          >
            {slide.label}
          </button>
        ))}
      </div>

      {/* Slides horizontally scrollable, partial next slide visible */}
      <div className={styles.slidesWrapper} ref={slidesRef}>
        {slidesData.map((slide, idx) => (
          <div className={styles.slide} key={slide.label}>
            <Image
              src={slide.src}
              alt={slide.label}
              layout="responsive"
              width={375}
              height={600}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
