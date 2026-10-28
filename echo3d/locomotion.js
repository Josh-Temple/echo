import { SPEED, JUMP_SPEED } from './simulation.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = t => t * t * (3 - 2 * t);
const SIDE = 1.1;

// The simulation owns position and timing. This controller changes only the
// visible pose: planted feet retain their world positions until lifted.
export function createLocomotion() {
  const feet = [-.115, .115].map(z => ({ z, x: 0, worldZ: SIDE + z, y: .006, planted: false, forced: false, startX: 0, startZ: 0, progress: 0 }));
  let previous = null, airborneTime = 0;
  function update(s, yaw) {
    const dt = previous ? clamp(s.time - previous.time, 0, .05) : 0;
    const reset = !previous || s.time < previous.time || Math.abs(s.x - previous.x) > 2 || s.falls !== previous.falls;
    const landed = previous && !previous.grounded && s.grounded;
    const c = Math.cos(yaw), sn = Math.sin(yaw);
    const world = (x, z) => ({ x: s.x + c * x + sn * z, z: SIDE - sn * x + c * z });
    const local = (x, z) => ({ x: c * (x - s.x) - sn * (z - SIDE), z: sn * (x - s.x) + c * (z - SIDE) });
    const speed = clamp(Math.abs(s.vx) / SPEED, 0, 1);
    const direction = Math.sign(s.vx) || s.face || 1;
    if (reset) {
      for (const foot of feet) {
        const p = world(0, foot.z);
        Object.assign(foot, {x:p.x, worldZ:p.z, y:.006, planted:true, forced:false, progress:0});
      }
      airborneTime = 0;
    } else if (landed) {
      for (const foot of feet) { foot.y = .006; foot.planted = true; foot.forced = false; }
    }
    if (!s.grounded) airborneTime += dt;
    else airborneTime = 0;

    const result = feet.map((foot, i) => {
      const cycle = ((s.phase * 1.15 / (Math.PI * 2) + i * .5) % 1 + 1) % 1;
      const previousCycle = previous ? ((previous.phase * 1.15 / (Math.PI * 2) + i * .5) % 1 + 1) % 1 : cycle;
      const wantsStance = cycle < .55;
      if (!s.grounded) {
        foot.planted = false; foot.forced = false;
        const rise = clamp(s.vy / JUMP_SPEED, -1, 1);
        const airX = i === 0 ? -.16 - .05 * rise : .21 + .035 * rise;
        const airY = i === 0 ? .18 + .03 * (1 - rise) : .24 + .04 * rise;
        const target = world(airX, foot.z);
        // The first part of takeoff blends from the last grounded pose.
        const blend = smooth(clamp(airborneTime / .13, 0, 1));
        if (previous?.grounded) { foot.startX = foot.x; foot.startZ = foot.worldZ; }
        foot.x = foot.startX + (target.x - foot.startX) * blend;
        foot.worldZ = foot.startZ + (target.z - foot.startZ) * blend;
        foot.y = .006 + (airY - .006) * blend;
      } else if (speed < .025) {
        if (!foot.planted) {
          const target = world(0, foot.z), a = 1 - Math.exp(-10 * dt);
          foot.x += (target.x - foot.x) * a; foot.worldZ += (target.z - foot.worldZ) * a;
          foot.y += (.006 - foot.y) * a;
          if (foot.y < .009 && Math.abs(foot.x - target.x) < .025) { foot.y = .006; foot.planted = true; }
        }
      } else {
        const enteredStance = wantsStance && previousCycle >= .55;
        if (enteredStance && !foot.forced) {
          // Finish at the preceding swing position and freeze that position.
          foot.y = .006; foot.planted = true;
        }
        if (!wantsStance && foot.planted) {
          foot.startX = foot.x; foot.startZ = foot.worldZ; foot.planted = false;
        }
        // A start or reversal can enter a cycle halfway through a stance. Do
        // not stretch a leg indefinitely while waiting for the next phase.
        if (wantsStance && foot.planted && Math.abs(foot.x - s.x) > .48 && feet[1-i].planted) {
          foot.startX = foot.x; foot.startZ = foot.worldZ; foot.planted = false; foot.forced = true; foot.progress = 0;
        }
        if (!foot.planted) {
          const t = foot.forced ? (foot.progress = clamp(foot.progress + dt * (3 + 7 * speed), 0, 1)) : clamp((cycle - .55) / .45, 0, 1);
          const ease = smooth(t);
          const target = world(direction * c * .34, foot.z);
          // Moving the target with the pelvis anticipates the next contact.
          foot.x = foot.startX + (target.x - foot.startX) * ease;
          foot.worldZ = foot.startZ + (target.z - foot.startZ) * ease;
          foot.y = .006 + Math.sin(Math.PI * t) * .14 * Math.min(1, speed * 4);
          if (foot.forced && t >= 1) { foot.forced = false; foot.planted = true; foot.y = .006; }
        }
      }
      const p = local(foot.x, foot.worldZ);
      return {x:p.x, y:foot.y, z:p.z, worldX:foot.x, worldZ:foot.worldZ, planted:foot.planted, cycle};
    });
    previous = {x:s.x, time:s.time, phase:s.phase, grounded:s.grounded, falls:s.falls};
    return result;
  }
  return {update};
}
