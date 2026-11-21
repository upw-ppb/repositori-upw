// Uji v0.45.0: nilai dari SIAKAD (baca template, unggah, hapus, lihat, ZIP), data bersama templat, contoh PDF, lembar Excel portofolio dihapus dari tampilan.
// Data mahasiswa di sini buatan (bukan data SIAKAD sungguhan).
import fs from "node:fs";
import vm from "node:vm";
export async function jalankan({ g, cek, ok, salah, tKps, tDsn, tAdm, tM }) {
  console.log("58. Nilai SIAKAD dan data bersama templat");
  const app = fs.readFileSync("web/aplikasi.js", "utf8");
  const fnTeks = app.slice(app.indexOf("function bacaNilaiSiakad"), app.indexOf("function bagianNilaiSiakad"));
  const c = { console }; vm.createContext(c); vm.runInContext(fnTeks + ";globalThis.baca = bacaNilaiSiakad;", c);
  const H = ["No", "NIM", "Nama Mahasiswa", "TUGAS INDIVIDU (15%)", "QUIZ (10%)", "UTS (25%)", "UAS (40%)", "KEHADIRAN (10%)", "Nilai", "Grade", "Keterangan"];
  const L = [{ nama: "Form Inputan", baris: [H, [1, "26990001", "Mhs Satu", 80, 88, 90, 85, 100, 0, 0, ""], [2, "26990002", "Mhs Dua", 70, 95, 80, "", 90, 0, 0, ""], [3, "26990003", "Mhs Tiga", 60, 69, 75, 70, 80, 0, 0, ""]] }];
  const skala = [{ h: "A", a: 85 }, { h: "B", a: 70 }, { h: "C", a: 55 }, { h: "E", a: 0 }];
  const r1 = c.baca(L, { skala, namaBerkas: "template_nilai_2026 Ganjil_231041102_D1A02.xls", kodeMk: ["231041102"], nimPeserta: ["26990001", "26990002", "26990003"], ujianRps: [{ ujian: "UTS", bobot: 15 }, { ujian: "UAS", bobot: 40 }] });
  cek("baca template SIAKAD: 5 komponen dan bobot dari judul kolom (jumlah 100), 3 mahasiswa, rata-rata per komponen", r1.komponen.map(k => k.n + k.b).join() === "TUGAS INDIVIDU15,QUIZ10,UTS25,UAS40,KEHADIRAN10"
    && r1.totalBobot === 100 && r1.nMhs === 3 && r1.komponen[3].kosong === 1 && r1.komponen[3].rata === 77.5);
  cek("nilai akhir dihitung dari mahasiswa yang nilainya lengkap; sebaran huruf dari skala prodi", r1.lengkap === 2 && r1.rataAkhir === Math.round(((80*15+88*10+90*25+85*40+100*10)/100 + (60*15+69*10+75*25+70*40+80*10)/100) / 2 * 100) / 100
    && r1.sebaran.A === 1 && r1.sebaran.B === 1);
  cek("catatan: nilai kosong dan bobot UTS berbeda dengan RPS; kode berkas cocok", r1.catatan.some(x => /UAS kosong untuk 1 dari 3/.test(x)) && r1.catatan.some(x => /Bobot UTS di SIAKAD 25%, di RPS 15%/.test(x))
    && !r1.catatan.some(x => /Kode MK/.test(x)) && !r1.catatan.some(x => /UAS di SIAKAD/.test(x)));
  const L2 = [{ nama: "Form Inputan", baris: [["No", "NIM", "Nama Mahasiswa", "QUIZ (5%)", "UTS (20%)", "Nilai"], [1, "11", "A", 1, ""], [2, "12", "B", 2, ""]] }];
  const r2 = c.baca(L2, { namaBerkas: "template_nilai_2026 Ganjil_231042122_D3A03.xls", kodeMk: ["231041102"], nimPeserta: ["99"] });
  cek("catatan: bobot tidak 100%, komponen belum diisi, kode MK berkas berbeda, NIM tidak cocok peserta", r2.catatan.some(x => /Jumlah bobot 25%/.test(x)) && r2.catatan.some(x => /UTS belum diisi/.test(x))
    && r2.catatan.some(x => /Kode MK di nama berkas \(231042122\)/.test(x)) && r2.catatan.some(x => /Hanya 0 dari 2 NIM/.test(x)));
  let galat = ""; try { c.baca([{ nama: "x", baris: [["No", "Nama"]] }], {}); } catch (e) { galat = e.message; }
  cek("berkas tanpa kolom NIM ditolak dengan pesan jelas", /NIM tidak ditemukan/.test(galat));
  // Server
  const kini = ok("mkp.saya", {}, tDsn).semester;
  const xlsx = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(60)]).toString("base64");
  cek("unggah nilai: format salah, isi bukan Excel, dan ringkasan kosong ditolak", /\.xls atau \.xlsx/.test(salah("mkp.nilaiUnggah", { semester: kini, kode: "UPW992", kunci: "A", nama: "n.pdf", isi: xlsx, ring: JSON.stringify(r1) }, tDsn))
    && /bukan Excel/.test(salah("mkp.nilaiUnggah", { semester: kini, kode: "UPW992", kunci: "A", nama: "n.xls", isi: Buffer.from("%PDF-1.4 xxxxxxxxxxxx").toString("base64"), ring: JSON.stringify(r1) }, tDsn))
    && /tidak terbaca/.test(salah("mkp.nilaiUnggah", { semester: kini, kode: "UPW992", kunci: "A", nama: "n.xls", isi: xlsx, ring: "{}" }, tDsn)));
  cek("unggah nilai: mahasiswa ditolak", !!salah("mkp.nilaiUnggah", { semester: kini, kode: "UPW992", kunci: "A", nama: "n.xls", isi: xlsx, ring: JSON.stringify(r1) }, tM));
  let D = ok("mkp.nilaiUnggah", { semester: kini, kode: "UPW992", kunci: "A", nama: "template_nilai.xls", isi: xlsx, ring: JSON.stringify(r1) }, tDsn);
  const A = D.kelas.find(k => k.k === "A"), B = D.kelas.find(k => k.k === "B");
  cek("unggah nilai tersimpan per kelas (kelas A saja) dengan ringkasan; data per mahasiswa tidak disimpan di sheet", A.nilai && A.nilai.nama === "template_nilai.xls" && A.nilai.ring.nMhs === 3 && !B.nilai
    && !JSON.stringify(g.sheets.PortofolioMk).includes("Mhs Satu"));
  const fileLama = Object.values(g.files).filter(f => /^Nilai SIAKAD/.test(f.nama || "")).length;
  D = ok("mkp.nilaiUnggah", { semester: kini, kode: "UPW992", kunci: "A", nama: "template_nilai2.xls", isi: xlsx, ring: JSON.stringify(r2) }, tDsn);
  cek("mengganti nilai: berkas lama ke sampah Drive", D.kelas.find(k => k.k === "A").nilai.nama === "template_nilai2.xls" && Object.values(g.files).filter(f => /^Nilai SIAKAD/.test(f.nama || "") && f.terbuang).length >= 1 && fileLama >= 1);
  const L1 = ok("mkp.lihat", { semester: kini, kode: "UPW992", kunci: "A", komp: "nilai" }, tKps);
  cek("berkas nilai bisa dibuka pengelola (KPS)", L1.t === "file" && L1.isi.length > 0);
  const Z = ok("mkp.daftarZip", { semester: kini, kode: "UPW992" }, tAdm), zA = Z.mk[0].kelas.find(k => k.k === "A");
  const J = ok("mkp.ambilZip", { semester: kini, item: [{ kode: "UPW992", kunci: "A", komp: "nilai" }] }, tAdm);
  cek("ZIP: berkas nilai SIAKAD ikut (folder kelas, nomor 4)", zA.berkas.some(e => e.komp === "nilai" && e.t === "file") && J.hasil[0].ok && /nilai: 4/.test(app));
  D = ok("mkp.nilaiHapus", { semester: kini, kode: "UPW992", kunci: "A" }, tDsn);
  cek("hapus nilai; hapus lagi ditolak", !D.kelas.find(k => k.k === "A").nilai && /belum diunggah/.test(salah("mkp.nilaiHapus", { semester: kini, kode: "UPW992", kunci: "A" }, tDsn)));
  // Data bersama templat
  cek("data bersama: batas hari harus angka", /Batas hari/.test(salah("rps.otorisasi", { simpan: 1, hariUmpan: "tujuh" }, tAdm)));
  const O = ok("rps.otorisasi", { simpan: 1, kajurNama: "Dr. Kajur Uji, M.Par.", hadirMin: "80", tempat: "", lms: "LMS Poltekpar Bali", hariUmpan: "7", hariKeberatan: "3", telat: "nilai dikurangi 10 per hari", pedoman: "Peraturan Direktur No. 1 Tahun 2025" }, tAdm).otorisasi;
  cek("data bersama tersimpan; tempat kosong memakai tempat surat prodi", O.lms === "LMS Poltekpar Bali" && O.hariUmpan === "7" && O.tempat === "Nusa Dua" && O.pedoman.includes("No. 1"));
  const ctx = { Blob, TextEncoder, TextDecoder, DecompressionStream, Response, Uint8Array, DataView, console }; ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync("web/zip.js", "utf8"), ctx); vm.runInContext(fs.readFileSync("web/rps.js", "utf8"), ctx);
  const R = ok("mkp.rpsRef", { semester: kini, kode: "UPW992", kunci: "A" }, tDsn), Dr = R.terakhir.data, U = ctx.UPW_RPS;
  const teks = async b => (await (await ctx.UPW_ZIP.buka(await b.arrayBuffer(), "Word"))("word/document.xml")).replace(/<[^>]+>/g, " ");
  const tk = await teks(U.kontrak(R, Dr, {}));
  cek("kontrak memakai data bersama: LMS, keterlambatan, batas umpan balik/keberatan, tempat, peraturan akademik; rekap nilai dari SIAKAD", tk.includes("melalui LMS Poltekpar Bali") && tk.includes("nilai dikurangi 10 per hari")
    && tk.includes("paling lambat 7 hari") && tk.includes("paling lambat 3 hari kerja") && tk.includes("Nusa Dua, [tanggal pertemuan pertama]") && tk.includes("(Peraturan Direktur No. 1 Tahun 2025)") && tk.includes("diunduh dari SIAKAD"));
  const tr = await teks(U.rubrik(R, Dr, {}));
  cek("rubrik memakai LMS dari data bersama; portofolio dari SIAKAD", tr.includes("melalui LMS Poltekpar Bali") && tr.includes("diambil dari SIAKAD"));
  const tp = await teks(U.buat(U.kosong(R, ["S9"], "x"), {}));
  cek("templat RPS mencantumkan kehadiran minimal dari data bersama", tp.includes("kehadiran minimal 80%"));
  // Contoh PDF & tampilan
  const pdf = ["rps", "kontrak", "rubrik"].map(n => fs.readFileSync(`web/contoh/${n}.pdf`).slice(0, 5).toString());
  cek("contoh berupa PDF (dibuka di penampil aplikasi sejak v0.48.2), tanpa tombol unduh contoh Word/Excel dan tanpa lembar Excel portofolio", pdf.every(p => p === "%PDF-") && /contoh\/\$\{d\.j\}\.pdf/.test(app) && !/mkpContoh/.test(app) && !/data-j="porto"/.test(app));
  cek("tampilan: keterangan jalur Download Template SIAKAD dan unggah setelah perkuliahan selesai", app.includes("Kelas Kuliah → Nilai Perkuliahan → Upload Excel → Download Template") && app.includes("setelah perkuliahan selesai"));
}
