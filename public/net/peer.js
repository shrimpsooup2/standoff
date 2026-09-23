// Playing across devices with nobody running a server.
//
// On GitHub Pages there is no process to keep a socket open, so the tab that
// created the table becomes the table: it runs the same Room and the same
// handleMessage the Node host runs, and the other phones reach it over a
// WebRTC data channel. A broker introduces them and is then out of the way —
// game traffic never touches it, so it can fall over mid-game without anybody
// at the table noticing.
//
// Both sides speak the protocol app.js already speaks. A "socket" here is
// anything with a send(), which is exactly what Room expects.

import { Rooms, handleMessage } from './room.js';

const ICE = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
];

// Peers on the same wifi connect on their local addresses alone. Across
// networks they need STUN, and behind a symmetric NAT they would need TURN,
// which needs an account — so that case reports a clean failure rather than
// hanging forever on a connection that is never coming.
const CONNECT_TIMEOUT_MS = 20000;
const TICK_MS = 250;

const json = (v) => JSON.stringify(v);

/**
 * Candidates start arriving the moment the other side has a local description,
 * which is usually before we have set a remote one. addIceCandidate rejects
 * until then, and a dropped candidate is often the difference between a
 * connection and a twenty second wait for nothing. So hold them until there is
 * somewhere to put them.
 */
function candidateQueue(pc) {
  const waiting = [];
  return {
    async add(candidate) {
      if (!pc.remoteDescription) { waiting.push(candidate); return; }
      try { await pc.addIceCandidate(candidate); } catch { /* stale, or already known */ }
    },
    async flush() {
      const queued = waiting.splice(0);
      for (const c of queued) {
        try { await pc.addIceCandidate(c); } catch { /* stale, or already known */ }
      }
    },
  };
}

/** A data channel dressed up as the socket Room expects. */
function channelSocket(channel, data = {}) {
  return {
    data,
    send(obj) {
      if (channel.readyState !== 'open') return;
      try { channel.send(json(obj)); } catch { /* closing */ }
    },
    close() { try { channel.close(); } catch { /* already gone */ } },
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Open the signalling socket, with patience.
 *
 * The obvious place to put this service is a free tier, and a free tier sleeps.
 * The first connection after an idle spell fails outright while the thing wakes
 * up, which would otherwise turn into "the button does nothing" for whoever is
 * unlucky enough to start the evening.
 */
async function openSignal(url, onMessage, onClose, onWaking) {
  let lastError = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt === 1) onWaking?.();
    try {
      return await new Promise((res, rej) => {
        const ws = new WebSocket(url);
        const fail = (err) => rej(err);
        ws.addEventListener('error', () => fail(new Error('cannot reach the introduction service')), { once: true });
        ws.addEventListener('open', () => {
          ws.addEventListener('message', (ev) => {
            let msg;
            try { msg = JSON.parse(ev.data); } catch { return; }
            onMessage(msg);
          });
          ws.addEventListener('close', () => onClose?.());
          res({
            ws,
            send(obj) { try { ws.send(json(obj)); } catch { /* not open */ } },
            close() { try { ws.close(); } catch { /* already */ } },
          });
        }, { once: true });
      });
    } catch (err) {
      lastError = err;
      await sleep(1200 * (attempt + 1));       // give it a chance to wake
    }
  }
  throw lastError ?? new Error('cannot reach the introduction service');
}

/* ------------------------------------------------------------------ host -- */

/**
 * The tab that owns the game. It holds the Room, answers every guest that turns
 * up at the broker, and drives the clock.
 */
export class PeerHost {
  constructor({ signalUrl, chapter, onState, onError }) {
    this.signalUrl = signalUrl;
    this.onState = onState;
    this.onError = onError;
    this.rooms = new Rooms({ store: null });
    this.room = this.rooms.create({ chapter });
    this.peers = new Map();            // guest id -> { pc, channel, socket }
    this.hostSocket = { data: {}, send: (obj) => this.receive(obj) };
    this.closed = false;
  }

  get code() { return this.room.code; }

  async start(name) {
    this.signal = await openSignal(
      this.signalUrl,
      (m) => this.onSignal(m),
      () => {
        // losing the broker only costs us new arrivals; the tables already
        // connected keep playing, so this is a warning and not an ending
        if (!this.closed) this.onError?.('lost the introduction service \u2014 people already here are fine');
      },
      () => this.onError?.('waking the introduction service, one moment'),
    );
    this.signal.send({ t: 'host', room: this.room.code });

    // seat the host themselves, through the same door everybody else uses
    handleMessage(this.rooms, this.hostSocket, json({ t: 'join', code: this.room.code, name }));
    this.timer = setInterval(() => {
      try { this.rooms.tick(); } catch { /* one bad tick must not stop the table */ }
    }, TICK_MS);
    return this.room.code;
  }

  /** Messages the host's own UI sends, handled without going near the network. */
  send(obj) {
    handleMessage(this.rooms, this.hostSocket, json(obj));
  }

  receive(obj) {
    if (obj?.t === 'state' || obj?.t === 'welcome' || obj?.t === 'error') this.onState?.(obj);
  }

  onSignal(msg) {
    if (msg.t === 'arrived') return this.greet(msg.id);
    if (msg.t === 'signal' && msg.from && msg.data) return this.negotiate(msg.from, msg.data);
    // The broker telling us a guest left means their *signalling* socket went,
    // and every guest closes that on purpose once the data channel is up. It
    // says nothing about the connection we actually play over, so it only
    // cleans up a peer that never finished connecting.
    if (msg.t === 'left') return this.giveUpOn(msg.id);
    if (msg.t === 'error') return this.onError?.(msg.msg);
    return undefined;
  }

