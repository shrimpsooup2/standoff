// A vote with private reasons.
//
// Everybody sees the options. Some people were dealt an angle — a reason of
// their own to want one of them. Votes are shown with names on them once they
// are all in, because a vote you can't be held to isn't a vote. Ties go to a
// die, and the die shows which faces mean what before it lands.

import { weighted, traits, suspicion, enemyOf, friendOf } from '../bots.js';
import { CARDS } from '../cards.js';

/** Hand out die faces so every option owns some. */
function assignFaces(options) {
  if (options.every((o) => Array.isArray(o.faces) && o.faces.length)) return options;
  const n = options.length;
  const per = Math.floor(6 / n);
  let face = 1;
  return options.map((o, i) => {
    const count = i < 6 % n ? per + 1 : per;
    const faces = [];
    for (let k = 0; k < count && face <= 6; k++) faces.push(face++);
    return { ...o, faces };
  });
}

/** Faces for a tie, among the tied options only, keeping their own where possible. */
function tieFaces(options, tied) {
  const own = tied.map((id) => options.find((o) => o.id === id));
  if (own.every((o) => o.faces?.length)) {
    const covered = own.flatMap((o) => o.faces);
    if (covered.length) return own.map((o) => ({ id: o.id, faces: o.faces }));
  }
  return assignFaces(tied.map((id) => ({ id }))).map((o) => ({ id: o.id, faces: o.faces }));
}

function voters(g, b) {
  return b.data.voters.filter((id) => {
    const p = g.getPlayer(id);
    return p && !g.isAway(p) && !g.isBenched(p);
  });
}

function tally(g, b) {
  const t = {};
  for (const o of b.data.options) t[o.id] = 0;
  const votes = { ...b.data.votes };
  for (const m of b.data.markers) if (votes[m.from] != null) votes[m.to] = votes[m.from];
  for (const [pid, opt] of Object.entries(votes)) {
    if (t[opt] == null) continue;
    t[opt] += b.data.weights[pid] ?? 1;
  }
  return { t, votes };
}

function resolve(g, b, def, choice, extra = {}) {
  const c = g.ctx();
  const { t, votes } = tally(g, b);
  b.data.choice = choice;
  b.data.stage = 'done';
  def.resolve?.(c, { choice, tally: t, votes, ...extra });
  b.receipt = {
    kind: 'votes',
    votes: Object.entries(votes).map(([pid, opt]) => ({
      pid, name: g.name(pid), option: opt,
      label: b.data.options.find((o) => o.id === opt)?.label ?? opt,
      weight: b.data.weights[pid] ?? 1,
    })),
    choice, choiceLabel: b.data.options.find((o) => o.id === choice)?.label ?? choice,
  };
  g.toFallout();
}

function decide(g, b, def) {
  const { t } = tally(g, b);
  if (b.data.don) {
    const donVote = b.data.votes[b.data.don];
    if (donVote) {
      b.lines.push(`${g.name(b.data.don)} put the Don's Ring on the table. Nobody else's vote counted.`);
      return resolve(g, b, def, donVote, { don: b.data.don });
    }
  }
  const max = Math.max(0, ...Object.values(t));
  let top = Object.keys(t).filter((k) => t[k] === max);
  if (max === 0) top = b.data.options.map((o) => o.id);
  if (top.length === 1) return resolve(g, b, def, top[0]);

  // Nonna settles a tie for her favourite, once a week
  const cousin = g.s.players.find((p) => p.job === 'cousin' && !p.used.cousin && voters(g, b).includes(p.id)
    && top.includes(b.data.votes[p.id]));
  if (cousin && (cousin.bot || b.data.cousinAsk === true)) {
    cousin.used.cousin = true;
    b.lines.push(`Tied. Nonna looks at ${cousin.name}, and that's the end of it.`);
    return resolve(g, b, def, b.data.votes[cousin.id], { tie: true, nonna: cousin.id });
  }

  b.data.tied = top;
  b.data.tieFaces = tieFaces(b.data.options, top);
  b.data.stage = 'tie';
  b.stage = 'tie';
  rollTie(g, b);
}

function rollTie(g, b) {
  const labels = b.data.tieFaces.map((f) => `${f.faces.join('/')}: ${b.data.options.find((o) => o.id === f.id)?.label ?? f.id}`).join(' · ');
  g.openRoll({ dice: 1, target: null, label: `Tie. The die decides — ${labels}`, clampFace: true, noMuscle: true, then: 'tie', faces: b.data.tieFaces });
}

/** The Fixer: once a week, after the votes are shown, move one of them. */
function canFix(g, b, p) {
  return !!p && p.job === 'fixer' && !p.used.fixer && !g.isAway(p) && voters(g, b).includes(p.id);
}

