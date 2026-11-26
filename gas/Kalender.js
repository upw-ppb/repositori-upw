/**
 * v0.58.0: Kalender Akademik. Admin Prodi / Super Admin mengunggah PDF (atau gambar) kalender resmi Poltekpar; server menyimpannya di Drive
 * "Kalender Akademik" dan menjalankan OCR Google Drive (layanan lanjutan Drive v3: Files.create ke Google Dokumen dengan ocrLanguage), lalu
 * mengembalikan hasilnya sebagai PDF teks (getAs PDF; ekspor teks langsung tidak tersedia tanpa izin tambahan). Tampilan membaca teks itu
 * (UPW_PDF.teksPdf + UPW_KALENDER.baca), Admin memeriksa/mengubah tabel per minggu, lalu menyetujui → tampil di Beranda semua pengguna.
 * Satu berkas boleh berisi beberapa semester (satu baris tabel per semester, fileId sama).
 * Tanggal resmi dipakai: jadwal survei (minggu kuliah ke-n) dan hari libur (batas unggah bukti, hari kerja).
 */
var PERAN_KALENDER = ["admin", "superadmin"];
var KALENDER_MAKS = 10 * 1024 * 1024;
var KEG_KALENDER = ["", "HER REGISTRASI", "HER REGISTRASI / Perwalian (KRS)", "PSDP / Perwalian (KRS)", "Perwalian (KRS)", "KULIAH PERDANA", "KULIAH PERDANA / MATRIKULASI",
  "T/P", "UTS (T/P)", "KIMPA", "UAS (P)", "UAS (T)"];

function kalenderDari(r) {
  return { _r: r, semester: String(r.semester), fileId: teks(r.fileId), nama: teks(r.nama), mime: teks(r.mime), ukuran: Number(r.ukuran) || 0,
    baris: jsonDari(r.baris, []) || [], libur: jsonDari(r.libur, []) || [], status: teks(r.status) || "draf",
    olehUnggah: teks(r.olehUnggah), diunggah: r.diunggah ? new Date(r.diunggah).toISOString() : "",
    disetujuiOleh: teks(r.disetujuiOleh), disetujui: r.disetujui ? new Date(r.disetujui).toISOString() : "", riwayat: jsonDari(r.riwayat, []) || [] };
}
function semuaKalender() { return semua("KalenderAkademik").filter(function (r) { return /^\d{4}-[12]$/.test(String(r.semester)); }).map(kalenderDari); }
function kalenderTerbit(smt) { return semuaKalender().filter(function (k) { return k.semester === smt && k.status === "terbit"; })[0] || null; }
function rentangSmt(smt) { var a = Number(smt.slice(0, 4)); return /-1$/.test(smt) ? { awal: a + "-07-01", akhir: a + "-12-31" } : { awal: (a + 1) + "-01-01", akhir: (a + 1) + "-06-30" }; }

/** Senin minggu kuliah ke-n (akhir = Jumat). Minggu > nomor terakhir dihitung dari minggu terakhir + 7 hari per minggu. null bila tidak ada kalender terbit. */
function tglMingguKuliah(smt, n, akhir) {
  var k = kalenderTerbit(smt); if (!k) return null;
  var ber = k.baris.filter(function (b) { return Number(b.minggu) > 0; }).sort(function (a, b) { return Number(a.minggu) - Number(b.minggu); });
  if (!ber.length) return null;
  var r = ber.filter(function (b) { return Number(b.minggu) === n; })[0];
  if (r) return akhir ? r.sampai : r.mulai;
  var t = ber[ber.length - 1], m = tglGeser(t.mulai, 7 * (n - Number(t.minggu)));
  if (n < Number(ber[0].minggu)) m = tglGeser(ber[0].mulai, 7 * (n - Number(ber[0].minggu)));
  return akhir ? tglGeser(m, 4) : m;
}
/** Semua hari libur dari kalender yang sudah disetujui (YYYY-MM-DD), untuk hitungan hari kerja. */
function liburKalender() {
  var l = [];
  semuaKalender().forEach(function (k) { if (k.status === "terbit") k.libur.forEach(function (h) { if (tanggalSah(h.tgl) && l.indexOf(h.tgl) < 0) l.push(h.tgl); }); });
  return l;
}

