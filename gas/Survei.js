/**
 * Survei (v0.11.0; diperluas v0.50.0): dibuat Admin Prodi / KPS / Super Admin; status draf → dibuka → ditutup (otomatis tertutup setelah tanggal tutup).
 * - Sasaran: mahasiswa, mahasiswa baru (semester 1), mahasiswa semester akhir (7–8), dosen, tendik (masuk aplikasi) dan/atau publik (tautan ?survei=KODE).
 * - ANONIM (v0.50.0, keputusan pemilik 24 Nov 2026 "tidak ada yang bisa melihat siapa menjawab apa"): siapa yang SUDAH mengisi disimpan di kolom
 *   Survei.pengisi (daftar id urut abjad, tanpa waktu) — dipakai untuk mencegah mengisi dua kali dan untuk daftar "belum mengisi". Baris Jawaban
 *   survei anonim TIDAK memuat id, kunci, atau jam (hanya tanggal), dan tidak ada catatan Log per pengisian; jawaban perorangan ditampilkan
 *   kepada pengelola dalam urutan acak. Hasil survei anonim baru ditampilkan bila jumlah pengisi ≥ MIN_ANONIM; kelompok pembanding < MIN_KELOMPOK disembunyikan.
 *   Survei beridentitas (tracer, pengguna lulusan, mitra, kurikulum) tetap menyimpan identitas karena instrumen menghitung per lulusan/lembaga.
 * - Pertanyaan: likert (skala 4: 1 Kurang, 2 Cukup, 3 Baik, 4 Sangat baik; label lain lewat lab), pilihan, centang, singkat, paragraf.
 *   Atribut analisis (var, ind, jelas, na, lab, pent, seg, nps, bagian, aspek): lihat SurveiTemplat.js. Pertanyaan bertanda peran "tahunLulus" dipakai Ref 11a.
 * - Hasil survei bertujuan t22/t11 mengisi Tabel iLKPS 22/11 (persentase per tingkat) beserta rencana tindak lanjut.
 * - Jadwal (v0.50.0): JADWAL_SURVEI + Pengaturan "kalenderSurvei" (tanggal mulai perkuliahan) → kartu rekomendasi di Beranda Admin/KPS/Super Admin/GKM,
 *   tombol Siapkan (survei.siapkan) membuat draf dari templat dengan tanggal dan sasaran terisi.
 */
var PERAN_SURVEI_UBAH = ["admin", "superadmin", "kps"];
var PERAN_SURVEI_LIHAT = ["admin", "superadmin", "kps", "gkm"];
var PERAN_SURVEI_MENTAH = ["admin", "superadmin", "kps", "gkm"];
var SASARAN_SURVEI = { mahasiswa: "Mahasiswa (semua aktif)", mahasiswaBaru: "Mahasiswa baru (semester 1)", mahasiswaAkhir: "Mahasiswa semester akhir (7–8)", dosen: "Dosen", tendik: "Tendik",
  publik: "Publik / tanpa login (alumni, pengguna lulusan, mitra)" };
var TIPE_SOAL = ["likert", "pilihan", "centang", "singkat", "paragraf"];
var LIKERT = ["Kurang", "Cukup", "Baik", "Sangat baik"];
var ASPEK_22 = ["Keandalan (reliability)", "Daya tanggap (responsiveness)", "Kepastian (assurance)", "Empati (empathy)", "Tangible (sarana dan prasarana)"];
var ASPEK_11 = ["Etika", "Keahlian pada bidang ilmu (kompetensi utama)", "Kemampuan berbahasa asing", "Penggunaan teknologi informasi", "Kemampuan berkomunikasi", "Kerjasama", "Pengembangan diri"];
var TUJUAN_SURVEI = { t22: "Tabel 22 · Kepuasan mahasiswa", t11: "Tabel 11 · Kepuasan pengguna lulusan", tracer: "Tracer study (butir 38–41)", layanan: "Layanan kemahasiswaan (butir 65)",
  mitra: "Kepuasan mitra kerja sama", dosen: "Kepuasan dosen", tendik: "Kepuasan tendik", exit: "Kepuasan lulusan / exit survey", kurikulum: "Masukan kurikulum (butir 7, 3)", edom: "EDOM per mata kuliah dan dosen (butir 23)", lainnya: "Lainnya" };
var MIN_ANONIM = 3, MIN_KELOMPOK = 5;

/* ---------- baca ---------- */

