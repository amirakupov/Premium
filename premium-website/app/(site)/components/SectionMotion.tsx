'use client';

import { useEffect } from 'react';

/**
 * Анимации DOM-секций главной.
 *
 * Один клиентский модуль на всю страницу вместо 'use client' в каждой секции:
 * Services, Doctors, Quote и ClinicFotos остаются серверными компонентами, а
 * анимации находят свои узлы по data-атрибутам. Так разметка секций попадает в
 * серверный HTML целиком, и в клиентский бандл не уезжает ничего, кроме этого
 * файла.
 *
 * ── Две вещи, на которых легко обжечься ──
 *
 * 1. Transform на ПРЕДКЕ стеклянного элемента обрывает backdrop root: стекло
 *    перестаёт видеть страницу за собой и превращается в плоскую плёнку.
 *    Поэтому анимируются сами карточки, а контейнер служит только триггером.
 *
 * 2. У .card в модулях уже висит `transition: transform .5s` для ховера. Если
 *    покадрово писать transform поверх перехода, движение превращается в кашу.
 *    Поэтому на время появления переход снимается, а `clearProps` в конце
 *    убирает и его, и инлайновые стили — ховер работает как раньше.
 *
 * Все триггеры живут внутри gsap.context и умирают вместе с ним: при навигации
 * в Next.js утечка триггеров даёт «призрачные» анимации на следующей странице.
 *
 * gsap импортируется динамически, из эффекта: этот модуль — единственный, кому
 * gsap нужен в первом кадре главной (прелоадер переехал на CSS, режиссёр сцены
 * живёт в ленивом чанке сцены). Статический импорт тащил бы gsap + ScrollTrigger
 * в критический бандл каждой страницы сайта, а нужны они только после гидрации
 * и только ниже первого экрана. Чанк общий со сценой — дубля нет.
 */
export default function SectionMotion() {
    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        let cancelled = false;
        let ctx: gsap.Context | undefined;

        /* Сетки услуг и врачей приезжают стримом за границами Suspense. Пока
           документ грузится, их карточек в DOM может ещё не быть — а триггеры
           ищут узлы один раз. Событие load приходит после того, как стрим
           закрыт целиком, поэтому ждём его; ScrollTrigger по нему же делает
           refresh, а режиссёр сцены — measure(). */
        const loaded =
            document.readyState === 'complete'
                ? Promise.resolve()
                : new Promise<void>((resolve) => window.addEventListener('load', () => resolve(), { once: true }));

        Promise.all([loaded, import('gsap'), import('gsap/ScrollTrigger')]).then(([, { gsap }, { ScrollTrigger }]) => {
        if (cancelled) return;
        gsap.registerPlugin(ScrollTrigger);
        const numbers = new Intl.NumberFormat('ru-RU');

        ctx = gsap.context(() => {
            /* Заголовки: маска снизу вверх. clip-path не участвует ни в одном
               CSS-переходе секций, поэтому конфликта нет. */
            gsap.utils.toArray<HTMLElement>('[data-reveal="heading"]').forEach((element) => {
                gsap.fromTo(
                    element,
                    { clipPath: 'inset(0% 0% 100% 0%)', y: 14 },
                    {
                        clipPath: 'inset(0% 0% 0% 0%)',
                        y: 0,
                        duration: 0.9,
                        ease: 'power3.out',
                        clearProps: 'clipPath,transform',
                        scrollTrigger: { trigger: element, start: 'top 88%', once: true },
                    },
                );
            });

            /* Карточки: stagger по 60 мс. Триггер — контейнер, движение — на
               самих карточках. */
            gsap.utils.toArray<HTMLElement>('[data-reveal-group]').forEach((group) => {
                const cards = gsap.utils.toArray<HTMLElement>(
                    '[data-reveal="card"], [data-reveal="card-tilt"]',
                    group,
                );
                if (!cards.length) return;
                const tilted = group.querySelector('[data-reveal="card-tilt"]') !== null;

                gsap.set(cards, { transition: 'none' });
                gsap.fromTo(
                    cards,
                    { opacity: 0, y: 26, rotate: tilted ? -1.4 : 0 },
                    {
                        opacity: 1,
                        y: 0,
                        rotate: 0,
                        duration: 0.72,
                        ease: 'power3.out',
                        stagger: 0.06,
                        clearProps: 'transform,opacity,transition',
                        scrollTrigger: { trigger: group, start: 'top 82%', once: true },
                    },
                );
            });

            /* Цифра-факт: счётчик при входе во вьюпорт. По завершении текст
               возвращается к исходному дословно — форматирование Intl ставит
               неразрывный пробел, и без возврата разметка тихо разошлась бы с
               тем, что отдал сервер. */
            gsap.utils.toArray<HTMLElement>('[data-count]').forEach((element) => {
                const target = Number(element.dataset.count);
                if (!Number.isFinite(target)) return;
                const original = element.textContent ?? '';
                const proxy = { value: 0 };

                gsap.to(proxy, {
                    value: target,
                    duration: 1.7,
                    ease: 'power2.out',
                    onUpdate: () => {
                        element.textContent = numbers.format(Math.round(proxy.value));
                    },
                    onComplete: () => {
                        element.textContent = original;
                    },
                    scrollTrigger: { trigger: element, start: 'top 85%', once: true },
                });
            });

            /* Параллакс фотографий внутри скруглённых рамок. Двигается
               обёртка, а не сам <Image>: на изображении висит ховерный
               transform, и инлайновый стиль от GSAP забрал бы его себе. */
            gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((layer) => {
                gsap.fromTo(
                    layer,
                    { yPercent: -6 },
                    {
                        yPercent: 6,
                        ease: 'none',
                        scrollTrigger: {
                            trigger: layer,
                            start: 'top bottom',
                            end: 'bottom top',
                            scrub: true,
                        },
                    },
                );
            });
        });
        });

        return () => {
            cancelled = true;
            ctx?.revert();
        };
    }, []);

    return null;
}
