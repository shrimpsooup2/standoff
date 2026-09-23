// The game: one table, one chapter, one week.
//
// Everything here is chapter-agnostic. A chapter supplies the story — the
// nights, the beats inside them, the jobs, secrets and endings — and this file
// runs it: whose turn it is, what they can see, what happens when the clock
// runs out, and what the dice say.
//
// State is plain JSON and nothing else, so a table can be written to disk,
// shipped to a peer, or restored after the power goes, and deal exactly the
// same cards it was always going to deal.

import { makeRng } from './rng.js';
import { money, listNames, clamp, copy, round5k } from './util.js';
import { chance, oddsText } from './dice.js';
import { ENGINES } from './engines/index.js';
import { CARDS, cardView, canPlay, playCard, autoCard, handLimit } from './cards.js';
import { styleFor, BOT_NAMES } from './bots.js';
import { getChapter, DEFAULT_CHAPTER } from '../chapters/index.js';

export const MAX_PLAYERS = 10;
export const MIN_PLAYERS = 2;

/** Seconds per kind of wait, by pace. */
const PACE = {
  relaxed: { vote: 120, choose: 90, notes: 60, open: 90, move: 30, plan: 60, pick: 30, sitdown: 240, report: 45, roll: 20, fallout: 60, window: 10, story: 60 },
  normal: { vote: 90, choose: 60, notes: 45, open: 60, move: 20, plan: 45, pick: 20, sitdown: 180, report: 30, roll: 15, fallout: 40, window: 8, story: 45 },
  brisk: { vote: 60, choose: 40, notes: 30, open: 45, move: 15, plan: 30, pick: 15, sitdown: 120, report: 20, roll: 10, fallout: 25, window: 6, story: 30 },
};

const DEFAULT_CONFIG = { length: 'full', clock: true, pace: 'normal', rat: 'auto' };

let uidSeq = 0;

function freshState({ code, chapter, seed }) {
  return {
    v: 1,
    code: code ?? 'TABLE',
    chapter: chapter ?? DEFAULT_CHAPTER,
    seed: seed ?? `${Date.now()}-${Math.random()}`,
    rng: null,
    version: 0,
    phase: 'lobby',
    config: { ...DEFAULT_CONFIG },
    players: [],
    bag: { total: 0, target: 0, by: {} },
    caseFile: 0,
    caseLog: [],
    flags: {},
    story: [],
    week: { plan: [], i: -1, n: 0 },
    scene: null,
    beat: null,
    night: null,
    deck: [],
    discard: [],
    uid: 0,
    oaths: [],
    ious: [],
    offers: [],
    receipts: [],
    bonds: [],
    usedComplications: [],
    deadline: null,
    botAt: null,
    end: null,
  };
}

export class Game {
  constructor({ code, chapter, seed, state } = {}) {
    this.s = state ?? freshState({ code, chapter, seed });
    this.chapter = getChapter(this.s.chapter);
    this.rng = makeRng(this.s.seed, this.s.rng);
    this.clock = () => Date.now();
  }

  static fromJSON(data) {
    if (!data || data.v !== 1 || !Array.isArray(data.players)) return null;
    try { return new Game({ state: data }); } catch { return null; }
  }

  toJSON() {
    this.s.rng = this.rng.state();
    return this.s;
  }

  // ------------------------------------------------------------ basics ---

  get code() { return this.s.code; }
  get phase() { return this.s.phase; }
  get version() { return this.s.version; }
  get deadline() { return this.s.deadline; }
  set deadline(v) { this.s.deadline = v; }
  get config() { return this.s.config; }

  bump() { this.s.version += 1; }

  get players() { return this.s.players; }
  get playerList() { return this.s.players; }
  get livePlayers() { return this.s.players; }
  get humans() { return this.s.players.filter((p) => !p.bot); }
  hasPlayer(id) { return this.s.players.some((p) => p.id === id); }
  getPlayer(id) { return this.s.players.find((p) => p.id === id) ?? null; }
  p(id) { return this.getPlayer(id); }
  name(id) { return this.getPlayer(id)?.name ?? 'somebody'; }

  get nightIndex() { return this.s.week.i; }

  /** Out of the action: in lockup, or lying low, this night. */
  isAway(p) {
    if (!p) return true;
    if (p.jailUntil != null && p.jailUntil >= this.s.week.n) return true;
    if (p.lowUntil != null && p.lowUntil >= this.s.week.n) return true;
    return false;
  }

  isBenched(p) {
    return !!(p && p.benchBeat && this.s.beat && p.benchBeat === this.s.beat.key);
  }

  /** Everybody who can take part in the beat that is running now. */
  free() {
    return this.s.players.filter((p) => !this.isAway(p) && !this.isBenched(p));
  }

  pace(kind) {
    return (PACE[this.s.config.pace] ?? PACE.normal)[kind] ?? 60;
  }

  /** Set the clock for the current stage, if clocks are on. */
  clockFor(kind, force = false) {
    const now = this.clock();
    this.s.deadline = (this.s.config.clock || force) ? now + this.pace(kind) * 1000 : null;
    this.s.botAt = now + 500 + Math.floor(this.rng() * 900);
  }

  // ------------------------------------------------------------- lobby ---

  addPlayer({ id, name, bot = false, style = null }) {
    if (this.s.phase !== 'lobby') return null;
    if (this.s.players.length >= MAX_PLAYERS) return null;
    const p = {
      id, name: String(name).slice(0, 18), bot, style: bot ? (style ?? styleFor(this.rng)) : null,
      connected: bot, wasHuman: !bot,
      job: null, secret: null, cards: [], cash: 0, stash: 0, heat: 0,
      jailUntil: null, lowUntil: null, arrests: 0, stamps: [], grudges: {},
      deal: null, armed: {}, used: {}, notes: [], benchBeat: null,
      stats: { given: 0, grabbed: 0, lies: 0, doctored: 0, named: [], warned: [], seized: 0, heatTaken: 0 },
    };
    this.s.players.push(p);
    this.bump();
    return p;
  }

  addBot() {
    if (this.s.phase !== 'lobby') return { error: 'Too late to bring anybody in.' };
    if (this.s.players.length >= MAX_PLAYERS) return { error: 'The room only holds ten.' };
    const used = new Set(this.s.players.map((p) => p.name));
    const name = this.rng.shuffle(BOT_NAMES).find((n) => !used.has(n)) ?? `Ghost ${this.s.players.length + 1}`;
    const p = this.addPlayer({ id: `bot-${this.s.seed.slice(-6)}-${++uidSeq}-${this.s.players.length}`, name, bot: true });
    return p ? { ok: true, player: p } : { error: 'No room.' };
  }

  removePlayer(id) {
    const i = this.s.players.findIndex((p) => p.id === id);
    if (i < 0) return;
    if (this.s.phase === 'lobby') this.s.players.splice(i, 1);
    this.bump();
  }

  setConnected(id, on) {
    const p = this.getPlayer(id);
    if (!p) return;
    if (p.connected !== on) { p.connected = on; this.bump(); }
  }

  setConfig(c = {}) {
    if (this.s.phase !== 'lobby') return { error: 'The night has started.' };
    const cfg = this.s.config;
    if (['full', 'short'].includes(c.length)) cfg.length = c.length;
    if (typeof c.clock === 'boolean') cfg.clock = c.clock;
    if (PACE[c.pace]) cfg.pace = c.pace;
    if (['auto', 'on', 'off'].includes(c.rat)) cfg.rat = c.rat;
    this.bump();
    return { ok: true };
  }

