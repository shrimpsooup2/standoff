// The Cleanup: the Case File is too thick. Tonight some of it goes missing.

import { counting, money, round5k, nightDay, nightKicker, lowerFirst } from '../common.js';

const MARJORIE = [
  { id: 'flowers', label: 'Flowers, and “Mr. Prout asked me to bring these up.”',
    yes: 'Marjorie, Prout’s secretary, has been in love with him for six years. He has never once noticed.',
    no: 'Marjorie can’t stand Prout. She has a dartboard in her desk drawer with his marathon photo on it.' },
  { id: 'cleaning', label: '“Night cleaning crew. We’re doing the fourth floor.”',
    yes: 'The fourth floor cleaning crew changes every week. Marjorie has never learned a single one of their names.',
    no: 'The fourth floor is cleaned by Marjorie’s cousin Rosa, every night, and has been since 2011.' },
  { id: 'pastries', label: 'A box of sfogliatelle from Ferrara’s.',
    yes: 'Marjorie has a weakness for sfogliatelle that she has never admitted to a living soul.',
    no: 'Marjorie is diabetic, and very sensitive about it.' },
  { id: 'audit', label: '“City Comptroller’s office. Spot check on evidence logs.”',
    yes: 'The Comptroller’s office has been threatening an audit of the DA’s evidence logs for months. Marjorie dreads it.',
    no: 'Marjorie used to work at the Comptroller’s office. She knows everybody there by their first name.' },
];

const FILLER = [
  'The DA’s office has a coffee machine that has been broken since the Giuliani administration.',
  'Prout’s office has eleven framed marathon medals and one photograph of a dog that isn’t his.',
  'The fourth floor smells of floor polish and burnt coffee.',
];

function target(c) { return c.flag('cleanupTarget') ?? 'office'; }

