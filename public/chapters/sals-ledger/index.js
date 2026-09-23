// STANDOFF, Chapter 1: Sal's Ledger.
//
// Seven nights in one neighbourhood. This file is the director: it deals the
// week, decides which night comes next from what has already happened, and
// hands the engine the beats. The nights themselves live in ./nights.

import { round5k } from '../../engine/util.js';
import { buildDeck } from '../../engine/cards.js';
import { JOBS, JOB_ORDER, JOB_REST } from './jobs.js';
import { dealSecrets, dealFamilySecrets, secretText } from './secrets.js';
import { familiesOn, splitFamilies, dealFamilyJobs, familyPlan, familyPots } from './families.js';
import { COMPLICATIONS, POOLS } from './complications.js';
import { milestoneNow } from './common.js';
import { ending } from './ending.js';
import { takeDeal } from './nights/the-room.js';
import { dealBios, bioView } from './bios.js';
import { MOMENT_BEAT, MOMENT_AT, AFTER_BEAT } from './moments.js';

import prologue from './nights/prologue.js';
import threeBanks from './nights/three-banks.js';
import morning, { twist } from './nights/morning.js';
import theRoom from './nights/the-room.js';
import nightBefore from './nights/night-before.js';
import trial from './nights/trial.js';
import { EXTRA_NIGHTS } from './nights/all.js';
import castellanoNights from './nights/castellano.js';
import raid from './nights/raid.js';

const NIGHTS = Object.fromEntries([prologue, threeBanks, morning, twist, theRoom, nightBefore, trial, ...EXTRA_NIGHTS, ...castellanoNights, raid].map((n) => {
  // before the job starts, everybody gets twenty minutes to themselves; after
  // the count, whoever made it back sits down at the table it started from
  const at = MOMENT_AT[n.id];
  if (at == null) return [n.id, n];
  const beats = n.beats.slice();
  beats.splice(at, 0, 'moments/before');
  beats.push('moments/after');
  return [n.id, { ...n, beats }];
}));

/** Every beat in the chapter by its global id: "night/beat". */
const BEATS = {};
for (const night of Object.values(NIGHTS)) {
  for (const [id, def] of Object.entries(night.defs ?? {})) BEATS[`${night.id}/${id}`] = def;
}
for (const [id, def] of Object.entries(COMPLICATIONS)) BEATS[`complications/${id}`] = def;
BEATS['moments/before'] = MOMENT_BEAT;
BEATS['moments/after'] = AFTER_BEAT;

/**
 * The slots in the week, and what can fill them. Each entry is a night id and
 * a weight, which may read the notebook; nights that aren't written yet are
 * simply skipped.
 */
const SLOTS = {
  act1: { act: 1, pool: [
    ['retaliation', (c) => (c.flag('war') ? 1000 : 0)],
    ['night-guard', () => 1],
    ['bookies-box', () => 1],
    ['wedding', (c) => (c.flag('war') ? 0 : 1)],
  ] },
  act2: { act: 2, pool: [
    ['motel', (c) => (['prout', 'arizona', 'basement', 'sister'].includes(c.flag('gary')) ? 0 : 1.4)],
    ['confessional', () => 1],
    ['ring', (c) => (c.players.some((p) => p.secret?.id === 'nonnas-favourite') ? 50 : 1.2)],
    ['armored-car', (c) => (c.bag.total < milestoneNow(c) ? 1.6 : 1)],
    ['phone-call', (c) => (c.players.some((p) => p.heat >= 2) ? 1.6 : 1)],
    ['drop', () => 1],
    ['somebody-talked', (c) => (c.caseFileValue >= 5 || c.players.some((p) => p.deal) ? 1.8 : 0.5)],
    ['night-guard', () => 0.6],
    ['bookies-box', () => 0.6],
    ['retaliation', (c) => (c.flag('war') && !c.flag('truce') ? 0.8 : 0)],
  ] },
  last: { act: 3, pool: [
    ['counting-house', (c) => Math.max(0.2, (c.bag.target - c.bag.total) / Math.max(1, c.bag.target) * 4)],
    ['cleanup', (c) => Math.max(0.2, (c.caseFileValue - 3) * 0.8)],
  ] },
  short1: { act: 1, pool: null },
  // the Benedettos' second night in a Families game: the wedding and the
  // retaliation are shared with the Castellanos, so they don't come up here
  fam1: { act: 1, pool: [['night-guard', () => 1], ['bookies-box', () => 1]] },
};
SLOTS.short1.pool = SLOTS.act1.pool;

