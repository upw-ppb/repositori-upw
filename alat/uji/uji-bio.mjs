// Uji server v0.2.0 (biodata) memakai kode server asli di atas tiruan Apps Script.
import { buatGas } from "./gas-tiruan.mjs";
const GAS = process.argv[2];
const g = buatGas(GAS);
let lulus = 0, gagal = 0;
const cek = (nama, kondisi, info) => { if (kondisi) { lulus++; console.log("  ✓ " + nama); } else { gagal++; console.log("  ✗ " + nama, info !== undefined ? JSON.stringify(info).slice(0, 400) : ""); } };
const ok = (aksi, data, token) => { const j = g.panggil(aksi, data, token); if (!j.ok) throw new Error(aksi + ": " + j.galat); return j; };
const salah = (aksi, data, token) => g.panggil(aksi, data, token);
const SANDI = "Uji12345a";

console.log("1. Penyiapan dan migrasi dari struktur data lama");
const s = ok("siapkan", { lingkungan: "uji" });
// Tiru spreadsheet versi 0.1.x: tanpa sheet/kolom baru, tanpa SKEMA_VERSI.
for (const n of ["RiwayatSemester", "BiodataMahasiswa", "BiodataPegawai", "Kegiatan"]) delete g.sheets[n];
g.sheets.Pengguna = g.sheets.Pengguna.map(r => r.slice(0, 18));
delete g.props.SKEMA_VERSI;
let j = ok("masuk", { username: s.superadmin, sandi: s.sandiAwal });
const tSA = j.token;
cek("sheet baru dibuat", ["RiwayatSemester", "BiodataMahasiswa", "BiodataPegawai"].every(n => g.sheets[n]));
cek("kolom baru Pengguna", g.sheets.Pengguna[0].length === g.ctx.SKEMA.Pengguna.length && g.sheets.Pengguna[0][18] === "masuk", g.sheets.Pengguna[0]);
cek("SKEMA_VERSI terbaru", g.props.SKEMA_VERSI === String(g.ctx.VERSI_SKEMA));
const cad = Object.values(g.files).filter(f => f.nama && f.nama.startsWith("Cadangan / sebelum v"));
cek("cadangan spreadsheet + daftar file dibuat", cad.length === 2, cad.map(f => f.nama));
const baris = nim => g.sheets.Pengguna.find(r => String(r[1]) === nim);
cek("akun contoh 250103 → 2025 kelas A", baris("250103")[18] === 2025 && baris("250103")[19] === "A", baris("250103").slice(18));
ok("ganti.sandi", { sandiBaru: SANDI }, tSA);

console.log("2. Impor dengan tahun masuk dan kelas");
j = ok("admin.impor", { baris: [
  { username: "260101", nama: "Made Uji", peran: "mahasiswa", masuk: "2026", kelas: "a" },
  { username: "260102", nama: "Tanpa Tahun", peran: "mahasiswa" },
  { username: "198001012005011001", nama: "Dosen Uji", peran: "dosen" },
  { username: "198001012005011002", nama: "Tendik Uji", peran: "tendik" }] }, tSA);
cek("3 diimpor, 1 dilewati (tahun masuk diambil dari NIM sejak v0.17.0; baris itu tanpa kelas)", j.diimpor === 3 && j.dilewati.length === 1 && /Kelas/.test(j.dilewati[0].alasan), j);
cek("kelas dibakukan jadi A", baris("260101")[19] === "A");

function aktifkan(u, email) {
  let t = ok("masuk", { username: u, sandi: u }).token;
  ok("aktivasi.sandi", { sandiBaru: SANDI }, t);
  const k = ok("aktivasi.kirimKode", { email }, t);
  return { t, p: ok("aktivasi.verifikasi", { kode: k.kodeUji }, t).pengguna };
}

