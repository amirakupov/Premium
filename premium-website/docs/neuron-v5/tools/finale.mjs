/* Драйвер CDP для финала neuron-v5. Без зависимостей (Node 22).
   Копия docs/neuron-v4/tools/finale.mjs (shots, fps, eval — без изменений,
   результаты складываются в docs/neuron-v5) плюс то, чего v4 не умел:
     storyboard — кадры по ПОЗИЦИИ ТАЙМЛАЙНА director.p, а не по якорям:
                  от p=a до p=b с шагом; на каждом кадре пишется finale();
     trace      — прокрутка финала со сбором finale() раз в кадр: p, targetP,
                  progress, opacity, pen, group.y, scrollY. Сценарии: slow,
                  flick, updown;
     align      — численное сравнение DOM-коробки .rig с проекцией квада
                  диаграммы через камеру сцены, в пикселях; SQUEEZE=0.9 —
                  эмуляция «высота липкой коробки ≠ высота канваса».

   Запуск: Chrome с --remote-debugging-port=9222 и сборка с
   NEXT_PUBLIC_PERF_HARNESS=1 (нужны window.__perf.scrollRun и __neuron). */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function browser() {
  const v = await (await fetch('http://localhost:9222/json/version')).json();
  const ws = new WebSocket(v.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map(); const listeners = new Set();
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.method + ' ' + JSON.stringify(m.error))) : p.resolve(m.result); }
    else for (const l of listeners) l(m);
  };
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const i = ++id; pending.set(i, { resolve, reject }); ws.send(JSON.stringify({ id: i, method, params, sessionId }));
  });
  return { send, on: (f) => listeners.add(f), off: (f) => listeners.delete(f), close: () => ws.close() };
}

function waitEvent(b, method, sessionId, timeout = 60000) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => { b.off(fn); rej(new Error('timeout ' + method)); }, timeout);
    const fn = (m) => { if (m.method === method && (!sessionId || m.sessionId === sessionId)) { clearTimeout(t); b.off(fn); res(m.params); } };
    b.on(fn);
  });
}

/* Трассировка окна прокрутки: на 60 Гц rAF-дельты упираются в vsync и ничего
   не говорят о запасе. Настоящий сигнал — время задач GPU-процесса и занятость
   главного потока за то же окно. Категории те же, что в perf-v3/tools/cdp.mjs. */
const CATS = ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'blink.user_timing', 'toplevel'];

async function withTrace(b, page, fn) {
  await page.s('Tracing.start', { traceConfig: { includedCategories: CATS, recordMode: 'recordContinuously' }, transferMode: 'ReturnAsStream' });
  await sleep(250);
  const result = await fn();
  const complete = waitEvent(b, 'Tracing.tracingComplete', page.sessionId, 180000);
  await page.s('Tracing.end');
  const { stream } = await complete;
  const parts = [];
  for (;;) {
    const r = await page.s('IO.read', { handle: stream, size: 4 << 20 });
    parts.push(r.base64Encoded ? Buffer.from(r.data, 'base64').toString() : r.data);
    if (r.eof) break;
  }
  await page.s('IO.close', { handle: stream });
  const json = JSON.parse(parts.join(''));
  return { result, events: json.traceEvents || json };
}

