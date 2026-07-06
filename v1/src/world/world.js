// world.js — owns the level instance: static world (frozen BVH built once) + mutable
// collider entries (placed prefabs, carvable walls), capturable brush cache, raycasts.

import * as THREE from 'three';
import { MeshBVH, StaticGeometryGenerator } from 'three-mesh-bvh';
import { Brush, SUBTRACTION } from 'three-bvh-csg';
import { evaluator, compactCSG } from '../capture/capture.js';
import { buildProp, propGeometry, buildTeleport, buildSocket, buildBattery } from './props.js';
import { mat } from './materials.js';
import { events } from '../engine/events.js';
import { PLACEMENT } from '../config.js';

const _ray = new THREE.Ray();
const _v = new THREE.Vector3();

let entryCounter = 0;

export class World {
  constructor(scene) {
    this.scene = scene;
    this.root = null;
    this.def = null;
    this.staticGeo = null;
    this.staticBvh = null;
    this.mutable = [];            // MutableEntry[]
    this.capturableEntries = [];
    this.teleport = null;
    this.sockets = [];
    this.batteries = [];
  }

  load(def) {
    this.unload();
    this.def = def;
    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.scene.background = new THREE.Color(def.sky?.bottom ?? 0xbfd9e8);
    this.scene.fog = new THREE.Fog(def.sky?.fog ?? 0xc4dce8, 40, 170);

    const hemi = new THREE.HemisphereLight(def.sky?.top ?? 0xdfeaf2, 0xa89a88, 1.25);
    const sun = new THREE.DirectionalLight(0xfff2e0, 1.7);
    sun.position.set(18, 30, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = sun.shadow.camera.bottom = -35;
    sun.shadow.camera.right = sun.shadow.camera.top = 35;
    sun.shadow.camera.far = 90;
    sun.shadow.bias = -3e-4;
    this.root.add(hemi, sun, sun.target);

    const staticMeshes = [];

    for (const d of def.static ?? []) {
      const m = buildProp(d);
      this.root.add(m);
      staticMeshes.push(m);
    }

    for (const d of def.capturables ?? []) {
      const m = buildProp({ ...d, capturable: true });
      this.root.add(m);
      staticMeshes.push(m);          // capture never consumes -> capturables are static colliders
      m.updateMatrixWorld(true);
      const baked = propGeometry(d);
      baked.applyMatrix4(m.matrixWorld);
      baked.computeBoundingBox();
      const brush = new Brush(baked, mat('capturable'));
      brush.updateMatrixWorld();
      this.capturableEntries.push({ id: d.id, mesh: m, brush, aabb: baked.boundingBox });
    }

    for (const d of def.subtractableWalls ?? []) {
      const m = buildProp(d);
      this.root.add(m);
      m.updateMatrixWorld(true);
      const baked = propGeometry(d);
      baked.applyMatrix4(m.matrixWorld);
      baked.computeBoundingBox();
      const brush = new Brush(baked.clone(), m.material);
      brush.updateMatrixWorld();
      this.mutable.push({
        id: d.id, kind: 'wall', mesh: m,
        collGeo: baked, bvh: new MeshBVH(baked.clone()),
        brush, carveCount: 0,
        pristine: { def: d },
      });
    }

    if (def.teleport) {
      this.teleport = buildTeleport(def.teleport);
      this.root.add(this.teleport);
      this.teleport.updateMatrixWorld(true);
      staticMeshes.push(...this.teleport.userData.collidable);
    }
    for (const s of def.sockets ?? []) {
      const g = buildSocket(s);
      g.userData.id = s.id;
      this.root.add(g);
      g.updateMatrixWorld(true);
      staticMeshes.push(...g.userData.collidable);
      this.sockets.push(g);
    }
    for (const b of def.batteries ?? []) {
      const g = buildBattery();
      g.position.fromArray(b.pos);
      g.userData.id = b.id;
      this.root.add(g);
      this.batteries.push(g);
    }

    this.root.updateMatrixWorld(true);
    const gen = new StaticGeometryGenerator(staticMeshes);
    gen.attributes = ['position'];
    this.staticGeo = gen.generate();
    this.staticGeo.computeBoundingBox();
    this.staticBvh = new MeshBVH(this.staticGeo);

    events.emit('world-changed', { reason: 'load' });
  }

  capturables() { return this.capturableEntries; }

  colliders() {
    const out = [{ geo: this.staticGeo, bvh: this.staticBvh }];
    for (const e of this.mutable) out.push({ geo: e.collGeo, bvh: e.bvh, entry: e });
    return out;
  }

  liveInserts() { return this.mutable.filter(e => e.kind === 'prefab').length; }

  raycast(origin, dir, far = 1000) {
    _ray.origin.copy(origin);
    _ray.direction.copy(dir);
    let best = null;
    for (const c of this.colliders()) {
      if (!c.bvh) continue;
      const hit = c.bvh.raycastFirst(_ray, THREE.DoubleSide);
      if (hit && hit.distance <= far && (!best || hit.distance < best.distance)) {
        best = hit;
        best.entryRef = c.entry ?? null;
      }
    }
    return best;
  }

  raycastFromCamera(camera, far) {
    camera.getWorldDirection(_v);
    return this.raycast(camera.position, _v, far);
  }

  addPrefabInstance(prefab, matrix) {
    const geo = prefab.geometry.clone();
    geo.applyMatrix4(matrix);
    geo.computeBoundingBox();
    const mesh = new THREE.Mesh(geo, prefab.materials);
    mesh.castShadow = mesh.receiveShadow = true;
    this.root.add(mesh);
    const entry = {
      id: 'entry-' + (++entryCounter), kind: 'prefab',
      mesh, collGeo: geo, bvh: new MeshBVH(geo.clone()),
    };
    this.mutable.push(entry);
    events.emit('world-changed', { reason: 'place' });
    return entry;
  }

  removePrefabEntry(id) {
    const i = this.mutable.findIndex(e => e.id === id);
    if (i === -1) return false;
    const e = this.mutable[i];
    this.root.remove(e.mesh);
    e.collGeo.dispose();
    e.bvh = null;
    this.mutable.splice(i, 1);
    events.emit('world-changed', { reason: 'undo-place' });
    return true;
  }

  wallsIntersecting(box) {
    return this.mutable.filter(e => {
      if (e.kind !== 'wall') return false;
      e.collGeo.computeBoundingBox();
      return e.collGeo.boundingBox.intersectsBox(box);
    });
  }

  carveWall(entry, cutterBrush) {
    if (entry.carveCount >= PLACEMENT.maxCarvesPerWall)
      return { ok: false, reason: 'wall too damaged' };
    let result;
    try {
      result = evaluator.evaluate(entry.brush, cutterBrush, SUBTRACTION);
      const compact = compactCSG(result.geometry);
      if (!compact) throw new Error('empty carve result');
      const prev = {
        mesh: entry.mesh, collGeo: entry.collGeo, bvh: entry.bvh,
        brush: entry.brush, carveCount: entry.carveCount,
      };
      this.root.remove(entry.mesh);
      result.castShadow = result.receiveShadow = true;
      this.root.add(result);
      entry.mesh = result;
      entry.collGeo = compact;
      entry.bvh = new MeshBVH(compact.clone());
      entry.brush = result;
      entry.carveCount++;
      events.emit('world-changed', { reason: 'carve' });
      return { ok: true, prev };
    } catch (e) {
      console.warn('[carve] failed:', e);
      if (result?.geometry) result.geometry.dispose();
      return { ok: false, reason: 'cannot cut here' };
    }
  }

  restoreWall(entry, prev) {
    // dispose the carved state we're rolling back
    if (entry.mesh !== prev.mesh) {
      this.root.remove(entry.mesh);
      entry.mesh.geometry?.dispose();
    }
    if (entry.collGeo !== prev.collGeo) entry.collGeo.dispose();
    entry.mesh = prev.mesh;
    entry.collGeo = prev.collGeo;
    entry.bvh = prev.bvh;
    entry.brush = prev.brush;
    entry.carveCount = prev.carveCount;
    this.root.add(entry.mesh);
    events.emit('world-changed', { reason: 'undo-carve' });
  }

  unload() {
    if (!this.root) return;
    this.root.traverse(o => {
      if (o.isMesh || o.isLineSegments) {
        o.geometry?.dispose();
        if (o.material?.isMaterial && o.material.userData?.owned) o.material.dispose();
      }
    });
    this.scene.remove(this.root);
    for (const e of this.mutable) { e.collGeo?.dispose(); e.bvh = null; }
    for (const c of this.capturableEntries) c.brush.geometry.dispose();
    this.staticGeo?.dispose();
    this.staticBvh = null;
    this.root = null;
    this.mutable = [];
    this.capturableEntries = [];
    this.teleport = null;
    this.sockets = [];
    this.batteries = [];
  }

  reset() {
    const def = this.def;
    this.load(def);
  }
}
