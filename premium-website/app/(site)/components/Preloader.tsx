'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import styles from './Preloader.module.css';

export const PRELOADER_SEEN_KEY = 'preloaderSeen';
export const PRELOADER_DONE_EVENT = 'preloaderFinished';

const WORD = 'ПРЕМИУМ';

/**
 * Тайминги занавеса, мс. Должны совпадать с Preloader.module.css — там они
 * записаны литералами, потому что CSS-анимация не читает JS-константы.
 *
 * Полная длина: LEAVE_AT + LEAVE_DURATION = 1700 мс анимации (было ~3700);
 * плюс ~80–100 мс от вставки в DOM до старта — итого занавес ≤ 1,8 с.
 */
export const CURTAIN = {
    /** буквы: stagger и длительность появления одной буквы */
    LETTER_STAGGER: 50,
    LETTER_DURATION: 450,
    /** подзаголовок стартует, когда последняя буква ещё в пути */
    SUBTITLE_DELAY: 450,
    SUBTITLE_DURATION: 600,
    /** когда занавес начинает уезжать */
    LEAVE_AT: 1250,
    LEAVE_DURATION: 450,
    /** нижняя граница: короче этого занавес читается как глюк, а не как заставка */
    MIN_VISIBLE: 700,
} as const;

/**
 * Занавес первого захода.
 *
 * Анимация целиком на CSS (см. module.css): семь букв со stagger, подзаголовок и
 * уезд. GSAP здесь не нужен — а вместе с ним из критического пути главной
 * уходит и весь его чанк. Второе, более важное следствие: transform/opacity
 * на CSS-анимации ведёт композитор, и буквы идут ровно даже тогда, когда
 * главный поток занят чем-то тяжёлым.
 *
 * Компонент не решает, показывать ли себя: это делает HomeShell вместе с
 * inline-скриптом в <head> (data-curtain на <html>). Здесь только:
 *   — если занавес не нужен (уже видели в сессии, reduced-motion) — сразу
 *     отдать управление;
 *   — иначе через LEAVE_AT переключиться в «уезд» и по его окончании
 *     сообщить наверх.
 */
export default function Preloader({ onComplete }: { onComplete?: () => void }) {
    const [leaving, setLeaving] = useState(false);
    const onCompleteRef = useRef(onComplete);
    onCompleteRef.current = onComplete;
    const done = useRef(false);

    const finish = () => {
        if (done.current) return;
        done.current = true;
        onCompleteRef.current?.();
    };

    useEffect(() => {
        const root = document.documentElement;
        let seen = false;
        try {
            seen = sessionStorage.getItem(PRELOADER_SEEN_KEY) !== null;
        } catch {
            /* sessionStorage недоступен (приватный режим с запретом) — играем как в первый раз */
        }
        if (seen || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            finish();
            return;
        }
        /* Клиентская навигация на «/» с другой страницы: inline-скрипт ставил
           атрибут для той страницы, где занавеса нет. Поднимаем его здесь —
           он включает и сам занавес, и блокировку скролла под ним. */
        root.dataset.curtain = '1';

        const timer = window.setTimeout(
            () => setLeaving(true),
            Math.max(CURTAIN.LEAVE_AT, CURTAIN.MIN_VISIBLE),
        );
        return () => window.clearTimeout(timer);
        // finish читает только рефы
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* Страховка: если animationend не пришёл (вкладка ушла в фон и анимация
       встала), занавес всё равно снимается по таймеру. */
    useEffect(() => {
        if (!leaving) return;
        const timer = window.setTimeout(finish, CURTAIN.LEAVE_DURATION + 250);
        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [leaving]);

    return (
        <div
            className={`${styles.preloader} ${leaving ? styles.leaving : ''}`}
            /* Для скринридера занавеса не существует: весь смысл несёт контент под
               ним; aria-busy на <html> ставит HomeShell, пока занавес виден. */
            aria-hidden="true"
            data-preloader=""
            onAnimationEnd={(event) => {
                // анимации букв всплывают сюда же — нужна только своя, уезд
                if (leaving && event.target === event.currentTarget) finish();
            }}
        >
            <div className={styles.centered}>
                <div className={styles.word}>
                    {WORD.split('').map((letter, i) => (
                        <span
                            key={`${letter}-${i}`}
                            className={styles.letter}
                            style={{ '--i': i } as CSSProperties}
                        >
                            {letter}
                        </span>
                    ))}
                </div>
                <div className={styles.subtitle}>медицинская клиника</div>
            </div>
        </div>
    );
}
