// The Drop: the Castellanos' weekly collection is left in one of four cars in
// the Shop-Rite parking lot on Route 9. Take the right one, then outrun
// everybody who wants it back.

import { counting, money, round5k, share, nightDay, nightKicker } from '../common.js';

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
    engine: 'roll', time: '11:25 P.M.', place: ch.place, title: ch.title, kicker: 'THE CHASE',
    enter(c) { c.memo.chased = [...(c.memo.chased ?? []), id]; },
    text: (c) => [ch.text, `${c.freeByJob('driver')?.name ?? 'Whoever’s driving'} has both hands on the wheel and ${money(c.memo.take ?? 0)} on the back seat.`],
    target: (c) => ch.target + (c.memo.wrongCar ? 1 : 0),
    roller: (c) => c.freeByJob('driver')?.id ?? null,
    label: (c) => `${c.freeByJob('driver')?.name ?? 'Whoever’s driving'} floors it.`,
    stakes: 'Miss it and a bag goes out the window, and the driver takes the heat for it.',
    resolve(c, r) {
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
      c.line(`A bag went out the back window: ${money(lost)} across the road behind you. The Lincolns stopped to pick it up.`);
      const d = c.freeByJob('driver');
      if (d) c.heat(d.id, 1, 'the chase');
    },
  };
}

export default {
  id: 'drop', title: 'The Drop', day: nightDay, kicker: nightKicker,
  beats: [
    'which-car',
    { oneOf: Object.keys(CHASES).map((id) => ({ beat: `chase-${id}` })) },
    { oneOf: Object.keys(CHASES).map((id) => ({ beat: `chase-${id}`, when: (c) => !c.memo.chased?.includes(id) })) },
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
      engine: 'report', time: '12:10 A.M.', place: 'A lock-up garage on Water Street', title: 'The Count', kicker: 'SOMEBODY COUNTS IT',
      text: (c) => [
        'The bags go on the floor of a lock-up garage under one bulb. Somebody has to count it, and there’s only room for one person between the car and the wall.',
        `${c.freeByJob('numbers')?.name ?? 'Whoever counts'} counts. Everybody else waits outside and trusts them, because what else are you going to do. Whatever they say it comes to gets split evenly. Whatever they don’t say, they keep.`,
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
