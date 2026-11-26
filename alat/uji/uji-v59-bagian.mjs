// Uji v0.59.0: tarik penelitian & PkM dari SINTA — pembaca HTML profil SINTA (sinta-tarik.js), kode sekali pakai, penggabungan tanpa ganda,
// penandaan semua dosen UPW (lewat ID SINTA), hak ubah dosen tertandai, draf tidak dihitung iLKPS, judul yang dihapus tidak ditarik lagi.
import fs from "node:fs";
import vm from "node:vm";
const IT = (judul, ketua, skema, anggota, tahun, dana) => `<div class="ar-list-item mb-5"> <div class="ar-title"> <a href="#!">${judul}</a> </div> <div class="ar-meta"> <a href="#!">Leader : ${ketua}</a> <a href="#!" class="ar-pub"><i class="el el-book"></i>${skema}</a> </div> <div class="ar-meta"> <a href="#!">Personils : </a>${anggota.map(([id, n]) => `<a href="https://sinta.kemdiktisaintek.go.id/authors/profile/${id}">${n}</a>; `).join("")}</div> <div class="ar-meta"> <a class="ar-year" href="#!"><i class="zmdi zmdi-calendar"></i> ${tahun}</a> <a class="ar-quartile" href="#!"><i class="zmdi zmdi-chart-donut"></i> Rp. ${dana}</a> <a class="ar-quartile text-success" href="#!">Approved</a> <a class="ar-quartile text-info" href="#!">INTERNAL SOURCE</a> </div> </div>`;
const HAL = (nama, isi) => `<html><body><div class="col-lg col-md"><h3><a href="#!">${nama}</a> <small></small></h3><div class="meta-profile"></div></div><div>Latest number of activities</div>${isi}<a href="https://sinta.kemdiktisaintek.go.id/logins">View more ...</a></body></html>`;
export async function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tD2, tSA }) {
  console.log("75. Penelitian & PkM dari SINTA");
  const ctx = { console }; vm.createContext(ctx); vm.runInContext(fs.readFileSync("web/sinta-tarik.js", "utf8"), ctx);
  const baca = ctx.UPW_SINTA_BACA;
  const h = HAL("DOSEN UJI SATU", IT("PELATIHAN PAKET WISATA DESA UJI &amp; MITRA", "Dosen Uji Satu", "INSTITUSI INTERNAL ( PKM )", [["9000002", "Dosen Uji Dua"], ["9999999", "Dosen Prodi Lain"]], 2025, "18.440.350")
    + IT("PKM KEDUA DESA UJI", "Dosen Prodi Lain", "INSTITUSI INTERNAL ( PKM )", [["9000001", "Dosen Uji Satu"]], 2026, "3.500.000"));
  const B = baca(h, "pkm", "9000001");
  cek("pembaca SINTA: nama profil, judul (entitas HTML), ketua, skema, anggota ber-ID SINTA, tahun, dana", B.nama === "DOSEN UJI SATU" && B.item.length === 2 && B.item[0].judul === "PELATIHAN PAKET WISATA DESA UJI & MITRA"
    && B.item[0].ketua === "Dosen Uji Satu" && B.item[0].skema === "INSTITUSI INTERNAL ( PKM )" && B.item[0].anggota.map(a => a.sinta).join() === "9000002,9999999" && B.item[0].tahun === 2025 && B.item[0].dana === 18440350
    && B.item[0].status === "Approved" && B.item[0].sumber === "INTERNAL SOURCE", B.item[0]);
  const dsn = ID("199001152015041001"), d2 = ID("198001012005011009"), ta = Number(ok("mkp.saya", {}, tDsn).semester.slice(0, 4));
  [dsn, d2].forEach(u => ok("dp.dosenTsSimpan", { ta, data: { userId: u, status: "Dosen tetap program studi (DTPS)" } }, tAdm));
  cek("ID SINTA: hanya Admin/Super Admin; harus angka; tidak boleh dipakai dua dosen", /izin/.test(salah("sinta.idSimpan", { userId: dsn, sintaId: "9000001" }, tKps))
    && /angka/.test(salah("sinta.idSimpan", { userId: dsn, sintaId: "abc" }, tAdm)));
  ok("sinta.idSimpan", { userId: dsn, sintaId: "9000001" }, tAdm);
  cek("ID SINTA ganda ditolak", /sudah dipakai/.test(salah("sinta.idSimpan", { userId: d2, sintaId: "9000001" }, tAdm)));
  // dosen kedua mengisi sendiri di biodata (boleh berupa alamat profil)
  const bs = ok("biodata.saya", {}, tD2).biodata; ok("biodata.simpan", { data: Object.assign({}, bs.data, { sinta: "https://sinta.kemdiktisaintek.go.id/authors/profile/9000002" }) }, tD2);
  let D = ok("sinta.data", {}, tAdm);
  cek("Data Prodi › SINTA: DTPS dengan ID SINTA (alamat profil di biodata terbaca sebagai angka)", D.dosen.find(x => x.id === dsn).sinta === "9000001" && D.dosen.find(x => x.id === d2).sinta === "9000002" && D.bolehTarik);
  cek("Tarik: hanya Admin/Super Admin", /izin/.test(salah("sinta.mulai", {}, tKps)));
  const M = ok("sinta.mulai", {}, tAdm);
  cek("kode sekali pakai; daftar dosen untuk skrip (tanpa login) hanya DTPS ber-ID SINTA", /^[a-z0-9]{24}$/.test(M.kode) && M.dosen === 2
    && ok("sinta.daftar", { kode: M.kode }).dosen.map(x => x.sinta).sort().join() === "9000001,9000002" && /tidak sah/.test(salah("sinta.daftar", { kode: "x" })) && /kedaluwarsa/.test(salah("sinta.daftar", { kode: "a".repeat(24) })));
  const T17 = () => (ok("ilkps.data", {}, tAdm).tabel.find(t => t.kode === "17").baris[0] || []).slice(2).join();
  const t17 = T17();
  // kegiatan manual dosen dengan judul yang sama (beda huruf besar/kecil) → harus ditautkan, bukan dibuat baru
  const man = ok("kegiatan.simpan", { peran: "dosen", data: { jenis: "pkm", judul: "Pkm Kedua, Desa Uji", tgl: "2026-03-01", sampai: "2026-03-01", pegawai: [], kelas: [], excl: [], mhs: [], perluST: false } }, tDsn).kegiatan;
  const item = B.item.map(x => Object.assign({}, x, { ketuaSinta: x.ketua === "Dosen Uji Satu" ? "9000001" : "" }));
  let j = ok("sinta.kirim", { kode: M.kode, item }, null);
  cek("kirim pertama: 1 judul baru, 1 ditautkan ke data dosen yang sudah ada", j.baru === 1 && j.tertaut === 1, j);
  const semuaSinta = () => Object.values(g.sheets.Kegiatan).length && g.ctx.semuaKegiatan().filter(k => k.sinta);
  let L = semuaSinta(), A = L.find(k => /PAKET WISATA DESA UJI/.test(k.judul));
  cek("judul baru: pencatat = ketua (dosen UPW), dosen kedua ditandai lewat ID SINTA anggota; dosen prodi lain tidak; draf tanpa surat; isian dari SINTA",
    A && A.olehId === dsn && A.pegawai.join() === d2 && A.status === "draf" && A.st === "tanpa" && A.isian["Sumber dana"] === "Perguruan Tinggi" && A.isian["Jumlah dana (Rp)"] === "18440350" && A.isian["Tahap PkM"] === "Pelaksanaan" && !A.tgl, A);
  const Mk = L.find(k => k.id === man.id);
  cek("data dosen yang sama ditautkan ke SINTA (tidak ganda)", Mk && JSON.parse(Mk.sinta).k && L.length === 2);
  // tarikan dari profil dosen kedua: item yang sama → tidak ganda
  const B2 = baca(HAL("DOSEN UJI DUA", IT("Pelatihan Paket Wisata Desa Uji & Mitra", "Dosen Uji Satu", "INSTITUSI INTERNAL ( PKM )", [["9000002", "Dosen Uji Dua"]], 2025, "18.440.350")
    + IT("PENELITIAN BARU DOSEN DUA", "Dosen Uji Dua", "KERJASAMA LUAR NEGERI ( PENELITIAN INSTITUSI )", [], 2026, "400.000.000")), "penelitian", "9000002");
  B2.item[0].jenis = "pkm";
  j = ok("sinta.kirim", { kode: M.kode, item: B2.item, selesai: true, ringkas: { dosen: 2, item: 4, gagal: [] } }, null);
  L = semuaSinta();
  const P = L.find(k => k.judul === "PENELITIAN BARU DOSEN DUA");
  cek("kirim kedua (profil dosen lain): judul yang sama tidak dibuat ulang; penelitian baru dibuat (sumber dana Luar negeri); penarikan terakhir tercatat",
    j.sudah === 1 && j.baru === 1 && L.length === 3 && P.olehId === d2 && P.isian["Sumber dana"] === "Luar negeri" && ok("sinta.data", {}, tAdm).terakhir.ringkas.item === 4, j);
  cek("draf SINTA belum dihitung di Tabel 17", T17() === t17);
  const Dj = ok("sinta.data", {}, tAdm).dosen;
  cek("hitungan per dosen termasuk pencatat (ketua): dosen 1 = 2 PkM, dosen 2 = 1 PkM + 1 penelitian", Dj.find(x => x.id === dsn).jumlah.pkm === 2 && Dj.find(x => x.id === d2).jumlah.pkm === 1 && Dj.find(x => x.id === d2).jumlah.penelitian === 1, Dj.map(x => x.jumlah));
  const det = ok("kegiatan.detail", { id: A.id }, tD2).kegiatan;
  cek("dosen tertandai (bukan pencatat) bisa mengubah dan menghapus; detail memuat data SINTA", det.bisaUbah && det.bisaHapus && det.sinta && det.sinta.ketua === "Dosen Uji Satu" && det.sinta.dana === 18440350);
  ok("kegiatan.simpan", { peran: "dosen", data: { id: A.id, jenis: "pkm", judul: A.judul, tgl: "2025-05-15", sampai: "2025-05-16", tingkat: "Lokal/Wilayah", pegawai: [d2], kelas: [], excl: [], mhs: [ID("250103")], perluST: false,
    isian: Object.assign({}, A.isian, { "Skema PkM": "PkM bersama prodi (dana PT)" }) } }, tD2);
  const A2 = ok("kegiatan.detail", { id: A.id }, tD2).kegiatan;
  cek("perubahan dosen tersimpan dan tanda SINTA tetap ada (klasifikasi yang tidak ada di SINTA)", A2.tgl === "2025-05-15" && A2.isian["Skema PkM"] === "PkM bersama prodi (dana PT)" && A2.sinta && A2.mhs.length === 1);
  cek("Beranda dosen tertandai: data SINTA perlu dilengkapi", ok("tugas.saya", {}, tD2).sintaLengkapi >= 1);
  ok("kegiatan.hapus", { id: P.id }, tD2);
  j = ok("sinta.kirim", { kode: M.kode, item: [B2.item[1]] }, null);
  cek("judul SINTA yang dihapus dosen tidak ditarik lagi", j.diabaikan === 1 && j.baru === 0 && !semuaSinta().some(k => k.id === P.id));
  const app = fs.readFileSync("web/aplikasi.js", "utf8");
  cek("tampilan: tab Penelitian & PkM (SINTA), tombol Tarik Data SINTA, penanda buku, blok SINTA di detail, pengingat Beranda",
    /\["sinta", "Penelitian & PkM \(SINTA\)"\]/.test(app) && /"Tarik Data SINTA"/.test(app) && /function bookmarkletSinta/.test(app) && /function blokSintaKeg/.test(app) && /t\.sintaLengkapi/.test(app));
}
