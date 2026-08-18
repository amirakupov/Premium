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
 */
export default function FrameDriver({ fps }: { fps: number }) {
    const invalidate = useThree((state) => state.invalidate);

    useEffect(() => {
        const interval = 1000 / fps;
        let raf = 0;
        let previous = 0;

        const tick = (now: number) => {
            raf = requestAnimationFrame(tick);
            // допуск в половину кадра: иначе при 60 Гц и потолке 60 каждый
            // второй такт промахивается и получается ровно 30
            if (now - previous < interval - 8) return;
            previous = now;
            invalidate();
        };

        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [fps, invalidate]);

    return null;
}
