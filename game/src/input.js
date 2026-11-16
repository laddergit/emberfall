// Mouse and keyboard: building, selecting, upgrading, selling, pausing,
// restarting — and the hotkeys. Hit regions come from render.js so the
// clicks and the drawing can never disagree.

import { MAP_Y, TOWER_ORDER, TOWER_TYPES } from './config.js';
import {
  shopCardRect, SEND_WAVE_RECT, HUD_BUTTONS, START_BUTTON, AGAIN_BUTTON,
} from './render.js';
import { placeTower, upgradeTower, sellTower } from './towers.js';
import { startWave } from './world.js';
import { unlockAudio, toggleMute, sfx } from './audio.js';

function pointIn(r, x, y) {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

export function attachInput(canvas, world, hooks) {
  const toLogical = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  function plotAt(x, y) {
    let best = null;
    let bestD = 34;
    for (let i = 0; i < world.plots.length; i += 1) {
      const p = world.plots[i];
      const d = Math.hypot(x - p.x, y - (p.y + MAP_Y));
      if (d < bestD) { best = i; bestD = d; }
    }
    return best;
  }

  function towerAt(x, y) {
    for (const t of world.towers) {
      if (Math.hypot(x - t.x, y - (t.y + MAP_Y)) < 30) return t;
    }
    return null;
  }

  function startGame() {
    unlockAudio();
    hooks.startGame();
  }

  canvas.addEventListener('mousemove', (event) => {
    const { x, y } = toLogical(event);
    world.mouseX = x;
    world.mouseY = y;
    world.hoverPlot = world.screen === 'play' ? plotAt(x, y) : null;
    world.hoverTower = world.screen === 'play' ? towerAt(x, y) : null;
    world.hoverButton = null;
    for (const b of HUD_BUTTONS) if (pointIn(b, x, y)) world.hoverButton = b.id;
    world.hoverShop = -1;
    for (let i = 0; i < TOWER_ORDER.length; i += 1) {
      if (pointIn(shopCardRect(i), x, y)) world.hoverShop = i;
    }
  });

  canvas.addEventListener('click', (event) => {
    unlockAudio();
    const { x, y } = toLogical(event);
    if (world.screen === 'title') {
      if (pointIn(START_BUTTON, x, y)) startGame();
      return;
    }
    if (world.screen === 'over') {
      if (pointIn(AGAIN_BUTTON, x, y)) hooks.restart();
      return;
    }
    // HUD buttons.
    for (const b of HUD_BUTTONS) {
      if (!pointIn(b, x, y)) continue;
      if (b.id === 'pause') { world.paused = !world.paused; sfx.click(); }
      else if (b.id === 'speed') { world.speed = world.speed === 1 ? 2 : 1; sfx.click(); }
      else if (b.id === 'sound') { world.muted = toggleMute(); sfx.click(); }
      else if (b.id === 'restart') hooks.restart();
      return;
    }
    // Shop cards: pick a tower type to place.
    for (let i = 0; i < TOWER_ORDER.length; i += 1) {
      if (pointIn(shopCardRect(i), x, y)) {
        const key = TOWER_ORDER[i];
        world.shopSelected = world.shopSelected === key ? null : key;
        world.selectedTower = null;
        sfx.click();
        return;
      }
    }
    // Send wave.
    if (world.phase === 'build' && pointIn(SEND_WAVE_RECT, x, y)) {
      startWave(world);
      return;
    }
    // Upgrade / sell buttons of the selected tower.
    if (world.selectedTower) {
      if (world.upgradeRect && pointIn(world.upgradeRect, x, y)) {
        const r = upgradeTower(world, world.selectedTower);
        if (!r.ok) showToast(world, r.reason);
        return;
      }
      if (world.sellRect && pointIn(world.sellRect, x, y)) {
        sellTower(world, world.selectedTower);
        world.selectedTower = null;
        return;
      }
    }
    // Plots: place the chosen tower, or select the tower standing there.
    const plot = plotAt(x, y);
    if (plot !== null) {
      const existing = world.towers.find((t) => t.plotIndex === plot);
      if (world.shopSelected) {
        const r = placeTower(world, world.shopSelected, plot);
        if (r.ok) {
          world.shopSelected = null;
          world.selectedTower = r.tower;
        } else {
          showToast(world, r.reason);
        }
      } else if (existing) {
        world.selectedTower = existing;
        sfx.click();
      }
      return;
    }
    // Clicked a tower directly.
    const tower = towerAt(x, y);
    if (tower) {
      world.selectedTower = tower;
      world.shopSelected = null;
      sfx.click();
      return;
    }
    // Anywhere else clears the selection.
    world.selectedTower = null;
    world.shopSelected = null;
  });

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const k = event.key.toLowerCase();
    unlockAudio();
    if (k === 'enter') {
      if (world.screen === 'title') startGame();
      else if (world.screen === 'play' && world.phase === 'build') startWave(world);
      return;
    }
    if (k === 'r') { hooks.restart(); return; }
    if (k === 'm') { world.muted = toggleMute(); return; }
    if (world.screen !== 'play') return;
    if (k === ' ') { event.preventDefault(); world.paused = !world.paused; return; }
    if (k === 'f') { world.speed = world.speed === 1 ? 2 : 1; return; }
    if (k === 'escape') { world.shopSelected = null; world.selectedTower = null; return; }
    for (const key of TOWER_ORDER) {
      if (k === TOWER_TYPES[key].key) {
        world.shopSelected = world.shopSelected === key ? null : key;
        world.selectedTower = null;
        sfx.click();
      }
    }
  });
}

function showToast(world, text) {
  world.toast = text;
  world.toastTimer = 2.0;
}
