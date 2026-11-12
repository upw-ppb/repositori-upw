/**
 * Survei (v0.11.0): dibuat Admin Prodi / Super Admin; status draf → dibuka → ditutup (otomatis tertutup setelah tanggal tutup).
 * - Sasaran: mahasiswa, mahasiswa baru (semester 1), dosen, tendik (masuk aplikasi) dan/atau publik (tautan ?survei=KODE tanpa login,
 *   untuk alumni dan pengguna lulusan).
 * - Anonim: identitas tidak disimpan; untuk mencegah mengisi dua kali disimpan "kunci" = HMAC(userId:survei) yang tidak bisa dibaca balik.
 * - Pertanyaan: likert (skala 4: 1 Kurang, 2 Cukup, 3 Baik, 4 Sangat baik), pilihan, centang, singkat, paragraf. Pertanyaan likert bisa
 *   ditandai "aspek" (Tabel 22: 5 aspek; Tabel 11: 7 aspek). Pertanyaan bertanda peran "tahunLulus" dipakai untuk Ref 11a.
 * - Hasil survei bertujuan t22/t11 mengisi Tabel iLKPS 22/11 (persentase per tingkat) beserta rencana tindak lanjut.
 */
var PERAN_SURVEI_UBAH = ["admin", "superadmin"];
var PERAN_SURVEI_LIHAT = ["admin", "superadmin", "kps"];
var SASARAN_SURVEI = { mahasiswa: "Mahasiswa (semua aktif)", mahasiswaBaru: "Mahasiswa baru (semester 1)", dosen: "Dosen", tendik: "Tendik", publik: "Publik / tanpa login (alumni, pengguna lulusan, mitra)" };
var TIPE_SOAL = ["likert", "pilihan", "centang", "singkat", "paragraf"];
var LIKERT = ["Kurang", "Cukup", "Baik", "Sangat baik"];
var ASPEK_22 = ["Keandalan (reliability)", "Daya tanggap (responsiveness)", "Kepastian (assurance)", "Empati (empathy)", "Tangible (sarana dan prasarana)"];
var ASPEK_11 = ["Etika", "Keahlian pada bidang ilmu (kompetensi utama)", "Kemampuan berbahasa asing", "Penggunaan teknologi informasi", "Kemampuan berkomunikasi", "Kerjasama", "Pengembangan diri"];
var TUJUAN_SURVEI = { t22: "Tabel 22 · Kepuasan mahasiswa", t11: "Tabel 11 · Kepuasan pengguna lulusan", mitra: "Kepuasan mitra kerja sama", dosen: "Kepuasan dosen", tendik: "Kepuasan tendik", lainnya: "Lainnya" };

