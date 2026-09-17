import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../public/game/rng.js';
import { makeDeck, makeJob, narrate, PAIR_SCENARIOS, TABLE_SCENARIOS, TRIO_SCENARIOS } from '../public/game/scenarios.js';
import { LEXICON } from '../public/game/lexicon.js';
import { ACTION_PAIR, ACTION_TABLE, ACTION_TRIO } from '../public/game/scenarios.action.js';
import { CALLBACK_SCENARIOS } from '../public/game/scenarios.callback.js';
import { ARCHETYPE_IDS } from '../public/game/options.js';

const members2 = [{ id: 'a', name: 'Andre' }, { id: 'b', name: 'Mo' }];
const members4 = [...members2, { id: 'c', name: 'Kit' }, { id: 'd', name: 'Reza' }];

/** Tables of every size the game supports, so nothing is only ever seen as a pair. */
const NAMES = ['Andre', 'Mo', 'Kit', 'Reza', 'Sal', 'Dina', 'Vito', 'Rosaria', 'Petey', 'Bracco'];
const tableOf = (n) => NAMES.slice(0, n).map((name, i) => ({ id: `p${i}`, name }));
const TABLE_SIZES = [3, 4, 5, 6, 7, 8, 9, 10];

function unresolved(text, allow = []) {
  const found = String(text).match(/\{(\w+)\}/g) ?? [];
  return found.filter((f) => !allow.includes(f));
}

test('every pair scenario renders with no leftover slots', () => {
  const rng = makeRng('fill');
  for (const s of PAIR_SCENARIOS) {
    const deck = { pair: [s.id], trio: [], table: [] };
    const job = makeJob(rng, { kind: 'pair', members: members2, deck });
    assert.equal(job.scenarioId, s.id);
    const prose = [job.title, ...job.setup, job.pressure].join('\n');
    assert.deepEqual(unresolved(prose), [], `${s.id} has unfilled slots`);
    // choice blurbs keep {them}: the server personalises those per viewer
    assert.deepEqual(unresolved(job.stand.blurb, ['{them}']), []);
    assert.deepEqual(unresolved(job.fold.blurb, ['{them}']), []);
    for (const combo of [['stand', 'stand'], ['fold', 'fold'], ['stand', 'fold'], ['fold', 'stand']]) {
      const text = narrate(job, members2, { a: combo[0], b: combo[1] });
      assert.deepEqual(unresolved(text), [], `${s.id} outcome ${combo.join('/')} has unfilled slots`);
      assert.ok(text.length > 40);
    }
  }
});

test('every table and trio scenario renders', () => {
  const rng = makeRng('fill2');
  for (const s of TABLE_SCENARIOS) {
    const deck = { pair: [], trio: [], table: [s.id] };
    const job = makeJob(rng, { kind: 'table', members: members4, deck, final: !!s.final });
    const prose = [job.title, ...job.setup, job.pressure].join('\n');
    assert.deepEqual(unresolved(prose), [], `${s.id} has unfilled slots`);
    for (const mix of [4, 0, 2]) {
      const choices = Object.fromEntries(members4.map((m, i) => [m.id, i < mix ? 'stand' : 'fold']));
      assert.deepEqual(unresolved(narrate(job, members4, choices)), [], `${s.id} mix ${mix}`);
    }
  }
  for (const s of TRIO_SCENARIOS) {
    const deck = { pair: [], trio: [s.id], table: [] };
    const job = makeJob(rng, { kind: 'trio', members: members4.slice(0, 3), deck });
    assert.deepEqual(unresolved([job.title, ...job.setup, job.pressure].join('\n')), []);
  }
});

test('narration names the traitor and the victim the right way round', () => {
  const rng = makeRng('betray');
  const deck = makeDeck(rng);
  const job = makeJob(rng, { kind: 'pair', members: members2, deck });
  const text = narrate(job, members2, { a: 'stand', b: 'fold' });
  const tmpl = PAIR_SCENARIOS.find((s) => s.id === job.scenarioId).outcomes.betray;
  if (tmpl.includes('{traitor}')) assert.ok(text.includes('Mo'), 'traitor should be named');
  if (tmpl.includes('{victim}')) assert.ok(text.includes('Andre'), 'victim should be named');
});

