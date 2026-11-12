/**
 * Bukti kegiatan bersama, batas pelengkapan (hari kerja), verifikasi data, dan pengingat di aplikasi (v0.4.0).
 *
 * Bukti disimpan per slot di kolom "bukti" (JSON): { slot: { t: "file"|"tautan"|"ket", fileId, nama, mime, ukuran, url, ket, o, w } }.
 *   Satu slot cukup diunggah SEKALI oleh anggota mana pun, lalu terkunci; hanya pengunggahnya yang bisa membatalkan.
 *   File ada di Drive: Repositori UPW / Bukti / <semester> / <id kegiatan> <judul>. File tidak dibagikan; dibuka lewat aplikasi.
 * Alur data (kolom status): draf → diajukan → revisi → diajukan_ulang → disetujui | ditolak.
 *   Kegiatan bersurat tugas otomatis "diajukan" saat semua bukti wajib lengkap. Kegiatan tanpa surat diajukan dengan tombol.
 *   Verifikator: dosen pendamping (lomba mahasiswa), selain itu Admin Prodi / KPS / Super Admin. Pengaju tidak memverifikasi miliknya sendiri.
 */
var BUKTI_MAKS = 10 * 1024 * 1024;
var BUKTI_EKS = {
  pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
};
var JENIS_MITRA = ["praktik", "pkm", "kerjasama", "kepakaran", "mbkm"];
var PERAN_VERIFIKATOR = ["admin", "superadmin", "kps"];
var KEPUTUSAN_DATA = ["disetujui", "revisi", "ditolak"];

/* ---------- slot dan kelengkapan ---------- */

/** Daftar dokumen yang perlu dilengkapi. Bersurat tugas: daftar baku; tanpa surat: mengikuti jenis kegiatan. */
function slotBukti(k, idx) {
  var s = [];
  if (k.st === "terbit") {
    var L = k.lampiran || lampiranSurat(k, idx, pengaturanSurat()), nPeg = L.surat.dosen ? L.pegawai.length : 0, nMhs = L.mhs.length;
    s.push({ k: "st", l: "Surat tugas resmi dari bagian administrasi", h: "PDF surat tugas bernomor yang sudah ditandatangani" });
    if (nPeg) s.push({ k: "lapdosen", l: "Laporan penugasan dosen/tendik", h: "Laporan penugasan dari e-office beserta Bukti Persetujuan Laporan Penugasan" });
    if (nMhs) s.push({ k: "lapmhs", l: "Laporan kegiatan mahasiswa", h: "Laporan singkat: tujuan, pelaksanaan, hasil, dan refleksi" });
    s.push({ k: "hadir", l: "Daftar hadir peserta", h: "Daftar hadir bertanda tangan atau rekap kehadiran" });
    s.push({ k: "foto", l: "Dokumentasi foto/video", h: "Foto kegiatan, atau tautan Google Drive untuk album/video" });
    if (JENIS_MITRA.indexOf(k.jenis) >= 0) s.push({ k: "mitra", l: "MoU/MoA atau surat kesediaan mitra/lokasi", h: "Bukti kerja sama dengan lokasi atau mitra" });
    if (k.jenis.indexOf("prestasi") === 0) s.push({ k: "piagam", l: "Sertifikat atau piagam", h: "Bukti capaian lomba" });
    if (k.jenis === "kuliahtamu") s.push({ k: "materi", l: "Materi narasumber", h: "Bahan presentasi narasumber" });
  } else if (k.st === "tanpa") {
    var def = jenisDef(k.jenis), daftar = def && def.bukti.length ? def.bukti : ["Bukti kegiatan"];
    daftar.forEach(function (l, i) { s.push({ k: "b" + (i + 1), l: l, h: "" }); });
  } else return [];
  s.push({ k: "lain", l: "Dokumen pendukung lain (opsional)", h: "Contoh: luaran publikasi, berita di media, sertifikat narasumber", opsional: true });
  return s;
}
function statBukti(k, idx) {
  var s = slotBukti(k, idx), bk = k.bukti || {}, wajibS = s.filter(function (x) { return !x.opsional; });
  var ada = wajibS.filter(function (x) { return bk[x.k]; }).length;
  return { slot: s, ada: ada, perlu: wajibS.length, lengkap: wajibS.length > 0 && ada === wajibS.length };
}

