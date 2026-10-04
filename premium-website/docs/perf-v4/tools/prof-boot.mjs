// Профилировщик сцены: покадровая телеметрия при равномерном скролле всей страницы.
// Использование: node prof.mjs <label> <url> [seconds=14] [--trace] [--mobile]
import fs from 'node:fs';
import path from 'node:path';
const S = path.dirname(new URL(import.meta.url).pathname);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function browser() {
  const v = await (await fetch(`http://localhost:${process.env.CDP_PORT||9222}/json/version`)).json();
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
async function openPage(b, mobile) {
  const { targetId } = await b.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await b.send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => b.send(m, p, sessionId);
  await s('Page.enable'); await s('Runtime.enable');
  if (mobile) await s('Emulation.setDeviceMetricsOverride', { width: 390, height: 780, deviceScaleFactor: 3, mobile: true });
  else await s('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
  await s('Page.addScriptToEvaluateOnNewDocument', { source: `
    try{localStorage.setItem('cookie_consent','accepted');sessionStorage.setItem('preloaderSeen','1');}catch(e){}
    (function(){
      var W = window.__w = { root: 0, ground: 0, rootProps: {}, errors: [] };
      var sp = CSSStyleDeclaration.prototype.setProperty;
      CSSStyleDeclaration.prototype.setProperty = function(n, v, pr) {
        try {
          if (this === document.documentElement.style) { W.root++; W.rootProps[n] = (W.rootProps[n]||0)+1; }
          else { var g = document.getElementById('page-ground'); if (g && this === g.style) W.ground++; }
        } catch (e) {}
        return sp.call(this, n, v, pr);
      };
      window.addEventListener('error', function(e){ W.errors.push(String(e.message)); });
    })();
  ` });
  const errors = [];
  b.on((m) => { if (m.sessionId === sessionId && m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.exception?.description || 'exception'); });
  const page = {
    s, errors,
    eval: async (expression) => {
      const r = await s('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails));
      return r.result.value;
    },
    goto: async (url) => { const l = waitEvent(b, 'Page.loadEventFired', sessionId); await s('Page.navigate', { url }); await l; },
    shot: async (file) => { const { data } = await s('Page.captureScreenshot', { format: 'jpeg', quality: 85 }); fs.writeFileSync(file, Buffer.from(data, 'base64')); },
    close: () => b.send('Target.closeTarget', { targetId }),
  };
  return page;
}

const CATS = ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'toplevel', 'v8.execute'];
async function withTrace(b, page, fn) {
  await page.s('Tracing.start', { traceConfig: { includedCategories: CATS, recordMode: 'recordContinuously' }, transferMode: 'ReturnAsStream' });
  await sleep(300);
  const result = await fn();
  const complete = waitEvent(b, 'Tracing.tracingComplete', page.sessionId, 180000);
  await page.s('Tracing.end');
  const { stream } = await complete;
  const parts = [];
  for (;;) { const r = await page.s('IO.read', { handle: stream, size: 4 << 20 }); parts.push(r.base64Encoded ? Buffer.from(r.data, 'base64').toString() : r.data); if (r.eof) break; }
  await page.s('IO.close', { handle: stream });
  const json = JSON.parse(parts.join(''));
  return { result, events: json.traceEvents || json };
}
function analyze(events) {
  const procNames = {}; const threadNames = {};
  for (const e of events) if (e.ph === 'M') { if (e.name === 'process_name') procNames[e.pid] = e.args.name; if (e.name === 'thread_name') threadNames[e.pid + ':' + e.tid] = e.args.name; }
  const counts = {};
  for (const e of events) if (e.ph === 'X' && threadNames[e.pid + ':' + e.tid] === 'CrRendererMain') counts[e.pid + ':' + e.tid] = (counts[e.pid + ':' + e.tid] || 0) + 1;
  const mainKey = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const [mpid, mtid] = mainKey ? mainKey.split(':').map(Number) : [0, 0];
  const main = events.filter((e) => e.pid === mpid && e.tid === mtid && e.ph === 'X' && e.dur > 0).sort((a, b) => a.ts - b.ts || b.dur - a.dur);
  const t0 = main[0]?.ts ?? 0; const t1 = Math.max(...main.map((e) => e.ts + e.dur));
  const stack = []; const byName = {};
  let busy = 0;
  for (const e of main) {
    while (stack.length && stack[stack.length - 1].ts + stack[stack.length - 1].dur <= e.ts) stack.pop();
    if (stack.length) stack[stack.length - 1].child = (stack[stack.length - 1].child || 0) + e.dur;
    stack.push(e);
  }
  for (const e of main) { const st = e.dur - (e.child || 0); if (st <= 0) continue; busy += st; byName[e.name] = (byName[e.name] || 0) + st; }
  const gpuKeys = Object.entries(procNames).filter(([, n]) => /GPU/i.test(n)).map(([p]) => Number(p));
  const gpu = events.filter((e) => gpuKeys.includes(e.pid) && e.ph === 'X' && e.name === 'GPUTask').reduce((a, e) => a + e.dur, 0);
  const span = t1 - t0;
  const seen = new Set();
  const longTasks = main.filter((e) => /RunTask/.test(e.name) && e.dur >= (Number(process.env.TASK_MS) || 50) * 1000).filter((t) => { const k = Math.round(t.ts / 1000); if (seen.has(k)) return false; seen.add(k); return true; }).map((t) => {
    const kids = main.filter((e) => e.ts >= t.ts && e.ts + e.dur <= t.ts + t.dur && e !== t);
    const agg = {};
    for (const k of kids) { const st = k.dur - (k.child || 0); if (st <= 0) continue; let label = k.name; const d = k.args?.data || {}; if (d.url) label += ' ' + String(d.url).split('/').pop().slice(0, 40) + (d.functionName ? ' ' + d.functionName : ''); if (d.type) label += ' ' + d.type; agg[label] = (agg[label] || 0) + st; }
    const top = Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([n, v]) => `${n}: ${(v / 1000).toFixed(1)}ms`);
    return { at: +((t.ts - t0) / 1000).toFixed(0), dur: +(t.dur / 1000).toFixed(1), top };
  });
  return {
    windowMs: +(span / 1000).toFixed(0), mainBusyPct: +((busy / span) * 100).toFixed(1), gpuPct: +((gpu / span) * 100).toFixed(1),
    top: Object.entries(byName).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n, v]) => [n, +(v / 1000).toFixed(0)]),
    longTasks: longTasks.slice(0, 20),
  };
}

