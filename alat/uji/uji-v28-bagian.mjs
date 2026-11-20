// Uji v0.28.0: tim pengajar per kelas (A/B) — sama untuk semua kelas, atau berbeda per kelas.
export function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tD2, tSA }) {
  console.log("38. Tim pengajar per kelas");
  const dsn = ID("199001152015041001"), d2 = ID("198001012005011009"), d3 = ID("197911302005012001");
  ok("dp.mkSimpan", { data: { kode: "UPW981", nama: "Uji Tim Per Kelas", semester: 1, sksKuliah: 3 } }, tAdm);
  let pr = ok("dp.data", {}, tAdm).praktisi[0];
  if (!pr) { ok("dp.praktisiSimpan", { data: { nama: "Praktisi Uji", perusahaan: "PT Uji" } }, tAdm); pr = ok("dp.data", {}, tAdm).praktisi[0]; }
  const smt = "2030-1", tim = s => ok("dp.data", { semester: s || smt }, tAdm).tim.find(t => t.kode === "UPW981");
  const baris = s => (g.sheets.TimPengajar || []).slice(1).filter(r => String(r[0]) === (s || smt) && r[1] === "UPW981");
  const iKelas = (g.sheets.TimPengajar || [[]])[0].indexOf("kelas");
  cek("migrasi: kolom kelas di akhir TimPengajar; SKEMA_VERSI ≥ 22", iKelas === (g.sheets.TimPengajar[0].length - 1) && Number(g.props.SKEMA_VERSI) >= 22);
  let t = tim();
  cek("MK tanpa tim: belum per kelas, daftar kelas A dan B", t.anggota.length === 0 && t.perKelas === false && t.daftarKelas.join() === "A,B", t);

  cek("KPS tidak bisa mengubah tim per kelas", /izin/.test(salah("dp.timSimpan", { semester: smt, kodeMk: "UPW981", perKelas: { A: [{ t: "u", id: dsn }] } }, tKps)));
  cek("kelas tidak valid ditolak", /Kelas tidak valid/.test(salah("dp.timSimpan", { semester: smt, kodeMk: "UPW981", perKelas: { "A B!": [{ t: "u", id: dsn }] } }, tAdm)));
  cek("pengampu utama per kelas harus dosen (pesan menyebut kelas)", /utama kelas B harus dosen/.test(salah("dp.timSimpan", { semester: smt, kodeMk: "UPW981", perKelas: { A: [{ t: "u", id: dsn }], B: [{ t: "p", id: pr.id }] } }, tAdm)));
  cek("maks 3 orang per kelas", /kelas A maksimal 3/.test(salah("dp.timSimpan", { semester: smt, kodeMk: "UPW981", perKelas: { A: [{ t: "u", id: dsn }, { t: "u", id: d2 }, { t: "u", id: d3 }, { t: "p", id: pr.id }] } }, tAdm)));

  // Sama untuk semua kelas (cara lama) lalu diganti berbeda per kelas.
  ok("dp.timSimpan", { semester: smt, kodeMk: "UPW981", anggota: [{ t: "u", id: dsn }, { t: "u", id: d2 }] }, tAdm);
  t = tim();
  cek("sama untuk semua kelas: satu baris kelas kosong", baris().length === 1 && baris()[0][iKelas] === "" && t.perKelas === false && t.kelas[""].length === 2 && t.utama.join() === dsn);
  ok("dp.timSimpan", { semester: smt, kodeMk: "UPW981", perKelas: { A: [{ t: "u", id: dsn }, { t: "u", id: d3 }], B: [{ t: "u", id: d2 }, { t: "p", id: pr.id }, { t: "u", id: dsn }] } }, tAdm);
  t = tim();
  cek("berbeda per kelas: dua baris A dan B, baris 'semua kelas' diganti", baris().length === 2 && baris().map(r => r[iKelas]).sort().join() === "A,B" && t.perKelas === true, baris());
  cek("tim kelas A dan B tersimpan dengan pengampu utama masing-masing", t.kelas.A[0].id === dsn && t.kelas.A.length === 2 && t.kelas.B[0].id === d2 && t.kelas.B.length === 3 && t.kelas.B[1].t === "p");
  cek("gabungan anggota: pengampu utama A dan B lebih dulu, tanpa ganda", t.utama.join() === [dsn, d2].join() && t.anggota.map(a => a.id).join() === [dsn, d2, d3, pr.id].join(), t.anggota);

  // EWMP TS 2030: sks per kelas yang diajar.
  let DT = ok("dp.data", { semester: smt, ta: 2030 }, tAdm).dosenTs;
  const sks = id => (DT.find(x => x.id === id) || {}).sksPsHitung;
  cek("EWMP per kelas (v0.39.0: praktisi ikut membagi): dosen di kelas A (3/2) dan B (3/3) = 2,5; d2 utama B = 1; d3 kelas A = 1,5", sks(dsn) === 2.5 && sks(d2) === 1 && sks(d3) === 1.5, DT.map(x => [x.nama, x.sksPsHitung]));
  cek("MK diampu tercantum sekali walau mengajar dua kelas", DT.find(x => x.id === dsn).mk.filter(m => /UPW981/.test(m)).length === 1);

  // Hanya satu kelas diisi → kelas lain belum ada tim.
  ok("dp.timSimpan", { semester: smt, kodeMk: "UPW981", perKelas: { A: [{ t: "u", id: dsn }], B: [] } }, tAdm);
  t = tim();
  cek("kelas B dikosongkan: hanya baris kelas A", baris().length === 1 && baris()[0][iKelas] === "A" && t.perKelas && !t.kelas.B && t.kelas.A.length === 1);
  DT = ok("dp.data", { semester: smt, ta: 2030 }, tAdm).dosenTs;
  cek("EWMP hanya kelas A: 3 sks", sks(dsn) === 3);

  // Salin ke semester berikutnya (Ganjil 2031/2032): tim per kelas ikut tersalin.
  ok("dp.timSimpan", { semester: smt, kodeMk: "UPW981", perKelas: { A: [{ t: "u", id: dsn }], B: [{ t: "u", id: d2 }] } }, tAdm);
  const j = ok("dp.timSalin", { semester: "2031-1" }, tAdm);
  t = tim("2031-1");
  cek("salin semester: tim per kelas ikut tersalin", j.disalin >= 1 && t.perKelas && t.kelas.A[0].id === dsn && t.kelas.B[0].id === d2 && baris("2031-1").length === 2);

  // Kembali ke sama untuk semua kelas: baris per kelas dihapus.
  ok("dp.timSimpan", { semester: smt, kodeMk: "UPW981", anggota: [{ t: "u", id: d2 }] }, tAdm);
  t = tim();
  cek("kembali 'sama untuk semua kelas': satu baris, kelas kosong", baris().length === 1 && baris()[0][iKelas] === "" && !t.perKelas && t.anggota.length === 1);
  DT = ok("dp.data", { semester: smt, ta: 2030 }, tAdm).dosenTs;
  cek("EWMP 'semua kelas' = sks × 2 kelas = 6", sks(d2) === 6 && !sks(dsn));
  ok("dp.timSimpan", { semester: smt, kodeMk: "UPW981", anggota: [] }, tAdm);
  cek("hapus tim: tidak ada baris tersisa", baris().length === 0 && tim().anggota.length === 0);

  // Portofolio MK: dua pengampu utama (kelas A dan B) sama-sama berperan utama.
  const kini = ok("mkp.saya", {}, tDsn).semester;
  const kd = ok("dp.data", { semester: kini }, tAdm).tim.find(x => x.anggota.length && x.anggota[0].id === dsn);
  if (kd) {
    const asli = kd.perKelas ? { perKelas: kd.kelas } : { anggota: kd.kelas[""] };
    ok("dp.timSimpan", { semester: kini, kodeMk: kd.kode, perKelas: { A: [{ t: "u", id: dsn }, { t: "u", id: d3 }], B: [{ t: "u", id: d2 }] } }, tAdm);
    const m1 = ok("mkp.saya", {}, tDsn).mk.find(x => x.kode === kd.kode), m2 = ok("mkp.saya", {}, tD2).mk.find(x => x.kode === kd.kode);
    cek("Portofolio MK: pengampu utama kelas A dan kelas B sama-sama 'utama'", m1 && m1.peran === "utama" && m2 && m2.peran === "utama" && m2.bolehUtama, [m1 && m1.peran, m2 && m2.peran]);
    cek("Portofolio MK (v0.40.0 per kelas): dosen hanya melihat kelasnya; tim kelas A = dsn (utama) + d3", m1.kelas.map(x => x.k).join() === "A" && m1.tim.filter(x => x.utama).length === 1 && m1.tim.find(x => x.id === d3).utama === false && !m1.tim.some(x => x.id === d2) && m2.kelas.map(x => x.k).join() === "B");
    ok("dp.timSimpan", Object.assign({ semester: kini, kodeMk: kd.kode }, asli), tAdm);
    cek("Portofolio MK: tim semula dipulihkan", ok("mkp.saya", {}, tDsn).mk.find(x => x.kode === kd.kode).peran === "utama");
  } else cek("Portofolio MK: ada MK berjalan dengan dosen utama (data uji)", false);
  ok("dp.mkHapus", { kode: "UPW981" }, tAdm);
}
