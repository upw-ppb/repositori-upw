/**
 * Lapisan data sederhana di atas Google Sheets.
 * Setiap sheet = satu tabel; baris 1 = nama kolom.
 * ATURAN: kolom baru selalu ditambahkan di AKHIR daftar, agar data lama tetap terbaca (juga oleh versi sebelumnya).
 */
var SKEMA = {
  Pengguna: ["id", "username", "nama", "email", "peran", "status", "hash", "garam", "wajibGanti", "emailTerverifikasi",
             "gagal", "kunciSampai", "ref", "dosenId", "diimporPada", "aktivasiPada", "masukTerakhir", "diubahPada",
             /* v0.2.0 */ "masuk", "kelas", "statusMhs", "biodataLengkap", "biodataSemester", "biodataPada",
             /* v0.9.0 */ "berlakuSampai", "instansi"],
  Sesi: ["tokenHash", "userId", "dibuat", "kedaluwarsa", "perangkat"],
  Kode: ["userId", "tujuan", "kodeHash", "email", "kedaluwarsa", "percobaan", "dipakai"],
  Log: ["waktu", "userId", "aksi", "detail"],
  Pengaturan: ["kunci", "nilai", "keterangan"],
  /* v0.2.0 */
  RiwayatSemester: ["userId", "semester", "tinggal", "kerja", "inggris", "transport", "waktu"],
  /* v0.3.0 */
  Kegiatan: ["id", "jenis", "jenisLain", "judul", "tgl", "sampai", "tingkat", "olehId", "kelompok", "pegawai", "kelas", "mhs", "excl",
             "pendampingId", "isian", "gcet", "perluST", "tempat", "aktivitas", "ket", "bentuk", "kegDosen", "st", "status", "riwayat",
             "kodeSurat", "tglSurat", "kpsId", "lampiran", "dibuat", "diubah", "dihapus",
             /* v0.4.0 */ "bukti", "verifId", "tglVerif"],
  /* v0.5.0 */
  TandaTangan: ["id", "userId", "fileId", "nonce", "cara", "dibuat", "dihapus"],
  /* v0.6.0 */
  DokumenPribadi: ["id", "userId", "nama", "jenis", "tahun", "t", "fileId", "namaFile", "mime", "ukuran", "url", "dibuat", "dihapus"],
  /* v0.8.0 */
  MataKuliah: ["id", "kode", "nama", "semester", "kompetensi", "sksKuliah", "sksSeminar", "sksPraktik", "cplSikap", "cplPengetahuan", "cplKu", "cplKk",
               "rps", "unit", "diubah", "dihapus"],
  Praktisi: ["id", "nama", "nidk", "perusahaan", "pendidikan", "bidang", "sertifikat", "diubah", "dihapus"],
  TimPengajar: ["semester", "kodeMk", "anggota", "diubah", "oleh"],
  DosenTs: ["userId", "ta", "ps", "psLain", "luarPt", "penelitian", "pkm", "tambahan", "sesuai", "diubah"],
  /* v0.10.0 */
  Lulusan: ["nim", "nama", "masuk", "tglLulus", "ipk", "dipesan", "wtBulan", "kesesuaian", "tempatKerja", "diubah", "dihapus"],
  Penerimaan: ["tahun", "dayaTampung", "pendaftar", "lulusSeleksi", "diterima", "diubah"],
  Dana: ["ta", "jenis", "upps", "ps", "diubah"]
};

/** Versi struktur data. Naikkan setiap kali ada tabel atau kolom baru; server menyesuaikan sheet otomatis. */
var VERSI_SKEMA = 9;

/** Kolom suatu tabel. Tabel biodata dibentuk dari skema formulir di Biodata.js. */
function kolomDari(nama) {
  var k = SKEMA[nama] || tabelBiodata()[nama];
  if (!k) throw new Error("Tabel tidak dikenal: " + nama);
  return k;
}
function daftarTabel() { return Object.keys(SKEMA).concat(Object.keys(tabelBiodata())); }

function konfig() { return PropertiesService.getScriptProperties(); }
function lingkungan() { return konfig().getProperty("LINGKUNGAN") || "belum-disiapkan"; }
function modeUji() { return lingkungan() === "uji"; }

var _buku = null;
function buku() {
  if (_buku) return _buku;
  var id = konfig().getProperty("SPREADSHEET_ID");
  if (!id) throw galat("Server belum disiapkan.");
  return (_buku = SpreadsheetApp.openById(id));
}

function sheet(nama) {
  var sh = buku().getSheetByName(nama);
  if (!sh) throw new Error("Sheet tidak ada: " + nama);
  return sh;
}

