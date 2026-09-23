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
  return out;
}

export default {
  id: 'somebody-talked', title: 'Somebody Talked', day: nightDay, kicker: nightKicker,
  beats: [
    'courier',
    'pockets',
    'hunt',
    { oneOf: [{ beat: 'sweep', weight: 1 }, { beat: 'ray-knows', weight: 1 }] },
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
          `Nonna reads it twice, folds it, and puts it face down on the table. “${hidden ? `Prout’s folder has ${hidden === 1 ? 'one thing' : `${hidden} things`} in it,` : 'Prout’s folder is fatter than it should be,'} and nobody here will tell me how. Empty your pockets.”`,
        ];
      },
    },

    pockets: {
      engine: 'story', time: '7:20 P.M.', place: 'Nonna’s kitchen table', title: 'Empty Your Pockets', kicker: 'EVERYTHING ON THE TABLE',
      run(c) {
        const rows = c.players.map((p) => ({ name: p.name, cash: p.cash, heat: p.heat, pages: p.cards.filter((x) => x.id === 'ledger-page').length, away: c.isAway(p.id) }));
        c.beat.receipt = { kind: 'pockets', rows };
        const avg = rows.reduce((a, r) => a + r.cash, 0) / Math.max(1, rows.length);
        const rich = c.players.filter((p) => !c.isAway(p.id) && p.cash > avg * 2 && p.cash >= 60000);
        for (const p of rich) {
          const n = c.charge(p.id, round5k(p.cash * 0.15));
          c.bagAdd(n, p.id);
          c.line(`Nonna looks at ${p.name}’s pile for a long time. Then she takes ${money(n)} off the top of it and puts it in the Bag. “For the lawyer,” she says. Nobody argues.`);
        }
      },
      text: (c) => [
        'Everybody puts everything on the kitchen table: money, keys, a lottery ticket, a rosary, a knife somebody says is for fruit. Nonna goes round the table and counts every pile out loud.',
        'For once, everybody knows exactly what everybody has.',
      ],
    },

    hunt: {
      engine: 'vote', time: '7:45 P.M.', place: 'Nonna’s kitchen', title: 'Nonna Wants a Name', kicker: 'WHO TALKED?',
      text: () => [
        '“Somebody at this table talked,” Nonna says. “I want a name. Now. I will be fair: if you’re right, they pay. If you’re wrong, I pay them, out of the Bag, and they will know who pointed.”',
        'Pick a name. Everybody sees who picked who.',
      ],
      candidates: (c) => c.free.map((p) => p.id),
      bot(c, p, options) {
        const friend = friendOf(c.g, p);
        const pool = options.filter((o) => o.id !== p.id && o.id !== friend);
        if (!pool.length) return null;
        const scored = pool.map((o) => ({ id: o.id, s: suspicion(c.g, p, c.p(o.id)) + (sins(c, c.p(o.id)).length && p.notes.some((n) => n.text?.includes(c.name(o.id))) ? 2 : 0) }));
        return scored.sort((a, b) => b.s - a.s)[0].id;
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
          c.line(`${t.name}. Nonna looks at ${t.name}, and ${t.name} can’t hold it. They ${guilty[0]}. ${money(n)} goes in the Bag, and ${t.name} does the dishes for the rest of the week.`);
          c.caseFile(-1, 'Nonna put a stop to it');
          for (const pid of pointers) c.g.bond(pid, t.id, 'caught');
          return;
        }
        const pay = c.bagTake(15000);
        c.give(t.id, pay, 'Nonna');
        c.line(`${t.name}. Nonna looks at ${t.name} for a long time. Then she opens the Bag and gives them ${money(pay)}. “For the insult,” she says. It wasn’t ${t.name}.`);
        for (const pid of pointers) if (pid !== t.id) c.grudge(t.id, pid, 'pointed at you in Nonna’s kitchen');
      },
    },

    sweep: {
      engine: 'roll', time: '9:00 P.M.', place: 'Nonna’s house, every room', title: 'The Sweep', kicker: 'THE DICE',
      text: () => ['Nonna calls her nephew Carmine, who used to install cable, and he goes through the house with a little box that beeps. Everybody follows him from room to room in silence.'],
      target: () => 7,
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
      engine: 'choose', time: '9:00 P.M.', place: 'A payphone on Ferry Street', title: 'Ray Knows Who', kicker: 'YOUR CALL',
      text: (c) => [
        `Ray Mancuso calls each of you, one at a time, from a payphone. He knows who talked to Prout this week — he saw the visitor log. He’ll tell you for ${money(15000)}. Or you can tell him not to tell anybody else, for ${money(15000)}.`,
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

    count: counting({ time: '12:30 A.M.' }),
  },
};
