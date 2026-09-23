// Everything that belongs to you, and the table you're sitting at: the seats
// along the top, the cards in your hand, and the dossier — your job, your
// secret, your grudges, your debts, and whatever anybody has offered you.

import { esc, money, actBtn, cmdBtn, data, heatPips, listNames } from './util.js';

// -------------------------------------------------------------- seats --

export function seats(state, { me }) {
  const bits = state.players.map((p) => {
    const tags = [];
    if (p.bot) tags.push('<span class="tag">ghost</span>');
    if (p.low) tags.push('<span class="tag">lying low</span>');
    const worth = p.cash != null ? `<span class="s-cash">${money(p.cash)}</span>` : p.band ? `<span class="s-band ${p.band.replace(' ', '-')}">${esc(p.band)}</span>` : '';
    const fam = p.family ? ` fam-${p.family}` : '';
    return `<div class="seat${p.id === me ? ' you' : ''}${p.jailed ? ' jailed' : ''}${!p.connected && !p.bot ? ' off' : ''}${fam}" title="${esc([p.family ? state.families?.names?.[p.family] : null, p.job].filter(Boolean).join(' · '))}">
      <div class="s-top"><span class="dot${p.pending ? ' live' : ''}"></span><span class="s-name">${esc(p.name)}</span>${p.grudgesAgainst ? `<span class="s-grudge" title="${p.grudgesAgainst} grudge${p.grudgesAgainst === 1 ? '' : 's'} held against them">${'✕'.repeat(Math.min(3, p.grudgesAgainst))}</span>` : ''}</div>
      <div class="s-job">${esc(p.job ?? '')}</div>
      ${p.bio ? `<div class="s-bio">${esc(p.bio)}</div>` : ''}
      <div class="s-bottom">${worth}${heatPips(p.heat, p.jailed)}</div>
      ${p.stamps?.length ? `<div class="s-stamps">${p.stamps.map((w) => `<span class="stampmark">${esc(w)}</span>`).join('')}</div>` : ''}
      ${tags.length ? `<div class="s-tags">${tags.join('')}</div>` : ''}
    </div>`;
  });
  return bits.join('');
}

// -------------------------------------------------------------- cards --

const KIND_LABEL = { dice: 'dice', vote: 'votes', info: 'information', money: 'money', heat: 'heat', people: 'people', wild: 'wild', job: 'on a job', special: 'one of a kind' };

export function handDock(state, ui, { shared = false } = {}) {
  const you = state.you;
  if (!you || shared) return '';
  const cards = you.cards ?? [];
  const open = ui.handOpen;
  return `<div class="hand-wrap${open ? ' open' : ''}">
    <button class="hand-tab" data-cmd="toggleHand" data-args="{}">${cards.length ? `Your hand · ${cards.length}/${you.handLimit}` : 'No cards'}${cards.some((c) => c.playable) ? ' · <b>playable</b>' : ''}</button>
    <div class="hand">${cards.map((c) => `<button class="pcard ${c.face}${c.playable ? ' playable' : ''}${c.passive ? ' passive' : ''}" data-cmd="card" data-args="${data({ uid: c.uid })}">
      <span class="pc-face">${c.face === 'down' ? 'FACE DOWN' : 'FACE UP'} · ${esc(KIND_LABEL[c.kind] ?? c.kind)}</span>
      <span class="pc-name">${esc(c.name)}</span>
      <span class="pc-text">${esc(c.text)}</span>
      ${c.playable ? '<span class="pc-play">PLAY</span>' : c.passive ? '<span class="pc-play passive">WORKS BY ITSELF</span>' : ''}
    </button>`).join('')}</div>
  </div>`;
}

