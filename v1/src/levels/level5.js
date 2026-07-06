// level5.js — L5 "Two Charges": MULTI-PLACE (one photo, several instances) + two
// batteries. Teleport needs both sockets fed. Battery B sits on a 3m tower reached
// by placing ONE slab photo twice as rolled 30-degree ramps: floor -> terrace (1.5m)
// -> tower top (3.0m). Zero-jump path.

export default {
  id: 'l5',
  name: 'Two Charges',
  mood: {
    intro: 'the gate is hungry twice.\none photograph can be a whole staircase.',
    outro: 'placed, and placed again —\nthe same picture, climbing.',
  },
  spawn: { pos: [0, 0.1, 8], yaw: 0 },
  sky: { top: '#e0f0e8', bottom: '#c2ded2', fog: '#c8dcd4' },
  static: [
    // one big island — battery trips never cross a void
    { type: 'box', size: [20, 1, 20], pos: [0, -0.5, 0], mat: 'floor' },
    { type: 'box', size: [21, 0.6, 21], pos: [0, -1.2, 0], mat: 'wallDark' },
    // terrace (1.5m) + tower (3.0m): giant two-step staircase, telegraphs two placements
    { type: 'box', size: [4, 1.5, 3], pos: [-6.5, 0.75, 0.7], mat: 'wall' },
    { type: 'box', size: [4.2, 3, 4.2], pos: [-6.6, 1.5, -2.9], mat: 'accentWall' },
    // small plinth on the tower top: lifts battery B into view from spawn
    { type: 'box', size: [0.9, 0.4, 0.9], pos: [-6.6, 3.2, -2.9], mat: 'wall' },
    // battery A pedestal, open and obvious near spawn
    { type: 'box', size: [1.2, 0.9, 1.2], pos: [3, 0.45, 6], mat: 'wall' },
    // pillars + backdrop framing the teleport
    { type: 'box', size: [0.9, 5, 0.9], pos: [-3.5, 2.5, -8.5], mat: 'wall' },
    { type: 'box', size: [0.9, 5, 0.9], pos: [3.5, 2.5, -8.5], mat: 'wall' },
    { type: 'box', size: [8, 3, 0.8], pos: [0, 1.5, -9.4], mat: 'wallDark' },
    // spawn back wall + a green accent
    { type: 'box', size: [10, 4, 1], pos: [0, 2, 9.3], mat: 'wall' },
    { type: 'box', size: [2, 0.5, 2], pos: [7, 0.25, -4], mat: 'green' },
    // dreamy floating decor, far out of reach
    { type: 'box', size: [6, 0.8, 6], pos: [-20, -7, -8], mat: 'green' },
    { type: 'box', size: [4, 0.6, 4], pos: [18, -9, 4], mat: 'wallDark' },
    { type: 'box', size: [5, 0.7, 5], pos: [12, 7, -22], mat: 'green' },
    { type: 'box', size: [3, 0.5, 3], pos: [-14, 5, 14], mat: 'wall' },
  ],
  capturables: [
    // THE slab: one photo, two ramps. Long axis on x so facing the terrace/tower
    // faces (which run along x) makes Q/E tilt the long axis into a ramp.
    { id: 'slab-a', type: 'box', size: [3.2, 0.45, 2.2], pos: [4, 0.225, 1.5] },
  ],
  subtractableWalls: [],
  batteries: [
    { id: 'bat-a', pos: [3, 1.25, 6] },       // pedestal top 0.9 + 0.35
    { id: 'bat-b', pos: [-6.6, 3.75, -2.9] }, // tower plinth top 3.4 + 0.35
  ],
  sockets: [
    { id: 'sock-a', pos: [-1.6, 0, -6] },
    { id: 'sock-b', pos: [1.6, 0, -6] },
  ],
  teleport: { pos: [0, 0, -7.5], requiresPower: true, poweredBy: ['sock-a', 'sock-b'] },
  photoSlots: 3,
  killY: -16,
  tutorial: [
    { trigger: 'start', text: 'a placed photo is not spent — one slab can be every stair' },
  ],
  intendedSolution: [
    'either order; batteries carry one at a time. Trip A: F-grab battery A at [3, 1.25, 6], slot at [+-1.6, 0, -6]',
    'photograph the orange slab (3.2 x 0.45 x 2.2 at [4, 0.2, 1.5]) from ~4.5-6m',
    'ramp 1: stand ~3-5m south of the terrace south face (z=2.2, top 1.5m), aim at the face, roll 30 (Q/E x2), place hugging the face — settles on floor, top edge 1.96; walk up',
    'ramp 2: on the terrace, arm the SAME photo, face the tower south face (z=-0.8, top 3.0m), roll 30, place — settles at 1.5, top edge 3.46; walk up',
    'F-grab battery B off its plinth, walk down (or off the edge — no fall damage), slot it',
    'teleport hums on; pad between the sockets. Zero jumps; 2 simultaneous placements',
  ],
};
