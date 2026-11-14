/**
 * Masukan dan saran pengguna (v0.23.0): laporan masalah, permintaan fitur, pertanyaan.
 * Disimpan di sheet "Masukan" (bisa dibuka langsung di Google Sheets) dan lampiran tangkapan layar di Drive folder "Masukan".
 * Semua akun aktif boleh mengirim dan melihat miliknya; Super Admin dan Admin Prodi melihat semua, memberi status dan tanggapan.
 */
var JENIS_MASUKAN = ["Masalah / error", "Permintaan fitur baru", "Saran perbaikan", "Pertanyaan", "Lainnya"];
var STATUS_MASUKAN = { baru: "Baru", ditinjau: "Sedang ditinjau", direncanakan: "Direncanakan", selesai: "Selesai", ditolak: "Tidak dilanjutkan" };
var PERAN_MASUKAN_KELOLA = ["superadmin", "admin"];
var MASUKAN_MAKS_HARI = 20, LAMPIRAN_MASUKAN_MAKS = 5 * 1024 * 1024;

function masukanDari(r, idx) {
  var o = idx.byId[r.userId] || {}, t = idx.byId[r.olehTanggapan] || {}, l = jsonDari(r.lampiran, null);
  return { id: r.id, waktu: r.waktu ? new Date(r.waktu).toISOString() : "", userId: r.userId, nama: o.nama || "", username: o.username || "", peran: teks(r.peran),
    jenis: teks(r.jenis), menu: teks(r.menu), judul: teks(r.judul), isi: teks(r.isi), lampiran: l ? { nama: l.nama, ukuran: l.ukuran } : null,
    versi: teks(r.versi), perangkat: teks(r.perangkat), status: teks(r.status) || "baru", tanggapan: teks(r.tanggapan), olehTanggapan: t.nama || "",
    waktuTanggapan: r.waktuTanggapan ? new Date(r.waktuTanggapan).toISOString() : "" };
}
function wajibAktif(p) {
  if (p.status !== "aktif") throw galat("Selesaikan aktivasi akun terlebih dahulu.");
}
function aksiMasukanKirim(d, token) {
  var p = penggunaDariToken(token);
  wajibAktif(p);
  var jenis = teks(d.jenis), judul = potong(d.judul, 150).trim(), isi = potong(d.isi, 3000).trim();
  if (JENIS_MASUKAN.indexOf(jenis) < 0) throw galat("Pilih jenis masukan.");
  if (judul.length < 5) throw galat("Tulis judul singkat (minimal 5 huruf), misalnya: Tombol unggah bukti tidak bereaksi.");
  if (isi.length < 10) throw galat("Ceritakan lebih rinci (minimal 10 huruf): apa yang Anda lakukan, apa yang terjadi, dan apa yang diharapkan.");
  var hariIniStr = hariIni();
  var hitung = semua("Masukan").filter(function (r) { return r.userId === p.id && r.waktu && Utilities.formatDate(new Date(r.waktu), "Asia/Makassar", "yyyy-MM-dd") === hariIniStr; }).length;
  if (hitung >= MASUKAN_MAKS_HARI) throw galat("Batas " + MASUKAN_MAKS_HARI + " masukan per hari tercapai. Lanjutkan besok, atau gabungkan beberapa hal dalam satu masukan.");
  var lampiran = null, file = null;
  if (d.lampiran && d.lampiran.isi) {
    var nama = namaAman(d.lampiran.nama), eks = (nama.split(".").pop() || "").toLowerCase(), mime = BUKTI_EKS[eks];
    if (["png", "jpg", "jpeg", "webp", "pdf"].indexOf(eks) < 0 || !mime) throw galat("Lampiran berupa gambar (PNG/JPG/WEBP) atau PDF.");
    var bytes = Utilities.base64Decode(teks(d.lampiran.isi));
    if (bytes.length > LAMPIRAN_MASUKAN_MAKS) throw galat("Lampiran maksimal 5 MB.");
    if (!isiSesuai(eks, bytes)) throw galat("Isi lampiran tidak sesuai dengan jenisnya (." + eks + ").");
    var induk = folderAnak(DriveApp.getFolderById(prop("FOLDER_ID")), "Masukan");
    file = induk.createFile(Utilities.newBlob(bytes, mime, Utilities.formatDate(new Date(), "Asia/Makassar", "yyyy-MM-dd HHmm") + " " + String(p.username) + " - " + nama));
    lampiran = { fileId: file.getId(), nama: nama, mime: mime, ukuran: bytes.length };
  }
  var o = { id: "ms" + acak(8), waktu: new Date(), userId: p.id, peran: potong(d.peran, 30) || peranDari(p)[0], jenis: jenis, menu: potong(d.menu, 80),
    judul: judul, isi: isi, lampiran: lampiran ? JSON.stringify(lampiran) : "", versi: potong(d.versi, 20), perangkat: potong(d.perangkat, 200),
    status: "baru", tanggapan: "", olehTanggapan: "", waktuTanggapan: "" };
  try { kunciTulis(function () { tambah("Masukan", o); }); }
  catch (e) { if (file) try { file.setTrashed(true); } catch (_) {} throw e; }
  catat(p.id, "masukan.kirim", { id: o.id, jenis: jenis });
  return { id: o.id, masukan: masukanSaya(p) };
}
function masukanSaya(p) {
  var idx = indeksOrang();
  return semua("Masukan").filter(function (r) { return r.userId === p.id; }).map(function (r) { return masukanDari(r, idx); })
    .sort(function (a, b) { return b.waktu.localeCompare(a.waktu); });
}
function aksiMasukanSaya(d, token) {
  var p = penggunaDariToken(token);
  wajibAktif(p);
  return { masukan: masukanSaya(p), jenis: JENIS_MASUKAN, status: STATUS_MASUKAN };
}
function aksiMasukanDaftar(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_MASUKAN_KELOLA);
  var idx = indeksOrang();
  return { masukan: semua("Masukan").map(function (r) { return masukanDari(r, idx); }).sort(function (a, b) { return b.waktu.localeCompare(a.waktu); }),
    jenis: JENIS_MASUKAN, status: STATUS_MASUKAN };
}
function aksiMasukanUbah(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_MASUKAN_KELOLA);
  var status = teks(d.status);
  if (!STATUS_MASUKAN[status]) throw galat("Status tidak dikenal.");
  return kunciTulis(function () {
    var r = cari("Masukan", function (x) { return x.id === teks(d.id); });
    if (!r) throw galat("Masukan tidak ditemukan.");
    var o = { status: status };
    if (d.tanggapan !== undefined) { o.tanggapan = potong(d.tanggapan, 2000).trim(); o.olehTanggapan = p.id; o.waktuTanggapan = new Date(); }
    ubah("Masukan", r, o);
    catat(p.id, "masukan.ubah", { id: r.id, status: status });
    return aksiMasukanDaftar({}, token);
  });
}
function aksiMasukanLampiran(d, token) {
  var p = penggunaDariToken(token);
  wajibAktif(p);
  var r = cari("Masukan", function (x) { return x.id === teks(d.id); });
  if (!r || (r.userId !== p.id && !punyaPeran(p, PERAN_MASUKAN_KELOLA))) throw galat("Masukan tidak ditemukan.");
  var l = jsonDari(r.lampiran, null); if (!l) throw galat("Masukan ini tanpa lampiran.");
  return { nama: l.nama, mime: l.mime, isi: Utilities.base64Encode(DriveApp.getFileById(l.fileId).getBlob().getBytes()) };
}
function jumlahMasukanBaru(p) {
  if (!punyaPeran(p, PERAN_MASUKAN_KELOLA)) return 0;
  return semua("Masukan").filter(function (r) { return (teks(r.status) || "baru") === "baru"; }).length;
}
