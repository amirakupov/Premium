import * as THREE from 'three';
import { NEURON } from '../params';
import { mulberry32, sphereDir } from '../utils';

export type Branch = {
    points: THREE.Vector3[];
    /** поколение ветки: 0 — ствол от сомы */
    depth: number;
    radius: number;
};

export type Morphology = {
    branches: Branch[];
    /** пути «сома → кончик»: по ним бегут импульсы */
    paths: Branch[][];
    maxDepth: number;
};

/**
 * Рекурсивно выращивает дендритное дерево и аксон.
 * `branchDepth` приходит из профиля тира: на слабом железе крона мельче.
 */
export function growNeuron(branchDepth: number): Morphology {
    const rand = mulberry32(NEURON.SEED);
    const branches: Branch[] = [];
    const paths: Branch[][] = [];

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
            branchDepth,
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

    return { branches, paths, maxDepth: branchDepth };
}