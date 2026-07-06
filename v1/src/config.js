// config.js — keybindings, budgets, physics constants, palette. Single source of truth.

export const KEYS = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  jump: ['Space'],
  interact: ['KeyF'],
  undo: ['KeyZ'],
  reset: ['KeyP'],
  help: ['KeyH'],
  rollCCW: ['KeyQ'],
  rollCW: ['KeyE'],
  flip: ['KeyR'],
  align: ['KeyT'],
  discard: ['KeyX'],
  slots: ['Digit1', 'Digit2', 'Digit3'],
};

export const PLAYER = {
  radius: 0.4,
  segmentLen: 1.0,          // capsule hangs this far below origin; feet = origin - (segmentLen+radius)
  eyeHeight: 1.4,           // origin sits at eye level
  speed: 5.5,
  airControl: 0.45,
  gravity: -22,
  jumpSpeed: 7.2,
  physicsSteps: 5,
  skin: 0.06,               // contact offset bridging CSG seams / T-junctions
  groundSnapDist: 0.32,
  maxSlopeGroundNormalY: 0.55,
};

export const CAPTURE = {
  frameFraction: 0.55,      // HUD frame covers this fraction of the view => cutter cross-section
  nearFraction: 0.35,       // cutter starts at this fraction of aim distance
  minAimDist: 2.0,
  maxAimDist: 14.0,
  depthMargin: d => Math.max(3, 0.6 * d),
  maxPrefabTris: 5000,
  jitter: 1.3e-3,
  frustumCutter: false,     // Tier-3 flag; Tier-2 box is the default
};

export const PLACEMENT = {
  minDist: 1.5,
  maxDist: 30,
  defaultDist: 8,
  scrollStep: 0.55,
  rollStep: Math.PI / 12,   // 15 deg
  floorEmbed: 0.03,
  maxLiveInserts: 6,
  maxCarvesPerWall: 3,
};

export const BUDGET = {
  csgActionMs: 150,
  fpsCap: 60,
};

export const PALETTE = {
  sky:        0xbfd9e8,
  skyTop:     0x8fb8d8,
  fog:        0xc4dcE8,
  floor:      0xe8e0d0,
  wall:       0xd9cfc0,
  wallDark:   0xb8a898,
  accentWall: 0xc9a6a0,
  capturable: 0xf0b880,     // ONE color game-wide: "this can be photographed"
  crossCut:   0xfff2dc,     // cross-section cap — pale cut-paper
  green:      0x9dc5a0,
  teleport:   0x3fd9c4,
  teleportOff:0x3a4448,
  battery:    0xffd166,
  socket:     0x8895a8,
  ghostOk:    0x3fd9c4,
  ghostBad:   0xff6b6b,
};

export const SAVE_KEY = 'viewfinder-capture.v1';
