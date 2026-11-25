/* Mesin PDF buatan sendiri (v0.55.0), tanpa pustaka luar dan tanpa layanan luar.
   - Penulis PDF (PdfTulis): objek, halaman, huruf standar PDF (Times/Helvetica/Courier) dengan lebar huruf yang diukur di browser, gambar JPEG, tautan.
   - dariHtml(tulis, html, opsi): browser menata HTML (seperti tampilan di layar), lalu setiap kata, garis, latar, dan gambar ditulis ke PDF pada posisi yang sama
     → hasil persis seperti pratinjau, dipotong per halaman A4 di antara baris (tidak memotong baris teks).
   - docxKeHtml(buf): Word (.docx) → HTML (paragraf, huruf tebal/miring/garis bawah, ukuran, warna, sorot, perataan, inden, tabel dengan lebar kolom, sel gabung,
     arsiran, garis, gambar, pemisah halaman, ukuran dan arah kertas). Dirancang untuk templat Word aplikasi; Word lain ditampilkan sebaik mungkin.
   - gabung(tulis, buf): menyalin halaman PDF lain apa adanya (tabel xref biasa maupun xref/objek stream, filter Flate + prediktor PNG). PDF terkunci ditolak.
   API: UPW_PDF = { PdfTulis, dariHtml, docxKeHtml, gabung, keWin }. */
(function () {
"use strict";
const G = typeof window !== "undefined" ? window : globalThis;
const PT = 0.75;   // 1 px CSS = 0,75 pt
const A4 = [595.28, 841.89];

/* ---------- teks WinAnsi ---------- */
const KHUSUS = { 0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c,
  0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
  0x017e: 0x9e, 0x0178: 0x9f };
const BALIK = {}; Object.keys(KHUSUS).forEach(k => { BALIK[KHUSUS[k]] = Number(k); });
const GANTI = { "≤": "<=", "≥": ">=", "→": "->", "←": "<-", "↑": "^", "Σ": "Jumlah ", "∑": "Jumlah ", "≈": "~", "≠": "!=", "√": "akar ", "∞": "tak hingga", "★": "*", "☐": "[ ]", "☑": "[v]", "☒": "[x]", "✘": "x", "▪": "-", "■": "-", "◦": "o", "➢": ">", "►": ">", "✓": "v", "✔": "v", "✗": "x", " ": " ", "​": "", "−": "-", "‑": "-", "‐": "-", "•": "•" };
function keWin(s) {
  const h = [];
  for (const ch of String(s)) {
    const g = GANTI[ch]; if (g !== undefined && g !== ch) { for (const c of g) h.push(kodeWin(c)); continue; }
    h.push(kodeWin(ch));
  }
  return h;
}
function kodeWin(ch) { const c = ch.codePointAt(0); if (c < 128 || (c >= 160 && c <= 255)) return c; return KHUSUS[c] || 63; }
const uniDariWin = b => b >= 128 && b < 160 ? String.fromCodePoint(BALIK[b] || 63) : String.fromCharCode(b);
const strPdf = bytes => "(" + bytes.map(b => b === 40 || b === 41 || b === 92 ? "\\" + String.fromCharCode(b) : b < 32 || b > 126 ? "\\" + b.toString(8).padStart(3, "0") : String.fromCharCode(b)).join("") + ")";
const bil = v => (Math.round(v * 100) / 100).toString();
const latin = u8 => { let s = ""; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return s; };
const keU8 = s => { const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; };

/* ---------- penulis ---------- */
const HURUF = { sans: ["Helvetica", "Helvetica-Bold", "Helvetica-Oblique", "Helvetica-BoldOblique"], serif: ["Times-Roman", "Times-Bold", "Times-Italic", "Times-BoldItalic"],
  mono: ["Courier", "Courier-Bold", "Courier-Oblique", "Courier-BoldOblique"] };
const UKUR = { sans: "Arial", serif: '"Times New Roman"', mono: '"Courier New"' };
class PdfTulis {
  constructor() { this.obj = [null]; this.halaman = []; this.huruf = {}; this.idPages = this.baru(); this.lebarCache = {}; }
  baru() { this.obj.push(null); return this.obj.length - 1; }
  set(id, isi) { this.obj[id] = isi; return id; }
  tambah(isi) { return this.set(this.baru(), isi); }
  /** Lebar 32..255 (per 1000) diukur dari huruf browser yang metriknya setara huruf standar PDF. */
  lebar(kel, v) {
    const k = kel + v; if (this.lebarCache[k]) return this.lebarCache[k];
    let w = null;
    try {
      const c = G.document && G.document.createElement("canvas"), g = c && c.getContext("2d");
      if (g) { g.font = `${v & 2 ? "italic " : ""}${v & 1 ? "bold " : ""}1000px ${UKUR[kel]}`; w = []; for (let b = 32; b <= 255; b++) w.push(Math.round(g.measureText(uniDariWin(b)).width)); }
    } catch (_) { w = null; }
    if (!w) { w = []; for (let b = 32; b <= 255; b++) w.push(kel === "mono" ? 600 : 500); }
    return (this.lebarCache[k] = w);
  }
  font(kel, v) {
    const k = kel + v; if (this.huruf[k]) return this.huruf[k];
    const id = this.tambah(`<< /Type /Font /Subtype /Type1 /BaseFont /${HURUF[kel][v]} /Encoding /WinAnsiEncoding /FirstChar 32 /LastChar 255 /Widths [${this.lebar(kel, v).join(" ")}] >>`);
    return (this.huruf[k] = { id, nama: "F" + Object.keys(this.huruf).length });
  }
  lebarTeks(kel, v, bytes, ukuran) { const w = this.lebar(kel, v); let t = 0; bytes.forEach(b => { t += b >= 32 ? w[b - 32] : 0; }); return t * ukuran / 1000; }
  /** Halaman baru: isi = string operator; sumber = { fonts: {nama: id}, gambar: {nama: id} }; annot = [id]. */
  async halamanBaru(lebar, tinggi, isi, sumber, annot) {
    const data = await kempis(keU8(isi));
    const cs = this.tambah({ kamus: `<< /Length ${data.length} /Filter /FlateDecode >>`, aliran: data });
    const f = Object.entries(sumber.fonts || {}).map(([n, id]) => `/${n} ${id} 0 R`).join(" "), gb = Object.entries(sumber.gambar || {}).map(([n, id]) => `/${n} ${id} 0 R`).join(" ");
    const id = this.tambah(`<< /Type /Page /Parent ${this.idPages} 0 R /MediaBox [0 0 ${bil(lebar)} ${bil(tinggi)}] /Contents ${cs} 0 R /Resources << /ProcSet [/PDF /Text /ImageC] /Font << ${f} >> /XObject << ${gb} >> >>${(annot || []).length ? ` /Annots [${annot.map(a => a + " 0 R").join(" ")}]` : ""} >>`);
    this.halaman.push(id); return id;
  }
  gambarJpeg(u8, w, h) { return this.tambah({ kamus: `<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${u8.length} >>`, aliran: u8 }); }
  hasil(judul) {
    this.set(this.idPages, `<< /Type /Pages /Kids [${this.halaman.map(i => i + " 0 R").join(" ")}] /Count ${this.halaman.length} >>`);
    const info = this.tambah(`<< /Producer (Repositori UPW) /Title ${strPdf(keWin(judul || "Dokumen"))} >>`), root = this.tambah(`<< /Type /Catalog /Pages ${this.idPages} 0 R >>`);
    const bag = [keU8("%PDF-1.7\n%\xe2\xe3\xcf\xd3\n")], off = [0]; let pos = bag[0].length;
    for (let i = 1; i < this.obj.length; i++) {
      const o = this.obj[i] == null ? "null" : this.obj[i]; off[i] = pos;
      const k = typeof o === "string" ? [keU8(`${i} 0 obj\n${o}\nendobj\n`)] : [keU8(`${i} 0 obj\n${o.kamus}\nstream\n`), o.aliran, keU8("\nendstream\nendobj\n")];
      k.forEach(u => { bag.push(u); pos += u.length; });
    }
    const xr = `xref\n0 ${this.obj.length}\n0000000000 65535 f \n` + off.slice(1).map(o => String(o).padStart(10, "0") + " 00000 n \n").join("");
    bag.push(keU8(xr + `trailer\n<< /Size ${this.obj.length} /Root ${root} 0 R /Info ${info} 0 R >>\nstartxref\n${pos}\n%%EOF\n`));
    const n = bag.reduce((a, u) => a + u.length, 0), out = new Uint8Array(n); let p = 0; bag.forEach(u => { out.set(u, p); p += u.length; });
    return out;
  }
}
async function kempis(u8) {
  if (typeof CompressionStream === "undefined") throw new Error("Browser tidak mendukung kompresi (perbarui browser).");
  return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new CompressionStream("deflate"))).arrayBuffer());
}
async function mekar(u8) { return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream("deflate"))).arrayBuffer()); }

