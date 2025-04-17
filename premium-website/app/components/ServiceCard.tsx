'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './ServiceCard.module.css';

interface ServiceCardProps {
  imageSrc: string;
  serviceName: string;
  price: string;
  description: string;
  serviceUrl: string;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  imageSrc,
  serviceName,
  price,
  description,
  serviceUrl,
}) => {
  return (
    <div className={styles.card}>
      {/* Image part: 50% of the card */}
      <div className={styles.imageContainer}>
        <Image
          src={imageSrc} // e.g., '/service/therapy.jpg'
          alt={serviceName}
          fill
          objectFit="cover"
          className={styles.image}
        />
      </div>
      
      {/* Description part: 50% of the card */}
      <div className={styles.descriptionContainer}>
        <Link href={serviceUrl} className={styles.oval}>
          {serviceName}
        </Link>
        <div className={styles.price}>
          {price}
        </div>
        <div className={styles.shortDescription}>
          {description}
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;



