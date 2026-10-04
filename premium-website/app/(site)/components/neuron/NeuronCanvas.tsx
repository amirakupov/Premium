'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { CAMERA } from './params';
import { detectTier, downshift, hasWebGL, TIERS, type Tier } from './perf';
import { SCENE_SCRIPT } from './sceneScript';
import Neuron from './Neuron';
import PerformanceGuard from './PerformanceGuard';
import FrameDriver from './FrameDriver';
import { frameloopFor } from './frameloop';
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
/* A/B-переключатели для замеров; вне сборки с харнесом всегда false. */
function dbgFlag(name: string): boolean {
    if (process.env.NEXT_PUBLIC_PERF_HARNESS !== '1' || typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).has(name);
}

export default function NeuronCanvas({ live }: { live: boolean }) {
    const reduced = useMemo(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }, []);

    const [tier, setTier] = useState<Tier>(() => detectTier());
    /* Прогрев: Neuron сообщает, когда шейдеры скомпилированы и один кадр
       отрисован вручную. До этого и до снятия занавеса сцена не рисует и
       слой скрыт — иначе первый кадр компилировал бы всё синхронно
       (docs/perf-v4/report.md, провал #1). */
    const [warmed, setWarmed] = useState(false);
    const onWarmed = useCallback(() => setWarmed(true), []);
    /* reduced-motion прогрева не ждёт: там один статичный кадр по требованию. */
    const running = live && (warmed || reduced);
    /* antialias фиксируется при создании контекста и после дауншифта не
       меняется, поэтому решается по стартовому тиру: нативный MSAA нужен только
       там, где нет постпроцессинга (low) — с композитором он не работает. */
    const [nativeAntialias] = useState(() => !TIERS[detectTier()].postprocessing && !dbgFlag('noaa'));
    /* Нет WebGL — то же, что потерянный контекст: сцены не будет. */
    const [lost, setLost] = useState(() => !hasWebGL());
    const [hidden, setHidden] = useState(false);

    /* Страница знает, есть ли сцена: по html[data-scene="off"] сворачивается
       пустой экран финала (#outro), который без сцены — просто пустота перед
       футером. Атрибут снимается при размонтировании. */
    useEffect(() => {
        const root = document.documentElement;
        root.dataset.scene = lost ? 'off' : 'on';
        return () => {
            delete root.dataset.scene;
        };
    }, [lost]);

    const profile = useMemo(() => {
        const base = TIERS[tier];
        if (process.env.NEXT_PUBLIC_PERF_HARNESS !== '1') return base;
        /* A/B-переопределения для замеров (только сборка с харнесом): ?fps=60, ?dpr=1.25 */
        const q = new URLSearchParams(window.location.search);
        const fps = q.get('fps');
        const dpr = q.get('dpr');
        if (fps === null && dpr === null) return base;
        return { ...base, fps: fps === null ? base.fps : fps === '0' ? null : Number(fps), dpr: dpr === null ? base.dpr : Number(dpr) };
    }, [tier]);

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

    /* Отладочный крюк измерительной обвязки (docs/perf-v3): принудительный
       дауншифт для проверки dispose. Вне сборки с харнесом ветка вырезается. */
    useEffect(() => {
        if (process.env.NEXT_PUBLIC_PERF_HARNESS !== '1') return;
        (window as unknown as { __neuronCanvas?: unknown }).__neuronCanvas = { tier, downgrade: onDowngrade };
    }, [tier, onDowngrade]);

    /* Понижать некуда — страховку можно снять, чтобы не мерить впустую. */
    const guarded = !reduced && tier !== 'low';

    if (lost) return null;

    const start = SCENE_SCRIPT[0].camera;

    return (
        <div
            className={`${reduced ? styles.layerStatic : styles.layer} ${
                running || reduced ? '' : styles.layerWarming
            }`}
            aria-hidden="true"
        >
            <Canvas
                className={styles.canvas}
                dpr={[1, profile.dpr]}
                /* 'never' — до прогрева и снятия занавеса; 'always' — сцена идёт
                   вровень с монитором; 'demand' — только там, где такт задаёт
                   FrameDriver с потолком (low) или где нужен ровно один кадр
                   (reduced-motion). См. frameloop.ts. В фоновой вкладке браузер
                   сам останавливает rAF, GPU не греется. */
                frameloop={frameloopFor({ reduced, fps: profile.fps, live: running })}
                /* Указатель слушаем на body: сам слой — pointer-events: none
                   (сцена не должна перехватывать скролл и клики), а значит на
                   canvas pointermove не приходит, и параллакс мыши в v2 был
                   мёртвым кодом: frame.pointer навсегда (0, 0). */
                eventSource={typeof document === 'undefined' || dbgFlag('nopointer') ? undefined : document.body}
                eventPrefix="client"
                gl={{
                    antialias: nativeAntialias,
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
                    performance.mark('neuron:gl-created');
                    /* Контекст не восстанавливаем: восстановление требует
                       пересборки всех буферов и всё равно даёт заметный провал.
                       Честнее снять сцену — страница от неё не зависит. */
                    gl.domElement.addEventListener('webglcontextlost', () => setLost(true), {
                        once: true,
                    });
                }}
            >
                <Neuron profile={profile} reduced={reduced} smaa={!dbgFlag('nosmaa')} onWarmed={onWarmed} />
                {running && !reduced && !hidden && profile.fps ? <FrameDriver fps={profile.fps} /> : null}
                {running && guarded && !hidden ? <PerformanceGuard onDowngrade={onDowngrade} /> : null}
            </Canvas>
            {/* Без композитора зерно и виньетку рисует CSS: статичный тайл шума
                и радиальный градиент, стоимость — ноль на кадр. */}
            {!profile.postprocessing && !reduced ? <div className={styles.grain} aria-hidden="true" /> : null}
        </div>
    );
}
