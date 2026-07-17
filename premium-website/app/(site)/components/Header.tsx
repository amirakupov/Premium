'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AiOutlineMenu, AiOutlineClose } from 'react-icons/ai';
import SearchBar from './Searchbar';
import styles from './Header.module.css';
import { EMERGENCY_LINK, NAV_LINKS } from '@/lib/constants';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={styles.header}>
      <Link
        href="/"
        className={styles.logo}
        aria-label="На главную"
        onClick={closeMenu}
      >
        PREMIUM
      </Link>

      <nav className={styles.nav} aria-label="Основная навигация">
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
        <Link href={EMERGENCY_LINK.href} className={styles.emergencyLink}>
          {EMERGENCY_LINK.label}
        </Link>
      </nav>

      <div className={styles.desktopSearch}>
        <SearchBar />
      </div>

      <button
        className={`${styles.burger} ${menuOpen ? styles.rotateIcon : ''}`}
        onClick={() => setMenuOpen((open) => !open)}
        aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
        aria-expanded={menuOpen}
        aria-controls="mobile-nav"
      >
        {menuOpen ? <AiOutlineClose /> : <AiOutlineMenu />}
      </button>

      <div
        id="mobile-nav"
        className={`${styles.mobileNav} ${menuOpen ? styles.mobileNavOpen : ''}`}
        onClick={closeMenu}
      >
        <div
          className={styles.mobileNavContent}
          onClick={(e) => e.stopPropagation()}
        >
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} onClick={closeMenu}>
              {link.label}
            </Link>
          ))}
          <Link
            href={EMERGENCY_LINK.href}
            onClick={closeMenu}
            className={styles.emergencyLink}
          >
            {EMERGENCY_LINK.label}
          </Link>

          <SearchBar />
        </div>
      </div>
    </header>
  );
}
