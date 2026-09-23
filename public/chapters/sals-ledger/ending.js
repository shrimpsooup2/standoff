// Monday: who ends up with what, and what became of everybody.
//
// The order matters and is shown on everybody's receipt: the Verdict, then
// Prout's deals, then Sal's thanks and Nonna's split, then pages of the
// ledger, then secrets, then IOUs, then whatever was under the mattress.

import { money, round5k, listNames } from '../../engine/util.js';
import { CARDS } from '../../engine/cards.js';
import { SECRETS, secretText } from './secrets.js';

const CREW_PAY = 25000;
const PAGE_VALUE = 30000;

export function ending(c) {
  const s = c.s;
  const salWalks = !!c.flag('salWalks');
  const named = [c.flag('trialNamed'), c.flag('trialNamedC')].filter(Boolean);
  const fams = !!s.families;
  const famOf = (p) => (fams ? c.familyOf(p.id) : 'b');
  const winners = salWalks ? 'b' : 'c';
  const n = c.players.length;
  const rows = {};
  for (const p of c.players) rows[p.id] = { pid: p.id, name: p.name, start: p.cash, lines: [], money: p.cash };
  const add = (pid, amount, label) => {
    const r = rows[pid];
    r.money += amount;
    r.lines.push({ label, n: amount });
  };

  // the Verdict: whoever's side lost Monday loses half
  for (const p of c.players) {
    const r = rows[p.id];
    const fam = famOf(p);
    if (fam === winners) continue;
    const ratSafe = p.secret?.id === 'rat' && !salWalks && !named.includes(p.id);
    const turncoatSafe = p.secret?.id === 'turncoat' && salWalks && !named.includes(p.id);
    const what = fam === 'c' ? 'Sal walked, and Vinnie took it out on everybody' : 'Sal went down';
    if (p.deal) { r.lines.push({ label: `${what}, but you had a deal`, n: 0 }); continue; }
    if (ratSafe) { r.lines.push({ label: 'Sal went down, and Prout looked after you', n: 0 }); continue; }
    if (turncoatSafe) { r.lines.push({ label: 'Sal walked, and Nonna looked after you', n: 0 }); continue; }
    const lost = round5k(r.money / 2);
    if (lost) add(p.id, -lost, `${what}: half of what you had`);
  }
  // Prout's money
  for (const p of c.players) {
    if (!p.deal) continue;
    if (c.flag(`dealForfeit:${p.id}`)) { rows[p.id].lines.push({ label: 'Prout’s money — Nonna took it', n: 0 }); continue; }
    add(p.id, p.deal.pay, 'Prout paid you for your testimony');
  }
  // Sal's thanks, and Nonna's split of what Morty didn't need
  if (salWalks) {
    const loyal = c.players.filter((p) => famOf(p) === 'b' && !p.deal && !(p.secret?.id === 'rat' && named.includes(p.id)));
    for (const p of loyal) add(p.id, CREW_PAY, 'Sal’s thanks');
    const over = Math.max(0, s.bag.total - s.bag.target);
    if (over > 0 && loyal.length) {
      const each = round5k(over / loyal.length);
      for (const p of loyal) add(p.id, each, 'Nonna split what Morty didn’t need');
    }
  }
  // or, across the river, Vinnie dividing up Sal's businesses
  if (!salWalks && fams) {
    const ours = c.players.filter((p) => famOf(p) === 'c' && !p.deal && !(p.secret?.id === 'turncoat' && named.includes(p.id)));
    const slice = ours.length ? round5k((s.bag.target * 0.2) / ours.length) : 0;
    for (const p of ours) {
      add(p.id, CREW_PAY, 'Vinnie’s thanks');
      if (slice) add(p.id, slice, 'A slice of what used to be Sal’s');
    }
  }
  // pages of the ledger
  for (const p of c.players) {
    const pages = p.cards.filter((x) => x.id === 'ledger-page').length;
    if (pages) add(p.id, pages * PAGE_VALUE, pages === 1 ? 'A page of the ledger' : `${pages} pages of the ledger`);
  }

  // rank before secrets, so a secret about ranks can't chase its own tail
  const pre = Object.values(rows).map((r) => ({ pid: r.pid, v: r.money })).sort((a, b) => b.v - a.v);
  const rank = (pid) => pre.findIndex((x) => x.pid === pid) + 1;
  const end = { salWalks, named, rank };
  const secrets = {};
  for (const p of c.players) {
    const def = SECRETS[p.secret?.id];
    if (!def) continue;
    let met = false;
    try { met = !!def.check(c, p, end); } catch { met = false; }
    secrets[p.id] = { ...secretText(c, p), met };
    if (met) {
      if (p.secret.id === 'rat') add(p.id, def.pay, 'The Rat: Prout’s money');
      else add(p.id, def.pay, `${def.name}: ${def.payer}`);
    }
  }

  // IOUs come out of Monday money, all at once
  const base = Object.fromEntries(Object.values(rows).map((r) => [r.pid, Math.max(0, r.money)]));
  for (const o of s.ious) {
    if (!rows[o.from] || !rows[o.to]) continue;
    const amt = round5k((base[o.from] * o.pct) / 100);
    if (!amt) continue;
    add(o.from, -amt, `${o.pct}% to ${c.name(o.to)}${o.why === 'dirt' ? ' (blackmail)' : ''}`);
    add(o.to, amt, `${o.pct}% of ${c.name(o.from)}’s Monday${o.why === 'dirt' ? ' (blackmail)' : ''}`);
  }
  // the mattress
  for (const p of c.players) if (p.stash) add(p.id, p.stash, 'Under the mattress');

  const table = Object.values(rows).sort((a, b) => b.money - a.money);
  table.forEach((r, i) => { r.rank = i + 1; });
  const winner = table[0];
  const families = fams ? {
    winner: winners,
    names: s.families.names,
    envelope: s.envelope?.total ?? 0,
    rows: s.families.ids.map((id) => {
      const members = table.filter((r) => c.familyOf(r.pid) === id);
      return { id, name: s.families.names[id], total: members.reduce((a, r) => a + r.money, 0), members: members.map((r) => r.name), best: members[0]?.name ?? null };
    }),
  } : null;

  return {
    salWalks,
    verdict: c.flag('verdict') ?? null,
    bag: { total: s.bag.total, target: s.bag.target },
    caseFile: s.caseFile,
    named: named.map((id) => c.name(id)),
    rat: (() => { const r = c.players.find((p) => p.secret?.id === 'rat'); return r ? { id: r.id, name: r.name, caught: named.includes(r.id) } : null; })(),
    deals: c.players.filter((p) => p.deal).map((p) => ({ id: p.id, name: p.name, where: p.deal.where, forfeit: !!c.flag(`dealForfeit:${p.id}`) })),
    winner: { id: winner.pid, name: winner.name, money: winner.money, family: fams ? c.familyOf(winner.pid) : null },
    families,
    turncoat: (() => { const t = c.players.find((p) => p.secret?.id === 'turncoat'); return t ? { id: t.id, name: t.name, caught: named.includes(t.id) } : null; })(),
    table: table.map((r) => ({
      id: r.pid, name: r.name, rank: r.rank, money: r.money, start: r.start, lines: r.lines, family: fams ? c.familyOf(r.pid) : null,
      secret: secrets[r.pid] ?? null,
      job: c.p(r.pid).job ? c.g.chapter.jobs[c.p(r.pid).job]?.name : null,
      epilogue: epilogue(c, c.p(r.pid), r, { salWalks, named, table }),
    })),
    headline: headline(c, salWalks),
    awards: awards(c),
    bonds: s.bonds.map((b) => ({ from: c.name(b.from), to: c.name(b.to), kind: b.kind, fromId: b.from, toId: b.to })),
    quiet: (s.quiet ?? []).map((q) => ({ name: c.name(q.pid), card: CARDS[q.card]?.name ?? q.card, night: q.night })),
    rooms: (s.room ?? []).map((r) => ({
      final: r.final,
      rows: Object.entries(r.choices).map(([pid, ch]) => ({ name: c.name(pid), option: ch.option, target: ch.target ? c.name(ch.target) : null })),
    })),
    caseLog: s.caseLog.map((e) => ({ delta: e.delta, why: e.why, hidden: !!e.hidden })),
    story: s.story.filter((e) => e.courier).map((e) => ({ headline: e.courier, text: e.text })),
  };
}

