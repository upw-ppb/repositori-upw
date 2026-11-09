/**
 * Lapisan data sederhana di atas Google Sheets.
 * Setiap sheet = satu tabel; baris 1 = nama kolom.
 */
var SKEMA = {
  Pengguna: ["id", "username", "nama", "email", "peran", "status", "hash", "garam", "wajibGanti", "emailTerverifikasi",
             "gagal", "kunciSampai", "ref", "dosenId", "diimporPada", "aktivasiPada", "masukTerakhir", "diubahPada"],
  Sesi: ["tokenHash", "userId", "dibuat", "kedaluwarsa", "perangkat"],
  Kode: ["userId", "tujuan", "kodeHash", "email", "kedaluwarsa", "percobaan", "dipakai"],
  Log: ["waktu", "userId", "aksi", "detail"],
  Pengaturan: ["kunci", "nilai", "keterangan"]
};

function konfig() { return PropertiesService.getScriptProperties(); }
function lingkungan() { return konfig().getProperty("LINGKUNGAN") || "belum-disiapkan"; }
function modeUji() { return lingkungan() === "uji"; }

function buku() {
  var id = konfig().getProperty("SPREADSHEET_ID");
  if (!id) throw galat("Server belum disiapkan.");
  return SpreadsheetApp.openById(id);
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
  var kolom = SKEMA[nama], nilai = sh.getRange(2, 1, n - 1, kolom.length).getValues();
  return nilai.map(function (r, i) {
    var o = { _baris: i + 2 };
    kolom.forEach(function (k, j) { o[k] = r[j]; });
    return o;
  });
}

function cari(nama, fn) { var l = semua(nama); for (var i = 0; i < l.length; i++) if (fn(l[i])) return l[i]; return null; }

function tambah(nama, obj) {
  var kolom = SKEMA[nama];
  sheet(nama).appendRow(kolom.map(function (k) { return obj[k] === undefined ? "" : obj[k]; }));
}

function tambahBanyak(nama, daftar) {
  if (!daftar.length) return;
  var kolom = SKEMA[nama], sh = sheet(nama);
  var nilai = daftar.map(function (o) { return kolom.map(function (k) { return o[k] === undefined ? "" : o[k]; }); });
  sh.getRange(sh.getLastRow() + 1, 1, nilai.length, kolom.length).setValues(nilai);
}

/** Perbarui kolom tertentu pada baris objek (hasil semua/cari). */
function ubah(nama, obj, perubahan) {
  var kolom = SKEMA[nama], sh = sheet(nama);
  Object.keys(perubahan).forEach(function (k) {
    var j = kolom.indexOf(k);
    if (j < 0) throw new Error("Kolom tidak ada: " + nama + "." + k);
    sh.getRange(obj._baris, j + 1).setValue(perubahan[k]);
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
