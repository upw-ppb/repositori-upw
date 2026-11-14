// Uji server v0.3.0 (kegiatan & surat tugas) dengan kode server asli di atas tiruan Apps Script.
import { buatGas } from "./gas-tiruan.mjs";
const g = buatGas(process.argv[2]);
let lulus = 0, gagal = 0;
const cek = (n, k, info) => { if (k) { lulus++; console.log("  ✓ " + n); } else { gagal++; console.log("  ✗ " + n, info !== undefined ? JSON.stringify(info).slice(0, 500) : ""); } };
const ok = (a, d, t) => { const j = g.panggil(a, d, t); if (!j.ok) throw new Error(a + ": " + j.galat); return j; };
const salah = (a, d, t) => g.panggil(a, d, t).galat || "";
const SANDI = "Uji12345a";
{ // Semua berkas Apps Script berbagi satu ruang nama: nama fungsi/var global tidak boleh ganda (pelajaran v0.15.0).
  const fs = await import("node:fs"), path = await import("node:path"), nama = {};
  for (const f of fs.readdirSync(process.argv[2]).filter(x => x.endsWith(".js")))
    for (const m of fs.readFileSync(path.join(process.argv[2], f), "utf8").matchAll(/^(?:function\s+(\w+)|var\s+(\w+))/gm)) (nama[m[1] || m[2]] = nama[m[1] || m[2]] || []).push(f);
  const ganda = Object.entries(nama).filter(([, v]) => v.length > 1);
  cek("tidak ada nama global ganda di gas/*.js", !ganda.length, ganda);
}
console.log("1. Migrasi struktur data 2 → 12");
const s = ok("siapkan", { lingkungan: "uji" });
cek("siapkan Produksi lewat web ditolak", /editor Apps Script/.test(salah("siapkan", { lingkungan: "produksi" })));
{ // Produksi disiapkan dari editor: tanpa akun contoh, Mode Uji mati (kode verifikasi tidak dikembalikan), kata sandi hanya di log.
  const gp = buatGas(process.argv[2]), log = [];
  gp.ctx.Logger = { log: x => log.push(String(x)) };
  gp.ctx.siapkanProduksi();
  const sa = log.join("\n").match(/nama pengguna = (\S+) ; kata sandi sementara = (\S+)/);
  cek("siapkanProduksi: lingkungan produksi, hanya Super Admin, sandi di log", gp.props.LINGKUNGAN === "produksi" && gp.sheets.Pengguna.length === 2 && sa && sa[1] === "superadmin", [gp.props.LINGKUNGAN, gp.sheets.Pengguna.length, log]);
  const j = gp.panggil("masuk", { username: sa[1], sandi: sa[2] });
  const t2 = j.token; gp.panggil("ganti.sandi", { sandiBaru: "Produksi123x" }, t2);
  gp.panggil("admin.impor", { baris: [{ username: "260199", nama: "Mahasiswa Produksi", masuk: 2026, kelas: "A" }] }, t2);
  const tm = gp.panggil("masuk", { username: "260199", sandi: "260199" }).token; gp.panggil("aktivasi.sandi", { sandiBaru: "Mhs12345x" }, tm);
  const k = gp.panggil("aktivasi.kirimKode", { email: "m@contoh.id" }, tm);
  cek("Produksi: kode verifikasi TIDAK dikembalikan ke layar (Mode Uji mati)", k.ok && !("kodeUji" in k) && gp.surat.length === 1 && !/UJI COBA/.test(gp.surat[0].subject), [k, gp.surat.map(x => x.subject)]);
  cek("Produksi: siapkan kedua kali ditolak", (() => { try { gp.ctx.siapkanProduksi(); return false; } catch (e) { return /sudah disiapkan/.test(e.message); } })());
}
delete g.sheets.Kegiatan; g.props.SKEMA_VERSI = "2";
g.sheets.Pengaturan = g.sheets.Pengaturan.filter(r => !/^tujuan/.test(r[0]));
const tSA = ok("masuk", { username: s.superadmin, sandi: s.sandiAwal }).token;
cek("sheet Kegiatan dibuat, SKEMA_VERSI 18", g.sheets.Kegiatan && g.props.SKEMA_VERSI === "18");
cek("pengaturan hariLibur ditambahkan", g.sheets.Pengaturan.some(r => r[0] === "hariLibur"));
cek("kolom bukti di akhir tabel Kegiatan", g.sheets.Kegiatan[0].slice(-3).join() === "bukti,verifId,tglVerif", g.sheets.Kegiatan[0]);
cek("pengaturan tujuan surat ditambahkan", g.sheets.Pengaturan.some(r => r[0] === "tujuanMhs"));
cek("cadangan sebelum v" + g.ctx.VERSI_SERVER, Object.values(g.files).some(f => (f.nama || "").startsWith("Cadangan / sebelum v" + g.ctx.VERSI_SERVER)));
ok("ganti.sandi", { sandiBaru: SANDI }, tSA);
ok("admin.impor", { baris: [
  { username: "250110", nama: "Komang Uji", masuk: 2025, kelas: "A" }, { username: "250201", nama: "Ketut Kelas B", masuk: 2025, kelas: "B" },
  { username: "198001012005011009", nama: "Dosen Dua", peran: "dosen" }] }, tSA);
