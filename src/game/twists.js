// The house always changes the rules. That's the house's whole thing.
// A twist is announced with the job, before anybody talks, so it's a shared
// fact — the lying happens on top of it.

export const TWISTS = [
  {
    id: 'clean',
    name: 'A Clean Job',
    weight: 22,
    line: 'No complications. Just the two of you and the oldest question there is.',
  },
  {
    id: 'double',
    name: 'Double Or Nothing',
    weight: 10,
    line: 'Everything on this job pays twice. The mistakes too.',
    effect: 'Every payout this round is doubled.',
  },
  {
    id: 'honour',
    name: 'Honour Among Thieves',
    weight: 10,
    line: 'Word is out that the family is watching who holds the line tonight.',
    effect: 'If you BOTH stand, the reward is tripled. Loyalty is, briefly, the best move on the board.',
  },
  {
    id: 'squeeze',
    name: 'The Squeeze',
    weight: 9,
    line: 'The DA has a quota and a divorce. He is not in a generous mood.',
    effect: 'If you BOTH fold, you both LOSE that much instead of gaining it. Mutual betrayal costs real money.',
  },
  {
    id: 'notalk',
    name: 'The Room Is Bugged',
    weight: 9,
    line: 'There is a van outside with the engine off and the windows up.',
    effect: 'No table talk. No pledges. Decide blind, on nothing but what you already know about each other.',
  },
  {
    id: 'openbook',
    name: 'Open Book',
    weight: 8,
    line: 'Somebody photocopied the ledger and left it in the break room.',
    effect: 'Every pledge at the table is public. Everyone sees who swore what to whom.',
  },
  {
    id: 'wire',
    name: 'The Wire',
    weight: 9,
    line: 'One of you is being listened to. Statistically, it is whoever moves first.',
    effect: 'The FIRST player in each pair to lock a choice has it leaked to their partner.',
  },
  {
    id: 'blind',
    name: 'Blind Alley',
    weight: 8,
    line: 'The lights in the interview wing went out at 9:40 and nobody has fixed them.',
    effect: 'You are told what you earned, but NOT what your partner chose. Not until the ledger.',
  },
  {
    id: 'switch',
    name: 'The Switcheroo',
    weight: 8,
    line: 'Assignments were re-cut after the meeting. Nobody told the meeting.',
    effect: 'You talk to one person — then the pairs are redrawn. Your promise may end up in somebody else\'s hands.',
  },
  {
    id: 'marked',
    name: 'The Underdog',
    weight: 7,
    line: 'The family has taken a sentimental interest in whoever is losing.',
    effect: 'The player in last place earns double this round.',
  },
];

const TOTAL_WEIGHT = TWISTS.reduce((s, t) => s + t.weight, 0);

export function pickTwist(rng, { exclude = [], allowTalkless = true } = {}) {
  const pool = TWISTS.filter(
    (t) => !exclude.includes(t.id) && (allowTalkless || t.id !== 'notalk'),
  );
  const total = pool.reduce((s, t) => s + t.weight, 0) || TOTAL_WEIGHT;
  let roll = rng() * total;
  for (const t of pool) {
    roll -= t.weight;
    if (roll <= 0) return t;
  }
  return pool[0] ?? TWISTS[0];
}

export const TWIST_BY_ID = Object.fromEntries(TWISTS.map((t) => [t.id, t]));
