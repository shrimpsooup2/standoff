import { PAIR_SCENARIOS } from './scenarios.pair.js';
import { TABLE_SCENARIOS, TRIO_SCENARIOS } from './scenarios.table.js';
import { CALLBACK_SCENARIOS, CALLBACKS_BY_KIND } from './scenarios.callback.js';
import { ACTION_PAIR, ACTION_TABLE, ACTION_TRIO } from './scenarios.action.js';
import { rollDetails, fill, fillDeep } from './lexicon.js';
import { traitsOf, isCooperative, isBetrayal } from './options.js';

export { PAIR_SCENARIOS, TABLE_SCENARIOS, TRIO_SCENARIOS, CALLBACK_SCENARIOS };
export { ACTION_PAIR, ACTION_TABLE, ACTION_TRIO };

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
    actionPair: rng.shuffle(ACTION_PAIR.map((s) => s.id)),
    actionTrio: rng.shuffle(ACTION_TRIO.map((s) => s.id)),
    actionTable: rng.shuffle(ACTION_TABLE.map((s) => s.id)),
  };
}

const ACTION_POOLS = { pair: ACTION_PAIR, trio: ACTION_TRIO, table: ACTION_TABLE };
const ACTION_KEYS = { pair: 'actionPair', trio: 'actionTrio', table: 'actionTable' };

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
export function makeJob(rng, { kind, members, deck, final = false, callback = null, action = false, scenario = null }) {
  // A scenario handed in directly is a scripted job: the tutorial uses this so
  // it teaches the same thing every time instead of hoping the deck cooperates.
  let base = scenario ?? null;
  let ordered = members;

  if (base) { /* scripted */ }
  else if (action && !callback) {
    // The loud ones: same dilemma, no chairs.
    base = drawFrom(deck, ACTION_KEYS[kind] ?? 'actionPair', ACTION_POOLS[kind] ?? ACTION_PAIR, rng);
  } else if (callback) {
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
  }
  if (!base) {
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
    tone: base.tone ?? 'standard',
    callback: callback ? { kind: callback.kind, lastJob: callback.lastJob, lastRound: callback.lastRound } : null,
    title: fill(base.title, ctx),
    caseNo: `${rng.int(60, 99)}-${String(rng.int(100, 999))}-${'ABCDEFGHJKLMNPRSTVWXYZ'[rng.int(0, 21)]}`,
    setup: fillDeep(base.setup, ctx),
    pressure: fill(base.pressure, ctx),
    stand: fillDeep(base.stand, ctx),
    fold: fillDeep(base.fold, ctx),
    outcomes: base.outcomes,
    closers: base.closers ?? {},
    options: buildOptions(base, ctx),
    coda: rng.pick(CODAS),
    ctx,
  };
}


/**
 * Every job offers the moves that are actually available in that room. The
 * first is always the loyal one and the last is always the worst one; what sits
 * between them is the scenario's business, and some jobs have nothing between
 * them at all.
 */
function buildOptions(base, ctx) {
  const did = base.did ?? {};
  const first = {
    id: 'hold',
    archetype: 'hold',
    label: fill(base.stand.label, ctx),
    blurb: fill(base.stand.blurb, ctx),
    did: fill(did.stand ?? 'held the line', ctx),
  };
  const last = {
    id: 'fold',
    archetype: 'fold',
    label: fill(base.fold.label, ctx),
    blurb: fill(base.fold.blurb, ctx),
    did: fill(did.fold ?? 'took the deal', ctx),
  };
  const middle = (base.extra ?? []).map((o, i) => ({
    id: o.id ?? `mid${i}`,
    archetype: o.archetype,
    label: fill(o.label, ctx),
    blurb: fill(o.blurb, ctx),
    did: fill(o.did, ctx),
  }));
  return [first, ...middle, last];
}

/** Which of the written closers this mix of moves calls for. */
export function outcomeShape(options) {
  const coop = options.filter((o) => isCooperative(o)).length;
  const bad = options.filter((o) => isBetrayal(o)).length;
  const middle = options.length - coop - bad;
  if (coop === options.length) return 'clean';
  if (bad === options.length) return 'ruin';
  if (middle === 0) return 'betrayed';
  if (coop === 0 && bad === 0) return 'hedged';
  return 'murky';
}

function listNames(names) {
  if (names.length === 0) return 'nobody';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * Turn a resolved group into prose.
 *
 * `picks` maps player id -> option id. The reckoning reads back what each
 * person actually did, in their own job's words, and then closes with a written
 * line chosen by the shape of the room.
 */
export function narrate(job, members, picks) {
  const byId = Object.fromEntries(job.options.map((o) => [o.id, o]));
  const chosen = members.map((m) => ({ member: m, option: byId[picks[m.id]] ?? job.options[0] }));

  const coop = chosen.filter((c) => isCooperative(c.option));
  const bad = chosen.filter((c) => isBetrayal(c.option));
  const middle = chosen.filter((c) => !isCooperative(c.option) && !isBetrayal(c.option));

  const ctx = {
    ...job.ctx,
    // a job written for two can end up in front of three, and the line it falls
    // back to may still want to name somebody
    traitor: bad[0]?.member.name ?? coop[0]?.member.name ?? 'somebody',
    victim: coop[0]?.member.name ?? middle[0]?.member.name ?? 'somebody',
    standCount: coop.length,
    foldCount: bad.length,
    middleCount: middle.length,
    standerNames: listNames(coop.map((c) => c.member.name)),
    folderNames: listNames(bad.map((c) => c.member.name)),
    middleNames: listNames(middle.map((c) => c.member.name)),
  };

  const shape = outcomeShape(chosen.map((c) => c.option));
  const pair = job.kind === 'pair' && members.length === 2;

  // The written closers. The pure outcomes keep the paragraph the job was
  // written with; anything murkier gets the line written for murky.
  // A job written for a table can end up in front of two people, and a job
  // written for two can end up with a third in the room. Either way there is
  // always a line to print.
  const o = job.outcomes;
  let closer;
  if (shape === 'clean') closer = (pair ? o.bothStand : o.allStand) ?? o.allStand ?? o.bothStand;
  else if (shape === 'ruin') closer = (pair ? o.bothFold : o.allFold) ?? o.allFold ?? o.bothFold;
  else if (shape === 'betrayed') {
    closer = (pair ? o.betray : o.mixed) ?? o.mixed ?? o.betray;
  } else {
    closer = job.closers?.[shape] ?? job.closers?.murky
      ?? (pair ? o.bothFold : o.mixed) ?? o.mixed ?? o.bothFold;
  }
  if (typeof closer !== 'string') closer = o.mixed ?? o.allFold ?? o.bothFold ?? '';

  // The pure outcomes were written as whole paragraphs and already say who did
  // what, so they stand on their own. A murkier room needs the moves read back
  // first, because the closing line cannot know which of them were taken.
  const written = fill(closer, ctx);
  if (shape === 'clean' || shape === 'ruin' || shape === 'betrayed') return written;
  const recap = chosen.map((c) => `${c.member.name} ${fill(c.option.did, ctx)}.`).join(' ');
  return `${recap}\n\n${written}`;
}
