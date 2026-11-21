// Ukur beban data: bagaimana waktu kerja server dan ukuran jawaban tumbuh bila data prodi sudah 1, 3, dan 5 tahun.
// Menjalankan kode server asli (gas/*.js) di tiruan Apps Script, mengisi data tiruan dengan volume realistis prodi UPW, lalu mengukur aksi tiap halaman.
// Jalankan dari folder hasil `jalankan.sh siapkan` (berisi gas/): node ukur-beban.mjs gas
// Catatan: waktu di sini = kerja kode di Node. Di Apps Script asli tambahkan biaya tetap ±1,5–2,6 dtk per permintaan, membaca Google Sheets
// (sebanding jumlah sel yang dibaca), dan JavaScript Apps Script yang beberapa kali lebih lambat dari Node.
import { buatGas } from "./gas-tiruan.mjs";

const GAS = process.argv[2] || "gas", TAHUN = (process.argv[3] || "0,1,3,5").split(",").map(Number);
const VOL = { mhsPerAngkatan: 75, dosen: 20, tendik: 5, kegiatanPerTahun: 1200, logPerTahun: 60000, sesiPerTahun: 12000, jawabanPerTahun: 2400, mk: 49 };

function siapkan() {
  const g = buatGas(GAS), ok = (a, d, t) => { const j = g.panggil(a, d, t); if (!j.ok) throw new Error(a + ": " + j.galat); return j; }, SANDI = "Uji12345a";
  const s = ok("siapkan", { lingkungan: "uji" }); let t = ok("masuk", { username: s.superadmin, sandi: s.sandiAwal }).token; ok("ganti.sandi", { sandiBaru: SANDI }, t);
  const BIO = { jk: "Perempuan", statusPeg: "PNS", statusDosen: "Dosen tetap program studi (DTPS)", jabfung: "Lektor", hp: "081234567890", tampilHp: "Tidak", jabTendik: "Staf", pendTerakhir: "S1",
    tmplahir: "Gianyar", tgllahir: "2007-05-12", alamat: "Jl. Uji", prov: "Bali", kab: "Kab. Gianyar", provsek: "Bali", kabsek: "Kab. Gianyar", sekolah: "SMK 1" };
  const aktif = (u, e) => { const tk = ok("masuk", { username: u, sandi: u }).token; ok("aktivasi.sandi", { sandiBaru: SANDI }, tk); ok("aktivasi.verifikasi", { kode: ok("aktivasi.kirimKode", { email: e }, tk).kodeUji }, tk);
    const bs = ok("biodata.saya", {}, tk).biodata, isi = { nama: bs.data.nama }; bs.skema.flatMap(x => x.f).filter(f => f.req && f.t !== "ro").forEach(f => { isi[f.k] = f.t === "sel" ? (f.o.includes(BIO[f.k]) ? BIO[f.k] : f.o[0]) : (BIO[f.k] ?? "Isi uji"); });
    isi.nama = bs.data.nama; ok("biodata.simpan", { data: isi }, tk); };
  ["197911302005012001", "199001152015041001", "pppk-2021-0107", "250103"].forEach((u, i) => aktif(u, "a" + i + "@contoh.id"));
  const T = u => ok("masuk", { username: u, sandi: SANDI }).token;
  const X = { g, ok, tSA: T("superadmin.uji"), tKps: T("197911302005012001"), tDsn: T("199001152015041001"), tAdm: T("pppk-2021-0107"), tM: T("250103") };
  // kegiatan contoh (bahan salinan) dengan bukti, disetujui Admin
  const setuju = (data, tok, peran) => { const k = ok("kegiatan.simpan", { peran, data: Object.assign({ perluST: false, tingkat: "Nasional", tgl: "2025-10-10" }, data) }, tok).kegiatan;
    k.slot.filter(s => !s.opsional).forEach(s => ok("bukti.unggah", { id: k.id, slot: s.k, ket: "Ada di arsip prodi" }, tok)); ok("kegiatan.ajukanData", { id: k.id }, tok);
    ok("verifikasi.putuskan", { id: k.id, keputusan: "disetujui" }, X.tAdm); };
  setuju({ jenis: "penelitian", judul: "Pola perjalanan wisatawan muda", isian: { "Sumber dana": "PT / mandiri" } }, X.tDsn, "dosen");
  setuju({ jenis: "pkm", judul: "Pendampingan Pokdarwis" }, X.tDsn, "dosen");
  setuju({ jenis: "rekognisi", judul: "Narasumber konferensi", isian: { "Bentuk rekognisi": "Keynote / invited speaker" } }, X.tDsn, "dosen");
  try { const sv = ok("survei.simpan", { data: { judul: "Kepuasan mahasiswa", tujuan: "t22", sasaran: ["mahasiswa"], anonim: true, templat: "t22" } }, X.tAdm); ok("survei.status", { id: sv.survei.id, status: "dibuka" }, X.tAdm); } catch (_) {}
  return X;
}

