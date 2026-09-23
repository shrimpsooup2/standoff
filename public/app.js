// STANDOFF — the client.
//
// The same screens drive four ways of playing: a websocket to a Node server,
// a WebRTC channel to whoever's browser is hosting, and the engine running
// right here in the page for pass-and-play and solo. That is what lets the
// game work on static hosting with nobody home.

import { esc, money, heatPips } from './ui/util.js';
import { door, lobby, table, passCard, monday, titleCard } from './ui/screens.js';
import { seats, handDock, cardModal, dossier } from './ui/panels.js';
import { CATALOGUE, DEFAULT_CHAPTER } from './chapters/index.js';

const $ = (sel) => document.querySelector(sel);
const app = $('#app');
const rail = $('#rail');
const chrome = $('#chrome');
const dock = $('#dock');
const modal = $('#modal');

let ws = null;
let local = null;
let mode = null;                     // 'online' | 'device' | 'solo'
let peer = null;                     // a PeerHost or PeerGuest, when there is no server
let signalUrl = null;                // where browsers get introduced to each other
let signalProblem = null;            // why there is nowhere, when we can tell
let socketReady = false;
let state = null;
let qrModule = null;
let lanOrigin = null;

const isPeer = () => !!peer;
const isOnline = () => mode === 'online';
const canHost = () => socketReady || !!signalUrl;

/** What the client remembers between renders: half-made choices, open panels. */
const ui = {
  chapter: DEFAULT_CHAPTER,
  pick: {},
  handOpen: false,
  card: null,
  dossier: false,
  beatKey: null,
  sceneKey: null,
  titleUntil: 0,
};

function savedName() {
  try { return localStorage.getItem('standoff.name') ?? ''; } catch { return ''; }
}
function rememberName(name) {
  try { localStorage.setItem('standoff.name', name); } catch { /* private window */ }
}
const me = { playerId: null, token: null, code: null, name: savedName() };
let clockOffset = 0;
let stageStart = Date.now();

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

// --------------------------------------------------------------- where --

const sameOriginSignal = () => `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/signal`;

/**
 * Cross-device play needs an introduction service. A running server is its own;
 * a static host has to be pointed at one. `?signal=` overrides both.
 */
async function findSignal() {
  try {
    const override = new URL(location.href).searchParams.get('signal');
    if (override) { signalUrl = override; return; }
  } catch { /* no URL */ }
  if (signalUrl) return;
  try {
    const { SIGNAL_URL } = await import('./config.js');
    if (SIGNAL_URL) signalUrl = SIGNAL_URL;
  } catch { /* no config, no peer play */ }
  // a browser will not open a plain socket from a secure page, and it refuses quietly
  if (signalUrl && location.protocol === 'https:' && signalUrl.startsWith('ws://')) {
    signalProblem = 'The signalling address has to be wss:// on an https page. A plain ws:// socket is blocked before it is even tried.';
    signalUrl = null;
  }
}

/** A join link carries the code, so nobody has to read four letters out loud. */
function codeFromUrl() {
  let raw = '';
  try { raw = new URL(location.href).searchParams.get('r') ?? ''; } catch { /* no URL */ }
  if (!raw) raw = (location.hash ?? '').replace('#', '');
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
}

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]', '::1', '']);

function roomUrl(code) {
  try {
    const url = new URL(location.href);
    url.hash = '';
    url.search = `?r=${encodeURIComponent(code)}`;
    return url.toString();
  } catch { return code; }
}

/** The link you hand somebody else: never localhost, if we know better. */
function joinUrl(code) {
  try {
    const url = new URL(roomUrl(code));
    if (lanOrigin && LOOPBACK.has(url.hostname)) {
      const lan = new URL(lanOrigin);
      url.protocol = lan.protocol; url.hostname = lan.hostname; url.port = lan.port;
    }
    return url.toString();
  } catch { return code; }
}

function clearRoomFromUrl() {
  try {
    const url = new URL(location.href);
    url.search = ''; url.hash = '';
    history.replaceState(null, '', url.toString());
  } catch { /* not ours */ }
}

