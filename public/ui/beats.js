// One panel per kind of beat. Each takes the state and what the client
// remembers about half-made choices, and returns markup. The buttons carry
// the action they send; app.js wires them up.

import { esc, money, paras, actBtn, cmdBtn, data, listNames, heatPips } from './util.js';
import { die, mini, isNewRoll } from './dice.js';

// ------------------------------------------------------------- shared --

function waitingLine(names, verb = 'Waiting on') {
  if (!names?.length) return '';
  return `<p class="waiting">${verb} ${esc(listNames(names))}.</p>`;
}

function seatPicker(ctx, key, ids, { label = 'Who?', exclude = [] } = {}) {
  const chosen = ctx.ui.pick[key] ?? null;
  const rows = ctx.state.players.filter((p) => ids.includes(p.id) && !exclude.includes(p.id));
  return `<div class="picker" role="radiogroup" aria-label="${esc(label)}">
    ${rows.map((p) => `<button class="chipbtn${chosen === p.id ? ' on' : ''}" data-cmd="pick" data-args="${data({ key, value: p.id })}">${esc(p.name)}</button>`).join('')}
  </div>`;
}

function amountSlider(ctx, key, spec) {
  const v = ctx.ui.pick[key] ?? spec.min;
  const val = Math.max(spec.min, Math.min(spec.max, v));
  return `<div class="amount">
    <input type="range" min="${spec.min}" max="${spec.max}" step="${spec.step ?? 5000}" value="${val}" data-slider="${esc(key)}" aria-label="Amount" />
    <div class="amount-read"><span class="amount-v" data-read="${esc(key)}">${money(val)}</span><span class="amount-max">of ${money(spec.max)}</span></div>
  </div>`;
}

// --------------------------------------------------------------- vote --

