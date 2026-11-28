/**
 * v0.49.0: perawatan harian agar spreadsheet tidak menyentuh batas Google Sheets (10 juta sel per spreadsheet) dan tetap ringan dibaca.
 * Google menghitung SEMUA sel lembar, termasuk baris/kolom kosong: lembar baru berukuran 1.000 baris × 26 kolom, dan setiap baris Log (4 kolom
 * terisi) tetap dihitung 26 sel. Pengukuran 21 Nov 2026 (alat/uji/ukur-beban.mjs): tanpa perawatan, ±5 tahun pemakaian ≈ 10,9 juta sel.
 * Langkah harian dibuat ringan (pengukuran server Uji Coba 21 Nov 2026: perawatan pertama yang merapikan semua lembar memakan ±16 dtk), jadi:
 * harian = langkah 1–2 (log dibaca seluruhnya HANYA bila baris teratas sudah tua); mingguan (RAWAT_HARI_UKURAN) = langkah 3 + hitung sel.
 * Langkah (oleh permintaan pertama "saya"/"masuk" pada hari itu, tanpa pemicu terjadwal):
 *  1. Sesi dan Kode yang sudah kedaluwarsa > 1 hari dihapus (tidak dipakai lagi; sesi aktif tidak tersentuh).
 *  2. Log yang lebih tua dari ARSIP_LOG_HARI dipindah ke spreadsheet terpisah "Repositori UPW — Arsip Log" (satu lembar per tahun),
 *     paling banyak MAKS_ARSIP_PER_JALAN baris per hari agar permintaan tidak lama. Arsip tetap tersimpan, tidak dihapus.
 *  3. Kolom kosong di kanan dan baris kosong di bawah setiap lembar dibuang (disisakan SISA_BARIS baris kosong).
 *  4. v0.61.0: cadangan mingguan otomatis — salinan spreadsheet data ke folder Drive "Cadangan" (nama "Cadangan / Mingguan otomatis / <waktu>"),
 *     CADANGAN_SIMPAN salinan terakhir disimpan; yang lebih lama dipindah ke Sampah Drive (masih bisa dipulihkan 30 hari). Cadangan lain
 *     (sebelum rilis, manual) tidak pernah disentuh. Berkas bukti di Drive tidak disalin (tidak pernah diubah/dihapus aplikasi kecuali oleh pemiliknya).
 * Super Admin bisa menjalankannya kapan saja dari Riwayat Versi (aksi admin.rawat) dan melihat perkiraan jumlah sel.
 */
var CADANGAN_HARI = 7, CADANGAN_SIMPAN = 8, AWALAN_CADANGAN_MINGGUAN = "Cadangan / Mingguan otomatis / ";
function perluCadanganMingguan() { var t = prop("CADANGAN_MINGGUAN_TERAKHIR"); return !t || (new Date(hariIni()) - new Date(t)) / 86400000 >= CADANGAN_HARI; }
/** Salin spreadsheet data; simpan CADANGAN_SIMPAN salinan mingguan terbaru, sisanya ke Sampah. */
function cadanganMingguan() {
  var waktu = Utilities.formatDate(new Date(), "Asia/Makassar", "yyyy-MM-dd HH.mm"), tujuan = folderCadangan();
  var nama = AWALAN_CADANGAN_MINGGUAN + waktu;
  DriveApp.getFileById(prop("SPREADSHEET_ID")).makeCopy(nama, tujuan);
  var L = [], it = tujuan.getFiles();
  while (it.hasNext()) { var f = it.next(); if (!f.isTrashed() && f.getName().indexOf(AWALAN_CADANGAN_MINGGUAN) === 0) L.push(f); }
  L.sort(function (a, b) { return b.getName().localeCompare(a.getName()); });   // nama berisi waktu → terbaru dulu
  var buang = L.slice(CADANGAN_SIMPAN);
  buang.forEach(function (f) { f.setTrashed(true); });
  return { nama: nama, simpan: L.length - buang.length, dibuang: buang.length };
}
var ARSIP_LOG_HARI = 365, SISA_BARIS = 50, MAKS_ARSIP_PER_JALAN = 20000, BATAS_SEL_SHEETS = 10000000, RAWAT_HARI_UKURAN = 7;
function perluRapikanUkuran() { var t = prop("RAWAT_UKURAN_TERAKHIR"); return !t || (new Date(hariIni()) - new Date(t)) / 86400000 >= RAWAT_HARI_UKURAN; }

function perluRawat() { return prop("SPREADSHEET_ID") && prop("RAWAT_TERAKHIR") !== hariIni(); }

/** Dipanggil dari doPost untuk aksi "saya" dan "masuk". Tidak pernah menggagalkan permintaan pengguna. */
function rawatBilaPerlu() {
  if (!perluRawat()) return;
  try { rawatHarian(false); } catch (e) { console.error("Perawatan harian gagal", e && e.stack || e); }
}

