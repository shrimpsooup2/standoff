// The other side of the river. In a Families game the Castellanos spend
// their nights apart from the Benedettos, at the same time, in their own
// story: Vinnie's collections, the card room over the laundromat, the pages
// of Sal's ledger that turn up at Benny's, and a ferry with seven crates.
//
// They want Sal convicted. Everything they do can help that along — a word to
// Prout, a page in the right envelope — and everything they keep is theirs.

import { counting, money, round5k, share, nightDay, nightKicker, envelopeAdd, envelopeTake, lowerFirst } from '../common.js';
import { vinnie } from '../families.js';

const kick = (c) => `${nightKicker(c)} · ACROSS THE RIVER`;

/** A Castellano's private call: help Prout, keep quiet, or warn the other side. */
function proutCall({ time = '2:15 A.M.', title = 'A Call to Prout' } = {}) {
  return {
    engine: 'choose', time, place: 'A payphone on Front Street', title, kicker: 'YOUR CALL',
    text: (c) => [
      `On the way home everybody passes the same payphone. Prout’s office has a number that is answered at any hour, by a man who writes down whatever you tell him about Sal Benedetto’s people and says “thank you” like he means it. ${c.rng.pick(['The phone is warm. Somebody used it five minutes ago.', 'Somebody has written NONNA KNOWS on the glass in lipstick.', 'It’s raining. Nobody else is on Front Street.'])}`,
      'Tell Prout something true, keep it in the family, or — nobody would ever know — ring Nonna instead.',
    ],
    who: (c) => c.free.map((p) => p.id),
    options: (c) => [
      { id: 'tip', label: 'Call Prout', blurb: `Something true about the Benedettos. Prout’s man pays ${money(c.scale(10000))}, and the case against Sal gets thicker. Prout’s people are careless with names.`, greedy: true },
      { id: 'quiet', label: 'Walk past the phone', blurb: 'Keep it in the family.', honest: true },
      { id: 'warn', label: 'Ring Nonna', blurb: `Tell her what Prout is about to hear. She’ll lose a page of his case, and send ${money(10000)} round in an envelope. If Vinnie ever found out, you would not enjoy it.` },
    ],
    fallback: () => ({ option: 'quiet' }),
    bot(c, p) {
      if (p.secret?.id === 'turncoat') return { option: c.rng.chance(0.7) ? 'warn' : 'quiet' };
      if (p.secret?.id === 'cousins' && c.familyOf(p.secret.partner) === 'b' && c.rng.chance(0.3)) return { option: 'warn' };
      const r = c.rng();
      if (p.style === 'snake' || p.style === 'greedy') return { option: r < 0.6 ? 'tip' : 'quiet' };
      if (p.style === 'nervous') return { option: r < 0.2 ? 'tip' : 'quiet' };
      return { option: r < 0.4 ? 'tip' : 'quiet' };
    },
    resolve(c, { choices }) {
      const tips = Object.entries(choices).filter(([, ch]) => ch.option === 'tip').map(([pid]) => pid);
      const warns = Object.entries(choices).filter(([, ch]) => ch.option === 'warn').map(([pid]) => pid);
      for (const pid of tips) {
        c.give(pid, c.scale(10000), 'Prout’s man');
        c.fact(pid, 'tip', `Did ${c.name(pid)} call Prout tonight?`, true);
        if (c.rng.chance(0.25)) { c.heat(pid, 1, 'Prout’s people are careless with names'); c.note(pid, 'Prout’s man repeated your name back to you. Loudly. In a diner.', 'Prout’s office'); }
      }
      if (tips.length) c.caseFile(1, 'somebody across the river has been talking', true);
      for (const pid of warns) {
        c.give(pid, 10000, 'Nonna');
        c.fact(pid, 'warn', `Did ${c.name(pid)} ring Nonna tonight?`, true);
      }
      if (warns.length) c.caseFile(-1, 'a page of Prout’s case went missing overnight', true);
      for (const [pid, ch] of Object.entries(choices)) {
        if (ch.option !== 'tip') c.fact(pid, 'tip', `Did ${c.name(pid)} call Prout tonight?`, false);
        if (ch.option !== 'warn') c.fact(pid, 'warn', `Did ${c.name(pid)} ring Nonna tonight?`, false);
      }
      c.line(tips.length ? 'The payphone was busy for a while. Nobody asks who was on it.' : 'Everybody walked past the payphone. Vinnie will want to know why.');
    },
  };
}

// ------------------------------------------------------------------------

const ROUTES = {
  'front-street': { label: 'Front Street', vault: 110000, alarm: 0, blurb: 'The bakery, the butcher, the dry cleaner. They have paid every Friday since 1971 and they will pay tonight.' },
  docks: { label: 'The docks', vault: 160000, alarm: 1, blurb: 'The longshoremen’s dues, collected at the union hall. The union has opinions and a lot of forklifts.' },
  mulberry: { label: 'Mulberry Avenue', vault: 200000, alarm: 1, blurb: 'Collect on the Benedettos’ side of the river while Sal is inside. The shops that paid Nonna pay Vinnie now — or they don’t.' },
};

