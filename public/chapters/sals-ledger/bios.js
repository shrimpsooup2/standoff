// Who you are: the reason you're at the table at all.
//
// Everybody is dealt two and keeps one, in the kitchen, before the first night.
// It's public — the neighbourhood knows who your people are — and it ties you
// to somebody in the story, who treats you differently for it. Most mornings
// you can spend the day with them, and they give you something only they can.

import { money } from './common.js';

// ------------------------------------------------------------------ bios --

export const BIOS = {
  godchild: { name: 'Sal’s Godchild', person: 'sal',
    text: 'Sal paid for your communion suit, your braces and your first lawyer, in that order. He has never once asked for anything back. Until now.' },
  tomato: { name: 'The Tomato Rival', person: 'sal',
    text: 'You beat Sal at the St. Anthony’s tomato fair in 1997. He has never mentioned it. He mentions it constantly.' },
  palermo: { name: 'The One from Palermo', person: 'nonna',
    text: 'Nonna’s sister’s grandchild. You arrived in September with one suitcase and no English. Now you have both, and Nonna’s spare key.' },
  jersey: { name: 'The One Who Moved to Jersey', person: 'nonna',
    text: 'You left for Hoboken, a nice apartment and a nice life. Nonna called on Monday. You were back by Monday.' },
  booth: { name: 'Dolores’s Kid', person: 'dolores',
    text: 'You grew up in the back booth at Dolores’s, doing your homework next to men counting money. You still know which booth is bugged.' },
  starlite: { name: 'The Bartender', person: 'starlite',
    text: 'You pour at the Starlite on Ferry Street. By the third drink, everybody in this neighbourhood tells you everything.' },
  partner: { name: 'Ray Mancuso’s Old Partner', person: 'ray',
    text: 'You and Ray walked a beat together for six years before you picked a side. He still owes you for 1989, and he knows it.' },
  seminary: { name: 'The Seminary Dropout', person: 'father',
    text: 'Two years at St. Joseph’s. You left over a card game. Father Dominic has forgiven you. He has not forgiven the card game.' },
  client: { name: 'Morty’s Old Client', person: 'morty',
    text: 'Morty Klein got you off in 1992 on a technicality neither of you understands. He still sends you a Christmas card with an invoice in it.' },
  boxer: { name: 'Walt’s Boxing Kid', person: 'walt',
    text: 'Walt Kowalski taught you to box at the Police Athletic League when you were nine. He still calls you “kid,” and he still says you drop your left.' },
  student: { name: 'Gary’s Best Student', person: 'gary',
    text: 'Gary Feld taught you double-entry bookkeeping at night school. You were the best student he ever had. He is the one person in this who might still trust you.' },
  ex: { name: 'Rosemarie Castellano’s Ex', person: 'rosemarie',
    text: 'You went with Vinnie Castellano’s eldest for three years. It ended at a wedding — not yours. She still calls on your birthday.' },
  homeroom: { name: 'Prout’s Homeroom Classmate', person: 'prout',
    text: 'You sat behind Wendell Prout in homeroom for four years. He was hall monitor. He is still, in every way that matters, hall monitor.' },
  shopkid: { name: 'Benny’s Shop Kid', person: 'benny',
    text: 'You swept the floor at Castellano Pawn when you were twelve. Benny paid you in watches that didn’t work. You still wear one.' },
};

