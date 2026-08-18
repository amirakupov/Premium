import * as THREE from 'three';

/**
 * Синаптическая связь: тонкая линия от соседней клетки к соме, по которой
 * бежит импульс. Полоса подсветки считается во фрагментном шейдере по `aT`,
 * поэтому «перескок сигнала между клетками» не требует ни частиц, ни второй
 * системы — только два вершины на связь.
 */
const VERT = /* glsl */ `
  attribute float aT;
  attribute float aOffset;
  varying float vT;
  varying float vOffset;
  void main() {
    vT = aT;
    vOffset = aOffset;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  varying float vT;
  varying float vOffset;
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uColor;
  uniform vec3 uPulse;
  void main() {
    // импульс идёт от соседа (t=0) к соме (t=1), у каждой связи своя фаза
    float head = fract(uTime * 0.42 + vOffset);
    float band = 1.0 - smoothstep(0.0, 0.16, abs(vT - head));
    vec3 color = mix(uColor, uPulse, band);
    // сама связь еле видна, её выдаёт бегущий импульс
    float alpha = (0.22 + band * 0.78) * uOpacity;
    gl_FragColor = vec4(color, alpha);
  }
`;

export function createLinkMaterial() {
    return new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
            uTime: { value: 0 },
            uOpacity: { value: 0 },
            uColor: { value: new THREE.Color('#24406e') },
            uPulse: { value: new THREE.Color('#6aa8f5') },
        },
        transparent: true,
        blending: THREE.NormalBlending,
        depthWrite: false,
        toneMapped: false,
    });
}
