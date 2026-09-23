// The Confessional: Father Dominic has been taping confessions since 1994,
// "for the archive". Everybody at this table is on one of those tapes.

import { counting, money, nightDay, nightKicker } from '../common.js';

const DOMINIC = [
  { id: 'confess', label: 'Confess something real first.',
    yes: 'Father Dominic only helps people who confess something true first. He can always tell.',
    no: 'Father Dominic has heard enough real confessions this week to last him till Easter. He wants to talk about anything else.' },
  { id: 'roof', label: '“We’re here about the roof fund, Father.”',
    yes: 'The roof of St. Anthony’s leaks onto the altar. Dominic has begged for the roof fund every Sunday since Lent.',
    no: 'The Castellanos paid for the roof in March. Dominic is sick of being reminded who paid for the roof.' },
  { id: 'aldo', label: '“How’s your brother, Father? Aldo, in Palermo?”',
    yes: 'Dominic’s brother Aldo in Palermo is very ill. Dominic loves anybody who remembers to ask.',
    no: 'Dominic and his brother Aldo haven’t spoken since a funeral in 1983. Don’t mention Aldo.' },
  { id: 'scripture', label: 'Quote scripture at him.',
    yes: 'Dominic can’t resist a quotation. He finishes it for you, and then he’s yours.',
    no: 'Dominic says the devil can cite scripture, and he says it every time anybody tries.' },
];

const FILLER = [
  'Father Dominic keeps a bottle of Strega behind the Stations of the Cross, at the ninth station.',
  'The confessional smells of candle wax and, faintly, cigars.',
  'Dominic has been at St. Anthony’s for forty-one years and has buried half the neighbourhood.',
  'There is a Mets schedule taped inside the confessional door.',
];

