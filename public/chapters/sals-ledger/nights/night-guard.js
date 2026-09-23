// The Night Guard: the evidence warehouse on Pier 9, where Prout keeps
// everything he took out of Sal's house.

import { counting, money, round5k, nightDay, nightKicker, share, lowerFirst } from '../common.js';

const LENNY = {
  whoLabel: 'Lenny Russo, night guard, Pier 9',
  openings: [
    { id: 'giants', label: '“Tough loss for the Giants, huh?”',
      yes: 'Lenny Russo is a Giants fan, loudly. He has a foam finger in the guard hut.',
      no: 'Lenny is a Jets man. He would rather eat the foam finger than wear it.' },
    { id: 'union', label: '“Local 1814 sent us. Shift change.”',
      yes: 'Lenny is in Local 1814 and hates every shift they give him. He’d leave early for a sandwich.',
      no: 'Lenny isn’t union. He got the job through his brother-in-law, and he checks every ID twice because of it.' },
    { id: 'mother', label: '“Your mother’s on the phone. It’s about the cat.”',
      yes: 'Lenny lives with his mother and her cat, Pickles, who is always sick.',
      no: 'Lenny’s mother lives in Boca Raton and hasn’t called him since 2019.' },
    { id: 'envelope', label: 'Slide him an envelope.',
      yes: 'Lenny is two months behind on the payments for a boat he has never taken out.',
      no: 'Lenny wants to be a detective. He writes down every offer he gets in a little notebook for when he applies.' },
  ],
  filler: [
    'Lenny eats a meatball hero at exactly 11 p.m. every night.',
    'There is a radio in Lenny’s hut, and it is always playing talk radio about the Giants — or the Jets.',
    'Lenny has a mustache he is very proud of.',
    'The gate at Pier 9 squeaks. Lenny says he likes it that way.',
  ],
};

const ITEMS = [
  { id: 'shoebox', label: 'A shoebox of fifties', blurb: 'Sal kept it behind the water heater. Nobody knows how much is in it until it’s counted.', value: 35000, kind: 'cash' },
  { id: 'envelopes', label: 'Sal’s Christmas envelopes', blurb: 'Eleven envelopes, each with a name on it and some money in it. The names can wait.', value: 25000, kind: 'cash' },
  { id: 'page', label: 'A page of the ledger', blurb: 'A name on it, and a number next to the name.', value: 30000, kind: 'page' },
  { id: 'page2', label: 'Another page of the ledger', blurb: 'Page 212. Somebody’s Christmas bonus, in Sal’s handwriting.', value: 30000, kind: 'page' },
  { id: 'piece', label: 'Sal’s revolver', blurb: 'A 1971 Smith & Wesson, never fired, lovingly oiled. Helps on a roll. Bad news in a search.', value: 20000, kind: 'card', card: 'the-piece' },
  { id: 'watch', label: 'Sal’s watch', blurb: 'A gold Longines. Nobody will ever look for it. Worth about $15k to the right person.', value: 15000, kind: 'cash', safe: true },
  { id: 'rosary', label: 'Nonna’s rosary', blurb: 'She has been looking for it since Monday. It would mean something to her — and she would owe you.', value: 20000, kind: 'card', card: 'nonnas-blessing' },
  { id: 'tin', label: 'Sal’s seed tin', blurb: 'Forty years of tomato seeds. Worth nothing to anybody except the two people it’s worth everything to.', value: 10000, kind: 'card', card: 'seed-tin' },
  { id: 'cassette', label: 'A cassette marked “PROUT ’19”', blurb: 'Nobody has a tape player. Somebody knows somebody who does.', value: 25000, kind: 'card', card: 'the-photo' },
];

function wayIn(c) { return c.flag('pier9Way') ?? 'gate'; }

