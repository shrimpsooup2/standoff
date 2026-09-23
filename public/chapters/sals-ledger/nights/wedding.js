// The Castellano Wedding: the other family's daughter is getting married, and
// everybody who matters is invited, including the people who shouldn't be.

import { counting, money, round5k, nightDay, nightKicker } from '../common.js';

const BRIDES = ['Gina', 'Angela', 'Carla', 'Francesca'];
const HALLS = ['the Villa Rosa in Bay Ridge', 'the Knights of Columbus hall on 86th Street', 'the Marina del Rey, under a chandelier the size of a Buick'];

export default {
  id: 'wedding', title: 'The Castellano Wedding', day: nightDay, kicker: nightKicker,
  open(c) {
    c.memo.bride = c.rng.pick(BRIDES);
    c.memo.hall = c.rng.pick(HALLS);
  },
  beats: [
    'envelope',
    'table-nine',
    { maybe: 'wedding', chance: 0.4, where: (c) => `${c.memo.hall ?? 'the hall'}, between courses` },
    'offer',
    'toast-pick',
    'toast',
    'count',
  ],
  close(c) {
    c.remember(
      `${c.memo.bride} Castellano and Dominic Ferraro were married last night at ${c.memo.hall}. ${c.memo.toastWent === 'well' ? 'Guests described a toast from a member of the Benedetto party as “unexpectedly moving.”' : c.memo.toastWent === 'badly' ? 'A toast from a member of the Benedetto party was described by guests as “the end of something.”' : ''} The couple will honeymoon in Aruba.`,
      { courier: `CASTELLANO–FERRARO NUPTIALS` },
    );
  },
  defs: {
    envelope: {
      engine: 'choose', time: '7:30 P.M.', place: (c) => `The receiving line at ${c.memo.hall}`, title: 'The Envelope', kicker: (c) => (c.families ? 'THE RECEIVING LINE' : 'WHAT DO YOU GIVE?'),
      text: (c) => (c.families ? [
        `${c.memo.bride} Castellano is getting married, and Vinnie has invited the Benedettos, because not inviting them would be a statement and he would rather make a different one. There is a satin box by the door for envelopes, an aunt next to it writing down names, and a receiving line of Castellanos shaking every Benedetto hand that comes through the door.`,
        `Benedettos: put something in an envelope, out of your own pocket. It goes to the bride’s family — the Castellanos at this table. Castellanos: you’re in the receiving line. Shake hands. Or get a good look at somebody’s wallet while you do.`,
      ] : [
        `${c.memo.bride} Castellano is getting married, and Nonna has decided the Benedettos will be there, because not going would be a statement and she would rather make a different one. There is a satin box by the door for envelopes, and an aunt next to it writing down names.`,
        `Each of you puts something in an envelope, out of your own pocket. The box will be counted, and the total whispered to Vinnie before the first dance. Who gave what, nobody at your table will know.`,
      ]),
      who: (c) => c.free.map((p) => p.id),
      options: (c, pid) => {
        if (c.familyOf(pid) === 'c') {
          const guests = c.family('b').filter((q) => !c.isAway(q.id)).map((q) => q.id);
          return [
            { id: 'greet', label: 'Shake hands and smile', blurb: 'It’s your cousin’s wedding. Be nice.', honest: true },
            { id: 'size', label: 'Size somebody up', blurb: 'A long handshake and a good look. You’ll know exactly what they’re carrying.', target: 'other', targets: guests },
            { id: 'pocket', label: 'Lift a wallet', blurb: 'Half the time you come away $10k richer. The other half, they feel it.', target: 'other', targets: guests, greedy: true },
          ];
        }
        return [{
          id: 'gift', label: 'In the envelope',
          blurb: `You have ${money(c.p(pid).cash)}. ${c.families ? 'It goes to the Castellanos at this table.' : `Nonna says a respectable table gives about ${money(c.scale(40000))} between you.`}`,
          amount: { min: 0, max: Math.min(30000, c.p(pid).cash), step: 5000 },
        }];
      },
      bot(c, p, opts) {
        if (c.familyOf(p.id) === 'c') {
          const guests = opts.find((o) => o.id === 'size')?.targets ?? [];
          if (!guests.length) return { option: 'greet' };
          const r = c.rng();
          if ((p.style === 'snake' || p.style === 'greedy') && r < 0.5) return { option: 'pocket', target: c.rng.pick(guests) };
          if (r < 0.35) return { option: 'size', target: c.rng.pick(guests) };
          return { option: 'greet' };
        }
        const o = opts[0];
        const frac = ({ loyal: 0.6, nervous: 0.5, wild: 0.4, greedy: 0.15, snake: 0.1 }[p.style] ?? 0.3);
        return { option: 'gift', amount: Math.min(o.amount.max, round5k(o.amount.max * frac)) };
      },
      fallback: (c, pid) => (c.familyOf(pid) === 'c' ? { option: 'greet' } : { option: 'gift', amount: 0 }),
      resolve(c, { choices }) {
        let total = 0;
        const gifts = [];
        for (const [pid, ch] of Object.entries(choices)) {
          if (ch.option !== 'gift') continue;
          const n = c.charge(pid, ch.amount ?? 0);
          total += n;
          gifts.push({ pid, n });
          c.fact(pid, 'gift', `Did ${c.name(pid)} give less than $10k at the wedding?`, n < 10000);
        }
        c.memo.gift = total;
        const givers = gifts.length;
        const want = c.families ? round5k(10000 * givers) : c.scale(40000);
        if (c.families) {
          const hosts = c.family('c').map((p) => p.id);
          const each = hosts.length ? round5k(total / hosts.length) : 0;
          for (const id of hosts) if (each) c.give(id, each, 'wedding gifts');
          if (each) c.line(`The gifts came to ${money(total)}, split between the bride’s family: ${money(each)} each for ${c.list(hosts.map((id) => c.name(id)))}.`);
        }
        if (total >= want * 1.5) {
          c.set('castellanoRespect', 2);
          c.line(`The aunt counted ${money(total)} and went pale, then pink. By the first dance Vinnie knew. He came over and kissed Nonna’s hand.`);
        } else if (total >= want) {
          c.set('castellanoRespect', 1);
          c.line(`${money(total)}. Respectable. The aunt nodded and wrote it down in a little book that has been in the family since 1961.`);
        } else {
          c.set('castellanoRespect', 0);
          c.line(`${money(total)}. The aunt counted it twice to be sure, and then made a face that will be discussed at Christmas.`);
          c.caseFile(1, 'the Castellanos felt insulted, and told somebody who told Prout');
        }
        for (const [pid, ch] of Object.entries(choices)) {
          if (ch.option === 'size' && ch.target) {
            const t = c.p(ch.target);
            c.note(pid, `A long handshake with ${t.name}. They’re carrying ${money(t.cash)}, and ${t.cards.length} card${t.cards.length === 1 ? '' : 's'}.`, 'the receiving line');
          } else if (ch.option === 'pocket' && ch.target) {
            const t = c.p(ch.target);
            if (c.rng.chance(0.5)) {
              const n = c.charge(t.id, 10000);
              c.give(pid, n, 'a wallet at the wedding');
              c.note(t.id, `Somewhere between the door and table nine, ${money(n)} left your jacket. The receiving line was very friendly.`, 'the wedding');
              c.fact(pid, 'pocket', `Did ${c.name(pid)} lift a wallet at the wedding?`, true);
            } else {
              c.line(`${t.name} caught ${c.name(pid)}’s hand in their jacket in the receiving line. Everybody saw. Nobody said anything, very loudly.`);
              c.heat(pid, 1, 'caught in the receiving line');
              c.grudge(t.id, pid, 'tried to lift your wallet at the wedding');
            }
          }
        }
        const numbers = c.free.find((p) => p.job === 'numbers' && c.familyOf(p.id) !== 'c');
        if (numbers && gifts.length) c.note(numbers.id, `The envelopes, as only you saw them: ${gifts.map((g) => `${c.name(g.pid)} ${money(g.n)}`).join(', ')}.`, 'the ledger in your head');
      },
    },

    'table-nine': {
      engine: 'sitdown', time: '8:45 P.M.', place: (c) => `Table nine at ${c.memo.hall}`, title: 'Table Nine', kicker: 'EVERYTHING’S NEGOTIABLE',
      menu: () => ['secret', 'card'],
      text: (c) => [
        `Table nine is next to the kitchen doors and has a view of a pillar. ${c.rng.pick(['The Castellano cousins are at table eight and have not stopped looking over.', 'Ray Mancuso is at table eleven, eating everybody’s bread rolls.', 'Father Dominic is at the next table, drinking with real commitment.'])} ${c.rng.pick(['The band is doing Sinatra badly and Dean Martin worse.', 'There is an ice sculpture of a swan. It is melting towards the Benedettos.', 'The chicken is excellent. Nobody wants to admit it.'])}`,
        'A long dinner and a lot of wine. Make deals — IOUs, oaths, trades. A Castellano aunt at the bar will sell anybody’s secret for $20k, and the bartender has things under the counter.',
      ],
      resolve() {},
    },

    offer: {
      engine: 'choose', time: '10:30 P.M.', place: 'The cloakroom', title: 'Vinnie’s Offer', kicker: 'ALONE WITH VINNIE',
      text: (c) => [
        'One at a time, during the tarantella, Vinnie Castellano takes each of you into the cloakroom among the fur coats. He is very friendly. He has an envelope.',
        `“${money(c.scale(30000))},” he says, “now. And one day this week I ask you for a small thing, and you do it, and we never talk about it.” Nobody sees what anybody else says.`,
      ],
      who: (c) => c.free.filter((p) => c.familyOf(p.id) !== 'c').map((p) => p.id),
      options: (c) => [
        { id: 'take', label: 'Take Vinnie’s envelope', blurb: `${money(c.scale(30000))} now. Vinnie will ask for something before Monday, and it will cost Sal.`, greedy: true },
        { id: 'refuse', label: 'Politely, no', blurb: '“Congratulations on your daughter.” Vinnie laughs. He respects it. He doesn’t forget it.', honest: true },
        { id: 'nonna', label: 'Tell Nonna', blurb: 'Nonna finds out who took it. If nobody did, you look paranoid. If somebody did, they’ll know you told.' },
      ],
      fallback: () => ({ option: 'refuse' }),
      bot(c, p) {
        const r = c.rng();
        if (p.secret?.id === 'rat' || p.style === 'snake') return r < 0.6 ? { option: 'take' } : { option: 'nonna' };
        if (p.style === 'greedy') return r < 0.5 ? { option: 'take' } : { option: 'refuse' };
        if (p.style === 'loyal') return r < 0.35 ? { option: 'nonna' } : { option: 'refuse' };
        return r < 0.2 ? { option: 'take' } : r < 0.35 ? { option: 'nonna' } : { option: 'refuse' };
      },
      resolve(c, { choices }) {
        const takers = Object.entries(choices).filter(([, ch]) => ch.option === 'take').map(([pid]) => pid);
        const tellers = Object.entries(choices).filter(([, ch]) => ch.option === 'nonna').map(([pid]) => pid);
        for (const pid of takers) {
          c.give(pid, c.scale(30000), 'Vinnie Castellano');
          c.set(`vinnie:${pid}`, true);
          c.fact(pid, 'vinnie', `Did ${c.name(pid)} take Vinnie’s envelope?`, true);
          c.caseFile(1, 'Vinnie called in a small favour', true);
        }
        for (const [pid, ch] of Object.entries(choices)) if (ch.option !== 'take') c.fact(pid, 'vinnie', `Did ${c.name(pid)} take Vinnie’s envelope?`, false);
        if (!tellers.length) {
          c.line(takers.length ? 'The tarantella ended. Everybody came back from the cloakroom looking exactly the same, which is how you know somebody didn’t.' : 'Everybody came back from the cloakroom. Vinnie looked a little disappointed, and a little impressed.');
          return;
        }
        if (!takers.length) {
          c.line(`${c.list(tellers.map((id) => c.name(id)))} went to Nonna. Nonna asked around. Nobody took the envelope. Nonna looked at ${tellers.length === 1 ? c.name(tellers[0]) : 'them'} the way she looks at people who waste her time at weddings.`);
          return;
        }
        c.line(`${c.list(tellers.map((id) => c.name(id)))} told Nonna. Nonna didn’t even have to ask: ${c.list(takers.map((id) => c.name(id)))} took Vinnie’s money.`);
        for (const pid of takers) {
          c.stamp(pid, 'RAT');
          for (const t of tellers) { c.grudge(pid, t, 'told Nonna about the envelope'); c.g.bond(t, pid, 'told-on'); }
        }
        for (const t of tellers) c.card(t, 'nonnas-blessing');
        c.line(`Nonna gave ${tellers.length === 1 ? 'the one who told her' : 'the ones who told her'} a blessing. She gave the others a look.`);
      },
    },

    'toast-pick': {
      engine: 'vote', time: '11:15 P.M.', place: 'The dance floor', title: 'Somebody Has to Make a Toast', kicker: 'A VOTE',
      text: (c) => [
        `The band stops. Vinnie taps a glass. “And now,” he says, smiling at your table, “a few words from our friends the Benedettos.” There is a microphone. ${c.memo.bride} is looking right at you.`,
        'Pick who gives the toast. Everybody sees who picked who.',
      ],
      // with every Benedetto inside, nobody is asked
      when: (c) => c.free.some((p) => c.familyOf(p.id) !== 'c'),
      candidates: (c) => c.free.filter((p) => c.familyOf(p.id) !== 'c').map((p) => p.id),
      noSelf: false,
      resolve(c, { choice }) {
        c.memo.toaster = choice;
        c.line(`${c.name(choice)} stands up. Somebody hands them a glass of something. Their hands are steady, mostly.`);
      },
    },

    toast: {
      engine: 'roll', time: '11:17 P.M.', place: 'The microphone', title: 'The Toast', kicker: 'THE DICE',
      when: (c) => !!c.memo.toaster,
      text: (c) => [`${c.name(c.memo.toaster)} has the microphone and three hundred Castellanos looking at them. Somewhere a baby is crying. Somewhere else, Nonna has closed her eyes.`],
      target: (c) => 8 - (c.flag('castellanoRespect') ?? 0) + (c.flag('war') ? 1 : 0),
      roller: (c) => c.memo.toaster,
      who: (c) => [c.memo.toaster],
      label: (c) => `${c.name(c.memo.toaster)} clears their throat.`,
      stakes: 'Make it well and the Castellanos are charmed. Make it badly and it becomes a war.',
      resolve(c, r) {
        const t = c.memo.toaster;
        if (r.success) {
          c.memo.toastWent = 'well';
          const gift = c.scale(20000);
          c.give(t, gift, 'the toast');
          c.set('castellanoRespect', (c.flag('castellanoRespect') ?? 0) + 1);
          c.line(c.rng.pick([
            `${c.name(t)} told a story about ${c.memo.bride} at her First Communion that nobody could verify and everybody believed. Vinnie cried. He sent over ${money(gift)} “for the kind words.”`,
            `${c.name(t)} said four sentences about family and sat down. There was a silence, then a roar. Vinnie shook their hand with both of his and left ${money(gift)} in it.`,
          ]));
          c.caseFile(-1, 'the Castellanos have stopped talking to Prout, for now');
          return;
        }
        c.memo.toastWent = 'badly';
        c.set('war', true);
        c.line(c.rng.pick([
          `${c.name(t)} began with a joke about the groom’s first wife. The groom did not have a first wife until that moment. It’s a war now.`,
          `${c.name(t)} raised a glass “to the Castellanos, who we’ll always keep an eye on.” It was supposed to be warm. It wasn’t. It’s a war now.`,
        ]));
        c.heat(t, 1, 'the toast');
      },
    },

    count: counting({ time: '1:45 A.M.', text: (c) => [
      'Back at Nonna’s, still in the good clothes. Somebody has a piece of wedding cake in a napkin. Nonna is taking her earrings off at the kitchen table next to the Bag.',
      'Everybody decides, privately, how much of what they’re holding goes in. The Bag’s total is public. Who put in what is not.',
    ] }),
  },
};

export { round5k };
