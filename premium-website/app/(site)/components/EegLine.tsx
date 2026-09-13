import styles from './EegLine.module.css';

/**
 * Фирменная ЭЭГ-линия: единственный орнамент сайта.
 * Рисуется один раз при появлении (CSS stroke-draw); глобальный
 * prefers-reduced-motion в globals.css отключает анимацию целиком.
 *
 * Атрибут `d` НЕ пишется руками: он сгенерирован из `EEG_PROFILE`
 * (neuron/geometry/eeg.ts) — того же массива, из которого строится 3D-лента
 * финала. Поменяли профиль — прогоните `npm run eeg:path -- --write`, иначе на
 * странице окажутся две разные кривые. Расхождение ловится тестом
 * `lib/finale-frame.test.ts`, чтобы оно не могло возникнуть молча.
 *
 * 3D-версия отличается микрошумом изолинии и переменной толщиной пера — они
 * настолько мелкие, что обе версии читаются как одна кривая, а опорные точки у
 * них общие.
 */
export default function EegLine({ className }: { className?: string }) {
    return (
        <svg
            className={`${styles.eeg} ${className ?? ''}`}
            viewBox="0 0 640 48"
            fill="none"
            aria-hidden="true"
            focusable="false"
        >
            <path
                className={styles.trace}
                d="M0 24 h20 v-11 h34 v11 h32 h64 l10 -6 l10 6 h60 l8 -16 l8 30 l6 -38 l6 32 l8 -14 l8 6 h70 l10 -8 l10 8 h56 l8 -12 l8 18 l6 -22 l6 20 l8 -6 h174"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    );
}