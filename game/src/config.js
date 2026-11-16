// Emberfall — tuning, tower and enemy definitions, and the wave table.
// One file holds every number a designer would tune, so balance lives here
// and the systems (world, towers, enemies) only read it.

// Logical canvas size. The canvas is fixed at this size and CSS-scales to
// the window, so screenshots are always 1280x720.
export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;

// Top HUD bar height; the map sits below it, the shop on the right.
export const HUD_HEIGHT = 64;
export const MAP_X = 0;
export const MAP_Y = HUD_HEIGHT;
export const MAP_WIDTH = 960;
export const MAP_HEIGHT = VIEW_HEIGHT - HUD_HEIGHT;
export const SHOP_X = MAP_WIDTH;
export const SHOP_WIDTH = VIEW_WIDTH - MAP_WIDTH;

// The road the void creatures march along, in map coordinates (origin at
// the map's top-left corner). The crystal stands at the last waypoint.
export const PATH_POINTS = [
  { x: -24, y: 100 },
  { x: 700, y: 100 },
  { x: 700, y: 300 },
  { x: 180, y: 300 },
  { x: 180, y: 500 },
  { x: 860, y: 500 },
];
export const PATH_HALF_WIDTH = 23;

// Buildable plots: a tower snaps to one of these circles.
export const PLOTS = [
  { x: 120, y: 210 }, { x: 420, y: 200 }, { x: 860, y: 200 },
  { x: 120, y: 420 }, { x: 420, y: 420 }, { x: 860, y: 420 },
  { x: 860, y: 600 }, { x: 420, y: 600 }, { x: 60, y: 600 },
  { x: 60, y: 200 }, { x: 560, y: 600 }, { x: 740, y: 600 },
];
export const PLOT_RADIUS = 26;

// Crystal: hit points, and how much each leaked enemy costs.
export const CRYSTAL_HP = 20;

// Starting gold and the wave-clear bonus.
export const START_GOLD = 220;
export const WAVE_BONUS_BASE = 60;
export const WAVE_BONUS_PER_WAVE = 15;

// Total waves. Clearing wave 15 wins the game.
export const TOTAL_WAVES = 15;

// Seconds of build time before the next wave auto-sends.
export const BUILD_SECONDS = 15;

// Tower definitions. stats are per level: damage, shots per second, range,
// slow (fraction of speed removed, frost only), splash radius (cannon only),
// chain targets (storm only), and the cost to buy or upgrade to that level.
export const TOWER_TYPES = {
  ember: {
    name: 'Ember Spire',
    short: 'Ember',
    color: '#ff9a3c',
    dark: '#c85a00',
    glow: '#ffb35c',
    key: '1',
    blurb: 'Fast ember bolts',
    levels: [
      { cost: 50, damage: 12, rate: 2.2, range: 165 },
      { cost: 45, damage: 20, rate: 2.6, range: 175 },
      { cost: 75, damage: 34, rate: 3.0, range: 185 },
    ],
  },
  frost: {
    name: 'Frost Obelisk',
    short: 'Frost',
    color: '#5cd6ff',
    dark: '#1d7fb8',
    glow: '#a5ecff',
    key: '2',
    blurb: 'Chills and slows',
    levels: [
      { cost: 75, damage: 5, rate: 1.2, range: 150, slow: 0.45, slowTime: 1.6 },
      { cost: 60, damage: 9, rate: 1.3, range: 160, slow: 0.55, slowTime: 1.8 },
      { cost: 90, damage: 15, rate: 1.5, range: 175, slow: 0.65, slowTime: 2.0 },
    ],
  },
  cannon: {
    name: 'Cannon Mortar',
    short: 'Cannon',
    color: '#ff5d5d',
    dark: '#a02c2c',
    glow: '#ff9a7a',
    key: '3',
    blurb: 'Heavy splash shells',
    levels: [
      { cost: 120, damage: 32, rate: 0.7, range: 175, splash: 65 },
      { cost: 100, damage: 55, rate: 0.75, range: 185, splash: 75 },
      { cost: 150, damage: 95, rate: 0.85, range: 195, splash: 90 },
    ],
  },
  storm: {
    name: 'Storm Coil',
    short: 'Storm',
    color: '#c07bff',
    dark: '#6d34b8',
    glow: '#d9a5ff',
    key: '4',
    blurb: 'Lightning chains',
    levels: [
      { cost: 150, damage: 17, rate: 1.0, range: 170, chain: 2 },
      { cost: 120, damage: 27, rate: 1.1, range: 180, chain: 3 },
      { cost: 170, damage: 42, rate: 1.25, range: 190, chain: 4 },
    ],
  },
};
export const TOWER_ORDER = ['ember', 'frost', 'cannon', 'storm'];

