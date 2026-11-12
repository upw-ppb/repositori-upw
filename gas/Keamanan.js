/**
 * Kata sandi, token sesi, dan kode verifikasi.
 * Kata sandi tidak pernah disimpan sebagai teks: hanya hash HMAC-SHA256 berulang dengan garam per pengguna
 * dan "merica" rahasia server (Script Properties, tidak ada di repositori).
 */
var ITERASI_HASH = 1500;
var SESI_HARI = 7;
var BATAS_GAGAL = 5;
var KUNCI_MENIT = 15;
var KODE_MENIT = 15;
var MAKS_PERCOBAAN_KODE = 5;
var MASA_SANDI_AWAL_HARI = 30;

function merica() {
  var m = konfig().getProperty("MERICA");
  if (!m) throw new Error("MERICA belum diatur");
  return m;
}

function b64(bytes) { return Utilities.base64EncodeWebSafe(bytes); }
function acak(n) {
  var s = "";
  while (s.length < n) s += Utilities.getUuid().replace(/-/g, "");
  return s.slice(0, n);
}

function hashSandi(sandi, garam) {
  var kunci = garam + merica(), kunciB = Utilities.newBlob(kunci).getBytes();
  var h = Utilities.computeHmacSha256Signature(String(sandi), kunci);
  for (var i = 0; i < ITERASI_HASH; i++) h = Utilities.computeHmacSha256Signature(h, kunciB);
  return b64(h);
}

function hashToken(token) { return b64(Utilities.computeHmacSha256Signature(String(token), merica())); }

function samaAman(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  var beda = 0;
  for (var i = 0; i < a.length; i++) beda |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return beda === 0;
}

/** Aturan kata sandi baru. */
function periksaSandiBaru(sandi, pengguna) {
  sandi = String(sandi || "");
  if (sandi.length < 8) throw galat("Kata sandi minimal 8 karakter.");
  if (!/[A-Za-z]/.test(sandi) || !/[0-9]/.test(sandi)) throw galat("Kata sandi harus memuat huruf dan angka.");
  if (pengguna && (sandi === String(pengguna.username) || sandi === String(pengguna.ref)))
    throw galat("Kata sandi tidak boleh sama dengan NIM/NIP Anda.");
}

/** Sesi */
function buatSesi(pengguna, perangkat) {
  var token = acak(48);
  var kini = new Date(), habis = new Date(kini.getTime() + SESI_HARI * 864e5);
  tambah("Sesi", { tokenHash: hashToken(token), userId: pengguna.id, dibuat: kini, kedaluwarsa: habis, perangkat: String(perangkat || "").slice(0, 120) });
  CacheService.getScriptCache().put("sesi:" + hashToken(token), pengguna.id, 21600);
  return token;
}

function penggunaDariToken(token, wajib) {
  if (!token) { if (wajib === false) return null; throw galat("Sesi berakhir. Silakan masuk lagi."); }
  var th = hashToken(token), cache = CacheService.getScriptCache();
  var uid = cache.get("sesi:" + th);
  if (!uid) {
    var s = cari("Sesi", function (x) { return x.tokenHash === th; });
    if (!s || new Date(s.kedaluwarsa) < new Date()) { if (wajib === false) return null; throw galat("Sesi berakhir. Silakan masuk lagi."); }
    uid = s.userId;
    cache.put("sesi:" + th, uid, 21600);
  }
  var p = cari("Pengguna", function (x) { return x.id === uid; });
  if (!p || p.status === "nonaktif") { if (wajib === false) return null; throw galat("Akun tidak aktif."); }
  if (asesorKedaluwarsa(p)) { if (wajib === false) return null; throw pesanAsesorBerakhir(p); }
  return p;
}

function hapusSesi(token) {
  var th = hashToken(token);
  CacheService.getScriptCache().remove("sesi:" + th);
  kunciTulis(function () {
    var s = cari("Sesi", function (x) { return x.tokenHash === th; });
    if (s) hapusBaris("Sesi", s);
  });
}

function hapusSemuaSesi(userId) {
  kunciTulis(function () {
    var l = semua("Sesi").filter(function (x) { return x.userId === userId; }).reverse();
    l.forEach(function (s) { CacheService.getScriptCache().remove("sesi:" + s.tokenHash); hapusBaris("Sesi", s); });
  });
}

/** Kode 6 digit untuk aktivasi email dan lupa kata sandi. */
function buatKode(userId, tujuan, email) {
  var kode = String(100000 + parseInt(Utilities.getUuid().replace(/-/g, "").slice(0, 12), 16) % 900000);
  kunciTulis(function () {
    semua("Kode").filter(function (x) { return x.userId === userId && x.tujuan === tujuan && !x.dipakai; }).reverse()
      .forEach(function (x) { hapusBaris("Kode", x); });
    tambah("Kode", { userId: userId, tujuan: tujuan, kodeHash: hashToken(kode + ":" + userId), email: email,
      kedaluwarsa: new Date(Date.now() + KODE_MENIT * 60000), percobaan: 0, dipakai: "" });
  });
  return kode;
}

function periksaKode(userId, tujuan, kode) {
  return kunciTulis(function () {
    var k = cari("Kode", function (x) { return x.userId === userId && x.tujuan === tujuan && !x.dipakai; });
    if (!k) throw galat("Kode tidak ditemukan. Minta kode baru.");
    if (new Date(k.kedaluwarsa) < new Date()) throw galat("Kode sudah kedaluwarsa. Minta kode baru.");
    if (Number(k.percobaan) >= MAKS_PERCOBAAN_KODE) throw galat("Terlalu banyak percobaan. Minta kode baru.");
    if (!samaAman(k.kodeHash, hashToken(String(kode).trim() + ":" + userId))) {
      ubah("Kode", k, { percobaan: Number(k.percobaan) + 1 });
      throw galat("Kode salah. Periksa email Anda dan coba lagi.");
    }
    ubah("Kode", k, { dipakai: new Date() });
    return k;
  });
}

function kirimEmailKode(email, nama, kode, tujuan) {
  var judul = tujuan === "reset" ? "Kode reset kata sandi Repositori UPW" : "Kode aktivasi akun Repositori UPW";
  var isi = "Halo " + nama + ",\n\nKode " + (tujuan === "reset" ? "reset kata sandi" : "aktivasi") + " Anda: " + kode +
    "\n\nKode berlaku " + KODE_MENIT + " menit. Jangan berikan kode ini kepada siapa pun." +
    "\nBila Anda tidak meminta kode ini, abaikan email ini.\n\nProdi Usaha Perjalanan Wisata\nPoliteknik Pariwisata Bali";
  MailApp.sendEmail({ to: email, subject: (modeUji() ? "[UJI COBA] " : "") + judul, body: isi, name: "Repositori UPW" });
}
