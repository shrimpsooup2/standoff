// The director decides what kind of night this is going to be, and the answer
// depends almost entirely on how many people showed up.
//
// Two people is a marriage. Ten is a political situation.

export const ACTS = [
  {
    n: 1,
    name: 'ACT ONE',
    title: 'The Small Stuff',
    line: 'Nobody is in real trouble yet. That is what makes this the part where people find out about each other.',
    stakes: 'Low stakes, short memories, and everybody still being polite.',
  },
  {
    n: 2,
    name: 'ACT TWO',
    title: 'The Heat',
    line: 'Somebody has been talking. Nobody knows who, everybody has a theory, and the theories are starting to cost money.',
    stakes: 'The jobs get bigger, things start happening between them, and the past stops staying in the past.',
  },
  {
    n: 3,
    name: 'ACT THREE',
    title: 'The Last Standoff',
    line: 'Everything that is going to be decided gets decided now, in one room, by people who have spent all night learning exactly what each other are worth.',
    stakes: 'Everything pays triple. There is no round after this one in which anybody can make you pay for what you do here.',
  },
];

export function actForRound(round, totalRounds) {
  if (round >= totalRounds) return ACTS[2];
  if (round > Math.ceil(totalRounds * 0.45)) return ACTS[1];
  return ACTS[0];
}

/**
 * How the night is shaped for a table of `n`. This is shown in the lobby, so
 * people can see the game change as friends arrive.
 */
export function tableProfile(n) {
  if (n <= 2) {
    return {
      key: 'twohander',
      name: 'THE TWO-HANDER',
      blurb: 'Just the two of you, over and over, with a full memory of every round. No secrets to hide behind and nobody else to blame.',
      rounds: 7,
      features: [
        'Every job is the two of you',
        'The night keeps bringing up what you did to each other',
        'No rat, no votes — nowhere to hide',
        'Two cards in hand',
      ],
      hasRat: false,
      hasVotes: false,
      hasCrews: false,
      tableRoundEvery: 0,
      eventChance: 0.45,
      callbackChance: 0.55,
    };
  }
  if (n === 3) {
    return {
      key: 'threehander',
      name: 'THE THREE-HANDER',
      blurb: 'Three is the worst number. Somebody is always the odd one, and it is never the same person twice.',
      rounds: 6,
      features: [
        'Pairs, and three-handed rooms where the maths turns cruel',
        'One of you is on the DA’s payroll',
        'Callbacks to what happened earlier',
        'Two cards in hand',
      ],
      hasRat: true,
      hasVotes: false,
      hasCrews: false,
      tableRoundEvery: 3,
      eventChance: 0.5,
      callbackChance: 0.4,
    };
  }
  if (n <= 6) {
    return {
      key: 'crew',
      name: 'THE CREW',
      blurb: 'Big enough for politics, small enough that everybody works with everybody. The classic shape of the game.',
      rounds: 6,
      features: [
        'Pairs, with the whole table in one room every third job',
        'Events between jobs — raids, funerals, windfalls',
        'Table votes: somebody takes the fall, somebody gets made',
        'Three cards in hand',
      ],
      hasRat: true,
      hasVotes: true,
      hasCrews: false,
      tableRoundEvery: 3,
      eventChance: 0.65,
      callbackChance: 0.35,
    };
  }
  return {
    key: 'family',
    name: 'THE FAMILY',
    blurb: 'Two crews under one roof. You have people now, which means you have people to answer to and people to sell out.',
    rounds: 7,
    features: [
      'The table splits into two crews with a shared purse',
      'Whole-table jobs where one skimmer ruins everybody',
      'Events and votes every couple of jobs',
      'Four cards in hand',
    ],
    hasRat: true,
    hasVotes: true,
    hasCrews: true,
    tableRoundEvery: 3,
    eventChance: 0.75,
    callbackChance: 0.3,
  };
}

export const CREWS = [
  { id: 'north', name: 'The North Side', colour: '#6a8fe8' },
  { id: 'south', name: 'The South Side', colour: '#d4794a' },
];

export function assignCrews(rng, playerIds) {
  const shuffled = rng.shuffle(playerIds);
  const out = {};
  shuffled.forEach((id, i) => { out[id] = CREWS[i % 2].id; });
  return out;
}

/** The DA gets more generous the louder the table gets. */
export function heatBand(heat) {
  if (heat >= 75) return { key: 'boiling', name: 'BOILING', temptation: 1.5, line: 'Every phone in this crew is being listened to and everybody knows it.' };
  if (heat >= 50) return { key: 'hot', name: 'HOT', temptation: 1.3, line: 'There are cars parked outside places where cars are not usually parked.' };
  if (heat >= 25) return { key: 'warm', name: 'WARM', temptation: 1.15, line: 'Somebody has been talking. Not a lot. Enough.' };
  return { key: 'quiet', name: 'QUIET', temptation: 1, line: 'Nobody is looking at this crew. Long may it last.' };
}

export function heatDelta({ folds, stands, n }) {
  const raw = folds * 8 - stands * 3.5;
  return Math.round(raw * (4 / Math.max(2, n)));
}

/**
 * How often the night goes loud. Action jobs are the rare ones — roughly one in
 * five across a night — and they get more likely the later it gets, because
 * that is how evenings like this work.
 */
export function actionChance(round, totalRounds) {
  if (round <= 1) return 0.08;
  const progress = (round - 1) / Math.max(1, totalRounds - 1);
  return 0.14 + progress * 0.18;
}

/** Twists written for an interview room don't belong on a rooftop. */
export const DESK_TWISTS = ['notalk', 'openbook', 'wire', 'blind'];
