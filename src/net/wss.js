// A small RFC 6455 server. No dependencies, because installing a package to
// play a card game with four friends is its own kind of betrayal.

import { createHash, randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_MESSAGE = 1 << 20; // 1 MiB is generous for a game about saying nothing

export class Socket extends EventEmitter {
  constructor(raw) {
    super();
    this.id = randomUUID();
    this.raw = raw;
    this.open = true;
    this.buffer = Buffer.alloc(0);
    this.fragments = [];
    this.fragmentOpcode = null;
    this.isAlive = true;
    this.data = {};

    raw.on('data', (chunk) => this.onData(chunk));
    raw.on('close', () => this.destroy());
    raw.on('error', () => this.destroy());
    raw.setTimeout(0);
    raw.setNoDelay(true);
  }

  onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const frame = decodeFrame(this.buffer);
      if (!frame) break;
      this.buffer = this.buffer.subarray(frame.size);
      this.handleFrame(frame);
    }
  }

  handleFrame(frame) {
    const { opcode, fin, payload } = frame;
    switch (opcode) {
      case 0x0: // continuation
        this.fragments.push(payload);
        if (fin) this.finishFragments();
        break;
      case 0x1: // text
      case 0x2: // binary
        if (fin) {
          this.emitMessage(opcode, payload);
        } else {
          this.fragmentOpcode = opcode;
          this.fragments = [payload];
        }
        break;
      case 0x8: // close
        this.close();
        break;
      case 0x9: // ping
        this.sendFrame(0xA, payload);
        break;
      case 0xA: // pong
        this.isAlive = true;
        break;
      default:
        this.close();
    }
  }

  finishFragments() {
    const payload = Buffer.concat(this.fragments);
    const opcode = this.fragmentOpcode ?? 0x1;
    this.fragments = [];
    this.fragmentOpcode = null;
    this.emitMessage(opcode, payload);
  }

  emitMessage(opcode, payload) {
    if (payload.length > MAX_MESSAGE) { this.close(); return; }
    if (opcode === 0x1) this.emit('message', payload.toString('utf8'));
    else this.emit('binary', payload);
  }

  sendFrame(opcode, payload = Buffer.alloc(0)) {
    if (!this.open) return;
    const len = payload.length;
    let header;
    if (len < 126) {
      header = Buffer.alloc(2);
      header[1] = len;
    } else if (len < 65536) {
      header = Buffer.alloc(4);
      header[1] = 126;
      header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }
    header[0] = 0x80 | opcode;
    try {
      this.raw.write(Buffer.concat([header, payload]));
    } catch {
      this.destroy();
    }
  }

  send(obj) {
    const text = typeof obj === 'string' ? obj : JSON.stringify(obj);
    this.sendFrame(0x1, Buffer.from(text, 'utf8'));
  }

  ping() {
    this.isAlive = false;
    this.sendFrame(0x9);
  }

  close() {
    if (!this.open) return;
    this.sendFrame(0x8);
    this.destroy();
  }

  destroy() {
    if (!this.open) return;
    this.open = false;
    try { this.raw.end(); } catch { /* already gone */ }
    try { this.raw.destroy(); } catch { /* already gone */ }
    this.emit('close');
  }
}

function decodeFrame(buf) {
  if (buf.length < 2) return null;
  const b0 = buf[0];
  const b1 = buf[1];
  const fin = (b0 & 0x80) !== 0;
  const opcode = b0 & 0x0f;
  const masked = (b1 & 0x80) !== 0;
  let len = b1 & 0x7f;
  let offset = 2;

  if (len === 126) {
    if (buf.length < offset + 2) return null;
    len = buf.readUInt16BE(offset);
    offset += 2;
  } else if (len === 127) {
    if (buf.length < offset + 8) return null;
    const big = buf.readBigUInt64BE(offset);
    if (big > BigInt(MAX_MESSAGE)) return { size: buf.length, opcode: 0x8, fin: true, payload: Buffer.alloc(0) };
    len = Number(big);
    offset += 8;
  }

  let maskKey = null;
  if (masked) {
    if (buf.length < offset + 4) return null;
    maskKey = buf.subarray(offset, offset + 4);
    offset += 4;
  }

  if (buf.length < offset + len) return null;
  const payload = Buffer.from(buf.subarray(offset, offset + len));
  if (maskKey) {
    for (let i = 0; i < payload.length; i++) payload[i] ^= maskKey[i % 4];
  }
  return { fin, opcode, payload, size: offset + len };
}

export function acceptKey(key) {
  return createHash('sha1').update(key + GUID).digest('base64');
}

/**
 * Attach to a node http server. Calls `onConnection(socket, request)`.
 * Pings every 25s and reaps anything that stops answering.
 */
export function attach(server, onConnection) {
  const sockets = new Set();

  server.on('upgrade', (req, socket) => {
    const key = req.headers['sec-websocket-key'];
    const upgrade = String(req.headers.upgrade ?? '').toLowerCase();
    if (upgrade !== 'websocket' || !key) {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      return;
    }
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${acceptKey(key)}\r\n\r\n`,
    );
    const ws = new Socket(socket);
    sockets.add(ws);
    ws.on('close', () => sockets.delete(ws));
    onConnection(ws, req);
  });

  const heartbeat = setInterval(() => {
    for (const ws of sockets) {
      if (!ws.isAlive) { ws.destroy(); continue; }
      ws.ping();
    }
  }, 25000);
  heartbeat.unref?.();

  return { sockets, stop: () => clearInterval(heartbeat) };
}
