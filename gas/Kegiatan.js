/**
 * Kegiatan, penandaan peserta, dan pengajuan surat tugas ke KPS (v0.3.0).
 *
 * Alur surat (kolom st): draf_aju → menunggu_kps → terbit | ditunda | revisi_aju | ditolak_aju.
 *   Tanpa surat tugas: st = "tanpa".
 * Alur data akreditasi (kolom status): draf → diajukan → revisi → diajukan_ulang → disetujui | ditolak (lihat Bukti.js).
 * Saat KPS menyetujui, isi surat dan daftar peserta dibekukan di kolom lampiran, agar surat yang sudah terbit tidak berubah.
 */
var ST_SAH = ["draf_aju", "menunggu_kps", "ditunda", "revisi_aju", "ditolak_aju", "terbit", "tanpa"];
var KEPUTUSAN_KPS = ["terbit", "ditunda", "revisi_aju", "ditolak_aju"];
var PERAN_KEGIATAN = ["mahasiswa", "dosen", "tendik", "kalab", "laboran", "kps", "admin", "superadmin"];
var PERAN_LIHAT_SEMUA = ["superadmin", "admin", "kps"];

function benar(v) { return v === true || v === "TRUE"; }
function jsonDari(v, bawaan) { if (v === "" || v === null || v === undefined) return bawaan; try { return JSON.parse(v); } catch (e) { return bawaan; } }
function hariIni() { return Utilities.formatDate(new Date(), "Asia/Makassar", "yyyy-MM-dd"); }
function tanggalSah(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  var d = new Date(s + "T12:00:00Z");
  return !isNaN(d) && d.toISOString().slice(0, 10) === s;
}
function keTanggal(s) { return new Date(s + "T12:00:00+08:00"); }
function teksTgl(v) {
  if (v instanceof Date) return Utilities.formatDate(v, "Asia/Makassar", "yyyy-MM-dd");
  return teks(v);
}

/** Kelompok pencatat: mahasiswa | dosen (dosen, tendik, kalab, laboran) | admin (admin, kps, superadmin). */
function kelompokDari(peran) {
  if (peran === "mahasiswa") return "mahasiswa";
  if (["admin", "kps", "superadmin"].indexOf(peran) >= 0) return "admin";
  return "dosen";
}
function peranPencatat(p, diminta) {
  var r = peranDari(p).filter(function (x) { return PERAN_KEGIATAN.indexOf(x) >= 0; });
  if (!r.length) throw galat("Anda tidak memiliki izin untuk tindakan ini.");
  return r.indexOf(diminta) >= 0 ? diminta : r[0];
}
function jenisUntuk(kelompok) { return JENIS_KEG.filter(function (j) { return j.who.indexOf(kelompok) >= 0; }); }
function jenisDef(k) { for (var i = 0; i < JENIS_KEG.length; i++) if (JENIS_KEG[i].k === k) return JENIS_KEG[i]; return null; }

/* ---------- orang ---------- */

/** Indeks semua akun aktif/impor yang bisa ditandai. */
function indeksOrang() {
  var idx = { byId: {}, mhs: [], pegawai: [] }, ins = {};
  semua("BiodataPegawai").forEach(function (b) { ins[b.userId] = teks(b.inisial); });
  semua("Pengguna").forEach(function (x) {
    if (x.status === "nonaktif") return;
    var j = jenisBiodata(x), r = peranDari(x);
    var o = { id: x.id, username: String(x.username), nama: x.nama, peran: r };
    if (j === "mahasiswa") {
      o.jenis = "mahasiswa"; o.masuk = x.masuk ? Number(x.masuk) : null; o.kelas = teks(x.kelas); o.statusMhs = teks(x.statusMhs) || "A";
      idx.mhs.push(o);
    } else if (j === "pegawai") {
      o.jenis = r.indexOf("dosen") >= 0 ? "dosen" : "tendik"; o.inisial = ins[x.id] || "";
      idx.pegawai.push(o);
    } else o.jenis = "lain";
    idx.byId[x.id] = o;
  });
  return idx;
}
function kunciKelas(m) { return m.masuk + "-" + m.kelas; }
function daftarKelas(idx) {
  var g = {};
  idx.mhs.forEach(function (m) {
    if (m.statusMhs !== "A" || !m.masuk || !m.kelas) return;
    var k = kunciKelas(m);
    if (!g[k]) g[k] = { key: k, masuk: m.masuk, kelas: m.kelas, n: 0, semester: semesterMhs(m.masuk) };
    g[k].n++;
  });
  return Object.keys(g).sort().map(function (k) { return g[k]; });
}