/** Across the river, in a Families game. */
export const CASTELLANO_BIOS = {
  vgodchild: { name: 'Vinnie’s Godchild', person: 'vinnie',
    text: 'Vinnie stood up for you at your christening, and he has stood behind you ever since, which is not always comfortable.' },
  bigcousin: { name: 'Nicky’s Big Cousin', person: 'nicky',
    text: 'Nicky Castellano is your little cousin. You have been getting him out of trouble since he was six. He is twenty-two.' },
  shopgrand: { name: 'Benny’s Grandchild', person: 'benny',
    text: 'Benny Castellano is your grandfather. He taught you to tell real gold by biting it, which you have been told to stop doing.' },
  homeroom: BIOS.homeroom,
  partner: BIOS.partner,
  starlite: BIOS.starlite,
  boxer: BIOS.boxer,
  ex: { name: 'Sal’s Ex-Son-in-Law', person: 'sal',
    text: 'You were married to Sal’s niece for eleven months in 1999. Sal still sends a Christmas card. It says “Merry Christmas” and nothing else, on purpose.' },
  clubbar: { name: 'Behind the Bar at the Club', person: 'vinnie',
    text: 'You pour at Vinnie’s social club. You know who drinks what, who pays, and who says what after the second anisette.' },
  bestfriend: { name: 'Rosemarie’s Best Friend', person: 'rosemarie',
    text: 'Rosemarie Castellano has been your best friend since first grade. You know everything about that family. They know everything about you.' },
  bookkeeper: { name: 'Vinnie’s Bookkeeper', person: 'gary',
    text: 'You keep the club’s books. Gary Feld taught you at night school, same class as half the neighbourhood. He still calls to check your arithmetic.' },
};

const bioFor = (c, p) => (c.familyOf(p.id) === 'c' ? CASTELLANO_BIOS : BIOS)[p.bio] ?? BIOS[p.bio] ?? CASTELLANO_BIOS[p.bio] ?? null;

/** Everybody gets two to choose from, and nobody at the table shares one. */
export function dealBios(c) {
  const taken = new Set();
  for (const p of c.rng.shuffle(c.players.slice())) {
    const all = Object.keys(c.familyOf(p.id) === 'c' ? CASTELLANO_BIOS : BIOS);
    let pool = all.filter((id) => !taken.has(id));
    // a crowded table can run out of strangers; then two people can share a past
    if (pool.length < 2) pool = all;
    const two = c.rng.shuffle(pool).slice(0, 2);
    for (const id of two) taken.add(id);
    p.bioOptions = two;
  }
}

export function bioView(c, p) {
  const b = bioFor(c, p);
  if (!b) return null;
  return { id: p.bio, name: b.name, text: b.text, person: b.person, who: PEOPLE[b.person]?.who ?? null };
}

export function bioOptions(c, p) {
  const pool = c.familyOf(p.id) === 'c' ? CASTELLANO_BIOS : BIOS;
  return (p.bioOptions ?? []).map((id) => ({ id, ...(pool[id] ?? BIOS[id]) }));
}

export function personOf(c, p) {
  return bioFor(c, p)?.person ?? null;
}

// ---------------------------------------------------------------- gossip --

/** Something true about somebody else, from the last night anybody was out. */
export function gossip(c, p) {
  const log = (c.s.factLog ?? []).filter((f) => f.about !== p.id && c.p(f.about));
  if (!log.length) return null;
  const last = Math.max(...log.map((f) => f.n ?? 0));
  const recent = log.filter((f) => (f.n ?? 0) === last);
  const f = c.rng.pick(recent.length ? recent : log);
  // by the time it's gossip, tonight was last night
  const q = (f.n ?? 0) < c.s.week.n || c.s.scene?.interlude ? f.q.replace(/\btonight\b/g, 'last night') : f.q;
  return `“${q}” ${f.a ? 'Yes.' : 'No.'}`;
}

function hiddenFile(c) {
  return (c.s.caseLog ?? []).filter((e) => e.hidden).reduce((a, e) => a + e.delta, 0);
}

function edge(p, label) {
  (p.edges ??= []).push({ label });
}

function once(p, key) {
  if (p.used[key]) return false;
  p.used[key] = true;
  return true;
}

// ---------------------------------------------------------------- people --
//
// Each person: who they are, where you are seen when you spend the day with
// them (everybody sees that), and what they give you (only you see that).

