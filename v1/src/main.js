// main.js — boot, game state machine, input routing, tutorial prompts, level flow,
// and the window.__vf debug API used by QA.

import * as THREE from 'three';
import { Renderer } from './engine/renderer.js';
import { events } from './engine/events.js';
import { World } from './world/world.js';
import { PlayerController } from './player/controller.js';
import { Inventory } from './capture/prefab.js';
import { takePhoto } from './capture/capture.js';
import { PlacementController } from './capture/placement.js';
import { UndoStack } from './systems/undo.js';
import { PowerSystem } from './systems/power.js';
import { save } from './systems/save.js';
import { Hud } from './ui/hud.js';
import { AudioSystem } from './audio/audio.js';
import { LEVELS } from './levels/index.js';
import { KEYS } from './config.js';

const $ = id => document.getElementById(id);

// WebGL2 is required by three r173 — fail with a readable message, not a black screen
const probe = document.createElement('canvas');
if (!probe.getContext('webgl2')) {
  document.body.innerHTML =
    '<div style="display:flex;height:100vh;align-items:center;justify-content:center;' +
    'color:#f4f1ea;font-family:sans-serif;letter-spacing:.15em;text-align:center">' +
    'THIS DREAM NEEDS WEBGL2<br>please use a current Chrome, Safari or Firefox</div>';
  throw new Error('WebGL2 unavailable');
}

const renderer = new Renderer($('app'));
const { scene, camera } = renderer;
scene.add(camera);

const world = new World(scene);
const player = new PlayerController(camera, world);
const inventory = new Inventory(3);
const placement = new PlacementController(scene, camera, world, player);
const undo = new UndoStack();
const power = new PowerSystem(camera);
const hud = new Hud();
const audio = new AudioSystem();

let state = 'menu';            // menu | playing | paused | transition
let levelIndex = 0;
let tutorialText = '';
let shownPrompt = null;
let wasPowered = true;

const input = { forward: false, back: false, left: false, right: false, jump: false };

// ---------------------------------------------------------------- level flow

function loadLevel(i) {
  levelIndex = i;
  const def = LEVELS[i];
  world.load(def);
  power.load(world);
  inventory.disposeAll();
  inventory.slots = new Array(def.photoSlots ?? 3).fill(null);
  undo.clear();
  placement.disarm();
  player.spawn(def.spawn.pos, def.spawn.yaw ?? 0);
  wasPowered = power.isPowered();
  tutorialEvent('start');
  renderer.shadowsDirty();
  events.emit('inventory-changed', inventory);
  events.emit('mode-changed', 'capture');
}

function tutorialEvent(name) {
  const t = (LEVELS[levelIndex].tutorial ?? []).find(x => x.trigger === name);
  if (t) tutorialText = t.text;
}

function setState(s) {
  state = s;
  hud.show(s === 'playing');
  $('resume-overlay').classList.toggle('hidden', s !== 'paused');
  $('menu-overlay').classList.toggle('hidden', s !== 'menu');
  if (s !== 'transition') $('transition-overlay').classList.add('hidden');
  if (s === 'menu') renderMenu();
}

function showTransition(text, seconds, then) {
  setState('transition');
  $('transition-text').innerHTML = text.replaceAll('\n', '<br>');
  $('transition-overlay').classList.remove('hidden');
  setTimeout(then, seconds * 1000);
}

function startLevel(i) {
  loadLevel(i);
  showTransition(LEVELS[i].mood?.intro ?? '', 2.2, () => {
    setState('playing');
    lockPointer();
  });
}

events.on('level-complete', () => {
  audio.complete();
  document.exitPointerLock?.();
  save.complete(levelIndex + 1, LEVELS.length);
  const outro = LEVELS[levelIndex].mood?.outro ?? '';
  const next = levelIndex + 1 < LEVELS.length ? levelIndex + 1 : null;
  showTransition(outro, 3.0, () => {
    if (next !== null) {
      loadLevel(next);
      $('transition-text').innerHTML =
        (LEVELS[next].mood?.intro ?? '').replaceAll('\n', '<br>') +
        '<br><br><span style="font-size:11px;letter-spacing:.3em;opacity:.6">CLICK TO CONTINUE</span>';
      const h = () => { setState('playing'); lockPointer(); };
      $('transition-overlay').addEventListener('click', h, { once: true });
    } else {
      setState('menu');
      $('menu-mood').innerHTML = 'every place you built is still there,<br>somewhere in the dark of a camera';
    }
  });
});

