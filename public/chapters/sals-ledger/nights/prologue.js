// Monday, 6:10 a.m. Sal is arrested in his garden, and the week begins.

import { money } from '../common.js';

export default {
  id: 'prologue', title: 'The Arrest', act: 0, interlude: true, day: 'MONDAY, 6:10 A.M.', kicker: 'PROLOGUE',
  beats: ['arrest', 'kitchen'],
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
    kitchen: {
      engine: 'story', time: '8:30 A.M.', place: 'Nonna’s kitchen', title: 'Nonna’s Table', kicker: 'THE WEEK',
      dossier: true,
      text(c) {
        const pot = c.rng.pick([
          'The espresso pot is on its second round.',
          'There is a plate of pignoli cookies nobody is allowed to touch.',
          'The radio is on low. It’s talking about Sal.',
        ]);
        return [
          `${pot} Nonna Benedetto — ninety-four, Sal’s mother, the actual power in this family — has put a 1994 Knicks gym bag on the kitchen table and unzipped it.`,
          `“Morty Klein wants ${money(c.bag.target)} by Monday,” she says. “Every night, you do what you have to do, you come back here, and you put in what you can. Prout has a folder on my son. Every stupid thing you do goes in it. Monday morning, the judge rolls the dice.”`,
          'She looks at each of you in turn. Then she deals out the week: what you do for the crew, what you want for yourself, and two cards.',
          'Look at yours. Don’t show anybody. Nonna didn’t.',
        ];
      },
    },
  },
};