  /** A guest turned up. Offer them a channel. */
  async greet(id) {
    if (this.peers.has(id)) return;
    const pc = new RTCPeerConnection({ iceServers: ICE });
    const channel = pc.createDataChannel('standoff', { ordered: true });
    const entry = { pc, channel, socket: null, ice: candidateQueue(pc) };
    this.peers.set(id, entry);

    pc.onicecandidate = (ev) => {
      if (ev.candidate) this.signal.send({ t: 'signal', to: id, data: { candidate: ev.candidate } });
    };
    pc.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) this.hangUp(id);
    };

    channel.onopen = () => {
      entry.socket = channelSocket(channel, {});
      // from here it is an ordinary player at an ordinary table
      channel.onmessage = (ev) => {
        try { handleMessage(this.rooms, entry.socket, ev.data); } catch { /* bad frame */ }
      };
    };
    channel.onclose = () => this.hangUp(id);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.signal.send({ t: 'signal', to: id, data: { sdp: pc.localDescription } });
  }

  async negotiate(id, data) {
    const entry = this.peers.get(id);
    if (!entry) return;
    try {
      if (data.sdp) {
        await entry.pc.setRemoteDescription(data.sdp);
        await entry.ice.flush();
      } else if (data.candidate) {
        await entry.ice.add(data.candidate);
      }
    } catch { /* a candidate that arrives too late is not worth a crash */ }
  }

  /** Drop a peer that never got as far as an open channel. */
  giveUpOn(id) {
    const entry = this.peers.get(id);
    if (!entry) return;
    if (entry.channel?.readyState === 'open') return;   // they are in; this was just the introduction ending
    this.hangUp(id);
  }

  hangUp(id) {
    const entry = this.peers.get(id);
    if (!entry) return;
    this.peers.delete(id);
    const socketData = entry.socket?.data;
    try { entry.pc.close(); } catch { /* already */ }
    if (socketData?.room && socketData?.playerId) {
      socketData.room.detach(socketData.playerId, entry.socket);
      socketData.room.sync(true);
    }
  }

  close() {
    this.closed = true;
    clearInterval(this.timer);
    for (const id of [...this.peers.keys()]) this.hangUp(id);
    this.signal?.close();
  }
}

/* ----------------------------------------------------------------- guest -- */

/** A phone joining somebody else's tab. */
export class PeerGuest {
  constructor({ signalUrl, code, onState, onError }) {
    this.signalUrl = signalUrl;
    this.code = code;
    this.onState = onState;
    this.onError = onError;
    this.outbox = [];
  }

  async start() {
    this.pc = new RTCPeerConnection({ iceServers: ICE });
    this.ice = candidateQueue(this.pc);
    this.pc.onicecandidate = (ev) => {
      if (ev.candidate) this.signal.send({ t: 'signal', data: { candidate: ev.candidate } });
    };

    const open = new Promise((res, rej) => {
      const timer = setTimeout(
        () => rej(new Error('could not reach the table — you may be on a different network')),
        CONNECT_TIMEOUT_MS,
      );
      this.pc.ondatachannel = (ev) => {
        this.channel = ev.channel;
        this.channel.onmessage = (m) => {
          let msg;
          try { msg = JSON.parse(m.data); } catch { return; }
          this.onState?.(msg);
        };
        this.channel.onclose = () => this.onError?.('the table closed');
        this.channel.onopen = () => { clearTimeout(timer); this.drain(); res(); };
        if (this.channel.readyState === 'open') { clearTimeout(timer); this.drain(); res(); }
      };
    });

    this.signal = await openSignal(
      this.signalUrl,
      (m) => this.onSignal(m),
      null,
      () => this.onError?.('waking the introduction service, one moment'),
    );
    this.signal.send({ t: 'guest', room: this.code });
    await open;
    // The channel is up, but candidates can still be trickling and a better
    // route may yet be found. Give that a moment before hanging up on the
    // broker — after this the two of them are on their own.
    setTimeout(() => this.signal.close(), 5000);
  }

  async onSignal(msg) {
    if (msg.t === 'error') return this.onError?.(msg.msg, msg.reset);
    if (msg.t === 'host-gone') return this.onError?.('whoever was running the table closed it');
    if (msg.t !== 'signal' || !msg.data) return undefined;
    try {
      if (msg.data.sdp) {
        await this.pc.setRemoteDescription(msg.data.sdp);
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.signal.send({ t: 'signal', data: { sdp: this.pc.localDescription } });
        await this.ice.flush();
      } else if (msg.data.candidate) {
        await this.ice.add(msg.data.candidate);
      }
    } catch { /* a stale candidate is not fatal */ }
    return undefined;
  }

  send(obj) {
    if (this.channel?.readyState === 'open') {
      try { this.channel.send(json(obj)); return; } catch { /* fall through */ }
    }
    this.outbox.push(obj);
    if (this.outbox.length > 40) this.outbox.shift();
  }

  drain() {
    const queued = this.outbox.splice(0);
    for (const obj of queued) this.send(obj);
  }

  close() {
    try { this.channel?.close(); } catch { /* already */ }
    try { this.pc?.close(); } catch { /* already */ }
    this.signal?.close();
  }
}
