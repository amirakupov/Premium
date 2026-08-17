'use client';

import dynamic from 'next/dynamic';
import styles from './NeuronHero.module.css';

/**
 * Точка подключения 3D-нарратива.
 *
 * Сцена грузится через next/dynamic с ssr:false: three.js создаёт рендерер
 * поверх window, на сервере это падает. Побочный эффект — разметка сцены не
 * попадает в серверный HTML, поэтому `loading` отдаёт статичный постер с тем же
 * заголовком: он рендерится на сервере, держит LCP и остаётся единственным
 * содержимым, если WebGL недоступен или бандл ещё летит.
 */
const NeuronScene = dynamic(() => import('./NeuronScene'), {
    ssr: false,
    loading: () => (
        <div className={styles.poster}>
            <p className={styles.kicker}>Клиника неврологии «Премиум»</p>
            <h1 className={styles.title}>
                Мы стоим на страже здоровья{' '}
                <span className={styles.accent}>вашей нервной системы</span>
            </h1>
            <p className={styles.lede}>
                Диагностика и терапия заболеваний центральной и периферической нервной
                системы — доказательными и щадящими методами.
            </p>
            <a href="/contacts" className="btn btn--brass">
                Записаться на приём
            </a>
        </div>
    ),
});

export default function NeuronHero() {
    return (
        <section className={styles.stage} aria-label="Клиника неврологии «Премиум»">
            <NeuronScene />
        </section>
    );
}
