// Emberfall boot: canvas, fixed-step loop, screen flow, and the ?shot=
// scene staging the screenshots are taken from.

import { VIEW_WIDTH, VIEW_HEIGHT } from './config.js';
import { createWorld, resetWorld, updateWorld, ambientEmbers, SCREEN_TITLE } from './world.js';
import { drawGame } from './render.js';
import { attachInput } from './input.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const world = createWorld(7);
world.best = Number(localStorage.getItem('emberfall-best') || 0);
world.muted = false;
world.mouseX = -1;
world.mouseY = -1;
world.hoverPlot = null;
world.hoverTower = null;
world.hoverButton = null;
world.hoverShop = -1;
world.shopSelected = null;
world.selectedTower = null;
world.upgradeRect = null;
world.sellRect = null;

function startGame() {
  resetWorld(world, (Math.random() * 1e9) | 0);
  world.screen = 'play';
  world.best = Number(localStorage.getItem('emberfall-best') || 0);
}

function restart() {
  resetWorld(world, (Math.random() * 1e9) | 0);
  world.screen = 'play';
  world.best = Number(localStorage.getItem('emberfall-best') || 0);
}

attachInput(canvas, world, { startGame, restart });

function announce() {
  if (!statusEl) return;
  if (world.screen === 'title') statusEl.textContent = 'Emberfall title screen. Press Enter to start.';
  else if (world.screen === 'over') statusEl.textContent = world.won
    ? `Victory. Score ${world.score}. Press R to play again.`
    : `Defeat on wave ${world.wave}. Score ${world.score}. Press R to try again.`;
  else statusEl.textContent = `Wave ${world.wave}, gold ${world.gold}, crystal ${world.lives}, score ${world.score}.`;
}

// Surface any script error in the DOM so a headless check can see it.
window.addEventListener('error', (event) => {
  document.title = `ERROR: ${event.message}`;
  const el = document.createElement('div');
  el.id = 'js-error';
  el.textContent = String(event.message);
  document.body.appendChild(el);
});

// Screenshot staging: ?shot=start|play|boss|win renders one frozen frame
// of the real game and stops — no loop, so the frame is deterministic.
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || 7);

if (shot) {
  try {
    stageShot(shot, world, seed);
    drawGame(ctx, world);
    announce();
  } catch (err) {
    document.title = `ERROR: ${err.message}`;
    const el = document.createElement('div');
    el.id = 'js-error';
    el.textContent = String(err && err.message ? err.message : err);
    document.body.appendChild(el);
  }
} else {
  // Normal play: fixed 60 Hz steps, scaled by the speed toggle.
  const STEP = 1 / 60;
  let last = performance.now();
  let acc = 0;
  let lastAnnounce = 0;
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    acc += dt * world.speed;
    while (acc >= STEP) {
      if (world.screen === SCREEN_TITLE) ambientEmbers(world, STEP);
      else updateWorld(world, STEP);
      acc -= STEP;
    }
    if (world.screen === 'over' && world.score > world.best) {
      world.best = world.score;
      localStorage.setItem('emberfall-best', String(world.best));
    }
    drawGame(ctx, world);
    if (now - lastAnnounce > 900) { announce(); lastAnnounce = now; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Debug handle (also handy for headless play-tests).
window.__emberfall = { world, startGame, restart };
