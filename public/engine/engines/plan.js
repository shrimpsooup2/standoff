// Hidden effort: everybody commits something, nobody sees who.
//
// Helping costs you (tools, uniforms, a bribe); coasting is free; sabotage
// subtracts. The contributions are shown shuffled, so the table knows the
// total and that somebody put in a minus three, and nothing else. Then one
// die on top of the total, against the target.

import { traits, enemyOf } from '../bots.js';
import { money } from '../util.js';

const MOVES = {
  help: { n: 2, label: 'Pull your weight' },
  coast: { n: 0, label: 'Let the others do it' },
  sabotage: { n: -3, label: 'Make sure it goes wrong' },
};

function who(g, b) {
  return b.data.who.filter((id) => {
    const p = g.getPlayer(id);
    return p && !g.isAway(p) && !g.isBenched(p);
  });
}

export default {
  kicker: 'EVERYBODY PUTS SOMETHING IN',
  private: () => true,

  start(g, b, def) {
    const c = g.ctx();
    const ids = (def.who?.(c) ?? g.free().map((p) => p.id)).filter((id) => g.hasPlayer(id));
    b.data = {
      who: ids, target: def.target(c), cost: def.cost?.(c) ?? 10000, moves: {}, values: [], total: null,
      labels: def.labels?.(c) ?? {},
    };
    b.stage = 'commit';
    g.clockFor('plan');
  },

  pending(g, b) {
    if (b.stage !== 'commit') return [];
    return who(g, b).filter((id) => !b.data.moves[id]);
  },

  act(g, b, def, pid, a) {
    if (a.t !== 'plan') return { error: 'Not now.' };
    if (b.stage !== 'commit') return { error: 'It’s already in motion.' };
    if (!who(g, b).includes(pid)) return { error: 'You’re not on this one.' };
    if (b.data.moves[pid]) return { error: 'You’ve committed.' };
    if (!MOVES[a.move]) return { error: 'Help, coast, or sabotage.' };
    const p = g.getPlayer(pid);
    if (a.move === 'help') {
      if (p.cash < b.data.cost) return { error: `Helping costs ${money(b.data.cost)}, and you don’t have it.` };
      p.cash -= b.data.cost;
    }
    b.data.moves[pid] = a.move;
    return { ok: true };
  },

  step(g, b, def) {
    if (b.stage !== 'commit') return;
    const c = g.ctx();
    const d = b.data;
    const values = [];
    for (const id of who(g, b)) {
      const move = d.moves[id] ?? 'coast';
      let n = MOVES[move].n;
      if (move === 'help' && g.getPlayer(id).job === 'muscle') n += 1;
      values.push(n);
      c.fact(id, 'sabotage', `Did ${g.name(id)} sabotage the job tonight?`, move === 'sabotage');
      c.fact(id, 'coast', `Did ${g.name(id)} coast tonight?`, move === 'coast');
      if (move === 'sabotage') g.getPlayer(id).stats.sabotaged = (g.getPlayer(id).stats.sabotaged ?? 0) + 1;
    }
    d.values = g.rng.shuffle(values);
    d.total = values.reduce((a, v) => a + v, 0);
    b.stage = 'rolling';
    g.openRoll({ dice: 1, target: d.target - d.total, label: `Effort ${d.total >= 0 ? '+' : ''}${d.total}, and one die. Needs ${d.target} in all.`, who: who(g, b), then: 'plan', meta: { total: d.total } });
  },

  afterRoll(g, b, def, roll) {
    const c = g.ctx();
    const d = b.data;
    const success = roll.total + d.total >= d.target;
    b.stage = 'resolving';
    def.resolve?.(c, { success, total: d.total, die: roll.total, sum: roll.total + d.total, moves: d.moves, values: d.values });
    b.receipt = { kind: 'plan', values: d.values, total: d.total, die: roll.total, target: d.target, success };
    if (g.s.beat === b && !b.window) g.toFallout();
  },

  timeout(g, b) {
    if (b.stage !== 'commit') return;
    for (const id of who(g, b)) if (!b.data.moves[id]) b.data.moves[id] = 'coast';
  },

  bot(g, b, def, p) {
    const tr = traits(p);
    const canHelp = p.cash >= b.data.cost;
    const enemy = enemyOf(g, p);
    let sab = p.secret?.id === 'rat' ? 0.35 : (1 - tr.honesty) * 0.12;
    if (enemy && b.data.who.includes(enemy)) sab += tr.spite * 0.1;
    if (g.rng() < sab) return { t: 'plan', move: 'sabotage' };
    if (canHelp && g.rng() < 0.45 + tr.honesty * 0.4 - tr.greed * 0.2) return { t: 'plan', move: 'help' };
    return { t: 'plan', move: 'coast' };
  },

  fallback: () => ({ t: 'plan', move: 'coast' }),

  view(g, b, def, pid) {
    const d = b.data;
    const p = pid ? g.getPlayer(pid) : null;
    return {
      target: d.target, cost: d.cost,
      moves: Object.entries(MOVES).map(([id, m]) => ({
        id, label: d.labels[id] ?? m.label,
        n: id === 'help' && p?.job === 'muscle' ? m.n + 1 : m.n,
        cost: id === 'help' ? d.cost : 0,
        disabled: id === 'help' && p && p.cash < d.cost ? `You need ${money(d.cost)}.` : null,
      })),
      myMove: pid ? d.moves[pid] ?? null : null,
      canCommit: !!(pid && b.stage === 'commit' && who(g, b).includes(pid) && !d.moves[pid]),
      committed: who(g, b).filter((id) => d.moves[id]).map((id) => g.name(id)),
      values: b.stage === 'commit' ? null : d.values,
      total: b.stage === 'commit' ? null : d.total,
    };
  },
};
