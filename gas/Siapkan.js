/**
 * Penyiapan pertama: membuat spreadsheet, folder Drive, rahasia server, dan akun awal.
 * Hanya bisa dijalankan SEKALI per proyek Apps Script (Uji Coba dan Produksi adalah proyek terpisah).
 */
var AKUN_CONTOH_UJI = [
  { username: "250103", nama: "Kadek Ayu Lestari (contoh)", peran: "mahasiswa", masuk: 2025, kelas: "A" },
  { username: "250107", nama: "Putu Wirawan (contoh)", peran: "mahasiswa", masuk: 2025, kelas: "A" },
  { username: "199001152015041001", nama: "Gede Arya Pratama, S.E., M.M. (contoh)", peran: "dosen,kalab", dosenId: "d3" },
  { username: "197911302005012001", nama: "Dr. Komang Sri Widiastuti, M.Par. (contoh)", peran: "dosen,kps", dosenId: "d4" },
  { username: "pppk-2021-0107", nama: "Luh Putu Sari Dewi, S.E. (contoh)", peran: "admin,tendik" },
  { username: "pppk-2023-0412", nama: "Wayan Suarta, A.Md.Par. (contoh)", peran: "laboran,tendik" }
];

function aksiSiapkan(d) {
  var k = konfig();
  if (k.getProperty("SPREADSHEET_ID")) throw galat("Server sudah disiapkan.");
  var env = d.lingkungan === "produksi" ? "produksi" : "uji";
  var label = env === "uji" ? " (Uji Coba)" : "";

  var induk = DriveApp.createFolder("Repositori UPW" + label);
  ["Bukti", "Surat", "Tanda Tangan", "Cadangan"].forEach(function (n) { induk.createFolder(n); });

  var ss = SpreadsheetApp.create("Repositori UPW — Data" + label);
  DriveApp.getFileById(ss.getId()).moveTo(induk);
  var awal = ss.getSheets()[0];
  daftarTabel().forEach(function (nama) { bentukSheet(ss, nama); });
  ss.deleteSheet(awal);

  k.setProperties({ SPREADSHEET_ID: ss.getId(), FOLDER_ID: induk.getId(), LINGKUNGAN: env, MERICA: acak(48), SKEMA_VERSI: String(VERSI_SKEMA) });

  tambahBanyak("Pengaturan", [
    { kunci: "unitKerja", nilai: "Prodi Usaha Perjalanan Wisata", keterangan: "Unit kerja pada surat" },
    { kunci: "tempatSurat", nilai: "Nusa Dua", keterangan: "Tempat pada tanggal surat" },
    { kunci: "sapaanDosen", nilai: "Bapak", keterangan: "Sapaan pejabat tujuan surat dosen/tendik" },
    { kunci: "batasHariKerja", nilai: 5, keterangan: "Batas pelengkapan bukti setelah kegiatan selesai" },
    { kunci: "tujuanDosen", nilai: "Kepala Bagian Administrasi Umum", keterangan: "Tujuan surat penugasan dosen/tendik" },
    { kunci: "tujuanMhs", nilai: "Kabag. Administrasi Akademik, Kemahasiswaan dan Kerjasama", keterangan: "Tujuan surat tugas mahasiswa" }
  ]);

  // Akun Super Admin awal: kata sandi sementara ditampilkan sekali, wajib diganti saat masuk pertama.
  var sandiAwal = "Upw-" + acak(8) + Math.floor(10 + Math.random() * 89), garam = acak(24), kini = new Date();
  var akun = [{ id: "u" + acak(10), username: env === "uji" ? "superadmin.uji" : "superadmin", nama: "Super Admin UPW", email: "",
    peran: "superadmin", status: "aktif", hash: hashSandi(sandiAwal, garam), garam: garam, wajibGanti: true,
    emailTerverifikasi: false, gagal: 0, kunciSampai: "", ref: "superadmin", dosenId: "", diimporPada: kini,
    aktivasiPada: kini, masukTerakhir: "", diubahPada: kini }];
  if (env === "uji") AKUN_CONTOH_UJI.forEach(function (a) {
    akun.push({ id: "u" + acak(10), username: a.username, nama: a.nama, email: "", peran: a.peran, status: "impor", hash: "", garam: "",
      wajibGanti: true, emailTerverifikasi: false, gagal: 0, kunciSampai: "", ref: a.username, dosenId: a.dosenId || "",
      diimporPada: kini, aktivasiPada: "", masukTerakhir: "", diubahPada: kini,
      masuk: a.masuk || "", kelas: a.kelas || "", statusMhs: a.masuk ? "A" : "" });
  });
  tambahBanyak("Pengguna", akun);
  catat("", "siapkan", { lingkungan: env });

  return { lingkungan: env, spreadsheet: ss.getUrl(), folder: induk.getUrl(), superadmin: akun[0].username, sandiAwal: sandiAwal,
    akunContoh: env === "uji" ? AKUN_CONTOH_UJI.length : 0 };
}
