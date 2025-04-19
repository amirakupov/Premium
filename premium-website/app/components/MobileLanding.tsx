'use client';

import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './MobileLanding.module.css';
import Quote from './Quote';
import Services from './Services';
import ClinicFotos from './ClinicFotos';
import Doctors from './Doctors';

const slidesData = [
  { src: '/mobile/about1.svg', label: 'О нас' },
  { src: '/mobile/services1.svg', label: 'Услуги' },
  { src: '/mobile/emergency1.svg', label: 'Скорая' },
];

export default function MobileLanding() {
  const slidesRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Listen to scroll events to figure out which slide is in view
  useEffect(() => {
    function handleScroll() {
      const el = slidesRef.current;
      if (!el) return;                  // ← narrow here
      const containerWidth = el.clientWidth;
      const scrollLeft     = el.scrollLeft;
      const slideWidthGap  = containerWidth * 0.8 + 16;
      setCurrentSlide(Math.round(scrollLeft / slideWidthGap));
    }
  
    const el = slidesRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);
  

  // Smooth scroll to a given slide index
  const handleScrollToSlide = (index: number) => {
    const el = slidesRef.current;
    if (!el) return;
    const slideWidthGap = el.clientWidth * 0.8 + 16;
    el.scrollTo({ left: slideWidthGap * index, behavior: 'smooth' });
    setCurrentSlide(index);
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
      <Quote />
      <Services />
      <ClinicFotos />
      <Doctors />
    </div>
  );
}
