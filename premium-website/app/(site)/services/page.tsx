import type { Metadata } from 'next';
import ServiceCard from '@/app/(site)/components/ServiceCard';
import styles from './page.module.css';
import { listAllServices } from '@/lib/cms';

export const metadata: Metadata = {
  title: 'Услуги и цены',
  description:
    'Все услуги клиники неврологии «Премиум» в Уфе: ЭЭГ, ботулинотерапия, физиотерапия, УЗИ, анализы, капельницы и другое. Актуальные цены.',
};

export default async function ServicesPage() {
  const services = await listAllServices();
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>
        Полный спектр решений для эффективного улучшения вашего здоровья
      </h1>
      <p className={styles.subtitle}>
        Лучшие медицинские услуги для вашего здоровья и комфорта
      </p>

      <section className={styles.servicesContainer}>
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </section>
    </main>
  );
}
