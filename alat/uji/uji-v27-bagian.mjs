// Uji v0.27.0: status mahasiswa dengan alasan, bukti, riwayat; banyak sekaligus.
export function jalankan({ g, cek, ok, salah, tKps, tDsn, tAdm, tM, tSA }) {
  console.log("37. Status mahasiswa dengan alasan dan bukti");
  const P = ok("admin.pengguna", {}, tAdm).pengguna.filter(x => x.jenisBiodata === "mahasiswa");
  const m = P.find(x => x.username === "250107"), m2 = P.find(x => x.username === "250201");
  cek("hanya Admin Prodi / Super Admin", /izin/.test(salah("admin.statusMhs", { userIds: [m.id], statusMhs: "C", alasan: "Cuti akademik" }, tKps)) && /izin/.test(salah("admin.statusMhs", { userIds: [m.id], statusMhs: "C", alasan: "Cuti akademik" }, tM)));
  cek("alasan wajib; status dikenal; tanggal sah", /alasan/.test(salah("admin.statusMhs", { userIds: [m.id], statusMhs: "C", alasan: "" }, tAdm))
    && /tidak dikenal/.test(salah("admin.statusMhs", { userIds: [m.id], statusMhs: "X", alasan: "Cuti akademik" }, tAdm))
    && /Tanggal/.test(salah("admin.statusMhs", { userIds: [m.id], statusMhs: "C", alasan: "Cuti akademik", tanggal: "kemarin" }, tAdm)));
  const sa = ok("saya", {}, tSA).pengguna;
  cek("akun bukan mahasiswa ditolak", /bukan mahasiswa/.test(salah("admin.statusMhs", { userIds: [sa.id], statusMhs: "C", alasan: "Cuti akademik" }, tSA)));
  const pdf = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(40)]).toString("base64");
  cek("bukti harus PDF/gambar sesuai isi", /tidak sesuai/.test(salah("admin.statusMhs", { userIds: [m.id], statusMhs: "C", alasan: "Cuti akademik", berkas: { nama: "sk.png", isi: pdf } }, tAdm)));
  let j = ok("admin.statusMhs", { userIds: [m.id], statusMhs: "C", tanggal: "2026-09-01", alasan: "Cuti akademik semester ganjil, surat permohonan orang tua", berkas: { nama: "Surat cuti.pdf", isi: pdf } }, tAdm);
  cek("satu mahasiswa diubah ke Cuti dengan bukti file", j.diubah === 1 && ok("admin.pengguna", {}, tAdm).pengguna.find(x => x.id === m.id).statusMhs === "C");
  j = ok("admin.statusMhs", { userIds: [m.id, m2.id], statusMhs: "L", tanggal: "2026-08-20", alasan: "Lulus yudisium 20 Agustus 2026", tautan: "https://drive.google.com/sk-yudisium" }, tAdm);
  cek("banyak sekaligus (tautan bukti)", j.diubah === 2);
  j = ok("admin.statusMhs", { userIds: [m.id], statusMhs: "L", alasan: "Lulus yudisium (ulang)" }, tAdm);
  cek("status sama tidak dicatat ulang", j.diubah === 0 && j.sama === 1);
  const R = ok("admin.riwayatStatusMhs", { userId: m.id }, tAdm).riwayat;
  cek("riwayat status: dua perubahan berurutan, dengan bukti", R.length === 2 && R[0].ke === "L" && R[0].bukti.t === "tautan" && R[1].ke === "C" && R[0].dari === "C" && R[1].bukti.t === "file" && R[1].oleh);
  const b = ok("admin.buktiStatusMhs", { id: R[1].id }, tAdm);
  cek("bukti file bisa dibuka Admin", b.mime === "application/pdf" && b.isi);
  cek("mahasiswa berstatus Lulus tidak dihitung aktif di Penilaian", ok("penilaian.data", {}, tSA).ringkas.NM >= 0);
  ok("admin.statusMhs", { userIds: [m.id, m2.id], statusMhs: "A", alasan: "Kembali aktif untuk uji lanjutan" }, tAdm);
  cek("migrasi: RiwayatStatusMhs; SKEMA_VERSI ≥ 21", g.sheets.RiwayatStatusMhs && Number(g.props.SKEMA_VERSI) >= 21);
}
