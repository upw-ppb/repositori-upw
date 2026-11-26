/**
 * v0.59.0: Tarik data penelitian & PkM dari SINTA (permintaan pemilik 26 Nov 2026).
 * SINTA menolak akses dari server/situs lain (403, tanpa CORS), jadi penarikan dijalankan DI TAB SINTA oleh skrip docs/uji/sinta-tarik.js
 * (dipanggil penanda buku "Tarik ke Repositori UPW"). Alur: Admin/Super Admin menekan Tarik Data SINTA → sinta.mulai memberi kode sekali pakai
 * (30 menit, CacheService) → skrip di tab SINTA memanggil sinta.daftar {kode} (dosen DTPS ber-ID SINTA), membaca profil tiap dosen
 * (?view=researches dan ?view=services, 10 terbaru tanpa login), lalu sinta.kirim {kode, item[]}.
 * Penggabungan: satu judul = satu kegiatan (kunci jenis|tahun|judul dinormalkan); semua dosen UPW yang tercantum (pemilik profil, anggota
 * ber-ID SINTA, ketua) ditandai; tarikan berikutnya hanya menambah yang belum ada → data terkumpul melebihi 10 terbaru, tanpa ganda.
 * Kegiatan hasil tarikan: status draf ("dari SINTA · menunggu bukti"), TIDAK dihitung di iLKPS sampai dosen yang tertandai melengkapi
 * (tanggal, tingkat, mahasiswa, bukti) lalu mengajukan dan diverifikasi. Semua dosen tertandai boleh mengubahnya (klasifikasi yang tidak ada di SINTA).
 * Draf SINTA yang dihapus dosen dicatat di Pengaturan "sintaAbaikan" agar tidak dibuat lagi.
 */
var PERAN_SINTA = ["admin", "superadmin"];
var SINTA_URL = "https://sinta.kemdiktisaintek.go.id";
var STATUS_DTPS = "Dosen tetap program studi (DTPS)";

