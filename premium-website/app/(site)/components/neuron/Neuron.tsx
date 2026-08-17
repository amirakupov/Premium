'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import type { BloomEffect } from 'postprocessing';
import * as THREE from 'three';

import { BLOOM, CAMERA, EEG, NEURON, SIGNAL } from './params';
import type { TierProfile } from './perf';
import { createSceneState, resolveSceneState } from './sceneScript';
import { useScrollDirector } from './useScrollDirector';
import { clamp01, damp, easeOut, lerp, mulberry32 } from './utils';
import { growNeuron } from './geometry/growNeuron';
import { buildDendriteGeometry } from './geometry/dendrites';
import { buildSignalPaths, samplePath } from './geometry/signalPaths';
import { buildEegGeometry } from './geometry/eeg';
import { createSignalGeometry, createSignalMaterial } from './materials/signal';
import { createAuraMaterial } from './materials/aura';
import { createEegMaterial } from './materials/eeg';
import { createDendriteMaterial, createSomaMaterial } from './materials/tissue';

/* Модульный scratch: в useFrame нельзя аллоцировать. В v1 `placeSignals`
   создавал new THREE.Vector3() каждый кадр — это десятки тысяч объектов в
   минуту и лишняя работа сборщику мусора ровно в тот момент, когда нужен
   ровный кадр. */
const scratch = new THREE.Vector3();

type SignalState = {
    /** индекс пути «сома → кончик» */
    path: number;
    /** позиция головы импульса на пути, 0…1 */
    phase: number;
    /** личная скорость: без разброса залп выглядит машинным */
    speed: number;
};

