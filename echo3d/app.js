import * as T from '../vendor/three-0.169.0.module.min.js';
import {createState,createClock} from './simulation.js';
import {createEnvironment} from './environment.js';
import {createCharacter} from './character.js';
import {createCharacter as createLegacyCharacter} from './character-legacy.js';
import {createAudio} from './audio.js';

const $=selector=>document.querySelector(selector),stage=$('#stage'),game=$('#game');
const query=new URLSearchParams(location.search),debug=query.has('debug');
const legacy=debug&&query.get('character')==='legacy',closeView=debug&&query.get('view')==='close';
const panels={intro:$('#intro'),paused:$('#menu'),ending:$('#ending'),error:$('#fallback')};
const keys=new Set(),pointers=new Map(),queuedActions=new Set();
const audio=createAudio(),clock=createClock();
let state=createState(),mode='intro',renderer,scene,camera,environment,character,dirty=true,lost=false,lastTime=0;
let settings={quality:'auto',sound:true};try{const saved=JSON.parse(localStorage.getItem('echo3d-settings')||'{}');if(['auto','high','medium','low'].includes(saved.quality))settings.quality=saved.quality;if(typeof saved.sound==='boolean')settings.sound=saved.sound;}catch{}
let tier=settings.quality==='auto'?(matchMedia('(pointer:coarse)').matches?'medium':'high'):settings.quality;
let perfSeconds=0,perfFrames=0,autoCooldown=0;
const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
function save(){try{localStorage.setItem('echo3d-settings',JSON.stringify(settings));}catch{}}
function clearInput(){keys.clear();pointers.clear();queuedActions.clear();document.querySelectorAll('[data-action]').forEach(b=>b.classList.remove('pressed'));}
function setMode(next){mode=next;clearInput();clock.reset();for(const [name,panel]of Object.entries(panels))panel.hidden=name!==next;game.classList.toggle('panel-open',next!=='playing');dirty=true;if(next==='playing'){audio.activate();$('#pause').focus({preventScroll:true});}else{audio.pause();const focus=next==='paused'?'#resume':next==='ending'?'#replay':next==='intro'?'#start':'#reload';$(focus).focus({preventScroll:true});}}
function error(message){$('#error-text').textContent=message;setMode('error');}
function notify(message){$('#notice').textContent=message;clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('#notice').textContent='',3500);}
function resize(){if(!renderer)return;const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setPixelRatio(Math.min(devicePixelRatio||1,tier==='high'?1.6:tier==='medium'?1.25:1));renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w/h<.95?43:34;camera.updateProjectionMatrix();dirty=true;}
function setQuality(value){tier=value;environment.quality(tier);resize();}
function inspectCamera(){if(!closeView)return;camera.fov=28;camera.position.set(state.x+.1,state.y+1.48,6.1);camera.lookAt(state.x,state.y+.98,1.1);camera.updateProjectionMatrix();}
function restart(){state=createState();audio.reset();camera.position.set(6,5.3,22);$('#hint').style.opacity='1';$('#notice').textContent='';setMode('playing');}
function input(){const held=new Set([...keys,...pointers.values()]);return {left:held.has('left'),right:held.has('right'),jump:held.has('jump')||queuedActions.has('jump'),use:held.has('use')||queuedActions.has('use')};}
const codes={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'jump',KeyE:'use'};
window.addEventListener('keydown',e=>{
 if(e.code==='Escape'&&!e.repeat){if(mode==='playing')setMode('paused');else if(mode==='paused')setMode('playing');return;}
 if(e.code==='Tab'&&mode!=='playing'){const panel=Object.values(panels).find(p=>!p.hidden),items=[...(panel?.querySelectorAll('button:not(:disabled),a,select,input')||[])];if(items.length){const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
 const action=codes[e.code];if(action&&mode==='playing'){e.preventDefault();if(!keys.has(action)&&['jump','use'].includes(action))queuedActions.add(action);keys.add(action);}
});
window.addEventListener('keyup',e=>{const action=codes[e.code];if(action){keys.delete(action);if(mode==='playing')e.preventDefault();}});
window.addEventListener('blur',()=>{clearInput();if(mode==='playing')setMode('paused');});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing')setMode('paused');});
document.querySelectorAll('[data-action]').forEach(button=>{button.addEventListener('pointerdown',e=>{if(mode!=='playing')return;e.preventDefault();button.setPointerCapture(e.pointerId);const action=button.dataset.action;pointers.set(e.pointerId,action);if(['jump','use'].includes(action))queuedActions.add(action);button.classList.add('pressed');});for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,e=>{pointers.delete(e.pointerId);button.classList.toggle('pressed',[...pointers.values()].includes(button.dataset.action));});});
$('#start').onclick=()=>setMode('playing');$('#pause').onclick=()=>setMode('paused');$('#resume').onclick=()=>setMode('playing');$('#restart').onclick=restart;$('#replay').onclick=restart;$('#reload').onclick=()=>location.reload();
$('#quality').value=settings.quality;$('#quality').onchange=e=>{settings.quality=e.target.value;setQuality(settings.quality==='auto'?'medium':settings.quality);autoCooldown=state.time+10;save();};
$('#sound').checked=settings.sound;audio.setEnabled(settings.sound);$('#sound').onchange=e=>{settings.sound=e.target.checked;audio.setEnabled(settings.sound);save();};
if(!document.fullscreenEnabled){$('#fullscreen').hidden=true;}else $('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await game.requestFullscreen();}catch{notify('このブラウザでは全画面を開始できません');}};

async function boot(){
 try{
  renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.enabled=true;
  stage.prepend(renderer.domElement);scene=new T.Scene();camera=new T.PerspectiveCamera(34,1,.1,180);camera.position.set(6,5.3,22);
  environment=createEnvironment(renderer,scene);character=legacy?createLegacyCharacter(scene):createCharacter(scene,{bands:Number(query.get('bands')),outline:query.get('outline')!=='0'});setQuality(tier);new ResizeObserver(resize).observe(stage);
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;error('描画用の接続が切れました。復帰を待っています。');});
  renderer.domElement.addEventListener('webglcontextrestored',()=>{try{lost=false;environment.rebuildEnvironment();setQuality(tier);setMode('paused');notify('描画が復帰しました');}catch{error('描画を復帰できませんでした。再読み込みしてください。');}});
  character.update(state);camera.lookAt(6,2.3,-1);inspectCamera();environment.update(state,camera.position.x);renderer.render(scene,camera);
  $('#start').disabled=false;$('#start').textContent='歩きはじめる';setMode('intro');
  if(debug)window.__echo={version:'toon-character-draft',snapshot:()=>({...state,mode,tier,quality:settings.quality,character:legacy?'legacy':'toon',cameraX:camera.position.x,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,feet:character.pose?.()}),context:()=>renderer.getContext()};
  requestAnimationFrame(frame);
 }catch(e){console.error(e);error('この端末では3D描画を開始できませんでした。2D版も利用できます。');}
}
function frame(now){
 requestAnimationFrame(frame);const dt=lastTime?Math.min(.25,(now-lastTime)/1000):0;lastTime=now;if(lost)return;
 if(mode==='playing'){
  const falls=state.falls,n=clock.advance(state,input(),dt);if(n>0)queuedActions.clear();
  if(state.falls>falls)notify('少し手前から、もう一度。');
  const desired=Math.max(5,Math.min(105,state.x+3.6+state.vx*.32));camera.position.x+=(desired-camera.position.x)*(1-Math.exp(-dt*(reduced?5:2.8)));camera.position.y+=(5.3+Math.max(-1,state.y)*.12-camera.position.y)*(1-Math.exp(-dt*2));
  camera.lookAt(camera.position.x,2.3+Math.max(-1,state.y)*.08,-1);
  inspectCamera();
  character.update(state);environment.update(state,camera.position.x);audio.update(state);
  $('#hint').style.opacity=state.x>9?'0':'1';$('#prompt').textContent=!state.activated&&Math.abs(state.x-98.6)<2?(matchMedia('(pointer:coarse)').matches?'調べる — 扉を開く':'E — 扉を開く'):'';
  if(state.ended)setMode('ending');
  if(settings.quality==='auto'){perfSeconds+=dt;perfFrames++;if(perfSeconds>6&&state.time>autoCooldown){const fps=perfFrames/perfSeconds;if(fps<28&&tier!=='low'){setQuality(tier==='high'?'medium':'low');autoCooldown=state.time+12;}perfFrames=0;perfSeconds=0;}}
  dirty=true;
 }
 if(dirty){renderer.render(scene,camera);dirty=false;}
}
boot();
