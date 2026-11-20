// Uji v0.43.0: kualifikasi/jenjang per semester, jam sajian, RPS resmi PDF + Word sumber, centang tanda tangan, skala nilai,
// templat kontrak kuliah, rubrik, dan lembar portofolio penilaian (Tahap 2). Memakai UPW992 dari uji v0.40/v0.42.
import fs from "node:fs";
import vm from "node:vm";
export async function jalankan({ g, cek, ok, salah, tKps, tDsn, tAdm, tM }) {
  console.log("56. RPS PDF + tanda tangan, kontrak dan rubrik");
  const Q = g.ctx.KUALIFIKASI_SMT;
  cek("kualifikasi/jenjang per semester sesuai SK kurikulum (1: Cert II/L1 … 3–4: Cert IV/L3 … 7–8: Advanced Diploma/L5)", Q[1].join() === "Certificate II,Level 1" && Q[2][0] === "Certificate III"
    && Q[3].join() === Q[4].join() && Q[4].join() === "Certificate IV,Level 3" && Q[6].join() === "Diploma,Level 4" && Q[8].join() === "Advanced Diploma,Level 5");
  const kini = ok("mkp.saya", {}, tDsn).semester, R = ok("mkp.rpsRef", { semester: kini, kode: "UPW992", kunci: "A" }, tDsn);
  cek("bahan templat membawa kualifikasi MK (semester MK UPW992)", R.kualifikasi.kualifikasi === "Certificate IV" && R.kualifikasi.jenjang === "Level 3");
  // Skala nilai & kehadiran
  cek("skala nilai: format salah dan kehadiran bukan angka ditolak", /Skala nilai/.test(salah("rps.otorisasi", { simpan: 1, skalaNilai: "A" }, tAdm)) && /Kehadiran minimal/.test(salah("rps.otorisasi", { simpan: 1, hadirMin: "delapan" }, tAdm)));
  const O = ok("rps.otorisasi", { simpan: 1, kajurNama: "Dr. Kajur Uji, M.Par.", kajurNip: "196001011990011001", hadirMin: "80", skalaNilai: "A; 4; 85–100\nB; 3; 70–84,99\nC; 2; 55–69,99\nD; 1; 40–54,99\nE; 0; 0–39,99" }, tAdm).otorisasi;
  cek("skala nilai tersimpan dan terurai", O.skala.length === 5 && O.skala[1].h === "B" && O.skala[1].b === 84.99 && O.hadirMin === "80");
  // Word sumber untuk RPS resmi PDF (dari uji v0.42 RPS UPW992 sudah PDF)
  const ctx = { Blob, TextEncoder, TextDecoder, DecompressionStream, Response, Uint8Array, DataView, console }; ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync("web/zip.js", "utf8"), ctx); vm.runInContext(fs.readFileSync("web/rps.js", "utf8"), ctx);
  const U = ctx.UPW_RPS, R2 = ok("mkp.rpsRef", { semester: kini, kode: "UPW992", kunci: "A" }, tDsn), D = R2.terakhir.data;
  let Dt = ok("mkp.detail", { semester: kini, kode: "UPW992", kunci: "A" }, tDsn);
  cek("RPS resmi PDF belum punya hasil baca", /\.pdf$/.test(Dt.kelas[0].rps.nama) && Dt.kelas.every(k => !k.rpsBaca));
  Dt = ok("mkp.rpsBaca", { semester: kini, kode: "UPW992", kunci: "A", rps: JSON.stringify(D) }, tDsn);
  cek("Word sumber: hasil baca menempel pada RPS PDF di kelas A dan B (RPS bersama), file PDF tetap", Dt.kelas.every(k => k.rpsBaca && k.rpsBaca.data.cpl.length === 4 && /\.pdf$/.test(k.rps.nama)));
  cek("Word sumber: isi tidak terbaca ditolak; mahasiswa ditolak", /tidak terbaca/.test(salah("mkp.rpsBaca", { semester: kini, kode: "UPW992", kunci: "A", rps: "{}" }, tDsn))
    && !!salah("mkp.rpsBaca", { semester: kini, kode: "UPW992", rps: JSON.stringify(D) }, tM));
  // Tanda tangan
  Dt = ok("mkp.ttd", { semester: kini, kode: "UPW992", kunci: "A", komp: "rps", ttd: { dosen: true, kps: true, kajur: false } }, tDsn);
  cek("centang tanda tangan RPS: tercatat di kelas A dan B (RPS bersama), Ketua Jurusan belum", Dt.kelas.every(k => k.rps.ttd && k.rps.ttd.dosen && k.rps.ttd.kps && k.rps.ttd.kajur === false) && Dt.ttdMkp.rps.length === 3);
  cek("tanda tangan kontrak sebelum diunggah ditolak; jenis tak dikenal ditolak", /belum diunggah/.test(salah("mkp.ttd", { semester: kini, kode: "UPW991", kunci: "A", komp: "kontrak", ttd: { dosen: true } }, tDsn))
    && /tidak dikenal/.test(salah("mkp.ttd", { semester: kini, kode: "UPW992", komp: "integ", ttd: {} }, tDsn)));
  const pdf = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(40)]).toString("base64");
  ok("mkp.unggah", { semester: kini, kode: "UPW992", komp: "kontrak", kunci: "A", nama: "Kontrak.pdf", isi: pdf }, tDsn);
  Dt = ok("mkp.ttd", { semester: kini, kode: "UPW992", kunci: "A", komp: "kontrak", ttd: { dosen: true, mhs: true, kps: true } }, tDsn);
  cek("centang tanda tangan kontrak hanya untuk kelas itu", Dt.kelas.find(k => k.k === "A").kontrak.ttd.mhs === true && (!Dt.kelas.find(k => k.k === "B").kontrak || !Dt.kelas.find(k => k.k === "B").kontrak.ttd));
  ok("mkp.unggah", { semester: kini, kode: "UPW992", komp: "kontrak", kunci: "A", nama: "Kontrak2.pdf", isi: pdf }, tDsn);
  cek("mengganti dokumen menghapus centang tanda tangan lama", !ok("mkp.detail", { semester: kini, kode: "UPW992", kunci: "A" }, tDsn).kelas.find(k => k.k === "A").kontrak.ttd);
  // Waktu & kualifikasi di templat
  cek("waktu bawaan: teori 1 JP/sks + PT + KM, praktik 2 JP/sks + PT/KM", U.waktuBawaan({ sksT: 2, sksP: 0 }) === "TM: 2 JP × 50' = 100'\nPT: 2 × 60'\nKM: 2 × 60'" && U.waktuBawaan({ sksT: 0, sksP: 2 }) === "Praktik: 4 JP × 50' = 200'\nPT/KM: 2 × 70'");
  const K = U.kosong(Object.assign({}, R2, { terakhir: null }), ["S9"], "x");
  cek("templat RPS: kualifikasi dan jenjang terisi dari semester MK", K.kualifikasi === "Certificate IV" && K.jenjang === "Level 3");
  const D2 = JSON.parse(JSON.stringify(D)); D2.kualifikasi = "Certificate II"; D2.jenjang = "Level 1";
  cek("pemeriksaan: kualifikasi/jenjang berbeda dengan struktur kurikulum diberi saran; 'Sertifikat IV / Jenjang 3' dianggap sama", U.periksa(D2, R2).some(c => /Kualifikasi\/jenjang di RPS/.test(c.teks))
    && !U.periksa(Object.assign({}, D2, { kualifikasi: "Sertifikat IV", jenjang: "Jenjang 3" }), R2).some(c => /Kualifikasi/.test(c.teks)));
  // Tahap 2: kontrak, rubrik, portofolio
  const R3 = ok("mkp.rpsRef", { semester: kini, kode: "UPW992", kunci: "A" }, tDsn), teksDocx = async b => { const amb = await ctx.UPW_ZIP.buka(await b.arrayBuffer(), "Word"); return (await amb("word/document.xml")).replace(/<[^>]+>/g, " "); };
  const tk = await teksDocx(U.kontrak(R3, D, {}));
  cek("kontrak kuliah: 7 unsur butir 25 C, rencana penilaian dari RPS (jumlah 100), teknik/instrumen dicentang, skala nilai dan kehadiran dari pengaturan, tanda tangan 3 pihak",
    ["unsur 1", "unsur 2", "unsur 3", "unsur 4", "unsur 5", "unsur 6", "unsur 7"].every(u => tk.includes(u)) && /Jumlah\s+100/.test(tk) && tk.includes("☒ Unjuk kerja") && tk.includes("☐ Angket") && tk.includes("☒ Rubrik")
    && /70 – 84,99/.test(tk) && tk.includes("Kehadiran minimal 80%") && tk.includes("Perwakilan Mahasiswa") && tk.includes("Certificate IV, Level 3") && tk.includes("CPMK 2: Mampu bekerja sama"));
  const tr = await teksDocx(U.rubrik(R3, D, {}));
  cek("rubrik: 5 prinsip penilaian, satu rubrik per komponen penilaian RPS, 4 tingkat kinerja", ["Edukatif", "Otentik", "Objektif", "Akuntabel", "Transparan"].every(p => tr.includes(p))
    && (tr.match(/Sangat baik/g) || []).length === D.porto.length && tr.includes("Indikator 1"));
  const tk0 = await teksDocx(U.kontrak(R3, null, {}));
  cek("kontrak tanpa RPS: isian [ … ] untuk diisi dosen", tk0.includes("[Bentuk]") && tk0.includes("[CPMK, sama dengan RPS]"));
  const L = U.portoXlsx(R3, D, [{ nim: "2501001", nama: "Mhs Satu" }, { nim: "2501002", nama: "Mhs Dua" }]), N = L[0].baris;
  cek("lembar portofolio: peserta, bobot dari RPS (jumlah 100), rumus nilai akhir dan huruf dari skala, lembar ketercapaian 4 CPL",
    N.length === 4 && N[2][2] === "Mhs Satu" && N[1].slice(3, 3 + D.porto.length).reduce((a, b) => a + b, 0) === 100 && /SUMPRODUCT/.test(N[2][3 + D.porto.length].f) && /"A"/.test(N[2][4 + D.porto.length].f)
    && L[1].nama === "Ketercapaian CPL" && L[1].baris[0].length === 7 && /Nilai!/.test(L[1].baris[1][3].f));
  const xl = Buffer.from(await ctx.UPW_ZIP.xlsx(L).arrayBuffer());
  const wb = await (await ctx.UPW_ZIP.buka(xl.buffer.slice(xl.byteOffset, xl.byteOffset + xl.length)))("xl/workbook.xml");
  cek("lembar portofolio: berkas Excel sah berisi 3 lembar (Nilai, Ketercapaian CPL, Petunjuk)", xl[0] === 0x50 && (wb.match(/<sheet /g) || []).length === 3 && wb.includes("Ketercapaian CPL"));
}