function fix(g, b, p, target, option) {
  p.used.fixer = true;
  const was = b.data.options.find((o) => o.id === b.data.votes[target])?.label ?? b.data.votes[target];
  b.data.votes[target] = option;
  b.data.fixed = { by: p.id, target, option };
  b.lines.push(`${p.name} fixed it: ${g.name(target)}’s vote moved from ${was} to ${b.data.options.find((o) => o.id === option)?.label ?? option}.`);
  g.bond(p.id, target, 'fixed-vote');
}

/** A bot Fixer moves a vote when it would turn a loss into a win for its own pick. */
function botFixer(g, b) {
  for (const p of g.s.players) {
    if (!p.bot || !canFix(g, b, p)) continue;
    const mine = b.data.votes[p.id];
    if (mine == null) continue;
    const { t } = tally(g, b);
    const max = Math.max(...Object.values(t));
    if (t[mine] === max && Object.values(t).filter((v) => v === max).length === 1) continue;
    const leader = Object.keys(t).find((k) => t[k] === max && k !== mine);
    const victim = Object.keys(b.data.votes).find((id) => b.data.votes[id] === leader && id !== p.id && !(b.data.noSelf && mine === id));
    if (!victim || t[mine] + 1 < max - (b.data.weights[victim] ?? 1)) continue;
    if (g.rng() < 0.7) fix(g, b, p, victim, mine);
  }
}

