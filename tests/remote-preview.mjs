// Verify the immutable, read-only GitHub source preview from a WebGL browser.
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const sha=process.env.ECHO_HEAD_SHA;if(!/^[a-f0-9]{40}$/.test(sha||''))throw new Error('A full commit SHA is required');
const url=`https://raw.githack.com/Josh-Temple/echo/${sha}/webgl-study.html?debug=1`;
const out=process.env.ECHO_QA_DIR||'/tmp/echo-remote-qa';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:640,height:400}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
 const notice=page.getByRole('button',{name:'Open the page'});if(await notice.isVisible())await notice.click();
 await page.waitForFunction(()=>window.__echo&&!document.querySelector('#start').disabled,null,{timeout:90000});
 await page.locator('#start').click();await page.keyboard.press('Escape');await page.locator('#quality').selectOption('low');await page.locator('#resume').click();
 await page.keyboard.down('KeyD');await page.waitForFunction(()=>window.__echo.snapshot().x>3,null,{timeout:60000});await page.keyboard.press('Space');await page.waitForFunction(()=>window.__echo.snapshot().y>.1,null,{timeout:60000});await page.keyboard.up('KeyD');
 await page.screenshot({path:path.join(out,'remote-jump.png')});assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({pass:true,url,errors},null,2));console.log('PASS remote preview, movement and jump');
}catch(e){fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({pass:false,url,error:String(e),errors},null,2));throw e;}finally{await browser.close();}
