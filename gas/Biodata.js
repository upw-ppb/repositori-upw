/**
 * Biodata mahasiswa (Kuesioner Mahasiswa Baru Bagian I) dan biodata dosen/tendik (Tabel iLKPS).
 * Skema formulir didefinisikan di sini SAJA; tampilan menerima skema dari server, dan kolom sheet dibentuk darinya.
 * Jenis isian: text, date, sel (pilihan; other = boleh "Lainnya"), prov, kab (bergantung p = kunci provinsi), ro (dari akun).
 */
var PEKERJAAN = ["PNS / TNI / Polri", "Pegawai Swasta", "BUMN / BUMD", "Wirausaha / Pemilik Usaha", "Praktisi / Profesional Pariwisata",
  "Petani / Nelayan", "Mengurus rumah tangga / tidak bekerja"];

var BIO_MHS = [
  { g: "Identitas", f: [
    { k: "nama", l: "Nama lengkap", t: "text", req: 1, hint: "Sesuai ijazah SMA/SMK, tanpa singkatan", akun: 1 },
    { k: "nim", l: "NIM", t: "ro" },
    { k: "masuk", l: "Tahun masuk", t: "ro" },
    { k: "kelas", l: "Kelas", t: "ro" },
    { k: "tmplahir", l: "Tempat lahir", t: "text", req: 1, hint: "Nama kota/kabupaten, contoh: Gianyar" },
    { k: "tgllahir", l: "Tanggal lahir", t: "date", req: 1 },
    { k: "jk", l: "Jenis kelamin", t: "sel", o: ["Laki-laki", "Perempuan"], req: 1 }] },
  { g: "Kontak", f: [
    { k: "hp", l: "Nomor HP / WhatsApp", t: "text", req: 1, hint: "Nomor aktif WhatsApp, contoh: 0812-3456-7890", fmt: "hp" },
    { k: "email", l: "Email", t: "ro", hint: "Email terverifikasi saat aktivasi" },
    { k: "alamat", l: "Alamat tinggal saat ini", t: "text", req: 1, hint: "Alamat selama kuliah, contoh: Jl. Raya Kampus No. 10, Nusa Dua, Badung" }] },
  { g: "Daerah asal dan penerimaan", f: [
    { k: "jalur", l: "Jalur masuk PTNP", t: "sel", o: ["SBM-PTNP (Seleksi Bersama Masuk PTNP)", "SMM-PTNP (Seleksi Mandiri Masuk PTNP)"], other: 1, req: 1 },
    { k: "prov", l: "Provinsi asal", t: "prov", req: 1 },
    { k: "kab", l: "Kabupaten/kota asal", t: "kab", p: "prov", req: 1 },
    { k: "info", l: "Sumber informasi utama PMB Poltekpar Bali", t: "sel", o: ["Media sosial resmi Poltekpar Bali (Instagram/TikTok/YouTube)",
      "Website resmi PMB Poltekpar Bali / PTNP", "Guru BK / sosialisasi sekolah", "Alumni / senior", "Pameran pendidikan / expo", "Keluarga / teman"], other: 1, req: 1 },
    { k: "alasan", l: "Alasan utama memilih Prodi UPW", t: "sel", o: ["Minat pada industri perjalanan, pemanduan, dan MICE",
      "Reputasi dan akreditasi Poltekpar Bali", "Peluang kerja dan jaringan industri pariwisata yang luas", "Rekomendasi orang tua / keluarga",
      "Pilihan sendiri / cita-cita karier"], other: 1, req: 1 }] },
  { g: "Sekolah asal", f: [
    { k: "sekolah", l: "Nama sekolah asal", t: "text", req: 1, hint: "Nama resmi sekolah, contoh: SMK Negeri 1 Denpasar" },
    { k: "jsek", l: "Jenis sekolah", t: "sel", o: ["SMA Negeri", "SMA Swasta", "SMK Negeri", "SMK Swasta", "MAN / MAS", "Paket C"], other: 1, req: 1 },
    { k: "jur", l: "Jurusan/konsentrasi di sekolah", t: "sel", o: ["Usaha Perjalanan Wisata (UPW)", "Perhotelan / pariwisata lainnya", "IPA", "IPS", "Bahasa"], other: 1, req: 1 },
    { k: "provsek", l: "Provinsi lokasi sekolah", t: "prov", req: 1 },
    { k: "kabsek", l: "Kabupaten/kota lokasi sekolah", t: "kab", p: "provsek", req: 1 }] },
  { g: "Kehidupan kuliah", sem: 1, f: [
    { k: "tinggal", l: "Status tempat tinggal", t: "sel", o: ["Rumah orang tua", "Kos / kontrakan", "Asrama", "Rumah kerabat"], other: 1, req: 1, sem: 1 },
    { k: "kerja", l: "Status bekerja saat kuliah", t: "sel", o: ["Tidak bekerja", "Paruh waktu di bidang pariwisata", "Paruh waktu di bidang lain", "Penuh waktu"], other: 1, req: 1, sem: 1 },
    { k: "inggris", l: "Kemampuan bahasa Inggris", t: "sel", o: ["Dasar", "Menengah", "Mahir"], req: 1, sem: 1 },
    { k: "transport", l: "Moda transportasi ke kampus", t: "sel", o: ["Sepeda motor pribadi", "Mobil pribadi", "Angkutan umum / online", "Jalan kaki / sepeda", "Diantar"], other: 1, sem: 1 }] },
  { g: "Bahasa dan kompetensi", f: [
    { k: "skor", l: "Skor tes bahasa Inggris", t: "text", hint: "Contoh: TOEIC 765 (2026)" },
    { k: "bahasa", l: "Bahasa asing lain yang dikuasai", t: "text", hint: "Contoh: Jepang (dasar), Mandarin (menengah)" }] },
  { g: "Keluarga dan ekonomi", priv: 1, f: [
    { k: "ayah", l: "Pekerjaan utama ayah/wali", t: "sel", o: PEKERJAAN, other: 1, req: 1 },
    { k: "ibu", l: "Pekerjaan utama ibu/wali", t: "sel", o: PEKERJAAN, other: 1, req: 1 },
    { k: "hasil", l: "Rata-rata penghasilan gabungan orang tua per bulan", t: "sel", o: ["Kurang dari Rp2.500.000", "Rp2.500.000 – Rp5.000.000",
      "Rp5.000.001 – Rp10.000.000", "Lebih dari Rp10.000.000", "Tidak ingin menyebutkan"] },
    { k: "beasiswa", l: "Beasiswa yang diterima", t: "sel", o: ["Tidak menerima beasiswa", "KIP Kuliah", "Beasiswa afirmasi / daerah 3T", "Beasiswa prestasi"], other: 1, req: 1 },
    { k: "difabel", l: "Kebutuhan khusus / disabilitas", t: "text", hint: "Opsional, untuk layanan pendampingan" }] }
];

