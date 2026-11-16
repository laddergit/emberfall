// Every pixel of Emberfall: terrain, road, crystal, towers, enemies,
// projectiles, HUD, shop, title and end screens. One canvas, no DOM UI,
// so a screenshot always shows the whole game.

import {
  VIEW_WIDTH, VIEW_HEIGHT, HUD_HEIGHT, MAP_Y, MAP_WIDTH, SHOP_X, SHOP_WIDTH,
  PATH_POINTS, PATH_HALF_WIDTH, PLOT_RADIUS, TOTAL_WAVES, TOWER_TYPES,
  TOWER_ORDER, ENEMY_TYPES, wavePreview, CRYSTAL_HP,
} from './config.js';
import { towerStats, upgradeCost } from './towers.js';
import { SCREEN_PLAY } from './world.js';

// Sidebar card geometry, shared with input.js for hit testing.
export const SHOP_CARD_H = 88;
export const SHOP_CARD_GAP = 8;
export const SHOP_TOP = 104;
export function shopCardRect(i) {
  return { x: SHOP_X + 12, y: SHOP_TOP + i * (SHOP_CARD_H + SHOP_CARD_GAP), w: SHOP_WIDTH - 24, h: SHOP_CARD_H };
}
export const SEND_WAVE_RECT = { x: SHOP_X + 12, y: 648, w: SHOP_WIDTH - 24, h: 52 };
export const HUD_BUTTONS = [
  { id: 'speed', x: VIEW_WIDTH - 218, y: 12, w: 46, h: 40 },
  { id: 'pause', x: VIEW_WIDTH - 164, y: 12, w: 46, h: 40 },
  { id: 'sound', x: VIEW_WIDTH - 110, y: 12, w: 46, h: 40 },
  { id: 'restart', x: VIEW_WIDTH - 56, y: 12, w: 46, h: 40 },
];
export const START_BUTTON = { x: VIEW_WIDTH / 2 - 130, y: 470, w: 260, h: 64 };
export const AGAIN_BUTTON = { x: VIEW_WIDTH / 2 - 130, y: 520, w: 260, h: 60 };

