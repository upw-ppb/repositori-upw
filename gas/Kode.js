/**
 * Repositori Akreditasi UPW — server (Google Apps Script).
 * Semua permintaan masuk lewat doPost dengan badan JSON: { aksi, token, data }.
 * Jawaban selalu JSON: { ok: true, ... } atau { ok: false, galat: "pesan untuk pengguna" }.
 */
var VERSI_SERVER = "0.4.0";

function doGet() {
  return jawab({ ok: true, layanan: "Repositori Akreditasi UPW", versi: VERSI_SERVER, lingkungan: lingkungan() });
}

function doPost(e) {
  var hasil;
  try {
    var badan = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    var aksi = String(badan.aksi || "");
    var fn = AKSI[aksi];
    if (!fn) throw galat("Aksi tidak dikenal: " + aksi);
    if (aksi !== "ping" && aksi !== "siapkan") pastikanSkema();
    hasil = fn(badan.data || {}, badan.token || "");
    if (!hasil || typeof hasil !== "object") hasil = {};
    hasil.ok = true;
  } catch (err) {
    var pesan = err && err.pengguna ? err.message : "Terjadi kesalahan pada server. Coba lagi beberapa saat lagi.";
    if (!(err && err.pengguna)) console.error(err && err.stack || err);
    hasil = { ok: false, galat: pesan };
  }
  return jawab(hasil);
}

function jawab(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Galat yang pesannya aman ditampilkan ke pengguna. */
function galat(pesan) { var e = new Error(pesan); e.pengguna = true; return e; }

var AKSI = {
  "ping": function () { return { versi: VERSI_SERVER, lingkungan: lingkungan(), waktu: new Date().toISOString() }; },
  "siapkan": aksiSiapkan,
  "masuk": aksiMasuk,
  "saya": aksiSaya,
  "keluar": aksiKeluar,
  "aktivasi.sandi": aksiAktivasiSandi,
  "aktivasi.kirimKode": aksiAktivasiKirimKode,
  "aktivasi.verifikasi": aksiAktivasiVerifikasi,
  "lupa.kirimKode": aksiLupaKirimKode,
  "lupa.reset": aksiLupaReset,
  "ganti.sandi": aksiGantiSandi,
  "admin.pengguna": aksiAdminPengguna,
  "admin.impor": aksiAdminImpor,
  "admin.resetSandi": aksiAdminResetSandi,
  "admin.peran": aksiAdminPeran,
  "admin.log": aksiAdminLog,
  "admin.ubahMhs": aksiAdminUbahMhs,
  "admin.cadangkan": aksiAdminCadangkan,
  "biodata.saya": aksiBiodataSaya,
  "biodata.simpan": aksiBiodataSimpan,
  "biodata.lihat": aksiBiodataLihat,
  "direktori": aksiDirektori,
  "kegiatan.ref": aksiKegiatanRef,
  "kegiatan.daftar": aksiKegiatanDaftar,
  "kegiatan.detail": aksiKegiatanDetail,
  "kegiatan.simpan": aksiKegiatanSimpan,
  "kegiatan.hapus": aksiKegiatanHapus,
  "kps.antrean": aksiKpsAntrean,
  "kps.putuskan": aksiKpsPutuskan,
  "surat.cek": aksiSuratCek,
  "bukti.unggah": aksiBuktiUnggah,
  "bukti.batal": aksiBuktiBatal,
  "bukti.lihat": aksiBuktiLihat,
  "kegiatan.akreditasi": aksiKegiatanAkreditasi,
  "kegiatan.ajukanData": aksiKegiatanAjukanData,
  "verifikasi.antrean": aksiVerifikasiAntrean,
  "verifikasi.putuskan": aksiVerifikasiPutuskan,
  "tugas.saya": aksiTugasSaya
};

/** Super Admin: cadangan manual spreadsheet + daftar file Drive. */
function aksiAdminCadangkan(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["superadmin"]);
  var label = String(d.label || "manual").replace(/[\\/]/g, "-").slice(0, 60);
  var h = cadangkan(label);
  catat(p.id, "admin.cadangkan", { nama: h.nama });
  return h;
}

/** Jalankan SEKALI dari editor Apps Script (tombol Run) untuk memberi izin Sheets, Drive, dan email. */
function izinkanServer() {
  SpreadsheetApp.getActive;
  DriveApp.getRootFolder();
  Logger.log("Izin diberikan. Sisa kuota email hari ini: " + MailApp.getRemainingDailyQuota());
}
