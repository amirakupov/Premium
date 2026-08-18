import * as THREE from 'three';
import { NEURON } from '../params';

const VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  uniform vec3 uColor;
  uniform float uIntensity;
  void main() {
    // френель: ореол собирается по краю сомы, центр остаётся прозрачным
    float rim = 1.0 - abs(dot(normalize(vNormal), normalize(vView)));
    rim = pow(rim, 2.2);
    // При обычном блендинге интенсивность идёт в прозрачность, а не в цвет:
    // умножать цвет нельзя — он бы чернел вместо того, чтобы гаснуть.
    gl_FragColor = vec4(uColor, clamp(rim * uIntensity, 0.0, 1.0));
  }
`;

/**
 * Френель-ореол вокруг сомы, нарисованный по BackSide.
 * В v1 он в одиночку тянул весь объём сцены; теперь это акцент поверх
 * настоящего света, поэтому базовая интенсивность заметно ниже.
 */
export function createAuraMaterial() {
    return new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
            uColor: { value: new THREE.Color(NEURON.COLOR_SOMA) },
            uIntensity: { value: 1 },
        },
        transparent: true,
        blending: THREE.NormalBlending,
        depthWrite: false,
        side: THREE.BackSide,
        toneMapped: false,
    });
}