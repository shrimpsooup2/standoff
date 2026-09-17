import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A host on somebody's laptop, which we are going to treat badly. */
class Host {
  constructor(port, dataDir) {
    this.port = port;
    this.dataDir = dataDir;
    this.base = `http://127.0.0.1:${port}`;
  }

  async start() {
    this.proc = spawn('node', ['server.js'], {
      cwd: root,
      env: { ...process.env, PORT: String(this.port), STANDOFF_DATA: this.dataDir },
      stdio: 'ignore',
    });
    const deadline = Date.now() + 9000;
    for (;;) {
      try {
        const r = await fetch(`${this.base}/health`);
        if (r.ok) return this;
      } catch { /* still booting */ }
      if (Date.now() > deadline) throw new Error('host never came up');
      await sleep(80);
    }
  }

  /** SIGTERM, the way closing a laptop lid eventually looks. */
  async stop() {
    if (!this.proc) return;
    const ended = new Promise((r) => this.proc.once('exit', r));
    this.proc.kill('SIGTERM');
    await Promise.race([ended, sleep(4000)]);
    this.proc = null;
  }

  /** SIGKILL, the way a battery dying looks. */
  async pull() {
    if (!this.proc) return;
    const ended = new Promise((r) => this.proc.once('exit', r));
    this.proc.kill('SIGKILL');
    await Promise.race([ended, sleep(3000)]);
    this.proc = null;
  }
}

class Client {
  constructor(name, port) {
    this.name = name;
    this.port = port;
    this.state = null;
    this.welcome = null;
    this.errors = [];
    this.waiters = [];
  }

  async open() {
    this.ws = new WebSocket(`ws://127.0.0.1:${this.port}`);
    this.ws.addEventListener('message', (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.t === 'welcome') this.welcome = msg;
      if (msg.t === 'state') this.state = msg.state;
      if (msg.t === 'error') this.errors.push(msg.msg);
      if (msg.t === 'pong') this.pong = true;
      this.waiters = this.waiters.filter((w) => !w(this));
    });
    await new Promise((res, rej) => {
      this.ws.addEventListener('open', res, { once: true });
      this.ws.addEventListener('error', rej, { once: true });
    });
    return this;
  }

  send(obj) { this.ws.send(JSON.stringify(obj)); }
  raw(text) { this.ws.send(text); }

  until(pred, label = 'condition', ms = 6000) {
    if (pred(this)) return Promise.resolve(this);
    return new Promise((res, rej) => {
      const timer = setTimeout(
        () => rej(new Error(`${this.name}: timed out waiting for ${label} (phase=${this.state?.phase})`)), ms);
      this.waiters.push((c) => {
        if (!pred(c)) return false;
        clearTimeout(timer);
        res(c);
        return true;
      });
    });
  }

  close() { try { this.ws.close(); } catch { /* already gone */ } }
}

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'standoff-test-'));
}

// ---------------------------------------------------------------------------

