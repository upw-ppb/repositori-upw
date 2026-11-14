// Uji v0.8.0: Data Prodi (kurikulum, tim pengajar, praktisi, data dosen TS) dan Tabel iLKPS 1–6.
export function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tD2, tSA }) {
  console.log("14. Data Prodi");
  const dsn = ID("199001152015041001"), d2 = ID("198001012005011009");
  cek("dosen tidak bisa membuka; KPS lihat saja; Admin boleh ubah", /izin/.test(salah("dp.data", {}, tDsn)) && ok("dp.data", {}, tKps).bolehUbah === false && ok("dp.data", {}, tAdm).bolehUbah === true);
  cek("KPS tidak bisa mengubah kurikulum", /izin/.test(salah("dp.mkSimpan", { data: { kode: "X1", nama: "X", semester: 1, sksKuliah: 2 } }, tKps)));
  cek("kode tidak valid ditolak", /Kode mata kuliah/.test(salah("dp.mkSimpan", { data: { kode: "a b", nama: "X", semester: 1, sksKuliah: 2 } }, tAdm)));
  cek("semester 1–8", /Semester/.test(salah("dp.mkSimpan", { data: { kode: "X1", nama: "X", semester: 9, sksKuliah: 2 } }, tAdm)));
  cek("sks wajib", /sks/.test(salah("dp.mkSimpan", { data: { kode: "X1", nama: "X", semester: 1 } }, tAdm)));
  cek("RPS harus tautan https atau 'Ada'", /RPS/.test(salah("dp.mkSimpan", { data: { kode: "X1", nama: "X", semester: 1, sksKuliah: 2, rps: "file.pdf" } }, tAdm)));
  let j = ok("dp.mkSimpan", { daftar: [
    { kode: "upw101", nama: "Pengantar Pariwisata", semester: 1, sksKuliah: 3, cplSikap: true, cplPengetahuan: true },
    { kode: "UPW201", nama: "Travel Agency Operation", semester: 2, sksKuliah: 1, sksPraktik: 2, kompetensi: "Ya", cplKk: "V", rps: "https://drive.google.com/rps201" },
    { kode: "UPW301", nama: "Tour Planning", semester: 3, sksKuliah: 1, sksPraktik: 2, kompetensi: true },
    { kode: "UPW202", nama: "Ticketing", semester: 2, sksKuliah: 1, sksPraktik: 2, kompetensi: true }] }, tAdm);
  cek("impor 4 mata kuliah", j.baru === 4);
  j = ok("dp.mkSimpan", { daftar: [{ kode: "UPW101", nama: "Pengantar Pariwisata", semester: 1, sksKuliah: 3, rps: "Ada" }] }, tAdm);
  cek("impor ulang kode sama = memperbarui", j.diubah === 1 && j.baru === 0);
  ok("dp.mkSimpan", { kodeLama: "UPW202", data: { kode: "UPW204", nama: "Ticketing & Reservation", semester: 2, sksKuliah: 1, sksPraktik: 2, kompetensi: true } }, tAdm);
  const D = ok("dp.data", { semester: "2025-2" }, tAdm);
  cek("ganti kode: UPW202 → UPW204; kurikulum terurut semester", D.mk.map(m => m.kode).join() === "UPW101,UPW201,UPW204,UPW301" && D.mk[1].sks === 3, D.mk.map(m => m.kode));
  cek("tim semester genap hanya MK semester genap", D.tim.map(t => t.kode).join() === "UPW201,UPW204" && D.labelSemester === "Genap 2025/2026", D.tim);
  cek("pilihan semester: semester berikutnya s.d. 10 ke belakang", D.pilihanSemester[0].kode === "2026-2" && D.pilihanSemester.length === 11, D.pilihanSemester.slice(0, 3));
  cek("praktisi tanpa perusahaan ditolak", /perusahaan/.test(salah("dp.praktisiSimpan", { data: { nama: "Made Wirawan" } }, tAdm)));
  ok("dp.praktisiSimpan", { data: { nama: "Made Wirawan", perusahaan: "PT Bali Tour Nusantara", pendidikan: "S1", bidang: "Tour operation", sertifikat: "Tour Leader BNSP" } }, tAdm);
  const pr = ok("dp.data", {}, tAdm).praktisi[0];
  cek("praktisi tersimpan", pr && pr.nama === "Made Wirawan");
  cek("MK ganjil tidak bisa di semester genap", /tidak ditawarkan/.test(salah("dp.timSimpan", { semester: "2025-2", kodeMk: "UPW101", anggota: [{ t: "u", id: dsn }] }, tAdm)));
  cek("maks 3 anggota", /maksimal 3/.test(salah("dp.timSimpan", { semester: "2025-1", kodeMk: "UPW101", anggota: [{ t: "u", id: dsn }, { t: "u", id: d2 }, { t: "p", id: pr.id }, { t: "u", id: ID("197911302005012001") }] }, tAdm)));
  cek("pengampu utama harus dosen", /utama harus dosen/.test(salah("dp.timSimpan", { semester: "2025-1", kodeMk: "UPW101", anggota: [{ t: "p", id: pr.id }] }, tAdm)));
  cek("anggota tak dikenal ditolak", /tidak ditemukan/.test(salah("dp.timSimpan", { semester: "2025-1", kodeMk: "UPW101", anggota: [{ t: "u", id: ID("250103") }] }, tAdm)));
  ok("dp.timSimpan", { semester: "2025-1", kodeMk: "UPW101", anggota: [{ t: "u", id: dsn }, { t: "u", id: d2 }] }, tAdm);
  ok("dp.timSimpan", { semester: "2025-1", kodeMk: "UPW301", anggota: [{ t: "u", id: d2 }] }, tAdm);
  ok("dp.timSimpan", { semester: "2025-2", kodeMk: "UPW201", anggota: [{ t: "u", id: dsn }, { t: "p", id: pr.id }] }, tAdm);
  cek("tim tersimpan dengan pengampu utama pertama", ok("dp.data", { semester: "2025-1" }, tAdm).tim.find(t => t.kode === "UPW101").anggota[0].id === dsn);
  j = ok("dp.timSalin", { semester: "2026-1" }, tAdm);
  cek("salin dari Ganjil 2025/2026 ke Ganjil 2026/2027", j.disalin === 2 && j.dari === "Ganjil 2025/2026" && ok("dp.timSalin", { semester: "2026-1" }, tAdm).disalin === 0);
  ok("dp.dosenTsSimpan", { ta: 2025, data: { userId: dsn, psLain: 2, penelitian: 3, pkm: 1, tambahan: 2, sesuai: "Ya" } }, tAdm);
  const dt = ok("dp.data", { ta: 2025 }, tAdm).dosenTs.find(x => x.id === dsn);
  cek("data dosen TS: sks PS terhitung dari tim (3/2 + 3 = 4,5) dan MK diampu", dt.sksPsHitung === 4.5 && dt.mk.length === 2 && dt.penelitian === 3 && dt.sesuai === "Ya", dt);
  // biodata: isian baru mkLain tersimpan di kolom akhir
  const bs = ok("biodata.saya", {}, tDsn).biodata, isi = { ...bs.data, mkLain: "Bahasa Inggris Pariwisata (Prodi Perhotelan)" };
  ok("biodata.simpan", { data: isi }, tDsn);
  cek("kolom biodata baru di akhir sheet", g.sheets.BiodataPegawai[0].slice(-3).join() === "lama,diubahPada,mkLain", g.sheets.BiodataPegawai[0].slice(-4));
  // bimbingan TA
  const setuju = (data) => { const k = ok("kegiatan.simpan", { peran: "dosen", data: { perluST: false, tingkat: "Lokal/Wilayah", ...data } }, tDsn).kegiatan;
    k.slot.filter(s => !s.opsional).forEach(s => ok("bukti.unggah", { id: k.id, slot: s.k, ket: "SK ada di arsip prodi" }, tDsn)); ok("kegiatan.ajukanData", { id: k.id }, tDsn);
    ok("verifikasi.putuskan", { id: k.id, keputusan: "disetujui" }, tAdm); };
  setuju({ jenis: "bimbingan", judul: "Pembimbing utama TA 2025", tgl: "2025-10-01", mhs: [ID("250103"), ID("250201")], isian: { "Prodi mahasiswa": "Prodi UPW", Peran: "Pembimbing utama" } });
  setuju({ jenis: "bimbingan", judul: "Pembimbing utama prodi lain", tgl: "2025-03-01", isian: { "Prodi mahasiswa": "Prodi lain di Poltekpar Bali", Peran: "Pembimbing utama", "Jumlah mahasiswa (prodi lain)": "3" } });
  setuju({ jenis: "bimbingan", judul: "Pembimbing pendamping", tgl: "2025-10-01", mhs: [ID("250103")], isian: { "Prodi mahasiswa": "Prodi UPW", Peran: "Pembimbing pendamping" } });

  console.log("15. Tabel iLKPS 1–6");
  const I = ok("ilkps.data", { ts: 2025 }, tAdm), T = Object.fromEntries(I.tabel.map(t => [t.kode, t]));
  cek("urutan tabel diawali 1–6", I.tabel.slice(0, 6).map(t => t.kode).join() === "1,2,3,4,5,6" && I.tabel.length === 33);
  const r1 = T["1"].baris.find(r => r[1].startsWith("Gede Arya"));
  cek("Tabel 1: DTPS V, MK diampu TS, kesesuaian V, MK prodi lain", r1 && r1[8] === "V" && /UPW101 Pengantar Pariwisata/.test(r1[12]) && /UPW201/.test(r1[12]) && r1[13] === "V" && /Perhotelan/.test(r1[14]), r1);
  cek("Tabel 2: praktisi + MK + bobot sks", JSON.stringify(T["2"].baris[0]) === JSON.stringify([1, "Made Wirawan", "", "PT Bali Tour Nusantara", "S1", "Tour operation", "Tour Leader BNSP", "UPW201 Travel Agency Operation", 3]), T["2"].baris);
  const r4 = T["4"].baris.find(r => r[2] === "UPW201");
  cek("Tabel 4: kompetensi V, sks, jam = 3 × 45, CPL KK, RPS, unit", r4[4] === "V" && r4[5] === 1 && r4[7] === 2 && r4[8] === 135 && r4[12] === "V" && /rps201/.test(r4[13]) && r4[14] === "Prodi UPW", r4);
  const r5 = T["5"].baris.find(r => r[1].startsWith("Gede Arya"));
  cek("Tabel 5: 2 mhs UPW di TS, 3 mhs prodi lain di TS-1; pendamping tidak dihitung", r5[4] === 2 && r5[3] === 0 && r5[7] === 3 && r5[5] === 0.67 && r5[9] === 1 && r5[10] === 1.67, r5);
  const r6 = T["6"].baris.find(r => r[1].startsWith("Gede Arya"));
  cek("Tabel 6: PS 4,5 + 2 + 3 + 1 + 2 = 12,5; rata-rata 6,25", r6[2] === "V" && r6[3] === 4.5 && r6[9] === 12.5 && r6[10] === 6.25, r6);
  ok("dp.dosenTsSimpan", { ta: 2025, data: { userId: dsn, ps: 6, psLain: 2, penelitian: 3, pkm: 1, tambahan: 2, sesuai: "Ya" } }, tAdm);
  cek("Tabel 6: nilai PS ditimpa Admin dipakai", ok("ilkps.data", { ts: 2025 }, tAdm).tabel.find(t => t.kode === "6").baris.find(r => r[1].startsWith("Gede Arya"))[3] === 6);
  ok("dp.mkHapus", { kode: "UPW301" }, tAdm);
  cek("hapus MK: hilang dari kurikulum", !ok("dp.data", {}, tAdm).mk.some(m => m.kode === "UPW301"));
  cek("migrasi: tabel baru Data Prodi", ["MataKuliah", "Praktisi", "TimPengajar", "DosenTs"].every(n => g.sheets[n]));
}