  start() {
    if (this.s.phase !== 'lobby') return { error: 'Already started.' };
    if (this.s.players.length < MIN_PLAYERS) return { error: 'It takes two.' };
    this.s.phase = 'playing';
    this.chapter.setup(this.ctx());
    this.s.week.plan = this.chapter.plan(this.ctx());
    this.s.week.i = -1;
    this.nextNight();
    this.bump();
    return { ok: true };
  }

  /** Same people, fresh week. */
  rematch() {
    const next = new Game({ code: this.s.code, chapter: this.s.chapter });
    next.s.config = { ...this.s.config };
    for (const p of this.s.players) next.addPlayer({ id: p.id, name: p.name, bot: p.bot, style: p.style });
    for (const p of next.s.players) p.connected = this.getPlayer(p.id)?.connected ?? p.bot;
    return next;
  }

  // ------------------------------------------------------------- cards ---

  newUid() { this.s.uid += 1; return `c${this.s.uid}`; }

  draw(pid, n = 1) {
    const p = this.p(pid);
    const got = [];
    for (let i = 0; i < n; i++) {
      if (!this.s.deck.length) {
        if (!this.s.discard.length) break;
        this.s.deck = this.rng.shuffle(this.s.discard);
        this.s.discard = [];
      }
      const id = this.s.deck.pop();
      const card = { uid: this.newUid(), id };
      p.cards.push(card);
      got.push(card);
    }
    return got;
  }

  giveCard(pid, id) {
    const p = this.p(pid);
    if (!p || !CARDS[id]) return null;
    const card = { uid: this.newUid(), id };
    p.cards.push(card);
    return card;
  }

  takeCard(pid, uid) {
    const p = this.p(pid);
    const i = p ? p.cards.findIndex((c) => c.uid === uid) : -1;
    if (i < 0) return null;
    return p.cards.splice(i, 1)[0];
  }

  discardCard(card) {
    if (card && CARDS[card.id] && !CARDS[card.id].unique) this.s.discard.push(card.id);
  }

  // -------------------------------------------------------- the world ---

  ctx() { return new Context(this); }

  /** Something the table will remember; it shows up in the paper and at the end. */
  remember(text, extra = {}) {
    this.s.story.push({ night: this.s.week.i, text, ...extra });
  }

  // ---------------------------------------------------------- the week ---

  get nightDef() {
    return this.s.scene ? this.chapter.night(this.s.scene.nightId) : null;
  }

  nextNight() {
    const w = this.s.week;
    w.i += 1;
    if (w.i >= w.plan.length) return this.finish();
    let nightId = w.plan[w.i];
    let slotAct = null;
    if (nightId.startsWith('slot:')) {
      const slot = nightId.slice(5);
      slotAct = this.chapter.slots?.[slot]?.act ?? null;
      nightId = this.chapter.pick(this.ctx(), slot);
      if (!nightId) {
        // nothing fits this slot: drop it, and the morning after it
        w.plan.splice(w.i, 1);
        if (w.plan[w.i] === 'morning' && w.plan[w.i - 1] === 'morning') w.plan.splice(w.i, 1);
        w.i -= 1;
        return this.nextNight();
      }
      w.plan[w.i] = nightId;
      w.acts = { ...(w.acts ?? {}), [w.i]: slotAct };
    }
    slotAct = slotAct ?? w.acts?.[w.i] ?? null;
    let def = this.chapter.night(nightId);
    const redirect = def.redirect?.(this.ctx());
    if (redirect) { nightId = redirect; w.plan[w.i] = nightId; def = this.chapter.night(nightId); }
    // mornings, the Room and the Trial are not nights: nobody's sentence
    // runs out over breakfast
    if (!def.interlude) w.n += 1;
    this.s.night = { id: nightId, facts: [], memo: {}, earned: {}, n: w.n };
    // interludes belong to whichever act they sit in
    const act = slotAct ?? def.act ?? w.act ?? 0;
    if (slotAct ?? def.act) w.act = act;
    const c0 = this.ctx();
    this.s.scene = {
      nightId, cursor: 0, queue: [], done: [], interlude: !!def.interlude,
      title: typeof def.title === 'function' ? def.title(c0) : def.title,
      kicker: typeof def.kicker === 'function' ? def.kicker(c0) : def.kicker ?? null, act,
      day: typeof def.day === 'function' ? def.day(this.ctx()) : def.day ?? null,
      count: this.chapter.nightNumber?.(this.ctx(), nightId) ?? null,
    };
    // lockup and lying low end when their night has passed
    for (const p of this.s.players) {
      if (p.jailUntil != null && p.jailUntil < w.n) { p.jailUntil = null; p.heat = 0; p.used.jail = null; this.remember(`${p.name} is out of county.`); }
      if (p.lowUntil != null && p.lowUntil < w.n) p.lowUntil = null;
    }
    def.open?.(this.ctx());
    return this.nextBeat();
  }

  /** Work out the next concrete beat in the night, resolving branches as they come. */
  resolveNext() {
    const sc = this.s.scene;
    const def = this.nightDef;
    const c = this.ctx();
    for (let guard = 0; guard < 64; guard++) {
      if (sc.queue.length) return sc.queue.shift();
      if (sc.cursor >= def.beats.length) return null;
      const entry = def.beats[sc.cursor];
      sc.cursor += 1;
      const ids = this.expand(entry, c, def);
      sc.queue.push(...ids);
    }
    return null;
  }

  /** One entry of a night's beat list into zero or more concrete beat ids. */
  expand(entry, c, def) {
    if (entry == null) return [];
    if (typeof entry === 'string') return [entry.includes('/') ? entry : `${def.id}/${entry}`];
    if (Array.isArray(entry)) return entry.flatMap((e) => this.expand(e, c, def));
    if (typeof entry === 'function') return this.expand(entry(c), c, def);
    if (entry.oneOf) {
      // a weighted pick; `{ beat: null }` is a way of saying "sometimes, nothing"
      const isOpt = (e) => !!e && typeof e === 'object' && !Array.isArray(e) && ('beat' in e || 'weight' in e);
      const choices = entry.oneOf.filter((e) => !(isOpt(e) && e.when && !e.when(c)));
      if (!choices.length) return [];
      const weights = choices.map((e) => (isOpt(e) && e.weight != null ? e.weight : 1));
      const total = weights.reduce((a, b) => a + b, 0);
      let r = this.rng() * total;
      let i = 0;
      for (; i < choices.length - 1; i++) {
        r -= weights[i];
        if (r <= 0) break;
      }
      const pick = choices[i];
      return this.expand(isOpt(pick) ? pick.beat : pick, c, def);
    }
    if (entry.if) return this.expand(entry.if(c) ? entry.then : entry.else, c, def);
    if (entry.maybe) {
      // a complication: sometimes the night has other plans
      const chance = typeof entry.chance === 'function' ? entry.chance(c) : entry.chance ?? 0.35;
      if (!this.rng.chance(chance)) return [];
      const pool = this.chapter.complications(entry.maybe, c)
        .filter((b) => !this.s.usedComplications.includes(b.id) && (!b.when || b.when(c)));
      if (!pool.length) return [];
      const pick = this.rng.pick(pool);
      this.s.usedComplications.push(pick.id);
      return [pick.id];
    }
    if (entry.beat) return (!entry.when || entry.when(c)) ? this.expand(entry.beat, c, def) : [];
    return [];
  }

