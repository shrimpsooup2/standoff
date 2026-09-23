// The ghosts: people who are not there, with habits you can learn.
//
// A bot is a style — how honest, how greedy, how brave, how loyal — and every
// engine asks the style what it would do. They are not clever. They are
// consistent, which at a table like this is its own kind of menace.

export const BOT_NAMES = [
  'Fat Anthony', 'Sheepdog', 'Little Carmine', 'Icepick Renata', 'Two Phones',
  'Mikey Dentist', 'Aunt Gilda', 'The Notary', 'Slow Eddie', 'Patsy Fingers',
  'Gino The Priest', 'Doris From Payroll', 'Big Ange', 'Nicky Soup',
];

export const STYLES = {
  loyal: { name: 'the loyal one', honesty: 0.95, greed: 0.3, nerve: 0.45, spite: 0.2, blurb: 'does what the crew needs and remembers who didn’t' },
  greedy: { name: 'the earner', honesty: 0.7, greed: 0.85, nerve: 0.65, spite: 0.4, blurb: 'takes one more, every time' },
  snake: { name: 'the snake', honesty: 0.45, greed: 0.7, nerve: 0.55, spite: 0.8, blurb: 'smiles a lot' },
  nervous: { name: 'the nervous one', honesty: 0.85, greed: 0.4, nerve: 0.2, spite: 0.3, blurb: 'leaves early and says very little' },
  wild: { name: 'the wildcard', honesty: 0.6, greed: 0.55, nerve: 0.9, spite: 0.5, blurb: 'cannot be predicted, including by himself' },
};

export function styleFor(rng) {
  return rng.pick(Object.keys(STYLES));
}

/** A bot's traits, bent by whatever secret it was dealt. */
export function traits(p) {
  const base = { ...(STYLES[p.style] ?? STYLES.loyal) };
  const secret = p.secret?.id;
  if (secret === 'rat') { base.honesty = Math.min(base.honesty, 0.35); base.spite = Math.max(base.spite, 0.6); }
  if (secret === 'skimmer') base.greed = Math.max(base.greed, 0.8);
  if (secret === 'clean-hands') base.nerve = Math.min(base.nerve, 0.3);
  if (secret === 'stand-up') base.honesty = Math.max(base.honesty, 0.9);
  return base;
}

/** Who does this bot have it in for, if anyone? */
export function enemyOf(g, p) {
  const held = Object.entries(p.grudges ?? {}).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  if (held.length) return held[0][0];
  if (['grudge', 'snake'].includes(p.secret?.id) && p.secret.target) return p.secret.target;
  return null;
}

/** Who does this bot want to look after? */
export function friendOf(g, p) {
  if (['soft-spot', 'big-brother'].includes(p.secret?.id) && p.secret.target) return p.secret.target;
  if (p.secret?.id === 'cousins' && p.secret.partner) return p.secret.partner;
  const oath = g.s.oaths.find((o) => !o.brokenBy && (o.a === p.id || o.b === p.id));
  if (oath) return oath.a === p.id ? oath.b : oath.a;
  return null;
}

/** How suspicious a bot finds somebody, for accusations. */
export function suspicion(g, p, target) {
  let s = 0;
  if (target.stamps.includes('RAT')) s += 4;
  if (target.stamps.includes('LIAR')) s += 3;
  if (target.stamps.includes('SKIMMER')) s += 2;
  s += (p.grudges?.[target.id] ?? 0) * 2;
  s += g.s.players.reduce((n, q) => n + (q.grudges?.[target.id] ?? 0), 0);
  s += target.heat * 0.5;
  s += g.rng() * 2;
  return s;
}

/** Pick an index with probability proportional to weight. */
export function weighted(rng, items, weightOf) {
  const weights = items.map((it) => Math.max(0, weightOf(it)));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return rng.pick(items);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}
