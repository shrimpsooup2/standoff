// One device passed around a table, and one person against the ghosts —
// driven the way the screens drive them.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LocalTable } from '../public/net/local.js';
import { autoAction } from './autoplay.js';

/** Do what the screen in front of the device would let you do next. */
function tapScreen(table, state) {
  const l = state.local;
  if (state.phase !== 'playing') return false;
  if (l.stage === 'pass') { table.send({ t: 'take' }); return true; }
  if (l.stage === 'window') { table.send({ t: 'letItStand' }); return true; }
  if (l.stage === 'public') {
    if (state.beat?.stage === 'fallout' || state.beat?.engine === 'story') { table.send({ t: 'nextAll' }); return true; }
    return false;
  }
  const a = autoAction(state);
  if (a) { table.send({ t: 'act', a }); return true; }
  return false;
}

async function playLocal(mode, names, { bots = 0, length = 'short' } = {}) {
  let last = null;
  const seen = { pass: 0, private: 0, shared: 0, window: 0, leaks: [] };
  const table = new LocalTable({ mode, onState: (s) => { last = s; } });
  try {
    for (const n of names) table.send({ t: 'addLocal', name: n });
    for (let i = 0; i < bots; i++) table.send({ t: 'addBot' });
    table.send({ t: 'config', length });
    table.send({ t: 'start' });
    const end = Date.now() + 120000;
    while (last.phase !== 'over' && Date.now() < end) {
      const l = last.local;
      seen[l.stage] = (seen[l.stage] ?? 0) + 1;
      // nobody's private screen shows while the device is being handed over
      if (mode === 'device' && l.stage === 'pass' && last.you) seen.leaks.push(last.beat?.id);
      const moved = tapScreen(table, last);
      if (!moved) await new Promise((r) => setTimeout(r, 30));
      else await new Promise((r) => setImmediate(r));
    }
    return { state: last, seen, table };
  } finally {
    table.close();
  }
}

test('three people pass one device through a whole short week', async () => {
  const { state, seen } = await playLocal('device', ['Andre', 'Mo', 'Kit'], { bots: 1 });
  assert.equal(state.phase, 'over');
  assert.equal(state.end.table.length, 4);
  assert.ok(seen.pass > 5, 'the device changed hands');
  assert.ok(seen.private > 5, 'people looked at their own screens');
  assert.deepEqual(seen.leaks, [], 'nothing private shows while the device is being passed');
});

test('one device can carry a Families week, both sides of the river', async () => {
  const { state, seen } = await playLocal('device', ['Andre', 'Mo', 'Kit', 'Lou'], { bots: 4 });
  assert.equal(state.phase, 'over');
  assert.ok(state.end.families, 'eight at the table splits into two families');
  assert.deepEqual(seen.leaks, []);
});

test('solo plays through with the ghosts filling the table', async () => {
  const { state } = await playLocal('solo', ['Andre']);
  assert.equal(state.phase, 'over');
  assert.ok(state.players.length >= 4, 'solo fills the table to four');
  assert.ok(state.end.table.some((r) => r.name === 'Andre'));
});

test('a private look can be asked for, and handed back', async () => {
  let last = null;
  const table = new LocalTable({ mode: 'device', onState: (s) => { last = s; } });
  try {
    table.send({ t: 'addLocal', name: 'Andre' });
    table.send({ t: 'addLocal', name: 'Mo' });
    table.send({ t: 'config', length: 'short' });
    table.send({ t: 'start' });
    const mo = last.players.find((p) => p.name === 'Mo');
    table.send({ t: 'peek', id: mo.id });
    assert.equal(last.local.stage, 'pass');
    assert.equal(last.you, undefined, 'nothing shows until Mo takes it');
    table.send({ t: 'take' });
    assert.equal(last.local.stage, 'private');
    assert.equal(last.you.name, 'Mo');
    assert.ok(last.you.secret, 'Mo can read his own secret');
    table.send({ t: 'peekDone' });
    assert.notEqual(last.local.peek, true);
  } finally {
    table.close();
  }
});

test('the same names cannot sit down twice, and blanks are refused', () => {
  const table = new LocalTable({ mode: 'device', onState: () => {} });
  try {
    table.send({ t: 'addLocal', name: 'Andre' });
    table.send({ t: 'addLocal', name: 'andre' });
    assert.match(table.error ?? '', /already/);
    table.send({ t: 'addLocal', name: '   ' });
    assert.match(table.error ?? '', /name/);
    assert.equal(table.game.players.length, 1);
  } finally {
    table.close();
  }
});
