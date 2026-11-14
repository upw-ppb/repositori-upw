// Server lokal: menyajikan salinan docs/uji dan menjawab /api dengan kode server asli di atas tiruan Apps Script.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { buatGas } from "./gas-tiruan.mjs";
const [, , GAS, WEB, PORT_ARG = "8790"] = process.argv;
const PORT = process.env.PORT || PORT_ARG; // pratinjau aplikasi Claude bisa memberi port lain lewat PORT
const g = buatGas(GAS);
const ok = (a, d, t) => { const j = g.panggil(a, d, t); if (!j.ok) throw new Error(a + ": " + j.galat); return j; };
const SANDI = "Uji12345a";
const s = ok("siapkan", { lingkungan: "uji" });
let t = ok("masuk", { username: s.superadmin, sandi: s.sandiAwal }).token;
ok("ganti.sandi", { sandiBaru: SANDI }, t);
ok("admin.impor", { baris: [{ username: "250201", nama: "Ketut Kelas B", masuk: 2025, kelas: "B" }, { username: "260101", nama: "Made Uji", masuk: 2026, kelas: "A" }] }, t);
const BIO = { jk: "Perempuan", statusPeg: "PNS", statusDosen: "Dosen tetap program studi (DTPS)", jabfung: "Lektor", hp: "081234567890", tampilHp: "Tidak", jabTendik: "Staf", pendTerakhir: "S1",
  tmplahir: "Gianyar", tgllahir: "2007-05-12", alamat: "Jl. Uji", prov: "Bali", kab: "Kab. Gianyar", provsek: "Bali", kabsek: "Kab. Gianyar", sekolah: "SMK 1" };
for (const [u, e] of [["197911302005012001", "kps@contoh.id"], ["199001152015041001", "dosen@contoh.id"], ["pppk-2021-0107", "adm@contoh.id"], ["250103", "m1@contoh.id"], ["250107", "m2@contoh.id"], ["250201", "m3@contoh.id"]]) {
  const tk = ok("masuk", { username: u, sandi: u }).token; ok("aktivasi.sandi", { sandiBaru: SANDI }, tk);
  ok("aktivasi.verifikasi", { kode: ok("aktivasi.kirimKode", { email: e }, tk).kodeUji }, tk);
  const bs = ok("biodata.saya", {}, tk).biodata, isi = { nama: bs.data.nama };
  bs.skema.flatMap(x => x.f).filter(f => f.req && f.t !== "ro").forEach(f => { isi[f.k] = f.t === "sel" ? (f.o.includes(BIO[f.k]) ? BIO[f.k] : f.o[0]) : (BIO[f.k] ?? "Isi uji"); }); isi.nama = bs.data.nama;
  ok("biodata.simpan", { data: isi }, tk);
}
console.log("akun uji siap, kata sandi semua:", SANDI);
// Data contoh v0.4.0: lomba mahasiswa (pendamping dosen) dan praktik dosen dengan surat terbit.
const ID = u => g.ctx.cari("Pengguna", x => String(x.username) === u).id;
const T = u => ok("masuk", { username: u, sandi: SANDI }).token;
const tKps = T("197911302005012001"), tDsn = T("199001152015041001"), tM = T("250103");
const l1 = ok("kegiatan.simpan", { peran: "mahasiswa", kirim: true, data: { jenis: "prestasi_n", judul: "Lomba Tour Package Design ASTINDO Bali", tgl: "2026-11-20", sampai: "2026-11-21", tingkat: "Nasional",
  perluST: true, mhs: [ID("250107")], pendampingId: ID("199001152015041001"), tempat: "Denpasar, Bali", isian: { Capaian: "Juara 2" } } }, tM).kegiatan;
ok("kps.putuskan", { id: l1.id, keputusan: "terbit" }, tKps);
const p1 = ok("kegiatan.simpan", { peran: "dosen", kirim: true, data: { jenis: "praktik", judul: "Praktik pemanduan di Desa Wisata Penglipuran", tgl: "2026-10-01", tingkat: "Lokal/Wilayah", perluST: true,
  pegawai: [ID("199001152015041001")], kelas: ["2025-A"], tempat: "Bangli, Bali", bentuk: "Pendampingan Praktik" } }, tDsn).kegiatan;
ok("kps.putuskan", { id: p1.id, keputusan: "terbit" }, tKps);
ok("kegiatan.simpan", { peran: "dosen", kirim: true, data: { jenis: "pkm", judul: "PKM baru di Bangli", tgl: "2026-12-10", tingkat: "Lokal/Wilayah", perluST: true,
  pegawai: [ID("199001152015041001")], tempat: "Bangli, Bali", bentuk: "Pengabdian" } }, tDsn);
const tAdmS = T("pppk-2021-0107");
const setuju = (data) => { const k = ok("kegiatan.simpan", { peran: "dosen", data: { perluST: false, tingkat: "Nasional", tgl: "2025-10-10", ...data } }, tDsn).kegiatan;
  k.slot.filter(s => !s.opsional).forEach(s => ok("bukti.unggah", { id: k.id, slot: s.k, ket: "Ada di arsip prodi" }, tDsn)); ok("kegiatan.ajukanData", { id: k.id }, tDsn);
  ok("verifikasi.putuskan", { id: k.id, keputusan: "disetujui" }, tAdmS); };
