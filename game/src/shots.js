// Screenshot scenes: each one plays the real rules forward from a fresh
// world for a fixed time, so a frame is what a short game really looks
// like — and the same seed always gives the same frame.

import { resetWorld, startWave, updateWorld, ambientEmbers } from './world.js';
import { placeTower, upgradeTower, upgradeCost } from './towers.js';

const STEP = 1 / 60;

// A fixed tower build for the action shots: plot index, tower type.
const PLAY_BUILD = [
  [1, 'ember'], [4, 'ember'], [0, 'frost'], [5, 'cannon'], [2, 'storm'],
];
const BOSS_BUILD = [
  [1, 'ember'], [4, 'ember'], [10, 'ember'], [0, 'frost'], [3, 'frost'],
  [5, 'cannon'], [11, 'cannon'], [2, 'storm'],
];

// The autopilot's buy order for a full game: plot index, tower type.
const AUTO_BUILD = [
  [1, 'ember'], [0, 'frost'], [4, 'ember'], [5, 'cannon'], [2, 'storm'],
  [3, 'frost'], [11, 'cannon'], [10, 'ember'], [7, 'storm'], [6, 'cannon'],
  [9, 'ember'], [8, 'frost'],
];

function buildMany(world, list, gold) {
  world.gold = gold;
  for (const [plot, type] of list) placeTower(world, type, plot);
}

function stepFor(world, seconds) {
  for (let i = 0; i < seconds / STEP; i += 1) {
    updateWorld(world, STEP);
    if (world.screen === 'over') break;
  }
}

// The full-game autopilot: spend all gold every build phase (buy in order,
// then upgrade the cheapest tower), send each wave at once, play to the end.
function autoPlayGame(world) {
  let steps = 0;
  const maxSteps = 14 * 60 * 60;
  while (world.screen === 'play' && steps < maxSteps) {
    if (world.phase === 'build') {
      let spent = true;
      while (spent) {
        spent = false;
        for (const [plot, type] of AUTO_BUILD) {
          if (world.towers.some((t) => t.plotIndex === plot)) continue;
          if (placeTower(world, type, plot).ok) { spent = true; break; }
        }
        if (!spent) {
          // Upgrade the cheapest upgradeable tower.
          let best = null;
          let bestCost = Infinity;
          for (const t of world.towers) {
            const c = upgradeCost(t);
            if (c !== null && c < bestCost && world.gold >= c) { best = t; bestCost = c; }
          }
          if (best) { upgradeTower(world, best); spent = true; }
        }
      }
      startWave(world);
    }
    updateWorld(world, STEP);
    steps += 1;
  }
}

// Set `world` to the named scene and leave the screen to draw over it.
export function stageShot(name, world, seed = 7) {
  resetWorld(world, seed);
  if (name === 'play') {
    world.screen = 'play';
    buildMany(world, PLAY_BUILD, 900);
    upgradeTower(world, world.towers[0]);
    world.wave = 5;
    startWave(world);
    stepFor(world, 24);
    return;
  }
  if (name === 'boss') {
    world.screen = 'play';
    buildMany(world, BOSS_BUILD, 1500);
    upgradeTower(world, world.towers.find((t) => t.type === 'cannon'));
    upgradeTower(world, world.towers.find((t) => t.type === 'storm'));
    world.wave = 9;
    startWave(world);
    stepFor(world, 18);
    return;
  }
  if (name === 'win') {
    world.screen = 'play';
    autoPlayGame(world);
    return;
  }
  // Default: the title screen, embers drifting for a few seconds.
  world.screen = 'title';
  for (let i = 0; i < 6 / STEP; i += 1) ambientEmbers(world, STEP);
}
