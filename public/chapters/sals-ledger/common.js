// Pieces every night uses: counting it out, getting away, and the way the
// week talks about people.

import { money, round5k, listNames } from '../../engine/util.js';

/** The heartbeat. Back at Nonna's, everybody decides what goes in the Bag. */
export function counting({ time = '1:10 A.M.', place = 'Nonna’s kitchen', title = 'Counting It Out', text = null } = {}) {
  return {
    engine: 'choose', time, place, title, kicker: 'HOW MUCH GOES IN THE BAG?',
    text: (c) => text?.(c) ?? countingText(c),
    who: (c) => c.free.map((p) => p.id),
    amount: (c, pid) => ({
      min: 0, max: Math.max(0, c.p(pid).cash), step: 5000,
      label: 'Into the Bag',
      blurb: `You have ${money(c.p(pid).cash)}. The Bag has ${money(c.bag.total)} of the ${money(c.bag.target)} Morty wants.`,
    }),
    botAmount: (c, p) => {
      const style = { loyal: 0.55, nervous: 0.45, wild: 0.3, greedy: 0.15, snake: 0.12 }[p.style] ?? 0.3;
      const secretBend = p.secret?.id === 'skimmer' ? 0.02 : p.secret?.id === 'rat' ? 0.05 : 0;
      const behind = c.bag.total < milestoneNow(c) ? 0.2 : 0;
      return Math.min(1, (secretBend || style) + behind);
    },
    resolve(c, { choices }) {
      let added = 0;
      const rows = [];
      for (const [pid, ch] of Object.entries(choices)) {
        const n = Math.min(c.p(pid).cash, Math.max(0, ch.amount ?? 0));
        if (n > 0) {
          c.charge(pid, n);
          c.bagAdd(n, pid);
          c.p(pid).stats.given += n;
        }
        added += n;
        rows.push({ pid, n });
        c.fact(pid, 'bag', `Did ${c.name(pid)} put anything in the Bag tonight?`, n > 0);
        c.fact(pid, 'bag20', `Did ${c.name(pid)} put in $20k or more tonight?`, n >= 20000);
      }
      const numbers = c.free.find((p) => p.job === 'numbers');
      if (numbers) {
        c.note(numbers.id, `The count, as only you saw it: ${rows.map((r) => `${c.name(r.pid)} ${money(r.n)}`).join(', ')}.`, 'the ledger in your head');
      }
      c.line(added > 0
        ? `The Bag went up by ${money(added)}. It’s at ${money(c.bag.total)} of ${money(c.bag.target)}.`
        : `Nothing went in the Bag tonight. Nonna noticed. It’s at ${money(c.bag.total)} of ${money(c.bag.target)}.`);
      const m = milestoneNow(c);
      if (m && c.bag.total < m) c.line(`Morty wants ${money(m)} by the end of the act. You’re ${money(m - c.bag.total)} short.`);
    },
  };
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
