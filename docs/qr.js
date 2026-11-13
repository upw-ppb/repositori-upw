/* Pembuat kode QR kecil untuk surat (mode byte, koreksi galat M, versi 1–10, hingga ±210 karakter).
   Ditulis sendiri untuk Repositori UPW mengikuti standar ISO/IEC 18004; tanpa pustaka luar.
   Pemakaian: UPW_QR.svg("https://...", ukuranPx) → teks <svg>. */
(function () {
"use strict";
// Per versi (1–10), tingkat M: [kode koreksi per blok, jumlah blok grup 1, data per blok grup 1, blok grup 2, data per blok grup 2]
const BLOK = [null, [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0], [24, 2, 43, 0, 0],
  [16, 4, 27, 0, 0], [18, 4, 31, 0, 0], [22, 2, 38, 2, 39], [22, 3, 36, 2, 37], [26, 4, 43, 1, 44]];
const ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
const SISA_BIT = [0, 0, 7, 7, 7, 7, 7, 0, 0, 0, 0];

function kali(x, y) { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; } return z & 255; }
function pembagi(n) {
  const r = new Array(n).fill(0); r[n - 1] = 1; let akar = 1;
  for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) { r[j] = kali(r[j], akar); if (j + 1 < n) r[j] ^= r[j + 1]; } akar = kali(akar, 2); }
  return r;
}
function sisaRS(data, div) {
  const r = new Array(div.length).fill(0);
  data.forEach(b => { const f = b ^ r.shift(); r.push(0); div.forEach((d, i) => { r[i] ^= kali(d, f); }); });
  return r;
}
const kapasitas = v => { const b = BLOK[v]; return b[1] * b[2] + b[3] * b[4]; };

