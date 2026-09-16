// STANDOFF — client. One socket, one state object, one render function.

const $ = (sel) => document.querySelector(sel);
const app = $('#app');
const rail = $('#rail');
const chrome = $('#chrome');

let ws = null;
let state = null;
let me = { playerId: null, token: null, code: null, name: localStorage.getItem('standoff.name') ?? '' };
let draft = '';
let clockOffset = 0;
let phaseStart = Date.now();
let lastPhaseKey = '';
let typed = new Set();
let reconnectDelay = 500;

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
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

/* ------------------------------------------------------------- connection */

function connect() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}`);

  ws.onopen = () => {
    reconnectDelay = 500;
    const saved = JSON.parse(localStorage.getItem('standoff.session') ?? 'null');
    if (saved?.code && saved?.token) {
      send({ t: 'resume', code: saved.code, token: saved.token });
    }
  };

  ws.onmessage = (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    if (msg.t === 'welcome') {
      me.playerId = msg.playerId;
      me.token = msg.token;
      me.code = msg.code;
      localStorage.setItem('standoff.session', JSON.stringify({ code: msg.code, token: msg.token }));
      history.replaceState(null, '', `#${msg.code}`);
    } else if (msg.t === 'state') {
      const prev = state;
      state = msg.state;
      clockOffset = Date.now() - state.serverNow;
      const key = `${state.phase}:${state.round}`;
      if (key !== lastPhaseKey) {
        lastPhaseKey = key;
        phaseStart = Date.now();
        if (state.phase === 'deal' || state.phase === 'talk') draft = '';
        window.scrollTo({ top: 0, behavior: prev ? 'smooth' : 'auto' });
      }
      render();
    } else if (msg.t === 'error') {
      toast(msg.msg);
    }
  };

  ws.onclose = () => {
    setTimeout(connect, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, 8000);
  };
  ws.onerror = () => { try { ws.close(); } catch { /* ignore */ } };
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
  if (!state) return;
  renderChrome();
  renderRail();

  const view = {
    lobby: viewLobby,
    deal: viewDeal,
    talk: viewTalk,
    squeeze: viewSqueeze,
    reckoning: viewReckoning,
    accusation: viewAccusation,
    ledger: viewLedger,
  }[state.phase] ?? viewLobby;

  const active = document.activeElement;
  const keepId = active && active.id ? active.id : null;
  const caret = active && 'selectionStart' in active ? active.selectionStart : null;

  app.innerHTML = view();

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
  chrome.classList.toggle('hidden', !me.playerId);
  $('#roomChip').textContent = state.code ?? '';
  $('#moneyChip').textContent = state.you ? money(state.you.score) : '';
  $('#cardBtn').classList.toggle('hidden', !state.you?.role);
  const labels = {
    lobby: 'THE BACK ROOM',
    deal: `THE JOB · ${state.round} OF ${state.totalRounds}`,
    talk: 'TABLE TALK',
    squeeze: 'THE SQUEEZE',
    reckoning: 'THE RECKONING',
    accusation: 'NAME THE RAT',
    ledger: 'THE LEDGER',
  };
  $('#phaseLabel').textContent = labels[state.phase] ?? '';
}

function renderRail() {
  if (!me.playerId || state.phase === 'lobby') { rail.classList.add('hidden'); return; }
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
    if (state.phase === 'accusation' && p.accused) dot = 'locked';
    return `<div class="${cls.join(' ')}">
      <div class="n"><span class="dot ${dot}"></span>${esc(p.name)}${p.bot ? ' <span style="color:var(--bone-faint)">○</span>' : ''}</div>
      <div class="s">${money(p.score)} ${p.markers ? `<span class="marks">${'†'.repeat(Math.min(p.markers, 4))}</span>` : ''}</div>
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
    <form id="doorForm" autocomplete="off">
      <input type="text" id="nameInput" maxlength="18" placeholder="WHAT THEY CALL YOU" value="${esc(me.name)}" />
      <button class="btn" id="createBtn" type="button">New Table</button>
      <div class="row" style="gap:8px">
        <input type="text" id="codeInput" maxlength="4" placeholder="CODE" value="${esc(preset)}" style="flex:1;text-transform:uppercase" />
        <button class="ghost-btn" id="joinBtn" type="button" style="padding:12px 18px">Sit Down</button>
      </div>
    </form>
    <div class="rule" style="max-width:340px;margin:30px auto"></div>
    <p class="stamp">how it works</p>
    <p style="max-width:44ch;margin:10px auto;color:var(--bone-dim);font-size:15px">
      Every round you are locked in a room with somebody you know. You can talk first.
      Then you choose, alone, whether to hold the line or take the deal.
      Holding together pays. Folding on somebody who held pays better.
      Everybody folding pays nobody.
    </p>
    <p style="max-width:44ch;margin:10px auto;color:var(--bone-faint);font-size:14px;font-style:italic">
      Best with 3–10 people in the same room, or on the same call, where you can hear the pause before somebody lies.
    </p>
  </section>`;
}