  nextBeat() {
    for (const p of this.s.players) if (p.benchBeat && this.s.beat && p.benchBeat === this.s.beat.key) p.benchBeat = null;
    for (let guard = 0; guard < 32; guard++) {
      const id = this.resolveNext();
      if (!id) {
        this.s.scene.done.push('end');
        this.settleCuts();
        this.nightDef.close?.(this.ctx());
        this.chapter.afterNight?.(this.ctx(), this.s.scene.nightId);
        return this.nextNight();
      }
      const def = this.chapter.beat(id);
      if (!def) { console.warn(`[standoff] no beat called ${id}`); continue; }
      if (def.when && !def.when(this.ctx())) continue;
      // with everybody inside or lying low, only the story carries on
      if (!def.always && def.engine !== 'story' && !this.free().length) continue;
      this.beginBeat(id, def);
      if (this.s.beat) return true;
    }
    return false;
  }

  beginBeat(id, def) {
    const engine = ENGINES[def.engine];
    if (!engine) throw new Error(`no engine ${def.engine}`);
    const c = this.ctx();
    this.s.beat = {
      key: `${this.s.week.i}:${id}:${this.s.scene.done.length}`,
      id, engine: def.engine, stage: null, data: {}, inputs: {}, ready: [],
      lines: [], receipt: null, window: null, deadline: null,
      time: typeof def.time === 'function' ? def.time(c) : def.time ?? null,
      place: typeof def.place === 'function' ? def.place(c) : def.place ?? null,
      title: typeof def.title === 'function' ? def.title(c) : def.title ?? '',
      kicker: typeof def.kicker === 'function' ? def.kicker(c) : def.kicker ?? engine.kicker ?? null,
      text: textOf(def.text, c),
    };
    this.s.scene.done.push(id);
    for (const p of this.s.players) if (p.benchNext) { p.benchNext = false; p.benchBeat = this.s.beat.key; }
    def.enter?.(c);
    engine.start(this, this.s.beat, def);
    this.bump();
  }

  get beatDef() {
    return this.s.beat ? this.chapter.beat(this.s.beat.id) : null;
  }

  get engine() {
    return this.s.beat ? ENGINES[this.s.beat.engine] : null;
  }

  /** Move to the fallout of the current beat, and show it until everyone has read it. */
  toFallout(lines = []) {
    const b = this.s.beat;
    b.stage = 'fallout';
    b.lines.push(...lines.filter(Boolean));
    b.ready = [];
    b.window = null;
    this.clockFor('fallout');
    this.bump();
  }

  finishBeat() {
    const b = this.s.beat;
    if (b?.receipt) this.s.receipts.push({ night: this.s.week.i, beat: b.id, title: b.title, ...b.receipt });
    this.s.beat = null;
    this.nextBeat();
    this.bump();
  }

  finish() {
    this.s.scene = null;
    this.s.beat = null;
    this.s.phase = 'over';
    this.s.deadline = null;
    this.s.end = this.chapter.ending(this.ctx());
    this.bump();
    return false;
  }

  // ---------------------------------------------------------- windows ---

  /**
   * A roll everybody watches. The dice land, then anybody holding something
   * that bends dice gets a moment to use it. When nobody wants to, it stands.
   */
  openRoll({ dice = 2, target, label, mods = [], faces = null, preset = null, noMuscle = false, clampFace = false, who = null, then, meta = {} }) {
    const b = this.s.beat;
    const rolled = [];
    for (let i = 0; i < dice; i++) rolled.push(this.dieFace(preset?.[i]));
    this.s.uid += 1;
    b.window = {
      id: this.s.uid, kind: 'roll', dice: rolled, n: dice, target, label, mods: [...mods], faces, noMuscle, clampFace,
      who: who ?? this.free().map((p) => p.id), passed: [], plays: 0, then, meta,
    };
    this.settleIfQuiet();
    this.bump();
  }

  /** One die, unless somebody loaded it. */
  dieFace(preset = null) {
    const loaded = this.s.players.find((p) => p.armed.loaded);
    if (loaded) {
      loaded.armed.loaded = false;
      if (this.s.night) {
        this.s.night.memo.loadedBy = loaded.id;
        this.s.night.facts.push({ about: loaded.id, key: 'loaded', q: `Did ${loaded.name} load a die tonight?`, a: true, night: this.s.week.i });
      }
      return 5;
    }
    return preset ?? this.rng.int(1, 6);
  }

  /** Roll a die nobody sees yet, so somebody can peek at it before it's thrown. */
  preroll() {
    return this.rng.int(1, 6);
  }

  windowTotal(w = this.s.beat?.window) {
    if (!w) return 0;
    const raw = w.dice.reduce((a, b) => a + b, 0);
    return raw + w.mods.reduce((a, m) => a + m.n, 0);
  }

  /** Who could still do something to this roll. */
  windowPending(w = this.s.beat?.window) {
    if (!w) return [];
    return this.s.players.filter((p) => !p.bot && !w.passed.includes(p.id) && this.canTouchRoll(p, w)).map((p) => p.id);
  }

  canTouchRoll(p, w) {
    if (this.isAway(p)) return false;
    const has = p.cards.some((c) => CARDS[c.id]?.window === 'roll');
    const muscle = p.job === 'muscle' && p.used.muscle !== this.s.week.n && w.who.includes(p.id) && !w.noMuscle;
    const piece = p.cards.some((c) => c.id === 'the-piece') && w.who.includes(p.id);
    return has || muscle || piece || this.canMechanic(p, w);
  }

  /** The Mechanic can turn one failed getaway a week into a clean one. */
  canMechanic(p, w = this.s.beat?.window) {
    return !!(w && p.job === 'mechanic' && !p.used.mechanic && w.meta?.getaway && w.who.includes(p.id) && !this.isAway(p));
  }

  /** Bots look at the dice and decide, once each, until nobody changes anything. */
  botWindow() {
    for (let round = 0; round < 10; round++) {
      const w = this.s.beat?.window;
      if (!w) return;
      let changed = false;
      for (const p of this.s.players) {
        if (!p.bot || w.passed.includes(p.id) || !this.canTouchRoll(p, w)) continue;
        const before = w.plays;
        autoCard(this, p, 'roll');
        if (!w.passed.includes(p.id)) w.passed.push(p.id);
        if (w.plays !== before) changed = true;
      }
      if (!changed) return;
    }
  }

  settleIfQuiet() {
    const w = this.s.beat?.window;
    if (!w) return;
    // bots decide at once; people get a moment
    this.botWindow();
    if (w.force || this.windowPending(w).length === 0) return this.closeWindow();
    this.s.deadline = this.clock() + this.pace('window') * 1000;
    this.bump();
  }

  passWindow(pid) {
    const w = this.s.beat?.window;
    if (!w) return { error: 'Nothing to pass on.' };
    if (!w.passed.includes(pid)) w.passed.push(pid);
    if (this.windowPending(w).length === 0) this.closeWindow();
    this.bump();
    return { ok: true };
  }

  /** A card or ability changed the dice; everyone else gets to answer it. */
  windowChanged(byId) {
    const w = this.s.beat?.window;
    if (!w) return;
    w.plays += 1;
    w.passed = [byId];
    if (w.plays > 8) w.force = true;
    this.s.deadline = this.clock() + this.pace('window') * 1000;
  }