let qrCache = { text: null, markup: '' };
function qrFor(text) {
  if (qrCache.text === text) return qrCache.markup;
  if (!qrModule) return '';
  let markup = '';
  try { markup = qrModule.svg(text, { size: 188, quiet: 3, dark: '#221a10', light: '#f7efdd' }); } catch { markup = ''; }
  qrCache = { text, markup };
  return markup;
}

// ----------------------------------------------------------- sending --

// Anything done while the connection is away is kept and sent the moment it
// comes back, so a dropped signal costs you nothing but the wait.
const outbox = [];
const NEVER_QUEUE = new Set(['ping', 'create', 'join', 'resume']);
const ROOM_MESSAGES = new Set(['config', 'addBot', 'removeBot', 'start', 'skip', 'kick', 'rematch']);

function send(obj) {
  if (peer) { try { peer.send(obj); } catch { /* the channel reports itself */ } return; }
  if (mode === 'online') {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try { ws.send(JSON.stringify(obj)); return; } catch { /* fall through */ }
    }
    if (!NEVER_QUEUE.has(obj.t)) {
      outbox.push(obj);
      if (outbox.length > 40) outbox.shift();
      renderLink();
    }
    return;
  }
  if (local) {
    local.send(obj);
    if (local.error) { toast(local.error); local.error = null; }
  }
}

/** A game action, however this table is being played. */
function act(a, as = null) {
  if (!a || typeof a !== 'object') return;
  if (ROOM_MESSAGES.has(a.t)) { send({ ...a }); return; }
  if (mode === 'online') send({ t: 'act', a });
  else send({ t: 'act', a, as });
}

function drainOutbox() {
  while (outbox.length && ws && ws.readyState === WebSocket.OPEN) {
    const next = outbox.shift();
    try { ws.send(JSON.stringify(next)); } catch { outbox.unshift(next); break; }
  }
  renderLink();
}

let link = { state: 'idle', since: 0, attempts: 0 };
function setLink(s) {
  if (link.state === s) return;
  link = { ...link, state: s, since: Date.now() };
  renderLink();
}
function renderLink() {
  const el = $('#link');
  if (!el) return;
  if (mode !== 'online' || link.state === 'open') { el.className = 'link hidden'; el.textContent = ''; return; }
  const waiting = outbox.length;
  el.className = 'link';
  el.textContent = link.state === 'lost' ? `Reconnecting…${waiting ? ` ${waiting} move${waiting === 1 ? '' : 's'} waiting` : ''}` : 'Connecting…';
}

// ------------------------------------------------------------- state --

function applyState(next) {
  state = next;
  if (mode === 'online' && state.code && codeFromUrl() !== state.code) {
    try { history.replaceState(null, '', roomUrl(state.code)); } catch { /* not ours */ }
  }
  clockOffset = state.serverNow ? Date.now() - state.serverNow : 0;
  // a new beat forgets every half-made choice from the last one
  const key = `${state.phase}:${state.beat?.key ?? ''}:${state.beat?.stage ?? ''}:${state.local?.stage ?? ''}:${state.local?.seat?.id ?? ''}`;
  if (key !== ui.beatKey) {
    const keep = { name: ui.pick.name, code: ui.pick.code, localName: ui.pick.localName };
    const sameBeat = ui.beatKey && ui.beatKey.split(':')[1] === (state.beat?.key ?? '');
    ui.beatKey = key;
    if (!sameBeat) { ui.pick = keep; window.scrollTo({ top: 0, behavior: 'smooth' }); }
    ui.card = null;
    stageStart = Date.now();
  }
  const sceneKey = state.scene ? `${state.scene.nightId}:${state.scene.title}:${state.scene.day}` : null;
  if (sceneKey && sceneKey !== ui.sceneKey) {
    ui.sceneKey = sceneKey;
    ui.titleUntil = Date.now() + 2600;
  }
  render();
}

// --------------------------------------------------------- connection --

async function serverPresent() {
  if (!location.host || location.protocol === 'file:') return false;
  try {
    const res = await fetch(new URL('health', location.href), { cache: 'no-store' });
    if (!res.ok) return false;
    const body = await res.json();
    const lan = Array.isArray(body?.lan) ? body.lan[0] : null;
    if (lan) lanOrigin = `${location.protocol}//${lan}:${body.port ?? location.port}`;
    if (body?.signal) signalUrl = sameOriginSignal();
    return !!body?.ok;
  } catch { return false; }
}