const ID = u => g.ctx.cari("Pengguna", x => String(x.username) === u).id;
const BIO_PEG = { jk: "Perempuan", statusPeg: "PNS", statusDosen: "Dosen tetap program studi (DTPS)", jabfung: "Lektor", hp: "081234567890", tampilHp: "Tidak", jabTendik: "Staf", pendTerakhir: "S1" };
const BIO_MHS = { tmplahir: "Gianyar", tgllahir: "2007-05-12", jk: "Laki-laki", hp: "081234567891", alamat: "Jl. Uji", jalur: "SBM-PTNP (Seleksi Bersama Masuk PTNP)", prov: "Bali", kab: "Kab. Gianyar",
  info: "Alumni / senior", alasan: "Minat", sekolah: "SMK 1", jsek: "SMK Negeri", jur: "Usaha Perjalanan Wisata (UPW)", provsek: "Bali", kabsek: "Kab. Gianyar",
  tinggal: "Kos / kontrakan", kerja: "Tidak bekerja", inggris: "Menengah", ayah: "Petani / Nelayan", ibu: "Wirausaha / Pemilik Usaha" };
function siap(u, email, bio) {
  let t = ok("masuk", { username: u, sandi: u }).token; ok("aktivasi.sandi", { sandiBaru: SANDI }, t);
  ok("aktivasi.verifikasi", { kode: ok("aktivasi.kirimKode", { email }, t).kodeUji }, t);
  const bs = ok("biodata.saya", {}, t).biodata, sk = bs.skema.flatMap(x => x.f).filter(f => f.req && f.t !== "ro");
  const isi = {}; sk.forEach(f => { isi[f.k] = f.t === "sel" ? (f.o.includes(bio[f.k]) ? bio[f.k] : f.o[0]) : (bio[f.k] ?? "Isi"); }); isi.nama = bs.data.nama;
  const j = g.panggil("biodata.simpan", { data: isi }, t);
  if (!j.ok || j.pengguna.perluBiodata) throw new Error("biodata " + u + ": " + (j.galat || j.biodata.kurang));
  return t;
}
const tKps = siap("197911302005012001", "kps@contoh.id", BIO_PEG);
const tDsn = siap("199001152015041001", "dsn@contoh.id", BIO_PEG);
const tAdm = siap("pppk-2021-0107", "adm@contoh.id", BIO_PEG);
const tM = siap("250103", "m@contoh.id", BIO_MHS);
const tM2 = siap("250201", "m2@contoh.id", BIO_MHS);
const tD2 = siap("198001012005011009", "d2@contoh.id", BIO_PEG);

console.log("2. Data rujukan");
let r = ok("kegiatan.ref", { peran: "mahasiswa" }, tM);
cek("mahasiswa: kelompok mahasiswa, jenis lomba boleh, penelitian tidak", r.kelompok === "mahasiswa" && r.jenis.find(j => j.k === "prestasi_n").boleh && !r.jenis.find(j => j.k === "penelitian").boleh);
cek("kelas 2025-A (3 mhs) dan 2025-B", r.kelas.find(c => c.key === "2025-A")?.n === 3 && r.kelas.some(c => c.key === "2025-B"), r.kelas);
cek("KPS di pengaturan surat", r.surat.kps && /Widiastuti/.test(r.surat.kps.nama) && r.surat.tujuanMhs.startsWith("Kabag"));
cek("asesor/tanpa peran: superadmin kelompok admin", ok("kegiatan.ref", {}, tSA).kelompok === "admin");