function bersihBarisKalender(smt, baris) {
  var R = rentangSmt(smt), lalu = "";
  if (!Array.isArray(baris) || !baris.length) throw galat("Tabel kalender masih kosong.");
  if (baris.length > 40) throw galat("Tabel kalender terlalu panjang (maks. 40 minggu).");
  return baris.map(function (b, i) {
    var mulai = teks(b.mulai), sampai = teks(b.sampai) || (tanggalSah(mulai) ? tglGeser(mulai, 4) : "");
    if (!tanggalSah(mulai) || !tanggalSah(sampai) || sampai < mulai) throw galat("Baris " + (i + 1) + ": tanggal tidak valid.");
    if (sampai < tglGeser(R.awal, -7) || mulai > R.akhir) throw galat("Baris " + (i + 1) + ": tanggal di luar " + labelSmt(smt) + ".");
    if (mulai <= lalu) throw galat("Baris " + (i + 1) + ": urutan tanggal harus naik.");
    lalu = sampai;
    var mg = teks(b.minggu).trim(); if (mg !== "" && !(/^\d{1,2}$/.test(mg) && Number(mg) >= 1 && Number(mg) <= 20)) throw galat("Baris " + (i + 1) + ": minggu ke- diisi angka 1–20 atau dikosongkan.");
    return { mulai: mulai, sampai: sampai, minggu: mg === "" ? "" : Number(mg), keg: potong(b.keg, 60).trim(), ket: potong(b.ket, 400).trim() };
  });
}
function bersihLibur(smt, libur) {
  var R = rentangSmt(smt), o = [];
  (Array.isArray(libur) ? libur : []).slice(0, 80).forEach(function (h) {
    var t = teks(h && h.tgl); if (!tanggalSah(t) || t < tglGeser(R.awal, -7) || t > R.akhir) return;
    o.push({ tgl: t, l: potong(h.l, 120).trim() });
  });
  return o;
}

/* ---------- aksi ---------- */

