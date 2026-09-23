import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';

import net from 'node:net';
import { autoAction } from './autoplay.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/** Ask the OS for a free port instead of guessing and colliding. */
async function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

const PORT = await freePort();
const URL_BASE = `http://127.0.0.1:${PORT}`;

/** A scripted player: opens a socket, remembers the last state it was sent. */
class Client {
  constructor(name) {
    this.name = name;
    this.state = null;
    this.welcome = null;
    this.errors = [];
    this.waiters = [];
  }

  async open() {
    this.ws = new WebSocket(`ws://127.0.0.1:${PORT}`);
    this.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.t === 'welcome') this.welcome = msg;
      if (msg.t === 'state') this.state = msg.state;
      if (msg.t === 'error') this.errors.push(msg.msg);
      this.waiters = this.waiters.filter((w) => !w(this));
    });
    await new Promise((res, rej) => {
      this.ws.addEventListener('open', res, { once: true });
      this.ws.addEventListener('error', rej, { once: true });
    });
    return this;
  }

  send(obj) { this.ws.send(JSON.stringify(obj)); }

  /** Resolve once `pred(client)` holds. */
  until(pred, label = 'condition', ms = 5000) {
    if (pred(this)) return Promise.resolve(this);
    return new Promise((res, rej) => {
      const timer = setTimeout(() => rej(new Error(`${this.name}: timed out waiting for ${label} (phase=${this.state?.phase})`)), ms);
      this.waiters.push((c) => {
        if (!pred(c)) return false;
        clearTimeout(timer);
        res(c);
        return true;
      });
    });
  }

  phase(p) { return this.until((c) => c.state?.phase === p, `phase ${p}`); }
  /** Skip title cards, events and anything else that only needs a nudge. */
  async skipTo(phase, others = [], max = 12) {
    for (let i = 0; i < max; i++) {
      if (this.state?.phase === phase) return this;
      this.send({ t: 'skip' });
      await new Promise((r) => setTimeout(r, 160));
      for (const o of others) { /* let everyone catch up */ void o; }
    }
    await this.phase(phase);
    return this;
  }
  close() { this.ws.close(); }
}

let server;

