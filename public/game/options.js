// What you can actually do, and why it is different in every room.
//
// A job does not offer "cooperate" and "defect". It offers the two or three or
// four things that are genuinely available to a person standing in that
// particular room, and those things behave differently from job to job. On one
// job the interesting move is a half-truth. On another it is a gamble that only
// pays if the others hold. On another it is a threat you can carry out.
//
// Every move is described by five traits, and one resolver turns any mix of
// them into money — for two people in two rooms or for ten people at a table.

/**
 *  give   how much of your stake goes into the pot everybody splits.
 *         1 is everything, 0 is nothing, above 1 is more than your share.
 *  guard  a floor, in stakes. However badly the round goes, you do not end it
 *         with less than this. It is insurance, so it never pays out when
 *         things go well and it cannot make a room of hedgers rich.
 *  punish how much you strip from anyone who kept theirs. Half comes to you.
 *  swing  variance. Pays much more if the room holds, much less if it doesn't.
 *  fee    what the move costs you just to make, whatever happens.
 */
export const ARCHETYPES = {
  hold:   { give: 1.00, guard: 0.00, punish: 0.00, swing: 0.00, fee: 0.00 },
  fold:   { give: 0.00, guard: 0.00, punish: 0.00, swing: 0.00, fee: 0.00 },
  half:   { give: 0.50, guard: 0.85, punish: 0.00, swing: 0.00, fee: 0.40 },
  shield: { give: 0.30, guard: 1.15, punish: 0.00, swing: 0.00, fee: 0.45 },
  gamble: { give: 0.65, guard: 0.00, punish: 0.00, swing: 0.80, fee: 0.00 },
  muscle: { give: 0.75, guard: 0.00, punish: 0.90, swing: 0.00, fee: 0.35 },
  martyr: { give: 1.40, guard: 0.00, punish: 0.00, swing: 0.00, fee: 0.00 },
  chance: { give: 0.25, guard: 0.55, punish: 0.00, swing: 0.55, fee: 0.05 },
};

/** How each move reads at a glance, for the table that has to choose between them. */
export const ARCHETYPE_NOTES = {
  hold: 'Everything you have goes in. Best for the room, worst for you if the room does not do the same.',
  fold: 'You keep yours and take your cut of whatever everybody else put in.',
  half: 'Half in, half kept. Costs you if the room holds, covers you if it doesn\u2019t.',
  shield: 'Almost nothing in, and a floor under you. You will not do well. You cannot do badly.',
  gamble: 'Pays well above anything else if the room holds. Pays almost nothing if it doesn’t.',
  muscle: 'Strips most of what anybody who kept theirs was keeping. Half of it comes to you. Costs you if nobody does.',
  martyr: 'More than your share goes in. It costs you and it makes everybody else richer.',
  chance: 'Little in, a floor under you, and a swing either way. For somebody who has no idea what is about to happen.',
};

export const ARCHETYPE_IDS = Object.keys(ARCHETYPES);

export function traitsOf(option) {
  const base = ARCHETYPES[option.archetype] ?? ARCHETYPES.hold;
  return { ...base, ...(option.traits ?? {}) };
}

/** Is this move a cooperative one? Used for the record, the bonds and the heat. */
export function isCooperative(option) {
  return traitsOf(option).give >= 0.75;
}
export function isBetrayal(option) {
  return traitsOf(option).give < 0.3;
}

/**
 * Resolve one job. `picks` is [{ id, option }] for everybody in the room.
 * Returns { byPlayer: { id: { total, lines } }, pot }.
 *
 * Works identically for two people in separate interview rooms and for ten
 * people around a table, which is why a pair job and a whole-table job can use
 * the same option vocabulary.
 */