function q(t, teks, x) { var o = { t: t, teks: teks }; Object.keys(x || {}).forEach(function (k) { o[k] = x[k]; }); return o; }
var TEMPLAT_SURVEI = {
  t22: { judul: "Kepuasan mahasiswa terhadap layanan prodi", tujuan: "t22", sasaran: ["mahasiswa"], anonim: true, pertanyaan: [
    q("likert", "Dosen, tendik, dan pengelola memberikan layanan akademik dan administrasi dengan andal (tepat waktu, sesuai jadwal, dan benar).", { aspek: 0, wajib: true }),
    q("likert", "Dosen, tendik, dan pengelola cepat tanggap membantu ketika mahasiswa membutuhkan.", { aspek: 1, wajib: true }),
    q("likert", "Layanan yang diberikan sesuai ketentuan sehingga mahasiswa merasa yakin dan terjamin.", { aspek: 2, wajib: true }),
    q("likert", "Dosen, tendik, dan pengelola peduli dan memberi perhatian kepada mahasiswa.", { aspek: 3, wajib: true }),
    q("likert", "Sarana dan prasarana (ruang kelas, laboratorium, perpustakaan, akses internet) cukup, mudah diakses, dan berkualitas.", { aspek: 4, wajib: true }),
    q("paragraf", "Saran untuk perbaikan layanan prodi")] },
  t11: { judul: "Kepuasan pengguna lulusan Prodi UPW", tujuan: "t11", sasaran: ["publik"], anonim: false, pertanyaan: [
    q("singkat", "Nama instansi / perusahaan", { wajib: true }), q("singkat", "Nama dan jabatan penilai", { wajib: true }),
    q("singkat", "Nama alumni Prodi UPW yang dinilai", { wajib: true }), q("singkat", "Tahun lulus alumni (YYYY)", { wajib: true, peran: "tahunLulus" }),
    q("likert", "Etika", { aspek: 0, wajib: true }), q("likert", "Keahlian pada bidang ilmu (kompetensi utama)", { aspek: 1, wajib: true }),
    q("likert", "Kemampuan berbahasa asing", { aspek: 2, wajib: true }), q("likert", "Penggunaan teknologi informasi", { aspek: 3, wajib: true }),
    q("likert", "Kemampuan berkomunikasi", { aspek: 4, wajib: true }), q("likert", "Kerjasama", { aspek: 5, wajib: true }),
    q("likert", "Pengembangan diri", { aspek: 6, wajib: true }), q("paragraf", "Masukan untuk Prodi UPW")] },
  mitra: { judul: "Kepuasan mitra kerja sama Prodi UPW", tujuan: "mitra", sasaran: ["publik"], anonim: false, pertanyaan: [
    q("singkat", "Nama lembaga mitra", { wajib: true }), q("likert", "Pelaksanaan kegiatan kerja sama sesuai kesepakatan", { wajib: true }),
    q("likert", "Komunikasi dan koordinasi dengan prodi", { wajib: true }), q("likert", "Manfaat kerja sama bagi lembaga Anda", { wajib: true }),
    q("pilihan", "Apakah Anda bersedia melanjutkan kerja sama?", { wajib: true, opsi: ["Ya", "Mungkin", "Tidak"] }), q("paragraf", "Saran")] },
  dosen: { judul: "Kepuasan dosen terhadap layanan pengelolaan", tujuan: "dosen", sasaran: ["dosen"], anonim: true, pertanyaan: [
    q("likert", "Layanan administrasi dan kepegawaian", { wajib: true }), q("likert", "Dukungan penelitian dan PkM", { wajib: true }),
    q("likert", "Kesempatan pengembangan diri (studi lanjut, pelatihan, sertifikasi)", { wajib: true }), q("likert", "Sarana dan prasarana kerja", { wajib: true }),
    q("paragraf", "Saran")] },
  tendik: { judul: "Kepuasan tendik terhadap layanan pengelolaan", tujuan: "tendik", sasaran: ["tendik"], anonim: true, pertanyaan: [
    q("likert", "Layanan administrasi dan kepegawaian", { wajib: true }), q("likert", "Kesempatan pengembangan diri (pelatihan, studi lanjut)", { wajib: true }),
    q("likert", "Sarana dan prasarana kerja", { wajib: true }), q("likert", "Suasana dan hubungan kerja", { wajib: true }), q("paragraf", "Saran")] }
};

/* ---------- baca ---------- */

function surveiDari(r) {
  return { _r: r, id: r.id, judul: teks(r.judul), tujuan: teks(r.tujuan) || "lainnya", sasaran: jsonDari(r.sasaran, []), buka: teksTgl(r.buka), tutup: teksTgl(r.tutup),
    anonim: benar(r.anonim), status: teks(r.status) || "draf", pertanyaan: jsonDari(r.pertanyaan, []), kode: teks(r.kode), tindakLanjut: jsonDari(r.tindakLanjut, {}),
    dibuat: r.dibuat, oleh: teks(r.oleh) };
}
function semuaSurvei() { return semua("Survei").filter(function (r) { return !r.dihapus; }).map(surveiDari); }
function ambilSurvei(id) { var r = cari("Survei", function (x) { return x.id === id && !x.dihapus; }); if (!r) throw galat("Survei tidak ditemukan."); return surveiDari(r); }
/** Status efektif: survei dibuka otomatis tertutup setelah tanggal tutup, dan belum mulai sebelum tanggal buka. */
function statusEfektif(s) {
  if (s.status !== "dibuka") return s.status;
  var h = hariIni();
  if (s.tutup && h > s.tutup) return "ditutup";
  if (s.buka && h < s.buka) return "terjadwal";
  return "dibuka";
}
function jawabanSurvei(id) { return semua("Jawaban").filter(function (r) { return r.survei === id; }); }
function cocokSasaran(s, p) {
  var r = peranDari(p);
  return s.sasaran.some(function (x) {
    if (x === "mahasiswa") return r.indexOf("mahasiswa") >= 0 && (p.statusMhs || "A") === "A";
    if (x === "mahasiswaBaru") return r.indexOf("mahasiswa") >= 0 && (p.statusMhs || "A") === "A" && semesterMhs(p.masuk) === 1;
    if (x === "dosen") return r.indexOf("dosen") >= 0;
    if (x === "tendik") return r.indexOf("tendik") >= 0 && r.indexOf("dosen") < 0;
    return false;
  });
}
function kunciResponden(p, s) { return hashToken("survei:" + s.id + ":" + p.id); }
function sudahMengisi(p, s) { var k = kunciResponden(p, s); return semua("Jawaban").some(function (r) { return r.survei === s.id && r.kunci === k; }); }
function soalKeKlien(s) { return s.pertanyaan.map(function (x) { return { id: x.id, t: x.t, teks: x.teks, opsi: x.opsi || [], wajib: !!x.wajib }; }); }

