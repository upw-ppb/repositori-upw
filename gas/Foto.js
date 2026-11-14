/**
 * Foto profil (v0.24.0). Semua akun boleh memasang, mengganti, atau menghapus foto profilnya sendiri.
 * Foto diperkecil di perangkat pengguna (JPEG persegi) lalu disimpan di sheet "FotoProfil" dalam dua ukuran:
 * "foto" (maks. 256 px, untuk Akun saya) dan "kecil" (64 px, untuk bilah samping dan Cari orang).
 * Tidak memakai Drive agar cepat dimuat; ukuran dibatasi agar muat di satu sel.
 */
var FOTO_MAKS = 48000, FOTO_KECIL_MAKS = 12000, FOTO_AMBIL_MAKS = 120;

function periksaFoto(v, maks, label) {
  v = teks(v);
  var m = /^data:image\/jpeg;base64,([A-Za-z0-9+\/=]+)$/.exec(v);
  if (!m) throw galat("Foto " + label + " tidak sah. Pilih ulang gambarnya.");
  if (v.length > maks) throw galat("Ukuran foto terlalu besar. Pilih gambar lain.");
  var b = Utilities.base64Decode(m[1]);
  if (!(b.length > 3 && (b[0] & 255) === 0xFF && (b[1] & 255) === 0xD8)) throw galat("Berkas bukan gambar JPEG.");
  return v;
}
function fotoMilik(userId) { return cari("FotoProfil", function (r) { return r.userId === userId && !r.dihapus; }); }

function aksiFotoSaya(d, token) {
  var p = penggunaDariToken(token), r = fotoMilik(p.id);
  return { foto: r ? teks(r.foto) : "", kecil: r ? teks(r.kecil) : "" };
}
function aksiFotoSimpan(d, token) {
  var p = penggunaDariToken(token);
  if (p.status !== "aktif") throw galat("Selesaikan aktivasi akun terlebih dahulu.");
  var foto = periksaFoto(d.foto, FOTO_MAKS, "profil"), kecil = periksaFoto(d.kecil, FOTO_KECIL_MAKS, "kecil");
  return kunciTulis(function () {
    var r = cari("FotoProfil", function (x) { return x.userId === p.id; }), o = { userId: p.id, foto: foto, kecil: kecil, waktu: new Date(), dihapus: "" };
    if (r) ubah("FotoProfil", r, o); else tambah("FotoProfil", o);
    catat(p.id, "foto.simpan", {});
    return { foto: foto, kecil: kecil };
  });
}
function aksiFotoHapus(d, token) {
  var p = penggunaDariToken(token);
  return kunciTulis(function () {
    var r = fotoMilik(p.id);
    if (r) { ubah("FotoProfil", r, { foto: "", kecil: "", dihapus: new Date() }); catat(p.id, "foto.hapus", {}); }
    return {};
  });
}
/** Foto kecil beberapa orang (untuk Cari orang). Semua akun yang boleh membuka Cari orang. */
function aksiFotoKecil(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SAH);
  var ids = (Array.isArray(d.ids) ? d.ids : []).slice(0, FOTO_AMBIL_MAKS).map(String), m = {}, hasil = {};
  ids.forEach(function (i) { m[i] = 1; });
  semua("FotoProfil").forEach(function (r) { if (m[r.userId] && !r.dihapus && r.kecil) hasil[r.userId] = teks(r.kecil); });
  return { foto: hasil };
}
