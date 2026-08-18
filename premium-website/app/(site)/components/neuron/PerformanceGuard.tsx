'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PERF } from './perf';

/**
 * Страховка на случай, когда эвристика тира ошиблась.
 *
 * Профиль определяется по числу ядер, памяти и типу указателя — этого хватает,
 * чтобы не выдать мобиле десктопный тир, но не хватает, чтобы предсказать
 * термотроттлинг, слабую интегрированную графику или ноутбук на батарее.
 * Поэтому меряем реальное время кадра.
 *
 * Медиана, а не среднее: одиночная задержка от сборщика мусора не должна
 * опускать качество, а устойчивая просадка — должна. Первые PERF.WARMUP секунд
 * игнорируются: там компилируются шейдеры и запекается окружение, и лаги честные,
 * но неинформативные.
 *
 * Понижение односторонее — им управляет родитель (NeuronCanvas): он вызывает
 * `onDowngrade` не более чем до нижнего тира и больше не поднимается. Скакать
 * туда-обратно хуже, чем работать ступенью ниже: пользователь видит не
 * оптимизацию, а мерцание качества.
 */
const CAPACITY = 240;

export default function PerformanceGuard({ onDowngrade }: { onDowngrade: () => void }) {
    /* Кольцевой буфер и буфер под сортировку заводятся один раз: в useFrame
       нельзя аллоцировать. */
    const samples = useRef(new Float32Array(CAPACITY));
    const scratch = useRef(new Float32Array(CAPACITY));
    const count = useRef(0);
    const cursor = useRef(0);
    const elapsed = useRef(0);
    const window = useRef(0);
    const fired = useRef(false);

    useFrame((_, delta) => {
        if (fired.current) return;

        elapsed.current += delta;
        if (elapsed.current < PERF.WARMUP) return;

        samples.current[cursor.current] = delta * 1000;
        cursor.current = (cursor.current + 1) % CAPACITY;
        if (count.current < CAPACITY) count.current += 1;

        window.current += delta;
        if (window.current < PERF.WINDOW) return;
        window.current = 0;

        const size = count.current;
        if (size < 30) return;
        scratch.current.set(samples.current.subarray(0, size));
        const view = scratch.current.subarray(0, size);
        view.sort();
        const median = view[size >> 1];

        if (median > PERF.BUDGET_MS) {
            fired.current = true;
            onDowngrade();
        } else {
            // окно закрылось без просадки — начинаем набирать заново
            count.current = 0;
            cursor.current = 0;
        }
    });

    return null;
}