/** Mahasiswa peserta: per kelas (kecuali yang dikecualikan) ditambah yang dipilih satu per satu. */
function mhsPeserta(k, idx) {
  var excl = k.excl || [], ada = {}, l = [];
  var s = k.tgl && tanggalSah(k.tgl) ? semesterInfo(keTanggal(k.tgl)) : semesterInfo();
  function tambahkan(m) {
    if (!m || ada[m.id]) return;
    ada[m.id] = true;
    l.push({ id: m.id, nim: m.username, nama: m.nama, masuk: m.masuk, kelas: m.kelas, semester: semesterMhs(m.masuk, s) });
  }
  (k.kelas || []).forEach(function (key) {
    idx.mhs.forEach(function (m) { if (m.statusMhs === "A" && kunciKelas(m) === key && excl.indexOf(m.id) < 0) tambahkan(m); });
  });
  (k.mhs || []).forEach(function (id) { tambahkan(idx.byId[id] && idx.byId[id].jenis === "mahasiswa" ? idx.byId[id] : null); });
  return l;
}
function pegawaiPeserta(k, idx) {
  return (k.pegawai || []).map(function (id) { return idx.byId[id]; }).filter(function (o) { return o && (o.jenis === "dosen" || o.jenis === "tendik"); })
    .map(function (o) { return { id: o.id, nip: o.username, nama: o.nama, jenis: o.jenis }; });
}

/* ---------- baca/tulis ---------- */

function kegiatanDari(r) {
  return { _baris: r._baris, _r: r, id: r.id, jenis: r.jenis, jenisLain: teks(r.jenisLain), judul: teks(r.judul), tgl: teksTgl(r.tgl), sampai: teksTgl(r.sampai),
    tingkat: teks(r.tingkat), olehId: r.olehId, kelompok: r.kelompok, pegawai: jsonDari(r.pegawai, []), kelas: jsonDari(r.kelas, []),
    mhs: jsonDari(r.mhs, []), excl: jsonDari(r.excl, []), pendampingId: teks(r.pendampingId), isian: jsonDari(r.isian, {}), gcet: jsonDari(r.gcet, []),
    perluST: benar(r.perluST), tempat: teks(r.tempat), aktivitas: teks(r.aktivitas), ket: teks(r.ket), bentuk: teks(r.bentuk), kegDosen: teks(r.kegDosen),
    st: r.st, status: r.status, riwayat: jsonDari(r.riwayat, []), kodeSurat: teks(r.kodeSurat), tglSurat: r.tglSurat ? new Date(r.tglSurat).toISOString() : "",
    kpsId: teks(r.kpsId), lampiran: jsonDari(r.lampiran, null), dibuat: r.dibuat, diubah: r.diubah, dihapus: r.dihapus,
    bukti: jsonDari(r.bukti, {}), verifId: teks(r.verifId), tglVerif: r.tglVerif ? new Date(r.tglVerif).toISOString() : "" };
}
function semuaKegiatan() { return semua("Kegiatan").filter(function (r) { return !r.dihapus; }).map(kegiatanDari); }
function ambilKegiatan(id) {
  var r = cari("Kegiatan", function (x) { return x.id === id; });
  if (!r || r.dihapus) throw galat("Kegiatan tidak ditemukan.");
  return kegiatanDari(r);
}
function barisKegiatan(k) {
  return { id: k.id, jenis: k.jenis, jenisLain: k.jenisLain, judul: k.judul, tgl: k.tgl, sampai: k.sampai, tingkat: k.tingkat, olehId: k.olehId,
    kelompok: k.kelompok, pegawai: JSON.stringify(k.pegawai), kelas: JSON.stringify(k.kelas), mhs: JSON.stringify(k.mhs), excl: JSON.stringify(k.excl),
    pendampingId: k.pendampingId, isian: JSON.stringify(k.isian), gcet: JSON.stringify(k.gcet), perluST: !!k.perluST, tempat: k.tempat,
    aktivitas: k.aktivitas, ket: k.ket, bentuk: k.bentuk, kegDosen: k.kegDosen, st: k.st, status: k.status, riwayat: JSON.stringify(k.riwayat),
    kodeSurat: k.kodeSurat, tglSurat: k.tglSurat ? new Date(k.tglSurat) : "", kpsId: k.kpsId, lampiran: k.lampiran ? JSON.stringify(k.lampiran) : "",
    dibuat: k.dibuat || new Date(), diubah: new Date(), dihapus: "",
    bukti: JSON.stringify(k.bukti || {}), verifId: k.verifId || "", tglVerif: k.tglVerif ? new Date(k.tglVerif) : "" };
}
function simpanKegiatan(k) {
  var obj = barisKegiatan(k);
  if (k._r) {
    var sh = sheet("Kegiatan");
    sh.getRange(k._baris, 1, 1, kolomDari("Kegiatan").length).setValues([barisDari("Kegiatan", obj)]);
  } else tambah("Kegiatan", obj);
}

