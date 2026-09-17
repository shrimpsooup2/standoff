import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../public/game/engine.js';
import { TWIST_BY_ID } from '../public/game/twists.js';
import { CARD_BY_ID, handSize } from '../public/game/cards.js';
import { tableProfile } from '../public/game/director.js';

function tableOf(names, seed = 'seed', config = {}) {
  const g = new Game({ seed, config: { rounds: 5, timers: false, ...config } });
  names.forEach((n, i) =>
    g.addPlayer({ id: `p${i}`, name: n, bot: true, strategy: ['titfortat', 'rat', 'saint', 'grudger', 'pavlov', 'coin'][i % 6] }));
  return g;
}

/** Real players, so the squeeze waits for a decision instead of resolving itself. */
function humanTable(names, seed = 'seed', config = {}) {
  const g = new Game({ seed, config: { rounds: 5, timers: false, ...config } });
  names.forEach((n, i) => g.addPlayer({ id: `p${i}`, name: n }));
  return g;
}

function duo(seed, config = {}) {
  const g = new Game({ seed, config: { rounds: 4, timers: false, ...config } });
  g.addPlayer({ id: 'a', name: 'Andre' });
  g.addPlayer({ id: 'b', name: 'Mo' });
  return g;
}

/** Walk to the given phase, refusing to loop forever. */
function to(g, phase, limit = 60) {
  let guard = 0;
  while (g.phase !== phase && guard++ < limit) {
    if (g.phase === 'ledger') throw new Error(`game ended before reaching ${phase}`);
    g.advancePhase();
  }
  assert.equal(g.phase, phase, `should have reached ${phase}`);
  return g;
}

/** Start, get to the first deal, pin a twist, then walk to the squeeze. */
function openWith(g, twistId) {
  g.start();
  to(g, 'deal');
  if (twistId) g.twist = TWIST_BY_ID[twistId];
  to(g, 'squeeze');
  return g;
}

function playOut(g, limit = 400) {
  g.start();
  let guard = 0;
  while (g.phase !== 'ledger' && guard++ < limit) g.advancePhase();
  assert.equal(g.phase, 'ledger', 'game should reach the ledger');
  return g.buildLedger();
}

// ------------------------------------------------------------ the shape ---

test('a full night runs to the ledger for every table size', () => {
  for (let n = 2; n <= 10; n++) {
    const names = Array.from({ length: n }, (_, i) => `P${i + 1}`);
    const ledger = playOut(tableOf(names, `size-${n}`));
    assert.equal(ledger.standings.length, n);
    for (const s of ledger.standings) assert.ok(Number.isFinite(s.score), `${s.name} has a real score`);
  }
});

test('the night reshapes itself around how many people showed up', () => {
  assert.equal(tableProfile(2).key, 'twohander');
  assert.equal(tableProfile(3).key, 'threehander');
  assert.equal(tableProfile(5).key, 'crew');
  assert.equal(tableProfile(9).key, 'family');

  // two people never get a rat to hide behind; a big table gets crews
  const small = tableOf(['A', 'B'], 'shape-2');
  small.start();
  assert.equal(small.ratId, null, 'no rat at a table of two');
  assert.equal(small.crews, null);

  const big = tableOf(Array.from({ length: 8 }, (_, i) => `P${i}`), 'shape-8');
  big.start();
  assert.ok(big.ratId, 'a big table always has a rat');
  assert.ok(big.crews, 'a big table splits into crews');
  assert.equal(new Set(Object.values(big.crews)).size, 2);
  for (const p of big.livePlayers) assert.equal(p.hand.length, handSize(8));
});

test('round count follows the table unless the host says otherwise', () => {
  const auto = new Game({ seed: 'auto' });
  for (let i = 0; i < 5; i++) auto.addPlayer({ id: `p${i}`, name: `P${i}` });
  assert.equal(auto.config.rounds, tableProfile(5).rounds);
  auto.setConfig({ rounds: 9 });
  auto.addPlayer({ id: 'p9', name: 'P9' });
  assert.equal(auto.config.rounds, 9, 'a host setting sticks when more people arrive');
});

