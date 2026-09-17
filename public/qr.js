// A QR encoder, because the alternative is a dependency.
//
// Scope is deliberately small: byte mode, error correction level M, versions
// 1 to 10. That covers 216 bytes, and the longest thing we ever encode is a
// join URL. Anything bigger throws rather than silently producing a code that
// a phone cannot read.
//
// Everything here is ISO/IEC 18004. The tables are the ones from the spec; the
// format and version bits are computed with their BCH generators rather than
// copied, because a wrong table entry is invisible until somebody's phone
// refuses to scan the thing in a pub.

/* ------------------------------------------------------------ the tables -- */

// [data codewords, ec codewords per block, [[blocks, data codewords], ...]]
const LEVEL_M = {
  1: [16, 10, [[1, 16]]],
  2: [28, 16, [[1, 28]]],
  3: [44, 26, [[1, 44]]],
  4: [64, 18, [[2, 32]]],
  5: [86, 24, [[2, 43]]],
  6: [108, 16, [[4, 27]]],
  7: [124, 18, [[4, 31]]],
  8: [154, 22, [[2, 38], [2, 39]]],
  9: [182, 22, [[3, 36], [2, 37]]],
  10: [216, 26, [[4, 43], [1, 44]]],
};

// centres of the alignment patterns, per version
const ALIGN = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
  6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
};

// bits of padding after the interleaved codewords
const REMAINDER = { 1: 0, 2: 7, 3: 7, 4: 7, 5: 7, 6: 7, 7: 0, 8: 0, 9: 0, 10: 0 };

const MAX_VERSION = 10;

/* ---------------------------------------------------------------- GF(256) -- */

// The field QR uses: x^8 + x^4 + x^3 + x^2 + 1.
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

const mul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

/** The generator polynomial for `degree` error correction codewords. */
function generator(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];                        // the x term
      next[j + 1] ^= mul(poly[j], EXP[i]);       // the alpha^i term
    }
    poly = next;
  }
  return poly;
}

/** Reed-Solomon remainder: the error correction codewords for one block. */
export function ecBytes(data, count) {
  const gen = generator(count);
  const out = new Array(count).fill(0);
  for (const byte of data) {
    const factor = byte ^ out[0];
    out.shift();
    out.push(0);
    for (let i = 0; i < count; i++) out[i] ^= mul(gen[i + 1], factor);
  }
  return out;
}

/* ------------------------------------------------------------ BCH codes -- */

const bitLength = (n) => 32 - Math.clz32(n);

/** Polynomial division over GF(2): `value` shifted up, plus its remainder. */
function bch(value, generatorPoly, bits) {
  let rest = value << bits;
  const width = bitLength(generatorPoly);
  while (bitLength(rest) >= width) rest ^= generatorPoly << (bitLength(rest) - width);
  return (value << bits) | rest;
}

/** 15 bits of format information: the level, the mask, and BCH parity. */
export function formatBits(mask) {
  const LEVEL_BITS = 0b00;                       // level M
  const data = (LEVEL_BITS << 3) | mask;
  return (bch(data, 0b10100110111, 10) ^ 0b101010000010010) & 0x7fff;
}

/** 18 bits of version information, only present from version 7 up. */
export function versionBits(version) {
  return bch(version, 0b1111100100101, 12) & 0x3ffff;
}

/* ------------------------------------------------------------- encoding -- */

const utf8 = (text) => Array.from(new TextEncoder().encode(text));

function pickVersion(byteLength) {
  for (let v = 1; v <= MAX_VERSION; v++) {
    const [capacity] = LEVEL_M[v];
    const countBits = v < 10 ? 8 : 16;
    const needed = Math.ceil((4 + countBits + byteLength * 8) / 8);
    if (needed <= capacity) return v;
  }
  throw new Error(`qr: ${byteLength} bytes is more than version ${MAX_VERSION} holds`);
}

