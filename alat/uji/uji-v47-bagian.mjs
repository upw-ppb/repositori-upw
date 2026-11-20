// Uji v0.47.0: ubah nama (Super Admin semua akun; Admin Prodi mahasiswa), nonaktifkan/aktifkan dan hapus akun (Super Admin; hapus hanya bila belum dirujuk data).
export function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tSA }) {
  console.log("60. Ubah nama, nonaktifkan, dan hapus akun");
  ok("admin.impor", { baris: [{ username: "198001019999011001", nama: "Teguh Hadisukarno", peran: "dosen" }, { username: "279981", nama: "Mhs Salah Ketik", masuk: 2026, kelas: "A" },
    { username: "279982", nama: "Mhs Dipakai", masuk: 2026, kelas: "A" }] }, tSA);
  const dsn = ID("198001019999011001"), m1 = ID("279981"), m2 = ID("279982"), nLog = g.sheets.Log.length;
  let j = ok("admin.ubahNama", { userId: dsn, nama: "  Teguh  Hadi Sukarno, S.S., M.Hum. " }, tSA);
  cek("Super Admin mengubah nama akun dosen yang belum aktivasi (spasi dirapikan), tercatat di Log dengan nama lama dan baru", j.pengguna.nama === "Teguh Hadi Sukarno, S.S., M.Hum."
    && JSON.stringify(g.sheets.Log.slice(nLog)).includes("Teguh Hadisukarno") && JSON.stringify(g.sheets.Log.slice(nLog)).includes("admin.ubahNama"));
  cek("Admin Prodi: boleh mengubah nama mahasiswa, ditolak untuk akun dosen; dosen dan mahasiswa ditolak", ok("admin.ubahNama", { userId: m1, nama: "Mhs Benar" }, tAdm).pengguna.nama === "Mhs Benar"
    && /hanya dapat mengubah nama akun mahasiswa/.test(salah("admin.ubahNama", { userId: dsn, nama: "Coba" }, tAdm)) && /izin/i.test(salah("admin.ubahNama", { userId: m1, nama: "Coba" }, tDsn)) && !!salah("admin.ubahNama", { userId: m1, nama: "Xyz" }, tM));
  cek("ubah nama: terlalu pendek, diawali =, atau tidak berubah ditolak", /minimal 3/.test(salah("admin.ubahNama", { userId: m1, nama: "A" }, tSA)) && /diawali/.test(salah("admin.ubahNama", { userId: m1, nama: "=SUM(A1)" }, tSA))
    && /tidak berubah/.test(salah("admin.ubahNama", { userId: m1, nama: "Mhs Benar" }, tSA)));
  // Nonaktifkan / aktifkan
  const saya = ok("saya", {}, tSA), idSA = (saya.pengguna || saya).id;
  cek("nonaktifkan: Admin Prodi ditolak; akun sendiri ditolak (juga hapus)", /izin/i.test(salah("admin.statusAkun", { userId: m1, aktif: false }, tAdm)) && /sendiri/.test(salah("admin.statusAkun", { userId: idSA, aktif: false }, tSA))
    && /sendiri/.test(salah("admin.hapusAkun", { userId: idSA, konfirmasi: "x" }, tSA)));
  j = ok("admin.statusAkun", { userId: m1, aktif: false }, tSA);
  cek("akun nonaktif tidak bisa masuk; diaktifkan kembali → status belum aktivasi lagi", j.pengguna.status === "nonaktif" && !!salah("masuk", { username: "279981", sandi: "279981" })
    && ok("admin.statusAkun", { userId: m1, aktif: true }, tSA).pengguna.status === "impor" && !!ok("masuk", { username: "279981", sandi: "279981" }).token);
  // Hapus
  ok("dp.timSimpan", { semester: "2032-1", kodeMk: "UPW981", anggota: [{ t: "u", id: dsn }] }, tAdm);
  cek("hapus: konfirmasi NIM/NIP salah ditolak; Admin Prodi ditolak", /Ketik NIM\/NIP/.test(salah("admin.hapusAkun", { userId: m1, konfirmasi: "salah" }, tSA)) && /izin/i.test(salah("admin.hapusAkun", { userId: m1, konfirmasi: "279981" }, tAdm)));
  j = ok("admin.hapusAkun", { userId: dsn, konfirmasi: "198001019999011001" }, tSA);
  cek("akun yang dipakai di tim pengajar tidak dihapus; rujukan dilaporkan", j.dihapus === false && j.rujukan.some(r => r.tabel === "TimPengajar") && !!ID("198001019999011001"));
  ok("biodata.massal", { baris: [{ nip: "279982", jk: "Perempuan" }] }, tAdm);
  const nBio = (g.sheets.BiodataMahasiswa || [[]]).length, nPeng = g.sheets.Pengguna.length;
  j = ok("admin.hapusAkun", { userId: m1, konfirmasi: "279981" }, tSA);
  cek("akun belum dipakai (belum aktivasi) dihapus permanen: hilang dari Pengguna, sesi/kode ikut, tidak bisa masuk, tercatat di Log", j.dihapus === true && g.sheets.Pengguna.length === nPeng - 1
    && !g.sheets.Pengguna.some(r => r[0] === m1) && !(g.sheets.Sesi || []).some(r => r[1] === m1) && !!salah("masuk", { username: "279981", sandi: "279981" })
    && JSON.stringify(g.sheets.Log.slice(-3)).includes("admin.hapusAkun") && JSON.stringify(g.sheets.Log.slice(-3)).includes("Mhs Benar"));
  void nBio; void m2; void tKps;
}
