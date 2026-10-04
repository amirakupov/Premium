'use client';

import { useEffect, useState } from 'react';
import { COOKIE_CONSENT_EVENT, readCookieConsent, type CookieConsent } from './CookieBanner';
import styles from './Footer.module.css';

const WIDGET_SRC =
  'https://yandex.ru/map-widget/v1/?um=constructor%3Ad327fce798422fcd5d920a9ccc441768bc8681acc45894d3adc940841067f112&source=constructor';
const MAP_LINK =
  'https://yandex.ru/maps/?um=constructor%3Ad327fce798422fcd5d920a9ccc441768bc8681acc45894d3adc940841067f112&source=constructorLink';

/**
 * Карта в футере грузится только после согласия на cookies: виджет Яндекс Карт
 * ставит свои cookies, и именно про него говорит текст баннера. До решения и
 * при отказе — плашка со ссылкой на карту в новой вкладке.
 *
 * После согласия карта тоже не вставляется сама: iframe виджета стоил кадр в
 * 183 мс на подходе к футеру и показывал внутри футера чужую рекламу
 * (docs/perf-v4/report.md, 4.3 и UI 5). Теперь — кнопка «Показать карту»;
 * ссылка «Открыть в Яндекс Картах» остаётся для тех, кому виджет не нужен.
 */
export default function MapEmbed() {
  const [consent, setConsent] = useState<CookieConsent>(null);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    const sync = () => setConsent(readCookieConsent());
    sync();
    window.addEventListener(COOKIE_CONSENT_EVENT, sync);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, sync);
  }, []);

  if (consent === 'accepted' && opened) {
    return (
      <iframe
        src={WIDGET_SRC}
        width="500"
        height="400"
        frameBorder="0"
        title="Клиника «Премиум» на карте"
      />
    );
  }

  return (
    <div className={styles.mapPlaceholder}>
      <p className={styles.text}>
        {consent === 'accepted'
          ? 'Интерактивная карта Яндекса откроется по нажатию.'
          : consent === 'declined'
            ? 'Карта не загружена: вы отклонили использование cookies.'
            : 'Карта загрузится после согласия на использование cookies.'}
      </p>
      {consent === 'accepted' ? (
        <button type="button" className={styles.mapButton} onClick={() => setOpened(true)}>
          Показать карту
        </button>
      ) : null}
      <a href={MAP_LINK} target="_blank" rel="noopener noreferrer" className={styles.link}>
        Открыть в Яндекс Картах
      </a>
    </div>
  );
}