/** Занятость за окно между метками perf:scroll:start/end. */
function window(events) {
  const procNames = {}; const threadNames = {};
  for (const e of events) {
    if (e.ph !== 'M') continue;
    if (e.name === 'process_name') procNames[e.pid] = e.args.name;
    if (e.name === 'thread_name') threadNames[e.pid + ':' + e.tid] = e.args.name;
  }
  const counts = {};
  for (const e of events) if (e.ph === 'X' && threadNames[e.pid + ':' + e.tid] === 'CrRendererMain') counts[e.pid + ':' + e.tid] = (counts[e.pid + ':' + e.tid] || 0) + 1;
  const [mpid, mtid] = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '0:0').split(':').map(Number);
  const marks = events.filter((e) => e.cat && e.cat.includes('blink.user_timing') && e.pid === mpid);
  const at = (n) => marks.filter((m) => m.name === n).map((m) => m.ts);
  const starts = at('perf:scroll:start'); const ends = at('perf:scroll:end');
  if (!starts.length || !ends.length) return null;
  const t0 = starts[0]; const t1 = ends[ends.length - 1];
  const main = events.filter((e) => e.pid === mpid && e.tid === mtid && e.ph === 'X' && e.dur > 0 && e.ts >= t0 && e.ts + e.dur <= t1).sort((a, b) => a.ts - b.ts || b.dur - a.dur);
  const stack = []; let busy = 0;
  for (const e of main) {
    while (stack.length && stack[stack.length - 1].ts + stack[stack.length - 1].dur <= e.ts) stack.pop();
    if (stack.length) stack[stack.length - 1].child = (stack[stack.length - 1].child || 0) + e.dur;
    stack.push(e);
  }
  for (const e of main) busy += Math.max(0, e.dur - (e.child || 0));
  const gpuPids = Object.entries(procNames).filter(([, n]) => /GPU/i.test(n)).map(([p]) => Number(p));
  const gpu = events.filter((e) => gpuPids.includes(e.pid) && e.ph === 'X' && e.name === 'GPUTask' && e.ts >= t0 && e.ts <= t1).reduce((a, e) => a + e.dur, 0);
  const span = t1 - t0;
  return {
    windowMs: +(span / 1000).toFixed(0),
    mainBusyMs: +(busy / 1000).toFixed(1),
    mainBusyPct: +((busy / span) * 100).toFixed(1),
    gpuTaskMs: +(gpu / 1000).toFixed(1),
    gpuPct: +((gpu / span) * 100).toFixed(1),
  };
}

async function openPage(b) {
  const { targetId } = await b.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await b.send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => b.send(m, p, sessionId);
  await s('Page.enable'); await s('Runtime.enable');
  const page = {
    s, sessionId, targetId,
    metrics: (width, height, dpr = 2) =>
      s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile: false }),
    eval: async (expression) => {
      const r = await s('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails));
      return r.result.value;
    },
    goto: async (url) => {
      /* Баннер cookie и занавес прелоадера закрывают ровно тот низ кадра, где
         живёт финал: снимаем их до навигации, а не кликами после. */
      await s('Page.addScriptToEvaluateOnNewDocument', {
        source: `try{localStorage.setItem('cookie_consent','accepted');sessionStorage.setItem('preloaderSeen','1');}catch(e){}`,
      });
      const l = waitEvent(b, 'Page.loadEventFired', sessionId);
      await s('Page.navigate', { url });
      await l;
    },
    shot: async (file) => {
      const { data } = await s('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, Buffer.from(data, 'base64'));
    },
    close: () => b.send('Target.closeTarget', { targetId }),
  };
  return page;
}

/* Сцена смонтирована и первый кадр нарисован; на reduced/scene=off ждать нечего. */
const READY = `performance.getEntriesByName('neuron:first-frame').length > 0
  || document.documentElement.dataset.scene === 'off'
  || performance.now() > 12000`;

const waitFor = async (page, expr, timeout = 20000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) { if (await page.eval(expr)) return true; await sleep(200); }
  return false;
};

/** Доля документа, на которой центр вьюпорта совпадает с центром секции. */
const focusOn = (selector, bias = 0) => `(function(){
  var el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return null;
  var r = el.getBoundingClientRect();
  var center = r.top + scrollY + r.height * (0.5 + ${bias});
  document.documentElement.style.scrollBehavior = 'auto';
  scrollTo(0, Math.max(0, Math.min(document.documentElement.scrollHeight - innerHeight, center - innerHeight / 2)));
  return Math.round(scrollY);
})()`;

