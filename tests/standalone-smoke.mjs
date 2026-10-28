// Verify the bundled file from file://, including real keyboard input.
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.ECHO_QA_DIR||'/tmp/echo-standalone-qa';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:640,height:400}}),errors=[],external=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});
try{
 await page.goto(pathToFileURL('/tmp/ECHO_3D_Preview.html').href+'?debug=1');await page.waitForFunction(()=>window.__echo&&!document.querySelector('#start').disabled,null,{timeout:60000});
 await page.locator('#start').click();await page.keyboard.press('Escape');await page.locator('#quality').selectOption('low');await page.locator('#resume').click();
 await page.keyboard.down('KeyD');await page.waitForFunction(()=>window.__echo.snapshot().x>3,null,{timeout:60000});await page.keyboard.press('Space');await page.waitForFunction(()=>window.__echo.snapshot().y>.1,null,{timeout:60000});await page.keyboard.up('KeyD');
 await page.screenshot({path:path.join(out,'offline-jump.png')});assert.deepEqual(errors,[]);assert.deepEqual(external,[]);fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({pass:true,errors,external},null,2));console.log('PASS offline startup, movement, jump and no network requests');
}catch(e){fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({pass:false,error:String(e),errors,external},null,2));throw e;}finally{await browser.close();}