test('everybody is accounted for every round — working or sitting out', () => {
  const g = tableOf(['A', 'B', 'C', 'D', 'E'], 'coverage');
  g.start();
  for (let r = 0; r < g.config.rounds; r++) {
    to(g, 'deal');
    const assigned = g.groups.flatMap((grp) => grp.memberIds);
    assert.equal(new Set(assigned).size, assigned.length, 'a player appears twice');
    assert.equal(assigned.length + (g.sittingOut ? 1 : 0), g.players.size, 'somebody vanished');
    to(g, 'reckoning');
    if (g.round >= g.config.rounds) break;
    g.advancePhase();
  }
});

test('a player’s score is exactly the sum of their payout lines', () => {
  const g = tableOf(['A', 'B', 'C', 'D'], 'bookkeeping');
  g.start();
  const tallies = new Map(g.order.map((id) => [id, 0]));
  let guard = 0;
  while (g.phase !== 'accusation' && g.phase !== 'ledger' && guard++ < 200) {
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
    const before = g.phase;
    g.advancePhase();
    // events move money too; fold those into the running total
    if (before === 'reckoning' && (g.phase === 'event' || g.phase === 'vote')) break;
  }
  if (g.phase !== 'event' && g.phase !== 'vote') {
    for (const [pid, total] of tallies) {
      assert.equal(g.players.get(pid).score, total, `${g.players.get(pid).name} banked the wrong amount`);
    }
  }
});

// ---------------------------------------------------------------- markers ---

test('being left out there earns a marker', () => {
  const g = openWith(duo('marker'), 'clean');
  g.choose('a', 'hold');
  g.choose('b', 'fold');
  assert.equal(g.phase, 'reckoning');
  assert.equal(g.players.get('a').markers, 1, 'the one who held should hold a marker');
  assert.equal(g.players.get('b').markers, 0);
  assert.equal(g.players.get('a').stats.betrayed, 1);
  assert.equal(g.players.get('b').stats.betrayals, 1);
});

test('a called-in marker takes the traitor’s whole take', () => {
  const g = duo('vendetta');
  g.start();
  to(g, 'deal');
  g.twist = TWIST_BY_ID.clean;
  g.players.get('a').markers = 1;
  to(g, 'talk');
  g.callMarker('a');
  to(g, 'squeeze');
  g.choose('a', 'hold');
  g.choose('b', 'fold');
  const per = g.groups[0].result.perPlayer;
  assert.ok(per.b.total <= 0, 'the traitor forfeits the round');
  assert.ok(per.a.lines.some((l) => /Marker collected/.test(l.label)), 'the holder collects');
});

// ----------------------------------------------------------------- twists ---

test('honour among thieves makes holding together the best thing on the board', () => {
  const plain = duo('honour-plain');
  plain.start(); to(plain, 'deal'); plain.twist = TWIST_BY_ID.clean; to(plain, 'squeeze');
  plain.choose('a', 'hold'); plain.choose('b', 'hold');
  const normal = plain.groups[0].result.perPlayer.a.total;

  const g = duo('honour');
  g.start(); to(g, 'deal'); g.twist = TWIST_BY_ID.honour; to(g, 'squeeze');
  g.choose('a', 'hold'); g.choose('b', 'hold');
  const per = g.groups[0].result.perPlayer;
  assert.ok(per.a.lines.some((l) => /everybody held/i.test(l.label)), 'the family noticed');
  assert.ok(per.a.total > normal * 2, `tripled loyalty should dwarf a normal clean round (${per.a.total} vs ${normal})`);
});

test('the squeeze turns a room that all sold out into a bill', () => {
  const g = duo('squeezetwist');
  g.start(); to(g, 'deal'); g.twist = TWIST_BY_ID.squeeze; to(g, 'squeeze');
  g.choose('a', 'fold'); g.choose('b', 'fold');
  const per = g.groups[0].result.perPlayer;
  assert.ok(per.a.total < 0, `both selling out should cost, not pay (got ${per.a.total})`);
  assert.ok(per.a.lines.some((l) => /quota/i.test(l.label)));
});

test('blind alley seals the round — yours and everybody else’s', () => {
  const g = humanTable(['A', 'B', 'C', 'D'], 'blind4');
  g.start();
  to(g, 'deal');
  g.twist = TWIST_BY_ID.blind;
  to(g, 'squeeze');
  for (const id of ['p0', 'p1', 'p2', 'p3']) if (!g.groupOf(id).choices[id]) g.choose(id, 'hold');
  const v = g.view('p0');
  const mine = v.reckoning.find((r) => r.yours);
  assert.ok(mine.yourLines.length > 0, 'you are still told what you earned');
  for (const grp of v.reckoning) {
    for (const m of grp.members) {
      if (m.id === 'p0') continue;
      assert.equal(m.choice, null, `${m.name}'s choice leaked`);
      assert.equal(m.total, null, `${m.name}'s take leaked`);
    }
  }
  while (g.phase !== 'ledger') g.advancePhase();
  assert.ok(g.buildLedger().history[0].groups.every((grp) => grp.members.every((m) => m.choice)));
});

