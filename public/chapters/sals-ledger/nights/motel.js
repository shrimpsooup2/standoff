// The Motel: Gary Feld, the accountant, the only other man alive who has read
// the ledger, is somewhere in the Route 9 Motor Inn.

import { counting, money, round5k, nightDay, nightKicker, tablePays, howPaid } from '../common.js';

const ROOMS = [
  { id: 'r14', label: 'Room 14',
    yes: 'The vending machine is outside 14, and Gary has been living on it: the Twix row is empty.',
    no: 'The vending machine outside 14 has been broken since June. Gary would never stay near a broken vending machine.' },
  { id: 'r9', label: 'Room 9',
    yes: 'Somebody in 9 has had the TV on the Weather Channel for three days straight. Gary finds the Weather Channel calming.',
    no: 'Room 9 has had a honeymoon couple in it since Friday. The whole motel knows.' },
  { id: 'r22', label: 'Room 22',
    yes: 'Twenty-two is the only room with a back window onto the woods. Gary asked for a back window at check-in; he always wants a way out.',
    no: 'Twenty-two faces the highway. Gary can’t sleep with headlights on the ceiling. He told the clerk so.' },
  { id: 'r3', label: 'Room 3',
    yes: 'The man in 3 paid cash for a week and asked the clerk for a calculator. Nobody asks for a calculator.',
    no: 'Room 3 is a truck driver from Ohio called Duane, who is enormous and a light sleeper.' },
];

const FILLER = [
  'The Route 9 Motor Inn has an ice machine that makes a noise like somebody falling down stairs.',
  'The pool is empty and has been since 1998. There is a shopping cart in the deep end.',
  'The sign says VACANCY, but the V and the N are out, so it just says ACA CY.',
  'The night clerk is doing a word search, and has been stuck on the same word since midnight.',
];

function garyRoom(c) {
  return `${ROOMS.find((r) => r.id === c.memo.garyRoom)?.label ?? 'Room 14'}, Route 9 Motor Inn`;
}