function surveiDari(r) {
  return { _r: r, id: r.id, judul: teks(r.judul), tujuan: teks(r.tujuan) || "lainnya", sasaran: jsonDari(r.sasaran, []), buka: teksTgl(r.buka), tutup: teksTgl(r.tutup),
    anonim: benar(r.anonim), status: teks(r.status) || "draf", pertanyaan: jsonDari(r.pertanyaan, []), kode: teks(r.kode), tindakLanjut: jsonDari(r.tindakLanjut, {}),
    dibuat: r.dibuat, oleh: teks(r.oleh), pengisi: jsonDari(r.pengisi, []) || [], meta: jsonDari(r.meta, {}) || {} };
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
  if (akunSistem(p)) return false; // v0.25.0: akun Super Admin bukan responden
  var r = peranDari(p);
  return s.sasaran.some(function (x) {
    if (x === "mahasiswa") return r.indexOf("mahasiswa") >= 0 && (p.statusMhs || "A") === "A";
    if (x === "mahasiswaBaru") return r.indexOf("mahasiswa") >= 0 && (p.statusMhs || "A") === "A" && semesterMhs(p.masuk) === 1;
    if (x === "mahasiswaAkhir") return r.indexOf("mahasiswa") >= 0 && (p.statusMhs || "A") === "A" && semesterMhs(p.masuk) >= 7;
    if (x === "dosen") return r.indexOf("dosen") >= 0;
    if (x === "tendik") return r.indexOf("tendik") >= 0 && r.indexOf("dosen") < 0;
    return false;
  });
}
function kunciResponden(p, s) { return hashToken("survei:" + s.id + ":" + p.id); }
/** v0.50.0: status mengisi dari daftar pengisi (tidak dari baris jawaban, agar jawaban anonim tidak bisa dihubungkan ke orang). */
function sudahMengisi(p, s) { return (s.pengisi || []).indexOf(p.id) >= 0; }
function soalKeKlien(s) {
  return s.pertanyaan.map(function (x) {
    var o = { id: x.id, t: x.t, teks: x.teks, opsi: x.opsi || [], wajib: !!x.wajib };
    ["jelas", "bagian", "lab"].forEach(function (k) { if (x[k]) o[k] = x[k]; }); if (x.na) o.na = true; return o;
  });
}
function surveiKeResponden(s) {
  return { id: s.id, judul: s.judul, tutup: s.tutup, anonim: s.anonim, soal: soalKeKlien(s), likert: LIKERT, label: LABEL_SKALA,
    pengantar: teks(s.meta.pengantar), skala: Array.isArray(s.meta.skala) ? s.meta.skala : [] };
}

/* ---------- target responden (v0.50.0) ---------- */