const VIEWPORTS = {
  '16x9': [1440, 810],
  '4x3': [1024, 768],
  '9x19.5': [412, 892],
};

/* Якоря глав в порядке sceneScript.ts. Дублируются здесь сознательно: таблица
   глав в окно не экспортируется, а драйверу нужно уметь ставить скролл в
   произвольную позицию таймлайна p. Разойдётся с таблицей — раскадровка
   покажет не те p, и это видно по finale().p, который пишется рядом. */
const ANCHORS = ['#hero', '#symptom', '#diagnostics', '#quote', '#services',
  '#clinic-photos', '#doctors', '#outro-draw', '#outro-verdict', '#outro-exit'];

/* Общие функции для in-page выражений: метки таймлайна (повторяют
   useScrollDirector.measure), скролл в позицию p, проекция мировой точки в
   CSS-пиксели через камеру сцены (без THREE на окне — руками по матрицам). */
const PAGE_LIB = `
  var ANCHORS = ${JSON.stringify(ANCHORS)};
  function marks() {
    var vh = innerHeight, docH = document.documentElement.scrollHeight;
    var maxFocus = Math.max(vh / 2, docH - vh / 2);
    var out = [], prev = NaN;
    for (var i = 0; i < ANCHORS.length; i++) {
      var el = document.querySelector(ANCHORS[i]);
      var c;
      if (!el) c = isNaN(prev) ? 0 : prev + 1;
      else {
        var r = el.getBoundingClientRect();
        c = r.top + scrollY + r.height / 2;
        if (i === ANCHORS.length - 1) c = Math.min(c, maxFocus);
        if (!isNaN(prev) && c <= prev) c = prev + 1;
      }
      out.push(c); prev = c;
    }
    return out;
  }
  function focusOfP(p) {
    var m = marks(); var i = Math.min(m.length - 2, Math.max(0, Math.floor(p)));
    return m[i] + (m[i + 1] - m[i]) * (p - i);
  }
  function scrollToP(p) {
    document.documentElement.style.scrollBehavior = 'auto';
    var y = focusOfP(p) - innerHeight / 2;
    var max = document.documentElement.scrollHeight - innerHeight;
    scrollTo(0, Math.max(0, Math.min(max, y)));
    return Math.round(scrollY);
  }
  function centerY(sel) {
    var el = document.querySelector(sel); var r = el.getBoundingClientRect();
    var y = r.top + scrollY + r.height / 2 - innerHeight / 2;
    return Math.max(0, Math.min(document.documentElement.scrollHeight - innerHeight, y));
  }
  function project(x, y, z) {
    var cam = __neuron.camera;
    var v = cam.matrixWorldInverse.elements, pm = cam.projectionMatrix.elements;
    function mul(m, a) { return [
      m[0]*a[0]+m[4]*a[1]+m[8]*a[2]+m[12]*a[3],
      m[1]*a[0]+m[5]*a[1]+m[9]*a[2]+m[13]*a[3],
      m[2]*a[0]+m[6]*a[1]+m[10]*a[2]+m[14]*a[3],
      m[3]*a[0]+m[7]*a[1]+m[11]*a[2]+m[15]*a[3]]; }
    var c = mul(pm, mul(v, [x, y, z, 1]));
    var nx = c[0] / c[3], ny = c[1] / c[3];
    return { x: (nx + 1) / 2 * innerWidth, y: (1 - ny) / 2 * innerHeight };
  }
  function sample() {
    var f = __neuron.finale(); var d = __neuron.director;
    return {
      t: +performance.now().toFixed(1), scrollY: Math.round(scrollY),
      targetP: +d.targetP.toFixed(4), p: +f.p.toFixed(4),
      progress: +f.progress.toFixed(4), opacity: +f.opacity.toFixed(4),
      rig: +f.rig.toFixed(4), pen: +f.pen.toFixed(4), head: +f.headHDR.toFixed(3),
      groupY: f.group ? +f.group.y.toFixed(4) : null,
      groupScale: f.group ? +f.group.scale.toFixed(4) : null,
      camZ: +__neuron.camera.position.z.toFixed(3),
      penSize: +__neuron.built.penMaterial.uniforms.uSize.value.toFixed(2),
    };
  }
`;