function rawatHarian(paksa) {
  var kunci = LockService.getScriptLock();
  if (!kunci.tryLock(paksa ? 20000 : 50)) return null;   // permintaan lain sedang menulis: coba lagi pada permintaan berikutnya
  try {
    setelPropUlang(); _isi = {};
    if (!paksa && !perluRawat()) return null;
    var h = { sesi: bersihkanKedaluwarsa("Sesi"), kode: bersihkanKedaluwarsa("Kode"), log: arsipkanLog(), ukuran: { kolom: 0, baris: 0 }, sel: null }, o = { RAWAT_TERAKHIR: hariIni() };
    if (paksa || perluRapikanUkuran()) { h.ukuran = rapikanUkuran(); h.sel = hitungSel(); o.RAWAT_UKURAN_TERAKHIR = hariIni(); o.RAWAT_SEL = JSON.stringify(h.sel); }
    if (perluCadanganMingguan()) {   // v0.61.0: kegagalan cadangan tidak menggagalkan perawatan; dicoba lagi pada perawatan berikutnya
      try { h.cadangan = cadanganMingguan(); o.CADANGAN_MINGGUAN_TERAKHIR = hariIni(); o.CADANGAN_MINGGUAN_HASIL = JSON.stringify({ w: new Date().toISOString(), nama: h.cadangan.nama, simpan: h.cadangan.simpan, dibuang: h.cadangan.dibuang }); }
      catch (e) { console.error("Cadangan mingguan gagal", e && e.stack || e); h.cadanganGalat = String(e && e.message || e).slice(0, 300); o.CADANGAN_MINGGUAN_HASIL = JSON.stringify({ w: new Date().toISOString(), galat: h.cadanganGalat }); }
    }
    h.waktu = new Date().toISOString(); o.RAWAT_HASIL = JSON.stringify(h).slice(0, 8000);
    konfig().setProperties(o); setelPropUlang();
    return h;
  } finally { _isi = {}; kunci.releaseLock(); }
}

/** Tulis ulang isi tabel (baris data saja; judul kolom tetap). Kapasitas baris ditambah bila perlu, sisa baris lama dikosongkan. */
function tulisUlangTabel(nama, baris) {
  var sh = sheet(nama), kolom = kolomDari(nama), lama = sh.getLastRow() - 1;
  if (lama > 0) sh.getRange(2, 1, lama, kolom.length).clearContent();
  if (baris.length) { pastikanBaris(sh, 1 + baris.length); sh.getRange(2, 1, baris.length, kolom.length).setValues(baris); }
  delete _isi[nama];
}
function pastikanBaris(sh, perlu) { var ada = sh.getMaxRows(); if (ada < perlu) sh.insertRowsAfter(ada, perlu - ada); }

function bersihkanKedaluwarsa(nama) {
  var kolom = kolomDari(nama), iK = kolom.indexOf("kedaluwarsa"), sh = sheet(nama), n = sh.getLastRow() - 1;
  if (n < 1 || iK < 0) return 0;
  var batas = new Date(Date.now() - 86400000), nilai = sh.getRange(2, 1, n, kolom.length).getValues();
  var sisa = nilai.filter(function (r) { var t = r[iK] instanceof Date ? r[iK] : new Date(r[iK]); return !(t < batas); });
  if (sisa.length === nilai.length) return 0;
  tulisUlangTabel(nama, sisa);
  return nilai.length - sisa.length;
}

function bukuArsipLog() {
  var id = prop("ARSIP_LOG_ID");
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) { console.error("Arsip log tidak bisa dibuka; membuat yang baru", e); } }
  var ss = SpreadsheetApp.create("Repositori UPW — Arsip Log" + (modeUji() ? " (Uji Coba)" : ""));
  try { DriveApp.getFileById(ss.getId()).moveTo(DriveApp.getFolderById(prop("FOLDER_ID"))); } catch (e) { console.error("Arsip log tidak bisa dipindah ke folder data", e); }
  konfig().setProperty("ARSIP_LOG_ID", ss.getId()); setelPropUlang();
  return ss;
}

