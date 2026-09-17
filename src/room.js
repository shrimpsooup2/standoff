import { randomBytes, randomUUID } from 'node:crypto';
import { Game, serializeGame, deserializeGame } from '../public/game/engine.js';
import { BOT_NAMES, STRATEGIES } from '../public/game/bots.js';
import { makeRng, roomCode } from '../public/game/rng.js';

const ROOM_TTL_MS = 24 * 60 * 60 * 1000;   // a table lives a day, then the lights go off
const EMPTY_TTL_MS = 6 * 60 * 60 * 1000;   // and six hours after the last person leaves
const MAX_PLAYERS = 10;
const MAX_CHAT = 60;
const MAX_ROOMS = 200;

// Nobody playing this game needs to send thirty messages a second.
const RATE_WINDOW_MS = 2000;
const RATE_LIMIT = 40;

const KNOWN = new Set([
  'create', 'join', 'resume', 'config', 'addBot', 'removeBot', 'start', 'skip',
  'whisper', 'pledge', 'card', 'marker', 'power', 'choose', 'ready', 'vote',
  'accuse', 'chat', 'rematch', 'tutorial', 'ping', 'kick',
]);

const str = (v, max) => String(v ?? '').slice(0, max);

export class Room {
  constructor(code) {
    this.code = code;
    this.game = new Game({ code });
    this.sockets = new Map();   // playerId -> Set<Socket>
    this.tokens = new Map();    // token -> playerId
    this.hostId = null;
    this.chat = [];
    this.createdAt = Date.now();
    this.emptySince = Date.now();
    this.lastVersion = -1;
    this.seq = 0;               // every state push is numbered, so clients can
                                // tell a stale frame from a fresh one
  }

  // ------------------------------------------------------------ saving ---

  toJSON() {
    return {
      code: this.code,
      game: serializeGame(this.game),
      tokens: [...this.tokens.entries()],
      hostId: this.hostId,
      chat: this.chat.slice(-MAX_CHAT),
      createdAt: this.createdAt,
    };
  }

  static fromJSON(data) {
    if (!data?.code) return null;
    const game = deserializeGame(data.game);
    if (!game) return null;
    const room = new Room(data.code);
    room.game = game;
    room.tokens = new Map(data.tokens ?? []);
    room.hostId = data.hostId ?? null;
    room.chat = Array.isArray(data.chat) ? data.chat : [];
    room.createdAt = data.createdAt ?? Date.now();
    room.emptySince = Date.now();
    return room;
  }

  // ------------------------------------------------------------- seats ---

  get playerCount() { return this.game.players.size; }

  get connectedHumans() {
    return this.game.livePlayers.filter((p) => !p.bot && p.connected).length;
  }

  attach(playerId, socket) {
    if (!this.sockets.has(playerId)) this.sockets.set(playerId, new Set());
    this.sockets.get(playerId).add(socket);
    this.game.setConnected(playerId, true);
    this.emptySince = null;
  }

  detach(playerId, socket) {
    const set = this.sockets.get(playerId);
    if (!set) return;
    set.delete(socket);
    if (set.size === 0) {
      this.sockets.delete(playerId);
      this.game.setConnected(playerId, false);
      if (this.game.phase === 'lobby') {
        // nobody has committed a crime yet; no reason to hold a ghost seat
        this.game.removePlayer(playerId);
        for (const [tok, pid] of this.tokens) if (pid === playerId) this.tokens.delete(tok);
      }
      if (this.hostId === playerId) this.reassignHost();
    }
    if (this.connectedHumans === 0) this.emptySince = Date.now();
  }

  /**
   * The host is whoever is in the room, not whoever started it. If they walk
   * out, close the laptop or lose signal, somebody else picks up the controls
   * immediately and the table keeps moving.
   */
  reassignHost() {
    const next = this.game.livePlayers.find((p) => !p.bot && p.connected);
    const previous = this.hostId;
    this.hostId = next?.id ?? null;
    if (this.hostId && this.hostId !== previous) {
      this.say('THE HOUSE', `${this.game.players.get(this.hostId).name} is running the table now.`, 'system');
    }
  }

