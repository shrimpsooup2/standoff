import { makeRng, roomCode } from './rng.js';
import { makeDeck, makeJob, narrate } from './scenarios.js';
import { makeMatrix, stakesForRound, pairPayoff, groupPayoff, groupParams } from './payoffs.js';
import { pickTwist, TWIST_BY_ID } from './twists.js';
import { dealRoles, ROLE_BY_ID } from './roles.js';
import { fill } from './lexicon.js';
import { botWhisper, botChoice, botAccusation } from './bots.js';

export const PHASES = ['lobby', 'deal', 'talk', 'squeeze', 'reckoning', 'accusation', 'ledger'];

const PACE = {
  relaxed: 1.6,
  normal: 1,
  brisk: 0.65,
};

const BASE_SECONDS = { deal: 16, talk: 50, squeeze: 40, reckoning: 34, accusation: 45 };

const MAX_WHISPER = 180;

function bondKey(a, b) {
  return [a, b].sort().join('|');
}

function emptyStats() {
  return {
    stands: 0,
    folds: 0,
    betrayals: 0,   // you folded while they stood
    betrayed: 0,    // you stood while they folded
    mutualStands: 0,
    mutualFolds: 0,
    pledges: 0,
    pledgesKept: 0,
    pledgesBroken: 0,
    markersEarned: 0,
    markersSpent: 0,
    silentRounds: 0, // rounds where they never locked a choice
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
    this.history = [];      // one entry per completed round
    this.deadline = null;
    this.twist = null;
    this.deck = makeDeck(this.rng);
    this.accusations = {};
    this.ratId = null;
    this.awards = [];
    this.finalTable = null;
    this.config = {
      rounds: 5,
      pace: 'normal',
      timers: true,
      ...config,
    };
    this.version = 0;
  }

  // ---------------------------------------------------------------- lobby ---

  addPlayer({ id, name, bot = false, strategy = null }) {
    const clean = String(name ?? '').trim().slice(0, 18) || 'Nobody';
    const taken = new Set([...this.players.values()].map((p) => p.name.toLowerCase()));
    let final = clean;
    let n = 2;
    while (taken.has(final.toLowerCase())) final = `${clean} ${n++}`;

    const player = {
      id,
      name: final,
      bot,
      strategy,
      connected: true,
      score: 0,
      roundEarnings: [],
      role: null,
      markers: 0,
      markerTarget: null,
      powerUsed: false,
      powerResult: null,
      stats: emptyStats(),
      joinedAt: Date.now(),
    };
    this.players.set(id, player);
    this.order.push(id);
    this.bump();
    return player;
  }

  removePlayer(id) {
    this.players.delete(id);
    this.order = this.order.filter((x) => x !== id);
    this.bump();
  }

  setConnected(id, connected) {
    const p = this.players.get(id);
    if (!p) return;
    p.connected = connected;
    this.bump();
  }

  setConfig(patch) {
    if (this.phase !== 'lobby') return;
    const rounds = Number(patch.rounds);
    if (Number.isFinite(rounds)) this.config.rounds = Math.max(3, Math.min(12, Math.round(rounds)));
    if (PACE[patch.pace]) this.config.pace = patch.pace;
    if (typeof patch.timers === 'boolean') this.config.timers = patch.timers;
    this.bump();
  }

  get livePlayers() {
    return this.order.map((id) => this.players.get(id)).filter(Boolean);
  }

  seconds(phase) {
    return Math.round(BASE_SECONDS[phase] * (PACE[this.config.pace] ?? 1));
  }

  setDeadline(phase) {
    this.deadline = this.config.timers ? Date.now() + this.seconds(phase) * 1000 : null;
  }

  bump() {
    this.version++;
  }

  // ----------------------------------------------------------------- start ---

  start() {
    if (this.phase !== 'lobby') return { error: 'Already dealt in.' };
    if (this.players.size < 2) return { error: 'You need at least two people to betray each other.' };

    const ids = this.order.slice();
    const roles = dealRoles(this.rng, ids);
    for (const id of ids) {
      const p = this.players.get(id);
      p.role = roles[id];
      if (p.role === 'bruiser') p.markers = 1;
    }
    this.ratId = ids.find((id) => this.players.get(id).role === 'rat') ?? null;
    this.round = 0;
    this.nextRound();
    return { ok: true };
  }

  // ------------------------------------------------------------ round deal ---

  /** Who works with whom. Prefers partners you haven't been locked in a room with. */
  buildPairings(ids) {
    const pool = this.rng.shuffle(ids);
    const groups = [];
    const met = (a, b) => this.bonds.get(bondKey(a, b))?.rounds ?? 0;

    while (pool.length > 0) {
      if (pool.length === 3) { groups.push(pool.splice(0, 3)); break; }
      const a = pool.shift();
      if (pool.length === 0) break;
      let bestIdx = 0;
      let bestScore = Infinity;
      pool.forEach((b, i) => {
        const score = met(a, b) * 10 + this.rng();
        if (score < bestScore) { bestScore = score; bestIdx = i; }
      });
      const b = pool.splice(bestIdx, 1)[0];
      groups.push([a, b]);
    }
    return groups;
  }

  isTableRound(round) {
    const n = this.players.size;
    if (n < 3) return round >= this.config.rounds;
    if (round >= this.config.rounds) return true;      // the last one is always everyone
    return round >= 3 && round % 3 === 0;
  }

  nextRound() {
    this.round += 1;
    this.phase = 'deal';
    this.accusationsOpen = false;

    const ids = this.order.slice();
    for (const p of this.players.values()) {
      p.markerTarget = null;
      p.roundNote = null;
    }

    const isTable = this.isTableRound(this.round);
    const isFinal = this.round >= this.config.rounds;
    const stakes = stakesForRound(this.round, this.config.rounds);

    this.twist = pickTwist(this.rng, {
      exclude: isTable ? ['wire', 'switch'] : [],
      allowTalkless: this.round > 1,
    });

    const groupings = isTable ? [ids] : this.buildPairings(ids);

    this.groups = groupings.map((memberIds, i) => {
      const members = memberIds.map((id) => ({ id, name: this.players.get(id).name }));
      const kind = isTable ? 'table' : memberIds.length === 3 ? 'trio' : 'pair';
      const job = makeJob(this.rng, { kind, members, deck: this.deck, final: isFinal && isTable });
      const group = {
        id: `g${this.round}_${i}`,
        kind,
        memberIds: memberIds.slice(),
        talkMemberIds: memberIds.slice(),
        job,
        stakes,
        choices: {},
        lockOrder: [],
        whispers: {},   // sender id -> text
        pledges: {},    // player id -> bool
        leak: null,
        result: null,
      };
      if (kind === 'pair') {
        group.matrix = makeMatrix(this.rng, stakes);
      } else {
        group.params = groupParams(this.rng, memberIds.length, stakes);
      }
      return group;
    });

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
        }
      }
    }
    this.bump();
  }

  whisper(pid, text) {
    if (this.phase !== 'talk') return { error: 'Nobody is listening right now.' };
    const g = this.groupOf(pid, { talk: true });
    if (!g) return { error: 'You are not on a job.' };
    g.whispers[pid] = String(text ?? '').slice(0, MAX_WHISPER);
    this.bump();
    return { ok: true };
  }

  pledge(pid, value) {
    if (this.phase !== 'talk') return { error: 'Too late for promises.' };
    const g = this.groupOf(pid, { talk: true });
    if (!g) return { error: 'You are not on a job.' };
    g.pledges[pid] = !!value;
    this.bump();
    return { ok: true };
  }

  /** Spend a vendetta marker on whoever you're working with. */
  callMarker(pid) {
    const p = this.players.get(pid);
    if (!p) return { error: 'Who?' };
    if (this.phase !== 'talk' && this.phase !== 'squeeze') return { error: 'Not now.' };
    if (p.markers < 1) return { error: 'You are not holding a marker.' };
    if (p.markerTarget) return { error: 'You already called one in this round.' };
    const g = this.groupOf(pid);
    if (!g) return { error: 'You are not on a job.' };
    p.markers -= 1;
    p.stats.markersSpent += 1;
    p.markerTarget = g.kind === 'pair' ? g.memberIds.find((x) => x !== pid) : '*';
    this.bump();
    return { ok: true };
  }

  /** The Consigliere reads one card. Once, all night. */
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

  // -------------------------------------------------------------- the squeeze ---

  beginSqueeze() {
    // The Switcheroo: you talked to one person, you're locked in with another.
    if (this.twist.id === 'switch' && this.groups.every((g) => g.kind !== 'table')) {
      const ids = this.groups.flatMap((g) => g.memberIds);
      const regrouped = this.buildPairings(ids);
      const carried = this.groups;
      this.groups = regrouped.map((memberIds, i) => {
        const members = memberIds.map((id) => ({ id, name: this.players.get(id).name }));
        const kind = memberIds.length === 3 ? 'trio' : 'pair';
        const old = carried.find((g) => g.memberIds.includes(memberIds[0])) ?? carried[0];
        return {
          id: `g${this.round}_s${i}`,
          kind,
          memberIds: memberIds.slice(),
          talkMemberIds: old.talkMemberIds.slice(),
          job: makeJob(this.rng, { kind, members, deck: this.deck }),
          stakes: old.stakes,
          matrix: kind === 'pair' ? makeMatrix(this.rng, old.stakes) : undefined,
          params: kind !== 'pair' ? groupParams(this.rng, memberIds.length, old.stakes) : undefined,
          choices: {},
          lockOrder: [],
          whispers: Object.fromEntries(carried.flatMap((g) => Object.entries(g.whispers))),
          pledges: Object.fromEntries(carried.flatMap((g) => Object.entries(g.pledges))),
          switched: true,
          leak: null,
          result: null,
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
    if (!g) return { error: 'You are not on a job.' };
    if (g.choices[pid]) return { error: 'Locked in. No take-backs.' };
    const value = choice === 'fold' ? 'fold' : 'stand';
    g.choices[pid] = value;
    g.lockOrder.push(pid);
    if (this.twist.id === 'wire' && g.kind === 'pair' && g.lockOrder.length === 1) {
      g.leak = { from: pid, choice: value };
    }
    this.bump();
    if (this.groups.every((grp) => grp.memberIds.every((id) => grp.choices[id]))) {
      this.resolve();
    }
    return { ok: true };
  }

  // ---------------------------------------------------------------- resolve ---

  resolve() {
    const twist = this.twist.id;
    const lastPlaceId = this.livePlayers.slice().sort((a, b) => a.score - b.score)[0]?.id;
    const roundLog = { round: this.round, twist: this.twist, groups: [] };
    let tableTotal = 0;
    const payouts = new Map();   // pid -> { base, lines: [], total }

    const addLine = (pid, label, amount) => {
      const rec = payouts.get(pid);
      rec.lines.push({ label, amount });
      rec.total += amount;
    };

    for (const g of this.groups) {
      // anybody who never locked went quiet, which reads as standing
      for (const pid of g.memberIds) {
        if (!g.choices[pid]) {
          g.choices[pid] = 'stand';
          g.wentQuiet = (g.wentQuiet ?? []).concat(pid);
          this.players.get(pid).stats.silentRounds += 1;
        }
      }

      const members = g.memberIds.map((id) => ({ id, name: this.players.get(id).name }));
      const standers = members.filter((m) => g.choices[m.id] === 'stand');

      for (const m of members) {
        if (!payouts.has(m.id)) payouts.set(m.id, { base: 0, lines: [], total: 0 });
      }

      if (g.kind === 'pair') {
        const [a, b] = members;
        const mx = g.matrix;
        for (const [me, them] of [[a, b], [b, a]]) {
          const mine = g.choices[me.id];
          const theirs = g.choices[them.id];
          let base = pairPayoff(mx, mine, theirs);
          if (twist === 'honour' && mine === 'stand' && theirs === 'stand') base = mx.R * 3;
          if (twist === 'squeeze' && mine === 'fold' && theirs === 'fold') base = -mx.P;
          const rec = payouts.get(me.id);
          rec.base = base;
          rec.total += base;
          rec.lines.push({ label: labelFor(mine, theirs, g.kind), amount: base });
        }
      } else {
        const p = g.params;
        const res = groupPayoff({
          contribution: p.contribution,
          multiplier: p.multiplier,
          n: members.length,
          standCount: standers.length,
        });
        g.pot = res.pot;
        for (const m of members) {
          const mine = g.choices[m.id];
          let base = mine === 'stand' ? res.stand : res.fold;
          if (twist === 'honour' && standers.length === members.length) base = Math.round(base * 2);
          if (twist === 'squeeze' && standers.length === 0) base = -Math.abs(base);
          const rec = payouts.get(m.id);
          rec.base = base;
          rec.total += base;
          rec.lines.push({
            label: mine === 'stand'
              ? `Put in — pot split ${members.length} ways`
              : 'Skimmed — kept your share and took a cut of the pot',
            amount: base,
          });
        }
      }

      g.narration = narrate(g.job, members, g.choices);
      roundLog.groups.push({
        id: g.id,
        kind: g.kind,
        title: g.job.title,
        caseNo: g.job.caseNo,
        members: members.map((m) => ({ ...m, choice: g.choices[m.id] })),
        narration: g.narration,
        switched: !!g.switched,
        talkMembers: g.talkMemberIds.map((id) => this.players.get(id)?.name).filter(Boolean),
      });
    }

    // --- twist: the underdog gets a hand up --------------------------------
    if (twist === 'marked' && lastPlaceId && payouts.has(lastPlaceId)) {
      const rec = payouts.get(lastPlaceId);
      if (rec.total > 0) addLine(lastPlaceId, 'The family takes an interest in the underdog', rec.total);
    }

    // --- twist: double or nothing -----------------------------------------
    if (twist === 'double') {
      for (const [pid, rec] of payouts) {
        if (rec.total !== 0) addLine(pid, 'Double or nothing', rec.total);
      }
    }

    // --- role money --------------------------------------------------------
    for (const g of this.groups) {
      const members = g.memberIds;
      for (const pid of members) {
        const p = this.players.get(pid);
        const mine = g.choices[pid];
        const others = members.filter((x) => x !== pid);
        const someoneFolded = others.some((x) => g.choices[x] === 'fold');

        if (p.role === 'rat' && mine === 'fold') addLine(pid, 'The envelope from the DA', 6);
        if (p.role === 'widow' && mine === 'stand' && someoneFolded) {
          addLine(pid, 'The policy pays out', 12);
        }
        if (p.role === 'ghost') {
          const matched = others.length > 0 && others.every((x) => g.choices[x] === mine);
          if (matched) addLine(pid, 'Moved as one — nobody saw you', 5);
        }
      }
    }

    for (const [, rec] of payouts) tableTotal += Math.max(0, rec.total);
    for (const p of this.players.values()) {
      if (p.role === 'bookkeeper' && payouts.has(p.id)) {
        const skim = Math.round(tableTotal * 0.1);
        if (skim > 0) addLine(p.id, 'Skimmed off the top of the whole table', skim);
      }
      if (p.role === 'gambler' && payouts.has(p.id)) {
        const rec = payouts.get(p.id);
        if (rec.total !== 0) {
          if (Math.abs(rec.total) % 2 === 1) addLine(p.id, 'The coin came up odd — doubled', rec.total);
          else addLine(p.id, 'The coin came up even — halved', -Math.round(rec.total / 2));
        }
      }
    }

    // --- markers, last of all, so a forfeited round is genuinely forfeited ---
    for (const g of this.groups) {
      for (const pid of g.memberIds) {
        const holder = this.players.get(pid);
        if (!holder.markerTarget) continue;
        const targets = holder.markerTarget === '*'
          ? g.memberIds.filter((x) => x !== pid)
          : [holder.markerTarget];
        for (const tid of targets) {
          if (!g.memberIds.includes(tid)) continue;
          if (g.choices[tid] !== 'fold') continue;
          const rec = payouts.get(tid);
          const seized = Math.max(0, rec.total);
          if (seized <= 0) continue;
          const share = holder.role === 'bruiser' ? seized : Math.round(seized / 2);
          addLine(tid, `Marker called in by ${holder.name} — forfeited`, -seized);
          addLine(pid, `Marker collected from ${this.players.get(tid).name}`, share);
          holder.roundNote = `Your marker landed on ${this.players.get(tid).name}.`;
        }
      }
    }

    // --- book it -----------------------------------------------------------
    for (const g of this.groups) {
      const members = g.memberIds;
      g.result = { perPlayer: {} };
      for (const pid of members) {
        const p = this.players.get(pid);
        const rec = payouts.get(pid);
        p.score += rec.total;
        p.roundEarnings.push(rec.total);

        const mine = g.choices[pid];
        const others = members.filter((x) => x !== pid);
        const standers = others.filter((x) => g.choices[x] === 'stand');
        const folders = others.filter((x) => g.choices[x] === 'fold');

        if (mine === 'stand') p.stats.stands += 1; else p.stats.folds += 1;
        if (mine === 'fold' && standers.length > 0) p.stats.betrayals += 1;
        if (mine === 'stand' && folders.length > 0) {
          p.stats.betrayed += 1;
          p.markers += 1;
          p.stats.markersEarned += 1;
        }
        if (g.kind === 'pair') {
          if (mine === 'stand' && standers.length === 1) p.stats.mutualStands += 1;
          if (mine === 'fold' && folders.length === 1) p.stats.mutualFolds += 1;
        }

        const pledged = !!g.pledges[pid];
        if (pledged) {
          p.stats.pledges += 1;
          if (mine === 'stand') p.stats.pledgesKept += 1;
          else p.stats.pledgesBroken += 1;
        }

        g.result.perPlayer[pid] = {
          choice: mine,
          total: rec.total,
          lines: rec.lines,
          pledged,
          brokePledge: pledged && mine === 'fold',
        };
      }

      // bonds ledger
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const a = members[i];
          const b = members[j];
          const key = bondKey(a, b);
          const bond = this.bonds.get(key) ?? {
            a, b, rounds: 0, mutualStand: 0, mutualFold: 0, betrayals: {}, whispers: 0,
          };
          bond.rounds += 1;
          const ca = g.choices[a];
          const cb = g.choices[b];
          if (ca === 'stand' && cb === 'stand') bond.mutualStand += 1;
          else if (ca === 'fold' && cb === 'fold') bond.mutualFold += 1;
          else {
            const traitor = ca === 'fold' ? a : b;
            bond.betrayals[traitor] = (bond.betrayals[traitor] ?? 0) + 1;
          }
          if (g.whispers[a]) bond.whispers += 1;
          if (g.whispers[b]) bond.whispers += 1;
          this.bonds.set(key, bond);
        }
      }
    }

    roundLog.groups.forEach((lg) => {
      const g = this.groups.find((x) => x.id === lg.id);
      lg.payouts = Object.fromEntries(
        g.memberIds.map((pid) => [pid, g.result.perPlayer[pid].total]),
      );
      lg.pledges = { ...g.pledges };
    });
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

  // ------------------------------------------------------------- accusation ---

  beginAccusation() {
    if (!this.ratId || this.players.size < 3) { this.finish(); return; }
    this.phase = 'accusation';
    this.accusations = {};
    this.setDeadline('accusation');
    for (const p of this.players.values()) {
      if (p.bot) this.accusations[p.id] = botAccusation(this.rng, p, this);
    }
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
    for (const p of this.players.values()) {
      const lines = [];
      if (p.role === 'saint' && p.stats.folds === 0) {
        p.score += 45;
        lines.push({ label: 'The Saint held all night', amount: 45 });
      }
      if (p.role === 'rat') {
        const wrong = Object.entries(this.accusations)
          .filter(([voter, target]) => voter !== p.id && target !== this.ratId).length;
        if (wrong > 0) {
          p.score += wrong * 10;
          lines.push({ label: `${wrong} wrong name${wrong === 1 ? '' : 's'} at the table`, amount: wrong * 10 });
        }
      }
      if (this.ratId && this.accusations[p.id] === this.ratId && p.id !== this.ratId) {
        p.score += 15;
        lines.push({ label: 'Called the Rat correctly', amount: 15 });
      }
      if (lines.length) finalLines.push({ id: p.id, name: p.name, lines });
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
      case 'deal': this.beginTalk(); break;
      case 'talk': this.beginSqueeze(); break;
      case 'squeeze': this.resolve(); break;
      case 'reckoning':
        if (this.round >= this.config.rounds) this.beginAccusation();
        else this.nextRound();
        break;
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
    const roster = this.order.map((id) => {
      const p = this.players.get(id);
      return { id, name: p.name, bot: p.bot, strategy: p.strategy, connected: p.connected };
    });
    const fresh = new Game({ code: this.code, config: this.config });
    for (const r of roster) {
      const p = fresh.addPlayer(r);
      p.connected = r.connected;
      p.name = r.name;
    }
    return fresh;
  }

  // ------------------------------------------------------------------ view ---

  /** What one player is allowed to know right now. */
  view(pid) {
    const me = this.players.get(pid) ?? null;
    const g = me ? this.groupOf(pid) : null;
    const talkGroup = me ? this.groupOf(pid, { talk: true }) : null;
    const nameOf = (id) => this.players.get(id)?.name ?? 'someone';
    const partnerNames = g ? g.memberIds.filter((x) => x !== pid).map(nameOf) : [];
    const them = partnerNames.length === 1 ? partnerNames[0] : 'your partner';

    const personalise = (s) => fill(String(s ?? ''), { them, you: me?.name ?? 'you' });

    const base = {
      code: this.code,
      phase: this.phase,
      round: this.round,
      totalRounds: this.config.rounds,
      config: this.config,
      deadline: this.deadline,
      serverNow: Date.now(),
      twist: this.phase === 'lobby' ? null : this.twist,
      version: this.version,
      players: this.livePlayers.map((p) => ({
        id: p.id,
        name: p.name,
        bot: p.bot,
        strategy: p.bot ? p.strategy : null,
        connected: p.connected,
        score: p.score,
        markers: p.markers,
        isYou: p.id === pid,
        locked: this.phase === 'squeeze' ? !!this.groupOf(p.id)?.choices[p.id] : undefined,
        ready: this.phase === 'reckoning' ? this.readySet?.has(p.id) : undefined,
        accused: this.phase === 'accusation' ? !!this.accusations[p.id] : undefined,
        role: this.phase === 'ledger' ? p.role : undefined,
        stats: this.phase === 'ledger' ? p.stats : undefined,
        roundEarnings: this.phase === 'ledger' ? p.roundEarnings : undefined,
      })),
    };

    if (me) {
      base.you = {
        id: me.id,
        name: me.name,
        score: me.score,
        markers: me.markers,
        markerTarget: me.markerTarget,
        role: me.role ? ROLE_BY_ID[me.role] : null,
        powerUsed: me.powerUsed,
        powerResult: me.powerResult,
        roundNote: me.roundNote,
      };
    }

    if (g && this.phase !== 'lobby' && this.phase !== 'ledger') {
      const openBook = this.twist.id === 'openbook';
      base.job = {
        kind: g.kind,
        title: g.job.title,
        caseNo: g.job.caseNo,
        setup: g.job.setup,
        pressure: g.job.pressure,
        coda: g.job.coda,
        stakes: g.stakes,
        switched: !!g.switched,
        stand: { label: g.job.stand.label, blurb: personalise(g.job.stand.blurb) },
        fold: { label: g.job.fold.label, blurb: personalise(g.job.fold.blurb) },
        partners: g.memberIds.filter((x) => x !== pid).map((id) => ({ id, name: nameOf(id) })),
        talkPartners: (talkGroup ?? g).talkMemberIds
          .filter((x) => x !== pid)
          .map((id) => ({ id, name: nameOf(id) })),
        matrix: g.matrix ?? null,
        params: g.params ?? null,
        yourChoice: g.choices[pid] ?? null,
        lockedCount: g.memberIds.filter((id) => g.choices[id]).length,
        groupSize: g.memberIds.length,
        pledgedByYou: !!(talkGroup ?? g).pledges[pid],
        whisperByYou: (talkGroup ?? g).whispers[pid] ?? '',
        incoming: Object.entries((talkGroup ?? g).whispers)
          .filter(([sender]) => sender !== pid)
          .map(([sender, text]) => ({ from: nameOf(sender), text })),
        pledgesVisible: openBook
          ? this.groups.flatMap((grp) =>
              grp.talkMemberIds.map((id) => ({ name: nameOf(id), pledged: !!grp.pledges[id] })))
          : (talkGroup ?? g).talkMemberIds
              .filter((x) => x !== pid)
              .map((id) => ({ name: nameOf(id), pledged: !!(talkGroup ?? g).pledges[id] })),
        leak: g.leak && g.leak.from !== pid
          ? { from: nameOf(g.leak.from), choice: g.leak.choice }
          : null,
      };
    }

    if (this.phase === 'reckoning') {
      // Blind Alley seals the whole round, not just your own room — otherwise
      // you could just read your partner's choice off somebody else's result.
      const blind = this.twist.id === 'blind';
      base.reckoning = this.groups.map((grp) => ({
        id: grp.id,
        kind: grp.kind,
        title: grp.job.title,
        yours: grp.memberIds.includes(pid),
        narration: blind
          ? 'The lights went out in the interview wing at 9:40 and nobody has fixed them. You are told what you earned and not one thing more. The rest of it keeps until the ledger, when everybody finds out together.'
          : grp.narration,
        coda: grp.job.coda,
        pot: grp.pot ?? null,
        members: grp.memberIds.map((id) => ({
          id,
          name: nameOf(id),
          choice: blind && id !== pid ? null : grp.choices[id],
          total: blind && id !== pid ? null : grp.result?.perPlayer[id]?.total ?? 0,
          pledged: blind && id !== pid ? false : !!grp.result?.perPlayer[id]?.pledged,
          brokePledge: blind && id !== pid ? false : !!grp.result?.perPlayer[id]?.brokePledge,
          wentQuiet: (grp.wentQuiet ?? []).includes(id),
        })),
        yourLines: grp.memberIds.includes(pid) ? grp.result?.perPlayer[pid]?.lines ?? [] : [],
      }));
    }

    if (this.phase === 'accusation') {
      base.accusation = {
        yourVote: this.accusations[pid] ?? null,
        voted: Object.keys(this.accusations).length,
      };
    }

    if (this.phase === 'ledger') {
      base.ledger = this.buildLedger();
    }

    return base;
  }

  buildLedger() {
    const nameOf = (id) => this.players.get(id)?.name ?? 'someone';
    const standings = this.livePlayers
      .slice()
      .sort((a, b) => b.score - a.score)
      .map((p, i) => ({
        rank: i + 1,
        id: p.id,
        name: p.name,
        score: p.score,
        bot: p.bot,
        role: ROLE_BY_ID[p.role] ?? null,
        stats: p.stats,
      }));

    const bonds = [...this.bonds.values()].map((b) => {
      const betrayA = b.betrayals[b.a] ?? 0;
      const betrayB = b.betrayals[b.b] ?? 0;
      const trust = b.rounds > 0 ? b.mutualStand / b.rounds : 0;
      return {
        a: b.a, b: b.b,
        aName: nameOf(b.a), bName: nameOf(b.b),
        rounds: b.rounds,
        mutualStand: b.mutualStand,
        mutualFold: b.mutualFold,
        betrayA, betrayB,
        trust: Number(trust.toFixed(3)),
      };
    });

    return {
      standings,
      bonds,
      awards: this.awards,
      rat: this.ratId ? { id: this.ratId, name: nameOf(this.ratId) } : null,
      accusations: Object.entries(this.accusations).map(([voter, target]) => ({
        voter: nameOf(voter), target: nameOf(target), correct: target === this.ratId,
      })),
      finalLines: this.finalLines ?? [],
      history: this.history,
    };
  }
}

function labelFor(mine, theirs, kind) {
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
    awards.push({
      label,
      blurb,
      names: tied.map((p) => p.name),
      value: fmt ? fmt(pick(top)) : String(pick(top)),
    });
  };

  best('THE ROCK', 'Held the line more than anybody.', (p) => p.stats.stands, (v) => `${v} stands`);
  best('JUDAS', 'Folded on people who were holding for them.', (p) => p.stats.betrayals, (v) => `${v} betrayals`);
  best('THE MARK', 'Held the line for people who did not.', (p) => p.stats.betrayed, (v) => `${v} times left out there`);
  best('OATHBREAKER', 'Swore it, then didn’t.', (p) => p.stats.pledgesBroken, (v) => `${v} broken pledges`);
  best('THE GHOST', 'Said nothing, repeatedly, on purpose or otherwise.', (p) => p.stats.silentRounds, (v) => `${v} silent rounds`);

  const bonds = [...game.bonds.values()];
  const blood = bonds.slice().sort((a, b) => b.mutualStand - a.mutualStand)[0];
  if (blood && blood.mutualStand > 0) {
    awards.push({
      label: 'BLOOD BROTHERS',
      blurb: 'Never once let each other down.',
      names: [game.players.get(blood.a)?.name, game.players.get(blood.b)?.name].filter(Boolean),
      value: `${blood.mutualStand} clean jobs together`,
    });
  }
  const feud = bonds.slice().sort((a, b) =>
    (b.mutualFold + Object.values(b.betrayals).reduce((s, x) => s + x, 0)) -
    (a.mutualFold + Object.values(a.betrayals).reduce((s, x) => s + x, 0)))[0];
  if (feud) {
    const total = feud.mutualFold + Object.values(feud.betrayals).reduce((s, x) => s + x, 0);
    if (total > 0) {
      awards.push({
        label: 'THE FEUD',
        blurb: 'Whatever this was, it is not over.',
        names: [game.players.get(feud.a)?.name, game.players.get(feud.b)?.name].filter(Boolean),
        value: `${total} bad nights`,
      });
    }
  }
  return awards;
}