events.on('world-changed', () => renderer.shadowsDirty());
events.on('power-changed', () => {
  const p = power.isPowered();
  if (p && !wasPowered) { audio.powerOn(); tutorialText = ''; hud.showHint('the teleport hums awake'); }
  wasPowered = p;
});
events.on('footstep', () => audio.footstep());
events.on('jump', () => audio.jump());

// ---------------------------------------------------------------- menu

function renderMenu() {
  const data = save.load();
  const grid = $('levelgrid');
  grid.innerHTML = '';
  LEVELS.forEach((lv, i) => {
    const unlocked = i + 1 <= data.unlocked;
    const done = data.completed.includes(i + 1);
    const b = document.createElement('button');
    b.className = 'btn';
    b.disabled = !unlocked;
    b.innerHTML = `${i + 1}<small>${done ? '&#10003;' : unlocked ? lv.name : 'locked'}</small>`;
    if (unlocked) b.addEventListener('click', () => { audio.unlock(); audio.uiClick(); startLevel(i); });
    grid.appendChild(b);
  });
}

$('btn-start').addEventListener('click', () => {
  audio.unlock(); audio.uiClick();
  const data = save.load();
  startLevel(Math.min(data.unlocked, LEVELS.length) - 1);
});
$('btn-resume').addEventListener('click', () => { setState('playing'); lockPointer(); });
$('btn-help2').addEventListener('click', () => hud.toggleHelp(true));
$('btn-restart').addEventListener('click', () => { doReset(); setState('playing'); lockPointer(); });
$('btn-quit').addEventListener('click', () => setState('menu'));

// ---------------------------------------------------------------- pointer lock

const canvas = renderer.renderer.domElement;

function lockPointer() {
  audio.unlock();
  canvas.requestPointerLock?.();
}

canvas.addEventListener('click', () => {
  if (state === 'playing' && document.pointerLockElement !== canvas) lockPointer();
});

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== canvas && state === 'playing') {
    placement.disarm();
    inventory.deselect();
    setState('paused');
  }
});

document.addEventListener('mousemove', e => {
  if (state === 'playing' && document.pointerLockElement === canvas)
    player.look(e.movementX, e.movementY);
});

// ---------------------------------------------------------------- actions

function doCapture() {
  hud.flash(1);
  audio.shutter();
  placement.captureBoxVis.visible = false;
  setTimeout(() => {
    const res = takePhoto(world, camera);
    if (!res.ok) { hud.showHint(res.reason); audio.error(); return; }
    res.prefab.thumbnail = renderer.snapshot();
    const { slot, prev } = inventory.add(res.prefab);
    undo.push({ type: 'capture', slot, prev, prefab: res.prefab });
    tutorialEvent('photo-taken');
    events.emit('photo-taken');
  }, 30);
}

function doArm(slot) {
  const prefab = inventory.get(slot);
  if (!prefab) { hud.showHint('no photo in that slot'); return; }
  inventory.select(slot);
  if (placement.arm(prefab, slot)) {
    audio.uiClick();
    tutorialEvent('armed');
  }
}

function doCommit() {
  hud.flash(0.45);
  setTimeout(() => {
    const res = placement.commit();
    if (!res.ok) {
      if (res.reason) hud.showHint(res.reason);
      audio.error();
      return;
    }
    undo.push(res.action);
    if (res.action.type === 'carve') audio.carve(); else audio.place();
    inventory.deselect();
    tutorialEvent('placed');
    if (res.action.ms > 160) console.warn('[budget] commit took', res.action.ms.toFixed(1), 'ms');
  }, 30);
}

function doCancelPlacement() {
  placement.disarm();
  inventory.deselect();
  audio.uiClick();
}

function doUndo() {
  const a = undo.undo({ inventory, world, power });
  if (!a) { hud.showHint('nothing to undo'); return; }
  if (placement.state === 'placement' && !inventory.slots.includes(placement.prefab)) {
    placement.disarm();
    inventory.deselect();
  }
  audio.undo();
  hud.flash(0.2);
}