/* ---------- pengelolaan ---------- */

function bersihSoal(list, tujuan) {
  if (!Array.isArray(list)) list = [];
  if (list.length > 60) throw galat("Pertanyaan maksimal 60.");
  var aspek = tujuan === "t22" ? ASPEK_22 : tujuan === "t11" ? ASPEK_11 : [];
  return list.map(function (x, i) {
    var t = TIPE_SOAL.indexOf(x.t) >= 0 ? x.t : "", teksSoal = potong(x.teks, 500).trim();
    if (!t) throw galat("Jenis pertanyaan " + (i + 1) + " tidak dikenal.");
    if (!teksSoal) throw galat("Pertanyaan " + (i + 1) + " masih kosong.");
    var o = { id: teks(x.id) || "q" + acak(6), t: t, teks: teksSoal, wajib: !!x.wajib };
    if (t === "pilihan" || t === "centang") {
      o.opsi = (Array.isArray(x.opsi) ? x.opsi : String(x.opsi || "").split(/\r?\n/)).map(function (v) { return potong(v, 150).trim(); }).filter(String)
        .filter(function (v, j, a) { return a.indexOf(v) === j; });
      if (o.opsi.length < 2) throw galat("Pertanyaan " + (i + 1) + ": isi minimal 2 pilihan jawaban.");
    }
    if (t === "likert" && aspek.length && x.aspek !== undefined && x.aspek !== null && x.aspek !== "") {
      var a = Number(x.aspek); if (!(a >= 0 && a < aspek.length)) throw galat("Aspek pertanyaan " + (i + 1) + " tidak dikenal."); o.aspek = a;
    }
    if (t === "singkat" && x.peran === "tahunLulus") o.peran = "tahunLulus";
    return o;
  });
}
function surveiKeAdmin(s, jumlah) {
  var o = {}; Object.keys(s).forEach(function (k) { if (k !== "_r") o[k] = s[k]; });
  o.statusEfektif = statusEfektif(s); o.jumlahJawaban = jumlah || 0; o.labelTujuan = TUJUAN_SURVEI[s.tujuan] || s.tujuan;
  o.target = s.sasaran.filter(function (x) { return x !== "publik"; }).length ? semua("Pengguna").filter(function (p) { return p.status === "aktif" && cocokSasaran(s, p); }).length : null;
  return o;
}
function aksiSurveiDaftar(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SURVEI_LIHAT);
  var hit = {}; semua("Jawaban").forEach(function (r) { hit[r.survei] = (hit[r.survei] || 0) + 1; });
  return { survei: semuaSurvei().sort(function (a, b) { return new Date(b.dibuat) - new Date(a.dibuat); }).map(function (s) { return surveiKeAdmin(s, hit[s.id]); }),
    bolehUbah: punyaPeran(p, PERAN_SURVEI_UBAH), templat: TEMPLAT_SURVEI, sasaran: SASARAN_SURVEI, tujuan: TUJUAN_SURVEI, likert: LIKERT, aspek: { t22: ASPEK_22, t11: ASPEK_11 } };
}
function aksiSurveiSimpan(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SURVEI_UBAH);
  var x = d.data || {}, judul = potong(x.judul, 200).trim(), tujuan = TUJUAN_SURVEI[x.tujuan] ? x.tujuan : "lainnya";
  var sasaran = (Array.isArray(x.sasaran) ? x.sasaran : []).filter(function (v, i, a) { return SASARAN_SURVEI[v] && a.indexOf(v) === i; });
  var buka = teks(x.buka), tutup = teks(x.tutup);
  if (!judul) throw galat("Isi judul survei.");
  if (!sasaran.length) throw galat("Pilih minimal satu sasaran responden.");
  if (buka && !tanggalSah(buka)) throw galat("Tanggal dibuka tidak valid.");
  if (tutup && !tanggalSah(tutup)) throw galat("Tanggal ditutup tidak valid.");
  if (buka && tutup && tutup < buka) throw galat("Tanggal ditutup tidak boleh sebelum tanggal dibuka.");
  return kunciTulis(function () {
    var lama = x.id ? ambilSurvei(String(x.id)) : null, o = { judul: judul, buka: buka, tutup: tutup, diubah: new Date() };
    if (lama && lama.status !== "draf") {
      // Survei yang sudah dibuka: hanya judul dan tanggal ditutup yang bisa diubah, agar jawaban yang masuk tetap sebanding.
      // Tanggal dibuka tetap (menentukan tahun akademik di Tabel 11/22).
      if (tutup && tutup < lama.buka) throw galat("Tanggal ditutup tidak boleh sebelum tanggal dibuka (" + lama.buka + ").");
      ubah("Survei", lama._r, { judul: judul, tutup: tutup || lama.tutup, diubah: new Date() });
    } else {
      o.tujuan = tujuan; o.sasaran = JSON.stringify(sasaran); o.anonim = !!x.anonim; o.pertanyaan = JSON.stringify(bersihSoal(x.pertanyaan, tujuan));
      if (lama) ubah("Survei", lama._r, o);
      else { o.id = "s" + acak(10); o.status = "draf"; o.kode = acak(12); o.tindakLanjut = "{}"; o.dibuat = new Date(); o.oleh = p.id; o.dihapus = ""; tambah("Survei", o); x.id = o.id; }
    }
    catat(p.id, "survei.simpan", { id: x.id });
    return { id: x.id };
  });
}
function aksiSurveiStatus(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SURVEI_UBAH);
  var aksi = String(d.aksi || "");
  return kunciTulis(function () {
    var s = ambilSurvei(String(d.id || ""));
    if (aksi === "buka") {
      if (!s.pertanyaan.length) throw galat("Tambahkan minimal satu pertanyaan sebelum membuka survei.");
      if (!s.tutup) throw galat("Isi tanggal ditutup sebelum membuka survei.");
      if (s.tutup < hariIni()) throw galat("Tanggal ditutup sudah lewat. Perpanjang dulu tanggal ditutup.");
      ubah("Survei", s._r, { status: "dibuka", buka: s.buka || hariIni(), diubah: new Date() });
    } else if (aksi === "tutup") {
      if (s.status !== "dibuka") throw galat("Survei ini belum dibuka.");
      ubah("Survei", s._r, { status: "ditutup", tutup: s.tutup && s.tutup < hariIni() ? s.tutup : hariIni(), diubah: new Date() });
    } else if (aksi === "hapus") {
      if (s.status !== "draf") throw galat("Hanya survei draf yang bisa dihapus; survei yang sudah diisi tetap disimpan sebagai bukti.");
      ubah("Survei", s._r, { dihapus: new Date() });
    } else throw galat("Aksi tidak dikenal.");
    catat(p.id, "survei." + aksi, { id: s.id });
    return {};
  });
}
function aksiSurveiTindakLanjut(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SURVEI_UBAH);
  return kunciTulis(function () {
    var s = ambilSurvei(String(d.id || "")), tl = {};
    Object.keys(d.data || {}).forEach(function (k) { if (/^\d+$/.test(k)) tl[k] = potong(d.data[k], 1000).trim(); });
    ubah("Survei", s._r, { tindakLanjut: JSON.stringify(tl), diubah: new Date() });
    catat(p.id, "survei.tindakLanjut", { id: s.id });
    return {};
  });
}

