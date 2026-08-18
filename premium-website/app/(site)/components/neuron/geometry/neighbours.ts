import * as THREE from 'three';
import { NEURON } from '../params';
import { mulberry32 } from '../utils';
import { growNeuron } from './growNeuron';
import { buildDendriteGeometry } from './dendrites';

/**
 * Глава «Сеть»: вокруг главной клетки проступают соседние нейроны и связи
 * между ними. Масштаб уезжает от «одна клетка» к «система».
 *
 * Соседи — упрощённые инстансы: одна геометрия с глубиной ветвления 1, один
 * draw call на всех. Форма у них общая, различают их поворот, масштаб и глубина
 * дымки — на этом расстоянии больше и не нужно.
 */

export function buildNeighbourGeometry() {
    // глубина 1 — это уже «намёк на клетку», а не дерево: то, что и требуется
    const morphology = growNeuron(1);
    return buildDendriteGeometry(morphology);
}

export type NeighbourLayout = {
    matrices: THREE.Matrix4[];
    /** центры соседей в координатах группы — к ним крепятся связи */
    centers: THREE.Vector3[];
};

/**
 * Раскладка соседей: кольцо вокруг главной клетки с разбросом по глубине.
 * Всё детерминировано от зерна — сцена не «прыгает» между загрузками.
 */
export function buildNeighbourLayout(count: number, seed: number): NeighbourLayout {
    const rand = mulberry32(seed);
    const matrices: THREE.Matrix4[] = [];
    const centers: THREE.Vector3[] = [];

    for (let i = 0; i < count; i += 1) {
        const angle = (i / Math.max(1, count)) * Math.PI * 2 + rand() * 0.5;
        const radius = 7.5 + rand() * 5.5;
        const center = new THREE.Vector3(
            Math.cos(angle) * radius,
            (rand() - 0.5) * 6,
            Math.sin(angle) * radius * 0.7 - rand() * 5,
        );
        const scale = 0.34 + rand() * 0.3;

        const matrix = new THREE.Matrix4().compose(
            center,
            new THREE.Quaternion().setFromEuler(
                new THREE.Euler(rand() * Math.PI, rand() * Math.PI * 2, rand() * Math.PI),
            ),
            new THREE.Vector3(scale, scale, scale),
        );

        matrices.push(matrix);
        centers.push(center);
    }

    return { matrices, centers };
}

/**
 * Синаптические связи: отрезок от каждого соседа к соме.
 *
 * Отрезок из двух вершин — этого достаточно: `aT` интерполируется по длине, и
 * бегущий по связи импульс рисуется во фрагментном шейдере. Отдельная система
 * частиц для перескока сигнала между клетками была бы третьим point cloud'ом
 * ради эффекта, который читается одной полосой подсветки.
 */
export function buildLinkGeometry(centers: THREE.Vector3[]) {
    const positions = new Float32Array(centers.length * 2 * 3);
    const alongT = new Float32Array(centers.length * 2);
    const offset = new Float32Array(centers.length * 2);
    const rand = mulberry32(NEURON.SEED + 31);

    centers.forEach((center, i) => {
        // фаза своя у каждой связи — иначе все импульсы прыгают синхронно
        const phase = rand();

        positions[i * 6] = center.x;
        positions[i * 6 + 1] = center.y;
        positions[i * 6 + 2] = center.z;
        alongT[i * 2] = 0;
        offset[i * 2] = phase;

        positions[i * 6 + 3] = 0;
        positions[i * 6 + 4] = 0;
        positions[i * 6 + 5] = 0;
        alongT[i * 2 + 1] = 1;
        offset[i * 2 + 1] = phase;
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aT', new THREE.BufferAttribute(alongT, 1));
    geometry.setAttribute('aOffset', new THREE.BufferAttribute(offset, 1));
    return geometry;
}
