'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useCurtainDone } from '../curtain';

/**
 * Точка подключения сцены.
 *
 * three.js создаёт рендерер поверх window, на сервере это падает — поэтому
 * `ssr: false`. Постера здесь нет намеренно: в v1 сцена держала внутри себя
 * текст первого экрана, и постер был его серверным дублем. Теперь весь текст
 * живёт обычной серверной разметкой (NeuronHero и далее по странице), то есть
 * то, что раньше называлось постером, стало самим контентом: LCP держит он,
 * без WebGL страница полностью работоспособна, а дубля больше нет.
 *
 * Сцена монтируется только после занавеса. Пока идут буквы прелоадера, главный
 * поток должен быть свободен: инициализация сцены — это компиляция шейдеров
 * MeshPhysicalMaterial, запекание окружения и программы постпроцессинга, в
 * сумме секунды блокировки (см. docs/perf-v3/baseline.md). Сетевую часть —
 * загрузку чанка — начинаем сразу, параллельно с занавесом: import() ниже
 * только греет кэш и ничего не рендерит.
 */
const NeuronCanvas = dynamic(() => import('./NeuronCanvas'), { ssr: false });

export default function NeuronCanvasMount() {
    const curtainDone = useCurtainDone();

    useEffect(() => {
        void import('./NeuronCanvas');
    }, []);

    return curtainDone ? <NeuronCanvas /> : null;
}
