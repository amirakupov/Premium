// node evalq.mjs <url> <desk|mob> "<expression>" [scrollY]
import fs from 'node:fs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function browser() {
  const v = await (await fetch(`http://localhost:${process.env.CDP_PORT || 9222}/json/version`)).json();
  const ws = new WebSocket(v.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map(); const listeners = new Set();
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } else for (const l of listeners) l(m); };
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const i = ++id; pending.set(i, { resolve, reject }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
  return { send, on: (f) => listeners.add(f), off: (f) => listeners.delete(f), close: () => ws.close() };
}
const [url, vp, expr, scrollY, shot] = process.argv.slice(2);
const b = await browser();
const { targetId } = await b.send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await b.send('Target.attachToTarget', { targetId, flatten: true });
const s = (m, p) => b.send(m, p, sessionId);
await s('Page.enable'); await s('Runtime.enable');
await s('Emulation.setDeviceMetricsOverride', vp === 'mob' ? { width: 390, height: 780, deviceScaleFactor: 2, mobile: true } : vp === 'lap' ? { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false } : { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await s('Page.addScriptToEvaluateOnNewDocument', { source: `try{sessionStorage.setItem('preloaderSeen','1');}catch(e){}` });
const loaded = new Promise((res) => { const fn = (m) => { if (m.method === 'Page.loadEventFired' && m.sessionId === sessionId) { b.off(fn); res(); } }; b.on(fn); });
await s('Page.navigate', { url }); await loaded;
await sleep(2500);
if (scrollY) { await s('Runtime.evaluate', { expression: `document.documentElement.style.scrollBehavior='auto'; scrollTo(0, ${scrollY})` }); await sleep(1200); }
const r = await s('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
console.log(JSON.stringify(r.exceptionDetails ? r.exceptionDetails : r.result.value, null, 1));
if (shot) { const { data } = await s('Page.captureScreenshot', { format: 'jpeg', quality: 85 }); fs.writeFileSync(shot, Buffer.from(data, 'base64')); }
await b.send('Target.closeTarget', { targetId }); b.close();
