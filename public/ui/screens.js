// The screens: the door, the lobby, the table, and Monday.

import { esc, money, paras, actBtn, cmdBtn, data, listNames, heatPips } from './util.js';
import { die } from './dice.js';
import { PANELS, windowPanel, receipt } from './beats.js';
import { offerComposer, dealtInline } from './panels.js';

// --------------------------------------------------------------- door --

export function door(ctx) {
  const { ui, catalogue, canHost, signalProblem, joinCode, name } = ctx;
  const chapter = catalogue.find((c) => c.id === ui.chapter) ?? catalogue[0];
  const nameField = `<input type="text" maxlength="18" placeholder="Your name" autocomplete="nickname" data-input="name" value="${esc(name)}" aria-label="Your name" />`;
  if (joinCode) {
    return `<section class="door">
      <h1 class="title">STANDOFF</h1>
      <p class="tagline">You’ve been asked to sit down at table <b class="code">${esc(joinCode)}</b>.</p>
      <div class="door-form">${nameField}
        ${cmdBtn('Sit down', 'join', { code: joinCode }, { cls: 'btn big' })}
        ${cmdBtn('Not this table', 'forgetCode', {}, { cls: 'link-btn' })}
      </div>
    </section>`;
  }
  return `<section class="door">
    <h1 class="title">STANDOFF</h1>
    <p class="tagline">A game of trust, betrayal and organised crime, told one night at a time. Bring friends. Lose them.</p>
    <div class="chapters" role="radiogroup" aria-label="Chapter">
      ${catalogue.map((c) => `<button class="chapter${c.id === chapter.id ? ' on' : ''}${c.ready ? '' : ' soon'}" ${c.ready ? `data-cmd="pick" data-args="${data({ key: 'chapter', value: c.id, top: true })}"` : 'disabled'}>
        <span class="ch-n">CHAPTER ${c.number}</span>
        <span class="ch-t">${esc(c.title)}</span>
        <span class="ch-b">${esc(c.blurb)}</span>
      </button>`).join('')}
    </div>
    <div class="door-form">
      ${nameField}
      <div class="mode-grid">
        <button class="mode-btn" data-cmd="host" data-args="{}" ${canHost ? '' : 'disabled'}>
          <span class="mb-t">Host a table</span>
          <span class="mb-s">${canHost ? 'Everybody plays on their own phone. They scan a code to sit down.' : esc(signalProblem ?? 'Phones can’t reach each other from here. Run the server, or use one device.')}</span>
        </button>
        <div class="mode-btn join-row">
          <span class="mb-t">Join a table</span>
          <div class="row tight"><input type="text" maxlength="4" placeholder="CODE" data-input="code" value="${esc(ui.pick.code ?? '')}" aria-label="Table code" />${cmdBtn('Join', 'join', {}, { cls: 'btn small', disabled: !canHost })}</div>
        </div>
        <button class="mode-btn" data-cmd="device" data-args="{}">
          <span class="mb-t">Pass one device around</span>
          <span class="mb-s">One phone or laptop for the whole table. It tells you when to hand it on.</span>
        </button>
        <button class="mode-btn" data-cmd="solo" data-args="{}">
          <span class="mb-t">Play solo</span>
          <span class="mb-s">You, against a table of ghosts who have their habits.</span>
        </button>
      </div>
    </div>
  </section>`;
}

// -------------------------------------------------------------- lobby --

