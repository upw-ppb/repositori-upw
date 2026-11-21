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
    tim: tim, otorisasi: rpsOtorisasi(), cplProdi: CPL_PRODI, unsurCpl: UNSUR_CPL, kualifikasi: kualifikasiMk(m.semester), cplMk: cplMkDitetapkan(m), cplSek: cplMkSekunder(m), unitKomp: unitMk(m),
    terakhir: akhir ? { semester: akhir.semester, labelSemester: labelSmt(akhir.semester), data: akhir.data } : null };
}

/* ---------- v0.46.0: unit kompetensi dan CPL yang dibebankan per mata kuliah (ditetapkan KPS/Admin Prodi) ---------- */
var PERAN_CPL_MK = ["kps", "admin", "superadmin"];
function unitMk(m) { return Array.isArray(m.unitKomp) ? m.unitKomp : unitMkBawaan(m.nama); }
function cplMkDitetapkan(m) { return m.cplMk && Array.isArray(m.cplMk.cpl) ? m.cplMk.cpl : []; }
/** v0.48.0: CPL penunjang (sekunder) dan rasional pembebanan; CPL utama (primer, wajib diukur di RPS) tetap di cplMk.cpl. */
function cplMkSekunder(m) { return m.cplMk && Array.isArray(m.cplMk.sek) ? m.cplMk.sek : []; }
function cplMkAlasan(m) { return m.cplMk ? teks(m.cplMk.alasan) : ""; }
/** Rapikan daftar kode CPL: huruf besar, tanpa duplikat, harus ada di CPL_PRODI, urut S, KU, P, KK. */
function rapikanKodeCpl(daftar) {
  var sah = {}; CPL_PRODI.forEach(function (c) { sah[c.k] = 1; });
  var l = (daftar || []).map(function (k) { return String(k).toUpperCase().replace(/\s+/g, ""); }).filter(function (k, i, a) { return k && a.indexOf(k) === i; });
  l.forEach(function (k) { if (!sah[k]) throw galat("Kode CPL tidak dikenal: " + k); });
  return l.sort(function (a, b) { var ua = UNSUR_URUT.indexOf(a.replace(/\d+/, "")), ub = UNSUR_URUT.indexOf(b.replace(/\d+/, "")); return ua - ub || Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, "")); });
}
function jsonCplMk(p, cpl, sek, alasan, sumber) {
  sek = sek.filter(function (k) { return cpl.indexOf(k) < 0; });
  var o = { cpl: cpl, oleh: p.id, olehNama: p.nama, pada: hariIni() };
  if (sek.length) o.sek = sek; if (alasan) o.alasan = potong(alasan, 600).trim(); if (sumber) o.sumber = sumber;
  return cpl.length ? JSON.stringify(o) : "";
}
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
  return { kode: m.kode, nama: m.nama, semester: m.semester, cplProdi: CPL_PRODI, unsurCpl: UNSUR_CPL, ditetapkan: cplMkDitetapkan(m), sekunder: cplMkSekunder(m), alasan: cplMkAlasan(m), sumber: m.cplMk ? teks(m.cplMk.sumber) : "", oleh: m.cplMk ? teks(m.cplMk.olehNama) : "",
    pada: m.cplMk ? teks(m.cplMk.pada) : "", unit: unitMk(m), unitBawaan: m.unitKomp === null, usulan: usulanCplMk(m), boleh: punyaPeran(p, PERAN_CPL_MK) };
}
/** Simpan penetapan CPL (d.cpl = [kode], [] = hapus penetapan) dan/atau unit kompetensi (d.unit = [{k, en, id}] | d.unitBawaan = true). */
function aksiDpCplMkSimpan(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_CPL_MK);
  var m = cariMkKode(d.kode), o = {};
  if (Array.isArray(d.cpl)) {
    var l = rapikanKodeCpl(d.cpl);
    // v0.48.0: CPL penunjang dan rasional ikut disimpan; bila tidak dikirim, nilai lama dipertahankan
    var sek = Array.isArray(d.sek) ? rapikanKodeCpl(d.sek) : cplMkSekunder(m), al = d.alasan !== undefined ? teks(d.alasan) : cplMkAlasan(m);
    o.cplMk = jsonCplMk(p, l, sek, al, "");
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
/* ---------- v0.48.0: impor pembebanan CPL per MK dari Excel (lembar "Pemetaan CPL-MK" prodi) ---------- */
function namaMkBaku(s) { return String(s || "").toLowerCase().replace(/\([^)]*\)/g, " ").replace(/&/g, " dan ").replace(/[^a-z0-9]+/g, " ").trim(); }
/**
 * d.baris = [{no, kode ("231041217 / 231041215"), nama, primer: [..] | "P1, KK2", sek, alasan}], d.simpan = true untuk menerapkan.
 * MK dicocokkan dengan kode (termasuk kode kelompok paralel), lalu dengan nama. Tanpa d.simpan hanya pratinjau.
 */
