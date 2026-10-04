# perf-v4: правки плавности сцены и мелкие UI-дефекты — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Убрать измеренные провалы кадра на главной (компиляция шейдеров после занавеса, лишние перезаписи токенов на переходе, iframe карты) и починить восемь мелких UI-дефектов, не меняя хореографию сцены.

**Architecture:** Сцена остаётся одной `<Canvas>` под страницей; меняется только момент монтирования (под занавесом, с `frameloop="never"` и асинхронной компиляцией) и способ записи токенов темы (реже, без анимации радиуса размытия). UI-правки — CSS и один клиентский компонент (карта по клику). Каждая правка проверяется либо vitest-тестом на чистой функции/исходнике, либо замером профилировщиком из `docs/perf-v4/tools`.

**Tech Stack:** Next 16 (App Router, turbopack), React 19, three 0.185 (`WebGLRenderer.compileAsync`), @react-three/fiber 9.7 (`frameloop: 'never'`, `advance`), @react-three/postprocessing 3, gsap ScrollTrigger, vitest 4 (`environment: node`, тесты только в `lib/**/*.test.ts`).

**Spec:** `docs/perf-v4/report.md` (разделы 4 «План оптимизации» и 5 «UI-дефекты»). Числа «до» — там же, раздел 3.

## Global Constraints

- Node `>=22 <23` (package.json `engines`); зависимости не добавлять.
- `npm test` (vitest) обязан проходить после каждой задачи. `npm run lint` сломан в проекте (Next 16 без `next lint`) — не запускать и не чинить.
- Комментарии в коде — по-русски, в стиле проекта: объяснять «почему», ссылаться на замер (`docs/perf-v4/report.md`, раздел/пункт), а не пересказывать код.
- Сообщения коммитов — как в истории: `feat(neuron): …`, `fix(ui): …`, `docs(perf-v4): …`, по-русски; в конце каждого коммита строка `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Хореография сцены (таблица глав `sceneScript.ts`, окна `params.FINALE`, длины секций финала) не меняется — это решения владельца (docs/neuron-v5/report.md).
- Прод-сборка для замеров: `NEXT_PUBLIC_PERF_HARNESS=1 BACKEND_URL=http://localhost:8080 npx next build`, сервер `PORT=3100 BACKEND_URL=http://localhost:8080 npx next start -p 3100`, мок-бэкенд `node docs/perf-v3/tools/mock-backend.mjs`. Headless Chrome: `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port=9222 --user-data-dir=/tmp/perf-headless --disable-backgrounding-occluded-windows --window-size=1440,900 about:blank`.
- Работа ведётся в новой ветке `feat/perf-v4` от текущего `HEAD` (`a7091bb`, ветка `feat/disclosure-admin`): сцена там та же, что в `feat/neuron-finale`.

## Review Focus

1. **Повторный заход без занавеса** (sessionStorage `preloaderSeen=1`): сцена обязана появиться, даже если `compileAsync` отклонился или завис (нет `KHR_parallel_shader_compile`, потеря контекста). Тест: `frameloopFor` + страховочный таймер в Задаче 1, проверка `prof-boot.mjs` без `FIRST_VISIT`.
2. **`prefers-reduced-motion`**: один статичный кадр, как раньше; слой не должен остаться скрытым. Проверка эмуляцией медиа в Задаче 1 (шаг 9).
3. **Режим для слабовидящих (`html[data-a11y="1"]`)** после правки `--panel-bg`: подложка обязана оставаться прозрачной (блок `html[data-a11y="1"]` в globals.css ставит `--panel-bg: transparent`, `pageTheme.reset()` снимает инлайн). Проверка в Задаче 6 (шаг 4).
4. **Деградация финала** (`data-scene="off"`, reduced-motion): секция `#outro-verdict` короткая, и текст обязан показаться по ветке `'top 80%'`. Тест на исходник в Задаче 3 (шаг 1) проверяет, что ветка осталась.
5. **Карта**: при `declined`/`null` поведение прежнее; кнопка «Показать карту» доступна с клавиатуры; после клика iframe появляется ровно один раз. Проверка скриптом в Задаче 7 (шаг 4).

---

### Task 0: Ветка и фиксация аудита

**Files:**
- Commit: `docs/perf-v4/**` (уже лежит в рабочем дереве, не отслеживается)
- Commit: `docs/superpowers/plans/2026-10-04-perf-v4-fixes.md`

- [ ] **Step 1: Создать ветку от текущего HEAD**

```bash
cd /Users/amirakupov/Desktop/projects/CMS/premium/premium-website
git checkout -b feat/perf-v4
```

- [ ] **Step 2: Убедиться, что тесты зелёные до правок**

Run: `npm test`
Expected: все файлы `lib/*.test.ts` PASS (в `finale-frame.test.ts` 17 тестов).

- [ ] **Step 3: Закоммитить аудит и план**

```bash
git add docs/perf-v4 docs/superpowers/plans/2026-10-04-perf-v4-fixes.md
git commit -m "docs(perf-v4): аудит плавности сцены — отчёт, профилировщик, данные и план правок

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 1: Прогрев шейдеров под занавесом (провал #1: 83–117 мс после снятия занавеса)

Сейчас `NeuronCanvasMount` монтирует сцену только по `curtainDone`, и первый кадр синхронно компилирует 33 программы (`docs/perf-v4/data/boot-high.json`: programs 1 → 33 при dt 116,7 мс) уже на открытой странице. Решение: монтировать сразу, держать `frameloop="never"` и слой скрытым, компилировать через `gl.compileAsync` (параллельно, без блокировки), затем один ручной кадр `advance()` (композитор и запекание окружения), и только потом — `always`/`demand` и показ. Для повторного визита (занавеса нет) порядок тот же: сцена появится на ~150 мс позже, чем сейчас, но без длинного кадра.

**Files:**
- Create: `app/(site)/components/neuron/frameloop.ts`
- Test: `lib/neuron-frameloop.test.ts`
- Modify: `app/(site)/components/neuron/NeuronCanvasMount.tsx`
- Modify: `app/(site)/components/neuron/NeuronCanvas.tsx:35-164`
- Modify: `app/(site)/components/neuron/Neuron.tsx:84-95, 369-384, 702-747`
- Modify: `app/(site)/components/neuron/NeuronCanvas.module.css`
- Modify: `docs/perf-v4/tools/prof-boot.mjs` (флаг `FIRST_VISIT=1`)

**Interfaces:**
- Produces: `frameloopFor({ reduced, fps, live }): 'always' | 'demand' | 'never'` в `neuron/frameloop.ts`.
- Produces: проп `live: boolean` у `NeuronCanvas`; проп `onWarmed: () => void` у `Neuron`.
- Produces: user-timing метки `neuron:warm:start`, `neuron:warm:end` (их читает `prof-boot.mjs`).

- [ ] **Step 1: Написать падающий тест на выбор режима кадрового цикла**

`lib/neuron-frameloop.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { frameloopFor } from '../app/(site)/components/neuron/frameloop';

/**
 * Режим кадрового цикла — единственное место, где решается, рисует сцена
 * или ждёт. Таблица маленькая, но каждая строка — отдельный провал:
 * «never» на reduced-motion оставил бы пустой слой навсегда, «always» до
 * прогрева вернул бы кадр компиляции на открытую страницу
 * (docs/perf-v4/report.md, провал #1).
 */
