import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,step,createClock,STEP,SPEED} from '../echo3d/simulation.js';
function advance(s,input,seconds){for(let t=0;t<seconds-1e-9;t+=STEP)step(s,input);}
test('cross both gaps and reach the ending using controls',()=>{const s=createState();for(let i=0;i<7000&&!s.ended;i++){step(s,{right:true,jump:s.grounded&&((s.x>28.5&&s.x<29)||(s.x>61.65&&s.x<62)),use:s.x>97});}assert.equal(s.ended,true);assert.equal(s.falls,0);assert.ok(s.gate>=.95);});
test('airborne momentum persists after reversal or release',()=>{for(const input of [{left:true},{}]){const s=createState();advance(s,{right:true},1);step(s,{right:true,jump:true});const vx=s.vx;advance(s,input,.2);assert.equal(s.vx,vx);assert.equal(vx,SPEED);}});
test('cannot snap up to the floor from below',()=>{const s=createState();Object.assign(s,{x:31,y:-.3,vy:-2,vx:2,grounded:false,coyote:0});step(s,{});assert.equal(s.grounded,false);assert.ok(s.y<-.3);});
test('missed gap restarts from latest checkpoint',()=>{const s=createState();Object.assign(s,{x:61,y:0,vx:SPEED,checkpoint:35});advance(s,{right:true},2);assert.equal(s.falls,1);assert.ok(s.x>=35&&s.x<40);});
test('held jump cannot repeatedly jump on landing',()=>{const s=createState();advance(s,{jump:true},2);assert.equal(s.grounded,true);assert.equal(s.y,0);});
test('gate blocks passage and cannot activate remotely',()=>{const s=createState();step(s,{use:true});assert.equal(s.activated,false);Object.assign(s,{x:99,vx:SPEED});advance(s,{right:true},2);assert.equal(s.x,100.1);assert.equal(s.ended,false);});
test('fixed step is deterministic at 30, 60 and 144 fps',()=>{const outcomes=[30,60,144].map(fps=>{const s=createState(),clock=createClock();for(let i=0;i<fps*4;i++)clock.advance(s,{right:true},1/fps);return s;});for(const s of outcomes){assert.ok(Math.abs(s.x-outcomes[0].x)<1e-9);assert.ok(Math.abs(s.time-4)<1e-9);}});
