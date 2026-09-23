// Dice on the felt: big, ivory, and rolling when they land.

const PIPS = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[26, 26], [50, 50], [74, 74]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[27, 27], [73, 27], [50, 50], [27, 73], [73, 73]],
  6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]],
};

/** One die face as SVG. `hot` marks a face that means something (a tie-break, an alarm). */
export function die(face, { size = 64, rolling = false, hot = false, label = '' } = {}) {
  const f = Math.max(1, Math.min(6, Math.round(face) || 1));
  const pips = PIPS[f].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" />`).join('');
  return `<svg class="die${rolling ? ' rolling' : ''}${hot ? ' hot' : ''}" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="${label || `a ${f}`}">
    <rect x="4" y="4" width="92" height="92" rx="18" />${pips}</svg>`;
}

/** A small face for option labels: "this bank is 5 or 6". */
export function mini(face) {
  return die(face, { size: 22 });
}

/**
 * The first time a roll is seen it tumbles; after that it just sits there.
 * The key is whatever identifies this particular throw.
 */
const seen = new Set();
export function isNewRoll(key) {
  if (seen.has(key)) return false;
  seen.add(key);
  if (seen.size > 400) seen.clear();
  return true;
}