test('a deck deals every scenario before repeating one', () => {
  const rng = makeRng('deck');
  const deck = makeDeck(rng);
  const seen = [];
  for (let i = 0; i < PAIR_SCENARIOS.length; i++) {
    seen.push(makeJob(rng, { kind: 'pair', members: members2, deck }).scenarioId);
  }
  assert.equal(new Set(seen).size, PAIR_SCENARIOS.length);
});

test('lexicon entries that get used as sentence subjects read as noun phrases', () => {
  // "{cop} has pulled the tower data" only works if {cop} has no trailing clause
  for (const key of ['cop', 'don']) {
    for (const entry of LEXICON[key]) {
      assert.ok(!/,\s*(who|which|that)\b/.test(entry),
        `${key} entry has a relative clause and will break mid-sentence: "${entry}"`);
      assert.ok(!/\.$/.test(entry), `${key} entry should not end with a full stop: "${entry}"`);
    }
  }
});

test('callback jobs name the job and the person they are about', () => {
  const rng = makeRng('cbtest');
  const deck = makeDeck(rng);
  for (const kind of ['grudge', 'feud', 'clean', 'repeat']) {
    const job = makeJob(rng, {
      kind: 'pair', members: members2, deck,
      callback: { kind, subjectId: 'b', lastJob: 'The Haddock Problem', lastRound: 2 },
    });
    const prose = [job.title, ...job.setup, job.pressure].join('\n');
    assert.deepEqual(unresolved(prose), [], `${kind} callback has unfilled slots`);
    assert.equal(job.callback.kind, kind);
    for (const combo of [['stand', 'stand'], ['fold', 'fold'], ['stand', 'fold']]) {
      const text = narrate(job, members2, { a: combo[0], b: combo[1] });
      assert.deepEqual(unresolved(text), [], `${kind} outcome ${combo.join('/')}`);
    }
  }
});

test('every scenario deck is deep enough that a long night does not repeat', () => {
  assert.ok(PAIR_SCENARIOS.length >= 30, `only ${PAIR_SCENARIOS.length} pair jobs`);
  assert.ok(TABLE_SCENARIOS.length >= 10, `only ${TABLE_SCENARIOS.length} table jobs`);
  assert.ok(TRIO_SCENARIOS.length >= 4, `only ${TRIO_SCENARIOS.length} trio jobs`);
});

test('action jobs keep both options open to both players', () => {
  // A dilemma stops being a dilemma if the setup puts one player somewhere that
  // makes one of the two choices physically impossible for them. Earlier drafts
  // stranded a man on the wrong roof and then offered him a plank.
  for (const scenario of ACTION_PAIR) {
    const setup = scenario.setup.join(' ');
    const assignments = setup.match(/\{[AB]\}\s+(is|has|goes|makes|can|was)\b/g) ?? [];
    assert.deepEqual(assignments, [],
      `${scenario.id} puts a specific player in a specific spot: ${assignments.join(', ')}`);
  }
});

test('action jobs render and narrate like any other', () => {
  const rng = makeRng('action');
  const all = [
    ['pair', ACTION_PAIR, members2],
    ['table', ACTION_TABLE, members4],
    ['trio', ACTION_TRIO, members4.slice(0, 3)],
  ];
  for (const [kind, pool, members] of all) {
    for (const scenario of pool) {
      const deck = {
        pair: [], trio: [], table: [],
        actionPair: [scenario.id], actionTrio: [scenario.id], actionTable: [scenario.id],
      };
      const job = makeJob(rng, { kind, members, deck, action: true });
      assert.equal(job.scenarioId, scenario.id);
      assert.equal(job.tone, 'action');
      const prose = [job.title, ...job.setup, job.pressure].join('\n');
      assert.deepEqual(unresolved(prose), [], `${scenario.id} has unfilled slots`);
      assert.deepEqual(unresolved(job.stand.blurb, ['{them}']), []);
      assert.deepEqual(unresolved(job.fold.blurb, ['{them}']), []);
      for (const standCount of [members.length, 0, 1]) {
        const choices = Object.fromEntries(
          members.map((m, i) => [m.id, i < standCount ? 'stand' : 'fold']));
        const text = narrate(job, members, choices);
        assert.deepEqual(unresolved(text), [], `${scenario.id} outcome`);
        assert.ok(text.length > 40);
      }
    }
  }
});

