/**
 * Portofolio Mata Kuliah (v0.14.0): kelengkapan dokumen per MK per semester, diisi tim pengajar yang ditetapkan Admin (Data Prodi).
 * Data pendukung butir 8 (RPS), 22 (proses pembelajaran), dan 25 (penilaian).
 * Satu baris PortofolioMk per (semester, kodeMk); kolom isi = JSON:
 *   rps | kontrak | rubrik : { t: "file"|"tautan", fileId, nama, mime, ukuran, url, o, w }   — hanya pengampu utama (anggota[0])
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
var PERAN_MKP_REKAP = ["admin", "superadmin", "kps"];
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
/** MK dengan tim pada semester itu (dasar persentase). */
function mkBertim(smt) {
  var tim = timSemester(smt), mks = semuaMk();
  return mks.filter(function (m) { return tim[m.kode] && tim[m.kode].anggota.length; }).map(function (m) { return { mk: m, anggota: tim[m.kode].anggota }; });
}
function peranTim(anggota, userId) {
  var i = -1; anggota.forEach(function (a, j) { if (i < 0 && a.t === "u" && a.id === userId) i = j; });
  return i < 0 ? "" : i === 0 ? "utama" : "anggota";
}
function namaAnggota(anggota, idx, prak) {
  return anggota.map(function (a) {
    if (a.t === "p") { var x = prak[a.id]; return { t: "p", id: a.id, nama: x ? x.nama : "(praktisi)" }; }
    var o = idx.byId[a.id]; return { t: "u", id: a.id, nama: o ? o.nama : "(dosen)" };
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
      KOMP_MKP.forEach(function (c) { if (adaKomp(s, c.k)) ada[c.k]++; });
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
    8: "Portofolio MK TS: RPS tersedia di " + f(p.rps) + " dari " + p.n + " MK",
    22: "Portofolio MK TS: metode tercatat di " + f(p.metode) + ", integrasi penelitian/PkM di " + f(p.integ) + ", bukti interaksi di " + f(p.interaksi) + " MK",
    25: "Portofolio MK TS: rubrik di " + f(p.rubrik) + ", kontrak kuliah di " + f(p.kontrak) + " MK (skor 4 butuh rubrik ≥ 70% MK)"
  };
}

function entriKeKlien(e, idx) {
  if (!e) return null;
  var o = idx.byId[e.o], x = { t: e.t, nama: e.nama || "", ukuran: e.ukuran || 0, url: e.t === "tautan" ? e.url : "", ket: e.ket || "", teks: e.teks || "",
    id: e.id || "", o: e.o, oleh: o ? o.nama : "", w: e.w || "" };
  return x;
}
function mkpKeKlien(x, smt, isi, p, idx, prak) {
  var per = peranTim(x.anggota, p.id), buka = smtTerbuka(smt);
  var s = isi || {};
  return {
    semester: smt, labelSemester: labelSmt(smt), kode: x.mk.kode, nama: x.mk.nama, sks: sksMk(x.mk), sksPraktik: x.mk.sksPraktik, smtMk: x.mk.semester,
    tim: namaAnggota(x.anggota, idx, prak), peran: per, buka: buka,
    bolehUtama: buka && per === "utama", bolehAnggota: buka && !!per,
    rps: entriKeKlien(s.rps, idx), kontrak: entriKeKlien(s.kontrak, idx), rubrik: entriKeKlien(s.rubrik, idx),
    metode: s.metode ? { v: s.metode.v || [], lain: s.metode.lain || "", oleh: (idx.byId[s.metode.o] || {}).nama || "", w: s.metode.w || "" } : { v: [], lain: "" },
    integ: (s.integ || []).map(function (e) { return entriKeKlien(e, idx); }),
    interaksi: (s.interaksi || []).map(function (e) { return entriKeKlien(e, idx); }),
    lengkap: KOMP_MKP.filter(function (c) { return adaKomp(s, c.k); }).map(function (c) { return c.k; })
  };
}
function pilihanSemesterMkp() {
  var s = semesterInfo(), kk = s.ganjil ? kodeSmt(s.awal, false) : kodeSmt(s.awal + 1, true), l = [];
  for (var i = 0; i < 9; i++) { l.push({ kode: kk, label: labelSmt(kk) }); kk = /-1$/.test(kk) ? kodeSmt(Number(kk.slice(0, 4)) - 1, false) : kodeSmt(Number(kk.slice(0, 4)), true); }
  return l;
}
function refMkp() { return { komp: KOMP_MKP, daftarMetode: METODE_MKP, pilihanSemester: pilihanSemesterMkp(), semesterKini: semesterInfo().kode }; }

/* ---------- aksi baca ---------- */

/** MK yang diampu pengguna (dosen) pada satu semester. */
function aksiMkpSaya(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["dosen"]);
  var smt = semesterSah(d.semester || semesterInfo().kode), isi = semuaMkpSemester(smt), idx = indeksOrang(), prak = petaPraktisi();
  var mk = mkBertim(smt).filter(function (x) { return peranTim(x.anggota, p.id); }).map(function (x) {
    return mkpKeKlien(x, smt, isi[x.mk.kode] ? isi[x.mk.kode].isi : null, p, idx, prak);
  });
  return Object.assign({ semester: smt, labelSemester: labelSmt(smt), mk: mk }, refMkp());
}
/** Rekap kelengkapan semua MK bertim pada satu semester (Admin Prodi / KPS / Super Admin). */
function aksiMkpRekap(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_MKP_REKAP);
  var smt = semesterSah(d.semester || semesterInfo().kode), isi = semuaMkpSemester(smt), idx = indeksOrang(), prak = petaPraktisi();
  var mk = mkBertim(smt).map(function (x) { return mkpKeKlien(x, smt, isi[x.mk.kode] ? isi[x.mk.kode].isi : null, p, idx, prak); });
  var tanpaTim = semuaMk().filter(function (m) { return m.semester % 2 === (/-1$/.test(smt) ? 1 : 0); }).length - mk.length;
  return Object.assign({ semester: smt, labelSemester: labelSmt(smt), mk: mk, persen: persenMkp([smt]), tanpaTim: Math.max(0, tanpaTim) }, refMkp());
}
function ambilMkp(smt, kode, p, perluUbah) {
  var x = mkBertim(smt).filter(function (y) { return y.mk.kode === kode; })[0];
  if (!x) throw galat("Mata kuliah ini belum punya tim pengajar pada " + labelSmt(smt) + ".");
  var per = peranTim(x.anggota, p.id);
  if (!per && !punyaPeran(p, PERAN_MKP_REKAP)) throw galat("Anda bukan anggota tim pengajar mata kuliah ini.");
  if (perluUbah) {
    if (!per) throw galat("Hanya anggota tim pengajar yang mengisi portofolio mata kuliah.");
    if (!smtTerbuka(smt)) throw galat(labelSmt(smt) + " sudah lewat; portofolio hanya bisa dilihat.");
  }
  x.peran = per;
  return x;
}
function aksiMkpDetail(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_MKP_REKAP.concat(["dosen"]));
  var smt = semesterSah(d.semester), kode = teks(d.kode), x = ambilMkp(smt, kode, p, false), r = semuaMkpSemester(smt)[kode];
  var hasil = mkpKeKlien(x, smt, r ? r.isi : null, p, indeksOrang(), petaPraktisi());
  // Kuliah tamu yang menyebut kode MK ini (jenis "kuliahtamu", isian "Mata kuliah terkait").
  var a = Number(smt.slice(0, 4)), ganjil = /-1$/.test(smt);
  hasil.kuliahTamu = semuaKegiatan().filter(function (k) {
    if (k.jenis !== "kuliahtamu" || k.dihapus || !k.tgl || !tanggalSah(k.tgl)) return false;
    var s = semesterInfo(keTanggal(k.tgl)); if (s.awal !== a || s.ganjil !== ganjil) return false;
    return JSON.stringify(k.isian || {}).toUpperCase().indexOf(kode.toUpperCase()) >= 0;
  }).map(function (k) { return { id: k.id, judul: k.judul, tgl: k.tgl, status: k.status }; });
  return Object.assign(hasil, refMkp());
}

