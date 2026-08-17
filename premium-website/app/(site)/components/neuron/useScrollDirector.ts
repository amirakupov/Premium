'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DIRECTOR } from './params';
import { SCENE_SCRIPT } from './sceneScript';
import { clamp01, damp } from './utils';

/**
 * Прогресс сцены из НАТИВНОГО скролла документа.
 *
 * Почему не ScrollControls: drei держит собственный контейнер `overflow-y:auto`,
 * а это конфликтует с нативным скроллом на мобиле, ломает `scroll-behavior`,
 * загоняет текст в `<Scroll html>` (плохо для LCP и SEO) и делает продолжение
 * сцены по всей странице невозможным.
 *
 * Почему не доли 0…1 от длины документа: главы прибиты к центрам реальных
 * DOM-секций (`Chapter.anchor`). Позиция считается кусочно линейно между
 * метками, поэтому изменение длины контента (добавили услугу, врача с длинной
 * биографией) не сдвигает хореографию относительно текста, к которому она
 * относится.
 *
 * Замеры обновляет событие `refresh` ScrollTrigger — единая точка пересчёта
 * для всей страницы — плюс ResizeObserver на body: догрузились картинки,
 * высота документа поехала, метки надо пересчитать.
 */
export type Director = {
    /** сглаженная позиция таймлайна глав, 0…N-1 */
    p: number;
    /** мгновенная позиция без демпфера */
    targetP: number;
    /** нормированная скорость скролла 0…1, сглаженная */
    velocity: number;
    /** -1 вверх, +1 вниз, 0 — стоим */
    direction: number;
    /** метки замерены хотя бы раз */
    ready: boolean;
    /** продвинуть на кадр; dt в секундах */
    step: (dt: number) => void;
    /** приравнять сглаженное к мгновенному: первый кадр, возврат из фонового таба */
    snap: () => void;
};

type DirectorInternals = {
    director: Director;
    measure: () => void;
    setScroll: (y: number) => void;
};

function createDirector(): DirectorInternals {
    const marks = new Float64Array(SCENE_SCRIPT.length);
    let viewport = 1;
    let scrollY = 0;
    let lastScrollY = 0;

    /** Позиция таймлайна для «фокуса» — центра вьюпорта в координатах документа. */
    const mapFocus = (focus: number) => {
        const last = marks.length - 1;
        if (focus <= marks[0]) return 0;
        if (focus >= marks[last]) return last;
        for (let i = 0; i < last; i += 1) {
            if (focus < marks[i + 1]) {
                return i + (focus - marks[i]) / (marks[i + 1] - marks[i]);
            }
        }
        return last;
    };

    const director: Director = {
        p: 0,
        targetP: 0,
        velocity: 0,
        direction: 0,
        ready: false,

        step(dt: number) {
            if (dt <= 0) return;
            const dy = scrollY - lastScrollY;
            lastScrollY = scrollY;

            director.targetP = mapFocus(scrollY + viewport * 0.5);
            director.p = damp(director.p, director.targetP, DIRECTOR.PROGRESS_LAMBDA, dt);

            const instant = clamp01(Math.abs(dy) / dt / DIRECTOR.VELOCITY_SCALE);
            director.velocity = damp(director.velocity, instant, DIRECTOR.VELOCITY_LAMBDA, dt);
            if (Math.abs(dy) > 0.5) director.direction = dy > 0 ? 1 : -1;
        },

        snap() {
            lastScrollY = scrollY;
            director.targetP = mapFocus(scrollY + viewport * 0.5);
            director.p = director.targetP;
            director.velocity = 0;
        },
    };

    const measure = () => {
        viewport = window.innerHeight;
        scrollY = window.scrollY;
        const docHeight = document.documentElement.scrollHeight;
        const maxFocus = Math.max(viewport * 0.5, docHeight - viewport * 0.5);

        let previous = Number.NaN;
        for (let i = 0; i < SCENE_SCRIPT.length; i += 1) {
            const element = document.querySelector(SCENE_SCRIPT[i].anchor);
            if (!element) {
                /* Якоря нет (сцену смонтировали не на главной, секцию убрали) —
                   ставим метку вплотную к предыдущей: глава схлопывается в точку,
                   а таймлайн остаётся непрерывным и монотонным. */
                marks[i] = Number.isNaN(previous) ? 0 : previous + 1;
                previous = marks[i];
                continue;
            }
            const rect = element.getBoundingClientRect();
            let center = rect.top + scrollY + rect.height * 0.5;
            /* Последняя глава обязана быть достижимой: если её центр ниже самого
               нижнего возможного фокуса, прижимаем к нему. Иначе финал (ЭЭГ)
               никогда не прочертится до конца. */
            if (i === SCENE_SCRIPT.length - 1) center = Math.min(center, maxFocus);
            // монотонность: без неё mapFocus делит на неположительную длину
            if (!Number.isNaN(previous) && center <= previous) center = previous + 1;
            marks[i] = center;
            previous = center;
        }
        director.ready = true;
    };

    const setScroll = (y: number) => {
        scrollY = y;
    };

    return { director, measure, setScroll };
}

/**
 * `enabled: false` — режим `prefers-reduced-motion`: сцена стоит на первой
 * главе, слушатели и замеры не нужны вообще.
 */
export function useScrollDirector(enabled: boolean) {
    const internals = useRef<DirectorInternals | null>(null);
    internals.current ??= createDirector();

    useEffect(() => {
        if (!enabled) return;
        const { director, measure, setScroll } = internals.current!;
        // Регистрация идемпотентна: секции страницы регистрируют плагин сами,
        // но сцена может смонтироваться раньше любой из них.
        gsap.registerPlugin(ScrollTrigger);

        let raf = 0;
        const schedule = () => {
            if (raf) return;
            raf = requestAnimationFrame(() => {
                raf = 0;
                measure();
            });
        };

        /* Положение скролла кэшируем в слушателе, а не читаем window.scrollY из
           useFrame: чтение в середине кадра — лишний повод для синхронного
           пересчёта стилей. */
        const onScroll = () => setScroll(window.scrollY);

        measure();
        director.snap();

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', schedule);
        window.addEventListener('orientationchange', schedule);
        window.addEventListener('load', schedule);
        ScrollTrigger.addEventListener('refresh', measure);

        const observer = new ResizeObserver(schedule);
        observer.observe(document.body);
        document.fonts?.ready.then(schedule).catch(() => {});

        return () => {
            if (raf) cancelAnimationFrame(raf);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', schedule);
            window.removeEventListener('orientationchange', schedule);
            window.removeEventListener('load', schedule);
            ScrollTrigger.removeEventListener('refresh', measure);
            observer.disconnect();
        };
    }, [enabled]);

    return internals.current.director;
}