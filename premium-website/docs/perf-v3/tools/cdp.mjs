// Драйвер Chrome DevTools Protocol для замеров perf-v3. Без зависимостей (Node 22).
import fs from 'node:fs';
import path from 'node:path';
const S = process.env.S || path.dirname(new URL(import.meta.url).pathname);
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
function waitEvent(b, method, sessionId, timeout = 30000, pred = () => true) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => { b.off(fn); rej(new Error('timeout ' + method)); }, timeout);
    const fn = (m) => { if (m.method === method && (!sessionId || m.sessionId === sessionId) && pred(m.params)) { clearTimeout(t); b.off(fn); res(m.params); } };
    b.on(fn);
  });
}
async function openPage(b) {
  const { targetId } = await b.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await b.send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => b.send(m, p, sessionId);
  await s('Page.enable'); await s('Runtime.enable'); await s('Network.enable');
  try { const { windowId } = await b.send('Browser.getWindowForTarget', { targetId }); await b.send('Browser.setWindowBounds', { windowId, bounds: { left: 2700, top: 60, width: 1280, height: 760 } }); } catch {}
  await s('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
  const net = new Map();
  b.on((m) => {
    if (m.sessionId !== sessionId) return;
    if (m.method === 'Network.responseReceived') net.set(m.params.requestId, { url: m.params.response.url, type: m.params.type, bytes: 0, t: m.params.timestamp });
    if (m.method === 'Network.loadingFinished') { const e = net.get(m.params.requestId); if (e) e.bytes = m.params.encodedDataLength; }
  });
  const page = {
    s, sessionId, targetId, net,
    eval: async (expr) => {
      const r = await s('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails));
      return r.result.value;
    },
    goto: async (url) => { const loaded = waitEvent(b, 'Page.loadEventFired', sessionId, 60000); await s('Page.navigate', { url }); await loaded; },
    reload: async () => { const loaded = waitEvent(b, 'Page.loadEventFired', sessionId, 60000); await s('Page.reload'); await loaded; },
    shot: async (file) => { const { data } = await s('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(file, Buffer.from(data, 'base64')); },
    waitFor: async (expr, timeout = 15000, step = 200) => { const t0 = Date.now(); while (Date.now() - t0 < timeout) { if (await page.eval(expr)) return true; await sleep(step); } return false; },
    close: () => b.send('Target.closeTarget', { targetId }),
  };
  return page;
}
function jsBytes(net) {
  let js = 0, doc = 0, all = 0; const chunks = [];
  for (const e of net.values()) { all += e.bytes; if (e.type === 'Script') { js += e.bytes; chunks.push({ url: e.url.split('/').pop(), bytes: e.bytes }); } if (e.type === 'Document') doc += e.bytes; }
  chunks.sort((a, b) => b.bytes - a.bytes);
  return { jsTransferred: js, docTransferred: doc, allTransferred: all, jsCount: chunks.length, topChunks: chunks.slice(0, 6) };
}

/* ---- трассировка ---- */
const CATS = ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'blink.user_timing', 'v8.execute', 'toplevel'];
async function withTrace(b, page, fn) {
  await page.s('Tracing.start', { traceConfig: { includedCategories: CATS, recordMode: 'recordContinuously' }, transferMode: 'ReturnAsStream' });
  await sleep(300);
  const result = await fn();
  const complete = waitEvent(b, 'Tracing.tracingComplete', page.sessionId, 180000);
  await page.s('Tracing.end');
  const { stream } = await complete;
  let parts = [];
  for (;;) { const r = await page.s('IO.read', { handle: stream, size: 4 << 20 }); parts.push(r.base64Encoded ? Buffer.from(r.data, 'base64').toString() : r.data); if (r.eof) break; }
  await page.s('IO.close', { handle: stream });
  const json = JSON.parse(parts.join(''));
  return { result, events: json.traceEvents || json };
}
const BUCKET = (n) => {
  if (/^(UpdateLayoutTree|ScheduleStyleRecalculation|StyleRecalc)/.test(n)) return 'style';
  if (/^(Layout|PrePaint|UpdateLayerTree|HitTest|IntersectionObserver|ComputeIntersections)/.test(n)) return 'layout';
  if (/^(Paint|PaintImage|Layerize|UpdateLayer|Decode|Rasterize)/.test(n)) return 'paint';
  if (/^(CompositeLayers|Commit|BeginMainThreadFrame|ActivateLayerTree|DrawFrame)/.test(n)) return 'composite';
  if (/^(FunctionCall|EvaluateScript|v8|V8|RunMicrotasks|FireAnimationFrame|TimerFire|EventDispatch|XHR|ParseHTML|ParseAuthorStyleSheet|MajorGC|MinorGC|GCEvent|CompileScript|CompileCode|ResourceReceive|Animation|RequestAnimationFrame|CancelAnimationFrame|RequestIdleCallback|FireIdleCallback|WebSocket|ConsoleTime|UserTiming|EvaluateModule|CompileModule|Run Microtasks)/.test(n)) return 'script';
  return 'other';
};
function analyze(events, opts = {}) {
  const meta = events.filter((e) => e.ph === 'M');
  const procNames = {}; const threadNames = {};
  for (const e of meta) { if (e.name === 'process_name') procNames[e.pid] = e.args.name; if (e.name === 'thread_name') threadNames[e.pid + ':' + e.tid] = e.args.name; }
  // главный поток рендерера с наибольшим числом задач
  const counts = {};
  for (const e of events) if (e.ph === 'X' && threadNames[e.pid + ':' + e.tid] === 'CrRendererMain') counts[e.pid + ':' + e.tid] = (counts[e.pid + ':' + e.tid] || 0) + 1;
  const mainKey = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const [mpid, mtid] = mainKey ? mainKey.split(':').map(Number) : [0, 0];
  const main = events.filter((e) => e.pid === mpid && e.tid === mtid && e.ph === 'X' && e.dur > 0).sort((a, b) => a.ts - b.ts || b.dur - a.dur);
  // окно по user timing
  const marks = events.filter((e) => e.cat && e.cat.includes('blink.user_timing') && e.pid === mpid);
  const mk = (name) => marks.find((m) => m.name === name)?.ts;
  let t0 = opts.startMark ? mk(opts.startMark) : undefined; let t1 = opts.endMark ? mk(opts.endMark) : undefined;
  if (t0 === undefined) t0 = main[0]?.ts ?? 0; if (t1 === undefined) t1 = Math.max(...main.map((e) => e.ts + e.dur));
  const win = main.filter((e) => e.ts >= t0 && e.ts + e.dur <= t1);
  // self time стеком
  const stack = []; const self = {}; const byName = {};
  for (const e of win) {
    while (stack.length && stack[stack.length - 1].ts + stack[stack.length - 1].dur <= e.ts) stack.pop();
    if (stack.length) stack[stack.length - 1].child = (stack[stack.length - 1].child || 0) + e.dur;
    stack.push(e);
  }
  for (const e of win) { const st = e.dur - (e.child || 0); if (st <= 0) continue; const b = BUCKET(e.name); self[b] = (self[b] || 0) + st; byName[e.name] = (byName[e.name] || 0) + st; }
  const windowMs = (t1 - t0) / 1000;
  const ms = (v) => +((v || 0) / 1000).toFixed(1);
  const busy = Object.values(self).reduce((a, b) => a + b, 0);
  // GPU
  const gpuKeys = Object.entries(procNames).filter(([, n]) => /GPU/i.test(n)).map(([p]) => Number(p));
  const gpu = events.filter((e) => gpuKeys.includes(e.pid) && e.ph === 'X' && e.name === 'GPUTask' && e.ts >= t0 && e.ts <= t1).reduce((a, e) => a + e.dur, 0);
  // compositor / raster threads renderer
  const raster = events.filter((e) => e.pid === mpid && e.ph === 'X' && /RasterTask|RasterizerTask/.test(e.name) && e.ts >= t0 && e.ts <= t1).reduce((a, e) => a + e.dur, 0);
  // long tasks
  const tasks = main.filter((e) => /RunTask/.test(e.name) && e.dur >= 50000 && e.ts >= t0 && e.ts <= t1);
  const userMarks = marks.filter((m) => !/^perf:/.test(m.name)).map((m) => ({ name: m.name, at: ms(m.ts - t0) }));
  const seen = new Set();
  const longTasks = tasks.filter((t) => { const k = Math.round(t.ts / 1000) + ':' + Math.round(t.dur / 1000); if (seen.has(k)) return false; seen.add(k); return true; }).map((t) => {
    const kids = main.filter((e) => e.ts >= t.ts && e.ts + e.dur <= t.ts + t.dur && e !== t);
    const agg = {};
    for (const k of kids) { const st = k.dur - (k.child || 0); if (st <= 0) continue; let label = k.name; if (k.args?.data?.url) label += ' ' + String(k.args.data.url).split('/').pop() + (k.args.data.functionName ? ' ' + k.args.data.functionName : ''); agg[label] = (agg[label] || 0) + st; }
    const top = Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([n, v]) => `${n}: ${ms(v)}ms`);
    const near = userMarks.filter((m) => /neuron|perf/.test(m.name) && m.at >= ms(t.ts - t0) - 5 && m.at <= ms(t.ts + t.dur - t0) + 5).map((m) => m.name);
    return { at: ms(t.ts - t0), dur: ms(t.dur), top, marks: near };
  });
  const topNames = Object.entries(byName).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([n, v]) => [n, ms(v)]);
  return {
    windowMs: +windowMs.toFixed(0),
    mainBusyMs: ms(busy), mainBusyPct: +((busy / (t1 - t0)) * 100).toFixed(1),
    buckets: Object.fromEntries(['script', 'style', 'layout', 'paint', 'composite', 'other'].map((k) => [k, ms(self[k])])),
    bucketsPct: Object.fromEntries(['script', 'style', 'layout', 'paint', 'composite', 'other'].map((k) => [k, +(((self[k] || 0) / (t1 - t0)) * 100).toFixed(1)])),
    gpuTaskMs: ms(gpu), rasterMs: ms(raster),
    longTasks, userMarks, topNames,
  };
}
async function layers(b, page) {
  const p = waitEvent(b, 'LayerTree.layerTreeDidChange', page.sessionId, 8000).catch(() => null);
  await page.s('LayerTree.enable');
  const ev = await p; await page.s('LayerTree.disable');
  if (!ev || !ev.layers) return null;
  let bytes = 0; for (const l of ev.layers) bytes += l.width * l.height * 4;
  return { count: ev.layers.length, estBytesAtDpr1: bytes, estMB: +(bytes / 1048576).toFixed(1), big: ev.layers.filter((l) => l.width * l.height > 300 * 300).length };
}
const VARIANTS = {
  none: '',
  'glass-none': `document.head.insertAdjacentHTML('beforeend','<style id="perf-variant">:root{--glass-blur:none !important;--panel-filter:none !important}</style>');'glass-none'`,
  'no-theme': `(function(){var o=CSSStyleDeclaration.prototype.setProperty;CSSStyleDeclaration.prototype.setProperty=function(n,v,p){if(this===document.documentElement.style)return;return o.call(this,n,v,p);};})();'no-theme'`,
  'glass-none+no-theme': `document.head.insertAdjacentHTML('beforeend','<style id="perf-variant">:root{--glass-blur:none !important;--panel-filter:none !important}</style>');(function(){var o=CSSStyleDeclaration.prototype.setProperty;CSSStyleDeclaration.prototype.setProperty=function(n,v,p){if(this===document.documentElement.style)return;return o.call(this,n,v,p);};})();'both'`,
  'no-canvas': `document.querySelector('canvas')?.closest('div')?.remove();'no-canvas'`,
};
const READY = `(window.__perf && (__perf.preloader.gone !== null || (__perf.preloader.seen === null && performance.now() > 2500)) && performance.getEntriesByName('neuron:first-frame').length > 0) || performance.now() > 20000`;

async function main() {
  const [cmd, label, url, variant = 'none', extra] = process.argv.slice(2);
  const b = await browser();
  const page = await openPage(b);
  if (process.env.COLD === '1') { await page.s('Network.clearBrowserCache'); await page.s('Network.clearBrowserCookies'); }
  const out = { cmd, label, url, variant, cold: process.env.COLD === '1', at: new Date().toISOString() };
  try {
    if (cmd === 'load') {
      const { events } = await withTrace(b, page, async () => { await page.goto(url); await page.waitFor(READY, 25000, 250); await sleep(800); });
      out.summary = await page.eval('__perf.loadSummary()');
      out.network = jsBytes(page.net);
      out.trace = analyze(events);
      await page.shot(`${S}/shots/${label}.png`);
    } else if (cmd === 'scroll') {
      await page.goto(url); await page.waitFor(READY, 25000, 250); await sleep(1500);
      if (VARIANTS[variant]) out.variantApplied = await page.eval(VARIANTS[variant]);
      await sleep(500);
      out.layersBefore = await layers(b, page);
      const { result, events } = await withTrace(b, page, () => page.eval(`__perf.scrollRun(${extra || 10})`));
      out.frames = result;
      out.trace = analyze(events, { startMark: 'perf:scroll:start', endMark: 'perf:scroll:end' });
      out.layersAfter = await layers(b, page);
      await page.shot(`${S}/shots/${label}-end.png`);
    } else if (cmd === 'reload') {
      await page.goto(url); await page.waitFor(READY, 25000, 250); await sleep(500);
      out.firstVisit = await page.eval('({seen:__perf.preloader.seen, gone:__perf.preloader.gone, curtainFrames:__perf.curtainFrames})');
      await page.reload(); await sleep(3000);
      out.reload = await page.eval('({seen:__perf.preloader.seen, gone:__perf.preloader.gone, curtainFrames:__perf.curtainFrames, curtainFirstFrameAt:__perf.curtainFirstFrameAt, sessionSeen: sessionStorage.getItem("preloaderSeen")})');
      await page.shot(`${S}/shots/${label}-after-reload.png`);
    } else if (cmd === 'link') {
      await page.goto(url); await page.waitFor(READY, 25000, 250); await sleep(500);
      await page.goto(new URL('/blog', url).href); await sleep(1500);
      out.linkNav = await page.eval(`new Promise(function(res){var frames=0,first=null,footerMissingFrames=0,t0=performance.now();var a=document.querySelector('a[href="/"]');a.click();(function tick(){var el=document.querySelector('[class*="preloader"]');if(el){frames++;if(first===null)first=+(performance.now()-t0).toFixed(1);}if(location.pathname==='/'&&!document.querySelector('footer'))footerMissingFrames++;if(performance.now()-t0<3000)requestAnimationFrame(tick);else res({curtainFrames:frames,firstAt:first,footerMissingFrames:footerMissingFrames,path:location.pathname});})();})`);
      await page.shot(`${S}/shots/${label}-after-link.png`);
    } else if (cmd === 'shot') {
      await page.goto(url); await page.waitFor(READY, 25000, 250); await sleep(1200);
      if (VARIANTS[variant]) await page.eval(VARIANTS[variant]);
      if (extra) { await page.eval(`document.documentElement.style.scrollBehavior='auto';window.scrollTo(0, ${extra});`); await sleep(1500); }
      await page.shot(`${S}/shots/${label}.png`);
    } else if (cmd === 'eval') {
      await page.goto(url); await page.waitFor(READY, 25000, 250); await sleep(500);
      out.result = await page.eval(variant);
    }
  } catch (e) { out.error = String(e.stack || e); }
  fs.writeFileSync(`${S}/results/${label}.json`, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 1));
  await page.close(); b.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
