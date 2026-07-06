# capture-spec.md — dynamic photo capture core (P0 research output)

Status: LOCKED after P0 smoke test (2026-07-06). Owner: A00/A01.

## Locked CDN versions (smoke-tested in browser, ALL GREEN)

```
three            0.173.0  https://cdn.jsdelivr.net/npm/three@0.173.0/build/three.module.js
three/addons/    0.173.0  https://cdn.jsdelivr.net/npm/three@0.173.0/examples/jsm/
three-mesh-bvh   0.9.3    https://cdn.jsdelivr.net/npm/three-mesh-bvh@0.9.3/build/index.module.js
three-bvh-csg    0.0.16   https://cdn.jsdelivr.net/npm/three-bvh-csg@0.0.16/build/index.module.js
```

peerDeps verified: csg 0.0.16 wants three>=0.151.0, mesh-bvh>=0.6.6 — satisfied.
Smoke results: box INTERSECTION 12 tris; frustum-cutter INTERSECTION OK; wall SUBTRACTION 68 tris;
5x INTERSECTION = 5.1 ms; useGroups -> 2 groups / 2-material array; MeshBVH builds from result.
Nobody changes these versions without re-running v1/dev/smoke.html.

## Model (what we build vs the original)

Original Viewfinder: photo stores a frustum-sliced duplicate of the world; placement slices the live
world to make a hole and pastes the duplicate, scaled so its frustum matches the eye-to-photo frustum.
Rotation is ROLL around the view axis (mouse wheel in original) + an "align" snap action. Sky photos
erase geometry. Rewind is the safety net that makes experimentation free.

Ours (per prompt, depth-reprojection explicitly rejected):
- capture = CSG INTERSECTION of tagged `capturable` solids with a manifold cutter volume -> PhotoPrefab
- capture is NON-CONSUMING (world untouched; like the original, a photo copies)
- photo = reusable template; placement instantiates a copy (soft cap on live instances <= 6)
- placement position = crosshair raycast + scroll-along-ray; rotation = Q/E roll around flattened
  view axis (15 deg steps), R = 180 flip (ceiling-flip), T = align (roll -> 0). Live ghost preview.
- empty capture (no capturable in volume) => "sky photo" prefab; placing it SUBTRACTS its volume
  from `subtractableWall` objects (L4). Solid photos only ADD in v1.
- battery meshes are NEVER capture candidates (invariant).

## Cutter construction (fixed-topology hexahedron template)

- 8 corners, order: 0-3 quad at z=-1 in (-1,-1)(+1,-1)(+1,+1)(-1,+1) order, 4-7 same at z=+1.
- 12 hardcoded triangles (see cutter.js HEX_INDICES) — topology and winding NEVER change,
  only the 8 vertex positions move.
- Tier-2 (DEFAULT): box in camera space — cross-section = HUD frame extents at aim distance D,
  z from -near to -(D + depth margin) — transformed to world by camera matrixWorld.
- Tier-3 (flag-gated polish): unproject NDC corners (+-frame, near/far) of the player camera.
- **Winding flip rule (smoke-test proven):** NDC->world unprojection INVERTS orientation
  (signed volume came out negative). After building ANY cutter: compute signed volume; if < 0,
  swap index pairs (i+1 <-> i+2) and recompute normals. Deterministic, still fixed topology.
- **Asserts before evaluate() (both cheap, both mandatory):**
  1. closed manifold + consistent winding: every directed edge appears exactly once and its
     reverse exists;
  2. signed volume > 0 after the flip rule.
  Assert fails => cancel capture (HUD hint), never evaluate.
- **Coplanar jitter:** offset cutter corners by ~1e-3 pseudo-random per-shot to avoid exactly
  coplanar faces vs axis-aligned level geometry (three-bvh-csg issues #210/#199: coplanar =
  artifacts + perf cliff).

## Capture pipeline (shutter)

1. Build cutter Brush (template above), updateMatrixWorld().
2. Candidates: meshes with userData.capturable === true AND world AABB intersects cutter AABB.
   Never scan whole scene. Skip userData.battery === true.