  issueToken(playerId) {
    const token = randomBytes(24).toString('hex');
    this.tokens.set(token, playerId);
    return token;
  }

  say(name, text, kind = 'chat') {
    const clean = str(text, 200).trim();
    if (!clean) return;
    this.chat.push({ name: str(name, 24), text: clean, kind, at: Date.now() });
    if (this.chat.length > MAX_CHAT) this.chat.splice(0, this.chat.length - MAX_CHAT);
  }

  addBot() {
    if (this.playerCount >= MAX_PLAYERS) return { error: 'The room only holds ten.' };
    if (this.game.phase !== 'lobby') return { error: 'Too late to bring anybody in.' };
    const rng = makeRng(randomUUID());
    const used = new Set(this.game.livePlayers.map((p) => p.name));
    const name = BOT_NAMES.find((n) => !used.has(n)) ?? `Ghost ${this.playerCount + 1}`;
    const strategy = rng.pick(STRATEGIES).id;
    const p = this.game.addPlayer({ id: randomUUID(), name, bot: true, strategy });
    this.say('THE DOOR', `${p.name} let himself in. Word is he ${STRATEGIES.find((s) => s.id === strategy).name}.`, 'system');
    return { ok: true };
  }

  removeBot(id) {
    const p = this.game.players.get(id);
    if (!p || !p.bot) return { error: 'That one’s a real person.' };
    if (this.game.phase !== 'lobby') return { error: 'Nobody leaves mid-job.' };
    this.game.removePlayer(id);
    this.say('THE DOOR', `${p.name} was asked to leave.`, 'system');
    return { ok: true };
  }

  /** The host can clear out somebody who has gone for good and is holding up a round. */
  kick(id) {
    const p = this.game.players.get(id);
    if (!p) return { error: 'Nobody by that name.' };
    if (p.connected && !p.bot) return { error: 'They are still here. Ask them.' };
    if (this.game.phase === 'lobby') this.game.removePlayer(id);
    else {
      // mid-game they become a ghost so the round can finish without them
      p.bot = true;
      p.strategy = p.strategy ?? 'titfortat';
      this.game.bump();
    }
    this.say('THE HOUSE', `${p.name} is not coming back. Somebody else will play their hand.`, 'system');
    for (const [tok, pid] of this.tokens) if (pid === id) this.tokens.delete(tok);
    return { ok: true };
  }

  stateFor(playerId) {
    const view = this.game.view(playerId);
    view.hostId = this.hostId;
    view.isHost = playerId === this.hostId;
    view.chat = this.chat.slice(-30);
    view.maxPlayers = MAX_PLAYERS;
    view.seq = this.seq;
    return view;
  }

  sync(force = false) {
    if (!force && this.game.version === this.lastVersion) return;
    this.lastVersion = this.game.version;
    this.seq += 1;
    for (const [playerId, set] of this.sockets) {
      let payload;
      try {
        payload = { t: 'state', state: this.stateFor(playerId) };
      } catch (err) {
        console.error(`[standoff] could not build the view for ${playerId}:`, err);
        continue;
      }
      for (const s of set) {
        try { s.send(payload); } catch { /* the socket will clean itself up */ }
      }
    }
  }

  expired(now = Date.now()) {
    if (now - this.createdAt > ROOM_TTL_MS) return true;
    if (this.emptySince && now - this.emptySince > EMPTY_TTL_MS) return true;
    return false;
  }
}

export class Rooms {
  constructor({ store = null } = {}) {
    this.rooms = new Map();
    this.rng = makeRng(randomUUID());
    this.store = store;
    this.dirty = false;
  }

