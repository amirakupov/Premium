'use client';

/**
 * Процедурный 3D-нейрон, ведущий пользователя по скролл-нарративу.
 *
 * Файл монтируется только на клиенте (см. NeuronHero.tsx — next/dynamic ssr:false),
 * потому что three.js обращается к window при создании рендерера.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ГДЕ КРУТИТЬ ПАРАМЕТРЫ — всё собрано в блоках констант ниже:
 *   NEURON  — морфология: число дендритов, глубина ветвления, толщина, цвета
 *   SIGNAL  — импульсы: количество, скорость, длина хвоста, цвет
 *   BLOOM   — свечение: база, порог, всплеск на финальной вспышке
 *   ACT     — точки скролла: границы актов, где стартует финал
 *   EEG     — финальная линия: размер, толщина, цвета, скорость прочерчивания
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ScrollControls, Scroll, useScroll } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import type { BloomEffect } from 'postprocessing';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import EegLine from './EegLine';
import styles from './NeuronHero.module.css';

/* ═══════════════════════════ ПАРАМЕТРЫ ═══════════════════════════ */

const NEURON = {
    SEED: 20260810,        // фиксированное зерно: форма одинакова на всех загрузках
    SOMA_RADIUS: 0.62,
    DENDRITE_COUNT: 6,     // первичных стволов, растущих из сомы
    BRANCH_DEPTH: 3,       // глубина рекурсии; +1 примерно утраивает число веток
    SPLIT_MIN: 2,          // сколько потомков в узле ветвления
    SPLIT_EXTRA_CHANCE: 0.35, // вероятность третьего потомка
    PRIMARY_LENGTH: 1.7,
    LENGTH_FALLOFF: 0.66,  // во сколько раз короче каждое следующее поколение
    ROOT_RADIUS: 0.055,
    RADIUS_FALLOFF: 0.62,
    SEGMENTS_PER_BRANCH: 6, // изломов внутри одной ветки (её «кривизна»)
    WANDER: 0.3,           // насколько ветка виляет по ходу роста
    SPREAD: 0.95,          // разлёт потомков от направления родителя
    AXON_LENGTH: 4.2,      // аксон — один длинный ствол вниз
    AXON_RADIUS: 0.085,
    /* Палитра рассчитана на светлый фон страницы: тона тёмные и насыщенные,
       иначе тонкие ветви растворяются в «бумаге». Кончики светлее стволов,
       но всё ещё контрастны к фону. */
    COLOR_TRUNK: '#12294d', // цвет у сомы (толстые стволы)
    COLOR_TIP: '#4b90e2',   // цвет на кончиках (тонкие ветви)
    COLOR_SOMA: '#1d4ed8',
    TUBE_RADIAL_SEGMENTS: 5,
} as const;

const SIGNAL = {
    COUNT: 44,             // одновременных импульсов
    TRAIL: 8,              // точек в хвосте кометы
    SPEED_MIN: 0.14,       // доля пути в секунду
    SPEED_MAX: 0.3,
    TRAIL_GAP: 0.016,      // расстояние между точками хвоста вдоль пути
    SIZE: 26,              // базовый размер точки в пикселях
    COLOR: '#f59e0b',      // тёплый — по ТЗ импульсы контрастируют с холодной сомой
    /* Ядро импульса раньше уходило в белое — на светлом фоне это дыра.
       Теперь наоборот: к центру импульс густеет до тёмно-янтарного. */
    CORE_COLOR: '#b45309',
    PATH_SAMPLES: 220,     // точность предпросчёта пути (память, не GPU)
    IDLE_INTENSITY: 0.55,  // яркость в первом акте
    PEAK_INTENSITY: 1.0,   // яркость к концу второго акта
} as const;

/**
 * На светлом фоне Bloom работает вполсилы: он только прибавляет свет, а
 * прибавлять к почти белой странице некуда. Поэтому интенсивность низкая —
 * ореол остаётся лёгким касанием на самых ярких точках импульсов, а роль
 * «вспышки» в финале взяла на себя сама сома (её размер и плотность ауры).
 */
const BLOOM = {
    INTENSITY: 0.42,
    FLASH_INTENSITY: 1.6,  // пик на финальной вспышке
    THRESHOLD: 0.5,
    SMOOTHING: 0.4,
    RADIUS: 0.7,
} as const;