/** Minimal sampel Slovin (galat 5%). */
function slovin(n) { return n > 0 ? Math.ceil(n / (1 + n * 0.0025)) : 0; }
/** Lulusan TS-4 s.d. TS-2 (dasar persentase responden minimum tracer study dan pengguna lulusan, Matriks butir 38–42). */
function lulusanTs42() {
  var ts = tsAwal();
  return semua("Lulusan").filter(function (r) { if (r.dihapus || !r.tglLulus) return false; var d = r.tglLulus instanceof Date ? r.tglLulus : keTanggal(teksTgl(r.tglLulus)); if (isNaN(d)) return false;
    var a = semesterInfo(d).awal; return a >= ts - 4 && a <= ts - 2; }).length;
}
function prMin(nl) { return nl >= 300 ? 0.3 : 0.5 - (nl / 300) * 0.2; }
function hitungTarget(s) {
  var internal = s.sasaran.filter(function (x) { return x !== "publik"; }).length > 0;
  if (s.tujuan === "t11" || s.tujuan === "tracer") {
    var nl = lulusanTs42(), pr = prMin(nl);
    if (!nl) return { populasi: 0, min: null, ideal: null, dasar: "Data lulusan TS-4 s.d. TS-2 belum ada (Data Prodi › Lulusan), sehingga target minimal belum bisa dihitung." };
    return { populasi: nl, min: Math.ceil(nl * pr), ideal: Math.max(Math.ceil(nl * pr), Math.ceil(nl * 0.6)), pr: bulat(pr * 100, 1),
      dasar: "Instrumen: lulusan TS-4 s.d. TS-2 = " + nl + " orang; persentase minimum = " + (nl >= 300 ? "30%" : "50% − (" + nl + " ÷ 300 × 20%) = " + bulat(pr * 100, 1) + "%") + "." + (s.tujuan === "t11" ? " Target = jumlah pengguna (atasan) yang menilai." : "") };
  }
  var n = internal ? semua("Pengguna").filter(function (p) { return p.status === "aktif" && cocokSasaran(s, p); }).length : Number(s.meta.populasi) || 0;
  if (!n) return { populasi: 0, min: null, ideal: null, dasar: internal ? "Belum ada akun aktif yang cocok dengan sasaran." : "Isi jumlah populasi (mis. jumlah mitra aktif) di formulir survei agar target bisa dihitung." };
  return { populasi: n, min: Math.min(n, slovin(n)), ideal: Math.max(Math.min(n, slovin(n)), Math.ceil(n * 0.7)), dasar: "Instrumen tidak menetapkan angka; dipakai sampel minimal Slovin (galat 5%) dari populasi " + n + ", target ideal 70% (tidak kurang dari minimal)." + (s.tujuan === "edom" ? " Untuk EDOM dihitung mahasiswa yang sudah menilai SEMUA mata kuliahnya." : "") };
}

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
    // v0.50.0: atribut penjelasan dan analisis
    var jl = potong(x.jelas, 800).trim(); if (jl) o.jelas = jl;
    var bg = potong(x.bagian, 150).trim(); if (bg) o.bagian = bg;
    var vr = potong(x["var"], 80).trim(); if (vr) o["var"] = vr;
    var ind = potong(x.ind, 20).trim().replace(/[^A-Za-z0-9_]/g, ""); if (ind) o.ind = ind;
    if (t === "likert") { if (x.na) o.na = true; if (LABEL_SKALA[x.lab] && x.lab !== "puas") o.lab = x.lab; var pt = potong(x.pent, 80).trim(); if (pt) o.pent = pt; }
    if (t === "pilihan") { if (x.seg) o.seg = true; if (x.nps) o.nps = true; }
    if (x.lev === "mk" || x.lev === "dosen") o.lev = x.lev;   // v0.51.0: EDOM (dinilai per mata kuliah / per pengajar)
    return o;
  });
}
function bersihMeta(x, lama) {
  var m = Object.assign({}, lama || {}), v = x || {};
  if (v.pengantar !== undefined) m.pengantar = potong(v.pengantar, 2500).trim();
  if (Array.isArray(v.skala)) m.skala = v.skala.slice(0, 4).map(function (t) { return potong(t, 200).trim(); });
  if (v.populasi !== undefined) { var n = Number(v.populasi); m.populasi = n >= 0 && n < 100000 ? Math.floor(n) : 0; }
  return m;
}
function surveiKeAdmin(s, jumlah) {
  var o = {}; Object.keys(s).forEach(function (k) { if (k !== "_r" && k !== "pengisi") o[k] = s[k]; });
  o.statusEfektif = statusEfektif(s); o.jumlahJawaban = jumlah || 0; o.labelTujuan = TUJUAN_SURVEI[s.tujuan] || s.tujuan;
  o.target = s.sasaran.filter(function (x) { return x !== "publik"; }).length ? semua("Pengguna").filter(function (p) { return p.status === "aktif" && cocokSasaran(s, p); }).length : null;
  o.sasaranTarget = hitungTarget(s); o.jumlahPengisi = (s.pengisi || []).length;
  var pb = pubSurvei(s.id); o.terbit = !!(pb && pb.status === "terbit"); // v0.52.0
  return o;
}
function aksiSurveiDaftar(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SURVEI_LIHAT);
  var hit = {}; semua("Jawaban").forEach(function (r) { hit[r.survei] = (hit[r.survei] || 0) + 1; });
  return { survei: semuaSurvei().sort(function (a, b) { return new Date(b.dibuat) - new Date(a.dibuat); }).map(function (s) { return surveiKeAdmin(s, hit[s.id]); }),
    bolehUbah: punyaPeran(p, PERAN_SURVEI_UBAH), templat: TEMPLAT_SURVEI, sasaran: SASARAN_SURVEI, tujuan: TUJUAN_SURVEI, likert: LIKERT, label: LABEL_SKALA,
    aspek: { t22: ASPEK_22, t11: ASPEK_11 }, kalender: kalenderSurvei(), minAnonim: MIN_ANONIM, minKelompok: MIN_KELOMPOK };
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
      // Survei yang sudah dibuka: hanya judul, tanggal ditutup, dan populasi yang bisa diubah, agar jawaban yang masuk tetap sebanding.
      if (tutup && tutup < lama.buka) throw galat("Tanggal ditutup tidak boleh sebelum tanggal dibuka (" + lama.buka + ").");
      ubah("Survei", lama._r, { judul: judul, tutup: tutup || lama.tutup, meta: JSON.stringify(bersihMeta({ populasi: (x.meta || {}).populasi }, lama.meta)), diubah: new Date() });
    } else {
      o.tujuan = tujuan; o.sasaran = JSON.stringify(sasaran); o.anonim = !!x.anonim; o.pertanyaan = JSON.stringify(bersihSoal(x.pertanyaan, tujuan));
      o.meta = JSON.stringify(bersihMeta(x.meta, lama ? lama.meta : {}));
      if (o.anonim && JSON.parse(o.pertanyaan).some(function (q) { return q.peran === "tahunLulus"; })) throw galat("Survei anonim tidak boleh memuat pertanyaan identitas (tahun lulus alumni). Matikan pilihan anonim atau hapus pertanyaan itu.");
      if (tujuan === "edom") { var mm = JSON.parse(o.meta); if (!/^\d{4}-[12]$/.test(mm.semester || "")) mm.semester = semesterInfo(buka ? keTanggal(buka) : new Date()).kode; o.meta = JSON.stringify(mm); o.anonim = true; }
      if (lama) ubah("Survei", lama._r, o);
      else { o.id = "s" + acak(10); o.status = "draf"; o.kode = acak(12); o.tindakLanjut = "{}"; o.dibuat = new Date(); o.oleh = p.id; o.dihapus = ""; o.pengisi = "[]"; tambah("Survei", o); x.id = o.id; }
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
      if (s.tujuan === "edom") siapkanPengisiEdom(s);   // v0.51.0 (Edom.js)
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
    .map(function (s) { return { id: s.id, judul: s.judul, tutup: s.tutup, anonim: s.anonim, jumlahSoal: s.pertanyaan.length, edom: s.tujuan === "edom" }; }) };
}
function aksiSurveiAmbil(d, token) {
  var p = penggunaDariToken(token), s = ambilSurvei(String(d.id || ""));
  if (statusEfektif(s) !== "dibuka" || !cocokSasaran(s, p)) throw galat("Survei ini tidak terbuka untuk Anda.");
  if (sudahMengisi(p, s)) throw galat("Anda sudah mengisi survei ini. Terima kasih.");
  if (s.tujuan === "edom") throw galat("EDOM diisi per mata kuliah lewat formulir EDOM.");
  return { survei: surveiKeResponden(s) };
}
function aksiSurveiPublik(d) {
  var kode = teks(d.kode).trim(), s = kode && semuaSurvei().filter(function (x) { return x.kode === kode; })[0];
  if (!s || s.sasaran.indexOf("publik") < 0) throw galat("Tautan survei tidak dikenal.");
  var st = statusEfektif(s);
  if (st !== "dibuka") throw galat(st === "terjadwal" ? "Survei ini belum dibuka (mulai " + s.buka + ")." : "Survei ini sudah ditutup. Terima kasih atas perhatian Anda.");
  var r = surveiKeResponden(s); delete r.id; return { survei: r };
}
function periksaJawaban(s, j) {
  j = j && typeof j === "object" ? j : {};
  var o = {};
  s.pertanyaan.forEach(function (x, i) {
    var v = j[x.id], kosong = v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length);
    if (kosong) { if (x.wajib) throw galat("Pertanyaan " + (i + 1) + " wajib dijawab."); return; }
    if (x.t === "likert") { v = Number(v); if (!((v >= 1 && v <= 4) || (x.na && v === 0)) || Math.floor(v) !== v) throw galat("Jawaban pertanyaan " + (i + 1) + " tidak valid."); }
    else if (x.t === "pilihan") { if (x.opsi.indexOf(v) < 0) throw galat("Jawaban pertanyaan " + (i + 1) + " tidak valid."); }
    else if (x.t === "centang") { if (!Array.isArray(v) || v.some(function (y) { return x.opsi.indexOf(y) < 0; })) throw galat("Jawaban pertanyaan " + (i + 1) + " tidak valid."); }
    else { v = potong(v, x.t === "paragraf" ? 3000 : 300).trim(); if (x.peran === "tahunLulus" && !/^(19|20)\d{2}$/.test(v)) throw galat("Pertanyaan " + (i + 1) + ": tulis tahun lulus 4 angka, misalnya 2024."); }
    o[x.id] = v;
  });
  return o;
}
/** Sisipkan id ke daftar pengisi (urut abjad, tanpa waktu). */
function tambahPengisi(s, id) {
  var l = (s.pengisi || []).slice(); if (l.indexOf(id) >= 0) return l;
  l.push(id); l.sort(); return l;
}
function aksiSurveiJawab(d, token) {
  var p = penggunaDariToken(token);
  return kunciTulis(function () {
    var s = ambilSurvei(String(d.id || ""));
    if (statusEfektif(s) !== "dibuka" || !cocokSasaran(s, p)) throw galat("Survei ini tidak terbuka untuk Anda.");
    if (sudahMengisi(p, s)) throw galat("Anda sudah mengisi survei ini.");
    if (s.tujuan === "edom") throw galat("EDOM diisi per mata kuliah lewat formulir EDOM.");
    var isi = JSON.stringify(periksaJawaban(s, d.jawaban));
    if (s.anonim) tambah("Jawaban", { id: "j" + acak(10), survei: s.id, userId: "", kunci: "", jawaban: isi, waktu: hariIni() });   // tanpa id, kunci, dan jam
    else tambah("Jawaban", { id: "j" + acak(10), survei: s.id, userId: p.id, kunci: kunciResponden(p, s), jawaban: isi, waktu: new Date() });
    ubah("Survei", s._r, { pengisi: JSON.stringify(tambahPengisi(s, p.id)) });
    semua("Pengingat").filter(function (r) { return r.untuk === p.id && !r.selesai && r.jenis === "survei:" + s.id; }).forEach(function (r) { ubah("Pengingat", r, { selesai: new Date() }); });
    if (!s.anonim) catat(p.id, "survei.jawab", { id: s.id });
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
    tambah("Jawaban", { id: "j" + acak(10), survei: s.id, userId: "", kunci: s.anonim ? "" : "publik", jawaban: JSON.stringify(periksaJawaban(s, d.jawaban)), waktu: s.anonim ? hariIni() : new Date() });
    if (!s.anonim) catat("", "survei.jawabPublik", { id: s.id });
    return {};
  });
}

