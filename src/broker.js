// The smallest thing that lets two browsers find each other.
//
// GitHub Pages serves files and nothing else, so a table hosted there has no
// server to keep a socket open. The host's own tab runs the game instead and
// the other phones reach it over WebRTC — but two browsers cannot introduce
// themselves, and that is the entire job of this file.
//
// It forwards opaque strings between one host and its guests, keyed by a room
// code. It never parses the payloads, never holds game state, and forgets a
// room the moment the host disconnects. Once a peer connection is up nothing
// else goes through here, so if this process dies mid-game nobody notices.

const ROOM_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_ROOMS = 500;
const MAX_GUESTS = 16;
const MAX_FRAME = 64 * 1024;          // an SDP offer is a few KB; this is generous
const RATE_WINDOW_MS = 2000;
const RATE_LIMIT = 80;

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const code4 = (v) => str(v, 8).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);

export class Broker {
  constructor() {
    this.rooms = new Map();           // code -> { host, guests: Map<id, socket>, at }
  }

  get size() { return this.rooms.size; }

  /** Drop rooms whose host has been gone a while. */
  sweep(now = Date.now()) {
    for (const [code, room] of this.rooms) {
      if (!room.host || now - room.at > ROOM_TTL_MS) this.rooms.delete(code);
    }
  }

  handle(socket, raw) {
    const now = Date.now();
    const meta = socket.data ?? (socket.data = {});
    if (!meta.window || now - meta.window > RATE_WINDOW_MS) { meta.window = now; meta.count = 0; }
    if (++meta.count > RATE_LIMIT) return;

    if (typeof raw === 'string' && raw.length > MAX_FRAME) return;
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (!msg || typeof msg !== 'object') return;

    const send = (obj) => { try { socket.send(obj); } catch { /* going away */ } };

    switch (msg.t) {
      case 'host': {
        const code = code4(msg.room);
        if (!code) return send({ t: 'error', msg: 'no room' });
        if (this.rooms.size >= MAX_ROOMS) this.sweep(now);
        if (this.rooms.size >= MAX_ROOMS) return send({ t: 'error', msg: 'broker full' });
        const existing = this.rooms.get(code);
        // the same host coming back after a blip keeps its guests
        if (existing && existing.host && existing.host !== socket) {
          return send({ t: 'error', msg: 'taken' });
        }
        const room = existing ?? { host: null, guests: new Map(), at: now };
        room.host = socket;
        room.at = now;
        this.rooms.set(code, room);
        meta.role = 'host';
        meta.room = code;
        return send({ t: 'hosting', room: code });
      }

      case 'guest': {
        const code = code4(msg.room);
        const room = this.rooms.get(code);
        if (!room || !room.host) return send({ t: 'error', msg: 'no table', reset: true });
        if (room.guests.size >= MAX_GUESTS) return send({ t: 'error', msg: 'full' });
        const id = crypto.randomUUID();
        room.guests.set(id, socket);
        room.at = now;
        meta.role = 'guest';
        meta.room = code;
        meta.id = id;
        send({ t: 'guesting', room: code, id });
        try { room.host.send({ t: 'arrived', id }); } catch { /* host is going */ }
        return undefined;
      }

      // Everything else is somebody's SDP or an ICE candidate. We do not look
      // inside; we only decide who it reaches.
      case 'signal': {
        const room = this.rooms.get(meta.room ?? '');
        if (!room) return undefined;
        room.at = now;
        const body = { t: 'signal', from: meta.role === 'host' ? 'host' : meta.id, data: msg.data };
        if (meta.role === 'host') {
          const guest = room.guests.get(str(msg.to, 64));
          if (guest) { try { guest.send(body); } catch { /* gone */ } }
        } else if (room.host) {
          try { room.host.send(body); } catch { /* gone */ }
        }
        return undefined;
      }

      default: return undefined;
    }
  }

  /** A socket went away. A host leaving takes the room with it. */
  drop(socket) {
    const meta = socket.data ?? {};
    const room = this.rooms.get(meta.room ?? '');
    if (!room) return;
    if (meta.role === 'host' && room.host === socket) {
      for (const guest of room.guests.values()) {
        try { guest.send({ t: 'host-gone' }); } catch { /* gone too */ }
      }
      this.rooms.delete(meta.room);
      return;
    }
    if (meta.role === 'guest' && meta.id && room.guests.get(meta.id) === socket) {
      room.guests.delete(meta.id);
      if (room.host) { try { room.host.send({ t: 'left', id: meta.id }); } catch { /* gone */ } }
    }
  }
}