test('table and trio jobs render for every table size, not just a pair', () => {
  const rng = makeRng('sizes');
  for (const n of TABLE_SIZES) {
    const members = tableOf(n);
    for (const scenario of TABLE_SCENARIOS) {
      const deck = { pair: [], trio: [], table: [scenario.id], actionPair: [], actionTrio: [], actionTable: [] };
      const job = makeJob(rng, { kind: 'table', members, deck, final: !!scenario.final });
      const prose = [job.title, ...job.setup, job.pressure].join('\n');
      assert.deepEqual(unresolved(prose), [], `${scenario.id} at ${n} players`);
      assert.ok(prose.includes(String(n)) || !/\{n\}/.test(scenario.setup.join(' ')),
        `${scenario.id} should count the room correctly at ${n}`);
      // every split of the room, from nobody in to everybody in
      for (let standCount = 0; standCount <= n; standCount++) {
        const choices = Object.fromEntries(members.map((m, i) => [m.id, i < standCount ? 'stand' : 'fold']));
        const text = narrate(job, members, choices);
        assert.deepEqual(unresolved(text), [], `${scenario.id} at ${n}, ${standCount} holding`);
        assert.ok(text.length > 40);
      }
    }
  }
});

test('action table jobs render at every table size too', () => {
  const rng = makeRng('actionsizes');
  for (const n of TABLE_SIZES) {
    const members = tableOf(n);
    for (const scenario of ACTION_TABLE) {
      const deck = { pair: [], trio: [], table: [], actionPair: [], actionTrio: [], actionTable: [scenario.id] };
      const job = makeJob(rng, { kind: 'table', members, deck, action: true });
      const prose = [job.title, ...job.setup, job.pressure].join('\n');
      assert.deepEqual(unresolved(prose), [], `${scenario.id} at ${n} players`);
      for (const standCount of [0, 1, Math.floor(n / 2), n]) {
        const choices = Object.fromEntries(members.map((m, i) => [m.id, i < standCount ? 'stand' : 'fold']));
        assert.deepEqual(unresolved(narrate(job, members, choices)), [], `${scenario.id} @${n}/${standCount}`);
      }
    }
  }
});

test('the names of a big room are listed like a person would say them', () => {
  const rng = makeRng('listing');
  const members = tableOf(6);
  const deck = { pair: [], trio: [], table: ['tribute'], actionPair: [], actionTrio: [], actionTable: [] };
  const job = makeJob(rng, { kind: 'table', members, deck });
  const choices = Object.fromEntries(members.map((m, i) => [m.id, i < 3 ? 'stand' : 'fold']));
  const text = narrate(job, members, choices);
  assert.ok(text.includes('Andre, Mo and Kit'), `expected a spoken list, got: ${text}`);
  assert.ok(!text.includes('Andre, Mo, and Kit'), 'no serial comma in the middle of a sentence');
});

// ---- the moves a job offers ------------------------------------------------

const ALL_SCENARIOS = [
  ...PAIR_SCENARIOS, ...TABLE_SCENARIOS, ...TRIO_SCENARIOS,
  ...CALLBACK_SCENARIOS, ...ACTION_PAIR, ...ACTION_TABLE, ...ACTION_TRIO,
];

test('every job in the game says what each of its moves looked like', () => {
  for (const s of ALL_SCENARIOS) {
    assert.ok(s.did?.stand, `${s.id} never says what holding the line looked like`);
    assert.ok(s.did?.fold, `${s.id} never says what selling out looked like`);
    assert.ok(s.closers?.murky, `${s.id} has no closing line for a mixed room`);
    for (const e of s.extra ?? []) {
      assert.ok(ARCHETYPE_IDS.includes(e.archetype), `${s.id}: unknown move type ${e.archetype}`);
      assert.ok(e.label && e.blurb && e.did, `${s.id}: an extra move is missing its words`);
      assert.ok(e.label === e.label.toUpperCase(), `${s.id}: move labels are shouted, "${e.label}"`);
    }
  }
});

