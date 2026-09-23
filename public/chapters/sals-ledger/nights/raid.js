// The Raid: five in the morning, the Feds come for everybody on both sides
// of the river at once. There is time to hide your money — and one place to
// hide it is with somebody from the other family.

import { counting, money, round5k, nightDay, nightKicker, envelopeAdd } from '../common.js';

const PLACES = {
  mattress: { label: 'Under the mattress', blurb: 'The first place anybody looks. Half the time they look.' },
  tomatoes: { label: 'In Sal’s tomato beds', blurb: 'Safe. A tenth of it will be too wet to spend. The tomatoes will know.' },
  pot: { label: 'In the family pot', blurb: 'All of it into the Bag or the Envelope. Safe from the Feds, and gone from you.' },
  across: { label: 'With somebody across the river', blurb: 'Hand it to somebody from the other family. The Feds would never look there. Tomorrow, they decide whether you get it back.' },
};

export default {
  id: 'raid', title: 'The Raid', act: 2, day: nightDay, kicker: (c) => `${nightKicker(c)} · BOTH SIDES OF THE RIVER`,
  when: (c) => !!c.families,
  beats: ['five-am', 'hide-it', 'the-van', { maybe: 'street', chance: 0.25 }, 'give-back', 'count'],
  close(c) {
    c.remember(
      `Federal agents raided more than thirty addresses on both sides of the river before dawn on ${c.rng.pick(['Friday', 'what one neighbour called “a perfectly nice morning”'])}. ${c.memo.vanned ? `One local person was taken away in a van, wearing a dressing gown.` : 'Nobody was taken away.'} Agents were seen carrying out “a lot of mattresses.”`,
      { courier: 'FEDS RAID BOTH SIDES OF THE RIVER' },
    );
  },
  defs: {
    'five-am': {
      engine: 'story', time: '4:58 A.M.', place: 'Mulberry Avenue and Front Street, both at once', title: 'Five in the Morning', kicker: 'THE RAID',
      text: (c) => [
        `At two minutes to five, Ray Mancuso rings Nonna’s kitchen and Vinnie’s social club, one after the other, and says the same thing to both: “Feds. Everybody. Ten minutes.” ${c.rng.pick(['He sounds like he’s running.', 'There are sirens behind him already.', 'He hangs up before anybody can thank him, which nobody was going to.'])}`,
        'For ten minutes there are no Benedettos and no Castellanos — just a neighbourhood with a lot of cash in it and nowhere to put it. Whatever you’re holding has to go somewhere.',
      ],
    },
    'hide-it': {
      engine: 'choose', time: '5:01 A.M.', place: 'Wherever you were sleeping', title: 'Ten Minutes', kicker: 'WHERE DOES IT GO?',
      text: () => [
        'Under the mattress, in the tomato beds, into your family’s pot, or — nobody would think to look — handed across the river to somebody from the other side, who could simply keep it.',
        'Nobody sees what anybody does until it’s over.',
      ],
      who: (c) => c.free.map((p) => p.id),
      options: (c, pid) => {
        const mine = c.familyOf(pid);
        const across = c.players.filter((q) => c.familyOf(q.id) && c.familyOf(q.id) !== mine && !c.isAway(q.id)).map((q) => q.id);
        return [
          { id: 'mattress', ...PLACES.mattress },
          { id: 'tomatoes', ...PLACES.tomatoes, honest: true },
          { id: 'pot', ...PLACES.pot, label: mine === 'c' ? 'In Vinnie’s Envelope' : 'In the Bag', honest: true },
          { id: 'across', ...PLACES.across, target: 'other', targets: across, disabled: across.length ? null : 'There’s nobody across the river to hand it to.' },
        ];
      },
      bot(c, p) {
        const across = c.players.filter((q) => c.familyOf(q.id) && c.familyOf(q.id) !== c.familyOf(p.id) && !c.isAway(q.id));
        const cousin = p.secret?.id === 'cousins' ? across.find((q) => q.id === p.secret.partner) : null;
        if (cousin && c.rng.chance(0.7)) return { option: 'across', target: cousin.id };
        const r = c.rng();
        if (p.style === 'wild' && across.length && r < 0.4) return { option: 'across', target: c.rng.pick(across).id };
        if (p.style === 'loyal') return { option: r < 0.5 ? 'pot' : 'tomatoes' };
        if (p.style === 'nervous') return { option: 'tomatoes' };
        return { option: r < 0.5 ? 'mattress' : 'tomatoes' };
      },
      resolve(c, { choices }) {
        c.memo.held = [];
        let found = 0;
        for (const [pid, ch] of Object.entries(choices)) {
          const p = c.p(pid);
          const cash = p.cash;
          if (!cash) continue;
          if (ch.option === 'mattress') {
            if (c.rng.chance(0.5)) { const n = c.charge(pid, round5k(cash * 0.6)); found += n; c.note(pid, `They turned your mattress over. ${money(n)} is in an evidence bag now.`, 'the raid'); }
            else c.note(pid, 'They looked everywhere except under the mattress. Nobody ever believes that story. It happened.', 'the raid');
          } else if (ch.option === 'tomatoes') {
            c.charge(pid, round5k(cash * 0.1));
          } else if (ch.option === 'pot') {
            const n = c.charge(pid, cash);
            if (c.familyOf(pid) === 'c') envelopeAdd(c, n, pid); else c.bagAdd(n, pid);
            p.stats.given += n;
          } else if (ch.option === 'across' && ch.target) {
            const n = c.charge(pid, cash);
            c.give(ch.target, n, 'held for the other side');
            c.memo.held.push({ from: pid, to: ch.target, n });
            c.note(ch.target, `At five in the morning ${p.name} pushed ${money(n)} into your hands and ran. Tomorrow you decide whether they get it back.`, 'the raid');
            c.g.bond(pid, ch.target, 'trusted');
          }
        }
        c.line(found ? `The Feds carried ${money(found)} out of the neighbourhood in evidence bags, most of it from under mattresses.` : 'The Feds found a great deal of furniture and not much money.');
        if (c.memo.held.length) c.line(`${c.memo.held.length === 1 ? 'Somebody' : `${c.memo.held.length} people`} handed their money across the river to hold. Those people know who they are.`);
      },
    },
    'the-van': {
      engine: 'vote', time: '6:20 A.M.', place: 'The corner of Mulberry and Front', title: 'The Van', kicker: 'WHO DO THEY TAKE?',
      text: () => [
        'Two vans at the corner where the two neighbourhoods meet. The agent in charge has a list and a headache. He wants one name for the second van, and he says whoever the neighbourhood gives him, he’ll take, and leave the rest alone.',
        'Everybody votes, from both families. Everybody sees who voted for whom.',
      ],
      candidates: (c) => c.free.map((p) => p.id),
      bot(c, p, options) {
        const others = options.filter((o) => o.id !== p.id && c.familyOf(o.id) !== c.familyOf(p.id));
        const enemy = Object.entries(p.grudges).find(([id, n]) => n > 0 && options.some((o) => o.id === id))?.[0];
        if (enemy && c.rng.chance(0.6)) return enemy;
        const cousin = p.secret?.id === 'cousins' ? p.secret.partner : null;
        const pool = others.filter((o) => o.id !== cousin);
        return (pool.length ? c.rng.pick(pool) : c.rng.pick(options.filter((o) => o.id !== p.id)))?.id ?? null;
      },
      resolve(c, { choice, votes }) {
        c.memo.vanned = choice;
        c.line(`${c.name(choice)} goes in the second van, in a dressing gown.`);
        c.heat(choice, 2, 'the neighbourhood gave you to the Feds');
        for (const [pid, v] of Object.entries(votes)) if (v === choice && pid !== choice) c.g.bond(pid, choice, 'gave-up');
        const sameSide = Object.entries(votes).filter(([pid, v]) => v === choice && pid !== choice && c.familyOf(pid) === c.familyOf(choice)).map(([pid]) => pid);
        for (const pid of sameSide) c.grudge(choice, pid, 'your own family gave you to the Feds');
        if (sameSide.length) c.line(`${c.list(sameSide.map((id) => c.name(id)))} voted for one of their own. That will be remembered.`);
      },
    },
    'give-back': {
      engine: 'choose', time: '9:00 A.M.', place: 'Dolores’s, neutral ground', title: 'Coffee at Dolores’s', kicker: 'DO THEY GET IT BACK?',
      when: (c) => (c.memo.held ?? []).some((h) => !c.isAway(h.to)),
      text: () => [
        'By nine the vans have gone and everybody is at Dolores’s, on neutral ground, pretending to read the paper. Some of you are holding money that isn’t yours.',
        'Give it back, keep it, or give back most of it and call the rest a fee. Everybody finds out what you did.',
      ],
      who: (c) => [...new Set((c.memo.held ?? []).map((h) => h.to))].filter((id) => !c.isAway(id)),
      options: (c, pid) => {
        const held = (c.memo.held ?? []).filter((h) => h.to === pid);
        const total = held.reduce((a, h) => a + h.n, 0);
        return [
          { id: 'return', label: 'Give it all back', blurb: `${money(total)} back to ${c.list(held.map((h) => c.name(h.from)))}. They’ll remember that too.`, honest: true },
          { id: 'fee', label: 'Keep a fee', blurb: `Give back ${money(round5k(total * 0.75))}, keep ${money(total - round5k(total * 0.75))} for your trouble.` },
          { id: 'keep', label: 'Keep all of it', blurb: `${money(total)}, and a grudge from ${c.list(held.map((h) => c.name(h.from)))}.`, greedy: true },
        ];
      },
      reveal: 'public',
      bot(c, p) {
        const from = (c.memo.held ?? []).filter((h) => h.to === p.id).map((h) => h.from);
        if (from.some((id) => p.secret?.partner === id)) return { option: 'return' };
        if (p.style === 'snake') return { option: c.rng.chance(0.6) ? 'keep' : 'fee' };
        if (p.style === 'greedy') return { option: c.rng.chance(0.5) ? 'fee' : 'return' };
        return { option: c.rng.chance(0.8) ? 'return' : 'fee' };
      },
      fallback: () => ({ option: 'return' }),
      resolve(c, { choices }) {
        for (const [pid, ch] of Object.entries(choices)) {
          for (const h of (c.memo.held ?? []).filter((x) => x.to === pid)) {
            const back = ch.option === 'return' ? h.n : ch.option === 'fee' ? round5k(h.n * 0.75) : 0;
            const paid = c.charge(pid, back);
            c.give(h.from, paid, 'money held across the river');
            if (ch.option === 'return') { c.line(`${c.name(pid)} gave ${c.name(h.from)} back every dollar.`); c.g.bond(pid, h.from, 'kept-faith'); }
            else if (ch.option === 'fee') c.line(`${c.name(pid)} gave ${c.name(h.from)} back ${money(paid)} and kept a fee.`);
            else { c.line(`${c.name(pid)} kept all of ${c.name(h.from)}’s money.`); c.grudge(h.from, pid, 'kept your money after the raid'); c.g.bond(pid, h.from, 'kept'); }
          }
        }
      },
    },
    count: counting({ time: '10:30 A.M.', place: 'Everybody’s kitchen table', text: (c) => [
      'The raid is over. On one side of the river Nonna is putting the kitchen back together; on the other, Vinnie is straightening the photograph of his father.',
      'Everybody decides, privately, what goes in their family’s pot: the Bag, or the Envelope.',
    ] }),
  },
};
