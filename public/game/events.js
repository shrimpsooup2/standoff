// Things that happen to the table between jobs. Some land on everybody at
// once, some need a vote, and one of them is just a quiet week, which is worse.
//
// An event's `apply` returns { narration, lines } and may reach into the game:
// money, markers, heat, the next round's rules.

const clampHeat = (g) => { g.heat = Math.max(0, Math.min(100, Math.round(g.heat))); };

function lastRound(game) {
  return game.history[game.history.length - 1] ?? null;
}

function choicesLastRound(game) {
  const r = lastRound(game);
  const out = new Map();
  if (!r) return out;
  for (const g of r.groups) for (const m of g.members) out.set(m.id, m.choice);
  return out;
}

function pay(game, id, amount, lines, label) {
  const p = game.players.get(id);
  if (!p) return;
  p.score += amount;
  lines.push({ name: p.name, label, amount });
}

export const EVENTS = [
  {
    id: 'raid',
    name: 'The Raid',
    minPlayers: 2,
    weight: 0,               // heat pulls this one in, not the shuffle
    line: 'Four vans at six in the morning, all of them on the same street, none of them a surprise to anybody who had been paying attention to how loud this table had become.',
    apply(game) {
      const lines = [];
      const choices = choicesLastRound(game);
      for (const p of game.players.values()) {
        const bite = choices.get(p.id) === 'fold' ? 0.3 : 0.12;
        const loss = Math.round(Math.max(0, p.score) * bite);
        if (loss > 0) pay(game, p.id, -loss, lines, choices.get(p.id) === 'fold' ? 'They knew where to look' : 'Everybody pays for the noise');
      }
      game.heat = 30;
      clampHeat(game);
      return {
        narration: 'They took the doors off three houses and a social club. Everybody lost something. The people who had been talking lost more, which is either justice or just good record-keeping on somebody else’s part.',
        lines,
      };
    },
  },
  {
    id: 'funeral',
    name: 'The Funeral',
    minPlayers: 2,
    weight: 8,
    line: 'Sonny Bracco, eighty-one, in his sleep, which in this business counts as a scandal.',
    apply(game) {
      const lines = [];
      const n = game.players.size;
      const each = 8;
      let pot = 0;
      for (const p of game.players.values()) { pay(game, p.id, -each, lines, 'Into the envelope'); pot += each; }
      const widow = [...game.players.values()].find((p) => p.role === 'widow');
      if (widow) pay(game, widow.id, pot, lines, 'The envelope was handed to you, obviously');
      return {
        narration: widow
          ? `Everybody put in. The envelope went to the family, which in this case means it went to ${widow.name}, who accepted it with both hands and a face that gave away nothing.`
          : `Everybody put in. Nobody counted it in front of anybody. ${n} people stood in a cold church and thought about their own arrangements.`,
        lines,
      };
    },
  },
  {
    id: 'windfall',
    name: 'The Shipment Came In',
    minPlayers: 2,
    weight: 9,
    line: 'It arrived early, intact, and unopened, which has happened perhaps four times in the history of this organisation.',
    apply(game) {
      const lines = [];
      const choices = choicesLastRound(game);
      const held = [...game.players.values()].filter((p) => choices.get(p.id) === 'stand');
      const crowd = held.length > 0 ? held : [...game.players.values()];
      const cut = Math.round(60 / crowd.length) + 8;
      for (const p of crowd) pay(game, p.id, cut, lines, held.length ? 'A cut, for the ones who held' : 'A cut, for everybody');
      return {
        narration: held.length === 0
          ? 'Nobody held the line last time, so the cut got split by everybody equally, which nobody enjoyed and everybody took.'
          : `The cut went to the people who held the line on the last job: ${crowd.map((p) => p.name).join(', ')}. It was not announced that way. It did not need to be.`,
        lines,
      };
    },
  },
  {
    id: 'audit',
    name: 'The Audit',
    minPlayers: 3,
    weight: 8,
    line: 'Somebody at the state level has started pulling on a thread, and threads at the state level always start at the top of the pile.',
    apply(game) {
      const lines = [];
      const rich = [...game.players.values()].sort((a, b) => b.score - a.score)[0];
      if (!rich) return { narration: 'Nothing to audit.', lines };
      const loss = Math.round(Math.max(0, rich.score) * 0.16);
      pay(game, rich.id, -loss, lines, 'They start with whoever is winning');
      return {
        narration: `They went straight at ${rich.name}, because they always go straight at whoever looks like they are having a good year. Everybody else spent the week being extremely helpful and extremely uninvolved.`,
        lines,
      };
    },
  },
  {
    id: 'leak',
    name: 'The Leak',
    minPlayers: 3,
    weight: 8,
    line: 'A file went from one desk to another desk and then, briefly, onto a third desk that nobody can account for.',
    apply(game, rng) {
      const hidden = [...game.players.values()].filter((p) => !p.roleRevealed);
      if (hidden.length === 0) return { narration: 'There was nothing left to leak. Everybody already knows what everybody is.', lines: [] };
      const mark = rng.pick(hidden);
      mark.roleRevealed = true;
      return {
        narration: `${mark.name}’s arrangement is now common knowledge at this table. Nobody has said a word about it out loud and nobody is going to. It will simply inform everything from here.`,
        lines: [],
        reveal: mark.id,
      };
    },
  },
  {
    id: 'amnesty',
    name: 'Amnesty',
    minPlayers: 2,
    weight: 7,
    line: 'A new DA, an old case, and a filing deadline that somebody in an office missed by four days.',
    apply(game) {
      let cleared = 0;
      for (const p of game.players.values()) { cleared += p.markers; p.markers = 0; }
      game.heat -= 35;
      clampHeat(game);
      return {
        narration: cleared
          ? `Every marker at this table is void. ${cleared} outstanding debt${cleared === 1 ? '' : 's'}, wiped by a clerical error in a building none of you have ever been in. Everybody is square, officially, and nobody feels square.`
          : 'Nobody was owed anything, so amnesty cost nothing and meant nothing, and the heat came off anyway.',
        lines: [],
      };
    },
  },
  {
    id: 'phonecall',
    name: 'The Phone Call',
    minPlayers: 3,
    weight: 9,
    line: 'Somebody’s phone rang at a quarter to one. Everybody at this table knows somebody’s phone rang. Nobody knows whose.',
    apply(game) {
      const lines = [];
      const ranked = [...game.players.values()].sort((a, b) => b.stats.folds - a.stats.folds);
      const mark = ranked[0];
      if (!mark || mark.stats.folds === 0) {
        return { narration: 'The phone rang and rang and nobody in this crew picked it up, which has never happened before and will be discussed for years.', lines };
      }
      pay(game, mark.id, 18, lines, 'A quiet arrangement, off the books');
      return {
        narration: 'One person at this table got an offer tonight and took it, privately, for money that does not appear in anybody’s share. You are all being told that this happened. You are not being told who.',
        lines,
        secret: true,
      };
    },
  },
  {
    id: 'wake',
    name: 'The Wake',
    minPlayers: 3,
    weight: 8,
    line: 'Everybody came. Everybody always comes. It is the one thing this crew has never failed to do.',
    apply(game) {
      const lines = [];
      const choices = choicesLastRound(game);
      const folded = [...game.players.values()].filter((p) => choices.get(p.id) === 'fold');
      const held = [...game.players.values()].filter((p) => choices.get(p.id) === 'stand');
      if (folded.length === 0 || held.length === 0) {
        return { narration: 'Everybody drank, nobody settled anything, and the bill was split down the middle without a word.', lines };
      }
      let pot = 0;
      for (const p of folded) { pay(game, p.id, -11, lines, 'You were expected to contribute'); pot += 11; }
      const cut = Math.round(pot / held.length);
      for (const p of held) pay(game, p.id, cut, lines, 'The family looks after its own');
      return {
        narration: `The ones who folded on the last job paid for the room, the food and the flowers. Nobody asked them to. It was simply understood, in the way that everything at a wake is understood.`,
        lines,
      };
    },
  },
  {
    id: 'debt',
    name: 'The Old Debt',
    minPlayers: 3,
    weight: 7,
    line: 'It goes back years and nobody disputes it, they just keep not settling it.',
    apply(game) {
      const lines = [];
      const sorted = [...game.players.values()].sort((a, b) => b.score - a.score);
      const top = sorted[0];
      const bottom = sorted[sorted.length - 1];
      if (!top || !bottom || top.id === bottom.id) return { narration: 'It was settled quietly and nobody is saying how.', lines };
      const amount = Math.min(24, Math.max(8, Math.round((top.score - bottom.score) * 0.18)));
      pay(game, top.id, -amount, lines, `Settled with ${bottom.name}`);
      pay(game, bottom.id, amount, lines, `Settled by ${top.name}`);
      return {
        narration: `${top.name} paid ${bottom.name} what was owed, in cash, in front of two witnesses, and then both of them said it was nothing. It was not nothing.`,
        lines,
      };
    },
  },
  {
    id: 'newlawyer',
    name: 'The New Lawyer',
    minPlayers: 2,
    weight: 9,
    line: 'She is thirty-one, she has never lost, and she has taken all of you on at once, which should worry somebody.',
    apply(game) {
      game.dealCards = 1;
      return {
        narration: 'Everybody at this table picks up something new. What it is, is your business. What everybody does with it is going to be the whole problem.',
        lines: [],
      };
    },
  },
  {
    id: 'freshhand',
    name: 'The Card Game',
    minPlayers: 2,
    weight: 7,
    line: 'It ran until four and stopped being about the cards somewhere around two.',
    apply(game) {
      game.redealHands = true;
      return {
        narration: 'Everything anybody was holding went back into the deck and came out again in a different order. Whatever plan you had, it is somebody else’s plan now.',
        lines: [],
      };
    },
  },
  {
    id: 'wiretap',
    name: 'The Wiretap Warrant',
    minPlayers: 2,
    weight: 8,
    line: 'It was granted on a Tuesday by a judge who plays golf with nobody.',
    apply(game) {
      game.forcedTwist = 'openbook';
      return {
        narration: 'Everything anybody swears to on the next job will be audible to everybody. There is no private word at this table until this comes off.',
        lines: [],
      };
    },
  },
  {
    id: 'bosswatching',
    name: 'The Old Man Is Watching',
    minPlayers: 2,
    weight: 8,
    line: 'He has come downstairs, which he does not do, and he has sat at the back, which he has never done.',
    apply(game) {
      game.forcedTwist = 'honour';
      return {
        narration: 'He is not going to say anything. He is going to sit at the back of the room during the next job and watch who holds the line, and everybody in this crew knows exactly what that is worth.',
        lines: [],
      };
    },
  },
  {
    id: 'favourowed',
    name: 'A Favour Owed',
    minPlayers: 3,
    weight: 7,
    line: 'Somebody has been left out there more than anybody should be, and somebody upstairs noticed.',
    apply(game) {
      const ranked = [...game.players.values()].sort((a, b) => b.stats.betrayed - a.stats.betrayed);
      const mark = ranked[0];
      if (!mark || mark.stats.betrayed === 0) {
        return { narration: 'Nobody has been badly enough treated to qualify, which is a first for this table.', lines: [] };
      }
      mark.markers += 2;
      mark.stats.markersEarned += 2;
      return {
        narration: `${mark.name} has been handed two markers, unprompted, by people who do not usually hand out anything. Everybody saw it happen. That was the point of doing it where everybody could see.`,
        lines: [],
      };
    },
  },
  {
    id: 'quiet',
    name: 'A Quiet Week',
    minPlayers: 2,
    weight: 8,
    line: 'Nothing happened. Genuinely nothing.',
    apply(game) {
      game.heat -= 12;
      clampHeat(game);
      return {
        narration: 'No calls, no vans, no envelopes, no funerals. Everybody had dinner with their families and slept badly for reasons they could not name.',
        lines: [],
      };
    },
  },

  // ---- votes: the whole table decides, out loud, with their names on it ----
  {
    id: 'sitdown',
    name: 'The Sit-Down',
    kind: 'vote',
    minPlayers: 4,
    weight: 11,
    line: 'Everybody in one room, one chair in the middle of it, and a decision that has to be made tonight.',
    question: 'Somebody has to take the fall for the last job. The table decides who.',
    resolve(game, targetId) {
      const lines = [];
      const mark = game.players.get(targetId);
      if (!mark) return { narration: 'The table could not agree and the room emptied out, which is its own answer.', lines };
      const loss = Math.round(Math.max(12, Math.max(0, mark.score) * 0.22));
      pay(game, mark.id, -loss, lines, 'The table chose you');
      const others = [...game.players.values()].filter((p) => p.id !== mark.id);
      const cut = Math.round(loss / Math.max(1, others.length));
      for (const p of others) pay(game, p.id, cut, lines, 'Your share of somebody else’s bad night');
      mark.markers += 1;
      mark.stats.markersEarned += 1;
      return {
        narration: `${mark.name} takes it. The vote was taken in front of ${mark.name}, by people ${mark.name} has worked with all night, and everybody had to say it out loud. ${mark.name} walks away with a marker and a very long memory.`,
        lines,
      };
    },
  },
  {
    id: 'promotion',
    name: 'The Promotion',
    kind: 'vote',
    minPlayers: 4,
    weight: 10,
    line: 'A seat has opened up. It is not a big seat. It is, however, a seat.',
    question: 'One person gets made tonight. The table decides who deserves it.',
    resolve(game, targetId) {
      const lines = [];
      const mark = game.players.get(targetId);
      if (!mark) return { narration: 'Nobody could agree, so the seat stays empty, which suits several people.', lines };
      pay(game, mark.id, 30, lines, 'Made');
      game.promoteId = mark.id;
      return {
        narration: `${mark.name} gets the seat, the envelope, and something extra to hold. Everybody who voted for ${mark.name} is now, in a small way, invested in what ${mark.name} does next. Everybody who didn’t is now, in a small way, remembered.`,
        lines,
      };
    },
  },
  {
    id: 'invitation',
    name: 'Somebody Should Lie Low',
    kind: 'vote',
    minPlayers: 5,
    weight: 9,
    line: 'One of you is too hot to be seen on the next job. That is a fact. Which one is a decision.',
    question: 'The table picks one person to sit the next job out. They take a flat, safe, boring payment.',
    resolve(game, targetId) {
      const mark = game.players.get(targetId);
      if (!mark) return { narration: 'Nobody could agree, so everybody works, which is how people get caught.', lines: [] };
      game.sitOutId = targetId;
      return {
        narration: `${mark.name} sits the next one out, on the table’s instruction, and will be paid a flat rate for a job ${mark.name} is not allowed anywhere near. Whether this is protection or exclusion is the sort of thing that only becomes clear later.`,
        lines: [],
      };
    },
  },
  {
    id: 'partnership',
    name: 'The Arrangement',
    kind: 'vote',
    minPlayers: 5,
    weight: 9,
    line: 'It has been decided upstairs that two people at this table need to spend some time together.',
    question: 'The table picks one person. They are locked in with whoever the table trusts least to be near them.',
    resolve(game, targetId) {
      const mark = game.players.get(targetId);
      if (!mark) return { narration: 'No name came out of the room.', lines: [] };
      game.forcedPairId = targetId;
      return {
        narration: `${mark.name} has been assigned a partner for the next job, chosen by the table, from among the people ${mark.name} has the most history with. Nobody is pretending this is a coincidence.`,
        lines: [],
      };
    },
  },
];

export const EVENT_BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

export function pickEvent(rng, game) {
  const n = game.players.size;
  const used = game.usedEvents ?? new Set();
  let pool = EVENTS.filter((e) => e.weight > 0 && n >= e.minPlayers && !used.has(e.id));
  if (pool.length === 0) pool = EVENTS.filter((e) => e.weight > 0 && n >= e.minPlayers);
  const total = pool.reduce((s, e) => s + e.weight, 0);
  let roll = rng() * total;
  for (const e of pool) {
    roll -= e.weight;
    if (roll <= 0) return e;
  }
  return pool[0];
}
