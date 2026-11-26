// Uji v0.56.0: sumber dana PT dan Mandiri terpisah (Tabel 12/17), PkM bertahap (penjajakan tidak dihitung; pelaksanaan = satu judul),
// status dosen per TA ditetapkan Admin Prodi (bukan dari biodata dosen).
import fs from "node:fs";
export async function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tD2, tSA }) {
  console.log("72. PkM bertahap, sumber dana, status dosen oleh Admin");
  const C = g.ctx, dsn = ID("199001152015041001"), d2 = ID("198001012005011009");
  const ref = ok("kegiatan.ref", { peran: "dosen" }, tDsn), pkm = ref.jenis.find(j => j.k === "pkm"), pen = ref.jenis.find(j => j.k === "penelitian");
  const opsi = (j, l) => (j.fx.find(f => f.l === l) || {}).o || [];
  cek("isian PkM: tahap, skema, nomor registrasi P3M/Sinergi; sumber dana Perguruan Tinggi dan Mandiri terpisah (PkM dan penelitian)", opsi(pkm, "Tahap PkM").join() === "Pelaksanaan,Penjajakan"
    && opsi(pkm, "Skema PkM").length === 4 && pkm.fx.some(f => /P3M \/ Sinergi/.test(f.l)) && opsi(pkm, "Sumber dana").slice(0, 2).join() === "Perguruan Tinggi,Mandiri (dana dosen sendiri)" && opsi(pen, "Sumber dana")[1] === "Mandiri (dana dosen sendiri)");
  const ts0 = ok("ilkps.data", {}, tAdm).ts, ts = typeof ts0 === "object" ? ts0.awal : ts0, tgl = `${ts}-11-10`;
  const dasar = { jenis: "pkm", tgl, sampai: tgl, tingkat: "Lokal/Wilayah", perluST: false, pegawai: [dsn], kelas: [], excl: [], mhs: [] };
  const setujui = id => { C.ubah("Kegiatan", C.cari("Kegiatan", x => x.id === id), { status: "disetujui" }); C._isi = {}; };
  const T0 = Object.fromEntries(ok("ilkps.data", {}, tAdm).tabel.map(t => [t.kode, t]));
  const jaj = ok("kegiatan.simpan", { peran: "dosen", data: { ...dasar, judul: "Penjajakan PkM Desa Wisata Contoh", isian: { "Tahap PkM": "Penjajakan", "Skema PkM": "PkM bersama prodi (dana PT)", "Sumber dana": "Perguruan Tinggi" } } }, tDsn).kegiatan;
  cek("penjajakan tersimpan; muncul di pilihan penjajakan", ok("kegiatan.ref", { peran: "dosen" }, tDsn).penjajakan.some(x => x.id === jaj.id));
  const lain = ok("kegiatan.simpan", { peran: "dosen", data: { ...dasar, jenis: "penelitian", judul: "Penelitian lain", isian: { "Sumber dana": "Perguruan Tinggi" } } }, tDsn).kegiatan;
  cek("pelaksanaan hanya boleh dikaitkan ke penjajakan PkM", /Penjajakan PkM terkait tidak ditemukan/.test(salah("kegiatan.simpan", { peran: "dosen", data: { ...dasar, judul: "Salah kait", induk: lain.id, isian: { "Tahap PkM": "Pelaksanaan" } } }, tDsn)));
  const lak = ok("kegiatan.simpan", { peran: "dosen", data: { ...dasar, judul: "PkM Desa Wisata Contoh", mhs: [ID("250103")], induk: jaj.id,
    isian: { "Tahap PkM": "Pelaksanaan", "Skema PkM": "PkM bersama prodi (dana PT)", "Sumber dana": "Mandiri (dana dosen sendiri)", "Nomor registrasi P3M / Sinergi": "SNG-2026-001", "Mitra sasaran": "Pokdarwis Contoh" } } }, tDsn).kegiatan;
  setujui(jaj.id); setujui(lak.id);
  const T = Object.fromEntries(ok("ilkps.data", {}, tAdm).tabel.map(t => [t.kode, t]));
  const naik = (t, r) => T[t].baris[r][4] - T0[t].baris[r][4];
  cek("Tabel 17: baris a) PT dan b) Mandiri terpisah; rangkaian dihitung SEKALI (pelaksanaan, dana mandiri), penjajakan tidak dihitung", T["17"].baris.length === 5 && T["17"].baris[0][1] === "a) Perguruan Tinggi"
    && T["17"].baris[1][1] === "b) Mandiri (dana dosen)" && naik("17", 1) === 1 && naik("17", 0) === 0 && T["17"].baris[4][5] - T0["17"].baris[4][5] === 1 && /penjajakan tidak dihitung/.test(T["17"].catatan));
  cek("Tabel 18: pelaksanaan yang melibatkan mahasiswa tercatat sekali", T["18"].baris.filter(r => r[4] === "PkM Desa Wisata Contoh").length === 1 && !T["18"].baris.some(r => /Penjajakan/.test(r[4])));
  const dL = ok("kegiatan.detail", { id: lak.id }, tDsn).kegiatan, dJ = ok("kegiatan.detail", { id: jaj.id }, tDsn).kegiatan;
  cek("detail: pelaksanaan menunjuk penjajakannya dan sebaliknya", dL.rangkaian.tahap === "pelaksanaan" && dL.rangkaian.penjajakan.id === jaj.id && dJ.rangkaian.tahap === "penjajakan" && dJ.rangkaian.pelaksanaan[0].id === lak.id);
  const N = ok("penilaian.data", {}, tKps).rows.find(r => /PT\/mandiri/.test(r.info || "") && /PkM/i.test(r.nm)) || {};
  cek("Penilaian butir 52: PT dan Mandiri dijumlahkan (NL)", /PT\/mandiri \d+ judul/.test(N.info), N.info);
  // status dosen oleh Admin Prodi
  const ta = Number(ok("mkp.saya", {}, tDsn).semester.slice(0, 4));   // TA berjalan
  cek("status dosen: hanya pilihan resmi; pilihan tidak dikenal ditolak", /Status dosen tidak dikenal/.test(salah("dp.dosenTsSimpan", { ta, data: { userId: d2, status: "Dosen industri / praktisi" } }, tAdm))
    && ok("dp.data", {}, tAdm).statusPilihan.length === 3);
  ok("dp.dosenTsSimpan", { ta, data: { userId: d2, status: "Dosen tidak tetap" } }, tAdm);
  const bs = ok("biodata.saya", {}, tD2).biodata;
  cek("biodata dosen menampilkan status dari Admin Prodi (hanya-baca)", bs.data.statusDosen === "Dosen tidak tetap" && bs.skema.flatMap(x => x.f).find(f => f.k === "statusDosen").admin === 1, [bs.data.statusDosen, bs.skema.flatMap(x => x.f).find(f => f.k === "statusDosen")]);
  const isi = Object.assign({}, bs.data, { statusDosen: "Dosen tetap program studi (DTPS)" }); ok("biodata.simpan", { data: isi }, tD2);
  cek("dosen tidak bisa mengubah statusnya sendiri lewat biodata", ok("biodata.saya", {}, tD2).biodata.data.statusDosen === "Dosen tidak tetap" && ok("dp.data", { ta }, tAdm).dosenTs.find(x => x.id === d2).status === "Dosen tidak tetap");
  ok("dp.dosenTsSimpan", { ta, data: { userId: d2, sesuai: "Ya" } }, tAdm);
  cek("menyimpan isian lain tanpa status tidak menghapus status", ok("dp.data", { ta }, tAdm).dosenTs.find(x => x.id === d2).status === "Dosen tidak tetap");
  cek("Tabel 3 memakai status dari Admin (dosen tidak tetap)", ok("ilkps.data", {}, tAdm).tabel.find(t => t.kode === "3").akun.includes(d2));
  ok("dp.dosenTsSimpan", { ta, data: { userId: d2, status: "Dosen tetap program studi (DTPS)" } }, tAdm);
  const app = fs.readFileSync("web/aplikasi.js", "utf8");
  cek("tampilan: pilihan penjajakan terkait, rangkaian PkM di detail, status dosen hanya-baca di biodata, pilihan status di Data dosen TS",
    /function blokTahapPkm/.test(app) && /Rangkaian PkM/.test(app) && /f\.admin\) c = `<input/.test(app) && /dt-\$\{x\.id\}-status/.test(app));
}
