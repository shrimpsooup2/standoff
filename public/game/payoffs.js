// Every job gets its own numbers. The shape is always a dilemma, but the
// *size* of the temptation moves around, which is what keeps the table honest
// (or doesn't).

/**
 * Classic prisoner's dilemma constraints:
 *   T > R > P > S        — betraying a loyal partner is the best single outcome
 *   2R > T + S           — mutual loyalty beats taking turns stabbing each other
 *
 * T: temptation (you fold, they stand)
 * R: reward     (both stand)
 * P: punishment (both fold)
 * S: sucker     (you stand, they fold)
 */
export function makeMatrix(rng, stakes = 1) {
  let T, R, P, S;
  do {
    R = rng.int(4, 6);
    T = R + rng.int(1, 4);
    P = rng.int(1, R - 1);
    S = rng.int(0, Math.max(0, P - 1));
  } while (!(T > R && R > P && P > S && 2 * R > T + S));
  const scale = (n) => Math.round(n * stakes);
  return { T: scale(T), R: scale(R), P: scale(P), S: scale(S), stakes };
}

/** How heavy the round is. Later jobs are worth more; the last one is worth everything. */
export function stakesForRound(round, totalRounds) {
  if (round >= totalRounds) return 3;
  if (round === totalRounds - 1) return 2;
  if (round === 1) return 1;
  return round % 2 === 0 ? 1.5 : 1;
}

/** Pairwise resolution. `mine` and `theirs` are 'stand' | 'fold'. */
export function pairPayoff(matrix, mine, theirs) {
  if (mine === 'stand' && theirs === 'stand') return matrix.R;
  if (mine === 'stand' && theirs === 'fold') return matrix.S;
  if (mine === 'fold' && theirs === 'stand') return matrix.T;
  return matrix.P;
}

/**
 * Group resolution (3 players, or the whole table). A public-goods pot:
 * everyone who STANDS puts their share in, the pot is multiplied by the
 * family's cut and split evenly. Everyone who FOLDS keeps their share *and*
 * eats from the pot anyway.
 *
 * With multiplier m and n players, standing pays (m/n) per unit contributed —
 * a loss for you, a gain for everyone else. Same knife, bigger table.
 */
export function groupPayoff({ contribution, multiplier, n, standCount }) {
  const pot = standCount * contribution * multiplier;
  const share = n > 0 ? pot / n : 0;
  return {
    stand: Math.round(share),
    fold: Math.round(share + contribution),
    pot: Math.round(pot),
    share: Math.round(share),
  };
}

/** Multiplier tuned so that standing is individually bad and collectively great. */
export function groupParams(rng, n, stakes = 1) {
  const contribution = Math.round(rng.int(5, 8) * stakes);
  // multiplier < n keeps the dilemma alive; > 1 keeps cooperation worth wanting.
  const multiplier = Math.min(n - 0.4, 1.4 + rng.int(0, 6) / 10);
  return { contribution, multiplier: Number(multiplier.toFixed(2)), n };
}
