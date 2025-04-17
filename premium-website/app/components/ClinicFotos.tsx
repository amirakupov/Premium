'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './ClinicFotos.module.css';

// Array of image paths in public/clinic/
const photos: string[] = [
  '/clinic/clinic2.jpg',
  '/clinic/clinic3.jpg',
  '/clinic/clinic1.jpg',
];

export default function ClinicFotos() {
  const slidesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const slides = slidesRef.current?.querySelectorAll(`.${styles.slide}`);
    if (!slides) return;

    slides.forEach((slide) => {
      gsap.fromTo(
        slide,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          scrollTrigger: {
            trigger: slide,
            start: 'top 70%',
            end: 'bottom 50%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    });
  }, []);

  return (
    <div className={styles.carousel}>
      {/* Header & description */}
      <h2 className={styles.heading}>НАША ГАЛЕРЕЯ</h2>
      <p className={styles.subheading}>Мы используем самое современное и качественное оборудование для вашего здоровья. Мы уделяем большое внимание пукпук пук пукпук пукпук. Более того пукпукпук пук пук бла бла бла</p>

      {/* Image slider */}
      <div className={styles.slides} ref={slidesRef}>
        {photos.map((src, index) => (
          <div className={styles.slide} key={index}>
            <Image
              src={src}
              alt={`Clinic photo ${index + 1}`}
              fill
              objectFit="cover"
              className={styles.image}
            />
          </div>
        ))}
      </div>
    </div>
  );
}