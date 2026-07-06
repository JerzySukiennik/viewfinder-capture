// prefab.js — photo inventory: slots of reusable PhotoPrefab templates. Placing a photo
// never consumes it; prefab geometries live until level unload (registry-disposed).

import { events } from '../engine/events.js';

export class Inventory {
  constructor(slotCount = 3) {
    this.slots = new Array(slotCount).fill(null);
    this.selected = -1;
    this.registry = new Set();     // every prefab ever created this level, for unload disposal
  }

  add(prefab) {
    this.registry.add(prefab);
    let slot = this.slots.indexOf(null);
    if (slot === -1) slot = this.selected >= 0 ? this.selected : 0;
    const prev = this.slots[slot];
    this.slots[slot] = prefab;
    events.emit('inventory-changed', this);
    return { slot, prev };
  }

  restore(slot, prefab) {
    this.slots[slot] = prefab;
    events.emit('inventory-changed', this);
  }

  get(slot) { return this.slots[slot] ?? null; }

  select(slot) {
    this.selected = slot;
    events.emit('inventory-changed', this);
  }

  deselect() {
    this.selected = -1;
    events.emit('inventory-changed', this);
  }

  discard(slot) {
    const prefab = this.slots[slot];
    this.slots[slot] = null;
    if (this.selected === slot) this.selected = -1;
    events.emit('inventory-changed', this);
    return prefab;
  }

  disposeAll() {
    for (const p of this.registry) {
      p.geometry?.dispose();
      p.ghostEdges?.dispose();
      p.thumbnail = null;
    }
    this.registry.clear();
    this.slots.fill(null);
    this.selected = -1;
    events.emit('inventory-changed', this);
  }
}
