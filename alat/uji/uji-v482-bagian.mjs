// Uji v0.48.2: PDF/gambar dibuka di penampil DI DALAM aplikasi (bukan jendela baru), dengan Kembali ke aplikasi / ✕ / Esc / tombol mundur.
import fs from "node:fs";
export function jalankan({ cek }) {
  console.log("63. Penampil berkas di dalam aplikasi");
  const app = fs.readFileSync("web/aplikasi.js", "utf8"), css = fs.readFileSync("web/gaya.css", "utf8");
  cek("tidak ada lagi jendela kosong window.open(\"\", \"_blank\"); semua lihat berkas memakai penampil()", !/window\.open\(""/.test(app) && (app.match(/= penampil\(\)/g) || []).length >= 11);
  cek("berkas Drive (PDF/gambar) ditampilkan dengan nama dan jenisnya; berkas lain tetap diunduh", (app.match(/w\.tampil\(/g) || []).length >= 11 && !/w\.location\.href = URL\.createObjectURL/.test(app));
  cek("penampil: tombol Kembali ke aplikasi, ✕, Esc, tombol mundur; Unduh dan Buka di jendela baru", /Kembali ke aplikasi/.test(app) && /e\.key === "Escape" && PEN/.test(app) && /if \(PEN\) \{ tutupPenampil\(true\)/.test(app)
    && /download="\$\{esc\(n\)\}">Unduh/.test(app) && /Buka di jendela baru/.test(app) && /\.penampil\{position:fixed/.test(css));
  cek("contoh PDF dibuka di penampil (bukan tab baru)", /data-act="lihatContoh"/.test(app) && !/href="contoh\/\$\{j\}\.pdf/.test(app));
}
