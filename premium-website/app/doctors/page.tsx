'use client';

import React from 'react';
import DoctorCard from '../components/DoctorCard';
import styles from './page.module.css';

const doctorsData = [
  {
    id: 1,
    imgSrc: '/doctors/doctor1.jpg',
    name: 'Др. Иванов Иван',
    specialty: 'Невролог, стаж 15 лет',
  },
  {
    id: 2,
    imgSrc: '/doctors/doctor2.jpg',
    name: 'Др. Смирнова Анна',
    specialty: 'Педиатр, стаж 10 лет',
  },
  {
    id: 3,
    imgSrc: '/doctors/doctor3.jpg',
    name: 'Др. Петров Дмитрий',
    specialty: 'Ортопед, стаж 8 лет',
  },
  {
    id: 4,
    imgSrc: '/doctors/doctor4.jpg',
    name: 'Др. Кузнецова Мария',
    specialty: 'Терапевт, стаж 12 лет',
  },
];

export default function DoctorsPage() {
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
            onBook={() => alert(`Запись к доктору: ${doc.name}`)}
          />
        ))}
      </div>
    </main>
  );
}
