/**
 * Data lulusan, penerimaan mahasiswa (PMB), dan penggunaan dana (v0.10.0). Sumber Tabel iLKPS 8, 9, 10a–c, Ref 11a, 21.
 * Diisi Admin Prodi / Super Admin di Data Prodi; KPS dan asesor melihat lewat Tabel iLKPS.
 * - Tahun lulus = tahun akademik tanggal lulus (Ganjil Juli–Des, Genap Jan–Jun).
 * - Lulusan terlacak = salah satu isian tracer terisi (waktu tunggu, kesesuaian, tempat kerja).
 * - Masa studi = (tanggal lulus − 1 Agustus tahun masuk) dalam tahun.
 */
var KESESUAIAN = ["Rendah", "Sedang", "Tinggi"];
var TEMPAT_KERJA = ["Lokal/Wilayah/Berwirausaha tidak berbadan hukum", "Nasional/Berwirausaha berbadan hukum", "Multinasional/Internasional"];
var JENIS_DANA = [
  { k: "dosen", l: "a. Biaya Dosen (Gaji, Honor)", g: 1 }, { k: "tendik", l: "b. Biaya Tenaga Kependidikan (Gaji, Honor)", g: 1 },
  { k: "opsBelajar", l: "c. Biaya Operasional Pembelajaran (Bahan dan Peralatan Habis Pakai)", g: 1 },
  { k: "opsTakLangsung", l: "d. Biaya Operasional Tidak Langsung (listrik, air, pemeliharaan, telekomunikasi, dll.)", g: 1 },
  { k: "kemahasiswaan", l: "Biaya operasional kemahasiswaan (penalaran, minat, bakat, dan kesejahteraan)", g: 1 },
  { k: "penelitian", l: "Biaya Penelitian", g: 2 }, { k: "pkm", l: "Biaya PkM", g: 2 },
  { k: "sdm", l: "Biaya Investasi SDM", g: 3 }, { k: "sarana", l: "Biaya Investasi Sarana", g: 3 }, { k: "prasarana", l: "Biaya Investasi Prasarana", g: 3 }];

function tempatKerjaDari(v) {
  v = teks(v).toLowerCase();
  if (!v) return "";
  if (/inter|multi/.test(v)) return TEMPAT_KERJA[2];
  if (/nasional|berbadan hukum/.test(v) && !/tidak berbadan/.test(v)) return TEMPAT_KERJA[1];
  if (/lokal|wilayah|tidak berbadan/.test(v)) return TEMPAT_KERJA[0];
  return null;
}
function tglDari(v) {
  if (v instanceof Date) return teksTgl(v);
  v = teks(v).trim();
  var m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(v);
  if (m) v = m[3] + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[1]).slice(-2);
  return tanggalSah(v) ? v : "";
}
function lulusanDari(r) {
  return { _r: r, nim: teks(r.nim), nama: teks(r.nama), masuk: Number(r.masuk) || null, tglLulus: tglDari(r.tglLulus), ipk: r.ipk === "" ? null : Number(r.ipk),
    dipesan: ya(r.dipesan), wtBulan: r.wtBulan === "" || r.wtBulan === null || r.wtBulan === undefined ? null : Number(r.wtBulan),
    kesesuaian: teks(r.kesesuaian), tempatKerja: teks(r.tempatKerja) };
}
function semuaLulusan() { return semua("Lulusan").filter(function (r) { return !r.dihapus; }).map(lulusanDari).sort(function (a, b) { return b.tglLulus.localeCompare(a.tglLulus) || a.nim.localeCompare(b.nim); }); }
function taLulus(x) { return x.tglLulus ? semesterInfo(keTanggal(x.tglLulus)).awal : null; }
function terlacak(x) { return x.wtBulan !== null || !!x.kesesuaian || !!x.tempatKerja; }
function masaStudi(x) { return x.masuk && x.tglLulus ? (keTanggal(x.tglLulus) - new Date(x.masuk + "-08-01T12:00:00+08:00")) / (365.25 * 864e5) : null; }
function bulat(n, d) { var f = Math.pow(10, d); return Math.round(n * f) / f; }
function semuaPenerimaan() { return semua("Penerimaan").map(function (r) { return { _r: r, tahun: Number(r.tahun), dayaTampung: angka(r.dayaTampung, 1e5), pendaftar: angka(r.pendaftar, 1e6), lulusSeleksi: angka(r.lulusSeleksi, 1e5), diterima: angka(r.diterima, 1e5) }; }).sort(function (a, b) { return b.tahun - a.tahun; }); }