/** Isian biodata "SINTA ID" boleh berisi angka saja atau alamat profil → ambil angkanya. */
function idSintaDari(v) { var m = teks(v).match(/(\d{3,12})(?!.*\d{3,12})/); return m ? m[1] : ""; }
function normalJudul(s) { return teks(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim(); }
function kunciSinta(jenis, tahun, judul) { return jenis + "|" + tahun + "|" + normalJudul(judul); }
/** userId → ID SINTA (biodata dosen). */
function petaSinta() {
  var m = {};
  semua("BiodataPegawai").forEach(function (b) { var s = idSintaDari(b.sinta); if (s) m[b.userId] = s; });
  return m;
}
/** Dosen yang ditarik: DTPS TA berjalan yang punya ID SINTA. */
function dosenSinta() {
  var ps = petaSinta(), ta = semesterInfo().awal;
  return daftarDosen(ta).map(function (x) { return { id: x.id, nama: x.nama, status: x.status, sinta: ps[x.id] || "" }; });
}
function kodeSintaSah(kode) {
  kode = teks(kode);
  if (!/^[a-z0-9]{24}$/.test(kode)) throw galat("Kode penarikan tidak sah. Tekan Tarik Data SINTA lagi di aplikasi.");
  var v = CacheService.getScriptCache().get("sinta:" + kode);
  if (!v) throw galat("Kode penarikan sudah kedaluwarsa (30 menit). Tekan Tarik Data SINTA lagi di aplikasi.");
  return JSON.parse(v);
}
function sintaKeKlien(k) {
  if (!k) return null;
  if (k.pub) return { pub: 1, tahun: k.tahun, jurnal: k.jurnal || "", doi: k.doi || "", akred: k.akred || "", kuartil: k.kuartil || "", tipe: k.tipe || "", sitasi: k.sitasi === undefined ? null : k.sitasi,
    sitasiScopus: k.sitasiScopus === undefined ? null : k.sitasiScopus, asal: k.asal || [], penulis: k.penulis || [], url: k.url || "", pada: k.pada, terakhir: k.terakhir };
  return { ketua: k.ketua, skema: k.skema, sumber: k.sumber, dana: k.dana, tahun: k.tahun, anggota: k.anggota || [], pada: k.pada, terakhir: k.terakhir };
}
/* ---------- v0.60.0: publikasi & sitasi (Garuda, Google Scholar, Scopus, WoS di profil SINTA) ---------- */
var ASAL_PUB = { garuda: "Garuda", googlescholar: "Google Scholar", scopus: "Scopus", wos: "Web of Science" };
var ISIAN_SITASI = "Jumlah sitasi (Google Scholar)";
function kunciPubSinta(judul) { return "publikasi|" + normalJudul(judul); }
/** Kategori publikasi (isian jenis "publikasi") dari indeks SINTA; kosong bila tidak bisa dipastikan (dosen memilih sendiri). */
function kategoriPubSinta(m) {
  var def = jenisDef("publikasi"), f = def ? def.fx.filter(function (x) { return x.l === "Kategori publikasi"; })[0] : null;
  if (!f) return "";
  var pilih = function (awal) { return f.o.filter(function (o) { return o.indexOf(awal) === 0; })[0] || ""; };
  var asal = m.asal || [];
  if (asal.indexOf("scopus") >= 0 || asal.indexOf("wos") >= 0)   // prosiding terindeks (Scopus "Conference Proceeding", WoS ISSHP/ISTP/CPCI) = seminar internasional
    return /conference|proceeding|ISSHP|ISTP|CPCI/i.test(teks(m.tipe)) ? pilih("Seminar internasional") : pilih("Jurnal internasional bereputasi");
  if (/sinta\s*[1-6]/i.test(teks(m.akred))) return pilih("Jurnal nasional terakreditasi");
  return "";
}
function angkaSitasi(v) { if (v === null || v === undefined || v === "") return null; var n = Math.round(Number(v)); return isFinite(n) && n >= 0 && n < 1e7 ? n : null; }
/** Satu entri publikasi dari tab SINTA → buat / gabungkan (judul sama dari indeks lain atau profil dosen lain = satu kegiatan). */
function kirimPubSinta(x, C, h) {
  var judul = potong(x.judul, 300).trim(), tahun = Number(x.tahun) || 0, asal = ASAL_PUB[x.sumber] ? x.sumber : "";
  if (!asal || !judul || !(tahun >= 1990 && tahun <= 2100)) { h.dilewati++; return; }
  var kunci = kunciPubSinta(judul);
  if (C.abaikan.indexOf(kunci) >= 0) { h.diabaikan++; return; }
  var tag = C.tag(x);
  if (!tag.length) { h.dilewati++; return; }
  var sit = angkaSitasi(x.sitasi), k = C.perKunci[kunci];
  if (!k) {
    var c = (C.perJudul["publikasi|" + normalJudul(judul)] || []).filter(function (y) { return !jsonDari(y.sinta, null) && (!y.tgl || Math.abs(Number(y.tgl.slice(0, 4)) - tahun) <= 1); })[0];
    if (c) { k = c; h.tertaut++; } else h.baru++;
  } else h.sudah++;
  var lama = k ? jsonDari(k.sinta, null) || {} : {}, m = {};
  Object.keys(lama).forEach(function (a) { m[a] = lama[a]; });
  m.k = kunci; m.pub = 1; m.tahun = m.tahun || tahun; m.pada = lama.pada || C.kini; m.terakhir = C.kini;
  m.asal = (m.asal || []).slice(); if (m.asal.indexOf(asal) < 0) m.asal.push(asal);
  ["jurnal", "doi", "url"].forEach(function (a) { var v = potong(x[a], 300).trim(); if (v && !m[a]) m[a] = v; });
  if (teks(x.akred).trim()) m.akred = potong(x.akred, 40).trim();
  if (teks(x.kuartil).trim()) m.kuartil = potong(x.kuartil, 40).trim();
  if (teks(x.tipe).trim() && (asal === "scopus" || asal === "wos")) m.tipe = potong(x.tipe, 60).trim();
  if (!m.penulis || !m.penulis.length) m.penulis = (Array.isArray(x.penulis) ? x.penulis : []).slice(0, 40).map(function (a) { return potong(a, 120); });
  if (sit !== null) {
    // judul yang sama di profil beberapa dosen pada tarikan yang sama → ambil angka terbesar; tarikan baru → angka terbaru
    var fs = asal === "googlescholar" ? "sitasi" : asal === "scopus" ? "sitasiScopus" : "", tk = "tarik_" + fs;
    if (fs) { m[fs] = lama[tk] === C.info.w && lama[fs] !== undefined && lama[fs] !== null ? Math.max(lama[fs], sit) : sit; m[tk] = C.info.w; }
  }
  if (k) {
    var bisaUbah = k.status === "draf" || k.status === "revisi", nb = 0, cat = [];
    if (bisaUbah) tag.forEach(function (u) { if (k.pegawai.indexOf(u) < 0 && k.olehId !== u) { k.pegawai.push(u); nb++; } });
    h.ditandai += nb;
    if (nb) cat.push(nb + " dosen ditandai dari SINTA");
    if (!lama.k) cat.push("ditautkan ke SINTA");
    // sitasi diperbarui setiap tarikan, juga untuk data yang sudah disetujui (hanya angka sitasi)
    if (m.sitasi !== undefined && m.sitasi !== null && String(m.sitasi) !== teks(k.isian[ISIAN_SITASI])) {
      cat.push("sitasi Google Scholar diperbarui dari SINTA: " + (teks(k.isian[ISIAN_SITASI]) || "–") + " → " + m.sitasi);
      k.isian[ISIAN_SITASI] = String(m.sitasi); h.sitasi = (h.sitasi || 0) + 1;
    }
    if (bisaUbah) {   // isian kosong dilengkapi dari SINTA; isian yang sudah diisi dosen tidak ditimpa
      var kat = kategoriPubSinta(m);
      if (kat && !teks(k.isian["Kategori publikasi"])) k.isian["Kategori publikasi"] = kat;
      if (m.jurnal && !teks(k.isian["Nama jurnal / seminar"])) k.isian["Nama jurnal / seminar"] = m.jurnal;
      if ((m.doi || m.url) && !teks(k.isian["DOI / tautan"])) k.isian["DOI / tautan"] = m.doi ? "https://doi.org/" + m.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "") : m.url;
    }
    k.sinta = JSON.stringify(m);
    if (cat.length) k.riwayat.push({ w: C.kini, o: C.info.u, a: "sinta", c: cat.join("; ") });
    simpanKegiatan(k);
    return;
  }
  var isian = { "Luaran dari": "Penelitian" }, kat0 = kategoriPubSinta(m);
  if (kat0) isian["Kategori publikasi"] = kat0;
  if (m.jurnal) isian["Nama jurnal / seminar"] = m.jurnal;
  if (m.doi || m.url) isian["DOI / tautan"] = m.doi ? "https://doi.org/" + m.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "") : m.url;
  if (m.sitasi !== undefined && m.sitasi !== null) isian[ISIAN_SITASI] = String(m.sitasi);
  var olehId = tag[0];
  var baru = { id: "k" + acak(10), jenis: "publikasi", jenisLain: "", judul: judul, tgl: "", sampai: "", tingkat: "", olehId: olehId, kelompok: "dosen",
    pegawai: tag.filter(function (u) { return u !== olehId; }), kelas: [], mhs: [], excl: [], pendampingId: "", isian: isian, gcet: [], perluST: false,
    tempat: "", aktivitas: "", ket: potong("Dari SINTA (" + ASAL_PUB[asal] + ") " + tahun + (m.jurnal ? ": " + m.jurnal : ""), 300), bentuk: "", kegDosen: "",
    st: "tanpa", status: "draf", riwayat: [{ w: C.kini, o: C.info.u, a: "sinta", c: "dibuat dari SINTA (" + ASAL_PUB[asal] + ")" }], kodeSurat: "", tglSurat: "", kpsId: "", lampiran: null,
    dibuat: new Date(), bukti: {}, verifId: "", tglVerif: "", lampiranAju: [], induk: "", sinta: JSON.stringify(m) };
  simpanKegiatan(baru);
  C.perKunci[kunci] = ambilKegiatan(baru.id);
}
/** Ringkasan profil SINTA per dosen (artikel, sitasi, h-index per indeks) → Pengaturan "sintaStat". */
function simpanStatSinta(st, kini) {
  if (!st || typeof st !== "object") return;
  var L = jsonDari(pengaturan("sintaStat", ""), {}) || {}, n = 0, ang = function (v) { var x = Math.round(Number(v)); return isFinite(x) && x >= 0 && x < 1e8 ? x : 0; };
  Object.keys(st).slice(0, 200).forEach(function (id) {
    if (!/^\d{3,12}$/.test(id) || !st[id]) return;
    var r = { w: kini };
    ["scopus", "gs", "wos"].forEach(function (s) { var v = st[id][s]; if (v && typeof v === "object") r[s] = { artikel: ang(v.artikel), sitasi: ang(v.sitasi), dok: ang(v.dok), h: ang(v.h), i10: ang(v.i10), g: ang(v.g) }; });
    L[id] = r; n++;
  });
  if (n) simpanPengaturan("sintaStat", L, "Ringkasan profil SINTA per dosen (artikel, sitasi, h-index)");
}

