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
let socketReady = false;
let state = null;
let me = { playerId: null, token: null, code: null, name: localStorage.getItem('standoff.name') ?? '' };
let draft = '';
let clockOffset = 0;
let phaseStart = Date.now();
let lastPhaseKey = '';
let typed = new Set();
let reconnectDelay = 500;
let pendingCard = null;              // a card waiting on a target

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

function send(obj) {
  if (mode === 'online') {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
    return;
  }
  if (local) {
    local.send(obj);
    if (local.error) { toast(local.error); local.error = null; }
  }
}

function applyState(next) {
  const first = !state;
  state = next;
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
    return !!body?.ok;
  } catch {
    return false;
  }
}

function connect() {
  let url;
  try {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    if (!location.host) return;                   // opened as a file:// page
    url = `${proto}://${location.host}`;
  } catch { return; }

  try { ws = new WebSocket(url); } catch { return; }

  ws.onopen = () => {
    socketReady = true;
    reconnectDelay = 500;
    if (!mode) render();
    const saved = JSON.parse(localStorage.getItem('standoff.session') ?? 'null');
    if (saved?.code && saved?.token) send({ t: 'resume', code: saved.code, token: saved.token });
  };

  ws.onmessage = (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    if (msg.t === 'welcome') {
      mode = 'online';
      me.playerId = msg.playerId;
      me.token = msg.token;
      me.code = msg.code;
      localStorage.setItem('standoff.session', JSON.stringify({ code: msg.code, token: msg.token }));
      history.replaceState(null, '', `#${msg.code}`);
    } else if (msg.t === 'state') {
      if (mode !== 'online') return;
      applyState(msg.state);
    } else if (msg.t === 'error') {
      toast(msg.msg);
    }
  };

  ws.onclose = () => {
    if (mode === 'online') {
      setTimeout(connect, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, 8000);
    } else {
      socketReady = false;
      if (!mode) render();
    }
  };
  ws.onerror = () => { try { ws.close(); } catch { /* ignore */ } };
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
      <div class="n"><span class="dot ${dot}"></span>${crewDot(p)}${esc(p.name)}${p.bot ? ' <span style="color:var(--bone-faint)">○</span>' : ''}</div>
      <div class="s">${money(p.score)}
        ${p.markers ? `<span class="marks">${'†'.repeat(Math.min(p.markers, 4))}</span>` : ''}
        ${p.handCount ? `<span style="color:var(--bone-faint)">■${p.handCount}</span>` : ''}
        ${sittingOut ? '<span style="color:var(--bone-faint)">OUT</span>' : ''}
        ${p.played ? '<span style="color:var(--gold)">◆</span>' : ''}
      </div>
    </div>`;
  }).join('');
}

/* ------------------------------------------------------------------- door */

function viewDoor() {
  const preset = (location.hash ?? '').replace('#', '').toUpperCase().slice(0, 4);
  return `
  <section class="door">
    <h1 class="title">STANDOFF</h1>
    <p class="tagline">Two rooms. One question. However many friendships you brought with you.</p>

    <form id="doorForm" autocomplete="off" style="margin-bottom:18px">
      <input type="text" id="nameInput" maxlength="18" placeholder="WHAT THEY CALL YOU" value="${esc(me.name)}" />
    </form>

    <div class="mode-grid">
      ${socketReady ? `
        <button class="mode-btn" id="createBtn">
          <span class="mb-t">NEW TABLE</span>
          <span class="mb-s">Everybody on their own phone. Share a four-letter code.</span>
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

    <div class="rule" style="max-width:340px;margin:30px auto"></div>
    <p class="stamp">how it works</p>
    <p style="max-width:44ch;margin:10px auto;color:var(--bone-dim);font-size:15px">
      Every round you are locked in a room with somebody you know. You can talk first, play a card,
      and swear to anything you like. Then you choose, alone, whether to hold the line or take the deal.
      Holding together pays. Folding on somebody who held pays better. Everybody folding pays nobody.
    </p>
    <p style="max-width:44ch;margin:10px auto;color:var(--bone-faint);font-size:14px;font-style:italic">
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
    ` : `
      <p class="stamp">say these four letters out loud</p>
      <div class="code-big">${esc(state.code)}</div>
      <p style="color:var(--bone-dim);font-size:14px">
        Anybody on this wifi opens this page and types it in. ${roster.length}/${state.maxPlayers} seated.
      </p>`}

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
            <div class="who">${esc(p.name)}${p.isYou && !isLocal ? ' <span style="color:var(--gold);font-size:10px">— YOU</span>' : ''}${p.id === state.hostId && !isLocal ? ' <span style="color:var(--bone-faint);font-size:10px">— HOST</span>' : ''}</div>
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
      <p style="color:var(--bone-faint);font-size:13px;margin-top:-6px">
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
      <button class="btn" data-act="start" ${roster.length < 2 && mode !== 'solo' ? 'disabled' : ''} style="width:100%">
        ${roster.length < 2 && mode !== 'solo' ? 'WAITING FOR SOMEBODY TO BETRAY'
          : `DEAL IN · ${mode === 'solo' ? 'YOU AND THREE GHOSTS' : `${roster.length} PLAYERS`} · ${state.config.rounds} ROUNDS`}
      </button>
      <p style="color:var(--bone-faint);font-size:13px;text-align:center;margin-top:10px">
        Ghosts are stand-ins with fixed habits. Good for odd numbers and for finding out how you play.
      </p>
    ` : `<p class="waiting" style="text-align:center;padding:14px">Waiting on ${esc(state.players.find((p) => p.id === state.hostId)?.name ?? 'the host')} to deal.</p>`}

    ${mode === 'online' ? `<div class="rule"></div>${chatBlock()}` : ''}
  </section>`;
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
    <p style="color:var(--bone-faint);font-size:12px;font-family:var(--mono);letter-spacing:0.2em;margin-top:22px">
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
  const who = job.kind === 'table'
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
  if (!job) return sittingOutNote();
  return `
  <section>
    ${actionStrip()}
    ${heatNote()}
    ${twistBanner()}
    ${jobCard(job)}
    <div class="rule"></div>
    ${payoffPanel(job)}
    <p class="waiting" style="text-align:center;margin-top:18px">
      ${state.twist?.id === 'notalk' ? 'No talking on this one. The squeeze comes straight away.' : 'Table talk in a moment. Think about what you are going to say.'}
    </p>
    ${state.isHost ? `<div class="row" style="justify-content:center;margin-top:12px"><button class="ghost-btn" data-act="skip">SKIP AHEAD</button></div>` : ''}
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
    the table is <b style="color:${state.heat.key === 'warm' ? 'var(--gold)' : 'var(--blood-bright)'}">${esc(state.heat.name)}</b> · ${esc(state.heat.line)}
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
          <td style="text-align:left;color:var(--bone)">${esc(o.label)}</td>
          <td class="${o.ifTheyHold >= o.ifTheyDont ? 'good' : ''}"><b>${money(o.ifTheyHold)}</b></td>
          <td class="${o.ifTheyDont > o.ifTheyHold ? 'good' : 'bad'}"><b>${money(o.ifTheyDont)}</b></td>
        </tr>`).join('')}
    </table>
    <p style="color:var(--bone-faint);font-size:13px;margin-top:8px">
      Nothing here is safe and nothing here is the decent thing. What is worth doing depends
      entirely on what you think everybody else is about to do.
    </p>`;
}

/* ------------------------------------------------------------------- hand */

function handPanel() {
  const you = state.you;
  if (!you || !state.config.cards) return '';
  if (you.playedThisRound) {
    return `<div class="hand-wrap">
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
      return `<div class="hand-wrap">
        <p class="stamp">${esc(card.name)} — on who?</p>
        <div class="row tight" style="margin-top:8px">
          ${targets.map((p) => `<button class="ghost-btn" data-act="playCard" data-card="${card.id}" data-target="${p.id}">${esc(p.name)}</button>`).join('')}
          <button class="link-btn" data-act="cancelCard">never mind</button>
        </div>
      </div>`;
    }
  }

  return `<div class="hand-wrap">
    <p class="stamp">your hand · one card a round</p>
    <div class="hand">
      ${you.hand.map((c) => `
        <button class="pcard ${c.face}" data-act="pickCard" data-card="${c.id}">
          <span class="pc-face">${c.face === 'up' ? 'FACE UP' : 'FACE DOWN'}</span>
          <span class="pc-name">${esc(c.name)}</span>
          <span class="pc-text">${esc(c.text)}</span>
        </button>`).join('')}
    </div>
    <p style="color:var(--bone-faint);font-size:12.5px;margin-top:2px">
      Face-up cards are announced to the people you are working with. Face-down ones stay yours until the reckoning.
    </p>
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

  return `
  <section>
    ${twistBanner()}
    ${declaredPanel()}
    <p class="stamp">you have a minute with ${esc(partners)}</p>
    <h2 style="font-family:var(--mono);letter-spacing:0.1em;font-size:19px;margin:6px 0 16px">${esc(job.title)}</h2>

    ${job.incoming.length ? job.incoming.map((w) => `
      <div class="whisper-in">
        <div class="from">${esc(w.from)} says</div>
        <div class="body">“${esc(w.text)}”</div>
      </div>`).join('') : '<p class="waiting">Nothing back yet. They are thinking about it, or they want you to think they are.</p>'}

    <div class="rule"></div>
    <p class="stamp">what you tell ${esc(partners)}</p>
    <textarea id="whisperBox" maxlength="180" placeholder="Say whatever you need to say.">${esc(draft || job.whisperByYou)}</textarea>
    <div class="row spread" style="margin-top:8px">
      <span style="font-size:12px;color:var(--bone-faint);font-family:var(--mono)">THEY SEE THIS IMMEDIATELY</span>
      <button class="ghost-btn" data-act="whisper">SEND IT</button>
    </div>

    <div class="pledge-box ${pledged ? 'on' : ''}">
      <div class="row spread">
        <div>
          <div style="font-family:var(--mono);font-size:12px;letter-spacing:0.18em;color:${pledged ? 'var(--gold)' : 'var(--bone-dim)'}">
            ${pledged ? 'YOU HAVE GIVEN YOUR WORD' : 'GIVE YOUR WORD'}
          </div>
          <div style="font-size:14px;color:var(--bone-dim);margin-top:4px">
            A pledge is public to ${esc(partners)}. Breaking one goes in the record with your name on it.
          </div>
        </div>
        <button class="ghost-btn ${pledged ? 'on' : ''}" data-act="pledge" data-val="${pledged ? '0' : '1'}">${pledged ? 'TAKE IT BACK' : 'I SWEAR IT'}</button>
      </div>
      ${job.pledgesVisible.length ? `<div style="margin-top:10px;font-family:var(--mono);font-size:11px;color:var(--bone-faint);letter-spacing:0.1em">
        ${openBook ? 'OPEN BOOK — THE WHOLE TABLE: ' : ''}${job.pledgesVisible.map((p) => `${esc(p.name)}: ${p.pledged ? '<span style="color:var(--gold)">SWORE IT</span>' : 'said nothing'}`).join(' · ')}
      </div>` : ''}
    </div>

    ${handPanel()}
    ${markerPanel()}
    ${powerPanel()}

    <div class="row" style="justify-content:center;margin-top:18px">
      ${state.local ? `<button class="btn" data-act="seatDone">DONE — PASS IT ON</button>`
        : state.isHost ? `<button class="ghost-btn" data-act="skip">EVERYBODY’S SAID ENOUGH</button>` : ''}
    </div>
  </section>`;
}

function markerPanel() {
  const you = state.you;
  if (!you) return '';
  if (you.markerTarget) {
    return `<div class="pledge-box on" style="border-color:var(--blood)">
      <div style="font-family:var(--mono);font-size:12px;letter-spacing:0.18em;color:var(--blood-bright)">MARKER CALLED IN</div>
      <div style="font-size:14px;color:var(--bone-dim);margin-top:4px">If they fold on you this round, they forfeit the whole take and you collect half of it.</div>
    </div>`;
  }
  if (!you.markers) return '';
  return `<div class="pledge-box" style="border-color:rgba(181,35,43,0.4)">
    <div class="row spread">
      <div>
        <div style="font-family:var(--mono);font-size:12px;letter-spacing:0.18em;color:var(--blood-bright)">
          YOU ARE HOLDING ${you.markers} MARKER${you.markers > 1 ? 'S' : ''}
        </div>
        <div style="font-size:14px;color:var(--bone-dim);margin-top:4px">
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

  return `
  <section>
    ${actionStrip()}
    ${job.switched ? `<div class="twist-banner"><div class="tw-name">SWITCHED</div><div class="tw-body">Assignments were re-cut after the meeting. You are not locked in with the person you were talking to. You are locked in with <b>${esc(job.partners.map((p) => p.name).join(' and '))}</b>, and this is a different job entirely.</div></div>` : ''}
    ${job.switched ? jobCard(job) : `
      <p class="stamp">${esc(job.title)} · no. ${esc(job.caseNo)}</p>
      <div class="pressure" style="margin:10px 0 18px">${esc(job.pressure)}</div>`}

    ${declaredPanel()}

    ${job.lookout?.length ? `<div class="twist-banner" style="border-color:var(--gold)">
      <div class="tw-name">THE LOOKOUT</div>
      <div class="tw-body">${job.lookout.map((l) => `${esc(l.name)} has locked in <b>${esc(l.label)}</b>`).join('. ')}.</div>
    </div>` : ''}

    ${job.leak ? `<div class="twist-banner" style="border-color:var(--blood)">
      <div class="tw-name" style="color:var(--blood-bright)">THE WIRE</div>
      <div class="tw-body">A little bird says ${esc(job.leak.from)} has already locked in <b>${esc(job.leak.label ?? '')}</b>. Believe it or don’t.</div>
    </div>` : ''}

    ${job.incoming.length ? `<div class="whisper-in">
      <div class="from">${esc(job.incoming[0].from)} said, before all this</div>
      <div class="body">“${esc(job.incoming[0].text)}”</div>
    </div>` : ''}

    ${chosen ? `
      <div class="big-note" style="padding:26px 0">
        <div class="stamp" style="margin-bottom:10px">you locked in</div>
        <div style="font-family:var(--mono);font-size:22px;letter-spacing:0.14em;color:var(--gold)">
          ${esc(job.options.find((o) => o.id === chosen)?.label ?? '')}
        </div>
        <div style="margin-top:14px;color:var(--bone-faint)">
          ${job.lockedCount} of ${job.groupSize} have decided. Nobody can change their mind now.
        </div>
      </div>` : `
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
      ${handPanel()}
      ${markerPanel()}`}
    ${state.you?.roundNote ? `<p class="waiting" style="text-align:center;margin-top:14px">${esc(state.you.roundNote)}</p>` : ''}
  </section>`;
}

