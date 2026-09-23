// Sal rings from county every morning. What he says depends on what you did.

export const CALLS = [
  { when: (c) => c.flag('war'), text: () => '“You robbed Vinnie’s bank? VINNIE’S? Madonna.” A long silence on the line. “How are the tomatoes?”' },
  { when: (c) => c.flag('bank') === 'first-federal', text: () => '“First Federal. I went to school with Harold Pruitt. He cried at his own wedding. Did he cry?”' },
  { when: (c) => c.flag('bank') === 'harbor' && c.flag('waltSaw'), text: () => '“Walt Kowalski saw one of you? Walt? Walt can’t see his own feet. Still. Be nice to Walt.”' },
  { when: (c) => c.caseFileValue >= 6, text: () => '“Morty says the folder’s getting thick. I can hear it getting thick from in here.”' },
  { when: (c) => c.bag.total >= c.bag.target, text: () => '“Morty says the Bag’s full. Nonna says the Bag’s full. Say it to me. Say the Bag’s full.”' },
  { when: (c) => c.bag.total < c.bag.target * 0.2 && c.s.week.n >= 2, text: () => '“Morty tells me the Bag’s light. I don’t want to hear light. Light is a word for beer.”' },
  { when: (c) => jailed(c).length > 0, text: (c) => `“${jailed(c)[0].name} is in here with me. Next cell. Snores like a garbage truck. Somebody tell their mother they’re eating.”` },
  { when: (c) => c.flag('gary') === 'hidden', text: () => '“You have Gary in a basement? Is he eating? Gary gets low blood sugar. Give him a cookie, for God’s sake.”' },
  { when: (c) => c.flag('ring') === 'real', text: () => '“Ma has her ring back? She told me on the phone and then she hung up on me. She’s happy. That’s how she sounds happy.”' },
  { when: (c) => c.players.some((p) => p.stamps.includes('LIAR')), text: () => '“I hear somebody’s been lying. To each other? Lie to Prout. Lie to the Castellanos. Lie to your wife. Not to each other.”' },
  { when: () => true, text: () => '“The food in here is a crime. I’d testify.”' },
  { when: () => true, text: () => '“Water the tomatoes. Not too much. Too much is worse than not enough. That goes for most things.”' },
  { when: () => true, text: () => '“They give me one phone call a day and I use it on you. Remember that when you’re counting.”' },
  { when: () => true, text: () => '“There’s a guy in here says he fixed the Knicks in ’94. Everybody in here says they fixed the Knicks in ’94.”' },
  { when: () => true, text: () => '“Did Prout talk to you yet? Say nothing. Say it slowly. It drives him crazy.”' },
];

function jailed(c) {
  return c.players.filter((p) => p.jailUntil != null && p.jailUntil >= c.s.week.n);
}

export function salCall(c) {
  const used = c.s.flags.callsUsed ?? [];
  const specific = CALLS.map((x, i) => ({ ...x, i })).filter((x) => !used.includes(x.i) && x.when(c));
  const pool = specific.filter((x) => x.when.toString().length > 20 && !x.when.toString().includes('() => true'));
  const pick = (pool.length && c.rng.chance(0.75) ? c.rng.pick(pool) : c.rng.pick(specific.length ? specific : CALLS.map((x, i) => ({ ...x, i }))));
  c.s.flags.callsUsed = [...used, pick.i];
  return pick.text(c);
}