/* ---------- HTML → PDF (tata letak oleh browser) ---------- */
const warna = s => { const m = String(s || "").match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/); if (!m) return null; if (m[4] !== undefined && Number(m[4]) < 0.05) return null; return [m[1], m[2], m[3]].map(v => bil(Number(v) / 255)).join(" "); };
const kelompok = ff => /courier|mono/i.test(ff) ? "mono" : /times|serif|georgia|cambria|garamond|book/i.test(ff) && !/sans/i.test(ff) ? "serif" : "sans";
const GAYA_RENDER = `.pdf-render{position:absolute;left:-30000px;top:0;background:#fff;color:#000}
.pdf-render,.pdf-render *{font-family:Arial,Helvetica,sans-serif!important;-webkit-font-smoothing:auto}
.pdf-render .serif,.pdf-render .serif *{font-family:"Times New Roman",Times,serif!important}
.pdf-render .sans,.pdf-render .sans *{font-family:Arial,Helvetica,sans-serif!important}
.pdf-render .mono,.pdf-render .mono *{font-family:"Courier New",Courier,monospace!important}
.pdf-render .kertas{border:0!important;box-shadow:none!important;padding:0!important;margin:0!important;min-width:0!important;border-radius:0!important;background:#fff}
.pdf-render .kertas+.kertas{break-before:page}`;
async function tungguGambar(el) {
  const l = [...el.querySelectorAll("img")].filter(i => !i.complete);
  await Promise.all(l.map(i => new Promise(ok => { i.onload = i.onerror = ok; setTimeout(ok, 8000); })));
}
async function keJpeg(src, lebarPx, tinggiPx, skala) {
  const im = new Image(); im.crossOrigin = "anonymous";
  await new Promise(ok => { im.onload = im.onerror = ok; im.src = src; setTimeout(ok, 8000); });
  const w = Math.max(1, Math.round(Math.min(2400, (im.naturalWidth || lebarPx) * (skala || 1)))), h = Math.max(1, Math.round(w * ((im.naturalHeight || tinggiPx) / (im.naturalWidth || lebarPx))));
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); if (skala > 1) g.imageSmoothingEnabled = false; g.drawImage(im, 0, 0, w, h);
  const b = await new Promise(ok => c.toBlob(ok, "image/jpeg", 0.92));
  return { u8: new Uint8Array(await b.arrayBuffer()), w, h };
}
/** opsi: { lebar, tinggi (pt), margin: [atas, kanan, bawah, kiri] pt, marginAtasPertama, judul } */
async function dariHtml(tulis, html, o) {
  o = o || {};
  const W = o.lebar || A4[0], H = o.tinggi || A4[1], M = o.margin || [56.7, 56.7, 56.7, 56.7], M1 = o.marginAtasPertama != null ? o.marginAtasPertama : M[0];
  if (!document.getElementById("gayaPdfRender")) { const st = document.createElement("style"); st.id = "gayaPdfRender"; st.textContent = GAYA_RENDER; document.head.appendChild(st); }
  const wrap = document.createElement("div"); wrap.className = "pdf-render" + (o.kelas ? " " + o.kelas : ""); wrap.style.width = ((W - M[1] - M[3]) / PT) + "px"; wrap.innerHTML = html;
  document.body.appendChild(wrap);
  try {
    // Huruf di luar WinAnsi (huruf standar PDF) diganti SEBELUM ditata agar lebar dan posisi tetap tepat.
    const jt = document.createTreeWalker(wrap, NodeFilter.SHOW_TEXT); let tn;
    while ((tn = jt.nextNode())) { const v = tn.data; let baru = ""; for (const ch of v) { const g = GANTI[ch]; baru += g !== undefined ? g : kodeWin(ch) === 63 && ch !== "?" ? "?" : ch; } if (baru !== v) tn.data = baru; }
    await tungguGambar(wrap);
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const dasar = wrap.getBoundingClientRect(), X0 = dasar.left, Y0 = dasar.top, item = [], atom = [], paksa = [];
    const r = e => { const b = e.getBoundingClientRect(); return { x: b.left - X0, y: b.top - Y0, w: b.width, h: b.height }; };
    const jalan = document.createTreeWalker(wrap, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let n = jalan.currentNode, svgLewat = null, hitungEl = 0;
    const ukurAsc = {};
    while ((n = jalan.nextNode())) {
      if (svgLewat && svgLewat.contains(n)) continue;
      if (n.nodeType === 1) {
        const st = getComputedStyle(n); if (st.display === "none" || st.visibility === "hidden") continue;
        const b = r(n); if (b.w <= 0 && b.h <= 0) continue;
        if ((st.breakBefore === "page" || st.pageBreakBefore === "always") && b.y > 1) paksa.push(b.y);
        const bg = warna(st.backgroundColor);
        if (bg && bg !== "1 1 1") { if (st.display === "inline") [...n.getClientRects()].forEach(c => item.push({ t: "kotak", x: c.left - X0, y: c.top - Y0, w: c.width, h: c.height, warna: bg })); else item.push({ t: "kotak", ...b, w: b.w, warna: bg }); }
        [["Top", b.x, b.y, b.x + b.w, b.y], ["Bottom", b.x, b.y + b.h, b.x + b.w, b.y + b.h], ["Left", b.x, b.y, b.x, b.y + b.h], ["Right", b.x + b.w, b.y, b.x + b.w, b.y + b.h]].forEach(([s, x1, y1, x2, y2]) => {
          const tb = parseFloat(st["border" + s + "Width"]) || 0, gs = st["border" + s + "Style"]; if (tb <= 0 || gs === "none" || gs === "hidden") return;
          const wa = warna(st["border" + s + "Color"]); if (!wa) return;
          const d = tb / 2, geser = s === "Top" ? [0, d] : s === "Bottom" ? [0, -d] : s === "Left" ? [d, 0] : [-d, 0];
          item.push({ t: "garis", x1: x1 + geser[0], y1: y1 + geser[1], x2: x2 + geser[0], y2: y2 + geser[1], tebal: tb, warna: wa, y: Math.min(y1, y2), h: Math.abs(y2 - y1) });
        });
        if (n.tagName === "TR" && b.h < 0.35 * (H - M[0] - M[2]) / PT) atom.push([b.y, b.y + b.h]);   // baris tabel tidak dipotong (kecuali sangat tinggi)
        if (n.tagName === "IMG" && n.src) { item.push({ t: "img", src: n.src, ...b }); atom.push([b.y, b.y + b.h]); }
        if (n.tagName === "svg" || n.tagName === "SVG") { const s = new XMLSerializer().serializeToString(n); item.push({ t: "img", src: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s), ...b, tajam: true }); atom.push([b.y, b.y + b.h]); svgLewat = n; continue; }
        if (n.tagName === "A" && n.href && /^https?:/i.test(n.href)) [...n.getClientRects()].forEach(c => item.push({ t: "tautan", url: n.href, x: c.left - X0, y: c.top - Y0, w: c.width, h: c.height }));
        continue;
      }
      const el = n.parentElement; if (!el || !n.data.trim()) continue;
      const idEl = el.__pdfId || (el.__pdfId = ++hitungEl);
      const st = getComputedStyle(el); if (st.visibility === "hidden") continue;
      const kel = kelompok(st.fontFamily), v = (parseInt(st.fontWeight, 10) >= 600 ? 1 : 0) + (st.fontStyle === "italic" || st.fontStyle === "oblique" ? 2 : 0);
      const ukuran = parseFloat(st.fontSize) || 16, wa = warna(st.color) || "0 0 0", garisBawah = /underline/.test(st.textDecorationLine || st.textDecoration || "");
      const kunciA = kel + v; if (!ukurAsc[kunciA]) { try { const c = document.createElement("canvas").getContext("2d"); c.font = `${v & 2 ? "italic " : ""}${v & 1 ? "bold " : ""}100px ${UKUR[kel]}`; const m = c.measureText("Hg"); ukurAsc[kunciA] = [m.fontBoundingBoxAscent / 100 || 0.9, m.fontBoundingBoxDescent / 100 || 0.22]; } catch (_) { ukurAsc[kunciA] = [0.9, 0.22]; } }
      const [asc, desc] = ukurAsc[kunciA], re = /\S+/g; let m;
      const rg = document.createRange();
      const pasang = (a, z) => {
        rg.setStart(n, a); rg.setEnd(n, z); const rs = [...rg.getClientRects()].filter(c => c.width > 0);
        if (rs.length === 1 || z - a === 1) { rs.forEach(c => { const y = c.top - Y0, hh = c.height, garisDasar = y + (hh - (asc + desc) * ukuran) / 2 + asc * ukuran;
            item.push({ t: "teks", s: n.data.slice(a, z), x: c.left - X0, y, w: c.width, h: hh, dasar: garisDasar, kel, v, ukuran, warna: wa, bawah: garisBawah, el: idEl }); atom.push([y, y + hh]); }); return; }
        let mulai = a; for (let i = a + 1; i <= z; i++) { rg.setStart(n, mulai); rg.setEnd(n, i); if (rg.getClientRects().length > 1) { pasang(mulai, i - 1); mulai = i - 1; } } pasang(mulai, z);
      };
      while ((m = re.exec(n.data))) pasang(m.index, m.index + m[0].length);
    }
    // pemotongan halaman: di antara baris; pemisah paksa (break-before: page)
    const tinggiTotal = Math.max(wrap.scrollHeight, ...item.map(i => (i.y || 0) + (i.h || 0)), 1), halaman = [];
    let awal = 0, pertama = true;
    paksa.sort((a, b) => a - b);
    while (awal < tinggiTotal - 0.5) {
      const muat = (H - (pertama ? M1 : M[0]) - M[2]) / PT; let batas = awal + muat;
      const p = paksa.find(y => y > awal + 1 && y <= batas); if (p) batas = p;
      else if (batas < tinggiTotal) { let c = batas, ubah = true; while (ubah) { ubah = false; atom.forEach(([t, b]) => { if (t < c - 0.5 && b > c + 0.5 && t > awal + 1) { c = t; ubah = true; } }); } if (c > awal + 20) batas = c; }
      halaman.push([awal, Math.min(batas, tinggiTotal), pertama]); awal = batas; pertama = false;
    }
    // gambar (sekali per sumber)
    const gbr = {};
    for (const i of item.filter(i => i.t === "img")) {
      const k = i.src + (i.tajam ? "#t" : ""); if (gbr[k]) continue;
      try { const j = await keJpeg(i.src, i.w, i.h, i.tajam ? Math.max(4, 600 / Math.max(1, i.w)) : 2); gbr[k] = { id: tulis.gambarJpeg(j.u8, j.w, j.h), nama: "Im" + Object.keys(gbr).length }; } catch (_) { /* lewati gambar yang gagal */ }
    }
    for (const [a, z, pertamaH] of halaman) {
      const mt = pertamaH ? M1 : M[0], ops = [], sumber = { fonts: {}, gambar: {} }, annot = [];
      const X = x => bil(M[3] + x * PT), Y = y => bil(H - mt - (y - a) * PT);
      ops.push(`q ${bil(M[3] - 2)} ${bil(M[2] - 2)} ${bil(W - M[1] - M[3] + 4)} ${bil(H - mt - M[2] + 4)} re W n`);
      const di = i => i.y + (i.h || 0) > a + 0.01 && i.y < z - 0.01;
      item.filter(i => i.t === "kotak" && di(i)).forEach(i => ops.push(`${i.warna} rg ${X(i.x)} ${Y(i.y + i.h)} ${bil(i.w * PT)} ${bil(i.h * PT)} re f`));
      item.filter(i => i.t === "img" && di(i)).forEach(i => { const g = gbr[i.src + (i.tajam ? "#t" : "")]; if (!g) return; sumber.gambar[g.nama] = g.id; ops.push(`q ${bil(i.w * PT)} 0 0 ${bil(i.h * PT)} ${X(i.x)} ${Y(i.y + i.h)} cm /${g.nama} Do Q`); });
      item.filter(i => i.t === "garis" && di(i)).forEach(i => ops.push(`${i.warna} RG ${bil(i.tebal * PT)} w ${X(i.x1)} ${Y(i.y1)} m ${X(i.x2)} ${Y(i.y2)} l S`));
      item.filter(i => i.t === "teks" && i.y >= a - 0.5 && i.y + i.h <= z + 0.5).forEach(i => {
        const f = tulis.font(i.kel, i.v), b = keWin(i.s), u = i.ukuran * PT, lw = tulis.lebarTeks(i.kel, i.v, b, u), target = i.w * PT;
        sumber.fonts[f.nama] = f.id;
        const tz = lw > 0 && Math.abs(target / lw - 1) > 0.02 ? ` ${bil(target / lw * 100)} Tz` : " 100 Tz";
        ops.push(`BT ${i.warna} rg /${f.nama} ${bil(u)} Tf${tz} ${X(i.x)} ${Y(i.dasar)} Td ${strPdf(b)} Tj ET`);
      });
      // garis bawah: satu garis per elemen per baris (menyambung spasi antarkata, seperti di layar)
      const gb = {}; item.filter(i => i.t === "teks" && i.bawah && i.y >= a - 0.5 && i.y + i.h <= z + 0.5).forEach(i => { const k = i.el + "|" + Math.round(i.dasar); const g = gb[k] || (gb[k] = { x1: i.x, x2: i.x + i.w, i }); g.x1 = Math.min(g.x1, i.x); g.x2 = Math.max(g.x2, i.x + i.w); });
      Object.values(gb).forEach(({ x1, x2, i }) => { const u = i.ukuran * PT, y = bil(Number(Y(i.dasar)) - u * 0.12); ops.push(`${i.warna} RG ${bil(u / 18)} w ${X(x1)} ${y} m ${X(x2)} ${y} l S`); });
      ops.push("Q");
      item.filter(i => i.t === "tautan" && di(i)).forEach(i => annot.push(tulis.tambah(`<< /Type /Annot /Subtype /Link /Rect [${X(i.x)} ${Y(i.y + i.h)} ${X(i.x + i.w)} ${Y(i.y)}] /Border [0 0 0] /A << /S /URI /URI ${strPdf(keWin(i.url))} >> >>`)));
      await tulis.halamanBaru(W, H, ops.join("\n"), sumber, annot);
    }
    return halaman.length;
  } finally { wrap.remove(); }
}