function buat(teks) {
  const bytes = Array.from(new TextEncoder().encode(teks));
  let v = 1;
  while (v <= 10 && 4 + (v < 10 ? 8 : 16) + bytes.length * 8 > kapasitas(v) * 8) v++;
  if (v > 10) throw new Error("Teks terlalu panjang untuk kode QR.");
  // aliran bit data
  const bit = [], tulis = (n, len) => { for (let i = len - 1; i >= 0; i--) bit.push((n >>> i) & 1); };
  tulis(4, 4); tulis(bytes.length, v < 10 ? 8 : 16); bytes.forEach(b => tulis(b, 8));
  const cap = kapasitas(v) * 8;
  tulis(0, Math.min(4, cap - bit.length)); while (bit.length % 8) bit.push(0);
  for (let p = 0xec; bit.length < cap; p ^= 0xec ^ 0x11) tulis(p, 8);
  const data = []; for (let i = 0; i < bit.length; i += 8) data.push(parseInt(bit.slice(i, i + 8).join(""), 2));
  // blok + koreksi galat, lalu disisipkan
  const [ec, n1, d1, n2, d2] = BLOK[v], div = pembagi(ec), blok = [];
  let pos = 0;
  for (let i = 0; i < n1 + n2; i++) { const len = i < n1 ? d1 : d2, d = data.slice(pos, pos + len); pos += len; blok.push({ d, e: sisaRS(d, div) }); }
  const kata = [];
  for (let i = 0; i < Math.max(d1, d2); i++) blok.forEach(b => { if (i < b.d.length) kata.push(b.d[i]); });
  for (let i = 0; i < ec; i++) blok.forEach(b => kata.push(b.e[i]));

  const n = v * 4 + 17, m = [], fungsi = [];
  for (let y = 0; y < n; y++) { m.push(new Array(n).fill(false)); fungsi.push(new Array(n).fill(false)); }
  const set = (x, y, gelap) => { m[y][x] = gelap; fungsi[y][x] = true; };
  for (let i = 0; i < n; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  [[3, 3], [n - 4, 3], [3, n - 4]].forEach(([cx, cy]) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy, j = Math.max(Math.abs(dx), Math.abs(dy));
      if (x >= 0 && x < n && y >= 0 && y < n) set(x, y, j !== 2 && j !== 4);
    }
  });
  const al = ALIGN[v], ak = al.length - 1;
  al.forEach((ay, i) => al.forEach((ax, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === ak) || (i === ak && j === 0)) return;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }));
  const format = mask => {
    const d = (0 << 3) | mask; let r = d; // tingkat M = 00
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const b = ((d << 10) | r) ^ 0x5412, g = i => ((b >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) set(8, i, g(i));
    set(8, 7, g(6)); set(8, 8, g(7)); set(7, 8, g(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, g(i));
    for (let i = 0; i < 8; i++) set(n - 1 - i, 8, g(i));
    for (let i = 8; i < 15; i++) set(8, n - 15 + i, g(i));
    set(8, n - 8, true);
  };
  format(0);
  if (v >= 7) {
    let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
    const b = (v << 12) | r;
    for (let i = 0; i < 18; i++) { const g = ((b >>> i) & 1) === 1, a = n - 11 + (i % 3), c = Math.floor(i / 3); set(a, c, g); set(c, a, g); }
  }
  // tempatkan data (zig-zag dari kanan bawah)
  const semua = kata.concat(new Array(0)), totalBit = semua.length * 8 + SISA_BIT[v];
  let i = 0;
  for (let kanan = n - 1; kanan >= 1; kanan -= 2) {
    if (kanan === 6) kanan = 5;
    for (let vert = 0; vert < n; vert++) for (let j = 0; j < 2; j++) {
      const x = kanan - j, naik = ((kanan + 1) & 2) === 0, y = naik ? n - 1 - vert : vert;
      if (!fungsi[y][x] && i < totalBit) { m[y][x] = i < semua.length * 8 ? ((semua[i >>> 3] >>> (7 - (i & 7))) & 1) === 1 : false; i++; }
    }
  }
  // pilih pola mask dengan penalti terkecil
  const RUMUS = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, x => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
    (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0, (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0];
  const balik = k => { for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!fungsi[y][x] && RUMUS[k](x, y)) m[y][x] = !m[y][x]; };
  let terbaik = 0, skorMin = Infinity;
  for (let k = 0; k < 8; k++) { balik(k); format(k); const s = penalti(m, n); if (s < skorMin) { skorMin = s; terbaik = k; } balik(k); }
  balik(terbaik); format(terbaik);
  return m;
}
function penalti(m, n) {
  let s = 0, gelap = 0;
  const baris = (get) => {
    for (let a = 0; a < n; a++) {
      let run = 1, pola = "";
      for (let b = 0; b < n; b++) {
        const c = get(a, b); pola += c ? "1" : "0";
        if (b > 0) { if (c === get(a, b - 1)) { run++; if (run === 5) s += 3; else if (run > 5) s++; } else run = 1; }
      }
      const p = "0000" + pola + "0000";
      for (let k = p.indexOf("1011101"); k >= 0; k = p.indexOf("1011101", k + 1))
        if (p.slice(k - 4, k) === "0000" || p.slice(k + 7, k + 11) === "0000") s += 40;
    }
  };
  baris((a, b) => m[a][b]); baris((a, b) => m[b][a]);
  for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) { const c = m[y][x]; if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) s += 3; }
  m.forEach(r => r.forEach(c => { if (c) gelap++; }));
  s += Math.floor(Math.abs(gelap * 20 - n * n * 10) / (n * n)) * 10;
  return s;
}
function svg(teks, px) {
  const m = buat(teks), n = m.length, t = 4, w = n + 2 * t; let d = "";
  m.forEach((r, y) => r.forEach((c, x) => { if (c) d += `M${x + t} ${y + t}h1v1h-1z`; }));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${w}" width="${px || w * 3}" height="${px || w * 3}" shape-rendering="crispEdges" role="img" aria-label="Kode QR"><rect width="${w}" height="${w}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}
window.UPW_QR = { buat, svg };
})();