export default {
  id: 'night-guard', title: 'The Night Guard', day: nightDay, kicker: nightKicker,
  beats: [
    'way-in',
    { if: (c) => wayIn(c) === 'gate', then: 'lenny', else: { if: (c) => wayIn(c) === 'fence', then: 'fence', else: 'water' } },
    'log',
    { maybe: 'heist', chance: 0.2 },
    'cage',
    'box',
    { oneOf: [
      { beat: 'dogs', weight: 2 },
      { beat: 'patrol-boat', weight: 1.5 },
      { beat: 'lenny-wakes', weight: 2, when: (c) => wayIn(c) === 'gate' && !c.memo.lennyClean },
    ] },
    'count',
  ],
  close(c) {
    const took = c.memo.boxTaken ?? 0;
    c.remember(
      took
        ? `Police are investigating a break-in at the Pier 9 evidence warehouse, where items seized from a local man’s home were being stored. ${c.flag('lennySaw') ? `Night guard Leonard Russo, 52, gave detectives “a very good description” and asked about the application process.` : 'The night guard said he “heard nothing,” and asked to be left alone to finish his sandwich.'} ${took >= 3 ? 'A spokesman for the District Attorney’s office called the loss “inconvenient.”' : ''}`
        : 'An attempted break-in at the Pier 9 evidence warehouse was foiled overnight. Nothing was taken, police said, “as far as we can tell.”',
      { courier: took ? 'PIER 9 EVIDENCE ROOM “CLEANED OUT”' : 'NOTHING TAKEN IN PIER 9 BREAK-IN' },
    );
  },
  defs: {
    'way-in': {
      engine: 'vote', time: '11:10 P.M.', place: 'Nonna’s kitchen, a map of the waterfront', title: 'The Way In', kicker: 'A VOTE',
      text: (c) => [
        `Everything Prout took out of Sal’s house is in a cage on Pier 9: ${c.rng.pick(['a shoebox, a watch, pages of the ledger, and a tin of tomato seeds Nonna has been asking about every hour since Monday', 'the cash from behind the water heater, pages of the ledger, and Sal’s revolver, which he has never fired and oils every Sunday'])}. Monday it goes to court. Tonight it doesn’t have to.`,
        'Three ways onto the pier. Talk your way past the guard at the front gate, go over the fence on the railway side, or come in by water under the pier.',
      ],
      options: (c) => [
        { id: 'gate', label: 'The front gate', blurb: 'Lenny Russo is on the gate. Somebody talks; everybody else knows something about Lenny.', risk: 0.4, reward: 0.6, details: ['Fail and Lenny remembers a face.'] },
        { id: 'fence', label: 'Over the fence', blurb: 'Razor wire, a railway line, and a drop on the other side.', risk: 0.5, reward: 0.5, details: [`A roll: ${c.odds(2, 8)}.`, 'Fail and somebody tears more than a coat.'] },
        { id: 'water', label: 'By water', blurb: 'A rowboat under Pier 11 and a lot of rowing. Everybody has to pull.', risk: 0.3, reward: 0.5, details: ['Hidden effort: help, coast, or quietly make it worse.'] },
      ],
      angles(c) {
        const ps = c.rng.shuffle(c.free.map((p) => p.id));
        const out = {};
        if (ps[0]) {
          out[ps[0]] = { option: 'water', text: `By water. The rowboat under Pier 11 is your uncle’s. If the crew goes by water, everybody else pays you $5k for the boat — and nobody knows it’s yours.` };
          c.memo.boatOwner = ps[0];
        }
        if (ps[1]) {
          out[ps[1]] = { option: 'gate', text: `The gate. Lenny Russo owes you ${money(10000)} from the Tuesday card game. If you go through the gate and the talking goes well, you collect.` };
          c.memo.lennyOwes = ps[1];
        }
        if (ps[2]) {
          out[ps[2]] = { option: 'fence', text: 'The fence. You cut your hand on that fence in 2014, and you found the gap by the third post. If it’s the fence, the roll is two easier — and only you know why.' };
          c.memo.fenceGap = ps[2];
        }
        for (const id of ps.slice(3)) out[id] = { option: null, text: 'Nothing on this one. You just want to get home.' };
        return out;
      },
      resolve(c, { choice }) {
        c.set('pier9Way', choice);
        c.line({
          gate: 'The front gate. Whoever’s talking had better know something about the Giants. Or the Jets.',
          fence: 'The fence. Somebody finds gloves. Nobody finds enough gloves.',
          water: 'By water. There is a rowboat under Pier 11, nobody asks whose, and it smells like 1985.',
        }[choice]);
      },
    },

    lenny: {
      engine: 'whispers', time: '11:40 P.M.', place: 'The front gate, Pier 9', title: 'Lenny', kicker: 'ONE OF YOU TALKS',
      whoLabel: LENNY.whoLabel,
      text: (c) => {
        const t = c.freeByJob('talker')?.name ?? 'Somebody';
        return [
          `Lenny Russo is in his hut with the door open and ${c.rng.pick(['a meatball hero', 'the radio on', 'his feet on the desk'])}. He watches ${t} walk up to the gate with the look of a man who has been told to expect nobody.`,
          `${t} has to say something. Everybody else knows one thing about Lenny. Pass it on as written, turn it around, or keep it.`,
        ];
      },
      openings: () => LENNY.openings,
      filler: () => LENNY.filler,
      resolve(c, { success, openingLabel, talker }) {
        c.memo.inClean = !!success;
        if (success) {
          c.memo.lennyClean = true;
          c.line(`${c.name(talker)} opened with ${openingLabel.replace(/[“”]/g, '')} Lenny laughed, lifted the barrier, and went back to his sandwich.`);
          if (c.memo.lennyOwes && !c.isAway(c.memo.lennyOwes)) {
            c.give(c.memo.lennyOwes, 10000, 'Lenny’s card debt');
            c.note(c.memo.lennyOwes, 'On the way in Lenny slipped you an envelope without a word: the $10k from Tuesday.', 'Lenny Russo');
          }
          return;
        }
        c.set('lennySaw', talker);
        c.line(`${c.name(talker)} opened with ${openingLabel.replace(/[“”]/g, '')} Lenny squinted, reached for his notebook, and wrote something down while you went round him. He got a very good look at ${c.name(talker)}.`);
        c.heat(talker, 2, 'Lenny wrote it down');
        c.remember(`${c.name(talker)}'s face went into Lenny Russo's notebook.`, { who: talker, kind: 'seen' });
      },
    },

    fence: {
      engine: 'roll', time: '11:40 P.M.', place: 'The railway side of Pier 9', title: 'The Fence', kicker: 'THE DICE',
      text: (c) => [c.rng.pick([
        'Twelve feet of chain-link with razor wire along the top, and a freight train due in eleven minutes.',
        'The fence is taller than it looked from the kitchen. Everything is taller than it looked from the kitchen.',
      ]), c.memo.fenceGap && !c.isAway(c.memo.fenceGap) ? 'Somebody seems very sure about the third post.' : 'Everybody looks at everybody else’s coat.'],
      target: () => 8,
      mods: (c) => (c.memo.fenceGap && !c.isAway(c.memo.fenceGap) ? [{ label: `${c.name(c.memo.fenceGap)} knows the gap`, n: 2 }] : []),
      label: 'Over the wire',
      stakes: 'Miss it and somebody gets hung up on the wire: two heat for them, and the Case File grows.',
      resolve(c, r) {
        c.memo.inClean = r.success;
        if (r.success) { c.line(c.rng.pick(['Everybody over, one torn sleeve between you. The train went by as the last of you dropped.', 'Over and down. Somebody landed in a puddle and has been told not to talk about it.'])); return; }
        const who = c.rng.pick(c.free);
        c.line(`${who.name} got hung up on the wire for four long minutes. A security light came on. By the time they were free, the railway cop had a very good story to tell.`);
        c.heat(who.id, 2, 'hung up on the fence');
        c.caseFile(1, 'a railway cop’s report');
      },
    },

    water: {
      engine: 'plan', time: '11:40 P.M.', place: 'Under Pier 11', title: 'The Water', kicker: 'EVERYBODY ROWS',
      text: (c) => [
        `The rowboat has four oars, one bucket and a name painted on the back: ${c.rng.pick(['MARIA', 'NO REGRETS', 'SAL’S OTHER WIFE', 'THE ENTERPRISE'])}. It is three hundred yards to Pier 9 against the tide.`,
        'Everybody pulls — or says they do. Helping costs you $5k (you paid a kid on the dock to keep watch). Nobody sees who did what, only the total.',
      ],
      target: (c) => c.free.length + 4,
      cost: () => 5000,
      labels: () => ({ help: 'Row like you mean it', coast: 'Row like you’re being watched', sabotage: 'Drag your oar' }),
      enter(c) {
        const owner = c.memo.boatOwner;
        if (!owner || c.isAway(owner)) return;
        let got = 0;
        for (const p of c.free) if (p.id !== owner) got += c.charge(p.id, 5000);
        if (got) { c.give(owner, got, 'the boat'); c.note(owner, `Everybody paid ${money(5000)} for the boat. ${money(got)}, into your pocket. Nobody asked whose it was.`, 'your uncle’s boat'); }
        c.line('Somebody says the boat costs $5k a head to borrow, and everybody pays, because it’s midnight and nobody wants to argue in a rowboat.');
      },
      resolve(c, r) {
        c.memo.inClean = r.success;
        if (r.success) { c.line('You came up under Pier 9 in the dark, without a sound, which has never once happened in the history of rowboats.'); return; }
        c.line('The tide won. You came in two piers down, soaking wet, in front of a man fishing, who waved. Everybody is soaked and everybody is seen.');
        for (const p of c.free) c.heat(p.id, 1, 'coming in by water');
      },
    },

    log: {
      engine: 'vote', time: '11:55 P.M.', place: (c) => (c.memo.inClean ? 'The cage office, Pier 9' : 'The corridor to the cage, Pier 9'), title: (c) => (c.memo.inClean ? 'The Log' : 'The Camera'), kicker: 'A VOTE',
      text: (c) => (c.memo.inClean ? [
        `You’re in, and nobody knows it. On the desk in the cage office is the evidence log: every item that came out of Sal’s house, the case number, Prout’s initials, and a blank line for whoever signs it out.${c.memo.lennyClean ? ' Lenny’s pen is still on it.' : ''}`,
        'A log like this is how Prout proves on Monday that the box is the box. What do you do with it?',
      ] : [
        'You’re in, but not quietly, and there is a camera over the cage with a little red light on, pointed at the corridor you just came down. Somewhere in Lenny’s hut, a tape is turning.',
        'What do you do about the camera?',
      ]),
      options: (c) => (c.memo.inClean ? [
        { id: 'tear', label: 'Tear Sal’s pages out of the log', blurb: 'No log, no chain of custody. Somebody will notice in the morning, and somebody will get looked at.', risk: 0.4, reward: 0.5 },
        { id: 'prout', label: 'Sign it all out in Prout’s name', blurb: 'If it holds up, half the box gets thrown out on Monday. If a handwriting man looks at it, it’s worse than nothing.', risk: 0.6, reward: 0.7 },
        { id: 'castellano', label: 'Sign it out as a Castellano', blurb: '“V. Castellano,” in capitals. Prout will go across the river. So will the Castellanos’ temper.', risk: 0.5, reward: 0.5 },
        { id: 'leave', label: 'Leave it', blurb: 'Nobody touches the log. Nobody has to explain the log.', risk: 0, reward: 0.1 },
      ] : [
        { id: 'paint', label: 'Spray-paint it', blurb: 'Somebody has to get close enough. Maybe it already has your face.', risk: 0.5, reward: 0.4 },
        { id: 'tape', label: 'Go and get the tape from Lenny’s hut', blurb: 'The whole tape, gone. It takes time you’ll miss at the cage.', risk: 0.4, reward: 0.5 },
        { id: 'ignore', label: 'Pull your collars up and ignore it', blurb: 'It’s 1994 equipment. Probably.', risk: 0.7, reward: 0.1 },
      ]),
      resolve(c, { choice }) {
        const blame = () => c.rng.pick(c.free);
        switch (choice) {
          case 'tear': {
            c.caseFile(-1, 'the Pier 9 log is missing its pages');
            const who = blame();
            c.heat(who.id, 1, 'the missing log pages');
            c.line(`Four pages come out of the log and go into ${who.name}’s coat. When Lenny finds the stubs in the morning, it’s ${who.name} he’ll describe.`);
            break;
          }
          case 'prout':
            if (c.rng.chance(0.5)) { c.caseFile(-2, 'half of Sal’s box, signed out by “W. Prout”'); c.line('“W. Prout,” in a very good copy of his handwriting, on every line. On Monday, Morty is going to have a wonderful morning.'); }
            else { c.caseFile(1, 'a forged signature a handwriting man took four minutes over'); c.line('“W. Prout,” on every line. On Monday a handwriting man is going to take four minutes over it, and Morty is going to have a terrible morning.'); }
            break;
          case 'castellano':
            c.caseFile(-1, 'a log that points across the river');
            c.set('war', true);
            c.line('“V. CASTELLANO,” in capitals, on every line. Prout will spend Tuesday across the river. The Castellanos will spend it wondering who did this, and they will not wonder for long.');
            break;
          case 'paint':
            if (c.rng.chance(0.6)) c.line('A long hiss, and the red light is a black smear. Nobody can say what it saw before.');
            else { c.caseFile(1, 'one clear frame from the Pier 9 camera'); c.line('The paint went on the lens. So did a very clear frame of whoever was holding the can.'); }
            break;
          case 'tape':
            c.memo.cageRushed = true;
            c.line('Somebody goes back for the tape, finds it, and comes back with it in their shirt. It takes eleven minutes. Everybody feels every one of them.');
            break;
          default:
            if (choice === 'ignore') { c.caseFile(1, 'the Pier 9 camera'); c.line('Collars up. The red light watches everybody go by. It was not 1994 equipment.'); }
            else c.line('Nobody touches the log.');
        }
      },
    },

    cage: {
      engine: 'roll', time: '12:05 A.M.', place: 'The evidence cage, Pier 9', title: 'The Padlock', kicker: 'THE DICE',
      text: (c) => [
        `The cage is chain-link floor to ceiling with a padlock the size of a fist. ${c.memo.cageRushed ? 'After eleven minutes on the tape, nobody has the patience for it.' : 'Somebody has bolt cutters. Somebody always has bolt cutters.'}`,
        'Get it open all the way and the whole box is yours to pick through. Don’t, and you’re reaching through a gap for whatever’s near the front.',
      ],
      target: (c) => (c.memo.inClean ? 7 : 8) + (c.memo.cageRushed ? 1 : 0),
      label: 'The padlock',
      stakes: 'Miss it and you only reach what’s at the front, and the noise follows you out.',
      resolve(c, r) {
        c.memo.cageOpen = r.success;
        if (r.success) { c.line('The padlock goes with a crack like a pistol. The cage door swings open. The box is right there.'); return; }
        c.memo.cageNoise = true;
        c.line('The bolt cutters slip, twice, loudly. The lock holds. The door gives four inches, and four inches is what you get.');
      },
    },

    box: {
      engine: 'draft', time: '12:15 A.M.', place: 'The evidence cage, Pier 9', title: 'Sal’s Box', kicker: 'TAKE ONE, PASS THE BOX',
      text: (c) => [
        'The cage is open. Everything that came out of Sal’s house is in one cardboard box with a case number on the side in Prout’s handwriting.',
        'Take one thing and pass it on. Everybody sees what everybody takes. Whatever is left in the box, Prout keeps — and if that’s a page of the ledger, it goes in his folder.',
      ],
      order(c, ids) {
        // whoever got the crew in picks first; the rest in any order
        const first = c.memo.lennyClean ? c.freeByJob('talker')?.id : null;
        const rest = c.rng.shuffle(ids.filter((id) => id !== first));
        return first && ids.includes(first) ? [first, ...rest] : rest;
      },
      items(c) {
        const n = c.free.length;
        const pool = ITEMS.filter((it) => !(it.card === 'the-photo' && c.flag('photoGiven')) && !(it.card === 'seed-tin' && (c.flag('seedTinGiven') || c.flag('seedTin'))));
        const must = pool.filter((it) => it.id === 'shoebox' || it.id === 'page');
        const rest = c.rng.shuffle(pool.filter((it) => !must.includes(it)));
        // a cage that wouldn't open all the way only gives up what's near the front
        const reach = c.memo.cageOpen === false ? Math.max(2, n - 1) : n + 1;
        const pick = [...must, ...rest].slice(0, reach);
        const names = c.rng.shuffle(c.players.map((p) => p.id));
        let k = 0;
        return c.rng.shuffle(pick).map((it) => {
          const v = it.kind === 'cash' ? round5k(c.scale(it.value) * (0.8 + c.rng() * 0.4)) : it.value;
          const about = it.kind === 'page' ? names[k++ % names.length] : null;
          return {
            id: it.id, kind: it.kind, card: it.card ?? null, value: v, safe: !!it.safe, about,
            label: it.kind === 'page' ? `${it.label} — ${c.name(about)} is on it` : it.label,
            blurb: it.kind === 'cash' ? `${it.blurb}` : it.blurb,
          };
        });
      },
      bot(c, p, open) {
        // take the page with your own name on it, if it's there
        const mine = open.find((it) => it.kind === 'page' && it.about === p.id);
        if (mine) return mine.id;
        if (p.secret?.id === 'collector') { const pg = open.find((it) => it.kind === 'page'); if (pg) return pg.id; }
        if (p.secret?.id === 'nonnas-favourite') { const r = open.find((it) => it.id === 'rosary'); if (r) return r.id; }
        return null;
      },
      resolve(c, { picks }) {
        const b = c.beat;
        const items = b.data.items;
        c.memo.boxTaken = Object.keys(picks).length;
        for (const [pid, id] of Object.entries(picks)) {
          const it = items.find((x) => x.id === id);
          if (it.kind === 'cash') {
            c.give(pid, it.value, 'Sal’s box');
            c.line(`${c.name(pid)} took ${lowerFirst(it.label)}: ${money(it.value)}, counted later, in private.`);
          } else if (it.kind === 'page') {
            if (it.about === pid) {
              c.line(`${c.name(pid)} took the page with their own name on it and ate it. Actually ate it. Nobody will ever know what it said.`);
              c.caseFile(-1, 'a page of the ledger is gone for good');
            } else {
              const card = c.card(pid, 'ledger-page');
              if (card) { card.about = it.about; card.line = `${c.name(it.about)} — page ${c.rng.int(3, 310)}`; }
              c.line(`${c.name(pid)} took the page with ${c.name(it.about)}’s name on it. ${c.name(it.about)} saw.`);
            }
          } else if (it.card) {
            c.card(pid, it.card);
            if (it.card === 'the-photo') { c.set('photoGiven', pid); c.note(pid, 'Somebody found a tape player. On the tape: Prout, at a Castellano wedding, very drunk, giving a toast. There is also a photograph in the case. You have it now.', 'the cassette'); }
            if (it.card === 'seed-tin') c.set('seedTinGiven', pid);
            c.line(`${c.name(pid)} took ${lowerFirst(it.label)}.`);
          }
        }
        const left = items.filter((it) => !it.taken);
        for (const it of left) {
          if (it.kind === 'page') c.caseFile(1, `Prout still has the page with ${c.name(it.about)}’s name on it`);
        }
        if (left.length) c.line(`Left in the box for Prout: ${left.map((it) => lowerFirst(it.label.replace(/ — .*/, ''))).join(', ')}.`);
      },
    },

    dogs: {
      engine: 'roll', time: '12:30 A.M.', place: 'The yard, Pier 9', title: 'The Dogs', kicker: 'GET OUT',
      text: (c) => [c.rng.pick([
        'Nobody said anything about dogs. There are two dogs. They are called, according to the sign, BRUNO and ALSO BRUNO.',
        'The yard lights come on. Somewhere behind the containers, something large wakes up and starts to run.',
      ]), 'Everybody out, with everything, before they get here.'],
      target: (c) => 7 + (c.memo.cageNoise ? 1 : 0),
      label: 'Out before the dogs',
      stakes: 'Miss it and somebody drops what they took from the box.',
      resolve(c, r) {
        if (r.success) { c.line(c.rng.pick(['Out, over and gone. Bruno got a sleeve. Also Bruno got nothing.', 'Somebody threw a meatball sandwich. It bought eleven seconds. It was enough.'])); return; }
        const holders = c.free.filter((p) => (c.s.night.earned[p.id] ?? 0) > 0);
        const who = c.rng.pick(holders.length ? holders : c.free);
        const lost = c.charge(who.id, round5k((c.s.night.earned[who.id] ?? 0) / 2));
        c.line(`Bruno caught ${who.name} at the fence. ${lost ? `${money(lost)} went over the pier and into the harbor.` : 'Bruno got a shoe.'}`);
        c.heat(who.id, 1, 'the dogs');
      },
    },

    'patrol-boat': {
      engine: 'vote', time: '12:30 A.M.', place: 'The end of Pier 9', title: 'The Harbor Patrol', kicker: 'A VOTE',
      text: () => ['A harbor patrol boat comes round the end of the pier with its searchlight sweeping the water. It’s slowing down. Somebody on it has a megaphone.'],
      options: (c) => [
        { id: 'swim', label: 'Into the water', blurb: 'Everybody goes in and swims for Pier 8. Whatever’s in your pockets gets wet.', risk: 0.3, reward: 0.3 },
        { id: 'hide', label: 'Hide in the containers', blurb: 'A roll to stay hidden. Miss it and everybody is seen.', risk: 0.6, reward: 0.6 },
        { id: 'wave', label: 'Wave at them', blurb: 'You’re dock workers. It’s a night shift. Somebody has to sell it.', risk: 0.7, reward: 0.5 },
      ],
      resolve(c, { choice }) {
        if (choice === 'swim') {
          let lost = 0;
          for (const p of c.free) lost += c.charge(p.id, round5k(p.cash * 0.1));
          c.line(`Everybody swam for it. ${money(lost)} in wet fifties didn’t make it. Nobody saw you, and everybody saw everybody else in their underwear drying off in Nonna’s kitchen.`);
          return;
        }
        const odds = choice === 'hide' ? 0.6 : c.freeByJob('talker') ? 0.55 : 0.4;
        if (c.rng.chance(odds)) {
          c.line(choice === 'hide' ? 'The searchlight went past three times. Nobody breathed. The boat went on up the river.' : 'Somebody waved and shouted something about overtime. The patrol boat waved back and went on up the river.');
          return;
        }
        c.line(choice === 'hide' ? 'The searchlight found a foot sticking out between two containers. The foot ran. So did everybody else.' : 'The man with the megaphone asked which union. Nobody knew.');
        for (const p of c.free) c.heat(p.id, 1, 'the harbor patrol');
      },
    },

    'lenny-wakes': {
      engine: 'roll', time: '12:30 A.M.', place: 'The front gate, Pier 9', title: 'Lenny Wakes Up', kicker: 'GET OUT',
      text: () => ['Lenny has woken up, found his notebook, and is standing in the middle of the road with a flashlight and a radio. He’s calling it in. He’s spelling out a description.'],
      target: (c) => 7 + (c.memo.cageNoise ? 1 : 0),
      label: 'Past Lenny',
      stakes: 'Miss it and the description is a good one: everybody takes one heat.',
      resolve(c, r) {
        if (r.success) { c.line('You went past Lenny so fast he dropped the radio. He is still describing a blur.'); return; }
        c.line('Lenny’s description was excellent. He is going to make a very good detective one day.');
        for (const p of c.free) c.heat(p.id, 1, 'Lenny’s description');
        c.caseFile(1, 'Lenny Russo’s notebook');
      },
    },

    count: counting({ time: '1:20 A.M.' }),
  },
};

export { share };
