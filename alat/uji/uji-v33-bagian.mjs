// Uji v0.33.0: saran butir Matriks dan jenis kegiatan (docs/uji/saran.js, tanpa AI) dan pemasangannya di tampilan.
import fs from "node:fs";
import vm from "node:vm";
export function jalankan({ g, cek }) {
  console.log("44. Saran butir Matriks dan jenis kegiatan");
  const ctx = {}; vm.runInNewContext(fs.readFileSync("web/saran.js", "utf8"), ctx);
  const M = ctx.UPW_SARAN, U = JSON.parse(fs.readFileSync("saran-uji.json", "utf8"));
  const kena = (daftar) => daftar.filter(c => c.n.some(n => M.butir(c.q, 5).slice(0, 3).map(x => x.n).includes(n))).length;
  const k1 = kena(U.butir), k2 = kena(U.butirLain);
  console.log(`   ketepatan: ${k1}/${U.butir.length} dan ${k2}/${U.butirLain.length} (kalimat gaya lain) benar di 3 teratas`);
  cek("ketepatan saran butir ≥ 90% di 3 teratas (dua set kalimat uji)", k1 / U.butir.length >= 0.9 && k2 / U.butirLain.length >= 0.9);
  const kj = U.jenis.filter(c => c.k.some(k => M.jenis(c.q, null, 3).map(x => x.k).includes(k))).length;
  cek("ketepatan saran jenis kegiatan ≥ 90% di 3 teratas", kj / U.jenis.length >= 0.9);
  cek("contoh pemilik: \"rapat evaluasi perkuliahan\" menyarankan butir monev pembelajaran (23)", M.butir("rapat evaluasi perkuliahan", 5).slice(0, 3).some(x => x.n === 23));
  cek("kalimat kosong/umum/asal tidak menghasilkan saran", ["", "  ", "rapat", "makan siang bersama", "asdfgh qwerty", "stu"].every(t => M.butir(t, 5).length === 0));
  const h = M.butir("RPS belum memuat rubrik penilaian", 5);
  cek("setiap saran punya nomor 1–84, nama butir sesuai Matriks, dan alasan", h.length > 0 && h.every(x => x.n >= 1 && x.n <= 84 && g.ctx.MATRIKS.find(m => m.n === x.n).nm === x.nm && x.alasan.length > 0));
  const kode = g.ctx.JENIS_KEG.map(j => j.k);
  cek("saran jenis hanya dari daftar jenis yang boleh", M.jenis("lomba debat bahasa inggris", ["seminar"], 3).every(x => x.k === "seminar") && M.jenis("seminar nasional pariwisata", kode, 3).every(x => kode.includes(x.k)));
  cek("butir terkait jenis kegiatan sama dengan peta server (petaJenisButir)", (() => { const P = g.ctx.petaJenisButir(); return Object.keys(P).every(k => [...new Set(P[k].map(x => x.n))].join() === M.butirJenis(k).join()); })());
  const app = fs.readFileSync("web/aplikasi.js", "utf8"), sw = fs.readFileSync("web/sw.js", "utf8");
  cek("saran terpasang di 6 tempat: agenda, tindak lanjut, keputusan risalah, Bank Dokumen, judul kegiatan, Cari butir",
    ['data-saran="agenda:', 'data-saran="tl"', 'data-saran="kep:', 'data-saran="bank"', 'data-saran="kegjenis"', 'data-saran="cari"'].every(x => app.includes(x)) && /data-baris-butir/.test(app));
  cek("saran.js ada di cache aplikasi (bisa dipakai luring)", /"saran\.js"/.test(sw));
}