export default {
  id: 'confessional', title: 'The Confessional', day: nightDay, kicker: nightKicker,
  beats: [
    'esposito',
    'father',
    'tapes',
    'second-box',
    { maybe: 'street', chance: 0.2 },
    'plate',
    'strega',
    'count',
  ],
  close(c) {
    c.remember(
      c.memo.plate >= c.scale(30000)
        ? `St. Anthony’s parish reports an “astonishing” midweek collection, which Father Dominic Amato attributed to “a sudden outbreak of conscience.” The roof will be fixed by Easter.`
        : 'Father Dominic Amato of St. Anthony’s has asked parishioners to “remember the roof fund,” and also “whoever took the tapes.”',
      { courier: 'MIRACLE AT ST. ANTHONY’S?' },
    );
  },
  defs: {
    esposito: {
      engine: 'vote', time: '10:20 P.M.', place: 'The side door of St. Anthony’s', title: 'Mrs. Esposito', kicker: 'A VOTE',
      text: () => [
        'The side door of St. Anthony’s is open, and inside, doing the flowers for Sunday at twenty past ten at night, is Mrs. Esposito — who told Nonna about the tapes, and who tells everybody everything, and who has never once in her life been asked to leave a church.',
        'What do you do about Mrs. Esposito?',
      ],
      options: () => [
        { id: 'help', label: 'Help her with the flowers', blurb: 'All of you, for an hour. She’ll tell everybody you were at church, which is, technically, an alibi.', risk: 0.2, reward: 0.4 },
        { id: 'wait', label: 'Wait in the car until she goes', blurb: 'She does the flowers slowly. Father Dominic might go to bed.', risk: 0.4, reward: 0.3 },
        { id: 'past', label: 'Walk straight past her', blurb: 'Nod, genuflect, keep going. She will have a lot to say about it by morning.', risk: 0.6, reward: 0.3 },
      ],
      resolve(c, { choice }) {
        if (choice === 'help') {
          for (const p of c.free) if (p.heat > 0 && c.rng.chance(0.3)) p.heat -= 1;
          c.line('An hour of gladioli. Mrs. Esposito tells everybody on the phone tree that you were all at church on a Thursday night, and some of the neighbourhood believes it.');
        } else if (choice === 'wait') {
          if (c.rng.chance(0.5)) c.line('She leaves at eleven. Father Dominic is still up, in the box, listening to the Mets.');
          else { c.memo.dominicTired = true; c.line('She leaves at a quarter to twelve. Father Dominic is still in the box, but he is very tired and very short with everybody.'); }
        } else {
          const who = c.rng.pick(c.free);
          if (who) c.heat(who.id, 1, 'Mrs. Esposito’s phone tree');
          c.line(`Everybody walks past Mrs. Esposito. By breakfast half the parish knows that ${who?.name ?? 'somebody'} was in St. Anthony’s at half ten on a Thursday, in a hurry.`);
        }
      },
    },

    'second-box': {
      engine: 'vote', time: '11:50 P.M.', place: 'The sacristy', title: 'The Second Box', kicker: 'A VOTE',
      text: () => [
        'Under the first shoebox, a second one, older, with a rubber band round it and one word on the lid in Dominic’s neat hand: CASTELLANO. Thirty years of the other side of the river, telling Father Dominic everything.',
        'What do you do with it?',
      ],
      options: () => [
        { id: 'nonna', label: 'Take it to Nonna', blurb: 'She’ll know what to do with it. It might end a war. It might start a worse one.', risk: 0.3, reward: 0.5 },
        { id: 'sell', label: 'Sell it to Prout', blurb: '$10k each from Prout’s man. Prout goes after the Castellanos for a while, and the Castellanos will find out who sold them.', risk: 0.6, reward: 0.6 },
        { id: 'leave', label: 'Put it back', blurb: 'Some things belong to God. And to the Castellanos.', risk: 0, reward: 0.1 },
      ],
      resolve(c, { choice }) {
        if (choice === 'nonna') {
          c.set('castellanoTapes', true);
          if (c.flag('war')) { c.set('war', false); c.set('truce', 'tapes'); c.line('Nonna listens to one tape, with her eyes closed, and makes one phone call across the river. The war is over by morning. Nobody asks what was on the tape.'); }
          else c.line('Nonna puts the box on top of the wardrobe without opening it. “Insurance,” she says.');
        } else if (choice === 'sell') {
          for (const p of c.free) c.give(p.id, 10000, 'Prout’s man');
          c.set('war', true);
          c.caseFile(-1, 'Prout spent a week on the Castellanos instead');
          c.line(`${money(10000 * c.free.length)} from Prout’s man at the curb. Prout will spend the next week across the river. The Castellanos will spend it finding out who.`);
        } else c.line('The CASTELLANO box goes back under the first one, rubber band and all.');
      },
    },

    strega: {
      engine: 'vote', time: '12:30 A.M.', place: 'The sacristy, a bottle of Strega', title: 'The Priest’s Confession', kicker: 'PICK ONE OF YOU',
      text: (c) => [
        `Father Dominic takes the bottle of Strega from behind the ninth station, pours ${c.free.length} small glasses, and sits down heavily. “Forty-one years I have listened,” he says. “Tonight one of you listens to me.”`,
        'Pick who stays behind to hear Father Dominic’s confession. Whatever he says, only they will know.',
      ],
      candidates: (c) => c.free.map((p) => p.id),
      noSelf: false,
      resolve(c, { choice }) {
        const others = c.others(choice).filter((q) => q.secret);
        const t = others.length ? c.rng.pick(others) : null;
        c.line(`${c.name(choice)} stays. Everybody else waits on the church steps for forty minutes and doesn’t ask.`);
        if (!t) { c.note(choice, 'Father Dominic confesses that he has never once believed a word anybody told him in that box. Then he falls asleep.', 'Father Dominic'); return; }
        const sv = c.g.chapter.secretView(c, t);
        c.note(choice, `Father Dominic, on his third glass, confesses that he broke the seal once this week, to himself: ${t.name} told him what they want. “${sv.name}.” He makes you promise to forget it. You don’t.`, 'Father Dominic');
        c.g.bond(choice, t.id, 'heard');
      },
    },

    father: {
      engine: 'whispers', time: '10:40 P.M.', place: 'St. Anthony’s, the second confessional on the left', title: 'Father Dominic', kicker: 'ONE OF YOU TALKS',
      whoLabel: 'Father Dominic, forty-one years at St. Anthony’s',
      text: (c) => {
        const t = c.freeByJob('talker')?.name ?? 'Somebody';
        return [
          `Nonna has it on good authority — Mrs. Esposito, who does the flowers — that Father Dominic has been taping confessions since 1994, “for the archive.” Every one of you has been to confession at St. Anthony’s. ${c.rng.pick(['Dominic is in the box now, hearing nobody, eating a cannoli.', 'Dominic is in the box, and by the sound of it he has the Mets game on a transistor.'])}`,
          `${t} goes in and kneels. The grille slides open. Everybody else knows one thing about Father Dominic.`,
        ];
      },
      openings: () => DOMINIC,
      filler: () => FILLER,
      resolve(c, { success, openingLabel, talker }) {
        if (success) {
          c.line(`${c.name(talker)} started with ${openingLabel.replace(/[“”]/g, '').replace(/\.$/, '')}. Father Dominic sighed, got up, unlocked the sacristy, and handed over a shoebox full of cassettes. “For the archive,” he said. “God has copies.”`);
          return;
        }
        const alt = c.free.find((p) => p.job === 'altarboy');
        if (alt) {
          c.line(`${c.name(talker)} started with ${openingLabel.replace(/[“”]/g, '').replace(/\.$/, '')}. It went badly, until Father Dominic saw ${alt.name} at the back of the church, remembered who served him Mass for six years, and handed over the tapes anyway.`);
          return;
        }
        const n = c.charge(talker, c.scale(15000));
        c.line(`${c.name(talker)} started with ${openingLabel.replace(/[“”]/g, '').replace(/\.$/, '')}. Father Dominic was quiet for a long time. Then he said it would cost ${money(n)} for the roof, took it through the grille, and made a phone call before he handed over the tapes.`);
        c.heat(talker, 1, 'Father Dominic made a phone call');
      },
    },

    tapes: {
      engine: 'choose', time: '11:30 P.M.', place: 'The sacristy', title: 'The Tapes', kicker: 'YOUR CALL',
      text: (c) => [
        `A shoebox of cassettes, labelled in a very neat hand: a name, a date, and sometimes a word like ${c.rng.pick(['“ADULTERY”', '“TAXES”', '“THE DOG”', '“AGAIN”'])}. There is one with each of your names on it. There is a tape player in the sacristy that Dominic uses for choir practice.`,
        'Everybody decides alone. Burn your own, and nobody can use it. Listen to somebody else’s and learn what they want this week. Keep somebody’s as dirt. Or sell somebody’s to Prout, who is very interested in tapes. Nobody sees what anybody chose — you only find out what happened to yours.',
      ],
      who: (c) => c.free.map((p) => p.id),
      options: (c, pid) => {
        const others = c.players.filter((p) => p.id !== pid).map((p) => p.id);
        return [
          { id: 'burn', label: 'Burn yours', blurb: 'In the sacristy sink. Whatever anybody else wanted to do with it, they can’t.', honest: true },
          { id: 'listen', label: 'Listen to somebody’s', blurb: 'Learn what they want this week.', target: 'other', targets: others },
          { id: 'dirt', label: 'Keep somebody’s', blurb: 'In your coat. It works like Dirt: sign over 20% of Monday, or everybody hears it.', target: 'other', targets: others },
          { id: 'sell', label: 'Sell somebody’s to Prout', blurb: `${money(c.scale(25000))} from Prout’s man at the curb. They take a heat, and Prout’s folder gets thicker.`, target: 'other', targets: others, greedy: true },
        ];
      },
      fallback: () => ({ option: 'burn' }),
      bot(c, p) {
        const r = c.rng();
        const enemy = Object.entries(p.grudges).find(([, n]) => n > 0)?.[0] ?? (['grudge', 'snake'].includes(p.secret?.id) ? p.secret.target : null);
        const others = c.players.filter((q) => q.id !== p.id);
        if (p.secret?.id === 'rat' && r < 0.5) return { option: 'sell', target: enemy ?? c.rng.pick(others).id };
        if (enemy && (p.style === 'snake' || p.style === 'wild') && r < 0.5) return { option: r < 0.25 ? 'sell' : 'dirt', target: enemy };
        if (p.style === 'nervous' || p.style === 'loyal') return r < 0.75 ? { option: 'burn' } : { option: 'listen', target: c.rng.pick(others).id };
        if (r < 0.45) return { option: 'burn' };
        return { option: r < 0.75 ? 'listen' : 'dirt', target: c.rng.pick(others).id };
      },
      resolve(c, { choices }) {
        const burned = new Set(Object.entries(choices).filter(([, ch]) => ch.option === 'burn').map(([pid]) => pid));
        for (const [pid, ch] of Object.entries(choices)) {
          if (ch.option === 'burn') continue;
          const t = c.p(ch.target);
          if (!t) continue;
          if (burned.has(t.id)) {
            c.note(pid, `${t.name}’s tape was already ash in the sacristy sink. They got there first.`, 'the sacristy');
            continue;
          }
          if (ch.option === 'listen') {
            const sv = c.g.chapter.secretView(c, t);
            c.note(pid, `On the tape, ${t.name} tells Father Dominic what they want this week: “${sv.name}” — ${sv.text}`, 'the tape');
            c.g.bond(pid, t.id, 'listened');
          } else if (ch.option === 'dirt') {
            c.card(pid, 'dirt');
            c.note(pid, `You kept ${t.name}’s tape. It’s in your coat, and it’s a Dirt card now: use it on anybody, but it works best on them.`, 'the tape');
          } else if (ch.option === 'sell') {
            c.give(pid, c.scale(25000), 'Prout’s man');
            c.heat(t.id, 1, 'a tape on Prout’s desk');
            c.caseFile(1, `a confession on a cassette`, true);
            c.note(t.id, 'Somebody sold your tape to Prout. It’s on his desk. You don’t know who.', 'Prout');
            c.fact(pid, 'soldTape', `Did ${c.name(pid)} sell somebody’s tape to Prout?`, true);
            c.g.bond(pid, t.id, 'sold-tape');
            c.betray(pid, t.id, 'sold their tape');
          }
        }
        for (const [pid, ch] of Object.entries(choices)) if (ch.option !== 'sell') c.fact(pid, 'soldTape', `Did ${c.name(pid)} sell somebody’s tape to Prout?`, false);
        const sold = Object.values(choices).filter((ch) => ch.option === 'sell' && !burned.has(ch.target)).length;
        c.line(sold ? `By midnight, Prout’s man at the curb has ${sold === 1 ? 'a tape' : `${sold} tapes`} in his glovebox.` : 'Nobody sold anything to Prout. The man at the curb waited until one and drove away, looking hurt.');
        if (burned.size) c.line(`${burned.size === 1 ? 'One tape' : `${burned.size} tapes`} went in the sacristy sink. The smoke alarm went off, and Father Dominic took the battery out without looking up.`);
      },
    },

    plate: {
      engine: 'choose', time: '12:10 A.M.', place: 'The nave, St. Anthony’s', title: 'The Collection Plate', kicker: 'WHAT DO YOU GIVE?',
      text: (c) => [
        'On your way out Father Dominic is waiting in the aisle with the collection plate, and an expression that says he knows exactly what you took from his sacristy.',
        `Give what you like, out of your own pocket. If the plate comes to ${money(c.scale(30000))} or more, Dominic will have a word with the judge’s wife, who does the flowers with Mrs. Esposito. Only the total is read out.`,
      ],
      who: (c) => c.free.map((p) => p.id),
      amount: (c, pid) => ({ min: 0, max: Math.min(25000, c.p(pid).cash), step: 5000, label: 'On the plate', blurb: `You have ${money(c.p(pid).cash)}.` }),
      botAmount: (c, p) => ({ loyal: 0.5, nervous: 0.6, wild: 0.3, greedy: 0.1, snake: 0.05 }[p.style] ?? 0.3),
      resolve(c, { choices }) {
        let total = 0;
        let top = null;
        for (const [pid, ch] of Object.entries(choices)) {
          const n = c.charge(pid, ch.amount ?? 0);
          total += n;
          if (n > 0 && (!top || n > top.n)) top = { pid, n };
          c.fact(pid, 'plate', `Did ${c.name(pid)} put anything on the plate?`, n > 0);
        }
        c.memo.plate = total;
        if (total >= c.scale(30000)) {
          c.line(`The plate came to ${money(total)}. Father Dominic looked at it for a while, then crossed himself, then you. He’ll have a word.`);
          c.caseFile(-1, 'the judge’s wife has heard good things');
          if (top && c.p(top.pid).heat > 0) { c.p(top.pid).heat -= 1; c.note(top.pid, 'Father Dominic took you aside: “Whatever you did, it’s forgiven. Mostly.” One heat, gone.', 'Father Dominic'); }
        } else {
          c.line(`The plate came to ${money(total)}. Father Dominic said nothing, which from a priest is a sermon.`);
        }
      },
    },

    count: counting({ time: '1:15 A.M.' }),
  },
};
