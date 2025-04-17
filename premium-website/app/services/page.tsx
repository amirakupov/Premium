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
      <div className={styles.frame}>
        <Image
          src="/services/Service.svg"
          alt="Services Frame"
          fill
          style={{ objectFit: 'contain' }}
        />
      </div>

      <h1 className={styles.title}>
        изучи наши сервисы блабла бла
      </h1>

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