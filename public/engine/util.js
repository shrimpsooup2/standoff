// Small things every part of the engine needs.

export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/** Money the way people say it: $40k, $1.2m, $500. */
export function money(n) {
  const v = Math.round(Number(n) || 0);
  const sign = v < 0 ? '−' : '';
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${sign}$${(a / 1_000_000).toFixed(a % 1_000_000 === 0 ? 0 : 1)}m`;
  if (a >= 1000) return `${sign}$${Math.round(a / 1000)}k`;
  return `${sign}$${a}`;
}

/** Round to the nearest $5k, which is how money is counted on a kitchen table. */
export const round5k = (n) => Math.round(n / 5000) * 5000;

/** "Andre", "Andre and Mo", "Andre, Mo and Kit". */
export function listNames(names) {
  const n = names.filter(Boolean);
  if (n.length <= 1) return n[0] ?? 'nobody';
  return `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`;
}

/** Plural helper for the things that come in ones and twos. */
export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const words = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
export const inWords = (n) => words[n] ?? String(n);

/** A deep copy of plain data. State is always plain JSON, so this is safe. */
export const copy = (v) => JSON.parse(JSON.stringify(v));

export const str = (v, max) => String(v ?? '').slice(0, max);