/** Точки скролл-нарратива в долях от useScroll().offset (0…1). */
const ACT = {
    HERO_END: 0.3,        // конец первого акта: холостое вращение
    TRAVEL_END: 0.76,     // конец пролёта камеры вдоль нейрона
    CONVERGE_END: 0.9,    // импульсы сошлись к соме
    FLASH_AT: 0.905,      // центр вспышки
    FLASH_WIDTH: 0.022,   // «острота» вспышки
    EEG_START: 0.9,       // отсюда прочерчивается линия ЭЭГ
} as const;

const EEG = {
    WIDTH: 11,
    HEIGHT: 2.6,
    THICKNESS: 0.055,
    Y: -0.35,
    COLOR: '#2563eb',
    HEAD_COLOR: '#12294d',  // «перо» темнее линии: на светлом белое не видно
    HEAD_LENGTH: 0.06,     // длина раскалённого участка у «пера»
} as const;

const CAMERA = {
    Z_HERO: 9.5,
    Z_TRAVEL: 4.4,        // камера уходит внутрь кроны дендритов
    Z_FINALE: 8.6,        // отъезд, чтобы линия ЭЭГ поместилась в кадр
    PARALLAX: 0.55,       // амплитуда параллакса от мыши
} as const;

const PAGES = 3;          // сколько экранов длится нарратив

/* ═══════════════════════════ УТИЛИТЫ ═══════════════════════════ */

