// Uji v0.10.0: lulusan, PMB, dana → Tabel 8, 9, 10a–c, Ref 11a, 21.
export function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tSA }) {
  console.log("17. Lulusan, PMB, dana");
  cek("dosen tidak bisa membuka; KPS melihat tapi tak bisa impor", /izin/.test(salah("lul.data", {}, tDsn)) && ok("lul.data", {}, tKps).bolehUbah === false && /izin/.test(salah("lul.impor", { daftar: [{}] }, tKps)));
  const dasar = { nama: "Uji", masuk: 2021, tglLulus: "2025-08-20" };
  cek("NIM tidak valid", /NIM/.test(salah("lul.impor", { daftar: [{ ...dasar, nim: "a b" }] }, tAdm)));
  cek("IPK > 4 ditolak", /IPK/.test(salah("lul.impor", { daftar: [{ ...dasar, nim: "X123", ipk: "4,5" }] }, tAdm)));
  cek("tanggal tidak valid ditolak", /tanggal lulus/.test(salah("lul.impor", { daftar: [{ ...dasar, nim: "X123", tglLulus: "2025-13-01" }] }, tAdm)));
  cek("kesesuaian tidak dikenal", /Rendah, Sedang, atau Tinggi/.test(salah("lul.impor", { daftar: [{ ...dasar, nim: "X123", kesesuaian: "Bagus" }] }, tAdm)));
  cek("tempat kerja tidak dikenal", /Lokal, Nasional, atau Internasional/.test(salah("lul.impor", { daftar: [{ ...dasar, nim: "X123", tempatKerja: "Luar angkasa" }] }, tAdm)));
  cek("baris salah membatalkan seluruh impor", /Baris 2/.test(salah("lul.impor", { daftar: [{ ...dasar, nim: "X123" }, { ...dasar, nim: "X124", masuk: 1800 }] }, tAdm)) && !ok("lul.data", {}, tAdm).lulusan.length);
  let j = ok("lul.impor", { daftar: [
    { nim: "210101", nama: "A", masuk: 2021, tglLulus: "20/08/2025", ipk: "3,5", wtBulan: "2", kesesuaian: "tinggi", tempatKerja: "Nasional" },
    { nim: "250107", nama: "B", masuk: 2021, tglLulus: "2025-08-20", ipk: "3.2" },
    { nim: "200101", nama: "C", masuk: 2020, tglLulus: "2024-09-10", ipk: "3.8", wtBulan: "5", kesesuaian: "Sedang", tempatKerja: "lokal" },
    { nim: "190101", nama: "D", masuk: 2019, tglLulus: "2023-03-15", ipk: "3.0", wtBulan: "8", kesesuaian: "Rendah", tempatKerja: "Internasional" },
    { nim: "190102", nama: "E", masuk: 2019, tglLulus: "2022-10-01", ipk: "3,6" },
    { nim: "170101", nama: "F", masuk: 2017, tglLulus: "2021-09-01", ipk: "3.1" }] }, tAdm);
  cek("impor 6 lulusan; akun 250107 otomatis berstatus L", j.baru === 6 && j.akunLulus === 1 && g.ctx.cari("Pengguna", x => String(x.username) === "250107").statusMhs === "L", j);
  j = ok("lul.impor", { daftar: [{ nim: "190102", nama: "E", masuk: 2019, tglLulus: "2022-10-01", ipk: "3,6", kesesuaian: "" }] }, tAdm);
  cek("impor ulang NIM sama = memperbarui", j.diubah === 1 && j.baru === 0);
  const L = ok("lul.data", {}, tAdm).lulusan;
  cek("data lulusan: tanggal DD/MM/YYYY dan koma desimal terbaca, terlacak dihitung", L.find(x => x.nim === "210101").tglLulus === "2025-08-20" && L.find(x => x.nim === "190102").ipk === 3.6 && L.filter(x => x.terlacak).length === 3, L.map(x => [x.nim, x.tglLulus, x.ipk, x.terlacak]));
  cek("PMB: diterima > lulus seleksi ditolak", /tidak boleh melebihi/.test(salah("lul.pmbSimpan", { data: { tahun: 2019, lulusSeleksi: 50, diterima: 60 } }, tAdm)));
  ok("lul.pmbSimpan", { data: { tahun: 2019, dayaTampung: 60, pendaftar: 700, lulusSeleksi: 70, diterima: 60 } }, tAdm);
  ok("lul.pmbSimpan", { data: { tahun: 2019, dayaTampung: 60, pendaftar: 720, lulusSeleksi: 72, diterima: 61 } }, tAdm);
  cek("PMB per tahun: simpan ulang memperbarui", ok("lul.data", {}, tAdm).penerimaan.filter(x => x.tahun === 2019).length === 1 && ok("lul.data", {}, tAdm).penerimaan[0].diterima === 61);
  ok("lul.danaSimpan", { ta: 2025, data: { dosen: { upps: 1000000000, ps: 200000000 }, kemahasiswaan: { ps: 30000000 }, penelitian: { ps: 60000000 } } }, tAdm);
  ok("lul.danaSimpan", { ta: 2024, data: { dosen: { upps: 900000000, ps: 160000000 } } }, tAdm);
  cek("dana tersimpan per TA", ok("lul.data", { ta: 2025 }, tAdm).dana.dosen.ps === 200000000);

  console.log("18. Tabel iLKPS 8–10, Ref 11a, 21");
  const I = ok("ilkps.data", { ts: 2025 }, tAdm), T = Object.fromEntries(I.tabel.map(t => [t.kode, t]));
  cek("urutan seperti berkas resmi (8 dst. setelah 7b; 21 sebelum 23)", I.tabel.map(t => t.kode).join() === "1,2,3,4,5,6,7a,7b,8,9,10a,10b,10c,ref11a,11,12,13,14,15-1,15-2,15-3,15-4,15a,16,17,18,19,20-1,20-2,20-3,21,22,23", I.tabel.map(t => t.kode).join());
  cek("Tabel 8: TS-2 0; TS-1 1 (3,8); TS 2 (min 3,2, rata 3,35, maks 3,5)", JSON.stringify(T["8"].baris) === JSON.stringify([[1, "TS-2 (2023/2024)", 0, "", "", ""], [2, "TS-1 (2024/2025)", 1, 3.8, 3.8, 3.8], [3, "TS (2025/2026)", 2, 3.2, 3.35, 3.5]]), T["8"].baris);
  cek("Tabel 9: angkatan 2019 (TS-6): diterima 61, 2 lulus akhir TS-3, rata masa studi 3,4 th", JSON.stringify(T["9"].baris[0]) === JSON.stringify(["TS-6 (2019)", 61, 0, 0, 0, 2, 0, 0, 0, 2, 3.4]), T["9"].baris[0]);
  cek("Tabel 9: angkatan 2021 (TS-4): 2 lulus akhir TS", T["9"].baris[2][8] === 2 && T["9"].baris[2][9] === 2, T["9"].baris[2]);
  cek("Tabel 10a: TS-3 (2022/2023): 2 lulusan, 1 terlacak, WT > 6", JSON.stringify(T["10a"].baris[1]) === JSON.stringify(["TS-3 (2022/2023)", 2, 1, 0, 0, 1]) && T["10a"].baris[3][0] === "Jumlah", T["10a"].baris);
  cek("Tabel 10b/10c: Rendah dan Multinasional pada TS-3", T["10b"].baris[1][3] === 1 && T["10c"].baris[1][5] === 1, [T["10b"].baris[1], T["10c"].baris[1]]);
  cek("Ref 11a: jumlah lulusan TS-4..TS-2 (1, 2, 0), tanggapan 0", JSON.stringify(T["ref11a"].baris.map(r => [r[1], r[2]])) === JSON.stringify([[1, 0], [2, 0], [0, 0], [3, 0]]), T["ref11a"].baris);
  const d = T["21"].baris, rDosen = d.find(r => /Biaya Dosen/.test(r[1]));
  cek("Tabel 21: biaya dosen UPPS TS-1/TS, rata-rata, PS", rDosen[3] === 900000000 && rDosen[4] === 1000000000 && rDosen[5] === 633333333 && rDosen[8] === 200000000, rDosen);
  const subs = d.filter(r => r[1] === "Jumlah");
  cek("Tabel 21: tiga baris Jumlah (operasional+kemahasiswaan 230 jt PS TS; penelitian+PkM 60 jt)", subs.length === 3 && subs[0][8] === 230000000 && subs[1][8] === 60000000, subs);
  ok("lul.hapus", { nim: "170101" }, tAdm);
  cek("hapus lulusan", !ok("lul.data", {}, tAdm).lulusan.some(x => x.nim === "170101"));
  cek("migrasi: tabel Lulusan, Penerimaan, Dana; SKEMA_VERSI 9", ["Lulusan", "Penerimaan", "Dana"].every(n => g.sheets[n]) && !!g.props.SKEMA_VERSI);
}
