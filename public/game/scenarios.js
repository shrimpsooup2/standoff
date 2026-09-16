import { PAIR_SCENARIOS } from './scenarios.pair.js';
import { TABLE_SCENARIOS, TRIO_SCENARIOS } from './scenarios.table.js';
import { CALLBACK_SCENARIOS, CALLBACKS_BY_KIND } from './scenarios.callback.js';
import { rollDetails, fill, fillDeep } from './lexicon.js';

export { PAIR_SCENARIOS, TABLE_SCENARIOS, TRIO_SCENARIOS, CALLBACK_SCENARIOS };

const CODAS = [
  'Somebody will bring this up at a wedding.',
  'It will be funny in about four years.',
  'Nobody wrote any of this down. Everybody remembers all of it.',
  'This is the kind of thing that decides where people sit at dinner.',
  'It was never about the money. It was mostly about the money.',
  'The version told later will be kinder to whoever is telling it.',
  'Everybody at this table now knows something they did not know an hour ago.',
  'There is no round in which this is forgotten, only rounds in which it is not mentioned.',
];

/** Deck of scenario ids per room, so a night doesn't repeat itself. */
export function makeDeck(rng) {
  return {
    pair: rng.shuffle(PAIR_SCENARIOS.map((s) => s.id)),
    trio: rng.shuffle(TRIO_SCENARIOS.map((s) => s.id)),
    table: rng.shuffle(TABLE_SCENARIOS.filter((s) => !s.final).map((s) => s.id)),
  };
}

function drawFrom(deck, key, all, rng, { final = false } = {}) {
  if (final) {
    const f = all.find((s) => s.final);
    if (f) return f;
  }
  if (!deck[key] || deck[key].length === 0) {
    deck[key] = rng.shuffle(all.filter((s) => !s.final).map((s) => s.id));
  }
  const id = deck[key].pop();
  return all.find((s) => s.id === id) ?? all[0];
}

/**
 * Build one playable job for a group of players.
 * `members` are `{ id, name }`, in seating order.
 */
export function makeJob(rng, { kind, members, deck, final = false, callback = null }) {
  let base;
  let ordered = members;

  if (callback) {
    // A job built out of what these two actually did to each other.
    const pool = (CALLBACKS_BY_KIND[callback.kind] ?? []).filter(
      (s) => !(deck.callbackUsed ?? []).includes(s.id),
    );
    const choices = pool.length ? pool : CALLBACKS_BY_KIND[callback.kind] ?? CALLBACK_SCENARIOS;
    base = rng.pick(choices);
    (deck.callbackUsed ??= []).push(base.id);
    // {A} is the one with something to answer for
    if (callback.subjectId) {
      const subject = members.find((m) => m.id === callback.subjectId);
      const rest = members.filter((m) => m.id !== callback.subjectId);
      if (subject) ordered = [subject, ...rest];
    }
  } else {
    base =
      kind === 'pair'
        ? drawFrom(deck, 'pair', PAIR_SCENARIOS, rng)
        : kind === 'trio'
          ? drawFrom(deck, 'trio', TRIO_SCENARIOS, rng)
          : drawFrom(deck, 'table', TABLE_SCENARIOS, rng, { final });
  }

  const details = rollDetails(rng);
  const names = ordered.map((m) => m.name);
  const ctx = {
    ...details,
    n: members.length,
    A: names[0] ?? 'Somebody',
    B: names[1] ?? 'Somebody Else',
    C: names[2] ?? 'The Third One',
    lastJob: callback?.lastJob ?? 'the last one',
    lastRound: callback?.lastRound ?? 1,
  };

  return {
    scenarioId: base.id,
    kind,
    callback: callback ? { kind: callback.kind, lastJob: callback.lastJob, lastRound: callback.lastRound } : null,
    title: fill(base.title, ctx),
    caseNo: `${rng.int(60, 99)}-${String(rng.int(100, 999))}-${'ABCDEFGHJKLMNPRSTVWXYZ'[rng.int(0, 21)]}`,
    setup: fillDeep(base.setup, ctx),
    pressure: fill(base.pressure, ctx),
    stand: fillDeep(base.stand, ctx),
    fold: fillDeep(base.fold, ctx),
    outcomes: base.outcomes,
    coda: rng.pick(CODAS),
    ctx,
  };
}

function listNames(names) {
  if (names.length === 0) return 'nobody';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * Turn a resolved group into prose. `choices` maps player id -> 'stand'|'fold'.
 */
export function narrate(job, members, choices) {
  const standers = members.filter((m) => choices[m.id] === 'stand');
  const folders = members.filter((m) => choices[m.id] !== 'stand');
  const ctx = {
    ...job.ctx,
    standCount: standers.length,
    foldCount: folders.length,
    standerNames: listNames(standers.map((m) => m.name)),
    folderNames: listNames(folders.map((m) => m.name)),
  };

  if (job.kind === 'pair') {
    if (folders.length === 0) return fill(job.outcomes.bothStand, ctx);
    if (standers.length === 0) return fill(job.outcomes.bothFold, ctx);
    return fill(job.outcomes.betray, {
      ...ctx,
      traitor: folders[0].name,
      victim: standers[0].name,
    });
  }

  if (folders.length === 0) return fill(job.outcomes.allStand, ctx);
  if (standers.length === 0) return fill(job.outcomes.allFold, ctx);
  return fill(job.outcomes.mixed, ctx);
}
