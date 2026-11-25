// Uji v0.11.0: survei, jawaban (masuk dan publik), hasil, Tabel 11/22, Ref 11a.
export function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tM2, tSA }) {
  console.log("19. Survei: membuat");
  const hari = n => new Date(Date.now() + n * 864e5).toLocaleDateString("sv-SE", { timeZone: "Asia/Makassar" });
  // v0.50.0: KPS kini boleh membuat dan membuka survei (keputusan pemilik 24 Nov 2026); dosen tetap tidak bisa membuka menu.
  cek("dosen tidak bisa membuka menu; KPS boleh mengelola (v0.50.0)", /izin/.test(salah("survei.daftar", {}, tDsn)) && ok("survei.daftar", {}, tKps).bolehUbah === true);
  const D = ok("survei.daftar", {}, tAdm);
  cek("templat Tabel 22 (5 aspek) dan Tabel 11 (7 aspek + tahun lulus)", new Set(D.templat.t22.pertanyaan.filter(q => q.aspek !== undefined).map(q => q.aspek)).size === 5
    && new Set(D.templat.t11.pertanyaan.filter(q => q.aspek !== undefined).map(q => q.aspek)).size === 7 && D.templat.t11.pertanyaan.some(q => q.peran === "tahunLulus"));
  // Uji mekanisme memakai templat ringkas versi lama (5 + 12 pertanyaan), agar angka di bawah tetap sebanding; templat baru diuji di uji-v50-bagian.mjs.
  const lk = (teks, aspek) => ({ t: "likert", teks, aspek, wajib: true, na: true });
  const T22 = { judul: "Kepuasan mahasiswa terhadap layanan prodi", tujuan: "t22", sasaran: ["mahasiswa"], anonim: true, pertanyaan: [lk("Keandalan", 0), lk("Daya tanggap", 1), lk("Kepastian", 2), lk("Empati", 3), lk("Sarana", 4), { t: "paragraf", teks: "Saran" }] };
  const T11 = { judul: "Kepuasan pengguna lulusan", tujuan: "t11", sasaran: ["publik"], anonim: false, pertanyaan: [{ t: "singkat", teks: "Instansi", wajib: true }, { t: "singkat", teks: "Penilai", wajib: true },
    { t: "singkat", teks: "Alumni", wajib: true }, { t: "singkat", teks: "Tahun lulus", wajib: true, peran: "tahunLulus" }, ...["Etika", "Keahlian", "Bahasa asing", "TI", "Komunikasi", "Kerjasama", "Pengembangan diri"].map((t, i) => ({ t: "likert", teks: t, aspek: i, wajib: true })), { t: "paragraf", teks: "Masukan" }] };
  cek("judul wajib", /judul/.test(salah("survei.simpan", { data: { ...T22, judul: "" } }, tAdm)));
  cek("sasaran wajib", /sasaran/.test(salah("survei.simpan", { data: { ...T22, sasaran: [] } }, tAdm)));
  cek("tutup sebelum buka ditolak", /sebelum tanggal dibuka/.test(salah("survei.simpan", { data: { ...T22, buka: hari(5), tutup: hari(1) } }, tAdm)));
  cek("pilihan ganda butuh ≥ 2 opsi", /minimal 2 pilihan/.test(salah("survei.simpan", { data: { ...T22, pertanyaan: [{ t: "pilihan", teks: "A?", opsi: "Ya" }] } }, tAdm)));
  cek("pertanyaan kosong ditolak", /masih kosong/.test(salah("survei.simpan", { data: { ...T22, pertanyaan: [{ t: "likert", teks: " " }] } }, tAdm)));
  const id22 = ok("survei.simpan", { data: { ...T22, buka: hari(0), tutup: hari(10) } }, tAdm).id;
  const id11 = ok("survei.simpan", { data: { ...T11, buka: hari(0), tutup: hari(10) } }, tAdm).id;
  const idDraf = ok("survei.simpan", { data: { judul: "Draf hapus", tujuan: "lainnya", sasaran: ["dosen"], pertanyaan: [] } }, tAdm).id;
  cek("buka tanpa pertanyaan ditolak", /minimal satu pertanyaan/.test(salah("survei.status", { id: idDraf, aksi: "buka" }, tAdm)));
  ok("survei.status", { id: idDraf, aksi: "hapus" }, tAdm);
  cek("draf terhapus", !ok("survei.daftar", {}, tAdm).survei.some(s => s.id === idDraf));
  cek("draf belum terlihat responden", !ok("survei.saya", {}, tM).survei.some(s => s.id === id22));
  ok("survei.status", { id: id22, aksi: "buka" }, tAdm); ok("survei.status", { id: id11, aksi: "buka" }, tAdm);
  const s22 = ok("survei.daftar", {}, tAdm).survei.find(s => s.id === id22);
  cek("dibuka: target = mahasiswa aktif", s22.statusEfektif === "dibuka" && s22.target >= 2, s22);
  cek("survei dibuka tak bisa dihapus", /Hanya survei draf/.test(salah("survei.status", { id: id22, aksi: "hapus" }, tAdm)));
  ok("survei.simpan", { data: { id: id22, judul: "Kepuasan mahasiswa Ganjil", pertanyaan: [], sasaran: ["mahasiswa"], tutup: hari(12) } }, tAdm);
  const s22b = ok("survei.daftar", {}, tAdm).survei.find(s => s.id === id22);
  cek("setelah dibuka: hanya judul/periode berubah, pertanyaan tetap", s22b.judul === "Kepuasan mahasiswa Ganjil" && s22b.pertanyaan.length === 6 && s22b.tutup === hari(12));
  cek("setelah dibuka: tanggal dibuka tetap", s22b.buka === hari(0), s22b.buka);

  console.log("20. Survei: mengisi");
  cek("muncul di Beranda mahasiswa, tidak di dosen", ok("survei.saya", {}, tM).survei.some(s => s.id === id22) && !ok("survei.saya", {}, tDsn).survei.some(s => s.id === id22));
  cek("dosen tidak bisa mengambil survei mahasiswa", /tidak terbuka/.test(salah("survei.ambil", { id: id22 }, tDsn)));
  const soal = ok("survei.ambil", { id: id22 }, tM).survei.soal;
  const isi = (v) => Object.fromEntries(soal.filter(q => q.t === "likert").map(q => [q.id, v]));
  cek("wajib dijawab", /wajib dijawab/.test(salah("survei.jawab", { id: id22, jawaban: {} }, tM)));
  cek("nilai likert di luar 1–4 ditolak", /tidak valid/.test(salah("survei.jawab", { id: id22, jawaban: isi(5) }, tM)));
  ok("survei.jawab", { id: id22, jawaban: { ...isi(4), [soal[5].id]: "Perbanyak praktik GDS" } }, tM);
  cek("mengisi dua kali ditolak; hilang dari Beranda", /sudah mengisi/.test(salah("survei.jawab", { id: id22, jawaban: isi(4) }, tM)) && !ok("survei.saya", {}, tM).survei.some(s => s.id === id22));
  ok("survei.jawab", { id: id22, jawaban: isi(3) }, tM2);
  cek("v0.50.0: hasil survei anonim tertahan bila pengisi < 3", ok("survei.hasil", { id: id22 }, tAdm).tertahan === true);
  ok("admin.impor", { baris: [{ username: "259931", nama: "Mahasiswa Survei Tiga", masuk: 2025, kelas: "A" }] }, tAdm);
  const tM3 = ok("masuk", { username: "259931", sandi: "259931" }).token;
  ok("survei.jawab", { id: id22, jawaban: isi(0) }, tM3);   // "tidak tahu / tidak berlaku" pada semua butir: tidak ikut dihitung
  const rows = g.sheets.Jawaban.slice(1).filter(r => r[1] === id22), sv22 = g.sheets.Survei.find(r => r[0] === id22), iPg = g.sheets.Survei[0].indexOf("pengisi");
  cek("anonim (v0.50.0): baris jawaban tanpa id, kunci, dan jam; siapa yang mengisi hanya di daftar pengisi", rows.length === 3 && rows.every(r => r[2] === "" && r[3] === "" && !/T\d\d:/.test(r[5] instanceof Date ? "" : String(r[5])))
    && JSON.parse(sv22[iPg]).includes(ID("250103")), rows.map(r => r.slice(0, 4)));
  const kode = ok("survei.daftar", {}, tAdm).survei.find(s => s.id === id11).kode;
  cek("tautan publik tanpa login: kode salah ditolak", /tidak dikenal/.test(salah("survei.publik", { kode: "salah" })));
  const pub = ok("survei.publik", { kode }).survei;
  cek("tautan publik memuat 12 pertanyaan", pub.soal.length === 12 && !pub.anonim);
  const jp = (th, v) => Object.fromEntries(pub.soal.map((q, i) => [q.id, q.t === "likert" ? v : i === 3 ? th : q.t === "paragraf" ? "" : "Isi " + i]));
  cek("tahun lulus harus 4 angka", /tahun lulus 4 angka/.test(salah("survei.jawabPublik", { kode, jawaban: jp("24", 4) })));
  ok("survei.jawabPublik", { kode, jawaban: jp("2024", 4) }); ok("survei.jawabPublik", { kode, jawaban: jp("2024", 2) }); ok("survei.jawabPublik", { kode, jawaban: jp("2022", 3) });
  const n0 = g.sheets.Jawaban.length; ok("survei.jawabPublik", { kode, jawaban: jp("2024", 1), situs: "http://spam" });
  cek("isian jebakan robot diabaikan diam-diam", g.sheets.Jawaban.length === n0);
  cek("survei mahasiswa tidak bisa lewat tautan publik", /tidak dikenal/.test(salah("survei.publik", { kode: ok("survei.daftar", {}, tAdm).survei.find(s => s.id === id22).kode })));

  console.log("21. Survei: hasil dan Tabel 11/22");
  const H = ok("survei.hasil", { id: id22 }, tAdm);
  cek("hasil: rekap likert per tingkat + saran; 'tidak tahu' tidak dihitung", H.rekap[0].hitung.join() === "0,0,1,1" && H.rekap[0].rata === 3.5 && H.rekap[0].na === 1 && H.rekap[5].teksJawaban.includes("Perbanyak praktik GDS") && H.jawaban.length === 3, H.rekap[0]);
  cek("jawaban mentah anonim tanpa waktu dan nama (juga untuk KPS)", ok("survei.hasil", { id: id22 }, tKps).jawaban.every(j => !j.waktu && !j.nama));
  ok("survei.tindakLanjut", { id: id22, data: { 4: "Menambah 10 komputer laboratorium GDS pada 2027" } }, tAdm);
  const ts = Number(new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Makassar" }).slice(0, 4)) - (new Date().getMonth() < 6 ? 1 : 0);
  const I = ok("ilkps.data", { ts }, tAdm), T = Object.fromEntries(I.tabel.map(t => [t.kode, t]));
  cek("Tabel 22: aspek Tangible 50% sangat baik, 50% baik + tindak lanjut", JSON.stringify(T["22"].baris[4]) === JSON.stringify([5, "Tangible (sarana dan prasarana)", 50, 50, 0, 0, "Menambah 10 komputer laboratorium GDS pada 2027"]), T["22"].baris[4]);
  cek("Tabel 22: baris Jumlah", T["22"].baris[5][0] === "Jumlah" && T["22"].baris[5][2] === 250);
  cek("Tabel 11: Etika dari 3 pengguna (nilai 4, 2, 3 → 33,33% SB/B/Cukup)", JSON.stringify(T["11"].baris[0].slice(2, 6)) === JSON.stringify([33.33, 33.33, 33.33, 0]), T["11"].baris[0]);
  cek("urutan: 11 setelah ref11a, 22 setelah 21", I.tabel.map(t => t.kode).join().includes("ref11a,11,12") && I.tabel.map(t => t.kode).join().includes("21,22,23") && I.tabel.length === 33 && I.belum.length === 0);
  const R = ok("ilkps.data", { ts: 2026 }, tAdm).tabel.find(t => t.kode === "ref11a");
  cek("Ref 11a (TS 2026/2027): tanggapan lulusan 2024 = 2, 2022 = 1", R.baris[2][2] === 2 && R.baris[0][2] === 1, R.baris);
  ok("survei.status", { id: id11, aksi: "tutup" }, tAdm);
  cek("ditutup: tautan publik menolak dengan pesan jelas", /sudah ditutup/.test(salah("survei.publik", { kode })) && /tidak menerima/.test(salah("survei.jawabPublik", { kode, jawaban: jp("2024", 4) })));
  cek("buka lagi setelah ditutup", (ok("survei.status", { id: id11, aksi: "buka" }, tAdm), ok("survei.publik", { kode }).survei.judul.length > 0));
  cek("migrasi: tabel Survei dan Jawaban; SKEMA_VERSI 10", g.sheets.Survei && g.sheets.Jawaban && !!g.props.SKEMA_VERSI);
}
