import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';
import { listAllServices } from '@/lib/cms';
import { analysesData } from '../data/analysesData';

type Params = { params: Promise<{ slug: string }> };

async function getServiceBySlug(slug: string) {
  const services = await listAllServices();
  return services.find((s) => s.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) return { title: 'Услуга не найдена' };
  return {
    title: service.serviceName,
    description: service.description,
  };
}

export default async function ServiceDetailPage({ params }: Params) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) notFound();

  return (
    <main className={styles.container}>
      <div className={styles.detailWrapper}>
        <div className={styles.imageWrapper}>
          <Image
            src={service.imageSrc}
            alt={service.serviceName}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            style={{ objectFit: 'cover' }}
            className={styles.image}
          />
        </div>
        <div className={styles.textWrapper}>
          <h1 className={styles.title}>{service.serviceName}</h1>
          <p className={styles.subtitle}>
            Откройте для себя преимущества нашей услуги
          </p>
          <h2 className={styles.sectionHeader}>Подробное описание</h2>
          <p className={styles.longDescription}>{service.longDescription}</p>

          <Link href="/contacts" className={`btn btn--brass ${styles.bookButton}`}>
            Записаться
          </Link>
        </div>
      </div>

      {slug === 'analiz' && (
        <section className={styles.analysisSection}>
          <h2>Список анализов</h2>
          <div className={styles.tableWrapper}>
            <table className={styles.analysisTable}>
              <thead>
                <tr>
                  <th scope="col">Код</th>
                  <th scope="col">Название</th>
                  <th scope="col">Цена, ₽</th>
                </tr>
              </thead>
              <tbody>
                {analysesData.map((row) => (
                  <tr key={row.code}>
                    <td>{row.code}</td>
                    <td>{row.name}</td>
                    <td>{row.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