/** The card you tapped, full size, with whatever it needs to be played. */
export function cardModal(state, ui) {
  const c = (state.you?.cards ?? []).find((x) => x.uid === ui.card);
  if (!c) return '';
  const p = ui.pick;
  const others = state.players.filter((x) => x.id !== state.you.id);
  const chips = (key, rows) => `<div class="picker">${rows.map((r) => `<button class="chipbtn${p[key] === r.id ? ' on' : ''}" data-cmd="pick" data-args="${data({ key, value: r.id })}">${esc(r.label ?? r.name)}</button>`).join('')}</div>`;
  const parts = [];
  const a = { t: 'card', uid: c.uid };
  let ready = true;
  if (c.playable) {
    if (c.needs === 'player' || c.needs === 'player+card') {
      parts.push(`<span class="stamp">on whom?</span>${chips('cardTarget', others)}`);
      a.target = p.cardTarget; if (!p.cardTarget) ready = false;
      if (c.words) {
        parts.push(`<span class="stamp">which word?</span>${chips('cardWord', c.words.map((w) => ({ id: w, label: w })))}`);
        a.word = p.cardWord; if (!p.cardWord) ready = false;
      }
    }
    if (c.needs === 'card' || c.needs === 'player+card') {
      const mine = (state.you.cards ?? []).filter((x) => x.uid !== c.uid);
      parts.push(`<span class="stamp">${c.needs === 'card' ? 'sell which card?' : 'give which card?'}</span>${chips('cardCard', mine.map((m) => ({ id: m.uid, label: m.name })))}`);
      a.card = p.cardCard; if (!p.cardCard) ready = false;
    }
    if (c.needs === 'option') {
      parts.push(`<span class="stamp">change it to</span>${chips('cardOption', (c.options ?? []).map((o) => ({ id: o.id, label: o.label })))}`);
      a.option = p.cardOption; if (!p.cardOption) ready = false;
    }
    if (c.needs === 'fact') {
      parts.push(`<span class="stamp">ask the game</span><div class="facts">${(c.facts ?? []).map((f) => `<button class="fact${p.cardFact === f.i ? ' on' : ''}" data-cmd="pick" data-args="${data({ key: 'cardFact', value: f.i })}">${esc(f.q)}</button>`).join('')}</div>`);
      a.fact = p.cardFact; if (p.cardFact == null) ready = false;
    }
    if (c.needs === 'side') {
      parts.push(`<span class="stamp">the next roll of two dice is</span>${chips('cardSide', [{ id: 'high', label: 'High (7+)' }, { id: 'low', label: 'Low (6 or less)' }])}`);
      a.side = p.cardSide; if (!p.cardSide) ready = false;
    }
  }
  return `<div class="modal" role="dialog" aria-modal="true" data-key="card:${esc(c.uid)}" data-close="closeCard">
    <div class="modal-body">
      <div class="card-face ${c.face}">
        <div class="ct">${c.face === 'down' ? 'Face down — nobody sees it played until Monday' : 'Face up — everybody sees it played'}</div>
        <div class="cn">${esc(c.name)}</div>
        <p class="co">${esc(c.text)}</p>
        ${parts.length ? `<div class="rule"></div>${parts.join('')}` : ''}
      </div>
      <div class="row center">
        ${c.playable ? actBtn(c.face === 'down' ? 'Play it, quietly' : 'Play it', a, { disabled: !ready }) : `<span class="faint">${c.passive ? 'This one works by itself when it’s needed.' : 'You can’t play this right now.'}</span>`}
        ${actBtn('Sell to the Fence · $10k', { t: 'sell', uid: c.uid }, { cls: 'ghost-btn' })}
        ${cmdBtn('Close', 'closeCard')}
      </div>
    </div>
  </div>`;
}

// ------------------------------------------------------------ dossier --

