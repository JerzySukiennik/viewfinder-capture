// materials.js — shared flat-pastel materials. One surface material for all capturables
// (readability: one color game-wide means "photographable"), one cross-section material.

import * as THREE from 'three';
import { PALETTE } from '../config.js';

const cache = new Map();

export function mat(name) {
  if (cache.has(name)) return cache.get(name);
  let m;
  switch (name) {
    case 'capturable':
      m = new THREE.MeshLambertMaterial({ color: PALETTE.capturable });
      break;
    case 'cross':
      m = new THREE.MeshLambertMaterial({ color: PALETTE.crossCut, emissive: 0x332a1a, emissiveIntensity: 0.25 });
      break;
    case 'teleport-on':
      m = new THREE.MeshLambertMaterial({ color: PALETTE.teleport, emissive: PALETTE.teleport, emissiveIntensity: 0.9 });
      break;
    case 'teleport-off':
      m = new THREE.MeshLambertMaterial({ color: PALETTE.teleportOff });
      break;
    case 'battery':
      m = new THREE.MeshLambertMaterial({ color: PALETTE.battery, emissive: PALETTE.battery, emissiveIntensity: 0.55 });
      break;
    case 'socket-hungry':
      m = new THREE.MeshLambertMaterial({ color: PALETTE.teleport, emissive: PALETTE.teleport, emissiveIntensity: 0.75 });
      break;
    case 'socket-base':
      m = new THREE.MeshLambertMaterial({ color: PALETTE.socket });
      break;
    default: {
      const color = PALETTE[name] !== undefined ? PALETTE[name] : 0xcccccc;
      m = new THREE.MeshLambertMaterial({ color });
    }
  }
  cache.set(name, m);
  return m;
}

export function ghostMaterial(ok = true) {
  const key = ok ? '_ghost-ok' : '_ghost-bad';
  if (!cache.has(key)) {
    cache.set(key, new THREE.MeshBasicMaterial({
      color: ok ? PALETTE.ghostOk : PALETTE.ghostBad,
      transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide,
    }));
  }
  return cache.get(key);
}

export function outlineMaterial() {
  if (!cache.has('_outline')) {
    cache.set('_outline', new THREE.LineBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.5,
    }));
  }
  return cache.get('_outline');
}
