/* Node built-ins only. Requires the static server :8000 and isolated Chrome :9227. */
import fs from 'node:fs/promises';
const port = process.env.ORBIT_CHROME_PORT || '9227';
const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
let id = 0;
const pending = new Map(), exceptions = [];
ws.addEventListener('message', ({ data }) => {
  const m = JSON.parse(data);
  if (m.method === 'Runtime.exceptionThrown') exceptions.push(m.params.exceptionDetails.text);
  if (!pending.has(m.id)) return;
  const p = pending.get(m.id); pending.delete(m.id); clearTimeout(p.timer);
  m.error ? p.reject(Error(JSON.stringify(m.error))) : p.resolve(m.result);
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const n = ++id, timer = setTimeout(() => { pending.delete(n); reject(Error('CDP timeout: ' + method)); }, 15000);
  pending.set(n, { resolve, reject, timer }); ws.send(JSON.stringify({ id: n, method, params }));
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ev = async expression => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
const wait = async expression => {
  for (let i = 0; i < 100; i++) { if (await ev(expression)) return; await sleep(40); }
  throw Error('Timeout: ' + expression);
};
const key = async key => {
  const p = { key, code: key, windowsVirtualKeyCode: { Enter: 13, Escape: 27, ArrowRight: 39, ArrowLeft: 37 }[key], ...(key === 'Enter' ? { text: '\r' } : {}) };
  await send('Input.dispatchKeyEvent', { type: 'keyDown', ...p }); await send('Input.dispatchKeyEvent', { type: 'keyUp', ...p });
};
const point = selector => ev(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
const mouse = (type, p) => send('Input.dispatchMouseEvent', { type, ...p, ...(type === 'mouseMoved' ? { button: 'left', buttons: 1 } : { button: 'left', clickCount: 1 }) });
const click = async selector => { const p = await point(selector); await mouse('mousePressed', p); await mouse('mouseReleased', p); };
const nav = async page => {
  const url = `http://127.0.0.1:8000/${page}.html?motion=${Date.now()}`;
  await send('Page.navigate', { url });
  await wait(`location.href===${JSON.stringify(url)}&&document.readyState==='complete'&&window.__orbitDock?.getState()?.planet===${JSON.stringify(page)}`);
  await sleep(1600);
};
const opened = `window.__orbitDock?.getState()?.phase==='open'`;
const closed = `window.__orbitDock?.getState()?.openIndex===-1&&!document.documentElement.classList.contains('orb-open')`;
const open = async () => { await ev(`document.querySelector('.orb__body').focus()`); await key('Enter'); await wait(opened); };
const reduced = value => send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value }] });
const report = { checks: [], failures: [], measurements: {} };
const check = (name, ok, detail) => { report.checks.push({ name, pass: !!ok, ...(detail === undefined ? {} : { detail }) }); if (!ok) report.failures.push(name); console.log(ok ? 'PASS' : 'FAIL', name); };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); await fs.writeFile(new URL(`../reports/orbit/diag/${name}.png`, import.meta.url), Buffer.from(r.data, 'base64')); };
try {
  await fs.mkdir(new URL('../reports/orbit/diag/', import.meta.url), { recursive: true });
  await send('Page.enable'); await send('Runtime.enable'); await send('Performance.enable'); await send('Page.bringToFront');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await nav('mission');
  // Controlled camera projections exercise timing deterministically, including
  // the invalid-projection path which used to fall back to the viewport centre.
  await ev(`(()=>{window.__scene3d={ok:true,slug:'mission'};window.__arrivalAnchor={slug:'mission',ok:false,visible:false};window.__getOrbitAnchor=()=>window.__arrivalAnchor;window.__orbitDock.destroy();window.__orbitDock.init()})()`);
  check('Offscreen live planet does not show centred spacecraft or fallback', await ev(`document.querySelector('#orbitLayer').inert&&getComputedStyle(document.querySelector('#orbitLayer')).opacity==='0'&&[...document.querySelectorAll('.orb__body')].every(b=>b.tabIndex===-1)`));
  await ev(`document.querySelector('.orb__body').click()`); await sleep(150);
  check('Docking requested before arrival waits for the planet', await ev(`window.__orbitDock.getState().openIndex===-1&&document.querySelector('.orb__panel').hidden`));
  await ev(`window.__arrivalAnchor={slug:'studies',ok:true,visible:true,x:720,y:570,r:120,scale:1,sunX:-1,sunY:0}`); await sleep(150);
  check('Previous planet projection cannot reveal the destination belt', await ev(`document.querySelector('#orbitLayer').inert&&getComputedStyle(document.querySelector('#orbitLayer')).opacity==='0'`));
  await ev(`window.__arrivalAnchor={slug:'mission',ok:true,visible:true,x:720,y:570,r:120,scale:.7,sunX:-1,sunY:0}`); await wait(opened); await sleep(350);
  check('Planet entering view reveals one already-orbiting belt', await ev(`!document.querySelector('#orbitLayer').inert&&!document.documentElement.classList.contains('orb-intro')&&[...document.querySelectorAll('.orb__drift')].every(n=>getComputedStyle(n).animationName==='orb-drift')&&document.querySelector('.orb__slot').style.transform.includes('scale(0.7)')`));
  await key('Escape'); await wait(closed);
  await ev(`document.dispatchEvent(new CustomEvent('bw:orbit-flight'));window.__arrivalAnchor={slug:'mission',ok:false,visible:false}`);
  check('New flight hides the departing belt synchronously', await ev(`document.querySelector('#orbitLayer').inert&&getComputedStyle(document.querySelector('#orbitLayer')).opacity==='0'`));
  await ev(`window.__scene3d={ok:false}`); await sleep(500);
  check('Unavailable 3D still exposes the fallback and controls', await ev(`!document.querySelector('#orbitLayer').inert&&!document.querySelector('.orb__fallback').hidden`));
  await nav('mission');
  await ev(`document.querySelector('.orb__body').focus()`); await key('Enter'); await key('Escape');
  await sleep(750);
  check('Escape cancels the lock before reveal', await ev(`${closed}&&document.getElementById('orbitPanel').hidden&&document.activeElement===document.querySelector('.orb__body')&&!document.getElementById('top').inert&&document.body.style.overflow!=='hidden'`));
  await ev(`document.querySelector('.orb__body').focus()`); await key('Enter');
  await wait(`window.__orbitDock?.getState()?.phase==='transit'`); await key('Escape'); await sleep(650);
  check('Escape cancels transit with no delayed panel or flight', await ev(`${closed}&&document.getElementById('orbitPanel').hidden&&document.querySelector('.orb__body').getAnimations().length===1`));
  const start = performance.now(); await open();
  report.measurements.revealMs = Math.round(performance.now() - start);
  await sleep(350);
  const geometry = await ev(`(()=>{const s=document.querySelector('.orb__thumbnail svg'),r=s.getBoundingClientRect();const parts=[...s.querySelectorAll('.orb__quadrant')].map(n=>n.getBoundingClientRect());return {static:s.getAnimations().length===0,inside:parts.every(p=>p.left>=r.left-1&&p.right<=r.right+1&&p.top>=r.top-1&&p.bottom<=r.bottom+1)}})()`);
  check('Sail quadrants remain inside a static reading thumbnail', geometry.inside && geometry.static, geometry);
  await shot('refined-desktop');
  await click('.orb__next');
  check('Next keeps focus on Next', await ev(`document.activeElement===document.querySelector('.orb__next')&&window.__orbitDock.getState().openIndex===1`));
  let maxCross = 0;
  for (let i = 0; i < 16; i++) {
    await key(i % 2 ? 'ArrowLeft' : 'ArrowRight');
    maxCross = Math.max(maxCross, await ev(`document.querySelector('.orb__content').getAnimations().length`));
  }
  check('Rapid port changes retain only one content animation', maxCross <= 1, maxCross);
  await wait(`document.querySelector('.orb__content').getAnimations().length===0`);
  check('Switch has no duplicate payload entrance', await ev(`document.querySelector('.orb__content').firstElementChild.getAnimations().length===0`));
  const beginClose = performance.now(); await key('Escape'); await wait(closed);
  report.measurements.closeMs = Math.round(performance.now() - beginClose);
  check('Close releases the modal by its 560ms fallback', report.measurements.closeMs < 650, report.measurements.closeMs);
  await open(); await sleep(350); await key('Escape'); await reduced('reduce'); await wait(closed);
  check('Enabling reduced motion completes an in-flight close', await ev(`document.getElementById('orbitPanel').hidden&&!document.getElementById('top').inert`));
  await reduced('no-preference'); await nav('mission');
  await ev(`document.querySelector('.orb__body').focus()`); await key('Enter'); await reduced('reduce'); await wait(opened);
  check('Enabling reduced motion completes docking without a flight', await ev(`document.querySelector('.orb__body').getAnimations().length===0&&document.querySelector('.orb__panel').getAnimations().length===0`));
  await key('Escape'); await wait(closed); await reduced('no-preference');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  await nav('studies'); await open(); await sleep(350);
  let p = await point('.orb__handle'); await mouse('mousePressed', p); await mouse('mouseMoved', { x: p.x, y: p.y + 35 });
  check('Sheet tracks the finger', await ev(`Math.abs(document.querySelector('.orb__panel').getBoundingClientRect().top-35)<2`));
  await shot('refined-sheet-drag');
  await mouse('mouseReleased', { x: p.x, y: p.y + 35 }); await sleep(300);
  check('Short pull settles instead of triggering the synthetic click', await ev(`${opened}&&Math.abs(document.querySelector('.orb__panel').getBoundingClientRect().top)<1`));
  p = await point('.orb__handle'); await mouse('mousePressed', p); await mouse('mouseMoved', { x: p.x, y: p.y + 95 }); await mouse('mouseReleased', { x: p.x, y: p.y + 95 });
  check('Dismissal starts from the dragged offset, not zero', await ev(`document.querySelector('.orb__panel').style.getPropertyValue('--orb-sheet-offset')==='95px'&&window.__orbitDock.getState().phase==='closing'`));
  await wait(closed);
  await open(); await sleep(350);
  p = await point('.orb__handle'); await mouse('mousePressed', p); await mouse('mouseMoved', { x: p.x, y: p.y + 30 });
  // Force capture loss, the same cancellation path used when the browser interrupts a gesture.
  await ev(`(()=>{const h=document.querySelector('.orb__handle');if(h.hasPointerCapture(1))h.releasePointerCapture(1)})()`);
  await mouse('mouseReleased', { x: p.x, y: p.y + 30 }); await sleep(300);
  check('Capture loss settles without dismissing', await ev(`${opened}&&!document.querySelector('.orb__panel').classList.contains('orb__dragging')&&Math.abs(document.querySelector('.orb__panel').getBoundingClientRect().top)<1`));
  await key('Escape'); await wait(closed);
  await nav('studies'); await open(); await sleep(350);
  await reduced('reduce');
  const handle = await point('.orb__handle'); await mouse('mousePressed', handle); await mouse('mouseMoved', {x:handle.x,y:handle.y+30});
  check('Reduced-motion pull does not translate the sheet', await ev(`document.querySelector('.orb__panel').getBoundingClientRect().top===0`));
  await mouse('mouseReleased', {x:handle.x,y:handle.y+30}); await sleep(100);
  check('Reduced-motion short pull stays open', await ev(opened), await ev(`({state:window.__orbitDock.getState(),style:document.querySelector('.orb__panel').getAttribute('style')})`));
  await key('Escape'); await wait(closed); await reduced('no-preference');
  await nav('studies');
  const visible = () => ev(`[...document.querySelectorAll('.orb__body')].map((b,i)=>getComputedStyle(b).visibility==='visible'?i:-1).filter(i=>i>=0)`);
  const before = await visible(); p = await point('.orb__body'); await mouse('mousePressed', p); await mouse('mouseMoved', { x: p.x + 8, y: p.y + 90 }); await mouse('mouseReleased', { x: p.x + 8, y: p.y + 90 });
  check('Vertical scrolling does not rotate the port window', JSON.stringify(before) === JSON.stringify(await visible()));
  await send('Emulation.setDeviceMetricsOverride', { width: 600, height: 900, deviceScaleFactor: 1, mobile: false });
  await nav('studies'); await open(); await key('ArrowRight');
  check('Switching during sheet entrance keeps the rig alive', await ev(`window.__orbitDock.getState()?.openIndex===1`));
  await sleep(400); await key('Escape'); await wait(closed);
  await ev(`document.querySelector('.orb__body').focus()`); await key('Enter'); await wait(opened); await sleep(350);
  // Coursework is deliberately long enough to overflow at this viewport;
  // the telemetry port is shorter than the sheet and cannot exercise restoration.
  await key('ArrowRight'); await sleep(250);
  await ev(`document.querySelector('.orb__content').scrollTo({top:150,behavior:'instant'})`); await sleep(100);
  const savedScroll = await ev(`document.querySelector('.orb__content').scrollTop`);
  await key('ArrowRight'); await key('ArrowLeft');
  const restoredScroll = await ev(`({saved:${savedScroll},actual:document.querySelector('.orb__content').scrollTop,scrolled:document.querySelector('.orb__panel').classList.contains('orb__scrolled'),height:document.querySelector('.orb__content').scrollHeight,client:document.querySelector('.orb__content').clientHeight})`);
  check('Port switching restores reading position immediately', savedScroll>0 && restoredScroll.actual===savedScroll && restoredScroll.scrolled, restoredScroll);
  await key('Escape'); await wait(closed);
  await nav('deadlines'); await open(); await sleep(350);
  check('Single-port manifests disable meaningless previous/next controls', await ev(`document.querySelector('.orb__prev').disabled&&document.querySelector('.orb__next').disabled`));
  await key('Escape'); await wait(closed);
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await nav('mission'); await open(); await sleep(350); await key('Escape');
  await ev(`window.__orbitDock.destroy()`); await sleep(650);
  check('Teardown cancels pending close and restores readable content', await ev(`!document.querySelector('#orbitPanel')&&!document.querySelector('section.sec--page>.wrap').hidden&&document.body.style.overflow!=='hidden'`));
  await nav('mission'); await sleep(500);
  const getMetrics = async () => Object.fromEntries((await send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  // Wait for the transient intro/viewport layout changes before measuring idle.
  await wait(`!document.documentElement.classList.contains('orb-intro')&&document.getAnimations().filter(a=>a.effect.target.closest?.('#orbitLayer')).every(a=>a.effect.getKeyframes().every(k=>Object.keys(k).every(p=>['offset','computedOffset','easing','composite','transform','opacity'].includes(p))))`);
  const a = await getMetrics(); await sleep(2000); const b = await getMetrics();
  report.measurements.idle = { LayoutCount: b.LayoutCount - a.LayoutCount, LayoutDuration: b.LayoutDuration - a.LayoutDuration, seconds: 2 };
  check('Idle still has no recurring layout', report.measurements.idle.LayoutCount === 0, report.measurements.idle);
  check('Idle dock animations only change transform/opacity', await ev(`document.getAnimations().filter(a=>a.effect.target.closest?.('#orbitLayer')).every(a=>a.effect.getKeyframes().every(k=>Object.keys(k).every(p=>['offset','computedOffset','easing','composite','transform','opacity'].includes(p))))`));
  check('No uncaught exceptions in this isolated Chrome run', exceptions.length === 0, exceptions);
} catch (e) { report.failures.push(e.message); console.error(e); }
finally {
  await fs.writeFile(new URL('../reports/orbit/motion-refinements.json', import.meta.url), JSON.stringify(report, null, 2));
  ws.close(); await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`).catch(() => {});
}
console.log(JSON.stringify(report.measurements, null, 2));
if (report.failures.length) process.exitCode = 1;
