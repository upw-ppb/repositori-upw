/**
 * Data Prodi (v0.8.0): kurikulum, tim pengajar per semester, dosen industri/praktisi, dan data dosen per TS (EWMP).
 * Sumber Tabel iLKPS 1–6. Diubah oleh Admin Prodi / Super Admin; KPS dapat melihat.
 * - Tim pengajar berlaku satu semester (v0.28.0: sama untuk semua kelas, atau berbeda per kelas A/B — kolom TimPengajar.kelas) (kode semester "2025-1" = Ganjil 2025/2026, "2025-2" = Genap 2025/2026);
 *   anggota[0] = pengampu utama; maks. 3 orang termasuk praktisi. Anggota: {t:"u", id: userId dosen} | {t:"p", id: id praktisi}.
 * - EWMP pendidikan di PS dihitung dari tim pengajar TS (sks MK dibagi rata ke semua anggota tim, termasuk praktisi — v0.39.0), bisa ditimpa Admin.
 */
var PERAN_DP_UBAH = ["admin", "superadmin"];
var PERAN_DP_LIHAT = ["admin", "superadmin", "kps", "gkm"];
var PERAN_TIM_IMPOR = ["kps", "admin"];   // v0.35.0: unduh templat dan impor tim pengajar dari Excel (keputusan pemilik: hanya KPS dan Admin Prodi)
var JAM_PER_SKS = 45; // Permendikbudristek 53/2023: 1 sks = 45 jam per semester

function angka(v, maks) { var n = Number(String(v === undefined || v === null ? "" : v).replace(",", ".")); return isFinite(n) && n >= 0 && n <= (maks || 1000) ? Math.round(n * 100) / 100 : 0; }
function ya(v) { return v === true || v === "TRUE" || v === "Ya" || v === "ya" || v === 1 || v === "1" || v === "V" || v === "v"; }
function kodeSmt(awal, ganjil) { return awal + "-" + (ganjil ? 1 : 2); }
function labelSmt(kode) { var m = /^(\d{4})-([12])$/.exec(kode); return m ? (m[2] === "1" ? "Ganjil " : "Genap ") + m[1] + "/" + (Number(m[1]) + 1) : kode; }

/* ---------- baca ---------- */

function mkDari(r) {
  return { _r: r, id: r.id, kode: teks(r.kode), nama: teks(r.nama), semester: Number(r.semester) || 0, kompetensi: ya(r.kompetensi),
    sksKuliah: angka(r.sksKuliah), sksSeminar: angka(r.sksSeminar), sksPraktik: angka(r.sksPraktik),
    cplSikap: ya(r.cplSikap), cplPengetahuan: ya(r.cplPengetahuan), cplKu: ya(r.cplKu), cplKk: ya(r.cplKk), rps: teks(r.rps), unit: teks(r.unit) || "Prodi UPW",
    tanpaTim: ya(r.tanpaTim), kelompok: (jsonDari(r.kelompok, []) || []).filter(function (g) { return g && g.n; }) };
}
/**
 * v0.38.0: MK pilihan dengan KELOMPOK PARALEL (mis. Bahasa Asing Pilihan: Jepang / Jerman / Perancis). Satu MK di kurikulum (SKS kurikulum tetap),
 * tetapi setiap kelas dipecah menjadi kelompok yang diajar dosen berbeda. MataKuliah.kelompok = JSON [{n: "Jepang", kode: "231041217"}, …].
 * Tim disimpan per "KELAS/KELOMPOK" (kolom TimPengajar.kelas, mis. "A/JEPANG"); setiap kelompok dihitung satu kelas utuh (SKS penuh, dibagi hanya
 * di antara anggota kelompok itu). Teks isian kurikulum: "Jepang (231041217), Jerman (231041215), Perancis (231041216)".
 */
function bersihKelompok(v) {
  if (v === undefined || v === null) return undefined;
  var l = Array.isArray(v) ? v : String(v).split(/[,;\n]+/);
  var hasil = [], ada = {};
  l.forEach(function (x) {
    var n, kode;
    if (x && typeof x === "object") { n = teks(x.n).trim(); kode = teks(x.kode).trim(); }
    else { var m = /^\s*([^()]+?)\s*(?:\(\s*([^)]*?)\s*\))?\s*$/.exec(String(x)); if (!m) return; n = m[1].trim(); kode = (m[2] || "").trim(); }
    if (!n) return;
    if (n.length > 30 || /[\/]/.test(n)) throw galat("Nama kelompok paralel maksimal 30 huruf, tanpa garis miring: " + n);
    if (kode && !/^[A-Za-z0-9.\-]{2,20}$/.test(kode)) throw galat("Kode MK kelompok " + n + " tidak valid: " + kode);
    var k = n.toUpperCase(); if (ada[k]) throw galat("Nama kelompok ganda: " + n); ada[k] = 1;
    hasil.push({ n: n, kode: kode.toUpperCase() });
  });
  if (hasil.length === 1) throw galat("Kelompok paralel minimal 2 (mis. Jepang, Jerman, Perancis). Kosongkan bila MK ini bukan MK pilihan.");
  if (hasil.length > 6) throw galat("Kelompok paralel maksimal 6.");
  return hasil;
}
/** Kunci tim per kelompok: "A/JEPANG". */
function kunciKelompok(kelas, n) { return String(kelas).toUpperCase() + "/" + String(n).toUpperCase(); }
function kelompokDariKunci(k) { var i = String(k).indexOf("/"); return i < 0 ? "" : String(k).slice(i + 1); }
/** v0.36.0: MK yang biasanya tanpa dosen pengampu (mahasiswa langsung ke industri / ke pembimbing masing-masing). Dipakai sebagai nilai awal penanda tanpaTim. */
var POLA_TANPA_TIM = /magang|tugas akhir|skripsi|praktik kerja lapang|praktek kerja lapang|\bpkl\b|internship|on the job training|\bojt\b/i;
function semuaMk() { return semua("MataKuliah").filter(function (r) { return !r.dihapus; }).map(mkDari).sort(function (a, b) { return a.semester - b.semester || a.kode.localeCompare(b.kode); }); }
function sksMk(m) { return m.sksKuliah + m.sksSeminar + m.sksPraktik; }
/**
 * v0.29.0: data praktisi sesuai Matriks butir 16 dan DED Tabel 2: jabatan, lama pengalaman (tahun), memimpin tim, lembaga penerbit sertifikat,
 * dasar kerja sama, dan bukti (CV/portofolio, ijazah, sertifikat, bukti jabatan, dokumen kerja sama) di folder Drive "Praktisi".
 */
