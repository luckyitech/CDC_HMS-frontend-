// A small QR Code encoder (byte mode, error correction M, versions 1–15) —
// enough for a link on screen. Written for the HMS so no npm package is needed
// (8 Oct 2026: the skin-photo phone hand-off). Follows ISO/IEC 18004.
//
//   qrMatrix('https://…') → boolean[][] (true = dark), quiet zone NOT included.

const ECC_PER_BLOCK_M = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24];
const BLOCKS_M = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10];
const ECL_M_BITS = 0;   // format bits for level M
const MAX_VERSION = 15;

const rawModules = (ver) => {
  let r = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const na = Math.floor(ver / 7) + 2;
    r -= (25 * na - 10) * na - 55;
    if (ver >= 7) r -= 36;
  }
  return r;
};
const dataCodewords = (ver) => Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK_M[ver] * BLOCKS_M[ver];

// GF(256) with the QR polynomial 0x11D
const gfMul = (x, y) => {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
};
const rsDivisor = (degree) => {
  const result = new Array(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMul(root, 0x02);
  }
  return result;
};
const rsRemainder = (data, divisor) => {
  const result = new Array(divisor.length).fill(0);
  for (const b of data) {
    const factor = b ^ result.shift();
    result.push(0);
    for (let i = 0; i < divisor.length; i++) result[i] ^= gfMul(divisor[i], factor);
  }
  return result;
};

const utf8 = (text) => Array.from(new TextEncoder().encode(text));

const encodeData = (bytes) => {
  let ver = 1;
  for (; ver <= MAX_VERSION; ver++) {
    const countBits = ver <= 9 ? 8 : 16;
    if (4 + countBits + bytes.length * 8 <= dataCodewords(ver) * 8) break;
  }
  if (ver > MAX_VERSION) throw new Error('Text too long for this QR encoder');
  const bits = [];
  const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(0x4, 4);
  put(bytes.length, ver <= 9 ? 8 : 16);
  bytes.forEach((b) => put(b, 8));
  const cap = dataCodewords(ver) * 8;
  put(0, Math.min(4, cap - bits.length));
  put(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) put(pad, 8);
  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) codewords.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  return { ver, codewords };
};

const addEcc = (ver, data) => {
  const numBlocks = BLOCKS_M[ver];
  const eccLen = ECC_PER_BLOCK_M[ver];
  const raw = Math.floor(rawModules(ver) / 8);
  const numShort = numBlocks - (raw % numBlocks);
  const shortLen = Math.floor(raw / numBlocks);
  const div = rsDivisor(eccLen);
  const blocks = [];
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const dat = data.slice(k, k + shortLen - eccLen + (i < numShort ? 0 : 1));
    k += dat.length;
    const ecc = rsRemainder(dat, div);
    if (i < numShort) dat.push(0);
    blocks.push(dat.concat(ecc));
  }
  const out = [];
  for (let i = 0; i < blocks[0].length; i++) {
    blocks.forEach((b, j) => { if (i !== shortLen - eccLen || j >= numShort) out.push(b[i]); });
  }
  return out;
};

const alignmentPositions = (ver, size) => {
  if (ver === 1) return [];
  const n = Math.floor(ver / 7) + 2;
  const step = Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
  const out = [6];
  for (let pos = size - 7; out.length < n; pos -= step) out.splice(1, 0, pos);
  return out;
};

const MASKS = [
  (x, y) => (x + y) % 2 === 0,
  (x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

const build = (ver, codewords, mask) => {
  const size = ver * 4 + 17;
  const m = Array.from({ length: size }, () => new Array(size).fill(false));
  const fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (x, y, dark) => { m[y][x] = dark; fn[y][x] = true; };

  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  const finder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx; const y = cy + dy;
      if (x < 0 || y < 0 || x >= size || y >= size) continue;
      const d = Math.max(Math.abs(dx), Math.abs(dy));
      set(x, y, d !== 2 && d !== 4);
    }
  };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  const al = alignmentPositions(ver, size);
  al.forEach((ay, i) => al.forEach((ax, j) => {
    const last = al.length - 1;
    if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }));

  // format bits
  const data = (ECL_M_BITS << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const fbits = ((data << 10) | rem) ^ 0x5412;
  const fb = (i) => ((fbits >>> i) & 1) !== 0;
  for (let i = 0; i <= 5; i++) set(8, i, fb(i));
  set(8, 7, fb(6)); set(8, 8, fb(7)); set(7, 8, fb(8));
  for (let i = 9; i < 15; i++) set(14 - i, 8, fb(i));
  for (let i = 0; i < 8; i++) set(size - 1 - i, 8, fb(i));
  for (let i = 8; i < 15; i++) set(8, size - 15 + i, fb(i));
  set(8, size - 8, true);

  if (ver >= 7) {
    let r = ver;
    for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
    const vbits = (ver << 12) | r;
    for (let i = 0; i < 18; i++) {
      const dark = ((vbits >>> i) & 1) !== 0;
      const a = size - 11 + (i % 3); const b = Math.floor(i / 3);
      set(a, b, dark); set(b, a, dark);
    }
  }

  // data, zig-zag
  let bit = 0;
  const total = codewords.length * 8;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!fn[y][x] && bit < total) {
          m[y][x] = ((codewords[bit >>> 3] >>> (7 - (bit & 7))) & 1) !== 0;
          bit++;
        }
      }
    }
  }
  const mf = MASKS[mask];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && mf(x, y)) m[y][x] = !m[y][x];
  return m;
};

// Penalty (rules 1, 2 and 4 of the standard, plus the finder-like rule 3).
const penalty = (m) => {
  const size = m.length;
  let p = 0;
  const runs = (get) => {
    for (let a = 0; a < size; a++) {
      let run = 1;
      for (let b = 1; b <= size; b++) {
        if (b < size && get(a, b) === get(a, b - 1)) run++;
        else { if (run >= 5) p += 3 + (run - 5); run = 1; }
      }
    }
  };
  runs((a, b) => m[a][b]);
  runs((a, b) => m[b][a]);
  for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) {
    const c = m[y][x];
    if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3;
  }
  const pat = [true, false, true, true, true, false, true, false, false, false, false];
  const rev = [...pat].reverse();
  const match = (get, a, b, pt) => pt.every((v, k) => get(a, b + k) === v);
  for (let a = 0; a < size; a++) for (let b = 0; b + 11 <= size; b++) {
    const row = (i, j) => m[i][j]; const col = (i, j) => m[j][i];
    if (match(row, a, b, pat) || match(row, a, b, rev)) p += 40;
    if (match(col, a, b, pat) || match(col, a, b, rev)) p += 40;
  }
  let dark = 0;
  m.forEach((r) => r.forEach((v) => { if (v) dark++; }));
  const k = Math.ceil(Math.abs(dark * 20 - size * size * 10) / (size * size)) - 1;
  p += Math.max(0, k) * 10;
  return p;
};

export const qrMatrix = (text) => {
  const { ver, codewords } = encodeData(utf8(String(text)));
  const all = addEcc(ver, codewords);
  let best = null; let bestP = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const mtx = build(ver, all, mask);
    const p = penalty(mtx);
    if (p < bestP) { bestP = p; best = mtx; }
  }
  return best;
};
