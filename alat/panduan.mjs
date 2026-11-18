// Menyusun docs/uji/panduan.js dari alat/panduan-sumber.js (teks) + alat/panduan-tanda.json (penanda gambar).
// Pakai: node alat/panduan.mjs   (dijalankan setiap kali teks panduan atau gambar berubah)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { kategori, sinonim, topik } = await import(path.join(AKAR, "alat/panduan-sumber.js"));
const tanda = JSON.parse(fs.readFileSync(path.join(AKAR, "alat/panduan-tanda.json"), "utf8"));
const MENU = ["beranda", "kegiatan", "kps", "verif", "ttd", "porto", "ilkps", "dprodi", "setuju", "survei", "penilaian", "ded", "mk", "bank", "versi", "lab", "masukan", "data", "gkm", "rapat", "biodata", "cari", "pengguna", "log", "akun"];
const galat = [], id = new Set(topik.map(t => t.id)), dipakai = new Set();
if (id.size !== topik.length) galat.push("id topik ganda");
for (const t of topik) {
  if (!kategori.some(k => k.k === t.kat)) galat.push(t.id + ": kategori tidak dikenal " + t.kat);
  (t.g || []).forEach(g => { dipakai.add(g); if (!tanda[g]) galat.push(t.id + ": gambar tidak ada " + g); else if (!fs.existsSync(path.join(AKAR, "docs/uji/panduan", g + ".webp"))) galat.push(t.id + ": berkas gambar hilang " + g); });
  (t.terkait || []).forEach(x => { if (!id.has(x)) galat.push(t.id + ": topik terkait tidak ada " + x); });
  if (t.menu && !MENU.includes(t.menu)) galat.push(t.id + ": menu tidak dikenal " + t.menu);
}
Object.keys(tanda).forEach(g => { if (!dipakai.has(g)) console.log("catatan: gambar tidak dipakai topik mana pun:", g); });
if (galat.length) { console.error(galat.join("\n")); process.exit(1); }
const gambar = {}; for (const g of dipakai) gambar[g] = { j: tanda[g].j, a: tanda[g].a.map(a => Object.fromEntries(Object.entries(a).map(([k, v]) => [k, typeof v === "number" ? Math.round(v) : v]))) };
const isi = "/* Dibuat otomatis oleh alat/panduan.mjs dari alat/panduan-sumber.js dan alat/panduan-tanda.json. Jangan diubah langsung. */\nwindow.UPW_PANDUAN = " + JSON.stringify({ kategori, sinonim, topik, gambar }) + ";\n";
fs.writeFileSync(path.join(AKAR, "docs/uji/panduan.js"), isi);
console.log(`panduan.js: ${topik.length} topik, ${Object.keys(gambar).length} gambar, ${sinonim.length} kelompok sinonim, ${Math.round(isi.length / 1024)} KB`);