/* ---------- Word (.docx) → HTML ---------- */
const atr = (xml, tag, a) => { const m = xml.match(new RegExp(`<w:${tag}\\b[^>]*\\bw:${a}="([^"]*)"`)); return m ? m[1] : null; };
const ada = (xml, tag) => { const m = xml.match(new RegExp(`<w:${tag}\\b([^>]*)/?>`)); if (!m) return false; const v = (m[1].match(/w:val="([^"]*)"/) || [])[1]; return v === undefined || !/^(0|false|none|off)$/i.test(v); };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ent = s => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&amp;/g, "&");
const SOROT = { yellow: "#ffff00", green: "#00ff00", cyan: "#00ffff", magenta: "#ff00ff", blue: "#0000ff", red: "#ff0000", darkBlue: "#000080", darkCyan: "#008080", darkGreen: "#008000",
  darkMagenta: "#800080", darkRed: "#800000", darkYellow: "#808000", darkGray: "#808080", lightGray: "#c0c0c0", black: "#000000" };
/** Potongan tingkat atas untuk tag (abaikan yang bersarang di tabel). */
function potongAtas(s, tags) {
  const h = [], re = /<w:tbl>|<\/w:tbl>|<w:(p|tbl|tr|tc)\b[^>]*?(\/?)>|<\/w:(p|tr|tc)>/g; let d = 0, a = -1, tagA = "", m;
  while ((m = re.exec(s))) {
    const g = m[0];
    if (g === "<w:tbl>") { if (d === 0 && tags.includes("tbl")) { a = m.index; tagA = "tbl"; } d++; continue; }
    if (g === "</w:tbl>") { d--; if (d === 0 && tagA === "tbl") { h.push(["tbl", s.slice(a, m.index + g.length)]); tagA = ""; } continue; }
    if (d > 0) continue;
    if (m[1] && tags.includes(m[1]) && !tagA) { if (m[2] === "/") { h.push([m[1], g]); continue; } a = m.index; tagA = m[1]; continue; }
    if (m[3] && m[3] === tagA) { h.push([tagA, s.slice(a, m.index + g.length)]); tagA = ""; }
  }
  return h;
}
async function docxKeHtml(buf) {
  const ambil = await G.UPW_ZIP.buka(buf, "Word (.docx)"), doc = await ambil("word/document.xml");
  if (!doc) throw new Error("Berkas bukan dokumen Word (.docx) yang sah.");
  const rels = (await ambil("word/_rels/document.xml.rels")) || "", gaya = (await ambil("word/styles.xml")) || "", relMap = {};
  (rels.match(/<Relationship\b[^>]*>/g) || []).forEach(r => { const id = (r.match(/Id="([^"]+)"/) || [])[1], t = (r.match(/Target="([^"]+)"/) || [])[1]; if (id && t) relMap[id] = t; });
  const dd = (gaya.match(/<w:docDefaults>[\s\S]*?<\/w:docDefaults>/) || [""])[0];
  const ukuranDasar = Number(atr(dd, "sz", "val") || 22) / 2, fontDasar = atr(dd, "rFonts", "ascii") || "Times New Roman";
  const gbrCache = {};
  const gambar = async rid => {
    if (gbrCache[rid] !== undefined) return gbrCache[rid];
    const t = relMap[rid]; if (!t) return (gbrCache[rid] = "");
    const b = await ambil.biner("word/" + t.replace(/^\/?word\//, "").replace(/^\.\//, "")); if (!b) return (gbrCache[rid] = "");
    const ext = (t.split(".").pop() || "").toLowerCase(), mime = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : "image/jpeg";
    let s = ""; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode.apply(null, b.subarray(i, i + 8192));
    return (gbrCache[rid] = `data:${mime};base64,${btoa(s)}`);
  };
  const kelasFont = f => /arial|calibri|helvetica|segoe|verdana|tahoma|carlito|sans/i.test(f || "") ? "sans" : /courier|consolas|mono/i.test(f || "") ? "mono" : "serif";
  const twip = v => Number(v || 0) / 20;   // pt
  async function runHtml(r) {
    const pr = (r.match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [""])[0];
    const css = [];
    if (ada(pr, "b")) css.push("font-weight:700"); if (ada(pr, "i")) css.push("font-style:italic");
    const u = atr(pr, "u", "val"); if (u && u !== "none") css.push("text-decoration:underline");
    const sz = atr(pr, "sz", "val"); if (sz) css.push(`font-size:${Number(sz) / 2}pt`);
    const c = atr(pr, "color", "val"); if (c && /^[0-9a-f]{6}$/i.test(c)) css.push(`color:#${c}`);
    const hl = atr(pr, "highlight", "val"); if (hl && SOROT[hl]) css.push(`background:${SOROT[hl]}`);
    const sh = atr(pr, "shd", "fill"); if (!hl && sh && /^[0-9a-f]{6}$/i.test(sh)) css.push(`background:#${sh}`);
    if (ada(pr, "vertAlign") && atr(pr, "vertAlign", "val") === "superscript") css.push("vertical-align:super;font-size:smaller");
    const f = atr(pr, "rFonts", "ascii");
    let isi = "";
    const re = /<w:t\b[^>]*>([^<]*)<\/w:t>|<w:tab\/>|<w:br\b([^>]*)\/>|<w:drawing>[\s\S]*?<\/w:drawing>|<w:sym\b[^>]*\/>/g; let m;
    while ((m = re.exec(r))) {
      if (m[1] !== undefined) isi += esc(ent(m[1]));
      else if (m[0] === "<w:tab/>") isi += '<span style="display:inline-block;width:36pt"></span>';
      else if (m[0].startsWith("<w:br")) isi += /type="page"/.test(m[2] || "") ? '<span style="display:block;break-before:page"></span>' : "<br>";
      else if (m[0].startsWith("<w:drawing")) {
        const rid = (m[0].match(/r:embed="([^"]+)"/) || [])[1], cx = Number((m[0].match(/<wp:extent cx="(\d+)"/) || [])[1] || 0), cy = Number((m[0].match(/<wp:extent[^>]*cy="(\d+)"/) || [])[1] || 0);
        const src = rid ? await gambar(rid) : ""; if (src) isi += `<img src="${src}" style="width:${cx / 12700}pt;height:${cy / 12700}pt;vertical-align:bottom">`;
      }
    }
    if (!isi) return "";
    return `<span class="${kelasFont(f)}"${css.length ? ` style="${css.join(";")}"` : ""}>${isi}</span>`;
  }
  async function parHtml(p, dalamSel) {
    const pr = (p.match(/<w:pPr>[\s\S]*?<\/w:pPr>/) || [""])[0], css = ["margin:0"], prR = pr.replace(/<w:rPr>[\s\S]*?<\/w:rPr>/, "");
    const jc = atr(prR, "jc", "val"); if (jc) css.push("text-align:" + ({ both: "justify", distribute: "justify", center: "center", right: "right", end: "right" }[jc] || "left"));
    const sb = atr(prR, "spacing", "before"), sa = atr(prR, "spacing", "after"), ln = atr(prR, "spacing", "line"), lr = atr(prR, "spacing", "lineRule");
    css.push(`margin-top:${twip(sb)}pt`, `margin-bottom:${sa != null ? twip(sa) : dalamSel ? 0 : 8}pt`);
    css.push(`line-height:${ln && (!lr || lr === "auto") ? Math.max(1, Number(ln) / 240 * 1.15) : 1.15}`);
    const il = atr(prR, "ind", "left") || atr(prR, "ind", "start"), hg = atr(prR, "ind", "hanging"), fl = atr(prR, "ind", "firstLine");
    if (il) css.push(`padding-left:${twip(il)}pt`); if (hg) css.push(`text-indent:-${twip(hg)}pt`); else if (fl) css.push(`text-indent:${twip(fl)}pt`);
    if (ada(prR, "pageBreakBefore")) css.push("break-before:page");
    const sh = atr(prR, "shd", "fill"); if (sh && /^[0-9a-f]{6}$/i.test(sh)) css.push(`background:#${sh}`);
    let isi = /<w:numPr>/.test(prR) ? "• " : "";
    const runs = p.match(/<w:r\b[^>]*>[\s\S]*?<\/w:r>|<w:hyperlink\b[^>]*>[\s\S]*?<\/w:hyperlink>/g) || [];
    for (const r of runs) {
      if (r.startsWith("<w:hyperlink")) { const id = (r.match(/r:id="([^"]+)"/) || [])[1], url = id && relMap[id]; let t = ""; for (const rr of r.match(/<w:r\b[^>]*>[\s\S]*?<\/w:r>/g) || []) t += await runHtml(rr); isi += url && /^https?:/.test(url) ? `<a href="${esc(url)}">${t}</a>` : t; }
      else isi += await runHtml(r);
    }
    const ukuranPar = atr(pr, "sz", "val"); if (ukuranPar) css.push(`font-size:${Number(ukuranPar) / 2}pt`);
    return `<p style="${css.join(";")}">${isi || "&nbsp;"}</p>`;
  }
  async function tblHtml(t) {
    const tp = (t.match(/<w:tblPr>[\s\S]*?<\/w:tblPr>/) || [""])[0], grid = (t.match(/<w:gridCol\b[^>]*w:w="(\d+)"/g) || []).map(g => Number(g.match(/w:w="(\d+)"/)[1]));
    const tanpaGaris = /<w:tblBorders>[\s\S]*?<\/w:tblBorders>/.test(tp) && !/w:val="(single|double|thick|dashed|dotted)"/.test((tp.match(/<w:tblBorders>[\s\S]*?<\/w:tblBorders>/) || [""])[0]);
    const dalam = t.slice(t.indexOf(">") + 1, t.lastIndexOf("</w:tbl>"));
    const baris = potongAtas(dalam, ["tr"]).map(([, tr]) => potongAtas(tr.slice(tr.indexOf(">") + 1), ["tc"]).map(([, tc]) => {
      const pr = (tc.match(/<w:tcPr>[\s\S]*?<\/w:tcPr>/) || [""])[0];
      return { tc, sp: Number(atr(pr, "gridSpan", "val") || 1), vm: /<w:vMerge\b/.test(pr) ? (/w:val="restart"/.test(pr.match(/<w:vMerge\b[^>]*>/)[0]) ? "r" : "c") : "", fill: atr(pr, "shd", "fill"), va: atr(pr, "vAlign", "val"), rs: 1 };
    }));
    // rowspan untuk vMerge
    const posisi = baris.map(r => { let k = 0; return r.map(c => { const p = k; k += c.sp; return p; }); });
    baris.forEach((r, i) => r.forEach((c, j) => { if (c.vm !== "c") return; for (let a = i - 1; a >= 0; a--) { const q = baris[a].findIndex((x, jj) => posisi[a][jj] === posisi[i][j]); if (q >= 0 && baris[a][q].vm !== "c") { baris[a][q].rs++; break; } } }));
    const garis = tanpaGaris ? "none" : "0.5pt solid #000";
    let h = `<table style="border-collapse:collapse;width:${grid.length ? twip(grid.reduce((a, b) => a + b, 0)) + "pt" : "100%"};margin:0 0 4pt;table-layout:fixed">`;
    if (grid.length) h += `<colgroup>${grid.map(g => `<col style="width:${twip(g)}pt">`).join("")}</colgroup>`;
    for (const r of baris) {
      h += "<tr>";
      for (const c of r) {
        if (c.vm === "c") continue;
        let isi = ""; for (const [jenis, x] of potongAtas(c.tc.slice(c.tc.indexOf(">") + 1), ["p", "tbl"])) isi += jenis === "p" ? await parHtml(x, true) : await tblHtml(x);
        h += `<td${c.sp > 1 ? ` colspan="${c.sp}"` : ""}${c.rs > 1 ? ` rowspan="${c.rs}"` : ""} style="border:${garis};padding:1pt 4pt;vertical-align:${c.va === "center" ? "middle" : c.va === "bottom" ? "bottom" : "top"}${c.fill && /^[0-9a-f]{6}$/i.test(c.fill) ? ";background:#" + c.fill : ""};word-wrap:break-word">${isi}</td>`;
      }
      h += "</tr>";
    }
    return h + "</table>";
  }
  const body = (doc.match(/<w:body>([\s\S]*)<\/w:body>/) || [])[1] || "";
  const sect = (body.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>\s*$/) || body.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/g) || [""]).slice(-1)[0] || "";
  let html = "";
  for (const [jenis, x] of potongAtas(body, ["p", "tbl"])) html += jenis === "p" ? await parHtml(x, false) : await tblHtml(x);
  const pw = atr(sect, "pgSz", "w"), ph = atr(sect, "pgSz", "h");
  const lebar = pw ? twip(pw) : A4[0], tinggi = ph ? twip(ph) : A4[1];
  const mg = ["top", "right", "bottom", "left"].map(k => { const v = atr(sect, "pgMar", k); return v != null ? Math.max(18, twip(v)) : 56.7; });
  return { html: `<div class="${kelasFont(fontDasar)}" style="font-size:${ukuranDasar}pt;color:#000;line-height:1.15">${html}</div>`, lebar, tinggi, margin: mg };
}

/* ---------- penggabung PDF ---------- */
const SPASI = /[\0\t\n\f\r ]/, PEMISAH = /[\0\t\n\f\r ()<>\[\]{}\/%]/;
function lexer(s) {
  let i = 0;
  const lewat = () => { for (;;) { while (i < s.length && SPASI.test(s[i])) i++; if (s[i] === "%") { while (i < s.length && s[i] !== "\n" && s[i] !== "\r") i++; } else break; } };
  function nilai() {
    lewat();
    const c = s[i];
    if (c === "<" && s[i + 1] === "<") { i += 2; const m = new Map(); for (;;) { lewat(); if (s[i] === ">" && s[i + 1] === ">") { i += 2; break; } if (s[i] !== "/") throw new Error("PDF: kamus rusak"); const k = nama(); m.set(k, nilai()); } return { t: "d", v: m }; }
    if (c === "[") { i++; const a = []; for (;;) { lewat(); if (s[i] === "]") { i++; break; } a.push(nilai()); } return { t: "a", v: a }; }
    if (c === "(") { const a = i; let d = 0; for (; i < s.length; i++) { if (s[i] === "\\") { i++; continue; } if (s[i] === "(") d++; else if (s[i] === ")") { d--; if (d === 0) { i++; break; } } } return { t: "x", v: s.slice(a, i) }; }
    if (c === "<") { const a = i; i = s.indexOf(">", i) + 1; return { t: "x", v: s.slice(a, i) }; }
    if (c === "/") return { t: "n", v: nama() };
    const a = i; while (i < s.length && !PEMISAH.test(s[i])) i++;
    const kata = s.slice(a, i);
    if (/^\d+$/.test(kata)) { const simpan = i; lewat(); const b = i; while (i < s.length && /\d/.test(s[i])) i++; const g = s.slice(b, i);
      if (g) { lewat(); if (s[i] === "R" && (i + 1 >= s.length || PEMISAH.test(s[i + 1]))) { i++; return { t: "r", n: Number(kata), g: Number(g) }; } } i = simpan; }
    if (!kata) throw new Error("PDF: token tak dikenal di posisi " + i);
    return { t: "x", v: kata };
  }
  function nama() { const a = i; i++; while (i < s.length && !PEMISAH.test(s[i])) i++; return s.slice(a, i); }
  return { nilai, get pos() { return i; }, set pos(v) { i = v; }, lewat };
}
const ambilK = (d, k) => d && d.t === "d" ? d.v.get(k) : undefined;
function serial(v, peta) {
  if (!v) return "null";
  if (v.t === "d") return "<<" + [...v.v].map(([k, x]) => k + " " + serial(x, peta)).join(" ") + ">>";
  if (v.t === "a") return "[" + v.v.map(x => serial(x, peta)).join(" ") + "]";
  if (v.t === "r") { const n = peta(v.n); return n ? n + " 0 R" : "null"; }
  return v.v;
}
async function prediktor(u8, parms) {
  const pred = Number((ambilK(parms, "/Predictor") || {}).v || 1); if (pred < 10) return u8;
  const kol = Number((ambilK(parms, "/Columns") || {}).v || 1), colors = Number((ambilK(parms, "/Colors") || {}).v || 1), bpc = Number((ambilK(parms, "/BitsPerComponent") || {}).v || 8);
  const bpp = Math.max(1, Math.round(colors * bpc / 8)), baris = Math.ceil(kol * colors * bpc / 8), out = new Uint8Array(Math.floor(u8.length / (baris + 1)) * baris); let atas = new Uint8Array(baris);
  for (let r = 0, p = 0; p + baris + 1 <= u8.length; r++, p += baris + 1) {
    const f = u8[p], row = u8.subarray(p + 1, p + 1 + baris), cur = new Uint8Array(baris);
    for (let x = 0; x < baris; x++) { const kiri = x >= bpp ? cur[x - bpp] : 0, up = atas[x], ul = x >= bpp ? atas[x - bpp] : 0;
      cur[x] = (row[x] + (f === 1 ? kiri : f === 2 ? up : f === 3 ? (kiri + up) >> 1 : f === 4 ? (() => { const pa = Math.abs(up - ul), pb = Math.abs(kiri - ul), pc = Math.abs(kiri + up - 2 * ul); return pa <= pb && pa <= pc ? kiri : pb <= pc ? up : ul; })() : 0)) & 255; }
    out.set(cur, r * baris); atas = cur;
  }
  return out;
}
async function bukaPdf(u8) {
  const s = latin(u8), obj = new Map(), stm = new Map();
  if (!/^%PDF-/.test(s.slice(0, 1024).replace(/^[^%]*/, ""))) throw new Error("Berkas bukan PDF yang sah.");
  let trailer = null;
  const bacaObjDi = (pos) => {
    const L = lexer(s); L.pos = pos; L.lewat();
    const m = /^(\d+)\s+(\d+)\s+obj\b/.exec(s.slice(L.pos, L.pos + 40)); if (!m) return null;
    L.pos += m[0].length; const v = L.nilai(); L.lewat();
    if (s.startsWith("stream", L.pos)) {
      let a = L.pos + 6; if (s[a] === "\r") a++; if (s[a] === "\n") a++;
      let len = ambilK(v, "/Length"), n = len && len.t === "x" ? Number(len.v) : NaN;
      if (len && len.t === "r") { const lo = cariObj(len.n); n = lo && lo.v && lo.v.t === "x" ? Number(lo.v.v) : NaN; }
      if (!(n >= 0) || !s.startsWith("endstream", s.slice(a + n, a + n + 20).search(/\S/) + a + n)) { const e = s.indexOf("endstream", a); n = e - a; while (n > 0 && (s[a + n - 1] === "\n" || s[a + n - 1] === "\r")) n--; }
      return { n: Number(m[1]), v, data: u8.subarray(a, a + n) };
    }
    return { n: Number(m[1]), v };
  };
  const posObj = new Map();
  const cariObj = n => { if (obj.has(n)) return obj.get(n); const p = posObj.get(n); if (p == null) return null; const o = bacaObjDi(p); if (o) obj.set(n, o); return o; };
  async function bacaXref(pos, sudah) {
    if (sudah.has(pos) || pos <= 0 || pos >= s.length) return; sudah.add(pos);
    const L = lexer(s); L.pos = pos; L.lewat();
    if (s.startsWith("xref", L.pos)) {
      L.pos += 4;
      for (;;) {
        L.lewat(); if (s.startsWith("trailer", L.pos)) { L.pos += 7; break; }
        const m = /^(\d+)\s+(\d+)/.exec(s.slice(L.pos, L.pos + 40)); if (!m) throw new Error("xref rusak");
        L.pos += m[0].length; const awal = Number(m[1]), jml = Number(m[2]);
        for (let k = 0; k < jml; k++) { L.lewat(); const e = s.slice(L.pos, L.pos + 18); L.pos += 18; const mm = /^(\d{10}) (\d{5}) ([nf])/.exec(e); if (mm && mm[3] === "n" && !posObj.has(awal + k)) posObj.set(awal + k, Number(mm[1])); }
      }
      const t = L.nilai(); if (!trailer) trailer = t;
      const xs = ambilK(t, "/XRefStm"); if (xs) await bacaXref(Number(xs.v), sudah);
      const pv = ambilK(t, "/Prev"); if (pv) await bacaXref(Number(pv.v), sudah);
      return;
    }
    const o = bacaObjDi(pos); if (!o || !o.data) throw new Error("xref rusak");
    if (!trailer) trailer = o.v;
    let d = o.data; if (ambilK(o.v, "/Filter")) d = await prediktor(await mekar(d), ambilK(o.v, "/DecodeParms"));
    const w = ambilK(o.v, "/W").v.map(x => Number(x.v)), sz = Number(ambilK(o.v, "/Size").v), idx = ambilK(o.v, "/Index") ? ambilK(o.v, "/Index").v.map(x => Number(x.v)) : [0, sz];
    const baca = (p, n) => { let v = 0; for (let k = 0; k < n; k++) v = v * 256 + d[p + k]; return v; }, lebar = w[0] + w[1] + w[2];
    let p = 0;
    for (let q = 0; q < idx.length; q += 2) for (let k = 0; k < idx[q + 1]; k++, p += lebar) {
      const tipe = w[0] ? baca(p, w[0]) : 1, a = baca(p + w[0], w[1]), b = baca(p + w[0] + w[1], w[2]), n = idx[q] + k;
      if (posObj.has(n) || stm.has(n)) continue;
      if (tipe === 1) posObj.set(n, a); else if (tipe === 2) stm.set(n, [a, b]);
    }
    const pv = ambilK(o.v, "/Prev"); if (pv) await bacaXref(Number(pv.v), sudah);
  }
  const sx = s.lastIndexOf("startxref");
  try { if (sx < 0) throw new Error("tanpa startxref"); await bacaXref(Number(/startxref\s+(\d+)/.exec(s.slice(sx))[1]), new Set()); }
  catch (_) { // cadangan: pindai semua objek
    posObj.clear(); stm.clear(); trailer = null; const re = /(\d+)\s+(\d+)\s+obj\b/g; let m;
    while ((m = re.exec(s))) posObj.set(Number(m[1]), m.index);
    const t = s.lastIndexOf("trailer"); if (t >= 0) { const L = lexer(s); L.pos = t + 7; try { trailer = L.nilai(); } catch (_) { trailer = null; } }
    if (!trailer || !ambilK(trailer, "/Root")) { for (const [n] of posObj) { const o = cariObj(n); if (o && ambilK(o.v, "/Type") && ambilK(o.v, "/Type").v === "/XRef") { trailer = o.v; break; } } }
  }
  if (!trailer) throw new Error("PDF tidak bisa dibaca (struktur rusak).");
  if (ambilK(trailer, "/Encrypt")) throw new Error("PDF ini terkunci (dienkripsi/berkata sandi). Simpan ulang sebagai PDF tanpa kunci, lalu unggah lagi.");
  const stmCache = new Map();
  async function ambil(n) {
    if (obj.has(n)) return obj.get(n);
    if (posObj.has(n)) return cariObj(n);
    if (stm.has(n)) {
      const [sn, ix] = stm.get(n); let isi = stmCache.get(sn);
      if (!isi) { const so = await ambil(sn); if (!so || !so.data) return null; const raw = ambilK(so.v, "/Filter") ? await prediktor(await mekar(so.data), ambilK(so.v, "/DecodeParms")) : so.data;
        const t = latin(raw), N = Number(ambilK(so.v, "/N").v), first = Number(ambilK(so.v, "/First").v), kepala = t.slice(0, first).trim().split(/\s+/).map(Number);
        isi = { t, first, kepala }; stmCache.set(sn, isi); for (let k = 0; k < N; k++) if (!stm.has(kepala[2 * k]) || stm.get(kepala[2 * k])[0] === sn) { /* posisi dicatat */ } }
      const nomor = isi.kepala[2 * ix], off = isi.kepala[2 * ix + 1]; if (nomor !== n) return null;
      const L = lexer(isi.t); L.pos = isi.first + off; const o = { n, v: L.nilai() }; obj.set(n, o); return o;
    }
    return null;
  }
  return { trailer, ambil };
}
/** Salin semua halaman PDF u8 ke penulis (urutan asli). Mengembalikan jumlah halaman. */
async function gabung(tulis, u8) {
  const P = await bukaPdf(u8 instanceof Uint8Array ? u8 : new Uint8Array(u8));
  const deref = async v => v && v.t === "r" ? ((await P.ambil(v.n)) || {}).v : v;
  const root = await deref(ambilK(P.trailer, "/Root")), pages = [];
  const WARIS = ["/Resources", "/MediaBox", "/CropBox", "/Rotate"];
  async function telusur(ref, waris, sudah) {
    if (!ref || ref.t !== "r" || sudah.has(ref.n)) return; sudah.add(ref.n);
    const o = await P.ambil(ref.n); if (!o || !o.v || o.v.t !== "d") return;
    const w = Object.assign({}, waris); WARIS.forEach(k => { if (o.v.v.has(k)) w[k] = o.v.v.get(k); });
    const tipe = (ambilK(o.v, "/Type") || {}).v;
    if (tipe === "/Pages" || (!tipe && ambilK(o.v, "/Kids"))) { for (const k of (await deref(ambilK(o.v, "/Kids"))).v) await telusur(k, w, sudah); }
    else pages.push({ n: ref.n, waris: w });
  }
  await telusur(ambilK(root, "/Pages"), {}, new Set());
  if (!pages.length) throw new Error("PDF tidak memiliki halaman.");
  const peta = new Map(); pages.forEach(p => peta.set(p.n, tulis.baru()));
  const antre = [];
  const petaRef = n => { if (!peta.has(n)) { peta.set(n, tulis.baru()); antre.push(n); } return peta.get(n); };
  for (const p of pages) {
    const o = await P.ambil(p.n), d = new Map(o.v.v); d.delete("/Parent"); WARIS.forEach(k => { if (!d.has(k) && p.waris[k]) d.set(k, p.waris[k]); });
    d.set("/Parent", { t: "x", v: tulis.idPages + " 0 R" }); if (!d.has("/MediaBox")) d.set("/MediaBox", { t: "x", v: "[0 0 595.28 841.89]" });
    ["/StructParents", "/B", "/Metadata", "/PieceInfo"].forEach(k => d.delete(k));
    tulis.set(peta.get(p.n), serial({ t: "d", v: d }, petaRef)); tulis.halaman.push(peta.get(p.n));
  }
  while (antre.length) {
    const n = antre.shift(), o = await P.ambil(n), id = peta.get(n);
    if (!o) { tulis.set(id, "null"); continue; }
    if (o.data) { const d = new Map(o.v.v); d.set("/Length", { t: "x", v: String(o.data.length) }); tulis.set(id, { kamus: serial({ t: "d", v: d }, petaRef), aliran: o.data }); }
    else tulis.set(id, serial(o.v, petaRef));
  }
  return pages.length;
}

G.UPW_PDF = { PdfTulis, dariHtml, docxKeHtml, gabung, keWin, bukaPdf, A4 };
})();
