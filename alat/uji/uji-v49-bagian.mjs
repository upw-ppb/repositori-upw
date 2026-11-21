// Uji v0.49.0: perawatan harian (anggaran sel Google Sheets: sesi/kode kedaluwarsa, arsip log, rapikan ukuran lembar), permintaan gabungan
// "banyak", simpanan hasil berat (Penilaian/iLKPS/Kesiapan) yang diperbarui saat data berubah, tanggal WITA tanpa Utilities.formatDate.
import fs from "node:fs";
export async function jalankan({ g, cek, ok, salah, tKps, tDsn, tAdm, tM, tSA }) {
  console.log("64. Perawatan harian, permintaan gabungan, simpanan hasil");
  const C = g.ctx, hari = 86400000, kini = Date.now();
  // --- tanggal WITA
  const tgl = [new Date("2026-11-21T15:59:59Z"), new Date("2026-11-21T16:00:00Z"), new Date("2024-02-29T00:00:00+08:00"), new Date("2025-12-31T23:30:00+08:00")];
  cek("tglWita sama dengan Utilities.formatDate Asia/Makassar (termasuk sekitar tengah malam)", tgl.every(d => C.tglWita(d) === C.Utilities.formatDate(d, "Asia/Makassar", "yyyy-MM-dd")));
  // --- perawatan
  const tambahMentah = (nama, objs) => { const sh = g.sheets[nama]; objs.forEach(o => sh.push(C.barisDari(nama, o).map(v => typeof v === "string" && v.startsWith("'") ? v.slice(1) : v))); };
  const nSesi0 = g.sheets.Sesi.length;
  tambahMentah("Sesi", [1, 2, 3].map(i => ({ tokenHash: "kadaluarsa" + i, userId: "x", dibuat: new Date(kini - 30 * hari), kedaluwarsa: new Date(kini - 3 * hari), perangkat: "lama" })));
  tambahMentah("Kode", [{ userId: "x", tujuan: "aktivasi", kodeHash: "h", email: "", kedaluwarsa: new Date(kini - 5 * hari), percobaan: 0, dipakai: "" }]);
  const logLama = [800, 500, 400].map((h, i) => ({ waktu: new Date(kini - h * hari), userId: "x", aksi: "uji.lama" + i, detail: "" }));
  g.sheets.Log.splice(1, 0, ...logLama.map(o => C.barisDari("Log", o)));   // log tua ada di atas (urut waktu)
  const isiLog = () => g.sheets.Log.filter(r => r.some(v => v !== "" && v !== undefined)).length, nLog0 = isiLog();
  g.props.RAWAT_TERAKHIR = "2000-01-01";
  ok("saya", {}, tDsn);
  cek("perawatan berjalan pada permintaan pertama hari itu; tanggal perawatan tersimpan", g.props.RAWAT_TERAKHIR === C.hariIni() && !!g.props.RAWAT_HASIL);
  cek("sesi kedaluwarsa dihapus, sesi aktif tetap (pengguna tetap masuk)", !g.sheets.Sesi.some(r => /kadaluarsa/.test(String(r[0]))) && g.sheets.Sesi.length >= nSesi0 - 0 && !!ok("saya", {}, tDsn).pengguna);
  cek("kode kedaluwarsa dihapus", !g.sheets.Kode.slice(1).some(r => r[2] === "h"));
  const arsip = Object.values(g.buku2)[0], lembar = arsip ? Object.keys(arsip.st) : [];
  const thLama = [800, 500, 400].map(h => String(new Date(kini - h * hari).getFullYear()));
  cek("log > 1 tahun dipindah ke spreadsheet Arsip Log (lembar per tahun), log baru tetap; buku arsip tercatat di pengaturan server", !!arsip && /Arsip Log/.test(arsip.nama) && thLama.every(t => lembar.includes("Log " + t))
    && Object.values(arsip.st).flat().filter(r => /uji\.lama/.test(String(r[2]))).length === 3 && !g.sheets.Log.some(r => /uji\.lama/.test(String(r[2]))) && isiLog() === nLog0 - 3 && !!g.props.ARSIP_LOG_ID);
  cek("ukuran lembar dirapikan: kolom = jumlah kolom tabel, baris kosong ≤ 100", g.ukuran.Log.col === 4 && g.ukuran.Sesi.col === 5 && Object.keys(g.sheets).every(n => { const u = g.ukuran[n]; return !u || u.row - g.sheets[n].length <= 100; }));
  const sebelum = g.props.RAWAT_HASIL; g.sheets.Log.splice(1, 0, C.barisDari("Log", { waktu: new Date(kini - 900 * hari), userId: "x", aksi: "uji.lagi", detail: "" }));
  ok("saya", {}, tDsn);
  cek("perawatan tidak berjalan dua kali dalam sehari", g.props.RAWAT_HASIL === sebelum && g.sheets.Log.some(r => r[2] === "uji.lagi"));
  // harian ringan: dalam 7 hari sejak perapian ukuran, perawatan harian tidak merapikan lembar dan tidak menghitung sel; log tidak dibaca bila baris teratas masih baru
  g.props.RAWAT_TERAKHIR = "2000-01-01"; g.props.RAWAT_UKURAN_TERAKHIR = C.hariIni();
  let dipanggil = 0; const asliR = C.rapikanUkuran, asliH = C.hitungSel; C.rapikanUkuran = () => { dipanggil++; return asliR(); }; C.hitungSel = () => { dipanggil++; return asliH(); };
  ok("saya", {}, tDsn); C.rapikanUkuran = asliR; C.hitungSel = asliH;
  const H2 = JSON.parse(g.props.RAWAT_HASIL);
  cek("perawatan harian ringan: perapian lembar dan hitung sel hanya mingguan", dipanggil === 0 && H2.sel === null && H2.ukuran.baris === 0 && g.props.RAWAT_TERAKHIR === C.hariIni());
  g.props.RAWAT_TERAKHIR = "2000-01-01"; g.props.RAWAT_UKURAN_TERAKHIR = "2000-01-01"; ok("saya", {}, tDsn);
  cek("setelah 7 hari perapian lembar berjalan lagi", g.props.RAWAT_UKURAN_TERAKHIR === C.hariIni() && JSON.parse(g.props.RAWAT_HASIL).sel !== null);
  // tambahBanyak setelah lembar dirapikan: baris ditambah otomatis
  const nPg = g.sheets.Pengguna.length;
  const baru = Array.from({ length: 120 }, (_, i) => ({ username: "49" + String(i).padStart(4, "0"), nama: "Mhs Rawat " + i, masuk: 2026, kelas: "A" }));
  const im = ok("admin.impor", { baris: baru }, tAdm);
  cek("impor 120 akun sekaligus setelah lembar dirapikan tetap berhasil (kapasitas baris ditambah)", g.sheets.Pengguna.length >= nPg + 120 && !!im);
  // admin.rawat
  g.sheets.Log.splice(1, 0, C.barisDari("Log", { waktu: new Date(kini - 700 * hari), userId: "x", aksi: "uji.lagi2", detail: "" }));
  const R = ok("admin.rawat", { jalankan: true }, tSA);
  cek("Super Admin: jalankan perawatan sekarang + perkiraan sel (batas 10 juta); log lama berikutnya ikut diarsipkan", R.hasil && R.sel.batas === 10000000 && R.sel.total > 0 && R.hasil.log >= 1 && /docs\.google\.com/.test(R.arsipLog)
    && !g.sheets.Log.some(r => r[2] === "uji.lagi2"));
  cek("admin.rawat: selain Super Admin ditolak", /izin/i.test(salah("admin.rawat", {}, tAdm)));
  cek("Log Super Admin membaca 200 baris terakhir saja (semuaAkhir)", ok("admin.log", {}, tSA).log.length <= 200 && typeof C.semuaAkhir === "function");
  // --- permintaan gabungan
  const B = JSON.parse(C.doPost({ postData: { contents: JSON.stringify({ aksi: "banyak", token: tDsn, daftar: [{ aksi: "saya" }, { aksi: "aksi.tidak.ada" }, { aksi: "tugas.saya" }, { aksi: "masuk", data: {} }] }) } }).isi);
  cek("banyak: hasil per butir (berhasil/gagal sendiri-sendiri); masuk tidak boleh digabung", B.ok && B.hasil.length === 4 && B.hasil[0].ok && B.hasil[0].pengguna && !B.hasil[1].ok && /tidak dikenal/.test(B.hasil[1].galat)
    && B.hasil[2].ok && !B.hasil[3].ok && /tidak bisa digabung/.test(B.hasil[3].galat));
  const B2 = JSON.parse(C.doPost({ postData: { contents: JSON.stringify({ aksi: "banyak", token: tDsn, daftar: Array.from({ length: 13 }, () => ({ aksi: "saya" })) }) } }).isi);
  cek("banyak: lebih dari 12 butir ditolak", !B2.ok && /tidak sah/.test(B2.galat));
  // --- simpanan hasil berat
  Object.keys(g.cache).filter(k => /^sj:/.test(k)).forEach(k => delete g.cache[k]);
  const P1 = ok("penilaian.data", {}, tKps), kunci = Object.keys(g.cache).filter(k => /^sj:nilai:/.test(k));
  let dihitung = 0; const asli = C.hitungPenilaian; C.hitungPenilaian = function () { dihitung++; return asli.apply(this, arguments); };
  const P2 = ok("penilaian.data", {}, tAdm);
  cek("Penilaian: hasil disimpan sementara dan dipakai bersama pengguna lain (tidak dihitung ulang)", kunci.length >= 2 && dihitung === 0 && P2.total === P1.total);
  const bt = P1.rows.find(r => r.perluGpm), ts = C.tsAwal();
  ok("penilaian.skor", { ts, butir: bt.n, skor: 3, catatan: "uji simpanan" }, tKps);
  const P3 = ok("penilaian.data", {}, tKps);
  cek("setelah data berubah (skor GKM disimpan) Penilaian dihitung ulang dan memuat perubahan", dihitung === 1 && P3.rows.find(r => r.n === bt.n).gpm === 3);
  C.hitungPenilaian = asli;
  const v0 = g.cache.versiData; ok("saya", {}, tDsn); ok("admin.log", {}, tSA);
  cek("permintaan baca saja dan catatan Log tidak mengubah versi data", g.cache.versiData === v0);
  ok("ilkps.data", {}, tAdm); const nI = Object.keys(g.cache).filter(k => /^sj:ilkps:/.test(k)).length;
  ok("kesiapan.data", {}, tKps);
  cek("Tabel iLKPS dan Kesiapan juga disimpan sementara", nI >= 2 && Object.keys(g.cache).some(k => /^sj:kesiapan:/.test(k)));
  // --- tampilan
  const app = fs.readFileSync("web/aplikasi.js", "utf8");
  cek("tampilan: permintaan bersamaan digabung (antrean + aksi banyak, maks 12), cadangan kirim satu per satu bila server lama", /setTimeout\(kirimAntre, 0\)/.test(app) && /aksi: "banyak"/.test(app) && /MAKS_GABUNG = 12/.test(app)
    && /tidak dikenal/.test(app.slice(app.indexOf("async function kirimGabung"), app.indexOf("async function kirimGabung") + 900)));
  cek("tampilan: data Kegiatan (referensi dan daftar) dimuat bersamaan", /if \(!S\.ref \|\| !S\.keg\) \{ if \(!S\.ref\) muatRef\(\); if \(!S\.keg\) muatKeg\(\);/.test(app));
}