function settings(state, isHost) {
  const c = state.config;
  const opt = (key, value, label) => `<button class="chipbtn${c[key] === value ? ' on' : ''}" ${isHost ? `data-act="${data({ t: 'config', [key]: value })}"` : 'disabled'}>${label}</button>`;
  return `<div class="settings">
    <div class="setting"><span class="stamp">the week</span>${opt('length', 'full', 'Seven nights · about an hour')}${opt('length', 'short', 'Four nights · half an hour')}</div>
    <div class="setting"><span class="stamp">the clock</span>${opt('clock', true, 'On')}${opt('clock', false, 'Off')}${c.clock ? `${opt('pace', 'relaxed', 'Relaxed')}${opt('pace', 'normal', 'Normal')}${opt('pace', 'brisk', 'Brisk')}` : ''}</div>
    <div class="setting"><span class="stamp">a rat at the table</span>${opt('rat', 'auto', 'From five players')}${opt('rat', 'on', 'Always')}${opt('rat', 'off', 'Never')}</div>
    <div class="setting"><span class="stamp">two families</span>${opt('families', 'auto', 'From seven players')}${opt('families', 'on', 'Always')}${opt('families', 'off', 'Never')}
      <p class="small faint">The table splits into Benedettos, who need Sal to walk, and Castellanos, who need him convicted. Most nights the families are apart, at the same time.</p></div>
  </div>`;
}

function startButton(state, n) {
  // solo fills the table with ghosts, so one person is enough
  const solo = state.local?.mode === 'solo';
  const ready = solo || n >= state.minPlayers;
  const label = ready ? (solo && n < 4 ? 'Deal the week — ghosts fill the table' : 'Deal the week') : `It takes ${state.minPlayers}`;
  return `<div class="row">${actBtn(label, { t: 'start' }, { cls: 'btn big', disabled: !ready })}</div>`;
}

export function lobby(ctx) {
  const { state, invite, device, me } = ctx;
  const isHost = !!state.isHost;
  const n = state.players.length;
  const roster = state.players.map((p) => `<div class="roster-row">
    <span class="dot${p.connected || p.bot ? ' live' : ''}"></span>
    <span class="r-name">${esc(p.name)}${p.id === me ? ' <small>(you)</small>' : ''}</span>
    ${p.bot ? '<span class="tag">ghost</span>' : ''}
    ${isHost && p.bot ? actBtn('Send away', { t: 'removeBot', id: p.id }, { cls: 'link-btn' }) : ''}
    ${device && !p.bot ? cmdBtn('Remove', 'removeLocal', { id: p.id }, { cls: 'link-btn' }) : ''}
    ${isHost && !device && !p.bot && !p.connected && p.id !== me ? actBtn('Clear the seat', { t: 'kick', id: p.id }, { cls: 'link-btn' }) : ''}
  </div>`).join('');
  return `<section class="lobby">
    <div class="dossier chapter-card" data-case="${esc(state.code)}">
      <span class="stamp">STANDOFF · chapter ${state.chapter?.number ?? 1}</span>
      <h2>${esc(state.chapter?.title ?? '')}</h2>
      <p>Sal Benedetto is in county. The ledger with thirty-one years of the neighbourhood in it is missing. His lawyer wants paying by Monday, the District Attorney wants names, and Nonna wants all of you in her kitchen.</p>
      <p class="small">What you need to know: the <b>Bag</b> and the <b>Case File</b> sit in the middle of the table and decide Monday. Your phone has your job, your secret and your cards. The line in capitals tells you what tonight is. Everything else, the game teaches you when it happens.</p>
    </div>
    ${invite ?? ''}
    <div class="tableau">
      <div class="tab-main">
        <span class="stamp">at the table · ${n} of ${state.maxPlayers}</span>
        <div class="roster">${roster || '<p class="faint">Nobody yet.</p>'}</div>
        ${device ? `<div class="row tight add-local"><input type="text" maxlength="18" placeholder="Another name" data-input="localName" value="${esc(ctx.ui.pick.localName ?? '')}" />${cmdBtn('Sit them down', 'addLocal', {}, { cls: 'btn small' })}</div>` : ''}
        ${isHost ? `<div class="row">${actBtn('Bring in a ghost', { t: 'addBot' }, { cls: 'ghost-btn', disabled: n >= state.maxPlayers })}</div>` : ''}
      </div>
      <div class="tab-side">
        ${settings(state, isHost)}
        ${isHost ? startButton(state, n) : '<p class="waiting">The host deals when everybody’s here.</p>'}
      </div>
    </div>
  </section>`;
}

