// What each person wants this week, besides the obvious.
//
// One each, dealt at the start, paid on Monday by whoever in the story cares.
// A secret that names somebody gets somebody else at the table. Some are
// paired. One may be the rat.

import { money } from '../../engine/util.js';

export const SECRETS = {
  // greed
  skimmer: {
    name: 'The Skimmer', kind: 'greed', pay: 60000, payer: 'Sal, who never checks',
    text: 'Put less than $50k in the Bag all week, and still see Sal walk.',
    check: (c, p, end) => end.salWalks && (c.s.bag.by[p.id] ?? 0) < 50000,
  },
  collector: {
    name: 'The Collector', kind: 'greed', pay: 80000, payer: 'a buyer in Jersey',
    text: 'Hold three pages of Sal’s ledger on Monday.',
    check: (c, p) => p.cards.filter((x) => x.id === 'ledger-page').length >= 3,
    needs: (c) => true,
  },
  gambler: {
    name: 'The Gambler', kind: 'greed', pay: 40000, payer: 'Big Tommy, grudgingly',
    text: 'Play three cards on rolls this week.',
    check: (c, p) => (p.stats.rollCards ?? 0) >= 3,
  },
  // loyalty
  'soft-spot': {
    name: 'The Soft Spot', kind: 'loyalty', pay: 40000, payer: 'your conscience, and Nonna', target: true,
    text: (c, p) => `If ${c.name(p.secret.target)} finishes in the top half, you’re paid. They don’t know you care.`,
    check: (c, p, end) => end.rank(p.secret.target) <= Math.ceil(c.count / 2),
  },
  'big-brother': {
    name: 'The Big Brother', kind: 'loyalty', pay: 50000, payer: 'their mother', target: true,
    text: (c, p) => `Keep ${c.name(p.secret.target)} out of jail all week. They don’t know you promised.`,
    check: (c, p) => (c.p(p.secret.target)?.arrests ?? 0) === 0,
  },
  'stand-up': {
    name: 'Stand-Up Guy', kind: 'loyalty', pay: 50000, payer: 'Sal, who hears everything',
    text: 'Never name anybody to Prout, and never take his deal.',
    check: (c, p) => !p.stats.named.length && !p.deal,
  },
  cousins: {
    name: 'Cousins', kind: 'loyalty', pay: 40000, payer: 'your grandmother', pair: true,
    text: (c, p) => `You and ${c.name(p.secret.partner)} share a grandmother. If you both finish in the top half, she pays you both.`,
    check: (c, p, end) => end.rank(p.id) <= Math.ceil(c.count / 2) && end.rank(p.secret.partner) <= Math.ceil(c.count / 2),
  },
  // revenge
  grudge: {
    name: 'The Grudge', kind: 'revenge', pay: 60000, payer: 'your pride', target: true,
    text: (c, p) => `${c.name(p.secret.target)} cost you in 2019. If they finish last, you’re paid.`,
    check: (c, p, end) => end.rank(p.secret.target) === c.count,
  },
  snake: {
    name: 'The Snake', kind: 'revenge', pay: 40000, payer: 'somebody who hates them more than you do', target: true,
    text: (c, p) => `Get ${c.name(p.secret.target)} arrested at least once.`,
    check: (c, p) => (c.p(p.secret.target)?.arrests ?? 0) > 0,
  },
  // the story
  'nonnas-favourite': {
    name: 'Nonna’s Favourite', kind: 'story', pay: 50000, payer: 'Nonna',
    text: 'Get Nonna her ring back before Monday.',
    check: (c) => c.flag('ring') === 'real',
    needs: (c, plan) => plan.includes('ring'),
  },
  'clean-hands': {
    name: 'Clean Hands', kind: 'story', pay: 50000, payer: 'your mother, who is watching',
    text: 'Take no heat all week.',
    check: (c, p) => p.stats.heatTaken === 0,
  },
  stirrer: {
    name: 'The Stirrer', kind: 'story', pay: 40000, payer: 'the pleasure of it',
    text: 'End the week with three grudges on the table, none of them yours.',
    check: (c, p) => c.players.filter((q) => q.id !== p.id).reduce((n, q) => n + Object.values(q.grudges).filter((v) => v > 0).length, 0) >= 3,
  },
  'garys-friend': {
    name: 'Gary’s Friend', kind: 'story', pay: 50000, payer: 'Gary, from Arizona',
    text: 'Make sure Gary never testifies, any way you like.',
    check: (c) => !c.flag('garyTestifies'),
  },
  // the traitor
  rat: {
    name: 'The Rat', kind: 'rat', pay: 150000, payer: 'Prout',
    text: 'Prout owns you. If Sal goes down and nobody names you on Monday, Prout pays you $150k and your money is safe. Once an act, you can quietly add one to the Case File.',
    check: (c, p, end) => !end.salWalks && !end.named.includes(p.id),
  },
};

export function secretText(c, p) {
  const def = SECRETS[p.secret?.id];
  if (!def) return { id: null, name: 'Nothing', text: 'You want what everybody wants.', pay: 0 };
  const text = typeof def.text === 'function' ? def.text(c, p) : def.text;
  return {
    id: p.secret.id, name: def.name, kind: def.kind, text,
    pay: def.pay, payLabel: `${money(def.pay)} from ${def.payer}`,
    target: p.secret.target ? c.name(p.secret.target) : null,
    partner: p.secret.partner ? c.name(p.secret.partner) : null,
  };
}

/**
 * Deal a secret to everyone. The rat comes first if there is one; pairs are
 * dealt together; anything the week can't pay off is left in the deck.
 */
export function dealSecrets(c, plan) {
  const rng = c.rng;
  const ps = rng.shuffle(c.players.slice());
  const n = ps.length;
  const ratMode = c.s.config.rat;
  const withRat = ratMode === 'on' ? n >= 3 : ratMode === 'off' ? false : n >= 5;
  const pool = rng.shuffle(Object.keys(SECRETS).filter((id) => id !== 'rat' && id !== 'cousins'
    && (!SECRETS[id].needs || SECRETS[id].needs(c, plan))));
  const out = new Map();
  let i = 0;
  if (withRat) { out.set(ps[i].id, { id: 'rat' }); i += 1; }
  // one pair of cousins at five or more
  if (n - i >= 4 && rng.chance(0.7)) {
    const a = ps[i]; const b = ps[i + 1];
    out.set(a.id, { id: 'cousins', partner: b.id });
    out.set(b.id, { id: 'cousins', partner: a.id });
    i += 2;
  }
  let k = 0;
  for (; i < n; i++) {
    const p = ps[i];
    const id = pool[k % pool.length];
    k += 1;
    const secret = { id };
    if (SECRETS[id].target) secret.target = rng.pick(c.players.filter((q) => q.id !== p.id)).id;
    out.set(p.id, secret);
  }
  for (const p of c.players) p.secret = out.get(p.id) ?? { id: 'clean-hands' };
}
