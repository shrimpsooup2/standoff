// A roll everybody watches: the target on screen, the odds in words, the dice
// on the felt, and a moment afterwards for anybody holding something that
// bends them.

import { oddsText } from '../dice.js';

export default {
  kicker: 'THE DICE',
  private: () => false,

  start(g, b, def) {
    const c = g.ctx();
    const target = def.target(c);
    const who = (def.who?.(c) ?? g.free().map((p) => p.id)).filter((id) => g.hasPlayer(id));
    const rollerId = def.roller?.(c) ?? null;
    const here = (id) => id && g.hasPlayer(id) && !g.isAway(g.getPlayer(id)) && g.inCurrentTrack(g.getPlayer(id));
    // with nobody in the scene to throw them, the dice throw themselves
    const roller = here(rollerId) ? rollerId : who.find((id) => here(id) && !g.getPlayer(id).bot) ?? who.find(here) ?? null;
    b.data = {
      target, who, roller, mods: def.mods?.(c) ?? [], dice: def.dice ?? 2,
      label: typeof def.label === 'function' ? def.label(c) : def.label ?? b.title,
      stakes: typeof def.stakes === 'function' ? def.stakes(c) : def.stakes ?? null,
      rolled: false, getaway: !!def.getaway,
    };
    b.stage = 'roll';
    g.clockFor('roll');
  },

  pending(g, b) {
    if (b.stage !== 'roll') return [];
    const p = g.getPlayer(b.data.roller);
    if (!p) return [];
    return [p.id];
  },

  act(g, b, def, pid, a) {
    if (a.t !== 'roll') return { error: 'Not now.' };
    if (b.stage !== 'roll') return { error: 'Already rolled.' };
    if (pid !== b.data.roller) return { error: `${g.name(b.data.roller)} is rolling this one.` };
    roll(g, b);
    return { ok: true };
  },

  step(g, b) {
    if (b.stage === 'roll') roll(g, b);
  },

  timeout(g, b) {
    if (b.stage === 'roll') roll(g, b);
  },

  afterRoll(g, b, def, result) {
    const c = g.ctx();
    // some rolls get a second chance: Nonna's ring, a mechanic, a prayer
    const again = !result.success ? def.again?.(c, result) : null;
    if (again) {
      b.lines.push(again);
      roll(g, b);
      return;
    }
    b.stage = 'resolving';
    def.resolve?.(c, result);
    if (g.s.beat === b && !b.window) g.toFallout();
  },

  bot: () => ({ t: 'roll' }),
  fallback: () => ({ t: 'roll' }),

  view(g, b) {
    const n = b.data.dice;
    const mods = b.data.mods.reduce((a, m) => a + m.n, 0);
    return {
      target: b.data.target, roller: g.name(b.data.roller), rollerId: b.data.roller,
      odds: n === 2 ? oddsText(2, b.data.target - mods) : null,
      mods: b.data.mods, label: b.data.label, stakes: b.data.stakes,
      who: b.data.who.map((id) => g.name(id)),
    };
  },
};

function roll(g, b) {
  b.stage = 'rolling';
  g.openRoll({ dice: b.data.dice, target: b.data.target, label: b.data.label, mods: b.data.mods, who: b.data.who, then: 'main', meta: { getaway: b.data.getaway } });
}
