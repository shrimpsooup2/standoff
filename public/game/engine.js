import { makeRng, roomCode } from './rng.js';
import { makeDeck, makeJob, narrate } from './scenarios.js';
import { stakesForRound, groupParams } from './payoffs.js';
import { resolve as resolveOptions, previewOption, isCooperative, isBetrayal, traitsOf, ARCHETYPE_NOTES } from './options.js';
import { pickTwist, TWIST_BY_ID } from './twists.js';
import { dealRoles, ROLE_BY_ID } from './roles.js';
import { fill } from './lexicon.js';
import { botWhisper, botChoice, botAccusation, botCard, botVote } from './bots.js';
import { CARD_BY_ID, dealHand, handSize, drawCard } from './cards.js';
import { pickEvent, EVENT_BY_ID } from './events.js';
import { tableProfile, actForRound, ACTS, assignCrews, CREWS, heatBand, heatDelta, actionChance, DESK_TWISTS } from './director.js';
import { pickVariation, beatsFor, TUTORIAL_WRINKLES } from './tutorial.js';

export const PHASES = ['lobby', 'act', 'deal', 'talk', 'squeeze', 'reckoning', 'event', 'vote', 'accusation', 'ledger'];

const PACE = { relaxed: 1.6, normal: 1, brisk: 0.65 };
const BASE_SECONDS = { act: 11, deal: 16, talk: 50, squeeze: 40, reckoning: 34, event: 22, vote: 32, accusation: 45 };
const MAX_WHISPER = 180;

function bondKey(a, b) { return [a, b].sort().join('|'); }

function emptyStats() {
  return {
    stands: 0, folds: 0, betrayals: 0, betrayed: 0,
    mutualStands: 0, mutualFolds: 0,
    pledges: 0, pledgesKept: 0, pledgesBroken: 0,
    markersEarned: 0, markersSpent: 0, silentRounds: 0,
    cardsPlayed: 0, secretFolds: 0, middles: 0,
  };
}

export class Game {
  constructor({ code, seed, config } = {}) {
    this.seed = seed ?? String(Date.now()) + Math.random();
    this.rng = makeRng(this.seed);
    this.code = code ?? roomCode(this.rng);
    this.phase = 'lobby';
    this.round = 0;
    this.players = new Map();
    this.order = [];
    this.groups = [];
    this.bonds = new Map();
    this.history = [];
    this.deadline = null;
    this.twist = null;
    this.deck = makeDeck(this.rng);
    this.accusations = {};
    this.ratId = null;
    this.awards = [];
    this.heat = 0;
    this.act = null;
    this.crews = null;
    this.event = null;
    this.vote = null;
    this.usedEvents = new Set();
    this.profile = tableProfile(0);
    this.version = 0;
    const roundsGiven = config && config.rounds != null;
    this.config = { rounds: 6, pace: 'normal', timers: true, cards: true, ...config };
    this.roundsAuto = !roundsGiven;
  }

  // ---------------------------------------------------------------- lobby ---

  addPlayer({ id, name, bot = false, strategy = null }) {
    const clean = String(name ?? '').trim().slice(0, 18) || 'Nobody';
    const taken = new Set([...this.players.values()].map((p) => p.name.toLowerCase()));
    let final = clean;
    let n = 2;
    while (taken.has(final.toLowerCase())) final = `${clean} ${n++}`;

    const player = {
      id, name: final, bot, strategy,
      connected: true,
      score: 0,
      roundEarnings: [],
      role: null,
      roleRevealed: false,
      crew: null,
      markers: 0,
      markerTarget: null,
      powerUsed: false,
      powerResult: null,
      hand: [],
      playedThisRound: null,
      debts: [],
      stats: emptyStats(),
      joinedAt: Date.now(),
    };
    this.players.set(id, player);
    this.order.push(id);
    this.refreshProfile();
    this.bump();
    return player;
  }

  removePlayer(id) {
    this.players.delete(id);
    this.order = this.order.filter((x) => x !== id);
    this.refreshProfile();
    this.bump();
  }

  refreshProfile() {
    this.profile = tableProfile(this.players.size);
    if (this.roundsAuto && this.phase === 'lobby') this.config.rounds = this.profile.rounds;
  }

  setConnected(id, connected) {
    const p = this.players.get(id);
    if (!p) return;
    p.connected = connected;
    this.bump();
  }

  setConfig(patch) {
    if (this.phase !== 'lobby') return;
    if (patch.rounds != null) {
      const rounds = Number(patch.rounds);
      if (Number.isFinite(rounds)) {
        this.config.rounds = Math.max(3, Math.min(12, Math.round(rounds)));
        this.roundsAuto = false;
      }
    }
    if (PACE[patch.pace]) this.config.pace = patch.pace;
    if (typeof patch.timers === 'boolean') this.config.timers = patch.timers;
    if (typeof patch.cards === 'boolean') this.config.cards = patch.cards;
    this.bump();
  }

  get livePlayers() { return this.order.map((id) => this.players.get(id)).filter(Boolean); }

  seconds(phase) { return Math.round(BASE_SECONDS[phase] * (PACE[this.config.pace] ?? 1)); }

  setDeadline(phase) {
    if (!this.config.timers) { this.deadline = null; return; }
    // on a loud job you are on a rope, not in a chair
    const rush = this.actionRound && (phase === 'squeeze' || phase === 'talk')
      ? (phase === 'squeeze' ? 0.55 : 0.7)
      : 1;
    this.deadline = Date.now() + Math.round(this.seconds(phase) * rush) * 1000;
  }

  bump() { this.version++; }

  // ----------------------------------------------------------------- start ---

  start() {
    if (this.phase !== 'lobby') return { error: 'Already dealt in.' };
    if (this.players.size < 2) return { error: 'You need at least two people to betray each other.' };

    const ids = this.order.slice();
    this.refreshProfile();
    const roles = dealRoles(this.rng, ids);
    for (const id of ids) {
      const p = this.players.get(id);
      p.role = roles[id];
      if (p.role === 'bruiser') p.markers = 1;
      p.hand = this.config.cards ? dealHand(this.rng, ids.length) : [];
    }
    this.ratId = this.profile.hasRat
      ? ids.find((id) => this.players.get(id).role === 'rat') ?? null
      : null;
    if (this.profile.hasCrews) {
      this.crews = assignCrews(this.rng, ids);
      for (const id of ids) this.players.get(id).crew = this.crews[id];
    }
    this.round = 0;
    this.beginAct(ACTS[0]);
    return { ok: true };
  }

  /**
   * FIRST NIGHT. Three short scripted jobs that teach the whole game by playing
   * it: the choice, the moves in between, then the table and the cards. No rat,
   * no heat, no events — those are what makes the real night long, and a
   * tutorial that runs long is a tutorial nobody finishes.
   */
  startTutorial() {
    if (this.phase !== 'lobby') return { error: 'Already dealt in.' };
    if (this.players.size < 2) return { error: 'You need at least two people to betray each other.' };

    const variation = pickVariation(this.rng, this.lastTutorialId ?? null);
    this.tutorial = {
      id: variation.id,
      name: variation.name,
      coachName: variation.coachName,
      coachRole: variation.coachRole,
      opening: variation.opening,
      closing: variation.closing,
      wrinkle: this.rng.pick(TUTORIAL_WRINKLES),
      beats: beatsFor(variation, this.players.size),
      index: 0,
    };
    this.config = { ...this.config, rounds: this.tutorial.beats.length, cards: true };
    this.roundsAuto = false;
    this.profile = {
      ...tableProfile(this.players.size),
      hasRat: false, hasVotes: false, hasCrews: false,
      tableRoundEvery: 0, eventChance: 0, callbackChance: 0,
    };
    this.ratId = null;
    this.crews = null;
    this.heat = 0;
    for (const p of this.players.values()) {
      p.role = null;
      p.hand = [];
      p.markers = 0;
    }
    this.round = 0;
    this.act = null;
    this.nextRound();
    return { ok: true };
  }

