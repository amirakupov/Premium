import * as THREE from 'three';
import { EEG } from '../params';
import { clamp01, mulberry32, smoothstep } from '../utils';

/**
 * ─────────────────── ПРОФИЛЬ ЗАПИСИ: ЕДИНСТВЕННЫЙ ИСТОЧНИК ПРАВДЫ ───────────────────
 *
 * Опорные точки в системе координат SVG-орнамента (viewBox 0 0 640 48). Отсюда
 * растут обе версии кривой: 3D-лента финала и фирменная `EegLine`. Расходиться
 * они не имеют права, поэтому атрибут `d` у SVG не пишется руками, а
 * генерируется из этого массива — `npm run eeg:path` (scripts/eeg-path.mjs).
 *
 * ── Калибровочный импульс ──
 *
 * Слева, до самой кривой, стоит прямоугольная ступенька: вверх, плато, вниз.
 * С неё начинается любая настоящая запись ЭЭГ и ЭКГ, и перо проходит её первой.
 * Это самая узнаваемая деталь жанра, и ни одна шаблонная «иконка пульса» её не
 * содержит — именно поэтому она и работает.
 */
export const EEG_PROFILE: ReadonlyArray<readonly [number, number]> = [
    // калибровка: ступенька вверх, плато, ступенька вниз
    [0, 24], [20, 24], [20, 13], [54, 13], [54, 24], [86, 24],
    // изолиния и первый мелкий зубец
    [150, 24], [160, 18], [170, 24], [230, 24],
    // QRS
    [238, 8], [246, 38], [252, 0], [258, 32], [266, 18], [274, 24],
    [344, 24], [354, 16], [364, 24], [420, 24],
    // второй комплекс, ниже по амплитуде
    [428, 12], [436, 30], [442, 8], [448, 28], [456, 22], [630, 22],
];

/** Ширина и высота исходной системы координат профиля. */
const VIEW_W = 640;
const VIEW_H = 48;
const BASELINE = 24;

/** Ниже этого шага по x сегмент считается вертикальным (ступенька калибровки). */
const VERTICAL_EPS = 0.5;
/** Где кончается калибровочный импульс — по нему же гейтится шум. */
const CALIBRATION_END = 86;

const toWorldX = (x: number) => (x / VIEW_W - 0.5) * EEG.WIDTH;
const toWorldY = (y: number) => (-(y - BASELINE) / VIEW_H) * EEG.HEIGHT;

/**
 * Гладкий детерминированный шум на отрезке: значение в целых узлах берётся у
 * ГПСЧ, между ними — косинусная интерполяция. Обычный `rand()` на каждую точку
 * дал бы белый шум, то есть частокол в пиксель шириной; запись выглядит иначе —
 * у неё есть характерная частота.
 */
function makeNoise(seed: number, nodes: number) {
    const rand = mulberry32(seed);
    const table = Array.from({ length: nodes + 2 }, () => rand() * 2 - 1);
    return (t: number) => {
        const x = clamp01(t) * nodes;
        const i = Math.floor(x);
        const f = x - i;
        const s = (1 - Math.cos(f * Math.PI)) * 0.5;
        return table[i] + (table[i + 1] - table[i]) * s;
    };
}

type Sample = {
    /** точка в мировых координатах */
    p: THREE.Vector2;
    /** крутизна сегмента, 0…1 — нормирована по самому крутому месту профиля */
    steep: number;
};

/**
 * Передискретизация профиля с шагом RESAMPLE_STEP плюс микрошум изолинии.
 *
 * Исходные 26 опорных точек — это идеально ровная ломаная: между [86,24] и
 * [150,24] шестьдесят четыре единицы абсолютно прямой изолинии. Настоящая
 * запись так не выглядит никогда, и именно это отличало «иконку из набора» от
 * показания прибора.
 *
 * Шум двухмасштабный: высокочастотная дрожь пера плюс медленный дрейф самой
 * изолинии. И он гейтится крутизной — на склонах QRS амплитуда уходит в ноль:
 * пик это сигнал, его геометрия обязана остаться чистой, шуметь может только
 * изолиния. Форма детерминирована сидом, как и у нейрона: одна и та же между
 * загрузками.
 */
