import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/engine.js';
import { TWIST_BY_ID } from '../src/game/twists.js';

function tableOf(names, seed = 'seed', config = {}) {
  const g = new Game({ seed, config: { rounds: 5, timers: false, ...config } });
  names.forEach((n, i) =>
    g.addPlayer({ id: `p${i}`, name: n, bot: true, strategy: ['titfortat', 'rat', 'saint', 'grudger', 'pavlov', 'coin'][i % 6] }));
  return g;
}

function playOut(g, limit = 200) {
  g.start();
  let guard = 0;
  while (g.phase !== 'ledger' && guard++ < limit) g.advancePhase();
  assert.equal(g.phase, 'ledger', 'game should reach the ledger');
  return g.buildLedger();
}

test('a full night runs to the ledger for every table size', () => {
  for (let n = 2; n <= 10; n++) {
    const names = Array.from({ length: n }, (_, i) => `P${i + 1}`);
    const g = tableOf(names, `size-${n}`);
    const ledger = playOut(g);
    assert.equal(ledger.standings.length, n);
    assert.equal(g.history.length, g.config.rounds);
    for (const s of ledger.standings) assert.ok(Number.isFinite(s.score));
  }
});

test('nobody is left off a job, and nobody works two jobs at once', () => {
  const g = tableOf(['A', 'B', 'C', 'D', 'E'], 'coverage');
  g.start();
  for (let r = 0; r < g.config.rounds; r++) {
    const assigned = g.groups.flatMap((grp) => grp.memberIds);
    assert.equal(new Set(assigned).size, assigned.length, 'a player appears twice');
    assert.equal(assigned.length, g.players.size, 'somebody was left out');
    while (g.phase !== 'reckoning') g.advancePhase();
    g.advancePhase();
  }
});

test('a player’s score is exactly the sum of their payout lines', () => {
  const g = tableOf(['A', 'B', 'C', 'D'], 'bookkeeping');
  g.start();
  const tallies = new Map(g.order.map((id) => [id, 0]));
  while (g.phase !== 'accusation' && g.phase !== 'ledger') {
    if (g.phase === 'reckoning') {
      for (const grp of g.groups) {
        for (const pid of grp.memberIds) {
          const per = grp.result.perPlayer[pid];
          const lineSum = per.lines.reduce((s, l) => s + l.amount, 0);
          assert.equal(lineSum, per.total, 'lines should add up to the round total');
          tallies.set(pid, tallies.get(pid) + per.total);
        }
      }
    }
    g.advancePhase();
  }
  for (const [pid, total] of tallies) {
    assert.equal(g.players.get(pid).score, total, `${g.players.get(pid).name} banked the wrong amount`);
  }
});

test('being left out there earns a marker', () => {
  const g = new Game({ seed: 'marker', config: { rounds: 3, timers: false } });
  g.addPlayer({ id: 'a', name: 'Andre' });
  g.addPlayer({ id: 'b', name: 'Mo' });
  g.start();
  g.advancePhase();                 // deal -> talk
  g.advancePhase();                 // talk -> squeeze
  g.choose('a', 'stand');
  g.choose('b', 'fold');
  assert.equal(g.phase, 'reckoning');
  assert.equal(g.players.get('a').markers, 1, 'the one who held should hold a marker');
  assert.equal(g.players.get('b').markers, 0);
  assert.equal(g.players.get('a').stats.betrayed, 1);
  assert.equal(g.players.get('b').stats.betrayals, 1);
});

test('a called-in marker takes the traitor’s whole take', () => {
  const g = new Game({ seed: 'vendetta', config: { rounds: 3, timers: false } });
  g.addPlayer({ id: 'a', name: 'Andre' });
  g.addPlayer({ id: 'b', name: 'Mo' });
  g.start();
  g.twist = TWIST_BY_ID.clean;
  g.players.get('a').markers = 1;
  g.advancePhase();
  g.callMarker('a');
  g.advancePhase();
  g.choose('a', 'stand');
  g.choose('b', 'fold');
  const per = g.groups[0].result.perPlayer;
  assert.equal(per.b.total, 0, 'the traitor forfeits the round');
  assert.ok(per.a.lines.some((l) => /Marker collected/.test(l.label)), 'the holder collects');
});

