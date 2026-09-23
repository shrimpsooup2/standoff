// A private choice: everybody decides alone, nobody sees until it's done.
//
// The Room, Vinnie's offer, who you warn, what you put in the Bag — all the
// same shape underneath. Each person gets their own options (they can differ),
// an option can ask for a person or an amount, and the chapter decides what
// it all adds up to.

import { weighted, traits } from '../bots.js';
import { round5k } from '../util.js';

function who(g, b) {
  return b.data.who.filter((id) => {
    const p = g.getPlayer(id);
    return p && !g.isAway(p) && !g.isBenched(p);
  });
}

function validAmount(spec, n) {
  if (!spec) return true;
  if (!Number.isFinite(n)) return false;
  if (n < spec.min || n > spec.max) return false;
  const step = spec.step ?? 5000;
  return Math.abs((n - spec.min) / step - Math.round((n - spec.min) / step)) < 1e-9 || n === spec.max;
}

function usable(o) {
  return !o.disabled && !(o.target && Array.isArray(o.targets) && !o.targets.length);
}

function defaultChoice(g, b, def, pid) {
  const c = g.ctx();
  const fromDef = def.fallback?.(c, pid);
  if (fromDef) return fromDef;
  const opts = b.data.opts[pid] ?? [];
  const opt = opts.find((o) => !o.disabled) ?? opts[0];
  if (!opt) return null;
  const choice = { option: opt.id };
  if (opt.target) choice.target = g.rng.pick(g.s.players.filter((p) => p.id !== pid && !g.isAway(p)))?.id ?? null;
  if (opt.amount) choice.amount = opt.amount.min;
  return choice;
}

