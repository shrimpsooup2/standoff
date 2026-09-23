// Every story STANDOFF can tell. Each chapter is self-contained: its own cast,
// its own week, its own ending. The rules underneath are shared.

import salsLedger from './sals-ledger/index.js';

export const CHAPTERS = { [salsLedger.id]: salsLedger };
export const DEFAULT_CHAPTER = salsLedger.id;

export function getChapter(id) {
  return CHAPTERS[id] ?? CHAPTERS[DEFAULT_CHAPTER];
}

/** What the door shows: the chapters you can play, and the ones coming. */
export const CATALOGUE = [
  { id: salsLedger.id, number: 1, title: salsLedger.title, blurb: salsLedger.blurb, ready: true },
  { id: 'chapter-2', number: 2, title: 'Coming later', blurb: 'Another week, another table.', ready: false },
];
