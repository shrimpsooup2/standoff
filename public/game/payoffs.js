// What a job is worth, before anybody decides what to do about it.
//
// The moves themselves live in options.js; this file only sets the size of the
// stake. One shape covers every room: a stake each, a pot that grows by the
// family's cut, and a split that takes no interest in who paid for it.

/** How heavy the round is. Later jobs are worth more; the last one is worth everything. */
export function stakesForRound(round, totalRounds) {
  if (round >= totalRounds) return 3;
  if (round === totalRounds - 1) return 2;
  if (round === 1) return 1;
  return round % 2 === 0 ? 1.5 : 1;
}

/**
 * The stake for one job.
 *
 * The multiplier is what makes it a dilemma: above 1, so the room is always
 * better off if everybody puts in; below the number of people, so each person
 * is always better off keeping theirs. Both of those are true at once, which
 * is the entire game.
 */
export function groupParams(rng, n, stakes = 1) {
  const contribution = Math.round(rng.int(5, 8) * stakes);
  const multiplier = Math.min(n - 0.4, 1.4 + rng.int(0, 6) / 10);
  return { contribution, multiplier: Number(multiplier.toFixed(2)), n };
}
