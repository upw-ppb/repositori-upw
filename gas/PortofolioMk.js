/**
 * Portofolio Mata Kuliah (v0.14.0): kelengkapan dokumen per MK per semester, diisi tim pengajar yang ditetapkan Admin (Data Prodi).
 * Data pendukung butir 8 (RPS), 22 (proses pembelajaran), dan 25 (penilaian).
 * Satu baris PortofolioMk per (semester, kodeMk); kolom isi = JSON:
 *   rps | kontrak | rubrik : { t: "file"|"tautan", fileId, nama, mime, ukuran, url, o, w }   — hanya pengampu utama (v0.28.0: pengampu utama setiap kelas)
 *   metode                 : { v: [metode...], lain: "", o, w }                                 — hanya pengampu utama
 *   integ                  : [{ id, teks, o, w }]                                               — setiap dosen anggota tim
 *   interaksi              : [{ id, t, fileId, nama, mime, ukuran, url, ket, o, w }]            — setiap dosen anggota tim
 * Diubah pada semester berjalan dan semester berikutnya; semester lampau hanya dilihat.
 * Admin Prodi / KPS / Super Admin melihat semua (rekap di Data Prodi); anggota tim melihat MK-nya.
 */
var KOMP_MKP = [
  { k: "rps", l: "RPS terbaru", h: "RPS semester ini: CPL, bahan kajian, metode, waktu dan tahapan, serta asesmen (butir 8)", u: true, jenis: "dok" },
  { k: "kontrak", l: "Kontrak kuliah", h: "Rencana penilaian yang disepakati dengan mahasiswa di pertemuan pertama (butir 25)", u: true, jenis: "dok" },
  { k: "rubrik", l: "Rubrik / portofolio penilaian", h: "Contoh: rubrik presentasi itinerary, lembar observasi praktik pemanduan (butir 25)", u: true, jenis: "dok" },
  { k: "metode", l: "Metode pembelajaran", h: "Pilih metode yang benar-benar dipakai (butir 22)", u: true, jenis: "metode" },
  { k: "integ", l: "Integrasi penelitian / PkM", h: "Contoh: mahasiswa menganalisis data penelitian dosen, atau tugas MK dilaksanakan di desa wisata mitra PkM (butir 22)", u: false, jenis: "catatan" },
  { k: "interaksi", l: "Bukti pembelajaran daring/luring", h: "Tautan kelas LMS, rekaman, atau dokumentasi foto/video dari sesi yang Anda ampu (butir 22)", u: false, jenis: "daftar" }
];
var METODE_MKP = ["Case based learning", "Project based learning", "Research based education (RBE)", "Industry based education (IBE)",
  "Teaching industry / factory", "Praktik lapangan di destinasi", "Daring / blended"];
var PERAN_MKP_REKAP = ["admin", "superadmin", "kps", "gkm"];
/** v0.43.0: tanda tangan yang diharapkan pada dokumen resmi (dicentang pengampu utama; dokumen tetap diterima bila belum lengkap). */
var TTD_MKP = { rps: [["dosen", "Dosen pengembang RPS"], ["kps", "Koordinator Program Studi"], ["kajur", "Ketua Jurusan"]],
  kontrak: [["dosen", "Dosen pengampu"], ["mhs", "Perwakilan mahasiswa"], ["kps", "Koordinator Program Studi (mengetahui)"]] };
var MAKS_DAFTAR_MKP = 30;

function kompMkp(k) { return KOMP_MKP.filter(function (x) { return x.k === k; })[0]; }
function semesterSah(smt) { if (!/^\d{4}-[12]$/.test(String(smt || ""))) throw galat("Semester tidak valid."); return String(smt); }
function urutSmt(kode) { return Number(kode.slice(0, 4)) * 2 + Number(kode.slice(5)); }
/** Semester boleh diisi: semester berjalan dan sesudahnya. */
function smtTerbuka(smt) { return urutSmt(smt) >= urutSmt(semesterInfo().kode); }

function isiMkpDari(r) {
  var x = jsonDari(r ? r.isi : "", {});
  if (!Array.isArray(x.integ)) x.integ = [];
  if (!Array.isArray(x.interaksi)) x.interaksi = [];
  return x;
}
function semuaMkpSemester(smt) {
  var m = {};
  semua("PortofolioMk").filter(function (r) { return String(r.semester) === smt; }).forEach(function (r) { m[teks(r.kodeMk)] = { _r: r, isi: isiMkpDari(r) }; });
  return m;
}
function adaKomp(isi, k) {
  var v = isi[k];
  if (k === "metode") return !!(v && ((v.v && v.v.length) || v.lain));
  if (Array.isArray(v)) return v.length > 0;
  return !!v;
}
/** MK dengan tim pada semester itu (dasar persentase). v0.38.0: kelas = tim per kunci. */
function mkBertim(smt) {
  var tim = timSemester(smt), mks = semuaMk();
  return mks.filter(function (m) { return tim[m.kode] && tim[m.kode].anggota.length; }).map(function (m) { return { mk: m, smt: smt, anggota: tim[m.kode].anggota, utama: tim[m.kode].utama, kelas: tim[m.kode].kelas }; });
}
/* v0.40.0 (keputusan pemilik 20 Nov 2026, standar LAMWisata butir 8/22/25):
   Portofolio MK diisi PER KELAS (kunci tim: "A", "B", atau "A/JEPANG" untuk MK berkelompok). Setiap kelas terpisah dan hanya terlihat oleh tim kelas itu
   (pengelola: Admin Prodi, KPS, GKM, Super Admin melihat semua) — juga bila pengajarnya sama (jumlah bukti = jumlah kelas).
   Pengecualian: RPS adalah dokumen mata kuliah → kelas-kelas dengan TIM YANG SAMA PERSIS (dan kelompok yang sama) berbagi satu RPS; tim berbeda → RPS terpisah.
   Penyimpanan: isi.kls[KUNCI] = {rps, kontrak, rubrik, metode, integ[], interaksi[]}. RPS bersama ditulis ke semua kunci yang setim.
   Data lama (per MK sebelum v0.40, per kelompok v0.38 di isi.kel) dibaca sebagai cadangan untuk komponen pengampu utama. */