const collection = {
  id: 'c-collection', title: 'The Collection', day: nightDay, kicker: kick,
  beats: ['orders', 'holdout', 'rounds', { maybe: 'street', chance: 0.2 }, 'patrol', 'notebook', 'call', 'envelope'],
  close(c) {
    const r = c.flag('cRoute');
    c.remember(
      r === 'mulberry'
        ? 'Several shopkeepers on Mulberry Avenue told the Courier they had been “asked to reconsider their arrangements” overnight. None of them would say by whom. All of them looked across the river when they said it.'
        : `Business owners on ${r === 'docks' ? 'the waterfront' : 'Front Street'} report nothing unusual overnight. “Nothing to report,” said one, and then again, louder, “nothing to report.”`,
      { courier: r === 'mulberry' ? 'MULBERRY AVE. SHOPS “RECONSIDER ARRANGEMENTS”' : '“NOTHING TO REPORT,” SAY SHOPKEEPERS' },
    );
  },
  defs: {
    orders: {
      engine: 'vote', time: '9:45 P.M.', place: 'The Castellano social club, Front Street', title: 'Vinnie’s Orders', kicker: 'A VOTE',
      text: (c) => [
        `${vinnie(c)} Behind him, the photograph of his father shaking hands with Sinatra. In front of him, a cigar box he calls the Envelope.`,
        '“Sal Benedetto is in county,” he says. “If he stays there, this whole neighbourhood is ours by Christmas. Prout will need a little help. The Envelope is for the help. Tonight, the collections. Where do we go?”',
      ],
      options: (c) => Object.entries(ROUTES).map(([id, r]) => ({
        id, label: r.label, blurb: r.blurb, risk: 0.2 + r.alarm * 0.3, reward: r.vault / 220000,
        details: [`About ${money(c.scale(r.vault))} to collect`, r.alarm ? 'The alarm starts twitchy.' : 'The alarm starts asleep.', ...(id === 'mulberry' ? ['Every Benedetto loses $5k of what their shops paid them.'] : [])],
      })),
      angles(c) {
        const ps = c.rng.shuffle(c.free.map((p) => p.id));
        const out = {};
        if (ps[0]) { out[ps[0]] = { option: 'docks', text: `The docks. Your brother-in-law is the union treasurer. If it’s the docks, ${money(10000)} of the dues goes straight in your pocket before anybody counts.` }; c.memo.inLaw = ps[0]; }
        if (ps[1]) { out[ps[1]] = { option: 'front-street', text: `Front Street. The baker owes you personally from a card game. If it’s Front Street, he pays you first: ${money(10000)}.` }; c.memo.baker = ps[1]; }
        if (ps[2]) { out[ps[2]] = { option: null, text: 'Not Mulberry. You were born on Mulberry Avenue and Nonna Benedetto knows your mother. If it’s Mulberry, somebody will recognise you: one heat, and your mother will hear about it.' }; c.memo.born = ps[2]; }
        for (const id of ps.slice(3)) out[id] = { option: null, text: 'No angle. Just the collections, and Vinnie watching who comes back with what.' };
        return out;
      },
      resolve(c, { choice }) {
        c.set('cRoute', choice);
        c.line(`${ROUTES[choice].label}. Vinnie nods once and goes back to the obituaries.`);
        if (choice === 'mulberry') {
          let lost = 0;
          for (const p of c.family('b')) lost += c.charge(p.id, 5000);
          if (lost) c.line(`Across the river, ${money(lost)} that would have gone to the Benedettos goes to Vinnie instead. They won’t know until the morning.`);
          if (c.memo.born && !c.isAway(c.memo.born)) c.heat(c.memo.born, 1, 'recognised on Mulberry Avenue');
        }
        if (choice === 'docks' && c.memo.inLaw && !c.isAway(c.memo.inLaw)) c.give(c.memo.inLaw, 10000, 'the union dues');
        if (choice === 'front-street' && c.memo.baker && !c.isAway(c.memo.baker)) c.give(c.memo.baker, 10000, 'the baker');
      },
    },
    holdout: {
      engine: 'vote', time: '10:30 P.M.', place: (c) => ROUTES[c.flag('cRoute') ?? 'front-street'].label, title: 'The One Who Won’t Pay', kicker: 'A VOTE',
      text: (c) => {
        const who = {
          'front-street': 'Angelo, who has had the bakery on Front Street since 1971, has put a sign in his window: WE PAY NOBODY. Underneath, smaller: EXCEPT THE GAS COMPANY.',
          docks: 'The union steward, a man called Big Frank with forearms like a ham, is standing in the door of the hall with his arms folded. The dues, he says, are for the union.',
          mulberry: 'Carmela, who has sold Nonna Benedetto her tomatoes for forty years, looks at you across her counter and says, very clearly, “No.”',
        }[c.flag('cRoute') ?? 'front-street'];
        return [`${who} Everybody else on the route is watching to see what happens next.`, 'What happens next?'];
      },
      options: (c) => [
        { id: 'lean', label: 'Lean on them', blurb: 'In front of everybody. Everybody else on the route pays more, and faster — and somebody calls Ray Mancuso.', risk: 0.5, reward: 0.6 },
        { id: 'let', label: 'Let it go, tonight', blurb: 'Mercy, in public. The street is less jumpy for the rest of the rounds. Vinnie will hear you let it go.', risk: 0.2, reward: 0.3 },
        { id: 'prout', label: 'Tell Prout it was the Benedettos leaning on them', blurb: 'Nobody touches anybody. One phone call, and the Case File gets thicker with somebody else’s name on it.', risk: 0.3, reward: 0.5 },
      ],
      resolve(c, { choice }) {
        if (choice === 'lean') {
          c.memo.holdoutMult = 1.2;
          const who = c.freeByJob('muscle') ?? c.rng.pick(c.free);
          if (who && c.rng.chance(0.5)) c.heat(who.id, 1, 'leaning on a shopkeeper in public');
          c.line(`${who?.name ?? 'Somebody'} leans. The sign comes down. Every door on the route has its envelope ready after that — and somebody on the route has Ray Mancuso’s number.`);
        } else if (choice === 'let') {
          c.memo.holdoutAlarm = -1;
          c.line('You let it go, tonight. The whole route saw it. The rest of the doors open a little easier, and one of them offers you coffee.');
        } else {
          c.caseFile(1, 'a shopkeeper’s complaint about the Benedettos, with a Castellano’s help', true);
          c.line('One phone call. By morning Prout has a complaint about Benedettos leaning on the shops, and the shopkeeper has no idea whose voice it was.');
        }
      },
    },

    patrol: {
      engine: 'vote', time: '1:10 A.M.', place: (c) => `${ROUTES[c.flag('cRoute') ?? 'front-street'].label}, the end of the block`, title: 'The Patrol Car', kicker: 'A VOTE',
      text: (c) => [
        `At the end of the block a patrol car noses round the corner with its lights off and stops under the streetlight. Behind the wheel is Officer Duffy of the 9th Precinct, who ${c.memo.holdoutMult ? 'got a phone call twenty minutes ago from somebody on the route' : 'is supposed to be at the diner at this hour'}. He is looking at the notebook on the dashboard.`,
        'What do you do about Duffy?',
      ],
      options: (c) => [
        { id: 'envelope', label: 'Give him an envelope', blurb: `${money(c.scale(10000))} out of tonight’s rounds, from whoever collected the most. Duffy is expensive, but he stays bought.`, risk: 0.1, reward: 0.4 },
        { id: 'vinnie', label: 'Tell him you’re with Vinnie', blurb: 'Most of the 9th Precinct is on Vinnie’s Christmas list. Most.', risk: 0.5, reward: 0.5 },
        { id: 'drive', label: 'Drive away, normal speed', blurb: 'Indicators on, two hands on the wheel. He follows or he doesn’t.', risk: 0.4, reward: 0.3 },
      ],
      resolve(c, { choice }) {
        const hauls = c.memo.hauls ?? {};
        const haulers = Object.keys(hauls).filter((id) => hauls[id] > 0 && c.p(id) && !c.isAway(id)).sort((a, b) => hauls[b] - hauls[a]);
        const leaned = !!c.memo.holdoutMult;
        const d = c.freeByJob('driver');
        if (choice === 'envelope') {
          let need = c.scale(10000);
          for (const id of [...haulers, ...c.free.map((p) => p.id).filter((id) => !haulers.includes(id))]) { if (need <= 0) break; need -= c.charge(id, need); }
          c.line(`${haulers[0] ? c.name(haulers[0]) : 'Somebody'} leans in the window with an envelope. Duffy counts it on his knee, touches his cap, and drives on to the diner.`);
          return;
        }
        if (choice === 'vinnie') {
          if (c.rng.chance(leaned ? 0.4 : 0.65)) { c.line('“Vinnie,” says Duffy, like it’s the name of a saint. He touches his cap and drives on.'); return; }
          c.memo.duffyNotebook = true;
          let lost = 0;
          for (const id of haulers) lost += c.charge(id, round5k(hauls[id] * 0.25));
          if (d) c.heat(d.id, 1, 'Officer Duffy isn’t on Vinnie’s list');
          c.line(`Duffy isn’t on Vinnie’s list. He gets out, takes the notebook off the dashboard, and ${lost ? `${money(lost)} of the envelopes with it, “as evidence.”` : 'looks at every face in the car.'} Everybody will have to write their rounds again from memory.`);
          return;
        }
        if (c.rng.chance(leaned ? 0.6 : 0.3)) {
          c.line('Duffy follows you for eleven blocks at exactly the same speed, then pulls you over outside the social club, in front of Vinnie’s window.');
          if (d) c.heat(d.id, 1, 'pulled over outside the social club');
          for (const id of haulers) if (c.rng.chance(0.5)) c.heat(id, 1, 'Officer Duffy took your name');
          return;
        }
        c.line('Indicators on, two hands on the wheel. Duffy watches you go in his mirror and goes back to his crossword.');
      },
    },

    notebook: {
      engine: 'choose', time: '1:40 A.M.', place: 'The car, outside the social club', title: 'Vinnie’s Notebook', kicker: 'WHAT GOES IN THE BOOK?',
      when: (c) => Object.values(c.memo.hauls ?? {}).some((n) => n > 0),
      text: (c) => [
        c.memo.duffyNotebook
          ? 'Officer Duffy has the notebook. Before anybody goes in to Vinnie, everybody writes their rounds again on the back of a menu, from memory. Memory is a wonderful thing.'
          : 'Before anybody goes in to Vinnie, everybody writes their rounds in the notebook: every door, every envelope, every amount. Vinnie reads the notebook the way other people read scripture.',
        'Write it straight, write it a little short and keep the difference, or cover for a door that couldn’t pay out of your own pocket. Nobody sees anybody else’s page.',
      ],
      who: (c) => Object.entries(c.memo.hauls ?? {}).filter(([id, n]) => n > 0 && c.p(id) && !c.isAway(id)).map(([id]) => id),
      options: () => [
        { id: 'straight', label: 'Write it straight', blurb: 'Every dollar, every door.', honest: true },
        { id: 'short', label: 'Write it a little short', blurb: 'Keep $10k that was never in the notebook. Vinnie reads very carefully.', greedy: true },
        { id: 'cover', label: 'Cover for a door that couldn’t pay', blurb: '$5k of your own, written down as theirs. Somebody on the route owes you now.' },
      ],
      bot(c, p) {
        const r = c.rng();
        if (p.style === 'snake' || p.style === 'greedy') return { option: r < 0.6 ? 'short' : 'straight' };
        if (p.style === 'loyal') return { option: r < 0.3 ? 'cover' : 'straight' };
        return { option: r < 0.25 ? 'short' : 'straight' };
      },
      resolve(c, { choices }) {
        let caught = 0;
        for (const [pid, ch] of Object.entries(choices)) {
          if (ch.option === 'short') {
            if (c.rng.chance(c.memo.duffyNotebook ? 0.15 : 0.3)) {
              caught += 1;
              const n = c.charge(pid, 20000);
              envelopeAdd(c, n);
              c.stamp(pid, 'SKIM');
              c.note(pid, `Vinnie read your page twice, then took ${money(n)} out of your pocket and put it in the Envelope. He didn’t say a word. Everybody saw.`, 'Vinnie');
            } else {
              c.give(pid, 10000, 'the notebook');
              c.note(pid, 'Ten thousand dollars that were never in the notebook are in your coat. Vinnie read your page once and nodded.', 'the notebook');
            }
            c.fact(pid, 'skim', `Did ${c.name(pid)} write their rounds short?`, true);
          } else {
            if (ch.option === 'cover') {
              c.charge(pid, 5000);
              (c.p(pid).edges ??= []).push({ label: 'a shopkeeper who owes you' });
              c.note(pid, 'You paid $5k of your own for a door that couldn’t. The dry cleaner on Front Street will remember. (+1 on your next roll.)', 'the notebook');
            }
            c.fact(pid, 'skim', `Did ${c.name(pid)} write their rounds short?`, false);
          }
        }
        c.line(caught ? `Vinnie read the notebook in silence, and stopped on ${caught === 1 ? 'one page' : `${caught} pages`}. Somebody has a new word on their seat.` : 'Vinnie read the notebook in silence, turned the last page, and said, “Good.”');
      },
    },

    rounds: {
      engine: 'grab', time: '11:30 P.M.', place: (c) => ROUTES[c.flag('cRoute') ?? 'front-street'].label, title: 'The Rounds', kicker: 'HOW GREEDY ARE YOU?',
      text: (c) => {
        const d = c.freeByJob('driver');
        return [
          `Door to door, with a notebook. ${c.rng.pick(['Most of them have it ready in an envelope.', 'The butcher pays in cash and a pound of veal, which nobody knows what to do with.', 'Somebody’s grandmother answers every door and pays for all of them.'])} Somebody on the street has already called somebody.`,
          `Every round, grab or go: another block, another envelope, and the chance that the next shopkeeper is on the phone to Ray Mancuso. ${d ? `${d.name} is idling at the end of the block.` : 'Nobody is watching the car.'}`,
        ];
      },
      vault: (c) => round5k(c.scale(ROUTES[c.flag('cRoute') ?? 'front-street'].vault) * (c.memo.holdoutMult ?? 1) * (0.85 + c.rng() * 0.3)),
      alarm: (c) => Math.max(0, ROUTES[c.flag('cRoute') ?? 'front-street'].alarm + (c.memo.holdoutAlarm ?? 0)),
      resolve(c, r) {
        const total = Object.values(r.hauls).reduce((a, b) => a + b, 0);
        c.memo.hauls = r.hauls;
        c.line(total ? `${money(total)} in envelopes, a notebook full of names, and a pound of veal.` : 'Nobody came back with anything. Vinnie wrote something down.');
      },
    },
    call: proutCall(),
    envelope: counting({ time: '2:40 A.M.' }),
  },
};

