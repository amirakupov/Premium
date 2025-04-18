'use client';

import React from 'react';
import Link from 'next/link';
import styles from './Services.module.css';
import ServiceCard from './ServiceCard';

const servicesData = [
  { id: 1, imageSrc: '/services/bottocs.jpeg', serviceName: 'Ботолинотерапия', price: '150₽', description: 'краткое описание', serviceUrl: '/services/botolinoterapiya' },
  { id: 2, imageSrc: '/services/bottocs.jpeg', serviceName: 'Педиатр',          price: '200₽', description: 'краткое описание', serviceUrl: '/services/pediatr' },
  { id: 3, imageSrc: '/services/bottocs.jpeg', serviceName: 'Снюс',              price: '100₽', description: 'краткое описание', serviceUrl: '/services/snus' },
  { id: 4, imageSrc: '/services/bottocs.jpeg', serviceName: 'Терапия',           price: '250₽', description: 'краткое описание', serviceUrl: '/services/therapy' },
  { id: 5, imageSrc: '/services/bottocs.jpeg', serviceName: 'Диагностика',       price: '300₽', description: 'краткое описание', serviceUrl: '/services/diagnosis' },
  { id: 6, imageSrc: '/services/bottocs.jpeg', serviceName: 'Консультация',      price: '120₽', description: 'краткое описание', serviceUrl: '/services/consultation' },
];

const Services: React.FC = () => (
  <div className={styles.servicesSection}>
    {/* Header container: column layout */}
    <div className={styles.headerContainer}>
      <h2 className={styles.heading}>МЫ ПРЕДЛАГАЕМ</h2>
      <Link href="/services" className={styles.viewAllLink}>
        посмотреть все сервисы
      </Link>
    </div>

    {/* Service Cards Grid */}
    <div className={styles.servicesContainer}>
      {servicesData.map((service) => (
        <ServiceCard
          key={service.id}
          imageSrc={service.imageSrc}
          serviceName={service.serviceName}
          price={service.price}
          description={service.description}
          serviceUrl={service.serviceUrl}
        />
      ))}
    </div>
  </div>
);

export default Services;
