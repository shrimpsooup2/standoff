// One person counts; everybody else trusts them.
//
// The counter sees the real total and says a number. Whatever they don't say
// is theirs, and nobody knows unless somebody asks the right question later.

import { traits } from '../bots.js';
import { round5k, money } from '../util.js';

export default {
  kicker: 'SOMEBODY COUNTS IT',
  private: () => true,

  start(g, b, def) {
    const c = g.ctx();
    const pool = (def.who?.(c) ?? g.free().map((p) => p.id)).filter((id) => g.hasPlayer(id));
    const preferred = def.counter?.(c) ?? c.freeByJob('numbers')?.id;
    const counter = pool.includes(preferred) ? preferred : g.rng.pick(pool);
    b.data = { counter, actual: round5k(def.amount(c)), reported: null, who: pool };
    b.stage = 'report';
    g.clockFor('report');
  },

  pending(g, b) {
    if (b.stage !== 'report' || b.data.reported != null) return [];
    const p = g.getPlayer(b.data.counter);
    return p && !g.isAway(p) ? [p.id] : [];
  },

  act(g, b, def, pid, a) {
    if (a.t !== 'report') return { error: 'Not now.' };
    const d = b.data;
    if (pid !== d.counter) return { error: `${g.name(d.counter)} is counting.` };
    if (b.stage !== 'report') return { error: 'Already counted.' };
    const n = Math.round(Number(a.amount));
    if (!Number.isFinite(n) || n < 0 || n > d.actual || n % 5000 !== 0) return { error: `Between $0 and ${money(d.actual)}, in fives.` };
    d.reported = n;
    return { ok: true };
  },

  step(g, b, def) {
    if (b.stage !== 'report') return;
    const d = b.data;
    if (d.reported == null) d.reported = d.actual;
    const c = g.ctx();
    const skim = d.actual - d.reported;
    if (skim > 0) {
      c.give(d.counter, skim, 'the count');
      g.getPlayer(d.counter).stats.skimmed = (g.getPlayer(d.counter).stats.skimmed ?? 0) + skim;
    }
    c.fact(d.counter, 'count', `Did ${g.name(d.counter)} report the real number?`, skim === 0);
    b.stage = 'resolving';
    def.resolve?.(c, { reported: d.reported, actual: d.actual, counter: d.counter, skim });
    b.receipt = { kind: 'report', counter: g.name(d.counter), reported: d.reported };
    if (g.s.beat === b && !b.window) g.toFallout();
  },

  timeout(g, b) {
    if (b.stage === 'report' && b.data.reported == null) b.data.reported = b.data.actual;
  },

  bot(g, b, def, p) {
    const tr = traits(p);
    const d = b.data;
    const skimChance = (1 - tr.honesty) * 0.8 + tr.greed * 0.2;
    if (g.rng() < skimChance) {
      const frac = 0.1 + g.rng() * 0.25 * tr.greed;
      return { t: 'report', amount: Math.max(0, d.actual - round5k(d.actual * frac)) };
    }
    return { t: 'report', amount: d.actual };
  },

  fallback: (g, b) => ({ t: 'report', amount: b.data.actual }),

  view(g, b, def, pid) {
    const d = b.data;
    const counting = pid === d.counter;
    return {
      counter: g.name(d.counter), counting,
      actual: counting ? d.actual : null,
      reported: b.stage === 'report' ? null : d.reported,
      canReport: counting && b.stage === 'report',
    };
  },
};
