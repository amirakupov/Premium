import * as THREE from 'three';

/**
 * Свой tube-builder с конусностью.
 *
 * `THREE.TubeGeometry` умеет только постоянный радиус — из-за этого в v1 крона
 * читалась как связка одинаковых трубок. Здесь радиус кольца считается на
 * каждом шаге:
 *
 *     r(t) = radius * (1 - taper * t) * (1 + noise(t))
 *
 * Плюс в геометрию пишется `aLengthT` — доля пройденной длины ветки. По ней
 * потом делаются и градиент, и прочерчивание роста, и сканирующая волна: всё
 * во фрагментном шейдере, без пересборки геометрии.
 *
 * Каркас (кольца, стыки, индексы) намеренно повторяет TubeGeometry — включая
 * систему Френе для ориентации колец.
 */
export function buildTaperedTube(
    points: THREE.Vector3[],
    radius: number,
    taper: number,
    radialSegments: number,
    tubularSegments: number,
    /** неровность радиуса: t (0…1) → относительное отклонение */
    noise: (t: number) => number,
) {
    const curve = new THREE.CatmullRomCurve3(points);
    const frames = curve.computeFrenetFrames(tubularSegments, false);

    const ringCount = tubularSegments + 1;
    const ringVerts = radialSegments + 1;
    const vertexCount = ringCount * ringVerts;

    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const lengthT = new Float32Array(vertexCount);

    const point = new THREE.Vector3();
    const normal = new THREE.Vector3();

    for (let i = 0; i < ringCount; i += 1) {
        const t = i / tubularSegments;
        curve.getPointAt(t, point);
        const N = frames.normals[i];
        const B = frames.binormals[i];
        const r = Math.max(1e-4, radius * (1 - taper * t) * (1 + noise(t)));

        for (let j = 0; j < ringVerts; j += 1) {
            const v = (j / radialSegments) * Math.PI * 2;
            const sin = Math.sin(v);
            const cos = -Math.cos(v);

            normal.set(
                cos * N.x + sin * B.x,
                cos * N.y + sin * B.y,
                cos * N.z + sin * B.z,
            ).normalize();

            const index = i * ringVerts + j;
            positions[index * 3] = point.x + normal.x * r;
            positions[index * 3 + 1] = point.y + normal.y * r;
            positions[index * 3 + 2] = point.z + normal.z * r;
            normals[index * 3] = normal.x;
            normals[index * 3 + 1] = normal.y;
            normals[index * 3 + 2] = normal.z;
            uvs[index * 2] = t;
            uvs[index * 2 + 1] = j / radialSegments;
            lengthT[index] = t;
        }
    }

    const indices: number[] = [];
    for (let i = 0; i < tubularSegments; i += 1) {
        for (let j = 0; j < radialSegments; j += 1) {
            const a = i * ringVerts + j;
            const b = (i + 1) * ringVerts + j;
            const c = (i + 1) * ringVerts + j + 1;
            const d = i * ringVerts + j + 1;
            indices.push(a, b, d, b, c, d);
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setAttribute('aLengthT', new THREE.BufferAttribute(lengthT, 1));
    geometry.setIndex(indices);
    return geometry;
}