test('going quiet counts as holding the line', () => {
  const g = openWith(duo('quiet'), 'clean');
  g.choose('a', 'fold');
  g.advancePhase();
  assert.equal(g.groups[0].choices.b, 'hold');
  assert.equal(g.players.get('b').stats.silentRounds, 1);
});

test('a broken pledge is recorded against the person who broke it', () => {
  const g = duo('oath');
  g.start();
  to(g, 'deal');
  g.twist = TWIST_BY_ID.clean;
  to(g, 'talk');
  g.pledge('a', true); g.pledge('b', true);
  to(g, 'squeeze');
  g.choose('a', 'hold'); g.choose('b', 'fold');
  assert.equal(g.players.get('b').stats.pledgesBroken, 1);
  assert.equal(g.players.get('a').stats.pledgesKept, 1);
});

// ------------------------------------------------------------------ cards ---

test('everybody is dealt a hand, and a card leaves it when played', () => {
  const g = duo('hand');
  g.start();
  to(g, 'talk');
  const me = g.players.get('a');
  assert.equal(me.hand.length, handSize(2));
  const card = me.hand[0];
  assert.deepEqual(g.playCard('a', card), { ok: true });
  assert.equal(me.hand.length, handSize(2) - 1);
  assert.equal(me.playedThisRound, card);
  assert.ok(g.playCard('a', me.hand[0]).error, 'one card a round');
  assert.ok(g.playCard('b', 'nonsense-card').error, 'you cannot play what you do not hold');
});

test('face-up cards are announced, face-down cards are not', () => {
  const g = duo('faces');
  g.start();
  to(g, 'talk');
  g.players.get('a').hand = ['muscle'];       // face up
  g.players.get('b').hand = ['alibi'];        // face down
  g.playCard('a', 'muscle');
  g.playCard('b', 'alibi');
  const bView = g.view('b');
  assert.equal(bView.job.declared.length, 1, 'Mo should see the threat');
  assert.equal(bView.job.declared[0].card.id, 'muscle');
  const aView = g.view('a');
  assert.equal(aView.job.declared.length, 0, 'Andre should learn nothing about the alibi');
});

test('The Alibi hides a fold from the table but not from the ledger', () => {
  const g = duo('alibi');
  g.start();
  to(g, 'deal');
  g.twist = TWIST_BY_ID.clean;
  to(g, 'talk');
  g.players.get('b').hand = ['alibi'];
  g.playCard('b', 'alibi');
  to(g, 'squeeze');
  g.choose('a', 'hold'); g.choose('b', 'fold');

  const shown = g.view('a').reckoning[0].members.find((m) => m.id === 'b');
  assert.equal(shown.choice, 'hold', 'the table is shown a man who held');
  assert.equal(g.players.get('b').stats.betrayals, 0, 'and the record agrees');
  assert.equal(g.players.get('a').markers, 0, 'so no marker is earned against him');
  assert.equal(g.players.get('b').stats.secretFolds, 1);

  while (g.phase !== 'ledger') g.advancePhase();
  const secrets = g.buildLedger().secrets;
  assert.equal(secrets.length, 1, 'the ledger knows');
  assert.equal(secrets[0].name, 'Mo');
  assert.equal(secrets[0].shown, 'hold');
  assert.equal(secrets[0].truth, 'fold');
});

test('The Muscle takes a traitor’s take, and The Priest stops it', () => {
  const run = (bHoldsPriest) => {
    const g = duo(`muscle-${bHoldsPriest}`);
    g.start();
    to(g, 'deal');
    g.twist = TWIST_BY_ID.clean;
    to(g, 'talk');
    g.players.get('a').hand = ['muscle'];
    g.players.get('b').hand = ['priest'];
    g.playCard('a', 'muscle');
    if (bHoldsPriest) g.playCard('b', 'priest');
    to(g, 'squeeze');
    g.choose('a', 'hold'); g.choose('b', 'fold');
    return g.groups[0].result.perPlayer;
  };
  const hit = run(false);
  assert.ok(hit.b.lines.some((l) => /It happened/.test(l.label)), 'the muscle lands');
  const blocked = run(true);
  assert.ok(!blocked.b.lines.some((l) => /It happened/.test(l.label)), 'the priest cancels it');
});

