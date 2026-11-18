/**
 * Tindak lanjut (v0.31.0): daftar poin tindak lanjut yang bisa dilacak sampai tuntas (siklus PPEPP: pengendalian dan peningkatan).
 * Dasar instrumen (nomor Lampiran 1): 2 (PPEPP), 3 (IAB), 7 (evaluasi kurikulum), 22–23 (monev ditindaklanjuti), 25 (perbaikan berdasar monev penilaian),
 * 42/71 (analisis dan tindak lanjut kepuasan), 76–78 (pemantauan, evaluasi kinerja, kepuasan pemangku kepentingan yang ditindaklanjuti).
 * Status: belum → berjalan → selesai (wajib bukti) → terverifikasi (oleh KPS/GKM, bukan penanggung jawabnya sendiri). "Dikembalikan" = kembali ke berjalan dengan catatan.
 * Hak: KPS, GKM, Admin Prodi, Super Admin mengelola dan melihat semua; penanggung jawab melihat dan memperbarui poin miliknya;
 *      asesor melihat poin terverifikasi (baca saja).
 */
var PERAN_TL_KELOLA = ["kps", "gkm", "admin", "superadmin"];
var PERAN_TL_VERIF = ["kps", "gkm"];
var STATUS_TL = { belum: "Belum dikerjakan", berjalan: "Sedang berjalan", selesai: "Selesai, menunggu verifikasi", terverifikasi: "Terverifikasi" };
var SUMBER_TL = { gkm: "Temuan/rekomendasi GKM", rapat: "Keputusan rapat", survei: "Hasil survei kepuasan", penilaian: "Butir Penilaian yang lemah", audit: "Audit mutu internal", lain: "Lainnya" };
var EKS_TL = ["pdf", "jpg", "jpeg", "png", "docx", "xlsx"], BUKTI_TL_MAKS = 10 * 1024 * 1024;

function tlDari(r) {
  return { _r: r, id: r.id, uraian: teks(r.uraian), butir: jsonDari(r.butir, []), sumber: teks(r.sumber) || "lain", sumberRef: teks(r.sumberRef),
    pj: teks(r.pj), tenggat: teksTgl(r.tenggat), status: teks(r.status) || "belum", bukti: jsonDari(r.bukti, null), catatan: teks(r.catatan),
    riwayat: jsonDari(r.riwayat, []), oleh: teks(r.oleh), dibuat: r.dibuat ? new Date(r.dibuat).toISOString() : "", dihapus: r.dihapus };
}
function semuaTl() { return semua("TindakLanjut").filter(function (r) { return !r.dihapus; }).map(tlDari); }
function ambilTl(id) {
  var r = cari("TindakLanjut", function (x) { return x.id === String(id || "") && !x.dihapus; });
  if (!r) throw galat("Poin tindak lanjut tidak ditemukan.");
  return tlDari(r);
}
function tlTerlambat(t, kini) { return t.tenggat && (t.status === "belum" || t.status === "berjalan") && t.tenggat < (kini || hariIni()); }
function tlKeKlien(t, p, idx) {
  var o = idx.byId[t.pj], ol = idx.byId[t.oleh], b = t.bukti;
  return { id: t.id, uraian: t.uraian, butir: t.butir, sumber: t.sumber, sumberL: SUMBER_TL[t.sumber] || t.sumber, sumberRef: t.sumberRef,
    pj: t.pj, pjNama: o ? o.nama : "", tenggat: t.tenggat, status: t.status, statusL: STATUS_TL[t.status] || t.status, terlambat: !!tlTerlambat(t),
    bukti: b ? (b.t === "tautan" ? { t: "tautan", url: b.url, ket: b.ket || "" } : { t: "file", nama: b.nama, ukuran: b.ukuran, ket: b.ket || "" }) : null,
    catatan: t.catatan, oleh: ol ? ol.nama : "", dibuat: t.dibuat,
    riwayat: t.riwayat.map(function (h) { var x = idx.byId[h.o]; return { w: h.w, a: h.a, c: h.c || "", oleh: x ? x.nama : "" }; }),
    bolehUbah: punyaPeran(p, PERAN_TL_KELOLA) && t.status !== "terverifikasi",
    bolehKerjakan: (t.pj === p.id || punyaPeran(p, PERAN_TL_KELOLA)) && (t.status === "belum" || t.status === "berjalan"),
    bolehVerif: punyaPeran(p, PERAN_TL_VERIF) && t.status === "selesai" && t.pj !== p.id };
}
function bolehLihatTl(p, t) {
  if (punyaPeran(p, PERAN_TL_KELOLA)) return true;
  if (t.pj === p.id) return true;
  return punyaPeran(p, ["asesor"]) && t.status === "terverifikasi";
}
function bersihButir(v) {
  var sah = {}; MATRIKS.forEach(function (m) { sah[m.n] = 1; });
  var l = (Array.isArray(v) ? v : String(v || "").split(/[\s,;]+/)).map(Number).filter(function (n) { return sah[n]; });
  return l.filter(function (n, i) { return l.indexOf(n) === i; }).sort(function (a, b) { return a - b; }).slice(0, 10);
}
/** Ringkasan per butir untuk Penilaian dan tombol (i): { butir: { tuntas, terbuka } }. */
function ringkasTl() {
  var m = {};
  semuaTl().forEach(function (t) {
    t.butir.forEach(function (n) {
      var x = m[n] = m[n] || { tuntas: 0, terbuka: 0 };
      if (t.status === "terverifikasi") x.tuntas++; else x.terbuka++;
    });
  });
  return m;
}
/** Pengingat di Beranda (dipanggil dari aksiTugasSaya). */
function tugasTl(p) {
  var kini = hariIni(), l = semuaTl(), saya = l.filter(function (t) { return t.pj === p.id && (t.status === "belum" || t.status === "berjalan"); });
  return {
    tlSaya: saya.map(function (t) { return { id: t.id, uraian: t.uraian, tenggat: t.tenggat, status: t.status, terlambat: !!tlTerlambat(t, kini) }; }),
    tlVerif: punyaPeran(p, PERAN_TL_VERIF) ? l.filter(function (t) { return t.status === "selesai" && t.pj !== p.id; }).length : 0
  };
}
function catatRiwayatTl(t, p, a, c) { t.riwayat.push({ w: new Date().toISOString(), o: p.id, a: a, c: c || "" }); }
function simpanTl(t, perubahan) {
  var o = Object.assign({}, perubahan, { riwayat: JSON.stringify(t.riwayat), diubah: new Date() });
  ubah("TindakLanjut", t._r, o);
}

