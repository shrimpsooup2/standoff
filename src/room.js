import { randomBytes, randomUUID } from 'node:crypto';
import { Game } from '../public/game/engine.js';
import { BOT_NAMES, STRATEGIES } from '../public/game/bots.js';
import { makeRng, roomCode } from '../public/game/rng.js';

const ROOM_TTL_MS = 6 * 60 * 60 * 1000;   // rooms live six hours, then the lights go off
const EMPTY_TTL_MS = 20 * 60 * 1000;
const MAX_PLAYERS = 10;
const MAX_CHAT = 60;

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
  }

  get playerCount() {
    return this.game.players.size;
  }

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
        // nobody has committed a crime yet; no reason to keep a ghost seat warm
        this.game.removePlayer(playerId);
        for (const [tok, pid] of this.tokens) if (pid === playerId) this.tokens.delete(tok);
      }
      if (this.hostId === playerId) this.reassignHost();
    }
    if (this.connectedHumans === 0) this.emptySince = Date.now();
  }

  reassignHost() {
    const next = this.game.livePlayers.find((p) => !p.bot && p.connected);
    this.hostId = next?.id ?? null;
  }

  issueToken(playerId) {
    const token = randomBytes(16).toString('hex');
    this.tokens.set(token, playerId);
    return token;
  }

  say(name, text, kind = 'chat') {
    const clean = String(text ?? '').trim().slice(0, 200);
    if (!clean) return;
    this.chat.push({ name, text: clean, kind, at: Date.now() });
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

  stateFor(playerId) {
    const view = this.game.view(playerId);
    view.hostId = this.hostId;
    view.isHost = playerId === this.hostId;
    view.chat = this.chat.slice(-30);
    view.maxPlayers = MAX_PLAYERS;
    return view;
  }

  sync(force = false) {
    if (!force && this.game.version === this.lastVersion) return;
    this.lastVersion = this.game.version;
    for (const [playerId, set] of this.sockets) {
      const payload = { t: 'state', state: this.stateFor(playerId) };
      for (const s of set) s.send(payload);
    }
  }

  expired(now = Date.now()) {
    if (now - this.createdAt > ROOM_TTL_MS) return true;
    if (this.emptySince && now - this.emptySince > EMPTY_TTL_MS) return true;
    return false;
  }
}

export class Rooms {
  constructor() {
    this.rooms = new Map();
    this.rng = makeRng(randomUUID());
  }

  create() {
    let code = roomCode(this.rng);
    let guard = 0;
    while (this.rooms.has(code) && guard++ < 50) code = roomCode(this.rng);
    const room = new Room(code);
    this.rooms.set(code, room);
    return room;
  }

  get(code) {
    return this.rooms.get(String(code ?? '').toUpperCase().trim()) ?? null;
  }

  tick() {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      if (room.expired(now)) { this.rooms.delete(code); continue; }
      const moved = room.game.tick(now);
      if (moved) room.sync(true);
      else room.sync();
    }
  }
}

/** Handle one inbound client message. Returns nothing; talks via the socket. */
export function handleMessage(rooms, socket, raw) {
  let msg;
  try { msg = JSON.parse(raw); } catch { return; }
  if (!msg || typeof msg.t !== 'string') return;

  const fail = (m) => socket.send({ t: 'error', msg: m });
  const ctx = socket.data;

  // ---- entry ------------------------------------------------------------
  if (msg.t === 'create' || msg.t === 'join' || msg.t === 'resume') {
    let room = msg.t === 'create' ? rooms.create() : rooms.get(msg.code);
    if (!room) return fail('No room by that name. Check the letters.');

    if (msg.t === 'resume' && msg.token && room.tokens.has(msg.token)) {
      const playerId = room.tokens.get(msg.token);
      if (room.game.players.has(playerId)) {
        ctx.room = room; ctx.playerId = playerId;
        room.attach(playerId, socket);
        if (!room.hostId) room.hostId = playerId;
        socket.send({ t: 'welcome', code: room.code, playerId, token: msg.token });
        room.sync(true);
        return;
      }
    }

    if (room.game.phase !== 'lobby') {
      return fail('That job already started. You can watch the next one.');
    }
    if (room.playerCount >= MAX_PLAYERS) return fail('The room only holds ten.');

    const playerId = randomUUID();
    const player = room.game.addPlayer({ id: playerId, name: msg.name });
    const token = room.issueToken(playerId);
    ctx.room = room; ctx.playerId = playerId;
    room.attach(playerId, socket);
    if (!room.hostId) room.hostId = playerId;
    room.say('THE DOOR', `${player.name} sat down.`, 'system');
    socket.send({ t: 'welcome', code: room.code, playerId, token });
    room.sync(true);
    return;
  }

  const room = ctx.room;
  const pid = ctx.playerId;
  if (!room || !pid || !room.game.players.has(pid)) return fail('You are not in a room.');
  const isHost = room.hostId === pid;
  const g = room.game;
  let res = { ok: true };

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
      res = room.removeBot(msg.id);
      break;
    case 'start':
      if (!isHost) return fail('That is the host’s call.');
      res = g.start();
      if (res.ok) room.say('THE HOUSE', 'Cards are dealt. Nobody talks about the cards.', 'system');
      break;
    case 'skip':
      if (!isHost) return fail('That is the host’s call.');
      if (g.phase === 'lobby' || g.phase === 'ledger') return fail('Nothing to skip.');
      g.deadline = null;
      g.advancePhase();
      break;
    case 'whisper': res = g.whisper(pid, msg.text); break;
    case 'card': res = g.playCard(pid, msg.card, msg.target ?? null); break;
    case 'vote': res = g.castVote(pid, msg.target); break;
    case 'pledge': res = g.pledge(pid, msg.value); break;
    case 'marker': res = g.callMarker(pid); break;
    case 'power': res = g.usePower(pid, msg.target); break;
    case 'choose': res = g.choose(pid, msg.choice); break;
    case 'ready': res = g.ready(pid); break;
    case 'accuse': res = g.accuse(pid, msg.target); break;
    case 'chat': {
      if (g.phase === 'talk' || g.phase === 'squeeze') {
        return fail('Not while the rooms are separate. Use your whisper.');
      }
      room.say(g.players.get(pid).name, msg.text);
      room.game.bump();
      break;
    }
    case 'rematch': {
      if (!isHost) return fail('That is the host’s call.');
      if (g.phase !== 'ledger') return fail('Finish this one first.');
      const fresh = g.rematch();
      // carry tokens across: same player ids, same seats
      room.game = fresh;
      room.lastVersion = -1;
      room.say('THE HOUSE', 'Same table. New night. Everybody remembers the last one.', 'system');
      break;
    }
    default:
      return fail('Unknown move.');
  }

  if (res && res.error) return fail(res.error);
  room.sync(true);
}
