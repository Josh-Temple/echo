import * as T from '../vendor/three-0.169.0.module.min.js';
import { groundAt, SPEED } from './simulation.js';

// All coordinates are metres. The figure stands 1.84 m tall; the head is
// roughly one eighth of that height. Geometry and motion stay independent of
// the world, camera and game rules.
export function createCharacter(scene, options = {}) {
  const root = new T.Group();
  root.name = 'ECHO protagonist';
  scene.add(root);

  // Retain the exact original geometry and gait for side-by-side QA. A
  // toon-only option makes the material change independently comparable.
  const ramps = {2: [145, 255], 3: [120, 184, 255], 4: [112, 158, 206, 255]};
  const bands = [2, 3, 4].includes(options.bands) ? options.bands : 3;
  let ramp;
  if (options.toon) {
    ramp = new T.DataTexture(new Uint8Array(ramps[bands]), bands, 1, T.RedFormat);
    ramp.minFilter = ramp.magFilter = T.NearestFilter; ramp.generateMipmaps = false; ramp.needsUpdate = true;
  }
  const material = settings => options.toon
    ? new T.MeshToonMaterial({color:settings.color,gradientMap:ramp})
    : new T.MeshStandardMaterial(settings);
  const fabric = material({ color: 0x39433f, roughness: 1 });
  const fabricDark = material({ color: 0x2b3432, roughness: 1 });
  const stitching = material({ color: 0x48524b, roughness: 1 });
  const trousers = material({ color: 0x252d2d, roughness: 1 });
  const boots = material({ color: 0x171d1d, roughness: .94 });
  const skin = material({ color: 0x777d74, roughness: 1 });
  const hair = material({ color: 0x252d2b, roughness: 1 });
  const metal = material({ color: 0x242d2e, metalness: .32, roughness: .72 });
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

  function place(mesh, ax, ay, bx, by, z) {
    start.set(ax, ay, z);
    end.set(bx, by, z);
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
  ellipsoid(trousers, [0, .995, 0], [.17, .095, .185], body);
  // The coat hem has a separate front and back flap. It trails slightly behind
  // the hips when moving, without adding a cloth simulation to the game loop.
  const coatTail = loft([
    [.86, .155, .18, -.035], [.94, .17, .20, -.015],
    [.985, .16, .195, -.012],
  ], fabricDark, body);
  const collar = loft([[1.51, .10, .13], [1.58, .082, .10]], fabricDark, body);
  collar.name = 'open collar';
  ellipsoid(skin, [.012, 1.592, 0], [.052, .068, .055], body);
  ellipsoid(stitching, [.035, 1.525, .105], [.065, .02, .065], body);
  ellipsoid(stitching, [.035, 1.525, -.105], [.065, .02, .065], body);

  const head = new T.Group();
  head.position.set(.025, 1.72, 0);
  body.add(head);
  loft([
    [-.114, .025, .037, .017], [-.085, .073, .071, .018],
    [-.034, .102, .089, .008], [.038, .107, .092, -.003],
    [.083, .085, .078, -.012], [.116, .021, .029, -.014],
  ], skin, head);
  // A short hairline and barely raised nose are enough to read in profile.
  // The face remains anonymous at the game's actual camera distance.
  loft([[.045, .116, .102, -.005], [.084, .097, .09, -.012],
    [.124, .027, .037, -.014]], hair, head);
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
    addMesh(shoeGeometry, boots, foot);
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

  const weapon = new T.Group();
  weapon.name = 'small carried sidearm';
  body.add(weapon);
  const receiver = addMesh(new T.BoxGeometry(.17, .058, .058), metal, weapon);
  receiver.position.set(.055, 0, 0);
  const muzzle = addMesh(new T.BoxGeometry(.075, .038, .05), fabricDark, weapon);
  muzzle.position.set(.172, -.005, 0);
  const grip = addMesh(new T.BoxGeometry(.05, .11, .055), boots, weapon);
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
    root.rotation.y = state.face === 1 ? 0 : Math.PI;

    const speed = Math.min(1, Math.abs(state.vx) / SPEED);
    const motion = speed * (state.grounded ? 1 : .65);
    const phase = state.phase;
    const breathe = Math.sin(state.time * 1.7) * .004;
    const bob = state.grounded ? Math.sin(phase * 2) * .013 * speed : 0;
    const compression = state.landed * .055;
    const hip = .985 - .10 * speed + bob - compression;
    const offset = hip - .985 + breathe;

    body.position.y = offset;
    body.rotation.z = state.grounded ? -.038 * speed : -.085;
    coatTail.rotation.z = state.grounded ? .035 * speed : .018;
    head.rotation.z = state.grounded ? .012 * speed - compression * .2 : .055;

    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      const cycle = ((phase / (Math.PI * 2) + i * .5) % 1 + 1) % 1;
      let footX, footY, toe = 0;

      if (state.grounded) {
        if (cycle < .62) {
          const t = cycle / .62;
          footX = .43 - .86 * t;
          footY = .006;
          toe = -Math.max(0, (t - .75) / .25) * .18;
          footY += -toe * .19; // Lift the heel while the toe remains planted.
        } else {
          const t = (cycle - .62) / .38;
          const ease = t * t * (3 - 2 * t);
          footX = -.43 + .86 * ease;
          footY = .006 + Math.sin(t * Math.PI) * .18;
          toe = -.11 * Math.sin(t * Math.PI);
        }
        footX *= speed;
        footY = .006 + (footY - .006) * speed;
        toe *= speed;
      } else {
        // A leading bent knee and a trailing leg sell the jump without moving
        // either foot by input while the simulation is airborne.
        footX = i === 0 ? -.20 : .245;
        footY = i === 0 ? .15 : .25;
        toe = i === 0 ? -.13 : .08;
      }

      const ankleX = footX - .012;
      const ankleY = footY + .095;
      const dx = ankleX, dy = ankleY - hip;
      const length = Math.hypot(dx, dy);
      const reach = .445;
      const distance = Math.min(length, reach * 1.999);
      const bend = Math.sqrt(Math.max(0, reach * reach - distance * distance / 4));
      const kneeX = ankleX / 2 - dy / (length || 1) * bend;
      const kneeY = (hip + ankleY) / 2 + dx / (length || 1) * bend;

      place(leg.thigh, 0, hip, kneeX, kneeY, leg.z);
      place(leg.shin, kneeX, kneeY, ankleX, ankleY, leg.z);
      leg.knee.position.set(kneeX, kneeY, leg.z);
      leg.ankle.position.set(ankleX, ankleY, leg.z);
      leg.foot.position.set(footX, footY, leg.z);
      leg.foot.rotation.z = toe;
    }

    for (let i = 0; i < arms.length; i++) {
      const arm = arms[i];
      const swing = Math.sin(phase + i * Math.PI) * .13 * motion;
      const elbowX = arm.near ? -.035 - swing * .2 : -.015 + swing * .55;
      const wristX = arm.near ? .125 + swing * .25 : -.075 + swing;
      const elbowY = arm.near ? 1.18 : 1.20;
      const wristY = arm.near ? 1.025 : 1.005;
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

  return { root, update };
}
