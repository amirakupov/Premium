import Link from 'next/link';
import Image from 'next/image';
import styles from './ServiceCard.module.css';
import { formatPrice } from '@/lib/format';
import type { Service } from '@/lib/types';

export default function ServiceCard({ service }: { service: Service }) {
  return (
    <div className={styles.card}>
      <div className={styles.imageContainer}>
        <Image
          src={service.imageSrc}
          alt={service.serviceName}
          fill
          sizes="(max-width: 768px) 90vw, 320px"
          style={{ objectFit: 'cover' }}
          className={styles.image}
        />
      </div>

      <div className={styles.descriptionContainer}>
        <Link href={`/services/${service.slug}`} className={styles.oval}>
          {service.serviceName}
        </Link>
        <div className={styles.price}>{formatPrice(service.price)}</div>
        <div className={styles.shortDescription}>{service.description}</div>
      </div>
    </div>
  );
}