  closeWindow() {
    const b = this.s.beat;
    const w = b?.window;
    if (!w) return;
    const total = this.windowTotal(w);
    const face = w.clampFace ? clamp(total, 1, 6) : total;
    const fixed = w.mods.some((m) => m.fix);
    const success = w.target == null ? null : fixed || face >= w.target;
    const result = { dice: w.dice.slice(), mods: w.mods.slice(), total, face, success, target: w.target, label: w.label };
    b.lastRoll = result;
    b.rolls = [...(b.rolls ?? []), result];
    b.window = null;
    this.s.deadline = null;
    // side bets on two-dice rolls settle here
    if (w.n === 2) {
      for (const p of this.s.players) {
        const bet = p.armed.sideBet;
        if (!bet) continue;
        p.armed.sideBet = null;
        const high = total >= 7;
        const right = (bet === 'high') === high;
        if (right) {
          let got = 0;
          for (const q of this.s.players) {
            if (q.id === p.id) continue;
            const pay = Math.min(5000, q.cash);
            q.cash -= pay; got += pay;
          }
          p.cash += got;
          b.lines.push(`${p.name} called it ${bet} and collected ${money(got)} from the table.`);
        } else {
          b.lines.push(`${p.name} called it ${bet}. It wasn't.`);
        }
      }
    }
    const engine = this.engine;
    engine.afterRoll?.(this, b, this.beatDef, result, w.then, w.meta);
    this.bump();
  }

  // ---------------------------------------------------------- actions ---

  act(pid, a = {}, { isHost = false } = {}) {
    if (!a || typeof a !== 'object') return { error: 'Say that again?' };
    const p = this.getPlayer(pid);
    if (!p) return { error: 'You are not at this table.' };
    const t = a.t;
    try {
      switch (t) {
        case 'config': return isHost ? this.setConfig(a) : { error: 'That is the host’s call.' };
        case 'addBot': return isHost ? this.addBot() : { error: 'That is the host’s call.' };
        case 'removeBot': {
          if (!isHost) return { error: 'That is the host’s call.' };
          const q = this.getPlayer(String(a.id));
          if (!q?.bot) return { error: 'That one’s a real person.' };
          this.removePlayer(q.id);
          return { ok: true };
        }
        case 'start': return isHost ? this.start() : { error: 'That is the host’s call.' };
        case 'skip': return isHost ? this.skip() : { error: 'That is the host’s call.' };
        default: break;
      }
      if (this.s.phase !== 'playing') return { error: 'Not now.' };
      const b = this.s.beat;
      let res;
      switch (t) {
        case 'next': res = this.ready(pid); break;
        case 'pass': res = this.passWindow(pid); break;
        case 'card': res = playCard(this, p, a); break;
        case 'respond': res = this.respond(p, a); break;
        case 'muscle': res = this.useMuscle(p); break;
        case 'mechanic': res = this.useMechanic(p); break;
        case 'grudge': res = this.useGrudge(p, a); break;
        case 'wipe': res = this.wipeStamp(p, a); break;
        case 'sell': res = this.sellCard(p, a); break;
        case 'jail': res = this.jailAction(p, a); break;
        case 'wire': res = this.useWire(p); break;
        case 'offer': res = this.makeOffer(p, a); break;
        case 'withdraw': res = this.withdraw(p, a); break;
        default: {
          if (!b || !this.engine?.act) return { error: 'Nothing to do yet.' };
          if (b.window) return { error: 'Wait for the dice.' };
          res = this.engine.act(this, b, this.beatDef, pid, a);
        }
      }
      if (res?.ok) { this.pump(); this.bump(); }
      return res ?? { ok: true };
    } catch (err) {
      console.error(`[standoff] action ${t} threw:`, err);
      return { error: 'Something went wrong in the back room. Nothing was lost.' };
    }
  }

  ready(pid) {
    const b = this.s.beat;
    if (!b || b.stage !== 'fallout') return { error: 'Not yet.' };
    if (!b.ready.includes(pid)) b.ready.push(pid);
    return { ok: true };
  }

  skip() {
    const b = this.s.beat;
    if (this.s.phase !== 'playing' || !b) return { error: 'Nothing to skip.' };
    if (b.window) { this.closeWindow(); this.pump(); this.bump(); return { ok: true }; }
    if (b.stage === 'fallout') { this.finishBeat(); this.pump(); return { ok: true }; }
    this.timeout();
    this.pump();
    this.bump();
    return { ok: true };
  }

  /** Whose move it is right now. People only; bots are handled on the clock. */
  pending() {
    const b = this.s.beat;
    if (this.s.phase !== 'playing' || !b) return [];
    if (b.window) return this.windowPending(b.window);
    if (b.stage === 'fallout') return this.falloutWaiters();
    const list = this.engine.pending(this, b, this.beatDef) ?? [];
    return list.filter((id) => this.hasPlayer(id));
  }

  falloutWaiters() {
    const b = this.s.beat;
    return this.s.players.filter((p) => !p.bot && p.connected !== false && !b.ready.includes(p.id)).map((p) => p.id);
  }

  /** Every inbound action or tick ends here: move on as far as the state allows. */
  pump() {
    this.answerBots();
    for (let guard = 0; guard < 200; guard++) {
      if (this.s.phase !== 'playing') return;
      const b = this.s.beat;
      if (!b) return;
      if (b.window) {
        this.botWindow();
        if (!b.window) continue;
        if (b.window.force || this.windowPending(b.window).length === 0) { this.closeWindow(); continue; }
        return;
      }
      if (b.stage === 'fallout') {
        const humansHere = this.s.players.some((p) => !p.bot && p.connected !== false);
        if (humansHere && this.falloutWaiters().length) return;
        if (!humansHere && this.s.config.clock && this.s.deadline && this.clock() < this.s.deadline) return;
        this.finishBeat();
        continue;
      }
      const waiting = (this.engine.pending(this, b, this.beatDef) ?? []).filter((id) => this.hasPlayer(id));
      if (waiting.length) return;
      const before = `${b.stage}|${this.s.version}`;
      this.engine.step(this, b, this.beatDef);
      if (this.s.beat === b && `${b.stage}|${this.s.version}` === before && !b.window) return;
    }
  }

  /** The clock ran out on a stage: fill in whatever people did not decide. */
  timeout() {
    const b = this.s.beat;
    if (!b) return;
    if (b.window) return this.closeWindow();
    if (b.stage === 'fallout') return this.finishBeat();
    this.engine.timeout?.(this, b, this.beatDef);
  }

  /** Called on a timer. Returns true if anything moved. */
  tick(now = this.clock()) {
    if (this.s.phase !== 'playing') return false;
    const before = this.s.version;
    const b = this.s.beat;
    if (!b) return false;
    if (this.s.deadline && now >= this.s.deadline) {
      this.s.deadline = null;
      this.timeout();
      this.pump();
    } else if (this.s.botAt == null || now >= this.s.botAt) {
      this.runBots();
      this.pump();
    }
    if (this.s.version !== before) return true;
    return false;
  }

  /** Let every bot that has something to do, do it. */
  runBots() {
    const b = this.s.beat;
    if (!b || b.window || b.stage === 'fallout') return;
    const engine = this.engine;
    const def = this.beatDef;
    const waiting = new Set(engine.pending(this, b, def, { bots: true }) ?? []);
    for (const p of this.s.players) {
      if (!p.bot || !waiting.has(p.id)) continue;
      if (this.s.beat !== b) break;
      const a = engine.bot?.(this, b, def, p);
      if (a) {
        const res = engine.act(this, b, def, p.id, a);
        if (res?.error) engine.act(this, b, def, p.id, engine.fallback?.(this, b, def, p) ?? {});
      }
    }
    this.s.botAt = this.clock() + 400 + Math.floor(this.rng() * 700);
    this.bump();
  }