var SLOT_BUKTI_PRAKTISI = [
  { k: "cv", l: "CV / portofolio (pengalaman kerja)" }, { k: "ijazah", l: "Ijazah pendidikan tertinggi" },
  { k: "sertifikat", l: "Sertifikat profesi/kompetensi" }, { k: "jabatan", l: "Bukti jabatan / surat keterangan kerja" },
  { k: "kerjasama", l: "Dokumen kerja sama / surat penugasan mengajar" }
];
var BUKTI_PRAKTISI_MAKS = 10 * 1024 * 1024;
function praktisiDari(r) {
  var b = jsonDari(r.bukti, {}) || {}, peng = r.pengalaman === "" || r.pengalaman === undefined || r.pengalaman === null ? "" : angka(r.pengalaman);
  return { _r: r, id: r.id, nama: teks(r.nama), nidk: teks(r.nidk), perusahaan: teks(r.perusahaan), pendidikan: teks(r.pendidikan),
    bidang: teks(r.bidang), sertifikat: teks(r.sertifikat),
    jabatan: teks(r.jabatan), pengalaman: peng, memimpinTim: ya(r.memimpinTim), penerbit: teks(r.penerbit), kerjaSama: teks(r.kerjaSama), _bukti: b };
}
/** Bukti praktisi untuk tampilan (tanpa fileId). */
function buktiPraktisiKeKlien(b) {
  var o = {};
  SLOT_BUKTI_PRAKTISI.forEach(function (s) { var e = b[s.k]; if (e) o[s.k] = e.t === "tautan" ? { t: "tautan", url: e.url, w: e.w || "" } : { t: "file", nama: e.nama, ukuran: e.ukuran, w: e.w || "" }; });
  return o;
}
/** Kriteria Matriks butir 16: pengalaman kerja ≥ 5 tahun sesuai bidang dan/atau pernah memimpin tim. */
function praktisiMemenuhi(x) { return (x.pengalaman !== "" && x.pengalaman >= 5) || !!x.memimpinTim; }
function sertifikatPraktisi(x) { return x.sertifikat + (x.sertifikat && x.penerbit ? " (" + x.penerbit + ")" : !x.sertifikat && x.penerbit ? x.penerbit : ""); }
function semuaPraktisi() { return semua("Praktisi").filter(function (r) { return !r.dihapus; }).map(praktisiDari).sort(function (a, b) { return a.nama.localeCompare(b.nama); }); }
/**
 * Tim pengajar satu semester per MK (v0.28.0: per kelas). Baris kelas "" = sama untuk semua kelas (juga data sebelum v0.28.0);
 * baris kelas "A", "B", … = tim kelas itu. Hasil per MK: kelas {"" | "A": anggota[]}, perKelas, anggota = gabungan semua kelas
 * (pengampu utama tiap kelas lebih dulu), utama = userId pengampu utama (bisa lebih dari satu bila berbeda per kelas).
 */
function timSemester(kode) {
  var m = {}, tanpa = {}, berkel = {};
  semuaMk().forEach(function (x) { if (x.tanpaTim) tanpa[x.kode] = 1; if (x.kelompok.length) berkel[x.kode] = 1; });   // v0.36.0: tim pada MK bertanda "tanpa dosen pengampu" diabaikan di semua hitungan
  // v0.38.0: MK berkelompok paralel hanya memakai baris "KELAS/KELOMPOK"; MK biasa mengabaikan baris berkelompok (mis. setelah kelompok dihapus dari kurikulum).
  semua("TimPengajar").filter(function (r) { var kd = teks(r.kodeMk), kel = String(r.kelas || "").indexOf("/") >= 0;
    return String(r.semester) === kode && !tanpa[kd] && (berkel[kd] ? kel : !kel); }).forEach(function (r) {
    var kd = teks(r.kodeMk), x = m[kd] = m[kd] || { _r: r, baris: [], kelas: {} };
    x.baris.push(r); x.kelas[String(r.kelas || "").trim().toUpperCase()] = jsonDari(r.anggota, []);
  });
  Object.keys(m).forEach(function (kd) {
    var x = m[kd], kls = Object.keys(x.kelas).sort(), ada = {}, utama = [], lain = [];
    if (x.kelas[""] !== undefined && kls.length > 1) { kls = [""]; }   // baris lama "semua kelas" bersama baris per kelas: tidak terjadi lewat aksi; "" menang
    x.perKelas = kls.length > 0 && kls[0] !== "";
    if (!x.perKelas) { var semuaK = x.kelas[""]; x.kelas = { "": semuaK }; }
    kls.forEach(function (k) {
      (x.kelas[k] || []).forEach(function (a, i) {
        if (i === 0 && a.t === "u" && utama.indexOf(a.id) < 0) utama.push(a.id);
      });
    });
    kls.forEach(function (k) { (x.kelas[k] || []).forEach(function (a) { if (!ada[a.id]) { ada[a.id] = a; lain.push(a); } }); });
    x.utama = utama;
    x.anggota = lain.filter(function (a) { return utama.indexOf(a.id) >= 0; }).sort(function (a, b) { return utama.indexOf(a.id) - utama.indexOf(b.id); })
      .concat(lain.filter(function (a) { return utama.indexOf(a.id) < 0; }));
  });
  return m;
}
/** Peta tahun masuk → daftar huruf kelas mahasiswa (semua status), dan daftar kelas mahasiswa aktif. */
function petaKelasAngkatan() {
  var per = {}, aktif = {};
  semua("Pengguna").forEach(function (p) {
    if (peranDari(p).indexOf("mahasiswa") < 0) return;
    var k = String(p.kelas || "").trim().toUpperCase(), th = Number(p.masuk) || 0;
    if (!k) return;
    if (th) { per[th] = per[th] || {}; per[th][k] = 1; }
    if (String(p.statusMhs || "A") === "A" && p.status !== "nonaktif") aktif[k] = 1;
  });
  var o = { angkatan: {}, aktif: Object.keys(aktif).sort() };
  Object.keys(per).forEach(function (th) { o.angkatan[th] = Object.keys(per[th]).sort(); });
  if (!o.aktif.length) o.aktif = ["A", "B"];
  return o;
}
/** Kelas yang mengambil MK semester smtMk pada kode semester smt ("2025-1"): kelas angkatan itu, bila belum ada → kelas mahasiswa aktif. */
function kelasTimMk(smt, smtMk, peta) {
  peta = peta || petaKelasAngkatan();
  var masuk = Number(String(smt).slice(0, 4)) - Math.floor((Math.max(1, Number(smtMk) || 1) - 1) / 2);
  return (peta.angkatan[masuk] && peta.angkatan[masuk].length) ? peta.angkatan[masuk] : peta.aktif;
}
function dosenTs(ta) {
  var m = {};
  semua("DosenTs").filter(function (r) { return Number(r.ta) === ta; }).forEach(function (r) { m[r.userId] = r; });
  return m;
}
/** Biodata pegawai berperan dosen, untuk Tabel 1–3, 5, 6. */
function daftarDosen() {
  var bio = {};
  semua("BiodataPegawai").forEach(function (b) { bio[b.userId] = b; });
  return semua("Pengguna").filter(function (p) { return p.status !== "nonaktif" && peranDari(p).indexOf("dosen") >= 0 && !akunSistem(p); }).map(function (p) {
    var b = bio[p.id] || {};
    return { id: p.id, nama: p.nama, nip: String(p.username), nidn: teks(b.nidn), status: teks(b.statusDosen), jabfung: teks(b.jabfung),
      pendS1: teks(b.pendS1), pendS2: teks(b.pendS2), pendS3: teks(b.pendS3), pddikti: teks(b.pddikti), bidang: teks(b.bidang),
      serdos: teks(b.serdos), sertKomp: teks(b.sertKomp), mkLain: teks(b.mkLain), inisial: teks(b.inisial) };
  }).sort(function (a, b) { return a.nama.localeCompare(b.nama); });
}
var STATUS_TETAP = ["Dosen tetap program studi (DTPS)", "Dosen tetap PT di luar program studi"];