/** Unit kelas: [{k, kelas, g, ang, sig}]; tim "sama untuk semua kelas" → satu unit per kelas yang mengambil MK. */
function unitKelas(x) {
  if (x._unit) return x._unit;
  var kls = x.kelas || {}, h = [];
  if (kls[""] !== undefined) { kelasTimMk(x.smt, x.mk.semester, petaKelasAngkatan()).forEach(function (k) { h.push({ k: k, ang: kls[""] || [] }); }); }
  else Object.keys(kls).sort().forEach(function (k) { if ((kls[k] || []).length) h.push({ k: k, ang: kls[k] }); });
  h.forEach(function (u) { u.g = kelompokDariKunci(u.k); u.kelas = String(u.k).split("/")[0]; u.sig = u.g + "|" + u.ang.map(function (a) { return a.t + a.id; }).sort().join(","); });
  x._unit = h;
  return h;
}
/** Peran pengguna di satu unit: "utama" (anggota pertama, dosen), "anggota", atau "". */
function peranUnit(u, userId) {
  var i = -1; u.ang.forEach(function (a, j) { if (i < 0 && a.t === "u" && a.id === userId) i = j; });
  return i < 0 ? "" : i === 0 ? "utama" : "anggota";
}
/** Isian satu unit (dengan cadangan data lama untuk komponen pengampu utama). */
function isiUnit(s, u) {
  var w = (s.kls || {})[u.k] || {}, lama = u.g ? ((s.kel || {})[u.g] || {}) : s, o = {};
  KOMP_MKP.forEach(function (c) {
    var v = w[c.k];
    if (c.u && v === undefined) v = lama[c.k];   // null = sengaja dihapus di kelas ini
    o[c.k] = c.jenis === "dok" || c.jenis === "metode" ? (v || null) : (Array.isArray(v) ? v : []);
  });
  return o;
}
function wadahUnit(s, k) { s.kls = s.kls || {}; var w = s.kls[k] = s.kls[k] || {}; if (!Array.isArray(w.integ)) w.integ = []; if (!Array.isArray(w.interaksi)) w.interaksi = []; return w; }
/** Kunci yang berbagi RPS dengan unit u (tim dan kelompok sama persis). */
function kunciRpsBersama(x, u) { return unitKelas(x).filter(function (v) { return v.sig === u.sig; }).map(function (v) { return v.k; }); }
/** Komponen lengkap untuk satu MK = lengkap di SEMUA kelasnya (LAMWisata menghitung per mata kuliah). */
function adaKompMk(x, s, k) { var l = unitKelas(x); return l.length > 0 && l.every(function (u) { return adaKomp(isiUnit(s, u), k); }); }
/** Pilih unit sasaran: d.kunci, atau unit pertama yang boleh diisi pengguna (utama untuk komponen pengampu utama). */
function unitSasaran(x, d, p, c, ubahIsi) {
  var l = unitKelas(x), k = String(d.kunci || "").toUpperCase(), u;
  if (k) { u = l.filter(function (v) { return v.k === k; })[0]; if (!u) throw galat("Kelas tidak dikenal untuk mata kuliah ini."); }
  else u = l.filter(function (v) { var r = peranUnit(v, p.id); return c && c.u ? r === "utama" : !!r; })[0] || l.filter(function (v) { return peranUnit(v, p.id); })[0] || l[0];
  if (!u) throw galat("Mata kuliah ini belum punya tim pengajar.");
  var r = peranUnit(u, p.id);
  if (ubahIsi) {
    if (!r) throw galat("Anda tidak mengajar " + labelUnit(x, u) + "; isian kelas itu diisi oleh tim kelas itu sendiri.");
    if (c && c.u && r !== "utama") throw galat(c.l + " " + labelUnit(x, u) + " diisi oleh pengampu utama kelas itu.");
  } else if (!r && !punyaPeran(p, PERAN_MKP_REKAP)) throw galat("Anda tidak mengajar " + labelUnit(x, u) + ".");
  return u;
}
function labelUnit(x, u) { var g = u.g ? (x.mk.kelompok || []).filter(function (y) { return y.n.toUpperCase() === u.g; })[0] : null; return "kelas " + u.kelas + (u.g ? " · " + (g ? g.n : u.g) : ""); }
/** v0.28.0: utama = daftar userId pengampu utama (tim per kelas bisa punya pengampu utama berbeda); tanpa daftar → anggota[0]. */
function peranTim(anggota, userId, utama) {
  var i = -1; anggota.forEach(function (a, j) { if (i < 0 && a.t === "u" && a.id === userId) i = j; });
  if (i < 0) return "";
  if (Array.isArray(utama) && utama.length) return utama.indexOf(userId) >= 0 ? "utama" : "anggota";
  return i === 0 ? "utama" : "anggota";
}
function namaAnggota(anggota, idx, prak, utama) {
  return anggota.map(function (a, i) {
    if (a.t === "p") { var x = prak[a.id]; return { t: "p", id: a.id, nama: x ? x.nama : "(praktisi)", utama: false }; }
    var o = idx.byId[a.id]; return { t: "u", id: a.id, nama: o ? o.nama : "(dosen)", utama: Array.isArray(utama) && utama.length ? utama.indexOf(a.id) >= 0 : i === 0 };
  });
}
function petaPraktisi() { var m = {}; semuaPraktisi().forEach(function (x) { m[x.id] = x; }); return m; }