/** Nights that only make sense with the Castellanos as strangers across the river. */
const NOT_IN_FAMILIES = new Set(['wedding', 'retaliation']);

function pick(c, slot) {
  const def = SLOTS[slot];
  if (!def) return null;
  const played = new Set([...c.s.week.plan.filter((x) => !x.startsWith('slot:') && !x.startsWith('split:')), ...(c.s.week.played ?? [])]);
  const options = def.pool
    .filter(([id]) => NIGHTS[id] && !played.has(id) && !(c.s.families && NOT_IN_FAMILIES.has(id)))
    .map(([id, w]) => [id, Math.max(0, w(c))])
    .filter(([, w]) => w > 0);
  if (!options.length) return null;
  const total = options.reduce((a, [, w]) => a + w, 0);
  let r = c.rng() * total;
  for (const [id, w] of options) {
    r -= w;
    if (r <= 0) return id;
  }
  return options[options.length - 1][0];
}

/** When a family's slot has nothing left in it, any night they haven't played. */
function fallbackNight(c) {
  const played = new Set(c.s.week.played ?? []);
  const any = ['night-guard', 'bookies-box', 'confessional', 'drop', 'armored-car', 'phone-call', 'ring']
    .filter((id) => NIGHTS[id] && !played.has(id));
  return any.length ? c.rng.pick(any) : null;
}

function plan(c) {
  if (c.s.families) return familyPlan(c);
  if (c.s.config.length === 'short') {
    c.set('nightDays', [0, 2, 4, 6]);
    return ['prologue', 'three-banks', 'morning', 'slot:short1', 'morning', 'the-room', 'slot:act2', 'morning',
      ...(c.rng.chance(0.5) ? ['twist'] : []), 'night-before', 'trial'];
  }
  c.set('nightDays', [0, 1, 2, 3, 4, 5, 6]);
  return ['prologue', 'three-banks', 'morning', 'slot:act1', 'morning', 'the-room', 'slot:act2', 'morning',
    'slot:act2', 'morning', 'twist', 'slot:act2', 'morning', 'slot:last', 'morning', 'night-before', 'trial'];
}

function setup(c) {
  const n = c.players.length;
  if (familiesOn(c)) return setupFamilies(c);
  c.s.bag.target = bagTarget(c, n);
  // a bigger crew leaves a bigger trail before anybody does anything
  const start = n >= 9 ? 4 : n >= 7 ? 3 : 2;
  c.s.caseFile = start;
  c.s.caseLog.push({ night: -1, delta: start, why: 'Prout’s folder, before anybody did anything', hidden: false });
  // jobs: a Talker and a Driver first, always, then the rest shuffled
  const order = [...JOB_ORDER, ...c.rng.shuffle(JOB_REST)];
  const seats = c.rng.shuffle(c.players.slice());
  seats.forEach((p, i) => { p.job = order[i % order.length]; });
  for (const p of c.players) p.cash = 20000;
  c.s.deck = c.rng.shuffle(buildDeck());
  for (const p of c.players) c.g.draw(p.id, 2);
  dealSecrets(c, NIGHTS.ring ? ['ring'] : []);
  dealBios(c);
}

/** What Morty wants: about $80k a head (people earn during the day too), less for a short week. */
function bagTarget(c, n) {
  const week = c.s.config.length === 'short' ? 0.6 : 1;
  return round5k((90000 * n + 60000) * week);
}

/** Seven to ten: two sides of the river. */
function setupFamilies(c) {
  const n = c.players.length;
  splitFamilies(c);
  const nb = c.family('b').length;
  c.s.bag.target = bagTarget(c, nb);
  // the Castellanos will do their own filling of this folder
  const start = 2;
  c.s.caseFile = start;
  c.s.caseLog.push({ night: -1, delta: start, why: 'Prout’s folder, before anybody did anything', hidden: false });
  dealFamilyJobs(c, JOB_ORDER, JOB_REST);
  for (const p of c.players) p.cash = 20000;
  c.s.deck = c.rng.shuffle(buildDeck());
  for (const p of c.players) c.g.draw(p.id, 2);
  dealFamilySecrets(c, NIGHTS.ring ? ['ring'] : []);
  dealBios(c);
}

