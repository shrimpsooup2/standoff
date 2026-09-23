// A tiny deterministic PRNG so a room can be replayed from a seed,
// and so the tests don't have to cross their fingers.

export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * mulberry32 — small, fast, good enough for card games and dirty deals.
 *
 * The whole generator is one 32-bit number, which means a game in progress can
 * be written to disk and picked up again dealing exactly the cards it was
 * always going to deal.
 */
export function makeRng(seed, state = null) {
  let a = state != null ? state >>> 0
    : typeof seed === 'number' ? seed >>> 0 : hashSeed(String(seed));
  const rng = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.int = (min, max) => min + Math.floor(rng() * (max - min + 1));
  rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
  rng.chance = (p) => rng() < p;
  rng.shuffle = (arr) => {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  rng.state = () => a >>> 0;
  /** Pick `n` distinct items; falls back to repeats if the pool is too small. */
  rng.sample = (arr, n) => {
    if (arr.length >= n) return rng.shuffle(arr).slice(0, n);
    const out = [];
    while (out.length < n) out.push(rng.pick(arr));
    return out;
  };
  return rng;
}

/** Room codes people can shout across a room without spelling it twice. */
export function roomCode(rng) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 4; i++) s += alphabet[Math.floor(rng() * alphabet.length)];
  return s;
}
