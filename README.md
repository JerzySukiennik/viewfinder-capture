# VIEWFINDER — capture

Browser puzzle game inspired by **Viewfinder** (Sad Owl Studios): photograph a piece of the
world, then place the photo — the captured geometry materializes as real, walkable 3D.
Real boolean CSG (frustum-clip on capture, subtraction for sky-photo wall carving), not a
stencil or portal trick.

**Play:** https://jerzysukiennik.github.io/viewfinder-capture/

## How it works

- Capture = CSG `INTERSECTION` of tagged capturable solids with a manifold box cutter built
  from a fixed-topology hexahedron template (winding-flip rule + closed-manifold assert
  before every boolean).
- Placement = live ghost preview (no CSG during preview), scroll-along-ray depth control,
  Q/E roll, R flip. Commit instantiates the geometry with its own collision BVH.
- Sky photos (empty frame) carve holes in subtractable walls via CSG `SUBTRACTION`.
- Collision: frozen static-world BVH + small per-object mutable BVHs
  (three-mesh-bvh capsule shapecast, characterMovement pattern).
- Undo/rewind = command stack of reversible operations; full reset re-instantiates the
  level from data. Levels are pure data files.

## Stack

three.js 0.173.0 · three-mesh-bvh 0.9.3 · three-bvh-csg 0.0.16 — pinned CDN ES modules,
zero build step. Procedural WebAudio SFX/ambient, no asset fetches; works offline from
GitHub Pages.

## Controls

WASD + mouse (pointer lock) · LMB photo/place · 1-3 arm photo · scroll depth ·
Q/E tilt · R flip · T straighten · RMB cancel · F interact · Z undo · P reset · H help

## Dev

Static server from repo root, open `/v1/`. CSG compatibility smoke test: `/v1/dev/smoke.html`.
Docs: `Niepotrzebne/capture-spec.md`, `Niepotrzebne/contracts.md`.
