// PDF kecil untuk uji penggabung (v0.55.0): bentuk xref biasa, dan bentuk modern (xref stream + object stream + prediktor PNG) seperti PDF dari Microsoft Word.
import zlib from "node:zlib";
const L = s => Buffer.from(s, "latin1");
/** PDF klasik: n halaman berisi teks. */
export function pdfKlasik(teks, n = 1) {
  const obj = [];
  const kids = [], isi = [];
  for (let i = 0; i < n; i++) { kids.push(4 + i * 2); isi.push(5 + i * 2); }
  obj[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  obj[2] = `<< /Type /Pages /Kids [${kids.map(k => k + " 0 R").join(" ")}] /Count ${n} /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> >>`;
  obj[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  for (let i = 0; i < n; i++) {
    const cs = `BT /F1 24 Tf 72 700 Td (${teks} ${i + 1}) Tj ET`;
    obj[4 + i * 2] = `<< /Type /Page /Parent 2 0 R /Contents ${5 + i * 2} 0 R >>`;
    obj[5 + i * 2] = { d: `<< /Length ${cs.length} >>`, s: L(cs) };
  }
  const bag = [L("%PDF-1.4\n")], off = []; let pos = bag[0].length;
  for (let i = 1; i < obj.length; i++) { off[i] = pos; const o = obj[i]; const b = typeof o === "string" ? L(`${i} 0 obj\n${o}\nendobj\n`) : Buffer.concat([L(`${i} 0 obj\n${o.d}\nstream\n`), o.s, L("\nendstream\nendobj\n")]); bag.push(b); pos += b.length; }
  bag.push(L(`xref\n0 ${obj.length}\n0000000000 65535 f \n` + off.slice(1).map(o => String(o).padStart(10, "0") + " 00000 n \n").join("") + `trailer\n<< /Size ${obj.length} /Root 1 0 R >>\nstartxref\n${pos}\n%%EOF\n`));
  return Buffer.concat(bag);
}
/** PDF modern: objek non-stream dalam satu /ObjStm, xref berupa stream terkompres dengan prediktor PNG (Up). terkunci: tambahkan /Encrypt. */
export function pdfModern(teks, n = 1, terkunci = false) {
  const biasa = {}, aliran = {};
  const kids = []; for (let i = 0; i < n; i++) kids.push(4 + i * 2);
  biasa[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  biasa[2] = `<< /Type /Pages /Kids [${kids.map(k => k + " 0 R").join(" ")}] /Count ${n} >>`;
  biasa[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>";
  for (let i = 0; i < n; i++) {
    biasa[4 + i * 2] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`;
    const cs = zlib.deflateSync(L(`BT /F1 20 Tf 72 650 Td (${teks} ${i + 1}) Tj ET`));
    aliran[5 + i * 2] = { d: `<< /Length ${cs.length} /Filter /FlateDecode >>`, s: cs };
  }
  const nomor = Object.keys(biasa).map(Number), badan = [], kepala = []; let p = 0;
  nomor.forEach(nr => { const t = biasa[nr] + "\n"; kepala.push(nr, p); badan.push(t); p += Buffer.byteLength(t, "latin1"); });
  const hd = kepala.join(" ") + "\n", stmData = zlib.deflateSync(L(hd + badan.join(""))), idStm = 100;
  const bag = [L("%PDF-1.7\n%\xe2\xe3\xcf\xd3\n")], pos = {}; let at = bag[0].length;
  const tulis = (n, d, s) => { pos[n] = at; const b = Buffer.concat([L(`${n} 0 obj\n${d}\nstream\n`), s, L("\nendstream\nendobj\n")]); bag.push(b); at += b.length; };
  Object.keys(aliran).forEach(n => tulis(n, aliran[n].d, aliran[n].s));
  tulis(idStm, `<< /Type /ObjStm /N ${nomor.length} /First ${Buffer.byteLength(hd, "latin1")} /Length ${stmData.length} /Filter /FlateDecode >>`, stmData);
  const size = idStm + 2, idXref = idStm + 1, W = [1, 4, 2], baris = [];
  for (let n = 0; n < size; n++) {
    let e;
    if (n === 0) e = [0, 0, 65535]; else if (biasa[n]) e = [2, idStm, nomor.indexOf(n)]; else if (pos[n] != null) e = [1, pos[n], 0]; else if (n === idXref) e = [1, at, 0]; else e = [0, 0, 0];
    const b = Buffer.alloc(7); b[0] = e[0]; b.writeUInt32BE(e[1], 1); b.writeUInt16BE(e[2], 5); baris.push(b);
  }
  // prediktor PNG "Up" (filter 2) per baris
  let atas = Buffer.alloc(7); const pr = [];
  baris.forEach(b => { const r = Buffer.alloc(8); r[0] = 2; for (let i = 0; i < 7; i++) r[1 + i] = (b[i] - atas[i]) & 255; pr.push(r); atas = b; });
  const xd = zlib.deflateSync(Buffer.concat(pr)), xrefPos = at;
  tulis(idXref, `<< /Type /XRef /Size ${size} /W [${W.join(" ")}] /Root 1 0 R${terkunci ? " /Encrypt << /Filter /Standard /V 1 >>" : ""} /Length ${xd.length} /Filter /FlateDecode /DecodeParms << /Predictor 12 /Columns 7 >> >>`, xd);
  bag.push(L(`startxref\n${xrefPos}\n%%EOF\n`));
  return Buffer.concat(bag);
}
