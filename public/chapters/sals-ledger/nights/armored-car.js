// The Armored Car: a Brinks truck, seven things that all have to go right,
// and a gym bag on the hood of a car at the end of Pier 12.

import { counting, getaway, money, round5k, nightDay, nightKicker } from '../common.js';

const SITES = {
  dolores: { label: 'The coffee stop', value: 150000, target: 0, getaway: 6, blurb: 'The guards stop at Dolores’s every morning at 4:10 for two coffees and a cruller. Quiet. Dolores will never forgive you.' },
  bridge: { label: 'The bridge', value: 240000, target: 3, getaway: 8, blurb: 'Box it in on the Ferry Street bridge, where there’s nowhere to turn. Loud. A lot more money.' },
  depot: { label: 'The depot', value: 190000, target: 1, getaway: 7, blurb: 'Inside the Brinks depot on Water Street, during the shift change. Everything has to go right.' },
};

function site(c) { return SITES[c.flag('armoredSite')] ?? SITES.bridge; }

export default {
  id: 'armored-car', title: 'The Armored Car', day: nightDay, kicker: nightKicker,
  beats: [
    'coffee',
    'seven-things',
    { maybe: 'street', chance: 0.3 },
    'river',
    'ferry-street',
    'count',
  ],
  close(c) {
    const pot = c.memo.pot ?? 0;
    c.remember(
      c.memo.river
        ? `Divers from the harbor unit recovered a gym bag containing “a very large amount of wet cash” from beneath Pier 12 on Thursday morning. Police are appealing for information about an armored car robbery earlier the same night.`
        : pot ? `An armored car belonging to Brinks was robbed ${c.flag('armoredSite') === 'dolores' ? 'outside a Ferry Street diner, during what the guards described as “our coffee”' : c.flag('armoredSite') === 'depot' ? 'inside its own depot, which a company spokesman called “embarrassing, frankly”' : 'on the Ferry Street bridge'} in the early hours. An estimated ${money(pot)} was taken.`
          : 'An attempt on a Brinks armored car overnight was, in the words of one guard, “a mess.”',
      { courier: c.memo.river ? 'MONEY IN THE RIVER' : 'BRINKS TRUCK HIT' },
    );
    if (c.flag('armoredSite') === 'dolores') c.set('doloresAngry', true);
  },
  defs: {
    coffee: {
      engine: 'vote', time: '1:30 A.M.', place: 'Nonna’s kitchen, a Brinks schedule on the table', title: 'The Coffee Stop', kicker: 'A VOTE',
      text: (c) => [
        `${c.rng.pick(['Ray Mancuso left the schedule on Nonna’s table and went home without saying anything, which is how Ray says things.', 'The schedule came from a Brinks guard’s ex-wife, for $500 and a promise.'])} Every Thursday a Brinks truck carries the week’s takings from the Fifth Street shops to the depot on Water Street.`,
        'Where do you hit it?',
      ],
      options: (c) => Object.entries(SITES).map(([id, s]) => ({
        id, label: s.label, blurb: s.blurb, risk: 0.3 + s.target * 0.15, reward: s.value / 250000,
        details: [`In the truck: about ${money(c.scale(s.value))}`, `The job needs ${c.free.length + 5 + s.target} in all`, `Getaway: ${c.odds(2, s.getaway)}`],
      })),
      angles(c) {
        const ps = c.rng.shuffle(c.free.map((p) => p.id));
        const out = {};
        if (ps[0]) { out[ps[0]] = { option: 'depot', text: `The depot. Your brother-in-law works the shift change. If it’s the depot, he’ll leave a door propped — the job gets two easier — and he wants ${money(15000)} of your share for it. Nobody else needs to know it was him.` }; c.memo.inLaw = ps[0]; }
        if (ps[1]) { out[ps[1]] = { option: 'bridge', text: 'The bridge. You’ve got a cousin with a tow truck. If it’s the bridge, he’s the one who boxes it in — and he takes the car you came in, so nothing ties back to you. Your heat can’t go up tonight.' }; c.memo.towCousin = ps[1]; }
        if (ps[2]) out[ps[2]] = { option: null, text: 'Not the coffee stop. Dolores fed you for free for a year after your father died. If you hit her diner, you’ll know it, even if nobody else does.' };
        for (const id of ps.slice(3)) out[id] = { option: null, text: 'No angle. A truck full of money, and seven things that have to go right.' };
        return out;
      },
      resolve(c, { choice }) {
        c.set('armoredSite', choice);
        c.line({
          dolores: 'The coffee stop. Somebody will have to look Dolores in the eye on Sunday.',
          bridge: 'The bridge. Nobody sleeps.',
          depot: 'The depot. Somebody knows somebody. Somebody always does.',
        }[choice]);
      },
    },

    'seven-things': {
      engine: 'plan', time: '4:05 A.M.', place: (c) => site(c).label, title: 'Seven Things', kicker: 'EVERYBODY PULLS THEIR WEIGHT',
      text: (c) => [
        `Seven things have to go right: the radio, the traffic, the ${c.flag('armoredSite') === 'dolores' ? 'cruller' : 'lights'}, the guard on the left, the guard on the right, the lock, and nobody sneezing. Everybody has a part.`,
        'Help (equipment, a van, a scanner: $10k), coast, or quietly make one of the seven go wrong. Nobody sees who did what.',
      ],
      target: (c) => c.free.length + 5 + site(c).target - (c.flag('armoredSite') === 'depot' && c.memo.inLaw && !c.isAway(c.memo.inLaw) ? 2 : 0),
      cost: () => 10000,
      labels: () => ({ help: 'Bring the van and the scanner', coast: 'Stand where you’re told', sabotage: 'Make one of the seven go wrong' }),
      resolve(c, r) {
        const full = round5k(c.scale(site(c).value) * (0.85 + c.rng() * 0.3));
        c.memo.pot = r.success ? full : round5k(full * 0.4);
        if (r.success) {
          c.line(`All seven went right. The back of the truck opened like a refrigerator. ${money(c.memo.pot)} in bank bags.`);
        } else {
          c.line(`Four of the seven went right. The guard on the right got to his radio. You got one cart of bank bags before the sirens — ${money(c.memo.pot)} — and everybody was seen.`);
          for (const p of c.free) if (!(c.flag('armoredSite') === 'bridge' && p.id === c.memo.towCousin)) c.heat(p.id, 1, 'the armored car');
        }
        const il = c.memo.inLaw;
        if (c.flag('armoredSite') === 'depot' && il && !c.isAway(il)) c.memo.inLawCut = 15000;
      },
    },

    river: {
      engine: 'choose', time: '4:40 A.M.', place: 'The end of Pier 12', title: 'The River', kicker: 'EVERYBODY SAYS A NUMBER',
      text: (c) => [
        `${money(c.memo.pot ?? 0)} in a gym bag on the hood of a car at the end of Pier 12, with the river black and quiet below. Nonna’s rule, older than anybody here: everybody writes down how much they’re taking.`,
        'If the numbers add up to the bag or less, everybody gets what they wrote and the rest goes to Nonna’s Bag. If they add up to more, the bag goes in the river. Talk first. Then write.',
      ],
      who: (c) => c.free.map((p) => p.id),
      amount: (c) => ({ min: 0, max: c.memo.pot ?? 0, step: 5000, label: 'You take', blurb: `${money(c.memo.pot ?? 0)} on the hood. ${c.free.length} of you. An even split is about ${money(round5k((c.memo.pot ?? 0) / Math.max(1, c.free.length)))}.` }),
      reveal: 'public',
      bot(c, p, opts) {
        const pot = c.memo.pot ?? 0;
        const even = pot / Math.max(1, c.free.length);
        const mult = { loyal: 0.8, nervous: 0.7, wild: 1.25, greedy: 1.15, snake: 1.35 }[p.style] ?? 1;
        const n = Math.min(pot, round5k(even * mult * (0.9 + c.rng() * 0.2)));
        return { option: 'amount', amount: n };
      },
      resolve(c, { choices }) {
        const pot = c.memo.pot ?? 0;
        const sum = Object.values(choices).reduce((a, ch) => a + (ch.amount ?? 0), 0);
        if (sum > pot) {
          c.memo.river = true;
          c.line(`The numbers came to ${money(sum)}. The bag had ${money(pot)}. Nonna’s rule is Nonna’s rule: somebody picked up the gym bag and threw it in the river. It floated for a while, which was worse.`);
          const greedy = Object.entries(choices).sort((a, b) => (b[1].amount ?? 0) - (a[1].amount ?? 0))[0];
          if (greedy) for (const [pid] of Object.entries(choices)) if (pid !== greedy[0]) c.g.bond(pid, greedy[0], 'river');
          return;
        }
        for (const [pid, ch] of Object.entries(choices)) {
          let n = ch.amount ?? 0;
          if (pid === c.memo.inLaw && c.memo.inLawCut) {
            const cut = Math.min(n, c.memo.inLawCut);
            n -= cut;
            c.note(pid, `Your brother-in-law took ${money(cut)} of your share, as agreed.`, 'the depot');
          }
          if (n) c.give(pid, n, 'the River');
        }
        const rest = pot - sum;
        if (rest > 0) c.bagAdd(rest);
        c.line(`The numbers came to ${money(sum)} of ${money(pot)}. Everybody takes what they wrote.${rest > 0 ? ` The other ${money(rest)} goes straight in Nonna’s Bag.` : ' There’s nothing left over for the Bag.'}`);
      },
    },

    'ferry-street': getaway({
      time: '4:55 A.M.', place: 'Ferry Street, with the sun coming up',
      text: (c) => [`${c.freeByJob('driver')?.name ?? 'Somebody'} takes Ferry Street at seventy. ${c.rng.pick(['The bakeries are opening.', 'A garbage truck is backing out of an alley.', 'There is a man walking a very small dog in the exact middle of the road.'])}`],
      target: (c) => site(c).getaway,
      who: (c) => c.free.map((p) => p.id).filter((id) => !(c.flag('armoredSite') === 'bridge' && id === c.memo.towCousin)),
    }),

    count: counting({ time: '5:40 A.M.', text: (c) => [
      'Nonna is already up when you get back, in her dressing gown, making eggs for everybody without asking. The Bag is on the table, where it always is.',
      'Everybody decides, privately, how much of what they’re holding goes in. The Bag’s total is public. Who put in what is not.',
    ] }),
  },
};
