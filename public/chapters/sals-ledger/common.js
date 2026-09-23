// Pieces every night uses: counting it out, getting away, and the way the
// week talks about people.

import { money, round5k, listNames } from '../../engine/util.js';

/**
 * The heartbeat. Back at Nonna's, everybody decides what goes in the Bag — or,
 * in a Families game, what the Castellanos put in Vinnie's Envelope.
 */
export function counting({ time = '1:10 A.M.', place = null, title = 'Counting It Out', text = null } = {}) {
  const potOf = (c, pid) => (c.familyOf(pid) === 'c' ? 'envelope' : 'bag');
  return {
    engine: 'choose', time, title,
    place: (c) => place ?? (c.track === 'c' ? 'The back room of the Castellano social club' : 'Nonna’s kitchen'),
    kicker: (c) => (c.track === 'c' ? 'HOW MUCH GOES IN THE ENVELOPE?' : c.families && !c.track ? 'HOW MUCH DO YOU PUT IN?' : 'HOW MUCH GOES IN THE BAG?'),
    text: (c) => text?.(c) ?? (c.track === 'c' ? envelopeText(c) : countingText(c)),
    who: (c) => c.free.map((p) => p.id),
    amount: (c, pid) => {
      const env = potOf(c, pid) === 'envelope';
      return {
        min: 0, max: Math.max(0, c.p(pid).cash), step: 5000,
        label: env ? 'Into the Envelope' : 'Into the Bag',
        blurb: env
          ? `You have ${money(c.p(pid).cash)}. Vinnie’s Envelope has ${money(c.s.envelope?.total ?? 0)}. Every ${money(round5k(c.bag.target / 10))} in it buys Prout a little more help on Monday.`
          : `You have ${money(c.p(pid).cash)}. The Bag has ${money(c.bag.total)} of the ${money(c.bag.target)} Morty wants.`,
      };
    },
    botAmount: (c, p) => {
      const style = { loyal: 0.55, nervous: 0.45, wild: 0.3, greedy: 0.15, snake: 0.12 }[p.style] ?? 0.3;
      const secretBend = ['skimmer', 'rat', 'turncoat'].includes(p.secret?.id) ? 0.03 : 0;
      const behind = potOf(c, p.id) === 'bag' && c.bag.total < milestoneNow(c) ? 0.2 : 0;
      return Math.min(1, (secretBend || style) + behind);
    },
    resolve(c, { choices }) {
      const added = { bag: 0, envelope: 0 };
      const rows = { bag: [], envelope: [] };
      for (const [pid, ch] of Object.entries(choices)) {
        const pot = potOf(c, pid);
        const n = Math.min(c.p(pid).cash, Math.max(0, ch.amount ?? 0));
        if (n > 0) {
          c.charge(pid, n);
          if (pot === 'bag') c.bagAdd(n, pid);
          else envelopeAdd(c, n, pid);
          c.p(pid).stats.given += n;
        }
        added[pot] += n;
        rows[pot].push({ pid, n });
        const into = pot === 'bag' ? 'the Bag' : 'the Envelope';
        c.fact(pid, 'bag', `Did ${c.name(pid)} put anything in ${into} tonight?`, n > 0);
        c.fact(pid, 'bag20', `Did ${c.name(pid)} put $20k or more in ${into} tonight?`, n >= 20000);
      }
      for (const numbers of c.free.filter((p) => p.job === 'numbers')) {
        const mine = rows[potOf(c, numbers.id)];
        if (mine.length) c.note(numbers.id, `The count, as only you saw it: ${mine.map((r) => `${c.name(r.pid)} ${money(r.n)}`).join(', ')}.`, 'the ledger in your head');
      }
      if (rows.bag.length) {
        c.line(added.bag > 0
          ? `The Bag went up by ${money(added.bag)}. It’s at ${money(c.bag.total)} of ${money(c.bag.target)}.`
          : `Nothing went in the Bag tonight. Nonna noticed. It’s at ${money(c.bag.total)} of ${money(c.bag.target)}.`);
        const m = milestoneNow(c);
        if (m && c.bag.total < m) c.line(`Morty wants ${money(m)} by the end of the act. The Bag is ${money(m - c.bag.total)} short.`);
      }
      if (rows.envelope.length) {
        c.line(added.envelope > 0
          ? `Vinnie’s Envelope went up by ${money(added.envelope)}. It’s at ${money(c.s.envelope.total)}.`
          : 'Nothing went in Vinnie’s Envelope tonight. Vinnie weighed it in his hand and said nothing, which was worse.');
      }
    },
  };
}

/** Money for Prout's friends: the Castellanos' side of the table. */
export function envelopeAdd(c, amount, pid = null) {
  const e = c.s.envelope ?? (c.s.envelope = { total: 0, by: {} });
  const n = Math.max(0, Math.round(amount));
  e.total += n;
  if (pid) e.by[pid] = (e.by[pid] ?? 0) + n;
  return n;
}

export function envelopeTake(c, amount) {
  const e = c.s.envelope ?? (c.s.envelope = { total: 0, by: {} });
  const n = Math.max(0, Math.min(e.total, Math.round(amount)));
  e.total -= n;
  return n;
}