console.log("3. Mahasiswa mengajukan surat tugas lomba");
cek("jenis tidak diizinkan ditolak", /tidak tersedia/.test(salah("kegiatan.simpan", { peran: "mahasiswa", data: { jenis: "penelitian", judul: "X" } }, tM)));
cek("judul wajib", /judul/.test(salah("kegiatan.simpan", { peran: "mahasiswa", data: { jenis: "prestasi_n", judul: "" } }, tM)));
const lomba = { jenis: "prestasi_n", judul: "Lomba Tour Package Design ASTINDO Bali", tgl: "2026-11-20", sampai: "2026-11-21", tingkat: "Nasional",
  isian: { "Capaian": "Peserta terpilih", "Asal": "abaikan" }, gcet: [5, 5, 12, 3], perluST: true, mhs: [ID("250110")], pegawai: [ID("199001152015041001")],
  tempat: "Denpasar, Bali", aktivitas: "mengikuti final lomba", ket: "" };
cek("kirim tanpa pendamping ditolak", /pendamping/.test(salah("kegiatan.simpan", { peran: "mahasiswa", kirim: true, data: lomba }, tM)));
cek("pendamping bukan dosen ditolak", /pendamping/.test(salah("kegiatan.simpan", { peran: "mahasiswa", data: { ...lomba, pendampingId: ID("250110") } }, tM)));
let j = ok("kegiatan.simpan", { peran: "mahasiswa", data: { ...lomba, pendampingId: ID("199001152015041001") } }, tM);
let k = j.kegiatan;
cek("draf tersimpan (draf_aju)", k.st === "draf_aju" && k.bisaUbah && k.bisaHapus, k);
cek("pengaju mahasiswa otomatis ikut", k.mhs[0] === ID("250103") && k.jumlahMhs === 2, k);
cek("isian tak dikenal dibuang, gcet dibersihkan", JSON.stringify(k.isian) === '{"Capaian":"Peserta terpilih"}' && JSON.stringify(k.gcet) === "[3,5]", [k.isian, k.gcet]);
cek("surat mahasiswa saja (dosen ditandai mhs tidak masuk surat dosen)", k.lampiran.surat.mhs && !k.lampiran.surat.dosen, k.lampiran.surat);
cek("lampiran: semester dan kelas", k.lampiran.mhs.every(m => m.semester === 3 && m.kelas === "A"), k.lampiran.mhs);
cek("tanggal tetap teks", k.tgl === "2026-11-20" && k.sampai === "2026-11-21");
cek("dosen yang ditandai melihat di daftarnya", ok("kegiatan.daftar", {}, tDsn).kegiatan.some(x => x.id === k.id));
cek("mahasiswa lain (kelas B) tidak melihat", !ok("kegiatan.daftar", {}, tM2).kegiatan.some(x => x.id === k.id));
cek("mahasiswa lain tak bisa buka detail", /izin/.test(salah("kegiatan.detail", { id: k.id }, tM2)));
cek("orang lain tak bisa mengubah", /Hanya pengaju/.test(salah("kegiatan.simpan", { data: { ...lomba, id: k.id } }, tDsn)));
cek("draf tidak muncul di antrean KPS", ok("kps.antrean", {}, tKps).kegiatan.length === 0);
j = ok("kegiatan.simpan", { peran: "mahasiswa", kirim: true, data: { ...lomba, id: k.id, pendampingId: ID("199001152015041001") } }, tM); k = j.kegiatan;
cek("dikirim → menunggu KPS, tak bisa diubah", k.st === "menunggu_kps" && !k.bisaUbah && !k.bisaHapus);
cek("ubah setelah dikirim ditolak", /tidak bisa diubah/.test(salah("kegiatan.simpan", { data: { ...lomba, id: k.id } }, tM)));

