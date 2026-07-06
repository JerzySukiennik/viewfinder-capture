// level6.js — L6 "The Long Way Up": the capstone. No new primitive — one skill per tier,
// escalating: scroll-precision bridge -> rolled-slab ramp -> sky-photo carve -> ceiling-flip
// wedge. Two batteries, two sockets, teleport at the summit (~10.2m above spawn). The built
// route persists; the battery carries are a victory lap, not busywork.
//
// Tier heights: T0 = 0 (spawn) · T1 = 0 (across 5.0m gap) · T2 = 2.6 (ramp) ·
// T3 = 6.6 (carved monolith + stairs) · TOP = 10.2 (flipped wedge). Teleport pad y = 10.2.

export default {
  id: 'l6',
  name: 'The Long Way Up',
  mood: {
    intro: 'one last chain of islands, stacked toward the sun.\neverything you learned — the long way up.',
    outro: 'two lights carried by hand, on a path that stayed.\nnothing you built will unbuild.\nthe camera closes its eye. the dream stays lit.',
  },
  spawn: { pos: [0, 0.1, 20], yaw: 0 },
  sky: { top: '#f2e6d8', bottom: '#c8d9e6', fog: '#d6d5de' },
  static: [
    // ---- TIER 0 — spawn island (floor y = 0) ----
    { type: 'box', size: [14, 1, 12],  pos: [0, -0.5, 16],   mat: 'floor' },
    { type: 'box', size: [15, 0.6, 13], pos: [0, -1.2, 16],  mat: 'wallDark' },
    { type: 'box', size: [12, 4, 1],   pos: [0, 2, 22.2],    mat: 'wall' },
    { type: 'box', size: [1, 4, 4],    pos: [-6.1, 2, 20.4], mat: 'accentWall' },
    { type: 'box', size: [1, 4, 4],    pos: [6.1, 2, 20.4],  mat: 'accentWall' },

    // ---- TIER 1 — terrace island (floor y = 0), 5.0m gap from tier 0 (z 5..10) ----
    { type: 'box', size: [16, 1, 10],  pos: [0, -0.5, 0],    mat: 'floor' },
    { type: 'box', size: [17, 0.6, 11], pos: [0, -1.2, 0],   mat: 'wallDark' },
    // tall gateposts framing the ramp corridor (corridor: x -8..-3, z -4.5..4.5 stays CLEAR)
    { type: 'box', size: [0.9, 7, 0.9], pos: [-2.9, 3.5, -4.4], mat: 'wall' },
    { type: 'box', size: [0.9, 7, 0.9], pos: [-2.9, 3.5, 4.4],  mat: 'wall' },

    // ---- TIER 2 — west island (floor y = 2.6), east cliff at x = -8 ----
    { type: 'box', size: [8, 1, 10],   pos: [-12, 2.1, 0],   mat: 'floor' },
    { type: 'box', size: [9, 0.6, 11], pos: [-12, 1.4, 0],   mat: 'wallDark' },
    // battery-B niche pillar (battery tucked north of it, against the west rim)
    { type: 'box', size: [2.4, 2.8, 0.8], pos: [-14.6, 4.0, 2.4], mat: 'wall' },

    // ---- stairway T2 -> T3 (self-supporting floating flight, rises toward -Z) ----
    { type: 'stairs', size: [4, 4, 6.5], pos: [-12, 4.6, -8.0], mat: 'floor' },
    { type: 'box', size: [5, 0.6, 7],  pos: [-12, 1.6, -8.0], mat: 'wallDark' },

    // ---- TIER 3 — north-west island (floor y = 6.6) ----
    { type: 'box', size: [10, 1, 8],   pos: [-12, 6.1, -15], mat: 'floor' },
    { type: 'box', size: [11, 0.6, 9], pos: [-12, 5.4, -15], mat: 'wallDark' },
    { type: 'box', size: [0.8, 5, 0.8], pos: [-16.2, 9.1, -18.5], mat: 'wall' },

    // ---- TOP TIER — summit island (floor y = 10.2), east of tier 3 ----
    { type: 'box', size: [10, 1, 8],   pos: [-2, 9.7, -15],  mat: 'floor' },
    { type: 'box', size: [11, 0.6, 9], pos: [-2, 9.0, -15],  mat: 'wallDark' },

    // ---- keystone shard: the wedge decor hangs flush beneath it (out of reach, NW) ----
    { type: 'box', size: [5, 0.8, 5],  pos: [-16, 13.8, -25], mat: 'green' },

    // ---- dreamy decor: floating shards above, distant islands below (all unreachable) ----
    { type: 'box', size: [3, 0.5, 3],   pos: [2, 15, -22],   mat: 'green' },
    { type: 'box', size: [2.2, 0.4, 2.2], pos: [-9, 17.5, -18], mat: 'wall' },
    { type: 'box', size: [2.6, 0.5, 2.6], pos: [-20, 14, -8], mat: 'wallDark' },
    { type: 'box', size: [3, 0.5, 3],   pos: [14, 6, -18],   mat: 'wall' },
    { type: 'box', size: [6, 0.8, 6],   pos: [18, -7, 4],    mat: 'green' },
    { type: 'box', size: [5, 0.7, 5],   pos: [-27, -6, 10],  mat: 'wallDark' },
    { type: 'box', size: [4, 0.6, 4],   pos: [10, -9, -29],  mat: 'green' },
  ],
  capturables: [
    // the one slab that does double duty: flat bridge (stage 1) + 30deg ramp (stage 2).
    // square footprint => world-yaw of the photo never matters. 0.4 thick => settled
    // rolled entry lip 0.316 <= 0.35 auto-climb.
    { id: 'slab', type: 'box', size: [5.6, 0.4, 5.6], pos: [2.5, 0.2, 12.5] },
    // the keystone: wedge mounted upside-down under the shard (flat top flush at y 13.4,
    // full-height face east, underside slope facing down-west). Photograph from tier 3
    // (~12.6m), place R-FLIPPED while facing the summit cliff (+X) => walkable ramp.
    { id: 'wedge-keystone', type: 'wedge', size: [4, 4, 7], pos: [-16, 11.4, -25],
      rot: [0, -Math.PI / 2, Math.PI] },
  ],
  subtractableWalls: [
    // the monolith sealing the stairway (spans y 1.5..8.5, 2.5m past the stair sides over void)
    { id: 'wall-monolith', type: 'box', size: [9, 7, 1.2], pos: [-12, 5.0, -6.4], mat: 'accentWall' },
  ],
  batteries: [
    { id: 'bat-a', pos: [-4, 0.35, 18.5] },
    { id: 'bat-b', pos: [-15, 2.95, 4.0] },
  ],
  sockets: [
    { id: 'sock-a', pos: [-2.5, 10.2, -13.2] },
    { id: 'sock-b', pos: [-2.5, 10.2, -16.8] },
  ],
  teleport: { pos: [-4, 10.2, -15], requiresPower: true, poweredBy: ['sock-a', 'sock-b'] },
  photoSlots: 3,
  killY: -16,
  tutorial: [
    { trigger: 'start', text: 'two batteries, two sockets at the summit — everything you build stays built' },
  ],
  intendedSolution: [
    'T0: photograph the orange slab from >= 7.5m -> slot 1',
    'T0->T1: arm slot 1, aim just below the far lip, scroll until the ghost spans the 5m gap (z 10..5) top within +-0.35 of y=0; place; walk across',
    'T1->T2: walk the west corridor facing -Z (cliff LEFT), arm slot 1 again, Q x2 (30 deg), place so the high edge kisses the 2.6 lip at x=-8; walk up',
    'T2->T3: sky photo (slot 2); carve the monolith at eye height; climb the 16 steps to 6.6',
    'T3: photograph the upside-down keystone wedge under the NW shard (from SE half, ~12.6m) -> slot 3',
    'T3->TOP: face EAST toward the summit cliff (x=-7), arm slot 3, press R (flip); place so the thick end meets the cliff; walk up onto 10.2',
    'batteries: carry bat A (tier 0) and bat B (tier 2 niche) to the summit sockets, one at a time — the route persists; step onto the pad',
  ],
};
