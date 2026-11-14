// Uji v0.4.0: bukti bersama, batas hari kerja, verifikasi data, pengingat. Dipanggil dari uji-keg.mjs (memakai data yang sama).
export function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tM2, tD2, tSA, siap, BIO_MHS }) {
  const pdf = n => Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(n || 50, 65)]).toString("base64");
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]).toString("base64");

  console.log("7. Bukti bersama (lomba mahasiswa, surat terbit)");
  const lombaId = ok("kegiatan.daftar", {}, tM).kegiatan.find(x => x.jenis === "prestasi_n").id;
  let k = ok("kegiatan.detail", { id: lombaId }, tM).kegiatan;
  cek("slot lomba: surat resmi, laporan mhs, hadir, foto, piagam + opsional (tanpa laporan dosen)", k.slot.map(s => s.k).join() === "st,lapmhs,hadir,foto,piagam,lain" && k.buktiPerlu === 5, k.slot.map(s => s.k));
  cek("status data draf, bisa unggah, batas 5 hari kerja (Sabtu 21 Nov → Jumat 27 Nov)", k.status === "draf" && k.bisaUnggah && k.batas === "2026-11-27", [k.status, k.batas]);
  cek("verifikator = dosen pendamping", k.verifikator === "Dosen pendamping" && !k.bisaVerifikasi);
  cek("bukan peserta tidak bisa unggah", /Hanya pengaju dan peserta/.test(salah("bukti.unggah", { id: lombaId, slot: "st", nama: "a.pdf", isi: pdf() }, tM2)));
  cek("ekstensi tidak didukung ditolak", /tidak didukung/.test(salah("bukti.unggah", { id: lombaId, slot: "st", nama: "a.html", isi: pdf() }, tM)));
  cek("isi palsu (.pdf berisi HTML) ditolak", /tidak sesuai/.test(salah("bukti.unggah", { id: lombaId, slot: "st", nama: "a.pdf", isi: Buffer.from("<html>").toString("base64") }, tM)));
  cek("lebih dari 10 MB ditolak", /10 MB/.test(salah("bukti.unggah", { id: lombaId, slot: "st", nama: "a.pdf", isi: pdf(10 * 1024 * 1024 + 10) }, tM)));
  cek("slot tak dikenal ditolak", /tidak dikenal/.test(salah("bukti.unggah", { id: lombaId, slot: "xx", nama: "a.pdf", isi: pdf() }, tM)));
  let j = ok("bukti.unggah", { id: lombaId, slot: "st", nama: "Surat Tugas 123.pdf", isi: pdf() }, tM);
  k = j.kegiatan;
  const st = k.slot.find(s => s.k === "st").isi;
  cek("terunggah: nama, ukuran, pengunggah, terkunci", st && st.t === "file" && st.nama === "Surat Tugas 123.pdf" && st.ukuran === 59 && st.milikSaya && st.bisaBatal, st);
  const f = Object.values(g.files).find(x => x.folder && x.nama.startsWith("Surat tugas resmi"));
  cek("file di Drive: Bukti / Ganjil 2026-2027 / <id> <judul>", f && f.folder.nama.startsWith(lombaId + " Lomba Tour") && Object.values(g.files).some(x => x.nama === "Ganjil 2026-2027"), f && f.folder.nama);
  const tM3 = siap("250110", "m3@contoh.id", BIO_MHS);
  cek("peserta lain: slot sudah diunggah → ditolak dengan nama pengunggah", /sudah diunggah oleh/.test(salah("bukti.unggah", { id: lombaId, slot: "st", nama: "b.pdf", isi: pdf() }, tM3)));
  cek("peserta lain tidak bisa membatalkan", /Hanya pengunggah/.test(salah("bukti.batal", { id: lombaId, slot: "st" }, tM3)));
  const lihat = ok("bukti.lihat", { id: lombaId, slot: "st" }, tDsn);
  cek("pendamping bisa melihat file (isi sama)", lihat.t === "file" && lihat.isi === pdf() && lihat.mime === "application/pdf");
  cek("mahasiswa lain tidak bisa melihat", /izin/.test(salah("bukti.lihat", { id: lombaId, slot: "st" }, tM2)));
  k = ok("bukti.batal", { id: lombaId, slot: "st" }, tM).kegiatan;
  cek("batal: slot kosong lagi, file dibuang ke sampah", !k.slot.find(s => s.k === "st").isi && f.terbuang);
  cek("tautan harus https", /https/.test(salah("bukti.unggah", { id: lombaId, slot: "foto", tautan: "http://contoh.id/x" }, tM3)));
  cek("keterangan 'tidak ada' minimal 5 huruf", /alasan/.test(salah("bukti.unggah", { id: lombaId, slot: "hadir", ket: "x" }, tM3)));
  ok("bukti.unggah", { id: lombaId, slot: "foto", tautan: "https://drive.google.com/drive/folders/abc" }, tM3);
  ok("bukti.unggah", { id: lombaId, slot: "st", nama: "st.pdf", isi: pdf() }, tM);
  ok("bukti.unggah", { id: lombaId, slot: "lapmhs", nama: "laporan.png", isi: png }, tM3);
  k = ok("kegiatan.akreditasi", { id: lombaId, data: { tingkat: "Internasional", isian: { Capaian: "Juara 1" }, gcet: [2] } }, tM).kegiatan;
  cek("pengaju melengkapi data akreditasi setelah terbit", k.tingkat === "Internasional" && k.isian.Capaian === "Juara 1" && k.bisaUbahAkreditasi);
  cek("peserta bukan pengaju tidak bisa ubah data akreditasi", /tidak bisa diubah/.test(salah("kegiatan.akreditasi", { id: lombaId, data: { tingkat: "Nasional" } }, tM3)));
  let t = ok("tugas.saya", {}, tM3);
  cek("pengingat peserta: bukti 3/5, batas, belum terlambat", t.tugas.some(x => x.jenis === "bukti" && x.id === lombaId && x.ada === 3 && x.perlu === 5 && !x.terlambat), t.tugas);
  ok("bukti.unggah", { id: lombaId, slot: "hadir", ket: "Lomba daring, tidak ada daftar hadir" }, tM3);
  j = ok("bukti.unggah", { id: lombaId, slot: "piagam", nama: "piagam.jpg", isi: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1]).toString("base64") }, tM);
  cek("bukti wajib lengkap → otomatis diajukan untuk verifikasi data", j.otomatis && j.kegiatan.status === "diajukan" && j.kegiatan.riwayat.some(r => r.aksi === "ajukan_data"), j.kegiatan.status);
  cek("setelah diajukan: unggah slot opsional ditolak", /tidak bisa diubah/.test(salah("bukti.unggah", { id: lombaId, slot: "lain", tautan: "https://x.id" }, tM)));
  cek("pengingat bukti hilang setelah lengkap", !ok("tugas.saya", {}, tM3).tugas.some(x => x.id === lombaId));

  console.log("8. Verifikasi data");
  cek("pendamping melihat di antrean verifikasi", ok("verifikasi.antrean", {}, tDsn).kegiatan.some(x => x.id === lombaId));
  cek("Admin tidak (sudah ada pendamping)", !ok("verifikasi.antrean", {}, tAdm).kegiatan.some(x => x.id === lombaId));
  cek("Admin memutuskan ditolak: diverifikasi pendamping", /dosen pendamping/.test(salah("verifikasi.putuskan", { id: lombaId, keputusan: "disetujui" }, tAdm)));
  cek("tugas.saya pendamping: 1 verifikasi", ok("tugas.saya", {}, tDsn).verifikasi === 1);
  cek("revisi tanpa catatan ditolak", /catatan/.test(salah("verifikasi.putuskan", { id: lombaId, keputusan: "revisi" }, tDsn)));
  k = ok("verifikasi.putuskan", { id: lombaId, keputusan: "revisi", catatan: "Piagam buram, unggah ulang." }, tDsn).kegiatan;
  cek("revisi: status revisi, peserta dapat pengingat dengan catatan", k.status === "revisi" && ok("tugas.saya", {}, tM).tugas.some(x => x.jenis === "revisiData" && x.catatan === "Piagam buram, unggah ulang."));
  cek("putuskan lagi saat revisi ditolak", /sudah diverifikasi/.test(salah("verifikasi.putuskan", { id: lombaId, keputusan: "disetujui" }, tDsn)));
  ok("bukti.batal", { id: lombaId, slot: "piagam" }, tM);
  k = ok("kegiatan.detail", { id: lombaId }, tM).kegiatan;
  cek("saat revisi: batal tidak mengubah status, ajukan ulang belum bisa", k.status === "revisi" && !k.bisaAjukanData);
  k = ok("bukti.unggah", { id: lombaId, slot: "piagam", nama: "piagam2.pdf", isi: pdf() }, tM).kegiatan;
  cek("revisi + lengkap: tidak otomatis, tombol ajukan ulang muncul", k.status === "revisi" && k.bisaAjukanData);
  k = ok("kegiatan.ajukanData", { id: lombaId }, tM3).kegiatan;
  cek("peserta mengajukan ulang → diajukan_ulang", k.status === "diajukan_ulang" && k.riwayat.some(r => r.aksi === "ajukan_ulang_data"));
  k = ok("verifikasi.putuskan", { id: lombaId, keputusan: "disetujui" }, tDsn).kegiatan;
  cek("disetujui: nama verifikator & tanggal tercatat", k.status === "disetujui" && /Gede Arya/.test(k.verifNama) && k.tglVerif);
  cek("setelah disetujui: bukti terkunci (batal ditolak)", /sudah diverifikasi/.test(salah("bukti.batal", { id: lombaId, slot: "piagam" }, tM)));
  cek("setelah disetujui: data akreditasi terkunci", /tidak bisa diubah/.test(salah("kegiatan.akreditasi", { id: lombaId, data: { tingkat: "Nasional" } }, tM)));

  // Kegiatan tanpa surat (publikasi dosen) → diverifikasi Admin; pengaju tidak boleh memverifikasi miliknya sendiri.
  const pub = ok("kegiatan.daftar", {}, tDsn).kegiatan.find(x => x.jenis === "publikasi" && x.status === "diajukan");
  cek("publikasi dosen di antrean Admin & KPS", ok("verifikasi.antrean", {}, tAdm).kegiatan.some(x => x.id === pub.id) && ok("verifikasi.antrean", {}, tKps).kegiatan.some(x => x.id === pub.id));
  cek("dosen biasa tidak melihat publikasi di antreannya", !ok("verifikasi.antrean", {}, tD2).kegiatan.length);
  k = ok("verifikasi.putuskan", { id: pub.id, keputusan: "revisi", catatan: "Lampirkan artikel PDF." }, tAdm).kegiatan;
  let d = ok("kegiatan.detail", { id: pub.id }, tDsn).kegiatan;
  cek("tanpa surat + revisi: pengaju bisa ubah formulir dan bukti", d.bisaUbah && d.bisaUnggah && d.status === "revisi");
  ok("bukti.batal", { id: pub.id, slot: "b2" }, tDsn);
  ok("bukti.unggah", { id: pub.id, slot: "b2", nama: "artikel.pdf", isi: pdf() }, tDsn);
  k = ok("kegiatan.simpan", { kirim: true, data: { jenis: "publikasi", id: pub.id, judul: "Strategi pemasaran digital", tgl: "2026-10-01", tingkat: "Nasional", perluST: false } }, tDsn).kegiatan;
  cek("formulir kirim saat revisi → diajukan_ulang", k.status === "diajukan_ulang" && k.st === "tanpa");
  cek("pengaju admin tidak bisa memverifikasi miliknya", (() => {
    const a = ok("kegiatan.simpan", { peran: "admin", data: { jenis: "iab", judul: "Rapat IAB 2027", tgl: "2026-10-05", tingkat: "Lokal/Wilayah", perluST: false } }, tAdm).kegiatan;
    a.slot.filter(s => !s.opsional).forEach(s => ok("bukti.unggah", { id: a.id, slot: s.k, ket: "Ada di arsip prodi" }, tAdm));
    ok("kegiatan.ajukanData", { id: a.id }, tAdm);
    return /sendiri/.test(salah("verifikasi.putuskan", { id: a.id, keputusan: "disetujui" }, tAdm)) && !ok("verifikasi.antrean", {}, tAdm).kegiatan.some(x => x.id === a.id)
      && ok("verifikasi.antrean", {}, tKps).kegiatan.some(x => x.id === a.id);
  })());
  k = ok("verifikasi.putuskan", { id: pub.id, keputusan: "ditolak", catatan: "Bukan publikasi ilmiah." }, tKps).kegiatan;
  cek("ditolak: final, tak bisa diubah/unggah/ajukan", k.status === "ditolak" && !ok("kegiatan.detail", { id: pub.id }, tDsn).kegiatan.bisaUbah && /tidak bisa diubah/.test(salah("bukti.unggah", { id: pub.id, slot: "lain", tautan: "https://x.id" }, tDsn)));
  cek("beralih ke surat tugas saat bukti sudah ada ditolak", (() => {
    const x = ok("kegiatan.simpan", { peran: "dosen", data: { jenis: "pkm", judul: "PKM desa", perluST: false } }, tDsn).kegiatan;
    ok("bukti.unggah", { id: x.id, slot: "b1", nama: "a.pdf", isi: pdf() }, tDsn);
    return /Batalkan dulu bukti/.test(salah("kegiatan.simpan", { data: { jenis: "pkm", id: x.id, judul: "PKM desa", perluST: true } }, tDsn));
  })());

  console.log("9. Batas hari kerja, keterlambatan, tunggakan di antrean KPS");
  const thk = g.ctx.tambahHariKerja;
  cek("Kamis 3 Des + 5 hari kerja = Kamis 10 Des", thk("2026-12-03", 5, []) === "2026-12-10");
  cek("23 Des + 5 hari kerja, libur 25 Des = 31 Des", thk("2026-12-23", 5, ["2026-12-25"]) === "2026-12-31");
  cek("Jumat + 1 hari kerja = Senin", thk("2026-11-13", 1, []) === "2026-11-16");
  cek("pengaturan hariLibur terbaca", g.ctx.pengaturanSurat().libur.join() === "2026-12-25,2027-01-01" && g.ctx.pengaturanSurat().hk === 5);
  const lama = ok("kegiatan.simpan", { peran: "dosen", kirim: true, data: { jenis: "pkm", judul: "PKM lama", tgl: "2026-01-05", tingkat: "Lokal/Wilayah", perluST: true,
    pegawai: [ID("199001152015041001")], tempat: "Gianyar", bentuk: "Pengabdian" } }, tDsn).kegiatan;
  ok("kps.putuskan", { id: lama.id, keputusan: "terbit" }, tKps);
  t = ok("tugas.saya", {}, tDsn);
  const tl = t.tugas.find(x => x.id === lama.id);
  cek("bukti lewat batas → pengingat terlambat, diurutkan paling atas", tl && tl.terlambat && tl.batas === "2026-01-12" && t.tugas[0].id === lama.id, t.tugas.slice(0, 2));
  cek("slot dosen: laporan penugasan dosen + MoU mitra (PKM)", ok("kegiatan.detail", { id: lama.id }, tDsn).kegiatan.slot.map(s => s.k).join() === "st,lapdosen,hadir,foto,mitra,lain");
  const baru = ok("kegiatan.simpan", { peran: "dosen", kirim: true, data: { jenis: "pkm", judul: "PKM baru", tgl: "2026-12-10", tingkat: "Lokal/Wilayah", perluST: true,
    pegawai: [ID("199001152015041001"), ID("198001012005011009")], tempat: "Bangli", bentuk: "Pengabdian" } }, tD2).kegiatan;
  const aq = ok("kps.antrean", {}, tKps).kegiatan.find(x => x.id === baru.id);
  cek("antrean KPS menunjukkan tunggakan peserta (pengaju berbeda)", aq && aq.tunggakan.length === 1 && aq.tunggakan[0].id === lama.id, aq && aq.tunggakan);
  cek("tugas.saya KPS: hitungan antrean", ok("tugas.saya", {}, tKps).kps >= 1);
  cek("daftar kegiatan memuat ringkasan bukti", ok("kegiatan.daftar", {}, tDsn).kegiatan.find(x => x.id === lama.id).terlambat === true);
  cek("superadmin tanpa peran kegiatan? tugas kosong tetap ok", Array.isArray(ok("tugas.saya", {}, tSA).tugas));
}
