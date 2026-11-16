// The world: the whole game state, the wave spawner, the build/combat
// phases and the win/lose rules. Systems (towers, enemies, particles) act
// on this state; render only reads it.

import {
  PLOTS, PATH_POINTS, CRYSTAL_HP, START_GOLD, TOTAL_WAVES,
  WAVE_BONUS_BASE, WAVE_BONUS_PER_WAVE, BUILD_SECONDS, waveGroups,
} from './config.js';
import { makeRng } from './random.js';
import { makeParticles } from './particles.js';
import { createEnemy, updateEnemies } from './enemies.js';
import { updateTowers, updateProjectiles } from './towers.js';
import { sfx } from './audio.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

export function createWorld(seed = 7) {
  const rng = makeRng(seed);
  const world = {
    seed,
    rng,
    screen: SCREEN_TITLE,
    paused: false,
    speed: 1,
    gold: START_GOLD,
    goldEarned: 0,
    lives: CRYSTAL_HP,
    score: 0,
    kills: 0,
    leaked: 0,
    wave: 0,
    phase: 'build', // 'build' | 'wave' | 'clear'
    buildTimer: BUILD_SECONDS,
    towers: [],
    enemies: [],
    projectiles: [],
    spawnQueue: [],
    spawnTimer: 0,
    plots: PLOTS.map((p) => ({ x: p.x, y: p.y, tower: null })),
    particles: makeParticles(),
    time: 0,
    shake: 0,
    flash: 0,
    won: false,
    lost: false,
    toast: null,
    toastTimer: 0,
    best: 0,
    crystal: { x: PATH_POINTS[PATH_POINTS.length - 1].x, y: PATH_POINTS[PATH_POINTS.length - 1].y },
  };
  return world;
}

export function resetWorld(world, seed = 7) {
  const fresh = createWorld(seed);
  fresh.best = world.best;
  Object.assign(world, fresh);
}

export function showToast(world, text, seconds = 2.4) {
  world.toast = text;
  world.toastTimer = seconds;
}

// Start the next wave: build the spawn queue from the wave table.
export function startWave(world) {
  if (world.phase !== 'build' || world.screen !== SCREEN_PLAY) return false;
  world.wave += 1;
  world.phase = 'wave';
  world.spawnQueue = [];
  let at = 0;
  for (const group of waveGroups(world.wave)) {
    for (let i = 0; i < group.count; i += 1) {
      world.spawnQueue.push({ type: group.type, at });
      at += group.gap;
    }
    at += 1.2;
  }
  world.spawnTimer = 0;
  showToast(world, `WAVE ${world.wave} — ${world.wave === TOTAL_WAVES ? 'FINAL WAVE!' : 'they come...'}`, 2.6);
  sfx.waveHorn();
  return true;
}

function finishWave(world) {
  const bonus = WAVE_BONUS_BASE + WAVE_BONUS_PER_WAVE * world.wave;
  world.gold += bonus;
  world.goldEarned += bonus;
  world.score += 100 + world.wave * 20;
  if (world.wave >= TOTAL_WAVES) {
    world.won = true;
    world.screen = SCREEN_OVER;
    world.score += world.lives * 100;
    world.particles.burst(world.crystal.x, world.crystal.y, '#ffd76a', 60, 320, 1.2, 5);
    sfx.win();
    return;
  }
  world.phase = 'build';
  world.buildTimer = BUILD_SECONDS;
  showToast(world, `Wave ${world.wave} cleared!  +${bonus} gold`, 2.6);
  sfx.waveClear();
}

function checkEnd(world) {
  if (world.lives <= 0 && !world.lost) {
    world.lost = true;
    world.screen = SCREEN_OVER;
    world.enemies.length = 0;
    world.projectiles.length = 0;
    sfx.lose();
  }
}

// One fixed update step. dt is real seconds (already speed-scaled by main).
export function updateWorld(world, dt) {
  world.time += dt;
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 26);
  if (world.flash > 0) world.flash = Math.max(0, world.flash - dt * 1.6);
  if (world.toastTimer > 0) {
    world.toastTimer -= dt;
    if (world.toastTimer <= 0) world.toast = null;
  }
  world.particles.update(dt);
  if (world.screen !== SCREEN_PLAY || world.paused) return;

  if (world.phase === 'build') {
    world.buildTimer -= dt;
    if (world.buildTimer <= 0) startWave(world);
  } else if (world.phase === 'wave') {
    world.spawnTimer += dt;
    while (world.spawnQueue.length > 0 && world.spawnQueue[0].at <= world.spawnTimer) {
      const next = world.spawnQueue.shift();
      world.enemies.push(createEnemy(next.type, world.wave, world.rng));
    }
    if (world.spawnQueue.length === 0 && world.enemies.length === 0) {
      finishWave(world);
    }
  }

  updateTowers(world, dt);
  updateProjectiles(world, dt);
  updateEnemies(world, dt);
  checkEnd(world);
}

// Ambient ember motes that drift up over the map on the title screen.
export function ambientEmbers(world, dt) {
  world.time += dt;
  world.particles.update(dt);
  if (world.rng.next() < dt * 14) {
    world.particles.burst(
      world.rng.range(20, 940), 660,
      world.rng.pick(['#ff9a3c', '#ffb35c', '#ff5d5d', '#ffd76a']),
      1, 22, 2.4, 2.2, -30,
    );
  }
}
