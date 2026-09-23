// Assistant DA Prout would like a word. Separately.

import { money, morningDay } from '../common.js';

/** Take Prout's deal, from the Room or from a cell. */
export function takeDeal(c, pid, where = 'room') {
  const p = c.p(pid);
  if (!p || p.deal) return;
  const before = c.players.filter((q) => q.deal).length;
  const first = before === 0;
  p.deal = { order: before + 1, where, pay: first ? 60000 : 30000, night: c.s.week.n };
  c.caseFile(first ? 2 : 1, where === 'lockup' ? 'something happened in county' : 'somebody made a deal', where === 'lockup');
  c.remember(`${p.name} took Prout's deal.`, { who: pid, kind: 'deal', secret: true });
}

/** What Prout says when you sit down, built out of what he actually knows. */
function proutOpens(c, pid) {
  const p = c.p(pid);
  const lines = [];
  for (const [who, person] of [['walt', 'Walt Kowalski'], ['pruitt', 'Harold Pruitt'], ['nicky', 'Nicky Castellano'], ['lenny', 'Lenny Russo']]) {
    if (c.flag(`${who}Saw`) === pid) lines.push(`“${person} picked you out of a book of photographs. He was very sure. I only mention it.”`);
  }
  const namedBy = c.flag(`named:${pid}`);
  if (namedBy?.length) lines.push('“Your friend says you drove. I won’t say which friend. You can think about which friend.”');
  if (p.arrests) lines.push('“We’ve met. You were less talkative in county. I respected that, at the time.”');
  if (p.stamps.includes('LIAR')) lines.push('“People are saying you’re a liar. I don’t think that’s fair. I think you’re a person under a great deal of pressure.”');
  if (c.flag('war')) lines.push('“You robbed the Castellanos. I don’t even need to prosecute you. I could just let you go home.”');
  const bank = { harbor: 'a bank on Harbor Street', 'first-federal': 'First Federal', castellano: 'a credit union on Front Street' }[c.flag('bank')];
  if (bank && c.rng.chance(0.5)) lines.push(`“A friend of yours tells me you know something about ${bank}.”`);
  if (c.bag.total < c.bag.target * 0.4) lines.push(`“Morty Klein doesn’t work for free. How much is in that gym bag? Not enough, I’d guess.”`);
  const generic = [
    '“I don’t want you. I want Sal. Give me Sal and you go home tonight.”',
    '“You’re not the first person to sit in that chair this morning. You won’t be the last. The question is what the others said.”',
    '“I run eleven miles every morning. I’m very patient. Sparkling water?”',
  ];
  const pick = lines.length ? c.rng.pick(lines) : c.rng.pick(generic);
  return `Prout opens the folder, reads something, closes it. ${pick}`;
}

