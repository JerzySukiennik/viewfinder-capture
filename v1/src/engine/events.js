// events.js — tiny synchronous event bus shared by all systems.

const listeners = new Map();

export const events = {
  on(type, fn) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(fn);
    return () => listeners.get(type)?.delete(fn);
  },
  emit(type, data) {
    listeners.get(type)?.forEach(fn => fn(data));
  },
  clear() { listeners.clear(); },
};