// ------------------------------------------------------------------------

const TABLE_FOUR = [
  { id: 'dentist', label: 'The dentist from Bay Ridge',
    yes: 'The dentist has been in every game for a month and has never once talked about teeth.',
    no: 'The dentist did Vinnie’s bridgework in 1998. Vinnie would know his hands anywhere.' },
  { id: 'cap', label: 'The man in the Mets cap',
    yes: 'The man in the Mets cap doesn’t know who pitched last night. Everybody in a Mets cap knows who pitched last night.',
    no: 'The man in the Mets cap cried when the Mets lost on Sunday. Nobody undercover cries about the Mets.' },
  { id: 'quiet', label: 'The quiet one who tips in quarters',
    yes: 'The quiet one keeps touching his left sock, like there’s something in it that isn’t a sock.',
    no: 'The quiet one is Father Dominic’s nephew. He has been quiet since birth.' },
  { id: 'winner', label: 'The one who keeps winning',
    yes: 'The one who keeps winning is winning on purpose: the department gives him a budget, and it isn’t his money.',
    no: 'The one who keeps winning is cheating, badly. Cops don’t cheat at cards. They don’t need to.' },
];

const cardRoom = {
  id: 'c-card-room', title: 'The Card Room', day: nightDay, kicker: kick,
  beats: [
    { if: (c) => c.flag('war') && !c.flag('cAnswered'), then: 'the-answer' },
    { if: (c) => c.memo.answer === 'drive', then: 'the-drive' },
    'the-marker',
    'the-game',
    'the-cop',
    { maybe: 'street', chance: 0.2 },
    'last-hand',
    'the-house',
    'envelope',
  ],
  close(c) {
    c.remember(
      c.memo.copFound
        ? 'An off-duty officer was found on Front Street early on Wednesday with no shoes, no wallet and no memory of how he got there. He declined to press charges.'
        : 'Police are said to have “significant intelligence” about an illegal card game operating above a laundromat on Front Street. The laundromat declined to comment. So did the card game.',
      { courier: c.memo.copFound ? 'OFF-DUTY COP FOUND WITHOUT SHOES' : 'CARD GAME “UNDER OBSERVATION”' },
    );
  },
  defs: {
    'the-answer': {
      engine: 'vote', time: '9:00 P.M.', place: 'The Castellano social club', title: 'Somebody Robbed Our Bank', kicker: 'A VOTE',
      text: (c) => [
        `On Monday night the Benedettos robbed the Castellano Credit Union. ${vinnie(c)}`,
        '“So,” he says. “What do we do about it?”',
      ],
      options: (c) => [
        { id: 'drive', label: 'Take one of them for a drive', blurb: 'Pick a Benedetto. They come home at dawn without half of what they had.', risk: 0.5, reward: 0.7 },
        { id: 'tax', label: 'Tax them', blurb: 'Every Benedetto pays $10k, one way or another, and it goes in the Envelope.', risk: 0.3, reward: 0.5 },
        { id: 'prout', label: 'Give Prout the bank', blurb: 'Tell Prout exactly who robbed the Credit Union. The Case File grows by two.', risk: 0.2, reward: 0.4 },
      ],
      resolve(c, { choice }) {
        c.set('cAnswered', choice);
        c.memo.answer = choice;
        if (choice === 'tax') {
          let n = 0;
          for (const p of c.family('b')) n += c.charge(p.id, 10000);
          envelopeAdd(c, n);
          c.line(`${money(n)} comes across the river by morning, in envelopes that were left on car seats and under doormats. It goes in Vinnie’s Envelope.`);
          for (const p of c.family('b')) c.note(p.id, 'Somebody took $10k out of your car overnight and left a Castellano Credit Union deposit slip in its place.', 'your car');
        } else if (choice === 'prout') {
          c.caseFile(2, 'Prout knows exactly who robbed the Castellano Credit Union');
          c.line('Vinnie makes one phone call. Prout says “thank you” twice.');
        } else {
          c.line('Vinnie nods. “Pick one,” he says.');
        }
      },
    },
    'the-drive': {
      engine: 'vote', time: '9:20 P.M.', place: 'The Castellano social club', title: 'Who Goes for a Drive', kicker: 'PICK ONE OF THEM',
      text: () => ['Everybody at the table picks a Benedetto. Whoever gets the most votes gets a knock on the door at two in the morning, and a very long drive to the Jersey marshes.'],
      candidates: (c) => c.family('b').map((p) => p.id),
      noSelf: false,
      resolve(c, { choice }) {
        const t = c.p(choice);
        const n = c.charge(t.id, round5k(t.cash / 2));
        envelopeAdd(c, round5k(n / 2));
        const card = t.cards.length ? c.rng.pick(t.cards) : null;
        if (card) { c.g.takeCard(t.id, card.uid); c.g.discardCard(card); }
        c.line(`${t.name} gets the knock. They come home at dawn without their shoes${n ? ` and without ${money(n)}` : ''}${card ? ', and one card lighter' : ''}. Half of it goes in Vinnie’s Envelope.`);
        c.note(t.id, `At two in the morning the Castellanos took you for a drive. You lost ${money(n)}${card ? ' and a card' : ''}. You know exactly which family.`, 'the Jersey marshes');
        for (const p of c.free) c.g.bond(p.id, t.id, 'took-for-a-drive');
        c.remember(`${t.name} was taken for a drive by the Castellanos.`, { who: t.id, kind: 'taken' });
      },
    },
    'the-game': {
      engine: 'whispers', time: '11:15 P.M.', place: 'Above the Sunshine Laundromat, Front Street', title: 'The Cop at Table Four', kicker: 'WHICH ONE IS HE?',
      whoLabel: 'One of the men at table four is a cop.',
      text: (c) => {
        const t = c.freeByJob('talker')?.name ?? 'Somebody';
        return [
          `The card room is full: six tables, cigar smoke, the Knicks on a television with the sound off. Ray Mancuso called an hour ago with one sentence: there’s a cop at table four tonight. ${c.rng.pick(['Ray wouldn’t say which.', 'Ray didn’t know which.', 'Ray was eating while he said it.'])}`,
          `${t} has to walk over and tap one of them on the shoulder. Everybody else knows one thing about one of the men at the table.`,
        ];
      },
      openings: () => TABLE_FOUR,
      filler: () => ['The card room’s coffee is so strong that the cups are stained brown inside, permanently.', 'Nobody has opened a window in the card room since 1977.', 'Table two is Vinnie’s brother, losing, which is the only thing he ever does at table two.'],
      resolve(c, { success, openingLabel, talker }) {
        if (success) {
          c.memo.copFound = true;
          const n = envelopeAdd(c, c.scale(15000));
          c.line(`${c.name(talker)} tapped ${lowerFirst(openingLabel)} on the shoulder. It was him. He left by the back stairs, quickly, without his wallet. There was ${money(n)} in it, and it goes in the Envelope.`);
          return;
        }
        c.memo.raided = true;
        c.line(`${c.name(talker)} tapped ${lowerFirst(openingLabel)} on the shoulder. Wrong man — and the real cop watched it happen, and wrote down everybody’s face.`);
        c.heat(talker, 2, 'the wrong man at table four');
        for (const p of c.free) if (p.id !== talker && c.rng.chance(0.4)) c.heat(p.id, 1, 'a cop at the card room');
      },
    },
    'the-marker': {
      engine: 'vote', time: '10:30 P.M.', place: 'Above the Sunshine Laundromat, Front Street', title: 'The Marker', kicker: 'A VOTE',
      text: (c) => [
        `A man from Bensonhurst in a camel coat — a good customer, until tonight — wants credit. ${money(c.scale(20000))} of the house’s money, a marker in his handwriting, and he swears on his mother he’s good for it by Sunday.`,
        'The whole room is watching to see if the Castellanos still give credit. Do you?',
      ],
      options: (c) => [
        { id: 'extend', label: 'Give him the marker', blurb: 'If he pays, he pays double, and the room sees you’re good for it. If he doesn’t, it comes out of tonight’s take.', risk: 0.5, reward: 0.6 },
        { id: 'refuse', label: 'Politely, no', blurb: 'Nobody gets credit this week. The room takes note.', risk: 0.1, reward: 0.2 },
        { id: 'out', label: 'Put him out on the stairs', blurb: 'In front of everybody. Nobody asks for credit again this year. Somebody on the stairs calls a cop.', risk: 0.5, reward: 0.3 },
      ],
      resolve(c, { choice }) {
        const n = c.scale(20000);
        if (choice === 'extend') {
          if (c.rng.chance(0.55)) { c.memo.markerBack = n; c.line(`He wins with your money, pays the marker back double before midnight, and tips the dealer. The room decides the Castellanos are fine, whatever the Benedettos did to their bank.`); }
          else { c.memo.markerBack = -n; c.line('He loses your money by eleven and leaves by the fire escape. The marker is in his handwriting, for what that’s worth.'); }
        } else if (choice === 'out') {
          const who = c.freeByJob('muscle') ?? c.rng.pick(c.free);
          if (who) c.heat(who.id, 1, 'a man thrown down the stairs');
          c.line(`${who?.name ?? 'Somebody'} walks him down the stairs, not gently. Nobody asks for credit again. Somebody on the stairs has a cousin at the 9th Precinct.`);
        } else c.line('“Politely, no.” He goes. Two other men at the tables quietly count their chips.');
      },
    },

    'the-cop': {
      engine: 'vote', time: '12:30 A.M.', place: 'The back stairs, Sunshine Laundromat', title: (c) => (c.memo.copFound ? 'The Wallet' : 'The Notebook'), kicker: 'A VOTE',
      text: (c) => (c.memo.copFound ? [
        'The cop from table four left in a hurry, and on the back stairs is what he dropped on the way down: a wallet, a badge, and a little notebook of names from three weeks of Tuesday games.',
        'What do you do with it?',
      ] : [
        'The cop from table four is still at table four. He has put his cards down and taken out a little notebook, and he is writing down every face in the room, in order, without hurrying.',
        'What do you do?',
      ]),
      options: (c) => (c.memo.copFound ? [
        { id: 'return', label: 'Send the badge back to the precinct', blurb: 'In an envelope, no note. A cop who owes the Castellanos a favour is worth more than a badge.', risk: 0.2, reward: 0.5 },
        { id: 'prout', label: 'Give Prout his notebook', blurb: 'Three weeks of names from a Castellano card room, minus the Castellanos. Plus a few Benedettos, written in.', risk: 0.4, reward: 0.6 },
        { id: 'burn', label: 'Burn the lot', blurb: 'No badge, no notebook, no names.', risk: 0.1, reward: 0.2 },
      ] : [
        { id: 'pay', label: 'Buy him a drink, and his notebook', blurb: `${money(5000)} each. Everybody’s name comes out of it.`, risk: 0.2, reward: 0.5 },
        { id: 'close', label: 'Close the room early', blurb: 'Lights on, cards away. Half the house take, and nothing else for him to write.', risk: 0.1, reward: 0.2 },
        { id: 'nothing', label: 'Let him write', blurb: 'It’s a card game. Let him prove otherwise.', risk: 0.6, reward: 0.2 },
      ]),
      resolve(c, { choice }) {
        if (choice === 'return') {
          for (const p of c.free) (p.edges ??= []).push({ label: 'a cop who owes Vinnie' });
          c.line('The badge goes back to the 9th Precinct in a plain envelope. Somebody there will look the other way, once, for each of you. (+1 on everybody’s next roll.)');
        } else if (choice === 'prout') {
          c.caseFile(1, 'a cop’s notebook from a Castellano card room, with Benedetto names written in', true);
          c.line('The notebook goes to Prout with a few extra names in it, in a very good copy of the cop’s handwriting. Every one of them is a Benedetto.');
        } else if (choice === 'burn') c.line('Badge, wallet and notebook go into the incinerator in the basement. Nobody will ever know how close it was.');
        else if (choice === 'pay') {
          let n = 0;
          for (const p of c.free) { n += c.charge(p.id, 5000); if (p.heat > 0) p.heat -= 1; }
          c.line(`${money(n)} and a very good bottle. He tears out the pages himself. Everybody’s heat cools a little.`);
        } else if (choice === 'close') {
          c.memo.locked = true;
          c.line('The lights go on and the cards go away. The room empties in four minutes flat. The cop is the last to leave, and he says goodnight to everybody by name.');
        } else {
          for (const p of c.free) if (c.rng.chance(0.4)) c.heat(p.id, 1, 'a cop’s notebook');
          c.line('He writes until his pen runs out, borrows one from the dealer, and keeps writing.');
        }
      },
    },

    'last-hand': {
      engine: 'choose', time: '2:45 A.M.', place: 'Table one, above the Sunshine Laundromat', title: 'The Last Hand', kicker: 'YOUR CALL',
      text: (c) => [
        c.memo.locked
          ? 'The room is closed, but the last hand of the night never is. It moves into the office, with the door shut and the blinds down.'
          : 'The room has thinned out to one table. The last hand of the night is always the big one.',
        `A man from the Teamsters pension fund has ${money(c.scale(60000))} in front of him and nowhere to be. Everybody can sit in, or not. Jumbo keeps a marked deck in the drawer behind the bar. Nobody sees what anybody else decides.`,
      ],
      who: (c) => c.free.map((p) => p.id),
      options: (c, pid) => [
        { id: 'out', label: 'Sit it out', blurb: 'Drink the coffee. Keep what you have.', honest: true },
        { id: 'straight', label: `Sit in, straight (${money(10000)})`, blurb: 'Honest cards. Win and you take a piece of his pile. Lose and it’s your ten.', disabled: c.p(pid).cash < 10000 ? 'You don’t have the buy-in.' : null },
        { id: 'marked', label: `Sit in with Jumbo’s deck (${money(10000)})`, blurb: 'You’ll win. Probably. If the Teamster notices, the whole of Front Street hears about it, and so does the house take.', greedy: true, disabled: c.p(pid).cash < 10000 ? 'You don’t have the buy-in.' : null },
      ],
      fallback: () => ({ option: 'out' }),
      bot(c, p, opts) {
        if (!opts.some((o) => o.id === 'straight')) return { option: 'out' };
        const r = c.rng();
        const marked = { snake: 0.45, greedy: 0.4, wild: 0.3 }[p.style] ?? 0.08;
        if (r < marked) return { option: 'marked' };
        if (r < marked + ({ wild: 0.4, loyal: 0.2 }[p.style] ?? 0.25)) return { option: 'straight' };
        return { option: 'out' };
      },
      resolve(c, { choices }) {
        const straight = Object.keys(choices).filter((id) => choices[id].option === 'straight');
        const marked = Object.keys(choices).filter((id) => choices[id].option === 'marked');
        const seated = [...straight, ...marked];
        for (const id of seated) c.charge(id, 10000);
        for (const id of Object.keys(choices)) c.fact(id, 'marked', `Did ${c.name(id)} play the last hand with Jumbo’s deck?`, marked.includes(id));
        if (!seated.length) { c.line('Nobody sits in. The Teamster plays solitaire for an hour, tips the dealer a hundred dollars, and goes home.'); return; }
        const caught = marked.filter(() => c.rng.chance(c.memo.raided ? 0.35 : 0.25));
        if (caught.length) {
          c.memo.cheat = true;
          for (const id of seated) if (!marked.includes(id)) c.give(id, 10000, 'the last hand');
          for (const id of caught) c.stamp(id, 'CHEAT');
          c.line(`Halfway through the hand the Teamster holds a card up to the light, looks at ${c.list(caught.map((id) => c.name(id)))}, and puts his coat on. He takes his whole pile with him, and the story of Jumbo’s deck goes down Front Street faster than he does. The straight players get their buy-ins back.`);
          return;
        }
        const winners = [...marked, ...straight.filter(() => c.rng.chance(0.45))];
        if (!winners.length) { c.line(`The Teamster wins. Everybody who sat in is ${money(10000)} lighter, and he tips the dealer out of it.`); return; }
        const pile = c.scale(60000);
        const each = round5k(pile / winners.length);
        for (const id of winners) c.give(id, 10000 + each, 'the last hand');
        const losers = seated.filter((id) => !winners.includes(id));
        c.line(`${c.list(winners.map((id) => c.name(id)))} take${winners.length === 1 ? 's' : ''} the Teamster’s pile: ${money(each)} ${winners.length === 1 ? '' : 'each '}on top of the buy-in.${losers.length ? ` ${c.list(losers.map((id) => c.name(id)))} played it straight and lost ${money(10000)}.` : ''}`);
      },
    },

    'the-house': {
      engine: 'report', time: '3:30 A.M.', place: 'The office behind the card room', title: 'The House Take', kicker: 'SOMEBODY COUNTS IT',
      text: (c) => [
        `The house take goes into a biscuit tin and the biscuit tin goes into the office, where there is room for exactly one person and a calculator. ${c.memo.raided ? 'After the business at table four, half the tables emptied early.' : 'It was a good night.'}`,
        `${c.freeByJob('numbers')?.name ?? 'Whoever counts'} counts. Whatever they say it comes to is split evenly. Whatever they don’t say, they keep.`,
      ],
      amount: (c) => Math.max(0, round5k(c.scale(90000) * (c.memo.raided ? 0.55 : 1) * (c.memo.locked ? 0.5 : 1) * (c.memo.cheat ? 0.8 : 1) * (0.85 + c.rng() * 0.3)) + (c.memo.markerBack ?? 0)),
      resolve(c, { reported, counter }) {
        const ids = c.free.map((p) => p.id);
        const each = share(c, ids, reported, 'the house take');
        c.line(`${c.name(counter)} came out of the office and said ${money(reported)}. Split ${ids.length} ways: ${money(each)} each.`);
      },
    },
    envelope: counting({ time: '4:10 A.M.' }),
  },
};