/* Сравнение DOM-коробки и 3D-квада: углы квада (в локальных единицах группы,
   z = 0 — плоскость ленты) проецируются камерой в пиксели. Размер квада из
   params: GRID_W = 11 + 2·0.34, GRID_H = 2.6 + 2·0.8 — те же числа, что
   проверяет lib/finale-frame.test.ts. */
const ALIGN_EXPR = `(function(){ ${PAGE_LIB}
  var rig = document.querySelector('#outro-verdict [data-reveal="rig"]');
  var host = rig.parentElement;
  var r = rig.getBoundingClientRect(), h = host.getBoundingClientRect();
  var f = __neuron.finale(); var g = f.group;
  var W = 11.68, H = 4.2;
  var a = project(g.x - W/2*g.scale, g.y + H/2*g.scale, 0);
  var b = project(g.x + W/2*g.scale, g.y - H/2*g.scale, 0);
  var scene = { left: a.x, top: a.y, w: b.x - a.x, h: b.y - a.y };
  var dom = { left: r.left, top: r.top, w: r.width, h: r.height };
  var round = function (o) { var q = {}; for (var k in o) q[k] = +o[k].toFixed(1); return q; };
  return {
    viewport: { w: innerWidth, h: innerHeight },
    sticky: { top: +h.top.toFixed(1), h: +h.height.toFixed(1) },
    dom: round(dom), scene: round(scene),
    deltaPx: round({ left: scene.left - dom.left, top: scene.top - dom.top, w: scene.w - dom.w, h: scene.h - dom.h }),
    p: f.p, camZ: __neuron.camera.position.z, fov: __neuron.camera.fov,
  };
})()`;

/* Трасса: свой rAF-семплер поверх __perf.scrollRun. Сценарии — набор отрезков
   прокрутки с паузой между ними (демпфер должен успеть догнать). */
const traceExpr = (scenario) => `(async function(){ ${PAGE_LIB}
  var bottom = document.documentElement.scrollHeight - innerHeight;
  var legs = ${JSON.stringify(scenario)}.map(function (l) {
    return { seconds: l.seconds,
      from: l.from === 'bottom' ? bottom : centerY(l.from),
      to: l.to === 'bottom' ? bottom : centerY(l.to), pause: l.pause || 1200 };
  });
  var samples = [], run = true, legIdx = -1;
  function tick() { var s = sample(); s.leg = legIdx; samples.push(s); if (run) requestAnimationFrame(tick); }
  requestAnimationFrame(tick);
  for (var i = 0; i < legs.length; i++) {
    /* Встать на старт отрезка и дать демпферу успокоиться: иначе прыжок
       scrollTo(from) внутри scrollRun попадал бы в трассу как «отставание». */
    scrollTo(0, legs[i].from);
    await new Promise(function (r) { setTimeout(r, 1200); });
    legIdx = i;
    await __perf.scrollRun(legs[i].seconds, legs[i].from, legs[i].to);
    legIdx = -1;
    await new Promise(function (r) { setTimeout(r, legs[i].pause); });
  }
  run = false;
  return { legs: legs, samples: samples };
})()`;

const SCENARIOS = {
  /* медленно: весь финал за 6 с — как fps в v4 */
  slow: [{ from: '#doctors', to: 'bottom', seconds: 6, pause: 1500 }],
  /* быстрый флик: та же дистанция за 0.45 с */
  flick: [{ from: '#doctors', to: 'bottom', seconds: 0.45, pause: 1500 }],
  /* вниз до стоп-кадра, вверх до #services, снова вниз */
  updown: [
    { from: '#doctors', to: '#outro-verdict', seconds: 3, pause: 1200 },
    { from: '#outro-verdict', to: '#services', seconds: 3, pause: 1200 },
    { from: '#services', to: 'bottom', seconds: 4, pause: 1500 },
  ],
  /* повторный заход: в финале вверх на пол-экрана и обратно вниз */
  replay: [
    { from: '#doctors', to: 'bottom', seconds: 3, pause: 1200 },
    { from: 'bottom', to: '#outro-draw', seconds: 1.5, pause: 1200 },
    { from: '#outro-draw', to: 'bottom', seconds: 2, pause: 1500 },
  ],
};

