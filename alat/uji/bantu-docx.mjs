// Pembuat .docx kecil untuk uji (v0.54.0): ZIP tersimpan dengan docProps/core.xml berpenanda templat aplikasi.
import zlib from "node:zlib";
function zipBuf(berkas) {
  const bagian = [], pusat = []; let off = 0;
  berkas.forEach(([nama, isi]) => {
    const n = Buffer.from(nama), d = Buffer.isBuffer(isi) ? isi : Buffer.from(isi), crc = zlib.crc32(d);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt32LE(crc, 14); h.writeUInt32LE(d.length, 18); h.writeUInt32LE(d.length, 22); h.writeUInt16LE(n.length, 26);
    bagian.push(h, n, d);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt32LE(crc, 16); c.writeUInt32LE(d.length, 20); c.writeUInt32LE(d.length, 24); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(off, 42);
    pusat.push(c, n); off += 30 + n.length + d.length;
  });
  const pb = Buffer.concat(pusat), e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(berkas.length, 8); e.writeUInt16LE(berkas.length, 10); e.writeUInt32LE(pb.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...bagian, pb, e]);
}
/** jenis: "rps" | "kontrak" | "lain"; tambahan: teks pembeda isi. Hasil: base64. */
export function docxUji(jenis, tambahan) {
  const penanda = jenis === "rps" ? "UPW-RPS v1" : jenis === "kontrak" ? "UPW-KONTRAK v1" : "";
  const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
  return zipBuf([
    ["[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>'],
    ["docProps/core.xml", `<?xml version="1.0"?><cp:coreProperties xmlns:cp="x" xmlns:dc="y"><dc:description>${penanda}</dc:description></cp:coreProperties>`],
    ["word/document.xml", `<?xml version="1.0"?><w:document ${W}><w:body><w:p><w:r><w:t>${jenis} ${tambahan || ""}</w:t></w:r></w:p><w:p><w:r><w:t>[TTE: Dosen Pengampu]</w:t></w:r></w:p><w:sectPr/></w:body></w:document>`]
  ]).toString("base64");
}
