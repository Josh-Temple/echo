import * as T from '../vendor/three-0.169.0.module.min.js';
import {Reflector} from '../vendor/Reflector.js';
import {RoomEnvironment} from '../vendor/RoomEnvironment.js';
import {FLOORS} from './simulation.js';

export function createEnvironment(renderer,scene){
 scene.background=new T.Color(0x263438);scene.fog=new T.FogExp2(0x263438,.027);
 let seed=31415;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#89918d';ctx.fillRect(0,0,256,256);
 for(let i=0;i<17000;i++){const a=random()*.12;ctx.fillStyle=`rgba(${random()>.5?'8,20,18':'220,226,207'},${a})`;ctx.fillRect(random()*256,random()*256,random()*2+1,random()*3+1);}
 for(let i=0;i<85;i++){ctx.fillStyle=`rgba(13,31,25,${random()*.06})`;ctx.fillRect(random()*256,0,random()*5+1,256*random());}
 const texture=new T.CanvasTexture(canvas);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(2,3);texture.colorSpace=T.SRGBColorSpace;
 const material=(color,roughness=1,metalness=0,patina=false)=>new T.MeshStandardMaterial({color,roughness,metalness,...(patina?{map:texture,bumpMap:texture,bumpScale:.045}:{})});
 const concrete=material(0x68716b,1,0,true),wall=material(0x485955,1,0,true),steel=material(0x2b3a3a,.75,.38),black=material(0x142328),floor=material(0x58645c,.92,.08,true),rust=material(0x544b3e,.96,.2,true);
 const luminous=new T.MeshBasicMaterial({color:0xb1c6b4}),windowMat=new T.MeshBasicMaterial({color:0x6f8a83});
 const boxGeo=new T.BoxGeometry(1,1,1),cylGeo=new T.CylinderGeometry(1,1,1,16);const batches=new Map();
 function box(w,h,d,x,y,z,m=concrete,ry=0){const key=`box-${m.uuid}`;if(!batches.has(key))batches.set(key,{geo:boxGeo,mat:m,items:[]});batches.get(key).items.push({x,y,z,w,h,d,ry});}
 function cylinder(r,h,x,y,z,m=steel,rz=0){const mesh=new T.Mesh(cylGeo,m);mesh.scale.set(r,h,r);mesh.position.set(x,y,z);mesh.rotation.z=rz;mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;}
 box(135,17,.8,55,7,-23,wall);box(135,1,27,55,13,-8,black);
 for(let x=-8;x<122;x+=11){
  box(.85,14,1.25,x,6,-19,concrete);box(10.3,.65,1.2,x+5.5,8.8,-19,concrete);
  box(5,4.1,.08,x+5.2,9.6,-22.48,windowMat);
  for(let k=0;k<5;k++)box(.10,4.1,.14,x+3.2+k,9.6,-22.35,steel);
  box(5,.12,.15,x+5.2,9.8,-22.25,steel);box(5,.12,.15,x+5.2,8.3,-22.25,steel);
  box(.85,11,1.4,x,5.1,-8.5,concrete);box(10.3,.7,1.5,x+5.5,10.2,-8.5,concrete);
  box(11,.24,2.7,x+5,5.5,-14,steel);
  for(let k=0;k<7;k++)box(.045,1,.045,x+k*1.7,6.1,-12.7,steel);
  box(11,.055,.055,x+5,6.6,-12.7,steel);box(11,.035,.035,x+5,6.1,-12.7,steel);
  box(7,.22,.3,x+3.5,8.8,-6,steel);box(.18,2.8,.2,x,9,-6,steel);
 }
 for(const [a,b]of FLOORS){box(b-a,.55,3.8,(a+b)/2,-.29,1.1,floor);box(b-a,.16,.17,(a+b)/2,-.11,3.02,steel);box(b-a,.7,.2,(a+b)/2,-.5,-.84,concrete);for(let x=a+.6;x<b;x+=2.5){box(.025,.008,3.5,x,.004,1.1,steel);box(.045,1,.045,x,.51,-.77,steel);}box(b-a,.045,.045,(a+b)/2,1.02,-.77,steel);box(b-a,.035,.035,(a+b)/2,.54,-.77,steel);}
 for(let x=9;x<112;x+=21){
  cylinder(2.3,4.4,x,1.3,-13,wall);cylinder(2.37,.16,x,3.48,-13,steel);cylinder(2.38,.14,x,.1,-13,steel);
  box(4.7,.8,4.5,x,-1.35,-13,black);
  for(let k=0;k<3;k++)cylinder(.09,7.5,x-3+k*.4,3.4,-7.5,steel);
  const ring=new T.Mesh(new T.TorusGeometry(1.4,.16,8,32),rust);ring.position.set(x+4,2.5,-10);scene.add(ring);
  cylinder(.38,3.2,x+4,2.5,-10,steel,Math.PI/2);
 }
 // Foreground silhouettes and sagging cables give an actual depth cue as the camera travels.
 for(let x=-8;x<118;x+=22){box(.52,13,.65,x,5.2,6.6,black);box(.9,.4,.9,x,10.8,6.6,steel);box(.95,1.1,1,x,-.2,6.6,black);}
 for(let x=-6;x<115;x+=22){const pts=[];for(let i=0;i<=12;i++){const t=i/12;pts.push(new T.Vector3(x+22*t,8.4-Math.sin(t*Math.PI)*1.6,5));}const wire=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),24,.025,5,false),black);scene.add(wire);}
 const signCanvas=document.createElement('canvas');signCanvas.width=256;signCanvas.height=256;const sc=signCanvas.getContext('2d');sc.fillStyle='#9baa9a';sc.font='300 128px sans-serif';sc.textAlign='center';sc.fillText('03',128,147);sc.font='14px sans-serif';sc.fillText('R E S E R V O I R',128,178);sc.fillRect(42,195,172,2);
 const sign=new T.Mesh(new T.PlaneGeometry(3.1,3.1),new T.MeshBasicMaterial({map:new T.CanvasTexture(signCanvas),transparent:true,opacity:.28,depthWrite:false}));sign.position.set(4,3.1,-22.5);scene.add(sign);
 for(let i=0;i<44;i++){const x=random()*108;if(FLOORS.some(([a,b])=>x>a+.5&&x<b-.5)){box(.04+random()*.12,.015+random()*.035,.04+random()*.09,x,.018,2.65+random()*.22,concrete,random()*Math.PI);}}
 const lampXs=[4,23,44,64,85,103];const cones=[];
 const coneMat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{tint:{value:new T.Color(0x96b8a5)}},vertexShader:'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform vec3 tint;void main(){float a=pow(sin(vUv.x*3.14159265),2.0)*pow(vUv.y,1.5)*0.022;gl_FragColor=vec4(tint,a);}'});
 for(const x of lampXs){box(.08,2,.08,x,9.5,-1.7,steel);box(1.2,.18,.7,x,8.5,-1.7,steel);box(.9,.035,.48,x,8.38,-1.7,luminous);const cone=new T.Mesh(new T.ConeGeometry(3.3,9,32,1,true),coneMat);cone.position.set(x,3.85,-1.7);scene.add(cone);cones.push(cone);}
 const hemi=new T.HemisphereLight(0xa8c4bd,0x171c1c,1.5);scene.add(hemi);
 const sun=new T.DirectionalLight(0xbac9b6,2.4);sun.castShadow=true;sun.position.set(7,13,6);sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-18,right:18,top:14,bottom:-10,near:1,far:55});sun.shadow.bias=-.0003;sun.shadow.normalBias=.035;scene.add(sun,sun.target);
 const spots=Array.from({length:3},()=>{const light=new T.SpotLight(0xc3d9c4,90,20,.55,.7,1.7);scene.add(light,light.target);return light;});
 const redMat=new T.MeshStandardMaterial({color:0x743f36,emissive:0xb3412a,emissiveIntensity:1.3});
 for(let x=18;x<112;x+=34){box(.2,.13,.13,x,3.6,-5,redMat);box(.42,.4,.2,x,3.6,-5.12,steel);}
 // The walkable gate crosses the path, with its machinery visible above the opening.
 box(1,9,4.6,102,4.5,-2.5,concrete);box(1,9,1,102,4.5,4,concrete);box(1,1.4,6.6,102,7.5,.6,concrete);
 const door=new T.Mesh(new T.BoxGeometry(.22,5.5,4.7),steel);door.position.set(102,2.72,1.1);door.castShadow=true;scene.add(door);
 box(.4,.65,.35,98.6,1.2,-.43,steel);const switchLamp=new T.Mesh(new T.SphereGeometry(.065,8,6),redMat);switchLamp.position.set(98.6,1.48,-.2);scene.add(switchLamp);
 const ghost=new T.Group();scene.add(ghost);ghost.position.set(108,0,1.1);const ghostMat=new T.MeshBasicMaterial({color:0x152327,transparent:true,opacity:0});const gm=new T.Mesh(new T.CapsuleGeometry(.18,1.18,4,8),ghostMat);gm.position.y=.85;ghost.add(gm);const gh=new T.Mesh(new T.SphereGeometry(.12,12,8),ghostMat);gh.position.y=1.66;ghost.add(gh);
 for(const b of batches.values()){const mesh=new T.InstancedMesh(b.geo,b.mat,b.items.length),dummy=new T.Object3D();b.items.forEach((o,i)=>{dummy.position.set(o.x,o.y,o.z);dummy.rotation.set(0,o.ry,0);dummy.scale.set(o.w,o.h,o.d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.castShadow=b.mat!==luminous&&b.mat!==windowMat;mesh.receiveShadow=true;mesh.computeBoundingSphere();scene.add(mesh);}
 const water=new Reflector(new T.PlaneGeometry(145,48),{color:0x91aaa1,textureWidth:512,textureHeight:256,clipBias:.003,multisample:0});water.rotation.x=-Math.PI/2;water.position.set(54,-1.15,-5);scene.add(water);
 water.material.uniforms.time={value:0};water.material.fragmentShader='uniform float time;\n'+water.material.fragmentShader;water.material.fragmentShader=water.material.fragmentShader.replace('vec4 base = texture2DProj( tDiffuse, vUv );','vec4 coord = vUv; coord.x += sin(vUv.y * 0.55 + time * 0.65) * 0.0018 * vUv.w; coord.y += sin(vUv.x * 0.31 + time * 0.43) * 0.0012 * vUv.w; vec4 base = texture2DProj( tDiffuse, coord );');
 const cheapWater=new T.Mesh(new T.PlaneGeometry(145,48),material(0x253c3d,.32,.35));cheapWater.rotation.x=-Math.PI/2;cheapWater.position.copy(water.position);cheapWater.visible=false;scene.add(cheapWater);
 const particles=new Float32Array(180*3);for(let i=0;i<particles.length;i+=3){particles[i]=random()*120-5;particles[i+1]=random()*9;particles[i+2]=random()*16-11;}const pg=new T.BufferGeometry();pg.setAttribute('position',new T.BufferAttribute(particles,3));const dust=new T.Points(pg,new T.PointsMaterial({color:0xb5c8b7,size:.025,transparent:true,opacity:.3,depthWrite:false}));scene.add(dust);
 let envTarget;function rebuildEnvironment(){envTarget?.dispose();const generator=new T.PMREMGenerator(renderer),room=new RoomEnvironment();envTarget=generator.fromScene(room,.04);scene.environment=envTarget.texture;scene.environmentIntensity=.14;room.dispose();generator.dispose();}rebuildEnvironment();
 function quality(tier){const low=tier==='low';water.visible=!low;cheapWater.visible=low;dust.visible=!low;cones.forEach(o=>o.visible=!low);renderer.shadowMap.enabled=!low;const size=tier==='high'?2048:1024;if(sun.shadow.mapSize.x!==size){sun.shadow.mapSize.set(size,size);sun.shadow.map?.dispose();sun.shadow.map=null;}water.getRenderTarget().setSize(tier==='high'?768:512,tier==='high'?384:256);}
 function update(s,cameraX){sun.position.set(cameraX+7,13,6);sun.target.position.set(cameraX,0,0);sun.target.updateMatrixWorld();const closest=[...lampXs].sort((a,b)=>Math.abs(a-cameraX)-Math.abs(b-cameraX));spots.forEach((l,i)=>{l.position.set(closest[i],8.2,-1.7);l.target.position.set(closest[i]+.4,0,1.1);l.target.updateMatrixWorld();});door.position.y=2.72+s.gate*5.7;switchLamp.material.emissive.setHex(s.activated?0x78b398:0xb3412a);ghostMat.opacity=s.activated?Math.max(0,.42-Math.max(0,s.x-102)*.15):0;water.material.uniforms.time.value=s.time;dust.position.x=Math.sin(s.time*.05)*.6;}
 return {quality,update,rebuildEnvironment};
}
