// Ghosts: people who aren't at the table. Useful for odd numbers, testing,
// and for giving a group of three the feeling of a crew of six.

export const BOT_NAMES = [
  'Fat Anthony', 'Sheepdog', 'Little Carmine', 'Icepick Renata', 'Two Phones',
  'Mikey Dentist', 'Aunt Gilda', 'The Notary', 'Slow Eddie', 'Patsy Fingers',
  'Gino The Priest', 'Doris From Payroll',
];

export const STRATEGIES = [
  { id: 'titfortat', name: 'gives what he gets' },
  { id: 'grudger', name: 'forgives nothing' },
  { id: 'saint', name: 'has never folded in his life' },
  { id: 'rat', name: 'is already on the phone' },
  { id: 'pavlov', name: 'repeats whatever worked' },
  { id: 'coin', name: 'decides with a coin' },
];

const WHISPERS = {
  titfortat: [
    'You know how I am. I give back exactly what I get.',
    'Straight is straight. Be straight and we’re fine.',
    'I remember last time. That’s all I’ll say.',
  ],
  grudger: [
    'One time. That’s all anybody gets with me. One time.',
    'I’m not a complicated man. I just don’t forget.',
    'We’re good. Stay good.',
  ],
  saint: [
    'I’ve never said a word about anybody and I’m not starting tonight.',
    'My mother watches the news. Think about that.',
    'Hold the line. I always do.',
  ],
  rat: [
    'Us two? Forever. Absolutely. No question at all.',
    'I would take a bullet before I’d say your name.',
    'Relax. Relax! Look at my face. Do I look worried?',
  ],
  pavlov: [
    'Whatever worked last time, let’s do that again.',
    'I got a system. It’s not a good system but it’s a system.',
    'Don’t overthink it.',
  ],
  coin: [
    'I genuinely have not decided and I want you to know that.',
    'Fifty-fifty. I say that with love.',
    'Ask me again in a minute, might be different.',
  ],
};

/** What `pid` did the last time they were on a job with `againstId`. */
export function lastChoiceAgainst(game, pid, againstId) {
  for (let i = game.history.length - 1; i >= 0; i--) {
    for (const g of game.history[i].groups) {
      const ids = g.members.map((m) => m.id);
      if (ids.includes(pid) && ids.includes(againstId)) {
        const m = g.members.find((x) => x.id === pid);
        if (!m) return null;
        return m.held ? 'hold' : m.sold ? 'sell' : 'middle';
      }
    }
  }
  return null;
}

export function everBetrayed(game, pid, byId) {
  for (const round of game.history) {
    for (const g of round.groups) {
      const ids = g.members.map((m) => m.id);
      if (!ids.includes(pid) || !ids.includes(byId)) continue;
      const mine = g.members.find((m) => m.id === pid);
      const theirs = g.members.find((m) => m.id === byId);
      if (mine?.held && theirs?.sold) return true;
    }
  }
  return false;
}

