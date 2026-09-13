/* Драйвер CDP для финала neuron-v4. Без зависимостей (Node 22).
   Умеет ровно две вещи, которых не хватало cdp.mjs из perf-v3:
     shots  — кадры финала на произвольном соотношении сторон;
     fps    — прокрутка от #doctors до низа документа с раздельной статистикой.

   Запуск: Chrome с --remote-debugging-port=9222 и сборка с
   NEXT_PUBLIC_PERF_HARNESS=1 (нужен window.__perf.scrollRun). */
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

async function main() {
  const [cmd, label, url, ...rest] = process.argv.slice(2);
  const b = await browser();
  const page = await openPage(b);
  const out = { cmd, label, url, at: new Date().toISOString() };
  try {
    if (cmd === 'shots') {
      /* rest: список «имя@селектор[:смещение]» — по кадру на каждый якорь и соотношение */
      const stops = (rest[0] || 'verdict@#outro-verdict').split(',');
      out.stops = [];
      for (const [name, [w, h]] of Object.entries(VIEWPORTS)) {
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
        const to = await page.eval(`document.documentElement.scrollHeight - innerHeight`);
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
    } else if (cmd === 'eval') {
      await page.metrics(1440, 810, 2);
      await page.goto(url);
      await waitFor(page, READY);
      await sleep(2000);
      out.result = await page.eval(rest.join(' '));
    }
  } catch (e) { out.error = String(e.stack || e); }
  fs.mkdirSync(`${ROOT}/data`, { recursive: true });
  fs.writeFileSync(`${ROOT}/data/${label}.json`, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 1));
  await page.close(); b.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