// Tambah baris tiruan ke sheet memakai kolom asli (barisDari) supaya bentuknya sama dengan data sungguhan.
function isi(g, tahun, X) {
  const C = g.ctx, tambah = (nama, objs) => { const sh = g.sheets[nama]; objs.forEach(o => sh.push(C.barisDari(nama, o).map(v => typeof v === "string" && v.startsWith("'") ? v.slice(1) : v))); C._isi = {}; };
  const pengguna = C.semua("Pengguna"), contohM = pengguna.find(p => String(p.username) === "250103"), contohD = pengguna.find(p => String(p.username) === "199001152015041001");
  const bioM = C.semua("BiodataMahasiswa")[0], bioP = C.semua("BiodataPegawai")[0];
  const kini = 2026, mhs = [], dsn = [contohD.id];
  // mahasiswa: angkatan kini-tahun-3 .. kini (4 angkatan aktif + lulusan selama periode)
  for (let a = kini - tahun - 3; a <= kini; a++) for (let i = 0; i < VOL.mhsPerAngkatan; i++) {
    const id = "m" + a + "-" + i; mhs.push(id);
    const p = Object.assign({}, contohM, { id, username: String(a).slice(2) + "01" + String(i).padStart(3, "0") + "9", nama: "Mahasiswa " + a + " " + i, masuk: a, kelas: i % 2 ? "B" : "A" });
    tambah("Pengguna", [p]); tambah("BiodataMahasiswa", [Object.assign({}, bioM, { userId: id, nama: p.nama })]);
  }
  for (let i = 0; i < VOL.dosen + VOL.tendik; i++) { const id = "d" + i; dsn.push(id); tambah("Pengguna", [Object.assign({}, contohD, { id, username: "1980" + String(i).padStart(14, "0"), nama: "Dosen " + i + ", M.Par." })]);
    tambah("BiodataPegawai", [Object.assign({}, bioP, { userId: id })]); }
  // kegiatan: klon kegiatan contoh dengan tanggal tersebar
  const K0 = C.semua("Kegiatan"); const kg = [];
  for (let y = 0; y < tahun; y++) for (let i = 0; i < VOL.kegiatanPerTahun; i++) {
    const b = K0[i % K0.length], th = kini - y, bl = 1 + (i % 12), oleh = i % 3 ? mhs[(i * 7) % mhs.length] : dsn[i % dsn.length];
    kg.push(Object.assign({}, b, { id: "k" + y + "-" + i, olehId: oleh, tgl: new Date(th + "-" + String(bl).padStart(2, "0") + "-15T00:00:00+08:00"), status: i % 10 ? "disetujui" : "diajukan",
      mhs: JSON.stringify(i % 3 ? [oleh] : []), pegawai: JSON.stringify(i % 3 ? [] : [oleh]), judul: b.judul + " " + y + "-" + i }));
  }
  tambah("Kegiatan", kg);
  const log = []; for (let i = 0; i < VOL.logPerTahun * tahun; i++) log.push({ waktu: new Date(Date.now() - (VOL.logPerTahun * tahun - i) * 60000 * 525600 / VOL.logPerTahun), userId: mhs[i % mhs.length], aksi: i % 5 ? "masuk" : "kegiatan.simpan", detail: JSON.stringify({ id: "k" + i, judul: "Kegiatan contoh " + i }) });
  { const lama = g.sheets.Log; g.sheets.Log = [lama[0]].concat(log.map(o => C.barisDari("Log", o)), lama.slice(1)); C._isi = {}; }   // log lama di atas, urut waktu seperti data sungguhan
  const ses = []; for (let i = 0; i < VOL.sesiPerTahun * tahun; i++) ses.push({ tokenHash: "x" + i, userId: mhs[i % mhs.length], dibuat: new Date(2024, 0, 1), kedaluwarsa: new Date(2024, 0, 8), perangkat: "Chrome di macOS" });
  tambah("Sesi", ses);
  const sv = C.semua("Survei")[0]; if (sv) { const jw = []; for (let i = 0; i < VOL.jawabanPerTahun * tahun; i++) jw.push({ id: "j" + i, survei: sv.id, userId: "", kunci: "h" + i, jawaban: JSON.stringify({ q1: 4, q2: 3, q3: 4, q4: 5, q5: "Baik" }), waktu: new Date() }); tambah("Jawaban", jw); }
  // riwayat semester (2 per mahasiswa per tahun)
  const rs = []; mhs.forEach((id, i) => { for (let y = 0; y < Math.min(tahun, 4) * 2; y++) rs.push({ userId: id, semester: (kini - Math.floor(y / 2)) + "-" + (1 + (y % 2)), tinggal: "Kos", kerja: "Tidak", inggris: "Menengah", transport: "Motor", waktu: new Date() }); });
  tambah("RiwayatSemester", rs);
  return { mhs: mhs.length, kegiatan: kg.length };
}

