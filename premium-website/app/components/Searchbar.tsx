'use client';
import { BsSearch } from 'react-icons/bs';
import styles from './Searchbar.module.css';

export default function SearchBar() {
  return (
    <form className={styles.searchForm} action="#">
      <input type="search" placeholder=" Ищи тут:)" />
      <div className={styles.iconWrapper}>
        <BsSearch className={styles.icon} />
      </div>
    </form>
  );
}