/* ---------- mengisi ---------- */

/** Survei terbuka untuk pengguna yang masuk (kartu di Beranda). */
function aksiSurveiSaya(d, token) {
  var p = penggunaDariToken(token);
  if (p.status !== "aktif" || p.wajibGanti === true || p.wajibGanti === "TRUE") return { survei: [] };
  return { survei: semuaSurvei().filter(function (s) { return statusEfektif(s) === "dibuka" && cocokSasaran(s, p) && !sudahMengisi(p, s); })
    .map(function (s) { return { id: s.id, judul: s.judul, tutup: s.tutup, anonim: s.anonim, jumlahSoal: s.pertanyaan.length }; }) };
}
function aksiSurveiAmbil(d, token) {
  var p = penggunaDariToken(token), s = ambilSurvei(String(d.id || ""));
  if (statusEfektif(s) !== "dibuka" || !cocokSasaran(s, p)) throw galat("Survei ini tidak terbuka untuk Anda.");
  if (sudahMengisi(p, s)) throw galat("Anda sudah mengisi survei ini. Terima kasih.");
  return { survei: { id: s.id, judul: s.judul, tutup: s.tutup, anonim: s.anonim, soal: soalKeKlien(s), likert: LIKERT } };
}
function aksiSurveiPublik(d) {
  var kode = teks(d.kode).trim(), s = kode && semuaSurvei().filter(function (x) { return x.kode === kode; })[0];
  if (!s || s.sasaran.indexOf("publik") < 0) throw galat("Tautan survei tidak dikenal.");
  var st = statusEfektif(s);
  if (st !== "dibuka") throw galat(st === "terjadwal" ? "Survei ini belum dibuka (mulai " + s.buka + ")." : "Survei ini sudah ditutup. Terima kasih atas perhatian Anda.");
  return { survei: { judul: s.judul, tutup: s.tutup, anonim: s.anonim, soal: soalKeKlien(s), likert: LIKERT } };
}
function periksaJawaban(s, j) {
  j = j && typeof j === "object" ? j : {};
  var o = {};
  s.pertanyaan.forEach(function (x, i) {
    var v = j[x.id], kosong = v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length);
    if (kosong) { if (x.wajib) throw galat("Pertanyaan " + (i + 1) + " wajib dijawab."); return; }
    if (x.t === "likert") { v = Number(v); if (!(v >= 1 && v <= 4 && Math.floor(v) === v)) throw galat("Jawaban pertanyaan " + (i + 1) + " tidak valid."); }
    else if (x.t === "pilihan") { if (x.opsi.indexOf(v) < 0) throw galat("Jawaban pertanyaan " + (i + 1) + " tidak valid."); }
    else if (x.t === "centang") { if (!Array.isArray(v) || v.some(function (y) { return x.opsi.indexOf(y) < 0; })) throw galat("Jawaban pertanyaan " + (i + 1) + " tidak valid."); }
    else { v = potong(v, x.t === "paragraf" ? 3000 : 300).trim(); if (x.peran === "tahunLulus" && !/^(19|20)\d{2}$/.test(v)) throw galat("Pertanyaan " + (i + 1) + ": tulis tahun lulus 4 angka, misalnya 2024."); }
    o[x.id] = v;
  });
  return o;
}
function aksiSurveiJawab(d, token) {
  var p = penggunaDariToken(token);
  return kunciTulis(function () {
    var s = ambilSurvei(String(d.id || ""));
    if (statusEfektif(s) !== "dibuka" || !cocokSasaran(s, p)) throw galat("Survei ini tidak terbuka untuk Anda.");
    if (sudahMengisi(p, s)) throw galat("Anda sudah mengisi survei ini.");
    tambah("Jawaban", { id: "j" + acak(10), survei: s.id, userId: s.anonim ? "" : p.id, kunci: kunciResponden(p, s), jawaban: JSON.stringify(periksaJawaban(s, d.jawaban)), waktu: new Date() });
    catat(s.anonim ? "" : p.id, "survei.jawab", { id: s.id });
    return {};
  });
}
function aksiSurveiJawabPublik(d) {
  if (teks(d.situs)) return {}; // isian jebakan untuk robot: diam-diam diabaikan
  return kunciTulis(function () {
    var kode = teks(d.kode).trim(), s = kode && semuaSurvei().filter(function (x) { return x.kode === kode; })[0];
    if (!s || s.sasaran.indexOf("publik") < 0 || statusEfektif(s) !== "dibuka") throw galat("Survei ini tidak menerima jawaban.");
    var c = CacheService.getScriptCache(), kunciC = "survei-publik:" + s.id, n = Number(c.get(kunciC) || 0);
    if (n > 300) throw galat("Terlalu banyak jawaban dalam waktu singkat. Coba lagi nanti.");
    c.put(kunciC, String(n + 1), 600);
    tambah("Jawaban", { id: "j" + acak(10), survei: s.id, userId: "", kunci: "publik", jawaban: JSON.stringify(periksaJawaban(s, d.jawaban)), waktu: new Date() });
    catat("", "survei.jawabPublik", { id: s.id });
    return {};
  });
}