// ------------------------------------------------------------------------

const fencePrice = (c) => round5k(c.scale(40000) * (c.memo.fenceMult ?? 1));

const pages = {
  id: 'c-pages', title: 'The Pages', day: nightDay, kicker: kick,
  beats: ['benny-talk', 'the-fence', { if: (c) => c.memo.gotPages, then: ['back-door', 'the-pages'], else: ['seizure', 'benny-furious'] }, 'sell', 'call', 'envelope'],
  close(c) {
    c.remember(
      c.memo.leaked ? 'Page six of this morning’s Courier carries a photograph of a handwritten page from what a source calls “a very interesting book.” Several names are visible. Several families have stopped reading page six.'
        : 'Castellano Pawn & Loan was closed all day Thursday “for inventory.”',
      { courier: c.memo.leaked ? 'A PAGE FROM “A VERY INTERESTING BOOK”' : 'PAWN SHOP CLOSED FOR INVENTORY' },
    );
  },
  defs: {
    'benny-talk': {
      engine: 'whispers', time: '9:40 P.M.', place: 'Castellano Pawn & Loan, the counter', title: 'Cousin Benny', kicker: 'ONE OF YOU TALKS',
      whoLabel: 'Benny Castellano, eighty, behind the counter',
      text: (c) => {
        const t = c.freeByJob('talker')?.name ?? 'Somebody';
        return [
          `Before anybody gets near the back room, somebody has to get Benny talking. ${c.rng.pick(['He is eating soup at the counter with his hat on.', 'He is polishing a trumpet nobody will ever buy.', 'He is listening to an opera on a radio with one working speaker.'])} Family or not, Benny sets his prices by how much he likes you.`,
          `${t} goes to the counter. Everybody else knows one thing about Benny. Pass it on — as written, turned around, or not at all.`,
        ];
      },
      openings: () => [
        { id: 'cash', label: 'Put cash on the counter first',
          yes: 'Benny doesn’t talk until he has seen money. Then he doesn’t stop.',
          no: 'Between family, Benny thinks cash on the counter before you’ve said hello is an insult.' },
        { id: 'hand', label: 'Ask him whose handwriting it is',
          yes: 'Benny is very proud that he knew Sal’s hand on sight. Flatter his eye and he’ll deal.',
          no: 'Benny pretends not to read English whenever it suits him. Tonight it suits him.' },
        { id: 'cat', label: 'Admire the cat',
          yes: 'Benny’s cat, Mussolini, is the only living thing Benny loves without conditions.',
          no: 'Mussolini bit Vinnie in 1996. Admiring the cat is taking a side.' },
        { id: 'nonna', label: 'Mention Nonna Benedetto',
          yes: 'Benny was sweet on Nonna Benedetto in 1957, and it makes him soft about anything of Sal’s.',
          no: 'Benny hears the name Benedetto and doubles every price in the shop.' },
      ],
      filler: () => ['Benny’s shop sign has said CLOSING DOWN — EVERYTHING MUST GO since 1991.', 'Benny keeps a shotgun under the counter, and everybody on Fifth Street knows it.'],
      resolve(c, { success, openingLabel, talker }) {
        c.memo.bennyWarm = !!success;
        c.memo.fenceMult = success ? 0.6 : 1.3;
        c.memo.squeezeMod = success ? 2 : -1;
        c.line(success
          ? `${c.name(talker)} tried ${lowerFirst(openingLabel)}. Benny put his soup down and took them into the back himself. He is going to be reasonable. He says so.`
          : `${c.name(talker)} tried ${lowerFirst(openingLabel)}. Benny looked at them with his bad ear turned their way, and when he named his price, it had gone up.`);
      },
    },

    'the-fence': {
      engine: 'vote', time: '10:00 P.M.', place: 'The back room at Castellano Pawn & Loan', title: 'Benny’s Back Room', kicker: 'A VOTE',
      text: (c) => [
        `Benny Castellano is eighty, Vinnie’s cousin, and deaf in whichever ear is convenient. Somebody sold him a shoebox last week, and at the bottom of the shoebox are loose pages in Sal Benedetto’s handwriting. ${c.rng.pick(['Benny wants to be paid. Benny always wants to be paid.', 'Benny says he hasn’t read them. Benny has read them.'])}`,
        'How do they come home?',
      ],
      options: (c) => [
        { id: 'buy', label: 'Pay Benny', blurb: `${money(fencePrice(c))} out of the Envelope. All of it, no questions.`, risk: 0.1, reward: 0.5, details: [`The Envelope has ${money(c.s.envelope?.total ?? 0)}.`] },
        { id: 'squeeze', label: 'Lean on Benny', blurb: 'He’s family. He’s also eighty. A roll, and if it goes wrong he keeps half and tells Vinnie.', risk: 0.5, reward: 0.6 },
        { id: 'prout', label: 'Tell Prout where they are', blurb: 'Let Prout seize the lot. Nobody gets a page, and the Case File grows by two.', risk: 0.2, reward: 0.3 },
      ],
      resolve(c, { choice }) {
        if (choice === 'prout') {
          c.caseFile(2, 'Prout found pages of the ledger in a pawn shop');
          c.line('Vinnie makes a call. By midnight there are two detectives in Benny’s back room, and Benny is furious with everybody.');
          return;
        }
        if (choice === 'buy') {
          const want = fencePrice(c);
          if ((c.s.envelope?.total ?? 0) >= want) {
            envelopeTake(c, want);
            c.memo.gotPages = 'all';
            c.line(`${money(want)} out of the Envelope. Benny counts it twice and slides the shoebox across.`);
            return;
          }
          c.line('The Envelope doesn’t have it. Benny shrugs and gives you half the pages for what’s in your pockets.');
          c.memo.gotPages = 'half';
          return;
        }
        const r = c.rng.int(1, 6) + c.rng.int(1, 6) + (c.freeByJob('muscle') ? 1 : 0) + (c.memo.squeezeMod ?? 0);
        c.memo.gotPages = r >= 7 ? 'all' : 'half';
        c.line(r >= 7 ? `Benny sighed, called you all ungrateful, and handed the shoebox over. (${r} on the dice.)` : `Benny held on to half the shoebox with both hands and a surprising grip. (${r} on the dice.) He’s calling Vinnie.`);
      },
    },
    seizure: {
      engine: 'roll', time: '11:10 P.M.', place: 'Benny’s back room, full of detectives', title: 'While They Count', kicker: 'THE DICE',
      enter(c) { c.memo.palmer = (c.freeByJob('numbers') ?? c.freeByJob('talker') ?? c.free[0])?.id ?? null; },
      text: (c) => [
        'Two detectives from the 9th Precinct are counting Sal’s pages into evidence bags on Benny’s workbench, out loud, one at a time. Benny is in the corner with his arms folded, looking at everybody who isn’t a detective.',
        `${c.name(c.memo.palmer)} is standing very close to the workbench. One page could go up a sleeve, and nobody would count it twice.`,
      ],
      target: (c) => 8 - (c.memo.bennyWarm ? 1 : 0),
      roller: (c) => c.memo.palmer,
      label: (c) => `${c.name(c.memo.palmer)} palms a page`,
      stakes: 'Make it and one page with a Benedetto’s name on it goes home in a sleeve. Miss it and a detective writes your name down.',
      resolve(c, r) {
        const pid = c.memo.palmer;
        if (!pid) return;
        if (!r.success) {
          c.heat(pid, 1, 'a detective saw your sleeve');
          c.line(`The detective counting stops at forty-one, looks at ${c.name(pid)}’s sleeve, and holds out his hand. He writes the name down very neatly.`);
          return;
        }
        const pool = c.family('b').length ? c.family('b') : c.players.filter((p) => p.id !== pid);
        const about = pool.length ? c.rng.pick(pool) : null;
        const card = about ? c.card(pid, 'ledger-page') : null;
        if (card) { card.about = about.id; card.line = `${about.name} — a page that never made it into an evidence bag`; }
        c.line(`Forty-one pages go into evidence. Forty-two came out of the shoebox. ${c.name(pid)} keeps both hands in their pockets all the way home.`);
        if (about && c.familyOf(about.id) === 'b') c.note(about.id, 'A page of Sal’s ledger with your name on it has ended up across the river.', 'Benny’s shoebox');
      },
    },

    'benny-furious': {
      engine: 'vote', time: '12:15 A.M.', place: 'Castellano Pawn & Loan, after the detectives', title: 'Benny, in the Dark', kicker: 'A VOTE',
      text: () => [
        'The detectives are gone, and so are the pages. Benny is sitting in his dark shop with the cat on his lap, and he wants to know who called them. He is going to ring Vinnie in five minutes either way.',
        'What does Benny hear?',
      ],
      options: (c) => [
        { id: 'pay', label: 'Pay him for his trouble', blurb: `${money(c.scale(15000))} out of the Envelope, and Benny forgets the whole evening.`, risk: 0.1, reward: 0.4, details: [`The Envelope has ${money(c.s.envelope?.total ?? 0)}.`] },
        { id: 'blame', label: 'Tell him it was the Benedettos', blurb: 'Nonna called the police on her own son’s pages. Benny will tell the whole of Front Street by breakfast — if he believes it.', risk: 0.4, reward: 0.5 },
        { id: 'truth', label: 'Tell him the truth', blurb: 'Vinnie’s orders. Benny will ring Vinnie, and Vinnie will back you. Or he won’t.', risk: 0.5, reward: 0.4 },
      ],
      resolve(c, { choice }) {
        if (choice === 'pay') {
          const want = c.scale(15000);
          if ((c.s.envelope?.total ?? 0) >= want) { envelopeTake(c, want); c.line(`${money(want)} out of the Envelope. Benny counts it in the dark by feel, and says he has had a very quiet evening.`); return; }
          c.set('bennyAngry', true);
          c.line('The Envelope doesn’t have it. Benny laughs in the dark, which is not a nice sound, and reaches for the phone.');
          return;
        }
        if (choice === 'blame') {
          if (c.rng.chance(0.6)) {
            c.caseFile(1, 'Front Street says the Benedettos gave up Sal’s own pages', true);
            c.line('Benny believes it, because he wants to. By breakfast every shop on Front Street knows the Benedettos called the police on Sal’s own handwriting.');
            return;
          }
          c.set('bennyAngry', true);
          c.line('Benny strokes the cat for a long time. “Nonna Benedetto,” he says, “would sooner eat that shoebox.” He reaches for the phone.');
          return;
        }
        if (c.rng.chance(0.5)) {
          for (const p of c.free) (p.edges ??= []).push({ label: 'Vinnie backed you' });
          c.line('Benny rings Vinnie. Vinnie says three words. Benny hangs up, and pours everybody a grappa. (+1 on everybody’s next roll.)');
          return;
        }
        const who = c.rng.pick(c.free);
        const n = who ? envelopeAdd(c, c.charge(who.id, 10000)) : 0;
        c.line(`Benny rings Vinnie. Vinnie, on an open line, says he never gave any such order, and that somebody should make it right with his cousin. ${who ? `${who.name} makes it right: ${money(n)}, into the Envelope, for Benny.` : ''}`);
      },
    },

    'back-door': {
      engine: 'vote', time: '11:00 P.M.', place: 'The alley behind Castellano Pawn & Loan', title: (c) => (c.memo.gotPages === 'all' ? 'Nicky Wants One' : 'The Grandson'), kicker: 'A VOTE',
      text: (c) => (c.memo.gotPages === 'all' ? [
        'Nicky Castellano has heard about the shoebox and turned up at the back door in the Honda Civic, out of breath. He wants a page. Just one. He wants to show his friends a page of Sal Benedetto’s book with somebody famous on it.',
        'Does Nicky get a page?',
      ] : [
        'Benny’s grandson is at the back door with the other half of the shoebox inside his jacket. He’ll sell it to you — not to his grandfather, not to Vinnie, to you — for cash, tonight, out of your own pockets.',
        'Do you buy the other half?',
      ]),
      options: (c) => (c.memo.gotPages === 'all' ? [
        { id: 'give', label: 'Give him one', blurb: 'The least interesting page. He’ll brag about it, everywhere, to everybody.', risk: 0.5, reward: 0.2 },
        { id: 'no', label: 'No', blurb: 'He sulks. He tells Benny. Benny tells Vinnie.', risk: 0.2, reward: 0.3 },
      ] : [
        { id: 'buy', label: 'Buy it, out of your own pockets', blurb: `${money(5000)} each. The other half of the shoebox.`, risk: 0.1, reward: 0.6 },
        { id: 'take', label: 'Just take it off him', blurb: 'He’s nineteen. He’s Benny’s grandson. Benny will never forgive it.', risk: 0.6, reward: 0.6 },
        { id: 'no', label: 'Send him home', blurb: 'Half a shoebox is enough.', risk: 0, reward: 0.1 },
      ]),
      resolve(c, { choice }) {
        if (choice === 'give') { c.memo.extraPages = -1; c.caseFile(1, 'a page of the ledger, passed round a bar on Front Street', true); c.line('Nicky gets a page. By one in the morning it has been passed round every bar on Front Street, and one of the people who read it works for Prout.'); }
        else if (choice === 'no' && c.memo.gotPages === 'all') c.line('Nicky sulks all the way back to the Civic and calls Benny from the payphone. Benny calls Vinnie. Vinnie says, “Good.”');
        else if (choice === 'buy') { let n = 0; for (const p of c.free) n += c.charge(p.id, 5000); c.memo.extraPages = 2; c.line(`${money(n)} in the grandson’s jacket, and the other half of the shoebox on the workbench.`); }
        else if (choice === 'take') { c.memo.extraPages = 2; c.set('bennyAngry', true); c.line('The other half of the shoebox comes out of the jacket. The grandson cries. Benny, at the window upstairs, sees all of it.'); }
        else c.line('The grandson goes home with half a shoebox and a very bad idea about who to sell it to next.');
      },
    },

    sell: {
      engine: 'choose', time: '12:30 A.M.', place: 'Wherever you are with a page in your coat', title: 'Where the Page Goes', kicker: 'YOUR CALL',
      when: (c) => c.free.some((p) => p.cards.some((x) => x.id === 'ledger-page' && x.about && c.familyOf(x.about) === 'b')),
      text: () => [
        'Everybody holding a page with a Benedetto’s name on it has the rest of the night to decide where it goes. Nobody sees anybody else decide.',
        'Prout pays for pages. Nonna pays more, and never asks where they came from. Or keep it, and see what it’s worth on Monday.',
      ],
      who: (c) => c.free.filter((p) => p.cards.some((x) => x.id === 'ledger-page' && x.about && c.familyOf(x.about) === 'b')).map((p) => p.id),
      options: () => [
        { id: 'prout', label: 'Give it to Prout', blurb: '$10k from Prout’s man, and the Benedettos’ case gets a page thicker.', greedy: true },
        { id: 'keep', label: 'Keep it', blurb: 'It’s worth something on Monday. It’s dirt until then.', honest: true },
        { id: 'nonna', label: 'Sell it back to Nonna', blurb: '$15k, no questions. It helps Sal. If Vinnie ever found out, you would not enjoy it.' },
      ],
      bot(c, p) {
        if (p.secret?.id === 'turncoat') return { option: 'nonna' };
        if (p.style === 'snake' || p.style === 'greedy') return { option: 'prout' };
        return { option: c.rng.chance(0.5) ? 'prout' : 'keep' };
      },
      resolve(c, { choices }) {
        let toProut = 0;
        for (const [pid, ch] of Object.entries(choices)) {
          if (ch.option === 'keep') continue;
          const p = c.p(pid);
          const card = p.cards.find((x) => x.id === 'ledger-page' && x.about && c.familyOf(x.about) === 'b');
          if (!card) continue;
          c.g.takeCard(pid, card.uid);
          c.g.discardCard(card);
          if (ch.option === 'prout') { toProut += 1; c.give(pid, 10000, 'Prout’s man'); c.fact(pid, 'page-prout', `Did ${c.name(pid)} give Prout a page?`, true); }
          else { c.give(pid, 15000, 'Nonna'); c.caseFile(-1, 'a page of the ledger, home again', true); c.fact(pid, 'page-nonna', `Did ${c.name(pid)} sell a page to Nonna?`, true); }
        }
        if (toProut) c.caseFile(toProut, `${toProut === 1 ? 'a page' : `${toProut} pages`} of the ledger, delivered to Prout`, true);
        c.line('By two in the morning every page is somewhere. Nobody says where.');
      },
    },

    'the-pages': {
      engine: 'draft', time: '11:30 P.M.', place: 'The back room at Castellano Pawn & Loan', title: 'Sal’s Handwriting', kicker: 'TAKE ONE, PASS THE BOX',
      text: () => [
        'The pages go on Benny’s workbench under the magnifying lamp. Every one of them has somebody’s name on it — from both sides of the river.',
        'Take one each. A page with a name on it is worth money on Monday, and it’s dirt on whoever it names. A page with nothing on it but Sal’s handwriting and a date can go straight to the Courier.',
      ],
      items(c) {
        const n = Math.max(1, c.free.length + (c.memo.gotPages === 'all' ? 1 : 0) + (c.memo.extraPages ?? 0));
        const names = c.rng.shuffle(c.players.map((p) => p.id));
        const out = [];
        for (let i = 0; i < n; i++) {
          if (i % 3 === 2) out.push({ id: `leak-${i}`, kind: 'leak', label: 'A page with a date and a dollar amount', blurb: 'Mail it to the Courier. The Case File grows, and the Courier pays $10k for it.', value: 20000 });
          else {
            const about = names[i % names.length];
            out.push({ id: `page-${i}`, kind: 'page', about, label: `A page — ${c.name(about)} is on it`, blurb: c.familyOf(about) === 'c' ? 'One of ours. Better with us than with anybody else.' : 'One of theirs. Dirt, and money on Monday.', value: 30000 });
          }
        }
        return c.rng.shuffle(out);
      },
      bot(c, p, open) {
        const mine = open.find((it) => it.about === p.id);
        if (mine) return mine.id;
        const theirs = open.find((it) => it.kind === 'page' && c.familyOf(it.about) === 'b');
        return theirs?.id ?? null;
      },
      resolve(c, { picks }) {
        const items = c.beat.data.items;
        for (const [pid, id] of Object.entries(picks)) {
          const it = items.find((x) => x.id === id);
          if (it.kind === 'leak') {
            c.memo.leaked = true;
            c.give(pid, 10000, 'the Courier');
            c.caseFile(1, 'a page of the ledger went to the Courier');
            c.line(`${c.name(pid)} put a page in an envelope addressed to the Harbor Courier.`);
          } else if (it.about === pid) {
            c.line(`${c.name(pid)} took the page with their own name on it, and it went in the stove.`);
          } else {
            const card = c.card(pid, 'ledger-page');
            if (card) { card.about = it.about; card.line = `${c.name(it.about)} — page ${c.rng.int(3, 310)}, from Benny’s shoebox`; }
            c.line(`${c.name(pid)} took the page with ${c.name(it.about)}’s name on it.`);
            if (c.familyOf(it.about) === 'b') c.note(it.about, 'A page of Sal’s ledger with your name on it has ended up across the river.', 'Benny’s shoebox');
          }
        }
        const left = items.filter((it) => !it.taken && it.kind === 'page');
        if (left.length) c.line(`Benny kept ${left.length === 1 ? 'one page' : `${left.length} pages`} back. He says he lost ${left.length === 1 ? 'it' : 'them'}.`);
      },
    },
    call: proutCall({ time: '1:00 A.M.', title: 'The Payphone Again' }),
    envelope: counting({ time: '1:40 A.M.' }),
  },
};

