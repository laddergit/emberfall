// Towers: buying, upgrading, selling, targeting, firing and projectiles.
// A tower sits on a plot, aims at the enemy furthest along the road within
// its range, and fires its own kind of shot.

import { TOWER_TYPES } from './config.js';
import { damageEnemy, slowEnemy } from './enemies.js';
import { sfx } from './audio.js';

const PROJECTILE_SPEED = 560;

export function towerStats(tower) {
  return TOWER_TYPES[tower.type].levels[tower.level - 1];
}

export function createTower(type, plotIndex, x, y) {
  return {
    type, level: 1, plotIndex, x, y,
    cooldown: 0, angle: -Math.PI / 2,
    invested: TOWER_TYPES[type].levels[0].cost,
    kills: 0,
  };
}

export function canAfford(world, cost) { return world.gold >= cost; }

export function placeTower(world, type, plotIndex) {
  const def = TOWER_TYPES[type];
  const cost = def.levels[0].cost;
  if (world.gold < cost) { sfx.denied(); return { ok: false, reason: 'Not enough gold' }; }
  if (world.towers.some((t) => t.plotIndex === plotIndex)) return { ok: false, reason: 'Plot is taken' };
  const plot = world.plots[plotIndex];
  world.gold -= cost;
  const tower = createTower(type, plotIndex, plot.x, plot.y);
  world.towers.push(tower);
  world.particles.burst(plot.x, plot.y, def.color, 18, 150, 0.5, 3);
  sfx.place();
  return { ok: true, tower };
}

export function upgradeCost(tower) {
  const def = TOWER_TYPES[tower.type];
  if (tower.level >= def.levels.length) return null;
  return def.levels[tower.level].cost;
}

export function upgradeTower(world, tower) {
  const cost = upgradeCost(tower);
  if (cost === null) return { ok: false, reason: 'Already max level' };
  if (world.gold < cost) { sfx.denied(); return { ok: false, reason: 'Not enough gold' }; }
  world.gold -= cost;
  tower.invested += cost;
  tower.level += 1;
  world.particles.burst(tower.x, tower.y, TOWER_TYPES[tower.type].glow, 22, 170, 0.6, 3.5);
  world.particles.floatText(tower.x, tower.y - 30, 'LEVEL UP!', '#ffffff', 14);
  sfx.upgrade();
  return { ok: true };
}

export function sellTower(world, tower) {
  const refund = Math.floor(tower.invested * 0.7);
  world.gold += refund;
  world.towers.splice(world.towers.indexOf(tower), 1);
  world.particles.burst(tower.x, tower.y, '#ffd76a', 12, 130, 0.45, 3);
  world.particles.floatText(tower.x, tower.y - 24, `+${refund}`, '#ffd76a', 13);
  sfx.coin();
  return refund;
}

// The enemy furthest along the road inside the tower's range, or null.
function pickTarget(world, tower, range) {
  let best = null;
  let bestDist = -1;
  for (const e of world.enemies) {
    const d = Math.hypot(e.x - tower.x, e.y - tower.y);
    if (d <= range && e.totalDist > bestDist) { best = e; bestDist = e.totalDist; }
  }
  return best;
}

function fireBolt(world, tower, stats, target) {
  world.projectiles.push({
    x: tower.x, y: tower.y - 10, target,
    tx: target.x, ty: target.y,
    speed: PROJECTILE_SPEED,
    damage: stats.damage, kind: tower.type,
    splash: stats.splash ?? 0,
    slow: stats.slow ?? 0, slowTime: stats.slowTime ?? 0,
    color: TOWER_TYPES[tower.type].color,
  });
  world.particles.burst(tower.x, tower.y - 12, TOWER_TYPES[tower.type].glow, 3, 60, 0.2, 2);
  if (tower.type === 'ember') sfx.emberShoot();
  else if (tower.type === 'frost') sfx.frostShoot();
  else sfx.cannonShoot();
}

// Storm Coil hits instantly and chains lightning to nearby enemies.
function fireChain(world, tower, stats, first) {
  let current = first;
  let fromX = tower.x;
  let fromY = tower.y - 10;
  const hit = new Set();
  const chains = stats.chain ?? 2;
  for (let link = 0; link <= chains && current; link += 1) {
    hit.add(current);
    world.particles.lightning(fromX, fromY, current.x, current.y, '#d9a5ff');
    world.particles.burst(current.x, current.y, '#c07bff', 6, 110, 0.3, 2.5);
    const wasAlive = damageEnemy(world, current, stats.damage);
    if (wasAlive) tower.kills += 1;
    fromX = current.x;
    fromY = current.y;
    let next = null;
    let nextD = 120;
    for (const e of world.enemies) {
      if (hit.has(e)) continue;
      const d = Math.hypot(e.x - fromX, e.y - fromY);
      if (d < nextD) { next = e; nextD = d; }
    }
    current = next;
  }
  sfx.stormShoot();
}

export function updateTowers(world, dt) {
  for (const tower of world.towers) {
    tower.cooldown -= dt;
    const stats = towerStats(tower);
    const target = pickTarget(world, tower, stats.range);
    if (target) {
      tower.angle = Math.atan2(target.y - (tower.y - 10), target.x - tower.x);
      if (tower.cooldown <= 0) {
        tower.cooldown = 1 / stats.rate;
        if (tower.type === 'storm') fireChain(world, tower, stats, target);
        else fireBolt(world, tower, stats, target);
      }
    }
  }
}

export function updateProjectiles(world, dt) {
  for (let i = world.projectiles.length - 1; i >= 0; i -= 1) {
    const p = world.projectiles[i];
    if (p.target && world.enemies.includes(p.target)) {
      p.tx = p.target.x;
      p.ty = p.target.y;
    }
    const dx = p.tx - p.x;
    const dy = p.ty - p.y;
    const dist = Math.hypot(dx, dy);
    const step = p.speed * dt;
    if (dist <= Math.max(step, 8)) {
      // Impact.
      if (p.splash > 0) {
        world.particles.burst(p.tx, p.ty, '#ff9a5c', 16, 190, 0.45, 3.5);
        world.shake = Math.max(world.shake, 3);
        for (const e of [...world.enemies]) {
          if (Math.hypot(e.x - p.tx, e.y - p.ty) <= p.splash + e.radius) {
            if (damageEnemy(world, e, p.damage)) {
              // kills are counted on the tower that fired it
            }
          }
        }
      } else if (p.target && world.enemies.includes(p.target)) {
        if (p.slow > 0) slowEnemy(p.target, p.slow, p.slowTime, world.time);
        world.particles.burst(p.tx, p.ty, p.color, 5, 90, 0.25, 2);
        damageEnemy(world, p.target, p.damage);
      }
      world.projectiles.splice(i, 1);
      continue;
    }
    p.x += (dx / dist) * step;
    p.y += (dy / dist) * step;
  }
}