const FONT = '"Trebuchet MS", Verdana, sans-serif';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawTerrain(ctx, world) {
  const g = ctx.createLinearGradient(0, MAP_Y, 0, VIEW_HEIGHT);
  g.addColorStop(0, '#1b1e30');
  g.addColorStop(0.55, '#171a28');
  g.addColorStop(1, '#12141f');
  ctx.fillStyle = g;
  ctx.fillRect(0, MAP_Y, MAP_WIDTH, VIEW_HEIGHT - MAP_Y);
  // Deterministic speckles: same every frame, no RNG in the draw path.
  for (let i = 0; i < 130; i += 1) {
    const x = (i * 137.5) % MAP_WIDTH;
    const y = MAP_Y + ((i * 89.3) % (VIEW_HEIGHT - MAP_Y));
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255,154,60,0.05)' : 'rgba(120,140,200,0.05)';
    ctx.beginPath();
    ctx.arc(x, y, 2 + (i % 4), 0, Math.PI * 2);
    ctx.fill();
  }
  // Scorched patches near the road.
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (const p of [{ x: 90, y: 320 }, { x: 520, y: 430 }, { x: 800, y: 210 }, { x: 300, y: 560 }]) {
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + MAP_Y, 70, 34, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRoad(ctx) {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const pts = PATH_POINTS.map((p) => [p.x, p.y + MAP_Y]);
  ctx.strokeStyle = '#2c3040';
  ctx.lineWidth = PATH_HALF_WIDTH * 2 + 6;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.stroke();
  ctx.strokeStyle = '#454a5e';
  ctx.lineWidth = PATH_HALF_WIDTH * 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,200,120,0.35)';
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 18]);
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPlots(ctx, world) {
  for (let i = 0; i < world.plots.length; i += 1) {
    const plot = world.plots[i];
    const x = plot.x;
    const y = plot.y + MAP_Y;
    const taken = world.towers.some((t) => t.plotIndex === i);
    const hovered = world.hoverPlot === i;
    const ghost = world.shopSelected && hovered && !taken;
    ctx.beginPath();
    ctx.arc(x, y, PLOT_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = taken ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.07)';
    ctx.fill();
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = ghost ? '#ffd76a' : hovered ? '#ffffff' : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = ghost ? 2.5 : 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
    if (!taken) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = `bold 20px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', x, y + 1);
    }
  }
}

function drawCrystal(ctx, world) {
  const c = world.crystal;
  const x = c.x;
  const y = c.y + MAP_Y;
  const pulse = 1 + Math.sin(world.time * 2.2) * 0.06;
  const frac = Math.max(0, world.lives / CRYSTAL_HP);
  // Glow.
  const glow = ctx.createRadialGradient(x, y, 4, x, y, 74 * pulse);
  glow.addColorStop(0, 'rgba(255,190,90,0.55)');
  glow.addColorStop(1, 'rgba(255,190,90,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 74 * pulse, 0, Math.PI * 2);
  ctx.fill();
  // Gem: a faceted diamond.
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 1.35);
  const gem = ctx.createLinearGradient(-26, -26, 26, 26);
  gem.addColorStop(0, '#fff3c4');
  gem.addColorStop(0.45, '#ffb35c');
  gem.addColorStop(1, '#e86a1e');
  ctx.fillStyle = gem;
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.lineTo(22, 0);
  ctx.lineTo(0, 30);
  ctx.lineTo(-22, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -30); ctx.lineTo(0, 30);
  ctx.moveTo(-22, 0); ctx.lineTo(22, 0);
  ctx.stroke();
  ctx.restore();
  // Health ring.
  ctx.beginPath();
  ctx.arc(x, y, 44, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
  ctx.strokeStyle = frac > 0.5 ? '#7be07b' : frac > 0.25 ? '#ffd76a' : '#ff5d5d';
  ctx.lineWidth = 5;
  ctx.stroke();
  // Orbiting sparks.
  for (let i = 0; i < 3; i += 1) {
    const a = world.time * 1.4 + (i * Math.PI * 2) / 3;
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * 52, y + Math.sin(a) * 52, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTowerShape(ctx, tower, world) {
  const def = TOWER_TYPES[tower.type];
  const x = tower.x;
  const y = tower.y + MAP_Y - 6;
  // Stone base.
  ctx.fillStyle = '#3d4257';
  ctx.beginPath();
  ctx.arc(x, y + 8, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#565d78';
  ctx.beginPath();
  ctx.arc(x, y + 8, 19, 0, Math.PI * 2);
  ctx.fill();
  if (tower.type === 'ember') {
    // Flame spire: a triangle flame that flickers.
    const fl = 1 + Math.sin(world.time * 9 + tower.x) * 0.12;
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.moveTo(x, y - 26 * fl);
    ctx.quadraticCurveTo(x + 13, y - 2, x + 6, y + 8);
    ctx.quadraticCurveTo(x, y + 2, x - 6, y + 8);
    ctx.quadraticCurveTo(x - 13, y - 2, x, y - 26 * fl);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.moveTo(x, y - 14 * fl);
    ctx.quadraticCurveTo(x + 6, y, x, y + 6);
    ctx.quadraticCurveTo(x - 6, y, x, y - 14 * fl);
    ctx.fill();
  } else if (tower.type === 'frost') {
    // Ice diamond, slowly turning.
    ctx.save();
    ctx.translate(x, y - 8);
    ctx.rotate(Math.sin(world.time * 1.2 + tower.x) * 0.25);
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.moveTo(0, -20); ctx.lineTo(13, 0); ctx.lineTo(0, 20); ctx.lineTo(-13, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#eaf9ff';
    ctx.beginPath();
    ctx.moveTo(0, -12); ctx.lineTo(7, 0); ctx.lineTo(0, 12); ctx.lineTo(-7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (tower.type === 'cannon') {
    // Mortar: a dome with a barrel that tracks the target.
    ctx.fillStyle = def.dark;
    ctx.beginPath();
    ctx.arc(x, y + 2, 15, Math.PI, 0);
    ctx.fill();
    ctx.save();
    ctx.translate(x, y - 2);
    ctx.rotate(tower.angle);
    ctx.fillStyle = '#20242f';
    ctx.fillRect(0, -4.5, 24, 9);
    ctx.fillStyle = def.color;
    ctx.fillRect(18, -4.5, 6, 9);
    ctx.restore();
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(x, y + 2, 5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Storm coil: stacked rings with a crackling orb.
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.ellipse(x, y - 2 - i * 7, 13 - i * 3, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    const flick = 0.7 + Math.random() * 0.3;
    ctx.fillStyle = def.glow;
    ctx.globalAlpha = flick;
    ctx.beginPath();
    ctx.arc(x, y - 24, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Level pips.
  for (let i = 0; i < tower.level; i += 1) {
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.arc(x - 10 + i * 10, y + 26, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTowers(ctx, world) {
  for (const tower of world.towers) {
    // Range ring for the selected tower or the placement ghost.
    const selected = world.selectedTower === tower;
    if (selected) {
      const stats = towerStats(tower);
      ctx.beginPath();
      ctx.arc(tower.x, tower.y + MAP_Y, stats.range, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    drawTowerShape(ctx, tower, world);
  }
  // Placement ghost: the tower type chosen from the shop, over the hovered plot.
  if (world.shopSelected && world.hoverPlot !== null) {
    const plot = world.plots[world.hoverPlot];
    const taken = world.towers.some((t) => t.plotIndex === world.hoverPlot);
    if (!taken) {
      const def = TOWER_TYPES[world.shopSelected];
      const afford = world.gold >= def.levels[0].cost;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.arc(plot.x, plot.y + MAP_Y, def.levels[0].range, 0, Math.PI * 2);
      ctx.fillStyle = afford ? 'rgba(123,224,123,0.07)' : 'rgba(255,93,93,0.07)';
      ctx.fill();
      ctx.strokeStyle = afford ? '#7be07b' : '#ff5d5d';
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      drawTowerShape(ctx, { type: world.shopSelected, level: 1, x: plot.x, y: plot.y, angle: -Math.PI / 2 }, world);
    }
  }
}

function drawEnemyShape(ctx, e, world) {
  const x = e.x;
  const y = e.y + MAP_Y;
  const def = e.def;
  const slowed = world.time < e.slowUntil;
  ctx.save();
  if (e.flash > 0) ctx.globalAlpha = 0.55;
  if (e.type === 'cinderling') {
    ctx.fillStyle = def.color;
    ctx.beginPath(); ctx.arc(x, y, e.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath(); ctx.moveTo(x, y - e.radius - 4); ctx.lineTo(x - 5, y - e.radius + 3); ctx.lineTo(x + 5, y - e.radius + 3); ctx.closePath(); ctx.fill();
  } else if (e.type === 'gloomwalker') {
    ctx.fillStyle = def.dark;
    ctx.beginPath(); ctx.arc(x, y, e.radius + 2, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = def.color;
    ctx.beginPath(); ctx.arc(x, y, e.radius - 2, 0, Math.PI * 2); ctx.fill();
  } else if (e.type === 'stonehide') {
    ctx.fillStyle = def.color;
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const px = x + Math.cos(a) * e.radius;
      const py = y + Math.sin(a) * e.radius;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = def.dark; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 8, y - 4); ctx.lineTo(x - 2, y + 2); ctx.lineTo(x + 6, y - 6); ctx.stroke();
  } else if (e.type === 'swarm') {
    const flap = Math.sin(world.time * 18 + e.wobble) * 4;
    ctx.fillStyle = 'rgba(200,230,74,0.7)';
    ctx.beginPath(); ctx.ellipse(x - 8, y - 6 - flap, 7, 3, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 8, y - 6 + flap, 7, 3, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = def.color;
    ctx.beginPath(); ctx.arc(x, y, e.radius, 0, Math.PI * 2); ctx.fill();
  } else {
    // Emberlord: big, crowned, angry.
    ctx.fillStyle = def.dark;
    ctx.beginPath(); ctx.arc(x, y, e.radius + 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = def.color;
    ctx.beginPath(); ctx.arc(x, y, e.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd76a';
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(x + i * 12 - 6, y - e.radius + 2);
      ctx.lineTo(x + i * 12, y - e.radius - 12);
      ctx.lineTo(x + i * 12 + 6, y - e.radius + 2);
      ctx.closePath(); ctx.fill();
    }
  }
  // Eyes: they look along the road.
  const dir = e.seg < PATH_POINTS.length - 1
    ? Math.atan2(PATH_POINTS[e.seg + 1].y - PATH_POINTS[e.seg].y, PATH_POINTS[e.seg + 1].x - PATH_POINTS[e.seg].x)
    : 0;
  const ex = Math.cos(dir) * 4;
  const ey = Math.sin(dir) * 3;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(x - 5 + ex, y - 3 + ey, 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 5 + ex, y - 3 + ey, 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#14161f';
  ctx.beginPath(); ctx.arc(x - 5 + ex * 1.6, y - 3 + ey * 1.6, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 5 + ex * 1.6, y - 3 + ey * 1.6, 1.6, 0, Math.PI * 2); ctx.fill();
  if (slowed) {
    ctx.strokeStyle = 'rgba(92,214,255,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, e.radius + 3, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
  // Health bar when hurt (boss always).
  if (e.hp < e.maxHp || e.type === 'emberlord') {
    const w = e.radius * 2 + 6;
    const frac = Math.max(0, e.hp / e.maxHp);
    const bx = x - w / 2;
    const by = y - e.radius - 12;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx, by, w, 5);
    ctx.fillStyle = frac > 0.5 ? '#7be07b' : frac > 0.25 ? '#ffd76a' : '#ff5d5d';
    ctx.fillRect(bx, by, w * frac, 5);
  }
}

function drawProjectiles(ctx, world) {
  for (const p of world.projectiles) {
    if (p.kind === 'cannon') {
      ctx.fillStyle = '#2a2e3d';
      ctx.beginPath(); ctx.arc(p.x, p.y + MAP_Y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff5d5d';
      ctx.beginPath(); ctx.arc(p.x, p.y + MAP_Y, 3.5, 0, Math.PI * 2); ctx.fill();
    } else if (p.kind === 'frost') {
      ctx.fillStyle = '#a5ecff';
      ctx.save();
      ctx.translate(p.x, p.y + MAP_Y);
      ctx.rotate(Math.atan2(p.ty - p.y, p.tx - p.x));
      ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-6, -4); ctx.lineTo(-6, 4); ctx.closePath(); ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = '#ffb35c';
      ctx.shadowColor = '#ff9a3c';
      ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(p.x, p.y + MAP_Y, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}

function drawHud(ctx, world) {
  ctx.fillStyle = '#10121c';
  ctx.fillRect(0, 0, VIEW_WIDTH, HUD_HEIGHT);
  ctx.fillStyle = 'rgba(255,154,60,0.25)';
  ctx.fillRect(0, HUD_HEIGHT - 2, VIEW_WIDTH, 2);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  // Title.
  ctx.font = `bold 24px ${FONT}`;
  ctx.fillStyle = '#ffb35c';
  ctx.fillText('EMBERFALL', 18, HUD_HEIGHT / 2 - 1);
  ctx.font = `12px ${FONT}`;
  ctx.fillStyle = '#8a90a8';
  ctx.fillText('defend the crystal', 18, HUD_HEIGHT - 14);
  // Gold.
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillStyle = '#ffd76a';
  ctx.fillText(`◉ ${world.gold}`, 240, HUD_HEIGHT / 2);
  // Wave.
  ctx.fillStyle = '#ffffff';
  const waveText = world.wave === 0 ? 'WAVE — / 15' : `WAVE ${world.wave} / ${TOTAL_WAVES}`;
  ctx.fillText(waveText, 380, HUD_HEIGHT / 2);
  // Crystal lives.
  ctx.fillStyle = world.lives <= 5 ? '#ff5d5d' : '#7be07b';
  ctx.fillText(`◆ ${world.lives}`, 520, HUD_HEIGHT / 2);
  // Score and kills.
  ctx.fillStyle = '#c07bff';
  ctx.fillText(`SCORE ${world.score}`, 640, HUD_HEIGHT / 2);
  ctx.fillStyle = '#8a90a8';
  ctx.font = `14px ${FONT}`;
  ctx.fillText(`${world.kills} kills`, 800, HUD_HEIGHT / 2);
  // Buttons.
  for (const b of HUD_BUTTONS) {
    const hovered = world.hoverButton === b.id;
    ctx.fillStyle = hovered ? '#2c3040' : '#1d2130';
    roundRect(ctx, b.x, b.y, b.w, b.h, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 13px ${FONT}`;
    ctx.textAlign = 'center';
    const label = b.id === 'speed' ? `${world.speed}x` : b.id === 'pause' ? (world.paused ? '▶' : '❚❚') : b.id === 'sound' ? (world.muted ? '✕' : '♪') : '↺';
    ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 + 1);
    ctx.textAlign = 'left';
  }
}