/** Table talk, for tables that aren't all in one room. */
export function chatBox(state, ui, { open = true } = {}) {
  const lines = (state.chat ?? []).slice(-14);
  return `<details class="chat"${open ? ' open' : ''}>
    <summary>Table talk${lines.length ? ` · ${lines.length}` : ''}</summary>
    <div class="chat-log">${lines.map((l) => `<p class="${l.kind === 'system' ? 'sys' : ''}"><b>${esc(l.name)}</b> ${esc(l.text)}</p>`).join('') || '<p class="faint small">Nothing said yet. Say it out loud if you’re in the same room.</p>'}</div>
    <div class="row tight"><input type="text" maxlength="200" placeholder="Say something to the table" data-input="chat" value="${esc(ui.pick.chat ?? '')}" />${cmdBtn('Say it', 'say', {}, { cls: 'btn small' })}</div>
  </details>`;
}

// -------------------------------------------------------------- table --

function sceneHeader(state) {
  const sc = state.scene;
  if (!sc) return '';
  return `<div class="scene-head">
    <span class="sc-kicker">${esc(sc.kicker ?? '')}</span>
    <span class="sc-title">${esc(sc.title ?? '')}</span>
    <span class="sc-day">${esc(sc.day ?? '')}</span>
  </div>`;
}

/** A new night gets a title card, once. */
export function titleCard(state) {
  const sc = state.scene;
  if (!sc) return '';
  return `<div class="title-card" aria-hidden="true"><div class="tc-inner">
    <span class="sc-kicker">${esc(sc.kicker ?? '')}</span>
    <span class="tc-title">${esc(sc.title ?? '')}</span>
    <span class="sc-day">${esc(sc.day ?? '')}</span>
  </div></div>`;
}

function beatCard(state) {
  const b = state.beat;
  const where = [b.time, b.place].filter(Boolean).join(' · ');
  if (b.headline) {
    return `<article class="courier">
      <div class="masthead">THE HARBOR COURIER<span>${esc(state.scene?.day ?? '')} · 25¢</span></div>
      <h2>${esc(b.headline)}</h2>
      ${paras(b.text.slice(0, 1))}
      <div class="rule"></div>
      ${paras(b.text.slice(1))}
    </article>`;
  }
  return `<article class="eventcard beat">
    ${where ? `<div class="where">${esc(where)}</div>` : ''}
    <h2>${esc(b.title)}</h2>
    ${b.kicker ? `<div class="kicker">${esc(b.kicker)}</div>` : ''}
    ${paras(b.text)}
  </article>`;
}

function fallout(ctx) {
  const { state, device } = ctx;
  const b = state.beat;
  const out = ['<div class="fallout">'];
  if (b.lastRoll && !b.window) {
    out.push(`<div class="last-roll">${b.lastRoll.dice.map((f) => die(f, { size: 44 })).join('')}<span>${b.lastRoll.total}${b.lastRoll.target != null ? ` of ${b.lastRoll.target} — ${b.lastRoll.success ? 'made it' : 'missed'}` : ''}</span></div>`);
  }
  if (b.lines?.length) out.push(`<div class="lines">${b.lines.map((l) => `<p>${esc(l)}</p>`).join('')}</div>`);
  out.push(receipt(b.receipt, state));
  if (device) {
    out.push(`<div class="row center">${cmdBtn('Carry on', 'nextAll', {}, { cls: 'btn big' })}</div>`);
  } else if (state.you && !b.ready?.includes(state.you.id)) {
    out.push(`<div class="row center">${actBtn('Carry on', { t: 'next' }, { cls: 'btn big' })}</div>`);
  } else if (b.waitingOn?.length) {
    out.push(`<p class="waiting center">Waiting on ${esc(listNames(b.waitingOn))} to finish reading.</p>`);
  }
  out.push('</div>');
  return out.join('');
}