function bisaDiubah(k) {
  return ["draf_aju", "revisi_aju", "ditunda"].indexOf(k.st) >= 0 || (k.st === "tanpa" && (k.status === "draf" || k.status === "revisi"));
}
function terlibat(k, p, idx) {
  if (k.olehId === p.id || k.pendampingId === p.id || k.pegawai.indexOf(p.id) >= 0) return true;
  return mhsPeserta(k, idx).some(function (m) { return m.id === p.id; });
}
function boleLihatSemua(p) { return punyaPeran(p, PERAN_LIHAT_SEMUA); }

/* ---------- surat ---------- */

function pengaturanSurat() {
  var m = {};
  semua("Pengaturan").forEach(function (x) { m[x.kunci] = x.nilai; });
  var kps = semua("Pengguna").filter(function (x) { return x.status !== "nonaktif" && peranDari(x).indexOf("kps") >= 0; })[0];
  return {
    unit: teks(m.unitKerja) || "Prodi Usaha Perjalanan Wisata",
    tempat: teks(m.tempatSurat) || "Nusa Dua",
    sapaanDosen: teks(m.sapaanDosen) || "Bapak",
    tujuanDosen: teks(m.tujuanDosen) || "Kepala Bagian Administrasi Umum",
    tujuanMhs: teks(m.tujuanMhs) || "Kabag. Administrasi Akademik, Kemahasiswaan dan Kerjasama",
    hk: Math.max(1, Math.min(30, Number(m.batasHariKerja) || 5)),
    libur: (m.hariLibur instanceof Date ? teksTgl(m.hariLibur) : teks(m.hariLibur)).split(/[\s,;]+/).filter(tanggalSah),
    kps: kps ? { nama: kps.nama, nip: String(kps.username) } : null
  };
}
/** Isi surat + peserta. Setelah terbit, yang dipakai adalah salinan beku di kolom lampiran. */
function lampiranSurat(k, idx, set) {
  var mhs = mhsPeserta(k, idx), peg = pegawaiPeserta(k, idx);
  return {
    surat: { dosen: k.perluST && k.kelompok !== "mahasiswa" && peg.length > 0, mhs: k.perluST && mhs.length > 0 },
    isi: { judul: k.judul, tgl: k.tgl, sampai: k.sampai, tempat: k.tempat, aktivitas: k.aktivitas, ket: k.ket, bentuk: k.bentuk, kegDosen: k.kegDosen },
    mhs: mhs.map(function (m) { return { nim: m.nim, nama: m.nama, semester: m.semester, kelas: m.kelas }; }),
    pegawai: peg.map(function (o) { return { nip: o.nip, nama: o.nama, jenis: o.jenis }; }),
    set: { unit: set.unit, tempat: set.tempat, sapaanDosen: set.sapaanDosen, tujuanDosen: set.tujuanDosen, tujuanMhs: set.tujuanMhs },
    kps: set.kps
  };
}
function buatKodeSurat() {
  var ada = {};
  semua("Kegiatan").forEach(function (r) { if (r.kodeSurat) ada[r.kodeSurat] = true; });
  var kode;
  do { kode = "UPW-" + Utilities.formatDate(new Date(), "Asia/Makassar", "yyyyMM").slice(2) + "-" + Utilities.getUuid().replace(/-/g, "").slice(0, 8).toUpperCase(); } while (ada[kode]);
  return kode;
}