test('a night survives the host being restarted mid-round', async (t) => {
  const port = await freePort();
  const dir = tempDir();
  const host = new Host(port, dir);
  await host.start();
  t.after(async () => { await host.stop(); fs.rmSync(dir, { recursive: true, force: true }); });

  const a = await new Client('Andre', port).open();
  const b = await new Client('Mo', port).open();
  a.send({ t: 'create', name: 'Andre' });
  await a.until((x) => x.welcome, 'welcome');
  const code = a.welcome.code;
  b.send({ t: 'join', code, name: 'Mo' });
  await b.until((x) => x.welcome, 'welcome');

  a.send({ t: 'config', rounds: 4, timers: false });
  a.send({ t: 'start' });
  await a.until((x) => x.state?.phase === 'act', 'the night to begin');
  a.send({ t: 'skip' });
  await a.until((x) => x.state?.phase === 'deal', 'a job');

  const before = {
    round: a.state.round,
    title: a.state.job.title,
    moves: a.state.job.options.map((o) => o.label).join('|'),
    card: a.state.you.role.id,
    hand: a.state.you.hand.map((c) => c.id).join('|'),
  };
  const tokenA = a.welcome.token;
  const tokenB = b.welcome.token;

  // the lid closes
  a.close(); b.close();
  await host.stop();

  // and opens again somewhere else
  await host.start();
  const a2 = await new Client('Andre again', port).open();
  a2.send({ t: 'resume', code, token: tokenA });
  await a2.until((x) => x.state?.job, 'their seat back', 8000);

  assert.equal(a2.state.round, before.round, 'the same round');
  assert.equal(a2.state.job.title, before.title, 'the same job');
  assert.equal(a2.state.job.options.map((o) => o.label).join('|'), before.moves, 'the same moves');
  assert.equal(a2.state.you.role.id, before.card, 'the same secret card');
  assert.equal(a2.state.you.hand.map((c) => c.id).join('|'), before.hand, 'the same hand');

  const b2 = await new Client('Mo again', port).open();
  b2.send({ t: 'resume', code, token: tokenB });
  await b2.until((x) => x.state?.job, 'their seat back');
  assert.equal(b2.state.you.name, 'Mo');

  a2.close(); b2.close();
});

test('a night survives the power being pulled, losing at most a moment', async (t) => {
  const port = await freePort();
  const dir = tempDir();
  const host = new Host(port, dir);
  await host.start();
  t.after(async () => { await host.stop(); fs.rmSync(dir, { recursive: true, force: true }); });

  const a = await new Client('Andre', port).open();
  a.send({ t: 'create', name: 'Andre' });
  await a.until((x) => x.welcome);
  const code = a.welcome.code;
  const token = a.welcome.token;
  a.send({ t: 'addBot' });
  a.send({ t: 'config', rounds: 4, timers: false });
  await a.until((x) => x.state?.players.length === 2, 'a ghost to sit down');
  a.send({ t: 'start' });
  await a.until((x) => x.state?.phase === 'act', 'the night to begin');
  await sleep(500);   // let the debounced save land

  a.close();
  await host.pull();          // no warning, no shutdown hook
  await host.start();

  const again = await new Client('Andre again', port).open();
  again.send({ t: 'resume', code, token });
  await again.until((x) => x.state?.you, 'their seat back', 8000);
  assert.ok(['act', 'deal'].includes(again.state.phase), `expected to be mid-night, got ${again.state.phase}`);
  assert.equal(again.state.players.length, 2, 'the ghost is still there');
  again.close();
});

test('the table keeps running when the host walks out', async (t) => {
  const port = await freePort();
  const dir = tempDir();
  const host = new Host(port, dir);
  await host.start();
  t.after(async () => { await host.stop(); fs.rmSync(dir, { recursive: true, force: true }); });

  const a = await new Client('Andre', port).open();
  a.send({ t: 'create', name: 'Andre' });
  await a.until((x) => x.welcome);
  const code = a.welcome.code;

  const b = await new Client('Mo', port).open();
  const c = await new Client('Kit', port).open();
  b.send({ t: 'join', code, name: 'Mo' });
  c.send({ t: 'join', code, name: 'Kit' });
  await Promise.all([b.until((x) => x.welcome), c.until((x) => x.welcome)]);
  await Promise.all([
    a.until((x) => x.state?.players.length === 3, 'everybody seated'),
    b.until((x) => x.state?.players.length === 3, 'everybody seated'),
    c.until((x) => x.state?.players.length === 3, 'everybody seated'),
  ]);

  assert.equal(a.state.isHost, true, 'whoever opened it starts as host');
  assert.equal(b.state.isHost, false);

  a.close();   // the host's laptop closes
  await b.until((x) => x.state.isHost || c.state.isHost, 'somebody to pick up the controls');
  const newHost = b.state.isHost ? b : c;
  assert.ok(newHost.state.isHost, 'the table has a host again');

  // and the new host can actually run it
  newHost.send({ t: 'config', rounds: 4, timers: false });
  newHost.send({ t: 'start' });
  await newHost.until((x) => x.state.phase === 'act', 'the new host can deal');
  b.close(); c.close();
});

