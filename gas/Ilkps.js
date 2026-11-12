/**
 * Tabel iLKPS LAMWisata (v0.7.0), disusun otomatis dari kegiatan berstatus data "disetujui".
 * Format mengikuti berkas resmi "Tabel iLKPS_Lamwisata.xlsx" (varian Vokasi untuk Tabel 14 dan 19, karena UPW Sarjana Terapan).
 * Rentang: TS-2, TS-1, TS (tahun akademik). TS diatur Admin di Pengaturan "tsAwal" (tahun awal TA, mis. 2025 = 2025/2026).
 * Tabel 1–6 (dosen, kurikulum, EWMP) disusun di DataProdi.js; tabel lulusan, keuangan, dan kepuasan belum diisi otomatis.
 */
var PERAN_ILKPS = ["admin", "superadmin", "kps", "asesor"];
var BARIS_DANA = ["a) Perguruan tinggi b) Mandiri", "Lembaga dalam negeri (diluar PT)", "Lembaga luar negeri"];
var BARIS_PUB14 = ["Jurnal penelitian tidak terakreditasi", "Jurnal penelitian nasional terakreditasi", "Jurnal penelitian internasional",
  "Jurnal penelitian internasional bereputasi", "Seminar wilayah/lokal/perguruan tinggi", "Seminar nasional", "Seminar internasional",
  "Pagelaran/pameran/presentasi dalam forum di tingkat wilayah", "Pagelaran/pameran/presentasi dalam forum di tingkat nasional",
  "Pagelaran/pameran/presentasi dalam forum di tingkat internasional"];
var BARIS_PUB19 = ["Jurnal nasional tidak terakreditasi", "Jurnal nasional terakreditasi", "Jurnal internasional", "Jurnal internasional bereputasi"]
  .concat(BARIS_PUB14.slice(4));
var BAGIAN15 = [
  { kode: "15-1", judul: "Tabel 15) Bagian-1 HKI (Paten, Paten Sederhana)", jenis: ["Paten / paten sederhana"] },
  { kode: "15-2", judul: "Tabel 15) Bagian-2 HKI (Hak Cipta, Desain Produk Industri, dll.)", jenis: ["Hak cipta", "Desain produk industri"] },
  { kode: "15-3", judul: "Tabel 15) Bagian-3 Teknologi Tepat Guna, Produk, Karya Seni, Rekayasa Sosial", jenis: ["Teknologi tepat guna", "Produk terstandar/tersertifikasi", "Rekayasa sosial"] },
  { kode: "15-4", judul: "Tabel 15) Bagian-4 Buku Ber-ISBN, Book Chapter", jenis: ["Buku ber-ISBN", "Book chapter"] }];
var BELUM_OTOMATIS = [
  ["Tabel 11", "Kepuasan pengguna lulusan (7 aspek)", "survei pengguna lulusan (menu Survei, rilis berikutnya)"],
  ["Tabel 22", "Kepuasan mahasiswa (5 aspek)", "survei mahasiswa (menu Survei, rilis berikutnya)"]];
/** Urutan lembar seperti berkas resmi. */
var URUTAN_TABEL = ["1", "2", "3", "4", "5", "6", "7a", "7b", "8", "9", "10a", "10b", "10c", "ref11a", "11", "12", "13", "14", "15-1", "15-2", "15-3", "15-4",
  "15a", "16", "17", "18", "19", "20-1", "20-2", "20-3", "21", "22", "23"];

function tsAwal() {
  var v = Number(pengaturan("tsAwal", ""));
  return v >= 2000 && v < 2100 ? v : semesterInfo().awal - 1;
}
function labelTa(a) { return a + "/" + (a + 1); }
function taKegiatan(k) { return k.tgl && tanggalSah(k.tgl) ? semesterInfo(keTanggal(k.tgl)).awal : null; }
function tahunKegiatan(k) { return (k.sampai || k.tgl || "").slice(0, 4); }
function dosenKegiatan(k, idx) {
  var l = (k.lampiran && k.lampiran.pegawai ? k.lampiran.pegawai.map(function (x) { return { nama: x.nama, jenis: x.jenis }; }) : pegawaiPeserta(k, idx))
    .filter(function (x) { return x.jenis === "dosen"; }).map(function (x) { return x.nama; });
  var o = idx.byId[k.olehId];
  if (o && o.jenis === "dosen" && l.indexOf(o.nama) < 0) l.unshift(o.nama);
  return l;
}
function mhsKegiatan(k, idx) { return (k.lampiran && k.lampiran.mhs ? k.lampiran.mhs : mhsPeserta(k, idx)).map(function (m) { return m.nama; }); }
function centangTingkat(t, urut) { return urut.map(function (x) { return t === x ? "V" : ""; }); }
function barisDana(v) { v = teks(v); return v.indexOf("Dalam negeri") === 0 ? 1 : v.indexOf("Luar negeri") === 0 ? 2 : v ? 0 : -1; }