export default {
  kicker: 'A VOTE',
  private: () => true,

  start(g, b, def) {
    const c = g.ctx();
    const who = (def.voters?.(c) ?? g.free().map((p) => p.id)).filter((id) => g.hasPlayer(id));
    let options;
    if (def.candidates) {
      options = def.candidates(c).map((id) => ({ id, label: g.name(id), player: true }));
    } else {
      options = (def.options(c) ?? []).map((o) => ({ ...o }));
    }
    options = assignFaces(options);
    const noSelf = !!(def.candidates || def.noSelf) && def.noSelf !== false;
    // nobody votes in a vote where the only name on the list is their own
    const able = noSelf ? who.filter((id) => options.some((o) => o.id !== id)) : who;
    b.data = {
      voters: able, options, angles: def.angles?.(c) ?? {}, votes: {}, weights: {}, markers: [],
      don: null, stage: 'vote', choice: null, tied: null, tieFaces: null, rerolls: 0, reveal: [],
      noSelf,
    };
    b.stage = 'vote';
    g.clockFor('vote');
  },

  pending(g, b) {
    if (b.stage === 'vote') return voters(g, b).filter((id) => b.data.votes[id] == null);
    if (b.stage === 'reveal') return b.data.reveal.filter((id) => !b.data.revealPassed?.includes(id));
    return [];
  },

  act(g, b, def, pid, a) {
    if (a.t === 'vote') {
      if (b.stage !== 'vote') return { error: 'The vote is closed.' };
      if (!voters(g, b).includes(pid)) return { error: 'You don’t have a vote in this.' };
      if (b.data.votes[pid] != null) return { error: 'You already voted.' };
      const opt = b.data.options.find((o) => o.id === a.option);
      if (!opt) return { error: 'That isn’t one of the options.' };
      if (b.data.noSelf && opt.id === pid) return { error: 'Not yourself.' };
      b.data.votes[pid] = opt.id;
      if (a.grudge && opt.player) {
        const p = g.getPlayer(pid);
        if ((p.grudges[opt.id] ?? 0) > 0) {
          p.grudges[opt.id] -= 1;
          b.data.weights[pid] = (b.data.weights[pid] ?? 1) + 1;
          b.data.grudgeVotes = [...(b.data.grudgeVotes ?? []), pid];
        }
      }
      if (a.cousin) b.data.cousinAsk = true;
      return { ok: true };
    }
    if (a.t === 'fix') {
      const p = g.getPlayer(pid);
      if (b.stage !== 'reveal') return { error: 'Only once the votes are shown.' };
      if (!canFix(g, b, p)) return { error: 'Not yours to fix.' };
      const target = String(a.target ?? '');
      if (b.data.votes[target] == null) return { error: 'Move whose vote?' };
      const opt = b.data.options.find((o) => o.id === a.option);
      if (!opt || (b.data.noSelf && opt.id === target)) return { error: 'Move it to what?' };
      fix(g, b, p, target, opt.id);
      return { ok: true };
    }
    if (a.t === 'reveal-pass') {
      if (b.stage !== 'reveal') return { error: 'Not now.' };
      b.data.revealPassed = [...(b.data.revealPassed ?? []), pid];
      return { ok: true };
    }
    return { error: 'Not in a vote.' };
  },

  step(g, b, def) {
    if (b.stage === 'vote') {
      // the votes are in: show them, then give anybody holding a Flip-Flop or
      // a Filibuster a moment to use it
      botFixer(g, b);
      const holders = g.s.players.filter((p) => !p.bot && voters(g, b).includes(p.id)
        && (p.cards.some((c) => ['flip-flop', 'filibuster'].includes(c.id)) || canFix(g, b, p))).map((p) => p.id);
      b.data.reveal = holders;
      b.data.revealPassed = [];
      b.stage = 'reveal';
      if (holders.length) { g.clockFor('window', true); return; }
    }
    if (b.stage === 'reveal') return decide(g, b, def);
  },

  timeout(g, b, def) {
    if (b.stage === 'vote') {
      // whoever didn't vote in time abstains
      b.data.voters = b.data.voters.filter((id) => b.data.votes[id] != null);
      b.stage = 'reveal';
      b.data.reveal = [];
      return decide(g, b, def);
    }
    if (b.stage === 'reveal') return decide(g, b, def);
  },

  afterRoll(g, b, def, roll, then) {
    if (then !== 'tie') return;
    const face = roll.face;
    const hit = b.data.tieFaces.find((f) => f.faces.includes(face));
    if (!hit) {
      b.data.rerolls += 1;
      if (b.data.rerolls > 4) return resolve(g, b, def, g.rng.pick(b.data.tied), { tie: true, die: face });
      b.lines.push(`The die shows ${face}, which belongs to nobody. Again.`);
      return rollTie(g, b);
    }
    const label = b.data.options.find((o) => o.id === hit.id)?.label ?? hit.id;
    b.lines.unshift(`Tied. The die came up ${face}: ${label}.`);
    return resolve(g, b, def, hit.id, { tie: true, die: face });
  },

  bot(g, b, def, p) {
    if (b.stage === 'reveal') return { t: 'reveal-pass' };
    const c = g.ctx();
    const choices = b.data.options.filter((o) => !(b.data.noSelf && o.id === p.id));
    if (!choices.length) return null;
    if (def.bot) {
      const pick = def.bot(c, p, choices);
      if (pick) return { t: 'vote', option: pick };
    }
    const angle = b.data.angles[p.id];
    const tr = traits(p);
    if (angle?.option && g.rng() < 0.55 + tr.greed * 0.4) return { t: 'vote', option: angle.option };
    if (choices.some((o) => o.player)) {
      const friend = friendOf(g, p);
      const pool = choices.filter((o) => o.id !== friend);
      const target = pool.reduce((best, o) => {
        const s = suspicion(g, p, g.getPlayer(o.id));
        return !best || s > best.s ? { id: o.id, s } : best;
      }, null);
      const enemy = enemyOf(g, p);
      return { t: 'vote', option: enemy && pool.some((o) => o.id === enemy) && g.rng() < tr.spite ? enemy : target?.id ?? g.rng.pick(choices).id, grudge: enemy != null };
    }
    const pick = weighted(g.rng, choices, (o) => {
      const risk = o.risk ?? 0.5;
      const reward = o.reward ?? 0.5;
      return 0.2 + reward * tr.greed + (1 - risk) * (1 - tr.nerve) + risk * tr.nerve * 0.6;
    });
    return { t: 'vote', option: pick.id };
  },

  fallback(g, b, def, p) {
    const opt = b.data.options.find((o) => !(b.data.noSelf && o.id === p.id));
    return { t: 'vote', option: opt?.id };
  },

  view(g, b, def, pid) {
    const shown = b.stage !== 'vote';
    const { t, votes } = tally(g, b);
    const me = pid ? g.getPlayer(pid) : null;
    return {
      options: b.data.options.map((o) => ({
        id: o.id, label: o.label, blurb: o.blurb ?? null, details: o.details ?? null, faces: o.faces,
        player: !!o.player, tally: shown ? t[o.id] : null,
      })),
      angle: pid ? b.data.angles[pid] ?? null : null,
      myVote: pid ? b.data.votes[pid] ?? null : null,
      canVote: !!(pid && b.stage === 'vote' && voters(g, b).includes(pid) && b.data.votes[pid] == null),
      voted: voters(g, b).filter((id) => b.data.votes[id] != null).map((id) => g.name(id)),
      votes: shown ? Object.entries(votes).map(([id, o]) => ({ name: g.name(id), option: o, weight: b.data.weights[id] ?? 1 })) : null,
      tied: b.data.tied, tieFaces: b.data.tieFaces,
      reveal: b.stage === 'reveal' && pid ? b.data.reveal.includes(pid) && !b.data.revealPassed?.includes(pid) : false,
      canFix: b.stage === 'reveal' && me ? canFix(g, b, me) : false,
      grudgeTargets: me && b.stage === 'vote' ? Object.keys(me.grudges).filter((id) => me.grudges[id] > 0 && b.data.options.some((o) => o.id === id)) : [],
      noSelf: b.data.noSelf,
      cousin: me?.job === 'cousin' && !me.used.cousin,
    };
  },
};

export { assignFaces };