function envelopeText(c) {
  return [
    c.rng.pick([
      'Back at the social club, under the photograph of Vinnie’s father shaking hands with Sinatra. There is a cigar box on the card table. Vinnie calls it the Envelope. Nobody knows why.',
      'The back room of the Castellano social club at two in the morning: one lamp, an espresso machine older than anybody, and the cigar box in the middle of the table.',
      'Vinnie is doing the crossword at the bar with his back to you. The cigar box is on the card table, open.',
    ]),
    'Everybody decides, privately, how much of what they’re holding goes in. What’s in the Envelope helps Prout on Monday. What isn’t is yours — unless Sal walks, in which case you keep half.',
  ];
}

function countingText(c) {
  const lines = [
    'Everything goes on the kitchen table: the take, the coffee, Nonna’s reading glasses. The Knicks bag is open.',
    'Nonna counts twice, like she always has. The second count is for the people who were hoping she wouldn’t.',
    'The espresso pot is on. Somebody has the radio low. The Bag sits in the middle of the table with its mouth open.',
    'Sal’s chair is empty. Nobody sits in it. The Bag sits in front of it instead.',
  ];
  return [c.rng.pick(lines), 'Everybody decides, privately, how much of what they’re holding goes in. The Bag’s total is public. Who put in what is not.'];
}

/** Where the Bag should be by now, according to Morty. */
export function milestoneNow(c) {
  const act = c.s.scene?.act ?? 1;
  const frac = act <= 1 ? 0.2 : act === 2 ? 0.6 : 1;
  return round5k(c.bag.target * frac);
}

/** Getting away: a roll with the Driver's name on it. */
export function getaway({ time, place, title = 'The Car', text, target, heat = 1, who = null, onFail = null, onSuccess = null, stakes = null }) {
  return {
    engine: 'roll', time, place, title, kicker: 'GET AWAY',
    text,
    target: (c) => (typeof target === 'function' ? target(c) : target),
    who: who ?? ((c) => c.free.map((p) => p.id)),
    roller: (c) => c.freeByJob('driver')?.id ?? null,
    label: (c) => `${c.freeByJob('driver')?.name ?? 'Whoever’s driving'} puts it in gear.`,
    stakes: stakes ?? ((c) => `Miss it and ${heat === 1 ? 'everybody in the car takes one heat' : `everybody in the car takes ${heat} heat`}.`),
    getaway: true,
    resolve(c, r) {
      const driver = c.freeByJob('driver');
      if (r.success) {
        c.line(driver ? `${driver.name} took the long way round, lights off for the first block. Clean.` : 'Clean. Nobody followed.');
        onSuccess?.(c, r);
      } else {
        c.line(driver ? `${driver.name} clipped a mailbox on Ferry Street and somebody wrote the plate down.` : 'Somebody wrote the plate down.');
        const ids = (typeof who === 'function' ? who(c) : c.free.map((p) => p.id));
        for (const id of ids) c.heat(id, heat, 'the getaway');
        onFail?.(c, r);
      }
    },
  };
}

/** Pay everybody on a job an even share of something, with a source. */
export function share(c, ids, amount, source) {
  if (!ids.length || amount <= 0) return 0;
  const each = round5k(amount / ids.length);
  for (const id of ids) c.give(id, each, source);
  return each;
}

export const names = (c, ids) => listNames(ids.map((id) => c.name(id)));

/** "the Talker", or the Talker's actual name if there is one. */
export function who(c, job, fallback) {
  return c.byJob(job)?.name ?? fallback;
}

export { money, round5k };

export const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY', 'MONDAY'];

/** Which day each night of this week falls on. */
export function nightDays(c) {
  return c.s.flags.nightDays ?? [0, 1, 2, 3, 4, 5, 6];
}

export function nightDay(c) {
  const n = Math.max(1, c.s.week.n);
  return `${DAYS[nightDays(c)[n - 1] ?? n - 1]} NIGHT`;
}

export function morningDay(c, time = '7:15 A.M.') {
  const n = Math.max(1, c.s.week.n);
  return `${DAYS[(nightDays(c)[n - 1] ?? n - 1) + 1] ?? 'MONDAY'}, ${time}`;
}

const ORDINALS = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT'];

/** "NIGHT THREE", counted from the nights actually played. */
export function nightKicker(c) {
  const n = Math.max(1, c.s.week.n);
  return `NIGHT ${ORDINALS[n - 1] ?? n}`;
}

/** Everybody who put the most in the Bag, for the moments Nonna rewards it. */
export function biggestGiver(c) {
  const by = c.s.bag.by;
  let best = null;
  for (const p of c.players) {
    const n = by[p.id] ?? 0;
    if (!best || n > best.n) best = { id: p.id, n };
  }
  return best && best.n > 0 ? best.id : null;
}

/** "A shoebox of fifties" → "a shoebox of fifties", but "Sal’s watch" stays Sal’s. */
export function lowerFirst(label) {
  const s = String(label ?? '');
  return /^(A|An|The|Another)\b/.test(s) ? s[0].toLowerCase() + s.slice(1) : s;
}
