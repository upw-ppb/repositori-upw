// Uji v0.37.0: perbaikan (edit) riwayat status mahasiswa — bukti, tanggal, alasan, status tujuan (perubahan terakhir), satu atau semua dalam perubahan yang sama; Log.
export function jalankan({ g, cek, ok, salah, tKps, tAdm, tSA }) {
  console.log("48. Edit riwayat status mahasiswa");
  ok("admin.impor", { baris: [{ username: "269901", nama: "Uji Koreksi Satu", masuk: 2026, kelas: "A", peran: "mahasiswa" }, { username: "269902", nama: "Uji Koreksi Dua", masuk: 2026, kelas: "A", peran: "mahasiswa" }] }, tAdm);
  const P = ok("admin.pengguna", {}, tAdm).pengguna, m1 = P.find(x => x.username === "269901"), m2 = P.find(x => x.username === "269902");
  const pdf = s => Buffer.concat([Buffer.from("%PDF-1.4\n" + s), Buffer.alloc(40)]).toString("base64");
  cek("migrasi: kolom koreksi di akhir RiwayatStatusMhs; SKEMA_VERSI ≥ 27", g.sheets.RiwayatStatusMhs[0].at(-1) === "koreksi" && Number(g.props.SKEMA_VERSI) >= 27);
  ok("admin.statusMhs", { userIds: [m1.id, m2.id], statusMhs: "D", tanggal: "2026-11-10", alasan: "Drop out sesuai SK Direktur", berkas: { nama: "SK salah.pdf", isi: pdf("salah") } }, tAdm);
  const riw = id => ok("admin.riwayatStatusMhs", { userId: id }, tAdm).riwayat;
  let r1 = riw(m1.id)[0];
  const fLama = Object.values(g.files).find(f => /SK salah\.pdf$/.test(f.nama || ""));
  cek("riwayat: perubahan terakhir ditandai, 2 mahasiswa dalam perubahan yang sama, belum ada koreksi", r1.terakhir === true && r1.sebatch === 2 && r1.koreksi.length === 0 && r1.bukti.nama === "SK salah.pdf");
  const dasar = { id: r1.id, tanggal: "2026-11-10", alasan: "Drop out sesuai SK Direktur", buktiMode: "tetap", alasanKoreksi: "Salah unggah SK, diganti" };
  cek("hanya Admin Prodi / Super Admin; alasan perbaikan wajib; tanpa perubahan ditolak", /izin/.test(salah("admin.statusMhsKoreksi", dasar, tKps))
    && /alasan perbaikan/.test(salah("admin.statusMhsKoreksi", Object.assign({}, dasar, { alasanKoreksi: "" }), tAdm)) && /Tidak ada yang berubah/.test(salah("admin.statusMhsKoreksi", dasar, tAdm)));
  let j = ok("admin.statusMhsKoreksi", Object.assign({}, dasar, { buktiMode: "file", berkas: { nama: "SK benar.pdf", isi: pdf("benar") }, semuaBatch: true }), tAdm);
  r1 = riw(m1.id)[0]; const r2 = riw(m2.id)[0];
  cek("ganti SK untuk semua dalam perubahan yang sama: 2 riwayat diperbaiki, file lama ke Sampah Drive", j.diperbaiki === 2 && j.fileDibuang === 1 && fLama.terbuang === true
    && r1.bukti.nama === "SK benar.pdf" && r2.bukti.nama === "SK benar.pdf", j);
  cek("riwayat koreksi tersimpan (siapa, alasan, bagian yang diubah) dan nilai sebelum disimpan di sheet", r1.koreksi.length === 1 && r1.koreksi[0].alasan === "Salah unggah SK, diganti" && r1.koreksi[0].ubah.join() === "bukti"
    && /SK salah\.pdf/.test(JSON.parse(g.sheets.RiwayatStatusMhs.slice(1).find(x => x[0] === r1.id).at(-1))[0].sebelum.bukti));
  cek("perbaikan tercatat di Log", g.sheets.Log.slice(1).some(x => /admin\.statusMhsKoreksi/.test(x.join("|")) && /Salah unggah SK/.test(x.join("|"))));
  ok("admin.statusMhsKoreksi", { id: r1.id, tanggal: "2026-11-12", alasan: "Mengundurkan diri, surat 12 Nov", ke: "K", buktiMode: "tetap", alasanKoreksi: "Salah pilih status: seharusnya mengundurkan diri" }, tAdm);
  r1 = riw(m1.id)[0];
  const akun1 = ok("admin.pengguna", {}, tAdm).pengguna.find(x => x.id === m1.id), akun2 = ok("admin.pengguna", {}, tAdm).pengguna.find(x => x.id === m2.id);
  cek("status tujuan perubahan terakhir diperbaiki (D → K): akun mahasiswa ikut berubah; mahasiswa lain tidak", r1.ke === "K" && r1.tanggal === "2026-11-12" && akun1.statusMhs === "K" && akun2.statusMhs === "D" && riw(m2.id)[0].ke === "D");
  ok("admin.statusMhs", { userIds: [m1.id], statusMhs: "A", alasan: "Aktif kembali setelah banding" }, tAdm);
  const lama = riw(m1.id).find(x => x.id === r1.id);
  cek("riwayat lama: status tujuan tidak bisa diubah, tetapi tanggal/alasan/bukti bisa", !lama.terakhir
    && /perubahan terakhir/.test(salah("admin.statusMhsKoreksi", { id: lama.id, tanggal: lama.tanggal, alasan: lama.alasan, ke: "W", buktiMode: "tetap", alasanKoreksi: "Coba ubah status lama" }, tAdm))
    && ok("admin.statusMhsKoreksi", { id: lama.id, tanggal: lama.tanggal, alasan: lama.alasan, buktiMode: "tautan", tautan: "https://drive.google.com/sk-benar", alasanKoreksi: "Bukti dipindah ke tautan Drive" }, tSA).diperbaiki === 1);
  const rr = riw(m1.id).find(x => x.id === lama.id), sk2 = Object.values(g.files).find(f => /SK benar\.pdf$/.test(f.nama || ""));
  cek("file bukti yang masih dipakai mahasiswa lain TIDAK dibuang", rr.bukti.t === "tautan" && sk2 && sk2.terbuang === false && riw(m2.id)[0].bukti.nama === "SK benar.pdf");
  cek("tautan tidak sah dan status tujuan = status asal ditolak", /https/.test(salah("admin.statusMhsKoreksi", { id: lama.id, tanggal: lama.tanggal, alasan: lama.alasan, buktiMode: "tautan", tautan: "drive.google.com/x", alasanKoreksi: "Coba tautan salah" }, tAdm))
    && /sama dengan status sebelumnya/.test(salah("admin.statusMhsKoreksi", { id: riw(m1.id)[0].id, tanggal: "2026-11-20", alasan: "Aktif kembali setelah banding", ke: "K", buktiMode: "tetap", alasanKoreksi: "Coba status sama" }, tAdm)));
}
