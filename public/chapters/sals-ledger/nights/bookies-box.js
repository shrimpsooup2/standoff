// The Bookie's Box: the casino boat Lady Luck, a fight on the upper deck,
// and a counting room full of other people's money.

import { counting, money, round5k, nightDay, nightKicker } from '../common.js';

const DRESS = {
  waiters: { vault: 110000, alarm: 0, label: 'As waiters' },
  rollers: { vault: 170000, alarm: 1, label: 'As high rollers' },
  wedding: { vault: 150000, alarm: 0, label: 'As the wedding party' },
};

function dress(c) { return c.flag('ladyLuckDress') ?? 'waiters'; }

const FIGHTERS = {
  moretti: { name: 'Kid Moretti', blurb: 'Twenty-two, fast, from Bensonhurst. Has never been knocked down, and says so.' },
  sabatini: { name: 'Big Tony Sabatini', blurb: 'Forty-one, slow, from here. Has been knocked down eleven times and got up eleven times.' },
};

export default {
  id: 'bookies-box', title: 'The Bookie’s Box', day: nightDay, kicker: nightKicker,
  beats: [
    'dressed',
    'fight',
    'tommy',
    { if: (c) => !!c.memo.sitter, then: 'baccarat' },
    { maybe: 'inside', chance: 0.2, where: 'The corridor to the counting room, lower deck' },
    'counting-room',
    'purser',
    { oneOf: [{ beat: 'overboard', weight: 2 }, { beat: 'tender', weight: 1.5 }] },
    'count',
  ],
  close(c) {
    const took = c.memo.take ?? 0;
    c.remember(
      took
        ? `Owners of the gaming vessel Lady Luck deny reports that ${money(took)} went missing from the boat’s counting room overnight, describing the figure as “made up” and also “much too low.” A boxing exhibition on the upper deck ended in ${c.memo.fightWinner ? `a win for ${FIGHTERS[c.memo.fightWinner].name}` : 'confusion'}.`
        : 'A quiet night aboard the Lady Luck, according to the boat’s owners, apart from a fight on the upper deck and “some waiters nobody had hired.”',
      { courier: took ? '“NOTHING MISSING,” SAYS CASINO BOAT, MISSING MONEY' : 'FIGHT NIGHT ON THE LADY LUCK' },
    );
  },
  defs: {
    dressed: {
      engine: 'vote', time: '9:30 P.M.', place: 'The dock at the foot of Ferry Street', title: 'Dressed for It', kicker: 'A VOTE',
      text: (c) => [
        `The Lady Luck is a casino boat that sails three miles out every night, where the law gets vague, and comes back at two with a counting room full of cash. It belongs to ${c.flag('war') ? 'the Castellanos, which makes this personal' : 'Big Tommy Russo, who owes Sal money and has stopped returning Nonna’s calls'}.`,
        'The boat leaves in forty minutes. How do you get on it?',
      ],
      options: (c) => [
        { id: 'waiters', label: 'As waiters', blurb: 'White jackets, trays, invisible. Near the kitchen and far from the money.', risk: 0.2, reward: 0.4, details: [`Counting room: about ${money(c.scale(DRESS.waiters.vault))}`, 'The alarm starts asleep.'] },
        { id: 'rollers', label: 'As high rollers', blurb: 'Everybody buys $10k of chips at the door. Nobody looks twice at people with chips.', risk: 0.5, reward: 0.8, details: [`Counting room: about ${money(c.scale(DRESS.rollers.vault))}`, 'Costs everybody $10k.', 'The alarm starts twitchy.'] },
        { id: 'wedding', label: 'As the wedding party', blurb: 'There’s a wedding on board tonight. Nobody checks a wedding party. Unless the real one turns up.', risk: 0.6, reward: 0.6, details: [`Counting room: about ${money(c.scale(DRESS.wedding.vault))}`, 'Could be perfect. Could be a disaster.'] },
      ],
      angles(c) {
        const ps = c.rng.shuffle(c.free.map((p) => p.id));
        const out = {};
        if (ps[0]) {
          out[ps[0]] = { option: 'waiters', text: `Waiters. Your cousin runs the kitchen on the Lady Luck. If you go as waiters, the tips are yours: ${money(10000)}, and nobody else knows.` };
          c.memo.kitchenCousin = ps[0];
        }
        if (ps[1]) {
          out[ps[1]] = { option: 'waiters', text: 'Anything but high rollers. The pit boss on the Lady Luck is your ex-brother-in-law, and he would know you in the dark. If you walk in with chips, you’ll take heat, and you’ll have to decide whether to tell anybody why.' };
          c.memo.pitBoss = ps[1];
        }
        if (ps[2]) {
          out[ps[2]] = { option: 'wedding', text: 'The wedding party. It’s your second cousin Gina’s wedding. If you go as the wedding party, your aunt will press an envelope into your hand without asking a single question: $10k.' };
          c.memo.gina = ps[2];
        }
        for (const id of ps.slice(3)) out[id] = { option: null, text: 'Nothing. You just need to decide whether you look like a waiter.' };
        return out;
      },
      resolve(c, { choice }) {
        c.set('ladyLuckDress', choice);
        if (choice === 'rollers') {
          let n = 0;
          for (const p of c.free) n += c.charge(p.id, 10000);
          c.line(`Everybody buys chips at the door: ${money(n)} into the Lady Luck’s cage. You look very rich and very relaxed.`);
          const pb = c.memo.pitBoss;
          if (pb && !c.isAway(pb)) {
            c.heat(pb, 1, 'the pit boss knew your face');
            c.note(pb, 'The pit boss looked right at you and smiled. He knows. That’s one heat, and you get to decide who you tell.', 'the Lady Luck');
          }
        } else if (choice === 'waiters') {
          c.line('White jackets from a costume shop on Delancey. One of them says HOTEL on the back. Nobody notices; nobody ever looks at waiters.');
          const kc = c.memo.kitchenCousin;
          if (kc && !c.isAway(kc)) c.give(kc, 10000, 'kitchen tips');
        } else {
          c.memo.realWedding = c.rng.chance(0.5);
          c.line(c.memo.realWedding
            ? 'You walk on as the wedding party. Ten minutes later, the wedding party walks on. There are now two wedding parties. Nobody knows which one is real, including, it turns out, the bride.'
            : 'You walk on as the wedding party and the band starts playing for you. The real wedding party is stuck in traffic on the bridge. Somebody is already dancing with the bride’s mother.');
          const gi = c.memo.gina;
          if (gi && !c.isAway(gi)) c.give(gi, 10000, 'Gina’s wedding');
        }
      },
    },

    fight: {
      engine: 'choose', time: '10:45 P.M.', place: 'The upper deck of the Lady Luck', title: 'The Main Event', kicker: 'PLACE YOUR BETS',
      text: (c) => [
        `A ring has been roped off on the upper deck. In one corner, ${FIGHTERS.moretti.name}. In the other, ${FIGHTERS.sabatini.name}. The bookie is taking bets at even money, and everybody on the boat is watching the fight instead of the counting room, which is the point.`,
        'Bet what you like, on whoever you like, or nothing. Nobody sees your bet until the bell. Then everybody does.',
      ],
      intro(c, pid) {
        if (c.memo.fixHolder === pid) return `A deckhand you tip well leans in: “${FIGHTERS[c.memo.fixLoser].name} goes down in the third. It’s arranged.” He’s been right before. Not always.`;
        return null;
      },
      enter(c) {
        const ps = c.free.map((p) => p.id);
        c.memo.fixHolder = c.rng.pick(ps) ?? null;
        c.memo.fixLoser = c.rng.pick(['moretti', 'sabatini']);
        c.memo.fixReal = c.rng.chance(0.7);
      },
      who: (c) => c.free.map((p) => p.id),
      options: (c, pid) => {
        const cash = c.p(pid).cash;
        const cap = Math.min(cash, c.flag('ladyLuckDress') === 'rollers' ? 60000 : 30000);
        const off = cash < 5000 ? 'You don’t have $5k.' : null;
        return [
          { id: 'moretti', label: `On ${FIGHTERS.moretti.name}`, blurb: FIGHTERS.moretti.blurb, amount: { min: 5000, max: Math.max(5000, cap), step: 5000 }, disabled: off },
          { id: 'sabatini', label: `On ${FIGHTERS.sabatini.name}`, blurb: FIGHTERS.sabatini.blurb, amount: { min: 5000, max: Math.max(5000, cap), step: 5000 }, disabled: off },
          { id: 'none', label: 'Keep your money in your pocket', blurb: 'Watch the fight. Watch the people who bet on it.', honest: true },
        ];
      },
      reveal: 'public',
      fallback: () => ({ option: 'none' }),
      bot(c, p, opts) {
        const can = opts.find((o) => o.id === 'moretti' && !o.disabled);
        if (!can) return { option: 'none' };
        const max = can.amount.max;
        if (c.memo.fixHolder === p.id) {
          const win = c.memo.fixLoser === 'moretti' ? 'sabatini' : 'moretti';
          return { option: win, amount: Math.min(max, round5k(max * 0.7)) || 5000 };
        }
        if (c.rng.chance(p.style === 'nervous' ? 0.7 : 0.35)) return { option: 'none' };
        return { option: c.rng.pick(['moretti', 'sabatini']), amount: Math.min(max, 5000 * c.rng.int(1, 3)) };
      },
      resolve(c, { choices }) {
        const bets = {};
        for (const [pid, ch] of Object.entries(choices)) {
          if (ch.option === 'none' || !ch.amount) continue;
          const n = c.charge(pid, ch.amount);
          if (n) bets[pid] = { on: ch.option, n };
        }
        c.memo.bets = bets;
        c.g.openRoll({
          dice: 1, target: null, clampFace: true, noMuscle: true, then: 'fight',
          label: `The bell. 1–3: ${FIGHTERS.moretti.name}. 4–6: ${FIGHTERS.sabatini.name}.`,
          faces: [{ id: 'moretti', faces: [1, 2, 3] }, { id: 'sabatini', faces: [4, 5, 6] }],
        });
      },
      afterRoll(c, roll, then) {
        if (then !== 'fight') return;
        const face = roll.face;
        let winner = face <= 3 ? 'moretti' : 'sabatini';
        const fixed = c.memo.fixReal && face !== 6;
        if (fixed) winner = c.memo.fixLoser === 'moretti' ? 'sabatini' : 'moretti';
        c.memo.fightWinner = winner;
        const loser = winner === 'moretti' ? 'sabatini' : 'moretti';
        if (fixed && (face <= 3) !== (winner === 'moretti')) {
          c.line(`The die said ${FIGHTERS[loser].name}. ${FIGHTERS[loser].name} went down in the third anyway, like a man lying down for a nap. The fix was in.`);
        } else if (c.memo.fixReal && face === 6) {
          c.line(`${FIGHTERS[c.memo.fixLoser].name} was supposed to go down in the third. Nobody told his right hand. ${FIGHTERS[winner].name} wins, and a lot of people on this boat are suddenly very quiet.`);
        } else {
          c.line(c.rng.pick([
            `${FIGHTERS[winner].name} by knockout in the fifth. The deck shook.`,
            `${FIGHTERS[winner].name} on points, after eight rounds nobody will forget. Somebody’s grandmother was crying.`,
          ]));
          if (c.memo.fixHolder && !c.memo.fixReal) c.note(c.memo.fixHolder, 'Your deckhand was wrong. There was no fix. Or there was, and somebody forgot.', 'the Lady Luck');
        }
        let paid = 0;
        for (const [pid, bet] of Object.entries(c.memo.bets ?? {})) {
          if (bet.on !== winner) continue;
          c.give(pid, bet.n * 2, 'the fight');
          paid += bet.n;
        }
        const winners = Object.entries(c.memo.bets ?? {}).filter(([, b]) => b.on === winner).map(([pid]) => c.name(pid));
        c.line(winners.length ? `Paid at even money: ${c.list(winners)}. The bookie paid ${money(paid * 2)} and looked at each of them for a long time.` : 'Nobody at your table backed the winner.');
      },
    },

    tommy: {
      engine: 'vote', time: '11:30 P.M.', place: 'The baccarat table, main deck', title: 'Big Tommy’s Table', kicker: 'WHO KEEPS HIM BUSY?',
      text: (c) => [
        `Big Tommy Russo — who owns the Lady Luck, owes Sal money, and stopped returning Nonna’s calls in March — is at the baccarat table in a ${c.rng.pick(['white dinner jacket', 'tuxedo with a pinky ring on each hand', 'cardigan, somehow, over a tuxedo'])}. At one o’clock every night he goes down to the counting room himself to watch it counted.`,
        'Somebody has to sit down at his table and keep him there. Whoever it is plays against Big Tommy with their own money, and won’t see the inside of the counting room.',
      ],
      candidates: (c) => c.free.filter((p) => p.job !== 'driver' || c.free.length < 3).map((p) => p.id),
      noSelf: false,
      resolve(c, { choice }) {
        c.memo.sitter = choice;
        c.line(`${c.name(choice)} pulls out a chair at Big Tommy’s table. Tommy looks at the chips, then at ${c.name(choice)}, then smiles with all his teeth.`);
      },
    },

    baccarat: {
      engine: 'roll', time: '12:40 A.M.', place: 'The baccarat table, main deck', title: 'Banco', kicker: 'THE DICE',
      text: (c) => [
        `${c.name(c.memo.sitter)} has been at Big Tommy’s table for an hour and ten minutes. Tommy is winning, which he likes, and talking, which he likes more. It’s ten to one. One more hand decides whether he stays for another.`,
      ],
      who: (c) => [c.memo.sitter].filter((id) => c.p(id) && !c.isAway(id)),
      roller: (c) => c.memo.sitter,
      target: () => 7,
      label: (c) => `${c.name(c.memo.sitter)} plays the last hand.`,
      stakes: 'Win it and Tommy stays at the table, and you walk away with his money. Lose it and he gets bored and goes down to count, early.',
      resolve(c, r) {
        const id = c.memo.sitter;
        if (r.success) {
          const n = c.give(id, c.scale(20000), 'Big Tommy’s table');
          c.memo.tommyMod = -1;
          c.line(`${c.name(id)} turns over a natural nine. Big Tommy laughs, pays ${money(n)}, and orders another bottle. He isn’t going anywhere.`);
          c.fact(id, 'tommy', `Did ${c.name(id)} take money off Big Tommy tonight?`, true);
        } else {
          const n = c.charge(id, 10000);
          c.memo.tommyMod = 1;
          c.line(`${n ? `${c.name(id)} loses ${money(n)} on a four.` : `${c.name(id)} turns over a four, with nothing left in front of them to lose.`} Big Tommy yawns, checks his watch, and says he’ll just go down and see how the count is doing.`);
        }
      },
    },

    purser: {
      engine: 'vote', time: '1:30 A.M.', place: 'The stairs to the stern', title: 'The Purser', kicker: 'A VOTE',
      text: (c) => (c.memo.tripped ? [
        'Fat Sal is shouting somewhere behind you, and coming up the stairs to the stern with a flashlight is the purser, Mr. Anselmo, who has never once in eleven years had to run anywhere.',
        'Between you and the tender: Mr. Anselmo. What do you do?',
      ] : [
        'Asleep across the stairs to the stern, in full uniform, is the purser, Mr. Anselmo, who has been at the bar since nine. On his belt is a ring of keys, and one of them opens the captain’s cabin, where the house keeps its second box.',
        'Between you and the tender: Mr. Anselmo, and his keys. What do you do?',
      ]),
      options: (c) => (c.memo.tripped ? [
        { id: 'throw', label: 'Throw the money down to the tender first', blurb: 'Then jump after it. If a bag misses the tender, it misses.', risk: 0.4, reward: 0.4 },
        { id: 'bribe', label: 'Pay Anselmo to look at the sea', blurb: `${money(5000)} each. He makes forty dollars a night. The jump is easier.`, risk: 0.2, reward: 0.4 },
        { id: 'lifeboat', label: 'Hide in a lifeboat until it goes quiet', blurb: 'The jump will be easy. The boat is getting closer to the dock the whole time.', risk: 0.5, reward: 0.3 },
      ] : [
        { id: 'step', label: 'Step over him', blurb: 'Quietly. He’s a heavy sleeper. Probably.', risk: 0.1, reward: 0.2 },
        { id: 'keys', label: 'Take his keys: the captain’s cabin', blurb: 'The house’s second box. More money. Mr. Anselmo is a heavy sleeper, probably.', risk: 0.6, reward: 0.8 },
        { id: 'bed', label: 'Put him to bed', blurb: 'Carry him to his cabin, take his shoes off. Somebody on this boat should be kind to him.', risk: 0.2, reward: 0.3 },
      ]),
      resolve(c, { choice }) {
        const inside = c.free.filter((p) => p.id !== c.memo.sitter);
        if (choice === 'throw') {
          if (c.rng.chance(0.6)) { c.memo.exitMod = -1; c.line('The bags land in the tender, one after another, thump thump thump. Everybody jumps lighter.'); }
          else {
            let lost = 0;
            for (const p of inside) lost += c.charge(p.id, round5k((c.memo.hauls?.[p.id] ?? 0) * 0.25));
            c.line(`Most of the bags land in the tender. One doesn’t. ${money(lost)} goes down between the Lady Luck and the tender and does not come up.`);
          }
        } else if (choice === 'bribe') {
          let paid = 0;
          for (const p of c.free) paid += c.charge(p.id, 5000);
          c.memo.exitMod = -1;
          c.line(`${money(paid)} goes into Mr. Anselmo’s jacket. He turns round and looks at the sea very hard, for as long as you need.`);
        } else if (choice === 'lifeboat') {
          c.memo.exitMod = -2;
          if (c.rng.chance(0.4)) { for (const p of c.free) c.heat(p.id, 1, 'seen coming out of a lifeboat'); c.line('It goes quiet after twenty minutes. By then the boat is close enough to the dock that people on it can see people coming out of a lifeboat.'); }
          else c.line('Twenty minutes under the tarp, knees in each other’s ribs. Then quiet, and the stern, and the tender.');
        } else if (choice === 'keys') {
          if (c.rng.chance(0.6)) {
            const extra = round5k(c.scale(30000));
            const each = round5k(extra / Math.max(1, inside.length));
            for (const p of inside) c.give(p.id, each, 'the captain’s cabin');
            c.memo.take = (c.memo.take ?? 0) + each * inside.length;
            c.line(`The keys come off his belt without a sound. The captain’s cabin has a strongbox, and the strongbox has ${money(each * inside.length)} in it. Mr. Anselmo sleeps through all of it.`);
          } else {
            c.memo.exitMod = 1;
            c.line('The keys come off his belt with a sound like a church bell. Mr. Anselmo sits up and says “Hey.” Then he says it much louder.');
          }
        } else if (choice === 'bed') {
          c.memo.exitMod = -1;
          c.line('You carry Mr. Anselmo to his cabin and take his shoes off. He opens one eye, says “The tender’s untied at the back, you’ll want to hurry,” and goes back to sleep.');
        } else {
          c.line('Everybody steps over Mr. Anselmo, one by one, in their socks.');
        }
      },
    },

    'counting-room': {
      engine: 'grab', time: '1:15 A.M.', place: 'The counting room, lower deck', title: 'Just One More', kicker: 'HOW GREEDY ARE YOU?',
      carCaught: (c, n) => `${n} was still in the tender at the stern with the engine running, lit up by the deck lights. Somebody at the rail got a very good look.`,
      text(c) {
        const d = dress(c);
        const how = {
          waiters: 'You wheel a room-service trolley down to the lower deck with a white cloth over nothing.',
          rollers: 'You tell the man on the stairs you’re looking for the washroom. He’s never seen anybody so rich get so lost.',
          wedding: c.memo.realWedding ? 'In the chaos of two wedding parties, nobody notices four more people wandering into the wrong room.' : 'The best man is giving a speech. Nobody is looking anywhere else.',
        }[d];
        const driver = c.freeByJob('driver');
        return [
          `${how} The counting room door is propped open with a fire extinguisher. Inside: tonight’s take, in rubber bands, on a table, and nobody${c.memo.tommyMod > 0 ? ' — yet. Big Tommy is on his way down the stairs from the baccarat table, slowly, because he is Big Tommy' : c.memo.tommyMod < 0 ? '. Upstairs, Big Tommy has just ordered another bottle' : ''}.`,
          `Every round, grab or go. The alarm is a man called Fat Sal (no relation) who comes back from his cigarette whenever he feels like it. ${driver ? `${driver.name} is in the tender tied up at the stern, and decides when it leaves.` : 'Nobody is minding the tender.'}`,
        ];
      },
      who: (c) => c.free.map((p) => p.id).filter((id) => id !== c.memo.sitter),
      vault: (c) => round5k(c.scale(DRESS[dress(c)].vault) * (0.85 + c.rng() * 0.3)),
      alarm: (c) => Math.max(0, DRESS[dress(c)].alarm + (dress(c) === 'wedding' && c.memo.realWedding ? 1 : 0) + (c.memo.tommyMod ?? 0)),
      resolve(c, r) {
        const total = Object.values(r.hauls).reduce((a, b) => a + b, 0);
        c.memo.take = total;
        c.memo.hauls = r.hauls;
        c.memo.tripped = r.tripped;
        if (!total) c.line('Nobody came out of the counting room with anything. Fat Sal finished his cigarette.');
        else c.line(`${money(total)} came out of the counting room in pockets, sleeves and one cummerbund.`);
      },
    },

    overboard: {
      engine: 'roll', time: '1:40 A.M.', place: 'The stern of the Lady Luck', title: 'Overboard', kicker: 'GET AWAY',
      text: (c) => [
        c.memo.tripped ? 'Fat Sal is back, and he is shouting. Everybody runs for the stern where the tender is tied up.' : 'The boat is turning for home. You have to be off it before it docks and somebody counts the counting room.',
        `${c.freeByJob('driver')?.name ?? 'Somebody'} has the tender’s engine running. It’s a four-foot drop onto a moving boat in the dark.`,
      ],
      target: (c) => 7 + (c.memo.tripped ? 1 : 0) + (c.memo.exitMod ?? 0),
      roller: (c) => c.freeByJob('driver')?.id ?? null,
      label: 'The jump',
      stakes: 'Miss it and somebody goes in the water, with whatever’s in their pockets.',
      resolve(c, r) {
        if (r.success) { c.line(c.rng.pick(['Everybody made the jump. The tender took off into the dark with its lights off.', 'Everybody made it. Somebody made it into the tender face-first, but they made it.'])); return; }
        const earners = c.free.filter((p) => (c.s.night.earned[p.id] ?? 0) > 0);
        const who = c.rng.pick(earners.length ? earners : c.free);
        const lost = c.charge(who.id, round5k((c.s.night.earned[who.id] ?? 0) / 2));
        c.line(`${who.name} went in. They were pulled out by the collar, ${lost ? `minus ${money(lost)} that is now in the harbor` : 'minus a shoe'}, and somebody on the Lady Luck’s deck got a good look.`);
        c.heat(who.id, 1, 'went overboard');
      },
    },

    tender: {
      engine: 'choose', time: '1:40 A.M.', place: 'The stern of the Lady Luck', title: 'The Tender', kicker: 'WHO GETS A SEAT?',
      text: (c) => [
        `The tender is tied up at the stern with the engine running. It seats ${Math.max(1, c.free.length - 1)}. There are ${c.free.length} of you.`,
        'Everybody picks one person to give a seat to. Whoever the fewest people pick swims for it. Everybody finds out who picked who.',
      ],
      who: (c) => c.free.map((p) => p.id),
      options: (c, pid) => [{ id: 'seat', label: 'Give a seat to…', target: 'other', targets: c.free.map((p) => p.id).filter((id) => id !== pid) }],
      reveal: 'public',
      bot(c, p) {
        const pool = c.free.filter((q) => q.id !== p.id);
        const friend = pool.find((q) => q.id === p.secret?.target && p.secret?.id !== 'grudge' && p.secret?.id !== 'snake')
          ?? pool.find((q) => q.id === p.secret?.partner)
          ?? pool.find((q) => c.s.oaths.some((o) => !o.brokenBy && ((o.a === p.id && o.b === q.id) || (o.b === p.id && o.a === q.id))));
        const enemies = new Set(Object.entries(p.grudges).filter(([, n]) => n > 0).map(([id]) => id));
        const ok = pool.filter((q) => !enemies.has(q.id));
        return { option: 'seat', target: (friend ?? c.rng.pick(ok.length ? ok : pool))?.id };
      },
      resolve(c, { choices }) {
        const ids = c.free.map((p) => p.id);
        if (ids.length < 2) return;
        const votes = Object.fromEntries(ids.map((id) => [id, 0]));
        for (const [pid, ch] of Object.entries(choices)) {
          if (ch.target && votes[ch.target] != null) votes[ch.target] += 1;
          c.g.bond(pid, ch.target, 'saved');
        }
        const min = Math.min(...Object.values(votes));
        const low = ids.filter((id) => votes[id] === min);
        const swimmer = c.rng.pick(low);
        if (low.length > 1) c.line(`${c.list(low.map((id) => c.name(id)))} tied for fewest. A coin decided: ${c.name(swimmer)}.`);
        const lost = c.charge(swimmer, round5k((c.s.night.earned[swimmer] ?? 0) * 0.3));
        c.line(`${c.name(swimmer)} swims. ${lost ? `They make it to shore minus ${money(lost)}, which is the harbor’s now.` : 'They make it to shore.'} They are not going to forget who didn’t pick them.`);
        c.heat(swimmer, 1, 'swam ashore under the pier lights');
      },
    },

    count: counting({ time: '2:30 A.M.' }),
  },
};
