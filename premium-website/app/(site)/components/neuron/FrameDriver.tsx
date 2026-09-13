'use client';

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

/**
 * Потолок частоты кадров для сцены.
 *
 * Canvas работает в режиме `frameloop: 'demand'`, а такт задаёт этот драйвер:
 * свой requestAnimationFrame, который вызывает invalidate() не чаще, чем
 * позволяет тир. Зачем:
 *
 * Сцена декоративная, лежит под всей страницей и меняется медленно — дыхание
 * сомы, дрейф, импульсы. При этом каждый её кадр меняет фон под КАЖДОЙ
 * стеклянной карточкой, а backdrop-filter обязан пересобрать размытие, как
 * только изменился backdrop. На главной таких карточек десятки. То есть цена
 * кадра сцены — это не только её собственный рендер, но и перекомпозиция
 * половины страницы. Рисовать её 120 раз в секунду на быстром мониторе — значит
 * отбирать кадры у скролла ради движения, которого никто не различит.
 *
 * Демпферы в сцене считаются от dt, а не от номера кадра, поэтому при 30 к/с
 * хореография идёт с той же скоростью — просто реже обновляется.
 *
 * После perf-v3 драйвер остаётся только на low (perf.ts, fps: null у остальных):
 * там сцена упрощена и ступени под плавным текстом менее заметны, а GPU
 * действительно слабый.
 */
export default function FrameDriver({ fps }: { fps: number }) {
    const invalidate = useThree((state) => state.invalidate);

    useEffect(() => {
        const interval = 1000 / fps;
        let raf = 0;
        let previous = 0;
        let lastTick = 0;
        /** интервал кадра монитора, замеренный по соседним rAF */
        let refresh = 1000 / 60;

        const tick = (now: number) => {
            raf = requestAnimationFrame(tick);
            if (lastTick) refresh = now - lastTick;
            lastTick = now;
            /* Допуск — половина РЕАЛЬНОГО кадра монитора, а не константа 8 мс:
               с константой при fps 40 на 60 Гц порог 17 мс пропускал каждый
               второй такт, и «40» на деле было 30. Считая от замеренного
               интервала, на 60 Гц потолок 30 даёт ровно 30, на 30-герцовом
               мониторе — все его кадры. */
            if (now - previous < interval - refresh * 0.5) return;
            previous = now;
            invalidate();
        };

        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [fps, invalidate]);

    return null;
}
