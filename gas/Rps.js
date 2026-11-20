/**
 * RPS (v0.42.0): templat RPS terisi data aplikasi, hasil baca RPS Word yang diunggah, dan otorisasi RPS.
 * - Tabel RpsData: satu baris per unggahan RPS berformat Word yang terbaca (semester, kodeMk, kunci = kelas yang memakai RPS itu dipisah koma,
 *   fileId, data = JSON hasil baca docs/uji/rps.js, oleh, diubah). RPS terakhir sebuah MK dipakai untuk mengisi templat semester berikutnya
 *   (RPS ditinjau berkala, butir 8) dan untuk centang CPL Tabel 4.
 * - Pengaturan "rpsOtorisasi" (JSON): {labor, kajurJabatan, kajurNama, kajurNip, kpsJabatan, kpsNama, kpsNip}; KPS kosong = akun berperan KPS.
 * Membaca isi Word dilakukan di browser (tanpa AI; dibaca dari judul tabel dan kolom), server menyimpan dan memeriksa ukurannya saja.
 */
var PERAN_RPS_ATUR = ["admin", "superadmin"];
var RPS_DATA_MAKS = 48000;
var RPS_OTOR_KOLOM = ["labor", "kajurJabatan", "kajurNama", "kajurNip", "kpsJabatan", "kpsNama", "kpsNip"];

function rpsOtorisasi() {
  var o = jsonPengaturan("rpsOtorisasi", {}), h = {};
  RPS_OTOR_KOLOM.forEach(function (k) { h[k] = teks(o[k] || ""); });
  if (!h.labor) h.labor = "Travel Agencies dan Tour Operation";
  if (!h.kajurJabatan) h.kajurJabatan = "Ketua Jurusan Kepariwisataan";
  if (!h.kpsJabatan) h.kpsJabatan = "Koordinator Program Studi";
  if (!h.kpsNama) { var k = pengaturanSurat().kps; if (k) { h.kpsNama = k.nama; h.kpsNip = k.nip; h.kpsDariAkun = true; } }
  return h;
}
/** Simpan otorisasi RPS (Admin Prodi / Super Admin). Tanpa d.simpan → hanya baca. */
function aksiRpsOtorisasi(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_RPS_ATUR.concat(["kps", "gkm"]));
  if (d.simpan) {
    wajibPeran(p, PERAN_RPS_ATUR);
    var o = {};
    RPS_OTOR_KOLOM.forEach(function (k) { o[k] = potong(d[k], 120).trim(); });
    if (o.kajurNip && !/^[\d ]{8,30}$/.test(o.kajurNip)) throw galat("NIP Ketua Jurusan hanya berisi angka.");
    if (o.kpsNip && !/^[\d ]{8,30}$/.test(o.kpsNip)) throw galat("NIP Koordinator Program Studi hanya berisi angka.");
    kunciTulis(function () { simpanPengaturan("rpsOtorisasi", o, "Otorisasi dan identitas templat RPS (JSON)"); });
    catat(p.id, "rps.otorisasi", { kajur: o.kajurNama ? 1 : 0, kps: o.kpsNama ? 1 : 0 });
  }
  return { otorisasi: rpsOtorisasi(), boleh: punyaPeran(p, PERAN_RPS_ATUR) };
}

