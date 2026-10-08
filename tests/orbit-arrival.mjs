/* Real WebGL camera-arrival test. Server :8000, isolated SwiftShader Chrome :9228. */
import fs from 'node:fs/promises';
const port = process.env.ORBIT_CHROME_PORT || '9228';
const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {method:'PUT'})).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
let id=0; const pending=new Map(); let pausedScene=null;
ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.method==='Fetch.requestPaused'){pausedScene=m.params.requestId;return;}if(!pending.has(m.id))return;const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;const timer=setTimeout(()=>{pending.delete(n);reject(Error('CDP timeout '+method));},20000);pending.set(n,{resolve,reject,timer});ws.send(JSON.stringify({id:n,method,params}));});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
const wait=async expression=>{for(let i=0;i<160;i++){if(await ev(expression))return;await sleep(60);}throw Error('Timeout '+expression);};
const report={checks:[],failures:[],flights:[]};
const check=(name,pass,detail)=>{report.checks.push({name,pass:!!pass,detail});if(!pass)report.failures.push(name);console.log(pass?'PASS':'FAIL',name);};
const nav=async page=>{const url=`http://127.0.0.1:8000/${page}.html?arrival=${Date.now()}`;await send('Page.navigate',{url});await wait(`location.href===${JSON.stringify(url)}&&document.readyState==='complete'&&window.__scene3d?.ok===true&&document.body.dataset.planet===${JSON.stringify(page === 'index' ? 'sol' : page)}`);};
const click=async selector=>{const p=await ev(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);await send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});};
const sample=()=>ev(`(()=>{const l=document.querySelector('#orbitLayer'),a=window.__getOrbitAnchor?.();return {planet:document.body.dataset.planet,anchor:a,layer:!!l,inert:l?.inert,opacity:l?Number(getComputedStyle(l).opacity):0,launch:document.documentElement.classList.contains('orb-intro'),scale:l?.querySelector('.orb__slot')?.style.transform,scene:window.__scene3d}})()`);
const flight=async page=>{
 await click(`.nav__links a[href="${page}.html"]`);
 const rows=[];const start=Date.now();
 while(Date.now()-start<9500){const s=await sample();rows.push(s);if(s.planet===page&&s.layer&&!s.inert&&s.opacity>.99&&s.scene.arrival===1)break;await sleep(60);}
 report.flights.push({page,rows});
 const current=rows.filter(r=>r.planet===page&&r.layer),shown=current.filter(r=>r.opacity>.01);
 check(page+' flight never reveals ships ahead of their own planet',shown.length>0&&shown.every(r=>r.anchor?.slug===page&&r.anchor?.visible===true),{samples:current.length,shown:shown.length});
 check(page+' flight holds ships back during the camera approach',current.some(r=>r.inert&&r.opacity===0));
 check(page+' arrival uses existing orbits, not launch keyframes',current.every(r=>!r.launch));
 check(page+' flight settles and exposes controls',current.at(-1)?.opacity>.99&&current.at(-1)?.inert===false&&current.at(-1)?.scene.arrival===1);
};
try{
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Page.bringToFront');
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 // Observe the dock commit before the deferred scene module executes: no belt
 // may paint in that window, including a cold cache / slow CDN startup.
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`document.addEventListener('bw:orbit',()=>{if(!window.__getOrbitAnchor&&document.querySelector('#orbitLayer')){const l=document.querySelector('#orbitLayer');window.__preSceneDock={inert:l.inert,opacity:getComputedStyle(l).opacity};}});`});
 await nav('mission');await wait(`!document.querySelector('#orbitLayer').inert`);
 check('Initial dock commit stays hidden until the scene exists',await ev(`window.__preSceneDock?.inert===true&&window.__preSceneDock?.opacity==='0'`));
 await flight('studies');await flight('college');await flight('mission');
 await click('.nav__links a[href="index.html"]');await wait(`document.body.dataset.planet==='sol'&&!document.querySelector('#orbitLayer')`);await sleep(4000);
 await flight('mission');
 // Cold Sol has no dock script: the router lazy-loads it on the first click.
 await nav('index');await flight('studies');
 const png=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(new URL('../reports/orbit/diag/arrival-settled.png',import.meta.url),Buffer.from(png.data,'base64'));
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
 await nav('studies');await wait(`!document.querySelector('#orbitLayer').inert`);
 // Mobile navigation uses the real Ground Control link after scrolling there.
 await ev(`document.querySelector('.foot__nav a.fn__next').scrollIntoView({behavior:'instant'})`);await sleep(400);
 await click('.foot__nav a.fn__next');await wait(`document.body.dataset.planet==='college'`);
 const mobile=[];const start=Date.now();while(Date.now()-start<9500){mobile.push(await sample());if(mobile.at(-1).opacity>.99&&!mobile.at(-1).inert)break;await sleep(60);}
 check('Mobile arrival also waits for the planet',mobile.some(r=>r.inert)&&mobile.filter(r=>r.opacity>.01).every(r=>r.anchor?.visible&&r.anchor.slug==='college')&&mobile.at(-1).opacity>.99);
 // Delay the real scene module past the old fallback timeout. It must not
 // show a fake centred belt while the deferred module is still downloading.
 await send('Network.setCacheDisabled',{cacheDisabled:true});
 await send('Fetch.enable',{patterns:[{urlPattern:'*/js/scene.js*',requestStage:'Request'}]});
 await send('Page.navigate',{url:'http://127.0.0.1:8000/mission.html?slow-scene='+Date.now()});
 for(let i=0;i<100&&!pausedScene;i++)await sleep(40);
 if(!pausedScene)throw Error('Scene request was not intercepted');
 await wait(`window.__orbitDock?.getState()?.planet==='mission'`);await sleep(2200);
 check('Slow scene loading never exposes a viewport-centred fallback belt',await ev(`document.querySelector('#orbitLayer').inert&&getComputedStyle(document.querySelector('#orbitLayer')).opacity==='0'`));
 await send('Fetch.continueRequest',{requestId:pausedScene});await send('Fetch.disable');pausedScene=null;
 await wait(`window.__scene3d?.ok===true&&!document.querySelector('#orbitLayer').inert`);
 check('Delayed real scene eventually reveals reachable spacecraft',await ev(`window.__getOrbitAnchor().visible&&!document.querySelector('#orbitLayer').inert`));
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await nav('mission');await wait(`!document.querySelector('#orbitLayer').inert`);await click('.nav__links a[href="studies.html"]');await wait(`document.body.dataset.planet==='studies'&&document.querySelector('#orbitLayer')?.inert===false`);
 check('Reduced-motion navigation renders the destination planet immediately',await ev(`window.__getOrbitAnchor().slug==='studies'&&window.__getOrbitAnchor().visible&&window.__scene3d.arrival===1`));
}catch(e){report.failures.push(e.message);console.error(e);}
finally{await fs.writeFile(new URL('../reports/orbit/arrival.json',import.meta.url),JSON.stringify(report,null,2));ws.close();await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`).catch(()=>{});}
if(report.failures.length)process.exitCode=1;
