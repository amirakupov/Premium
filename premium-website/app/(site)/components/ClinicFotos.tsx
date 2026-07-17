'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './ClinicFotos.module.css';

const photos: string[] = [
  '/clinic/clinic11.jpg',
  '/clinic/clinic10.jpg',
  '/clinic/clinic7.jpg',
  '/clinic/clinic6.jpg',
  '/clinic/clinic13.jpg',
  '/clinic/clinic5.jpg',
  '/clinic/clinic4.jpg',
  '/clinic/clinic12.jpg',
  '/clinic/clinic14.jpg',
  '/clinic/clinic9.jpg',
];

export default function ClinicFotos() {
  const slidesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      const slides = slidesRef.current?.querySelectorAll(`.${styles.slide}`);
      slides?.forEach((slide) => {
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
    }, slidesRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className={styles.carousel}>
      <h2 className={styles.heading}>НАША ГАЛЕРЕЯ</h2>
      <p className={styles.subheading}>
        Мы используем самое современное и качественное оборудование в связке с
        приятным интерьером для вашего комфорта
      </p>

      <div className={styles.slides} ref={slidesRef}>
        {photos.map((src, index) => (
          <div className={styles.slide} key={src}>
            <Image
              src={src}
              alt={`Интерьер и оборудование клиники — фото ${index + 1}`}
              fill
              sizes="(max-width: 768px) 90vw, 45vw"
              style={{ objectFit: 'cover' }}
              className={styles.image}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