/** Детерминированный ГПСЧ: форма нейрона не «прыгает» между перезагрузками. */
function mulberry32(seed: number) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Нормирует x внутри [a,b] в 0…1 — основной инструмент раскладки по актам. */
const range = (x: number, a: number, b: number) => clamp01((x - a) / (b - a));
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** Равномерное распределение направлений по сфере (спираль Фибоначчи). */
function sphereDir(i: number, n: number) {
    const y = 1 - (i / Math.max(1, n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const phi = i * 2.399963229728653;
    return new THREE.Vector3(Math.cos(phi) * r, y, Math.sin(phi) * r).normalize();
}

/* ═══════════════════════ ГЕНЕРАЦИЯ НЕЙРОНА ═══════════════════════ */

type Branch = { points: THREE.Vector3[]; depth: number; radius: number };

/**
 * Рекурсивно выращивает дендритное дерево и аксон.
 * Возвращает плоский список веток (для геометрии) и список путей
 * «сома → кончик» (для импульсов).
 */
function growNeuron() {
    const rand = mulberry32(NEURON.SEED);
    const branches: Branch[] = [];
    const paths: Branch[][] = [];
    const maxDepth = NEURON.BRANCH_DEPTH;

    const jitter = (amount: number) =>
        new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(amount);

    function grow(
        origin: THREE.Vector3,
        direction: THREE.Vector3,
        length: number,
        depth: number,
        radius: number,
        trail: Branch[],
        depthLimit: number,
        splits: number,
    ) {
        const points = [origin.clone()];
        const dir = direction.clone().normalize();
        let cursor = origin.clone();
        const step = length / NEURON.SEGMENTS_PER_BRANCH;

        for (let i = 0; i < NEURON.SEGMENTS_PER_BRANCH; i += 1) {
            dir.add(jitter(NEURON.WANDER)).normalize();
            cursor = cursor.clone().addScaledVector(dir, step);
            points.push(cursor.clone());
        }

        const branch: Branch = { points, depth, radius };
        branches.push(branch);
        const path = [...trail, branch];

        if (depth >= depthLimit) {
            paths.push(path);
            return;
        }

        const children = splits + (rand() < NEURON.SPLIT_EXTRA_CHANCE ? 1 : 0);
        for (let k = 0; k < children; k += 1) {
            const childDir = dir.clone().add(jitter(NEURON.SPREAD)).normalize();
            grow(
                cursor,
                childDir,
                length * NEURON.LENGTH_FALLOFF,
                depth + 1,
                radius * NEURON.RADIUS_FALLOFF,
                path,
                depthLimit,
                splits,
            );
        }
    }

    // Дендриты: расходятся во все стороны, верхняя полусфера чуть плотнее.
    for (let i = 0; i < NEURON.DENDRITE_COUNT; i += 1) {
        const dir = sphereDir(i, NEURON.DENDRITE_COUNT);
        dir.y = dir.y * 0.75 + 0.28;
        dir.normalize();
        grow(
            dir.clone().multiplyScalar(NEURON.SOMA_RADIUS * 0.9),
            dir,
            NEURON.PRIMARY_LENGTH,
            0,
            NEURON.ROOT_RADIUS,
            [],
            maxDepth,
            NEURON.SPLIT_MIN,
        );
    }

    // Аксон: один длинный слабо ветвящийся ствол вниз — он задаёт сцене «низ»,
    // куда затем уходит взгляд к финальной линии.
    const axonDir = new THREE.Vector3(0.12, -1, 0.05).normalize();
    grow(
        axonDir.clone().multiplyScalar(NEURON.SOMA_RADIUS * 0.9),
        axonDir,
        NEURON.AXON_LENGTH,
        0,
        NEURON.AXON_RADIUS,
        [],
        1,
        2,
    );

    return { branches, paths, maxDepth };
}

/** Сливает все ветки в одну геометрию: вся крона рисуется за один вызов. */
function buildDendriteGeometry(branches: Branch[], maxDepth: number) {
    const trunk = new THREE.Color(NEURON.COLOR_TRUNK);
    const tip = new THREE.Color(NEURON.COLOR_TIP);
    const parts: THREE.BufferGeometry[] = [];

    for (const branch of branches) {
        const curve = new THREE.CatmullRomCurve3(branch.points);
        const geometry = new THREE.TubeGeometry(
            curve,
            branch.points.length * 2,
            branch.radius,
            NEURON.TUBE_RADIAL_SEGMENTS,
            false,
        );

        // Цвет по глубине: у сомы — глубокий синий, на кончиках — светло-голубой.
        const shade = trunk.clone().lerp(tip, branch.depth / Math.max(1, maxDepth));
        const count = geometry.attributes.position.count;
        const colors = new Float32Array(count * 3);
        for (let i = 0; i < count; i += 1) {
            colors[i * 3] = shade.r;
            colors[i * 3 + 1] = shade.g;
            colors[i * 3 + 2] = shade.b;
        }
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        parts.push(geometry);
    }

    const merged = mergeGeometries(parts, false);
    parts.forEach((part) => part.dispose());
    return merged ?? new THREE.BufferGeometry();
}

/**
 * Предпросчёт путей импульса. CatmullRomCurve3.getPointAt() делает поиск по
 * таблице длин дуги на каждый вызов — для 44 импульсов × 8 точек × 60 кадров
 * это заметно. Поэтому путь один раз сэмплируется равномерно, а в кадре берётся
 * линейная интерполяция между соседними отсчётами.
 */
function buildSignalPaths(paths: Branch[][]) {
    return paths.map((path) => {
        const points: THREE.Vector3[] = [];
        for (const branch of path) {
            for (const point of branch.points) {
                // стыки веток дублируются — выкидываем, иначе кривая «залипает»
                if (points.length === 0 || points[points.length - 1].distanceTo(point) > 1e-4) {
                    points.push(point);
                }
            }
        }
        const curve = new THREE.CatmullRomCurve3(points);
        const sampled = curve.getSpacedPoints(SIGNAL.PATH_SAMPLES - 1);
        const flat = new Float32Array(SIGNAL.PATH_SAMPLES * 3);
        sampled.forEach((point, i) => {
            flat[i * 3] = point.x;
            flat[i * 3 + 1] = point.y;
            flat[i * 3 + 2] = point.z;
        });
        return flat;
    });
}

/* ═══════════════════════ ФИНАЛЬНАЯ ЛИНИЯ ЭЭГ ═══════════════════════ */

/**
 * Тот же профиль, что у SVG-орнамента EegLine (viewBox 0 0 640 48) — 3D-финал
 * и фирменная линия на сайте обязаны быть одной и той же кривой.
 */
const EEG_PROFILE: ReadonlyArray<readonly [number, number]> = [
    [0, 24], [150, 24], [160, 18], [170, 24], [230, 24],
    [238, 8], [246, 38], [252, 0], [258, 32], [266, 18], [274, 24],
    [344, 24], [354, 16], [364, 24], [420, 24],
    [428, 12], [436, 30], [442, 8], [448, 28], [456, 22], [630, 22],
];

/**
 * Лента постоянной толщины по ломаной. Обычный TubeGeometry здесь не годится:
 * на острых пиках QRS система Френе перекручивается. Ленту строим вручную со
 * скошенным стыком (miter), ограниченным по длине, — углы остаются острыми.
 * Атрибут `aU` — доля пройденной длины: по нему шейдер прочерчивает линию.
 */
function buildEegGeometry() {
    const points = EEG_PROFILE.map(
        ([x, y]) =>
            new THREE.Vector2((x / 640 - 0.5) * EEG.WIDTH, (-(y - 24) / 48) * EEG.HEIGHT),
    );

    const lengths: number[] = [0];
    for (let i = 1; i < points.length; i += 1) {
        lengths.push(lengths[i - 1] + points[i].distanceTo(points[i - 1]));
    }
    const total = lengths[lengths.length - 1] || 1;

    const positions: number[] = [];
    const uvs: number[] = [];
    const half = EEG.THICKNESS / 2;

    for (let i = 0; i < points.length; i += 1) {
        const prev = points[Math.max(0, i - 1)];
        const next = points[Math.min(points.length - 1, i + 1)];
        const current = points[i];

        const d1 = current.clone().sub(prev);
        const d2 = next.clone().sub(current);
        if (d1.lengthSq() < 1e-8) d1.copy(d2);
        if (d2.lengthSq() < 1e-8) d2.copy(d1);
        d1.normalize();
        d2.normalize();

        const n1 = new THREE.Vector2(-d1.y, d1.x);
        const n2 = new THREE.Vector2(-d2.y, d2.x);
        const bisector = n1.clone().add(n2);
        if (bisector.lengthSq() < 1e-8) bisector.copy(n1);
        bisector.normalize();
        // без ограничения на развороте QRS вылет угла уходит в бесконечность
        const miter = half / Math.max(0.35, bisector.dot(n1));

        const u = lengths[i] / total;
        positions.push(
            current.x + bisector.x * miter, current.y + bisector.y * miter, 0,
            current.x - bisector.x * miter, current.y - bisector.y * miter, 0,
        );
        uvs.push(u, 1, u, 0);
    }

    const indices: number[] = [];
    for (let i = 0; i < points.length - 1; i += 1) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    return geometry;
}

/* ═══════════════════════════ ШЕЙДЕРЫ ═══════════════════════════ */

const SIGNAL_VERT = /* glsl */ `
  attribute float aBright;
  varying float vBright;
  uniform float uSize;
  void main() {
    vBright = aBright;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * (0.35 + vBright) * (1.0 / max(0.001, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`;

const SIGNAL_FRAG = /* glsl */ `
  varying float vBright;
  uniform vec3 uColor;
  uniform vec3 uCore;
  void main() {
    vec2 offset = gl_PointCoord - 0.5;
    float dist = length(offset);
    if (dist > 0.5) discard;
    float falloff = smoothstep(0.5, 0.0, dist);
    falloff *= falloff;
    // На светлом фоне яркость импульса читается не свечением, а плотностью:
    // к ядру цвет густеет до тёмно-янтарного и набирает непрозрачность.
    vec3 color = mix(uColor, uCore, vBright * 0.7);
    gl_FragColor = vec4(color, falloff * min(1.0, vBright * 1.15));
  }
`;

const AURA_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const AURA_FRAG = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  uniform vec3 uColor;
  uniform float uIntensity;
  void main() {
    // френель: ореол собирается по краю сомы, центр остаётся прозрачным
    float rim = 1.0 - abs(dot(normalize(vNormal), normalize(vView)));
    rim = pow(rim, 2.2);
    // При обычном блендинге интенсивность идёт в прозрачность, а не в цвет:
    // умножать цвет нельзя — он бы просто чернел вместо того, чтобы гаснуть.
    gl_FragColor = vec4(uColor, clamp(rim * uIntensity, 0.0, 1.0));
  }
`;

const EEG_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const EEG_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform float uProgress;
  uniform float uOpacity;
  uniform vec3 uColor;
  uniform vec3 uHead;
  uniform float uHeadLength;
  void main() {
    if (vUv.x > uProgress) discard;
    // мягкий спад поперёк ленты — край не «пилит»
    float across = 1.0 - abs(vUv.y * 2.0 - 1.0);
    float body = smoothstep(0.0, 0.55, across);
    // «перо» у переднего края: на светлом оно не разгорается, а густеет
    float head = smoothstep(uProgress - uHeadLength, uProgress, vUv.x);
    vec3 color = mix(uColor, uHead, head * head);
    gl_FragColor = vec4(color, body * uOpacity);
  }
`;

/* ═══════════════════════════ СЦЕНА ═══════════════════════════ */

type SignalState = {
    path: number;
    offset: number;
    speed: number;
};

function Neuron({ reduced }: { reduced: boolean }) {
    const scroll = useScroll();
    const { camera, invalidate } = useThree();

    const groupRef = useRef<THREE.Group>(null);
    const somaRef = useRef<THREE.Mesh>(null);
    const pointsRef = useRef<THREE.Points>(null);
    const bloomRef = useRef<BloomEffect>(null);
    const parallax = useRef(new THREE.Vector2());

    /* — Геометрия и материалы: строятся один раз — */
    const built = useMemo(() => {
        const { branches, paths, maxDepth } = growNeuron();
        const dendrites = buildDendriteGeometry(branches, maxDepth);
        const signalPaths = buildSignalPaths(paths);

        const dendriteMaterial = new THREE.MeshBasicMaterial({
            vertexColors: true,
            transparent: true,
            toneMapped: false,
        });

        const somaMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(NEURON.COLOR_SOMA),
            transparent: true,
            toneMapped: false,
        });

        const auraMaterial = new THREE.ShaderMaterial({
            vertexShader: AURA_VERT,
            fragmentShader: AURA_FRAG,
            uniforms: {
                uColor: { value: new THREE.Color(NEURON.COLOR_SOMA) },
                uIntensity: { value: 1 },
            },
            transparent: true,
            /* Обычный блендинг вместо аддитивного: сложение света работает
               только на тёмном грунте, на светлой странице такой слой
               прибавляет к почти белому и исчезает. */
            blending: THREE.NormalBlending,
            depthWrite: false,
            side: THREE.BackSide,
            toneMapped: false,
        });

        const vertexCount = SIGNAL.COUNT * SIGNAL.TRAIL;
        const signalGeometry = new THREE.BufferGeometry();
        signalGeometry.setAttribute(
            'position',
            new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3),
        );
        signalGeometry.setAttribute(
            'aBright',
            new THREE.BufferAttribute(new Float32Array(vertexCount), 1),
        );
        // импульсы живут внутри кроны — автобокс мешает, задаём сферу вручную
        signalGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 12);

        const signalMaterial = new THREE.ShaderMaterial({
            vertexShader: SIGNAL_VERT,
            fragmentShader: SIGNAL_FRAG,
            uniforms: {
                uColor: { value: new THREE.Color(SIGNAL.COLOR) },
                uCore: { value: new THREE.Color(SIGNAL.CORE_COLOR) },
                uSize: { value: SIGNAL.SIZE },
            },
            transparent: true,
            /* Обычный блендинг вместо аддитивного: сложение света работает
               только на тёмном грунте, на светлой странице такой слой
               прибавляет к почти белому и исчезает. */
            blending: THREE.NormalBlending,
            depthWrite: false,
            toneMapped: false,
        });

        const eegGeometry = buildEegGeometry();
        const eegMaterial = new THREE.ShaderMaterial({
            vertexShader: EEG_VERT,
            fragmentShader: EEG_FRAG,
            uniforms: {
                uProgress: { value: 0 },
                uOpacity: { value: 0 },
                uColor: { value: new THREE.Color(EEG.COLOR) },
                uHead: { value: new THREE.Color(EEG.HEAD_COLOR) },
                uHeadLength: { value: EEG.HEAD_LENGTH },
            },
            transparent: true,
            /* Обычный блендинг вместо аддитивного: сложение света работает
               только на тёмном грунте, на светлой странице такой слой
               прибавляет к почти белому и исчезает. */
            blending: THREE.NormalBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
            toneMapped: false,
        });

        const rand = mulberry32(NEURON.SEED + 1);
        const signals: SignalState[] = Array.from({ length: SIGNAL.COUNT }, () => ({
            path: Math.floor(rand() * signalPaths.length),
            offset: rand(),
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
    }, []);

    /* — Явный dispose: R3F освобождает то, что смонтировано в граф, но
         эти объекты созданы вручную в useMemo, поэтому убираем сами — */
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

    /** Позиция точки на пути по параметру t∈[0,1] — линейно по предпросчёту. */
    const samplePath = (flat: Float32Array, t: number, out: THREE.Vector3) => {
        const last = SIGNAL.PATH_SAMPLES - 1;
        const position = clamp01(t) * last;
        const index = Math.min(last - 1, Math.floor(position));
        const frac = position - index;
        const a = index * 3;
        const b = a + 3;
        out.set(
            lerp(flat[a], flat[b], frac),
            lerp(flat[a + 1], flat[b + 1], frac),
            lerp(flat[a + 2], flat[b + 2], frac),
        );
        return out;
    };

    /**
     * Раскладывает импульсы по путям на заданный момент времени.
     * `converge` (0…1) стягивает все импульсы к соме — это финальный сбор:
     * вместо разворота направления параметр t интерполируется к нулю, поэтому
     * все импульсы приходят к ядру одновременно и без рывка.
     */
    const placeSignals = (time: number, intensity: number, converge: number) => {
        const geometry = built.signalGeometry;
        const positions = geometry.attributes.position.array as Float32Array;
        const bright = geometry.attributes.aBright.array as Float32Array;
        const scratch = new THREE.Vector3();
        const gather = easeInOut(converge);

        for (let s = 0; s < built.signals.length; s += 1) {
            const signal = built.signals[s];
            const flat = built.signalPaths[signal.path];
            const head = (signal.offset + time * signal.speed) % 1;

            for (let k = 0; k < SIGNAL.TRAIL; k += 1) {
                const raw = head - k * SIGNAL.TRAIL_GAP;
                const t = clamp01(lerp(raw, 0, gather));
                samplePath(flat, t, scratch);

                const index = s * SIGNAL.TRAIL + k;
                positions[index * 3] = scratch.x;
                positions[index * 3 + 1] = scratch.y;
                positions[index * 3 + 2] = scratch.z;

                // огибающая sin(t·π): импульс разгорается в пути и гаснет у кончика
                const envelope = Math.sin(clamp01(t) * Math.PI);
                const tail = 1 - k / SIGNAL.TRAIL;
                // на сборе импульсы не гаснут у сомы, а наоборот наливаются
                const arrival = lerp(envelope, 1, gather);
                bright[index] = raw < 0 && gather < 0.02 ? 0 : arrival * tail * tail * intensity;
            }
        }

        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.aBright.needsUpdate = true;
    };

    /** Единая раскладка кадра по прогрессу скролла — и для анимации, и для статики. */
    const applyProgress = (progress: number, time: number) => {
        const group = groupRef.current;
        if (!group) return;

        const travel = range(progress, 0, ACT.TRAVEL_END);
        const finale = range(progress, ACT.CONVERGE_END, 1);
        const converge = range(progress, ACT.TRAVEL_END, ACT.CONVERGE_END);
        const flash = Math.exp(-(((progress - ACT.FLASH_AT) / ACT.FLASH_WIDTH) ** 2));

        // Акт 1→2: камера входит внутрь кроны. Акт 3: отъезд под линию ЭЭГ.
        const dolly = lerp(CAMERA.Z_HERO, CAMERA.Z_TRAVEL, easeInOut(travel));
        camera.position.z = lerp(dolly, CAMERA.Z_FINALE, easeInOut(finale));
        camera.position.x = parallax.current.x * CAMERA.PARALLAX;
        camera.position.y = parallax.current.y * CAMERA.PARALLAX * 0.6 + finale * EEG.Y * 0.6;
        camera.lookAt(0, lerp(0, EEG.Y, easeInOut(finale)), 0);

        // Нейрон уводится влево и разворачивается — взгляд «ведёт» вниз страницы.
        group.rotation.y = time * 0.08 + progress * 2.2;
        group.rotation.x = Math.sin(progress * Math.PI) * 0.22 + parallax.current.y * 0.12;
        group.rotation.z = progress * 0.3;
        group.position.x = -easeInOut(travel) * 1.5;
        group.position.y = easeInOut(travel) * 0.55;

        // В финале нейрон сворачивается в точку — вспышка «съедает» его.
        const dissolve = easeOut(range(progress, ACT.FLASH_AT, 1));
        const scale = lerp(1, 0.001, dissolve) * (1 + flash * 0.22);
        group.scale.setScalar(Math.max(0.001, scale));
        built.dendriteMaterial.opacity = 1 - dissolve;
        built.somaMaterial.opacity = 1 - dissolve;
        built.auraMaterial.uniforms.uIntensity.value = (0.9 + flash * 5) * (1 - dissolve);

        if (somaRef.current) {
            somaRef.current.scale.setScalar(1 + flash * 1.6);
        }

        // Активность сигналов нарастает по мере скролла, на сборе — максимум.
        const intensity = lerp(
            lerp(SIGNAL.IDLE_INTENSITY, SIGNAL.PEAK_INTENSITY, easeInOut(travel)),
            1.4,
            converge,
        ) * (1 - dissolve);
        placeSignals(time, intensity, converge);

        // Линия ЭЭГ прочерчивается сразу после вспышки.
        const draw = range(progress, ACT.EEG_START, 1);
        built.eegMaterial.uniforms.uProgress.value = easeOut(draw) * 1.02;
        built.eegMaterial.uniforms.uOpacity.value = easeOut(range(progress, ACT.EEG_START, ACT.EEG_START + 0.03));

        if (bloomRef.current) {
            bloomRef.current.intensity = BLOOM.INTENSITY + flash * BLOOM.FLASH_INTENSITY;
        }
    };

    /* — Статичный кадр для prefers-reduced-motion: раскладываем один раз — */
    useLayoutEffect(() => {
        if (!reduced) return;
        applyProgress(0.12, 0);
        invalidate();
        // applyProgress читает только рефы/константы, пересборка эффекта не нужна
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reduced]);

    useFrame((state, delta) => {
        if (reduced) return;

        // Параллакс мыши: догоняем указатель, а не прыгаем за ним.
        const damping = 1 - Math.exp(-delta * 3.2);
        parallax.current.x += (state.pointer.x - parallax.current.x) * damping;
        parallax.current.y += (state.pointer.y - parallax.current.y) * damping;

        applyProgress(scroll.offset, state.clock.elapsedTime);
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
                    ref={pointsRef}
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
                    intensity={BLOOM.INTENSITY}
                    luminanceThreshold={BLOOM.THRESHOLD}
                    luminanceSmoothing={BLOOM.SMOOTHING}
                    radius={BLOOM.RADIUS}
                    mipmapBlur
                />
            </EffectComposer>
        </>
    );
}

/* ═══════════════════════════ ОБОЛОЧКА ═══════════════════════════ */

export default function NeuronScene() {
    const reduced = useMemo(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }, []);

    return (
        <Canvas
            className={styles.canvas}
            dpr={[1, 2]}
            frameloop={reduced ? 'demand' : 'always'}
            gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
            camera={{ fov: 45, position: [0, 0, CAMERA.Z_HERO], near: 0.1, far: 100 }}
        >
            <ScrollControls pages={PAGES} damping={0.22}>
                <Neuron reduced={reduced} />

                <Scroll html style={{ width: '100%' }}>
                    <div className={styles.acts}>
                        <section className={`${styles.act} ${styles.actLead}`}>
                            <p className={styles.kicker}>Клиника неврологии «Премиум»</p>
                            <h1 className={styles.title}>
                                Мы стоим на страже здоровья{' '}
                                <span className={styles.accent}>вашей нервной системы</span>
                            </h1>
                            <p className={styles.lede}>
                                Диагностика и терапия заболеваний центральной и периферической
                                нервной системы — доказательными и щадящими методами.
                            </p>
                            <a href="/contacts" className="btn btn--brass">
                                Записаться на приём
                            </a>
                        </section>

                        <section className={`${styles.act} ${styles.actMiddle}`}>
                            <h2 className={styles.actTitle}>Каждый симптом — это сигнал</h2>
                            <p className={styles.actText}>
                                Головная боль, головокружение, онемение — не случайность, а
                                нарушение проводимости. Мы находим, где сигнал теряется, и
                                восстанавливаем путь — без лишних медикаментов и операций.
                            </p>
                        </section>

                        <section className={`${styles.act} ${styles.actFinal}`}>
                            <h2 className={styles.actTitle}>Сигнал доходит до цели</h2>
                            <p className={styles.actText}>
                                За 3 года — более 10 000 пациентов. ЭЭГ, УЗДГ и осмотр невролога
                                в один визит.
                            </p>
                            {/* Статичная фирменная линия — её видят только те, у кого
                                отключены анимации: 3D-финал для них не прочерчивается. */}
                            <EegLine className={styles.staticEeg} />
                            <a href="/contacts" className="btn btn--brass">
                                Записаться на приём
                            </a>
                        </section>
                    </div>
                </Scroll>
            </ScrollControls>
        </Canvas>
    );
}
