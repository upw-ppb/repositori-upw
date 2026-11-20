// Membuat PDF contoh Portofolio MK (v0.45.0): docs/uji/contoh/{rps,kontrak,rubrik}.pdf dari docs/uji/contoh-mkp.json.
// Langkah: rps.js menyusun Word (sama seperti tombol di aplikasi) → diubah ke HTML oleh pengubah sederhana di bawah (khusus Word buatan rps.js)
// → dicetak ke PDF oleh Google Chrome headless. Jalankan ulang setiap contoh-mkp.json atau rps.js berubah:
//   node alat/contoh-pdf.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { execFileSync } from "node:child_process";

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const UJI = path.join(AKAR, "docs/uji"), KELUAR = path.join(UJI, "contoh");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ctx = { Blob, TextDecoder, TextEncoder, DecompressionStream, Response, console }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ["zip.js", "rps.js"]) vm.runInContext(fs.readFileSync(path.join(UJI, f), "utf8"), ctx);
const U = ctx.UPW_RPS, C = JSON.parse(fs.readFileSync(path.join(UJI, "contoh-mkp.json"), "utf8"));
const logo = {}; for (const k of ["kemenpar", "poltekpar", "asean", "banpt"]) logo[k] = new Uint8Array(fs.readFileSync(path.join(UJI, `templat/logo-${k}.png`)));
const M = C.rps.mk;
const Rc = { mk: { kode: M.kode, nama: M.nama, semester: Number(M.semester), sksKuliah: 0, sksSeminar: 0, sksPraktik: Number(M.sksP) || 0, sks: Number(M.sks) }, labelKelas: "kelas A", labelSemester: "Ganjil 2026/2027",
  tim: C.rps.dosen.map((n, i) => ({ nama: n, nip: "", utama: !i })), kualifikasi: { kualifikasi: C.rps.kualifikasi, jenjang: C.rps.jenjang },
  otorisasi: { kpsJabatan: "Koordinator Program Studi", kpsNama: "[Nama Koordinator Program Studi]", kpsNip: "", hadirMin: C.kontrak.hadirMin || "", skala: [] } };