  /** Run the whole table forward as far as bots can take it; for tests and solo play. */
  settle(maxSteps = 5000) {
    for (let i = 0; i < maxSteps && this.s.phase === 'playing'; i++) {
      const v = this.s.version;
      this.runBots();
      this.pump();
      if (this.s.version === v) break;
    }
  }

  // ---------------------------------------------------- side actions ---

  useMuscle(p) {
    const w = this.s.beat?.window;
    if (!w) return { error: 'Only when the dice are down.' };
    if (p.job !== 'muscle') return { error: 'That is not your job.' };
    if (p.used.muscle === this.s.week.n) return { error: 'Once a night.' };
    if (!w.who.includes(p.id) || w.noMuscle) return { error: 'Not this roll.' };
    p.used.muscle = this.s.week.n;
    w.mods.push({ by: p.id, label: `${p.name} leans on it`, n: 2 });
    this.windowChanged(p.id);
    return { ok: true };
  }

  useMechanic(p) {
    const w = this.s.beat?.window;
    if (!w) return { error: 'Only when the dice are down.' };
    if (p.job !== 'mechanic') return { error: 'That is not your job.' };
    if (p.used.mechanic) return { error: 'Once a week.' };
    if (!this.canMechanic(p, w)) return { error: 'Not this roll.' };
    p.used.mechanic = true;
    w.mods.push({ by: p.id, label: `${p.name} knows this car`, n: 0, fix: true });
    this.windowChanged(p.id);
    this.noteAll(`${p.name} reached under the dashboard and did something. Whatever the dice say, the car gets away clean.`);
    return { ok: true };
  }

  useGrudge(p, a) {
    const target = this.getPlayer(String(a.target));
    if (!target || !(p.grudges[target.id] > 0)) return { error: 'You have nothing against them. Yet.' };
    if (a.use === 'heat') {
      if (p.heat <= 0) return { error: 'You have no heat to hand over.' };
      p.grudges[target.id] -= 1;
      p.heat -= 1;
      const c = this.ctx();
      c.heat(target.id, 1, `${p.name} settled a grudge`);
      this.noteAll(`${p.name} settled a grudge: ${target.name} took one of their heat.`);
      this.bond(p.id, target.id, 'grudge');
      return { ok: true };
    }
    return { error: 'Spend it on heat, or on a vote against them.' };
  }

  wipeStamp(p, a) {
    const word = String(a.word ?? '');
    if (!p.stamps.includes(word)) return { error: 'Nothing to wipe.' };
    if (p.job === 'altarboy' && !p.used.altar) {
      p.used.altar = true;
      p.stamps = p.stamps.filter((w) => w !== word);
      this.noteAll(`Father Dominic had a word with everybody after Mass. Nobody is to call ${p.name} a ${word.toLowerCase()} again.`);
      return { ok: true };
    }
    if (p.cash < 10000) return { error: 'Nonna wants $10k for that.' };
    p.cash -= 10000;
    p.stamps = p.stamps.filter((w) => w !== word);
    this.noteAll(`${p.name} paid Nonna $10k. Nobody is to say ${word} again.`);
    return { ok: true };
  }

  sellCard(p, a) {
    const card = p.cards.find((c) => c.uid === a.uid);
    if (!card) return { error: 'No such card.' };
    this.takeCard(p.id, card.uid);
    this.discardCard(card);
    p.cash += 10000;
    return { ok: true };
  }

  useWire(p) {
    if (p.secret?.id !== 'rat') return { error: 'You are not wearing one.' };
    const act = this.s.scene?.act ?? 0;
    if (!act) return { error: 'Not here.' };
    if (p.used.wire === act) return { error: 'Once an act. Prout said so.' };
    p.used.wire = act;
    p.stats.wire = (p.stats.wire ?? 0) + 1;
    this.s.caseFile += 1;
    this.s.caseLog.push({ night: this.s.week.i, delta: 1, why: 'something on a wire', hidden: true });
    return { ok: true };
  }

  jailAction(p, a) {
    if (!(p.jailUntil != null && p.jailUntil >= this.s.week.n)) return { error: 'You are not inside.' };
    p.used.jail = p.used.jail ?? {};
    if (a.what === 'call') {
      if (p.used.jail.call) return { error: 'One phone call. That was it.' };
      const to = this.getPlayer(String(a.to));
      const text = String(a.text ?? '').slice(0, 160).trim();
      if (!to || to.id === p.id || !text) return { error: 'Who, and what?' };
      p.used.jail.call = true;
      to.notes.push({ from: p.name, text, night: this.s.week.i, kind: 'call' });
      return { ok: true };
    }
    if (a.what === 'deal') {
      if (p.deal) return { error: 'You already have one.' };
      this.chapter.takeDeal?.(this.ctx(), p.id, 'lockup');
      p.used.jail.deal = true;
      return { ok: true };
    }
    if (a.what === 'sal') {
      if (p.used.jail.sal) return { error: 'Sal has said what he is going to say.' };
      p.used.jail.sal = true;
      const said = this.chapter.lockupTalk?.(this.ctx(), p.id) ?? 'Sal talks about tomatoes for forty minutes.';
      p.notes.push({ from: 'Sal', text: said, night: this.s.week.i, kind: 'sal' });
      return { ok: true };
    }
    return { error: 'Not in here.' };
  }

  /**
   * Offer something to another player. Anything agreed this way, the game
   * enforces; that is the whole difference between this and saying it.
   */
  makeOffer(p, a) {
    const to = this.getPlayer(String(a.to ?? ''));
    if (!to || to.id === p.id) return { error: 'Offer it to somebody.' };
    if (this.s.offers.filter((o) => o.from === p.id).length >= 6) return { error: 'Let them answer the ones you’ve made.' };
    const id = `o${++this.s.uid}`;
    if (a.kind === 'iou') {
      const pct = Math.round(Number(a.pct));
      if (![5, 10, 15, 20, 25, 30].includes(pct)) return { error: 'Five to thirty percent, in fives.' };
      const owed = this.s.ious.filter((o) => o.from === p.id).reduce((n, o) => n + o.pct, 0);
      if (owed + pct > 60) return { error: 'You’ve promised enough of Monday already.' };
      this.s.offers.push({ id, kind: 'iou', from: p.id, to: to.id, pct, forWhat: String(a.forWhat ?? '').slice(0, 60) || null });
    } else if (a.kind === 'oath') {
      if (this.s.oaths.some((o) => !o.brokenBy && ((o.a === p.id && o.b === to.id) || (o.b === p.id && o.a === to.id)))) return { error: 'You’ve already sworn.' };
      this.s.offers.push({ id, kind: 'oath', from: p.id, to: to.id });
    } else if (a.kind === 'trade') {
      const card = p.cards.find((c) => c.uid === a.uid);
      if (!card) return { error: 'Offer a card you have.' };
      if (!to.cards.length) return { error: 'They have nothing to give back.' };
      this.takeCard(p.id, card.uid);
      this.s.offers.push({ id, kind: 'trade', from: p.id, to: to.id, held: card });
    } else {
      return { error: 'Offer an IOU, an oath or a trade.' };
    }
    this.answerBots();
    return { ok: true };
  }

