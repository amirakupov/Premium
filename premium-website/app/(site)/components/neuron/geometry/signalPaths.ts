import * as THREE from 'three';
import { SIGNAL } from '../params';
import type { Branch } from './growNeuron';

/**
 * Предпросчёт путей импульса. `CatmullRomCurve3.getPointAt()` делает поиск по
 * таблице длин дуги на каждый вызов — для десятков импульсов × 8 точек хвоста ×
 * 60 кадров это заметно. Поэтому путь один раз сэмплируется равномерно, а в
 * кадре берётся линейная интерполяция между соседними отсчётами.
 */
export function buildSignalPaths(paths: Branch[][]) {
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

/** Позиция точки на пути по параметру t∈[0,1] — линейно по предпросчёту. */
export function samplePath(flat: Float32Array, t: number, out: THREE.Vector3) {
    const last = SIGNAL.PATH_SAMPLES - 1;
    const position = (t < 0 ? 0 : t > 1 ? 1 : t) * last;
    const index = Math.min(last - 1, Math.floor(position));
    const frac = position - index;
    const a = index * 3;
    const b = a + 3;
    out.set(
        flat[a] + (flat[b] - flat[a]) * frac,
        flat[a + 1] + (flat[b + 1] - flat[a + 1]) * frac,
        flat[a + 2] + (flat[b + 2] - flat[a + 2]) * frac,
    );
    return out;
}