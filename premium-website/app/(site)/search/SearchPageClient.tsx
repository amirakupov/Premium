'use client';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Fuse from 'fuse.js';
import Link from 'next/link';
import styles from './page.module.css';

const items = [
  {
    name: 'ЭЭГ',
    link: '/eeg',
    description: 'Диагностика и расшифровка электроэнцефалограммы.',
    keywords: ['eeg', 'энцефалограмма', 'мозг', 'электро'],
  },
  {
    name: 'Врачи',
    link: '/doctors',
    description: 'Опытные специалисты с высшей квалификацией.',
    keywords: ['doctor', 'врач', 'доктор', 'специалист', 'невролог'],
  },
  {
    name: 'Услуги',
    link: '/services',
    description: 'Полный спектр медицинских услуг для взрослых и детей.',
    keywords: ['сервис', 'услуги', 'медицина', 'лечение'],
  },
  {
    name: 'Экстренная помощь',
    link: '/emergency',
    description: 'Круглосуточная экстренная медицинская помощь.',
    keywords: ['экстренная', 'помощь', 'неотложная', 'срочная', 'санитарный транспорт'],
  },
  {
    name: 'Контакты',
    link: '/contacts',
    description: 'Свяжитесь с нами для записи на приём или консультацию.',
    keywords: ['контакты', 'связь', 'телефон', 'адрес', 'запись'],
  },
  {
    name: 'Адрес клиники',
    link: '/#address',
    description: 'Наш адрес и схема проезда.',
    keywords: ['адрес', 'расположение', 'карта'],
  },
];

// Индекс статичен — собираем Fuse один раз на модуль.
const fuse = new Fuse(items, {
  keys: ['name', 'description', 'keywords'],
  threshold: 0.35,
  ignoreLocation: true,
});

export default function SearchPageClient() {
  const searchParams = useSearchParams();
  const query = searchParams.get('query') || '';

  const results = useMemo(
    () => (query ? fuse.search(query).map((result) => result.item) : []),
    [query]
  );

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Результаты поиска</h1>
      <p className={styles.subtitle}>
        {query ? (
          <>По запросу: <b>{query}</b></>
        ) : (
          <>Введите ваш запрос для поиска по сайту</>
        )}
      </p>
      <div className={styles.resultsList}>
        {results.length > 0 ? (
          results.map((item) => (
            <Link href={item.link} key={item.link} className={styles.resultCard}>
              <span className={styles.resultName}>{item.name}</span>
              <span className={styles.resultDesc}>{item.description}</span>
            </Link>
          ))
        ) : query ? (
          <div className={styles.notFound}>Ничего не найдено</div>
        ) : null}
      </div>
    </div>
  );
}