/**
 * MK yang diampu per anggota (userId / id praktisi), beserta bagian sks untuk EWMP.
 * v0.29.0: mk = MK diampu TS-2 s.d. TS (DED Tabel 1 kolom 7, Tabel 2 kolom 8, Tabel 3 kolom 9), sksPenuh = jumlah sks MK itu (tiap MK sekali);
 * mkTs = MK diampu pada TS saja (Data dosen TS); sks EWMP tetap TS saja (Tabel 6 "pada saat TS").
 */
function ampuTs(ts, mks) {
  var hasil = {}, byKode = {};
  mks.forEach(function (m) { byKode[m.kode] = m; });
  var lab = function (m) { return m.kode + " " + m.nama; };
  for (var th = ts - 2; th <= ts; th++) {
    [kodeSmt(th, true), kodeSmt(th, false)].forEach(function (smt) {
      var tim = timSemester(smt);
      Object.keys(tim).forEach(function (kd) {
        var m = byKode[kd]; if (!m) return;
        tim[kd].anggota.forEach(function (a) {
          var h = hasil[a.id] = hasil[a.id] || { mk: [], mkTs: [], sks: 0, sksPenuh: 0 };
          if (h.mk.indexOf(lab(m)) < 0) { h.mk.push(lab(m)); h.sksPenuh += sksMk(m); }
          if (th === ts && h.mkTs.indexOf(lab(m)) < 0) h.mkTs.push(lab(m));
        });
      });
    });
  }
  var peta = petaKelasAngkatan();
  [kodeSmt(ts, true), kodeSmt(ts, false)].forEach(function (smt) {
    var tim = timSemester(smt);
    Object.keys(tim).forEach(function (kd) {
      var m = byKode[kd]; if (!m) return;
      // v0.28.0: sks EWMP dihitung per kelas yang diajar (tim "semua kelas" = dikali jumlah kelas MK itu).
      var x = tim[kd], kali = x.perKelas ? 1 : kelasTimMk(smt, m.semester, peta).length;
      Object.keys(x.kelas).forEach(function (k) {
        // v0.39.0 (keputusan pemilik 20 Nov 2026, "semua dibagi"): SKS dibagi rata ke SEMUA anggota tim, termasuk praktisi (sama dengan Beban SKS di templat).
        var ang = x.kelas[k] || [], dosen = ang.filter(function (a) { return a.t === "u"; });
        dosen.forEach(function (a) { hasil[a.id].sks += sksMk(m) * kali / ang.length; });
      });
    });
  });
  return hasil;
}

/* ---------- aksi baca ---------- */

function aksiDpData(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_DP_LIHAT);
  var s = semesterInfo(), smt = String(d.semester || kodeSmt(s.awal, s.ganjil));
  if (!/^\d{4}-[12]$/.test(smt)) throw galat("Semester tidak valid.");
  var ta = Number(d.ta) || tsAwal(), mks = semuaMk(), tim = timSemester(smt), dts = dosenTs(ta), ampu = ampuTs(ta, mks), petaK = petaKelasAngkatan();
  // Semester berikutnya (untuk persiapan) sampai 10 semester ke belakang.
  var pilihanSmt = [], kk = s.ganjil ? kodeSmt(s.awal, false) : kodeSmt(s.awal + 1, true);
  for (var i = 0; i < 11; i++) { pilihanSmt.push(kk); kk = /-1$/.test(kk) ? kodeSmt(Number(kk.slice(0, 4)) - 1, false) : kodeSmt(Number(kk.slice(0, 4)), true); }
  var ganjil = /-1$/.test(smt);
  var semua_ = mks.map(function (m) { var x = Object.assign({}, m); delete x._r; x.sks = sksMk(m); return x; });
  return {
    bolehUbah: punyaPeran(p, PERAN_DP_UBAH),
    bolehImporTim: punyaPeran(p, PERAN_TIM_IMPOR),
    mk: semua_, jamPerSks: JAM_PER_SKS,
    praktisi: semuaPraktisi().map(function (x) { var b = x._bukti; delete x._r; delete x._bukti; x.bukti = buktiPraktisiKeKlien(b); x.memenuhi = praktisiMemenuhi(x); return x; }),
    slotBuktiPraktisi: SLOT_BUKTI_PRAKTISI,
    dosen: daftarDosen().map(function (x) { return { id: x.id, nama: x.nama, inisial: x.inisial, status: x.status }; }),
    semester: smt, labelSemester: labelSmt(smt), pilihanSemester: pilihanSmt.map(function (k) { return { kode: k, label: labelSmt(k) }; }),
    tim: semua_.filter(function (m) { return m.semester % 2 === (ganjil ? 1 : 0); }).map(function (m) {
      var x = tim[m.kode];
      return { kode: m.kode, nama: m.nama, sks: m.sks, smtMk: m.semester, tanpaTim: m.tanpaTim, kelompok: m.kelompok, anggota: x ? x.anggota : [], utama: x ? x.utama : [],
        perKelas: x ? x.perKelas : false, kelas: x ? x.kelas : {}, daftarKelas: kelasTimMk(smt, m.semester, petaK) };
    }),
    salinDari: labelSmt(kodeSmt(Number(smt.slice(0, 4)) - 1, ganjil)),
    ta: ta, labelTa: labelTa(ta),
    dosenTs: daftarDosen().filter(function (x) { return x.status !== "Dosen industri / praktisi"; }).map(function (x) {
      var r = dts[x.id] || {}, a2 = ampu[x.id] || { sks: 0, mkTs: [] };
      return { id: x.id, nama: x.nama, status: x.status, sksPsHitung: Math.round(a2.sks * 100) / 100, mk: a2.mkTs,
        ps: r.ps === "" || r.ps === undefined ? "" : angka(r.ps), psLain: angka(r.psLain), luarPt: angka(r.luarPt), penelitian: angka(r.penelitian),
        pkm: angka(r.pkm), tambahan: angka(r.tambahan), sesuai: teks(r.sesuai), dasarSesuai: teks(r.dasarSesuai), linier: teks(r.linier) };
    })
  };
}