function rpsDataDari(r) {
  return { semester: String(r.semester), kodeMk: teks(r.kodeMk), kunci: teks(r.kunci).split(",").filter(String), fileId: teks(r.fileId),
    data: jsonDari(r.data, null), oleh: teks(r.oleh), diubah: r.diubah instanceof Date ? r.diubah.toISOString() : teks(r.diubah) };
}
function semuaRpsData() { return semua("RpsData").map(rpsDataDari).filter(function (x) { return x.data; }); }
/** RPS terbaca terakhir per kode MK (opsional: hanya sampai semester tertentu). */
function rpsTerakhirPerMk(sampaiSmt) {
  var h = {};
  semuaRpsData().forEach(function (x) {
    if (sampaiSmt && urutSmt(x.semester) > urutSmt(sampaiSmt)) return;
    var a = h[x.kodeMk];
    if (!a || urutSmt(x.semester) > urutSmt(a.semester) || (x.semester === a.semester && x.diubah > a.diubah)) h[x.kodeMk] = x;
  });
  return h;
}
/** Unsur CPL (S/KU/P/KK) yang dibebankan pada RPS (dari kode rujukan CPL prodi). */
function unsurCplRps(data) {
  var u = {};
  ((data && data.cpl) || []).forEach(function (c) { var m = String(c.ref || c.kode || "").toUpperCase().match(/^(KU|KK|S|P)\d+/); if (m) u[m[1]] = true; });
  return u;
}
/** Bersihkan hasil baca dari tampilan sebelum disimpan (batas ukuran, hanya bidang yang dikenal). */
function bersihRpsData(s) {
  if (!s) return null;
  var o = typeof s === "string" ? jsonDari(s, null) : s;
  if (!o || typeof o !== "object" || !Array.isArray(o.pertemuan)) return null;
  var t = JSON.stringify(o);
  if (t.length > RPS_DATA_MAKS) throw galat("Isi RPS terlalu panjang untuk dibaca otomatis (lebih dari " + RPS_DATA_MAKS + " huruf). File tetap bisa diunggah sebagai PDF.");
  return t;
}
/** Dipanggil aksiMkpUnggah setelah RPS tersimpan. */
function simpanRpsData(smt, kode, kunci, fileId, dataJson, p) {
  if (!dataJson) return;
  kunciTulis(function () {
    tambah("RpsData", { semester: smt, kodeMk: kode, kunci: kunci.join(","), fileId: fileId || "", data: dataJson, oleh: p.id, diubah: new Date() });
  });
}
/** Hasil baca untuk entri RPS (dicocokkan dengan fileId). */
function petaRpsFile() {
  var m = {};
  semuaRpsData().forEach(function (x) { if (x.fileId) m[x.fileId] = x; });
  return m;
}

/** Bahan templat RPS terisi: data MK, tim kelas (nama + NIP), otorisasi, CPL prodi, RPS terakhir MK ini. */
function aksiMkpRpsRef(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_MKP_REKAP.concat(["dosen"]));
  var smt = semesterSah(d.semester), kode = teks(d.kode), x = ambilMkp(smt, kode, p, false), u = unitSasaran(x, d, p, null, false);
  var idx = indeksOrang(), prak = petaPraktisi();
  var tim = u.ang.map(function (a, i) {
    if (a.t === "p") { var q = prak[a.id]; return { nama: q ? q.nama : "(praktisi)", nip: "", praktisi: true, utama: false }; }
    var o = idx.byId[a.id]; return { nama: o ? o.nama : "(dosen)", nip: o ? String(o.username) : "", utama: i === 0 };
  });
  var akhir = rpsTerakhirPerMk()[kode];
  var m = x.mk, g = u.g ? (m.kelompok || []).filter(function (y) { return y.n.toUpperCase() === u.g; })[0] : null;
  return { semester: smt, labelSemester: labelSmt(smt), kunci: u.k, labelKelas: labelUnit(x, u),
    mk: { kode: g && g.kode ? g.kode : m.kode, nama: m.nama + (g ? " (" + g.n + ")" : ""), semester: m.semester, sksKuliah: m.sksKuliah, sksSeminar: m.sksSeminar, sksPraktik: m.sksPraktik, sks: sksMk(m) },
    tim: tim, otorisasi: rpsOtorisasi(), cplProdi: CPL_PRODI, unsurCpl: UNSUR_CPL,
    terakhir: akhir ? { semester: akhir.semester, labelSemester: labelSmt(akhir.semester), data: akhir.data } : null };
}
