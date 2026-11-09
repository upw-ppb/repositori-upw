/**
 * Akun: masuk, aktivasi, lupa kata sandi, dan pengelolaan pengguna.
 * Peran: superadmin, admin, kps, kalab, laboran, dosen, tendik, mahasiswa, asesor (satu akun boleh beberapa peran).
 */
var PERAN_SAH = ["superadmin", "admin", "kps", "kalab", "laboran", "dosen", "tendik", "mahasiswa", "asesor"];

function peranDari(p) { return String(p.peran || "").split(",").map(function (x) { return x.trim(); }).filter(String); }
function punyaPeran(p, daftar) { var r = peranDari(p); return daftar.some(function (x) { return r.indexOf(x) >= 0; }); }
function wajibPeran(p, daftar) {
  if (p.status === "impor") throw galat("Selesaikan aktivasi akun terlebih dahulu.");
  if (p.wajibGanti === true || p.wajibGanti === "TRUE") throw galat("Ganti kata sandi Anda terlebih dahulu.");
  if (!punyaPeran(p, daftar)) throw galat("Anda tidak memiliki izin untuk tindakan ini.");
}

/** Data pengguna yang aman dikirim ke tampilan. */
function profilPublik(p) {
  return { id: p.id, username: String(p.username), nama: p.nama, email: p.email, peran: peranDari(p), status: p.status,
    wajibGanti: p.wajibGanti === true || p.wajibGanti === "TRUE", emailTerverifikasi: p.emailTerverifikasi === true || p.emailTerverifikasi === "TRUE",
    perluAktivasi: p.status === "impor" };
}

function normalUser(u) { return String(u || "").trim().toLowerCase(); }

function aksiMasuk(d) {
  var u = normalUser(d.username), sandi = String(d.sandi || "");
  if (!u || !sandi) throw galat("Isi NIM/NIP dan kata sandi.");
  return kunciTulis(function () {
    var p = cari("Pengguna", function (x) { return normalUser(x.username) === u; });
    var salah = galat("NIM/NIP atau kata sandi salah.");
    if (!p || p.status === "nonaktif") throw salah;
    if (p.kunciSampai && new Date(p.kunciSampai) > new Date())
      throw galat("Akun terkunci sementara karena terlalu banyak percobaan. Coba lagi setelah " +
        Utilities.formatDate(new Date(p.kunciSampai), "Asia/Makassar", "HH:mm") + " WITA.");
    var benar;
    if (p.status === "impor") {
      var umur = (Date.now() - new Date(p.diimporPada).getTime()) / 864e5;
      if (umur > MASA_SANDI_AWAL_HARI) throw galat("Kata sandi awal sudah kedaluwarsa. Hubungi Admin Prodi untuk aktivasi ulang.");
      benar = p.hash ? samaAman(p.hash, hashSandi(sandi, p.garam)) : sandi === String(p.username);
    } else {
      benar = samaAman(p.hash, hashSandi(sandi, p.garam));
    }
    if (!benar) {
      var g = Number(p.gagal || 0) + 1, ubahan = { gagal: g };
      if (g >= BATAS_GAGAL) { ubahan.kunciSampai = new Date(Date.now() + KUNCI_MENIT * 60000); ubahan.gagal = 0; }
      ubah("Pengguna", p, ubahan);
      catat(p.id, "masuk.gagal", { percobaan: g });
      throw salah;
    }
    ubah("Pengguna", p, { gagal: 0, kunciSampai: "", masukTerakhir: new Date() });
    var token = buatSesi(p, d.perangkat);
    catat(p.id, "masuk", {});
    return { token: token, pengguna: profilPublik(p) };
  });
}

function aksiSaya(d, token) { return { pengguna: profilPublik(penggunaDariToken(token)) }; }

function aksiKeluar(d, token) { if (token) hapusSesi(token); return {}; }

/** Aktivasi langkah 1: kata sandi baru. */
function aksiAktivasiSandi(d, token) {
  var p = penggunaDariToken(token);
  if (p.status !== "impor") throw galat("Akun sudah aktif.");
  periksaSandiBaru(d.sandiBaru, p);
  var garam = acak(24);
  kunciTulis(function () { ubah("Pengguna", p, { hash: hashSandi(d.sandiBaru, garam), garam: garam, wajibGanti: false, diubahPada: new Date() }); });
  catat(p.id, "aktivasi.sandi", {});
  return { pengguna: profilPublik(p) };
}

