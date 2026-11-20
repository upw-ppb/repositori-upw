// Uji v0.44.0 (Tahap 3): saran integrasi penelitian/PkM tim, tautan kegiatan di catatan integrasi, contoh Portofolio MK (RPS/kontrak/rubrik/Excel).
import fs from "node:fs";
import vm from "node:vm";
export async function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tD2, tM }) {
  console.log("57. Saran integrasi penelitian/PkM dan contoh Portofolio MK");
  const kini = ok("mkp.saya", {}, tDsn).semester, th = Number(kini.slice(0, 4));
  const buat = (data, t) => ok("kegiatan.simpan", { peran: "dosen", data: Object.assign({ perluST: false }, data) }, t || tDsn).kegiatan;
  const K = g.sheets.Kegiatan, iS = K[0].indexOf("status"), iT = K[0].indexOf("tgl");
  const setel = (id, status, tgl) => { const r = K.find(x => x[0] === id); r[iS] = status; if (tgl) r[iT] = tgl; };
  const a = buat({ jenis: "penelitian", judul: "Desain buku profil desa wisata berbasis storytelling visual", tgl: th + "-03-10" });
  const b = buat({ jenis: "pkm", judul: "Pendampingan promosi digital Pokdarwis", tgl: th + "-05-02" });
  const c = buat({ jenis: "penelitian", judul: "Penelitian lama sekali", tgl: (th - 7) + "-01-10" });
  const d = buat({ jenis: "penelitian", judul: "Penelitian ditolak", tgl: th + "-02-01" });
  const e = buat({ jenis: "penelitian", judul: "Penelitian draf", tgl: th + "-02-01" });
  const f = buat({ jenis: "pkm", judul: "PkM dosen lain di luar tim", tgl: th + "-02-01" }, tD2);
  const s = buat({ jenis: "suasana", judul: "Kuliah tamu bukan penelitian", tgl: th + "-02-01" });
  setel(a.id, "disetujui"); setel(b.id, "diajukan"); setel(c.id, "disetujui", (th - 7) + "-01-10"); setel(d.id, "ditolak"); setel(f.id, "disetujui"); setel(s.id, "disetujui");
  const S = ok("mkp.saranInteg", { semester: kini, kode: "UPW992", kunci: "A" }, tDsn), ids = S.kegiatan.map(k => k.id);
  cek("saran integrasi: penelitian/PkM tim 5 tahun terakhir (disetujui/diajukan); tanpa draf, ditolak, lama, dosen lain, jenis lain", ids.includes(a.id) && ids.includes(b.id)
    && ![c.id, d.id, e.id, f.id, s.id].some(i => ids.includes(i)) && S.kegiatan.find(k => k.id === a.id).dosen.length === 1 && S.kegiatan.find(k => k.id === b.id).jenisLabel === "Pengabdian kepada Masyarakat");
  cek("saran integrasi: mahasiswa ditolak; dosen di luar tim kelas ditolak", !!salah("mkp.saranInteg", { semester: kini, kode: "UPW992" }, tM) && /tidak mengajar|bukan anggota/i.test(salah("mkp.saranInteg", { semester: kini, kode: "UPW991", kunci: "B" }, tDsn)));
  cek("saran integrasi: pengelola (KPS) bisa melihat", ok("mkp.saranInteg", { semester: kini, kode: "UPW992", kunci: "A" }, tKps).kegiatan.length >= 2);
  let D = ok("mkp.integ", { semester: kini, kode: "UPW992", kunci: "A", keg: a.id, teks: "Hasil penelitian desain buku profil dipakai pada pertemuan 6 sebagai studi kasus." }, tDsn);
  const en = D.kelas.find(k => k.k === "A").integ.find(x => x.keg === a.id);
  cek("catatan integrasi tertaut ke kegiatan penelitian (judul dan jenis tersimpan)", en && en.kj === a.judul && en.kjn === "penelitian");
  cek("tautan ke kegiatan bukan penelitian/PkM ditolak", /tidak ditemukan/.test(salah("mkp.integ", { semester: kini, kode: "UPW992", kunci: "A", keg: s.id, teks: "Catatan integrasi yang cukup panjang." }, tDsn)));
  // Contoh di tampilan (Node)
  const ctx = { Blob, TextEncoder, TextDecoder, DecompressionStream, Response, Uint8Array, DataView, console }; ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync("web/zip.js", "utf8"), ctx); vm.runInContext(fs.readFileSync("web/rps.js", "utf8"), ctx);
  const U = ctx.UPW_RPS, C = JSON.parse(fs.readFileSync("web/contoh-mkp.json", "utf8")), cpl = g.ctx.CPL_PRODI;
  const refC = { cplProdi: cpl, kualifikasi: { kualifikasi: "Certificate IV", jenjang: "Level 3" }, mk: { kode: "PDM", sks: 2, semester: 3 }, tim: [] };
  const cekC = U.periksa(C.rps, refC);
  cek("contoh RPS: tanpa nama/NIP pejabat, bobot 100%, waktu terisi, lolos pemeriksaan butir 8 (tanpa temuan wajib)", !JSON.stringify(C).match(/NIP: \d|\d{18}|Wirata|Wijayanti|Rahadiarta/)
    && C.rps.pertemuan.reduce((x, p) => x + (p.bobot || 0), 0) === 100 && C.rps.pertemuan.filter(p => !p.ujian).every(p => p.waktu) && !cekC.some(v => v.t === "wajib"));
  const teks = async b => (await (await ctx.UPW_ZIP.buka(await b.arrayBuffer(), "Word"))("word/document.xml")).replace(/<[^>]+>/g, " ");
  const Rc = { mk: { kode: "PDM", nama: C.rps.mk.nama, semester: 3, sksKuliah: 0, sksSeminar: 0, sksPraktik: 2, sks: 2 }, labelKelas: "kelas A", labelSemester: "Ganjil 2026/2027", tim: [{ nama: "[Dosen]", nip: "" }],
    kualifikasi: { kualifikasi: "Certificate IV", jenjang: "Level 3" }, otorisasi: { skala: [] } };
  const tk = await teks(U.kontrak(Rc, C.rps, {}, C.kontrak));
  cek("contoh kontrak: isian contoh terisi (kontak, jadwal, keterlambatan, monev, tempat/tanggal)", tk.includes("Senin 08.00") && tk.includes("dikurangi 10 per hari") && tk.includes("Rubrik buku profil dibagikan") && tk.includes("Nusa Dua, 4 Agustus 2026") && !tk.includes("[batas waktu]"));
  const tr = await teks(U.rubrik(Rc, C.rps, {}, { hanyaBerubrik: true, lms: "LMS kampus" }));
  cek("contoh rubrik: hanya 3 penilaian berdeskripsi lengkap (tanpa [Deskripsi kinerja])", (tr.match(/Sangat baik/g) || []).length === 3 && !tr.includes("[Deskripsi kinerja]") && tr.includes("Rule of Thirds tepat"));
  const tb = await teks(U.rubrik(Rc, C.rps, {}));
  cek("rubrik biasa tetap memuat semua penilaian (deskripsi contoh dipakai bila ada)", (tb.match(/Sangat baik/g) || []).length === C.rps.porto.length && tb.includes("[Deskripsi kinerja]"));
  const app = fs.readFileSync("web/aplikasi.js", "utf8");
  cek("tampilan: kotak Contoh untuk keenam komponen Portofolio MK", ["rps", "kontrak", "rubrik", "metode", "integ", "interaksi"].every(k => new RegExp("\\n  " + k + ": \\{ teks:").test(app)) && /contohMkpHtml\(c\.k\)/.test(app));
}
