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
var RPS_OTOR_KOLOM = ["labor", "kajurJabatan", "kajurNama", "kajurNip", "kpsJabatan", "kpsNama", "kpsNip", /* v0.43.0 */ "skalaNilai", "hadirMin", /* v0.45.0 */ "tempat", "lms", "hariUmpan", "hariKeberatan", "telat", "pedoman"];

function rpsOtorisasi() {
  var o = jsonPengaturan("rpsOtorisasi", {}), h = {};
  RPS_OTOR_KOLOM.forEach(function (k) { h[k] = teks(o[k] || ""); });
  if (!h.labor) h.labor = "Travel Agencies dan Tour Operation";
  if (!h.kajurJabatan) h.kajurJabatan = "Ketua Jurusan Kepariwisataan";
  if (!h.kpsJabatan) h.kpsJabatan = "Koordinator Program Studi";
  h.skala = skalaNilai(h.skalaNilai);
  if (!h.tempat) h.tempat = pengaturanSurat().tempat;
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
    RPS_OTOR_KOLOM.forEach(function (k) { o[k] = potong(d[k], k === "skalaNilai" ? 600 : k === "telat" || k === "pedoman" ? 200 : 120).trim(); });
    ["hariUmpan", "hariKeberatan"].forEach(function (k) { if (o[k] && !/^\d{1,2}$/.test(o[k])) throw galat("Batas hari ditulis angka, mis. 7."); });
    if (o.skalaNilai && skalaNilai(o.skalaNilai).length < 2) throw galat("Skala nilai: tulis satu baris per huruf, mis. A; 4; 85–100.");
    if (o.hadirMin && !/^\d{1,3}$/.test(o.hadirMin)) throw galat("Kehadiran minimal ditulis angka persen, mis. 80.");
    if (o.kajurNip && !/^[\d ]{8,30}$/.test(o.kajurNip)) throw galat("NIP Ketua Jurusan hanya berisi angka.");
    if (o.kpsNip && !/^[\d ]{8,30}$/.test(o.kpsNip)) throw galat("NIP Koordinator Program Studi hanya berisi angka.");
    kunciTulis(function () { simpanPengaturan("rpsOtorisasi", o, "Otorisasi dan identitas templat RPS (JSON)"); });
    catat(p.id, "rps.otorisasi", { kajur: o.kajurNama ? 1 : 0, kps: o.kpsNama ? 1 : 0 });
  }
  return { otorisasi: rpsOtorisasi(), boleh: punyaPeran(p, PERAN_RPS_ATUR) };
}

/** Skala nilai dari teks "A; 4; 85–100" per baris → [{h, m, a, b}] (huruf, angka mutu, batas bawah, batas atas). */
function skalaNilai(t) {
  return String(t || "").split(/\n/).map(function (s) { var p = s.split(/[;|\t]/).map(function (v) { return v.trim(); }); if (p.length < 3) return null;
    var r = p[2].match(/(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)/); if (!p[0] || !r) return null;
    return { h: p[0], m: Number(p[1].replace(",", ".")), a: Number(r[1].replace(",", ".")), b: Number(r[2].replace(",", ".")) }; }).filter(Boolean);
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
    tim: tim, otorisasi: rpsOtorisasi(), cplProdi: CPL_PRODI, unsurCpl: UNSUR_CPL, kualifikasi: kualifikasiMk(m.semester), cplMk: cplMkDitetapkan(m), unitKomp: unitMk(m),
    terakhir: akhir ? { semester: akhir.semester, labelSemester: labelSmt(akhir.semester), data: akhir.data } : null };
}

/* ---------- v0.46.0: unit kompetensi dan CPL yang dibebankan per mata kuliah (ditetapkan KPS/Admin Prodi) ---------- */
var PERAN_CPL_MK = ["kps", "admin", "superadmin"];
function unitMk(m) { return Array.isArray(m.unitKomp) ? m.unitKomp : unitMkBawaan(m.nama); }
function cplMkDitetapkan(m) { return m.cplMk && Array.isArray(m.cplMk.cpl) ? m.cplMk.cpl : []; }
function unsurKodeCpl(kode) { var u = {}; kode.forEach(function (k) { var x = String(k).match(/^(KU|KK|S|P)\d+/); if (x) u[x[1]] = true; }); return u; }
var STOP_USULAN = ["dan", "yang", "dalam", "pada", "tentang", "tata", "cara", "konsep", "teoritis", "menguasai", "mampu", "pelaksanaan", "tugas", "bidang", "tour",
  "travel", "perjalanan", "wisata", "untuk", "serta", "dengan", "secara", "dari", "atau", "praktik", "pengelolaan"];
