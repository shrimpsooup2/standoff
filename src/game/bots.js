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
        return g.members.find((m) => m.id === pid)?.choice ?? null;
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
      const mine = g.members.find((m) => m.id === pid)?.choice;
      const theirs = g.members.find((m) => m.id === byId)?.choice;
      if (mine === 'stand' && theirs === 'fold') return true;
    }
  }
  return false;
}

export function botChoice(rng, bot, game, group) {
  const others = group.memberIds.filter((x) => x !== bot.id);
  const strategy = bot.strategy ?? 'titfortat';
  const pledgedAtMe = others.some((id) => group.pledges[id]);
  const finalRound = game.round >= game.config.rounds;

  const noise = (p) => rng.chance(p);

  switch (strategy) {
    case 'saint':
      return noise(0.04) ? 'fold' : 'stand';
    case 'rat':
      return noise(0.12) ? 'stand' : 'fold';
    case 'coin':
      return noise(0.5) ? 'fold' : 'stand';
    case 'grudger': {
      const burned = others.some((id) => everBetrayed(game, bot.id, id));
      if (burned) return 'fold';
      return noise(0.05) ? 'fold' : 'stand';
    }
    case 'pavlov': {
      const last = game.history[game.history.length - 1];
      if (!last) return 'stand';
      const mine = last.groups
        .flatMap((g) => g.members)
        .find((m) => m.id === bot.id);
      const earned = last.groups.reduce(
        (acc, g) => acc + (g.payouts?.[bot.id] ?? 0), 0);
      if (!mine) return 'stand';
      // Win: keep doing it. Lose: do the other thing.
      const good = earned >= 6;
      if (good) return mine.choice;
      return mine.choice === 'stand' ? 'fold' : 'stand';
    }
    case 'titfortat':
    default: {
      const theirLast = others
        .map((id) => lastChoiceAgainst(game, id, bot.id))
        .filter(Boolean);
      if (theirLast.includes('fold')) return 'fold';
      if (finalRound && noise(0.35)) return 'fold';     // even saints get nervous at the end
      if (pledgedAtMe && noise(0.9)) return 'stand';
      return noise(0.1) ? 'fold' : 'stand';
    }
  }
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
        if (m.choice === 'fold') folds.set(m.id, (folds.get(m.id) ?? 0) + 1);
      }
    }
  }
  const ranked = [...folds.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length && rng.chance(0.75)) return ranked[0][0];
  const others = game.order.filter((id) => id !== bot.id);
  return rng.pick(others);
}
