export const FLOORS = [[-10,29],[31,62],[64.4,112]];
export const SPEED = 3.65, GRAVITY = 14, JUMP_SPEED = 5.9, STEP = 1/120;
export function groundAt(x){return FLOORS.some(([a,b])=>x>=a&&x<=b);}
export function createState(){return {x:2,y:0,vx:0,vy:0,grounded:true,face:1,phase:0,time:0,coyote:.09,jumpBuffer:0,prevJump:false,checkpoint:2,falls:0,gate:0,activated:false,ended:false,landed:0};}
export function step(s,input,dt=STEP){
 if(s.ended)return;
 s.time+=dt;s.landed=Math.max(0,s.landed-dt*4);
 const jump=!!input.jump;
 if(jump&&!s.prevJump)s.jumpBuffer=.13;
 s.prevJump=jump;s.jumpBuffer=Math.max(0,s.jumpBuffer-dt);
 s.coyote=s.grounded?.09:Math.max(0,s.coyote-dt);
 const direction=Number(!!input.right)-Number(!!input.left);
 if(s.grounded){const target=direction*SPEED,rate=(direction?10:15)*dt;s.vx+=Math.max(-rate,Math.min(rate,target-s.vx));}
 if(s.jumpBuffer>0&&s.coyote>0){s.vy=JUMP_SPEED;s.grounded=false;s.coyote=0;s.jumpBuffer=0;}
 const oldY=s.y;s.x=Math.max(0,Math.min(111,s.x+s.vx*dt));
 if(!s.activated||s.gate<.95){if(s.x>100.1){s.x=100.1;s.vx=0;}}
 if(s.grounded&&!groundAt(s.x)){s.grounded=false;s.vy=0;}
 if(!s.grounded){s.vy-=GRAVITY*dt;s.y+=s.vy*dt;if(oldY>=0&&s.y<=0&&s.vy<=0&&groundAt(s.x)){s.y=0;s.vy=0;s.grounded=true;s.landed=1;}}
 if(s.y< -6){s.x=s.checkpoint;s.y=0;s.vx=0;s.vy=0;s.grounded=true;s.falls++;s.coyote=.09;s.jumpBuffer=0;}
 if(s.grounded){if(s.x>69)s.checkpoint=69;else if(s.x>35)s.checkpoint=35;}
 if(Math.abs(s.vx)>.05)s.face=Math.sign(s.vx);
 s.phase+=Math.abs(s.vx)*dt/1.64*Math.PI*2;
 if(input.use&&s.grounded&&Math.abs(s.x-98.6)<2)s.activated=true;
 if(s.activated)s.gate=Math.min(1,s.gate+dt/3.7);
 if(s.x>=106&&s.gate>=.95)s.ended=true;
}
export function createClock(){let accumulator=0;return {advance(s,input,dt){accumulator+=Math.min(.25,Math.max(0,dt));let n=0;while(accumulator+1e-9>=STEP){step(s,input,STEP);accumulator-=STEP;n++;}return n;},reset(){accumulator=0;}};}