export function offerComposer(ctx) {
  const { state, ui } = ctx;
  const you = state.you;
  if (!you) return '';
  const p = ui.pick;
  const kind = p.offerKind ?? 'iou';
  const others = state.players.filter((x) => x.id !== you.id);
  const a = { t: 'offer', kind, to: p.offerTo };
  let ready = !!p.offerTo;
  let extra = '';
  if (kind === 'iou') {
    const pct = p.offerPct ?? 10;
    a.pct = pct; a.forWhat = p.offerFor ?? '';
    extra = `<div class="picker">${[5, 10, 15, 20, 25, 30].map((n) => `<button class="chipbtn${pct === n ? ' on' : ''}" data-cmd="pick" data-args="${data({ key: 'offerPct', value: n })}">${n}%</button>`).join('')}</div>
      <input type="text" maxlength="60" placeholder="for… (their vote, a seat in the car, silence)" data-input="offerFor" value="${esc(p.offerFor ?? '')}" />`;
  } else if (kind === 'trade') {
    const mine = you.cards ?? [];
    a.uid = p.offerCard; if (!p.offerCard) ready = false;
    extra = mine.length ? `<div class="picker">${mine.map((m) => `<button class="chipbtn${p.offerCard === m.uid ? ' on' : ''}" data-cmd="pick" data-args="${data({ key: 'offerCard', value: m.uid })}">${esc(m.name)}</button>`).join('')}</div>` : '<p class="faint">You have no cards to trade.</p>';
  }
  return `<div class="composer">
    <span class="stamp">make it binding</span>
    <p class="small">Anything agreed here, the game enforces. Anything said out loud is just said.</p>
    <div class="picker">${[['iou', 'An IOU'], ['oath', 'A Blood Oath'], ['trade', 'A card trade']].map(([id, l]) => `<button class="chipbtn${kind === id ? ' on' : ''}" data-cmd="pick" data-args="${data({ key: 'offerKind', value: id })}">${l}</button>`).join('')}</div>
    <p class="small faint">${kind === 'iou' ? 'Promise a share of whatever you have on Monday.' : kind === 'oath' ? 'Whoever betrays the other first — naming them, a Fall Guy, a doctored note — pays them half of everything.' : 'Offer a card. They choose one of theirs to give back.'}</p>
    <div class="picker">${others.map((o) => `<button class="chipbtn${p.offerTo === o.id ? ' on' : ''}" data-cmd="pick" data-args="${data({ key: 'offerTo', value: o.id })}">${esc(o.name)}</button>`).join('')}</div>
    ${extra}
    <div class="row">${actBtn('Offer it', a, { cls: 'btn small', disabled: !ready, fill: kind === 'iou' ? { forWhat: 'offerFor' } : null })}</div>
  </div>`;
}

function offersIn(state, ui) {
  const you = state.you;
  if (!you.offers?.length) return '';
  return `<section class="d-sec"><span class="stamp">offers on the table</span>${you.offers.map((o) => {
    let buttons;
    if (o.choices) buttons = `${actBtn('Sign it', { t: 'respond', id: o.id, choice: 'sign' }, { cls: 'btn small' })}${actBtn('Let them read it out', { t: 'respond', id: o.id, choice: 'refuse' }, { cls: 'ghost-btn small red' })}`;
    else if (o.needsCard) {
      const mine = you.cards ?? [];
      buttons = `<div class="picker">${mine.map((m) => `<button class="chipbtn${ui.pick['back:' + o.id] === m.uid ? ' on' : ''}" data-cmd="pick" data-args="${data({ key: 'back:' + o.id, value: m.uid })}">${esc(m.name)}</button>`).join('')}</div>
        ${actBtn('Give that one back', { t: 'respond', id: o.id, accept: true, uid: ui.pick['back:' + o.id] }, { cls: 'btn small', disabled: !ui.pick['back:' + o.id] && mine.length > 0 })}
        ${o.kind === 'trade' ? actBtn('No deal', { t: 'respond', id: o.id, accept: false }, { cls: 'ghost-btn small' }) : ''}`;
    } else buttons = `${actBtn('Accept', { t: 'respond', id: o.id, accept: true }, { cls: 'btn small' })}${actBtn('Refuse', { t: 'respond', id: o.id, accept: false }, { cls: 'ghost-btn small' })}`;
    return `<div class="offer"><p>${esc(o.text)}</p><div class="row tight">${buttons}</div></div>`;
  }).join('')}</section>`;
}

function offersOut(state) {
  const sent = state.you.sent ?? [];
  if (!sent.length) return '';
  return `<section class="d-sec"><span class="stamp">waiting on an answer</span>${sent.map((o) => `<div class="offer small"><p>${o.kind === 'iou' ? `${o.pct}% of your Monday to ${esc(o.toName)}` : o.kind === 'oath' ? `A Blood Oath with ${esc(o.toName)}` : o.kind === 'dirt' ? `Dirt on ${esc(o.toName)}` : `A card for ${esc(o.toName)}`}</p>${actBtn('Take it back', { t: 'withdraw', id: o.id }, { cls: 'ghost-btn small' })}</div>`).join('')}</section>`;
}

