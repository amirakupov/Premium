import styles from './NeuronHero.module.css';

/**
 * Первый экран — глава «Пробуждение» сцены.
 *
 * Это серверный компонент: весь текст попадает в HTML, держит LCP, доступен
 * поисковикам и скринридерам и остаётся полностью читаемым, если WebGL
 * недоступен. В v1 та же разметка существовала дважды — внутри `<Scroll html>`
 * у drei и как серверный постер-дубль в `loading` — потому что текстом владела
 * сцена. Теперь текстом владеет страница, и дубль не нужен: то, что раньше
 * называлось постером, стало самим содержимым.
 *
 * `id="hero"` — якорь первой главы, см. neuron/sceneScript.ts.
 */
export default function NeuronHero() {
    return (
        <section id="hero" className={styles.stage} aria-label="Клиника неврологии «Премиум»">
            <div className={styles.inner}>
                <p className={styles.kicker}>Клиника неврологии «Премиум»</p>
                <h1 className={styles.title}>
                    Мы стоим на страже здоровья{' '}
                    <span className={styles.accent}>вашей нервной системы</span>
                </h1>
                <p className={styles.lede}>
                    Диагностика и терапия заболеваний центральной и периферической
                    нервной системы — доказательными и щадящими методами.
                </p>
                <a href="/contacts" className="btn btn--primary">
                    Записаться на приём
                </a>
            </div>
        </section>
    );
}