var BIO_PEG = [
  { g: "Identitas", f: [
    { k: "nama", l: "Nama lengkap dengan gelar", t: "text", req: 1, hint: "Contoh: Dr. I Made Suardana, S.Par., M.Par.", akun: 1 },
    { k: "nip", l: "NIP / nomor pegawai", t: "ro" },
    { k: "jk", l: "Jenis kelamin", t: "sel", o: ["Laki-laki", "Perempuan"], req: 1 },
    { k: "statusPeg", l: "Status kepegawaian", t: "sel", o: ["PNS", "PPPK", "Pegawai tetap non-ASN", "Pegawai tidak tetap"], other: 1, req: 1 },
    { k: "nidn", l: "NIDN / NIDK / NUPTK", t: "text", untuk: "dosen", hint: "10 digit, lihat di PDDikti atau SISTER" },
    { k: "inisial", l: "Inisial (3 huruf)", t: "text", untuk: "dosen", hint: "Tiga huruf kapital yang dipakai di jadwal kuliah, contoh: GAP" },
    { k: "statusDosen", l: "Status dosen", t: "sel", untuk: "dosen", req: 1, o: ["Dosen tetap program studi (DTPS)",
      "Dosen tetap PT di luar program studi", "Dosen tidak tetap", "Dosen industri / praktisi"] },
    { k: "jabfung", l: "Jabatan akademik", t: "sel", untuk: "dosen", req: 1, o: ["Tenaga Pengajar", "Asisten Ahli", "Lektor", "Lektor Kepala", "Guru Besar"],
      hint: "Unggah SK jabatan di Portofolio Saya (menyusul)" },
    { k: "jabTendik", l: "Jabatan / tugas", t: "text", untuk: "tendik", req: 1, hint: "Contoh: Pengadministrasi Akademik Prodi UPW; Laboran Laboratorium Tiket" }] },
  { g: "Pendidikan", f: [
    { k: "pendTerakhir", l: "Pendidikan terakhir", t: "sel", untuk: "tendik", req: 1, o: ["SMA / SMK", "D3", "D4 / S1", "S2", "S3"] },
    { k: "pendS1", l: "Pendidikan D4/S1", t: "text", untuk: "dosen", req: 1, hint: "Gelar, program studi, kampus, tahun. Contoh: S.Tr.Par., Usaha Perjalanan Wisata, Politeknik Pariwisata Bali, 2012" },
    { k: "pendS2", l: "Magister / magister terapan", t: "text", untuk: "dosen", hint: "Contoh: M.Par., Magister Pariwisata, Universitas Udayana, 2015" },
    { k: "pendS3", l: "Doktor / doktor terapan", t: "text", untuk: "dosen", hint: "Kosongkan bila belum" },
    { k: "pddikti", l: "Terdaftar di PDDikti", t: "sel", untuk: "dosen", o: ["Ya", "Tidak"] }] },
  { g: "Kepakaran dan sertifikat", untuk: "dosen", f: [
    { k: "bidang", l: "Bidang keahlian", t: "text", untuk: "dosen", req: 1, hint: "Pisahkan dengan titik koma, contoh: Perencanaan perjalanan; MICE" },
    { k: "serdos", l: "Nomor sertifikat pendidik (Serdos)", t: "text", untuk: "dosen", hint: "Kosongkan bila belum" },
    { k: "sertKomp", l: "Sertifikat kompetensi / profesi / industri", t: "text", untuk: "dosen", hint: "Format: skema – lembaga, tahun. Contoh: Tour Leader – LSP Pariwisata Indonesia (BNSP), 2023" },
    { k: "mkLain", l: "Mata kuliah yang diampu di prodi lain", t: "text", untuk: "dosen", baru: 1, hint: "Kosongkan bila tidak ada. Contoh: Bahasa Inggris Pariwisata (Prodi Perhotelan)" }] },
  { g: "Profil ilmiah", untuk: "dosen", f: [
    { k: "scholar", l: "Google Scholar", t: "text", untuk: "dosen", hint: "Alamat profil Google Scholar Anda" },
    { k: "sinta", l: "SINTA ID", t: "text", untuk: "dosen", hint: "Angka ID di sinta.kemdiktisaintek.go.id" },
    { k: "scopus", l: "Scopus ID", t: "text", untuk: "dosen" },
    { k: "orcid", l: "ORCID", t: "text", untuk: "dosen", hint: "Contoh: 0000-0002-1825-0097" }] },
  { g: "Kontak", f: [
    { k: "email", l: "Email akun", t: "ro", hint: "Email terverifikasi saat aktivasi" },
    { k: "emailKampus", l: "Email kampus", t: "text", hint: "Contoh: nama@ppb.ac.id", fmt: "email" },
    { k: "hp", l: "Nomor HP / WhatsApp", t: "text", req: 1, hint: "Contoh: 0812-3456-7890", fmt: "hp" },
    { k: "tampilHp", l: "Tampilkan nomor HP di pencarian (untuk mahasiswa dan rekan)", t: "sel", o: ["Tidak", "Ya"], req: 1 }] }
];

