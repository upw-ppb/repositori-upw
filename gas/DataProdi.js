/**
 * Data Prodi (v0.8.0): kurikulum, tim pengajar per semester, dosen industri/praktisi, dan data dosen per TS (EWMP).
 * Sumber Tabel iLKPS 1–6. Diubah oleh Admin Prodi / Super Admin; KPS dapat melihat.
 * - Tim pengajar berlaku satu semester (kode semester "2025-1" = Ganjil 2025/2026, "2025-2" = Genap 2025/2026);
 *   anggota[0] = pengampu utama; maks. 3 orang termasuk praktisi. Anggota: {t:"u", id: userId dosen} | {t:"p", id: id praktisi}.
 * - EWMP pendidikan di PS dihitung dari tim pengajar TS (sks MK dibagi rata ke dosen dalam tim), bisa ditimpa Admin.
 */
var PERAN_DP_UBAH = ["admin", "superadmin"];
var PERAN_DP_LIHAT = ["admin", "superadmin", "kps"];
var JAM_PER_SKS = 45; // Permendikbudristek 53/2023: 1 sks = 45 jam per semester

function angka(v, maks) { var n = Number(String(v === undefined || v === null ? "" : v).replace(",", ".")); return isFinite(n) && n >= 0 && n <= (maks || 1000) ? Math.round(n * 100) / 100 : 0; }
function ya(v) { return v === true || v === "TRUE" || v === "Ya" || v === "ya" || v === 1 || v === "1" || v === "V" || v === "v"; }
function kodeSmt(awal, ganjil) { return awal + "-" + (ganjil ? 1 : 2); }
function labelSmt(kode) { var m = /^(\d{4})-([12])$/.exec(kode); return m ? (m[2] === "1" ? "Ganjil " : "Genap ") + m[1] + "/" + (Number(m[1]) + 1) : kode; }

/* ---------- baca ---------- */

function mkDari(r) {
  return { _r: r, id: r.id, kode: teks(r.kode), nama: teks(r.nama), semester: Number(r.semester) || 0, kompetensi: ya(r.kompetensi),
    sksKuliah: angka(r.sksKuliah), sksSeminar: angka(r.sksSeminar), sksPraktik: angka(r.sksPraktik),
    cplSikap: ya(r.cplSikap), cplPengetahuan: ya(r.cplPengetahuan), cplKu: ya(r.cplKu), cplKk: ya(r.cplKk), rps: teks(r.rps), unit: teks(r.unit) || "Prodi UPW" };
}
function semuaMk() { return semua("MataKuliah").filter(function (r) { return !r.dihapus; }).map(mkDari).sort(function (a, b) { return a.semester - b.semester || a.kode.localeCompare(b.kode); }); }
function sksMk(m) { return m.sksKuliah + m.sksSeminar + m.sksPraktik; }
function praktisiDari(r) {
  return { _r: r, id: r.id, nama: teks(r.nama), nidk: teks(r.nidk), perusahaan: teks(r.perusahaan), pendidikan: teks(r.pendidikan),
    bidang: teks(r.bidang), sertifikat: teks(r.sertifikat) };
}
function semuaPraktisi() { return semua("Praktisi").filter(function (r) { return !r.dihapus; }).map(praktisiDari).sort(function (a, b) { return a.nama.localeCompare(b.nama); }); }
function timSemester(kode) {
  var m = {};
  semua("TimPengajar").filter(function (r) { return String(r.semester) === kode; }).forEach(function (r) { m[teks(r.kodeMk)] = { _r: r, anggota: jsonDari(r.anggota, []) }; });
  return m;
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
  return semua("Pengguna").filter(function (p) { return p.status !== "nonaktif" && peranDari(p).indexOf("dosen") >= 0; }).map(function (p) {
    var b = bio[p.id] || {};
    return { id: p.id, nama: p.nama, nip: String(p.username), nidn: teks(b.nidn), status: teks(b.statusDosen), jabfung: teks(b.jabfung),
      pendS1: teks(b.pendS1), pendS2: teks(b.pendS2), pendS3: teks(b.pendS3), pddikti: teks(b.pddikti), bidang: teks(b.bidang),
      serdos: teks(b.serdos), sertKomp: teks(b.sertKomp), mkLain: teks(b.mkLain), inisial: teks(b.inisial) };
  }).sort(function (a, b) { return a.nama.localeCompare(b.nama); });
}
var STATUS_TETAP = ["Dosen tetap program studi (DTPS)", "Dosen tetap PT di luar program studi"];

