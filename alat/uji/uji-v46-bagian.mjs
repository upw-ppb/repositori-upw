// Uji v0.46.0: unit kompetensi per MK (bawaan dokumen kurikulum), CPL yang dibebankan ditetapkan KPS/Admin, pemakaiannya di templat/pemeriksaan RPS
// dan Tabel 4, serta pencocokan dosen dengan daftar PDDikti (data dosen buatan, bukan daftar PDDikti sungguhan).
import fs from "node:fs";
import vm from "node:vm";
export async function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM }) {
  console.log("59. CPL per MK, unit kompetensi, PDDikti");
  const U0 = g.ctx.unitMkBawaan("Praktik Desain & Media Digital"), Ua = g.ctx.unitMkBawaan("Akuntansi Biro Perjalanan Wisata");
  cek("unit kompetensi bawaan dari dokumen kurikulum (dicocokkan dengan nama MK): PDM 2 unit, ABP 3 unit, nama Indonesia ada", U0.map(u => u.k).join() === "D2.TCS.CL5.07,D2.TTA.CL2.13"
    && /brosur/.test(U0[0].id) && Ua.length === 3 && g.ctx.unitMkBawaan("Agama").length === 0 && g.ctx.unitMkBawaan("Mata kuliah yang tidak ada").length === 0);
  ok("dp.mkSimpan", { daftar: [{ kode: "UPW981", nama: "Praktik Desain & Media Digital", semester: 3, sksPraktik: 2, kompetensi: "Ya" }] }, tAdm);
  let X = ok("dp.cplMk", { kode: "UPW981" }, tKps);
  cek("dp.cplMk: belum ditetapkan, unit bawaan, 68 CPL, KPS boleh menetapkan; dosen ditolak", X.ditetapkan.length === 0 && X.unitBawaan && X.unit.length === 2 && X.cplProdi.length === 68 && X.boleh
    && /izin/i.test(salah("dp.cplMk", { kode: "UPW981" }, tDsn)));
  cek("usulan dari unit kompetensi hanya CPL Pengetahuan/KK (Sikap dan KU tidak diusulkan otomatis)", X.usulan.unit.every(k => /^(P|KK)\d+$/.test(k)) && X.usulan.rps.length === 0);
  cek("penetapan: kode tak dikenal ditolak; mahasiswa ditolak", /tidak dikenal/.test(salah("dp.cplMkSimpan", { kode: "UPW981", cpl: ["S9", "X1"] }, tKps)) && !!salah("dp.cplMkSimpan", { kode: "UPW981", cpl: ["S9"] }, tM));
  X = ok("dp.cplMkSimpan", { kode: "UPW981", cpl: ["kk23", "S9", "P12", "KU1", "S9"] }, tKps);
  cek("penetapan CPL tersimpan (urut S, KU, P, KK; tanpa duplikat) dengan nama penetap", X.ditetapkan.join() === "S9,KU1,P12,KK23" && /Komang|Widiastuti|KPS|contoh/i.test(X.oleh));
  X = ok("dp.cplMkSimpan", { kode: "UPW981", unit: [{ k: "D2.TCS.CL5.07", en: "Co-ordinate production of brochures", id: "" }, { k: "X.1", en: "", id: "Unit tambahan" }] }, tAdm);
  cek("unit kompetensi bisa diubah prodi, lalu dikembalikan ke bawaan", X.unit.length === 2 && !X.unitBawaan && /Unit tambahan/.test(X.unit[1].id)
    && ok("dp.cplMkSimpan", { kode: "UPW981", unitBawaan: true }, tAdm).unitBawaan === true);
  const dp = ok("dp.data", {}, tAdm).mk.find(m => m.kode === "UPW981");
  cek("Data Prodi › Kurikulum menampilkan CPL ditetapkan dan unit", dp.cplMk.join() === "S9,KU1,P12,KK23" && dp.unitKomp.length === 2 && dp.unitBawaan);
  const ts = Number(ok("mkp.saya", {}, tDsn).semester.slice(0, 4)), T4 = ok("ilkps.data", { ts }, tAdm).tabel.find(t => t.kode === "4"), b = T4.baris.find(r => /UPW981/.test(String(r[2])));
  cek("Tabel 4: unsur CPL dari penetapan prodi (S, KU, P, KK)", b && b.slice(9, 13).join() === "V,V,V,V");
  ok("dp.cplMkSimpan", { kode: "UPW981", cpl: ["P12"] }, tKps);
  const b2 = ok("ilkps.data", { ts }, tAdm).tabel.find(t => t.kode === "4").baris.find(r => /UPW981/.test(String(r[2])));
  cek("Tabel 4 mengikuti penetapan terbaru (hanya Pengetahuan)", b2.slice(9, 13).join() === ",V,,");
  // Templat & pemeriksaan RPS (UPW992 dari uji sebelumnya: tetapkan CPL lalu bandingkan dengan RPS terakhirnya)
  ok("dp.cplMkSimpan", { kode: "UPW992", cpl: ["S9", "P12", "KU1", "KK1"] }, tKps);
  const kini = ok("mkp.saya", {}, tDsn).semester, R = ok("mkp.rpsRef", { semester: kini, kode: "UPW992", kunci: "A" }, tDsn);
  const ctx = { Blob, TextEncoder, TextDecoder, DecompressionStream, Response, Uint8Array, DataView, console }; ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync("web/zip.js", "utf8"), ctx); vm.runInContext(fs.readFileSync("web/rps.js", "utf8"), ctx);
  const U = ctx.UPW_RPS, K = U.kosong(Object.assign({}, R, { terakhir: null, unitKomp: U0 }), ["S1"], "x");
  cek("templat RPS: CPL dari penetapan prodi (pilihan dosen diabaikan), bahan kajian dari unit kompetensi", R.cplMk.join() === "S9,KU1,P12,KK1" && K.cpl.map(c => c.ref).join() === "S9,KU1,P12,KK1"
    && /D2\.TCS\.CL5\.07 — Co-ordinate production/.test(K.bahan) && /brosur/.test(K.bahan));
  const Dt = ok("mkp.detail", { semester: kini, kode: "UPW992", kunci: "A" }, tDsn), D = R.terakhir.data;
  const cekR = U.periksa(D, { cplProdi: Dt.cplProdi, cplMk: Dt.cplMk, unit: U0, mk: { kode: "UPW992", sks: 2, semester: 3 }, tim: [] });
  cek("pemeriksaan RPS: CPL berbeda dengan penetapan (KK1 belum dimuat, KK23 di luar), unit kompetensi belum di bahan kajian", cekR.some(c => c.t === "wajib" && /belum dimuat: KK1/.test(c.teks) && /di luar penetapan: KK23/.test(c.teks))
    && cekR.some(c => /Unit kompetensi kurikulum belum tercantum di bahan kajian: D2\.TTA\.CL2\.13\./.test(c.teks)));
  ok("dp.cplMkSimpan", { kode: "UPW992", cpl: ["S9", "P12", "KU1", "KK23"] }, tKps);
  const cekS = U.periksa(D, { cplProdi: Dt.cplProdi, cplMk: ["S9", "P12", "KU1", "KK23"], mk: { kode: "UPW992", sks: 2, semester: 3 }, tim: [] });
  cek("pemeriksaan RPS: CPL sama dengan penetapan → sesuai", cekS.some(c => c.t === "ok" && /sama dengan penetapan prodi/.test(c.teks)) && !cekS.some(c => /berbeda dengan CPL yang ditetapkan/.test(c.teks)));
  const Xu = ok("dp.cplMk", { kode: "UPW992" }, tKps);
  cek("usulan dari RPS terakhir MK", Xu.usulan.rps.join() === "S9,P12,KU1,KK23" && !!Xu.usulan.rpsSemester);
  // PDDikti
  const app = fs.readFileSync("web/aplikasi.js", "utf8"), ambil = (a, b) => app.slice(app.indexOf(a), app.indexOf(b));
  const kode = [ambil("const GELAR_NAMA", "/** Periksa hasil baca templat tim"), "const labelDosenTim = x => x.nama + (x.inisial ? \" (\" + x.inisial + \")\" : \"\"); const labelPrakTim = x => x.nama;",
    ambil("const STATUS_DTPS", "function panelPddikti")].join("\n");
  const c = { console }; vm.createContext(c); vm.runInContext(kode + ";globalThis.baca = bacaPddikti;", c);
  const S0 = ok("dp.status", {}, tAdm), dsn = S0.dosen.find(x => x.id === ID("199001152015041001"));
  cek("dp.status: NIP dan NIDN hanya untuk pengelola", dsn && dsn.nip === "199001152015041001" && ok("dp.status", {}, tKps).dosen.every(x => x.nip === undefined));
  const intiDsn = dsn.nama.split(",")[0].replace(/\([^)]*\)/g, "").trim().toUpperCase();
  const teks = `1\t${intiDsn}\t3800000001\t1111222233334444\tS2\tAktif\tDosen Tetap\n2\tORANG TIDAK ADA DI APLIKASI\t3800000002\t5555666677778888\tS3\tAktif\tDosen Tetap\n3 ${intiDsn.split(" ").slice(0, 2).join(" ")} XYZ 3800000003`;
  const H = c.baca(teks, S0.dosen);
  cek("baca daftar PDDikti (tab atau spasi): nama tanpa gelar cocok dengan akun, NIDN/NUPTK/pendidikan terbaca, nama asing tidak cocok", H.length === 3 && H[0].d && H[0].d.id === dsn.id && H[0].nidn === "3800000001"
    && H[0].nuptk === "1111222233334444" && H[0].pend === "S2" && /Dosen Tetap/.test(H[0].ikatan) && !H[1].d && H[2].nidn === "3800000003" && H[2].d && H[2].cara === "mirip");
  const j = ok("biodata.massal", { baris: [{ nip: dsn.nip, nidn: "3800000001", statusDosen: "Dosen tetap program studi (DTPS)", pddikti: "Ya" }] }, tAdm);
  const s1 = ok("dp.status", {}, tAdm).dosen.find(x => x.id === dsn.id);
  cek("terapkan PDDikti lewat impor biodata: status DTPS, NIDN, terdaftar PDDikti", j.diperbarui === 1 && s1.statusDosen === "Dosen tetap program studi (DTPS)" && s1.nidn === "3800000001" && s1.pddikti === "Ya");
}
