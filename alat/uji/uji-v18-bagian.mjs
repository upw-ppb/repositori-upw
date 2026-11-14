// Uji v0.18.0: impor biodata dosen massal, ekspor akun, status dosen.
export function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tD2, tSA }) {
  console.log("28. Impor massal dan status dosen");
  const T = ok("impor.templat", {}, tAdm).biodataPegawai;
  cek("templat biodata pegawai: NIP + kolom skema (jk, inisial, bidang), tanpa kolom baca-saja", T[0].k === "nip" && ["jk", "inisial", "bidang", "nama"].every(k => T.some(x => x.k === k)) && !T.some(x => x.k === "email"));
  cek("mahasiswa/dosen tidak bisa memakai impor massal", /izin/.test(salah("biodata.massal", { baris: [{ nip: "x" }] }, tDsn)));
  let j = ok("biodata.massal", { baris: [
    { nip: "199001152015041001", inisial: "GAP", bidang: "Ticketing; MICE", sertKomp: "Tour Leader – LSP, 2024" },
    { nip: "000000", inisial: "XXX" },
    { nip: "250103", inisial: "MHS" },
    { nip: "198001012005011009", jk: "Bukan pilihan" }] }, tAdm);
  cek("biodata massal: 1 diperbarui; NIP tak dikenal, mahasiswa, dan pilihan tak sah dilewati dengan alasan", j.diperbarui === 1 && j.dilewati.length === 3 && /tidak terdaftar/.test(j.dilewati[0].alasan) && /bukan dosen/.test(j.dilewati[1].alasan), j);
  const B = ok("biodata.lihat", { userId: ID("199001152015041001") }, tSA).biodata.data;
  cek("isian lama tetap (sel kosong tidak menghapus), isian baru tersimpan", B.inisial === "GAP" && B.bidang === "Ticketing; MICE" && B.hp, B);
  const E = ok("admin.eksporAkun", {}, tSA);
  cek("ekspor akun Super Admin: semua akun dengan kepala kolom", E.kepala.length === 11 && E.baris.length > 8 && E.baris.some(r => /dosen/.test(r[2])));
  const E2 = ok("admin.eksporAkun", {}, tAdm);
  cek("ekspor akun Admin Prodi: hanya mahasiswa", E2.baris.length > 0 && E2.baris.every(r => r[2] === "mahasiswa"));
  // Status dosen
  const dsn = ID("199001152015041001");
  let S = ok("dp.status", {}, tKps);
  cek("KPS melihat status (tanpa ubah); bawaan aktif", !S.bolehUbah && S.dosen.find(x => x.id === dsn).kini.status === "aktif");
  cek("KPS tidak bisa mengubah status", /izin/.test(salah("dp.statusSimpan", { userId: dsn, status: "tugas_belajar", mulai: "2025-09-01" }, tKps)));
  cek("tanggal mulai wajib; status tak dikenal ditolak", /mulai wajib/.test(salah("dp.statusSimpan", { userId: dsn, status: "tugas_belajar" }, tAdm)) && /tidak dikenal/.test(salah("dp.statusSimpan", { userId: dsn, status: "cuti", mulai: "2025-01-01" }, tAdm)));
  S = ok("dp.statusSimpan", { userId: dsn, status: "tugas_belajar", mulai: "2025-09-01", ket: "S3 Universitas Udayana" }, tAdm);
  let x = S.dosen.find(y => y.id === dsn);
  cek("tugas belajar berjalan (tanpa tanggal selesai) → status kini tugas belajar", x.kini.status === "tugas_belajar" && x.periode.length === 1);
  cek("periode bertumpuk ditolak", /bertumpuk/.test(salah("dp.statusSimpan", { userId: dsn, status: "pensiun", mulai: "2026-01-01" }, tAdm)));
  cek("selesai sebelum mulai ditolak", /sebelum tanggal mulai/.test(salah("dp.statusSimpan", { id: x.periode[0].id, userId: dsn, status: "tugas_belajar", mulai: "2025-09-01", selesai: "2025-01-01" }, tAdm)));
  S = ok("dp.statusSimpan", { id: x.periode[0].id, userId: dsn, status: "tugas_belajar", mulai: "2025-09-01", selesai: "2026-08-31", ket: "S3 Universitas Udayana" }, tAdm);
  x = S.dosen.find(y => y.id === dsn);
  cek("kembali dari tugas belajar (tanggal selesai) → periode tersimpan", x.periode[0].selesai === "2026-08-31" && x.periode.length === 1);
  cek("pensiun tidak punya tanggal selesai", /tidak memiliki tanggal selesai/.test(salah("dp.statusSimpan", { userId: dsn, status: "pensiun", mulai: "2040-01-01", selesai: "2041-01-01" }, tAdm)));
  S = ok("dp.statusHapus", { id: x.periode[0].id }, tAdm);
  cek("hapus riwayat status", S.dosen.find(y => y.id === dsn).periode.length === 0);
  cek("migrasi: StatusDosen", !!g.sheets.StatusDosen);
}