/* Эмуляция «100svh ≠ высота канваса». В headless Chrome svh, lvh и innerHeight
   совпадают всегда — динамической панели браузера там нет. Поэтому условие
   воспроизводится напрямую: липкой коробке принудительно даётся высота
   SQUEEZE × innerHeight, канвас остаётся во весь вьюпорт. Это ровно та
   геометрия, которую даёт выехавшая адресная строка (коробка меньше канваса),
   но не сама адресная строка — в отчёте так и написано. */
async function squeeze(page) {
  const k = Number(process.env.SQUEEZE || 0);
  if (!k) return;
  await page.eval(`(function(){
    var st = document.createElement('style');
    st.textContent = '#outro-verdict > div { height: ${k * 100}vh !important; }';
    document.head.appendChild(st);
    dispatchEvent(new Event('resize'));
    return true;
  })()`);
  await sleep(600);
}

/* Ленивые картинки секций подгружаются при первом проходе и двигают раскладку
   на ~180 px: без прогрева первый кадр раскадровки и первый отрезок трассы
   считались бы по ещё не устоявшимся меткам. Прогрев — прокрутка до низа и
   обратно, чтобы всё догрузилось до замеров. */
async function warmup(page) {
  await page.eval(`(function(){ document.documentElement.style.scrollBehavior='auto'; scrollTo(0, document.documentElement.scrollHeight); return true; })()`);
  await sleep(900);
  await page.eval(`(function(){ scrollTo(0, 0); return true; })()`);
  await sleep(900);
}

/* Сводка по трассе: отставание p от targetP, скачки величин между соседними
   кадрами, мёртвые зоны (кадры, где скролл едет, а в кадре ничего не меняется). */
function summarizeTrace(samples) {
  const lag = { maxP: 0, atMs: null, settleMs: null };
  const jumps = { opacity: 0, pen: 0, progress: 0, rig: 0 };
  let lastMoving = null;
  for (let i = 1; i < samples.length; i += 1) {
    const a = samples[i - 1], b = samples[i];
    const l = Math.abs(b.targetP - b.p);
    if (l > lag.maxP) { lag.maxP = +l.toFixed(3); lag.atMs = b.t; }
    jumps.opacity = Math.max(jumps.opacity, Math.abs(b.opacity - a.opacity));
    jumps.pen = Math.max(jumps.pen, Math.abs(b.pen - a.pen));
    jumps.progress = Math.max(jumps.progress, Math.abs(b.progress - a.progress));
    jumps.rig = Math.max(jumps.rig, Math.abs(b.rig - a.rig));
    if (b.scrollY !== a.scrollY) lastMoving = b.t;
  }
  /* когда после остановки скролла p дошёл до targetP с точностью 0.005 */
  if (lastMoving !== null) {
    const after = samples.filter((s) => s.t >= lastMoving);
    const settled = after.find((s) => Math.abs(s.targetP - s.p) < 0.005);
    if (settled) lag.settleMs = +(settled.t - lastMoving).toFixed(0);
  }
  for (const k of Object.keys(jumps)) jumps[k] = +jumps[k].toFixed(4);
  return { frames: samples.length, lag, maxJumpPerFrame: jumps };
}

