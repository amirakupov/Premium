'use client';
import styles from './Services.module.css';
import React from 'react';
import ServiceCard from './ServiceCard';

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
    serviceName: 'Ботолинотерапия',
    price: '150₽',
    description: 'бла бла бла блаблаблабла',
    serviceUrl: '/services/botolinoterapiya',
  },
  {
    id: 5,
    imageSrc: '/services/bottocs.jpeg',
    serviceName: 'Педиатр',
    price: '200₽',
    description: 'блабалбал блаблаб блабла',
    serviceUrl: '/services/pediatr',
  },
  {
    id: 6,
    imageSrc: '/services/bottocs.jpeg',
    serviceName: 'Снюс',
    price: '100₽',
    description: 'блябляблябялбял',
    serviceUrl: '/services/snus',
  },
 
];

const Services: React.FC = () => {
  return (
    <div className={styles.servicesSection}>
    <h2 className={styles.heading}>СЕРВИСЫ КЛИНИКИ</h2>
      
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
};

export default Services;