/** The act of whatever real night comes next, to know when an act has ended. */
function nextAct(c) {
  const w = c.s.week;
  for (let i = w.i + 1; i < w.plan.length; i++) {
    const id = w.plan[i];
    if (id.startsWith('slot:')) return SLOTS[id.slice(5)]?.act ?? null;
    if (id.startsWith('split:')) {
      const first = id.slice(6).split('|')[0];
      if (first.startsWith('slot:')) return SLOTS[first.slice(5)]?.act ?? null;
      return NIGHTS[first]?.act ?? null;
    }
    const def = NIGHTS[id];
    if (def && !def.interlude) return def.act ?? null;
  }
  return 4;
}

function lockupTalk(c, pid) {
  const others = c.others(pid);
  const lines = [];
  const rat = c.players.find((p) => p.secret?.id === 'rat');
  if (rat && rat.id !== pid) {
    const clean = others.filter((p) => p.id !== rat.id);
    if (clean.length) {
      const q = c.rng.pick(clean);
      lines.push(`Sal leans against the bars. “Somebody’s been talking to Prout. I know it isn’t ${q.name}. ${q.name} couldn’t keep a secret from a dog. That’s all I know.”`);
    }
  }
  const pages = others.filter((p) => p.cards.some((x) => x.id === 'ledger-page'));
  if (pages.length) lines.push(`Sal lowers his voice. “${c.rng.pick(pages).name} has a page of my book. Don’t ask me how I know. I know where all of them are. That’s the problem with writing things down.”`);
  const t = c.rng.pick(others);
  if (t) {
    const sv = secretText(c, t);
    lines.push(`Sal is bored, and when Sal is bored he talks. “${t.name}? ${t.name} wants something this week. ${sv.kind === 'revenge' ? 'Somebody at that table is going to get hurt.' : sv.kind === 'greed' ? 'Money. It’s always money with that one.' : sv.kind === 'loyalty' ? 'They’re looking after somebody. They think nobody notices.' : 'Something for Ma, I think. Or something for me.'}”`);
  }
  lines.push('Sal talks about tomatoes for forty minutes. Then, as you are leaving: “The Verdict. Everything you put in the Bag, Morty spends. Everything you don’t, Prout takes half of if I go down. Think about that.”');
  return c.rng.pick(lines);
}

function onArrest(c, pid) {
  c.note(pid, 'You’re in county tonight, in the cell next to Sal. You get one phone call, you can ask for Prout, and Sal will talk to you whether you like it or not.', 'County lockup');
}

/** Gary, the Castellanos and the rest of the week happen between nights too. */
function afterNight(c, nightId) {
  if (NIGHTS[nightId]?.interlude) return;
  if (c.track) return;
  if (c.flag('gary') === 'basement') {
    const n = c.bagTake(10000);
    if (n) c.remember(`Gary ate ${n >= 10000 ? '$10k' : 'what was left'} of groceries out of the Bag. He wants to know if there is any more of the soup.`);
  }
}

export default {
  id: 'sals-ledger',
  number: 1,
  title: 'Sal’s Ledger',
  blurb: 'Seven nights, one gym bag, one folder. Sal is in county, Nonna is in charge, and somebody at this table is going to talk.',
  jobs: JOBS,
  slots: SLOTS,
  setup,
  plan,
  pick,
  fallbackNight,
  nextAct,
  familyPots,
  night: (id) => NIGHTS[id] ?? null,
  beat: (id) => BEATS[id] ?? null,
  complications(pool) {
    return (POOLS[pool] ?? []).map((id) => ({ id: `complications/${id}`, when: COMPLICATIONS[id].when }));
  },
  nightNumber: (c, id) => (NIGHTS[id]?.interlude ? null : c.s.week.n),
  secretView: secretText,
  bioView,
  milestone: (c) => ({ want: milestoneNow(c), act: c.s.scene?.act ?? 1 }),
  takeDeal,
  lockupTalk,
  onArrest,
  afterNight,
  ending,
  nights: NIGHTS,
};
