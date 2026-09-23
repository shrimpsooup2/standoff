// The shape of a job: who stands where, and who shares what afterwards.
//
// Before the way in, everybody picks a spot. The spots come from the place —
// a corner on Water Street, the payphone across from the bank, the roof of
// the laundromat — and each one outside makes the job safer for everybody,
// but only the people inside have their hands on the money. After the
// getaway, the people who went inside decide, privately, how much of it the
// people who stood outside ever see.

import { money, round5k } from './common.js';

/** Where somebody is standing tonight. Before anybody's picked, everybody's inside. */
export function post(c, p) {
  const id = typeof p === 'string' ? p : p?.id;
  return c.memo.posts?.[id] ?? 'inside';
}

export const onPost = (c, name) => c.free.filter((p) => post(c, p) === name);
export const insiders = (c) => c.free.filter((p) => ['inside', 'car'].includes(post(c, p)));
export const outsiders = (c) => c.free.filter((p) => !['inside', 'car'].includes(post(c, p)));

/** Everybody who goes into the grab: the people inside, and the car. */
export const grabbers = (c) => insiders(c).map((p) => p.id);

/**
 * Who stands where. The Driver is in the car and the Talker is at the door;
 * everybody else picks. Posts can hold only so many people.
 */
export function crew({ time, place, title = 'Who Stands Where', text, posts, talkerInside = true }) {
  return {
    engine: 'choose', time, place, title, kicker: 'EVERYBODY PICKS A SPOT',
    text,
    enter(c) {
      const fixed = {};
      const driver = c.freeByJob('driver');
      if (driver && c.free.length >= 3) fixed[driver.id] = 'car';
      const talker = talkerInside ? c.freeByJob('talker') : null;
      if (talker && !fixed[talker.id]) fixed[talker.id] = 'inside';
      c.memo.posts = fixed;
    },
    who: (c) => c.free.filter((p) => !c.memo.posts?.[p.id]).map((p) => p.id),
    intro: (c) => {
      const fixed = Object.entries(c.memo.posts ?? {});
      return fixed.length ? fixed.map(([id, at]) => `${c.name(id)} is ${at === 'car' ? 'in the car' : 'going in, and doing the talking'}.`).join(' ') : null;
    },
    options: (c) => posts(c).map((o) => ({ id: o.id, label: o.label, blurb: o.blurb, greedy: o.id === 'inside', honest: o.id !== 'inside' })),
    reveal: 'public',
    bot(c, p, opts) {
      const out = opts.filter((o) => o.id !== 'inside');
      const lean = { loyal: 0.45, nervous: 0.5, wild: 0.15, greedy: 0.1, snake: 0.25 }[p.style] ?? 0.3;
      if (out.length && c.rng.chance(lean)) return { option: c.rng.pick(out).id };
      return { option: 'inside' };
    },
    resolve(c, { choices }) {
      const list = posts(c);
      const chosen = { ...(c.memo.posts ?? {}) };
      for (const [pid, ch] of Object.entries(choices)) chosen[pid] = ch.option;
      for (const p of c.free) if (!chosen[p.id]) chosen[p.id] = 'inside';
      c.memo.posts = capPosts(c, chosen, list);
      // nobody inside, nobody gets anything: somebody goes in
      if (!c.free.some((p) => c.memo.posts[p.id] === 'inside')) {
        const pick = c.free.find((p) => c.memo.posts[p.id] !== 'car') ?? c.free[0];
        if (pick) { c.memo.posts[pick.id] = 'inside'; c.line(`Somebody has to go in. ${pick.name} goes in.`); }
      }
      const where = Object.fromEntries(list.map((o) => [o.id, o.where ?? o.label]));
      where.car = 'in the car';
      const byPost = {};
      for (const p of c.free) (byPost[c.memo.posts[p.id]] ??= []).push(p.name);
      c.line(Object.entries(byPost).map(([id, ns]) => `${c.list(ns)}: ${where[id] ?? id}`).join('. ') + '.');
    },
  };
}

function capPosts(c, posts, list) {
  const out = { ...posts };
  for (const o of list) {
    if (!o.max) continue;
    const there = c.rng.shuffle(c.free.filter((p) => out[p.id] === o.id));
    for (const p of there.slice(o.max)) {
      out[p.id] = 'inside';
      c.line(`There’s only room for ${o.max} ${o.where ?? o.label.toLowerCase()}. ${p.name} goes inside instead.`);
    }
  }
  return out;
}

/**
 * The cut: the people who came out with money decide, privately, how much of
 * it goes to the people who stood outside. Whoever came out heavy and gave
 * nothing will hear about it.
 */
export function cut({ time, place, title = 'The Cut', text }) {
  const heavy = (c) => Object.entries(c.memo.hauls ?? {}).filter(([id, n]) => n > 0 && c.p(id) && !c.isAway(id) && post(c, id) !== 'car' && !outsiders(c).some((q) => q.id === id));
  return {
    engine: 'choose', time, place, title, kicker: 'WHAT DOES THE OUTSIDE GET?',
    when: (c) => outsiders(c).length > 0 && heavy(c).length > 0,
    text: (c) => text?.(c) ?? [
      `${c.list(outsiders(c).map((p) => p.name))} stood outside all night and came away with nothing in their pockets. Everybody who went in did.`,
      'Everybody who came out with money decides, privately, how much of it goes to the outside. The outside will know who gave what. Everybody else will only know the total.',
    ],
    who: (c) => heavy(c).map(([id]) => id),
    amount: (c, pid) => {
      const had = Math.min(c.memo.hauls?.[pid] ?? 0, c.p(pid).cash);
      const outside = outsiders(c).length;
      const fair = round5k(had * outside / Math.max(1, outside + insiders(c).length));
      return { min: 0, max: Math.max(0, had), step: 5000, label: 'For the outside', blurb: `You came out with ${money(had)}. A fair share for ${outside === 1 ? 'the one' : `the ${outside}`} outside would be about ${money(fair)}.` };
    },
    botAmount: (c, p) => ({ loyal: 0.35, nervous: 0.3, wild: 0.15, greedy: 0.08, snake: 0.02 }[p.style] ?? 0.2),
    resolve(c, { choices }) {
      const out = outsiders(c);
      let total = 0;
      const given = [];
      for (const [pid, ch] of Object.entries(choices)) {
        const n = c.charge(pid, Math.max(0, ch.amount ?? 0));
        total += n;
        given.push([pid, n]);
        c.fact(pid, 'cut', `Did ${c.name(pid)} give the outside anything tonight?`, n > 0);
      }
      if (out.length && total > 0) {
        const each = round5k(total / out.length);
        let left = total;
        out.forEach((p, i) => {
          const n = i === out.length - 1 ? left : Math.min(left, each);
          left -= n;
          c.give(p.id, n, 'the cut');
        });
      }
      const told = given.map(([pid, n]) => `${c.name(pid)} ${money(n)}`).join(', ');
      for (const p of out) c.note(p.id, `What the inside gave the outside: ${told}.`, 'the cut');
      // came out heavy, gave the outside nothing: the outside remembers
      for (const [pid, n] of given) {
        if (n > 0 || (c.memo.hauls?.[pid] ?? 0) < 20000) continue;
        for (const p of out) c.grudge(p.id, pid, 'gave the outside nothing');
      }
      c.line(total > 0
        ? `The outside got ${money(total)} between them from the inside.`
        : 'The outside got nothing. Everybody at the table noticed who looked at the floor.');
    },
  };
}