/** Data kegiatan yang dikirim ke tampilan. */
function kegiatanKeKlien(k, p, idx, lengkap, set) {
  set = set || pengaturanSurat();
  var mhs = mhsPeserta(k, idx), oleh = idx.byId[k.olehId], def = jenisDef(k.jenis), s = k.tgl && tanggalSah(k.tgl) ? semesterInfo(keTanggal(k.tgl)) : null;
  var o = { id: k.id, jenis: k.jenis, jenisLabel: def ? def.l : k.jenis, tabel: def ? def.t : "", jenisLain: k.jenisLain, judul: k.judul, tgl: k.tgl,
    sampai: k.sampai, tingkat: k.tingkat, olehId: k.olehId, olehNama: oleh ? oleh.nama : "(akun dihapus)", kelompok: k.kelompok,
    pegawai: k.pegawai, kelas: k.kelas, mhs: k.mhs, excl: k.excl, pendampingId: k.pendampingId, isian: k.isian, gcet: k.gcet, perluST: k.perluST,
    tempat: k.tempat, aktivitas: k.aktivitas, ket: k.ket, bentuk: k.bentuk, kegDosen: k.kegDosen, st: k.st, status: k.status,
    kodeSurat: k.kodeSurat, tglSurat: k.tglSurat, semester: s ? s.label : "", jumlahMhs: mhs.length, jumlahPegawai: pegawaiPeserta(k, idx).length,
    milikSaya: k.olehId === p.id, bisaUbah: k.olehId === p.id && bisaDiubah(k),
    bisaHapus: k.olehId === p.id && (k.st === "draf_aju" || (k.st === "tanpa" && k.status === "draf")),
    riwayat: k.riwayat.map(function (r) { var x = idx.byId[r.o]; return { waktu: r.w, oleh: x ? x.nama : "", aksi: r.a, catatan: r.c || "" }; }) };
  var bk = buktiKeKlien(k, p, idx, set, lengkap);
  Object.keys(bk).forEach(function (c) { o[c] = bk[c]; });
  if (lengkap) o.lampiran = k.st === "terbit" && k.lampiran ? k.lampiran : lampiranSurat(k, idx, set);
  return o;
}

/* ---------- validasi ---------- */

function idSah(daftar, idx, jenis, pesan, maks) {
  if (!Array.isArray(daftar)) return [];
  var l = [];
  daftar.forEach(function (id) {
    var o = idx.byId[String(id)];
    if (!o || jenis.indexOf(o.jenis) < 0) throw galat(pesan);
    if (l.indexOf(o.id) < 0) l.push(o.id);
  });
  if (l.length > maks) throw galat("Terlalu banyak orang ditandai (maksimal " + maks + ").");
  return l;
}
function potong(v, n) { return teks(v).slice(0, n); }

/** Isian akreditasi: tingkat, kolom khusus jenis, dan pasal GCET. */
function bersihkanAkreditasi(x, def) {
  var isian = x.isian && typeof x.isian === "object" ? x.isian : {}, o = { tingkat: TINGKAT.indexOf(x.tingkat) >= 0 ? x.tingkat : "", isian: {} };
  (def ? def.fx : []).forEach(function (f) { var v = potong(isian[f.l], 300); if (v) o.isian[f.l] = v; });
  o.gcet = (Array.isArray(x.gcet) ? x.gcet : []).map(Number).filter(function (n, i, a) { return n >= 1 && n <= 10 && Math.floor(n) === n && a.indexOf(n) === i; }).sort(function (a, b) { return a - b; });
  return o;
}

