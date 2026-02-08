import React from 'react';
import DoctorCard from '@/app/(site)/components/DoctorCard';
import styles from './page.module.css';
import {listAllDoctors} from "@/app/api/listAllDoctors";

export default async function DoctorsPage() {
  const doctors = await listAllDoctors();
  return (
    <main className={styles.container}>
      <h1 className={styles.heading}>Наши специалисты</h1>
      <section className={styles.introDesignerBlock}>
        <div className={styles.designerQuote}>
          «Каждый пациент — это не случай, а человек, которому мы возвращаем радость движения и жизни.»
        </div>
        <div className={styles.designerText}>
          <p>
            Наши врачи — это команда специалистов с учёными степенями, клиническим мышлением и искренним желанием помочь.
          </p>
          <p>
            Мы объединили разные направления неврологии, чтобы вы могли получить полную, безопасную и точную помощь — всё в одном месте.
          </p>
          <p>
            Регулярное обучение, европейские стандарты и личная ответственность делают наш подход по-настоящему эффективным.
          </p>
        </div>
      </section>
      <div className={styles.specialSection}>
          <div className={styles.subsection}>
            <h3>Специализация:</h3>
            <ul>
              <li>Лечение мигреней, болей в спине/суставах, головокружений, звона в ушах</li>
              <li>Реабилитация после инсультов и травм</li>
              <li>Лечение депрессий и тревожных расстройств</li>
              <li>Детская неврология (СДВГ, задержки развития)</li>
            </ul>
          </div>

          <div className={styles.subsection}>
            <h3>Уникальные методики:</h3>
            <ul>
              <li>Ботулинотерапия под УЗИ-контролем</li>
              <li>PRP-терапия позвоночника и суставов</li>
            </ul>
          </div>
        </div>
      <div className={styles.grid}>
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
    </main>
  );
}