/* ---------- daftar pengisi dan pengingat (v0.50.0) ---------- */

/** Sasaran berakun beserta status sudah/belum mengisi. TIDAK memuat jawaban. */
function aksiSurveiPengisi(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SURVEI_LIHAT);
  var s = ambilSurvei(String(d.id || "")), sudah = {};
  (s.pengisi || []).forEach(function (id) { sudah[id] = 1; });
  var l = semua("Pengguna").filter(function (u) { return u.status === "aktif" && cocokSasaran(s, u); }).map(function (u) {
    var r = peranDari(u), mhs = r.indexOf("mahasiswa") >= 0;
    return { id: u.id, nama: teks(u.nama), username: String(u.username), jenis: mhs ? "mahasiswa" : r.indexOf("dosen") >= 0 ? "dosen" : "tendik",
      kelompok: mhs ? (u.masuk ? "Angkatan " + u.masuk : "") + (u.kelas ? " · " + u.kelas : "") : "", sudah: !!sudah[u.id] };
  }).sort(function (a, b) { return (a.sudah - b.sudah) || a.kelompok.localeCompare(b.kelompok) || a.nama.localeCompare(b.nama); });
  var ping = {}; semua("Pengingat").filter(function (r) { return !r.selesai && r.jenis === "survei:" + s.id; }).forEach(function (r) { ping[r.untuk] = 1; });
  l.forEach(function (x) { x.diingatkan = !!ping[x.id]; });
  if (s.tujuan === "edom") {   // v0.51.0: berapa mata kuliah yang sudah dinilai (tanpa nilai)
    var unitSel = {}; semua("PengisiSurvei").filter(function (r) { return r.survei === s.id; }).forEach(function (r) { unitSel[r.userId] = jsonDari(r.unit, []).length; });
    l.forEach(function (x) { x.mkDinilai = unitSel[x.id] || 0; });
  }
  return { id: s.id, judul: s.judul, orang: l, sudah: l.filter(function (x) { return x.sudah; }).length, total: l.length, publik: s.sasaran.indexOf("publik") >= 0,
    bolehIngatkan: punyaPeran(p, PERAN_SURVEI_UBAH) };
}
/** Pengingat di Beranda bagi sasaran yang belum mengisi (tanpa email). Pengingat selesai otomatis saat orang itu mengisi. */
function aksiSurveiIngatkan(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SURVEI_UBAH);
  return kunciTulis(function () {
    var s = ambilSurvei(String(d.id || ""));
    if (statusEfektif(s) !== "dibuka") throw galat("Pengingat hanya bisa dikirim saat survei sedang dibuka.");
    var sudah = {}; (s.pengisi || []).forEach(function (id) { sudah[id] = 1; });
    var ping = {}; semua("Pengingat").filter(function (r) { return !r.selesai && r.jenis === "survei:" + s.id; }).forEach(function (r) { ping[r.untuk] = 1; });
    var pilih = Array.isArray(d.ids) && d.ids.length ? d.ids.map(String) : null;
    var untuk = semua("Pengguna").filter(function (u) { return u.status === "aktif" && cocokSasaran(s, u) && !sudah[u.id] && !ping[u.id] && (!pilih || pilih.indexOf(u.id) >= 0); }).map(function (u) { return u.id; });
    if (!untuk.length) return { terkirim: 0 };
    var kini = new Date(), pesan = "Mohon isi survei \"" + s.judul + "\"" + (s.tutup ? " sebelum " + s.tutup : "") + ". Buka Beranda › Survei terbuka untuk Anda." + (s.anonim ? " Survei ini anonim." : "");
    tambahBanyak("Pengingat", untuk.map(function (id) { return { id: "pg" + acak(8), untuk: id, dari: p.id, pesan: pesan, jenis: "survei:" + s.id, dibuat: kini, selesai: "" }; }));
    catat(p.id, "survei.ingatkan", { id: s.id, jumlah: untuk.length });
    return { terkirim: untuk.length };
  });
}

