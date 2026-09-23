// Monday, 6:10 a.m. Sal is arrested in his garden, and the week begins.

import { money } from '../common.js';
import { bioOptions, bioView } from '../bios.js';

export default {
  id: 'prologue', title: 'The Arrest', act: 0, interlude: true, day: 'MONDAY, 6:10 A.M.', kicker: 'PROLOGUE',
  beats: ['arrest', 'street', 'kitchen', 'club', 'who'],
  defs: {
    arrest: {
      engine: 'story', time: '6:10 A.M.', place: 'Sal’s garden, Mulberry Avenue', title: 'The Arrest', kicker: 'PROLOGUE',
      text(c) {
        const holding = c.rng.pick([
          'holding a watering can',
          'holding a tomato he was about to take to Nonna',
          'holding the Daily News open at the racing page',
          'holding a pair of pruning shears, which the arresting officer asked him, very politely, to put down',
        ]);
        const cop = c.rng.pick([
          'Ray Mancuso stood by the car the whole time and did not once look Sal in the eye.',
          'Ray Mancuso was there, pretending to be very interested in a hedge.',
          'Ray Mancuso read him his rights and got two of them wrong.',
        ]);
        return [
          `Salvatore “Sal” Benedetto — seventy-one, neighbourhood institution, three-time winner of the St. Anthony’s tomato fair — is arrested in his bathrobe, in his own garden, ${holding}. ${cop}`,
          'The charge is tax fraud. The problem is the ledger: thirty-one years of every favour, payoff and debt in this neighbourhood, in Sal’s handwriting, and it is no longer where Sal left it.',
          'Assistant District Attorney Wendell Prout wants the ledger. The Castellanos across the river want the neighbourhood. Sal’s lawyer wants money by next Monday.',
          'Sal wants you.',
        ];
      },
    },
    street: {
      engine: 'story', time: '7:40 A.M.', place: 'Mulberry Avenue, Ferry Street, and everywhere in between', title: 'The Neighbourhood', kicker: 'WHO’S WHO',
      text(c) {
        return [
          `By a quarter to eight the whole neighbourhood knows. ${c.rng.pick(['The bakery on Fifth has stopped pretending to sell bread and is just selling news.', 'The man who sells papers outside the subway is doing it from memory.', 'Somebody has already left a candle on Sal’s front step.'])} These are the people you’ll be dealing with this week.`,
          'Dolores, who has run the diner on Ferry Street since 1971, has the radio turned up and the coffee on for whoever comes in first. She hears everything said in that diner, and repeats about a tenth of it.',
          'Father Dominic is saying the eight o’clock Mass at St. Anthony’s to eleven widows and a man asleep in the back pew. He has already decided to pray for Sal. He hasn’t decided what for.',
          'Ray Mancuso, who read Sal his rights, is at the 9th Precinct typing it up very slowly with two fingers. Ray has been on three payrolls at once since 1989, and can tell you to the dollar what each of them pays.',
          'Walt Kowalski, seventy-three, has guarded Harbor Savings since 1979 and has heard about Sal on his transistor radio. He says a Hail Mary and pours another coffee from his thermos.',
          'Morty Klein, Sal’s lawyer, is in his office on Court Street with a cigar he claims not to smoke, doing arithmetic about his fee.',
          'Assistant District Attorney Wendell Prout ran six miles before sunrise and is already at his desk with the folder. He has been waiting eleven years for this folder.',
          'And Gary Feld, Sal’s accountant — the only other man alive who has read the ledger — hasn’t been seen since Sunday night.',
        ];
      },
    },
    kitchen: {
      engine: 'story', time: '8:30 A.M.', place: 'Nonna’s kitchen', title: 'Nonna’s Table', kicker: 'THE WEEK',
      dossier: (c, pid) => !c.families || c.familyOf(pid) === 'b',
      text(c) {
        const pot = c.rng.pick([
          'The espresso pot is on its second round.',
          'There is a plate of pignoli cookies nobody is allowed to touch.',
          'The radio is on low. It’s talking about Sal.',
        ]);
        return [
          `${pot} Nonna Benedetto — ninety-four, Sal’s mother, the actual power in this family — has put a 1994 Knicks gym bag on the kitchen table and unzipped it.`,
          `“Morty Klein wants ${money(c.bag.target)} by Monday,” she says. “Every night, you do what you have to do, you come back here, and you put in what you can. Prout has a folder on my son. Every stupid thing you do goes in it. Monday morning, the judge rolls the dice.”`,
          c.families
            ? `She looks at each of her own in turn — ${c.list(c.family('b').map((p) => p.name))} — and deals out the week: what you do for the family, what you want for yourself, and two cards.`
            : 'She looks at each of you in turn. Then she deals out the week: what you do for the crew, what you want for yourself, and two cards.',
          'Look at yours. Don’t show anybody. Nonna didn’t.',
        ];
      },
    },
    club: {
      engine: 'story', time: '9:00 A.M.', place: 'The Castellano social club, Front Street', title: 'Across the River', kicker: 'THE OTHER FAMILY',
      when: (c) => !!c.families,
      dossier: (c, pid) => c.familyOf(pid) === 'c',
      text(c) {
        return [
          `Across the river, at the same hour, Vinnie Castellano — sixty-six, cardigan over a shirt and tie, the only man in the neighbourhood Nonna calls by his full name — has ${c.list(c.family('c').map((p) => p.name))} in the back room of his social club, under the photograph of his father shaking hands with Sinatra.`,
          '“Sal Benedetto goes to court on Monday,” he says. “If he walks, nothing changes. If he doesn’t, this neighbourhood is ours by Christmas. Prout will need help. We are going to help him.”',
          'He puts a cigar box on the card table and calls it the Envelope. Then he deals out the week, the same way Nonna did, because they learned it from the same man.',
        ];
      },
    },
    who: {
      engine: 'choose', time: '8:45 A.M.', place: 'Around the table', title: 'Who You Are', kicker: 'BEFORE THE WEEK',
      text: (c) => [
        c.rng.pick([
          'Before anybody does anything, Nonna goes round the table the way she does at christenings, and makes everybody say who they are to this family. Everybody already knows. That isn’t the point.',
          'Nonna pours the second espresso and says, to the table, “Tell me who you are.” She knows. She wants to hear you say it.',
        ]),
        'Everybody has two ways to answer, and keeps one. Whatever you pick, the whole table knows it — and somebody out there in the neighbourhood will treat you differently for it.',
      ],
      who: (c) => c.players.map((p) => p.id),
      options: (c, pid) => bioOptions(c, c.p(pid)).map((b) => ({ id: b.id, label: b.name, blurb: b.text })),
      resolve(c, { choices }) {
        for (const p of c.players) {
          const pick = choices[p.id]?.option;
          p.bio = (p.bioOptions ?? []).includes(pick) ? pick : (p.bioOptions?.[0] ?? null);
        }
        for (const p of c.players) {
          const b = bioView(c, p);
          if (b) c.line(`${p.name}: ${b.name}. ${b.text}`);
        }
      },
    },
  },
};