/** Susun semua tabel. Mengembalikan struktur umum yang dipakai tampilan dan ekspor Excel. */
function susunIlkps(ts) {
  var idx = indeksOrang(), tsList = [ts - 2, ts - 1, ts];
  var semuaK = semuaKegiatan().filter(function (k) { var a = taKegiatan(k); return a !== null && a >= ts - 2 && a <= ts; });
  var ok = semuaK.filter(function (k) { return k.status === "disetujui"; });
  var proses = function (jenis) { return semuaK.filter(function (k) { return jenis.indexOf(k.jenis) >= 0 && k.status !== "disetujui" && k.status !== "ditolak" && !(k.st === "ditolak_aju"); }).length; };
  var dari = function (jenis) { return ok.filter(function (k) { return jenis.indexOf(k.jenis) >= 0; }).sort(function (a, b) { return (a.tgl || "").localeCompare(b.tgl || ""); }); };
  var kol = function (k) { return tsList.indexOf(taKegiatan(k)); };
  var T = [], catatan;

  function daftar(kode, judul, kolom, kegs, isi, cat, jenis) {
    T.push({ kode: kode, judul: judul, bentuk: "daftar", kolom: kolom, baris: kegs.map(function (k, i) { return [i + 1].concat(isi(k)); }),
      id: kegs.map(function (k) { return k.id; }), catatan: cat || "", proses: proses(jenis) });
  }
  function hitung(kode, judul, labelBaris, kegs, barisDari, cat, jenis) {
    var m = labelBaris.map(function () { return [0, 0, 0]; }), id = labelBaris.map(function () { return []; }), lewat = 0;
    kegs.forEach(function (k) { var r = barisDari(k), c = kol(k); if (r < 0 || c < 0) { lewat++; return; } m[r][c]++; id[r].push(k.id); });
    var baris = labelBaris.map(function (l, i) { return [i + 1, l, m[i][0], m[i][1], m[i][2], m[i][0] + m[i][1] + m[i][2]]; });
    var jml = [0, 1, 2].map(function (c) { return m.reduce(function (s, r) { return s + r[c]; }, 0); });
    baris.push(["Jumlah", "", jml[0], jml[1], jml[2], jml[0] + jml[1] + jml[2]]);
    T.push({ kode: kode, judul: judul, bentuk: "hitung", kolom: ["No.", labelBaris === BARIS_DANA ? "Sumber Pembiayaan" : "Jenis Publikasi",
      "TS-2 (" + labelTa(tsList[0]) + ")", "TS-1 (" + labelTa(tsList[1]) + ")", "TS (" + labelTa(tsList[2]) + ")", "Jumlah"],
      baris: baris, idBaris: id, catatan: (cat || "") + (lewat ? " " + lewat + " kegiatan belum terhitung karena isian penentunya kosong; lengkapi lewat detail kegiatan." : ""),
      proses: proses(jenis) });
  }
  var TK = ["Lokal/Wilayah", "Nasional", "Internasional"];
  ["prestasi_a", "prestasi_n"].forEach(function (j, i) {
    daftar(i ? "7b" : "7a", i ? "Tabel 7b) Prestasi Non-akademik Mahasiswa" : "Tabel 7a) Prestasi Akademik Mahasiswa",
      ["No.", "Nama Kegiatan", "Waktu Perolehan (YYYY)", "Tingkat: Lokal/Wilayah", "Tingkat: Nasional", "Tingkat: Internasional", "Prestasi yang Dicapai", "Mahasiswa"],
      dari([j]), function (k) { return [k.judul, tahunKegiatan(k)].concat(centangTingkat(k.tingkat, TK), [teks(k.isian.Capaian), mhsKegiatan(k, idx).join("; ")]); },
      "Kolom Mahasiswa adalah tambahan aplikasi (tidak ada di format resmi).", [j]);
  });
  hitung("12", "Tabel 12) Penelitian DTPS", BARIS_DANA, dari(["penelitian"]), function (k) { return barisDana(k.isian["Sumber dana"]); }, "", ["penelitian"]);
  daftar("13", "Tabel 13) Penelitian DTPS yang Melibatkan Mahasiswa", ["No.", "Nama Dosen", "Tema Penelitian sesuai Roadmap", "Nama Mahasiswa", "Judul Kegiatan", "Tahun (YYYY)"],
    dari(["penelitian"]).filter(function (k) { return mhsKegiatan(k, idx).length; }),
    function (k) { return [dosenKegiatan(k, idx).join("; "), teks(k.isian["Topik peta jalan penelitian"]), mhsKegiatan(k, idx).join("; "), k.judul, tahunKegiatan(k)]; }, "", ["penelitian"]);
  var pub = dari(["publikasi"]), opsiPub = (jenisDef("publikasi").fx.filter(function (f) { return f.l === "Kategori publikasi"; })[0] || { o: [] }).o;
  var luaranPkm = function (k) { return teks(k.isian["Luaran dari"]) === "PkM"; };
  hitung("14", "Tabel 14) Publikasi Ilmiah DTPS dan/atau bersama mahasiswa (Vokasi)", BARIS_PUB14, pub.filter(function (k) { return !luaranPkm(k); }),
    function (k) { return opsiPub.indexOf(teks(k.isian["Kategori publikasi"])); }, "Publikasi dengan \"Luaran dari\" = Penelitian atau kosong.", ["publikasi"]);
  BAGIAN15.forEach(function (b) {
    daftar(b.kode, b.judul, ["No", "Luaran Penelitian dan PkM", "Tahun (YYYY)", "Keterangan"],
      dari(["hki"]).filter(function (k) { return b.jenis.indexOf(teks(k.isian.Jenis)) >= 0; }),
      function (k) { return [k.judul, tahunKegiatan(k), [teks(k.isian.Jenis), teks(k.isian["Nomor sertifikat / ISBN"])].filter(String).join(" · ")]; }, "", ["hki"]);
  });
  daftar("15a", "Tabel 15.a) Produk/Jasa DTPS yang Diadopsi oleh Industri/Masyarakat", ["No.", "Nama Dosen", "Nama Produk/Jasa", "Deskripsi Produk/Jasa", "Bukti", "Tahun [YYYY]"],
    dari(["produk"]), function (k) { return [dosenKegiatan(k, idx).join("; "), k.judul, teks(k.isian.Pengadopsi) ? "Diadopsi oleh " + teks(k.isian.Pengadopsi) : "", "Repositori UPW", tahunKegiatan(k)]; }, "", ["produk"]);
  daftar("16", "Tabel 16) Karya Ilmiah DTPS yang Disitasi", ["No.", "Nama Dosen", "Judul Artikel yang Disitasi (Jurnal, Volume, Tahun, Nomor, Halaman)", "Jumlah Sitasi"],
    pub.filter(function (k) { return Number(String(k.isian["Jumlah sitasi (Google Scholar)"] || "").replace(/\D/g, "")) > 0; }),
    function (k) { return [dosenKegiatan(k, idx).join("; "), k.judul + (k.isian["Nama jurnal / seminar"] ? ", " + k.isian["Nama jurnal / seminar"] : ""), Number(String(k.isian["Jumlah sitasi (Google Scholar)"]).replace(/\D/g, ""))]; }, "", ["publikasi"]);
  hitung("17", "Tabel 17) PkM DTPS", BARIS_DANA, dari(["pkm"]), function (k) { return barisDana(k.isian["Sumber dana"]); }, "", ["pkm"]);
  daftar("18", "Tabel 18) PkM DTPS yang melibatkan mahasiswa", ["No.", "Nama Dosen", "Tema PkM sesuai Roadmap", "Nama Mahasiswa", "Judul Kegiatan", "Tahun (YYYY)"],
    dari(["pkm"]).filter(function (k) { return mhsKegiatan(k, idx).length; }),
    function (k) { return [dosenKegiatan(k, idx).join("; "), teks(k.isian["Mitra sasaran"]) ? "Mitra: " + teks(k.isian["Mitra sasaran"]) : "", mhsKegiatan(k, idx).join("; "), k.judul, tahunKegiatan(k)]; },
    "Tema roadmap PkM belum ada di formulir; kolom diisi mitra sasaran.", ["pkm"]);
  hitung("19", "Tabel 19) Publikasi Ilmiah luaran PkM (Vokasi)", BARIS_PUB19, pub.filter(luaranPkm),
    function (k) { return opsiPub.indexOf(teks(k.isian["Kategori publikasi"])); }, "Publikasi dengan \"Luaran dari\" = PkM.", ["publikasi"]);
  [["Pendidikan", "Bagian-1 Kerjasama Pendidikan"], ["Penelitian", "Bagian-2 Kerjasama Penelitian"], ["PkM", "Bagian-3 Kerjasama Pengabdian kepada Masyarakat"]].forEach(function (b, i) {
    daftar("20-" + (i + 1), "Tabel 20) " + b[1], ["No.", "Lembaga Mitra", "Tingkat: Internasional", "Tingkat: Nasional", "Tingkat: Wilayah/Lokal", "Judul Kegiatan Kerjasama",
      "Manfaat bagi PS yang Diakreditasi", "Waktu dan Durasi", "Bukti Kerjasama", "Tahun Berakhirnya Kerjasama (YYYY)"],
      dari(["kerjasama"]).filter(function (k) { return teks(k.isian.Bidang) === b[0]; }),
      function (k) { var th = /((19|20)\d{2})(?!.*(19|20)\d{2})/.exec(teks(k.isian["Masa berlaku"])); return [teks(k.isian["Nama mitra"])].concat(centangTingkat(k.tingkat, TK.slice().reverse()),
        [k.judul, "", k.tgl === k.sampai || !k.sampai ? k.tgl : k.tgl + " s.d. " + k.sampai, "Repositori UPW", th ? th[1] : ""]); },
      "Kolom Manfaat belum ada di formulir; lengkapi saat menyalin ke format resmi.", ["kerjasama"]);
  });
  daftar("23", "Tabel 23) Pengakuan/Rekognisi DTPS", ["No.", "Nama Dosen", "Bidang Keahlian", "Rekognisi dan Bukti Pendukung", "Tingkat: Wilayah", "Tingkat: Nasional", "Tingkat: Internasional", "Tahun (YYYY)"],
    dari(["rekognisi"]), function (k) { return [dosenKegiatan(k, idx).join("; "), "", [teks(k.isian["Bentuk rekognisi"]), k.judul].filter(String).join(": ")].concat(centangTingkat(k.tingkat, TK), [tahunKegiatan(k)]); },
    "Bidang keahlian diambil dari biodata dosen pada rilis berikutnya.", ["rekognisi"]);
  var semuaT = tabelDosen(ts).concat(T, tabelLulusan(ts)).sort(function (a, b) { return URUTAN_TABEL.indexOf(a.kode) - URUTAN_TABEL.indexOf(b.kode); });
  return { ts: { awal: ts, label: labelTa(ts), rentang: tsList.map(labelTa) }, tabel: semuaT, belum: BELUM_OTOMATIS,
    jumlahDisetujui: ok.length, jumlahProses: semuaK.filter(function (k) { return k.status !== "disetujui" && k.status !== "ditolak" && k.st !== "ditolak_aju"; }).length };
}

