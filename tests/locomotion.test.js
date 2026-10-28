import test from 'node:test';
import assert from 'node:assert/strict';
import {createState, step, STEP} from '../echo3d/simulation.js';
import {createLocomotion} from '../echo3d/locomotion.js';

function run(s, gait, input, frames, inspect) {
  let prior = null;
  for (let i=0;i<frames;i++) {
    step(s,input,STEP);
    const feet = gait.update(s, s.face === 1 ? 0 : Math.PI);
    for (const foot of feet) {
      assert.ok([foot.x,foot.y,foot.z,foot.worldX,foot.worldZ].every(Number.isFinite));
      if (s.grounded) assert.ok(foot.y >= .0059, 'foot stays above the floor');
    }
    if (inspect) inspect(feet,prior,s);
    prior = feet;
  }
}

test('planted feet remain fixed in world space during walking and stopping',()=>{
  const s=createState(), gait=createLocomotion();s.x=10;gait.update(s,0);
  let verified=0;
  const check=(feet,prior,state)=>{if(!prior||!state.grounded)return;for(let i=0;i<2;i++)if(feet[i].planted&&prior[i].planted){assert.ok(Math.abs(feet[i].worldX-prior[i].worldX)<1e-9);assert.ok(Math.abs(feet[i].worldZ-prior[i].worldZ)<1e-9);verified++;}};
  run(s,gait,{right:true},240,check);run(s,gait,{},90,check);assert.ok(verified>100);
});

test('jump, landing, reversal and checkpoint reset keep finite visible poses',()=>{
  const s=createState(),gait=createLocomotion();s.x=12;gait.update(s,0);
  run(s,gait,{right:true},90);run(s,gait,{right:true,jump:true},1);assert.equal(s.grounded,false);
  run(s,gait,{right:true},140);assert.equal(s.grounded,true);
  run(s,gait,{left:true},160);assert.equal(s.face,-1);
  s.x=2;s.time=0;s.falls++;const feet=gait.update(s,Math.PI);
  for(const foot of feet)assert.ok(Math.abs(foot.worldX-s.x)<1);
});
