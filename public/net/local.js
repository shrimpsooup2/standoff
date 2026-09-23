// Playing without a server.
//
// The whole engine is plain ES modules, so the browser can run the game by
// itself. That gives two offline modes and makes the game work on static
// hosting (GitHub Pages), where there is nobody to keep a socket open:
//
//   ONE DEVICE — everybody plays on the same phone or laptop. Anything the
//                whole table may see is shown to the room. Anything private —
//                a vote before it's counted, a clue, a choice in the Room —
//                hands the device around, with a "pass to <name>" card in
//                between so nobody reads anybody else's.
//   SOLO       — you against the ghosts.

import { Game } from '../engine/game.js';

const TICK_MS = 250;
let seq = 0;
const nextId = () => `local-${Date.now().toString(36)}-${++seq}`;

export class LocalTable {
  constructor({ mode = 'device', chapter, onState }) {
    this.mode = mode;                 // 'device' | 'solo'
    this.chapter = chapter;
    this.onState = onState;
    this.game = this.fresh();
    this.revealed = null;             // the seat that has taken the device
    this.peek = null;                 // somebody looking at their own dossier
    this.windowSeat = null;           // somebody who has something for the dice
    this.lastVersion = -1;
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  fresh() {
    const g = new Game({ code: this.mode === 'solo' ? 'SOLO' : 'TABLE', chapter: this.chapter, seed: `${Date.now()}-${Math.random()}` });
    // nobody is racing a clock at a kitchen table
    g.setConfig({ clock: false });
    return g;
  }

  close() { clearInterval(this.timer); }

  get humans() { return this.game.players.filter((p) => !p.bot); }

  tick() {
    const g = this.game;
    if (g.phase !== 'playing') return;
    g.tick(Date.now());
    if (g.version !== this.lastVersion) this.emit();
  }

  /** Who the device belongs to right now, and whether it has to be passed first. */
  seat() {
    const g = this.game;
    if (this.mode === 'solo') return { stage: 'private', id: this.humans[0]?.id ?? null };
    if (g.phase !== 'playing') return { stage: 'public', id: null };
    if (this.peek && g.hasPlayer(this.peek)) return { stage: this.revealed === this.peek ? 'private' : 'pass', id: this.peek, peek: true };
    const b = g.s.beat;
    if (b?.window) {
      const able = g.windowPending(b.window);
      if (this.windowSeat && able.includes(this.windowSeat)) return { stage: this.revealed === this.windowSeat ? 'private' : 'pass', id: this.windowSeat, window: true };
      this.windowSeat = null;
      return { stage: 'window', id: null, able };
    }
    if (b?.stage === 'fallout') return { stage: 'public', id: null, fallout: true };
    const waiting = g.awaiting();
    const priv = waiting.find((w) => w.private);
    if (priv) return { stage: this.revealed === priv.id ? 'private' : 'pass', id: priv.id };
    if (waiting.length) return { stage: 'shared', id: waiting[0].id };
    return { stage: 'public', id: null };
  }

  emit() {
    const g = this.game;
    this.lastVersion = g.version;
    const seat = this.seat();
    const viewer = seat.stage === 'private' || seat.stage === 'shared' ? seat.id : null;
    const state = g.view(viewer ?? undefined);
    state.isHost = true;
    state.local = {
      mode: this.mode,
      stage: seat.stage,
      seat: seat.id ? { id: seat.id, name: g.name(seat.id) } : null,
      peek: !!seat.peek,
      window: !!seat.window,
      able: (seat.able ?? []).map((id) => ({ id, name: g.name(id) })),
      fallout: !!seat.fallout,
      humans: this.humans.map((p) => ({ id: p.id, name: p.name })),
    };
    state.chat = [];
    this.onState(state);
  }

  /** Who a move from the device is on behalf of. */
  actor(msg) {
    const seat = this.seat();
    if (this.mode === 'solo') return this.humans[0]?.id ?? null;
    if (seat.stage === 'private' || seat.stage === 'shared') return seat.id;
    return msg.as && this.game.hasPlayer(msg.as) ? msg.as : null;
  }

  send(msg) {
    const g = this.game;
    this.error = null;
    const report = (res) => { if (res?.error) this.error = res.error; };
    switch (msg.t) {
      case 'addLocal': {
        const name = String(msg.name ?? '').slice(0, 18).trim();
        if (!name) { this.error = 'Everybody needs a name.'; break; }
        if (g.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) { this.error = 'Somebody already has that name.'; break; }
        const p = g.addPlayer({ id: nextId(), name });
        if (!p) this.error = 'The room only holds ten.';
        else g.setConnected(p.id, true);
        break;
      }
      case 'removeLocal': g.removePlayer(msg.id); break;
      case 'addBot': report(g.addBot()); break;
      case 'removeBot': { const p = g.getPlayer(msg.id); if (p?.bot) g.removePlayer(p.id); break; }
      case 'config': report(g.setConfig(msg)); break;
      case 'start': {
        if (this.mode === 'solo') while (g.players.length < 4) g.addBot();
        report(g.start());
        g.settle(3);
        break;
      }
      case 'skip': report(g.skip()); break;
      case 'take': this.revealed = this.seat().id; break;
      case 'peek': if (g.hasPlayer(msg.id)) { this.peek = msg.id; this.revealed = null; } break;
      case 'peekDone': this.peek = null; this.revealed = null; break;
      case 'windowSeat': if (g.hasPlayer(msg.id)) { this.windowSeat = msg.id; this.revealed = null; } break;
      case 'windowDone': this.windowSeat = null; this.revealed = null; break;
      case 'letItStand': {
        // everybody at the table passes on the dice at once
        for (const p of this.humans) g.passWindow(p.id);
        g.pump();
        break;
      }
      case 'nextAll': {
        for (const p of this.humans) g.act(p.id, { t: 'next' });
        break;
      }
      case 'act': {
        const pid = this.actor(msg);
        if (!pid) { this.error = 'Whose move is that?'; break; }
        const res = g.act(pid, msg.a ?? {}, { isHost: true });
        report(res);
        // whoever had the device is done once they're no longer waited on
        if (this.windowSeat && !g.s.beat?.window) this.windowSeat = null;
        break;
      }
      case 'rematch': {
        if (g.phase !== 'over') break;
        const next = g.rematch();
        next.setConfig({ clock: false });
        for (const p of next.players) if (!p.bot) next.setConnected(p.id, true);
        this.game = next;
        this.revealed = null; this.peek = null; this.windowSeat = null;
        break;
      }
      default: break;
    }
    // the device moves on as soon as its holder has nothing left to do
    const seat = this.seat();
    if (this.revealed && seat.id !== this.revealed) this.revealed = null;
    this.emit();
  }
}