/* ---------- aksi ubah ---------- */

function bersihMk(x) {
  var kode = teks(x.kode).trim().toUpperCase(), nama = potong(x.nama, 200).trim(), smt = Number(x.semester);
  if (!/^[A-Z0-9.\-]{2,20}$/.test(kode)) throw galat("Kode mata kuliah tidak valid (huruf/angka, 2–20 karakter): " + (x.kode || "(kosong)"));
  if (!nama) throw galat("Nama mata kuliah wajib diisi (" + kode + ").");
  if (!(smt >= 1 && smt <= 8 && Math.floor(smt) === smt)) throw galat("Semester harus 1–8 (" + kode + ").");
  var o = { kode: kode, nama: nama, semester: smt, kompetensi: ya(x.kompetensi), sksKuliah: angka(x.sksKuliah, 24), sksSeminar: angka(x.sksSeminar, 24),
    sksPraktik: angka(x.sksPraktik, 24), cplSikap: ya(x.cplSikap), cplPengetahuan: ya(x.cplPengetahuan), cplKu: ya(x.cplKu), cplKk: ya(x.cplKk),
    rps: potong(x.rps, 300).trim(), unit: potong(x.unit, 100).trim() || "Prodi UPW" };
  // v0.36.0: penanda "tanpa dosen pengampu". Tidak dikirim (mis. templat kurikulum lama) → nilai lama dipertahankan; MK baru → ditebak dari nama.
  if (x.tanpaTim !== undefined && x.tanpaTim !== null && String(x.tanpaTim).trim() !== "") o.tanpaTim = ya(x.tanpaTim);
  // v0.38.0: kelompok paralel; tidak dikirim (templat kurikulum lama) → nilai lama tetap.
  var kel = bersihKelompok(x.kelompok);
  if (kel !== undefined) o.kelompok = kel.length ? JSON.stringify(kel) : "";
  if (kel && kel.length && (o.tanpaTim === true)) throw galat("MK " + kode + " tidak bisa sekaligus tanpa pengampu dan berkelompok paralel.");
  if (o.sksKuliah + o.sksSeminar + o.sksPraktik <= 0) throw galat("Isi bobot sks (" + kode + ").");
  if (o.rps && !/^https:\/\//.test(o.rps) && o.rps !== "Ada") throw galat("Dokumen RPS: isi tautan https:// atau tulis Ada (" + kode + ").");
  return o;
}
function aksiDpMkSimpan(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_DP_UBAH);
  var daftar = Array.isArray(d.daftar) ? d.daftar : [d.data || {}];
  if (daftar.length > 200) throw galat("Maksimal 200 mata kuliah sekali simpan.");
  var bersih = daftar.map(bersihMk);
  return kunciTulis(function () {
    var ada = {}; semua("MataKuliah").filter(function (r) { return !r.dihapus; }).forEach(function (r) { ada[teks(r.kode)] = r; });
    var baru = 0, ubahN = 0;
    bersih.forEach(function (o, i) {
      var lamaKode = i === 0 && d.kodeLama ? teks(d.kodeLama).toUpperCase() : o.kode, r = ada[lamaKode];
      if (lamaKode !== o.kode && ada[o.kode]) throw galat("Kode " + o.kode + " sudah dipakai mata kuliah lain.");
      o.diubah = new Date();
      if (r) { ubah("MataKuliah", r, o); ubahN++; }
      else { if (o.tanpaTim === undefined) o.tanpaTim = POLA_TANPA_TIM.test(o.nama); o.id = "m" + acak(10); o.dihapus = ""; tambah("MataKuliah", o); ada[o.kode] = true; baru++; }
    });
    catat(p.id, "dp.mk", { baru: baru, ubah: ubahN });
    return { baru: baru, diubah: ubahN };
  });
}
function aksiDpMkHapus(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_DP_UBAH);
  return kunciTulis(function () {
    var r = cari("MataKuliah", function (x) { return !x.dihapus && teks(x.kode) === teks(d.kode); });
    if (!r) throw galat("Mata kuliah tidak ditemukan.");
    ubah("MataKuliah", r, { dihapus: new Date() });
    catat(p.id, "dp.mkHapus", { kode: d.kode });
    return {};
  });
}