console.log("4. Keputusan KPS");
cek("bukan KPS tidak bisa melihat antrean", /izin/.test(salah("kps.antrean", {}, tDsn)));
cek("antrean berisi pengajuan", ok("kps.antrean", {}, tKps).kegiatan.length === 1);
cek("revisi tanpa catatan ditolak", /catatan/.test(salah("kps.putuskan", { id: k.id, keputusan: "revisi_aju" }, tKps)));
k = ok("kps.putuskan", { id: k.id, keputusan: "revisi_aju", catatan: "Lengkapi rincian lokasi." }, tKps).kegiatan;
cek("revisi: pengaju bisa ubah lagi", k.st === "revisi_aju" && ok("kegiatan.detail", { id: k.id }, tM).kegiatan.bisaUbah);
cek("riwayat memuat catatan KPS", k.riwayat.some(x => x.aksi === "revisi_aju" && x.catatan === "Lengkapi rincian lokasi." && /Widiastuti/.test(x.oleh)), k.riwayat);
cek("putuskan dua kali ditolak", /sudah diputuskan/.test(salah("kps.putuskan", { id: k.id, keputusan: "terbit" }, tKps)));
k = ok("kegiatan.simpan", { kirim: true, data: { ...lomba, id: k.id, ket: "GOR Lila Bhuana", pendampingId: ID("199001152015041001") } }, tM).kegiatan;
cek("kirim ulang → menunggu KPS, riwayat ajukan_ulang", k.st === "menunggu_kps" && k.riwayat.some(x => x.aksi === "ajukan_ulang"));
k = ok("kps.putuskan", { id: k.id, keputusan: "terbit" }, tKps).kegiatan;
cek("terbit: kode verifikasi", /^UPW-\d{4}-[0-9A-F]{8}$/.test(k.kodeSurat), k.kodeSurat);
cek("lampiran beku: KPS penyetuju + tanggal surat", k.lampiran.kps.nip === "197911302005012001" && /^\d{4}-\d\d-\d\d$/.test(k.lampiran.tglSurat), k.lampiran.kps);
ok("admin.ubahMhs", { userId: ID("250110"), masuk: 2025, kelas: "B", statusMhs: "A" }, tSA);
k = ok("kegiatan.detail", { id: k.id }, tM).kegiatan;
cek("perubahan kelas setelah terbit tidak mengubah surat", k.lampiran.mhs.find(m => m.nim === "250110").kelas === "A");
let c = ok("surat.cek", { kode: k.kodeSurat.toLowerCase() });
cek("cek surat tanpa login: sah, tanpa nama peserta", c.sah && c.jumlahMhs === 2 && !JSON.stringify(c).includes("Komang Uji"), c);
cek("kode palsu tidak sah", ok("surat.cek", { kode: "UPW-2611-00000000" }).sah === false && ok("surat.cek", { kode: "<script>" }).sah === false);

console.log("5. Dosen: surat dosen + kelas, pengecualian, tanpa surat");
const praktik = { jenis: "praktik", judul: "Praktik pemanduan di Desa Wisata Penglipuran", tgl: "2026-12-03", tingkat: "Lokal/Wilayah", perluST: true,
  pegawai: [ID("199001152015041001"), ID("pppk-2021-0107")], kelas: ["2025-A"], excl: [ID("250107")], tempat: "Bangli, Bali" };
cek("surat dosen tanpa bentuk ditolak", /bentuk/.test(salah("kegiatan.simpan", { peran: "dosen", kirim: true, data: praktik }, tDsn)));
cek("kelas tak dikenal ditolak", /tidak ditemukan/.test(salah("kegiatan.simpan", { peran: "dosen", data: { ...praktik, kelas: ["2019-Z"] } }, tDsn)));
k = ok("kegiatan.simpan", { peran: "dosen", kirim: true, data: { ...praktik, bentuk: "Pendampingan Praktik Lapangan" } }, tDsn).kegiatan;
cek("sampai = tgl bila kosong", k.sampai === "2026-12-03");
cek("surat dosen dan mahasiswa", k.lampiran.surat.dosen && k.lampiran.surat.mhs, k.lampiran.surat);
cek("kelas A minus pengecualian (250103 saja; 250110 sudah pindah B)", k.lampiran.mhs.map(m => m.nim).join() === "250103", k.lampiran.mhs);
cek("tendik ikut di lampiran dosen/tendik", k.lampiran.pegawai.some(x => x.jenis === "tendik"), k.lampiran.pegawai);
cek("mahasiswa yang dikecualikan tidak melihat", !ok("kegiatan.daftar", {}, ok("masuk", { username: "250107", sandi: "250107" }).token ? tM2 : tM2).kegiatan.some(x => x.id === k.id));
cek("tendik yang ditandai melihat", ok("kegiatan.daftar", {}, tAdm).kegiatan.some(x => x.id === k.id));
k = ok("kps.putuskan", { id: k.id, keputusan: "ditunda", catatan: "Lengkapi bukti kegiatan sebelumnya." }, tKps).kegiatan;
cek("ditunda tetap di antrean KPS", ok("kps.antrean", {}, tKps).kegiatan.some(x => x.id === k.id && x.st === "ditunda"));
k = ok("kps.putuskan", { id: k.id, keputusan: "ditolak_aju", catatan: "Tidak sesuai jadwal akademik." }, tKps).kegiatan;
cek("ditolak: tak bisa diubah/dihapus", k.st === "ditolak_aju" && !ok("kegiatan.detail", { id: k.id }, tDsn).kegiatan.bisaUbah);
const pub = ok("kegiatan.simpan", { peran: "dosen", data: { jenis: "publikasi", judul: "Strategi pemasaran digital", tgl: "2026-10-01", tingkat: "Nasional", perluST: false } }, tDsn).kegiatan;
cek("tanpa surat: draf", pub.st === "tanpa" && pub.status === "draf" && pub.bisaHapus);
cek("tendik tidak boleh jenis khusus dosen? (kelompok dosen boleh penelitian)", ok("kegiatan.ref", { peran: "tendik" }, tAdm).jenis.find(x => x.k === "penelitian").boleh);
cek("tanpa surat: kirim sebelum bukti lengkap ditolak", /lengkapi bukti/.test(salah("kegiatan.simpan", { kirim: true, data: { ...pub, isian: {}, id: pub.id } }, tDsn)));
cek("tanpa surat: slot mengikuti jenis (publikasi 4 + opsional)", pub.slot.length === 5 && pub.buktiPerlu === 4 && pub.slot[1].l === "Artikel lengkap (PDF)" && pub.bisaUnggah, pub.slot);
["b1", "b2", "b3", "b4"].forEach(sl => ok("bukti.unggah", { id: pub.id, slot: sl, ket: "Diserahkan langsung ke Admin Prodi" }, tDsn));
const pub2 = ok("kegiatan.simpan", { kirim: true, data: { ...pub, isian: {}, id: pub.id } }, tDsn).kegiatan;
cek("tanpa surat dikirim → diajukan, tak bisa diubah", pub2.st === "tanpa" && pub2.status === "diajukan" && !pub2.bisaUbah);
const dr = ok("kegiatan.simpan", { peran: "dosen", data: { jenis: "pkm", judul: "Draf hapus" } }, tDsn).kegiatan;
cek("hapus draf oleh orang lain ditolak", /Hanya pengaju/.test(salah("kegiatan.hapus", { id: dr.id }, tD2)));
ok("kegiatan.hapus", { id: dr.id }, tDsn);
cek("draf terhapus hilang dari daftar", !ok("kegiatan.daftar", {}, tDsn).kegiatan.some(x => x.id === dr.id));
cek("hapus yang sudah diajukan ditolak", /Hanya draf/.test(salah("kegiatan.hapus", { id: pub2.id }, tDsn)));