/* ---------- hasil ---------- */

function acakUrutan(l) { var a = l.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function rataSd(v) {
  if (!v.length) return { rata: null, sd: null };
  var m = v.reduce(function (s, x) { return s + x; }, 0) / v.length, q = v.length > 1 ? v.reduce(function (s, x) { return s + (x - m) * (x - m); }, 0) / (v.length - 1) : 0;
  return { rata: bulat(m, 2), sd: bulat(Math.sqrt(q), 2) };
}
function rekapSurvei(s, js) {
  var jaw = js.map(function (r) { return jsonDari(r.jawaban, {}); });
  return s.pertanyaan.map(function (x) {
    var vals = jaw.map(function (a) { return a[x.id]; }).filter(function (v) { return v !== undefined && v !== ""; }), o = { id: x.id, t: x.t, teks: x.teks, aspek: x.aspek, n: vals.length };
    ["var", "ind", "lab", "pent", "seg", "nps", "bagian"].forEach(function (k) { if (x[k] !== undefined) o[k] = x[k]; });
    if (x.t === "likert") {
      var v = vals.map(Number).filter(function (y) { return y >= 1 && y <= 4; });
      o.hitung = [1, 2, 3, 4].map(function (k) { return v.filter(function (y) { return y === k; }).length; });
      o.na = vals.length - v.length; o.n = v.length;
      var st = rataSd(v); o.rata = st.rata; o.sd = st.sd; o.puas = v.length ? bulat((o.hitung[2] + o.hitung[3]) / v.length * 100, 1) : null;
    }
    else if (x.t === "pilihan" || x.t === "centang") o.hitung = x.opsi.map(function (op) { return { opsi: op, n: vals.filter(function (v) { return Array.isArray(v) ? v.indexOf(op) >= 0 : v === op; }).length }; });
    else o.teksJawaban = (s.anonim ? acakUrutan(vals) : vals).slice(-300);
    return o;
  });
}
/** Cronbach α untuk sekumpulan butir (responden dengan jawaban lengkap 1–4 pada semua butir). */
function cronbach(jaw, ids) {
  if (ids.length < 2) return null;
  var baris = jaw.map(function (a) { return ids.map(function (id) { return Number(a[id]); }); }).filter(function (r) { return r.every(function (v) { return v >= 1 && v <= 4; }); });
  if (baris.length < 3) return null;
  var k = ids.length, varian = function (l) { var m = l.reduce(function (s, x) { return s + x; }, 0) / l.length; return l.reduce(function (s, x) { return s + (x - m) * (x - m); }, 0) / (l.length - 1); };
  var vi = ids.map(function (_, j) { return varian(baris.map(function (r) { return r[j]; })); }).reduce(function (s, x) { return s + x; }, 0);
  var vt = varian(baris.map(function (r) { return r.reduce(function (s, x) { return s + x; }, 0); }));
  return vt > 0 ? { alpha: bulat(k / (k - 1) * (1 - vi / vt), 3), n: baris.length } : null;
}
/**
 * Analisis (v0.50.0): per variabel (rata-rata, SD, % puas, indeks 0–100, Cronbach α), IPA (kinerja × kepentingan), perbandingan kelompok
 * (kelompok < MIN_KELOMPOK disembunyikan), NPS.
 */
function analisisSurvei(s, js) {
  var jaw = js.map(function (r) { return jsonDari(r.jawaban, {}); }), L = s.pertanyaan.filter(function (x) { return x.t === "likert" && x["var"] && !x.pent; });
  var nilai = function (sub, ids) { var v = []; sub.forEach(function (a) { ids.forEach(function (id) { var y = Number(a[id]); if (y >= 1 && y <= 4) v.push(y); }); }); return v; };
  var vars = []; L.forEach(function (x) { if (vars.indexOf(x["var"]) < 0) vars.push(x["var"]); });
  var variabel = vars.map(function (v) {
    var ids = L.filter(function (x) { return x["var"] === v; }).map(function (x) { return x.id; }), vals = nilai(jaw, ids), st = rataSd(vals);
    return { "var": v, butir: ids.length, nJawaban: vals.length, rata: st.rata, sd: st.sd, puas: vals.length ? bulat(vals.filter(function (y) { return y >= 3; }).length / vals.length * 100, 1) : null,
      indeks: st.rata == null ? null : bulat((st.rata - 1) / 3 * 100, 1), alpha: cronbach(jaw, ids) };
  });
  var semuaIds = L.filter(function (x) { return x["var"] !== "Kepuasan umum"; }).map(function (x) { return x.id; }), stAll = rataSd(nilai(jaw, semuaIds));
  var ipa = s.pertanyaan.filter(function (x) { return x.t === "likert" && x.pent; }).map(function (x) {
    var imp = rataSd(nilai(jaw, [x.id])).rata, kin = (variabel.filter(function (v) { return v["var"] === x.pent; })[0] || {}).rata;
    return { "var": x.pent, kepentingan: imp, kinerja: kin == null ? null : kin, kesenjangan: imp == null || kin == null ? null : bulat(kin - imp, 2) };
  }).filter(function (r) { return r.kepentingan != null && r.kinerja != null; });
  if (ipa.length) {
    var mi = ipa.reduce(function (s2, r) { return s2 + r.kepentingan; }, 0) / ipa.length, mk = ipa.reduce(function (s2, r) { return s2 + r.kinerja; }, 0) / ipa.length;
    var e = 1e-9;   // toleransi pembulatan: nilai sama dengan rata-rata dihitung "di atas"
    ipa.forEach(function (r) { r.kuadran = r.kepentingan >= mi - e ? (r.kinerja >= mk - e ? "II Pertahankan" : "I Prioritas utama") : (r.kinerja >= mk - e ? "IV Berlebihan" : "III Prioritas rendah"); });
  }
  var kelompok = s.pertanyaan.filter(function (x) { return x.t === "pilihan" && x.seg; }).map(function (x) {
    return { id: x.id, teks: x.teks, isi: x.opsi.map(function (op) {
      var sub = jaw.filter(function (a) { return a[x.id] === op; });
      if (sub.length < MIN_KELOMPOK) return { opsi: op, n: sub.length, tersembunyi: true };
      return { opsi: op, n: sub.length, rata: vars.map(function (v) { return rataSd(nilai(sub, L.filter(function (q) { return q["var"] === v; }).map(function (q) { return q.id; }))).rata; }) };
    }) };
  });
  var nps = s.pertanyaan.filter(function (x) { return x.t === "pilihan" && x.nps; }).map(function (x) {
    var v = jaw.map(function (a) { return Number(a[x.id]); }).filter(function (y) { return y >= 0 && y <= 10 && String(y) !== "NaN"; });
    if (!v.length) return { teks: x.teks, n: 0 };
    var pro = v.filter(function (y) { return y >= 9; }).length, det = v.filter(function (y) { return y <= 6; }).length;
    return { teks: x.teks, n: v.length, promotor: bulat(pro / v.length * 100, 1), pasif: bulat((v.length - pro - det) / v.length * 100, 1), detraktor: bulat(det / v.length * 100, 1), nps: Math.round((pro - det) / v.length * 100) };
  });
  return { variabel: variabel, keseluruhan: { rata: stAll.rata, sd: stAll.sd, indeks: stAll.rata == null ? null : bulat((stAll.rata - 1) / 3 * 100, 1), alpha: cronbach(jaw, semuaIds) },
    ipa: ipa, kelompok: kelompok, namaVar: vars, nps: nps };
}
function aksiSurveiHasil(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SURVEI_LIHAT);
  var s = ambilSurvei(String(d.id || "")), js = jawabanSurvei(s.id), info = surveiKeAdmin(s, js.length);
  var dasar = { survei: info, likert: LIKERT, label: LABEL_SKALA, aspek: s.tujuan === "t22" ? ASPEK_22 : s.tujuan === "t11" ? ASPEK_11 : [], minAnonim: MIN_ANONIM, minKelompok: MIN_KELOMPOK };
  if (s.anonim && js.length < MIN_ANONIM) return Object.assign(dasar, { tertahan: true, rekap: [], analisis: null, jawaban: [] });
  var idx = s.anonim ? null : indeksOrang();
  var mentah = punyaPeran(p, PERAN_SURVEI_MENTAH) ? (s.anonim ? acakUrutan(js).map(function (r) { return { jawaban: jsonDari(r.jawaban, {}) }; })
    : js.map(function (r) { var o = r.userId && idx.byId[r.userId]; return { waktu: new Date(r.waktu).toISOString(), nama: o ? o.nama : "", jawaban: jsonDari(r.jawaban, {}) }; })) : [];
  return Object.assign(dasar, { rekap: rekapSurvei(s, js), analisis: analisisSurvei(s, js), jawaban: mentah });
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

/* ---------- jadwal survei (v0.50.0) ---------- */

/** Tanggal mulai perkuliahan (bulan-tanggal) Ganjil dan Genap; dipakai menghitung "minggu ke-n". Bawaan dapat diubah di menu Survei. */
function kalenderSurvei() {
  var k = jsonDari(pengaturan("kalenderSurvei", ""), null) || {};
  return { ganjil: /^\d{2}-\d{2}$/.test(k.ganjil) ? k.ganjil : "09-01", genap: /^\d{2}-\d{2}$/.test(k.genap) ? k.genap : "02-01" };
}
function tglGeser(t, n) { var d = new Date(t + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
var JADWAL_SURVEI = [
  { k: "kmhs1", t: "t22", per: "smt", m: 42, s: 55, l: "Kepuasan mahasiswa ke-1 (tengah semester, minggu 7–8)", ket: "Butir 71 meminta analisis dan tindak lanjut minimal 2 kali per semester." },
  { k: "kmhs2", t: "t22", per: "smt", m: 91, s: 111, l: "Kepuasan mahasiswa ke-2 (akhir semester, minggu 14–16)", ket: "Hasil dibahas di rapat evaluasi semester." },
  { k: "edom1", t: "edom", per: "smt", m: 42, s: 55, l: "EDOM tengah semester (minggu 7–8)", ket: "Evaluasi per mata kuliah dan dosen; hasil dibahas sebelum UAS (butir 23)." },
  { k: "edom2", t: "edom", per: "smt", m: 91, s: 111, l: "EDOM akhir semester (minggu 14–16)", ket: "Termasuk monev penilaian (butir 25 C) dan umpan balik untuk dosen." },
  { k: "exit", t: "exit", per: "smt", m: 98, s: 125, l: "Exit survey mahasiswa semester akhir (menjelang yudisium)", ket: "Kepuasan lulusan (butir 78)." },
  { k: "tracer", t: "tracer", per: "genap", bm: "02-01", bs: "05-31", l: "Tracer study lulusan TS-4 s.d. TS-2", ket: "Setiap tahun (butir 38); persentase responden minimal menentukan skor butir 39–41." },
  { k: "t11", t: "t11", per: "genap", bm: "02-01", bs: "05-31", l: "Kepuasan pengguna lulusan", ket: "Bobot survei tertinggi (butir 42); dijalankan bersama tracer study." },
  { k: "dosen", t: "dosen", per: "ganjil", bm: "11-01", bs: "11-30", l: "Kepuasan dosen", ket: "Butir 78." },
  { k: "tendik", t: "tendik", per: "ganjil", bm: "11-01", bs: "11-30", l: "Kepuasan tendik", ket: "Butir 78." },
  { k: "mitra", t: "mitra", per: "ganjil", bm: "11-01", bs: "11-30", l: "Kepuasan mitra kerja sama", ket: "Butir 73 dan 78; juga setelah kegiatan kerja sama besar." },
  { k: "layanan", t: "layanan", per: "ganjil", bm: "11-01", bs: "11-30", l: "Layanan kemahasiswaan", ket: "Butir 65." },
  { k: "kurikulum", t: "kurikulum", per: "genap", bm: "04-01", bs: "05-15", l: "Masukan kurikulum (pemangku kepentingan)", ket: "Butir 7 dan 3; bila rapat IAB terjadwal, jadwal mengikuti rapat itu." },
  { k: "tinjau", t: "", per: "genap", bm: "06-15", bs: "07-31", l: "Tinjau instrumen (validitas/reliabilitas) dan publikasikan ringkasan hasil survei TA ini", ket: "Butir 78 aspek 1, 5, dan 6." }
];
function labelSmtKode(kode) { var a = Number(kode.slice(0, 4)); return (/-1$/.test(kode) ? "Ganjil " : "Genap ") + a + "/" + (a + 1); }
/** Semua rekomendasi jadwal yang relevan hari ini: sedang berlangsung, dimulai ≤ 21 hari lagi, atau terlewat ≤ 21 hari. */
function jadwalSurvei() {
  var kal = kalenderSurvei(), kini = hariIni(), s0 = semesterInfo(), hasil = [];
  var smt = [], a0 = s0.awal; [[a0 - 1, false], [a0, true], [a0, false], [a0 + 1, true]].forEach(function (x) { smt.push({ awal: x[0], ganjil: x[1] }); });
  var selesaiTanda = jsonDari(pengaturan("jadwalSurveiSelesai", ""), []) || [];
  var rapatIab = semua("Rapat").filter(function (r) { return !r.dihapus && r.jenis === "iab" && teksTgl(r.tgl) >= kini && teksTgl(r.tgl) <= tglGeser(kini, 75); });
  JADWAL_SURVEI.forEach(function (j) {
    smt.forEach(function (sm) {
      var kode = sm.awal + "-" + (sm.ganjil ? 1 : 2), mulai, akhir, kunci;
      if (j.per === "smt") { var m0 = sm.ganjil ? sm.awal + "-" + kal.ganjil : (sm.awal + 1) + "-" + kal.genap; mulai = tglGeser(m0, j.m); akhir = tglGeser(m0, j.s); kunci = j.k + "-" + kode; }
      else if ((j.per === "ganjil") === sm.ganjil) { var th = sm.ganjil ? sm.awal : sm.awal + 1; mulai = th + "-" + j.bm; akhir = th + "-" + j.bs; kunci = j.k + "-" + kode; }
      else return;
      if (j.k === "kurikulum" && rapatIab.length) return;
      hasil.push({ kunci: kunci, k: j.k, templat: j.t, judul: j.l, ket: j.ket, periode: labelSmtKode(kode), mulai: mulai, selesai: akhir });
    });
  });
  rapatIab.forEach(function (r) { var t = teksTgl(r.tgl); hasil.push({ kunci: "kurikulum-" + r.id, k: "kurikulum", templat: "kurikulum", judul: "Masukan kurikulum sebelum rapat IAB " + t, ket: "Hasil angket dibawa ke rapat IAB (butir 3 dan 7).", periode: "Rapat IAB " + t, mulai: tglGeser(t, -28), selesai: tglGeser(t, -7) }); });
  var survei = semuaSurvei(), pakai = {};
  survei.forEach(function (s) { if (s.meta && s.meta.jadwal) pakai[s.meta.jadwal] = s; });
  return hasil.filter(function (x) { return kini >= tglGeser(x.mulai, -21) && kini <= tglGeser(x.selesai, 21); }).map(function (x) {
    var s = pakai[x.kunci], st = s ? statusEfektif(s) : "";
    x.status = selesaiTanda.indexOf(x.kunci) >= 0 ? "selesai" : !s ? (kini > x.selesai ? "terlewat" : kini >= x.mulai ? "sekarang" : "segera") : st === "draf" ? "draf" : st === "ditutup" ? "selesai" : "berjalan";
    if (s) { x.surveiId = s.id; x.jumlahPengisi = (s.pengisi || []).length; }
    return x;
  }).filter(function (x) { return x.status !== "selesai"; }).sort(function (a, b) { return a.mulai < b.mulai ? -1 : 1; });
}
function aksiSurveiJadwal(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SURVEI_LIHAT);
  return { jadwal: jadwalSurvei(), kalender: kalenderSurvei(), bolehUbah: punyaPeran(p, PERAN_SURVEI_UBAH), hariIni: hariIni() };
}
/** Buat draf survei dari templat untuk satu rekomendasi jadwal (judul, tanggal, sasaran, anonim terisi). Bila sudah ada, kembalikan yang ada. */
function aksiSurveiSiapkan(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SURVEI_UBAH);
  var j = jadwalSurvei().filter(function (x) { return x.kunci === teks(d.kunci); })[0];
  if (!j) throw galat("Rekomendasi jadwal tidak ditemukan atau sudah lewat.");
  if (j.surveiId) return { id: j.surveiId, ada: true };
  var t = TEMPLAT_SURVEI[j.templat]; if (!t) throw galat("Rekomendasi ini tidak memakai templat survei. Tandai selesai bila sudah dikerjakan.");
  var kini = hariIni(), buka = j.mulai > kini ? j.mulai : kini, tutup = j.selesai > buka ? j.selesai : tglGeser(buka, 14);
  return kunciTulis(function () {
    var o = { id: "s" + acak(10), judul: t.judul + " · " + j.periode, tujuan: t.tujuan, sasaran: JSON.stringify(t.sasaran), buka: buka, tutup: tutup, anonim: !!t.anonim, status: "draf",
      pertanyaan: JSON.stringify(bersihSoal(t.pertanyaan, t.tujuan)), kode: acak(12), tindakLanjut: "{}", dibuat: new Date(), oleh: p.id, dihapus: "", pengisi: "[]",
      meta: JSON.stringify(Object.assign({}, t.meta || {}, { jadwal: j.kunci }, t.tujuan === "edom" ? { semester: j.kunci.slice(-6) } : {})) };
    tambah("Survei", o);
    catat(p.id, "survei.siapkan", { id: o.id, jadwal: j.kunci });
    return { id: o.id };
  });
}
function aksiSurveiKalender(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SURVEI_UBAH);
  var g = teks(d.ganjil), n = teks(d.genap);
  if (!/^\d{2}-\d{2}$/.test(g) || !/^\d{2}-\d{2}$/.test(n)) throw galat("Isi tanggal mulai perkuliahan dengan format BB-TT, misalnya 09-01.");
  if (Number(g.slice(0, 2)) < 7 || Number(n.slice(0, 2)) > 6) throw galat("Ganjil dimulai Juli–Desember dan Genap Januari–Juni.");
  kunciTulis(function () { simpanPengaturan("kalenderSurvei", { ganjil: g, genap: n }, "Tanggal mulai perkuliahan (BB-TT) untuk jadwal survei"); });   // simpanPengaturan: Ded.js
  catat(p.id, "survei.kalender", { ganjil: g, genap: n });
  return aksiSurveiJadwal({}, token);
}
function aksiSurveiJadwalSelesai(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SURVEI_UBAH);
  var l = jsonDari(pengaturan("jadwalSurveiSelesai", ""), []) || [], k = potong(d.kunci, 80);
  if (k && l.indexOf(k) < 0) l.push(k);
  kunciTulis(function () { simpanPengaturan("jadwalSurveiSelesai", l.slice(-200), "Rekomendasi jadwal survei yang ditandai selesai"); });
  return aksiSurveiJadwal({}, token);
}