function aksiIlkpsData(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_ILKPS);
  var ts = d.ts ? Number(d.ts) : tsAwal();
  if (!(ts >= 2000 && ts < 2100)) throw galat("TS tidak valid.");
  var h = susunIlkps(ts);
  catatAsesor(p, "ilkps", { ts: ts });
  h.tsTersimpan = tsAwal();
  h.bolehAtur = punyaPeran(p, ["admin", "superadmin"]);
  return h;
}

/** Admin menetapkan TS (tahun awal tahun akademik). */
function aksiIlkpsTs(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["admin", "superadmin"]);
  var ts = Number(d.ts);
  if (!(ts >= 2015 && ts <= semesterInfo().awal)) throw galat("TS harus tahun akademik yang sudah berjalan (mis. 2025 untuk 2025/2026).");
  return kunciTulis(function () {
    var r = cari("Pengaturan", function (x) { return x.kunci === "tsAwal"; });
    if (r) ubah("Pengaturan", r, { nilai: ts });
    else tambah("Pengaturan", { kunci: "tsAwal", nilai: ts, keterangan: "TS untuk Tabel iLKPS (tahun awal TA, mis. 2025 = 2025/2026)" });
    catat(p.id, "ilkps.ts", { ts: ts });
    var h = susunIlkps(ts); h.tsTersimpan = ts; h.bolehAtur = true;
    return h;
  });
}