/* ---------- hari kerja ---------- */

function tambahHariKerja(s, n, libur) {
  var d = new Date(s + "T12:00:00Z"), c = 0;
  while (c < n) {
    d.setUTCDate(d.getUTCDate() + 1);
    var w = d.getUTCDay(), iso = d.toISOString().slice(0, 10);
    if (w !== 0 && w !== 6 && libur.indexOf(iso) < 0) c++;
  }
  return d.toISOString().slice(0, 10);
}
function batasBukti(k, set) {
  var dasar = k.sampai || k.tgl;
  if (k.st !== "terbit" || !dasar || !tanggalSah(dasar)) return "";
  return tambahHariKerja(dasar, set.hk, set.libur);
}
function terlambatBukti(k, stat, batas, kini) { return k.st === "terbit" && k.status === "draf" && !stat.lengkap && !!batas && (kini || hariIni()) > batas; }

/* ---------- siapa boleh apa ---------- */

/** Anggota = pengaju dan peserta yang ditandai (bukan dosen pendamping). */
function anggota(k, p, idx) {
  if (k.olehId === p.id || k.pegawai.indexOf(p.id) >= 0) return true;
  return mhsPeserta(k, idx).some(function (m) { return m.id === p.id; });
}
function bisaUnggah(k, p, idx) {
  return (k.st === "terbit" || k.st === "tanpa") && (k.status === "draf" || k.status === "revisi") && anggota(k, p, idx);
}
function bisaVerifikasi(k, p) {
  if (k.status !== "diajukan" && k.status !== "diajukan_ulang") return false;
  if (k.olehId === p.id) return false;
  return k.pendampingId ? k.pendampingId === p.id : punyaPeran(p, PERAN_VERIFIKATOR);
}
function bisaAjukanData(k, p, idx, stat) {
  if (k.status !== "revisi" && !(k.status === "draf" && k.st === "tanpa")) return false;
  return (k.st === "terbit" || k.st === "tanpa") && anggota(k, p, idx) && stat.lengkap;
}
function bisaUbahAkreditasi(k, p) { return k.st === "terbit" && k.olehId === p.id && (k.status === "draf" || k.status === "revisi"); }

/** Informasi bukti untuk tampilan. */
function buktiKeKlien(k, p, idx, set, lengkap) {
  var st = statBukti(k, idx), batas = batasBukti(k, set), bk = k.bukti || {};
  var o = { buktiAda: st.ada, buktiPerlu: st.perlu, buktiLengkap: st.lengkap, batas: batas, terlambat: terlambatBukti(k, st, batas), hk: set.hk };
  if (!lengkap) return o;
  o.slot = st.slot.map(function (s) {
    var e = bk[s.k], x = { k: s.k, l: s.l, h: s.h, opsional: !!s.opsional };
    if (e) {
      var or = idx.byId[e.o];
      x.isi = { t: e.t, nama: e.nama || "", ukuran: e.ukuran || 0, url: e.url || "", ket: e.ket || "", oleh: or ? or.nama : "", w: e.w,
        milikSaya: e.o === p.id, bisaBatal: e.o === p.id && ["draf", "revisi", "diajukan", "diajukan_ulang"].indexOf(k.status) >= 0 };
    }
    return x;
  });
  o.bisaUnggah = bisaUnggah(k, p, idx);
  o.bisaVerifikasi = bisaVerifikasi(k, p);
  o.bisaAjukanData = bisaAjukanData(k, p, idx, st);
  o.bisaUbahAkreditasi = bisaUbahAkreditasi(k, p);
  o.verifikator = k.pendampingId ? "Dosen pendamping" : "Admin Prodi / KPS";
  var v = idx.byId[k.verifId];
  o.verifNama = v ? v.nama : "";
  o.tglVerif = k.tglVerif || "";
  return o;
}

