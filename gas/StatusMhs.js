/**
 * Status mahasiswa dengan alasan dan bukti (v0.27.0).
 * Admin Prodi / Super Admin mengubah status (A aktif, C cuti, N non-aktif, L lulus, D drop out, K mengundurkan diri, M mutasi, W wafat)
 * untuk satu atau banyak mahasiswa sekaligus, dengan tanggal efektif, alasan (wajib), dan bukti opsional (file ke Drive "Status Mahasiswa",
 * atau tautan). Setiap perubahan tercatat di tabel RiwayatStatusMhs dan Log.
 */
var STATUS_MHS_MAKS = 300, BUKTI_STATUS_MAKS = 10 * 1024 * 1024;
var LABEL_STATUS_MHS = { A: "Aktif", C: "Cuti", N: "Non-aktif", L: "Lulus", D: "Drop out / dikeluarkan", K: "Mengundurkan diri / keluar", M: "Mutasi / pindah", W: "Wafat" };

function aksiAdminStatusMhs(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["superadmin", "admin"]);
  var ids = (Array.isArray(d.userIds) ? d.userIds : [d.userId]).map(String).filter(Boolean);
  var ke = String(d.statusMhs || "").toUpperCase(), tgl = teks(d.tanggal) || hariIni(), alasan = potong(d.alasan, 1000).trim();
  if (!ids.length) throw galat("Pilih mahasiswa yang statusnya akan diubah.");
  if (ids.length > STATUS_MHS_MAKS) throw galat("Maksimal " + STATUS_MHS_MAKS + " mahasiswa sekali ubah.");
  if (STATUS_MHS_SAH.indexOf(ke) < 0) throw galat("Status mahasiswa tidak dikenal.");
  if (!tanggalSah(tgl)) throw galat("Tanggal efektif tidak valid (YYYY-MM-DD).");
  if (alasan.length < 5) throw galat("Tulis alasan perubahan status (minimal 5 huruf), misalnya: lulus yudisium 20 Agustus 2026, SK No. …");
  var bukti = buktiStatusDari(d, ke);
  return kunciTulis(function () {
    var akun = {}; semua("Pengguna").forEach(function (x) { akun[x.id] = x; });
    var salah = ids.filter(function (i) { return !akun[i] || peranDari(akun[i]).indexOf("mahasiswa") < 0 || akunSistem(akun[i]); });
    if (salah.length) throw galat(salah.length + " akun bukan mahasiswa atau tidak ditemukan. Muat ulang daftar akun.");
    var kini = new Date(), baris = [], diubah = 0;
    ids.forEach(function (i) {
      var t = akun[i], dari = String(t.statusMhs || "A");
      if (dari === ke) return;
      ubah("Pengguna", t, { statusMhs: ke, diubahPada: kini });
      baris.push({ id: "s" + acak(10), userId: i, dari: dari, ke: ke, tanggal: tgl, alasan: alasan, bukti: bukti ? JSON.stringify(bukti) : "", oleh: p.id, waktu: kini });
      diubah++;
    });
    if (baris.length) tambahBanyak("RiwayatStatusMhs", baris);
    catat(p.id, "admin.statusMhs", { jumlah: diubah, ke: ke, tanggal: tgl });
    return { diubah: diubah, sama: ids.length - diubah };
  });
}
/** Bukti perubahan status: d.tautan (https) atau d.berkas {nama, isi base64} → simpan ke Drive "Status Mahasiswa". null bila tanpa bukti. */
function buktiStatusDari(d, ke) {
  var bukti = null;
  if (d.tautan) {
    var url = teks(d.tautan).trim();
    if (!/^https:\/\/[^\s<>"]+$/.test(url) || url.length > 500) throw galat("Tautan bukti harus diawali https:// dan tanpa spasi.");
    bukti = { t: "tautan", url: url };
  } else if (d.berkas && d.berkas.isi) {
    var nama = namaAman(d.berkas.nama), eks = (nama.split(".").pop() || "").toLowerCase();
    if (["pdf", "jpg", "jpeg", "png"].indexOf(eks) < 0) throw galat("Bukti berupa PDF atau gambar (JPG/PNG).");
    var bytes = Utilities.base64Decode(teks(d.berkas.isi));
    if (bytes.length > BUKTI_STATUS_MAKS) throw galat("Bukti maksimal 10 MB. Untuk berkas besar, pakai tautan Google Drive.");
    if (!isiSesuai(eks, bytes)) throw galat("Isi berkas tidak sesuai dengan jenisnya (." + eks + ").");
    var f = folderAnak(DriveApp.getFolderById(prop("FOLDER_ID")), "Status Mahasiswa").createFile(Utilities.newBlob(bytes, BUKTI_EKS[eks],
      Utilities.formatDate(new Date(), "Asia/Makassar", "yyyy-MM-dd") + " " + LABEL_STATUS_MHS[ke] + " - " + nama));
    bukti = { t: "file", fileId: f.getId(), nama: nama, mime: BUKTI_EKS[eks], ukuran: bytes.length };
  }
  return bukti;
}
function aksiAdminRiwayatStatusMhs(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["superadmin", "admin"]);
  var idx = indeksOrang(), nama = function (id) { var o = idx.byId[id]; return o ? o.nama : ""; };
  var l = semua("RiwayatStatusMhs").filter(function (r) { return r.userId === String(d.userId || ""); }).map(function (r) {
    var b = jsonDari(r.bukti, null);
    var ko = jsonDari(r.koreksi, []) || [];
    return { id: r.id, dari: teks(r.dari), ke: teks(r.ke), tanggal: teksTgl(r.tanggal), alasan: teks(r.alasan), oleh: nama(r.oleh),
      waktu: r.waktu ? new Date(r.waktu).toISOString() : "", bukti: b ? (b.t === "tautan" ? { t: "tautan", url: b.url } : { t: "file", nama: b.nama, ukuran: b.ukuran }) : null,
      // v0.37.0: riwayat koreksi + jumlah mahasiswa dalam perubahan yang sama
      koreksi: ko.map(function (k) { return { waktu: k.waktu, oleh: nama(k.oleh), alasan: k.alasan, ubah: k.ubah }; }), sebatch: kelompokStatus(r).length };
  }).reverse(); // baris terbaru (paling bawah di sheet) lebih dulu
  if (l.length) l[0].terakhir = true;
  return { riwayat: l, label: LABEL_STATUS_MHS };
}
function aksiAdminBuktiStatusMhs(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["superadmin", "admin"]);
  var r = cari("RiwayatStatusMhs", function (x) { return x.id === String(d.id || ""); }), b = r ? jsonDari(r.bukti, null) : null;
  if (!b || b.t !== "file") throw galat("Bukti tidak ditemukan.");
  return { nama: b.nama, mime: b.mime, isi: Utilities.base64Encode(DriveApp.getFileById(b.fileId).getBlob().getBytes()) };
}

