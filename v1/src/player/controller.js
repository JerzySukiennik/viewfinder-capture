// controller.js — kinematic capsule vs BVH shapecast (characterMovement pattern) over
// static + mutable colliders. Seam defenses built in: skin offset, ground-snap ray,
// escaped-capsule clamp before respawn.

import * as THREE from 'three';
import { PLAYER } from '../config.js';
import { events } from '../engine/events.js';

const _seg = new THREE.Line3();
const _box = new THREE.Box3();
const _triPoint = new THREE.Vector3();
const _capPoint = new THREE.Vector3();
const _delta = new THREE.Vector3();
const _move = new THREE.Vector3();
const _down = new THREE.Vector3(0, -1, 0);

export class PlayerController {
  constructor(camera, world) {
    this.camera = camera;
    this.world = world;
    this.position = new THREE.Vector3();      // capsule top center == eye
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.grounded = false;
    this.lastGrounded = new THREE.Vector3();
    this.clampsSinceGround = 0;
    this.enabled = true;
    this._stepDist = 0;
    events.on('world-changed', () => { this._groundStale = true; });
  }

  spawn(pos, yaw = 0) {
    this.position.set(pos[0], pos[1] + PLAYER.eyeHeight, pos[2]);
    this.velocity.set(0, 0, 0);
    this.yaw = yaw;
    this.pitch = 0;
    this.grounded = false;
    this.lastGrounded.copy(this.position);
    this.clampsSinceGround = 0;
    this.syncCamera();
  }

  look(dx, dy) {
    this.yaw -= dx * 0.0022;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.0022, -1.45, 1.45);
    this.syncCamera();
  }

  syncCamera() {
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.set(this.pitch, this.yaw, 0);
    this.camera.position.copy(this.position);
  }

  update(dt, input) {
    if (!this.enabled) return;
    const steps = PLAYER.physicsSteps;
    const sub = dt / steps;
    for (let i = 0; i < steps; i++) this._step(sub, input);

    // kill-plane: first trip -> clamp to last grounded (fell through a seam or off an edge),
    // still falling after that -> respawn at level spawn
    const killY = this.world.def?.killY ?? -50;
    if (this.position.y < killY) {
      if (this.clampsSinceGround === 0 && this.lastGrounded.y > killY) {
        this.position.copy(this.lastGrounded);
        this.velocity.set(0, 0, 0);
        this.clampsSinceGround++;
        events.emit('player-clamped');
      } else {
        this.spawn(this.world.def.spawn.pos, this.world.def.spawn.yaw ?? 0);
        events.emit('player-respawned');
      }
    }
    this.syncCamera();

    // footstep cadence for audio
    if (this.grounded) {
      const hSpeed = Math.hypot(this.velocity.x, this.velocity.z);
      this._stepDist += hSpeed * dt;
      if (hSpeed > 1 && this._stepDist > 2.1) {
        this._stepDist = 0;
        events.emit('footstep');
      }
    }
  }

  _step(dt, input) {
    const wasGrounded = this.grounded;

    let ix = 0, iz = 0;
    if (input.forward) iz -= 1;
    if (input.back) iz += 1;
    if (input.left) ix -= 1;
    if (input.right) ix += 1;
    const len = Math.hypot(ix, iz) || 1;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const wishX = (ix * cos + iz * sin) / len * PLAYER.speed;
    const wishZ = (iz * cos - ix * sin) / len * PLAYER.speed;

    if (this.grounded) {
      this.velocity.x = wishX;
      this.velocity.z = wishZ;
      if (input.jump) {
        this.velocity.y = PLAYER.jumpSpeed;
        this.grounded = false;
        events.emit('jump');
      }
    } else {
      const blend = 1 - Math.exp(-PLAYER.airControl * 4 * dt);
      this.velocity.x += (wishX - this.velocity.x) * blend;
      this.velocity.z += (wishZ - this.velocity.z) * blend;
    }
    this.velocity.y += PLAYER.gravity * dt;

    _move.copy(this.velocity).multiplyScalar(dt);
    this.position.add(_move);

    // capsule vs every collider (all collider geometry is world-space, identity transform)
    _seg.start.copy(this.position);
    _seg.end.copy(this.position); _seg.end.y -= PLAYER.segmentLen;
    const R = PLAYER.radius;
    _box.makeEmpty();
    _box.expandByPoint(_seg.start);
    _box.expandByPoint(_seg.end);
    _box.min.addScalar(-(R + PLAYER.skin));
    _box.max.addScalar(R + PLAYER.skin);

    for (const c of this.world.colliders()) {
      if (!c.bvh) continue;
      c.bvh.shapecast({
        intersectsBounds: box => box.intersectsBox(_box),
        intersectsTriangle: tri => {
          const dist = tri.closestPointToSegment(_seg, _triPoint, _capPoint);
          if (dist < R) {
            const depth = R - dist;
            _delta.copy(_capPoint).sub(_triPoint).normalize();
            _seg.start.addScaledVector(_delta, depth);
            _seg.end.addScaledVector(_delta, depth);
          }
        },
      });
    }

    _delta.copy(_seg.start).sub(this.position);
    this.grounded = _delta.y > Math.abs(dt * this.velocity.y * 0.25) && _delta.y > 0;
    const offset = Math.max(0, _delta.length() - 1e-7);
    if (offset > 0) {
      _delta.normalize();
      this.position.addScaledVector(_delta, offset);
      if (!this.grounded) {
        this.velocity.addScaledVector(_delta, -_delta.dot(this.velocity));
      }
    }

    // ground-snap: bridges hairline CSG seams and keeps ramp/stair descent glued
    if (!this.grounded && wasGrounded && this.velocity.y <= 0.1) {
      const footY = this.position.y - PLAYER.segmentLen - R;
      const hit = this.world.raycast(this.position, _down,
        PLAYER.segmentLen + R + PLAYER.groundSnapDist);
      if (hit && hit.point.y >= footY - PLAYER.groundSnapDist) {
        this.position.y = hit.point.y + PLAYER.segmentLen + R;
        this.grounded = true;
      }
    }

    if (this.grounded) {
      this.velocity.y = Math.max(this.velocity.y, 0);
      if (this.velocity.y > 0 && !input.jump) this.velocity.y = 0;
      this.lastGrounded.copy(this.position);
      this.clampsSinceGround = 0;
    }
  }

  capsuleAABB(target) {
    target.min.set(
      this.position.x - PLAYER.radius,
      this.position.y - PLAYER.segmentLen - PLAYER.radius,
      this.position.z - PLAYER.radius);
    target.max.set(
      this.position.x + PLAYER.radius,
      this.position.y + PLAYER.radius,
      this.position.z + PLAYER.radius);
    return target;
  }
}