function aksiDpPraktisiSimpan(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_DP_UBAH);
  var x = d.data || {}, o = { nama: potong(x.nama, 200).trim(), nidk: potong(x.nidk, 30).trim(), perusahaan: potong(x.perusahaan, 200).trim(),
    pendidikan: potong(x.pendidikan, 100).trim(), bidang: potong(x.bidang, 200).trim(), sertifikat: potong(x.sertifikat, 300).trim(), diubah: new Date() };
  if (!o.nama) throw galat("Nama praktisi wajib diisi.");
  if (!o.perusahaan) throw galat("Isi perusahaan/industri asal praktisi.");
  // v0.29.0: isian tambahan hanya ditulis bila dikirim (tampilan lama tetap bisa menyimpan tanpa menghapusnya).
  if ("jabatan" in x) o.jabatan = potong(x.jabatan, 200).trim();
  if ("penerbit" in x) o.penerbit = potong(x.penerbit, 200).trim();
  if ("kerjaSama" in x) o.kerjaSama = potong(x.kerjaSama, 300).trim();
  if ("memimpinTim" in x) o.memimpinTim = x.memimpinTim ? "Ya" : "";
  if ("pengalaman" in x) {
    var pg = teks(x.pengalaman).trim().replace(",", ".");
    if (pg !== "" && !(/^\d{1,2}(\.\d)?$/.test(pg) && Number(pg) <= 60)) throw galat("Lama pengalaman kerja diisi angka tahun (0–60).");
    o.pengalaman = pg === "" ? "" : Number(pg);
  }
  return kunciTulis(function () {
    var r = x.id ? cari("Praktisi", function (y) { return y.id === x.id && !y.dihapus; }) : null;
    if (x.id && !r) throw galat("Praktisi tidak ditemukan.");
    if (r) ubah("Praktisi", r, o); else { o.id = "p" + acak(10); o.dihapus = ""; tambah("Praktisi", o); }
    catat(p.id, "dp.praktisi", { id: r ? r.id : o.id });
    return {};
  });
}
function aksiDpPraktisiHapus(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_DP_UBAH);
  return kunciTulis(function () {
    var r = cari("Praktisi", function (y) { return y.id === d.id && !y.dihapus; });
    if (!r) throw galat("Praktisi tidak ditemukan.");
    ubah("Praktisi", r, { dihapus: new Date() });
    catat(p.id, "dp.praktisiHapus", { id: d.id });
    return {};
  });
}
/** Unggah / tautkan / hapus bukti praktisi: d = { id, slot, berkas: {nama, isi} | tautan | hapus: true }. Bukti lama dibuang ke sampah Drive. */
function aksiDpPraktisiBukti(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_DP_UBAH);
  var slot = String(d.slot || "");
  if (!SLOT_BUKTI_PRAKTISI.some(function (s) { return s.k === slot; })) throw galat("Jenis bukti tidak dikenal.");
  var r0 = cari("Praktisi", function (y) { return y.id === String(d.id || "") && !y.dihapus; });
  if (!r0) throw galat("Praktisi tidak ditemukan.");
  var baru = null, file = null, w = new Date().toISOString();
  if (d.hapus) baru = null;
  else if (d.tautan) {
    var url = teks(d.tautan).trim();
    if (!/^https:\/\/[^\s<>"]+$/.test(url) || url.length > 500) throw galat("Tautan bukti harus diawali https:// dan tanpa spasi.");
    baru = { t: "tautan", url: url, o: p.id, w: w };
  } else if (d.berkas && d.berkas.isi) {
    var nama = namaAman(d.berkas.nama), eks = (nama.split(".").pop() || "").toLowerCase();
    if (["pdf", "jpg", "jpeg", "png"].indexOf(eks) < 0) throw galat("Bukti berupa PDF atau gambar (JPG/PNG).");
    var bytes = Utilities.base64Decode(teks(d.berkas.isi));
    if (bytes.length > BUKTI_PRAKTISI_MAKS) throw galat("Bukti maksimal 10 MB. Untuk berkas besar, pakai tautan Google Drive.");
    if (!isiSesuai(eks, bytes)) throw galat("Isi berkas tidak sesuai dengan jenisnya (." + eks + ").");
    file = folderAnak(folderAnak(DriveApp.getFolderById(prop("FOLDER_ID")), "Praktisi"), namaAman(teks(r0.nama)) + " (" + r0.id + ")")
      .createFile(Utilities.newBlob(bytes, BUKTI_EKS[eks], slot + " - " + nama));
    baru = { t: "file", fileId: file.getId(), nama: nama, mime: BUKTI_EKS[eks], ukuran: bytes.length, o: p.id, w: w };
  } else throw galat("Pilih berkas atau isi tautan bukti.");
  try {
    return kunciTulis(function () {
      var r = cari("Praktisi", function (y) { return y.id === r0.id && !y.dihapus; });
      if (!r) throw galat("Praktisi tidak ditemukan.");
      var b = jsonDari(r.bukti, {}) || {}, lama = b[slot];
      if (baru) b[slot] = baru; else delete b[slot];
      ubah("Praktisi", r, { bukti: JSON.stringify(b), diubah: new Date() });
      if (lama && lama.t === "file") try { DriveApp.getFileById(lama.fileId).setTrashed(true); } catch (e) {}
      catat(p.id, "dp.praktisiBukti", { id: r.id, slot: slot, t: baru ? baru.t : "hapus" });
      return { bukti: buktiPraktisiKeKlien(b) };
    });
  } catch (e) { if (file) try { file.setTrashed(true); } catch (_) {} throw e; }
}
function aksiDpPraktisiBuktiLihat(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_DP_LIHAT);
  var r = cari("Praktisi", function (y) { return y.id === String(d.id || "") && !y.dihapus; }), b = r ? (jsonDari(r.bukti, {}) || {})[String(d.slot || "")] : null;
  if (!b || b.t !== "file") throw galat("Bukti tidak ditemukan.");
  catat(p.id, "dp.praktisiBuktiLihat", { id: r.id, slot: d.slot });
  return { nama: b.nama, mime: b.mime, isi: Utilities.base64Encode(DriveApp.getFileById(b.fileId).getBlob().getBytes()) };
}