function kataUsulan(s) { return String(s || "").toLowerCase().replace(/&/g, " dan ").replace(/[^a-z ]/g, " ").split(/\s+/).filter(function (w) { return w.length > 3 && STOP_USULAN.indexOf(w) < 0; }); }
/** Usulan CPL: (1) dari RPS terbaca terakhir MK ini; (2) dari kecocokan kata unit kompetensi + nama MK dengan rumusan CPL Pengetahuan/KK (lemah, hanya titik awal). */
function usulanCplMk(m) {
  var rp = rpsTerakhirPerMk()[m.kode], dariRps = [];
  if (rp) ((rp.data && rp.data.cpl) || []).forEach(function (c) { var k = String(c.ref || "").toUpperCase(); if (CPL_PRODI.some(function (p) { return p.k === k; }) && dariRps.indexOf(k) < 0) dariRps.push(k); });
  var teksUnit = unitMk(m).map(function (u) { return u.id + " " + u.en; }).join(" ") + " " + m.nama, kw = {};
  kataUsulan(teksUnit).forEach(function (w) { kw[w] = 1; });
  var dariUnit = CPL_PRODI.filter(function (c) { return c.u === "P" || c.u === "KK"; }).map(function (c) {
    var n = 0, s = {}; kataUsulan(c.t).forEach(function (w) { if (kw[w] && !s[w]) { s[w] = 1; n++; } }); return { k: c.k, n: n };
  }).filter(function (x) { return x.n >= 2; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 6).map(function (x) { return x.k; });
  return { rps: dariRps, rpsSemester: rp ? labelSmt(rp.semester) : "", unit: dariUnit };
}
function cariMkKode(kode) {
  var m = semuaMk().filter(function (x) { return x.kode === String(kode || "").toUpperCase(); })[0];
  if (!m) throw galat("Mata kuliah tidak ditemukan.");
  return m;
}
function aksiDpCplMk(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_DP_LIHAT);
  var m = cariMkKode(d.kode);
  return { kode: m.kode, nama: m.nama, semester: m.semester, cplProdi: CPL_PRODI, unsurCpl: UNSUR_CPL, ditetapkan: cplMkDitetapkan(m), oleh: m.cplMk ? teks(m.cplMk.olehNama) : "",
    pada: m.cplMk ? teks(m.cplMk.pada) : "", unit: unitMk(m), unitBawaan: m.unitKomp === null, usulan: usulanCplMk(m), boleh: punyaPeran(p, PERAN_CPL_MK) };
}
/** Simpan penetapan CPL (d.cpl = [kode], [] = hapus penetapan) dan/atau unit kompetensi (d.unit = [{k, en, id}] | d.unitBawaan = true). */
function aksiDpCplMkSimpan(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_CPL_MK);
  var m = cariMkKode(d.kode), o = {};
  if (Array.isArray(d.cpl)) {
    var sah = {}; CPL_PRODI.forEach(function (c) { sah[c.k] = 1; });
    var l = d.cpl.map(function (k) { return String(k).toUpperCase().trim(); }).filter(function (k, i, a) { return a.indexOf(k) === i; });
    l.forEach(function (k) { if (!sah[k]) throw galat("Kode CPL tidak dikenal: " + k); });
    l.sort(function (a, b) { var ua = UNSUR_URUT.indexOf(a.replace(/\d+/, "")), ub = UNSUR_URUT.indexOf(b.replace(/\d+/, "")); return ua - ub || Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, "")); });
    o.cplMk = l.length ? JSON.stringify({ cpl: l, oleh: p.id, olehNama: p.nama, pada: hariIni() }) : "";
  }
  if (d.unitBawaan) o.unitKomp = "";
  else if (Array.isArray(d.unit)) {
    if (d.unit.length > 40) throw galat("Maksimal 40 unit kompetensi per mata kuliah.");
    var u = d.unit.map(function (x) { return { k: potong(x && x.k, 40).trim(), en: potong(x && x.en, 200).trim(), id: potong(x && x.id, 200).trim() }; }).filter(function (x) { return x.k || x.en || x.id; });
    u.forEach(function (x) { if (!x.en && !x.id) throw galat("Unit " + (x.k || "") + ": tulis nama unitnya."); });
    o.unitKomp = JSON.stringify(u);
  }
  if (!Object.keys(o).length) throw galat("Tidak ada yang disimpan.");
  kunciTulis(function () { ubah("MataKuliah", m._r, o); });
  catat(p.id, "dp.cplMk", { kode: m.kode, cpl: o.cplMk !== undefined ? (JSON.parse(o.cplMk || '{"cpl":[]}').cpl || []).join(",") : "-", unit: o.unitKomp !== undefined ? "ubah" : "-" });
  return aksiDpCplMk({ kode: m.kode }, token);
}
var UNSUR_URUT = ["S", "KU", "P", "KK"];