/* ---------- hasil ---------- */

function rekapSurvei(s, js) {
  var jaw = js.map(function (r) { return jsonDari(r.jawaban, {}); });
  return s.pertanyaan.map(function (x) {
    var vals = jaw.map(function (a) { return a[x.id]; }).filter(function (v) { return v !== undefined && v !== ""; }), o = { id: x.id, t: x.t, teks: x.teks, aspek: x.aspek, n: vals.length };
    if (x.t === "likert") { o.hitung = [1, 2, 3, 4].map(function (k) { return vals.filter(function (v) { return Number(v) === k; }).length; }); o.rata = vals.length ? bulat(vals.reduce(function (s2, v) { return s2 + Number(v); }, 0) / vals.length, 2) : null; }
    else if (x.t === "pilihan" || x.t === "centang") o.hitung = x.opsi.map(function (op) { return { opsi: op, n: vals.filter(function (v) { return Array.isArray(v) ? v.indexOf(op) >= 0 : v === op; }).length }; });
    else o.teksJawaban = vals.slice(-300);
    return o;
  });
}
function aksiSurveiHasil(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SURVEI_LIHAT);
  var s = ambilSurvei(String(d.id || "")), js = jawabanSurvei(s.id);
  return { survei: surveiKeAdmin(s, js.length), rekap: rekapSurvei(s, js), likert: LIKERT, aspek: s.tujuan === "t22" ? ASPEK_22 : s.tujuan === "t11" ? ASPEK_11 : [],
    jawaban: punyaPeran(p, PERAN_SURVEI_UBAH) ? js.map(function (r) { return { waktu: new Date(r.waktu).toISOString(), jawaban: jsonDari(r.jawaban, {}) }; }) : [] };
}

