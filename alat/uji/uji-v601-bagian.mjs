// Uji v0.60.1: "Luaran dari" publikasi SINTA ditebak (jurnal pengabdian / judul mirip PkM dosen) → Tabel 19; isian dosen tidak ditimpa.
// Melanjutkan keadaan uji v0.59.0–v0.60.0 (dosen ber-ID SINTA 9000001 dan 9000002).
import fs from "node:fs";
export async function jalankan({ g, cek, ok, ID, tDsn, tAdm }) {
  console.log("77. Luaran publikasi SINTA: Penelitian (Tabel 14) atau PkM (Tabel 19)");
  const M = ok("sinta.mulai", {}, tAdm);
  const P = (judul, jurnal, tahun, extra) => Object.assign({ jenis: "publikasi", sumber: "garuda", judul, url: "", jurnal, tahun, sitasi: null, doi: "", akred: "Sinta 4", kuartil: "", tipe: "", penulis: [], dari: "9000001" }, extra || {});
  const kirim = item => ok("sinta.kirim", { kode: M.kode, item }, null);
  const cari = judul => g.ctx.semuaKegiatan().find(k => k.judul === judul);
  // dosen mencatat publikasi sendiri (bukan dari SINTA) dengan luaran Penelitian
  ok("kegiatan.simpan", { peran: "dosen", data: { jenis: "publikasi", judul: "Artikel Manual Dosen Uji Tentang Wisata", tgl: "2025-06-01", sampai: "2025-06-01", pegawai: [], kelas: [], excl: [], mhs: [], perluST: false,
    isian: { "Luaran dari": "Penelitian" } } }, tDsn);
  let j = kirim([
    P("Pendampingan Homestay Desa Uji Bersama Masyarakat", "Jurnal Pengabdian Kepada Masyarakat Uji Vol. 2 No. 1", 2026),
    P("Pelatihan Paket Wisata dan Mitra Lokal", "Jurnal Umum Uji Vol. 3", 2025, { sumber: "googlescholar", sitasi: 0, akred: "" }),
    P("Analisis Kepuasan Wisatawan Uji Mancanegara", "Jurnal Pariwisata Uji", 2026),
    P("Artikel Manual Dosen Uji Tentang Wisata", "Abdimas Uji: Jurnal Community Service", 2025)]);
  const A = cari("Pendampingan Homestay Desa Uji Bersama Masyarakat"), B = cari("Pelatihan Paket Wisata dan Mitra Lokal"), C = cari("Analisis Kepuasan Wisatawan Uji Mancanegara");
  cek("jurnal pengabdian → Luaran dari PkM (Tabel 19) dengan alasan", A && A.isian["Luaran dari"] === "PkM" && /nama jurnal: Jurnal Pengabdian/.test(JSON.parse(A.sinta).luaran.alasan), A && A.sinta);
  cek("judul mirip PkM dosen yang sama di SINTA → PkM", B && B.isian["Luaran dari"] === "PkM" && /judul mirip PkM/.test(JSON.parse(B.sinta).luaran.alasan), B && B.sinta);
  cek("jurnal umum, judul tidak mirip PkM → Penelitian (Tabel 14)", C && C.isian["Luaran dari"] === "Penelitian" && JSON.parse(C.sinta).luaran.v === "Penelitian");
  const Mn = cari("Artikel Manual Dosen Uji Tentang Wisata");
  cek("publikasi yang dicatat dosen sendiri: ditautkan, Luaran dari tidak diubah", j.tertaut === 1 && Mn.sinta && Mn.isian["Luaran dari"] === "Penelitian");
  // data tarikan v0.60.0 (tanpa catatan luaran) yang masih "Penelitian" otomatis dirapikan pada tarikan berikutnya
  { const k = g.ctx.ambilKegiatan(cari("Artikel Lama Tanpa Akreditasi").id), m = JSON.parse(k.sinta); delete m.luaran; k.sinta = JSON.stringify(m); g.ctx.simpanKegiatan(k); }   // tiru data v0.60.0
  const L0 = cari("Artikel Lama Tanpa Akreditasi");
  cek("data v0.60.0: masih Penelitian otomatis", L0 && L0.isian["Luaran dari"] === "Penelitian" && !JSON.parse(L0.sinta).luaran);
  kirim([P("Artikel Lama Tanpa Akreditasi", "Jurnal Abdimas Lokal Uji", 2024, { akred: "" })]);
  const L1 = cari("Artikel Lama Tanpa Akreditasi");
  cek("draf lama dirapikan menjadi PkM, tercatat di riwayat", L1.isian["Luaran dari"] === "PkM" && L1.riwayat.some(r => /luaran diubah otomatis menjadi PkM/.test(r.c)));
  // dosen memilih sendiri → tidak ditimpa tarikan berikutnya
  const kA = g.ctx.ambilKegiatan(A.id); kA.isian["Luaran dari"] = "Penelitian"; g.ctx.simpanKegiatan(kA);
  const M2 = ok("sinta.mulai", {}, tAdm);
  ok("sinta.kirim", { kode: M2.kode, item: [P("Pendampingan Homestay Desa Uji Bersama Masyarakat", "Jurnal Pengabdian Kepada Masyarakat Uji Vol. 2 No. 1", 2026)] }, null);
  cek("pilihan dosen (Penelitian) tidak ditimpa tebakan", g.ctx.ambilKegiatan(A.id).isian["Luaran dari"] === "Penelitian");
  // publikasi yang sudah disetujui tidak diubah luarannya
  const Pv = g.ctx.semuaKegiatan().find(k => k.judul === "Peran Pemandu Wisata Uji di Bali");
  ok("sinta.kirim", { kode: M2.kode, item: [P("Peran Pemandu Wisata Uji di Bali", "Jurnal Pengabdian Uji", 2026)] }, null);
  cek("publikasi disetujui: Luaran dari tidak diubah", g.ctx.ambilKegiatan(Pv.id).isian["Luaran dari"] === "Penelitian" && g.ctx.ambilKegiatan(Pv.id).status === "disetujui");
  const det = ok("kegiatan.detail", { id: B.id }, tDsn).kegiatan;
  cek("detail: alasan luaran terkirim ke tampilan", det.sinta.luaran && det.sinta.luaran.v === "PkM");
  const app = fs.readFileSync("web/aplikasi.js", "utf8");
  cek("tampilan: blok publikasi menampilkan luaran dan meminta dosen memastikan", /Pastikan isian "Luaran dari"/.test(app) && /s\.luaran && s\.luaran\.v === "PkM"/.test(app));
}