const AKSI = [
  ["Beranda (dosen) · tugas.saya", "tugas.saya", {}, "tDsn"], ["Beranda (mahasiswa) · tugas.saya", "tugas.saya", {}, "tM"], ["Beranda (KPS) · kesiapan.data", "kesiapan.data", {}, "tKps"],
  ["Kegiatan (dosen) · kegiatan.daftar", "kegiatan.daftar", {}, "tDsn"], ["Verifikasi (Admin) · verifikasi.antrean", "verifikasi.antrean", {}, "tAdm"], ["Antrean KPS · kps.antrean", "kps.antrean", {}, "tKps"],
  ["Portofolio (mahasiswa) · portofolio.saya", "portofolio.saya", {}, "tM"], ["Tabel iLKPS · ilkps.data", "ilkps.data", {}, "tAdm"], ["Penilaian · penilaian.data", "penilaian.data", {}, "tAdm"],
  ["Data Prodi · dp.data", "dp.data", {}, "tAdm"], ["Pengguna (Super Admin) · admin.pengguna", "admin.pengguna", {}, "tSA"], ["Log (Super Admin) · admin.log", "admin.log", {}, "tSA"],
  ["Cari orang · direktori", "direktori", {}, "tDsn"], ["Survei · survei.daftar", "survei.daftar", {}, "tAdm"], ["Data Terkumpul · sumber.kegiatan", "sumber.kegiatan", {}, "tSA"]
];
const hasil = [];
for (const th of TAHUN) {
  const X = siapkan(), A = X.g.ctx.AKSI || {}; const n = th ? isi(X.g, th, X) : { mhs: 1, kegiatan: X.g.sheets.Kegiatan.length - 1 };
  const sel = Object.entries(X.g.sheets).reduce((s, [, rows]) => s + Math.max(rows.length, 1000) * Math.max(26, (rows[0] || []).length), 0);
  const baris = Object.fromEntries(Object.entries(X.g.sheets).map(([k, r]) => [k, r.length - 1]));
  for (const [label, aksi, d, tok] of AKSI.filter(a => !process.env.UKUR_HANYA || process.env.UKUR_HANYA.split(",").includes(a[1]))) {
    if (!A[aksi]) { hasil.push({ tahun: th, label, galat: "aksi tidak ada" }); continue; }
    const baca = {}, panggilS = {}, asliSemua = X.g.ctx.semua; X.g.ctx.semua = function (nama) { const r = asliSemua(nama); if (!baca[nama]) baca[nama] = r.length * X.g.ctx.kolomDari(nama).length; panggilS[nama] = (panggilS[nama] || 0) + 1; return r; };
    X.g.ctx._isi = {}; X.g.panggil(aksi, d, X[tok]); X.g.ctx.semua = asliSemua; Object.keys(X.g.cache).filter(k => /^sj:/.test(k)).forEach(k => delete X.g.cache[k]);   // simpanan dikosongkan: panggilan pertama = hitung penuh
    const selBaca = Object.values(baca).reduce((s, v) => s + v, 0), terbesar = Object.entries(baca).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => k + ":" + Math.round(v / 1000) + "k").join(" ");
    const ms = []; let kb = 0, galat = "";
    for (let i = 0; i < 3; i++) { const a = performance.now(); const j = X.g.panggil(aksi, d, X[tok]); ms.push(performance.now() - a); if (!j.ok) { galat = j.galat; break; } kb = JSON.stringify(j).length / 1024; }
    hasil.push({ tahun: th, label, msPertama: Math.round(ms[0]), ms: Math.round(ms.slice(1).sort((a, b) => a - b)[0] ?? ms[0]), kb: Math.round(kb), selBacaRibu: Math.round(selBaca / 1000), terbesar, semua: Object.entries(panggilS).filter(([, v]) => v > 2).map(([k, v]) => k + '×' + v).join(' '), galat });
  }
  // v0.49.0: anggaran sel setelah perawatan harian (dijalankan berulang seperti hari-hari berturut-turut sampai arsip log tuntas)
  let selRawat = null; if (th && process.env.UKUR_RAWAT) { for (let i = 0; i < 20; i++) { X.g.props.RAWAT_TERAKHIR = ""; const R = X.g.panggil("admin.rawat", { jalankan: true }, X.tSA); selRawat = R.sel; if (!R.hasil || !R.hasil.log) break; } }
  console.log(JSON.stringify({ tahun: th, mhs: n.mhs, kegiatan: n.kegiatan, selPerkiraan: sel, selSetelahRawat: selRawat && selRawat.total, terbesarSetelahRawat: selRawat && selRawat.terbesar, baris: { Log: baris.Log, Sesi: baris.Sesi, Kegiatan: baris.Kegiatan, Jawaban: baris.Jawaban, Pengguna: baris.Pengguna } }));
}
console.log("HASIL " + JSON.stringify(hasil));
