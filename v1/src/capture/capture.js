// capture.js — the shutter pipeline: cutter -> candidate INTERSECTIONs -> compact ->
// PhotoPrefab. Capture never mutates the world; any failure cancels the shot.

import * as THREE from 'three';
import { Evaluator, INTERSECTION } from 'three-bvh-csg';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { buildCutter } from './cutter.js';
import { CAPTURE, PLACEMENT } from '../config.js';
import { mat } from '../world/materials.js';

export const evaluator = new Evaluator();
evaluator.useGroups = true;
evaluator.consolidateGroups = true;
evaluator.attributes = ['position', 'normal'];

let prefabCounter = 0;

// evaluate() output uses oversized buffers + drawRange; slice to a compact
// non-indexed geometry, preserving material groups (0 = surface, 1 = cross-section).
export function compactCSG(geo) {
  const index = geo.index;
  const pos = geo.attributes.position, norm = geo.attributes.normal;
  const start = geo.drawRange.start;
  const count = Math.min(geo.drawRange.count,
    (index ? index.count : pos.count) - start);
  if (count <= 0) return null;

  let groups = geo.groups && geo.groups.length ? geo.groups : [{ start, count, materialIndex: 0 }];
  const outPos = [], outNorm = [], outGroups = [];
  let written = 0;
  for (const g of groups) {
    const gStart = Math.max(g.start, start);
    const gEnd = Math.min(g.start + g.count, start + count);
    if (gEnd <= gStart) continue;
    const from = written;
    for (let i = gStart; i < gEnd; i++) {
      const vi = index ? index.getX(i) : i;
      outPos.push(pos.getX(vi), pos.getY(vi), pos.getZ(vi));
      outNorm.push(norm.getX(vi), norm.getY(vi), norm.getZ(vi));
      written++;
    }
    outGroups.push({ start: from, count: written - from, materialIndex: g.materialIndex });
  }
  if (written === 0) return null;
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(outPos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(outNorm, 3));
  for (const g of outGroups) out.addGroup(g.start, g.count, g.materialIndex);
  return out;
}

export function takePhoto(world, camera) {
  const t0 = performance.now();
  const aim = world.raycastFromCamera(camera, CAPTURE.maxAimDist);
  const aimDist = aim ? aim.distance : PLACEMENT.defaultDist;
  const span = aim ? world.capturableSpanAt(camera, aim.point) : null;

  const cut = buildCutter(camera, aimDist, span);
  if (!cut) return { ok: false, reason: 'cannot photograph here' };
  const { brush: cutterBrush, dims } = cut;
  cutterBrush.geometry.computeBoundingBox();
  const cutterBox = cutterBrush.geometry.boundingBox;

  const pieces = [];
  let triTotal = 0;
  try {
    for (const cand of world.capturables()) {
      if (!cand.aabb.intersectsBox(cutterBox)) continue;
      const res = evaluator.evaluate(cand.brush, cutterBrush, INTERSECTION);
      const compact = compactCSG(res.geometry);
      res.geometry.dispose();
      if (!compact) continue;
      triTotal += compact.attributes.position.count / 3;
      pieces.push(compact);
      if (triTotal > CAPTURE.maxPrefabTris) break;
    }
  } catch (e) {
    console.warn('[capture] CSG failed, shot cancelled:', e);
    pieces.forEach(g => g.dispose());
    cutterBrush.geometry.dispose();
    return { ok: false, reason: 'cannot photograph here' };
  }
  cutterBrush.geometry.dispose();

  if (triTotal > CAPTURE.maxPrefabTris) {
    pieces.forEach(g => g.dispose());
    return { ok: false, reason: 'too much in frame' };
  }

  const cutterSize = new THREE.Vector3(
    dims.halfW * 2, dims.halfH * 2, Math.abs(dims.zFar - dims.zNear));
  const cutterCenterZ = (dims.zNear + dims.zFar) / 2;

  let prefab;
  if (pieces.length === 0) {
    // empty frame -> sky photo (placing it carves subtractable walls)
    prefab = {
      id: 'photo-' + (++prefabCounter),
      geometry: null, materials: null, triCount: 0,
      boundsLocal: new THREE.Box3(
        new THREE.Vector3(-cutterSize.x/2, -cutterSize.y/2, -cutterSize.z/2),
        new THREE.Vector3(cutterSize.x/2, cutterSize.y/2, cutterSize.z/2)),
      isEmpty: true, cutterSize, cutterCenterZ,
      thumbnail: null,
    };
  } else {
    const merged = pieces.length === 1
      ? pieces[0]
      : BufferGeometryUtils.mergeGeometries(pieces, true);
    if (pieces.length > 1) pieces.forEach(g => g.dispose());
    merged.computeBoundingBox();
    const center = merged.boundingBox.getCenter(new THREE.Vector3());
    merged.translate(-center.x, -center.y, -center.z);
    merged.computeBoundingBox();
    prefab = {
      id: 'photo-' + (++prefabCounter),
      geometry: merged,
      materials: [mat('capturable'), mat('cross')],
      triCount: triTotal,
      boundsLocal: merged.boundingBox.clone(),
      isEmpty: false, cutterSize, cutterCenterZ,
      thumbnail: null,
    };
  }
  prefab.msTaken = performance.now() - t0;
  return { ok: true, prefab };
}
