import styles from './EegLine.module.css';

/**
 * Фирменная ЭЭГ-линия: единственный орнамент сайта.
 * Рисуется один раз при появлении (CSS stroke-draw); глобальный
 * prefers-reduced-motion в globals.css отключает анимацию целиком.
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
                d="M0 24 H150 l10 -6 10 6 h60 l8 -16 8 30 6 -38 6 32 8 -14 8 6 h70 l10 -8 10 8 h56 l8 -12 8 18 6 -22 6 20 8 -6 h174"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    );
}