/** Pindahkan baris Log yang lebih tua dari ARSIP_LOG_HARI ke buku arsip (lembar "Log <tahun>"). Log ditulis berurutan waktu, jadi yang tua di atas. */
function arsipkanLog() {
  var kolom = kolomDari("Log"), sh = sheet("Log"), n = sh.getLastRow() - 1;
  if (n < 1) return 0;
  var batas = new Date(Date.now() - ARSIP_LOG_HARI * 86400000), w0 = sh.getRange(2, 1).getValue(), t0 = w0 instanceof Date ? w0 : new Date(w0);
  if (!(t0 < batas)) return 0;   // baris teratas (tertua) belum setahun: tidak ada yang perlu diarsipkan, log tidak dibaca seluruhnya
  var nilai = sh.getRange(2, 1, n, kolom.length).getValues(), tua = [];
  for (var i = 0; i < nilai.length && tua.length < MAKS_ARSIP_PER_JALAN; i++) {
    var t = nilai[i][0] instanceof Date ? nilai[i][0] : new Date(nilai[i][0]);
    if (t < batas) tua.push(i); else break;
  }
  if (!tua.length) return 0;
  var ss = bukuArsipLog(), perTahun = {};
  tua.forEach(function (i) { var t = nilai[i][0] instanceof Date ? nilai[i][0] : new Date(nilai[i][0]), th = isNaN(t) ? "lain" : String(t.getFullYear()); (perTahun[th] = perTahun[th] || []).push(nilai[i]); });
  Object.keys(perTahun).forEach(function (th) {
    var nm = "Log " + th, a = ss.getSheetByName(nm);
    if (!a) { a = ss.insertSheet(nm); a.getRange(1, 1, 1, kolom.length).setValues([kolom]); a.setFrozenRows(1); if (a.getMaxColumns() > kolom.length) a.deleteColumns(kolom.length + 1, a.getMaxColumns() - kolom.length); }
    var akhir = a.getLastRow(); pastikanBaris(a, akhir + perTahun[th].length);
    a.getRange(akhir + 1, 1, perTahun[th].length, kolom.length).setValues(perTahun[th]);
  });
  var awal = ss.getSheetByName("Sheet1") || ss.getSheetByName("Lembar1"); if (awal && ss.getSheets().length > 1) { try { ss.deleteSheet(awal); } catch (e) {} }
  tulisUlangTabel("Log", nilai.slice(tua.length));
  return tua.length;
}

/** Buang kolom kosong di kanan dan baris kosong di bawah (sisakan SISA_BARIS). Tidak pernah menyentuh sel berisi. */
function rapikanUkuran() {
  var ss = buku(), kol = 0, bar = 0;
  ss.getSheets().forEach(function (sh) {
    var nama = sh.getName(), perluKol;
    try { perluKol = kolomDari(nama).length; } catch (e) { perluKol = sh.getLastColumn(); }
    perluKol = Math.max(perluKol, sh.getLastColumn(), 1);
    var maksKol = sh.getMaxColumns();
    if (maksKol > perluKol) { sh.deleteColumns(perluKol + 1, maksKol - perluKol); kol += maksKol - perluKol; }
    var akhir = Math.max(sh.getLastRow(), 1), maksBar = sh.getMaxRows(), simpan = akhir + SISA_BARIS;
    if (maksBar > simpan + SISA_BARIS) { sh.deleteRows(simpan + 1, maksBar - simpan); bar += maksBar - simpan; }
  });
  return { kolom: kol, baris: bar };
}

/** Perkiraan sel spreadsheet data (dihitung Google: baris maks × kolom maks setiap lembar). */
function hitungSel() {
  var total = 0, per = {};
  buku().getSheets().forEach(function (sh) { var c = sh.getMaxRows() * sh.getMaxColumns(); total += c; per[sh.getName()] = c; });
  var besar = Object.keys(per).sort(function (a, b) { return per[b] - per[a]; }).slice(0, 5).map(function (k) { return { lembar: k, sel: per[k] }; });
  return { total: total, batas: BATAS_SEL_SHEETS, persen: Math.round(total / BATAS_SEL_SHEETS * 1000) / 10, terbesar: besar };
}

/** Super Admin: lihat keadaan atau jalankan perawatan sekarang (d.jalankan). */
function aksiAdminRawat(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["superadmin"]);
  var h = d && d.jalankan ? rawatHarian(true) : null;
  if (h) catat(p.id, "admin.rawat", { sesi: h.sesi, kode: h.kode, log: h.log, sel: h.sel && h.sel.total });
  var lalu = null, sel = null, cad = null; try { lalu = JSON.parse(prop("RAWAT_HASIL") || "null"); sel = JSON.parse(prop("RAWAT_SEL") || "null"); cad = JSON.parse(prop("CADANGAN_MINGGUAN_HASIL") || "null"); } catch (e) {}
  if (!sel) sel = hitungSel();   // belum pernah dihitung: hitung sekarang (beberapa detik)
  return { hasil: h, terakhir: prop("RAWAT_TERAKHIR") || "", terakhirUkuran: prop("RAWAT_UKURAN_TERAKHIR") || "", lalu: lalu, sel: sel,
    arsipLog: prop("ARSIP_LOG_ID") ? "https://docs.google.com/spreadsheets/d/" + prop("ARSIP_LOG_ID") : "",
    cadangan: { terakhir: prop("CADANGAN_MINGGUAN_TERAKHIR") || "", hasil: cad, simpan: CADANGAN_SIMPAN, hari: CADANGAN_HARI } };
}