/* ---------- aksi Admin ---------- */

function aksiSintaData(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_DP_LIHAT);
  var L = dosenSinta(), jml = {};
  semuaKegiatan().forEach(function (k) { var s = jsonDari(k.sinta, null); if (!s) return; [k.olehId].concat(k.pegawai).forEach(function (u) { jml[u] = jml[u] || { penelitian: 0, pkm: 0, publikasi: 0, disetujui: 0 }; jml[u][k.jenis] = (jml[u][k.jenis] || 0) + 1; if (k.status === "disetujui") jml[u].disetujui++; }); });
  var st = jsonDari(pengaturan("sintaStat", ""), {}) || {};
  return { dosen: L.map(function (x) { return Object.assign(x, { dtps: x.status === STATUS_DTPS, jumlah: jml[x.id] || { penelitian: 0, pkm: 0, publikasi: 0, disetujui: 0 }, stat: x.sinta && st[x.sinta] || null }); }),
    terakhir: jsonDari(pengaturan("sintaTerakhir", ""), null), bolehTarik: punyaPeran(p, PERAN_SINTA), url: SINTA_URL };
}
function aksiSintaIdSimpan(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SINTA);
  var uid = teks(d.userId), s = teks(d.sintaId).trim();
  if (s && !/^\d{3,12}$/.test(s)) throw galat("ID SINTA berupa angka, contoh: 6810293 (lihat alamat halaman profil SINTA).");
  return kunciTulis(function () {
    var u = cari("Pengguna", function (x) { return x.id === uid; });
    if (!u || jenisBiodata(u) !== "pegawai") throw galat("Dosen tidak ditemukan.");
    var lain = s ? cari("BiodataPegawai", function (b) { return b.userId !== uid && idSintaDari(b.sinta) === s; }) : null;
    if (lain) { var ul = cari("Pengguna", function (x) { return x.id === lain.userId; }); throw galat("ID SINTA " + s + " sudah dipakai " + (ul ? ul.nama : "akun lain") + "."); }
    var b = cari("BiodataPegawai", function (x) { return x.userId === uid; });
    if (b) ubah("BiodataPegawai", b, { sinta: s, diubahPada: new Date() }); else tambah("BiodataPegawai", { userId: uid, sinta: s, diubahPada: new Date() });
    catat(p.id, "sinta.id", { userId: uid });
    return aksiSintaData({}, token);
  });
}
/** Kode sekali pakai (30 menit) untuk skrip di tab SINTA. */
function aksiSintaMulai(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SINTA);
  var L = dosenSinta().filter(function (x) { return x.sinta && x.status === STATUS_DTPS; });
  if (!L.length) throw galat("Belum ada DTPS yang punya ID SINTA. Isi ID SINTA dosen dulu di tabel di bawah.");
  var kode = acak(24);
  CacheService.getScriptCache().put("sinta:" + kode, JSON.stringify({ u: p.id, w: new Date().toISOString() }), 1800);
  catat(p.id, "sinta.mulai", { dosen: L.length });
  return { kode: kode, dosen: L.length, url: SINTA_URL };
}

