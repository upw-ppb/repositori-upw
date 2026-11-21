// Uji v0.48.1: tombol/daftar unduhan buatan aplikasi dihapus; semua unduhan lewat unduhan biasa browser (tampil di tombol unduhan Chrome/Edge).
import fs from "node:fs";
export function jalankan({ cek }) {
  console.log("62. Unduhan lewat browser");
  const app = fs.readFileSync("web/aplikasi.js", "utf8"), css = fs.readFileSync("web/gaya.css", "utf8");
  const fn = app.slice(app.indexOf("function simpanBerkas"), app.indexOf("const namaBerkas"));
  cek("tanpa tombol dan daftar unduhan aplikasi (unduhToggle, kotak Unduhan terakhir, gaya .unduh-pop)", !/unduhToggle|kotakUnduhan|catatUnduhan|Unduhan terakhir/.test(app) && !/\.unduh-pop/.test(css));
  cek("simpanBerkas: unduhan biasa (a[download]), tanpa jendela Simpan ke…; daftar lama dibersihkan", /a\.download = nama/.test(fn) && !/showSaveFilePicker/.test(app) && /localStorage\.removeItem/.test(app));
}
