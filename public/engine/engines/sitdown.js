// A sit-down: the long talk, with tools on the table.
//
// Anything agreed through the screen — an IOU, a Blood Oath, a trade — the
// game enforces. Anything said out loud is only as good as the person who
// said it. Offers can be made at any time in the game; a sit-down is just the
// time set aside for it, and the one place Dolores is selling.

import { money } from '../util.js';
import { traits, friendOf } from '../bots.js';

export const DOLORES = {
  secret: { label: 'What somebody wants', cost: 20000, target: true, blurb: 'Dolores tells you one player’s secret. Quietly.' },
  card: { label: 'Something from under the counter', cost: 15000, blurb: 'A card, off the top.' },
  cool: { label: 'A word at the precinct', cost: 25000, blurb: 'One less heat. Dolores knows a desk sergeant.' },
};

function who(g, b) {
  return b.data.who.filter((id) => {
    const p = g.getPlayer(id);
    return p && !g.isAway(p);
  });
}

export default {
  kicker: 'EVERYTHING’S NEGOTIABLE',
  private: () => true,

  start(g, b, def) {
    const c = g.ctx();
    const ids = (def.who?.(c) ?? g.free().map((p) => p.id)).filter((id) => g.hasPlayer(id));
    b.data = {
      who: ids, done: [], menu: def.menu?.(c) ?? Object.keys(DOLORES), bought: [],
      openedAt: g.s.oaths.length + '/' + g.s.ious.length, startOaths: g.s.oaths.length, startIous: g.s.ious.length,
      botsActed: [],
    };
    b.stage = 'deals';
    g.clockFor('sitdown');
  },

  pending(g, b, def, opts = {}) {
    if (b.stage !== 'deals') return [];
    const waiting = who(g, b).filter((id) => !b.data.done.includes(id));
    return waiting;
  },

  act(g, b, def, pid, a) {
    const d = b.data;
    if (b.stage !== 'deals') return { error: 'The table’s been cleared.' };
    if (a.t === 'done') {
      if (!d.done.includes(pid)) d.done.push(pid);
      return { ok: true };
    }
    if (a.t === 'buy') {
      const item = DOLORES[a.item];
      if (!item || !d.menu.includes(a.item)) return { error: 'Dolores doesn’t sell that.' };
      const p = g.getPlayer(pid);
      if (p.cash < item.cost) return { error: `That’s ${money(item.cost)}. You don’t have it.` };
      if (a.item === 'secret') {
        const t = g.getPlayer(String(a.target));
        if (!t || t.id === pid) return { error: 'Whose?' };
        p.cash -= item.cost;
        const sv = g.chapter.secretView(g.ctx(), t);
        p.notes.push({ from: 'Dolores', text: `${t.name}'s secret: “${sv.name}” — ${sv.text}`, night: g.s.week.i });
      } else if (a.item === 'card') {
        p.cash -= item.cost;
        const [card] = g.draw(pid, 1);
        if (card) p.notes.push({ from: 'Dolores', text: 'She slid something across the counter.', night: g.s.week.i });
      } else if (a.item === 'cool') {
        if (p.heat <= 0) return { error: 'You’ve got no heat to cool.' };
        p.cash -= item.cost;
        p.heat -= 1;
      }
      d.bought.push({ pid, item: a.item });
      return { ok: true };
    }
    return { error: 'Not at this table.' };
  },

  step(g, b, def) {
    if (b.stage !== 'deals') return;
    const c = g.ctx();
    const d = b.data;
    b.stage = 'resolving';
    const oaths = g.s.oaths.slice(d.startOaths);
    const ious = g.s.ious.slice(d.startIous);
    def.resolve?.(c, { oaths, ious, bought: d.bought });
    if (!oaths.length && !ious.length) b.lines.push('Nobody signed anything. Which is its own kind of statement.');
    b.receipt = {
      kind: 'deals',
      oaths: oaths.map((o) => `${g.name(o.a)} and ${g.name(o.b)}`),
      ious: ious.map((o) => `${g.name(o.from)} owes ${g.name(o.to)} ${o.pct}%`),
      dolores: d.bought.length,
    };
    if (g.s.beat === b && !b.window) g.toFallout();
  },

  timeout(g, b) {
    if (b.stage === 'deals') for (const id of who(g, b)) if (!b.data.done.includes(id)) b.data.done.push(id);
  },

  bot(g, b, def, p) {
    const d = b.data;
    if (!d.botsActed.includes(p.id)) {
      d.botsActed.push(p.id);
      const tr = traits(p);
      const friend = friendOf(g, p);
      const already = g.s.oaths.some((o) => !o.brokenBy && (o.a === p.id || o.b === p.id));
      if (!already && g.rng() < 0.35 + tr.honesty * 0.2) {
        const target = friend && who(g, b).includes(friend) ? friend
          : g.rng.pick(who(g, b).filter((id) => id !== p.id));
        if (target) g.makeOffer(p, { kind: 'oath', to: target });
      }
      if (p.heat >= 2 && p.cash >= DOLORES.cool.cost && g.rng() < 0.5) g.engine.act(g, b, def, p.id, { t: 'buy', item: 'cool' });
      else if (p.cash >= 60000 && g.rng() < 0.15) g.engine.act(g, b, def, p.id, { t: 'buy', item: 'card' });
    }
    return { t: 'done' };
  },

  fallback: () => ({ t: 'done' }),

  view(g, b, def, pid) {
    const d = b.data;
    return {
      menu: d.menu.map((id) => ({ id, ...DOLORES[id] })),
      done: d.done.map((id) => g.name(id)),
      amDone: pid ? d.done.includes(pid) : false,
      seats: who(g, b).filter((id) => id !== pid).map((id) => ({ id, name: g.name(id) })),
    };
  },
};
