// Secret cards, dealt face down at the start and turned over at the ledger.
// They exist so that at the end of the night you find out your friend wasn't
// a monster — he was contractually obligated.

export const ROLES = [
  {
    id: 'rat',
    name: 'The Rat',
    tag: 'on the payroll',
    blurb: 'You have been taking an envelope from the DA since before any of this started.',
    objective: 'Earn $6k every time you FOLD. Nobody can know. At the ledger, everyone gets one guess at who you are — you collect $10k for every wrong name.',
    colour: '#c0392b',
  },
  {
    id: 'saint',
    name: 'The Saint',
    tag: 'incorruptible',
    blurb: 'Your mother watches the news. That is the entire mechanism of your integrity.',
    objective: 'If you finish the night having NEVER folded, collect $45k. Fold even once and the card is worth nothing.',
    colour: '#e8c46a',
  },
  {
    id: 'consigliere',
    name: 'The Consigliere',
    tag: 'knows things',
    blurb: 'You keep the family\'s secrets in a filing cabinet that only opens for you.',
    objective: 'Once per night, during table talk, read one player\'s secret card. Knowledge is not points. Use it anyway.',
    colour: '#6a8fe8',
  },
  {
    id: 'bookkeeper',
    name: 'The Bookkeeper',
    tag: 'skims',
    blurb: 'Every number that passes through this town passes through you first, briefly, at an angle.',
    objective: 'Quietly collect 10% of every dollar the table earns each round. You profit most when everyone gets along — which nobody will believe.',
    colour: '#5fa87c',
  },
  {
    id: 'widow',
    name: 'The Widow',
    tag: 'profits from grief',
    blurb: 'You have an insurance policy, a black dress, and no discernible sense of loss.',
    objective: 'When someone folds on you while you stood, collect $12k instead of nothing. Being betrayed is your business model.',
    colour: '#9b6ac9',
  },
  {
    id: 'bruiser',
    name: 'The Bruiser',
    tag: 'remembers',
    blurb: 'You are not clever. You have never needed to be clever.',
    objective: 'You start the night holding one MARKER, and your markers hit twice as hard.',
    colour: '#d4794a',
  },
  {
    id: 'gambler',
    name: 'The Gambler',
    tag: 'cannot help it',
    blurb: 'You have never once walked past a thing you could put money on.',
    objective: 'Every round is a coin flip you did not need to take: your payout for the round is doubled if it ends in an odd number, halved if it ends even.',
    colour: '#48a0a8',
  },
  {
    id: 'ghost',
    name: 'The Ghost',
    tag: 'was never here',
    blurb: 'Three separate agencies believe you died in 1987. You have leaned into it.',
    objective: 'Collect $5k every round in which you and your partner made the SAME choice. Matching is its own kind of loyalty.',
    colour: '#8e9aa6',
  },
];

export const ROLE_BY_ID = Object.fromEntries(ROLES.map((r) => [r.id, r]));

/**
 * Deal one card per player. The Rat is always in the deck when the table is
 * big enough to be paranoid about it.
 */
export function dealRoles(rng, playerIds) {
  const n = playerIds.length;
  const deck = [];
  if (n >= 3) deck.push(ROLE_BY_ID.rat);
  const rest = rng.shuffle(ROLES.filter((r) => !deck.includes(r)));
  while (deck.length < n) deck.push(rest.pop() ?? rng.pick(ROLES));
  const shuffled = rng.shuffle(deck);
  const out = {};
  rng.shuffle(playerIds).forEach((pid, i) => { out[pid] = shuffled[i].id; });
  return out;
}
