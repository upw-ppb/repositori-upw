// Uji v0.6.0: Portofolio Saya dan dokumen pribadi.
export function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tM2, tD2, tSA }) {
  console.log("11. Portofolio Saya");
  const pdf = () => Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(30, 66)]).toString("base64");
  let j = ok("portofolio.saya", {}, tDsn);
  const peran = Object.fromEntries(j.kegiatan.map(k => [k.judul, k.peranSaya]));
  cek("dosen: kegiatan sebagai pengaju dan pendamping lomba", peran["PKM lama"] === "Pengaju" && j.kegiatan.some(k => k.jenis === "prestasi_n" && ["Dosen pendamping", "Peserta"].includes(k.peranSaya)), peran);
  cek("identitas dan daftar jenis dokumen", j.orang.username === "199001152015041001" && j.jenisDok.includes("Lainnya"));
  const lomba = j.kegiatan.find(k => k.jenis === "prestasi_n");
  cek("daftar bukti untuk ZIP (nama file, tautan, keterangan)", lomba.daftarBukti.some(b => b.t === "file" && b.nama) && lomba.daftarBukti.some(b => b.t === "tautan") && lomba.daftarBukti.some(b => b.t === "ket"), lomba.daftarBukti);
  const m = ok("portofolio.saya", {}, tM);
  cek("mahasiswa: semester & kelas di identitas", m.orang.jenis === "mahasiswa" && m.orang.semesterMhs === 3 && m.orang.kelas === "A", m.orang);
  cek("mahasiswa lain tidak melihat kegiatan yang tidak melibatkannya", !ok("portofolio.saya", {}, tM2).kegiatan.some(k => k.id === lomba.id));
  // draf orang lain tidak tampil
  const dr = ok("kegiatan.simpan", { peran: "dosen", data: { jenis: "pkm", judul: "Draf menandai dosen dua", pegawai: [ID("198001012005011009")], perluST: true } }, tDsn).kegiatan;
  cek("draf orang lain tidak tampil di portofolio yang ditandai", !ok("portofolio.saya", {}, tD2).kegiatan.some(k => k.id === dr.id) && ok("portofolio.saya", {}, tDsn).kegiatan.some(k => k.id === dr.id));
  console.log("12. Dokumen pribadi");
  cek("nama wajib", /nama dokumen/.test(salah("dok.simpan", { nama: "", jenis: "Lainnya", tahun: "2026", tautan: "https://x.id" }, tM)));
  cek("jenis wajib", /jenis/.test(salah("dok.simpan", { nama: "A", jenis: "X", tahun: "2026", tautan: "https://x.id" }, tM)));
  cek("tahun 4 angka", /tahun/.test(salah("dok.simpan", { nama: "A", jenis: "Lainnya", tahun: "26", tautan: "https://x.id" }, tM)));
  cek("isi file palsu ditolak", /tidak sesuai/.test(salah("dok.simpan", { nama: "A", jenis: "Lainnya", tahun: "2026", namaFile: "a.pdf", isi: Buffer.from("<html>").toString("base64") }, tM)));
  j = ok("dok.simpan", { nama: "Sertifikat Kompetensi Pemandu Wisata", jenis: "Sertifikat kompetensi (BNSP/LSP)", tahun: "2026", namaFile: "bnsp.pdf", isi: pdf() }, tM);
  const d1 = j.dokumen[0];
  cek("dokumen file tersimpan (tahun tetap teks)", j.dokumen.length === 1 && d1.t === "file" && d1.tahun === "2026" && d1.ukuran === 39, d1);
  const f = Object.values(g.files).find(x => x.nama && x.nama.startsWith("Sertifikat kompetensi - Sertifikat Kompetensi"));
  cek("berkas di Drive: Portofolio / 250103 …", f && f.folder.nama.startsWith("250103 ") && Object.values(g.files).some(x => x.nama === "Portofolio"), f && f.folder.nama);
  j = ok("dok.simpan", { nama: "TOEIC 765", jenis: "Bahasa asing (TOEIC/TOEFL/IELTS)", tahun: "2025", tautan: "https://drive.google.com/file/d/abc" }, tM);
  cek("dokumen tautan tersimpan", j.dokumen.length === 2 && j.dokumen.some(x => x.t === "tautan"));
  cek("dok.lihat file pemilik: isi sama", ok("dok.lihat", { id: d1.id }, tM).isi === pdf());
  cek("orang lain tidak bisa melihat/menghapus", /tidak ditemukan/.test(salah("dok.lihat", { id: d1.id }, tM2)) && /tidak ditemukan/.test(salah("dok.hapus", { id: d1.id }, tAdm)));
  cek("portofolio memuat dokumen", ok("portofolio.saya", {}, tM).dokumen.length === 2);
  j = ok("dok.hapus", { id: d1.id }, tM);
  cek("hapus: hilang dari daftar, berkas ke sampah", j.dokumen.length === 1 && f.terbuang);
  cek("migrasi: sheet DokumenPribadi", !!g.sheets.DokumenPribadi);
}
