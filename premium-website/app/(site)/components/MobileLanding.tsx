'use client';

import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './MobileLanding.module.css';
import Quote from './Quote';
import ClinicFotos from './ClinicFotos';
import Services from '@/app/(site)/components/Services';
import Doctors from '@/app/(site)/components/Doctors';

type Service = {
    id: number;
    imageSrc: string;
    serviceName: string;
    price: string | number;
    description: string;
    slug: string;
};

type Doctor = {
    id: number;
    imgSrc: string;
    name: string;
    specialty: string;
    bio: string;
};

const slidesData = [
    { src: '/mobile/about5.svg', label: 'О нас' },
    { src: '/mobile/services2.svg', label: 'Услуги' },
    { src: '/mobile/emergency2.svg', label: 'Скорая' },
];

export default function MobileLanding({
                                          services,
                                          doctors,
                                      }: {
    services: Service[];
    doctors: Doctor[];
}) {
    const slidesRef = useRef<HTMLDivElement>(null);
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        function handleScroll() {
            const el = slidesRef.current;
            if (!el) return;
            const containerWidth = el.clientWidth;
            const scrollLeft = el.scrollLeft;
            const slideWidthGap = containerWidth * 0.8 + 16;
            setCurrentSlide(Math.round(scrollLeft / slideWidthGap));
        }

        const el = slidesRef.current;
        if (!el) return;
        el.addEventListener('scroll', handleScroll, { passive: true });
        return () => el.removeEventListener('scroll', handleScroll);
    }, []);

    const handleScrollToSlide = (index: number) => {
        const el = slidesRef.current;
        if (!el) return;
        const slideWidthGap = el.clientWidth * 0.8 + 16;
        el.scrollTo({ left: slideWidthGap * index, behavior: 'smooth' });
        setCurrentSlide(index);
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.heading}>Клиника неврологии в Уфе</h1>

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

            <div className={styles.slidesWrapper} ref={slidesRef}>
                {slidesData.map((slide) => (
                    <div className={styles.slide} key={slide.label}>
                        <Image
                            src={slide.src}
                            alt={slide.label}
                            width={375}
                            height={600}
                            style={{ width: '100%', height: 'auto' }}
                        />
                    </div>
                ))}
            </div>

            <Quote />
            <Services services={services} />
            <ClinicFotos />
            <Doctors doctors={doctors} />
        </div>
    );
}