export default {
  id: 'cleanup', title: 'The Cleanup', act: 3, day: nightDay, kicker: nightKicker,
  beats: [
    'which',
    { if: (c) => target(c) === 'office', then: 'marjorie' },
    { if: (c) => target(c) === 'precinct', then: 'evidence-room' },
    { if: (c) => target(c) === 'clerk', then: 'clerks-office' },
    { if: (c) => target(c) === 'office', then: 'dictaphone' },
    { if: (c) => target(c) === 'precinct', then: 'seized' },
    { if: (c) => target(c) === 'clerk', then: 'jury' },
    'files',
    'copies',
    { oneOf: [{ beat: 'fire-alarm', weight: 2 }, { beat: 'prout-late', weight: 1 }] },
    'count',
  ],
  close(c) {
    const burned = c.memo.burned ?? 0;
    c.remember(
      burned
        ? `A spokesman for the District Attorney’s office denied that any files relating to the Benedetto prosecution were “missing,” then said they were “temporarily elsewhere,” then declined to comment. ${burned >= 3 ? 'ADA Wendell Prout was seen running in the rain at 5 a.m.' : ''}`
        : 'A fire alarm at the District Attorney’s office overnight was a false alarm, officials said.',
      { courier: burned ? 'DA’S FILES “TEMPORARILY ELSEWHERE”' : 'FALSE ALARM AT DA’S OFFICE' },
    );
  },
  defs: {
    which: {
      engine: 'vote', time: '10:30 P.M.', place: 'Nonna’s kitchen', title: 'The Cleanup', kicker: 'A VOTE',
      text: (c) => [
        `The Case File stands at ${c.caseFileValue}. Morty Klein says that’s ${c.caseFileValue >= 7 ? '“a life sentence with extra steps”' : '“very, very thick”'}. Two nights left. There is only one thing to do about a thick folder.`,
        'Where do you go to make some of it disappear?',
      ],
      options: (c) => [
        { id: 'office', label: 'Prout’s office', blurb: 'The fourth floor of the DA’s building. Prout’s secretary Marjorie works late. Somebody talks; everybody else knows something about Marjorie.', risk: 0.5, reward: 0.7 },
        { id: 'precinct', label: 'The evidence room', blurb: 'The basement of the 9th Precinct. Ray Mancuso can get you to the door, for a price. After that it’s a roll.', risk: 0.6, reward: 0.6, details: [`${money(c.scale(20000))} to Ray, out of the Bag.`, `A roll: ${c.odds(2, 7)}.`] },
        { id: 'clerk', label: 'The clerk’s office', blurb: 'The court clerk’s office, where the exhibits wait for Monday. Everybody has to pull their weight.', risk: 0.5, reward: 0.5, details: ['Hidden effort.'] },
      ],
      angles(c) {
        const ps = c.rng.shuffle(c.free.map((p) => p.id));
        const out = {};
        const named = c.players.filter((p) => c.flag(`named:${p.id}`)?.length);
        if (ps[0]) out[ps[0]] = { option: 'office', text: 'Prout’s office. There’s a file in there with your name on it — you know because Prout told you, in the Room. If it’s the office, you’ll know exactly which drawer.' };
        if (ps[1]) { out[ps[1]] = { option: 'precinct', text: `The evidence room. Ray will want ${money(c.scale(20000))} from the Bag; he’ll give ${money(10000)} of it back to you, because you went to school with his sister.` }; c.memo.raySchool = ps[1]; }
        for (const id of ps.slice(2)) out[id] = { option: null, text: named.some((p) => p.id === id) ? 'Somebody named you to Prout. Somewhere in his files is exactly who.' : 'No angle. Just a folder that needs to get thinner.' };
        return out;
      },
      resolve(c, { choice }) {
        c.set('cleanupTarget', choice);
        if (choice === 'precinct') {
          const n = c.bagTake(c.scale(20000));
          c.line(`${money(n)} out of the Bag to Ray Mancuso, who counts it in the car and says the side door will be open at two.`);
          const r = c.memo.raySchool;
          if (r && !c.isAway(r)) { c.give(r, 10000, 'Ray Mancuso'); c.note(r, `Ray gave you ${money(10000)} back. “For my sister.”`, 'Ray Mancuso'); }
        } else c.line(choice === 'office' ? 'Prout’s office. Somebody buys flowers, and pastries, and a clipboard, just in case.' : 'The clerk’s office. Everybody will need to pull their weight.');
      },
    },

    marjorie: {
      engine: 'whispers', time: '11:15 P.M.', place: 'The fourth floor, the District Attorney’s building', title: 'Marjorie', kicker: 'ONE OF YOU TALKS',
      whoLabel: 'Marjorie Kessler, Prout’s secretary, working late',
      text: (c) => {
        const t = c.freeByJob('talker')?.name ?? 'Somebody';
        return [`Marjorie Kessler has been Prout’s secretary for six years and is at her desk outside his office at a quarter past eleven, typing. ${t} gets out of the elevator. Marjorie looks up over her glasses.`, `Everybody else knows one thing about Marjorie.`];
      },
      openings: () => MARJORIE,
      filler: () => FILLER,
      resolve(c, { success, openingLabel, talker }) {
        c.memo.inClean = success;
        if (success) { c.line(`${c.name(talker)} tried ${openingLabel.replace(/[“”]/g, '').replace(/\.$/, '')}. Marjorie smiled, which nobody has ever seen, and went for her coffee break. The door to Prout’s office wasn’t even locked.`); return; }
        c.line(`${c.name(talker)} tried ${openingLabel.replace(/[“”]/g, '').replace(/\.$/, '')}. Marjorie took off her glasses, looked at ${c.name(talker)} for a long time, and wrote something down. You get into the office. You don’t get long.`);
        c.heat(talker, 1, 'Marjorie wrote it down');
      },
    },

    'evidence-room': {
      engine: 'roll', time: '2:00 A.M.', place: 'The basement of the 9th Precinct', title: 'The Evidence Room', kicker: 'THE DICE',
      text: () => ['Ray left the side door open, as promised. Down the stairs, past the boiler, to a cage full of cardboard boxes. The desk sergeant is upstairs, watching the Knicks, forty feet away.'],
      target: () => 7,
      label: 'Past the desk sergeant',
      stakes: 'Miss it and you’re in, but somebody heard the stairs.',
      resolve(c, r) {
        c.memo.inClean = r.success;
        c.line(r.success ? 'Down the stairs without a creak. The Knicks were winning. The cage was open.' : 'The third stair creaked like a gunshot. The Knicks went to a commercial. You’re in, but somebody upstairs is putting on his shoes.');
      },
    },

    'clerks-office': {
      engine: 'plan', time: '1:00 A.M.', place: 'The court clerk’s office, the courthouse', title: 'The Clerk’s Office', kicker: 'EVERYBODY PULLS THEIR WEIGHT',
      text: () => ['A window on the third floor that doesn’t lock properly, a ladder from the church, and a cleaning cart borrowed from the ground floor. Everybody has a part.', 'Help (the ladder and a lookout: $10k), coast, or quietly make it go wrong. Nobody sees who did what.'],
      target: (c) => c.free.length + 4,
      cost: () => 10000,
      labels: () => ({ help: 'Hold the ladder and pay the lookout', coast: 'Stand at the bottom', sabotage: 'Wobble the ladder' }),
      resolve(c, r) {
        c.memo.inClean = r.success;
        c.line(r.success ? 'In through the window, quiet as a church. The exhibits for Monday are on a trolley, labelled.' : 'The ladder went over with a noise that woke a pigeon and a night watchman. You’re in. You’re not in for long.');
      },
    },

    dictaphone: {
      engine: 'vote', time: '1:50 A.M.', place: 'Prout’s office', title: 'The Dictaphone', kicker: 'A VOTE',
      text: (c) => [
        `Prout’s office is exactly as neat as you’d think: eleven marathon medals, a photograph of a dog that isn’t his, and on the desk a dictaphone with a tape in it, labelled “MON — OPENING — BENEDETTO.” ${c.memo.inClean ? 'Marjorie won’t be back for twenty minutes.' : 'Marjorie is already on the phone to somebody.'}`,
        'Prout talks to that machine every night about Monday. What do you do with it?',
      ],
      options: (c) => [
        { id: 'listen', label: 'Play it back', blurb: 'Hear what Prout thinks he has. It takes time you’ll miss at the files.', risk: 0.3, reward: 0.7 },
        { id: 'erase', label: 'Erase it', blurb: 'His opening, gone. He’ll know somebody was here, and he’ll know which somebody talked to Marjorie.', risk: 0.5, reward: 0.5 },
        { id: 'leave', label: 'Leave it', blurb: 'Don’t touch anything that isn’t a file.', risk: 0, reward: 0.1 },
      ],
      resolve(c, { choice }) {
        const talker = c.freeByJob('talker');
        if (choice === 'listen') {
          c.memo.slow = true;
          const deals = c.players.filter((p) => p.deal).length;
          const rat = c.players.find((p) => p.secret?.id === 'rat' && !c.isAway(p.id));
          const job = rat?.job ? c.g.chapter.jobs[rat.job]?.name : null;
          const heard = [`Prout’s voice, tinny: “…the People will show that the defendant’s own associates…” ${deals ? `He mentions ${deals === 1 ? 'one witness' : `${deals} witnesses`} “from inside the defendant’s circle.”` : 'He doesn’t mention a single witness by name. He sounds worried about that.'}`];
          if (job && c.rng.chance(0.6)) heard.push(`Then, off the record, muttering: “Remember to thank my friend — ${job.toLowerCase()} — personally.”`);
          c.line(heard.join(' '));
          return;
        }
        if (choice === 'erase') {
          c.caseFile(-1, 'Prout’s opening statement, erased');
          if (talker) c.heat(talker.id, 1, 'Prout knows who talked to Marjorie');
          c.line(`Forty minutes of Prout erased with the push of a button. On Monday morning he’ll be working from memory, and he’ll know exactly who ${talker ? `${talker.name} was` : 'was here'}.`);
          return;
        }
        c.line('Nobody touches the dictaphone.');
      },
    },

    seized: {
      engine: 'vote', time: '2:10 A.M.', place: 'The evidence cage, 9th Precinct', title: 'The Evidence Bags', kicker: 'A VOTE',
      text: (c) => [
        `Next to the files, on a metal shelf: clear plastic evidence bags of cash, each with a name and a date. ${c.players.some((p) => (p.stats?.seized ?? 0) > 0) ? `Some of the names are yours: ${c.list(c.players.filter((p) => (p.stats?.seized ?? 0) > 0).map((p) => p.name))}.` : 'None of the names are yours. All of the money is somebody’s.'}`,
        'Money that goes missing from an evidence cage gets noticed. What do you do?',
      ],
      options: () => [
        { id: 'ours', label: 'Take back what’s ours', blurb: 'Everything seized from anybody at this table this week. Prout will notice the shelf.', risk: 0.5, reward: 0.6 },
        { id: 'all', label: 'Take all of it', blurb: 'Everybody’s, not just ours. The shelf will be empty, and very noticeable.', risk: 0.8, reward: 0.8 },
        { id: 'files', label: 'Leave the money, stick to the files', blurb: 'You came for paper.', risk: 0, reward: 0.1 },
      ],
      resolve(c, { choice }) {
        if (choice === 'files') { c.line('The money stays on the shelf. Everybody looks at it on the way past.'); return; }
        let back = 0;
        for (const p of c.free) {
          const n = Math.min(p.stats?.seized ?? 0, 30000);
          if (n) { back += c.give(p.id, n, 'the evidence shelf'); p.stats.seized -= n; }
        }
        if (choice === 'all') {
          const extra = round5k(c.scale(40000));
          const each = round5k(extra / Math.max(1, c.free.length));
          for (const p of c.free) back += c.give(p.id, each, 'the evidence shelf');
          c.caseFile(2, 'an empty shelf in the evidence cage');
          c.line(`The whole shelf goes into a laundry bag: ${money(back)} between you. The desk sergeant is going to have a very bad morning, and so is whoever Prout blames for it.`);
          return;
        }
        c.caseFile(1, 'evidence bags missing from the 9th Precinct');
        c.line(back ? `Every bag with one of your names on it: ${money(back)}, back where it belongs. The gaps on the shelf are shaped exactly like you.` : 'There’s nothing on the shelf with your names on it. You take nothing, and still leave a gap somebody will notice.');
      },
    },

    jury: {
      engine: 'vote', time: '1:40 A.M.', place: 'The court clerk’s office', title: 'The Jury List', kicker: 'A VOTE',
      text: (c) => [
        `In the clerk’s in-tray, clipped to Monday’s docket: the jury list for courtroom 4B. Twelve names, twelve addresses, and in the margin, in the clerk’s pencil, little notes. Juror four: “retired longshoreman.” Juror nine: “knew a Benedetto once, says it won’t matter.”`,
        'This is the kind of paper people go to prison for looking at. What do you do?',
      ],
      options: () => [
        { id: 'copy', label: 'Copy it for Morty', blurb: 'Morty with a jury list is a different Morty. If anybody ever finds out, it’s the end of the case — the wrong end.', risk: 0.8, reward: 0.8 },
        { id: 'nine', label: 'Just remember juror nine', blurb: 'One name, one address, in your head. Morty can decide what it’s worth.', risk: 0.4, reward: 0.4 },
        { id: 'leave', label: 'Put it back in the tray', blurb: 'You never saw it. Nobody can say you did.', risk: 0, reward: 0.1 },
      ],
      resolve(c, { choice }) {
        if (choice === 'leave') { c.line('The jury list goes back in the tray, clip and all. Nobody ever saw it.'); return; }
        if (choice === 'copy') {
          if (c.rng.chance(0.5)) { c.set('juryEdge', -2); c.line('The clerk’s copier is warm by the time you’re done. Morty will get twelve names in an envelope with no return address, and on Monday he’ll pick a jury like a man who’s read the answers.'); }
          else { c.set('juryEdge', 1); c.caseFile(1, 'a copier log that shows a jury list copied at 1:42 a.m.'); c.line('The copier keeps a log. Somebody reads it on Monday morning before the judge does. It is very, very bad for Sal.'); }
          return;
        }
        if (c.rng.chance(0.5)) {
          c.line('Juror nine: Theresa Colucci, Pleasant Avenue. On Monday the judge dismisses her for knowing the defendant’s mother from church. It was a good name. It was the wrong name.');
          return;
        }
        c.set('juryEdge', -1);
        c.line('Juror nine: Theresa Colucci, Pleasant Avenue. Somebody writes it on the inside of their wrist in biro. Morty will know what to do with it. Probably.');
      },
    },

    copies: {
      engine: 'vote', time: '2:30 A.M.', place: (c) => ({ office: 'Marjorie’s desk', precinct: 'The property clerk’s window', clerk: 'The clerk’s copier' }[target(c)]), title: 'The Copies', kicker: 'A VOTE',
      when: (c) => (c.memo.burned ?? 0) > 0,
      text: (c) => [
        `On the way out, somebody sees the tray: photocopies of everything you just burned, made on Friday, “in case,” in ${target(c) === 'office' ? 'Marjorie’s' : 'somebody’s'} neat hand on a Post-it. ${c.memo.inClean ? 'There’s time to do something about it.' : 'There isn’t much time to do anything about it.'}`,
        'What do you do with the copies?',
      ],
      options: (c) => [
        { id: 'burn', label: 'Burn them too', blurb: 'Somebody stays behind to do it properly. They’ll be the last one out.', risk: c.memo.inClean ? 0.3 : 0.6, reward: 0.6 },
        { id: 'take', label: 'Take them', blurb: 'Copies of Prout’s case are worth something to somebody. Somebody carries them, and owns them.', risk: 0.4, reward: 0.5 },
        { id: 'leave', label: 'Leave them', blurb: 'Whatever you burned tonight, Prout gets some of it back.', risk: 0.2, reward: 0 },
      ],
      resolve(c, { choice }) {
        const who = c.rng.pick(c.free);
        if (choice === 'burn') {
          c.caseFile(-1, 'the photocopies, burned in the same wastepaper basket');
          if (!c.memo.inClean || c.rng.chance(0.3)) c.heat(who.id, 1, 'last one out');
          c.line(`${who.name} stays behind with the copies and a lighter and is the last one out, smelling of smoke.`);
        } else if (choice === 'take') {
          c.card(who.id, 'dirt');
          c.line(`${who.name} folds the copies into their coat. Copies of Prout’s case, in the wrong hands. Everybody saw whose hands.`);
        } else {
          c.caseFile(1, 'photocopies made on Friday, “in case”');
          c.line('The copies stay in the tray. On Monday, some of what you burned tonight will turn up anyway, slightly grey.');
        }
      },
    },

    files: {
      engine: 'draft', time: '2:20 A.M.', place: (c) => ({ office: 'Prout’s office', precinct: 'The evidence cage', clerk: 'The exhibits trolley' }[target(c)]), title: 'The Files', kicker: 'TAKE ONE, PASS THE BOX',
      text: (c) => [
        `Folders and boxes, in Prout’s handwriting. ${c.memo.inClean ? 'You have time.' : 'You don’t have long.'} Everybody takes one thing — to burn, or to keep — and passes it on. Everybody sees what everybody takes.`,
        'Whatever’s left stays in the case.',
      ],
      items(c) {
        const n = c.free.length;
        const out = [];
        const pool = [];
        pool.push({ id: 'bank', label: `The file on the ${({ 'first-federal': 'First Federal', harbor: 'Harbor Savings', castellano: 'Castellano Credit Union' })[c.flag('bank')] ?? 'bank'} job`, blurb: 'Burn it: the Case File goes down by one.', kind: 'burn', value: 25000, safe: true });
        pool.push({ id: 'photos', label: 'Surveillance photographs', blurb: 'Three hundred pictures of Nonna’s front door. Burn them: the Case File goes down by one.', kind: 'burn', value: 25000, safe: true });
        if (c.flag('gary') === 'prout') pool.push({ id: 'gary', label: 'Gary Feld’s statement', blurb: 'Two hundred and twelve pages. Burn it and Gary is just a nervous accountant: the Case File goes down by two.', kind: 'gary', value: 40000, safe: true });
        for (const p of c.rng.shuffle(c.players).slice(0, Math.max(1, Math.ceil(n / 2)))) {
          pool.push({ id: `person-${p.id}`, label: `The file on ${p.name}`, blurb: `Burn it, and ${p.name} loses a heat. Keep it, and it’s dirt on ${p.name}.`, kind: 'person', about: p.id, value: 20000 });
        }
        pool.push({ id: 'cash', label: 'An evidence bag of cash', blurb: `${money(c.scale(25000))} seized from somebody, sometime. It’s nobody’s now.`, kind: 'cash', value: c.scale(25000) });
        if (!c.flag('photoGiven')) pool.push({ id: 'photo', label: 'An envelope marked “PERSONAL”', blurb: 'Prout at a Castellano wedding in 2019, holding a cannoli.', kind: 'card', card: 'the-photo', value: 35000 });
        pool.push({ id: 'page', label: 'A page of the ledger', blurb: 'Prout was keeping it for Monday.', kind: 'page', value: 30000 });
        const must = pool.filter((it) => it.kind === 'burn' || it.kind === 'gary');
        const rest = c.rng.shuffle(pool.filter((it) => !must.includes(it)));
        out.push(...must, ...rest);
        // time spent on the tape is time not spent on the files
        return c.rng.shuffle(out.slice(0, c.memo.slow ? Math.max(2, n) : n + 1));
      },
      bot(c, p, open) {
        const own = open.find((it) => it.kind === 'person' && it.about === p.id);
        if (own) return own.id;
        if (p.secret?.id === 'garys-friend') { const g = open.find((it) => it.kind === 'gary'); if (g) return g.id; }
        if (p.secret?.id === 'collector') { const pg = open.find((it) => it.kind === 'page'); if (pg) return pg.id; }
        if (p.secret?.id === 'rat') { const cash = open.find((it) => it.kind === 'cash'); if (cash) return cash.id; }
        return null;
      },
      resolve(c, { picks }) {
        const items = c.beat.data.items;
        let burned = 0;
        for (const [pid, id] of Object.entries(picks)) {
          const it = items.find((x) => x.id === id);
          if (it.kind === 'burn') { burned += 1; c.caseFile(-1, `${c.name(pid)} burned ${lowerFirst(it.label)}`); }
          else if (it.kind === 'gary') { burned += 2; c.set('gary', 'burned'); c.caseFile(-2, `${c.name(pid)} burned Gary Feld’s statement`); }
          else if (it.kind === 'person') {
            if (it.about === pid) { burned += 1; c.p(pid).heat = Math.max(0, c.p(pid).heat - 1); c.line(`${c.name(pid)} took their own file and burned it in a wastepaper basket.`); c.caseFile(-1, `a file went up in smoke`); }
            else { c.card(pid, 'dirt'); c.line(`${c.name(pid)} kept the file on ${c.name(it.about)}. ${c.name(it.about)} saw.`); c.g.bond(pid, it.about, 'kept-file'); }
          } else if (it.kind === 'cash') { c.give(pid, it.value, 'an evidence bag'); c.line(`${c.name(pid)} took the evidence bag of cash.`); }
          else if (it.kind === 'card') { c.card(pid, it.card); c.set('photoGiven', pid); c.line(`${c.name(pid)} took the envelope marked PERSONAL.`); }
          else if (it.kind === 'page') {
            const card = c.card(pid, 'ledger-page');
            const about = c.rng.pick(c.players.filter((q) => q.id !== pid));
            if (card && about) { card.about = about.id; card.line = `${about.name} — page ${c.rng.int(3, 310)}`; }
            c.line(`${c.name(pid)} took the page of the ledger. ${about ? `${about.name}’s name is on it.` : ''}`);
          }
        }
        c.memo.burned = burned;
      },
    },

    'fire-alarm': {
      engine: 'roll', time: '2:40 A.M.', place: 'The stairwell', title: 'The Fire Alarm', kicker: 'GET OUT',
      text: (c) => [`Somebody’s burning files, and burning files make smoke, and smoke makes the fire alarm go off in every building in the city that has ever been built. ${c.memo.inClean ? '' : 'And somebody was already coming.'}`],
      target: (c) => 6 + (c.memo.inClean ? 0 : 2),
      label: 'Down six flights with the sprinklers on',
      stakes: 'Miss it and you’re seen coming out, and the fire marshal writes a very thorough report.',
      resolve(c, r) {
        if (r.success) { c.line('Down the stairs, out the side door, and across the street to watch the fire trucks arrive with everybody else. Somebody bought a pretzel.'); return; }
        c.line('Out the side door straight into the arms of the first fire truck. The fire marshal wants names. The fire marshal gets faces.');
        for (const p of c.free) c.heat(p.id, 1, 'the fire alarm');
        c.caseFile(1, 'the fire marshal’s report');
      },
    },

    'prout-late': {
      engine: 'story', time: '2:40 A.M.', place: 'The elevator', title: 'Prout Works Late', kicker: 'SOMETHING’S WRONG',
      run(c) {
        const who = c.rng.pick(c.free);
        if (!who) return;
        if (c.rng.chance(0.5)) {
          c.line(`${who.name} held the door and said “Evening, counselor.” Prout said “Evening,” and got out on six. He didn’t look back. He didn’t need to.`);
          c.heat(who.id, 1, 'Prout saw your face');
        } else {
          c.line(`Prout was so tired he didn’t look up from his shoes the whole way down. He got out in the lobby and went for a run. At three in the morning. In the rain.`);
        }
      },
      text: () => ['The elevator stops on the fourth floor on the way down. The doors open. It’s Wendell Prout, in running clothes, with a gym bag, going home at a quarter to three.'],
    },

    count: counting({ time: '4:00 A.M.' }),
  },
};

export { round5k };