// ------------------------------------------------------------------------

const ferry = {
  id: 'c-bridge', title: 'The Ferry', act: 3, day: nightDay, kicker: kick,
  beats: ['customs', 'seven-crates', 'the-split', { if: (c) => c.memo.river, then: 'the-dive', else: 'the-tail' }, { maybe: 'street', chance: 0.2 }, 'coast-guard', 'envelope'],
  close(c) {
    c.remember(
      c.memo.river ? `The Coast Guard reports recovering seven wooden crates from the harbor, empty${c.memo.dived ? '. Witnesses on Pier 14 describe “people swimming, in October, in their clothes.”' : ', and one gym bag, not empty. An investigation is under way.'}`
        : 'The 3:15 Staten Island freight ferry arrived twenty minutes late on Saturday morning. The crew blamed fog. There was no fog.',
      { courier: c.memo.river ? 'SEVEN CRATES, ONE GYM BAG' : 'FERRY LATE; “FOG” BLAMED' },
    );
  },
  defs: {
    customs: {
      engine: 'vote', time: '1:30 A.M.', place: 'The customs hut, Pier 14', title: 'The Customs Man', kicker: 'A VOTE',
      text: (c) => [
        `The customs man on Pier 14 at night is Eugene, who has been doing this for twenty-six years and has a laminated card with every ship’s manifest on it. ${c.rng.pick(['He is eating soup from a thermos.', 'He is doing a crossword in ink.', 'He is listening to the Rangers lose on a transistor radio.'])} The paperwork says the crates are tinned tomatoes.`,
        'What do you do about Eugene?',
      ],
      options: (c) => [
        { id: 'pay', label: 'Pay him', blurb: `${money(c.scale(20000))} out of the Envelope. Eugene signs anything.`, risk: 0.1, reward: 0.5, details: [`The Envelope has ${money(c.s.envelope?.total ?? 0)}.`] },
        { id: 'tomatoes', label: 'Show him the tomatoes', blurb: 'The top layer is really tomatoes. If he opens a crate, it’s tomatoes. If he opens two…', risk: 0.5, reward: 0.4 },
        { id: 'rangers', label: 'Talk to him about the Rangers', blurb: 'Keep him talking until the forklift’s done. He loves the Rangers. He hates the Rangers. Both at once.', risk: 0.4, reward: 0.3 },
      ],
      resolve(c, { choice }) {
        if (choice === 'pay') {
          const want = c.scale(20000);
          if ((c.s.envelope?.total ?? 0) >= want) { envelopeTake(c, want); c.memo.customsMod = -2; c.line(`${money(want)} out of the Envelope into Eugene’s thermos bag. He signs seven forms without reading them.`); }
          else { c.memo.customsMod = 1; c.line('The Envelope doesn’t have it. Eugene looks at what you do have, and puts his soup down, and starts reading very slowly.'); }
        } else if (choice === 'tomatoes') {
          if (c.rng.chance(0.55)) { c.memo.customsMod = -1; c.line('Eugene opens one crate. Tomatoes. He opens a tin, for some reason. Tomatoes. He signs.'); }
          else { c.memo.customsMod = 2; c.line('Eugene opens one crate: tomatoes. Then he opens a second one, from the bottom, and looks at you over his glasses for a very long time.'); }
        } else if (c.rng.chance(0.6)) { c.memo.customsMod = -1; c.line('Forty minutes on the Rangers’ defence. The forklift is done by the time Eugene gets to the goalie.'); }
        else { c.memo.customsMod = 1; c.line('Eugene’s Rangers opinions are, it turns out, violent. He wants to argue, and to argue he wants to stand where he can see the crates.'); }
      },
    },

    'the-tail': {
      engine: 'vote', time: '4:30 A.M.', place: 'The truck, heading for the Belt Parkway', title: 'The Tail', kicker: 'A VOTE',
      when: (c) => !c.memo.river,
      text: (c) => [
        `Headlights behind the truck since the pier: a brown Buick, keeping exactly two cars back. ${c.rng.pick(['It has Benedetto plates. Everybody knows the plate.', 'Somebody thinks it’s Ray Mancuso’s cousin’s car.', 'It has been behind you through three lights and a U-turn.'])} It is not trying very hard not to be seen.`,
        'What do you do about the Buick?',
      ],
      options: (c) => [
        { id: 'lose', label: 'Lose it', blurb: 'Through the Sunset Park back streets. The Belt Parkway is a harder run after.', risk: 0.4, reward: 0.4 },
        { id: 'stop', label: 'Stop and ask what it wants', blurb: 'Everybody out of the truck, under the streetlight. It’s either a Benedetto or a cop. Either way you find out.', risk: 0.6, reward: 0.5 },
        { id: 'prout', label: 'Lead it past the 9th Precinct', blurb: 'Slowly. Let whoever it is explain themselves to the night desk.', risk: 0.3, reward: 0.5 },
      ],
      resolve(c, { choice }) {
        if (choice === 'lose') { c.memo.tailMod = 1; c.line('Twenty minutes of Sunset Park back streets. The Buick is gone. So is the easy way onto the Parkway.'); }
        else if (choice === 'stop') {
          if (c.rng.chance(0.5)) {
            const bs = c.family('b').filter((p) => !c.isAway(p.id));
            const t = bs.length ? c.rng.pick(bs) : null;
            if (t) { const n = c.charge(t.id, 10000); envelopeAdd(c, n); c.note(t.id, `Your cousin’s Buick was following a Castellano truck last night, and the Castellanos noticed. It cost the family ${money(n)} — from your pocket.`, 'the Buick'); }
            c.line(`It’s a Benedetto cousin in the Buick, who was only curious. The curiosity costs ${t ? t.name : 'somebody across the river'} $10k, which goes in the Envelope.`);
          } else { for (const p of c.free) c.heat(p.id, 1, 'stopping for an unmarked car'); c.line('It’s an unmarked car. The man in it shows everybody a badge and writes down everybody’s name, slowly, under the streetlight.'); }
        } else { c.memo.tailMod = -1; c.caseFile(1, 'a Benedetto cousin’s Buick, stopped outside the 9th Precinct', true); c.line('You drive past the 9th Precinct at twenty miles an hour. The Buick has to follow. Two uniforms come out to ask the Buick what it’s doing. The truck keeps going.'); }
      },
    },

    'seven-crates': {
      engine: 'plan', time: '2:00 A.M.', place: 'Pier 14, the freight ferry', title: 'Seven Crates', kicker: 'EVERYBODY PULLS THEIR WEIGHT',
      text: (c) => [
        `Seven crates are coming off the 3:15 freight ferry, and they are not full of what the paperwork says. ${vinnie(c)} He wants all seven on a truck by four.`,
        'Help (a forklift, a customs man, a boat: $10k), coast, or quietly make it go wrong. Nobody sees who did what.',
      ],
      target: (c) => c.free.length + 5 + (c.memo.customsMod ?? 0),
      cost: () => 10000,
      labels: () => ({ help: 'Rent the forklift, pay the customs man', coast: 'Stand on the pier and look busy', sabotage: 'Drop a crate in the harbor' }),
      resolve(c, r) {
        const full = round5k(c.scale(200000) * (0.85 + c.rng() * 0.3));
        c.memo.pot = r.success ? full : round5k(full * 0.4);
        c.line(r.success ? `All seven crates on the truck by ten to four. Inside: ${money(c.memo.pot)}, in fifties, under a layer of tinned tomatoes.` : `Three crates went in the harbor. The other four came to ${money(c.memo.pot)}, and everybody on the pier was seen.`);
        if (!r.success) for (const p of c.free) c.heat(p.id, 1, 'Pier 14');
      },
    },
    'the-split': {
      engine: 'choose', time: '4:20 A.M.', place: 'The back of the truck', title: 'Tinned Tomatoes', kicker: 'EVERYBODY SAYS A NUMBER',
      text: (c) => [
        `${money(c.memo.pot ?? 0)} on the floor of the truck between the tins. Vinnie’s rule is the same as Nonna’s, because they learned it from the same man: everybody writes down how much they’re taking.`,
        'If it adds up to the pot or less, everybody gets what they wrote and the rest goes in the Envelope. If it adds up to more, the lot goes in the harbor.',
      ],
      who: (c) => c.free.map((p) => p.id),
      amount: (c) => ({ min: 0, max: c.memo.pot ?? 0, step: 5000, label: 'You take', blurb: `${money(c.memo.pot ?? 0)} on the floor. ${c.free.length} of you. An even split is about ${money(round5k((c.memo.pot ?? 0) / Math.max(1, c.free.length)))}.` }),
      reveal: 'public',
      bot(c, p) {
        const pot = c.memo.pot ?? 0;
        const even = pot / Math.max(1, c.free.length);
        const mult = { loyal: 0.8, nervous: 0.7, wild: 1.25, greedy: 1.15, snake: 1.35 }[p.style] ?? 1;
        return { option: 'amount', amount: Math.min(pot, round5k(even * mult * (0.9 + c.rng() * 0.2))) };
      },
      resolve(c, { choices }) {
        const pot = c.memo.pot ?? 0;
        const sum = Object.values(choices).reduce((a, ch) => a + (ch.amount ?? 0), 0);
        if (sum > pot) {
          c.memo.river = true;
          c.line(`The numbers came to ${money(sum)}. The pot was ${money(pot)}. Vinnie opened the back of the truck and threw the lot in the harbor himself.`);
          return;
        }
        for (const [pid, ch] of Object.entries(choices)) if (ch.amount) c.give(pid, ch.amount, 'the ferry');
        const rest = pot - sum;
        if (rest > 0) envelopeAdd(c, rest);
        c.line(`The numbers came to ${money(sum)} of ${money(pot)}. Everybody takes what they wrote.${rest > 0 ? ` The other ${money(rest)} goes in the Envelope.` : ''}`);
      },
    },
    'the-dive': {
      engine: 'choose', time: '4:25 A.M.', place: 'The end of Pier 14', title: 'One Gym Bag', kicker: 'YOUR CALL',
      text: (c) => [
        'Seven crates go into the harbor, and six of them sink. The seventh splits open on the way down, and a gym bag bobs up out of it and turns slowly in the black water, twenty feet off the end of the pier.',
        'It is October. The Coast Guard cutter is coming round the point with its light on. Whoever goes in splits whatever is in the bag with whoever else went in. Nobody knows who else is going until they hear the splash.',
      ],
      who: (c) => c.free.map((p) => p.id),
      options: () => [
        { id: 'dive', label: 'Go in after it', blurb: 'In your clothes. The light might find you in the water.', brave: true },
        { id: 'stay', label: 'Stay on the pier', blurb: 'Dry, and nothing.', honest: true },
      ],
      reveal: 'public',
      fallback: () => ({ option: 'stay' }),
      bot: (c, p) => ({ option: c.rng.chance({ wild: 0.65, greedy: 0.55, snake: 0.4 }[p.style] ?? 0.2) ? 'dive' : 'stay' }),
      resolve(c, { choices }) {
        const divers = Object.keys(choices).filter((id) => choices[id].option === 'dive');
        if (!divers.length) { c.line('Everybody watches the gym bag drift out past the lighthouse. Vinnie watches everybody watch it.'); return; }
        c.memo.dived = true;
        const bag = round5k(c.scale(40000) * (0.8 + c.rng() * 0.4));
        const each = round5k(bag / divers.length);
        for (const id of divers) {
          c.give(id, each, 'the harbor');
          if (c.rng.chance(0.35)) c.heat(id, 1, 'the Coast Guard light found you in the water');
        }
        c.line(`${c.list(divers.map((id) => c.name(id)))} ${divers.length === 1 ? 'goes' : 'go'} in. The bag comes out with ${money(bag)} in it, soaked: ${money(each)} ${divers.length === 1 ? 'for the swimmer' : 'each'}, drying on the dashboard all the way home.`);
      },
    },

    'coast-guard': {
      engine: 'roll', time: '4:40 A.M.', place: 'The Belt Parkway', title: 'The Coast Guard', kicker: 'GET AWAY',
      getaway: true,
      text: (c) => [`A Coast Guard cutter is coming round the end of the pier with its light on. ${c.freeByJob('driver')?.name ?? 'Somebody'} has the truck in gear.`],
      target: (c) => (c.memo.river ? 6 : 7) + (c.memo.tailMod ?? 0),
      roller: (c) => c.freeByJob('driver')?.id ?? null,
      label: 'Onto the Belt Parkway',
      stakes: 'Miss it and everybody in the truck takes one heat.',
      resolve(c, r) {
        if (r.success) { c.line('Onto the Belt Parkway with the lights off and the tomatoes rattling. Gone.'); return; }
        c.line('The cutter’s light caught the truck just as it pulled out. Somebody on the boat has very good eyes.');
        for (const p of c.free) c.heat(p.id, 1, 'the Coast Guard');
      },
    },
    envelope: counting({ time: '5:30 A.M.' }),
  },
};

export default [collection, cardRoom, pages, ferry];
