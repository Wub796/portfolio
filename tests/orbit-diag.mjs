/* Ad-hoc diagnostic: screenshot one page and report geometry / errors. */
import fs from 'node:fs';
const port = process.env.ORBIT_CHROME_PORT || '9227';
const page = process.argv[2] || 'extracurriculars';
const outDir = new URL('../reports/orbit/diag/', import.meta.url);
fs.mkdirSync(outDir, { recursive: true });

const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const target = targets.find(t => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let id = 0, pending = new Map(), errors = [];
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value || a.description).join(' '));
  if (m.method === 'Runtime.exceptionThrown') errors.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push('LOG ' + m.params.entry.text);
});
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
const pause = ms => new Promise(r => setTimeout(r, ms));
const wait = async (expr, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await evaluate(expr)) return true; await pause(120); } throw new Error('timeout: ' + expr); };
const shot = async name => { await send('Page.bringToFront'); const s = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); if (!s.result?.data) { console.error('no screenshot data: ' + JSON.stringify(s).slice(0, 200)); return; } fs.writeFileSync(new URL(name + '.png', outDir), Buffer.from(s.result.data, 'base64')); };

await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable'); await send('Performance.enable');
const view = process.argv[3] || 'desktop';
const mobileView = view === 'mobile';
const viewport = view === 'mobile' ? { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }
  : view === 'tablet' ? { width: 900, height: 760, deviceScaleFactor: 1, mobile: false }
  : { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false };
await send('Emulation.setDeviceMetricsOverride', viewport);
await send('Page.navigate', { url: 'http://127.0.0.1:8000/' + page + '.html' });
try { await wait(`document.documentElement.classList.contains('orb-ready')`); } catch (_) { console.error('NO orb-ready'); }
await pause(2200);
console.error('ready=' + await evaluate(`document.documentElement.className`) + ' lastError=' + await evaluate(`window.__orbitDock && window.__orbitDock.lastError`));
const diag = await evaluate(`(()=>{const a=[...document.querySelectorAll('.orb__body')];const anchor=window.__getOrbitAnchor?.()||null;
 const boxes=a.map((b,i)=>{const r=b.getBoundingClientRect();return {i,x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),cx:r.x+r.width/2,cy:r.y+r.height/2,vis:getComputedStyle(b).visibility,name:b.getAttribute('aria-label'),type:b.dataset.archetype,depth:b.classList.contains('orb__far')?'far':'near'}});
 const shown=boxes.filter(b=>b.vis==='visible');
 // Does the planet disc (the thing the page is 'about') ever sit under a body?
 const planetOverlaps=anchor&&anchor.ok?shown.filter(b=>Math.hypot(b.cx-anchor.x,b.cy-anchor.y)<anchor.r+Math.min(b.w,b.h)/2).map(b=>b.i):[];
 // Do any two VISIBLE body boxes intersect each other?
 const pairs=[];for(let i=0;i<shown.length;i++)for(let j=i+1;j<shown.length;j++){const A=shown[i],B=shown[j];if(Math.abs(A.cx-B.cx)<(A.w+B.w)/2*.62&&Math.abs(A.cy-B.cy)<(A.h+B.h)/2*.62)pairs.push([A.i,B.i]);}
 return {planet:document.body.dataset.planet,count:a.length,lastError:window.__orbitDock.lastError||null,anchor,scene:window.__scene3d||null,boxes,planetOverlaps,nearPairs:pairs,
  layerZ:getComputedStyle(document.getElementById('orbitLayer')).zIndex,sceneZ:getComputedStyle(document.getElementById('scene3d')).zIndex,shown:shown.length}})()`);
await shot(page + '-closed' + (view === 'desktop' ? '' : '-' + view));
if (process.argv[4] === 'bottom') {
  for (let i = 0; i < 8; i++) { await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 1200, y: 500, deltaX: 0, deltaY: 2000 }); await pause(350); }
  await pause(1200);
  await shot(page + '-bottom');
  console.error('bottom: ' + JSON.stringify(await evaluate(`(()=>{const l=document.getElementById('orbitLayer'),f=document.querySelector('.foot');return{scrollY:Math.round(scrollY),max:document.documentElement.scrollHeight-innerHeight,opacity:getComputedStyle(l).opacity,offstage:l.classList.contains('orb__offstage'),footBg:getComputedStyle(f).backgroundColor}})()`)));
}
console.log(JSON.stringify({ diag, errors: errors.slice(0, 12) }, null, 1));
ws.close();
