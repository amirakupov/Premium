// app/components/Header.tsx

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AiOutlineMenu, AiOutlineClose } from 'react-icons/ai';
import SearchBar from './Searchbar';
import styles from './Header.module.css';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  // If you want to close by tapping the blurred background:
  const closeMenu = () => {
    setMenuOpen(false);
  };

  return (
    <header className={styles.header}>
      {/* LEFT: LOGO */}
      <Link 
        href="/" 
        className={styles.logo} 
        aria-label="Homepage"
        onClick={closeMenu} 
      >
        PREMIUM
      </Link>

      {/* DESKTOP NAV */}
      <nav className={styles.nav}>
        <Link href="/services">Услуги</Link>
        <Link href="/doctors">Врачи</Link>
        <Link href="/contacts">Контакты</Link>
        <Link href="/#address">Адрес</Link>
        <Link href="/emergency" className={styles.emergencyLink}>
          Экстренная помощь
        </Link>
      </nav>

      {/* DESKTOP SEARCH */}
      <div className={styles.desktopSearch}>
        <SearchBar />
      </div>

      {/* BURGER or CLOSE (MOBILE ONLY) */}
      <button
        className={`${styles.burger} ${menuOpen ? styles.rotateIcon : ''}`}
        onClick={toggleMenu}
        aria-label="Mobile Menu"
      >
        {menuOpen ? <AiOutlineClose /> : <AiOutlineMenu />}
      </button>

      {/* FULLSCREEN OVERLAY (MOBILE) */}
      <div
        className={`${styles.mobileNav} ${
          menuOpen ? styles.mobileNavOpen : ''
        }`}
        onClick={closeMenu} /* if you want to close by tapping the blur */
      >
        <div
          className={styles.mobileNavContent}
          onClick={(e) => e.stopPropagation()} /* prevent close when tapping menu */
        >
          <Link href="/services" onClick={() => setMenuOpen(false)}>
            Услуги
          </Link>
          <Link href="/doctors" onClick={() => setMenuOpen(false)}>
            Врачи
          </Link>
          <Link href="/contacts" onClick={() => setMenuOpen(false)}>
            Записаться
          </Link>
          <Link href="/#address" onClick={() => setMenuOpen(false)}>
            Адрес
          </Link>
          <Link
            href="/emergency"
            onClick={() => setMenuOpen(false)}
            className={styles.emergencyLink}
          >
            Скорая
          </Link>

          {/* Mobile Search (optional) */}
          <SearchBar />
        </div>
      </div>
    </header>
  );
}