console.log("3. Mahasiswa: wajib biodata");
let m = aktifkan("260101", "made@contoh.id");
cek("perluBiodata setelah aktivasi", m.p.perluBiodata === true && m.p.jenisBiodata === "mahasiswa", m.p);
cek("semester mahasiswa dihitung", m.p.semesterMhs >= 1, m.p);
cek("direktori ditolak sebelum biodata", /Lengkapi biodata/.test(salah("direktori", {}, m.t).galat || ""));
j = ok("biodata.saya", {}, m.t);
cek("skema 7 bagian + wilayah 38", j.biodata.skema.length === 7 && j.wilayah.length === 38);
cek("NIM/kelas/email dari akun", j.biodata.data.nim === "260101" && j.biodata.data.kelas === "A" && j.biodata.data.email === "made@contoh.id", j.biodata.data);
const isi = { nama: "Made Uji Coba", tmplahir: "Gianyar", tgllahir: "2007-05-12", jk: "Laki-laki", hp: "08123456789", alamat: "=HYPERLINK(\"http://jahat\")",
  jalur: "SBM-PTNP (Seleksi Bersama Masuk PTNP)", prov: "Bali", kab: "Kab. Gianyar", info: "Alumni / senior", alasan: "Ikut kakak (lainnya)",
  sekolah: "SMK Negeri 1 Gianyar", jsek: "SMK Negeri", jur: "Usaha Perjalanan Wisata (UPW)", provsek: "Bali", kabsek: "Kab. Gianyar",
  tinggal: "Kos / kontrakan", kerja: "Tidak bekerja", inggris: "Menengah", transport: "", skor: "", bahasa: "",
  ayah: "Petani / Nelayan", ibu: "Wirausaha / Pemilik Usaha", hasil: "", beasiswa: "KIP Kuliah", difabel: "" };
cek("kab di luar provinsi ditolak", /tidak ada di provinsi/.test(salah("biodata.simpan", { data: { ...isi, kab: "Kota Surabaya" } }, m.t).galat || ""));
cek("pilihan tak dikenal ditolak (tanpa Lainnya)", /pilihan tidak dikenal/.test(salah("biodata.simpan", { data: { ...isi, jk: "X" } }, m.t).galat || ""));
cek("nomor HP tidak valid ditolak", /angka saja/.test(salah("biodata.simpan", { data: { ...isi, hp: "abc" } }, m.t).galat || ""));
j = ok("biodata.simpan", { data: { ...isi, ayah: "", sekolah: "" } }, m.t);
cek("simpan sebagian: 2 kurang, masih wajib", j.biodata.kurang.length === 2 && j.pengguna.perluBiodata === true, j.biodata.kurang);
j = ok("biodata.simpan", { data: isi }, m.t);
cek("simpan lengkap membuka menu", j.biodata.kurang.length === 0 && j.pengguna.perluBiodata === false, j.biodata.kurang);
cek("nama akun ikut berubah", j.pengguna.nama === "Made Uji Coba");
cek("nol di depan HP tetap", j.biodata.data.hp === "08123456789", j.biodata.data.hp);
cek("tanggal lahir tetap yyyy-mm-dd", j.biodata.data.tgllahir === "2007-05-12", j.biodata.data.tgllahir);
cek("rumus disimpan sebagai teks", j.biodata.data.alamat.startsWith("=HYPERLINK"), j.biodata.data.alamat);
cek("jawaban Lainnya tersimpan", j.biodata.data.alasan === "Ikut kakak (lainnya)");
cek("riwayat semester tercatat", j.biodata.riwayat.length === 1 && j.biodata.sudahSemesterIni, j.biodata.riwayat);

console.log("4. Semester baru: wajib perbarui");
const pr = g.sheets.Pengguna.findIndex(r => String(r[1]) === "260101");
g.sheets.Pengguna[pr][22] = "2025-2";
g.sheets.RiwayatSemester.push([g.sheets.Pengguna[pr][0], "2025-2", "Rumah orang tua", "Tidak bekerja", "Dasar", "", new Date()]);
cek("perluBiodata lagi di semester baru", ok("saya", {}, m.t).pengguna.perluBiodata === true);
j = ok("biodata.simpan", { data: { ...isi, inggris: "Mahir" } }, m.t);
cek("setelah simpan terbuka, riwayat 2 semester", j.pengguna.perluBiodata === false && j.biodata.riwayat.length === 2 && j.biodata.riwayat[0].inggris === "Mahir", j.biodata.riwayat);

