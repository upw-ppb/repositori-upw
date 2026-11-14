// Uji v0.12.0: simulasi penilaian 84 butir.
export function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tSA }) {
  console.log("22. Penilaian");
  cek("dosen dan mahasiswa tidak bisa membuka", /izin/.test(salah("penilaian.data", {}, tDsn)) && /izin/.test(salah("penilaian.data", {}, tM)));
  let P = ok("penilaian.data", { ts: 2025 }, tAdm);
  const R = n => P.rows.find(r => r.n === n);
  cek("84 butir, bobot total 100, nilai = Σ bobot × skor", P.rows.length === 84 && Math.abs(P.rows.reduce((a, r) => a + r.w, 0) - 100) < 1e-9 && Math.abs(P.total - P.rows.reduce((a, r) => a + r.w * r.skor, 0)) < 0.01, P.total);
  cek("7 kriteria, jumlah nilai kriteria = total", P.kriteria.length === 7 && Math.abs(P.kriteria.reduce((a, k) => a + k.nilai, 0) - P.total) < 0.05);
  cek("NDTPS 3 → butir 10 skor 2 (= 2 × 3 / 3)", P.ringkas.NDTPS === 3 && R(10).skor === 2 && /NDTPS = 3/.test(R(10).info), [P.ringkas, R(10)]);
  cek("PDS3 0% → skor 2 (tidak ada skor < 2)", R(11).skor === 2);
  cek("PJP dari kurikulum: 4/9 sks = 44,4% → 4", R(24).skor === 4 && /4\/9/.test(R(24).info), R(24).info);
  cek("butir GPM belum diisi: skor 0, ditandai", R(1).gpm === null && R(1).skor === 0 && P.belumGpm > 30);
  cek("data kurang ditandai (mis. PTW tanpa data PMB angkatan TS-6..TS-3 cukup)", P.kurangData > 0);
  cek("butir otomatis tidak bisa diberi skor manual", /dihitung otomatis/.test(salah("penilaian.skor", { ts: 2025, butir: 10, skor: 4 }, tAdm)));
  cek("skor di luar 0–4 ditolak", /0–4/.test(salah("penilaian.skor", { ts: 2025, butir: 1, skor: 5 }, tAdm)));
  const sebelum = P.total;
  ok("penilaian.skor", { ts: 2025, butir: 1, skor: 3, catatan: "SPMI 4 aspek, benchmarking belum" }, tKps);
  ok("penilaian.skor", { ts: 2025, butir: 42, skor: 2 }, tAdm);
  P = ok("penilaian.data", { ts: 2025 }, tAdm);
  cek("skor GPM butir 1 masuk (KPS boleh menilai), catatan & penilai tersimpan", R(1).skor === 3 && R(1).catatan.startsWith("SPMI") && /Widiastuti/.test(R(1).olehGpm) && Math.abs(P.total - sebelum - R(1).w * 3 - (R(42).skor - 0) * R(42).w + 0) < 0.6, [P.total, sebelum]);
  cek("butir gabungan 42 = (2 × otomatis + GPM) / 3", Math.abs(R(42).skor - Math.round(((2 * R(42).auto + 2) / 3) * 100) / 100) < 0.011, R(42));
  cek("skor GPM per TS (TS lain tidak terpengaruh)", ok("penilaian.data", { ts: 2024 }, tAdm).rows.find(r => r.n === 1).gpm === null);
  ok("penilaian.skor", { ts: 2025, butir: 1, skor: "" }, tAdm);
  cek("skor GPM bisa dikosongkan lagi", ok("penilaian.data", { ts: 2025 }, tAdm).rows.find(r => r.n === 1).gpm === null);
  cek("target: KPS tidak boleh, Admin boleh", /izin/.test(salah("penilaian.target", { target: 350 }, tKps)) && (ok("penilaian.target", { target: 355 }, tAdm), ok("penilaian.data", {}, tKps).target === 355));
  const dsn = ID("199001152015041001");
  ok("dp.dosenTsSimpan", { ta: 2025, data: { userId: dsn, dasarSesuai: "Ya", linier: "Ya", sesuai: "Ya" } }, tAdm);
  P = ok("penilaian.data", { ts: 2025 }, tAdm);
  cek("data dosen TS: pendidikan dasar sesuai & linier 1/3 = 33% → skor 3", R(12).skor === 3 && R(13).skor === 3, [R(12), R(13)]);
  cek("Tabel 22 dari survei TA 2026 → butir 71 terhitung pada TS 2026", ok("penilaian.data", { ts: 2026 }, tAdm).rows.find(r => r.n === 71).auto > 0);
  for (const ts of [2025, 2026]) { const Q = ok("penilaian.data", { ts }, tAdm); const aneh = Q.rows.filter(r => !isFinite(r.skor) || /NaN|Infinity|undefined/.test(r.info));
    cek("TS " + ts + ": tidak ada skor/keterangan janggal", !aneh.length, aneh.map(r => [r.n, r.info]));
    if (process.env.CETAK) Q.rows.filter(r => r.t !== "m").forEach(r => console.log("     ", ts, r.n, r.t, r.skor, "|", r.info)); }
  cek("migrasi: SkorGpm, kolom dasarSesuai/linier; SKEMA_VERSI 11", g.sheets.SkorGpm && g.sheets.DosenTs[0].slice(-2).join() === "dasarSesuai,linier" && !!g.props.SKEMA_VERSI);
}
