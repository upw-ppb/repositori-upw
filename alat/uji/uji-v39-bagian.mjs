// Uji v0.39.0: peserta kelas (otomatis per kelas, diatur per orang, dibagi per kelompok) dan Mata Kuliah Saya untuk mahasiswa.
import fs from "node:fs";
import vm from "node:vm";
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
// v0.39.1: Tabel 4 menulis semua kode kelompok MK berkelompok (satu baris MK).
export function jalankan391({ cek, ok, tAdm }) {
  console.log("51. Tabel 4: kode kelompok MK pilihan");
  ok("dp.mkSimpan", { data: { kode: "UPW977", nama: "Uji Kode Kelompok", semester: 2, sksKuliah: 2, kelompok: "Jepang (UPW977), Jerman (UPW978), Perancis (UPW979)" } }, tAdm);
  ok("dp.mkSimpan", { data: { kode: "UPW980", nama: "Uji Kode Kelompok Tanpa Kode", semester: 2, sksKuliah: 2, kelompok: "Jepang, Jerman" } }, tAdm);
  const T4 = ok("ilkps.data", { ts: 2025 }, tAdm).tabel.find(t => t.kode === "4"), b = T4.baris.filter(r => /UPW97[7-9]|UPW980/.test(String(r[2])));
  cek("Tabel 4: satu baris dengan tiga kode; MK berkelompok tanpa kode kelompok tetap kode utama; total MK tidak bertambah",
    b.length === 2 && b.some(r => r[2] === "UPW977 / UPW978 / UPW979" && r[3] === "Uji Kode Kelompok") && b.some(r => r[2] === "UPW980") && /semua kode kelompoknya/.test(T4.catatan));
}
// v0.39.2: pencocokan nama di unggahan templat tim (nama boleh diketik). Diuji langsung pada kode tampilan.
export function jalankan392({ cek }) {
  console.log("52. Templat tim: pencocokan nama yang diketik");
  const app = fs.readFileSync("web/aplikasi.js", "utf8");
  const potong = (a, b) => app.slice(app.indexOf(a), app.indexOf(b));
  const kode = potong("const labelDosenTim", "function templatTim") + potong("/* v0.39.2: pencocokan nama bertahap", "/** Periksa hasil baca templat tim");
  const ctx = {}; vm.createContext(ctx); vm.runInContext(kode + "\n;this.buat = buatPencocokNama;", ctx);
  const D = { dosen: [
      { id: "k", nama: "Dr. Komang Sri Widiastuti, M.Par.", inisial: "KSW", nip: "197911302005012001" },
      { id: "g", nama: "Gede Arya Pratama, S.E., M.M.", inisial: "GAP", nip: "199001152015041001" },
      { id: "l", nama: "Lukia Zuarida, S.S., M.Par.", inisial: "LZ", nip: "198501012010122001" },
      { id: "m1", nama: "I Made Artajaya, S.ST.Par., M.Par.", inisial: "MA", nip: "1" },
      { id: "m2", nama: "I Made Putra Wijaya, M.M.", inisial: "MPW", nip: "2" },
      { id: "n1", nama: "Ni Luh Putu Sari, M.Par.", inisial: "NLS", nip: "3" },
      { id: "n2", nama: "Ni Luh Putu Dewi, M.Par.", inisial: "NLD", nip: "4" }],
    praktisi: [{ id: "p", nama: "Teguh Hadisukarno", perusahaan: "PT Wisata" }] };
  const c = ctx.buat(D), id = v => (c(v).a || {}).id, cara = v => c(v).cara;
  cek("persis: pilihan dropdown, nama lengkap, inisial (huruf kecil), NIP", id("Dr. Komang Sri Widiastuti, M.Par. (KSW)") === "k" && id("gede arya pratama, s.e., m.m.") === "g" && id("ksw") === "k" && id("199001152015041001") === "g" && cara("KSW") === "persis");
  cek("tanpa gelar: 'Komang Sri Widiastuti', 'Lukia Zuarida', praktisi 'Teguh Hadisukarno'", id("Komang Sri Widiastuti") === "k" && cara("Komang Sri Widiastuti") === "tanpa gelar" && id("Lukia Zuarida") === "l" && id("teguh hadisukarno") === "p");
  cek("mirip (≥2 kata): 'Komang Widiastuti', 'Bu Komang Widiastuti', 'Made Artajaya'", id("Komang Widiastuti") === "k" && cara("Komang Widiastuti") === "mirip" && id("Bu Komang Widiastuti") === "k" && id("Made Artajaya") === "m1");
  cek("tidak menebak: satu kata ('Lukia'), hanya kata nama umum ('Ni Luh Putu'), atau dua orang sama cocok ('I Made')",
    !id("Lukia") && c("Lukia").satuKata && !id("Ni Luh Putu") && !id("I Made") && !id("Orang Lain Sekali"));
  cek("kata khas memilih orang yang benar di antara nama umum: 'Ni Luh Sari' → Sari, 'Luh Putu Dewi' → Dewi", id("Ni Luh Sari") === "n1" && id("Luh Putu Dewi") === "n2");
  cek("tampilan: kolom 'Terbaca sebagai' dan beban SKS per orang di pratinjau; petunjuk menulis nama di templat",
    /k: "tafsir", l: "Terbaca sebagai \(periksa\)"/.test(app) && /Beban SKS per orang menurut berkas ini/.test(app) && /\["Menulis nama"/.test(app));
}