export function botChoice(rng, bot, game, group) {
  const options = group.job.options;
  const loyal = options[0];
  const worst = options[options.length - 1];
  const middles = options.slice(1, -1);
  const others = group.memberIds.filter((x) => x !== bot.id);
  const strategy = bot.strategy ?? 'titfortat';
  const pledgedAtMe = others.some((id) => group.pledges[id]);
  const finalRound = game.round >= game.config.rounds;
  const noise = (p) => rng.chance(p);
  const middle = () => (middles.length ? rng.pick(middles) : worst);

  // What the ghost thinks the room is about to do, in one word.
  let read;
  switch (strategy) {
    case 'saint': read = noise(0.04) ? 'sell' : 'hold'; break;
    case 'rat': read = noise(0.12) ? 'hold' : 'sell'; break;
    case 'coin': read = noise(0.5) ? 'sell' : 'hold'; break;
    case 'grudger':
      read = others.some((id) => everBetrayed(game, bot.id, id)) ? 'sell' : (noise(0.05) ? 'sell' : 'hold');
      break;
    case 'pavlov': {
      const last = game.history[game.history.length - 1];
      const mine = last?.groups.flatMap((g) => g.members).find((m) => m.id === bot.id);
      const earned = last?.groups.reduce((acc, g) => acc + (g.payouts?.[bot.id] ?? 0), 0) ?? 0;
      if (!mine) { read = 'hold'; break; }
      read = earned >= 6 ? (mine.held ? 'hold' : 'sell') : (mine.held ? 'sell' : 'hold');
      break;
    }
    default: {
      const theirLast = others.map((id) => lastChoiceAgainst(game, id, bot.id)).filter(Boolean);
      if (theirLast.includes('sell')) read = 'sell';
      else if (finalRound && noise(0.35)) read = 'sell';
      else if (pledgedAtMe && noise(0.9)) read = 'hold';
      else read = noise(0.1) ? 'sell' : 'hold';
    }
  }

  // A ghost that expects to be sold out reaches for whatever this job offers in
  // the middle, if it offers anything at all.
  if (read === 'sell') return (middles.length && noise(0.45) ? middle() : worst).id;
  if (middles.length && noise(0.18)) return middle().id;
  return loyal.id;
}

export function botWhisper(rng, bot, game, group) {
  const bank = WHISPERS[bot.strategy] ?? WHISPERS.titfortat;
  return rng.pick(bank);
}

/** Bots point at whoever has folded the most in front of them. */
export function botAccusation(rng, bot, game) {
  const folds = new Map();
  for (const round of game.history) {
    for (const g of round.groups) {
      for (const m of g.members) {
        if (m.id === bot.id) continue;
        if (m.sold) folds.set(m.id, (folds.get(m.id) ?? 0) + 1);
      }
    }
  }
  const ranked = [...folds.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length && rng.chance(0.75)) return ranked[0][0];
  const others = game.order.filter((id) => id !== bot.id);
  return rng.pick(others);
}

/** Ghosts play cards too, with roughly the taste of the strategy they are. */
export function botCard(rng, bot, game, group) {
  if (!game.config.cards || bot.playedThisRound) return null;
  if (!bot.hand.length) return null;
  const eagerness = { rat: 0.55, grudger: 0.4, titfortat: 0.35, saint: 0.25, pavlov: 0.35, coin: 0.5 };
  if (!rng.chance(eagerness[bot.strategy] ?? 0.35)) return null;

  const prefer = {
    rat: ['alibi', 'fix', 'counterfeit', 'skim', 'setup'],
    saint: ['insurance', 'godfather', 'split', 'priest'],
    grudger: ['muscle', 'shakedown', 'insurance', 'lawyer'],
    titfortat: ['godfather', 'split', 'lookout', 'insurance'],
    pavlov: ['lookout', 'skim', 'counterfeit', 'lawyer'],
    coin: ['loanshark', 'counterfeit', 'confession', 'setup'],
  }[bot.strategy] ?? [];

  const cardId = bot.hand.find((c) => prefer.includes(c)) ?? rng.pick(bot.hand);
  let targetId = null;
  if (cardId === 'setup' || cardId === 'confession') {
    const pool = cardId === 'setup'
      ? group.memberIds.filter((x) => x !== bot.id)
      : game.order.filter((x) => x !== bot.id);
    if (pool.length === 0) return null;
    targetId = rng.pick(pool);
  }
  return { cardId, targetId };
}

/** In a vote, a ghost points at whoever has hurt it most, or whoever is winning. */
export function botVote(rng, bot, game) {
  const others = game.order.filter((id) => id !== bot.id);
  if (others.length === 0) return bot.id;
  const hurt = others.filter((id) => everBetrayed(game, bot.id, id));
  if (hurt.length && rng.chance(0.7)) return rng.pick(hurt);
  const leader = others
    .map((id) => game.players.get(id))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)[0];
  if (leader && rng.chance(0.6)) return leader.id;
  return rng.pick(others);
}
