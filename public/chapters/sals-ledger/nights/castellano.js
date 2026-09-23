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
  beats: ['orders', 'rounds', { maybe: 'street', chance: 0.3 }, 'call', 'envelope'],
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
    rounds: {
      engine: 'grab', time: '11:30 P.M.', place: (c) => ROUTES[c.flag('cRoute') ?? 'front-street'].label, title: 'The Rounds', kicker: 'HOW GREEDY ARE YOU?',
      text: (c) => {
        const d = c.freeByJob('driver');
        return [
          `Door to door, with a notebook. ${c.rng.pick(['Most of them have it ready in an envelope.', 'The butcher pays in cash and a pound of veal, which nobody knows what to do with.', 'Somebody’s grandmother answers every door and pays for all of them.'])} Somebody on the street has already called somebody.`,
          `Every round, grab or go: another block, another envelope, and the chance that the next shopkeeper is on the phone to Ray Mancuso. ${d ? `${d.name} is idling at the end of the block.` : 'Nobody is watching the car.'}`,
        ];
      },
      vault: (c) => round5k(c.scale(ROUTES[c.flag('cRoute') ?? 'front-street'].vault) * (0.85 + c.rng() * 0.3)),
      alarm: (c) => ROUTES[c.flag('cRoute') ?? 'front-street'].alarm,
      resolve(c, r) {
        const total = Object.values(r.hauls).reduce((a, b) => a + b, 0);
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
    'the-game',
    { maybe: 'street', chance: 0.25 },
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
    'the-house': {
      engine: 'report', time: '3:30 A.M.', place: 'The office behind the card room', title: 'The House Take', kicker: 'SOMEBODY COUNTS IT',
      text: (c) => [
        `The house take goes into a biscuit tin and the biscuit tin goes into the office, where there is room for exactly one person and a calculator. ${c.memo.raided ? 'After the business at table four, half the tables emptied early.' : 'It was a good night.'}`,
        `${c.freeByJob('numbers')?.name ?? 'Whoever counts'} counts. Whatever they say it comes to is split evenly. Whatever they don’t say, they keep.`,
      ],
      amount: (c) => round5k(c.scale(90000) * (c.memo.raided ? 0.55 : 1) * (0.85 + c.rng() * 0.3)),
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

const pages = {
  id: 'c-pages', title: 'The Pages', day: nightDay, kicker: kick,
  beats: ['the-fence', { if: (c) => c.memo.gotPages, then: 'the-pages' }, 'call', 'envelope'],
  close(c) {
    c.remember(
      c.memo.leaked ? 'Page six of this morning’s Courier carries a photograph of a handwritten page from what a source calls “a very interesting book.” Several names are visible. Several families have stopped reading page six.'
        : 'Castellano Pawn & Loan was closed all day Thursday “for inventory.”',
      { courier: c.memo.leaked ? 'A PAGE FROM “A VERY INTERESTING BOOK”' : 'PAWN SHOP CLOSED FOR INVENTORY' },
    );
  },
  defs: {
    'the-fence': {
      engine: 'vote', time: '10:00 P.M.', place: 'The back room at Castellano Pawn & Loan', title: 'Benny’s Back Room', kicker: 'A VOTE',
      text: (c) => [
        `Benny Castellano is eighty, Vinnie’s cousin, and deaf in whichever ear is convenient. Somebody sold him a shoebox last week, and at the bottom of the shoebox are loose pages in Sal Benedetto’s handwriting. ${c.rng.pick(['Benny wants to be paid. Benny always wants to be paid.', 'Benny says he hasn’t read them. Benny has read them.'])}`,
        'How do they come home?',
      ],
      options: (c) => [
        { id: 'buy', label: 'Pay Benny', blurb: `${money(c.scale(40000))} out of the Envelope. All of it, no questions.`, risk: 0.1, reward: 0.5, details: [`The Envelope has ${money(c.s.envelope?.total ?? 0)}.`] },
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
          const want = c.scale(40000);
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
        const r = c.rng.int(1, 6) + c.rng.int(1, 6) + (c.freeByJob('muscle') ? 1 : 0);
        c.memo.gotPages = r >= 7 ? 'all' : 'half';
        c.line(r >= 7 ? `Benny sighed, called you all ungrateful, and handed the shoebox over. (${r} on the dice.)` : `Benny held on to half the shoebox with both hands and a surprising grip. (${r} on the dice.) He’s calling Vinnie.`);
      },
    },
    'the-pages': {
      engine: 'draft', time: '11:30 P.M.', place: 'The back room at Castellano Pawn & Loan', title: 'Sal’s Handwriting', kicker: 'TAKE ONE, PASS THE BOX',
      text: () => [
        'The pages go on Benny’s workbench under the magnifying lamp. Every one of them has somebody’s name on it — from both sides of the river.',
        'Take one each. A page with a name on it is worth money on Monday, and it’s dirt on whoever it names. A page with nothing on it but Sal’s handwriting and a date can go straight to the Courier.',
      ],
      items(c) {
        const n = c.free.length + (c.memo.gotPages === 'all' ? 1 : 0);
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
  beats: ['seven-crates', 'the-split', { maybe: 'street', chance: 0.25 }, 'coast-guard', 'envelope'],
  close(c) {
    c.remember(
      c.memo.river ? 'The Coast Guard reports recovering seven wooden crates from the harbor, empty, and one gym bag, not empty. An investigation is under way.'
        : 'The 3:15 Staten Island freight ferry arrived twenty minutes late on Saturday morning. The crew blamed fog. There was no fog.',
      { courier: c.memo.river ? 'SEVEN CRATES, ONE GYM BAG' : 'FERRY LATE; “FOG” BLAMED' },
    );
  },
  defs: {
    'seven-crates': {
      engine: 'plan', time: '2:00 A.M.', place: 'Pier 14, the freight ferry', title: 'Seven Crates', kicker: 'EVERYBODY PULLS THEIR WEIGHT',
      text: (c) => [
        `Seven crates are coming off the 3:15 freight ferry, and they are not full of what the paperwork says. ${vinnie(c)} He wants all seven on a truck by four.`,
        'Help (a forklift, a customs man, a boat: $10k), coast, or quietly make it go wrong. Nobody sees who did what.',
      ],
      target: (c) => c.free.length + 5,
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
    'coast-guard': {
      engine: 'roll', time: '4:40 A.M.', place: 'The Belt Parkway', title: 'The Coast Guard', kicker: 'GET AWAY',
      getaway: true,
      text: (c) => [`A Coast Guard cutter is coming round the end of the pier with its light on. ${c.freeByJob('driver')?.name ?? 'Somebody'} has the truck in gear.`],
      target: (c) => (c.memo.river ? 6 : 7),
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
