/**
 * Repositori Akreditasi UPW — server (Google Apps Script).
 * Semua permintaan masuk lewat doPost dengan badan JSON: { aksi, token, data }.
 * Jawaban selalu JSON: { ok: true, ... } atau { ok: false, galat: "pesan untuk pengguna" }.
 */
var VERSI_SERVER = "0.52.0";

function doGet() {
  return jawab({ ok: true, layanan: "Repositori Akreditasi UPW", versi: VERSI_SERVER, lingkungan: lingkungan() });
}

function doPost(e) {
  var hasil;
  try {
    bersihkanCache();
    var badan = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    var aksi = String(badan.aksi || "");
    hasil = aksi === "banyak" ? jalankanBanyak(badan) : jalankanSatu(aksi, badan.data || {}, badan.token || "");
  } catch (err) { hasil = jawabanGalat(err); }
  try { catatPerubahan(); } catch (e2) { console.error("versiData gagal diperbarui", e2); }
  return jawab(hasil);
}
function jawabanGalat(err) {
  var pesan = err && err.pengguna ? err.message : "Terjadi kesalahan pada server. Coba lagi beberapa saat lagi.";
  if (!(err && err.pengguna)) console.error(err && err.stack || err);
  return { ok: false, galat: pesan };
}
function jalankanSatu(aksi, data, token) {
  var fn = AKSI[aksi];
  if (!fn) throw galat("Aksi tidak dikenal: " + aksi);
  if (aksi !== "ping" && aksi !== "siapkan") pastikanSkema();
  if (aksi === "saya" || aksi === "masuk") rawatBilaPerlu();   // v0.49.0: perawatan harian (Perawatan.js)
  var h = fn(data, token);
  if (!h || typeof h !== "object") h = {};
  h.ok = true;
  return h;
}
/**
 * v0.49.0: beberapa permintaan dalam SATU panggilan (tampilan menggabungkan permintaan yang dikirim bersamaan). Mengurangi waktu tunggu dan
 * jumlah proses bersamaan (Apps Script membatasi ±30 proses bersamaan per akun pemilik). Setiap butir berhasil/gagal sendiri-sendiri.
 */
var TANPA_GABUNG = { banyak: 1, masuk: 1, siapkan: 1, keluar: 1 }, MAKS_GABUNG = 12;
function jalankanBanyak(badan) {
  var daftar = Array.isArray(badan.daftar) ? badan.daftar : [];
  if (!daftar.length || daftar.length > MAKS_GABUNG) throw galat("Permintaan gabungan tidak sah.");
  return { ok: true, hasil: daftar.map(function (x) {
    var a = String(x && x.aksi || "");
    if (TANPA_GABUNG[a]) return { ok: false, galat: "Aksi " + a + " tidak bisa digabung." };
    try { return jalankanSatu(a, (x && x.data) || {}, badan.token || ""); } catch (err) { return jawabanGalat(err); }
  }) };
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
  "admin.ubahNama": aksiAdminUbahNama,
  "admin.statusAkun": aksiAdminStatusAkun,
  "admin.hapusAkun": aksiAdminHapusAkun,
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
  "dp.praktisiBukti": aksiDpPraktisiBukti,
  "tl.daftar": aksiTlDaftar,
  "tl.simpan": aksiTlSimpan,
  "tl.status": aksiTlStatus,
  "tl.verifikasi": aksiTlVerifikasi,
  "tl.hapus": aksiTlHapus,
  "tl.bukti": aksiTlBukti,
  "rapat.ref": aksiRapatRef,
  "rapat.daftar": aksiRapatDaftar,
  "rapat.detail": aksiRapatDetail,
  "rapat.simpan": aksiRapatSimpan,
  "rapat.terbit": aksiRapatTerbit,
  "rapat.batal": aksiRapatBatal,
  "rapat.hapus": aksiRapatHapus,
  "rapat.jawab": aksiRapatJawab,
  "rapat.baca": aksiRapatBaca,
  "rapat.ttd": aksiRapatTtd,
  "rapat.risalahSimpan": aksiRapatRisalahSimpan,
  "rapat.risalahFinal": aksiRapatRisalahFinal,
  "rapat.berkas": aksiRapatBerkas,
  "rapat.berkasLihat": aksiRapatBerkasLihat,
  "dp.praktisiBuktiLihat": aksiDpPraktisiBuktiLihat,
  "dp.timSimpan": aksiDpTimSimpan,
  "dp.timImpor": aksiDpTimImpor,
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
  "survei.pengisi": aksiSurveiPengisi,
  "survei.ingatkan": aksiSurveiIngatkan,
  "survei.jadwal": aksiSurveiJadwal,
  "survei.siapkan": aksiSurveiSiapkan,
  "survei.kalender": aksiSurveiKalender,
  "survei.jadwalSelesai": aksiSurveiJadwalSelesai,
  "survei.edomAmbil": aksiSurveiEdomAmbil,
  "survei.edomJawab": aksiSurveiEdomJawab,
  "survei.edomHasil": aksiSurveiEdomHasil,
  "edom.saya": aksiEdomSaya,
  "mutu.usulan": aksiMutuUsulan,
  "mutu.daftar": aksiMutuDashboard,
  "mutu.baca": aksiMutuBaca,
  "pub.data": aksiPubData,
  "pub.simpan": aksiPubSimpan,
  "pub.tarik": aksiPubTarik,
  "survei.tracerTerapkan": aksiSurveiTracerTerapkan,
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
  "mkp.daftarZip": aksiMkpDaftarZip,
  "mkp.ambilZip": aksiMkpAmbilZip,
  "mkp.rpsRef": aksiMkpRpsRef,
  "mkp.rpsBaca": aksiMkpRpsBaca,
  "mkp.ttd": aksiMkpTtd,
  "mkp.saranInteg": aksiMkpSaranInteg,
  "mkp.nilaiUnggah": aksiMkpNilaiUnggah,
  "mkp.nilaiHapus": aksiMkpNilaiHapus,
  "rps.otorisasi": aksiRpsOtorisasi,
  "dp.cplMk": aksiDpCplMk,
  "dp.cplMkSimpan": aksiDpCplMkSimpan,
  "dp.cplMkImpor": aksiDpCplMkImpor,
  "admin.rawat": aksiAdminRawat,
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
  "sumber.pulihkan": aksiSumberPulihkan,
  "gkm.data": aksiGkmData,
  "gkm.simpan": aksiGkmSimpan,
  "gkm.unggah": aksiGkmUnggah,
  "gkm.hapusLampiran": aksiGkmHapusLampiran,
  "gkm.lampiran": aksiGkmLampiran,
  "gkm.putuskan": aksiGkmPutuskan,
  "gkm.batas": aksiGkmBatas,
  "kesiapan.data": aksiKesiapanData,
  "admin.statusMhs": aksiAdminStatusMhs,
  "admin.riwayatStatusMhs": aksiAdminRiwayatStatusMhs,
  "admin.buktiStatusMhs": aksiAdminBuktiStatusMhs,
  "admin.statusMhsKoreksi": aksiAdminStatusMhsKoreksi,
  "peserta.data": aksiPesertaData,
  "peserta.simpan": aksiPesertaSimpan,
  "peserta.bagi": aksiPesertaBagi,
  "mhs.mkSaya": aksiMhsMkSaya
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