/** Aktivasi langkah 2a: kirim kode ke email. */
function aksiAktivasiKirimKode(d, token) {
  var p = penggunaDariToken(token);
  if (p.status !== "impor") throw galat("Akun sudah aktif.");
  if (!p.hash) throw galat("Buat kata sandi baru terlebih dahulu.");
  var email = String(d.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw galat("Format email tidak valid.");
  var dipakai = cari("Pengguna", function (x) { return String(x.email).toLowerCase() === email && x.id !== p.id; });
  if (dipakai) throw galat("Email ini sudah dipakai akun lain.");
  var kode = buatKode(p.id, "aktivasi", email);
  kirimEmailKode(email, p.nama, kode, "aktivasi");
  catat(p.id, "aktivasi.kirimKode", { email: email });
  var hasil = { terkirimKe: email };
  if (modeUji()) hasil.kodeUji = kode; // hanya di lingkungan Uji Coba, untuk pengujian otomatis
  return hasil;
}

/** Aktivasi langkah 2b: verifikasi kode → akun aktif. */
function aksiAktivasiVerifikasi(d, token) {
  var p = penggunaDariToken(token);
  if (p.status !== "impor") throw galat("Akun sudah aktif.");
  var k = periksaKode(p.id, "aktivasi", d.kode);
  kunciTulis(function () { ubah("Pengguna", p, { email: k.email, emailTerverifikasi: true, status: "aktif", aktivasiPada: new Date(), diubahPada: new Date() }); });
  catat(p.id, "aktivasi.selesai", { email: k.email });
  return { pengguna: profilPublik(p) };
}

/** Lupa kata sandi: jawaban selalu sama agar tidak membocorkan email yang terdaftar. */
function aksiLupaKirimKode(d) {
  var email = String(d.email || "").trim().toLowerCase();
  var p = email && cari("Pengguna", function (x) { return String(x.email).toLowerCase() === email && x.status === "aktif"; });
  var hasil = { pesan: "Bila email terdaftar, kode reset sudah dikirim. Periksa juga folder spam." };
  if (p) {
    var kode = buatKode(p.id, "reset", email);
    kirimEmailKode(email, p.nama, kode, "reset");
    catat(p.id, "lupa.kirimKode", {});
    if (modeUji()) hasil.kodeUji = kode;
  }
  return hasil;
}

function aksiLupaReset(d) {
  var email = String(d.email || "").trim().toLowerCase();
  var p = cari("Pengguna", function (x) { return String(x.email).toLowerCase() === email && x.status === "aktif"; });
  if (!p) throw galat("Kode salah atau sudah kedaluwarsa.");
  periksaKode(p.id, "reset", d.kode);
  periksaSandiBaru(d.sandiBaru, p);
  var garam = acak(24);
  kunciTulis(function () { ubah("Pengguna", p, { hash: hashSandi(d.sandiBaru, garam), garam: garam, wajibGanti: false, gagal: 0, kunciSampai: "", diubahPada: new Date() }); });
  hapusSemuaSesi(p.id);
  catat(p.id, "lupa.reset", {});
  return { pesan: "Kata sandi berhasil diganti. Silakan masuk dengan kata sandi baru." };
}

/** Ganti kata sandi (juga dipakai setelah reset oleh Super Admin). */
function aksiGantiSandi(d, token) {
  var p = penggunaDariToken(token);
  if (!p.wajibGanti || p.wajibGanti === "FALSE") {
    if (!samaAman(p.hash, hashSandi(d.sandiLama || "", p.garam))) throw galat("Kata sandi lama salah.");
  }
  periksaSandiBaru(d.sandiBaru, p);
  var garam = acak(24);
  kunciTulis(function () { ubah("Pengguna", p, { hash: hashSandi(d.sandiBaru, garam), garam: garam, wajibGanti: false, diubahPada: new Date() }); });
  catat(p.id, "ganti.sandi", {});
  return { pengguna: profilPublik(p) };
}

/* ---------- Pengelolaan pengguna ---------- */

function aksiAdminPengguna(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["superadmin", "admin"]);
  var lihatSemua = punyaPeran(p, ["superadmin"]);
  var daftar = semua("Pengguna").filter(function (x) { return lihatSemua || peranDari(x).indexOf("mahasiswa") >= 0; });
  return { pengguna: daftar.map(function (x) {
    var o = profilPublik(x); o.ref = String(x.ref || ""); o.masukTerakhir = x.masukTerakhir ? new Date(x.masukTerakhir).toISOString() : "";
    if (!lihatSemua) delete o.peran; return o; }) };
}

