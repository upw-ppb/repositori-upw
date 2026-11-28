// Uji v0.61.0: cadangan mingguan otomatis (salinan spreadsheet ke folder Cadangan, simpan 8 terakhir, sisanya ke Sampah; cadangan lain tidak disentuh).
import fs from "node:fs";
export async function jalankan({ g, cek, ok, salah, tAdm, tSA }) {
  console.log("79. Cadangan mingguan otomatis");
  const C = g.ctx, setProp = (k, v) => { C.konfig().setProperty(k, v); C.setelPropUlang(); };
  const folder = () => C.folderCadangan();
  const daftar = () => { const l = [], it = folder().getFiles(); while (it.hasNext()) l.push(it.next()); return l; };
  const mingguan = () => daftar().filter(f => f.getName().indexOf(C.AWALAN_CADANGAN_MINGGUAN) === 0);
  mingguan().forEach(f => folder().file.splice(folder().file.indexOf(f), 1));   // mulai bersih: cadangan mingguan dari uji sebelumnya (v0.49 admin.rawat) dibuang dari tiruan
  // cadangan lain yang TIDAK boleh tersentuh
  const lain = [folder().createFile("Cadangan / sebelum v0.1.0 / 2020-01-01 10.00", "x"), folder().createFile("Cadangan / manual / 2020-01-02 10.00", "x")];
  // 9 cadangan mingguan lama buatan uji (lebih tua dari yang akan dibuat sekarang)
  for (let i = 1; i <= 9; i++) folder().createFile(C.AWALAN_CADANGAN_MINGGUAN + "2020-0" + i + "-01 03.00", "x");
  setProp("CADANGAN_MINGGUAN_TERAKHIR", "2020-01-01");
  const R = ok("admin.rawat", { jalankan: true }, tSA);
  const M = mingguan(), aktif = M.filter(f => !f.isTrashed()), buang = M.filter(f => f.isTrashed());
  cek("perawatan membuat cadangan mingguan baru (salinan spreadsheet) bila sudah ≥ 7 hari", R.hasil && R.hasil.cadangan && /^Cadangan \/ Mingguan otomatis \/ \d{4}-\d{2}-\d{2} \d{2}\.\d{2}$/.test(R.hasil.cadangan.nama)
    && M.some(f => f.getName() === R.hasil.cadangan.nama && !f.isTrashed()), R.hasil);
  cek("hanya 8 salinan mingguan terbaru disimpan; 2 tertua ke Sampah (bisa dipulihkan)", aktif.length === 8 && buang.length === 2
    && buang.map(f => f.getName().slice(-16, -6)).sort().join() === "2020-01-01,2020-02-01", { aktif: aktif.map(f => f.getName()), buang: buang.map(f => f.getName()) });
  cek("cadangan sebelum rilis dan manual tidak disentuh", lain.every(f => !f.isTrashed()));
  cek("admin.rawat melaporkan cadangan terakhir", R.cadangan && R.cadangan.terakhir === C.hariIni() && R.cadangan.hasil.simpan === 8 && R.cadangan.simpan === 8);
  // hari yang sama: tidak dibuat lagi
  const n = mingguan().length;
  setProp("RAWAT_TERAKHIR", "2020-01-01");
  ok("saya", {}, tAdm);   // perawatan harian otomatis lewat permintaan "saya"
  cek("perawatan harian berikutnya dalam 7 hari tidak membuat cadangan lagi", mingguan().length === n && C.prop("RAWAT_TERAKHIR") === C.hariIni());
  // perawatan otomatis lewat permintaan pengguna setelah 7 hari
  setProp("RAWAT_TERAKHIR", "2020-01-01"); setProp("CADANGAN_MINGGUAN_TERAKHIR", "2020-01-01");
  ok("saya", {}, tAdm);
  cek("perawatan otomatis (permintaan pengguna pertama hari itu) membuat cadangan mingguan", mingguan().length === n + 1 && mingguan().filter(f => !f.isTrashed()).length === 8);
  // gagal menyalin: perawatan tetap selesai, galat dicatat, dicoba lagi berikutnya
  const asli = C.DriveApp.getFileById;
  C.DriveApp.getFileById = id => { const f = asli(id); return Object.assign({}, f, { makeCopy: () => { throw new Error("Kuota Drive penuh (uji)"); } }); };
  setProp("CADANGAN_MINGGUAN_TERAKHIR", "2020-01-01");
  const R2 = ok("admin.rawat", { jalankan: true }, tSA);
  C.DriveApp.getFileById = asli;
  cek("cadangan gagal: perawatan tetap selesai, galat tampil, tanggal tidak maju (dicoba lagi)", R2.hasil && R2.hasil.cadanganGalat && /Kuota Drive penuh/.test(R2.cadangan.hasil.galat) && R2.cadangan.terakhir === "2020-01-01", R2.cadangan);
  setProp("CADANGAN_MINGGUAN_TERAKHIR", C.hariIni());
  cek("admin.rawat: selain Super Admin tetap ditolak", /izin/i.test(salah("admin.rawat", {}, tAdm)));
  const app = fs.readFileSync("web/aplikasi.js", "utf8");
  cek("tampilan: info cadangan mingguan di panel Kesehatan data", /function infoCadanganMingguan/.test(app) && /infoCadanganMingguan\(R\.cadangan\)/.test(app));
}
