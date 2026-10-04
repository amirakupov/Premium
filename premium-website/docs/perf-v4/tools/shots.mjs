// Скриншоты главной по главам на десктопе и телефоне — для поиска UI-дефектов.
// node shots.mjs <url>
import fs from 'node:fs';
import path from 'node:path';
const S = path.dirname(new URL(import.meta.url).pathname);
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
async function openPage(b, vp) {
  const { targetId } = await b.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await b.send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => b.send(m, p, sessionId);
  await s('Page.enable'); await s('Runtime.enable');
  await s('Emulation.setDeviceMetricsOverride', vp);
  if (vp.mobile) await s('Emulation.setTouchEmulationEnabled', { enabled: true });
  await s('Page.addScriptToEvaluateOnNewDocument', { source: `try{sessionStorage.setItem('preloaderSeen','1');}catch(e){}` });
  const logs = [];
  b.on((m) => { if (m.sessionId !== sessionId) return; if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + (m.params.exceptionDetails?.exception?.description || '')); if (m.method === 'Runtime.consoleAPICalled' && /warn|error/.test(m.params.type)) logs.push(m.params.type + ' ' + m.params.args.map((a) => a.value || a.description).join(' ')); });
  return {
    s, logs,
    eval: async (expression) => { const r = await s('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; },
    goto: async (url) => { const l = waitEvent(b, 'Page.loadEventFired', sessionId); await s('Page.navigate', { url }); await l; },
    shot: async (file) => { const { data } = await s('Page.captureScreenshot', { format: 'jpeg', quality: 80 }); fs.writeFileSync(file, Buffer.from(data, 'base64')); },
    close: () => b.send('Target.closeTarget', { targetId }),
  };
}
const READY = `!!(window.__neuron && __neuron.director && __neuron.director.ready && document.documentElement.dataset.curtain !== '1')`;
const ANCHORS = ['#hero', '#symptom', '#diagnostics', '#quote', '#services', '#clinic-photos', '#doctors', '#outro-draw', '#outro-verdict'];

async function run(b, url, name, vp) {
  const page = await openPage(b, vp);
  const out = { name, checks: {} };
  await page.goto(url);
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) { if (await page.eval(READY)) break; await sleep(200); }
  await sleep(3200);
  await page.shot(`${S}/shots/${name}-00-hero.jpg`);
  // горизонтальный скролл / переполнение
  out.checks.overflowX = await page.eval(`({docW: document.documentElement.scrollWidth, vw: innerWidth, wide: [...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect(); return r.right>innerWidth+1 && r.width>0 && getComputedStyle(e).position!=='fixed'}).slice(0,8).map(e=>(e.id?'#'+e.id:'')+'.'+String(e.className).split(' ')[0]+' r='+Math.round(e.getBoundingClientRect().right))})`);
  let i = 1;
  for (const a of ANCHORS) {
    const ok = await page.eval(`(function(){var el=document.querySelector('${a}'); if(!el) return false; document.documentElement.style.scrollBehavior='auto'; var r=el.getBoundingClientRect(); scrollTo(0, Math.max(0, r.top+scrollY+r.height/2-innerHeight/2)); return true})()`);
    if (!ok) continue;
    await sleep(1400);
    await page.shot(`${S}/shots/${name}-${String(i).padStart(2, '0')}-${a.slice(1)}.jpg`);
    i += 1;
  }
  // финал: несколько позиций внутри стоп-кадра и выход
  for (const p of [7.3, 7.7, 8.3, 8.8, 9.2]) {
    await page.eval(`(function(){
      var A=${JSON.stringify(ANCHORS.concat(['#outro-exit']))}; var S=['#hero','#symptom','#diagnostics','#quote','#services','#clinic-photos','#doctors','#outro-draw','#outro-verdict','#outro-exit'];
      var vh=innerHeight, docH=document.documentElement.scrollHeight, maxF=Math.max(vh/2, docH-vh/2), m=[], prev=NaN;
      for (var k=0;k<S.length;k++){var el=document.querySelector(S[k]);var c; if(!el) c=isNaN(prev)?0:prev+1; else {var r=el.getBoundingClientRect(); c=r.top+scrollY+r.height/2; if(k===S.length-1)c=Math.min(c,maxF); if(!isNaN(prev)&&c<=prev)c=prev+1;} m.push(c); prev=c;}
      var p=${p}; var idx=Math.min(m.length-2, Math.floor(p)); var f=m[idx]+(m[idx+1]-m[idx])*(p-idx);
      scrollTo(0, Math.max(0, Math.min(docH-vh, f-vh/2)));
    })()`);
    await sleep(1400);
    await page.shot(`${S}/shots/${name}-${String(i).padStart(2, '0')}-p${p}.jpg`);
    i += 1;
  }
  await page.eval(`scrollTo(0, document.documentElement.scrollHeight)`);
  await sleep(1500);
  await page.shot(`${S}/shots/${name}-${String(i).padStart(2, '0')}-bottom.jpg`);
  i += 1;
  // шапка после скролла вверх к середине
  await page.eval(`scrollTo(0, 300)`); await sleep(800);
  await page.shot(`${S}/shots/${name}-${String(i).padStart(2, '0')}-y300.jpg`);
  out.logs = page.logs.slice(0, 20);
  out.verdict = await page.eval(`(function(){var v=document.querySelector('#outro-verdict');var rig=document.querySelector('[data-reveal="rig"]');var cta=document.querySelector('#outro-verdict a');return {verdictH: v&&v.offsetHeight, rig: rig&&JSON.stringify(rig.getBoundingClientRect()), ctaRect: cta&&JSON.stringify(cta.getBoundingClientRect())}})()`);
  await page.close();
  return out;
}

async function main() {
  const url = process.argv[2];
  const b = await browser();
  const res = {};
  res.desktop = await run(b, url, 'desk', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  res.mobile = await run(b, url, 'mob', { width: 390, height: 780, deviceScaleFactor: 2, mobile: true });
  res.laptop = await run(b, url, 'lap', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  fs.writeFileSync(`${S}/results/shots.json`, JSON.stringify(res, null, 2));
  console.log(JSON.stringify(res, null, 1));
  b.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
