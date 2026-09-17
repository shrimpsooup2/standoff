// STANDOFF — client.
//
// The same UI drives three transports: a websocket to a Node server, or the
// engine running here in the page for pass-and-play and solo. That is what
// lets this work on static hosting with nobody home.

const $ = (sel) => document.querySelector(sel);
const app = $('#app');
const rail = $('#rail');
const chrome = $('#chrome');

let ws = null;
let local = null;
let mode = null;                     // 'online' | 'device' | 'solo'
let peer = null;                     // a PeerHost or PeerGuest, when there is no server
let signalUrl = null;                // where browsers get introduced to each other
let signalProblem = null;            // why there is nowhere, when we can tell

const isPeer = () => !!peer;
const isOnline = () => mode === 'online';

/** Can this page put a table together at all? A server, or a way to find peers. */
const canHost = () => socketReady || !!signalUrl;

const sameOriginSignal = () =>
  `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/signal`;

/**
 * Cross-device play needs an introduction service. A running server is its own;
 * a static host has to be pointed at one. `?signal=` overrides both, which is
 * how you try somebody else's without editing a file.
 */
async function findSignal() {
  try {
    const override = new URL(location.href).searchParams.get('signal');
    if (override) { signalUrl = override; return; }
  } catch { /* no URL */ }
  if (signalUrl) return;                       // the health probe already found one
  try {
    const { SIGNAL_URL } = await import('./config.js');
    if (SIGNAL_URL) signalUrl = SIGNAL_URL;
  } catch { /* no config, no peer play */ }

  // A browser will not open a plain socket from a secure page. It refuses
  // quietly, which turns the single most likely setup mistake into ten minutes
  // of wondering why nothing happens.
  if (signalUrl && location.protocol === 'https:' && signalUrl.startsWith('ws://')) {
    signalProblem = 'The signalling address has to be wss:// on an https page. '
      + 'A plain ws:// socket is blocked before it is even tried.';
    signalUrl = null;
  }
}
let socketReady = false;
let state = null;
/**
 * A join link carries the code, so nobody has to read four letters out loud and
 * nobody has to type them. `?r=` is the one we write; `#CODE` still works
 * because links get shared and pasted long after anybody remembers which.
 */
function codeFromUrl() {
  let raw = '';
  try { raw = new URL(location.href).searchParams.get('r') ?? ''; } catch { /* no URL */ }
  if (!raw) raw = (location.hash ?? '').replace('#', '');
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
}

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]', '::1', '']);

/** Where other people's phones should point. Set from the health probe. */
let lanOrigin = null;

/** This room, on this device's own address. What belongs in the address bar. */
function roomUrl(code) {
  try {
    const url = new URL(location.href);
    url.hash = '';
    url.search = `?r=${encodeURIComponent(code)}`;
    return url.toString();
  } catch {
    return code;
  }
}

/**
 * The link you hand somebody else.
 *
 * The host almost always has this page open on localhost, and a QR code that
 * says localhost is a QR code that works on exactly one device. When the server
 * has told us an address other machines can reach, share that one instead.
 */
function joinUrl(code) {
  try {
    const url = new URL(roomUrl(code));
    if (lanOrigin && LOOPBACK.has(url.hostname)) {
      const lan = new URL(lanOrigin);
      url.protocol = lan.protocol;
      url.hostname = lan.hostname;
      url.port = lan.port;
    }
    return url.toString();
  } catch {
    return code;
  }
}

/** Take the room out of the address bar without reloading the page. */
function clearRoomFromUrl() {
  try {
    const url = new URL(location.href);
    url.search = '';
    url.hash = '';
    history.replaceState(null, '', url.toString());
  } catch { /* history is not always ours to write */ }
}

let qrCache = { text: null, markup: '' };

/** The join link as a QR, drawn once and kept until the link changes. */
function qrFor(text) {
  if (qrCache.text === text) return qrCache.markup;
  if (!qrModule) return '';
  let markup = '';
  try {
    markup = qrModule.svg(text, { size: 188, quiet: 3, dark: '#221a10', light: '#f7efdd' });
  } catch { markup = ''; }
  qrCache = { text, markup };
  return markup;
}

let qrModule = null;

function savedName() {
  try { return localStorage.getItem('standoff.name') ?? ''; } catch { return ''; }
}
function rememberName(name) {
  try { localStorage.setItem('standoff.name', name); } catch { /* private window */ }
}
let me = { playerId: null, token: null, code: null, name: savedName() };
let draft = '';
let clockOffset = 0;
let phaseStart = Date.now();
let lastPhaseKey = '';
let typed = new Set();
let reconnectDelay = 500;
let pendingCard = null;          // a card waiting on a target
let handUp = false;              // is the fan along the bottom edge pulled out?

/* ------------------------------------------------------------------ utils */

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const money = (n) => `${n < 0 ? '−' : ''}$${Math.abs(Math.round(n))}k`;

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

// Anything the player does while the connection is away is kept and sent the
// moment it comes back, so a dropped signal costs you nothing but the wait.
const outbox = [];
const NEVER_QUEUE = new Set(['ping', 'create', 'join', 'resume']);

function send(obj) {
  if (peer) { try { peer.send(obj); } catch { /* the channel will report itself */ } return; }
  if (mode === 'online') {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try { ws.send(JSON.stringify(obj)); return; } catch { /* fall through to the outbox */ }
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

function drainOutbox() {
  while (outbox.length && ws && ws.readyState === WebSocket.OPEN) {
    const next = outbox.shift();
    try { ws.send(JSON.stringify(next)); } catch { outbox.unshift(next); break; }
  }
  renderLink();
}

/** A quiet line about the connection, only when there is something to say. */
let link = { state: 'idle', since: 0, attempts: 0 };
function setLink(state) {
  if (link.state === state) return;
  link = { ...link, state, since: Date.now() };
  renderLink();
}
function renderLink() {
  const el = document.getElementById('link');
  if (!el) return;
  const waiting = outbox.length;
  if (mode !== 'online' || link.state === 'open') {
    el.className = 'link hidden';
    el.textContent = '';
    return;
  }
  el.className = 'link';
  el.textContent = link.state === 'lost'
    ? `Reconnecting…${waiting ? ` ${waiting} move${waiting === 1 ? '' : 's'} waiting` : ''}`
    : 'Connecting…';
}

function applyState(next) {
  const first = !state;
  state = next;
  // put the room in the address bar so the host can hand somebody the URL from
  // there, and so a refresh lands back at the same table
  if (mode === 'online' && state.code && codeFromUrl() !== state.code) {
    try { history.replaceState(null, '', roomUrl(state.code)); } catch { /* not ours */ }
  }
  clockOffset = state.serverNow ? Date.now() - state.serverNow : 0;
  const key = `${state.phase}:${state.round}:${state.local?.seatIndex ?? 0}:${state.local?.passing ?? ''}`;
  if (key !== lastPhaseKey) {
    lastPhaseKey = key;
    phaseStart = Date.now();
    if (['act', 'deal', 'talk'].includes(state.phase)) draft = '';
    pendingCard = null;
    window.scrollTo({ top: 0, behavior: first ? 'auto' : 'smooth' });
  }
  render();
}

/* ------------------------------------------------------------- connection */

/**
 * Is anybody home? On static hosting (GitHub Pages, a file:// page) there is no
 * server to keep a socket open, so we ask before trying and quietly fall back
 * to the two offline modes instead of throwing console errors at people.
 */
async function serverPresent() {
  if (!location.host || location.protocol === 'file:') return false;
  try {
    const res = await fetch(new URL('health', location.href), { cache: 'no-store' });
    if (!res.ok) return false;
    const body = await res.json();
    const lan = Array.isArray(body?.lan) ? body.lan[0] : null;
    if (lan) lanOrigin = `${location.protocol}//${lan}:${body.port ?? location.port}`;
    // a host that can introduce browsers to each other is one we can use
    if (body?.signal) signalUrl = sameOriginSignal();
    return !!body?.ok;
  } catch {
    return false;
  }
}

let heartbeat = null;
let lastSeq = -1;

function connect() {
  let url;
  try {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    if (!location.host) return;                   // opened as a file:// page
    url = `${proto}://${location.host}`;
  } catch { return; }

  setLink(link.attempts ? 'lost' : 'connecting');
  try { ws = new WebSocket(url); } catch { scheduleReconnect(); return; }

  ws.onopen = () => {
    socketReady = true;
    link.attempts = 0;
    setLink('open');
    const saved = readSession();
    if (saved?.code && saved?.token) {
      // A cold page load has no mode yet, and send() only talks to the socket
      // once the client believes it is online — so claiming the seat has to
      // come first, or the resume goes into the void and the reload silently
      // costs you your chair.
      mode = 'online';
      send({ t: 'resume', code: saved.code, token: saved.token });
    } else if (!mode) render();                  // the door looks different online
    drainOutbox();
    clearInterval(heartbeat);
    // a phone that went to sleep looks identical to a dead server until you ask
    heartbeat = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) send({ t: 'ping' });
    }, 20000);
  };

  ws.onmessage = (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    handleFrame(msg);
  };

  ws.onclose = () => {
    clearInterval(heartbeat);
    socketReady = false;
    if (mode === 'online' || readSession()) scheduleReconnect();
    else { setLink('idle'); if (!mode) render(); }
  };
  ws.onerror = () => { try { ws.close(); } catch { /* ignore */ } };
}

/**
 * One frame from the table, however it arrived — a websocket to a Node host, or
 * a data channel to whoever's browser is running the game. The protocol is the
 * same either way, which is the whole reason peer play was cheap to add.
 */
