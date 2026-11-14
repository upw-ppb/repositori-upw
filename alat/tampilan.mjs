// Alat rilis tampilan (tanpa build step pada aplikasi; alat ini hanya menyalin dan menyesuaikan berkas).
//
//   node alat/tampilan.mjs riwayat
//       Menulis docs/uji/riwayat.json dari CHANGELOG.md (dijalankan setiap rilis; dibaca halaman Riwayat Versi).
//
//   node alat/tampilan.mjs produksi <URL server Produksi /exec> <folder tujuan>
//       Menyusun tampilan Produksi dari docs/uji: konfig Produksi, tanpa pita UJI COBA, nama cache dan aplikasi Produksi.
//       Folder tujuan untuk rilis sungguhan = docs (HANYA setelah pemilik menulis "setuju tayang"); untuk percobaan, folder lain.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const UJI = path.join(AKAR, "docs", "uji");
const [, , perintah, ...arg] = process.argv;

function riwayat() {
  const teks = fs.readFileSync(path.join(AKAR, "CHANGELOG.md"), "utf8");
  const bagian = [];
  let kini = null;
  for (const baris of teks.split("\n")) {
    const m = /^## (v\d+\.\d+\.\d+) — (.+?) — (.+)$/.exec(baris);
    if (m) { kini = { versi: m[1], tanggal: m[2], lingkungan: m[3], isi: [] }; bagian.push(kini); continue; }
    if (!kini || !baris.trim()) continue;
    // Baris lanjutan (tidak diawali "- ") disambung ke butir sebelumnya.
    if (!/^\s*- /.test(baris) && kini.isi.length) kini.isi[kini.isi.length - 1] += " " + baris.trim();
    else kini.isi.push(baris.replace(/\s+$/, ""));
  }
  if (!bagian.length) throw new Error("CHANGELOG.md tidak berisi bagian '## vX.Y.Z — tanggal — lingkungan'.");
  return bagian;
}
function tulisRiwayat(folder) {
  const r = riwayat();
  fs.writeFileSync(path.join(folder, "riwayat.json"), JSON.stringify(r));
  return r.length;
}

if (perintah === "riwayat") {
  console.log("riwayat.json:", tulisRiwayat(UJI), "versi");
} else if (perintah === "produksi") {
  const [api, tujuanArg] = arg;
  if (!/^https:\/\/script\.google\.com\/(a\/macros\/[^/]+\/)?macros\/s\/[\w-]+\/exec$/.test(api || "") && api !== "/api") throw new Error("URL server Produksi tidak valid (…/macros/s/<id>/exec).");
  if (!tujuanArg) throw new Error("Sebutkan folder tujuan.");
  const tujuan = path.resolve(tujuanArg);
  if (tujuan === UJI || tujuan.startsWith(UJI + path.sep)) throw new Error("Tujuan tidak boleh folder Uji Coba.");
  const konfigUji = fs.readFileSync(path.join(UJI, "konfig.js"), "utf8");
  const versi = /versi: "([^"]+)"/.exec(konfigUji)[1];
  fs.mkdirSync(tujuan, { recursive: true });
  for (const f of fs.readdirSync(UJI)) {
    const asal = path.join(UJI, f);
    if (fs.statSync(asal).isFile()) fs.copyFileSync(asal, path.join(tujuan, f));
    else if (fs.statSync(asal).isDirectory()) fs.cpSync(asal, path.join(tujuan, f), { recursive: true }); // mis. panduan/ (gambar panduan)
  }
  const ganti = (f, fn) => { const p = path.join(tujuan, f), a = fs.readFileSync(p, "utf8"), b = fn(a); if (a === b) throw new Error("Tidak ada perubahan pada " + f + " (pola berubah?)"); fs.writeFileSync(p, b); };
  fs.writeFileSync(path.join(tujuan, "konfig.js"), `/* Konfigurasi lingkungan Produksi. Dibuat oleh alat/tampilan.mjs dari docs/uji. */
window.UPW_KONFIG = {
  lingkungan: "produksi",
  versi: "${versi}",
  api: "${api}",
  kunciPenyimpanan: "upw"
};
`);
  ganti("index.html", s => s.replace(/<title>Repositori UPW \(Uji Coba\)<\/title>/, "<title>Repositori UPW</title>").replace(/<div class="uji" role="note">[\s\S]*?<\/div>\n?/, ""));
  ganti("manifest.webmanifest", s => s.replace('"Repositori UPW (Uji Coba)"', '"Repositori UPW"').replace('"UPW Uji"', '"Repositori UPW"'));
  ganti("sw.js", s => s.replace(/const CACHE = "upw-uji-/, 'const CACHE = "upw-produksi-'));
  const n = tulisRiwayat(tujuan);
  console.log(`Tampilan Produksi v${versi} disusun di ${tujuan} (${n} versi di riwayat).`);
} else {
  console.log("Pakai: node alat/tampilan.mjs riwayat | produksi <URL /exec> <folder tujuan>");
  process.exit(1);
}
