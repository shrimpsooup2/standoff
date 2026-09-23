// One person talks. Everybody else knows something.
//
// The Talker has to pick what to say, and the facts that decide it are
// spread across everybody else's phones, one each. They pass a note — as
// written, turned around, or not at all — and the Talker decides whom to
// believe. When it's over, every clue is shown next to every note. A lie is
// caught unless it was forged; one card in six is simply wrong, and the game
// says so, so an honest mistake is never mistaken for a lie and a lie can
// never hide behind one.

import { traits, enemyOf } from '../bots.js';

function listeners(g, b) {
  return b.data.clues.map((c) => c.holder).filter((id) => {
    const p = g.getPlayer(id);
    return p && !g.isAway(p) && !g.isBenched(p);
  });
}

function noteText(clue, note) {
  if (!note || note.mode === 'keep') return null;
  return note.mode === 'flip' ? clue.other : clue.seen;
}

/** Forgery: turn your note around, and have it read as bad intel afterwards. */
export function forge(g, b, pid) {
  const clue = b.data.clues.find((c) => c.holder === pid);
  if (!clue || b.stage !== 'notes' || b.data.notes[pid]) return { error: 'Only while you still hold your note.' };
  if (!clue.other) return { error: 'There is nothing on this card worth forging.' };
  b.data.notes[pid] = { mode: 'flip', forged: true };
  return { ok: true };
}

function resolve(g, b, def) {
  const c = g.ctx();
  const d = b.data;
  const success = d.pick === d.correct;
  b.stage = 'resolving';
  const talker = g.getPlayer(d.talker);
  const label = d.openings.find((o) => o.id === d.pick)?.label ?? d.pick;
  def.resolve?.(c, { success, opening: d.pick, openingLabel: label, talker: d.talker });

  // the receipts
  const rows = [];
  for (const clue of d.clues) {
    const note = d.notes[clue.holder] ?? { mode: 'keep' };
    const passed = noteText(clue, note);
    const lied = note.mode === 'flip' && !note.forged && !clue.filler;
    const fabricated = note.mode === 'flip' && !note.forged && clue.filler;
    const row = {
      name: g.name(clue.holder), about: d.openings.find((o) => o.id === clue.about)?.label ?? null,
      card: clue.seen, passed, kept: note.mode === 'keep',
      bad: clue.bad || !!note.forged, lied: lied || fabricated, filler: !!clue.filler,
    };
    rows.push(row);
    if (lied || fabricated) {
      const liar = g.getPlayer(clue.holder);
      liar.stats.lies += 1;
      liar.stats.doctored += 1;
      c.stamp(liar.id, 'LIAR');
      c.grudge(d.talker, liar.id, 'fed you a bad clue');
      c.betray(liar.id, d.talker, 'a doctored note');
      if (clue.bad && lied) b.lines.push(`${liar.name} tried to lie to ${talker.name} — and because their card was wrong to begin with, told the truth by accident. It still counts.`);
      else b.lines.push(`${liar.name}'s card said one thing. ${liar.name} told ${talker.name} another.`);
    } else if (clue.bad && note.mode === 'pass') {
      b.lines.push(`${g.name(clue.holder)}'s card was bad intel. Nobody's fault.`);
    } else if (note.forged) {
      b.lines.push(`${g.name(clue.holder)}'s card was bad intel. Nobody's fault, apparently.`);
    }
  }
  if (d.talkerClue) rows.push({ name: `${talker.name} (their own)`, card: d.talkerClue.seen, passed: d.talkerClue.seen, own: true, bad: d.talkerClue.bad });
  b.receipt = { kind: 'whispers', talker: talker.name, pick: label, correct: d.openings.find((o) => o.id === d.correct)?.label, success, rows };
  if (g.s.beat === b && !b.window) g.toFallout();
}

/** How a Talker who can't see through lies would read the notes. */
function readNotes(d, notes, own) {
  const score = {};
  for (const o of d.full) score[o.id] = 0;
  const read = (text, weight) => {
    if (!text) return;
    for (const o of d.full) {
      if (text === o.yes) score[o.id] += 2 * weight;
      if (text === o.no) score[o.id] -= 2 * weight;
    }
  };
  for (const n of notes) read(n.text, 1);
  if (own) read(own, 1.5);
  return score;
}

