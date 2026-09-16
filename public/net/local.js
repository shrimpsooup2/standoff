// Playing without a server.
//
// The whole engine is plain ES modules, so the browser can run the game by
// itself. That gives two offline modes and makes the game work on static
// hosting (GitHub Pages), where there is nobody to keep a socket open:
//
//   ONE DEVICE — everybody plays on the same phone or laptop. Public phases
//                are shown to the room; private ones hand the device around
//                with a "pass to <name>" card in between so nobody reads
//                anybody else's whisper.
//   SOLO       — you against the ghosts.

import { Game } from '../game/engine.js';
import { BOT_NAMES, STRATEGIES } from '../game/bots.js';
import { makeRng } from '../game/rng.js';

const PRIVATE_PHASES = new Set(['talk', 'squeeze', 'vote', 'accusation']);

let seq = 0;
const nextId = () => `local-${++seq}`;

export class LocalTable {
  constructor({ mode = 'device', onState }) {
    this.mode = mode;                 // 'device' | 'solo'
    this.onState = onState;
    this.rng = makeRng(String(Date.now()) + Math.random());
    this.game = new Game({ code: mode === 'solo' ? 'SOLO' : 'TABLE', config: { timers: false } });
    this.seatIndex = 0;
    this.passing = false;
    this.lastPhase = null;
  }

  get humans() {
    return this.game.livePlayers.filter((p) => !p.bot);
  }

  get seat() {
    return this.humans[this.seatIndex] ?? null;
  }

  get isPrivate() {
    return PRIVATE_PHASES.has(this.game.phase);
  }

  /** Solo play never needs a hand-off card; there is only one pair of eyes. */
  get needsPassing() {
    return this.mode === 'device' && this.humans.length > 1;
  }

  emit() {
    const g = this.game;
    const seatId = this.isPrivate && !this.passing ? this.seat?.id ?? null : null;
    const soloId = this.mode === 'solo' ? this.humans[0]?.id ?? null : null;
    const viewer = this.mode === 'solo' ? soloId : seatId;
    const state = g.view(viewer ?? undefined);

    state.isHost = true;
    state.local = {
      mode: this.mode,
      passing: this.isPrivate && this.passing && this.needsPassing,
      seatName: this.seat?.name ?? null,
      seatIndex: this.seatIndex,
      seatCount: this.humans.length,
      roster: this.game.livePlayers.map((p) => ({ id: p.id, name: p.name, bot: p.bot })),
    };
    state.chat = [];
    state.maxPlayers = 10;

    // On a shared screen the reckoning belongs to the room, so hand over the
    // per-player breakdown that an online player would only see for themselves.
    if (g.phase === 'reckoning' && state.reckoning) {
      for (const row of state.reckoning) {
        const grp = g.groups.find((x) => x.id === row.id);
        if (!grp) continue;
        row.allLines = grp.memberIds.map((pid) => ({
          name: g.players.get(pid)?.name ?? '?',
          lines: grp.result?.perPlayer[pid]?.lines ?? [],
        }));
      }
    }
    this.onState(state);
  }

  /** Entering a private phase starts the hand-around from the top. */
  syncSeats() {
    if (this.game.phase !== this.lastPhase) {
      this.lastPhase = this.game.phase;
      this.seatIndex = 0;
      this.passing = this.isPrivate && this.needsPassing;
    }
  }

  advanceSeat() {
    if (this.seatIndex + 1 < this.humans.length) {
      this.seatIndex += 1;
      this.passing = this.needsPassing;
    } else {
      this.seatIndex = 0;
      this.passing = false;
      this.game.advancePhase();
      this.syncSeats();
    }
  }

  addBot() {
    const used = new Set(this.game.livePlayers.map((p) => p.name));
    const name = BOT_NAMES.find((n) => !used.has(n)) ?? `Ghost ${this.game.players.size + 1}`;
    this.game.addPlayer({
      id: nextId(), name, bot: true, strategy: this.rng.pick(STRATEGIES).id,
    });
  }

  send(msg) {
    const g = this.game;
    const seat = this.mode === 'solo' ? this.humans[0] : this.seat;
    const pid = seat?.id;

    switch (msg.t) {
      case 'addLocal': {
        if (g.phase !== 'lobby') break;
        if (g.players.size >= 10) break;
        g.addPlayer({ id: nextId(), name: msg.name });
        break;
      }
      case 'removeLocal': {
        if (g.phase !== 'lobby') break;
        g.removePlayer(msg.id);
        break;
      }
      case 'addBot': this.addBot(); break;
      case 'removeBot': g.removePlayer(msg.id); break;
      case 'config': g.setConfig(msg); break;
      case 'start': {
        if (this.mode === 'solo') while (g.players.size < 4) this.addBot();
        const res = g.start();
        if (res?.error) { this.error = res.error; break; }
        this.lastPhase = null;
        this.syncSeats();
        break;
      }
      case 'seatTake': this.passing = false; break;
      case 'seatDone': this.advanceSeat(); break;
      case 'skip': {
        if (g.phase === 'lobby' || g.phase === 'ledger') break;
        g.advancePhase();
        this.syncSeats();
        break;
      }
      case 'whisper': if (pid) g.whisper(pid, msg.text); break;
      case 'pledge': if (pid) g.pledge(pid, msg.value); break;
      case 'card': if (pid) { const r = g.playCard(pid, msg.card, msg.target ?? null); if (r?.error) this.error = r.error; } break;
      case 'marker': if (pid) { const r = g.callMarker(pid); if (r?.error) this.error = r.error; } break;
      case 'power': if (pid) g.usePower(pid, msg.target); break;
      case 'choose': {
        if (!pid) break;
        g.choose(pid, msg.choice);
        // in solo the ghosts have already moved, so the round may be over
        if (g.phase === 'squeeze') this.advanceSeat();
        else this.syncSeats();
        break;
      }
      case 'ready': {
        g.advancePhase();
        this.syncSeats();
        break;
      }
      case 'vote': {
        if (!pid) break;
        g.castVote(pid, msg.target);
        if (g.phase === 'vote') this.advanceSeat();
        else this.syncSeats();
        break;
      }
      case 'accuse': {
        if (!pid) break;
        g.accuse(pid, msg.target);
        if (g.phase === 'accusation') this.advanceSeat();
        else this.syncSeats();
        break;
      }
      case 'rematch': {
        if (g.phase !== 'ledger') break;
        this.game = g.rematch();
        this.lastPhase = null;
        this.seatIndex = 0;
        this.passing = false;
        break;
      }
      default: break;
    }

    this.syncSeats();
    this.emit();
  }
}
