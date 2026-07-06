// placement.js — CAPTURE/PLACEMENT state machine, live ghost preview (no CSG during
// preview), scroll-along-ray depth, Q/E roll, R flip, T align. Commit = instantiate
// prefab or carve subtractable walls; both leave the photo reusable in its slot.

import * as THREE from 'three';
import { PLACEMENT } from '../config.js';
import { ghostMaterial, outlineMaterial } from '../world/materials.js';
import { buildCarveCutter, cutterDims } from './cutter.js';
import { events } from '../engine/events.js';

const _fwd = new THREE.Vector3();
const _pos = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _corner = new THREE.Vector3();
const _ghostBox = new THREE.Box3();
const _playerBox = new THREE.Box3();
const _down = new THREE.Vector3(0, -1, 0);
const _one = new THREE.Vector3(1, 1, 1);

export class PlacementController {
  constructor(scene, camera, world, player) {
    this.scene = scene;
    this.camera = camera;
    this.world = world;
    this.player = player;
    this.state = 'capture';
    this.prefab = null;
    this.slot = -1;
    this.ghost = null;
    this.ghostEdges = null;
    this.scrollOffset = 0;
    this.rollSteps = 0;
    this.flipped = false;
    this.valid = false;
    this.invalidReason = '';
    this.matrix = new THREE.Matrix4();
    this._rollAxis = new THREE.Vector3(0, 0, -1);

    // capture-volume preview: camera-space wireframe box, WYSIWYG for the shutter
    this.captureBoxVis = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 }));
    this.captureBoxVis.frustumCulled = false;
    camera.add(this.captureBoxVis);
  }

  arm(prefab, slot) {
    if (!prefab) return false;
    this.disarm();
    this.state = 'placement';
    this.prefab = prefab;
    this.slot = slot;
    this.scrollOffset = 0;
    this.rollSteps = 0;
    this.flipped = false;

    if (prefab.isEmpty) {
      const g = new THREE.BoxGeometry(prefab.cutterSize.x, prefab.cutterSize.y, prefab.cutterSize.z);
      this.ghost = new THREE.Mesh(g, ghostMaterial(true));
      this.ghost.userData.ownGeometry = true;
      this.ghostEdges = new THREE.LineSegments(new THREE.EdgesGeometry(g), outlineMaterial());
    } else {
      if (!prefab.ghostEdges) prefab.ghostEdges = new THREE.EdgesGeometry(prefab.geometry, 20);
      this.ghost = new THREE.Mesh(prefab.geometry, ghostMaterial(true));
      this.ghostEdges = new THREE.LineSegments(prefab.ghostEdges, outlineMaterial());
    }
    this.ghost.add(this.ghostEdges);
    this.scene.add(this.ghost);
    events.emit('mode-changed', this.state);
    return true;
  }

  disarm() {
    if (this.ghost) {
      this.scene.remove(this.ghost);
      if (this.ghost.userData.ownGeometry) this.ghost.geometry.dispose();
      if (this.ghostEdges && this.ghost.userData.ownGeometry) this.ghostEdges.geometry.dispose();
      this.ghost = null;
      this.ghostEdges = null;
    }
    if (this.state !== 'capture') {
      this.state = 'capture';
      this.prefab = null;
      this.slot = -1;
      events.emit('mode-changed', this.state);
    }
  }

  scroll(deltaY) {
    if (this.state !== 'placement') return;
    this.scrollOffset -= Math.sign(deltaY) * PLACEMENT.scrollStep;
  }

  roll(dir) { this.rollSteps += dir; }
  flip() { this.flipped = !this.flipped; }
  align() { this.rollSteps = 0; this.flipped = false; }

  update() {
    this.captureBoxVis.visible = this.state === 'capture' && this.player.enabled;
    if (this.captureBoxVis.visible) {
      const aim = this.world.raycastFromCamera(this.camera, 40);
      const dims = cutterDims(this.camera, aim ? aim.distance : PLACEMENT.defaultDist);
      this.captureBoxVis.position.set(0, 0, (dims.zNear + dims.zFar) / 2);
      this.captureBoxVis.scale.set(dims.halfW * 2, dims.halfH * 2, Math.abs(dims.zFar - dims.zNear));
    }

    if (this.state !== 'placement' || !this.ghost) return;

    this.camera.getWorldDirection(_fwd);
    const hit = this.world.raycast(this.camera.position, _fwd, PLACEMENT.maxDist);
    const baseDist = hit ? hit.distance : PLACEMENT.defaultDist;
    const dist = THREE.MathUtils.clamp(
      baseDist + this.scrollOffset, PLACEMENT.minDist, PLACEMENT.maxDist);
    _pos.copy(this.camera.position).addScaledVector(_fwd, dist);

    // roll axis: view forward flattened to the horizon (stable ramps); cached when degenerate
    const flatLen = Math.hypot(_fwd.x, _fwd.z);
    if (flatLen > 0.12) this._rollAxis.set(_fwd.x / flatLen, 0, _fwd.z / flatLen);
    const roll = this.rollSteps * PLACEMENT.rollStep + (this.flipped ? Math.PI : 0);
    _q.setFromAxisAngle(this._rollAxis, roll);

    // rotated local AABB
    _ghostBox.makeEmpty();
    const b = this.prefab.boundsLocal;
    for (let i = 0; i < 8; i++) {
      _corner.set(
        i & 1 ? b.max.x : b.min.x,
        i & 2 ? b.max.y : b.min.y,
        i & 4 ? b.max.z : b.min.z).applyQuaternion(_q);
      _ghostBox.expandByPoint(_corner);
    }

    // settle onto ground when a surface is near below (solid photos only)
    if (!this.prefab.isEmpty) {
      const halfBelow = -_ghostBox.min.y;
      const ground = this.world.raycast(_pos, _down, halfBelow + 1.4);
      if (ground) _pos.y = ground.point.y + halfBelow - PLACEMENT.floorEmbed;
    }

    this.matrix.compose(_pos, _q, _one);
    this.ghost.position.copy(_pos);
    this.ghost.quaternion.copy(_q);

    _ghostBox.min.add(_pos);
    _ghostBox.max.add(_pos);

    this.valid = true;
    this.invalidReason = '';
    if (this.prefab.isEmpty) {
      const walls = this.world.wallsIntersecting(_ghostBox)
        .filter(w => w.carveCount < PLACEMENT.maxCarvesPerWall);
      if (walls.length === 0) {
        this.valid = false;
        this.invalidReason = 'aim the empty photo at a cuttable wall';
      }
    } else {
      if (this.world.liveInserts() >= PLACEMENT.maxLiveInserts) {
        this.valid = false;
        this.invalidReason = 'undo a photo to place another (Z)';
      } else if (_ghostBox.intersectsBox(this.player.capsuleAABB(_playerBox))) {
        this.valid = false;
        this.invalidReason = 'step out of the frame';
      }
    }
    this.ghost.material = ghostMaterial(this.valid);
  }

  commit() {
    if (this.state !== 'placement' || !this.prefab) return { ok: false };
    if (!this.valid) return { ok: false, reason: this.invalidReason };
    const t0 = performance.now();
    let action;
    if (this.prefab.isEmpty) {
      const cutter = buildCarveCutter(this.prefab.cutterSize, this.matrix);
      if (!cutter) return { ok: false, reason: 'cannot cut here' };
      const items = [];
      for (const wall of this.world.wallsIntersecting(_ghostBox)) {
        const res = this.world.carveWall(wall, cutter);
        if (res.ok) items.push({ wallId: wall.id, prev: res.prev });
      }
      cutter.geometry.dispose();
      if (items.length === 0) return { ok: false, reason: 'cannot cut here' };
      action = { type: 'carve', items };
    } else {
      const entry = this.world.addPrefabInstance(this.prefab, this.matrix);
      action = { type: 'place', entryId: entry.id };
    }
    action.ms = performance.now() - t0;
    this.disarm();
    return { ok: true, action };
  }
}
