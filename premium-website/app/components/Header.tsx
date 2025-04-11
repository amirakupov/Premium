// app/components/Header.tsx
'use client';

import Link from 'next/link';
import SearchBar from './Searchbar';
import { CSSProperties } from 'react';

const headerStyle: CSSProperties = {
  backgroundColor: '#fdfdfd', // Milk white
  display: 'flex',
  alignItems: 'center',
  padding: '0 2rem',
  height: '60px',
  borderBottom: '1px solid #eaeaea',
};

export default function Header() {
  return (
    <header style={headerStyle}>
      <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
        Clinic Logo
      </div>
      <nav
        style={{
          display: 'flex',
          gap: '2rem',
          flex: 1,
          justifyContent: 'center',
        }}
      >
        <Link href="/services">Услуги</Link>
        <Link href="/doctors">Врачи</Link>
        <Link href="/prices">Цены</Link>
        <Link href="/emergency">Скорая Помощь</Link>
        <Link href="/consultation">Записаться</Link>
        <Link href="/#contacts">Контакты</Link>
        <Link href="/#address">Адрес</Link>
      </nav>

      {/* The snippet's search circle (50x50 + border + padding + icon) */}
      <div style={{ marginLeft: '2rem' }}>
        <SearchBar />
      </div>
    </header>
  );
}
