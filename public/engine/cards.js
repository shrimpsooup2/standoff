// The deck. One sentence each, and each one should make somebody say
// something out loud.
//
// Face-up cards are announced when they're played. Face-down cards stay
// secret until Monday, unless somebody catches you.

import { money, round5k } from './util.js';
import { forge } from './engines/whispers.js';
import { traits, enemyOf, friendOf } from './bots.js';

const playing = (g) => g.s.phase === 'playing';
const win = (g) => g.s.beat?.window?.kind === 'roll' ? g.s.beat.window : null;
const noWin = (g) => playing(g) && !g.s.beat?.window;
const stageOf = (g, engine, ...stages) => {
  const b = g.s.beat;
  return !!b && !b.window && b.engine === engine && stages.includes(b.stage);
};
const voterIn = (g, p) => stageOf(g, 'vote', 'vote') && g.s.beat.data.voters.includes(p.id);
const insideGrab = (g, p) => stageOf(g, 'grab', 'move') && g.s.beat.data.active.includes(p.id);

function announce(g, text) {
  const b = g.s.beat;
  if (b) b.lines.push(text);
  else g.remember(text);
}

function quiet(g, p, card, what) {
  g.s.quiet = g.s.quiet ?? [];
  g.s.quiet.push({ pid: p.id, card: card.id, night: g.s.week.i, what: what ?? null });
  g.recordFact({ about: p.id, key: `card:${card.id}`, q: `Did ${p.name} play a face-down card tonight?`, a: true, night: g.s.week.n });
}

