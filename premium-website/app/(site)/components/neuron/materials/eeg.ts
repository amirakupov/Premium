import * as THREE from 'three';
import { EEG, FINALE } from '../params';

/**
 * ─────────────────── ЛЕНТА ЗАПИСИ ───────────────────
 *
 * Толщина приходит uniform-ом, а не запечена в вершинах: атрибут `aOffset`
 * хранит единичное смещение поперёк ленты (с уже учтённым ограничением miter и
 * утончением на крутых участках), а шейдер домножает его на половину толщины.
 * Так толщину можно компенсировать под узкий экран, не перестраивая буфер на
 * каждый resize.
 */
const RIBBON_VERT = /* glsl */ `
  attribute vec2 aOffset;
  varying vec2 vUv;
  uniform float uThickness;
  void main() {
    vUv = uv;
    vec3 p = position + vec3(aOffset * uThickness, 0.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

/**
 * ── Почему здесь больше нет toneMapped: false ──
 *
 * Канвас работает с ACESFilmicToneMapping. Пока материал стоял с
 * `toneMapped: false`, лента рисовалась в обход тональной компрессии, её
 * значения были зажаты в [0,1], а порог блума — 0.5. Перо преодолевало порог
 * едва-едва, блум цеплял его вяло, и «свечение» приходилось изображать
 * ЗАГУЩЕНИЕМ краски: цвет пера был темнее цвета линии.
 *
 * Настоящее свечение требует значений ВЫШЕ единицы. Тело линии держится около
 * 1.0, перо умножается на uHeadHDR (2.5–4) в линейном пространстве, и результат
 * отдаётся ACES — она сжимает его в белое ядро с синим ореолом, а блум наконец
 * подхватывает по-настоящему. Отсюда же `#include <tonemapping_fragment>`: для
 * ShaderMaterial three кладёт функцию toneMapping в префикс, но вызывать её
 * обязан сам шейдер.
 */
