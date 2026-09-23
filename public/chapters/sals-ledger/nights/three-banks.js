// Night 1: three banks on a napkin, one door, one vault, one car.

import { counting, getaway, money, round5k, names, nightKicker } from '../common.js';

const BANKS = {
  'first-federal': {
    label: 'First Federal on Main',
    blurb: 'A vault from 1998 and a manager who’s been counting down to retirement since 2011. Safe. Small.',
    vault: 70000, alarm: 0, getaway: 5, faces: [1, 2], risk: 0.2, reward: 0.3,
    fail: '1 heat each if it goes wrong.',
  },
  harbor: {
    label: 'Harbor Savings & Loan',
    blurb: 'The building is older than the alarm system, and the alarm system is older than the guard.',
    vault: 140000, alarm: 0, getaway: 7, faces: [5, 6], risk: 0.5, reward: 0.6,
    fail: '1 heat each if it goes wrong, 2 for the Talker.',
  },
  castellano: {
    label: 'Castellano Credit Union',
    blurb: 'Across the river, and it belongs to the Castellanos. Either the stupidest idea of the week or the one nobody sees coming.',
    vault: 240000, alarm: 1, getaway: 8, faces: [3, 4], risk: 0.8, reward: 0.75,
    fail: '2 heat each if it goes wrong. And the Castellanos find out either way.',
  },
};

const COUSINS = ['Deb', 'Theresa', 'Marco', 'Frankie', 'Angela', 'Little Joe'];

function bank(c) { return BANKS[c.flag('bank')] ?? BANKS.harbor; }

