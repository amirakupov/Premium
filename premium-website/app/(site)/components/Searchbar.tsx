'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BsSearch } from 'react-icons/bs';
import styles from './Searchbar.module.css';

/**
 * `label` — имя формы-ландмарка. Шапка рендерит два поиска (десктопный и в
 * мобильном меню), и у ландмарков должны быть разные имена; неактивный вдобавок
 * закрыт для скринридера через inert на меню.
 */
export default function SearchBar({ label = 'Поиск по сайту' }: { label?: string }) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (query.trim().length === 0) return;
    router.push(`/search?query=${encodeURIComponent(query)}`);
    setQuery('');
  };

  return (
    <form className={styles.searchForm} onSubmit={handleSubmit} role="search" aria-label={label}>
      <input
        type="search"
        className={styles.input}
        placeholder="Поиск"
        aria-label="Поиск по сайту"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button type="submit" className={styles.iconButton} aria-label="Найти">
        <BsSearch aria-hidden="true" />
      </button>
    </form>
  );
}
