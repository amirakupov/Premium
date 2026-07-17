import DoctorCard from './DoctorCard';
import styles from './Doctors.module.css';
import type { Doctor } from '@/lib/types';

export default function Doctors({ doctors }: { doctors: Doctor[] }) {
  return (
    <section className={styles.doctorsSection}>
      <h2 className={styles.heading}>СПЕЦИАЛИСТЫ</h2>
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
