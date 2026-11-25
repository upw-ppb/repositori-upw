// Uji v0.51.0: EDOM per mata kuliah/kelas/dosen (formulir per unit, anonim, PengisiSurvei, hasil pengelola, hasil pribadi dosen, batas 5 pengisi)
// dan tracer study → Data Prodi › Lulusan (pratinjau, terapkan, timpa, lulusan terlacak). Data mahasiswa/lulusan di sini buatan.
import fs from "node:fs";
export async function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tSA }) {
  console.log("67. EDOM per kelas/dosen dan tracer → Lulusan");
  const C = g.ctx, T = ok("survei.daftar", {}, tAdm).templat, kini = ok("mkp.saya", {}, tDsn).semester, th = Number(kini.slice(0, 4)), ganjil = /-1$/.test(kini);
  const smtMk = 2 * (th - 2025) + (ganjil ? 1 : 2);   // semester MK yang diambil angkatan 2025 (tM)
  const dsn = ID("199001152015041001"), kps = ID("197911302005012001");
  ok("dp.mkSimpan", { daftar: [{ kode: "UPW551", nama: "Mata Kuliah EDOM Satu", semester: smtMk, sksKuliah: 2 }, { kode: "UPW552", nama: "Mata Kuliah EDOM Dua", semester: smtMk, sksKuliah: 2 }] }, tAdm);
  ok("dp.timSimpan", { semester: kini, kodeMk: "UPW551", anggota: [{ t: "u", id: dsn }, { t: "u", id: kps }] }, tAdm);
  ok("dp.timSimpan", { semester: kini, kodeMk: "UPW552", anggota: [{ t: "u", id: kps }] }, tAdm);
  cek("templat EDOM: butir per mata kuliah dan per pengajar, semuanya berpenjelasan", T.edom && T.edom.pertanyaan.filter(q => q.lev === "dosen").length >= 6 && T.edom.pertanyaan.filter(q => q.lev === "mk" && q.t === "likert").length >= 6
    && T.edom.pertanyaan.filter(q => q.t === "likert").every(q => q.jelas && q.var && q.ind) && T.edom.anonim);
  const aktifkan = nim => { const r = C.cari("Pengguna", x => String(x.username) === nim); C.ubah("Pengguna", r, { status: "aktif", wajibGanti: false }); C._isi = {}; };
  const tok = [tM];
  for (let i = 0; i < 5; i++) { const nim = "25997" + i; ok("admin.impor", { baris: [{ username: nim, nama: "Mhs EDOM " + i, masuk: 2025, kelas: "A" }] }, tAdm); tok.push(ok("masuk", { username: nim, sandi: nim }).token); aktifkan(nim); }
  const hari = n => new Date(Date.now() + n * 864e5).toLocaleDateString("sv-SE", { timeZone: "Asia/Makassar" });
  const id = ok("survei.simpan", { data: { ...T.edom, judul: "EDOM uji", buka: hari(0), tutup: hari(10), anonim: false } }, tKps).id;
  ok("survei.status", { id, aksi: "buka" }, tKps);
  const sv = ok("survei.daftar", {}, tAdm).survei.find(s => s.id === id), pgRows = g.sheets.PengisiSurvei.slice(1).filter(r => r[0] === id);
  cek("EDOM selalu anonim; semester dari tanggal dibuka; baris pengisi dibuat sekaligus urut id saat dimulai", sv.anonim === true && sv.meta.semester === kini && pgRows.length >= 6 && pgRows.map(r => r[1]).join() === pgRows.map(r => r[1]).sort().join());
  cek("survei biasa tidak bisa dipakai untuk EDOM", /formulir EDOM/.test(salah("survei.ambil", { id }, tM)) && ok("survei.saya", {}, tM).survei.find(s => s.id === id).edom === true);
  const A = ok("survei.edomAmbil", { id }, tM).survei, u1 = A.unit.find(u => u.u === "UPW551|A"), u2 = A.unit.find(u => u.u === "UPW552|A");
  cek("mahasiswa melihat mata kuliahnya beserta pengajar tiap kelas", u1 && u2 && u1.pengajar.length === 2 && u1.pengajar[0].k === "u:" + dsn && u1.pengajar[0].utama && u2.pengajar.length === 1 && A.soalMk.length >= 7 && A.soalDosen.length >= 6);
  const isiMk = v => Object.fromEntries(A.soalMk.filter(q => q.t === "likert").map(q => [q.id, v]).concat(A.soalMk.filter(q => q.t === "paragraf").map(q => [q.id, "Saran " + v])));
  const isiDs = v => Object.fromEntries(A.soalDosen.map(q => [q.id, v]));
  cek("penilaian pengajar wajib (pesan menyebut nama pengajar); unit di luar mata kuliahnya ditolak", /Komang|KPS|Widiastuti|wajib/.test(salah("survei.edomJawab", { id, u: "UPW551|A", mk: isiMk(3), d: { ["u:" + dsn]: isiDs(3) } }, tM))
    && /tidak termasuk/.test(salah("survei.edomJawab", { id, u: "UPW551|B", mk: isiMk(3), d: {} }, tM)));
  const logAwal = g.sheets.Log.length;
  tok.forEach((t, i) => ok("survei.edomJawab", { id, u: "UPW551|A", mk: isiMk(i < 3 ? 4 : 3), d: { ["u:" + dsn]: isiDs(i < 3 ? 4 : 2), ["u:" + kps]: isiDs(3) } }, t));
  ok("survei.edomJawab", { id, u: "UPW552|A", mk: isiMk(2), d: { ["u:" + kps]: isiDs(2) } }, tM);
  const kol = g.sheets.Jawaban[0], rows = g.sheets.Jawaban.slice(1).filter(r => r[kol.indexOf("survei")] === id);
  cek("jawaban EDOM per kelas: tanpa id/kunci/jam, tanpa catatan Log", rows.length === 7 && rows.every(r => r[kol.indexOf("userId")] === "" && r[kol.indexOf("kunci")] === "" && JSON.parse(r[kol.indexOf("jawaban")]).u)
    && !g.sheets.Log.slice(logAwal).some(r => /survei\.(edom)?[jJ]awab/.test(r[2])));
  cek("mata kuliah yang sama tidak bisa dinilai dua kali", /sudah Anda nilai/.test(salah("survei.edomJawab", { id, u: "UPW551|A", mk: isiMk(3), d: { ["u:" + dsn]: isiDs(3), ["u:" + kps]: isiDs(3) } }, tM)));
  const H = ok("survei.edomHasil", { id }, tKps), h1 = H.unit.find(u => u.u === "UPW551|A"), h2 = H.unit.find(u => u.u === "UPW552|A");
  cek("hasil per kelas: 6 pengisi terlihat (rata-rata MK, per pengajar, saran acak); kelas dengan 1 pengisi disembunyikan", h1.n === 6 && !h1.tersembunyi && h1.pengajar.length === 2 && h1.mk.rata > 3 && h1.saran.length === 6 && h2.tersembunyi === true && !h2.mk);
  const pd = H.pengajar.find(p => p.k === "u:" + dsn);
  cek("hasil per pengajar: rata-rata per variabel dan butir; dosen (4,4,4,2,2,2) = 3", pd.n === 6 && pd.rata === 3 && pd.variabel.length >= 4 && pd.butir.length === A.soalDosen.length);
  cek("hasil EDOM hanya untuk pengelola", /izin/.test(salah("survei.edomHasil", { id }, tDsn)) && !!salah("survei.edomHasil", { id }, tM));
  const E = ok("edom.saya", {}, tDsn).edom.find(x => x.id === id);
  cek("dosen melihat hasil dirinya saja di kelas yang ia ajar (tidak melihat pengajar lain, tidak melihat kelas yang tidak ia ajar)", E && E.diri.rata === 3 && E.unit.length === 1 && E.unit[0].u === "UPW551|A" && E.unit[0].pengajar.length === 1 && E.unit[0].pengajar[0].k === "u:" + dsn);
  cek("mahasiswa tidak bisa membuka hasil dosen", !!salah("edom.saya", {}, tM));
  // selesai semua unit → masuk daftar pengisi
  const sisa = ok("survei.edomAmbil", { id }, tM).survei.unit.filter(u => !u.selesai);
  sisa.forEach(u => ok("survei.edomJawab", { id, u: u.u, mk: isiMk(3), d: Object.fromEntries(u.pengajar.map(p => [p.k, isiDs(3)])) }, tM));
  const P = ok("survei.pengisi", { id }, tKps), saya = P.orang.find(o => o.id === ID("250103")), lain = P.orang.find(o => o.username === "259970");
  cek("semua mata kuliah dinilai → tercatat sudah mengisi; yang lain tampil jumlah MK yang sudah dinilai", saya.sudah === true && lain.sudah === false && lain.mkDinilai === 1 && !ok("survei.saya", {}, tM).survei.some(s => s.id === id));
  const J = ok("survei.jadwal", {}, tAdm).jadwal;
  cek("jadwal memuat EDOM tengah semester (minggu 7–8)", J.some(x => x.k === "edom1"));
  const e1 = J.find(x => x.k === "edom1");
  if (e1 && !e1.surveiId) { const sp = ok("survei.siapkan", { kunci: e1.kunci }, tAdm), d1 = ok("survei.daftar", {}, tAdm).survei.find(s => s.id === sp.id);
    cek("Siapkan EDOM: draf anonim dengan semester dari jadwal", d1.tujuan === "edom" && d1.anonim && d1.meta.semester === e1.kunci.slice(-6)); }

  // --- tracer → Lulusan
  const idT = ok("survei.simpan", { data: { ...T.tracer, judul: "Tracer terapkan", buka: hari(0), tutup: hari(10) } }, tAdm).id; ok("survei.status", { id: idT, aksi: "buka" }, tAdm);
  const kode = ok("survei.daftar", {}, tAdm).survei.find(s => s.id === idT).kode, soal = ok("survei.publik", { kode }).survei.soal, q = ind => T.tracer.pertanyaan.findIndex(x => x.ind === ind);
  const jawabT = (nim, f502, f14, f5d) => { const j = {}; soal.forEach((s, i) => { const t = T.tracer.pertanyaan[i]; if (!s.wajib) return; j[s.id] = s.t === "pilihan" ? s.opsi[0] : t.ind === "THNLULUS" ? "2024" : t.ind === "NIMHSMSMH" ? nim : "isi"; });
    const set = (ind, v) => { if (v !== undefined) j[soal[q(ind)].id] = v; }; set("F502", f502); set("F14", f14); set("F5D", f5d); return j; };
  const lulRow = nim => g.sheets.Lulusan.slice(1).find(r => String(r[0]) === nim), kl = g.sheets.Lulusan[0];
  C.ubah("Lulusan", C.cari("Lulusan", x => String(x.nim) === "L3"), { wtBulan: 5 }); C._isi = {};
  ok("survei.jawabPublik", { kode, jawaban: jawabT("L1", "2 bulan", "Erat", "Nasional") });
  ok("survei.jawabPublik", { kode, jawaban: jawabT("L2", "4 bulan", "Sangat erat", "Lokal/wilayah") });
  ok("survei.jawabPublik", { kode, jawaban: jawabT("L2", "Lebih dari 12 bulan", "Kurang erat", "Multinasional/internasional") });
  ok("survei.jawabPublik", { kode, jawaban: jawabT("L3", "1 bulan", "Cukup erat", "Lokal/wilayah") });
  ok("survei.jawabPublik", { kode, jawaban: jawabT("X999", "0 (sudah bekerja sebelum/saat lulus)", "Erat", "Nasional") });
  const PV = ok("survei.tracerTerapkan", { id: idT }, tKps), b = nim => PV.baris.find(x => x.nim === nim);
  cek("pratinjau tracer: jawaban terakhir per NIM, pemetaan waktu tunggu/kesesuaian/tempat kerja, NIM tak dikenal, data berbeda; belum menulis", PV.baris.length === 4 && b("L1").usulan.wtBulan === 2 && b("L1").usulan.kesesuaian === "Tinggi"
    && b("L1").usulan.tempatKerja.startsWith("Nasional") && b("L2").usulan.wtBulan === 15 && b("L2").usulan.kesesuaian === "Rendah" && b("L2").usulan.tempatKerja.startsWith("Multinasional")
    && b("X999").hasil === "tidak ditemukan" && b("L3").hasil === "berbeda" && b("L3").usulan.kesesuaian === "Sedang" && PV.diterapkan === 0 && lulRow("L1")[kl.indexOf("wtBulan")] === "");
  cek("terapkan tracer: hanya pengelola", /izin/.test(salah("survei.tracerTerapkan", { id: idT }, tDsn)) && /tracer study/.test(salah("survei.tracerTerapkan", { id }, tKps)));
  ok("survei.tracerTerapkan", { id: idT, simpan: true }, tAdm);
  cek("terapkan tanpa timpa: isian kosong diisi, waktu tunggu lama L3 (5) tetap, tanda tracer terisi", Number(lulRow("L1")[kl.indexOf("wtBulan")]) === 2 && Number(lulRow("L3")[kl.indexOf("wtBulan")]) === 5
    && lulRow("L3")[kl.indexOf("kesesuaian")] === "Sedang" && !!lulRow("L1")[kl.indexOf("tracer")]);
  ok("survei.tracerTerapkan", { id: idT, simpan: true, timpa: true }, tAdm);
  const LD = ok("lul.data", {}, tAdm).lulusan;
  cek("timpa: waktu tunggu L3 menjadi 1; lulusan yang menjawab tercatat terlacak", Number(lulRow("L3")[kl.indexOf("wtBulan")]) === 1 && ["L1", "L2", "L3"].every(n => LD.find(x => x.nim === n).terlacak));
  const app = fs.readFileSync("web/aplikasi.js", "utf8");
  cek("tampilan: formulir EDOM per mata kuliah, hasil per pengajar/kelas, panel EDOM di Mata Kuliah Saya, terapkan tracer", /function laciSvEdom\(/.test(app) && /function laciSvEdomHasil/.test(app) && /\$\{panelEdomSaya\(\)\}/.test(app) && /function laciSvTracer/.test(app) && /svEdomBuka/.test(app));
}
