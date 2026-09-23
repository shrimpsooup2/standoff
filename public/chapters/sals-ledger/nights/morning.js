// The morning after: the paper, Sal on the phone, and whatever has changed.

import { money, morningDay, milestoneNow, round5k } from '../common.js';
import { salCall } from '../calls.js';
import { handLimit } from '../../../engine/cards.js';
import { dayOptions, runDay, botDay } from '../bios.js';

export default {
  id: 'morning', title: 'The Morning', interlude: true, kicker: 'THE MORNING',
  day: (c) => morningDay(c),
  beats: ['news', 'day'],
  open(c) {
    // heat no longer cools by itself: staying in for the day is how it cools
    // everybody draws a card; a full hand sells the new one to the Fence
    for (const p of c.players) {
      const [card] = c.g.draw(p.id, 1);
      if (card && p.cards.length > handLimit(p)) {
        c.g.takeCard(p.id, card.uid);
        c.g.discardCard(card);
        p.cash += 10000;
        c.note(p.id, 'Your hand was full, so the card you drew went straight to the Fence. $10k.', 'the Fence');
      }
    }
    // Morty wants installments
    const next = c.g.chapter.nextAct?.(c);
    const act = c.s.scene?.act ?? 1;
    if (next && next > act) {
      const want = milestoneNow(c);
      c.memo.milestone = { want, act };
      if (c.bag.total < want) {
        c.memo.missed = want - c.bag.total;
      }
    }
  },
  defs: {
    day: {
      engine: 'choose', time: '9:00 A.M.', place: 'The neighbourhood', title: 'The Day', kicker: 'HOW DO YOU SPEND IT?',
      text: (c) => [
        c.rng.pick([
          'Nobody robs anything in daylight. The day is long, the neighbourhood is awake, and everybody at this table has somewhere they could be.',
          'Nonna clears the cups and sends everybody out. “Go. Be somewhere. Be back by dark.”',
          'It’s a grey morning. The bakeries are open, the precinct is open, and so is Dolores’s. Everybody has until dark.',
        ]),
        'Everybody chooses, privately, how to spend the day. Everybody will know where you were. Nobody will know what you got out of it.',
      ],
      who: (c) => c.free.map((p) => p.id),
      options: (c, pid) => dayOptions(c, c.p(pid)),
      bot(c, p, opts) {
        const id = botDay(c, p, opts);
        return id ? { option: id } : null;
      },
      resolve(c, { choices }) { runDay(c, choices); },
    },
    news: {
      engine: 'story', place: 'Nonna’s kitchen', title: (c) => 'The Morning', kicker: 'THE HARBOR COURIER',
      time: '7:15 A.M.',
      run(c) {
        if (c.memo.missed) c.caseFile(1, `Morty stopped returning calls — the Bag was ${money(c.memo.missed)} short of what he wanted by now`);
        else if (c.memo.milestone) c.line(`Morty got his installment: ${money(c.memo.milestone.want)} by the end of the act. He called Nonna to say thank you. She didn’t pick up.`);
      },
      text(c) {
        // every story the paper has run since the last time anybody read it
        const seen = c.flag('courierSeen') ?? -1;
        const fresh = c.s.story.map((e, i) => ({ ...e, i })).filter((e) => e.courier && e.i > seen);
        c.set('courierSeen', c.s.story.length - 1);
        const out = [];
        if (fresh.length) {
          const [lead, ...rest] = fresh;
          if (c.beat) c.beat.headline = lead.courier;
          out.push(lead.text);
          for (const more of rest) out.push(`Also on page two — ${more.courier.toLowerCase().replace(/^./, (x) => x.toUpperCase())}. ${more.text}`);
        } else {
          out.push('Nothing in the paper about you this morning. Nonna reads it twice to make sure.');
        }
        out.push(`At seven fifteen the kitchen phone rings. It’s Sal, from county. ${salCall(c)}`);
        if (c.families) out.push(`Across the river, at the same hour, Vinnie Castellano is reading the same paper at the bar of his social club, and smiling at ${fresh.length > 1 ? 'page two' : 'page one'}. The Envelope has ${money(c.s.envelope?.total ?? 0)} in it.`);
        const inside = c.players.filter((p) => p.jailUntil != null && p.jailUntil >= c.s.week.n);
        if (inside.length) out.push(`${inside.map((p) => p.name).join(' and ')} ${inside.length === 1 ? 'is' : 'are'} in county today, and will miss tonight.`);
        const low = c.players.filter((p) => p.lowUntil != null && p.lowUntil >= c.s.week.n + 1);
        if (low.length) out.push(`${low.map((p) => p.name).join(' and ')} ${low.length === 1 ? 'is' : 'are'} lying low tonight.`);
        out.push(`The Bag: ${money(c.bag.total)} of ${money(c.bag.target)}. The Case File: ${c.caseFileValue}. Everybody draws a card.`);
        return out;
      },
    },
  },
};

