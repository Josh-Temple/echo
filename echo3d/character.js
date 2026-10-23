import * as T from '../vendor/three-0.169.0.module.min.js';
import {groundAt} from './simulation.js';

export function createCharacter(scene){
 const root=new T.Group();scene.add(root);
 const coat=new T.MeshStandardMaterial({color:0x3c4947,roughness:.96});
 const pants=new T.MeshStandardMaterial({color:0x20282a,roughness:1});
 const skin=new T.MeshStandardMaterial({color:0x8c8980,roughness:.96});
 const dark=new T.MeshStandardMaterial({color:0x151d20,roughness:.85});
 const metal=new T.MeshStandardMaterial({color:0x20272a,roughness:.63,metalness:.55});
 const sphere=new T.SphereGeometry(1,16,12), cylinder=new T.CylinderGeometry(1,1,1,10);
 function blob(material,x,y,z,sx,sy,sz,parent=root){const m=new T.Mesh(sphere,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;parent.add(m);return m;}
 const body=new T.Group();root.add(body);
 const torsoShape=[[0,.98],[.135,1.01],[.164,1.15],[.19,1.38],[.185,1.49],[.13,1.53]].map(([x,y])=>new T.Vector2(x,y));
 const torso=new T.Mesh(new T.LatheGeometry(torsoShape,16),coat);torso.scale.set(.86,1,1.23);torso.castShadow=true;body.add(torso);
 blob(pants,0,1.01,0,.15,.13,.21,body);blob(skin,.015,1.69,0,.112,.148,.103,body);blob(dark,-.019,1.77,0,.104,.077,.104,body);blob(coat,0,1.53,0,.085,.067,.085,body);
 const v1=new T.Vector3(),v2=new T.Vector3(),axis=new T.Vector3(0,1,0);
 function segment(material,r1,r2,parent=root){const m=new T.Mesh(cylinder,material);m.userData={r1,r2};m.castShadow=true;parent.add(m);return m;}
 function place(m,a,b){v1.set(...a);v2.set(...b);m.position.copy(v1).add(v2).multiplyScalar(.5);v2.sub(v1);m.scale.set(m.userData.r1,v2.length(),m.userData.r2);m.quaternion.setFromUnitVectors(axis,v2.normalize());}
 const legs=[-.14,.14].map(z=>({z,thigh:segment(pants,.085,.084),shin:segment(pants,.062,.065),shoe:blob(dark,.05,.07,z,.145,.075,.08)}));
 const arms=[-.24,.24].map(z=>({z,upper:segment(coat,.07,.078,body),fore:segment(coat,.053,.058,body),hand:blob(skin,0,0,z,.048,.066,.047,body)}));
 const gun=new T.Group();body.add(gun);const barrel=new T.Mesh(new T.BoxGeometry(.25,.065,.052),metal);barrel.position.set(.08,0,0);gun.add(barrel);const grip=new T.Mesh(new T.BoxGeometry(.065,.13,.06),dark);grip.position.set(-.005,-.07,0);grip.rotation.z=-.2;gun.add(grip);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,0,32,32,31);gradient.addColorStop(0,'rgba(0,0,0,.65)');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
 const shadow=new T.Mesh(new T.PlaneGeometry(1.2,.65),new T.MeshBasicMaterial({map:new T.CanvasTexture(canvas),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;scene.add(shadow);
 function update(s){
  root.position.set(s.x,s.y,1.1);root.rotation.y=s.face===1?0:Math.PI;
  const stride=Math.min(1,Math.abs(s.vx)/3.65),bob=s.grounded?Math.cos(s.phase*2)*.016*stride:0;
  body.position.y=bob-s.landed*.035+Math.sin(s.time*1.7)*.004;body.rotation.z=-(s.grounded?.035:.07)*stride;
  const hipY=.96+bob-s.landed*.04;
  legs.forEach((leg,i)=>{
   let p=((s.phase/(Math.PI*2)+i*.5)%1),x,y;
   if(s.grounded){if(p<.6){x=.41-p/.6*.82;y=.065;}else{const t=(p-.6)/.4;x=-.41+(.5-.5*Math.cos(t*Math.PI))*.82;y=.065+Math.sin(t*Math.PI)*.16;}x*=stride;y=.065+(y-.065)*stride;}
   else{x=i===0?.28:-.25;y=i===0?.28:.16;}
   const ax=0,ay=hipY,dx=x-ax,dy=y-ay,L=.46,dist=Math.min(Math.hypot(dx,dy),L*1.999),midX=(ax+x)/2,midY=(ay+y)/2,h=Math.sqrt(Math.max(0,L*L-dist*dist/4));
   const norm=Math.hypot(dx,dy)||1,kx=midX-dy/norm*h,ky=midY+dx/norm*h;
   place(leg.thigh,[ax,ay,leg.z],[kx,ky,leg.z]);place(leg.shin,[kx,ky,leg.z],[x,y,leg.z]);leg.shoe.position.set(x+.055,y,leg.z);leg.shoe.rotation.z=s.grounded?Math.max(0,Math.sin(p*Math.PI*2))*.12*stride:.15;
  });
  arms.forEach((arm,i)=>{const swing=Math.sin(s.phase+i*Math.PI)*.12*stride;const hx=i===1?.16+swing*.4:-.08+swing,hy=i===1?1.02:1.02;place(arm.upper,[.015,1.46,arm.z],[hx-.04,1.23,arm.z]);place(arm.fore,[hx-.04,1.23,arm.z],[hx,hy,arm.z]);arm.hand.position.set(hx,hy,arm.z);if(i===1){gun.position.set(hx+.05,hy-.06,arm.z);gun.rotation.z=-.32;}});
  shadow.visible=groundAt(s.x);shadow.position.set(s.x,.012,1.1);shadow.material.opacity=Math.max(.12,1-Math.max(0,s.y)*.5);shadow.scale.setScalar(1+Math.max(0,s.y)*.2);
 }
 return {root,update};
}
