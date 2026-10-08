/* Runtime audit: every page, plus the client-side router chain.
   Collects console errors/warnings, uncaught exceptions, unhandled rejections,
   failed requests and HTTP >= 400, then checks that router navigation does not
   accumulate duplicate injected nodes.

   Each page gets a brand new tab and a hard per-page timeout. Every page runs
   full-canvas rAF loops, and a headless renderer that accumulates those across
   ten navigations eventually stops answering CDP — that is a harness fact, not
   a page defect, so it must not be mistaken for one.

   Usage: node tests/audit-runtime.mjs   (needs :8000 server + a debug port)  */
const port = process.env.ORBIT_CHROME_PORT || '9227';
const base = 'http://127.0.0.1:8000';
const PAGE_BUDGET = Number(process.env.AUDIT_PAGE_BUDGET || 45000);

const listTargets = async () => (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).filter((x) => x.type === 'page');
const closeTarget = async (tid) => fetch(`http://127.0.0.1:${port}/json/close/${tid}`).catch(() => {});
const newTarget = async () => (await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json());

const buckets = { exceptions: [], console: [], log: [], net: [], http: [] };
/* requestId -> url, so a failed request can be named instead of just coded */
const reqUrl = new Map();
const slice = () => Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.length]));
const drain = (mark) => Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.slice(mark[k])]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* one connection per page, torn down afterwards */
async function connect() {
  const t = await newTarget();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
  let id = 0; const pending = new Map();
  let down = null;
  const bail = (why) => { down = why; for (const p of pending.values()) p.reject(new Error(why)); pending.clear(); };
  ws.addEventListener('close', () => bail('target closed'));
  ws.addEventListener('error', () => bail('target error'));
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id) { const p = pending.get(m.id); if (!p) return; pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; }
    if (m.method === 'Runtime.exceptionThrown') buckets.exceptions.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'assert'].includes(m.params.type)) {
      buckets.console.push(m.params.type + ': ' + m.params.args.map((a) => a.value ?? a.description ?? a.type).join(' ').slice(0, 300));
    }
    if (m.method === 'Log.entryAdded') {
      const en = m.params.entry;
      if (en.level === 'error' || en.level === 'warning') buckets.log.push(`${en.source}/${en.level}: ${en.text}`.slice(0, 300));
    }
    if (m.method === 'Network.requestWillBeSent') reqUrl.set(m.params.requestId, m.params.request.url);
    if (m.method === 'Network.loadingFailed' && !m.params.canceled && m.params.errorText !== 'net::ERR_ABORTED') {
      const url = reqUrl.get(m.params.requestId) || '?';
      buckets.net.push(`${m.params.errorText} ${url.replace(base, '')} (${m.params.type || '?'})`);
    }
    if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) buckets.http.push(m.params.response.status + ' ' + m.params.response.url);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    if (down) return reject(new Error(down));
    const n = ++id;
    const timer = setTimeout(() => { if (pending.delete(n)) reject(new Error('CDP timeout: ' + method)); }, 15000);
    pending.set(n, { resolve: (v) => { clearTimeout(timer); resolve(v); }, reject: (e) => { clearTimeout(timer); reject(e); } });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const waitFor = async (expr, ms = 10000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await evaluate(expr)) return true; await sleep(120); } return false; };
  return { t, ws, send, evaluate, waitFor, close: () => { try { ws.close(); } catch (_) {} return closeTarget(t.id); } };
}

const EXERCISE = (c) => `(async()=>{
  const w=(x,y)=>{const n=document.elementFromPoint(x,y);if(n){n.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:x,clientY:y}));n.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));}};
  w(700,500);w(1100,400);w(300,600);
  return true})()`;

const STATE = `(()=>{const ids=[...document.querySelectorAll('[id]')].map(n=>n.id).filter(Boolean);
 return {planet:document.body.dataset.planet||null,orbReady:document.documentElement.classList.contains('orb-ready'),
  dlDocks:document.querySelectorAll('#dlDock').length,orbitLayers:document.querySelectorAll('#orbitLayer').length,
  orbitBodies:document.querySelectorAll('.orb__body').length,orbitStages:document.querySelectorAll('.orb__stage').length,
  cursorEls:document.querySelectorAll('#cursorDot,#cursorReticle,#cursorHud').length,
  dupIds:ids.filter((v,i)=>ids.indexOf(v)!==i),nodes:document.querySelectorAll('*').length,
  brokenImgs:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.currentSrc||i.src),
  emptyHrefs:[...document.querySelectorAll('a[href]')].filter(a=>a.getAttribute('href')==='').length,
  hashOnlyHrefs:[...document.querySelectorAll('a[href="#"]')].length,
  fontsReady:document.fonts?document.fonts.status:'n/a',
  bodyOverflowX:getComputedStyle(document.body).overflowX}})()`;