3. Per candidate: evaluator.evaluate(candidateBrush, cutterBrush, INTERSECTION) in try/catch.
   Candidate brushes are prepared ONCE at level load (world-space baked geometry, identity
   transform) so halfEdges/boundsTree caches persist across shots.
4. Merge per-candidate results into one prefab geometry (compact drawRange first — evaluate()
   output uses oversized buffers + drawRange; slice to real size before anything else).
5. Triage: empty result => sky photo IF cutter volume free of static hits, else cancel.
   triCount > 5000 => cancel. Exception => cancel. World never mutated by capture.
6. Recenter geometry to bounds center; store PhotoPrefab { id, geometry, materials (surface +
   cross-section via useGroups), triCount, boundsLocal, isEmpty, cutterSize }.
7. Evaluator: ONE global instance, useGroups = true, consolidateGroups = true,
   attributes = ['position','normal'] (procedural geometry has no UVs).

## Placement pipeline (commit)

1. Ghost (MeshBasicMaterial transparent 0.35, depthWrite false, + edges) follows
   raycast(hit) + scrollOffset along ray each frame; queries CURRENT colliders (static + mutable),
   re-fetched every frame. No CSG during preview. Red tint + commit block when overlapping player
   capsule or level no-place zones; sky photos require intersecting a subtractableWall.
   Anchor: floor hit (normal.y > 0.5) => bounds bottom at hit point minus 3 cm embed;
   wall hit or no hit => bounds center at point (no-hit default distance 8 m). Clamp [1.5, 30] m.
2. Commit solid photo: bake world transform into a compacted geometry copy, scene.add render mesh,
   new MeshBVH for THIS instance only (per-instance colliders, no monolithic mutable merge),
   push undo entry, emit world-changed. Placement flash masks any hitch.
3. Commit sky photo: for each intersecting subtractableWall: evaluate(wallBrush, cutterBoxBrush,
   SUBTRACTION) => swap wall mesh+collider to result; keep PRISTINE original geometry+brush for
   undo/reset (chained CSG degrades — cap carve chain per wall at 3, then reject with hint).
4. Budgets: single CSG action < 150 ms (target < 80), prefab <= 5k tris, live instances soft cap 6
   (HUD hint "undo a photo to place another"), no level REQUIRES more than 4.

## Collider architecture (decoupled, per prompt sec. 2)

- STATIC: StaticGeometryGenerator(attributes=['position']) over all static level meshes ONCE at
  load => one MeshBVH. Never rebuilt. Includes capturables (capture never consumes).
- MUTABLE: list of independent entries { id, kind: prefab|wall, mesh, collGeo, bvh }. Placement
  adds an entry; carve swaps a wall entry's geo+bvh; undo removes/swaps back. No merged rebuild —
  each entry has its own small BVH, so "rebuild" cost = one new MeshBVH over <= 5k tris.
- Player shapecast + ghost raycast iterate [static, ...mutable] (AABB-reject first).
- All collision geometry baked to WORLD space, identity transforms => no frame conversions.

## Known edge cases (from research; each has a triage path)

- Solid sliced in half by cutter face => fine (CSG caps it; caps get cutter material).
- Geometry behind near plane / player inside capturable => cutter starts 0.4 m from camera.
- Sliver cutter faces (extreme aim angles) => manifold assert catches degenerate; cancel.
- Coplanar cutter vs box faces => jitter (above).
- Re-capturing placed prefabs => forbidden (instances not tagged capturable) — avoids chained
  CSG degradation and infinite duplication.
- Undo/reset MUST dispose: geometry, per-instance BVH, ghost clones, thumbnail RT contents.
  Brush caches (halfEdges/boundsTree) live on geometry — disposeCacheData on level unload.

## FPS regimes (contract for adversaries)

- Steady-state (movement): 60 FPS target, hard invariant quality bar. Frame cap at 60 (accumulator)
  so 120 Hz displays don't burn the Intel/AMD thermals.
- Discrete action (capture/place/undo): intentional freeze <= 150 ms masked by shutter/flash
  animation. NOT a 60-FPS violation; A70 must not report it as P0.
