// level1.js — L1 "First Light": the whole loop in its simplest form.
// aim -> capture -> place -> walk. No rotation, no power. Reference level for the schema.

export default {
  id: 'l1',
  name: 'First Light',
  mood: {
    intro: 'the camera remembers\nwhat the world forgot to build',
    outro: 'one photograph, one bridge.\nit wants more angles.',
  },
  spawn: { pos: [-2, 0.1, 15], yaw: 0 },
  sky: { top: '#dfeaf2', bottom: '#bfd9e8', fog: '#c4dce8' },
  static: [
    // main island (spawn side)
    { type: 'box', size: [10, 1, 14], pos: [0, -0.5, 10], mat: 'floor' },
    { type: 'box', size: [11, 0.6, 15], pos: [0, -1.2, 10], mat: 'wallDark' },
    // far island (teleport side)
    { type: 'box', size: [10, 1, 10], pos: [0, -0.5, -7.5], mat: 'floor' },
    { type: 'box', size: [11, 0.6, 11], pos: [0, -1.2, -7.5], mat: 'wallDark' },
    // pillars framing the sightline to the teleport
    { type: 'box', size: [0.9, 4.5, 0.9], pos: [-4, 2.25, -3.5], mat: 'wall' },
    { type: 'box', size: [0.9, 4.5, 0.9], pos: [4, 2.25, -3.5], mat: 'wall' },
    // spawn-side back wall so the level reads as a room opening toward the gap
    { type: 'box', size: [10, 5, 1], pos: [0, 2, 17.5], mat: 'wall' },
    { type: 'box', size: [1, 5, 6], pos: [-5.2, 2, 14.7], mat: 'accentWall' },
    { type: 'box', size: [1, 5, 6], pos: [5.2, 2, 14.7], mat: 'accentWall' },
    // dreamy floating decor islands, far out of reach
    { type: 'box', size: [6, 0.8, 6], pos: [-16, -6, -4], mat: 'green' },
    { type: 'box', size: [4, 0.6, 4], pos: [14, -8, 2], mat: 'wallDark' },
    { type: 'box', size: [5, 0.7, 5], pos: [8, 6, -26], mat: 'green' },
    { type: 'box', size: [3, 0.5, 3], pos: [-11, 4, -20], mat: 'wall' },
  ],
  capturables: [
    { id: 'block-a', type: 'box', size: [4.5, 1.2, 4.5], pos: [2.5, 0.6, 9] },
  ],
  subtractableWalls: [],
  batteries: [],
  sockets: [],
  teleport: { pos: [0, 0, -10], requiresPower: false, poweredBy: [] },
  photoSlots: 3,
  killY: -16,
  tutorial: [
    { trigger: 'start', text: 'photograph the outlined block — left click' },
    { trigger: 'photo-taken', text: 'press 1 to arm your photo' },
    { trigger: 'armed', text: 'aim at the gap · scroll to push or pull · click to place' },
    { trigger: 'placed', text: 'walk across — Z undoes, P resets' },
  ],
  intendedSolution: [
    'stand near the gap edge, aim at the outlined block, LMB to photograph it',
    'press 1 to arm the photo; aim into the gap between the islands',
    'scroll until the ghost block spans the gap (tolerance: any position that bridges 5.5m)',
    'LMB to place, walk over the block to the teleport, step onto the pad',
  ],
};
