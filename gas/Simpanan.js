/**
 * v0.49.0: simpanan sementara hasil hitungan berat (Penilaian, Tabel iLKPS, Kesiapan) di CacheService, dipakai bersama semua pengguna.
 * Hasil dihitung ulang hanya bila data berubah: setiap penulisan tabel (kecuali Log, Sesi, Kode) menandai _berubah, lalu di akhir permintaan
 * "versiData" di cache diganti. Kunci simpanan memuat versiData dan tanggal hari ini, jadi data baru atau hari baru otomatis memakai hasil baru.
 * Batas CacheService: 100 KB per nilai → hasil dipecah per 90.000 karakter; masa simpan SIMPANAN_DETIK (jaring pengaman bila ada perubahan
 * yang tidak lewat Db.js, mis. Script Properties).
 */
var _berubah = false, SIMPANAN_DETIK = 900, POTONG_SIMPANAN = 90000;
var TABEL_TANPA_VERSI = { Log: 1, Sesi: 1, Kode: 1 };

function tandaiBerubah(nama) { if (!TABEL_TANPA_VERSI[nama]) _berubah = true; }
function versiData() {
  var c = CacheService.getScriptCache(), v = c.get("versiData");
  if (!v) { v = Utilities.getUuid().slice(0, 8); c.put("versiData", v, 21600); }
  return v;
}
/** Dipanggil di akhir setiap permintaan (doPost). */
function catatPerubahan() {
  if (!_berubah) return;
  _berubah = false;
  CacheService.getScriptCache().put("versiData", Utilities.getUuid().slice(0, 8), 21600);
}
/** Ambil hasil fn() dari simpanan bila ada; bila tidak, hitung lalu simpan. Permintaan yang sudah menulis data selalu menghitung ulang. */
function simpananJson(nama, fn) {
  if (_berubah) return fn();
  var c = CacheService.getScriptCache(), kunci = "sj:" + nama + ":" + versiData() + ":" + hariIni();
  try {
    var n = Number(c.get(kunci + ":n") || 0);
    if (n > 0) {
      var ks = []; for (var i = 0; i < n; i++) ks.push(kunci + ":" + i);
      var bag = c.getAll(ks), teks = "";
      for (var j = 0; j < n; j++) { if (bag[ks[j]] == null) { teks = null; break; } teks += bag[ks[j]]; }
      if (teks !== null) return JSON.parse(teks);
    }
  } catch (e) { console.error("Simpanan tidak terbaca", e); }
  var h = fn();
  try {
    var s = JSON.stringify(h), o = {}, m = Math.ceil(s.length / POTONG_SIMPANAN);
    if (m <= 50) {
      for (var k = 0; k < m; k++) o[kunci + ":" + k] = s.slice(k * POTONG_SIMPANAN, (k + 1) * POTONG_SIMPANAN);
      c.putAll(o, SIMPANAN_DETIK); c.put(kunci + ":n", String(m), SIMPANAN_DETIK);
    }
  } catch (e) { console.error("Simpanan tidak tersimpan", e); }
  return h;
}
