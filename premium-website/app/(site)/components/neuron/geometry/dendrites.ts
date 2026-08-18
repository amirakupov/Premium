import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { NEURON, TUBE } from '../params';
import { mulberry32 } from '../utils';
import type { Morphology } from './growNeuron';
import { buildTaperedTube } from './tube';

/**
 * Крона одной геометрией.
 *
 * Слияние обязательно: веток при BRANCH_DEPTH 3 больше сотни, и по draw call на
 * каждую сцена не выдержит. Атрибуты, которые шейдер использует дальше:
 *
 *   aLengthT   0…1 по длине СВОЕЙ ветки  — градиент, толщина эффектов
 *   aPathT     0…1 от сомы до самой дальней точки дерева — прочерчивание роста
 *              и сканирующая волна
 *   aDepth     нормированное поколение ветки — стволы отличаются от кончиков
 *   aBranchId  0…1, стабильный идентификатор ветки — по нему выбирается
 *              «дрожащая» ветка и адресуются одиночные события
 *
 * Все атрибуты ставятся до слияния: mergeGeometries требует одинаковый набор
 * атрибутов у всех частей, иначе молча вернёт null.
 */
export function buildDendriteGeometry(morphology: Morphology) {
    const { branches, maxDepth, maxDistance } = morphology;
    const trunk = new THREE.Color(NEURON.COLOR_TRUNK);
    const tip = new THREE.Color(NEURON.COLOR_TIP);
    const shade = new THREE.Color();
    const parts: THREE.BufferGeometry[] = [];
    const rand = mulberry32(NEURON.SEED + 7);

    for (let b = 0; b < branches.length; b += 1) {
        const branch = branches[b];
        // фаза шума своя у каждой ветки — иначе перетяжки выстроятся в ряд
        const phase = rand() * Math.PI * 2;
        const amplitude = TUBE.NOISE_AMP * (0.6 + rand() * 0.8);

        const geometry = buildTaperedTube(
            branch.points,
            branch.radius,
            TUBE.TAPER,
            NEURON.TUBE_RADIAL_SEGMENTS,
            TUBE.TUBULAR_SEGMENTS,
            (t) => Math.sin(t * TUBE.NOISE_FREQ * Math.PI * 2 + phase) * amplitude,
        );

        const lengthT = geometry.attributes.aLengthT.array as Float32Array;
        const count = lengthT.length;
        const colors = new Float32Array(count * 3);
        const pathT = new Float32Array(count);
        const depth = new Float32Array(count);
        const branchId = new Float32Array(count);

        const normalizedDepth = branch.depth / Math.max(1, maxDepth);
        const normalizedId = branches.length > 1 ? b / (branches.length - 1) : 0;

        for (let i = 0; i < count; i += 1) {
            const along = (branch.start + lengthT[i] * branch.length) / maxDistance;
            pathT[i] = along;
            depth[i] = normalizedDepth;
            branchId[i] = normalizedId;

            // Градиент по расстоянию от сомы, а не ступенькой на ветку: у сомы
            // глубокий синий, к кончикам светло-голубой, стыки не видны.
            shade.copy(trunk).lerp(tip, Math.min(1, along * 1.15));
            colors[i * 3] = shade.r;
            colors[i * 3 + 1] = shade.g;
            colors[i * 3 + 2] = shade.b;
        }

        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('aPathT', new THREE.BufferAttribute(pathT, 1));
        geometry.setAttribute('aDepth', new THREE.BufferAttribute(depth, 1));
        geometry.setAttribute('aBranchId', new THREE.BufferAttribute(branchId, 1));
        parts.push(geometry);
    }

    const merged = mergeGeometries(parts, false);
    parts.forEach((part) => part.dispose());
    return merged ?? new THREE.BufferGeometry();
}
