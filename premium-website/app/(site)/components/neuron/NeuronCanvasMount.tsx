'use client';

import dynamic from 'next/dynamic';

/**
 * Точка подключения сцены.
 *
 * three.js создаёт рендерер поверх window, на сервере это падает — поэтому
 * `ssr: false`. Постера здесь нет намеренно: в v1 сцена держала внутри себя
 * текст первого экрана, и постер был его серверным дублем. Теперь весь текст
 * живёт обычной серверной разметкой (NeuronHero и далее по странице), то есть
 * то, что раньше называлось постером, стало самим контентом: LCP держит он,
 * без WebGL страница полностью работоспособна, а дубля больше нет.
 */
const NeuronCanvas = dynamic(() => import('./NeuronCanvas'), { ssr: false });

export default function NeuronCanvasMount() {
    return <NeuronCanvas />;
}