function aksiDpTimSimpan(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_DP_UBAH);
  var smt = String(d.semester || "");
  if (!/^\d{4}-[12]$/.test(smt)) throw galat("Semester tidak valid.");
  var tulis = siapkanTim(smt, d, rujukanTim());
  return kunciTulis(function () { tulisTim(p, smt, teks(d.kodeMk), tulis); return {}; });
}
/** Daftar dosen, praktisi, dan MK untuk memeriksa tim (dipakai simpan satu MK dan impor Excel). */
function rujukanTim() {
  var r = { dosen: {}, prak: {}, mk: {} };
  daftarDosen().forEach(function (x) { r.dosen[x.id] = 1; });
  semuaPraktisi().forEach(function (x) { r.prak[x.id] = 1; });
  semuaMk().forEach(function (m) { r.mk[m.kode] = m; });
  return r;
}
/** Periksa tim satu MK (d.kodeMk + d.anggota, atau d.perKelas {A: [], B: []}) → daftar baris yang akan ditulis [{kelas, ang}]. */
function siapkanTim(smt, d, ruj) {
  var kode = teks(d.kodeMk), mk = ruj.mk[kode];
  if (!mk) throw galat("Mata kuliah tidak ditemukan.");
  if (mk.tanpaTim) throw galat("Mata kuliah ini ditandai tanpa dosen pengampu (magang/tugas akhir). Ubah penandanya di Kurikulum bila perlu tim.");
  if ((mk.semester % 2 === 1) !== /-1$/.test(smt)) throw galat("Mata kuliah semester " + mk.semester + " tidak ditawarkan di " + labelSmt(smt) + ".");
  var dosen = ruj.dosen, prak = ruj.prak;
  function bersihTim(daftar, label) {
    var ang = (Array.isArray(daftar) ? daftar : []).filter(function (a) { return a && a.id; }).map(function (a) { return { t: a.t === "p" ? "p" : "u", id: String(a.id) }; });
    var unik = {}; ang = ang.filter(function (a) { if (unik[a.id]) return false; unik[a.id] = 1; return true; });
    if (ang.length > 3) throw galat("Tim pengajar" + label + " maksimal 3 orang, termasuk praktisi.");
    ang.forEach(function (a) { if (a.t === "u" ? !dosen[a.id] : !prak[a.id]) throw galat("Ada anggota tim" + label + " yang tidak ditemukan."); });
    if (ang.length && ang[0].t !== "u") throw galat("Pengampu utama" + label + " harus dosen (bukan praktisi).");
    return ang;
  }
  // v0.28.0: d.perKelas = { A: anggota[], B: anggota[] } → tim berbeda per kelas; tanpa perKelas = sama untuk semua kelas (seperti sebelumnya).
  var tulis = [];
  if (d.perKelas && typeof d.perKelas === "object" && !Array.isArray(d.perKelas)) {
    var kelMk = {}; (mk.kelompok || []).forEach(function (g) { kelMk[g.n.toUpperCase()] = g.n; });
    Object.keys(d.perKelas).forEach(function (k) {
      var kk = String(k).trim().toUpperCase(), bagian = kk.split("/");
      if (mk.kelompok && mk.kelompok.length) {
        // v0.38.0: MK berkelompok → kunci "KELAS/KELOMPOK" dengan kelompok yang terdaftar di kurikulum.
        if (bagian.length !== 2 || !/^[A-Z0-9]{1,3}$/.test(bagian[0]) || !kelMk[bagian[1]]) throw galat("Kelompok tidak valid untuk " + mk.kode + ": " + k + " (pilihan: " + mk.kelompok.map(function (g) { return g.n; }).join(", ") + ").");
      } else if (!/^[A-Z0-9]{1,3}$/.test(kk)) throw galat("Kelas tidak valid: " + k);
      var ang = bersihTim(d.perKelas[k], " kelas " + kk);
      if (ang.length) tulis.push({ kelas: kk, ang: ang });
    });
    tulis.sort(function (a, b) { return a.kelas.localeCompare(b.kelas); });
  } else {
    if (mk.kelompok && mk.kelompok.length && Array.isArray(d.anggota) && d.anggota.length) throw galat("Mata kuliah " + mk.kode + " berkelompok paralel (" + mk.kelompok.map(function (g) { return g.n; }).join(", ") + "): tetapkan pengampu per kelas dan kelompok.");
    var ang0 = bersihTim(d.anggota, "");
    if (ang0.length) tulis.push({ kelas: "", ang: ang0 });
  }
  return tulis;
}
/** Tulis tim satu MK (di dalam kunciTulis). */
function tulisTim(p, smt, kode, tulis) {
    var lama = semua("TimPengajar").filter(function (x) { return String(x.semester) === smt && teks(x.kodeMk) === kode; });
    // Baris pertama diperbarui (urutan sheet tetap), sisanya dihapus dari bawah, lalu kelas tambahan ditambahkan.
    var oDari = function (t) { return { semester: smt, kodeMk: kode, anggota: JSON.stringify(t.ang), diubah: new Date(), oleh: p.id, kelas: t.kelas }; };
    lama.slice(tulis.length ? 1 : 0).sort(function (a, b) { return b._baris - a._baris; }).forEach(function (r) { hapusBaris("TimPengajar", r); });
    if (tulis.length && lama.length) {
      var r0 = semua("TimPengajar").filter(function (x) { return String(x.semester) === smt && teks(x.kodeMk) === kode; })[0];
      ubah("TimPengajar", r0, oDari(tulis[0]));
    } else if (tulis.length) tambah("TimPengajar", oDari(tulis[0]));
    tulis.slice(1).forEach(function (t) { tambah("TimPengajar", oDari(t)); });
    catat(p.id, "dp.tim", { semester: smt, kode: kode, n: tulis.reduce(function (n, t) { return n + t.ang.length; }, 0), kelas: tulis.map(function (t) { return t.kelas || "semua"; }).join(",") });
}
/**
 * v0.35.0: impor tim pengajar dari templat Excel (HANYA KPS dan Admin Prodi; permintaan pemilik 19 Nov 2026).
 * d.semester, d.daftar = [{kodeMk, anggota} | {kodeMk, perKelas}] (nama sudah dicocokkan tampilan menjadi id). Aturan sama dengan dp.timSimpan.
 * MK yang tidak ada di daftar tidak diubah; MK yang tidak lolos pemeriksaan dilewati (dilaporkan), yang lain tetap tersimpan.
 */
function aksiDpTimImpor(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_TIM_IMPOR);
  var smt = String(d.semester || ""), daftar = Array.isArray(d.daftar) ? d.daftar : [];
  if (!/^\d{4}-[12]$/.test(smt)) throw galat("Semester tidak valid.");
  if (!daftar.length) throw galat("Tidak ada tim untuk diimpor.");
  if (daftar.length > 200) throw galat("Maksimal 200 mata kuliah per impor.");
  var ruj = rujukanTim(), siap = [], lewati = [], dobel = {};
  daftar.forEach(function (x, i) {
    var kode = teks(x && x.kodeMk);
    try {
      if (dobel[kode]) throw galat("Mata kuliah muncul lebih dari sekali di berkas.");
      dobel[kode] = 1;
      var t = siapkanTim(smt, x, ruj);
      if (!t.length) throw galat("Tim kosong (tidak diubah).");
      siap.push({ kode: kode, tulis: t });
    } catch (e) { lewati.push({ baris: i + 1, nip: kode, alasan: e.message }); }
  });
  return kunciTulis(function () {
    siap.forEach(function (x) { tulisTim(p, smt, x.kode, x.tulis); });
    catat(p.id, "dp.timImpor", { semester: smt, disimpan: siap.length, dilewati: lewati.length });
    return { disimpan: siap.length, dilewati: lewati };
  });
}
/** Salin tim dari semester yang sama tahun lalu ke MK yang belum punya tim. */
function aksiDpTimSalin(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_DP_UBAH);
  var smt = String(d.semester || "");
  if (!/^\d{4}-[12]$/.test(smt)) throw galat("Semester tidak valid.");
  var dari = (Number(smt.slice(0, 4)) - 1) + smt.slice(4);
  return kunciTulis(function () {
    var asal = timSemester(dari), kini = timSemester(smt), n = 0, mks = {};
    semuaMk().forEach(function (m) { mks[m.kode] = 1; });
    Object.keys(asal).forEach(function (kd) {
      if (kini[kd] || !mks[kd] || !asal[kd].anggota.length) return;
      Object.keys(asal[kd].kelas).sort().forEach(function (k) {
        var ang = asal[kd].kelas[k] || [];
        if (ang.length) tambah("TimPengajar", { semester: smt, kodeMk: kd, anggota: JSON.stringify(ang), diubah: new Date(), oleh: p.id, kelas: k });
      });
      n++;
    });
    catat(p.id, "dp.timSalin", { dari: dari, ke: smt, n: n });
    return { disalin: n, dari: labelSmt(dari) };
  });
}

