import test from 'node:test';
import assert from 'node:assert/strict';
import { Broker } from '../src/broker.js';

/** A socket that just remembers what it was told. */
function fake() {
  const sent = [];
  return { data: {}, sent, send: (obj) => sent.push(obj), last: () => sent[sent.length - 1] };
}
const say = (broker, socket, obj) => broker.handle(socket, JSON.stringify(obj));

test('it introduces a guest to a host and then gets out of the way', () => {
  const broker = new Broker();
  const host = fake();
  const guest = fake();

  say(broker, host, { t: 'host', room: 'ab12' });
  assert.deepEqual(host.last(), { t: 'hosting', room: 'AB12' });

  say(broker, guest, { t: 'guest', room: 'AB12' });
  const id = guest.last().id;
  assert.equal(guest.sent[0].t, 'guesting');
  assert.ok(id, 'the guest was not given an id');
  assert.deepEqual(host.last(), { t: 'arrived', id });

  // an offer reaches the guest it was addressed to
  say(broker, host, { t: 'signal', to: id, data: { sdp: 'OFFER' } });
  assert.deepEqual(guest.last(), { t: 'signal', from: 'host', data: { sdp: 'OFFER' } });

  // and the answer comes back without the guest having to know who the host is
  say(broker, guest, { t: 'signal', data: { sdp: 'ANSWER' } });
  assert.deepEqual(host.last(), { t: 'signal', from: id, data: { sdp: 'ANSWER' } });
});

test('it never reads the payloads it forwards', () => {
  const broker = new Broker();
  const host = fake();
  const guest = fake();
  say(broker, host, { t: 'host', room: 'ZZZZ' });
  say(broker, guest, { t: 'guest', room: 'ZZZZ' });
  const id = guest.last().id;

  const payload = { sdp: { type: 'offer', sdp: 'v=0\r\n' }, nonsense: [1, { deep: true }] };
  say(broker, host, { t: 'signal', to: id, data: payload });
  assert.deepEqual(guest.last().data, payload);
});

test('a guest cannot signal into a room it never joined', () => {
  const broker = new Broker();
  const host = fake();
  const guest = fake();
  const stranger = fake();
  say(broker, host, { t: 'host', room: 'AAAA' });
  say(broker, guest, { t: 'guest', room: 'AAAA' });
  const before = host.sent.length;

  say(broker, stranger, { t: 'signal', data: { sdp: 'SNEAKY' } });
  assert.equal(host.sent.length, before, 'a stranger got a message through');
});

test('a host cannot take a room that is already somebody else’s', () => {
  const broker = new Broker();
  const first = fake();
  const second = fake();
  say(broker, first, { t: 'host', room: 'HHHH' });
  say(broker, second, { t: 'host', room: 'HHHH' });
  assert.equal(second.last().t, 'error');
  assert.equal(broker.rooms.get('HHHH').host, first);
});

test('a guest asking for a table nobody is hosting is told so', () => {
  const broker = new Broker();
  const guest = fake();
  say(broker, guest, { t: 'guest', room: 'NOPE' });
  assert.equal(guest.last().t, 'error');
  assert.equal(guest.last().reset, true);
});

test('the host leaving takes the room and tells the guests', () => {
  const broker = new Broker();
  const host = fake();
  const guest = fake();
  say(broker, host, { t: 'host', room: 'BYEE' });
  say(broker, guest, { t: 'guest', room: 'BYEE' });

  broker.drop(host);
  assert.equal(guest.last().t, 'host-gone');
  assert.equal(broker.size, 0);
});

test('a guest leaving is reported, and the table carries on', () => {
  const broker = new Broker();
  const host = fake();
  const a = fake();
  const b = fake();
  say(broker, host, { t: 'host', room: 'CCCC' });
  say(broker, a, { t: 'guest', room: 'CCCC' });
  const aId = a.last().id;
  say(broker, b, { t: 'guest', room: 'CCCC' });

  broker.drop(a);
  assert.deepEqual(host.last(), { t: 'left', id: aId });
  assert.equal(broker.size, 1);
  assert.equal(broker.rooms.get('CCCC').guests.size, 1);
});

test('nothing a client can send takes the broker down', () => {
  const broker = new Broker();
  const socket = fake();
  const junk = [
    '', 'null', '[]', '{', 'true', '"a string"', '{"t":"host"}', '{"t":"host","room":null}',
    '{"t":"guest","room":{"$":1}}', '{"t":"signal","to":{},"data":null}',
    `{"t":"host","room":"${'A'.repeat(5000)}"}`,
    JSON.stringify({ t: 'signal', to: 'x'.repeat(10000), data: 'y'.repeat(10000) }),
    'x'.repeat(200000),
  ];
  for (const raw of junk) {
    assert.doesNotThrow(() => broker.handle(socket, raw), `threw on ${String(raw).slice(0, 40)}`);
  }
  assert.doesNotThrow(() => broker.drop(fake()));
});

test('a flood is dropped rather than served', () => {
  const broker = new Broker();
  const host = fake();
  say(broker, host, { t: 'host', room: 'FFFF' });
  const guest = fake();
  say(broker, guest, { t: 'guest', room: 'FFFF' });
  const before = host.sent.length;
  for (let i = 0; i < 500; i++) say(broker, guest, { t: 'signal', data: { candidate: i } });
  const forwarded = host.sent.length - before;
  assert.ok(forwarded < 200, `forwarded ${forwarded} of 500`);
  assert.ok(forwarded > 0, 'forwarded nothing at all');
});

test('rooms whose host has gone are swept', () => {
  const broker = new Broker();
  const host = fake();
  say(broker, host, { t: 'host', room: 'OLDD' });
  assert.equal(broker.size, 1);
  broker.sweep(Date.now() + 7 * 60 * 60 * 1000);
  assert.equal(broker.size, 0);
});