function bersihkanKegiatan(x, kelompok, p, idx, kirim) {
  var izin = jenisUntuk(kelompok), def = jenisDef(String(x.jenis || ""));
  if (!def || izin.indexOf(def) < 0) throw galat("Jenis kegiatan tidak tersedia untuk peran Anda.");
  var k = { jenis: def.k, judul: potong(x.judul, 300), jenisLain: def.k === "lainnya" ? potong(x.jenisLain, 150) : "" };
  if (!k.judul) throw galat("Isi judul / nama kegiatan.");
  k.tgl = teks(x.tgl); k.sampai = teks(x.sampai) || k.tgl;
  if (k.tgl && !tanggalSah(k.tgl)) throw galat("Tanggal mulai tidak valid.");
  if (k.sampai && !tanggalSah(k.sampai)) throw galat("Tanggal selesai tidak valid.");
  if (k.tgl && k.sampai < k.tgl) throw galat("Tanggal selesai tidak boleh sebelum tanggal mulai.");
  var ak = bersihkanAkreditasi(x, def);
  k.tingkat = ak.tingkat; k.isian = ak.isian; k.gcet = ak.gcet;
  k.pegawai = idSah(x.pegawai, idx, ["dosen", "tendik"], "Ada dosen/tendik yang ditandai tetapi tidak ditemukan.", 100);
  k.mhs = idSah(x.mhs, idx, ["mahasiswa"], "Ada mahasiswa yang ditandai tetapi tidak ditemukan.", 400);
  k.excl = idSah(x.excl, idx, ["mahasiswa"], "Ada mahasiswa yang dikecualikan tetapi tidak ditemukan.", 400);
  var kelasAda = daftarKelas(idx).map(function (c) { return c.key; });
  k.kelas = (Array.isArray(x.kelas) ? x.kelas : []).map(String).filter(function (c, i, a) { return a.indexOf(c) === i; });
  k.kelas.forEach(function (c) { if (kelasAda.indexOf(c) < 0) throw galat("Kelas " + c + " tidak ditemukan."); });
  if (kelompok === "mahasiswa" && mhsPeserta(k, idx).every(function (m) { return m.id !== p.id; })) k.mhs.unshift(p.id);
  k.pendampingId = "";
  if (kelompok === "mahasiswa" && def.k.indexOf("prestasi") === 0) {
    var pd = idx.byId[teks(x.pendampingId)];
    if (x.pendampingId && (!pd || pd.jenis !== "dosen")) throw galat("Dosen pendamping tidak ditemukan.");
    if (pd) k.pendampingId = pd.id;
    if (kirim && !k.pendampingId) throw galat("Pilih dosen pendamping. Kegiatan lomba diverifikasi oleh dosen pendamping.");
  }
  k.perluST = !!x.perluST;
  k.tempat = potong(x.tempat, 200); k.aktivitas = potong(x.aktivitas, 300); k.ket = potong(x.ket, 300);
  k.bentuk = potong(x.bentuk, 200); k.kegDosen = potong(x.kegDosen, 300);
  if (kirim) {
    if (def.k === "lainnya" && !k.jenisLain) throw galat("Sebutkan jenis kegiatannya (pilihan Lainnya).");
    if (!k.tgl) throw galat("Isi tanggal mulai kegiatan.");
    if (!k.tingkat) throw galat("Pilih tingkat kegiatan.");
    if (k.perluST) {
      var adaMhs = mhsPeserta(k, idx).length > 0, adaDsn = kelompok !== "mahasiswa" && k.pegawai.length > 0;
      if (!adaMhs && !adaDsn) throw galat(kelompok === "mahasiswa" ? "Tandai minimal satu mahasiswa untuk surat tugas." : "Tandai minimal satu dosen/tendik atau mahasiswa untuk surat tugas.");
      if (!k.tempat) throw galat("Isi tempat kegiatan untuk surat.");
      if (adaDsn && !k.bentuk) throw galat("Isi bentuk kegiatan untuk surat penugasan dosen/tendik.");
    }
  }
  return k;
}

/* ---------- aksi ---------- */

