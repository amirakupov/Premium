import * as THREE from 'three';

/**
 * Электрод рисуется кольцом, а не залитой точкой: залитая читалась бы как ещё
 * один импульс, а кольцо — как метка на приборе.
 *
 * `uFlashId` + `uFlash` — микрособытие «вспышка на случайном синапсе»: один
 * электрод коротко разгорается ярче остальных. Адресуется по aSeed, поэтому
 * вспыхнуть может любой, ничего пересобирать не нужно.
 */
const VERT = /* glsl */ `
  attribute float aSeed;
  varying float vSeed;
  uniform float uSize;
  void main() {
    vSeed = aSeed;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * (1.0 / max(0.001, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  varying float vSeed;
  uniform float uOpacity;
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uFlash;
  uniform float uFlashId;
  void main() {
    vec2 offset = gl_PointCoord - 0.5;
    float dist = length(offset);
    // кольцо: узкая полоса вокруг радиуса 0.34
    float ring = 1.0 - smoothstep(0.06, 0.16, abs(dist - 0.34));
    if (ring < 0.01) discard;

    // своя фаза мерцания — сетка не загорается одним щелчком
    float blink = 0.55 + 0.45 * sin(uTime * 2.1 + vSeed * 12.566);
    float flash = uFlash * (1.0 - smoothstep(0.0, 0.02, abs(vSeed - uFlashId)));
    gl_FragColor = vec4(uColor, ring * uOpacity * (blink + flash * 2.5));
  }
`;

export function createElectrodeMaterial() {
    return new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
            uColor: { value: new THREE.Color('#6aa8f5') },
            uOpacity: { value: 0 },
            uTime: { value: 0 },
            uSize: { value: 130 },
            uFlash: { value: 0 },
            uFlashId: { value: -1 },
        },
        transparent: true,
        blending: THREE.NormalBlending,
        depthWrite: false,
        toneMapped: false,
    });
}