export const PEOPLE = {
  sal: {
    who: 'Sal, in county',
    label: 'Visit Sal in county',
    blurb: 'Forty minutes through a sheet of glass. Sal talks. Sal always talks.',
    seen: 'visiting Sal in county',
    run(c, p, { own = false } = {}) {
      // his own people get the coffee can; everybody else gets the talking
      if (own && c.familyOf(p.id) !== 'c' && once(p, 'salMoney')) {
        const n = c.give(p.id, 15000, 'Sal');
        return `Sal leans into the glass. “There’s a coffee can behind the boiler at the club. Nobody knows about it but me and now you.” There is: ${money(n)}, in rolled-up twenties.`;
      }
      return c.g.chapter.lockupTalk?.(c, p.id) ?? 'Sal talks about tomatoes for forty minutes.';
    },
  },
  nonna: {
    who: 'Nonna',
    label: 'Spend the day in Nonna’s kitchen',
    blurb: 'She feeds you. She talks. She notices things, and sometimes she tells you what.',
    seen: 'in Nonna’s kitchen',
    run(c, p) {
      const others = c.others(p.id).filter((q) => c.familyOf(q.id) === c.familyOf(p.id));
      const out = [];
      if (once(p, 'nonnaPurse')) {
        const n = c.give(p.id, 10000, 'Nonna');
        out.push(`Nonna presses ${money(n)} into your hand from her own purse, not the Bag, and closes your fingers over it.`);
      }
      // what Nonna has noticed, and hasn't said to anybody else yet
      const said = new Set(p.used.nonnaSaid ?? []);
      const seen = [];
      const giver = others.slice().sort((a, b) => (b.stats?.given ?? 0) - (a.stats?.given ?? 0))[0];
      if (giver && (giver.stats?.given ?? 0) > 0) seen.push([`giver:${giver.id}`, `Over the dishes she says, to nobody: “${giver.name} has a good heart. I can count.” She does not say it about anybody else.`]);
      const liar = others.find((q) => q.stamps?.length);
      if (liar) seen.push([`stamp:${liar.id}`, `She dries a glass for a long time. “${liar.name}. What they say and what they do are two different people. Watch both.”`]);
      const sore = others.map((q) => [q, Object.values(q.grudges ?? {}).reduce((a, n) => a + n, 0)]).sort((a, b) => b[1] - a[1])[0];
      if (sore && sore[1] > 0) seen.push([`grudge:${sore[0].id}`, `“${sore[0].name} is carrying something against somebody at this table,” she says. “I can see it in how they hold a fork.”`]);
      const hot = others.find((q) => q.heat >= 2);
      if (hot) seen.push([`heat:${hot.id}`, `“${hot.name} should stay in tonight,” she says, to the stove. “Tell them I said.”`]);
      const fresh = seen.filter(([k]) => !said.has(k));
      if (fresh.length) {
        const [k, text] = c.rng.pick(fresh);
        p.used.nonnaSaid = [...said, k];
        out.push(text);
      } else {
        out.push(c.rng.pick([
          'She makes you peel forty cloves of garlic and tells you about 1957, which was a bad year.',
          'She teaches you her mother’s gravy, and makes you swear on Sal’s head you’ll never write it down.',
          'She falls asleep in her chair at three. You finish the dishes and let her.',
        ]));
      }
      return out.join(' ');
    },
  },
  dolores: {
    who: 'Dolores',
    label: 'Sit in the back booth at Dolores’s',
    blurb: 'She refills your coffee and tells you one true thing she overheard last night.',
    seen: 'in the back booth at Dolores’s',
    run(c, p) {
      const g = gossip(c, p);
      return g ? `Dolores refills your cup without asking. ${g} She doesn’t say how she knows. She never does.` : 'Dolores refills your cup. It was a quiet night, she says. Nobody said anything worth repeating.';
    },
  },
  starlite: {
    who: 'the Starlite',
    label: 'Work a shift at the Starlite',
    blurb: 'Tips, and whatever people say by the third drink.',
    seen: 'behind the bar at the Starlite',
    run(c, p) {
      const n = c.give(p.id, c.rng.pick([10000, 10000, 15000]), 'the Starlite');
      const g = c.rng.chance(0.6) ? gossip(c, p) : null;
      return `${money(n)} in tips.${g ? ` A regular, on his third: ${g}` : ' Nobody said anything you didn’t already know.'}`;
    },
  },
  ray: {
    who: 'Ray Mancuso',
    label: 'Meet Ray at the car wash',
    blurb: 'Ray owes you. Paperwork goes missing, or he tells you what the precinct knows.',
    seen: 'at the car wash, talking to Ray Mancuso',
    run(c, p) {
      if (p.heat > 0) {
        p.heat -= 1;
        return 'Ray doesn’t look at you. “Your name was on a sheet this morning. It isn’t now.” One heat off.';
      }
      const hot = c.others(p.id).filter((q) => q.heat > 0).sort((a, b) => b.heat - a.heat)[0];
      return hot ? `Ray, through the window: “They’re looking hard at ${hot.name}. Harder than at you.”` : `Ray, through the window: “Prout’s folder has ${c.caseFileValue} in it. That’s all I know, and I didn’t tell you.”`;
    },
  },
  father: {
    who: 'Father Dominic',
    label: 'Go to confession',
    blurb: 'Father Dominic wipes a word off your seat, or gives you his blessing for tonight.',
    seen: 'at St. Anthony’s, in the confessional',
    run(c, p) {
      if (p.stamps?.length) {
        const w = p.stamps.shift();
        return `Father Dominic listens to all of it, sighs, and says three Hail Marys will cover it. The word “${w}” comes off your seat.`;
      }
      edge(p, 'Father Dominic’s blessing');
      return 'You have very little to confess, which Father Dominic finds suspicious. He blesses you anyway. (+1 on your next roll.)';
    },
  },
  morty: {
    who: 'Morty Klein',
    label: 'Lunch at Morty’s office',
    blurb: 'Morty tells you the truth about the case. Once, he takes something off his fee for old times’ sake.',
    seen: 'at Morty Klein’s office',
    run(c, p) {
      const hidden = hiddenFile(c);
      const out = [`Morty, with his mouth full: “The folder says ${c.caseFileValue}.${hidden > 0 ? ` ${hidden} of that you can’t see. Somebody’s been feeding him.` : ' All of it on the table, as far as I can tell.'}”`];
      if (c.familyOf(p.id) !== 'c' && once(p, 'mortyFee')) {
        c.bag.target = Math.max(c.bag.total, c.bag.target - 10000);
        out.push('Then, for old times’ sake, he takes $10k off his fee. Everybody will see it come off. Nobody will know why.');
      }
      return out.join(' ');
    },
  },
  walt: {
    who: 'Walt Kowalski',
    label: 'Spend the afternoon at Walt’s gym',
    blurb: 'Walt still thinks you drop your left. He shows you a trick for tonight.',
    seen: 'at the PAL gym with Walt Kowalski',
    run(c, p) {
      edge(p, 'Walt’s trick');
      return `Walt holds the pads for an hour and tells you about ${c.rng.pick(['1979', 'his knees', 'his late wife, Irene', 'a Brinks man who never learned to look left'])}. “Keep your left up,” he says, at the door. (+1 on your next roll.)`;
    },
  },
  gary: {
    who: 'Gary Feld',
    label: 'Call Gary',
    blurb: 'Wherever he is, he picks up for you.',
    seen: 'on the phone all afternoon',
    run(c, p) {
      if (once(p, 'garyPage')) {
        c.card(p.id, 'ledger-page');
        return 'Gary, very quietly: “I copied one. In case. You have it now. Don’t tell me what you do with it.” A page of the ledger is in your hand.';
      }
      const pages = c.others(p.id).filter((q) => q.cards.some((x) => x.id === 'ledger-page'));
      return pages.length ? `Gary: “${c.rng.pick(pages).name} has one of the pages. I can tell from what they’ve been asking.”` : 'Gary wants to talk about amortization. You let him. He sounds less frightened by the end.';
    },
  },
  rosemarie: {
    who: 'Rosemarie Castellano',
    label: 'Coffee with Rosemarie',
    blurb: 'Vinnie’s eldest. She still owes you, and she still tells you things.',
    seen: 'having coffee with Rosemarie Castellano',
    run(c, p) {
      const out = [];
      if (once(p, 'rosemarie')) {
        const n = c.give(p.id, 10000, 'Rosemarie');
        out.push(`She slides an envelope across the table: ${money(n)}, “for the ring you never got back.”`);
      }
      if (c.s.envelope) out.push(`Vinnie’s Envelope, she says, has ${money(c.s.envelope.total)} in it.`);
      else out.push(c.flag('war') ? '“He knows it was you lot at the credit union,” she says. “He’s being patient. That’s the bad one.”' : '“He likes Nonna,” she says. “He’d never say it.”');
      return out.join(' ');
    },
  },
  prout: {
    who: 'Wendell Prout',
    label: 'Lunch with Prout',
    blurb: 'He pays. He tells you one true thing from his file. The whole neighbourhood sees you with him.',
    seen: 'having lunch with Wendell Prout',
    run(c, p) {
      const g = gossip(c, p);
      return `Prout orders a salad and doesn’t eat it. “For old times’ sake.” ${g ?? 'He tells you nothing you don’t know.'} On the way out he says, “My door is open,” and means it.`;
    },
  },
  benny: {
    who: 'Benny Castellano',
    label: 'Stop by Benny’s shop',
    blurb: 'Benny sells you something from under the counter for $5k.',
    seen: 'in Castellano Pawn & Loan',
    run(c, p) {
      if (p.cash < 5000) return 'Benny looks at your wallet, then at you, and goes back to his newspaper.';
      c.charge(p.id, 5000);
      const [card] = c.g.draw(p.id, 1);
      return card ? `Benny takes $5k and puts something from under the counter in a paper bag: ${card.name}.` : 'Benny takes $5k and gives you a watch that doesn’t work. Old times.';
    },
  },
  vinnie: {
    who: 'Vinnie Castellano',
    label: 'Run an errand for Vinnie',
    blurb: 'A package, an address, no questions. Vinnie pays well, and he remembers.',
    seen: 'running an errand for Vinnie',
    run(c, p) {
      const n = c.give(p.id, 15000, 'Vinnie');
      return `An address in Bensonhurst, a package that weighs nothing, and ${money(n)} in an envelope when you get back. Vinnie asks how your mother is.`;
    },
  },
  nicky: {
    who: 'Nicky Castellano',
    label: 'Keep an eye on Nicky',
    blurb: 'Nicky talks when he’s nervous. He is always nervous.',
    seen: 'with Nicky Castellano',
    run(c, p) {
      const g = gossip(c, p);
      edge(p, 'Nicky’s tip');
      return `Nicky talks for three hours. Most of it is about the Rangers.${g ? ` Some of it isn’t: ${g}` : ''} (+1 on your next roll.)`;
    },
  },
};

