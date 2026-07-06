// level2.js — L2 "Reach": teaches placement position control (scroll-along-ray).
// A 10m gap, too far for one block at your feet: push the ghost out along the aim,
// or place the same photo twice as stepping stones. Far island sits LOWER so height
// errors are free (drops cost nothing).

export default {
  id: 'l2',
  name: 'Reach',
  mood: {
    intro: 'distance is a rumor\nthe lens does not believe it',
    outro: 'two stones from one memory.\nthe gap forgave you.',
  },
  spawn: { pos: [2, 0.1, 16], yaw: 0 },
  sky: { top: '#e2ecf6', bottom: '#b9d4e8', fog: '#c0dae9' },
  static: [
    // main island (top y = 0)
    { type: 'box', size: [12, 1, 13], pos: [-1, -0.5, 12.5], mat: 'floor' },
    { type: 'box', size: [13, 0.6, 14], pos: [-1, -1.2, 12.5], mat: 'wallDark' },
    // far island — lower (top y = -1.0) and offset diagonally (+5m in x)
    { type: 'box', size: [9, 1, 9], pos: [4, -1.5, -8.5], mat: 'floor' },
    { type: 'box', size: [10, 0.6, 10], pos: [4, -2.2, -8.5], mat: 'wallDark' },
    // spawn-side room framing (like L1)
    { type: 'box', size: [12, 5, 1], pos: [-1, 2, 19], mat: 'wall' },
    { type: 'box', size: [1, 5, 6], pos: [-6.6, 2, 16], mat: 'accentWall' },
    { type: 'box', size: [1, 5, 6], pos: [4.6, 2, 16], mat: 'accentWall' },
    // pillars on the far island framing the teleport sightline
    { type: 'box', size: [0.9, 4.5, 0.9], pos: [1.5, 1.25, -5.5], mat: 'wall' },
    { type: 'box', size: [0.9, 4.5, 0.9], pos: [6.5, 1.25, -5.5], mat: 'wall' },
    // mid-void waymark post, beside the crossing corridor (aim/depth cue, top at y=-0.1)
    { type: 'box', size: [0.7, 5, 0.7], pos: [-0.9, -2.6, 1], mat: 'accentWall' },
    // dreamy floating decor, out of reach (>= 9.5m horizontal from any walk-off edge)
    { type: 'box', size: [6, 0.8, 6], pos: [-18, -7, -2], mat: 'green' },
    { type: 'box', size: [4, 0.6, 4], pos: [15, -9, 7], mat: 'wallDark' },
    { type: 'box', size: [5, 0.7, 5], pos: [10, 5, -25], mat: 'green' },
    { type: 'box', size: [3, 0.5, 3], pos: [-12, 4, -19], mat: 'wall' },
    { type: 'box', size: [4, 0.7, 4], pos: [-15, 8, 10], mat: 'green' },
  ],
  capturables: [
    // big square slab: yaw-agnostic stepping stone. Sits on the floor, top at 1.2.
    { id: 'slab-a', type: 'box', size: [6, 1.2, 6], pos: [-3.5, 0.6, 9.5] },
  ],
  subtractableWalls: [],
  batteries: [],
  sockets: [],
  teleport: { pos: [4, -1, -10], requiresPower: false, poweredBy: [] },
  photoSlots: 3,
  killY: -16,
  tutorial: [
    { trigger: 'start', text: 'the far shore sits low and far — photograph the big slab' },
    { trigger: 'photo-taken', text: 'press 1 — one photo, as many placements as you need' },
    { trigger: 'armed', text: 'scroll pushes the ghost out along your aim · scroll back pulls it home · aim into the gap and push' },
    { trigger: 'placed', text: 'need more road? press 1 again — the same photo places twice' },
  ],
  intendedSolution: [
    'walk to (4.5, 0, 14); aim at the slab top so the whole 6m outline fits (D≈9m: frame 6.9w x 5.0h — full capture); LMB',
    'walk to the gap edge near (3, 0, 6.4); press 1; aim ~28 deg down into the gap; scroll until the ghost hugs the near ledge: stone A ~ center (3.3, -0.4, 3.3), top ~ 0.2 — valid: top in [-0.6, +0.35], ledge overlap >= 0.2m',
    'walk onto stone A to its far edge (~z 0.5); press 1 again; aim at the far island near face; scroll back ~2 clicks so it spans stone A -> far ledge: stone B ~ center (4, -1.1, -2.6), top ~ -0.5',
    'walk B, drop 0.5 onto the far floor (-1.0), pass between the pillars, step on the pad at (4, -1, -10)',
    'zero-jump check: island(0) -> A top 0.2 (step 0.2) -> B top -0.5 (drop) -> far floor -1.0 (drop) -> pad',
  ],
};
