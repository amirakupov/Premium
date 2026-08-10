import Link from 'next/link';
import Image from 'next/image';
import styles from './Hero.module.css';
import EegLine from './EegLine';

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
                        Клиника неврологии <span className={styles.accent}>«Премиум»</span> в Уфе
                    </h1>
                    <p className={styles.subtitle}>
                        Современная диагностика и эффективное лечение неврологических
                        заболеваний. Работаем без боли и без лишнего — только то, что
                        действительно нужно.
                    </p>

                    <div className={styles.actions}>
                        <Link href="/contacts" className="btn btn--brass">
                            Записаться на приём
                        </Link>
                        <Link href="/services" className="btn btn--ghost">
                            Наши услуги
                        </Link>
                    </div>

                    <ul className={styles.badges}>
                        <li className={styles.badge}>Скидки ветеранам ВОВ</li>
                        <li className={styles.badge}>Бесплатная первичная консультация</li>
                    </ul>

                    <EegLine className={styles.eeg} />

                    <dl className={styles.stats}>
                        <div className={styles.stat}>
                            <dt className={styles.statValue}>15 000+</dt>
                            <dd className={styles.statLabel}>вылеченных пациентов</dd>
                        </div>
                        <div className={styles.stat}>
                            <dt className={styles.statValue}>28+</dt>
                            <dd className={styles.statLabel}>лет опыта в неврологии</dd>
                        </div>
                    </dl>
                </div>

                <figure className={styles.founder}>
                    <div className={styles.founderFrame}>
                        <Image
                            src="/hero/founder.jpg"
                            alt="Габдрахманова Инга — главный врач и основатель клиники «Премиум»"
                            width={450}
                            height={675}
                            priority
                            sizes="(max-width: 768px) 80vw, 420px"
                            className={styles.founderPhoto}
                        />
                    </div>
                    <figcaption className={styles.founderCaption}>
                        <strong>Габдрахманова Инга</strong>
                        <span>Главный врач, основатель клиники</span>
                    </figcaption>
                </figure>
            </div>
        </section>
    );
}