/* ---------- v0.37.0: perbaikan (edit) riwayat status mahasiswa ----------
   Admin Prodi / Super Admin memperbaiki bukti, tanggal efektif, alasan, dan (khusus perubahan TERAKHIR mahasiswa itu) status tujuan.
   Alasan perbaikan wajib. Bisa diterapkan ke semua mahasiswa dalam perubahan yang sama (dibuat bersamaan: pelaku + waktu sama).
   Nilai sebelum/sesudah disimpan di kolom koreksi (JSON) dan dicatat di Log. File bukti lama yang tidak dipakai baris lain dipindah ke Sampah Drive. */
function kelompokStatus(r) {
  var w = r.waktu ? new Date(r.waktu).getTime() : 0;
  return semua("RiwayatStatusMhs").filter(function (x) { return x.oleh === r.oleh && (x.waktu ? new Date(x.waktu).getTime() : 0) === w; });
}
function aksiAdminStatusMhsKoreksi(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["superadmin", "admin"]);
  var alasanK = potong(d.alasanKoreksi, 500).trim();
  if (alasanK.length < 5) throw galat("Tulis alasan perbaikan (minimal 5 huruf), misalnya: salah unggah SK, diganti SK No. …");
  var tgl = teks(d.tanggal), alasan = potong(d.alasan, 1000).trim(), ke = d.ke ? String(d.ke).toUpperCase() : "", mode = String(d.buktiMode || "tetap");
  if (!tanggalSah(tgl)) throw galat("Tanggal efektif tidak valid (YYYY-MM-DD).");
  if (alasan.length < 5) throw galat("Alasan perubahan status minimal 5 huruf.");
  if (["tetap", "file", "tautan", "hapus"].indexOf(mode) < 0) throw galat("Pilihan bukti tidak dikenal.");
  var r0 = cari("RiwayatStatusMhs", function (x) { return x.id === String(d.id || ""); });
  if (!r0) throw galat("Riwayat status tidak ditemukan. Muat ulang halaman.");
  if (ke && STATUS_MHS_SAH.indexOf(ke) < 0) throw galat("Status mahasiswa tidak dikenal.");
  var buktiBaru = null;
  if (mode === "file") { if (!d.berkas || !d.berkas.isi) throw galat("Pilih file bukti pengganti."); buktiBaru = buktiStatusDari({ berkas: d.berkas }, ke || teks(r0.ke)); }
  if (mode === "tautan") { if (!d.tautan) throw galat("Isi tautan bukti pengganti."); buktiBaru = buktiStatusDari({ tautan: d.tautan }, ke || teks(r0.ke)); }
  return kunciTulis(function () {
    var r = cari("RiwayatStatusMhs", function (x) { return x.id === String(d.id || ""); });
    var milik = semua("RiwayatStatusMhs").filter(function (x) { return x.userId === r.userId; }), terakhir = milik[milik.length - 1] === r || milik[milik.length - 1].id === r.id;
    if (ke && ke !== teks(r.ke)) {
      if (!terakhir) throw galat("Status tujuan hanya bisa diperbaiki pada perubahan terakhir mahasiswa ini. Untuk riwayat lama, perbaiki bukti, tanggal, atau alasan saja.");
      if (ke === teks(r.dari)) throw galat("Status tujuan sama dengan status sebelumnya (" + LABEL_STATUS_MHS[ke] + "). Untuk membatalkan perubahan, buat perubahan status baru.");
    }
    var target = d.semuaBatch ? kelompokStatus(r) : [r];
    if (!target.some(function (x) { return x.id === r.id; })) target.push(r);
    var kini = new Date(), lamaFile = {}, n = 0, semuaUbah = {};
    target.forEach(function (x) {
      var sebelum = { tanggal: teksTgl(x.tanggal), alasan: teks(x.alasan), bukti: teks(x.bukti), ke: teks(x.ke) }, sesudah = { tanggal: tgl, alasan: alasan };
      if (mode === "hapus") sesudah.bukti = "";
      if (buktiBaru) sesudah.bukti = JSON.stringify(buktiBaru);
      if (x.id === r.id && ke && ke !== teks(r.ke)) sesudah.ke = ke;
      var ubahK = Object.keys(sesudah).filter(function (k) { return String(sesudah[k]) !== String(sebelum[k]); });
      if (!ubahK.length) return;
      ubahK.forEach(function (k) { semuaUbah[k] = 1; });
      if (ubahK.indexOf("bukti") >= 0) { var bl = jsonDari(x.bukti, null); if (bl && bl.t === "file") lamaFile[bl.fileId] = 1; }
      var ko = jsonDari(x.koreksi, []) || [];
      var sb = {}; ubahK.forEach(function (k) { sb[k] = sebelum[k]; });
      ko.push({ waktu: kini.toISOString(), oleh: p.id, alasan: alasanK, ubah: ubahK, sebelum: sb });
      var isi = { koreksi: JSON.stringify(ko) }; ubahK.forEach(function (k) { isi[k] = sesudah[k]; });
      ubah("RiwayatStatusMhs", x, isi);
      if (isi.ke) { var akun = cari("Pengguna", function (u) { return u.id === x.userId; }); if (akun) ubah("Pengguna", akun, { statusMhs: isi.ke, diubahPada: kini }); }
      n++;
    });
    if (!n) throw galat("Tidak ada yang berubah.");
    // File bukti lama: ke Sampah Drive bila tidak dipakai baris riwayat lain (bisa dipulihkan Super Admin ±30 hari).
    var dipakai = {}; semua("RiwayatStatusMhs").forEach(function (x) { var b = jsonDari(x.bukti, null); if (b && b.t === "file") dipakai[b.fileId] = 1; });
    var dibuang = 0;
    Object.keys(lamaFile).forEach(function (id) { if (dipakai[id]) return; try { DriveApp.getFileById(id).setTrashed(true); dibuang++; } catch (e) {} });
    catat(p.id, "admin.statusMhsKoreksi", { id: r.id, userId: r.userId, jumlah: n, ubah: Object.keys(semuaUbah).join(","),
      alasan: alasanK, fileDibuang: dibuang });
    return { diperbaiki: n, fileDibuang: dibuang };
  });
}