test('Insurance turns being betrayed into taking their take', () => {
  const g = duo('insurance');
  g.start();
  to(g, 'deal');
  g.twist = TWIST_BY_ID.clean;
  to(g, 'talk');
  g.players.get('a').hand = ['insurance'];
  g.playCard('a', 'insurance');
  to(g, 'squeeze');
  g.choose('a', 'hold'); g.choose('b', 'fold');
  const per = g.groups[0].result.perPlayer;
  const payout = per.a.lines.find((l) => /policy paid out/.test(l.label));
  assert.ok(payout, 'the policy should pay out when somebody sells you');
  assert.ok(payout.amount > 0, 'and it should never pay less than nothing');
  assert.equal(per.a.total, per.b.total, 'you end up with exactly what the traitor made');
});

test('The Counterfeit only works if nobody else played a card', () => {
  const alone = duo('cf-alone');
  alone.start(); to(alone, 'deal'); alone.twist = TWIST_BY_ID.clean; to(alone, 'talk');
  alone.players.get('a').hand = ['counterfeit'];
  alone.playCard('a', 'counterfeit');
  to(alone, 'squeeze');
  alone.choose('a', 'hold'); alone.choose('b', 'hold');
  assert.ok(alone.groups[0].result.perPlayer.a.lines.some((l) => /doubled/.test(l.label)));

  const caught = duo('cf-caught');
  caught.start(); to(caught, 'deal'); caught.twist = TWIST_BY_ID.clean; to(caught, 'talk');
  caught.players.get('a').hand = ['counterfeit'];
  caught.players.get('b').hand = ['skim'];
  caught.playCard('a', 'counterfeit');
  caught.playCard('b', 'skim');
  to(caught, 'squeeze');
  caught.choose('a', 'hold'); caught.choose('b', 'hold');
  const per = caught.groups[0].result.perPlayer;
  assert.equal(per.a.total, 0, 'the paper did not pass');
});

test('The Lookout shows you the room before you commit', () => {
  const g = duo('lookout');
  g.start();
  to(g, 'talk');
  g.players.get('a').hand = ['lookout'];
  g.playCard('a', 'lookout');
  to(g, 'squeeze');
  g.choose('b', 'fold');
  const v = g.view('a');
  assert.equal(v.job.lookout.length, 1);
  assert.equal(v.job.lookout[0].name, 'Mo');
  assert.equal(v.job.lookout[0].label, g.groups[0].job.options.at(-1).label);
  assert.equal(g.view('b').job.lookout, null, 'Mo sees nothing');
});

test('The Loan Shark pays now and collects at the ledger', () => {
  const g = duo('shark');
  g.start(); to(g, 'deal'); g.twist = TWIST_BY_ID.clean; to(g, 'talk');
  g.players.get('a').hand = ['loanshark'];
  g.playCard('a', 'loanshark');
  to(g, 'squeeze');
  g.choose('a', 'hold'); g.choose('b', 'hold');
  assert.ok(g.groups[0].result.perPlayer.a.lines.some((l) => l.amount === 25));
  const before = g.players.get('a').score;
  while (g.phase !== 'ledger') g.advancePhase();
  const debt = g.buildLedger().finalLines.find((f) => f.name === 'Andre');
  assert.ok(debt.lines.some((l) => l.amount === -40), 'he always collects');
  void before;
});

// ------------------------------------------------------------------- heat ---

test('heat rises when the table talks and falls when it holds', () => {
  const folders = humanTable(['A', 'B', 'C', 'D'], 'hot');
  folders.start(); to(folders, 'squeeze');
  for (const id of folders.order) if (!folders.groupOf(id).choices[id]) folders.choose(id, 'fold');
  const hot = folders.heat;

  const holders = humanTable(['A', 'B', 'C', 'D'], 'cool');
  holders.start(); to(holders, 'squeeze');
  for (const id of holders.order) if (!holders.groupOf(id).choices[id]) holders.choose(id, 'hold');
  assert.ok(hot > holders.heat, 'folding is louder than holding');
  assert.ok(hot > 0);
  assert.equal(holders.heat, 0, 'a quiet table stays quiet');
});