  /** Build one scripted beat instead of dealing from the decks. */
  dealTutorialRound() {
    const beat = this.tutorial.beats[this.round - 1];
    const ids = this.order.slice();
    // cards only turn up for the last beat, once there is something to use them on
    const lastBeat = this.round === this.tutorial.beats.length;
    for (const p of this.players.values()) {
      p.markerTarget = null;
      p.roundNote = null;
      p.playedThisRound = null;
      p.hand = lastBeat ? dealHand(this.rng, ids.length, p.hand) : [];
    }

    this.twist = TWIST_BY_ID.clean;
    this.actionRound = false;
    const groupings = beat.kind === 'table' ? [ids] : this.buildPairings(ids);
    const stakes = 1 + (this.round - 1) * 0.5;

    this.groups = groupings.filter((g) => g.length > 0).map((memberIds, i) => {
      const members = memberIds.map((id) => ({ id, name: this.players.get(id).name }));
      const kind = beat.kind === 'table' ? 'table' : memberIds.length >= 3 ? 'trio' : 'pair';
      const job = makeJob(this.rng, { kind, members, deck: this.deck, scenario: beat.job });
      const group = {
        id: `t${this.round}_${i}`,
        kind,
        memberIds: memberIds.slice(),
        talkMemberIds: memberIds.slice(),
        job, stakes,
        choices: {}, publicChoices: {}, lockOrder: [],
        whispers: {}, pledges: {}, cards: {},
        leak: null, result: null,
      };
      group.stake = groupParams(this.rng, memberIds.length, stakes);
      group.stake.unit = group.stake.contribution;
      return group;
    });

    this.phase = 'deal';
    this.setDeadline('deal');
    this.bump();
  }

  beginAct(act) {
    this.act = act;
    this.phase = 'act';
    this.setDeadline('act');
    this.bump();
  }

  // ------------------------------------------------------------ round deal ---

  buildPairings(ids) {
    const pool = this.rng.shuffle(ids);
    const groups = [];
    const met = (a, b) => this.bonds.get(bondKey(a, b))?.rounds ?? 0;
    const sameCrew = (a, b) =>
      this.crews ? this.crews[a] === this.crews[b] : false;

    // A vote can force one person into a room with their history.
    if (this.forcedPairId && pool.includes(this.forcedPairId)) {
      const a = this.forcedPairId;
      const rest = pool.filter((x) => x !== a);
      const ranked = rest
        .map((b) => ({ b, score: met(a, b) * 10 + (this.bonds.get(bondKey(a, b))?.mutualFold ?? 0) * 5 }))
        .sort((x, y) => y.score - x.score);
      const b = ranked[0]?.b;
      if (b) {
        groups.push([a, b]);
        pool.splice(pool.indexOf(a), 1);
        pool.splice(pool.indexOf(b), 1);
      }
    }
    this.forcedPairId = null;

    while (pool.length > 0) {
      if (pool.length === 3) { groups.push(pool.splice(0, 3)); break; }
      const a = pool.shift();
      if (pool.length === 0) {
        // odd one out joins the smallest existing group
        if (groups.length) groups[groups.length - 1].push(a);
        break;
      }
      let bestIdx = 0;
      let bestScore = Infinity;
      pool.forEach((b, i) => {
        // prefer new faces, and in a two-crew table prefer working across the aisle
        const score = met(a, b) * 10 + (sameCrew(a, b) ? 3 : 0) + this.rng();
        if (score < bestScore) { bestScore = score; bestIdx = i; }
      });
      const b = pool.splice(bestIdx, 1)[0];
      groups.push([a, b]);
    }
    return groups;
  }

  isTableRound(round) {
    const n = this.players.size;
    if (round >= this.config.rounds) return true;
    if (!this.profile.tableRoundEvery) return false;
    if (n < 3) return false;
    return round >= 3 && round % this.profile.tableRoundEvery === 0;
  }

  /** Does this pair have a story worth retelling? */
  callbackFor(memberIds) {
    if (memberIds.length !== 2) return null;
    if (this.round < 2) return null;
    if (!this.rng.chance(this.profile.callbackChance)) return null;
    const [a, b] = memberIds;
    const bond = this.bonds.get(bondKey(a, b));
    if (!bond || bond.rounds === 0) return null;
    const betrayA = bond.betrayals[a] ?? 0;
    const betrayB = bond.betrayals[b] ?? 0;
    const last = bond.lastIncident;

    let kind = null;
    let subjectId = null;
    if (betrayA > 1 || betrayB > 1) {
      kind = 'repeat';
      subjectId = betrayA > betrayB ? a : b;
    } else if (betrayA > 0 && betrayB > 0) {
      kind = 'feud';
      subjectId = a;
    } else if (betrayA > 0 || betrayB > 0) {
      kind = 'grudge';
      subjectId = betrayA > 0 ? a : b;
    } else if (bond.mutualStand >= 2) {
      kind = 'clean';
      subjectId = a;
    }
    if (!kind) return null;
    return {
      kind,
      subjectId,
      lastJob: last?.job ?? 'the last one',
      lastRound: last?.round ?? this.round - 1,
    };
  }

  nextRound() {
    this.round += 1;
    this.event = null;
    this.vote = null;
    if (this.tutorial) { this.dealTutorialRound(); return; }

    const ids = this.order.slice();
    for (const p of this.players.values()) {
      p.markerTarget = null;
      p.roundNote = null;
      p.playedThisRound = null;
      if (this.config.cards) {
        if (this.redealHands) p.hand = dealHand(this.rng, ids.length, []);
        else p.hand = dealHand(this.rng, ids.length, p.hand);
        if (this.dealCards) for (let i = 0; i < this.dealCards; i++) p.hand.push(drawCard(this.rng, p.hand));
      }
    }
    this.redealHands = false;
    this.dealCards = 0;

    const sittingOut = this.sitOutId && this.players.has(this.sitOutId) ? this.sitOutId : null;
    this.sittingOut = sittingOut;
    this.sitOutId = null;
    const working = sittingOut ? ids.filter((x) => x !== sittingOut) : ids;

    const isTable = this.isTableRound(this.round) && working.length >= 3;
    const isFinal = this.round >= this.config.rounds;
    const band = heatBand(this.heat);

    // Is tonight one of the loud ones? Decided for the whole table at once, so
    // the round has a single tone instead of one pair on a rooftop and another
    // in an interview room.
    this.actionRound = !isFinal && this.rng.chance(actionChance(this.round, this.config.rounds));
    // An event can hand us a twist written for an interview room (a wiretap
    // warrant, say). If it has, tonight is a desk night whatever the dice said.
    if (this.forcedTwist && DESK_TWISTS.includes(this.forcedTwist)) this.actionRound = false;

    if (this.forcedTwist && TWIST_BY_ID[this.forcedTwist]) {
      this.twist = TWIST_BY_ID[this.forcedTwist];
      this.forcedTwist = null;
    } else {
      this.twist = pickTwist(this.rng, {
        exclude: [
          ...(isTable ? ['wire', 'switch'] : []),
          ...(this.actionRound ? DESK_TWISTS : []),
        ],
        allowTalkless: this.round > 1,
      });
    }

    const stakes = stakesForRound(this.round, this.config.rounds) * (this.actionRound ? 1.25 : 1);

    const groupings = isTable
      ? [working]
      : working.length < 2 ? [working] : this.buildPairings(working);

    this.groups = groupings.filter((g) => g.length > 0).map((memberIds, i) => {
      const members = memberIds.map((id) => ({ id, name: this.players.get(id).name }));
      const kind = isTable ? 'table' : memberIds.length >= 3 ? 'trio' : 'pair';
      const callback = kind === 'pair' && !this.actionRound ? this.callbackFor(memberIds) : null;
      const job = makeJob(this.rng, {
        kind, members, deck: this.deck, final: isFinal && isTable, callback,
        action: this.actionRound,
      });
      const group = {
        id: `g${this.round}_${i}`,
        kind,
        memberIds: memberIds.slice(),
        talkMemberIds: memberIds.slice(),
        job, stakes,
        choices: {},
        publicChoices: {},
        lockOrder: [],
        whispers: {},
        pledges: {},
        cards: {},
        leak: null,
        result: null,
      };
      // The same shape for two people in two rooms and for ten round a table:
      // a stake each, a pot that grows, and a split that ignores who paid.
      group.stake = groupParams(this.rng, memberIds.length, stakes);
      // the hotter the table, the more a stake is worth keeping
      group.stake.unit = Math.round(group.stake.contribution * band.temptation);
      return group;
    });

    this.phase = 'deal';
    this.setDeadline('deal');
    this.bump();
  }