export function dossier(state, ui) {
  const you = state.you;
  if (!you) return '';
  const p = ui.pick;
  const secret = you.secret;
  const sections = [];
  sections.push(`<div class="d-head">
    <div><span class="stamp">your cash</span><div class="d-cash">${money(you.cash)}</div>${you.stash ? `<div class="faint small">+ ${money(you.stash)} under the mattress</div>` : ''}</div>
    <div><span class="stamp">heat</span><div>${heatPips(you.heat, you.jailed)}</div><div class="faint small">Three and you’re picked up.</div></div>
  </div>`);
  if (state.families?.you) {
    const mine = state.families.you;
    sections.push(`<section class="d-sec fam fam-${mine}"><span class="stamp">your family — everybody knows it</span><h3>${esc(state.families.names[mine])}</h3><p>${mine === 'c' ? 'You need Sal convicted: then the neighbourhood is Vinnie’s, and some of it is yours. What goes in the Envelope helps Prout. What’s in your pocket is yours — unless Sal walks.' : 'You need Sal to walk. What goes in the Bag pays Morty. What’s in your pocket is yours — unless Sal goes down.'}</p></section>`);
  }
  if (you.job) {
    const abil = [];
    if (you.muscle) abil.push('ready tonight');
    if (you.mechanic) abil.push('ready this week');
    if (you.fixer) abil.push('ready this week');
    if (you.cousin) abil.push('ready this week');
    if (you.freeWipe) abil.push('Father Dominic owes you one');
    sections.push(`<section class="d-sec"><span class="stamp">your job — everybody knows it</span><h3>${esc(you.job.name)}</h3><p>${esc(you.job.text)}</p>${abil.length ? `<p class="faint small">${esc(abil.join(' · '))}</p>` : ''}</section>`);
  }
  if (you.bio) {
    sections.push(`<section class="d-sec"><span class="stamp">who you are — everybody knows it</span><h3>${esc(you.bio.name)}</h3><p>${esc(you.bio.text)}</p>${you.bio.who ? `<p class="faint small">Your person in this: ${esc(you.bio.who)}. Most mornings you can spend the day with them.</p>` : ''}</section>`);
  }
  if (you.edges?.length) {
    sections.push(`<section class="d-sec"><span class="stamp">on your side tonight</span><p>${you.edges.map((e) => `+1 — ${esc(e)}`).join('<br>')}</p><p class="faint small">Each adds one to the next roll you’re part of.</p></section>`);
  }
  if (secret) {
    sections.push(`<section class="d-sec secret"><span class="stamp">your secret — nobody else knows it</span><h3>${esc(secret.name)}</h3><p>${esc(secret.text)}</p><p class="faint small">Pays ${esc(secret.payLabel ?? '')} on Monday.</p></section>`);
  }
  if (you.rat) {
    const turncoat = you.rat.kind === 'turncoat';
    sections.push(`<section class="d-sec rat"><span class="stamp">${turncoat ? 'nonna’s friend' : 'the wire'}</span><p>${turncoat ? 'Once an act, you can quietly lose a page of Prout’s case against Sal. Nobody sees it happen.' : 'Once an act, you can quietly add one to Prout’s Case File. Nobody sees it happen.'}</p>${you.rat.canWire ? actBtn(turncoat ? 'Lose a page' : 'Say something into the wire', { t: 'wire' }, { cls: 'ghost-btn small red' }) : '<p class="faint small">Used this act.</p>'}</section>`);
  }
  if (you.jailed) {
    const used = you.jailUsed ?? {};
    const others = state.players.filter((x) => x.id !== you.id);
    sections.push(`<section class="d-sec jail"><span class="stamp">county lockup</span>
      <p>You’re in the cell next to Sal until tomorrow night.</p>
      ${used.call ? '<p class="faint small">You’ve had your phone call.</p>' : `<p><b>One phone call.</b> Tell one person one thing.</p>
        <div class="picker">${others.map((o) => `<button class="chipbtn${p.callTo === o.id ? ' on' : ''}" data-cmd="pick" data-args="${data({ key: 'callTo', value: o.id })}">${esc(o.name)}</button>`).join('')}</div>
        <input type="text" maxlength="160" placeholder="What do you tell them?" data-input="callText" value="${esc(p.callText ?? '')}" />
        <div class="row">${actBtn('Make the call', { t: 'jail', what: 'call', to: p.callTo, text: p.callText ?? '' }, { cls: 'btn small', disabled: !p.callTo, fill: { text: 'callText' } })}</div>`}
      <div class="row">${used.sal ? '' : actBtn('Talk to Sal', { t: 'jail', what: 'sal' }, { cls: 'ghost-btn small' })}${you.deal ? '' : actBtn('Ask for Prout', { t: 'jail', what: 'deal' }, { cls: 'ghost-btn small red', title: 'Take the deal from your cell: your money is safe on Monday, and the Case File grows.' })}</div>
    </section>`);
  }
  if (you.grudges?.length) {
    sections.push(`<section class="d-sec"><span class="stamp">grudges you hold</span>${you.grudges.map((g) => `<div class="offer small"><p><b>${esc(g.name)}</b> ×${g.n} — spend one to hand them a heat of yours, or to make your vote against them count twice.</p>${you.heat > 0 ? actBtn('Hand them a heat', { t: 'grudge', target: g.id, use: 'heat' }, { cls: 'ghost-btn small red' }) : ''}</div>`).join('')}</section>`);
  }
  if (you.stamps?.length) {
    sections.push(`<section class="d-sec"><span class="stamp">what they’re saying about you</span>${you.stamps.map((w) => `<div class="offer small"><span class="stampmark">${esc(w)}</span> ${actBtn(you.freeWipe ? 'Father Dominic will have a word' : 'Pay Nonna $10k to make it stop', { t: 'wipe', word: w }, { cls: 'ghost-btn small' })}</div>`).join('')}</section>`);
  }
  sections.push(offersIn(state, ui));
  sections.push(offersOut(state));
  if (state.phase === 'playing') sections.push(offerComposer({ state, ui }));
  if (you.notes?.length) {
    sections.push(`<section class="d-sec"><span class="stamp">notes</span>${you.notes.slice().reverse().map((n) => `<div class="note"><span class="from">${esc(n.from ?? '')}</span> ${esc(n.text)}</div>`).join('')}</section>`);
  }
  if (state.ious?.length || state.oaths?.length) {
    const name = (id) => state.players.find((x) => x.id === id)?.name ?? '?';
    sections.push(`<section class="d-sec"><span class="stamp">on the record</span>
      ${state.oaths.map(([a, b]) => `<p class="small">Blood Oath: ${esc(name(a))} and ${esc(name(b))}</p>`).join('')}
      ${state.ious.map((o) => `<p class="small">${esc(name(o.from))} owes ${esc(name(o.to))} ${o.pct}% of Monday</p>`).join('')}
    </section>`);
  }
  return `<div class="modal dossier-modal" role="dialog" aria-modal="true" data-key="dossier" data-close="closeDossier">
    <div class="modal-body wide">
      <div class="modal-top">${cmdBtn('Close', 'closeDossier', {}, { cls: 'ghost-btn small' })}</div>
      <div class="dossier" data-case="${esc(state.code)} · ${esc(you.name)}">
        <h2>${esc(you.name)}</h2>
        ${sections.join('')}
      </div>
      <div class="row center">${cmdBtn('Close', 'closeDossier')}</div>
    </div>
  </div>`;
}

/** The first look at what Nonna dealt you, on the kitchen table. */
export function dealtInline(state) {
  const you = state.you;
  if (!you) return '';
  return `<div class="dealt">
    ${you.job ? `<div class="dealt-card job"><span class="stamp">your job</span><h3>${esc(you.job.name)}</h3><p>${esc(you.job.text)}</p></div>` : ''}
    ${you.secret ? `<div class="dealt-card secret"><span class="stamp">your secret</span><h3>${esc(you.secret.name)}</h3><p>${esc(you.secret.text)}</p><p class="faint small">${esc(you.secret.payLabel ?? '')}</p></div>` : ''}
    <div class="dealt-card cards"><span class="stamp">your cards</span>${(you.cards ?? []).map((c) => `<p><b>${esc(c.name)}</b> — ${esc(c.text)}</p>`).join('')}</div>
  </div>`;
}

export { listNames };