/** Kunci yang disimpan di sheet biodata (tanpa kolom dari akun). */
function kunciSimpan(skema, baru) {
  var l = [];
  skema.forEach(function (g) { g.f.forEach(function (f) { if (f.t !== "ro" && !f.akun && !!f.baru === !!baru) l.push(f.k); }); });
  return l;
}
/** Kolom sheet biodata. Isian bertanda "baru" (ditambahkan setelah v0.7.0) selalu diletakkan di AKHIR, agar urutan kolom lama tetap. */
function tabelBiodata() {
  return {
    BiodataMahasiswa: ["userId"].concat(kunciSimpan(BIO_MHS), ["lama", "diubahPada"], kunciSimpan(BIO_MHS, true)),
    BiodataPegawai: ["userId"].concat(kunciSimpan(BIO_PEG), ["lama", "diubahPada"], kunciSimpan(BIO_PEG, true))
  };
}

/* ---------- semester ---------- */

/** Ganjil = Juli–Desember (TA tahun ini/berikutnya), Genap = Januari–Juni (TA tahun lalu/tahun ini). */
function semesterInfo(d) {
  d = d || new Date();
  var y = Number(Utilities.formatDate(d, "Asia/Makassar", "yyyy")), m = Number(Utilities.formatDate(d, "Asia/Makassar", "M"));
  var ganjil = m >= 7, awal = ganjil ? y : y - 1;
  return { kode: awal + "-" + (ganjil ? 1 : 2), label: (ganjil ? "Ganjil " : "Genap ") + awal + "/" + (awal + 1), awal: awal, ganjil: ganjil };
}
function semesterMhs(masuk, s) {
  if (!masuk) return null;
  s = s || semesterInfo();
  var n = 2 * (s.awal - Number(masuk)) + (s.ganjil ? 1 : 2);
  return n > 0 ? n : null;
}