/* -------------------------------------------------------------- reckoning */

function viewReckoning() {
  const rows = state.reckoning ?? [];
  const mine = rows.find((g) => g.yours);
  const others = rows.filter((g) => !g.yours);

  const groupBlock = (g, isMine) => `
    <article class="dossier ${g.tone === 'action' ? 'action' : ''}" data-case="${isMine ? 'YOUR JOB' : 'ELSEWHERE'}" style="margin-bottom:16px;${g.tone === 'action' ? '' : `border-left-color:${isMine ? 'var(--blood)' : 'var(--edge)'}`}">
      <h2 style="font-size:17px">${esc(g.title)}</h2>
      <div class="reveal">
        ${g.members.map((m) => `
          <div class="reveal-row ${m.move == null ? 'unknown' : m.held ? 'stand' : m.sold ? 'fold' : 'middle'}">
            <div>
              <div class="reveal-name">${esc(m.name)}${m.brokePledge ? '<span class="tag broken">BROKE A PLEDGE</span>' : m.pledged ? '<span class="tag kept">KEPT HIS WORD</span>' : ''}${m.wentQuiet ? '<span class="tag quiet">SAID NOTHING</span>' : ''}${m.card ? `<span class="tag" style="color:var(--gold)">${esc(m.card.name.toUpperCase())}</span>` : ''}</div>
              <div class="reveal-verdict ${m.held ? 'stand' : m.sold ? 'fold' : ''}">${m.move ? esc(m.move) : 'YOU WERE NOT TOLD'}</div>
            </div>
            <div class="reveal-amount ${m.total == null ? '' : m.total >= 0 ? 'pos' : 'neg'}">${m.total == null ? '—' : money(m.total)}</div>
          </div>`).join('')}
      </div>
      <div class="narration" data-type="${esc(g.id)}">${esc(g.narration)}</div>
      ${isMine ? `<p class="coda">${esc(g.coda)}</p>` : ''}
      ${isMine && g.yourLines.length ? `<div class="rule"></div><div class="lines">
        ${g.yourLines.map((l) => `<div class="line"><b>${esc(l.label)}</b><span class="amt ${l.amount >= 0 ? 'pos' : 'neg'}">${money(l.amount)}</span></div>`).join('')}
      </div>` : ''}
      ${!isMine && g.allLines ? `<div class="rule"></div>${g.allLines.map((p) => `
        <div class="lines" style="margin-bottom:8px">
          <div class="line" style="border:none"><b style="color:var(--bone)">${esc(p.name)}</b><span></span></div>
          ${p.lines.map((l) => `<div class="line"><b>${esc(l.label)}</b><span class="amt ${l.amount >= 0 ? 'pos' : 'neg'}">${money(l.amount)}</span></div>`).join('')}
        </div>`).join('')}` : ''}
    </article>`;

  return `
  <section>
    <p class="stamp">round ${state.round} of ${state.totalRounds} · ${esc(state.twist?.name ?? '')}</p>
    ${mine ? groupBlock(mine, true) : ''}
    ${others.length ? `<p class="stamp" style="margin:26px 0 10px">${mine ? 'meanwhile, in the other rooms' : 'what happened tonight'}</p>${others.map((g) => groupBlock(g, false)).join('')}` : ''}
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
    <p style="max-width:52ch;color:var(--bone-dim)">
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

  return `
  <section>
    <p class="stamp">the ledger · ${state.totalRounds} jobs · ${state.players.length} at the table</p>
    <h2 style="font-family:var(--mono);letter-spacing:0.16em;font-size:clamp(22px,6vw,36px);margin:8px 0 6px">
      ${esc(winner.name.toUpperCase())} WALKS
    </h2>
    <p style="color:var(--bone-dim);font-style:italic;margin-bottom:22px">${esc(winnerLine(L))}</p>

    <div class="standings">
      ${L.standings.map((s) => `
        <div class="standing ${s.rank === 1 ? 'first' : ''}">
          <div class="rank">${s.rank}</div>
          <div>
            <div class="nm">${s.crew ? `<span class="crew-dot" style="background:${s.crew.colour}"></span>` : ''}${esc(s.name)}${s.bot ? ' <span style="color:var(--bone-faint);font-size:10px">GHOST</span>' : ''}</div>
            <div class="rl">${s.role ? `${esc(s.role.name)} — ${esc(s.role.tag)}` : ''} · held ${s.stats.stands}, folded ${s.stats.folds}${s.stats.pledgesBroken ? `, broke ${s.stats.pledgesBroken} pledge${s.stats.pledgesBroken > 1 ? 's' : ''}` : ''}${s.stats.cardsPlayed ? `, played ${s.stats.cardsPlayed} card${s.stats.cardsPlayed > 1 ? 's' : ''}` : ''}</div>
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
      <div class="dossier" style="margin:10px 0 24px;border-left-color:var(--blood)">
        <h2 style="font-size:19px">${esc(L.rat.name)} was on the payroll the entire time</h2>
        <p style="color:var(--bone-dim)">
          ${L.accusations.filter((a) => a.correct).length === 0
            ? 'Nobody called it. Not one person. They were paid for every single name they gave up and then paid again for the silence around it.'
            : `${esc(L.accusations.filter((a) => a.correct).map((a) => a.voter).join(', '))} saw it. Everybody else paid for the privilege of being wrong.`}
        </p>
        <div class="lines" style="margin-top:10px">
          ${L.accusations.map((a) => `<div class="line"><b>${esc(a.voter)} pointed at ${esc(a.target)}</b><span class="amt ${a.correct ? 'pos' : 'neg'}">${a.correct ? 'RIGHT' : 'WRONG'}</span></div>`).join('')}
        </div>
      </div>` : ''}

    <p class="stamp">the bonds</p>
    <p style="color:var(--bone-dim);font-size:14px;margin:6px 0 4px">
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
              <div class="recap-title">${esc(g.title)}${g.switched ? ' <span style="color:var(--gold)">· SWITCHED</span>' : ''}${g.callback ? ' <span style="color:var(--blood-bright)">· CALLBACK</span>' : ''}</div>
              <div class="recap-line">${g.members.map((m) =>
                `<span style="color:${m.trueChoice === 'stand' ? 'var(--green)' : 'var(--blood-bright)'}">${esc(m.name)} ${m.trueChoice === 'stand' ? 'held' : 'folded'}</span>`).join(' · ')}</div>
              <div class="recap-narr">${esc(g.narration)}</div>
            </div>`).join('')}
          ${r.cards.length ? `<div class="recap-job"><div class="recap-title">CARDS</div><div class="recap-narr">
            ${r.cards.map((c) => `${esc(c.by)} played ${esc(c.cardId)}${c.target ? ` on ${esc(c.target)}` : ''}${c.cancelled ? ' (cancelled)' : ''}`).join(' · ')}
          </div></div>` : ''}
        </details>`).join('')}
    </div>

    <div class="rule"></div>
    ${state.isHost
      ? `<button class="btn" data-act="rematch" style="width:100%">SAME TABLE, NEW NIGHT</button>`
      : '<p class="waiting" style="text-align:center">Waiting on the host to call another one.</p>'}
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
    return `<span style="color:var(--green)">clean, ${b.mutualStand}/${b.rounds}</span>`;
  }
  if (betrayals === 0 && b.mutualFold === 0) {
    return `<span style="color:var(--gold)">never quite straight with each other</span>`;
  }
  if (betrayals === 0) return `both folded ${b.mutualFold}× — mutually assured`;
  if (b.betrayA && b.betrayB) return `<span style="color:var(--blood-bright)">went both ways</span>`;
  const traitor = b.betrayA ? b.aName : b.bName;
  const mark = b.betrayA ? b.bName : b.aName;
  return `<span style="color:var(--blood-bright)">${esc(traitor)} folded on ${esc(mark)}</span>`;
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
        ${state.you.debts.map((d) => `<div style="font-size:14px;color:var(--blood-bright)">${esc(d.label)} — ${money(d.amount)}</div>`).join('')}` : ''}
    </div>`;
  $('#cardModal').classList.remove('hidden');
}

