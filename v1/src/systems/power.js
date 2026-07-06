// power.js — batteries (physical pickup only, NEVER capturable), sockets, teleport.
// Teleport lights up when all required sockets are fed; walking into it completes the level.

import * as THREE from 'three';
import { mat } from '../world/materials.js';
import { events } from '../engine/events.js';

const _v = new THREE.Vector3();

export class PowerSystem {
  constructor(camera) {
    this.camera = camera;
    this.world = null;
    this.batteries = [];      // { id, mesh, loc: 'world'|'held'|'socket', worldPos, socketId }
    this.held = null;
    this.completed = false;
    this._t = 0;
  }

  load(world) {
    this.world = world;
    this.held = null;
    this.completed = false;
    this.batteries = world.batteries.map(mesh => ({
      id: mesh.userData.id, mesh,
      loc: 'world', worldPos: mesh.position.clone(), socketId: null,
    }));
    this._applyVisuals();
  }

  requiredSockets() {
    return this.world?.def.teleport?.poweredBy ?? [];
  }

  isPowered() {
    if (!this.world?.def.teleport?.requiresPower) return true;
    return this.requiredSockets().every(sid =>
      this.batteries.some(b => b.loc === 'socket' && b.socketId === sid));
  }

  socketFed(sid) {
    return this.batteries.some(b => b.loc === 'socket' && b.socketId === sid);
  }

  // F pressed: pick up / deposit / take back. Returns an undoable action or null.
  interact(playerPos) {
    if (this.held) {
      const socket = this._nearestFreeSocket(playerPos, 2.6);
      if (socket) {
        const b = this.held;
        const prev = this._stateOf(b);
        b.loc = 'socket';
        b.socketId = socket.userData.id;
        this.held = null;
        this._applyVisuals();
        events.emit('power-changed');
        return { type: 'battery', batteryId: b.id, prev, next: this._stateOf(b), verb: 'deposit' };
      }
      // no socket near: put it down at the player's feet
      const b = this.held;
      const prev = this._stateOf(b);
      b.loc = 'world';
      b.worldPos = playerPos.clone().add(_v.set(0, -1.1, 0));
      const ground = this.world.raycast(b.worldPos.clone().add(_v.set(0, 1, 0)), _v.set(0, -1, 0), 4);
      if (ground) b.worldPos.y = ground.point.y + 0.22;
      this.held = null;
      this._applyVisuals();
      events.emit('power-changed');
      return { type: 'battery', batteryId: b.id, prev, next: this._stateOf(b), verb: 'drop' };
    }
    const b = this._nearestBattery(playerPos, 2.4);
    if (b) {
      const prev = this._stateOf(b);
      b.loc = 'held';
      b.socketId = null;
      this.held = b;
      this._applyVisuals();
      events.emit('power-changed');
      return { type: 'battery', batteryId: b.id, prev, next: this._stateOf(b), verb: 'pickup' };
    }
    return null;
  }

  interactionHint(playerPos) {
    if (this.held) {
      return this._nearestFreeSocket(playerPos, 2.6)
        ? 'F — slot the battery' : 'F — put the battery down';
    }
    return this._nearestBattery(playerPos, 2.4) ? 'F — take the battery' : null;
  }

  _stateOf(b) {
    return { loc: b.loc, worldPos: b.worldPos?.clone() ?? null, socketId: b.socketId };
  }

  applyBatteryState(id, s) {
    const b = this.batteries.find(x => x.id === id);
    if (!b) return;
    if (b === this.held && s.loc !== 'held') this.held = null;
    b.loc = s.loc;
    b.worldPos = s.worldPos ? s.worldPos.clone() : b.worldPos;
    b.socketId = s.socketId;
    if (s.loc === 'held') this.held = b;
    this._applyVisuals();
    events.emit('power-changed');
  }

  _nearestBattery(pos, maxDist) {
    let best = null, bd = maxDist;
    for (const b of this.batteries) {
      if (b.loc !== 'world' && b.loc !== 'socket') continue;
      const p = b.loc === 'socket' ? this._socketMesh(b.socketId)?.position : b.worldPos;
      if (!p) continue;
      const d = _v.copy(p).sub(pos).setY(0).length() + Math.abs(p.y - (pos.y - 1)) * 0.4;
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  _nearestFreeSocket(pos, maxDist) {
    let best = null, bd = maxDist;
    for (const s of this.world.sockets) {
      if (this.socketFed(s.userData.id)) continue;
      const d = _v.copy(s.position).sub(pos).setY(0).length();
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  _socketMesh(sid) {
    return this.world.sockets.find(s => s.userData.id === sid) ?? null;
  }

  _applyVisuals() {
    for (const b of this.batteries) {
      const m = b.mesh;
      if (b.loc === 'held') {
        this.camera.add(m);
        m.position.set(0.34, -0.34, -0.72);
        m.rotation.set(0.2, 0, 0.12);
      } else if (b.loc === 'socket') {
        const s = this._socketMesh(b.socketId);
        this.camera.remove(m);
        this.world.root.add(m);
        m.position.copy(s.position); m.position.y += 0.72;
        m.rotation.set(0, 0, 0);
      } else {
        this.camera.remove(m);
        this.world.root.add(m);
        m.position.copy(b.worldPos);
        m.rotation.set(0, 0, 0);
      }
    }
    for (const s of this.world.sockets) {
      s.userData.ring.material = this.socketFed(s.userData.id)
        ? mat('teleport-off') : mat('socket-hungry');
    }
    const t = this.world.teleport;
    if (t) {
      const on = this.isPowered();
      t.userData.ring.material = on ? mat('teleport-on') : mat('teleport-off');
      t.userData.core.material = on ? mat('teleport-on') : mat('teleport-off');
    }
  }

  update(dt, playerPos) {
    this._t += dt;
    for (const b of this.batteries) {
      if (b.loc === 'world') {
        b.mesh.position.y = b.worldPos.y + Math.sin(this._t * 2 + b.mesh.id) * 0.05;
        b.mesh.rotation.y += dt * 0.8;
      }
    }
    const t = this.world?.teleport;
    if (t) {
      if (this.isPowered()) t.userData.ring.rotation.y += dt * 1.2;
      if (!this.completed && this.isPowered()) {
        _v.copy(t.position).sub(playerPos);
        const dy = playerPos.y - t.position.y;
        if (Math.hypot(_v.x, _v.z) < 1.05 && dy > 0.4 && dy < 2.6) {
          this.completed = true;
          events.emit('level-complete');
        }
      }
    }
  }
}