export default function Neuron({
    profile,
    reduced,
}: {
    profile: TierProfile;
    reduced: boolean;
}) {
    const director = useScrollDirector(!reduced);
    const { camera, invalidate } = useThree();

    const groupRef = useRef<THREE.Group>(null);
    const somaRef = useRef<THREE.Mesh>(null);
    const bloomRef = useRef<BloomEffect>(null);
    const parallax = useRef(new THREE.Vector2());
    /** сглаженный сбор импульсов к соме: включается режимом `converge` */
    const gather = useRef(0);

    const state = useMemo(() => createSceneState(), []);

    /* — Геометрия и материалы: строятся один раз на профиль тира — */
    const built = useMemo(() => {
        const { branches, paths, maxDepth } = growNeuron(profile.branchDepth);
        const dendrites = buildDendriteGeometry(branches, maxDepth);
        const signalPaths = buildSignalPaths(paths);

        const dendriteMaterial = createDendriteMaterial();
        const somaMaterial = createSomaMaterial();
        const auraMaterial = createAuraMaterial();
        const signalGeometry = createSignalGeometry(profile.signalCount);
        const signalMaterial = createSignalMaterial();
        const eegGeometry = buildEegGeometry();
        const eegMaterial = createEegMaterial();

        const rand = mulberry32(NEURON.SEED + 1);
        const signals: SignalState[] = Array.from({ length: profile.signalCount }, () => ({
            path: Math.floor(rand() * signalPaths.length),
            phase: rand(),
            speed: lerp(SIGNAL.SPEED_MIN, SIGNAL.SPEED_MAX, rand()),
        }));

        return {
            dendrites,
            dendriteMaterial,
            somaMaterial,
            auraMaterial,
            signalGeometry,
            signalMaterial,
            signalPaths,
            signals,
            eegGeometry,
            eegMaterial,
        };
    }, [profile]);

    /* — Явный dispose: R3F освобождает то, что смонтировано в граф, но эти
         объекты созданы вручную в useMemo, поэтому убираем сами — */
    useEffect(
        () => () => {
            built.dendrites.dispose();
            built.dendriteMaterial.dispose();
            built.somaMaterial.dispose();
            built.auraMaterial.dispose();
            built.signalGeometry.dispose();
            built.signalMaterial.dispose();
            built.eegGeometry.dispose();
            built.eegMaterial.dispose();
        },
        [built],
    );

    /**
     * Раскладывает импульсы по путям.
     * `collect` (0…1) стягивает все импульсы к соме — это финальный сбор:
     * вместо разворота направления параметр t интерполируется к нулю, поэтому
     * импульсы приходят к ядру одновременно и без рывка.
     */
    const placeSignals = (intensity: number, collect: number, load: number) => {
        const geometry = built.signalGeometry;
        const positions = geometry.attributes.position.array as Float32Array;
        const bright = geometry.attributes.aBright.array as Float32Array;
        const total = built.signals.length;
        // Загрузка главы гасит лишние импульсы, а не пересобирает буфер:
        // размер геометрии фиксирован профилем тира.
        const active = Math.round(load * total);

        for (let s = 0; s < total; s += 1) {
            const signal = built.signals[s];
            const flat = built.signalPaths[signal.path];
            const head = signal.phase;
            const alive = s < active ? 1 : 0;

            for (let k = 0; k < SIGNAL.TRAIL; k += 1) {
                const raw = head - k * SIGNAL.TRAIL_GAP;
                const t = clamp01(lerp(raw, 0, collect));
                samplePath(flat, t, scratch);

                const index = s * SIGNAL.TRAIL + k;
                positions[index * 3] = scratch.x;
                positions[index * 3 + 1] = scratch.y;
                positions[index * 3 + 2] = scratch.z;

                // огибающая sin(t·π): импульс разгорается в пути и гаснет у кончика
                const envelope = Math.sin(clamp01(t) * Math.PI);
                const tail = 1 - k / SIGNAL.TRAIL;
                // на сборе импульсы не гаснут у сомы, а наоборот наливаются
                const arrival = lerp(envelope, 1, collect);
                bright[index] =
                    raw < 0 && collect < 0.02 ? 0 : arrival * tail * tail * intensity * alive;
            }
        }

        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.aBright.needsUpdate = true;
    };

    /** Единая раскладка кадра по состоянию сцены — и для анимации, и для статики. */
    const applyState = (time: number) => {
        const group = groupRef.current;
        if (!group) return;

        // Камера: положение и точка взгляда приходят из таблицы глав, параллакс
        // мыши добавляется поверх — он живёт независимо от сценария.
        camera.position.set(
            state.cameraPos.x + parallax.current.x * CAMERA.PARALLAX,
            state.cameraPos.y + parallax.current.y * CAMERA.PARALLAX * 0.6,
            state.cameraPos.z,
        );
        camera.lookAt(state.cameraLookAt);
        if (camera instanceof THREE.PerspectiveCamera && camera.fov !== state.fov) {
            camera.fov = state.fov;
            camera.updateProjectionMatrix();
        }

        group.position.copy(state.neuronPos);
        // Медленный дрейф поверх поворота из таблицы: он не должен затирать
        // сценарий, иначе в главах не останется стоп-кадров.
        group.rotation.set(
            state.neuronRot.x + parallax.current.y * CAMERA.TILT,
            state.neuronRot.y + time * 0.02,
            state.neuronRot.z + parallax.current.x * CAMERA.TILT * 0.4,
        );

        const dissolve = state.dissolve;
        const flash = state.flash;
        group.scale.setScalar(
            Math.max(0.001, state.neuronScale * lerp(1, 0.12, easeOut(dissolve)) * (1 + flash * 0.22)),
        );

        built.dendriteMaterial.opacity = 1 - dissolve;
        built.somaMaterial.opacity = 1 - dissolve;
        built.auraMaterial.uniforms.uIntensity.value = (0.9 + flash * 5) * (1 - dissolve);
        if (somaRef.current) somaRef.current.scale.setScalar(1 + flash * 1.6);

        built.signalMaterial.uniforms.uColor.value.copy(state.signalColor);
        built.signalMaterial.uniforms.uCore.value.copy(state.signalCore);
        const intensity =
            lerp(0.7, 1.25, state.signalLoad) * (1 - dissolve) + flash * 0.5;
        placeSignals(intensity, gather.current, state.signalLoad);

        // Линия ЭЭГ прочерчивается в последней главе.
        built.eegMaterial.uniforms.uProgress.value = easeOut(state.eeg) * 1.02;
        built.eegMaterial.uniforms.uOpacity.value = clamp01(state.eeg * 8);

        if (bloomRef.current) bloomRef.current.intensity = state.bloom;
    };

    /* — Статичный кадр для prefers-reduced-motion: раскладываем один раз — */
    useLayoutEffect(() => {
        if (!reduced) return;
        resolveSceneState(0, state);
        applyState(0);
        invalidate();
        // applyState читает только рефы и константы, пересборка эффекта не нужна
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reduced, built]);

    useFrame((frame, delta) => {
        if (reduced) return;
        // Кадр может быть сколь угодно длинным (переключили таб, залип поток) —
        // без ограничения демпферы получают огромный dt и всё дёргается.
        const dt = Math.min(delta, 1 / 20);

        // Параллакс мыши: догоняем указатель, а не прыгаем за ним.
        parallax.current.x = damp(parallax.current.x, frame.pointer.x, 3.2, dt);
        parallax.current.y = damp(parallax.current.y, frame.pointer.y, 3.2, dt);

        director.step(dt);
        resolveSceneState(director.p, state);

        // Сбор к соме — величина инерционная: режим главы переключается
        // мгновенно, а импульсы должны стянуться плавно.
        gather.current = damp(
            gather.current,
            state.signalMode === 'converge' ? 1 : 0,
            2.2,
            dt,
        );

        // Реактивность к скорости скролла: единственная связь «рука
        // пользователя → сцена». При остановке множитель сам вернётся к 1.
        const boost = 1 + director.velocity * SIGNAL.VELOCITY_BOOST;
        const speed = state.signalSpeed * boost;
        for (let s = 0; s < built.signals.length; s += 1) {
            const signal = built.signals[s];
            signal.phase = (signal.phase + signal.speed * speed * dt) % 1;
        }

        applyState(frame.clock.elapsedTime);
    });

    return (
        <>
            <group ref={groupRef}>
                <mesh geometry={built.dendrites} material={built.dendriteMaterial} />
                <mesh ref={somaRef} material={built.somaMaterial}>
                    <icosahedronGeometry args={[NEURON.SOMA_RADIUS, 4]} />
                </mesh>
                <mesh material={built.auraMaterial}>
                    <icosahedronGeometry args={[NEURON.SOMA_RADIUS * 2.1, 3]} />
                </mesh>
                <points
                    geometry={built.signalGeometry}
                    material={built.signalMaterial}
                    frustumCulled={false}
                />
            </group>

            <mesh
                geometry={built.eegGeometry}
                material={built.eegMaterial}
                position={[0, EEG.Y, 0]}
            />

            <EffectComposer multisampling={0} enableNormalPass={false}>
                <Bloom
                    ref={bloomRef}
                    intensity={0.35}
                    luminanceThreshold={BLOOM.THRESHOLD}
                    luminanceSmoothing={BLOOM.SMOOTHING}
                    radius={BLOOM.RADIUS}
                    mipmapBlur={profile.bloomMipmap}
                />
            </EffectComposer>
        </>
    );
}