// Take one, pass the box. Everybody sees what everybody took.

import { traits } from '../bots.js';

export default {
  kicker: 'TAKE ONE',
  private: () => false,

  start(g, b, def) {
    const c = g.ctx();
    const ids = (def.who?.(c) ?? g.free().map((p) => p.id)).filter((id) => g.hasPlayer(id));
    const order = def.order ? def.order(c, ids) : g.rng.shuffle(ids);
    b.data = { order, items: def.items(c).map((it) => ({ ...it, taken: null })), turn: 0, picks: {} };
    b.stage = 'pick';
    g.clockFor('pick');
    if (!order.length) finish(g, b, def);
  },

  pending(g, b) {
    if (b.stage !== 'pick') return [];
    // an empty box waits for nobody
    if (!b.data.items.some((it) => !it.taken)) return [];
    const id = b.data.order[b.data.turn];
    const p = id ? g.getPlayer(id) : null;
    if (!p || g.isAway(p)) return [];
    return [id];
  },

  act(g, b, def, pid, a) {
    if (a.t !== 'pick') return { error: 'Not now.' };
    const d = b.data;
    if (b.stage !== 'pick' || d.order[d.turn] !== pid) return { error: 'Not your turn at the box.' };
    const item = d.items.find((it) => it.id === a.item && !it.taken);
    if (!item) return { error: 'That’s gone.' };
    item.taken = pid;
    d.picks[pid] = item.id;
    d.turn += 1;
    return { ok: true };
  },

  step(g, b, def) {
    const d = b.data;
    if (b.stage !== 'pick') return;
    // skip anybody who is no longer here
    while (d.turn < d.order.length && g.isAway(g.getPlayer(d.order[d.turn]))) d.turn += 1;
    if (d.turn >= d.order.length || !d.items.some((it) => !it.taken)) return finish(g, b, def);
    g.clockFor('pick');
  },

  timeout(g, b) {
    const d = b.data;
    if (b.stage !== 'pick') return;
    const id = d.order[d.turn];
    const item = d.items.find((it) => !it.taken);
    if (id && item) { item.taken = id; d.picks[id] = item.id; }
    d.turn += 1;
  },

  bot(g, b, def, p) {
    const c = g.ctx();
    const open = b.data.items.filter((it) => !it.taken);
    if (!open.length) return null;
    if (def.bot) { const pick = def.bot(c, p, open); if (pick) return { t: 'pick', item: pick }; }
    const tr = traits(p);
    const best = open.reduce((acc, it) => {
      const score = (it.value ?? 0) * (0.5 + tr.greed) + (it.safe ? (1 - tr.nerve) * 20000 : 0) + g.rng() * 10000;
      return !acc || score > acc.score ? { id: it.id, score } : acc;
    }, null);
    return { t: 'pick', item: best.id };
  },

  fallback(g, b) {
    const it = b.data.items.find((i) => !i.taken);
    return it ? { t: 'pick', item: it.id } : null;
  },

  view(g, b, def, pid) {
    const d = b.data;
    return {
      order: d.order.map((id) => g.name(id)),
      turn: d.order[d.turn] ? g.name(d.order[d.turn]) : null,
      yourTurn: pid && d.order[d.turn] === pid && b.stage === 'pick',
      items: d.items.map((it) => ({ id: it.id, label: it.label, blurb: it.blurb ?? null, taken: it.taken ? g.name(it.taken) : null })),
    };
  },
};

function finish(g, b, def) {
  const c = g.ctx();
  b.stage = 'resolving';
  def.resolve?.(c, { picks: b.data.picks });
  b.receipt = {
    kind: 'draft',
    rows: Object.entries(b.data.picks).map(([id, item]) => ({ name: g.name(id), item: b.data.items.find((it) => it.id === item)?.label ?? item })),
  };
  if (g.s.beat === b && !b.window) g.toFallout();
}
