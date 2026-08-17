'use client';

import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { CAMERA } from './params';
import { detectTier, TIERS } from './perf';
import { SCENE_SCRIPT } from './sceneScript';
import Neuron from './Neuron';
import styles from './NeuronCanvas.module.css';

/**
 * Единственный Canvas на всю страницу.
 *
 * Монтируется один раз (см. NeuronCanvasMount) и живёт фиксированным слоем за
 * контентом. Второго Canvas на странице быть не должно: два WebGL-контекста —
 * это два рендерера, две копии геометрии и гарантированный провал по FPS.
 */
export default function NeuronCanvas() {
    const reduced = useMemo(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }, []);

    const profile = useMemo(() => TIERS[detectTier()], []);

    const start = SCENE_SCRIPT[0].camera;

    return (
        <div className={reduced ? styles.layerStatic : styles.layer} aria-hidden="true">
            <Canvas
                className={styles.canvas}
                dpr={[1, profile.dpr]}
                frameloop={reduced ? 'demand' : 'always'}
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
            >
                <Neuron profile={profile} reduced={reduced} />
            </Canvas>
        </div>
    );
}