/* ---------- Tabel iLKPS 11, 22, Ref 11a ---------- */

/** Jumlah tanggapan pengguna lulusan per tahun lulus alumni (dari survei bertujuan t11). */
function tanggapanPengguna() {
  var hasil = {};
  semuaSurvei().filter(function (s) { return s.tujuan === "t11"; }).forEach(function (s) {
    var qth = s.pertanyaan.filter(function (x) { return x.peran === "tahunLulus"; })[0]; if (!qth) return;
    jawabanSurvei(s.id).forEach(function (r) { var th = Number(jsonDari(r.jawaban, {})[qth.id]); if (th) hasil[th] = (hasil[th] || 0) + 1; });
  });
  return hasil;
}
function tabelKepuasan(ts) {
  function satu(kode, judul, tujuan, aspek, kolomAspek) {
    var sv = semuaSurvei().filter(function (s) { return s.tujuan === tujuan && s.status !== "draf" && s.buka && semesterInfo(keTanggal(s.buka)).awal === ts; });
    var per = aspek.map(function () { return [0, 0, 0, 0]; }), tl = {};
    sv.forEach(function (s) {
      var js = jawabanSurvei(s.id).map(function (r) { return jsonDari(r.jawaban, {}); });
      s.pertanyaan.forEach(function (x) { if (x.t === "likert" && x.aspek !== undefined) js.forEach(function (a) { var v = Number(a[x.id]); if (v >= 1 && v <= 4) per[x.aspek][4 - v]++; }); });
      Object.keys(s.tindakLanjut || {}).forEach(function (k) { if (s.tindakLanjut[k]) tl[k] = s.tindakLanjut[k]; });
    });
    var baris = aspek.map(function (a, i) { var n = per[i].reduce(function (s2, v) { return s2 + v; }, 0);
      return [i + 1, a].concat(per[i].map(function (v) { return n ? bulat(v / n * 100, 2) : 0; }), [tl[i] || ""]); });
    var jml = ["Jumlah", ""].concat([2, 3, 4, 5].map(function (c) { return bulat(baris.reduce(function (s2, r) { return s2 + r[c]; }, 0), 2); }), [""]);
    return { kode: kode, judul: judul, bentuk: "daftar", kolom: ["No.", kolomAspek, "Sangat Baik (%)", "Baik (%)", "Cukup (%)", "Kurang (%)", "Rencana Tindak Lanjut oleh UPPS/PS"],
      baris: baris.concat([jml]), catatan: sv.length ? "Dari " + sv.length + " survei (" + sv.map(function (s) { return s.judul; }).join("; ") + ") yang dibuka pada TA " + labelTa(ts) + ". Persentase = jawaban per tingkat ÷ seluruh jawaban aspek itu."
        : "Belum ada survei bertujuan \"" + TUJUAN_SURVEI[tujuan] + "\" yang dibuka pada TA " + labelTa(ts) + ". Buat di menu Survei dengan templat yang tersedia." };
  }
  return [satu("11", "Tabel 11) Kepuasan Pengguna Lulusan", "t11", ASPEK_11, "Jenis Kemampuan"), satu("22", "Tabel 22) Kepuasan Mahasiswa", "t22", ASPEK_22, "Aspek yang Diukur")];
}
