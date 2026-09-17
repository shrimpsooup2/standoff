import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../public/game/engine.js';
import { TUTORIAL_VARIATIONS, beatsFor, pickVariation } from '../public/game/tutorial.js';
import { makeRng } from '../public/game/rng.js';
import { ARCHETYPE_IDS } from '../public/game/options.js';

function table(n, seed = 'tut') {
  const g = new Game({ seed, config: { timers: false } });
  for (let i = 0; i < n; i++) g.addPlayer({ id: `p${i}`, name: `P${i}`, bot: true, strategy: 'titfortat' });
  return g;
}

function playOut(g, limit = 200) {
  let guard = 0;
  const seen = [];
  while (g.phase !== 'ledger' && guard++ < limit) {
    seen.push(g.phase);
    g.advancePhase();
  }
  assert.equal(g.phase, 'ledger', 'the first night should end at a ledger');
  return seen;
}

test('every variation is complete and teaches the same three things', () => {
  assert.equal(TUTORIAL_VARIATIONS.length, 3);
  const teaches = TUTORIAL_VARIATIONS.map((v) => v.beats.map((b) => b.teach).join('|'));
  assert.equal(new Set(teaches).size, 1, 'all three should cover the same ground');

  for (const v of TUTORIAL_VARIATIONS) {
    assert.ok(v.coachName && v.coachRole && v.opening && v.closing, `${v.id} is missing its voice`);
    assert.equal(v.beats.length, 3, `${v.id} should be three beats`);
    for (const beat of v.beats) {
      assert.ok(beat.coach?.deal, `${v.id}/${beat.teach}: nothing said when the job lands`);
      assert.ok(beat.coach?.squeeze, `${v.id}/${beat.teach}: nothing said at the choice`);
      assert.ok(beat.coach?.reckoning, `${v.id}/${beat.teach}: no lesson drawn afterwards`);
      const job = beat.job;
      assert.ok(job.title && job.setup?.length && job.pressure, `${v.id}/${job.id} is missing its dossier`);
      assert.ok(job.did?.stand && job.did?.fold, `${v.id}/${job.id} is missing its move clauses`);
      assert.ok(job.closers?.murky, `${v.id}/${job.id} has no closer for a mixed room`);
      for (const e of job.extra ?? []) {
        assert.ok(ARCHETYPE_IDS.includes(e.archetype), `${v.id}/${job.id}: unknown move ${e.archetype}`);
        assert.ok(e.label && e.blurb && e.did);
      }
    }
    // the first beat should be the simple one and the last the richest
    assert.ok(!(v.beats[0].job.extra ?? []).length, `${v.id} should open with a straight choice`);
    assert.ok((v.beats[1].job.extra ?? []).length >= 2, `${v.id} should widen out on the second beat`);
    assert.ok((v.beats[2].job.extra ?? []).length >= 2, `${v.id} should still be interesting at the end`);
  }
});

test('the first night runs end to end at every table size', () => {
  for (let n = 2; n <= 10; n++) {
    const g = table(n, `size-${n}`);
    assert.deepEqual(g.startTutorial(), { ok: true });
    assert.equal(g.config.rounds, 3, 'it stays short');
    playOut(g);
    const ledger = g.buildLedger();
    assert.equal(ledger.standings.length, n);
    assert.ok(ledger.tutorial, 'the ledger knows it was a practice night');
    for (const s of ledger.standings) assert.ok(Number.isFinite(s.score));
  }
});

test('it shapes itself around the size of the group', () => {
  const v = TUTORIAL_VARIATIONS[0];
  assert.deepEqual(beatsFor(v, 2).map((b) => b.kind), ['pair', 'pair', 'pair'],
    'two people never get a whole-table round, because there is no table');
  for (const n of [3, 5, 9]) {
    assert.deepEqual(beatsFor(v, n).map((b) => b.kind), ['pair', 'pair', 'table'],
      `${n} people should finish with everybody in one room`);
  }

  // and the last beat really does put everybody together
  const g = table(6, 'shape');
  g.startTutorial();
  while (g.round < 3) { while (g.phase !== 'reckoning') g.advancePhase(); g.advancePhase(); }
  assert.equal(g.groups.length, 1, 'one room at the end');
  assert.equal(g.groups[0].memberIds.length, 6);
});