/** Kegiatan lain yang buktinya terlambat milik pengaju/peserta pengajuan ini (untuk pertimbangan KPS). */
function tunggakanUntuk(k, semuaK, idx, set) {
  var orang = {};
  orang[k.olehId] = true;
  k.pegawai.forEach(function (id) { orang[id] = true; });
  mhsPeserta(k, idx).forEach(function (m) { orang[m.id] = true; });
  return semuaK.filter(function (x) {
    if (x.id === k.id || x.st !== "terbit" || x.status !== "draf") return false;
    var st = statBukti(x, idx), b = batasBukti(x, set);
    if (!terlambatBukti(x, st, b)) return false;
    if (orang[x.olehId] || x.pegawai.some(function (id) { return orang[id]; })) return true;
    return mhsPeserta(x, idx).some(function (m) { return orang[m.id]; });
  }).map(function (x) { return { id: x.id, judul: x.judul, batas: batasBukti(x, set) }; });
}

/* ---------- Drive ---------- */

function folderAnak(induk, nama) { var it = induk.getFoldersByName(nama); return it.hasNext() ? it.next() : induk.createFolder(nama); }
function folderBuktiKeg(k) {
  var induk = folderAnak(DriveApp.getFolderById(konfig().getProperty("FOLDER_ID")), "Bukti");
  var s = k.tgl && tanggalSah(k.tgl) ? semesterInfo(keTanggal(k.tgl)) : semesterInfo();
  var smt = folderAnak(induk, s.label.replace("/", "-"));
  return folderAnak(smt, k.id + " " + k.judul.replace(/[\\/:*?"<>|]/g, " ").slice(0, 60).trim());
}
function namaAman(n) { return teks(n).replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").replace(/\s+/g, " ").trim().slice(0, 120) || "berkas"; }
/** Cek tanda tangan awal berkas agar isi sesuai ekstensinya (mis. bukan halaman web yang diberi nama .pdf). */
function isiSesuai(eks, b) {
  var h = function (arr) { return arr.every(function (v, i) { return (b[i] & 255) === v; }); };
  if (eks === "pdf") return h([0x25, 0x50, 0x44, 0x46]);
  if (eks === "png") return h([0x89, 0x50, 0x4e, 0x47]);
  if (eks === "jpg" || eks === "jpeg") return h([0xff, 0xd8, 0xff]);
  if (eks === "webp") return h([0x52, 0x49, 0x46, 0x46]);
  if (/x$/.test(eks)) return h([0x50, 0x4b, 0x03, 0x04]);
  return h([0xd0, 0xcf, 0x11, 0xe0]); // doc, xls, ppt lama
}

/* ---------- aksi bukti ---------- */

function aksiBuktiUnggah(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_KEGIATAN);
  var id = String(d.id || ""), slot = String(d.slot || ""), entri, file = null;
  var awal = ambilKegiatan(id), idx = indeksOrang();
  periksaUnggah(awal, p, idx, slot);
  if (d.tautan !== undefined) {
    var url = teks(d.tautan).trim();
    if (!/^https:\/\/[^\s<>"]+$/.test(url) || url.length > 500) throw galat("Tautan harus diawali https:// dan tanpa spasi.");
    entri = { t: "tautan", url: url };
  } else if (d.ket !== undefined) {
    var ket = potong(d.ket, 300).trim();
    if (ket.length < 5) throw galat("Tulis alasan dokumen ini tidak tersedia (minimal 5 huruf).");
    entri = { t: "ket", ket: ket };
  } else {
    var nama = namaAman(d.nama), eks = (nama.split(".").pop() || "").toLowerCase(), mime = BUKTI_EKS[eks];
    if (nama.indexOf(".") < 0 || !mime) throw galat("Jenis file tidak didukung. Gunakan PDF, JPG, PNG, WEBP, Word, Excel, atau PowerPoint. Video: pakai tautan.");
    var isi = teks(d.isi);
    if (!isi || isi.length > Math.ceil(BUKTI_MAKS / 3) * 4 + 8) throw galat("Ukuran file maksimal 10 MB. Untuk file lebih besar, unggah ke Google Drive lalu pakai Tautan.");
    var bytes = Utilities.base64Decode(isi);
    if (bytes.length > BUKTI_MAKS) throw galat("Ukuran file maksimal 10 MB. Untuk file lebih besar, unggah ke Google Drive lalu pakai Tautan.");
    if (!isiSesuai(eks, bytes)) throw galat("Isi file tidak sesuai dengan jenisnya (." + eks + "). Simpan ulang file dari aplikasi aslinya, lalu coba lagi.");
    var label = slotBukti(awal, idx).filter(function (s) { return s.k === slot; })[0].l;
    file = folderBuktiKeg(awal).createFile(Utilities.newBlob(bytes, mime, namaAman(label.replace(/\s*\(opsional\)/, "") + " - " + nama)));
    entri = { t: "file", fileId: file.getId(), nama: nama, mime: mime, ukuran: bytes.length };
  }
  try {
    return kunciTulis(function () {
      var k = ambilKegiatan(id), ix = indeksOrang();
      periksaUnggah(k, p, ix, slot);
      var lbl = slotBukti(k, ix).filter(function (s) { return s.k === slot; })[0].l, otomatis = false;
      entri.o = p.id; entri.w = new Date().toISOString();
      k.bukti[slot] = entri;
      k.riwayat.push({ w: entri.w, o: p.id, a: "bukti", c: lbl });
      if (k.st === "terbit" && k.status === "draf" && statBukti(k, ix).lengkap) {
        k.status = "diajukan"; otomatis = true;
        k.riwayat.push({ w: new Date().toISOString(), o: p.id, a: "ajukan_data", c: "Otomatis: semua bukti wajib sudah lengkap." });
      }
      simpanKegiatan(k);
      catat(p.id, "bukti.unggah", { id: k.id, slot: slot, t: entri.t });
      return { otomatis: otomatis, kegiatan: kegiatanKeKlien(ambilKegiatan(k.id), p, ix, true) };
    });
  } catch (e) {
    if (file) try { file.setTrashed(true); } catch (_) {}
    throw e;
  }
}
function periksaUnggah(k, p, idx, slot) {
  if (!anggota(k, p, idx)) throw galat("Hanya pengaju dan peserta kegiatan yang bisa mengunggah bukti.");
  if (k.st !== "terbit" && k.st !== "tanpa") throw galat("Bukti diunggah setelah surat tugas terbit.");
  if (k.status !== "draf" && k.status !== "revisi") throw galat("Bukti tidak bisa diubah pada tahap ini (" + k.status + ").");
  if (!slotBukti(k, idx).some(function (s) { return s.k === slot; })) throw galat("Jenis dokumen tidak dikenal.");
  var e = k.bukti[slot];
  if (e) { var o = idx.byId[e.o]; throw galat("Dokumen ini sudah diunggah oleh " + (o ? o.nama : "anggota lain") + ". Anda tidak perlu mengunggah lagi."); }
}

function aksiBuktiBatal(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_KEGIATAN);
  return kunciTulis(function () {
    var k = ambilKegiatan(String(d.id || "")), slot = String(d.slot || ""), e = k.bukti[slot], idx = indeksOrang();
    if (!e) throw galat("Dokumen ini belum diunggah.");
    if (e.o !== p.id) throw galat("Hanya pengunggah yang bisa membatalkan dokumen ini.");
    if (["draf", "revisi", "diajukan", "diajukan_ulang"].indexOf(k.status) < 0) throw galat("Data sudah diverifikasi; bukti tidak bisa dibatalkan.");
    var s = slotBukti(k, idx).filter(function (x) { return x.k === slot; })[0];
    delete k.bukti[slot];
    if (e.t === "file") try { DriveApp.getFileById(e.fileId).setTrashed(true); } catch (_) {}
    if (k.status === "diajukan") k.status = "draf";
    if (k.status === "diajukan_ulang") k.status = "revisi";
    k.riwayat.push({ w: new Date().toISOString(), o: p.id, a: "bukti_batal", c: s ? s.l : slot });
    simpanKegiatan(k);
    catat(p.id, "bukti.batal", { id: k.id, slot: slot });
    return { kegiatan: kegiatanKeKlien(ambilKegiatan(k.id), p, idx, true) };
  });
}

function aksiBuktiLihat(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_KEGIATAN.concat(["asesor"]));
  var k = ambilKegiatan(String(d.id || "")), idx = indeksOrang(), e = k.bukti[String(d.slot || "")];
  if (!terlibat(k, p, idx) && !boleLihatSemua(p) && !asesorBolehLihat(p, k)) throw galat("Anda tidak memiliki izin untuk melihat bukti ini.");
  catatAsesor(p, "lihatBukti", { id: k.id, slot: String(d.slot || "") });
  if (!e) throw galat("Dokumen ini belum diunggah.");
  if (e.t !== "file") return { t: e.t, url: e.url || "", ket: e.ket || "" };
  var b = DriveApp.getFileById(e.fileId).getBlob();
  return { t: "file", nama: e.nama, mime: e.mime, isi: Utilities.base64Encode(b.getBytes()) };
}

/* ---------- aksi data akreditasi & verifikasi ---------- */

/** Pengaju melengkapi isian akreditasi setelah surat terbit (tingkat, isian jenis, pasal GCET). Isi surat tidak berubah. */
function aksiKegiatanAkreditasi(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_KEGIATAN);
  return kunciTulis(function () {
    var k = ambilKegiatan(String(d.id || "")), idx = indeksOrang();
    if (!bisaUbahAkreditasi(k, p)) throw galat("Data ini tidak bisa diubah pada tahap sekarang.");
    var b = bersihkanAkreditasi(d.data || {}, jenisDef(k.jenis));
    if (!b.tingkat) throw galat("Pilih tingkat kegiatan.");
    k.tingkat = b.tingkat; k.isian = b.isian; k.gcet = b.gcet;
    k.riwayat.push({ w: new Date().toISOString(), o: p.id, a: "akreditasi" });
    simpanKegiatan(k);
    catat(p.id, "kegiatan.akreditasi", { id: k.id });
    return { kegiatan: kegiatanKeKlien(ambilKegiatan(k.id), p, idx, true) };
  });
}

function aksiKegiatanAjukanData(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_KEGIATAN);
  return kunciTulis(function () {
    var k = ambilKegiatan(String(d.id || "")), idx = indeksOrang(), st = statBukti(k, idx);
    if (!anggota(k, p, idx)) throw galat("Hanya pengaju dan peserta kegiatan yang bisa mengajukan.");
    if (!st.lengkap) throw galat("Lengkapi dulu semua bukti wajib (" + st.ada + " dari " + st.perlu + " sudah ada).");
    if (!bisaAjukanData(k, p, idx, st)) throw galat("Kegiatan ini tidak bisa diajukan pada tahap sekarang.");
    var ulang = k.status === "revisi";
    k.status = ulang ? "diajukan_ulang" : "diajukan";
    k.riwayat.push({ w: new Date().toISOString(), o: p.id, a: ulang ? "ajukan_ulang_data" : "ajukan_data" });
    simpanKegiatan(k);
    catat(p.id, "kegiatan.ajukanData", { id: k.id, status: k.status });
    return { kegiatan: kegiatanKeKlien(ambilKegiatan(k.id), p, idx, true) };
  });
}

function aksiVerifikasiAntrean(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_KEGIATAN);
  var idx = indeksOrang();
  var set = pengaturanSurat(), l = semuaKegiatan().filter(function (k) { return bisaVerifikasi(k, p); });
  l.sort(function (a, b) { return new Date(a.diubah || 0) - new Date(b.diubah || 0); });
  return { kegiatan: l.map(function (k) { return kegiatanKeKlien(k, p, idx, false, set); }) };
}

