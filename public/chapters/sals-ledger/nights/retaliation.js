// The Retaliation: you robbed the Castellanos. The Castellanos noticed.

import { counting, money, round5k, nightDay, nightKicker, tablePays, howPaid } from '../common.js';
import { crew, cut, grabbers, onPost } from '../heist.js';

export default {
  id: 'retaliation', title: 'The Retaliation', day: nightDay, kicker: nightKicker,
  beats: [
    'brick',
    'what-now',
    { if: (c) => c.memo.answer === 'hit', then: ['laundromat', 'card-room', 'jumbo', 'car', 'cut'] },
    { if: (c) => c.memo.answer === 'pay', then: ['sitdown', 'cake-box', 'eleven-steps', 'tribute', { if: (c) => !c.flag('war'), then: 'favour' }] },
    { if: (c) => c.memo.answer === 'nonna', then: ['green-pontiac', 'the-list', 'nonna-calls', { if: (c) => c.flag('truce') === 'nonna', then: 'nonnas-promise' }, { if: (c) => c.flag('war'), then: 'waiting' }] },
    { if: (c) => c.flag('war') && c.free.length >= 2, then: 'who-they-take' },
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
        { id: 'pay', label: 'Pay them', blurb: `${money(c.scale(40000))} out of the Bag — or your pockets, if the Bag can’t — delivered by hand, with an apology. It ends here.`, risk: 0.1, reward: 0.2, details: ['The war ends, if the money’s right.'] },
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
          pay: c.bag.total >= c.scale(40000)
            ? 'Nonna counts out the money herself. She counts it slowly, so everybody can see what it costs.'
            : `Nonna opens the Bag and counts what’s there: ${money(c.bag.total)}. She looks round the table. The rest will have to come out of pockets.`,
          nonna: 'Nonna goes to the phone on the wall and stops with her hand on it. “First,” she says, “I want to know whose hand it was.”',
        }[choice]);
      },
    },

    laundromat: crew({
      time: '11:10 P.M.', place: 'Front Street, outside the Sunshine Laundromat',
      text: () => [
        'The Sunshine Laundromat is open all night and nobody ever does any laundry in it. The card room is up the back stairs. Before anybody goes up, everybody picks where they’ll be.',
        'Upstairs is the cash box. Outside is the alley, and the dryers downstairs, and whatever the people upstairs decide to share.',
      ],
      talkerInside: false,
      posts: () => [
        { id: 'inside', label: 'Up the back stairs', blurb: 'The cash box by the door. Jumbo by the other door.', where: 'upstairs' },
        { id: 'alley', label: 'At the end of the alley', blurb: 'Keep the alley clear. The getaway is one easier.', max: 1, where: 'in the alley' },
        { id: 'dryers', label: 'Downstairs, feeding the dryers', blurb: 'Every dryer on high with nothing in it. Nobody upstairs hears the stairs. The alarm starts one sleepier.', max: 1, where: 'at the dryers' },
      ],
    }),

    jumbo: {
      engine: 'vote', time: '11:40 P.M.', place: 'The top of the back stairs', title: (c) => (c.memo.tripped ? 'Jumbo' : 'The Pinochle Table'), kicker: 'A VOTE',
      text: (c) => (c.memo.tripped ? [
        'Jumbo is at the top of the stairs, filling the doorway, and he has seen who has the cash box. Behind him, the whole card room is standing up.',
        'What do you do about Jumbo?',
      ] : [
        'On the way back past the pinochle table, one of the old men at it — a Castellano capo called Uncle Joe, who has been at that table since 1968 — puts down his cards and looks straight at one of you. He knows your mother.',
        'What do you do about Uncle Joe?',
      ]),
      options: (c) => (c.memo.tripped ? [
        { id: 'box', label: 'Throw him the cash box', blurb: 'Half of what you took, down the stairs at him. He’ll stop to pick it up.', risk: 0.2, reward: 0.2 },
        { id: 'fight', label: 'Go through him', blurb: 'There are more of you. There is a lot of Jumbo.', risk: 0.8, reward: 0.5 },
        { id: 'window', label: 'Out the window onto the fire escape', blurb: 'Rusty, and three floors up. The alley’s further to run from there.', risk: 0.5, reward: 0.4 },
      ] : [
        { id: 'nod', label: 'Nod to him and keep walking', blurb: 'Respect. He’ll tell Vinnie, but he’ll tell him you were polite.', risk: 0.3, reward: 0.3 },
        { id: 'pay', label: 'Leave something on his table', blurb: `${money(10000)} from whoever he’s looking at. For his discretion.`, risk: 0.1, reward: 0.4 },
        { id: 'deal', label: 'Deal him in', blurb: 'Sit down for one hand of pinochle, calm as anything. The alley gets further away every minute you sit.', risk: 0.5, reward: 0.5 },
      ]),
      resolve(c, { choice }) {
        const up = onPost(c, 'inside');
        const face = c.rng.pick(up.length ? up : c.free);
        if (choice === 'box') {
          let lost = 0;
          for (const p of up) lost += c.charge(p.id, round5k((c.memo.hauls?.[p.id] ?? 0) / 2));
          c.memo.jumboMod = -1;
          c.line(`The cash box goes down the stairs at Jumbo: ${money(lost)} of it. Jumbo stops to pick it up. So does everybody behind him.`);
        } else if (choice === 'fight') {
          if (c.rng.chance(0.45)) c.line('It takes four of you and a card table, and Jumbo goes down like a building. Nobody will forget it, least of all Jumbo.');
          else { c.memo.jumboMod = 1; if (face) c.heat(face.id, 2, 'Jumbo'); c.line(`Jumbo takes ${face?.name ?? 'somebody'} by the collar and holds on for a long, long time. Everybody in the card room gets a good look.`); }
        } else if (choice === 'window') { c.memo.jumboMod = 1; c.line('Out the window and down the fire escape, which comes away from the wall one bolt at a time, all the way down.'); }
        else if (choice === 'nod') { c.line(`${face?.name ?? 'Somebody'} nods to Uncle Joe. Uncle Joe nods back, very slowly, and picks up his cards. Vinnie will hear that you were polite.`); }
        else if (choice === 'pay') { if (face) c.charge(face.id, 10000); c.line(`${face?.name ?? 'Somebody'} leaves an envelope by Uncle Joe’s elbow. He covers it with his hand without looking at it and plays a card.`); }
        else { c.memo.jumboMod = 1; if (c.rng.chance(0.5)) { const n = face ? c.give(face.id, 10000, 'one hand of pinochle') : 0; c.line(`${face?.name ?? 'Somebody'} sits down and wins one hand of pinochle off Uncle Joe, ${money(n)}, very politely, and gets up. The whole table watches them go down the stairs.`); } else c.line(`${face?.name ?? 'Somebody'} sits down, loses one hand of pinochle to Uncle Joe, and gets up. Uncle Joe says, “Tell your mother.”`); }
      },
    },

    cut: cut({ time: '12:05 A.M.', place: (c) => (c.memo.carLost ? 'Under the bridge, on foot, out of breath' : 'A car with the lights off, under the bridge') }),

    sitdown: {
      engine: 'whispers', time: '10:15 P.M.', place: 'The back booth at Dolores’s', title: 'The Sit-Down', kicker: 'ONE OF YOU TALKS',
      whoLabel: 'Vinnie Castellano, sixty-six, in the back booth',
      text: (c) => {
        const t = c.freeByJob('talker')?.name ?? 'Somebody';
        return [
          `Vinnie Castellano is in the back booth at Dolores’s with a cup of coffee he hasn’t touched. Nonna’s price was ${money(c.scale(40000))}. Vinnie hasn’t said what his is.`,
          `${t} sits across from him and has to open. Everybody else knows one thing about Vinnie. How it goes decides how much the Bag pays tonight.`,
        ];
      },
      openings: () => [
        { id: 'father', label: 'Talk about his father',
          yes: 'Vinnie’s father and Sal’s father came over on the same boat. Mention the boat and Vinnie softens like butter.',
          no: 'Vinnie’s father died owing Sal’s father money. Vinnie has never forgiven either of them.' },
        { id: 'daughter', label: 'Ask after Rosemarie',
          yes: 'Vinnie’s eldest is the only person alive who can make him laugh. Ask after her and he tells you a story.',
          no: 'Rosemarie hasn’t spoken to her father since Easter. Mention her and the meeting is over.' },
        { id: 'apology', label: 'Apologise first, properly',
          yes: 'Vinnie respects an apology more than money. He says so, often, usually right before he takes the money.',
          no: 'Vinnie thinks apologies are for people who plan to do it again. He’ll double the price.' },
        { id: 'business', label: 'Talk business: the credit union was a mistake',
          yes: 'Vinnie is a businessman first. Call it a business mistake and he’ll price it like one.',
          no: 'The credit union was Vinnie’s father’s. It isn’t business. It’s personal.' },
      ],
      filler: () => ['Vinnie always sits facing the door.', 'Vinnie takes his coffee black, and never drinks it.', 'Vinnie wears a cardigan over a shirt and tie, every day, in every weather.'],
      resolve(c, { success, opening, talker }) {
        const did = { father: 'talked about Vinnie’s father', daughter: 'asked after Rosemarie', apology: 'apologised first, properly', business: 'called the credit union a business mistake' }[opening] ?? 'said something';
        c.memo.priceMult = success ? 0.6 : 1.3;
        c.line(success
          ? `${c.name(talker)} ${did}. Vinnie listened, and stirred his coffee, and named a number a good deal lower than Nonna’s.`
          : `${c.name(talker)} ${did}. Vinnie put his spoon down very carefully and named a number a good deal higher than Nonna’s.`);
      },
    },

    'cake-box': {
      engine: 'vote', time: '10:25 P.M.', place: 'The counter at Dolores’s', title: 'The Cake Box', kicker: 'WHO CARRIES IT?',
      text: () => ['The money goes across the table in a cake box from the Italian bakery on Fifth, because Nonna insisted. Somebody has to carry it the eleven steps from the counter to Vinnie’s booth, and look him in the eye while he opens it.', 'Everybody picks who. Vinnie always tips the messenger.'],
      candidates: (c) => c.free.map((p) => p.id),
      noSelf: false,
      resolve(c, { choice }) {
        c.memo.carrier = choice;
        c.line(`${c.name(choice)} picks up the cake box. It is heavier than a cake.`);
      },
    },

    'eleven-steps': {
      engine: 'choose', time: '10:28 P.M.', place: 'Dolores’s, between the counter and the back booth', title: 'Eleven Steps', kicker: 'NOBODY SEES',
      who: (c) => [c.memo.carrier].filter((id) => id && !c.isAway(id)),
      enter(c) {
        const want = round5k(c.scale(40000) * (c.memo.priceMult ?? 1));
        const paid = tablePays(c, want);
        if (paid.ok) { c.memo.boxed = paid.paid; c.memo.boxHow = howPaid(paid); return; }
        // there isn't enough: the box holds whatever the Bag has, and it's short
        c.memo.boxed = c.bagTake(want);
        c.memo.boxShort = want - c.memo.boxed;
      },
      text: (c) => [
        `${c.name(c.memo.carrier)} has the cake box: ${money(c.memo.boxed ?? 0)}, tied with bakery string${c.memo.boxShort ? ` — ${money(c.memo.boxShort)} less than Vinnie’s number, because that is all there is` : c.memo.boxHow ? ` (${c.memo.boxHow})` : ''}. It is eleven steps from the counter to Vinnie’s booth, past the ladies’ room door and the payphone, and for about four of them nobody at either table can see the box.`,
        `${c.name(c.memo.carrier)} decides what’s in it when it gets there. Nobody else sees.`,
      ],
      options: (c, pid) => [
        { id: 'deliver', label: 'Carry it straight over', blurb: 'The box as Nonna tied it.', honest: true },
        { id: 'skim', label: `Take ${money(round5k((c.memo.boxed ?? 0) * 0.2))} out by the payphone`, blurb: 'Vinnie never counts in front of people. Almost never.', greedy: true, disabled: (c.memo.boxed ?? 0) < 10000 ? 'There isn’t enough in the box to notice.' : null },
        { id: 'sweeten', label: `Put ${money(10000)} of your own in`, blurb: 'Vinnie will find more than he asked for. Vinnie remembers things like that.', disabled: c.p(pid).cash < 10000 ? 'You don’t have it.' : null },
      ],
      fallback: () => ({ option: 'deliver' }),
      bot(c, p, opts) {
        const r = c.rng();
        const skim = { greedy: 0.45, snake: 0.5, wild: 0.25 }[p.style] ?? 0.05;
        if (r < skim && opts.some((o) => o.id === 'skim')) return { option: 'skim' };
        if (r > 0.85 && p.style === 'loyal' && opts.some((o) => o.id === 'sweeten')) return { option: 'sweeten' };
        return { option: 'deliver' };
      },
      resolve(c, { choices }) {
        const pid = c.memo.carrier;
        const ch = choices[pid]?.option ?? 'deliver';
        if (ch === 'skim') {
          const n = round5k((c.memo.boxed ?? 0) * 0.2);
          c.memo.boxed -= n;
          c.memo.skimmed = true;
          c.give(pid, n, 'the cake box');
          c.fact(pid, 'box', `Did ${c.name(pid)} take anything out of Vinnie’s cake box?`, true);
        } else if (ch === 'sweeten') {
          const n = c.charge(pid, 10000);
          c.memo.boxed += n;
          c.memo.sweetened = true;
          c.fact(pid, 'box', `Did ${c.name(pid)} take anything out of Vinnie’s cake box?`, false);
        } else c.fact(pid, 'box', `Did ${c.name(pid)} take anything out of Vinnie’s cake box?`, false);
        c.line(`${c.name(pid)} walks the eleven steps. Nobody sees the four in the middle.`);
      },
    },

    'green-pontiac': {
      engine: 'roll', time: '9:25 P.M.', place: 'Mulberry Avenue, outside Nonna’s', title: 'The Green Pontiac', kicker: 'THE DICE',
      text: (c) => [
        `Before Nonna calls anybody, she wants to know whose hand it was. Out on Mulberry Avenue there’s a green Pontiac with no lights on, pulling away from the kerb, not quickly enough.`,
        `${c.freeByJob('driver')?.name ?? 'Somebody'} is already running for their car.`,
      ],
      target: () => 7,
      roller: (c) => c.freeByJob('driver')?.id ?? null,
      label: 'After the Pontiac',
      stakes: 'Make it and Nonna has a name to say on the phone. Miss it and whoever threw it got a good look at who came after them.',
      resolve(c, r) {
        if (r.success) {
          c.memo.thrower = c.rng.pick(['Richie Castellano, Vinnie’s nephew, nineteen', 'a Castellano cousin called Sonny who works at the car wash', 'Jumbo, from the card room, who had to be helped into the Pontiac']);
          c.memo.callMod = -1;
          c.line(`${c.freeByJob('driver')?.name ?? 'Somebody'} boxes the Pontiac in at the light on Canal. Behind the wheel is ${c.memo.thrower}. Once he’s out of the car, he says a lot of things very fast. Nonna will have a name to say on the phone.`);
          return;
        }
        const d = c.freeByJob('driver');
        c.line(`The Pontiac goes through the light on Canal and doesn’t come back. ${d ? `Whoever was in it got a good look at ${d.name}.` : ''}`);
        if (d) c.heat(d.id, 1, 'chasing a Castellano down Canal Street');
      },
    },

    'nonnas-promise': {
      engine: 'vote', time: '10:20 P.M.', place: 'Nonna’s kitchen', title: 'What Nonna Promised', kicker: 'A VOTE',
      text: (c) => [
        `Nonna hangs up and sits down. “${c.memo.called ?? 'They'} will talk to Vinnie,” she says. “But nothing is free. I promised something. The table decides if we keep my promise.”`,
        `She tells you what it was: ${money(c.scale(15000))} for a Castellano christening, and one of you, at the church on Sunday, in a suit, in the front pew, where the whole of Front Street will see.`,
      ],
      options: (c) => [
        { id: 'keep', label: 'Keep all of it', blurb: `${money(c.scale(15000))} out of the Bag, and somebody in the front pew. Whoever wears the suit is the one Front Street remembers.`, risk: 0.1, reward: 0.4 },
        { id: 'money', label: 'Send the money, skip the church', blurb: 'The Castellanos get the envelope. Nobody gets seen.', risk: 0.4, reward: 0.3 },
        { id: 'break', label: 'Break it', blurb: 'Free. Nonna’s word, broken. The Castellanos might let it go. They might not.', risk: 0.7, reward: 0.2 },
      ],
      resolve(c, { choice, votes }) {
        if (choice === 'break') {
          if (c.rng.chance(0.5)) {
            c.set('war', true);
            c.set('truce', null);
            c.line('Nonna doesn’t argue. She calls back and says three words. At eleven, the phone rings, and nobody on the other end says anything at all. The war is back on.');
            return;
          }
          c.line('Nonna calls back and says she will be sending nothing. There is a long silence. Then somebody on the other end laughs. “Same old Nonna,” they say.');
          return;
        }
        const paid = tablePays(c, c.scale(15000));
        if (!paid.ok) {
          const war = c.rng.chance(0.5);
          if (war) { c.set('war', true); c.set('truce', null); }
          c.line(`Between the Bag and everybody’s pockets there’s ${money(paid.had)}, which is not what Nonna promised. She calls back and says so, in Sicilian.${war ? ' Nobody answers. The war is back on.' : ' Whoever is on the other end laughs. “Next month, then,” they say.'}`);
          return;
        }
        const n = paid.paid;
        if (choice === 'money') { c.line(`${howPaid(paid)}, to a Castellano christening, in an envelope with Nonna’s handwriting on it. Nobody goes to the church.`); return; }
        const voters = Object.entries(votes).filter(([, v]) => v === 'keep').map(([pid]) => pid);
        const suit = c.p(c.rng.pick(voters.length ? voters : c.free.map((p) => p.id)));
        if (suit) {
          (suit.edges ??= []).push({ label: 'the front pew' });
          c.heat(suit.id, 1, 'the front pew at a Castellano christening');
          c.note(suit.id, 'Sunday: the front pew at St. Lucy’s, in a suit, with the whole of Front Street behind you. Vinnie shook your hand after. (+1 on your next roll.)', 'Nonna');
        }
        c.line(`${money(n)} for the christening, and ${suit?.name ?? 'somebody'} in the front pew at St. Lucy’s on Sunday, in a suit. Front Street will remember the face.`);
      },
    },

    favour: {
      engine: 'vote', time: '10:50 P.M.', place: 'The back booth at Dolores’s', title: 'One More Thing', kicker: 'A VOTE',
      text: () => ['Before anybody can stand up, Vinnie puts his hand flat on the lid of the cake box and leaves it there. “One more thing,” he says, “so we both remember this.”', 'What do you give him?'],
      options: () => [
        { id: 'package', label: 'Carry a package for him tomorrow', blurb: 'One of you, an address in Bensonhurst, no questions. It pays. It’s also a package.', risk: 0.5, reward: 0.4 },
        { id: 'sunday', label: 'Invite him to Nonna’s for Sunday dinner', blurb: 'The whole family, both sides, at one table. Nobody has done that since 1987.', risk: 0.3, reward: 0.6 },
        { id: 'nothing', label: '“That was the thing.”', blurb: 'The money is the favour. He might not like that.', risk: 0.5, reward: 0.2 },
      ],
      resolve(c, { choice }) {
        if (choice === 'package') {
          const who = c.rng.pick(c.free);
          if (who) { c.give(who.id, 15000, 'Vinnie’s package'); c.heat(who.id, 1, 'a package for Vinnie'); }
          c.line(`${who?.name ?? 'Somebody'} will carry it. Vinnie writes an address on a napkin and pays in advance: ${money(15000)}. Nobody asks what’s in it.`);
        } else if (choice === 'sunday') {
          c.set('vinnieSunday', true);
          c.caseFile(-1, 'the Castellanos stopped helping Prout, for a Sunday dinner');
          c.line('Vinnie takes his hand off the box. “Sunday,” he says. “I’ll bring the cannoli.” Across the river, the Castellanos stop returning Prout’s calls.');
        } else if (c.rng.chance(0.5)) c.line('Vinnie looks at you for a long time and then laughs. “That was the thing,” he says. “All right.”');
        else { c.set('war', true); c.line('Vinnie takes his hand off the box, very slowly, and says, “All right,” in a way that means it isn’t.'); }
      },
    },

    'the-list': {
      engine: 'whispers', time: '9:40 P.M.', place: 'Nonna’s kitchen, her address book open', title: 'Nonna’s Address Book', kicker: 'WHO DOES SHE CALL?',
      whoLabel: 'Four old Castellanos in Nonna’s address book',
      text: (c) => {
        const t = c.freeByJob('talker')?.name ?? 'Somebody';
        return [
          'Nonna’s address book is older than most of the people at the table. There are four Castellanos in it she could call tonight, and she has decided to let you choose. “I know what I know about them,” she says. “You know what you know.”',
          `${t} tells her who to call. Everybody else knows one thing about one of the four.`,
        ];
      },
      openings: () => [
        { id: 'aunt', label: 'Aunt Philomena, Vinnie’s mother’s sister',
          yes: 'Aunt Philomena is ninety-one and the only person Vinnie has ever been afraid of.',
          no: 'Aunt Philomena went into a home in March and thinks it’s 1962.' },
        { id: 'priest', label: 'Father Anthony, the Castellanos’ priest',
          yes: 'Father Anthony has baptised every Castellano since 1974. Vinnie does what he says, on Sundays.',
          no: 'Father Anthony and Vinnie fell out over a funeral. They haven’t spoken since.' },
        { id: 'benny', label: 'Benny, from the pawn shop',
          yes: 'Benny was sweet on Nonna in 1957 and has never stopped. He’d walk across the river on his knees for her.',
          no: 'Benny calls Vinnie every night to tell him everything. Everything.' },
        { id: 'carla', label: 'Carla, Vinnie’s wife',
          yes: 'Carla and Nonna have played cards every Wednesday for thirty years. Vinnie doesn’t know.',
          no: 'Carla Castellano hasn’t spoken to Nonna since a baptism in 1994, and never will.' },
      ],
      filler: () => ['Nonna’s address book has a rubber band around it and a holy card of St. Anthony inside the cover.', 'Half the people in the address book are crossed out, in pencil, with a date.'],
      resolve(c, { success, openingLabel }) {
        c.memo.called = openingLabel.split(',')[0];
        c.memo.callMod = (c.memo.callMod ?? 0) + (success ? -2 : 1);
        c.line(success ? `${openingLabel}. Nonna nods: “Good.” She dials from memory.` : `${openingLabel}. Nonna looks at you over her glasses, says “If you say so,” and dials.`);
      },
    },

    waiting: {
      engine: 'choose', time: '11:00 P.M.', place: 'Nonna’s kitchen, waiting for the phone', title: 'Waiting Up', kicker: 'WHAT DO YOU DO?',
      text: () => ['The phone didn’t ring back. Nonna has told everybody to sleep in their clothes. It is going to be a long night, and everybody spends it their own way.', 'Nobody sees what anybody else decides.'],
      who: (c) => c.free.map((p) => p.id),
      options: () => [
        { id: 'sit', label: 'Sit up with Nonna', blurb: 'All night, at the kitchen table, with the lights off. She’ll remember who stayed.', honest: true },
        { id: 'window', label: 'Sit at the front window with a bat', blurb: 'If a car comes, you’ll see it first. You’ll be seen too.', brave: true },
        { id: 'home', label: 'Go home and lock the door', blurb: 'Your own bed. Your own door. Your own problem.' },
      ],
      bot(c, p) { return { option: p.style === 'loyal' ? 'sit' : p.style === 'nervous' ? 'home' : c.rng.pick(['sit', 'window', 'home']) }; },
      resolve(c, { choices }) {
        const sat = [];
        for (const [pid, ch] of Object.entries(choices)) {
          if (ch.option === 'sit') { sat.push(c.name(pid)); (c.p(pid).edges ??= []).push({ label: 'a night up with Nonna' }); c.note(pid, 'At four in the morning Nonna told you about the night in 1957 she met Sal’s father, and fell asleep with her hand on your arm. (+1 on your next roll.)', 'Nonna'); }
          else if (ch.option === 'window') { c.memo.watchers = [...(c.memo.watchers ?? []), pid]; c.note(pid, 'You sat at the window with a bat across your knees until the milk truck came. Anybody who drove down Mulberry Avenue saw you there.', 'the front window'); }
          else c.note(pid, 'You went home and locked the door and didn’t sleep.', 'home');
        }
        c.line(sat.length ? `In the morning, ${c.list(sat)} ${sat.length === 1 ? 'is' : 'are'} still at the kitchen table with Nonna.` : 'In the morning, Nonna is alone at the kitchen table. She doesn’t mention it. She doesn’t have to.');
      },
    },

    'card-room': {
      engine: 'grab', time: '11:30 P.M.', place: 'Above the Sunshine Laundromat, Front Street', title: 'The Card Room', kicker: 'HOW GREEDY ARE YOU?',
      carCaught: (c, n) => `${n} was still in the alley with the engine running. Jumbo leaned out of the back window and read the plate out loud.`,
      text(c) {
        const d = c.freeByJob('driver');
        return [
          `Up the back stairs past the dryers. The card room is full: ${c.rng.pick(['a dozen men in undershirts, a pot on every table, and a television showing the Knicks', 'six tables of poker and one of pinochle, which is the dangerous one'])}. The cash box is by the door, which is where you come in.`,
          `Every round, grab or go. The Castellanos are upstairs, the dealers are armed, and the alarm is a very large man called Jumbo. ${d ? `${d.name} is idling in the alley.` : 'Nobody is watching the car.'}`,
        ];
      },
      who: (c) => grabbers(c),
      vault: (c) => round5k(c.scale(120000) * (0.85 + c.rng() * 0.3)),
      alarm: (c) => Math.max(0, 1 - (onPost(c, 'dryers').length ? 1 : 0)),
      resolve(c, r) {
        const total = Object.values(r.hauls).reduce((a, b) => a + b, 0);
        c.memo.take = total;
        c.memo.hauls = r.hauls;
        c.memo.tripped = r.tripped;
        c.line(total ? `${money(total)} out of the Castellanos’ own card room. They will be talking about it for years.` : 'Nobody got anything but a look at Jumbo, which is worse than nothing.');
        if (r.tripped) c.caseFile(1, 'a shooting on Front Street, with no shots fired, which Prout still counts');
      },
    },

    car: {
      engine: 'roll', time: '11:44 P.M.', place: 'The alley behind the laundromat', title: 'The Alley', kicker: 'GET AWAY',
      text: (c) => [`${c.memo.tripped ? 'Jumbo is at the top of the stairs, shouting.' : 'Nobody has noticed yet.'} ${c.freeByJob('driver')?.name ?? 'Somebody'} has the engine going and the alley is one car wide.`],
      target: (c) => 7 + (c.memo.tripped ? 1 : 0) + (c.memo.jumboMod ?? 0) - (onPost(c, 'alley').length ? 1 : 0),
      roller: (c) => c.freeByJob('driver')?.id ?? null,
      label: 'Down the alley',
      stakes: 'Miss it and the Castellanos get a plate number, and everybody takes one heat.',
      resolve(c, r) {
        if (r.success) { c.line('Down the alley, across Front Street against the light, and gone.'); return; }
        c.memo.carLost = true;
        c.line('Down the alley and straight into a garbage truck. Everybody got out and ran. The Castellanos have the car.');
        for (const p of c.free) c.heat(p.id, 1, 'the alley');
      },
    },

    tribute: {
      engine: 'story', time: '10:30 P.M.', place: 'The back booth at Dolores’s', title: 'The Apology', kicker: 'THE CASTELLANOS',
      run(c) {
        const n = c.memo.boxed ?? 0;
        const m = c.memo.carrier ?? c.memo.messenger;
        if (c.memo.boxShort && !c.memo.sweetened) {
          c.set('war', true);
          c.line(`Vinnie unties the string and counts it, slowly, in front of everybody. ${money(n)}. He puts the lid back on. “Tell your grandmother,” he says, “that I know what she can afford, and this isn’t it.” The war is still on.`);
          return;
        }
        if (c.memo.skimmed && c.rng.chance(c.memo.priceMult < 1 ? 0.35 : 0.6)) {
          c.set('war', true);
          c.line(`Vinnie opens the cake box and counts it, which he never does. Twice. Then he closes the lid, looks at ${c.name(m)}, and says, “Tell your grandmother it was short.” The war is still on.`);
          if (m) {
            c.stamp(m, 'SHORT');
            for (const p of c.free) if (p.id !== m) c.grudge(p.id, m, 'came up short in Vinnie’s cake box');
          }
          return;
        }
        c.set('war', false);
        c.set('truce', 'accept');
        if (m && !c.isAway(m)) { c.give(m, 10000, 'Vinnie’s tip'); c.note(m, 'Vinnie tipped you $10k for carrying it over. Nobody else knows.', 'Vinnie Castellano'); }
        if (c.memo.sweetened) c.caseFile(-1, 'Vinnie found more in the box than he asked for, and told Prout to go to hell');
        c.line(`Vinnie opens the cake box, looks at the ${money(n)} inside without counting it, closes it again, and shakes hands with ${m ? c.name(m) : 'whoever carried it'}. It’s over. Probably.`);
      },
      text: (c) => [`${c.name(c.memo.carrier ?? c.memo.messenger ?? c.free[0]?.id)} puts the cake box down on the table in front of Vinnie. Dolores has stopped pretending to wipe the counter. Vinnie unties the bakery string himself.`],
    },

    'nonna-calls': {
      engine: 'roll', time: '10:00 P.M.', place: 'Nonna’s kitchen', title: 'Nonna Makes a Call', kicker: 'THE DICE',
      text: (c) => [`Nonna is on the phone for eleven minutes and says maybe twenty words. Most of them are names${c.memo.thrower ? `, and one of them is ${c.memo.thrower.split(',')[0]}` : ''}. One of them, everybody is fairly sure, is a threat. Then she hangs up and looks at the phone.`],
      target: (c) => (c.byJob('cousin') ? 6 : 7) + (c.memo.callMod ?? 0),
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
