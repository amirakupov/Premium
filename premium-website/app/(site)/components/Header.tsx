'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AiOutlineMenu, AiOutlineClose } from 'react-icons/ai';
import { FiPhone } from 'react-icons/fi';
import SearchBar from './Searchbar';
import styles from './Header.module.css';
import { CLINIC, NAV_LINKS } from '@/lib/constants';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <header className={styles.header}>
      <Link
        href="/"
        className={styles.logo}
        aria-label="На главную"
        onClick={closeMenu}
      >
        <span className={styles.logoName}>Премиум</span>
        <span className={styles.logoNote}>клиника неврологии</span>
      </Link>

      <nav className={styles.nav} aria-label="Основная навигация">
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>

      <a
        href={CLINIC.phoneHref}
        className={styles.headerPhone}
        aria-label={`Позвонить: ${CLINIC.phone}`}
      >
        <FiPhone aria-hidden="true" />
        <span className={styles.headerPhoneNumber}>{CLINIC.phone}</span>
      </a>

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

          <a href={CLINIC.phoneHref} className={styles.mobilePhone} onClick={closeMenu}>
            <FiPhone aria-hidden="true" />
            {CLINIC.phone}
          </a>

          <SearchBar />
        </div>
      </div>
    </header>
  );
}