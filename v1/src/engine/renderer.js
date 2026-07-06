// renderer.js — WebGLRenderer + half-res bloom + 60fps cap + stats. Owns the render loop.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BUDGET } from '../config.js';

export class Renderer {
  constructor(container) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;   // static world: re-render shadows only on world-changed
    this.renderer.info.autoReset = false;
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 300);
    this.scene = new THREE.Scene();

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.35, 0.65, 0.82);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this._accum = 0;
    this._last = performance.now();
    this._frameMs = 1000 / BUDGET.fpsCap;
    this._cb = null;
    this._running = false;
    this.fps = 0;
    this._fpsFrames = 0;
    this._fpsTime = 0;

    addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
      this.composer.setSize(innerWidth, innerHeight);
    });
  }

  shadowsDirty() { this.renderer.shadowMap.needsUpdate = true; }

  start(cb) {
    this._cb = cb;
    if (this._running) return;
    this._running = true;
    this._last = performance.now();
    const loop = (now) => {
      if (!this._running) return;
      requestAnimationFrame(loop);
      const elapsed = now - this._last;
      // cap ~60 on high-Hz displays; 15ms threshold never skips on a 60Hz panel
      if (elapsed < 15.0) return;
      this._last = now;
      const dt = Math.min(elapsed / 1000, 0.1);
      this._fpsFrames++; this._fpsTime += elapsed;
      if (this._fpsTime >= 500) {
        this.fps = Math.round(this._fpsFrames * 1000 / this._fpsTime);
        this._fpsFrames = 0; this._fpsTime = 0;
      }
      this._cb?.(dt);
      this.renderer.info.reset();
      this.composer.render();
      const i = this.renderer.info;
      this._statsFrame = {
        drawCalls: i.render.calls, triangles: i.render.triangles,
        geometries: i.memory.geometries, textures: i.memory.textures,
      };
    };
    requestAnimationFrame(loop);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this._running = false; }
      else if (this._cb) { this._running = false; this.start(this._cb); }
    });
  }

  // one shared cosmetic render target for photo thumbnails (never gameplay geometry)
  snapshot() {
    const W = 256, H = 192;
    if (!this._rt) this._rt = new THREE.WebGLRenderTarget(W, H);
    const prev = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this._rt);
    this.renderer.render(this.scene, this.camera);
    const buf = new Uint8Array(W * H * 4);
    this.renderer.readRenderTargetPixels(this._rt, 0, 0, W, H, buf);
    this.renderer.setRenderTarget(prev);
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(W, H);
    for (let y = 0; y < H; y++)
      img.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
    ctx.putImageData(img, 0, 0);
    return cv;
  }

  stats() {
    const i = this.renderer.info;
    return {
      fps: this.fps,
      drawCalls: this._statsFrame?.drawCalls ?? 0,
      triangles: this._statsFrame?.triangles ?? 0,
      geometries: i.memory.geometries,
      textures: i.memory.textures,
    };
  }
}