/** Persentase MK berkomponen lengkap untuk daftar semester (dipakai rekap dan Penilaian). */
function persenMkp(smts) {
  var n = 0, ada = {};
  KOMP_MKP.forEach(function (c) { ada[c.k] = 0; });
  smts.forEach(function (smt) {
    var isi = semuaMkpSemester(smt);
    mkBertim(smt).forEach(function (x) {
      n++;
      var s = isi[x.mk.kode] ? isi[x.mk.kode].isi : {};
      KOMP_MKP.forEach(function (c) { if (adaKompMk(x, s, c.k)) ada[c.k]++; });
    });
  });
  var p = { n: n };
  KOMP_MKP.forEach(function (c) { p[c.k] = n ? ada[c.k] / n : 0; });
  return p;
}
/** Keterangan tambahan butir Penilaian dari Portofolio MK pada TS (Ganjil + Genap). */
function infoMkpTs(ts) {
  var p = persenMkp([kodeSmt(ts, true), kodeSmt(ts, false)]);
  if (!p.n) return {};
  var f = function (v) { return Math.round(v * 100) + "%"; };
  return {
    8: "Portofolio MK TS: RPS tersedia di " + f(p.rps) + " dari " + p.n + " MK (semua kelasnya)",
    22: "Portofolio MK TS: metode tercatat di " + f(p.metode) + ", integrasi penelitian/PkM di " + f(p.integ) + ", bukti interaksi di " + f(p.interaksi) + " MK (semua kelasnya)",
    25: "Portofolio MK TS: rubrik di " + f(p.rubrik) + ", kontrak kuliah di " + f(p.kontrak) + " MK (semua kelasnya; skor 4 butuh rubrik ≥ 70% MK)"
  };
}

function entriKeKlien(e, idx) {
  if (!e) return null;
  var o = idx.byId[e.o], x = { t: e.t, nama: e.nama || "", ukuran: e.ukuran || 0, url: e.t === "tautan" ? e.url : "", ket: e.ket || "", teks: e.teks || "",
    id: e.id || "", o: e.o, oleh: o ? o.nama : "", w: e.w || "", ttd: e.ttd || null, keg: e.keg || "", kj: e.kj || "", kjn: e.kjn || "" };
  return x;
}
function metodeKeKlien(m, idx) { return m ? { v: m.v || [], lain: m.lain || "", oleh: (idx.byId[m.o] || {}).nama || "", w: m.w || "" } : { v: [], lain: "" }; }
/** Data satu unit kelas untuk tampilan. */
function unitKeKlien(x, u, s, p, idx, prak, buka) {
  var w = isiUnit(s, u), r = peranUnit(u, p.id), g = u.g ? (x.mk.kelompok || []).filter(function (y) { return y.n.toUpperCase() === u.g; })[0] : null;
  var bersama = kunciRpsBersama(x, u).filter(function (k) { return k !== u.k; });
  return { k: u.k, kelas: u.kelas, g: u.g, gNama: g ? g.n : "", gKode: g ? g.kode : "", label: "Kelas " + u.kelas + (u.g ? " · " + (g ? g.n : u.g) : ""),
    tim: namaAnggota(u.ang, idx, prak, null), peran: r, bolehUtama: buka && r === "utama", bolehAnggota: buka && !!r, rpsBersama: bersama,
    rps: entriKeKlien(w.rps, idx), kontrak: entriKeKlien(w.kontrak, idx), rubrik: entriKeKlien(w.rubrik, idx), metode: metodeKeKlien(w.metode, idx),
    integ: w.integ.map(function (e) { return entriKeKlien(e, idx); }), interaksi: w.interaksi.map(function (e) { return entriKeKlien(e, idx); }),
    lengkap: KOMP_MKP.filter(function (c) { return adaKomp(w, c.k); }).map(function (c) { return c.k; }) };
}
/** MK untuk tampilan: unit kelas yang boleh dilihat pengguna (dosen: kelas yang ia ajar; pengelola: semua). Bidang lama (rps, kontrak, …) = unit terpilih. */
function mkpKeKlien(x, smt, isi, p, idx, prak, kunci) {
  var buka = smtTerbuka(smt), s = isi || {}, semuaU = unitKelas(x), lihatSemua = punyaPeran(p, PERAN_MKP_REKAP);
  var tampak = semuaU.filter(function (u) { return lihatSemua || peranUnit(u, p.id); });
  var kelas = tampak.map(function (u) { return unitKeKlien(x, u, s, p, idx, prak, buka); });
  var pilih = kelas.filter(function (u) { return u.k === String(kunci || "").toUpperCase(); })[0] || kelas.filter(function (u) { return u.peran; })[0] || kelas[0] || {};
  var per = peranTim(x.anggota, p.id, x.utama);
  return {
    semester: smt, labelSemester: labelSmt(smt), kode: x.mk.kode, nama: x.mk.nama, sks: sksMk(x.mk), sksPraktik: x.mk.sksPraktik, smtMk: x.mk.semester,
    tim: pilih.tim || [], peran: per, buka: buka, kunci: pilih.k || "",
    bolehUtama: !!pilih.bolehUtama, bolehAnggota: !!pilih.bolehAnggota,
    rps: pilih.rps || null, kontrak: pilih.kontrak || null, rubrik: pilih.rubrik || null, metode: pilih.metode || { v: [], lain: "" },
    integ: pilih.integ || [], interaksi: pilih.interaksi || [],
    lengkap: KOMP_MKP.filter(function (c) { return adaKompMk(x, s, c.k); }).map(function (c) { return c.k; }),   // MK: semua kelas
    kelas: kelas, jumlahKelas: semuaU.length
  };
}
function pilihanSemesterMkp() {
  var s = semesterInfo(), kk = s.ganjil ? kodeSmt(s.awal, false) : kodeSmt(s.awal + 1, true), l = [];
  for (var i = 0; i < 9; i++) { l.push({ kode: kk, label: labelSmt(kk) }); kk = /-1$/.test(kk) ? kodeSmt(Number(kk.slice(0, 4)) - 1, false) : kodeSmt(Number(kk.slice(0, 4)), true); }
  return l;
}
function refMkp() { return { komp: KOMP_MKP, daftarMetode: METODE_MKP, pilihanSemester: pilihanSemesterMkp(), semesterKini: semesterInfo().kode, ttdMkp: TTD_MKP }; }