/** MK yang diampu per anggota (userId / id praktisi) pada semester-semester TS, beserta bagian sks untuk EWMP. */
function ampuTs(ts, mks) {
  var hasil = {}, byKode = {};
  mks.forEach(function (m) { byKode[m.kode] = m; });
  [kodeSmt(ts, true), kodeSmt(ts, false)].forEach(function (smt) {
    var tim = timSemester(smt);
    Object.keys(tim).forEach(function (kd) {
      var m = byKode[kd]; if (!m) return;
      var ang = tim[kd].anggota, dosen = ang.filter(function (a) { return a.t === "u"; });
      ang.forEach(function (a) {
        var h = hasil[a.id] = hasil[a.id] || { mk: [], sks: 0, sksPenuh: 0 };
        if (h.mk.indexOf(m.kode + " " + m.nama) < 0) h.mk.push(m.kode + " " + m.nama);
        h.sksPenuh += sksMk(m);
        if (a.t === "u") h.sks += sksMk(m) / dosen.length;
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
  var ta = Number(d.ta) || tsAwal(), mks = semuaMk(), tim = timSemester(smt), dts = dosenTs(ta), ampu = ampuTs(ta, mks);
  // Semester berikutnya (untuk persiapan) sampai 10 semester ke belakang.
  var pilihanSmt = [], kk = s.ganjil ? kodeSmt(s.awal, false) : kodeSmt(s.awal + 1, true);
  for (var i = 0; i < 11; i++) { pilihanSmt.push(kk); kk = /-1$/.test(kk) ? kodeSmt(Number(kk.slice(0, 4)) - 1, false) : kodeSmt(Number(kk.slice(0, 4)), true); }
  var ganjil = /-1$/.test(smt);
  var semua_ = mks.map(function (m) { var x = Object.assign({}, m); delete x._r; x.sks = sksMk(m); return x; });
  return {
    bolehUbah: punyaPeran(p, PERAN_DP_UBAH),
    mk: semua_, jamPerSks: JAM_PER_SKS,
    praktisi: semuaPraktisi().map(function (x) { delete x._r; return x; }),
    dosen: daftarDosen().map(function (x) { return { id: x.id, nama: x.nama, inisial: x.inisial, status: x.status }; }),
    semester: smt, labelSemester: labelSmt(smt), pilihanSemester: pilihanSmt.map(function (k) { return { kode: k, label: labelSmt(k) }; }),
    tim: semua_.filter(function (m) { return m.semester % 2 === (ganjil ? 1 : 0); }).map(function (m) { return { kode: m.kode, nama: m.nama, sks: m.sks, anggota: tim[m.kode] ? tim[m.kode].anggota : [] }; }),
    salinDari: labelSmt(kodeSmt(Number(smt.slice(0, 4)) - 1, ganjil)),
    ta: ta, labelTa: labelTa(ta),
    dosenTs: daftarDosen().filter(function (x) { return x.status !== "Dosen industri / praktisi"; }).map(function (x) {
      var r = dts[x.id] || {}, a2 = ampu[x.id] || { sks: 0, mk: [] };
      return { id: x.id, nama: x.nama, status: x.status, sksPsHitung: Math.round(a2.sks * 100) / 100, mk: a2.mk,
        ps: r.ps === "" || r.ps === undefined ? "" : angka(r.ps), psLain: angka(r.psLain), luarPt: angka(r.luarPt), penelitian: angka(r.penelitian),
        pkm: angka(r.pkm), tambahan: angka(r.tambahan), sesuai: teks(r.sesuai) };
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
      else { o.id = "m" + acak(10); o.dihapus = ""; tambah("MataKuliah", o); ada[o.kode] = true; baru++; }
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

function aksiDpTimSimpan(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_DP_UBAH);
  var smt = String(d.semester || ""), kode = teks(d.kodeMk);
  if (!/^\d{4}-[12]$/.test(smt)) throw galat("Semester tidak valid.");
  var mk = semuaMk().filter(function (m) { return m.kode === kode; })[0];
  if (!mk) throw galat("Mata kuliah tidak ditemukan.");
  if ((mk.semester % 2 === 1) !== /-1$/.test(smt)) throw galat("Mata kuliah semester " + mk.semester + " tidak ditawarkan di " + labelSmt(smt) + ".");
  var dosen = {}, prak = {};
  daftarDosen().forEach(function (x) { dosen[x.id] = 1; });
  semuaPraktisi().forEach(function (x) { prak[x.id] = 1; });
  var ang = (Array.isArray(d.anggota) ? d.anggota : []).filter(function (a) { return a && a.id; }).map(function (a) { return { t: a.t === "p" ? "p" : "u", id: String(a.id) }; });
  var unik = {}; ang = ang.filter(function (a) { if (unik[a.id]) return false; unik[a.id] = 1; return true; });
  if (ang.length > 3) throw galat("Tim pengajar maksimal 3 orang, termasuk praktisi.");
  ang.forEach(function (a) { if (a.t === "u" ? !dosen[a.id] : !prak[a.id]) throw galat("Ada anggota tim yang tidak ditemukan."); });
  if (ang.length && ang[0].t !== "u") throw galat("Pengampu utama harus dosen (bukan praktisi).");
  return kunciTulis(function () {
    var r = cari("TimPengajar", function (x) { return String(x.semester) === smt && teks(x.kodeMk) === kode; });
    var o = { semester: smt, kodeMk: kode, anggota: JSON.stringify(ang), diubah: new Date(), oleh: p.id };
    if (r) ubah("TimPengajar", r, o); else tambah("TimPengajar", o);
    catat(p.id, "dp.tim", { semester: smt, kode: kode, n: ang.length });
    return {};
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
      tambah("TimPengajar", { semester: smt, kodeMk: kd, anggota: JSON.stringify(asal[kd].anggota), diubah: new Date(), oleh: p.id }); n++;
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
    sesuai: ["Ya", "Tidak"].indexOf(x.sesuai) >= 0 ? x.sesuai : "", diubah: new Date() };
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
    catatan: "Sumber: biodata dosen (status dosen tetap) dan tim pengajar semester TS. Kesesuaian bidang keahlian diisi Admin di Data Prodi › Data dosen TS." +
      (kosongStatus ? " " + kosongStatus + " akun dosen belum mengisi status dosen di biodata." : "") });
  var industri = dosen.filter(function (x) { return x.status === "Dosen industri / praktisi"; });
  var b2 = prak.map(function (x) { var a = ampu[x.id] || { mk: [], sksPenuh: 0 }; return [x.nama, x.nidk, x.perusahaan, x.pendidikan, x.bidang, x.sertifikat, a.mk.join("; "), a.sksPenuh]; })
    .concat(industri.map(function (x) { var a = ampu[x.id] || { mk: [], sksPenuh: 0 }; return [x.nama, x.nidn, "", x.pendS3 ? "S3" : x.pendS2 ? "S2" : x.pendS1 ? "S1/D4" : "", x.bidang, x.sertKomp, a.mk.join("; "), a.sksPenuh]; }));
  T.push({ kode: "2", judul: "Tabel 2) Dosen Industri/Praktisi", bentuk: "daftar",
    kolom: ["No.", "Nama Dosen Industri/Praktisi", "NIDK", "Perusahaan/Industri", "Pendidikan Tertinggi", "Bidang Keahlian", "Sertifikat Profesi/Kompetensi/Industri", "Mata Kuliah yang Diampu", "Bobot Kredit (sks)"],
    baris: b2.map(function (r, i) { return [i + 1].concat(r); }), catatan: "Sumber: Data Prodi › Praktisi dan tim pengajar semester TS (bobot = jumlah sks MK yang diampu)." });
  var tt = dosen.filter(function (x) { return x.status === "Dosen tidak tetap"; });
  T.push({ kode: "3", judul: "Tabel 3) Dosen Tidak Tetap", bentuk: "daftar",
    kolom: ["No.", "Nama Dosen", "NIDN/NIDK", "Pendidikan Pasca Sarjana", "Bidang Keahlian", "Jabatan Akademik", "Sertifikat Pendidik Profesional",
      "Sertifikat Kompetensi/Profesi/Industri", "Mata Kuliah yang Diampu pada PS yang Diakreditasi", "Kesesuaian Bidang Keahlian dengan Mata Kuliah yang Diampu"],
    baris: tt.map(function (x, i) { var r = dts[x.id] || {}; return [i + 1, x.nama, x.nidn, [x.pendS2, x.pendS3].filter(String).join("; "), x.bidang, x.jabfung, x.serdos, x.sertKomp, mkDari_(x.id), teks(r.sesuai) === "Ya" ? "V" : ""]; }),
    akun: tt.map(function (x) { return x.id; }), catatan: "Sumber: biodata dosen berstatus dosen tidak tetap." });
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
  semuaKegiatan().filter(function (k) { return k.jenis === "bimbingan" && k.status === "disetujui" && teks(k.isian.Peran) === "Pembimbing utama"; }).forEach(function (k) {
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