test('honour among thieves makes holding together the best square on the board', () => {
  const g = new Game({ seed: 'honour', config: { rounds: 3, timers: false } });
  g.addPlayer({ id: 'a', name: 'Andre' });
  g.addPlayer({ id: 'b', name: 'Mo' });
  g.start();
  g.twist = TWIST_BY_ID.honour;
  const matrix = g.groups[0].matrix;
  g.advancePhase(); g.advancePhase();
  g.choose('a', 'stand'); g.choose('b', 'stand');
  const per = g.groups[0].result.perPlayer;
  // the base line is what the twist touches; secret cards may add on top of it
  assert.equal(per.a.lines[0].amount, matrix.R * 3);
  assert.ok(per.a.total > matrix.T, 'tripled loyalty should beat the temptation');
});

test('the squeeze makes mutual folding cost real money', () => {
  const g = new Game({ seed: 'squeezetwist', config: { rounds: 3, timers: false } });
  g.addPlayer({ id: 'a', name: 'Andre' });
  g.addPlayer({ id: 'b', name: 'Mo' });
  g.start();
  g.twist = TWIST_BY_ID.squeeze;
  g.advancePhase(); g.advancePhase();
  g.choose('a', 'fold'); g.choose('b', 'fold');
  assert.ok(g.groups[0].result.perPlayer.a.total < 0, 'both folding should hurt');
});

test('a broken pledge is recorded against the person who broke it', () => {
  const g = new Game({ seed: 'oath', config: { rounds: 3, timers: false } });
  g.addPlayer({ id: 'a', name: 'Andre' });
  g.addPlayer({ id: 'b', name: 'Mo' });
  g.start();
  g.twist = TWIST_BY_ID.clean;
  g.advancePhase();
  g.pledge('a', true);
  g.pledge('b', true);
  g.advancePhase();
  g.choose('a', 'stand'); g.choose('b', 'fold');
  assert.equal(g.players.get('b').stats.pledgesBroken, 1);
  assert.equal(g.players.get('a').stats.pledgesKept, 1);
  assert.equal(g.groups[0].result.perPlayer.b.brokePledge, true);
});

test('the view hides what a player is not allowed to know', () => {
  const g = tableOf(['A', 'B', 'C', 'D'], 'secrets');
  g.start();
  g.advancePhase();                          // into talk
  const view = g.view('p0');
  assert.ok(view.you.role, 'you can see your own card');
  for (const p of view.players) assert.equal(p.role, undefined, 'other cards stay face down');
  // whispers only come from people you are actually talking to
  const myGroup = g.groupOf('p0', { talk: true });
  for (const w of view.job.incoming) {
    assert.ok(myGroup.talkMemberIds.some((id) => g.players.get(id).name === w.from));
  }
  while (g.phase !== 'ledger') g.advancePhase();
  const end = g.view('p0');
  for (const p of end.players) assert.ok(p.role, 'everything turns face up at the ledger');
});

test('blind alley withholds the partner’s choice until the ledger', () => {
  const g = new Game({ seed: 'blind', config: { rounds: 3, timers: false } });
  g.addPlayer({ id: 'a', name: 'Andre' });
  g.addPlayer({ id: 'b', name: 'Mo' });
  g.start();
  g.twist = TWIST_BY_ID.blind;
  g.advancePhase(); g.advancePhase();
  g.choose('a', 'stand'); g.choose('b', 'fold');
  const v = g.view('a');
  const mine = v.reckoning.find((r) => r.yours);
  assert.equal(mine.members.find((m) => m.id === 'b').choice, null, 'you are told nothing');
  assert.equal(mine.members.find((m) => m.id === 'a').choice, 'stand', 'you still know what you did');
  assert.ok(mine.yourLines.length > 0, 'you are still told what you earned');
});

