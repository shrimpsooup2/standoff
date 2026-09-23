// Things that go wrong. A night can pick one of these up between beats, so
// the same night never plays the same way twice. Each night says which ones
// fit the moment — a cleaner inside, a jammed door on the way out, a patrol
// car on the street — and the complication happens there, at that time.

import { money, tablePays, howPaid } from './common.js';

/** Where and when the night was when this happened. */
const at = (fallback) => (c) => c.memo.aside?.where ?? fallback;
const when = (c) => c.memo.aside?.time ?? null;

export const COMPLICATIONS = {
  patrol: {
    engine: 'roll', title: 'The Patrol Car', kicker: 'SOMETHING’S WRONG', place: at('Outside'), time: when,
    text: (c) => [c.rng.pick([
      'A patrol car turns the corner and slows down to a crawl. The officer is eating a sandwich and looking directly at you.',
      'A patrol car pulls up across the street and just sits there with the engine running. Nobody knows how long it has been there.',
      'Blue lights, no siren. A patrol car rolls past, stops, and reverses.',
    ]), 'Everybody act natural. Everybody is very bad at acting natural.'],
    target: () => 6,
    label: 'Acting natural',
    stakes: 'Miss it and somebody gets a good look, and the Case File grows.',
    resolve(c, r) {
      if (r.success) { c.line('The officer finishes his sandwich and drives off. He waved. Somebody waved back, which was a mistake, but it worked.'); return; }
      const who = c.rng.pick(c.free);
      c.line(`The officer wrote something down. He was looking at ${who.name} when he did it.`);
      c.heat(who.id, 1, 'a patrol car');
      c.caseFile(1, 'a patrolman’s notebook');
    },
  },

  cleaner: {
    engine: 'vote', title: 'The Cleaner', kicker: 'SOMETHING’S WRONG', place: at('A corridor that should have been empty'), time: when,
    text: (c) => [c.rng.pick([
      'A cleaning woman with a mop and a radio comes round the corner, stops, and takes out one earbud. Her name badge says CONSUELA. She is not scared. She is annoyed.',
      'There is a cleaner. Nobody said there would be a cleaner. She is looking at you over her cart like she has seen this before, which she might have.',
    ]), 'Decide what to do about her. Quickly.'],
    options: (c) => [
      { id: 'pay', label: 'Pay her', blurb: `${money(c.scale(15000))} out of the Bag, or out of your pockets if the Bag can’t, and she saw nothing.`, risk: 0.1, reward: 0.2 },
      { id: 'phone', label: 'Take her phone', blurb: 'Maybe she talks anyway. Maybe she doesn’t.', risk: 0.5, reward: 0.5 },
      { id: 'along', label: 'Bring her along', blurb: 'She knows where everything is. She has opinions about all of it.', risk: 0.6, reward: 0.6 },
      { id: 'go', label: 'Let her go', blurb: 'She tells somebody. Probably Prout.', risk: 0.8, reward: 0.1 },
    ],
    resolve(c, { choice }) {
      if (choice === 'pay') {
        const r = tablePays(c, c.scale(15000));
        if (r.ok) { c.line(`${howPaid(r)}. Consuela counted it in front of you, twice, and went back to mopping.`); return; }
        c.line(`Between the Bag and everybody’s pockets there’s ${money(r.had)}. Consuela looks at it, and at you, and walks straight to a phone.`);
        c.caseFile(1, 'a cleaner who couldn’t be paid');
        return;
      }
      if (choice === 'phone') {
        if (c.rng.chance(0.5)) c.line('She let you take the phone. It was her second phone. She told you that later.');
        else { c.line('You took her phone. She used the one on the wall.'); c.caseFile(1, 'a cleaner with a good memory'); }
        return;
      }
      if (choice === 'along') {
        c.set('consuela', true);
        c.line('Consuela came along. She showed you a quicker way out and told you everything you were doing wrong. She wants to be kept informed.');
        return;
      }
      c.line('You let her go. She walked straight to a phone.');
      c.caseFile(1, 'a cleaner who saw everything');
    },
  },

  dog: {
    engine: 'roll', title: 'The Dog', kicker: 'SOMETHING’S WRONG', place: at('The yard'), time: when,
    text: (c) => [c.rng.pick([
      'Nobody mentioned a dog. There is a dog. It is a German shepherd called, according to its collar, PRINCESS.',
      'The dog was supposed to be asleep. The dog is not asleep. The dog is very interested in everybody’s legs.',
    ]), 'Somebody has to deal with the dog.'],
    target: () => 7,
    label: 'Dealing with the dog',
    stakes: 'Miss it and somebody leaves with a torn coat, less money and a story.',
    resolve(c, r) {
      if (r.success) { c.line(c.rng.pick(['Somebody had a meatball sandwich. Princess is now a friend of the family.', 'The dog was all bark. Mostly bark.'])); return; }
      const who = c.rng.pick(c.free);
      const lost = c.charge(who.id, 10000);
      c.line(`The dog got ${who.name}’s coat, and ${money(lost)} that was in the pocket.`);
      c.heat(who.id, 1, 'the dog');
    },
  },

  jammed: {
    engine: 'plan', title: 'The Jammed Door', kicker: 'EVERYBODY PUSHES',
    place: at('The back exit'), time: when,
    text: () => ['The back door is jammed. Painted shut, probably in 1987. It needs everyone on it — or it needs everyone to say they were on it.'],
    target: (c) => c.free.length + 4,
    cost: () => 0,
    labels: () => ({ help: 'Put your shoulder into it', coast: 'Push, but not really', sabotage: 'Lean on the other side' }),
    resolve(c, r) {
      if (r.success) { c.line('The door gave on the third shove, with a noise like a car crash. Nobody came.'); return; }
      c.line('The door did not give. You went out the front, which was the whole thing you were trying not to do.');
      for (const p of c.free) c.heat(p.id, 1, 'the front door');
    },
  },

  mancuso: {
    engine: 'vote', title: 'Ray Mancuso Pulls Up', kicker: 'SOMETHING’S WRONG', place: at('The curb'), time: when,
    text: () => ['An unmarked Crown Victoria pulls up alongside. The window comes down. It’s Ray Mancuso, on somebody’s payroll, possibly yours. “Evening,” he says. “This is going to cost somebody something.”'],
    options: (c) => [
      { id: 'pay', label: 'Everybody pays Ray', blurb: `${money(10000)} each, out of your own pockets.`, risk: 0.1, reward: 0.2 },
      { id: 'stall', label: 'Stall him', blurb: 'Ray’s in a good mood about half the time.', risk: 0.5, reward: 0.5 },
      { id: 'nonna', label: 'Call Nonna', blurb: c.byJob('cousin') ? `${c.byJob('cousin').name} dials. Nonna has known Ray since he was an altar boy.` : 'Nonna has known Ray since he was an altar boy. Somebody has to dial.', risk: 0.3, reward: 0.4 },
    ],
    resolve(c, { choice }) {
      if (choice === 'pay') {
        let got = 0;
        for (const p of c.free) got += c.charge(p.id, 10000);
        c.line(`Ray counted ${money(got)} on the steering wheel and drove off whistling.`);
        return;
      }
      const odds = choice === 'nonna' ? (c.byJob('cousin') ? 0.8 : 0.55) : 0.5;
      if (c.rng.chance(odds)) {
        c.line(choice === 'nonna' ? 'Nonna said four words to Ray. Ray apologised to her, to you, and to his mother, and left.' : 'Ray laughed at something, decided he liked you, and drove off.');
        return;
      }
      c.line(choice === 'nonna' ? 'Nonna didn’t pick up. Ray took that personally.' : 'Ray was not in a good mood.');
      c.caseFile(1, 'Ray Mancuso needed something to give Prout');
      c.heat(c.rng.pick(c.free).id, 1, 'Ray Mancuso');
    },
  },

  split: {
    engine: 'choose', title: 'Split Up', kicker: 'WHO DO YOU RUN WITH?', place: at('Three alleys'), time: when,
    text: () => ['Sirens, three blocks off and getting closer. Split up, in twos. Pick who you run with. If they pick you too, you’ve got each other. If they don’t, you’re on your own.'],
    who: (c) => c.free.map((p) => p.id),
    options: (c, pid) => [{ id: 'with', label: 'Run with…', target: 'other', targets: c.free.map((p) => p.id).filter((id) => id !== pid) }],
    reveal: 'public',
    bot(c, p) {
      const pool = c.free.filter((q) => q.id !== p.id);
      const friend = pool.find((q) => q.id === p.secret?.target || q.id === p.secret?.partner);
      return { option: 'with', target: (friend ?? c.rng.pick(pool))?.id };
    },
    resolve(c, { choices }) {
      const alone = [];
      for (const [pid, ch] of Object.entries(choices)) {
        const mutual = choices[ch.target]?.target === pid;
        c.g.bond(pid, ch.target, 'ran-with', { mutual });
        if (!mutual) alone.push(pid);
      }
      if (!alone.length) { c.line('Everybody had somebody. You all made it home.'); return; }
      for (const pid of alone) {
        if (c.rng.chance(0.5)) { c.heat(pid, 1, 'running alone'); c.line(`${c.name(pid)} ran alone and was seen.`); }
        else c.line(`${c.name(pid)} ran alone and got away with it.`);
      }
    },
  },

  photographer: {
    engine: 'roll', title: 'The Photographer', kicker: 'SOMETHING’S WRONG', place: at('Somewhere with a flash'), time: when,
    text: (c) => [c.rng.pick([
      'A flash goes off. A man with a camera and a press card from the Harbor Courier is backing away very fast.',
      'The photographer has been taking pictures all night. One of them, he says, is “very interesting.” He is already walking towards his car.',
    ]), 'Somebody has to get that film.'],
    target: () => 7,
    label: 'Getting the film',
    stakes: 'Miss it and your faces are on page six, and in Prout’s folder.',
    resolve(c, r) {
      if (r.success) {
        c.line(c.memo.hall
          ? c.rng.pick(['The film ended up in the punch bowl. So, briefly, did the photographer.', 'Somebody bought the whole roll for twenty dollars and a very long look.'])
          : c.rng.pick(['Somebody caught him at his car and bought the whole roll for twenty dollars and a very long look.', 'The film came out of the camera in one long ribbon and went into the nearest trash can, and the photographer went home.']));
        return;
      }
      c.line('The photographer got away. Page six tomorrow will be very interesting.');
      c.caseFile(1, 'a photograph in the Courier');
      c.heat(c.rng.pick(c.free).id, 1, 'the photograph');
    },
  },

  cake: {
    engine: 'vote', title: 'The Cake', kicker: 'WHO TAKES THE BLAME?', place: at('The dessert table'), time: when,
    text: () => ['The wedding cake — five tiers, a fountain, two tiny plastic Castellanos on top — is on the floor. Nobody at your table will say who backed into it. Somebody is going to apologise to the bride’s mother, and it is going to cost them.'],
    candidates: (c) => c.free.map((p) => p.id),
    resolve(c, { choice }) {
      const n = c.charge(choice, 10000);
      c.line(`${c.name(choice)} apologised to the bride’s mother and paid ${money(n)} for a new cake. Whether they did it or not, it’s their cake now.`);
      for (const p of c.free) if (p.id !== choice) c.g.bond(p.id, choice, 'blamed');
    },
  },
};

/**
 * Which complications fit which moment. Nights mostly name their own list;
 * these are for the common cases.
 */
export const POOLS = {
  // inside a building, before the money
  inside: ['cleaner'],
  // on the way out of a building, with the money
  out: ['jammed', 'patrol', 'mancuso'],
  // out on the street, in a car or on foot
  street: ['patrol', 'mancuso', 'photographer'],
  wedding: ['photographer', 'cake', 'mancuso'],
};