const ent = s => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function potong(s, tag) {   // potongan tingkat atas <w:tag>…</w:tag>
  const h = [], re = new RegExp(`<w:${tag}[ >]|</w:${tag}>|<w:tbl>|</w:tbl>`, "g"); let d = 0, a = -1, dt = 0, m;
  while ((m = re.exec(s))) {
    const g = m[0];
    if (tag !== "tbl" && g === "<w:tbl>") { dt++; continue; } if (tag !== "tbl" && g === "</w:tbl>") { dt--; continue; }
    if (dt) continue;
    if (g.startsWith(`<w:${tag}`)) { if (d === 0) a = m.index; d++; } else { d--; if (d === 0) h.push(s.slice(a, m.index + g.length)); }
  }
  return h;
}
function htmlPar(p, media) {
  const jc = (p.match(/<w:jc w:val="(\w+)"/) || [])[1], pb = /<w:pageBreakBefore\/>/.test(p);
  const sb = Number((p.match(/w:before="(\d+)"/) || [])[1] || 0) / 20, sa = Number((p.match(/w:after="(\d+)"/) || [])[1] || 0) / 20;
  let isi = "", halaman = false;
  for (const r of p.match(/<w:r>[\s\S]*?<\/w:r>|<w:fldSimple[\s\S]*?<\/w:fldSimple>/g) || []) {
    if (r.startsWith("<w:fldSimple")) { if (!/Halaman/.test(isi)) continue; isi = isi.replace(/>Halaman : </, ">Halaman : sesuai Word<"); halaman = true; continue; }
    const emb = (r.match(/r:embed="([^"]+)"/) || [])[1];
    if (emb) { const cx = Number((r.match(/<wp:extent cx="(\d+)"/) || [])[1]) / 360000; isi += media[emb] ? `<img src="${media[emb]}" style="width:${cx}cm">` : ""; continue; }
    const t = ent((r.match(/<w:t[^>]*>([^<]*)<\/w:t>/) || [])[1] || ""); if (!t || (halaman && t === " dari ")) continue;
    const sz = Number((r.match(/<w:sz w:val="(\d+)"/) || [])[1] || 20) / 2, warna = (r.match(/<w:color w:val="(\w+)"/) || [])[1];
    isi += `<span style="font-size:${sz}pt;${/<w:b\/>/.test(r) ? "font-weight:bold;" : ""}${/<w:i\/>/.test(r) ? "font-style:italic;" : ""}${warna ? `color:#${warna};` : ""}">${esc(t)}</span>`;
  }
  return `<p style="margin:${sb}pt 0 ${sa}pt;${jc ? `text-align:${jc === "both" ? "justify" : jc};` : ""}${pb ? "break-before:page;" : ""}">${isi || "&nbsp;"}</p>`;
}
function htmlTabel(t, media) {
  const grid = (t.match(/<w:gridCol w:w="(\d+)"\/>/g) || []).map(g => Number(g.match(/\d+/)[0])), total = grid.reduce((a, b) => a + b, 0);
  const tanpa = /<w:top w:val="nil"\/>/.test(t.slice(0, t.indexOf("</w:tblPr>")));
  const baris = potong(t.slice(7, -8), "tr").map(tr => { let k = 0; return potong(tr.replace(/^<w:tr[^>]*>/, ""), "tc").map(tc => {
    const sp = Number((tc.match(/<w:gridSpan w:val="(\d+)"/) || [])[1] || 1), vm = /<w:vMerge w:val="restart"\/>/.test(tc) ? "r" : /<w:vMerge\/>/.test(tc) ? "c" : "";
    const c = { k, sp, vm, fill: (tc.match(/w:fill="(\w+)"/) || [])[1], va: (tc.match(/<w:vAlign w:val="(\w+)"/) || [])[1], isi: potong(tc, "p").map(p => htmlPar(p, media)).join("") }; k += sp; return c; }); });
  const h = baris.map((r, y) => `<tr>${r.filter(c => c.vm !== "c").map(c => {
    let rs = 1; if (c.vm === "r") for (let z = y + 1; z < baris.length && baris[z].some(d => d.k === c.k && d.vm === "c"); z++) rs++;
    const w = grid.slice(c.k, c.k + c.sp).reduce((a, b) => a + b, 0) / total * 100;
    return `<td${c.sp > 1 ? ` colspan="${c.sp}"` : ""}${rs > 1 ? ` rowspan="${rs}"` : ""} style="width:${w.toFixed(2)}%;${c.fill ? `background:#${c.fill};` : ""}vertical-align:${c.va === "center" ? "middle" : c.va || "top"}">${c.isi}</td>`;
  }).join("")}</tr>`).join("");
  return `<table class="${tanpa ? "tanpa" : ""}">${h}</table>`;
}
async function keHtml(blob, lanskap) {
  const ambil = await ctx.UPW_ZIP.buka(await blob.arrayBuffer(), "Word"), doc = await ambil("word/document.xml"), rel = (await ambil("word/_rels/document.xml.rels")) || "";
  const media = {};
  // gambar: UPW_ZIP.buka mengembalikan teks, jadi gambar diambil dari logo sumber (nama media sama)
  const peta = { "logo-kemenpar": logo.kemenpar, "logo-poltekpar": logo.poltekpar, "logo-asean": logo.asean, "logo-banpt": logo.banpt };
  for (const m of rel.matchAll(/Id="([^"]+)"[^>]*Target="media\/([^".]+)\.png"/g)) if (peta[m[2]]) media[m[1]] = "data:image/png;base64," + Buffer.from(peta[m[2]]).toString("base64");
  const body = doc.match(/<w:body>([\s\S]*)<w:sectPr/)[1];
  const blok = []; const re = /<w:tbl>[\s\S]*?<\/w:tbl>|<w:p[ >][\s\S]*?<\/w:p>|<w:p\/>/g; let m;
  // susun blok tingkat atas berurutan (tabel tidak bersarang di dokumen rps.js)
  while ((m = re.exec(body))) blok.push(m[0].startsWith("<w:tbl>") ? htmlTabel(m[0], media) : m[0] === "<w:p/>" ? "<p>&nbsp;</p>" : htmlPar(m[0], media));
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><style>
    @page { size: A4 ${lanskap ? "landscape" : "portrait"}; margin: ${lanskap ? "1.8cm 1.5cm" : "2cm"}; }
    body { font-family: "Times New Roman", Times, serif; font-size: 10pt; margin: 0; }
    table { border-collapse: collapse; width: 100%; table-layout: fixed; margin: 0; page-break-inside: auto; }
    tr { page-break-inside: avoid; } td { border: 0.6pt solid #000; padding: 2pt 4pt; word-wrap: break-word; }
    table.tanpa td { border: none; } p { margin: 0; } img { display: block; margin: 2pt auto; }
    .tanda { text-align: right; font: italic 8pt sans-serif; color: #b00; margin-bottom: 3pt; }
  </style></head><body><div class="tanda">CONTOH — bukan dokumen resmi</div>${blok.join("")}</body></html>`;
}
fs.mkdirSync(KELUAR, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "contoh-pdf-"));
const dok = [["rps", U.buat(C.rps, logo), true], ["kontrak", U.kontrak(Rc, C.rps, logo, C.kontrak), false], ["rubrik", U.rubrik(Rc, C.rps, logo, { hanyaBerubrik: true, lms: C.kontrak.lms }), true]];
for (const [n, blob, lanskap] of dok) {
  const html = path.join(tmp, n + ".html"); fs.writeFileSync(html, await keHtml(blob, lanskap));
  execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", `--print-to-pdf=${path.join(KELUAR, n + ".pdf")}`, "file://" + html], { stdio: "ignore" });
  console.log(n + ".pdf", fs.statSync(path.join(KELUAR, n + ".pdf")).size, "byte");
}
fs.rmSync(tmp, { recursive: true, force: true });
