# ECHO — Reservoir 3D study

The merged `webgl-study.html` prototype already existed on main at
`cf5d571e274ebaec54ee3250870ba947d5c1747b`. This revision turns that isolated
study into a playable reservoir passage with a complete start → traversal →
gate → ending → replay loop. The original 2D `index.html` is unchanged.

## Visual direction

An original industrial reservoir, informed by INSIDE's restraint, depth and
silhouette readability. No images, models, characters, sounds or other assets
from INSIDE are used. All game geometry and surface variation are procedural.

- Perspective camera with damped look-ahead, foreground columns and cables,
  distant windows and gallery, machinery, pipes and submerged structures.
- Low-saturation lighting, distance fog, shaft haze, directional shadows,
  small dust particles, and an actual planar water reflection with mild ripples.
- Original adult proportions, small head, two-bone legs, stance/swing gait,
  breathing, landing compression, carried pistol and projected contact shadow.
- Sparse Japanese menus, accessible focus states, keyboard pause and settings,
  portrait/landscape touch controls, safe-area spacing and reduced-motion support.
- Quiet synthesized footfalls, landing and mechanical sounds. No music.

## Runtime boundaries

`simulation.js` owns the game state independently of Three.js. A fixed 120 Hz
step separates game behavior from frame rate. The character conserves horizontal
momentum in the air. Jump buffering, coyote time and checkpoint recovery soften
the short traversal. Landings only occur when crossing the floor from above.
The original second gap was longer than the original jump range; both revised
gaps fit the verified trajectory. The gate physically blocks the exit until opened.

Short jump/use presses are latched until a simulation step consumes them.
Per-pointer state supports simultaneous mobile movement and jumping. Input is
cleared on blur, pause, cancellation and replay. Context loss pauses the game;
restoration regenerates the environment map and resumes through the pause menu.

Static boxes are instanced by material. Three spotlight slots follow the nearest
fixtures without changing shader light counts. High/medium use 2048/1024 shadow
maps and 768×384/512×256 reflections. Low disables the reflection, shafts, dust
and dynamic shadows. Auto reduces quality after sustained low frame rate.
Menus do not continually redraw the unchanged WebGL view.

## Run and export

```sh
python3 -m http.server 8000
# Open http://localhost:8000/webgl-study.html
npm test
python3 scripts/build-standalone.py /tmp/ECHO_3D_Preview.html
```

The standalone export embeds the pinned modules, font, CSS and licenses. It can
be opened from a local file in a WebGL-capable browser; no runtime network request
is required. The optional 2D link opens the existing public 2D version.

Browser verification uses `tests/browser-smoke.mjs`; provide an installed
Playwright module and Chromium executable with `PLAYWRIGHT_MODULE` and
`CHROMIUM_PATH`. Screenshots are internal QA evidence, not shipped game assets.

## Verified on the reconstructed source

- Seven simulation tests passed.
- 24 browser checks passed, including both gaps, the exit, replay, context
  restoration and real multitouch at 390×844, 360×800 and 844×390.
- No JavaScript or shader errors, and no external runtime requests were observed.
- The standalone file loaded from `file://`; movement and a short jump press
  worked. Its final landscape touch labels fit without wrapping.
- Machine-readable results and runtime hashes: `3d-browser-results.json`.

## Provenance and limits

- Three.js 0.169.0, Reflector and RoomEnvironment: pinned upstream code, MIT
  (`vendor/THREE-LICENSE.txt`). Addon import paths point to the local core module.
- Noto Sans JP subset: Google Fonts, SIL OFL (`vendor/NOTO-LICENSE.txt`).
- This is a short atmosphere/traversal prototype, not a complete game or an
  asset-authored production level. The exit silhouette is a staged event, not a
  recorded replay of the player's past actions.
- Browser verification uses software WebGL. It does not establish physical
  Android frame rate, device thermal behavior, or Safari compatibility.
- The prior local-only revision was lost when the temporary environment reset.
  This revision was reconstructed from its implementation record and the saved
  GitHub baseline, then tested again. Previous test reports are not reused as
  evidence for the reconstructed source.