/* ---------- jenis biodata per akun ---------- */

function jenisBiodata(p) {
  var r = peranDari(p);
  if (r.indexOf("mahasiswa") >= 0) return "mahasiswa";
  if (r.indexOf("dosen") >= 0 || r.indexOf("tendik") >= 0) return "pegawai";
  return null;
}
function untukAkun(p) { var r = peranDari(p); return { dosen: r.indexOf("dosen") >= 0, tendik: r.indexOf("tendik") >= 0 && r.indexOf("dosen") < 0 }; }

/** Skema yang berlaku untuk akun ini (kolom khusus dosen/tendik disaring). */
function skemaUntuk(p) {
  var j = jenisBiodata(p);
  if (j === "mahasiswa") return BIO_MHS;
  if (j !== "pegawai") return [];
  var u = untukAkun(p), cocok = function (x) { return !x.untuk || u[x.untuk]; };
  return BIO_PEG.filter(cocok).map(function (g) { return { g: g.g, f: g.f.filter(cocok) }; });
}

/** Apakah akun wajib melengkapi/memperbarui biodata sebelum memakai menu lain. */
function perluBiodata(p) {
  var j = jenisBiodata(p);
  if (!j || p.status !== "aktif") return false;
  if (!(p.biodataLengkap === true || p.biodataLengkap === "TRUE")) return true;
  if (j === "mahasiswa" && (p.statusMhs || "A") === "A" && String(p.biodataSemester) !== semesterInfo().kode) return true;
  return false;
}

/* ---------- baca & validasi ---------- */

function tabelUntuk(j) { return j === "mahasiswa" ? "BiodataMahasiswa" : "BiodataPegawai"; }

function teks(v) {
  if (v instanceof Date) return Utilities.formatDate(v, "Asia/Makassar", "yyyy-MM-dd");
  return v === null || v === undefined ? "" : String(v);
}

