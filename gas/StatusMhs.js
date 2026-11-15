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
function aksiAdminRiwayatStatusMhs(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["superadmin", "admin"]);
  var idx = indeksOrang(), nama = function (id) { var o = idx.byId[id]; return o ? o.nama : ""; };
  var l = semua("RiwayatStatusMhs").filter(function (r) { return r.userId === String(d.userId || ""); }).map(function (r) {
    var b = jsonDari(r.bukti, null);
    return { id: r.id, dari: teks(r.dari), ke: teks(r.ke), tanggal: teksTgl(r.tanggal), alasan: teks(r.alasan), oleh: nama(r.oleh),
      waktu: r.waktu ? new Date(r.waktu).toISOString() : "", bukti: b ? (b.t === "tautan" ? { t: "tautan", url: b.url } : { t: "file", nama: b.nama, ukuran: b.ukuran }) : null };
  }).reverse(); // baris terbaru (paling bawah di sheet) lebih dulu
  return { riwayat: l, label: LABEL_STATUS_MHS };
}
function aksiAdminBuktiStatusMhs(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["superadmin", "admin"]);
  var r = cari("RiwayatStatusMhs", function (x) { return x.id === String(d.id || ""); }), b = r ? jsonDari(r.bukti, null) : null;
  if (!b || b.t !== "file") throw galat("Bukti tidak ditemukan.");
  return { nama: b.nama, mime: b.mime, isi: Utilities.base64Encode(DriveApp.getFileById(b.fileId).getBlob().getBytes()) };
}
