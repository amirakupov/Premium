import Link from 'next/link';
import Image from 'next/image';
import styles from './ServiceCard.module.css';
import { formatPrice } from '@/lib/format';
import type { Service } from '@/lib/types';

export default function ServiceCard({ service }: { service: Service }) {
  return (
    <article className={styles.card}>
      <div className={styles.imageContainer}>
        <Image
          src={service.imageSrc}
          alt={service.serviceName}
          fill
          sizes="(max-width: 768px) 80vw, 360px"
          className={styles.image}
        />
      </div>

      <div className={styles.descriptionContainer}>
        <h3 className={styles.name}>
          <Link href={`/services/${service.slug}`} className={styles.nameLink}>
            {service.serviceName}
          </Link>
        </h3>
        <p className={styles.shortDescription}>{service.description}</p>
        <div className={styles.priceRow}>
          <span className={styles.price}>{formatPrice(service.price)}</span>
          <span className={styles.more} aria-hidden="true">
            Подробнее →
          </span>
        </div>
      </div>
    </article>
  );
}