export function table(ctx) {
  const { state, local } = ctx;
  const b = state.beat;
  const out = [sceneHeader(state)];
  if (!b) {
    const mine = state.tracks?.find((t) => t.mine);
    if (mine?.finished) return out.join('') + `<p class="big-note">${esc(mine.name)} are done for the night. Across the river, the other family isn’t. Wait for them.</p>`;
    return out.join('') + '<p class="big-note">…</p>';
  }
  if (state.tracks?.length) {
    const other = state.tracks.find((t) => !t.mine);
    const mine = state.tracks.find((t) => t.mine);
    if (other) out.push(`<div class="meanwhile fam-${esc(other.id)}"><span class="stamp">${esc(mine?.name ?? '')} tonight · meanwhile, across the river</span>${esc(other.name)}: ${other.finished ? 'done for the night, waiting on you.' : `${esc(other.scene ?? '')}${other.beat ? ` — ${esc(other.beat)}` : ''}.`}</div>`);
  }
  if (local?.stage === 'shared' && local.seat) out.push(`<div class="turn-banner">${esc(local.seat.name)}’s move — everybody can watch</div>`);
  if (local?.stage === 'private' && local.seat && local.mode === 'device') out.push(`<div class="turn-banner private">Only ${esc(local.seat.name)} looks. ${local.peek ? '' : 'The device moves on when you’re done.'}</div>`);
  out.push(beatCard(state));
  if (b.dossier && state.you && !ctx.shared) out.push(dealtInline(state));
  if (b.stage === 'fallout') out.push(fallout(ctx));
  else if (b.window) {
    out.push(`<div class="panel">${windowPanel(ctx)}</div>`);
    if (local?.stage === 'window') {
      out.push(`<div class="interrupt center"><span class="stamp">anybody?</span>
        <p>Anyone holding something for the dice can use it now.</p>
        <div class="row center">${local.able.map((p) => cmdBtn(`${esc(p.name)} has something`, 'windowSeat', { id: p.id })).join('')}${cmdBtn('Let it stand', 'letItStand', {}, { cls: 'btn' })}</div>
      </div>`);
    }
    if (local?.window) out.push(`<div class="row center">${cmdBtn('Done — hand it back', 'windowDone', {}, { cls: 'ghost-btn' })}</div>`);
  } else {
    const panel = PANELS[b.engine];
    if (panel) out.push(`<div class="panel">${panel(ctx, { offerComposer })}</div>`);
    if (b.engine === 'story') out.push(`<div class="row center">${ctx.device ? cmdBtn('Carry on', 'nextAll', {}, { cls: 'btn big' }) : actBtn('Carry on', { t: 'next' }, { cls: 'btn big' })}</div>`);
  }
  if (local?.peek) out.push(`<div class="row center">${cmdBtn('Done — hand it back', 'peekDone', {}, { cls: 'btn' })}</div>`);
  return out.join('');
}

/** On one device: nobody looks until the right person has it. */
export function passCard(ctx) {
  const { local, state } = ctx;
  return `<section class="pass">
    ${sceneHeader(state)}
    <div class="pass-card">
      <span class="stamp">${local.peek ? 'a private look' : local.window ? 'the dice' : state.beat?.kicker ?? ''}</span>
      <h2>Pass it to ${esc(local.seat?.name ?? '…')}</h2>
      <p>Everybody else, look away. ${local.peek ? '' : `This is ${esc(state.beat?.title ?? 'a private moment')}.`}</p>
      ${cmdBtn(`I’m ${esc(local.seat?.name ?? '')} — show me`, 'take', {}, { cls: 'btn big' })}
    </div>
  </section>`;
}

// ----------------------------------------------------------- monday --

