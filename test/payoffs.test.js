import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../public/game/rng.js';
import { groupParams, stakesForRound } from '../public/game/payoffs.js';
import { previewOption, resolve, ARCHETYPE_IDS } from '../public/game/options.js';

test('the stake is always a real dilemma', () => {
  // above 1 so the room does better when everybody puts in; below the number of
  // people so each person does better keeping theirs. Both at once, every time.
  const rng = makeRng('stakes');
  for (let n = 2; n <= 10; n++) {
    for (let i = 0; i < 50; i++) {
      const p = groupParams(rng, n, 1);
      assert.ok(p.multiplier > 1, `n=${n}: a pot that shrinks is not worth filling`);
      assert.ok(p.multiplier < n, `n=${n}: putting in has to cost you something`);
      assert.ok(p.contribution >= 5, `n=${n}: the stake should be worth arguing about`);
    }
  }
});

test('stakes climb toward the last job', () => {
  assert.equal(stakesForRound(5, 5), 3);
  assert.equal(stakesForRound(4, 5), 2);
  assert.ok(stakesForRound(1, 5) < stakesForRound(4, 5));
});

// ---- the option system ----------------------------------------------------

test('no hedge makes plain betrayal pointless', () => {
  // In a public-goods game every low-contribution move beats holding the line —
  // that IS the dilemma, and it is just as true of folding. What must not happen
  // is a middle move that beats FOLDING in both columns, because then the
  // starkest option on the board would be strictly stupid.
  for (const n of [2, 3, 5, 8]) {
    for (const unit of [5, 7, 9, 12]) {
      const fold = previewOption({ archetype: 'fold' }, { unit, multiplier: 1.6, n });
      for (const id of ARCHETYPE_IDS) {
        if (id === 'fold') continue;
        const p = previewOption({ archetype: id }, { unit, multiplier: 1.6, n });
        const dominates = p.ifTheyHold >= fold.ifTheyHold && p.ifTheyDont >= fold.ifTheyDont
          && (p.ifTheyHold > fold.ifTheyHold || p.ifTheyDont > fold.ifTheyDont);
        assert.ok(!dominates, `${id} beats folding in both columns at n=${n}, unit=${unit}`);
      }
    }
  }
});

test('betting on the room and covering against it are opposite moves', () => {
  // The point of a spread of options: what is best depends entirely on what you
  // think everybody else is about to do.
  for (const n of [2, 5]) {
    const at = (id) => previewOption({ archetype: id }, { unit: 7, multiplier: 1.7, n });
    const best = (col) => ARCHETYPE_IDS.map((id) => ({ id, v: at(id)[col] }))
      .sort((a, b) => b.v - a.v)[0].id;
    const whenHeld = best('ifTheyHold');
    const whenNot = best('ifTheyDont');
    assert.notEqual(whenHeld, whenNot,
      `at n=${n} one move is best whatever the room does, which is not a dilemma`);
    assert.ok(['gamble', 'chance', 'fold'].includes(whenHeld),
      `expected a bet on the room to win when the room holds, got ${whenHeld}`);
    assert.ok(['shield', 'muscle', 'half', 'chance'].includes(whenNot),
      `expected cover or punishment to win when the room folds, got ${whenNot}`);
  }
});
test('every move has its own shape, so a job never offers the same thing twice', () => {
  for (const n of [2, 5]) {
    const seen = new Map();
    for (const id of ARCHETYPE_IDS) {
      const p = previewOption({ archetype: id }, { unit: 7, multiplier: 1.6, n });
      const key = `${p.ifTheyHold}/${p.ifTheyDont}`;
      assert.ok(!seen.has(key), `${id} is indistinguishable from ${seen.get(key)} at n=${n}`);
      seen.set(key, id);
    }
  }
});

test('holding together still pays the room more than anything else', () => {
  for (const n of [2, 4, 7]) {
    const unit = 7;
    const all = (archetype) => resolve({
      picks: Array.from({ length: n }, (_, i) => ({ id: `p${i}`, option: { archetype } })),
      unit, multiplier: 1.7,
    });
    const table = (r) => Object.values(r.byPlayer).reduce((s, x) => s + x.total, 0);
    const held = table(all('hold'));
    for (const id of ARCHETYPE_IDS) {
      if (id === 'hold' || id === 'martyr') continue;
      assert.ok(held > table(all(id)),
        `a room that all played ${id} did better than a room that all held, at n=${n}`);
    }
  }
});

test('a room that sells out is worse off than a room that does not', () => {
  const picks = (n, archetype) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, option: { archetype } }));
  for (const n of [2, 5]) {
    const holds = resolve({ picks: picks(n, 'hold'), unit: 7, multiplier: 1.7 });
    const folds = resolve({ picks: picks(n, 'fold'), unit: 7, multiplier: 1.7 });
    for (const id of Object.keys(holds.byPlayer)) {
      assert.ok(holds.byPlayer[id].total > folds.byPlayer[id].total,
        `at n=${n}, everybody folding paid as well as everybody holding`);
    }
  }
});

test('the breakdown a player reads adds up to the number at the bottom of it', () => {
  const rng = makeRng('books');
  for (let i = 0; i < 400; i++) {
    const n = 2 + (i % 8);
    const unit = 4 + (i % 11);
    const picks = Array.from({ length: n }, (_, k) => ({
      id: `p${k}`,
      option: { archetype: ARCHETYPE_IDS[(i + k) % ARCHETYPE_IDS.length] },
    }));
    const res = resolve({ picks, unit, multiplier: 1.4 + (i % 5) / 10 });
    for (const [id, rec] of Object.entries(res.byPlayer)) {
      const shown = rec.lines.reduce((s, l) => s + l.amount, 0);
      assert.equal(shown, rec.total,
        `${id} at n=${n}, unit=${unit}: lines sum to ${shown} but the total says ${rec.total}`);
    }
  }
  void rng;
});
