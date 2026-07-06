// cutter.js — fixed-topology hexahedron cutter with constructive manifold guarantee.
// Topology/winding never change; only the 8 vertex positions move. After any build:
// signed-volume flip rule + closed-manifold assert (see capture-spec.md).

import * as THREE from 'three';
import { Brush } from 'three-bvh-csg';
import { CAPTURE } from '../config.js';
import { mat } from '../world/materials.js';

// corners: 0-3 quad at z=-1 in (-1,-1)(1,-1)(1,1)(-1,1) order, 4-7 same at z=+1
const HEX_INDICES = [
  0,3,2, 0,2,1,  4,5,6, 4,6,7,  0,4,7, 0,7,3,
  1,2,6, 1,6,5,  0,1,5, 0,5,4,  3,7,6, 3,6,2,
];

let jitterSeed = 1;
function jitter() {
  jitterSeed = (jitterSeed * 16807) % 2147483647;
  return ((jitterSeed / 2147483647) - 0.5) * 2 * CAPTURE.jitter;
}

function hexGeometry(corners) {
  const pos = new Float32Array(24);
  for (let i = 0; i < 8; i++) {
    pos[i*3]   = corners[i].x + jitter();
    pos[i*3+1] = corners[i].y + jitter();
    pos[i*3+2] = corners[i].z + jitter();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(HEX_INDICES.slice());
  return g;
}

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();

export function signedVolume(geo) {
  const p = geo.attributes.position, idx = geo.index.array;
  let v = 0;
  for (let i = 0; i < idx.length; i += 3) {
    _a.fromBufferAttribute(p, idx[i]);
    _b.fromBufferAttribute(p, idx[i+1]);
    _c.fromBufferAttribute(p, idx[i+2]);
    v += _a.dot(_b.clone().cross(_c));
  }
  return v / 6;
}

export function isClosedManifold(geo) {
  const idx = geo.index.array, edges = new Set();
  for (let i = 0; i < idx.length; i += 3) {
    const t = [idx[i], idx[i+1], idx[i+2]];
    if (t[0] === t[1] || t[1] === t[2] || t[0] === t[2]) return false;
    for (let e = 0; e < 3; e++) {
      const k = t[e] + '_' + t[(e+1)%3];
      if (edges.has(k)) return false;
      edges.add(k);
    }
  }
  for (const k of edges) {
    const [s, e] = k.split('_');
    if (!edges.has(e + '_' + s)) return false;
  }
  return true;
}

function finalizeCutter(corners) {
  const geo = hexGeometry(corners);
  if (signedVolume(geo) < 0) {
    const ix = geo.index.array;
    for (let i = 0; i < ix.length; i += 3) {
      const t = ix[i+1]; ix[i+1] = ix[i+2]; ix[i+2] = t;
    }
  }
  if (!isClosedManifold(geo) || signedVolume(geo) <= 1e-6) {
    geo.dispose();
    return null;
  }
  geo.computeVertexNormals();
  const brush = new Brush(geo, mat('cross'));
  brush.updateMatrixWorld();
  return brush;
}

export function cutterDims(camera, aimDist, span = null) {
  // aiming at a capturable: widen the aim distance so the frame swallows the whole
  // solid (WYSIWYG — the live capture-box preview shows exactly this)
  let dEff = aimDist;
  if (span) dEff = Math.max(aimDist, (span.near + span.far) / 2);
  const d = THREE.MathUtils.clamp(dEff, CAPTURE.minAimDist, CAPTURE.maxAimDist);
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  // HUD frame is 52vmin x 38vmin: convert to fractions of the actual viewport
  const vmin = Math.min(innerWidth, innerHeight);
  const fracH = (0.38 * vmin) / innerHeight;
  const fracW = (0.52 * vmin) / innerWidth;
  let halfH = Math.tan(vFov / 2) * d * fracH;
  let halfW = Math.tan(vFov / 2) * camera.aspect * d * fracW;
  let zNear = -Math.max(0.4, CAPTURE.nearFraction * d);
  let zFar = -(d + CAPTURE.depthMargin(d));
  if (span) {
    // swallow the whole aimed solid: widen laterally and in depth to its AABB
    halfW = Math.max(halfW, span.maxR + 0.3);
    halfH = Math.max(halfH, span.maxU + 0.3);
    zNear = -Math.max(0.4, Math.min(-zNear, span.near - 0.3));
    zFar = Math.min(zFar, -(span.far + 0.5));
  }
  return { d, halfW, halfH, zNear, zFar };
}

function buildBoxCutterDims(camera, dims) {
  const { halfW, halfH, zNear, zFar } = dims;
  const corners = [];
  for (const z of [zNear, zFar])
    for (const [sx, sy] of [[-1,-1],[1,-1],[1,1],[-1,1]])
      corners.push(new THREE.Vector3(sx * halfW, sy * halfH, z).applyMatrix4(camera.matrixWorld));
  return finalizeCutter(corners);
}

// Tier-3 (flag-gated): true perspective sub-frustum via unproject
function buildFrustumCutterDims(camera, dims) {
  const { d, zNear, zFar } = dims;
  const vmin = Math.min(innerWidth, innerHeight);
  const fx = (0.52 * vmin) / innerWidth, fy = (0.38 * vmin) / innerHeight;
  const corners = [];
  const proj = new THREE.Vector3();
  for (const dist of [-zNear, -zFar]) {
    // ndc z for a point at view-space depth `dist`
    proj.set(0, 0, -dist).applyMatrix4(camera.projectionMatrix);
    for (const [sx, sy] of [[-1,-1],[1,-1],[1,1],[-1,1]])
      corners.push(new THREE.Vector3(sx * fx, sy * fy, proj.z).unproject(camera));
  }
  return finalizeCutter(corners);
}

export function buildCutter(camera, aimDist, span = null) {
  camera.updateMatrixWorld();
  const dims = cutterDims(camera, aimDist, span);
  const brush = CAPTURE.frustumCutter
    ? buildFrustumCutterDims(camera, dims)
    : buildBoxCutterDims(camera, dims);
  return brush ? { brush, dims } : null;
}

// oriented box brush of given size at an arbitrary world transform (sky-photo carve knife)
export function buildCarveCutter(size, matrix) {
  const hw = size.x/2, hh = size.y/2, hd = size.z/2;
  const corners = [];
  for (const z of [-hd, hd])
    for (const [sx, sy] of [[-1,-1],[1,-1],[1,1],[-1,1]])
      corners.push(new THREE.Vector3(sx*hw, sy*hh, z).applyMatrix4(matrix));
  return finalizeCutter(corners);
}