/** Unggah PDF/gambar kalender → simpan di Drive, OCR. Hasil: {fileId, nama, ukuran, mime, ocr (base64 PDF teks) | ocrGalat}. */
function aksiKalenderUnggah(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_KALENDER);
  var b = d.berkas || {}, nama = namaAman(b.nama), eks = (nama.split(".").pop() || "").toLowerCase();
  if (["pdf", "jpg", "jpeg", "png"].indexOf(eks) < 0) throw galat("Kalender diunggah sebagai PDF atau gambar (JPG/PNG).");
  var bytes = Utilities.base64Decode(teks(b.isi));
  if (!bytes.length) throw galat("Berkas kosong.");
  if (bytes.length > KALENDER_MAKS) throw galat("Berkas maksimal 10 MB.");
  if (!isiSesuai(eks, bytes)) throw galat("Isi berkas tidak sesuai dengan jenisnya (." + eks + ").");
  var blob = Utilities.newBlob(bytes, BUKTI_EKS[eks], nama);
  var file = folderAnak(DriveApp.getFolderById(prop("FOLDER_ID")), "Kalender Akademik").createFile(blob);
  var h = { fileId: file.getId(), nama: nama, ukuran: bytes.length, mime: BUKTI_EKS[eks] };
  try {
    var doc = Drive.Files.create({ name: "OCR sementara - " + nama, mimeType: "application/vnd.google-apps.document" }, blob, { ocrLanguage: "id" });
    try { h.ocr = Utilities.base64Encode(DriveApp.getFileById(doc.id).getAs("application/pdf").getBytes()); }
    finally { try { DriveApp.getFileById(doc.id).setTrashed(true); } catch (e) {} }
  } catch (e) { h.ocrGalat = "Tanggal tidak bisa dibaca otomatis (" + String(e && e.message || e).slice(0, 160) + "). Isi tabelnya secara manual."; }
  kunciTulis(function () {
    var l = jsonDari(pengaturan("kalenderUnggahan", ""), []) || [];
    l.push({ fileId: h.fileId, nama: nama, ukuran: h.ukuran, mime: h.mime, oleh: p.id, w: new Date().toISOString() });
    simpanPengaturan("kalenderUnggahan", l.slice(-30), "Berkas kalender akademik yang diunggah (belum/sudah dipakai)");
  });
  catat(p.id, "kalender.unggah", { fileId: h.fileId, ocr: !!h.ocr });
  return h;
}
/** Simpan tabel satu semester (draf), atau setujui (terbit). d = {semester, fileId, baris[], libur[], setujui} */
function aksiKalenderSimpan(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_KALENDER);
  var smt = teks(d.semester);
  if (!/^\d{4}-[12]$/.test(smt)) throw galat("Semester tidak valid.");
  var baris = bersihBarisKalender(smt, d.baris), libur = bersihLibur(smt, d.libur), fid = teks(d.fileId);
  return kunciTulis(function () {
    var r = cari("KalenderAkademik", function (x) { return String(x.semester) === smt; }), lama = r ? kalenderDari(r) : null;
    if (!fid && lama) fid = lama.fileId;   // ubah tabel tanpa mengganti berkas
    var unggah = (jsonDari(pengaturan("kalenderUnggahan", ""), []) || []).filter(function (x) { return x.fileId === fid; })[0];
    var adaLain = semuaKalender().filter(function (k) { return k.fileId === fid; })[0];
    if (!fid || (!unggah && !adaLain)) throw galat("Berkas kalender tidak ditemukan. Unggah ulang berkasnya.");
    var info = unggah || adaLain, kini = new Date();
    var o = { semester: smt, fileId: fid, nama: info.nama, mime: info.mime, ukuran: info.ukuran, baris: JSON.stringify(baris), libur: JSON.stringify(libur), diubah: kini };
    if (!lama || lama.fileId !== fid) { o.olehUnggah = info.oleh || p.id; o.diunggah = info.w ? new Date(info.w) : kini; }
    if (lama && lama.fileId && lama.fileId !== fid) o.riwayat = JSON.stringify(lama.riwayat.concat([{ fileId: lama.fileId, nama: lama.nama, w: lama.diunggah, status: lama.status }]).slice(-10));
    if (d.setujui) { o.status = "terbit"; o.disetujuiOleh = p.id; o.disetujui = kini; }
    else if (!lama || lama.fileId !== fid) o.status = "draf";
    if (o.baris.length > 45000) throw galat("Tabel kalender terlalu panjang.");
    if (r) ubah("KalenderAkademik", r, o); else tambah("KalenderAkademik", o);
    catat(p.id, d.setujui ? "kalender.setujui" : "kalender.simpan", { semester: smt });
    return aksiKalenderData({}, token);
  });
}
/** Tarik dari Beranda (kembali ke draf) atau hapus baris semester. */
function aksiKalenderUbahStatus(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_KALENDER);
  var smt = teks(d.semester);
  return kunciTulis(function () {
    var r = cari("KalenderAkademik", function (x) { return String(x.semester) === smt; });
    if (!r) throw galat("Kalender semester itu tidak ditemukan.");
    if (d.hapus) hapusBaris("KalenderAkademik", r); else ubah("KalenderAkademik", r, { status: "draf", diubah: new Date() });
    catat(p.id, d.hapus ? "kalender.hapus" : "kalender.tarik", { semester: smt });
    return aksiKalenderData({}, token);
  });
}
function kalenderKeKlien(k, idx) {
  var o = { semester: k.semester, label: labelSmt(k.semester), nama: k.nama, mime: k.mime, ukuran: k.ukuran, baris: k.baris, libur: k.libur, status: k.status,
    disetujui: k.disetujui, disetujuiOleh: idx[k.disetujuiOleh] || "", diunggah: k.diunggah };
  return o;
}
/** Untuk semua pengguna: kalender terbit semester berjalan dan berikutnya (+ minggu ini, agenda terdekat). Admin: semua semester termasuk draf. */
function aksiKalenderData(d, token) {
  var p = penggunaDariToken(token), kelola = punyaPeran(p, PERAN_KALENDER), s = semesterInfo(), kini = hariIni();
  var smtKini = kodeSmt(s.awal, s.ganjil), smtNext = s.ganjil ? kodeSmt(s.awal, false) : kodeSmt(s.awal + 1, true), smtLalu = s.ganjil ? kodeSmt(s.awal - 1, false) : kodeSmt(s.awal, true);
  var nama = {}; semua("Pengguna").forEach(function (u) { nama[u.id] = u.nama; });
  var L = semuaKalender().sort(function (a, b) { return a.semester < b.semester ? 1 : -1; });
  var tampil = L.filter(function (k) { return k.status === "terbit" && [smtLalu, smtKini, smtNext].indexOf(k.semester) >= 0; }).map(function (k) { return kalenderKeKlien(k, nama); });
  var h = { hariIni: kini, smtKini: smtKini, labelSmtKini: labelSmt(smtKini), smtNext: smtNext, kalender: tampil, bolehUbah: kelola };
  if (kelola) h.semua = L.slice(0, 12).map(function (k) { var o = kalenderKeKlien(k, nama); o.fileIdAda = !!k.fileId; return o; });
  return h;
}
function aksiKalenderLihat(d, token) {
  var p = penggunaDariToken(token), smt = teks(d.semester);
  var k = semuaKalender().filter(function (x) { return x.semester === smt; })[0];
  if (!k || (k.status !== "terbit" && !punyaPeran(p, PERAN_KALENDER))) throw galat("Kalender tidak ditemukan.");
  return { nama: k.nama, mime: k.mime, isi: Utilities.base64Encode(DriveApp.getFileById(k.fileId).getBlob().getBytes()) };
}