  groupOf(pid, { talk = false } = {}) {
    return this.groups.find((g) => (talk ? g.talkMemberIds : g.memberIds).includes(pid)) ?? null;
  }

  // ------------------------------------------------------------ table talk ---

  beginTalk() {
    if (this.twist.id === 'notalk') { this.beginSqueeze(); return; }
    this.phase = 'talk';
    this.setDeadline('talk');
    for (const g of this.groups) {
      for (const pid of g.talkMemberIds) {
        const p = this.players.get(pid);
        if (p?.bot) {
          g.whispers[pid] = botWhisper(this.rng, p, this, g);
          g.pledges[pid] = this.rng.chance(p.strategy === 'rat' ? 0.9 : 0.6);
          const card = botCard(this.rng, p, this, g);
          if (card) this.playCard(pid, card.cardId, card.targetId);
        }
      }
    }
    this.bump();
  }

  whisper(pid, text) {
    if (this.phase !== 'talk') return { error: 'Nobody is listening right now.' };
    const g = this.groupOf(pid, { talk: true });
    if (!g) return { error: 'You are not on this job.' };
    g.whispers[pid] = String(text ?? '').slice(0, MAX_WHISPER);
    this.bump();
    return { ok: true };
  }

  pledge(pid, value) {
    if (this.phase !== 'talk') return { error: 'Too late for promises.' };
    const g = this.groupOf(pid, { talk: true });
    if (!g) return { error: 'You are not on this job.' };
    g.pledges[pid] = !!value;
    this.bump();
    return { ok: true };
  }

  // ------------------------------------------------------------------ cards ---

  playCard(pid, cardId, targetId = null) {
    if (!this.config.cards) return { error: 'No cards in this game.' };
    if (this.phase !== 'talk' && this.phase !== 'squeeze') return { error: 'Not now.' };
    const p = this.players.get(pid);
    if (!p) return { error: 'Who?' };
    if (p.playedThisRound) return { error: 'One card a round. You already played.' };
    const idx = p.hand.indexOf(cardId);
    if (idx === -1) return { error: 'That is not in your hand.' };
    const card = CARD_BY_ID[cardId];
    if (!card) return { error: 'No such card.' };
    const g = this.groupOf(pid);
    if (!g) return { error: 'You are not on this job.' };
    if (g.choices[pid]) return { error: 'You already locked in.' };

    let target = null;
    if (card.needsTarget) {
      target = this.players.get(targetId);
      if (!target || target.id === pid) return { error: 'Pick somebody else.' };
    }

    p.hand.splice(idx, 1);
    p.playedThisRound = cardId;
    p.stats.cardsPlayed += 1;
    g.cards[pid] = { cardId, targetId: target?.id ?? null, face: card.face };

    // a couple of cards do their work the moment they hit the table
    if (cardId === 'favour') {
      const partners = g.memberIds.filter((x) => x !== pid);
      const gift = 10;
      p.score -= gift;
      for (const other of partners.slice(0, 1)) {
        const o = this.players.get(other);
        if (o) o.score += gift;
      }
    }
    if (cardId === 'confession' && target) {
      target.roleRevealed = true;
    }

    this.bump();
    return { ok: true };
  }

  /** Cards aimed at you that The Priest would cancel. */
  cardsAgainst(group, pid) {
    return Object.entries(group.cards).filter(([owner, c]) => {
      if (owner === pid) return false;
      if (c.targetId) return c.targetId === pid;
      return ['muscle', 'shakedown', 'split', 'godfather'].includes(c.cardId);
    });
  }

  callMarker(pid) {
    const p = this.players.get(pid);
    if (!p) return { error: 'Who?' };
    if (this.phase !== 'talk' && this.phase !== 'squeeze') return { error: 'Not now.' };
    if (p.markers < 1) return { error: 'You are not holding a marker.' };
    if (p.markerTarget) return { error: 'You already called one in this round.' };
    const g = this.groupOf(pid);
    if (!g) return { error: 'You are not on this job.' };
    p.markers -= 1;
    p.stats.markersSpent += 1;
    p.markerTarget = g.kind === 'pair' ? g.memberIds.find((x) => x !== pid) : '*';
    this.bump();
    return { ok: true };
  }

  usePower(pid, targetId) {
    const p = this.players.get(pid);
    if (!p) return { error: 'Who?' };
    if (p.role !== 'consigliere') return { error: 'Your card does not do that.' };
    if (p.powerUsed) return { error: 'You already opened the cabinet tonight.' };
    const t = this.players.get(targetId);
    if (!t || t.id === pid) return { error: 'Pick somebody else.' };
    p.powerUsed = true;
    const role = ROLE_BY_ID[t.role];
    p.powerResult = { name: t.name, roleId: t.role, roleName: role?.name ?? 'Unmarked' };
    this.bump();
    return { ok: true };
  }

  // ----------------------------------------------------------- the squeeze ---

  beginSqueeze() {
    if (this.twist.id === 'switch' && this.groups.every((g) => g.kind === 'pair')) {
      const ids = this.groups.flatMap((g) => g.memberIds);
      const regrouped = this.buildPairings(ids);
      const carried = this.groups;
      const allWhispers = Object.fromEntries(carried.flatMap((g) => Object.entries(g.whispers)));
      const allPledges = Object.fromEntries(carried.flatMap((g) => Object.entries(g.pledges)));
      const allCards = Object.fromEntries(carried.flatMap((g) => Object.entries(g.cards)));
      this.groups = regrouped.map((memberIds, i) => {
        const members = memberIds.map((id) => ({ id, name: this.players.get(id).name }));
        const kind = memberIds.length >= 3 ? 'trio' : 'pair';
        const old = carried.find((g) => g.memberIds.includes(memberIds[0])) ?? carried[0];
        return {
          id: `g${this.round}_s${i}`,
          kind,
          memberIds: memberIds.slice(),
          talkMemberIds: old.talkMemberIds.slice(),
          job: makeJob(this.rng, { kind, members, deck: this.deck, action: this.actionRound }),
          stakes: old.stakes,
          stake: (() => { const st = groupParams(this.rng, memberIds.length, old.stakes); st.unit = st.contribution; return st; })(),
          choices: {}, publicChoices: {}, lockOrder: [],
          whispers: allWhispers, pledges: allPledges,
          cards: Object.fromEntries(Object.entries(allCards).filter(([pid]) => memberIds.includes(pid))),
          switched: true, leak: null, result: null,
        };
      });
    }

    this.phase = 'squeeze';
    this.setDeadline('squeeze');
    this.bump();

    for (const g of this.groups) {
      for (const pid of g.memberIds) {
        const p = this.players.get(pid);
        if (p?.bot) this.choose(pid, botChoice(this.rng, p, this, g));
      }
    }
  }

  choose(pid, choice) {
    if (this.phase !== 'squeeze') return { error: 'Not yet.' };
    const g = this.groupOf(pid);
    if (!g) return { error: 'You are not on this job.' };
    if (g.choices[pid]) return { error: 'Locked in. No take-backs.' };
    const option = g.job.options.find((o) => o.id === choice);
    if (!option) return { error: 'That is not one of the things you can do here.' };
    g.choices[pid] = option.id;
    g.lockOrder.push(pid);
    if (this.twist.id === 'wire' && g.kind === 'pair' && g.lockOrder.length === 1) {
      g.leak = { from: pid, choice: option.id, label: option.label };
    }
    this.bump();
    if (this.groups.every((grp) => grp.memberIds.every((id) => grp.choices[id]))) this.resolve();
    return { ok: true };
  }

  // ---------------------------------------------------------------- resolve ---

  // --- helpers over the option a player picked ----------------------------