  /** Bring back whatever was on the table when the process last stopped. */
  restore() {
    if (!this.store) return 0;
    const data = this.store.loadSync();
    if (!data?.rooms?.length) return 0;
    let restored = 0;
    for (const raw of data.rooms) {
      try {
        const room = Room.fromJSON(raw);
        if (!room || room.expired()) continue;
        this.rooms.set(room.code, room);
        restored += 1;
      } catch (err) {
        console.warn('[standoff] could not restore a table:', err.message);
      }
    }
    return restored;
  }

  snapshot() {
    return { savedAt: Date.now(), rooms: [...this.rooms.values()].map((r) => r.toJSON()) };
  }

  persist({ immediate = false } = {}) {
    if (!this.store) return;
    this.store.save(() => this.snapshot(), { immediate });
  }

  create() {
    if (this.rooms.size >= MAX_ROOMS) this.evictOldest();
    let code = roomCode(this.rng);
    let guard = 0;
    while (this.rooms.has(code) && guard++ < 200) code = roomCode(this.rng);
    const room = new Room(code);
    this.rooms.set(code, room);
    return room;
  }

  evictOldest() {
    let oldest = null;
    for (const room of this.rooms.values()) {
      if (room.connectedHumans > 0) continue;
      if (!oldest || room.createdAt < oldest.createdAt) oldest = room;
    }
    if (oldest) this.rooms.delete(oldest.code);
  }

  get(code) {
    return this.rooms.get(str(code, 8).toUpperCase().trim()) ?? null;
  }

  /**
   * One beat of the clock. Every room is stepped inside its own guard, so a
   * room that somehow breaks can never stop the others from playing.
   */
  tick() {
    const now = Date.now();
    let changed = false;
    for (const [code, room] of this.rooms) {
      try {
        if (room.expired(now)) { this.rooms.delete(code); changed = true; continue; }
        const moved = room.game.tick(now);
        if (moved) { room.sync(true); changed = true; }
        else if (room.game.version !== room.lastVersion) { room.sync(); changed = true; }
      } catch (err) {
        console.error(`[standoff] table ${code} threw on the clock:`, err);
        // keep the room but stop its timer rather than looping on the error
        try { room.game.deadline = null; } catch { /* nothing more to do */ }
      }
    }
    if (changed) this.persist();
  }
}