let heartbeat = null;
let lastSeq = -1;

function connect() {
  let url;
  try {
    if (!location.host) return;
    url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
  } catch { return; }
  setLink(link.attempts ? 'lost' : 'connecting');
  try { ws = new WebSocket(url); } catch { scheduleReconnect(); return; }

  ws.onopen = () => {
    socketReady = true;
    link.attempts = 0;
    setLink('open');
    const saved = readSession();
    if (saved?.code && saved?.token && !saved.peer) {
      // claiming the seat has to come first, or a reload silently costs you your chair
      mode = 'online';
      send({ t: 'resume', code: saved.code, token: saved.token });
    } else if (!mode) render();
    drainOutbox();
    clearInterval(heartbeat);
    heartbeat = setInterval(() => { if (ws && ws.readyState === WebSocket.OPEN) send({ t: 'ping' }); }, 20000);
  };
  ws.onmessage = (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    handleFrame(msg);
  };
  ws.onclose = () => {
    clearInterval(heartbeat);
    socketReady = false;
    if (mode === 'online' && !peer) scheduleReconnect();
    else { setLink('idle'); if (!mode) render(); }
  };
  ws.onerror = () => { try { ws.close(); } catch { /* ignore */ } };
}

/** One frame from the table, however it arrived. */
function handleFrame(msg) {
  if (!msg || msg.t === 'pong') return;
  if (msg.t === 'welcome') {
    if (!mode) mode = 'online';
    me.playerId = msg.playerId;
    me.token = msg.token;
    me.code = msg.code;
    writeSession({ code: msg.code, token: msg.token, peer: isPeer() || undefined });
    try { history.replaceState(null, '', roomUrl(msg.code)); } catch { /* not allowed */ }
    lastSeq = -1;
  } else if (msg.t === 'state') {
    if (!isOnline()) return;
    if (typeof msg.state?.seq === 'number') {
      if (msg.state.seq < lastSeq) return;
      lastSeq = msg.state.seq;
    }
    applyState(msg.state);
  } else if (msg.t === 'error') {
    if (msg.reset || /no table/i.test(msg.msg)) {
      clearSession();
      if (!state) { mode = null; peer = null; render(); }
    }
    toast(msg.msg);
  }
}

function scheduleReconnect() {
  setLink('lost');
  link.attempts += 1;
  const base = Math.min(500 * 2 ** Math.min(link.attempts, 5), 10000);
  setTimeout(connect, base / 2 + Math.random() * (base / 2));
}

function readSession() {
  try { return JSON.parse(localStorage.getItem('standoff.session') ?? 'null'); } catch { return null; }
}
function writeSession(value) {
  try { localStorage.setItem('standoff.session', JSON.stringify(value)); } catch { /* private window */ }
}
function clearSession() {
  try { localStorage.removeItem('standoff.session'); } catch { /* private window */ }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (mode === 'online' && !peer && (!ws || ws.readyState > WebSocket.OPEN)) { link.attempts = 0; connect(); }
});
window.addEventListener('online', () => {
  if (mode === 'online' && !peer && (!ws || ws.readyState > WebSocket.OPEN)) { link.attempts = 0; connect(); }
});

async function startPeerHost(name) {
  const { PeerHost } = await import('./net/peer.js');
  mode = 'online';
  const host = new PeerHost({ signalUrl, chapter: ui.chapter, onState: (msg) => handleFrame(msg), onError: (m) => toast(m) });
  peer = host;
  setLink('connecting');
  try {
    await host.start(name);
    setLink('open');
  } catch (err) {
    peer = null; mode = null; setLink('idle');
    toast('Could not open a table: ' + (err?.message ?? 'no introduction service'));
    render();
  }
}

