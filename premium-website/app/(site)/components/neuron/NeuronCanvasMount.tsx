'use client';

import dynamic from 'next/dynamic';
import { useCurtainDone } from '../curtain';

/**
 * Точка подключения сцены.
 *
 * three.js создаёт рендерер поверх window, на сервере это падает — поэтому
 * `ssr: false`. Постера здесь нет намеренно: весь текст первого экрана живёт
 * обычной серверной разметкой (NeuronHero и далее), LCP держит он, без WebGL
 * страница полностью работоспособна.
 *
 * Сцена монтируется СРАЗУ, а не после занавеса, — но до снятия занавеса не
 * рисует (`frameloop="never"`, NeuronCanvas) и компилирует шейдеры асинхронно
 * (`gl.compileAsync`, Neuron.tsx). Раньше монтирование ждало занавес, и первый
 * кадр собирал все 33 программы синхронно уже на открытой странице: один кадр
 * в 83–117 мс ровно в момент, когда пользователь начинает крутить
 * (docs/perf-v4/report.md, провал #1). Буквы прелоадера идут на CSS-анимации
 * композитором, и асинхронная компиляция им не мешает.
 */
const NeuronCanvas = dynamic(() => import('./NeuronCanvas'), { ssr: false });

export default function NeuronCanvasMount() {
    const curtainDone = useCurtainDone();
    return <NeuronCanvas live={curtainDone} />;
}