/** Handle one inbound client message. Never throws; never trusts the input. */
export function handleMessage(rooms, socket, raw) {
  const ctx = socket.data;

  // ---- rate limit ---------------------------------------------------------
  const now = Date.now();
  if (!ctx.rate || now - ctx.rate.since > RATE_WINDOW_MS) ctx.rate = { since: now, count: 0 };
  ctx.rate.count += 1;
  if (ctx.rate.count > RATE_LIMIT) {
    if (ctx.rate.count === RATE_LIMIT + 1) socket.send({ t: 'error', msg: 'Slow down.' });
    return;
  }

  let msg;
  try { msg = JSON.parse(raw); } catch { return; }
  if (!msg || typeof msg !== 'object' || typeof msg.t !== 'string' || !KNOWN.has(msg.t)) return;

  const fail = (m) => socket.send({ t: 'error', msg: m });

  if (msg.t === 'ping') { socket.send({ t: 'pong', at: Date.now() }); return; }

  // ---- entry --------------------------------------------------------------
  if (msg.t === 'create' || msg.t === 'join' || msg.t === 'resume') {
    const room = msg.t === 'create' ? rooms.create() : rooms.get(msg.code);
    if (!room) return fail('No table by that name. Check the letters.');

    if (msg.t === 'resume' && typeof msg.token === 'string' && room.tokens.has(msg.token)) {
      const playerId = room.tokens.get(msg.token);
      if (room.game.players.has(playerId)) {
        const player = room.game.players.get(playerId);
        // somebody who was turned into a ghost while away is a person again
        if (player.bot && player.wasHuman !== false && room.tokens.get(msg.token)) player.bot = false;
        ctx.room = room; ctx.playerId = playerId;
        room.attach(playerId, socket);
        if (!room.hostId) room.reassignHost();
        socket.send({ t: 'welcome', code: room.code, playerId, token: msg.token });
        room.sync(true);
        rooms.persist();
        return;
      }
    }

    if (room.game.phase !== 'lobby') {
      return fail('That job already started. You can watch, or take the next one.');
    }
    if (room.playerCount >= MAX_PLAYERS) return fail('The room only holds ten.');

    const playerId = randomUUID();
    const player = room.game.addPlayer({ id: playerId, name: str(msg.name, 18) });
    const token = room.issueToken(playerId);
    ctx.room = room; ctx.playerId = playerId;
    room.attach(playerId, socket);
    if (!room.hostId) room.hostId = playerId;
    room.say('THE DOOR', `${player.name} sat down.`, 'system');
    socket.send({ t: 'welcome', code: room.code, playerId, token });
    room.sync(true);
    rooms.persist();
    return;
  }

  const room = ctx.room;
  const pid = ctx.playerId;
  if (!room || !pid || !room.game.players.has(pid)) return fail('You are not at a table.');
  const isHost = room.hostId === pid;
  const g = room.game;
  let res = { ok: true };

  try {
    switch (msg.t) {
      case 'config':
        if (!isHost) return fail('That is the host’s call.');
        g.setConfig(msg);
        break;
      case 'addBot':
        if (!isHost) return fail('That is the host’s call.');
        res = room.addBot();
        break;
      case 'removeBot':
        if (!isHost) return fail('That is the host’s call.');
        res = room.removeBot(str(msg.id, 64));
        break;
      case 'kick':
        if (!isHost) return fail('That is the host’s call.');
        res = room.kick(str(msg.id, 64));
        break;
      case 'start':
        if (!isHost) return fail('That is the host’s call.');
        res = g.start();
        if (res.ok) room.say('THE HOUSE', 'Cards are dealt. Nobody talks about the cards.', 'system');
        break;
      case 'tutorial':
        if (!isHost) return fail('That is the host’s call.');
        res = g.startTutorial ? g.startTutorial() : { error: 'No tutorial here.' };
        break;
      case 'skip':
        if (!isHost) return fail('That is the host’s call.');
        if (g.phase === 'lobby' || g.phase === 'ledger') return fail('Nothing to skip.');
        g.deadline = null;
        g.advancePhase();
        break;
      case 'whisper': res = g.whisper(pid, str(msg.text, 180)); break;
      case 'pledge': res = g.pledge(pid, !!msg.value); break;
      case 'card': res = g.playCard(pid, str(msg.card, 32), msg.target ? str(msg.target, 64) : null); break;
      case 'marker': res = g.callMarker(pid); break;
      case 'power': res = g.usePower(pid, str(msg.target, 64)); break;
      case 'choose': res = g.choose(pid, str(msg.choice, 32)); break;
      case 'ready': res = g.ready(pid); break;
      case 'vote': res = g.castVote(pid, str(msg.target, 64)); break;
      case 'accuse': res = g.accuse(pid, str(msg.target, 64)); break;
      case 'chat': {
        if (['talk', 'squeeze', 'vote', 'accusation'].includes(g.phase)) {
          return fail('Not while the rooms are separate. Use your whisper.');
        }
        room.say(g.players.get(pid).name, str(msg.text, 200));
        g.bump();
        break;
      }
      case 'rematch': {
        if (!isHost) return fail('That is the host’s call.');
        if (g.phase !== 'ledger') return fail('Finish this one first.');
        room.game = g.rematch();
        room.lastVersion = -1;
        room.say('THE HOUSE', 'Same table. New night. Everybody remembers the last one.', 'system');
        break;
      }
      default:
        return;
    }
  } catch (err) {
    console.error(`[standoff] ${msg.t} from ${pid} threw:`, err);
    return fail('Something went wrong in the back room. Nothing was lost.');
  }

  if (res && res.error) return fail(res.error);
  room.sync(true);
  rooms.persist();
}