export default {
  id: 'three-banks', title: 'The Three Banks', act: 1, day: 'MONDAY NIGHT', kicker: nightKicker,
  beats: [
    'napkin',
    { if: (c) => c.flag('bank') === 'first-federal', then: 'door-ff', else: { if: (c) => c.flag('bank') === 'castellano', then: 'door-castellano', else: 'door-harbor' } },
    { maybe: 'heist', chance: 0.3 },
    'vault',
    { maybe: 'heist', chance: 0.3 },
    'car',
    'count',
  ],
  close(c) {
    const b = c.flag('bank');
    if (b === 'castellano') c.set('war', true);
    const take = c.memo.take ?? 0;
    c.set('night1Take', take);
    const headlines = {
      'first-federal': take > 0
        ? ['BANK MANAGER, 64, “DISAPPOINTED BUT NOT SURPRISED”', `Thieves took ${money(take)} from First Federal on Main overnight. Branch manager Harold Pruitt, who retires Friday, said he had “always known” this would happen “the one week I have a cake coming.”`]
        : ['ATTEMPTED BREAK-IN AT FIRST FEDERAL', 'Police say nothing was taken. Branch manager Harold Pruitt said the intruders were “polite, frankly.”'],
      harbor: take > 0
        ? ['HARBOR SAVINGS HIT; GUARD, 73, “HAD A FEELING”', `An estimated ${money(take)} was taken from Harbor Savings & Loan. Night guard Walter Kowalski, 73, told the Courier the alarm “goes off every Tuesday anyway.” It was Monday.`]
        : ['NO LOSS AT HARBOR SAVINGS AFTER ALARM', 'Guard Walter Kowalski, 73, said the would-be robbers “ran like my grandson runs from church.”'],
      castellano: take > 0
        ? ['CASTELLANO CREDIT UNION ROBBED; FAMILY “CONCERNED”', `${money(take)} is missing from the Castellano Credit Union on Front Street. A spokesman for the Castellano family said they were “very concerned” and “would be looking into it personally.” Neighbours are advised to stay indoors.`]
        : ['BREAK-IN AT CASTELLANO CREDIT UNION', 'Nothing was taken. A family spokesman said that was “beside the point.”'],
    };
    const [h, p] = headlines[b] ?? headlines.harbor;
    c.remember(p, { courier: h });
  },
  defs: {
    napkin: {
      engine: 'vote', time: '10:15 P.M.', place: 'Nonna’s kitchen', title: 'The Napkin', kicker: 'A VOTE',
      text: (c) => [
        `Morty Klein’s first invoice arrived before Sal’s breakfast did. ${c.rng.pick(['Nonna has written three names on a paper napkin, in the handwriting she uses for funerals.', 'Three names on a napkin, in Nonna’s handwriting. The napkin is from Dolores’s diner, and Dolores will want it back.', 'There are three names on a napkin under the sugar bowl. Nobody saw who wrote them.'])}`,
        'Pick a bank. Majority wins. A tie goes to a die, and the die knows which faces belong to which bank.',
      ],
      options: (c) => Object.entries(BANKS).map(([id, b]) => {
        const v = c.scale(b.vault);
        return {
          id, label: b.label, blurb: b.blurb, faces: b.faces, risk: b.risk, reward: b.reward,
          details: [`Vault: about ${money(v)}`, `Getaway: ${c.odds(2, b.getaway)}`, b.fail],
        };
      }),
      angles(c) {
        const ps = c.rng.shuffle(c.free.map((p) => p.id));
        const out = {};
        const cousin = c.rng.pick(COUSINS);
        if (ps[0]) {
          out[ps[0]] = { option: 'harbor', text: `Harbor. Your cousin ${cousin} is the assistant manager. If the crew picks Harbor, you can work an angle in the vault: ${money(c.scale(40000))} for you, the alarm gets twitchier, and nobody sees it.` };
          c.memo.insider = ps[0];
          c.memo.cousin = cousin;
        }
        if (ps[1]) {
          out[ps[1]] = { option: 'castellano', text: `Castellano. You owe Vinnie Castellano ${money(40000)}, and he knows where you live. If his bank gets hit, the paperwork burns, and so does your debt.` };
          c.memo.debtor = ps[1];
          c.set(`debt:${ps[1]}`, 40000);
        }
        if (ps[2]) {
          out[ps[2]] = { option: null, text: 'First Federal. Your mother banks there, every Friday, in person. If the crew hits it she’ll know, and you’ll be paying her back.' };
          c.memo.mother = ps[2];
        }
        for (const id of ps.slice(3)) {
          out[id] = { option: null, text: 'Nothing. You’re clean. That makes yours the only honest vote at the table — or the most expensive one.' };
        }
        return out;
      },
      bot(c, p, options) {
        if (c.memo.mother === p.id) return c.rng.chance(0.7) ? c.rng.pick(['harbor', 'castellano']) : null;
        return null;
      },
      resolve(c, { choice, tally }) {
        c.set('bank', choice);
        const b = BANKS[choice];
        c.line(`${b.label}. ${c.rng.pick(['Nonna folds the napkin and puts it in her apron.', 'Nonna burns the napkin on the stove, which seems unnecessary but is very like her.', 'Nonna tears the other two names off and eats them. Nobody says anything.'])}`);
        if (choice === 'first-federal' && c.memo.mother) {
          const n = c.charge(c.memo.mother, 20000);
          c.line(`${c.name(c.memo.mother)}’s mother banks at First Federal. ${c.name(c.memo.mother)} will be putting ${money(n)} back into her account, quietly, before she checks.`);
          c.remember(`${c.name(c.memo.mother)} robbed their own mother's bank.`, { who: c.memo.mother, kind: 'mother' });
        }
      },
    },

    'door-ff': whispersDoor({
      place: 'First Federal, the night door by the cash machines',
      whoLabel: 'Harold Pruitt, branch manager, working late',
      intro: (c, t) => `Harold Pruitt, sixty-four, is still at his desk at 11:40 p.m., the way he has been every night since his retirement date was announced. ${t} knocks on the glass. Pruitt looks up.`,
      openings: [
        { id: 'audit', label: '“Corporate sent us. Surprise audit.”',
          yes: 'Pruitt has been told there will be a surprise audit before he retires. He has been waiting for it like a man waiting for rain.',
          no: 'Pruitt had a surprise audit in March. He knows every face corporate owns.' },
        { id: 'dog', label: '“Your wife called. Something about the dog.”',
          yes: 'Pruitt’s wife Ellen calls him at the branch every night about the dog, a basset hound called Lieutenant.',
          no: 'Pruitt’s dog died in the spring. The leash is still on a hook by his desk.' },
        { id: 'party', label: '“We’re from your retirement party committee.”',
          yes: 'The branch is throwing Pruitt a party on Friday. He knows, he has been told not to know, and he is delighted.',
          no: 'Pruitt has asked, in writing, for no retirement party of any kind. He means it.' },
        { id: 'envelope', label: 'Slide him an envelope.',
          yes: 'Pruitt has been skimming the coffee fund for eleven years. An envelope is a language he speaks.',
          no: 'Pruitt reported the last man who offered him an envelope. It was 1996. He still tells the story.' },
      ],
      filler: [
        'The ficus in the lobby is fake and has been watered daily since 2004.',
        'Pruitt drives a 1991 Buick and parks it across two spaces.',
        'There is a bowl of lollipops at the teller window. Pruitt counts them.',
      ],
      person: 'pruitt',
    }),

    'door-harbor': whispersDoor({
      place: 'Harbor Savings & Loan, the side door on Water Street',
      whoLabel: 'Walt Kowalski, night guard, seventy-three',
      intro: (c, t) => `Walt Kowalski has guarded Harbor Savings since 1979. He is seventy-three, he has a thermos, and he is watching ${t} walk up to his door with the expression of a man who has seen everything twice.`,
      openings: [
        { id: 'christening', label: '“Walt! Tommy’s kid — we met at the christening.”',
          yes: 'Walt has been to every christening at St. Anthony’s for thirty years and remembers none of the faces. He says he remembers all of them.',
          no: 'Walt has the memory of a filing cabinet. He will ask whose christening, and what the baby was called.' },
        { id: 'alarm', label: '“Alarm company. Your panel’s reporting a fault.”',
          yes: 'The panel at Harbor throws a fault every Tuesday. Walt has stopped calling it in; he just waves the alarm men through.',
          no: 'Walt installed that panel himself in 1979. He would know if it had a fault, and he would want to see your van.' },
        { id: 'pension', label: '“We’re here about your pension.”',
          yes: 'Walt’s pension was cut in the merger. He has been writing letters. Anybody who says the word “pension” gets a cup of coffee.',
          no: 'Walt’s pension is fine. His union rep is his son-in-law, and he would call him right there.' },
        { id: 'envelope', label: 'Slide him an envelope.',
          yes: 'Walt’s granddaughter starts at Fordham in the fall. He does the arithmetic every night.',
          no: 'Walt took an envelope in 1988 and it was the worst year of his life. He tells the story at Thanksgiving.' },
      ],
      filler: [
        'Walt does the Courier Jumble every night, in pen.',
        'Walt keeps a transistor radio tuned to the Mets, win or lose.',
        'There is a photograph of a boat taped inside Walt’s booth. Walt has never owned a boat.',
      ],
      person: 'walt',
      failHeat: 2,
    }),

    'door-castellano': whispersDoor({
      place: 'Castellano Credit Union, Front Street',
      whoLabel: 'Nicky Castellano, twenty-two, on the desk',
      intro: (c, t) => `The night desk at the Castellano Credit Union is Nicky Castellano, twenty-two, Vinnie’s nephew, surrounded by empty energy drink cans. ${t} walks in like they own the place. It belongs to Nicky’s uncle.`,
      openings: [
        { id: 'vinnie', label: '“Uncle Vinnie sent us.”',
          yes: 'Nicky is terrified of his uncle and would never, ever call him to check anything.',
          no: 'Vinnie never sends anybody anywhere without calling Nicky first. It is the one thing Nicky knows for certain.' },
        { id: 'knicks', label: '“Knicks tickets. For the family. Courtside.”',
          yes: 'Nicky is obsessed with the Knicks and has been promised courtside seats by three different people. None came through.',
          no: 'Nicky hates basketball. He is a hockey kid. Rangers.' },
        { id: 'tina', label: '“Tina’s outside. She’s upset.”',
          yes: 'Nicky’s girlfriend Tina broke up with him on Sunday. He would run through a wall to talk to her.',
          no: 'Nicky does not have a girlfriend. He has a Honda Civic he talks to.' },
        { id: 'envelope', label: 'Slide him an envelope.',
          yes: 'Nicky is paid by his uncle in “experience” and is flat broke.',
          no: 'Nicky is a Castellano. You don’t bribe a Castellano with an envelope. You insult him.' },
      ],
      filler: [
        'Nicky has a tattoo of a word he spelled wrong.',
        'Nicky’s desk plant is plastic and called Gerald.',
        'Nicky drinks energy drinks by the case. There are cans everywhere.',
      ],
      person: 'nicky',
      failHeat: 1,
    }),

    vault: {
      engine: 'grab', time: '11:52 P.M.', place: (c) => `${bank(c).label}, the vault`, title: 'The Vault', kicker: 'HOW GREEDY ARE YOU?',
      text(c) {
        const b = c.flag('bank');
        const door = c.memo.doorClean ? 'You’re in clean.' : 'You’re in, but not quietly, and the alarm knows it.';
        const inside = {
          'first-federal': 'Safe-deposit boxes, a cash cart, and a framed photograph of Harold Pruitt shaking hands with a mayor nobody remembers.',
          harbor: 'The vault door at Harbor is original, 1931, and heavier than the building. Behind it: cash in rubber bands, and a lot of it.',
          castellano: 'The Castellano vault is new, clean and full. It is the vault of a family that has never once been robbed, until now.',
        }[b];
        const driver = c.freeByJob('driver');
        return [
          `${door} ${inside}`,
          `Every round, grab or go. The money gets split between whoever grabs, and the alarm gets twitchier every time. ${driver ? `${driver.name} is outside with the engine running, and decides when it leaves.` : 'Nobody is watching the car.'}`,
        ];
      },
      vault: (c) => round5k(c.scale(bank(c).vault) * (0.85 + c.rng() * 0.3)),
      alarm: (c) => bank(c).alarm + (c.memo.doorClean ? 0 : 1),
      angle: (c) => (c.flag('bank') === 'harbor' && c.memo.insider && !c.isAway(c.memo.insider) ? {
        pid: c.memo.insider, round: 1, money: c.scale(40000), alarm: 1,
        label: `Work ${c.memo.cousin}’s drawer`,
        blurb: `${money(c.scale(40000))} out of the assistant manager’s drawer, just for you. The alarm gets one twitchier for everybody.`,
        question: `Did ${c.name(c.memo.insider)} take more than their cut at Harbor?`,
      } : null),
      resolve(c, r) {
        const total = Object.values(r.hauls).reduce((a, b) => a + b, 0);
        c.memo.take = total;
        c.memo.tripped = r.tripped;
        if (c.memo.debtor && total > 0 && c.flag('bank') === 'castellano') {
          c.set(`debtBurned:${c.memo.debtor}`, true);
          c.note(c.memo.debtor, 'Somewhere in that vault, your paperwork went up in smoke. Vinnie can’t prove a thing.');
        }
        if (c.g.s.night.memo.angleWorked) c.remember(`${c.name(c.g.s.night.memo.angleWorked)} worked an angle at Harbor.`, { who: c.g.s.night.memo.angleWorked, kind: 'skim', secret: true });
        if (!total) c.line('Nobody came out with anything. It happens.');
        else c.line(`${money(total)} came out of the vault${r.driverCut ? `, and ${c.name(r.driver)} took the driver’s tenth` : ''}.`);
      },
    },

    car: getaway({
      time: '12:04 A.M.', place: 'Water Street, heading nowhere in particular',
      text: (c) => {
        const d = c.freeByJob('driver');
        return [`${d ? `${d.name} has the engine running` : 'Somebody grabs the keys'}. ${c.memo.tripped ? 'There are sirens, which is not ideal.' : 'No sirens yet.'} ${c.rng.pick(['The radio is playing Dean Martin, loudly, and nobody can find the knob.', 'Somebody’s left a pizza box on the back seat since Saturday.', 'The windscreen wipers are on for no reason and will not turn off.'])}`];
      },
      target: (c) => bank(c).getaway + (c.memo.tripped ? 1 : 0),
    }),

    count: counting({ time: '12:40 A.M.' }),
  },
};

