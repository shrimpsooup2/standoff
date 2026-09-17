#!/usr/bin/env node
//
// The host is somebody's laptop. It will be slept, unplugged, moved to another
// room, and asked to survive a wifi change mid-round. Everything here is built
// on the assumption that the outside world is unreliable and the game is not
// allowed to care.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { attach } from './src/net/wss.js';
import { Rooms, handleMessage } from './src/room.js';
import { Store, fallbackDir } from './src/persist.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

// ---------------------------------------------------------------- storage ---

function openStore() {
  const primary = new Store();
  try {
    fs.mkdirSync(primary.dir, { recursive: true });
    fs.accessSync(primary.dir, fs.constants.W_OK);
    return primary;
  } catch {
    // the working directory is not ours to write in; keep the night in temp
    const store = new Store({ dir: fallbackDir() });
    console.warn(`[standoff] saving to ${store.dir} instead of the project folder`);
    return store;
  }
}

const store = openStore();
const rooms = new Rooms({ store });
const restored = rooms.restore();

// ----------------------------------------------------------------- static ---

function serveStatic(req, res) {
  let rel;
  try {
    rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end('Bad request');
    return;
  }
  if (rel === '/' || rel === '') rel = '/index.html';
  const filePath = path.join(PUBLIC, path.normalize(rel));
  if (!filePath.startsWith(PUBLIC)) { res.writeHead(403).end('No.'); return; }

  fs.readFile(filePath, (err, body) => {
    if (err) {
      // unknown paths get the front door, so a refresh anywhere still works
      fs.readFile(path.join(PUBLIC, 'index.html'), (e2, html) => {
        if (e2) { res.writeHead(404).end('Not found'); return; }
        res.writeHead(200, { 'content-type': MIME['.html'] }).end(html);
      });
      return;
    }
    const type = MIME[path.extname(filePath)] ?? 'application/octet-stream';
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-cache' }).end(body);
  });
}

const server = http.createServer((req, res) => {
  try {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify({
        ok: true,
        rooms: rooms.rooms.size,
        players: [...rooms.rooms.values()].reduce((n, r) => n + r.connectedHumans, 0),
        saving: store.writable,
        uptime: Math.round(process.uptime()),
        // The host usually opens this on localhost, and a QR saying "localhost"
        // sends every phone in the room precisely nowhere. Hand the page an
        // address that other machines can actually reach.
        lan: addresses(),
        port: PORT,
      }));
      return;
    }
    serveStatic(req, res);
  } catch (err) {
    console.error('[standoff] request failed:', err);
    try { res.writeHead(500).end('Something went wrong'); } catch { /* already sent */ }
  }
});

// a socket that stalls mid-handshake must not hold a connection forever
server.headersTimeout = 20000;
server.requestTimeout = 30000;
server.keepAliveTimeout = 65000;
server.on('clientError', (err, socket) => {
  if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

attach(server, (socket) => {
  socket.on('message', (raw) => {
    try {
      handleMessage(rooms, socket, raw);
    } catch (err) {
      console.error('[standoff] message failed:', err);
      try { socket.send({ t: 'error', msg: 'Something went wrong in the back room.' }); } catch { /* gone */ }
    }
  });
  socket.on('close', () => {
    try {
      const { room, playerId } = socket.data;
      if (room && playerId) {
        room.detach(playerId, socket);
        room.sync(true);
        rooms.persist();
      }
    } catch (err) {
      console.error('[standoff] cleanup failed:', err);
    }
  });
});

const clock = setInterval(() => {
  try { rooms.tick(); } catch (err) { console.error('[standoff] the clock threw:', err); }
}, 500);

// ------------------------------------------------------------ not dying ---

// A bug in one table is not a reason to end everybody else's night. Log it,
// keep serving. Anything genuinely fatal will still take the process down.
process.on('uncaughtException', (err) => {
  console.error('[standoff] uncaught:', err);
  rooms.persist({ immediate: true });
});
process.on('unhandledRejection', (err) => {
  console.error('[standoff] unhandled rejection:', err);
});

let leaving = false;
function shutdown(signal) {
  if (leaving) return;
  leaving = true;
  console.log(`\n[standoff] ${signal} — saving the table.`);
  clearInterval(clock);
  try { store.flushSync(() => rooms.snapshot()); } catch { /* best effort */ }
  server.close(() => process.exit(0));
  // do not wait on a socket that will not close
  setTimeout(() => process.exit(0), 2000).unref();
}
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => shutdown(sig));

// ------------------------------------------------------------- listening ---

function addresses() {
  const out = [];
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const i of ifaces ?? []) {
      if (i.family === 'IPv4' && !i.internal) out.push(i.address);
    }
  }
  return out;
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  Port ${PORT} is already busy.`);
    console.error(`  Something else is using it — try:  PORT=${PORT + 1} npm start\n`);
    process.exit(1);
  }
  console.error('[standoff] server error:', err);
});

server.listen(PORT, HOST, () => {
  const lan = addresses();
  console.log([
    '',
    '  S T A N D O F F',
    '  a game about what your friendships are actually worth',
    '',
    `  on this machine:  http://localhost:${PORT}`,
    ...lan.map((a) => `  same wifi:        http://${a}:${PORT}`),
    '',
    restored
      ? `  ${restored} table${restored === 1 ? '' : 's'} picked up where they left off.`
      : '  One person hits NEW TABLE. Everybody else points a camera at the QR code.',
    store.writable ? '' : '  (not saving to disk — a restart will lose the night)',
    '',
  ].filter((l) => l !== '').join('\n') + '\n');
});