/* ---------- aksi baca ---------- */

/** MK yang diampu pengguna (dosen) pada satu semester (hanya kelas yang ia ajar). */
function aksiMkpSaya(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["dosen"]);
  var smt = semesterSah(d.semester || semesterInfo().kode), isi = semuaMkpSemester(smt), idx = indeksOrang(), prak = petaPraktisi();
  var mk = mkBertim(smt).filter(function (x) { return unitKelas(x).some(function (u) { return peranUnit(u, p.id); }); }).map(function (x) {
    var h = mkpKeKlien(x, smt, isi[x.mk.kode] ? isi[x.mk.kode].isi : null, p, idx, prak);
    h.kelas = h.kelas.filter(function (u) { return u.peran; });
    return h;
  });
  return Object.assign({ semester: smt, labelSemester: labelSmt(smt), mk: mk }, refMkp());
}
/** Rekap kelengkapan semua MK bertim pada satu semester (Admin Prodi / KPS / Super Admin / GKM), rinci per kelas. */
function aksiMkpRekap(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_MKP_REKAP);
  var smt = semesterSah(d.semester || semesterInfo().kode), isi = semuaMkpSemester(smt), idx = indeksOrang(), prak = petaPraktisi();
  var mk = mkBertim(smt).map(function (x) { return mkpKeKlien(x, smt, isi[x.mk.kode] ? isi[x.mk.kode].isi : null, p, idx, prak); });
  var tanpaTim = semuaMk().filter(function (m) { return m.semester % 2 === (/-1$/.test(smt) ? 1 : 0) && !m.tanpaTim; }).length - mk.length;
  return Object.assign({ semester: smt, labelSemester: labelSmt(smt), mk: mk, persen: persenMkp([smt]), tanpaTim: Math.max(0, tanpaTim) }, refMkp());
}
function ambilMkp(smt, kode, p, perluUbah) {
  var x = mkBertim(smt).filter(function (y) { return y.mk.kode === kode; })[0];
  if (!x) throw galat("Mata kuliah ini belum punya tim pengajar pada " + labelSmt(smt) + ".");
  var anggota = unitKelas(x).some(function (u) { return peranUnit(u, p.id); });
  if (!anggota && !punyaPeran(p, PERAN_MKP_REKAP)) throw galat("Anda bukan anggota tim pengajar mata kuliah ini.");
  if (perluUbah) {
    if (!anggota) throw galat("Hanya anggota tim pengajar yang mengisi portofolio mata kuliah.");
    if (!smtTerbuka(smt)) throw galat(labelSmt(smt) + " sudah lewat; portofolio hanya bisa dilihat.");
  }
  x.peran = peranTim(x.anggota, p.id, x.utama);
  return x;
}
function aksiMkpDetail(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_MKP_REKAP.concat(["dosen"]));
  var smt = semesterSah(d.semester), kode = teks(d.kode), x = ambilMkp(smt, kode, p, false), r = semuaMkpSemester(smt)[kode];
  var hasil = mkpKeKlien(x, smt, r ? r.isi : null, p, indeksOrang(), petaPraktisi(), d.kunci);
  // Kuliah tamu yang menyebut kode MK ini (jenis "kuliahtamu", isian "Mata kuliah terkait").
  var a = Number(smt.slice(0, 4)), ganjil = /-1$/.test(smt);
  hasil.kuliahTamu = semuaKegiatan().filter(function (k) {
    if (k.jenis !== "kuliahtamu" || k.dihapus || !k.tgl || !tanggalSah(k.tgl)) return false;
    var s = semesterInfo(keTanggal(k.tgl)); if (s.awal !== a || s.ganjil !== ganjil) return false;
    return JSON.stringify(k.isian || {}).toUpperCase().indexOf(kode.toUpperCase()) >= 0;
  }).map(function (k) { return { id: k.id, judul: k.judul, tgl: k.tgl, status: k.status }; });
  // v0.42.0: hasil baca RPS Word per kelas (dicocokkan dengan file RPS yang berlaku).
  var peta = petaRpsFile(), s0 = r ? r.isi : {};
  unitKelas(x).forEach(function (u) {
    var e = isiUnit(s0, u).rps, k = (hasil.kelas || []).filter(function (v) { return v.k === u.k; })[0];
    if (k) k.rpsBaca = e && e.t === "file" && peta[e.fileId] ? { data: peta[e.fileId].data, semester: peta[e.fileId].semester, diubah: peta[e.fileId].diubah } : null;
  });
  hasil.cplProdi = CPL_PRODI; hasil.kualifikasiMk = kualifikasiMk(x.mk.semester);
  return Object.assign(hasil, refMkp());
}

/* ---------- aksi ubah ---------- */

