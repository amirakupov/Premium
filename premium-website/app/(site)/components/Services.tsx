import Link from 'next/link';
import styles from './Services.module.css';
import ServiceCard from './ServiceCard';
import type { Service } from '@/lib/types';

/** Число карточек в скелетоне = число карточек на главной (slice(0, 9)). */
const SKELETON_COUNT = 9;

/**
 * `services: null` — данные ещё едут (fallback Suspense): секция рисуется с
 * тем же якорем и заголовком, а вместо сетки — скелетон той же геометрии, чтобы
 * страница не перекладывалась и метки глав сцены не поехали.
 */
export default function Services({ services }: { services: Service[] | null }) {
  return (
    <section id="services" className={styles.servicesSection}>
      <div className={styles.headerContainer}>
        <h2 className={styles.heading} data-reveal="heading">Мы предлагаем</h2>
        <Link href="/services" className={styles.viewAllLink}>
          Все услуги и цены
        </Link>
      </div>

      <div className={styles.servicesContainer} data-reveal-group>
        {services
          ? services.map((service) => <ServiceCard key={service.id} service={service} />)
          : Array.from({ length: SKELETON_COUNT }, (_, i) => (
              <div key={i} className={styles.skeleton} aria-hidden="true" />
            ))}
      </div>
    </section>
  );
}