function bondWeb(end) {
  const names = end.table.map((r) => r.name);
  const n = names.length;
  if (n < 2 || !end.bonds?.length) return '';
  const R = 120; const cx = 160; const cy = 150;
  const pos = Object.fromEntries(names.map((nm, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return [nm, [cx + R * Math.cos(a), cy + R * Math.sin(a)]];
  }));
  const COLORS = { oath: '#c08c1e', 'oath-broken': '#d1333a', named: '#d1333a', wronged: '#a8232b', warned: '#5fd39a', saved: '#5fd39a', 'ran-with': '#5fd39a', iou: '#c08c1e', caught: '#f2e8d5', testified: '#a8232b', 'sold-tape': '#d1333a', 'left-behind': '#8a7a5c', 'cleaned-for': '#5fd39a' };
  const seen = new Map();
  for (const bd of end.bonds) {
    if (bd.from === bd.to || !pos[bd.from] || !pos[bd.to]) continue;
    const k = `${bd.from}>${bd.to}>${bd.kind}`;
    seen.set(k, bd);
  }
  const lines = [...seen.values()].slice(0, 80).map((bd) => {
    const [x1, y1] = pos[bd.from]; const [x2, y2] = pos[bd.to];
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${COLORS[bd.kind] ?? 'rgba(242,232,213,0.35)'}" stroke-width="1.6" opacity="0.7"><title>${esc(`${bd.from} → ${bd.to}: ${bd.kind}`)}</title></line>`;
  }).join('');
  const dots = names.map((nm) => {
    const [x, y] = pos[nm];
    return `<g><circle cx="${x}" cy="${y}" r="6" fill="#f2e8d5" /><text x="${x}" y="${y + (y < cy ? -12 : 20)}" text-anchor="middle">${esc(nm)}</text></g>`;
  }).join('');
  return `<figure class="bondweb"><svg viewBox="0 0 320 300" role="img" aria-label="Who did what to whom">${lines}${dots}</svg>
    <figcaption>Gold: oaths and IOUs. Green: warnings and seats saved. Red: names given, oaths broken, tapes sold, grudges.</figcaption></figure>`;
}

const ROOM_WORDS = { silent: 'said nothing', small: 'gave him something small', name: 'named', deal: 'took the deal' };