/** Ambil semua baris sebagai objek. */
function semua(nama) {
  var sh = sheet(nama), n = sh.getLastRow();
  if (n < 2) return [];
  var kolom = kolomDari(nama), nilai = sh.getRange(2, 1, n - 1, kolom.length).getValues();
  return nilai.map(function (r, i) {
    var o = { _baris: i + 2 };
    kolom.forEach(function (k, j) { o[k] = r[j]; });
    return o;
  });
}

function cari(nama, fn) { var l = semua(nama); for (var i = 0; i < l.length; i++) if (fn(l[i])) return l[i]; return null; }

/**
 * Teks yang diawali angka atau = + - @ disimpan sebagai teks murni (awalan '), agar nol di depan nomor HP/NIM tidak hilang,
 * tanggal tidak berubah format, dan isian tidak pernah dijalankan sebagai rumus.
 */
function amankan(v) { return typeof v === "string" && /^[=+\-@0-9]/.test(v) ? "'" + v : v; }
function barisDari(nama, obj) { return kolomDari(nama).map(function (k) { return obj[k] === undefined || obj[k] === null ? "" : amankan(obj[k]); }); }

function tambah(nama, obj) { sheet(nama).appendRow(barisDari(nama, obj)); }

function tambahBanyak(nama, daftar) {
  if (!daftar.length) return;
  var kolom = kolomDari(nama), sh = sheet(nama);
  var nilai = daftar.map(function (o) { return barisDari(nama, o); });
  sh.getRange(sh.getLastRow() + 1, 1, nilai.length, kolom.length).setValues(nilai);
}

/** Perbarui kolom tertentu pada baris objek (hasil semua/cari). */
function ubah(nama, obj, perubahan) {
  var kolom = kolomDari(nama), sh = sheet(nama), ks = Object.keys(perubahan);
  ks.forEach(function (k) { if (kolom.indexOf(k) < 0) throw new Error("Kolom tidak ada: " + nama + "." + k); });
  if (ks.length > 3) {
    // Banyak kolom: tulis satu baris utuh sekaligus (lebih cepat).
    ks.forEach(function (k) { obj[k] = perubahan[k]; });
    sh.getRange(obj._baris, 1, 1, kolom.length).setValues([barisDari(nama, obj)]);
    return;
  }
  ks.forEach(function (k) {
    sh.getRange(obj._baris, kolom.indexOf(k) + 1).setValue(amankan(perubahan[k]));
    obj[k] = perubahan[k];
  });
}

function hapusBaris(nama, obj) { sheet(nama).deleteRow(obj._baris); }

function kunciTulis(fn) {
  var kunci = LockService.getScriptLock();
  kunci.waitLock(20000);
  try { return fn(); } finally { kunci.releaseLock(); }
}

function catat(userId, aksi, detail) {
  try { tambah("Log", { waktu: new Date(), userId: userId || "", aksi: aksi, detail: detail ? JSON.stringify(detail).slice(0, 2000) : "" }); }
  catch (e) { console.error("Gagal mencatat log", e); }
}

function pengaturan(kunci, bawaan) {
  var r = cari("Pengaturan", function (x) { return x.kunci === kunci; });
  return r ? r.nilai : bawaan;
}

/** Buat sheet yang belum ada dan tambahkan kolom baru di akhir. Tidak pernah menghapus atau mengubah urutan kolom. */
function bentukSheet(ss, nama) {
  var kolom = kolomDari(nama), sh = ss.getSheetByName(nama);
  if (!sh) {
    sh = ss.insertSheet(nama);
    sh.getRange(1, 1, 1, kolom.length).setValues([kolom]).setFontWeight("bold").setBackground("#e6eef6");
    sh.setFrozenRows(1);
    return;
  }
  var lebar = Math.max(sh.getLastColumn(), 1), ada = sh.getRange(1, 1, 1, lebar).getValues()[0].filter(String);
  ada.forEach(function (k, j) {
    if (kolom[j] !== k) throw new Error("Urutan kolom " + nama + " tidak cocok di kolom " + (j + 1) + ": " + k + " ≠ " + kolom[j]);
  });
  if (ada.length < kolom.length) {
    var baru = kolom.slice(ada.length);
    if (sh.getMaxColumns() < kolom.length) sh.insertColumnsAfter(sh.getMaxColumns(), kolom.length - sh.getMaxColumns());
    sh.getRange(1, ada.length + 1, 1, baru.length).setValues([baru]).setFontWeight("bold").setBackground("#e6eef6");
  }
}

/**
 * Dipanggil di awal setiap permintaan. Bila struktur data di server lebih baru daripada spreadsheet,
 * spreadsheet dicadangkan dulu, lalu sheet/kolom baru ditambahkan.
 */
