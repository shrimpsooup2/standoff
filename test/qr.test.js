import test from 'node:test';
import assert from 'node:assert/strict';
import { encode, svg, ecBytes, reserved, formatBits, versionBits } from '../public/qr.js';

/* The parity check is the one worth pinning to the spec rather than to
   ourselves: it is the part that silently produces an unscannable code. These
   are the codewords ISO/IEC 18004 gives for "01234567" at version 1, level M. */
test('Reed-Solomon matches the codewords in the spec', () => {
  const data = [0x10, 0x20, 0x0c, 0x56, 0x61, 0x80, 0xec, 0x11,
    0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11];
  assert.deepEqual(ecBytes(data, 10),
    [0xa5, 0x24, 0xd4, 0xc1, 0xed, 0x36, 0xc7, 0x87, 0x2c, 0x55]);
});

const hamming = (a, b) => {
  let n = 0;
  for (let x = a ^ b; x; x >>= 1) n += x & 1;
  return n;
};

// BCH(15,5) is specified to keep every pair of format strings 7 bits apart, and
// BCH(18,6) keeps every pair of version strings 8 apart. Getting the generator
// wrong breaks that long before it breaks anything visible.
test('the format bits are a real BCH code', () => {
  const all = [];
  for (let level = 0; level < 4; level++) {
    for (let mask = 0; mask < 8; mask++) all.push(formatBits(mask) ^ (level << 13));
  }
  const codes = Array.from({ length: 8 }, (_, m) => formatBits(m));
  assert.equal(new Set(codes).size, 8, 'two masks share a format string');
  for (let i = 0; i < codes.length; i++) {
    for (let j = i + 1; j < codes.length; j++) {
      assert.ok(hamming(codes[i], codes[j]) >= 7,
        `masks ${i} and ${j} are only ${hamming(codes[i], codes[j])} bits apart`);
    }
  }
  assert.ok(all.every((c) => c <= 0xffff));
});

test('the version bits are a real BCH code', () => {
  const codes = [];
  for (let v = 7; v <= 40; v++) codes.push(versionBits(v));
  assert.equal(new Set(codes).size, codes.length);
  for (let i = 0; i < codes.length; i++) {
    for (let j = i + 1; j < codes.length; j++) {
      assert.ok(hamming(codes[i], codes[j]) >= 8,
        `versions ${i + 7} and ${j + 7} are only ${hamming(codes[i], codes[j])} apart`);
    }
  }
});

/* -------------------------------------------------------------- decoding -- */

const LEVEL_M = {
  1: [16, 10, [[1, 16]]], 2: [28, 16, [[1, 28]]], 3: [44, 26, [[1, 44]]],
  4: [64, 18, [[2, 32]]], 5: [86, 24, [[2, 43]]], 6: [108, 16, [[4, 27]]],
  7: [124, 18, [[4, 31]]], 8: [154, 22, [[2, 38], [2, 39]]],
  9: [182, 22, [[3, 36], [2, 37]]], 10: [216, 26, [[4, 43], [1, 44]]],
};
const MASKS = [
  (r, c) => (r + c) % 2 === 0, (r) => r % 2 === 0, (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

/**
 * Read a matrix back the way a scanner would: format bits first, then the
 * zig-zag, unmasked and de-interleaved. It ignores the parity codewords — the
 * spec vector above is what proves those.
 */
function decode(grid) {
  const size = grid.length;
  const version = (size - 17) / 4;

  let format = 0;
  for (let i = 0; i <= 5; i++) format |= grid[8][i] << i;
  format |= grid[8][7] << 6;
  format |= grid[8][8] << 7;
  format |= grid[7][8] << 8;
  for (let i = 9; i <= 14; i++) format |= grid[14 - i][8] << i;
  // the second copy has to say the same thing, or half the scanners in the room
  // read a different mask than the other half
  let second = 0;
  for (let i = 0; i <= 6; i++) second |= grid[size - 1 - i][8] << i;
  for (let i = 7; i <= 14; i++) second |= grid[8][size - 15 + i] << i;
  assert.equal(second, format, 'the two format copies disagree');

  const unmasked = format ^ 0b101010000010010;
  const level = (unmasked >> 13) & 0b11;
  const mask = MASKS[(unmasked >> 10) & 0b111];
  assert.equal(level, 0b00, 'not level M');

  const fixed = reserved(version);
  const bits = [];
  let upward = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--;
    for (let step = 0; step < size; step++) {
      const row = upward ? size - 1 - step : step;
      for (const col of [right, right - 1]) {
        if (fixed[row][col]) continue;
        bits.push(mask(row, col) ? grid[row][col] ^ 1 : grid[row][col]);
      }
    }
    upward = !upward;
  }

  const words = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    words.push(bits.slice(i, i + 8).reduce((n, b) => (n << 1) | b, 0));
  }

  // undo the interleave: hand each block back its own codewords, in order
  const [, , groups] = LEVEL_M[version];
  const sizes = groups.flatMap(([count, len]) => Array(count).fill(len));
  const blocks = sizes.map(() => []);
  const widest = Math.max(...sizes);
  let at = 0;
  for (let i = 0; i < widest; i++) {
    for (let b = 0; b < blocks.length; b++) if (i < sizes[b]) blocks[b].push(words[at++]);
  }
  const data = blocks.flat();

  let cursor = 0;
  const read = (n) => {
    let v = 0;
    for (let i = 0; i < n; i++) {
      const byte = data[(cursor >> 3)] ?? 0;
      v = (v << 1) | ((byte >> (7 - (cursor & 7))) & 1);
      cursor++;
    }
    return v;
  };
  assert.equal(read(4), 0b0100, 'not byte mode');
  const length = read(version < 10 ? 8 : 16);
  const bytes = Array.from({ length }, () => read(8));
  return new TextDecoder().decode(Uint8Array.from(bytes));
}