function folderMkp(smt, mk) {
  var induk = folderAnak(folderAnak(DriveApp.getFolderById(prop("FOLDER_ID")), "Bukti"), "Portofolio MK");
  return folderAnak(folderAnak(induk, labelSmt(smt).replace("/", "-")), (mk.kode + " " + mk.nama).replace(/[\\/:*?"<>|]/g, " ").slice(0, 80).trim());
}
/** Simpan isi baru di dalam kunci tulis; fn(isi) mengubah isi dan mengembalikan nilai. */
function ubahMkp(smt, kode, p, fn) {
  return kunciTulis(function () {
    var r = cari("PortofolioMk", function (x) { return String(x.semester) === smt && teks(x.kodeMk) === kode; }), isi = isiMkpDari(r);
    var hasil = fn(isi);
    var o = { semester: smt, kodeMk: kode, isi: JSON.stringify(isi), oleh: p.id, diubah: new Date() };
    if (o.isi.length > 45000) throw galat("Isian portofolio mata kuliah ini terlalu panjang.");
    if (r) ubah("PortofolioMk", r, o); else tambah("PortofolioMk", o);
    return hasil;
  });
}
function idAcak() { return Utilities.getUuid().slice(0, 8); }
/** fileId yang masih dirujuk isian (semua kelas + data lama) — berkas yang tidak dirujuk lagi boleh dipindah ke sampah. */
function fileDirujukMkp(s) {
  var h = {}, cek = function (o) { if (!o) return; KOMP_MKP.forEach(function (c) { var v = o[c.k]; (Array.isArray(v) ? v : [v]).forEach(function (e) { if (e && e.t === "file") h[e.fileId] = 1; }); }); };
  cek(s); Object.keys(s.kel || {}).forEach(function (g) { cek(s.kel[g]); }); Object.keys(s.kls || {}).forEach(function (k) { cek(s.kls[k]); });
  return h;
}
function buangTakDirujuk(lama, s) {
  var dirujuk = fileDirujukMkp(s);
  lama.forEach(function (e) { if (e && e.t === "file" && !dirujuk[e.fileId]) try { DriveApp.getFileById(e.fileId).setTrashed(true); } catch (_) {} });
}

function aksiMkpUnggah(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["dosen"]);
  var smt = semesterSah(d.semester), kode = teks(d.kode), c = kompMkp(String(d.komp || ""));
  if (!c || (c.jenis !== "dok" && c.jenis !== "daftar")) throw galat("Jenis dokumen tidak dikenal.");
  var x = ambilMkp(smt, kode, p, true), u = unitSasaran(x, d, p, c, true);
  var target = c.k === "rps" ? kunciRpsBersama(x, u) : [u.k];
  var entri, file = null, rpsJson = c.k === "rps" && d.tautan === undefined ? bersihRpsData(d.rps) : null;
  if (d.tautan !== undefined) {
    var url = teks(d.tautan).trim();
    if (!/^https:\/\/[^\s<>"]+$/.test(url) || url.length > 500) throw galat("Tautan harus diawali https:// dan tanpa spasi.");
    entri = { t: "tautan", url: url };
  } else {
    var nama = namaAman(d.nama), eks = (nama.split(".").pop() || "").toLowerCase(), mime = BUKTI_EKS[eks];
    if (nama.indexOf(".") < 0 || !mime) throw galat("Jenis file tidak didukung. Gunakan PDF, JPG, PNG, WEBP, Word, Excel, atau PowerPoint. Video: pakai tautan.");
    var isi = teks(d.isi);
    if (!isi || isi.length > Math.ceil(BUKTI_MAKS / 3) * 4 + 8) throw galat("Ukuran file maksimal 10 MB. Untuk file lebih besar, unggah ke Google Drive lalu pakai Tautan.");
    var bytes = Utilities.base64Decode(isi);
    if (bytes.length > BUKTI_MAKS) throw galat("Ukuran file maksimal 10 MB. Untuk file lebih besar, unggah ke Google Drive lalu pakai Tautan.");
    if (!isiSesuai(eks, bytes)) throw galat("Isi file tidak sesuai dengan jenisnya (." + eks + "). Simpan ulang file dari aplikasi aslinya, lalu coba lagi.");
    file = folderMkp(smt, x.mk).createFile(Utilities.newBlob(bytes, mime, namaAman(c.l + " - " + labelUnit(x, u) + " - " + nama)));
    entri = { t: "file", fileId: file.getId(), nama: nama, mime: mime, ukuran: bytes.length };
  }
  if (c.jenis === "daftar") entri.ket = potong(d.ket, 200).trim();
  entri.o = p.id; entri.w = new Date().toISOString();
  var lama = [];
  try {
    ubahMkp(smt, kode, p, function (s) {
      if (c.jenis === "dok") target.forEach(function (k) { var w = wadahUnit(s, k); lama.push(isiUnit(s, unitKelas(x).filter(function (v) { return v.k === k; })[0])[c.k]); w[c.k] = entri; });
      else {
        var w = wadahUnit(s, u.k);
        if (w[c.k].length >= MAKS_DAFTAR_MKP) throw galat("Maksimal " + MAKS_DAFTAR_MKP + " bukti per kelas. Gabungkan beberapa dokumentasi dalam satu tautan folder.");
        entri.id = idAcak(); w[c.k].push(entri);
      }
      buangTakDirujuk(lama, s);
    });
  } catch (e) {
    if (file) try { file.setTrashed(true); } catch (_) {}
    throw e;
  }
  if (rpsJson && file) simpanRpsData(smt, kode, target, file.getId(), rpsJson, p);
  catat(p.id, "mkp.unggah", { semester: smt, kode: kode, komp: c.k, t: entri.t, kelas: target.join(","), baca: rpsJson ? 1 : 0 });
  return aksiMkpDetail({ semester: smt, kode: kode, kunci: u.k }, token);
}

function aksiMkpHapus(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["dosen"]);
  var smt = semesterSah(d.semester), kode = teks(d.kode), c = kompMkp(String(d.komp || ""));
  if (!c || c.jenis === "metode") throw galat("Jenis isian tidak dikenal.");
  var x = ambilMkp(smt, kode, p, true), u = unitSasaran(x, d, p, c.jenis === "dok" ? c : null, true);
  ubahMkp(smt, kode, p, function (s) {
    var dibuang = [];
    if (c.jenis === "dok") {
      if (peranUnit(u, p.id) !== "utama") throw galat("Hanya pengampu utama kelas itu yang bisa menghapus " + c.l + ".");
      var target = c.k === "rps" ? kunciRpsBersama(x, u) : [u.k], ada = false;
      target.forEach(function (k) {
        var uu = unitKelas(x).filter(function (v) { return v.k === k; })[0], v = isiUnit(s, uu)[c.k], w = wadahUnit(s, k);
        if (v) { ada = true; dibuang.push(v); }
        w[c.k] = null;   // null = dihapus (tidak memakai lagi data lama sebagai cadangan)
      });
      if (!ada) throw galat("Dokumen ini belum diunggah.");
    } else {
      var w2 = wadahUnit(s, u.k), i = -1; w2[c.k].forEach(function (e, j) { if (e.id === String(d.id || "")) i = j; });
      if (i < 0) throw galat("Isian tidak ditemukan.");
      if (w2[c.k][i].o !== p.id) throw galat("Hanya penulis/pengunggahnya yang bisa menghapus isian ini.");
      dibuang.push(w2[c.k].splice(i, 1)[0]);
    }
    buangTakDirujuk(dibuang, s);
  });
  catat(p.id, "mkp.hapus", { semester: smt, kode: kode, komp: c.k, kelas: u.k });
  return aksiMkpDetail({ semester: smt, kode: kode, kunci: u.k }, token);
}

function aksiMkpMetode(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["dosen"]);
  var smt = semesterSah(d.semester), kode = teks(d.kode), x = ambilMkp(smt, kode, p, true), c = kompMkp("metode"), u = unitSasaran(x, d, p, c, true);
  var v = (Array.isArray(d.metode) ? d.metode : []).map(String).filter(function (m, i, a) { return METODE_MKP.indexOf(m) >= 0 && a.indexOf(m) === i; });
  var lain = potong(d.lain, 200).trim();
  ubahMkp(smt, kode, p, function (s) {
    var w = wadahUnit(s, u.k);
    w.metode = !v.length && !lain ? null : { v: v, lain: lain, o: p.id, w: new Date().toISOString() };
  });
  catat(p.id, "mkp.metode", { semester: smt, kode: kode, n: v.length + (lain ? 1 : 0), kelas: u.k });
  return aksiMkpDetail({ semester: smt, kode: kode, kunci: u.k }, token);
}

function aksiMkpInteg(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["dosen"]);
  var smt = semesterSah(d.semester), kode = teks(d.kode), x = ambilMkp(smt, kode, p, true), u = unitSasaran(x, d, p, null, true);
  var t = potong(d.teks, 1000).trim(), keg = null;
  if (t.length < 15) throw galat("Tuliskan bentuk integrasinya (minimal 15 huruf), misalnya data penelitian apa yang dipakai mahasiswa.");
  if (d.keg) {   // v0.44.0: tautan ke kegiatan penelitian/PkM tim (bukti SN Dikti Penelitian/PkM, butir 22 C–D)
    keg = semuaKegiatan().filter(function (k) { return k.id === String(d.keg); })[0];
    if (!keg || JENIS_INTEG.indexOf(keg.jenis) < 0) throw galat("Kegiatan penelitian/PkM tidak ditemukan.");
  }
  ubahMkp(smt, kode, p, function (s) {
    var w = wadahUnit(s, u.k);
    if (w.integ.length >= MAKS_DAFTAR_MKP) throw galat("Maksimal " + MAKS_DAFTAR_MKP + " catatan integrasi per kelas.");
    var e = { id: idAcak(), teks: t, o: p.id, w: new Date().toISOString() };
    if (keg) { e.keg = keg.id; e.kj = keg.judul; e.kjn = keg.jenis; }
    w.integ.push(e);
  });
  catat(p.id, "mkp.integ", { semester: smt, kode: kode, kelas: u.k });
  return aksiMkpDetail({ semester: smt, kode: kode, kunci: u.k }, token);
}

function aksiMkpLihat(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_MKP_REKAP.concat(["dosen"]));
  var smt = semesterSah(d.semester), kode = teks(d.kode), c = kompMkp(String(d.komp || ""));
  if (!c || (c.jenis !== "dok" && c.jenis !== "daftar")) throw galat("Jenis dokumen tidak dikenal.");
  var x = ambilMkp(smt, kode, p, false), u = unitSasaran(x, d, p, null, false);
  var r = semuaMkpSemester(smt)[kode], s = r ? r.isi : {}, w = isiUnit(s, u);
  var e = c.jenis === "dok" ? w[c.k] : w[c.k].filter(function (y) { return y.id === String(d.id || ""); })[0];
  if (!e) throw galat("Dokumen ini belum diunggah.");
  if (e.t !== "file") return { t: e.t, url: e.url || "" };
  var b = DriveApp.getFileById(e.fileId).getBlob();
  return { t: "file", nama: e.nama, mime: e.mime, isi: Utilities.base64Encode(b.getBytes()) };
}