/** A door at a bank: one person talks, everybody else knows something about who's behind it. */
function whispersDoor({ place, whoLabel, intro, openings, filler, person, failHeat = 1 }) {
  return {
    engine: 'whispers', time: '11:40 P.M.', place, title: 'The Door', kicker: 'ONE OF YOU TALKS',
    whoLabel,
    text: (c) => {
      const t = c.freeByJob('talker')?.name ?? 'Somebody';
      return [intro(c, t), `${t} has to say something. Everybody else knows one thing about who’s behind that door. Pass it on — as written, turned around, or not at all.`];
    },
    openings: () => openings,
    filler: () => filler,
    resolve(c, { success, openingLabel, talker }) {
      if (success) {
        c.memo.doorClean = true;
        c.line(`${c.name(talker)} opened with ${openingLabel.replace(/[“”]/g, '')} It worked. The door opens.`);
      } else {
        c.memo.doorClean = false;
        c.set(`${person}Saw`, talker);
        c.line(`${c.name(talker)} opened with ${openingLabel.replace(/[“”]/g, '')} It did not work. You get in anyway, the hard way, and ${c.name(talker)}’s face is now somebody’s memory.`);
        c.heat(talker, failHeat, 'the door');
        c.remember(`${c.name(talker)}'s face was seen at the bank door.`, { who: talker, kind: 'seen' });
      }
    },
  };
}
