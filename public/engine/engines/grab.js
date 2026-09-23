// Push your luck.
//
// The crew is inside and the money's in reach. Every round, everyone still
// inside secretly chooses to grab or go. The round's money is split between
// the grabbers. Then the alarm die: every round it gets twitchier, and when it
// trips, everybody still inside loses what they grabbed and takes the heat.
//
// The Driver sits in the car and decides when it leaves. If it leaves with
// people still inside, they walk home, and walking home is how people get
// seen. If the alarm trips with the car still outside, the car gets seen.
// The Lookout sees each alarm die before anybody decides.

import { round5k, money, listNames } from '../util.js';
import { traits } from '../bots.js';

const SHARES = [0.14, 0.18, 0.2, 0.22, 0.26];

function inside(g, b) {
  return b.data.active.filter((id) => {
    const p = g.getPlayer(id);
    return p && !g.isAway(p);
  });
}

function level(b) {
  return b.data.base + (b.data.round - 1) + b.data.bump;
}

function describe(lvl) {
  if (lvl <= 0) return 'The alarm is asleep.';
  if (lvl === 1) return 'The alarm trips on a 1.';
  if (lvl >= 6) return 'The alarm trips on anything.';
  return `The alarm trips on ${lvl} or lower.`;
}

function newRound(g, b) {
  const d = b.data;
  d.moves = {};
  d.getaway = [];
  d.wires = false;
  d.next = g.preroll();
  b.stage = 'move';
  g.clockFor('move');
}

function exit(g, b, ids, how) {
  const c = g.ctx();
  const d = b.data;
  for (const id of ids) {
    d.active = d.active.filter((x) => x !== id);
    const walked = d.driverLeft && d.driver;
    d.out.push({ id, withCar: !walked, round: d.round });
    if (walked && how !== 'getaway') {
      // the car's gone: two dice to get home unseen
      const r = g.rng.int(1, 6) + g.rng.int(1, 6);
      if (r < 7) {
        c.heat(id, 1, 'walking home from a job with pockets full');
        b.lines.push(`${g.name(id)} walked home and was seen doing it.`);
      }
    }
  }
}

function finish(g, b, def) {
  const c = g.ctx();
  const d = b.data;
  // everyone still inside at the end comes out with what they have
  if (d.active.length) exit(g, b, d.active.slice(), 'end');
  const hauls = {};
  let driverCut = 0;
  for (const o of d.out) {
    const gross = d.hauls[o.id] ?? 0;
    if (!gross) continue;
    const cut = d.driver && o.withCar ? round5k(gross * 0.1) : 0;
    driverCut += cut;
    hauls[o.id] = gross - cut;
  }
  if (d.driver && driverCut) hauls[d.driver] = (hauls[d.driver] ?? 0) + driverCut;
  for (const [id, n] of Object.entries(hauls)) {
    c.give(id, n, 'the job');
    g.getPlayer(id).stats.grabbed += n;
  }
  b.stage = 'resolving';
  def.resolve?.(c, { hauls, caught: d.caught, out: d.out.map((o) => o.id), driver: d.driver, driverLeft: d.driverLeft, driverCut, log: d.log, tripped: d.tripped });
  b.receipt = {
    kind: 'grab',
    rounds: d.log.map((r) => ({
      round: r.round, grabbed: r.grabbers.map((id) => g.name(id)), went: r.went.map((id) => g.name(id)),
      each: r.each, die: r.die, level: r.level, tripped: r.tripped, skipped: r.skipped,
    })),
    hauls: Object.entries(hauls).map(([id, n]) => ({ name: g.name(id), n })),
    caught: d.caught.map((id) => g.name(id)),
  };
  if (g.s.beat === b && !b.window) g.toFallout();
}