// Enemy definitions. hp and bounty scale with the wave (see waveScaling).
export const ENEMY_TYPES = {
  cinderling: {
    name: 'Cinderling', color: '#ff8a3c', dark: '#a34d00',
    hp: 30, speed: 95, bounty: 8, leak: 1, radius: 11,
  },
  gloomwalker: {
    name: 'Gloomwalker', color: '#b678ff', dark: '#5f2ea8',
    hp: 75, speed: 68, bounty: 12, leak: 1, radius: 14,
  },
  stonehide: {
    name: 'Stonehide', color: '#9aa5b1', dark: '#4c565f',
    hp: 170, speed: 40, bounty: 20, leak: 2, radius: 17,
  },
  swarm: {
    name: 'Swarmite', color: '#c8e64a', dark: '#6d8a12',
    hp: 15, speed: 125, bounty: 4, leak: 1, radius: 8,
  },
  emberlord: {
    name: 'Emberlord', color: '#ff3d5e', dark: '#8f0f2e',
    hp: 2200, speed: 32, bounty: 200, leak: 5, radius: 26,
  },
};

// How enemy hit points grow with the wave number.
export function waveScaling(wave) {
  return 1 + 0.13 * (wave - 1) + 0.006 * wave * wave;
}

// The wave table: each wave is a list of spawn groups, in order. A group
// spawns `count` enemies of `type`, `gap` seconds apart.
export function waveGroups(wave) {
  const c = (type, count, gap) => ({ type, count, gap });
  switch (wave) {
    case 1: return [c('cinderling', 8, 0.9)];
    case 2: return [c('cinderling', 13, 0.7)];
    case 3: return [c('cinderling', 8, 0.6), c('gloomwalker', 6, 1.0)];
    case 4: return [c('gloomwalker', 9, 0.9), c('swarm', 12, 0.25)];
    case 5: return [c('cinderling', 10, 0.5), c('gloomwalker', 10, 0.8), c('swarm', 10, 0.25)];
    case 6: return [c('stonehide', 6, 1.6), c('cinderling', 12, 0.5)];
    case 7: return [c('stonehide', 9, 1.4), c('gloomwalker', 10, 0.7)];
    case 8: return [c('swarm', 24, 0.2), c('stonehide', 8, 1.3), c('gloomwalker', 8, 0.7)];
    case 9: return [c('gloomwalker', 16, 0.6), c('stonehide', 10, 1.2), c('swarm', 14, 0.22)];
    case 10: return [c('emberlord', 1, 1.0), c('cinderling', 12, 0.5), c('gloomwalker', 8, 0.8)];
    case 11: return [c('stonehide', 14, 1.1), c('swarm', 20, 0.2), c('cinderling', 10, 0.45)];
    case 12: return [c('gloomwalker', 20, 0.5), c('stonehide', 12, 1.1), c('swarm', 16, 0.2)];
    case 13: return [c('emberlord', 1, 1.0), c('stonehide', 12, 1.0), c('gloomwalker', 14, 0.55)];
    case 14: return [c('swarm', 30, 0.18), c('stonehide', 16, 1.0), c('gloomwalker', 16, 0.5), c('cinderling', 12, 0.4)];
    case 15: return [c('emberlord', 2, 6.0), c('stonehide', 14, 0.9), c('swarm', 24, 0.18), c('gloomwalker', 18, 0.5)];
    default: return [c('cinderling', 10, 0.6)];
  }
}

// A one-line preview of a wave for the shop panel ("3x Stonehide, 12x ...").
export function wavePreview(wave) {
  const counts = new Map();
  for (const g of waveGroups(wave)) counts.set(g.type, (counts.get(g.type) ?? 0) + g.count);
  return [...counts.entries()].map(([t, n]) => `${n}x ${ENEMY_TYPES[t].name}`).join('  ·  ');
}