  withdraw(p, a) {
    const offer = this.s.offers.find((o) => o.id === a.id && o.from === p.id);
    if (!offer) return { error: 'Nothing to take back.' };
    this.s.offers = this.s.offers.filter((o) => o !== offer);
    if (offer.held) p.cards.push(offer.held);
    return { ok: true };
  }

  /** Bots answer whatever is put in front of them straight away. */
  answerBots() {
    for (const offer of this.s.offers.slice()) {
      const to = this.getPlayer(offer.to);
      if (!to?.bot) continue;
      this.respond(to, botAnswer(this, offer, to));
    }
  }

  /** Answer a pending offer or demand (Dirt, Cannoli, oaths, IOUs, trades). */
  respond(p, a) {
    const offer = this.s.offers.find((o) => o.id === a.id && o.to === p.id);
    if (!offer) return { error: 'That offer is gone.' };
    this.s.offers = this.s.offers.filter((o) => o !== offer);
    const handler = OFFER_HANDLERS[offer.kind];
    return handler ? handler(this, offer, p, a) : { error: 'Hm.' };
  }

  /** A line of news every seat sees. */
  noteAll(text) {
    const b = this.s.beat;
    if (b) b.lines.push(text);
    else this.remember(text);
  }

  /** Anybody who bought a quarter of somebody else's night collects it now. */
  settleCuts() {
    for (const p of this.s.players) {
      const cut = p.armed.cutMeIn;
      if (!cut || cut.night !== this.s.week.n) continue;
      p.armed.cutMeIn = null;
      const t = this.getPlayer(cut.target);
      const earned = this.s.night?.earned?.[cut.target] ?? 0;
      const n = Math.min(t?.cash ?? 0, round5k(earned / 4));
      if (!t || n <= 0) { this.remember(`${p.name}'s quarter of ${t?.name ?? 'somebody'}'s night came to nothing.`); continue; }
      t.cash -= n;
      p.cash += n;
      this.remember(`${p.name} collected a quarter of ${t.name}'s night: ${money(n)}.`);
    }
  }

  /** Something that happened between two people, for the web at the end. */
  bond(from, to, kind, extra = {}) {
    this.s.bonds.push({ from, to, kind, night: this.s.week.i, ...extra });
  }

  // ------------------------------------------------------------- views ---

  bands() {
    const ps = this.s.players;
    if (ps.length <= 2) return null;
    const sorted = ps.map((p) => p.cash).sort((a, b) => a - b);
    const lo = sorted[Math.floor(sorted.length / 3)];
    const hi = sorted[Math.floor((sorted.length * 2) / 3)];
    const out = {};
    for (const p of ps) {
      out[p.id] = p.cash <= 0 ? 'broke'
        : p.cash < lo ? 'broke' : p.cash >= hi && p.cash > 0 && hi > lo ? 'flush' : 'getting by';
    }
    return out;
  }

  view(pid = null) {
    const s = this.s;
    const me = pid ? this.getPlayer(pid) : null;
    const bands = this.bands();
    const open = s.players.length <= 2 || s.phase === 'over';
    const c = this.ctx();
    const b = s.beat;
    const def = this.beatDef;
    const out = {
      phase: s.phase,
      code: s.code,
      chapter: { id: this.chapter.id, title: this.chapter.title, number: this.chapter.number },
      config: s.config,
      serverNow: this.clock(),
      deadline: s.deadline,
      minPlayers: MIN_PLAYERS,
      maxPlayers: MAX_PLAYERS,
      bag: { total: s.bag.total, target: s.bag.target, milestone: this.chapter.milestone?.(c) ?? null },
      caseFile: s.caseFile,
      players: s.players.map((p) => ({
        id: p.id, name: p.name, bot: p.bot, connected: p.connected, isYou: p.id === pid,
        job: p.job ? this.chapter.jobs[p.job]?.name ?? p.job : null, jobId: p.job,
        cash: (open || p.id === pid) ? p.cash : null,
        band: open ? null : bands?.[p.id] ?? null,
        heat: p.heat, jailed: p.jailUntil != null && p.jailUntil >= s.week.n,
        low: p.lowUntil != null && p.lowUntil >= s.week.n,
        stamps: p.stamps, cards: p.cards.length,
        grudgesAgainst: s.players.reduce((n, q) => n + (q.grudges[p.id] ?? 0), 0),
        dealt: s.phase === 'over' ? !!p.deal : undefined,
        pending: false,
      })),
      scene: s.scene ? {
        title: s.scene.title, act: s.scene.act, day: s.scene.day, count: s.scene.count,
        kicker: s.scene.kicker, nightId: s.scene.nightId,
      } : null,
      oaths: s.oaths.filter((o) => !o.brokenBy).map((o) => [o.a, o.b]),
      ious: s.ious.map((o) => ({ from: o.from, to: o.to, pct: o.pct })),
      story: s.story.slice(-40),
      end: s.phase === 'over' ? s.end : null,
    };
    const waiting = new Set(this.pending());
    for (const row of out.players) row.pending = waiting.has(row.id);

    if (me) {
      out.you = {
        id: me.id, name: me.name, cash: me.cash, stash: me.stash, heat: me.heat,
        job: me.job ? { id: me.job, ...this.chapter.jobs[me.job] } : null,
        secret: me.secret ? this.chapter.secretView(c, me) : null,
        cards: me.cards.map((card) => cardView(this, me, card)),
        handLimit: handLimit(me),
        grudges: Object.entries(me.grudges).filter(([, n]) => n > 0).map(([id, n]) => ({ id, name: this.name(id), n })),
        stamps: me.stamps,
        deal: !!me.deal,
        jailed: me.jailUntil != null && me.jailUntil >= s.week.n,
        low: me.lowUntil != null && me.lowUntil >= s.week.n,
        jailUsed: me.used.jail ?? {},
        notes: me.notes.slice(-12),
        offers: s.offers.filter((o) => o.to === me.id).map((o) => OFFER_VIEW(this, o)),
        sent: s.offers.filter((o) => o.from === me.id).map((o) => OFFER_VIEW(this, o)),
        rat: me.secret?.id === 'rat' ? { wireUsed: me.used.wire === (this.s.scene?.act ?? 0), canWire: !!this.s.scene?.act && me.used.wire !== this.s.scene.act } : null,
        pending: waiting.has(me.id),
        muscle: me.job === 'muscle' && me.used.muscle !== s.week.n,
        mechanic: me.job === 'mechanic' && !me.used.mechanic,
        fixer: me.job === 'fixer' && !me.used.fixer,
        cousin: me.job === 'cousin' && !me.used.cousin,
        freeWipe: me.job === 'altarboy' && !me.used.altar,
      };
    }

    if (b && def) {
      const engineView = this.engine.view?.(this, b, def, pid) ?? {};
      out.beat = {
        key: b.key, id: b.id, engine: b.engine, stage: b.stage,
        time: b.time, place: b.place, title: b.title, kicker: b.kicker, text: b.text,
        lines: b.lines, receipt: b.stage === 'fallout' ? b.receipt : null,
        headline: b.headline ?? null, dossier: !!def.dossier, interlude: !!s.scene?.interlude,
        lastRoll: b.lastRoll ?? null,
        window: b.window ? this.windowView(b.window, pid) : null,
        ready: b.ready,
        waitingOn: [...waiting].map((id) => this.name(id)),
        ...engineView,
      };
    }
    return out;
  }