function handleFrame(msg) {
  if (!msg || msg.t === 'pong') return;
  if (msg.t === 'welcome') {
    if (!mode) mode = 'online';
    me.playerId = msg.playerId;
    me.token = msg.token;
    me.code = msg.code;
    writeSession({ code: msg.code, token: msg.token, peer: isPeer() || undefined });
    try { history.replaceState(null, '', roomUrl(msg.code)); } catch { /* not allowed here */ }
    lastSeq = -1;
  } else if (msg.t === 'state') {
    if (!isOnline()) return;
    // frames can arrive out of order after a reconnect; only move forwards
    if (typeof msg.state?.seq === 'number') {
      if (msg.state.seq < lastSeq) return;
      lastSeq = msg.state.seq;
    }
    applyState(msg.state);
  } else if (msg.t === 'error') {
    // a table that no longer exists is worth forgetting, or every reload
    // tries to rejoin a game that ended days ago
    if (msg.reset || /no table/i.test(msg.msg)) {
      clearSession();
      // the link still names a room, so this lands them back on the one-tap
      // door rather than on a stale screen
      if (!state) { mode = null; peer = null; render(); }
    }
    toast(msg.msg);
  }
}

/**
 * Back off, but with jitter, so a laptop lid closing on six phones at once
 * does not bring them all back in the same millisecond.
 */
function scheduleReconnect() {
  setLink('lost');
  link.attempts += 1;
  const base = Math.min(500 * 2 ** Math.min(link.attempts, 5), 10000);
  const delay = base / 2 + Math.random() * (base / 2);
  setTimeout(connect, delay);
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

// coming back from a locked phone or a background tab should feel instant
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (mode === 'online' && (!ws || ws.readyState > WebSocket.OPEN)) { link.attempts = 0; connect(); }
});
window.addEventListener('online', () => {
  if (mode === 'online' && (!ws || ws.readyState > WebSocket.OPEN)) { link.attempts = 0; connect(); }
});

/**
 * Host a table out of this tab. Used when there is no server to host one —
 * which on GitHub Pages is always. The game runs here; everybody else's phone
 * talks to this browser directly.
 */
async function startPeerHost(name) {
  const { PeerHost } = await import('./net/peer.js');
  mode = 'online';
  const host = new PeerHost({
    signalUrl,
    onState: (msg) => handleFrame(msg),
    onError: (m) => toast(m),
  });
  peer = host;
  setLink('connecting');
  try {
    await host.start(name);
    setLink('open');
  } catch (err) {
    peer = null;
    mode = null;
    setLink('idle');
    toast('Could not open a table: ' + (err?.message ?? 'no introduction service'));
    render();
  }
}

/** Join a table that lives in somebody else's browser. */
async function startPeerGuest(code, name) {
  const { PeerGuest } = await import('./net/peer.js');
  const guest = new PeerGuest({
    signalUrl,
    code,
    onState: (msg) => handleFrame(msg),
    onError: (m, reset) => {
      toast(m);
      if (reset) { clearSession(); peer = null; mode = null; render(); }
    },
  });
  peer = guest;
  mode = 'online';
  setLink('connecting');
  try {
    await guest.start();
    setLink('open');
    // the host's tab still knows this token, so a reload gets the same chair
    const saved = readSession();
    if (saved?.code === code && saved?.token) guest.send({ t: 'resume', code, token: saved.token });
    else guest.send({ t: 'join', code, name });
  } catch (err) {
    peer = null;
    mode = null;
    setLink('idle');
    toast(err?.message ?? 'could not reach that table');
    render();
  }
}

async function startLocal(kind) {
  const { LocalTable } = await import('./net/local.js');
  mode = kind;
  local = new LocalTable({ mode: kind, onState: applyState });
  if (kind === 'solo') {
    const name = me.name || 'You';
    local.send({ t: 'addLocal', name });
  } else {
    local.emit();
  }
}

/* ------------------------------------------------------------------ timer */

function tickTimer() {
  const fill = $('#timerFill');
  if (!state || !state.deadline) {
    $('#timer').style.visibility = 'hidden';
  } else {
    $('#timer').style.visibility = 'visible';
    const now = Date.now() - clockOffset;
    const total = Math.max(1, state.deadline - (phaseStart - clockOffset));
    const left = Math.max(0, state.deadline - now);
    const pct = Math.max(0, Math.min(1, left / total));
    fill.style.width = `${pct * 100}%`;
    fill.classList.toggle('low', left < 8000);
  }
  requestAnimationFrame(tickTimer);
}

/* ----------------------------------------------------------------- render */

function render() {
  if (!state) { app.innerHTML = viewDoor(); chrome.classList.add('hidden'); rail.classList.add('hidden'); return; }
  document.body.classList.toggle('loud', !!state.actionRound);
  renderChrome();
  renderRail();

  let body;
  if (state.local?.passing) body = viewPass();
  else {
    const view = {
      lobby: viewLobby, act: viewAct, deal: viewDeal, talk: viewTalk,
      squeeze: viewSqueeze, reckoning: viewReckoning, event: viewEvent,
      vote: viewVote, accusation: viewAccusation, ledger: viewLedger,
    }[state.phase] ?? viewLobby;
    body = view();
  }

  const active = document.activeElement;
  const keepId = active && active.id ? active.id : null;
  const caret = active && 'selectionStart' in active ? active.selectionStart : null;

  app.innerHTML = body;

  if (keepId) {
    const again = document.getElementById(keepId);
    if (again) {
      again.focus();
      if (caret != null && 'setSelectionRange' in again) {
        try { again.setSelectionRange(caret, caret); } catch { /* not a text field */ }
      }
    }
  }
  runTypewriters();
}

function renderChrome() {
  const inPlay = state.phase !== 'lobby';
  chrome.classList.toggle('hidden', false);
  $('#roomChip').textContent = mode === 'online' ? state.code ?? '' : mode === 'solo' ? 'SOLO' : 'ONE DEVICE';
  const moneyChip = $('#moneyChip');
  moneyChip.textContent = state.you ? money(state.you.score) : '';
  // on a shared screen there is no "you" between turns; don't leave an empty box
  moneyChip.classList.toggle('hidden', !state.you);
  $('#cardBtn').classList.toggle('hidden', !state.you?.role);

  const labels = {
    lobby: 'THE BACK ROOM',
    act: state.act ? state.act.name : 'A NEW ACT',
    deal: `THE JOB · ${state.round} OF ${state.totalRounds}`,
    talk: 'TABLE TALK',
    squeeze: 'THE SQUEEZE',
    reckoning: 'THE RECKONING',
    event: 'BETWEEN JOBS',
    vote: 'THE TABLE DECIDES',
    accusation: 'NAME THE RAT',
    ledger: 'THE LEDGER',
  };
  $('#phaseLabel').textContent = labels[state.phase] ?? '';

  const heat = $('#heat');
  const fill = $('#heatFill');
  if (!inPlay || !state.heat) heat.style.visibility = 'hidden';
  else {
    heat.style.visibility = 'visible';
    fill.style.width = `${state.heat.value}%`;
    fill.className = `heat-fill ${state.heat.key}`;
    heat.title = `${state.heat.name} — ${state.heat.line}`;
  }
}

function crewDot(player) {
  if (!player?.crew || !state.crews) return '';
  const crew = state.crews.find((c) => c.id === player.crew);
  if (!crew) return '';
  return `<span class="crew-dot" style="background:${crew.colour}" title="${esc(crew.name)}"></span>`;
}

function renderRail() {
  if (state.phase === 'lobby' || state.local?.passing) { rail.classList.add('hidden'); return; }
  rail.classList.remove('hidden');
  const partnerIds = new Set((state.job?.partners ?? []).map((p) => p.id));
  rail.innerHTML = state.players.map((p) => {
    const cls = ['seat'];
    if (p.isYou) cls.push('you');
    else if (partnerIds.has(p.id)) cls.push('partner');
    if (!p.connected && !p.bot) cls.push('off');
    let dot = 'live';
    if (!p.connected && !p.bot) dot = 'gone';
    if (state.phase === 'squeeze' && p.locked) dot = 'locked';
    if (state.phase === 'reckoning' && p.ready) dot = 'locked';
    if (state.phase === 'vote' && p.voted) dot = 'locked';
    if (state.phase === 'accusation' && p.accused) dot = 'locked';
    const sittingOut = state.sittingOut?.id === p.id;
    return `<div class="${cls.join(' ')}">
      <div class="n"><span class="dot ${dot}"></span>${crewDot(p)}${esc(p.name)}${p.bot ? ' <span style="color:var(--ink-faint)">○</span>' : ''}</div>
      <div class="s">${money(p.score)}
        ${p.markers ? `<span class="marks">${'†'.repeat(Math.min(p.markers, 4))}</span>` : ''}
        ${p.handCount ? `<span style="color:var(--ink-faint)">■${p.handCount}</span>` : ''}
        ${sittingOut ? '<span style="color:var(--ink-faint)">OUT</span>' : ''}
        ${p.played ? '<span style="color:var(--gold)">◆</span>' : ''}
      </div>
    </div>`;
  }).join('');
}

/* ------------------------------------------------------------------- door */