test('nothing a client can send takes the host down', async (t) => {
  const port = await freePort();
  const dir = tempDir();
  const host = new Host(port, dir);
  await host.start();
  t.after(async () => { await host.stop(); fs.rmSync(dir, { recursive: true, force: true }); });

  const a = await new Client('Andre', port).open();
  a.send({ t: 'create', name: 'Andre' });
  await a.until((x) => x.welcome);

  const nonsense = [
    'not json at all',
    '{"t":',
    '[]', 'null', '"just a string"', '123',
    JSON.stringify({ t: 'choose' }),
    JSON.stringify({ t: 'choose', choice: { nested: true } }),
    JSON.stringify({ t: 'chat', text: 'x'.repeat(50000) }),
    JSON.stringify({ t: 'join', code: { not: 'a code' } }),
    JSON.stringify({ t: 'whisper', text: null }),
    JSON.stringify({ t: 'card', card: '../../etc/passwd' }),
    JSON.stringify({ t: 'config', rounds: Number.NaN }),
    JSON.stringify({ t: 'config', rounds: 1e9 }),
    JSON.stringify({ t: 'accuse', target: 'nobody' }),
    JSON.stringify({ t: '__proto__' }),
    JSON.stringify({ t: 'constructor' }),
    JSON.stringify({ t: 'start', extra: 'x'.repeat(1000) }),
  ];
  for (const bad of nonsense) a.raw(bad);

  // deeply nested object, the classic parser killer
  let deep = { t: 'chat', text: 'x' };
  for (let i = 0; i < 200; i++) deep = { t: 'chat', nested: deep };
  a.raw(JSON.stringify(deep));

  await sleep(400);
  const health = await fetch(`${host.base}/health`);
  assert.equal(health.status, 200, 'the host is still serving');
  assert.equal((await health.json()).ok, true);

  // and it still works normally afterwards
  a.send({ t: 'ping' });
  await a.until((x) => x.pong, 'a pong');
  a.close();
});

test('a client that floods gets throttled, not disconnected', async (t) => {
  const port = await freePort();
  const dir = tempDir();
  const host = new Host(port, dir);
  await host.start();
  t.after(async () => { await host.stop(); fs.rmSync(dir, { recursive: true, force: true }); });

  const a = await new Client('Andre', port).open();
  a.send({ t: 'create', name: 'Andre' });
  await a.until((x) => x.welcome);
  for (let i = 0; i < 300; i++) a.send({ t: 'ping' });
  await sleep(400);

  assert.ok(a.errors.some((e) => /slow down/i.test(e)), 'they are told to slow down');
  assert.equal(a.ws.readyState, WebSocket.OPEN, 'but not thrown out');
  const health = await fetch(`${host.base}/health`);
  assert.equal(health.status, 200);
  a.close();
});

test('the same person on two devices sees the same table', async (t) => {
  const port = await freePort();
  const dir = tempDir();
  const host = new Host(port, dir);
  await host.start();
  t.after(async () => { await host.stop(); fs.rmSync(dir, { recursive: true, force: true }); });

  const phone = await new Client('phone', port).open();
  phone.send({ t: 'create', name: 'Andre' });
  await phone.until((x) => x.welcome);
  const { code, token } = phone.welcome;

  const laptop = await new Client('laptop', port).open();
  laptop.send({ t: 'resume', code, token });
  await laptop.until((x) => x.state?.you, 'the same seat');

  assert.equal(laptop.state.you.id, phone.state.you.id, 'one seat, two screens');
  phone.send({ t: 'addBot' });
  await laptop.until((x) => x.state.players.length === 2, 'both screens update');
  assert.equal(phone.state.players.length, 2);

  // closing one device must not vacate the seat
  phone.close();
  await sleep(300);
  laptop.send({ t: 'ping' });
  await laptop.until((x) => x.pong, 'still connected');
  assert.equal(laptop.state.players.length, 2);
  laptop.close();
});

