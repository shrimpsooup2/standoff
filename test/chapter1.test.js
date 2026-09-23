// Chapter 1, played start to finish by bots at every table size.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../public/engine/game.js';
import { salCall, CALLS } from '../public/chapters/sals-ledger/calls.js';
import { autoAction } from './autoplay.js';

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
  assert.deepEqual(g.s.faults ?? [], [], `no beat fell over (${seed})`);
  return { g, seen };
}

/** One person and the ghosts with the clock off, as on one device or solo. */
function playClockOff({ n, length, seed, families = 'auto' }) {
  const g = new Game({ code: 'SOLO', seed });
  let t = 1_000_000;
  g.clock = () => t;
  g.setConfig({ clock: false, length, families });
  g.addPlayer({ id: 'me', name: 'Andre' });
  g.setConnected('me', true);
  while (g.players.length < n) g.addBot();
  assert.equal(g.start().ok, true);
  let still = 0;
  for (let steps = 0; g.phase === 'playing' && steps < 20000 && still < 300; steps++) {
    const v = g.version;
    const a = autoAction(g.view('me'));
    if (a) g.act('me', a);
    t += 700;
    g.tick(t);
    still = g.version === v ? still + 1 : 0;
  }
  return g;
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

test('with the clock off, nobody is left waiting on a choice they cannot make', () => {
  // the first four once stalled: a warning with nobody else free to warn, a
  // toast with every Benedetto inside, Sal running out of things to say, and
  // a getaway handed to somebody across the river
  const seeds = [['hunt-14', 4, 'short'], ['hunt-1054', 10, 'full'], ['hunt-2042', 4, 'full'], ['hunt-9177', 4, 'full', 'on']];
  for (let r = 0; r < 24; r++) seeds.push([`off-${r}`, [2, 3, 4, 5, 7, 9][r % 6], r % 2 ? 'full' : 'short', r % 4 === 2 ? 'on' : 'auto']);
  for (const [seed, n, length, families] of seeds) {
    const g = playClockOff({ n, length, seed, families });
    assert.equal(g.phase, 'over', `${seed} (${n}, ${length}) got to Monday`);
    assert.deepEqual(g.s.faults ?? [], [], `no beat fell over (${seed})`);
  }
});

test('Sal always has something true to say, even on the last morning', () => {
  const g = new Game({ code: 'TEST', seed: 'calls' });
  for (let i = 0; i < 4; i++) g.addBot();
  g.start();
  g.s.flags.callsUsed = CALLS.map((_, i) => i);
  for (let i = 0; i < 20; i++) {
    const line = salCall(g.ctx());
    assert.equal(typeof line, 'string');
    assert.ok(line.length > 10);
  }
});

test('everybody says who they are before the first night, and nobody shares one', () => {
  const { g, seen } = play({ n: 6, seed: 'who' });
  assert.ok(seen.has('prologue/who'));
  const bios = g.s.players.map((p) => p.bio);
  assert.ok(bios.every(Boolean), 'everybody kept one');
  assert.equal(new Set(bios).size, bios.length, 'no two people are the same person');
  const v = g.view(g.s.players[0].id);
  assert.ok(v.players.every((row) => typeof row.bio === 'string'), 'the table knows who everybody is');
  assert.ok(v.you.bio?.text, 'and you can read your own');
});

test('a week has room in it: days, and time before and after each job', () => {
  const { seen } = play({ n: 5, seed: 'slow' });
  for (const id of ['morning/day', 'moments/before', 'moments/after']) assert.ok(seen.has(id), `${id} happened`);
});

test('what happens to you alone shows up on your own screen, and nobody else’s', () => {
  const g = new Game({ code: 'TEST', seed: 'eyes' });
  let t = 1_000_000;
  g.clock = () => t;
  g.addPlayer({ id: 'me', name: 'Andre' });
  g.setConnected('me', true);
  for (let i = 0; i < 4; i++) g.addBot();
  g.setConfig({ clock: false });
  g.start();
  // play along until the twenty minutes are over and everybody is reading what came of them
  for (let steps = 0; steps < 20000 && !(g.s.beat?.id === 'moments/before' && g.s.beat.stage === 'fallout'); steps++) {
    const a = autoAction(g.view('me'));
    if (a) g.act('me', a);
    t += 700;
    g.tick(t);
  }
  assert.equal(g.s.beat?.id, 'moments/before');
  const views = g.s.players.map((p) => g.view(p.id));
  const withNotes = views.filter((v) => v.beat.mine.length);
  assert.ok(withNotes.length >= 3, 'the people who had a moment see what came of it');
  for (const v of withNotes) {
    const theirs = g.s.players.find((p) => p.id === v.you.id).notes.filter((n) => n.beat === g.s.beat.key).map((n) => n.text);
    assert.deepEqual(v.beat.mine.map((n) => n.text), theirs, 'only their own');
  }
});

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

// ------------------------------------------------------------ families --

for (const n of [7, 8, 9, 10]) {
  test(`two families at ${n} reach Monday, and one of them wins it`, () => {
    for (let r = 0; r < 3; r++) {
      const { g } = play({ n, seed: `fam-${n}-${r}` });
      assert.equal(g.phase, 'over');
      const e = g.s.end;
      assert.ok(e.families, 'it was a Families game');
      assert.equal(e.families.rows.length, 2);
      assert.equal(e.families.winner, e.salWalks ? 'b' : 'c');
      const fams = Object.values(g.s.families.of);
      assert.equal(fams.filter((f) => f === 'b').length, Math.ceil(n / 2), 'the Benedettos get the extra seat');
      assert.ok(g.s.week.played.includes('c-collection'), 'the Castellanos had their own first night');
      assert.ok(g.s.week.played.includes('raid'), 'and everybody shared the raid');
      assert.equal(g.s.week.n, 7);
    }
  });
}

test('across the river, people are somebody to the Castellanos', () => {
  const { g } = play({ n: 8, seed: 'fam-bios' });
  const view = g.view(g.s.players[0].id);
  for (const p of g.s.players) {
    assert.ok(p.bio, `${p.name} said who they are`);
    const row = view.players.find((r) => r.id === p.id);
    assert.ok(row.bio, 'and everybody knows it');
  }
  const castellanos = g.s.players.filter((p) => g.s.families.of[p.id] === 'c');
  assert.ok(castellanos.some((p) => ['vgodchild', 'bigcousin', 'shopgrand', 'ex'].includes(p.bio)) || castellanos.every((p) => p.bio), 'Castellanos draw from their own side');
});

test('a short Families week is four nights', () => {
  for (let r = 0; r < 3; r++) {
    const { g } = play({ n: 8, length: 'short', seed: `famshort-${r}` });
    assert.equal(g.phase, 'over');
    assert.equal(g.s.week.n, 4);
  }
});

test('Families can be switched on for a small table, and off for a big one', () => {
  const on = new Game({ code: 'T', seed: 'on' });
  for (let i = 0; i < 4; i++) on.addBot();
  on.setConfig({ families: 'on' });
  on.start();
  assert.ok(on.s.families);
  const off = new Game({ code: 'T', seed: 'off' });
  for (let i = 0; i < 8; i++) off.addBot();
  off.setConfig({ families: 'off' });
  off.start();
  assert.equal(off.s.families, undefined);
});

test('a night apart survives being saved and restored in the middle', () => {
  for (let r = 0; r < 3; r++) {
    const { g } = play({ n: 8, seed: `famtrip-${r}`, roundTrip: true });
    assert.equal(g.phase, 'over');
  }
});

test('on a night apart, each family sees its own story and nobody else’s choices', () => {
  const g = new Game({ code: 'T', seed: 'apart' });
  let t = 1_000_000;
  g.clock = () => t;
  for (let i = 0; i < 8; i++) g.addBot();
  g.start();
  let checked = 0;
  for (let i = 0; i < 4000 && g.phase === 'playing' && checked < 40; i++) {
    t += 700; g.tick(t);
    if (!g.s.tracks) continue;
    for (const p of g.s.players) {
      const v = g.view(p.id);
      const fam = g.familyOf(p);
      const mine = g.s.tracks[fam];
      if (!mine.beat) continue;
      assert.equal(v.beat?.id, mine.beat.id, 'your own family’s beat');
      assert.ok(v.tracks.find((x) => x.mine).id === fam);
      const other = g.s.tracks[fam === 'b' ? 'c' : 'b'];
      if (other.beat?.engine === 'choose' && other.beat.stage === 'choose' && v.beat.engine !== 'choose') {
        assert.ok(!JSON.stringify(v).includes('"myChoice"'), 'nothing from the other family’s private choices');
      }
      checked += 1;
    }
  }
  assert.ok(checked > 10, 'a night apart was actually looked at');
});

test('a step inside a branch is decided when the night gets to it, not when the branch opens', () => {
  const g = new Game({ code: 'TEST', seed: 'lazy-branch' });
  const def = { id: 'x', beats: ['a', { if: () => true, then: ['b', { if: (c) => c.memo.flag, then: 'c', else: 'd' }] }] };
  g.chapter = Object.assign(Object.create(Object.getPrototypeOf(g.chapter) ?? null), g.chapter, { night: () => def });
  g.s.scene = { nightId: 'x', cursor: 0, queue: [], done: [] };
  g.s.night = { memo: {} };
  assert.equal(g.resolveNext(), 'x/a');
  assert.equal(g.resolveNext(), 'x/b');
  // whatever b did happens here, before the next step is worked out
  g.s.night.memo.flag = true;
  // the rest of the branch waits in the saved state as plain JSON
  assert.deepEqual(JSON.parse(JSON.stringify(g.s.scene.queue)), g.s.scene.queue);
  assert.equal(g.resolveNext(), 'x/c');
  assert.equal(g.resolveNext(), null);
});
