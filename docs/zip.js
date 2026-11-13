/* Penulis ZIP (tanpa kompresi) dan Excel .xlsx sederhana untuk ekspor portofolio. Ditulis sendiri; tanpa pustaka luar.
   UPW_ZIP.zip([{ nama, data: Uint8Array|string }]) → Blob (application/zip)
   UPW_ZIP.xlsx([{ nama: "Lembar", baris: [[sel, ...], ...] }]) → Blob; baris pertama dicetak tebal; angka tetap angka. */
(function () {
"use strict";
const TABEL = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u) { let c = 0xffffffff; for (let i = 0; i < u.length; i++) c = TABEL[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
const enc = new TextEncoder();
function dosWaktu(d) {
  return { t: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), d: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() };
}
function zip(berkas) {
  const bagian = [], pusat = [], w = dosWaktu(new Date());
  let offset = 0;
  berkas.forEach(f => {
    const nama = enc.encode(f.nama), data = typeof f.data === "string" ? enc.encode(f.data) : f.data, crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, w.t, true); h.setUint16(12, w.d, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true);
    h.setUint32(22, data.length, true); h.setUint16(26, nama.length, true); h.setUint16(28, 0, true);
    bagian.push(h.buffer, nama, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, w.t, true); c.setUint16(14, w.d, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
    c.setUint16(28, nama.length, true); c.setUint32(42, offset, true);
    pusat.push(c.buffer, nama);
    offset += 30 + nama.length + data.length;
  });
  const besarPusat = pusat.reduce((a, b) => a + (b.byteLength || b.length), 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, berkas.length, true); e.setUint16(10, berkas.length, true);
  e.setUint32(12, besarPusat, true); e.setUint32(16, offset, true);
  return new Blob([...bagian, ...pusat, e.buffer], { type: "application/zip" });
}
const xml = s => String(s ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const kolom = n => { let s = ""; n++; while (n) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"', KEP = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
function lembar(baris) {
  const lebar = [];
  baris.forEach(r => r.forEach((v, i) => { lebar[i] = Math.min(60, Math.max(lebar[i] || 8, String(v ?? "").length + 2)); }));
  const isi = baris.map((r, y) => `<row r="${y + 1}">${r.map((v, x) => {
    const ref = kolom(x) + (y + 1), s = y === 0 ? ' s="1"' : "";
    if (typeof v === "number" && isFinite(v)) return `<c r="${ref}"${s}><v>${v}</v></c>`;
    return `<c r="${ref}" t="inlineStr"${s}><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
  }).join("")}</row>`).join("");
  return `${KEP}<worksheet ${NS}><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
    + (lebar.length ? `<cols>${lebar.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>` : "")
    + `<sheetData>${isi}</sheetData></worksheet>`;
}
function xlsx(daftar) {
  const nama = daftar.map((l, i) => (String(l.nama).replace(/[\\\/?*\[\]:]/g, " ").slice(0, 31) || "Lembar " + (i + 1)));
  const f = [
    { nama: "[Content_Types].xml", data: `${KEP}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${daftar.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>` },
    { nama: "_rels/.rels", data: `${KEP}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { nama: "xl/workbook.xml", data: `${KEP}<workbook ${NS} xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${nama.map((n, i) => `<sheet name="${xml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>` },
    { nama: "xl/_rels/workbook.xml.rels", data: `${KEP}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${daftar.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${daftar.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { nama: "xl/styles.xml", data: `${KEP}<styleSheet ${NS}><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>` }
  ].concat(daftar.map((l, i) => ({ nama: `xl/worksheets/sheet${i + 1}.xml`, data: lembar(l.baris) })));
  return new Blob([zip(f)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
window.UPW_ZIP = { zip, xlsx, crc32 };
})();
