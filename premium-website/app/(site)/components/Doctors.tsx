'use client';

import React from 'react';
import DoctorCard from './DoctorCard';
import styles from './Doctors.module.css';
import { useRouter } from 'next/navigation';

const doctorsData = [
  {
    id: 1,
    imgSrc: '/doctors/mamka.png',
    name: 'Габдрахманова Инга Данировна',
    specialty: 'Невролог, эпилептолог, кандидат медицинских наук. Стаж более 28 лет',
    bio: 'Специализация:    Диагностика и лечение эпилепсии у взрослых и детей.   Подбор терапии на основе данных ЭЭГ.   Сложные случаи эпилепсии.   Реабилитация после приступов',
  },
  {
    id: 2,
    imgSrc: '/doctors/bash.jpeg',
    name: 'Башарова Гузель Радисовна',
    specialty: 'Терапевт, профессор стаж 25 лет',
    bio: 'Ваш семейный доктор. Специализация: Лечение ОРВИ, хронических заболеваний   Профилактические осмотры   Ведение пациентов с сопутствующими патологиями  ',
  },
  {
    id: 3,
    imgSrc: '/doctors/ildar.jpeg',
    name: 'Фатыхов Ильдар Салаватович',
    specialty: 'Психиатр / Нарколог, стаж 9 лет',
    bio: 'Помощь, которая возвращает к жизни! Специализация:  - Лечение депрессий, тревожных расстройств  - Детская психиатрия (аутизм, СДВГ)  - Наркологическая помощь ',
  },
  {
    id: 5,
    imgSrc: '/doctors/regina.jpeg',
    name: 'Закирова Регина Радиковна',
    specialty: 'Функциональный диагност, акушер-гинеколог, стаж 5 лет',
    bio: 'Специализация: УЗИ сосудов, органов брюшной полости, 3D/4D УЗИ при беременности, Диагностика патологий мягких тканей  ',
  },
];

export default function Doctors() {
  const router = useRouter();
  const handleBook = () => {
    router.push('/contacts');
  };

  return (
    <div className={styles.doctorsSection}>
      <h2 className={styles.heading}>СПЕЦИАЛИСТЫ</h2>
      <div className={styles.gridWrapper}>
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
    </div>
  );
}
