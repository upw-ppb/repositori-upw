// Uji v0.41.0: unduh ZIP bukti Portofolio MK (mkp.daftarZip, mkp.ambilZip) — memakai MK UPW991/UPW992 dari uji v0.40.0.
export function jalankan({ g, cek, ok, salah, tKps, tDsn, tAdm, tM }) {
  console.log("54. Unduh ZIP Portofolio MK");
  const kini = ok("mkp.saya", {}, tDsn).semester, pdf = s => Buffer.concat([Buffer.from("%PDF-1.4\n" + s), Buffer.alloc(40)]).toString("base64");
  ok("mkp.unggah", { semester: kini, kode: "UPW992", komp: "interaksi", kunci: "A", nama: "foto.pdf", isi: pdf("foto"), ket: "Praktik 1" }, tDsn);
  ok("mkp.integ", { semester: kini, kode: "UPW992", kunci: "A", teks: "Mahasiswa menganalisis data penelitian dosen tentang wisatawan." }, tDsn);
  ok("mkp.metode", { semester: kini, kode: "UPW992", kunci: "A", metode: ["Case based learning"], lain: "" }, tDsn);
  const nLog = (g.sheets.Log || []).length;
  const A = ok("mkp.daftarZip", { semester: kini }, tAdm), m991 = A.mk.find(m => m.kode === "UPW991"), m992 = A.mk.find(m => m.kode === "UPW992");
  cek("daftar ZIP pengelola: semua MK dan semua kelas, RPS bersama tercatat", m991 && m991.kelas.map(u => u.k).join() === "A,B" && m992.kelas.map(u => u.k).join() === "A,B"
    && m992.kelas.every(u => u.berkas.some(e => e.komp === "rps" && e.nama === "RPS sama.pdf")) && m992.kelas[0].rpsBersama.join() === "B");
  const uA = m992.kelas[0];
  cek("daftar ZIP: file, tautan, catatan integrasi, dan metode ikut; jumlah file dan ukuran dihitung", uA.berkas.some(e => e.komp === "interaksi" && e.t === "file" && e.ket === "Praktik 1")
    && uA.berkas.some(e => e.komp === "integ" && /penelitian/.test(e.teks)) && uA.berkas.some(e => e.komp === "kontrak" && e.t === "tautan") && uA.metode.v[0] === "Case based learning"
    && A.jumlahFile >= 4 && A.ukuran > 0 && A.batch > 0);
  cek("daftar ZIP tercatat di Log", (g.sheets.Log || []).length > nLog && JSON.stringify(g.sheets.Log.slice(nLog)).includes("mkp.zip"));
  const D = ok("mkp.daftarZip", { semester: kini, kode: "UPW991" }, tDsn);
  cek("daftar ZIP dosen: hanya kelas yang ia ajar", D.mk.length === 1 && D.mk[0].kelas.map(u => u.k).join() === "A");
  cek("dosen tidak bisa mengunduh kelas yang tidak ia ajar; mahasiswa ditolak", /tidak bisa Anda unduh/.test(salah("mkp.daftarZip", { semester: kini, kode: "UPW991", kunci: "B" }, tDsn))
    && !!salah("mkp.daftarZip", { semester: kini }, tM));
  const it = [{ kode: "UPW991", kunci: "A", komp: "rps" }, { kode: "UPW991", kunci: "B", komp: "rps" }, { kode: "UPW992", kunci: "A", komp: "interaksi", id: uA.berkas.find(e => e.komp === "interaksi" && e.t === "file").id }];
  const J = ok("mkp.ambilZip", { semester: kini, item: it }, tDsn);
  cek("ambil banyak berkas: isi file benar; kelas B (bukan kelasnya) ditolak per berkas tanpa menggagalkan yang lain", J.selesai === 3 && J.hasil[0].ok && Buffer.from(J.hasil[0].isi, "base64").toString().startsWith("%PDF")
    && !J.hasil[1].ok && /tidak bisa Anda unduh/.test(J.hasil[1].galat) && J.hasil[2].ok);
  const Jt = ok("mkp.ambilZip", { semester: kini, item: [{ kode: "UPW992", kunci: "A", komp: "kontrak" }] }, tKps);
  cek("ambil berkas: isian tautan tidak diambil sebagai file", !Jt.hasil[0].ok);
  const lama = g.ctx.MKP_ZIP_BATCH; g.ctx.MKP_ZIP_BATCH = 10;
  const Jb = ok("mkp.ambilZip", { semester: kini, item: [it[0], it[2]] }, tAdm);
  g.ctx.MKP_ZIP_BATCH = lama;
  cek("batas ukuran per panggilan: berhenti setelah batas, sisanya diminta ulang", Jb.selesai === 1 && Jb.hasil.length === 1 && Jb.hasil[0].ok);
  cek("ambil tanpa item ditolak", /Tidak ada berkas/.test(salah("mkp.ambilZip", { semester: kini, item: [] }, tAdm)));
}