/** Mode indicator, length, payload, terminator and pad bytes. */
function dataCodewords(bytes, version) {
  const [capacity] = LEVEL_M[version];
  const countBits = version < 10 ? 8 : 16;
  const bits = [];
  const push = (value, width) => {
    for (let i = width - 1; i >= 0; i--) bits.push((value >> i) & 1);
  };

  push(0b0100, 4);                               // byte mode
  push(bytes.length, countBits);
  for (const b of bytes) push(b, 8);

  const room = capacity * 8;
  push(0, Math.min(4, room - bits.length));      // terminator
  while (bits.length % 8) bits.push(0);

  const words = [];
  for (let i = 0; i < bits.length; i += 8) {
    words.push(bits.slice(i, i + 8).reduce((n, bit) => (n << 1) | bit, 0));
  }
  // the spec's pad bytes, alternating, until the version is full
  for (let i = 0; words.length < capacity; i++) words.push(i % 2 ? 0x11 : 0xec);
  return words;
}

/** Split into blocks, add parity to each, then interleave as the spec wants. */
function interleave(words, version) {
  const [, ecCount, groups] = LEVEL_M[version];
  const blocks = [];
  let at = 0;
  for (const [count, size] of groups) {
    for (let i = 0; i < count; i++) {
      const data = words.slice(at, at + size);
      at += size;
      blocks.push({ data, ec: ecBytes(data, ecCount) });
    }
  }

  const out = [];
  const widest = Math.max(...blocks.map((b) => b.data.length));
  for (let i = 0; i < widest; i++) {
    for (const b of blocks) if (i < b.data.length) out.push(b.data[i]);
  }
  for (let i = 0; i < ecCount; i++) {
    for (const b of blocks) out.push(b.ec[i]);
  }
  return out;
}

/* ------------------------------------------------------------- the grid -- */

const FREE = -1;                                  // no module placed here yet

function blankGrid(version) {
  const size = version * 4 + 17;
  const grid = Array.from({ length: size }, () => new Array(size).fill(FREE));
  const set = (r, c, v) => { if (r >= 0 && r < size && c >= 0 && c < size) grid[r][c] = v; };

  // three finder patterns, each with its separator
  for (const [r0, c0] of [[0, 0], [0, size - 7], [size - 7, 0]]) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const edge = r === -1 || r === 7 || c === -1 || c === 7;
        const ring = r === 0 || r === 6 || c === 0 || c === 6;
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        set(r0 + r, c0 + c, edge ? 0 : ring || core ? 1 : 0);
      }
    }
  }

  // alignment patterns, skipping the three corners the finders already own
  const centres = ALIGN[version];
  for (const r0 of centres) {
    for (const c0 of centres) {
      const corner = (r0 === 6 && c0 === 6)
        || (r0 === 6 && c0 === size - 7) || (r0 === size - 7 && c0 === 6);
      if (corner) continue;
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          set(r0 + r, c0 + c, Math.max(Math.abs(r), Math.abs(c)) !== 1 ? 1 : 0);
        }
      }
    }
  }

  // timing patterns
  for (let i = 8; i < size - 8; i++) {
    const on = i % 2 === 0 ? 1 : 0;
    if (grid[6][i] === FREE) grid[6][i] = on;
    if (grid[i][6] === FREE) grid[i][6] = on;
  }

  // the module that is always dark, and the reserved format areas around it
  grid[size - 8][8] = 1;
  for (let i = 0; i < 9; i++) {
    if (grid[8][i] === FREE) grid[8][i] = 0;
    if (grid[i][8] === FREE) grid[i][8] = 0;
  }
  for (let i = 0; i < 8; i++) {
    if (grid[8][size - 1 - i] === FREE) grid[8][size - 1 - i] = 0;
    if (grid[size - 1 - i][8] === FREE) grid[size - 1 - i][8] = 0;
  }
  if (version >= 7) {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        grid[size - 11 + j][i] = 0;
        grid[i][size - 11 + j] = 0;
      }
    }
  }
  return grid;
}

/** Which modules carry data: everything the function patterns did not claim. */
export function reserved(version) {
  const grid = blankGrid(version);
  return grid.map((row) => row.map((v) => v !== FREE));
}

const MASKS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

/** Walk the zig-zag from the bottom right, laying the bitstream into the grid. */
function placeData(grid, fixed, bits, mask) {
  const size = grid.length;
  let at = 0;
  let upward = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--;                    // the vertical timing column
    for (let step = 0; step < size; step++) {
      const row = upward ? size - 1 - step : step;
      for (const col of [right, right - 1]) {
        if (fixed[row][col]) continue;
        const bit = at < bits.length ? bits[at++] : 0;
        grid[row][col] = mask(row, col) ? bit ^ 1 : bit;
      }
    }
    upward = !upward;
  }
}