const report = { at: new Date().toISOString(), pages: [], router: null, notes: [], failures: [] };
const envNoise = (s) => /WebGL context|3D scene disabled|WebGLRenderer/i.test(s);

async function auditPage(page) {
  const url = page === 'index' ? `${base}/index.html` : `${base}/${page}.html`;
  const c = await connect();
  const mark = slice();
  let entry;
  try {
    await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Network.enable'); await c.send('Log.enable');
    await c.send('Network.setCacheDisabled', { cacheDisabled: true });
    await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await c.send('Page.navigate', { url });
    await c.waitFor(`document.readyState==='complete'`);
    await sleep(2400);
    for (const y of [520, 760, 980]) await c.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 700, y, deltaX: 0, deltaY: 420 });
    await sleep(500);
    await c.evaluate(EXERCISE(c));
    for (const key of ['Tab', 'ArrowRight', 'Escape', 'Home']) {
      const p = { key, code: key, windowsVirtualKeyCode: { Tab: 9, Home: 36, ArrowRight: 39, Escape: 27 }[key] };
      await c.send('Input.dispatchKeyEvent', { type: 'keyDown', ...p });
      await c.send('Input.dispatchKeyEvent', { type: 'keyUp', ...p });
      await sleep(140);
    }
    await sleep(700);
    const state = await c.evaluate(STATE);
    const d = drain(mark);
    const noise = [...d.console, ...d.log].filter(envNoise);
    const realConsole = d.console.filter((x) => (x.startsWith('error') || x.startsWith('assert')) && !envNoise(x));
    const realLog = d.log.filter((x) => x.includes('error') && !envNoise(x));
    entry = { page, state, exceptions: d.exceptions, net: d.net, http: d.http, console: realConsole, log: realLog, envNoise: noise.length };
    const bad = d.exceptions.length + d.net.length + d.http.length + realConsole.length + realLog.length
      + state.dupIds.length + state.brokenImgs.length;
    entry.clean = bad === 0;
    if (!entry.clean) report.failures.push(page + ': ' + JSON.stringify({ exceptions: d.exceptions, net: d.net, http: d.http, console: realConsole, log: realLog, dupIds: state.dupIds, brokenImgs: state.brokenImgs, hashOnlyHrefs: state.hashOnlyHrefs }));
    if (state.hashOnlyHrefs) report.notes.push(`${page}: ${state.hashOnlyHrefs} anchor(s) with href="#"`);
    if (state.bodyOverflowX !== 'visible' && state.planet !== 'sol') report.notes.push(`${page}: body overflow-x=${state.bodyOverflowX}`);
  } catch (err) {
    entry = { page, error: String(err), clean: false, timedOut: true };
    report.failures.push(`${page}: harness could not finish (${err})`);
  } finally {
    await c.close();
  }
  report.pages.push(entry);
  if (entry.state) {
    const s = entry.state;
    console.error(`${page.padEnd(17)} nodes=${String(s.nodes).padStart(5)} orb=${s.orbReady} bodies=${String(s.orbitBodies).padStart(2)} dupIds=${s.dupIds.length} dlDock=${s.dlDocks} layers=${s.orbitLayers} cursor=${s.cursorEls} fonts=${s.fontsReady} href#=${s.hashOnlyHrefs} badImgs=${s.brokenImgs.length} exc=${entry.exceptions.length} net=${entry.net.length} http=${entry.http.length} console=${entry.console.length} (noise ${entry.envNoise})`);
    for (const m of entry.console) console.error('    console> ' + m.slice(0, 200));
    for (const m of entry.log) console.error('    log> ' + m.slice(0, 200));
  } else {
    console.error(`${page.padEnd(17)} UNFINISHED: ${entry.error}`);
  }
  return entry;
}