export function monday(ctx) {
  const { state } = ctx;
  const e = state.end;
  if (!e) return '<p class="big-note">…</p>';
  const out = ['<section class="monday">'];
  out.push(`<article class="courier big">
    <div class="masthead">THE HARBOR COURIER<span>MONDAY · EXTRA</span></div>
    <h2>${esc(e.headline?.[0] ?? '')}</h2>
    <p>${esc(e.headline?.[1] ?? '')}</p>
  </article>`);
  if (e.verdict) {
    out.push(`<div class="verdict ${e.salWalks ? 'good' : 'bad'}">
      <div class="dice-row">${(e.verdict.dice ?? []).map((f) => die(f, { size: 70 })).join('')}</div>
      <div class="v-line">${e.verdict.total} against ${e.verdict.target}: <b>${e.salWalks ? 'SAL WALKS' : 'SAL GOES DOWN'}</b></div>
      <p class="faint">The Bag: ${money(e.bag.total)} of ${money(e.bag.target)} · The Case File: ${e.caseFile}</p>
    </div>`);
  }
  if (e.families) {
    const f = e.families;
    out.push(`<div class="families-result">${f.rows.map((r) => `<div class="fam-card fam-${esc(r.id)}${r.id === f.winner ? ' won' : ''}">
      <span class="stamp">${r.id === f.winner ? 'won monday' : 'lost monday'}</span>
      <h3>${esc(r.name)}</h3>
      <div class="fam-total">${money(r.total)}</div>
      <p class="small">${esc(listNames(r.members))}${r.best ? ` · richest: ${esc(r.best)}` : ''}</p>
    </div>`).join('')}</div>`);
  }
  const reveals = [];
  if (e.rat) reveals.push(`<p><b>${esc(e.rat.name)}</b> was the rat${e.rat.caught ? ', and Nonna caught them.' : ', and nobody named them.'}</p>`);
  if (e.turncoat) reveals.push(`<p><b>${esc(e.turncoat.name)}</b> was Nonna’s all along${e.turncoat.caught ? ', and Vinnie found out.' : ', and Vinnie never knew.'}</p>`);
  if (e.deals?.length) reveals.push(`<p>Prout’s deal: ${e.deals.map((d) => `<b>${esc(d.name)}</b>${d.where === 'lockup' ? ' (from a cell)' : ''}${d.forfeit ? ' — Nonna took the money' : ''}`).join(', ')}.</p>`);
  else reveals.push('<p>Nobody took Prout’s deal.</p>');
  if (e.named?.length) reveals.push(`<p>In the corridor, the crew named ${esc(listNames(e.named))}.</p>`);
  out.push(`<div class="reveals">${reveals.join('')}</div>`);

  out.push('<h3 class="sec-title">Monday money</h3><div class="standings">');
  for (const r of e.table) {
    const open = ctx.ui.pick['row:' + r.id];
    out.push(`<div class="standing${r.rank === 1 ? ' first' : ''}">
      <span class="st-rank">${r.rank}</span>
      <div class="st-main">
        <div class="st-name">${esc(r.name)} <small>${esc([r.family ? e.families?.names?.[r.family] : null, r.job].filter(Boolean).join(' · '))}</small></div>
        ${r.secret ? `<div class="st-secret ${r.secret.met ? 'met' : 'missed'}">${esc(r.secret.name)} — ${r.secret.met ? 'done' : 'not done'}</div>` : ''}
        <p class="epilogue">${esc(r.epilogue)}</p>
        ${open ? `<div class="st-lines"><div class="r-row"><span>Holding on Sunday night</span><span>${money(r.start)}</span></div>${r.lines.map((l) => `<div class="r-row"><span>${esc(l.label)}</span><span class="${l.n < 0 ? 'neg' : 'pos'}">${l.n ? `${l.n > 0 ? '+' : ''}${money(l.n)}` : '—'}</span></div>`).join('')}</div>` : ''}
        <button class="link-btn" data-cmd="pick" data-args="${data({ key: 'row:' + r.id, value: !open })}">${open ? 'hide the arithmetic' : 'show the arithmetic'}</button>
      </div>
      <span class="st-money">${money(r.money)}</span>
    </div>`);
  }
  out.push('</div>');
  if (e.awards?.length) out.push(`<h3 class="sec-title">For the record</h3><div class="awards">${e.awards.map((a) => `<div class="award"><span class="stamp">${esc(a.title)}</span><b>${esc(a.name)}</b><p>${esc(a.text)}</p></div>`).join('')}</div>`);
  if (e.rooms?.length) {
    out.push(`<h3 class="sec-title">What was said to Prout</h3>${e.rooms.map((rm) => `<div class="receipt"><span class="stamp">${rm.final ? 'the night before' : 'the room'}</span>${rm.rows.map((x) => `<div class="r-row"><span>${esc(x.name)}</span><span>${esc(ROOM_WORDS[x.option] ?? x.option)}${x.target ? ` ${esc(x.target)}` : ''}</span></div>`).join('')}</div>`).join('')}`);
  }
  if (e.quiet?.length) out.push(`<h3 class="sec-title">Played face down</h3><div class="receipt">${e.quiet.map((q) => `<div class="r-row"><span>${esc(q.name)}</span><span>${esc(q.card)}</span></div>`).join('')}</div>`);
  const hidden = (e.caseLog ?? []).filter((c) => c.hidden);
  if (hidden.length) out.push(`<h3 class="sec-title">What Prout had that nobody saw go in</h3><div class="receipt">${hidden.map((c) => `<p>+${c.delta} — ${esc(c.why)}</p>`).join('')}</div>`);
  out.push(bondWeb(e));
  if (e.story?.length) out.push(`<h3 class="sec-title">The week in the Courier</h3><div class="clippings">${e.story.map((s) => `<div class="clip"><b>${esc(s.headline)}</b><p>${esc(s.text)}</p></div>`).join('')}</div>`);
  out.push(`<div class="row center">${state.isHost ? actBtn('Same table, new week', { t: 'rematch' }, { cls: 'btn big' }) : '<p class="waiting">The host can deal another week.</p>'}${cmdBtn('Leave the table', 'leave', {}, { cls: 'ghost-btn' })}</div>`);
  out.push('</section>');
  return out.join('');
}

export { heatPips };
