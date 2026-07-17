import Link from 'next/link';
import Image from 'next/image';
import styles from './Hero.module.css';
import { CLINIC } from '@/lib/constants';

/**
 * Главный экран: настоящий HTML вместо фигма-картинок с зашитым текстом —
 * контент индексируется поисковиками и читается скринридерами.
 */
export default function Hero() {
    return (
        <section className={styles.hero}>
            <div className={styles.main}>
                <div className={styles.mainText}>
                    <h1 className={styles.title}>
                        Клиника неврологии <span className={styles.accent}>Премиум</span> в Уфе
                    </h1>
                    <p className={styles.subtitle}>
                        Современная диагностика и эффективное лечение неврологических
                        заболеваний. Работаем без боли и без лишнего — только то, что
                        действительно нужно.
                    </p>

                    <div className={styles.actions}>
                        <Link href="/contacts" className={styles.cta}>
                            Записаться на приём
                        </Link>
                        <Link href="/services" className={styles.ctaGhost}>
                            Наши услуги
                        </Link>
                    </div>

                    <ul className={styles.badges}>
                        <li className={styles.badge}>Скидки ветеранам ВОВ</li>
                        <li className={styles.badge}>Бесплатная первичная консультация</li>
                    </ul>

                    <dl className={styles.stats}>
                        <div className={styles.stat}>
                            <dt className={styles.statValue}>15 000+</dt>
                            <dd className={styles.statLabel}>вылеченных пациентов</dd>
                        </div>
                        <div className={styles.stat}>
                            <dt className={styles.statValue}>28+</dt>
                            <dd className={styles.statLabel}>лет опыта в неврологии</dd>
                        </div>
                        <div className={styles.stat}>
                            <dt className={styles.statValue}>24/7</dt>
                            <dd className={styles.statLabel}>санитарный транспорт</dd>
                        </div>
                    </dl>
                </div>

                <figure className={styles.founder}>
                    <Image
                        src="/hero/founder.jpg"
                        alt="Габдрахманова Инга — главный врач и основатель клиники «Премиум»"
                        width={450}
                        height={675}
                        priority
                        sizes="(max-width: 768px) 80vw, 420px"
                        className={styles.founderPhoto}
                    />
                    <figcaption className={styles.founderCaption}>
                        <strong>Габдрахманова Инга</strong>
                        <span>Главный врач, основатель клиники</span>
                    </figcaption>
                </figure>
            </div>

            <div className={styles.emergency}>
                <div className={styles.emergencyText}>
                    <h2 className={styles.emergencyTitle}>Санитарный транспорт</h2>
                    <p className={styles.emergencySubtitle}>
                        Профессиональная помощь 24/7 — безопасно, быстро,
                        с медицинским сопровождением.
                    </p>
                </div>
                <div className={styles.emergencyActions}>
                    <a href={CLINIC.phoneHref} className={styles.emergencyPhone}>
                        {CLINIC.phone}
                    </a>
                    <Link href="/emergency" className={styles.emergencyLink}>
                        Подробнее и цены
                    </Link>
                </div>
            </div>
        </section>
    );
}