function resample(): Sample[] {
    const fine = makeNoise(EEG.SEED, 96);
    const drift = makeNoise(EEG.SEED + 7, 9);

    /* Самый крутой сегмент профиля — им нормируется крутизна. Считается по
       исходным координатам, чтобы не зависеть от мировых размеров.

       Строго вертикальные сегменты сюда не входят: ступеньки калибровки имеют
       dx = 0, их наклон бесконечен, и одна такая ступенька задрала бы максимум
       так, что крутизна всего остального профиля схлопнулась бы в ноль — ни
       утончения пера на пиках QRS, ни гейта шума по склонам не осталось бы. */
    let maxSlope = 0;
    for (let i = 1; i < EEG_PROFILE.length; i += 1) {
        const [x0, y0] = EEG_PROFILE[i - 1];
        const [x1, y1] = EEG_PROFILE[i];
        const dx = Math.abs(x1 - x0);
        if (dx < VERTICAL_EPS) continue;
        maxSlope = Math.max(maxSlope, Math.abs(y1 - y0) / dx);
    }

    const out: Sample[] = [];
    const push = (x: number, y: number, steep: number) => {
        /* Шум глушится крутизной и сходит на нет на калибровочном импульсе:
           его ступеньки обязаны остаться прямоугольными. Гейт по x — плавный:
           ступенькой он дал бы заметный излом ровно на стыке калибровки и
           изолинии, то есть на единственном прямом участке кадра. */
        const gate = (1 - steep) * smoothstep(CALIBRATION_END, CALIBRATION_END + 44, x);
        const n =
            fine(x / VIEW_W) * EEG.NOISE_FINE + drift(x / VIEW_W) * EEG.NOISE_DRIFT;
        out.push({
            p: new THREE.Vector2(toWorldX(x), toWorldY(y + n * gate)),
            steep,
        });
    };

    for (let i = 1; i < EEG_PROFILE.length; i += 1) {
        const [x0, y0] = EEG_PROFILE[i - 1];
        const [x1, y1] = EEG_PROFILE[i];
        const dx = x1 - x0;
        const dy = y1 - y0;
        // вертикаль — это предельная крутизна, а не деление на ноль
        const steep =
            Math.abs(dx) < VERTICAL_EPS ? 1 : clamp01(Math.abs(dy) / Math.abs(dx) / maxSlope);
        if (i === 1) push(x0, y0, steep);

        /* Вертикальные ступеньки калибровки делить нечем и незачем: шага по x
           у них нет, а лишние точки на одной вертикали дают вырожденные
           сегменты и ломают расчёт нормали. */
        const steps = Math.max(1, Math.round(Math.abs(dx) / EEG.RESAMPLE_STEP));
        for (let k = 1; k <= steps; k += 1) {
            const t = k / steps;
            push(x0 + dx * t, y0 + dy * t, steep);
        }
    }
    return out;
}

/**
 * Лента по ломаной. Обычный TubeGeometry здесь не годится: на острых пиках QRS
 * система Френе перекручивается. Ленту строим вручную со скошенным стыком
 * (miter), ограниченным по длине, — углы остаются острыми.
 *
 * Толщина НЕ запечена в позиции вершин: вершина хранит точку осевой линии, а
 * смещение поперёк ленты уходит отдельным атрибутом `aOffset` и умножается на
 * uniform в вершинном шейдере. Так толщина остаётся живой величиной — её
 * приходится компенсировать под узкий экран (params.FINALE), а перестраивать
 * геометрию на каждый resize было бы расточительством.
 *
 * Атрибут `uv.x` — доля пройденной длины: по нему шейдер прочерчивает линию.
 */
