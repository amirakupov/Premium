import * as THREE from 'three';
import { SIGNAL } from '../params';

const VERT = /* glsl */ `
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

const FRAG = /* glsl */ `
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
    // к ядру цвет уходит в uCore и набирает непрозрачность. На тёмном отрезке
    // uCore приходит светлее оболочки (см. таблицу глав), и тот же код даёт
    // привычное «раскалённое ядро» — переключать логику не нужно.
    vec3 color = mix(uColor, uCore, vBright * 0.7);
    gl_FragColor = vec4(color, falloff * min(1.0, vBright * 1.15));
  }
`;

export function createSignalMaterial() {
    return new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
            uColor: { value: new THREE.Color('#1d4ed8') },
            uCore: { value: new THREE.Color('#12294d') },
            uSize: { value: SIGNAL.SIZE },
        },
        transparent: true,
        /* Обычный блендинг вместо аддитивного: сложение света работает только на
           тёмном грунте, а первая и последняя главы светлые — там аддитивный
           слой прибавлял бы к почти белому и исчезал. */
        blending: THREE.NormalBlending,
        depthWrite: false,
        toneMapped: false,
    });
}

/** Буферы под импульсы: позиция + яркость на каждую точку хвоста. */
export function createSignalGeometry(count: number) {
    const vertexCount = count * SIGNAL.TRAIL;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3),
    );
    geometry.setAttribute(
        'aBright',
        new THREE.BufferAttribute(new Float32Array(vertexCount), 1),
    );
    // импульсы живут внутри кроны — автобокс мешает, задаём сферу вручную
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 12);
    return geometry;
}