export default {
  kicker: 'YOUR CALL',
  private: () => true,

  start(g, b, def) {
    const c = g.ctx();
    const asked = (def.who?.(c) ?? g.free().map((p) => p.id)).filter((id) => g.hasPlayer(id));
    const opts = {};
    for (const id of asked) {
      if (def.amount && !def.options) {
        const spec = def.amount(c, id);
        opts[id] = [{ id: 'amount', label: spec.label ?? 'Amount', amount: { min: spec.min ?? 0, max: Math.max(spec.min ?? 0, spec.max), step: spec.step ?? 5000 }, blurb: spec.blurb ?? null }];
      } else {
        opts[id] = (def.options(c, id) ?? []).map((o) => ({
          ...o,
          amount: o.amount ? { min: o.amount.min ?? 0, max: Math.max(o.amount.min ?? 0, o.amount.max), step: o.amount.step ?? 5000 } : null,
        }));
      }
    }
    // nobody waits on a person who has nothing they could pick — say, warning
    // somebody else when everybody else is in lockup
    const ids = asked.filter((id) => opts[id].some(usable));
    b.data = {
      who: ids, opts, choices: {}, reveal: def.reveal ?? 'secret', peeks: {},
      intro: def.intro ? Object.fromEntries(ids.map((id) => [id, def.intro(c, id)])) : {},
    };
    b.stage = 'choose';
    g.clockFor('choose');
    if (!ids.length) { def.resolve?.(c, { choices: {} }); g.toFallout(); }
  },

  pending(g, b) {
    if (b.stage !== 'choose') return [];
    return who(g, b).filter((id) => !b.data.choices[id]);
  },

  act(g, b, def, pid, a) {
    if (a.t !== 'choose') return { error: 'Not now.' };
    if (b.stage !== 'choose') return { error: 'Too late — it’s decided.' };
    if (!who(g, b).includes(pid)) return { error: 'This one isn’t yours.' };
    if (b.data.choices[pid]) return { error: 'You’ve already decided.' };
    const opt = (b.data.opts[pid] ?? []).find((o) => o.id === a.option);
    if (!opt) return { error: 'That isn’t one of your options.' };
    if (opt.disabled) return { error: opt.disabled };
    const choice = { option: opt.id };
    if (opt.target) {
      const target = g.getPlayer(String(a.target ?? ''));
      if (!target) return { error: 'Choose somebody.' };
      if (opt.target === 'other' && target.id === pid) return { error: 'Somebody else.' };
      if (opt.targets && !opt.targets.includes(target.id)) return { error: 'Not them.' };
      choice.target = target.id;
    }
    if (opt.amount) {
      const n = Math.round(Number(a.amount));
      if (!validAmount(opt.amount, n)) return { error: 'That amount won’t do.' };
      choice.amount = n;
    }
    b.data.choices[pid] = choice;
    return { ok: true };
  },

  step(g, b, def) {
    if (b.stage !== 'choose') return;
    const c = g.ctx();
    b.stage = 'resolving';
    def.resolve?.(c, { choices: b.data.choices });
    if (b.data.reveal === 'public') {
      b.receipt = {
        kind: 'choices',
        rows: Object.entries(b.data.choices).map(([id, ch]) => {
          const opt = b.data.opts[id]?.find((o) => o.id === ch.option);
          return {
            pid: id, name: g.name(id), option: ch.option, label: opt?.label ?? ch.option,
            target: ch.target ? g.name(ch.target) : null, amount: ch.amount ?? null,
          };
        }),
      };
    }
    if (g.s.beat === b && !b.window && b.stage === 'resolving') g.toFallout();
  },

  timeout(g, b, def) {
    if (b.stage !== 'choose') return;
    for (const id of who(g, b)) {
      if (b.data.choices[id]) continue;
      const ch = defaultChoice(g, b, def, id);
      if (ch) b.data.choices[id] = { ...ch, timedOut: true };
    }
  },

  afterRoll(g, b, def, roll, then, meta) {
    def.afterRoll?.(g.ctx(), roll, then, meta);
    if (g.s.beat === b && !b.window && b.stage !== 'fallout') g.toFallout();
  },

  bot(g, b, def, p) {
    const c = g.ctx();
    const opts = (b.data.opts[p.id] ?? []).filter((o) => !o.disabled);
    if (!opts.length) return null;
    const custom = def.bot?.(c, p, opts);
    if (custom) return { t: 'choose', ...custom };
    const tr = traits(p);
    const opt = weighted(g.rng, opts, (o) => {
      const lean = o.lean ?? {};
      return (lean[p.style] ?? 1) + (o.honest ? tr.honesty : 0) + (o.greedy ? tr.greed : 0) + (o.brave ? tr.nerve : 0);
    });
    const choice = { t: 'choose', option: opt.id };
    if (opt.target) {
      const pool = g.s.players.filter((q) => q.id !== p.id && !g.isAway(q) && (!opt.targets || opt.targets.includes(q.id)));
      choice.target = g.rng.pick(pool)?.id;
    }
    if (opt.amount) {
      const span = opt.amount.max - opt.amount.min;
      const frac = def.botAmount ? def.botAmount(c, p) : g.rng() * 0.6;
      choice.amount = Math.min(opt.amount.max, Math.max(opt.amount.min, opt.amount.min + round5k(span * frac)));
    }
    return choice;
  },

  fallback(g, b, def, p) {
    const ch = defaultChoice(g, b, def, p.id);
    return ch ? { t: 'choose', ...ch } : null;
  },

  view(g, b, def, pid) {
    const mine = pid ? b.data.opts[pid] ?? null : null;
    const peek = pid ? b.data.peeks[pid] : null;
    return {
      options: mine,
      intro: pid ? b.data.intro[pid] ?? null : null,
      myChoice: pid ? b.data.choices[pid] ?? null : null,
      canChoose: !!(pid && b.stage === 'choose' && who(g, b).includes(pid) && !b.data.choices[pid]),
      decided: who(g, b).filter((id) => b.data.choices[id]).map((id) => g.name(id)),
      waiting: who(g, b).filter((id) => !b.data.choices[id]).map((id) => g.name(id)),
      peek: peek ? { name: g.name(peek), choice: b.data.choices[peek] ? describe(g, b, peek) : null } : null,
      targets: g.s.players.filter((p) => !g.isAway(p)).map((p) => ({ id: p.id, name: p.name })),
    };
  },
};

function describe(g, b, id) {
  const ch = b.data.choices[id];
  const opt = b.data.opts[id]?.find((o) => o.id === ch.option);
  let s = opt?.label ?? ch.option;
  if (ch.target) s += ` — ${g.name(ch.target)}`;
  if (ch.amount != null) s += ` — $${Math.round(ch.amount / 1000)}k`;
  return s;
}
