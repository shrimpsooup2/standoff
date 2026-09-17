// The one file you edit to change how this deployment behaves.

/**
 * Where two browsers get introduced to each other.
 *
 * Cross-device play needs somebody to pass the first few messages between the
 * host's tab and each guest's phone. After that the phones talk directly and
 * this is not used again — so it handles a few kilobytes per player, per game,
 * and nothing else. It never sees a move, a whisper or a score.
 *
 * When you run `node server.js`, its own /signal endpoint does this job and you
 * do not need to set anything here. On GitHub Pages there is no server, so
 * point this at one you can reach:
 *
 *   export const SIGNAL_URL = 'wss://standoff-signal.example.com/signal';
 *
 * Running one is `node server.js` on anything with a public address — the same
 * process, the same file. Leave it null and Pages offers pass-and-play and solo
 * only, which is honest: without an introduction service there is no way for
 * two phones to find each other.
 */
export const SIGNAL_URL = null;
