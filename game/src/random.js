// Seeded random numbers (mulberry32) so a screenshot scene staged from a
// seed always renders the same frame, and a replayed game plays the same.

// A tiny deterministic generator: call next() for a float in [0, 1).
export function makeRng(seed) {
  let a = seed >>> 0;
  return {
    next() {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    range(min, max) { return min + this.next() * (max - min); },
    pick(list) { return list[Math.floor(this.next() * list.length)]; },
  };
}