test('a code reads back as the text that went into it', () => {
  const cases = [
    'A',
    'https://example.com/?r=ZA4B',
    'https://shrimpsooup2.github.io/standoff/?r=QQQQ',
    'https://someones-rather-long-username.github.io/standoff-the-game/?r=ZZZZ',
    'x'.repeat(100),
    'x'.repeat(216 - 3),                              // the largest version 10 holds
    'café — ümlaut — éèê',   // multi-byte utf-8
  ];
  for (const text of cases) {
    assert.equal(decode(encode(text)), text, `round trip failed for ${text.slice(0, 40)}`);
  }
});

test('it uses the smallest version that fits, and refuses what will not', () => {
  assert.equal(encode('A').length, 21);             // version 1
  assert.equal(encode('x'.repeat(216 - 3)).length, 57);  // version 10
  assert.throws(() => encode('x'.repeat(400)), /more than version 10/);
});

test('the function patterns are where a scanner looks for them', () => {
  for (const text of ['A', 'https://example.com/?r=ZA4B', 'x'.repeat(150)]) {
    const g = encode(text);
    const size = g.length;
    assert.equal(size % 4, 1);

    for (const [r0, c0] of [[0, 0], [0, size - 7], [size - 7, 0]]) {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const ring = r === 0 || r === 6 || c === 0 || c === 6;
          const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          assert.equal(g[r0 + r][c0 + c], ring || core ? 1 : 0,
            `finder at ${r0},${c0} is wrong at ${r},${c}`);
        }
      }
    }
    for (let i = 8; i < size - 8; i++) {
      assert.equal(g[6][i], i % 2 === 0 ? 1 : 0, 'horizontal timing broken');
      assert.equal(g[i][6], i % 2 === 0 ? 1 : 0, 'vertical timing broken');
    }
    assert.equal(g[size - 8][8], 1, 'the always-dark module is not dark');

    // alignment patterns: the encoder and the decoder agree about where these
    // live, so only an explicit check catches one drawn in the wrong place
    const centres = { 21: [], 25: [6, 18], 29: [6, 22], 33: [6, 26], 37: [6, 30],
      41: [6, 34], 45: [6, 22, 38], 49: [6, 24, 42], 53: [6, 26, 46], 57: [6, 28, 50] }[size];
    let seen = 0;
    for (const r0 of centres) {
      for (const c0 of centres) {
        const corner = (r0 === 6 && c0 === 6) || (r0 === 6 && c0 === size - 7)
          || (r0 === size - 7 && c0 === 6);
        if (corner) continue;
        seen++;
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            assert.equal(g[r0 + r][c0 + c], Math.max(Math.abs(r), Math.abs(c)) !== 1 ? 1 : 0,
              `alignment pattern at ${r0},${c0} is wrong at ${r},${c}`);
          }
        }
      }
    }
    const expected = centres.length ? centres.length ** 2 - 3 : 0;
    assert.equal(seen, expected, `expected ${expected} alignment patterns, drew ${seen}`);
  }
});

test('the svg carries a quiet zone and nothing that needs escaping', () => {
  const out = svg('https://example.com/?r=ZA4B', { size: 180, quiet: 4 });
  assert.match(out, /^<svg /);
  assert.match(out, /width="180" height="180"/);
  assert.match(out, /viewBox="0 0 37 37"/);         // 29 modules + 4 either side
  assert.ok(!out.includes('<script'));
  assert.ok(out.includes('aria-label='));
});
