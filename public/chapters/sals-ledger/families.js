// The Families game: seven to ten at the table, and two sides of the river.
//
// The Benedettos need Sal to walk. The Castellanos need him convicted, because
// then the neighbourhood is theirs by Christmas. Most nights the families are
// apart, each in its own story at the same time; three nights they share —
// Vinnie's daughter's wedding, the morning the Feds raid everybody, and the
// last dinner at Dolores's. The Verdict is the showdown between the two
// halves of the table. The richest person still wins, whichever side they
// were on.

import { round5k, money } from '../../engine/util.js';

export const FAMILY_NAMES = { b: 'The Benedettos', c: 'The Castellanos' };

/** Is this a Families game? Automatic from seven. */
export function familiesOn(c) {
  const mode = c.s.config.families ?? 'auto';
  const n = c.players.length;
  if (mode === 'off') return false;
  if (mode === 'on') return n >= 4;
  return n >= 7;
}

/** Split the table: the Benedettos get the extra seat. */
export function splitFamilies(c) {
  const ps = c.rng.shuffle(c.players.slice());
  const nb = Math.ceil(ps.length / 2);
  const of = {};
  ps.forEach((p, i) => { of[p.id] = i < nb ? 'b' : 'c'; });
  c.s.families = { ids: ['b', 'c'], names: { ...FAMILY_NAMES }, of };
  c.s.envelope = { total: 0, by: {} };
}

/** A Talker and a Driver on each side, then the rest. */
export function dealFamilyJobs(c, order, rest) {
  for (const fam of ['b', 'c']) {
    const seats = c.rng.shuffle(c.family(fam));
    const jobs = [...order, ...c.rng.shuffle(rest)];
    seats.forEach((p, i) => { p.job = jobs[i % jobs.length]; });
  }
}

export function familyPlan(c) {
  if (c.s.config.length === 'short') {
    c.set('nightDays', [0, 2, 4, 6]);
    return ['prologue', 'split:three-banks|c-collection', 'morning', 'split:slot:fam1|c-card-room', 'morning', 'the-room',
      'raid', 'morning', 'night-before', 'trial'];
  }
  c.set('nightDays', [0, 1, 2, 3, 4, 5, 6]);
  return ['prologue', 'split:three-banks|c-collection', 'morning', 'split:slot:fam1|c-card-room', 'morning', 'the-room',
    'wedding', 'morning', 'split:slot:act2|c-pages', 'morning', 'twist', 'raid', 'morning',
    'split:slot:last|c-bridge', 'morning', 'night-before', 'trial'];
}

/**
 * How far Vinnie's Envelope moves the Verdict against Sal: one for every tenth
 * of Morty's number by which it out-spends the Bag, up to three. Money on both
 * sides of the river cancels out; what's left over buys Prout help.
 */
export function envelopeShift(c) {
  if (!c.s.families) return 0;
  const e = c.s.envelope?.total ?? 0;
  const lead = e - c.bag.total;
  if (lead <= 0) return 0;
  return Math.min(3, Math.floor(lead / Math.max(1, c.bag.target * 0.1) + 1e-9));
}

/** What the chrome shows in the middle of the table. */
export function familyPots(c) {
  if (!c.s.families) return null;
  return {
    b: { label: 'The Bag', total: c.bag.total, target: c.bag.target },
    c: { label: 'The Envelope', total: c.s.envelope?.total ?? 0, step: round5k(c.bag.target / 10) },
  };
}

/** A line of Vinnie, when a Castellano scene needs him. */
export function vinnie(c) {
  return c.rng.pick([
    'Vinnie Castellano is sixty-six, wears a cardigan over a shirt and tie, and has never once raised his voice. He doesn’t have to.',
    'Vinnie is at the bar with a glass of anisette he doesn’t drink. He listens to everything and answers about half of it.',
    'Vinnie has the Daily News open at the obituaries. He says he reads them for the competition.',
  ]);
}

export { money };
