// Uji v0.30.0: data tombol (i) "Menurut instrumen" (docs/uji/instrumen.js) dan rujukan yang dipakai tampilan.
import fs from "node:fs";
import vm from "node:vm";
export function jalankan({ g, cek }) {
  console.log("40. Teks instrumen untuk tombol (i)");
  const w = {}; vm.runInNewContext(fs.readFileSync("web/instrumen.js", "utf8"), { window: w });
  const I = w.UPW_INSTRUMEN, M = g.ctx.MATRIKS;
  cek("84 butir; nama, bobot, butir DED sama dengan Matriks.js", I && Object.keys(I.butir).length === 84 && M.every(m => I.butir[m.n].nm === m.nm && I.butir[m.n].w === m.w && I.butir[m.n].ded === m.ded));
  const lengkap = b => b.b.filter(x => x.s.length).every(x => { const s = new Set(); x.s.forEach(([k]) => { const [h, l = h] = k.split("-").map(Number); for (let i = l; i <= h; i++) s.add(i); }); return s.size === 5; });
  cek("setiap butir punya elemen, indikator, dan kriteria skor 0–4 lengkap", Object.values(I.butir).every(b => b.el && b.b.length && b.b.some(x => x.i) && b.b.some(x => x.s.length) && lengkap(b)));
  cek("butir 16: definisi dosen industri/praktisi (5 tahun, memimpin tim, team teaching)", /minimal 5 tahun/.test(I.butir[16].b[0].i) && /memimpin sebuah tim/.test(I.butir[16].b[0].i) && /team teaching/.test(I.butir[16].b[0].i));
  cek("butir 27 = bagian C butir 9 (rasio mahasiswa/DTPS); 28 = baris tabel 27 (pembimbing TA)", I.butir[27].t === 9 && I.butir[27].b.length === 1 && /RMDTPS/.test(I.butir[27].b[0].i) && I.butir[28].t === 27 && /pembimbing/i.test(I.butir[28].el));
  cek("butir 84 = Program Keberlanjutan (baris tabel 83)", I.butir[84].t === 83 && /Keberlanjutan/.test(I.butir[84].el));
  cek("Tabel 2: keterangan DED NIDK, perusahaan, sertifikat + penerbit, MK TS-2 s.d. TS", I.tabel["2"].k.length === 5 && /lembaga penerbit/.test(I.tabel["2"].k[3]) && /TS-2 s\.d\. TS/.test(I.tabel["2"].k[4]) && I.tabel["2"].butir.includes(16));
  cek("64 butir DED dengan petunjuk; definisi jenis dosen 5 istilah", Object.keys(I.ded).length === 64 && Object.values(I.ded).every(d => d.p) && I.definisi.dosen.length === 5);
  const app = fs.readFileSync("web/aplikasi.js", "utf8"), refs = new Set();
  for (const m of app.matchAll(/iTombol\("([^"]+)"/g)) m[1].split(",").forEach(r => refs.add(r));
  const dp = /const REF_DP = \{([\s\S]*?)\};/.exec(app)[1];
  for (const m of dp.matchAll(/"([^"]+)"/g)) m[1].split(",").forEach(r => refs.add(r));
  for (const m of app.matchAll(/\["(t\d+|b\d+)", "(t\d+)", "(t\d+)", "(b\d+)", "(b\d+)", "(b\d+)"\]/g)) m.slice(1).forEach(r => refs.add(r));
  const ada = r => r === "def:dosen" || (r[0] === "b" && I.butir[r.slice(1)]) || (r[0] === "t" && I.tabel[r.slice(1)]) || (r[0] === "d" && I.ded[r.slice(1)]);
  ["b", "t", "d"].forEach(x => refs.delete(x)); // awalan rujukan dinamis, mis. iTombol("b" + r.n)
  const salah = [...refs].filter(r => !ada(r));
  cek("semua rujukan (i) di tampilan ada datanya (" + refs.size + " rujukan)", refs.size > 30 && !salah.length, salah);
  cek("sw.js menyimpan instrumen.js untuk luring", /"instrumen\.js"/.test(fs.readFileSync("web/sw.js", "utf8")));
}
