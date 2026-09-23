// The Phone Call: Ray Mancuso rings Nonna's kitchen at two in the morning and
// hangs up after one sentence. They're picking somebody up tonight.

import { counting, money, round5k, nightDay, nightKicker } from '../common.js';

export default {
  id: 'phone-call', title: 'The Phone Call', day: nightDay, kicker: nightKicker,
  beats: [
    'two-am',
    'pickup',
    'apartment',
    { maybe: 'street', chance: 0.2 },
    'bail',
    'count',
  ],
  close(c) {
    const who = c.memo.held;
    c.remember(
      who ? `Police detained a local ${c.rng.pick(['businessperson', 'resident', 'person of interest'])} in the early hours of the morning in connection with the Benedetto investigation. ${c.memo.bail === 'pay' ? 'They were released on bail before breakfast.' : 'They remain in custody.'} A search of their apartment ${c.memo.cleaned ? 'found “nothing of note, and a very clean kitchen.”' : 'is said to have been “productive.”'}`
        : 'A quiet night on Mulberry Avenue.',
      { courier: 'EARLY MORNING PICKUP ON MULBERRY' },
    );
  },
  defs: {
    'two-am': {
      engine: 'choose', time: '2:00 A.M.', place: 'Nonna’s kitchen, the phone on the wall', title: 'Two A.M.', kicker: 'WARN ONE PERSON',
      text: (c) => [
        `The kitchen phone rings at two in the morning. Nonna answers on the first ring, as if she was waiting. It’s Ray Mancuso. He says one sentence — “${c.rng.pick(['They’re picking somebody up tonight, I can’t say who', 'Prout signed something an hour ago, it’s one of yours', 'Tell your people to sleep somewhere else, one of them’s getting a knock'])}” — and hangs up.`,
        'There’s time to call one person before the cars go out. Everybody warns somebody. Whoever is warned by the fewest gets the knock. Everybody finds out who called whom.',
      ],
      who: (c) => c.free.map((p) => p.id),
      options: (c, pid) => [{ id: 'warn', label: 'Call…', target: 'other', targets: c.free.map((p) => p.id).filter((id) => id !== pid) }],
      reveal: 'public',
      bot(c, p) {
        const pool = c.free.filter((q) => q.id !== p.id);
        const pref = pool.find((q) => q.id === p.secret?.partner)
          ?? pool.find((q) => ['soft-spot', 'big-brother'].includes(p.secret?.id) && q.id === p.secret?.target)
          ?? pool.find((q) => c.s.oaths.some((o) => !o.brokenBy && [o.a, o.b].includes(p.id) && [o.a, o.b].includes(q.id)));
        const snake = p.secret?.id === 'snake' ? p.secret.target : null;
        const ok = pool.filter((q) => q.id !== snake && !(p.grudges[q.id] > 0));
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
        c.memo.low = low;
        c.memo.warned = warned;
        if (low.length === 1) { c.memo.held = low[0]; return; }
        c.g.openRoll({
          dice: 1, target: null, clampFace: true, noMuscle: true, then: 'knock',
          label: `Nobody called ${c.list(low.map((id) => c.name(id)))} enough. The die decides who gets the knock.`,
          faces: assignFaces(low),
        });
      },
      afterRoll(c, roll, then) {
        if (then !== 'knock') return;
        const faces = assignFaces(c.memo.low);
        const hit = faces.find((f) => f.faces.includes(roll.face)) ?? faces[0];
        c.memo.held = hit.id;
      },
    },

    pickup: {
      engine: 'story', time: '3:15 A.M.', place: (c) => `${c.name(c.memo.held)}’s apartment`, title: 'The Knock', kicker: 'THE PICKUP',
      when: (c) => !!c.memo.held,
      run(c) {
        const p = c.p(c.memo.held);
        c.heat(p.id, 1, 'picked up at 3 a.m.');
        p.jailUntil = Math.max(p.jailUntil ?? -1, c.s.week.n);
        c.note(p.id, 'You’re in a holding cell at the 9th Precinct until somebody decides what to do about you. You get one phone call.', 'the 9th Precinct');
      },
      text: (c) => {
        const p = c.p(c.memo.held);
        const warned = c.memo.warned?.[p.id] ?? 0;
        return [
          `At a quarter past three somebody knocks on ${p.name}’s door. ${warned ? `${p.name} was warned — by ${warned === 1 ? 'one person' : `${warned} people`} — and still didn’t move fast enough.` : `Nobody called ${p.name}. Nobody.`}`,
          c.rng.pick([
            `Two detectives, very polite, one of them holding ${p.name}’s coat out for them. They’d like ${p.name} to come down to the 9th Precinct and answer some questions. It isn’t a request.`,
            `It’s Ray Mancuso, looking at his shoes. “Sorry,” he says. “It’s you.” Then he puts the cuffs on, gently.`,
          ]),
          `The apartment is empty now. The key is under the mat. Everybody knows the key is under the mat.`,
        ];
      },
    },

    apartment: {
      engine: 'choose', time: '3:40 A.M.', place: (c) => `${c.name(c.memo.held)}’s apartment, lights off`, title: 'The Apartment', kicker: 'YOUR CALL',
      when: (c) => !!c.memo.held,
      text: (c) => [
        `The detectives will be back with a warrant at seven. Whatever’s in ${c.name(c.memo.held)}’s apartment — the coffee can in the freezer, the shoebox on the wardrobe, anything with a name on it — will be in Prout’s folder by nine.`,
        `Clean it out before they come back, help yourself to the coffee can, or stay home. Nobody sees what anybody does. ${c.name(c.memo.held)} will only know what’s missing.`,
      ],
      who: (c) => c.free.map((p) => p.id).filter((id) => id !== c.memo.held),
      options: (c) => [
        { id: 'clean', label: 'Clean it out', blurb: 'Take anything that could hurt them. If the detectives catch you on the stairs, that’s your heat.', honest: true, brave: true },
        { id: 'help', label: 'Help yourself', blurb: 'The coffee can in the freezer. Nobody will ever know it was you. Unless somebody asks the right question.', greedy: true },
        { id: 'stay', label: 'Stay home', blurb: 'It isn’t your apartment and it isn’t your problem.' },
      ],
      fallback: () => ({ option: 'stay' }),
      bot(c, p) {
        const held = c.memo.held;
        const likes = p.secret?.partner === held || (['soft-spot', 'big-brother'].includes(p.secret?.id) && p.secret.target === held);
        const hates = (p.grudges[held] ?? 0) > 0 || (['grudge', 'snake'].includes(p.secret?.id) && p.secret.target === held);
        const r = c.rng();
        if (likes) return { option: 'clean' };
        if (hates || p.style === 'snake') return { option: r < 0.6 ? 'help' : 'stay' };
        if (p.style === 'greedy') return { option: r < 0.35 ? 'help' : r < 0.6 ? 'clean' : 'stay' };
        return { option: r < 0.45 ? 'clean' : r < 0.55 ? 'help' : 'stay' };
      },
      resolve(c, { choices }) {
        const held = c.p(c.memo.held);
        const cleaners = Object.entries(choices).filter(([, ch]) => ch.option === 'clean').map(([pid]) => pid);
        const helpers = Object.entries(choices).filter(([, ch]) => ch.option === 'help').map(([pid]) => pid);
        c.memo.cleaned = cleaners.length > 0;
        if (helpers.length) {
          const can = round5k(held.cash * 0.3);
          const got = c.charge(held.id, can);
          const each = round5k(got / helpers.length);
          for (const pid of helpers) {
            c.give(pid, each, 'the coffee can');
            c.fact(pid, 'coffeeCan', `Did ${c.name(pid)} take anything from ${held.name}’s apartment?`, true);
          }
          c.note(held.id, `When you get home, the coffee can in the freezer is empty: ${money(got)}. The cops didn’t take it. You know who had the key.`, 'your freezer');
          c.line(`Somebody emptied the coffee can in ${held.name}’s freezer.`);
        }
        for (const [pid, ch] of Object.entries(choices)) if (ch.option !== 'help') c.fact(pid, 'coffeeCan', `Did ${c.name(pid)} take anything from ${held.name}’s apartment?`, false);
        if (cleaners.length) {
          c.line(`${cleaners.length === 1 ? 'Somebody' : `${cleaners.length} of you`} went in before the warrant and came out with a shoebox and a laundry bag. When the detectives came back at seven, the apartment was cleaner than it has ever been.`);
          for (const pid of cleaners) {
            c.g.bond(pid, held.id, 'cleaned-for');
            if (c.rng.chance(0.3)) { c.heat(pid, 1, 'seen on the stairs'); c.note(pid, 'A neighbour saw you on the stairs with a laundry bag.', 'the stairs'); }
          }
          const page = held.cards.find((x) => x.id === 'ledger-page');
          if (page) c.line(`Whoever cleaned it found a page of Sal’s ledger taped under a drawer, and put it back where it was. ${held.name} still has it.`);
        } else {
          c.line(`Nobody went. At seven the detectives came back with a warrant and left with three boxes.`);
          c.caseFile(1, `whatever was in ${held.name}’s apartment`);
        }
      },
    },

    bail: {
      engine: 'vote', time: '8:30 A.M.', place: 'Nonna’s kitchen', title: 'Bail', kicker: 'A VOTE',
      when: (c) => !!c.memo.held && c.p(c.memo.held)?.jailUntil != null,
      text: (c) => [
        `${c.name(c.memo.held)} used their phone call${c.p(c.memo.held).used?.jail?.call ? '' : ' on nobody, which is its own message'}. The judge set bail at ${money(c.scale(25000))}, cash. It can come out of the Bag.`,
        `Pay it, and ${c.name(c.memo.held)} is home by lunch. Don’t, and they spend another night inside.`,
      ],
      voters: (c) => c.free.map((p) => p.id).filter((id) => id !== c.memo.held),
      options: (c) => [
        { id: 'pay', label: 'Pay the bail', blurb: `${money(c.scale(25000))} out of the Bag. ${c.name(c.memo.held)} is back tonight.`, risk: 0.2, reward: 0.3 },
        { id: 'leave', label: 'Leave them in', blurb: `Save the money. ${c.name(c.memo.held)} misses tomorrow night, and has a long time to think about who voted how.`, risk: 0.5, reward: 0.5 },
      ],
      bot(c, p) {
        const held = c.memo.held;
        if ((p.grudges[held] ?? 0) > 0 || (p.secret?.id === 'snake' && p.secret.target === held)) return 'leave';
        if (p.secret?.id === 'big-brother' && p.secret.target === held) return 'pay';
        return null;
      },
      resolve(c, { choice, votes }) {
        const held = c.p(c.memo.held);
        c.memo.bail = choice;
        if (choice === 'pay' && c.bag.total >= c.scale(25000)) {
          c.bagTake(c.scale(25000));
          held.jailUntil = null;
          c.line(`${money(c.scale(25000))} out of the Bag. ${held.name} walks out of the 9th Precinct at noon, squinting.`);
        } else {
          held.jailUntil = c.s.week.n + 1;
          c.line(choice === 'pay'
            ? `The Bag doesn’t have ${money(c.scale(25000))}. ${held.name} stays in, and misses tomorrow night.`
            : `${held.name} stays in, and misses tomorrow night.`);
          for (const [pid, v] of Object.entries(votes)) if (v === 'leave') c.grudge(held.id, pid, 'left you inside');
        }
      },
    },

    count: counting({ time: '1:00 A.M.', title: 'Counting It Out', text: (c) => [
      `A day late, everybody is back at Nonna’s. ${c.memo.held ? (c.p(c.memo.held).jailUntil != null && c.p(c.memo.held).jailUntil >= c.s.week.n ? `${c.name(c.memo.held)}’s chair is empty.` : `${c.name(c.memo.held)} is here, and hasn’t said much.`) : ''}`,
      'Everybody decides, privately, how much of what they’re holding goes in. The Bag’s total is public. Who put in what is not.',
    ] }),
  },
};

function assignFaces(ids) {
  const n = ids.length;
  const per = Math.floor(6 / n);
  let face = 1;
  return ids.map((id, i) => {
    const count = i < 6 % n ? per + 1 : per;
    const faces = [];
    for (let k = 0; k < count && face <= 6; k++) faces.push(face++);
    return { id, faces };
  });
}
