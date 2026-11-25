import { docxUji } from "./bantu-docx.mjs";
// Uji v0.40.0: Portofolio MK per kelas — dosen berbeda di kelas A/B terpisah dan tidak saling melihat; dosen sama tetap per kelas kecuali RPS;
// peserta hanya kelas yang diajar.
export function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tD2 }) {
  console.log("53. Portofolio MK dan peserta per kelas");
  const dsn = ID("199001152015041001"), d2 = ID("198001012005011009"), d3 = ID("197911302005012001");
  const kini = ok("mkp.saya", {}, tDsn).semester, ganjil = /-1$/.test(kini), smtMk = ganjil ? 3 : 4;
  ok("dp.mkSimpan", { daftar: [{ kode: "UPW991", nama: "Uji Per Kelas Beda Dosen", semester: smtMk, sksKuliah: 2 }, { kode: "UPW992", nama: "Uji Per Kelas Dosen Sama", semester: smtMk, sksKuliah: 2 }] }, tAdm);
  ok("dp.timSimpan", { semester: kini, kodeMk: "UPW991", perKelas: { A: [{ t: "u", id: dsn }], B: [{ t: "u", id: d3 }] } }, tAdm);
  ok("dp.timSimpan", { semester: kini, kodeMk: "UPW992", perKelas: { A: [{ t: "u", id: dsn }], B: [{ t: "u", id: dsn }] } }, tAdm);
  const pdf = s => Buffer.concat([Buffer.from("%PDF-1.4\n" + s), Buffer.alloc(40)]).toString("base64");
  // Beda dosen: terpisah, tidak saling melihat.
  let A = ok("mkp.unggah", { semester: kini, kode: "UPW991", komp: "rps", kunci: "A", nama: "RPS A.docx", isi: docxUji("rps", "RPS A") }, tDsn);
  cek("beda dosen: dosen kelas A hanya melihat kelas A; RPS tidak dibagi ke kelas B", A.kelas.map(x => x.k).join() === "A" && A.kelas[0].rpsBersama.length === 0 && A.jumlahKelas === 2 && !A.lengkap.includes("rps"));
  cek("beda dosen: dosen kelas A tidak bisa mengisi atau membuka kelas B", /tidak mengajar/.test(salah("mkp.unggah", { semester: kini, kode: "UPW991", komp: "kontrak", kunci: "B", tautan: "https://x.id/b" }, tDsn))
    && /tidak mengajar/.test(salah("mkp.lihat", { semester: kini, kode: "UPW991", komp: "rps", kunci: "B" }, tDsn)));
  let B = ok("mkp.unggah", { semester: kini, kode: "UPW991", komp: "rps", kunci: "B", nama: "dok.docx", isi: docxUji("rps", "https://x.id/rps-b") }, tKps);
  cek("beda dosen: pengajar kelas B mengisi RPS kelasnya sendiri; MK lengkap RPS setelah kedua kelas terisi", B.kelas.find(x => x.k === "B").rps.nama === "dok.docx" && B.lengkap.includes("rps"));
  const Sd = ok("mkp.saya", {}, tDsn).mk.find(m => m.kode === "UPW991");
  cek("Mata Kuliah Saya dosen kelas A: hanya kelas A, tanpa isian kelas B", Sd.kelas.map(x => x.k).join() === "A" && Sd.kelas[0].rps.nama === "RPS A.docx");
  // Dosen sama di kelas A dan B: RPS satu kali, komponen lain per kelas.
  let C = ok("mkp.unggah", { semester: kini, kode: "UPW992", komp: "rps", kunci: "A", nama: "RPS sama.docx", isi: docxUji("rps", "RPS sama") }, tDsn);
  cek("dosen sama: RPS sekali berlaku untuk kelas A dan B", C.kelas.map(x => x.k).join() === "A,B" && C.kelas.every(x => x.rps && x.rps.nama === "RPS sama.docx") && C.lengkap.includes("rps"));
  C = ok("mkp.unggah", { semester: kini, kode: "UPW992", komp: "kontrak", kunci: "A", nama: "dok.docx", isi: docxUji("kontrak", "https://x.id/kontrak-a") }, tDsn);
  cek("dosen sama: kontrak kuliah per kelas (kelas B belum) → MK belum lengkap kontrak", C.kelas.find(x => x.k === "A").kontrak && !C.kelas.find(x => x.k === "B").kontrak && !C.lengkap.includes("kontrak"));
  C = ok("mkp.unggah", { semester: kini, kode: "UPW992", komp: "kontrak", kunci: "B", nama: "dok.docx", isi: docxUji("kontrak", "https://x.id/kontrak-a") }, tDsn);
  cek("dosen sama: mengunggah dokumen yang sama untuk kelas B → lengkap", C.lengkap.includes("kontrak"));
  C = ok("mkp.unggah", { semester: kini, kode: "UPW992", komp: "interaksi", kunci: "B", tautan: "https://x.id/lms-b", ket: "LMS kelas B" }, tDsn);
  cek("bukti pembelajaran per kelas", C.kelas.find(x => x.k === "B").interaksi.length === 1 && C.kelas.find(x => x.k === "A").interaksi.length === 0);
  // Peserta: dosen hanya kelas yang diajar.
  const Pd = ok("peserta.data", { semester: kini, kodeMk: "UPW991" }, tDsn), Pa = ok("peserta.data", { semester: kini, kodeMk: "UPW991" }, tAdm);
  cek("peserta: dosen kelas A hanya melihat kelas A; Admin melihat A dan B", Pd.kunci.map(k => k.k).join() === "A" && Pa.kunci.map(k => k.k).join() === "A,B");
  cek("rekap pengelola: per kelas lengkap dengan tim masing-masing", (() => { const m = ok("mkp.rekap", { semester: kini }, tKps).mk.find(x => x.kode === "UPW991"); return m.kelas.length === 2 && m.kelas.find(x => x.k === "B").tim[0].id === d3; })());
  void d2; void g;
}