const READY = `!!(window.__neuron && __neuron.director && __neuron.director.ready && document.documentElement.dataset.curtain !== '1')`;

const RUN = (seconds, from, to) => `new Promise(function(res){
  document.documentElement.style.scrollBehavior='auto';
  var gl = __neuron.gl, d = __neuron.director;
  var rows = [], t0 = null, last = null, dur = ${seconds}*1000;
  var r0 = __w.root, g0 = __w.ground, f0 = gl.info.render.frame;
  function tick(now){
    if (t0 === null) { t0 = now; last = now; }
    var k = Math.min(1, (now - t0)/dur);
    scrollTo(0, ${from} + (${to} - ${from}) * k);
    rows.push([ +(now - t0).toFixed(1), +(now - last).toFixed(2), Math.round(scrollY), +d.p.toFixed(3), +d.targetP.toFixed(3), gl.info.render.frame - f0, __neuron.memory().programs, __w.root - r0, __w.ground - g0, gl.info.render.calls, gl.info.render.triangles ]);
    last = now;
    if (k < 1) requestAnimationFrame(tick); else res(rows);
  }
  requestAnimationFrame(tick);
})`;

const REC = (seconds) => `new Promise(function(res){
  var gl = __neuron.gl, d = __neuron.director;
  var rows = [], t0 = null, last = null, dur = ${seconds}*1000 + 600;
  var r0 = __w.root, g0 = __w.ground, f0 = gl.info.render.frame;
  function tick(now){
    if (t0 === null) { t0 = now; last = now; }
    rows.push([ +(now - t0).toFixed(1), +(now - last).toFixed(2), Math.round(scrollY), +d.p.toFixed(3), +d.targetP.toFixed(3), gl.info.render.frame - f0, __neuron.memory().programs, __w.root - r0, __w.ground - g0, 0, 0 ]);
    last = now;
    if (now - t0 < dur) requestAnimationFrame(tick); else res(rows);
  }
  requestAnimationFrame(tick);
})`;

const IDLE = (seconds) => `new Promise(function(res){
  var gl = __neuron.gl; var rows=[], t0=null, last=null, f0 = gl.info.render.frame;
  function tick(now){ if(t0===null){t0=now;last=now;} rows.push([+(now-t0).toFixed(1), +(now-last).toFixed(2), gl.info.render.frame - f0]); last=now; if(now-t0 < ${seconds}*1000) requestAnimationFrame(tick); else res(rows); }
  requestAnimationFrame(tick);
})`;

const GLASS = `(function(){
  var vh = innerHeight, vw = innerWidth, n = 0, area = 0, list = [];
  document.querySelectorAll('*').forEach(function(el){
    var cs = getComputedStyle(el); var bf = cs.backdropFilter || cs.webkitBackdropFilter;
    if (!bf || bf === 'none') return;
    var r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw || r.width === 0) return;
    var w = Math.min(r.right, vw) - Math.max(r.left, 0), h = Math.min(r.bottom, vh) - Math.max(r.top, 0);
    n++; area += w*h; list.push((el.className && String(el.className).split(' ')[0]) || el.tagName);
  });
  return { count: n, areaPct: +((area/(vw*vh))*100).toFixed(0), sample: list.slice(0, 12) };
})()`;