function viewDoor() {
  const preset = codeFromUrl();
  // arriving on somebody's link: there is nothing to choose, just say who you are
  if (preset && canHost()) {
    return `
    <section class="door">
      <h1 class="title">STANDOFF</h1>
      <p class="tagline">Table ${esc(preset)} is expecting you.</p>
      <form id="doorForm" autocomplete="off" class="quickjoin">
        <input type="text" id="nameInput" maxlength="18" placeholder="WHAT THEY CALL YOU" value="${esc(me.name)}" />
        <input type="hidden" id="codeInput" value="${esc(preset)}" />
        <button class="btn" id="joinBtn" type="submit" style="width:100%">SIT DOWN AT ${esc(preset)}</button>
      </form>
      <button class="link-btn" data-act="forgetRoom" style="margin-top:16px">or start a table of your own</button>
    </section>`;
  }
  return `
  <section class="door">
    <h1 class="title">STANDOFF</h1>
    <p class="tagline">Two rooms. One question. However many friendships you brought with you.</p>

    <form id="doorForm" autocomplete="off" style="margin-bottom:18px">
      <input type="text" id="nameInput" maxlength="18" placeholder="WHAT THEY CALL YOU" value="${esc(me.name)}" />
    </form>

    <div class="mode-grid">
      ${canHost() ? `
        <button class="mode-btn" id="createBtn">
          <span class="mb-t">NEW TABLE</span>
          <span class="mb-s">Everybody on their own phone. Put the QR code in the middle and let them scan it.</span>
        </button>
        <div class="row" style="gap:8px">
          <input type="text" id="codeInput" maxlength="4" placeholder="CODE" value="${esc(preset)}" style="flex:1;text-transform:uppercase" />
          <button class="ghost-btn" id="joinBtn" style="padding:12px 18px">SIT DOWN</button>
        </div>` : ''}
      <button class="mode-btn" data-act="modeDevice">
        <span class="mb-t">ONE DEVICE</span>
        <span class="mb-s">Pass the phone around the table. It hides everybody's business between turns.</span>
      </button>
      <button class="mode-btn" data-act="modeSolo">
        <span class="mb-t">AGAINST THE GHOSTS</span>
        <span class="mb-s">On your own, against people who are not there. Good for learning what you are.</span>
      </button>
    </div>
    ${canHost() ? '' : `<p class="no-table-note">
      ${signalProblem ? esc(signalProblem) : `Everybody-on-their-own-phone needs somewhere for the phones to find
      each other. Run <code>node server.js</code>, or point this page at one
      with <code>?signal=</code>. The two below work with nothing at all.`}
    </p>`}

    <div class="rule" style="max-width:340px;margin:30px auto"></div>
    <p class="stamp">how it works</p>
    <p style="max-width:44ch;margin:10px auto;color:var(--ink-soft);font-size:15px">
      Every round you are locked in a room with somebody you know. You can talk first, play a card,
      and swear to anything you like. Then you choose, alone, whether to hold the line or take the deal.
      Holding together pays. Folding on somebody who held pays better. Everybody folding pays nobody.
    </p>
    <p style="max-width:44ch;margin:10px auto;color:var(--ink-faint);font-size:14px;font-style:italic">
      Three to ten people, in the same room or on the same call, where you can hear the pause before somebody lies.
    </p>
  </section>`;
}

/* ------------------------------------------------------------------ lobby */

