import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { services } from '../data/services';
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
          <Link href="/contacts" className={styles.bookButton}>
            Записаться
          </Link>
        </div>
      </div>
      {slug === 'analiz' && service.analysesList && (
      <section className={styles.analysisSection}>
        <h2>СПИСОК АНАЛИЗОВ</h2>
        <table className={styles.analysisTable}>
          <thead>
            <tr>
              <th>Код</th>
              <th>Название</th>
              <th>Цена</th>
            </tr>
          </thead>
          <tbody>
            {service.analysesList.map((a, idx) => (
              <tr key={idx}>
                <td>{a.code}</td>
                <td>{a.name}</td>
                <td>{a.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    )}
    {slug === 'kabinet' && service.procedureList && (
      <section className={styles.analysisSection}>
        <h2>НАШИ ПРОЦЕДУРКИ</h2>
        <table className={styles.analysisTable}>
          <thead>
            <tr>
              <th>Название</th>
              <th>Цена</th>
            </tr>
          </thead>
          <tbody>
            {service.procedureList?.map((a, idx) => (
              <tr key={idx}>
                <td>{a.name}</td>
                <td>{a.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    )}
    {slug === 'spravki' && service.adminReferences && (
      <section className={styles.analysisSection}>
        <h2>СПРАВКИ</h2>
        <table className={styles.analysisTable}>
          <thead>
            <tr>
              <th>Название</th>
              <th>Цена</th>
            </tr>
          </thead>
          <tbody>
            {service.adminReferences?.map((a, idx) => (
              <tr key={idx}>
                <td>{a.name}</td>
                <td>{a.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    )}
    {slug === 'physiotherapy' && service.physioProcedures && (
      <section className={styles.analysisSection}>
        <h2>СПИСОК УСЛУГ</h2>
        <table className={styles.analysisTable}>
          <thead>
            <tr>
              <th>Название</th>
              <th>Цена</th>
            </tr>
          </thead>
          <tbody>
            {service.physioProcedures?.map((a, idx) => (
              <tr key={idx}>
                <td>{a.name}</td>
                <td>{a.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    )}
    </main>
  );
}