// --------------------------------------------------------------- the day --

const WORK = [
  'You drive a cab for Sal’s cousin until your back hurts.',
  'You unload a fish truck on Pearl Street for cash.',
  'You fix a car in somebody’s garage and don’t ask whose.',
  'You work the counter at the bakery on Fifth.',
  'You collect for Big Tommy on Ferry Street. Everybody pays. Everybody looks at you funny.',
];

/** How somebody can spend a day, given who they are. */
export function dayOptions(c, p) {
  const opts = [];
  const person = personOf(c, p);
  const fam = c.familyOf(p.id);
  if (person && PEOPLE[person]) {
    const who = PEOPLE[person];
    opts.push({ id: 'person', label: who.label, blurb: who.blurb, lean: { loyal: 1.4, nervous: 1.2 } });
  }
  opts.push({ id: 'work', label: 'Work', blurb: 'An honest day, more or less. $5k–$15k.', greedy: true });
  if (p.heat > 0) opts.push({ id: 'low', label: 'Stay in with the blinds down', blurb: 'One heat cools off. Nothing else happens, which is the point.', lean: { nervous: 3, loyal: 1.4 } });
  if (fam !== 'c' && person !== 'sal') opts.push({ id: 'sal', label: PEOPLE.sal.label, blurb: PEOPLE.sal.blurb, lean: { loyal: 1.2 } });
  if (fam === 'c' && person !== 'vinnie') opts.push({ id: 'club', label: 'Cards at Vinnie’s club', blurb: 'Vinnie’s people talk over cards. You might win something. You might hear something.' });
  if (p.job === 'driver') opts.push({ id: 'tune', label: 'Work on the car', blurb: 'New plugs, a tank of gas, the tyres checked. (+1 on your next roll.)', lean: { loyal: 1.3 } });
  if (p.job === 'lookout') opts.push({ id: 'walk', label: 'Walk the neighbourhood', blurb: 'You notice things. Somebody always leaves something out.' });
  return opts;
}