function pastikanSkema() {
  var k = konfig();
  if (!k.getProperty("SPREADSHEET_ID")) return;
  if (Number(k.getProperty("SKEMA_VERSI") || 1) >= VERSI_SKEMA) return;
  kunciTulis(function () {
    var dari = Number(k.getProperty("SKEMA_VERSI") || 1);
    if (dari >= VERSI_SKEMA) return;
    cadangkan("sebelum v" + VERSI_SERVER + " (struktur data " + dari + " → " + VERSI_SKEMA + ")");
    var ss = buku();
    daftarTabel().forEach(function (nama) { bentukSheet(ss, nama); });
    migrasiData(dari);
    k.setProperty("SKEMA_VERSI", String(VERSI_SKEMA));
    catat("", "skema.perbarui", { dari: dari, ke: VERSI_SKEMA, versiServer: VERSI_SERVER });
  });
}

/** Pengisian data untuk kolom baru. */
function migrasiData(dari) {
  if (dari < 4) {
    var ada4 = semua("Pengaturan").map(function (x) { return x.kunci; });
    if (ada4.indexOf("hariLibur") < 0) tambah("Pengaturan", { kunci: "hariLibur", nilai: "2026-12-25, 2027-01-01",
      keterangan: "Hari libur & cuti bersama (YYYY-MM-DD, pisahkan koma). Sabtu–Minggu otomatis tidak dihitung. Lengkapi sesuai SKB libur nasional." });
    if (ada4.indexOf("batasHariKerja") < 0) tambah("Pengaturan", { kunci: "batasHariKerja", nilai: 5, keterangan: "Batas pelengkapan bukti setelah kegiatan selesai" });
  }
  if (dari < 3) {
    // Pengaturan tujuan surat (bisa diubah di sheet Pengaturan).
    var ada = semua("Pengaturan").map(function (x) { return x.kunci; });
    [{ kunci: "tujuanDosen", nilai: "Kepala Bagian Administrasi Umum", keterangan: "Tujuan surat penugasan dosen/tendik" },
     { kunci: "tujuanMhs", nilai: "Kabag. Administrasi Akademik, Kemahasiswaan dan Kerjasama", keterangan: "Tujuan surat tugas mahasiswa" }]
      .forEach(function (x) { if (ada.indexOf(x.kunci) < 0) tambah("Pengaturan", x); });
  }
  if (dari < 2 && modeUji()) {
    // Akun contoh Uji Coba: tahun masuk dan kelas dari pola NIM contoh (yy 0 kelas nn), misalnya 250103 = 2025 kelas A.
    semua("Pengguna").forEach(function (p) {
      if (peranDari(p).indexOf("mahasiswa") < 0 || p.masuk) return;
      var m = /^(\d{2})0([12])\d{2}$/.exec(String(p.username));
      if (m) ubah("Pengguna", p, { masuk: 2000 + Number(m[1]), kelas: m[2] === "1" ? "A" : "B", statusMhs: "A" });
      else ubah("Pengguna", p, { statusMhs: "A" });
    });
  }
}

/* ---------- Cadangan ---------- */

function folderCadangan() {
  var induk = DriveApp.getFolderById(konfig().getProperty("FOLDER_ID"));
  var it = induk.getFoldersByName("Cadangan");
  return it.hasNext() ? it.next() : induk.createFolder("Cadangan");
}

/** Salin spreadsheet + daftar semua file Drive aplikasi ke folder Cadangan. */
function cadangkan(label) {
  var waktu = Utilities.formatDate(new Date(), "Asia/Makassar", "yyyy-MM-dd HH.mm");
  var nama = "Cadangan / " + label + " / " + waktu, tujuan = folderCadangan();
  var salinan = DriveApp.getFileById(konfig().getProperty("SPREADSHEET_ID")).makeCopy(nama, tujuan);
  var baris = [["Folder", "Nama file", "ID", "Ukuran (byte)", "Diubah"]];
  (function telusuri(f, jalur) {
    if (f.getId() === tujuan.getId()) return;
    var fs = f.getFiles();
    while (fs.hasNext()) { var x = fs.next(); baris.push([jalur, x.getName(), x.getId(), x.getSize(), x.getLastUpdated().toISOString()]); }
    var ds = f.getFolders();
    while (ds.hasNext()) { var d = ds.next(); telusuri(d, jalur + "/" + d.getName()); }
  })(DriveApp.getFolderById(konfig().getProperty("FOLDER_ID")), "");
  var csv = baris.map(function (r) { return r.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(","); }).join("\n");
  tujuan.createFile(nama + " — daftar file Drive.csv", csv, MimeType.CSV);
  return { nama: nama, url: salinan.getUrl(), jumlahFile: baris.length - 1 };
}
