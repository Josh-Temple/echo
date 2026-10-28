// Optional QA runner; no Playwright dependency is shipped to players.
// PLAYWRIGHT_MODULE=... CHROMIUM_PATH=... node tests/browser-smoke.mjs
import {createRequire} from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=process.cwd(),out=process.env.ECHO_QA_DIR||'/tmp/echo-qa';fs.mkdirSync(out,{recursive:true});
const results={checks:[],errors:[],externalRequests:[]};
const record=(name,detail={})=>{results.checks.push({name,pass:true,...detail});console.log('PASS '+name);};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.ttf')?'font/ttf':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
function observe(page){page.on('pageerror',e=>results.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')results.errors.push(m.text())});page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(base))results.externalRequests.push(r.url());});page.setDefaultTimeout(60000);}
const snapshot=p=>p.evaluate(()=>window.__echo.snapshot());
async function boot(p){observe(p);await p.goto(base+'/webgl-study.html?debug=1');await p.waitForFunction(()=>window.__echo&&!document.querySelector('#start').disabled);await p.evaluate(()=>document.fonts.ready);}
async function quality(p,value){await p.keyboard.press('Escape');await p.locator('#quality').selectOption(value);await p.locator('#resume').click();}
try{
 if(process.env.ECHO_MOBILE_ONLY!=='1'){
  const p=await browser.newPage({viewport:{width:640,height:400}});await boot(p);await p.screenshot({path:out+'/title.png'});record('desktop boot');await p.locator('#start').click();await quality(p,'low');await p.keyboard.down('KeyD');await p.waitForFunction(()=>window.__echo.snapshot().x>7);await p.keyboard.up('KeyD');record('keyboard movement');
  const turnStart=(await snapshot(p)).x;await p.keyboard.down('KeyA');await p.waitForFunction(x=>window.__echo.snapshot().x<x-.4&&window.__echo.snapshot().face===-1,turnStart);await p.keyboard.up('KeyA');await p.waitForFunction(()=>Math.abs(window.__echo.snapshot().vx)<.01);record('keyboard reversal and stopping');
  await p.keyboard.press('Escape');const paused=(await snapshot(p)).x;await p.waitForTimeout(250);assert.equal((await snapshot(p)).x,paused);record('pause freezes simulation');await p.locator('#resume').click();
  await p.keyboard.down('KeyD');await p.waitForFunction(()=>window.__echo.snapshot().x>=28.45);await p.keyboard.press('Space');await p.waitForFunction(()=>window.__echo.snapshot().x>31.5&&window.__echo.snapshot().grounded);assert.equal((await snapshot(p)).falls,0);record('first gap');
  await p.waitForFunction(()=>window.__echo.snapshot().x>=61.40);await p.keyboard.press('Space');await p.waitForFunction(()=>window.__echo.snapshot().x>65&&window.__echo.snapshot().grounded);assert.equal((await snapshot(p)).falls,0);record('second gap');
  await p.waitForFunction(()=>window.__echo.snapshot().x>97.5);await p.keyboard.up('KeyD');await p.waitForFunction(()=>Math.abs(window.__echo.snapshot().vx)<.01);assert.match(await p.locator('#prompt').textContent(),/扉/);await p.keyboard.press('KeyE');await p.waitForFunction(()=>window.__echo.snapshot().activated);record('short interaction press opens gate');await p.waitForFunction(()=>window.__echo.snapshot().gate>=.99);await p.keyboard.down('KeyD');await p.waitForFunction(()=>window.__echo.snapshot().mode==='ending');await p.keyboard.up('KeyD');record('complete traversal reaches ending');await p.screenshot({path:out+'/ending.png'});
  await p.locator('#replay').click();assert.ok((await snapshot(p)).x<3);record('replay');await quality(p,'high');await p.screenshot({path:out+'/high.png'});record('high quality render');
  await p.evaluate(()=>{const ext=window.__echo.context().getExtension('WEBGL_lose_context');window.__restoreEcho=()=>ext.restoreContext();ext.loseContext();});await p.waitForFunction(()=>window.__echo.snapshot().mode==='error');record('context loss feedback');await p.evaluate(()=>window.__restoreEcho());await p.waitForFunction(()=>window.__echo.snapshot().mode==='paused');await p.locator('#resume').click();await p.screenshot({path:out+'/restored.png'});record('context restores to resumable play');await p.close();
 }
 for(const [width,height]of [[390,844],[360,800],[844,390]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,deviceScaleFactor:1});const p=await context.newPage();await boot(p);await p.locator('#start').click();await p.locator('#pause').click();await p.locator('#quality').selectOption('low');await p.locator('#resume').click();
  const boxes=await p.locator('#touch button').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));assert.ok(boxes.every(b=>b.width>=44&&b.height>=44&&b.x>=0&&b.y>=0&&b.x+b.width<=width&&b.y+b.height<=height));assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),width);record(`mobile ${width}x${height} layout and targets`);
  const client=await context.newCDPSession(p),right=boxes[1],jump=boxes[3],r={x:right.x+right.width/2,y:right.y+right.height/2,id:1},j={x:jump.x+jump.width/2,y:jump.y+jump.height/2,id:2};
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[r]});await p.waitForFunction(()=>window.__echo.snapshot().x>3);await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[r,j]});await p.waitForFunction(()=>window.__echo.snapshot().y>.2);await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});record(`mobile ${width}x${height} simultaneous move and jump`);
  await p.waitForFunction(()=>window.__echo.snapshot().grounded&&Math.abs(window.__echo.snapshot().vx)<.01);const x=(await snapshot(p)).x;await p.waitForTimeout(150);assert.equal((await snapshot(p)).x,x);record(`mobile ${width}x${height} release clears movement`);
  // Inspect the intended visual tier too; low is used above only to stabilize input timing in software WebGL.
  await p.locator('#pause').click();await p.locator('#quality').selectOption('medium');await p.locator('#resume').click();await p.screenshot({path:out+`/mobile-${width}x${height}.png`});record(`mobile ${width}x${height} medium render`);await context.close();
 }
 const p2=await browser.newPage({viewport:{width:640,height:400}});observe(p2);await p2.goto(base+'/index.html');await p2.waitForFunction(()=>window.echoDebug);const x2=await p2.evaluate(()=>window.echoDebug.getState().x);await p2.keyboard.down('ArrowRight');await p2.waitForFunction(x=>window.echoDebug.getState().x>x+1,x2);await p2.keyboard.up('ArrowRight');await p2.screenshot({path:out+'/2d.png'});record('2D version starts and accepts movement');await p2.close();
 assert.deepEqual(results.errors,[]);assert.deepEqual(results.externalRequests,[]);record('no JavaScript, shader or external request errors');results.pass=true;
}catch(error){results.pass=false;results.failure=String(error.stack||error);try{const pages=browser.contexts().flatMap(c=>c.pages());if(pages.length&&await pages[0].evaluate(()=>!!window.__echo))results.failureState=await snapshot(pages[0]);}catch{}console.error(error);process.exitCode=1;}
finally{fs.writeFileSync(out+'/browser-results.json',JSON.stringify(results,null,2));await browser.close();await new Promise(r=>server.close(r));}
