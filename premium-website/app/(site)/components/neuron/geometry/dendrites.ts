import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { NEURON } from '../params';
import type { Branch } from './growNeuron';

/**
 * Сливает все ветки в одну геометрию: вся крона рисуется за один вызов.
 * Слияние обязательно — веток при BRANCH_DEPTH 3 больше сотни, и по одному
 * draw call на каждую сцена не выдержит.
 */
export function buildDendriteGeometry(branches: Branch[], maxDepth: number) {
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