/* ---------- aksi ---------- */

function aksiLulData(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_DP_LIHAT);
  var ta = Number(d.ta) || tsAwal(), dana = {};
  semua("Dana").filter(function (r) { return Number(r.ta) === ta; }).forEach(function (r) { dana[teks(r.jenis)] = { upps: angka(r.upps, 1e13), ps: angka(r.ps, 1e13) }; });
  return {
    bolehUbah: punyaPeran(p, PERAN_DP_UBAH),
    lulusan: semuaLulusan().map(function (x) { delete x._r; x.taLulus = taLulus(x); x.terlacak = terlacak(x); return x; }),
    penerimaan: semuaPenerimaan().map(function (x) { delete x._r; return x; }),
    ta: ta, labelTa: labelTa(ta), jenisDana: JENIS_DANA, dana: dana, kesesuaian: KESESUAIAN, tempatKerja: TEMPAT_KERJA
  };
}

/** Impor/ubah lulusan (berdasarkan NIM). Akun mahasiswa dengan NIM sama otomatis berstatus L (lulus). */
function aksiLulImpor(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_DP_UBAH);
  var daftar = Array.isArray(d.daftar) ? d.daftar : [];
  if (!daftar.length) throw galat("Tidak ada data lulusan.");
  if (daftar.length > 1000) throw galat("Maksimal 1.000 baris sekali impor.");
  var th = new Date().getFullYear(), bersih = daftar.map(function (x, i) {
    var b = "Baris " + (i + 1) + ": ", nim = teks(x.nim).trim(), o = { nim: nim, nama: potong(x.nama, 200).trim() };
    if (!/^[0-9A-Za-z.\-]{3,20}$/.test(nim)) throw galat(b + "NIM tidak valid (" + (nim || "kosong") + ").");
    if (!o.nama) throw galat(b + "nama kosong.");
    o.masuk = Number(x.masuk); if (!(o.masuk >= 1990 && o.masuk <= th)) throw galat(b + "tahun masuk tidak valid.");
    o.tglLulus = tglDari(x.tglLulus); if (!o.tglLulus) throw galat(b + "tanggal lulus tidak valid (YYYY-MM-DD atau DD/MM/YYYY).");
    if (Number(o.tglLulus.slice(0, 4)) < o.masuk) throw galat(b + "tanggal lulus sebelum tahun masuk.");
    var ipk = teks(x.ipk).replace(",", "."); o.ipk = ipk === "" ? "" : Number(ipk);
    if (o.ipk !== "" && !(o.ipk >= 0 && o.ipk <= 4)) throw galat(b + "IPK harus 0–4.");
    var wt = teks(x.wtBulan).replace(",", "."); o.wtBulan = wt === "" ? "" : Number(wt);
    if (o.wtBulan !== "" && !(o.wtBulan >= 0 && o.wtBulan <= 240)) throw galat(b + "waktu tunggu (bulan) tidak valid.");
    var ks = teks(x.kesesuaian).trim(); o.kesesuaian = ks ? KESESUAIAN.filter(function (k) { return k.toLowerCase() === ks.toLowerCase(); })[0] : "";
    if (o.kesesuaian === undefined) throw galat(b + "kesesuaian harus Rendah, Sedang, atau Tinggi.");
    o.tempatKerja = tempatKerjaDari(x.tempatKerja); if (o.tempatKerja === null) throw galat(b + "tempat kerja harus Lokal, Nasional, atau Internasional.");
    o.dipesan = ya(x.dipesan);
    return o;
  });
  return kunciTulis(function () {
    var ada = {}; semua("Lulusan").filter(function (r) { return !r.dihapus; }).forEach(function (r) { ada[teks(r.nim)] = r; });
    var akun = {}; semua("Pengguna").forEach(function (u) { if (peranDari(u).indexOf("mahasiswa") >= 0) akun[String(u.username)] = u; });
    var baru = 0, ubahN = 0, lulusAkun = 0;
    bersih.forEach(function (o) {
      o.diubah = new Date();
      if (ada[o.nim]) { ubah("Lulusan", ada[o.nim], o); ubahN++; } else { o.dihapus = ""; tambah("Lulusan", o); ada[o.nim] = true; baru++; }
      var u = akun[o.nim];
      if (u && (u.statusMhs || "A") === "A") { ubah("Pengguna", u, { statusMhs: "L", diubahPada: new Date() }); lulusAkun++; }
    });
    catat(p.id, "lul.impor", { baru: baru, ubah: ubahN, akunL: lulusAkun });
    return { baru: baru, diubah: ubahN, akunLulus: lulusAkun };
  });
}
function aksiLulHapus(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_DP_UBAH);
  return kunciTulis(function () {
    var r = cari("Lulusan", function (x) { return !x.dihapus && teks(x.nim) === teks(d.nim); });
    if (!r) throw galat("Data lulusan tidak ditemukan.");
    ubah("Lulusan", r, { dihapus: new Date() });
    catat(p.id, "lul.hapus", { nim: d.nim });
    return {};
  });
}
function aksiLulPmbSimpan(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_DP_UBAH);
  var x = d.data || {}, th = Number(x.tahun);
  if (!(th >= 1990 && th <= new Date().getFullYear() + 1)) throw galat("Tahun penerimaan tidak valid.");
  var o = { tahun: th, dayaTampung: angka(x.dayaTampung, 1e5), pendaftar: angka(x.pendaftar, 1e6), lulusSeleksi: angka(x.lulusSeleksi, 1e5), diterima: angka(x.diterima, 1e5), diubah: new Date() };
  if (o.diterima > o.lulusSeleksi && o.lulusSeleksi > 0) throw galat("Jumlah diterima (daftar ulang) tidak boleh melebihi yang lulus seleksi.");
  return kunciTulis(function () {
    var r = cari("Penerimaan", function (y) { return Number(y.tahun) === th; });
    if (r) ubah("Penerimaan", r, o); else tambah("Penerimaan", o);
    catat(p.id, "lul.pmb", { tahun: th });
    return {};
  });
}
function aksiLulDanaSimpan(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_DP_UBAH);
  var ta = Number(d.ta), data = d.data || {};
  if (!(ta >= 2010 && ta < 2100)) throw galat("Tahun akademik tidak valid.");
  return kunciTulis(function () {
    var ada = {}; semua("Dana").filter(function (r) { return Number(r.ta) === ta; }).forEach(function (r) { ada[teks(r.jenis)] = r; });
    JENIS_DANA.forEach(function (j) {
      var v = data[j.k] || {}, o = { ta: ta, jenis: j.k, upps: angka(v.upps, 1e13), ps: angka(v.ps, 1e13), diubah: new Date() };
      if (ada[j.k]) ubah("Dana", ada[j.k], o); else tambah("Dana", o);
    });
    catat(p.id, "lul.dana", { ta: ta });
    return {};
  });
}