/** The midweek twist: something happens that nobody planned. */
export const twist = {
  id: 'twist', title: 'Midweek', interlude: true, kicker: 'MIDWEEK',
  day: (c) => morningDay(c, '11:00 A.M.'),
  beats: [{ oneOf: [
    'fee',
    { beat: 'windfall', weight: 0.8 },
    { beat: 'page', weight: 1 },
    { beat: 'gary-gone', when: (c) => !c.flag('gary') },
    { beat: 'truce', when: (c) => c.flag('war') && !c.flag('truce') && !c.families, weight: 1.5 },
  ] }],
  defs: {
    fee: {
      engine: 'story', time: '11:00 A.M.', place: 'Morty Klein’s office', title: 'Morty Gets Nervous', kicker: 'MIDWEEK',
      text: () => ['Morty Klein calls a meeting in his office, which smells of cigars he claims not to smoke. He has read the file. He would like to discuss his fee.'],
      run(c) {
        const add = round5k(c.bag.target * 0.15);
        c.bag.target += add;
        c.line(`Morty’s fee just went up ${money(add)}. The Bag now needs ${money(c.bag.target)}. “It’s a very complicated case,” he says, lighting a cigar.`);
      },
    },
    windfall: {
      engine: 'story', time: '11:00 A.M.', place: 'Nonna’s front door', title: 'An Old Debt', kicker: 'MIDWEEK',
      text: () => ['A man nobody recognises rings Nonna’s doorbell, hands her an envelope, says “for 1989,” and leaves before anybody can ask what happened in 1989.'],
      run(c) {
        const n = c.bagAdd(c.scale(40000));
        c.line(`The envelope has ${money(n)} in it. Nonna puts it straight in the Bag. “He was always good for it,” she says, about nobody in particular.`);
      },
    },
    page: {
      engine: 'story', time: '11:00 A.M.', place: 'The Harbor Courier, page six', title: 'Page Six', kicker: 'MIDWEEK',
      text: () => ['The Courier has printed a photograph of one handwritten page. It’s Sal’s handwriting. Somebody sent it to them.'],
      run(c) {
        const who = c.rng.pick(c.players);
        c.line(`It’s page 212. Halfway down: “${who.name} — $4,000 — for Christmas.” Everybody in the neighbourhood read it over breakfast.`);
        c.caseFile(1, 'a page of the ledger is in the newspaper');
        c.heat(who.id, 1, 'their name in the paper');
      },
    },
    'gary-gone': {
      engine: 'story', time: '11:00 A.M.', place: 'The Route 9 Motor Inn', title: 'Gary Is Gone', kicker: 'MIDWEEK',
      text: () => ['Gary Feld, the accountant, the only other person alive who has read Sal’s ledger, has checked out of the Route 9 Motor Inn. He left a forwarding address. It is the District Attorney’s office.'],
      run(c) {
        c.set('gary', 'prout');
        c.caseFile(1, 'Gary Feld is talking to Prout');
      },
    },
    truce: {
      engine: 'vote', time: '11:00 A.M.', place: 'The back room at Dolores’s', title: 'The Castellanos Want to Talk', kicker: 'A VOTE',
      text: (c) => [`Vinnie Castellano is sitting in your booth at Dolores’s with his hands folded. He wants to end it. The price of peace is ${money(c.scale(50000))} out of the Bag, and the understanding that it never happened.`],
      options: (c) => [
        { id: 'accept', label: 'Take the truce', blurb: `${money(c.scale(50000))} out of the Bag. No more Castellano trouble this week.`, risk: 0.2, reward: 0.3 },
        { id: 'refuse', label: 'Tell him where to go', blurb: 'The war stays on. Vinnie takes it personally, which is how he takes everything.', risk: 0.7, reward: 0.5 },
      ],
      resolve(c, { choice }) {
        c.set('truce', choice);
        if (choice === 'accept') {
          const n = c.bagTake(c.scale(50000));
          c.set('war', false);
          c.line(`${money(n)} changes hands under the table. Vinnie shakes everybody’s hand, twice. It’s over. Probably.`);
        } else {
          c.line('Vinnie stands up, buttons his jacket, and leaves a very large tip for Dolores. Nobody finds that reassuring.');
          c.caseFile(1, 'the Castellanos are feeding Prout now');
        }
      },
    },
  },
};
