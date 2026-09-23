// The Drop: the Castellanos' weekly collection is left in one of four cars in
// the Shop-Rite parking lot on Route 9. Take the right one, then outrun
// everybody who wants it back.

import { counting, money, round5k, share, nightDay, nightKicker } from '../common.js';
import { crew, onPost } from '../heist.js';

const CARS = [
  { id: 'buick', label: 'The blue Buick LeSabre',
    yes: 'The bagman always leaves it in a Buick. He says nobody in the history of the world has looked twice at a Buick.',
    no: 'The bagman rolled a Buick on the Belt Parkway in 1991 and won’t go near one.' },
  { id: 'van', label: 'The white Econoline van',
    yes: 'This week’s drop is heavy — too heavy for a trunk. It needs a van.',
    no: 'The Econoline belongs to a plumber who does Nonna’s pipes. He’s in the Shop-Rite buying Lysol.' },
  { id: 'camaro', label: 'The red Camaro',
    yes: 'The bagman’s nephew has been bragging all week that he’s “doing the pickup in his own car.” He drives a red Camaro.',
    no: 'A red Camaro in a parking lot at 11 p.m. is the first thing any cop looks at. The Castellanos aren’t stupid.' },
  { id: 'wagon', label: 'The wood-panelled station wagon',
    yes: 'The station wagon has a child seat in the back, with nothing in it but a gym bag. Who takes a child seat to the Shop-Rite at 11 p.m.?',
    no: 'The station wagon belongs to a very tired mother of four who is asleep in the driver’s seat.' },
];

const FILLER = [
  'The Shop-Rite on Route 9 closes at eleven. The lot lights go off at eleven fifteen.',
  'There is a shopping cart in the lot that has been there so long it has a name: Kevin.',
  'The security guard at the Shop-Rite goes on his break at exactly 10:55.',
];

const CHASES = {
  bridge: { title: 'The Bridge', place: 'The Ferry Street bridge', target: 7, text: 'Two black Lincolns behind you and the bridge ahead going up for a barge. The gap is closing.' },
  tunnel: { title: 'The Tunnel', place: 'The Harbor tunnel', target: 6, text: 'Into the tunnel at eighty with the Lincolns behind. It’s two lanes and one of them is closed for repairs.' },
  parade: { title: 'The Feast', place: 'Mulberry Avenue, the Feast of St. Anthony', target: 8, text: 'Straight into the Feast. Three hundred people, a brass band, and a nine-foot saint on a platform coming the other way.' },
  train: { title: 'The Crossing', place: 'The level crossing on Canal Street', target: 7, text: 'The barrier is coming down at the Canal Street crossing and the 11:40 freight is right there.' },
};

function chaseBeat(id) {
  const ch = CHASES[id];
  return {
    engine: 'roll', place: ch.place, title: ch.title, kicker: 'THE CHASE',
    time: (c) => ((c.memo.chased?.length ?? 1) > 1 ? '11:41 P.M.' : '11:25 P.M.'),
    enter(c) { c.memo.chased = [...(c.memo.chased ?? []), id]; },
    text: (c) => {
      const first = (c.memo.chased?.length ?? 1) <= 1;
      const decoy = onPost(c, 'decoy')[0];
      const diner = onPost(c, 'diner')[0];
      const help = first ? [
        decoy ? `${decoy.name} peels off the other way in the decoy, and one set of headlights goes after it.` : null,
        diner ? `${diner.name} is on the diner payphone to the car, calling out which way the Lincolns are turning.` : null,
      ].filter(Boolean).join(' ') : (c.memo.chaseMod ? 'The Lincolns stopped for the gym bag, and lost a block doing it.' : 'The Lincolns are still there. They were always going to be still there.');
      return [`${first ? '' : 'Again. '}${ch.text}${help ? ` ${help}` : ''}`, `${c.freeByJob('driver')?.name ?? 'Whoever’s driving'} has both hands on the wheel and ${money(c.memo.take ?? 0)} on the back seat.`];
    },
    // a decoy pulls one Lincoln away on the first chase; somebody at the diner sees the rest coming
    target: (c) => ch.target + (c.memo.wrongCar ? 1 : 0) + (c.memo.chaseMod ?? 0)
      - ((c.memo.chased?.length ?? 0) <= 1 && onPost(c, 'decoy').length ? 1 : 0)
      - ((c.memo.chased?.length ?? 0) <= 1 && onPost(c, 'diner').length ? 1 : 0),
    roller: (c) => c.freeByJob('driver')?.id ?? null,
    label: (c) => `${c.freeByJob('driver')?.name ?? 'Whoever’s driving'} floors it.`,
    stakes: 'Miss it and a bag goes out the window, and the driver takes the heat for it.',
    resolve(c, r) {
      c.memo.chaseOk = [...(c.memo.chaseOk ?? []), r.success];
      if (r.success) {
        c.line(c.rng.pick({
          bridge: ['Over the gap with a bang that took the exhaust off. The Lincolns stopped. The barge honked.'],
          tunnel: ['Through the closed lane, past a very surprised man with a stop sign. The Lincolns went the legal way.'],
          parade: ['Round the saint, through the brass band, and out the other side with a tuba player on the hood for half a block.'],
          train: ['Under the barrier with an inch to spare. The freight went through, eighty cars long. The Lincolns sat and watched it.'],
        }[id]));
        return;
      }
      const lost = round5k((c.memo.take ?? 0) * 0.3);
      c.memo.take = Math.max(0, (c.memo.take ?? 0) - lost);
      c.memo.lost = true;
      c.line(`A bag went out the back window: ${money(lost)} across the road behind you. The Lincolns stopped to pick it up, and got a good look at who was in the car.`);
      const riders = onPost(c, 'inside').concat(onPost(c, 'car'));
      for (const p of riders.length ? riders : [c.freeByJob('driver')].filter(Boolean)) c.heat(p.id, 1, 'the chase');
    },
  };
}