console.log("5. Dosen dan tendik");
const d = aktifkan("198001012005011001", "dosen@contoh.id");
j = ok("biodata.saya", {}, d.t);
const kunciD = j.biodata.skema.flatMap(x => x.f.map(f => f.k));
cek("dosen: ada kolom dosen, tanpa kolom tendik", kunciD.includes("jabfung") && kunciD.includes("bidang") && !kunciD.includes("jabTendik"), kunciD);
j = ok("biodata.simpan", { data: { nama: "Dr. Dosen Uji, M.Par.", jk: "Perempuan", statusPeg: "PNS", statusDosen: "Dosen tetap program studi (DTPS)", jabfung: "Lektor",
  pendS1: "S.Tr.Par., UPW, Poltekpar Bali, 2010", bidang: "MICE; Ticketing", hp: "+62 812 1111 2222", tampilHp: "Ya", emailKampus: "dosen@ppb.ac.id" } }, d.t);
cek("dosen lengkap", j.biodata.kurang.length === 0 && !j.pengguna.perluBiodata, j.biodata.kurang);
cek("HP dengan + tetap", j.biodata.data.hp === "+62 812 1111 2222", j.biodata.data.hp);
const t = aktifkan("198001012005011002", "tendik@contoh.id");
j = ok("biodata.saya", {}, t.t);
const kunciT = j.biodata.skema.flatMap(x => x.f.map(f => f.k));
cek("tendik: tanpa kolom dosen", !kunciT.includes("jabfung") && kunciT.includes("jabTendik") && kunciT.includes("pendTerakhir"), kunciT);
cek("superadmin tanpa biodata", ok("saya", {}, tSA).pengguna.jenisBiodata === null && !ok("saya", {}, tSA).pengguna.perluBiodata);
cek("tendik belum lengkap: aksi admin ditolak? (bukan admin)", /izin/.test(salah("admin.pengguna", {}, t.t).galat || ""));

console.log("6. Direktori dan hak akses");
j = ok("direktori", {}, m.t);
const dos = j.orang.find(x => x.username === "198001012005011001");
cek("mahasiswa melihat HP dosen yang mengizinkan", dos && dos.hp === "+62 812 1111 2222" && dos.bidang === "MICE; Ticketing", dos);
cek("direktori tanpa data pribadi", !JSON.stringify(j).includes("Petani") && !JSON.stringify(j).includes("Gianyar"));
const sa = j.orang.find(x => x.username === s.superadmin);
cek("akun superadmin tidak di direktori", !sa);
const m250 = g.ctx.cari("Pengguna", x => String(x.username) === "250103");
cek("ubahMhs ditolak untuk mahasiswa", /izin/.test(salah("admin.ubahMhs", { userId: m250.id, masuk: 2025, kelas: "A", statusMhs: "C" }, m.t).galat || ""));
j = ok("admin.ubahMhs", { userId: m250.id, masuk: 2025, kelas: "b", statusMhs: "C" }, tSA);
cek("ubahMhs oleh Super Admin", j.pengguna.kelas === "B" && j.pengguna.statusMhs === "C", j.pengguna);
cek("mahasiswa tidak melihat mahasiswa cuti", !ok("direktori", {}, m.t).orang.some(x => x.username === "250103"));
cek("dosen melihat mahasiswa cuti + status", ok("direktori", {}, d.t).orang.find(x => x.username === "250103")?.statusMhs === "C");
const mUji = g.ctx.cari("Pengguna", x => String(x.username) === "260101");
j = ok("biodata.lihat", { userId: mUji.id }, tSA);
cek("Super Admin melihat bagian privat", j.biodata.data.ayah === "Petani / Nelayan");
cek("mahasiswa tidak bisa biodata.lihat", /izin/.test(salah("biodata.lihat", { userId: mUji.id }, m.t).galat || ""));
cek("dosen tidak bisa biodata.lihat", /izin/.test(salah("biodata.lihat", { userId: mUji.id }, d.t).galat || ""));
j = ok("admin.pengguna", {}, tSA);
const r1 = j.pengguna.find(x => x.username === "260101");
cek("daftar pengguna: biodata lengkap & kelas", r1.biodataLengkap === true && r1.kelas === "A" && r1.masuk === 2026, r1);
j = ok("admin.cadangkan", { label: "uji manual" }, tSA);
cek("cadangan manual", /Cadangan \/ uji manual/.test(j.nama) && j.jumlahFile >= 1, j);
cek("tidak ada galat server tak terduga", true);

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