/* ------------------------------------------------------------------ lobby */

function viewLobby() {
  if (!me.playerId) return viewDoor();
  const isHost = state.isHost;
  return `
  <section>
    <p class="stamp">say these four letters out loud</p>
    <div class="code-big">${esc(state.code)}</div>
    <p style="color:var(--bone-dim);font-size:14px">
      Anybody on this wifi opens this page and types it in. ${state.players.length}/${state.maxPlayers} seated.
    </p>

    <div class="rule"></div>

    <div class="roster">
      ${state.players.map((p) => `
        <div class="roster-row">
          <div>
            <div class="who">${esc(p.name)}${p.isYou ? ' <span style="color:var(--gold);font-size:10px">— YOU</span>' : ''}${p.id === state.hostId ? ' <span style="color:var(--bone-faint);font-size:10px">— HOST</span>' : ''}</div>
            ${p.bot ? `<div class="what">a ghost. ${esc(strategyLine(p.strategy))}</div>` : `<div class="what">${p.connected ? 'in the room' : 'stepped out'}</div>`}
          </div>
          ${isHost && p.bot ? `<button class="link-btn" data-act="removeBot" data-id="${p.id}">show out</button>` : ''}
        </div>`).join('')}
    </div>

    ${isHost ? `
      <div class="rule"></div>
      <p class="stamp">the arrangement</p>
      <div class="row" style="margin:12px 0 18px">
        <div class="setting">
          rounds
          <select id="roundsSel" style="width:auto">
            ${[3, 4, 5, 6, 7, 8, 10].map((n) => `<option value="${n}" ${n === state.config.rounds ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
        </div>
        <div class="setting">
          pace
          <select id="paceSel" style="width:auto">
            ${['relaxed', 'normal', 'brisk'].map((p) => `<option value="${p}" ${p === state.config.pace ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </div>
        <button class="ghost-btn ${state.config.timers ? 'on' : ''}" data-act="toggleTimers">${state.config.timers ? 'CLOCK ON' : 'NO CLOCK'}</button>
        <button class="ghost-btn" data-act="addBot">+ GHOST</button>
      </div>
      <button class="btn" data-act="start" ${state.players.length < 2 ? 'disabled' : ''} style="width:100%">
        ${state.players.length < 2 ? 'WAITING FOR SOMEBODY TO BETRAY' : `DEAL IN · ${state.players.length} PLAYERS · ${state.config.rounds} ROUNDS`}
      </button>
      <p style="color:var(--bone-faint);font-size:13px;text-align:center;margin-top:10px">
        Ghosts are stand-ins with fixed habits. Good for odd numbers and for finding out how you play.
      </p>
    ` : `<p class="waiting" style="text-align:center;padding:14px">Waiting on ${esc(state.players.find((p) => p.id === state.hostId)?.name ?? 'the host')} to deal.</p>`}

    <div class="rule"></div>
    ${chatBlock()}
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
  const canChat = state.phase !== 'talk' && state.phase !== 'squeeze';
  return `
    <p class="stamp">the room</p>
    <div class="chatbox" id="chatbox">${lines || '<div class="chatline system">Quiet in here.</div>'}</div>
    ${canChat ? `<div class="row" style="gap:8px">
      <input type="text" id="chatInput" maxlength="200" placeholder="SAY SOMETHING" style="flex:1" />
      <button class="ghost-btn" data-act="chat">SAY IT</button>
    </div>` : '<p class="waiting" style="font-size:13px">The rooms are separate. Use your whisper.</p>'}`;
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
  return `
  <article class="dossier" data-case="NO. ${esc(job.caseNo)}">
    <p class="stamp">${esc(who)}</p>
    <h2>${esc(job.title)}</h2>
    ${job.setup.map((p) => `<p>${esc(p)}</p>`).join('')}
    ${showPressure ? `<div class="pressure">${esc(job.pressure)}</div>` : ''}
  </article>`;
}

/* ------------------------------------------------------------------- deal */

function viewDeal() {
  const job = state.job;
  if (!job) return `<div class="big-note">Sitting this one out. Watch.</div>`;
  return `
  <section>
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

function payoffPanel(job) {
  if (job.matrix) {
    const m = job.matrix;
    return `
    <p class="stamp">what this one pays</p>
    <table class="matrix">
      <tr><th></th><th>they hold</th><th>they fold</th></tr>
      <tr><th>you hold</th><td class="good"><b>${money(m.R)}</b></td><td class="bad"><b>${money(m.S)}</b></td></tr>
      <tr><th>you fold</th><td><b>${money(m.T)}</b></td><td><b>${money(m.P)}</b></td></tr>
    </table>
    <p style="color:var(--bone-faint);font-size:13px;margin-top:8px">
      Folding on somebody who holds is the best night you can have. Both of you folding is the worst night everybody can have at once.
    </p>`;
  }
  if (job.params) {
    const p = job.params;
    return `
    <p class="stamp">what this one pays</p>
    <p style="font-family:var(--mono);font-size:13px;color:var(--bone-dim);line-height:1.9">
      EVERY SHARE PUT IN: ${money(p.contribution)}<br />
      THE POT GROWS: ×${p.multiplier}<br />
      THE POT IS SPLIT: ${p.n} WAYS, EVENLY, WHATEVER YOU DID
    </p>
    <p style="color:var(--bone-faint);font-size:13px;margin-top:8px">
      Putting in makes everyone richer than it makes you. Skimming makes you richer than everyone. Both of those sentences are true at the same time, which is the whole problem.
    </p>`;
  }
  return '';
}

/* ------------------------------------------------------------------- talk */

function viewTalk() {
  const job = state.job;
  if (!job) return `<div class="big-note">You are not on this one.</div>`;
  const partners = job.talkPartners.map((p) => p.name).join(' and ') || 'nobody';
  const pledged = job.pledgedByYou;
  const openBook = state.twist?.id === 'openbook';

  return `
  <section>
    ${twistBanner()}
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

    ${markerPanel()}
    ${powerPanel()}

    ${state.isHost ? `<div class="row" style="justify-content:center;margin-top:16px"><button class="ghost-btn" data-act="skip">EVERYBODY’S SAID ENOUGH</button></div>` : ''}
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

function viewSqueeze() {
  const job = state.job;
  if (!job) return `<div class="big-note">You are not on this one.</div>`;
  const chosen = job.yourChoice;

  return `
  <section>
    ${job.switched ? `<div class="twist-banner"><div class="tw-name">SWITCHED</div><div class="tw-body">Assignments were re-cut after the meeting. You are not locked in with the person you were talking to. You are locked in with <b>${esc(job.partners.map((p) => p.name).join(' and '))}</b>, and this is a different job entirely.</div></div>` : ''}
    ${job.switched ? jobCard(job) : `
      <p class="stamp">${esc(job.title)} · no. ${esc(job.caseNo)}</p>
      <div class="pressure" style="margin:10px 0 18px">${esc(job.pressure)}</div>`}

    ${job.leak ? `<div class="twist-banner" style="border-color:var(--blood)">
      <div class="tw-name" style="color:var(--blood-bright)">THE WIRE</div>
      <div class="tw-body">A little bird says ${esc(job.leak.from)} has already locked in <b>${job.leak.choice === 'stand' ? 'HOLD THE LINE' : 'TAKE THE DEAL'}</b>. Believe it or don’t.</div>
    </div>` : ''}

    ${job.incoming.length ? `<div class="whisper-in">
      <div class="from">${esc(job.incoming[0].from)} said, before all this</div>
      <div class="body">“${esc(job.incoming[0].text)}”</div>
    </div>` : ''}

    ${chosen ? `
      <div class="big-note" style="padding:26px 0">
        <div class="stamp" style="margin-bottom:10px">you locked in</div>
        <div style="font-family:var(--mono);font-size:22px;letter-spacing:0.14em;color:${chosen === 'stand' ? 'var(--green)' : 'var(--blood-bright)'}">
          ${chosen === 'stand' ? esc(job.stand.label) : esc(job.fold.label)}
        </div>
        <div style="margin-top:14px;color:var(--bone-faint)">
          ${job.lockedCount} of ${job.groupSize} have decided. Nobody can change their mind now.
        </div>
      </div>` : `
      <div class="choices">
        <button class="choice stand" data-act="choose" data-choice="stand">
          <span class="c-kind">hold the line</span>
          <span class="c-label">${esc(job.stand.label)}</span>
          <span class="c-blurb">${esc(job.stand.blurb)}</span>
          ${job.matrix ? `<span class="c-pay">${money(job.matrix.R)} if they hold · ${money(job.matrix.S)} if they don’t</span>` : ''}
        </button>
        <button class="choice fold" data-act="choose" data-choice="fold">
          <span class="c-kind">take the deal</span>
          <span class="c-label">${esc(job.fold.label)}</span>
          <span class="c-blurb">${esc(job.fold.blurb)}</span>
          ${job.matrix ? `<span class="c-pay">${money(job.matrix.T)} if they hold · ${money(job.matrix.P)} if they don’t</span>` : ''}
        </button>
      </div>
      ${markerPanel()}`}
    ${state.you?.roundNote ? `<p class="waiting" style="text-align:center;margin-top:14px">${esc(state.you.roundNote)}</p>` : ''}
  </section>`;
}

/* -------------------------------------------------------------- reckoning */

function viewReckoning() {
  const mine = (state.reckoning ?? []).find((g) => g.yours);
  const others = (state.reckoning ?? []).filter((g) => !g.yours);

  const groupBlock = (g, isMine) => `
    <article class="dossier" data-case="${isMine ? 'YOUR JOB' : 'ELSEWHERE'}" style="margin-bottom:16px;border-left-color:${isMine ? 'var(--blood)' : 'var(--edge)'}">
      <h2 style="font-size:17px">${esc(g.title)}</h2>
      <div class="reveal">
        ${g.members.map((m) => `
          <div class="reveal-row ${m.choice ?? 'unknown'}">
            <div>
              <div class="reveal-name">${esc(m.name)}${m.brokePledge ? '<span class="tag broken">BROKE A PLEDGE</span>' : m.pledged ? '<span class="tag kept">KEPT HIS WORD</span>' : ''}${m.wentQuiet ? '<span class="tag quiet">SAID NOTHING</span>' : ''}</div>
              <div class="reveal-verdict ${m.choice ?? ''}">${m.choice === 'stand' ? 'HELD THE LINE' : m.choice === 'fold' ? 'TOOK THE DEAL' : 'YOU WERE NOT TOLD'}</div>
            </div>
            <div class="reveal-amount ${m.total == null ? '' : m.total >= 0 ? 'pos' : 'neg'}">${m.total == null ? '\u2014' : money(m.total)}</div>
          </div>`).join('')}
      </div>
      <div class="narration" data-type="${esc(g.id)}">${esc(g.narration)}</div>
      ${isMine ? `<p class="coda">${esc(g.coda)}</p>` : ''}
      ${isMine && g.yourLines.length ? `<div class="rule"></div><div class="lines">
        ${g.yourLines.map((l) => `<div class="line"><b>${esc(l.label)}</b><span class="amt ${l.amount >= 0 ? 'pos' : 'neg'}">${money(l.amount)}</span></div>`).join('')}
      </div>` : ''}
    </article>`;

  return `
  <section>
    <p class="stamp">round ${state.round} of ${state.totalRounds} · ${esc(state.twist?.name ?? '')}</p>
    ${mine ? groupBlock(mine, true) : ''}
    ${others.length ? `<p class="stamp" style="margin:26px 0 10px">meanwhile, in the other rooms</p>${others.map((g) => groupBlock(g, false)).join('')}` : ''}
    <div class="row" style="justify-content:center;margin-top:20px">
      <button class="btn" data-act="ready">${state.round >= state.totalRounds ? 'TO THE LEDGER' : 'NEXT JOB'}</button>
    </div>
    <p class="waiting" style="text-align:center;margin-top:10px">
      ${state.players.filter((p) => p.ready).length} of ${state.players.filter((p) => !p.bot).length} ready.
    </p>
    <div class="rule"></div>
    ${chatBlock()}
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
    <p style="color:var(--bone-dim);font-style:italic;margin-bottom:22px">
      ${esc(winnerLine(L))}
    </p>

    <div class="standings">
      ${L.standings.map((s) => `
        <div class="standing ${s.rank === 1 ? 'first' : ''}">
          <div class="rank">${s.rank}</div>
          <div>
            <div class="nm">${esc(s.name)}${s.bot ? ' <span style="color:var(--bone-faint);font-size:10px">GHOST</span>' : ''}</div>
            <div class="rl">${s.role ? `${esc(s.role.name)} — ${esc(s.role.tag)}` : ''} · held ${s.stats.stands}, folded ${s.stats.folds}${s.stats.pledgesBroken ? `, broke ${s.stats.pledgesBroken} pledge${s.stats.pledgesBroken > 1 ? 's' : ''}` : ''}</div>
          </div>
          <div class="amt">${money(s.score)}</div>
        </div>`).join('')}
    </div>

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
        <div class="line">
          <b>${esc(b.aName)} &amp; ${esc(b.bName)}</b>
          <span>${bondVerdict(b)}</span>
        </div>`).join('')}
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
          `<div class="line"><b>${esc(f.name)} — ${esc(l.label)}</b><span class="amt pos">${money(l.amount)}</span></div>`)).join('')}
      </div>` : ''}

    <p class="stamp">the whole night, job by job</p>
    <div style="margin:10px 0 26px">
      ${L.history.map((r) => `
        <details class="recap">
          <summary><b>ROUND ${r.round}</b> \u00b7 ${esc(r.twist.name)}</summary>
          ${r.groups.map((g) => `
            <div class="recap-job">
              <div class="recap-title">${esc(g.title)}${g.switched ? ' <span style="color:var(--gold)">\u00b7 SWITCHED</span>' : ''}</div>
              <div class="recap-line">${g.members.map((m) =>
                `<span style="color:${m.choice === 'stand' ? 'var(--green)' : 'var(--blood-bright)'}">${esc(m.name)} ${m.choice === 'stand' ? 'held' : 'folded'}</span>`).join(' \u00b7 ')}</div>
              <div class="recap-narr">${esc(g.narration)}</div>
            </div>`).join('')}
        </details>`).join('')}
    </div>

    <div class="rule"></div>
    ${state.isHost
      ? `<button class="btn" data-act="rematch" style="width:100%">SAME TABLE, NEW NIGHT</button>`
      : '<p class="waiting" style="text-align:center">Waiting on the host to call another one.</p>'}
    <p style="text-align:center;margin-top:12px"><button class="link-btn" data-act="leave">leave the table</button></p>
    <div class="rule"></div>
    ${chatBlock()}
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
  if (s.folds === 0) return 'Never folded once, and still came out on top. That is either integrity or extremely good luck.';
  if (s.betrayals >= 3) return `Folded on people ${s.betrayals} times and is going home with the most money. Enjoy the drive.`;
  if (s.pledgesBroken > 0) return `Gave their word ${s.pledges} times and broke it ${s.pledgesBroken}. The money does not know the difference.`;
  return 'Read the room better than the room read them.';
}

function bondVerdict(b) {
  const betrayals = b.betrayA + b.betrayB;
  if (b.rounds === 0) return 'never worked together';
  if (betrayals === 0 && b.mutualFold === 0) return `<span style="color:var(--green)">clean, ${b.mutualStand}/${b.rounds}</span>`;
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
    const w = Math.min(6, 1 + b.rounds * 1.2);
    const op = betrayals > 0 ? 0.85 : 0.35 + (b.rounds > 0 ? (b.mutualStand / b.rounds) * 0.6 : 0);
    return `<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}"
      stroke="${colour}" stroke-width="${w.toFixed(1)}" stroke-opacity="${op.toFixed(2)}" ${dash} stroke-linecap="round" />`;
  }).join('');

  const nodes = standings.map((s) => {
    const p = pos.get(s.id);
    const anchor = Math.abs(Math.cos(p.a)) < 0.3 ? 'middle' : Math.cos(p.a) > 0 ? 'start' : 'end';
    const lx = Math.max(6, Math.min(w - 6, cx + Math.cos(p.a) * (r + 18)));
    const ly = cy + Math.sin(p.a) * (r + 18) + 4;
    const label = s.name.length > 13 ? `${s.name.slice(0, 12)}\u2026` : s.name;
    return `
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="7" fill="#0b0b0d" stroke="${s.rank === 1 ? '#c9a227' : '#e9e3d6'}" stroke-width="1.5" />
      <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}" fill="#9d9789"
        font-family="ui-monospace, 'Courier New', monospace" font-size="11" letter-spacing="1">${esc(label)}</text>`;
  }).join('');

  return `<svg class="bondweb" viewBox="0 0 ${w} ${h}" role="img" aria-label="A web of who trusted whom">
    ${edges}${nodes}
  </svg>`;
}

/* ------------------------------------------------------------ card modal */

function showCard() {
  const role = state?.you?.role;
  if (!role) return;
  $('#cardModalBody').innerHTML = `
    <div class="card-face" style="border-top-color:${role.colour}">
      <div class="ct">your card · nobody else sees this</div>
      <div class="cn" style="color:${role.colour}">${esc(role.name)}</div>
      <div class="ct" style="margin-top:2px">${esc(role.tag)}</div>
      <div class="cb">${esc(role.blurb)}</div>
      <div class="co">${esc(role.objective)}</div>
    </div>`;
  $('#cardModal').classList.remove('hidden');
}

/* ----------------------------------------------------------------- events */

document.addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-act]');
  if (!btn) return;
  const act = btn.getAttribute('data-act');

  switch (act) {
    case 'removeBot': send({ t: 'removeBot', id: btn.dataset.id }); break;
    case 'addBot': send({ t: 'addBot' }); break;
    case 'toggleTimers': send({ t: 'config', timers: !state.config.timers }); break;
    case 'start': send({ t: 'start' }); break;
    case 'skip': send({ t: 'skip' }); break;
    case 'whisper': {
      const box = $('#whisperBox');
      send({ t: 'whisper', text: box.value });
      toast('Sent.');
      break;
    }
    case 'pledge': send({ t: 'pledge', value: btn.dataset.val === '1' }); break;
    case 'marker': send({ t: 'marker' }); break;
    case 'power': send({ t: 'power', target: btn.dataset.id }); break;
    case 'choose': send({ t: 'choose', choice: btn.dataset.choice }); break;
    case 'ready': send({ t: 'ready' }); break;
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
  if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey) && ev.target.id === 'whisperBox') {
    send({ t: 'whisper', text: ev.target.value });
    toast('Sent.');
  }
  if (ev.key === 'Escape') $('#cardModal').classList.add('hidden');
});

// door buttons live outside the delegated set because they need the inputs
document.addEventListener('click', (ev) => {
  const id = ev.target.id;
  if (id !== 'createBtn' && id !== 'joinBtn') return;
  const name = ($('#nameInput')?.value ?? '').trim();
  if (!name) { toast('They need something to call you.'); $('#nameInput')?.focus(); return; }
  me.name = name;
  localStorage.setItem('standoff.name', name);
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
connect();
requestAnimationFrame(tickTimer);