export function vote(ctx) {
  const { state } = ctx;
  const b = state.beat;
  const shown = b.stage !== 'vote';
  const out = [];
  if (b.angle && !shown) {
    out.push(`<div class="angle"><span class="stamp">your angle — nobody else can see this</span><p>${esc(b.angle.text)}</p></div>`);
  }
  const cousin = b.cousin && b.canVote;
  const players = b.options.some((o) => o.player);
  out.push(`<div class="options${players ? ' people' : ''}">`);
  for (const o of b.options) {
    const mine = b.myVote === o.id;
    const lean = b.angle?.option === o.id && !shown;
    const who = shown ? (b.votes ?? []).filter((v) => v.option === o.id) : [];
    const canHere = b.canVote && !(b.noSelf && o.id === ctx.me);
    const grudge = b.grudgeTargets?.includes(o.id);
    out.push(`<div class="option${mine ? ' mine' : ''}${lean ? ' lean' : ''}${shown && b.tally != null ? '' : ''}">
      <div class="o-head">
        <span class="o-label">${esc(o.label)}</span>
        ${o.faces?.length && !o.player ? `<span class="o-faces" title="On a tie, the die gives it ${o.faces.join(' or ')}">${o.faces.map(mini).join('')}</span>` : ''}
        ${shown ? `<span class="o-tally">${o.tally ?? 0}</span>` : ''}
      </div>
      ${o.blurb ? `<p class="o-blurb">${esc(o.blurb)}</p>` : ''}
      ${o.details?.length ? `<ul class="o-details">${o.details.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
      ${shown && who.length ? `<p class="o-who">${who.map((v) => `${esc(v.name)}${v.weight > 1 ? ` ×${v.weight}` : ''}`).join(' · ')}</p>` : ''}
      ${canHere ? `<div class="row tight">${actBtn(mine ? 'Voted' : 'Vote', { t: 'vote', option: o.id, cousin: !!ctx.ui.pick.cousin }, { cls: 'btn small' })}${grudge ? actBtn('Vote, and spend a grudge', { t: 'vote', option: o.id, grudge: true, cousin: !!ctx.ui.pick.cousin }, { cls: 'ghost-btn small red', title: 'Your vote counts twice against them' }) : ''}</div>` : ''}
    </div>`);
  }
  out.push('</div>');
  if (cousin) {
    out.push(`<label class="check"><input type="checkbox" data-toggle="cousin"${ctx.ui.pick.cousin ? ' checked' : ''} /> If it ties, Nonna settles it my way (once a week)</label>`);
  }
  if (b.stage === 'vote') {
    if (b.myVote) out.push(`<p class="waiting">You voted ${esc(b.options.find((o) => o.id === b.myVote)?.label)}. ${b.voted?.length ? `In: ${esc(listNames(b.voted))}.` : ''}</p>`);
    else if (!b.canVote) out.push(`<p class="waiting">${b.voted?.length ? `Voted: ${esc(listNames(b.voted))}.` : 'Nobody has voted yet.'} The votes are shown, with names, when they’re all in.</p>`);
  }
  if (b.stage === 'reveal') {
    if (b.reveal || b.canFix) {
      out.push('<div class="interrupt"><span class="stamp">the votes are on the table</span>');
      if (b.canFix) {
        const voters = (b.votes ?? []).map((v) => state.players.find((p) => p.name === v.name)).filter(Boolean);
        out.push(`<p>You’re the Fixer. Once a week you can move one person’s vote.</p>
          ${seatPicker(ctx, 'fixWho', voters.map((p) => p.id), { label: 'Whose vote?' })}
          <div class="picker">${b.options.map((o) => `<button class="chipbtn${ctx.ui.pick.fixTo === o.id ? ' on' : ''}" data-cmd="pick" data-args="${data({ key: 'fixTo', value: o.id })}">${esc(o.label)}</button>`).join('')}</div>
          <div class="row">${actBtn('Move it', { t: 'fix', target: ctx.ui.pick.fixWho, option: ctx.ui.pick.fixTo }, { disabled: !ctx.ui.pick.fixWho || !ctx.ui.pick.fixTo })}</div>`);
      }
      if (b.reveal) out.push(`<p>You can change things with a card from your hand, or let it stand.</p>`);
      out.push(`<div class="row">${actBtn('Let it stand', { t: 'reveal-pass' }, { cls: 'ghost-btn' })}</div></div>`);
    } else {
      out.push(waitingLine(b.waitingOn, 'Somebody might change it —'));
    }
  }
  if (b.tieFaces && b.stage === 'tie') {
    out.push(`<p class="tie">Tied. ${b.tieFaces.map((f) => `${f.faces.map(mini).join('')} ${esc(b.options.find((o) => o.id === f.id)?.label ?? '')}`).join(' &nbsp;·&nbsp; ')}</p>`);
  }
  return out.join('');
}

// ------------------------------------------------------------- choose --

export function choose(ctx) {
  const b = ctx.state.beat;
  const out = [];
  if (b.intro) out.push(`<div class="note-paper intro"><p>${esc(b.intro)}</p></div>`);
  if (b.peek) out.push(`<div class="angle"><span class="stamp">through the peephole</span><p>${esc(b.peek.name)}: ${b.peek.choice ? esc(b.peek.choice) : 'hasn’t decided yet.'}</p></div>`);
  if (b.myChoice) {
    const o = b.options?.find((x) => x.id === b.myChoice.option);
    const target = b.myChoice.target ? ctx.state.players.find((p) => p.id === b.myChoice.target)?.name : null;
    out.push(`<div class="locked-in"><span class="stamp">you chose</span><div class="li-name">${esc(o?.label ?? b.myChoice.option)}${target ? ` — ${esc(target)}` : ''}${b.myChoice.amount != null ? ` — ${money(b.myChoice.amount)}` : ''}</div></div>`);
    out.push(waitingLine(b.waiting));
    return out.join('');
  }
  if (!b.canChoose) {
    out.push(`<p class="waiting">${b.decided?.length ? `Decided: ${esc(listNames(b.decided))}. ` : ''}${b.waiting?.length ? `Still deciding: ${esc(listNames(b.waiting))}.` : ''}</p>`);
    return out.join('');
  }
  const opts = b.options ?? [];
  const sel = ctx.ui.pick.opt ?? (opts.length === 1 ? opts[0].id : null);
  out.push('<div class="options">');
  for (const o of opts) {
    const on = sel === o.id;
    out.push(`<button class="option pickable${on ? ' mine' : ''}${o.disabled ? ' off' : ''}" data-cmd="pick" data-args="${data({ key: 'opt', value: o.id })}"${o.disabled ? ' disabled' : ''}>
      <span class="o-label">${esc(o.label)}</span>
      ${o.blurb ? `<span class="o-blurb">${esc(o.blurb)}</span>` : ''}
      ${o.disabled ? `<span class="o-off">${esc(o.disabled)}</span>` : ''}
    </button>`);
  }
  out.push('</div>');
  const o = opts.find((x) => x.id === sel);
  if (o) {
    const needs = [];
    if (o.target) {
      const ids = o.targets ?? ctx.state.players.filter((p) => p.id !== ctx.me || o.target !== 'other').map((p) => p.id);
      out.push(`<div class="field"><span class="stamp">${o.id === 'warn' ? 'who do you warn?' : 'who?'}</span>${seatPicker(ctx, `target:${o.id}`, ids, { exclude: o.target === 'other' ? [ctx.me] : [] })}</div>`);
      if (!ctx.ui.pick[`target:${o.id}`]) needs.push('target');
    }
    if (o.amount) out.push(`<div class="field"><span class="stamp">how much?</span>${amountSlider(ctx, `amount:${o.id}`, o.amount)}</div>`);
    const a = { t: 'choose', option: o.id };
    if (o.target) a.target = ctx.ui.pick[`target:${o.id}`];
    if (o.amount) a.amount = Math.max(o.amount.min, Math.min(o.amount.max, ctx.ui.pick[`amount:${o.id}`] ?? o.amount.min));
    out.push(`<div class="row">${actBtn('That’s my decision', a, { disabled: needs.length > 0, fill: o.amount ? { amount: `amount:${o.id}` } : null })}</div>`);
  }
  out.push(`<p class="faint">Nobody sees what you choose${ctx.state.beat.revealPublic ? ' until everybody has' : ''}.</p>`);
  return out.join('');
}

// --------------------------------------------------------------- roll --

export function roll(ctx) {
  const b = ctx.state.beat;
  const out = [];
  if (b.stage === 'roll') {
    const mods = b.mods?.length ? b.mods.map((m) => `${esc(m.label)} ${m.n > 0 ? '+' : ''}${m.n}`).join(' · ') : '';
    out.push(`<div class="odds">${b.odds ? `<span class="odds-words">${esc(b.odds)}${mods ? ', counting ' : ''}</span>` : `<span class="target">needs ${b.target}</span>`}${mods ? `<span class="target">${mods}</span>` : ''}</div>`);
    if (b.stakes) out.push(`<p class="stakes">${esc(b.stakes)}</p>`);
    if (b.rollerId === ctx.me) out.push(`<div class="row center">${actBtn('Roll the dice', { t: 'roll' }, { cls: 'btn big' })}</div>`);
    else out.push(`<p class="waiting">${esc(b.roller)} has the dice.</p>`);
  }
  return out.join('');
}

/** The dice, while anybody still has a chance to bend them. */
export function windowPanel(ctx) {
  const w = ctx.state.beat.window;
  if (!w) return '';
  const key = `${w.id}:${w.dice.join('')}`;
  const fresh = isNewRoll(key);
  const face = w.faces ? Math.max(1, Math.min(6, w.total)) : w.total;
  const tieFace = w.faces ? w.faces.find((f) => f.faces.includes(face)) : null;
  const makes = w.target != null ? w.total >= w.target : null;
  const hot = (f) => !!w.faces?.some((x) => x.faces.includes(f));
  const out = [`<div class="felt-dice${fresh ? ' fresh' : ''}" data-key="w${esc(w.id)}">`];
  out.push(`<div class="dice-row">${w.dice.map((f) => die(f, { size: 84, rolling: fresh, hot: hot(f) })).join('')}</div>`);
  out.push(`<div class="dice-sum">${w.mods.length ? `${w.dice.join(' + ')} ${w.mods.map((m) => `${m.n >= 0 ? '+' : '−'} ${Math.abs(m.n)} <small>${esc(m.label)}</small>`).join(' ')} = ` : ''}<b>${w.total}</b>${w.target != null ? ` <span class="vs">needs ${w.target}</span>` : ''}</div>`);
  if (makes != null) out.push(`<div class="verdict-line ${makes ? 'good' : 'bad'}">${makes ? 'IT’S GOOD — for now' : `SHORT BY ${w.target - w.total} — for now`}</div>`);
  if (tieFace) out.push(`<div class="verdict-line">${esc(ctx.state.beat.options?.find((o) => o.id === tieFace.id)?.label ?? '')}</div>`);
  out.push(`<p class="faint">${esc(w.label ?? '')}</p>`);
  out.push('</div>');
  const acts = [];
  if (w.canMuscle) acts.push(actBtn('Lean on it (+2)', { t: 'muscle' }, { cls: 'btn small' }));
  if (w.canMechanic) acts.push(actBtn('Fix the car', { t: 'mechanic' }, { cls: 'btn small', title: 'Once a week: the getaway is clean, whatever the dice say' }));
  const cards = (ctx.state.you?.cards ?? []).filter((c) => c.playable && ['lucky-horseshoe', 'black-cat', 'let-it-ride', 'the-piece'].includes(c.id));
  for (const c of cards) acts.push(actBtn(esc(c.name), { t: 'card', uid: c.uid }, { cls: 'btn small card-btn', title: c.text }));
  if (w.canAct) {
    out.push(`<div class="interrupt"><span class="stamp">before it stands</span><div class="row center">${acts.join('')}${actBtn('Let it stand', { t: 'pass' }, { cls: 'ghost-btn' })}</div></div>`);
  } else if (ctx.state.beat.waitingOn?.length) {
    out.push(`<p class="waiting center">${esc(listNames(ctx.state.beat.waitingOn))} ${ctx.state.beat.waitingOn.length === 1 ? 'is' : 'are'} deciding whether to touch the dice.</p>`);
  }
  return out.join('');
}

// ----------------------------------------------------------- whispers --

export function whispers(ctx) {
  const b = ctx.state.beat;
  const out = [];
  if (b.who) out.push(`<p class="who-line"><span class="stamp">behind the door</span> ${esc(b.who)}</p>`);
  if (b.myClue) {
    const kept = b.myNote?.mode;
    out.push(`<div class="index-card"><span class="stamp">your card</span><p>${esc(b.myClue.text)}</p>${b.myClue.filler ? '<p class="faint small">It’s not much. You could make something up.</p>' : ''}</div>`);
    if (b.canNote) {
      out.push(`<p>Pass it to ${esc(b.talker)} as written, turn it around, or keep it to yourself. When it’s over, everybody sees every card next to every note.</p>
      <div class="note-choices">
        <button class="napkin" data-act="${data({ t: 'note', mode: 'pass' })}"><span class="stamp">pass it on</span><span>${esc(b.myClue.text)}</span></button>
        ${b.myClue.other ? `<button class="napkin lie" data-act="${data({ t: 'note', mode: 'flip' })}"><span class="stamp">${b.myClue.filler ? 'make something up' : 'turn it around'}</span><span>${esc(b.myClue.other)}</span></button>` : ''}
        <button class="napkin keep" data-act="${data({ t: 'note', mode: 'keep' })}"><span class="stamp">keep it</span><span>Say nothing.</span></button>
      </div>`);
    } else if (kept) {
      out.push(`<p class="waiting">You ${kept === 'pass' ? 'passed it on as written' : kept === 'flip' ? (b.myNote.forged ? 'passed a forgery' : 'turned it around') : 'kept it to yourself'}.</p>`);
    }
  }
  if (b.youTalk) {
    if (b.ownClue) out.push(`<div class="index-card own"><span class="stamp">what you know yourself</span><p>${esc(b.ownClue.text)}</p></div>`);
    if (b.notes) {
      out.push(`<div class="notes-in"><span class="stamp">what they told you</span>${b.notes.map((n) => `<div class="napkin-in${n.text ? '' : ' blank'}"><span class="from">${esc(n.from)}</span>${n.text ? esc(n.text) : '<i>said nothing</i>'}</div>`).join('')}</div>`);
    } else {
      out.push(`<p class="waiting">You’re doing the talking. Everybody else is deciding what to tell you. ${b.holding?.length ? `Still holding: ${esc(listNames(b.holding))}.` : ''}</p>`);
    }
    if (b.canOpen) {
      out.push(`<div class="options">${b.openings.map((o) => `<div class="option"><span class="o-label">${esc(o.label)}</span>${o.blurb ? `<p class="o-blurb">${esc(o.blurb)}</p>` : ''}<div class="row tight">${actBtn('Say this', { t: 'open', opening: o.id }, { cls: 'btn small' })}</div></div>`).join('')}</div>`);
    }
  } else if (!b.myClue) {
    out.push(`<p class="waiting">${esc(b.talker)} is doing the talking. ${b.holding?.length ? `Notes still to come from ${esc(listNames(b.holding))}.` : ''}</p>`);
    out.push(`<div class="options muted">${b.openings.map((o) => `<div class="option"><span class="o-label">${esc(o.label)}</span></div>`).join('')}</div>`);
  }
  return out.join('');
}

// --------------------------------------------------------------- grab --

export function grab(ctx) {
  const b = ctx.state.beat;
  const out = [];
  const trip = Math.max(0, Math.min(6, b.level));
  out.push(`<div class="vault">
    <div class="vault-top"><span class="stamp">round ${b.round} of ${b.rounds}</span><span class="pot">${money(b.pot)} on the table</span></div>
    <div class="alarm"><span>${esc(b.alarm)}</span><span class="alarm-faces">${[1, 2, 3, 4, 5, 6].map((f) => die(f, { size: 24, hot: f <= trip })).join('')}</span></div>
    ${b.peek != null ? `<div class="peek"><span class="stamp">lookout</span> The next alarm die is ${die(b.peek, { size: 26, hot: b.peek <= trip })} ${b.peek <= trip ? '— it trips.' : '— it holds.'}</div>` : ''}
    <div class="inside">${b.inside.map((p) => `<span class="chip${p.moved ? ' moved' : ''}">${esc(p.name)}${p.moved ? ' ✓' : ''}</span>`).join('')}${b.out.map((n) => `<span class="chip out">${esc(n)} — out</span>`).join('')}${b.caught.map((n) => `<span class="chip caught">${esc(n)} — caught</span>`).join('')}</div>
    ${b.driver ? `<p class="faint">${esc(b.driver)} ${b.driverLeft ? 'has pulled away from the curb. Anybody still inside walks home.' : 'is at the curb with the engine running.'}</p>` : ''}
  </div>`);
  if (b.amInside || b.myHaul) out.push(`<p class="haul">Your haul so far: <b>${money(b.myHaul)}</b></p>`);
  if (b.angle && b.amInside && !b.myMove) {
    out.push(`<div class="angle"><span class="stamp">your angle</span><p>${esc(b.angle.blurb)}</p><div class="row">${actBtn(esc(b.angle.label), { t: 'angle' }, { cls: 'ghost-btn red' })}</div></div>`);
  }
  if (b.amInside && !b.myMove) {
    out.push(`<div class="row center big-choice">${actBtn('Grab', { t: 'grab', move: 'grab' }, { cls: 'btn big red' })}${actBtn('Go', { t: 'grab', move: 'go' }, { cls: 'btn big' })}</div>`);
    out.push('<p class="faint center">Grab and you split this round’s money with everybody else who grabs — then the alarm die. Go and you keep what you’ve got.</p>');
  } else if (b.amInside) {
    out.push(`<p class="waiting">You chose to ${esc(b.myMove)}. Waiting on everybody else inside.</p>`);
  }
  if (b.amDriver && !b.driverLeft) out.push(`<div class="row center">${actBtn('Pull away from the curb', { t: 'leave' }, { cls: 'ghost-btn' })}</div><p class="faint center">Leave and nobody can catch the car. Anybody still inside walks home.</p>`);
  if (b.history?.length) {
    out.push(`<table class="history"><tr><th>Round</th><th>Grabbed</th><th>Each</th><th>Alarm</th></tr>${b.history.map((r) => `<tr class="${r.tripped ? 'bad' : ''}"><td>${r.round}</td><td>${r.grabbed}${r.went.length ? ` <small>(${esc(listNames(r.went))} left)</small>` : ''}</td><td>${money(r.each)}</td><td>${r.die == null ? '—' : die(r.die, { size: 20, hot: r.tripped })}</td></tr>`).join('')}</table>`);
  }
  return out.join('');
}

// --------------------------------------------------------------- plan --

export function plan(ctx) {
  const b = ctx.state.beat;
  const out = [`<div class="odds"><span class="target">needs ${b.target} in all: everybody’s effort, plus one die</span></div>`];
  if (b.canCommit) {
    out.push(`<div class="options three">${b.moves.map((m) => `<div class="option ${m.id}${m.disabled ? ' off' : ''}">
      <span class="o-label">${esc(m.label)}</span>
      <span class="o-n">${m.n > 0 ? '+' : ''}${m.n}</span>
      ${m.cost ? `<span class="o-blurb">Costs ${money(m.cost)}</span>` : '<span class="o-blurb">Free</span>'}
      ${actBtn(m.id === 'sabotage' ? 'Do it' : 'This', { t: 'plan', move: m.id }, { cls: m.id === 'sabotage' ? 'ghost-btn red small' : 'btn small', disabled: !!m.disabled, title: m.disabled ?? '' })}
    </div>`).join('')}</div><p class="faint">Nobody sees who did what. They see the numbers, shuffled.</p>`);
  } else if (b.myMove) {
    out.push(`<p class="waiting">You chose: ${esc(b.moves.find((m) => m.id === b.myMove)?.label)}. ${b.committed?.length ? `In: ${esc(listNames(b.committed))}.` : ''}</p>`);
  } else if (b.values) {
    out.push(`<div class="values">${b.values.map((v) => `<span class="val ${v < 0 ? 'neg' : v > 0 ? 'pos' : ''}">${v > 0 ? '+' : ''}${v}</span>`).join('')}<span class="val total">= ${b.total >= 0 ? '+' : ''}${b.total}</span></div>`);
  } else {
    out.push(waitingLine(ctx.state.beat.waitingOn));
  }
  return out.join('');
}

// -------------------------------------------------------------- draft --

export function draft(ctx) {
  const b = ctx.state.beat;
  const out = [`<p class="order"><span class="stamp">order</span> ${b.order.map((n) => `<span class="${n === b.turn ? 'now' : ''}">${esc(n)}</span>`).join(' → ')}</p>`];
  out.push(`<div class="options items">${b.items.map((it) => `<div class="option item${it.taken ? ' taken' : ''}">
    <span class="o-label">${esc(it.label)}</span>
    ${it.blurb ? `<p class="o-blurb">${esc(it.blurb)}</p>` : ''}
    ${it.taken ? `<span class="o-taken">${esc(it.taken)} took it</span>` : b.yourTurn ? actBtn('Take this', { t: 'pick', item: it.id }, { cls: 'btn small' }) : ''}
  </div>`).join('')}</div>`);
  if (!b.yourTurn && b.turn) out.push(`<p class="waiting">${esc(b.turn)} is choosing.</p>`);
  return out.join('');
}

// ------------------------------------------------------------- report --

export function report(ctx) {
  const b = ctx.state.beat;
  if (b.canReport) {
    return `<div class="index-card own"><span class="stamp">only you can see this</span><p>It comes to <b>${money(b.actual)}</b>.</p></div>
      <p>What do you tell them it comes to? Whatever you don’t say is yours.</p>
      ${amountSlider(ctx, 'report', { min: 0, max: b.actual, step: 5000 })}
      <div class="row">${actBtn('Tell them', { t: 'report', amount: Math.min(b.actual, ctx.ui.pick.report ?? 0) }, { fill: { amount: 'report' } })}</div>`;
  }
  if (b.reported != null) return `<p class="big-number">${esc(b.counter)} says: <b>${money(b.reported)}</b></p>`;
  return `<p class="waiting">${esc(b.counter)} is counting it, alone, under one bulb.</p>`;
}

// ------------------------------------------------------------ sitdown --

export function sitdown(ctx, { offerComposer }) {
  const b = ctx.state.beat;
  const out = [];
  if (!b.amDone && ctx.state.you) {
    if (b.menu?.length) {
      out.push(`<div class="menu"><span class="stamp">under the counter</span>${b.menu.map((m) => `<div class="menu-row">
        <div><b>${esc(m.label)}</b> <span class="money">${money(m.cost)}</span><p class="o-blurb">${esc(m.blurb)}</p></div>
        ${m.target ? `${seatPicker(ctx, 'buy:' + m.id, b.seats.map((s) => s.id))}${actBtn('Buy', { t: 'buy', item: m.id, target: ctx.ui.pick['buy:' + m.id] }, { cls: 'btn small', disabled: !ctx.ui.pick['buy:' + m.id] })}` : actBtn('Buy', { t: 'buy', item: m.id }, { cls: 'btn small' })}
      </div>`).join('')}</div>`);
    }
    out.push(offerComposer(ctx));
    out.push(`<div class="row">${actBtn('I’m done at this table', { t: 'done' })}</div>`);
  } else if (b.amDone) {
    out.push('<p class="waiting">You’re done. Offers can still come to you.</p>');
  }
  if (b.done?.length) out.push(`<p class="faint">Done: ${esc(listNames(b.done))}.</p>`);
  return out.join('');
}

// ----------------------------------------------------------- receipts --

export function receipt(r, state) {
  if (!r) return '';
  if (r.kind === 'votes') {
    return `<div class="receipt"><span class="stamp">the votes</span>${r.votes.map((v) => `<div class="r-row"><span>${esc(v.name)}</span><span>${esc(v.label)}${v.weight > 1 ? ` <small>×${v.weight}</small>` : ''}</span></div>`).join('')}</div>`;
  }
  if (r.kind === 'choices') {
    return `<div class="receipt"><span class="stamp">everybody’s choice</span>${r.rows.map((v) => `<div class="r-row"><span>${esc(v.name)}</span><span>${esc(v.label)}${v.target ? ` → ${esc(v.target)}` : ''}${v.amount != null ? ` ${money(v.amount)}` : ''}</span></div>`).join('')}</div>`;
  }
  if (r.kind === 'whispers') {
    return `<div class="receipt"><span class="stamp">every card, next to every note</span>
      <p class="small">${esc(r.talker)} said ${esc(r.pick)}. ${r.success ? 'It was right.' : `It should have been ${esc(r.correct)}.`}</p>
      ${r.rows.map((x) => `<div class="w-row${x.lied ? ' lied' : ''}${x.bad ? ' bad' : ''}">
        <div class="w-name">${esc(x.name)}${x.lied ? ' <span class="stampmark">LIAR</span>' : x.bad ? ' <span class="stampmark soft">BAD INTEL</span>' : ''}</div>
        <div class="w-card"><small>card</small> ${esc(x.card)}</div>
        ${x.own ? '' : `<div class="w-note"><small>note</small> ${x.kept ? '<i>kept it</i>' : esc(x.passed)}</div>`}
      </div>`).join('')}</div>`;
  }
  if (r.kind === 'grab') {
    return `<div class="receipt"><span class="stamp">who grabbed, and when</span>${r.rounds.map((x) => `<div class="r-row${x.tripped ? ' bad' : ''}"><span>Round ${x.round}</span><span>${x.grabbed.length ? esc(listNames(x.grabbed)) : 'nobody'} ${x.each ? `(${money(x.each)} each)` : ''}${x.went.length ? ` · ${esc(listNames(x.went))} went` : ''}${x.tripped ? ' · ALARM' : ''}</span></div>`).join('')}
      ${r.hauls.length ? `<div class="r-sum">${r.hauls.map((h) => `${esc(h.name)} ${money(h.n)}`).join(' · ')}</div>` : ''}</div>`;
  }
  if (r.kind === 'plan') {
    return `<div class="receipt"><span class="stamp">the effort, shuffled</span><div class="values">${r.values.map((v) => `<span class="val ${v < 0 ? 'neg' : v > 0 ? 'pos' : ''}">${v > 0 ? '+' : ''}${v}</span>`).join('')}<span class="val total">+ die ${r.die} = ${r.total + r.die} of ${r.target}</span></div></div>`;
  }
  if (r.kind === 'draft') {
    return `<div class="receipt"><span class="stamp">who took what</span>${r.rows.map((x) => `<div class="r-row"><span>${esc(x.name)}</span><span>${esc(x.item)}</span></div>`).join('')}</div>`;
  }
  if (r.kind === 'report') return `<div class="receipt"><span class="stamp">the count</span><p>${esc(r.counter)} said ${money(r.reported)}.</p></div>`;
  if (r.kind === 'deals') {
    return `<div class="receipt"><span class="stamp">signed at the table</span>${[...r.oaths.map((o) => `Blood Oath: ${esc(o)}`), ...r.ious.map((o) => `IOU: ${esc(o)}`)].map((l) => `<p>${l}</p>`).join('') || '<p>Nothing.</p>'}</div>`;
  }
  if (r.kind === 'pockets') {
    return `<div class="receipt"><span class="stamp">on the kitchen table</span>${r.rows.map((x) => `<div class="r-row"><span>${esc(x.name)}</span><span>${money(x.cash)} ${heatPips(x.heat)}${x.pages ? ` · ${x.pages} page${x.pages === 1 ? '' : 's'}` : ''}</span></div>`).join('')}</div>`;
  }
  return '';
}

export const PANELS = { vote, choose, roll, whispers, grab, plan, draft, report, sitdown };
