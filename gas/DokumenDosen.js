/**
 * Dokumen pendukung biodata dosen dan pengingat (v0.19.0).
 * - Kelengkapan: ijazah untuk setiap jenjang yang diisi di biodata, sertifikat pendidik bila nomor Serdos diisi,
 *   dan minimal satu sertifikat kompetensi/profesi bila kolom sertifikat diisi. Semuanya OPSIONAL (tidak menghalangi apa pun),
 *   tetapi muncul sebagai pengingat di Beranda.
 * - Pengingat: Admin Prodi / Super Admin / KPS dapat mengirim pengingat di aplikasi ke dosen/tendik (tanpa email).
 *   Tabel Pengingat { id, untuk, dari, pesan, jenis, dibuat, selesai }.
 */
var PERAN_PENGINGAT = ["admin", "superadmin", "kps"];

function kelengkapanDokDosen(bio, dok) {
  var ada = function (j) { return dok.some(function (x) { return x.jenis === j; }); }, butuh = [];
  if (teks(bio.pendS1)) butuh.push({ jenis: "Ijazah D4/S1", ada: ada("Ijazah D4/S1") });
  if (teks(bio.pendS2)) butuh.push({ jenis: "Ijazah S2", ada: ada("Ijazah S2") });
  if (teks(bio.pendS3)) butuh.push({ jenis: "Ijazah S3", ada: ada("Ijazah S3") });
  if (teks(bio.serdos)) butuh.push({ jenis: "Sertifikat pendidik (Serdos)", ada: ada("Sertifikat pendidik (Serdos)") });
  if (teks(bio.sertKomp)) butuh.push({ jenis: "Sertifikat kompetensi / profesi", ada: ada("Sertifikat kompetensi (BNSP/LSP)") || ada("Sertifikat profesi") });
  return butuh;
}
function dokBiodataSaya(p) {
  if (!punyaPeran(p, ["dosen"])) return [];
  var b = ambilBaris("pegawai", p.id) || {};
  return kelengkapanDokDosen(b, dokumenSaya(p.id)).filter(function (x) { return !x.ada; }).map(function (x) { return x.jenis; });
}
/** Dokumen pendukung milik sendiri (untuk halaman Biodata). */
function aksiDokBiodata(d, token) {
  var p = penggunaDariToken(token);
  if (p.status !== "aktif") throw galat("Selesaikan aktivasi akun terlebih dahulu.");
  if (!punyaPeran(p, ["dosen", "tendik"])) throw galat("Anda tidak memiliki izin untuk tindakan ini.");
  var dok = dokumenSaya(p.id).filter(function (x) { return JENIS_DOK_BIODATA.indexOf(x.jenis) >= 0; });
  var b = ambilBaris("pegawai", p.id) || {};
  return { dokumen: dok.map(dokumenKeKlien), butuh: punyaPeran(p, ["dosen"]) ? kelengkapanDokDosen(b, dok) : [], jenis: JENIS_DOK_BIODATA };
}
/** Kelengkapan dokumen semua dosen (Data Prodi › Dokumen dosen). */
function aksiDpDokDosen(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_PENGINGAT);
  var bio = {}; semua("BiodataPegawai").forEach(function (b) { bio[b.userId] = b; });
  var dok = {}; semua("DokumenPribadi").filter(function (r) { return !r.dihapus; }).forEach(function (r) { (dok[r.userId] = dok[r.userId] || []).push(dokumenDari(r)); });
  var ping = {}; semua("Pengingat").filter(function (r) { return !r.selesai && r.jenis === "dokumen"; }).forEach(function (r) { ping[r.untuk] = r.dibuat ? new Date(r.dibuat).toISOString() : ""; });
  return { dosen: daftarDosen().map(function (x) {
    var k = kelengkapanDokDosen(bio[x.id] || {}, dok[x.id] || []);
    return { id: x.id, nama: x.nama, inisial: x.inisial, butuh: k, kurang: k.filter(function (y) { return !y.ada; }).length, diingatkan: ping[x.id] || "" };
  }) };
}
function aksiPengingatKirim(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_PENGINGAT);
  var untuk = (Array.isArray(d.untuk) ? d.untuk : []).map(String), pesan = potong(d.pesan, 500).trim();
  if (!untuk.length) throw galat("Pilih penerima pengingat.");
  if (untuk.length > 200) throw galat("Maksimal 200 penerima sekali kirim.");
  if (pesan.length < 5) throw galat("Tulis pesan pengingat.");
  var idx = indeksOrang();
  untuk.forEach(function (id) { if (!idx.byId[id] || idx.byId[id].jenis === "mahasiswa") throw galat("Penerima harus dosen/tendik yang terdaftar."); });
  return kunciTulis(function () {
    var kini = new Date();
    tambahBanyak("Pengingat", untuk.map(function (id) { return { id: "pg" + acak(8), untuk: id, dari: p.id, pesan: pesan, jenis: teks(d.jenis) || "dokumen", dibuat: kini, selesai: "" }; }));
    catat(p.id, "pengingat.kirim", { jumlah: untuk.length, jenis: teks(d.jenis) || "dokumen" });
    return { terkirim: untuk.length };
  });
}
function pengingatSaya(p) {
  var idx = indeksOrang();
  return semua("Pengingat").filter(function (r) { return r.untuk === p.id && !r.selesai; }).map(function (r) {
    var o = idx.byId[r.dari]; return { id: r.id, pesan: teks(r.pesan), jenis: teks(r.jenis), dari: o ? o.nama : "Prodi", dibuat: r.dibuat ? new Date(r.dibuat).toISOString() : "" };
  });
}
function aksiPengingatSelesai(d, token) {
  var p = penggunaDariToken(token);
  return kunciTulis(function () {
    var r = cari("Pengingat", function (x) { return x.id === teks(d.id) && x.untuk === p.id; });
    if (!r) throw galat("Pengingat tidak ditemukan.");
    ubah("Pengingat", r, { selesai: new Date() });
    return { pengingat: pengingatSaya(p) };
  });
}
