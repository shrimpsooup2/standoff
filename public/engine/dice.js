// Dice, and how to say the odds out loud.

/** Ways to make each total on two six-sided dice. */
const TWO_D6 = [0, 0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1];

/** Chance, 0..1, that two dice come up `target` or more. */
export function chance2d6(target) {
  if (target <= 2) return 1;
  if (target > 12) return 0;
  let ways = 0;
  for (let t = target; t <= 12; t++) ways += TWO_D6[t];
  return ways / 36;
}

/** Chance, 0..1, that one die comes up `target` or more. */
export function chance1d6(target) {
  if (target <= 1) return 1;
  if (target > 6) return 0;
  return (7 - target) / 6;
}

export function chance(dice, target) {
  return dice === 1 ? chance1d6(target) : chance2d6(target);
}

/** "needs 8 or more — about 4 in 10". */
export function oddsText(dice, target) {
  const p = chance(dice, target);
  const face = dice === 1 ? 'a' : 'two dice';
  if (p >= 1) return `can't miss`;
  if (p <= 0) return `can't be done without help`;
  const tens = Math.round(p * 10);
  const odds = tens >= 10 ? 'nearly certain' : tens <= 0 ? 'almost no chance' : `about ${tens} in 10`;
  return `needs ${target}+ on ${face}${dice === 1 ? ' die' : ''} — ${odds}`;
}

export const pct = (p) => `${Math.round(p * 100)}%`;