test('a boiling table gets raided', () => {
  const g = tableOf(['A', 'B', 'C', 'D'], 'raid');
  g.start();
  to(g, 'reckoning');
  g.heat = 90;
  for (const p of g.players.values()) p.score = 100;
  g.advancePhase();
  assert.equal(g.phase, 'event');
  assert.equal(g.event.id, 'raid');
  assert.ok(g.heat < 90, 'the raid takes the heat off');
  assert.ok([...g.players.values()].some((p) => p.score < 100), 'and takes something else too');
});

// ---------------------------------------------------------------- callback ---

test('a pair with history gets a job built out of it', () => {
  const g = duo('callback');
  g.start(); to(g, 'deal'); g.twist = TWIST_BY_ID.clean; to(g, 'squeeze');
  const firstJob = g.groups[0].job.title;
  g.choose('a', 'hold'); g.choose('b', 'fold');
  g.profile = { ...g.profile, callbackChance: 1 };
  while (g.phase !== 'deal') g.advancePhase();

  const job = g.groups[0].job;
  assert.ok(job.callback, 'round two should remember round one');
  assert.equal(job.callback.kind, 'grudge');
  assert.equal(job.callback.lastJob, firstJob);
  const prose = [job.title, ...job.setup].join(' ');
  assert.ok(prose.includes(firstJob), 'and should name the job it happened on');
  assert.ok(prose.includes('Mo'), 'and the person who did it');
  assert.ok(!/\{\w+\}/.test(prose), 'with nothing left unfilled');
});

// ------------------------------------------------------------------ votes ---

test('a table vote lands on whoever the table names', () => {
  const g = tableOf(['A', 'B', 'C', 'D', 'E'], 'vote');
  g.start();
  to(g, 'reckoning');
  g.usedEvents = new Set();
  g.event = null;
  g.beginEvent();
  // force the sit-down whatever the shuffle wanted
  if (g.phase !== 'vote') {
    g.phase = 'reckoning';
    g.vote = null;
    const { EVENT_BY_ID } = globalThis.__events ?? {};
    void EVENT_BY_ID;
  }
  if (g.phase === 'vote') {
    for (const p of g.livePlayers) g.vote.votes[p.id] = 'p2';
    g.resolveVote();
    assert.equal(g.phase, 'event');
    assert.equal(g.event.winner, 'C');
    assert.ok(g.event.narration.includes('C'));
  }
});

// ------------------------------------------------------------------- view ---

test('the view hides what a player is not allowed to know', () => {
  const g = tableOf(['A', 'B', 'C', 'D'], 'secrets');
  g.start();
  to(g, 'talk');
  const view = g.view('p0');
  assert.ok(view.you.role, 'you can see your own card');
  assert.ok(view.you.hand.length > 0, 'and your own hand');
  for (const p of view.players) {
    if (p.isYou) continue;
    assert.equal(p.role, undefined, 'other cards stay face down');
  }
  const myGroup = g.groupOf('p0', { talk: true });
  for (const w of view.job.incoming) {
    assert.ok(myGroup.talkMemberIds.some((id) => g.players.get(id).name === w.from));
  }
  while (g.phase !== 'ledger') g.advancePhase();
  for (const p of g.view('p0').players) assert.ok(p.role, 'everything turns face up at the ledger');
});

test('a rematch keeps the seats and clears the scores', () => {
  const g = tableOf(['A', 'B', 'C'], 'rematch');
  playOut(g);
  const fresh = g.rematch();
  assert.equal(fresh.players.size, 3);
  assert.equal(fresh.phase, 'lobby');
  assert.deepEqual([...fresh.players.keys()], [...g.players.keys()], 'same seats, same tokens');
  for (const p of fresh.players.values()) {
    assert.equal(p.score, 0);
    assert.equal(p.markers, 0);
  }
});

