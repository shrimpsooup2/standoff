// The Counting House: the Bag is short, the trial is close, and there is one
// room in this city with enough cash in it to fix that.

import { counting, getaway, money, round5k, nightDay, nightKicker, tablePays, howPaid } from '../common.js';
import { crew, cut, grabbers, onPost, post } from '../heist.js';

const WAYS = {
  roof: { label: 'Over the roof', alarm: 1, blurb: 'Across from the laundry next door, through the skylight. Everybody has a job and it all has to work.' },
  fish: { label: 'In the fish truck', alarm: 0, blurb: 'The 4 a.m. delivery from the Fulton Market. You go in under the ice. It’s very cold and it smells exactly how you think.' },
  inside: { label: 'Through the counter', alarm: -1, blurb: 'The man who counts the money has a gambling problem. For money out of the Bag, he leaves a door open and looks the other way.' },
};

function way(c) { return c.flag('countingWay') ?? 'fish'; }

export default {
  id: 'counting-house', title: 'The Counting House', act: 3, day: nightDay, kicker: nightKicker,
  beats: [
    'the-plan',
    'crew',
    { if: (c) => way(c) === 'roof', then: 'skylight' },
    { if: (c) => way(c) === 'fish', then: 'checkpoint' },
    { if: (c) => way(c) === 'inside', then: 'the-counter' },
    'the-book',
    { maybe: 'inside', chance: 0.25, where: 'The stairs up to the counting room, Pearl Street' },
    'the-room',
    'getaway',
    'cut',
    'count',
  ],
  close(c) {
    const take = c.memo.take ?? 0;
    c.remember(
      take ? `Nobody has reported a robbery at the building on Pearl Street that nobody admits is a counting house. Several men were seen standing outside it at dawn, looking at the roof, for a long time.`
        : 'A delivery truck was stopped on Pearl Street before dawn. The driver said it was fish. It was mostly fish.',
      { courier: take ? 'PEARL STREET: “NOTHING HAPPENED HERE”' : 'FISH TRUCK STOPPED ON PEARL ST.' },
    );
  },
  defs: {
    'the-plan': {
      engine: 'vote', time: '11:00 P.M.', place: 'Nonna’s kitchen, a floor plan on the table', title: 'The Last Job', kicker: 'A VOTE',
      text: (c) => [
        `The Bag has ${money(c.bag.total)}. Morty wants ${money(c.bag.target)}. There are two nights left. ${c.rng.pick(['Nonna has not said a word about it, which is how you know.', 'Sal, on the phone this morning, didn’t mention the tomatoes once.'])}`,
        `Three floors above a laundromat on Pearl Street, ${c.flag('war') ? 'the Castellanos' : 'Big Tommy Russo’s people'} count every dollar that comes out of this neighbourhood before it goes anywhere else. Tonight it’s the week’s whole take. How do you get in?`,
      ],
      options: (c) => Object.entries(WAYS).map(([id, w]) => ({
        id, label: w.label, blurb: w.blurb,
        risk: id === 'roof' ? 0.6 : id === 'fish' ? 0.5 : 0.3, reward: 0.7,
        details: id === 'inside' ? [`Costs ${money(c.scale(40000))} out of the Bag, or your pockets if the Bag can’t.`, 'The alarm starts asleep.'] : id === 'roof' ? ['Hidden effort: everybody pulls their weight, or doesn’t.', 'The alarm starts twitchy.'] : [`A roll at the checkpoint: ${c.odds(2, 7)}.`],
      })),
      angles(c) {
        const ps = c.rng.shuffle(c.free.map((p) => p.id));
        const out = {};
        if (ps[0]) { out[ps[0]] = { option: 'inside', text: `Through the counter. The counter is your cousin Richie. For ${money(c.scale(40000))} out of the Bag he’ll leave the door open — and he’ll give you ${money(15000)} of it back, because blood is blood.` }; c.memo.richie = ps[0]; }
        if (ps[1]) { out[ps[1]] = { option: 'fish', text: 'The fish truck. The driver owes your father a favour from 1998. If it’s the fish truck, the checkpoint is two easier, and you ride up front, warm.' }; c.memo.fishFriend = ps[1]; }
        for (const id of ps.slice(2)) out[id] = { option: null, text: 'No angle. The Bag is short and this is the last big room in the city.' };
        return out;
      },
      resolve(c, { choice }) {
        c.set('countingWay', choice);
        if (choice === 'inside') {
          const paid = tablePays(c, c.scale(40000));
          c.memo.counterPaid = paid.ok;
          if (!paid.ok) {
            c.line(`The counter wants ${money(paid.want)}. Between the Bag and everybody’s pockets there’s ${money(paid.had)}. He takes nothing, promises nothing, and says he’ll “see how he feels” on the night.`);
            return;
          }
          c.line(`${howPaid(paid)}, in an envelope, to a man who counts money for a living and has a problem with the horses.`);
          const r = c.memo.richie;
          if (r && !c.isAway(r)) { c.give(r, 15000, 'cousin Richie'); c.note(r, `Richie slipped ${money(15000)} back into your pocket at the door. “Blood is blood.”`, 'Richie'); c.fact(r, 'angle', `Did ${c.name(r)} get money back from the counter?`, true); }
        } else {
          c.line(choice === 'roof' ? 'Over the roof. Somebody goes to buy rope.' : 'The fish truck. Nobody is looking forward to the ice.');
        }
      },
    },

    crew: crew({
      time: '3:00 A.M.', place: 'Pearl Street, across from the laundromat',
      text: (c) => [
        `The laundromat on Pearl Street is closed and dark. Three floors above it, one window is lit behind a blind, and behind the blind is the week’s whole take. ${c.flag('war') ? 'The Castellanos have two men on the door downstairs.' : 'Big Tommy has two men on the door downstairs.'}`,
        'Before anybody goes in, everybody picks where they’ll be. Inside, the money. Outside, the safety of everybody inside — and whatever the inside decides to give you afterwards.',
      ],
      talkerInside: false,
      posts: () => [
        { id: 'inside', label: 'Inside, in the counting room', blurb: 'The most money anybody here has ever seen. And the two men on the door.', where: 'in the counting room' },
        { id: 'roof', label: 'On the laundromat roof with a radio', blurb: 'You see the whole street. The getaway is one easier.', max: 2, where: 'on the roof' },
        { id: 'machines', label: 'Downstairs, running every machine in the laundromat', blurb: 'Forty dryers full of nothing. Nobody upstairs hears anything. The alarm starts one sleepier.', max: 1, where: 'running the machines' },
      ],
    }),

    'the-book': {
      engine: 'vote', time: '4:00 A.M.', place: 'The counting room, third floor', title: 'Big Tommy’s Book', kicker: 'A VOTE',
      text: (c) => (c.memo.inClean ? [
        `Before anybody touches the money: on the counting table, under a coffee cup, is a green ledger. Not Sal’s — ${c.flag('war') ? 'Vinnie’s' : 'Big Tommy’s'}. Every payoff this counting room has made in eleven years, in pencil. Page nine is the 9th Precinct. Page ten is somebody in the District Attorney’s office.`,
        'What do you do with it?',
      ] : [
        `On the counting table, under a coffee cup, is a green ledger — every payoff this room has made in eleven years — and the building already knows you’re here. Somebody is coming up the stairs.`,
        'It’s ten feet away. What do you do?',
      ]),
      options: (c) => (c.memo.inClean ? [
        { id: 'take', label: 'Take it', blurb: 'A book full of dirt on people who’d rather it stayed in the book. Somebody carries it, and owns it.', risk: 0.4, reward: 0.6 },
        { id: 'page', label: 'Tear out page ten and burn it', blurb: 'The page with the District Attorney’s office on it. Prout’s case gets a little less clean.', risk: 0.3, reward: 0.5 },
        { id: 'leave', label: 'Leave it exactly where it is', blurb: 'Nobody ever knows you saw it. Nobody comes looking for it.', risk: 0, reward: 0.1 },
      ] : [
        { id: 'grab', label: 'Grab it on the way past', blurb: 'Ten feet. The stairs are getting louder.', risk: 0.6, reward: 0.6 },
        { id: 'leave', label: 'Leave it, get the money', blurb: 'You came for the money.', risk: 0.1, reward: 0.2 },
      ]),
      resolve(c, { choice }) {
        const inside = c.free.filter((p) => onPost(c, 'inside').includes(p));
        const carrier = c.rng.pick(inside.length ? inside : c.free);
        if (choice === 'take' || (choice === 'grab' && c.rng.chance(0.55))) {
          c.card(carrier.id, 'dirt');
          c.line(`${carrier.name} puts the green ledger inside their coat. It is heavier than it looks. Everybody saw who has it now.`);
          c.remember(`${carrier.name} carried Big Tommy's green ledger out of Pearl Street.`, { who: carrier.id, kind: 'book' });
        } else if (choice === 'grab') {
          c.memo.bookMod = 1;
          c.line(`${carrier.name} goes for the book and knocks the coffee cup over it. By the time it’s shaken off, the stairs are very loud.`);
        } else if (choice === 'page') {
          c.caseFile(-1, 'page ten of a green ledger, burned in an ashtray');
          c.line('Page ten comes out and goes up in the ashtray on the counting table. Whoever in the DA’s office was on it will never know how lucky they got — or how unlucky Prout just did.');
        } else c.line('The book stays under the coffee cup. Nobody ever says they saw it.');
      },
    },

    skylight: {
      engine: 'plan', time: '3:30 A.M.', place: 'The roof on Pearl Street', title: 'The Skylight', kicker: 'EVERYBODY PULLS THEIR WEIGHT',
      text: () => ['Rope from the laundry roof, a plank across the gap, and a skylight painted shut in 1970. Everybody has a job.', 'Help (rope, a glass cutter, a man on the corner: $10k), coast, or quietly make it go wrong. Nobody sees who did what.'],
      target: (c) => c.free.length + 5,
      cost: () => 10000,
      labels: () => ({ help: 'Buy the rope and hold the plank', coast: 'Watch the street', sabotage: 'Kick the plank' }),
      resolve(c, r) {
        c.memo.inClean = r.success;
        c.line(r.success ? 'Down through the skylight without a sound. The counting room is right there under you, and it’s full.' : 'The plank went. Somebody went down through the skylight the fast way and landed on a table of money. You’re in — loudly.');
      },
    },

    checkpoint: {
      engine: 'roll', time: '3:50 A.M.', place: 'The loading dock, Pearl Street', title: 'Under the Ice', kicker: 'THE DICE',
      text: (c) => {
        // the driver's friend rides up front, unless they're our getaway driver, who is already on Pearl Street
        const friend = c.memo.fishFriend && !c.isAway(c.memo.fishFriend) && post(c, c.memo.fishFriend) !== 'car' ? c.name(c.memo.fishFriend) : null;
        return [`Everybody going in is under a tarp under four hundred pounds of ice and cod${friend ? ` — except ${friend}, who is up front with the driver and the heater on` : ''}. The truck stops at the loading dock. A man with a flashlight walks round it, slowly, whistling.`];
      },
      target: () => 7,
      mods: (c) => (c.memo.fishFriend && !c.isAway(c.memo.fishFriend) ? [{ label: 'the driver owes a favour', n: 2 }] : []),
      label: 'Holding your breath under the cod',
      stakes: 'Miss it and somebody sneezes: you’re in, but the alarm knows it.',
      resolve(c, r) {
        c.memo.inClean = r.success;
        c.line(r.success ? 'The flashlight went past. The truck backed into the dock. You climbed out of the ice smelling like the Friday special and walked straight into the counting room.' : 'Somebody sneezed. The man with the flashlight went for a phone. You’re in, but not for long.');
      },
    },

    'the-counter': {
      engine: 'story', time: '3:50 A.M.', place: 'A side door on Pearl Street', title: 'The Counter', kicker: 'A DOOR LEFT OPEN',
      enter(c) {
        // paid in full, he looks away; unpaid, it's a coin toss how he feels tonight
        c.memo.inClean = c.memo.counterPaid || c.rng.chance(0.35);
      },
      text: (c) => [c.memo.counterPaid
        ? `The side door is propped with a phone book. The counter, a thin man in a cardigan, is at his desk with his back to you, listening to the ${c.rng.pick(['racing results', 'Knicks on the radio', 'shipping forecast, for some reason'])} very loudly. He does not turn round. He will swear on his mother that he never turned round.`
        : c.memo.inClean
          ? 'The side door is shut. The counter, a thin man in a cardigan, opens it himself, looks at your empty hands for a long time, and then steps aside. “The horses were good to me this week,” he says. “Don’t make me sorry.”'
          : 'The side door is shut. The counter, a thin man in a cardigan, opens it himself, looks at your empty hands, and goes back inside to pick up the phone. You go in anyway, past him, while he’s still dialling.'],
    },

    'the-room': {
      engine: 'grab', time: '4:05 A.M.', place: 'The counting room, third floor', title: 'The Counting Room', kicker: 'HOW GREEDY ARE YOU?',
      carCaught: (c, n) => `${n} was still on Pearl Street with the engine running, right under the lit window. One of the men from the door took the plate.`,
      text(c) {
        const d = c.freeByJob('driver');
        return [
          `Money on every surface: on the tables, in the drawers, in shoeboxes stacked against the wall with the names of neighbourhoods written on them in marker. It’s the most money anybody here has ever seen in one place.`,
          `Every round, grab or go. ${c.memo.inClean ? 'Nobody knows you’re here. Yet.' : 'Somebody knows you’re here.'} ${d ? `${d.name} is on Pearl Street with the engine running.` : 'Nobody is watching the car.'}`,
        ];
      },
      who: (c) => grabbers(c),
      vault: (c) => round5k(c.scale(260000) * (0.85 + c.rng() * 0.3)),
      alarm: (c) => Math.max(0, WAYS[way(c)].alarm + (c.memo.inClean ? 0 : 2) + (c.memo.bookMod ?? 0) - (onPost(c, 'machines').length ? 1 : 0)),
      resolve(c, r) {
        const total = Object.values(r.hauls).reduce((a, b) => a + b, 0);
        c.memo.take = total;
        c.memo.hauls = r.hauls;
        c.memo.tripped = r.tripped;
        c.line(total ? `${money(total)} went out of the counting room in laundry bags.` : 'Nobody came out with anything. The biggest room in the city, and nothing.');
      },
    },

    getaway: getaway({
      time: '4:20 A.M.', place: 'Pearl Street',
      text: (c) => [`${c.memo.tripped ? 'Every light in the building is on.' : 'Pearl Street is empty and grey.'} ${c.freeByJob('driver')?.name ?? 'Somebody'} pulls away from the curb with the laundry bags in the back.`],
      target: (c) => 7 + (c.memo.tripped ? 1 : 0) - (onPost(c, 'roof').length ? 1 : 0),
      heat: 1,
    }),

    cut: cut({ time: '4:40 A.M.', place: 'A laundromat on Pearl Street, closed' }),

    count: counting({ time: '5:30 A.M.', text: (c) => [
      `Back at Nonna’s at dawn, with laundry bags. The Bag has ${money(c.bag.total)}; Morty wants ${money(c.bag.target)}. This is the count that decides it.`,
      'Everybody decides, privately, how much of what they’re holding goes in.',
    ] }),
  },
};