async function main() {
  const [cmd, label, url, ...rest] = process.argv.slice(2);
  const b = await browser();
  const page = await openPage(b);
  const out = { cmd, label, url, at: new Date().toISOString() };

  /* Режимы деградации выставляются ДО навигации: prefers-reduced-motion и
     наличие WebGL сцена читает при монтировании, а не по событию. */
  if (process.env.REDUCED === '1') {
    out.mode = 'prefers-reduced-motion';
    await page.s('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
  }
  if (process.env.NO_WEBGL === '1') {
    out.mode = 'scene=off';
    await page.s('Page.addScriptToEvaluateOnNewDocument', {
      source: 'HTMLCanvasElement.prototype.getContext = function(){ return null; };',
    });
  }
  /* Ключ a11y пишется ВСЕГДА, в том числе нулём: профиль браузера переживает
     прогоны, и один запуск с A11Y=1 иначе тихо заражал бы все следующие. */
  if (process.env.A11Y === '1') out.mode = 'a11y';
  await page.s('Page.addScriptToEvaluateOnNewDocument', {
    source: `try{localStorage.setItem('a11y','${process.env.A11Y === '1' ? '1' : '0'}');}catch(e){}`,
  });

  try {
    if (cmd === 'shots') {
      /* rest: список «имя@селектор[:смещение]» — по кадру на каждый якорь и соотношение */
      const stops = (rest[0] || 'verdict@#outro-verdict').split(',');
      out.stops = [];
      /* ONLY=16x9 — снять только одно соотношение: раскадровке передачи
         эстафеты три пропорции не нужны, а каждая стоит перезагрузки. */
      const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
      for (const [name, [w, h]] of Object.entries(VIEWPORTS)) {
        if (only && !only.includes(name)) continue;
        await page.metrics(w, h, name === '9x19.5' ? 3 : 2);
        await page.goto(url);
        await waitFor(page, READY);
        await sleep(2200);
        for (const stop of stops) {
          const [stopName, rawSel] = stop.split('@');
          const [sel, bias] = rawSel.split(':');
          const y = await page.eval(focusOn(sel, Number(bias || 0)));
          await sleep(1400);
          const file = `${ROOT}/shots/${label}-${stopName}-${name}.jpg`;
          await page.shot(file);
          out.stops.push({ viewport: name, stop: stopName, y, file: path.basename(file) });
        }
      }
    } else if (cmd === 'fps') {
      /* Прокрутка именно финала: от центра #doctors до низа документа. */
      await page.metrics(1440, 810, 2);
      await page.goto(url);
      await waitFor(page, READY);
      await sleep(2500);
      const seconds = Number(rest[0] || 6);
      const runs = Number(rest[1] || 3);
      out.runs = [];
      out.load = [];
      for (let i = 0; i < runs; i += 1) {
        const from = await page.eval(focusOn('#doctors'));
        await sleep(900);
        /* FPS_TO=#outro-exit — окно без футера: после укорочения финала стеклянный
           футер (backdrop-filter поверх канваса) занимает большую долю окна
           «до низа документа», и сравнение с baseline перестаёт быть честным. */
        const to = process.env.FPS_TO
          ? await page.eval(`(function(){ ${PAGE_LIB} return centerY(${JSON.stringify(process.env.FPS_TO)}); })()`)
          : await page.eval(`document.documentElement.scrollHeight - innerHeight`);
        const { result, events } = await withTrace(b, page, () =>
          page.eval(`__perf.scrollRun(${seconds}, ${from}, ${to})`));
        out.runs.push(result);
        const w = window(events);
        if (w) out.load.push(w);
        await sleep(700);
      }
      const pick = (key) => {
        const v = out.load.map((l) => l[key]).sort((a, b) => a - b);
        return v.length ? v[Math.floor(v.length / 2)] : null;
      };
      out.gpuPct = pick('gpuPct');
      out.mainBusyPct = pick('mainBusyPct');
      const med = out.runs.map((r) => r.median).sort((a, b) => a - b);
      const p95 = out.runs.map((r) => r.p95).sort((a, b) => a - b);
      out.median = med[Math.floor(med.length / 2)];
      out.p95 = p95[Math.floor(p95.length / 2)];
      out.fps = +(out.runs.reduce((a, r) => a + r.fps, 0) / out.runs.length).toFixed(1);
    } else if (cmd === 'storyboard') {
      /* rest: pFrom pTo step. Одно соотношение (VIEWPORT=16x9 по умолчанию).
         Скролл ставится в позицию таймлайна, демпфер режиссёра догоняет
         (~170 мс при λ=6, ждём с запасом), потом кадр и finale(). */
      const [pFrom, pTo, step] = rest.map(Number);
      const vp = process.env.VIEWPORT || '16x9';
      const [w, h] = VIEWPORTS[vp];
      await page.metrics(w, h, vp === '9x19.5' ? 3 : 2);
      await page.goto(url);
      await waitFor(page, READY);
      await sleep(2200);
      await squeeze(page);
      out.viewport = vp;
      out.frames = [];
      await warmup(page);
      const n = Math.round((pTo - pFrom) / step);
      for (let i = 0; i <= n; i += 1) {
        const p = +(pFrom + step * i).toFixed(3);
        const y = await page.eval(`(function(){ ${PAGE_LIB} return scrollToP(${p}); })()`);
        await sleep(1200);
        const s = await page.eval(`(function(){ ${PAGE_LIB} return sample(); })()`);
        const tag = p.toFixed(1).replace('.', '_');
        const file = `${ROOT}/shots/${label}-p${tag}-${vp}.jpg`;
        await page.shot(file);
        /* pReq — куда просили; s.p — где реально стоит режиссёр после демпфера */
        out.frames.push({ pReq: p, y, ...s, file: path.basename(file) });
      }
    } else if (cmd === 'trace') {
      const scenario = SCENARIOS[rest[0] || 'slow'];
      if (!scenario) throw new Error('нет сценария ' + rest[0]);
      await page.metrics(1440, 810, 2);
      await page.goto(url);
      await waitFor(page, READY);
      await sleep(2500);
      out.scenario = rest[0] || 'slow';
      await warmup(page);
      const r = await page.eval(traceExpr(scenario));
      out.legs = r.legs;
      out.samples = r.samples;
      out.summary = summarizeTrace(r.samples);
    } else if (cmd === 'align') {
      /* rest[0] — соотношения через запятую; SQUEEZE=0.9 — липкая коробка
         ниже вьюпорта на 10 %, как при выехавшей адресной строке. */
      const list = (rest[0] || '16x9,4x3,9x19.5').split(',');
      out.results = [];
      for (const vp of list) {
        const [w, h] = VIEWPORTS[vp];
        await page.metrics(w, h, vp === '9x19.5' ? 3 : 2);
        await page.goto(url);
        await waitFor(page, READY);
        await sleep(2200);
        await squeeze(page);
        await page.eval(focusOn('#outro-verdict'));
        await sleep(1400);
        const r = await page.eval(ALIGN_EXPR);
        out.results.push({ aspect: vp, squeeze: process.env.SQUEEZE || null, ...r });
        if (process.env.SHOT) await page.shot(`${ROOT}/shots/${label}-${vp}.jpg`);
      }
    } else if (cmd === 'eval') {
      await page.metrics(1440, 810, 2);
      await page.goto(url);
      await waitFor(page, READY);
      await sleep(2000);
      /* Выражение можно передать файлом: @path — проверки многострочные, и в
         argv они превращаются в кашу из экранирования. */
      const expr = rest.join(' ');
      out.result = await page.eval(
        expr.startsWith('@') ? fs.readFileSync(expr.slice(1), 'utf8') : expr,
      );
    }
  } catch (e) { out.error = String(e.stack || e); }
  fs.mkdirSync(`${ROOT}/data`, { recursive: true });
  fs.writeFileSync(`${ROOT}/data/${label}.json`, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 1));
  await page.close(); b.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
