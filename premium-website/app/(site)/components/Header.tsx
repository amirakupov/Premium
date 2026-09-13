'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useFocusTrap } from '@/app/(admin)/admin/components/ui/useFocusTrap';
import { AiOutlineMenu, AiOutlineClose } from 'react-icons/ai';
import { FiPhone } from 'react-icons/fi';
import SearchBar from './Searchbar';
import styles from './Header.module.css';
import { CLINIC, NAV_LINKS } from '@/lib/constants';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  /* Пока меню открыто, Tab не выходит наружу; при закрытии фокус возвращается
     на бургер, с которого меню открыли. Тот же хук, что у слоёв админки. */
  const mobileNavRef = useFocusTrap(menuOpen);

  const closeMenu = () => setMenuOpen(false);

  /* aria-current: точное совпадение или вложенный путь («/services/eeg» → «Услуги»).
     Якорная ссылка «/#address» текущей не бывает. */
  const isCurrent = (href: string) =>
    !href.includes('#') && (pathname === href || pathname.startsWith(`${href}/`));

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
          <Link
            key={link.href}
            href={link.href}
            aria-current={isCurrent(link.href) ? 'page' : undefined}
          >
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

      {/* Закрытое меню всегда в DOM ради CSS-анимации открытия, поэтому оно
          inert + aria-hidden: его ссылки и поиск не фокусируются табом и не
          видны скринридеру, пока меню закрыто. */}
      <div
        id="mobile-nav"
        ref={mobileNavRef}
        className={`${styles.mobileNav} ${menuOpen ? styles.mobileNavOpen : ''}`}
        onClick={closeMenu}
        inert={!menuOpen}
        aria-hidden={!menuOpen}
      >
        <div
          className={styles.mobileNavContent}
          onClick={(e) => e.stopPropagation()}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeMenu}
              aria-current={isCurrent(link.href) ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}

          <a href={CLINIC.phoneHref} className={styles.mobilePhone} onClick={closeMenu}>
            <FiPhone aria-hidden="true" />
            {CLINIC.phone}
          </a>

          <SearchBar label="Поиск по сайту в меню" />
        </div>
      </div>
    </header>
  );
}