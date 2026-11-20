/**
 * Peserta kelas (v0.39.0, permintaan pemilik 20 Nov 2026).
 * - MK biasa: peserta OTOMATIS = mahasiswa aktif angkatan yang mengambil MK (lihat kelasTimMk) di kelas itu. Admin Prodi/KPS boleh menyesuaikan per orang
 *   (mis. mahasiswa mengulang) → daftar tersimpan menggantikan daftar otomatis untuk kelas itu; "Kembalikan otomatis" menghapus daftar tersimpan.
 * - MK berkelompok paralel (v0.38.0, mis. Bahasa Asing Pilihan): tidak ada peserta otomatis; mahasiswa dibagi per orang ke "KELAS/KELOMPOK"
 *   (satu mahasiswa hanya di satu kelompok per MK).
 * Tabel PesertaKelas: satu baris per (semester, kodeMk, kunci); userIds = JSON [userId].
 * Mahasiswa melihat MK semesternya beserta kelas/kelompok dan dosen pengajar (menu Mata Kuliah Saya); dosen tim melihat daftar peserta.
 */
var PERAN_PESERTA_ATUR = ["kps", "admin"];   // sama dengan pengatur tim lewat Excel (PERAN_TIM_IMPOR)

function angkatanMk(smt, smtMk) { return Number(String(smt).slice(0, 4)) - Math.floor((Math.max(1, Number(smtMk) || 1) - 1) / 2); }
function mhsAktifSemua() {
  return semua("Pengguna").filter(function (p) {
    return peranDari(p).indexOf("mahasiswa") >= 0 && p.status !== "nonaktif" && !akunSistem(p) && (String(p.statusMhs || "A") === "A");
  }).map(function (p) { return { id: p.id, nim: teks(p.username), nama: teks(p.nama), kelas: teks(p.kelas).toUpperCase(), masuk: Number(p.masuk) || 0 }; })
    .sort(function (a, b) { return a.kelas.localeCompare(b.kelas) || a.nama.localeCompare(b.nama); });
}
/** Kunci peserta suatu MK: MK biasa → kelas yang mengambil (+ kelas dari tim); MK berkelompok → kelas (A, B, …) × kelompok. */
function kunciPesertaMk(smt, m, timMk, peta) {
  var kls = kelasTimMk(smt, m.semester, peta).slice();
  Object.keys((timMk && timMk.kelas) || {}).forEach(function (k) { var kl = String(k).split("/")[0]; if (kl && kls.indexOf(kl) < 0) kls.push(kl); });
  if (m.kelompok && m.kelompok.length) {
    ["A", "B"].forEach(function (k) { if (kls.indexOf(k) < 0) kls.push(k); });
    kls.sort();
    var l = []; kls.forEach(function (k) { m.kelompok.forEach(function (g) { l.push(kunciKelompok(k, g.n)); }); });
    return l;
  }
  return kls.sort();
}
function barisPesertaSemester(smt) {
  var m = {};
  semua("PesertaKelas").filter(function (r) { return String(r.semester) === smt; }).forEach(function (r) {
    var kd = teks(r.kodeMk); m[kd] = m[kd] || {}; m[kd][String(r.kunci).toUpperCase()] = { _r: r, ids: jsonDari(r.userIds, []) || [] };
  });
  return m;
}
/** Peserta per kunci: {kunci: {ids, sumber: "otomatis"|"diatur"}}. */
function pesertaMk(smt, m, ctx) {
  var keys = kunciPesertaMk(smt, m, ctx.tim[m.kode], ctx.peta), tersimpan = ctx.baris[m.kode] || {}, angk = angkatanMk(smt, m.semester), h = {};
  keys.forEach(function (k) {
    if (tersimpan[k]) h[k] = { ids: tersimpan[k].ids.filter(function (id) { return ctx.aktif[id]; }), sumber: "diatur" };
    else if (m.kelompok && m.kelompok.length) h[k] = { ids: [], sumber: "belum" };
    else h[k] = { ids: ctx.daftar.filter(function (x) { return x.masuk === angk && x.kelas === k; }).map(function (x) { return x.id; }), sumber: "otomatis" };
  });
  return h;
}
function konteksPeserta(smt) {
  var daftar = mhsAktifSemua(), aktif = {}; daftar.forEach(function (x) { aktif[x.id] = x; });
  return { tim: timSemester(smt), peta: petaKelasAngkatan(), baris: barisPesertaSemester(smt), daftar: daftar, aktif: aktif };
}
/** Pengajar satu kunci peserta: tim kunci itu, atau tim kelas (MK biasa per kelas), atau tim "semua kelas". */
function timUntukKunci(timMk, k) {
  if (!timMk) return [];
  var kls = timMk.kelas || {};
  return kls[k] || kls[String(k).split("/")[0]] || kls[""] || [];
}
function namaTim(ang, idx, prak) {
  return (ang || []).map(function (a, i) {
    if (a.t === "p") { var x = prak[a.id]; return { nama: x ? x.nama : "(praktisi)", praktisi: true, utama: false }; }
    var o = idx.byId[a.id]; return { nama: o ? o.nama : "(dosen)", praktisi: false, utama: i === 0 };
  });
}
function mkSemesterIni(smt) {
  var ganjil = /-1$/.test(smt);
  return semuaMk().filter(function (m) { return m.semester % 2 === (ganjil ? 1 : 0); });
}
function cariMkSmt(smt, kode) {
  var m = mkSemesterIni(smt).filter(function (x) { return x.kode === kode; })[0];
  if (!m) throw galat("Mata kuliah tidak ditemukan pada " + labelSmt(smt) + ".");
  return m;
}

