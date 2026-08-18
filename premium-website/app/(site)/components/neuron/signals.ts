import * as THREE from 'three';
import { SIGNAL } from './params';
import { clamp01, lerp, mulberry32 } from './utils';
import { samplePath } from './geometry/signalPaths';
import { createSignalGeometry } from './materials/signal';

/**
 * Система импульсов.
 *
 * В v1 это были 44 одинаковых точки с фиксированной скоростью и бесконечным
 * `% 1` — ни всплесков, ни залпов, ни реакции на скролл. Здесь у импульса есть
 * поведение, и оно приходит из главы:
 *
 *   faltering — часть импульсов не доходит до кончика: у каждого свой предел
 *               `reach`, за ним импульс гаснет. Это «сбой проводимости»
 *   sync      — фазы стягиваются к общему такту по кратчайшей дуге на
 *               окружности, поэтому синхронизация не даёт рывка на стыке 0/1
 *   collect   — сбор к соме: параметр t интерполируется к нулю, а не
 *               разворачивается, поэтому все приходят одновременно
 *   burst     — короткий залп: ускоряется одна группа импульсов, не все
 *
 * Плюс общий множитель от скорости скролла — единственная связь между рукой
 * пользователя и сценой.
 */

export type SignalParams = {
    /** доля активных импульсов, 0…1 */
    load: number;
    /** множитель базовой скорости из главы */
    speed: number;
    /** нормированная скорость скролла, 0…1 */
    velocity: number;
    /** 0…1 — насколько выражен сбой проводимости */
    faltering: number;
    /** 0…1 — насколько фазы стянуты в общий такт */
    sync: number;
    /** 0…1 — сбор к соме */
    collect: number;
    /** общая яркость */
    intensity: number;
};

type Signal = {
    path: number;
    phase: number;
    speed: number;
    /** доля пути, после которой импульс гаснет в режиме faltering */
    reach: number;
    /** номер группы: залп поднимает одну группу, а не всё сразу */
    group: number;
};

const scratch = new THREE.Vector3();

export type SignalSystem = {
    geometry: THREE.BufferGeometry;
    frame: (dt: number, params: SignalParams) => void;
    /** короткий залп в одной группе импульсов */
    burst: (duration: number) => void;
    dispose: () => void;
};

export function createSignalSystem(
    count: number,
    paths: Float32Array[],
    seed: number,
): SignalSystem {
    const geometry = createSignalGeometry(count);
    const rand = mulberry32(seed);
    const groups = 4;

    const signals: Signal[] = Array.from({ length: count }, (_, i) => ({
        path: Math.floor(rand() * paths.length),
        phase: rand(),
        speed: lerp(SIGNAL.SPEED_MIN, SIGNAL.SPEED_MAX, rand()),
        // Предел неуверенного импульса: от трети до трёх четвертей пути.
        // Ближе к концу «недоход» перестаёт читаться.
        reach: lerp(0.34, 0.76, rand()),
        group: i % groups,
    }));

    /** общий такт: к нему стягиваются фазы в режиме sync */
    let master = 0;
    let burstLeft = 0;
    let burstGroup = 0;

    const positions = geometry.attributes.position.array as Float32Array;
    const bright = geometry.attributes.aBright.array as Float32Array;

    const frame = (dt: number, params: SignalParams) => {
        const boost = 1 + params.velocity * SIGNAL.VELOCITY_BOOST;
        const common = params.speed * boost;

        if (burstLeft > 0) burstLeft -= dt;

        master = (master + SIGNAL.SPEED_MAX * common * dt) % 1;

        const active = Math.round(params.load * count);

        for (let s = 0; s < count; s += 1) {
            const signal = signals[s];
            const burstGain = burstLeft > 0 && signal.group === burstGroup ? 2.3 : 1;
            signal.phase = (signal.phase + signal.speed * common * burstGain * dt) % 1;

            if (params.sync > 0.001) {
                // кратчайшая дуга: иначе на стыке 0/1 импульс дёргается назад
                let delta = master - signal.phase;
                if (delta > 0.5) delta -= 1;
                if (delta < -0.5) delta += 1;
                signal.phase += delta * (1 - Math.exp(-3.2 * params.sync * dt));
                if (signal.phase < 0) signal.phase += 1;
                if (signal.phase >= 1) signal.phase -= 1;
            }

            const alive = s < active ? 1 : 0;
            const flat = paths[signal.path];

            for (let k = 0; k < SIGNAL.TRAIL; k += 1) {
                const raw = signal.phase - k * SIGNAL.TRAIL_GAP;
                const t = clamp01(lerp(raw, 0, params.collect));
                samplePath(flat, t, scratch);

                const index = s * SIGNAL.TRAIL + k;
                positions[index * 3] = scratch.x;
                positions[index * 3 + 1] = scratch.y;
                positions[index * 3 + 2] = scratch.z;

                // огибающая sin(t·π): импульс разгорается в пути и гаснет у кончика
                const envelope = Math.sin(clamp01(t) * Math.PI);
                const tail = 1 - k / SIGNAL.TRAIL;
                // на сборе импульсы не гаснут у сомы, а наоборот наливаются
                const arrival = lerp(envelope, 1, params.collect);
                // сбой проводимости: гаснет за своим пределом
                const fade =
                    params.faltering > 0.001
                        ? 1 - params.faltering * smoothstep(signal.reach - 0.12, signal.reach, t)
                        : 1;

                bright[index] =
                    raw < 0 && params.collect < 0.02
                        ? 0
                        : arrival * tail * tail * fade * params.intensity * alive;
            }
        }

        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.aBright.needsUpdate = true;
    };

    return {
        geometry,
        frame,
        burst(duration: number) {
            burstLeft = duration;
            burstGroup = Math.floor(rand() * groups);
        },
        dispose() {
            geometry.dispose();
        },
    };
}

function smoothstep(edge0: number, edge1: number, x: number) {
    const t = clamp01((x - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
}
