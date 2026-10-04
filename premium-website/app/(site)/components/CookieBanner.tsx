'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './CookieBanner.module.css';

export const COOKIE_CONSENT_KEY = 'cookie_consent';
export const COOKIE_CONSENT_EVENT = 'cookie-consent';

export type CookieConsent = 'accepted' | 'declined' | null;

/** Текущее решение пользователя. `'true'` — значение, которое писала прежняя версия баннера. */
export function readCookieConsent(): CookieConsent {
  try {
    const value = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (value === 'true' || value === 'accepted') return 'accepted';
    if (value === 'declined') return 'declined';
    return null;
  } catch {
    return null;
  }
}

/**
 * Баннер рендерится в серверный HTML всегда: решение «показывать ли» принимает
 * inline-скрипт в <head> (html[data-cookie]) ещё до пейнта, и CSS прячет
 * баннер, если выбор уже сделан — он больше не выпрыгивает после гидрации.
 * Здесь остаётся только снять его из дерева.
 *
 * Отказ — равноправная кнопка. Выбор уважает карта в футере (MapEmbed): без
 * согласия iframe Яндекс Карт не грузится.
 */
export default function CookieBanner() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (readCookieConsent() !== null) setVisible(false);
  }, []);

  const decide = (consent: 'accepted' | 'declined') => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, consent);
    } catch {
      /* без localStorage выбор проживёт до перезагрузки */
    }
    document.documentElement.dataset.cookie = 'set';
    window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className={styles.banner} role="region" aria-label="Использование cookies">
      <p className={styles.message}>
        Сайт использует cookies для своей работы и показа карты. Подробнее в&nbsp;
        <Link href="/privacy" className={styles.link}>
          Политике конфиденциальности
        </Link>.
      </p>
      <div className={styles.buttons}>
        <button type="button" className={styles.buttonGhost} onClick={() => decide('declined')}>
          Отклонить
        </button>
        <button type="button" className={styles.button} onClick={() => decide('accepted')}>
          Принять
        </button>
      </div>
    </div>
  );
}