/* ----------------------------------------------------------------- events */

document.addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-act]');
  if (!btn) return;
  const act = btn.getAttribute('data-act');

  switch (act) {
    case 'modeDevice': {
      const name = ($('#nameInput')?.value ?? '').trim();
      if (name) { me.name = name; localStorage.setItem('standoff.name', name); }
      startLocal('device').then(() => { if (me.name) send({ t: 'addLocal', name: me.name }); });
      break;
    }
    case 'modeSolo': {
      const name = ($('#nameInput')?.value ?? '').trim() || 'You';
      me.name = name;
      localStorage.setItem('standoff.name', name);
      startLocal('solo');
      break;
    }
    case 'addLocal': {
      const input = $('#localName');
      if (input?.value.trim()) { send({ t: 'addLocal', name: input.value.trim() }); input.value = ''; }
      break;
    }
    case 'removeLocal': send({ t: 'removeLocal', id: btn.dataset.id }); break;
    case 'removeBot': send({ t: 'removeBot', id: btn.dataset.id }); break;
    case 'addBot': send({ t: 'addBot' }); break;
    case 'toggleTimers': send({ t: 'config', timers: !state.config.timers }); break;
    case 'toggleCards': send({ t: 'config', cards: !state.config.cards }); break;
    case 'start': send({ t: 'start' }); break;
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
      localStorage.removeItem('standoff.session');
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

document.addEventListener('click', (ev) => {
  const id = ev.target.closest('button')?.id;
  if (id !== 'createBtn' && id !== 'joinBtn') return;
  const name = ($('#nameInput')?.value ?? '').trim();
  if (!name) { toast('They need something to call you.'); $('#nameInput')?.focus(); return; }
  me.name = name;
  localStorage.setItem('standoff.name', name);
  mode = 'online';
  if (id === 'createBtn') send({ t: 'create', name });
  else {
    const code = ($('#codeInput')?.value ?? '').trim().toUpperCase();
    if (code.length !== 4) { toast('Four letters. Ask again.'); return; }
    send({ t: 'join', code, name });
  }
});

$('#cardBtn').addEventListener('click', showCard);
$('#cardClose').addEventListener('click', () => $('#cardModal').classList.add('hidden'));
$('#cardModal').addEventListener('click', (ev) => {
  if (ev.target.id === 'cardModal') $('#cardModal').classList.add('hidden');
});

/* -------------------------------------------------------------------- go */

app.innerHTML = viewDoor();
serverPresent().then((live) => { if (live) connect(); else render(); });
requestAnimationFrame(tickTimer);