const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const pages = ['index', 'mission', 'studies', 'college', 'applications', 'extracurriculars', 'schedule', 'meal', 'training', 'deadlines'];
for (const page of (only.length ? only : pages)) {
  /* The budget timer must be cancelled once the page finishes, otherwise it
     fires minutes later and files a bogus failure for a page that passed. */
  let budgetHit = false;
  let timer = 0;
  const budget = new Promise((resolve) => {
    timer = setTimeout(() => {
      budgetHit = true;
      report.failures.push(`${page}: exceeded the ${PAGE_BUDGET}ms page budget`);
      console.error(`${page.padEnd(17)} BUDGET EXCEEDED`);
      resolve();
    }, PAGE_BUDGET);
  });
  await Promise.race([auditPage(page), budget]);
  clearTimeout(timer);
  if (budgetHit) console.error(`${page.padEnd(17)} (no result: budget)`);
}

/* ---------- router chain in a dedicated tab ---------- */
if (!only.length || process.argv.includes('--router')) {
  const c = await connect();
  const mark = slice();
  try {
    await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Network.enable'); await c.send('Log.enable');
    await c.send('Network.setCacheDisabled', { cacheDisabled: true });
    await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await c.send('Page.navigate', { url: `${base}/index.html` });
    await c.waitFor(`document.readyState==='complete'`);
    await sleep(2200);
    const before = await c.evaluate(`document.querySelectorAll('*').length`);
    const chain = ['mission', 'studies', 'college', 'applications', 'extracurriculars', 'schedule', 'meal', 'training', 'deadlines', 'index'];
    const hops = [];
    for (const target of chain) {
      const href = target + '.html';
      const linkFound = await c.evaluate(`(()=>{const a=document.querySelector('a[href="${href}"]');if(!a)return false;a.click();return true})()`);
      const landed = await c.waitFor(`location.pathname.endsWith('${href}')`, 9000);
      await sleep(1500);
      hops.push({ target, linkFound, landed, planet: await c.evaluate(`document.body.dataset.planet||null`) });
    }
    const after = await c.evaluate(`(()=>{const ids=[...document.querySelectorAll('[id]')].map(n=>n.id).filter(Boolean);
      return {nodes:document.querySelectorAll('*').length,dupIds:ids.filter((v,i)=>ids.indexOf(v)!==i),
        dlDocks:document.querySelectorAll('#dlDock').length,orbitLayers:document.querySelectorAll('#orbitLayer').length,
        panels:document.querySelectorAll('.orb__panel').length,stages:document.querySelectorAll('.orb__stage').length,
        slots:document.querySelectorAll('.orb__slot').length,layers:document.querySelectorAll('.orb__layer').length,
        cursorEls:document.querySelectorAll('#cursorDot,#cursorReticle,#cursorHud').length}})()`);
    const d = drain(mark);
    report.router = { hops, before, after, growth: after.nodes - before, exceptions: d.exceptions, net: d.net, http: d.http, console: d.console.filter((x) => !envNoise(x)) };
    const missing = hops.filter((h) => !h.linkFound || !h.landed);
    if (missing.length) report.failures.push('router hop failed: ' + JSON.stringify(missing));
    if (after.dupIds.length) report.failures.push('router duplicate ids: ' + JSON.stringify(after.dupIds));
    for (const k of ['dlDocks', 'orbitLayers', 'panels', 'stages', 'layers']) if (after[k] > 1) report.failures.push(`router leaked ${after[k]} × ${k}`);
    if (d.exceptions.length) report.failures.push('router exceptions: ' + JSON.stringify(d.exceptions));
    console.error(`router: ${hops.filter((h) => h.linkFound && h.landed).length}/${hops.length} hops, node growth ${after.nodes - before}, dupIds ${after.dupIds.length}, dlDock ${after.dlDocks}, layers ${after.layers}`);
  } catch (err) {
    report.failures.push('router audit failed: ' + String(err));
    console.error('router: UNFINISHED ' + err);
  } finally { await c.close(); }
}

await import('node:fs').then((fs) => fs.mkdirSync(new URL('../reports/orbit/', import.meta.url), { recursive: true }));
await import('node:fs').then((fs) => fs.writeFileSync(new URL('../reports/orbit/audit-runtime.json', import.meta.url), JSON.stringify(report, null, 1)));
console.log(JSON.stringify({ failures: report.failures, notes: report.notes, pages: report.pages.map((p) => ({ page: p.page, clean: p.clean })) }, null, 1));
process.exit(report.failures.length ? 1 : 0);