  optionOf(g, pid, { shown = false } = {}) {
    const id = (shown ? g.publicChoices[pid] : g.choices[pid]) ?? g.job.options[0].id;
    return g.job.options.find((o) => o.id === id) ?? g.job.options[0];
  }

  heldLine(g, pid, opts) { return isCooperative(this.optionOf(g, pid, opts)); }
  soldOut(g, pid, opts) { return isBetrayal(this.optionOf(g, pid, opts)); }

  resolve() {
    const twist = this.twist.id;
    const lastPlaceId = this.livePlayers.slice().sort((a, b) => a.score - b.score)[0]?.id;
    const roundLog = { round: this.round, act: this.act?.n ?? 1, twist: this.twist, groups: [], cards: [] };
    const payouts = new Map();

    const rec = (pid) => {
      if (!payouts.has(pid)) payouts.set(pid, { base: 0, lines: [], total: 0 });
      return payouts.get(pid);
    };
    const addLine = (pid, label, amount) => {
      const r = rec(pid);
      r.lines.push({ label, amount });
      r.total += amount;
    };

    // --- silence takes the first move on the card, which is always the loyal one
    for (const g of this.groups) {
      for (const pid of g.memberIds) {
        if (!g.choices[pid]) {
          g.choices[pid] = g.job.options[0].id;
          g.wentQuiet = (g.wentQuiet ?? []).concat(pid);
          this.players.get(pid).stats.silentRounds += 1;
        }
      }
    }

    // --- who was protected from what --------------------------------------
    const shielded = new Set();
    for (const g of this.groups) {
      for (const [pid, c] of Object.entries(g.cards)) {
        if (c.cardId === 'priest') shielded.add(pid);
      }
    }
    const cardLive = (g, pid) => {
      const c = g.cards[pid];
      if (!c) return null;
      if (c.targetId && shielded.has(c.targetId)) return null;
      if (['muscle', 'shakedown', 'split', 'godfather'].includes(c.cardId)) {
        const partners = g.memberIds.filter((x) => x !== pid);
        if (partners.length && partners.every((x) => shielded.has(x))) return null;
      }
      return c;
    };

    // --- the moves people made, turned into money -------------------------
    for (const g of this.groups) {
      const picks = g.memberIds.map((id) => ({ id, option: this.optionOf(g, id) }));
      const res = resolveOptions({
        picks,
        unit: g.stake.unit ?? g.stake.contribution,
        multiplier: g.stake.multiplier,
      });
      g.pot = res.pot;

      const everybodyHeld = picks.every((p) => isCooperative(p.option));
      const nobodyHeld = picks.every((p) => isBetrayal(p.option));

      for (const p of picks) {
        const r = rec(p.id);
        let lines = res.byPlayer[p.id].lines;
        let total = res.byPlayer[p.id].total;

        // Honour Among Thieves rewards a room that all held; The Squeeze
        // turns a room that all sold out into a bill.
        if (twist === 'honour' && everybodyHeld) {
          lines = [...lines, { label: 'The family was watching, and everybody held', amount: total * 2 }];
          total *= 3;
        }
        if (twist === 'squeeze' && nobodyHeld) {
          lines = [...lines, { label: 'Nobody held, and the DA had a quota', amount: -2 * total }];
          total = -total;
        }
        r.base = total;
        r.total += total;
        r.lines.push(...lines);
      }
    }

    // --- cards that reshape a take ----------------------------------------
    for (const g of this.groups) {
      for (const pid of g.memberIds) {
        const c = cardLive(g, pid);
        if (!c) continue;
        const partners = g.memberIds.filter((x) => x !== pid);
        const name = this.players.get(pid).name;
        const iHeld = this.heldLine(g, pid);

        if (c.cardId === 'godfather') {
          const allHeld = partners.every((x) => this.heldLine(g, x));
          if (iHeld && allHeld) {
            addLine(pid, 'The offer was taken up — doubled', rec(pid).total);
            for (const x of partners) addLine(x, `${name} made an offer and you held — doubled`, rec(x).total);
          } else if (!allHeld) {
            const mineTotal = Math.max(0, rec(pid).total);
            if (mineTotal > 0) addLine(pid, 'You made an offer. They did not take it.', -mineTotal);
          }
        }
        if (c.cardId === 'shakedown') {
          if (iHeld && partners.every((x) => this.heldLine(g, x))) {
            for (const x of partners) {
              const cut = Math.round(Math.max(0, rec(x).total) / 3);
              if (cut > 0) {
                addLine(x, `${name} took a cut of your cut`, -cut);
                addLine(pid, `A third of ${this.players.get(x).name}’s take`, cut);
              }
            }
          }
        }
        if (c.cardId === 'insurance') {
          const traitor = partners.find((x) => this.soldOut(g, x));
          if (iHeld && traitor) {
            const theirs = Math.max(0, rec(traitor).total);
            addLine(pid, 'The policy paid out — you take what they made', theirs - rec(pid).total);
          }
        }
        if (c.cardId === 'split' && partners.length === 1) {
          const other = partners[0];
          const pooled = rec(pid).total + rec(other).total;
          const each = Math.round(pooled / 2);
          addLine(pid, 'Split down the middle', each - rec(pid).total);
          addLine(other, `${name} split it with you, whatever you did`, each - rec(other).total);
        }
        if (c.cardId === 'loanshark') {
          addLine(pid, 'Borrowed, at a rate', 25);
          this.players.get(pid).debts.push({ label: 'The loan shark wants his forty', amount: -40 });
        }
      }
    }

    for (const g of this.groups) {
      for (const pid of g.memberIds) {
        const c = cardLive(g, pid);
        if (!c || c.cardId !== 'lawyer') continue;
        const t = rec(pid).total;
        if (t < 0) addLine(pid, 'Counsel got it halved', Math.round(-t / 2));
      }
    }

    if (twist === 'marked' && lastPlaceId && payouts.has(lastPlaceId)) {
      const r = rec(lastPlaceId);
      if (r.total > 0) addLine(lastPlaceId, 'The family takes an interest in the underdog', r.total);
    }
    if (twist === 'double') {
      for (const [pid, r] of payouts) if (r.total !== 0) addLine(pid, 'Double or nothing', r.total);
    }

    // --- role money --------------------------------------------------------
    for (const g of this.groups) {
      for (const pid of g.memberIds) {
        const p = this.players.get(pid);
        const others = g.memberIds.filter((x) => x !== pid);
        const someoneSold = others.some((x) => this.soldOut(g, x));
        if (p.role === 'rat' && this.soldOut(g, pid)) addLine(pid, 'The envelope from the DA', 6);
        if (p.role === 'widow' && this.heldLine(g, pid) && someoneSold) addLine(pid, 'The policy pays out', 12);
        if (p.role === 'ghost') {
          const mine = g.choices[pid];
          const matched = others.length > 0 && others.every((x) => g.choices[x] === mine);
          if (matched) addLine(pid, 'Moved as one — nobody saw you', 5);
        }
        // Somebody who put in more than their share is owed, and the table knows it.
        if (traitsOf(this.optionOf(g, pid)).give > 1.2) {
          p.markers += 1;
          p.stats.markersEarned += 1;
          p.roundNote = 'You carried more than your share. The table owes you one.';
        }
      }
    }

    for (const g of this.groups) {
      for (const pid of g.memberIds) {
        const c = cardLive(g, pid);
        if (!c || c.cardId !== 'counterfeit') continue;
        const othersPlayed = Object.keys(g.cards).some((x) => x !== pid);
        const t = rec(pid).total;
        if (othersPlayed) { if (t !== 0) addLine(pid, 'The paper did not pass — everything voided', -t); }
        else if (t > 0) addLine(pid, 'Good paper, doubled', t);
      }
    }

    let tableTotal = 0;
    for (const [, r] of payouts) tableTotal += Math.max(0, r.total);
    for (const g of this.groups) {
      for (const pid of g.memberIds) {
        const c = cardLive(g, pid);
        if (c && c.cardId === 'skim') {
          const cut = Math.round(tableTotal * 0.1);
          if (cut > 0) addLine(pid, 'Off the top of the whole table', cut);
        }
      }
    }
    for (const p of this.players.values()) {
      if (p.role === 'bookkeeper' && payouts.has(p.id)) {
        const cut = Math.round(tableTotal * 0.1);
        if (cut > 0) addLine(p.id, 'Skimmed off the top of the whole table', cut);
      }
      if (p.role === 'gambler' && payouts.has(p.id)) {
        const t = rec(p.id).total;
        if (t !== 0) {
          if (Math.abs(t) % 2 === 1) addLine(p.id, 'The coin came up odd — doubled', t);
          else addLine(p.id, 'The coin came up even — halved', -Math.round(t / 2));
        }
      }
    }

    if (this.sittingOut && this.players.has(this.sittingOut)) {
      addLine(this.sittingOut, 'Paid to stay away from it', 14);
    }

    // --- seizures, last of all, so a forfeited round is genuinely forfeited --
    for (const g of this.groups) {
      for (const pid of g.memberIds) {
        const c = cardLive(g, pid);
        if (!c || c.cardId !== 'muscle') continue;
        const name = this.players.get(pid).name;
        for (const x of g.memberIds) {
          if (x === pid || !this.soldOut(g, x)) continue;
          const seized = Math.max(0, rec(x).total);
          if (seized <= 0) continue;
          addLine(x, `${name} said what would happen. It happened.`, -seized);
          addLine(pid, `Taken off ${this.players.get(x).name}`, Math.round(seized / 2));
        }
      }
    }
    for (const g of this.groups) {
      for (const pid of g.memberIds) {
        const holder = this.players.get(pid);
        if (!holder.markerTarget) continue;
        const targets = holder.markerTarget === '*'
          ? g.memberIds.filter((x) => x !== pid)
          : [holder.markerTarget];
        for (const tid of targets) {
          if (!g.memberIds.includes(tid)) continue;
          if (!this.soldOut(g, tid)) continue;
          const seized = Math.max(0, rec(tid).total);
          if (seized <= 0) continue;
          const share = holder.role === 'bruiser' ? seized : Math.round(seized / 2);
          addLine(tid, `Marker called in by ${holder.name} — forfeited`, -seized);
          addLine(pid, `Marker collected from ${this.players.get(tid).name}`, share);
          holder.roundNote = `Your marker landed on ${this.players.get(tid).name}.`;
        }
      }
    }

    // --- what the table is shown vs what actually happened ------------------
    for (const g of this.groups) {
      const loyalId = g.job.options[0].id;
      const worstId = g.job.options[g.job.options.length - 1].id;
      for (const pid of g.memberIds) g.publicChoices[pid] = g.choices[pid];
      for (const [pid, c] of Object.entries(g.cards)) {
        if (!cardLive(g, pid)) continue;
        if (c.cardId === 'alibi' && !this.heldLine(g, pid)) {
          g.publicChoices[pid] = loyalId;
          this.players.get(pid).stats.secretFolds += 1;
        }
        if (c.cardId === 'setup' && c.targetId && g.memberIds.includes(c.targetId)) {
          g.publicChoices[c.targetId] = worstId;
        }
      }
    }

    // --- book it -----------------------------------------------------------
    for (const g of this.groups) {
      const members = g.memberIds;
      g.result = { perPlayer: {} };
      for (const pid of members) {
        const p = this.players.get(pid);
        const r = rec(pid);
        p.score += r.total;
        p.roundEarnings.push(r.total);

        const shownHeld = this.heldLine(g, pid, { shown: true });
        const shownSold = this.soldOut(g, pid, { shown: true });
        const others = members.filter((x) => x !== pid);
        const standers = others.filter((x) => this.heldLine(g, x, { shown: true }));
        const folders = others.filter((x) => this.soldOut(g, x, { shown: true }));
        const fixed = cardLive(g, pid)?.cardId === 'fix';

        if (shownHeld) p.stats.stands += 1;
        else if (shownSold) p.stats.folds += 1;
        else p.stats.middles += 1;
        if (shownSold && standers.length > 0 && !fixed) p.stats.betrayals += 1;
        if (shownHeld && folders.length > 0) {
          p.stats.betrayed += 1;
          p.markers += 1;
          p.stats.markersEarned += 1;
        }
        if (g.kind === 'pair') {
          if (shownHeld && standers.length === 1) p.stats.mutualStands += 1;
          if (shownSold && folders.length === 1) p.stats.mutualFolds += 1;
        }

        const pledged = !!g.pledges[pid];
        if (pledged) {
          p.stats.pledges += 1;
          if (shownHeld) p.stats.pledgesKept += 1;
          else p.stats.pledgesBroken += 1;
        }

        g.result.perPlayer[pid] = {
          choice: g.publicChoices[pid],
          option: this.optionOf(g, pid, { shown: true }),
          trueChoice: g.choices[pid],
          trueOption: this.optionOf(g, pid),
          held: shownHeld,
          sold: shownSold,
          total: r.total,
          lines: r.lines,
          pledged,
          brokePledge: pledged && !shownHeld,
          card: g.cards[pid]?.cardId ?? null,
          cardCancelled: !!g.cards[pid] && !cardLive(g, pid),
        };
      }

      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const a = members[i]; const b = members[j];
          const key = bondKey(a, b);
          const bond = this.bonds.get(key) ?? {
            a, b, rounds: 0, mutualStand: 0, mutualFold: 0, betrayals: {}, whispers: 0, lastIncident: null,
          };
          bond.rounds += 1;
          const aHeld = this.heldLine(g, a, { shown: true });
          const bHeld = this.heldLine(g, b, { shown: true });
          const aSold = this.soldOut(g, a, { shown: true });
          const bSold = this.soldOut(g, b, { shown: true });
          if (aHeld && bHeld) bond.mutualStand += 1;
          else if (aSold && bSold) {
            bond.mutualFold += 1;
            bond.lastIncident = { job: g.job.title, round: this.round };
          } else if ((aSold && bHeld) || (bSold && aHeld)) {
            const traitor = aSold ? a : b;
            bond.betrayals[traitor] = (bond.betrayals[traitor] ?? 0) + 1;
            bond.lastIncident = { job: g.job.title, round: this.round, traitor };
          } else {
            bond.murky = (bond.murky ?? 0) + 1;
            bond.lastIncident = { job: g.job.title, round: this.round };
          }
          if (g.whispers[a]) bond.whispers += 1;
          if (g.whispers[b]) bond.whispers += 1;
          this.bonds.set(key, bond);
        }
      }

