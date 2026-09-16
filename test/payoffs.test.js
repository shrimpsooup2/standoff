import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../public/game/rng.js';
import { makeMatrix, pairPayoff, groupPayoff, groupParams, stakesForRound } from '../public/game/payoffs.js';

test('every generated matrix is a real prisoner’s dilemma', () => {
  for (let seed = 0; seed < 400; seed++) {
    const rng = makeRng(seed);
    const m = makeMatrix(rng, 1);
    assert.ok(m.T > m.R, `T>R failed at seed ${seed}: ${JSON.stringify(m)}`);
    assert.ok(m.R > m.P, `R>P failed at seed ${seed}: ${JSON.stringify(m)}`);
    assert.ok(m.P > m.S, `P>S failed at seed ${seed}: ${JSON.stringify(m)}`);
    assert.ok(2 * m.R > m.T + m.S, `2R>T+S failed at seed ${seed}: ${JSON.stringify(m)}`);
  }
});

test('folding always beats holding against either partner choice', () => {
  const rng = makeRng('dominance');
  for (let i = 0; i < 100; i++) {
    const m = makeMatrix(rng, 2);
    assert.ok(pairPayoff(m, 'fold', 'stand') > pairPayoff(m, 'stand', 'stand'));
    assert.ok(pairPayoff(m, 'fold', 'fold') > pairPayoff(m, 'stand', 'fold'));
  }
});

test('stakes climb toward the last job', () => {
  assert.equal(stakesForRound(5, 5), 3);
  assert.equal(stakesForRound(4, 5), 2);
  assert.ok(stakesForRound(1, 5) < stakesForRound(4, 5));
});

test('group pot: skimming beats contributing, everyone contributing beats everyone skimming', () => {
  const rng = makeRng('pot');
  for (let n = 3; n <= 10; n++) {
    const p = groupParams(rng, n, 1);
    const all = groupPayoff({ ...p, standCount: n });
    const none = groupPayoff({ ...p, standCount: 0 });
    const mixed = groupPayoff({ ...p, standCount: n - 1 });
    assert.ok(mixed.fold > mixed.stand, `n=${n}: skimming should pay more individually`);
    assert.ok(all.stand > none.fold, `n=${n}: a full pot should beat an empty one`);
  }
});
