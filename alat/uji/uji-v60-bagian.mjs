// Uji v0.60.0: publikasi & sitasi dari SINTA (Garuda, Google Scholar, Scopus, WoS + ringkasan profil), daftar Kegiatan Admin memuat draf SINTA,
// urutan tahun terbaru dulu. Melanjutkan keadaan uji v0.59.0 (dosen DTPS ber-ID SINTA 9000001 dan 9000002). HTML di sini buatan (bukan data asli).
import fs from "node:fs";
import vm from "node:vm";
const HAL = (nama, isi) => `<html><body><h3><a href="#!">${nama}</a> <small></small></h3>${isi}<a href="https://sinta.kemdiktisaintek.go.id/logins" class="btn">View more ...</a></body></html>`;
const GARUDA = (judul, jurnal, penulis, tahun, doi, akred) => `<div class="ar-list-item mb-5"> <div class="ar-title"> <a href="https://garuda.example/documents/detail/1" target="_blank"> ${judul} </a> </div> <div class="ar-meta"> <a href="#!"> Penerbit Uji </a> <a href="https://garuda.example/journal/view/1" class="ar-pub" target="_blank"><i class="el el-book"></i>${jurnal}</a> </div> <div class="ar-meta"> <a href="#!">Author Order : 1 of 2</a> <br> <a href="#!">${penulis.join("; ")}</a> <br> <a class="ar-year" href="#!"><i class="zmdi zmdi-calendar"></i> ${tahun}</a> <a class="ar-cited" href="#!"><i class="zmdi zmdi-comment-list"></i> DOI: ${doi}</a> ${akred ? `<a class="ar-quartile" href="#!"><i class="zmdi zmdi-chart-donut"></i> Accred : ${akred}</a>` : ""} </div> </div>`;
const GS = (judul, penulis, terbit, tahun, sit) => `<div class="ar-list-item mb-5"> <div class="ar-title"> <a href="https://scholar.example/?q=x" target="_blank">${judul}</a> </div> <div class="ar-meta"> <a href="#!">Authors : ${penulis}</a> <a href="#!" class="ar-pub"><i class="el el-book"></i>${terbit} </a> </div> <div class="ar-meta"> <a class="ar-year" href="#!"><i class="zmdi zmdi-calendar"></i> ${tahun}</a> <a class="ar-cited" href="#!"><i class="zmdi zmdi-comment-list"></i> ${sit} cited</a> </div> </div> <!-- <hr> -->`;
const SCOPUS = (judul, q, jurnal, tahun, sit) => `<div class="ar-list-item mb-5"> <div class="ar-title"> <a href="https://scopus.example/record/1" target="_blank">${judul} </a> </div> <div class="ar-meta"> <a class="ar-quartile" href="#!" style="margin-left: 0px;"><i class="zmdi zmdi-chart-donut"></i> ${q}</a> <a href="https://scopus.example/sourceid/1" class="ar-pub" target="_blank"><i class="el el-book"></i>${jurnal}</a> <br> <a href="#!">Author Order : 1 of 3</a> &nbsp;&nbsp;&nbsp; <a href="#!">Creator : Satu D.U.</a> </div> <div class="ar-meta"> <a class="ar-year" href="#!"><i class="zmdi zmdi-calendar"></i> ${tahun}</a> <a class="ar-cited" href="#!"><i class="zmdi zmdi-comment-list"></i> ${sit} cited</a> </div> </div>`;
const STAT = `<table class="table table-borderless table-sm text-center stat-table"> <thead> <tr> <th>&nbsp;</th> <th class="text-warning">Scopus</th> <th class="text-success">GScholar</th> <th class="text-primary d-none">WOS</th> </tr> </thead> <tbody>
  <tr> <td class="text-left" scope="row">Article</td> <td class="text-warning">2</td> <td class="text-success">26</td> <td class="text-primary d-none">0</td> </tr>
  <tr> <td class="text-left" scope="row">Citation</td> <td class="text-warning">3</td> <td class="text-success">87</td> <td class="text-primary d-none">0</td> </tr>
  <tr> <td class="text-left" scope="row">H-Index</td> <td class="text-warning">1</td> <td class="text-success">5</td> <td class="text-primary d-none"></td> </tr> </tbody> </table>`;