function headline(c, salWalks) {
  if (salWalks) {
    return c.rng.pick([
      ['BENEDETTO WALKS', 'A jury in courtroom 4B took under five hours to acquit Salvatore Benedetto, 71, who thanked the jury, his lawyer, and “the tomatoes, for their patience.”'],
      ['“AN INNOCENT GARDENER”: BENEDETTO ACQUITTED', 'Salvatore Benedetto left court a free man on Monday. Assistant District Attorney Wendell Prout said he was “disappointed” and would be “going for a very long run.”'],
    ]);
  }
  return c.rng.pick([
    ['BENEDETTO CONVICTED; “HE’S TALKING,” SAYS DA', 'Salvatore Benedetto, 71, was found guilty on Monday and, according to the District Attorney’s office, had begun “co-operating” before he reached the elevator.'],
    ['GUILTY', 'The Benedetto trial ended on Monday with a conviction and, sources say, a very long list of names. Several local men were seen leaving the neighbourhood that evening with suitcases.'],
  ]);
}

/** A paragraph for everybody, written from what they did. */
function epilogue(c, p, row, { salWalks, table }) {
  const bits = [];
  const rng = c.rng;
  const first = row === table[0];
  const last = row === table[table.length - 1];
  if (c.s.families && c.familyOf(p.id) === 'c' && !p.deal && p.secret?.id !== 'turncoat') {
    bits.push(salWalks
      ? rng.pick([
        `${p.name} spent the winter explaining to Vinnie why it wasn’t their fault. Vinnie listened to all of it and said nothing, which was worse.`,
        `${p.name} moved to Vinnie’s cousin’s place in Florida “for a while.” It has been a while.`,
      ])
      : rng.pick([
        `${p.name} ended up with the dry cleaner’s on Mulberry Avenue, which used to pay Sal and now pays them. Nonna crosses the street to avoid it.`,
        `By Christmas the neighbourhood was Vinnie’s, and ${p.name} had a corner of it. They sit in Sal’s old booth at Dolores’s. Dolores serves them. Slowly.`,
      ]));
  } else if (p.secret?.id === 'turncoat') {
    bits.push(c.flag('trialNamedC') === p.id
      ? `${p.name} was Nonna’s all along. Vinnie handed them to Prout in a courthouse men’s room. Nonna sent flowers. Nobody else did.`
      : `Nobody across the river ever found out that ${p.name} had been Nonna’s since 2011. Every Easter, a tray of pignoli cookies arrives at their door with no card.`);
  } else if (p.secret?.id === 'rat') {
    if (c.flag('trialNamed') === p.id) bits.push(`${p.name} wore Prout’s wire all week and was caught in a corridor by a ninety-four-year-old woman. They moved to Phoenix. Nonna still has the wire. She uses it to tie up tomatoes.`);
    else if (!salWalks) bits.push(`Nobody ever found out about ${p.name}. Prout paid in cash, in a diner in Hoboken, and never once said thank you.`);
    else bits.push(`${p.name} wore Prout’s wire all week, and Sal walked anyway. Prout doesn’t return ${p.name}’s calls.`);
  } else if (p.deal) {
    bits.push(rng.pick([
      `${p.name} testified on the Monday and lives in Tucson now. Every Christmas they send Nonna a card. She sends it back.`,
      `${p.name} took the deal. They run a car wash in Scranton under another name, and they still flinch at the smell of espresso.`,
    ]));
  } else if (first) {
    bits.push(rng.pick([
      `${p.name} came out of the week with ${money(row.money)} and put it into a bakery on Fifth. It does well. Nobody from the old crew goes there.`,
      `${p.name} finished the week richer than anybody at the table, and bought a boat they have never once taken out.`,
      `${p.name} counted their money twice, like Nonna taught them, and moved to a house with a garden. They grow tomatoes. They’re not as good as Sal’s.`,
    ]));
  } else if (last) {
    bits.push(rng.pick([
      `${p.name} ended the week with less than they started with. They work the counter at Dolores’s now. She says they’re very good at it.`,
      `${p.name} came out of it with ${money(row.money)} and a story nobody believes.`,
    ]));
  } else {
    bits.push(rng.pick([
      `${p.name} went back to what they were doing before, mostly. Some Sundays they drive past Sal’s garden and don’t stop.`,
      `${p.name} kept their head down and their money in a coffee can. Both are still there.`,
      `${p.name} bought a used Cadillac with the money and drove it into the river by accident in April. Everybody got out.`,
    ]));
  }
  if (p.arrests >= 2) bits.push(`${p.name} was picked up ${p.arrests} times in one week, which the precinct still talks about.`);
  else if (p.arrests === 1) bits.push(`They spent a night in county with Sal, and still do his impression.`);
  if (p.stamps.includes('LIAR')) bits.push(rng.pick(['Nobody believes a word they say, which is fair.', 'To this day, when they tell a story, somebody at the table asks to see the card.']));
  if (p.stats.given >= 100000) bits.push(`Nonna remembers the ${money(p.stats.given)} they put in the Bag. She mentions it at every christening.`);
  else if (p.stats.given === 0 && !p.deal) bits.push('Nonna remembers that they put nothing in the Bag. She mentions that at every christening too.');
  const piece = p.cards.find((x) => x.id === 'loaded-die');
  if (piece) bits.push(`They still have a Loaded Die. Nobody will play dice with ${p.name}.`);
  if (c.flag('seedTin') === p.id) bits.push('Nonna planted Sal’s seeds in April. The tomatoes were the best on the street.');
  if (c.flag('ringBy') === p.id) bits.push('Nonna wears the ring to church, and tells everybody who brought it home.');
  return bits.join(' ');
}