  windowView(w, pid) {
    const me = pid ? this.getPlayer(pid) : null;
    return {
      id: w.id, kind: w.kind, dice: w.dice, n: w.n, target: w.target, label: w.label, mods: w.mods.map((m) => ({ label: m.label, n: m.n, fix: !!m.fix })),
      total: this.windowTotal(w), faces: w.faces,
      odds: w.target != null && w.n === 2 ? oddsText(2, w.target) : null,
      canAct: me ? (!w.passed.includes(me.id) && this.canTouchRoll(me, w)) : false,
      canMuscle: me ? (me.job === 'muscle' && me.used.muscle !== this.s.week.n && w.who.includes(me.id) && !w.noMuscle && !this.isAway(me)) : false,
      canMechanic: me ? this.canMechanic(me, w) : false,
      getaway: !!w.meta?.getaway,
    };
  }

  /** People who have yet to act, for pass-and-play: whose turn is it on the device? */
  awaiting() {
    const b = this.s.beat;
    if (!b) return [];
    const list = this.pending();
    const priv = b.window ? false : b.stage === 'fallout' ? false : !!this.engine.private?.(this, b, this.beatDef);
    return list.map((id) => ({ id, private: priv }));
  }
}

/** Resolve a def's text, which may be a string, an array of paragraphs, or a function. */
export function textOf(t, c) {
  const v = typeof t === 'function' ? t(c) : t;
  if (v == null) return [];
  return Array.isArray(v) ? v.filter(Boolean) : [v];
}

// ------------------------------------------------------------ offers ------

/** How a bot answers an offer, a demand, or a card. */
function botAnswer(g, o, p) {
  const fromBot = g.getPlayer(o.from);
  const likes = (p.grudges?.[o.from] ?? 0) === 0 && !fromBot?.stamps.includes('LIAR');
  if (o.kind === 'iou') return { id: o.id, accept: true };
  if (o.kind === 'oath') return { id: o.id, accept: likes && g.rng() < 0.7 };
  if (o.kind === 'dirt') return { id: o.id, choice: p.secret?.id === 'rat' || g.rng() < 0.55 ? 'sign' : 'refuse' };
  if (o.kind === 'cannoli' || o.kind === 'trade') {
    const worst = p.cards.slice().sort((a, b) => (CARDS[a.id]?.value ?? 1) - (CARDS[b.id]?.value ?? 1))[0];
    return { id: o.id, accept: o.kind === 'cannoli' || g.rng() < 0.5, uid: worst?.uid };
  }
  return { id: o.id, accept: false };
}

function OFFER_VIEW(g, o) {
  const base = { id: o.id, kind: o.kind, from: o.from, fromName: g.name(o.from), to: o.to, toName: g.name(o.to) };
  if (o.kind === 'iou') return { ...base, text: `${g.name(o.from)} offers you ${o.pct}% of their Monday money${o.forWhat ? ` for ${o.forWhat}` : ''}.`, pct: o.pct };
  if (o.kind === 'oath') return { ...base, text: `${g.name(o.from)} wants to swear a Blood Oath with you.` };
  if (o.kind === 'dirt') return { ...base, text: `${g.name(o.from)} has dirt on you. Sign over 20% of your Monday money, or they read your secret to the table.`, choices: ['sign', 'refuse'] };
  if (o.kind === 'cannoli') return { ...base, text: `${g.name(o.from)} gave you a card. Give one back — your choice which.`, needsCard: true };
  if (o.kind === 'trade') return { ...base, text: `${g.name(o.from)} will give you a card for one of yours.`, needsCard: true };
  return { ...base, text: 'An offer.' };
}

const OFFER_HANDLERS = {
  iou(g, o, p, a) {
    if (!a.accept) { g.noteAll(`${p.name} turned down ${g.name(o.from)}'s IOU.`); return { ok: true }; }
    g.s.ious.push({ from: o.from, to: o.to, pct: o.pct, why: o.forWhat ?? null });
    g.noteAll(`${g.name(o.from)} now owes ${p.name} ${o.pct}% of their Monday money.`);
    g.bond(o.from, o.to, 'iou', { pct: o.pct });
    return { ok: true };
  },
  oath(g, o, p, a) {
    if (!a.accept) { g.noteAll(`${p.name} would not swear with ${g.name(o.from)}. Noted.`); return { ok: true }; }
    g.s.oaths.push({ a: o.from, b: o.to, brokenBy: null, night: g.s.week.i });
    g.noteAll(`${g.name(o.from)} and ${p.name} swore a Blood Oath. Whoever breaks it pays half.`);
    g.bond(o.from, o.to, 'oath');
    return { ok: true };
  },
  dirt(g, o, p, a) {
    const from = g.getPlayer(o.from);
    const c = g.ctx();
    if (a.choice === 'sign') {
      g.s.ious.push({ from: p.id, to: o.from, pct: 20, why: 'dirt' });
      g.noteAll(`${p.name} signed. ${from.name} gets 20% of whatever ${p.name} has on Monday.`);
    } else {
      const text = g.chapter.secretView(c, p);
      g.noteAll(`${p.name} wouldn't sign, so ${from.name} read it out: ${p.name}'s secret is “${text.name}” — ${text.text}`);
      p.secretOut = true;
    }
    c.grudge(p.id, o.from, 'blackmail');
    c.betray(o.from, p.id, 'blackmail');
    return { ok: true };
  },
  cannoli(g, o, p, a) { return giveBack(g, o, p, a, 'Cannoli'); },
  trade(g, o, p, a) {
    if (!a.accept) {
      const back = g.getPlayer(o.from);
      if (o.held) back.cards.push(o.held);
      g.noteAll(`${p.name} passed on a trade.`);
      return { ok: true };
    }
    return giveBack(g, o, p, a, 'the trade');
  },
};

function giveBack(g, o, p, a, what) {
  const from = g.getPlayer(o.from);
  if (o.held) { p.cards.push(o.held); }
  let back = a.uid ? p.cards.find((c) => c.uid === a.uid && c.uid !== o.held?.uid) : null;
  if (!back) back = p.cards.find((c) => c.uid !== o.held?.uid) ?? null;
  if (back) {
    g.takeCard(p.id, back.uid);
    from.cards.push(back);
  }
  g.noteAll(`${from.name} and ${p.name} swapped cards over ${what}.`);
  return { ok: true };
}

// ------------------------------------------------------------ context -----

/**
 * The object every piece of chapter writing receives. It reads the table and
 * changes it, and it keeps the receipts: every change it makes can explain
 * itself later, in the fallout, the paper, or the epilogue.
 */
export class Context {
  constructor(g) {
    this.g = g;
    this.s = g.s;
    this.rng = g.rng;
  }

  get players() { return this.s.players; }
  get humans() { return this.s.players.filter((p) => !p.bot); }
  get free() { return this.g.free(); }
  get count() { return this.s.players.length; }
  get night() { return this.s.night; }
  get memo() { return this.s.night?.memo ?? {}; }
  get beat() { return this.s.beat; }
  get flags() { return this.s.flags; }
  get bag() { return this.s.bag; }
  get caseFileValue() { return this.s.caseFile; }

  p(id) { return this.g.getPlayer(id); }
  name(id) { return this.g.name(id); }
  names(ids) { return listNames(ids.map((id) => this.name(id))); }
  others(id) { return this.s.players.filter((p) => p.id !== id); }
  byJob(job) { return this.s.players.find((p) => p.job === job) ?? null; }
  freeByJob(job) { return this.free.find((p) => p.job === job) ?? null; }
  isAway(id) { return this.g.isAway(this.p(id)); }