/** Pengingat: kelas yang Anda ampu sebagai pengampu utama pada semester berjalan tetapi RPS-nya belum ada. */
function mkpBelumRps(p) {
  if (!punyaPeran(p, ["dosen"])) return [];
  var smt = semesterInfo().kode, isi = semuaMkpSemester(smt), h = [];
  mkBertim(smt).forEach(function (x) {
    var s = isi[x.mk.kode] ? isi[x.mk.kode].isi : {}, sudah = {};
    unitKelas(x).forEach(function (u) { if (peranUnit(u, p.id) === "utama" && !isiUnit(s, u).rps && !sudah[u.sig]) { sudah[u.sig] = 1; h.push({ kode: x.mk.kode, nama: x.mk.nama + " (" + labelUnit(x, u) + ")", semester: smt }); } });
  });
  return h;
}

/* ---------- unduh ZIP (v0.41.0) ----------
   Daftar semua isian Portofolio MK yang boleh dilihat pengguna (pengelola: semua kelas; dosen: kelas yang ia ajar), lalu berkasnya diambil
   beberapa sekaligus (≤ MKP_ZIP_BATCH byte per panggilan). ZIP disusun di browser. Isian teks/tautan ikut di daftar (masuk "Catatan dan tautan.txt"). */
var MKP_ZIP_BATCH = 8 * 1024 * 1024;
var MKP_ZIP_MAKS_ITEM = 60;
function unitTampakZip(smt, p, kode, kunci) {
  var lihatSemua = punyaPeran(p, PERAN_MKP_REKAP), h = [];
  mkBertim(smt).forEach(function (x) {
    if (kode && x.mk.kode !== kode) return;
    unitKelas(x).forEach(function (u) {
      if (kunci && u.k !== kunci) return;
      if (lihatSemua || peranUnit(u, p.id)) h.push({ x: x, u: u });
    });
  });
  return h;
}
function aksiMkpDaftarZip(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_MKP_REKAP.concat(["dosen"]));
  var smt = semesterSah(d.semester), kode = d.kode ? teks(d.kode) : "", kunci = String(d.kunci || "").toUpperCase();
  var isi = semuaMkpSemester(smt), idx = indeksOrang(), prak = petaPraktisi(), nama = function (id) { return (idx.byId[id] || {}).nama || ""; };
  var l = unitTampakZip(smt, p, kode, kunci);
  if (kode && !l.length) throw galat("Mata kuliah atau kelas ini tidak bisa Anda unduh.");
  var mk = {}, n = 0, b = 0;
  l.forEach(function (o) {
    var x = o.x, u = o.u, s = isi[x.mk.kode] ? isi[x.mk.kode].isi : {}, w = isiUnit(s, u);
    var m = mk[x.mk.kode] = mk[x.mk.kode] || { kode: x.mk.kode, nama: x.mk.nama, sks: sksMk(x.mk), smtMk: x.mk.semester, kelas: [] };
    var g = u.g ? (x.mk.kelompok || []).filter(function (y) { return y.n.toUpperCase() === u.g; })[0] : null;
    var ent = function (e, c) {
      var r = { komp: c.k, l: c.l, id: c.jenis === "dok" ? "" : (e.id || ""), t: e.t, nama: e.nama || "", ukuran: e.ukuran || 0, url: e.t === "tautan" ? e.url || "" : "",
        ket: e.ket || "", teks: e.teks || "", oleh: nama(e.o), w: e.w || "" };
      if (e.t === "file") { n++; b += r.ukuran; }
      return r;
    };
    var berkas = [];
    KOMP_MKP.forEach(function (c) {
      if (c.jenis === "dok" && w[c.k]) berkas.push(ent(w[c.k], c));
      if (c.jenis === "daftar" || c.jenis === "catatan") w[c.k].forEach(function (e) { berkas.push(ent(e, c)); });
    });
    m.kelas.push({ k: u.k, label: "Kelas " + u.kelas + (u.g ? " · " + (g ? g.n : u.g) : ""), gKode: g ? g.kode : "",
      tim: namaAnggota(u.ang, idx, prak, null).map(function (t) { return t.nama + (t.t === "p" ? " (praktisi)" : ""); }),
      rpsBersama: kunciRpsBersama(x, u).filter(function (k) { return k !== u.k; }),
      metode: w.metode ? { v: w.metode.v || [], lain: w.metode.lain || "", oleh: nama(w.metode.o), w: w.metode.w || "" } : null,
      lengkap: KOMP_MKP.filter(function (c) { return adaKomp(w, c.k); }).map(function (c) { return c.k; }), berkas: berkas });
  });
  catat(p.id, "mkp.zip", { semester: smt, kode: kode || "semua", kelas: kunci || "semua", file: n, byte: b });
  return { semester: smt, labelSemester: labelSmt(smt), komp: KOMP_MKP, mk: Object.keys(mk).map(function (k) { return mk[k]; }), jumlahFile: n, ukuran: b, batch: MKP_ZIP_BATCH };
}
/** Ambil beberapa berkas sekaligus: d.item = [{kode, kunci, komp, id}]. Berhenti setelah ± MKP_ZIP_BATCH byte; sisanya dikirim ulang oleh tampilan (selesai = jumlah item diproses). */
function aksiMkpAmbilZip(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_MKP_REKAP.concat(["dosen"]));
  var smt = semesterSah(d.semester), item = Array.isArray(d.item) ? d.item.slice(0, MKP_ZIP_MAKS_ITEM) : [];
  if (!item.length) throw galat("Tidak ada berkas yang diminta.");
  var isi = semuaMkpSemester(smt), peta = {}, hasil = [], total = 0;
  unitTampakZip(smt, p, "", "").forEach(function (o) { peta[o.x.mk.kode + "|" + o.u.k] = o; });
  for (var i = 0; i < item.length; i++) {
    var t = item[i] || {}, o = peta[teks(t.kode) + "|" + String(t.kunci || "").toUpperCase()], c = kompMkp(String(t.komp || ""));
    try {
      if (!o) throw galat("Kelas ini tidak bisa Anda unduh.");
      if (!c || (c.jenis !== "dok" && c.jenis !== "daftar")) throw galat("Jenis dokumen tidak dikenal.");
      var s = isi[o.x.mk.kode] ? isi[o.x.mk.kode].isi : {}, w = isiUnit(s, o.u);
      var e = c.jenis === "dok" ? w[c.k] : w[c.k].filter(function (y) { return y.id === String(t.id || ""); })[0];
      if (!e || e.t !== "file") throw galat("Berkas tidak ditemukan (mungkin baru saja diganti atau dihapus).");
      var bytes = DriveApp.getFileById(e.fileId).getBlob().getBytes();
      total += bytes.length;
      hasil.push({ ok: true, isi: Utilities.base64Encode(bytes) });
    } catch (err) { hasil.push({ ok: false, galat: err && err.message ? err.message : String(err) }); }
    if (total >= MKP_ZIP_BATCH) break;
  }
  return { hasil: hasil, selesai: hasil.length };
}