/* ---------- Tabel iLKPS ---------- */

function tabelLulusan(ts) {
  var L = semuaLulusan(), T = [], pmb = {};
  semuaPenerimaan().forEach(function (x) { pmb[x.tahun] = x; });
  var lbl = function (k) { return (k ? "TS-" + k : "TS") + " (" + labelTa(ts - k) + ")"; };
  var padaTa = function (a) { return L.filter(function (x) { return taLulus(x) === a; }); };
  // Tabel 8
  T.push({ kode: "8", judul: "Tabel 8) IPK Lulusan", bentuk: "daftar", kolom: ["No.", "Tahun Lulus", "Jumlah Lulusan", "IPK Min.", "IPK Rata-rata", "IPK Maks."],
    baris: [2, 1, 0].map(function (k, i) {
      var l = padaTa(ts - k).filter(function (x) { return x.ipk !== null && !isNaN(x.ipk); }), ip = l.map(function (x) { return x.ipk; });
      return [i + 1, lbl(k), padaTa(ts - k).length, ip.length ? Math.min.apply(null, ip) : "", ip.length ? bulat(ip.reduce(function (s, n) { return s + n; }, 0) / ip.length, 2) : "", ip.length ? Math.max.apply(null, ip) : ""]; }),
    catatan: "Sumber: Data Prodi › Lulusan. Tahun lulus = tahun akademik tanggal lulus." });
  // Tabel 9 (Sarjana/Sarjana Terapan): angkatan TS-6..TS-3
  var b9 = [6, 5, 4, 3].map(function (km) {
    var masuk = ts - km, ang = L.filter(function (x) { return x.masuk === masuk; }), per = [6, 5, 4, 3, 2, 1, 0].map(function (k) { return ang.filter(function (x) { return taLulus(x) === ts - k; }).length; });
    var sd = ang.filter(function (x) { return taLulus(x) !== null && taLulus(x) <= ts; }), ms = sd.map(masaStudi).filter(function (n) { return n !== null; });
    return [lbl(km).replace(/\((\d{4})\/\d{4}\)/, "($1)"), pmb[masuk] ? pmb[masuk].diterima : ""].concat(per, [sd.length, ms.length ? bulat(ms.reduce(function (s, n) { return s + n; }, 0) / ms.length, 1) : ""]);
  });
  T.push({ kode: "9", judul: "Tabel 9) Masa Studi Lulusan Program Studi (Sarjana Terapan)", bentuk: "daftar",
    kolom: ["Tahun Masuk", "Jumlah Mahasiswa Diterima", "Lulus pada akhir TS-6", "Lulus pada akhir TS-5", "Lulus pada akhir TS-4", "Lulus pada akhir TS-3", "Lulus pada akhir TS-2", "Lulus pada akhir TS-1", "Lulus pada akhir TS", "Jumlah Lulusan s.d. akhir TS", "Rata-rata Masa Studi (tahun)"],
    baris: b9, catatan: "Jumlah diterima dari Data Prodi › PMB (daftar ulang). Masa studi dihitung dari 1 Agustus tahun masuk sampai tanggal lulus." });
  // Tabel 10a–c dan Ref 11a: tahun lulus TS-4..TS-2
  var kel = [4, 3, 2].map(function (k) { var l = padaTa(ts - k); return { k: k, l: l, t: l.filter(terlacak) }; });
  function tracer(kode, judul, kat, fn, cat) {
    var baris = kel.map(function (g) { return [lbl(g.k), g.l.length, g.t.length].concat(kat.map(function (_, i) { return g.t.filter(function (x) { return fn(x) === i; }).length; })); });
    var jml = ["Jumlah"].concat(baris[0].slice(1).map(function (_, c) { return baris.reduce(function (s, r) { return s + r[c + 1]; }, 0); }));
    T.push({ kode: kode, judul: judul, bentuk: "daftar", kolom: ["Tahun Lulus", "Jumlah Lulusan", "Jumlah Lulusan yang Terlacak"].concat(kat), baris: baris.concat([jml]), catatan: cat });
  }
  tracer("10a", "Tabel 10.a) Waktu Tunggu Lulusan (Sarjana Terapan)", ["WT < 3 bulan", "3 ≤ WT ≤ 6 bulan", "WT > 6 bulan"],
    function (x) { return x.wtBulan === null ? -1 : x.wtBulan < 3 ? 0 : x.wtBulan <= 6 ? 1 : 2; }, "Lulusan terlacak = salah satu isian tracer (waktu tunggu, kesesuaian, tempat kerja) terisi.");
  tracer("10b", "Tabel 10.b) Kesesuaian Bidang Kerja Lulusan (Sarjana Terapan)", KESESUAIAN, function (x) { return KESESUAIAN.indexOf(x.kesesuaian); }, "");
  tracer("10c", "Tabel 10.c) Tempat Kerja Lulusan (Sarjana Terapan)", TEMPAT_KERJA, function (x) { return TEMPAT_KERJA.indexOf(x.tempatKerja); }, "");
  var tanggapan = typeof tanggapanPengguna === "function" ? tanggapanPengguna() : {};
  var r11 = kel.map(function (g) { return [lbl(g.k), g.l.length, tanggapan[ts - g.k] || 0]; });
  T.push({ kode: "ref11a", judul: "Tabel Referensi 11a) Kepuasan Pengguna Lulusan", bentuk: "daftar", kolom: ["Tahun Lulus", "Jumlah Lulusan", "Jumlah Tanggapan Kepuasan Pengguna yang Terlacak"],
    baris: r11.concat([["Jumlah", r11.reduce(function (s, r) { return s + r[1]; }, 0), r11.reduce(function (s, r) { return s + r[2]; }, 0)]]),
    catatan: "Jumlah tanggapan dihitung dari survei kepuasan pengguna lulusan (menu Survei) menurut tahun lulus alumni yang dinilai." });
  // Tabel 21
  var dana = {}; semua("Dana").forEach(function (r) { var a = Number(r.ta); (dana[a] = dana[a] || {})[teks(r.jenis)] = { upps: angka(r.upps, 1e13), ps: angka(r.ps, 1e13) }; });
  var tsL = [ts - 2, ts - 1, ts], nilai = function (j, s) { return tsL.map(function (a) { return ((dana[a] || {})[j] || {})[s] || 0; }); };
  var rata = function (v) { return bulat((v[0] + v[1] + v[2]) / 3, 0); };
  var b21 = [], sub = function (g, label) {
    var js = JENIS_DANA.filter(function (j) { return j.g === g; }), u = [0, 1, 2].map(function (i) { return js.reduce(function (s, j) { return s + nilai(j.k, "upps")[i]; }, 0); }),
      ps = [0, 1, 2].map(function (i) { return js.reduce(function (s, j) { return s + nilai(j.k, "ps")[i]; }, 0); });
    b21.push([label, "Jumlah"].concat(u, [rata(u)], ps, [rata(ps)]));
  };
  var nomor = { dosen: "1", kemahasiswaan: "2", penelitian: "3", pkm: "4", sdm: "5", sarana: "6", prasarana: "7" };
  JENIS_DANA.forEach(function (j, i) {
    if (j.k === "dosen") b21.push(["1", "Biaya Operasional Pendidikan", "", "", "", "", "", "", "", ""]);
    var u = nilai(j.k, "upps"), p = nilai(j.k, "ps");
    b21.push([j.k === "dosen" || j.k === "tendik" || j.k === "opsBelajar" || j.k === "opsTakLangsung" ? "" : nomor[j.k], j.l].concat(u, [rata(u)], p, [rata(p)]));
    if (j.k === "kemahasiswaan") sub(1, ""); if (j.k === "pkm") sub(2, ""); if (j.k === "prasarana") sub(3, "");
  });
  T.push({ kode: "21", judul: "Tabel 21) Penggunaan Dana (Rupiah)", bentuk: "daftar",
    kolom: ["No.", "Jenis Penggunaan", "UPPS TS-2", "UPPS TS-1", "UPPS TS", "UPPS Rata-rata", "PS TS-2", "PS TS-1", "PS TS", "PS Rata-rata"], baris: b21,
    catatan: "Sumber: Data Prodi › Keuangan, per tahun akademik (TS-2 = " + labelTa(ts - 2) + ", TS = " + labelTa(ts) + ")." });
  return T;
}
