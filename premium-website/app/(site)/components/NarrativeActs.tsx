import EegLine from './EegLine';
import styles from './NarrativeActs.module.css';

/**
 * Два нарративных экрана между хиро и содержательной частью главной плюс финал.
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
                <h2 className={styles.title} data-reveal="heading">
                    Каждый симптом — это сигнал
                </h2>
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
 * ────────────────────────────── ФИНАЛ ──────────────────────────────
 *
 * Три якоря под три главы сцены (`exit-draw`, `exit-verdict`, `exit-exit`) —
 * порядок здесь обязан совпадать с порядком глав в `sceneScript.ts`: метки
 * `useScrollDirector.measure()` должны идти монотонно сверху вниз.
 *
 *   #outro-draw    — разгон под прочерчивание: вспышка стягивается в перо,
 *                    перо идёт вправо, сетка проступает впереди него;
 *   #outro-verdict — стоп-кадр: диаграмма закончена и стоит, страница наконец
 *                    что-то говорит. До этой задачи самый смысловой момент
 *                    нарратива был пустым `<div aria-hidden>` без единого слова;
 *   #outro-exit    — выход: обвязка гаснет, диаграмма передаёт эстафету
 *                    статичному SVG-орнаменту в футере.
 *
 * Почему финал не привязан к самому футеру: он тёмно-синий и стеклянный
 * (`backdrop-filter`), сцена за ним размывается почти в ноль — фирменную линию
 * в нём было бы не разобрать. Поэтому главы привязаны к якорям ПЕРЕД футером, а
 * футер приходит уже как спокойное основание страницы.
 *
 * Деградация (`prefers-reduced-motion`, `html[data-scene="off"]`,
 * `html[data-a11y="1"]`) сворачивает только разгоны — они без сцены пустые.
 * `#outro-verdict` виден всегда и во всех режимах: в нём текст и кнопка
 * «Записаться», скрывать их нельзя ни при каких обстоятельствах.
 */
export function ExitStage() {
    return (
        <section id="outro" className={styles.outro}>
            <div id="outro-draw" className={styles.outroDraw} aria-hidden="true" />

            <div id="outro-verdict" className={styles.verdict}>
                <div className={styles.verdictSticky}>
                    <div className={styles.verdictInner}>
                        <h2 className={styles.verdictTitle} data-reveal="verdict-heading">
                            Сигнал дошёл
                        </h2>
                        <p className={styles.verdictText} data-reveal="verdict">
                            Ровный ритм — это и есть результат лечения. Мы ведём к нему
                            последовательно: находим причину, восстанавливаем
                            проводимость, наблюдаем дальше.
                        </p>
                        <a
                            href="/contacts"
                            className={`btn btn--primary ${styles.verdictCta}`}
                            data-reveal="verdict"
                        >
                            Записаться на приём
                        </a>
                        {/* Статичная фирменная линия для тех, у кого 3D-диаграммы не
                            будет вовсе: отключены анимации, нет WebGL или включён
                            режим для слабовидящих. Остальным её рисует сцена. */}
                        <EegLine className={styles.staticEeg} />
                    </div>
                    {/* Приборная обвязка: метки отведений и шкала развёртки.

                        Это DOM, а не текст в WebGL, и намеренно: troika-three-text
                        или drei <Text> стоили бы полсотни килобайт бандла, своего
                        атласа, возни с кириллицей и резкостью — а текст перестал бы
                        быть текстом. Коробка лежит в обычном потоке под текстом, и
                        это ЕДИНСТВЕННЫЙ источник правды о положении диаграммы:
                        сцена читает её прямоугольник один раз на resize
                        (neuron/finaleFrame.ts), а не проецирует мировые координаты
                        в экранные на каждом кадре.

                        Разметка обезличена сознательно: только стандартные названия
                        отведений системы 10–20 и стандартные калибровки. Ни имени,
                        ни даты, ни номера исследования, ни заключения — страница не
                        должна выглядеть как чей-то медицинский документ. */}
                    <div className={styles.rig} data-reveal="rig" aria-hidden="true">
                        <ul className={styles.leads}>
                            <li>Fp1</li>
                            <li>F3</li>
                            <li>C3</li>
                            <li>P3</li>
                            <li>O1</li>
                        </ul>
                        <div className={styles.calibration}>
                            <span>30 мм/с</span>
                            <span>50 мкВ/мм</span>
                            <span>0.5—35 Гц</span>
                        </div>
                    </div>
                </div>
            </div>

            <div id="outro-exit" className={styles.outroExit} aria-hidden="true" />
        </section>
    );
}

export function DiagnosticsAct() {
    return (
        <section id="diagnostics" className={`${styles.act} ${styles.actCenter}`}>
            <div className={styles.inner}>
                <h2 className={styles.title} data-reveal="heading">
                    Сигнал доходит до цели
                </h2>
                <p className={styles.text}>
                    За 3 года — более{' '}
                    {/* Цифра-факт: SectionMotion прокручивает её счётчиком при входе
                        во вьюпорт и по завершении возвращает исходный текст дословно. */}
                    <span data-count="10000">10 000</span> пациентов. ЭЭГ, УЗДГ и осмотр
                    невролога в один визит.
                </p>
                {/* Статичная фирменная линия — её видят только те, у кого отключены
                    анимации: для них сцена стоит на первой главе и 3D-финал не
                    прочерчивается. Всем остальным линию рисует сцена. */}
                <EegLine className={styles.staticEeg} />
            </div>
        </section>
    );
}