function viewLobby() {
  const isLocal = mode !== 'online';
  const profile = state.profile;
  const roster = state.players;

  return `
  <section>
    ${isLocal ? `
      <p class="stamp">${mode === 'solo' ? 'you and the ghosts' : 'everybody at this table, on this device'}</p>
      <h2 style="font-family:var(--mono);letter-spacing:0.18em;font-size:clamp(22px,6vw,34px);margin:8px 0 4px">
        ${mode === 'solo' ? 'AGAINST THE GHOSTS' : 'ONE DEVICE'}
      </h2>
    ` : inviteBlock(roster)}

    ${isLocal && mode === 'device' ? `
      <div class="row" style="gap:8px;margin:16px 0">
        <input type="text" id="localName" maxlength="18" placeholder="ADD SOMEBODY" style="flex:1" />
        <button class="ghost-btn" data-act="addLocal">SEAT THEM</button>
      </div>` : ''}

    <div class="rule"></div>

    <div class="roster">
      ${roster.map((p) => `
        <div class="roster-row">
          <div>
            <div class="who">${esc(p.name)}${p.isYou && !isLocal ? ' <span style="color:var(--gold);font-size:10px">— YOU</span>' : ''}${p.id === state.hostId && !isLocal ? ' <span style="color:var(--ink-faint);font-size:10px">— HOST</span>' : ''}</div>
            ${p.bot ? `<div class="what">a ghost. ${esc(strategyLine(p.strategy))}</div>`
              : `<div class="what">${isLocal ? 'at the table' : p.connected ? 'in the room' : 'stepped out'}</div>`}
          </div>
          ${(state.isHost && p.bot) ? `<button class="link-btn" data-act="removeBot" data-id="${p.id}">show out</button>` : ''}
          ${(isLocal && !p.bot && mode === 'device') ? `<button class="link-btn" data-act="removeLocal" data-id="${p.id}">remove</button>` : ''}
        </div>`).join('')}
    </div>

    ${roster.length >= 2 && profile ? `
      <div class="profile-box">
        <div class="pn">${esc(profile.name)} · ${roster.length} AT THE TABLE</div>
        <div class="pb">${esc(profile.blurb)}</div>
        <ul>${profile.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
      </div>
      <p style="color:var(--ink-faint);font-size:13px;margin-top:-6px">
        The night changes shape as people arrive. Seat somebody else and this box changes with it.
      </p>` : `
      <p class="waiting" style="text-align:center;padding:10px">
        ${mode === 'device' ? 'Seat at least two people.' : 'Waiting for another body.'}
      </p>`}

    ${state.isHost ? `
      <div class="rule"></div>
      <p class="stamp">the arrangement</p>
      <div class="row" style="margin:12px 0 18px">
        <div class="setting">
          rounds
          <select id="roundsSel" style="width:auto">
            ${[3, 4, 5, 6, 7, 8, 10].map((n) => `<option value="${n}" ${n === state.config.rounds ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
        </div>
        ${mode === 'online' ? `
          <div class="setting">
            pace
            <select id="paceSel" style="width:auto">
              ${['relaxed', 'normal', 'brisk'].map((p) => `<option value="${p}" ${p === state.config.pace ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
          </div>
          <button class="ghost-btn ${state.config.timers ? 'on' : ''}" data-act="toggleTimers">${state.config.timers ? 'CLOCK ON' : 'NO CLOCK'}</button>` : ''}
        <button class="ghost-btn ${state.config.cards ? 'on' : ''}" data-act="toggleCards">${state.config.cards ? 'CARDS ON' : 'NO CARDS'}</button>
        <button class="ghost-btn" data-act="addBot">+ GHOST</button>
      </div>
      <button class="btn tutorial-btn" data-act="tutorial" ${roster.length < 2 && mode !== 'solo' ? 'disabled' : ''} style="width:100%;margin-bottom:10px">
        FIRST NIGHT \u00b7 LEARN IT IN FIVE MINUTES
      </button>
      <p style="color:var(--ink-faint);font-size:13px;text-align:center;margin:-4px 0 12px">
        Three short jobs with somebody talking you through them. A real game, and none of it counts.
      </p>
      <button class="btn" data-act="start" ${roster.length < 2 && mode !== 'solo' ? 'disabled' : ''} style="width:100%">
        ${roster.length < 2 && mode !== 'solo' ? 'WAITING FOR SOMEBODY TO BETRAY'
          : `DEAL IN · ${mode === 'solo' ? 'YOU AND THREE GHOSTS' : `${roster.length} PLAYERS`} · ${state.config.rounds} ROUNDS`}
      </button>
      <p style="color:var(--ink-faint);font-size:13px;text-align:center;margin-top:10px">
        Ghosts are stand-ins with fixed habits. Good for odd numbers and for finding out how you play.
      </p>
    ` : `<p class="waiting" style="text-align:center;padding:14px">Waiting on ${esc(state.players.find((p) => p.id === state.hostId)?.name ?? 'the host')} to deal.</p>`}

    ${mode === 'online' ? `<div class="rule"></div>${chatBlock()}` : ''}
  </section>`;
}

/**
 * How people get in. A QR is the short path — point a camera at it and you are
 * seated — with the link underneath for anybody in a group chat, and the four
 * letters last, because somebody always ends up reading them out anyway.
 */
function inviteBlock(roster) {
  const link = joinUrl(state.code);
  const qr = qrFor(link);
  const inTab = isPeer();
  return `
    <p class="stamp">point a camera at this</p>
    ${inTab ? `<p class="hosting-note">
      This table is running in this tab. Everybody else is connected straight to
      this browser, so leave it open until the night is over.
    </p>` : ''}
    <div class="invite">
      <div class="invite-qr">${qr || `<div class="code-big" style="margin:0">${esc(state.code)}</div>`}</div>
      <div class="invite-side">
        <div class="code-big">${esc(state.code)}</div>
        <button class="ghost-btn" data-act="copyLink" style="width:100%">COPY THE LINK</button>
        <p class="invite-url">${esc(link)}</p>
        <p style="color:var(--ink-soft);font-size:13.5px;margin:0">
          ${roster.length}/${state.maxPlayers} seated. Anybody on this wifi can scan it, tap the
          link, or open the page and type ${esc(state.code)}.
        </p>
      </div>
    </div>`;
}

function strategyLine(id) {
  return {
    titfortat: 'gives back exactly what he gets.',
    grudger: 'forgives nothing, ever, once.',
    saint: 'has never folded in his life.',
    rat: 'is probably already on the phone.',
    pavlov: 'repeats whatever worked last time.',
    coin: 'decides things with a coin.',
  }[id] ?? 'keeps his own counsel.';
}

function chatBlock() {
  const lines = (state.chat ?? []).map((c) =>
    `<div class="chatline ${c.kind === 'system' ? 'system' : ''}"><span class="who">${esc(c.name)}</span>${esc(c.text)}</div>`).join('');
  const canChat = !['talk', 'squeeze', 'vote', 'accusation'].includes(state.phase);
  return `
    <p class="stamp">the room</p>
    <div class="chatbox" id="chatbox">${lines || '<div class="chatline system">Quiet in here.</div>'}</div>
    ${canChat ? `<div class="row" style="gap:8px">
      <input type="text" id="chatInput" maxlength="200" placeholder="SAY SOMETHING" style="flex:1" />
      <button class="ghost-btn" data-act="chat">SAY IT</button>
    </div>` : '<p class="waiting" style="font-size:13px">The rooms are separate. Use your whisper.</p>'}`;
}

/* -------------------------------------------------------------- act card */

function viewAct() {
  const a = state.act;
  if (!a) return '<div class="big-note">Dealing.</div>';
  return `
  <section class="actcard">
    <div class="an">${esc(a.name)}</div>
    <div class="at">${esc(a.title)}</div>
    <div class="al">${esc(a.line)}</div>
    <div class="as">${esc(a.stakes)}</div>
    ${state.isHost ? `<div class="row" style="justify-content:center;margin-top:30px"><button class="btn" data-act="skip">BEGIN</button></div>` : ''}
  </section>`;
}

/* --------------------------------------------------------- pass the phone */

function viewPass() {
  return `
  <section class="pass">
    <div class="ph">hand it over</div>
    <div class="pn">${esc(state.local.seatName ?? '')}</div>
    <div class="pb">Nobody else should be looking at this screen. Take it, do your business, and pass it on.</div>
    <button class="btn" data-act="seatTake">I’M ${esc((state.local.seatName ?? '').toUpperCase())}</button>
    <p style="color:var(--ink-faint);font-size:12px;font-family:var(--mono);letter-spacing:0.2em;margin-top:22px">
      ${state.local.seatIndex + 1} OF ${state.local.seatCount}
    </p>
  </section>`;
}

/* ------------------------------------------------------------- job header */

function twistBanner() {
  const t = state.twist;
  if (!t) return '';
  return `<div class="twist-banner">
    <div class="tw-name">${esc(t.name)}</div>
    <div class="tw-body">${esc(t.line)}${t.effect ? `<span class="tw-effect">${esc(t.effect)}</span>` : ''}</div>
  </div>`;
}

function jobCard(job, { showPressure = true } = {}) {
  const names = job.partners.map((p) => p.name);
  const list = names.length > 1
    ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
    : names[0] ?? 'nobody';
  const shared = job.sharedNames;
  const sharedList = shared && shared.length > 1
    ? `${shared.slice(0, -1).join(', ')} and ${shared[shared.length - 1]}`
    : shared?.[0] ?? '';
  const who = shared
    ? (job.kind === 'table' ? `the whole table · ${sharedList}` : sharedList)
    : job.kind === 'table'
      ? `the whole table · ${names.length + 1} of you`
      : job.kind === 'trio'
        ? `three-handed · you, ${list}`
        : `you and ${list}`;
  const cbLabel = {
    grudge: 'THIS ONE HAS HISTORY',
    feud: 'THIS ONE HAS A BODY COUNT',
    clean: 'YOU TWO HAVE NEVER SLIPPED',
    repeat: 'THIS KEEPS HAPPENING',
  }[job.callback?.kind];
  const loud = job.tone === 'action';
  return `
  <article class="dossier ${loud ? 'action' : ''}" data-case="NO. ${esc(job.caseNo)}">
    ${loud ? '<div class="action-flag">IN PROGRESS</div>' : ''}
    ${cbLabel ? `<div class="callback-flag">${cbLabel}</div>` : ''}
    <p class="stamp">${esc(who)}</p>
    <h2>${esc(job.title)}</h2>
    ${job.setup.map((p) => `<p>${esc(p)}</p>`).join('')}
    ${showPressure ? `<div class="pressure">${esc(job.pressure)}</div>` : ''}
  </article>`;
}

/* ------------------------------------------------------------------- deal */

function viewDeal() {
  const job = state.job;
  // a shared screen has no "you" — everybody reads the dossiers together
  if (!job && state.briefing?.length) return viewBriefing();
  if (!job) return sittingOutNote();
  return `
  <section>
    ${coachPanel()}
    ${actionStrip()}
    ${twistBanner()}
    <div class="tableau">
      <div class="tab-main">${jobCard(job)}</div>
      <div class="tab-side">
        ${heatNote()}
        ${payoffPanel(job)}
        <p class="waiting" style="margin-top:16px">
          ${state.twist?.id === 'notalk' ? 'No talking on this one. The squeeze comes straight away.' : 'Table talk in a moment. Think about what you are going to say.'}
        </p>
        ${state.isHost ? `<div class="row" style="margin-top:12px"><button class="ghost-btn" data-act="skip">SKIP AHEAD</button></div>` : ''}
      </div>
    </div>
  </section>`;
}

/** Every job on the table at once, for a room sharing one screen. */
function viewBriefing() {
  const many = state.briefing.length > 1;
  return `
  <section>
    ${coachPanel()}
    ${actionStrip()}
    ${twistBanner()}
    ${many ? `<p class="stamp" style="margin-bottom:12px">${state.briefing.length} rooms tonight \u00b7 find yours</p>` : ''}
    ${state.briefing.map((b) => `
      <div class="tableau">
        <div class="tab-main">${jobCard(b.job)}</div>
        <div class="tab-side">${heatNote()}${payoffPanel(b.job)}</div>
      </div>
    `).join('')}
    <p class="waiting" style="text-align:center;margin-top:18px">
      Read it together. Nobody chooses anything yet.
    </p>
    <div class="row" style="justify-content:center;margin-top:12px">
      <button class="btn" data-act="skip">EVERYBODY\u2019S READ IT</button>
    </div>
  </section>`;
}

function sittingOutNote() {
  if (state.you?.sittingOut) {
    return `<div class="big-note" style="padding:60px 20px">
      <div class="stamp" style="margin-bottom:12px">you were told to lie low</div>
      <p style="max-width:34ch;margin:0 auto;font-size:17px">
        The table voted you off this one. You get a flat rate and an evening at home,
        and you get to watch what everybody does when you are not in the room.
      </p>
      ${state.isHost ? `<div class="row" style="justify-content:center;margin-top:20px"><button class="ghost-btn" data-act="skip">GET ON WITH IT</button></div>` : ''}
    </div>`;
  }
  return `<div class="big-note">You are not on this one. Watch.
    ${state.isHost ? `<div class="row" style="justify-content:center;margin-top:16px"><button class="ghost-btn" data-act="skip">SKIP AHEAD</button></div>` : ''}
  </div>`;
}

function coachPanel() {
  const t = state.tutorial;
  if (!t) return '';
  const line = t.says;
  return `
    <div class="coach">
      <div class="coach-who">${esc(t.coachName)} \u00b7 ${esc(t.coachRole)}</div>
      ${line ? `<div class="coach-says">\u201c${esc(line)}\u201d</div>` : ''}
      <div class="coach-beat">FIRST NIGHT \u00b7 ${t.beat} OF ${t.beats}${t.teach ? ` \u00b7 ${esc(t.teach)}` : ''}</div>
    </div>`;
}

function actionStrip() {
  if (!state.actionRound) return '';
  return `<div class="action-strip">
    <div class="as-t">NO TIME</div>
    <div class="as-b">This one is happening right now. Shorter clock, bigger money, and the choice is something you do with your hands.</div>
  </div>`;
}

function heatNote() {
  if (!state.heat || state.heat.key === 'quiet') return '';
  return `<p class="stamp" style="margin-bottom:10px">
    the table is <b style="color:${state.heat.key === 'warm' ? 'var(--gold)' : 'var(--red-bright)'}">${esc(state.heat.name)}</b> · ${esc(state.heat.line)}
  </p>`;
}

function payoffPanel(job) {
  if (!job.options?.length) return '';
  const n = job.stake?.n ?? 2;
  const room = n > 2 ? 'the room holds' : 'they hold';
  const bust = n > 2 ? 'it doesn\u2019t' : 'they don\u2019t';
  return `
    <p class="stamp">what each way out is worth</p>
    <table class="matrix">
      <tr><th style="text-align:left">the move</th><th>if ${room}</th><th>if ${bust}</th></tr>
      ${job.options.map((o) => `
        <tr>
          <td style="text-align:left;color:var(--ink)">${esc(o.label)}</td>
          <td class="${o.ifTheyHold >= o.ifTheyDont ? 'good' : ''}"><b>${money(o.ifTheyHold)}</b></td>
          <td class="${o.ifTheyDont > o.ifTheyHold ? 'good' : 'bad'}"><b>${money(o.ifTheyDont)}</b></td>
        </tr>`).join('')}
    </table>
    <p style="color:var(--ink-faint);font-size:13px;margin-top:8px">
      Nothing here is safe and nothing here is the decent thing. What is worth doing depends
      entirely on what you think everybody else is about to do.
    </p>`;
}

/* ------------------------------------------------------------------- hand */

function handPanel() {
  const you = state.you;
  if (!you || !state.config.cards) return '';
  if (you.playedThisRound) {
    return `<div class="hand-wrap open">
      <p class="stamp">you played</p>
      <div class="pcard ${you.playedThisRound.face} played" style="margin-top:8px">
        <span class="pc-face">${you.playedThisRound.face === 'up' ? 'FACE UP · ANNOUNCED' : 'FACE DOWN · SECRET'}</span>
        <span class="pc-name">${esc(you.playedThisRound.name)}</span>
        <span class="pc-text">${esc(you.playedThisRound.text)}</span>
      </div>
    </div>`;
  }
  if (!you.hand.length) return '';

  if (pendingCard) {
    const card = you.hand.find((c) => c.id === pendingCard);
    if (card) {
      const targets = state.players.filter((p) => !p.isYou);
      return `<div class="hand-wrap open">
        <p class="stamp">${esc(card.name)} — on who?</p>
        <div class="row tight" style="margin-top:8px">
          ${targets.map((p) => `<button class="ghost-btn" data-act="playCard" data-card="${card.id}" data-target="${p.id}">${esc(p.name)}</button>`).join('')}
          <button class="link-btn" data-act="cancelCard">never mind</button>
        </div>
      </div>`;
    }
  }

  return `<div class="hand-wrap${handUp ? ' open' : ''}">
    <button class="hand-tab" data-act="hand" aria-expanded="${handUp}">
      your hand · ${you.hand.length} card${you.hand.length === 1 ? '' : 's'} · one a round
    </button>
    <div class="hand">
      ${you.hand.map((c) => `
        <button class="pcard ${c.face}" data-act="pickCard" data-card="${c.id}">
          <span class="pc-face">${c.face === 'up' ? 'FACE UP' : 'FACE DOWN'}</span>
          <span class="pc-name">${esc(c.name)}</span>
          <span class="pc-text">${esc(c.text)}</span>
        </button>`).join('')}
    </div>
  </div>`;
}

function declaredPanel() {
  const declared = state.job?.declared ?? [];
  if (!declared.length) return '';
  return declared.map((d) => `<div class="declared">
    <div class="dh">${esc(d.by)} PLAYED ${esc(d.card.name.toUpperCase())}${d.target ? ` ON ${esc(d.target.toUpperCase())}` : ''}</div>
    <div class="db">${esc(d.card.text)}</div>
  </div>`).join('');
}

/* ------------------------------------------------------------------- talk */

function viewTalk() {
  const job = state.job;
  if (!job) return sittingOutNote();
  const partners = job.talkPartners.map((p) => p.name).join(' and ') || 'nobody';
  const pledged = job.pledgedByYou;
  const openBook = state.twist?.id === 'openbook';

  // What they said to you on the left; what you are willing to promise on the right.
  const said = `
    <p class="stamp">you have a minute with ${esc(partners)}</p>
    <h2 class="talk-title">${esc(job.title)}</h2>
    ${declaredPanel()}

    ${job.incoming.length ? job.incoming.map((w) => `
      <div class="whisper-in">
        <div class="from">${esc(w.from)} says</div>
        <div class="body">\u201c${esc(w.text)}\u201d</div>
      </div>`).join('') : '<p class="waiting">Nothing back yet. They are thinking about it, or they want you to think they are.</p>'}

    <div class="rule"></div>
    <p class="stamp">what you tell ${esc(partners)}</p>
    <textarea id="whisperBox" maxlength="180" placeholder="Say whatever you need to say.">${esc(draft || job.whisperByYou)}</textarea>
    <div class="row spread" style="margin-top:8px">
      <span style="font-size:12px;color:var(--ink-faint);font-family:var(--mono)">THEY SEE THIS IMMEDIATELY</span>
      <button class="ghost-btn" data-act="whisper">SEND IT</button>
    </div>`;

  const offers = `
    <div class="pledge-box ${pledged ? 'on' : ''}">
      <div class="row spread">
        <div>
          <div style="font-family:var(--mono);font-size:12px;letter-spacing:0.18em;color:${pledged ? 'var(--gold)' : 'var(--ink-soft)'}">
            ${pledged ? 'YOU HAVE GIVEN YOUR WORD' : 'GIVE YOUR WORD'}
          </div>
          <div style="font-size:14px;color:var(--ink-soft);margin-top:4px">
            A pledge is public to ${esc(partners)}. Breaking one goes in the record with your name on it.
          </div>
        </div>
        <button class="ghost-btn ${pledged ? 'on' : ''}" data-act="pledge" data-val="${pledged ? '0' : '1'}">${pledged ? 'TAKE IT BACK' : 'I SWEAR IT'}</button>
      </div>
      ${job.pledgesVisible.length ? `<div style="margin-top:10px;font-family:var(--mono);font-size:11px;color:var(--ink-faint);letter-spacing:0.1em">
        ${openBook ? 'OPEN BOOK \u2014 THE WHOLE TABLE: ' : ''}${job.pledgesVisible.map((p) => `${esc(p.name)}: ${p.pledged ? '<span style="color:var(--gold)">SWORE IT</span>' : 'said nothing'}`).join(' \u00b7 ')}
      </div>` : ''}
    </div>
    ${markerPanel()}
    ${powerPanel()}`;

  return `
  <section>
    ${coachPanel()}
    ${twistBanner()}
    <div class="tableau">
      <div class="tab-main">${said}</div>
      <div class="tab-side">${offers}</div>
    </div>
    ${handPanel()}
    <div class="row" style="justify-content:center;margin-top:18px">
      ${state.local ? `<button class="btn" data-act="seatDone">DONE \u2014 PASS IT ON</button>`
        : state.isHost ? `<button class="ghost-btn" data-act="skip">EVERYBODY\u2019S SAID ENOUGH</button>` : ''}
    </div>
  </section>`;
}

function markerPanel() {
  const you = state.you;
  if (!you) return '';
  if (you.markerTarget) {
    return `<div class="pledge-box on" style="border-color:var(--red)">
      <div style="font-family:var(--mono);font-size:12px;letter-spacing:0.18em;color:var(--red-bright)">MARKER CALLED IN</div>
      <div style="font-size:14px;color:var(--ink-soft);margin-top:4px">If they fold on you this round, they forfeit the whole take and you collect half of it.</div>
    </div>`;
  }
  if (!you.markers) return '';
  return `<div class="pledge-box" style="border-color:rgba(181,35,43,0.4)">
    <div class="row spread">
      <div>
        <div style="font-family:var(--mono);font-size:12px;letter-spacing:0.18em;color:var(--red-bright)">
          YOU ARE HOLDING ${you.markers} MARKER${you.markers > 1 ? 'S' : ''}
        </div>
        <div style="font-size:14px;color:var(--ink-soft);margin-top:4px">
          Earned by being left out there. Call one in and a betrayal this round costs them everything they made on it.
        </div>
      </div>
      <button class="ghost-btn" data-act="marker">CALL IT IN</button>
    </div>
  </div>`;
}

function powerPanel() {
  const you = state.you;
  if (!you || you.role?.id !== 'consigliere') return '';
  if (you.powerResult) {
    return `<div class="pledge-box on">
      <div style="font-family:var(--mono);font-size:12px;letter-spacing:0.18em;color:var(--gold)">THE CABINET</div>
      <div style="margin-top:6px">${esc(you.powerResult.name)} is holding <b>${esc(you.powerResult.roleName)}</b>. You are the only one who knows.</div>
    </div>`;
  }
  const others = state.players.filter((p) => !p.isYou);
  return `<div class="pledge-box">
    <div style="font-family:var(--mono);font-size:12px;letter-spacing:0.18em;color:var(--gold)">THE CABINET — ONE READ, ALL NIGHT</div>
    <div class="row tight" style="margin-top:8px">
      ${others.map((p) => `<button class="ghost-btn" data-act="power" data-id="${p.id}">${esc(p.name)}</button>`).join('')}
    </div>
  </div>`;
}

/* ---------------------------------------------------------------- squeeze */

// What kind of move this is, in two or three words, above its name.
const MOVE_KIND = {
  half: 'give them something',
  shield: 'cover yourself',
  gamble: 'bet on the room',
  muscle: 'make it cost them',
  martyr: 'take the weight',
  chance: 'take a chance',
};

function viewSqueeze() {
  const job = state.job;
  if (!job) return sittingOutNote();
  const chosen = job.yourChoice;

  // Everything you know, on the left. Everything you can do, on the right.
  const brief = `
    ${job.switched ? `<div class="twist-banner"><div class="tw-name">SWITCHED</div><div class="tw-body">Assignments were re-cut after the meeting. You are not locked in with the person you were talking to. You are locked in with <b>${esc(job.partners.map((p) => p.name).join(' and '))}</b>, and this is a different job entirely.</div></div>` : ''}
    ${job.switched ? jobCard(job) : `
      <div class="note-paper">
        <p class="stamp">${esc(job.title)} \u00b7 no. ${esc(job.caseNo)}</p>
        <div class="pressure" style="margin-top:10px">${esc(job.pressure)}</div>
      </div>`}

    ${declaredPanel()}

    ${job.lookout?.length ? `<div class="twist-banner" style="border-color:var(--gold)">
      <div class="tw-name">THE LOOKOUT</div>
      <div class="tw-body">${job.lookout.map((l) => `${esc(l.name)} has locked in <b>${esc(l.label)}</b>`).join('. ')}.</div>
    </div>` : ''}

    ${job.leak ? `<div class="twist-banner" style="border-color:var(--red)">
      <div class="tw-name" style="color:var(--red-bright)">THE WIRE</div>
      <div class="tw-body">A little bird says ${esc(job.leak.from)} has already locked in <b>${esc(job.leak.label ?? '')}</b>. Believe it or don\u2019t.</div>
    </div>` : ''}

    ${job.incoming.length ? `<div class="whisper-in">
      <div class="from">${esc(job.incoming[0].from)} said, before all this</div>
      <div class="body">\u201c${esc(job.incoming[0].text)}\u201d</div>
    </div>` : ''}`;

  const moves = chosen ? `
      <div class="locked-in">
        <div class="stamp">you locked in</div>
        <div class="li-name">${esc(job.options.find((o) => o.id === chosen)?.label ?? '')}</div>
        <div class="li-note">${job.lockedCount} of ${job.groupSize} have decided. Nobody can change their mind now.</div>
      </div>` : `
      <p class="stamp">your move \u00b7 one of ${job.options.length}</p>
      <div class="choices n${job.options.length}">
        ${job.options.map((o, i) => {
          const first = i === 0;
          const last = i === job.options.length - 1;
          const cls = first ? 'stand' : last ? 'fold' : 'middle';
          const kind = first ? 'hold the line' : last ? 'take the deal' : MOVE_KIND[o.archetype] ?? 'the other way';
          return `
        <button class="choice ${cls}" data-act="choose" data-choice="${esc(o.id)}">
          <span class="c-kind">${kind}</span>
          <span class="c-label">${esc(o.label)}</span>
          <span class="c-blurb">${esc(o.blurb)}</span>
          <span class="c-pay">${money(o.ifTheyHold)} if they hold \u00b7 ${money(o.ifTheyDont)} if they don\u2019t</span>
        </button>`;
        }).join('')}
      </div>
      ${markerPanel()}`;

  return `
  <section>
    ${coachPanel()}
    ${actionStrip()}
    <div class="tableau">
      <div class="tab-main">${brief}</div>
      <div class="tab-side">${moves}</div>
    </div>
    ${chosen ? '' : handPanel()}
    ${state.you?.roundNote ? `<p class="waiting" style="text-align:center;margin-top:14px">${esc(state.you.roundNote)}</p>` : ''}
  </section>`;
}

/* -------------------------------------------------------------- reckoning */

/** The one-line verdict stamped across your job, read off the moves. */
function verdictOf(g) {
  const known = g.members.filter((m) => m.move != null);
  if (!known.length) return 'THE LIGHTS WERE OUT';
  const sold = known.filter((m) => m.sold);
  const held = known.filter((m) => m.held);
  if (!sold.length && held.length === known.length) return 'EVERYBODY HELD';
  if (sold.length === known.length) return 'EVERYBODY FOLDED';
  if (sold.length > 1) return 'IT WENT SEVERAL WAYS';
  if (sold.length === 1) return `${sold[0].name.toUpperCase()} FOLDED`;
  return 'NOBODY QUITE HELD';
}

function viewReckoning() {
  const rows = state.reckoning ?? [];
  const mine = rows.find((g) => g.yours);
  const others = rows.filter((g) => !g.yours);
  const youId = state.players.find((p) => p.isYou)?.id;

  const revealRows = (g) => `
    <div class="reveal">
      ${g.members.map((m, i) => `
        <div class="reveal-row ${m.move == null ? 'unknown' : m.held ? 'stand' : m.sold ? 'fold' : 'middle'}" style="animation-delay:${i * 0.13}s">
          <div>
            <div class="reveal-name">${esc(m.name)}${m.brokePledge ? '<span class="tag broken">BROKE A PLEDGE</span>' : m.pledged ? '<span class="tag kept">KEPT HIS WORD</span>' : ''}${m.wentQuiet ? '<span class="tag quiet">SAID NOTHING</span>' : ''}${m.card ? `<span class="tag" style="color:var(--gold)">${esc(m.card.name.toUpperCase())}</span>` : ''}</div>
            <div class="reveal-verdict ${m.held ? 'stand' : m.sold ? 'fold' : ''}">${m.move ? esc(m.move) : 'YOU WERE NOT TOLD'}</div>
          </div>
          <div class="reveal-amount ${m.total == null ? '' : m.total >= 0 ? 'pos' : 'neg'}">${m.total == null ? '\u2014' : money(m.total)}</div>
        </div>`).join('')}
    </div>`;

  // Your job gets the whole table: a stamped verdict, the moves turning over
  // one at a time, then what it cost you.
  const yourBlock = (g, isMine = true) => {
    const you = g.members.find((m) => m.id === youId);
    const take = you?.total ?? 0;
    return `
    <article class="dossier showdown ${g.tone === 'action' ? 'action' : ''}" data-case="${isMine ? 'YOUR JOB' : 'ELSEWHERE'}">
      <div class="verdict">${esc(verdictOf(g))}</div>
      <h2>${esc(g.title)}</h2>
      ${revealRows(g)}
      ${isMine && you ? `<div class="your-take">
        <span class="yt-l">your end of it</span>
        <span class="yt-n ${take >= 0 ? 'pos' : 'neg'}">${money(take)}</span>
      </div>` : ''}
      <div class="narration" data-type="${esc(g.id)}">${esc(g.narration)}</div>
      ${isMine ? `<p class="coda">${esc(g.coda)}</p>` : ''}
      ${isMine && g.yourLines.length ? `<div class="rule"></div><div class="lines">
        ${g.yourLines.map((l) => `<div class="line"><b>${esc(l.label)}</b><span class="amt ${l.amount >= 0 ? 'pos' : 'neg'}">${money(l.amount)}</span></div>`).join('')}
      </div>` : ''}
    </article>`;
  };

  // The other rooms stay folded shut until somebody wants them.
  const elsewhereBlock = (g) => `
    <details class="recap elsewhere">
      <summary><b>${esc(g.title)}</b> \u00b7 ${esc(verdictOf(g).toLowerCase())}</summary>
      <div class="recap-job">
        ${revealRows(g)}
        <p class="recap-narr">${esc(g.narration)}</p>
        ${g.allLines ? g.allLines.map((p) => `
          <div class="lines" style="margin-top:8px">
            <div class="line" style="border:none"><b style="color:var(--ink)">${esc(p.name)}</b><span></span></div>
            ${p.lines.map((l) => `<div class="line"><b>${esc(l.label)}</b><span class="amt ${l.amount >= 0 ? 'pos' : 'neg'}">${money(l.amount)}</span></div>`).join('')}
          </div>`).join('') : ''}
      </div>
    </details>`;

  return `
  <section class="showdown-wrap">
    <p class="stamp">round ${state.round} of ${state.totalRounds}${state.twist?.name ? ` \u00b7 ${esc(state.twist.name)}` : ''}</p>
    ${mine ? yourBlock(mine) : ''}
    ${others.length ? `<p class="stamp" style="margin:26px 0 10px">${mine ? 'meanwhile, in the other rooms' : 'what happened tonight'}</p>
      ${mine ? others.map(elsewhereBlock).join('') : others.map((g) => yourBlock(g, false)).join('')}` : ''}
    <div class="row" style="justify-content:center;margin-top:20px">
      <button class="btn" data-act="ready">${state.round >= state.totalRounds ? 'TO THE LEDGER' : 'NEXT'}</button>
    </div>
    ${mode === 'online' ? `<p class="waiting" style="text-align:center;margin-top:10px">
      ${state.players.filter((p) => p.ready).length} of ${state.players.filter((p) => !p.bot).length} ready.
    </p><div class="rule"></div>${chatBlock()}` : ''}
  </section>`;
}

function runTypewriters() {
  for (const el of document.querySelectorAll('[data-type]')) {
    const key = el.getAttribute('data-type');
    if (typed.has(key)) continue;
    typed.add(key);
    const full = el.textContent;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || full.length > 900) continue;
    el.textContent = '';
    el.classList.add('typing');
    let i = 0;
    const step = () => {
      i += Math.max(1, Math.round(full.length / 220));
      el.textContent = full.slice(0, i);
      if (i < full.length) setTimeout(step, 12);
      else el.classList.remove('typing');
    };
    step();
  }
}

/* ------------------------------------------------------------------ event */

function viewEvent() {
  const e = state.event;
  if (!e) return '<div class="big-note">Nothing doing.</div>';
  return `
  <section>
    <article class="eventcard">
      <div class="eh">between jobs</div>
      <div class="en">${esc(e.name)}</div>
      <div class="el">${esc(e.line)}</div>
      <div class="eb" data-type="ev-${esc(e.id)}-${state.round}">${esc(e.narration ?? '')}</div>
      ${e.tally?.length ? `<div class="rule"></div><p class="stamp">the vote</p>
        <div class="tally">
          ${e.votes.map((v) => `<div class="tally-row"><span>${esc(v.voter)} named ${esc(v.target)}</span></div>`).join('')}
        </div>` : ''}
      ${e.lines?.length ? `<div class="rule"></div><div class="lines">
        ${e.lines.map((l) => `<div class="line"><b>${esc(l.name)} — ${esc(l.label)}</b><span class="amt ${l.amount >= 0 ? 'pos' : 'neg'}">${money(l.amount)}</span></div>`).join('')}
      </div>` : ''}
    </article>
    <div class="row" style="justify-content:center;margin-top:20px">
      <button class="btn" data-act="skip">ON WITH IT</button>
    </div>
  </section>`;
}

/* ------------------------------------------------------------------- vote */

function viewVote() {
  const v = state.voteState;
  if (!v) return '<div class="big-note">Counting.</div>';
  const voted = v.yourVote;
  return `
  <section>
    <article class="eventcard">
      <div class="eh">the table decides</div>
      <div class="en">${esc(v.name)}</div>
      <div class="el">${esc(v.line)}</div>
      <div class="eb">${esc(v.question)}</div>
    </article>
    ${voted ? `<div class="big-note">
      You named <b style="font-family:var(--mono);letter-spacing:0.1em">${esc(state.players.find((p) => p.id === voted)?.name ?? '?')}</b>.
      <div style="margin-top:10px;font-size:14px">${v.cast} of ${state.players.length} have said a name.</div>
    </div>` : `
      <p class="stamp" style="margin:22px 0 10px">say a name, out loud, with your own in the record</p>
      <div class="row" style="gap:10px">
        ${state.players.filter((p) => !p.isYou).map((p) => `
          <button class="ghost-btn" data-act="vote" data-id="${p.id}" style="padding:14px 18px;font-size:13px">${esc(p.name)}</button>`).join('')}
      </div>`}
    ${state.local && voted ? `<div class="row" style="justify-content:center;margin-top:18px"><button class="btn" data-act="seatDone">${state.local.seatCount > 1 ? 'PASS IT ON' : 'DONE'}</button></div>` : ''}
  </section>`;
}

/* ------------------------------------------------------------- accusation */

function viewAccusation() {
  const voted = state.accusation?.yourVote;
  return `
  <section>
    <p class="stamp">last thing before the ledger</p>
    <h2 style="font-family:var(--mono);letter-spacing:0.14em;font-size:clamp(20px,5vw,30px);margin:8px 0 14px">NAME THE RAT</h2>
    <p style="max-width:52ch;color:var(--ink-soft)">
      One person at this table has been on the DA’s payroll since before the first job — paid per betrayal, all night, whatever they told you.
      Point at them. Get it right and it is worth ${money(15)}. Get it wrong and you have just paid them for the privilege.
    </p>
    <div class="rule"></div>
    ${voted ? `<div class="big-note">
      You named <b style="font-family:var(--mono);letter-spacing:0.1em">${esc(state.players.find((p) => p.id === voted)?.name ?? '?')}</b>.
      <div style="margin-top:10px;font-size:14px">${state.accusation.voted} of ${state.players.length} have pointed.</div>
    </div>` : `
      <div class="row" style="gap:10px">
        ${state.players.filter((p) => !p.isYou).map((p) => `
          <button class="ghost-btn" data-act="accuse" data-id="${p.id}" style="padding:14px 18px;font-size:13px">${esc(p.name)}</button>`).join('')}
      </div>`}
  </section>`;
}

/* ----------------------------------------------------------------- ledger */

function viewLedger() {
  const L = state.ledger;
  if (!L) return '<div class="big-note">Counting.</div>';
  const winner = L.standings[0];
  const tut = L.tutorial;

  return `
  <section>
    ${tut ? `<div class="coach" style="margin-bottom:20px">
      <div class="coach-who">${esc(tut.coachName)}</div>
      <div class="coach-says">“${esc(tut.closing)}”</div>
      <div class="coach-beat">THAT WAS THE FIRST NIGHT · NONE OF IT COUNTED</div>
    </div>` : ''}
    <p class="stamp">${tut
      ? 'how the practice went'
      : `the ledger · ${state.totalRounds} jobs · ${state.players.length} at the table`}</p>
    <h2 style="font-family:var(--mono);letter-spacing:0.16em;font-size:clamp(22px,6vw,36px);margin:8px 0 6px">
      ${esc(winner.name.toUpperCase())} WALKS
    </h2>
    <p style="color:var(--ink-soft);font-style:italic;margin-bottom:22px">${esc(winnerLine(L))}</p>

    <div class="standings">
      ${L.standings.map((s) => `
        <div class="standing ${s.rank === 1 ? 'first' : ''}">
          <div class="rank">${s.rank}</div>
          <div>
            <div class="nm">${s.crew ? `<span class="crew-dot" style="background:${s.crew.colour}"></span>` : ''}${esc(s.name)}${s.bot ? ' <span style="color:var(--ink-faint);font-size:10px">GHOST</span>' : ''}</div>
            <div class="rl">${[
              s.role ? `${esc(s.role.name)} — ${esc(s.role.tag)}` : '',
              `held ${s.stats.stands}, folded ${s.stats.folds}`
                + (s.stats.middles ? `, ${s.stats.middles} somewhere in between` : '')
                + (s.stats.pledgesBroken ? `, broke ${s.stats.pledgesBroken} pledge${s.stats.pledgesBroken > 1 ? 's' : ''}` : '')
                + (s.stats.cardsPlayed ? `, played ${s.stats.cardsPlayed} card${s.stats.cardsPlayed > 1 ? 's' : ''}` : ''),
            ].filter(Boolean).join(' · ')}</div>
          </div>
          <div class="amt">${money(s.score)}</div>
        </div>`).join('')}
    </div>

    ${L.crews ? `<p class="stamp">the crews</p>
      <div class="lines" style="margin:10px 0 24px">
        ${L.crews.totals.map((c) => `<div class="line"><b>${esc(c.name)}${c.name === L.crews.winner ? ' — on top' : ''}</b><span class="amt ${c.name === L.crews.winner ? 'pos' : ''}">${money(c.total)}</span></div>`).join('')}
      </div>` : ''}

    ${L.secrets.length ? `
      <p class="stamp">what actually happened</p>
      <div class="dossier" style="margin:10px 0 24px;border-left-color:var(--gold)">
        <h2 style="font-size:17px">The table was told one thing</h2>
        <div class="lines">
          ${L.secrets.map((s) => `<div class="line"><b>Round ${s.round} · ${esc(s.job)} — ${esc(s.name)} was shown ${s.shown === 'stand' ? 'holding the line' : 'folding'}</b><span class="amt neg">${s.truth === 'fold' ? 'ACTUALLY FOLDED' : 'ACTUALLY HELD'}</span></div>`).join('')}
        </div>
      </div>` : ''}

    ${L.rat ? `
      <p class="stamp">the rat</p>
      <div class="dossier" style="margin:10px 0 24px;border-left-color:var(--red)">
        <h2 style="font-size:19px">${esc(L.rat.name)} was on the payroll the entire time</h2>
        <p style="color:var(--ink-soft)">
          ${L.accusations.filter((a) => a.correct).length === 0
            ? 'Nobody called it. Not one person. They were paid for every single name they gave up and then paid again for the silence around it.'
            : `${esc(L.accusations.filter((a) => a.correct).map((a) => a.voter).join(', '))} saw it. Everybody else paid for the privilege of being wrong.`}
        </p>
        <div class="lines" style="margin-top:10px">
          ${L.accusations.map((a) => `<div class="line"><b>${esc(a.voter)} pointed at ${esc(a.target)}</b><span class="amt ${a.correct ? 'pos' : 'neg'}">${a.correct ? 'RIGHT' : 'WRONG'}</span></div>`).join('')}
        </div>
      </div>` : ''}

    <p class="stamp">the bonds</p>
    <p style="color:var(--ink-soft);font-size:14px;margin:6px 0 4px">
      Every line is two people who were locked in a room together. This is what it came to.
    </p>
    ${bondWeb(L.bonds, L.standings)}
    <div class="legend" style="margin-bottom:24px">
      <span><i style="background:#5fa87c"></i>HELD FOR EACH OTHER</span>
      <span><i style="background:#b5232b"></i>SOMEBODY FOLDED</span>
      <span><i style="background:#67635b"></i>BOTH FOLDED</span>
    </div>

    <div class="lines" style="margin-bottom:26px">
      ${L.bonds.slice().sort((a, b) => b.trust - a.trust).map((b) => `
        <div class="line"><b>${esc(b.aName)} &amp; ${esc(b.bName)}</b><span>${bondVerdict(b)}</span></div>`).join('')}
    </div>

    ${L.awards.length ? `<p class="stamp">the record</p>
      <div class="awards" style="margin:10px 0 26px">
        ${L.awards.map((a) => `
          <div class="award">
            <div class="al">${esc(a.label)}</div>
            <div class="an">${esc(nameList(a.names))}</div>
            <div class="ab">${esc(a.blurb)}</div>
            <div class="av">${esc(a.value)}</div>
          </div>`).join('')}
      </div>` : ''}

    ${L.finalLines.length ? `<p class="stamp">settled after the last job</p>
      <div class="lines" style="margin:10px 0 26px">
        ${L.finalLines.flatMap((f) => f.lines.map((l) =>
          `<div class="line"><b>${esc(f.name)} — ${esc(l.label)}</b><span class="amt ${l.amount >= 0 ? 'pos' : 'neg'}">${money(l.amount)}</span></div>`)).join('')}
      </div>` : ''}

    <p class="stamp">the whole night, job by job</p>
    <div style="margin:10px 0 26px">
      ${L.history.map((r) => `
        <details class="recap">
          <summary><b>ROUND ${r.round}</b> · ${esc(r.twist.name)}${r.heat != null ? ` · heat ${r.heat}` : ''}</summary>
          ${r.groups.map((g) => `
            <div class="recap-job">
              <div class="recap-title">${esc(g.title)}${g.switched ? ' <span style="color:var(--gold)">· SWITCHED</span>' : ''}${g.callback ? ' <span style="color:var(--red-bright)">· CALLBACK</span>' : ''}</div>
              <div class="recap-line">${g.members.map((m) =>
                `<span style="color:${m.trueChoice === 'stand' ? 'var(--good)' : 'var(--red-bright)'}">${esc(m.name)} ${m.trueChoice === 'stand' ? 'held' : 'folded'}</span>`).join(' · ')}</div>
              <div class="recap-narr">${esc(g.narration)}</div>
            </div>`).join('')}
          ${r.cards.length ? `<div class="recap-job"><div class="recap-title">CARDS</div><div class="recap-narr">
            ${r.cards.map((c) => `${esc(c.by)} played ${esc(c.cardId)}${c.target ? ` on ${esc(c.target)}` : ''}${c.cancelled ? ' (cancelled)' : ''}`).join(' · ')}
          </div></div>` : ''}
        </details>`).join('')}
    </div>

    <div class="rule"></div>
    ${state.isHost
      ? `<button class="btn" data-act="rematch" style="width:100%">${tut ? 'NOW PLAY IT FOR REAL' : 'SAME TABLE, NEW NIGHT'}</button>`
      : `<p class="waiting" style="text-align:center">Waiting on the host to ${tut ? 'start the real one' : 'call another one'}.</p>`}
    <p style="text-align:center;margin-top:12px"><button class="link-btn" data-act="leave">leave the table</button></p>
    ${mode === 'online' ? `<div class="rule"></div>${chatBlock()}` : ''}
  </section>`;
}

function nameList(names) {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

function winnerLine(L) {
  const w = L.standings[0];
  const s = w.stats;
  if (s.secretFolds > 0) return `Folded ${s.secretFolds} time${s.secretFolds > 1 ? 's' : ''} that nobody ever found out about, and is going home with the most money and a clean reputation.`;
  if (s.folds === 0) return 'Never folded once, and still came out on top. That is either integrity or extremely good luck.';
  if (s.betrayals >= 3) return `Folded on people ${s.betrayals} times and is going home with the most money. Enjoy the drive.`;
  if (s.pledgesBroken > 0) return `Gave their word ${s.pledges} times and broke it ${s.pledgesBroken}. The money does not know the difference.`;
  return 'Read the room better than the room read them.';
}

function bondVerdict(b) {
  const betrayals = b.betrayA + b.betrayB;
  if (b.rounds === 0) return 'never worked together';
  if (betrayals === 0 && b.mutualFold === 0 && b.murky === 0) {
    return `<span style="color:var(--good)">clean, ${b.mutualStand}/${b.rounds}</span>`;
  }
  if (betrayals === 0 && b.mutualFold === 0) {
    return `<span style="color:var(--gold)">never quite straight with each other</span>`;
  }
  if (betrayals === 0) return `both folded ${b.mutualFold}× — mutually assured`;
  if (b.betrayA && b.betrayB) return `<span style="color:var(--red-bright)">went both ways</span>`;
  const traitor = b.betrayA ? b.aName : b.bName;
  const mark = b.betrayA ? b.bName : b.aName;
  return `<span style="color:var(--red-bright)">${esc(traitor)} folded on ${esc(mark)}</span>`;
}

function bondWeb(bonds, standings) {
  const n = standings.length;
  const w = 560;
  const h = 440;
  const r = Math.min(w, h) / 2 - 56;
  const cx = w / 2;
  const cy = h / 2;
  const pos = new Map();
  standings.forEach((s, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    pos.set(s.id, { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, a });
  });

  const edges = bonds.map((b) => {
    const p1 = pos.get(b.a); const p2 = pos.get(b.b);
    if (!p1 || !p2) return '';
    const betrayals = b.betrayA + b.betrayB;
    let colour = '#67635b';
    let dash = '';
    if (betrayals > 0) colour = '#b5232b';
    else if (b.mutualStand > 0) colour = '#5fa87c';
    if (b.mutualFold > 0 && betrayals === 0) dash = 'stroke-dasharray="4 5"';
    const width = Math.min(6, 1 + b.rounds * 1.2);
    const op = betrayals > 0 ? 0.85 : 0.35 + (b.rounds > 0 ? (b.mutualStand / b.rounds) * 0.6 : 0);
    return `<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}"
      stroke="${colour}" stroke-width="${width.toFixed(1)}" stroke-opacity="${op.toFixed(2)}" ${dash} stroke-linecap="round" />`;
  }).join('');

  const nodes = standings.map((s) => {
    const p = pos.get(s.id);
    const anchor = Math.abs(Math.cos(p.a)) < 0.3 ? 'middle' : Math.cos(p.a) > 0 ? 'start' : 'end';
    const lx = Math.max(6, Math.min(w - 6, cx + Math.cos(p.a) * (r + 18)));
    const ly = cy + Math.sin(p.a) * (r + 18) + 4;
    const label = s.name.length > 13 ? `${s.name.slice(0, 12)}…` : s.name;
    return `
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="7" fill="#0b0b0d" stroke="${s.rank === 1 ? '#c9a227' : '#e9e3d6'}" stroke-width="1.5" />
      <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}" fill="#9d9789"
        font-family="ui-monospace, 'Courier New', monospace" font-size="11" letter-spacing="1">${esc(label)}</text>`;
  }).join('');

  return `<svg class="bondweb" viewBox="0 0 ${w} ${h}" role="img" aria-label="A web of who trusted whom">${edges}${nodes}</svg>`;
}

/* ------------------------------------------------------------ card modal */

function showCard() {
  const role = state?.you?.role;
  if (!role) return;
  const crew = state.you.crew;
  $('#cardModalBody').innerHTML = `
    <div class="card-face" style="border-top-color:${role.colour}">
      <div class="ct">your card · nobody else sees this</div>
      <div class="cn" style="color:${role.colour}">${esc(role.name)}</div>
      <div class="ct" style="margin-top:2px">${esc(role.tag)}</div>
      <div class="cb">${esc(role.blurb)}</div>
      <div class="co">${esc(role.objective)}</div>
      ${crew ? `<div class="rule"></div><div class="ct">your crew</div>
        <div style="font-family:var(--mono);font-size:14px;color:${crew.colour}">${esc(crew.name)}</div>` : ''}
      ${state.you.debts?.length ? `<div class="rule"></div><div class="ct">what you owe</div>
        ${state.you.debts.map((d) => `<div style="font-size:14px;color:var(--red-bright)">${esc(d.label)} — ${money(d.amount)}</div>`).join('')}` : ''}
    </div>`;
  $('#cardModal').classList.remove('hidden');
}

/**
 * Copy the join link. `navigator.clipboard` is not there on http:// pages or in
 * older browsers, so fall back to selecting the text and letting them copy it
 * themselves rather than doing nothing and looking broken.
 */
async function copyLink(btn) {
  const link = joinUrl(state?.code ?? '');
  let copied = false;
  try {
    await navigator.clipboard.writeText(link);
    copied = true;
  } catch { copied = false; }

  if (copied) {
    toast('link copied');
    btn.textContent = 'COPIED';
    setTimeout(() => { if (btn.isConnected) btn.textContent = 'COPY THE LINK'; }, 1600);
    return;
  }
  const el = document.querySelector('.invite-url');
  if (el) {
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }
  toast('select the link and copy it');
}

/* ----------------------------------------------------------------- events */

document.addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-act]');
  if (!btn) return;
  const act = btn.getAttribute('data-act');

  switch (act) {
    case 'modeDevice': {
      const name = ($('#nameInput')?.value ?? '').trim();
      if (name) { me.name = name; rememberName(name); }
      startLocal('device').then(() => { if (me.name) send({ t: 'addLocal', name: me.name }); });
      break;
    }
    case 'modeSolo': {
      const name = ($('#nameInput')?.value ?? '').trim() || 'You';
      me.name = name;
      rememberName(name);
      startLocal('solo');
      break;
    }
    case 'addLocal': {
      const input = $('#localName');
      if (input?.value.trim()) { send({ t: 'addLocal', name: input.value.trim() }); input.value = ''; }
      break;
    }
    case 'hand': handUp = !handUp; render(); break;
    case 'copyLink': copyLink(btn); break;
    case 'forgetRoom': clearRoomFromUrl(); render(); break;
    case 'removeLocal': send({ t: 'removeLocal', id: btn.dataset.id }); break;
    case 'removeBot': send({ t: 'removeBot', id: btn.dataset.id }); break;
    case 'addBot': send({ t: 'addBot' }); break;
    case 'toggleTimers': send({ t: 'config', timers: !state.config.timers }); break;
    case 'toggleCards': send({ t: 'config', cards: !state.config.cards }); break;
    case 'start': send({ t: 'start' }); break;
    case 'tutorial': typed = new Set(); send({ t: 'tutorial' }); break;
    case 'skip': send({ t: 'skip' }); break;
    case 'seatTake': send({ t: 'seatTake' }); break;
    case 'seatDone': send({ t: 'seatDone' }); break;
    case 'whisper': {
      const box = $('#whisperBox');
      send({ t: 'whisper', text: box.value });
      toast('Sent.');
      break;
    }
    case 'pledge': send({ t: 'pledge', value: btn.dataset.val === '1' }); break;
    case 'marker': send({ t: 'marker' }); break;
    case 'power': send({ t: 'power', target: btn.dataset.id }); break;
    case 'pickCard': {
      const id = btn.dataset.card;
      const card = state.you?.hand.find((c) => c.id === id);
      if (card?.needsTarget) { pendingCard = id; render(); }
      else send({ t: 'card', card: id });
      break;
    }
    case 'playCard': {
      send({ t: 'card', card: btn.dataset.card, target: btn.dataset.target });
      pendingCard = null;
      break;
    }
    case 'cancelCard': pendingCard = null; render(); break;
    case 'choose': send({ t: 'choose', choice: btn.dataset.choice }); break;
    case 'ready': send({ t: 'ready' }); break;
    case 'vote': send({ t: 'vote', target: btn.dataset.id }); break;
    case 'accuse': send({ t: 'accuse', target: btn.dataset.id }); break;
    case 'rematch': typed = new Set(); send({ t: 'rematch' }); break;
    case 'chat': {
      const input = $('#chatInput');
      if (input?.value.trim()) { send({ t: 'chat', text: input.value }); input.value = ''; }
      break;
    }
    case 'leave': {
      clearSession();
      location.hash = '';
      location.reload();
      break;
    }
    default: break;
  }
});

document.addEventListener('input', (ev) => {
  if (ev.target.id === 'whisperBox') draft = ev.target.value;
});

document.addEventListener('change', (ev) => {
  if (ev.target.id === 'roundsSel') send({ t: 'config', rounds: Number(ev.target.value) });
  if (ev.target.id === 'paceSel') send({ t: 'config', pace: ev.target.value });
});

document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter' && ev.target.id === 'chatInput') {
    if (ev.target.value.trim()) { send({ t: 'chat', text: ev.target.value }); ev.target.value = ''; }
  }
  if (ev.key === 'Enter' && ev.target.id === 'localName') {
    if (ev.target.value.trim()) { send({ t: 'addLocal', name: ev.target.value.trim() }); ev.target.value = ''; }
  }
  if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey) && ev.target.id === 'whisperBox') {
    send({ t: 'whisper', text: ev.target.value });
    toast('Sent.');
  }
  if (ev.key === 'Escape') $('#cardModal').classList.add('hidden');
});