async function startPeerGuest(code, name) {
  const { PeerGuest } = await import('./net/peer.js');
  const guest = new PeerGuest({
    signalUrl, code,
    onState: (msg) => handleFrame(msg),
    onError: (m, reset) => { toast(m); if (reset) { clearSession(); peer = null; mode = null; render(); } },
  });
  peer = guest;
  mode = 'online';
  setLink('connecting');
  try {
    await guest.start();
    setLink('open');
    const saved = readSession();
    if (saved?.code === code && saved?.token) guest.send({ t: 'resume', code, token: saved.token });
    else guest.send({ t: 'join', code, name });
  } catch (err) {
    peer = null; mode = null; setLink('idle');
    toast(err?.message ?? 'could not reach that table');
    render();
  }
}

async function startLocal(kind) {
  const { LocalTable } = await import('./net/local.js');
  mode = kind;
  local = new LocalTable({ mode: kind, chapter: ui.chapter, onState: applyState });
  const name = (ui.pick.name ?? me.name ?? '').trim();
  if (kind === 'solo') local.send({ t: 'addLocal', name: name || 'You' });
  else if (name) local.send({ t: 'addLocal', name });
  else local.emit();
}

// -------------------------------------------------------------- clock --

function tickTimer() {
  const bar = $('#timer');
  const fill = $('#timerFill');
  if (!state || !state.deadline || state.phase !== 'playing') {
    bar.style.visibility = 'hidden';
  } else {
    bar.style.visibility = 'visible';
    const now = Date.now() - clockOffset;
    const total = Math.max(1, state.deadline - (stageStart - clockOffset));
    const left = Math.max(0, state.deadline - now);
    fill.style.width = `${Math.max(0, Math.min(1, left / total)) * 100}%`;
    fill.classList.toggle('low', left < 8000);
  }
  requestAnimationFrame(tickTimer);
}

// ------------------------------------------------------------- render --

const isDevice = () => mode === 'device';

function viewerId() {
  if (state?.you) return state.you.id;
  return me.playerId;
}

function inviteBlock() {
  if (mode !== 'online' || !state?.code) return '';
  const url = joinUrl(state.code);
  return `<div class="invite">
    <div class="invite-qr">${qrFor(url)}</div>
    <div class="invite-side">
      <span class="stamp">point a camera at it, or tell them the code</span>
      <div class="code-big">${esc(state.code)}</div>
      <p class="invite-url">${esc(url)}</p>
      <div class="row tight"><button class="ghost-btn" data-cmd="copy" data-args="{}">Copy the link</button></div>
    </div>
  </div>`;
}

function render() {
  renderChrome();
  if (!state) {
    rail.classList.add('hidden');
    dock.innerHTML = '';
    modal.innerHTML = '';
    app.innerHTML = door({
      ui, catalogue: CATALOGUE, canHost: canHost(), signalProblem,
      joinCode: mode ? null : codeFromUrl(), name: ui.pick.name ?? me.name ?? '',
    });
    return;
  }
  const ctx = {
    state, ui, me: viewerId(), local: state.local ?? null, device: isDevice(),
    shared: state.local?.stage === 'shared' || (state.local && !['private'].includes(state.local.stage) && isDevice()),
  };
  rail.classList.toggle('hidden', state.phase === 'lobby');
  rail.innerHTML = seats(state, { me: ctx.shared ? null : viewerId() });

  let body;
  if (state.phase === 'lobby') body = lobby({ ...ctx, invite: inviteBlock(), me: viewerId() });
  else if (state.phase === 'over') body = monday(ctx);
  else if (ctx.local?.stage === 'pass') body = passCard(ctx);
  else body = table(ctx);
  if (state.phase === 'playing' && Date.now() < ui.titleUntil && ctx.local?.stage !== 'pass') body = titleCard(state) + body;
  if (state.phase === 'playing' && isDevice() && ctx.local?.stage !== 'pass' && ctx.local?.stage !== 'private') {
    body += `<div class="device-bar"><span class="stamp">anybody need a private look?</span><div class="picker">${(ctx.local?.humans ?? []).map((h) => `<button class="chipbtn" data-cmd="peek" data-args='${JSON.stringify({ id: h.id })}'>${esc(h.name)}</button>`).join('')}</div></div>`;
  }
  if (state.phase === 'playing' && state.isHost && !isDevice()) {
    body += `<div class="host-bar"><button class="link-btn" data-act='${JSON.stringify({ t: 'skip' })}' title="Fill in whatever the slow ones haven’t decided, and move on">${mode === 'solo' ? 'Skip ahead' : 'Host: move things along'}</button></div>`;
  }
  app.innerHTML = body;

  const showPrivate = state.you && !ctx.shared && ctx.local?.stage !== 'pass';
  dock.innerHTML = state.phase === 'playing' && showPrivate ? handDock(state, ui) : '';
  let m = '';
  if (showPrivate && ui.card) m = cardModal(state, ui);
  else if (showPrivate && ui.dossier) m = dossier(state, ui);
  modal.innerHTML = m;
}

