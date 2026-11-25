// Uji v0.50.0: templat survei komprehensif (penjelasan, variabel, indikator), anonimitas sungguhan (daftar pengisi terpisah, jawaban tanpa kunci/jam,
// migrasi data lama), target responden (rumus instrumen dan Slovin), daftar sudah/belum mengisi + pengingat, jadwal survei + Siapkan, analisis
// (Cronbach α, IPA, perbandingan kelompok, NPS), hak KPS.
import fs from "node:fs";
export async function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tSA }) {
  console.log("66. Survei komprehensif, anonimitas, jadwal, analisis");
  const C = g.ctx, T = ok("survei.daftar", {}, tAdm).templat;
  const nama = ["t22", "t11", "tracer", "layanan", "dosen", "tendik", "mitra", "exit", "kurikulum"];
  cek("9 templat; setiap butir skala punya penjelasan, variabel, dan kode indikator unik; semua pertanyaan pilihan berkode", nama.every(k => T[k]) && nama.every(k => T[k].pertanyaan.filter(q => q.t !== "paragraf").every(q => q.ind)) && nama.every(k => {
    const L = T[k].pertanyaan.filter(q => q.t === "likert"), ids = T[k].pertanyaan.map(q => q.ind).filter(Boolean);
    return L.every(q => q.jelas && q.var && q.ind) && new Set(ids).size === ids.length && T[k].pertanyaan.length <= 60 && T[k].meta.pengantar; }));
  cek("Tabel 22: 5 aspek, ≥ 4 butir per aspek; Tabel 11: 7 aspek, ≥ 3 butir per aspek; ada butir kepentingan (IPA), kelompok, dan NPS", [0, 1, 2, 3, 4].every(a => T.t22.pertanyaan.filter(q => q.aspek === a).length >= 4)
    && [0, 1, 2, 3, 4, 5, 6].every(a => T.t11.pertanyaan.filter(q => q.aspek === a).length >= 3) && T.t22.pertanyaan.some(q => q.pent) && T.t22.pertanyaan.some(q => q.seg) && T.t22.pertanyaan.some(q => q.nps));
  cek("tracer study memuat pertanyaan inti (F8 status, F502 waktu tunggu, F5D tingkat tempat kerja, F14 kesesuaian) dan identitas", ["F8", "F502", "F5D", "F14", "F1101", "NIMHSMSMH"].every(i => T.tracer.pertanyaan.some(q => q.ind === i))
    && !T.tracer.anonim && T.tracer.pertanyaan.some(q => q.peran === "tahunLulus"));
  cek("survei identitas (tracer, pengguna, mitra, kurikulum) tidak anonim; survei internal anonim", !T.t11.anonim && !T.mitra.anonim && !T.kurikulum.anonim && T.t22.anonim && T.dosen.anonim && T.tendik.anonim && T.layanan.anonim && T.exit.anonim);
  cek("survei anonim tidak boleh memuat pertanyaan tahun lulus", /anonim tidak boleh/.test(salah("survei.simpan", { data: { ...T.t11, anonim: true, buka: "", tutup: "" } }, tAdm)));
  cek("KPS boleh membuat survei; dosen tidak", !!ok("survei.simpan", { data: { ...T.dosen, judul: "Uji KPS", buka: "", tutup: "" } }, tKps).id && /izin/.test(salah("survei.simpan", { data: T.dosen }, tDsn)));

  // --- isi survei t22 komprehensif oleh beberapa mahasiswa
  const hari = n => new Date(Date.now() + n * 864e5).toLocaleDateString("sv-SE", { timeZone: "Asia/Makassar" });
  const id = ok("survei.simpan", { data: { ...T.t22, judul: "Kepuasan uji v50", buka: hari(0), tutup: hari(10) } }, tAdm).id;
  ok("survei.status", { id, aksi: "buka" }, tAdm);
  const S0 = ok("survei.ambil", { id }, tM).survei;
  cek("responden menerima pengantar, arti skala, penjelasan, label kepentingan, dan pilihan tidak tahu", S0.pengantar.includes("ANONIM") && S0.skala.length === 4 && S0.soal.some(q => q.jelas && q.bagian) && S0.soal.some(q => q.lab === "penting") && S0.soal.some(q => q.na) && S0.label.penting.length === 4);
  const L = S0.soal.filter(q => q.t === "likert"), seg = S0.soal.find(q => q.opsi && q.opsi[0] === "Semester 1–2"), nps = S0.soal.find(q => q.opsi && q.opsi.length === 11);
  const jaw = (v, grup, n) => Object.assign(Object.fromEntries(L.map((q, i) => [q.id, q.na && i % 7 === 0 ? 0 : Math.max(1, Math.min(4, v + (i % 2)))])), { [seg.id]: grup, [nps.id]: String(n) });
  const tok = [tM];
  const aktifkan = nim => { const r = C.cari("Pengguna", x => String(x.username) === nim); C.ubah("Pengguna", r, { status: "aktif", wajibGanti: false }); C._isi = {}; };
  for (let i = 0; i < 6; i++) { ok("admin.impor", { baris: [{ username: "25995" + i, nama: "Mahasiswa V50 " + i, masuk: 2025, kelas: i % 2 ? "B" : "A" }] }, tAdm); tok.push(ok("masuk", { username: "25995" + i, sandi: "25995" + i }).token); aktifkan("25995" + i); }
  const logAwal = g.sheets.Log.length;
  tok.forEach((t, i) => ok("survei.jawab", { id, jawaban: jaw(i < 5 ? 3 : 2, i < 5 ? "Semester 3–4" : "Semester 7–8", i < 4 ? 10 : 5) }, t));
  const kol = g.sheets.Jawaban[0], rows = g.sheets.Jawaban.slice(1).filter(r => r[kol.indexOf("survei")] === id);
  cek("anonim: tidak ada id, kunci, atau jam di baris jawaban; tidak ada catatan Log per pengisian", rows.length === 7 && rows.every(r => r[kol.indexOf("userId")] === "" && r[kol.indexOf("kunci")] === "")
    && rows.every(r => { const w = r[kol.indexOf("waktu")]; return w instanceof Date ? w.getUTCHours() === 16 || w.getHours() === 0 : /^\d{4}-\d{2}-\d{2}$/.test(String(w)); })
    && !g.sheets.Log.slice(logAwal).some(r => r[2] === "survei.jawab"));
  const sv = g.sheets.Survei.find(r => r[0] === id), pg = JSON.parse(sv[g.sheets.Survei[0].indexOf("pengisi")]);
  cek("daftar pengisi urut abjad (tanpa urutan waktu), dipakai mencegah mengisi dua kali", pg.length === 7 && pg.join() === [...pg].sort().join() && /sudah mengisi/.test(salah("survei.jawab", { id, jawaban: jaw(3, "Semester 1–2", 9) }, tM)));
  // --- daftar pengisi + pengingat
  const P = ok("survei.pengisi", { id }, tKps);
  cek("daftar sudah/belum mengisi: tanpa jawaban; yang belum di atas", P.sudah === 7 && P.total >= 8 && P.orang.every(o => !("jawaban" in o)) && P.orang[0].sudah === false && /izin/.test(salah("survei.pengisi", { id }, tDsn)));
  ok("admin.impor", { baris: [{ username: "259959", nama: "Mahasiswa Belum Isi", masuk: 2025, kelas: "A" }] }, tAdm);
  const tBelum = ok("masuk", { username: "259959", sandi: "259959" }).token; aktifkan("259959");
  const I1 = ok("survei.ingatkan", { id }, tAdm), I2 = ok("survei.ingatkan", { id }, tAdm);
  const pgAda = () => g.sheets.Pengingat.slice(1).filter(r => r[1] === C.cari("Pengguna", x => String(x.username) === "259959").id && r[4] === "survei:" + id);
  cek("pengingat Beranda ke yang belum mengisi, tidak dikirim dua kali; muncul di Perlu tindakan", I1.terkirim >= 1 && I2.terkirim === 0 && pgAda().length === 1 && ok("tugas.saya", {}, tBelum).pengingat.some(x => /Mohon isi survei/.test(x.pesan)));
  ok("survei.jawab", { id, jawaban: jaw(4, "Semester 1–2", 9) }, tBelum);
  cek("pengingat selesai otomatis setelah mengisi", pgAda().every(r => r[6]) && !ok("tugas.saya", {}, tBelum).pengingat.some(x => /Mohon isi survei/.test(x.pesan)));
  // --- hasil dan analisis
  const H = ok("survei.hasil", { id }, tKps), A = H.analisis;
  cek("analisis per variabel: rata-rata, SD, % puas, indeks, Cronbach α", A.variabel.length >= 5 && A.variabel.every(v => v.rata >= 1 && v.rata <= 4 && v.indeks >= 0 && v.indeks <= 100) && A.variabel.some(v => v.alpha && typeof v.alpha.alpha === "number") && A.keseluruhan.indeks > 0);
  cek("'tidak tahu' tidak dihitung dalam rata-rata", H.rekap.some(q => q.t === "likert" && q.na > 0) && H.rekap.filter(q => q.t === "likert").every(q => q.hitung.reduce((a, b) => a + b, 0) === q.n));
  cek("IPA: kepentingan × kinerja per dimensi dengan kuadran", A.ipa.length === 5 && A.ipa.every(r => /^(I|II|III|IV) /.test(r.kuadran)));
  const ipaUji = C.analisisSurvei({ anonim: true, pertanyaan: [{ id: "a", t: "likert", "var": "X", ind: "a" }, { id: "b", t: "likert", "var": "Y", ind: "b" }, { id: "pa", t: "likert", "var": "K", pent: "X" }, { id: "pb", t: "likert", "var": "K", pent: "Y" }] },
    [{ a: 3, b: 2, pa: 4, pb: 4 }, { a: 3, b: 2, pa: 3, pb: 3 }, { a: 4, b: 1, pa: 4, pb: 4 }].map(o => ({ jawaban: JSON.stringify(o) }))).ipa;
  cek("IPA: kepentingan sama persis → keduanya kuadran atas (I/II), kinerja rendah = I Prioritas utama", ipaUji.find(r => r.var === "X").kuadran === "II Pertahankan" && ipaUji.find(r => r.var === "Y").kuadran === "I Prioritas utama");
  const kel = A.kelompok[0].isi;
  cek("perbandingan kelompok: kelompok < 5 pengisi disembunyikan", kel.find(x => x.opsi === "Semester 3–4").n === 5 && !kel.find(x => x.opsi === "Semester 3–4").tersembunyi && kel.find(x => x.opsi === "Semester 7–8").tersembunyi === true);
  cek("NPS dihitung (promotor 9–10, detraktor 0–6)", A.nps[0].n === 8 && A.nps[0].promotor === 62.5 && A.nps[0].detraktor === 37.5 && A.nps[0].nps === 25);
  cek("data mentah anonim: tanpa waktu/nama", H.jawaban.length === 8 && H.jawaban.every(j => !j.waktu && !j.nama));
  // --- target responden
  const s1 = ok("survei.daftar", {}, tAdm).survei.find(s => s.id === id);
  cek("target internal: Slovin (galat 5%) dan ideal 70% (tidak di bawah minimal) dari populasi sasaran", s1.sasaranTarget.populasi >= 9 && s1.sasaranTarget.min === Math.ceil(s1.sasaranTarget.populasi / (1 + s1.sasaranTarget.populasi * 0.0025)) && s1.sasaranTarget.ideal === Math.max(s1.sasaranTarget.min, Math.ceil(s1.sasaranTarget.populasi * 0.7)));
  const ts = C.tsAwal(), tglL = th => new Date(th + "-09-15T00:00:00+08:00");
  const lul = []; for (let i = 0; i < 150; i++) lul.push({ nim: "L" + i, nama: "Lulusan " + i, masuk: ts - 7, tglLulus: tglL(ts - 4 + (i % 3)), ipk: 3.4 });
  lul.forEach(o => g.sheets.Lulusan.push(C.barisDari("Lulusan", o).map(v => typeof v === "string" && v.startsWith("'") ? v.slice(1) : v))); C._isi = {};
  const idT = ok("survei.simpan", { data: { ...T.tracer, judul: "Tracer uji", buka: "", tutup: "" } }, tAdm).id;
  const tt = ok("survei.daftar", {}, tAdm).survei.find(s => s.id === idT).sasaranTarget;
  cek("target tracer: lulusan TS-4 s.d. TS-2 = 150 → minimal 50% − (150 ÷ 300 × 20%) = 40% → 60 alumni", tt.populasi >= 150 && tt.min === Math.ceil(tt.populasi * (0.5 - tt.populasi / 300 * 0.2)) && (tt.populasi !== 150 || tt.min === 60));
  // --- jadwal survei
  const J0 = ok("survei.jadwal", {}, tKps);
  cek("jadwal: kalender bawaan Ganjil 09-01 / Genap 02-01; dosen tidak melihat", J0.kalender.ganjil === "09-01" && J0.kalender.genap === "02-01" && /izin/.test(salah("survei.jadwal", {}, tDsn)));
  const kini = C.hariIni(), bln = kini.slice(5, 7), thn = kini.slice(0, 4);
  // atur kalender agar minggu 7–8 jatuh hari ini: mulai kuliah = hari ini − 45 hari (dalam semester yang sama)
  const mulai = new Date(Date.now() - 45 * 864e5).toLocaleDateString("sv-SE", { timeZone: "Asia/Makassar" }), ganjilKini = Number(bln) >= 7;
  const J1 = ok("survei.kalender", ganjilKini ? { ganjil: mulai.slice(5), genap: "02-01" } : { ganjil: "09-01", genap: mulai.slice(5) }, tAdm);
  const kmhs = J1.jadwal.find(x => x.k === "kmhs1" && x.status === "sekarang");
  cek("rekomendasi kepuasan mahasiswa minggu 7–8 muncul saat waktunya", !!kmhs && kmhs.mulai <= kini && kini <= kmhs.selesai);
  cek("kalender tidak sah ditolak", /BB-TT/.test(salah("survei.kalender", { ganjil: "9-1", genap: "02-01" }, tAdm)) && /Ganjil dimulai/.test(salah("survei.kalender", { ganjil: "02-01", genap: "09-01" }, tAdm)));
  const sp = ok("survei.siapkan", { kunci: kmhs.kunci }, tKps), dr = ok("survei.daftar", {}, tAdm).survei.find(s => s.id === sp.id);
  cek("Siapkan survei: draf dari templat dengan sasaran, anonim, tanggal, dan penanda jadwal", dr.status === "draf" && dr.tujuan === "t22" && dr.anonim && dr.sasaran.join() === "mahasiswa" && dr.buka === kini && dr.tutup === kmhs.selesai && dr.meta.jadwal === kmhs.kunci && dr.pertanyaan.length === T.t22.pertanyaan.length);
  cek("Siapkan lagi mengembalikan draf yang sama; status jadwal menjadi draf", ok("survei.siapkan", { kunci: kmhs.kunci }, tAdm).id === sp.id && ok("survei.jadwal", {}, tAdm).jadwal.find(x => x.kunci === kmhs.kunci).status === "draf");
  ok("survei.status", { id: sp.id, aksi: "buka" }, tKps);
  cek("setelah dimulai: status jadwal berjalan dan survei muncul di Beranda mahasiswa", ok("survei.jadwal", {}, tAdm).jadwal.find(x => x.kunci === kmhs.kunci).status === "berjalan" && ok("survei.saya", {}, tBelum).survei.some(s => s.id === sp.id));
  const tj = ok("survei.jadwalSelesai", { kunci: kmhs.kunci }, tAdm);
  cek("tandai selesai menghilangkan kartu", !tj.jadwal.some(x => x.kunci === kmhs.kunci));
  // --- migrasi data lama (VERSI_SKEMA 31 → 32): jawaban anonim lama berkunci + jam
  const idLama = "sLAMA" + Date.now(), kolS = g.sheets.Survei[0], pgId = ID("250103");
  const baris = kolS.map(k => ({ id: idLama, judul: "Survei lama", tujuan: "t22", sasaran: '["mahasiswa"]', anonim: true, status: "ditutup", pertanyaan: "[]", kode: "x", tindakLanjut: "{}", dibuat: new Date(), oleh: "", diubah: "", dihapus: "", pengisi: "", meta: "" }[k] ?? ""));
  g.sheets.Survei.push(baris);
  g.sheets.Jawaban.push(kol.map(k => ({ id: "jL1", survei: idLama, userId: "", kunci: C.hashToken("survei:" + idLama + ":" + pgId), jawaban: "{}", waktu: new Date("2026-03-02T09:41:00+08:00") }[k] ?? "")));
  C._isi = {}; C.migrasiSurveiAnonim(); C._isi = {};
  const sl = g.sheets.Survei.find(r => r[0] === idLama), jl = g.sheets.Jawaban.slice(1).find(r => r[kol.indexOf("survei")] === idLama);
  cek("migrasi: pengisi diisi dari kunci lama, lalu kunci dan jam jawaban anonim dihapus", JSON.parse(sl[kolS.indexOf("pengisi")]).join() === pgId && jl[kol.indexOf("kunci")] === ""
    && !(jl[kol.indexOf("waktu")] instanceof Date && jl[kol.indexOf("waktu")].getUTCMinutes() === 41));
  // --- tampilan
  const app = fs.readFileSync("web/aplikasi.js", "utf8");
  cek("tampilan: penjelasan, judul bagian, pilihan tidak tahu, pengantar/arti skala, daftar pengisi, jadwal di Beranda, analisis", /class="sv-jelas"/.test(app) && /class="sv-bagian"/.test(app) && /Tidak tahu \/ tidak berlaku/.test(app)
    && /function kepalaSurvei/.test(app) && /function laciSvPengisi/.test(app) && /panelJadwalSurvei\(true\)/.test(app) && /function htmlAnalisis/.test(app) && /Simpan &amp; mulai survei|Simpan & mulai survei/.test(app));
}
