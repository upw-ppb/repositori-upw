// Uji v0.9.0: akun asesor (baca saja, berkedaluwarsa, tercatat).
export function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tSA }) {
  console.log("16. Akun asesor");
  const tgl = n => new Date(Date.now() + n * 864e5).toLocaleDateString("sv-SE", { timeZone: "Asia/Makassar" });
  cek("hanya Super Admin yang bisa membuat", /izin/.test(salah("asesor.buat", { nama: "A", berlakuSampai: tgl(10) }, tAdm)) && /izin/.test(salah("asesor.buat", { nama: "A", berlakuSampai: tgl(10) }, tKps)));
  cek("maks 90 hari", /maksimal 90 hari/.test(salah("asesor.buat", { nama: "A", berlakuSampai: tgl(120) }, tSA)));
  cek("tanggal lampau ditolak", /sebelum hari ini/.test(salah("asesor.buat", { nama: "A", berlakuSampai: tgl(-1) }, tSA)));
  cek("nama wajib", /nama asesor/.test(salah("asesor.buat", { nama: "", berlakuSampai: tgl(10) }, tSA)));
  const b = ok("asesor.buat", { nama: "Prof. Dr. Ni Made Ayu Lestari, M.Par.", instansi: "LAMWisata", berlakuSampai: tgl(30) }, tSA);
  cek("nama pengguna dari nama depan tanpa gelar", /^asesor-made-\d\d$/.test(b.username) && /^Asr-/.test(b.sandiSementara), b.username);
  let j = g.panggil("masuk", { username: b.username, sandi: b.sandiSementara });
  cek("masuk langsung (tanpa aktivasi email), wajib ganti sandi", j.ok && j.pengguna.wajibGanti && !j.pengguna.perluAktivasi && j.pengguna.berlakuSampai === tgl(30) && j.pengguna.instansi === "LAMWisata", j);
  let tA = j.token;
  cek("sebelum ganti sandi: data ditolak", /Ganti kata sandi/.test(salah("ilkps.data", {}, tA)));
  ok("ganti.sandi", { sandiBaru: "Asesor2026x" }, tA);
  j = ok("ilkps.data", {}, tA);
  cek("asesor melihat Tabel iLKPS, tidak boleh atur TS", j.tabel.length === 33 && j.bolehAtur === false && /izin/.test(salah("ilkps.ts", { ts: 2024 }, tA)));
  const dis = ok("kegiatan.disetujui", {}, tA).kegiatan;
  cek("daftar kegiatan disetujui saja", dis.length > 0 && dis.every(k => k.status === "disetujui"), dis.map(k => k.status));
  const lomba = dis.find(k => k.jenis === "prestasi_n");
  const det = ok("kegiatan.detail", { id: lomba.id }, tA).kegiatan;
  cek("detail kegiatan disetujui: baca saja", !det.bisaUbah && !det.bisaUnggah && !det.bisaVerifikasi && !det.bisaUbahAkreditasi && !det.bisaHapus);
  const slotFile = det.slot.find(s => s.isi && s.isi.t === "file");
  cek("asesor bisa membuka bukti file", ok("bukti.lihat", { id: lomba.id, slot: slotFile.k }, tA).t === "file");
  const belum = ok("kegiatan.daftar", { lingkup: "semua" }, tAdm).kegiatan.find(k => k.status !== "disetujui");
  cek("kegiatan belum disetujui: detail & bukti ditolak", /izin/.test(salah("kegiatan.detail", { id: belum.id }, tA)) && /izin/.test(salah("bukti.lihat", { id: belum.id, slot: "st" }, tA)));
  cek("tidak bisa: daftar kegiatan, portofolio, Data Prodi, unggah, verifikasi, tanda tangan", ["kegiatan.daftar", "portofolio.saya", "dp.data", "ttd.saya", "verifikasi.antrean"].every(a => /izin/.test(salah(a, {}, tA)))
    && /izin/.test(salah("bukti.unggah", { id: lomba.id, slot: "lain", tautan: "https://x.id" }, tA)) && /izin/.test(salah("verifikasi.putuskan", { id: lomba.id, keputusan: "ditolak", catatan: "x" }, tA)));
  cek("tidak bisa mengelola pengguna", /izin/.test(salah("admin.pengguna", {}, tA)) && /izin/.test(salah("asesor.daftar", {}, tA)));
  ok("direktori", {}, tA);
  const D = ok("asesor.daftar", {}, tSA), a = D.asesor.find(x => x.username === b.username);
  cek("Super Admin melihat asesor + jumlah akses + log", a && a.akses >= 5 && !a.kedaluwarsa && D.log.some(l => l.aksi === "asesor.lihatBukti") && D.log.some(l => l.aksi === "asesor.ilkps") && D.log.some(l => l.aksi === "asesor.direktori"), [a, D.log.map(l => l.aksi)]);
  cek("perpanjang > 90 hari ditolak", /maksimal/.test(salah("asesor.ubah", { userId: a.id, berlakuSampai: tgl(91) }, tSA)));
  ok("asesor.ubah", { userId: a.id, berlakuSampai: tgl(60) }, tSA);
  cek("perpanjang 60 hari", ok("asesor.daftar", {}, tSA).asesor.find(x => x.id === a.id).berlakuSampai === tgl(60));
  ok("asesor.ubah", { userId: a.id, aktif: false }, tSA);
  cek("nonaktif: sesi berakhir, tidak bisa masuk", /tidak aktif|Sesi berakhir/.test(salah("ilkps.data", {}, tA)) && /salah/.test(salah("masuk", { username: b.username, sandi: "Asesor2026x" })));
  ok("asesor.ubah", { userId: a.id, aktif: true }, tSA);
  tA = ok("masuk", { username: b.username, sandi: "Asesor2026x" }).token;
  // kedaluwarsa: ubah langsung tanggal di sheet ke kemarin
  const row = g.ctx.cari("Pengguna", x => x.id === a.id); g.ctx.ubah("Pengguna", row, { berlakuSampai: tgl(-1) });
  cek("kedaluwarsa: sesi lama ditolak dengan pesan jelas", /Masa akses asesor sudah berakhir/.test(salah("ilkps.data", {}, tA)));
  cek("kedaluwarsa: masuk ditolak, tercatat", /sudah berakhir/.test(salah("masuk", { username: b.username, sandi: "Asesor2026x" })) && ok("asesor.daftar", {}, tSA).log.some(l => l.aksi === "asesor.masukDitolak"));
  cek("daftar asesor menandai kedaluwarsa", ok("asesor.daftar", {}, tSA).asesor.find(x => x.id === a.id).kedaluwarsa === true);
  cek("asesor tidak muncul di daftar kegiatan Admin sebagai orang (jenis biodata kosong)", !ok("kegiatan.ref", { peran: "admin" }, tAdm).pegawai.some(x => x.id === a.id));
  cek("migrasi: kolom berlakuSampai, instansi di akhir Pengguna; SKEMA_VERSI 8", g.sheets.Pengguna[0].slice(-2).join() === "berlakuSampai,instansi" && !!g.props.SKEMA_VERSI);
}
