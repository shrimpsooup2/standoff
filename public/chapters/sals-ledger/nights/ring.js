// Nonna's Ring: in 1987 she pawned her engagement ring to bail Sal out the
// first time. It has sat in the window of Castellano Pawn & Loan ever since,
// and on Monday she would like to wear it to court.

import { counting, money, round5k, nightDay, nightKicker, tablePays, howPaid } from '../common.js';

function price(c) {
  return round5k(c.scale(60000) * (c.flag('war') ? 1.5 : 1));
}

/** After a break-in at half past two, the rest of the night happens at dawn, not at eleven. */
const late = (c) => c.memo.plan === 'steal';
const at = (evening, night, morning = null) => (c) => (morning && c.memo.got === 'fake' && c.memo.lateCopy ? morning : late(c) ? night : evening);

const BENNY_DID = {
  ear: 'talked into Benny’s left ear',
  vinnie: 'said they knew his cousin Vinnie',
  1957: 'asked Benny about Nonna, in 1957',
  watches: 'asked to see the watches',
};

export default {
  id: 'ring', title: 'Nonna’s Ring', day: nightDay, kicker: nightKicker,
  beats: [
    'window',
    'shop',
    { if: (c) => c.memo.plan === 'buy', then: ['benny', { if: (c) => c.memo.short > 0, then: 'short' }] },
    { if: (c) => c.memo.plan === 'steal', then: ['back-room', { maybe: ['jammed', 'dog', 'patrol'], chance: 0.25, when: (c) => c.memo.got === 'real', where: 'The alley behind Castellano Pawn & Loan' }, { if: (c) => c.flag('ring') === 'stolen-failed', then: 'upstairs' }] },
    { if: (c) => c.memo.plan === 'fake', then: 'sid' },
    { if: (c) => c.memo.plan === 'truth', then: ['who-tells', 'the-words', 'truth', 'make-it-up'] },
    { if: (c) => c.memo.plan !== 'truth' && !c.memo.got, then: 'empty-handed' },
    { if: (c) => !!c.memo.got, then: [{ if: (c) => !c.memo.lateCopy, then: 'fifth-street' }, { if: (c) => !!c.memo.got, then: 'presenter' }] },
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

    shop: {
      engine: 'whispers', time: '8:30 P.M.', place: 'Castellano Pawn & Loan, Fifth Street', title: 'Benny', kicker: 'ONE OF YOU TALKS',
      whoLabel: 'Benny Castellano, eighty, behind the counter',
      text: (c) => {
        const t = c.freeByJob('talker')?.name ?? 'Somebody';
        return [
          `Whatever happens to the ring tonight, somebody has to go into the shop first and get Benny talking. ${c.rng.pick(['He is polishing a trumpet nobody will ever buy.', 'He is eating soup at the counter with his hat on.', 'He is listening to an opera on a radio with one working speaker.'])} ${c.memo.plan === 'truth' ? 'Nonna deserves to hear the whole story, and Benny is the only one left who knows it.' : 'How it goes in here decides how everything else goes.'}`,
          `${t} goes in. Everybody else knows one thing about Benny. Pass it on — as written, turned around, or not at all.`,
        ];
      },
      openings: () => [
        { id: 'ear', label: 'Talk into his left ear',
          yes: 'Benny hears only out of his left ear, and pretends not to hear out of the right whenever it suits him.',
          no: 'Benny’s good ear is the right. Talk into the left and he hears exactly what he wants to.' },
        { id: 'vinnie', label: 'Say you know his cousin Vinnie',
          yes: 'Benny and Vinnie haven’t spoken since a funeral in 1994. Mention Vinnie and Benny gets generous, out of spite.',
          no: 'Benny calls Vinnie every night at nine. Mention Vinnie and Benny calls him tonight, about you.' },
        { id: '1957', label: 'Ask him about Nonna, in 1957',
          yes: 'Benny was sweet on Nonna in 1957. He has kept the ring in the window on purpose, all these years, so she would have to walk past.',
          no: 'Benny doesn’t talk about the old days. His brother was arrested in 1987, and Sal was the reason.' },
        { id: 'watches', label: 'Ask to see the watches',
          yes: 'Benny loves to talk about watches. Get him on watches and he forgets his own name, and his back door.',
          no: 'Benny was robbed in 1979 by a man who asked to see the watches. The watch case has been locked ever since.' },
      ],
      filler: () => [
        'Benny has a cat called Mussolini who sits in the window next to the ring.',
        'Benny’s shop sign has said CLOSING DOWN — EVERYTHING MUST GO since 1991.',
        'Benny keeps a shotgun under the counter, and everybody on Fifth Street knows it.',
      ],
      resolve(c, { success, opening, talker }) {
        const did = BENNY_DID[opening] ?? 'said something';
        c.memo.bennyWarm = !!success;
        const plan = c.memo.plan;
        if (success) {
          c.line(`${c.name(talker)} ${did}. Twenty minutes later Benny is showing them photographs. ${{
            buy: 'He is going to be reasonable about the price. He says so himself.',
            steal: 'When they leave, he forgets to lock the back door behind them. He never forgets.',
            fake: 'He even takes the ring out of the window and lets them hold it under the light for a while. Every scratch, every mark.',
            truth: `He tells them the whole story of 1987, and gives them the old pawn ticket, in Nonna’s handwriting, to take to her.`,
          }[plan] ?? ''}`);
          if (plan === 'truth') c.memo.ticket = talker;
          return;
        }
        c.line(`${c.name(talker)} ${did}. Benny looked at them for a long time with his bad ear turned towards them, and then picked up the phone. ${plan === 'buy' ? 'The price just went up.' : plan === 'steal' ? 'He’s going to be sleeping lightly tonight.' : 'He’s telling somebody about it.'}`);
        c.heat(talker, 1, 'Benny Castellano remembers faces');
      },
    },

    'who-tells': {
      engine: 'vote', time: '9:30 P.M.', place: 'The stoop outside Nonna’s', title: 'Who Tells Her?', kicker: 'PICK ONE OF YOU',
      text: () => ['Nobody wants to be the one who says it. Somebody has to be. Everybody picks who goes in first, and everybody will know who picked who.'],
      candidates: (c) => c.free.map((p) => p.id),
      noSelf: false,
      resolve(c, { choice }) {
        c.memo.teller = choice;
        c.line(`${c.name(choice)} goes up the steps first. Everybody else follows, slowly, and stands in the kitchen doorway.`);
      },
    },

    'make-it-up': {
      engine: 'vote', time: '10:30 P.M.', place: 'Nonna’s kitchen', title: 'After', kicker: 'A VOTE',
      text: (c) => [
        c.memo.herself
          ? 'It’s ten thirty. Nonna is at the stove with the ring on, humming something from before any of you were born. Nobody wants to go home.'
          : `${c.memo.ticket ? `${c.name(c.memo.ticket)} puts Benny’s old pawn ticket on the table, in Nonna’s own handwriting from 1987. She looks at it for a long time.` : 'Nonna is sitting with her hands in her lap.'} It’s ten thirty. Nobody wants to leave her like this.`,
        'What do you do for her tonight?',
      ],
      options: () => [
        { id: 'stay', label: 'Stay for dinner', blurb: 'All of you. She cooks for eleven. Everybody goes home with something from her, and her blessing for tomorrow.', risk: 0, reward: 0.4 },
        { id: 'bag', label: 'Everybody puts something in the Bag, in front of her', blurb: '$5k each, out of your own pocket, where she can see you do it.', risk: 0, reward: 0.5 },
        { id: 'sal', label: 'Call Sal, together', blurb: 'The kitchen phone on speaker. Sal will want to talk to his mother. Sal will want to talk about the ring.', risk: 0.2, reward: 0.3 },
      ],
      resolve(c, { choice }) {
        if (choice === 'stay') { for (const p of c.free) (p.edges ??= []).push({ label: 'Nonna’s blessing' }); c.line('She cooks for eleven, and makes everybody take a plate home. At the door she puts her hand on each head in turn. (+1 on everybody’s next roll.)'); }
        else if (choice === 'bag') { let n = 0; for (const p of c.free) { const k = c.charge(p.id, 5000); if (k) c.bagAdd(k, p.id); n += k; } c.line(`${money(n)} goes in the Bag, one envelope at a time, in front of her. She counts it twice, like she always does, and says nothing, which from Nonna is a speech.`); }
        else { c.caseFile(-1, 'a son who thanked the whole table from county, and meant it'); c.line('Sal on speaker from county, crying, then laughing, then telling everybody which of them he’s leaving the tomatoes to. Somewhere a guard is listening, and he writes “no threat” in his book.'); }
      },
    },

    'fifth-street': {
      engine: 'vote', time: at('11:20 P.M.', '3:00 A.M.'), place: 'Fifth Street', title: 'The Walk Home', kicker: 'A VOTE',
      text: (c) => [
        `The ring is in a velvet box in somebody’s inside pocket, and it is six blocks back to Nonna’s. ${c.flag('war') ? 'Fifth Street is Castellano street, and there is a black Lincoln idling outside the social club.' : 'Fifth Street is quiet. Fifth Street is always quiet until it isn’t.'}`,
        'How does it get home?',
      ],
      options: (c) => [
        { id: 'straight', label: 'Straight down Fifth Street', blurb: c.flag('war') ? 'Past the social club and the Lincoln. Fast, and very visible.' : 'Six blocks. Fast.', risk: c.flag('war') ? 0.5 : 0.2, reward: 0.3 },
        { id: 'church', label: 'Through St. Anthony’s', blurb: 'In the front, out the side door. Father Dominic is still up. He might bless it.', risk: 0.1, reward: 0.4 },
        { id: 'split', label: 'Split up, three ways', blurb: 'One of you has the ring. Nobody watching knows which.', risk: 0.2, reward: 0.3 },
      ],
      resolve(c, { choice }) {
        if (choice === 'church') { c.memo.blessed = true; c.line('In the front of St. Anthony’s and out the side. Father Dominic is locking up and blesses the box without asking what’s in it. He knows what’s in it.'); return; }
        if (choice === 'split') { c.line('Three ways at the corner of Fifth and Mulberry. Whoever has the ring walks very normally. Everybody else walks like they have the ring.'); return; }
        const risk = c.flag('war') ? 0.3 : 0.1;
        if (c.rng.chance(risk)) {
          const carrier = c.rng.pick(c.free);
          const n = carrier ? c.charge(carrier.id, 15000) : 0;
          c.line(`The Lincoln’s window comes down as you pass. ${carrier?.name ?? 'Somebody'} pays a ${money(n)} toll to keep walking, and walks.`);
          return;
        }
        c.line('Six blocks. Nobody stops you. The Lincoln’s window stays up.');
      },
    },

    presenter: {
      engine: 'vote', time: at('11:40 P.M.', '3:20 A.M.', '7:10 A.M.'), place: 'Nonna’s front door', title: 'Who Gives It to Her?', kicker: 'PICK ONE OF YOU',
      when: (c) => !c.memo.herself,
      text: (c) => [
        c.memo.got === 'fake'
          ? 'Somebody has to put Sid’s copy in Nonna’s hand and look her in the eye while she looks at it. If she sees what it is, she’ll know exactly who handed it to her.'
          : 'Somebody has to put it in her hand. Whoever does will be the one she remembers doing it.',
        'Everybody picks who. Everybody will know who picked who.',
      ],
      candidates: (c) => c.free.map((p) => p.id),
      noSelf: false,
      resolve(c, { choice }) {
        c.memo.presenter = choice;
        c.line(`${c.name(choice)} has the box. Everybody else stands behind them in the hall, very close together.`);
      },
    },

    benny: {
      engine: 'roll', time: '9:00 P.M.', place: 'Castellano Pawn & Loan', title: 'Benny’s Price', kicker: 'THE DICE',
      text: (c) => [
        `Benny Castellano is eighty, deaf in one ear, and has had the shop since before the ring came in. He knows exactly whose ring it is. ${money(price(c))}, he says, and not a cent less — unless somebody gives him a reason.`,
        `${c.freeByJob('talker')?.name ?? 'Somebody'} haggles.`,
      ],
      target: (c) => 7 + (c.memo.bennyWarm === true ? -2 : c.memo.bennyWarm === false ? 1 : 0),
      roller: (c) => c.freeByJob('talker')?.id ?? null,
      label: 'Haggling with Benny',
      stakes: (c) => `Make it and he knocks a third off. Miss it and he’s insulted, and adds a fifth.`,
      resolve(c, r) {
        let p = price(c);
        if (r.success) { p = round5k(p * 0.67); c.line(`Benny laughed until he coughed, then came down to ${money(p)}. “For your grandmother,” he said. “Not for you.”`); }
        else { p = round5k(p * 1.2); c.line(`Benny took offence at something nobody meant and put the price up to ${money(p)}. It’s still the ring.`); }
        if (c.bag.total < p) {
          c.memo.price = p;
          c.memo.short = p - c.bag.total;
          c.line(`The Bag only has ${money(c.bag.total)}. That’s ${money(c.memo.short)} short. Benny puts his hand on the window latch and waits.`);
          return;
        }
        c.bagTake(p);
        c.line(`${money(p)} out of the Bag, onto the counter. Benny counts it twice and goes to the window.`);
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
      target: (c) => c.free.length + 5 + (c.memo.bennyWarm === true ? -2 : c.memo.bennyWarm === false ? 1 : 0),
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

    short: {
      engine: 'choose', time: '9:15 P.M.', place: 'Castellano Pawn & Loan, at the counter', title: 'Pass the Hat', kicker: 'HOW MUCH DO YOU PUT IN?',
      text: (c) => [
        `Benny wants ${money(c.memo.price)}. The Bag has ${money(c.bag.total)}. That leaves ${money(c.memo.short)}, and Benny doesn’t take IOUs, even from Benedettos. Especially from Benedettos.`,
        'Everybody turns out their own pockets on the counter, privately, with their back to the rest. If it comes to enough, the ring comes home. If it doesn’t, Benny gives it all back and closes the shop.',
      ],
      who: (c) => c.free.map((p) => p.id),
      amount: (c, pid) => ({ min: 0, max: c.p(pid).cash, step: 5000, label: 'On the counter', blurb: `You have ${money(c.p(pid).cash)}. The table needs ${money(c.memo.short)} between you.` }),
      botAmount: (c, p) => {
        const need = c.memo.short / Math.max(1, c.free.length);
        const fair = Math.min(1, need / Math.max(1, p.cash));
        return Math.min(1, fair * ({ loyal: 1.5, nervous: 1.1, wild: 0.9, greedy: 0.5, snake: 0.3 }[p.style] ?? 1));
      },
      resolve(c, { choices }) {
        const put = Object.entries(choices).map(([pid, ch]) => [pid, Math.min(c.p(pid).cash, Math.max(0, ch.amount ?? 0))]);
        const total = put.reduce((a, [, n]) => a + n, 0);
        const each = put.map(([pid, n]) => `${c.name(pid)} ${money(n)}`).join(', ');
        if (total < c.memo.short) {
          c.memo.plan = 'none';
          c.set('ring', 'window');
          c.line(`${money(total)} on the counter. Benny counts it twice and pushes it back. “Short is short,” he says, and turns the sign to CLOSED.`);
          for (const p of c.free) c.note(p.id, `What everybody put on Benny’s counter: ${each}.`, 'the counter');
          return;
        }
        for (const [pid, n] of put) c.charge(pid, n);
        c.bagTake(c.memo.price - c.memo.short);
        c.bagAdd(total - c.memo.short);
        c.memo.got = 'real';
        c.line(`${money(total)} on the counter. Benny counts it twice, takes what he’s owed, and pushes the rest back for the Bag. Then he goes to the window, lifts out the ring, and blows the dust off the box.`);
        for (const p of c.free) c.note(p.id, `What everybody put on Benny’s counter: ${each}.`, 'the counter');
        for (const [pid, n] of put) c.fact(pid, 'short', `Did ${c.name(pid)} put their own money on Benny’s counter?`, n > 0);
      },
    },

    upstairs: {
      engine: 'vote', time: '2:45 A.M.', place: 'The back stairs at Castellano Pawn & Loan', title: 'Benny, in His Pyjamas', kicker: 'A VOTE',
      text: (c) => [
        `The light at the top of the stairs comes on. Benny Castellano is standing there in striped pyjamas with the shotgun from under the counter, and he doesn’t look eighty. ${c.memo.bennyWarm ? 'He looks at your faces one at a time. He knows every one of them from this afternoon.' : 'He is already reaching for the phone on the landing.'}`,
        'Nobody has run yet. What now?',
      ],
      options: (c) => [
        { id: 'run', label: 'Run', blurb: 'Out through the back, over the fence, and split up. Benny knows your faces. He might keep them to himself.', risk: 0.3, reward: 0.1 },
        { id: 'pay', label: 'Put the money on the stairs', blurb: `Make it a sale after all: ${money(round5k(price(c) * 1.2))}, for the ring and the door, out of the Bag and your pockets. If you have it between you.`, risk: 0.2, reward: 0.5 },
        { id: 'nonna', label: 'Tell him who it’s for', blurb: 'Hands up, and say her name. Benny was sweet on her once. Or Benny hates the whole family. It depends who you believe.', risk: 0.6, reward: 0.7 },
      ],
      resolve(c, { choice }) {
        if (choice === 'pay') {
          const paid = tablePays(c, round5k(price(c) * 1.2));
          if (!paid.ok) {
            c.line(`Everybody turns out the Bag and their pockets on the stairs: ${money(paid.had)}. Benny wants ${money(paid.want)}. He laughs, which is worse than the shotgun. Everybody runs.`);
            c.caseFile(1, 'Benny gave the police a description');
            return;
          }
          c.memo.got = 'real';
          c.line(`${howPaid(paid)}, on the third stair. Benny comes down, counts it with the shotgun under his arm, and goes to the safe himself. “Next time,” he says, “use the front door, like people.”`);
          c.caseFile(-1, 'Benny told the police it was a misunderstanding');
          return;
        }
        if (choice === 'nonna') {
          const t = c.freeByJob('talker') ?? c.rng.pick(c.free);
          if (c.rng.chance(c.memo.bennyWarm ? 0.7 : 0.3)) {
            c.memo.got = 'real';
            c.line(`${t?.name ?? 'Somebody'} says her name. Benny lowers the shotgun. He goes to the safe, takes out the velvet box, and puts it in ${t?.name ?? 'their'}’s hand. “For her,” he says. “Not for you. Never for you.”`);
            c.caseFile(-1, 'Benny told the police it was a misunderstanding');
            return;
          }
          c.line(`${t?.name ?? 'Somebody'} says her name. Benny’s face does something complicated, and then he picks up the phone and asks for Vinnie. Everybody runs.`);
          c.caseFile(1, 'Benny gave the police names');
          if (t) c.heat(t.id, 1, 'Benny heard your voice');
          return;
        }
        c.line('Over the fence, split four ways, nobody looks back. Benny doesn’t fire. Benny doesn’t need to. He knows where Nonna lives.');
      },
    },

    'empty-handed': {
      engine: 'vote', time: at('11:00 P.M.', '3:15 A.M.'), place: 'The stoop outside Nonna’s', title: 'Empty-Handed', kicker: 'A VOTE',
      text: (c) => [
        `The ring is still in Benny’s window${c.flag('ring') === 'stolen-failed' ? ', and there is a police car outside the shop' : ''}. Upstairs, Nonna has laid out her good black dress for Monday, and the space on her hand where the ring goes.`,
        'What do you do?',
      ],
      options: (c) => [
        { id: 'quiet', label: 'Say nothing', blurb: 'Let her find out on Monday morning, when there’s no box on the table.', risk: 0.2, reward: 0 },
        { id: 'tell', label: 'Go up and tell her', blurb: 'All of you, tonight. She’ll take it however Nonna takes it.', risk: 0.2, reward: 0.3 },
        { id: 'copy', label: 'Wake up Sid', blurb: `A copy by morning, rushed: ${money(round5k(c.scale(15000) * 1.5))} out of the Bag or your pockets. Her eyes aren’t what they were.`, risk: 0.5, reward: 0.4 },
      ],
      resolve(c, { choice }) {
        if (choice === 'copy') {
          const paid = tablePays(c, round5k(c.scale(15000) * 1.5));
          if (!paid.ok) { c.line(`Sid answers the door in a hairnet. Between the Bag and everybody’s pockets there’s ${money(paid.had)}. Sid goes back to bed.`); return; }
          c.memo.got = 'fake';
          c.memo.lateCopy = true;
          c.line(`${howPaid(paid)}. Sid puts the coffee on, props Nonna’s wedding photograph against the cup, and works until five with his loupe in.`);
          return;
        }
        if (choice === 'tell') {
          c.line('Everybody goes up together. Nonna listens with her hands folded. “The ring,” she says at last, “was always just gold.” Then she puts the dress back in the wardrobe and takes out a different one.');
          for (const p of c.free) (p.edges ??= []).push({ label: 'Nonna, not angry' });
          c.line('(+1 on everybody’s next roll.)');
          return;
        }
        c.line('Nobody says anything. Upstairs, the light stays on until very late.');
      },
    },

    'the-words': {
      engine: 'choose', time: '9:45 P.M.', place: 'Nonna’s kitchen', title: 'How You Say It', kicker: 'YOUR CALL',
      who: (c) => [c.memo.teller].filter((id) => id && !c.isAway(id)),
      text: (c) => [
        `${c.name(c.memo.teller)} is sitting across the kitchen table from Nonna, and everybody else is in the doorway. Nonna has made coffee nobody is drinking. She is waiting.`,
        `${c.name(c.memo.teller)} decides how to say it. Everybody will hear.`,
      ],
      options: () => [
        { id: 'whole', label: 'All of it', blurb: 'The window, 1987, the price, and that nobody at this table can bring it home. She deserves all of it.', honest: true },
        { id: 'sal', label: 'Say Sal was always going to buy it back', blurb: 'A kind lie. Sal can’t say otherwise from county.' },
        { id: 'benny', label: 'Say Benny won’t sell it to a Benedetto', blurb: 'True enough. Nonna might put her coat on and go down there herself.' },
      ],
      reveal: 'public',
      fallback: () => ({ option: 'whole' }),
      bot: (c, p) => ({ option: c.rng.pick(['whole', 'whole', 'sal', 'benny']) }),
      resolve(c, { choices }) {
        const ch = choices[c.memo.teller]?.option ?? 'whole';
        c.memo.words = ch;
        if (ch === 'benny') {
          if (c.rng.chance(c.memo.bennyWarm ? 0.6 : 0.3)) {
            c.memo.got = 'real';
            c.memo.lateCopy = true;
            c.memo.herself = true;
            c.line('Nonna puts her coat on over her housecoat. Twenty minutes later she comes back up Fifth Street with the velvet box in her hand and does not say one word about what happened in that shop. Not one. Not ever.');
            return;
          }
          c.line('Nonna puts her coat on over her housecoat. Twenty minutes later she is back, without the box, and with a look nobody has seen on her since 1987. “He says hello,” she says. Then she puts the kettle on.');
          c.caseFile(1, 'Benny called Vinnie about the old lady');
        }
      },
    },

    sid: {
      engine: 'story', time: '10:30 P.M.', place: 'Sid’s, Canal Street', title: 'Sid the Jeweler', kicker: 'A COPY',
      run(c) {
        const paid = tablePays(c, c.scale(15000));
        if (!paid.ok) {
          // Sid does it for what there is, and it shows
          c.memo.got = 'fake';
          c.memo.cheapCopy = true;
          c.line(`Between the Bag and everybody’s pockets there’s nothing Sid would call money. He makes it anyway, “for your grandmother,” in two hours instead of eight, and says not to let her hold it to the light.`);
          return;
        }
        c.memo.got = 'fake';
        const s = c.memo.sidNephew;
        if (s && !c.isAway(s)) { const cut = Math.min(10000, paid.paid); c.give(s, cut, 'Uncle Sid'); c.note(s, `Uncle Sid slipped you ${money(cut)} on the way out. “Family,” he said.`, 'Sid'); }
        c.line(`${howPaid(paid)}. Sid works through the night with a loupe in his eye and a photograph from Nonna’s wedding propped against a coffee cup.`);
      },
      text: (c) => [`Sid is seventy-six and has made copies of rings for three generations of wives who were not supposed to find out. ${c.rng.pick(['He says the garnet is the hard part.', 'He says he could make this one in his sleep, and then he nearly does.'])}`],
    },

    truth: {
      engine: 'story', time: '10:00 P.M.', place: 'Nonna’s kitchen', title: 'The Truth', kicker: 'NONNA',
      when: (c) => !c.memo.got,
      run(c) {
        c.set('ring', 'truth');
        const told = c.memo.ringVoters?.filter((id) => !c.isAway(id)) ?? [];
        const who = (c.memo.teller && !c.isAway(c.memo.teller) ? c.memo.teller : null) ?? (told.length ? c.rng.pick(told) : c.free[0]?.id);
        if (!who) return;
        if (c.memo.words === 'sal') {
          (c.p(who).edges ??= []).push({ label: 'Nonna, pretending' });
          c.note(who, 'Nonna knew it was a lie. She patted your hand anyway. (+1 on your next roll.)', 'Nonna');
          return;
        }
        c.card(who, 'nonnas-blessing');
        c.note(who, 'Nonna pressed something into your hand after you told her. “You were the one who said it,” she said.', 'Nonna');
        c.set('ringBy', who);
      },
      text: (c) => [
        c.memo.words === 'sal'
          ? `${c.name(c.memo.teller ?? c.free[0]?.id)} says Sal was always going to buy it back. Any day now. As soon as things settle down.`
          : c.memo.words === 'benny'
            ? 'Nonna sits down at the kitchen table with her coat still on. She says Benny was a beautiful dancer, in 1957. That is all she says about Benny.'
            : `${c.name(c.memo.teller ?? c.memo.ringVoters?.[0] ?? c.free[0]?.id)} says it, in the end, at the kitchen table. The ring is in Benny Castellano’s window. It’s been there since 1987. It isn’t coming home.`,
        c.memo.words === 'sal' ? '“Sal was always going to do a lot of things,” Nonna says, and pats their hand, and nobody at the table believes anybody, and it’s fine.' : c.rng.pick([
          'Nonna is quiet for a long time. Then she laughs until she has to hold on to the table. “I know,” she says. “I walk past it every Sunday. I was waiting to see which one of you would tell me.”',
          'Nonna nods. She gets up, goes to the dresser, and takes out a photograph of her wedding: the ring on her hand, and Sal’s father beside her, very young. “This is the ring,” she says. “That one in the window is just gold.”',
        ]),
      ],
    },

    'nonna-real': {
      engine: 'story', time: at('11:45 P.M.', '3:30 A.M.'), place: 'Nonna’s kitchen', title: 'Nonna', kicker: 'THE RING',
      run(c) {
        const giver = (c.memo.herself ? c.memo.teller : null) ?? (c.memo.presenter && !c.isAway(c.memo.presenter) ? c.memo.presenter : null) ?? c.memo.ringVoters?.find((id) => !c.isAway(id)) ?? c.free[0]?.id;
        c.set('ring', 'real');
        if (giver) c.set('ringBy', giver);
        c.remember('Nonna got her ring back.', { kind: 'ring' });
      },
      text: (c) => c.memo.herself ? [
        'The ring is on Nonna’s hand before she has her coat off. She makes coffee for everybody with it on, and washes up with it on, and does not take it off to put her hands in the water.',
        `Before bed she stops at ${c.name(c.memo.teller)}’s chair. “You told me,” she says. “Nobody else would have.” On Monday, she says, she’ll bless the dice.`,
      ] : [
        'The ring goes on the kitchen table in its velvet box, next to the Bag. Nonna looks at it for a long time without touching it. Then she puts it on.',
        `It fits. She doesn’t say anything. She puts her hand flat on the table so the garnet catches the light, and leaves it there all night. ${c.memo.presenter ? `Before bed she kisses ${c.name(c.memo.presenter)}, who gave it to her, on both cheeks, and nobody else.` : c.memo.ringVoters?.length ? `Before bed she kisses ${c.name(c.memo.ringVoters.find((id) => !c.isAway(id)) ?? c.memo.ringVoters[0])} on both cheeks, and nobody else.` : ''} On Monday, she says, she’ll bless the dice.`,
      ],
    },

    'nonna-fake': {
      engine: 'roll', time: at('11:45 P.M.', '3:30 A.M.', '7:15 A.M.'), place: 'Nonna’s kitchen', title: 'Does Nonna Notice?', kicker: 'THE DICE',
      text: (c) => [
        `${c.memo.lateCopy ? 'At seven, with the coffee, ' : ''}Sid’s copy goes on the kitchen table in a velvet box, next to the Bag.${c.memo.cheapCopy ? ' It was made in two hours.' : ' It is very good.'} Nonna picks it up and holds it to the light.`,
        'Her eyes aren’t what they were. Her memory is.',
      ],
      target: (c) => 8 + (c.memo.bennyWarm === true ? -2 : 0) + (c.memo.blessed ? -1 : 0) + (c.memo.cheapCopy ? 1 : 0),
      label: 'Nonna holds it to the light',
      stakes: 'Make it and she wears it to court none the wiser. Miss it and she knows — and on Monday she curses the dice.',
      resolve(c, r) {
        if (r.success) {
          c.set('ring', 'fake');
          c.line('Nonna turns it over twice, puts it on, and says it’s smaller than she remembered. Then she kisses everybody. Nobody can look at anybody.');
          return;
        }
        c.set('ring', 'fake-caught');
        if (c.memo.presenter) { c.stamp(c.memo.presenter, 'LIAR'); c.line(`${c.name(c.memo.presenter)} gave it to her. It will be a long time before she looks at ${c.name(c.memo.presenter)} again.`); }
        c.line('Nonna turns it over, looks inside the band, and puts it down. “My husband,” she says, “had it engraved.” She goes to bed without saying goodnight. On Monday, she will not bless the dice. She will do the opposite.');
      },
    },

    count: counting({ time: at('12:45 A.M.', '4:15 A.M.', '8:00 A.M.') }),
  },
};
