// Night 1: three banks on a napkin, one door, one vault, one car.

import { counting, getaway, money, round5k, names, nightKicker } from '../common.js';
import { crew, cut, grabbers, onPost } from '../heist.js';

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
    'crew',
    { if: (c) => c.flag('bank') === 'first-federal', then: 'door-ff', else: { if: (c) => c.flag('bank') === 'castellano', then: 'door-castellano', else: 'door-harbor' } },
    { if: (c) => c.flag('bank') === 'first-federal', then: 'pruitt', else: { if: (c) => c.flag('bank') === 'castellano', then: 'nicky', else: 'walt' } },
    { maybe: 'heist', chance: 0.2 },
    'vault',
    { maybe: 'heist', chance: 0.2 },
    'car',
    'cut',
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

    crew: crew({
      time: '11:20 P.M.', place: (c) => `Across the street from ${bank(c).label}`,
      text: (c) => [
        `${bank(c).label} at twenty past eleven: ${{ 'first-federal': 'one light on, in the manager’s office', harbor: 'Walt’s booth lit up like a lighthouse', castellano: 'every light on, because the Castellanos can afford the electric' }[c.flag('bank')] ?? 'quiet'}. Before anybody goes near the door, everybody picks where they’re standing tonight.`,
        'Inside is where the money is. Outside is where it’s safe — and everybody outside makes it safer for everybody inside. What the people outside get is whatever the people inside decide to give them.',
      ],
      posts: () => [
        { id: 'inside', label: 'Inside, with the bags', blurb: 'Your hands on the money. Your face on the cameras.', where: 'inside' },
        { id: 'corner', label: 'On the corner of Water Street', blurb: 'Watch for patrol cars. With somebody on the corner, the getaway is one easier.', max: 2, where: 'on the corner' },
        { id: 'phone', label: 'The payphone across the street', blurb: 'Ring the alarm company as the manager and tell them it’s a test. The alarm starts one sleepier.', max: 1, where: 'at the payphone' },
      ],
    }),

    pruitt: {
      engine: 'vote', time: '11:46 P.M.', place: 'The manager’s office, First Federal', title: 'Mr. Pruitt', kicker: 'A VOTE',
      text: (c) => (c.memo.doorClean ? [
        'Harold Pruitt let you in, and now he doesn’t know what to do with himself. He has offered everybody a lollipop. He has asked twice whether this is the retirement party. He has a cake coming on Friday.',
        'What do you do with Mr. Pruitt?',
      ] : [
        'Harold Pruitt did not let you in, and he is backing towards his desk very slowly with his hands up. Under the desk, everybody knows, there is a button. He knows you know.',
        'What do you do about the button?',
      ]),
      options: (c) => (c.memo.doorClean ? [
        { id: 'chair', label: 'Tie him to his chair, nicely', blurb: 'With his own tie, loosely. He’ll be found at seven with a story.', risk: 0.1, reward: 0.2 },
        { id: 'watch', label: 'Let him watch', blurb: 'He knows the combination to the cash cart and he is dying to tell someone. The vault gets bigger. So does what he tells Prout.', risk: 0.5, reward: 0.7 },
        { id: 'party', label: 'Promise him a retirement party', blurb: 'He never gets taken anywhere. He’ll keep his mouth shut for a drink and an envelope out of the Bag.', risk: 0.2, reward: 0.4 },
      ] : [
        { id: 'rush', label: 'Get to the button first', blurb: 'Somebody vaults the desk. It’s a big desk.', risk: 0.5, reward: 0.5 },
        { id: 'talk', label: 'Talk him out of it', blurb: 'He’s sixty-four and retiring on Friday. Remind him. The Talker’s better at this.', risk: 0.4, reward: 0.4 },
        { id: 'let', label: 'Let him press it and move fast', blurb: 'The alarm will be wide awake. You’ll have less time and fewer of you will be seen.', risk: 0.7, reward: 0.3 },
      ]),
      resolve(c, { choice }) {
        const talker = c.freeByJob('talker');
        if (choice === 'chair') c.line('Pruitt is tied to his chair with his own tie. He asks if somebody could put the radio on. Somebody does. It’s the Mets, losing.');
        else if (choice === 'watch') {
          c.memo.vaultMult = 1.3;
          c.caseFile(1, 'Harold Pruitt, who watched everything');
          c.line('Pruitt reads the combination off a Post-it under his blotter and watches you work, rapt. The cash cart opens. He is going to tell Prout all of it, in order, with diagrams.');
        } else if (choice === 'party') {
          const n = c.bagTake(c.scale(10000));
          c.set('pruittFriend', true);
          c.line(`${money(n)} out of the Bag, in an envelope Pruitt says he’s going to frame. He’ll see you at Dolores’s on Friday. He hasn’t been this happy since 1991.`);
        } else if (choice === 'rush') {
          if (c.rng.chance(0.55)) c.line('Somebody goes over the desk like a hurdler and gets a hand on Pruitt’s wrist an inch from the button. He apologises.');
          else { c.memo.alarmMod = 2; c.line('It’s a very big desk. Pruitt presses the button, then apologises for pressing it.'); }
        } else if (choice === 'talk') {
          if (c.rng.chance(talker ? 0.65 : 0.45)) c.line(`${talker ? talker.name : 'Somebody'} talks about Friday, and the cake, and Ellen, and the dog. Pruitt takes his hand away from the desk and sits down.`);
          else { c.memo.alarmMod = 2; c.line('Pruitt listens politely, says “I’m sorry, I have to,” and presses it.'); }
        } else {
          c.memo.alarmMod = 2;
          c.memo.fast = true;
          c.line('Pruitt presses the button with a look of real relief. Everybody runs for the cart.');
        }
      },
    },

    walt: {
      engine: 'vote', time: '11:46 P.M.', place: 'Walt’s booth, Harbor Savings', title: 'Walt', kicker: (c) => (c.memo.doorClean ? 'WHO SITS WITH WALT?' : 'A VOTE'),
      text: (c) => (c.memo.doorClean ? [
        'Walt let you in, and now he’d like somebody to sit with him. He has poured a second coffee from the thermos. He wants to talk about the Mets, and 1979, and his knees. If nobody sits with him, he’ll wander into the vault to see what’s taking so long.',
        'Somebody has to sit with Walt while everybody else works. Whoever it is won’t see the inside of the vault.',
      ] : [
        'Walt has his hand on the radio clipped to his belt. He hasn’t pressed it. He is looking at the crew one face at a time, the way he looked at the Brinks man in 1981 who turned out to be a Brinks man.',
        'What do you do about the radio?',
      ]),
      candidates: (c) => (c.memo.doorClean ? c.free.filter((p) => onPost(c, 'inside').includes(p)).map((p) => p.id) : null),
      options: (c) => (c.memo.doorClean ? null : [
        { id: 'grab', label: 'Take the radio off him', blurb: 'He’s seventy-three. He boxed. It could go either way.', risk: 0.5, reward: 0.5 },
        { id: 'sal', label: 'Tell him the truth: it’s for Sal', blurb: 'Walt has known Sal forty years. Maybe that matters.', risk: 0.5, reward: 0.6 },
        { id: 'fast', label: 'Let him call it in and move fast', blurb: 'The alarm wakes up. You’ll be quick.', risk: 0.7, reward: 0.3 },
      ]),
      noSelf: false,
      resolve(c, { choice }) {
        if (c.memo.doorClean) {
          c.memo.sitter = choice;
          c.memo.alarmMod = -1;
          c.line(`${c.name(choice)} sits with Walt. Walt pours the coffee and starts on 1979. Nobody goes near his radio. The alarm stays asleep.`);
          c.note(choice, 'Walt tells you about the night in 1981 he caught the Brinks man. Then he tells you where he keeps the keys to the side door, “just in case, God forbid.” (+1 on your next roll.)', 'Walt');
          (c.p(choice).edges ??= []).push({ label: 'Walt’s side door' });
          return;
        }
        if (choice === 'grab') {
          if (c.rng.chance(0.5)) c.line('Walt lets go of the radio and says, “Fine. Fine. I’m seventy-three.”');
          else { c.memo.alarmMod = 2; c.caseFile(1, 'Walt Kowalski, who got a call in'); c.line('Walt gets a left hook in before anybody gets the radio, and a call in before that.'); }
        } else if (choice === 'sal') {
          if (c.rng.chance(0.45)) { c.memo.alarmMod = -1; c.line('Walt takes his hand off the radio. “For Sal,” he says. He sits down and pours a coffee. He won’t look at the vault.'); }
          else { c.memo.alarmMod = 2; c.caseFile(1, 'Walt Kowalski, who called it in anyway'); c.line('“Sal would never,” says Walt, and presses the button.'); }
        } else {
          c.memo.alarmMod = 2;
          c.memo.fast = true;
          c.line('Walt calls it in, very calmly, reading the plate numbers off a card he keeps for the purpose. Everybody runs.');
        }
      },
    },

    nicky: {
      engine: 'vote', time: '11:46 P.M.', place: 'The front desk, Castellano Credit Union', title: 'Nicky', kicker: 'A VOTE',
      text: (c) => (c.memo.doorClean ? [
        'Nicky Castellano believes you. He believes it so much that he wants to help. He has a key to the vault, which he isn’t supposed to have, and he is very excited about being included in something by his uncle for once.',
        'What do you do with Nicky?',
      ] : [
        'Nicky Castellano doesn’t believe you, and he has the phone off the hook and is dialling with a shaking finger. It’s a number with a lot of sevens in it. Everybody knows whose.',
        'What do you do about the phone?',
      ]),
      options: (c) => (c.memo.doorClean ? [
        { id: 'help', label: 'Let him help', blurb: 'He has the key. The vault gets bigger. He will absolutely tell his uncle how helpful he was.', risk: 0.6, reward: 0.7 },
        { id: 'bathroom', label: 'Lock him in the bathroom', blurb: 'With a magazine. He won’t mind for about an hour.', risk: 0.2, reward: 0.3 },
        { id: 'pay', label: 'Pay him to go home', blurb: `${money(10000)} out of the Bag. He’s paid in “experience” and he’s broke.`, risk: 0.2, reward: 0.3 },
      ] : [
        { id: 'grab', label: 'Take the phone', blurb: 'He’s twenty-two and fast. You’re not twenty-two.', risk: 0.5, reward: 0.5 },
        { id: 'hang', label: 'Hang up for him and say sorry', blurb: 'He’s scared. Maybe he stays scared.', risk: 0.5, reward: 0.4 },
        { id: 'ring', label: 'Let it ring and move', blurb: 'Vinnie’s phone rings in an empty club. For about ten minutes.', risk: 0.7, reward: 0.3 },
      ]),
      resolve(c, { choice }) {
        if (choice === 'help') {
          c.memo.vaultMult = 1.3;
          c.set('nickyHelped', true);
          c.line('Nicky opens the vault with a key on a lanyard that says WORLD’S BEST NEPHEW. He holds the bags. He is having the best night of his life. Vinnie will hear every detail of it by breakfast.');
        } else if (choice === 'bathroom') c.line('Nicky goes into the bathroom with a copy of Sports Illustrated and no argument. You hear him talking to himself about the Rangers through the door.');
        else if (choice === 'pay') {
          const n = c.bagTake(c.scale(10000));
          c.line(`${money(n)} out of the Bag. Nicky counts it twice, says “I was never here,” and leaves in the Honda Civic.`);
        } else if (choice === 'grab') {
          if (c.rng.chance(0.5)) c.line('The phone goes in a drawer. Nicky sits on the floor and says his uncle is going to kill him. He may be right.');
          else { c.memo.alarmMod = 1; c.set('vinnieCalled', true); c.line('Nicky gets three rings in before the phone goes. Somewhere across the river a light comes on.'); }
        } else if (choice === 'hang') {
          if (c.rng.chance(0.5)) c.line('You hang up for him and say sorry. Nicky says sorry too. Everybody is very sorry.');
          else { c.memo.alarmMod = 1; c.set('vinnieCalled', true); c.line('You hang up for him. He picks it up again the second you turn round.'); }
        } else {
          c.memo.alarmMod = 2;
          c.memo.fast = true;
          c.set('vinnieCalled', true);
          c.line('The phone rings in the empty social club across the river for ten minutes. Then somebody picks it up.');
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
        const phone = onPost(c, 'phone')[0];
        return [
          `${door} ${inside}${c.memo.sitter ? ` Somewhere behind you, ${c.name(c.memo.sitter)} is hearing about 1979.` : ''}${phone ? ` Across the street, ${phone.name} is on the payphone to the alarm company, being the manager.` : ''}`,
          `Every round, grab or go. The money gets split between whoever grabs, and the alarm gets twitchier every time. ${driver ? `${driver.name} is outside with the engine running, and decides when it leaves.` : 'Nobody is watching the car.'}`,
        ];
      },
      who: (c) => grabbers(c).filter((id) => id !== c.memo.sitter),
      // moving fast means fewer rounds in the vault before you have to be out
      rounds: (c) => (c.memo.fast ? 3 : 5),
      vault: (c) => round5k(c.scale(bank(c).vault) * (c.memo.vaultMult ?? 1) * (0.85 + c.rng() * 0.3)),
      alarm: (c) => Math.max(0, bank(c).alarm + (c.memo.doorClean ? 0 : 1) + (c.memo.alarmMod ?? 0) - (onPost(c, 'phone').length ? 1 : 0)),
      angle: (c) => (c.flag('bank') === 'harbor' && c.memo.insider && !c.isAway(c.memo.insider) ? {
        pid: c.memo.insider, round: 1, money: c.scale(40000), alarm: 1,
        label: `Work ${c.memo.cousin}’s drawer`,
        blurb: `${money(c.scale(40000))} out of the assistant manager’s drawer, just for you. The alarm gets one twitchier for everybody.`,
        question: `Did ${c.name(c.memo.insider)} take more than their cut at Harbor?`,
      } : null),
      resolve(c, r) {
        const total = Object.values(r.hauls).reduce((a, b) => a + b, 0);
        c.memo.take = total;
        c.memo.hauls = r.hauls;
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
      target: (c) => bank(c).getaway + (c.memo.tripped ? 1 : 0) - (onPost(c, 'corner').length ? 1 : 0),
    }),

    cut: cut({ time: '12:20 A.M.', place: 'The back of the car, under a streetlight on Canal Street' }),

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
