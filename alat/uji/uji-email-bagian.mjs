// Uji v0.16.0: aktivasi tanpa email (sementara) dan verifikasi email susulan.
export function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tD2, tSA }) {
  console.log("26. Aktivasi tanpa email");
  const masuk = u => g.panggil("masuk", { username: u, sandi: u });
  ok("admin.impor", { baris: [{ username: "260301", nama: "Ni Luh Tanpa Email", masuk: 2026, kelas: "A" }, { username: "260302", nama: "I Made Kedua", masuk: 2026, kelas: "A" }, { username: "260303", nama: "Ketut Ketiga", masuk: 2026, kelas: "B" }] }, tSA);
  let j = masuk("260301");
  cek("bawaan: mode mati (tanpaEmail false)", j.ok && j.pengguna.perluAktivasi && j.pengguna.tanpaEmail === false);
  let t1 = j.token; ok("aktivasi.sandi", { sandiBaru: "Mhs2026aa" }, t1);
  cek("mode mati: aktivasi tanpa email ditolak", /tidak berlaku/.test(salah("aktivasi.tanpaEmail", { email: "a@contoh.id" }, t1)));
  cek("hanya Super Admin yang mengatur mode", /izin/.test(salah("admin.tanpaEmail", { nyala: true }, tAdm)) && /izin/.test(salah("admin.tanpaEmail", { nyala: true }, tKps)));
  j = ok("admin.tanpaEmail", { nyala: true }, tSA);
  cek("Super Admin menyalakan mode", j.nyala === true && j.tertunda === 0);
  cek("profil impor: tanpaEmail true", ok("saya", {}, t1).pengguna.tanpaEmail === true);
  const t2 = masuk("260302").token;
  cek("belum ganti sandi: ditolak", /kata sandi baru/.test(salah("aktivasi.tanpaEmail", { email: "b@contoh.id" }, t2)));
  cek("email tidak valid ditolak", /Format email/.test(salah("aktivasi.tanpaEmail", { email: "bukan-email" }, t1)));
  j = ok("aktivasi.tanpaEmail", { email: "  NiLuh.Uji@Gmail.com " }, t1);
  cek("aktif tanpa kode: email tersimpan (huruf kecil), tertunda, tidak wajib verifikasi saat mode menyala", j.pengguna.status === "aktif" && !j.pengguna.perluAktivasi && j.pengguna.email === "niluh.uji@gmail.com" && j.pengguna.emailTertunda && !j.pengguna.perluVerifikasiEmail && !j.pengguna.emailTerverifikasi, j.pengguna);
  cek("tidak ada email yang dikirim", !g.surat.some(x => x.to === "niluh.uji@gmail.com"));
  cek("akun berjalan seperti biasa (langkah berikutnya: biodata)", /Lengkapi biodata/.test(salah("portofolio.saya", {}, t1)));
  ok("aktivasi.sandi", { sandiBaru: "Mhs2026bb" }, t2);
  cek("email yang sudah dipakai akun lain ditolak", /sudah dipakai/.test(salah("aktivasi.tanpaEmail", { email: "niluh.uji@gmail.com" }, t2)));
  cek("akun sudah aktif tidak bisa aktivasi ulang", /sudah aktif/.test(salah("aktivasi.tanpaEmail", { email: "c@contoh.id" }, t1)));
  cek("mode menyala: verifikasi susulan belum diminta", ok("admin.tanpaEmail", {}, tSA).tertunda === 1);
  // Email kampus sudah beres → Super Admin mematikan mode.
  ok("admin.tanpaEmail", { nyala: false }, tSA);
  const p1 = ok("saya", {}, t1).pengguna;
  cek("mode mati: akun tertunda wajib verifikasi email", p1.perluVerifikasiEmail === true && /Verifikasi email/.test(salah("portofolio.saya", {}, t1)));
  cek("impor yang belum aktivasi kembali ke alur kode email", /tidak berlaku/.test(salah("aktivasi.tanpaEmail", { email: "c@contoh.id" }, t2)) && ok("saya", {}, t2).pengguna.tanpaEmail === false);
  cek("verifikasi susulan: email tidak valid ditolak", /Format email/.test(salah("email.kirimKode", { email: "x" }, t1)));
  const k = ok("email.kirimKode", { email: "niluh.baru@gmail.com" }, t1);
  cek("kode dikirim ke email (boleh ganti alamat)", k.terkirimKe === "niluh.baru@gmail.com" && g.surat.some(x => x.to === "niluh.baru@gmail.com") && k.kodeUji);
  cek("kode salah ditolak", /Kode salah/.test(salah("email.verifikasi", { kode: "000000" }, t1)));
  j = ok("email.verifikasi", { kode: k.kodeUji }, t1);
  cek("terverifikasi: email baru, tidak tertunda, akun berjalan lagi", j.pengguna.emailTerverifikasi && !j.pengguna.emailTertunda && !j.pengguna.perluVerifikasiEmail && j.pengguna.email === "niluh.baru@gmail.com" && /Lengkapi biodata/.test(salah("portofolio.saya", {}, t1)));
  cek("akun terverifikasi tidak perlu verifikasi lagi", /tidak perlu diverifikasi/.test(salah("email.kirimKode", { email: "z@contoh.id" }, t1)));
  cek("akun lama (terverifikasi biasa) tidak terpengaruh", !ok("saya", {}, tDsn).pengguna.perluVerifikasiEmail && ok("tugas.saya", {}, tDsn));
}