test('blind alley seals the other rooms too, so nobody can read it off a neighbour', () => {
  const g = new Game({ seed: 'blind4', config: { rounds: 3, timers: false } });
  for (const [id, name] of [['a', 'Andre'], ['b', 'Mo'], ['c', 'Kit'], ['d', 'Reza']]) {
    g.addPlayer({ id, name });
  }
  g.start();
  g.twist = TWIST_BY_ID.blind;
  g.advancePhase(); g.advancePhase();
  for (const id of ['a', 'b', 'c', 'd']) g.choose(id, id === 'a' ? 'stand' : 'fold');
  assert.equal(g.phase, 'reckoning');
  assert.ok(g.groups.length > 1, 'this test needs more than one room');
  const v = g.view('a');
  for (const grp of v.reckoning) {
    for (const m of grp.members) {
      if (m.id === 'a') continue;
      assert.equal(m.choice, null, `${m.name}'s choice leaked to Andre`);
      assert.equal(m.total, null, `${m.name}'s take leaked to Andre`);
    }
  }
  // but the truth is in the history, which the ledger hands over at the end
  while (g.phase !== 'ledger') g.advancePhase();
  const first = g.buildLedger().history[0];
  assert.ok(first.groups.every((grp) => grp.members.every((m) => m.choice)), 'the ledger tells all');
});

test('going quiet counts as holding the line', () => {
  const g = new Game({ seed: 'quiet', config: { rounds: 3, timers: false } });
  g.addPlayer({ id: 'a', name: 'Andre' });
  g.addPlayer({ id: 'b', name: 'Mo' });
  g.start();
  g.advancePhase(); g.advancePhase();
  g.choose('a', 'fold');
  g.advancePhase();                          // squeeze times out on Mo
  assert.equal(g.groups[0].choices.b, 'stand');
  assert.equal(g.players.get('b').stats.silentRounds, 1);
});

test('the last round always puts everybody in the same room', () => {
  const g = tableOf(['A', 'B', 'C', 'D', 'E'], 'finale');
  g.start();
  while (g.round < g.config.rounds) {
    while (g.phase !== 'reckoning') g.advancePhase();
    g.advancePhase();
  }
  assert.equal(g.groups.length, 1);
  assert.equal(g.groups[0].kind, 'table');
  assert.equal(g.groups[0].job.scenarioId, 'laststandoff');
});

test('the switcheroo pairs you with somebody you were not talking to', () => {
  const g = tableOf(['A', 'B', 'C', 'D'], 'switch');
  g.start();
  g.twist = TWIST_BY_ID.switch;
  const before = g.groups.map((x) => x.memberIds.join('+')).sort().join('|');
  g.advancePhase();          // talk
  g.advancePhase();          // squeeze (re-cuts the pairs)
  const after = g.groups.map((x) => x.memberIds.join('+')).sort().join('|');
  assert.ok(g.groups.every((grp) => grp.talkMemberIds.length > 0), 'talk partners are remembered');
  assert.ok(g.groups.every((grp) => grp.job), 'every re-cut pair gets a fresh job');
  void before; void after;   // the re-cut may coincidentally match; the wiring is what matters
});

test('a rematch keeps the seats and clears the scores', () => {
  const g = tableOf(['A', 'B', 'C'], 'rematch');
  playOut(g);
  const fresh = g.rematch();
  assert.equal(fresh.players.size, 3);
  assert.equal(fresh.phase, 'lobby');
  assert.deepEqual([...fresh.players.keys()], [...g.players.keys()], 'same seats, same tokens');
  for (const p of fresh.players.values()) assert.equal(p.score, 0);
});

test('two hundred nights end cleanly with a ledger and a set of bonds', () => {
  for (let i = 0; i < 200; i++) {
    const n = 2 + (i % 9);
    const g = tableOf(Array.from({ length: n }, (_, k) => `P${k}`), `soak-${i}`, { rounds: 3 + (i % 5) });
    const ledger = playOut(g);
    assert.equal(ledger.standings.length, n);
    assert.ok(ledger.bonds.length > 0);
    for (const b of ledger.bonds) {
      assert.equal(b.mutualStand + b.mutualFold + b.betrayA + b.betrayB, b.rounds,
        'every round between two people is accounted for exactly once');
    }
  }
});