export const CARDS = {
  // ------------------------------------------------------------ dice --
  'loaded-die': {
    name: 'Loaded Die', face: 'down', kind: 'dice', value: 3, count: 2,
    text: 'The next die anyone rolls comes up 5.',
    when: (g, p) => noWin(g) && !p.armed.loaded,
    play(g, p) { p.armed.loaded = true; return { ok: true }; },
  },
  'lucky-horseshoe': {
    name: 'Lucky Horseshoe', face: 'up', kind: 'dice', window: 'roll', value: 3, count: 3,
    text: 'Add 2 to any roll, after you’ve seen it.',
    when: (g) => !!win(g),
    play(g, p) { const w = win(g); w.mods.push({ by: p.id, label: `${p.name}'s Lucky Horseshoe`, n: 2 }); g.windowChanged(p.id); return { ok: true }; },
  },
  'black-cat': {
    name: 'Black Cat', face: 'up', kind: 'dice', window: 'roll', value: 2, count: 2,
    text: 'Take 2 off any roll, after you’ve seen it.',
    when: (g) => !!win(g),
    play(g, p) { const w = win(g); w.mods.push({ by: p.id, label: `${p.name}'s Black Cat`, n: -2 }); g.windowChanged(p.id); return { ok: true }; },
  },
  'let-it-ride': {
    name: 'Let It Ride', face: 'up', kind: 'dice', window: 'roll', value: 2, count: 2,
    text: 'Reroll the dice. The new roll stands, however bad.',
    when: (g) => !!win(g),
    play(g, p) {
      const w = win(g);
      w.dice = w.dice.map(() => g.dieFace());
      w.mods = w.mods.filter((m) => m.keep);
      g.windowChanged(p.id);
      announce(g, `${p.name} let it ride. New dice.`);
      return { ok: true, silent: true };
    },
  },
  'side-bet': {
    name: 'Side Bet', face: 'up', kind: 'dice', value: 1, count: 2, needs: 'side',
    text: 'Call the next roll of two dice high (7+) or low. Right, and everybody pays you $5k.',
    when: (g, p) => noWin(g) && !p.armed.sideBet,
    play(g, p, a) {
      if (!['high', 'low'].includes(a.side)) return { error: 'High or low?' };
      p.armed.sideBet = a.side;
      announce(g, `${p.name} put money on the next roll coming up ${a.side}.`);
      return { ok: true, silent: true };
    },
  },

  // ----------------------------------------------------------- votes --
  'stuffed-ballot': {
    name: 'Stuffed Ballot', face: 'down', kind: 'vote', value: 2, count: 2,
    text: 'Your vote counts twice.',
    when: (g, p) => voterIn(g, p),
    play(g, p) { g.s.beat.data.weights[p.id] = (g.s.beat.data.weights[p.id] ?? 1) + 1; return { ok: true }; },
  },
  'flip-flop': {
    name: 'Flip-Flop', face: 'up', kind: 'vote', value: 2, count: 1, needs: 'option',
    text: 'Change your vote after the votes are shown.',
    when: (g, p) => stageOf(g, 'vote', 'reveal') && g.s.beat.data.votes[p.id] != null,
    play(g, p, a) {
      const d = g.s.beat.data;
      if (!d.options.some((o) => o.id === a.option)) return { error: 'Change it to what?' };
      d.votes[p.id] = a.option;
      announce(g, `${p.name} changed their mind: ${d.options.find((o) => o.id === a.option).label}.`);
      return { ok: true, silent: true };
    },
  },
  'filibuster': {
    name: 'Filibuster', face: 'up', kind: 'vote', value: 2, count: 1,
    text: 'Throw the vote out and hold it again — no talking this time.',
    when: (g) => stageOf(g, 'vote', 'reveal'),
    play(g, p) {
      const b = g.s.beat;
      b.data.votes = {};
      b.data.weights = {};
      b.data.markers = [];
      b.stage = 'vote';
      g.clockFor('vote');
      announce(g, `${p.name} threw the vote out. Again — and nobody says a word this time.`);
      return { ok: true, silent: true };
    },
  },
  'marker': {
    name: 'Marker', face: 'up', kind: 'vote', value: 2, count: 2, needs: 'player',
    text: 'Call in a favour: one player votes the way you do, this time.',
    when: (g, p) => voterIn(g, p),
    play(g, p, a) {
      const d = g.s.beat.data;
      if (!d.voters.includes(a.target) || a.target === p.id) return { error: 'Somebody with a vote.' };
      d.markers.push({ from: p.id, to: a.target });
      announce(g, `${p.name} called in a marker. ${g.name(a.target)} votes with ${p.name} this time.`);
      return { ok: true, silent: true };
    },
  },
  'dons-ring': {
    name: 'The Don’s Ring', face: 'up', kind: 'wild', value: 4, count: 1,
    text: 'For one vote, yours is the only one that counts.',
    when: (g, p) => voterIn(g, p),
    play(g, p) { g.s.beat.data.don = p.id; announce(g, `${p.name} put the Don's Ring on the table.`); return { ok: true, silent: true }; },
  },

  // ------------------------------------------------------ information --
  'wiretap': {
    name: 'Wiretap', face: 'down', kind: 'info', value: 3, count: 2, needs: 'player',
    text: 'See another player’s cards, their secret and their cash.',
    when: (g) => playing(g),
    play(g, p, a) {
      const t = g.getPlayer(a.target);
      if (!t || t.id === p.id) return { error: 'Whose line?' };
      const sv = g.chapter.secretView(g.ctx(), t);
      const cards = t.cards.map((c) => CARDS[c.id]?.name ?? c.id).join(', ') || 'no cards';
      g.noteTo(p.id, `${t.name}: ${money(t.cash)} in cash. Holding ${cards}. Secret: “${sv.name}” — ${sv.text}`, 'the wire');
      return { ok: true };
    },
  },
  'snitch': {
    name: 'Snitch', face: 'up', kind: 'info', value: 3, count: 3, needs: 'fact',
    text: 'Ask the game a yes-or-no question about something a player did tonight. It answers out loud.',
    when: (g) => playing(g) && (g.s.night?.facts?.length ?? 0) > 0,
    play(g, p, a) {
      const facts = g.s.night.facts;
      const f = facts[Number(a.fact)];
      if (!f) return { error: 'Ask about something that happened.' };
      announce(g, `${p.name} asked: “${f.q}” — ${f.a ? 'YES.' : 'NO.'}`);
      if (f.a && ['angle', 'count', 'sabotage', 'card:sticky-fingers', 'loaded'].includes(f.key) && f.about !== p.id) {
        const c = g.ctx();
        if (f.key === 'angle' || f.key === 'card:sticky-fingers' || (f.key === 'count' && !f.a)) c.stamp(f.about, 'SKIMMER');
        c.grudge(p.id, f.about, 'caught red-handed');
      }
      if (f.key === 'count' && !f.a && f.about !== p.id) {
        const c = g.ctx();
        c.stamp(f.about, 'SKIMMER');
        c.grudge(p.id, f.about, 'skimmed the count');
      }
      return { ok: true, silent: true };
    },
  },
  'peephole': {
    name: 'Peephole', face: 'down', kind: 'info', value: 2, count: 2, needs: 'player',
    text: 'See one player’s choice before you make yours.',
    when: (g) => stageOf(g, 'choose', 'choose') || stageOf(g, 'grab', 'move') || stageOf(g, 'plan', 'commit'),
    play(g, p, a) {
      const b = g.s.beat;
      const t = g.getPlayer(a.target);
      if (!t || t.id === p.id) return { error: 'Whose?' };
      if (b.engine === 'choose') { b.data.peeks[p.id] = t.id; return { ok: true }; }
      const move = b.engine === 'grab' ? b.data.moves[t.id] : b.data.moves[t.id];
      g.noteTo(p.id, move ? `${t.name} chose to ${move}.` : `${t.name} hasn’t decided yet.`, 'the peephole');
      return { ok: true };
    },
  },
  'forgery': {
    name: 'Forgery', face: 'down', kind: 'info', value: 3, count: 2,
    text: 'Change the note you pass. When the truth comes out, it reads as bad intel, not a lie.',
    when: (g, p) => stageOf(g, 'whispers', 'notes') && g.s.beat.data.clues.some((c) => c.holder === p.id) && !g.s.beat.data.notes[p.id],
    play(g, p) { return forge(g, g.s.beat, p.id); },
  },

  // ----------------------------------------------------------- money --
  'sticky-fingers': {
    name: 'Sticky Fingers', face: 'down', kind: 'money', value: 3, count: 2,
    text: 'Take $20k out of the Bag. Everyone sees it drop; nobody sees who.',
    when: (g) => noWin(g) && g.s.bag.total > 0,
    play(g, p) {
      const c = g.ctx();
      const n = c.bagTake(20000);
      p.cash += n;
      p.stats.skimmed = (p.stats.skimmed ?? 0) + n;
      announce(g, `The Bag is ${money(n)} lighter than it was a minute ago.`);
      return { ok: true };
    },
  },
  'cut-me-in': {
    name: 'Cut Me In', face: 'up', kind: 'money', value: 2, count: 1, needs: 'player',
    text: 'Pick a player. You get a quarter of whatever they make tonight.',
    when: (g, p) => noWin(g) && !p.armed.cutMeIn,
    play(g, p, a) {
      const t = g.getPlayer(a.target);
      if (!t || t.id === p.id) return { error: 'Who?' };
      p.armed.cutMeIn = { target: t.id, night: g.s.week.n };
      announce(g, `${p.name} is in for a quarter of whatever ${t.name} makes tonight.`);
      return { ok: true, silent: true };
    },
  },
  'mattress-money': {
    name: 'Mattress Money', face: 'down', kind: 'money', value: 2, count: 2,
    text: 'Hide up to $30k where no arrest, theft or blackmail can reach it.',
    when: (g, p) => noWin(g) && p.cash > 0,
    play(g, p) { const n = Math.min(30000, p.cash); p.cash -= n; p.stash += n; return { ok: true }; },
  },
  'the-fence': {
    name: 'The Fence', face: 'up', kind: 'money', value: 1, count: 2, needs: 'card',
    text: 'Sell another card for $15k, no questions asked.',
    when: (g, p) => playing(g) && p.cards.length > 1,
    play(g, p, a, self) {
      const card = p.cards.find((c) => c.uid === a.card && c.uid !== self.uid);
      if (!card) return { error: 'Sell which?' };
      g.takeCard(p.id, card.uid);
      g.discardCard(card);
      p.cash += 15000;
      return { ok: true, silent: true };
    },
  },

  // ------------------------------------------------------------ heat --
  'alibi': {
    name: 'Alibi', face: 'down', kind: 'heat', value: 3, count: 3, passive: true,
    text: 'The next heat you’d take doesn’t land. Works by itself.',
  },
  'fall-guy': {
    name: 'Fall Guy', face: 'up', kind: 'heat', value: 2, count: 2, needs: 'player',
    text: 'Name a player. The next heat you’d take goes to them instead.',
    when: (g, p) => noWin(g) && !p.armed.fallGuy,
    play(g, p, a) {
      const t = g.getPlayer(a.target);
      if (!t || t.id === p.id) return { error: 'Somebody else.' };
      p.armed.fallGuy = t.id;
      announce(g, `${p.name} has a Fall Guy lined up: ${t.name}.`);
      return { ok: true, silent: true };
    },
  },
  'good-lawyer': {
    name: 'Good Lawyer', face: 'down', kind: 'heat', value: 4, count: 2, passive: true,
    text: 'If you’d be arrested, you aren’t. Works by itself.',
  },
  'safe-house': {
    name: 'Safe House', face: 'up', kind: 'heat', value: 2, count: 1,
    text: 'Lose all your heat. You sit out the next night.',
    when: (g, p) => noWin(g) && p.heat > 0,
    play(g, p) {
      p.heat = 0;
      p.lowUntil = g.s.week.n + 1;
      announce(g, `${p.name} is lying low at a cousin's in Yonkers until things cool off.`);
      return { ok: true, silent: true };
    },
  },

  // ---------------------------------------------------------- people --
  'dirt': {
    name: 'Dirt', face: 'up', kind: 'people', value: 3, count: 2, needs: 'player',
    text: 'Pick a player: they sign over 20% of their Monday money, or you read their secret aloud.',
    when: (g) => noWin(g),
    play(g, p, a) {
      const t = g.getPlayer(a.target);
      if (!t || t.id === p.id) return { error: 'On whom?' };
      g.s.offers.push({ id: `o${++g.s.uid}`, kind: 'dirt', from: p.id, to: t.id });
      announce(g, `${p.name} has dirt on ${t.name}, and wants something for it.`);
      return { ok: true, silent: true };
    },
  },
  'kiss-of-death': {
    name: 'Kiss of Death', face: 'up', kind: 'people', value: 2, count: 1, needs: 'player',
    text: 'Mark a player. If they’re arrested, you get half of what’s seized.',
    when: (g) => noWin(g),
    play(g, p, a) {
      const t = g.getPlayer(a.target);
      if (!t || t.id === p.id) return { error: 'Whom?' };
      p.armed.kiss = [...(p.armed.kiss ?? []), t.id];
      g.ctx().betray(p.id, t.id, 'the kiss of death');
      announce(g, `${p.name} kissed ${t.name} on both cheeks. Everybody knows what that means.`);
      return { ok: true, silent: true };
    },
  },
  'rumour-mill': {
    name: 'Rumour Mill', face: 'up', kind: 'people', value: 1, count: 2, needs: 'player', words: ['RAT', 'SKIMMER', 'LIAR'],
    text: 'Stamp RAT, SKIMMER or LIAR on a player’s seat. It stays until they pay Nonna $10k to wipe it.',
    when: (g) => noWin(g),
    play(g, p, a) {
      const t = g.getPlayer(a.target);
      if (!t) return { error: 'On whom?' };
      if (!['RAT', 'SKIMMER', 'LIAR'].includes(a.word)) return { error: 'RAT, SKIMMER or LIAR.' };
      g.ctx().stamp(t.id, a.word);
      announce(g, `Word is going round that ${t.name} is a ${a.word.toLowerCase()}. Nobody will say who started it.`);
      return { ok: true, silent: true };
    },
  },
  'wrong-number': {
    name: 'Wrong Number', face: 'up', kind: 'people', value: 2, count: 1, needs: 'player',
    text: 'Send a player home: they sit out the next beat. No risk, no reward.',
    when: (g) => noWin(g),
    play(g, p, a) {
      const t = g.getPlayer(a.target);
      if (!t) return { error: 'Whom?' };
      t.benchNext = true;
      announce(g, `${t.name} got a phone call that turned out to be nothing. It'll take them a while.`);
      return { ok: true, silent: true };
    },
  },
  'cannoli': {
    name: 'Cannoli', face: 'up', kind: 'people', value: 1, count: 1, needs: 'player+card',
    text: 'Leave the gun. Give somebody a card; they give you one back, their choice.',
    when: (g, p) => noWin(g) && p.cards.length > 1,
    play(g, p, a, self) {
      const t = g.getPlayer(a.target);
      const card = p.cards.find((c) => c.uid === a.card && c.uid !== self.uid);
      if (!t || t.id === p.id || !card) return { error: 'Which card, to whom?' };
      g.takeCard(p.id, card.uid);
      g.s.offers.push({ id: `o${++g.s.uid}`, kind: 'cannoli', from: p.id, to: t.id, held: card });
      announce(g, `${p.name} left the gun and took the cannoli: a card for ${t.name}, and one expected back.`);
      return { ok: true, silent: true };
    },
  },
  'confession': {
    name: 'Confession', face: 'up', kind: 'people', value: 1, count: 1,
    text: 'Read your secret out loud. Everybody pays you $5k for your honesty — Nonna insists.',
    when: (g) => noWin(g),
    play(g, p) {
      const sv = g.chapter.secretView(g.ctx(), p);
      let got = 0;
      for (const q of g.s.players) {
        if (q.id === p.id) continue;
        const n = Math.min(5000, q.cash);
        q.cash -= n; got += n;
      }
      p.cash += got;
      p.secretOut = true;
      announce(g, `${p.name} confessed: “${sv.name}” — ${sv.text} Nonna made everybody put in five. ${money(got)}.`);
      return { ok: true, silent: true };
    },
  },
  'nonnas-blessing': {
    name: 'Nonna’s Blessing', face: 'down', kind: 'people', value: 3, count: 2,
    text: 'Undo the last heat you took, or get back what you last lost, tonight.',
    when: (g, p) => noWin(g) && ((p.lastHeat?.night === g.s.week.n && p.heat > 0) || (p.lastLoss?.night === g.s.week.n && p.lastLoss.amount > 0)),
    play(g, p) {
      if (p.lastHeat?.night === g.s.week.n && p.heat > 0) { p.heat = Math.max(0, p.heat - p.lastHeat.n); p.lastHeat = null; return { ok: true }; }
      if (p.lastLoss?.night === g.s.week.n) { p.cash += p.lastLoss.amount; p.lastLoss = null; return { ok: true }; }
      return { error: 'Nothing to undo.' };
    },
  },

  // ------------------------------------------------------------ wild --
  'musical-chairs': {
    name: 'Musical Chairs', face: 'up', kind: 'wild', value: 2, count: 1,
    text: 'Everybody passes their cards to the left.',
    when: (g) => noWin(g),
    play(g, p, a, self) {
      g.takeCard(p.id, self.uid);
      const ps = g.s.players;
      const hands = ps.map((q) => q.cards);
      ps.forEach((q, i) => { q.cards = hands[(i - 1 + ps.length) % ps.length]; });
      g.discardCard(self);
      announce(g, `${p.name} called Musical Chairs. Everybody passed their cards to the left.`);
      return { ok: true, silent: true, consumed: true };
    },
  },
  'switcheroo': {
    name: 'Switcheroo', face: 'up', kind: 'wild', value: 2, count: 1, needs: 'player',
    text: 'Swap all your cards with another player’s.',
    when: (g) => noWin(g),
    play(g, p, a, self) {
      const t = g.getPlayer(a.target);
      if (!t || t.id === p.id) return { error: 'With whom?' };
      g.takeCard(p.id, self.uid);
      g.discardCard(self);
      [p.cards, t.cards] = [t.cards, p.cards];
      announce(g, `${p.name} and ${t.name} swapped hands. Only one of them wanted to.`);
      return { ok: true, silent: true, consumed: true };
    },
  },
  'hot-potato': {
    name: 'Hot Potato', face: 'up', kind: 'wild', value: 3, count: 1, needs: 'player',
    text: 'Give a player all of your heat.',
    when: (g, p) => noWin(g) && p.heat > 0,
    play(g, p, a) {
      const t = g.getPlayer(a.target);
      if (!t || t.id === p.id) return { error: 'To whom?' };
      const n = p.heat;
      p.heat = 0;
      announce(g, `${p.name} handed ${t.name} a hot potato: ${n} heat.`);
      g.ctx().heat(t.id, n, 'a hot potato');
      g.ctx().grudge(t.id, p.id, 'hot potato');
      return { ok: true, silent: true };
    },
  },

  // --------------------------------------------------------- the job --
  'cut-the-wires': {
    name: 'Cut the Wires', face: 'down', kind: 'job', value: 3, count: 2,
    text: 'In a heist: no alarm roll this round.',
    when: (g, p) => insideGrab(g, p) && !g.s.beat.data.wires,
    play(g) { g.s.beat.data.wires = true; return { ok: true }; },
  },
  'getaway-car': {
    name: 'Getaway Car', face: 'up', kind: 'job', value: 3, count: 2,
    text: 'In a heist: grab this round, and you’re out before the alarm with everything.',
    when: (g, p) => insideGrab(g, p) && g.s.beat.data.moves[p.id] === 'grab',
    play(g, p) { g.s.beat.data.getaway.push(p.id); return { ok: true }; },
  },
  'inside-job': {
    name: 'Inside Job', face: 'down', kind: 'job', value: 3, count: 1,
    text: 'In a heist: double your share this round. The alarm gets twitchier for everybody.',
    when: (g, p) => insideGrab(g, p) && !g.s.beat.data.moves[p.id],
    play(g, p) {
      const d = g.s.beat.data;
      d.moves[p.id] = 'grab';
      d.hauls[p.id] = (d.hauls[p.id] ?? 0) + (d.pots[d.round - 1] ?? 0) / Math.max(1, d.active.length);
      d.hauls[p.id] = round5k(d.hauls[p.id]);
      d.bump += 1;
      g.ctx().fact(p.id, 'angle', `Did ${p.name} take more than their cut tonight?`, true);
      return { ok: true };
    },
  },

  // --------------------------------------------------- one of a kind --
  'ledger-page': {
    name: 'A Page of the Ledger', face: 'up', kind: 'special', value: 4, unique: true, needs: null,
    text: 'Worth $30k on Monday. The name on it gives you dirt on them — play it to use it, and lose the page. Arrested holding it, and Prout has it.',
    when: (g, p, card) => noWin(g) && !!card?.about && card.about !== p.id && g.hasPlayer(card.about),
    play(g, p, a, self) {
      g.s.offers.push({ id: `o${++g.s.uid}`, kind: 'dirt', from: p.id, to: self.about });
      announce(g, `${p.name} put a page of Sal's ledger on the table, and ${g.name(self.about)}'s name is on it.`);
      return { ok: true, silent: true };
    },
  },
  'the-piece': {
    name: 'Sal’s Revolver', face: 'up', kind: 'special', value: 3, unique: true, window: 'roll', keep: true,
    text: 'Once a night, add 2 to a roll you’re in. If you’re arrested with it, the Case File grows.',
    when: (g, p) => { const w = win(g); return !!w && w.who.includes(p.id) && !w.noMuscle && p.used.piece !== g.s.week.n; },
    play(g, p) { p.used.piece = g.s.week.n; win(g).mods.push({ by: p.id, label: `${p.name} shows Sal's revolver`, n: 2 }); g.windowChanged(p.id); return { ok: true }; },
  },
  'the-photo': {
    name: 'The Photo', face: 'up', kind: 'special', value: 5, unique: true,
    text: 'Prout at a Castellano wedding in 2019, holding a cannoli. Play it and the Case File drops by two.',
    when: (g) => noWin(g),
    play(g, p) { g.ctx().caseFile(-2, `${p.name} sent Prout a photograph`); g.s.flags.photoUsed = p.id; return { ok: true }; },
  },
  'seed-tin': {
    name: 'Sal’s Seed Tin', face: 'up', kind: 'special', value: 2, unique: true,
    text: 'Forty years of tomato seeds. Give them to Nonna and she’ll give you her blessing.',
    when: (g) => noWin(g),
    play(g, p, a, self) {
      g.s.flags.seedTin = p.id;
      g.giveCard(p.id, 'nonnas-blessing');
      announce(g, `${p.name} brought Nonna Sal's tomato seeds. She held the tin for a long time.`);
      return { ok: true, silent: true };
    },
  },
};