      const asMembers = members.map((id) => ({ id, name: this.players.get(id).name }));
      g.narration = narrate(g.job, asMembers, g.publicChoices);
      g.trueNarration = narrate(g.job, asMembers, g.choices);

      roundLog.groups.push({
        id: g.id, kind: g.kind, title: g.job.title, caseNo: g.job.caseNo,
        tone: g.job.tone ?? 'standard',
        callback: g.job.callback ?? null,
        members: members.map((id) => ({
          id, name: this.players.get(id).name,
          choice: g.publicChoices[id],
          trueChoice: g.choices[id],
          move: this.optionOf(g, id).label,
          held: this.heldLine(g, id),
          sold: this.soldOut(g, id),
          card: g.cards[id]?.cardId ?? null,
        })),
        narration: g.trueNarration,
        shownNarration: g.narration,
        switched: !!g.switched,
        payouts: Object.fromEntries(members.map((pid) => [pid, g.result.perPlayer[pid].total])),
        pledges: { ...g.pledges },
      });
      for (const [pid, c] of Object.entries(g.cards)) {
        roundLog.cards.push({
          by: this.players.get(pid).name, cardId: c.cardId,
          target: c.targetId ? this.players.get(c.targetId)?.name ?? null : null,
          cancelled: !cardLive(g, pid),
        });
      }
    }

    // --- heat --------------------------------------------------------------
    let folds = 0; let stands = 0;
    for (const g of this.groups) {
      for (const pid of g.memberIds) {
        if (this.soldOut(g, pid)) folds++;
        else if (this.heldLine(g, pid)) stands++;
      }
    }
    // a practice night never brings the heat on; there is no week after it
    if (!this.tutorial) {
      this.heat = Math.max(0, Math.min(100, this.heat + heatDelta({ folds, stands, n: Math.max(2, this.players.size) })));
    }
    roundLog.heat = this.heat;
    this.history.push(roundLog);

    this.phase = 'reckoning';
    this.readySet = new Set();
    this.setDeadline('reckoning');
    this.bump();
  }

  ready(pid) {
    if (this.phase !== 'reckoning') return { error: 'Nothing to move on from.' };
    this.readySet.add(pid);
    const humans = this.livePlayers.filter((p) => !p.bot && p.connected);
    if (humans.length > 0 && humans.every((p) => this.readySet.has(p.id))) this.advancePhase();
    else this.bump();
    return { ok: true };
  }

  // ----------------------------------------------------------------- events ---

  shouldEvent() {
    if (this.tutorial) return false;
    if (this.round >= this.config.rounds) return false;
    if (this.round < 1) return false;
    if (this.heat >= 75) return true;
    return this.rng.chance(this.profile.eventChance);
  }

  beginEvent() {
    const forced = this.heat >= 75 ? EVENT_BY_ID.raid : null;
    const ev = forced ?? pickEvent(this.rng, this);
    if (!ev) { this.afterEvent(); return; }
    this.usedEvents.add(ev.id);

    if (ev.kind === 'vote' && this.profile.hasVotes) {
      this.event = { id: ev.id, name: ev.name, line: ev.line, question: ev.question, kind: 'vote' };
      this.phase = 'vote';
      this.vote = { eventId: ev.id, votes: {}, result: null };
      this.setDeadline('vote');
      for (const p of this.players.values()) {
        if (p.bot) this.vote.votes[p.id] = botVote(this.rng, p, this);
      }
      this.bump();
      return;
    }

    const outcome = ev.apply(this, this.rng) ?? { narration: '', lines: [] };
    this.event = {
      id: ev.id, name: ev.name, line: ev.line, kind: 'auto',
      narration: outcome.narration, lines: outcome.lines ?? [], secret: !!outcome.secret,
    };
    this.phase = 'event';
    this.setDeadline('event');
    this.bump();
  }

  castVote(pid, targetId) {
    if (this.phase !== 'vote') return { error: 'No vote on the floor.' };
    if (!this.players.has(targetId)) return { error: 'Nobody by that name.' };
    this.vote.votes[pid] = targetId;
    this.bump();
    const humans = this.livePlayers.filter((p) => !p.bot && p.connected);
    if (humans.every((p) => this.vote.votes[p.id])) this.resolveVote();
    return { ok: true };
  }

  resolveVote() {
    const ev = EVENT_BY_ID[this.vote.eventId];
    const tally = new Map();
    for (const target of Object.values(this.vote.votes)) {
      tally.set(target, (tally.get(target) ?? 0) + 1);
    }
    const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1]);
    let winner = ranked[0]?.[0] ?? null;
    if (ranked.length > 1 && ranked[0][1] === ranked[1][1]) {
      // a tie goes to whoever is doing best, because that is how rooms work
      const tied = ranked.filter((r) => r[1] === ranked[0][1]).map((r) => r[0]);
      winner = tied.sort((a, b) => (this.players.get(b)?.score ?? 0) - (this.players.get(a)?.score ?? 0))[0];
    }
    const outcome = ev?.resolve ? ev.resolve(this, winner) : { narration: '', lines: [] };
    this.event = {
      id: ev.id, name: ev.name, line: ev.line, kind: 'vote',
      narration: outcome.narration, lines: outcome.lines ?? [],
      question: ev.question,
      tally: ranked.map(([id, count]) => ({ name: this.players.get(id)?.name ?? '?', count })),
      votes: Object.entries(this.vote.votes).map(([voter, target]) => ({
        voter: this.players.get(voter)?.name ?? '?', target: this.players.get(target)?.name ?? '?',
      })),
      winner: winner ? this.players.get(winner)?.name ?? null : null,
    };
    this.vote = null;
    this.phase = 'event';
    this.setDeadline('event');
    this.bump();
  }

  afterEvent() {
    const nextRoundNo = this.round + 1;
    const nextAct = actForRound(nextRoundNo, this.config.rounds);
    if (nextAct.n !== (this.act?.n ?? 1)) { this.round = nextRoundNo - 1; this.beginAct(nextAct); return; }
    this.nextRound();
  }

  // ------------------------------------------------------------- accusation ---

  beginAccusation() {
    if (!this.ratId || this.players.size < 3) { this.finish(); return; }
    this.phase = 'accusation';
    this.accusations = {};
    this.setDeadline('accusation');
    for (const p of this.players.values()) if (p.bot) this.accusations[p.id] = botAccusation(this.rng, p, this);
    this.bump();
  }

  accuse(pid, targetId) {
    if (this.phase !== 'accusation') return { error: 'The floor is not open.' };
    if (!this.players.has(targetId)) return { error: 'Nobody by that name.' };
    this.accusations[pid] = targetId;
    this.bump();
    const humans = this.livePlayers.filter((p) => !p.bot && p.connected);
    if (humans.every((p) => this.accusations[p.id])) this.finish();
    return { ok: true };
  }

  // ------------------------------------------------------------------ end ---

  finish() {
    const finalLines = [];
    const push = (p, label, amount) => {
      p.score += amount;
      const entry = finalLines.find((f) => f.id === p.id) ?? { id: p.id, name: p.name, lines: [] };
      entry.lines.push({ label, amount });
      if (!finalLines.includes(entry)) finalLines.push(entry);
    };

    for (const p of this.players.values()) {
      for (const d of p.debts) push(p, d.label, d.amount);
      if (p.role === 'saint' && p.stats.folds === 0) push(p, 'The Saint held all night', 45);
      if (p.role === 'rat') {
        const wrong = Object.entries(this.accusations)
          .filter(([voter, target]) => voter !== p.id && target !== this.ratId).length;
        if (wrong > 0) push(p, `${wrong} wrong name${wrong === 1 ? '' : 's'} at the table`, wrong * 10);
      }
      if (this.ratId && this.accusations[p.id] === this.ratId && p.id !== this.ratId) {
        push(p, 'Called the Rat correctly', 15);
      }
    }

    if (this.crews) {
      const totals = {};
      for (const p of this.players.values()) {
        totals[p.crew] = (totals[p.crew] ?? 0) + p.score;
      }
      const best = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
      if (best) {
        this.crewResult = {
          winner: CREWS.find((c) => c.id === best[0])?.name ?? best[0],
          totals: Object.entries(totals).map(([id, total]) => ({
            id, name: CREWS.find((c) => c.id === id)?.name ?? id, total,
          })),
        };
        for (const p of this.players.values()) {
          if (p.crew === best[0]) push(p, `${this.crewResult.winner} came out on top`, 20);
        }
      }
    }

    this.finalLines = finalLines;
    this.awards = computeAwards(this);
    this.phase = 'ledger';
    this.deadline = null;
    this.bump();
  }

  // -------------------------------------------------------------- driving ---

  advancePhase() {
    switch (this.phase) {
      case 'act': this.nextRound(); break;
      case 'deal': this.beginTalk(); break;
      case 'talk': this.beginSqueeze(); break;
      case 'squeeze': this.resolve(); break;
      case 'reckoning':
        if (this.round >= this.config.rounds) {
          if (this.tutorial) this.finish();
          else this.beginAccusation();
        } else if (!this.tutorial && this.shouldEvent()) this.beginEvent();
        else if (this.tutorial) this.nextRound();
        else this.afterEvent();
        break;
      case 'vote': this.resolveVote(); break;
      case 'event': this.afterEvent(); break;
      case 'accusation': this.finish(); break;
      default: break;
    }
  }

  tick(now = Date.now()) {
    if (!this.deadline || now < this.deadline) return false;
    this.deadline = null;
    this.advancePhase();
    return true;
  }

  rematch() {
    const wasTutorial = !!this.tutorial;
    const roster = this.order.map((id) => {
      const p = this.players.get(id);
      return { id, name: p.name, bot: p.bot, strategy: p.strategy, connected: p.connected };
    });
    const fresh = new Game({
      code: this.code,
      config: wasTutorial ? { pace: this.config.pace, timers: this.config.timers, cards: true } : { ...this.config },
    });
    fresh.roundsAuto = wasTutorial ? true : this.roundsAuto;
    if (wasTutorial) fresh.lastTutorialId = this.tutorial.id;
    for (const r of roster) {
      const p = fresh.addPlayer(r);
      p.connected = r.connected;
      p.name = r.name;
    }
    return fresh;
  }

  // ------------------------------------------------------------------ view ---

  view(pid) {
    const me = this.players.get(pid) ?? null;
    const g = me ? this.groupOf(pid) : null;
    const talkGroup = me ? this.groupOf(pid, { talk: true }) : null;
    const nameOf = (id) => this.players.get(id)?.name ?? 'someone';
    const partnerNames = g ? g.memberIds.filter((x) => x !== pid).map(nameOf) : [];
    const them = partnerNames.length === 1 ? partnerNames[0] : 'your partner';
    const personalise = (s) => fill(String(s ?? ''), { them, you: me?.name ?? 'you' });
    const band = heatBand(this.heat);

    const base = {
      code: this.code,
      phase: this.phase,
      round: this.round,
      totalRounds: this.config.rounds,
      config: this.config,
      deadline: this.deadline,
      serverNow: Date.now(),
      twist: ['lobby', 'act'].includes(this.phase) ? null : this.twist,
      act: this.act,
      heat: { value: this.heat, ...band },
      profile: this.profile,
      crews: this.crews ? CREWS : null,
      sittingOut: this.sittingOut ? { id: this.sittingOut, name: nameOf(this.sittingOut) } : null,
      version: this.version,
      actionRound: !!this.actionRound,
      tutorial: this.tutorial ? {
        name: this.tutorial.name,
        coachName: this.tutorial.coachName,
        coachRole: this.tutorial.coachRole,
        opening: this.tutorial.opening,
        closing: this.tutorial.closing,
        wrinkle: this.tutorial.wrinkle,
        beat: this.round,
        beats: this.tutorial.beats.length,
        teach: this.tutorial.beats[this.round - 1]?.teach ?? null,
        says: this.tutorial.beats[this.round - 1]?.coach?.[this.phase] ?? null,
      } : null,
      players: this.livePlayers.map((p) => ({
        id: p.id, name: p.name, bot: p.bot,
        strategy: p.bot ? p.strategy : null,
        connected: p.connected,
        score: p.score,
        markers: p.markers,
        crew: p.crew,
        isYou: p.id === pid,
        handCount: p.hand.length,
        played: this.phase === 'squeeze' || this.phase === 'talk' ? !!p.playedThisRound : undefined,
        locked: this.phase === 'squeeze' ? !!this.groupOf(p.id)?.choices[p.id] : undefined,
        ready: this.phase === 'reckoning' ? this.readySet?.has(p.id) : undefined,
        voted: this.phase === 'vote' ? !!this.vote?.votes[p.id] : undefined,
        accused: this.phase === 'accusation' ? !!this.accusations[p.id] : undefined,
        role: this.phase === 'ledger' || p.roleRevealed ? ROLE_BY_ID[p.role] ?? null : undefined,
        stats: this.phase === 'ledger' ? p.stats : undefined,
        roundEarnings: this.phase === 'ledger' ? p.roundEarnings : undefined,
      })),
    };

    if (me) {
      base.you = {
        id: me.id, name: me.name, score: me.score, markers: me.markers,
        markerTarget: me.markerTarget,
        crew: me.crew ? CREWS.find((c) => c.id === me.crew) : null,
        role: me.role ? ROLE_BY_ID[me.role] : null,
        roleRevealed: me.roleRevealed,
        powerUsed: me.powerUsed,
        powerResult: me.powerResult,
        roundNote: me.roundNote,
        hand: me.hand.map((id) => CARD_BY_ID[id]).filter(Boolean),
        playedThisRound: me.playedThisRound ? CARD_BY_ID[me.playedThisRound] : null,
        debts: me.debts,
        sittingOut: this.sittingOut === me.id,
      };
    }

    if (g && !['lobby', 'act', 'ledger'].includes(this.phase)) {
      const openBook = this.twist?.id === 'openbook';
      const lookout = g.cards[pid]?.cardId === 'lookout';
      base.job = {
        kind: g.kind,
        tone: g.job.tone ?? 'standard',
        title: g.job.title,
        caseNo: g.job.caseNo,
        setup: g.job.setup,
        pressure: g.job.pressure,
        coda: g.job.coda,
        callback: g.job.callback ?? null,
        stakes: g.stakes,
        switched: !!g.switched,
        stand: { label: g.job.stand.label, blurb: personalise(g.job.stand.blurb) },
        fold: { label: g.job.fold.label, blurb: personalise(g.job.fold.blurb) },
        partners: g.memberIds.filter((x) => x !== pid).map((id) => ({ id, name: nameOf(id) })),
        talkPartners: (talkGroup ?? g).talkMemberIds.filter((x) => x !== pid).map((id) => ({ id, name: nameOf(id) })),
        stake: g.stake ? { unit: g.stake.unit ?? g.stake.contribution, multiplier: g.stake.multiplier, n: g.memberIds.length } : null,
        options: g.job.options.map((o) => ({
          id: o.id,
          label: o.label,
          blurb: personalise(o.blurb),
          archetype: o.archetype,
          note: ARCHETYPE_NOTES[o.archetype] ?? '',
          ...previewOption(o, {
            unit: g.stake.unit ?? g.stake.contribution,
            multiplier: g.stake.multiplier,
            n: g.memberIds.length,
          }),
        })),
        yourChoice: g.choices[pid] ?? null,
        lockedCount: g.memberIds.filter((id) => g.choices[id]).length,
        groupSize: g.memberIds.length,
        pledgedByYou: !!(talkGroup ?? g).pledges[pid],
        whisperByYou: (talkGroup ?? g).whispers[pid] ?? '',
        incoming: Object.entries((talkGroup ?? g).whispers)
          .filter(([sender]) => sender !== pid)
          .map(([sender, text]) => ({ from: nameOf(sender), text })),
        pledgesVisible: openBook
          ? this.groups.flatMap((grp) => grp.talkMemberIds.map((id) => ({ name: nameOf(id), pledged: !!grp.pledges[id] })))
          : (talkGroup ?? g).talkMemberIds.filter((x) => x !== pid)
              .map((id) => ({ name: nameOf(id), pledged: !!(talkGroup ?? g).pledges[id] })),
        leak: g.leak && g.leak.from !== pid
          ? { from: nameOf(g.leak.from), choice: g.leak.choice, label: g.leak.label }
          : null,
        // face-up cards are announced the moment they hit the table
        declared: Object.entries(g.cards)
          .filter(([owner, c]) => owner !== pid && c.face === 'up')
          .map(([owner, c]) => ({
            by: nameOf(owner), card: CARD_BY_ID[c.cardId],
            target: c.targetId ? nameOf(c.targetId) : null,
          })),
        // somebody with a Lookout sees the room
        lookout: lookout
          ? g.memberIds.filter((x) => x !== pid && g.choices[x])
              .map((x) => ({ name: nameOf(x), label: this.optionOf(g, x).label }))
          : null,
        cardPlayedByYou: g.cards[pid] ? CARD_BY_ID[g.cards[pid].cardId] : null,
      };
    }

    if (this.phase === 'reckoning') {
      const blind = this.twist?.id === 'blind';
      base.reckoning = this.groups.map((grp) => ({
        id: grp.id, kind: grp.kind, title: grp.job.title, tone: grp.job.tone ?? 'standard',
        yours: grp.memberIds.includes(pid),
        callback: grp.job.callback ?? null,
        narration: blind
          ? 'The lights went out in the interview wing at 9:40 and nobody has fixed them. You are told what you earned and not one thing more. The rest of it keeps until the ledger, when everybody finds out together.'
          : grp.narration,
        coda: grp.job.coda,
        pot: grp.pot ?? null,
        members: grp.memberIds.map((id) => ({
          id, name: nameOf(id),
          choice: blind && id !== pid ? null : grp.publicChoices[id],
          move: blind && id !== pid ? null : grp.result?.perPlayer[id]?.option?.label ?? null,
          held: blind && id !== pid ? null : !!grp.result?.perPlayer[id]?.held,
          sold: blind && id !== pid ? null : !!grp.result?.perPlayer[id]?.sold,
          total: blind && id !== pid ? null : grp.result?.perPlayer[id]?.total ?? 0,
          pledged: blind && id !== pid ? false : !!grp.result?.perPlayer[id]?.pledged,
          brokePledge: blind && id !== pid ? false : !!grp.result?.perPlayer[id]?.brokePledge,
          wentQuiet: (grp.wentQuiet ?? []).includes(id),
          card: grp.cards[id] && (grp.cards[id].face === 'up' || id === pid)
            ? CARD_BY_ID[grp.cards[id].cardId] : null,
        })),
        yourLines: grp.memberIds.includes(pid) ? grp.result?.perPlayer[pid]?.lines ?? [] : [],
      }));
    }

    if (this.phase === 'event') base.event = this.event;
    if (this.phase === 'vote') {
      base.voteState = {
        name: this.event?.name, line: this.event?.line, question: this.event?.question,
        yourVote: this.vote?.votes[pid] ?? null,
        cast: Object.keys(this.vote?.votes ?? {}).length,
      };
    }
    if (this.phase === 'accusation') {
      base.accusation = { yourVote: this.accusations[pid] ?? null, voted: Object.keys(this.accusations).length };
    }
    if (this.phase === 'ledger') base.ledger = this.buildLedger();

    return base;
  }

  buildLedger() {
    const nameOf = (id) => this.players.get(id)?.name ?? 'someone';
    const standings = this.livePlayers.slice().sort((a, b) => b.score - a.score).map((p, i) => ({
      rank: i + 1, id: p.id, name: p.name, score: p.score, bot: p.bot,
      crew: p.crew ? CREWS.find((c) => c.id === p.crew) : null,
      role: ROLE_BY_ID[p.role] ?? null,
      stats: p.stats,
    }));

    const bonds = [...this.bonds.values()].map((b) => {
      const betrayA = b.betrayals[b.a] ?? 0;
      const betrayB = b.betrayals[b.b] ?? 0;
      return {
        a: b.a, b: b.b, aName: nameOf(b.a), bName: nameOf(b.b),
        rounds: b.rounds, mutualStand: b.mutualStand, mutualFold: b.mutualFold,
        murky: b.murky ?? 0,
        betrayA, betrayB,
        trust: Number((b.rounds > 0 ? b.mutualStand / b.rounds : 0).toFixed(3)),
      };
    });

    const secrets = [];
    for (const r of this.history) {
      for (const g of r.groups) {
        for (const m of g.members) {
          if (m.choice !== m.trueChoice) {
            secrets.push({
              round: r.round, job: g.title, name: m.name,
              shown: m.choice, truth: m.trueChoice,
            });
          }
        }
      }
    }

    return {
      standings, bonds,
      tutorial: this.tutorial ?? null,
      awards: this.awards,
      heat: this.heat,
      crews: this.crewResult ?? null,
      rat: this.ratId ? { id: this.ratId, name: nameOf(this.ratId) } : null,
      accusations: Object.entries(this.accusations).map(([voter, target]) => ({
        voter: nameOf(voter), target: nameOf(target), correct: target === this.ratId,
      })),
      finalLines: this.finalLines ?? [],
      history: this.history,
      secrets,
    };
  }
}

