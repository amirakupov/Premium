import * as THREE from 'three';
import { EEG } from '../params';

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform float uProgress;
  uniform float uOpacity;
  uniform vec3 uColor;
  uniform vec3 uHead;
  uniform float uHeadLength;
  void main() {
    if (vUv.x > uProgress) discard;
    // мягкий спад поперёк ленты — край не «пилит»
    float across = 1.0 - abs(vUv.y * 2.0 - 1.0);
    float body = smoothstep(0.0, 0.55, across);
    // «перо» у переднего края: на светлом оно не разгорается, а густеет
    float head = smoothstep(uProgress - uHeadLength, uProgress, vUv.x);
    vec3 color = mix(uColor, uHead, head * head);
    gl_FragColor = vec4(color, body * uOpacity);
  }
`;

export function createEegMaterial() {
    return new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
            uProgress: { value: 0 },
            uOpacity: { value: 0 },
            uColor: { value: new THREE.Color(EEG.COLOR) },
            uHead: { value: new THREE.Color(EEG.HEAD_COLOR) },
            uHeadLength: { value: EEG.HEAD_LENGTH },
        },
        transparent: true,
        blending: THREE.NormalBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
    });
}