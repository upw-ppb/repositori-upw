// Uji v0.23.0: masukan dan saran pengguna.
export function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tD2, tSA }) {
  console.log("32. Masukan dan saran");
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(30)]).toString("base64");
  cek("jenis wajib; judul dan uraian minimal", /Pilih jenis/.test(salah("masukan.kirim", { jenis: "x", judul: "Tombol", isi: "Tidak bisa diklik sama sekali" }, tM))
    && /judul singkat/.test(salah("masukan.kirim", { jenis: "Masalah / error", judul: "a", isi: "Tidak bisa diklik sama sekali" }, tM))
    && /lebih rinci/.test(salah("masukan.kirim", { jenis: "Masalah / error", judul: "Tombol unggah", isi: "rusak" }, tM)));
  cek("lampiran harus gambar/PDF dan isinya sesuai", /gambar/.test(salah("masukan.kirim", { jenis: "Masalah / error", judul: "Tombol unggah", isi: "Tidak bereaksi saat diklik", lampiran: { nama: "a.docx", isi: png } }, tM))
    && /tidak sesuai/.test(salah("masukan.kirim", { jenis: "Masalah / error", judul: "Tombol unggah", isi: "Tidak bereaksi saat diklik", lampiran: { nama: "a.pdf", isi: png } }, tM)));
  let j = ok("masukan.kirim", { jenis: "Masalah / error", menu: "Kegiatan", judul: "Tombol unggah bukti tidak bereaksi", isi: "Saya memilih file PDF 2 MB lalu tidak terjadi apa-apa.", peran: "mahasiswa", versi: "0.23.0", perangkat: "Chrome di Mac", lampiran: { nama: "layar.png", isi: png } }, tM);
  cek("mahasiswa mengirim masukan dengan lampiran; tampil di daftar miliknya berstatus Baru", j.masukan.length === 1 && j.masukan[0].status === "baru" && j.masukan[0].lampiran && j.masukan[0].menu === "Kegiatan");
  ok("masukan.kirim", { jenis: "Permintaan fitur baru", judul: "Ekspor jadwal ke kalender", isi: "Mohon jadwal kegiatan bisa ditambahkan ke Google Calendar." }, tDsn);
  cek("pengguna hanya melihat masukan miliknya", ok("masukan.saya", {}, tDsn).masukan.length === 1 && ok("masukan.saya", {}, tM).masukan.length === 1);
  cek("dosen/KPS tidak bisa melihat semua masukan", /izin/.test(salah("masukan.daftar", {}, tDsn)) && /izin/.test(salah("masukan.daftar", {}, tKps)));
  let D = ok("masukan.daftar", {}, tSA);
  cek("Super Admin melihat semua masukan dengan nama pengirim", D.masukan.length === 2 && D.masukan.every(x => x.nama && x.username));
  cek("tugas.saya Super Admin: jumlah masukan baru", ok("tugas.saya", {}, tSA).masukanBaru === 2);
  const id = D.masukan.find(x => x.username === "250103").id;
  cek("status tak dikenal ditolak", /tidak dikenal/.test(salah("masukan.ubah", { id, status: "x" }, tAdm)));
  D = ok("masukan.ubah", { id, status: "direncanakan", tanggapan: "Terima kasih, akan diperbaiki di versi berikutnya." }, tAdm);
  cek("Admin Prodi memberi status dan tanggapan", D.masukan.find(x => x.id === id).status === "direncanakan");
  const S = ok("masukan.saya", {}, tM).masukan[0];
  cek("pengirim melihat status dan tanggapan beserta nama penanggap", S.status === "direncanakan" && /Terima kasih/.test(S.tanggapan) && S.olehTanggapan);
  cek("lampiran: pengirim dan Admin bisa membuka; pengguna lain tidak", ok("masukan.lampiran", { id }, tM).mime === "image/png" && ok("masukan.lampiran", { id }, tSA).isi && /tidak ditemukan/.test(salah("masukan.lampiran", { id }, tDsn)));
  cek("migrasi: Masukan; SKEMA_VERSI 18", g.sheets.Masukan && g.props.SKEMA_VERSI === "18");
}