/* ---------- v0.43.0: hasil baca dari Word sumber untuk RPS resmi (PDF), dan centang tanda tangan ---------- */
/** RPS resmi diunggah sebagai PDF bertanda tangan; pengampu utama menambahkan hasil baca dari file Word sumbernya (file Word tidak disimpan). */
function aksiMkpRpsBaca(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["dosen"]);
  var smt = semesterSah(d.semester), kode = teks(d.kode), c = kompMkp("rps"), x = ambilMkp(smt, kode, p, true), u = unitSasaran(x, d, p, c, true);
  var dataJson = bersihRpsData(d.rps);
  if (!dataJson) throw galat("Isi RPS Word tidak terbaca.");
  var r = semuaMkpSemester(smt)[kode], e = isiUnit(r ? r.isi : {}, u).rps;
  if (!e || e.t !== "file") throw galat("Unggah dulu RPS resmi (PDF bertanda tangan), lalu tambahkan file Word sumbernya untuk pemeriksaan.");
  simpanRpsData(smt, kode, kunciRpsBersama(x, u), e.fileId, dataJson, p);
  catat(p.id, "mkp.rpsBaca", { semester: smt, kode: kode, kelas: u.k });
  return aksiMkpDetail({ semester: smt, kode: kode, kunci: u.k }, token);
}
/** Centang tanda tangan pada dokumen resmi (RPS, kontrak). d.ttd = {kunci: true|false}. RPS bersama: berlaku untuk semua kelas yang memakainya. */
function aksiMkpTtd(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["dosen"]);
  var smt = semesterSah(d.semester), kode = teks(d.kode), k = String(d.komp || ""), daftar = TTD_MKP[k];
  if (!daftar) throw galat("Jenis dokumen tidak dikenal.");
  var c = kompMkp(k), x = ambilMkp(smt, kode, p, true), u = unitSasaran(x, d, p, c, true), v = {};
  daftar.forEach(function (t) { v[t[0]] = !!(d.ttd && d.ttd[t[0]]); });
  var target = k === "rps" ? kunciRpsBersama(x, u) : [u.k];
  ubahMkp(smt, kode, p, function (s) {
    var ada = false;
    target.forEach(function (kk) {
      var uu = unitKelas(x).filter(function (y) { return y.k === kk; })[0], e = isiUnit(s, uu)[k];
      if (!e) return;
      ada = true; wadahUnit(s, kk)[k] = Object.assign({}, e, { ttd: v });
    });
    if (!ada) throw galat("Dokumen ini belum diunggah.");
  });
  catat(p.id, "mkp.ttd", { semester: smt, kode: kode, komp: k, kelas: u.k, ttd: Object.keys(v).filter(function (z) { return v[z]; }).join(",") });
  return aksiMkpDetail({ semester: smt, kode: kode, kunci: u.k }, token);
}