test('it teaches in order: a plain choice, then more ways out, then cards', () => {
  const g = table(4, 'order');
  g.startTutorial();

  while (g.phase !== 'deal') g.advancePhase();
  assert.equal(g.groups[0].job.options.length, 2, 'the first job is a straight yes or no');
  assert.equal(g.livePlayers.every((p) => p.hand.length === 0), true, 'no cards to think about yet');

  while (g.round < 2) { while (g.phase !== 'reckoning') g.advancePhase(); g.advancePhase(); }
  assert.ok(g.groups[0].job.options.length >= 4, 'the second job widens out');
  assert.equal(g.livePlayers.every((p) => p.hand.length === 0), true, 'still no cards');

  while (g.round < 3) { while (g.phase !== 'reckoning') g.advancePhase(); g.advancePhase(); }
  assert.ok(g.livePlayers.every((p) => p.hand.length > 0), 'cards arrive for the last beat');
});

test('a first night leaves out everything that makes the real one long', () => {
  const g = table(8, 'lean');
  g.startTutorial();
  assert.equal(g.ratId, null, 'nobody is on the payroll in a practice game');
  assert.equal(g.crews, null, 'no factions to explain');
  assert.equal(g.livePlayers.every((p) => p.role === null), true, 'no secret cards');
  const phases = new Set(playOut(g));
  for (const skipped of ['act', 'event', 'vote', 'accusation']) {
    assert.ok(!phases.has(skipped), `a first night should not include ${skipped}`);
  }
  assert.equal(g.heat, 0, 'and the heat never comes on');
});

test('the coach says something at every moment that needs explaining', () => {
  const g = table(3, 'voice');
  g.startTutorial();
  const heard = [];
  let guard = 0;
  while (g.phase !== 'ledger' && guard++ < 200) {
    const view = g.view('p0');
    assert.ok(view.tutorial, 'the client is told this is a practice night');
    if (view.tutorial.says) heard.push(`${view.tutorial.beat}:${g.phase}`);
    g.advancePhase();
  }
  for (const beat of [1, 2, 3]) {
    assert.ok(heard.some((h) => h === `${beat}:deal`), `nothing said as beat ${beat} lands`);
    assert.ok(heard.some((h) => h === `${beat}:reckoning`), `no lesson drawn after beat ${beat}`);
  }
});

test('it does not deal the same variation twice in a row', () => {
  const rng = makeRng('variety');
  for (let i = 0; i < 50; i++) {
    const first = pickVariation(rng);
    const second = pickVariation(rng, first.id);
    assert.notEqual(second.id, first.id);
  }

  const g = table(4, 'again');
  g.startTutorial();
  const firstId = g.tutorial.id;
  while (g.phase !== 'ledger') g.advancePhase();
  const next = g.rematch();
  assert.equal(next.lastTutorialId, firstId, 'the next one remembers what was just played');
  next.startTutorial();
  assert.notEqual(next.tutorial.id, firstId, 'and deals a different one');
});

test('the real game follows a first night, with everything switched back on', () => {
  const g = table(6, 'onward');
  g.startTutorial();
  while (g.phase !== 'ledger') g.advancePhase();

  const real = g.rematch();
  assert.equal(real.tutorial, undefined, 'the next one is not a practice game');
  assert.equal(real.players.size, 6, 'same table');
  for (const p of real.players.values()) assert.equal(p.score, 0, 'and a clean slate');
  real.start();
  assert.ok(real.ratId, 'the rat is back');
  assert.ok(real.config.rounds > 3, 'and it runs long again');
});

test('two hundred practice nights end cleanly', () => {
  for (let i = 0; i < 200; i++) {
    const g = table(2 + (i % 9), `soak-${i}`);
    g.startTutorial();
    playOut(g);
    const ledger = g.buildLedger();
    assert.ok(ledger.standings.every((s) => Number.isFinite(s.score)));
    for (const round of ledger.history) {
      for (const grp of round.groups) {
        assert.ok(grp.narration.length > 40, 'every beat is narrated');
        assert.ok(!/\{\w+\}/.test(grp.narration), `unfilled slot: ${grp.narration.slice(0, 80)}`);
      }
    }
  }
});
