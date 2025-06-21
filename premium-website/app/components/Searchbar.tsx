'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BsSearch } from 'react-icons/bs';
import styles from './Searchbar.module.css';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSubmit = (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    if (query.trim().length === 0) return;
    router.push(`/search?query=${encodeURIComponent(query)}`);
    setQuery('');
  };


  return (
    <form className={styles.searchForm} onSubmit={handleSubmit}>
      <input
        type="search"
        placeholder="Ищи тут:)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button type="submit" className={styles.iconWrapper}>
        <BsSearch className={styles.icon} />
      </button>
    </form>
  );
}