describe('frameloopFor', () => {
    it('reduced-motion — один кадр по требованию, прогрев не ждём', () => {
        expect(frameloopFor({ reduced: true, fps: null, live: false })).toBe('demand');
        expect(frameloopFor({ reduced: true, fps: 30, live: true })).toBe('demand');
    });

    it('до прогрева и до снятия занавеса сцена не рисует', () => {
        expect(frameloopFor({ reduced: false, fps: null, live: false })).toBe('never');
        expect(frameloopFor({ reduced: false, fps: 30, live: false })).toBe('never');
    });

    it('после прогрева: без потолка — always, с потолком — demand под FrameDriver', () => {
        expect(frameloopFor({ reduced: false, fps: null, live: true })).toBe('always');
        expect(frameloopFor({ reduced: false, fps: 30, live: true })).toBe('demand');
    });
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npx vitest run lib/neuron-frameloop.test.ts`
Expected: FAIL — `Failed to resolve import "../app/(site)/components/neuron/frameloop"`.

- [ ] **Step 3: Написать `frameloop.ts`**

`app/(site)/components/neuron/frameloop.ts`:

```ts
export type Frameloop = 'always' | 'demand' | 'never';

/**
 * Режим кадрового цикла Canvas.
 *
 *   reduced  — prefers-reduced-motion: ровно один кадр по требованию, сцена
 *              статична, прогрев не нужен;
 *   never    — сцена смонтирована, но ещё не прогрета или занавес ещё идёт:
 *              кадры не рисуются, компиляция идёт асинхронно (Neuron.tsx);
 *   always   — вровень с монитором (high/mid);
 *   demand   — такт задаёт FrameDriver с потолком (low).
 *
 * `live` = прогрев завершён И занавес снят. Пока это не так, первый
 * настоящий кадр компилировал бы все программы синхронно уже на открытой
 * странице — 83–117 мс (docs/perf-v4/report.md, провал #1).
 */
export function frameloopFor(input: { reduced: boolean; fps: number | null; live: boolean }): Frameloop {
    if (input.reduced) return 'demand';
    if (!input.live) return 'never';
    return input.fps ? 'demand' : 'always';
}
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `npx vitest run lib/neuron-frameloop.test.ts`
Expected: PASS, 3 теста.

- [ ] **Step 5: Монтировать сцену сразу, передавать `live`**

`app/(site)/components/neuron/NeuronCanvasMount.tsx` — заменить файл целиком:

```tsx
'use client';

import dynamic from 'next/dynamic';
import { useCurtainDone } from '../curtain';

/**
 * Точка подключения сцены.
 *
 * three.js создаёт рендерер поверх window, на сервере это падает — поэтому
 * `ssr: false`. Постера здесь нет намеренно: весь текст первого экрана живёт
 * обычной серверной разметкой (NeuronHero и далее), LCP держит он, без WebGL
 * страница полностью работоспособна.
 *
 * Сцена монтируется СРАЗУ, а не после занавеса, — но до снятия занавеса не
 * рисует (`frameloop="never"`, NeuronCanvas) и компилирует шейдеры асинхронно
 * (`gl.compileAsync`, Neuron.tsx). Раньше монтирование ждало занавес, и первый
 * кадр собирал все 33 программы синхронно уже на открытой странице: один кадр
 * в 83–117 мс ровно в момент, когда пользователь начинает крутить
 * (docs/perf-v4/report.md, провал #1). Буквы прелоадера идут на CSS-анимации
 * композитором, и асинхронная компиляция им не мешает.
 */
const NeuronCanvas = dynamic(() => import('./NeuronCanvas'), { ssr: false });

export default function NeuronCanvasMount() {
    const curtainDone = useCurtainDone();
    return <NeuronCanvas live={curtainDone} />;
}
```

- [ ] **Step 6: В `NeuronCanvas` — состояние прогрева, `frameloopFor`, скрытый слой**

`app/(site)/components/neuron/NeuronCanvas.tsx`. Импорты — добавить:

```ts
import { frameloopFor } from './frameloop';
```

Сигнатуру и состояние (строки 35–48) заменить на:

```tsx
export default function NeuronCanvas({ live }: { live: boolean }) {
    const reduced = useMemo(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }, []);

    const [tier, setTier] = useState<Tier>(() => detectTier());
    const [nativeAntialias] = useState(() => !TIERS[detectTier()].postprocessing && !dbgFlag('noaa'));
    const [lost, setLost] = useState(() => !hasWebGL());
    const [hidden, setHidden] = useState(false);
    /* Прогрев: Neuron сообщает, когда шейдеры скомпилированы и один кадр
       отрисован вручную. До этого и до снятия занавеса сцена не рисует и
       слой скрыт — иначе первый кадр компилировал бы всё синхронно
       (docs/perf-v4/report.md, провал #1). */
    const [warmed, setWarmed] = useState(false);
    const onWarmed = useCallback(() => setWarmed(true), []);
    /* reduced-motion прогрева не ждёт: там один статичный кадр по требованию. */
    const running = live && (warmed || reduced);
```

Разметку (строки 110–162) заменить на:

```tsx
    return (
        <div
            className={`${reduced ? styles.layerStatic : styles.layer} ${
                running || reduced ? '' : styles.layerWarming
            }`}
            aria-hidden="true"
        >
            <Canvas
                className={styles.canvas}
                dpr={[1, profile.dpr]}
                /* never — до прогрева и снятия занавеса; always — вровень с
                   монитором; demand — там, где такт задаёт FrameDriver (low)
                   или нужен ровно один кадр (reduced-motion). См. frameloop.ts. */
                frameloop={frameloopFor({ reduced, fps: profile.fps, live: running })}
                eventSource={typeof document === 'undefined' || dbgFlag('nopointer') ? undefined : document.body}
                eventPrefix="client"
                gl={{
                    antialias: nativeAntialias,
                    alpha: true,
                    powerPreference: 'high-performance',
                    toneMapping: THREE.ACESFilmicToneMapping,
                    outputColorSpace: THREE.SRGBColorSpace,
                }}
                camera={{
                    fov: start.fov,
                    position: [start.position[0], start.position[1], start.position[2]],
                    near: CAMERA.NEAR,
                    far: CAMERA.FAR,
                }}
                onCreated={({ gl }) => {
                    performance.mark('neuron:gl-created');
                    gl.domElement.addEventListener('webglcontextlost', () => setLost(true), {
                        once: true,
                    });
                }}
            >
                <Neuron profile={profile} reduced={reduced} smaa={!dbgFlag('nosmaa')} onWarmed={onWarmed} />
                {running && !reduced && !hidden && profile.fps ? <FrameDriver fps={profile.fps} /> : null}
                {running && guarded && !hidden ? <PerformanceGuard onDowngrade={onDowngrade} /> : null}
            </Canvas>
            {!profile.postprocessing && !reduced ? <div className={styles.grain} aria-hidden="true" /> : null}
        </div>
    );
```

Комментарии у `gl`/`eventSource`/`onCreated`, которые были в исходнике (про alpha, тональную компрессию, указатель на body, невосстановление контекста), перенести без изменений — они объясняют решения и остаются верными.

- [ ] **Step 7: Скрытый слой в CSS**

`app/(site)/components/neuron/NeuronCanvas.module.css` — добавить после `.layer`:

```css
/**
 * Прогрев: сцена смонтирована, компилирует шейдеры и рисует один кадр
 * вручную, но показывать её рано — либо идёт занавес, либо (повторный
 * заход) кадр ещё не готов. visibility не останавливает WebGL: буферы
 * рисуются, слой просто не компонуется. Снимается, когда Neuron сообщил о
 * прогреве и занавес снят (NeuronCanvas, `running`).
 */
.layerWarming {
  visibility: hidden;
}
```

- [ ] **Step 8: В `Neuron` — асинхронная компиляция, ручной кадр, страховка по времени**

`app/(site)/components/neuron/Neuron.tsx`. Сигнатура (строки 84–93):

```tsx
export default function Neuron({
    profile,
    reduced,
    smaa = true,
    onWarmed,
}: {
    profile: TierProfile;
    reduced: boolean;
    /** SMAA в композиторе; false — только для A/B-замера */
    smaa?: boolean;
    /** шейдеры скомпилированы и один кадр отрисован — сцену можно показывать */
    onWarmed: () => void;
}) {
```

`useThree` (строка 95) — добавить `advance`:

```ts
    const { camera, scene, invalidate, advance, gl, size, viewport } = useThree();
```

Новый эффект — вставить сразу после эффекта «Новый профиль — новые материалы в исходном состоянии» (после строки 373):

```tsx
    /**
     * Прогрев. `compileAsync` собирает программы всех материалов сцены через
     * KHR_parallel_shader_compile и резолвится, когда драйвер их дособрал,
     * не блокируя главный поток. Композитор и запекание окружения
     * (Environment frames={1}) в сцене не числятся — их компилирует один
     * ручной кадр `advance()`: он идёт за скрытым слоем или под занавесом,
     * и его длина никому не видна. Потом NeuronCanvas переводит цикл в
     * always/demand и показывает слой.
     *
     * Страховка по времени: без расширения, при потере контекста или если
     * обещание не резолвится, сцена всё равно обязана появиться — иначе
     * повторный заход (без занавеса) остался бы с пустым слоем.
     * Повторный прогрев при смене профиля (дауншифт) безвреден: onWarmed
     * идемпотентен.
     */
    useEffect(() => {
        if (reduced) return;
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            try {
                advance(performance.now());
            } catch {
                /* ручной кадр — оптимизация, не условие показа */
            }
            performance.mark('neuron:warm:end');
            onWarmed();
        };
        performance.mark('neuron:warm:start');
        const fallback = window.setTimeout(finish, 1500);
        gl.compileAsync(scene, camera)
            .catch(() => undefined)
            .then(() => {
                window.clearTimeout(fallback);
                finish();
            });
        return () => {
            done = true;
            window.clearTimeout(fallback);
        };
    }, [built, reduced, gl, scene, camera, advance, onWarmed]);
```

- [ ] **Step 9: Собрать, прогнать тесты и замерить старт**

```bash
npm test
NEXT_PUBLIC_PERF_HARNESS=1 BACKEND_URL=http://localhost:8080 npx next build
# сервер 3100 и мок-бэкенд 8080 — см. Global Constraints; headless Chrome на 9222
node docs/perf-v4/tools/prof-boot.mjs boot-after-high "http://localhost:3100/?tier=high"
node docs/perf-v4/tools/prof-boot.mjs boot-after-mid "http://localhost:3100/?tier=mid"
```

Expected: `npm test` PASS; в `boot-after-*.json` поле `spikes` пустое или без кадров > 40 мс **после** `firstSceneFrameAt`; в `marks` есть `neuron:warm:start` и `neuron:warm:end`, и `programs` в `programsTimeline` достигает 34 (high) / 22 (mid) до метки `warm:end`. Для сравнения «до»: `docs/perf-v4/data/boot-high.json` — кадр 116,7 мс.

Проверка reduced-motion (Review Focus 2) — через `evalq.mjs` с эмуляцией медиа нельзя, поэтому прямым CDP-вызовом:

```bash
node -e '
const run=async()=>{const v=await (await fetch("http://localhost:9222/json/version")).json();const ws=new WebSocket(v.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);let id=0;const p=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&p.has(m.id)){p.get(m.id)(m.result);p.delete(m.id);}};const send=(method,params={},sessionId)=>new Promise(res=>{const i=++id;p.set(i,res);ws.send(JSON.stringify({id:i,method,params,sessionId}));});
const {targetId}=await send("Target.createTarget",{url:"about:blank"});const {sessionId}=await send("Target.attachToTarget",{targetId,flatten:true});const s=(m,q)=>send(m,q,sessionId);
await s("Page.enable");await s("Runtime.enable");await s("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});
await s("Page.addScriptToEvaluateOnNewDocument",{source:"try{sessionStorage.setItem(\"preloaderSeen\",\"1\")}catch(e){}"});
await s("Page.navigate",{url:"http://localhost:3100/"});await new Promise(r=>setTimeout(r,5000));
const r=await s("Runtime.evaluate",{expression:"(function(){var c=document.querySelector(\"canvas\");var l=c&&c.closest(\"div\");return {canvas:!!c, visibility:l&&getComputedStyle(l).visibility, renders: window.__neuron && __neuron.gl.info.render.frame}})()",returnByValue:true});
console.log(JSON.stringify(r.result.value));await send("Target.closeTarget",{targetId});ws.close();};run();'
```

Expected: `{"canvas":true,"visibility":"visible","renders":<число ≥ 1>}`.

- [ ] **Step 10: `prof-boot.mjs` — режим первого визита**

В `docs/perf-v4/tools/prof-boot.mjs` строка в `openPage` с `sessionStorage.setItem('preloaderSeen','1')` общая для всех инструментов; добавить флаг: в начале `main()` после `const page = await openPage(b, false);` вставить

```js
  if (process.env.FIRST_VISIT) {
    await page.s('Page.addScriptToEvaluateOnNewDocument', { source: `try{sessionStorage.removeItem('preloaderSeen');}catch(e){}` });
  }
```

(скрипты выполняются по порядку, второй снимает ключ, поставленный первым). Прогнать:

```bash
FIRST_VISIT=1 node docs/perf-v4/tools/prof-boot.mjs boot-after-first "http://localhost:3100/?tier=high"
```

Expected: `firstSceneFrameAt` ≈ 1,8–2,2 с (после занавеса), после него нет кадров > 40 мс; `neuron:warm:end` раньше `firstSceneFrameAt`.

- [ ] **Step 11: Коммит**

```bash
git add app/\(site\)/components/neuron/frameloop.ts lib/neuron-frameloop.test.ts \
  app/\(site\)/components/neuron/NeuronCanvasMount.tsx app/\(site\)/components/neuron/NeuronCanvas.tsx \
  app/\(site\)/components/neuron/Neuron.tsx app/\(site\)/components/neuron/NeuronCanvas.module.css \
  docs/perf-v4/tools/prof-boot.mjs
git commit -m "feat(neuron): прогрев шейдеров под занавесом — compileAsync и ручной кадр до показа сцены

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Реже писать токены перехода, не анимировать радиус размытия подложки

Полоса `band` квантована шагом 0,01: за один проход перехода 272–425 записей 17 свойств на `:root`, каждая — полный пересчёт стилей документа (`docs/perf-v4/report.md`, раздел 3 «Записи стилей»). `--panel-filter` менял радиус `blur(1…18px)` — 18 разных растровых эффектов, при том что в полосе подложка `--panel-bg` и так густеет до 0,96 и размытие под ней не читается. Решение: шаг 0,05, гистерезис на `swap`, `--panel-filter` больше не пишется (остаётся `none` из globals.css). Чистая арифметика выносится в `themeMath.ts` под тест.

**Files:**
- Create: `app/(site)/components/neuron/themeMath.ts`
- Test: `lib/theme-math.test.ts`
- Modify: `app/(site)/components/neuron/pageTheme.ts:176-191, 211-328`
- Modify: `app/(site)/components/neuron/Neuron.tsx:146-151` (вызов `createPageTheme`)

**Interfaces:**
- Produces: `bandOf(lum: number): number`, `swapOf(lum: number, previous: -1 | 0 | 1): 0 | 1`, константы `BAND_STEP`, `SWAP_LUMINANCE`, `SWAP_HYSTERESIS`, `BAND_LIGHT_EDGE`, `BAND_DARK_EDGE`.
- Changes: `createPageTheme(enabled: boolean)` — параметр `glass` удалён.

- [ ] **Step 1: Падающий тест**

`lib/theme-math.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
    BAND_STEP,
    SWAP_HYSTERESIS,
    SWAP_LUMINANCE,
    bandOf,
    swapOf,
} from '../app/(site)/components/neuron/themeMath';

/**
 * Полоса и переброс — единственные записи сцены на :root, и каждая стоит
 * полного пересчёта стилей (docs/perf-v4/report.md, раздел 3). Квантование
 * задаёт, сколько их будет за переход; гистерезис — чтобы на границе
 * яркости токены не дёргались туда-обратно при каждом щелчке колеса.
 */
describe('bandOf', () => {
    it('вне полосы — ноль с обеих сторон', () => {
        expect(bandOf(0.9)).toBe(0);
        expect(bandOf(0.01)).toBe(0);
    });

    it('внутри полосы — единица', () => {
        expect(bandOf(0.3)).toBe(1);
    });

    it('значения лежат на сетке BAND_STEP', () => {
        for (let lum = 0; lum <= 1; lum += 0.004) {
            const b = bandOf(lum);
            expect(Math.abs(b / BAND_STEP - Math.round(b / BAND_STEP))).toBeLessThan(1e-9);
        }
    });

    it('за проход полосы не больше 1/BAND_STEP различных значений на каждом склоне', () => {
        const seen = new Set<number>();
        for (let lum = 0.7; lum >= 0.4; lum -= 0.001) seen.add(bandOf(lum));
        expect(seen.size).toBeLessThanOrEqual(Math.round(1 / BAND_STEP) + 1);
    });
});

describe('swapOf', () => {
    it('без истории переключается ровно на SWAP_LUMINANCE', () => {
        expect(swapOf(SWAP_LUMINANCE + 0.001, -1)).toBe(0);
        expect(swapOf(SWAP_LUMINANCE - 0.001, -1)).toBe(1);
    });

    it('с истории — гистерезис: внутри зазора сторона не меняется', () => {
        expect(swapOf(SWAP_LUMINANCE - SWAP_HYSTERESIS / 2, 0)).toBe(0);
        expect(swapOf(SWAP_LUMINANCE + SWAP_HYSTERESIS / 2, 1)).toBe(1);
    });

    it('за зазором — меняется', () => {
        expect(swapOf(SWAP_LUMINANCE - SWAP_HYSTERESIS * 1.5, 0)).toBe(1);
        expect(swapOf(SWAP_LUMINANCE + SWAP_HYSTERESIS * 1.5, 1)).toBe(0);
    });
});
```

- [ ] **Step 2: Убедиться, что падает**

Run: `npx vitest run lib/theme-math.test.ts`
Expected: FAIL — модуль `themeMath` не найден.

- [ ] **Step 3: Написать `themeMath.ts`**

```ts
import { smoothstep } from './utils';

/**
 * Арифметика перехода фона, вынесенная из pageTheme ради теста.
 *
 * Граница переброса по ЛИНЕЙНОЙ яркости фона: крупный текст держит 3:1 по
 * обе стороны (тёмная краска ~3.9:1, светлая ~3.3:1).
 */
export const SWAP_LUMINANCE = 0.22;
/**
 * Гистерезис переброса. Без него на границе каждый щелчок колеса в обе
 * стороны перебрасывал бы 17 токенов туда-обратно — два полных пересчёта
 * стилей документа на ровном месте.
 */
export const SWAP_HYSTERESIS = 0.015;
/**
 * Полоса, внутри которой поверхности обязаны стать самодостаточными. Границы —
 * яркости фона, при которых активная краска перестаёт давать 4.5:1: светлая
 * сторона выдыхается ниже L≈0.56, тёмная — выше L≈0.07.
 */
export const BAND_LIGHT_EDGE = [0.62, 0.5] as const;
export const BAND_DARK_EDGE = [0.04, 0.07] as const;
/**
 * Шаг квантования полосы. Было 0,01 — до 25 перебросов 17 токенов на :root за
 * секунду скролла (docs/perf-v4/report.md, раздел 3). Поверхности густеют от
 * прозрачного к 0,96 за несколько сотен пикселей хода, двадцати ступеней на
 * это хватает с запасом: на глаз шаг 0,05 альфы не виден.
 */
export const BAND_STEP = 0.05;

export function bandOf(lum: number): number {
    const raw =
        smoothstep(BAND_LIGHT_EDGE[0], BAND_LIGHT_EDGE[1], lum) *
        smoothstep(BAND_DARK_EDGE[0], BAND_DARK_EDGE[1], lum);
    return Math.round(raw / BAND_STEP) * BAND_STEP;
}

/** Сторона пары «текст + поверхность»: 1 — тёмная. `previous` −1 — истории нет. */
export function swapOf(lum: number, previous: -1 | 0 | 1): 0 | 1 {
    if (previous === 1) return lum < SWAP_LUMINANCE + SWAP_HYSTERESIS ? 1 : 0;
    if (previous === 0) return lum < SWAP_LUMINANCE - SWAP_HYSTERESIS ? 1 : 0;
    return lum < SWAP_LUMINANCE ? 1 : 0;
}
```

- [ ] **Step 4: Тест проходит**

Run: `npx vitest run lib/theme-math.test.ts`
Expected: PASS, 7 тестов.

- [ ] **Step 5: Переключить `pageTheme.ts` на `themeMath`, убрать `--panel-filter` и параметр `glass`**

В `pageTheme.ts`:

1. Импорт `import { clamp01, smoothstep } from './utils';` заменить на

```ts
import { clamp01 } from './utils';
import { bandOf, swapOf } from './themeMath';
```

2. Удалить блок констант `SWAP_LUMINANCE`, `BAND_LIGHT_EDGE`, `BAND_DARK_EDGE` (строки 176–188) вместе с их комментариями — они переехали в `themeMath.ts`.

3. Сигнатуру и шапку фабрики (строки 206–216) заменить на:

```ts
/**
 * Размытие подложки (`--panel-filter`) сцена больше не пишет: в полосе
 * подложка густеет до 0,96 и размытие под ней не читается, а анимация
 * радиуса blur(1…18px) давала восемнадцать разных растровых эффектов на
 * самом нагруженном отрезке скролла (docs/perf-v4/report.md, 4.2).
 * В globals.css значение по умолчанию — `none`; reset() снимает старый
 * инлайн на случай живого переключения режима.
 */
export function createPageTheme(enabled: boolean): PageTheme {
    const root = typeof document === 'undefined' ? null : document.documentElement;
    const ground: HTMLElement | null =
        (typeof document === 'undefined' ? null : document.getElementById('page-ground')) ?? root;
    let lastDark = -1;
    let lastSwap: -1 | 0 | 1 = -1;
    let lastBand = -1;
```

(остальные переменные `lastBackground`, `lastWriteAt`, `a11y` — без изменений.)

4. В `apply` строки

```ts
            const swap = lum < SWAP_LUMINANCE ? 1 : 0;
            const band =
                Math.round(
                    smoothstep(BAND_LIGHT_EDGE[0], BAND_LIGHT_EDGE[1], lum) *
                        smoothstep(BAND_DARK_EDGE[0], BAND_DARK_EDGE[1], lum) *
                        100,
                ) / 100;
```

заменить на

```ts
            const swap = swapOf(lum, lastSwap);
            const band = bandOf(lum);
```

5. Удалить запись `--panel-filter` (блок с комментарием «Прозрачная подложка всё равно размывала бы фон…», `root.style.setProperty('--panel-filter', …)`). В `reset()` строку `root.style.removeProperty('--panel-filter');` **оставить**.

6. В `Neuron.tsx` (строки 146–151):

```ts
    const theme = useMemo(() => createPageTheme(!reduced), [reduced]);
```

Поле `pageGlass` в `perf.ts` остаётся: по нему globals.css гасит стекло через `data-scene-tier`.

- [ ] **Step 6: Проверить сборку типов и записи на :root**

```bash
npx tsc --noEmit -p tsconfig.json
npm test
NEXT_PUBLIC_PERF_HARNESS=1 BACKEND_URL=http://localhost:8080 npx next build
node docs/perf-v4/tools/prof.mjs theme-after "http://localhost:3100/?tier=high" 12 --cold
```

Expected: tsc без ошибок; в `theme-after.json` → `scrollDown.rootWrites` ≤ 120 (было 272–425), `rootProps` без ключа `--panel-filter`; `scrollDown.dt.p99` ≤ 17 мс.

- [ ] **Step 7: Контраст не ухудшился**

Run: `python3 docs/neuron-v2/contrast.py`
Expected: как и раньше, все пары AA. Скрипт держит СВОЮ копию границ (`SWAP_LUMINANCE`, `BAND_*_EDGE`, строки 108–110) — значения не менялись, править нечего; квантование в нём остаётся 0,01, это только делает проверку строже.

- [ ] **Step 8: Коммит**

```bash
git add app/\(site\)/components/neuron/themeMath.ts lib/theme-math.test.ts \
  app/\(site\)/components/neuron/pageTheme.ts app/\(site\)/components/neuron/Neuron.tsx
git commit -m "perf(theme): полоса шагом 0,05, гистерезис переброса, подложка без анимации размытия

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Финал — метки и кнопка не въезжают в уже нарисованную диаграмму

До прилипания коробки `.verdictSticky` DOM едет вместе со страницей, а 3D-диаграмма стоит (кадр посчитан от верха приклеенного контейнера, `finaleFrame.ts`). Текст, кнопка и метки проявляются с `start: 'top 10%'`, то есть за 10svh до прилипания, и эти 10svh въезжают в сетку (`docs/perf-v4/shots/desk-11-p7.7.jpg`). Решение без правки хореографии: проявлять их ровно в момент прилипания (`'top top'`). Вариант со сдвигом 3D-группы вслед за контейнером отвергнут: тогда нейрон летел бы к перу, которое ещё ниже экрана, а диаграмма прочерчивалась бы в движении — это смена режиссуры, не починка.

**Files:**
- Modify: `app/(site)/components/SectionMotion.tsx:158-164`
- Test: `lib/finale-frame.test.ts` (новый `describe`)

- [ ] **Step 1: Падающий тест на исходник**

В конец `lib/finale-frame.test.ts` добавить:

```ts
describe('появление текста финала', () => {
    const MOTION = read('app/(site)/components/SectionMotion.tsx');

    it('со сценой текст, кнопка и метки появляются не раньше прилипания коробки', () => {
        /* До прилипания DOM едет, а 3D стоит: любое `top N%` с N > 0 въезжает
           в нарисованную сетку (docs/perf-v4/report.md, UI-дефект 1). */
        const m = /verdict\.offsetHeight > window\.innerHeight \? '([^']+)' : '([^']+)'/.exec(MOTION);
        expect(m, 'в SectionMotion нет выбора точки старта по высоте секции').not.toBeNull();
        expect(m![1]).toBe('top top');
    });

    it('в режимах деградации (короткая секция) остаётся ранний старт', () => {
        const m = /verdict\.offsetHeight > window\.innerHeight \? '([^']+)' : '([^']+)'/.exec(MOTION);
        expect(m![2]).toBe('top 80%');
    });
});
```

- [ ] **Step 2: Убедиться, что первый тест падает**

Run: `npx vitest run lib/finale-frame.test.ts`
Expected: FAIL — `expected 'top 10%' to be 'top top'`.

- [ ] **Step 3: Поменять точку старта и комментарий**

`SectionMotion.tsx`, строки 158–164: комментарий «v5: линия дописывается…» и функцию `start` заменить на:

```ts
                /* v5: линия дописывается ещё до того, как секция приклеится
                   (FINALE.DRAW_END → p ≈ 7.55). perf-v4: старт — РОВНО в момент
                   прилипания (`top top`), а не за 10 % экрана до него. До
                   прилипания коробка едет вместе со страницей, а 3D-сетка стоит
                   на месте: за эти 10svh метки отведений оказывались на ~60 px
                   ниже своих строк, калибровка — под рамкой, а кнопка
                   «Записаться» ложилась на верхнюю кромку диаграммы
                   (docs/perf-v4/shots/desk-11-p7.7.jpg). После прилипания DOM и
                   3D в одной системе отсчёта, и расхождения нет по построению.
                   До начала выхода (p = 8) остаётся 25svh хода — тексту хватает. */
                const start = () =>
                    verdict.offsetHeight > window.innerHeight ? 'top top' : 'top 80%';
```

- [ ] **Step 4: Тесты проходят**

Run: `npx vitest run lib/finale-frame.test.ts`
Expected: PASS, 19 тестов.

- [ ] **Step 5: Проверить глазами на трёх вьюпортах**

```bash
NEXT_PUBLIC_PERF_HARNESS=1 BACKEND_URL=http://localhost:8080 npx next build
node docs/perf-v4/tools/shots.mjs "http://localhost:3100/"
```

Открыть `docs/perf-v4/tools/shots/desk-11-p7.7.jpg`, `lap-11-p7.7.jpg`, `mob-11-p7.7.jpg`: диаграмма есть, текста, кнопки и меток ещё нет. `*-09-outro-verdict.jpg` (p = 8): метки Fp1…O1 на строках сетки, калибровка внутри рамки, кнопка выше рамки (как на `docs/perf-v4/shots/desk-09-outro-verdict.jpg`).

- [ ] **Step 6: Коммит**

```bash
git add app/\(site\)/components/SectionMotion.tsx lib/finale-frame.test.ts
git commit -m "fix(finale): текст и метки появляются в момент прилипания коробки, а не въезжают в сетку

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Шапка на 1440 px — зазор между «Адрес» и телефоном

На 1440 px строка шапки заполнена без остатка (логотип 158 + nav 577 + телефон 171 + поиск 200 + отступы = 1146 из 1148 px), `.nav { margin: 0 auto … }` схлопывается в ноль, и «Адрес» прилипает к иконке телефона (`docs/perf-v4/shots/zoom-desk-addr.jpg`). Решение: чуть уже шаг между пунктами и явный отступ у телефона.

**Files:**
- Modify: `app/(site)/components/Header.module.css:58-63, 86-96`

- [ ] **Step 1: Правка CSS**

`.nav` (строки 58–63):

```css
/* Desktop-навигация */
.nav {
  display: flex;
  /* Верх 24px, а не 32: на 1440 семь пунктов плюс телефон и поиск
     заполняли строку без остатка, auto-отступ справа схлопывался, и
     «Адрес» прилипал к иконке телефона (docs/perf-v4/report.md, UI 3). */
  gap: clamp(14px, 1.6vw, 24px);
  margin: 0 auto 0 1.5rem;
  align-items: center;
}
```

`.headerPhone` (строки 86–96) — добавить явный отступ:

```css
.headerPhone {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  /* Зазор от навигации не зависит от того, остался ли у .nav auto-отступ. */
  margin-left: clamp(12px, 1.5vw, 24px);
  color: var(--brand);
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}
```

Мобильное правило (`@media (max-width: 900px) .headerPhone { margin-left: auto; … }`) стоит ниже и перекрывает `margin-left` — не трогать.

- [ ] **Step 2: Проверить геометрию на 1440 и 1280**

```bash
NEXT_PUBLIC_PERF_HARNESS=1 BACKEND_URL=http://localhost:8080 npx next build
node docs/perf-v4/tools/evalq.mjs "http://localhost:3100/" desk "(function(){var h=document.querySelector('header');var r=s=>h.querySelector(s).getBoundingClientRect();var nav=r('nav'),ph=r('[class*=headerPhone]'),se=r('[class*=desktopSearch]');var hb=h.getBoundingClientRect();return {gapNavPhone:Math.round(ph.left-nav.right), searchInside: se.right <= hb.right - 16, searchRight:Math.round(se.right), headerRight:Math.round(hb.right)}})()"
```

Expected: `gapNavPhone` ≥ 12, `searchInside: true`. Повторить с `desk` → ширина 1280 через правку `evalq.mjs` не нужна: открыть `docs/perf-v4/tools/shots/lap-00-hero.jpg` после `shots.mjs` и убедиться, что поиск не вылез за капсулу.

- [ ] **Step 3: Коммит**

```bash
git add app/\(site\)/components/Header.module.css
git commit -m "fix(header): зазор между навигацией и телефоном на 1440

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Кнопка «Версия для слабовидящих» в потоке — только по фокусу

`.a11y-row` лежит в потоке с `padding-top: 12px` под фиксированной шапкой (12–88 px) на всех страницах и вьюпортах: кнопка всегда под шапкой, а на телефоне, где шапка уже контейнера, из-под неё торчит белый угол (`docs/perf-v4/shots/zoom-mob-corner.jpg`). Никто её не видел, но клавиатура до неё доходит. Решение по образцу `.skip-link`: фиксированная позиция рядом с ним, видна только при фокусе внутри; мышиным пользователям остаётся кнопка в футере.

**Files:**
- Modify: `app/globals.css:777-783` (правило `.a11y-row`)

- [ ] **Step 1: Правка CSS**

Заменить правило `.a11y-row` на:

```css
/**
 * Кнопка режима для слабовидящих на витрине. В потоке она стояла под
 * фиксированной шапкой на всех страницах, а на телефоне торчала из-под её
 * скруглённого угла (docs/perf-v4/report.md, UI 2). Теперь — как skip-link:
 * фиксирована у верхнего края, появляется только когда фокус внутри.
 * Мышью режим включается кнопкой в футере.
 */
.a11y-row {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: calc(var(--z-overlay) + 1);
  margin: 0;
  padding: 0;
  transform: translateY(-200%);
  opacity: 0;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.a11y-row:focus-within {
  transform: none;
  opacity: 1;
}

.a11y-row .a11y-trigger {
  padding: 12px 20px;
  border-radius: 999px;
  border: 0;
  background: var(--surface);
  color: var(--brand);
  font-weight: 600;
  box-shadow: var(--shadow-lift);
  cursor: pointer;
}
```

- [ ] **Step 2: Проверить на телефоне и клавиатурой**

```bash
NEXT_PUBLIC_PERF_HARNESS=1 BACKEND_URL=http://localhost:8080 npx next build
node docs/perf-v4/tools/evalq.mjs "http://localhost:3100/" mob "(function(){var b=document.querySelector('.a11y-row .a11y-trigger');var cs=getComputedStyle(b.parentElement);var before={opacity:cs.opacity, under:document.elementsFromPoint(370,20).map(e=>e.className&&String(e.className).split(' ')[0]).slice(0,2)}; b.focus(); var after=getComputedStyle(b.parentElement).opacity; return {before, afterFocus: after}})()"
```

Expected: `before.opacity` = `"0"`, `before.under` без `a11y-trigger`/`a11y-row` (сверху `Header…`), `afterFocus` = `"1"`.

- [ ] **Step 3: Коммит**

```bash
git add app/globals.css
git commit -m "fix(a11y): кнопка режима на витрине не прячется под шапкой — показывается по фокусу

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Текст нарративных экранов поверх сомы — постоянная лёгкая подложка

На «Симптоме» и «Диагностике» абзац ложится прямо на светящееся ядро (`docs/perf-v4/shots/mob-03-diagnostics.jpg`, `desk-03-diagnostics.jpg`): подложка `--panel-bg` включается только в полосе яркости фона, а тут фон тёмный, но под текстом не фон, а объект. Решение в рамках системы токенов: базовые (вне полосы) значения `--panel-bg` делаются слегка непрозрачными; в полосе — как раньше, 0,96. Контраст текста к подложке от этого только растёт.

**Files:**
- Modify: `app/(site)/components/neuron/pageTheme.ts` (строка `--panel-bg` в `TOKENS`)
- Modify: `app/globals.css:52-53` (значение по умолчанию `--panel-bg`)

- [ ] **Step 1: Токен**

В `TOKENS` (`pageTheme.ts`) строку

```ts
    [
        '--panel-bg',
        'rgba(255, 255, 255, 0)',
        'rgba(255, 255, 255, 0.96)',
        'rgba(10, 22, 40, 0)',
        'rgba(10, 22, 40, 0.96)',
    ],
```

заменить на

```ts
    /* Подложка под корпусным текстом нарративных экранов. Вне полосы она не
       нулевая: на «Диагностике» камера внутри кроны и абзац ложится прямо на
       светящуюся сому, на телефоне то же на «Симптоме» — без подложки контраст
       светлого текста к голубому ядру около 2:1 (docs/perf-v4/report.md, UI 4).
       0,22/0,34 — минимум, при котором текст читается, а подложка ещё не
       превращается в карточку. */
    [
        '--panel-bg',
        'rgba(255, 255, 255, 0.22)',
        'rgba(255, 255, 255, 0.96)',
        'rgba(10, 22, 40, 0.34)',
        'rgba(10, 22, 40, 0.96)',
    ],
```

В `globals.css` значение по умолчанию (`--panel-bg: rgba(255, 255, 255, 0);`, строка 52) заменить на `--panel-bg: rgba(255, 255, 255, 0.22);` с тем же комментарием, дополненным: «базовое значение — не ноль, см. pageTheme.ts, TOKENS». Блок `html[data-a11y="1"]` (`--panel-bg: transparent`) не трогать.

- [ ] **Step 2: Собрать и снять кадры**

```bash
NEXT_PUBLIC_PERF_HARNESS=1 BACKEND_URL=http://localhost:8080 npx next build
node docs/perf-v4/tools/shots.mjs "http://localhost:3100/"
```

Открыть `docs/perf-v4/tools/shots/mob-02-symptom.jpg`, `mob-03-diagnostics.jpg`, `desk-02-symptom.jpg`, `desk-03-diagnostics.jpg`: абзац читается на фоне сомы; подложка не читается как отдельная карточка на светлом «Симптоме» (если читается — снизить 0,22 до 0,16 и повторить).

- [ ] **Step 3: Контраст и a11y-режим**

Скрипт `docs/neuron-v2/contrast.py` держит свою копию таблицы токенов: строка 104 `'panel-bg': ((255, 255, 255, 0.0), (255, 255, 255, 0.96), (10, 22, 40, 0.0), (10, 22, 40, 0.96))`. Поменять базовые альфы на те же, что в TOKENS: `0.0 → 0.22` у светлой и `0.0 → 0.34` у тёмной стороны (пары «корпус на подложке нарратива» проверяются в полосе, где значение 0,96 не менялось).

Run: `python3 docs/neuron-v2/contrast.py`
Expected: все пары AA.

```bash
node docs/perf-v4/tools/evalq.mjs "http://localhost:3100/" desk "(function(){document.documentElement.dataset.a11y='1'; return getComputedStyle(document.querySelector('#symptom [class*=inner]')).backgroundColor})()"
```

Expected: `rgba(0, 0, 0, 0)` (прозрачно — блок `html[data-a11y="1"]` побеждает).

- [ ] **Step 4: Коммит**

```bash
git add app/\(site\)/components/neuron/pageTheme.ts app/globals.css docs/neuron-v2/contrast.py
git commit -m "fix(narrative): лёгкая подложка под текстом поверх сомы на тёмных и светлых главах

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Карта в футере — по клику, без iframe в потоке скролла

iframe виджета Яндекс Карт вставляется при подходе к футеру (кадр 183 мс, `docs/perf-v4/data/high.json`, spike p 8,96) и показывает чужую рекламу внутри футера (`docs/perf-v4/shots/desk-15-bottom.jpg`). Решение: после согласия на cookies — плашка с кнопкой «Показать карту» и ссылкой; iframe только по клику. Логика согласия не меняется.

**Files:**
- Modify: `app/(site)/components/MapEmbed.tsx`
- Modify: `app/(site)/components/Footer.module.css:72-82` (кнопка внутри плашки)

- [ ] **Step 1: Компонент**

`MapEmbed.tsx` — заменить тело компонента (с `export default function MapEmbed()` до конца файла):

```tsx
/**
 * Карта в футере грузится только после согласия на cookies: виджет Яндекс Карт
 * ставит свои cookies, и именно про него говорит текст баннера. До решения и
 * при отказе — плашка со ссылкой на карту в новой вкладке.
 *
 * После согласия карта тоже не вставляется сама: iframe виджета стоил кадр в
 * 183 мс на подходе к футеру и показывал внутри футера чужую рекламу
 * (docs/perf-v4/report.md, 4.3 и UI 5). Теперь — кнопка «Показать карту»;
 * ссылка «Открыть в Яндекс Картах» остаётся для тех, кому виджет не нужен.
 */
export default function MapEmbed() {
  const [consent, setConsent] = useState<CookieConsent>(null);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    const sync = () => setConsent(readCookieConsent());
    sync();
    window.addEventListener(COOKIE_CONSENT_EVENT, sync);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, sync);
  }, []);

  if (consent === 'accepted' && opened) {
    return (
      <iframe
        src={WIDGET_SRC}
        width="500"
        height="400"
        frameBorder="0"
        title="Клиника «Премиум» на карте"
      />
    );
  }

  return (
    <div className={styles.mapPlaceholder}>
      <p className={styles.text}>
        {consent === 'accepted'
          ? 'Интерактивная карта Яндекса откроется по нажатию.'
          : consent === 'declined'
            ? 'Карта не загружена: вы отклонили использование cookies.'
            : 'Карта загрузится после согласия на использование cookies.'}
      </p>
      {consent === 'accepted' ? (
        <button type="button" className={styles.mapButton} onClick={() => setOpened(true)}>
          Показать карту
        </button>
      ) : null}
      <a href={MAP_LINK} target="_blank" rel="noopener noreferrer" className={styles.link}>
        Открыть в Яндекс Картах
      </a>
    </div>
  );
}
```

- [ ] **Step 2: Стиль кнопки**

В `Footer.module.css` после `.mapPlaceholder { … }` добавить:

```css
/* Кнопка в плашке карты: на тёмном стекле футера — светлая пилюля, как ссылки. */
.mapButton {
  padding: 10px 18px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.1);
  color: var(--on-dark);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.mapButton:hover,
.mapButton:focus-visible {
  background: rgba(255, 255, 255, 0.18);
}
```

- [ ] **Step 3: Сборка и тесты**

```bash
npx tsc --noEmit -p tsconfig.json
npm test
NEXT_PUBLIC_PERF_HARNESS=1 BACKEND_URL=http://localhost:8080 npx next build
```

Expected: без ошибок.

- [ ] **Step 4: Проверка трёх состояний и клика**

```bash
# согласие принято (evalq ставит cookie_consent? нет — ставим сами в выражении через reload невозможно; проверяем событием)
node docs/perf-v4/tools/evalq.mjs "http://localhost:3100/" desk "(async function(){localStorage.setItem('cookie_consent','accepted'); window.dispatchEvent(new Event('cookie-consent')); await new Promise(r=>setTimeout(r,300)); var f=document.querySelector('footer'); var before={iframe:!!f.querySelector('iframe'), button:!!f.querySelector('button[class*=mapButton]')}; f.querySelector('button[class*=mapButton]').click(); await new Promise(r=>setTimeout(r,300)); var after={iframe:!!f.querySelector('iframe'), buttons:f.querySelectorAll('button[class*=mapButton]').length}; localStorage.setItem('cookie_consent','declined'); window.dispatchEvent(new Event('cookie-consent')); await new Promise(r=>setTimeout(r,300)); var declined={iframe:!!f.querySelector('iframe'), text:f.querySelector('[class*=mapPlaceholder] p').textContent}; return {before, after, declined}})()" 20000
```

Expected: `before: {iframe:false, button:true}`, `after: {iframe:true, buttons:0}`, `declined: {iframe:false, text:'Карта не загружена: вы отклонили использование cookies.'}`.

Замер низа страницы: `node docs/perf-v4/tools/prof.mjs map-after "http://localhost:3100/?tier=high" 14 --cold` → в `scrollDown.spikes` нет кадра на p > 8,9 (раньше 183 мс).

- [ ] **Step 5: Коммит**

```bash
git add app/\(site\)/components/MapEmbed.tsx app/\(site\)/components/Footer.module.css
git commit -m "fix(footer): карта Яндекса — по кнопке, iframe не вставляется при прокрутке

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Фото клиники — уточнить причину задачи 117–250 мс и сузить картинки

В headless-прогонах на всех тирах при первом подходе к `#clinic-photos` одна задача главного потока 117–250 мс (`docs/perf-v4/data/{high,mid,low}.json`, spike p ≈ 5,0); на прогретом HTTP-кэше (`mid-photos.json`) её нет. Разбивка задачи не снята (порог был 50 мс без детализации). Задача: снять разбивку на холодном кэше и применить правку картинок, если причина в них.

**Files:**
- Modify: `app/(site)/components/ClinicFotos.tsx:44-51` (только по результату шага 2)
- Modify: `docs/perf-v4/report.md` (раздел 4.3 — уточнение)

- [ ] **Step 1: Холодный профиль Chrome, разбивка задач от 20 мс**

```bash
pkill -f "remote-debugging-port=9222"; sleep 1
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port=9222 \
  --user-data-dir=/tmp/perf-headless-cold-$(date +%s) --disable-backgrounding-occluded-windows --window-size=1440,900 about:blank &
sleep 4
cd docs/perf-v4/tools
TASK_MS=20 node prof.mjs photos-cold "http://localhost:3100/?tier=mid" 12 --cold --trace
node -e 'const o=require("./results/photos-cold.json");console.log(JSON.stringify(o.scrollDown.spikes));for(const t of o.trace.longTasks)console.log(t.at,t.dur,t.top.join(" | "))'
```

Expected: одна задача ≥ 50 мс около p 5; её `top` показывает, что внутри.

- [ ] **Step 2: Решение по разбивке**

- Если среди `top` есть `Decode Image`, `ImageDecode`, `Decode LazyPixelRef`, `Paint` или `Rasterize` с долей ≥ 40 % задачи — причина в картинках, перейти к шагу 3.
- Иначе (например `FunctionCall … SectionMotion`, `Layout`, `UpdateLayoutTree`) — записать разбивку в `report.md` (раздел 4.3, абзац «Уточнение perf-v4») и **не трогать** `ClinicFotos.tsx`; перейти к шагу 5 с правкой только отчёта.

- [ ] **Step 3: Сузить картинки под реальный размер слайда**

Слайд — `flex: 0 0 72%`, `max-width: 760px` (ClinicFotos.module.css), то есть на десктопе ≤ 740 px содержимого, на телефоне ~72vw; текущие `sizes="(max-width: 768px) 90vw, 45vw"` на 1440 просят 648 px CSS → 1296 px при dpr 2, то есть исходник 1280 px целиком. В `ClinicFotos.tsx` заменить `<Image …>` на:

```tsx
                <Image
                  src={src}
                  alt={`Интерьер и оборудование клиники — фото ${index + 1}`}
                  fill
                  /* Реальный размер слайда: 72 % контейнера, не шире 740 px по
                     содержимому (ClinicFotos.module.css). Прежние 45vw на 1440
                     просили картинку шире слайда, и на подходе к секции десять
                     исходников декодировались целиком одной задачей главного
                     потока 117–250 мс (docs/perf-v4/report.md, 4.3). */
                  sizes="(max-width: 768px) 72vw, min(45vw, 740px)"
                  quality={72}
                  style={{ objectFit: 'cover' }}
                  className={styles.image}
                />
```

- [ ] **Step 4: Пересобрать и повторить холодный замер**

```bash
cd /Users/amirakupov/Desktop/projects/CMS/premium/premium-website
NEXT_PUBLIC_PERF_HARNESS=1 BACKEND_URL=http://localhost:8080 npx next build
pkill -f "remote-debugging-port=9222"; sleep 1
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port=9222 \
  --user-data-dir=/tmp/perf-headless-cold-$(date +%s) --disable-backgrounding-occluded-windows --window-size=1440,900 about:blank &
sleep 4
cd docs/perf-v4/tools && TASK_MS=20 node prof.mjs photos-cold-after "http://localhost:3100/?tier=mid" 12 --cold --trace
node -e 'const o=require("./results/photos-cold-after.json");console.log(JSON.stringify(o.scrollDown.spikes));for(const t of o.trace.longTasks)console.log(t.at,t.dur,t.top.join(" | "))'
```

Expected: задача около p 5 короче ≥ 30 % относительно `photos-cold`, либо исчезла. Если не изменилась — откатить правку `ClinicFotos.tsx` (`git checkout -- "app/(site)/components/ClinicFotos.tsx"`) и записать это в отчёт.

- [ ] **Step 5: Записать результат в отчёт и закоммитить**

В `docs/perf-v4/report.md`, раздел 4.3, добавить абзац «**Уточнение (perf-v4, реализация):**» с разбивкой задачи до/после (имена из `top`, длительности) и принятым решением. Скопировать `photos-cold*.json` в `docs/perf-v4/data/`.

```bash
git add docs/perf-v4/report.md docs/perf-v4/data/photos-cold.json docs/perf-v4/data/photos-cold-after.json
git add "app/(site)/components/ClinicFotos.tsx"   # только если правка оставлена
git commit -m "perf(clinic): размер картинок галереи под слайд; разбивка задачи первого показа в отчёте

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Итоговый замер «после» и отчёт

**Files:**
- Modify: `docs/perf-v4/report.md` (новый раздел 8 «После правок»)
- Add: `docs/perf-v4/data/after-*.json`

- [ ] **Step 1: Полный прогон тестов и сборки**

```bash
npm test
npx tsc --noEmit -p tsconfig.json
NEXT_PUBLIC_PERF_HARNESS=1 BACKEND_URL=http://localhost:8080 npx next build
```

Expected: PASS / без ошибок / сборка успешна.

- [ ] **Step 2: Замеры в тех же условиях, что «до»**

```bash
cd docs/perf-v4/tools
node prof.mjs after-high "http://localhost:3100/?tier=high" 14 --trace
node prof.mjs after-mid "http://localhost:3100/?tier=mid" 12 --cold
node prof-boot.mjs after-boot-high "http://localhost:3100/?tier=high"
FIRST_VISIT=1 node prof-boot.mjs after-boot-first "http://localhost:3100/?tier=high"
./hd.sh 9240 after-hd-fresh ''
./hd.sh 9241 after-hd-fresh2 ''
node shots.mjs "http://localhost:3100/"
cp results/after-*.json ../data/
```

- [ ] **Step 3: Таблица «до/после» в отчёте**

Добавить в `report.md` раздел `## 8. После правок` с таблицей по строкам: кадр компиляции на старте (`boot-high` 116,7 → `after-boot-high`), записей на `:root` за спуск (272–425 → `after-high.scrollDown.rootWrites`), кадров > 25 мс в главе 1 и 3 в окне (`hd-A-fresh`/`hd-A2-fresh` 11–12 → медиана двух `after-hd-fresh*`), всплеск карты на p > 8,9 (183 → нет), fps/p95/p99 headless (без регресса: p99 ≤ 16,8 мс). Приложить ссылки на новые кадры `tools/shots/*-11-p7.7.jpg`, `mob-03-diagnostics.jpg`, `mob-00-hero.jpg`.

- [ ] **Step 4: Коммит**

```bash
git add docs/perf-v4/report.md docs/perf-v4/data/after-*.json
git commit -m "docs(perf-v4): замеры после правок — старт сцены, переход, финал, карта

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Не входит в этот план (решения владельца)

- Ореолы SSAO на тёмных главах и белые кончики ветвей на светлых (отчёт, UI 7–8) — вкусовые настройки `fx.ao`/`COLOR_TIP`.
- Пустота перед футером после финала (UI 6) — укорачивание `.verdict` меняет длину финала, которую владелец уже правил по глазам.
- Статичная карта через Static API Яндекса — нужен ключ API у владельца; до него карта по кнопке.
- Замер на 30-герцовом внешнем мониторе и на реальном телефоне — только у владельца (`tools/hd.sh` на нужном дисплее).
