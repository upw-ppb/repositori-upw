// Uji v0.39.0: peserta kelas (otomatis per kelas, diatur per orang, dibagi per kelompok) dan Mata Kuliah Saya untuk mahasiswa.
import fs from "node:fs";
export function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tD2 }) {
  console.log("50. Peserta kelas dan Mata Kuliah Saya (mahasiswa)");
  const dsn = ID("199001152015041001"), d2 = ID("198001012005011009"), m1 = ID("250103"), smt = "2026-1";
  cek("migrasi: tabel PesertaKelas; SKEMA_VERSI ≥ 29", !!g.sheets.PesertaKelas && Number(g.props.SKEMA_VERSI) >= 29);
  // MK semester 3 pada Ganjil 2026/2027 = angkatan 2025 (mahasiswa uji 250103, kelas A).
  ok("dp.mkSimpan", { daftar: [{ kode: "UPW973", nama: "Uji Peserta Biasa", semester: 3, sksKuliah: 2 }, { kode: "UPW975", nama: "Uji Bahasa Pilihan", semester: 3, sksKuliah: 2, kelompok: "Jepang (UPW975J), Jerman (UPW975D)" }] }, tAdm);
  ok("dp.timSimpan", { semester: smt, kodeMk: "UPW973", anggota: [{ t: "u", id: dsn }] }, tAdm);
  ok("dp.timSimpan", { semester: smt, kodeMk: "UPW975", perKelas: { "A/JEPANG": [{ t: "u", id: d2 }], "A/JERMAN": [{ t: "u", id: dsn }] } }, tAdm);
  let P = ok("peserta.data", { semester: smt, kodeMk: "UPW973" }, tAdm);
  const kA = () => P.kunci.find(k => k.k === "A");
  cek("MK biasa: peserta otomatis = mahasiswa aktif angkatan 2025 kelas A (termasuk 250103); dosen pengajar tercantum", P.angkatan === 2025 && kA().sumber === "otomatis" && kA().peserta.some(x => x.id === m1) && kA().dosen[0].nama && P.boleh);
  let S = ok("mhs.mkSaya", { semester: smt }, tM), mk = k => S.mk.find(x => x.kode === k);
  cek("mahasiswa melihat MK semesternya dengan dosen pengajar dan kelas", mk("UPW973") && mk("UPW973").kelas === "A" && mk("UPW973").dosen.length === 1 && /Gede/.test(mk("UPW973").dosen[0].nama));
  cek("MK berkelompok: mahasiswa belum dibagi → 'kelompok belum ditentukan', tanpa dosen", mk("UPW975").belumDibagi && mk("UPW975").dosen.length === 0 && mk("UPW975").pilihanKelompok.join() === "Jepang,Jerman");
  ok("dp.mkSimpan", { data: { kode: "UPW974", nama: "Uji Peserta Lain", semester: 3, sksKuliah: 2 } }, tAdm);
  ok("dp.timSimpan", { semester: smt, kodeMk: "UPW974", anggota: [{ t: "u", id: d2 }] }, tAdm);
  cek("hak akses: dosen di luar tim ditolak melihat peserta; dosen tim melihat tanpa hak ubah; dosen tidak bisa mengatur",
    /bukan pengajar/.test(salah("peserta.data", { semester: smt, kodeMk: "UPW974" }, tDsn)) && ok("peserta.data", { semester: smt, kodeMk: "UPW973" }, tDsn).boleh === false
    && /izin/.test(salah("peserta.simpan", { semester: smt, kodeMk: "UPW973", kunci: "A", userIds: [] }, tDsn)) && /izin/.test(salah("mhs.mkSaya", {}, tDsn)));
  P = ok("peserta.bagi", { semester: smt, kodeMk: "UPW975", bagi: { [m1]: "A/JEPANG" } }, tKps);
  S = ok("mhs.mkSaya", { semester: smt }, tM);
  cek("KPS membagi kelompok: mahasiswa melihat kelompok Jepang (kode MK kelompok) dan dosennya", mk("UPW975").kelompok.n === "Jepang" && mk("UPW975").kelompok.kode === "UPW975J" && !mk("UPW975").belumDibagi && mk("UPW975").dosen.length === 1 && mk("UPW975").dosen[0].nama !== mk("UPW973").dosen[0].nama);
  P = ok("peserta.simpan", { semester: smt, kodeMk: "UPW975", kunci: "A/JERMAN", userIds: [m1] }, tAdm);
  cek("satu mahasiswa hanya di satu kelompok: pindah ke Jerman → keluar dari Jepang", P.kunci.find(k => k.k === "A/JERMAN").peserta.some(x => x.id === m1) && !P.kunci.find(k => k.k === "A/JEPANG").peserta.some(x => x.id === m1));
  cek("kunci tidak dikenal dan 'otomatis' untuk MK berkelompok ditolak", /tidak dikenal/.test(salah("peserta.simpan", { semester: smt, kodeMk: "UPW975", kunci: "A/KOREA", userIds: [m1] }, tAdm))
    && /tidak punya peserta otomatis/.test(salah("peserta.simpan", { semester: smt, kodeMk: "UPW975", kunci: "A/JEPANG", otomatis: true }, tAdm)));
  P = ok("peserta.simpan", { semester: smt, kodeMk: "UPW973", kunci: "A", userIds: [] }, tAdm);
  S = ok("mhs.mkSaya", { semester: smt }, tM);
  cek("peserta MK biasa diatur (mahasiswa dikeluarkan) → MK tidak tampil bagi mahasiswa itu", kA().sumber === "diatur" && kA().peserta.length === 0 && !mk("UPW973"));
  P = ok("peserta.simpan", { semester: smt, kodeMk: "UPW973", kunci: "A", otomatis: true }, tAdm);
  S = ok("mhs.mkSaya", { semester: smt }, tM);
  cek("kembalikan otomatis: mahasiswa kembali menjadi peserta", kA().sumber === "otomatis" && !!mk("UPW973") && !(g.sheets.PesertaKelas || []).slice(1).some(r => r[1] === "UPW973"));
  const m2 = ID("250201");
  P = ok("peserta.simpan", { semester: "2027-1", kodeMk: "UPW975", kunci: "B/JEPANG", userIds: [m1] }, tKps);
  cek("peserta lintas angkatan (mengulang) bisa ditambahkan; MK muncul di Mata Kuliah Saya semester itu", ok("mhs.mkSaya", { semester: "2027-1" }, tM).mk.some(x => x.kode === "UPW975" && x.kelompok && x.kelompok.n === "Jepang"));
  cek("tercatat di Log", g.sheets.Log.slice(1).some(r => /peserta\.bagi/.test(r.join("|"))) && g.sheets.Log.slice(1).some(r => /peserta\.simpan/.test(r.join("|"))));
  const app = fs.readFileSync("web/aplikasi.js", "utf8");
  cek("tampilan: menu mkm untuk mahasiswa, tombol Peserta, templat Excel pembagian kelompok", /if \(p === "mahasiswa"\) m\.push\("mkm"\)/.test(app) && /data-act="pesertaBuka"/.test(app) && /\[peserta:/.test(app) && /function hMkMhs/.test(app));
  void m2;
}
