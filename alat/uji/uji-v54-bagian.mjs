// Uji v0.54.0: pengesahan elektronik RPS (dosen → KPS → Ketua Jurusan) dan kontrak kuliah (dosen → perwakilan mahasiswa → KPS), Word templat saja,
// verifikasi ?cek=SAH-…, peran Ketua Jurusan, lampiran pengajuan di surat tugas (tampilan).
import fs from "node:fs";
import vm from "node:vm";
import { docxUji } from "./bantu-docx.mjs";
export async function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tD2, tSA }) {
  console.log("70. Pengesahan elektronik RPS dan kontrak kuliah");
  const C = g.ctx, kini = ok("mkp.saya", {}, tDsn).semester, dsn = ID("199001152015041001"), m1 = ID("250103");
  // akun Ketua Jurusan (hanya peran kajur: tidak dihitung sebagai dosen prodi)
  ok("admin.impor", { baris: [{ username: "197001012000031001", nama: "Dr. Ketua Jurusan Uji, M.Par.", peran: "kajur" }] }, tSA);
  const rk = C.cari("Pengguna", x => String(x.username) === "197001012000031001");
  cek("akun Ketua Jurusan dibuat lewat impor Super Admin dengan peran kajur", !!rk && String(rk.peran) === "kajur");
  const tKj = ok("masuk", { username: "197001012000031001", sandi: "197001012000031001" }).token;
  C.ubah("Pengguna", C.cari("Pengguna", x => String(x.username) === "197001012000031001"), { status: "aktif", wajibGanti: false }); C._isi = {};
  cek("peran kajur sah; akun kajur-saja bukan dosen prodi (tidak di daftar pegawai rapat)", ok("saya", {}, tKj).pengguna.peran.join() === "kajur"
    && !ok("rapat.ref", {}, tAdm).pegawai.some(o => o.id === rk.id));
  // unggah: hanya Word templat
  cek("RPS: Word yang bukan templat aplikasi ditolak", /templat Word dari aplikasi/.test(salah("mkp.unggah", { semester: kini, kode: "UPW992", komp: "rps", kunci: "A", nama: "RPS lain.docx", isi: docxUji("lain") }, tDsn))
    && /templat Word dari aplikasi/.test(salah("mkp.unggah", { semester: kini, kode: "UPW992", komp: "kontrak", kunci: "A", nama: "K.docx", isi: docxUji("rps") }, tDsn)));
  let D = ok("mkp.unggah", { semester: kini, kode: "UPW992", komp: "rps", kunci: "A", nama: "RPS sah.docx", isi: docxUji("rps", "versi 1") }, tDsn);
  const eA = D.kelas.find(k => k.k === "A").rps;
  cek("RPS Word templat diterima: status Belum diajukan", eA.tpl && eA.sah.st === "draf" && D.kelas.find(k => k.k === "B").rps.sah.st === "draf");
  const q = { semester: kini, kode: "UPW992", kunci: "A", komp: "rps" };
  cek("hanya pengampu utama yang mengajukan; Kajur/KPS belum bisa memutuskan draf", /izin|pengampu utama|anggota/.test(salah("mkp.sahAjukan", q, tKps))
    && /tidak sedang menunggu/.test(salah("mkp.sahPutus", { ...q, keputusan: "setuju" }, tKps)));
  ok("mkp.sahAjukan", q, tDsn);
  let L = ok("sah.daftar", {}, tKps).dokumen.find(x => x.kode === "UPW992" && x.komp === "rps");
  cek("diajukan: menunggu KPS, berkode SAH-…, RPS bersama satu baris di daftar", L && L.sah.st === "kps" && /^SAH-\d{4}-[0-9A-F]{8}$/.test(L.sah.kode) && L.giliran === true
    && ok("sah.daftar", {}, tKps).dokumen.filter(x => x.kode === "UPW992" && x.komp === "rps").length === 1);
  cek("Beranda KPS: RPS menunggu pemeriksaan", ok("tugas.saya", {}, tKps).sahGiliran.some(x => x.kode === "UPW992" && x.komp === "rps"));
  cek("Ketua Jurusan belum bisa sebelum KPS; dosen tidak bisa mengajukan dua kali", /izin/.test(salah("mkp.sahPutus", { ...q, keputusan: "setuju" }, tKj)) && /sudah diajukan/.test(salah("mkp.sahAjukan", q, tDsn)));
  cek("revisi wajib catatan", /catatan/.test(salah("mkp.sahPutus", { ...q, keputusan: "revisi", catatan: "" }, tKps)));
  ok("mkp.sahPutus", { ...q, keputusan: "revisi", catatan: "Bobot UTS belum diisi." }, tKps);
  cek("dikembalikan: status revisi, pengingat untuk dosen", ok("tugas.saya", {}, tDsn).sahRevisi.some(x => x.kode === "UPW992")
    && ok("mkp.detail", { semester: kini, kode: "UPW992", kunci: "B" }, tDsn).kelas.find(k => k.k === "B").rps.sah.st === "revisi");
  ok("mkp.sahAjukan", q, tDsn); ok("mkp.sahPutus", { ...q, keputusan: "setuju" }, tKps);
  cek("KPS setuju → menunggu Ketua Jurusan; Kajur melihatnya", ok("sah.daftar", {}, tKj).dokumen.some(x => x.kode === "UPW992" && x.komp === "rps" && x.giliran && x.sah.st === "kajur"));
  ok("mkp.sahPutus", { ...q, keputusan: "setuju" }, tKj);
  const S1 = ok("sah.daftar", {}, tDsn).dokumen.find(x => x.kode === "UPW992" && x.komp === "rps");
  cek("disahkan Ketua Jurusan: sah, tiga penandatangan, riwayat lengkap", S1.sah.st === "sah" && S1.sah.ttd.map(t => t.k).join() === "dosen,kps,kajur" && S1.sah.riw.length === 5);
  const V = ok("surat.cek", { kode: S1.sah.kode });
  cek("verifikasi ?cek=SAH-…: sah, nama penandatangan, sidik berkas", V.sah === true && V.jenisSurat === "pengesahan" && V.ttd.length === 3 && /Ketua Jurusan Uji/.test(V.ttd[2].nama) && /^[0-9a-f]{64}$/.test(V.hash));
  const B0 = ok("mkp.sahBerkas", q, tKj);
  cek("berkas Word asli + data tanda tangan untuk dibubuhi QR di browser; mahasiswa bukan peserta ditolak", Buffer.from(B0.isi, "base64").toString("latin1").startsWith("PK") && B0.sah.ttd.length === 3 && /Rencana Pembelajaran Semester/.test(B0.judul)
    && /izin/.test(salah("mkp.sahBerkas", q, tM)));
  D = ok("mkp.unggah", { ...q, nama: "RPS sah v2.docx", isi: docxUji("rps", "versi 2") }, tDsn);
  cek("Word baru menggantikan: persetujuan lama gugur (kembali Belum diajukan); kode lama tidak lagi sah", D.kelas.find(k => k.k === "A").rps.sah.st === "draf" && ok("surat.cek", { kode: S1.sah.kode }).sah === false);
  // kontrak
  ok("peserta.simpan", { semester: kini, kodeMk: "UPW992", kunci: "A", userIds: [m1] }, tAdm);
  const k = { semester: kini, kode: "UPW992", kunci: "A", komp: "kontrak" };
  ok("mkp.unggah", { ...k, nama: "Kontrak A.docx", isi: docxUji("kontrak", "A") }, tDsn);
  const Lk = ok("sah.daftar", {}, tDsn).dokumen.find(x => x.kode === "UPW992" && x.komp === "kontrak" && x.kunci === "A");
  cek("kontrak: dosen memilih perwakilan dari peserta kelas", Lk.bolehAjukan && Lk.pilihanMhs.some(m => m.id === m1) && /perwakilan/.test(salah("mkp.sahAjukan", k, tDsn)) && /perwakilan/.test(salah("mkp.sahAjukan", { ...k, mhsId: dsn }, tDsn)));
  ok("mkp.sahAjukan", { ...k, mhsId: m1 }, tDsn);
  cek("mahasiswa perwakilan mendapat tugas; KPS belum bisa", ok("tugas.saya", {}, tM).sahGiliran.some(x => x.komp === "kontrak") && /izin/.test(salah("mkp.sahPutus", { ...k, keputusan: "setuju" }, tKps)));
  ok("mkp.sahBaca", { semester: kini, kode: "UPW992", kunci: "A" }, tM);
  ok("mkp.sahPutus", { ...k, keputusan: "setuju" }, tM);
  ok("mkp.sahPutus", { ...k, keputusan: "setuju" }, tKps);
  const Sk = ok("sah.daftar", {}, tM).dokumen.find(x => x.kode === "UPW992" && x.komp === "kontrak");
  cek("kontrak sah (dosen, perwakilan mahasiswa, KPS); dibaca tercatat; mahasiswa peserta bisa membuka", Sk.sah.st === "sah" && Sk.sah.ttd.map(t => t.k).join() === "dosen,mhs,kps" && Sk.sah.jumlahBaca === 1 && Sk.sudahBaca
    && ok("mkp.sahBerkas", k, tM).sah.st === "sah");
  cek("dosen lain/mahasiswa tidak bisa menyetujui RPS; KPS tidak bisa menyetujui yang sudah sah", /izin|tidak sedang/.test(salah("mkp.sahPutus", { ...k, keputusan: "setuju" }, tKps)));
  // tampilan
  const app = fs.readFileSync("web/aplikasi.js", "utf8"), rps = fs.readFileSync("web/rps.js", "utf8");
  cek("tampilan: menu Pengesahan, unggah RPS/kontrak hanya Word, lampiran pengajuan ikut surat tugas, verifikasi pengesahan, peran Ketua Jurusan",
    /function hSah\(/.test(app) && /data-mfile="\$\{c\.k\}" accept="\$\{c\.k === "rps" \|\| c\.k === "kontrak" \? "\.docx"/.test(app) && /function halamanLampiranAju/.test(app) && /jenisSurat === "pengesahan"/.test(app) && /kajur: "Ketua Jurusan"/.test(app));
  // Pembubuhan QR pada Word (di Node, memakai zip.js + rps.js asli)
  const ctx = { Blob, TextEncoder, TextDecoder, DecompressionStream, Response, Uint8Array, DataView, console }; ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync("web/zip.js", "utf8"), ctx); vm.runInContext(fs.readFileSync("web/rps.js", "utf8"), ctx);
  const buf = Buffer.from(docxUji("rps", "uji cap"), "base64"), qr = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
  const blob = await ctx.UPW_RPS.capSah(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length), { qr, kode: "SAH-2611-ABCDEF12", url: "https://contoh/?cek=SAH-2611-ABCDEF12", judul: "RPS Uji",
    tanda: { dosen: { nama: "Dosen Uji", nomor: "1", sebagai: "Dosen pengampu", waktu: "26 Nov 2026 10.00" }, kps: { nama: "KPS Uji", nomor: "2", sebagai: "KPS", waktu: "26 Nov 2026 11.00" } } });
  const ambil = await ctx.UPW_ZIP.buka(await blob.arrayBuffer(), "Word"), doc = await ambil("word/document.xml"), rel = await ambil("word/_rels/document.xml.rels");
  cek("QR dibubuhkan: [TTE: Dosen Pengampu] diganti gambar + keterangan, lembar pengesahan + kode di akhir, gambar dan relasi ada",
    !/\[TTE:/.test(doc) && /Ditandatangani secara elektronik/.test(doc) && /PENGESAHAN ELEKTRONIK/.test(doc) && /SAH-2611-ABCDEF12/.test(doc) && /rIdUpwTte/.test(rel) && ambil.daftar.includes("word/media/upw-tte-qr.png")
    && /Sebagian tempat tanda tangan/.test(doc));
  const pv = await ctx.UPW_RPS.pratinjauDocx(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length));
  cek("pratinjau Word menjadi HTML", /<p>rps uji cap<\/p>/.test(pv));
}