export default {
  id: 'motel', title: 'The Motel', day: nightDay, kicker: nightKicker,
  beats: [
    'clerk',
    'desk',
    { maybe: ['patrol', 'photographer', 'dog'], chance: 0.2, where: 'The breezeway, Route 9 Motor Inn' },
    'gary',
    { if: (c) => c.memo.garyChoice === 'talk', then: 'talk-him-down' },
    { if: (c) => c.flag('gary') !== 'prout', then: 'suitcase' },
    // leave Gary for Prout and Prout's people come for him while you're still in the building
    { if: (c) => c.flag('gary') === 'prout', then: ['headlights', 'stall'], else: { oneOf: [{ beat: ['headlights', 'stall'], weight: 2 }, { beat: 'the-ice-machine', weight: 1 }] } },
    'count',
  ],
  close(c) {
    const g = c.flag('gary');
    c.remember(
      g === 'basement' ? 'Police are looking for Gary Feld, 58, an accountant, who checked out of the Route 9 Motor Inn in the middle of the night “with some friends.” Anybody who has seen him is asked to call. Nobody has called.'
        : g === 'arizona' ? 'Gary Feld, 58, an accountant wanted as a witness in the Benedetto case, has not been seen since Thursday. A Route 9 motel clerk said he left “happy, for once.”'
          : g === 'prout' ? 'The District Attorney’s office confirmed on Friday that a “significant witness” in the Benedetto case is now in protective custody. The witness was described as “very frightened” and “asking for Twix.”'
            : 'Staff at the Route 9 Motor Inn say it was “a busy night.”',
      { courier: g === 'prout' ? 'DA: KEY WITNESS “SAFE”' : 'ACCOUNTANT MISSING FROM ROUTE 9 MOTEL' },
    );
  },
  defs: {
    clerk: {
      engine: 'vote', time: '11:40 P.M.', place: 'The office, Route 9 Motor Inn', title: 'The Night Clerk', kicker: 'A VOTE',
      text: (c) => [
        `The night clerk is a woman in her sixties called Bernadette, doing a word search behind bulletproof glass that has a bullet hole in it. ${c.rng.pick(['Somebody has already paid her not to say which room.', 'She has the look of a woman who has been offered money twice this week already.'])} The register is on the counter on her side of the glass.`,
        'What do you do about Bernadette?',
      ],
      options: (c) => [
        { id: 'pay', label: 'Pay her more than the last people did', blurb: `${money(5000)} each. She won’t say which room — she has principles — but she’ll say which room it isn’t, and cover for you if you knock wrong.`, risk: 0.1, reward: 0.5 },
        { id: 'register', label: 'Keep her talking while somebody reads the register', blurb: 'Free, if it works. She has been a night clerk for thirty years.', risk: 0.5, reward: 0.5 },
        { id: 'nothing', label: 'Walk straight past', blurb: 'Knock on doors like guests. Guests knock on doors.', risk: 0.3, reward: 0.1 },
      ],
      resolve(c, { choice }) {
        if (choice === 'pay') {
          let n = 0;
          for (const p of c.free) n += c.charge(p.id, 5000);
          c.memo.clerkTalked = true;
          c.memo.clerkPaid = true;
          c.line(`${money(n)} slides under the glass. Bernadette counts it without looking up from her word search and says, to the word search, “Not the one with the ice machine noise.” Whoever’s doing the talking gets one door it isn’t.`);
          return;
        }
        if (choice === 'register') {
          if (c.rng.chance(0.5)) {
            c.memo.clerkTalked = true;
            c.line('Somebody asks Bernadette about her word search, and she has a lot to say about her word search. Somebody else reads four “John Smith”s upside down. Whoever’s doing the talking gets one door it isn’t.');
          } else {
            c.memo.clerkAngry = true;
            c.line('Bernadette sees the reflection in the glass, closes the register, and picks up the phone. She doesn’t dial yet. She just holds it where you can see it.');
          }
          return;
        }
        c.line('You walk past the office like guests. Bernadette doesn’t look up. She doesn’t need to.');
      },
    },

    suitcase: {
      engine: 'draft', time: '12:40 A.M.', place: garyRoom, title: 'Gary’s Suitcase', kicker: 'TAKE ONE, PASS THE CASE',
      text: (c) => [
        `Gary has a brown suitcase that he will not let out of his sight, and then, all at once, he does. “Take it,” he says. “I don’t want it any more. I don’t want any of it.” ${c.flag('gary') === 'basement' ? 'He is going to Nonna’s basement with a pillowcase and nothing else.' : c.flag('gary') === 'arizona' ? 'He is getting on a bus to Phoenix with one change of clothes.' : 'He is going to his sister’s with a toothbrush.'}`,
        'Everybody takes one thing out of Gary’s suitcase, and passes it on. Everybody sees what everybody takes.',
      ],
      items(c) {
        const names = c.rng.shuffle(c.players.map((p) => p.id));
        const pool = [
          { id: 'savings', label: 'Gary’s savings, in a sock', blurb: `${money(c.scale(25000))} in twenties. He has been saving it since 1989 for a boat.`, kind: 'cash', value: c.scale(25000) },
          { id: 'copy', label: 'A copy of a ledger page', blurb: 'Gary copied a page, in case. Somebody’s name is on it.', kind: 'page', value: 30000, about: names[0] },
          { id: 'copy2', label: 'Another copied page', blurb: 'Different ink. Different name.', kind: 'page', value: 30000, about: names[1] ?? names[0] },
          { id: 'diary', label: 'Gary’s diary', blurb: 'Five years of who came to Sal’s office and when. Dirt on somebody, in very neat handwriting.', kind: 'card', card: 'dirt', value: 25000 },
          { id: 'calculator', label: 'Gary’s calculator', blurb: 'A 1987 Texas Instruments. Worth nothing. It is the only thing in the case he looks sad to lose.', kind: 'nothing', value: 0 },
          { id: 'receipts', label: 'A shoebox of Sal’s receipts', blurb: 'Burn them, and Prout’s tax case loses its arithmetic: the Case File goes down by one.', kind: 'burn', value: 20000 },
        ];
        return c.rng.shuffle(pool).slice(0, Math.max(2, c.free.length));
      },
      bot(c, p, open) {
        const own = open.find((it) => it.kind === 'page' && it.about === p.id);
        if (own) return own.id;
        if (p.secret?.id === 'garys-friend') { const calc = open.find((it) => it.id === 'calculator'); if (calc) return calc.id; }
        return null;
      },
      resolve(c, { picks }) {
        const items = c.beat.data.items;
        for (const [pid, id] of Object.entries(picks)) {
          const it = items.find((x) => x.id === id);
          if (!it) continue;
          if (it.kind === 'cash') { c.give(pid, it.value, 'Gary’s sock'); c.line(`${c.name(pid)} took Gary’s savings. Gary watched them do it.`); }
          else if (it.kind === 'page') {
            if (it.about === pid) { c.caseFile(-1, 'a copied page, eaten'); c.line(`${c.name(pid)} found their own name on a copied page and ate it on the spot.`); }
            else { const card = c.card(pid, 'ledger-page'); if (card) { card.about = it.about; card.line = `${c.name(it.about)} — Gary’s copy`; } c.line(`${c.name(pid)} took the copied page with ${c.name(it.about)}’s name on it. ${c.name(it.about)} saw.`); }
          } else if (it.kind === 'card') { c.card(pid, it.card); c.line(`${c.name(pid)} took Gary’s diary.`); }
          else if (it.kind === 'burn') { c.caseFile(-1, 'Sal’s receipts, burned in a motel ashtray'); c.line(`${c.name(pid)} burned Sal’s receipts in the ashtray, one at a time, while Gary watched and said nothing.`); }
          else { c.line(`${c.name(pid)} took Gary’s calculator. Gary looked at them with enormous gratitude and said, “Look after it.”`); c.fact(pid, 'calc', `Did ${c.name(pid)} take Gary’s calculator?`, true); }
        }
      },
    },

    desk: {
      engine: 'whispers', time: '11:50 P.M.', place: 'The breezeway, Route 9 Motor Inn', title: 'Which Door', kicker: 'WHICH ROOM?',
      whoLabel: 'Which door is Gary behind?',
      text: (c) => {
        const t = c.freeByJob('talker')?.name ?? 'Somebody';
        return [
          `Gary Feld has been in the Route 9 Motor Inn since Monday, eating from the vending machine and deciding whom to trust. ${c.memo.clerkPaid
            ? `Bernadette took the money and said, to her word search, one door it isn’t. ${t} knows which.`
            : c.memo.clerkTalked
              ? `While Bernadette talked about her word search, somebody read the register upside down: four “John Smith”s, and one of them paid for a room Gary would never take. ${t} knows which.`
              : c.memo.clerkAngry
                ? 'Behind the glass, Bernadette is still holding the phone where everybody can see it. The register is closed.'
                : 'You walked past the office like guests, so the register stays a mystery: four “John Smith”s, and no way of knowing which.'}`,
          `Out along the breezeway, ${t} has to knock on one door. Knock on the wrong one and the whole motel wakes up. Everybody else knows one thing about one of the rooms.`,
        ];
      },
      openings: () => ROOMS,
      extraClue: (c) => !!c.memo.clerkTalked,
      correct: (c) => { c.memo.garyRoom = c.rng.pick(ROOMS).id; return c.memo.garyRoom; },
      filler: () => FILLER,
      resolve(c, { success, openingLabel, talker }) {
        c.memo.found = success;
        if (success) {
          c.line(`${c.name(talker)} knocked on ${openingLabel}. A long pause. Then Gary’s voice: “Is that the pizza?” It was not the pizza, but he opened the door anyway.`);
          return;
        }
        const wrong = c.rng.pick([
          'a honeymoon couple who were not at all happy to see anybody',
          'Duane, the truck driver from Ohio, who is enormous and a light sleeper',
          'a Castellano cousin, who was also looking for Gary, and was very interested to see you',
        ]);
        c.line(`${c.name(talker)} knocked on ${openingLabel}. It was ${wrong}. By the time you found the right door, every light in the motel was on and Gary had heard all of it.`);
        if (c.memo.clerkPaid) c.line('The clerk tells everybody who comes out in a towel that it was a drunk looking for his own room. She earned her money.');
        else c.heat(talker, 1, 'knocked on the wrong door');
      },
    },

    gary: {
      engine: 'vote', time: '12:20 A.M.', place: garyRoom, title: 'Gary', kicker: 'A VOTE',
      text: (c) => [
        `Gary Feld is fifty-eight, in a cardigan, sitting on the end of the bed with his hands between his knees. There are ${c.rng.int(9, 23)} Twix wrappers on the carpet. ${c.memo.found ? 'He seems almost relieved.' : 'He is shaking. He heard everything.'}`,
        '“I read it,” he says. “All of it. Thirty-one years. I didn’t want to. Sal made me.” He looks at each of you. “So what happens to me?”',
      ],
      options: (c) => [
        { id: 'basement', label: 'Nonna’s basement', blurb: 'Hide him until Monday. He eats $10k of groceries out of the Bag every night, and he is not a patient man.', risk: 0.4, reward: 0.5 },
        { id: 'pay', label: 'Pay him to disappear', blurb: `${money(c.scale(50000))} out of the Bag, or your pockets if the Bag can’t, and a bus ticket to Arizona. He never testifies.`, risk: 0.1, reward: 0.4 },
        { id: 'talk', label: 'Talk him round', blurb: 'Convince him to go home and keep quiet. Free, if it works. If it doesn’t, he walks straight to Prout.', risk: 0.6, reward: 0.6 },
        { id: 'leave', label: 'Leave him', blurb: 'Walk out. Whatever Gary does next, it isn’t your problem. It will be.', risk: 0.9, reward: 0.1 },
      ],
      angles(c) {
        const ps = c.rng.shuffle(c.free.map((p) => p.id));
        const out = {};
        if (ps[0]) {
          out[ps[0]] = { option: 'pay', text: `Pay him. Gary owes you ${money(20000)} from 2016, and if he gets a bus ticket and an envelope, he’ll pay you back out of it before he gets on the bus. Nobody needs to know.` };
          c.memo.garyOwes = ps[0];
        }
        const rat = c.free.find((p) => p.secret?.id === 'rat');
        if (rat) out[rat.id] = { option: 'leave', text: 'Leave him. Prout wants Gary more than he wants anything. If Gary walks into Prout’s office, Prout will remember who let him.' };
        if (ps[1] && !out[ps[1]]) out[ps[1]] = { option: 'talk', text: 'Talk him round. Gary did your mother’s taxes for twenty years. He’ll listen to you — it’s two easier, if you’re the one who tries.' };
        if (ps[1] && out[ps[1]]?.option === 'talk') c.memo.garyFriend = ps[1];
        for (const id of ps) if (!out[id]) out[id] = { option: null, text: 'You’ve never met Gary. He seems nice. That’s the problem with him.' };
        return out;
      },
      resolve(c, { choice }) {
        c.memo.garyChoice = choice;
        if (choice === 'basement') {
          c.set('gary', 'basement');
          c.line('Gary goes out through the back window with a pillowcase of Twix. By one o’clock he’s in Nonna’s basement, on a camp bed, asking if there is any soup.');
          return;
        }
        if (choice === 'pay') {
          const paid = tablePays(c, c.scale(50000));
          if (!paid.ok) {
            // not enough to start a new life on: you'll have to talk him round instead
            c.memo.garyChoice = 'talk';
            c.line(`Between the Bag and everybody’s pockets there’s ${money(paid.had)}. Gary counts it with his lips moving and pushes it back. “That’s not Arizona,” he says. “That’s New Jersey.” Now somebody has to talk him round.`);
            return;
          }
          const n = paid.paid;
          c.set('gary', 'arizona');
          c.line(`${howPaid(paid)}, counted onto the motel bed. Gary cries a little. He’s on the 6 a.m. bus to Phoenix.`);
          const o = c.memo.garyOwes;
          if (o && !c.isAway(o)) { const back = Math.min(20000, n); c.give(o, back, 'Gary’s old debt'); c.note(o, `On the way out Gary pressed ${money(back)} into your hand. “2016,” he said. “We’re square.”`, 'Gary Feld'); }
          return;
        }
        if (choice === 'leave') {
          c.set('gary', 'prout');
          c.line('You leave him there. By breakfast he is in Prout’s office, eating a bagel, talking.');
          c.caseFile(2, 'Gary Feld walked into Prout’s office');
        }
      },
    },

    'talk-him-down': {
      engine: 'roll', time: '12:35 A.M.', place: garyRoom, title: 'Talking Gary Round', kicker: 'THE DICE',
      text: (c) => [`Everybody sits on the other bed. ${c.memo.garyFriend && !c.isAway(c.memo.garyFriend) ? `${c.name(c.memo.garyFriend)} does most of the talking. Gary listens to them.` : 'Somebody starts talking. Gary picks at his cardigan.'}`],
      target: (c) => 8 - (c.memo.found ? 0 : -1),
      mods: (c) => (c.memo.garyFriend && !c.isAway(c.memo.garyFriend) ? [{ label: `Gary trusts ${c.name(c.memo.garyFriend)}`, n: 2 }] : []),
      roller: (c) => (c.memo.garyFriend && !c.isAway(c.memo.garyFriend) ? c.memo.garyFriend : c.freeByJob('talker')?.id ?? null),
      label: 'Talking Gary round',
      stakes: 'Make it and Gary goes to his sister’s, quiet, and leaves you a page of the ledger as a thank-you. Miss it and he goes straight to Prout.',
      resolve(c, r) {
        if (r.success) {
          c.set('gary', 'sister');
          const who = c.memo.garyFriend && !c.isAway(c.memo.garyFriend) ? c.memo.garyFriend : c.rng.pick(c.free).id;
          const card = c.card(who, 'ledger-page');
          const about = c.rng.pick(c.players.filter((p) => p.id !== who));
          if (card && about) { card.about = about.id; card.line = `${about.name} — page ${c.rng.int(3, 310)}, from Gary`; }
          c.line(`Gary nods for a long time and says he’ll go to his sister’s in Paramus and keep his mouth shut. On the way out he gives ${c.name(who)} a folded page. “I copied one,” he says. “In case. You have it.”`);
          return;
        }
        c.set('gary', 'prout');
        c.line('Gary nods, and nods, and says he understands, and at seven the next morning he is in Prout’s office in the same cardigan.');
        c.caseFile(2, 'Gary Feld is talking to Prout');
      },
    },

    headlights: {
      engine: 'vote', time: '12:50 A.M.', place: 'The parking lot, Route 9 Motor Inn', title: 'Headlights', kicker: 'WHO STAYS BEHIND?',
      text: (c) => [
        `Headlights swing into the lot: ${c.flag('war') ? 'a black Lincoln with Castellano plates' : 'an unmarked Crown Victoria, Prout’s people'}. ${c.flag('gary') === 'prout' && !c.flag('war') ? 'Gary must have called them himself, the minute you said you were leaving.' : 'They’re here for Gary too.'} Somebody has to stay behind and stall them while everybody else gets out the back.`,
        'Pick who stays. Everybody sees who picked who. Whoever stays rolls for it.',
      ],
      candidates: (c) => c.free.map((p) => p.id),
      resolve(c, { choice }) {
        c.memo.stall = choice;
        c.line(`${c.name(choice)} stays. Everybody else goes out the bathroom window, one at a time, which takes longer than anybody would like.`);
        for (const p of c.free) if (p.id !== choice) c.g.bond(p.id, choice, 'left-behind');
      },
    },

    stall: {
      engine: 'roll', time: '12:52 A.M.', place: 'The parking lot, Route 9 Motor Inn', title: 'Stalling', kicker: 'THE DICE',
      text: (c) => [`${c.name(c.memo.stall)} walks out into the headlights with their hands where everybody can see them and a story they are making up as they go.`],
      target: () => 6,
      who: (c) => [c.memo.stall],
      roller: (c) => c.memo.stall,
      mods: (c) => (['talker', 'muscle'].includes(c.p(c.memo.stall)?.job) ? [{ label: c.p(c.memo.stall).job === 'talker' ? 'a born talker' : 'nobody argues with the Muscle', n: 1 }] : []),
      label: (c) => `${c.name(c.memo.stall)} stalls them.`,
      stakes: 'Make it and Nonna hears about it. Miss it and it’s a long night in the back of a car: two heat.',
      resolve(c, r) {
        const who = c.memo.stall;
        if (r.success) {
          c.line(`${c.name(who)} ${c.rng.pick(['asked them about the ice machine for ten minutes', 'pretended to be the night manager, and then actually checked somebody in', 'started an argument about the parking and won it'])}. Everybody else got out the back.`);
          c.give(who, 10000, 'staying behind');
          c.note(who, 'Nonna heard you stayed behind. She sent $10k round in an envelope with a note that just said “good.”', 'Nonna');
          return;
        }
        c.line(`It went badly. ${c.name(who)} got a flashlight in the face and a long conversation in the back of a car.`);
        c.heat(who, 2, 'stayed behind at the motel');
      },
    },

    'the-ice-machine': {
      engine: 'roll', time: '12:50 A.M.', place: 'The breezeway, Route 9 Motor Inn', title: 'The Ice Machine', kicker: 'GET AWAY',
      text: () => ['On the way out somebody walks into the ice machine. It makes the noise it makes, which is like a piano falling down a staircase. Doors start opening all along the breezeway.'],
      target: (c) => 6 + (c.memo.clerkAngry ? 1 : 0),
      label: 'Out before the doors open',
      stakes: 'Miss it and half the motel gets a look at you.',
      resolve(c, r) {
        if (r.success) { c.line('Out and in the car before the first door opened. Somebody in room 6 shouted “KEEP IT DOWN” at nobody.'); return; }
        c.line('Seven doors open. Seven people in motel towels get a good long look at all of you.');
        for (const p of c.free) c.heat(p.id, 1, 'the ice machine');
      },
    },

    count: counting({ time: '2:15 A.M.' }),
  },
};

export { round5k };