/**
 * Impor akun. Admin Prodi hanya boleh mengimpor mahasiswa; Super Admin semua peran.
 * data.baris = [{ username, nama, peran: "dosen,kps", ref }]
 */
function aksiAdminImpor(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["superadmin", "admin"]);
  var superA = punyaPeran(p, ["superadmin"]);
  var baris = Array.isArray(d.baris) ? d.baris : [];
  if (!baris.length) throw galat("Tidak ada data untuk diimpor.");
  if (baris.length > 500) throw galat("Maksimal 500 baris per impor.");
  return kunciTulis(function () {
    var ada = {}; semua("Pengguna").forEach(function (x) { ada[normalUser(x.username)] = true; });
    var baru = [], lewati = [], kini = new Date();
    baris.forEach(function (b, i) {
      var u = normalUser(b.username), nama = String(b.nama || "").trim();
      var peran = String(b.peran || "mahasiswa").split(",").map(function (x) { return x.trim().toLowerCase(); }).filter(String);
      if (!u || !nama) { lewati.push({ baris: i + 1, alasan: "NIM/NIP atau nama kosong" }); return; }
      if (!/^[a-z0-9.\-]{3,30}$/.test(u)) { lewati.push({ baris: i + 1, alasan: "Format NIM/NIP tidak valid" }); return; }
      if (peran.some(function (r) { return PERAN_SAH.indexOf(r) < 0; })) { lewati.push({ baris: i + 1, alasan: "Peran tidak dikenal" }); return; }
      if (!superA && (peran.length !== 1 || peran[0] !== "mahasiswa")) { lewati.push({ baris: i + 1, alasan: "Admin Prodi hanya boleh mengimpor mahasiswa" }); return; }
      if (ada[u]) { lewati.push({ baris: i + 1, alasan: "Sudah terdaftar" }); return; }
      ada[u] = true;
      baru.push({ id: "u" + acak(10), username: u, nama: nama, email: "", peran: peran.join(","), status: "impor", hash: "", garam: "",
        wajibGanti: true, emailTerverifikasi: false, gagal: 0, kunciSampai: "", ref: String(b.ref || u), dosenId: String(b.dosenId || ""),
        diimporPada: kini, aktivasiPada: "", masukTerakhir: "", diubahPada: kini });
    });
    tambahBanyak("Pengguna", baru);
    catat(p.id, "admin.impor", { jumlah: baru.length, dilewati: lewati.length });
    return { diimpor: baru.length, dilewati: lewati };
  });
}

/** Reset kata sandi oleh Super Admin: kata sandi sementara ditampilkan sekali, wajib diganti saat masuk. */
function aksiAdminResetSandi(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["superadmin"]);
  var t = cari("Pengguna", function (x) { return x.id === d.userId; });
  if (!t) throw galat("Pengguna tidak ditemukan.");
  var sementara = "Upw-" + acak(6) + Math.floor(10 + Math.random() * 89);
  var garam = acak(24);
  kunciTulis(function () { ubah("Pengguna", t, { hash: hashSandi(sementara, garam), garam: garam, wajibGanti: true, gagal: 0, kunciSampai: "", diubahPada: new Date() }); });
  hapusSemuaSesi(t.id);
  catat(p.id, "admin.resetSandi", { untuk: t.id });
  return { sandiSementara: sementara };
}

function aksiAdminPeran(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["superadmin"]);
  var t = cari("Pengguna", function (x) { return x.id === d.userId; });
  if (!t) throw galat("Pengguna tidak ditemukan.");
  var peran = (d.peran || []).map(String).filter(function (r) { return PERAN_SAH.indexOf(r) >= 0; });
  if (!peran.length) throw galat("Pilih minimal satu peran.");
  if (t.id === p.id && peran.indexOf("superadmin") < 0) throw galat("Anda tidak dapat mencabut peran Super Admin dari akun Anda sendiri.");
  kunciTulis(function () { ubah("Pengguna", t, { peran: peran.join(","), diubahPada: new Date() }); });
  catat(p.id, "admin.peran", { untuk: t.id, peran: peran });
  return { pengguna: profilPublik(t) };
}

function aksiAdminLog(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["superadmin"]);
  var l = semua("Log").slice(-200).reverse();
  return { log: l.map(function (x) { return { waktu: new Date(x.waktu).toISOString(), userId: x.userId, aksi: x.aksi, detail: x.detail }; }) };
}