test('a table that nobody can reach is not a table that breaks', async (t) => {
  const port = await freePort();
  const dir = tempDir();
  const host = new Host(port, dir);
  await host.start();
  t.after(async () => { await host.stop(); fs.rmSync(dir, { recursive: true, force: true }); });

  const a = await new Client('Andre', port).open();
  a.send({ t: 'resume', code: 'ZZZZ', token: 'nonsense' });
  await a.until((x) => x.errors.length > 0, 'a refusal');
  assert.match(a.errors[0], /No table/i);

  a.send({ t: 'join', code: 'ZZZZ', name: 'Andre' });
  await a.until((x) => x.errors.length > 1, 'another refusal');

  const health = await fetch(`${host.base}/health`);
  assert.equal((await health.json()).ok, true);
  a.close();
});

test('the host reports whether it can actually save', async (t) => {
  const port = await freePort();
  const dir = tempDir();
  const host = new Host(port, dir);
  await host.start();
  t.after(async () => { await host.stop(); fs.rmSync(dir, { recursive: true, force: true }); });

  const body = await (await fetch(`${host.base}/health`)).json();
  assert.equal(body.ok, true);
  assert.equal(body.saving, true, 'it says it is saving');
  assert.equal(typeof body.rooms, 'number');
  assert.equal(typeof body.uptime, 'number');
});

test('reloading the page in the lobby keeps your seat and your name', async (t) => {
  const port = await freePort();
  const host = await new Host(port, tempDir()).start();
  t.after(() => host.stop());

  const andre = await new Client('Andre', port).open();
  andre.send({ t: 'create', name: 'Andre' });
  await andre.until((c) => c.welcome, 'welcome');
  const code = andre.welcome.code;

  const mo = await new Client('Mo', port).open();
  mo.send({ t: 'join', code, name: 'Mo' });
  await mo.until((c) => c.welcome, 'welcome');
  const token = mo.welcome.token;

  // a reload: the socket goes, and a new one comes back with the same token
  mo.close();
  await sleep(300);

  const again = await new Client('Mo', port).open();
  again.send({ t: 'resume', code, token });
  await again.until((c) => c.welcome, 'resumed');

  assert.equal(again.welcome.token, token, 'they were handed a different seat');
  assert.equal(again.errors.length, 0);
  await again.until((c) => c.state, 'state');
  const names = again.state.players.map((p) => p.name).sort();
  assert.deepEqual(names, ['Andre', 'Mo'], `roster came back as ${names.join(', ')}`);
  assert.ok(again.state.players.every((p) => p.name), 'somebody came back without a name');
});

test('a seat that has really gone is refused, not quietly replaced', async (t) => {
  const port = await freePort();
  const host = await new Host(port, tempDir()).start();
  t.after(() => host.stop());

  const andre = await new Client('Andre', port).open();
  andre.send({ t: 'create', name: 'Andre' });
  await andre.until((c) => c.welcome, 'welcome');
  const code = andre.welcome.code;

  const ghost = await new Client('Nobody', port).open();
  ghost.send({ t: 'resume', code, token: 'a'.repeat(48) });
  await ghost.until((c) => c.errors.length, 'a refusal');

  assert.match(ghost.errors[0], /seat is gone/i);
  assert.equal(ghost.welcome, null, 'an unknown token was handed a seat anyway');

  // and the table is still just the one person, not one person and a blank
  await andre.until((c) => c.state, 'state');
  assert.equal(andre.state.players.length, 1, 'a nameless player was seated');
});

test('joining without a name is refused rather than seating a blank', async (t) => {
  const port = await freePort();
  const host = await new Host(port, tempDir()).start();
  t.after(() => host.stop());

  const andre = await new Client('Andre', port).open();
  andre.send({ t: 'create', name: 'Andre' });
  await andre.until((c) => c.welcome, 'welcome');
  const code = andre.welcome.code;

  const blank = await new Client('Blank', port).open();
  blank.send({ t: 'join', code, name: '   ' });
  await blank.until((c) => c.errors.length, 'a refusal');
  assert.equal(blank.welcome, null);
  assert.equal(andre.state.players.length, 1);
});
