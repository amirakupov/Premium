import Link from 'next/link';
import DoctorCard from './DoctorCard';
import styles from './Doctors.module.css';
import type { Doctor } from '@/lib/types';

export default function Doctors({ doctors }: { doctors: Doctor[] }) {
  return (
    <section className={styles.doctorsSection}>
      <div className={styles.headerContainer}>
        <h2 className={styles.heading}>Наши специалисты</h2>
        <Link href="/doctors" className={styles.viewAllLink}>
          Все врачи клиники
        </Link>
      </div>
      <div className={styles.gridWrapper}>
        {doctors.map((doc) => (
          <DoctorCard
            key={doc.id}
            imgSrc={doc.imgSrc}
            name={doc.name}
            specialty={doc.specialty}
            bio={doc.bio}
          />
        ))}
      </div>
    </section>
  );
}