export default {
  kicker: 'HOW GREEDY ARE YOU?',
  private: () => true,

  start(g, b, def) {
    const c = g.ctx();
    const pool = (def.who?.(c) ?? g.free().map((p) => p.id)).filter((id) => g.hasPlayer(id));
    const driverP = def.driver === false ? null : c.freeByJob('driver');
    const driver = driverP && pool.includes(driverP.id) && pool.length >= 2 ? driverP.id : null;
    const vault = Math.max(0, def.vault(c));
    const rounds = Math.max(1, Math.min(5, (typeof def.rounds === 'function' ? def.rounds(c) : def.rounds) ?? 5));
    const shares = SHARES.slice(0, rounds);
    const sum = shares.reduce((a, b) => a + b, 0);
    b.data = {
      vault, rounds, pots: shares.map((s) => round5k((vault * s) / sum)),
      base: def.alarm?.(c) ?? 0, bump: 0, round: 1,
      active: pool.filter((id) => id !== driver), out: [], caught: [], hauls: {},
      driver, driverLeft: false, moves: {}, getaway: [], wires: false, next: null,
      log: [], tripped: false, angle: def.angle?.(c) ?? null, angleUsed: false,
      lookout: c.freeByJob('lookout')?.id ?? null,
    };
    if (!b.data.active.length) return finish(g, b, def);
    newRound(g, b);
  },

  pending(g, b) {
    if (b.stage !== 'move') return [];
    return inside(g, b).filter((id) => !b.data.moves[id]);
  },

  act(g, b, def, pid, a) {
    const d = b.data;
    if (a.t === 'grab') {
      if (b.stage !== 'move') return { error: 'Hold on — the alarm.' };
      if (!inside(g, b).includes(pid)) return { error: 'You’re not inside.' };
      if (d.moves[pid]) return { error: 'You’ve made your move.' };
      if (!['grab', 'go'].includes(a.move)) return { error: 'Grab or go.' };
      d.moves[pid] = a.move;
      return { ok: true };
    }
    if (a.t === 'leave') {
      if (pid !== d.driver) return { error: 'You’re not the one with the keys.' };
      if (d.driverLeft) return { error: 'You’re already gone.' };
      if (!['move'].includes(b.stage)) return { error: 'Not this second.' };
      d.driverLeft = true;
      d.leftRound = d.round;
      b.lines.push(`${g.name(pid)} pulled away from the curb in round ${d.round}.`);
      return { ok: true };
    }
    if (a.t === 'angle') {
      const ang = d.angle;
      if (!ang || ang.pid !== pid) return { error: 'You have no angle here.' };
      if (d.angleUsed) return { error: 'You already worked it.' };
      if (b.stage !== 'move' || (ang.round && ang.round !== d.round)) return { error: 'Not now.' };
      if (!inside(g, b).includes(pid)) return { error: 'You have to be inside.' };
      d.angleUsed = true;
      d.hauls[pid] = (d.hauls[pid] ?? 0) + (ang.money ?? 0);
      d.bump += ang.alarm ?? 0;
      d.angleTook = ang.money ?? 0;
      const c = g.ctx();
      c.fact(pid, 'angle', ang.question ?? `Did ${g.name(pid)} take more than their cut tonight?`, true);
      g.s.night.memo.angleWorked = pid;
      return { ok: true };
    }
    return { error: 'Not now.' };
  },

  step(g, b, def) {
    const d = b.data;
    if (b.stage !== 'move') return;
    const here = inside(g, b);
    const goers = here.filter((id) => d.moves[id] === 'go');
    const grabbers = here.filter((id) => d.moves[id] === 'grab');
    const entry = { round: d.round, grabbers: grabbers.slice(), went: goers.slice(), each: 0, die: null, level: level(b), tripped: false, skipped: false };
    d.log.push(entry);
    if (goers.length) exit(g, b, goers, 'go');
    if (!grabbers.length) { d.active = d.active.filter((id) => !grabbers.includes(id)); return finish(g, b, def); }
    const pot = d.pots[d.round - 1] ?? 0;
    const each = Math.max(5000, round5k(pot / grabbers.length));
    entry.each = each;
    for (const id of grabbers) d.hauls[id] = (d.hauls[id] ?? 0) + each;
    // a Getaway Car gets you out before the alarm, with everything
    if (d.getaway.length) exit(g, b, d.getaway.filter((id) => grabbers.includes(id)), 'getaway');
    const stillIn = inside(g, b);
    if (!stillIn.length) return finish(g, b, def);
    if (d.wires) {
      entry.skipped = true;
      b.lines.push(`Round ${d.round}: somebody cut the wires. No alarm this time.`);
      return advance(g, b, def);
    }
    const lvl = level(b);
    b.stage = 'alarm';
    if (lvl <= 0) { entry.die = null; return advance(g, b, def); }
    g.openRoll({
      dice: 1, target: lvl + 1, label: `Round ${d.round}. ${describe(lvl)}`, clampFace: true, noMuscle: true,
      preset: [d.next], who: stillIn, then: 'alarm',
    });
  },

  afterRoll(g, b, def, roll, then) {
    const d = b.data;
    if (then !== 'alarm') return;
    const entry = d.log[d.log.length - 1];
    entry.die = roll.face;
    if (roll.success) return advance(g, b, def);
    // tripped
    const c = g.ctx();
    entry.tripped = true;
    d.tripped = true;
    const caught = inside(g, b);
    d.caught.push(...caught);
    for (const id of caught) {
      d.hauls[id] = 0;
      d.active = d.active.filter((x) => x !== id);
    }
    b.lines.push(`The alarm went on a ${roll.face}. ${listNames(caught.map((id) => g.name(id)))} ${caught.length === 1 ? 'was' : 'were'} still inside.`);
    for (const id of caught) c.heat(id, 2, 'caught inside when the alarm went');
    if (d.driver && !d.driverLeft) {
      c.heat(d.driver, 1, 'the car was still at the curb');
      b.lines.push(`${g.name(d.driver)} was still at the curb with the engine running. Somebody took the plate.`);
    }
    return finish(g, b, def);
  },

  timeout(g, b) {
    if (b.stage !== 'move') return;
    for (const id of inside(g, b)) if (!b.data.moves[id]) b.data.moves[id] = 'go';
  },

  bot(g, b, def, p) {
    const d = b.data;
    if (b.stage !== 'move') return null;
    const tr = traits(p);
    // work the angle if you have one and nerve for it
    if (d.angle?.pid === p.id && !d.angleUsed && (!d.angle.round || d.angle.round === d.round) && g.rng() < 0.4 + tr.greed * 0.5) {
      g.engine.act(g, b, def, p.id, { t: 'angle' });
    }
    const lvl = level(b);
    let risk = Math.max(0, Math.min(1, lvl / 6));
    if (p.id === d.lookout && d.next != null) risk = d.next <= lvl ? 0.95 : 0.02;
    const haul = d.hauls[p.id] ?? 0;
    const appetite = 0.18 + tr.nerve * 0.45 + tr.greed * 0.15 - Math.min(0.2, haul / (d.vault || 1));
    return { t: 'grab', move: risk <= appetite ? 'grab' : 'go' };
  },

  fallback: () => ({ t: 'grab', move: 'go' }),

  view(g, b, def, pid) {
    const d = b.data;
    const lvl = level(b);
    const me = pid ? g.getPlayer(pid) : null;
    const out = {
      round: d.round, rounds: d.rounds, pot: d.pots[d.round - 1] ?? 0, vault: d.vault,
      level: lvl, alarm: describe(lvl),
      inside: inside(g, b).map((id) => ({ name: g.name(id), moved: !!d.moves[id] })),
      out: d.out.map((o) => g.name(o.id)), caught: d.caught.map((id) => g.name(id)),
      driver: d.driver ? g.name(d.driver) : null, driverLeft: d.driverLeft,
      myHaul: pid ? d.hauls[pid] ?? 0 : 0,
      myMove: pid ? d.moves[pid] ?? null : null,
      amInside: pid ? inside(g, b).includes(pid) : false,
      amDriver: pid === d.driver,
      history: d.log.map((r) => ({ round: r.round, grabbed: r.grabbers.length, each: r.each, die: r.die, tripped: r.tripped, went: r.went.map((id) => g.name(id)) })),
    };
    if (pid && pid === d.lookout && b.stage === 'move' && d.next != null) out.peek = d.next;
    if (d.angle && d.angle.pid === pid && !d.angleUsed && (!d.angle.round || d.angle.round === d.round)) {
      out.angle = { label: d.angle.label, blurb: d.angle.blurb };
    }
    if (me && d.getaway.includes(pid)) out.getaway = true;
    return out;
  },
};

function advance(g, b, def) {
  const d = b.data;
  d.round += 1;
  if (d.round > d.rounds || !inside(g, b).length) return finish(g, b, def);
  newRound(g, b);
}

export { money };