/** Nilai biodata lengkap (gabungan kolom akun + sheet). */
function nilaiBiodata(p, baris) {
  var j = jenisBiodata(p), d = {};
  skemaUntuk(p).forEach(function (g) { g.f.forEach(function (f) { d[f.k] = baris ? teks(baris[f.k]) : ""; }); });
  d.nama = p.nama;
  d.email = p.email || "";
  if (j === "mahasiswa") { d.nim = String(p.username); d.masuk = teks(p.masuk); d.kelas = teks(p.kelas); }
  else d.nip = String(p.ref || p.username);
  return d;
}

function kurangDari(p, d) {
  var l = [];
  skemaUntuk(p).forEach(function (g) { g.f.forEach(function (f) { if (f.req && f.t !== "ro" && !String(d[f.k] || "").trim()) l.push(f.l); }); });
  return l;
}

function namaProvinsi() { return WILAYAH.map(function (w) { return w[0]; }); }
function kabDari(prov) { for (var i = 0; i < WILAYAH.length; i++) if (WILAYAH[i][0] === prov) return WILAYAH[i][1]; return null; }

/** Validasi satu isian; kembalikan nilai bersih. Kosong selalu diterima (kelengkapan dicek terpisah). */
function bersihkan(f, v, d) {
  v = String(v === undefined || v === null ? "" : v).replace(/\s+/g, " ").trim();
  if (!v) return "";
  if (v.length > 300) throw galat(f.l + ": terlalu panjang (maksimal 300 karakter).");
  if (f.t === "date") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw galat(f.l + ": format tanggal tidak valid.");
    var th = Number(v.slice(0, 4)), kini = new Date().getFullYear();
    if (th < 1940 || th > kini - 10) throw galat(f.l + ": tahun " + th + " tidak masuk akal.");
  }
  if (f.t === "sel" && f.o.indexOf(v) < 0 && !f.other) throw galat(f.l + ": pilihan tidak dikenal.");
  if (f.t === "prov" && v !== "Luar negeri" && namaProvinsi().indexOf(v) < 0) throw galat(f.l + ": provinsi tidak dikenal.");
  if (f.t === "kab") {
    var prov = d[f.p];
    if (!prov) throw galat("Pilih provinsi terlebih dahulu untuk " + f.l.toLowerCase() + ".");
    if (prov !== "Luar negeri" && (kabDari(prov) || []).indexOf(v) < 0) throw galat(f.l + ": tidak ada di provinsi " + prov + ".");
  }
  if (f.fmt === "hp" && !/^\+?[0-9][0-9 \-]{7,19}$/.test(v)) throw galat(f.l + ": tulis angka saja, contoh 0812-3456-7890.");
  if (f.fmt === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw galat(f.l + ": format email tidak valid.");
  return v;
}

function ambilBaris(j, userId) { return cari(tabelUntuk(j), function (x) { return x.userId === userId; }); }

function riwayatDari(userId) {
  return semua("RiwayatSemester").filter(function (x) { return x.userId === userId; })
    .map(function (x) { return { semester: String(x.semester), tinggal: x.tinggal, kerja: x.kerja, inggris: x.inggris, transport: x.transport }; })
    .sort(function (a, b) { return a.semester < b.semester ? 1 : -1; });
}

function labelSemester(kode) { var m = /^(\d{4})-([12])$/.exec(kode); return m ? (m[2] === "1" ? "Ganjil " : "Genap ") + m[1] + "/" + (Number(m[1]) + 1) : kode; }