function aksiVerifikasiPutuskan(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_KEGIATAN);
  var kep = String(d.keputusan || ""), cat = potong(d.catatan, 1000).trim();
  if (KEPUTUSAN_DATA.indexOf(kep) < 0) throw galat("Keputusan tidak dikenal.");
  if (kep !== "disetujui" && !cat) throw galat("Tulis catatan untuk pengunggah (wajib bila meminta revisi atau menolak).");
  return kunciTulis(function () {
    var k = ambilKegiatan(String(d.id || "")), idx = indeksOrang();
    if (!bisaVerifikasi(k, p)) {
      if (k.olehId === p.id) throw galat("Anda tidak bisa memverifikasi kegiatan yang Anda ajukan sendiri.");
      if (k.status !== "diajukan" && k.status !== "diajukan_ulang") throw galat("Data ini sudah diverifikasi atau belum diajukan.");
      throw galat(k.pendampingId ? "Kegiatan ini diverifikasi oleh dosen pendamping yang dipilih mahasiswa." : "Anda tidak memiliki izin untuk memverifikasi kegiatan ini.");
    }
    k.status = kep; k.verifId = p.id; k.tglVerif = new Date().toISOString();
    k.riwayat.push({ w: k.tglVerif, o: p.id, a: kep, c: cat });
    simpanKegiatan(k);
    catat(p.id, "verifikasi.putuskan", { id: k.id, keputusan: kep });
    return { kegiatan: kegiatanKeKlien(ambilKegiatan(k.id), p, idx, true) };
  });
}

