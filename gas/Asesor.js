/**
 * Akun asesor (v0.9.0): baca saja dan berkedaluwarsa.
 * - Dibuat Super Admin; langsung aktif (tanpa aktivasi email), kata sandi sementara ditampilkan sekali dan wajib diganti saat masuk.
 * - Masa berlaku maksimal 90 hari (kolom berlakuSampai, yyyy-mm-dd). Setelah lewat, masuk dan sesi lama ditolak.
 * - Asesor hanya melihat: Tabel iLKPS, kegiatan berstatus data "disetujui" beserta bukti dan suratnya. Tidak ada biodata atau draf.
 * - Setiap akses asesor dicatat di Log (aksi "asesor.*") dan ditampilkan ke Super Admin.
 */
var ASESOR_MAKS_HARI = 90;

function hanyaAsesor(p) { var r = peranDari(p); return r.length === 1 && r[0] === "asesor"; }
function asesorKedaluwarsa(p) {
  if (!hanyaAsesor(p)) return false;
  var b = teksTgl(p.berlakuSampai);
  return !tanggalSah(b) || hariIni() > b;
}
function pesanAsesorBerakhir(p) { return galat("Masa akses asesor sudah berakhir (" + teksTgl(p.berlakuSampai) + "). Hubungi Prodi UPW bila masih memerlukan akses."); }
/** Asesor boleh melihat kegiatan ini? (hanya data yang sudah disetujui) */
function asesorBolehLihat(p, k) { return punyaPeran(p, ["asesor"]) && k.status === "disetujui"; }
function catatAsesor(p, aksi, detail) { if (punyaPeran(p, ["asesor"]) && !punyaPeran(p, PERAN_KEGIATAN)) catat(p.id, "asesor." + aksi, detail); }
function tambahHari(n) { var d = new Date(Date.now() + n * 864e5); return Utilities.formatDate(d, "Asia/Makassar", "yyyy-MM-dd"); }
function periksaBerlaku(s) {
  s = teks(s);
  if (!tanggalSah(s)) throw galat("Isi tanggal berlaku sampai (format YYYY-MM-DD).");
  if (s < hariIni()) throw galat("Tanggal berlaku tidak boleh sebelum hari ini.");
  if (s > tambahHari(ASESOR_MAKS_HARI)) throw galat("Masa akses asesor maksimal " + ASESOR_MAKS_HARI + " hari (sampai " + tambahHari(ASESOR_MAKS_HARI) + ").");
  return s;
}
/** Nama depan tanpa gelar, huruf kecil, untuk nama pengguna (mis. "Prof. Dr. Ni Made Ayu" → "made"). */
function slug(s) {
  var x = teks(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z.\s]+/g, " ").trim();
  while (/^(dr|prof|drs|dra|ir|hj?)\.?\s+/.test(x)) x = x.replace(/^(dr|prof|drs|dra|ir|hj?)\.?\s+/, "");
  var kata = x.replace(/[^a-z]+/g, " ").trim().split(" ").filter(String);
  return kata.filter(function (k) { return k.length >= 3; })[0] || kata[0] || "asesor"; // lewati "I", "Ni" pada nama Bali
}

function asesorKeKlien(x, jumlahAkses) {
  return { id: x.id, username: String(x.username), nama: x.nama, instansi: teks(x.instansi), berlakuSampai: teksTgl(x.berlakuSampai), status: x.status,
    kedaluwarsa: asesorKedaluwarsa(x), wajibGanti: x.wajibGanti === true || x.wajibGanti === "TRUE",
    masukTerakhir: x.masukTerakhir ? new Date(x.masukTerakhir).toISOString() : "", akses: jumlahAkses || 0 };
}

function aksiAsesorDaftar(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["superadmin"]);
  var as = semua("Pengguna").filter(hanyaAsesor), ids = {}, hit = {};
  as.forEach(function (x) { ids[x.id] = x; });
  var log = semua("Log").filter(function (l) { return ids[l.userId] && /^(asesor\.|masuk)/.test(l.aksi); });
  log.forEach(function (l) { if (/^asesor\./.test(l.aksi)) hit[l.userId] = (hit[l.userId] || 0) + 1; });
  return {
    asesor: as.map(function (x) { return asesorKeKlien(x, hit[x.id]); }),
    log: log.slice(-150).reverse().map(function (l) { return { waktu: new Date(l.waktu).toISOString(), nama: ids[l.userId].nama, aksi: l.aksi, detail: teks(l.detail) }; }),
    maksHari: ASESOR_MAKS_HARI, bawaanSampai: tambahHari(30)
  };
}

function aksiAsesorBuat(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["superadmin"]);
  var nama = potong(d.nama, 150).trim(), instansi = potong(d.instansi, 150).trim(), sampai = periksaBerlaku(d.berlakuSampai);
  if (!nama) throw galat("Isi nama asesor.");
  return kunciTulis(function () {
    var ada = {}; semua("Pengguna").forEach(function (x) { ada[normalUser(x.username)] = 1; });
    var dasar = "asesor-" + slug(nama).slice(0, 14), u;
    do { u = dasar + "-" + (10 + Math.floor(Math.random() * 90)); } while (ada[u]);
    var sementara = "Asr-" + acak(6) + Math.floor(10 + Math.random() * 89), garam = acak(24), kini = new Date();
    tambah("Pengguna", { id: "u" + acak(10), username: u, nama: nama, email: "", peran: "asesor", status: "aktif", hash: hashSandi(sementara, garam), garam: garam,
      wajibGanti: true, emailTerverifikasi: false, gagal: 0, kunciSampai: "", ref: u, dosenId: "", diimporPada: kini, aktivasiPada: kini,
      masukTerakhir: "", diubahPada: kini, berlakuSampai: sampai, instansi: instansi });
    catat(p.id, "asesor.buat", { username: u, sampai: sampai });
    return { username: u, sandiSementara: sementara, berlakuSampai: sampai };
  });
}

/** Perpanjang/perpendek masa akses, atau nonaktifkan/aktifkan kembali. */
function aksiAsesorUbah(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["superadmin"]);
  var t = cari("Pengguna", function (x) { return x.id === d.userId; });
  if (!t || !hanyaAsesor(t)) throw galat("Akun asesor tidak ditemukan.");
  var ubahan = { diubahPada: new Date() };
  if (d.berlakuSampai !== undefined) ubahan.berlakuSampai = periksaBerlaku(d.berlakuSampai);
  if (d.aktif !== undefined) ubahan.status = d.aktif ? "aktif" : "nonaktif";
  kunciTulis(function () { ubah("Pengguna", t, ubahan); });
  if (ubahan.status === "nonaktif") hapusSemuaSesi(t.id);
  catat(p.id, "asesor.ubah", { untuk: t.id, sampai: ubahan.berlakuSampai || "", status: ubahan.status || "" });
  return {};
}

/** Daftar kegiatan yang datanya sudah disetujui (untuk asesor dan pengelola). */
function aksiKegiatanDisetujui(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["asesor", "superadmin", "admin", "kps"]);
  var idx = indeksOrang(), set = pengaturanSurat();
  var l = semuaKegiatan().filter(function (k) { return k.status === "disetujui"; });
  l.sort(function (a, b) { return (b.tgl || "").localeCompare(a.tgl || ""); });
  catatAsesor(p, "daftarKegiatan", { n: l.length });
  return { kegiatan: l.map(function (k) { var o = kegiatanKeKlien(k, p, idx, false, set); o.olehNama = o.olehNama; return o; }) };
}
