import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { services } from '../data';
import styles from './page.module.css';

export async function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export default async function ServiceDetailPage({
    params,
  }: {
    params: Promise<{ slug: string }>;
  }) {
    const { slug } = await params;

  const service = services.find((s) => s.slug === slug);
  if (!service) notFound();

  return (
    <main className={styles.container}>
      <div className={styles.detailWrapper}>
        {/* PHOTO on the left */}
        <div className={styles.imageWrapper}>
          <Image
            src={service.imageSrc}
            alt={service.serviceName}
            fill
            style={{ objectFit: 'cover' }}
            className={styles.image}
          />
        </div>

        {/* ALL TEXT on the right */}
        <div className={styles.textWrapper}>
          <h1 className={styles.title}>{service.serviceName}</h1>
          <p className={styles.subtitle}>
            Откройте для себя преимущества нашей услуги
          </p>
          <h2 className={styles.sectionHeader}>Подробное описание</h2>
          <p className={styles.longDescription}>{service.longDescription}</p>

          {/* Записаться button */}
          <Link href="/contact" className={styles.bookButton}>
            Записаться
          </Link>
        </div>
      </div>
    </main>
  );
}