function aksiDpDosenTsSimpan(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_DP_UBAH);
  var ta = Number(d.ta), x = d.data || {};
  if (!(ta >= 2015 && ta < 2100)) throw galat("Tahun akademik tidak valid.");
  if (!daftarDosen().some(function (y) { return y.id === x.userId; })) throw galat("Dosen tidak ditemukan.");
  var o = { userId: x.userId, ta: ta, ps: x.ps === "" || x.ps === null || x.ps === undefined ? "" : angka(x.ps, 60), psLain: angka(x.psLain, 60), luarPt: angka(x.luarPt, 60),
    penelitian: angka(x.penelitian, 60), pkm: angka(x.pkm, 60), tambahan: angka(x.tambahan, 60),
    sesuai: ["Ya", "Tidak"].indexOf(x.sesuai) >= 0 ? x.sesuai : "", diubah: new Date(),
    dasarSesuai: ["Ya", "Tidak"].indexOf(x.dasarSesuai) >= 0 ? x.dasarSesuai : "", linier: ["Ya", "Tidak"].indexOf(x.linier) >= 0 ? x.linier : "" };
  return kunciTulis(function () {
    var r = cari("DosenTs", function (y) { return y.userId === x.userId && Number(y.ta) === ta; });
    if (r) ubah("DosenTs", r, o); else tambah("DosenTs", o);
    catat(p.id, "dp.dosenTs", { userId: x.userId, ta: ta });
    return {};
  });
}

/* ---------- Tabel iLKPS 1–6 ---------- */