function labelFor(mine, theirs) {
  if (mine === 'stand' && theirs === 'stand') return 'You both held the line';
  if (mine === 'stand' && theirs === 'fold') return 'You held. They did not.';
  if (mine === 'fold' && theirs === 'stand') return 'You folded on somebody who held';
  return 'You both folded';
}

export function computeAwards(game) {
  const players = game.livePlayers;
  if (players.length === 0) return [];
  const awards = [];
  const best = (label, blurb, pick, fmt) => {
    const sorted = players.slice().sort((a, b) => pick(b) - pick(a));
    const top = sorted[0];
    if (!top || pick(top) <= 0) return;
    const tied = sorted.filter((p) => pick(p) === pick(top));
    awards.push({ label, blurb, names: tied.map((p) => p.name), value: fmt ? fmt(pick(top)) : String(pick(top)) });
  };

  best('THE ROCK', 'Held the line more than anybody.', (p) => p.stats.stands, (v) => `${v} stands`);
  best('JUDAS', 'Folded on people who were holding for them.', (p) => p.stats.betrayals, (v) => `${v} betrayals`);
  best('THE MARK', 'Held the line for people who did not.', (p) => p.stats.betrayed, (v) => `${v} times left out there`);
  best('OATHBREAKER', 'Swore it, then didn’t.', (p) => p.stats.pledgesBroken, (v) => `${v} broken pledges`);
  best('THE GHOST', 'Said nothing, repeatedly, on purpose or otherwise.', (p) => p.stats.silentRounds, (v) => `${v} silent rounds`);
  best('THE MECHANIC', 'Never once just played the hand they were dealt.', (p) => p.stats.cardsPlayed, (v) => `${v} cards played`);
  best('THE MAGICIAN', 'Folded, and the table never found out.', (p) => p.stats.secretFolds, (v) => `${v} folds nobody saw`);

  const bonds = [...game.bonds.values()];
  const blood = bonds.slice().sort((a, b) => b.mutualStand - a.mutualStand)[0];
  if (blood && blood.mutualStand > 0) {
    awards.push({
      label: 'BLOOD BROTHERS', blurb: 'Never once let each other down.',
      names: [game.players.get(blood.a)?.name, game.players.get(blood.b)?.name].filter(Boolean),
      value: `${blood.mutualStand} clean jobs together`,
    });
  }
  const score = (b) => b.mutualFold + Object.values(b.betrayals).reduce((s, x) => s + x, 0);
  const feud = bonds.slice().sort((a, b) => score(b) - score(a))[0];
  if (feud && score(feud) > 0) {
    awards.push({
      label: 'THE FEUD', blurb: 'Whatever this was, it is not over.',
      names: [game.players.get(feud.a)?.name, game.players.get(feud.b)?.name].filter(Boolean),
      value: `${score(feud)} bad nights`,
    });
  }
  return awards;
}