export function roomBeat({ final = false } = {}) {
  return {
    engine: 'choose', time: final ? '11:30 P.M.' : '9:00 A.M.',
    place: final ? 'The back of an unmarked car on Mulberry Avenue' : 'The District Attorney’s office, fourth floor',
    title: 'The Room', kicker: 'ALONE WITH PROUT',
    text: (c) => final ? [
      'The night before the trial, Prout comes to you. One at a time, in the back of an unmarked car, engine off. He is very tired and very polite, and this is the last time he will ask.',
      'Say nothing, give him something small, name somebody, or take the deal. Nobody sees what you choose.',
    ] : [
      'Assistant District Attorney Wendell Prout has a folder, a bottle of sparkling water, and all morning. He sees each of you alone, in a room with no window and one fluorescent tube that hums.',
      'Say nothing, give him something small, name somebody, or take the deal. Nobody sees what you choose. Everybody finds out on Monday.',
    ],
    who: (c) => c.free.map((p) => p.id),
    intro: (c, pid) => proutOpens(c, pid),
    options: (c, pid) => {
      const p = c.p(pid);
      const deals = c.players.filter((q) => q.deal).length;
      return [
        { id: 'silent', label: 'Say nothing', blurb: '“I want my lawyer.”', honest: true },
        { id: 'small', label: 'Give him something small', blurb: 'A detail. Harmless on its own. Prout is good at putting harmless things together.' },
        { id: 'name', label: 'Name somebody', blurb: 'They take two heat and learn that somebody named them — not who. Prout takes one heat off you.', target: 'other', targets: c.players.filter((q) => q.id !== pid).map((q) => q.id) },
        p.deal
          ? { id: 'deal', label: 'Take the deal', blurb: 'You already have one.', disabled: 'You already have a deal.' }
          : { id: 'deal', label: 'Take the deal', blurb: `Your money is safe whatever happens Monday, and Prout pays you ${money(deals ? 30000 : 60000)}. The Case File jumps. Nobody finds out until the Trial.`, greedy: true },
      ];
    },
    fallback: () => ({ option: 'silent' }),
    bot(c, p) {
      const style = p.style;
      const rat = p.secret?.id === 'rat';
      const standUp = p.secret?.id === 'stand-up';
      const dire = c.caseFileValue >= 6 || c.bag.total < c.bag.target * (final ? 0.7 : 0.3);
      const enemy = Object.entries(p.grudges).find(([, n]) => n > 0)?.[0] ?? (['grudge', 'snake'].includes(p.secret?.id) ? p.secret.target : null);
      const r = c.rng();
      if (rat) return r < 0.5 ? { option: 'small' } : { option: 'name', target: enemy ?? c.rng.pick(c.others(p.id)).id };
      if (standUp) return { option: 'silent' };
      if (!p.deal && dire && (style === 'greedy' || style === 'snake') && r < 0.45) return { option: 'deal' };
      if (!p.deal && final && dire && r < 0.2) return { option: 'deal' };
      if (enemy && (style === 'snake' || style === 'wild') && r < 0.4) return { option: 'name', target: enemy };
      if (style === 'nervous' && r < 0.3) return { option: 'small' };
      return { option: 'silent' };
    },
    resolve(c, { choices }) {
      const entries = Object.entries(choices);
      const count = (id) => entries.filter(([, ch]) => ch.option === id).length;
      const smalls = count('small');
      const names = entries.filter(([, ch]) => ch.option === 'name');
      const deals = entries.filter(([, ch]) => ch.option === 'deal');
      c.s.room = c.s.room ?? [];
      c.s.room.push({ final, n: c.s.week.n, choices: Object.fromEntries(entries.map(([id, ch]) => [id, { option: ch.option, target: ch.target ?? null }])) });

      for (const [pid] of deals) takeDeal(c, pid, 'room');
      for (const [pid, ch] of names) {
        const namer = c.p(pid);
        namer.stats.named.push(ch.target);
        c.heat(ch.target, 2, 'Prout had a name');
        if (namer.heat > 0) namer.heat -= 1;
        c.set(`named:${ch.target}`, [...(c.flag(`named:${ch.target}`) ?? []), pid]);
        c.note(ch.target, 'Somebody at the table gave Prout your name. You don’t know who. You can think about who.', 'Prout');
        c.g.bond(pid, ch.target, 'named');
        c.betray(pid, ch.target, 'named to Prout');
        c.fact(pid, 'named', `Did ${c.name(pid)} name anybody to Prout?`, true);
      }
      for (const [pid, ch] of entries) {
        if (ch.option !== 'name') c.fact(pid, 'named', `Did ${c.name(pid)} name anybody to Prout?`, false);
        c.fact(pid, 'deal', `Did ${c.name(pid)} take Prout's deal?`, ch.option === 'deal');
      }
      if (entries.length > 1 && entries.every(([, ch]) => ch.option === 'silent')) {
        c.line('Nobody said a word. Prout came out of the Room with exactly what he went in with, and it showed.');
        c.caseFile(-1, 'Prout has less than he thought');
      } else {
        const bits = [];
        if (smalls) bits.push(smalls === 1 ? 'somebody gave him something small' : `${smalls} of you gave him something small`);
        if (names.length) bits.push(names.length === 1 ? 'somebody named names' : `${names.length} of you named names`);
        if (deals.length) bits.push(deals.length === 1 ? 'somebody took the deal' : `${deals.length} of you took the deal`);
        c.line(bits.length ? `Prout came out of the Room looking pleased with himself. As far as anybody can tell: ${bits.join(', ')}.` : 'Prout came out of the Room with nothing much.');
        if (smalls >= 2) c.caseFile(1, 'Prout put two small things together');
      }
    },
  };
}

export default {
  id: 'the-room', title: 'The Room', interlude: true, day: (c) => morningDay(c, '9:00 A.M.'), kicker: 'THE END OF ACT ONE',
  beats: ['room'],
  defs: { room: roomBeat() },
};