function aksiKegiatanRef(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_KEGIATAN.concat(["asesor"]));
  var peran = punyaPeran(p, PERAN_KEGIATAN) ? peranPencatat(p, d.peran) : "";
  var kel = peran ? kelompokDari(peran) : "";
  var idx = indeksOrang(), set = pengaturanSurat();
  return {
    peran: peran, kelompok: kel,
    jenis: JENIS_KEG.map(function (j) { return { k: j.k, l: j.l, t: j.t, ex: j.ex, bukti: j.bukti, cth: j.cth, kw: j.kw, fx: j.fx, boleh: kel ? j.who.indexOf(kel) >= 0 : false }; }),
    gcet: GCET, gcetKw: GCET_KW, tingkat: TINGKAT, tanpaSt: TANPA_ST,
    pegawai: idx.pegawai.map(function (o) { return { id: o.id, nama: o.nama, username: o.username, jenis: o.jenis, inisial: o.inisial }; }),
    mhs: idx.mhs.filter(function (m) { return m.statusMhs === "A"; }).map(function (m) { return { id: m.id, nama: m.nama, username: m.username, masuk: m.masuk, kelas: m.kelas, semester: semesterMhs(m.masuk) }; }),
    kelas: daftarKelas(idx), surat: set, hariIni: hariIni(), semesterKini: semesterInfo()
  };
}

function aksiKegiatanDaftar(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_KEGIATAN);
  var semuaJ = d.lingkup === "semua";
  if (semuaJ && !boleLihatSemua(p)) throw galat("Anda tidak memiliki izin untuk tindakan ini.");
  var idx = indeksOrang();
  var l = semuaKegiatan().filter(function (k) { return semuaJ ? !(k.st === "draf_aju" || (k.st === "tanpa" && k.status === "draf")) || k.olehId === p.id : terlibat(k, p, idx); });
  l.sort(function (a, b) { return (b.tgl || "9").localeCompare(a.tgl || "9") || String(b.dibuat).localeCompare(String(a.dibuat)); });
  var set = pengaturanSurat();
  return { kegiatan: l.map(function (k) { return kegiatanKeKlien(k, p, idx, false, set); }) };
}

function aksiKegiatanDetail(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_KEGIATAN);
  var k = ambilKegiatan(String(d.id || "")), idx = indeksOrang();
  if (!terlibat(k, p, idx) && !boleLihatSemua(p)) throw galat("Anda tidak memiliki izin untuk melihat kegiatan ini.");
  return { kegiatan: kegiatanKeKlien(k, p, idx, true) };
}

function aksiKegiatanSimpan(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_KEGIATAN);
  var x = d.data || {}, kirim = !!d.kirim;
  return kunciTulis(function () {
    var idx = indeksOrang(), lama = null, kel;
    if (x.id) {
      lama = ambilKegiatan(String(x.id));
      if (lama.olehId !== p.id) throw galat("Hanya pengaju yang bisa mengubah kegiatan ini.");
      if (!bisaDiubah(lama)) throw galat("Kegiatan ini tidak bisa diubah lagi pada tahap sekarang.");
      kel = lama.kelompok;
    } else kel = kelompokDari(peranPencatat(p, d.peran));
    var b = bersihkanKegiatan(x, kel, p, idx, kirim);
    var k = lama || { id: "k" + acak(10), olehId: p.id, kelompok: kel, riwayat: [], status: "draf", st: "", kodeSurat: "", tglSurat: "", kpsId: "", lampiran: null, dibuat: new Date(), bukti: {} };
    Object.keys(b).forEach(function (c) { k[c] = b[c]; });
    var dulu = lama ? lama.st : "", statusDulu = lama ? lama.status : "draf";
    if (k.perluST) {
      if (lama && lama.st === "tanpa" && statusDulu === "revisi") throw galat("Data ini sedang direvisi. Perbaiki tanpa mengubah pilihan surat tugas.");
      k.st = kirim ? "menunggu_kps" : (["revisi_aju", "ditunda"].indexOf(dulu) >= 0 ? dulu : "draf_aju");
      k.status = "draf";
      if (Object.keys(k.bukti || {}).length) throw galat("Kegiatan ini sudah punya bukti terunggah. Batalkan dulu bukti tersebut sebelum beralih ke pengajuan surat tugas.");
    } else {
      k.st = "tanpa";
      k.status = statusDulu === "revisi" ? "revisi" : "draf";
      if (kirim) {
        var sb = statBukti(k, idx);
        if (!sb.lengkap) throw galat("Simpan dulu, lalu lengkapi bukti di halaman detail (" + sb.ada + " dari " + sb.perlu + " dokumen wajib sudah ada).");
        k.status = statusDulu === "revisi" ? "diajukan_ulang" : "diajukan";
      }
    }
    if (!lama) k.riwayat.push({ w: new Date().toISOString(), o: p.id, a: "buat" });
    if (kirim) k.riwayat.push({ w: new Date().toISOString(), o: p.id, a: !k.perluST ? (statusDulu === "revisi" ? "ajukan_ulang_data" : "ajukan_data") : ["revisi_aju", "ditunda"].indexOf(dulu) >= 0 ? "ajukan_ulang" : "ajukan" });
    simpanKegiatan(k);
    catat(p.id, kirim ? "kegiatan.ajukan" : "kegiatan.simpan", { id: k.id, st: k.st });
    return { kegiatan: kegiatanKeKlien(ambilKegiatan(k.id), p, idx, true) };
  });
}

