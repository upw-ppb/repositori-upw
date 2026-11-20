// Uji v0.42.0: CPL prodi, otorisasi RPS, templat RPS terisi (rps.js), pembaca RPS Word, pemeriksaan butir 8, saran metode, RpsData, centang CPL Tabel 4.
// Memakai MK UPW992 (dosen uji mengajar kelas A dan B, tim sama) dari uji v0.40.0.
import fs from "node:fs";
import vm from "node:vm";
export async function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM }) {
  console.log("55. RPS: templat, baca, periksa");
  const C = g.ctx.CPL_PRODI, hit = u => C.filter(c => c.u === u).length;
  cek("CPL prodi kurikulum MRA-TP 2023: 68 CPL (S 11, KU 9, P 18, KK 30), kode unik", C.length === 68 && hit("S") === 11 && hit("KU") === 9 && hit("P") === 18 && hit("KK") === 30
    && new Set(C.map(c => c.k)).size === 68 && /pemikian logis/.test(C.find(c => c.k === "KU1").t));
  // Otorisasi
  cek("otorisasi RPS: dosen dan mahasiswa tidak bisa membuka; KPS hanya melihat", /izin/i.test(salah("rps.otorisasi", {}, tDsn)) && /izin/i.test(salah("rps.otorisasi", {}, tM))
    && ok("rps.otorisasi", {}, tKps).boleh === false && /izin/i.test(salah("rps.otorisasi", { simpan: 1, kajurNama: "X" }, tKps)));
  cek("otorisasi RPS: NIP harus angka", /NIP Ketua Jurusan/.test(salah("rps.otorisasi", { simpan: 1, kajurNama: "Kajur Uji", kajurNip: "abc" }, tAdm)));
  const O = ok("rps.otorisasi", { simpan: 1, kajurNama: "Dr. Kajur Uji, M.Par.", kajurNip: "196001011990011001", labor: "" }, tAdm).otorisasi;
  cek("otorisasi RPS tersimpan; labor/jabatan bawaan; KPS dari akun berperan KPS bila dikosongkan", O.kajurNama === "Dr. Kajur Uji, M.Par." && O.labor === "Travel Agencies dan Tour Operation"
    && O.kajurJabatan === "Ketua Jurusan Kepariwisataan" && O.kpsDariAkun === true && !!O.kpsNama && /^\d+$/.test(O.kpsNip));
  // Bahan templat
  const kini = ok("mkp.saya", {}, tDsn).semester;
  const R = ok("mkp.rpsRef", { semester: kini, kode: "UPW992", kunci: "A" }, tDsn);
  cek("bahan templat: MK, tim kelas A dengan NIP, otorisasi, 68 CPL prodi, belum ada RPS terakhir", R.mk.kode === "UPW992" && R.mk.sks === 2 && R.tim.length === 1 && R.tim[0].nip === "199001152015041001"
    && R.tim[0].utama && R.otorisasi.kajurNama === "Dr. Kajur Uji, M.Par." && R.cplProdi.length === 68 && R.terakhir === null && R.kunci === "A");
  cek("bahan templat: mahasiswa ditolak; dosen di luar tim ditolak", !!salah("mkp.rpsRef", { semester: kini, kode: "UPW992" }, tM) && /tidak mengajar|bukan anggota/i.test(salah("mkp.rpsRef", { semester: kini, kode: "UPW991", kunci: "B" }, tDsn)));
  // rps.js di Node
  const ctx = { Blob, TextEncoder, TextDecoder, DecompressionStream, Response, Uint8Array, DataView, console }; ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync("web/zip.js", "utf8"), ctx); vm.runInContext(fs.readFileSync("web/rps.js", "utf8"), ctx);
  const U = ctx.UPW_RPS, logo = {}; ["kemenpar", "poltekpar", "asean", "banpt"].forEach(k => { logo[k] = new Uint8Array(fs.readFileSync(`web/templat/logo-${k}.png`)); });
  const ab = async b => await b.arrayBuffer();
  const K = U.kosong(R, ["S9", "P12", "KU1", "KK23"], "20 November 2026");
  cek("templat baru: identitas dari aplikasi, CPL terpilih dengan rumusan prodi, 16 pertemuan (8 UTS, 16 UAS), waktu menurut sks", K.mk.kode === "UPW992" && K.cpl.map(c => c.ref).join() === "S9,P12,KU1,KK23"
    && K.cpl[3].t === C.find(c => c.k === "KK23").t && K.pertemuan.length === 16 && K.pertemuan[7].ujian === "UTS" && K.pertemuan[15].ujian === "UAS" && /TM: 2 × 50'/.test(K.pertemuan[0].waktu)
    && K.otor.kajur.nama === "Dr. Kajur Uji, M.Par." && K.otor.pengembang[0].nip === "199001152015041001");
  const kosongBaca = await U.baca(await ab(U.buat(K, logo)));
  const cekKosong = U.periksa(kosongBaca, Object.assign({}, R, { mk: R.mk }));
  cek("templat kosong dibaca kembali: petunjuk [ … ] dianggap belum diisi → pemeriksaan menandai metode, kriteria, bobot", kosongBaca.sumber === "templat" && kosongBaca.cpl.length === 4 && kosongBaca.cpmk.length === 0
    && cekKosong.some(c => c.t === "wajib" && /metode pembelajaran/.test(c.teks)) && cekKosong.some(c => c.t === "wajib" && /Jumlah bobot di program pembelajaran 0%/.test(c.teks)));
  // RPS terisi lengkap
  const F = JSON.parse(JSON.stringify(K));
  F.mk.rumpun = "Perjalanan"; F.kualifikasi = "Certificate IV"; F.jenjang = "Level 3";
  F.cpmk = [{ kode: "CPMK 1", t: "Mampu menyusun konten promosi digital destinasi (CPL2, CPL4)", cpl: ["CPL2", "CPL4"] }, { kode: "CPMK 2", t: "Mampu bekerja sama dengan mitra industri secara profesional (CPL1, CPL3)", cpl: ["CPL1", "CPL3"] }];
  F.sub = [1, 2, 3].map(i => ({ kode: "Sub-CPMK " + i, t: "Kemampuan akhir tahap " + i }));
  F.kor = { "CPMK 1": [1, 2], "CPMK 2": [3] };
  F.deskripsi = "Mata kuliah berbasis project-based learning bersama mitra desa wisata."; F.bahan = "D2.TCS.CL5.07 Co-ordinate production of brochures"; F.pustakaUtama = ["Penulis. 2024. Desain Grafis. Denpasar: Penerbit."];
  F.pustakaPendukung = ["Panduan Canva"]; F.media = "Laptop, Canva, LMS e-learning";
  const bobot = { 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 5, 7: 5, 8: 15, 9: 5, 10: 5, 11: 5, 12: 5, 13: 5, 14: 5, 15: 5, 16: 15 };
  F.pertemuan.forEach(p => { p.bobot = bobot[p.ke]; if (p.ujian) return; Object.assign(p, { sub: "Sub-CPMK " + (Number(p.ke) % 3 + 1), bahan: "Topik " + p.ke, metode: Number(p.ke) === 11 ? "Kunjungan lapangan ke lokasi mitra" : "Kuliah, studi kasus", pengalaman: "Tugas " + p.ke, kriteria: "Ketepatan " + p.ke, ref: "1" }); });
  F.porto = F.pertemuan.map(p => p.ujian ? { minggu: p.ke, ujian: p.ujian, bobot: p.bobot } : { minggu: p.ke, cpl: "CPL1, CPL2, CPL3, CPL4", cpmk: "CPMK 1", sub: p.sub, indikator: "Indikator " + p.ke, bentuk: "Praktik", bobot: p.bobot });
  const buf = await ab(U.buat(F, logo)), B = await U.baca(buf);
  cek("RPS terisi dibaca kembali utuh: identitas, CPL, CPMK + CPL, Sub-CPMK, korelasi, pustaka, 16 pertemuan, portofolio", B.mk.nama === F.mk.nama && B.mk.rumpun === "Perjalanan" && B.mk.sksT === 2 && B.kualifikasi === "Certificate IV"
    && B.cpl.map(c => c.kode + c.ref).join() === "CPL1S9,CPL2P12,CPL3KU1,CPL4KK23" && B.cpmk.length === 2 && B.cpmk[1].cpl.join() === "CPL1,CPL3" && B.sub.length === 3
    && JSON.stringify(B.kor) === JSON.stringify(F.kor) && B.pustakaUtama.length === 1 && B.pertemuan.length === 16 && B.pertemuan[10].metode === "Kunjungan lapangan ke lokasi mitra" && B.pertemuan[7].bobot === 15
    && B.porto.length === 16 && B.porto[0].bentuk === "Praktik" && B.otor.kajur.nip === "196001011990011001" && B.dosen.length === 1);
  const cB = U.periksa(B, Object.assign({}, R, { mk: R.mk }));
  cek("RPS lengkap: tidak ada temuan wajib; CPL sesuai daftar prodi", !cB.some(c => c.t === "wajib") && cB.some(c => c.t === "ok" && /4 CPL prodi/.test(c.teks)));
  const S2 = U.saranMetode(B, ["Case based learning", "Project based learning", "Research based education (RBE)", "Industry based education (IBE)", "Teaching industry / factory", "Praktik lapangan di destinasi", "Daring / blended"]);
  const ada = m => S2.find(v => v.m === m).ada;
  cek("saran metode dari isi RPS: PjBL, CBL, IBE, praktik lapangan, daring terbaca; RBE disarankan ditambah", ada("Project based learning") && ada("Case based learning") && ada("Industry based education (IBE)")
    && ada("Praktik lapangan di destinasi") && ada("Daring / blended") && !ada("Research based education (RBE)") && /penelitian/.test(S2.find(v => v.m === "Research based education (RBE)").tambah));
  // RPS bermasalah: waktu kosong, bobot UTS kosong, kode CPL salah, rumusan berbeda
  const X = JSON.parse(JSON.stringify(F));
  X.pertemuan.forEach(p => { if (!p.ujian) p.waktu = ""; if (p.ujian === "UTS") p.bobot = ""; });
  X.cpl[1].t = "Rumusan yang sama sekali berbeda dari kurikulum"; X.cpl[2].ref = "KU99"; X.mk.kode = "999"; X.dosen = ["Orang Lain, S.Par."];
  const cX = U.periksa(await U.baca(await ab(U.buat(X, logo))), Object.assign({}, R, { mk: R.mk }));
  const ada2 = re => cX.some(c => re.test(c.teks));
  cek("RPS bermasalah: waktu kosong, bobot UTS kosong (total 85%), kode CPL tak dikenal, rumusan CPL berbeda, kode MK berbeda, tim belum tercantum", ada2(/Waktu belum diisi pada semua pertemuan/) && ada2(/Bobot UTS kosong/)
    && ada2(/85%, seharusnya 100%/) && ada2(/tidak dikenali untuk CPL3/) && ada2(/Rumusan CPL2 \(P12\) berbeda/) && ada2(/Kode MK di RPS \(999\)/) && ada2(/belum tercantum di RPS/));
  // Unggah RPS Word dengan hasil baca → RpsData, rpsBaca di detail, RPS bersama kelas A dan B
  const nRps = (g.sheets.RpsData || [[]]).length;
  const isi = Buffer.from(buf).toString("base64");
  const Dt = ok("mkp.unggah", { semester: kini, kode: "UPW992", komp: "rps", kunci: "A", nama: "RPS UPW992.docx", isi, rps: JSON.stringify(B) }, tDsn);
  cek("unggah RPS Word: hasil baca tersimpan (RpsData) dan tampil di kelas A dan B (RPS bersama)", g.sheets.RpsData.length === nRps + 1 && Dt.kelas.every(k => k.rpsBaca && k.rpsBaca.data.cpl.length === 4)
    && Dt.cplProdi.length === 68 && g.sheets.RpsData[0].join() === "semester,kodeMk,kunci,fileId,data,oleh,diubah");
  cek("unggah RPS: hasil baca terlalu panjang ditolak tanpa menyimpan file", /terlalu panjang/.test(salah("mkp.unggah", { semester: kini, kode: "UPW992", komp: "rps", kunci: "A", nama: "RPS.docx", isi, rps: JSON.stringify(Object.assign({}, B, { x: "a".repeat(50000) })) }, tDsn)));
  const R2 = ok("mkp.rpsRef", { semester: kini, kode: "UPW992", kunci: "B" }, tDsn), K2 = U.kosong(R2, null, "1 Januari 2027");
  cek("templat berikutnya terisi dari RPS terakhir (CPMK, Sub-CPMK, pertemuan, bobot)", R2.terakhir && R2.terakhir.data.cpmk.length === 2 && K2.cpmk.length === 2 && K2.pertemuan[0].bahan === "Topik 1" && K2.mk.tgl === "1 Januari 2027" && K2.cpl.length === 4);
  const ts = Number(kini.slice(0, 4)), T4 = ok("ilkps.data", { ts }, tAdm).tabel.find(t => t.kode === "4"), baris = T4.baris.find(r => /UPW992/.test(String(r[2])));
  cek("Tabel 4: centang CPL Sikap/Pengetahuan/KU/KK dan dokumen RPS terisi dari RPS terbaca", baris && baris.slice(9, 13).join() === "V,V,V,V" && /^RPS /.test(baris[13]));
  const mkDp = ok("dp.data", {}, tAdm).mk.find(m => m.kode === "UPW992");
  cek("Data Prodi › Kurikulum: unsur CPL dan RPS dari RPS terbaca", mkDp.rpsBaca && mkDp.rpsBaca.unsur.sort().join() === "KK,KU,P,S" && mkDp.rpsBaca.semester === kini);
  // Unggah PDF RPS (tanpa baca) tidak menghapus hasil baca lama, tetapi tidak lagi ditampilkan untuk file baru
  const pdf = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(40)]).toString("base64");
  const Dp = ok("mkp.unggah", { semester: kini, kode: "UPW992", komp: "rps", kunci: "A", nama: "RPS.pdf", isi: pdf }, tDsn);
  cek("RPS diganti PDF: hasil baca tidak ditampilkan untuk file baru", Dp.kelas.every(k => !k.rpsBaca));
}
