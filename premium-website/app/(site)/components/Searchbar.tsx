'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BsSearch } from 'react-icons/bs';
import styles from './Searchbar.module.css';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (query.trim().length === 0) return;
    router.push(`/search?query=${encodeURIComponent(query)}`);
    setQuery('');
  };

  return (
    <form className={styles.searchForm} onSubmit={handleSubmit} role="search">
      <input
        type="search"
        placeholder="Поиск по сайту"
        aria-label="Поиск по сайту"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button type="submit" className={styles.iconWrapper} aria-label="Найти">
        <BsSearch className={styles.icon} />
      </button>
    </form>
  );
}
