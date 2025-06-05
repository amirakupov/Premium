'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './InfoBlock.module.css';

const slidesData = [
  {
    src: '/infoblock/About-6.svg',
    buttons: [
      {
        text: 'Подробнее',
        link: '/about',
        style: { top: '76%', left: '10%' },
        buttonClass: 'aboutButton',
      },
    ],
  },
  {
    src: '/infoblock/Main-2.svg',
    buttons: [
      {
        text: 'Услуги',
        link: '/services',
        style: { top: '53%', left: '42%' },
        buttonClass: 'mainButton',
      },
    ],
  },
  {
    src: '/infoblock/Emergency-2.svg',
    buttons: [
      {
        text: 'Вызвать скорую',
        link: '/emergency',
        style: { top: '50%', left: '69%' },
        buttonClass: 'emergencyButton',
      },
    ],
  },
];

export default function InfoBlock() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const router = useRouter();

  // Optional auto-rotation
  /*
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(prev =>
        prev === slidesData.length - 1 ? 0 : prev + 1
      );
    }, 5000);
    return () => clearInterval(interval);
  }, [currentIndex]);
  */

  const handleDotClick = (index: number) => {
    setCurrentIndex(index);
  };

  const handleButtonClick = (link: string) => {
    router.push(link);
  };

  return (
    <div className={styles.carouselContainer}>
      <div className={styles.slidesWrapper}>
        <div
          className={styles.slidesTrack}
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {slidesData.map((slide, idx) => (
            <div className={styles.slide} key={idx}>
              {/* 
                If you want fully responsive images 
                that scale down on mobile, 
                set layout="responsive" and remove width/height.
              */}
              <Image
                src={slide.src}
                alt={`Slide ${idx + 1}`}
                layout="responsive"   /* or "intrinsic" if you prefer */
                width={1000}
                height={600}
                /* This helps the image scale automatically */
              />

              {slide.buttons?.map((btn, bIdx) => (
                <button
                  key={bIdx}
                  className={`${styles.slideButton} ${styles[btn.buttonClass]}`}
                  style={btn.style}
                  onClick={() => handleButtonClick(btn.link)}
                >
                  {btn.text}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Dot Pagination */}
      <div className={styles.dotsContainer}>
        {slidesData.map((_, i) => (
          <div
            key={i}
            className={`${styles.dot} ${i === currentIndex ? styles.activeDot : ''}`}
            onClick={() => handleDotClick(i)}
          />
        ))}
      </div>
    </div>
  );
}