function aksiKegiatanHapus(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_KEGIATAN);
  return kunciTulis(function () {
    var k = ambilKegiatan(String(d.id || ""));
    if (k.olehId !== p.id) throw galat("Hanya pengaju yang bisa menghapus kegiatan ini.");
    if (!(k.st === "draf_aju" || (k.st === "tanpa" && k.status === "draf"))) throw galat("Hanya draf yang bisa dihapus.");
    ubah("Kegiatan", k._r, { dihapus: new Date() });
    catat(p.id, "kegiatan.hapus", { id: k.id });
    return {};
  });
}

function aksiKpsAntrean(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["kps"]);
  var idx = indeksOrang();
  var semuaK = semuaKegiatan(), set = pengaturanSurat();
  var l = semuaK.filter(function (k) { return k.st === "menunggu_kps" || k.st === "ditunda"; });
  l.sort(function (a, b) { return (a.tgl || "").localeCompare(b.tgl || ""); });
  return { kegiatan: l.map(function (k) { var o = kegiatanKeKlien(k, p, idx, true, set); o.tunggakan = tunggakanUntuk(k, semuaK, idx, set); return o; }) };
}

function aksiKpsPutuskan(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["kps"]);
  var kep = String(d.keputusan || ""), cat = potong(d.catatan, 1000);
  if (KEPUTUSAN_KPS.indexOf(kep) < 0) throw galat("Keputusan tidak dikenal.");
  if (kep !== "terbit" && !cat) throw galat("Tulis catatan untuk pengaju (wajib bila menunda, meminta revisi, atau menolak).");
  return kunciTulis(function () {
    var k = ambilKegiatan(String(d.id || ""));
    if (k.st !== "menunggu_kps" && k.st !== "ditunda") throw galat("Pengajuan ini sudah diputuskan atau belum dikirim.");
    var idx = indeksOrang();
    k.st = kep;
    k.riwayat.push({ w: new Date().toISOString(), o: p.id, a: kep, c: cat });
    if (kep === "terbit") {
      var set = pengaturanSurat();
      set.kps = { nama: p.nama, nip: String(p.username) }; // yang menyetujui
      k.kodeSurat = buatKodeSurat(); k.tglSurat = new Date().toISOString(); k.kpsId = p.id;
      k.lampiran = lampiranSurat(k, idx, set);
      k.lampiran.tglSurat = hariIni();
    }
    simpanKegiatan(k);
    catat(p.id, "kps.putuskan", { id: k.id, keputusan: kep });
    return { kegiatan: kegiatanKeKlien(ambilKegiatan(k.id), p, idx, true) };
  });
}

/** Cek keaslian surat dari kode verifikasi (tanpa login). Hanya data umum, tanpa daftar nama. */
function aksiSuratCek(d) {
  var kode = String(d.kode || "").trim().toUpperCase();
  if (!/^UPW-\d{4}-[0-9A-F]{8}$/.test(kode)) return { sah: false };
  var r = cari("Kegiatan", function (x) { return x.kodeSurat === kode; });
  if (!r || r.dihapus || r.st !== "terbit") return { sah: false };
  var k = kegiatanDari(r), l = k.lampiran || {};
  return { sah: true, kode: kode, judul: k.judul, tgl: k.tgl, sampai: k.sampai, tempat: k.tempat, tglSurat: l.tglSurat || "",
    kps: l.kps ? l.kps.nama : "", jumlahMhs: (l.mhs || []).length, jumlahPegawai: (l.pegawai || []).length };
}
