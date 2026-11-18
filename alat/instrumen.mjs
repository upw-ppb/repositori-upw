// Membuat docs/uji/instrumen.js (window.UPW_INSTRUMEN) untuk tombol (i) "Menurut instrumen" (v0.30.0).
// Sumber: alat/instrumen/matriks-tabel.txt (transkripsi Matriks per baris tabel), alat/instrumen/ded-tabel.json (keterangan Tabel iLKPS dari DED),
// gas/Matriks.js (84 butir Lampiran 1: nama, bobot, syarat skor 4, saran, sumber, butir DED) dan gas/DedPetunjuk.js (petunjuk 64 butir DED).
// Jalankan: node alat/instrumen.mjs   (dari folder proyek). Jangan ubah docs/uji/instrumen.js langsung.
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
const akar = fileURLToPath(new URL("..", import.meta.url));
const baca = p => fs.readFileSync(akar + p, "utf8");
const ctx = {}; vm.createContext(ctx);
vm.runInContext(baca("gas/Matriks.js") + "\n;this.MATRIKS=MATRIKS;this.KRITERIA=KRITERIA;this.DED_BUTIR=DED_BUTIR;", ctx);
vm.runInContext(baca("gas/DedPetunjuk.js") + "\n;this.DED_PETUNJUK=DED_PETUNJUK;", ctx);

