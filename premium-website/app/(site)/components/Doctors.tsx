'use client';

import React from 'react';
import DoctorCard from './DoctorCard';
import styles from './Doctors.module.css';
import { useRouter } from 'next/navigation';

type Doctor={
  id: number,
  imgSrc: string,
  name: string,
  specialty: string,
  bio: string,
}

const Doctors: React.FC<{ doctors: Doctor[] }> = ({ doctors }) => {
  const router = useRouter();
  const handleBook = () => {
    router.push('/contacts');
  };

  return (
    <div className={styles.doctorsSection}>
      <h2 className={styles.heading}>СПЕЦИАЛИСТЫ</h2>
      <div className={styles.gridWrapper}>
        {doctors.map((doc) => (
          <DoctorCard
            key={doc.id}
            imgSrc={doc.imgSrc}
            name={doc.name}
            specialty={doc.specialty}
            bio={doc.bio}
            onBook={handleBook}
          />
        ))}
      </div>
    </div>
  );
}
export default Doctors;
