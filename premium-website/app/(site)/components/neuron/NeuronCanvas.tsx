'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { CAMERA } from './params';
import { detectTier, downshift, TIERS, type Tier } from './perf';
import { SCENE_SCRIPT } from './sceneScript';
import Neuron from './Neuron';
import PerformanceGuard from './PerformanceGuard';
import styles from './NeuronCanvas.module.css';

/**
 * Единственный Canvas на всю страницу.
 *
 * Монтируется один раз (см. NeuronCanvasMount) и живёт фиксированным слоем за
 * контентом. Второго Canvas на странице быть не должно: два WebGL-контекста —
 * это два рендерера, две копии геометрии и гарантированный провал по FPS.
 *
 * Здесь же собрана вся деградация:
 *   — prefers-reduced-motion → статичный кадр, слой перестаёт быть сквозным;
 *   — тир по железу + односторонний дауншифт по реальному времени кадра;
 *   — потеря контекста WebGL → сцена снимается целиком, страница остаётся
 *     полностью работоспособной (текст весь в обычном DOM, токены темы
 *     снимаются в Neuron при размонтировании, фон возвращается в светлый);
 *   — вкладка не видна → рендер останавливается.
 */
export default function NeuronCanvas() {
    const reduced = useMemo(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }, []);

    const [tier, setTier] = useState<Tier>(() => detectTier());
    const [lost, setLost] = useState(false);
    const [hidden, setHidden] = useState(false);

    const profile = TIERS[tier];

    /* Тир нужен и странице: на низком гасится стеклянное размытие карточек.
       Под ними едет анимированный canvas, и backdrop-filter на десятках
       элементов означает перекомпозицию всего вьюпорта каждый кадр. */
    useEffect(() => {
        const root = document.documentElement;
        root.dataset.sceneTier = tier;
        return () => {
            delete root.dataset.sceneTier;
        };
    }, [tier]);

    /* Пауза в фоновой вкладке: сквозная сцена иначе продолжает жечь GPU
       столько, сколько открыта страница. */
    useEffect(() => {
        const onVisibility = () => setHidden(document.hidden);
        document.addEventListener('visibilitychange', onVisibility);
        setHidden(document.hidden);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, []);

    const onDowngrade = useCallback(() => {
        setTier((current) => downshift(current));
    }, []);

    /* Понижать некуда — страховку можно снять, чтобы не мерить впустую. */
    const guarded = !reduced && tier !== 'low';

    if (lost) return null;

    const start = SCENE_SCRIPT[0].camera;

    return (
        <div className={reduced ? styles.layerStatic : styles.layer} aria-hidden="true">
            <Canvas
                className={styles.canvas}
                dpr={[1, profile.dpr]}
                frameloop={reduced ? 'demand' : hidden ? 'never' : 'always'}
                gl={{
                    antialias: false,
                    // alpha обязателен: сквозь сцену читаются «обои» страницы,
                    // и стеклянным карточкам есть что преломлять
                    alpha: true,
                    powerPreference: 'high-performance',
                    /* Тональная компрессия включена явно. В v1 все материалы
                       стояли с toneMapped: false, то есть сцена рисовалась
                       линейными значениями «как есть» — блики никуда не
                       сходились и объём терялся. */
                    toneMapping: THREE.ACESFilmicToneMapping,
                    outputColorSpace: THREE.SRGBColorSpace,
                }}
                camera={{
                    fov: start.fov,
                    position: [start.position[0], start.position[1], start.position[2]],
                    near: CAMERA.NEAR,
                    far: CAMERA.FAR,
                }}
                onCreated={({ gl }) => {
                    /* Контекст не восстанавливаем: восстановление требует
                       пересборки всех буферов и всё равно даёт заметный провал.
                       Честнее снять сцену — страница от неё не зависит. */
                    gl.domElement.addEventListener('webglcontextlost', () => setLost(true), {
                        once: true,
                    });
                }}
            >
                <Neuron profile={profile} reduced={reduced} />
                {guarded ? <PerformanceGuard onDowngrade={onDowngrade} /> : null}
            </Canvas>
        </div>
    );
}