const RIBBON_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform float uProgress;
  uniform float uOpacity;
  uniform vec3 uColor;
  uniform vec3 uHead;
  uniform float uHeadHDR;
  uniform float uHeadLength;
  uniform float uAfterglow;
  void main() {
    if (vUv.x > uProgress) discard;
    // мягкий спад поперёк ленты — край не «пилит»
    float across = 1.0 - abs(vUv.y * 2.0 - 1.0);
    float body = smoothstep(0.0, 0.55, across);

    // раскалённый участок у самого пера
    float head = smoothstep(uProgress - uHeadLength, uProgress, vUv.x);
    /* Послесвечение: только что записанный участок пару десятых секунды
       светится сильнее и остывает до цвета чернил. По сути тот же head, но с
       более длинным хвостом и слабее по амплитуде — дёшево и очень заметно. */
    float warm = smoothstep(uProgress - uAfterglow, uProgress, vUv.x);

    vec3 color = uColor + uHead * uHeadHDR * (head * head * 0.9 + warm * warm * warm * 0.3);
    gl_FragColor = vec4(color, body * uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createEegMaterial() {
    return new THREE.ShaderMaterial({
        vertexShader: RIBBON_VERT,
        fragmentShader: RIBBON_FRAG,
        uniforms: {
            uProgress: { value: 0 },
            uOpacity: { value: 0 },
            uThickness: { value: EEG.THICKNESS },
            uColor: { value: new THREE.Color(EEG.COLOR) },
            uHead: { value: new THREE.Color(EEG.HEAD_COLOR) },
            uHeadHDR: { value: 0 },
            uHeadLength: { value: EEG.HEAD_LENGTH },
            uAfterglow: { value: EEG.AFTERGLOW },
        },
        transparent: true,
        blending: THREE.NormalBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
    });
}

/**
 * ─────────────────── СЕТКА И РАМКА ───────────────────
 *
 * Один квад за лентой; всё остальное рисует фрагментный шейдер аналитически.
 * Ни инстансов линий, ни текстуры: инстансы — это сотни вызовов отрисовки,
 * текстура — лишний ресурс, который всё равно замылится на любом непривычном
 * DPR. Аналитика с `fwidth()` даёт ровно однопиксельную линию на любом
 * разрешении — а дешёвое решение видно именно на сетке, раньше всего.
 *
 * Сетка проявляется ВПЕРЕДИ пера и чуть гаснет позади: бумага всегда заправлена
 * в прибор до того, как по ней пойдёт перо, и именно это создаёт ощущение
 * прибора, а не картинки.
 */
const GRID_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const GRID_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform vec2 uSize;        // размер квада в локальных единицах
  uniform float uStep;       // шаг мелкой клетки
  uniform float uMajor;      // во сколько раз крупная клетка больше мелкой
  /* Где стоит перо — в ДОЛЯХ ШИРИНЫ квада, то есть в той же параметризации,
     что vUv.x. Это не uProgress ленты: тот — доля ДЛИНЫ ДУГИ (geometry/eeg.ts
     кладёт в uv.x накопленную длину), а дуга вдвое длиннее ширины и набирается
     неравномерно — каждая вертикаль калибровки и каждый пик QRS добавляют
     длину, не сдвигая x. Сравнивать долю дуги с долей ширины — значит светить
     бумагу то позади пера, то далеко впереди (docs/neuron-v5/baseline.md, 1.6). */
  uniform float uPenX;
  uniform float uOpacity;
  uniform vec3 uColor;
  uniform float uRadius;     // скругление рамки, в локальных единицах
  uniform float uBorder;     // толщина рамки

  /* Линии сетки шириной ровно в пиксель на любом DPR: fwidth даёт экранную
     производную координаты, и деление на неё нормирует толщину в пикселях.
     Без него сетка алиасится, и вся «дороговизна» кадра рассыпается. */
  float grid(vec2 p, float step, float w) {
    vec2 g = abs(fract(p / step - 0.5) - 0.5) / fwidth(p / step);
    return 1.0 - min(min(g.x, g.y) * w, 1.0);
  }

  float roundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  void main() {
    vec2 p = (vUv - 0.5) * uSize;

    float fine = grid(p, uStep, 1.0);
    float major = grid(p, uStep * uMajor, 1.15);
    /* Каждая пятая клетка заметно ярче — так читается миллиметровая бумага.
       Мелкая при этом сильно слабее крупной: если уравнять их, прямоугольник
       перестаёт быть бумагой и становится решёткой. */
    float ink = fine * 0.28 + major * 1.0;

    /* Бумага ВПЕРЕДИ пера — именно это и создаёт ощущение прибора: лист
       заправлен и освещён там, где перо только собирается писать. Полоса мягкая
       с обеих сторон: жёсткий край выдал бы, что это маска по прогрессу, а не
       физический лист.

       База растёт к концу записи: пока перо идёт, светится в основном полоса
       перед ним, а у законченной диаграммы освещён весь лист — это уже не
       процесс, а результат, и он обязан читаться целиком. */
    float band =
        smoothstep(uPenX + 0.42, uPenX + 0.03, vUv.x) *
        smoothstep(uPenX - 0.16, uPenX + 0.03, vUv.x);
    /* 0.95 — где по ширине квада заканчивается запись (правый край ленты плюс
       GRID_PAD_X): у дописанной диаграммы база выходит на максимум ровно в
       момент, когда перо встало, а не раньше. */
    float base = 0.4 + 0.47 * smoothstep(0.72, 0.95, uPenX);
    float paper = min(1.0, base + 0.55 * band);

    /* Рамка кадра тем же скруглением, что у карточек сайта: она связывает
       3D-диаграмму с вёрсткой и превращает «объект в пустоте» в элемент
       интерфейса. */
    float d = abs(roundedBox(p, uSize * 0.5 - uBorder, uRadius));
    float frame = 1.0 - smoothstep(0.0, uBorder, d);

    float alpha = (ink * paper * 0.075 + frame * 0.26) * uOpacity;
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(uColor, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createEegGridMaterial() {
    return new THREE.ShaderMaterial({
        vertexShader: GRID_VERT,
        fragmentShader: GRID_FRAG,
        uniforms: {
            uSize: {
                value: new THREE.Vector2(
                    EEG.WIDTH + FINALE.GRID_PAD_X * 2,
                    EEG.HEIGHT + FINALE.GRID_PAD_Y * 2,
                ),
            },
            uStep: { value: FINALE.GRID_STEP },
            uMajor: { value: FINALE.GRID_MAJOR },
            uPenX: { value: 0 },
            uOpacity: { value: 0 },
            uColor: { value: new THREE.Color('#a7cbf7') },
            uRadius: { value: 0.26 },
            uBorder: { value: 0.012 },
        },
        transparent: true,
        blending: THREE.NormalBlending,
        depthWrite: false,
    });
}

/**
 * ─────────────────── ПЕРО ───────────────────
 *
 * Отдельный объект в одну вершину, а не градиент на хвосте ленты: градиент
 * читается как «линия ярче к концу», а нужен физический наконечник. Стоимость —
 * один вызов отрисовки одной точки, зато у записи появляется то, чем она
 * пишется.
 *
 * Размер приходит в пикселях кадрового буфера и считается от толщины ленты (см.
 * Neuron.tsx): так перо остаётся пером и на широком мониторе, и на телефоне, где
 * диаграмма втрое мельче.
 */
const PEN_VERT = /* glsl */ `
  uniform float uSize;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize;
    gl_Position = projectionMatrix * mv;
  }
`;

const PEN_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uHDR;
  uniform float uOpacity;
  /* Ширина ореола. На низком тире композитора нет вовсе (profile.postprocessing
     = false, введено в v3), то есть блума там нет и HDR-ядро само по себе не
     даст свечения. Запасной путь — более широкий и яркий собственный ореол,
     который читается как свечение без постпроцессинга. */
  uniform float uHalo;
  void main() {
    vec2 offset = gl_PointCoord - 0.5;
    float dist = length(offset) * 2.0;
    if (dist > 1.0) discard;

    // ядро в HDR плюс мягкий ореол вокруг — его и добирает блум
    float core = smoothstep(0.42, 0.0, dist);
    float halo = pow(1.0 - dist, 2.4) * uHalo;

    vec3 color = uColor * (uHDR * core * core + 0.9 * halo);
    gl_FragColor = vec4(color, min(1.0, (core + halo * 0.75)) * uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createEegPenMaterial(halo: number) {
    return new THREE.ShaderMaterial({
        vertexShader: PEN_VERT,
        fragmentShader: PEN_FRAG,
        uniforms: {
            uSize: { value: 32 },
            uColor: { value: new THREE.Color(EEG.HEAD_COLOR) },
            uHDR: { value: 0 },
            uOpacity: { value: 0 },
            uHalo: { value: halo },
        },
        transparent: true,
        blending: THREE.NormalBlending,
        depthWrite: false,
    });
}

/** Буфер под перо: одна вершина, позиция ставится позицией самого объекта. */
export function createEegPenGeometry() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
    // одна точка в начале координат — автобокс дал бы нулевую сферу и отсечение
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1);
    return geometry;
}