export function buildEeg() {
    const samples = resample();
    const points = samples.map((s) => s.p);

    const lengths = accumulate(points);
    const total = lengths[lengths.length - 1] || 1;

    const positions: number[] = [];
    const offsets: number[] = [];
    const uvs: number[] = [];

    const d1 = new THREE.Vector2();
    const d2 = new THREE.Vector2();
    const n1 = new THREE.Vector2();
    const n2 = new THREE.Vector2();
    const bisector = new THREE.Vector2();

    for (let i = 0; i < points.length; i += 1) {
        const prev = points[Math.max(0, i - 1)];
        const next = points[Math.min(points.length - 1, i + 1)];
        const current = points[i];

        d1.copy(current).sub(prev);
        d2.copy(next).sub(current);
        if (d1.lengthSq() < 1e-8) d1.copy(d2);
        if (d2.lengthSq() < 1e-8) d2.copy(d1);
        d1.normalize();
        d2.normalize();

        n1.set(-d1.y, d1.x);
        n2.set(-d2.y, d2.x);
        bisector.copy(n1).add(n2);
        if (bisector.lengthSq() < 1e-8) bisector.copy(n1);
        bisector.normalize();
        // без ограничения на развороте QRS вылет угла уходит в бесконечность
        const miter = 1 / Math.max(0.35, bisector.dot(n1));

        /* Переменная толщина пера: на быстром участке чернил меньше. Это
           мгновенно читается как «записано», а не «нарисовано». Ограничение
           miter при этом остаётся в силе — оно множитель, а не слагаемое. */
        const width = 0.5 * (1 - EEG.THIN_ON_SPEED * samples[i].steep) * miter;

        const u = lengths[i] / total;
        positions.push(current.x, current.y, 0, current.x, current.y, 0);
        offsets.push(bisector.x * width, bisector.y * width, -bisector.x * width, -bisector.y * width);
        uvs.push(u, 1, u, 0);
    }

    const indices: number[] = [];
    for (let i = 0; i < points.length - 1; i += 1) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aOffset', new THREE.Float32BufferAttribute(offsets, 2));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    return { geometry, path: makePath(points, lengths, total) };
}

function accumulate(points: readonly THREE.Vector2[]) {
    const lengths: number[] = [0];
    for (let i = 1; i < points.length; i += 1) {
        lengths.push(lengths[i - 1] + points[i].distanceTo(points[i - 1]));
    }
    return lengths;
}

/**
 * Та же кривая, что у ленты, — не «такая же», а буквально те же точки: обе
 * собираются из одного вызова `resample()`, и разойтись им физически негде.
 *
 * Опрашивают её три места, и все три — в `useFrame`: позиция спрайта пера,
 * точка, в которую стягивается вспышка при передаче эстафеты, и парковка пера в
 * главе `exit-verdict`. Поэтому `sample` не аллоцирует ничего и принимает `out`
 * параметром — тот же приём, что у `samplePath` в системе импульсов.
 */
export type EegPath = {
    /** доля длины u ∈ [0,1] → точка и единичный тангенс в локальных координатах меша */
    sample: (u: number, outPoint: THREE.Vector2, outTangent?: THREE.Vector2) => THREE.Vector2;
};

function makePath(points: readonly THREE.Vector2[], lengths: readonly number[], total: number): EegPath {
    const last = points.length - 1;

    return {
        sample(u, outPoint, outTangent) {
            const target = clamp01(u) * total;
            // бинарный поиск по накопленным длинам: линейный проход по паре
            // тысяч точек в кадре — это ровно та мелочь, из которой набегает
            // главный поток
            let lo = 0;
            let hi = last;
            while (lo < hi) {
                const mid = (lo + hi) >> 1;
                if (lengths[mid] < target) lo = mid + 1;
                else hi = mid;
            }
            const i = Math.max(1, lo);
            const span = lengths[i] - lengths[i - 1];
            const f = span > 1e-8 ? (target - lengths[i - 1]) / span : 0;
            const a = points[i - 1];
            const b = points[i];
            outPoint.set(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f);
            if (outTangent) {
                outTangent.set(b.x - a.x, b.y - a.y);
                if (outTangent.lengthSq() < 1e-12) outTangent.set(1, 0);
                else outTangent.normalize();
            }
            return outPoint;
        },
    };
}
