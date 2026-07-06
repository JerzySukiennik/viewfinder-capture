// hud.js — gameplay HUD layer: crosshair frame, photo slots, mode chip, prompts,
// hints, flash, help overlay, dev stats. Pure consumer of game state/events.

import { events } from '../engine/events.js';

const $ = id => document.getElementById(id);

export class Hud {
  constructor() {
    this.root = $('hud');
    this.frame = $('frame');
    this.chip = $('modechip');
    this.prompt = $('prompt');
    this.hint = $('hint');
    this.slotsEl = $('slots');
    this.fpsEl = $('fps');
    this.flashEl = $('flash');
    this.helpOverlay = $('help-overlay');
    this._hintTimer = 0;
    this._promptTimer = 0;
    this.showStats = false;
    this._slotCount = 3;

    $('help').innerHTML = [
      ['WASD + mouse', 'move / look'],
      ['LMB', 'take a photo — or place the armed one'],
      ['1 · 2 · 3', 'arm a photo for placing'],
      ['scroll', 'push / pull along your aim'],
      ['Q / E', 'tilt the photo'],
      ['R', 'flip it over'],
      ['T', 'straighten'],
      ['RMB / Esc', 'stop placing'],
      ['F', 'pick up / put down'],
      ['Z', 'undo'],
      ['P', 'reset level'],
      ['H', 'this help'],
    ].map(([k, v]) => `<div><b>${k}</b> ${v}</div>`).join('');

    events.on('inventory-changed', inv => this.renderSlots(inv));
    events.on('mode-changed', m => this.setMode(m));
  }

  show(on) { this.root.style.display = on ? '' : 'none'; }

  setMode(mode) {
    this.chip.innerHTML = mode === 'placement'
      ? '<b>PLACING</b> · scroll depth · Q/E tilt · R flip · RMB cancel'
      : 'CAPTURE';
    this.frame.style.opacity = mode === 'placement' ? '0' : '1';
  }

  renderSlots(inv) {
    this._slotCount = inv.slots.length;
    this.slotsEl.innerHTML = '';
    inv.slots.forEach((p, i) => {
      const el = document.createElement('div');
      el.className = 'slot' + (p ? ' filled' : '') + (inv.selected === i ? ' active' : '');
      const key = document.createElement('span');
      key.className = 'key';
      key.textContent = i + 1;
      if (p?.thumbnail) el.appendChild(p.thumbnail);
      if (p?.isEmpty) {
        const sky = document.createElement('div');
        sky.className = 'sky';
        sky.textContent = 'SKY';
        el.appendChild(sky);
      }
      el.appendChild(key);
      this.slotsEl.appendChild(el);
    });
  }

  showPrompt(text, seconds = 0) {
    this.prompt.textContent = text;
    this.prompt.style.opacity = text ? '1' : '0';
    this._promptTimer = seconds > 0 ? seconds : 0;
  }

  showHint(text) {
    this.hint.textContent = text;
    this.hint.style.opacity = '1';
    this._hintTimer = 2.4;
  }

  flash(strength = 1) {
    this.flashEl.style.transition = 'none';
    this.flashEl.style.opacity = String(0.85 * strength);
    requestAnimationFrame(() => {
      this.flashEl.style.transition = 'opacity 0.28s ease-out';
      this.flashEl.style.opacity = '0';
    });
  }

  toggleHelp(force) {
    const show = force !== undefined ? force : this.helpOverlay.classList.contains('hidden');
    this.helpOverlay.classList.toggle('hidden', !show);
    return show;
  }

  tick(dt, stats) {
    if (this._hintTimer > 0) {
      this._hintTimer -= dt;
      if (this._hintTimer <= 0) this.hint.style.opacity = '0';
    }
    if (this._promptTimer > 0) {
      this._promptTimer -= dt;
      if (this._promptTimer <= 0) this.showPrompt('');
    }
    if (this.showStats && stats) {
      this.fpsEl.style.display = 'block';
      const heap = performance.memory
        ? ` heap ${(performance.memory.usedJSHeapSize / 1048576).toFixed(0)}MB` : '';
      this.fpsEl.textContent =
        `${stats.fps} fps  ${stats.drawCalls} dc  ${(stats.triangles/1000).toFixed(0)}k tri\n` +
        `geo ${stats.geometries} tex ${stats.textures}${heap}`;
    } else {
      this.fpsEl.style.display = 'none';
    }
  }
}