/* ---------- aksi ubah ---------- */

function folderMkp(smt, mk) {
  var induk = folderAnak(folderAnak(DriveApp.getFolderById(konfig().getProperty("FOLDER_ID")), "Bukti"), "Portofolio MK");
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

function aksiMkpUnggah(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["dosen"]);
  var smt = semesterSah(d.semester), kode = teks(d.kode), c = kompMkp(String(d.komp || ""));
  if (!c || (c.jenis !== "dok" && c.jenis !== "daftar")) throw galat("Jenis dokumen tidak dikenal.");
  var x = ambilMkp(smt, kode, p, true);
  if (c.u && x.peran !== "utama") throw galat(c.l + " diunggah oleh pengampu utama.");
  var entri, file = null;
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
    file = folderMkp(smt, x.mk).createFile(Utilities.newBlob(bytes, mime, namaAman(c.l + " - " + nama)));
    entri = { t: "file", fileId: file.getId(), nama: nama, mime: mime, ukuran: bytes.length };
  }
  if (c.jenis === "daftar") entri.ket = potong(d.ket, 200).trim();
  entri.o = p.id; entri.w = new Date().toISOString();
  var lama = null;
  try {
    ubahMkp(smt, kode, p, function (s) {
      if (c.jenis === "dok") { lama = s[c.k]; s[c.k] = entri; }
      else {
        if (s[c.k].length >= MAKS_DAFTAR_MKP) throw galat("Maksimal " + MAKS_DAFTAR_MKP + " bukti per mata kuliah. Gabungkan beberapa dokumentasi dalam satu tautan folder.");
        entri.id = idAcak(); s[c.k].push(entri);
      }
    });
  } catch (e) {
    if (file) try { file.setTrashed(true); } catch (_) {}
    throw e;
  }
  if (lama && lama.t === "file") try { DriveApp.getFileById(lama.fileId).setTrashed(true); } catch (_) {}
  catat(p.id, "mkp.unggah", { semester: smt, kode: kode, komp: c.k, t: entri.t });
  return aksiMkpDetail({ semester: smt, kode: kode }, token);
}