test('most jobs offer more than a straight yes or no', () => {
  const withMiddle = ALL_SCENARIOS.filter((s) => (s.extra ?? []).length > 0);
  assert.ok(withMiddle.length / ALL_SCENARIOS.length > 0.9,
    `only ${withMiddle.length} of ${ALL_SCENARIOS.length} jobs offer a third way`);
  const counts = new Set(ALL_SCENARIOS.map((s) => 2 + (s.extra ?? []).length));
  assert.ok(counts.size > 1, 'every job offers the same number of moves, which is its own kind of boring');
});

test('every mix of moves narrates cleanly, at every table size', () => {
  const rng = makeRng('mixes');
  const pairLike = new Set([...PAIR_SCENARIOS, ...CALLBACK_SCENARIOS, ...ACTION_PAIR].map((s) => s.id));
  const trioLike = new Set([...TRIO_SCENARIOS, ...ACTION_TRIO].map((s) => s.id));

  for (const scenario of ALL_SCENARIOS) {
    const isPair = pairLike.has(scenario.id);
    const isTrio = trioLike.has(scenario.id);
    const sizes = isPair ? [2] : isTrio ? [3] : TABLE_SIZES;
    for (const n of sizes) {
      const members = tableOf(n);
      const isCallback = CALLBACK_SCENARIOS.includes(scenario);
      const deck = {
        pair: [scenario.id], trio: [scenario.id], table: [scenario.id],
        actionPair: [scenario.id], actionTrio: [scenario.id], actionTable: [scenario.id],
        // a callback is drawn from its kind's pool, so exhaust the others to pin it
        callbackUsed: isCallback
          ? CALLBACK_SCENARIOS.filter((c) => c.kind === scenario.kind && c.id !== scenario.id).map((c) => c.id)
          : [],
      };
      const kind = isPair ? 'pair' : isTrio ? 'trio' : 'table';
      const job = makeJob(rng, {
        kind, members, deck,
        action: scenario.tone === 'action',
        callback: isCallback
          ? { kind: scenario.kind, subjectId: members[0].id, lastJob: 'The Haddock Problem', lastRound: 2 }
          : null,
      });
      assert.equal(job.scenarioId, scenario.id, `wrong job drawn for ${scenario.id}`);
      assert.ok(job.options.length >= 2, `${scenario.id} offers fewer than two moves`);

      // every player on every option, plus a handful of genuine mixtures
      const mixes = [];
      for (const o of job.options) mixes.push(members.map(() => o.id));
      for (let i = 0; i < 6; i++) {
        mixes.push(members.map((_, k) => job.options[(i + k) % job.options.length].id));
      }
      for (const mix of mixes) {
        const picks = Object.fromEntries(members.map((m, i) => [m.id, mix[i]]));
        const text = narrate(job, members, picks);
        assert.deepEqual(unresolved(text), [],
          `${scenario.id} @${n}: unfilled slots in "${text.slice(0, 90)}"`);
        // a mixed room reads back the moves first, then closes; a pure one
        // just gets the paragraph it was written with
        if (text.includes('\n\n')) {
          for (const m of members) {
            assert.ok(text.includes(m.name), `${scenario.id} @${n}: ${m.name} is not in the account`);
          }
        }
        assert.ok(text.length > 60, `${scenario.id} @${n}: the account is too thin`);
      }
    }
  }
});

test('a job never offers two moves with the same name', () => {
  const rng = makeRng('dupes');
  for (const scenario of ALL_SCENARIOS) {
    const isCallback = CALLBACK_SCENARIOS.includes(scenario);
    const deck = {
      pair: [scenario.id], trio: [scenario.id], table: [scenario.id],
      actionPair: [scenario.id], actionTrio: [scenario.id], actionTable: [scenario.id],
      callbackUsed: isCallback
        ? CALLBACK_SCENARIOS.filter((c) => c.kind === scenario.kind && c.id !== scenario.id).map((c) => c.id)
        : [],
    };
    const job = makeJob(rng, {
      kind: 'pair', members: members2, deck, action: scenario.tone === 'action',
      callback: isCallback ? { kind: scenario.kind, subjectId: 'a', lastJob: 'X', lastRound: 1 } : null,
    });
    const labels = job.options.map((o) => o.label);
    assert.equal(new Set(labels).size, labels.length, `${scenario.id} repeats a move label`);
    const ids = job.options.map((o) => o.id);
    assert.equal(new Set(ids).size, ids.length, `${scenario.id} repeats a move id`);
  }
});
