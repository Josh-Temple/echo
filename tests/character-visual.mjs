// Deterministic comparison harness. It loads the actual character and environment
// from ECHO_ROOT without changing game rules or the production camera.
import {createRequire} from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(process.env.ECHO_ROOT||process.cwd());
const out=path.resolve(process.env.ECHO_QA_DIR||'/tmp/echo-character-qa');
fs.mkdirSync(out,{recursive:true});
const html=`<!doctype html><meta charset="utf-8"><style>*{margin:0}canvas{display:block}</style><script type="module">
import * as T from '/vendor/three-0.169.0.module.min.js';
import {createEnvironment} from '/echo3d/environment.js';
import {createCharacter} from '/echo3d/character.js';
import {createState,step} from '/echo3d/simulation.js';
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.enabled=true;
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(1);document.body.append(renderer.domElement);
const params=new URLSearchParams(location.search);
const factory=params.get('mode')==='legacy-toon'?(await import('/echo3d/character-legacy.js')).createCharacter:createCharacter;
const scene=new T.Scene(),env=createEnvironment(renderer,scene),character=factory(scene,{toon:params.get('mode')==='legacy-toon',bands:Number(params.get('bands')),outline:params.get('outline')!=='0'}),camera=new T.PerspectiveCamera(34,innerWidth/innerHeight,.1,180);env.quality('low');
let state=createState();
function pose(kind){state=createState();character.update(state);if(kind==='walk'){for(let i=0;i<155;i++){step(state,{right:true});character.update(state);}}if(kind==='jump'){for(let i=0;i<120;i++){step(state,{right:true});character.update(state);}for(let i=0;i<28;i++){step(state,{right:true,jump:i===0});character.update(state);}}return state;}
function render(kind='idle',view='game'){pose(kind);character.update(state);if(view==='close'){camera.fov=28;camera.position.set(state.x+.1,state.y+1.48,6.1);camera.lookAt(state.x,state.y+.98,1.1);}else{camera.fov=34;camera.position.set(state.x+3.6,5.3,22);camera.lookAt(state.x+3.6,2.3,-1);}camera.updateProjectionMatrix();env.update(state,camera.position.x);renderer.info.autoReset=false;renderer.info.reset();renderer.render(scene,camera);return {state,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,jsHeapBytes:performance.memory?.usedJSHeapSize??null};}
function animate(milliseconds=6500){
 state=createState();character.update(state);let started=0,last=0,acc=0,frames=0;
 return new Promise(resolve=>{function frame(now){
  if(!started){started=now;last=now;}const elapsed=now-started;acc+=Math.min(.10,(now-last)/1000);last=now;
  const input={right:elapsed<3700,left:elapsed>=3700&&elapsed<5300,jump:elapsed>=1550&&elapsed<1700};
  while(acc>=1/120){step(state,input);character.update(state);acc-=1/120;}
  camera.fov=28;camera.position.set(state.x+.1,state.y+1.48,6.1);camera.lookAt(state.x,state.y+.98,1.1);camera.updateProjectionMatrix();
  env.update(state,camera.position.x);renderer.render(scene,camera);frames++;
  if(elapsed>=milliseconds)resolve({fps:frames/(elapsed/1000),frames,seconds:elapsed/1000,glError:renderer.getContext().getError()});else requestAnimationFrame(frame);
 }requestAnimationFrame(frame);});
}
window.qa={render,animate};render();
</script>`;
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');if(url.pathname==='/__character'){res.setHeader('content-type','text/html');return res.end(html);}const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}try{res.setHeader('content-type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.ttf')?'font/ttf':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[];const page=await browser.newPage({viewport:{width:960,height:600},deviceScaleFactor:1});
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const started=Date.now();await page.goto(base+'/__character');await page.waitForFunction(()=>window.qa);const measurements={startupMilliseconds:Date.now()-started};
for(const pose of ['idle','walk','jump'])for(const view of ['game','close']){measurements[`${pose}-${view}`]=await page.evaluate(({pose,view})=>window.qa.render(pose,view),{pose,view});await page.screenshot({path:path.join(out,`${pose}-${view}.png`)});}
if(process.env.ECHO_QA_BANDS==='1')for(const [suffix,query] of [['two-bands','?bands=2'],['four-bands','?bands=4'],['no-outline','?outline=0'],['legacy-toon','?mode=legacy-toon']]){
 await page.goto(base+'/__character'+query);await page.waitForFunction(()=>window.qa);await page.evaluate(()=>window.qa.render('idle','close'));await page.screenshot({path:path.join(out,suffix+'.png')});
}
for(const [width,height] of [[390,844],[360,800],[844,390]]){await page.setViewportSize({width,height});await page.goto(base+'/webgl-study.html?debug=1');await page.waitForFunction(()=>window.__echo&&!document.querySelector('#start').disabled,{timeout:60000});await page.locator('#start').click();await page.screenshot({path:path.join(out,`game-${width}x${height}.png`)});}
const videoContext=await browser.newContext({viewport:{width:960,height:600},recordVideo:{dir:out,size:{width:960,height:600}}});
const clip=await videoContext.newPage();clip.on('pageerror',e=>errors.push(e.message));clip.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await clip.goto(base+'/__character');await clip.waitForFunction(()=>window.qa);measurements.motion=await clip.evaluate(()=>window.qa.animate());
const video=clip.video();await videoContext.close();const recorded=await video.path();fs.renameSync(recorded,path.join(out,'motion.webm'));
fs.writeFileSync(path.join(out,'measurements.json'),JSON.stringify({root,measurements,errors},null,2));
await browser.close();await new Promise(r=>server.close(r));if(errors.length)throw new Error(errors.join('\n'));
