// level3.js — L3 "Tilt": rotation as ramp + first power puzzle, both gentle.
// Battery -> socket powers the pad (ground-level loop, no climbing needed).
// A photographed slab rolled 30 deg (Q/E x2) leans on the platform edge as the ramp up.

export default {
  id: 'l3',
  name: 'Tilt',
  mood: {
    intro: 'the floor learned a new angle\nnothing here is fixed, not even up',
    outro: 'a photograph leaned into a ladder.\nthe light walked up.',
  },
  spawn: { pos: [0, 0.1, 9.5], yaw: 0 },
  sky: { top: '#e4e6f2', bottom: '#c6cfe6', fog: '#ccd4e8' },
  static: [
    // single ground island (top y = 0) — no gaps: rotation + power stay gentle
    { type: 'box', size: [22, 1, 18], pos: [0, -0.5, 2], mat: 'floor' },
    { type: 'box', size: [23, 0.6, 19], pos: [0, -1.2, 2], mat: 'wallDark' },
    // teleport platform: 2.4m tall (unjumpable, no stairs), top y = 2.4
    { type: 'box', size: [4, 2.4, 4], pos: [-5, 1.2, -3], mat: 'wall' },
    // battery pedestal (top 0.7) + stele behind it to draw the eye
    { type: 'box', size: [1.2, 0.7, 1.2], pos: [5, 0.35, -1.5], mat: 'wall' },
    { type: 'box', size: [2.2, 2.6, 0.5], pos: [5, 1.3, -2.9], mat: 'accentWall' },
    // gate pillars framing the ramp-placement stand spot (stand between, face -X)
    { type: 'box', size: [0.8, 3.5, 0.8], pos: [2.4, 1.75, -0.3], mat: 'wall' },
    { type: 'box', size: [0.8, 3.5, 0.8], pos: [2.4, 1.75, 2.1], mat: 'wall' },
    // inlaid floor strip marking the ramp lane along the platform's east face
    { type: 'box', size: [5.2, 0.08, 1.4], pos: [-4.6, 0.04, 0.9], mat: 'accentWall' },
    // spawn-side room framing
    { type: 'box', size: [14, 4.5, 1], pos: [0, 2.25, 10.6], mat: 'wall' },
    { type: 'box', size: [1, 4.5, 5], pos: [-6.8, 2.25, 8.4], mat: 'accentWall' },
    { type: 'box', size: [1, 4.5, 4], pos: [6.8, 2.25, 8.9], mat: 'accentWall' },
    // floating decor, out of reach
    { type: 'box', size: [6, 0.8, 6], pos: [-20, -6, -10], mat: 'green' },
    { type: 'box', size: [4, 0.6, 4], pos: [20, -8, 4], mat: 'wallDark' },
    { type: 'box', size: [5, 0.7, 5], pos: [-9, 6, -22], mat: 'green' },
    { type: 'box', size: [3, 0.5, 3], pos: [13, 5, -14], mat: 'wall' },
  ],
  capturables: [
    // flat slab, 0.4 thick: rolled 30 deg and floor-settled, its low top edge sits at
    // ~0.32 (<= 0.35 auto-step) — walk-on without jumping
    { id: 'slab-t', type: 'box', size: [4.5, 0.4, 4.5], pos: [5.4, 0.2, 4.2] },
  ],
  subtractableWalls: [],
  batteries: [
    { id: 'bat-a', pos: [5, 1.05, -1.5] },   // pedestal top 0.7 + 0.35 float
  ],
  sockets: [
    { id: 'sock-1', pos: [-1.8, 0, -3] },    // ground level, 1.2m east of the platform
  ],
  teleport: { pos: [-5, 2.4, -3], requiresPower: true, poweredBy: ['sock-1'] },
  photoSlots: 3,
  killY: -16,
  tutorial: [
    { trigger: 'start', text: 'the pad up there sleeps — F lifts the battery, F seats it in the socket' },
    { trigger: 'photo-taken', text: 'press 1 to arm the slab' },
    { trigger: 'armed', text: 'Q / E roll the photo 15° a tap — two taps is a ramp, climbing sideways across your view' },
    { trigger: 'placed', text: 'lean the wrong way? Z, then roll the other key · T straightens' },
  ],
  intendedSolution: [
    'walk to the pedestal at (5, 0, -1.5); F picks up the battery',
    'carry it to the socket at (-1.8, 0, -3) beside the platform; F seats it — teleport lights',
    'photograph the orange slab from ~6-7m west (stand near (-1.5, 0, 3)); LMB',
    'stand between the gate pillars at (3.6, 0, 0.9), face the platform flank (-X); press 1; tap E twice (30 deg, high edge RIGHT = toward the platform)',
    'aim at the far half of the marked strip — ghost settles on the floor (center ~ (-4.6, 1.27, 0.9)); LMB. High top edge ~2.57 embeds the platform lip (2.4), low lip ~0.32 (auto-step). Tolerance: lane x in [-6.5, -3], roll 30-45 deg',
    'walk up the slope onto the platform top, step into the lit pad at (-5, 2.4, -3)',
  ],
};