export async function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tD2 }) {
  console.log("76. Publikasi & sitasi dari SINTA, daftar Kegiatan Admin");
  const ctx = { console }; vm.createContext(ctx); vm.runInContext(fs.readFileSync("web/sinta-tarik.js", "utf8"), ctx);
  const pub = ctx.UPW_SINTA_PUB, stat = ctx.UPW_SINTA_STAT;
  const S = stat(HAL("DOSEN UJI SATU", STAT));
  cek("pembaca ringkasan profil: nama, artikel/sitasi/h-index per Scopus dan Google Scholar", S.nama === "DOSEN UJI SATU" && S.stat.gs.artikel === 26 && S.stat.gs.sitasi === 87 && S.stat.gs.h === 5 && S.stat.scopus.sitasi === 3, S);
  const Bg = pub(HAL("DOSEN UJI SATU", GARUDA("Peran Pemandu Wisata Uji di Bali", "Jurnal Uji Pariwisata Vol. 1 No. 2 (2026)1-10", ["Dosen Uji Satu", "Dosen Uji Dua"], 2026, "10.1234/uji.v1i2.1", "Sinta 2")
    + GARUDA("Artikel Lama Tanpa Akreditasi", "Jurnal Lokal Uji", ["Dosen Uji Satu"], 2024, "10.1234/lama", "")), "garuda", "9000001");
  cek("pembaca Garuda: judul, jurnal, penulis bernama lengkap, tahun, DOI, akreditasi", Bg.item.length === 2 && Bg.item[0].judul === "Peran Pemandu Wisata Uji di Bali" && Bg.item[0].doi === "10.1234/uji.v1i2.1"
    && Bg.item[0].akred === "Sinta 2" && Bg.item[0].penulis.join("|") === "Dosen Uji Satu|Dosen Uji Dua" && Bg.item[0].tahun === 2026 && Bg.item[0].sitasi === null, Bg.item[0]);
  const Bs = pub(HAL("DOSEN UJI SATU", GS("PERAN PEMANDU WISATA UJI DI BALI", "DU Satu, DU Dua", "Jurnal Uji Pariwisata 1 (2), 1-10, 2026", 2026, 5) + GS("Buku Ajar Uji", "DU Satu", "Penerbit Uji, 2025", 2025, 2)), "googlescholar", "9000001");
  cek("pembaca Google Scholar: jumlah sitasi per artikel, penulis dipisah koma", Bs.item.length === 2 && Bs.item[0].sitasi === 5 && Bs.item[1].sitasi === 2 && Bs.item[0].penulis.length === 2, Bs.item);
  const Bc = pub(HAL("DOSEN UJI SATU", SCOPUS("Scopus Jurnal Uji", "Q1 as Journal", "International Journal of Uji", 2025, 4) + SCOPUS("Scopus Prosiding Uji", "Q4 as Conference Proceedings", "Proceedings of Uji Conference", 2023, 1)), "scopus", "9000001");
  cek("pembaca Scopus: kuartil dan jenis terbitan", Bc.item[0].kuartil === "Q1" && /Journal/.test(Bc.item[0].tipe) && /Conference/.test(Bc.item[1].tipe) && Bc.item[0].sitasi === 4, Bc.item);

  const dsn = ID("199001152015041001"), d2 = ID("198001012005011009");
  const M = ok("sinta.mulai", {}, tAdm);
  // skrip mencocokkan penulis Garuda bernama lengkap dengan nama profil dosen lain → anggota ber-ID SINTA
  const garuda = Bg.item.map(x => Object.assign({}, x, { anggota: x.penulis.includes("Dosen Uji Dua") ? [{ sinta: "9000002", nama: "DOSEN UJI DUA" }] : [] }));
  let j = ok("sinta.kirim", { kode: M.kode, item: garuda, statistik: { "9000001": S.stat } }, null);
  const pubSinta = () => g.ctx.semuaKegiatan().filter(k => k.jenis === "publikasi" && k.sinta);
  let P = pubSinta().find(k => k.judul === "Peran Pemandu Wisata Uji di Bali");
  cek("publikasi Garuda baru: draf, kedua dosen ditandai, kategori terakreditasi SINTA, jurnal, DOI, luaran Penelitian", j.baru === 2 && P && P.status === "draf" && P.olehId === dsn && P.pegawai.join() === d2
    && P.isian["Kategori publikasi"] === "Jurnal nasional terakreditasi (SINTA)" && /Jurnal Uji Pariwisata/.test(P.isian["Nama jurnal / seminar"]) && P.isian["DOI / tautan"] === "https://doi.org/10.1234/uji.v1i2.1" && P.isian["Luaran dari"] === "Penelitian", P);
  const L0 = pubSinta().find(k => k.judul === "Artikel Lama Tanpa Akreditasi");
  cek("Garuda tanpa akreditasi: kategori dikosongkan (dosen memilih)", L0 && !L0.isian["Kategori publikasi"]);
  j = ok("sinta.kirim", { kode: M.kode, item: Bs.item }, null);
  P = pubSinta().find(k => k.id === P.id);
  const Pm = JSON.parse(P.sinta), B0 = pubSinta().find(k => k.judul === "Buku Ajar Uji");
  cek("Google Scholar judul sama (huruf besar) digabung: sitasi terisi, tidak ganda; judul hanya di Scholar tetap dibuat tanpa kategori", j.sudah === 1 && j.baru === 1 && P.isian["Jumlah sitasi (Google Scholar)"] === "5"
    && Pm.asal.join() === "garuda,googlescholar" && Pm.akred === "Sinta 2" && B0 && !B0.isian["Kategori publikasi"] && B0.isian["Jumlah sitasi (Google Scholar)"] === "2", Pm);
  // profil dosen kedua menampilkan judul yang sama dengan sitasi lebih kecil pada tarikan yang sama → tetap angka terbesar
  ok("sinta.kirim", { kode: M.kode, item: [Object.assign({}, Bs.item[0], { dari: "9000002", sitasi: 3 })] }, null);
  cek("tarikan yang sama dari profil lain: sitasi tetap angka terbesar", pubSinta().find(k => k.id === P.id).isian["Jumlah sitasi (Google Scholar)"] === "5");
  j = ok("sinta.kirim", { kode: M.kode, item: Bc.item, selesai: true, ringkas: { dosen: 2, item: 9, gagal: [] } }, null);
  const Sj = pubSinta().find(k => k.judul === "Scopus Jurnal Uji"), Sp = pubSinta().find(k => k.judul === "Scopus Prosiding Uji");
  cek("Scopus: jurnal → internasional bereputasi, prosiding → seminar internasional", Sj && Sj.isian["Kategori publikasi"] === "Jurnal internasional bereputasi (Scopus/WoS)" && Sp && Sp.isian["Kategori publikasi"] === "Seminar internasional", [Sj && Sj.isian, Sp && Sp.isian]);
  const D = ok("sinta.data", {}, tAdm).dosen, D1 = D.find(x => x.id === dsn);
  cek("Data Prodi › SINTA: jumlah publikasi per dosen dan ringkasan profil", D1.jumlah.publikasi === 5 && D.find(x => x.id === d2).jumlah.publikasi === 1 && D1.stat && D1.stat.gs.sitasi === 87, D1);
  const det = ok("kegiatan.detail", { id: P.id }, tD2).kegiatan;
  cek("detail publikasi: dosen tertandai bisa mengubah; data SINTA (asal, sitasi, jurnal) terkirim", det.bisaUbah && det.sinta.pub === 1 && det.sinta.sitasi === 5 && det.sinta.asal.length === 2 && /Jurnal Uji/.test(det.sinta.jurnal));
  // dosen mengisi kategori sendiri → tidak ditimpa tarikan berikutnya; publikasi disetujui → sitasi tetap diperbarui
  const k1 = g.ctx.ambilKegiatan(B0.id); k1.isian["Kategori publikasi"] = "Seminar nasional"; g.ctx.simpanKegiatan(k1);
  const k2 = g.ctx.ambilKegiatan(P.id); k2.status = "disetujui"; k2.tgl = "2026-02-01"; k2.sampai = "2026-02-01"; g.ctx.simpanKegiatan(k2);
  const M2 = ok("sinta.mulai", {}, tAdm);
  j = ok("sinta.kirim", { kode: M2.kode, item: [Object.assign({}, Bs.item[0], { sitasi: 9 }), Object.assign({}, Bs.item[1], { sitasi: 1 })] }, null);
  const P2 = g.ctx.ambilKegiatan(P.id), B2 = g.ctx.ambilKegiatan(B0.id);
  cek("tarikan baru: sitasi diperbarui juga untuk publikasi yang sudah disetujui (tercatat di riwayat); turun pun mengikuti angka terbaru", j.sitasi === 2 && P2.status === "disetujui"
    && P2.isian["Jumlah sitasi (Google Scholar)"] === "9" && P2.riwayat.some(r => /sitasi Google Scholar diperbarui dari SINTA: 5 → 9/.test(r.c)) && B2.isian["Jumlah sitasi (Google Scholar)"] === "1", j);
  cek("isian yang sudah diisi dosen tidak ditimpa SINTA", B2.isian["Kategori publikasi"] === "Seminar nasional");
  cek("publikasi disetujui: dosen tidak ditandai ulang/diubah selain sitasi", P2.pegawai.join() === d2);

  // daftar Kegiatan: Admin "Semua kegiatan" memuat draf SINTA, bukan draf pribadi dosen; urutan tahun terbaru dulu
  const pribadi = ok("kegiatan.simpan", { peran: "dosen", data: { jenis: "publikasi", judul: "Draf Pribadi Dosen Uji", pegawai: [], kelas: [], excl: [], mhs: [], perluST: false } }, tDsn).kegiatan;
  const Ls = ok("kegiatan.daftar", { lingkup: "semua" }, tAdm).kegiatan, ids = Ls.map(k => k.id);
  cek("Admin › Semua kegiatan: draf dari SINTA tampil, draf pribadi dosen tetap tersembunyi", ids.includes(L0.id) && ids.includes(Sp.id) && !ids.includes(pribadi.id));
  const iy = id => ids.indexOf(id);
  cek("urutan: data SINTA tanpa tanggal mengikuti tahun SINTA (2026 → 2025 → 2024 → 2023)", iy(B0.id) > -1 && iy(Sj.id) < iy(L0.id) && iy(L0.id) < iy(Sp.id), Ls.map(k => k.judul + " " + (k.tgl || (k.sinta && k.sinta.tahun))));
  const Ld = ok("kegiatan.daftar", {}, tDsn).kegiatan.map(k => k.id);
  cek("Kegiatan saya (dosen): urutan sama", Ld.indexOf(Sj.id) < Ld.indexOf(L0.id) && Ld.indexOf(L0.id) < Ld.indexOf(Sp.id));
  ok("kegiatan.hapus", { id: pribadi.id }, tDsn);
  const app = fs.readFileSync("web/aplikasi.js", "utf8");
  cek("tampilan: kolom Publikasi dan Profil SINTA, blok publikasi di detail", /<th>Publikasi<\/th><th>Profil SINTA<\/th>/.test(app) && /function statSintaHtml/.test(app) && /if \(s\.pub\)/.test(app));
}
