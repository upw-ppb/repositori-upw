// Uji v0.25.0: peran GKM, laporan GKM per semester, kesiapan akreditasi.
export function jalankan({ g, cek, ok, salah, tKps, tDsn, tAdm, tM, tD2, tSA }) {
  console.log("35. GKM dan kesiapan akreditasi");
  const d2 = ok("saya", {}, tD2).pengguna;
  ok("admin.peran", { userId: d2.id, peran: d2.peran.concat(["gkm"]) }, tSA);
  cek("Super Admin memberi peran GKM", ok("saya", {}, tD2).pengguna.peran.includes("gkm"));
  const P = ok("penilaian.data", {}, tD2);
  cek("GKM membuka Penilaian; tidak bisa ubah target", P.rows.length === 84 && !P.bolehTarget && /izin/.test(salah("penilaian.target", { target: 300 }, tD2)));
  ok("penilaian.skor", { ts: P.ts.awal, butir: 1, skor: 3, catatan: "SPMI berjalan, benchmarking belum" }, tD2);
  { const r1 = ok("penilaian.data", {}, tD2).rows.find(r => r.n === 1); cek("GKM mengisi skor butir rubrik; teks memakai istilah GKM", r1.gpm === 3 && /^Dinilai GKM/.test(r1.info), r1.info); }
  cek("GKM bisa lihat iLKPS, Data Prodi, sumber data; tidak bisa Data Terkumpul", ok("ilkps.data", {}, tD2).tabel.length > 20 && ok("dp.data", {}, tD2).dosen && ok("sumber.butir", { butir: 10 }, tD2).bolehUbah === false && /izin/.test(salah("sumber.kegiatan", {}, tD2)));
  cek("GKM melihat kelengkapan dokumen dosen (Data Prodi)", Array.isArray(ok("dp.dokDosen", {}, tD2).dosen));
  cek("dosen biasa dan mahasiswa tidak bisa membuka Laporan GKM / kesiapan", /izin/.test(salah("gkm.data", {}, tDsn)) && /izin/.test(salah("kesiapan.data", {}, tM)));
  let T = ok("tugas.saya", {}, tD2);
  cek("pengingat GKM: jumlah butir rubrik belum dinilai", T.gkm && T.gkm.belumNilai > 30 && T.gkm.belumNilai < 48);
  let D = ok("gkm.data", {}, tD2);
  cek("data laporan: 6 semester, semester berjalan dibuka, 5 bagian, boleh ubah", D.daftar.length === 6 && D.laporan.semester === D.semesterKini && D.bagianDef.length === 5 && D.bolehUbah && D.laporan.status === "belum");
  cek("batas bawaan 14 hari setelah semester berakhir", /^\d{4}-(01-14|07-14)$/.test(D.laporan.batas));
  cek("semester yang belum berjalan ditolak", /belum berjalan/.test(salah("gkm.data", { semester: "2099-1" }, tD2)));
  cek("hanya GKM yang menyusun laporan", /izin/.test(salah("gkm.simpan", { bagian: { monev: "x" } }, tKps)));
  ok("gkm.simpan", { bagian: { monev: "Perkuliahan 95% sesuai RPS.", capaian: "" } }, tD2);
  D = ok("gkm.data", {}, tD2);
  cek("simpan draf", D.laporan.status === "draf" && D.laporan.bagian.monev === "Perkuliahan 95% sesuai RPS.");
  cek("kirim ditolak bila ada bagian kosong", /Lengkapi dulu/.test(salah("gkm.simpan", { bagian: { monev: "Perkuliahan 95% sesuai RPS." }, kirim: true }, tD2)));
  const pdf = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(50)]).toString("base64");
  cek("lampiran: jenis dan isi diperiksa", /PDF, Word/.test(salah("gkm.unggah", { nama: "a.exe", isi: pdf }, tD2)) && /tidak sesuai/.test(salah("gkm.unggah", { nama: "a.docx", isi: pdf }, tD2)));
  ok("gkm.unggah", { nama: "Rekap monev.pdf", isi: pdf }, tD2);
  D = ok("gkm.data", {}, tD2);
  const fid = D.laporan.lampiran[0].fileId;
  cek("lampiran tersimpan dan bisa dibuka KPS", D.laporan.lampiran.length === 1 && ok("gkm.lampiran", { fileId: fid }, tKps).mime === "application/pdf");
  const isi = { monev: "Perkuliahan 95% sesuai RPS.", capaian: "IPK rata-rata 3,45; capaian standar 90%.", temuan: "Dua MK tanpa rubrik penilaian.", rekomendasi: "Lengkapi rubrik sebelum UTS, PJ dosen pengampu.", tindakLanjut: "Rekomendasi semester lalu: selesai." };
  ok("gkm.simpan", { bagian: isi, kirim: true }, tD2);
  D = ok("gkm.data", {}, tD2);
  cek("kirim ke KPS: terkunci untuk GKM", D.laporan.status === "dikirim" && !D.bolehUbah && /menunggu keputusan/.test(salah("gkm.simpan", { bagian: isi }, tD2)) && /menunggu keputusan/.test(salah("gkm.hapusLampiran", { fileId: fid }, tD2)));
  cek("KPS melihat laporan menunggu di Beranda", ok("tugas.saya", {}, tKps).gkmTunggu.length === 1 && ok("gkm.data", {}, tKps).bolehPutus);
  cek("Admin Prodi tidak memutuskan; revisi wajib catatan", /izin/.test(salah("gkm.putuskan", { keputusan: "diterima" }, tAdm)) && /catatan/.test(salah("gkm.putuskan", { keputusan: "revisi", catatan: "" }, tKps)));
  ok("gkm.putuskan", { keputusan: "revisi", catatan: "Tambahkan data kehadiran dosen." }, tKps);
  T = ok("tugas.saya", {}, tD2);
  cek("GKM mendapat pengingat revisi dengan catatan", T.gkm.laporan.some(r => r.status === "revisi") && ok("gkm.data", {}, tD2).laporan.catatan === "Tambahkan data kehadiran dosen.");
  ok("gkm.simpan", { bagian: Object.assign({}, isi, { monev: isi.monev + " Kehadiran dosen 97%." }), kirim: true }, tD2);
  ok("gkm.putuskan", { keputusan: "diterima" }, tKps);
  D = ok("gkm.data", {}, tD2);
  cek("diterima KPS; riwayat lengkap", D.laporan.status === "diterima" && D.laporan.riwayat.map(r => r.aksi).join(",") === "buat,kirim,revisi,kirim_ulang,diterima");
  const ts = P.ts.awal, kiniAwal = Number(D.semesterKini.slice(0, 4));
  if (kiniAwal <= ts) cek("laporan diterima tampil di keterangan Penilaian butir 23 dan sumber data butir 1", /Laporan GKM diterima KPS: 1 semester/.test(ok("penilaian.data", {}, tD2).rows.find(r => r.n === 23).info) && ok("sumber.butir", { ts, butir: 1 }, tD2).lain.some(x => x.kunci === "gkm" && x.baris.length === 1));
  else cek("laporan diterima tampil di keterangan Penilaian butir 23 (TS berjalan)", /Laporan GKM diterima KPS: 1 semester/.test(ok("penilaian.data", { ts: kiniAwal }, tD2).rows.find(r => r.n === 23).info));
  cek("batas: hanya Admin/Super Admin; tanggal sah", /izin/.test(salah("gkm.batas", { semester: D.semesterKini, tanggal: "2027-02-01" }, tD2)) && /YYYY/.test(salah("gkm.batas", { semester: D.semesterKini, tanggal: "besok" }, tAdm)));
  ok("gkm.batas", { semester: D.semesterKini, tanggal: "2027-02-01" }, tAdm);
  cek("batas diubah Admin", ok("gkm.data", {}, tKps).laporan.batas === "2027-02-01");
  const K = ok("kesiapan.data", {}, tKps);
  cek("kesiapan: nilai, target, 5 prioritas dengan saran, data kurang, tabel kosong, bank, laporan GKM", K.total > 0 && K.target > 0 && K.prioritas.length === 5 && K.prioritas.every(r => Array.isArray(r.saran) && r.s4 && r.sr)
    && Array.isArray(K.kurang) && Array.isArray(K.tabelKosong) && K.bankTotal > 0 && K.laporanGkm.length === 2 && K.kriteria.length === 3);
  const kp = K.kurang.find(r => r.n === 64);
  cek("butir PMB (data kosong) disarankan mengisi Data Prodi › PMB dan Bank Dokumen", kp && kp.saran.some(x => /PMB/.test(x.teks) && x.menu === "dprodi") && kp.saran.some(x => x.menu === "bank"), K.kurang.map(r => r.n));
  cek("kesiapan juga untuk GKM dan Super Admin", ok("kesiapan.data", {}, tD2).total === K.total && ok("kesiapan.data", {}, tSA).ok);
  console.log("36. Akun Super Admin bukan data prodi");
  const ts0 = ok("penilaian.data", {}, tSA).ts.awal;
  const sebelum = { P: ok("penilaian.data", {}, tSA).ringkas, dosen: ok("dp.data", {}, tAdm).dosen.length, dir: ok("direktori", {}, tKps).orang.length,
    pengAdm: ok("admin.pengguna", {}, tAdm).pengguna.length, ekspor: ok("admin.eksporAkun", {}, tSA).baris.length, ilkps: ok("ilkps.data", { ts: ts0 }, tSA).tabel.find(t => t.kode === "1").baris.length };
  const sa = ok("saya", {}, tSA).pengguna;
  ok("admin.peran", { userId: sa.id, peran: ["superadmin", "admin", "kps", "gkm", "kalab", "laboran", "dosen", "tendik", "mahasiswa"] }, tSA);
  const sa2 = ok("saya", {}, tSA).pengguna;
  cek("Super Admin dengan semua peran: tidak wajib/tidak memakai biodata", sa2.peran.length === 9 && sa2.jenisBiodata === null && !sa2.perluBiodata);
  const sesudah = { P: ok("penilaian.data", {}, tSA).ringkas, dosen: ok("dp.data", {}, tAdm).dosen.length, dir: ok("direktori", {}, tKps).orang.length,
    pengAdm: ok("admin.pengguna", {}, tAdm).pengguna.length, ekspor: ok("admin.eksporAkun", {}, tSA).baris.length, ilkps: ok("ilkps.data", { ts: ts0 }, tSA).tabel.find(t => t.kode === "1").baris.length };
  cek("jumlah mahasiswa aktif (NM) dan DTPS (NDTPS) di Penilaian tidak bertambah", sesudah.P.NM === sebelum.P.NM && sesudah.P.NDTPS === sebelum.P.NDTPS, [sebelum.P, sesudah.P]);
  cek("Data Prodi › dosen dan Tabel iLKPS 1 tidak bertambah", sesudah.dosen === sebelum.dosen && sesudah.ilkps === sebelum.ilkps);
  cek("tidak tampil di Cari orang dan daftar pengguna Admin Prodi", sesudah.dir === sebelum.dir && sesudah.pengAdm === sebelum.pengAdm && !ok("direktori", {}, tKps).orang.some(o => o.id === sa.id));
  cek("tidak ikut ekspor daftar akun", sesudah.ekspor === sebelum.ekspor && !ok("admin.eksporAkun", {}, tSA).baris.some(r => r[0] === sa.username));
  cek("bukan sasaran survei", ok("survei.saya", {}, tSA).survei.length === 0);
  cek("tidak bisa dipilih sebagai peserta (daftar mahasiswa/pegawai di formulir)", (() => { const r = ok("kegiatan.ref", { peran: "mahasiswa" }, tSA); return !JSON.stringify(r).includes(sa.id); })());
  const n0 = ok("ilkps.data", { ts: ts0 }, tSA).jumlahDisetujui;
  const D0 = ok("sumber.kegiatan", {}, tSA).kegiatan.filter(k => k.akunSistem);
  cek("Data Terkumpul menandai kegiatan akun Super Admin (tidak dihitung)", D0.every(k => !k.dihitung) && ok("ilkps.data", { ts: ts0 }, tSA).jumlahDisetujui === n0);
  ok("admin.peran", { userId: sa.id, peran: ["superadmin"] }, tSA);
  cek("migrasi: LaporanGkm; SKEMA_VERSI ≥ 20", g.sheets.LaporanGkm && Number(g.props.SKEMA_VERSI) >= 20);
}
