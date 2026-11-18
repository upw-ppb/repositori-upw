// Membuat docs/uji/saran.js (window.UPW_SARAN): mesin saran butir Matriks dan jenis kegiatan, tanpa AI (v0.33.0).
// Sumber: docs/uji/instrumen.js (teks 84 butir; jalankan node alat/instrumen.mjs lebih dulu bila Matriks berubah), alat/instrumen/kamus-butir.json
// (istilah sehari-hari prodi dan sinonim), gas/Jenis.js + gas/Matriks.js + gas/SumberData.js (jenis kegiatan dan peta jenis → butir).
// Jalankan: node alat/saran.mjs [--uji]   (--uji: ukur ketepatan dengan alat/uji/saran-uji.json). Jangan ubah docs/uji/saran.js langsung.
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
const akar = fileURLToPath(new URL("..", import.meta.url));
const baca = p => fs.readFileSync(akar + p, "utf8");
const w = {}; vm.runInNewContext(baca("docs/uji/instrumen.js"), { window: w });
const I = w.UPW_INSTRUMEN, K = JSON.parse(baca("alat/instrumen/kamus-butir.json"));
const g = {}; vm.createContext(g);
vm.runInContext(["gas/Jenis.js", "gas/Matriks.js", "gas/SumberData.js"].map(baca).join("\n") + "\n;this.JENIS_KEG=JENIS_KEG;this.PETA=petaJenisButir();", g);

const butir = Object.values(I.butir).map(b => ({
  n: b.n, nm: b.nm, el: b.el, kamus: K[b.n] || [],
  ind: b.b.map(x => x.i).filter(Boolean), skor: b.b.flatMap(x => x.s.filter(([k]) => k.startsWith("4") || k.startsWith("3")).map(([, v]) => v)),
  ket: b.b.flatMap(x => x.k), s4: b.s4, sr: b.sr }));
const jenis = g.JENIS_KEG.map(j => ({ k: j.k, l: j.l, kw: j.kw || "", cth: j.cth || [], ex: j.ex || "", kamus: [] }));
const peta = {}; Object.keys(g.PETA).forEach(k => { peta[k] = [...new Set(g.PETA[k].map(x => x.n))]; });
for (const n of Object.keys(K)) if (!/^_/.test(n) && !I.butir[n]) throw new Error("Kamus: butir tidak dikenal " + n);
const DATA = { sinonim: K._sinonim, butir, jenis, peta };
const js = "/* DIBUAT OTOMATIS oleh alat/saran.mjs — jangan diubah langsung. Mesin saran butir Matriks dan jenis kegiatan (tanpa AI). */\nvar DATA_SARAN = "
  + JSON.stringify(DATA) + ";\n" + baca("alat/saran-mesin.js");
fs.writeFileSync(akar + "docs/uji/saran.js", js);
console.log(`saran.js: ${butir.length} butir, ${jenis.length} jenis kegiatan, ${K._sinonim.length} kelompok sinonim, ${(js.length / 1024).toFixed(0)} KB`);

if (process.argv.includes("--uji")) {
  const ctx = {}; vm.runInNewContext(js, ctx);
  const M = ctx.UPW_SARAN, U = JSON.parse(baca("alat/uji/saran-uji.json"));
  let kena3 = 0, kena1 = 0; const gagal = [];
  U.butir.forEach(c => { const h = M.butir(c.q, 5).map(x => x.n); const t3 = h.slice(0, 3);
    if (c.n.some(n => t3.includes(n))) kena3++; else gagal.push(`  ✗ "${c.q}" → [${h.join(", ")}], harapan ${c.n.join("/")}`);
    if (c.n.includes(h[0])) kena1++; });
  let kj = 0; const gj = [];
  U.jenis.forEach(c => { const h = M.jenis(c.q, null, 3).map(x => x.k); if (c.k.some(k => h.includes(k))) kj++; else gj.push(`  ✗ jenis "${c.q}" → [${h.join(", ")}], harapan ${c.k.join("/")}`); });
  console.log(`Butir: ${kena3}/${U.butir.length} benar di 3 teratas (${Math.round(kena3 / U.butir.length * 100)}%), ${kena1} benar di urutan pertama (${Math.round(kena1 / U.butir.length * 100)}%).`);
  let kl = 0; const gl = [];
  (U.butirLain || []).forEach(c => { const h = M.butir(c.q, 5).map(x => x.n); if (c.n.some(n => h.slice(0, 3).includes(n))) kl++; else gl.push(`  ✗ (lain) "${c.q}" → [${h.join(", ")}], harapan ${c.n.join("/")}`); });
  if (U.butirLain) console.log(`Butir, kalimat gaya lain (tanpa frasa kamus): ${kl}/${U.butirLain.length} benar di 3 teratas (${Math.round(kl / U.butirLain.length * 100)}%).`);
  gagal.push(...gl);
  console.log(`Jenis kegiatan: ${kj}/${U.jenis.length} benar di 3 teratas (${Math.round(kj / U.jenis.length * 100)}%).`);
  gagal.concat(gj).forEach(x => console.log(x));
}