function placeFormat(grid, maskIndex) {
  const size = grid.length;
  const bits = formatBits(maskIndex);
  const at = (i) => (bits >> i) & 1;
  for (let i = 0; i <= 5; i++) grid[8][i] = at(i);
  grid[8][7] = at(6);
  grid[8][8] = at(7);
  grid[7][8] = at(8);
  for (let i = 9; i <= 14; i++) grid[14 - i][8] = at(i);

  // the second copy stops at bit 6 going up the side; the module above it is
  // the one that is always dark, and writing a format bit over it is fatal
  for (let i = 0; i <= 6; i++) grid[size - 1 - i][8] = at(i);
  for (let i = 7; i <= 14; i++) grid[8][size - 15 + i] = at(i);
}

function placeVersion(grid, version) {
  if (version < 7) return;
  const size = grid.length;
  const bits = versionBits(version);
  for (let i = 0; i < 18; i++) {
    const bit = (bits >> i) & 1;
    const r = Math.floor(i / 3);
    const c = i % 3;
    grid[size - 11 + c][r] = bit;
    grid[r][size - 11 + c] = bit;
  }
}

/* -------------------------------------------------------------- penalty -- */

function penalty(grid) {
  const size = grid.length;
  let score = 0;

  // rule 1: runs of five or more of the same colour
  for (const line of [...grid, ...grid.map((_, c) => grid.map((row) => row[c]))]) {
    let run = 1;
    for (let i = 1; i < size; i++) {
      if (line[i] === line[i - 1]) {
        run++;
        if (run === 5) score += 3;
        else if (run > 5) score += 1;
      } else run = 1;
    }
  }

  // rule 2: any 2x2 block of one colour
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = grid[r][c];
      if (v === grid[r][c + 1] && v === grid[r + 1][c] && v === grid[r + 1][c + 1]) score += 3;
    }
  }

  // rule 3: the finder-like 1:1:3:1:1 sequence with four light modules beside it
  const A = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
  const B = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
  const matches = (line, at, pattern) => pattern.every((v, i) => line[at + i] === v);
  for (const line of [...grid, ...grid.map((_, c) => grid.map((row) => row[c]))]) {
    for (let i = 0; i + 11 <= size; i++) {
      if (matches(line, i, A)) score += 40;
      if (matches(line, i, B)) score += 40;
    }
  }

  // rule 4: how far the whole thing is from half dark
  const dark = grid.flat().filter((v) => v === 1).length;
  const percent = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;
  return score;
}

/* ---------------------------------------------------------------- public -- */

/**
 * Encode `text` as a QR matrix. Returns an array of rows of 0/1, with no quiet
 * zone — the renderer adds that, because it needs to know the module size.
 */
export function encode(text) {
  const bytes = utf8(text);
  const version = pickVersion(bytes.length);
  const words = interleave(dataCodewords(bytes, version), version);

  const bits = [];
  for (const w of words) for (let i = 7; i >= 0; i--) bits.push((w >> i) & 1);
  for (let i = 0; i < REMAINDER[version]; i++) bits.push(0);

  const fixed = reserved(version);
  let best = null;
  for (let m = 0; m < 8; m++) {
    const grid = blankGrid(version).map((row) => row.map((v) => (v === FREE ? 0 : v)));
    placeData(grid, fixed, bits, MASKS[m]);
    placeVersion(grid, version);
    placeFormat(grid, m);
    const score = penalty(grid);
    if (!best || score < best.score) best = { grid, score, mask: m, version };
  }
  return best.grid;
}

/**
 * The matrix as an SVG string: one path for every dark module, which keeps the
 * markup small enough to drop straight into innerHTML.
 */
export function svg(text, { size = 200, quiet = 4, dark = '#221a10', light = '#f2e8d5' } = {}) {
  const grid = encode(text);
  const modules = grid.length + quiet * 2;
  let path = '';
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid.length; c++) {
      if (grid[r][c]) path += `M${c + quiet} ${r + quiet}h1v1h-1z`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" `
    + `viewBox="0 0 ${modules} ${modules}" shape-rendering="crispEdges" role="img" `
    + `aria-label="Scan to join this table">`
    + `<rect width="${modules}" height="${modules}" fill="${light}"/>`
    + `<path d="${path}" fill="${dark}"/></svg>`;
}
