// Somebody Talked: the Courier prints something only this table knew, and
// Nonna wants a name.

import { counting, money, round5k, nightDay, nightKicker } from '../common.js';
import { suspicion, friendOf } from '../../../engine/bots.js';

/** Things a person could really be guilty of, as far as Nonna is concerned. */
function sins(c, p) {
  const out = [];
  if (p.deal) out.push('took Prout’s deal');
  if (p.secret?.id === 'rat') out.push('has been wearing Prout’s wire');
  if (p.stats.named.length) out.push(`gave Prout ${c.list(p.stats.named.map((id) => c.name(id)))}`);
  if (c.flag(`vinnie:${p.id}`)) out.push('took Vinnie Castellano’s envelope');
  if (c.s.bonds.some((b) => b.kind === 'sold-tape' && b.from === p.id)) out.push('sold a tape to Prout');
  if (c.memo.sold?.includes(p.id)) out.push('sold Nonna’s story to Prout tonight');
  return out;
}

/** How a reporter describes a source without naming them. */
const LOOKS = {
  talker: 'somebody who does a lot of the talking',
  driver: 'somebody who drives for them',
  numbers: 'somebody who knows exactly what’s in the Bag, to the dollar',
  muscle: 'somebody built like a refrigerator',
  cousin: 'family — actual blood family',
  newguy: 'somebody new, who hasn’t been around long',
  fixer: 'somebody who fixes things for them',
  lookout: 'somebody who stands outside and watches',
  mechanic: 'somebody with grease under their fingernails',
  altarboy: 'somebody who goes to church more than the priest',
};

const PLACES = ['the fish market on Fulton Street', 'the back of St. Anthony’s', 'Carmine’s cousin’s laundromat', 'the Knights of Columbus hall', 'a locker at the Greyhound station', 'the bakery on Mulberry, in a cake box', 'the trunk of Father Dominic’s Oldsmobile', 'the bowling alley on Route 9'];

/** Who the table is leaning on tonight, for anybody not deciding for themselves. */
function leanOn(c, p, pool) {
  const friend = friendOf(c.g, p);
  const scored = pool.filter((id) => id !== p.id && id !== friend).map((id) => {
    const q = c.p(id);
    let s = suspicion(c.g, p, q);
    if (sins(c, q).length && p.notes.some((n) => n.text?.includes(q.name))) s += 2;
    if (c.memo.framed === id) s += 2;
    if (c.memo.caught?.includes(id)) s += 1.5;
    if (c.memo.looks && q.job === c.memo.looks) s += 1.5;
    return { id, s };
  });
  return scored.sort((a, b) => b.s - a.s)[0]?.id ?? null;
}

