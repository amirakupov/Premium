'use client';

import React from 'react';
import DoctorCard from '../components/DoctorCard';
import styles from './page.module.css';
import { useRouter } from 'next/navigation';

const doctorsData = [
  {
    id: 1,
    imgSrc: '/doctors/doctor1.jpg',
    name: 'Др. Иванов Иван',
    specialty: 'Невролог, стаж 15 лет',
    bio: 'Опытный чел лай чпок пук кек лол. Опытный чел лай чпок пук кек лол. Опытный чел лай чпок пук кек лол. более 150 лет работает ага да',
  },
  {
    id: 2,
    imgSrc: '/doctors/doctor2.jpg',
    name: 'Др. Смирнова Анна',
    specialty: 'Педиатр, стаж 10 лет',
    bio: 'Опытный чел лай чпок пук кек лол. Опытный чел лай чпок пук кек лол. Опытный чел лай чпок пук кек лол. более 150 лет работает ага да',
  },
  {
    id: 3,
    imgSrc: '/doctors/doctor3.jpg',
    name: 'Др. Петров Дмитрий',
    specialty: 'Ортопед, стаж 8 лет',
    bio: 'Опытный чел лай чпок пук кек лол. Опытный чел лай чпок пук кек лол. Опытный чел лай чпок пук кек лол. более 150 лет работает ага да',
  },
  {
    id: 4,
    imgSrc: '/doctors/doctor2.jpg',
    name: 'Др. Снюсов Снюс',
    specialty: 'Врач, стаж 0 лет',
    bio: 'Опытный чел лай чпок пук кек лол. Опытный чел лай чпок пук кек лол. Опытный чел лай чпок пук кек лол. более 150 лет работает ага да',
  },
];


export default function DoctorsPage() {
  const router = useRouter();

  const handleBook = () => {
    router.push('/contacts');
  };

  return (
    <main className={styles.container}>
      <h1 className={styles.heading}>Наши врачи</h1>
      <div className={styles.grid}>
        {doctorsData.map((doc) => (
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
    </main>
  );
}