/** Paket biodata untuk tampilan. sembunyikanPrivat = untuk pembaca selain pemilik dan Admin. */
function paketBiodata(p, sembunyikanPrivat) {
  var j = jenisBiodata(p);
  if (!j) return { jenis: null };
  var b = ambilBaris(j, p.id), d = nilaiBiodata(p, b), s = semesterInfo(), skema = skemaUntuk(p);
  if (sembunyikanPrivat) skema = skema.filter(function (g) { return !g.priv; });
  var hasil = { jenis: j, skema: skema, data: d, lama: b && b.lama ? String(b.lama).split(",").filter(String) : [],
    kurang: kurangDari(p, d), semester: s, diubahPada: b && b.diubahPada ? new Date(b.diubahPada).toISOString() : "" };
  if (j === "mahasiswa") {
    hasil.riwayat = riwayatDari(p.id).map(function (r) { r.label = labelSemester(r.semester); return r; });
    hasil.semesterMhs = semesterMhs(p.masuk, s);
    hasil.statusMhs = p.statusMhs || "A";
    hasil.sudahSemesterIni = String(p.biodataSemester) === s.kode;
  }
  if (sembunyikanPrivat) BIO_MHS.forEach(function (g) { if (g.priv) g.f.forEach(function (f) { delete hasil.data[f.k]; }); });
  return hasil;
}

/* ---------- aksi ---------- */

function aksiBiodataSaya(d, token) {
  var p = penggunaDariToken(token);
  if (p.status !== "aktif") throw galat("Selesaikan aktivasi akun terlebih dahulu.");
  return { biodata: paketBiodata(p, false), wilayah: WILAYAH };
}

/** Simpan biodata. Boleh sebagian (tersimpan sebagai draf); kelengkapan dihitung ulang. */
function aksiBiodataSimpan(d, token) {
  var p0 = penggunaDariToken(token);
  if (p0.status !== "aktif") throw galat("Selesaikan aktivasi akun terlebih dahulu.");
  var masukan = d.data || {};
  return kunciTulis(function () {
    var p = cari("Pengguna", function (x) { return x.id === p0.id; });
    var j = jenisBiodata(p);
    if (!j) throw galat("Akun ini tidak memerlukan biodata.");
    var skema = skemaUntuk(p), bersih = {}, kini = new Date();
    skema.forEach(function (g) { g.f.forEach(function (f) { if (f.t !== "ro") bersih[f.k] = bersihkan(f, masukan[f.k], masukan); }); });
    if (!bersih.nama) throw galat("Nama tidak boleh kosong.");
    var tabel = tabelUntuk(j), b = ambilBaris(j, p.id), rekam = { userId: p.id, lama: "", diubahPada: kini };
    var skm = j === "mahasiswa" ? BIO_MHS : BIO_PEG;
    kunciSimpan(skm).concat(kunciSimpan(skm, true)).forEach(function (k) { rekam[k] = bersih[k] !== undefined ? bersih[k] : (b ? b[k] : ""); });
    if (b) ubah(tabel, b, rekam); else tambah(tabel, rekam);

    var nilai = nilaiBiodata(Object.assign({}, p, { nama: bersih.nama }), rekam), kurang = kurangDari(p, nilai);
    var ubahan = { nama: bersih.nama, biodataLengkap: kurang.length === 0, biodataPada: kini, diubahPada: kini };
    if (j === "mahasiswa" && kurang.length === 0) {
      var s = semesterInfo(), rs = cari("RiwayatSemester", function (x) { return x.userId === p.id && String(x.semester) === s.kode; });
      var r = { userId: p.id, semester: s.kode, tinggal: bersih.tinggal, kerja: bersih.kerja, inggris: bersih.inggris, transport: bersih.transport, waktu: kini };
      if (rs) ubah("RiwayatSemester", rs, r); else tambah("RiwayatSemester", r);
      ubahan.biodataSemester = s.kode;
    }
    ubah("Pengguna", p, ubahan);
    catat(p.id, "biodata.simpan", { lengkap: kurang.length === 0, kurang: kurang.length });
    return { biodata: paketBiodata(p, false), pengguna: profilPublik(p) };
  });
}

