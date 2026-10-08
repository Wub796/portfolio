/* Evaluate one JS expression on a page over CDP and print the JSON result.
   Usage: node tests/eval-cdp.mjs <page> "<expression>"   (needs :8000 + debug port)
   Set ORBIT_CHROME_PORT to use the SwiftShader WebGL browser instead. */
const port = process.env.ORBIT_CHROME_PORT || '9227';
const base = 'http://127.0.0.1:8000';
const [page, expression] = process.argv.slice(2);
if (!page || !expression) { console.error('usage: node tests/eval-cdp.mjs <page> "<expr>"'); process.exit(2); }
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
});
try {
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `${base}/${page === 'index' ? 'index' : page}.html` });
  await sleep(3200);
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) { console.error('EXCEPTION: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)); process.exitCode = 1; }
  else console.log(JSON.stringify(r.result.value, null, 1));
} finally {
  try { ws.close(); } catch (_) {}
  await fetch(`http://127.0.0.1:${port}/json/close/${t.id}`).catch(() => {});
}
