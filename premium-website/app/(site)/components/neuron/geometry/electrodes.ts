import * as THREE from 'three';
import { mulberry32 } from '../utils';
import type { Branch } from './growNeuron';

/**
 * Точки-электроды на кончиках дендритов — «приборный» слой главы
 * «Диагностика». Позиции берутся из готовой морфологии: кончик последней ветки
 * каждого пути. Точки статичны, анимируется только их яркость, поэтому буфер
 * заполняется один раз.
 *
 * `aSeed` — своя фаза мерцания у каждого электрода: без неё вся сетка
 * загорается одним щелчком и читается как баг, а не как прибор.
 */
export function buildElectrodeGeometry(paths: Branch[][], seed: number) {
    const rand = mulberry32(seed);
    const count = paths.length;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);

    paths.forEach((path, i) => {
        const branch = path[path.length - 1];
        const tip = branch.points[branch.points.length - 1];
        positions[i * 3] = tip.x;
        positions[i * 3 + 1] = tip.y;
        positions[i * 3 + 2] = tip.z;
        seeds[i] = rand();
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 12);
    return geometry;
}
