/**
 * Repositori Akreditasi UPW — server (Google Apps Script).
 * Semua permintaan masuk lewat doPost dengan badan JSON: { aksi, token, data }.
 * Jawaban selalu JSON: { ok: true, ... } atau { ok: false, galat: "pesan untuk pengguna" }.
 */
var VERSI_SERVER = "0.24.0";

function doGet() {
  return jawab({ ok: true, layanan: "Repositori Akreditasi UPW", versi: VERSI_SERVER, lingkungan: lingkungan() });
}

function doPost(e) {
  var hasil;
  try {
    bersihkanCache();
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
  "aktivasi.tanpaEmail": aksiAktivasiTanpaEmail,
  "email.kirimKode": aksiEmailKirimKode,
  "email.verifikasi": aksiEmailVerifikasi,
  "admin.tanpaEmail": aksiAdminTanpaEmail,
  "admin.eksporAkun": aksiAdminEksporAkun,
  "impor.templat": aksiImporTemplat,
  "biodata.massal": aksiBiodataMassal,
  "dp.status": aksiDpStatus,
  "dp.statusSimpan": aksiDpStatusSimpan,
  "dp.statusHapus": aksiDpStatusHapus,
  "dok.biodata": aksiDokBiodata,
  "dp.dokDosen": aksiDpDokDosen,
  "pengingat.kirim": aksiPengingatKirim,
  "pengingat.selesai": aksiPengingatSelesai,
  "kps.riwayat": aksiKpsRiwayat,
  "masukan.kirim": aksiMasukanKirim,
  "masukan.saya": aksiMasukanSaya,
  "masukan.daftar": aksiMasukanDaftar,
  "masukan.ubah": aksiMasukanUbah,
  "masukan.lampiran": aksiMasukanLampiran,
  "admin.penandaTangan": aksiAdminPenandaTangan,
  "lab.data": aksiLabData,
  "lab.simpan": aksiLabSimpan,
  "lab.hapus": aksiLabHapus,
  "lab.log": aksiLabLog,
  "lab.logHapus": aksiLabLogHapus,
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
  "tugas.saya": aksiTugasSaya,
  "ttd.saya": aksiTtdSaya,
  "ttd.simpan": aksiTtdSimpan,
  "ttd.hapus": aksiTtdHapus,
  "surat.ttd": aksiSuratTtd,
  "portofolio.saya": aksiPortofolioSaya,
  "dok.simpan": aksiDokSimpan,
  "dok.hapus": aksiDokHapus,
  "dok.lihat": aksiDokLihat,
  "ilkps.data": aksiIlkpsData,
  "ilkps.ts": aksiIlkpsTs,
  "dp.data": aksiDpData,
  "dp.mkSimpan": aksiDpMkSimpan,
  "dp.mkHapus": aksiDpMkHapus,
  "dp.praktisiSimpan": aksiDpPraktisiSimpan,
  "dp.praktisiHapus": aksiDpPraktisiHapus,
  "dp.timSimpan": aksiDpTimSimpan,
  "dp.timSalin": aksiDpTimSalin,
  "dp.dosenTsSimpan": aksiDpDosenTsSimpan,
  "asesor.daftar": aksiAsesorDaftar,
  "asesor.buat": aksiAsesorBuat,
  "asesor.ubah": aksiAsesorUbah,
  "kegiatan.disetujui": aksiKegiatanDisetujui,
  "lul.data": aksiLulData,
  "lul.impor": aksiLulImpor,
  "lul.hapus": aksiLulHapus,
  "lul.pmbSimpan": aksiLulPmbSimpan,
  "lul.danaSimpan": aksiLulDanaSimpan,
  "survei.daftar": aksiSurveiDaftar,
  "survei.simpan": aksiSurveiSimpan,
  "survei.status": aksiSurveiStatus,
  "survei.tindakLanjut": aksiSurveiTindakLanjut,
  "survei.hasil": aksiSurveiHasil,
  "survei.saya": aksiSurveiSaya,
  "survei.ambil": aksiSurveiAmbil,
  "survei.jawab": aksiSurveiJawab,
  "survei.publik": aksiSurveiPublik,
  "survei.jawabPublik": aksiSurveiJawabPublik,
  "penilaian.data": aksiPenilaianData,
  "penilaian.skor": aksiPenilaianSkor,
  "penilaian.target": aksiPenilaianTarget,
  "ded.data": aksiDedData,
  "ded.simpan": aksiDedSimpan,
  "ded.identitas": aksiDedIdentitas,
  "mkp.saya": aksiMkpSaya,
  "mkp.rekap": aksiMkpRekap,
  "mkp.detail": aksiMkpDetail,
  "mkp.unggah": aksiMkpUnggah,
  "mkp.hapus": aksiMkpHapus,
  "mkp.metode": aksiMkpMetode,
  "mkp.integ": aksiMkpInteg,
  "mkp.lihat": aksiMkpLihat,
  "bank.data": aksiBankData,
  "bank.unggah": aksiBankUnggah,
  "bank.hapus": aksiBankHapus,
  "bank.atur": aksiBankAtur,
  "bank.lihat": aksiBankLihat,
  "foto.saya": aksiFotoSaya,
  "foto.simpan": aksiFotoSimpan,
  "foto.hapus": aksiFotoHapus,
  "foto.kecil": aksiFotoKecil,
  "sumber.butir": aksiSumberButir,
  "sumber.kegiatan": aksiSumberKegiatan,
  "sumber.tinjau": aksiSumberTinjau,
  "sumber.hapus": aksiSumberHapus,
  "sumber.pulihkan": aksiSumberPulihkan
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
