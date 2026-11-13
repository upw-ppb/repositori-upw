/* Pembuat dokumen Word (.docx) sederhana untuk ekspor DED. Ditulis sendiri; tanpa pustaka luar; memakai UPW_ZIP.zip.
   Format bawaan sesuai panduan DED LAMWisata: Calibri 12, spasi 1, A4, margin atas 3 cm, kiri 4 cm, bawah 3 cm, kanan 3 cm.
   const d = UPW_DOCX.baru(); d.p("teks", {b:1, i:1, ukuran:14, rata:"center", sebelum:0, sesudah:6, halamanBaru:1, inden:0.5, warna:"555555"});
   d.tabel([[...judul], [...baris]], {ukuran:8, judul:1}); d.gambar(uint8Png, lebarCm, tinggiCm, {rata:"center"}); d.halaman(); d.blob() → Blob */
(function () {
"use strict";
const x = s => String(s ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const KEP = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
  + 'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
  + 'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
const twip = cm => Math.round(cm * 567);
function run(t, o) {
  const pr = (o.b ? "<w:b/>" : "") + (o.i ? "<w:i/>" : "") + (o.u ? '<w:u w:val="single"/>' : "") + (o.warna ? `<w:color w:val="${o.warna}"/>` : "") + (o.ukuran ? `<w:sz w:val="${Math.round(o.ukuran * 2)}"/><w:szCs w:val="${Math.round(o.ukuran * 2)}"/>` : "");
  return String(t ?? "").split("\t").map((s, i) => (i ? "<w:r><w:tab/></w:r>" : "") + `<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ""}<w:t xml:space="preserve">${x(s)}</w:t></w:r>`).join("");
}
function pPr(o) {
  return `<w:pPr>${o.halamanBaru ? "<w:pageBreakBefore/>" : ""}${o.tetap ? "<w:keepNext/>" : ""}<w:spacing w:before="${Math.round((o.sebelum ?? 0) * 20)}" w:after="${Math.round((o.sesudah ?? 6) * 20)}" w:line="240" w:lineRule="auto"/>`
    + (o.inden || o.gantung ? `<w:ind w:left="${twip(o.inden || 0)}"${o.gantung ? ` w:hanging="${twip(o.gantung)}"` : ""}/>` : "") + (o.rata ? `<w:jc w:val="${o.rata === "justify" ? "both" : o.rata}"/>` : "") + "</w:pPr>";
}
function baru() {
  const isi = [], media = [];
  const api = {
    /** Paragraf; teks boleh array potongan [{t, b, i, u}] untuk campuran tebal/miring. */
    p(teks, o = {}) {
      if (o.halamanBaru) { isi.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>'); o = Object.assign({}, o, { halamanBaru: 0 }); }
      const bagian = Array.isArray(teks) ? teks : [{ t: teks }];
      isi.push(`<w:p>${pPr(o)}${bagian.map(b => run(b.t, Object.assign({}, o, b))).join("")}</w:p>`); return api;
    },
    halaman() { isi.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>'); return api; },
    tabel(baris, o = {}) {
      if (!baris.length) return api;
      const nk = Math.max(...baris.map(r => r.length)), uk = o.ukuran || 9, lebar = o.lebar ? o.lebar.map(twip) : null;
      const sel = (v, i, hdr) => `<w:tc><w:tcPr>${lebar ? `<w:tcW w:w="${lebar[i] || 0}" w:type="dxa"/>` : '<w:tcW w:w="0" w:type="auto"/>'}${hdr ? '<w:shd w:val="clear" w:color="auto" w:fill="D9E2F3"/>' : ""}<w:vAlign w:val="${hdr ? "center" : "top"}"/></w:tcPr>`
        + String(v ?? "").split("\n").map(s => `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>${hdr || typeof v === "number" ? `<w:jc w:val="${hdr ? "center" : "right"}"/>` : ""}</w:pPr>${run(typeof v === "number" ? v.toLocaleString("id-ID", { maximumFractionDigits: 2 }) : s, { b: hdr, ukuran: uk })}</w:p>`).join("") + "</w:tc>";
      const brd = ["top", "left", "bottom", "right", "insideH", "insideV"].map(s => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="808080"/>`).join("");
      isi.push(`<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${brd}</w:tblBorders><w:tblLayout w:type="${lebar ? "fixed" : "autofit"}"/><w:tblCellMar><w:top w:w="20" w:type="dxa"/><w:left w:w="57" w:type="dxa"/><w:bottom w:w="20" w:type="dxa"/><w:right w:w="57" w:type="dxa"/></w:tblCellMar></w:tblPr>`
        + `<w:tblGrid>${Array.from({ length: nk }, (_, i) => `<w:gridCol w:w="${lebar ? lebar[i] || 0 : Math.floor(9354 / nk)}"/>`).join("")}</w:tblGrid>`
        + baris.map((r, ri) => { const hdr = o.judul !== false && ri === 0; const rr = r.concat(Array(nk - r.length).fill(""));
          return `<w:tr>${hdr ? "<w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>" : "<w:trPr><w:cantSplit/></w:trPr>"}${rr.map((v, i) => sel(v, i, hdr)).join("")}</w:tr>`; }).join("") + "</w:tbl>");
      isi.push(`<w:p>${pPr({ sesudah: 6 })}</w:p>`);
      return api;
    },
    gambar(png, lebarCm, tinggiCm, o = {}) {
      const n = media.length + 1, id = "rIdImg" + n, cx = Math.round(lebarCm * 360000), cy = Math.round(tinggiCm * 360000);
      media.push({ nama: `media/gambar${n}.png`, data: png, id });
      isi.push(`<w:p>${pPr(Object.assign({ sesudah: 6 }, o))}<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${n}" name="Gambar ${n}"/>`
        + `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${n}" name="gambar${n}.png"/><pic:cNvPicPr/></pic:nvPicPr>`
        + `<pic:blipFill><a:blip r:embed="${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`);
      return api;
    },
    blob(o = {}) {
      const kaki = o.kaki || "";
      const sect = `<w:sectPr><w:footerReference w:type="default" r:id="rIdKaki"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="${twip(3)}" w:right="${twip(3)}" w:bottom="${twip(3)}" w:left="${twip(4)}" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr>`;
      const f = [
        { nama: "[Content_Types].xml", data: `${KEP}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>` },
        { nama: "_rels/.rels", data: `${KEP}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>` },
        { nama: "docProps/core.xml", data: `${KEP}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${x(o.judul || "Dokumen")}</dc:title><dc:creator>Repositori UPW</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0, 19)}Z</dcterms:created></cp:coreProperties>` },
        { nama: "word/_rels/document.xml.rels", data: `${KEP}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdGaya" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdKaki" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>${media.map(m => `<Relationship Id="${m.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${m.nama}"/>`).join("")}</Relationships>` },
        { nama: "word/styles.xml", data: `${KEP}<w:styles ${NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="id-ID"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:spacing w:after="120" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style><w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>` },
        { nama: "word/footer1.xml", data: `${KEP}<w:ftr ${NS}><w:p><w:pPr><w:jc w:val="right"/></w:pPr>${run(kaki ? kaki + " | " : "", { ukuran: 9, warna: "555555" })}<w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>1</w:t></w:r><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>` },
        { nama: "word/document.xml", data: `${KEP}<w:document ${NS}><w:body>${isi.join("")}${sect}</w:body></w:document>` }
      ].concat(media.map(m => ({ nama: "word/" + m.nama, data: m.data })));
      return new Blob([UPW_ZIP.zip(f)], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    }
  };
  return api;
}
window.UPW_DOCX = { baru };
})();
