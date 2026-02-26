'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './CookieBanner.module.css';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('cookie_consent')) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className={styles.banner}>
      <p className={styles.message}>
        Мы используем Cookies для улучшения работы сайта и корректного отображения карты. Подробнее в&nbsp;
        <Link href="/privacy" className={styles.link}>
          Политике конфиденциальности
        </Link>.
      </p>
      <button className={styles.button} onClick={handleAccept}>
        Принять
      </button>
    </div>
  );
}
