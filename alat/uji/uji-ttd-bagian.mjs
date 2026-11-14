// Uji v0.5.0: tanda tangan KPS (tersandi di Drive) dan penempelan di surat.
export function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tSA }) {
  console.log("10. Tanda tangan KPS");
  const png = n => "data:image/png;base64," + Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(n || 40, 7)]).toString("base64");
  cek("bukan KPS (Admin, Super Admin, dosen) tidak bisa membuka", [tAdm, tSA, tDsn].every(t => /izin/.test(salah("ttd.saya", {}, t))));
  let j = ok("ttd.saya", {}, tKps);
  cek("awal: belum ada, log berisi surat lama tanpa tanda tangan? (kosong)", !j.ada && j.pemakaian.length === 0, j);
  cek("tugas.saya KPS: ttd false", ok("tugas.saya", {}, tKps).ttd === false);
  cek("tanpa centang persetujuan ditolak", /persetujuan/.test(salah("ttd.simpan", { gambar: png() }, tKps)));
  cek("bukan PNG ditolak", /PNG|terbaca/.test(salah("ttd.simpan", { gambar: "data:image/png;base64," + Buffer.from("<svg>").toString("base64"), setuju: true }, tKps)));
  cek("lebih dari 300 KB ditolak", /terlalu besar/.test(salah("ttd.simpan", { gambar: png(310 * 1024), setuju: true }, tKps)));
  j = ok("ttd.simpan", { gambar: png(), setuju: true, cara: "gambar" }, tKps);
  cek("tersimpan dan terbaca kembali sama persis", j.ada && j.gambar === png() && j.cara === "gambar");
  const f = Object.values(g.files).find(x => /^ttd-t/.test(x.nama || ""));
  const asli = Buffer.from(png().split(",")[1], "base64");
  cek("berkas di Drive (folder Tanda Tangan) tersandi, bukan PNG", f && f.folder.nama === "Tanda Tangan" && Buffer.from(f.isi.map(b => b & 255)).compare(asli) !== 0 && (f.isi[0] & 255) !== 0x89);
  cek("kunci sandi di Script Properties, tidak di sheet", g.props.KUNCI_TTD && !JSON.stringify(g.sheets.TandaTangan).includes(g.props.KUNCI_TTD));
  // surat baru disetujui → memakai tanda tangan
  const k = ok("kegiatan.simpan", { peran: "dosen", kirim: true, data: { jenis: "kepakaran", judul: "Narasumber lokakarya", tgl: "2026-12-15", tingkat: "Lokal/Wilayah", perluST: true,
    pegawai: [ID("199001152015041001")], tempat: "Denpasar", bentuk: "Narasumber" } }, tDsn).kegiatan;
  const t = ok("kps.putuskan", { id: k.id, keputusan: "terbit" }, tKps).kegiatan;
  cek("lampiran surat mencatat id tanda tangan", /^t/.test(t.lampiran.ttd || ""), t.lampiran);
  cek("peserta surat bisa mengambil gambar tanda tangan untuk surat", ok("surat.ttd", { id: k.id }, tDsn).gambar === png());
  cek("orang tak terlibat tidak bisa", /izin/.test(salah("surat.ttd", { id: k.id }, tM)));
  cek("log pemakaian memuat surat ini", ok("ttd.saya", {}, tKps).pemakaian.some(x => x.id === k.id && x.kode === t.kodeSurat));
  // ganti tanda tangan → surat lama tetap memakai versi lama
  j = ok("ttd.simpan", { gambar: png(60), setuju: true, cara: "unggah" }, tKps);
  cek("ganti: gambar aktif baru", j.gambar === png(60) && j.cara === "unggah");
  cek("surat lama tetap memakai tanda tangan lama", ok("surat.ttd", { id: k.id }, tDsn).gambar === png());
  cek("log pemakaian tetap memuat surat lama setelah ganti", ok("ttd.saya", {}, tKps).pemakaian.some(x => x.id === k.id));
  j = ok("ttd.hapus", {}, tKps);
  cek("hapus: tidak ada tanda tangan aktif", !j.ada && ok("tugas.saya", {}, tKps).ttd === false);
  cek("surat lama masih utuh setelah hapus", ok("surat.ttd", { id: k.id }, tDsn).gambar === png());
  const k2 = ok("kegiatan.simpan", { peran: "dosen", kirim: true, data: { jenis: "kepakaran", judul: "Narasumber kedua", tgl: "2026-12-16", tingkat: "Lokal/Wilayah", perluST: true,
    pegawai: [ID("199001152015041001")], tempat: "Denpasar", bentuk: "Narasumber" } }, tDsn).kegiatan;
  const t2 = ok("kps.putuskan", { id: k2.id, keputusan: "terbit" }, tKps).kegiatan;
  cek("tanpa tanda tangan aktif: surat tanpa gambar (pernyataan elektronik saja)", !t2.lampiran.ttd && ok("surat.ttd", { id: k2.id }, tDsn).gambar === "");
  cek("hapus dua kali ditolak", /Belum ada/.test(salah("ttd.hapus", {}, tKps)));
  cek("migrasi: sheet TandaTangan ada", !!g.sheets.TandaTangan);
}