function renderChrome() {
  if (!state) { chrome.classList.add('hidden'); return; }
  chrome.classList.remove('hidden');
  const where = mode === 'device' ? 'ONE DEVICE' : mode === 'solo' ? 'SOLO' : state.code;
  $('#roomChip').textContent = where ?? '';
  const sc = state.scene;
  $('#phaseLabel').textContent = state.phase === 'lobby' ? 'the lobby' : state.phase === 'over' ? 'monday' : sc ? `${sc.kicker ?? ''} · ${sc.title ?? ''}` : '';
  const bag = state.bag;
  $('#bagChip').innerHTML = state.phase === 'lobby' ? '' : `<span class="bag-ico" aria-hidden="true"></span>${money(bag.total)}<small>/${money(bag.target)}</small>`;
  $('#bagChip').title = bag.milestone ? `Morty wants ${money(bag.milestone.want)} in the Bag by the end of this act` : 'The Bag';
  $('#bagChip').classList.toggle('hidden', state.phase === 'lobby');
  const env = state.families?.pots?.c;
  $('#envChip').classList.toggle('hidden', !env || state.phase === 'lobby');
  if (env) $('#envChip').innerHTML = `<span class="env-ico" aria-hidden="true"></span>${money(env.total)}`;
  $('#fileChip').innerHTML = state.phase === 'lobby' ? '' : `<span class="file-ico" aria-hidden="true"></span>${state.caseFile}`;
  $('#fileChip').classList.toggle('hidden', state.phase === 'lobby');
  $('#fileChip').classList.toggle('thick', state.caseFile >= 6);
  const shared = state.local && state.local.stage !== 'private' && isDevice();
  const you = !shared ? state.you : null;
  $('#moneyChip').textContent = you ? money(you.cash) : '';
  $('#moneyChip').classList.toggle('hidden', !you || state.phase === 'lobby');
  $('#dossierBtn').classList.toggle('hidden', !you || state.phase !== 'playing');
  $('#dossierBtn').classList.toggle('alert', !!you?.offers?.length || !!you?.jailed);
}

// ------------------------------------------------------------- events --