function doReset() {
  placement.disarm();
  world.reset();
  power.load(world);
  inventory.disposeAll();
  inventory.slots = new Array(LEVELS[levelIndex].photoSlots ?? 3).fill(null);
  undo.clear();
  player.spawn(world.def.spawn.pos, world.def.spawn.yaw ?? 0);
  wasPowered = power.isPowered();
  tutorialEvent('start');
  renderer.shadowsDirty();
  events.emit('inventory-changed', inventory);
  audio.undo();
  hud.flash(0.3);
}

function doInteract() {
  const action = power.interact(player.position);
  if (!action) return;
  undo.push(action);
  if (action.verb === 'pickup') audio.pickup();
  else if (action.verb === 'deposit') audio.deposit();
  else audio.place();
}

// ---------------------------------------------------------------- input

const keyIs = (code, name) => KEYS[name].includes(code);

document.addEventListener('keydown', e => {
  if (e.repeat) return;
  if (state === 'playing') {
    if (keyIs(e.code, 'forward')) input.forward = true;
    else if (keyIs(e.code, 'back')) input.back = true;
    else if (keyIs(e.code, 'left')) input.left = true;
    else if (keyIs(e.code, 'right')) input.right = true;
    else if (keyIs(e.code, 'jump')) { input.jump = true; e.preventDefault(); }
    else if (keyIs(e.code, 'interact')) doInteract();
    else if (keyIs(e.code, 'undo')) doUndo();
    else if (keyIs(e.code, 'reset')) doReset();
    else if (keyIs(e.code, 'help')) hud.toggleHelp();
    else if (keyIs(e.code, 'rollCCW')) placement.roll(1);
    else if (keyIs(e.code, 'rollCW')) placement.roll(-1);
    else if (keyIs(e.code, 'flip')) placement.flip();
    else if (keyIs(e.code, 'align')) placement.align();
    else if (keyIs(e.code, 'discard')) {
      if (inventory.selected >= 0) {
        const slot = inventory.selected;
        const prefab = inventory.discard(slot);
        if (prefab) undo.push({ type: 'discard', slot, prefab });
        placement.disarm();
      }
    } else if (e.code === 'Backquote') hud.showStats = !hud.showStats;
    else {
      const slotIdx = KEYS.slots.indexOf(e.code);
      if (slotIdx >= 0) {
        if (placement.state === 'placement' && placement.slot === slotIdx) doCancelPlacement();
        else doArm(slotIdx);
      }
    }
  } else if (state === 'paused' && keyIs(e.code, 'help')) {
    hud.toggleHelp();
  }
});

document.addEventListener('keyup', e => {
  if (keyIs(e.code, 'forward')) input.forward = false;
  else if (keyIs(e.code, 'back')) input.back = false;
  else if (keyIs(e.code, 'left')) input.left = false;
  else if (keyIs(e.code, 'right')) input.right = false;
  else if (keyIs(e.code, 'jump')) input.jump = false;
});

canvas.addEventListener('mousedown', e => {
  if (state !== 'playing' || document.pointerLockElement !== canvas) return;
  if (e.button === 0) {
    if (placement.state === 'placement') doCommit();
    else doCapture();
  } else if (e.button === 2 && placement.state === 'placement') {
    doCancelPlacement();
  }
});
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('wheel', e => placement.scroll(e.deltaY), { passive: true });

// ---------------------------------------------------------------- loop

renderer.start(dt => {
  if (state === 'playing') {
    player.update(dt, input);
    placement.update();
    power.update(dt, player.position);
    const interactHint = power.interactionHint(player.position);
    const line = interactHint ?? tutorialText ?? '';
    if (line !== shownPrompt) { hud.showPrompt(line); shownPrompt = line; }
  }
  hud.tick(dt, hud.showStats ? {
    ...renderer.stats(),
  } : null);
});

setState('menu');

// ---------------------------------------------------------------- debug / QA API

