import * as THREE from 'three';
import { EEG } from '../params';

/**
 * Тот же профиль, что у SVG-орнамента EegLine (viewBox 0 0 640 48) — 3D-финал
 * и фирменная линия на сайте обязаны быть одной и той же кривой.
 */
export const EEG_PROFILE: ReadonlyArray<readonly [number, number]> = [
    [0, 24], [150, 24], [160, 18], [170, 24], [230, 24],
    [238, 8], [246, 38], [252, 0], [258, 32], [266, 18], [274, 24],
    [344, 24], [354, 16], [364, 24], [420, 24],
    [428, 12], [436, 30], [442, 8], [448, 28], [456, 22], [630, 22],
];

/**
 * Лента постоянной толщины по ломаной. Обычный TubeGeometry здесь не годится:
 * на острых пиках QRS система Френе перекручивается. Ленту строим вручную со
 * скошенным стыком (miter), ограниченным по длине, — углы остаются острыми.
 * Атрибут `uv.x` — доля пройденной длины: по нему шейдер прочерчивает линию.
 */
export function buildEegGeometry() {
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