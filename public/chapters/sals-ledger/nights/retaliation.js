// The Retaliation: you robbed the Castellanos. The Castellanos noticed.

import { counting, money, round5k, nightDay, nightKicker } from '../common.js';

export default {
  id: 'retaliation', title: 'The Retaliation', day: nightDay, kicker: nightKicker,
  beats: [
    'brick',
    'what-now',
    { if: (c) => c.memo.answer === 'hit', then: ['card-room', 'car'] },
    { if: (c) => c.memo.answer === 'pay', then: 'tribute' },
    { if: (c) => c.memo.answer === 'nonna', then: 'nonna-calls' },
    { if: (c) => c.flag('war') && c.memo.answer !== 'pay' && c.free.length >= 2, then: 'who-they-take' },
    'count',
  ],
  close(c) {
    c.remember(
      c.memo.answer === 'hit'
        ? `A card room above a laundromat on Front Street, believed to be connected to the Castellano family, was robbed overnight. ${c.memo.take ? `Witnesses described “a lot of money” and “a lot of shouting.”` : 'Nothing was taken, witnesses said, “but not for want of trying.”'}`
        : c.memo.answer === 'pay'
          ? 'Relations between two old neighbourhood families were described by a spokesman as “warm, now.”'
          : `A brick was thrown through the kitchen window of a Mulberry Avenue home overnight. The homeowner, 94, told the Courier she “knew exactly who” and “would handle it.”`,
      { courier: c.memo.answer === 'hit' ? 'FRONT ST. CARD ROOM HIT' : 'BRICK THROUGH NONNA’S WINDOW' },
    );
  },
  defs: {
    brick: {
      engine: 'story', time: '9:05 P.M.', place: 'Nonna’s kitchen', title: 'The Brick', kicker: 'THE CASTELLANOS',
      text: (c) => [
        c.rng.pick([
          'A brick comes through Nonna’s kitchen window at five past nine, bounces off the table, and knocks over the espresso pot. There is a note rubber-banded to it.',
          'Nonna is at the sink when the brick comes through the window. She doesn’t flinch. She turns off the tap, dries her hands, and picks it up.',
        ]),
        `The note says: ${c.rng.pick(['“WE KNOW.”', '“FRONT STREET SAYS HELLO.”', '“YOU OWE US A BANK.”'])} ${c.rng.pick(['It is signed with a little drawing of a fish.', 'It is written on a Castellano Credit Union deposit slip.', 'It is in very neat handwriting, which is worse.'])}`,
      ],
      run(c) {
        if (c.rng.chance(0.5)) {
          const who = c.rng.pick(c.free.length ? c.free : c.players);
          const n = c.charge(who.id, round5k(Math.min(who.cash, c.scale(15000))));
          if (n) c.line(`And ${who.name}’s car, parked outside, has had its windows smashed and the glovebox emptied. ${money(n)} was in the glovebox.`);
        } else {
          c.line('Nobody is hurt. The espresso pot is dented. Nonna says she will be sending the Castellanos the bill for the espresso pot.');
        }
      },
    },

    'what-now': {
      engine: 'vote', time: '9:20 P.M.', place: 'Nonna’s kitchen', title: 'What Now', kicker: 'A VOTE',
      text: () => [
        'Nonna puts the brick in the middle of the table next to the Bag, so nobody can pretend it isn’t there.',
        '“So,” she says. “What now?”',
      ],
      options: (c) => [
        { id: 'hit', label: 'Hit them back', blurb: 'The Castellanos run a card room above a laundromat on Front Street. Tonight it’s full.', risk: 0.8, reward: 0.9, details: ['A heist, then a getaway.', 'The war goes on.'] },
        { id: 'pay', label: 'Pay them', blurb: `${money(c.scale(40000))} out of the Bag, delivered by hand, with an apology. It ends here.`, risk: 0.1, reward: 0.2, details: ['The war ends.'] },
        { id: 'nonna', label: 'Let Nonna handle it', blurb: 'Nonna makes one phone call. Nobody knows who to.', risk: 0.5, reward: 0.5, details: [`A roll. ${c.byJob('cousin') ? `${c.byJob('cousin').name} dials for her: a little easier.` : 'Somebody has to dial for her.'}`] },
      ],
      angles(c) {
        const out = {};
        const ps = c.rng.shuffle(c.free.map((p) => p.id));
        if (ps[0]) out[ps[0]] = { option: 'hit', text: 'Hit them back. The man who runs that card room is the one who broke your nose in 2009. If you go, you get to see his face.' };
        if (ps[1]) {
          out[ps[1]] = { option: 'pay', text: `Pay them. You’d be the one to carry the money over, and Vinnie always tips the messenger: ${money(10000)}, just for you.` };
          c.memo.messenger = ps[1];
        }
        for (const id of ps.slice(2)) out[id] = { option: null, text: 'No angle. Just a brick, and a very quiet Nonna.' };
        return out;
      },
      resolve(c, { choice }) {
        c.memo.answer = choice;
        c.line({
          hit: 'Nonna nods once and goes to get her coat. Then she remembers she’s ninety-four and sends you instead.',
          pay: 'Nonna counts out the money herself. She counts it slowly, so everybody can see what it costs.',
          nonna: 'Nonna picks up the phone, dials a number from memory, and says, “It’s me.” Then she waits.',
        }[choice]);
      },
    },

    'card-room': {
      engine: 'grab', time: '11:30 P.M.', place: 'Above the Sunshine Laundromat, Front Street', title: 'The Card Room', kicker: 'HOW GREEDY ARE YOU?',
      text(c) {
        const d = c.freeByJob('driver');
        return [
          `Up the back stairs past the dryers. The card room is full: ${c.rng.pick(['a dozen men in undershirts, a pot on every table, and a television showing the Knicks', 'six tables of poker and one of pinochle, which is the dangerous one'])}. The cash box is by the door, which is where you come in.`,
          `Every round, grab or go. The Castellanos are upstairs, the dealers are armed, and the alarm is a very large man called Jumbo. ${d ? `${d.name} is idling in the alley.` : 'Nobody is watching the car.'}`,
        ];
      },
      vault: (c) => round5k(c.scale(120000) * (0.85 + c.rng() * 0.3)),
      alarm: () => 1,
      resolve(c, r) {
        const total = Object.values(r.hauls).reduce((a, b) => a + b, 0);
        c.memo.take = total;
        c.memo.tripped = r.tripped;
        c.line(total ? `${money(total)} out of the Castellanos’ own card room. They will be talking about it for years.` : 'Nobody got anything but a look at Jumbo, which is worse than nothing.');
        if (r.tripped) c.caseFile(1, 'a shooting on Front Street, with no shots fired, which Prout still counts');
      },
    },

    car: {
      engine: 'roll', time: '11:44 P.M.', place: 'The alley behind the laundromat', title: 'The Alley', kicker: 'GET AWAY',
      text: (c) => [`${c.memo.tripped ? 'Jumbo is at the top of the stairs, shouting.' : 'Nobody has noticed yet.'} ${c.freeByJob('driver')?.name ?? 'Somebody'} has the engine going and the alley is one car wide.`],
      target: (c) => 7 + (c.memo.tripped ? 1 : 0),
      roller: (c) => c.freeByJob('driver')?.id ?? null,
      label: 'Down the alley',
      stakes: 'Miss it and the Castellanos get a plate number, and everybody takes one heat.',
      resolve(c, r) {
        if (r.success) { c.line('Down the alley, across Front Street against the light, and gone.'); return; }
        c.line('Down the alley and straight into a garbage truck. Everybody got out and ran. The Castellanos have the car.');
        for (const p of c.free) c.heat(p.id, 1, 'the alley');
      },
    },

    tribute: {
      engine: 'story', time: '10:30 P.M.', place: 'The back room at Dolores’s', title: 'The Apology', kicker: 'THE CASTELLANOS',
      run(c) {
        const n = c.bagTake(c.scale(40000));
        c.set('war', false);
        c.set('truce', 'accept');
        const m = c.memo.messenger;
        if (m && !c.isAway(m)) { c.give(m, 10000, 'Vinnie’s tip'); c.note(m, 'Vinnie tipped you $10k for carrying it over. Nobody else knows.', 'Vinnie Castellano'); }
        c.line(`${money(n)} out of the Bag, in a cake box, across the table at Dolores’s. Vinnie opened it, closed it, and shook hands. It’s over. Probably.`);
      },
      text: () => ['Vinnie Castellano is waiting in the back booth at Dolores’s, with a cup of coffee he hasn’t touched. The money goes over in a cake box from the Italian bakery on Fifth, because Nonna insisted it be done properly.'],
    },

    'nonna-calls': {
      engine: 'roll', time: '10:00 P.M.', place: 'Nonna’s kitchen', title: 'Nonna Makes a Call', kicker: 'THE DICE',
      text: () => ['Nonna is on the phone for eleven minutes and says maybe twenty words. Most of them are names. One of them, everybody is fairly sure, is a threat. Then she hangs up and looks at the phone.'],
      target: (c) => (c.byJob('cousin') ? 6 : 7),
      label: 'Nonna waits for the phone to ring back',
      stakes: 'Make it and the war is over, for free. Miss it and the Castellanos come tonight anyway.',
      resolve(c, r) {
        if (r.success) {
          c.set('war', false);
          c.set('truce', 'nonna');
          c.line('The phone rings back. Nonna listens, says “good,” and hangs up. The war is over. Nobody will ever know what she said, and nobody is brave enough to ask.');
          return;
        }
        c.line('The phone doesn’t ring back. Nonna puts her coat on, takes it off again, and tells everybody to sleep in their clothes.');
      },
    },

    'who-they-take': {
      engine: 'choose', time: '2:00 A.M.', place: 'Mulberry Avenue, very late', title: 'Who They Take', kicker: 'WARN ONE PERSON',
      text: () => [
        'At two in the morning a car with its lights off turns into Mulberry Avenue and parks. The Castellanos are taking one of you for a drive tonight. Ray Mancuso tipped off Nonna, and Nonna tipped off everybody: there is time to warn one person, and only one.',
        'Everybody warns somebody. Whoever is warned by the fewest people gets taken. Everybody finds out who warned whom.',
      ],
      who: (c) => c.free.map((p) => p.id),
      options: (c, pid) => [{ id: 'warn', label: 'Warn…', target: 'other', targets: c.free.map((p) => p.id).filter((id) => id !== pid) }],
      reveal: 'public',
      bot(c, p) {
        const pool = c.free.filter((q) => q.id !== p.id);
        const pref = pool.find((q) => q.id === p.secret?.partner) ?? pool.find((q) => ['soft-spot', 'big-brother'].includes(p.secret?.id) && q.id === p.secret?.target);
        const enemies = new Set(Object.entries(p.grudges).filter(([, n]) => n > 0).map(([id]) => id));
        const ok = pool.filter((q) => !enemies.has(q.id));
        return { option: 'warn', target: (pref ?? c.rng.pick(ok.length ? ok : pool))?.id };
      },
      resolve(c, { choices }) {
        const ids = c.free.map((p) => p.id);
        if (ids.length < 2) return;
        const warned = Object.fromEntries(ids.map((id) => [id, 0]));
        for (const [pid, ch] of Object.entries(choices)) {
          if (warned[ch.target] != null) warned[ch.target] += 1;
          c.g.bond(pid, ch.target, 'warned');
          c.p(pid).stats.warned.push(ch.target);
        }
        const min = Math.min(...Object.values(warned));
        const low = ids.filter((id) => warned[id] === min);
        const taken = c.rng.pick(low);
        if (low.length > 1) c.line(`${c.list(low.map((id) => c.name(id)))} were warned by the fewest. The Castellanos flipped a coin: ${c.name(taken)}.`);
        const n = c.charge(taken, round5k(c.p(taken).cash / 2));
        const card = c.p(taken).cards.length ? c.rng.pick(c.p(taken).cards) : null;
        if (card) { c.g.takeCard(taken, card.uid); c.g.discardCard(card); }
        c.line(`${c.name(taken)} was taken for a drive to the Jersey marshes and back. They came home at dawn without their shoes, ${n ? `without ${money(n)}` : 'without anything worth taking'}${card ? ', and without one of their cards' : ''}. They know exactly who didn’t warn them.`);
        c.remember(`${c.name(taken)} was taken for a drive by the Castellanos.`, { who: taken, kind: 'taken' });
      },
    },

    count: counting({ time: '3:10 A.M.' }),
  },
};