setuju({ jenis: "penelitian", judul: "Pola perjalanan wisatawan muda", mhs: [ID("250103"), ID("250107")], isian: { "Sumber dana": "PT / mandiri", "Topik peta jalan penelitian": "Perilaku wisatawan" } });
setuju({ jenis: "penelitian", judul: "Hibah BRIN destinasi", tgl: "2024-11-05", isian: { "Sumber dana": "Dalam negeri (Kemdiktisaintek, BRIN, pemda, industri)" } });
setuju({ jenis: "publikasi", judul: "Strategi pemasaran digital biro perjalanan", isian: { "Kategori publikasi": "Jurnal nasional terakreditasi (SINTA)", "Luaran dari": "Penelitian", "Nama jurnal / seminar": "Jurnal Kepariwisataan", "Jumlah sitasi (Google Scholar)": "7" } });
setuju({ jenis: "kerjasama", judul: "MoU magang dan rekrutmen", tingkat: "Internasional", isian: { Bidang: "Pendidikan", "Nama mitra": "ASITA Bali", "Masa berlaku": "2025–2030" } });
setuju({ jenis: "rekognisi", judul: "Keynote speaker konferensi pariwisata", tingkat: "Internasional", isian: { "Bentuk rekognisi": "Keynote / invited speaker" } });
// Data contoh v0.14.0: kurikulum dan tim pengajar semester berjalan (Ganjil 2026/2027) untuk Portofolio MK.
ok("dp.mkSimpan", { daftar: [{ kode: "UPW101", nama: "Pengantar Pariwisata", semester: 1, sksKuliah: 3 }, { kode: "UPW301", nama: "Tour Planning", semester: 3, sksKuliah: 1, sksPraktik: 2, kompetensi: true },
  { kode: "UPW501", nama: "Ticketing", semester: 5, sksKuliah: 1, sksPraktik: 2 }] }, tAdmS);
ok("dp.timSimpan", { semester: "2026-1", kodeMk: "UPW101", anggota: [{ t: "u", id: ID("199001152015041001") }, { t: "u", id: ID("197911302005012001") }] }, tAdmS);
ok("dp.timSimpan", { semester: "2026-1", kodeMk: "UPW301", anggota: [{ t: "u", id: ID("197911302005012001") }, { t: "u", id: ID("199001152015041001") }] }, tAdmS);
ok("mkp.integ", { semester: "2026-1", kodeMk: "UPW301", kode: "UPW301", teks: "Mahasiswa menyusun paket wisata dari hasil penelitian KPS tentang pola perjalanan wisatawan muda." }, tKps);
// Data contoh v0.15.0: Bank Dokumen (PJ dosen untuk 2 slot butir 1; satu dokumen berlaku).
ok("bank.atur", { kunci: "1-0", pj: ID("199001152015041001") }, tAdmS); ok("bank.atur", { kunci: "1-1", pj: ID("199001152015041001") }, tAdmS);
ok("bank.unggah", { kunci: "3-0", tautan: "https://drive.google.com/sk-iab", berlaku: "2027-12-31", ket: "SK IAB 2025" }, tAdmS);
// Data contoh v0.23.0 untuk penjelajahan menyeluruh
try {
  const tSA0 = T("superadmin.uji");
  const sv = ok("survei.simpan", { data: { judul: "Kepuasan mahasiswa semester ganjil", tujuan: "t22", sasaran: ["mahasiswa"], anonim: true, templat: "t22" } }, tAdmS);
  if (sv && sv.survei) ok("survei.status", { id: sv.survei.id, status: "dibuka" }, tAdmS);
} catch (e) { console.log("survei contoh:", e.message); }
try { ok("ded.simpan", { butir: 1, teks: "Prodi UPW menjalankan SPMI dengan lima aspek.", status: "draf", versi: "" }, tAdmS); } catch (e) { console.log("ded:", e.message); }
try { ok("masukan.kirim", { jenis: "Permintaan fitur baru", menu: "Kegiatan", judul: "Contoh masukan", isi: "Mohon ada pengingat lewat WhatsApp untuk batas bukti." }, tM); } catch (e) { console.log("masukan:", e.message); }
try { const L0 = ok("lab.simpan", { data: { nama: "Laboratorium GDS", jenis: "Laboratorium", kapasitas: 30, kepemilikan: "Milik sendiri", kondisi: "Baik" } }, tAdmS);
  ok("lab.log", { data: { saranaId: L0.sarana[0].id, tipe: "rawat", tgl: "2026-10-01", isi: "Servis berkala" } }, tAdmS); } catch (e) { console.log("lab:", e.message); }
console.log("data contoh kegiatan siap");
globalThis.permintaan = [];
const TIPE = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api") {
    let b = ""; req.on("data", c => b += c); req.on("end", () => {
      const m = JSON.parse(b); permintaan.push({ aksi: m.aksi, data: m.data });
      fs.appendFileSync(path.join(WEB, "..", "permintaan.log"), JSON.stringify({ aksi: m.aksi, data: m.data }) + "\n");
      const out = g.ctx.doPost({ postData: { contents: b } }).isi;
      res.writeHead(200, { "Content-Type": "application/json" }); res.end(out);
    }); return;
  }
  const f = path.join(WEB, decodeURIComponent(req.url.split("?")[0]).replace(/\/$/, "/index.html"));
  if (!f.startsWith(WEB) || !fs.existsSync(f)) { res.writeHead(404); res.end("404"); return; }
  res.writeHead(200, { "Content-Type": TIPE[path.extname(f)] || "application/octet-stream" }); res.end(fs.readFileSync(f));
}).listen(Number(PORT), () => console.log("siap di http://localhost:" + PORT));