/* --------------------------------------------------------------- saving ---
 *
 * A night in progress is a plain object plus a 32-bit number, so it can be
 * written to disk and picked up again exactly where it was — same cards, same
 * jobs, same money. Nothing here reaches for the network or the clock.
 */

const MAP_FIELDS = ['players', 'bonds'];
const SET_FIELDS = ['usedEvents', 'readySet'];
const SKIP_FIELDS = new Set(['rng', 'deadline']);

export function serializeGame(game) {
  const out = { __v: 1, rngState: game.rng.state() };
  for (const [key, value] of Object.entries(game)) {
    if (SKIP_FIELDS.has(key)) continue;
    if (MAP_FIELDS.includes(key)) out[key] = [...value.entries()];
    else if (SET_FIELDS.includes(key)) out[key] = [...value];
    else out[key] = value;
  }
  // a deadline is wall-clock, so it is stored as time remaining instead
  out.remainingMs = game.deadline ? Math.max(0, game.deadline - Date.now()) : null;
  return out;
}

export function deserializeGame(data) {
  if (!data || data.__v !== 1) return null;
  const game = new Game({ code: data.code, seed: data.seed, config: data.config });
  for (const [key, value] of Object.entries(data)) {
    if (key === '__v' || key === 'rngState' || key === 'remainingMs') continue;
    if (MAP_FIELDS.includes(key)) game[key] = new Map(value);
    else if (SET_FIELDS.includes(key)) game[key] = new Set(value);
    else game[key] = value;
  }
  game.rng = makeRng(data.seed, data.rngState);
  game.deadline = data.remainingMs == null ? null : Date.now() + data.remainingMs;
  // sockets are gone; everybody is treated as away until they say otherwise
  for (const p of game.players.values()) if (!p.bot) p.connected = false;
  return game;
}

Game.prototype.toJSON = function toJSON() { return serializeGame(this); };
Game.fromJSON = deserializeGame;
