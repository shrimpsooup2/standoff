import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../public/game/rng.js';
import { makeDeck, makeJob, narrate, PAIR_SCENARIOS, TABLE_SCENARIOS, TRIO_SCENARIOS } from '../public/game/scenarios.js';
import { LEXICON } from '../public/game/lexicon.js';

const members2 = [{ id: 'a', name: 'Andre' }, { id: 'b', name: 'Mo' }];
const members4 = [...members2, { id: 'c', name: 'Kit' }, { id: 'd', name: 'Reza' }];

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
