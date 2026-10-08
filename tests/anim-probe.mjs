/* Ad-hoc animation probe for the orbital dock.
   Answers these questions with measurement instead of reading CSS by eye:
     1. Which .orb__* part animations actually apply (vs. being overridden by
        the `animation:none!important` steady-flight kill rule)?
     2. Does clip-path interpolate between polygon() and inset()?  This is the
        root cause of the old close snap; the panel's own fold now targets a
        polygon and is asserted mid-flight below.
     3. Does the resting close actually interpolate, and does the scrim come
        down with it instead of lingering behind a folded panel?
     4. Below 760px, does the panel slide as a bottom sheet?
   Usage: node tests/anim-probe.mjs [page]   (needs :8000 + debug port)  */
const port = process.env.ORBIT_CHROME_PORT || '9227';
const base = 'http://127.0.0.1:8000';
const page = process.argv[2] || 'mission';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
let id = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
const send = (method, params = {}) => new Promise((resolve, reject) => {
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

try {
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `${base}/${page}.html` });
  await sleep(3200);

  const anims = await evaluate(`(()=>{
    const parts=['.orb__machine','.orb__moon','.orb__ring','.orb__dish','.orb__wing','.orb__arm','.orb__leg','.orb__gimbal','.orb__cube','.orb__quadrant','.orb__tug','.orb__cargo','.orb__beacon','.orb__art','.orb__drift','.orb__debris','.orb__meteor','.orb__plate'];
    const out={};
    for(const sel of parts){
      const n=document.querySelector(sel);
      if(!n){out[sel]='absent';continue;}
      const s=getComputedStyle(n);
      out[sel]={name:s.animationName,dur:s.animationDuration,play:s.animationPlayState,willChange:s.willChange};
    }
    return out;})()`);
  console.log('--- computed animation-name per part ---');
  for (const [k, v] of Object.entries(anims)) console.log(k.padEnd(16), typeof v === 'string' ? v : JSON.stringify(v));

  const inv = await evaluate(`(()=>{
    const a=document.getAnimations();
    const by={};let nonComp=0;
    for(const x of a){
      const name=x.animationName||'(waapi)';
      const kf=(x.effect&&x.effect.getKeyframes)?x.effect.getKeyframes():[];
      const props=[...new Set(kf.flatMap(f=>Object.keys(f)).filter(p=>!['offset','easing','composite','computedOffset'].includes(p)))];
      const key=name+' ['+(x.effect&&x.effect.target&&x.effect.target.className?String(x.effect.target.className).slice(0,26):'?')+'] '+props.join(',');
      by[key]=(by[key]||0)+1;
      if(props.some(p=>!['transform','opacity'].includes(p)))nonComp++;
    }
    return {total:a.length,nonComposited:nonComp,by};})()`);
  console.log('--- running animations:', inv.total, '| entries animating a non-composited property:', inv.nonComposited, '---');
  for (const [k, v] of Object.entries(inv.by)) console.log('  ', v + '×', k);

  const clip = await evaluate(`(()=>{
    const d=document.createElement('div');
    d.style.cssText='position:fixed;left:-500px;top:0;width:200px;height:200px;clip-path:polygon(0 0,100% 0,100% 100%,0 100%)';
    document.body.appendChild(d);
    const a=d.animate([{clipPath:'polygon(0 0,100% 0,100% 100%,0 100%)'},{clipPath:'inset(48% 44%)'}],{duration:200,fill:'both'});
    a.pause(); a.currentTime=100;
    const mid=getComputedStyle(d).clipPath; a.cancel(); d.remove();
    const e=document.createElement('div');
    e.style.cssText='position:fixed;left:-500px;top:0;width:200px;height:200px;clip-path:polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)';
    document.body.appendChild(e);
    const b=e.animate([{clipPath:'polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)'},{clipPath:'polygon(48% 46%,52% 46%,52% 54%,48% 54%,48% 54%,48% 46%)'}],{duration:200,fill:'both'});
    b.pause(); b.currentTime=100;
    const mid2=getComputedStyle(e).clipPath; b.cancel(); e.remove();
    return {polygonToInset:mid, polygonToPolygon:mid2};})()`);
  console.log('--- clip-path interpolation at 50% ---');
  console.log('  polygon -> inset   :', clip.polygonToInset);
  console.log('  polygon -> polygon :', clip.polygonToPolygon);

  /* Does a real open/close cycle animate anything but transform/opacity, and
     does the close interpolation actually move instead of snapping? */
  /* Headless frame pacing starts a CSS animation late and unevenly, so every
     mid-flight sample is taken by pausing the real animation and seeking it.
     That measures the interpolation itself rather than the compositor's
     scheduling. */
  const cycle = await evaluate(`(async()=>{
    const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
    const panel=document.getElementById('orbitPanel');
    const veil=document.querySelector('.orb__void');
    const btn=document.querySelector('.orb__body'); if(!btn) return 'no body';
    const clipOf=()=>getComputedStyle(panel).clipPath;
    const seek=async(frac)=>{const a=document.getAnimations().find(x=>x.effect&&x.effect.target===panel);if(!a)return null;const d=a.effect.getTiming().duration;const running=a.playState==='running';a.pause();a.currentTime=d*frac;const v=clipOf();if(running)a.play();return v;};
    const waitOwn=async()=>{for(let i=0;i<40;i++){if(document.getAnimations().some(x=>x.effect&&x.effect.target===panel))return true;await sleep(60);}return false;};
    btn.click(); await sleep(120);
    const midOpen=document.getAnimations().filter(a=>{const kf=a.effect.getKeyframes();const props=[...new Set(kf.flatMap(f=>Object.keys(f)))].filter(p=>!['offset','easing','composite','computedOffset'].includes(p));return props.some(p=>!['transform','opacity'].includes(p));}).map(a=>a.animationName+' '+[...new Set(a.effect.getKeyframes().flatMap(f=>Object.keys(f)))].join(','));
    await sleep(900);
    const panelOpen=!panel.hidden, openClip=clipOf(), veilOpen=!veil.hidden;
    document.querySelector('.orb__close').click();
    const midCloseState=panel.dataset.state;
    const hasFold=await waitOwn();
    const midCloseClip=(await seek(.5))||clipOf();
    const lateCloseClip=(await seek(.9))||clipOf();
    await sleep(800);
    return {panelOpen, veilOpen, openClip, midOpenNonComp:[...new Set(midOpen)], midCloseState, hasFold, midCloseClip, lateCloseClip, closed:panel.hidden, veilClosed:veil.hidden, retained:document.getAnimations().length};})()`);
  console.log('--- open/close cycle (desktop 1440x1000) ---');
  console.log(JSON.stringify(cycle, null, 1));
  const fold = [
    ['panel runs a real close animation', cycle.hasFold === true],
    ['open clip-path is the resting polygon', cycle.openClip.startsWith('polygon(')],
    ['mid-close clip-path is a polygon (interpolating, not snapped)', cycle.midCloseClip.startsWith('polygon(')],
    ['mid-close clip-path is not the fold end value', !/^inset\(/.test(cycle.midCloseClip)],
    ['clip-path advances between 50% and 90% of the fold', cycle.midCloseClip !== cycle.lateCloseClip],
    ['the fold ends somewhere new', cycle.lateCloseClip !== cycle.openClip],
    ['panel and scrim both closed', cycle.closed === true && cycle.veilClosed === true],
  ];
  fold.forEach(([label, ok]) => console.log('   ', ok ? 'PASS' : 'FAIL', label));

  /* Below 760px the panel is a bottom sheet: it must slide, not bloom out of
     the centre of the viewport. Headless frame pacing is uneven, so the sheet
     is sampled continuously and judged on its trajectory rather than on one
     wall-clock instant. Two widths: 600x900 inside the sheet band, and 390x844
     where the open animation is intentionally disabled. */
  /* Sampling the sheet from Node between separate CDP evaluates: reading
     computed styles inside one long-running page expression returns stale
     animation values in this headless build, while discrete evaluates see the
     live value. Each sample is one round trip, so pacing is honest. */
  const PANEL_EXPR = `(()=>{const p=document.getElementById('orbitPanel');const cs=getComputedStyle(p);const v=cs.transform;let ty=0;if(v!=='none'){const m=v.match(/matrix(?:3d)?\\((.+)\\)/);if(m){ty=Math.round(Number(m[1].split(',')[5])||0);}}
    return {state:p.dataset.state,name:cs.animationName,ty:ty,op:Number(cs.opacity),hidden:p.hidden,clip:cs.clipPath};})()`;

  const collect = async (ms) => {
    const out = [];
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { out.push(await evaluate(PANEL_EXPR)); await sleep(30); }
    return out;
  };

  /* A sampled series, summarised for reporting. */
  const summarise = (rows) => {
    const tys = rows.map((r) => r.ty);
    const names = [...new Set(rows.map((r) => r.name).filter((n) => n && n !== 'none'))];
    return {
      samples: rows.length,
      names: names,
      first: tys[0] === undefined ? null : tys[0],
      last: tys[tys.length - 1] === undefined ? null : tys[tys.length - 1],
      min: tys.length ? Math.min(...tys) : null,
      max: tys.length ? Math.max(...tys) : null,
      endIsExtremeMax: tys.length > 1 && Math.max(...tys) === tys[tys.length - 1],
    };
  };

  const sheetCycle = async (width, height) => {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: true });
    await send('Page.navigate', { url: `${base}/${page}.html` });
    await sleep(3200);
    await evaluate(`document.querySelector('.orb__body').click()`);
    const open = await collect(width > 480 ? 2600 : 1200);
    await sleep(600);
    const settled = await evaluate(PANEL_EXPR);
    await evaluate(`document.querySelector('.orb__close').click()`);
    const close = await collect(1300);
    await sleep(700);
    const after = await evaluate(`(()=>{const p=document.getElementById('orbitPanel');return {closed:p.hidden,state:p.dataset.state};})()`);
    return { open, close, settled, after };
  };

  const sheetWide = await sheetCycle(600, 900);
  const wideOpen = summarise(sheetWide.open);
  const wideClose = summarise(sheetWide.close);
  console.log('--- open/close cycle (mobile 600x900, sheet band) ---');
  console.log(JSON.stringify({ open: wideOpen, close: wideClose, settled: sheetWide.settled, after: sheetWide.after }, null, 1));
  const wideChecks = [
    ['open uses the sheet keyframes', wideOpen.names.includes('orb-sheet-in')],
    ['sheet travels the full sheet height up from below the fold', wideOpen.max > 60],
    ['sheet comes to rest at translateY 0', wideOpen.last === 0 && sheetWide.settled.ty === 0],
    ['sheet leaves no desktop clip-path behind', sheetWide.settled.clip === 'none'],
    ['close uses the sheet keyframes', wideClose.names.includes('orb-sheet-out')],
    ['close starts from translateY 0', wideClose.first === 0],
    ['close slides the sheet away again', wideClose.max > 60],
    ['mobile panel closes', sheetWide.after.closed === true],
  ];
  wideChecks.forEach(([label, ok]) => console.log('   ', ok ? 'PASS' : 'FAIL', label));

  const sheetNarrow = await sheetCycle(390, 844);
  const narrowOpen = summarise(sheetNarrow.open);
  const narrowClose = summarise(sheetNarrow.close);
  console.log('--- open/close cycle (mobile 390x844, <=480) ---');
  console.log(JSON.stringify({ open: narrowOpen, close: narrowClose, settled: sheetNarrow.settled, after: sheetNarrow.after }, null, 1));
  const narrowChecks = [
    ['no open animation runs at <=480px (by design)', !narrowOpen.names.includes('orb-sheet-in') && narrowOpen.max === 0],
    ['panel still opens and rests at translateY 0', sheetNarrow.settled.state === 'open' && sheetNarrow.settled.ty === 0],
    ['close still slides the sheet away', narrowClose.names.includes('orb-sheet-out') && narrowClose.max > 60],
    ['narrow panel closes', sheetNarrow.after.closed === true],
  ];
  narrowChecks.forEach(([label, ok]) => console.log('   ', ok ? 'PASS' : 'FAIL', label));
} finally {
  try { ws.close(); } catch (_) {}
  await fetch(`http://127.0.0.1:${port}/json/close/${t.id}`).catch(() => {});
}