export function resolve({ picks, unit, multiplier }) {
  const n = picks.length;
  const traits = new Map(picks.map((p) => [p.id, traitsOf(p.option)]));
  const contributed = picks.reduce((sum, p) => sum + traits.get(p.id).give * unit, 0);
  const pot = contributed * multiplier;
  const share = n > 0 ? pot / n : 0;

  // Exact figures all the way through; the money is rounded once, at the end,
  // so two different moves can never collide just because of rounding.
  const exact = new Map();
  const byPlayer = {};

  for (const p of picks) {
    const t = traits.get(p.id);
    const kept = (1 - t.give) * unit;
    const cost = t.fee * unit;
    exact.set(p.id, share + kept - cost);
    const lines = [
      { label: n > 2 ? `Your cut of the pot, split ${n} ways` : 'Your cut of what went in', amount: round(share) },
    ];
    if (Math.abs(kept) > 0.5) {
      lines.push({ label: kept > 0 ? 'What you kept back' : 'What you put in over your share', amount: round(kept) });
    }
    if (cost > 0.5) lines.push({ label: 'What the move cost you', amount: -round(cost) });
    byPlayer[p.id] = { lines, total: 0 };
  }

  const moodAround = (id) => {
    const others = picks.filter((o) => o.id !== id);
    if (!others.length) return 1;
    return others.reduce((s, o) => s + traits.get(o.id).give, 0) / others.length;
  };

  // --- swing: read the room right and it pays, read it wrong and it doesn't ---
  for (const p of picks) {
    const t = traits.get(p.id);
    if (t.swing <= 0) continue;
    // it only comes off if the rest of the room actually held the line
    const held = moodAround(p.id) >= 0.75;
    const before = exact.get(p.id);
    const delta = before * (held ? t.swing : -t.swing);
    exact.set(p.id, before + delta);
    if (Math.abs(delta) > 0.5) {
      byPlayer[p.id].lines.push({ label: held ? 'It came off' : 'It did not come off', amount: round(delta) });
    }
  }

  // --- punish: taken off anybody who kept theirs ----------------------------
  for (const p of picks) {
    const t = traits.get(p.id);
    if (t.punish <= 0) continue;
    for (const o of picks) {
      if (o.id === p.id) continue;
      const ot = traits.get(o.id);
      if (ot.give >= 0.3) continue;
      const stripped = t.punish * (1 - ot.give) * unit;
      if (stripped <= 0) continue;
      exact.set(o.id, exact.get(o.id) - stripped);
      byPlayer[o.id].lines.push({ label: 'Taken off you, by hand', amount: -round(stripped) });
      exact.set(p.id, exact.get(p.id) + stripped / 2);
      byPlayer[p.id].lines.push({ label: 'Taken back off somebody', amount: round(stripped / 2) });
    }
  }

  // --- guard: a floor, not a windfall ---------------------------------------
  for (const p of picks) {
    const t = traits.get(p.id);
    if (t.guard <= 0) continue;
    const floor = t.guard * unit;
    const now = exact.get(p.id);
    if (now >= floor) continue;
    exact.set(p.id, floor);
    byPlayer[p.id].lines.push({ label: 'You were covered for exactly this', amount: round(floor - now) });
  }

  // The arithmetic is exact and the total is rounded once, but the breakdown a
  // player reads has to add up to the number at the bottom of it. Nudge the
  // biggest line by whatever rounding left over.
  for (const p of picks) {
    const rec = byPlayer[p.id];
    rec.total = round(exact.get(p.id));
    const shown = rec.lines.reduce((sum, l) => sum + l.amount, 0);
    const drift = rec.total - shown;
    if (drift !== 0 && rec.lines.length) {
      const biggest = rec.lines.reduce((a, b) => (Math.abs(b.amount) > Math.abs(a.amount) ? b : a));
      biggest.amount += drift;
    }
    rec.lines = rec.lines.filter((l) => l.amount !== 0);
  }
  return { byPlayer, pot: round(pot), share: round(share) };
}

function round(n) { return Math.round(n); }

/**
 * What a move is worth if the rest of the room holds, and if it doesn't. This
 * is what the table is shown before choosing: not a matrix, just the two
 * numbers that matter, per option, for this job.
 */
export function previewOption(option, { unit, multiplier, n }) {
  const me = { id: 'me', option };
  const otherHolds = Array.from({ length: n - 1 }, (_, i) => ({ id: `o${i}`, option: { archetype: 'hold' } }));
  const otherFolds = Array.from({ length: n - 1 }, (_, i) => ({ id: `o${i}`, option: { archetype: 'fold' } }));
  return {
    ifTheyHold: resolve({ picks: [me, ...otherHolds], unit, multiplier }).byPlayer.me.total,
    ifTheyDont: resolve({ picks: [me, ...otherFolds], unit, multiplier }).byPlayer.me.total,
  };
}