document.addEventListener('submit', (ev) => {
  if (ev.target.id !== 'doorForm') return;
  ev.preventDefault();
  // the quick-join door is a form so Enter works; route it like the button
  if ($('#joinBtn')) enterRoom('joinBtn');
});

document.addEventListener('click', (ev) => {
  const id = ev.target.closest('button')?.id;
  if (id !== 'createBtn' && id !== 'joinBtn') return;
  ev.preventDefault();
  enterRoom(id);
});

function enterRoom(id) {
  const name = ($('#nameInput')?.value ?? '').trim();
  if (!name) { toast('They need something to call you.'); $('#nameInput')?.focus(); return; }
  me.name = name;
  rememberName(name);

  const code = id === 'createBtn' ? null : ($('#codeInput')?.value ?? '').trim().toUpperCase();
  if (id !== 'createBtn' && code.length !== 4) { toast('Four letters. Ask again.'); return; }

  // A server here is the simple case. Without one the table lives in somebody's
  // browser and the phones talk to it directly.
  if (socketReady) {
    mode = 'online';
    if (id === 'createBtn') send({ t: 'create', name });
    else send({ t: 'join', code, name });
    return;
  }
  if (!signalUrl) { toast('Nowhere to put a table. Try one device, or the ghosts.'); return; }
  if (id === 'createBtn') startPeerHost(name);
  else startPeerGuest(code, name);
}

