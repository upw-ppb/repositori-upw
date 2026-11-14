// Uji v0.19.0: dokumen pendukung biodata dosen, kelengkapan, pengingat.
export function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tD2, tSA }) {
  console.log("29. Dokumen biodata dosen dan pengingat");
  const pdf = () => Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(40, 65)]).toString("base64");
  const dsn = ID("199001152015041001");
  let D = ok("dok.biodata", {}, tDsn);
  cek("dosen: daftar kebutuhan dokumen dari biodata (ijazah S1 minimal)", D.butuh.some(x => x.jenis === "Ijazah D4/S1" && !x.ada) && D.jenis.includes("Ijazah S2"), D.butuh);
  cek("tugas.saya: dokumen belum lengkap tampil sebagai pengingat", ok("tugas.saya", {}, tDsn).dokBelum.includes("Ijazah D4/S1"));
  ok("dok.simpan", { dariBiodata: 1, nama: "Ijazah S.Tr.Par.", jenis: "Ijazah D4/S1", tahun: "2012", namaFile: "ijazah.pdf", isi: pdf() }, tDsn);
  ok("dok.simpan", { dariBiodata: 1, nama: "Tour Leader BNSP", jenis: "Sertifikat kompetensi (BNSP/LSP)", tahun: "2024", namaFile: "tl.pdf", isi: pdf() }, tDsn);
  ok("dok.simpan", { dariBiodata: 1, nama: "Pemandu Museum", jenis: "Sertifikat kompetensi (BNSP/LSP)", tahun: "2025", tautan: "https://drive.google.com/x" }, tDsn);
  D = ok("dok.biodata", {}, tDsn);
  cek("ijazah S1 dan dua sertifikat (beserta nama masing-masing) tersimpan", D.dokumen.length === 3 && D.butuh.find(x => x.jenis === "Ijazah D4/S1").ada && D.dokumen.filter(x => x.jenis.startsWith("Sertifikat kompetensi")).map(x => x.nama).join() === "Tour Leader BNSP,Pemandu Museum");
  cek("dokumen biodata juga muncul di Portofolio Saya", ok("portofolio.saya", {}, tDsn).dokumen.length >= 3);
  cek("mahasiswa tidak bisa memakai unggah dokumen biodata", /izin/.test(salah("dok.biodata", {}, tM)));
  let K = ok("dp.dokDosen", {}, tKps);
  const x = K.dosen.find(y => y.id === dsn);
  cek("KPS melihat kelengkapan dokumen dosen", x && x.butuh.length >= 2 && typeof x.kurang === "number");
  cek("dosen biasa tidak bisa melihat/mengirim pengingat", /izin/.test(salah("dp.dokDosen", {}, tD2)) && /izin/.test(salah("pengingat.kirim", { untuk: [dsn], pesan: "Mohon lengkapi" }, tD2)));
  cek("pengingat: pesan wajib, penerima harus dosen/tendik", /Tulis pesan/.test(salah("pengingat.kirim", { untuk: [dsn], pesan: "" }, tKps)) && /harus dosen/.test(salah("pengingat.kirim", { untuk: [ID("250103")], pesan: "Mohon lengkapi" }, tKps)));
  let j = ok("pengingat.kirim", { untuk: [dsn, ID("198001012005011009")], pesan: "Mohon lengkapi ijazah S2 dan sertifikat pendidik di Biodata." }, tKps);
  cek("KPS mengirim pengingat ke 2 dosen", j.terkirim === 2);
  const P = ok("tugas.saya", {}, tDsn).pengingat;
  cek("pengingat tampil di Beranda dosen dengan nama pengirim", P.length === 1 && /Widiastuti/.test(P[0].dari) && /ijazah S2/.test(P[0].pesan), P);
  cek("Data Prodi mencatat kapan diingatkan", !!ok("dp.dokDosen", {}, tAdm).dosen.find(y => y.id === dsn).diingatkan);
  cek("orang lain tidak bisa menutup pengingat milik dosen", /tidak ditemukan/.test(salah("pengingat.selesai", { id: P[0].id }, tD2)));
  j = ok("pengingat.selesai", { id: P[0].id }, tDsn);
  cek("dosen menandai pengingat selesai", j.pengingat.length === 0 && ok("tugas.saya", {}, tDsn).pengingat.length === 0);
  cek("migrasi: Pengingat", !!g.sheets.Pengingat);
}
