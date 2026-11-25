// Uji v0.55.0: mesin PDF buatan sendiri — penulis, penggabung (xref biasa dan xref/objek stream + prediktor PNG), penolakan PDF terkunci,
// Word → HTML (templat RPS/kontrak), dan pemakaiannya di tampilan. Tata letak HTML → PDF memerlukan browser (diuji lewat uji tampilan).
import fs from "node:fs";
import vm from "node:vm";
import { pdfKlasik, pdfModern } from "./bantu-pdf.mjs";
export async function jalankan({ cek, ok, tAdm }) {
  console.log("71. Mesin PDF (penulis, penggabung, Word → HTML)");
  const ctx = { Blob, TextEncoder, TextDecoder, DecompressionStream, CompressionStream, Response, Uint8Array, DataView, console, btoa, atob }; ctx.window = ctx; vm.createContext(ctx);
  ["zip.js", "rps.js", "pdf.js"].forEach(f => vm.runInContext(fs.readFileSync("web/" + f, "utf8"), ctx));
  const P = ctx.UPW_PDF, U = ctx.UPW_RPS;
  const t = new P.PdfTulis();
  const f = t.font("serif", 1);
  await t.halamanBaru(595.28, 841.89, `BT /${f.nama} 12 Tf 72 700 Td ${"(Uji \\(kurung\\) Rp 1.000)"} Tj ET`, { fonts: { [f.nama]: f.id } }, []);
  const n1 = await P.gabung(t, pdfKlasik("Klasik", 2)), n2 = await P.gabung(t, pdfModern("Modern", 3));
  let galat = ""; try { await P.gabung(t, pdfModern("Kunci", 1, true)); } catch (e) { galat = e.message; }
  let galat2 = ""; try { await P.gabung(t, new Uint8Array([1, 2, 3])); } catch (e) { galat2 = e.message; }
  const out = t.hasil("Uji gabung");
  const Q = await P.bukaPdf(out), root = await Q.ambil(Number(String(Q.trailer.v.get("/Root").n))), pages = await Q.ambil(root.v.v.get("/Pages").n);
  cek("penggabung: 2 halaman klasik + 3 halaman modern (xref stream, objek stream, prediktor PNG) + 1 halaman sendiri = 6 halaman, PDF hasil terbaca ulang", n1 === 2 && n2 === 3 && pages.v.v.get("/Count").v === "6"
    && Buffer.from(out.slice(0, 8)).toString() === "%PDF-1.7");
  const s = Buffer.from(out).toString("latin1");
  cek("isi halaman yang digabung tetap utuh (teks klasik dan modern ada)", s.includes("(Klasik 2) Tj") && /\/Type \/Font \/Subtype \/Type1 \/BaseFont \/Times-Roman/.test(s.replace(/\s+/g, " ")) && (s.match(/\/Type\s*\/Page\b/g) || []).length === 6);
  cek("PDF terkunci dan berkas bukan PDF ditolak dengan pesan jelas", /terkunci/.test(galat) && /bukan PDF/.test(galat2));
  cek("teks WinAnsi: tanda kutip, kurung, simbol di luar WinAnsi diganti", P.keWin("Σ “A” ≥").join() === P.keWin("Jumlah  “A” >=").join() && P.keWin("“")[0] === 0x93 && P.keWin("é")[0] === 233);
  // Word → HTML
  const tpl = await U.buat(U.kosong({ mk: { nama: "Uji PDF", kode: "X9", semester: 1, sksKuliah: 2 }, cplProdi: [], tim: [], otorisasi: {} }, [], "1 Januari 2027"), null);
  const H = await P.docxKeHtml(await tpl.arrayBuffer());
  cek("Word → HTML: kertas A4 lanskap dan margin dari templat, tabel dengan lebar kolom, sel gabung (colspan/rowspan), arsiran, sorot kuning, huruf Times", H.lebar > H.tinggi && Math.round(H.lebar) === 842 && H.margin[0] === 51
    && /<colgroup>/.test(H.html) && /colspan="\d"/.test(H.html) && /rowspan="\d"/.test(H.html) && /background:#FBE4D5/i.test(H.html) && /background:#ffff00/.test(H.html) && /class="serif"/.test(H.html) && /\[TTE: Ketua Jurusan/.test(H.html));
  const kt = await U.kontrak({ mk: { nama: "Uji PDF", kode: "X9" }, tim: [], otorisasi: {} }, null, null, {}), Hk = await P.docxKeHtml(await kt.arrayBuffer());
  cek("Word → HTML: kontrak potret A4", Math.round(Hk.lebar) === 595 && Hk.tinggi > Hk.lebar && /KONTRAK/i.test(Hk.html));
  const O = ok("rps.otorisasi", {}, tAdm).otorisasi;
  cek("templat RPS: nama Ketua Jurusan otomatis dari akun berperan kajur bila belum diatur", O.kajurNama === "Dr. Kajur Uji, M.Par." || (O.kajurDariAkun && /Ketua Jurusan Uji/.test(O.kajurNama)));
  const app = fs.readFileSync("web/aplikasi.js", "utf8");
  cek("tampilan: surat + lampiran satu PDF (mesin sendiri), RPS/kontrak sah diunduh sebagai PDF, pratinjau PDF, cetak browser tetap ada", /unduhSuratPdf\(\)/.test(app) && /UPW_PDF\.gabung\(tw, b\)/.test(app)
    && /bertanda tangan elektronik\.pdf/.test(app) && /sahPratinjauPdf/.test(app) && /data-act="cetakSurat">Cetak lewat browser/.test(app));
}