window.addEventListener('beforeunload', (ev) => {
  // only the browser-hosted table dies with the tab; a server keeps the rest
  if (!(peer && peer.constructor?.name === 'PeerHost') || !state || state.phase === 'lobby') return;
  ev.preventDefault();
  ev.returnValue = '';
});

$('#cardBtn').addEventListener('click', showCard);
$('#cardClose').addEventListener('click', () => $('#cardModal').classList.add('hidden'));
$('#cardModal').addEventListener('click', (ev) => {
  if (ev.target.id === 'cardModal') $('#cardModal').classList.add('hidden');
});

/* -------------------------------------------------------------------- go */

app.innerHTML = viewDoor();
serverPresent()
  .then(async (live) => {
    if (live) { connect(); return; }
    await findSignal();                        // maybe peers can still find each other
    const saved = readSession();
    const preset = codeFromUrl();
    // a guest who reloaded: the table is in somebody else's tab, so walk back
    // in through the front door rather than sitting on a dead screen
    if (signalUrl && preset && saved?.code === preset && saved?.token) {
      startPeerGuest(preset, me.name || 'someone');
      return;
    }
    render();
  })
  .catch(() => render());
// the QR encoder is only ever needed in an online lobby, and it is not worth
// blocking the door on; draw again if we are already somewhere it shows
import('./qr.js').then((m) => {
  qrModule = m;
  if (state) render();
}).catch(() => { /* no QR, the code and link still work */ });
requestAnimationFrame(tickTimer);
