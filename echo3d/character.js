import * as T from '../vendor/three-0.169.0.module.min.js';
import { groundAt, SPEED, JUMP_SPEED } from './simulation.js';
import { createLocomotion } from './locomotion.js';

// All coordinates are metres. The figure stands 1.84 m tall; the head is
// roughly one eighth of that height. Geometry and motion stay independent of
// the world, camera and game rules.
export function createCharacter(scene, options = {}) {
  const root = new T.Group();
  root.name = 'ECHO protagonist';
  scene.add(root);

  // A small nearest-filtered ramp keeps three stable bands on every device.
  // Debug builds can compare two or four bands without any external assets.
  const ramps = {2: [145, 255], 3: [120, 184, 255], 4: [112, 158, 206, 255]};
  const bandCount = [2, 3, 4].includes(options.bands) ? options.bands : 3;
  const ramp = new T.DataTexture(new Uint8Array(ramps[bandCount]), bandCount, 1, T.RedFormat);
  ramp.minFilter = ramp.magFilter = T.NearestFilter;
  ramp.generateMipmaps = false; ramp.needsUpdate = true;
  const material = color => new T.MeshToonMaterial({ color, gradientMap: ramp });
  const fabric = material(0x46514b), fabricDark = material(0x303a36);
  const stitching = material(0x566159), trousers = material(0x303939);
  const boots = material(0x1e2726), skin = material(0x858c81);
  const hair = material(0x29322f), metal = material(0x303b3a);
  const outlineMaterial = new T.MeshBasicMaterial({ color: 0x1b2927, side: T.BackSide });
  const gait = createLocomotion();
  let facing = null, lastTime = null, lastX = null;
  let pose = [];
  const sphere = new T.SphereGeometry(1, 14, 12);
  const axis = new T.Vector3(0, 1, 0);
  const start = new T.Vector3(), end = new T.Vector3();

  function addMesh(geometry, material, parent = root) {
    const mesh = new T.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  // Selective inverted hulls avoid a full-screen effect and dark seams on
  // small internal details. Each hull follows its source mesh's transform.
  function outline(mesh, amount = 1.045) {
    if (options.outline === false) return mesh;
    const shell = new T.Mesh(mesh.geometry, outlineMaterial);
    shell.scale.setScalar(amount); shell.castShadow = false; shell.receiveShadow = false;
    mesh.add(shell);
    return mesh;
  }

  function ellipsoid(material, position, scale, parent = root) {
    const mesh = addMesh(sphere, material, parent);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    return mesh;
  }

  // Elliptical rings avoid a boxy chest and a spherical waist. Offsetting the
  // upper rings gently brings the shoulders forward in side profile.
  function loft(rings, material, parent = root, sides = 16) {
    const vertices = [], indices = [];
    for (const [y, rx, rz, cx = 0] of rings) {
      for (let j = 0; j < sides; j++) {
        const angle = j * Math.PI * 2 / sides;
        vertices.push(cx + Math.cos(angle) * rx, y, Math.sin(angle) * rz);
      }
    }
    for (let i = 0; i < rings.length - 1; i++) {
      for (let j = 0; j < sides; j++) {
        const a = i * sides + j, b = i * sides + (j + 1) % sides;
        indices.push(a, a + sides, b, b, a + sides, b + sides);
      }
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return addMesh(geometry, material, parent);
  }

  // Cylinder mesh is reoriented between two joints. Tapered upper and lower
  // sections keep the arms and legs human even at this small screen scale.
  function limb(material, radius, depth, taper = 1, parent = root) {
    const mesh = addMesh(new T.CylinderGeometry(taper, 1, 1, 12), material, parent);
    mesh.userData.radius = radius;
    mesh.userData.depth = depth;
    return mesh;
  }

  function place(mesh, ax, ay, bx, by, z, endZ = z) {
    start.set(ax, ay, z);
    end.set(bx, by, endZ);
    mesh.position.copy(start).add(end).multiplyScalar(.5);
    end.sub(start);
    mesh.scale.set(mesh.userData.radius, end.length(), mesh.userData.depth);
    mesh.quaternion.setFromUnitVectors(axis, end.normalize());
  }

  const body = new T.Group();
  root.add(body);
  const jacket = loft([
    [.94, .17, .20, -.018], [1.03, .155, .185, -.015],
    [1.22, .19, .215, 0], [1.42, .21, .255, .01],
    [1.49, .17, .205, .008], [1.545, .076, .09, .014],
  ], fabric, body);
  jacket.name = 'tapered jacket';
  outline(jacket, 1.035);
  const lapelShape = new T.Shape();
  lapelShape.moveTo(.045, 1.46); lapelShape.lineTo(.14, 1.405);
  lapelShape.lineTo(.105, 1.28); lapelShape.lineTo(.025, 1.405); lapelShape.closePath();
  const lapel = addMesh(new T.ShapeGeometry(lapelShape), fabricDark, body);
  lapel.position.z = .226; lapel.rotation.y = -.10;
  ellipsoid(trousers, [0, .995, 0], [.17, .095, .185], body);
  // The coat hem has a separate front and back flap. It trails slightly behind
  // the hips when moving, without adding a cloth simulation to the game loop.
  const coatTail = new T.Group();
  coatTail.position.y = .98;
  body.add(coatTail);
  loft([
    [-.18, .17, .185, -.045], [-.09, .18, .20, -.025],
    [.015, .16, .195, -.012],
  ], fabricDark, coatTail);
  const collar = loft([[1.51, .10, .13], [1.58, .082, .10]], fabricDark, body);
  collar.name = 'open collar';
  ellipsoid(skin, [.012, 1.579, 0], [.055, .052, .058], body);
  ellipsoid(stitching, [.035, 1.525, .105], [.065, .02, .065], body);
  ellipsoid(stitching, [.035, 1.525, -.105], [.065, .02, .065], body);

  const head = new T.Group();
  head.position.set(.025, 1.70, 0);
  body.add(head);
  const face = loft([
    [-.114, .025, .037, .017], [-.085, .073, .071, .018],
    [-.034, .102, .089, .008], [.038, .107, .092, -.003],
    [.083, .085, .078, -.012], [.116, .021, .029, -.014],
  ], skin, head);
  outline(face, 1.05);
  // A short hairline and barely raised nose are enough to read in profile.
  // The face remains anonymous at the game's actual camera distance.
  loft([[.058, .091, .088, -.022], [.087, .084, .079, -.018],
    [.12, .025, .035, -.014]], hair, head);
  const nose = new T.Shape();
  nose.moveTo(.097, -.001); nose.lineTo(.117, -.019);
  nose.lineTo(.101, -.037); nose.closePath();
  const noseGeometry = new T.ExtrudeGeometry(nose, { depth: .025, bevelEnabled: false });
  noseGeometry.translate(0, 0, -.0125);
  addMesh(noseGeometry, skin, head);

  const shoeShape = new T.Shape();
  shoeShape.moveTo(-.115, .012);
  shoeShape.lineTo(-.108, .077);
  shoeShape.lineTo(-.038, .119);
  shoeShape.lineTo(.06, .104);
  shoeShape.lineTo(.154, .055);
  shoeShape.lineTo(.161, .018);
  shoeShape.closePath();
  const shoeGeometry = new T.ExtrudeGeometry(shoeShape, {
    depth: .112, bevelEnabled: true, bevelSegments: 1,
    bevelSize: .008, bevelThickness: .006, curveSegments: 2,
  });
  shoeGeometry.translate(0, 0, -.056);
  const soleGeometry = new T.BoxGeometry(.282, .018, .122);
  const legs = [-.115, .115].map((z, i) => {
    const thigh = limb(trousers, .085, .091, .88);
    const shin = limb(trousers, .061, .068, 1.16);
    const knee = ellipsoid(trousers, [0, 0, z], [.075, .07, .079]);
    const ankle = ellipsoid(boots, [0, 0, z], [.061, .07, .069]);
    const foot = new T.Group();
    foot.name = i === 0 ? 'far foot' : 'near foot';
    root.add(foot);
    outline(addMesh(shoeGeometry, boots, foot), 1.045);
    const sole = addMesh(soleGeometry, fabricDark, foot);
    sole.position.set(.025, .014, 0);
    return { z, thigh, shin, knee, ankle, foot };
  });

  const arms = [-.22, .22].map((z, i) => ({
    z, near: i === 1,
    shoulder: ellipsoid(fabric, [.005, 1.455, z], [.06, .082, .06], body),
    upper: limb(fabric, .064, .075, .9, body),
    elbow: ellipsoid(fabric, [0, 0, z], [.051, .056, .058], body),
    forearm: limb(fabric, .045, .051, 1.18, body),
    cuff: ellipsoid(fabricDark, [0, 0, z], [.048, .039, .05], body),
    hand: ellipsoid(skin, [0, 0, z], [.039, .057, .04], body),
  }));

  // Only the camera-facing limbs receive hulls, limiting extra draw calls.
  outline(legs[1].thigh, 1.055); outline(legs[1].shin, 1.055);
  outline(arms[1].upper, 1.055); outline(arms[1].forearm, 1.055);

  const weapon = new T.Group();
  weapon.name = 'small carried sidearm';
  body.add(weapon);
  const receiver = outline(addMesh(new T.BoxGeometry(.205, .068, .064), metal, weapon), 1.06);
  receiver.position.set(.060, 0, 0);
  const muzzle = addMesh(new T.BoxGeometry(.08, .042, .054), fabricDark, weapon);
  muzzle.position.set(.197, -.006, 0);
  const grip = addMesh(new T.BoxGeometry(.055, .125, .06), boots, weapon);
  grip.position.set(-.016, -.063, 0);
  grip.rotation.z = -.17;

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 31);
  gradient.addColorStop(0, 'rgba(0,0,0,.58)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  const shadow = new T.Mesh(
    new T.PlaneGeometry(1.3, .7),
    new T.MeshBasicMaterial({ map: new T.CanvasTexture(canvas), transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);

  function update(state) {
    root.position.set(state.x, state.y, 1.1);
    const target = state.face === 1 ? 0 : Math.PI;
    const dt = lastTime === null ? 0 : Math.max(0, Math.min(.05, state.time - lastTime));
    if (facing === null || state.time < lastTime || Math.abs(state.x - lastX) > 2) facing = target;
    const turn = Math.atan2(Math.sin(target - facing), Math.cos(target - facing));
    facing += turn * (1 - Math.exp(-10 * dt));
    root.rotation.y = facing;
    lastTime = state.time; lastX = state.x;

    const speed = Math.min(1, Math.abs(state.vx) / SPEED);
    const motion = speed * (state.grounded ? 1 : .65);
    const phase = state.phase;
    const breathe = Math.sin(state.time * 1.7) * .004;
    const bob = state.grounded ? Math.sin(phase * 2.3) * .011 * speed : 0;
    const compression = state.landed * .085;
    const takeoff = !state.grounded ? Math.max(0, state.vy / JUMP_SPEED) * .025 : 0;
    const hip = .985 - .08 * speed + bob - compression - takeoff;
    const offset = hip - .985 + breathe;

    body.position.y = offset;
    body.rotation.z = state.grounded ? -.035 * speed : -.035 - .045 * state.vy / JUMP_SPEED;
    coatTail.rotation.z = state.grounded ? .03 * speed : .03 - .025 * state.vy / JUMP_SPEED;
    head.rotation.z = state.grounded ? .012 * speed - compression * .2 : .025 - .025 * state.vy / JUMP_SPEED;
    pose = gait.update(state, facing);

    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i], foot = pose[i];
      const ankleX = foot.x - .012, ankleY = foot.y + .095, ankleZ = foot.z;
      const dx = ankleX, dy = ankleY - hip, dz = ankleZ - leg.z;
      const distance = Math.min(Math.hypot(dx, dy, dz), .889);
      const bend = Math.sqrt(Math.max(0, .445 * .445 - distance * distance / 4));
      const planar = Math.hypot(dx, dy) || 1;
      const kneeX = ankleX / 2 - dy / planar * bend;
      const kneeY = (hip + ankleY) / 2 + dx / planar * bend;
      const kneeZ = (leg.z + ankleZ) / 2;
      place(leg.thigh, 0, hip, kneeX, kneeY, leg.z, kneeZ);
      place(leg.shin, kneeX, kneeY, ankleX, ankleY, kneeZ, ankleZ);
      leg.knee.position.set(kneeX, kneeY, kneeZ);
      leg.ankle.position.set(ankleX, ankleY, ankleZ);
      leg.foot.position.set(foot.x, foot.y, foot.z);
      leg.foot.rotation.z = state.grounded ? 0 : (i === 0 ? -.10 : .06) * Math.min(1, Math.abs(state.vy) / 2);
    }

    for (let i = 0; i < arms.length; i++) {
      const arm = arms[i];
      const swing = Math.sin(phase * 1.15 + i * Math.PI) * .13 * motion;
      const air = state.grounded ? 0 : 1;
      const falling = Math.max(0, -state.vy / JUMP_SPEED);
      const elbowX = arm.near ? -.035 - swing * .2 : -.015 + swing * .55 - .035 * air;
      const wristX = arm.near ? .125 + swing * .25 : -.075 + swing - .055 * air;
      const elbowY = (arm.near ? 1.18 : 1.20) + air * .025 * falling;
      const wristY = (arm.near ? 1.025 : 1.005) + air * (.025 + .045 * falling);
      place(arm.upper, 0, 1.455, elbowX, elbowY, arm.z);
      place(arm.forearm, elbowX, elbowY, wristX, wristY, arm.z);
      arm.elbow.position.set(elbowX, elbowY, arm.z);
      arm.cuff.position.set(wristX, wristY + .03, arm.z);
      arm.hand.position.set(wristX, wristY - .032, arm.z);
      if (arm.near) {
        weapon.position.set(wristX + .047, wristY - .085, arm.z + .012);
        weapon.rotation.z = -.19 - .04 * Math.sin(phase) * motion;
      }
    }

    shadow.visible = groundAt(state.x);
    shadow.position.set(state.x, .012, 1.1);
    shadow.material.opacity = Math.max(.12, 1 - Math.max(0, state.y) * .5);
    shadow.scale.setScalar(1 + Math.max(0, state.y) * .2);
  }

  return { root, update, pose: () => pose };
}