function tabelDosen(ts) {
  var T = [], mks = semuaMk(), ampu = ampuTs(ts, mks), dosen = daftarDosen(), dts = dosenTs(ts), prak = semuaPraktisi();
  var JA = ["Tenaga Pengajar", "Asisten Ahli", "Lektor", "Lektor Kepala", "Guru Besar"];
  var tetap = dosen.filter(function (x) { return STATUS_TETAP.indexOf(x.status) >= 0; });
  var mkDari_ = function (id) { return (ampu[id] || { mk: [] }).mk.join("; "); };
  var kosongStatus = dosen.filter(function (x) { return !x.status; }).length;
  T.push({ kode: "1", judul: "Tabel 1) Dosen Tetap Perguruan Tinggi", bentuk: "daftar",
    kolom: ["No.", "Nama Dosen", "NIDN/NIDK", "Pendidikan Dasar (D1,D2,D3,ST/S1)", "Magister/Magister Terapan/Spesialis", "Doktor/Doktor Terapan/Spesialis",
      "Terdaftar di PD Dikti (DT)", "Bidang Keahlian", "Kesesuaian dengan Kompetensi Inti PS (DTPS)", "Jabatan Akademik", "Sertifikat Pendidik Profesional",
      "Sertifikat Kompetensi/Profesi/Industri", "Mata Kuliah yang Diampu pada PS yang Diakreditasi", "Kesesuaian Bidang Keahlian dengan Mata Kuliah yang Diampu", "Mata Kuliah yang Diampu pada PS Lain"],
    baris: tetap.map(function (x, i) { var r = dts[x.id] || {}; return [i + 1, x.nama, x.nidn, x.pendS1, x.pendS2, x.pendS3, x.pddikti === "Ya" ? "V" : "", x.bidang,
      x.status === STATUS_TETAP[0] ? "V" : "", x.jabfung, x.serdos, x.sertKomp, mkDari_(x.id), teks(r.sesuai) === "Ya" ? "V" : "", x.mkLain]; }),
    akun: tetap.map(function (x) { return x.id; }),
    catatan: "Sumber: biodata dosen (status dosen tetap) dan tim pengajar TS-2 s.d. TS (mata kuliah yang diampu). Kesesuaian bidang keahlian diisi Admin di Data Prodi › Data dosen TS." +
      (kosongStatus ? " " + kosongStatus + " akun dosen belum mengisi status dosen di biodata." : "") });
  var industri = dosen.filter(function (x) { return x.status === "Dosen industri / praktisi"; });
  var b2 = prak.map(function (x) { var a = ampu[x.id] || { mk: [], sksPenuh: 0 }; return [x.nama, x.nidk, x.perusahaan, x.pendidikan, x.bidang, sertifikatPraktisi(x), a.mk.join("; "), a.sksPenuh]; })
    .concat(industri.map(function (x) { var a = ampu[x.id] || { mk: [], sksPenuh: 0 }; return [x.nama, x.nidn, "", x.pendS3 ? "S3" : x.pendS2 ? "S2" : x.pendS1 ? "S1/D4" : "", x.bidang, x.sertKomp, a.mk.join("; "), a.sksPenuh]; }));
  T.push({ kode: "2", judul: "Tabel 2) Dosen Industri/Praktisi", bentuk: "daftar",
    kolom: ["No.", "Nama Dosen Industri/Praktisi", "NIDK", "Perusahaan/Industri", "Pendidikan Tertinggi", "Bidang Keahlian", "Sertifikat Profesi/Kompetensi/Industri", "Mata Kuliah yang Diampu", "Bobot Kredit (sks)"],
    baris: b2.map(function (r, i) { return [i + 1].concat(r); }), catatan: "Sumber: Data Prodi › Praktisi dan tim pengajar TS-2 s.d. TS (bobot = jumlah sks MK yang diampu, tiap MK sekali). Sertifikat ditulis dengan lembaga penerbitnya." });
  var tt = dosen.filter(function (x) { return x.status === "Dosen tidak tetap"; });
  T.push({ kode: "3", judul: "Tabel 3) Dosen Tidak Tetap", bentuk: "daftar",
    kolom: ["No.", "Nama Dosen", "NIDN/NIDK", "Pendidikan Pasca Sarjana", "Bidang Keahlian", "Jabatan Akademik", "Sertifikat Pendidik Profesional",
      "Sertifikat Kompetensi/Profesi/Industri", "Mata Kuliah yang Diampu pada PS yang Diakreditasi", "Kesesuaian Bidang Keahlian dengan Mata Kuliah yang Diampu"],
    baris: tt.map(function (x, i) { var r = dts[x.id] || {}; return [i + 1, x.nama, x.nidn, [x.pendS2, x.pendS3].filter(String).join("; "), x.bidang, x.jabfung, x.serdos, x.sertKomp, mkDari_(x.id), teks(r.sesuai) === "Ya" ? "V" : ""]; }),
    akun: tt.map(function (x) { return x.id; }), catatan: "Sumber: biodata dosen berstatus dosen tidak tetap; mata kuliah yang diampu dari tim pengajar TS-2 s.d. TS." });
  T.push({ kode: "4", judul: "Tabel 4) Kurikulum, Capaian Pembelajaran, dan Rencana Pembelajaran", bentuk: "daftar",
    kolom: ["No.", "Semester", "Kode Mata Kuliah", "Nama Mata Kuliah", "Mata Kuliah Kompetensi", "Kuliah/Responsi/Tutorial (sks)", "Seminar (sks)",
      "Praktikum/Praktik/Praktik Lapangan (sks)", "Konversi Kredit ke Jam", "CPL: Sikap", "CPL: Pengetahuan", "CPL: Keterampilan Umum", "CPL: Keterampilan Khusus",
      "Dokumen Rencana Pembelajaran", "Unit Penyelenggara"],
    baris: mks.map(function (m, i) { return [i + 1, m.semester, m.kode, m.nama, m.kompetensi ? "V" : "", m.sksKuliah, m.sksSeminar, m.sksPraktik, sksMk(m) * JAM_PER_SKS,
      m.cplSikap ? "V" : "", m.cplPengetahuan ? "V" : "", m.cplKu ? "V" : "", m.cplKk ? "V" : "", m.rps, m.unit]; }),
    catatan: "Konversi jam = total sks × " + JAM_PER_SKS + " jam/semester (Permendikbudristek 53/2023). Total " + mks.reduce(function (s, m) { return s + sksMk(m); }, 0) + " sks, " +
      mks.reduce(function (s, m) { return s + m.sksPraktik; }, 0) + " sks praktik." });
  // Tabel 5: pembimbing utama TA, dari kegiatan "bimbingan" yang disetujui.
  var idx = indeksOrang(), tsL = [ts - 2, ts - 1, ts], hit = {};
  var sis = idAkunSistem();
  semuaKegiatan().filter(function (k) { return k.jenis === "bimbingan" && k.status === "disetujui" && !sis[k.olehId] && teks(k.isian.Peran) === "Pembimbing utama"; }).forEach(function (k) {
    var c = tsL.indexOf(taKegiatan(k)); if (c < 0) return;
    var lain = teks(k.isian["Prodi mahasiswa"]) === "Prodi lain di Poltekpar Bali", n = lain ? angka(k.isian["Jumlah mahasiswa (prodi lain)"], 500) : mhsKegiatan(k, idx).length;
    var ds = [k.olehId].concat(k.pegawai).filter(function (id, i, a) { return a.indexOf(id) === i && idx.byId[id] && idx.byId[id].jenis === "dosen"; });
    ds.forEach(function (id) { var h = hit[id] = hit[id] || [[0, 0, 0], [0, 0, 0]]; h[lain ? 1 : 0][c] += n; });
  });
  var rata = function (a) { return Math.round((a[0] + a[1] + a[2]) / 3 * 100) / 100; };
  T.push({ kode: "5", judul: "Tabel 5) Dosen Pembimbing Utama Tugas Akhir", bentuk: "daftar",
    kolom: ["No.", "Nama Dosen", "PS diakreditasi: TS-2", "PS diakreditasi: TS-1", "PS diakreditasi: TS", "PS diakreditasi: Rata-rata", "PS lain: TS-2", "PS lain: TS-1", "PS lain: TS", "PS lain: Rata-rata", "Rata-rata Jumlah Bimbingan di semua Program/Semester"],
    baris: tetap.map(function (x, i) { var h = hit[x.id] || [[0, 0, 0], [0, 0, 0]]; return [i + 1, x.nama].concat(h[0], [rata(h[0])], h[1], [rata(h[1]), Math.round((rata(h[0]) + rata(h[1])) * 100) / 100]); }),
    akun: tetap.map(function (x) { return x.id; }),
    catatan: "Sumber: kegiatan \"Bimbingan tugas akhir\" yang disetujui dengan peran Pembimbing utama; mahasiswa UPW dihitung dari yang ditandai, prodi lain dari isian jumlah." });
  T.push({ kode: "6", judul: "Tabel 6) Ekuivalen Waktu Mengajar Penuh (EWMP) Dosen Tetap Perguruan Tinggi (TS)", bentuk: "daftar",
    kolom: ["No.", "Nama Dosen (DT)", "DTPS", "Pendidikan: PS yang Diakreditasi (sks)", "Pendidikan: PS Lain di dalam PT (sks)", "Pendidikan: PS Lain di luar PT (sks)",
      "Penelitian (sks)", "PkM (sks)", "Tugas Tambahan dan/atau Penunjang (sks)", "Jumlah (sks)", "Rata-rata per Semester (sks)"],
    baris: tetap.map(function (x, i) {
      var r = dts[x.id] || {}, ps = r.ps === "" || r.ps === undefined ? Math.round(((ampu[x.id] || {}).sks || 0) * 100) / 100 : angka(r.ps);
      var v = [ps, angka(r.psLain), angka(r.luarPt), angka(r.penelitian), angka(r.pkm), angka(r.tambahan)], j = Math.round(v.reduce(function (s, n) { return s + n; }, 0) * 100) / 100;
      return [i + 1, x.nama, x.status === STATUS_TETAP[0] ? "V" : ""].concat(v, [j, Math.round(j / 2 * 100) / 100]); }),
    akun: tetap.map(function (x) { return x.id; }),
    catatan: "Pendidikan di PS dihitung dari tim pengajar TS (sks MK dibagi rata ke dosen dalam tim) kecuali ditimpa Admin; kolom lain diisi Admin di Data Prodi › Data dosen TS (mis. dari BKD)." });
  return T;
}
