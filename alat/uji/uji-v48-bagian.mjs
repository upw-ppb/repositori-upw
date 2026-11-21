// Uji v0.48.0: pembebanan CPL per MK dari Excel prodi (CPL utama/primer, penunjang/sekunder, rasional), pratinjau dan penerapan, pencocokan MK
// (kode, kode kelompok paralel, nama), pemakaian di laci CPL, pemeriksaan RPS, dan Tabel 4. Data MK di sini buatan (kode UPW48x / 23104991x).
import fs from "node:fs";
import vm from "node:vm";
export async function jalankan({ g, cek, ok, salah, tKps, tDsn, tAdm, tM }) {
  console.log("61. Pembebanan CPL per MK dari Excel");
  ok("dp.mkSimpan", { daftar: [{ kode: "UPW481", nama: "Mata Kuliah Impor Satu", semester: 1, sksKuliah: 2, kompetensi: "Tidak" },
    { kode: "UPW482", nama: "Praktik Impor & Media Uji", semester: 2, sksPraktik: 2, kompetensi: "Ya" }] }, tAdm);
  ok("dp.mkSimpan", { data: { kode: "231049917", nama: "Bahasa Asing Pilihan Uji", semester: 2, sksKuliah: 2, kelompok: "Jepang (231049917), Jerman (231049915)" } }, tAdm);
  // Pembaca berkas (tampilan)
  const app = fs.readFileSync("web/aplikasi.js", "utf8"), c = { console }; vm.createContext(c);
  vm.runInContext(app.slice(app.indexOf("function bacaPemetaanCpl"), app.indexOf("function panelCplImpor")) + ";globalThis.baca = bacaPemetaanCpl;", c);
  const H = ["No", "Semester", "Kode MK", "Kode CATC", "Nama Mata Kuliah", "SKS (T/P)", "Total SKS", "Klasifikasi BoK", "CPL Primer (Wajib Diukur di RPS)", "CPL Sekunder (Penunjang)", "Jml CPL Primer", "Rasional Akademik"];
  const L = [{ nama: "Pemetaan CPL-MK", baris: [["PEMETAAN BEBAN CPL"], ["Prodi"], [], H,
    [1, "Semester 1", "UPW481", "MI1", "Mata Kuliah Impor Satu", "2T / 0P", 2, "x", "S1, S2", "S5", 2, "Rasional satu"],
    [2, "Semester 2", "999999999", "PIM", "Praktik Impor dan Media Uji", "0T / 2P", 2, "x", "P12, KK10, kk23", "KU3, KK10", 3, ""],
    [3, "Semester 2", "231049917 / 231049915", "BAU", "Bahasa Asing Pilihan Uji (Pilih 1: Jepang / Jerman)", "2T / 0P", 2, "x", "P7, KK20", "P10", 2, "Bahasa"],
    [4, "Semester 3", "888888888", "TAD", "MK Yang Tidak Ada", "2T", 2, "x", "P1", "", 1, ""],
    [5, "Semester 1", "UPW481", "MI1", "Mata Kuliah Impor Satu", "2T", 2, "x", "S3", "", 1, ""],
    [6, "Semester 3", "UPW482", "", "", "", "", "", "X9, P1", "", 2, ""],
    ["", "TOTAL SKS", "", "", "", "", 148, "", "", "", 3.2, "Rata-rata"]] }];
  const B = c.baca(L);
  cek("baca Excel pemetaan: judul kolom di baris 4, 6 baris MK (baris TOTAL dilewati), kolom kode/nama/primer/sekunder/rasional", B.baris.length === 6 && B.baris[0].kode === "UPW481"
    && B.baris[0].primer === "S1, S2" && B.baris[0].sek === "S5" && B.baris[0].alasan === "Rasional satu" && B.baris[2].kode === "231049917 / 231049915");
  let galat = ""; try { c.baca([{ nama: "x", baris: [["No", "Nama"]] }]); } catch (e) { galat = e.message; }
  cek("berkas tanpa kolom CPL Primer ditolak dengan pesan jelas", /CPL Primer/.test(galat));
  cek("impor pembebanan: dosen dan mahasiswa ditolak", /izin/i.test(salah("dp.cplMkImpor", { baris: B.baris }, tDsn)) && !!salah("dp.cplMkImpor", { baris: B.baris }, tM));
  const sebelum = JSON.stringify(g.sheets.MataKuliah);
  const P = ok("dp.cplMkImpor", { baris: B.baris }, tKps), r = P.baris;
  cek("pratinjau tidak mengubah data", JSON.stringify(g.sheets.MataKuliah) === sebelum && P.diterapkan === 0);
  cek("pratinjau: cocok lewat kode; lewat nama (kode berbeda dicatat); MK pilihan lewat kode kelompok", r[0].mk && r[0].mk.kode === "UPW481" && r[0].mk.cara === "kode"
    && r[1].mk && r[1].mk.kode === "UPW482" && r[1].mk.cara === "nama" && r[1].catatan.some(x => /kode di berkas berbeda/.test(x)) && r[2].mk && r[2].mk.kode === "231049917");
  cek("pratinjau: kode CPL dirapikan (huruf besar, urut S-KU-P-KK); CPL di primer dan penunjang dihitung primer", r[1].primer.join() === "P12,KK10,KK23" && r[1].sek.join() === "KU3" && r[1].catatan.some(x => /KK10 tertulis di primer dan penunjang/.test(x)));
  cek("pratinjau: MK tidak ada, MK ganda, dan kode CPL tidak dikenal ditandai; semester berbeda dicatat", /tidak ditemukan/.test(r[3].galat.join()) && /sudah dipetakan di baris 1/.test(r[4].galat.join())
    && /tidak dikenal: X9/.test(r[5].galat.join()) && r[2].catatan.some(x => /Semester di berkas 2/.test(x)) === false && P.siap === 3 && P.gagal === 3);
  cek("pratinjau: CPL prodi yang belum jadi CPL utama di MK mana pun, dan MK aplikasi yang tidak ada di berkas", P.tidakTercakup.includes("S4") && !P.tidakTercakup.includes("S1") && P.tanpaBaris.some(m => m.kode === "UPW981"));
  cek("terapkan tanpa baris yang siap ditolak", /Tidak ada baris/.test(salah("dp.cplMkImpor", { baris: [B.baris[3]], simpan: true }, tKps)));
  const T = ok("dp.cplMkImpor", { baris: B.baris, simpan: true }, tKps);
  const X1 = ok("dp.cplMk", { kode: "UPW481" }, tKps), X2 = ok("dp.cplMk", { kode: "UPW482" }, tAdm), X3 = ok("dp.cplMk", { kode: "231049917" }, tAdm);
  cek("terapkan: 3 MK, CPL utama + penunjang + rasional tersimpan, ditandai impor", T.diterapkan === 3 && X1.ditetapkan.join() === "S1,S2" && X1.sekunder.join() === "S5" && X1.alasan === "Rasional satu"
    && X1.sumber === "impor" && X2.ditetapkan.join() === "P12,KK10,KK23" && X2.sekunder.join() === "KU3" && X3.ditetapkan.join() === "P7,KK20" && X3.sekunder.join() === "P10");
  const dp = ok("dp.data", {}, tAdm), m2 = dp.mk.find(m => m.kode === "UPW482");
  cek("Data Prodi › Kurikulum: CPL utama, penunjang, rasional; hak impor untuk KPS dan Admin", m2.cplMk.join() === "P12,KK10,KK23" && m2.cplSek.join() === "KU3" && dp.bolehCplMk === true && ok("dp.data", {}, tKps).bolehCplMk === true);
  ok("dp.cplMkSimpan", { kode: "UPW481", cpl: ["S1"] }, tKps);
  let Y = ok("dp.cplMk", { kode: "UPW481" }, tKps);
  cek("ubah CPL utama di laci tanpa mengirim penunjang/rasional: nilai lama tetap", Y.ditetapkan.join() === "S1" && Y.sekunder.join() === "S5" && Y.alasan === "Rasional satu" && Y.sumber === "");
  Y = ok("dp.cplMkSimpan", { kode: "UPW481", cpl: ["S1", "S2"], sek: ["S2", "S9"], alasan: "" }, tKps);
  cek("penunjang yang juga utama dibuang; rasional bisa dikosongkan", Y.sekunder.join() === "S9" && Y.alasan === "");
  // RPS: CPL penunjang boleh ikut dicantumkan
  const ctx = { Blob, TextEncoder, TextDecoder, DecompressionStream, Response, Uint8Array, DataView, console }; ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync("web/zip.js", "utf8"), ctx); vm.runInContext(fs.readFileSync("web/rps.js", "utf8"), ctx);
  const U = ctx.UPW_RPS, cpl = g.ctx.CPL_PRODI, t = k => cpl.find(x => x.k === k).t;
  const kini0 = ok("mkp.saya", {}, tDsn).semester, R0 = ok("mkp.rpsRef", { semester: kini0, kode: "UPW992", kunci: "A" }, tDsn);
  const D = Object.assign(U.kosong(Object.assign({}, R0, { terakhir: null, cplMk: [] }), [], "x"), { cpl: ["P12", "KK10", "KK23", "KU3"].map((k, i) => ({ kode: "CPL" + (i + 1), ref: k, t: t(k) })) });
  const ref = { cplProdi: cpl, cplMk: ["P12", "KK10", "KK23"], cplSek: ["KU3"], mk: { kode: D.mk.kode, sks: 2, semester: 3 }, tim: [] };
  const h1 = U.periksa(D, ref), h2 = U.periksa(D, Object.assign({}, ref, { cplSek: [] }));
  cek("pemeriksaan RPS: CPL penunjang di RPS tidak dianggap di luar penetapan; tanpa penunjang tetap ditandai", h1.some(x => x.t === "ok" && /termasuk CPL penunjang KU3/.test(x.teks)) && !h1.some(x => /di luar penetapan/.test(x.teks))
    && h2.some(x => x.t === "wajib" && /di luar penetapan: KU3/.test(x.teks)));
  const kini = ok("mkp.saya", {}, tDsn).semester, ts = Number(kini.slice(0, 4));
  const b4 = ok("ilkps.data", { ts }, tAdm).tabel.find(x => x.kode === "4").baris.find(x => /UPW482/.test(String(x[2])));
  cek("Tabel 4: unsur CPL hanya dari CPL utama (urutan kolom S, P, KU, KK; penunjang KU tidak ikut)", b4 && b4.slice(9, 13).join() === ",V,,V");
  cek("tampilan: panel pembebanan CPL, unduh pemetaan, centang penunjang di laci", app.includes("function panelCplImpor") && /data-act="cplUnduh"/.test(app) && /data-cplsek=/.test(app) && /"Rekap per CPL"/.test(app));
}