// 1) Transkripsi Matriks (nomor baris tabel).
const T = {}; let cur = null;
for (const baris of baca("alat/instrumen/matriks-tabel.txt").split("\n")) {
  const l = baris.trimEnd();
  if (!l || l.startsWith("# ")) continue;
  if (/^#\d+$/.test(l)) { cur = Number(l.slice(1)); if (T[cur]) throw new Error("Butir ganda #" + cur); T[cur] = { el: "", b: [], r: "" }; continue; }
  const m = /^(?:([A-ES])\.)?(el|i|k|r|[0-4](?:-[0-4])?):\s?(.*)$/.exec(l);
  if (!m || !cur) throw new Error("Baris tidak dikenal: " + l);
  const [, p = "", kunci, isi] = m, d = T[cur];
  if (kunci === "el") { d.el = isi; continue; }
  if (kunci === "r") { d.r = isi; continue; }
  let b = d.b.find(x => x.p === p); if (!b) { b = { p, i: "", s: [], k: [] }; d.b.push(b); }
  if (kunci === "i") b.i = isi; else if (kunci === "k") b.k.push(isi); else b.s.push([kunci, isi]);
}
for (let n = 1; n <= 83; n++) if (!T[n]) throw new Error("Butir tabel #" + n + " belum ditranskripsi");
for (const [n, d] of Object.entries(T)) for (const b of d.b) {
  if (!b.s.length) continue;
  const ada = new Set(); b.s.forEach(([k]) => { const [hi, lo = hi] = k.split("-").map(Number); for (let x = lo; x <= hi; x++) ada.add(x); });
  if (ada.size !== 5) throw new Error(`Butir #${n}${b.p}: skor 0–4 belum lengkap`);
}

// 2) Nomor Lampiran 1 (dipakai aplikasi) ↔ nomor baris tabel Matriks.
//    1–26 sama; 27 "Rasio Mahasiswa dan DTPS" = bagian C butir tabel 9; 28–84 = butir tabel 27–83.
const keTabel = n => n <= 26 ? n : n === 27 ? 9 : n - 1;
const butir = {};
for (const m of ctx.MATRIKS) {
  const t = keTabel(m.n), src = T[t];
  let bagian = src.b, rumus = src.r, catatan = "";
  if (m.n === 27) { bagian = src.b.filter(b => b.p === "C"); rumus = ""; catatan = "Di tabel Matriks, indikator ini adalah bagian C dari butir 9 (Rencana strategis pengelolaan SDM); di Lampiran 1 (bobot) menjadi butir tersendiri nomor 27."; }
  else if (m.n === 9) catatan = "Bagian C (rasio mahasiswa/DTPS) juga diberi bobot tersendiri di Lampiran 1 sebagai butir 27.";
  else if (t !== m.n) catatan = `Nomor ${t} pada tabel Matriks; nomor ${m.n} pada Lampiran 1 (bobot), yang dipakai aplikasi.`;
  if (m.n === 75) catatan = (catatan + " Baris SDG's di bawahnya berlaku untuk program studi bidang kreatif (DED butir 55); untuk prodi pariwisata yang dinilai adalah Global Code of Ethics for Tourism.").trim();
  const tabel = [...new Set((String(m.src).match(/Tabel\s*\d+[a-c]?/g) || []).map(x => x.replace(/Tabel\s*/, "")))];
  butir[m.n] = { n: m.n, t, k: m.k, nm: m.nm, el: src.el, w: m.w, cara: m.t, ded: m.ded, src: m.src, s4: m.s4, sr: m.sr, b: bagian, r: rumus, catatan, tabel };
}

// 3) Tabel iLKPS: keterangan DED + butir yang memakainya.
const KODE_APP = { "15": ["15-1", "15-2", "15-3", "15-4"], "20": ["20-1", "20-2", "20-3"], "11": ["11", "ref11a"] };
const dedTabel = JSON.parse(baca("alat/instrumen/ded-tabel.json"));
const tabel = {};
const tambahTabel = (kode, isi) => { tabel[kode] = Object.assign(tabel[kode] || { p: "", k: [], butir: [], ded: [] }, isi); };
for (const [k, v] of Object.entries(dedTabel)) for (const kode of KODE_APP[k] || [k]) tambahTabel(kode, { p: v.p || "", k: v.k || [] });
for (const b of Object.values(butir)) for (const t of b.tabel) for (const kode of KODE_APP[t] || [t]) { tambahTabel(kode, {}); tabel[kode].butir.push(b.n); }
for (const [n, d] of Object.entries(ctx.DED_PETUNJUK)) for (const t of d.t || []) for (const kode of KODE_APP[t] || [t]) { tambahTabel(kode, {}); tabel[kode].ded.push(Number(n)); }

// Judul tabel seperti di halaman Tabel iLKPS (dibaca dari gas/*.js).
for (const f of fs.readdirSync(akar + "gas").filter(x => x.endsWith(".js"))) {
  for (const m of baca("gas/" + f).matchAll(/(?:kode:\s*)?"([0-9]{1,2}[a-c]?(?:-[1-4])?|ref11a)",\s*(?:judul:\s*)?"((?:Tabel|Tabel Referensi) [^"]+)"/g)) { tambahTabel(m[1], {}); tabel[m[1]].judul = m[2]; }
}
Object.assign(tabel["7a"] || {}, { judul: "Tabel 7a) Prestasi Akademik Mahasiswa" }); Object.assign(tabel["7b"] || {}, { judul: "Tabel 7b) Prestasi Non-akademik Mahasiswa" });
["Pendidikan", "Penelitian", "Pengabdian kepada Masyarakat"].forEach((x, i) => { if (tabel["20-" + (i + 1)]) tabel["20-" + (i + 1)].judul = "Tabel 20) Kerja sama Tridharma: " + x; });
for (const [k, v] of Object.entries(tabel)) if (!v.judul) v.judul = "Tabel " + k;

// 4) DED: petunjuk per butir + butir Matriks terkait.
const ded = {};
for (const [n, nm] of ctx.DED_BUTIR) ded[n] = { n, nm, p: (ctx.DED_PETUNJUK[n] || {}).p || "", t: (ctx.DED_PETUNJUK[n] || {}).t || [], butir: Object.values(butir).filter(b => b.ded === n).map(b => b.n) };

// 5) Definisi jenis dosen (DED Tabel 1–3 dan Matriks butir 16).
const definisi = {
  dosen: [
    ["DT", dedTabel["1"].k[0]], ["DTPT", dedTabel["1"].k[1]], ["DTPS", dedTabel["1"].k[2]],
    ["Dosen tidak tetap (DTT)", "Dosen Tidak Tetap yang ditugaskan sebagai pengampu Mata Kuliah di Program Studi yang diakreditasi (DTT) pada saat TS (DED, Tabel 3). " + dedTabel["3"].k.at(-1)],
    ["Dosen industri/praktisi", T[16].b[0].i.replace(/^Keterlibatan dosen industri\/praktisi\. Tabel 2\) DED\. /, "") + " " + dedTabel["2"].p.split(". ").slice(1).join(". ")]
  ]
};

const keluar = { versi: 1, sumber: "Matriks Penilaian dan DED LAMWisata IAPS 1.0 untuk Perolehan Status Terakreditasi Unggul, Program Sarjana Terapan (Vokasi D4). Teks instrumen disalin apa adanya; rujukan resmi tetap dokumen LAMWisata.",
  kriteria: ctx.KRITERIA, butir, tabel, ded, definisi };
const js = "/* DIBUAT OTOMATIS oleh alat/instrumen.mjs — jangan diubah langsung. Teks instrumen LAMWisata untuk tombol (i). */\nwindow.UPW_INSTRUMEN = " + JSON.stringify(keluar) + ";\n";
fs.writeFileSync(akar + "docs/uji/instrumen.js", js);
console.log(`instrumen.js: ${Object.keys(butir).length} butir, ${Object.keys(tabel).length} tabel, ${Object.keys(ded).length} butir DED, ${(js.length / 1024).toFixed(0)} KB`);