/* ---------- aksi ---------- */

function aksiPesertaData(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_DP_LIHAT.concat(["dosen"]));
  var smt = semesterSah(d.semester || semesterInfo().kode), m = cariMkSmt(smt, teks(d.kodeMk)), ctx = konteksPeserta(smt);
  var timMk = ctx.tim[m.kode], lihatSemua = punyaPeran(p, PERAN_DP_LIHAT);
  if (!lihatSemua && !(timMk && timMk.anggota.some(function (a) { return a.t === "u" && a.id === p.id; }))) throw galat("Anda bukan pengajar mata kuliah ini.");
  var ps = pesertaMk(smt, m, ctx), idx = indeksOrang(), prak = petaPraktisi(), angk = angkatanMk(smt, m.semester);
  // v0.40.0: dosen hanya melihat peserta kelas/kelompok yang ia ajar (pengelola melihat semua).
  if (!lihatSemua) Object.keys(ps).forEach(function (k) { if (!timUntukKunci(timMk, k).some(function (a) { return a.t === "u" && a.id === p.id; })) delete ps[k]; });
  var orang = function (id) { var x = ctx.aktif[id]; return x ? { id: x.id, nim: x.nim, nama: x.nama, kelas: x.kelas, masuk: x.masuk } : null; };
  catat(p.id, "peserta.data", { semester: smt, kode: m.kode });
  return {
    semester: smt, labelSemester: labelSmt(smt), kode: m.kode, nama: m.nama, sks: sksMk(m), kelompok: m.kelompok, angkatan: angk,
    boleh: punyaPeran(p, PERAN_PESERTA_ATUR),
    kunci: Object.keys(ps).map(function (k) {
      return { k: k, sumber: ps[k].sumber, peserta: ps[k].ids.map(orang).filter(Boolean).sort(function (a, b) { return a.nama.localeCompare(b.nama); }),
        dosen: namaTim(timUntukKunci(timMk, k), idx, prak) };
    }),
    // Kandidat: mahasiswa aktif angkatan MK (semua kelas) + yang sudah tercatat sebagai peserta (mis. mengulang).
    kandidat: punyaPeran(p, PERAN_PESERTA_ATUR) ? ctx.daftar.filter(function (x) {
      return x.masuk === angk || Object.keys(ps).some(function (k) { return ps[k].ids.indexOf(x.id) >= 0; });
    }) : [],
    lainnya: punyaPeran(p, PERAN_PESERTA_ATUR) ? ctx.daftar.filter(function (x) { return x.masuk !== angk; }).map(function (x) { return { id: x.id, nim: x.nim, nama: x.nama, kelas: x.kelas, masuk: x.masuk }; }) : []
  };
}
/** Simpan peserta satu kunci (MK biasa: daftar per orang menggantikan otomatis; otomatis: true → kembali otomatis). */
function aksiPesertaSimpan(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_PESERTA_ATUR);
  var smt = semesterSah(d.semester), m = cariMkSmt(smt, teks(d.kodeMk)), k = String(d.kunci || "").toUpperCase(), ctx = konteksPeserta(smt);
  if (m.tanpaTim) throw galat("Mata kuliah ini ditandai tanpa dosen pengampu.");
  if (kunciPesertaMk(smt, m, ctx.tim[m.kode], ctx.peta).indexOf(k) < 0) throw galat("Kelas/kelompok tidak dikenal untuk " + m.kode + ".");
  var ids = d.otomatis ? null : bersihIdsMhs(d.userIds, ctx);
  if (d.otomatis && m.kelompok && m.kelompok.length) throw galat("MK berkelompok tidak punya peserta otomatis; bagi peserta per orang.");
  return kunciTulis(function () {
    if (m.kelompok && m.kelompok.length && ids) {
      // Satu mahasiswa hanya di satu kelompok per MK: keluarkan dari kunci lain.
      var lain = barisPesertaSemester(smt)[m.kode] || {};
      Object.keys(lain).forEach(function (kk) { if (kk === k) return; var sisa = lain[kk].ids.filter(function (id) { return ids.indexOf(id) < 0; }); if (sisa.length !== lain[kk].ids.length) tulisPeserta(p, smt, m.kode, kk, sisa); });
    }
    tulisPeserta(p, smt, m.kode, k, ids);
    catat(p.id, "peserta.simpan", { semester: smt, kode: m.kode, kunci: k, n: ids ? ids.length : "otomatis" });
    return aksiPesertaData({ semester: smt, kodeMk: m.kode }, token);
  });
}
/** MK berkelompok: bagi banyak mahasiswa sekaligus, bagi = {userId: "A/JEPANG" | ""}. Mahasiswa yang tidak disebut tetap di kelompoknya. */
function aksiPesertaBagi(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_PESERTA_ATUR);
  var smt = semesterSah(d.semester), m = cariMkSmt(smt, teks(d.kodeMk)), ctx = konteksPeserta(smt);
  if (!m.kelompok || !m.kelompok.length) throw galat("Pembagian kelompok hanya untuk MK berkelompok paralel.");
  var keys = kunciPesertaMk(smt, m, ctx.tim[m.kode], ctx.peta), bagi = d.bagi && typeof d.bagi === "object" ? d.bagi : {};
  var ubahIds = Object.keys(bagi);
  if (ubahIds.length > 500) throw galat("Maksimal 500 mahasiswa sekali simpan.");
  ubahIds.forEach(function (id) {
    if (!ctx.aktif[id]) throw galat("Ada mahasiswa yang tidak ditemukan atau tidak aktif. Muat ulang.");
    var k = String(bagi[id] || "").toUpperCase(); if (k && keys.indexOf(k) < 0) throw galat("Kelompok tidak dikenal: " + bagi[id]);
  });
  return kunciTulis(function () {
    var lama = barisPesertaSemester(smt)[m.kode] || {}, baru = {};
    keys.forEach(function (k) { baru[k] = ((lama[k] || {}).ids || []).filter(function (id) { return !(id in bagi); }); });
    ubahIds.forEach(function (id) { var k = String(bagi[id] || "").toUpperCase(); if (k) baru[k].push(id); });
    var n = 0;
    keys.forEach(function (k) { if (lama[k] || baru[k].length) { tulisPeserta(p, smt, m.kode, k, baru[k]); n++; } });
    catat(p.id, "peserta.bagi", { semester: smt, kode: m.kode, jumlah: ubahIds.length });
    return aksiPesertaData({ semester: smt, kodeMk: m.kode }, token);
  });
}
function bersihIdsMhs(v, ctx) {
  var ids = (Array.isArray(v) ? v : []).map(String).filter(function (id, i, a) { return id && a.indexOf(id) === i; });
  if (ids.length > 300) throw galat("Maksimal 300 peserta per kelas.");
  ids.forEach(function (id) { if (!ctx.aktif[id]) throw galat("Ada mahasiswa yang tidak ditemukan atau tidak aktif. Muat ulang."); });
  return ids;
}
/** Tulis satu baris peserta (ids null → hapus baris = kembali otomatis). Di dalam kunciTulis. */
function tulisPeserta(p, smt, kode, k, ids) {
  var r = cari("PesertaKelas", function (x) { return String(x.semester) === smt && teks(x.kodeMk) === kode && String(x.kunci).toUpperCase() === k; });
  if (ids === null) { if (r) hapusBaris("PesertaKelas", r); return; }
  var o = { semester: smt, kodeMk: kode, kunci: k, userIds: JSON.stringify(ids), oleh: p.id, diubah: new Date() };
  if (r) ubah("PesertaKelas", r, o); else tambah("PesertaKelas", o);
}
/** Mahasiswa: MK yang diikuti pada satu semester, dengan kelas/kelompok dan dosen pengajar. */
function aksiMhsMkSaya(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["mahasiswa"]);
  var smt = semesterSah(d.semester || semesterInfo().kode), ctx = konteksPeserta(smt), idx = indeksOrang(), prak = petaPraktisi();
  var saya = { masuk: Number(p.masuk) || 0, kelas: teks(p.kelas).toUpperCase() }, angkSaya = saya.masuk;
  if (!ctx.aktif[p.id]) ctx.aktif[p.id] = { id: p.id, masuk: saya.masuk, kelas: saya.kelas };   // statusnya bukan aktif: tetap bisa melihat
  var mk = [];
  mkSemesterIni(smt).forEach(function (m) {
    var angk = angkatanMk(smt, m.semester), ps = m.tanpaTim ? {} : pesertaMk(smt, m, ctx), kunci = "";
    Object.keys(ps).forEach(function (k) { if (!kunci && ps[k].ids.indexOf(p.id) >= 0) kunci = k; });
    var bagianAngk = angk === angkSaya;
    if (!kunci && !bagianAngk) return;                              // bukan MK semesternya dan tidak ditambahkan sebagai peserta
    if (!kunci && bagianAngk && !m.tanpaTim && !(m.kelompok && m.kelompok.length)) {
      var adaDiatur = Object.keys(ps).some(function (k) { return k === saya.kelas && ps[k].sumber === "diatur"; });
      if (adaDiatur) return;                                        // dikeluarkan dari daftar kelasnya oleh Admin/KPS
    }
    var g = kunci ? kelompokDariKunci(kunci) : "", kel = g ? (m.kelompok || []).filter(function (x) { return x.n.toUpperCase() === g; })[0] : null;
    mk.push({ kode: m.kode, nama: m.nama, sks: sksMk(m), smtMk: m.semester, tanpaTim: !!m.tanpaTim,
      kelas: kunci ? kunci.split("/")[0] : saya.kelas, kelompok: kel ? { n: kel.n, kode: kel.kode } : null,
      belumDibagi: !kunci && !!(m.kelompok && m.kelompok.length) && !m.tanpaTim, pilihanKelompok: (m.kelompok || []).map(function (x) { return x.n; }),
      dosen: m.tanpaTim ? [] : namaTim(kunci ? timUntukKunci(ctx.tim[m.kode], kunci) : (m.kelompok && m.kelompok.length ? [] : timUntukKunci(ctx.tim[m.kode], saya.kelas)), idx, prak) });
  });
  return { semester: smt, labelSemester: labelSmt(smt), pilihanSemester: pilihanSemesterMkp(), kelas: saya.kelas, mk: mk };
}