/* ---------- aksi ---------- */

function aksiTlDaftar(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SAH);
  var idx = indeksOrang(), kelola = punyaPeran(p, PERAN_TL_KELOLA);
  var l = semuaTl().filter(function (t) { return bolehLihatTl(p, t); }).map(function (t) { return tlKeKlien(t, p, idx); });
  var urut = { belum: 1, berjalan: 1, selesai: 0, terverifikasi: 2 };
  l.sort(function (a, b) { return (urut[a.status] - urut[b.status]) || String(a.tenggat || "9999").localeCompare(String(b.tenggat || "9999")) || b.dibuat.localeCompare(a.dibuat); });
  return { tl: l, kelola: kelola, bolehVerif: punyaPeran(p, PERAN_TL_VERIF), status: STATUS_TL, sumber: SUMBER_TL,
    pegawai: kelola ? idx.pegawai.map(function (o) { return { id: o.id, nama: o.nama, jenis: o.jenis }; }) : [],
    butir: MATRIKS.map(function (m) { return { n: m.n, nm: m.nm }; }), hariIni: hariIni() };
}
/** Buat atau ubah poin: d.data = { id?, uraian, butir[], sumber, sumberRef, pj, tenggat }. */
function aksiTlSimpan(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_TL_KELOLA);
  var x = d.data || {}, idx = indeksOrang();
  var o = { uraian: potong(x.uraian, 1500).trim(), butir: bersihButir(x.butir), sumber: SUMBER_TL[x.sumber] ? x.sumber : "lain", sumberRef: potong(x.sumberRef, 100),
    pj: teks(x.pj), tenggat: teks(x.tenggat).trim() };
  if (o.uraian.length < 5) throw galat("Tulis uraian tindak lanjut (minimal 5 huruf).");
  if (!o.pj || !idx.byId[o.pj] || idx.byId[o.pj].jenis === "mahasiswa" || idx.byId[o.pj].jenis === "lain") throw galat("Pilih penanggung jawab (dosen atau tendik).");
  if (o.tenggat && !tanggalSah(o.tenggat)) throw galat("Tenggat tidak valid (YYYY-MM-DD).");
  return kunciTulis(function () {
    var kini = new Date();
    if (x.id) {
      var t = ambilTl(x.id);
      if (t.status === "terverifikasi") throw galat("Poin yang sudah terverifikasi tidak bisa diubah.");
      catatRiwayatTl(t, p, "ubah", t.pj !== o.pj ? "Penanggung jawab diganti" : "");
      simpanTl(t, { uraian: o.uraian, butir: JSON.stringify(o.butir), sumber: o.sumber, sumberRef: o.sumberRef, pj: o.pj, tenggat: o.tenggat });
      catat(p.id, "tl.ubah", { id: t.id });
      return { id: t.id };
    }
    var id = "tl" + acak(10);
    tambah("TindakLanjut", { id: id, uraian: o.uraian, butir: JSON.stringify(o.butir), sumber: o.sumber, sumberRef: o.sumberRef, pj: o.pj, tenggat: o.tenggat,
      status: "belum", bukti: "", catatan: "", riwayat: JSON.stringify([{ w: kini.toISOString(), o: p.id, a: "buat", c: "" }]), oleh: p.id, dibuat: kini, diubah: kini, dihapus: "" });
    catat(p.id, "tl.buat", { id: id, sumber: o.sumber });
    return { id: id };
  });
}
/** Penanggung jawab (atau pengelola) memperbarui status: berjalan, atau selesai dengan bukti (berkas/tautan) dan keterangan. */
function aksiTlStatus(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SAH);
  var ke = String(d.status || ""), ket = potong(d.keterangan, 1000).trim();
  if (["berjalan", "selesai"].indexOf(ke) < 0) throw galat("Status tidak dikenal.");
  var t0 = ambilTl(d.id);
  if (!(t0.pj === p.id || punyaPeran(p, PERAN_TL_KELOLA))) throw galat("Anda tidak memiliki izin untuk tindakan ini.");
  if (t0.status !== "belum" && t0.status !== "berjalan") throw galat("Poin ini sudah " + (STATUS_TL[t0.status] || t0.status).toLowerCase() + ".");
  var bukti = null, file = null;
  if (ke === "selesai") {
    if (ket.length < 5) throw galat("Tuliskan apa yang sudah dilakukan (minimal 5 huruf).");
    if (d.tautan) {
      var url = teks(d.tautan).trim();
      if (!/^https:\/\/[^\s<>"]+$/.test(url) || url.length > 500) throw galat("Tautan bukti harus diawali https:// dan tanpa spasi.");
      bukti = { t: "tautan", url: url, ket: ket };
    } else if (d.berkas && d.berkas.isi) {
      var nama = namaAman(d.berkas.nama), eks = (nama.split(".").pop() || "").toLowerCase();
      if (EKS_TL.indexOf(eks) < 0) throw galat("Bukti berupa PDF, gambar (JPG/PNG), Word, atau Excel.");
      var bytes = Utilities.base64Decode(teks(d.berkas.isi));
      if (bytes.length > BUKTI_TL_MAKS) throw galat("Bukti maksimal 10 MB. Untuk berkas besar, pakai tautan Google Drive.");
      if (!isiSesuai(eks, bytes)) throw galat("Isi berkas tidak sesuai dengan jenisnya (." + eks + ").");
      file = folderAnak(DriveApp.getFolderById(prop("FOLDER_ID")), "Tindak Lanjut").createFile(Utilities.newBlob(bytes, BUKTI_EKS[eks], t0.id + " - " + nama));
      bukti = { t: "file", fileId: file.getId(), nama: nama, mime: BUKTI_EKS[eks], ukuran: bytes.length, ket: ket };
    } else throw galat("Lampirkan bukti penyelesaian (berkas atau tautan).");
  }
  try {
    return kunciTulis(function () {
      var t = ambilTl(t0.id);
      if (t.status !== t0.status) throw galat("Poin ini baru saja diubah orang lain. Muat ulang.");
      catatRiwayatTl(t, p, ke, ket);
      var o = { status: ke };
      if (bukti) { o.bukti = JSON.stringify(bukti); if (t.bukti && t.bukti.t === "file") try { DriveApp.getFileById(t.bukti.fileId).setTrashed(true); } catch (e) {} }
      simpanTl(t, o);
      catat(p.id, "tl.status", { id: t.id, ke: ke });
      return {};
    });
  } catch (e) { if (file) try { file.setTrashed(true); } catch (_) {} throw e; }
}
/** KPS/GKM memverifikasi poin selesai, atau mengembalikannya (berjalan) dengan catatan. Penanggung jawab tidak memverifikasi miliknya. */
function aksiTlVerifikasi(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_TL_VERIF);
  var setuju = d.setuju === true, cat = potong(d.catatan, 1000).trim();
  if (!setuju && cat.length < 5) throw galat("Tulis alasan pengembalian (minimal 5 huruf).");
  return kunciTulis(function () {
    var t = ambilTl(d.id);
    if (t.status !== "selesai") throw galat("Hanya poin berstatus selesai yang bisa diverifikasi.");
    if (t.pj === p.id) throw galat("Penanggung jawab tidak dapat memverifikasi tindak lanjutnya sendiri.");
    catatRiwayatTl(t, p, setuju ? "terverifikasi" : "dikembalikan", cat);
    simpanTl(t, { status: setuju ? "terverifikasi" : "berjalan", catatan: cat });
    catat(p.id, "tl.verifikasi", { id: t.id, setuju: setuju });
    return {};
  });
}
function aksiTlHapus(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_TL_KELOLA);
  return kunciTulis(function () {
    var t = ambilTl(d.id);
    if (t.status === "terverifikasi" && !punyaPeran(p, ["superadmin"])) throw galat("Poin terverifikasi hanya bisa dihapus Super Admin.");
    catatRiwayatTl(t, p, "hapus", "");
    simpanTl(t, { dihapus: new Date() });
    catat(p.id, "tl.hapus", { id: t.id });
    return {};
  });
}
function aksiTlBukti(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SAH.concat(["asesor"]));
  var t = ambilTl(d.id);
  if (!bolehLihatTl(p, t)) throw galat("Anda tidak memiliki izin untuk melihat bukti ini.");
  if (!t.bukti || t.bukti.t !== "file") throw galat("Bukti tidak ditemukan.");
  if (punyaPeran(p, ["asesor"]) && typeof catatAsesor === "function") catatAsesor(p, "tl.bukti", { id: t.id });
  return { nama: t.bukti.nama, mime: t.bukti.mime, isi: Utilities.base64Encode(DriveApp.getFileById(t.bukti.fileId).getBlob().getBytes()) };
}
