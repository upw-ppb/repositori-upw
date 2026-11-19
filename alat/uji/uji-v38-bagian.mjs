// Uji v0.38.0: MK pilihan dengan kelompok paralel (Bahasa Asing Pilihan: Jepang / Jerman / Perancis) — kurikulum, tim per kelas×kelompok, EWMP SKS penuh,
// impor Excel, Portofolio MK per kelompok.
import fs from "node:fs";
export function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tD2 }) {
  console.log("49. MK pilihan dengan kelompok paralel");
  const dsn = ID("199001152015041001"), d2 = ID("198001012005011009"), d3 = ID("197911302005012001"), smt = "2033-1", MK = g.sheets.MataKuliah;
  cek("migrasi: kolom kelompok di akhir MataKuliah; SKEMA_VERSI ≥ 28", MK[0].at(-1) === "kelompok" && Number(g.props.SKEMA_VERSI) >= 28);
  cek("kelompok tidak sah ditolak (1 kelompok, nama ganda, kode tidak sah)", /minimal 2/.test(salah("dp.mkSimpan", { data: { kode: "231041217", nama: "BA", semester: 3, sksKuliah: 2, kelompok: "Jepang" } }, tAdm))
    && /ganda/.test(salah("dp.mkSimpan", { data: { kode: "231041217", nama: "BA", semester: 3, sksKuliah: 2, kelompok: "Jepang, jepang" } }, tAdm))
    && /tidak valid/.test(salah("dp.mkSimpan", { data: { kode: "231041217", nama: "BA", semester: 3, sksKuliah: 2, kelompok: "Jepang (12 34), Jerman" } }, tAdm)));
  ok("dp.mkSimpan", { data: { kode: "231041217", nama: "Bahasa Asing Pilihan Kepemanduan Dasar", semester: 3, sksKuliah: 2, kelompok: "Jepang (231041217), Jerman (231041215), Perancis (231041216)" } }, tAdm);
  const mk = () => ok("dp.data", { semester: smt }, tAdm).mk.find(m => m.kode === "231041217");
  cek("kurikulum: satu MK, 2 SKS, tiga kelompok dengan kodenya", mk().sks === 2 && mk().kelompok.map(x => x.n + ":" + x.kode).join() === "Jepang:231041217,Jerman:231041215,Perancis:231041216");
  ok("dp.mkSimpan", { daftar: [{ kode: "231041217", nama: "Bahasa Asing Pilihan Kepemanduan Dasar", semester: 3, sksKuliah: 2 }] }, tAdm);
  cek("simpan ulang tanpa kolom kelompok (templat lama): kelompok tetap", mk().kelompok.length === 3);
  const tim = () => ok("dp.data", { semester: smt }, tAdm).tim.find(t => t.kode === "231041217");
  cek("dp.data tim membawa daftar kelompok", tim().kelompok.length === 3);
  cek("tim 'sama untuk semua kelas' ditolak untuk MK berkelompok; kelompok tak dikenal ditolak",
    /berkelompok paralel/.test(salah("dp.timSimpan", { semester: smt, kodeMk: "231041217", anggota: [{ t: "u", id: dsn }] }, tAdm))
    && /Kelompok tidak valid/.test(salah("dp.timSimpan", { semester: smt, kodeMk: "231041217", perKelas: { "A/KOREA": [{ t: "u", id: dsn }] } }, tAdm))
    && /Kelompok tidak valid/.test(salah("dp.timSimpan", { semester: smt, kodeMk: "231041217", perKelas: { A: [{ t: "u", id: dsn }] } }, tAdm)));
  const DT0 = ok("dp.data", { semester: smt, ta: 2033 }, tAdm).dosenTs, sks0 = {}; DT0.forEach(x => { sks0[x.id] = x.sksPsHitung; });
  ok("dp.timSimpan", { semester: smt, kodeMk: "231041217", perKelas: { "A/JEPANG": [{ t: "u", id: dsn }], "B/Jepang": [{ t: "u", id: dsn }], "A/JERMAN": [{ t: "u", id: d2 }], "B/JERMAN": [{ t: "u", id: d2 }],
    "A/PERANCIS": [{ t: "u", id: d3 }], "B/PERANCIS": [{ t: "u", id: d3 }] } }, tAdm);
  let t = tim();
  cek("tim per kelas × kelompok tersimpan (6 kunci, huruf besar), tiga pengampu utama", Object.keys(t.kelas).sort().join() === "A/JEPANG,A/JERMAN,A/PERANCIS,B/JEPANG,B/JERMAN,B/PERANCIS" && t.utama.length === 3 && t.perKelas);
  const DT = ok("dp.data", { semester: smt, ta: 2033 }, tAdm).dosenTs, naik = id => Math.round(((DT.find(x => x.id === id) || {}).sksPsHitung - (sks0[id] || 0)) * 100) / 100;
  cek("EWMP: setiap kelompok = satu kelas utuh → pengampu tunggal 2 SKS × 2 kelas = 4 SKS (tidak dibagi)", naik(dsn) === 4 && naik(d2) === 4 && naik(d3) === 4, [naik(dsn), naik(d2), naik(d3)]);
  cek("MK tercantum pada ketiga dosen (Tabel 1–3 / Data dosen TS)", [dsn, d2, d3].every(id => DT.find(x => x.id === id).mk.some(m => /Bahasa Asing Pilihan/.test(m))));
  const j = ok("dp.timImpor", { semester: smt, daftar: [{ kodeMk: "231041217", perKelas: { "A/JEPANG": [{ t: "u", id: d2 }], "A/JERMAN": [{ t: "u", id: dsn }] } }] }, tKps);
  t = tim();
  cek("impor Excel (KPS) per kelompok: kunci diganti, baris tidak bertambah", j.disimpan === 1 && Object.keys(t.kelas).sort().join() === "A/JEPANG,A/JERMAN" && t.kelas["A/JEPANG"][0].id === d2);
  ok("dp.timSimpan", { semester: smt, kodeMk: "231041217", perKelas: { "A/JEPANG": [{ t: "u", id: dsn }], "B/JEPANG": [{ t: "u", id: dsn }], "A/JERMAN": [{ t: "u", id: d2 }], "A/PERANCIS": [{ t: "u", id: d3 }] } }, tAdm);
  // Portofolio MK per kelompok
  const pdf = s => Buffer.concat([Buffer.from("%PDF-1.4\n" + s), Buffer.alloc(40)]).toString("base64");
  cek("RPS MK berkelompok wajib memilih kelompok; dosen hanya mengisi kelompoknya sendiri",
    /Pilih kelompok/.test(salah("mkp.unggah", { semester: smt, kode: "231041217", komp: "rps", nama: "rps.pdf", isi: pdf("x") }, tDsn))
    && /pengampu utama kelompok/.test(salah("mkp.unggah", { semester: smt, kode: "231041217", komp: "rps", kelompok: "JERMAN", nama: "rps.pdf", isi: pdf("x") }, tDsn)));
  let D = ok("mkp.unggah", { semester: smt, kode: "231041217", komp: "rps", kelompok: "JEPANG", nama: "RPS Jepang.pdf", isi: pdf("jp") }, tDsn);
  const kJp = D.kelompok.find(x => x.k === "JEPANG");
  cek("RPS Jepang tersimpan per kelompok; MK belum lengkap selama Jerman/Perancis belum", kJp.rps && kJp.rps.nama === "RPS Jepang.pdf" && kJp.boleh && !D.kelompok.find(x => x.k === "JERMAN").boleh && !D.lengkap.includes("rps") && kJp.utama.length === 1);
  ok("mkp.unggah", { semester: smt, kode: "231041217", komp: "rps", kelompok: "JERMAN", tautan: "https://drive.google.com/rps-jerman" }, tD2);
  ok("mkp.metode", { semester: smt, kode: "231041217", kelompok: "JERMAN", metode: ["Case based learning"] }, tD2);
  D = ok("mkp.unggah", { semester: smt, kode: "231041217", komp: "rps", kelompok: "PERANCIS", nama: "RPS Perancis.pdf", isi: pdf("fr") }, tKps);
  cek("semua kelompok punya RPS → komponen RPS MK lengkap; metode per kelompok", D.lengkap.includes("rps") && D.kelompok.find(x => x.k === "JERMAN").metode.v.join() === "Case based learning" && !D.lengkap.includes("metode"));
  cek("lihat RPS kelompok (tautan) dan hapus oleh pengampu kelompoknya", ok("mkp.lihat", { semester: smt, kode: "231041217", komp: "rps", kelompok: "JERMAN" }, tKps).url === "https://drive.google.com/rps-jerman"
    && !ok("mkp.hapus", { semester: smt, kode: "231041217", komp: "rps", kelompok: "JEPANG" }, tDsn).kelompok.find(x => x.k === "JEPANG").rps);
  // Kelompok dihapus dari kurikulum → baris kelompok diabaikan (data tidak dihapus).
  ok("dp.mkSimpan", { data: { kode: "231041217", nama: "Bahasa Asing Pilihan Kepemanduan Dasar", semester: 3, sksKuliah: 2, kelompok: "" } }, tAdm);
  cek("kelompok dikosongkan: tim kelompok diabaikan (MK tampil belum punya tim), data tetap di sheet", tim().anggota.length === 0 && (g.sheets.TimPengajar || []).slice(1).some(r => r[1] === "231041217" && /\//.test(String(r.at(-1)))));
  const app = fs.readFileSync("web/aplikasi.js", "utf8");
  cek("tampilan: isian kelompok di formulir MK, label Kelas A · Jepang, templat kelas/kelompok, Portofolio pilih kelompok",
    /id="mkKel"/.test(app) && /const labelKunciTim/.test(app) && /teksKunciTim\(t, k\)/.test(app) && /data-act="mkpKel"/.test(app));
}