/* ---------- migrasi v0.50.0 (VERSI_SKEMA 32) ---------- */

/**
 * Isi Survei.pengisi dari jawaban lama, lalu jadikan jawaban survei anonim benar-benar anonim: kunci dan jam dihapus (tinggal tanggal) dan
 * urutan barisnya diacak. Kunci lama = hashToken("survei:sid:userId") → dicocokkan dengan semua akun.
 */
function migrasiSurveiAnonim() {
  var sv = semua("Survei").filter(function (r) { return !r.dihapus; }), pg = semua("Pengguna");
  if (!sv.length) return;
  var js = semua("Jawaban"), kolom = kolomDari("Jawaban");
  sv.forEach(function (r) {
    var anon = benar(r.anonim), peta = {}, l = [];
    if (anon) pg.forEach(function (u) { peta[hashToken("survei:" + r.id + ":" + u.id)] = u.id; });
    js.filter(function (j) { return j.survei === r.id; }).forEach(function (j) { var id = anon ? peta[j.kunci] : j.userId; if (id && l.indexOf(id) < 0) l.push(id); });
    l.sort(); ubah("Survei", r, { pengisi: JSON.stringify(l), meta: teks(r.meta) || "{}" });
  });
  var anonId = {}; sv.forEach(function (r) { if (benar(r.anonim)) anonId[r.id] = 1; });
  if (!js.some(function (j) { return anonId[j.survei]; })) return;
  var biasa = [], anon = [];
  js.forEach(function (j) {
    if (!anonId[j.survei]) { biasa.push(kolom.map(function (k) { return j[k] === undefined ? "" : j[k]; })); return; }
    var t = j.waktu instanceof Date ? tglWita(j.waktu) : teks(j.waktu).slice(0, 10);
    anon.push(kolom.map(function (k) { return k === "kunci" ? "" : k === "userId" ? "" : k === "waktu" ? t : (j[k] === undefined ? "" : j[k]); }));
  });
  tulisUlangTabel("Jawaban", biasa.concat(acakUrutan(anon)));
}
