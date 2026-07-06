// undo.js — command stack of reversible world actions. The world is a stack of
// reversible operations, never permanent destruction; undo must free resources.

export class UndoStack {
  constructor() { this.stack = []; }

  push(action) { this.stack.push(action); }

  get depth() { return this.stack.length; }

  undo(ctx) {
    const a = this.stack.pop();
    if (!a) return null;
    switch (a.type) {
      case 'capture':
        ctx.inventory.restore(a.slot, a.prev ?? null);
        break;
      case 'discard':
        ctx.inventory.restore(a.slot, a.prefab);
        break;
      case 'place':
        ctx.world.removePrefabEntry(a.entryId);
        break;
      case 'carve':
        for (const item of a.items) {
          const entry = ctx.world.mutable.find(e => e.id === item.wallId);
          if (entry) ctx.world.restoreWall(entry, item.prev);
        }
        break;
      case 'battery':
        ctx.power.applyBatteryState(a.batteryId, a.prev);
        break;
    }
    return a;
  }

  clear() { this.stack = []; }
}