const COMMANDS = {
  pick({ key, value, top }) {
    if (top) ui[key] = value;
    else ui.pick[key] = value;
    render();
  },
  host() {
    const name = (ui.pick.name ?? me.name ?? '').trim();
    if (!name) return toast('They need something to call you.');
    me.name = name; rememberName(name);
    if (socketReady) { mode = 'online'; send({ t: 'create', name, chapter: ui.chapter }); }
    else if (signalUrl) startPeerHost(name);
    else toast(signalProblem ?? 'Phones can’t reach each other from here.');
  },
  join({ code } = {}) {
    const name = (ui.pick.name ?? me.name ?? '').trim();
    const c = String(code ?? ui.pick.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    if (!name) return toast('They need something to call you.');
    if (c.length !== 4) return toast('A table code is four letters.');
    me.name = name; rememberName(name);
    if (socketReady) { mode = 'online'; send({ t: 'join', code: c, name }); }
    else if (signalUrl) startPeerGuest(c, name);
    else toast(signalProblem ?? 'There’s nothing to join from here.');
  },
  forgetCode() { clearRoomFromUrl(); render(); },
  device() { const n = (ui.pick.name ?? '').trim(); if (n) rememberName(n); startLocal('device'); },
  solo() { const n = (ui.pick.name ?? '').trim(); if (n) { me.name = n; rememberName(n); } startLocal('solo'); },
  addLocal() {
    const name = (ui.pick.localName ?? '').trim();
    if (!name) return toast('Everybody needs a name.');
    send({ t: 'addLocal', name });
    ui.pick.localName = '';
    render();
  },
  removeLocal({ id }) { send({ t: 'removeLocal', id }); },
  toggleHand() { ui.handOpen = !ui.handOpen; render(); },
  card({ uid }) { ui.card = uid; render(); },
  closeCard() { ui.card = null; render(); },
  openDossier() { ui.dossier = true; render(); },
  closeDossier() { ui.dossier = false; render(); },
  take() { send({ t: 'take' }); },
  peek({ id }) { send({ t: 'peek', id }); },
  peekDone() { ui.dossier = false; send({ t: 'peekDone' }); },
  windowSeat({ id }) { send({ t: 'windowSeat', id }); },
  windowDone() { send({ t: 'windowDone' }); },
  letItStand() { send({ t: 'letItStand' }); },
  nextAll() { send({ t: 'nextAll' }); },
  async copy() {
    try { await navigator.clipboard.writeText(joinUrl(state.code)); toast('Link copied.'); } catch { toast('Copy it from the address bar.'); }
  },
  leave() {
    clearSession();
    try { ws?.close(); } catch { /* gone */ }
    try { peer?.close?.(); } catch { /* gone */ }
    try { local?.close(); } catch { /* gone */ }
    peer = null; local = null; mode = null; state = null;
    clearRoomFromUrl();
    render();
    if (location.host && location.protocol !== 'file:') setTimeout(connect, 50);
  },
};

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act], [data-cmd]');
  if (!el || el.disabled) return;
  if (el.dataset.act) {
    let a;
    try { a = JSON.parse(el.dataset.act); } catch { return; }
    if (el.dataset.fill) {
      try {
        for (const [field, key] of Object.entries(JSON.parse(el.dataset.fill))) if (ui.pick[key] != null) a[field] = ui.pick[key];
      } catch { /* nothing to fill */ }
    }
    // a card played from the big view closes it
    if (a.t === 'card' || a.t === 'sell') ui.card = null;
    act(a, el.dataset.as ?? state?.local?.seat?.id ?? null);
    return;
  }
  const cmd = COMMANDS[el.dataset.cmd];
  if (!cmd) return;
  let args = {};
  try { args = el.dataset.args ? JSON.parse(el.dataset.args) : {}; } catch { args = {}; }
  cmd(args);
});

document.addEventListener('input', (ev) => {
  const el = ev.target;
  if (el.dataset.input) {
    ui.pick[el.dataset.input] = el.value;
    if (el.dataset.input === 'code') el.value = el.value.toUpperCase();
    return;
  }
  if (el.dataset.slider) {
    const v = Number(el.value);
    ui.pick[el.dataset.slider] = v;
    const read = document.querySelector(`[data-read="${CSS.escape(el.dataset.slider)}"]`);
    if (read) read.textContent = money(v);
  }
});

document.addEventListener('change', (ev) => {
  const el = ev.target;
  if (el.dataset.toggle) { ui.pick[el.dataset.toggle] = el.checked; render(); }
});

document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && (ui.card || ui.dossier)) { ui.card = null; ui.dossier = false; render(); }
  if (ev.key === 'Enter' && ev.target.dataset?.input === 'name' && !state) {
    const code = codeFromUrl();
    if (code) COMMANDS.join({ code });
  }
});

$('#dossierBtn').addEventListener('click', () => { ui.dossier = true; render(); });

// -------------------------------------------------------------- boot --

(async function boot() {
  import('./qr.js').then((m) => { qrModule = m; if (state) render(); }).catch(() => {});
  const present = await serverPresent();
  await findSignal();
  if (present) connect();
  render();
  requestAnimationFrame(tickTimer);
  // a table on a peer host remembers you by token, the same as a server does
  const saved = readSession();
  if (!present && saved?.peer && saved.code && signalUrl && !mode) startPeerGuest(saved.code, me.name || 'Back again');
})();
