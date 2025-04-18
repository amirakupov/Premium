'use client';

import React from 'react';
import Image from 'next/image';
import ServiceCard from '../components/ServiceCard';
import styles from './page.module.css';

const servicesData = [
  {
    id: 1,
    imageSrc: '/services/bottocs.jpeg',
    serviceName: 'Ботолинотерапия',
    price: '150₽',
    description: 'бла бла бла блаблаблабла',
    serviceUrl: '/services/botolinoterapiya',
  },
  {
    id: 2,
    imageSrc: '/services/bottocs.jpeg',
    serviceName: 'Педиатр',
    price: '200₽',
    description: 'блабалбал блаблаб блабла',
    serviceUrl: '/services/pediatr',
  },
  {
    id: 3,
    imageSrc: '/services/bottocs.jpeg',
    serviceName: 'Снюс',
    price: '100₽',
    description: 'блябляблябялбял',
    serviceUrl: '/services/snus',
  },
  {
    id: 4,
    imageSrc: '/services/bottocs.jpeg',
    serviceName: 'Терапия',
    price: '250₽',
    description: 'качественная терапия для вас',
    serviceUrl: '/services/therapy',
  },
];

export default function ServicesPage() {
  return (
    <main className={styles.container}>
      {/* Desktop frame */}
      <div className={styles.frameDesktop}>
        <Image
          src="/services/Service.svg"
          alt="Services Frame"
          fill
          style={{ objectFit: 'contain' }}
        />
      </div>

      {/* Mobile frame */}
      <div className={styles.frameMobile}>
        <Image
          src="/services/ServiceMob.svg"
          alt="Services Frame Mobile"
          fill
          style={{ objectFit: 'contain' }}
        />
      </div>

      <h1 className={styles.title}>
      Полный спектр решений для эффективного улучшения вашего ухода
      </h1>
      <p className={styles.subtitle}>
        Лучшие медицинские услуги для вашего здоровья и комфорта
      </p>

      <section className={styles.servicesContainer}>
        {servicesData.map((s) => (
          <ServiceCard
            key={s.id}
            imageSrc={s.imageSrc}
            serviceName={s.serviceName}
            price={s.price}
            description={s.description}
            serviceUrl={s.serviceUrl}
          />
        ))}
      </section>
    </main>
  );
}