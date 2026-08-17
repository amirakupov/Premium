import Link from 'next/link';
import styles from './Services.module.css';
import ServiceCard from './ServiceCard';
import type { Service } from '@/lib/types';

export default function Services({ services }: { services: Service[] }) {
  return (
    <section id="services" className={styles.servicesSection}>
      <div className={styles.headerContainer}>
        <h2 className={styles.heading}>Мы предлагаем</h2>
        <Link href="/services" className={styles.viewAllLink}>
          Все услуги и цены
        </Link>
      </div>

      <div className={styles.servicesContainer}>
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>
    </section>
  );
}