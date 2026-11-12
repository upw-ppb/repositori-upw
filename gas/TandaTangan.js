/**
 * Tanda tangan KPS (v0.5.0).
 * - Dibuat/diunggah sendiri oleh pemilik akun berperan KPS, wajib dengan persetujuan; tidak ada aksi bagi Admin/Super Admin
 *   untuk melihat, mengganti, atau memakai tanda tangan orang lain.
 * - Gambar PNG disimpan TERSANDI di Drive: folder "Tanda Tangan", berkas ttd-<id>.bin (aliran HMAC-SHA256 dengan kunci di
 *   Script Properties KUNCI_TTD). Berkas di Drive tidak bisa dibuka langsung sebagai gambar.
 * - Saat KPS menyetujui surat, id tanda tangan aktifnya dicatat di lampiran surat (lampiran.ttd). Mengganti atau menghapus
 *   tanda tangan tidak mengubah surat lama; versi lama tetap disimpan agar surat lama tetap utuh.
 * - Tanda tangan selalu disertai pernyataan persetujuan elektronik, kode verifikasi, dan QR cek keaslian.
 */
var TTD_MAKS = 300 * 1024;

function kunciTtd() {
  var k = konfig().getProperty("KUNCI_TTD");
  if (!k) { k = acak(48); konfig().setProperty("KUNCI_TTD", k); }
  return k;
}
/** Sandi aliran: XOR dengan blok HMAC-SHA256(kunci, nonce:urutan). Fungsi yang sama untuk menyandikan dan membuka. */
function sandiTtd(bytes, nonce) {
  var kunci = kunciTtd(), out = new Array(bytes.length), blok = null;
  for (var i = 0; i < bytes.length; i++) {
    if (i % 32 === 0) blok = Utilities.computeHmacSha256Signature(nonce + ":" + (i / 32), kunci);
    out[i] = (((bytes[i] ^ blok[i % 32]) & 255) << 24) >> 24;
  }
  return out;
}
function folderTtd() { return folderAnak(DriveApp.getFolderById(konfig().getProperty("FOLDER_ID")), "Tanda Tangan"); }
function ttdAktif(userId) {
  var l = semua("TandaTangan").filter(function (r) { return r.userId === userId && !r.dihapus; });
  return l.length ? l[l.length - 1] : null;
}
function bacaTtd(r) {
  var b = DriveApp.getFileById(r.fileId).getBlob().getBytes();
  return "data:image/png;base64," + Utilities.base64Encode(sandiTtd(b, String(r.nonce)));
}

/** Untuk halaman Tanda Tangan Saya: gambar aktif + log pemakaian (surat yang memakai tanda tangan akun ini). */
function aksiTtdSaya(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["kps"]);
  var milik = semua("TandaTangan").filter(function (r) { return r.userId === p.id; }), ids = {};
  milik.forEach(function (r) { ids[r.id] = true; });
  var a = ttdAktif(p.id);
  var pakai = semuaKegiatan().filter(function (k) { return k.st === "terbit" && k.lampiran && k.lampiran.ttd && ids[k.lampiran.ttd]; })
    .map(function (k) { return { id: k.id, judul: k.judul, kode: k.kodeSurat, tgl: k.lampiran.tglSurat || "" }; })
    .sort(function (x, y) { return y.tgl.localeCompare(x.tgl); });
  return { ada: !!a, gambar: a ? bacaTtd(a) : "", cara: a ? teks(a.cara) : "", dibuat: a ? new Date(a.dibuat).toISOString() : "", pemakaian: pakai };
}

function aksiTtdSimpan(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["kps"]);
  if (d.setuju !== true) throw galat("Centang persetujuan pemakaian tanda tangan dulu.");
  var m = /^data:image\/png;base64,([A-Za-z0-9+\/=]+)$/.exec(teks(d.gambar));
  if (!m) throw galat("Gambar tanda tangan tidak terbaca. Coba lagi.");
  var bytes = Utilities.base64Decode(m[1]);
  if (bytes.length > TTD_MAKS) throw galat("Gambar tanda tangan terlalu besar (maks. 300 KB).");
  if (!isiSesuai("png", bytes)) throw galat("Gambar tanda tangan harus PNG.");
  var cara = d.cara === "unggah" ? "unggah" : "gambar";
  return kunciTulis(function () {
    var id = "t" + acak(10), nonce = acak(16);
    var f = folderTtd().createFile(Utilities.newBlob(sandiTtd(bytes, nonce), "application/octet-stream", "ttd-" + id + ".bin"));
    var lama = ttdAktif(p.id);
    if (lama) ubah("TandaTangan", lama, { dihapus: new Date() });
    tambah("TandaTangan", { id: id, userId: p.id, fileId: f.getId(), nonce: nonce, cara: cara, dibuat: new Date(), dihapus: "" });
    catat(p.id, "ttd.simpan", { id: id, cara: cara, ganti: !!lama });
    return aksiTtdSaya(d, token);
  });
}

function aksiTtdHapus(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["kps"]);
  return kunciTulis(function () {
    var a = ttdAktif(p.id);
    if (!a) throw galat("Belum ada tanda tangan tersimpan.");
    ubah("TandaTangan", a, { dihapus: new Date() }); // berkas tetap disimpan untuk surat yang sudah terbit
    catat(p.id, "ttd.hapus", { id: a.id });
    return aksiTtdSaya(d, token);
  });
}

/** Gambar tanda tangan pada surat terbit, untuk orang yang boleh melihat surat itu. */
function aksiSuratTtd(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_KEGIATAN);
  var k = ambilKegiatan(String(d.id || "")), idx = indeksOrang();
  if (!terlibat(k, p, idx) && !boleLihatSemua(p)) throw galat("Anda tidak memiliki izin untuk melihat surat ini.");
  if (k.st !== "terbit" || !k.lampiran || !k.lampiran.ttd) return { gambar: "" };
  var r = cari("TandaTangan", function (x) { return x.id === k.lampiran.ttd; });
  return { gambar: r ? bacaTtd(r) : "" };
}
