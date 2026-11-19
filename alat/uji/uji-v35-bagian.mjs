// Uji v0.35.0: impor tim pengajar dari templat Excel (hanya KPS dan Admin Prodi); pembuat Excel dengan rumus dan daftar pilihan dari rentang sel.
import fs from "node:fs";
import vm from "node:vm";
export async function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tSA }) {
  console.log("46. Impor tim pengajar dari Excel");
  const dsn = ID("199001152015041001"), d2 = ID("198001012005011009"), d3 = ID("197911302005012001");
  ok("dp.mkSimpan", { data: { kode: "UPW951", nama: "Uji Impor Tim A", semester: 1, sksKuliah: 3 } }, tAdm);
  ok("dp.mkSimpan", { data: { kode: "UPW952", nama: "Uji Impor Tim B", semester: 1, sksKuliah: 2 } }, tAdm);
  ok("dp.mkSimpan", { data: { kode: "UPW953", nama: "Uji Impor Tim C", semester: 1, sksKuliah: 2 } }, tAdm);
  ok("dp.mkSimpan", { data: { kode: "UPW954", nama: "Uji Impor Genap", semester: 2, sksKuliah: 2 } }, tAdm);
  const pr = ok("dp.data", {}, tAdm).praktisi[0];
  const smt = "2031-1", tim = k => ok("dp.data", { semester: smt }, tAdm).tim.find(t => t.kode === k);
  ok("dp.timSimpan", { semester: smt, kodeMk: "UPW953", anggota: [{ t: "u", id: d3 }] }, tAdm);
  const daftar = [{ kodeMk: "UPW951", anggota: [{ t: "u", id: dsn }, { t: "u", id: d2 }, { t: "p", id: pr.id }] },
    { kodeMk: "UPW952", perKelas: { A: [{ t: "u", id: d2 }], B: [{ t: "u", id: dsn }] } }];
  cek("hanya KPS dan Admin Prodi: dosen dan Super Admin ditolak", /izin/.test(salah("dp.timImpor", { semester: smt, daftar }, tDsn)) && /izin/.test(salah("dp.timImpor", { semester: smt, daftar }, tSA)));
  cek("dp.data: bolehImporTim untuk KPS dan Admin Prodi saja", ok("dp.data", {}, tKps).bolehImporTim === true && ok("dp.data", {}, tAdm).bolehImporTim === true && ok("dp.data", {}, tSA).bolehImporTim === false);
  cek("semester tidak valid / daftar kosong ditolak", /Semester tidak valid/.test(salah("dp.timImpor", { semester: "2031", daftar }, tKps)) && /Tidak ada tim/.test(salah("dp.timImpor", { semester: smt, daftar: [] }, tKps)));
  let j = ok("dp.timImpor", { semester: smt, daftar: daftar.concat([{ kodeMk: "UPW954", anggota: [{ t: "u", id: dsn }] }, { kodeMk: "UPW951", anggota: [{ t: "u", id: d3 }] }, { kodeMk: "XX999", anggota: [{ t: "u", id: dsn }] }]) }, tKps);
  cek("KPS mengimpor: 2 MK tersimpan; MK genap di semester ganjil, MK ganda, dan kode tak dikenal dilewati dengan alasan", j.disimpan === 2 && j.dilewati.length === 3
    && /tidak ditawarkan/.test(j.dilewati[0].alasan) && /lebih dari sekali/.test(j.dilewati[1].alasan) && /tidak ditemukan/.test(j.dilewati[2].alasan) && j.dilewati[0].nip === "UPW954", j);
  let a = tim("UPW951"), b = tim("UPW952"), c = tim("UPW953");
  cek("tim sama semua kelas tersimpan (utama dosen + anggota + praktisi)", !a.perKelas && a.anggota.map(x => x.id).join() === [dsn, d2, pr.id].join() && a.utama.join() === dsn);
  cek("tim per kelas tersimpan (A dan B berbeda)", b.perKelas && b.kelas.A[0].id === d2 && b.kelas.B[0].id === dsn);
  cek("MK yang tidak ada di berkas tidak diubah", c.anggota.length === 1 && c.anggota[0].id === d3);
  j = ok("dp.timImpor", { semester: smt, daftar: [{ kodeMk: "UPW951", anggota: [{ t: "p", id: pr.id }, { t: "u", id: dsn }] }, { kodeMk: "UPW952", anggota: [{ t: "u", id: d3 }] }] }, tAdm);
  cek("Admin Prodi: pengampu utama praktisi ditolak (tim lama tetap); per kelas → semua kelas berhasil", j.disimpan === 1 && /harus dosen/.test(j.dilewati[0].alasan) && tim("UPW951").anggota.length === 3 && !tim("UPW952").perKelas && tim("UPW952").anggota[0].id === d3);
  // Permintaan pemilik saat menyetujui tayang: unggah templat berulang MENGGANTI pengajar, tidak menambah baris/MK/kelas.
  const barisSmt = () => (g.sheets.TimPengajar || []).slice(1).filter(r => String(r[0]) === smt && /^UPW95/.test(String(r[1])));
  const ulang = [{ kodeMk: "UPW951", anggota: [{ t: "u", id: d2 }] }, { kodeMk: "UPW952", perKelas: { A: [{ t: "u", id: dsn }, { t: "u", id: d3 }], B: [{ t: "u", id: d3 }] } }, { kodeMk: "UPW953", anggota: [{ t: "u", id: dsn }, { t: "u", id: d2 }] }];
  ok("dp.timImpor", { semester: smt, daftar: ulang }, tKps);
  const n1 = barisSmt().length, tm1 = ok("dp.data", { semester: smt }, tAdm).tim.filter(t => /^UPW95/.test(t.kode)).length;
  ok("dp.timImpor", { semester: smt, daftar: ulang }, tAdm); ok("dp.timImpor", { semester: smt, daftar: ulang }, tKps);
  const n2 = barisSmt().length;
  ok("dp.timImpor", { semester: smt, daftar: [{ kodeMk: "UPW951", anggota: [{ t: "u", id: d3 }, { t: "u", id: dsn }] }, { kodeMk: "UPW952", perKelas: { A: [{ t: "u", id: d2 }], B: [{ t: "u", id: dsn }] } }, { kodeMk: "UPW953", anggota: [{ t: "u", id: d3 }] }] }, tKps);
  const n3 = barisSmt().length, D3 = ok("dp.data", { semester: smt }, tAdm).tim;
  cek("unggah ulang 3× templat sama: jumlah baris tim tetap (" + n1 + " → " + n2 + "), tidak bertambah", n1 === 4 && n2 === n1, [n1, n2]);
  cek("unggah templat dengan pengajar berbeda: baris tetap, pengajar berganti; jumlah MK dan kelas sama", n3 === n1 && D3.filter(t => /^UPW95/.test(t.kode)).length === tm1
    && D3.find(t => t.kode === "UPW951").anggota.map(x => x.id).join() === [d3, dsn].join() && D3.find(t => t.kode === "UPW952").kelas.A.map(x => x.id).join() === d2
    && D3.find(t => t.kode === "UPW952").kelas.B[0].id === dsn && D3.find(t => t.kode === "UPW953").anggota.map(x => x.id).join() === d3);
  cek("dp.timSimpan tetap seperti sebelumnya (KPS tidak bisa Ubah tim)", /izin/.test(salah("dp.timSimpan", { semester: smt, kodeMk: "UPW953", anggota: [{ t: "u", id: dsn }] }, tKps)));
  // Pembuat Excel: rumus, sel kosong, daftar pilihan dari rentang, hitung ulang saat dibuka.
  const w = {}; const ctx = { window: w, Blob, TextEncoder, TextDecoder, Uint8Array, DataView, Date, Math, String, Array, Object, JSON, Number }; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync("web/zip.js", "utf8"), ctx);
  const blob = w.UPW_ZIP.xlsx([{ nama: "Data", baris: [["A [a]", "B [b]"], ["x", { f: "SUM(1,2)" }], ["", null]], pilihan: { 0: { ref: "'Beban SKS'!$A$2:$A$9" }, 1: ["A", "B"] } }, { nama: "Beban SKS", baris: [["Nama"]] }]);
  const u = Buffer.from(await blob.arrayBuffer()).toString("latin1");
  cek("Excel: sel rumus, sel kosong tidak ditulis, pilihan dari rentang lembar lain, fullCalcOnLoad", /<c r="B2"><f>SUM\(1,2\)<\/f><\/c>/.test(u) && !/r="A3"/.test(u)
    && /<formula1>'Beban SKS'!\$A\$2:\$A\$9<\/formula1>/.test(u) && /<formula1>"A,B"<\/formula1>/.test(u) && /fullCalcOnLoad="1"/.test(u));
  const app = fs.readFileSync("web/aplikasi.js", "utf8");
  cek("tampilan: panel impor tim hanya untuk peran aktif KPS/Admin Prodi; berkas semester lain ditolak", /D\.bolehImporTim && \["kps", "admin"\]\.includes\(peranAktif\(\)\) \? panelImporExcel\("tim"\)/.test(app) && /Berkas ini untuk semester/.test(app));
  cek("templat: rumus SKS per orang (penuh untuk tunggal, dibagi rata untuk tim; × jumlah kelas bila semua kelas) dan Beban SKS per orang",
    /\$C\$\{y\}\*IF\(\$D\$\{y\}="",\$H\$\{y\},1\)\/COUNTA\(\$E\$\{y\}:\$G\$\{y\}\)/.test(app) && /SUMPRODUCT\(\$\{cocok\},\$\{rg\("I"\)\}\)/.test(app));
}