/* ---------- v0.44.0: saran integrasi penelitian/PkM (butir 22 C–D) ---------- */
var JENIS_INTEG = ["penelitian", "pkm", "publikasi"];
/** Penelitian, PkM, dan publikasi 5 tahun terakhir yang melibatkan dosen tim kelas ini (bukan draf/ditolak). Pencocokan dengan isi RPS dilakukan di tampilan. */
function aksiMkpSaranInteg(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_MKP_REKAP.concat(["dosen"]));
  var smt = semesterSah(d.semester), kode = teks(d.kode), x = ambilMkp(smt, kode, p, false), u = unitSasaran(x, d, p, null, false);
  var idx = indeksOrang(), tim = u.ang.filter(function (a) { return a.t === "u"; }).map(function (a) { return a.id; });
  var batas = String(Number(smt.slice(0, 4)) - 5) + "-01-01";
  var h = semuaKegiatan().filter(function (k) {
    if (JENIS_INTEG.indexOf(k.jenis) < 0 || k.status === "ditolak" || k.status === "draf" || k.st === "draf_aju") return false;
    if (k.tgl && k.tgl < batas) return false;
    return tim.indexOf(k.olehId) >= 0 || k.pegawai.some(function (id) { return tim.indexOf(id) >= 0; });
  }).map(function (k) {
    var orang = [k.olehId].concat(k.pegawai).filter(function (id, i, a) { return tim.indexOf(id) >= 0 && a.indexOf(id) === i; }).map(function (id) { return (idx.byId[id] || {}).nama || ""; });
    var isi = []; Object.keys(k.isian || {}).forEach(function (q) { var v = k.isian[q]; if (typeof v === "string" && v.length < 300 && !/dana|rp/i.test(q)) isi.push(v); });
    return { id: k.id, jenis: k.jenis, jenisLabel: (jenisDef(k.jenis) || {}).l || k.jenis, judul: k.judul, tgl: k.tgl, status: k.status, dosen: orang, ket: [k.ket, k.aktivitas, k.tempat].concat(isi).filter(String).join(" · ").slice(0, 600) };
  });
  h.sort(function (a, b) { return String(b.tgl).localeCompare(String(a.tgl)); });
  return { semester: smt, kode: kode, kunci: u.k, kegiatan: h.slice(0, 80) };
}