/** Admin Prodi / Super Admin melihat biodata lengkap seseorang (Admin Prodi: hanya mahasiswa). */
function aksiBiodataLihat(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["superadmin", "admin"]);
  var t = cari("Pengguna", function (x) { return x.id === d.userId; });
  if (!t) throw galat("Pengguna tidak ditemukan.");
  if (!punyaPeran(p, ["superadmin"]) && peranDari(t).indexOf("mahasiswa") < 0) throw galat("Anda tidak memiliki izin untuk tindakan ini.");
  catat(p.id, "biodata.lihat", { untuk: t.id });
  return { biodata: paketBiodata(t, false), nama: t.nama };
}

/** Admin mengubah data akademik mahasiswa: tahun masuk, kelas, status. */
var STATUS_MHS_SAH = ["A", "C", "N", "L", "D", "K", "M", "W"];
function aksiAdminUbahMhs(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["superadmin", "admin"]);
  var masuk = Number(d.masuk), kelas = String(d.kelas || "").trim().toUpperCase(), st = String(d.statusMhs || "A").toUpperCase();
  if (!(masuk >= 2000 && masuk <= new Date().getFullYear() + 1)) throw galat("Tahun masuk tidak valid.");
  if (!/^[A-Z0-9]{1,3}$/.test(kelas)) throw galat("Kelas tidak valid (contoh: A atau B).");
  if (STATUS_MHS_SAH.indexOf(st) < 0) throw galat("Status mahasiswa tidak dikenal.");
  return kunciTulis(function () {
    var t = cari("Pengguna", function (x) { return x.id === d.userId; });
    if (!t || peranDari(t).indexOf("mahasiswa") < 0) throw galat("Mahasiswa tidak ditemukan.");
    ubah("Pengguna", t, { masuk: masuk, kelas: kelas, statusMhs: st, diubahPada: new Date() });
    catat(p.id, "admin.ubahMhs", { untuk: t.id, masuk: masuk, kelas: kelas, status: st });
    return { pengguna: profilAdmin(t, true) };
  });
}

/**
 * Direktori untuk pencarian dan penandaan: semua akun dosen/tendik/mahasiswa yang tidak nonaktif.
 * Hanya data umum; nomor HP dosen/tendik hanya bila pemiliknya mengizinkan. Status mahasiswa hanya untuk staf.
 */
function aksiDirektori(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SAH);
  if (perluBiodata(p)) throw galat("Lengkapi biodata Anda terlebih dahulu.");
  var staf = punyaPeran(p, ["superadmin", "admin", "kps", "kalab", "laboran", "dosen", "tendik", "asesor"]);
  var peg = {}; semua("BiodataPegawai").forEach(function (b) { peg[b.userId] = b; });
  var s = semesterInfo(), l = [];
  semua("Pengguna").forEach(function (x) {
    if (x.status === "nonaktif") return;
    var j = jenisBiodata(x);
    if (!j) return;
    var o = { id: x.id, nama: x.nama, username: String(x.username), aktif: x.status === "aktif" };
    if (j === "mahasiswa") {
      o.jenis = "mahasiswa"; o.masuk = teks(x.masuk); o.kelas = teks(x.kelas); o.semester = semesterMhs(x.masuk, s);
      o.statusMhs = staf ? (x.statusMhs || "A") : ((x.statusMhs || "A") === "A" ? "A" : "");
      if (!staf && o.statusMhs !== "A") return; // mahasiswa hanya melihat sesama mahasiswa aktif
    } else {
      var r = peranDari(x), b = peg[x.id] || {};
      o.jenis = r.indexOf("dosen") >= 0 ? "dosen" : "tendik";
      o.peran = r.filter(function (q) { return ["kps", "kalab", "laboran", "admin"].indexOf(q) >= 0; });
      o.bidang = teks(b.bidang); o.jabfung = teks(b.jabfung); o.jabTendik = teks(b.jabTendik); o.emailKampus = teks(b.emailKampus);
      if (b.tampilHp === "Ya") o.hp = teks(b.hp);
    }
    l.push(o);
  });
  return { orang: l, semester: s };
}