function summarize(rows) {
  const dts = rows.slice(2).map((r) => r[1]).sort((a, b) => a - b);
  const q = (p) => dts[Math.min(dts.length - 1, Math.floor(dts.length * p))];
  const total = rows[rows.length - 1][0];
  const slow = rows.filter((r) => r[1] > 25);
  // чанки: что менялось в медленных кадрах
  const spikes = [];
  for (let i = 2; i < rows.length; i += 1) {
    const r = rows[i], prev = rows[i - 1];
    if (r[1] > 25) spikes.push({ t: r[0], dt: r[1], scrollY: r[2], p: r[3], lag: +(r[4] - r[3]).toFixed(2), programsDelta: r[6] - prev[6], rootWrites: r[7] - prev[7], groundWrites: r[8] - prev[8] });
  }
  // по главам: средний dt и доля медленных
  const byChapter = {};
  for (const r of rows.slice(2)) { const c = Math.floor(r[3]); const b = (byChapter[c] ||= { frames: 0, sum: 0, slow: 0, rootWrites: 0 }); b.frames++; b.sum += r[1]; if (r[1] > 25) b.slow++; }
  for (let i = 3; i < rows.length; i += 1) { const c = Math.floor(rows[i][3]); if (byChapter[c]) byChapter[c].rootWrites += rows[i][7] - rows[i - 1][7]; }
  for (const k of Object.keys(byChapter)) { const b = byChapter[k]; b.meanDt = +(b.sum / b.frames).toFixed(1); delete b.sum; }
  const last = rows[rows.length - 1];
  return {
    frames: rows.length, seconds: +(total / 1000).toFixed(1), fps: +((rows.length / total) * 1000).toFixed(1),
    renders: last[5], rendersPerSec: +((last[5] / total) * 1000).toFixed(1),
    dt: { median: q(0.5), p90: q(0.9), p95: q(0.95), p99: q(0.99), max: dts[dts.length - 1] },
    slowFrames: slow.length, slowFramesPct: +((slow.length / rows.length) * 100).toFixed(1),
    programsStart: rows[2][6], programsEnd: last[6], rootWrites: last[7], groundWrites: last[8], drawCalls: last[9], triangles: last[10],
    byChapter, spikes: spikes.slice(0, 40),
  };
}


const BOOT = `new Promise(function(res){
  var rows=[], t0=null, last=null;
  function tick(now){
    if(t0===null){t0=now;last=now;}
    var n = window.__neuron; var gl = n && n.gl;
    rows.push([+(now-t0).toFixed(1), +(now-last).toFixed(2), gl ? gl.info.render.frame : -1, n ? n.memory().programs : -1, Math.round(scrollY)]);
    last=now;
    if(now-t0 < 7000) requestAnimationFrame(tick); else res(rows);
  }
  requestAnimationFrame(tick);
})`;
async function main() {
  const [label, url] = process.argv.slice(2);
  const b = await browser();
  const page = await openPage(b, false);
  /* FIRST_VISIT=1 — первый заход: занавес играет, ключ sessionStorage снимается
     вторым скриптом (они выполняются по порядку). */
  if (process.env.FIRST_VISIT) {
    await page.s('Page.addScriptToEvaluateOnNewDocument', { source: `try{sessionStorage.removeItem('preloaderSeen');}catch(e){}` });
  }
  const out = { label, url, at: new Date().toISOString() };
  try {
    // стартуем рекордер сразу после load, до появления сцены (занавес уже снят через sessionStorage)
    const l = waitEvent(b, 'Page.loadEventFired', page.s === undefined ? undefined : undefined);
    await page.s('Page.navigate', { url });
    await l;
    const t0 = Date.now();
    while (Date.now() - t0 < 20000) { if (await page.eval(`document.documentElement.dataset.curtain !== '1'`)) break; await sleep(50); }
    let rows;
    if (process.env.TRACE) {
      /* TRACE=1 — трасса старта: что внутри длинных задач первых секунд (TASK_MS — порог). */
      const r = await withTrace(b, page, () => page.eval(BOOT));
      rows = r.result;
      out.trace = analyze(r.events);
    } else {
      rows = await page.eval(BOOT);
    }
    const first = rows.findIndex((r) => r[2] >= 0);
    const spikes = rows.filter((r, i) => i > 1 && r[1] > 25).map((r) => ({ t: r[0], dt: r[1], programs: r[3], renders: r[2] }));
    const programsTimeline = [];
    for (let i = 1; i < rows.length; i += 1) if (rows[i][3] !== rows[i - 1][3]) programsTimeline.push({ t: rows[i][0], programs: rows[i][3], dt: rows[i][1] });
    out.firstSceneFrameAt = first >= 0 ? rows[first][0] : null;
    out.spikes = spikes;
    out.programsTimeline = programsTimeline;
    out.marks = await page.eval(`performance.getEntriesByType('mark').filter(m=>/neuron/.test(m.name)).map(m=>({name:m.name,t:+m.startTime.toFixed(0)}))`);
    fs.writeFileSync(`${S}/results/${label}-rows.json`, JSON.stringify(rows));
  } catch (e) { out.error = String(e.stack || e); }
  fs.writeFileSync(`${S}/results/${label}.json`, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 1));
  await page.close(); b.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
