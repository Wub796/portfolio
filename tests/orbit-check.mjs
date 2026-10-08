/* Run against an isolated Chrome --remote-debugging-port=9227 and http.server:8000.
   No npm modules: Node's built-in fetch/WebSocket drive real browser input. */
import fs from 'node:fs/promises';
const port = process.env.ORBIT_CHROME_PORT || '9227';
const output = new URL(port === '9227' ? '../reports/orbit/' : '../reports/orbit/webgl/', import.meta.url);
await fs.mkdir(output, { recursive: true });
const target = await (await fetch('http://127.0.0.1:' + port + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map(); const errors = [];
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id) { const p = pending.get(m.id); if (!p) return; pending.delete(m.id); if (m.error) p.reject(new Error(JSON.stringify(m.error))); else p.resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text + ': ' + (m.params.exceptionDetails.exception?.description || '')); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, { resolve, reject }); ws.send(JSON.stringify({ id: n, method, params })); });
const pause = ms => new Promise(r => setTimeout(r, ms));
const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const wait = async expression => { for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await pause(100); } throw new Error('Timeout: ' + expression); };
async function click(selector) { const pos = await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});if(!n)throw Error('missing ${selector}');const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`); await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...pos }); await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...pos, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...pos, button: 'left', clickCount: 1 }); }
async function key(key, code = key) { const codes = { Escape: 27, Enter: 13, Tab: 9, ArrowLeft: 37, ArrowRight: 39, Home: 36, End: 35, ArrowDown: 40, ArrowUp: 38 }; const params = { key, code, windowsVirtualKeyCode: codes[key] || 0, ...(key === 'Enter' ? { text: '\r' } : {}) }; await send('Input.dispatchKeyEvent', { type: 'keyDown', ...params }); await send('Input.dispatchKeyEvent', { type: 'keyUp', ...params }); }
async function shot(name) { const s = await send('Page.captureScreenshot', { format: 'png' }); await fs.writeFile(new URL(name + '.png', output), Buffer.from(s.data, 'base64')); }
await send('Page.enable'); await send('Page.bringToFront'); await send('Runtime.enable'); await send('Network.enable'); await send('Performance.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
// Capture the fully initialized stacked document just before the classic orbit script.
await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__orbAudit={tasks:[]};new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__orbAudit.tasks.push({start:e.startTime,duration:e.duration}))).observe({type:'longtask',buffered:true});document.addEventListener('bw:page-ready',()=>{const wrap=document.querySelector('section.sec--page>.wrap');if(wrap)window.__sourceAudit=[...wrap.querySelectorAll('table,ul,ol,.row,.kpi,.prog__card')].map(node=>({node,parent:node.parentNode,next:node.nextSibling}));});` });
const pages = ['mission','studies','college','applications','extracurriculars','schedule','meal','training','deadlines'];
const report = { at: new Date().toISOString(), environment: 'Headless Chrome, 1440×1000; real CDP pointer/keyboard input; debugging port ' + port, pages: [], failures: [] };
try {
 for (const page of pages) {
  const fromErrors = errors.length;
  await send('Page.navigate', { url: 'http://127.0.0.1:8000/' + page + '.html' });
  await wait(`document.documentElement.classList.contains('orb-ready')`); await pause(1800);
  const info = await evaluate(`(()=>{const a=[...document.querySelectorAll('.orb__body')];return {page:document.body.dataset.planet,count:a.length,nodes:document.querySelectorAll('#orbitLayer *').length,artNodes:a.map(b=>b.querySelector('svg').querySelectorAll('*').length),bounds:a.map(b=>{const r=b.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,name:b.getAttribute('aria-label')}}),scene:window.__scene3d||null,anchor:window.__getOrbitAnchor?.()||null}})()`);
  await evaluate(`window.__beforePayloads=[...document.querySelector('section.sec--page>.wrap').querySelectorAll('table,ul,ol,.dl-card,.row,.kpi,.prog__card')];window.__beforeOrder=window.__beforePayloads.map(n=>n.outerHTML);`);
  await shot(page + '-closed');
  info.opened = [];
  for (let i = 0; i < info.count; i++) {
   try {
    const pos = await evaluate(`(()=>{const r=document.querySelectorAll('.orb__body')[${i}].getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}})()`);
    if(pos.x<65||pos.y<65||pos.x+pos.w>1440||pos.y+pos.h>1000) throw new Error('port outside safe viewport');
    await click(`.orb__slot:nth-of-type(${i + 3}) .orb__body`);
    await wait(`window.__orbitDock.getState()?.openIndex===${i}&&window.__orbitDock.getState()?.phase==='open'`);
    const content = await evaluate(`(()=>{const p=document.querySelector('.orb__panel'),c=document.querySelector('.orb__content');return {title:document.querySelector('.orb__title').textContent,opacity:getComputedStyle(p).opacity,textLength:c.innerText.length,tables:c.querySelectorAll('table').length,lists:c.querySelectorAll('ul,ol').length,cards:c.querySelectorAll('.dl-card,.row,.prog__card').length,role:p.getAttribute('role'),modal:p.getAttribute('aria-modal'),expanded:document.querySelectorAll('.orb__body')[${i}].getAttribute('aria-expanded'),hash:location.hash,innerScroll:c.scrollHeight>c.clientHeight,blank:[...c.querySelectorAll('.reveal')].some(n=>!n.hidden&&getComputedStyle(n).opacity==='0')}})()`);
    if (content.textLength < 10 || content.opacity !== '1' || content.blank) throw new Error('Blank or hidden payload: ' + JSON.stringify(content));
    if (i < 3) { await pause(360); await shot(page + '-body-' + (i + 1)); }
    if (page === 'schedule' && i === 0) { await click('#modeSummer'); content.toggle = await evaluate(`document.querySelector('#tableSchool').hidden&&!document.querySelector('#tableSummer').hidden`); await click('#modeSchool'); }
    if (page === 'training' && i === 0) { await click('#modeHome'); content.toggle = await evaluate(`document.querySelector('#progGym').hidden&&!document.querySelector('#progHome').hidden`); await click('#modeGym'); }
    if (page === 'deadlines') {
     content.countdownBefore = await evaluate(`document.querySelector('.dl-card__count').textContent`); await pause(1400); content.countdownAfter = await evaluate(`document.querySelector('.dl-card__count').textContent`); if(content.countdownBefore===content.countdownAfter)throw Error('countdown did not tick');
     await key('/'); content.searchFocus = await evaluate(`document.activeElement.id==='dlSearch'`);
     await send('Input.insertText', { text: 'zzzz-no-program' }); await pause(800); content.emptyState = await evaluate(`!document.querySelector('#dlEmpty').hidden&&document.querySelectorAll('.dl-card:not(.is-filtered)').length===0`);
     await key('Escape'); content.searchCleared = await evaluate(`document.querySelector('#dlSearch').value===''&&!document.querySelector('.orb__panel').hidden`);
     await key('j'); await pause(800); content.jump = await evaluate(`document.querySelector('.dl-card.is-nav-target')?.classList.contains('is-open')`);
     const before = await evaluate(`document.querySelector('.dl-card.is-nav-target .dl-card__check').getAttribute('aria-pressed')`); await key('x'); content.applied = await evaluate(`document.querySelector('.dl-card.is-nav-target .dl-card__check').getAttribute('aria-pressed')!==${JSON.stringify(before)}`); await key('x');
     await key('k'); await pause(600); content.keyK=await evaluate(`!!document.querySelector('.dl-card.is-nav-target')`); await key('Home'); content.keyHome=await evaluate(`document.querySelector('.dl-card.is-nav-target')===document.querySelector('.dl-card')`); await key('End'); content.keyEnd=await evaluate(`document.querySelector('.dl-card.is-nav-target')===[...document.querySelectorAll('.dl-card')].at(-1)`); await key('ArrowUp'); await key('ArrowDown');
    }
    await key('Escape'); await wait(`window.__orbitDock.getState()?.openIndex===-1&&!document.documentElement.classList.contains('orb-open')`);
    content.focusRestored = await evaluate(`document.activeElement===document.querySelectorAll('.orb__body')[${i}]`);
    content.hashCleared = await evaluate(`location.hash===''`);
    info.opened.push(content);
   } catch (e) { report.failures.push(page + ' body ' + (i + 1) + ': ' + e.message); console.error(report.failures.at(-1)); break; }
  }
  info.identity = await evaluate(`window.__beforePayloads.every(n=>n.isConnected)&&window.__beforePayloads.every((n,i)=>document.querySelector('section.sec--page>.wrap').contains(n))`);
  info.sourceParentOrder = await evaluate(`window.__sourceAudit.every(o=>{let n=o.node.nextSibling;while(n?.nodeType===8)n=n.nextSibling;return o.node.parentNode===o.parent&&n===o.next})`);
  info.teardownSourceOrder = await evaluate(`(()=>{window.__orbitDock.destroy();const ok=window.__sourceAudit.every(o=>o.node.parentNode===o.parent&&o.node.nextSibling===o.next);window.__orbitDock.init();return ok})()`);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:1400,y:940}); await pause(1200);
  info.errors = errors.slice(fromErrors); info.longTasks = await evaluate('window.__orbAudit.tasks');
  const before = (await send('Performance.getMetrics')).metrics; await pause(2500); const after = (await send('Performance.getMetrics')).metrics;
  info.idleMetrics = Object.fromEntries(['LayoutCount','RecalcStyleCount','TaskDuration','LayoutDuration','ScriptDuration'].map(k=>[k,after.find(m=>m.name===k).value-before.find(m=>m.name===k).value]));
  await send('Page.bringToFront');
  info.frames = await evaluate(`new Promise(resolve=>{let ts=[],start;const timeout=setTimeout(()=>resolve({blocked:document.hidden?'hidden browser tab':'no frames'}),5000);function f(t){if(!start)start=t;ts.push(t);if(t-start<2000)requestAnimationFrame(f);else{clearTimeout(timeout);resolve({fps:(ts.length-1)*1000/(ts.at(-1)-ts[0]),frames:ts.length,maxFrameGap:Math.max(...ts.slice(1).map((v,i)=>v-ts[i]))})}}requestAnimationFrame(f)})`);
  info.orbitalMovement=await evaluate(`new Promise(r=>{const b=document.querySelector('.orb__body'),p=b.getBoundingClientRect();setTimeout(()=>{const q=b.getBoundingClientRect();r({distance:Math.hypot(q.x-p.x,q.y-p.y),animation:b.getAnimations().find(a=>a.constructor.name==='Animation')?.effect.getKeyframes().length})},600)})`);
  report.pages.push(info); console.log(page,info.count,'bodies',info.opened.length,'opened',info.idleMetrics,info.frames);
 }
} catch (e) { report.failures.push(e.message); console.error(e); }
await fs.writeFile(new URL('verification.json', output), JSON.stringify(report,null,2));
ws.close();
if (report.failures.length) process.exitCode=1;
