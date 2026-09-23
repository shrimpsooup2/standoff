// Nonna's Ring: in 1987 she pawned her engagement ring to bail Sal out the
// first time. It has sat in the window of Castellano Pawn & Loan ever since,
// and on Monday she would like to wear it to court.

import { counting, money, round5k, nightDay, nightKicker } from '../common.js';

function price(c) {
  return round5k(c.scale(60000) * (c.flag('war') ? 1.5 : 1));
}

export default {
  id: 'ring', title: 'Nonna’s Ring', day: nightDay, kicker: nightKicker,
  beats: [
    'window',
    { if: (c) => c.memo.plan === 'buy', then: 'benny' },
    { if: (c) => c.memo.plan === 'steal', then: ['back-room', { maybe: 'street', chance: 0.35 }] },
    { if: (c) => c.memo.plan === 'fake', then: 'sid' },
    { if: (c) => c.memo.plan === 'truth', then: 'truth' },
    { if: (c) => c.memo.got === 'real', then: 'nonna-real' },
    { if: (c) => c.memo.got === 'fake', then: 'nonna-fake' },
    'count',
  ],
  close(c) {
    const r = c.flag('ring');
    c.remember(
      r === 'real' ? 'Castellano Pawn & Loan on Fifth Street reports that an engagement ring which had sat in its window since 1987 has “gone home.” Proprietor Benny Castellano declined to say more, except that it was “about time.”'
        : r === 'stolen-failed' ? 'An attempted burglary at Castellano Pawn & Loan was foiled on Thursday night. Proprietor Benny Castellano said he “knew exactly who” and was “deciding what to do about it.”'
          : r === 'truth' ? 'Nothing in the paper. At Nonna’s, the good china came out, which nobody could explain.'
            : 'Castellano Pawn & Loan reports a quiet week.',
      { courier: r === 'real' ? 'A RING GOES HOME' : 'PAWN SHOP BLOTTER' },
    );
  },
  defs: {
    window: {
      engine: 'vote', time: '8:15 P.M.', place: 'Fifth Street, outside Castellano Pawn & Loan', title: 'The Window', kicker: 'A VOTE',
      text: (c) => [
        `In the window of Castellano Pawn & Loan, between a saxophone and a signed photograph of Jerry Vale, there is a small gold ring with a garnet. It has been there since 1987. ${c.rng.pick(['Nonna walks past it every Sunday on the way to Mass and never looks.', 'Nonna has never once mentioned it. Sal told you, from county, and made you promise.'])}`,
        `She would like to wear it to court on Monday. How does it come home?`,
      ],
      options: (c) => [
        { id: 'buy', label: 'Buy it back', blurb: `Benny Castellano wants ${money(price(c))}, out of the Bag${c.flag('war') ? ', and a little more because of the war' : ''}. Somebody can try to talk him down.`, risk: 0.1, reward: 0.5 },
        { id: 'steal', label: 'Take it', blurb: 'The shop has a back room, a safe, and a very old alarm. Everybody pulls their weight or it goes wrong.', risk: 0.7, reward: 0.7 },
        { id: 'fake', label: 'Have a copy made', blurb: `Sid the jeweler on Canal Street can make one by morning for ${money(c.scale(15000))}. Nonna’s eyes aren’t what they were. Mostly.`, risk: 0.5, reward: 0.4 },
        { id: 'truth', label: 'Tell her the truth', blurb: 'That it’s been in the window for thirty-nine years and it isn’t coming home. Free. Nonna will take it however Nonna takes it.', risk: 0.4, reward: 0.2 },
      ],
      angles(c) {
        const ps = c.rng.shuffle(c.free.map((p) => p.id));
        const out = {};
        if (ps[0]) { out[ps[0]] = { option: 'fake', text: `Have a copy made. Sid the jeweler is your uncle. He’ll slip you ${money(10000)} out of what the crew pays him, and he never tells anybody anything.` }; c.memo.sidNephew = ps[0]; }
        if (ps[1]) { out[ps[1]] = { option: 'buy', text: `Buy it. You know Benny. You’ll be the one to carry the money in, and Benny will write a receipt for the full amount and charge you ${money(15000)} less. The difference is yours.` }; c.memo.bennyFriend = ps[1]; }
        if (ps[2]) { out[ps[2]] = { option: 'steal', text: 'Take it. You pawned your father’s watch at Benny’s last year and he won’t sell it back. If you’re in the back room, it comes home too — and you can sell it.' }; c.memo.watch = ps[2]; }
        for (const id of ps.slice(3)) out[id] = { option: null, text: 'No angle. It’s Nonna’s ring. That’s the angle.' };
        return out;
      },
      bot(c, p) {
        if (p.secret?.id === 'nonnas-favourite') return c.bag.total >= price(c) ? 'buy' : 'steal';
        return null;
      },
      resolve(c, { choice, votes }) {
        c.memo.plan = choice;
        c.memo.ringVoters = Object.entries(votes).filter(([, v]) => v === choice).map(([pid]) => pid);
        c.line({
          buy: 'Buy it back. Somebody has to walk in there and hand money to a Castellano.',
          steal: 'Take it. Nonna must never know how.',
          fake: 'A copy. Sid the jeweler is already warming up his little torch.',
          truth: 'The truth. Nobody wants to be the one to say it. Everybody will be.',
        }[choice]);
      },
    },

    benny: {
      engine: 'roll', time: '9:00 P.M.', place: 'Castellano Pawn & Loan', title: 'Benny’s Price', kicker: 'THE DICE',
      text: (c) => [
        `Benny Castellano is eighty, deaf in one ear, and has had the shop since before the ring came in. He knows exactly whose ring it is. ${money(price(c))}, he says, and not a cent less — unless somebody gives him a reason.`,
        `${c.freeByJob('talker')?.name ?? 'Somebody'} haggles.`,
      ],
      target: () => 7,
      roller: (c) => c.freeByJob('talker')?.id ?? null,
      label: 'Haggling with Benny',
      stakes: (c) => `Make it and he knocks a third off. Miss it and he’s insulted, and adds a fifth.`,
      resolve(c, r) {
        let p = price(c);
        if (r.success) { p = round5k(p * 0.67); c.line(`Benny laughed until he coughed, then took ${money(p)}. “For your grandmother,” he said. “Not for you.”`); }
        else { p = round5k(p * 1.2); c.line(`Benny took offence at something nobody meant and put the price up to ${money(p)}. It’s still the ring.`); }
        if (c.bag.total < p) {
          c.line(`The Bag only has ${money(c.bag.total)}. Benny puts the ring back in the window and turns the sign to CLOSED.`);
          c.memo.plan = 'none';
          c.set('ring', 'window');
          return;
        }
        c.bagTake(p);
        const f = c.memo.bennyFriend;
        if (f && !c.isAway(f)) {
          const skim = Math.min(15000, p);
          c.give(f, skim, 'Benny’s receipt');
          c.fact(f, 'angle', `Did ${c.name(f)} keep some of the money for the ring?`, true);
          c.note(f, `Benny wrote the receipt for ${money(p)} and took ${money(p - skim)}. The difference is in your pocket.`, 'Benny Castellano');
        }
        c.memo.got = 'real';
      },
    },

    'back-room': {
      engine: 'plan', time: '2:30 A.M.', place: 'The back room at Castellano Pawn & Loan', title: 'The Back Room', kicker: 'EVERYBODY PULLS THEIR WEIGHT',
      text: (c) => [
        `The back room is floor-to-ceiling with things people meant to come back for: ${c.rng.pick(['accordions, wedding dresses, a stuffed marlin', 'televisions, trumpets, one complete suit of armour', 'guitars, fur coats and a dentist’s chair'])}. The safe is a 1954 Mosler. The alarm is older than Benny.`,
        'Help (gloves, a drill, a man who knows Moslers: $10k), coast, or quietly make sure it goes wrong. Nobody sees who did what.',
      ],
      target: (c) => c.free.length + 5,
      cost: () => 10000,
      labels: () => ({ help: 'Pay for the drill and hold it steady', coast: 'Keep watch at the door', sabotage: 'Lean on the alarm panel' }),
      resolve(c, r) {
        if (r.success) {
          c.memo.got = 'real';
          c.line('The Mosler opened with a sound like a sigh. The ring was in a velvet box with a tag that said, in Benny’s handwriting, “BENEDETTO — DO NOT SELL.”');
          const w = c.memo.watch;
          if (w && !c.isAway(w)) { c.give(w, 20000, 'your father’s watch'); c.note(w, 'Your father’s watch was in the safe too. It’s in your pocket. A man on Canal Street will give you $20k for it, or you can keep it. You sold it.', 'the back room'); }
          return;
        }
        c.memo.got = null;
        c.set('ring', 'stolen-failed');
        c.line('The alarm went. It turns out Benny sleeps upstairs. It turns out Benny keeps a shotgun. Nobody was hurt, and nobody got the ring.');
        for (const p of c.free) c.heat(p.id, 1, 'the pawn shop alarm');
        c.caseFile(1, 'a burglary at a Castellano business');
      },
    },

    sid: {
      engine: 'story', time: '10:30 P.M.', place: 'Sid’s, Canal Street', title: 'Sid the Jeweler', kicker: 'A COPY',
      run(c) {
        const n = c.bagTake(c.scale(15000));
        c.memo.got = 'fake';
        const s = c.memo.sidNephew;
        if (s && !c.isAway(s)) { const cut = Math.min(10000, n); c.give(s, cut, 'Uncle Sid'); c.note(s, `Uncle Sid slipped you ${money(cut)} on the way out. “Family,” he said.`, 'Sid'); }
        c.line(`${money(n)} out of the Bag. Sid works through the night with a loupe in his eye and a photograph from Nonna’s wedding propped against a coffee cup.`);
      },
      text: (c) => [`Sid is seventy-six and has made copies of rings for three generations of wives who were not supposed to find out. ${c.rng.pick(['He says the garnet is the hard part.', 'He says he could make this one in his sleep, and then he nearly does.'])}`],
    },

    truth: {
      engine: 'story', time: '10:00 P.M.', place: 'Nonna’s kitchen', title: 'The Truth', kicker: 'NONNA',
      run(c) {
        c.set('ring', 'truth');
        const told = c.memo.ringVoters?.filter((id) => !c.isAway(id)) ?? [];
        const who = told.length ? c.rng.pick(told) : c.free[0]?.id;
        if (who) { c.card(who, 'nonnas-blessing'); c.note(who, 'Nonna pressed something into your hand after you told her. “You were the one who said it,” she said.', 'Nonna'); c.set('ringBy', who); }
      },
      text: (c) => [
        `${c.name(c.memo.ringVoters?.[0] ?? c.free[0]?.id)} says it, in the end, at the kitchen table. The ring is in Benny Castellano’s window. It’s been there since 1987. It isn’t coming home.`,
        c.rng.pick([
          'Nonna is quiet for a long time. Then she laughs until she has to hold on to the table. “I know,” she says. “I walk past it every Sunday. I was waiting to see which one of you would tell me.”',
          'Nonna nods. She gets up, goes to the dresser, and takes out a photograph of her wedding: the ring on her hand, and Sal’s father beside her, very young. “This is the ring,” she says. “That one in the window is just gold.”',
        ]),
      ],
    },

    'nonna-real': {
      engine: 'story', time: '11:45 P.M.', place: 'Nonna’s kitchen', title: 'Nonna', kicker: 'THE RING',
      run(c) {
        const giver = c.memo.ringVoters?.find((id) => !c.isAway(id)) ?? c.free[0]?.id;
        c.set('ring', 'real');
        if (giver) c.set('ringBy', giver);
        c.remember('Nonna got her ring back.', { kind: 'ring' });
      },
      text: (c) => [
        'The ring goes on the kitchen table in its velvet box, next to the Bag. Nonna looks at it for a long time without touching it. Then she puts it on.',
        `It fits. She doesn’t say anything. She puts her hand flat on the table so the garnet catches the light, and leaves it there all night. ${c.memo.ringVoters?.length ? `Before bed she kisses ${c.name(c.memo.ringVoters.find((id) => !c.isAway(id)) ?? c.memo.ringVoters[0])} on both cheeks, and nobody else.` : ''} On Monday, she says, she’ll bless the dice.`,
      ],
    },

    'nonna-fake': {
      engine: 'roll', time: '11:45 P.M.', place: 'Nonna’s kitchen', title: 'Does Nonna Notice?', kicker: 'THE DICE',
      text: () => [
        'Sid’s copy goes on the kitchen table in a velvet box, next to the Bag. It is very good. Nonna picks it up and holds it to the light.',
        'Her eyes aren’t what they were. Her memory is.',
      ],
      target: () => 8,
      label: 'Nonna holds it to the light',
      stakes: 'Make it and she wears it to court none the wiser. Miss it and she knows — and on Monday she curses the dice.',
      resolve(c, r) {
        if (r.success) {
          c.set('ring', 'fake');
          c.line('Nonna turns it over twice, puts it on, and says it’s smaller than she remembered. Then she kisses everybody. Nobody can look at anybody.');
          return;
        }
        c.set('ring', 'fake-caught');
        c.line('Nonna turns it over, looks inside the band, and puts it down. “My husband,” she says, “had it engraved.” She goes to bed without saying goodnight. On Monday, she will not bless the dice. She will do the opposite.');
      },
    },

    count: counting({ time: '12:45 A.M.' }),
  },
};