window.__vf = {
  version: 'v1.0.5',
  span() {                             // dev/QA: capture span probe at current aim
    const hit = world.raycastFromCamera(camera, 40);
    return hit ? { dist: +hit.distance.toFixed(2), span: world.capturableSpanAt(camera, hit.point) } : null;
  },
  get yaw() { return player.yaw; },
  get pitch() { return player.pitch; },
  get state() { return state; },
  levels: LEVELS.map(l => l.name),
  loadLevel(i) { startLevel(i); },
  play() { setState('playing'); },
  pos: () => player.position.toArray(),
  setPos(x, y, z) { player.position.set(x, y, z); player.velocity.set(0, 0, 0); player.syncCamera(); },
  look(yaw, pitch) { player.yaw = yaw; player.pitch = pitch; player.syncCamera(); },
  input,
  shoot() {
    const res = takePhoto(world, camera);
    if (res.ok) {
      res.prefab.thumbnail = renderer.snapshot();
      const { slot, prev } = inventory.add(res.prefab);
      undo.push({ type: 'capture', slot, prev, prefab: res.prefab });
    }
    return res.ok ? { ok: true, id: res.prefab.id, tris: res.prefab.triCount, empty: res.prefab.isEmpty } : res;
  },
  arm(slot) { doArm(slot); },
  setScroll(v) { placement.scrollOffset = v; },
  setRoll(steps) { placement.rollSteps = steps; },
  setFlip(b) { placement.flipped = b; },
  ghost() {
    placement.update();
    return {
      state: placement.state, valid: placement.valid, reason: placement.invalidReason,
      pos: placement.ghost?.position.toArray(),
    };
  },
  commit() {
    placement.update();
    const res = placement.commit();
    if (res.ok) undo.push(res.action);
    return res;
  },
  cancel() { doCancelPlacement(); },
  interact() { doInteract(); },
  undo() { doUndo(); },
  reset() { doReset(); },
  powered: () => power.isPowered(),
  completed: () => power.completed,
  stats: () => ({
    ...renderer.stats(),
    liveInserts: world.liveInserts(),
    undoDepth: undo.depth,
    mutableEntries: world.mutable.length,
    heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
  }),
  unlockAll() { save.store({ unlocked: LEVELS.length, completed: [] }); renderMenu(); },
  loadDef(def) {                       // dev/QA: run an ad-hoc level definition
    LEVELS.push(def);
    startLevel(LEVELS.length - 1);
  },
  popDef() { if (LEVELS.length > 1) LEVELS.pop(); },
  step(dt = 1 / 60, n = 1) {           // dev/QA: deterministic ticks independent of rAF
    for (let i = 0; i < n; i++) {
      player.update(dt, input);
      placement.update();
      power.update(dt, player.position);
    }
    return __vf.pos();
  },
  rayProbe() {                         // what the crosshair ray hits right now
    const hit = world.raycastFromCamera(camera, 1000);
    return hit ? { dist: hit.distance, point: hit.point.toArray() } : null;
  },
  prefabInfo(slot) {
    const p = inventory.get(slot);
    if (!p) return null;
    const s = p.boundsLocal.getSize(new THREE.Vector3());
    return { id: p.id, empty: p.isEmpty, tris: p.triCount, size: s.toArray().map(v => +v.toFixed(2)) };
  },
  entries() {
    return world.mutable.map(e => {
      e.collGeo.computeBoundingBox();
      const b = e.collGeo.boundingBox;
      return { id: e.id, kind: e.kind, min: b.min.toArray().map(v => +v.toFixed(2)), max: b.max.toArray().map(v => +v.toFixed(2)) };
    });
  },
  // QA helper: place the armed slot so the ghost center lands at (cx,cy,cz) using the
  // REAL pipeline (aim at the point, scroll = target dist - ray base dist, settle applies)
  aimPlace(slot, cx, cy, cz, rollSteps = 0, flip = false) {
    const p = player.position;
    const dx = cx - p.x, dy = cy - p.y, dz = cz - p.z;
    player.yaw = Math.atan2(-dx, -dz);
    player.pitch = Math.asin(dy / Math.hypot(dx, dy, dz));
    player.syncCamera();
    doArm(slot);
    placement.rollSteps = rollSteps;
    placement.flipped = flip;
    placement.scrollOffset = 0;
    placement.update();
    const hit = world.raycastFromCamera(camera, 30);
    const baseDist = hit ? hit.distance : 8;
    placement.scrollOffset = Math.hypot(dx, dy, dz) - baseDist;
    placement.update();
    const res = placement.commit();
    if (res.ok) undo.push(res.action);
    return { ok: res.ok, reason: res.reason, ghostPos: placement.ghost?.position?.toArray() };
  },
};

console.log('[viewfinder-capture] booted,', LEVELS.length, 'level(s)');
