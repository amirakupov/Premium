'use client';

import React from 'react';
import Image from 'next/image';
import ServiceCard from '../components/ServiceCard';
import styles from './page.module.css';
import { services } from './data/services'; // Импортируем данные услуг

export default function ServicesPage() {
  return (
    <main className={styles.container}>
      {/* Desktop frame */}
      <div className={styles.frameDesktop}>
        <Image
          src="/services/Service-4.svg"
          alt="Services Frame"
          fill
          style={{ objectFit: 'contain' }}
        />
      </div>

      {/* Mobile frame */}
      <div className={styles.frameMobile}>
        <Image
          src="/services/ServiceMob4.svg"
          alt="Services Frame Mobile"
          fill
          style={{ objectFit: 'contain' }}
        />
      </div>

      <h1 className={styles.title}>
      Полный спектр решений для эффективного улучшения вашего здоровья
      </h1>
      <p className={styles.subtitle}>
        Лучшие медицинские услуги для вашего здоровья и комфорта
      </p>

      <section className={styles.servicesContainer}>
        {services.map((s) => (
          <ServiceCard
            key={s.id}
            imageSrc={s.imageSrc}
            serviceName={s.serviceName}
            price={s.price}
            description={s.description} 
            // формируем URL на основе поля slug:
            serviceUrl={`/services/${s.slug}`}
          />
        ))}
      </section>
    </main>
  );
}