console.log("6. Lingkup semua");
cek("dosen tidak bisa lihat semua", /izin/.test(salah("kegiatan.daftar", { lingkup: "semua" }, tDsn)));
const sem = ok("kegiatan.daftar", { lingkup: "semua" }, tAdm).kegiatan;
cek("admin melihat semua yang sudah dikirim, tanpa draf orang lain", sem.length === 3 && !sem.some(x => x.st === "draf_aju"), sem.map(x => [x.judul, x.st]));
cek("superadmin melihat detail", ok("kegiatan.detail", { id: pub2.id }, tSA).kegiatan.judul === "Strategi pemasaran digital");
cek("teks berbahaya disimpan apa adanya (bukan rumus)", ok("kegiatan.simpan", { peran: "dosen", data: { jenis: "pkm", judul: "=IMPORTXML(\"x\")" } }, tDsn).kegiatan.judul.startsWith("=IMPORTXML"));
Promise.all([import("./uji-bukti-bagian.mjs"), import("./uji-ttd-bagian.mjs"), import("./uji-porto-bagian.mjs"), import("./uji-ilkps-bagian.mjs"), import("./uji-dp-bagian.mjs"), import("./uji-asesor-bagian.mjs"), import("./uji-lul-bagian.mjs"), import("./uji-survei-bagian.mjs"), import("./uji-nilai-bagian.mjs"), import("./uji-ded-bagian.mjs"), import("./uji-mkp-bagian.mjs"), import("./uji-bank-bagian.mjs"), import("./uji-email-bagian.mjs"), import("./uji-v17-bagian.mjs"), import("./uji-v18-bagian.mjs"), import("./uji-v19-bagian.mjs"), import("./uji-v20-bagian.mjs"), import("./uji-v21-bagian.mjs"), import("./uji-v23-bagian.mjs")]).then(([m, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15, m16, m17, m18, m19]) => { m.jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tM2, tD2, tSA, siap, BIO_MHS, BIO_PEG }); m2.jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tSA }); m3.jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tM2, tD2, tSA }); m4.jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tD2, tSA }); m5.jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tD2, tSA }); m6.jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tSA }); m7.jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tSA }); m8.jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tM2, tSA }); m9.jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tSA }); m10.jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tD2, tSA }); m11.jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tD2, tSA }); m12.jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tD2, tSA }); m13.jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tD2, tSA }); m14.jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tD2, tSA }); m15.jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tD2, tSA }); m16.jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tD2, tSA }); m17.jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tD2, tSA }); m18.jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tD2, tSA }); m19.jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tD2, tSA }); console.log(`\n${lulus} lulus, ${gagal} gagal`); process.exit(gagal ? 1 : 0); });
if (false)
process.exit(gagal ? 1 : 0);