export default {
  id: 'drop', title: 'The Drop', day: nightDay, kicker: nightKicker,
  beats: [
    'lot',
    'which-car',
    { oneOf: Object.keys(CHASES).map((id) => ({ beat: `chase-${id}` })) },
    'lincolns',
    { if: (c) => !c.memo.ditched, then: { oneOf: Object.keys(CHASES).map((id) => ({ beat: `chase-${id}`, when: (c) => !c.memo.chased?.includes(id) })) } },
    'the-count',
    'count',
  ],
  close(c) {
    c.remember(
      `Shoppers at the Route 9 Shop-Rite reported ${c.memo.wrongCar ? 'a car alarm, then several more car alarms, then ' : ''}a high-speed chase late on ${c.rng.pick(['what had been a quiet night', 'the night of the Feast'])}. Police found ${c.memo.lost ? 'a gym bag on the road with money in it, which they described as “unusual”' : 'nothing but tyre marks'}.`,
      { courier: 'CHASE THROUGH THE FEAST' },
    );
  },
  defs: {
    lot: crew({
      time: '10:40 P.M.', place: 'Route 9, across from the Shop-Rite',
      carWhere: 'at the wheel', talkerDoes: 'picking the car',
      text: (c) => [
        `The Shop-Rite lot at twenty to eleven, from across Route 9. ${c.rng.pick(['The Castellanos’ bagman is due at half past.', 'Somebody’s already parked a black Lincoln at the far end with the engine running.'])} Whoever is in the car with the money when it leaves is in the chase, with everything that goes with a chase.`,
        'Pick where you are tonight. It all gets split evenly at the end, whatever you did — so somebody has to be brave, and everybody else has to trust them.',
      ],
      talkerInside: true,
      posts: () => [
        { id: 'inside', label: 'In the car with the money', blurb: 'In the chase. If a bag goes out of the window, you’re the one who was seen.', where: 'in the car with the money' },
        { id: 'decoy', label: 'Driving the decoy', blurb: 'A second car, same colour, going the other way. One of the Lincolns follows you instead. The first chase is one easier.', max: 1, where: 'driving the decoy' },
        { id: 'diner', label: 'In the diner across the road', blurb: 'Coffee, a window, and a pay phone to the car. You see who comes after them. The first chase is one easier.', max: 1, where: 'watching from the diner' },
      ],
    }),

    lincolns: {
      engine: 'vote', time: '11:32 P.M.', place: 'Somewhere between Route 9 and home', title: 'The Lincolns', kicker: 'A VOTE',
      text: (c) => (c.memo.chaseOk?.[0] ? [
        'You came out of it clean, but the Lincolns are still out there: two sets of headlights, three blocks back, turning every time you turn.',
        'What now?',
      ] : [
        'The Lincolns are right on your bumper. One of them has its window down, and somebody in it is shouting a name you don’t want to hear shouted.',
        'What now?',
      ]),
      options: (c) => [
        { id: 'floor', label: 'Floor it', blurb: 'Keep going and outrun them. Another chase.', risk: 0.5, reward: 0.5 },
        { id: 'garage', label: 'Ditch the car in Nonna’s cousin’s garage', blurb: 'Lights off, door down, wait it out. No more chasing — if they don’t find the garage.', risk: c.memo.chaseOk?.[0] ? 0.3 : 0.6, reward: 0.5 },
        { id: 'bag', label: 'Throw them a bag', blurb: 'A quarter of the money out of the window. They’ll stop for it. The next chase is two easier.', risk: 0.2, reward: 0.2 },
      ],
      resolve(c, { choice }) {
        const riders = onPost(c, 'inside');
        if (choice === 'garage') {
          c.memo.ditched = true;
          const found = c.rng.chance(c.memo.chaseOk?.[0] ? 0.25 : 0.5);
          c.memo.garageSafe = !found;
          if (!found) { c.line('Lights off, door down. The Lincolns go past twice, slowly, and then they don’t come back. Nobody talks for an hour.'); return; }
          const lost = round5k((c.memo.take ?? 0) * 0.3);
          c.memo.take = Math.max(0, (c.memo.take ?? 0) - lost);
          for (const p of riders) c.heat(p.id, 1, 'found in a garage');
          c.line(`The Lincolns find the garage. There is shouting and a crowbar and ${money(lost)} of it goes back across the river. Everybody in the car was seen.`);
          return;
        }
        if (choice === 'bag') {
          const lost = round5k((c.memo.take ?? 0) * 0.25);
          c.memo.take = Math.max(0, (c.memo.take ?? 0) - lost);
          c.memo.chaseMod = -2;
          c.line(`${money(lost)} goes out of the window in a gym bag. Both Lincolns stop for it, which says a lot about the Castellanos.`);
          return;
        }
        c.line('Everybody holds on to something.');
      },
    },

    'which-car': {
      engine: 'whispers', time: '11:05 P.M.', place: 'The Shop-Rite parking lot, Route 9', title: 'Which Car', kicker: 'ONE OF YOU CHOOSES',
      whoLabel: 'Which car is the drop in?',
      text: (c) => {
        const t = c.freeByJob('talker')?.name ?? 'Somebody';
        return [
          `Once a week the Castellanos’ collections — the numbers, the vending machines, the "insurance" — get left in a car in the Shop-Rite lot for a man who picks them up at half past eleven. ${c.rng.pick(['Tonight there are four cars in the lot.', 'The lot is nearly empty. Four cars.'])} It’s ${c.flag('war') ? 'a declaration of war' : 'the easiest money this week, as long as it’s the right car'}.`,
          `${t} picks the car. Pick wrong and every alarm in the lot goes off. Everybody else knows one thing about one of the cars.`,
        ];
      },
      openings: () => CARS,
      filler: () => FILLER,
      resolve(c, { success, openingLabel, talker }) {
        c.memo.take = round5k(c.scale(120000) * (0.85 + c.rng() * 0.3));
        if (success) {
          c.line(`${openingLabel}. The door was unlocked. Under a blanket in the back: ${money(c.memo.take)} in gym bags. The bagman’s headlights are just turning into the lot.`);
          return;
        }
        c.memo.wrongCar = true;
        c.line(`${openingLabel}. Wrong. The alarm went, and then the one next to it, and by the time you found the right car the bagman was in the lot with two carloads of friends.`);
        c.heat(talker, 1, 'the wrong car');
      },
    },
    ...Object.fromEntries(Object.keys(CHASES).map((id) => [`chase-${id}`, chaseBeat(id)])),

    'the-count': {
      engine: 'report', time: '12:10 A.M.', title: 'The Count', kicker: 'SOMEBODY COUNTS IT',
      place: (c) => (c.memo.garageSafe ? 'Nonna’s cousin’s garage, still' : 'A lock-up garage on Water Street'),
      enter(c) { c.memo.counter = (c.freeByJob('numbers') ?? c.rng.pick(c.free))?.id ?? null; },
      counter: (c) => c.memo.counter,
      text: (c) => [
        `${c.memo.garageSafe ? 'Nobody wants to drive anywhere yet. The bags go on the floor of Nonna’s cousin’s garage' : 'The bags go on the floor of a lock-up garage'} under one bulb. Somebody has to count it, and there’s only room for one person between the car and the wall.`,
        `${c.memo.counter ? c.name(c.memo.counter) : 'Somebody'} counts${c.freeByJob('numbers')?.id === c.memo.counter ? ', because counting is the job' : ', because somebody has to'}. Everybody else waits outside and trusts them, because what else are you going to do. Whatever they say it comes to gets split evenly. Whatever they don’t say, they keep.`,
      ],
      amount: (c) => c.memo.take ?? 0,
      resolve(c, { reported, counter }) {
        const ids = c.free.map((p) => p.id);
        const each = share(c, ids, reported, 'the drop');
        c.line(`${c.name(counter)} came out and said ${money(reported)}. Split ${ids.length} ways: ${money(each)} each.`);
      },
    },

    count: counting({ time: '1:00 A.M.' }),
  },
};