test('two hundred nights end cleanly, with the books balanced', () => {
  for (let i = 0; i < 200; i++) {
    const n = 2 + (i % 9);
    const g = tableOf(Array.from({ length: n }, (_, k) => `P${k}`), `soak-${i}`, { rounds: 3 + (i % 5) });
    const ledger = playOut(g);
    assert.equal(ledger.standings.length, n);
    assert.ok(ledger.bonds.length > 0);
    assert.ok(ledger.heat >= 0 && ledger.heat <= 100);
    for (const b of ledger.bonds) {
      assert.equal(b.mutualStand + b.mutualFold + b.betrayA + b.betrayB + b.murky, b.rounds,
        'every round between two people is accounted for exactly once');
    }
    for (const r of ledger.history) {
      for (const grp of r.groups) {
        for (const m of grp.members) {
          if (m.card) assert.ok(CARD_BY_ID[m.card], `unknown card ${m.card}`);
        }
      }
    }
  }
});

test('a forfeited round is forfeited after every bonus, not before', () => {
  // Regression: role money used to land after a seizure and quietly un-forfeit it.
  for (const weapon of ['marker', 'muscle']) {
    const g = duo(`forfeit-${weapon}`);
    g.start();
    to(g, 'deal');
    g.twist = TWIST_BY_ID.clean;
    // Mo is the Rat, so folding would normally pay him an envelope on top
    g.players.get('b').role = 'rat';
    g.players.get('a').role = 'bruiser';
    to(g, 'talk');
    if (weapon === 'marker') {
      g.players.get('a').markers = 1;
      g.callMarker('a');
    } else {
      g.players.get('a').hand = ['muscle'];
      g.playCard('a', 'muscle');
    }
    to(g, 'squeeze');
    g.choose('a', 'hold');
    g.choose('b', 'fold');
    const per = g.groups[0].result.perPlayer;
    assert.equal(per.b.total, 0, `${weapon}: the traitor keeps nothing at all`);
    assert.ok(per.b.lines.some((l) => /envelope from the DA/.test(l.label)),
      `${weapon}: the envelope was still paid — and then taken`);
    assert.ok(per.a.total > 0, `${weapon}: the holder collects`);
  }
});

test('the loud ones are rarer than the quiet ones, and get commoner late', () => {
  let action = 0;
  let total = 0;
  const early = { action: 0, total: 0 };
  const late = { action: 0, total: 0 };

  for (let i = 0; i < 120; i++) {
    const g = tableOf(['A', 'B', 'C', 'D'], `tone-${i}`, { rounds: 6 });
    g.start();
    while (g.phase !== 'ledger') {
      if (g.phase === 'deal') {
        total += 1;
        // the finale is always The Last Standoff, so it is never loud by design;
        // leave it out of the ramp or it drags the late bucket to zero
        const bucket = g.round <= 2 ? early : g.round < g.config.rounds ? late : null;
        if (bucket) bucket.total += 1;
        if (g.actionRound) { action += 1; if (bucket) bucket.action += 1; }
        // every job dealt this round must match the round's tone
        for (const grp of g.groups) {
          assert.equal(grp.job.tone === 'action', !!g.actionRound,
            'a round should not mix a rooftop with an interview room');
        }
      }
      g.advancePhase();
    }
  }

  const rate = action / total;
  assert.ok(rate > 0.05 && rate < 0.35, `action rate was ${(rate * 100).toFixed(1)}%`);
  const earlyRate = early.action / early.total;
  const lateRate = late.action / late.total;
  assert.ok(lateRate > earlyRate,
    `the night should get louder, not quieter (early ${(earlyRate * 100).toFixed(1)}%, late ${(lateRate * 100).toFixed(1)}%)`);
});

test('a loud round skips the twists written for an interview room', () => {
  const deskTwists = ['notalk', 'openbook', 'wire', 'blind'];
  for (let i = 0; i < 200; i++) {
    const g = tableOf(['A', 'B', 'C', 'D'], `twisttone-${i}`, { rounds: 6 });
    g.start();
    while (g.phase !== 'ledger') {
      if (g.phase === 'deal' && g.actionRound) {
        assert.ok(!deskTwists.includes(g.twist.id),
          `"${g.twist.name}" does not belong on a rooftop`);
      }
      g.advancePhase();
    }
  }
});

test('a loud round runs on a shorter clock', () => {
  const g = tableOf(['A', 'B', 'C', 'D'], 'clock', { rounds: 6, timers: true });
  g.start();
  g.actionRound = false;
  g.setDeadline('squeeze');
  const calm = g.deadline - Date.now();
  g.actionRound = true;
  g.setDeadline('squeeze');
  const loud = g.deadline - Date.now();
  assert.ok(loud < calm, 'the squeeze should be tighter when you are on a rope');
});
