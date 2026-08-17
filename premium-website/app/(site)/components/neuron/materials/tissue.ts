import * as THREE from 'three';
import { NEURON } from '../params';

/**
 * Материалы «плоти» нейрона: крона и сома.
 *
 * ЭТАП 1 — перенос как есть, без изменения картинки: пока это
 * `MeshBasicMaterial`, то есть плоская заливка, которая не реагирует на свет.
 * Свет, тон-маппинг и полупрозрачную двухслойную сому ставит этап 2 — здесь
 * важно было только вынести создание материалов из монолита, чтобы этап 2
 * менял один файл, а не сцену целиком.
 */
export function createDendriteMaterial() {
    return new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        toneMapped: false,
    });
}

export function createSomaMaterial() {
    return new THREE.MeshBasicMaterial({
        color: new THREE.Color(NEURON.COLOR_SOMA),
        transparent: true,
        toneMapped: false,
    });
}