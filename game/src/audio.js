// All sound is synthesized with WebAudio — no audio files, no network.
// The context is created on the first user gesture (browsers require it).

let ctx = null;
let master = null;
let muted = false;

function ensureContext() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.35;
  master.connect(ctx.destination);
  return ctx;
}

// Call from a click or keypress so the browser unlocks audio.
export function unlockAudio() {
  const c = ensureContext();
  if (c && c.state === 'suspended') c.resume();
}

export function isMuted() { return muted; }
export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.35;
  return muted;
}

function tone(freq, dur, type, vol, slideTo) {
  if (muted) return;
  const c = ensureContext();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noiseBurst(dur, vol, cutoff) {
  if (muted) return;
  const c = ensureContext();
  if (!c) return;
  const t = c.currentTime;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  const gain = c.createGain();
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(filter).connect(gain).connect(master);
  src.start(t);
}

// Named effects, one per game event. Pitch varies slightly per tower type.
export const sfx = {
  click() { tone(660, 0.06, 'sine', 0.25); },
  place() { tone(240, 0.12, 'triangle', 0.4, 420); noiseBurst(0.08, 0.15, 1800); },
  denied() { tone(160, 0.16, 'square', 0.2, 110); },
  emberShoot() { tone(880 + Math.random() * 120, 0.07, 'square', 0.10, 320); },
  frostShoot() { tone(1180, 0.09, 'sine', 0.10, 700); },
  cannonShoot() { noiseBurst(0.14, 0.3, 900); tone(120, 0.12, 'sine', 0.3, 60); },
  stormShoot() { noiseBurst(0.09, 0.22, 4200); tone(1500, 0.08, 'sawtooth', 0.08, 300); },
  enemyDie() { noiseBurst(0.12, 0.18, 1400); tone(300, 0.1, 'triangle', 0.12, 90); },
  coin() { tone(990, 0.07, 'sine', 0.16); setTimeout(() => tone(1320, 0.09, 'sine', 0.14), 55); },
  leak() { tone(90, 0.35, 'sawtooth', 0.4, 45); noiseBurst(0.2, 0.25, 500); },
  waveHorn() { tone(196, 0.5, 'sawtooth', 0.22, 262); tone(131, 0.5, 'sawtooth', 0.15, 175); },
  waveClear() { [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.14, 'triangle', 0.22), i * 90)); },
  upgrade() { [440, 554, 659, 880].forEach((f, i) => setTimeout(() => tone(f, 0.1, 'triangle', 0.2), i * 60)); },
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.25), i * 130)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.35, 'sawtooth', 0.2), i * 160)); },
};
