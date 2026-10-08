/* Visual proof for the two panel transitions the animation probe measures
   numerically: the desktop close (orb-fold) caught mid-interpolation, and the
   mobile bottom sheet (orb-sheet-in) caught mid-slide. Both are frozen by
   pausing the real animation and seeking it, then capturing the page.
   Usage: node tests/fold-shot.mjs   (needs :8000 + debug port) */
import { writeFileSync, mkdirSync } from 'node:fs';

const port = process.env.ORBIT_CHROME_PORT || '9227';
const base = 'http://127.0.0.1:8000';
const outDir = 'reports/orbit/diag';
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const t = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
let id = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const n = ++id;
  const timer = setTimeout(() => { if (pending.delete(n)) reject(new Error('CDP timeout: ' + method)); }, 20000);
  pending.set(n, { resolve: (v) => { clearTimeout(timer); resolve(v); }, reject: (e) => { clearTimeout(timer); reject(e); } });
  ws.send(JSON.stringify({ id: n, method, params }));
});
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
const shot = async (name) => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${outDir}/${name}.png`, Buffer.from(r.data, 'base64'));
  console.log('wrote', `${outDir}/${name}.png`);
};

const FREEZE = (animName, frac) => `(async()=>{
  const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  const p=document.getElementById('orbitPanel');
  let a=null;
  for(let i=0;i<70 && !a;i++){ a=document.getAnimations().find(x=>x.animationName==='${animName}'); if(!a) await sleep(20); }
  if(!a) return {found:false, name:getComputedStyle(p).animationName};
  const d=a.effect.getTiming().duration;
  a.pause(); a.currentTime=d*${frac};
  return {found:true, dur:d, ct:Math.round(a.currentTime), clip:getComputedStyle(p).clipPath, transform:getComputedStyle(p).transform};})()`;

try {
  await send('Page.enable'); await send('Runtime.enable');

  /* 1. Desktop: freeze the fold part way through closing. */
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `${base}/mission.html` });
  await sleep(3200);
  await evaluate(`document.querySelectorAll('.orb__body')[1].click()`);
  await sleep(1400);
  await evaluate(`document.querySelector('.orb__close').click()`);
  console.log('desktop fold @45%:', JSON.stringify(await evaluate(FREEZE('orb-fold', 0.45))));
  await shot('fold-desktop-45');

  /* 2. Mobile: freeze the sheet part way up. */
  await send('Emulation.setDeviceMetricsOverride', { width: 600, height: 900, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: `${base}/mission.html` });
  await sleep(3200);
  await evaluate(`document.querySelector('.orb__body').click()`);
  console.log('mobile sheet @50%:', JSON.stringify(await evaluate(FREEZE('orb-sheet-in', 0.12))));
  await shot('sheet-mobile-50');
  await evaluate(`(()=>{const a=document.getAnimations().find(x=>x.animationName==='orb-sheet-in');if(a)a.play();return true;})()`);
  await sleep(900);
  await shot('sheet-mobile-open');
} finally {
  try { ws.close(); } catch (_) {}
  await fetch(`http://127.0.0.1:${port}/json/close/${t.id}`).catch(() => {});
}