function awards(c) {
  const ps = c.players;
  const top = (fn, min = 1) => {
    let best = null;
    for (const p of ps) {
      const v = fn(p);
      if (v >= min && (!best || v > best.v)) best = { p, v };
    }
    return best;
  };
  const out = [];
  const giver = top((p) => c.s.bag.by[p.id] ?? 0);
  if (giver) out.push({ title: 'Nonna’s Favourite', name: giver.p.name, text: `Put ${money(giver.v)} in the Bag.` });
  const grab = top((p) => p.stats.grabbed);
  if (grab) out.push({ title: 'Just One More', name: grab.p.name, text: `Came out of the jobs with ${money(grab.v)}.` });
  const liar = top((p) => p.stats.lies);
  if (liar) out.push({ title: 'The Storyteller', name: liar.p.name, text: `Got caught doctoring ${liar.v === 1 ? 'a note' : `${liar.v} notes`}.` });
  const heat = top((p) => p.stats.heatTaken, 2);
  if (heat) out.push({ title: 'Known to Police', name: heat.p.name, text: `Took ${heat.v} heat.` });
  const grudged = top((p) => ps.reduce((n, q) => n + (q.grudges[p.id] ?? 0), 0), 2);
  if (grudged) out.push({ title: 'Least Popular', name: grudged.p.name, text: `${grudged.v} grudges held against them.` });
  const cards = top((p) => p.stats.cards ?? 0, 2);
  if (cards) out.push({ title: 'The Card Sharp', name: cards.p.name, text: `Played ${cards.v} cards.` });
  const skim = top((p) => p.stats.skimmed ?? 0);
  if (skim) out.push({ title: 'Sticky', name: skim.p.name, text: `Skimmed ${money(skim.v)}, one way or another.` });
  const named = top((p) => p.stats.named.length);
  if (named) out.push({ title: 'Helpful to the Authorities', name: named.p.name, text: `Named ${listNames(named.p.stats.named.map((id) => c.name(id)))} to Prout.` });
  return out;
}