/* ---------- aksi dari skrip di tab SINTA (tanpa token; memakai kode) ---------- */

function aksiSintaDaftar(d) {
  kodeSintaSah(d.kode);
  return { dosen: dosenSinta().filter(function (x) { return x.sinta && x.status === STATUS_DTPS; }).map(function (x) { return { sinta: x.sinta, nama: x.nama }; }) };
}
/** Petakan "Sumber dana" aplikasi dari skema SINTA (dosen tetap bisa mengubahnya). */
function sumberDanaSinta(jenis, skema) {
  var def = jenisDef(jenis), f = def ? def.fx.filter(function (x) { return x.l === "Sumber dana"; })[0] : null;
  if (!f) return "";
  var pilih = function (awal) { return f.o.filter(function (o) { return o.indexOf(awal) === 0; })[0] || ""; };
  var s = teks(skema).toUpperCase();
  if (/INSTITUSI INTERNAL/.test(s)) return pilih("Perguruan Tinggi");
  if (/LUAR NEGERI/.test(s)) return pilih("Luar negeri");
  if (/KERJASAMA LEMBAGA|KEMENTERIAN|DIKTI|BRIN|PEMDA|INDUSTRI/.test(s)) return pilih("Dalam negeri");
  return "";
}
function aksiSintaKirim(d) {
  var info = kodeSintaSah(d.kode), item = Array.isArray(d.item) ? d.item.slice(0, 120) : [];
  return kunciTulis(function () {
    var ps = petaSinta(), keUser = {}; Object.keys(ps).forEach(function (u) { keUser[ps[u]] = u; });
    var abaikan = jsonDari(pengaturan("sintaAbaikan", ""), []) || [], kini = new Date().toISOString();
    var semuaK = semuaKegiatan(), perKunci = {}, perJudul = {};
    semuaK.forEach(function (k) {
      var s = jsonDari(k.sinta, null); if (s && s.k) perKunci[s.k] = k;
      if (k.jenis === "penelitian" || k.jenis === "pkm" || k.jenis === "publikasi") (perJudul[k.jenis + "|" + normalJudul(k.judul)] = perJudul[k.jenis + "|" + normalJudul(k.judul)] || []).push(k);
    });
    var h = { baru: 0, sudah: 0, tertaut: 0, ditandai: 0, diabaikan: 0, dilewati: 0, sitasi: 0 };
    var tagDari = function (x) { var tag = [], tambahTag = function (s) { var u = keUser[teks(s)]; if (u && tag.indexOf(u) < 0) tag.push(u); };
      tambahTag(x.dari); tambahTag(x.ketuaSinta); (Array.isArray(x.anggota) ? x.anggota : []).forEach(function (a) { tambahTag(a && a.sinta); }); return tag; };
    var C = { abaikan: abaikan, perKunci: perKunci, perJudul: perJudul, kini: kini, info: info, tag: tagDari };
    simpanStatSinta(d.statistik, kini);
    item.forEach(function (x) {
      if (x && x.jenis === "publikasi") { kirimPubSinta(x, C, h); return; }
      var jenis = x.jenis === "pkm" ? "pkm" : x.jenis === "penelitian" ? "penelitian" : "", judul = potong(x.judul, 300).trim(), tahun = Number(x.tahun) || 0;
      if (!jenis || !judul || !(tahun >= 1990 && tahun <= 2100) || /tolak|reject/i.test(teks(x.status))) { h.dilewati++; return; }
      var kunci = kunciSinta(jenis, tahun, judul);
      if (abaikan.indexOf(kunci) >= 0) { h.diabaikan++; return; }
      // dosen UPW yang terlibat: pemilik profil, anggota ber-ID SINTA, ketua (bila dikenali skrip)
      var tag = [], tambahTag = function (s) { var u = keUser[teks(s)]; if (u && tag.indexOf(u) < 0) tag.push(u); };
      tambahTag(x.dari); tambahTag(x.ketuaSinta); (Array.isArray(x.anggota) ? x.anggota : []).forEach(function (a) { tambahTag(a && a.sinta); });
      if (!tag.length) { h.dilewati++; return; }
      var meta = { k: kunci, ketua: potong(x.ketua, 150), skema: potong(x.skema, 120), sumber: potong(x.sumber, 60), dana: Math.max(0, Math.round(Number(x.dana) || 0)), tahun: tahun,
        anggota: (Array.isArray(x.anggota) ? x.anggota : []).slice(0, 60).map(function (a) { return potong(a && a.nama, 120); }), pada: kini, terakhir: kini };
      var k = perKunci[kunci];
      if (!k) {   // judul sama yang sudah dicatat dosen sendiri (tahun ±1) → ditautkan, tidak dibuat baru
        var c = (perJudul[jenis + "|" + normalJudul(judul)] || []).filter(function (y) { return !jsonDari(y.sinta, null) && (!y.tgl || Math.abs(Number(y.tgl.slice(0, 4)) - tahun) <= 1); })[0];
        if (c) { k = c; h.tertaut++; } else h.baru++;
      } else h.sudah++;
      if (k) {
        var lama = jsonDari(k.sinta, null) || {};
        meta.pada = lama.pada || kini;
        var bisaTag = k.status === "draf" || k.status === "revisi", nb = 0;
        if (bisaTag) tag.forEach(function (u) { if (k.pegawai.indexOf(u) < 0 && k.olehId !== u) { k.pegawai.push(u); nb++; } });
        h.ditandai += nb;
        k.sinta = JSON.stringify(meta);
        if (nb || !lama.k) k.riwayat.push({ w: kini, o: info.u, a: "sinta", c: nb ? nb + " dosen ditandai dari SINTA" : "ditautkan ke SINTA" });
        simpanKegiatan(k);
        return;
      }
      var ketua = keUser[teks(x.ketuaSinta)] || tag[0], isian = {};
      var sd = sumberDanaSinta(jenis, meta.skema); if (sd) isian["Sumber dana"] = sd;
      if (meta.dana) isian["Jumlah dana (Rp)"] = String(meta.dana);
      if (jenis === "pkm") isian["Tahap PkM"] = "Pelaksanaan";
      var baru = { id: "k" + acak(10), jenis: jenis, jenisLain: "", judul: judul, tgl: "", sampai: "", tingkat: "", olehId: ketua, kelompok: "dosen",
        pegawai: tag.filter(function (u) { return u !== ketua; }), kelas: [], mhs: [], excl: [], pendampingId: "", isian: isian, gcet: [], perluST: false,
        tempat: "", aktivitas: "", ket: potong("Dari SINTA " + tahun + ": ketua " + meta.ketua + "; " + meta.skema, 300), bentuk: "", kegDosen: "",
        st: "tanpa", status: "draf", riwayat: [{ w: kini, o: info.u, a: "sinta", c: "dibuat dari SINTA" }], kodeSurat: "", tglSurat: "", kpsId: "", lampiran: null,
        dibuat: new Date(), bukti: {}, verifId: "", tglVerif: "", lampiranAju: [], induk: "", sinta: JSON.stringify(meta) };
      simpanKegiatan(baru);
      perKunci[kunci] = ambilKegiatan(baru.id);
    });
    if (d.selesai) {
      simpanPengaturan("sintaTerakhir", { w: kini, oleh: info.u, ringkas: d.ringkas && typeof d.ringkas === "object" ? { dosen: Number(d.ringkas.dosen) || 0, item: Number(d.ringkas.item) || 0,
        gagal: (Array.isArray(d.ringkas.gagal) ? d.ringkas.gagal : []).slice(0, 30).map(function (g) { return potong(g, 120); }), baru: Number(d.ringkas.baru) || 0 } : null }, "Penarikan data SINTA terakhir");
      catat(info.u, "sinta.tarik", d.ringkas || {});
    }
    return h;
  });
}
/** Kegiatan dari SINTA: semua dosen yang tertandai berhak mengubah/menghapus (bukan hanya pencatat). */
function pemilikKegiatan(k, p) { return k.olehId === p.id || (!!jsonDari(k.sinta, null) && k.pegawai.indexOf(p.id) >= 0); }
/** Draf SINTA yang dihapus tidak dibuat lagi pada penarikan berikutnya. */
function abaikanSinta(k) {
  var s = jsonDari(k.sinta, null); if (!s || !s.k) return;
  var l = jsonDari(pengaturan("sintaAbaikan", ""), []) || [];
  if (l.indexOf(s.k) < 0) l.push(s.k);
  simpanPengaturan("sintaAbaikan", l.slice(-2000), "Judul SINTA yang dihapus dosen (tidak ditarik lagi)");
}
/** Beranda dosen: data SINTA yang perlu dilengkapi. */
function tugasSinta(p) {
  var n = 0;
  semuaKegiatan().forEach(function (k) { if (k.status === "draf" && jsonDari(k.sinta, null) && (k.olehId === p.id || k.pegawai.indexOf(p.id) >= 0)) n++; });
  return n ? { sintaLengkapi: n } : {};
}
