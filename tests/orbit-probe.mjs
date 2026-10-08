/* Ad-hoc probe: studies focus chain after Home + Tab. */
const port = process.env.ORBIT_CHROME_PORT || '9227';
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const target = targets.find(t => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let id = 0, pending = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async x => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result?.result?.value;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const key = async k => { const p = { key: k, code: k, windowsVirtualKeyCode: { Home: 36, Tab: 9, Enter: 13 }[k] || 0, ...(k === 'Enter' ? { text: '\r' } : {}) }; await send('Input.dispatchKeyEvent', { type: 'keyDown', ...p }); await send('Input.dispatchKeyEvent', { type: 'keyUp', ...p }); };
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://127.0.0.1:8000/studies.html?probe=' + Date.now() });
for (let i = 0; i < 60; i++) { if (await ev(`document.documentElement.classList.contains('orb-ready')`)) break; await sleep(150); }
await sleep(1700);
console.log('state', JSON.stringify(await ev(`(()=>{const bs=[...document.querySelectorAll('.orb__body')];return{tabs:bs.map(b=>b.tabIndex),vis:bs.map(b=>getComputedStyle(b).visibility),offstage:document.getElementById('orbitLayer').className,err:window.__orbitDock.lastError||null,phases:(window.__orbitDock.getState()||{})}})()`)));
await key('Home'); console.log('afterHome', await ev(`document.activeElement.className`));
await key('Tab'); console.log('afterTab', await ev(`document.activeElement.className + ' | body?'+document.activeElement.classList.contains('orb__body')`));
console.log('visNow', JSON.stringify(await ev(`[...document.querySelectorAll('.orb__body')].map(b=>b.tabIndex)`)));
console.log('phaseBeforeEnter', await ev(`window.__orbitDock.getState().phase`));
await key('Enter'); await sleep(1500);
console.log('openIndex', await ev(`window.__orbitDock.getState().openIndex`), 'phase', await ev(`window.__orbitDock.getState().phase`));
await ev(`document.querySelector('.orb__body').click()`); await sleep(1200);
console.log('afterProgClick openIndex', await ev(`window.__orbitDock.getState().openIndex`), 'phase', await ev(`window.__orbitDock.getState().phase`));
await ev(`(()=>{let fired=0;document.querySelector('.orb__body').addEventListener('click',()=>fired++);window.__fired=()=>fired;return 0})()`);
await key('Enter'); await sleep(400); console.log('enterClicksFired', await ev(`window.__fired()`));
ws.close();
