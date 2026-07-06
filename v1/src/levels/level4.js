// level4.js — L4 "Through the Wall": SKY PHOTO as eraser (CSG subtraction).
// A sealed wall splits the island; photograph empty sky, carve a doorway, then a
// small combine beat: place the captured wedge to mount the teleport plinth.

export default {
  id: 'l4',
  name: 'Through the Wall',
  mood: {
    intro: 'some walls forget to leave a door.\nthe empty sky knows how to erase.',
    outro: 'you photographed nothing,\nand nothing opened the way.',
  },
  spawn: { pos: [0, 0.1, 8], yaw: 0 },
  sky: { top: '#e6e3f2', bottom: '#c9cfe8', fog: '#cbd2e6' },
  static: [
    // single long island, split in two by the subtractable wall at z=-3
    { type: 'box', size: [10, 1, 26], pos: [0, -0.5, 0], mat: 'floor' },
    { type: 'box', size: [11, 0.6, 27], pos: [0, -1.2, 0], mat: 'wallDark' },
    // spawn-side room dressing: back wall + flanks frame the sightline at the wall
    { type: 'box', size: [10, 5, 1], pos: [0, 2, 12.5], mat: 'wall' },
    { type: 'box', size: [1, 5, 5], pos: [-4.5, 2, 10], mat: 'accentWall' },
    { type: 'box', size: [1, 5, 5], pos: [4.5, 2, 10], mat: 'accentWall' },
    // pillars mark the carving spot: standing between them = 4-6m from the wall
    { type: 'box', size: [0.9, 4.5, 0.9], pos: [-4, 2.25, 1.5], mat: 'wall' },
    { type: 'box', size: [0.9, 4.5, 0.9], pos: [4, 2.25, 1.5], mat: 'wall' },
    // teleport plinth (1.8m: unjumpable, no stairs — the wedge is the way up)
    { type: 'box', size: [3.2, 1.8, 3.2], pos: [0, 0.9, -10.6], mat: 'wall' },
    // low bench on the teleport side (scale reference, breaks the empty room)
    { type: 'box', size: [2.2, 0.5, 0.9], pos: [-3.4, 0.25, -6.5], mat: 'wallDark' },
    // dreamy floating decor, far out of reach
    { type: 'box', size: [6, 0.8, 6], pos: [-17, -6, -6], mat: 'green' },
    { type: 'box', size: [4, 0.6, 4], pos: [15, -8, 3], mat: 'wallDark' },
    { type: 'box', size: [5, 0.7, 5], pos: [9, 6, -24], mat: 'green' },
    { type: 'box', size: [3, 0.5, 3], pos: [-12, 4, -19], mat: 'wall' },
  ],
  capturables: [
    // ramp wedge, spawn side: rises toward -Z (= toward the plinth when placed,
    // since placement keeps world orientation). Photographable from either side
    // of the wall — also through the carved doorway (capture range 14m).
    { id: 'ramp-a', type: 'wedge', size: [3, 1.8, 3.5], pos: [3, 0.9, 4] },
  ],
  subtractableWalls: [
    // seals the island: 12 wide on a 10-wide island (1m overhang each side, no
    // jump-around), 6 tall (no jump-over), bottom edge exactly at floor level
    { id: 'wall-main', type: 'box', size: [12, 6, 1.2], pos: [0, 3, -3], mat: 'accentWall' },
  ],
  batteries: [],
  sockets: [],
  teleport: { pos: [0, 1.8, -10.6], requiresPower: false, poweredBy: [] },
  photoSlots: 3,
  killY: -16,
  tutorial: [
    { trigger: 'start', text: 'no door in this wall. photograph the empty sky — an empty frame erases' },
    { trigger: 'placed', text: 'the orange ramp photographs from either side — the tall pedestal wants it' },
  ],
  intendedSolution: [
    'walk to the pillars at z~1.5 (4-6m from the wall face at z=-2.4)',
    'aim at the open sky above the wall and LMB — empty frame => SKY photo',
    '(any time: photograph the orange wedge at [3, 0.9, 4] from ~5-6m)',
    'arm the sky photo, aim at the wall at chest height (x in [-4,4], y in [0.4,2.2]), LMB — full doorway (box bottom lands at/below floor)',
    'fun failure: aiming high leaves a hanging window — Z, re-place lower',
    'walk through; place the wedge at the plinth south face — settles to floor, top edge 1.77 vs plinth 1.80; rises toward -Z = toward the plinth (T straightens)',
    'walk up the ramp, step onto plinth and pad — zero jumps',
  ],
};
