import EegLine from './EegLine';
import styles from './NarrativeActs.module.css';

/**
 * Два нарративных экрана между хиро и содержательной частью главной.
 *
 * В v1 этот текст жил внутри `<Scroll html>` у drei — то есть в клиентском
 * компоненте, вне серверного HTML, и занимал второй и третий «экраны» одной
 * секции-хиро. Здесь он тот же дословно, но обычной серверной разметкой, и у
 * каждого экрана появился собственный DOM-якорь: главы сцены привязаны к
 * `#symptom` и `#diagnostics`, а не к долям длины документа.
 */

export function SymptomAct() {
    return (
        <section id="symptom" className={`${styles.act} ${styles.actEnd}`}>
            <div className={styles.inner}>
                <h2 className={styles.title}>Каждый симптом — это сигнал</h2>
                <p className={styles.text}>
                    Головная боль, головокружение, онемение — не случайность, а
                    нарушение проводимости. Мы находим, где сигнал теряется, и
                    восстанавливаем путь — без лишних медикаментов и операций.
                </p>
            </div>
        </section>
    );
}

/**
 * Сцена последней главы. Пустой блок воздуха перед футером: здесь из вспышки
 * прочерчивается линия ЭЭГ и фон возвращается в светлый.
 *
 * Почему не сам футер: он тёмно-синий и стеклянный (`backdrop-filter`), сцена
 * за ним размывается почти в ноль — фирменную линию в нём было бы не разобрать.
 * Поэтому глава привязана к якорю перед футером, а футер приходит уже как
 * спокойное основание страницы.
 */
export function ExitStage() {
    return <div id="outro" className={styles.outro} aria-hidden="true" />;
}

export function DiagnosticsAct() {
    return (
        <section id="diagnostics" className={`${styles.act} ${styles.actCenter}`}>
            <div className={styles.inner}>
                <h2 className={styles.title}>Сигнал доходит до цели</h2>
                <p className={styles.text}>
                    За 3 года — более 10 000 пациентов. ЭЭГ, УЗДГ и осмотр невролога
                    в один визит.
                </p>
                {/* Статичная фирменная линия — её видят только те, у кого отключены
                    анимации: для них сцена стоит на первой главе и 3D-финал не
                    прочерчивается. Всем остальным линию рисует сцена. */}
                <EegLine className={styles.staticEeg} />
            </div>
        </section>
    );
}