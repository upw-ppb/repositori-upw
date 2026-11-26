// Uji v0.58.0: Kalender Akademik — pembaca teks OCR (tiga kalender resmi Poltekpar: Ganjil 2026/2027, Genap 2026/2027, Ganjil 2027/2028),
// teks dari PDF (UPW_PDF.teksPdf), unggah + OCR (tiruan Drive), simpan/setujui, tampil untuk semua pengguna, jadwal survei, hari libur.
import fs from "node:fs";
import vm from "node:vm";
export async function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tSA }) {
  console.log("74. Kalender Akademik (baca otomatis, persetujuan, Beranda, survei, hari libur)");
  const ctx = { Blob, TextEncoder, TextDecoder, DecompressionStream, CompressionStream, Response, Uint8Array, DataView, console, btoa, atob }; ctx.window = ctx; vm.createContext(ctx);
  ["zip.js", "pdf.js", "kalender.js"].forEach(f => vm.runInContext(fs.readFileSync("web/" + f, "utf8"), ctx));
  const KAL = ctx.UPW_KALENDER;
  const A = KAL.baca(fs.readFileSync("kalender-ocr-ganjil.txt", "utf8")).semester, B = KAL.baca(fs.readFileSync("kalender-ocr-genap.txt", "utf8")).semester;
  const ring = S => S.baris.map(r => [r.mulai, r.minggu, r.keg || "-"].join("|")).join(" ");
  const g26 = A[0], gp = B.find(x => x.semester === "2026-2"), g27 = B.find(x => x.semester === "2027-1");
  cek("berkas Ganjil terbaca 1 semester; berkas 2027 terbaca 2 semester (Genap 2026/2027 dan Ganjil 2027/2028)", A.length === 1 && g26.semester === "2026-1" && B.length === 2 && gp && g27);
  const cari = (S, t) => S.baris.find(r => r.mulai === t) || {};
  cek("Ganjil 2026/2027: 25 minggu, her registrasi 13 & 20 Jul, KRS 27 Jul, kuliah perdana 3 Agt, minggu 1 = 10 Agt, UTS 28 Sep & 5 Okt, minggu 14 = 23 Nov, KIMPA 30 Nov, UAS (P) 7 Des, UAS (T) 14 Des",
    g26.baris.length === 25 && cari(g26, "2026-07-06").keg === "" && cari(g26, "2026-07-13").keg === "HER REGISTRASI" && cari(g26, "2026-07-20").keg === "HER REGISTRASI" && /PSDP/.test(cari(g26, "2026-07-27").keg)
    && /KULIAH PERDANA/.test(cari(g26, "2026-08-03").keg) && cari(g26, "2026-08-10").minggu === 1 && cari(g26, "2026-09-28").keg === "UTS (T/P)" && cari(g26, "2026-10-05").keg === "UTS (T/P)"
    && cari(g26, "2026-10-12").minggu === 8 && cari(g26, "2026-11-23").minggu === 14 && cari(g26, "2026-11-30").keg === "KIMPA" && cari(g26, "2026-12-07").keg === "UAS (P)" && cari(g26, "2026-12-14").keg === "UAS (T)" && cari(g26, "2026-12-21").keg === "", ring(g26));
  cek("Genap 2026/2027: 28 Des tanpa kegiatan, her registrasi/KRS 4 & 11 Jan, kuliah perdana 18 Jan, minggu 1 = 25 Jan, minggu 3 diisi dari urutan (ditebak), pekan Nyepi/Idul Fitri dan Dies Natalis tanpa kuliah, UTS 29 Mar, minggu 14 = 24 Mei, UAS (T) 14 Jun",
    cari(gp, "2026-12-28").keg === "" && /KRS/.test(cari(gp, "2027-01-04").keg) && /KRS/.test(cari(gp, "2027-01-11").keg) && cari(gp, "2027-01-18").keg === "KULIAH PERDANA" && cari(gp, "2027-01-25").minggu === 1
    && cari(gp, "2027-02-08").minggu === 3 && cari(gp, "2027-02-08").tebak && cari(gp, "2027-03-08").keg === "" && cari(gp, "2027-03-22").keg === "" && cari(gp, "2027-03-29").keg === "UTS (T/P)"
    && cari(gp, "2027-05-17").keg === "" && cari(gp, "2027-05-24").minggu === 14 && cari(gp, "2027-05-31").keg === "KIMPA" && cari(gp, "2027-06-14").keg === "UAS (T)", ring(gp));
  cek("Ganjil 2027/2028: pekan Galungan 9 Agt tanpa kegiatan (kuliah perdana tetap 2 Agt), minggu 1 = 16 Agt, satu minggu UTS 4 Okt, UAS (T) 13 Des, 20 Des kosong",
    /KULIAH PERDANA/.test(cari(g27, "2027-08-02").keg) && cari(g27, "2027-08-09").keg === "" && cari(g27, "2027-07-12").keg === "HER REGISTRASI" && cari(g27, "2027-08-16").minggu === 1
    && cari(g27, "2027-10-04").keg === "UTS (T/P)" && cari(g27, "2027-12-13").keg === "UAS (T)" && cari(g27, "2027-12-20").keg === "", ring(g27));
  const L = gp.libur.map(h => h.tgl);
  cek("hari libur: tanggal tunggal, rentang (10–11 Mar), 'dan' (18 dan 19 Mei), sabtu/minggu tetap tercatat di minggunya; tahun dari semester",
    ["2027-01-01", "2027-03-08", "2027-03-10", "2027-03-11", "2027-05-18", "2027-05-19", "2027-03-28"].every(t => L.includes(t)) && /Idul Fitri/.test(cari(gp, "2027-03-08").ket)
    && /Paskah/.test(cari(gp, "2027-03-22").ket) && g26.libur.some(h => h.tgl === "2026-08-17" && /Proklamasi/.test(h.l)) && g27.libur.some(h => h.tgl === "2027-12-29"), L.join());
  cek("tanggal tanda tangan (Nusa Dua, …) dan rentang judul (s/d) tidak menjadi minggu", !g26.baris.some(r => r.mulai < "2026-07-06") && !B.some(S => S.semester === "2026-1"));
  // teks dari PDF (penulis PDF sendiri, huruf standar)
  const t = new ctx.UPW_PDF.PdfTulis(), f = t.font("serif", 1);
  await t.halamanBaru(595.28, 841.89, `BT /${f.nama} 12 Tf 72 700 Td (Semester Ganjil TA 2026/2027) Tj ET BT /${f.nama} 12 Tf 72 680 Td (10 Agustus 2026) Tj ET BT /${f.nama} 12 Tf 200 680 Td (T/P) Tj ET`, { fonts: { [f.nama]: f.id } }, []);
  const tx = await ctx.UPW_PDF.teksPdf(t.hasil("uji"));
  cek("teks PDF: per baris (y sama digabung, urut x)", tx.split("\n")[0] === "Semester Ganjil TA 2026/2027" && /^10 Agustus 2026 T\/P$/.test(tx.split("\n")[1]), tx);

  // ---------- server ----------
  const pdf = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(60, 65)]).toString("base64");
  cek("mahasiswa/dosen tidak bisa mengunggah kalender", /izin/.test(salah("kalender.unggah", { berkas: { nama: "k.pdf", isi: pdf } }, tM)) && /izin/.test(salah("kalender.unggah", { berkas: { nama: "k.pdf", isi: pdf } }, tDsn)));
  cek("hanya PDF/gambar", /PDF atau gambar/.test(salah("kalender.unggah", { berkas: { nama: "k.docx", isi: pdf } }, tAdm)));
  const u = ok("kalender.unggah", { berkas: { nama: "KALENDER AKADEMIK 2026-2027 Ganjil.pdf", isi: pdf } }, tAdm);
  const fAsli = g.files[u.fileId], fOcr = Object.values(g.files).find(x => x.mime === "application/vnd.google-apps.document");
  cek("unggah: berkas di Drive 'Kalender Akademik', OCR bahasa Indonesia, Google Dokumen sementara dibuang, hasil PDF teks dikirim", fAsli && fAsli.folder.nama === "Kalender Akademik" && u.ocr && fOcr && fOcr.ocr.ocrLanguage === "id" && fOcr.terbuang === true);
  g.ctx.Drive.ocrGagal = true;
  const u2 = ok("kalender.unggah", { berkas: { nama: "foto.pdf", isi: pdf } }, tAdm); g.ctx.Drive.ocrGagal = false;
  cek("OCR gagal: berkas tetap tersimpan, pesan isi manual", u2.fileId && !u2.ocr && /manual/.test(u2.ocrGalat));
  cek("simpan: tanggal di luar semester dan urutan turun ditolak; berkas tak dikenal ditolak",
    /di luar/.test(salah("kalender.simpan", { semester: "2026-1", fileId: u.fileId, baris: [{ mulai: "2027-03-01", minggu: 1 }] }, tAdm))
    && /urutan/.test(salah("kalender.simpan", { semester: "2026-1", fileId: u.fileId, baris: [{ mulai: "2026-08-10" }, { mulai: "2026-08-03" }] }, tAdm))
    && /tidak ditemukan/.test(salah("kalender.simpan", { semester: "2026-1", fileId: "palsu", baris: g26.baris }, tAdm)));
  let D = ok("kalender.simpan", { semester: "2026-1", fileId: u.fileId, baris: g26.baris, libur: g26.libur, setujui: false }, tAdm);
  cek("draf: terlihat di daftar Admin, belum terlihat pengguna lain", D.semua.some(x => x.semester === "2026-1" && x.status === "draf") && !ok("kalender.data", {}, tM).kalender.length && !("semua" in ok("kalender.data", {}, tM)));
  cek("draf belum bisa dibuka mahasiswa", /tidak ditemukan/.test(salah("kalender.lihat", { semester: "2026-1" }, tM)));
  const jd0 = (ok("survei.jadwal", {}, tAdm).jadwal || []).find(x => x.kunci === "kmhs2-2026-1");
  D = ok("kalender.simpan", { semester: "2026-1", baris: g26.baris, libur: g26.libur, setujui: true }, tAdm);
  const Dm = ok("kalender.data", {}, tM);
  cek("setujui (tanpa mengirim ulang berkas): tampil untuk mahasiswa dan dosen; dokumen asli bisa dibuka", Dm.kalender.some(x => x.semester === "2026-1" && x.status === "terbit" && x.baris.length === 25) && ok("kalender.data", {}, tDsn).kalender.length === 1
    && ok("kalender.lihat", { semester: "2026-1" }, tM).isi === pdf && D.semua.find(x => x.semester === "2026-1").disetujuiOleh);
  const jd = (ok("survei.jadwal", {}, tAdm).jadwal || []).find(x => x.kunci === "kmhs2-2026-1");
  cek("jadwal survei memakai minggu kuliah resmi: survei akhir semester mulai minggu ke-14 (23 Nov 2026), bukan patokan 1 Sep + 91 hari", jd && jd.mulai === "2026-11-23" && (!jd0 || jd0.mulai !== "2026-11-23"), [jd0 && jd0.mulai, jd && jd.mulai]);
  const set = g.ctx.pengaturanSurat();
  cek("hari libur kalender ikut dihitung di batas hari kerja (24 Des cuti bersama)", set.libur.includes("2026-12-24") && set.libur.includes("2026-08-17"));
  ok("kalender.simpan", { semester: "2027-1", fileId: u.fileId, baris: g27.baris, libur: g27.libur, setujui: true }, tAdm);
  cek("semester yang jauh di depan (Ganjil 2027/2028) belum ditampilkan ke pengguna", !ok("kalender.data", {}, tM).kalender.some(x => x.semester === "2027-1"));
  D = ok("kalender.status", { semester: "2026-1" }, tAdm);
  cek("sembunyikan dari Beranda: kembali draf", D.semua.find(x => x.semester === "2026-1").status === "draf" && !ok("kalender.data", {}, tM).kalender.length);
  D = ok("kalender.status", { semester: "2027-1", hapus: true }, tAdm);
  cek("hapus semester", !D.semua.some(x => x.semester === "2027-1"));
  ok("kalender.simpan", { semester: "2026-1", baris: g26.baris, libur: g26.libur, setujui: true }, tAdm);
  const app = fs.readFileSync("web/aplikasi.js", "utf8");
  cek("tampilan: kartu Beranda semua pengguna (minggu ini, agenda, libur), laci kelola/periksa, baca otomatis setelah unggah, bandingkan dengan dokumen asli",
    /\$\{panelKalender\(\)\}/.test(app) && /function laciKalUbah/.test(app) && /UPW_KALENDER\.baca\(await UPW_PDF\.teksPdf/.test(app) && /Bandingkan dengan dokumen asli/.test(app) && /data-kfile/.test(app));
}