function drawShop(ctx, world) {
  ctx.fillStyle = '#14161f';
  ctx.fillRect(SHOP_X, HUD_HEIGHT, SHOP_WIDTH, VIEW_HEIGHT - HUD_HEIGHT);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(SHOP_X, HUD_HEIGHT, 2, VIEW_HEIGHT - HUD_HEIGHT);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = `bold 15px ${FONT}`;
  ctx.fillStyle = '#8a90a8';
  ctx.fillText('B U I L D', SHOP_X + 14, 88);
  for (let i = 0; i < TOWER_ORDER.length; i += 1) {
    const key = TOWER_ORDER[i];
    const def = TOWER_TYPES[key];
    const r = shopCardRect(i);
    const afford = world.gold >= def.levels[0].cost;
    const chosen = world.shopSelected === key;
    ctx.fillStyle = chosen ? '#2c2a1e' : '#1d2130';
    roundRect(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.fill();
    ctx.strokeStyle = chosen ? '#ffd76a' : 'rgba(255,255,255,0.16)';
    ctx.lineWidth = chosen ? 2 : 1;
    ctx.stroke();
    // Color chip.
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(r.x + 26, r.y + 26, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillText(def.name, r.x + 48, r.y + 20);
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = '#8a90a8';
    ctx.fillText(def.blurb, r.x + 48, r.y + 40);
    const s0 = def.levels[0];
    ctx.fillStyle = '#c7ccdd';
    ctx.fillText(`DMG ${s0.damage}  ·  ${s0.rate}/s  ·  RNG ${s0.range}`, r.x + 48, r.y + 60);
    // Cost + hotkey.
    ctx.font = `bold 16px ${FONT}`;
    ctx.fillStyle = afford ? '#ffd76a' : '#ff5d5d';
    ctx.textAlign = 'right';
    ctx.fillText(`◉ ${s0.cost}`, r.x + r.w - 14, r.y + 24);
    ctx.fillStyle = '#8a90a8';
    ctx.font = `bold 12px ${FONT}`;
    ctx.fillText(`[${def.key}]`, r.x + r.w - 14, r.y + 62);
    ctx.textAlign = 'left';
  }

  // Lower panel: selected tower, or the next wave preview.
  const py = 500;
  ctx.font = `bold 15px ${FONT}`;
  ctx.fillStyle = '#8a90a8';
  if (world.selectedTower) {
    const t = world.selectedTower;
    const def = TOWER_TYPES[t.type];
    const stats = towerStats(t);
    ctx.fillText('T O W E R', SHOP_X + 14, py + 8);
    ctx.font = `bold 16px ${FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${def.name}  ·  Lv ${t.level}`, SHOP_X + 14, py + 32);
    ctx.font = `13px ${FONT}`;
    ctx.fillStyle = '#c7ccdd';
    ctx.fillText(`Damage ${stats.damage}   Rate ${stats.rate}/s   Range ${stats.range}`, SHOP_X + 14, py + 54);
    ctx.fillText(`${t.kills} kills on this tower`, SHOP_X + 14, py + 74);
    const cost = upgradeCost(t);
    const upRect = { x: SHOP_X + 12, y: py + 92, w: 140, h: 40 };
    const sellRect = { x: SHOP_X + 164, y: py + 92, w: 140, h: 40 };
    world.upgradeRect = upRect;
    world.sellRect = sellRect;
    ctx.fillStyle = cost !== null && world.gold >= cost ? '#2f6b3a' : '#33363f';
    roundRect(ctx, upRect.x, upRect.y, upRect.w, upRect.h, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 14px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(cost !== null ? `UPGRADE ◉ ${cost}` : 'MAX LEVEL', upRect.x + upRect.w / 2, upRect.y + upRect.h / 2 + 1);
    ctx.fillStyle = '#5a2c2c';
    roundRect(ctx, sellRect.x, sellRect.y, sellRect.w, sellRect.h, 8);
    ctx.fill();
    ctx.fillText(`SELL +${Math.floor(t.invested * 0.7)}`, sellRect.x + sellRect.w / 2, sellRect.y + sellRect.h / 2 + 1);
    ctx.textAlign = 'left';
  } else {
    ctx.fillText('N E X T   W A V E', SHOP_X + 14, py + 8);
    const next = Math.min(world.wave + 1, TOTAL_WAVES);
    ctx.font = `bold 16px ${FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Wave ${next} of ${TOTAL_WAVES}`, SHOP_X + 14, py + 32);
    ctx.font = `13px ${FONT}`;
    ctx.fillStyle = '#c7ccdd';
    const preview = wavePreview(next);
    wrapText(ctx, preview, SHOP_X + 14, py + 56, SHOP_WIDTH - 28, 18);
    ctx.fillStyle = '#8a90a8';
    ctx.fillText('Click a tower card, then a plot.', SHOP_X + 14, py + 116);
    ctx.fillText('Keys 1-4 pick towers · R restarts', SHOP_X + 14, py + 136);
  }

  // Send wave button / wave status.
  const r = SEND_WAVE_RECT;
  if (world.phase === 'build' && world.screen === SCREEN_PLAY) {
    const urgent = world.buildTimer <= 5;
    ctx.fillStyle = urgent ? '#a03a1e' : '#b06a1e';
    roundRect(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 17px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(`SEND WAVE ${world.wave + 1} ▶`, r.x + r.w / 2, r.y + 20);
    ctx.font = `12px ${FONT}`;
    ctx.fillText(`auto-sends in ${Math.ceil(world.buildTimer)}s`, r.x + r.w / 2, r.y + 40);
    ctx.textAlign = 'left';
  } else if (world.screen === 'over') {
    ctx.fillStyle = '#1d2130';
    roundRect(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.fill();
    ctx.fillStyle = '#8a90a8';
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(world.won ? 'VICTORY' : 'DEFEAT', r.x + r.w / 2, r.y + r.h / 2 + 1);
    ctx.textAlign = 'left';
  } else {
    ctx.fillStyle = '#1d2130';
    roundRect(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.fill();
    ctx.fillStyle = '#c7ccdd';
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = 'center';
    const left = world.enemies.length + world.spawnQueue.length;
    ctx.fillText(world.phase === 'wave' ? `WAVE IN PROGRESS · ${left} left` : 'GET READY…', r.x + r.w / 2, r.y + r.h / 2 + 1);
    ctx.textAlign = 'left';
  }
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  let cy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, cy);
      line = w;
      cy += lineH;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, cy);
}

function drawToast(ctx, world) {
  if (!world.toast) return;
  const a = Math.min(1, world.toastTimer / 0.6);
  ctx.globalAlpha = a;
  ctx.font = `bold 17px ${FONT}`;
  const w = ctx.measureText(world.toast).width + 36;
  const x = MAP_WIDTH / 2 - w / 2;
  ctx.fillStyle = 'rgba(16,18,28,0.88)';
  roundRect(ctx, x, 76, w, 38, 19);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,183,92,0.6)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#ffd76a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(world.toast, MAP_WIDTH / 2, 95);
  ctx.textAlign = 'left';
  ctx.globalAlpha = 1;
}

function drawTitle(ctx, world) {
  ctx.fillStyle = 'rgba(10,11,18,0.72)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const g = ctx.createLinearGradient(0, 150, 0, 260);
  g.addColorStop(0, '#ffe9a8');
  g.addColorStop(0.5, '#ff9a3c');
  g.addColorStop(1, '#ff5d5d');
  ctx.font = `bold 92px ${FONT}`;
  ctx.fillStyle = g;
  ctx.shadowColor = '#ff6a1e';
  ctx.shadowBlur = 34;
  ctx.fillText('EMBERFALL', VIEW_WIDTH / 2, 205);
  ctx.shadowBlur = 0;
  ctx.font = `22px ${FONT}`;
  ctx.fillStyle = '#e8eaf2';
  ctx.fillText('A tower defense of the last crystal', VIEW_WIDTH / 2, 268);
  ctx.font = `16px ${FONT}`;
  ctx.fillStyle = '#aab0c4';
  ctx.fillText('The void marches down the road. Build towers on the plots,', VIEW_WIDTH / 2, 330);
  ctx.fillText('hold the crystal through 15 waves — and do not let it fall.', VIEW_WIDTH / 2, 356);
  // Tower legend chips.
  let cx = VIEW_WIDTH / 2 - 300;
  for (const key of TOWER_ORDER) {
    const def = TOWER_TYPES[key];
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(cx, 408, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8eaf2';
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(def.name, cx + 20, 408);
    cx += 160;
  }
  ctx.textAlign = 'center';
  // Start button.
  const b = START_BUTTON;
  const pulse = 1 + Math.sin(world.time * 3) * 0.03;
  ctx.save();
  ctx.translate(VIEW_WIDTH / 2, b.y + b.h / 2);
  ctx.scale(pulse, pulse);
  const bg = ctx.createLinearGradient(-b.w / 2, 0, b.w / 2, 0);
  bg.addColorStop(0, '#ff9a3c');
  bg.addColorStop(1, '#ff5d5d');
  ctx.fillStyle = bg;
  roundRect(ctx, -b.w / 2, -b.h / 2, b.w, b.h, 12);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 24px ${FONT}`;
  ctx.fillText('▶  START DEFENSE', 0, 1);
  ctx.restore();
  ctx.font = `14px ${FONT}`;
  ctx.fillStyle = '#8a90a8';
  ctx.fillText('or press Enter  ·  mouse to build, keys 1-4 pick towers, Space pauses', VIEW_WIDTH / 2, 566);
  if (world.best > 0) {
    ctx.fillStyle = '#ffd76a';
    ctx.font = `bold 16px ${FONT}`;
    ctx.fillText(`Best score: ${world.best}`, VIEW_WIDTH / 2, 600);
  }
  ctx.textAlign = 'left';
}

function drawOver(ctx, world) {
  ctx.fillStyle = 'rgba(10,11,18,0.78)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (world.won) {
    const g = ctx.createLinearGradient(0, 150, 0, 230);
    g.addColorStop(0, '#fff3c4');
    g.addColorStop(1, '#ffb35c');
    ctx.font = `bold 64px ${FONT}`;
    ctx.fillStyle = g;
    ctx.shadowColor = '#ffb35c';
    ctx.shadowBlur = 28;
    ctx.fillText('THE CRYSTAL STANDS', VIEW_WIDTH / 2, 190);
    ctx.shadowBlur = 0;
    ctx.font = `20px ${FONT}`;
    ctx.fillStyle = '#e8eaf2';
    ctx.fillText('Fifteen waves broken. The ember burns on.', VIEW_WIDTH / 2, 248);
  } else {
    ctx.font = `bold 64px ${FONT}`;
    ctx.fillStyle = '#ff5d5d';
    ctx.shadowColor = '#ff3d5e';
    ctx.shadowBlur = 28;
    ctx.fillText('THE EMBER FADES', VIEW_WIDTH / 2, 190);
    ctx.shadowBlur = 0;
    ctx.font = `20px ${FONT}`;
    ctx.fillStyle = '#e8eaf2';
    ctx.fillText(`The void broke through on wave ${world.wave}.`, VIEW_WIDTH / 2, 248);
  }
  // Stats grid.
  const stats = [
    ['SCORE', `${world.score}`],
    ['WAVE', `${world.wave} / ${TOTAL_WAVES}`],
    ['KILLS', `${world.kills}`],
    ['GOLD EARNED', `${world.goldEarned}`],
    ['LEAKED', `${world.leaked}`],
    ['CRYSTAL', `${Math.max(0, world.lives)} / ${CRYSTAL_HP}`],
  ];
  const cellW = 200;
  const x0 = VIEW_WIDTH / 2 - (cellW * 3) / 2;
  for (let i = 0; i < stats.length; i += 1) {
    const x = x0 + (i % 3) * cellW;
    const y = 310 + Math.floor(i / 3) * 84;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    roundRect(ctx, x + 8, y, cellW - 16, 68, 10);
    ctx.fill();
    ctx.fillStyle = '#8a90a8';
    ctx.font = `12px ${FONT}`;
    ctx.fillText(stats[i][0], x + cellW / 2, y + 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 24px ${FONT}`;
    ctx.fillText(stats[i][1], x + cellW / 2, y + 46);
  }
  const b = AGAIN_BUTTON;
  const bg = ctx.createLinearGradient(b.x, 0, b.x + b.w, 0);
  bg.addColorStop(0, '#ff9a3c');
  bg.addColorStop(1, '#ff5d5d');
  ctx.fillStyle = bg;
  roundRect(ctx, b.x, b.y, b.w, b.h, 12);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 22px ${FONT}`;
  ctx.fillText('↺  PLAY AGAIN', VIEW_WIDTH / 2, b.y + b.h / 2 + 1);
  ctx.font = `14px ${FONT}`;
  ctx.fillStyle = '#8a90a8';
  ctx.fillText('or press R to restart', VIEW_WIDTH / 2, b.y + b.h + 30);
  ctx.textAlign = 'left';
}

function drawPaused(ctx, world) {
  ctx.fillStyle = 'rgba(10,11,18,0.6)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold 48px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('PAUSED', VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - 20);
  ctx.font = `16px ${FONT}`;
  ctx.fillStyle = '#aab0c4';
  ctx.fillText('Space to resume  ·  R to restart', VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 26);
  ctx.textAlign = 'left';
}

// The full frame. ctx is already scaled for the canvas backing store.
export function drawGame(ctx, world) {
  ctx.save();
  if (world.shake > 0) {
    ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
  }
  ctx.fillStyle = '#0d0f17';
  ctx.fillRect(-20, -20, VIEW_WIDTH + 40, VIEW_HEIGHT + 40);
  drawTerrain(ctx, world);
  drawRoad(ctx);
  drawPlots(ctx, world);
  drawCrystal(ctx, world);
  drawTowers(ctx, world);
  for (const e of world.enemies) drawEnemyShape(ctx, e, world);
  drawProjectiles(ctx, world);
  world.particles.draw(ctx);
  drawHud(ctx, world);
  drawShop(ctx, world);
  drawToast(ctx, world);
  if (world.screen === 'title') drawTitle(ctx, world);
  else if (world.screen === 'over') drawOver(ctx, world);
  else if (world.paused) drawPaused(ctx, world);
  if (world.flash > 0) {
    ctx.fillStyle = `rgba(255,40,60,${world.flash * 0.4})`;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  }
  ctx.restore();
}
