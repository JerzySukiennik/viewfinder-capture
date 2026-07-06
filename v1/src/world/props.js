// props.js — mesh builders for level data primitives. Every capturable-eligible prop
// (box, wedge, cylinder) is a closed two-manifold solid; stairs are static-only.

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, outlineMaterial } from './materials.js';

// wedge: 6 verts, 8 tris, ramp face rising toward -Z, centered at origin
const WEDGE_TRIS = [
  [0,1,2],[0,2,3],   // bottom
  [0,4,5],[0,5,1],   // back  (z=-hd)
  [4,3,2],[4,2,5],   // slope
  [0,3,4],           // left
  [1,5,2],           // right
];

function wedgeGeometry(w, h, d) {
  const hw = w/2, hh = h/2, hd = d/2;
  const v = [
    [-hw,-hh,-hd],[hw,-hh,-hd],[hw,-hh,hd],[-hw,-hh,hd],
    [-hw, hh,-hd],[hw, hh,-hd],
  ];
  const pos = [];
  for (const t of WEDGE_TRIS) for (const i of t) pos.push(...v[i]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function stairsGeometry(w, h, d, steps = Math.max(3, Math.round(h / 0.25))) {
  const geos = [];
  const stepH = h / steps, stepD = d / steps;
  for (let i = 0; i < steps; i++) {
    const g = new THREE.BoxGeometry(w, stepH * (i + 1), stepD);
    g.translate(0, (stepH * (i + 1)) / 2 - h / 2, d / 2 - stepD * (i + 0.5));
    geos.push(g);
  }
  return BufferGeometryUtils.mergeGeometries(geos, false);
}

export function propGeometry(def) {
  const s = def.size;
  switch (def.type) {
    case 'box':      return new THREE.BoxGeometry(s[0], s[1], s[2]);
    case 'wedge':    return wedgeGeometry(s[0], s[1], s[2]);
    case 'cylinder': return new THREE.CylinderGeometry(s[0], s[0], s[1], 14);
    case 'stairs':   return stairsGeometry(s[0], s[1], s[2]);
    default: throw new Error(`unknown prop type ${def.type}`);
  }
}

export function buildProp(def) {
  if (def.capturable && def.type === 'stairs')
    throw new Error('stairs cannot be capturable (non-manifold)');
  const geo = propGeometry(def);
  const material = def.capturable ? mat('capturable') : mat(def.mat || 'wall');
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.fromArray(def.pos);
  if (def.rot) mesh.rotation.set(def.rot[0], def.rot[1], def.rot[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (def.capturable) {
    mesh.userData.capturable = true;
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo, 24), outlineMaterial());
    mesh.add(edges);
  }
  return mesh;
}

export function buildTeleport(def) {
  const group = new THREE.Group();
  group.position.fromArray(def.pos);
  if (def.rot) group.rotation.set(def.rot[0], def.rot[1], def.rot[2]);

  const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.45, 0.22, 20), mat('socket-base'));
  pad.position.y = 0.11;
  pad.castShadow = pad.receiveShadow = true;
  group.add(pad);

  const ringGeo = new THREE.TorusGeometry(1.05, 0.09, 10, 32);
  const ring = new THREE.Mesh(ringGeo, mat('teleport-off'));
  ring.position.y = 1.65;
  group.add(ring);

  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.78, 0.78, 0.02, 20), mat('teleport-off'));
  core.position.y = 1.65;
  core.rotation.x = Math.PI / 2;
  group.add(core);

  group.userData.ring = ring;
  group.userData.core = core;
  group.userData.collidable = [pad];
  return group;
}

export function buildSocket(def) {
  const group = new THREE.Group();
  group.position.fromArray(def.pos);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.5, 12), mat('socket-base'));
  base.position.y = 0.25;
  base.castShadow = base.receiveShadow = true;
  group.add(base);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 8, 24), mat('socket-hungry'));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.53;
  group.add(ring);
  group.userData.ring = ring;
  group.userData.collidable = [base];
  return group;
}

export function buildBattery() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.4, 10), mat('wallDark'));
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.14, 10), mat('battery'));
  cap.position.y = 0.2;
  body.castShadow = true;
  group.add(body, cap);
  group.userData.battery = true;
  return group;
}
