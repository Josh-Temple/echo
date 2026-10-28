# ECHO protagonist: toon rendering and motion

The ordinary game keeps the same simulation, progression, background and
camera. The new character uses an original procedural model and a local,
nearest-filtered three-value `MeshToonMaterial` ramp. Five selective
back-face hulls outline the jacket, head, shoes and handgun; they need no
full-screen post-processing. Dark blue-green values stay within the existing
palette. No reference-game assets are used.

Feet retain their world positions during the planted portion of a step. Swing,
turning, rising, falling and landing affect only the visual pose; the fixed-step
simulation, speed, gravity and airborne steering are unchanged. Two-bone leg
IK and a pelvis height constraint prevent the procedural limbs from extending
past their intended lengths. The existing contact shadow stays on the floor.
This is still a simplified procedural animation, not motion capture or a full
physical character rig.

## Footfall pacing and lower-leg shape (2026-10-28)

The gait phase multiplier is reduced from 1.15 to 1.0 (roughly 13% fewer
visual gait cycles over the same distance). Stance occupies 52% rather than
55% of each cycle, while each foot aims slightly farther ahead. The swing
arc drops from 0.14 m to 0.108 m and emergency step recovery is eased.
This keeps the planted-foot behavior and does **not** change simulation
speed, jumping distance, gravity, or checkpoints. Arm swing and torso bob
are synchronized with the slower visible leg cycle.

A ring-shaped upper leg and calf now narrow toward knee and ankle; the shoes
have a shaped instep and rounded toe, a separate heel, toe cap, ankle cuff,
and modest toe lift only while swinging. Planted shoes remain level. These
are procedural meshes, not authored skeletal animation; verify their
silhouette at normal camera distance as well as in the close inspection view.

Run `npm test`, then the character visual QA workflow. Its images and
fixed-step clip support side-by-side review, but cannot by themselves
establish Android device performance or subjective animation quality.

## Comparison controls

Append `?debug=1` to `webgl-study.html` to expose these optional comparisons:

- `&character=legacy` — exact original model, materials and motion.
- `&character=legacy-toon` — original geometry and motion with toon materials.
- Omit `character` — revised geometry, toon materials and motion.
- `&view=close` — follow the protagonist with an inspection camera.
- `&bands=2` or `&bands=4` — compare with the default three-band ramp.
- `&outline=0` — inspect the revised character without the outline.

For example, `webgl-study.html?debug=1&character=legacy&view=close` is the old
close-up. Controls and gameplay still work in the inspection view. These
switches are for QA and are also included in the offline export.

`tests/character-visual.mjs` captures the original main commit and the current
branch in the same scene, including normal, close and phone-sized views. The
workflow also records short motion clips and renderer counters. The fixed-step
24 fps video is assembled frame by frame and is not a real-time performance
measurement. Software WebGL results do not establish performance, thermal stability or touch behavior on a
physical Android device.

## Implementation choice

The original procedural model already has named parts and an existing two-bone
rig. Refining it preserves the current offline exporter and avoids adding a GLB
loader, asset pipeline or runtime dependency. Blender was unavailable in the
local execution environment; a Blender-produced, skinned and animated GLB was
therefore not created or validated. A GLB remains an option if future authored
anatomy and animation justify the additional pipeline.
