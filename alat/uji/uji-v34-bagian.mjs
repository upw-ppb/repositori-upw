// Uji v0.34.0: kop surat prodi hanya di halaman pertama (PDF lewat kertas pertama; Word lewat header "first" + titlePg).
import fs from "node:fs";
import vm from "node:vm";
export async function jalankan({ cek }) {
  console.log("45. Kop surat prodi");
  const app = fs.readFileSync("web/aplikasi.js", "utf8"), sw = fs.readFileSync("web/sw.js", "utf8"), css = fs.readFileSync("web/gaya.css", "utf8");
  const jpg = fs.readFileSync("web/logo-kop.jpg");
  cek("logo kop ada (JPEG) dan masuk cache aplikasi", jpg[0] === 0xff && jpg[1] === 0xd8 && /"logo-kop\.jpg"/.test(sw));
  cek("teks kop sesuai berkas Sekretaris Prodi", ["PROGRAM STUDI SARJANA TERAPAN", "USAHA PERJALANAN WISATA", "Jln. Dharmawangsa Kampial, Kel. Benoa, Kec. Kuta Selatan, Kab. Badung - Bali 80363",
    "Telepon (0361) 773537-773538-774818-774819; Pos-el: info@ppb.ac.id", "Laman: www.ppb.ac.id"].every(t => app.includes('"' + t + '"')));
  const fungsi = n => { const i = app.indexOf("function " + n + "("); return app.slice(i, app.indexOf("\n}\n", i)); };
  const jumlahKop = n => (fungsi(n).match(/kopHtml\(\)/g) || []).length;
  cek("PDF: kop tepat sekali (kertas pertama) di surat tugas, undangan, risalah, daftar hadir; lampiran tanpa kop",
    ["kertasSurat", "kertasUndangan", "kertasRisalah", "kertasHadir"].every(n => jumlahKop(n) === 1 && fungsi(n).indexOf("kopHtml()") < fungsi(n).indexOf('class="kertas"', fungsi(n).indexOf('class="kertas"') + 1) || jumlahKop(n) === 1 && fungsi(n).split('class="kertas"').length === 2));
  cek("Portofolio dan DED tanpa kop (keputusan pemilik / format LAMWisata)", !/kop/i.test(fungsi("htmlPortoCetak")) && !/kopWord|kop\b/.test(app.slice(app.indexOf("eksporDed"), app.indexOf("eksporDed") + 6000)));
  cek("Word: risalah dan Laporan GKM memakai kop", /risalahDocx\(r, await kopWord\(\)\)/.test(app) && /kaki: "Laporan GKM UPW – " \+ L\.label, kop \}/.test(app));
  cek("cetak: margin atas halaman pertama 1 cm hanya bila berkop; kop bergaris bawah", /@page :first\{margin-top:1cm\}/.test(app) && /\.kertas \.kop\{[^}]*border-bottom/.test(css));
  // Word: susun dokumen sungguhan dengan docx.js
  const w = {}; const ctx = { window: w, Blob, TextEncoder, Uint8Array, DataView, Date, Math, String, Array, Object, JSON, Number }; vm.createContext(ctx);
  for (const f of ["zip.js", "docx.js"]) vm.runInContext(fs.readFileSync("web/" + f, "utf8"), ctx);
  vm.runInContext("var UPW_ZIP = window.UPW_ZIP;", ctx);
  const isiZip = async (blob) => { const b = Buffer.from(await blob.arrayBuffer()), f = {}; let i = 0;
    while (b.readUInt32LE(i) === 0x04034b50) { const n = b.readUInt16LE(i + 26), e = b.readUInt16LE(i + 28), uk = b.readUInt32LE(i + 18), nama = b.slice(i + 30, i + 30 + n).toString(); f[nama] = b.slice(i + 30 + n + e, i + 30 + n + e + uk); i += 30 + n + e + uk; } return f; };
  const d = w.UPW_DOCX.baru(); d.p("Isi"); d.halaman(); d.p("Halaman dua");
  const F = await isiZip(d.blob({ kop: { logo: new Uint8Array(jpg), rasio: 1, baris: [{ t: "USAHA PERJALANAN WISATA", b: 1, ukuran: 16 }] } }));
  const doc = String(F["word/document.xml"]), h1 = String(F["word/header1.xml"]), h2 = String(F["word/header2.xml"]), rel = String(F["word/_rels/document.xml.rels"]), ct = String(F["[Content_Types].xml"]);
  cek("Word: titlePg + header first (kop) + header default kosong; kaki halaman tetap di halaman pertama", /<w:titlePg\/>/.test(doc) && /w:type="first" r:id="rIdKop"/.test(doc) && /w:type="default" r:id="rIdKopKosong"/.test(doc)
    && /footerReference w:type="first"/.test(doc) && /USAHA PERJALANAN WISATA/.test(h1) && !/w:t/.test(h2) && /header1\.xml/.test(rel) && /header2\.xml/.test(rel));
  cek("Word: logo kop tersimpan di media dan dirujuk header; jenis jpg terdaftar", F["word/media/logo-kop.jpg"] && F["word/media/logo-kop.jpg"].length === jpg.length && /rIdLogoKop/.test(h1)
    && /media\/logo-kop\.jpg/.test(String(F["word/_rels/header1.xml.rels"])) && /Extension="jpg"/.test(ct) && /header1\.xml" ContentType/.test(ct));
  const tanpa = await isiZip(w.UPW_DOCX.baru().p("x").blob({}));
  cek("Word tanpa kop (mis. DED) tidak berubah: tanpa header dan titlePg", !tanpa["word/header1.xml"] && !/titlePg|headerReference/.test(String(tanpa["word/document.xml"])));
}