test.before(async () => {
  server = spawn('node', ['server.js'], { cwd: root, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  const deadline = Date.now() + 8000;
  for (;;) {
    try {
      const r = await fetch(`${URL_BASE}/health`);
      if (r.ok) break;
    } catch { /* not up yet */ }
    if (Date.now() > deadline) throw new Error('server never came up');
    await new Promise((r) => setTimeout(r, 120));
  }
});

test.after(() => { server?.kill(); });

test('the page and its assets are served', async () => {
  for (const [p, needle] of [['/', 'STANDOFF'], ['/style.css', '--felt'], ['/app.js', 'WebSocket']]) {
    const r = await fetch(URL_BASE + p);
    assert.equal(r.status, 200, `${p} should be served`);
    assert.ok((await r.text()).includes(needle), `${p} should contain ${needle}`);
  }
});

/** Everybody does whatever their own screen asks of them until Monday. */
async function playOut(clients, ms = 90000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (clients.every((c) => c.state?.phase === 'over')) return;
    for (const c of clients) {
      const a = autoAction(c.state);
      if (a) c.send({ t: 'act', a });
    }
    await new Promise((r) => setTimeout(r, 60));
  }
  throw new Error(`the week never ended (stuck at ${clients[0].state?.beat?.id} ${clients[0].state?.beat?.stage})`);
}

test('three friends play a whole week through real sockets', async () => {
  const [host, b, c] = await Promise.all([
    new Client('Andre').open(), new Client('Mo').open(), new Client('Kit').open(),
  ]);

  host.send({ t: 'create', name: 'Andre' });
  await host.until((x) => x.welcome, 'welcome');
  const code = host.welcome.code;
  assert.match(code, /^[A-Z0-9]{4}$/);

  b.send({ t: 'join', code, name: 'Mo' });
  c.send({ t: 'join', code, name: 'Kit' });
  await Promise.all([b.until((x) => x.welcome), c.until((x) => x.welcome)]);
  await host.until((x) => x.state?.players.length === 3, 'three at the table');
  assert.equal(host.state.isHost, true);
  assert.equal(b.state.isHost, false);
  assert.equal(host.state.chapter.number, 1, 'Chapter 1 is on the table');

  // only the host can deal
  b.send({ t: 'start' });
  await b.until((x) => x.errors.length > 0, 'a refusal');
  assert.match(b.errors[0], /host/i);

  host.send({ t: 'config', length: 'short', clock: false });
  await host.until((x) => x.state.config.length === 'short' && x.state.config.clock === false, 'settings');

  host.send({ t: 'start' });
  const all = [host, b, c];
  await Promise.all(all.map((x) => x.until((y) => y.state?.phase === 'playing', 'the week to begin')));
  for (const x of all) {
    assert.ok(x.state.you.job, 'everybody gets a job');
    assert.ok(x.state.you.secret, 'and a secret');
    assert.equal(x.state.you.cards.length, 2, 'and two cards');
    for (const p of x.state.players) if (!p.isYou) assert.equal(p.cash, null, 'nobody sees anybody else’s cash');
  }
  const secrets = all.map((x) => x.state.you.secret.name);
  for (const x of all) {
    const seen = JSON.stringify(x.state.players);
    for (const other of secrets) if (other !== x.state.you.secret.name) assert.ok(!seen.includes(other), 'secrets stay secret');
  }

  await playOut(all);
  const E = host.state.end;
  assert.equal(E.table.length, 3);
  assert.equal(typeof E.salWalks, 'boolean');
  for (const r of E.table) {
    assert.ok(r.epilogue.length > 20, 'everybody gets an epilogue');
    assert.ok(r.secret, 'every secret turns over');
  }
  assert.ok(E.verdict?.dice?.length === 2, 'the verdict was rolled');
  assert.ok(E.story.length >= 3, 'the Courier kept the week');

  all.forEach((x) => x.close());
});

test('a dropped player can walk back in with their token', async () => {
  const host = await new Client('Host').open();
  host.send({ t: 'create', name: 'Host' });
  await host.until((x) => x.welcome);
  const code = host.welcome.code;

  const friend = await new Client('Friend').open();
  friend.send({ t: 'join', code, name: 'Friend' });
  await friend.until((x) => x.welcome);
  const token = friend.welcome.token;

  host.send({ t: 'config', clock: false });
  host.send({ t: 'start' });
  await friend.until((x) => x.state?.phase === 'playing', 'the week');
  const job = friend.state.you.job.id;

  friend.close();
  await new Promise((r) => setTimeout(r, 200));

  const again = await new Client('Friend again').open();
  again.send({ t: 'resume', code, token });
  await again.until((x) => x.state?.you, 'their seat back');
  assert.equal(again.state.you.name, 'Friend');
  assert.equal(again.state.you.job.id, job, 'and the job they walked out on');

  host.close(); again.close();
});

test('the door is closed once the cards are dealt', async () => {
  const host = await new Client('Host2').open();
  host.send({ t: 'create', name: 'Host2' });
  await host.until((x) => x.welcome);
  const code = host.welcome.code;
  const pal = await new Client('Pal').open();
  pal.send({ t: 'join', code, name: 'Pal' });
  await pal.until((x) => x.welcome);

  host.send({ t: 'start' });
  await host.until((x) => x.state?.phase === 'playing', 'the week');

  const latecomer = await new Client('Late').open();
  latecomer.send({ t: 'join', code, name: 'Late' });
  await latecomer.until((x) => x.errors.length > 0, 'a closed door');
  assert.match(latecomer.errors[0], /already started/i);

  const wrongRoom = await new Client('Lost').open();
  wrongRoom.send({ t: 'join', code: 'ZZZZ', name: 'Lost' });
  await wrongRoom.until((x) => x.errors.length > 0, 'no such room');
  assert.match(wrongRoom.errors[0], /No table/i);

  [host, pal, latecomer, wrongRoom].forEach((x) => x.close());
});

test('the health probe hands the page an address a phone can reach', async () => {
  const r = await fetch(URL_BASE + '/health');
  const body = await r.json();
  assert.ok(Array.isArray(body.lan), 'no lan addresses reported');
  assert.equal(typeof body.port, 'number');
  for (const address of body.lan) {
    assert.ok(!/^(127\.|localhost)/.test(address), `${address} is not reachable from another device`);
    assert.match(address, /^\d+\.\d+\.\d+\.\d+$/);
  }
});

test('the client has no function that calls only itself', async () => {
  // rememberName() used to call rememberName(), so nobody's name was ever
  // saved and the try/catch around it swallowed the stack overflow silently.
  const src = await fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const bodies = src.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g);
  for (const [, name, body] of bodies) {
    const calls = [...body.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1]);
    if (!calls.includes(name)) continue;
    // a real recursive function does something other than call itself
    const other = calls.filter((c) => c !== name && !['if', 'for', 'while', 'switch', 'catch', 'return'].includes(c));
    assert.ok(other.length > 0, `${name}() only ever calls itself`);
  }
});
