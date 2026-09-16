#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { attach } from './src/net/wss.js';
import { Rooms, handleMessage } from './src/room.js';

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

function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost');
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const filePath = path.join(PUBLIC, path.normalize(rel));
  if (!filePath.startsWith(PUBLIC)) { res.writeHead(403).end('No.'); return; }

  fs.readFile(filePath, (err, body) => {
    if (err) {
      // single-page app: unknown paths get the front door
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

const rooms = new Rooms();

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.rooms.size }));
    return;
  }
  serveStatic(req, res);
});

attach(server, (socket) => {
  socket.on('message', (raw) => {
    try {
      handleMessage(rooms, socket, raw);
    } catch (err) {
      console.error('[standoff] message failed:', err);
      socket.send({ t: 'error', msg: 'Something went wrong in the back room.' });
    }
  });
  socket.on('close', () => {
    const { room, playerId } = socket.data;
    if (room && playerId) {
      room.detach(playerId, socket);
      room.sync(true);
    }
  });
});

setInterval(() => {
  try { rooms.tick(); } catch (err) { console.error('[standoff] tick failed:', err); }
}, 500);

function addresses() {
  const out = [];
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const i of ifaces ?? []) {
      if (i.family === 'IPv4' && !i.internal) out.push(i.address);
    }
  }
  return out;
}

server.listen(PORT, HOST, () => {
  const lines = [
    '',
    '  S T A N D O F F',
    '  a game about what your friendships are actually worth',
    '',
    `  table open:   http://localhost:${PORT}`,
    ...addresses().map((a) => `  same wifi:    http://${a}:${PORT}`),
    '',
    '  One person opens it, hits NEW TABLE, and reads the four letters out loud.',
    '',
  ];
  console.log(lines.join('\n'));
});
