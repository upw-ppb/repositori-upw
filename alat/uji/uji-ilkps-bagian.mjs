// Uji v0.7.0: Tabel iLKPS dari kegiatan disetujui.
export function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tD2, tSA }) {
  console.log("13. Tabel iLKPS");
  cek("dosen dan mahasiswa tidak bisa membuka", /izin/.test(salah("ilkps.data", {}, tDsn)) && /izin/.test(salah("ilkps.data", {}, tM)));
  let j = ok("ilkps.data", {}, tAdm);
  cek("TS bawaan = tahun akademik lalu (2025/2026), rentang 3 TA", j.ts.label === "2025/2026" && j.ts.rentang.join() === "2023/2024,2024/2025,2025/2026" && j.bolehAtur, j.ts);
  cek("tabel lengkap: 7a,7b,12,13,14,15-1..4,15a,16,17,18,19,20-1..3,23", j.tabel.map(t => t.kode).filter(k => !/^(8|9|10[abc]|ref11a|11|21|22)$/.test(k)).join() === "1,2,3,4,5,6,7a,7b,12,13,14,15-1,15-2,15-3,15-4,15a,16,17,18,19,20-1,20-2,20-3,23", j.tabel.map(t => t.kode));
  // buat kegiatan tanpa surat yang disetujui Admin
  const setuju = (t, peran, data) => {
    const k = ok("kegiatan.simpan", { peran, data: { perluST: false, tingkat: "Nasional", ...data } }, t).kegiatan;
    k.slot.filter(s => !s.opsional).forEach(s => ok("bukti.unggah", { id: k.id, slot: s.k, ket: "Ada di arsip prodi" }, t));
    ok("kegiatan.ajukanData", { id: k.id }, t);
    return ok("verifikasi.putuskan", { id: k.id, keputusan: "disetujui" }, t === tAdm ? tKps : tAdm).kegiatan;
  };
  const tgl = "2025-10-10"; // TA 2025/2026 = TS
  setuju(tDsn, "dosen", { jenis: "penelitian", judul: "Pola perjalanan wisatawan muda", tgl, mhs: [ID("250103")], isian: { "Sumber dana": "PT / mandiri", "Topik peta jalan penelitian": "Perilaku wisatawan" } });
  setuju(tDsn, "dosen", { jenis: "penelitian", judul: "Penelitian hibah BRIN", tgl: "2024-03-05", isian: { "Sumber dana": "Dalam negeri (Kemdiktisaintek, BRIN, pemda, industri)" } });
  setuju(tDsn, "dosen", { jenis: "penelitian", judul: "Tanpa sumber dana", tgl });
  setuju(tDsn, "dosen", { jenis: "publikasi", judul: "Artikel SINTA", tgl, isian: { "Kategori publikasi": "Jurnal nasional terakreditasi (SINTA)", "Luaran dari": "Penelitian", "Nama jurnal / seminar": "Jurnal Pariwisata", "Jumlah sitasi (Google Scholar)": "12" } });
  setuju(tDsn, "dosen", { jenis: "publikasi", judul: "Pameran paket wisata", tgl: "2023-08-01", isian: { "Kategori publikasi": "Pagelaran/pameran/presentasi tingkat nasional", "Luaran dari": "PkM" } });
  setuju(tDsn, "dosen", { jenis: "hki", judul: "Modul pemanduan", tgl, isian: { Jenis: "Hak cipta", "Nomor sertifikat / ISBN": "EC00202512345" } });
  setuju(tDsn, "dosen", { jenis: "kerjasama", judul: "MoU magang", tgl, tingkat: "Internasional", isian: { Bidang: "Pendidikan", "Nama mitra": "ASITA Bali", "Masa berlaku": "2025–2030" } });
  setuju(tDsn, "dosen", { jenis: "rekognisi", judul: "Keynote ITB Berlin", tgl, tingkat: "Internasional", isian: { "Bentuk rekognisi": "Keynote / invited speaker" } });
  setuju(tDsn, "dosen", { jenis: "pkm", judul: "PkM desa wisata", tgl, mhs: [ID("250103")], isian: { "Sumber dana": "Luar negeri", "Mitra sasaran": "Desa Penglipuran" } });
  setuju(tDsn, "dosen", { jenis: "penelitian", judul: "Di luar rentang TS", tgl: "2022-01-10", isian: { "Sumber dana": "PT / mandiri" } });
  ok("kegiatan.simpan", { peran: "dosen", data: { jenis: "penelitian", judul: "Belum diverifikasi", tgl, perluST: false, tingkat: "Nasional" } }, tDsn);
  j = ok("ilkps.data", {}, tAdm);
  const T = Object.fromEntries(j.tabel.map(t => [t.kode, t]));
  cek("Tabel 12: PT/mandiri TS=1, dalam negeri Maret 2024 = TS-2; jumlah 2; 1 tanpa sumber dana dicatat", T["12"].baris[0][4] === 1 && T["12"].baris[1][2] === 1 && T["12"].baris[3][5] === 2 && /1 kegiatan belum terhitung/.test(T["12"].catatan), T["12"]);
  cek("Tabel 12: di luar rentang TS tidak dihitung; draf dihitung sebagai proses", T["12"].baris[3][5] === 2 && T["12"].proses >= 1, T["12"].proses);
  cek("Tabel 13: dosen, tema, mahasiswa, judul, tahun", JSON.stringify(T["13"].baris[0]) === JSON.stringify([1, "Gede Arya Pratama, S.E., M.M. (contoh)", "Perilaku wisatawan", "Kadek Ayu Lestari (contoh)", "Pola perjalanan wisatawan muda", "2025"]), T["13"].baris);
  cek("Tabel 14: SINTA (baris 2) di TS", T["14"].baris[1][4] === 1 && T["14"].baris[10][5] === 1, T["14"].baris[1]);
  cek("Tabel 19: pameran nasional luaran PkM di TS-2", T["19"].baris[8][2] === 1, T["19"].baris[8]);
  cek("Tabel 15 Bagian-2: hak cipta + nomor", T["15-2"].baris.length === 1 && T["15-2"].baris[0][3] === "Hak cipta · EC00202512345", T["15-2"].baris);
  cek("Tabel 16: artikel disitasi 12 kali", T["16"].baris[0][3] === 12 && /Jurnal Pariwisata/.test(T["16"].baris[0][2]), T["16"].baris);
  cek("Tabel 17: luar negeri TS; Tabel 18: mitra + mahasiswa", T["17"].baris[2][4] === 1 && T["18"].baris[0][2] === "Mitra: Desa Penglipuran", T["18"].baris);
  cek("Tabel 20-1: mitra, centang internasional, tahun berakhir 2030", JSON.stringify(T["20-1"].baris[0].slice(1, 5)) === JSON.stringify(["ASITA Bali", "V", "", ""]) && T["20-1"].baris[0][9] === "2030", T["20-1"].baris);
  cek("Tabel 23: rekognisi internasional", T["23"].baris[0][6] === "V" && /Keynote/.test(T["23"].baris[0][3]), T["23"].baris);
  cek("id kegiatan per baris (untuk tautan bukti)", T["13"].id.length === 1 && T["12"].idBaris[0].length === 1);
  const j26 = ok("ilkps.data", { ts: 2026 }, tAdm);
  cek("TS 2026: lomba mahasiswa (disetujui, Nov 2026) masuk Tabel 7b dengan nama mahasiswa", j26.tabel.find(t => t.kode === "7b").baris.some(r => /Lomba Tour/.test(r[1]) && r[2] === "2026" && /Kadek/.test(r[7])), j26.tabel.find(t => t.kode === "7b").baris);
  cek("KPS boleh melihat, tidak boleh mengatur TS", ok("ilkps.data", {}, tKps).bolehAtur === false && /izin/.test(salah("ilkps.ts", { ts: 2024 }, tKps)));
  cek("TS masa depan ditolak", /sudah berjalan/.test(salah("ilkps.ts", { ts: 2030 }, tAdm)));
  j = ok("ilkps.ts", { ts: 2024 }, tAdm);
  cek("Admin menetapkan TS 2024 → tersimpan dan dipakai bawaan", j.ts.label === "2024/2025" && ok("ilkps.data", {}, tKps).ts.awal === 2024);
  ok("ilkps.ts", { ts: 2025 }, tAdm);
}
