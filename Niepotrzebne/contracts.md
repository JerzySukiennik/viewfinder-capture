# contracts.md — module architecture + untouchable signatures (A01)

Companion to capture-spec.md. Signatures here don't change without updating both docs.

## Repo layout

```
index.html            -> redirect to v1/ (project Pages: ALL paths relative)
README.md
v1/
  index.html          game entry: import map (pinned), canvas, HUD DOM roots
  dev/smoke.html      P0 compatibility smoke test (kept runnable forever)
  src/
    config.js         keybindings, budgets, physics constants, palette
    engine/renderer.js    WebGLRenderer + UnrealBloomPass(half-res) + OutputPass, 60fps cap, FPS meter
    engine/events.js      tiny event bus: on(type, fn), emit(type, data)
    capture/cutter.js     hex template, buildBoxCutter(camera, dist), buildFrustumCutter(camera, dist),
                          manifold assert + winding-flip; returns { brush, geometry } or null
    capture/capture.js    takePhoto(world, camera) -> PhotoPrefab | null (whole shutter pipeline)
    capture/prefab.js     PhotoPrefab type + Inventory (slots, select, add/replace)
    capture/placement.js  PlacementController: state machine, ghost, commit; emits world-changed
    world/materials.js    palette, shared materials, cross-section material, procedural canvas textures
    world/props.js        buildProp(def) -> Mesh for box/ramp/cylinder/stairs/teleport/socket/battery
    world/world.js        World: loads level data, owns static BVH + mutable collider entries,
                          capturable brush cache, addPrefabInstance/removeInstance/carveWall/restoreWall
    player/controller.js  PlayerController: capsule + shapecast over world.colliders(), pointer lock
    systems/undo.js       UndoStack: push/undo/reset; action types capture|place|carve|battery
    systems/power.js      batteries, sockets, teleport state; completes level
    systems/save.js       localStorage progress
    levels/index.js       LEVELS registry [l1..l6]
    levels/level1.js ...  pure data (schema below)
    ui/hud.js             crosshair, slots, mode chip, prompts, help overlay, click-to-resume, fps
    ui/menu.js            main menu, level select, pause, intro/outro mood screens
    audio/audio.js        WebAudio synth SFX + ambient pad; resume on gesture (Safari)
    main.js               boot, game state machine (menu|playing|paused|transition), main loop
```

## Core types

```js
PhotoPrefab {
  id: string, geometry: BufferGeometry,      // compacted, recentered to bounds center
  materials: Material[],                     // [surface..., crossSection] via useGroups
  triCount: number, boundsLocal: Box3,
  isEmpty: boolean,                          // sky photo -> placement = carve
  cutterSize: Vector3,                       // camera-space box dims (sky carve volume)
  thumbnail: Texture | null                  // cosmetic RT snapshot (single shared 512 RT)
}

MutableEntry { id, kind: 'prefab'|'wall', mesh: Mesh, collGeo: BufferGeometry, bvh: MeshBVH,
               pristine?: { geometry, brush }, carveCount?: number }

UndoAction =
  | { type:'capture', slot, prevPrefab: PhotoPrefab|null, newPrefab }
  | { type:'place',   entryId }
  | { type:'carve',   wallId, prevGeo, prevBvh, prevMesh }   // swap back, no re-CSG
  | { type:'battery', batteryId, prev: BatteryState, next: BatteryState }
```

## Level schema (levels are DATA; gate for P3)

```js
{
  id: 'l1', name: 'First Light',
  mood: { intro: '...', outro: '...' },              // 1-2 dreamy EN lines each
  spawn: { pos: [x,y,z], yaw: rad },
  sky: { top: '#hex', bottom: '#hex', fog: '#hex' },
  static: [ PropDef... ],                            // frozen world (walkable shell, decor)
  capturables: [ PropDef+{ id } ],                   // closed low-poly solids ONLY (box|ramp|cylinder|stairs)
  subtractableWalls: [ PropDef+{ id } ],             // mutable, carvable by sky photos
  batteries: [ { id, pos } ],                        // physical pickup only, NEVER capturable
  sockets: [ { id, pos, rot? } ],
  teleport: { pos, rot?, requiresPower: bool, poweredBy: [socketId...] },
  photoSlots: 3, maxLiveInserts: 6,
  killY: number,                                     // fall respawn threshold
  tutorial: [ { text, trigger } ],                   // L1 prompts (EN, minimal)
  intendedSolution: [ 'step...', ... ],              // for QA agents, not runtime
  bounds: { toleranceNotes: '...' }
}
PropDef = { type:'box'|'ramp'|'cylinder'|'stairs', size:[..], pos:[..], rot?:[..], mat:'name',
            capturable?: true, outline?: true }
```

## Module contracts (the important ones)

- `World.colliders(): { geo, bvh }[]`      // [static, ...mutable]; consumers re-call EVERY frame
- `World.addPrefabInstance(prefab, matrix): entryId` // bakes world transform, builds per-instance BVH
- `World.carveWall(wallId, cutterBrush): {ok, undoData}` // SUBTRACTION, pristine kept
- `PlacementController.state: 'capture'|'placement'`  // LMB = shutter vs commit; RMB/Esc cancels
- `events`: 'world-changed' (player re-grounds), 'level-complete', 'photo-taken', 'mode-changed',
  'power-changed'
- `window.__vf` debug API (dev + QA agents): { state(), loadLevel(n), player position get/set,
  takePhoto(), armSlot(i), commitPlacement(), setGhostDistance(d), setRoll(rad), undo(), reset(),
  stats() -> { fps, drawCalls, triangles, geometries, textures, heapUsed, liveInserts } }

## Input map (config.js, single source of truth)

WASD move / Space jump / mouse look (pointer lock)
LMB shutter (CAPTURE) or commit (PLACEMENT) / RMB or Esc cancel placement
1-3 select slot + arm placement / X discard selected photo
scroll depth along ray / Q,E roll 15 deg / R flip 180 / T align (roll=0)
F interact (battery pickup / socket / teleport) / Z undo / P reset level
H help overlay / Esc pause menu (outside placement)

## Hard budgets (owner: performance / A40 veto)

CSG action < 150 ms; prefab <= 5k tris; live inserts soft cap 6 (levels need <= 4);
draw calls < 200; world tris < 200k; one shared 512 RT for thumbnails; steady-state 60 FPS capped;
pause loop on document.hidden. All disposals mandatory on undo/reset/level-unload.
