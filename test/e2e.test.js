import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import net from 'node:net';

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
  for (const [p, needle] of [['/', 'STANDOFF'], ['/style.css', '--blood'], ['/app.js', 'WebSocket']]) {
    const r = await fetch(URL_BASE + p);
    assert.equal(r.status, 200, `${p} should be served`);
    assert.ok((await r.text()).includes(needle), `${p} should contain ${needle}`);
  }
});

test('three friends play a whole night through real sockets', async () => {
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

  // only the host can deal
  b.send({ t: 'start' });
  await b.until((x) => x.errors.length > 0, 'a refusal');
  assert.match(b.errors[0], /host/i);

  host.send({ t: 'config', rounds: 3, timers: false });
  await host.until((x) => x.state.config.rounds === 3 && x.state.config.timers === false, 'settings');

  host.send({ t: 'start' });
  const all = [host, b, c];
  await Promise.all(all.map((x) => x.phase('act')));
  assert.ok(host.state.act.title, 'the night opens on an act card');
  await host.skipTo('deal');
  await Promise.all(all.map((x) => x.phase('deal')));
  for (const x of all) assert.ok(x.state.you.role, 'everybody gets a card');
  for (const x of all) {
    for (const p of x.state.players) assert.equal(p.role, undefined, 'cards stay face down');
  }

  for (let round = 1; round <= 3; round++) {
    await host.skipTo('deal');
    await Promise.all(all.map((x) => x.phase('deal')));
    assert.equal(host.state.round, round);
    for (const x of all) assert.ok(x.state.job.setup.length > 0, 'everybody gets a job');

    host.send({ t: 'skip' });
    const talked = host.state.twist.id !== 'notalk';
    if (talked) {
      await Promise.all(all.map((x) => x.phase('talk')));
      b.send({ t: 'whisper', text: 'We are solid. You know we are solid.' });
      b.send({ t: 'pledge', value: true });
      await b.until((x) => x.state.job.pledgedByYou, 'the pledge registers');
      host.send({ t: 'skip' });
    }

    await Promise.all(all.map((x) => x.phase('squeeze')));
    // every job offers its own moves; the first is always the loyal one and the
    // last is always the worst one, whatever this particular room calls them
    const loyal = (x) => x.state.job.options[0].id;
    const worst = (x) => x.state.job.options[x.state.job.options.length - 1].id;
    assert.ok(host.state.job.options.length >= 2, 'a job should offer something to choose between');
    host.send({ t: 'choose', choice: loyal(host) });
    b.send({ t: 'choose', choice: round === 2 ? worst(b) : loyal(b) });
    c.send({ t: 'choose', choice: worst(c) });

    await Promise.all(all.map((x) => x.phase('reckoning')));
    for (const x of all) {
      const mine = x.state.reckoning.find((g) => g.yours);
      assert.ok(mine, `${x.name} should see their own job`);
      assert.ok(mine.narration.length > 30, 'the reckoning is narrated');
    }
    for (const x of all) x.send({ t: 'ready' });
    if (round < 3) {
      await host.until((y) => y.state.phase !== 'reckoning', 'the round to turn over');
      // an event or a new act may sit between jobs
      for (let i = 0; i < 8 && host.state.phase !== 'deal'; i++) {
        const was = host.state.phase;
        if (was === 'vote') {
          for (const x of all) x.send({ t: 'vote', target: x.state.players.find((p) => !p.isYou).id });
        } else {
          host.send({ t: 'skip' });
        }
        try { await host.until((x) => x.state.phase !== was, `${was} to move on`, 1500); } catch { /* try again */ }
      }
      await Promise.all(all.map((x) => x.until((y) => y.state.round === round + 1, 'next round')));
    }
  }

  // nudge forward one phase at a time, waiting for each move to land, so a
  // skip can never overshoot the phase we are trying to reach
  for (let i = 0; i < 8 && host.state.phase !== 'accusation'; i++) {
    const was = host.state.phase;
    host.send({ t: 'skip' });
    try { await host.until((x) => x.state.phase !== was, `${was} to move on`, 1500); } catch { /* try again */ }
  }
  await Promise.all(all.map((x) => x.phase('accusation')));
  for (const x of all) {
    const target = x.state.players.find((p) => !p.isYou);
    x.send({ t: 'accuse', target: target.id });
  }

  await Promise.all(all.map((x) => x.phase('ledger')));
  const L = host.state.ledger;
  assert.equal(L.standings.length, 3);
  assert.ok(L.rat, 'the rat is named at the end');
  assert.ok(L.bonds.length >= 1, 'bonds are drawn');
  for (const s of L.standings) assert.ok(s.role, 'every card turns over');
  assert.equal(L.history.length, 3);

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

  host.send({ t: 'config', rounds: 3, timers: false });
  host.send({ t: 'start' });
  await host.skipTo('deal');

  friend.close();
  await new Promise((r) => setTimeout(r, 200));

  const again = await new Client('Friend again').open();
  again.send({ t: 'resume', code, token });
  await again.until((x) => x.state?.you, 'their seat back');
  assert.equal(again.state.you.name, 'Friend');
  assert.ok(again.state.job, 'and the job they walked out on');

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
  await host.skipTo('deal');

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