function aksiDpCplMkImpor(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_CPL_MK);
  var baris = Array.isArray(d.baris) ? d.baris : [];
  if (!baris.length) throw galat("Tidak ada baris pemetaan yang terbaca.");
  if (baris.length > 200) throw galat("Maksimal 200 baris.");
  var mks = semuaMk(), perKode = {}, perNama = {};
  mks.forEach(function (m) {
    [m.kode].concat((m.kelompok || []).map(function (g) { return g.kode; })).forEach(function (k) { k = String(k || "").toUpperCase().trim(); if (k) perKode[k] = m; });
    var n = namaMkBaku(m.nama); (perNama[n] = perNama[n] || []).push(m);
  });
  var daftarKode = function (v) { return (Array.isArray(v) ? v : String(v || "").split(/[,;]/)).map(function (k) { return String(k).trim(); }).filter(Boolean); };
  var dipakai = {}, hasil = [], tercakup = {};
  baris.forEach(function (b, i) {
    var r = { no: teks(b.no) || String(i + 1), kode: potong(b.kode, 80), nama: potong(b.nama, 160), galat: [], catatan: [] };
    var kodes = String(b.kode || "").split(/[\/,;]/).map(function (k) { return k.trim().toUpperCase(); }).filter(Boolean), m = null, cara = "";
    kodes.some(function (k) { if (perKode[k]) { m = perKode[k]; cara = "kode"; return true; } });
    if (!m) { var c = perNama[namaMkBaku(b.nama)] || []; if (c.length === 1) { m = c[0]; cara = "nama"; } else if (c.length > 1) r.galat.push("Nama cocok dengan " + c.length + " MK; tulis kode MK."); }
    if (!m && !r.galat.length) r.galat.push("Mata kuliah tidak ditemukan di kurikulum aplikasi (kode " + (kodes.join(", ") || "-") + ").");
    if (m && dipakai[m.kode]) r.galat.push("MK " + m.kode + " sudah dipetakan di baris " + dipakai[m.kode] + ".");
    var pr = [], sk = [];
    try { pr = rapikanKodeCpl(daftarKode(b.primer)); } catch (e) { r.galat.push("CPL utama: " + e.message); }
    try { sk = rapikanKodeCpl(daftarKode(b.sek)); } catch (e) { r.galat.push("CPL penunjang: " + e.message); }
    if (!pr.length && !r.galat.length) r.galat.push("CPL utama (primer) kosong.");
    var dua = sk.filter(function (k) { return pr.indexOf(k) >= 0; });
    if (dua.length) { r.catatan.push(dua.join(", ") + " tertulis di primer dan penunjang; dihitung sebagai primer."); sk = sk.filter(function (k) { return pr.indexOf(k) < 0; }); }
    if (m) { r.mk = { kode: m.kode, nama: m.nama, semester: m.semester, cara: cara, lama: cplMkDitetapkan(m) };
      if (cara === "nama") r.catatan.push("Dicocokkan dengan nama; kode di berkas berbeda dengan kode di aplikasi (" + m.kode + ").");
      if (b.semester && Number(String(b.semester).replace(/\D/g, "")) && Number(String(b.semester).replace(/\D/g, "")) !== Number(m.semester)) r.catatan.push("Semester di berkas " + String(b.semester).replace(/\D/g, "") + ", di aplikasi " + m.semester + ".");
    }
    r.primer = pr; r.sek = sk; r.alasan = potong(b.alasan, 600).trim();
    if (m && !r.galat.length) { dipakai[m.kode] = r.no; r._m = m; pr.forEach(function (k) { tercakup[k] = 1; }); }
    hasil.push(r);
  });
  var siap = hasil.filter(function (r) { return r._m; });
  var out = { baris: hasil.map(function (r) { var x = Object.assign({}, r); delete x._m; return x; }), siap: siap.length, gagal: hasil.length - siap.length,
    tanpaBaris: mks.filter(function (m) { return !dipakai[m.kode]; }).map(function (m) { return { kode: m.kode, nama: m.nama, semester: m.semester, ditetapkan: cplMkDitetapkan(m).length > 0 }; }),
    tidakTercakup: CPL_PRODI.filter(function (c) { return !tercakup[c.k]; }).map(function (c) { return c.k; }), diterapkan: 0 };
  if (d.simpan) {
    if (!siap.length) throw galat("Tidak ada baris yang bisa diterapkan.");
    kunciTulis(function () { siap.forEach(function (r) { ubah("MataKuliah", r._m._r, { cplMk: jsonCplMk(p, r.primer, r.sek, r.alasan, "impor") }); }); });
    catat(p.id, "dp.cplMkImpor", { mk: siap.length, gagal: out.gagal });
    out.diterapkan = siap.length;
  }
  return out;
}
