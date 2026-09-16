// THE HAND.
//
// Everybody holds cards. Each round you may play one, before you choose.
// FACE-UP cards are announced to the people you're working with the moment
// you play them — they're threats, offers, and public dares. FACE-DOWN cards
// stay secret until the reckoning, which is where most of the damage is done.
//
// A card is spent when played. You draw back up at the start of each round.

export const CARDS = [
  {
    id: 'insurance',
    name: 'Insurance',
    face: 'down',
    tag: 'a policy nobody mentions',
    text: 'If somebody folds on you this round, you take what they made instead of what you were left with.',
    weight: 10,
  },
  {
    id: 'alibi',
    name: 'The Alibi',
    face: 'down',
    tag: 'you were somewhere else',
    text: 'If you fold, nobody finds out. The table is shown you holding the line, and the record agrees with the table.',
    weight: 9,
  },
  {
    id: 'lookout',
    name: 'The Lookout',
    face: 'down',
    tag: 'a kid on the corner',
    text: 'You are told what everybody you are working with has chosen, the moment they choose it, before you lock in.',
    weight: 9,
  },
  {
    id: 'shakedown',
    name: 'The Shakedown',
    face: 'up',
    tag: 'a cut of your cut',
    text: 'Announced. If you both hold the line, you take a third of their take on top of your own.',
    weight: 9,
  },
  {
    id: 'muscle',
    name: 'The Muscle',
    face: 'up',
    tag: 'a promise, out loud',
    text: 'Announced. If they fold on you this round, they lose their whole take for it and half of it comes to you.',
    weight: 9,
  },
  {
    id: 'favour',
    name: 'The Favour',
    face: 'up',
    tag: 'money, now, for nothing',
    text: 'Announced. Hand a partner $10k of your own, immediately, whatever they go on to do. People remember being given things.',
    weight: 8,
  },
  {
    id: 'fix',
    name: 'The Fix',
    face: 'down',
    tag: 'it never happened',
    text: 'Your fold this round earns no marker against you and goes in the ledger as nothing at all.',
    weight: 8,
  },
  {
    id: 'skim',
    name: 'The Skim',
    face: 'down',
    tag: 'off the top',
    text: 'Take a tenth of everything the whole table earns this round, before anybody counts it.',
    weight: 8,
  },
  {
    id: 'lawyer',
    name: 'The Lawyer',
    face: 'up',
    tag: 'on retainer',
    text: 'Announced. Whatever this round costs you, it costs you half, and you cannot be left with less than nothing.',
    weight: 8,
  },
  {
    id: 'counterfeit',
    name: 'The Counterfeit',
    face: 'down',
    tag: 'good paper, mostly',
    text: 'Double your take this round — unless somebody else on your job also played a card, in which case you get nothing and everybody finds out why.',
    weight: 8,
  },
  {
    id: 'loanshark',
    name: 'The Loan Shark',
    face: 'up',
    tag: 'now, not later',
    text: 'Announced. $25k in your hand this round. $40k out of your pocket at the ledger. It has never once been a good idea.',
    weight: 7,
  },
  {
    id: 'confession',
    name: 'The Confession',
    face: 'up',
    tag: 'said in front of everybody',
    text: 'Announced. Turn one player’s secret card face up for the whole table, permanently.',
    weight: 7,
    needsTarget: true,
  },
  {
    id: 'priest',
    name: 'The Priest',
    face: 'down',
    tag: 'absolution, conditional',
    text: 'Any card played against you this round does nothing. They will not know until it has already failed.',
    weight: 7,
  },
  {
    id: 'split',
    name: 'The Handshake',
    face: 'up',
    tag: 'nobody walks away rich',
    text: 'Announced. Whatever the two of you make this round gets added up and divided evenly, however you each behaved.',
    weight: 7,
  },
  {
    id: 'setup',
    name: 'The Set-Up',
    face: 'down',
    tag: 'a word in the wrong ear',
    text: 'Pick somebody. The table is told, at the reckoning, that they folded — whether or not they did. The ledger knows better. Nobody reads the ledger until the end.',
    weight: 6,
    needsTarget: true,
  },
  {
    id: 'godfather',
    name: 'The Godfather',
    face: 'up',
    tag: 'an offer',
    text: 'Announced. If they hold the line with you this round, you both take double. If they fold, you take nothing at all and they take everything.',
    weight: 6,
  },
];

export const CARD_BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c]));

const TOTAL = CARDS.reduce((s, c) => s + c.weight, 0);

export function drawCard(rng, exclude = []) {
  const pool = CARDS.filter((c) => !exclude.includes(c.id));
  const total = pool.reduce((s, c) => s + c.weight, 0) || TOTAL;
  let roll = rng() * total;
  for (const c of pool) {
    roll -= c.weight;
    if (roll <= 0) return c.id;
  }
  return pool[pool.length - 1]?.id ?? CARDS[0].id;
}

/** Hand size grows with the table: more people, more knives in the room. */
export function handSize(playerCount) {
  if (playerCount <= 3) return 2;
  if (playerCount <= 6) return 3;
  return 4;
}

export function dealHand(rng, playerCount, existing = []) {
  const hand = existing.slice();
  while (hand.length < handSize(playerCount)) hand.push(drawCard(rng, hand));
  return hand;
}
