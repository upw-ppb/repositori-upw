// Uji v0.29.0: data dan bukti dosen praktisi (Matriks butir 16, DED Tabel 2); MK diampu TS-2 s.d. TS di Tabel 1–3.
export function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tD2, tSA }) {
  console.log("39. Data dan bukti dosen praktisi; MK diampu TS-2 s.d. TS");
  const pdf = n => Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(n || 50, 65)]).toString("base64");
  cek("migrasi: kolom praktisi baru di akhir; SKEMA_VERSI 23", g.sheets.Praktisi[0].slice(-6).join() === "jabatan,pengalaman,memimpinTim,penerbit,kerjaSama,bukti" && Number(g.props.SKEMA_VERSI) >= 23);
  const dasar = { nama: "Ni Luh Uji Praktisi, S.Par.", perusahaan: "PT Uji Wisata Bali", pendidikan: "S1 Pariwisata", bidang: "Tour operation", sertifikat: "Tour Leader" };
  cek("lama pengalaman harus angka tahun", /angka tahun/.test(salah("dp.praktisiSimpan", { data: { ...dasar, pengalaman: "lima" } }, tAdm)) && /angka tahun/.test(salah("dp.praktisiSimpan", { data: { ...dasar, pengalaman: "99" } }, tAdm)));
  ok("dp.praktisiSimpan", { data: { ...dasar, jabatan: "General Manager", pengalaman: "12", memimpinTim: true, penerbit: "BNSP", kerjaSama: "PKS No. 12/PPB/2026" } }, tAdm);
  let D = ok("dp.data", {}, tAdm), x = D.praktisi.find(p => p.nama === dasar.nama);
  cek("isian baru tersimpan (jabatan, pengalaman, memimpin tim, penerbit, kerja sama)", x && x.jabatan === "General Manager" && x.pengalaman === 12 && x.memimpinTim === true && x.penerbit === "BNSP" && x.kerjaSama === "PKS No. 12/PPB/2026", x);
  cek("memenuhi kriteria Matriks butir 16; daftar 5 jenis bukti", x.memenuhi === true && D.slotBuktiPraktisi.map(s => s.k).join() === "cv,ijazah,sertifikat,jabatan,kerjasama");
  ok("dp.praktisiSimpan", { data: { id: x.id, ...dasar, nama: dasar.nama } }, tAdm);
  x = ok("dp.data", {}, tAdm).praktisi.find(p => p.id === x.id);
  cek("simpan tanpa isian baru (tampilan lama) tidak menghapus isian baru", x.jabatan === "General Manager" && x.pengalaman === 12 && x.penerbit === "BNSP");
  ok("dp.praktisiSimpan", { data: { id: x.id, ...dasar, pengalaman: "3", memimpinTim: false } }, tAdm);
  cek("pengalaman 3 tahun tanpa memimpin tim: belum memenuhi kriteria", ok("dp.data", {}, tAdm).praktisi.find(p => p.id === x.id).memenuhi === false);
  ok("dp.praktisiSimpan", { data: { id: x.id, ...dasar, pengalaman: "12", memimpinTim: true } }, tAdm);

  // Bukti
  cek("KPS tidak bisa mengunggah bukti praktisi", /izin/.test(salah("dp.praktisiBukti", { id: x.id, slot: "cv", berkas: { nama: "cv.pdf", isi: pdf() } }, tKps)));
  cek("jenis bukti tak dikenal ditolak", /tidak dikenal/.test(salah("dp.praktisiBukti", { id: x.id, slot: "ktp", berkas: { nama: "a.pdf", isi: pdf() } }, tAdm)));
  cek("berkas Word ditolak; isi palsu ditolak", /PDF atau gambar/.test(salah("dp.praktisiBukti", { id: x.id, slot: "cv", berkas: { nama: "cv.docx", isi: pdf() } }, tAdm))
    && /tidak sesuai/.test(salah("dp.praktisiBukti", { id: x.id, slot: "cv", berkas: { nama: "cv.pdf", isi: Buffer.from("<html>").toString("base64") } }, tAdm)));
  cek("tautan harus https", /https/.test(salah("dp.praktisiBukti", { id: x.id, slot: "kerjasama", tautan: "http://x" }, tAdm)));
  let j = ok("dp.praktisiBukti", { id: x.id, slot: "cv", berkas: { nama: "CV Ni Luh.pdf", isi: pdf() } }, tAdm);
  const f1 = Object.values(g.files).find(f => /^cv - CV Ni Luh\.pdf$/.test(f.nama || ""));
  cek("CV terunggah ke Drive Praktisi/<nama>", j.bukti.cv && j.bukti.cv.t === "file" && j.bukti.cv.nama === "CV Ni Luh.pdf" && f1 && /Ni Luh Uji Praktisi/.test(f1.folder.nama), f1 && f1.folder.nama);
  j = ok("dp.praktisiBukti", { id: x.id, slot: "cv", berkas: { nama: "CV terbaru.pdf", isi: pdf(80) } }, tAdm);
  cek("ganti CV: berkas lama ke sampah Drive", j.bukti.cv.nama === "CV terbaru.pdf" && f1.terbuang === true);
  ok("dp.praktisiBukti", { id: x.id, slot: "kerjasama", tautan: "https://drive.google.com/pks-12" }, tAdm);
  ok("dp.praktisiBukti", { id: x.id, slot: "ijazah", berkas: { nama: "ijazah.pdf", isi: pdf() } }, tAdm);
  x = ok("dp.data", {}, tKps).praktisi.find(p => p.id === x.id);
  cek("KPS melihat ringkasan bukti tanpa fileId", x.bukti.cv.t === "file" && !("fileId" in x.bukti.cv) && x.bukti.kerjasama.url === "https://drive.google.com/pks-12" && x.bukti.ijazah);
  const L = ok("dp.praktisiBuktiLihat", { id: x.id, slot: "cv" }, tKps);
  cek("bukti bisa dibuka (KPS)", L.mime === "application/pdf" && L.isi && L.nama === "CV terbaru.pdf");
  cek("mahasiswa tidak bisa membuka bukti praktisi", /izin/.test(salah("dp.praktisiBuktiLihat", { id: x.id, slot: "cv" }, tM)));
  const fIj = Object.values(g.files).find(f => f.nama === "ijazah - ijazah.pdf");
  j = ok("dp.praktisiBukti", { id: x.id, slot: "ijazah", hapus: true }, tAdm);
  cek("hapus bukti: hilang dari daftar, berkas ke sampah", !j.bukti.ijazah && fIj && fIj.terbuang === true);

  // MK diampu TS-2 s.d. TS (TS = 2040); sks EWMP tetap TS saja.
  const dsn = ID("199001152015041001"), d3 = ID("197911302005012001");
  ok("dp.mkSimpan", { data: { kode: "UPW991", nama: "Uji Rentang TS", semester: 1, sksKuliah: 2, sksPraktik: 1, kompetensi: true } }, tAdm);
  ok("dp.timSimpan", { semester: "2038-1", kodeMk: "UPW991", anggota: [{ t: "u", id: dsn }, { t: "p", id: x.id }] }, tAdm);   // TS-2
  ok("dp.timSimpan", { semester: "2037-1", kodeMk: "UPW991", anggota: [{ t: "u", id: d3 }] }, tAdm);                           // TS-3 (tidak ikut)
  const I = ok("ilkps.data", { ts: 2040 }, tAdm), T = Object.fromEntries(I.tabel.map(t => [t.kode, t]));
  const kol = (t, re) => T[t].kolom.findIndex(k => re.test(k));
  const namaDsn = ok("dp.data", {}, tAdm).dosen.find(o => o.id === dsn).nama;
  const r1 = T["1"].baris.find(r => r[1] === namaDsn), r2 = T["2"].baris.find(r => r[1] === dasar.nama);
  cek("Tabel 1: MK diampu TS-2 ikut tercantum", r1 && /UPW991/.test(r1[kol("1", /Diampu pada PS yang Diakreditasi/)]), r1);
  cek("Tabel 2: MK TS-2, bobot 3 sks, sertifikat dengan penerbit", r2 && /UPW991/.test(r2[kol("2", /Mata Kuliah yang Diampu/)]) && r2[kol("2", /Bobot/)] === 3 && r2[kol("2", /Sertifikat/)] === "Tour Leader (BNSP)", r2);
  cek("MK TS-3 tidak ikut", !T["1"].baris.concat(T["3"].baris).some(r => r.join(" ").includes("UPW991") && r[1] !== namaDsn));
  const dt = ok("dp.data", { ta: 2040 }, tAdm).dosenTs.find(o => o.id === dsn);
  cek("Data dosen TS (EWMP): MK TS-2 tidak dihitung sebagai beban TS", dt && !dt.mk.some(m => /UPW991/.test(m)) && dt.sksPsHitung === 0, dt);
  ok("dp.timSimpan", { semester: "2038-1", kodeMk: "UPW991", anggota: [] }, tAdm);
  ok("dp.timSimpan", { semester: "2037-1", kodeMk: "UPW991", anggota: [] }, tAdm);
  ok("dp.mkHapus", { kode: "UPW991" }, tAdm);
  ok("dp.praktisiHapus", { id: x.id }, tAdm);
}