export function handLimit(p) {
  return p.job === 'newguy' ? 4 : 3;
}

/** The starting deck. */
export function buildDeck() {
  const out = [];
  for (const [id, c] of Object.entries(CARDS)) {
    if (c.unique) continue;
    for (let i = 0; i < (c.count ?? 1); i++) out.push(id);
  }
  return out;
}

export function canPlay(g, p, card) {
  const def = CARDS[card.id];
  if (!def || def.passive || !def.when) return false;
  if (g.s.phase !== 'playing') return false;
  if (g.isAway(p) && p.jailUntil != null && p.jailUntil >= g.s.week.n) return false;
  try { return !!def.when(g, p, card); } catch { return false; }
}

export function cardView(g, p, card) {
  const def = CARDS[card.id] ?? { name: card.id, text: '' };
  const view = {
    uid: card.uid, id: card.id, name: def.name, face: def.face ?? 'up', kind: def.kind ?? 'misc',
    text: card.line ? `${def.text} — “${card.line}”` : def.text,
    passive: !!def.passive, needs: def.needs ?? null, words: def.words ?? null,
    playable: canPlay(g, p, card),
  };
  if (def.needs === 'fact' && view.playable) {
    view.facts = (g.s.night?.facts ?? []).map((f, i) => ({ i, q: f.q })).filter((f) => !f.q.includes(p.name + ' ') || true);
  }
  if (def.needs === 'option' && view.playable) view.options = g.s.beat.data.options.map((o) => ({ id: o.id, label: o.label }));
  return view;
}

