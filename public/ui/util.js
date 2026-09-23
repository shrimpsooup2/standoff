// Small things every screen needs.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Money the way people say it: $40k, $1.2m. */
export function money(n) {
  const v = Math.round(Number(n) || 0);
  const sign = v < 0 ? '−' : '';
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${sign}$${(a / 1_000_000).toFixed(a % 1_000_000 === 0 ? 0 : 1)}m`;
  if (a >= 1000) return `${sign}$${Math.round(a / 1000)}k`;
  return `${sign}$${a}`;
}

export const paras = (list) => (list ?? []).filter(Boolean).map((t) => `<p>${esc(t)}</p>`).join('');

export function listNames(names) {
  const n = (names ?? []).filter(Boolean);
  if (n.length <= 1) return n[0] ?? 'nobody';
  return `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`;
}

/** An attribute-safe JSON payload for a button. */
export const data = (obj) => esc(JSON.stringify(obj));

/** A button that sends a game action when pressed. */
export function actBtn(label, a, { cls = 'btn', disabled = false, title = '', as = null, fill = null } = {}) {
  // `fill` names fields to read from what's been typed or slid, when pressed
  return `<button class="${cls}" data-act="${data(a)}"${fill ? ` data-fill="${data(fill)}"` : ''}${as ? ` data-as="${esc(as)}"` : ''}${disabled ? ' disabled' : ''}${title ? ` title="${esc(title)}"` : ''}>${label}</button>`;
}

/** A button that runs a named client command. */
export function cmdBtn(label, cmd, args = {}, { cls = 'ghost-btn', disabled = false } = {}) {
  return `<button class="${cls}" data-cmd="${esc(cmd)}" data-args="${data(args)}"${disabled ? ' disabled' : ''}>${label}</button>`;
}

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The heat pips on a seat: three chances, then county. */
export function heatPips(n, jailed = false) {
  if (jailed) return '<span class="pips jailed" title="In county">COUNTY</span>';
  return `<span class="pips" title="${n} heat">${[0, 1, 2].map((i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
}
