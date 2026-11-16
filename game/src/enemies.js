// Enemies: creation, marching along the road, slowing, damage and death.
// An enemy walks the waypoints in config.PATH_POINTS; reaching the last one
// leaks through to the crystal.

import { ENEMY_TYPES, PATH_POINTS, waveScaling } from './config.js';
import { sfx } from './audio.js';

// Length of each path segment, cached once.
const SEGMENTS = [];
for (let i = 0; i < PATH_POINTS.length - 1; i += 1) {
  const a = PATH_POINTS[i];
  const b = PATH_POINTS[i + 1];
  SEGMENTS.push(Math.hypot(b.x - a.x, b.y - a.y));
}
export const PATH_LENGTH = SEGMENTS.reduce((s, n) => s + n, 0);

export function createEnemy(type, wave, rng) {
  const def = ENEMY_TYPES[type];
  const hp = Math.round(def.hp * waveScaling(wave));
  const start = PATH_POINTS[0];
  return {
    type, def, hp, maxHp: hp,
    x: start.x + rng.range(-6, 6), y: start.y + rng.range(-8, 8),
    seg: 0, segDist: 0, totalDist: 0,
    speed: def.speed * rng.range(0.94, 1.06),
    slowUntil: 0, slowFactor: 1,
    bounty: def.bounty, leak: def.leak, radius: def.radius,
    wobble: rng.range(0, Math.PI * 2),
    flash: 0,
  };
}

// Move every enemy forward. Returns nothing; leaks are applied to the world.
export function updateEnemies(world, dt) {
  const now = world.time;
  for (let i = world.enemies.length - 1; i >= 0; i -= 1) {
    const e = world.enemies[i];
    const slowed = now < e.slowUntil;
    const speed = e.speed * (slowed ? e.slowFactor : 1) * dt;
    let move = speed;
    while (move > 0) {
      const left = SEGMENTS[e.seg] - e.segDist;
      if (move < left) {
        e.segDist += move;
        e.totalDist += move;
        move = 0;
      } else {
        move -= left;
        e.totalDist += left;
        e.seg += 1;
        e.segDist = 0;
        if (e.seg >= SEGMENTS.length) {
          // Reached the crystal: leak, hurt it, vanish in a red flash.
          world.lives -= e.leak;
          world.leaked += e.leak;
          world.flash = 0.5;
          world.shake = 10;
          world.particles.burst(e.x, e.y, '#ff3d5e', 16, 160, 0.5, 3.5);
          sfx.leak();
          world.enemies.splice(i, 1);
          move = 0;
          break;
        }
      }
    }
    if (e.seg < SEGMENTS.length) {
      const a = PATH_POINTS[e.seg];
      const b = PATH_POINTS[e.seg + 1];
      const t = e.segDist / SEGMENTS[e.seg];
      const wob = Math.sin(now * 6 + e.wobble) * 3;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = SEGMENTS[e.seg] || 1;
      const nx = -dy / len;
      const ny = dx / len;
      e.x = a.x + dx * t + nx * wob;
      e.y = a.y + dy * t + ny * wob;
    }
    if (e.flash > 0) e.flash -= dt;
  }
}

// Damage one enemy. Returns true when it dies (gold and score are paid here).
export function damageEnemy(world, enemy, amount) {
  enemy.hp -= amount;
  enemy.flash = 0.08;
  if (enemy.hp > 0) return false;
  world.gold += enemy.bounty;
  world.goldEarned += enemy.bounty;
  world.score += 10;
  world.kills += 1;
  world.particles.burst(enemy.x, enemy.y, enemy.def.color, 14, 170, 0.5, 3.5);
  world.particles.burst(enemy.x, enemy.y, '#ffd76a', 6, 120, 0.4, 2.5);
  world.particles.floatText(enemy.x, enemy.y - enemy.radius - 6, `+${enemy.bounty}`, '#ffd76a', 13);
  if (enemy.type === 'emberlord') {
    world.shake = 12;
    world.particles.burst(enemy.x, enemy.y, '#ff3d5e', 40, 260, 0.9, 4.5);
    world.particles.floatText(enemy.x, enemy.y - 40, 'EMBERLORD DOWN!', '#ff8aa5', 18);
  }
  sfx.enemyDie();
  if (Math.random() < 0.35) sfx.coin();
  const at = world.enemies.indexOf(enemy);
  if (at !== -1) world.enemies.splice(at, 1);
  return true;
}

// Chill an enemy: it moves slower until slowUntil.
export function slowEnemy(enemy, factor, duration, now) {
  enemy.slowFactor = Math.min(enemy.slowFactor, 1 - factor);
  if (enemy.slowFactor < 0.3) enemy.slowFactor = 0.3;
  enemy.slowUntil = Math.max(enemy.slowUntil, now + duration);
}