  flag(k) { return this.s.flags[k]; }
  set(k, v = true) { this.s.flags[k] = v; }
  inc(k, n = 1) { this.s.flags[k] = (this.s.flags[k] ?? 0) + n; return this.s.flags[k]; }

  /** Scale a dollar figure to the size of the table, rounded to $5k. */
  scale(base) {
    const n = Math.max(2, this.s.players.length);
    return round5k(base * (0.55 + n * 0.15));
  }

  line(text) { if (text) this.s.beat?.lines.push(text); }
  remember(text, extra) { this.g.remember(text, extra); }
  note(pid, text, from = null) { this.p(pid)?.notes.push({ from, text, night: this.s.week.i }); }

  /** Something a Snitch can ask about tonight. */
  fact(about, key, q, a) {
    this.s.night?.facts.push({ about, key, q, a: !!a, night: this.s.week.i });
  }

  // -- money -----------------------------------------------------------

  give(pid, amount, source = null) {
    const p = this.p(pid);
    if (!p || !amount) return 0;
    const n = Math.round(amount);
    p.cash += n;
    if (n > 0 && this.s.night) this.s.night.earned[pid] = (this.s.night.earned[pid] ?? 0) + n;
    return n;
  }

  /** Take up to `amount` from a player; returns what was actually there. */
  charge(pid, amount) {
    const p = this.p(pid);
    if (!p) return 0;
    const n = Math.max(0, Math.min(p.cash, Math.round(amount)));
    p.cash -= n;
    p.lastLoss = { night: this.s.week.n, amount: n };
    return n;
  }

  bagAdd(amount, pid = null) {
    const n = Math.max(0, Math.round(amount));
    this.s.bag.total += n;
    if (pid) this.s.bag.by[pid] = (this.s.bag.by[pid] ?? 0) + n;
    return n;
  }

  bagTake(amount) {
    const n = Math.max(0, Math.min(this.s.bag.total, Math.round(amount)));
    this.s.bag.total -= n;
    return n;
  }

  // -- the case --------------------------------------------------------

  caseFile(delta, why, hidden = false) {
    if (!delta) return;
    this.s.caseFile = Math.max(0, this.s.caseFile + delta);
    this.s.caseLog.push({ night: this.s.week.i, delta, why, hidden });
    if (!hidden) this.line(delta > 0 ? `Case File +${delta}: ${why}.` : `Case File −${-delta}: ${why}.`);
  }

  // -- heat --------------------------------------------------------------

  heat(pid, n, why = null) {
    let p = this.p(pid);
    if (!p || !n) return;
    if (n < 0) { p.heat = Math.max(0, p.heat + n); return; }
    if (this.g.isAway(p) && p.jailUntil != null) return;
    const alibi = p.cards.find((c) => c.id === 'alibi');
    if (alibi) {
      this.g.takeCard(p.id, alibi.uid);
      this.g.discardCard(alibi);
      this.note(p.id, `Your Alibi covered ${n === 1 ? 'the heat' : `${n} heat`}${why ? ` (${why})` : ''}.`);
      return;
    }
    if (p.armed.fallGuy && this.p(p.armed.fallGuy)) {
      const target = this.p(p.armed.fallGuy);
      p.armed.fallGuy = null;
      this.line(`${p.name} had a Fall Guy ready. ${target.name} takes it instead.`);
      this.grudge(target.id, p.id, 'fall guy');
      this.betray(p.id, target.id, 'fall guy');
      p = target;
    }
    p.heat += n;
    p.stats.heatTaken += n;
    p.lastHeat = { night: this.s.week.n, n };
    if (p.heat >= 3) this.arrest(p.id, why);
  }

  arrest(pid, why = null) {
    const p = this.p(pid);
    if (!p || (p.jailUntil != null && p.jailUntil >= this.s.week.n)) return;
    const lawyer = p.cards.find((c) => c.id === 'good-lawyer');
    if (lawyer) {
      this.g.takeCard(p.id, lawyer.uid);
      this.g.discardCard(lawyer);
      p.heat = 2;
      this.line(`${p.name} should have been picked up. A Good Lawyer made a phone call first.`);
      return;
    }
    const seized = round5k(p.cash / 2);
    p.cash -= seized;
    p.stats.seized += seized;
    p.arrests += 1;
    p.jailUntil = this.s.week.n + 1;
    p.heat = 3;
    this.line(`${p.name} is picked up${why ? ` — ${why}` : ''}. ${money(seized)} is seized as evidence.`);
    // anyone holding a Kiss of Death on them collects
    const kissers = this.s.players.filter((q) => q.armed.kiss?.includes(p.id));
    if (kissers.length && seized > 0) {
      const each = round5k(seized / 2 / kissers.length);
      for (const q of kissers) {
        q.armed.kiss = q.armed.kiss.filter((id) => id !== p.id);
        q.cash += each;
        this.line(`${q.name} had marked ${p.name}. ${money(each)} of it ends up with ${q.name}.`);
      }
    }
    const pages = p.cards.filter((c) => c.id === 'ledger-page');
    for (const page of pages) this.g.takeCard(p.id, page.uid);
    if (pages.length) this.caseFile(pages.length, `${p.name} was holding ${pages.length === 1 ? 'a page' : `${pages.length} pages`} of the ledger`);
    const piece = p.cards.find((c) => c.id === 'the-piece');
    if (piece) { this.g.takeCard(p.id, piece.uid); this.caseFile(1, `Sal's revolver was in ${p.name}'s coat`); }
    this.caseFile(1, `${p.name} is in county`);
    this.g.chapter.onArrest?.(this, p.id);
    this.remember(`${p.name} was arrested.`, { who: p.id, kind: 'arrest' });
  }

  // -- people ------------------------------------------------------------

  grudge(from, to, why) {
    const p = this.p(from);
    if (!p || from === to || !this.p(to)) return;
    p.grudges[to] = (p.grudges[to] ?? 0) + 1;
    this.g.bond(to, from, 'wronged', { why });
    this.note(from, `You hold a grudge against ${this.name(to)} (${why}). Spend it to hand them your heat, or to double a vote against them.`);
  }

  stamp(pid, word) {
    const p = this.p(pid);
    if (p && !p.stamps.includes(word)) p.stamps.push(word);
  }

  /** One person did another wrong. If they had sworn an oath, it costs. */
  betray(from, to, why) {
    const oath = this.s.oaths.find((o) => !o.brokenBy && ((o.a === from && o.b === to) || (o.a === to && o.b === from)));
    if (!oath) return;
    oath.brokenBy = from;
    const p = this.p(from);
    const half = round5k(p.cash / 2);
    p.cash -= half;
    this.p(to).cash += half;
    this.line(`${p.name} broke the Blood Oath with ${this.name(to)}. Half of everything — ${money(half)} — goes to ${this.name(to)}.`);
    this.g.bond(from, to, 'oath-broken');
  }

  card(pid, id) { return this.g.giveCard(pid, id); }
  hasCard(pid, id) { return !!this.p(pid)?.cards.some((c) => c.id === id); }

  /** Things said about this table, kept for the paper and the ending. */
  story(text, extra) { this.g.remember(text, extra); }

  money(n) { return money(n); }
  list(names) { return listNames(names); }
  odds(dice, target) { return oddsText(dice, target); }
  chance(dice, target) { return chance(dice, target); }
}
