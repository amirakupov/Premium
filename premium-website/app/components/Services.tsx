// app/components/Services.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import styles from './Services.module.css';
import ServiceCard from './ServiceCard';
import { services } from '../services/data/services';

const Services: React.FC = () => {
  return (
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
        {services.map((service) => (
          <ServiceCard
            key={service.id}
            imageSrc={service.imageSrc}
            serviceName={service.serviceName}
            price={service.price}
            description={service.description}
            serviceUrl={`/services/${service.slug}`}
          />
        ))}
      </div>
    </div>
  );
};

export default Services;

