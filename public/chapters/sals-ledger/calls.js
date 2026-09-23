// Sal rings from county every morning. What he says depends on what you did.

const bio = (id, say) => ({
  when: (c) => c.players.some((p) => p.bio === id && !(p.jailUntil != null && p.jailUntil >= c.s.week.n)),
  text: (c) => say(c.players.find((p) => p.bio === id).name),
});

export const CALLS = [
  // Sal knows who everybody is to him, and says so
  bio('godchild', (n) => `“Is ${n} there? Is ${n} eating? Put ${n} on.” A pause. “No. Don’t. I’ll get upset. Tell my godchild I said to eat.”`),
  bio('tomato', (n) => `“${n} had better not be anywhere near my tomatoes. I know about 1997. I have always known about 1997.”`),
  bio('palermo', (n) => `“${n}’s Italian is better than mine now. Tell Ma I said so. She’ll hit me. Tell her anyway.”`),
  bio('jersey', (n) => `“${n} came back from Jersey for this? For me?” Sal is quiet for a while. “Go home, you’ll get hurt. No. Stay.”`),
  bio('booth', (n) => `“Tell Dolores I dream about her eggs. ${n}, you tell her. She listens to you.”`),
  bio('starlite', (n) => `“${n}, pour one for me at the Starlite tonight. Don’t drink it. Just pour it and look at it.”`),
  bio('partner', (n) => `“Ray Mancuso came to see me. He asked about ${n}. Ray doesn’t ask about people. That’s how you know.”`),
  bio('seminary', (n) => `“${n}, light a candle for me at St. Anthony’s. You know how. You were almost a professional.”`),
  bio('client', (n) => `“Morty says ${n} still owes him from ’92. Morty says that about everybody. In ${n}’s case it’s true.”`),
  bio('boxer', (n) => `“Walt Kowalski came by. Walt! He asked after ${n}. He says keep your left up. I don’t know what it means. He says you do.”`),
  bio('student', (n) => `“${n} learned the books from Gary. So ${n} knows what’s in mine. Don’t tell me. I wrote it, I don’t want to hear it.”`),
  bio('ex', (n) => `“${n}. Rosemarie Castellano. I was at that wedding. Everybody was at that wedding. Nobody talks about that wedding.”`),
  bio('homeroom', (n) => `“${n} went to school with Prout? Was he always like this? Don’t tell me. I know he was.”`),
  bio('shopkid', (n) => `“Benny still has my father’s watch in that shop. ${n}, ask him about it. No — don’t. Let him keep it. It doesn’t work anyway.”`),

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
  { when: () => true, text: () => '“Tell Ma the sauce in here is fine. She’ll know I’m lying and she’ll feel better.”' },
  { when: () => true, text: () => '“Morty came to see me in a new tie clip. Gold. On my money. Tell him I noticed.”' },
  { when: () => true, text: () => '“There’s a priest does confession in here Tuesdays. I went. He asked me not to come back.”' },
];

function jailed(c) {
  return c.players.filter((p) => p.jailUntil != null && p.jailUntil >= c.s.week.n);
}

export function salCall(c) {
  const used = c.s.flags.callsUsed ?? [];
  // only what's true this morning; if he's said all of it, he says something twice
  const fits = CALLS.map((x, i) => ({ ...x, i })).filter((x) => x.when(c));
  const specific = fits.filter((x) => !used.includes(x.i));
  const pool = specific.filter((x) => x.when.toString().length > 20 && !x.when.toString().includes('() => true'));
  const pick = (pool.length && c.rng.chance(0.75) ? c.rng.pick(pool) : c.rng.pick(specific.length ? specific : fits));
  c.s.flags.callsUsed = [...used, pick.i];
  return pick.text(c);
}
