// Uji v0.36.0: penanda MK "tanpa dosen pengampu" (magang / tugas akhir) — kurikulum, tim pengajar, impor Excel, migrasi data lama.
import fs from "node:fs";
export function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm }) {
  console.log("47. Mata kuliah tanpa dosen pengampu (magang / tugas akhir)");
  const dsn = ID("199001152015041001"), smt = "2032-2", MK = g.sheets.MataKuliah;
  const iT = MK[0].indexOf("tanpaTim");
  cek("migrasi: kolom tanpaTim di akhir MataKuliah; SKEMA_VERSI ≥ 26", iT === MK[0].length - 1 && Number(g.props.SKEMA_VERSI) >= 26);
  ok("dp.mkSimpan", { daftar: [{ kode: "UPW961", nama: "Magang Industri Perjalanan", semester: 6, sksPraktik: 20 }, { kode: "UPW962", nama: "Tugas Akhir", semester: 8, sksPraktik: 6 },
    { kode: "UPW963", nama: "Perencanaan Perjalanan", semester: 6, sksKuliah: 3 }, { kode: "UPW964", nama: "Skripsi Terapan", semester: 8, sksPraktik: 6, tanpaTim: "Tidak" }] }, tAdm);
  const mk = k => ok("dp.data", { semester: smt }, tAdm).mk.find(m => m.kode === k);
  cek("MK baru: Magang dan Tugas Akhir otomatis bertanda; MK biasa tidak; pilihan eksplisit 'Tidak' dihormati", mk("UPW961").tanpaTim && mk("UPW962").tanpaTim && !mk("UPW963").tanpaTim && !mk("UPW964").tanpaTim);
  ok("dp.timSimpan", { semester: smt, kodeMk: "UPW964", anggota: [{ t: "u", id: dsn }] }, tAdm);
  ok("dp.mkSimpan", { daftar: [{ kode: "UPW964", nama: "Skripsi Terapan", semester: 8, sksPraktik: 6 }] }, tAdm);
  cek("simpan ulang tanpa kolom penanda (templat kurikulum lama): nilai lama tidak berubah", !mk("UPW964").tanpaTim);
  const tim = k => ok("dp.data", { semester: smt }, tAdm).tim.find(t => t.kode === k);
  cek("tim MK biasa tetap tersimpan sebelum ditandai", tim("UPW964").anggota.length === 1);
  ok("dp.mkSimpan", { kodeLama: "UPW964", data: { kode: "UPW964", nama: "Skripsi Terapan", semester: 8, sksPraktik: 6, tanpaTim: true } }, tAdm);
  const t4 = tim("UPW964");
  cek("setelah ditandai: tim lama diabaikan (anggota kosong, tanpaTim) di semua hitungan", t4.tanpaTim === true && t4.anggota.length === 0);
  cek("Ubah tim dan impor Excel ditolak untuk MK bertanda", /tanpa dosen pengampu/.test(salah("dp.timSimpan", { semester: smt, kodeMk: "UPW961", anggota: [{ t: "u", id: dsn }] }, tAdm))
    && /tanpa dosen pengampu/.test(ok("dp.timImpor", { semester: smt, daftar: [{ kodeMk: "UPW962", anggota: [{ t: "u", id: dsn }] }] }, tKps).dilewati[0].alasan));
  ok("dp.mkSimpan", { kodeLama: "UPW964", data: { kode: "UPW964", nama: "Skripsi Terapan", semester: 8, sksPraktik: 6, tanpaTim: false } }, tAdm);
  cek("penanda dilepas: tim lama muncul kembali (data tidak dihapus)", tim("UPW964").anggota.length === 1 && !tim("UPW964").tanpaTim);
  cek("KPS tidak bisa mengubah penanda di kurikulum", /izin/.test(salah("dp.mkSimpan", { data: { kode: "UPW963", nama: "X", semester: 6, sksKuliah: 3, tanpaTim: true } }, tKps)));
  // Migrasi data lama: MK bernama Magang/PKL yang belum punya penanda ditandai otomatis saat struktur data diperbarui (25 → 26).
  ok("dp.mkSimpan", { daftar: [{ kode: "UPW965", nama: "Praktik Kerja Lapangan (PKL)", semester: 4, sksPraktik: 4, tanpaTim: false }, { kode: "UPW966", nama: "Magang Luar Negeri", semester: 7, sksPraktik: 20, tanpaTim: false }] }, tAdm);
  MK.slice(1).forEach(r => { if (["UPW965", "UPW966", "UPW963"].includes(r[1])) r[iT] = ""; });
  g.props.SKEMA_VERSI = "25";
  ok("dp.data", { semester: smt }, tAdm);
  cek("migrasi 25 → 26: MK lama bernama PKL/Magang ditandai otomatis, MK biasa tidak; versi kembali 26", mk("UPW965").tanpaTim && mk("UPW966").tanpaTim && !mk("UPW963").tanpaTim && g.props.SKEMA_VERSI === "26");
  const app = fs.readFileSync("web/aplikasi.js", "utf8");
  cek("tampilan: centang di formulir MK, MK bertanda tidak masuk templat tim/beban SKS dan ditolak saat impor",
    /cek\("mkTanpa"/.test(app) && /D\.tim\.filter\(t => !t\.tanpaTim\)\.forEach/.test(app) && /mk\[kode\]\.tanpaTim\) \{ masalah\.push/.test(app) && /Tanpa pengampu \(magang\/TA\)/.test(app));
}
