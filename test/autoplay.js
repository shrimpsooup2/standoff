// What a patient, unimaginative person would do next, given only what their
// own screen shows them. The socket tests play whole weeks with this.

export function autoAction(view, { greedy = false } = {}) {
  if (!view || view.phase !== 'playing' || !view.you) return null;
  const b = view.beat;
  const me = view.you.id;
  if (!b) return null;
  if (b.window) return b.window.canAct ? { t: 'pass' } : null;
  if (b.stage === 'fallout') return b.ready?.includes(me) ? null : { t: 'next' };
  switch (b.engine) {
    case 'vote':
      if (b.stage === 'vote' && b.canVote) {
        const opt = b.options.find((o) => !(b.noSelf && o.id === me));
        return opt ? { t: 'vote', option: opt.id } : null;
      }
      if (b.stage === 'reveal' && (b.reveal || b.canFix)) return { t: 'reveal-pass' };
      return null;
    case 'choose': {
      if (!b.canChoose) return null;
      const opt = (b.options ?? []).find((o) => !o.disabled);
      if (!opt) return null;
      const a = { t: 'choose', option: opt.id };
      if (opt.target) a.target = (opt.targets ?? view.players.map((p) => p.id)).find((id) => id !== me);
      if (opt.amount) a.amount = greedy ? opt.amount.min : opt.amount.max;
      return a;
    }
    case 'roll':
      return b.stage === 'roll' && b.rollerId === me ? { t: 'roll' } : null;
    case 'whispers':
      if (b.canNote) return { t: 'note', mode: 'pass' };
      if (b.canOpen) return { t: 'open', opening: b.openings[0].id };
      return null;
    case 'grab':
      return b.amInside && !b.myMove ? { t: 'grab', move: b.round < 3 ? 'grab' : 'go' } : null;
    case 'plan':
      return b.canCommit ? { t: 'plan', move: 'coast' } : null;
    case 'draft': {
      if (!b.yourTurn) return null;
      const it = b.items.find((x) => !x.taken);
      return it ? { t: 'pick', item: it.id } : null;
    }
    case 'report':
      return b.canReport ? { t: 'report', amount: b.actual } : null;
    case 'sitdown':
      return b.amDone ? null : { t: 'done' };
    default:
      return null;
  }
}