export default {
  kicker: 'ONE OF YOU TALKS',
  private: () => true,

  start(g, b, def) {
    const c = g.ctx();
    const rng = g.rng;
    const pool = (def.who?.(c) ?? g.free().map((p) => p.id)).filter((id) => g.hasPlayer(id));
    const preferred = def.talker?.(c) ?? c.freeByJob('talker')?.id;
    const talker = pool.includes(preferred) ? preferred : rng.pick(pool);
    const openings = def.openings(c);
    const correct = def.correct?.(c) ?? rng.pick(openings).id;
    let clues = rng.shuffle(openings.map((o) => {
      const truth = o.id === correct;
      return { about: o.id, truth, real: truth ? o.yes : o.no, other: truth ? o.no : o.yes };
    }));
    // one card in six is simply wrong
    const badIndex = rng.chance(def.badIntel ?? 1 / 6) ? rng.int(0, clues.length - 1) : -1;
    clues = clues.map((cl, i) => (i === badIndex ? { ...cl, bad: true, seen: cl.other, other: cl.real } : { ...cl, bad: false, seen: cl.real }));

    const listening = rng.shuffle(pool.filter((id) => id !== talker));
    const filler = rng.shuffle(def.filler?.(c) ?? []);
    const assigned = [];
    listening.forEach((id, i) => {
      if (i < clues.length) assigned.push({ ...clues[i], holder: id });
      else {
        const lieAbout = rng.pick(openings.filter((o) => o.id !== correct)) ?? openings[0];
        assigned.push({ holder: id, filler: true, about: null, seen: filler[(i - clues.length) % Math.max(1, filler.length)] ?? 'You know nothing useful about this, and you know it.', other: lieAbout.yes, bad: false });
      }
    });
    const spare = clues.slice(listening.length);
    const tp = g.getPlayer(talker);
    const talkerClue = tp?.job === 'talker' && spare.length ? spare[0] : null;

    b.data = {
      talker, correct, openings: openings.map((o) => ({ id: o.id, label: o.label, blurb: o.blurb ?? null })),
      full: openings.map((o) => ({ id: o.id, yes: o.yes, no: o.no })),
      clues: assigned, notes: {}, pick: null, talkerClue,
      who: typeof def.whoLabel === 'function' ? def.whoLabel(c) : def.whoLabel ?? null,
    };
    b.stage = assigned.length ? 'notes' : 'open';
    g.clockFor(b.stage === 'notes' ? 'notes' : 'open');
  },

  pending(g, b) {
    if (b.stage === 'notes') return listeners(g, b).filter((id) => !b.data.notes[id]);
    if (b.stage === 'open') {
      const t = g.getPlayer(b.data.talker);
      return t && !g.isAway(t) && !b.data.pick ? [t.id] : [];
    }
    return [];
  },

  act(g, b, def, pid, a) {
    if (a.t === 'note') {
      if (b.stage !== 'notes') return { error: 'The notes have been passed.' };
      const clue = b.data.clues.find((c) => c.holder === pid);
      if (!clue) return { error: 'You aren’t holding anything.' };
      if (b.data.notes[pid]) return { error: 'You’ve passed yours.' };
      if (!['pass', 'flip', 'keep'].includes(a.mode)) return { error: 'Pass it, change it, or keep it.' };
      if (a.mode === 'flip' && !clue.other) return { error: 'Nothing to change it to.' };
      b.data.notes[pid] = { mode: a.mode };
      return { ok: true };
    }
    if (a.t === 'open') {
      if (b.stage !== 'open') return { error: 'Not yet — wait for the notes.' };
      if (pid !== b.data.talker) return { error: `${g.name(b.data.talker)} is doing the talking.` };
      if (!b.data.openings.some((o) => o.id === a.opening)) return { error: 'Pick one of the openings.' };
      b.data.pick = a.opening;
      return { ok: true };
    }
    return { error: 'Not now.' };
  },

  step(g, b, def) {
    if (b.stage === 'notes') { b.stage = 'open'; g.clockFor('open'); return; }
    if (b.stage === 'open' && b.data.pick) return resolve(g, b, def);
    if (b.stage === 'open' && g.isAway(g.getPlayer(b.data.talker))) {
      b.data.pick = g.rng.pick(b.data.openings).id;
      return resolve(g, b, def);
    }
  },

  timeout(g, b, def) {
    if (b.stage === 'notes') {
      for (const id of listeners(g, b)) if (!b.data.notes[id]) b.data.notes[id] = { mode: 'keep', timedOut: true };
    } else if (b.stage === 'open' && !b.data.pick) {
      const d = b.data;
      const notes = listeners(g, b).map((id) => ({ text: noteText(d.clues.find((c) => c.holder === id), d.notes[id]) }));
      const score = readNotes(d, notes, d.talkerClue?.seen);
      const best = Math.max(...Object.values(score));
      d.pick = g.rng.pick(Object.keys(score).filter((k) => score[k] === best));
    }
  },

  bot(g, b, def, p) {
    const d = b.data;
    if (b.stage === 'notes') {
      const clue = d.clues.find((c) => c.holder === p.id);
      const tr = traits(p);
      const enemy = enemyOf(g, p);
      let lie = (1 - tr.honesty) * 0.45;
      if (enemy === d.talker) lie += tr.spite * 0.6;
      if (p.secret?.id === 'rat') lie += 0.25;
      if (p.secret?.id === 'snake' && p.secret.target === d.talker) lie += 0.4;
      if (clue?.filler) lie *= 0.5;
      if (clue?.other && g.rng() < Math.min(0.9, lie)) return { t: 'note', mode: 'flip' };
      if (p.style === 'nervous' && g.rng() < 0.12) return { t: 'note', mode: 'keep' };
      return { t: 'note', mode: 'pass' };
    }
    if (b.stage === 'open') {
      const notes = listeners(g, b).map((id) => {
        const text = noteText(d.clues.find((c) => c.holder === id), d.notes[id]);
        // a bot believes people it doesn't have a grudge against
        const doubt = (p.grudges[id] ?? 0) > 0 || g.getPlayer(id)?.stamps.includes('LIAR');
        return { text: doubt ? null : text };
      });
      const score = readNotes(d, notes, d.talkerClue?.seen);
      const best = Math.max(...Object.values(score));
      return { t: 'open', opening: g.rng.pick(Object.keys(score).filter((k) => score[k] === best)) };
    }
    return null;
  },

  fallback(g, b) {
    if (b.stage === 'notes') return { t: 'note', mode: 'pass' };
    return { t: 'open', opening: b.data.openings[0].id };
  },

  view(g, b, def, pid) {
    const d = b.data;
    const mine = pid ? d.clues.find((c) => c.holder === pid) : null;
    const isTalker = pid === d.talker;
    const out = {
      talker: g.name(d.talker), talkerId: d.talker, openings: d.openings, who: d.who,
      passed: listeners(g, b).filter((id) => d.notes[id]).map((id) => g.name(id)),
      holding: listeners(g, b).filter((id) => !d.notes[id]).map((id) => g.name(id)),
      pick: b.stage === 'fallout' ? d.pick : null,
    };
    if (mine) {
      out.myClue = { text: mine.seen, other: mine.other, filler: !!mine.filler };
      out.myNote = d.notes[pid] ? { mode: d.notes[pid].mode, forged: !!d.notes[pid].forged } : null;
      out.canNote = b.stage === 'notes' && !d.notes[pid];
    }
    if (isTalker) {
      out.youTalk = true;
      out.ownClue = d.talkerClue ? { text: d.talkerClue.seen } : null;
      out.canOpen = b.stage === 'open' && !d.pick;
      if (b.stage !== 'notes') {
        out.notes = d.clues.filter((c) => !g.isAway(g.getPlayer(c.holder))).map((c) => ({ from: g.name(c.holder), text: noteText(c, d.notes[c.holder]) }));
      }
    }
    return out;
  },
};
