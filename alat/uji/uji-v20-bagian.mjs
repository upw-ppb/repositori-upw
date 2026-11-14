// Uji v0.20.0: riwayat keputusan, penanda tangan selain KPS, laboratorium & sarana.
export function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tD2, tSA }) {
  console.log("30. Riwayat keputusan, penanda tangan, laboratorium");
  const R = ok("kps.riwayat", {}, tKps);
  cek("riwayat keputusan: KPS melihat keputusan surat dan verifikasi data, terbaru di atas", R.riwayat.length > 0 && R.riwayat.some(x => x.jenis === "surat") && R.riwayat.some(x => x.jenis === "data") && R.riwayat[0].waktu >= R.riwayat[R.riwayat.length - 1].waktu);
  cek("surat terbit mencatat kode surat dan nama KPS", R.riwayat.some(x => x.keputusan === "terbit" && x.kodeSurat && x.oleh));
  cek("dosen/mahasiswa tidak bisa membuka riwayat keputusan", /izin/.test(salah("kps.riwayat", {}, tDsn)) && /izin/.test(salah("kps.riwayat", {}, tM)));
  // Penanda tangan
  const d2 = ID("198001012005011009");
  cek("dosen biasa belum boleh menyimpan tanda tangan", /izin/.test(salah("ttd.saya", {}, tD2)) && ok("saya", {}, tD2).pengguna.bolehTtd === false);
  cek("hanya Super Admin yang menunjuk penanda tangan", /izin/.test(salah("admin.penandaTangan", { ids: [d2] }, tAdm)));
  cek("penanda tangan harus dosen", /harus akun dosen/.test(salah("admin.penandaTangan", { ids: [ID("250103")] }, tSA)));
  let P = ok("admin.penandaTangan", { ids: [d2] }, tSA);
  cek("Super Admin menunjuk dosen sebagai penanda tangan", P.dosen.find(x => x.id === d2).dipilih);
  cek("dosen yang ditunjuk kini boleh membuka Tanda Tangan Saya", ok("ttd.saya", {}, tD2).ada === false && ok("saya", {}, tD2).pengguna.bolehTtd === true);
  ok("admin.penandaTangan", { ids: [] }, tSA);
  cek("izin dicabut", /izin/.test(salah("ttd.saya", {}, tD2)));
  // Lab
  cek("dosen biasa tidak bisa membuka data lab", /izin/.test(salah("lab.data", {}, tD2)));
  cek("validasi: nama, jenis, kepemilikan, kondisi", /Nama sarana/.test(salah("lab.simpan", { data: { nama: "" } }, tAdm)) && /jenis sarana/.test(salah("lab.simpan", { data: { nama: "Lab GDS", jenis: "x" } }, tAdm)));
  let L = ok("lab.simpan", { data: { nama: "Laboratorium Travel Agent & GDS", jenis: "Laboratorium", lokasi: "Gedung C lt. 2", kapasitas: 30, kepemilikan: "Milik sendiri", kondisi: "Baik", perangkat: "30 PC, Amadeus GDS", mk: "UPW202 Ticketing", pj: ID("199001152015041001") } }, tAdm);
  const s = L.sarana[0];
  cek("sarana tersimpan dengan PJ", L.sarana.length === 1 && s.pjNama && s.kapasitas === 30);
  cek("KPS hanya melihat", ok("lab.data", {}, tKps).bolehUbah === false && /izin/.test(salah("lab.simpan", { data: {} }, tKps)));
  cek("log: tanggal masa depan ditolak", /masa depan/.test(salah("lab.log", { data: { saranaId: s.id, tipe: "rawat", tgl: "2099-01-01", isi: "Servis PC" } }, tAdm)));
  ok("lab.log", { data: { saranaId: s.id, tipe: "rawat", tgl: "2026-10-01", isi: "Servis berkala 30 PC dan pembaruan lisensi" } }, tAdm);
  L = ok("lab.log", { data: { saranaId: s.id, tipe: "pakai", tgl: "2026-11-02", isi: "Praktik reservasi", mk: "UPW202 Ticketing kelas 3A", jumlah: 28, jam: "2,5" } }, tAdm);
  const s2 = L.sarana[0];
  cek("ringkasan: perawatan terakhir dan pemakaian 12 bulan (jam)", s2.rawatTerakhir === "2026-10-01" && s2.pakaiSetahun === 1 && s2.jamSetahun === 2.5, s2);
  const N = ok("penilaian.data", {}, tAdm);
  cek("Penilaian butir 19/21 menyebut Data Lab", /Data Lab: 1 sarana/.test(N.rows.find(r => r.n === 21).info));
  L = ok("lab.logHapus", { id: L.log[0].id }, tAdm); L = ok("lab.hapus", { id: s.id }, tAdm);
  cek("hapus catatan dan sarana", L.sarana.length === 0);
  cek("migrasi: Sarana, LogSarana", !!(g.sheets.Sarana && g.sheets.LogSarana));
}