export function playCard(g, p, a) {
  const card = p.cards.find((c) => c.uid === a.uid);
  if (!card) return { error: 'You don’t have that card.' };
  const def = CARDS[card.id];
  if (!def) return { error: 'What is that?' };
  if (def.passive) return { error: 'That one works by itself.' };
  if (!canPlay(g, p, card)) return { error: 'Not now.' };
  const res = def.play(g, p, a, card);
  if (!res?.ok) return res ?? { error: 'Nothing happened.' };
  if (!def.keep && !res.consumed) {
    g.takeCard(p.id, card.uid);
    g.discardCard(card);
  }
  p.stats.cards = (p.stats.cards ?? 0) + 1;
  if (def.window === 'roll') p.stats.rollCards = (p.stats.rollCards ?? 0) + 1;
  if (def.face === 'down') quiet(g, p, card);
  else if (!res.silent) announce(g, `${p.name} played ${def.name}.`);
  g.bump();
  return { ok: true };
}

/**
 * A bot deciding whether to do something to the dice. Returns true if it
 * played anything. It helps rolls it wants to succeed and, if it is the rat
 * or holding a grudge against the crew, occasionally hurts them.
 */
export function autoCard(g, p, kind) {
  if (kind !== 'roll') return false;
  const w = g.s.beat?.window;
  if (!w || w.target == null) return false;
  const total = g.windowTotal(w);
  const face = w.clampFace ? Math.max(1, Math.min(6, total)) : total;
  const succeeding = face >= w.target;
  const involved = w.who.includes(p.id);
  const tr = traits(p);
  const wantsFail = p.secret?.id === 'rat' && g.rng() < 0.5 && !involved;
  const find = (id) => p.cards.find((c) => c.id === id);
  if (!succeeding && !wantsFail && (involved || tr.honesty > 0.6)) {
    const short = w.target - face;
    if (p.job === 'muscle' && p.used.muscle !== g.s.week.n && involved && !w.noMuscle && short <= 2) {
      p.used.muscle = g.s.week.n;
      w.mods.push({ by: p.id, label: `${p.name} leans on it`, n: 2 });
      g.windowChanged(p.id);
      return true;
    }
    if (g.canMechanic(p, w) && short > 0) return g.useMechanic(p).ok;
    const shoe = find('lucky-horseshoe');
    if (shoe && short <= 2 && g.rng() < 0.8) return playCard(g, p, { uid: shoe.uid }).ok;
    const piece = find('the-piece');
    if (piece && short <= 2 && involved && !w.noMuscle && p.used.piece !== g.s.week.n) return playCard(g, p, { uid: piece.uid }).ok;
    const ride = find('let-it-ride');
    if (ride && short >= 4 && g.rng() < 0.6) return playCard(g, p, { uid: ride.uid }).ok;
  }
  if (succeeding && wantsFail) {
    const cat = find('black-cat');
    if (cat && face - w.target < 2) return playCard(g, p, { uid: cat.uid }).ok;
  }
  return false;
}

export { friendOf, enemyOf };
