// Chapter 1, played start to finish by bots at every table size.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../public/engine/game.js';

function play({ n, length = 'full', seed, roundTrip = false }) {
  let g = new Game({ code: 'TEST', seed });
  let t = 1_000_000;
  g.clock = () => t;
  for (let i = 0; i < n; i++) g.addBot();
  g.setConfig({ length });
  assert.equal(g.start().ok, true);
  const seen = new Set();
  for (let steps = 0; g.phase === 'playing' && steps < 40000; steps++) {
    if (g.s.beat) seen.add(g.s.beat.id);
    t += 700;
    g.tick(t);
    if (g.s.deadline && steps % 50 === 0) { t = g.s.deadline + 1; g.tick(t); }
    if (roundTrip && steps % 41 === 0) {
      const again = Game.fromJSON(JSON.parse(JSON.stringify(g.toJSON())));
      assert.ok(again, 'state survives a JSON round trip');
      again.clock = () => t;
      g = again;
    }
  }
  return { g, seen };
}

for (const n of [2, 3, 4, 5, 6, 7, 8, 10]) {
  test(`a full week with ${n} at the table reaches a verdict`, () => {
    for (let r = 0; r < 4; r++) {
      const { g } = play({ n, seed: `full-${n}-${r}` });
      assert.equal(g.phase, 'over', `seed full-${n}-${r} finished`);
      const e = g.s.end;
      assert.equal(e.table.length, n);
      assert.equal(typeof e.salWalks, 'boolean');
      assert.ok(e.table.every((row) => Number.isFinite(row.money) && row.epilogue.length > 20));
      assert.ok(g.s.bag.total >= 0 && g.s.caseFile >= 0);
      for (const p of g.s.players) assert.ok(p.cash >= 0, `${p.name} never goes below zero`);
    }
  });
}

test('the short game is four nights', () => {
  for (let r = 0; r < 6; r++) {
    const { g } = play({ n: 4, length: 'short', seed: `short-${r}` });
    assert.equal(g.phase, 'over');
    assert.equal(g.s.week.n, 4);
  }
});

test('the full game is seven nights', () => {
  const { g } = play({ n: 5, seed: 'seven' });
  assert.equal(g.s.week.n, 7);
});

test('a game can be saved and restored at any moment and carry on', () => {
  for (let r = 0; r < 3; r++) {
    const { g } = play({ n: 5, seed: `trip-${r}`, roundTrip: true });
    assert.equal(g.phase, 'over');
  }
});

test('the same seed plays the same week', () => {
  const a = play({ n: 4, seed: 'same' }).g;
  const b = play({ n: 4, seed: 'same' }).g;
  assert.deepEqual(a.s.week.plan, b.s.week.plan);
  assert.deepEqual(a.s.end.table.map((r) => r.money), b.s.end.table.map((r) => r.money));
});

test('different seeds tell different weeks', () => {
  const plans = new Set();
  const beats = new Set();
  for (let r = 0; r < 12; r++) {
    const { g, seen } = play({ n: 4, seed: `vary-${r}` });
    plans.add(g.s.week.plan.join(','));
    beats.add([...seen].sort().join(','));
  }
  assert.ok(plans.size >= 8, `only ${plans.size} different weeks in 12`);
  assert.ok(beats.size >= 10, `only ${beats.size} different sets of beats in 12`);
});

test('every night in the chapter turns up somewhere', () => {
  const want = ['night-guard', 'bookies-box', 'wedding', 'retaliation', 'motel', 'confessional', 'ring', 'armored-car', 'phone-call', 'drop', 'somebody-talked', 'counting-house', 'cleanup'];
  const nights = new Set();
  for (let r = 0; r < 60 && !want.every((id) => nights.has(id)); r++) {
    const { g } = play({ n: 5, seed: `nights-${r}` });
    for (const id of g.s.week.plan) nights.add(id);
  }
  for (const id of want) {
    assert.ok(nights.has(id), `${id} was never played`);
  }
});

test('a view never shows somebody else’s secret or cash at a big table', () => {
  const g = new Game({ code: 'TEST', seed: 'views' });
  let t = 1_000_000;
  g.clock = () => t;
  for (let i = 0; i < 5; i++) g.addBot();
  g.start();
  for (let i = 0; i < 300 && g.phase === 'playing'; i++) {
    t += 700; g.tick(t);
    const me = g.s.players[0];
    const v = g.view(me.id);
    const json = JSON.stringify(v);
    for (const q of g.s.players.slice(1)) {
      const row = v.players.find((r) => r.id === q.id);
      assert.equal(row.cash, null, 'other people’s cash is hidden');
      if (q.secret?.id && q.secret.id !== me.secret?.id) {
        const name = g.chapter.secretView(g.ctx(), q).name;
        if (!me.notes.some((n) => n.text?.includes(name))) assert.ok(!json.includes(`“${name}”`) || v.beat?.lines?.some((l) => l.includes(name)), 'no secret leaks into the view');
      }
    }
  }
});