function aksiMkpHapus(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["dosen"]);
  var smt = semesterSah(d.semester), kode = teks(d.kode), c = kompMkp(String(d.komp || ""));
  if (!c || c.jenis === "metode") throw galat("Jenis isian tidak dikenal.");
  var x = ambilMkp(smt, kode, p, true), dibuang = null;
  ubahMkp(smt, kode, p, function (s) {
    if (c.jenis === "dok") {
      if (!s[c.k]) throw galat("Dokumen ini belum diunggah.");
      if (x.peran !== "utama") throw galat("Hanya pengampu utama yang bisa menghapus " + c.l + ".");
      dibuang = s[c.k]; delete s[c.k];
    } else {
      var i = -1; s[c.k].forEach(function (e, j) { if (e.id === String(d.id || "")) i = j; });
      if (i < 0) throw galat("Isian tidak ditemukan.");
      if (s[c.k][i].o !== p.id) throw galat("Hanya penulis/pengunggahnya yang bisa menghapus isian ini.");
      dibuang = s[c.k].splice(i, 1)[0];
    }
  });
  if (dibuang && dibuang.t === "file") try { DriveApp.getFileById(dibuang.fileId).setTrashed(true); } catch (_) {}
  catat(p.id, "mkp.hapus", { semester: smt, kode: kode, komp: c.k });
  return aksiMkpDetail({ semester: smt, kode: kode }, token);
}

function aksiMkpMetode(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["dosen"]);
  var smt = semesterSah(d.semester), kode = teks(d.kode), x = ambilMkp(smt, kode, p, true);
  if (x.peran !== "utama") throw galat("Metode pembelajaran diisi oleh pengampu utama.");
  var v = (Array.isArray(d.metode) ? d.metode : []).map(String).filter(function (m, i, a) { return METODE_MKP.indexOf(m) >= 0 && a.indexOf(m) === i; });
  var lain = potong(d.lain, 200).trim();
  ubahMkp(smt, kode, p, function (s) {
    if (!v.length && !lain) delete s.metode; else s.metode = { v: v, lain: lain, o: p.id, w: new Date().toISOString() };
  });
  catat(p.id, "mkp.metode", { semester: smt, kode: kode, n: v.length + (lain ? 1 : 0) });
  return aksiMkpDetail({ semester: smt, kode: kode }, token);
}

function aksiMkpInteg(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["dosen"]);
  var smt = semesterSah(d.semester), kode = teks(d.kode);
  ambilMkp(smt, kode, p, true);
  var t = potong(d.teks, 1000).trim();
  if (t.length < 15) throw galat("Tuliskan bentuk integrasinya (minimal 15 huruf), misalnya data penelitian apa yang dipakai mahasiswa.");
  ubahMkp(smt, kode, p, function (s) {
    if (s.integ.length >= MAKS_DAFTAR_MKP) throw galat("Maksimal " + MAKS_DAFTAR_MKP + " catatan integrasi per mata kuliah.");
    s.integ.push({ id: idAcak(), teks: t, o: p.id, w: new Date().toISOString() });
  });
  catat(p.id, "mkp.integ", { semester: smt, kode: kode });
  return aksiMkpDetail({ semester: smt, kode: kode }, token);
}

function aksiMkpLihat(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_MKP_REKAP.concat(["dosen"]));
  var smt = semesterSah(d.semester), kode = teks(d.kode), c = kompMkp(String(d.komp || ""));
  if (!c || (c.jenis !== "dok" && c.jenis !== "daftar")) throw galat("Jenis dokumen tidak dikenal.");
  ambilMkp(smt, kode, p, false);
  var r = semuaMkpSemester(smt)[kode], s = r ? r.isi : {}, e = c.jenis === "dok" ? s[c.k] : (s[c.k] || []).filter(function (y) { return y.id === String(d.id || ""); })[0];
  if (!e) throw galat("Dokumen ini belum diunggah.");
  if (e.t !== "file") return { t: e.t, url: e.url || "" };
  var b = DriveApp.getFileById(e.fileId).getBlob();
  return { t: "file", nama: e.nama, mime: e.mime, isi: Utilities.base64Encode(b.getBytes()) };
}

/** Pengingat: MK yang Anda ampu sebagai pengampu utama pada semester berjalan tetapi RPS-nya belum ada. */
function mkpBelumRps(p) {
  if (!punyaPeran(p, ["dosen"])) return [];
  var smt = semesterInfo().kode, isi = semuaMkpSemester(smt);
  return mkBertim(smt).filter(function (x) { return peranTim(x.anggota, p.id) === "utama" && !(isi[x.mk.kode] && isi[x.mk.kode].isi.rps); })
    .map(function (x) { return { kode: x.mk.kode, nama: x.mk.nama, semester: smt }; });
}