export default {
  id: 'somebody-talked', title: 'Somebody Talked', day: nightDay, kicker: nightKicker,
  beats: [
    'courier',
    'page-three',
    'hallway',
    'pockets',
    'hunt',
    { if: (c) => !!c.memo.guilty, then: 'the-rat', else: 'canary' },
    { oneOf: [{ beat: 'sweep', weight: 1 }, { beat: 'ray-knows', weight: 1 }] },
    { if: (c) => !!c.memo.fed, then: 'feed' },
    'count',
  ],
  close(c) {
    c.remember(
      c.memo.guilty
        ? 'A source close to a Mulberry Avenue family told the Courier that a “misunderstanding” had been “cleared up” and that everybody was “eating together again.”'
        : 'Nonna Benedetto, 94, when approached by the Courier on her front step, said nothing, and then said something in Sicilian the Courier will not be printing.',
      { courier: 'NONNA: “NO COMMENT”' },
    );
  },
  defs: {
    courier: {
      engine: 'story', time: '7:00 P.M.', place: 'Nonna’s kitchen, the evening Courier', title: 'The Courier', kicker: 'SOMEBODY TALKED',
      run(c) { c.caseFile(1, 'it’s in the newspaper now'); },
      text(c) {
        const hidden = c.s.caseLog.filter((e) => e.hidden).length;
        const leak = c.rng.pick([
          c.flag('bank') ? `the name of the bank you hit on Monday night, and what the napkin said` : null,
          c.flag('gary') ? 'where Gary Feld went, and who took him there' : null,
          c.flag('ring') ? 'what happened with Nonna’s ring, down to the price' : null,
          'what’s in the Knicks bag on Nonna’s kitchen table, to the nearest ten thousand',
        ].filter(Boolean));
        return [
          `The evening Courier lands on the step at seven. Page three. Nobody outside this kitchen knew ${leak}. The Courier knows. So, it follows, does Prout.`,
          `Nonna reads it twice, folds it, and puts it face down on the table. “${hidden ? `Prout’s folder has ${hidden === 1 ? 'one thing' : `${hidden} things`} in it,` : 'Prout’s folder is fatter than it should be,'} and nobody here will tell me how.”`,
        ];
      },
    },

    'page-three': {
      engine: 'vote', time: '7:10 P.M.', place: 'Nonna’s kitchen, the telephone on the wall', title: 'Page Three', kicker: 'A VOTE',
      text: (c) => [
        `The phone on the kitchen wall rings. It’s Frances Dunleavy from the Courier, who has covered Mulberry Avenue since the Carter administration and wrote page three. She’d like a comment. At the bottom of the piece it says: ${c.rng.pick(['“Part two: tomorrow.”', '“More on Thursday.”'])}`,
        'Nonna holds the phone against her chest and looks at the table. What does she do with Frances?',
      ],
      options: (c) => [
        { id: 'editor', label: 'Hang up and call the editor', blurb: `Nonna went to school with the editor’s mother. Part two never runs, for ${money(c.scale(20000))} out of the Bag in “advertising.”`, risk: 0.1, reward: 0.4 },
        { id: 'visit', label: 'Send somebody round to see her', blurb: 'Free. Frances has been visited before. Sometimes she drops a story. Sometimes the story becomes “REPORTER THREATENED.”', risk: 0.6, reward: 0.5 },
        { id: 'comment', label: 'Give her a comment, and listen', blurb: 'Part two runs, with Nonna in it. But Frances is a talker, and she might let slip what her source is like.', risk: 0.4, reward: 0.6 },
      ],
      resolve(c, { choice }) {
        const guilty = c.free.filter((p) => sins(c, p).length);
        if (choice === 'editor') {
          const want = c.scale(20000);
          const n = c.bagTake(want);
          if (n >= want) {
            c.line(`Nonna hangs up on Frances and dials a number she doesn’t need to look up. ${money(n)} of the Bag goes to the Courier’s classified department. Part two will not be running.`);
            c.caseFile(-1, 'part two never ran');
          } else {
            c.bagAdd(n);
            c.line(`Nonna calls the editor. The editor wants ${money(want)}; the Bag has ${money(n)}. “Then page nine,” says the editor, which is where part two runs.`);
          }
          return;
        }
        if (choice === 'visit') {
          const who = c.freeByJob('muscle') ?? c.rng.pick(c.free);
          c.memo.visitor = who?.id ?? null;
          if (c.rng.chance(0.5)) {
            c.line(`${who?.name ?? 'Somebody'} goes round to Frances’s apartment with a box of cannoli and stands in her doorway for a very long time without saying anything. Part two is “on hold.”`);
            c.caseFile(-1, 'part two is on hold');
          } else {
            c.line(`${who?.name ?? 'Somebody'} goes round to Frances’s apartment. Frances has a photographer. Tomorrow’s front page: REPORTER THREATENED.`);
            c.caseFile(1, 'REPORTER THREATENED');
            if (who) c.heat(who.id, 1, 'Frances Dunleavy’s photographer');
          }
          return;
        }
        // Nonna comments; Frances talks too much
        c.caseFile(1, 'Nonna is quoted in part two');
        if (guilty.length) {
          const g = c.rng.pick(guilty);
          c.memo.looks = g.job;
          c.line(`Nonna gives Frances twenty minutes on the old neighbourhood. Frances, flattered, says more than she means to: her source is “${LOOKS[g.job] ?? 'somebody close to you'}.” Everybody at the table looks at everybody else.`);
          c.fact(g.id, 'looks', `Was ${g.name} the one Frances described?`, true);
        } else {
          c.memo.walls = true;
          c.line('Nonna gives Frances twenty minutes on the old neighbourhood. Frances says she never met her source. “It came from the investigation,” she says. “From tapes.” Nobody at the table said a word to her — the walls did.');
        }
      },
    },

    hallway: {
      engine: 'choose', time: '7:15 P.M.', place: 'Nonna’s front hallway', title: 'The Hallway', kicker: 'YOUR CALL',
      text: () => [
        '“Coats off,” Nonna says. “Then everything out of your pockets, on my table.” She gives you one minute in the front hall first. There is a boot rack, an umbrella stand, a row of coats, and a plaster St. Anthony with a hollow base.',
        'Carmine, Nonna’s nephew, is standing at the end of the hall pretending not to watch. Nobody sees what you do — unless he does.',
      ],
      who: (c) => c.free.map((p) => p.id),
      options: (c, pid) => [
        { id: 'table', label: 'Everything on the table', blurb: 'You have nothing to hide, or nothing you mind Nonna counting.', honest: true },
        { id: 'boot', label: 'Keep half of it back in your boot', blurb: `Nonna only counts what’s on the table — ${money(round5k(c.p(pid).cash / 2))} of yours stays out of it. If Carmine checks your boots, it all goes in the Bag.`, greedy: true, disabled: c.p(pid).cash < 20000 ? 'There isn’t enough in your pockets to bother.' : null },
        { id: 'plant', label: 'Put a page of the Courier in somebody’s coat', blurb: 'Folded to page three. When the coats come off, it falls out of theirs. If Carmine sees you do it, it’s your name everybody says.', target: true, targets: c.free.filter((q) => q.id !== pid).map((q) => q.id) },
      ],
      fallback: () => ({ option: 'table' }),
      bot(c, p, opts) {
        const guilty = sins(c, p).length > 0;
        if (guilty && c.rng.chance(0.35)) {
          const t = leanOn(c, p, c.free.map((q) => q.id));
          if (t) return { option: 'plant', target: t };
        }
        const boot = opts.find((o) => o.id === 'boot');
        const lean = { greedy: 0.45, snake: 0.4, wild: 0.3, nervous: 0.1, loyal: 0.05 }[p.style] ?? 0.2;
        if (boot && c.rng.chance(lean)) return { option: 'boot' };
        return { option: 'table' };
      },
      resolve(c, { choices }) {
        c.memo.hidden = {};
        c.memo.caught = [];
        const planters = [];
        for (const [pid, ch] of Object.entries(choices)) {
          if (ch.option === 'boot') {
            const n = round5k(c.p(pid).cash / 2);
            if (c.rng.chance(0.35)) {
              const took = c.charge(pid, n);
              c.bagAdd(took, pid);
              c.memo.caught.push(pid);
              c.line(`Carmine asks ${c.name(pid)} to take off their boots. ${money(took)} comes out of the left one. It goes straight in the Bag, and Nonna doesn’t say anything, which is worse.`);
              c.fact(pid, 'boot', `Did ${c.name(pid)} try to hide money from Nonna?`, true);
            } else {
              c.memo.hidden[pid] = n;
              c.fact(pid, 'boot', `Did ${c.name(pid)} try to hide money from Nonna?`, true);
            }
          }
          if (ch.option === 'plant' && ch.target && c.p(ch.target)) planters.push([pid, ch.target]);
        }
        if (!planters.length) return;
        const [pid, target] = c.rng.pick(planters);
        if (c.rng.chance(0.3)) {
          c.memo.caught.push(pid);
          c.memo.framed = pid;
          c.line(`A folded page three falls out of ${c.name(target)}’s coat. “I saw who put it there,” Carmine says, and looks at ${c.name(pid)}.`);
          c.grudge(target, pid, 'put page three in your coat');
          return;
        }
        c.memo.framed = target;
        c.line(`When the coats come off, a folded page three falls out of ${c.name(target)}’s. ${c.name(target)} says they have never seen it before in their life. Everybody has heard that before.`);
        c.note(pid, `Nobody saw you put it in ${c.name(target)}’s coat.`, 'the hallway');
      },
    },

    pockets: {
      engine: 'story', time: '7:20 P.M.', place: 'Nonna’s kitchen table', title: 'Empty Your Pockets', kicker: 'EVERYTHING ON THE TABLE',
      run(c) {
        const shown = (p) => p.cash - (c.memo.hidden?.[p.id] ?? 0);
        const rows = c.players.map((p) => ({ name: p.name, cash: shown(p), heat: p.heat, pages: p.cards.filter((x) => x.id === 'ledger-page').length, away: c.isAway(p.id) }));
        c.beat.receipt = { kind: 'pockets', rows };
        const avg = rows.reduce((a, r) => a + r.cash, 0) / Math.max(1, rows.length);
        const rich = c.players.filter((p) => !c.isAway(p.id) && shown(p) > avg * 2 && shown(p) >= 60000);
        for (const p of rich) {
          const n = c.charge(p.id, round5k(shown(p) * 0.15));
          c.bagAdd(n, p.id);
          c.line(`Nonna looks at ${p.name}’s pile for a long time. Then she takes ${money(n)} off the top of it and puts it in the Bag. “For the lawyer,” she says. Nobody argues.`);
        }
      },
      text: (c) => [
        'Everybody puts everything on the kitchen table: money, keys, a lottery ticket, a rosary, a knife somebody says is for fruit. Nonna goes round the table and counts every pile out loud.',
        Object.keys(c.memo.hidden ?? {}).length
          ? 'For once, everybody knows exactly what everybody has. Or at least what everybody put on the table.'
          : 'For once, everybody knows exactly what everybody has.',
      ],
    },

    hunt: {
      engine: 'vote', time: '7:45 P.M.', place: 'Nonna’s kitchen', title: 'Nonna Wants a Name', kicker: 'WHO TALKED?',
      text: (c) => [
        '“Somebody at this table talked,” Nonna says. “I want a name. Now. I will be fair: if you’re right, they pay. If you’re wrong, I pay them, out of the Bag, and they will know who pointed.”',
        [
          c.memo.looks ? `Frances said “${LOOKS[c.memo.looks]}.”` : null,
          c.memo.walls ? 'Frances said it came off tapes. Nobody listens to Frances.' : null,
          c.memo.framed ? `Page three came out of ${c.name(c.memo.framed)}’s ${c.memo.caught?.includes(c.memo.framed) ? 'hand' : 'coat'}.` : null,
          'Pick a name. Everybody sees who picked who.',
        ].filter(Boolean).join(' '),
      ],
      candidates: (c) => c.free.map((p) => p.id),
      bot(c, p, options) {
        return leanOn(c, p, options.map((o) => o.id));
      },
      resolve(c, { choice, votes }) {
        const t = c.p(choice);
        const pointers = Object.entries(votes).filter(([, v]) => v === choice).map(([pid]) => pid);
        const guilty = sins(c, t);
        if (guilty.length) {
          c.memo.guilty = choice;
          const n = c.charge(t.id, c.scale(20000));
          c.bagAdd(n);
          c.stamp(t.id, 'RAT');
          c.line(`${t.name}. Nonna looks at ${t.name}, and ${t.name} can’t hold it: ${t.name} ${guilty[0]}. ${money(n)} of ${t.name}’s goes in the Bag.`);
          c.caseFile(-1, 'Nonna put a stop to it');
          for (const pid of pointers) c.g.bond(pid, t.id, 'caught');
          return;
        }
        c.memo.wrong = choice;
        const pay = c.bagTake(15000);
        c.give(t.id, pay, 'Nonna');
        c.line(pay
          ? `${t.name}. Nonna looks at ${t.name} for a long time. Then she opens the Bag and gives them ${money(pay)}. “For the insult,” she says. It wasn’t ${t.name}.`
          : `${t.name}. Nonna looks at ${t.name} for a long time. The Bag is empty, so she takes the rosary from round her own neck and puts it in ${t.name}’s hand. “For the insult,” she says. It wasn’t ${t.name}.`);
        for (const pid of pointers) if (pid !== t.id) c.grudge(t.id, pid, 'pointed at you in Nonna’s kitchen');
      },
    },

    'the-rat': {
      engine: 'vote', time: '8:15 P.M.', place: 'Nonna’s kitchen, the dishes in the sink', title: (c) => `What Happens to ${c.name(c.memo.guilty)}`, kicker: 'A VOTE',
      when: (c) => c.free.some((p) => p.id !== c.memo.guilty),
      voters: (c) => c.free.map((p) => p.id).filter((id) => id !== c.memo.guilty),
      text: (c) => [
        `${c.name(c.memo.guilty)} is at the sink with their sleeves rolled up. Nonna has not looked at them since. “They are family,” she says, to the table. “So the table decides.”`,
        `${c.name(c.memo.guilty)} doesn’t get a vote.`,
      ],
      options: (c) => [
        { id: 'dishes', label: 'The dishes, and that’s the end of it', blurb: 'They paid. They’re family. Nobody mentions it again.', risk: 0.1, reward: 0.1 },
        { id: 'cut', label: 'Everything in their pockets goes in the Bag', blurb: `All but cab fare. ${c.name(c.memo.guilty)} will know who voted for it.`, risk: 0.3, reward: 0.5 },
        { id: 'feed', label: 'Send them back to Prout with a story', blurb: 'Nonna writes it. They tell it. If Prout buys it, his folder has a hole in it. If he doesn’t, he knows the table knows.', risk: 0.5, reward: 0.7 },
      ],
      resolve(c, { choice, votes }) {
        const t = c.p(c.memo.guilty);
        if (choice === 'cut') {
          const n = c.charge(t.id, Math.max(0, t.cash - 5000));
          c.bagAdd(n);
          c.line(n
            ? `${money(n)} goes out of ${t.name}’s pockets and into the Bag. Nonna gives them five dollars for the bus.`
            : `${t.name} turns out their pockets: lint, a bus transfer, a button. There’s nothing to take. Nonna gives them five dollars for the bus anyway, which is worse.`);
          for (const [pid, v] of Object.entries(votes)) if (v === 'cut') c.grudge(t.id, pid, 'emptied your pockets into the Bag');
          return;
        }
        if (choice === 'feed') {
          c.memo.fed = true;
          c.line(`Nonna tears a page out of the back of her recipe book and writes on it for ten minutes. She folds it and puts it in ${t.name}’s shirt pocket. “Tonight,” she says. “You tell him this.”`);
          c.note(t.id, 'Nonna’s story, in her handwriting: a shipment of the ledger’s money going through a warehouse in Hoboken that doesn’t exist. You have until midnight.', 'Nonna');
          return;
        }
        c.line(`${t.name} does the dishes. Then the pots. Then, because nobody tells them to stop, the oven. When they sit down again, somebody passes them the bread.`);
      },
    },

    canary: {
      engine: 'choose', time: '8:30 P.M.', place: 'Nonna’s pantry, one at a time', title: 'Nonna’s Stories', kicker: 'YOUR CALL',
      enter(c) {
        const places = c.rng.shuffle(PLACES);
        c.memo.stories = Object.fromEntries(c.free.map((p, i) => [p.id, places[i % places.length]]));
      },
      text: (c) => [
        `It wasn’t ${c.memo.wrong ? c.name(c.memo.wrong) : 'who you said'}. So it’s still somebody. Nonna takes everybody into the pantry one at a time, between the tomatoes and the olive oil, and tells each of you where the Bag is going on Thursday. Everybody hears a different place.`,
        `Whichever place turns up in the Courier, Nonna will know exactly who told. Prout pays ${money(c.scale(15000))} for anything with a place and a day in it. You know what this is. So does whoever talked.`,
      ],
      who: (c) => c.free.map((p) => p.id),
      intro: (c, pid) => `Nonna told you: ${c.memo.stories?.[pid] ?? 'somewhere'}, Thursday night.`,
      options: (c) => [
        { id: 'keep', label: 'Keep it to yourself', blurb: 'It’s Nonna’s story. It stays in the pantry.', honest: true },
        { id: 'sell', label: `Sell it to Prout anyway (${money(c.scale(15000))})`, blurb: 'Maybe he sits on it. Maybe it’s in the Courier tomorrow with your place in it.', greedy: true },
        { id: 'warn', label: 'Tell Nonna the walls are listening', blurb: 'If it’s not a person, it’s the house. Carmine’s box will know where to look.' },
      ],
      fallback: () => ({ option: 'keep' }),
      bot(c, p) {
        const guilty = sins(c, p).length > 0;
        const lean = guilty ? 0.5 : ({ greedy: 0.2, snake: 0.25, wild: 0.1 }[p.style] ?? 0.03);
        if (c.rng.chance(lean)) return { option: 'sell' };
        return { option: c.rng.chance(0.3) ? 'warn' : 'keep' };
      },
      resolve(c, { choices }) {
        const sold = Object.entries(choices).filter(([, ch]) => ch.option === 'sell').map(([pid]) => pid);
        c.memo.warned = Object.values(choices).filter((ch) => ch.option === 'warn').length;
        c.memo.sold = sold;
        for (const pid of sold) {
          c.give(pid, c.scale(15000), 'Prout');
          c.caseFile(1, `${c.name(pid)} sold Nonna’s story`, true);
        }
        const printed = sold.filter(() => c.rng.chance(0.6));
        c.memo.printed = printed;
        if (!printed.length) {
          c.line(sold.length
            ? 'Thursday’s Courier has nothing about the Bag in it. Nonna reads every page anyway, including the obituaries. Whatever Prout bought, he’s sitting on it.'
            : 'Thursday’s Courier has nothing about the Bag in it. Nonna reads every page anyway, including the obituaries, and puts it down looking almost disappointed.');
          return;
        }
        for (const pid of printed) {
          const where = c.memo.stories?.[pid] ?? 'somewhere';
          const n = c.charge(pid, c.scale(30000));
          c.bagAdd(n);
          c.stamp(pid, 'RAT');
          c.line(`The late edition, page three again: “Benedetto money to move through ${where}.” Nonna only told one person ${where}. ${c.name(pid)} pays ${money(n)} into the Bag, and doesn’t look up from the table for the rest of the night.`);
          for (const p of c.free) if (p.id !== pid) c.grudge(p.id, pid, 'sold Nonna’s story to the Courier');
        }
      },
    },

    sweep: {
      engine: 'roll', time: '10:00 P.M.', place: 'Nonna’s house, every room', title: 'The Sweep', kicker: 'THE DICE',
      text: (c) => [
        'Nonna calls Carmine back from the hallway. He used to install cable, and he goes through the house with a little box that beeps. Everybody follows him from room to room in silence.',
        c.memo.walls || c.memo.warned ? 'Somebody has already told him where to start.' : null,
      ].filter(Boolean),
      target: (c) => 7 - (c.memo.walls ? 1 : 0) - (c.memo.warned ? 1 : 0),
      label: 'Carmine’s little box',
      stakes: 'Make it and he finds how Prout has been listening. Miss it and he finds nothing, which is worse.',
      resolve(c, r) {
        if (r.success) {
          c.line(`The box beeps at the ${c.rng.pick(['sugar bowl', 'picture of the Pope', 'radio', 'cuckoo clock Sal brought back from Zurich'])}. Inside it: a microphone the size of a pea. Carmine drops it in the espresso pot.`);
          c.caseFile(-1, 'Prout’s microphone is at the bottom of an espresso pot');
          return;
        }
        c.line('Carmine’s box doesn’t beep once. Whatever Prout knows, he didn’t get it from the walls. He got it from a person.');
      },
    },

    'ray-knows': {
      engine: 'choose', time: '10:00 P.M.', place: 'A payphone on Ferry Street', title: 'Ray Knows Who', kicker: 'YOUR CALL',
      text: (c) => [
        `Ray Mancuso calls each of you, one at a time, from a payphone. ${c.memo.guilty || c.memo.printed?.length ? `He heard about ${c.name(c.memo.guilty ?? c.memo.printed[0])}. He says the visitor log at Prout’s office has more than one name on it this week.` : 'He knows who talked to Prout this week — he saw the visitor log.'} He’ll tell you a name for ${money(15000)}. Or you can pay him not to tell anybody else about you, for ${money(15000)}.`,
        'Nobody sees what you do.',
      ],
      who: (c) => c.free.map((p) => p.id),
      options: (c, pid) => [
        { id: 'buy', label: `Pay Ray to tell you (${money(15000)})`, blurb: 'He’ll give you one name from the visitor log, if there is one.', disabled: c.p(pid).cash < 15000 ? 'You don’t have $15k.' : null },
        { id: 'hush', label: `Pay Ray to keep it quiet (${money(15000)})`, blurb: 'If anybody else asks about you, Ray has never heard of you.', disabled: c.p(pid).cash < 15000 ? 'You don’t have $15k.' : null },
        { id: 'no', label: 'Hang up on Ray', blurb: 'Ray is used to it.', honest: true },
      ],
      fallback: () => ({ option: 'no' }),
      bot(c, p) {
        const guilty = sins(c, p).length > 0;
        if (guilty && p.cash >= 15000 && c.rng.chance(0.6)) return { option: 'hush' };
        if (!guilty && p.cash >= 40000 && c.rng.chance(0.3)) return { option: 'buy' };
        return { option: 'no' };
      },
      resolve(c, { choices }) {
        const hushed = new Set(Object.entries(choices).filter(([, ch]) => ch.option === 'hush').map(([pid]) => pid));
        for (const pid of hushed) c.charge(pid, 15000);
        const visitors = c.players.filter((p) => sins(c, p).length && !hushed.has(p.id));
        for (const [pid, ch] of Object.entries(choices)) {
          if (ch.option !== 'buy') continue;
          c.charge(pid, 15000);
          const pool = visitors.filter((p) => p.id !== pid);
          if (!pool.length) { c.note(pid, 'Ray took your money and said the visitor log was clean. “Nobody from your table,” he said. He might even be telling the truth.', 'Ray Mancuso'); continue; }
          const v = c.rng.pick(pool);
          c.note(pid, `Ray read it off the log: ${v.name}. ${c.rng.pick(['Twice.', 'Tuesday, at 4 p.m.', 'Signed in under their mother’s maiden name, which is how Ray knew.'])}`, 'Ray Mancuso');
        }
        c.line(Object.values(choices).some((ch) => ch.option !== 'no') ? 'Ray made a very good night’s money from a payphone.' : 'Everybody hung up on Ray. He stood in the payphone for a while, then went home.');
      },
    },

    feed: {
      engine: 'roll', time: '11:30 P.M.', place: 'The Tick Tock Diner, a booth at the back', title: 'Back to Prout', kicker: 'THE DICE',
      when: (c) => !!c.memo.guilty && !c.isAway(c.memo.guilty),
      text: (c) => [
        `${c.name(c.memo.guilty)} sits across from Agent Prout in a booth at the Tick Tock with Nonna’s story in their shirt pocket. Prout orders pie. He always orders pie. He doesn’t eat it.`,
        '“So,” he says. “What have you got for me?”',
      ],
      target: (c) => 7 - (c.p(c.memo.guilty)?.job === 'talker' ? 1 : 0) + (c.p(c.memo.guilty)?.heat >= 3 ? 1 : 0),
      roller: (c) => c.memo.guilty,
      label: (c) => `${c.name(c.memo.guilty)} tells Nonna’s story`,
      stakes: 'Make it and Prout spends a week on a warehouse in Hoboken. Miss it and he knows the table knows.',
      resolve(c, r) {
        const t = c.p(c.memo.guilty);
        if (r.success) {
          c.line(`Prout writes “HOBOKEN” on a napkin and underlines it twice. He leaves without touching the pie. ${t.name} eats it.`);
          c.caseFile(-1, 'Prout is watching a warehouse in Hoboken that doesn’t exist');
          c.note(t.id, 'Prout bought it. Nonna nodded at you when you came in, once, and that was all.', 'Nonna');
          return;
        }
        c.line(`Prout listens to the whole thing, then pushes the pie across the table. “Tell your grandmother,” he says, “the warehouse in Hoboken is a parking lot. Has been since 1978.”`);
        c.caseFile(1, 'Prout knows the table knows');
        c.heat(t.id, 1, 'Prout, at the Tick Tock');
      },
    },

    count: counting({ time: '12:30 A.M.' }),
  },
};
