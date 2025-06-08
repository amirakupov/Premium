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
    specialty: 'Эпилептолог, невролог, кандидат медицинских наук. Стаж более 28 лет',
    bio: 'Специализация:    Диагностика и лечение эпилепсии у взрослых и детей.   Подбор терапии на основе данных ЭЭГ.   Сложные случаи эпилепсии.   Реабилитация после приступов',
  },
  {
    id: 2,
    imgSrc: '/doctors/doctor2.jpg',
    name: 'Башарова Гузель Радисовна',
    specialty: 'Терапевт, стаж 10 лет',
    bio: 'Ваш семейный доктор. Специализация: Лечение ОРВИ, хронических заболеваний   Профилактические осмотры   Ведение пациентов с сопутствующими патологиями  ',
  },
  {
    id: 3,
    imgSrc: '/doctors/doctor3.jpg',
    name: 'Фатыхов Ильдар Салаватович',
    specialty: 'Психиатр / Нарколог, стаж 15 лет',
    bio: 'Помощь, которая возвращает к жизни! Специализация:  - Лечение депрессий, тревожных расстройств  - Детская психиатрия (аутизм, СДВГ)  - Наркологическая помощь ',
  },
  {
    id: 4,
    imgSrc: '/doctors/doctor2.jpg',
    name: 'Мурзина Гульнара Рафайловна',
    specialty: 'Функциональный диагност (УЗИ), стаж 12 лет',
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
