// save.js — localStorage progress: highest unlocked level + completed set.

import { SAVE_KEY } from '../config.js';

export const save = {
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* private mode etc. */ }
    return { unlocked: 1, completed: [] };
  },
  store(data) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
  },
  complete(levelNum, totalLevels) {
    const d = save.load();
    if (!d.completed.includes(levelNum)) d.completed.push(levelNum);
    d.unlocked = Math.max(d.unlocked, Math.min(levelNum + 1, totalLevels));
    save.store(d);
    return d;
  },
};