/** Everybody's day: what they get (only they know), and where they were (everybody knows). */
export function runDay(c, choices) {
  const seen = [];
  for (const [pid, ch] of Object.entries(choices)) {
    const p = c.p(pid);
    if (!p) continue;
    let note = null;
    let where = null;
    if (ch.option === 'person') {
      const who = PEOPLE[personOf(c, p)];
      if (who) { note = who.run(c, p, { own: true }); where = who.seen; }
    } else if (ch.option === 'sal') {
      note = PEOPLE.sal.run(c, p);
      where = PEOPLE.sal.seen;
    } else if (ch.option === 'work') {
      const n = c.give(p.id, c.rng.pick([5000, 10000, 10000, 15000]), 'work');
      note = `${c.rng.pick(WORK)} ${money(n)}.`;
      where = 'at work';
    } else if (ch.option === 'low') {
      if (p.heat > 0) p.heat -= 1;
      note = 'You stay in with the blinds down and the television on. One heat cools off.';
      where = 'at home with the blinds down';
    } else if (ch.option === 'club') {
      const won = c.rng.chance(0.5) ? c.give(p.id, 10000, 'cards') : 0;
      const g = gossip(c, p);
      note = `${won ? `You take ${money(won)} off Vinnie’s brother-in-law at gin.` : 'You lose a little at gin, on purpose, to the right man.'}${g ? ` Across the table somebody says: ${g}` : ''}`;
      where = 'at the Castellano social club';
    } else if (ch.option === 'tune') {
      edge(p, 'the tune-up');
      note = 'Plugs, gas, tyres, and a new air freshener shaped like a pine tree. The car will do what you ask tonight. (+1 on your next roll.)';
      where = 'under the hood of the car';
    } else if (ch.option === 'walk') {
      const g = gossip(c, p);
      note = g ? `On Ferry Street you hear it twice, from two different people: ${g}` : 'You walk until your feet hurt. The neighbourhood is keeping its mouth shut today.';
      where = 'walking the neighbourhood';
    }
    if (note) c.note(pid, note, 'the day');
    if (where) seen.push([p.name, where]);
  }
  if (seen.length) c.line(`Where everybody was today: ${seen.map(([n, w]) => `${n}, ${w}`).join('; ')}.`);
}

export function botDay(c, p, opts) {
  const has = (id) => opts.some((o) => o.id === id);
  if (p.heat >= 2 && has('low')) return 'low';
  if (p.cash < 10000 && has('work') && c.rng.chance(0.6)) return 'work';
  if (has('person') && c.rng.chance(0.55)) return 'person';
  return null;
}

