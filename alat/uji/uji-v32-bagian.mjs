// Uji v0.32.0: risalah rapat, finalisasi → tindak lanjut, pindaian risalah/daftar hadir → Bank Dokumen.
export function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tD2, tSA }) {
  console.log("43. Risalah rapat dan bukti");
  const dsn = ID("199001152015041001"), d2 = ID("198001012005011009");
  const pdf = n => Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(n || 40, 66)]).toString("base64");
  cek("migrasi: kolom risalah dan berkas di akhir tabel Rapat; SKEMA_VERSI ≥ 25", g.sheets.Rapat[0].slice(-2).join() === "risalah,berkas" && Number(g.props.SKEMA_VERSI) >= 25);
  const kini = ok("rapat.ref", {}, tAdm).hariIni;
  const dasar = { jenis: "iab", judul: "Rapat IAB uji risalah", tgl: kini, jamMulai: "09:00", tempat: "Ruang Rapat", agenda: [{ t: "Evaluasi kurikulum", butir: [7] }, { t: "Rencana kerja sama", butir: [59] }], peserta: { u: [dsn, d2], kelas: [], tamu: [{ nama: "Mitra IAB", instansi: "PT Mitra" }] } };
  const idDraf = ok("rapat.simpan", { data: Object.assign({}, dasar, { judul: "Rapat draf" }) }, tAdm).id;
  cek("risalah tidak bisa untuk rapat yang masih draf", /sudah terbit/.test(salah("rapat.risalahSimpan", { id: idDraf, risalah: {} }, tAdm)));
  const id = ok("rapat.simpan", { data: dasar }, tAdm).id;
  ok("rapat.terbit", { id }, tKps);
  cek("pindaian risalah ditolak sebelum risalah final", /Finalkan risalah/.test(salah("rapat.berkas", { id, jenis: "risalah", berkas: { nama: "r.pdf", isi: pdf() } }, tAdm)));
  cek("dosen biasa tidak bisa menulis risalah", /izin/.test(salah("rapat.risalahSimpan", { id, risalah: {} }, tDsn)));
  const ris = { pimpinan: "Koordinator Program Studi", notulis: "", mulai: "09:05", selesai: "11:00", jumlahHadir: "7", lain: "Rapat berikutnya Juni 2027",
    agenda: [{ pembahasan: "Mitra menyarankan CPL bahasa asing ditambah.", keputusan: [{ t: "Revisi CPL bahasa asing", pj: dsn, tenggat: "2027-01-31", butir: [7, 999] }, { t: "Informasi: mitra bersedia jadi penguji", pj: "" }, { t: "" }] },
      { pembahasan: "Draf PKS dibahas.", keputusan: [{ t: "Kirim draf PKS ke mitra", pj: d2 }] }, { pembahasan: "baris lebih", keputusan: [] }] };
  cek("penanggung jawab keputusan harus dosen/tendik; jam HH:MM", /dosen\/tendik/.test(salah("rapat.risalahSimpan", { id, risalah: Object.assign({}, ris, { agenda: [{ keputusan: [{ t: "X", pj: ID("250103") }] }] }) }, tAdm))
    && /HH:MM/.test(salah("rapat.risalahSimpan", { id, risalah: Object.assign({}, ris, { mulai: "9" }) }, tAdm)));
  let r = ok("rapat.risalahSimpan", { id, risalah: ris }, tAdm).risalah;
  cek("draf risalah: agenda mengikuti undangan (2), keputusan kosong dibuang, butir disaring, jumlah hadir angka", r.status === "draf" && r.agenda.length === 2 && r.agenda[0].keputusan.length === 2 && r.agenda[0].keputusan[0].butir.join() === "7" && r.jumlahHadir === 7);
  cek("Admin Prodi tidak bisa memfinalkan; KPS: notulis wajib", /izin/.test(salah("rapat.risalahFinal", { id }, tAdm)) && /notulis/.test(salah("rapat.risalahFinal", { id }, tKps)));
  ok("rapat.risalahSimpan", { id, risalah: Object.assign({}, ris, { notulis: "Admin Prodi" }) }, tAdm);
  const nTl0 = ok("tl.daftar", {}, tKps).tl.length;
  const F = ok("rapat.risalahFinal", { id }, tKps);
  const TL = ok("tl.daftar", {}, tKps).tl;
  const t1 = TL.find(t => t.uraian === "Revisi CPL bahasa asing"), t2 = TL.find(t => t.uraian === "Kirim draf PKS ke mitra");
  cek("final: 2 keputusan berpenanggung jawab menjadi tindak lanjut (sumber rapat)", F.tindakLanjut === 2 && TL.length === nTl0 + 2 && t1 && t1.sumber === "rapat" && t1.pj === dsn && t1.tenggat === "2027-01-31" && /Rapat IAB uji risalah/.test(t1.sumberRef));
  cek("butir tindak lanjut: dari keputusan, atau dari agenda bila kosong", t1.butir.join() === "7" && t2.butir.join() === "59");
  let D = ok("rapat.detail", { id }, tKps).rapat;
  cek("risalah final mencatat id tindak lanjut; tidak bisa diubah lagi", D.risalah.status === "final" && D.risalah.agenda[0].keputusan[0].tl === t1.id && !D.risalah.agenda[0].keputusan[1].tl
    && /sudah final/.test(salah("rapat.risalahSimpan", { id, risalah: ris }, tAdm)) && !D.bolehRisalah && !D.bolehFinal);
  cek("setelah risalah final: undangan tidak bisa diubah/dibatalkan", /sudah final/.test(salah("rapat.simpan", { data: Object.assign({}, dasar, { id }) }, tKps)) && /tidak bisa dibatalkan/.test(salah("rapat.batal", { id, alasan: "Uji pembatalan" }, tKps)) && !D.bolehUbah && !D.bolehBatal);
  cek("peserta melihat risalah final; rekap memuat NIP/NIM", ok("rapat.detail", { id }, tDsn).rapat.risalah.status === "final" && D.rekap.daftar.every(x => "no" in x) && D.slotBank === "Butir 3: Notulen rapat IAB tahun berjalan");
  cek("berkas: jenis dikenal; berkas Excel ditolak; isi palsu ditolak", /tidak dikenal/.test(salah("rapat.berkas", { id, jenis: "foto", berkas: { nama: "a.pdf", isi: pdf() } }, tAdm))
    && /PDF, gambar/.test(salah("rapat.berkas", { id, jenis: "hadir", berkas: { nama: "a.xlsx", isi: pdf() } }, tAdm)) && /tidak sesuai/.test(salah("rapat.berkas", { id, jenis: "hadir", berkas: { nama: "a.png", isi: pdf() } }, tAdm)));
  let B = ok("rapat.berkas", { id, jenis: "hadir", berkas: { nama: "Daftar hadir.pdf", isi: pdf() } }, tAdm);
  cek("daftar hadir terunggah (tidak masuk Bank Dokumen)", B.bank === "" && ok("rapat.detail", { id }, tAdm).rapat.berkas.hadir.nama === "Daftar hadir.pdf");
  B = ok("rapat.berkas", { id, jenis: "risalah", berkas: { nama: "Risalah IAB bertanda tangan.pdf", isi: pdf(60) } }, tAdm);
  const f1 = Object.values(g.files).find(f => /^Risalah - Risalah IAB bertanda tangan\.pdf$/.test(f.nama || ""));
  let slot = ok("bank.data", {}, tKps).slot.find(s => s.kunci === "3-2");
  cek("pindaian risalah tersimpan di Drive Rapat dan otomatis jadi versi baru Bank Dokumen butir 3", B.bank === "Butir 3: Notulen rapat IAB tahun berjalan" && f1 && /Rapat IAB uji risalah/.test(f1.folder.nama)
    && slot.versi.length >= 1 && /otomatis dari menu Rapat/.test(slot.versi.at(-1).ket) && slot.versi.at(-1).nama === "Risalah IAB bertanda tangan.pdf");
  const nV = slot.versi.length;
  ok("rapat.berkas", { id, jenis: "risalah", tautan: "https://drive.google.com/risalah-iab-revisi" }, tAdm);
  slot = ok("bank.data", {}, tKps).slot.find(s => s.kunci === "3-2");
  cek("ganti risalah: berkas lama ke sampah, Bank Dokumen dapat versi baru (versi lama tetap)", f1.terbuang === true && slot.versi.length === nV + 1 && slot.versi.at(-1).t === "tautan");
  ok("rapat.berkas", { id, jenis: "hadir", berkas: { nama: "Daftar hadir.pdf", isi: pdf(50) } }, tAdm);
  cek("berkas bisa dibuka pengelola; peserta biasa tidak", ok("rapat.berkasLihat", { id, jenis: "hadir" }, tKps).mime === "application/pdf" && /izin/.test(salah("rapat.berkasLihat", { id, jenis: "hadir" }, tDsn)));
  const idP = ok("rapat.simpan", { data: Object.assign({}, dasar, { jenis: "prodi", judul: "Rapat prodi uji" }) }, tAdm).id;
  ok("rapat.terbit", { id: idP }, tKps);
  ok("rapat.risalahSimpan", { id: idP, risalah: Object.assign({}, ris, { notulis: "Tendik", agenda: [{ pembahasan: "Dibahas", keputusan: [] }] }) }, tAdm);
  cek("finalisasi tanpa keputusan berpenanggung jawab: 0 tindak lanjut", ok("rapat.risalahFinal", { id: idP }, tKps).tindakLanjut === 0);
  cek("rapat jenis tanpa slot Bank Dokumen: pindaian tidak masuk Bank", ok("rapat.berkas", { id: idP, jenis: "risalah", berkas: { nama: "r.pdf", isi: pdf() } }, tAdm).bank === "");
  const nanti = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
  const idN = ok("rapat.simpan", { data: Object.assign({}, dasar, { judul: "Rapat nanti", tgl: nanti }) }, tAdm).id;
  ok("rapat.terbit", { id: idN }, tKps);
  ok("rapat.risalahSimpan", { id: idN, risalah: Object.assign({}, ris, { notulis: "Tendik" }) }, tAdm);
  cek("draf risalah boleh disiapkan sebelum rapat, tetapi final baru pada/sesudah tanggal rapat", /belum berlangsung/.test(salah("rapat.risalahFinal", { id: idN }, tKps)));
}