/* ---------- pengingat di aplikasi ---------- */

/** Daftar hal yang perlu ditindaklanjuti pengguna (dihitung saat diminta; tanpa email). */
function aksiTugasSaya(d, token) {
  var p = penggunaDariToken(token);
  var hasil = { tugas: [], verifikasi: 0, kps: 0 };
  if (!punyaPeran(p, PERAN_KEGIATAN)) return hasil;
  var idx = indeksOrang(), set = pengaturanSurat(), kini = hariIni();
  semuaKegiatan().forEach(function (k) {
    var ag = anggota(k, p, idx);
    if (ag && k.st === "terbit" && k.status === "draf") {
      var st = statBukti(k, idx), b = batasBukti(k, set);
      if (!st.lengkap) hasil.tugas.push({ jenis: "bukti", id: k.id, judul: k.judul, batas: b, terlambat: terlambatBukti(k, st, b, kini), ada: st.ada, perlu: st.perlu });
    }
    if (ag && k.status === "revisi") {
      var r = k.riwayat.filter(function (x) { return x.a === "revisi"; }).pop();
      hasil.tugas.push({ jenis: "revisiData", id: k.id, judul: k.judul, catatan: r ? r.c : "" });
    }
    if (k.olehId === p.id && (k.st === "revisi_aju" || k.st === "ditunda")) {
      var r2 = k.riwayat.filter(function (x) { return x.a === k.st; }).pop();
      hasil.tugas.push({ jenis: "revisiAju", id: k.id, judul: k.judul, catatan: r2 ? r2.c : "", st: k.st });
    }
    if (k.olehId === p.id && k.st === "tanpa" && k.status === "draf") {
      var s2 = statBukti(k, idx);
      hasil.tugas.push({ jenis: "drafData", id: k.id, judul: k.judul, ada: s2.ada, perlu: s2.perlu });
    }
    if (bisaVerifikasi(k, p)) hasil.verifikasi++;
    if (k.st === "menunggu_kps" && punyaPeran(p, ["kps"])) hasil.kps++;
  });
  if (punyaPeran(p, ["kps"])) hasil.ttd = !!ttdAktif(p.id);
  // Butir DED yang menjadi tanggung jawab akun ini (v0.13.0)
  var nar = narasiSemua(), ded = Object.keys(nar).filter(function (k) { return nar[k].pj === p.id; });
  hasil.mkpBelumRps = mkpBelumRps(p); // v0.14.0
  hasil.dedPj = ded.length; hasil.dedBelum = ded.filter(function (k) { return nar[k].status !== "selesai"; }).length;
  var urut = { bukti: 0, revisiData: 1, revisiAju: 2, drafData: 3 };
  hasil.tugas.sort(function (a, b) { return (b.terlambat ? 1 : 0) - (a.terlambat ? 1 : 0) || urut[a.jenis] - urut[b.jenis] || String(a.batas || "").localeCompare(String(b.batas || "")); });
  return hasil;
}
