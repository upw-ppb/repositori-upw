/* RPS (v0.42.0): templat RPS Word terisi data aplikasi, pembaca RPS Word yang diunggah, pemeriksaan butir 8 LAMWisata, dan saran metode.
   Ditulis sendiri, tanpa pustaka luar dan TANPA AI: RPS dibaca dari judul baris/kolom tabelnya (paling tepat untuk RPS dari templat ini;
   format lain dibaca sebisanya dan bagian yang tidak ditemukan dilaporkan). Susunan mengikuti RPS Prodi UPW (kop, A. Perencanaan perkuliahan,
   B. Program pembelajaran, C. Portofolio penilaian, otorisasi).
   Model data (dipakai templat dan hasil baca):
   { v, mk:{nama,kode,rumpun,sks,semester,tgl,sksT,sksP}, labor, kualifikasi, jenjang, otor:{pengembang:[{nama,nip}], kps:{nama,nip,jabatan}, kajur:{…}},
     cpl:[{kode,ref,t}], cpmk:[{kode,t,cpl:[]}], sub:[{kode,t}], kor:{"CPMK 1":[1,2]}, deskripsi, bahan, pustakaUtama:[], pustakaPendukung:[], media, dosen:[],
     tempat, prasyarat, pertemuan:[{ke,sub,bahan,metode,waktu,pengalaman,kriteria,bobot,ref,ujian}], porto:[{minggu,cpl,cpmk,sub,indikator,bentuk,bobot,ujian}] }
   API: UPW_RPS.buat(data, logo) → Blob, .kosong(ref, pilihCpl) → data, .baca(ArrayBuffer) → Promise<data>, .periksa(data, ref) → [{t, teks}],
   .saranMetode(data, daftarMetode) → [{m, alasan, ada}], .ringkas(data). */
(function () {
"use strict";
const G = typeof window !== "undefined" ? window : globalThis;
const x = s => String(s ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const KEP = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
  + 'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
  + 'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
const PENANDA = "UPW-RPS v1";
const KOSONG = /^\s*\[[^\]]*\]\s*$/;           // teks petunjuk "[ … ]" dianggap belum diisi
const isi = s => { const t = String(s ?? "").trim(); return t && !KOSONG.test(t) ? t : ""; };
const LEBAR = 15138;                             // A4 lanskap, margin 1,8 cm (twip)
const PEACH = "FBE4D5", ABU = "E7E6E6";

/* ---------- penulis Word ---------- */
function run(t, o = {}) {
  const pr = (o.b ? "<w:b/>" : "") + (o.i ? "<w:i/>" : "") + (o.warna ? `<w:color w:val="${o.warna}"/>` : "") + `<w:sz w:val="${Math.round((o.ukuran || 10) * 2)}"/><w:szCs w:val="${Math.round((o.ukuran || 10) * 2)}"/>`;
  return `<w:r><w:rPr>${pr}</w:rPr><w:t xml:space="preserve">${x(t)}</w:t></w:r>`;
}
function par(t, o = {}) {
  const petunjuk = KOSONG.test(String(t ?? "")) && String(t ?? "").trim();
  const ro = petunjuk ? Object.assign({}, o, { i: 1, warna: "808080", b: 0 }) : o;
  return `<w:p><w:pPr><w:spacing w:before="${o.sebelum || 0}" w:after="${o.sesudah ?? 0}" w:line="240" w:lineRule="auto"/>${o.halamanBaru ? "<w:pageBreakBefore/>" : ""}${o.rata ? `<w:jc w:val="${o.rata}"/>` : ""}</w:pPr>${t === "" || t == null ? "" : run(t, ro)}</w:p>`;
}
const pars = (t, o) => (Array.isArray(t) ? t : String(t ?? "").split("\n")).map(s => par(s, o)).join("") || par("", o);
function gbr(id, nama, cm, rasio) {
  const cx = Math.round(cm * 360000), cy = Math.round(cm * rasio * 360000), n = gbr.n = (gbr.n || 0) + 1;
  return `<w:p><w:pPr><w:spacing w:before="20" w:after="20"/><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${n}" name="${nama}"/>`
    + `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${n}" name="${nama}.png" descr="${nama}"/><pic:cNvPicPr/></pic:nvPicPr>`
    + `<pic:blipFill><a:blip r:embed="${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
}
/** Sel: {t | xml, span, vm: "r"|"c", fill, b, i, rata, ukuran, va} */
function sel(c, lebar) {
  const o = typeof c === "object" && c !== null ? c : { t: c };
  const isiXml = o.xml != null ? o.xml : o.vm === "c" ? par("") : pars(o.t ?? "", { b: o.b, i: o.i, rata: o.rata, ukuran: o.ukuran });
  return `<w:tc><w:tcPr><w:tcW w:w="${lebar}" w:type="dxa"/>${o.span > 1 ? `<w:gridSpan w:val="${o.span}"/>` : ""}${o.vm ? `<w:vMerge${o.vm === "r" ? ' w:val="restart"' : ""}/>` : ""}`
    + `${o.fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.fill}"/>` : ""}<w:vAlign w:val="${o.va || "top"}"/></w:tcPr>${isiXml}</w:tc>`;
}
function tabel(grid, baris, o = {}) {
  const brd = o.tanpaGaris ? ["top", "left", "bottom", "right", "insideH", "insideV"].map(s => `<w:${s} w:val="nil"/>`).join("")
    : ["top", "left", "bottom", "right", "insideH", "insideV"].map(s => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`).join("");
  const tr = r => {
    let k = 0;
    const cells = r.c.map(c => { const sp = (c && c.span) || 1, w = grid.slice(k, k + sp).reduce((a, b) => a + b, 0); k += sp; return sel(c, w); }).join("");
    return `<w:tr><w:trPr>${r.hdr ? "<w:tblHeader/>" : ""}<w:cantSplit/>${r.tinggi ? `<w:trHeight w:val="${r.tinggi}"/>` : ""}</w:trPr>${cells}</w:tr>`;
  };
  return `<w:tbl><w:tblPr><w:tblW w:w="${grid.reduce((a, b) => a + b, 0)}" w:type="dxa"/><w:tblBorders>${brd}</w:tblBorders><w:tblLayout w:type="fixed"/>`
    + `<w:tblCellMar><w:top w:w="30" w:type="dxa"/><w:left w:w="70" w:type="dxa"/><w:bottom w:w="30" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tblCellMar></w:tblPr>`
    + `<w:tblGrid>${grid.map(g => `<w:gridCol w:w="${g}"/>`).join("")}</w:tblGrid>${baris.map(tr).join("")}</w:tbl>`;
}
const bagi = (total, n) => { const a = Array(n).fill(Math.floor(total / n)); a[n - 1] += total - a.reduce((p, q) => p + q, 0); return a; };
const garisNama = o => `${o.nama || "[Nama]"}\nNIP: ${o.nip || "[NIP]"}`;

/** Waktu bawaan per pertemuan (v0.43.0). Jam sajian menurut SK kurikulum MRA-TP 2023: teori 1 sks = 1 JP (50'), praktik 1 sks = 2 JP (100') per minggu.
    Sisa beban 1 sks = 45 jam per semester (Permendikbudristek 53/2023; ± 170' per minggu) ditulis sebagai penugasan terstruktur (PT) dan kegiatan mandiri (KM). */
function waktuBawaan(mk) {
  const t = Number(mk.sksT) || 0, p = Number(mk.sksP) || 0, h = [];
  if (t) h.push(`TM: ${t} JP × 50' = ${t * 50}'`, `PT: ${t} × 60'`, `KM: ${t} × 60'`);
  if (p) h.push(`Praktik: ${2 * p} JP × 50' = ${p * 100}'`, `PT/KM: ${p} × 70'`);
  return h.join("\n") || "[Waktu, mis. TM: 2 JP × 50']";
}

/** Data templat baru dari bahan server (mkp.rpsRef). pilihCpl = daftar kode CPL prodi yang dipilih dosen. */
function kosong(R, pilihCpl, hariIni) {
  const L = R.terakhir && R.terakhir.data, mk = R.mk, prodi = {}; (R.cplProdi || []).forEach(c => { prodi[c.k] = c; });
  const sksT = (Number(mk.sksKuliah) || 0) + (Number(mk.sksSeminar) || 0), sksP = Number(mk.sksPraktik) || 0;
  const dasar = {
    v: 1, mk: { nama: mk.nama, kode: mk.kode, rumpun: (L && L.mk && L.mk.rumpun) || "", sks: String(mk.sks), semester: String(mk.semester), tgl: hariIni || "", sksT, sksP },
    labor: R.otorisasi.labor || (L && L.labor) || "", kualifikasi: (R.kualifikasi && R.kualifikasi.kualifikasi) || (L && L.kualifikasi) || "", jenjang: (R.kualifikasi && R.kualifikasi.jenjang) || (L && L.jenjang) || "",
    otor: { pengembang: R.tim.filter(t => !t.praktisi).slice(0, 3).map(t => ({ nama: t.nama, nip: t.nip })),
      kps: { nama: R.otorisasi.kpsNama, nip: R.otorisasi.kpsNip, jabatan: R.otorisasi.kpsJabatan }, kajur: { nama: R.otorisasi.kajurNama, nip: R.otorisasi.kajurNip, jabatan: R.otorisasi.kajurJabatan } },
    dosen: R.tim.map(t => t.nama + (t.praktisi ? " (praktisi)" : "")), hadirMin: R.otorisasi.hadirMin || ""
  };
  // v0.46.0: CPL yang ditetapkan prodi untuk MK ini menggantikan pilihan dosen.
  const pilih = ((R.cplMk && R.cplMk.length) ? R.cplMk : (pilihCpl || [])).filter(k => prodi[k]);
  const bahanUnit = (R.unitKomp || []).map(u => `• ${u.k} — ${u.en}${u.id ? ` (${u.id})` : ""}`).join("\n");
  const cplLama = L ? (L.cpl || []).filter(c => !pilih.length || pilih.includes(String(c.ref || "").toUpperCase())) : [];
  const cpl = pilih.length ? pilih.map((k, i) => { const l = cplLama.find(c => String(c.ref).toUpperCase() === k); return { kode: l ? l.kode : "CPL" + (i + 1), ref: k, t: prodi[k].t }; })
    : cplLama.length ? cplLama : [];
  if (L) {
    return Object.assign({}, L, dasar, { cpl, bahan: isi(L.bahan) ? L.bahan : (bahanUnit || L.bahan), pertemuan: (L.pertemuan || []).map(p => Object.assign({}, p, { waktu: p.waktu || (p.ujian ? "" : waktuBawaan(dasar.mk)) })) });
  }
  const wkt = waktuBawaan(dasar.mk), pertemuan = [];
  for (let i = 1; i <= 16; i++) pertemuan.push(i === 8 || i === 16 ? { ke: String(i), ujian: i === 8 ? "UTS" : "UAS", bobot: "" }
    : { ke: String(i), sub: "[Sub-CPMK …]", bahan: "[Topik/bahan kajian]", metode: "[Bentuk: kuliah/praktik; Metode: PjBL/CBL/…; Media]", waktu: wkt,
      pengalaman: "[Tugas mahasiswa]", kriteria: "[Kriteria dan indikator penilaian]", bobot: "", ref: "[No. pustaka]" });
  return Object.assign(dasar, {
    cpl, cpmk: [1, 2, 3].map(i => ({ kode: "CPMK " + i, t: "[Rumusan CPMK, diakhiri kode CPL yang didukung, mis. (CPL1, CPL2)]", cpl: [] })),
    sub: [1, 2, 3, 4].map(i => ({ kode: "Sub-CPMK " + i, t: "[Kemampuan akhir yang direncanakan]" })), kor: {},
    deskripsi: "[Deskripsi singkat mata kuliah]", bahan: bahanUnit || "[Bahan kajian / unit kompetensi]", pustakaUtama: ["[Penulis. Tahun. Judul. Kota: Penerbit.]"],
    pustakaPendukung: ["[Pustaka pendukung]"], media: "[Perangkat lunak dan perangkat keras]", tempat: "Kampus Politeknik Pariwisata Bali", prasyarat: "-",
    pertemuan, porto: pertemuan.map(p => p.ujian ? { minggu: p.ke, ujian: p.ujian, bobot: "" } : { minggu: p.ke, cpl: "[CPL…]", cpmk: "[CPMK…]", sub: "[Sub-CPMK…]", indikator: "[Indikator]", bentuk: "[Bentuk penilaian]", bobot: "" })
  });
}

/* ---------- bagian bersama dokumen prodi (kop berlogo, paket Word) ---------- */
function mediaLogo(logo) {
  return [["rIdL1", "logo-kemenpar", logo && logo.kemenpar, 1], ["rIdL2", "logo-poltekpar", logo && logo.poltekpar, 1.04], ["rIdL3", "logo-asean", logo && logo.asean, 1], ["rIdL4", "logo-banpt", logo && logo.banpt, 0.86]].filter(m => m[2]);
}
function kopTabel(lebar, judul, dok, media) {
  const lg = id => { const m = media.find(q => q[0] === id); return m ? gbr(m[0], m[1], 1.5, m[3]) : par(""); };
  const sisi = Math.round(lebar * 0.17), tengah = lebar - 2 * sisi, gk = [sisi, Math.floor(tengah / 2), tengah - Math.floor(tengah / 2), sisi];
  return tabel(gk, [
    { c: [{ xml: lg("rIdL1") + lg("rIdL2"), vm: "r", va: "center" }, { t: "KEMENTERIAN PARIWISATA REPUBLIK INDONESIA\nPOLITEKNIK PARIWISATA BALI", span: 2, b: 1, rata: "center", ukuran: 12, va: "center" }, { xml: lg("rIdL3") + lg("rIdL4"), vm: "r", va: "center" }], tinggi: 1300 },
    { c: [{ vm: "c" }, { t: judul + "\nPROGRAM STUDI USAHA PERJALANAN WISATA", span: 2, b: 1, rata: "center", ukuran: 12, va: "center" }, { vm: "c" }], tinggi: 900 },
    { c: [`No. Dokumen : ${(dok && dok.no) || ""}`, `No. Revisi : ${(dok && dok.revisi) || "00"}`,
      { xml: `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>${run("Halaman : ")}<w:fldSimple w:instr=" PAGE ">${run("1")}</w:fldSimple>${run(" dari ")}<w:fldSimple w:instr=" NUMPAGES ">${run("1")}</w:fldSimple></w:p>` },
      `Tanggal Terbit : ${(dok && dok.terbit) || ""}`] }
  ]);
}
function paket(h, o) {
  const media = o.media || [];
  const sect = o.lanskap ? `<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="1020" w:right="850" w:bottom="1020" w:left="850" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>`
    : `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>`;
  const rel = media.map(m => `<Relationship Id="${m[0]}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${m[1]}.png"/>`).join("");
  const f = [
    { nama: "[Content_Types].xml", data: `${KEP}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>` },
    { nama: "_rels/.rels", data: `${KEP}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>` },
    { nama: "docProps/core.xml", data: `${KEP}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${x(o.judul || "")}</dc:title><dc:creator>Repositori UPW</dc:creator><dc:description>${x(o.penanda || "")}</dc:description></cp:coreProperties>` },
    { nama: "word/_rels/document.xml.rels", data: `${KEP}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdGaya" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${rel}</Relationships>` },
    { nama: "word/styles.xml", data: `${KEP}<w:styles ${NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="id-ID"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>` },
    { nama: "word/document.xml", data: `${KEP}<w:document ${NS}><w:body>${h.join("")}${sect}</w:body></w:document>` }
  ].concat(media.map(m => ({ nama: `word/media/${m[1]}.png`, data: m[2] })));
  const zip = G.UPW_ZIP.zip(f);
  return typeof Blob !== "undefined" ? new Blob([zip], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }) : zip;
}
function buat(D, logo) {
  gbr.n = 0;
  const h = [];
  const media = mediaLogo(logo);
  h.push(kopTabel(LEBAR, "RENCANA PEMBELAJARAN SEMESTER (RPS)", D.dok, media));
  h.push(par("A. PERENCANAAN PERKULIAHAN", { b: 1, sebelum: 200, sesudah: 120, ukuran: 11 }));
  // Identitas
  const g6 = bagi(LEBAR, 6), M = D.mk || {}, O = D.otor || {}, hd = (t, o = {}) => Object.assign({ t, b: 1, fill: PEACH, rata: "center" }, o);
  const pengembang = (O.pengembang || []).length ? O.pengembang.map(garisNama).join("\n\n") : garisNama({});
  h.push(tabel(g6, [
    { c: [hd("Nama Mata Kuliah"), hd("Kode"), hd("Rumpun MK"), hd("Bobot (sks)"), hd("Semester"), hd("Tanggal Penyusunan")], hdr: 0 },
    { c: [{ t: M.nama || "", b: 1, rata: "center" }, { t: M.kode || "", b: 1, rata: "center" }, { t: M.rumpun || "[Rumpun MK]", b: 1, rata: "center" },
      { t: (M.sks || "") + (M.sksT || M.sksP ? `\n(T: ${M.sksT || 0}, P: ${M.sksP || 0})` : ""), b: 1, rata: "center" }, { t: M.semester || "", b: 1, rata: "center" }, { t: M.tgl || "[Tanggal]", b: 1, rata: "center" }] },
    { c: [hd("Labor Division", { span: 2 }), hd("Kualifikasi", { span: 2 }), hd("Jenjang", { span: 2 })] },
    { c: [{ t: D.labor || "[Labor division]", span: 2, rata: "center", i: 1 }, { t: D.kualifikasi || "[Kualifikasi, mis. Certificate IV]", span: 2, rata: "center" }, { t: D.jenjang || "[Jenjang, mis. Level 3]", span: 2, rata: "center" }] },
    { c: [{ t: "Otorisasi", vm: "r", b: 1, va: "bottom" }, { t: "Dosen Pengembang RPS", span: 2, b: 1, fill: ABU, rata: "center" }, { t: (O.kps && O.kps.jabatan) || "Koordinator Program Studi", span: 2, b: 1, fill: ABU, rata: "center" }, { t: (O.kajur && O.kajur.jabatan) || "Ketua Jurusan", b: 1, fill: ABU, rata: "center" }] },
    { c: [{ vm: "c" }, { t: "\n\n" + pengembang, span: 2, rata: "center" }, { t: "\n\n" + garisNama(O.kps || {}), span: 2, rata: "center" }, { t: "\n\n" + garisNama(O.kajur || {}), rata: "center" }], tinggi: 1500 }
  ]));
  h.push(par("", { sesudah: 120 }));
  // Capaian pembelajaran
  const LBL = 2400, KD = 1700, gc = [LBL, KD].concat(bagi(LEBAR - LBL - KD, 9));
  const lab = (t, r) => r ? { t, vm: "r", b: 1 } : { vm: "c" };
  const blok = (judul, kepala, item, isiItem) => {
    const b = [{ c: [lab(judul, 1), { t: kepala, span: 10, b: 1, fill: PEACH }] }];
    (item.length ? item : [null]).forEach(it => b.push({ c: [lab(), { t: it ? it.kode + (it.ref ? ` (${it.ref})` : "") : "[Kode]", b: 1 }, { t: it ? isiItem(it) : "[Rumusan]", span: 9 }] }));
    return b;
  };
  const rows = [].concat(
    blok("Capaian Pembelajaran (CP)", "CPL-PRODI (Capaian Pembelajaran Lulusan Program Studi) yang Dibebankan pada Mata Kuliah", D.cpl || [], c => c.t),
    blok("CPMK", "Capaian Pembelajaran Mata Kuliah (CPMK)", D.cpmk || [], c => c.t + (c.cpl && c.cpl.length && !/\(CPL/.test(c.t) ? ` (${c.cpl.join(", ")})` : "")),
    blok("Sub-CPMK", "Kemampuan akhir tiap tahapan belajar (Sub-CPMK)", D.sub || [], c => c.t));
  // Korelasi CPMK × Sub-CPMK (maks. 9 kolom; lebih dari itu ditulis sebagai daftar)
  const ns = (D.sub || []).length, cp = D.cpmk || [];
  rows.push({ c: [lab("Korelasi CPMK terhadap Sub-CPMK", 1), { t: "Korelasi CPMK terhadap Sub-CPMK", span: 10, b: 1, fill: PEACH }] });
  if (ns && ns <= 9) {
    const sp = bagi(9, ns).map(v => v);  // lebar sel dalam kolom grid
    const sb = (i, o) => Object.assign({ span: sp[i], rata: "center" }, o);
    rows.push({ c: [lab(), { t: "", b: 1 }].concat((D.sub || []).map((s, i) => sb(i, { t: String(i + 1), b: 1 }))) });
    cp.forEach(c => { const k = (D.kor || {})[c.kode] || []; rows.push({ c: [lab(), { t: c.kode, b: 1 }].concat((D.sub || []).map((s, i) => sb(i, { t: k.includes(i + 1) ? "✓" : "" }))) }); });
  } else cp.forEach(c => rows.push({ c: [lab(), { t: c.kode, b: 1 }, { t: "Sub-CPMK " + (((D.kor || {})[c.kode]) || []).join(", "), span: 9 }] }));
  const baris1 = (judul, t) => rows.push({ c: [{ t: judul, b: 1 }, { t, span: 10 }] });
  baris1("Deskripsi Singkat Mata Kuliah", D.deskripsi || "");
  baris1("Bahan Kajian", D.bahan || "");
  rows.push({ c: [{ t: "Pustaka", vm: "r", b: 1 }, { t: ["UTAMA"].concat((D.pustakaUtama || []).map((p, i) => `${i + 1}. ${p.replace(/^\d+\.\s*/, "")}`)).join("\n"), span: 10 }] });
  rows.push({ c: [{ vm: "c" }, { t: ["PENDUKUNG"].concat((D.pustakaPendukung || []).map((p, i) => `${(D.pustakaUtama || []).length + i + 1}. ${p.replace(/^\d+\.\s*/, "")}`)).join("\n"), span: 10 }] });
  baris1("Media Pembelajaran", D.media || "");
  baris1("Nama Dosen Pengampu", (D.dosen || []).join("\n"));
  baris1("Tempat Pelaksanaan", D.tempat || "");
  baris1("Mata Kuliah Prasyarat (jika ada)", D.prasyarat || "-");
  h.push(tabel(gc, rows));
  // B. Program pembelajaran
  h.push(par("B. PROGRAM PEMBELAJARAN", { b: 1, sebelum: 0, sesudah: 120, ukuran: 11, halamanBaru: 1 }));
  const gp = [900, 1900, 2700, 2300, 1300, 2300, 2400, 700, 638], ph = (t, o = {}) => Object.assign({ t, b: 1, fill: PEACH, rata: "center", va: "center" }, o);
  const prog = [
    { c: [ph("Pertemuan Ke-", { vm: "r" }), ph("Sub-CPMK (Kemampuan akhir yang direncanakan)", { vm: "r" }), ph("Bahan Kajian (Topik)", { vm: "r" }), ph("Bentuk/Metode Pembelajaran (Media dan Sumber Belajar)", { vm: "r" }), ph("Waktu", { vm: "r" }), ph("Penilaian", { span: 3 }), ph("Referensi", { vm: "r" })], hdr: 1 },
    { c: [{ vm: "c", fill: PEACH }, { vm: "c", fill: PEACH }, { vm: "c", fill: PEACH }, { vm: "c", fill: PEACH }, { vm: "c", fill: PEACH }, ph("Pengalaman Belajar (Tugas Mahasiswa)"), ph("Kriteria Penilaian dan Indikator"), ph("Bobot (%)"), { vm: "c", fill: PEACH }], hdr: 1 },
    { c: ["(1)", "(2)", "(3)", "(4)", "(5)", "(6)", "(7)", "(8)", "(9)"].map(t => ({ t, rata: "center", i: 1 })), hdr: 1 }
  ];
  const pc = v => v === "" || v == null ? "" : String(v).replace(/\s*%?\s*$/, "") + "%";
  (D.pertemuan || []).forEach(p => prog.push(p.ujian
    ? { c: [{ t: p.ke, rata: "center" }, { t: p.ujian, span: 6, b: 1, rata: "center", fill: ABU }, { t: pc(p.bobot), rata: "center" }, ""] }
    : { c: [{ t: p.ke, rata: "center" }, p.sub || "", p.bahan || "", p.metode || "", p.waktu || "", p.pengalaman || "", p.kriteria || "", { t: pc(p.bobot), rata: "center" }, p.ref || ""] }));
  h.push(tabel(gp, prog));
  h.push(par("Catatan: Waktu ditulis per pertemuan dalam jam pelajaran (JP = 50 menit). Jam sajian menurut struktur kurikulum: teori 1 sks = 1 JP, praktik 1 sks = 2 JP per minggu; sisa beban 1 sks = 45 jam per semester berupa penugasan terstruktur (PT) dan kegiatan mandiri (KM). TM = tatap muka. Jumlah bobot seluruh pertemuan termasuk UTS dan UAS = 100%. Kolom Referensi berisi nomor daftar Pustaka.", { i: 1, ukuran: 9, sebelum: 80, sesudah: 120 }));
  // C. Portofolio penilaian
  h.push(par("C. PORTOFOLIO PENILAIAN DAN EVALUASI KETERCAPAIAN CPL MAHASISWA", { b: 1, sesudah: 120, ukuran: 11, halamanBaru: 1 }));
  const gq = [900, 1500, 1500, 1700, 3400, 2300, 900, 1100, 1100, 738];
  const port = [{ c: ["Minggu", "CPL", "CPMK (CLO)", "Sub-CPMK (LLO)", "Indikator", "Bentuk Penilaian", "Bobot (%)", "Nilai Mhs (0–100)", "∑ (Nilai × Bobot)", "Ketercapaian CPL pada MK (%)"].map(t => ph(t)), hdr: 1 }];
  (D.porto || []).forEach(p => port.push(p.ujian
    ? { c: [{ t: p.minggu, rata: "center" }, { t: p.ujian, span: 5, b: 1, rata: "center", fill: ABU }, { t: pc(p.bobot), rata: "center" }, "", "", ""] }
    : { c: [{ t: p.minggu, rata: "center" }, p.cpl || "", p.cpmk || "", p.sub || "", p.indikator || "", p.bentuk || "", { t: pc(p.bobot), rata: "center" }, "", "", ""] }));
  h.push(tabel(gq, port));
  h.push(par("Catatan: Nilai UAS untuk vokasi 30% teori dan 70% praktik; nilai UJK terintegrasi dengan nilai praktik. Rincian instrumen (soal, rubrik, lembar observasi) dilampirkan pada portofolio penilaian mata kuliah." + (D.hadirMin ? ` Syarat mengikuti UAS: kehadiran minimal ${D.hadirMin}%.` : ""), { i: 1, ukuran: 9, sebelum: 80, sesudah: 240 }));
  // Otorisasi
  h.push(par("OTORISASI", { b: 1, sesudah: 120, ukuran: 11 }));
  const ttd = (jab, orang) => `${jab}\n\n\n\n${orang.map(o => (o.nama || "[Nama]") + (o.nip ? `\nNIP: ${o.nip}` : "")).join("\n\n")}`;
  h.push(tabel(bagi(LEBAR, 3), [{ c: [
    { t: ttd((O.kajur && O.kajur.jabatan) || "Ketua Jurusan", [O.kajur || {}]), rata: "center" },
    { t: ttd((O.kps && O.kps.jabatan) || "Koordinator Program Studi", [O.kps || {}]), rata: "center" },
    { t: ttd("Dosen Pengampu Mata Kuliah", (O.pengembang || []).length ? O.pengembang : [{}]), rata: "center" }] }], { tanpaGaris: 1 }));
  return paket(h, { lanskap: true, judul: "RPS " + (M.nama || ""), penanda: PENANDA, media });
}

/* ---------- pembaca Word ---------- */
const ent = s => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16))).replace(/&amp;/g, "&");
function teksSel(s) {
  const ps = s.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
  return ps.map(p => ent((p.match(/<w:t[^>]*>[^<]*<\/w:t>|<w:tab\/>|<w:br[^>]*\/>/g) || []).map(t => t.startsWith("<w:tab") ? " " : t.startsWith("<w:br") ? "\n" : t.replace(/<[^>]+>/g, "")).join("")))
    .join("\n").replace(/[\uf000-\uf8ff]/g, "").replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").replace(/(\S)\s*•\s*/g, "$1\n• ").replace(/([.;])\s*(\d+\.\d+\s)/g, "$1\n$2").replace(/ *\n */g, "\n").trim();
}
/** Bagi XML menjadi potongan tingkat atas untuk tag tertentu (abaikan tabel bersarang). */
function potong(s, tag) {
  const h = [], re = new RegExp(`<w:tbl>|</w:tbl>|<w:${tag}[ >]|</w:${tag}>`, "g"); let d = 0, a = -1, m;
  while ((m = re.exec(s))) {
    const g = m[0];
    if (tag !== "tbl" && g === "<w:tbl>") d++;
    else if (tag !== "tbl" && g === "</w:tbl>") d--;
    else if (d === 0 && (g === `<w:${tag}>` || g === `<w:${tag} `)) a = m.index;
    else if (d === 0 && g === `</w:${tag}>` && a >= 0) { h.push(s.slice(a, m.index + g.length)); a = -1; }
    if (tag === "tbl") { if (g === "<w:tbl>") { if (d === 0) a = m.index; d++; } else if (g === "</w:tbl>") { d--; if (d === 0) { h.push(s.slice(a, m.index + g.length)); a = -1; } } }
  }
  return h;
}
function tabelDari(xml) {
  const inner = xml.slice(7, -8);
  return potong(inner, "tr").map(tr => { let k = 0;
    return potong(tr.replace(/^<w:tr[^>]*>/, ""), "tc").map(tc => { const sp = Number((tc.match(/<w:gridSpan w:val="(\d+)"/) || [])[1] || 1), vm = /<w:vMerge\/>|<w:vMerge w:val="continue"\/>/.test(tc);
      const c = { k, sp, vm, t: vm ? "" : teksSel(tc) }; k += sp; return c; }); });
}
const kodeCpl = s => (String(s).toUpperCase().match(/\b(?:KU|KK|S|P)\s?\d+\b/g) || []).map(v => v.replace(/\s/g, ""));
const nomor = s => Number((String(s).match(/\d+/) || [])[0] || 0);
const angkaBobot = s => { const m = String(s || "").replace(",", ".").match(/(\d+(?:\.\d+)?)\s*%?/); return m ? Number(m[1]) : null; };
const daftarBaris = t => String(t || "").split(/\n|•/).map(s => s.replace(/^[\s•\-–]+/, "").trim()).filter(s => s && !KOSONG.test(s));

async function baca(buf) {
  const ambil = await G.UPW_ZIP.buka(buf, "Word (.docx)");
  const doc = await ambil("word/document.xml");
  if (!doc) throw new Error("Berkas bukan dokumen Word (.docx) yang sah.");
  const core = (await ambil("docProps/core.xml")) || "";
  const body = (doc.match(/<w:body>([\s\S]*)<\/w:body>/) || [])[1] || doc;
  const T = potong(body, "tbl").map(tabelDari);
  const D = { v: 1, sumber: core.includes(PENANDA) ? "templat" : "lain", mk: {}, otor: { pengembang: [] }, cpl: [], cpmk: [], sub: [], kor: {}, pustakaUtama: [], pustakaPendukung: [], dosen: [], pertemuan: [], porto: [], peringatan: [] };
  const nilaiDi = (rows, i, k) => { const r = rows[i + 1] || []; const c = r.find(c => c.k === k) || r.find(c => c.k <= k && k < c.k + c.sp); return c ? isi(c.t) : ""; };
  for (const rows of T) {
    const semua = rows.map(r => r.map(c => c.t).join(" | ")).join("\n");
    // Identitas
    rows.forEach((r, i) => r.forEach(c => {
      const t = c.t.replace(/\s+/g, " ").trim();
      if (/^Nama\s*Mata\s*Kuliah$/i.test(t)) D.mk.nama = nilaiDi(rows, i, c.k);
      else if (/^Kode( MK)?$/i.test(t)) D.mk.kode = nilaiDi(rows, i, c.k);
      else if (/^Rumpun/i.test(t)) D.mk.rumpun = nilaiDi(rows, i, c.k);
      else if (/^Bobot \(sks\)/i.test(t)) { const v = nilaiDi(rows, i, c.k); D.mk.sks = (v.match(/\d+/) || [""])[0]; const tp = v.match(/T:\s*(\d+).*P:\s*(\d+)/); if (tp) { D.mk.sksT = Number(tp[1]); D.mk.sksP = Number(tp[2]); } }
      else if (/^Semester$/i.test(t)) D.mk.semester = nilaiDi(rows, i, c.k);
      else if (/^Tanggal Penyusunan/i.test(t)) D.mk.tgl = nilaiDi(rows, i, c.k);
      else if (/^Labor Division/i.test(t)) D.labor = nilaiDi(rows, i, c.k);
      else if (/^Kualifikasi$/i.test(t)) D.kualifikasi = nilaiDi(rows, i, c.k);
      else if (/^Jenjang$/i.test(t)) D.jenjang = nilaiDi(rows, i, c.k);
      else if (/^Dosen Pengembang RPS/i.test(t)) D.otor.pengembangTeks = nilaiDi(rows, i, c.k);
      else if (/^(Koordinator|Ketua) Program Studi|^KPS$/i.test(t) && rows[i + 1]) D.otor.kpsTeks = nilaiDi(rows, i, c.k);
      else if (/^(KaJur|Ketua Jurusan)/i.test(t) && rows[i + 1]) D.otor.kajurTeks = nilaiDi(rows, i, c.k);
    }));
    // Program pembelajaran / portofolio
    const kepala = rows.findIndex(r => { const s = r.map(c => c.t).join(" "); return /Pertemuan|Minggu/i.test(s) && /Sub-?CPMK|Kemampuan akhir/i.test(s); });
    if (kepala >= 0) {
      const kol = {}, hdrRows = [rows[kepala]];
      for (let j = kepala + 1; j < kepala + 3 && rows[j]; j++) { if (/^\d+$/.test(((rows[j][0] || {}).t || "").trim())) break; hdrRows.push(rows[j]); }
      hdrRows.forEach(r => r.forEach(c => { for (let j = c.k; j < c.k + c.sp; j++) kol[j] = ((kol[j] || "") + " " + c.t).trim(); }));
      const cari = (re, kec) => { const j = Object.keys(kol).map(Number).filter(j => re.test(kol[j]) && !(kec && kec.test(kol[j]))); return j.length ? j[0] : -1; };
      const porto = /Indikator/i.test(semua) && /Nilai mhs|Ketercapaian CPL/i.test(semua);
      const ambilK = (r, j) => { if (j < 0) return ""; const c = r.find(c => c.k <= j && j < c.k + c.sp); return c ? isi(c.t) : ""; };
      let jB = -1, jBentuk = -1;
      if (porto) {
        const hb = hdrRows[0].find(c => /Bentuk/i.test(c.t) && /Bobot/i.test(c.t));
        if (hb && hb.sp >= 2) { jBentuk = hb.k; jB = hb.k + 1; } else { jBentuk = cari(/Bentuk/i); jB = cari(/Bobot/i); }
      } else jB = cari(/Bobot/i);
      const J = porto ? { m: cari(/Minggu|Pertemuan/i), cpl: cari(/^CPL\b|^CPL$/i), cpmk: cari(/CPMK|CLO/i, /Sub/i), sub: cari(/Sub-?CPMK|LLO/i), ind: cari(/Indikator/i) }
        : { m: cari(/Pertemuan|Minggu/i), sub: cari(/Sub-?CPMK|Kemampuan akhir/i), bahan: cari(/Bahan Kajian|Materi|Topik/i), metode: cari(/Bentuk|Metode/i), waktu: cari(/Waktu/i),
          pengalaman: cari(/Pengalaman|Tugas Mahasiswa/i), kriteria: cari(/Kriteria|Indikator/i), ref: cari(/Referensi|Pustaka/i) };
      rows.slice(kepala + 1).forEach(r => {
        const nonKosong = r.filter(c => c.t);
        if (!nonKosong.length || nonKosong.every(c => /^\(?\d+\)?$/.test(c.t)) && nonKosong.length > 3) return;   // baris nomor kolom (1)…(9)
        const ke = ambilK(r, J.m); if (!/^\d+$/.test(ke.replace(/[()]/g, ""))) return;
        const lebar = r.find(c => c.sp >= 4 && /UTS|UAS|Ujian|Evaluasi/i.test(c.t));
        const ujian = lebar ? (/UTS|Tengah/i.test(lebar.t) ? "UTS" : /UAS|Akhir/i.test(lebar.t) ? "UAS" : "Ujian") : "";
        const bobot = angkaBobot(ambilK(r, jB));
        if (porto) D.porto.push(ujian ? { minggu: ke, ujian, bobot } : { minggu: ke, cpl: ambilK(r, J.cpl), cpmk: ambilK(r, J.cpmk), sub: ambilK(r, J.sub), indikator: ambilK(r, J.ind), bentuk: ambilK(r, jBentuk), bobot });
        else D.pertemuan.push(ujian ? { ke, ujian, bobot } : { ke, sub: ambilK(r, J.sub), bahan: ambilK(r, J.bahan), metode: ambilK(r, J.metode), waktu: ambilK(r, J.waktu),
          pengalaman: ambilK(r, J.pengalaman), kriteria: ambilK(r, J.kriteria), bobot, ref: ambilK(r, J.ref) });
      });
      continue;
    }
    // Capaian pembelajaran & bagian berlabel
    let label = "", korKol = null;
    rows.forEach(r => {
      const c0 = r[0] || { t: "" };
      if (c0.t && !c0.vm) label = c0.t.replace(/\s+/g, " ").trim();
      const kode = r.find(c => c.k > 0 && /^(Sub-?\s?CPMK|CPMK|CPL)\s*-?\s*\d+/i.test(c.t.trim())) || r.find(c => c.k > 0 && /^(KU|KK|S|P)\d+\b/.test(c.t.trim()));
      const sisa = kode ? r.filter(c => c.k > kode.k) : [];
      if (r.some(c => /Korelasi/i.test(c.t))) { label = "Korelasi"; return; }
      const angkaSaja = r.filter(c => c.k > 0 && c.t);
      if (!kode && angkaSaja.length >= 2 && angkaSaja.every(c => /^\d+$/.test(c.t))) { korKol = {}; angkaSaja.forEach(c => { for (let j = c.k; j < c.k + c.sp; j++) korKol[j] = Number(c.t); }); return; }
      if (kode && /^CPMK/i.test(kode.t.trim()) && sisa.length >= 2 && sisa.every(c => c.t.length <= 3)) {
        if (korKol) D.kor["CPMK " + nomor(kode.t)] = [...new Set(sisa.filter(c => /✓|√|\u2714|^v$|^x$/i.test(c.t)).map(c => korKol[c.k]).filter(Boolean))];
        return;
      }
      if (kode && label === "Korelasi" && /^CPMK/i.test(kode.t.trim())) { D.kor["CPMK " + nomor(kode.t)] = (sisa.map(c => c.t).join(" ").match(/\d+/g) || []).map(Number); return; }
      if (kode) {
        const teks = sisa.map(c => c.t).filter(Boolean).join(" ").trim(); if (!isi(teks)) return;
        const kt = kode.t.trim();
        if (/^Sub-?\s?CPMK/i.test(kt)) D.sub.push({ kode: "Sub-CPMK " + nomor(kt), t: teks });
        else if (/^CPMK/i.test(kt)) D.cpmk.push({ kode: "CPMK " + nomor(kt), t: teks, cpl: (teks.match(/CPL\s?-?\d+/gi) || []).map(v => "CPL" + nomor(v)) });
        else { const ref = kodeCpl(kt.replace(/^CPL\s*-?\s*\d+/i, ""))[0] || (/^(KU|KK|S|P)\d+/.test(kt) ? kodeCpl(kt)[0] : ""); D.cpl.push({ kode: /^CPL/i.test(kt) ? "CPL" + nomor(kt) : ref, ref, t: teks }); }
        return;
      }
      const nilai = r.filter(c => c.k > 0).map(c => c.t).filter(Boolean).join("\n").trim();
      if (/^Deskripsi/i.test(label)) D.deskripsi = isi(nilai) || D.deskripsi || "";
      else if (/^Bahan Kajian/i.test(label)) D.bahan = isi(nilai.replace(/^[\d\s/]+\n?/, "")) || D.bahan || "";
      else if (/^Pustaka|Referensi/i.test(label)) {
        let ke = /PENDUKUNG/i.test(nilai) && !/UTAMA/i.test(nilai) ? "pustakaPendukung" : "pustakaUtama";
        daftarBaris(nilai).forEach(s => { if (/^UTAMA$/i.test(s)) { ke = "pustakaUtama"; return; } if (/^PENDUKUNG$/i.test(s)) { ke = "pustakaPendukung"; return; } D[ke].push(s.replace(/^\d+[.)]\s*/, "")); });
      } else if (/^Media/i.test(label)) D.media = isi(nilai);
      else if (/^Nama Dosen|^Dosen Pengampu|^Team Teaching/i.test(label)) D.dosen = daftarBaris(nilai);
      else if (/^Tempat/i.test(label)) D.tempat = isi(nilai);
      else if (/prasyarat/i.test(label)) D.prasyarat = isi(nilai);
    });
  }
  // Pengembang dari teks otorisasi "Nama / NIP: …"
  const orang = t => { const s = String(t || "").split("\n").map(v => v.trim()).filter(Boolean), h = []; s.forEach(v => { const n = v.match(/NIP\.?\s*:?\s*([\d ]{8,})/i); if (n) { if (h.length) h[h.length - 1].nip = n[1].replace(/\s/g, ""); } else if (!/^\[|^NIP\b/i.test(v)) h.push({ nama: v, nip: "" }); }); return h; };
  D.otor.pengembang = orang(D.otor.pengembangTeks); D.otor.kps = orang(D.otor.kpsTeks)[0] || null; D.otor.kajur = orang(D.otor.kajurTeks)[0] || null;
  delete D.otor.pengembangTeks; delete D.otor.kpsTeks; delete D.otor.kajurTeks;
  if (!D.mk.nama && !D.cpl.length && !D.pertemuan.length) throw new Error("Isi RPS tidak dikenali (tabel identitas, CPL, dan program pembelajaran tidak ditemukan). Gunakan templat RPS dari aplikasi.");
  [["cpl", "CPL"], ["cpmk", "CPMK"], ["sub", "Sub-CPMK"], ["pertemuan", "tabel program pembelajaran"], ["porto", "tabel portofolio penilaian"]].forEach(([k, l]) => { if (!D[k].length) D.peringatan.push(`${l} tidak ditemukan`); });
  return D;
}

/* ---------- pemeriksaan (butir 8 Matriks LAMWisata) ---------- */
const kata = s => String(s || "").toLowerCase().replace(/[^a-z0-9à-ÿ\s]/g, " ").split(/\s+/).filter(w => w.length > 2);
function mirip(a, b) { const A = new Set(kata(a)), B = new Set(kata(b)); if (!A.size || !B.size) return 0; let n = 0; A.forEach(w => { if (B.has(w)) n++; }); return n / Math.max(A.size, B.size); }
const intiNama = s => kata(String(s || "").split(",")[0].replace(/\b(dr|drs|dra|ir|prof|hj|h)\.?\s/gi, " ")).filter(w => !/^(s|m|st|mm|se|ss|par|tr|pd|hum|si|kom|ak|sc|ma|che|cee)$/.test(w));
function namaSama(a, b) { const A = intiNama(a), B = new Set(intiNama(b)); const n = A.filter(w => B.has(w)).length; return n >= Math.min(2, A.length, B.size); }

const normKual = s => String(s || "").toLowerCase().replace(/sertifikat/g, "certificate").replace(/advance\b/g, "advanced").replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
function periksa(D, R) {
  const h = [], wajib = t => h.push({ t: "wajib", teks: t }), saran = t => h.push({ t: "saran", teks: t }), ok = t => h.push({ t: "ok", teks: t });
  const prodi = {}; ((R && R.cplProdi) || []).forEach(c => { prodi[c.k] = c; });
  const mk = (R && R.mk) || null;
  (D.peringatan || []).forEach(p => wajib(p.charAt(0).toUpperCase() + p.slice(1) + "."));
  if (mk) {
    if (D.mk.kode && String(D.mk.kode).replace(/\s/g, "") !== String(mk.kode).replace(/\s/g, "")) wajib(`Kode MK di RPS (${D.mk.kode}) berbeda dengan kurikulum di aplikasi (${mk.kode}).`);
    if (D.mk.sks && Number(D.mk.sks) !== Number(mk.sks)) wajib(`Bobot di RPS ${D.mk.sks} sks, di kurikulum ${mk.sks} sks.`);
    if (D.mk.semester && nomor(D.mk.semester) && nomor(D.mk.semester) !== Number(mk.semester)) saran(`Semester di RPS (${D.mk.semester}) berbeda dengan kurikulum (${mk.semester}).`);
  }
  if (!D.mk.tgl) saran("Tanggal penyusunan belum diisi (bukti RPS ditinjau berkala).");
  const Q = R && R.kualifikasi;
  if (Q && Q.kualifikasi && (!isi(D.kualifikasi) || !isi(D.jenjang))) saran(`Kualifikasi dan jenjang belum diisi (semester ${mk ? mk.semester : ""}: ${Q.kualifikasi}, ${Q.jenjang}).`);
  else if (Q && Q.kualifikasi && (normKual(D.kualifikasi) !== normKual(Q.kualifikasi) || nomor(D.jenjang) !== nomor(Q.jenjang)))
    saran(`Kualifikasi/jenjang di RPS (${D.kualifikasi}, ${D.jenjang}) berbeda dengan struktur kurikulum untuk semester ${mk ? mk.semester : ""} (${Q.kualifikasi}, ${Q.jenjang}).`);
  // Capaian pembelajaran
  if (D.cpl.length) {
    const salah = D.cpl.filter(c => c.ref && prodi[c.ref.toUpperCase()] && mirip(c.t, prodi[c.ref.toUpperCase()].t) < 0.6);
    const takDikenal = D.cpl.filter(c => !c.ref || (Object.keys(prodi).length && !prodi[String(c.ref).toUpperCase()]));
    if (takDikenal.length) wajib(`Kode CPL prodi tidak dikenali untuk ${takDikenal.map(c => c.kode).join(", ")} (tulis seperti "CPL1 (S9)").`);
    salah.forEach(c => saran(`Rumusan ${c.kode} (${c.ref}) berbeda dengan CPL prodi ${c.ref}: "${prodi[c.ref.toUpperCase()].t}".`));
    if (!takDikenal.length && !salah.length) ok(`${D.cpl.length} CPL prodi dibebankan dan sesuai daftar CPL kurikulum.`);
  }
  if (R && R.cplMk && R.cplMk.length && D.cpl.length) {   // v0.46.0: dibanding CPL yang ditetapkan prodi untuk MK ini
    const diRps = new Set(D.cpl.map(c => String(c.ref || "").toUpperCase())), tetap = new Set(R.cplMk);
    const kurang = R.cplMk.filter(k => !diRps.has(k)), lebih = [...diRps].filter(k => k && !tetap.has(k));
    if (kurang.length || lebih.length) wajib(`CPL di RPS berbeda dengan CPL yang ditetapkan prodi untuk MK ini (${R.cplMk.join(", ")})${kurang.length ? `; belum dimuat: ${kurang.join(", ")}` : ""}${lebih.length ? `; di luar penetapan: ${lebih.join(", ")}` : ""}.`);
    else ok("CPL di RPS sama dengan penetapan prodi untuk MK ini.");
  }
  if (R && R.unit && R.unit.length && isi(D.bahan)) {
    const b = String(D.bahan).replace(/\s/g, "").toUpperCase(), tak = R.unit.filter(u => u.k && !b.includes(String(u.k).replace(/\s/g, "").toUpperCase()));
    if (tak.length) saran(`Unit kompetensi kurikulum belum tercantum di bahan kajian: ${tak.map(u => u.k).join(", ")}.`);
  }
  if (D.cpmk.length) {
    const tanpa = D.cpmk.filter(c => !c.cpl.length);
    if (tanpa.length) saran(`${tanpa.map(c => c.kode).join(", ")} belum menyebut CPL yang didukung (tulis di akhir rumusan, mis. "(CPL1, CPL2)").`);
    const dukung = new Set(D.cpmk.flatMap(c => c.cpl)), lepas = D.cpl.filter(c => /^CPL/i.test(c.kode) && !dukung.has(c.kode.toUpperCase().replace(/\s/g, "")));
    if (lepas.length && !tanpa.length) wajib(`${lepas.map(c => c.kode).join(", ")} belum didukung CPMK mana pun.`);
  }
  if (D.sub.length && D.pertemuan.length) {
    const dipakai = new Set(D.pertemuan.flatMap(p => (String(p.sub || "").match(/\d+/g) || []).map(Number)));
    const tak = D.sub.filter(s => !dipakai.has(nomor(s.kode)));
    if (tak.length) saran(`${tak.map(s => s.kode).join(", ")} tidak muncul di program pembelajaran.`);
  }
  if (D.cpmk.length && Object.keys(D.kor).length) { const tk = D.cpmk.filter(c => !(D.kor[c.kode] || []).length); if (tk.length) saran(`Korelasi: ${tk.map(c => c.kode).join(", ")} belum dikaitkan dengan Sub-CPMK.`); }
  if (!isi(D.bahan)) wajib("Bahan kajian belum diisi (butir 8: bahan kajian).");
  if (!isi(D.deskripsi)) saran("Deskripsi singkat mata kuliah belum diisi.");
  if (!D.pustakaUtama.length) wajib("Pustaka utama belum diisi.");
  if (!isi(D.media)) saran("Media pembelajaran belum diisi.");
  // Program pembelajaran: metode, waktu dan tahapan, asesmen
  const P = D.pertemuan, biasa = P.filter(p => !p.ujian);
  if (P.length) {
    if (P.length < 16) saran(`Program pembelajaran berisi ${P.length} pertemuan (umumnya 16 termasuk UTS dan UAS).`);
    if (!P.some(p => p.ujian === "UTS") || !P.some(p => p.ujian === "UAS")) saran("UTS dan/atau UAS belum tercantum di program pembelajaran.");
    const tm = biasa.filter(p => !isi(p.metode)); if (tm.length) wajib(`Bentuk/metode pembelajaran belum diisi pada pertemuan ${tm.map(p => p.ke).join(", ")} (butir 8: metode pembelajaran).`);
    const tw = biasa.filter(p => !isi(p.waktu)); if (tw.length) wajib(`Waktu belum diisi pada ${tw.length === biasa.length ? "semua" : tw.length} pertemuan${tw.length === biasa.length ? "" : " (" + tw.map(p => p.ke).join(", ") + ")"} (butir 8: waktu dan tahapan).`);
    const tb = biasa.filter(p => !isi(p.bahan)); if (tb.length) wajib(`Bahan kajian/topik belum diisi pada pertemuan ${tb.map(p => p.ke).join(", ")}.`);
    const tk = biasa.filter(p => !isi(p.kriteria)); if (tk.length) wajib(`Kriteria dan indikator penilaian belum diisi pada pertemuan ${tk.map(p => p.ke).join(", ")} (butir 8: asesmen).`);
    const tr = biasa.filter(p => !isi(p.ref)); if (tr.length) saran(`Kolom Referensi kosong pada ${tr.length === biasa.length ? "semua" : tr.length} pertemuan; tulis nomor pustaka yang dipakai.`);
    const ju = P.filter(p => p.ujian && p.bobot == null); if (ju.length) wajib(`Bobot ${ju.map(p => p.ujian).join(" dan ")} kosong di program pembelajaran.`);
    const tot = Math.round(P.reduce((a, p) => a + (p.bobot || 0), 0) * 100) / 100;
    if (tot !== 100) wajib(`Jumlah bobot di program pembelajaran ${String(tot).replace(".", ",")}%, seharusnya 100%.`);
    if (!h.some(v => v.t === "wajib" && /pertemuan|bobot|Waktu|metode/i.test(v.teks))) ok("Program pembelajaran lengkap: metode, waktu, kriteria, dan bobot 100%.");
  }
  if (D.porto.length) {
    const tot = Math.round(D.porto.reduce((a, p) => a + (p.bobot || 0), 0) * 100) / 100;
    if (tot !== 100) wajib(`Jumlah bobot di portofolio penilaian ${String(tot).replace(".", ",")}%, seharusnya 100%.`);
    const beda = D.porto.filter(q => { const p = P.find(v => String(v.ke) === String(q.minggu)); return p && p.bobot != null && q.bobot != null && p.bobot !== q.bobot; });
    if (beda.length) wajib(`Bobot berbeda antara program pembelajaran dan portofolio penilaian pada minggu ${beda.map(q => q.minggu).join(", ")}.`);
    const dinilai = new Set(D.porto.flatMap(q => (String(q.cpl || "").match(/CPL\s?-?\d+/gi) || []).map(v => "CPL" + nomor(v))));
    const takDinilai = D.cpl.filter(c => /^CPL/i.test(c.kode) && !dinilai.has(c.kode.replace(/\s/g, "").toUpperCase()));
    if (takDinilai.length) saran(`${takDinilai.map(c => c.kode).join(", ")} tidak diukur di portofolio penilaian.`);
  }
  if (R && R.tim && R.tim.length && D.dosen.length) {
    const hilang = R.tim.filter(t => !D.dosen.some(n => namaSama(t.nama, n)));
    if (hilang.length) saran(`Tim pengajar di aplikasi belum tercantum di RPS: ${hilang.map(t => t.nama).join("; ")}.`);
  }
  return h;
}

/* ---------- saran metode pembelajaran (butir 22 E) ---------- */
const POLA_METODE = [
  ["Project based learning", /project[- ]based|\bpjbl\b|proyek|project\b/i],
  ["Case based learning", /case[- ]based|studi kasus|\bkasus\b|\bcbl\b/i],
  ["Research based education (RBE)", /research[- ]based|\brbe\b|penelitian|riset\b/i],
  ["Industry based education (IBE)", /industry[- ]based|\bibe\b|mitra|industri|dudi|praktisi|perusahaan|klien/i],
  ["Teaching industry / factory", /teaching (factory|industry)|\btefa\b/i],
  ["Praktik lapangan di destinasi", /kunjungan lapangan|praktik lapangan|field ?(visit|trip)|lokasi mitra|desa wisata|destinasi|daya tarik wisata/i],
  ["Daring / blended", /daring|online|e-?learning|\blms\b|blended|zoom|google meet|hybrid/i]
];
function saranMetode(D, daftar) {
  const sumber = [["deskripsi", D.deskripsi], ["media", D.media], ["tempat", D.tempat]].concat((D.pertemuan || []).filter(p => !p.ujian).map(p => [`pertemuan ${p.ke}`, [p.metode, p.pengalaman, p.bahan].join(" ")]));
  const h = POLA_METODE.filter(([m]) => !daftar || daftar.includes(m)).map(([m, re]) => {
    const di = sumber.filter(([, t]) => re.test(String(t || ""))).map(([l]) => l);
    return { m, ada: di.length > 0, alasan: di.length ? "tertulis di " + (di.length > 4 ? di.slice(0, 4).join(", ") + ", …" : di.join(", ")) : "" };
  });
  const ada = m => h.find(v => v.m === m && v.ada);
  h.forEach(v => { if (v.ada) return;
    if (v.m === "Research based education (RBE)") v.tambah = "Belum ada integrasi penelitian. Bila ada penelitian dosen yang relevan, libatkan mahasiswa (butir 22 C).";
    if (v.m === "Industry based education (IBE)" && !ada("Praktik lapangan di destinasi")) v.tambah = "Pertimbangkan praktisi industri atau mitra sebagai sumber belajar (relevansi vokasi).";
    if (v.m === "Daring / blended") v.tambah = "Bukti interaksi daring (LMS/rekaman) memperkuat butir 22 A skor 4.";
  });
  return h;
}
function ringkas(D) {
  const P = D.pertemuan || [];
  return { cpl: (D.cpl || []).length, cpmk: (D.cpmk || []).length, sub: (D.sub || []).length, pertemuan: P.length, bobot: Math.round(P.reduce((a, p) => a + (p.bobot || 0), 0) * 100) / 100,
    unsur: [...new Set((D.cpl || []).map(c => (String(c.ref).toUpperCase().match(/^(KU|KK|S|P)/) || [])[1]).filter(Boolean))] };
}
/* ---------- Tahap 2 (v0.43.0): kontrak kuliah, rubrik/portofolio penilaian (Word), lembar nilai (Excel) ----------
   Mengacu Matriks LAMWisata butir 25: A (5 prinsip penilaian + rubrik/portofolio), B (teknik & instrumen), C (7 unsur pelaksanaan penilaian).
   Bahan: R = mkp.rpsRef (MK, tim kelas, otorisasi + skala nilai), D = RPS terbaca terakhir (boleh null → isian [ … ]). */
const KTK = "☒", KSG = "☐";
const TEKNIK = [["Observasi", /observasi|pengamatan|field visit/i], ["Partisipasi", /partisipasi|keaktifan|diskusi|peer/i], ["Unjuk kerja", /praktik|unjuk kerja|presentasi|demonstrasi|proyek|project|redesign|layout|shooting/i],
  ["Tes tertulis", /tes tertulis|ujian tertulis|kuis|quiz|esai/i], ["Tes lisan", /lisan|tanya jawab|wawancara/i], ["Angket", /angket|kuesioner|refleksi diri|penilaian sejawat|peer review/i]];
const INSTRUMEN = [["Rubrik (penilaian proses)", /rubrik|praktik|presentasi|observasi|unjuk|diskusi/i], ["Portofolio (penilaian hasil)", /portofolio|laporan|makalah|dokumen|file|outline|analisis/i],
  ["Karya desain", /desain|layout|buku|konten|video|foto|brosur|poster|karya|moodboard|cover/i]];
function teksPenilaian(D) { return D ? [].concat((D.porto || []).map(p => [p.bentuk, p.indikator].join(" ")), (D.pertemuan || []).map(p => [p.kriteria, p.pengalaman, p.metode].join(" "))).join(" \n ") : ""; }
const centang = (daftar, t) => daftar.map(([l, re]) => `${t && re.test(t) ? KTK : KSG} ${l}`).join("    ");
const LEVEL = [["Sangat baik", "86–100"], ["Baik", "71–85"], ["Cukup", "56–70"], ["Kurang", "≤ 55"]];
function komponenNilai(D) {
  const P = D && (D.porto || []).length ? D.porto : D && (D.pertemuan || []).length ? D.pertemuan.map(p => ({ minggu: p.ke, ujian: p.ujian, bentuk: p.pengalaman, cpmk: p.sub, indikator: p.kriteria, bobot: p.bobot })) : [];
  return P.filter(p => p.ujian || p.bobot);
}
function identitasBaris(R, D, lengkap, I = {}) {
  const M = R.mk, tim = (R.tim || []).map(t => t.nama + (t.nip ? ` (NIP ${t.nip})` : t.praktisi ? " (praktisi)" : "")).join("\n") || "[Dosen pengampu]";
  const q = R.kualifikasi || {}, b = [["Mata kuliah", `${M.nama} (${M.kode})`], ["Bobot", `${M.sks} sks (teori ${(Number(M.sksKuliah) || 0) + (Number(M.sksSeminar) || 0)}, praktik ${Number(M.sksPraktik) || 0})`],
    ["Semester / kelas", `${M.semester} / ${String(R.labelKelas || "").replace(/^kelas /i, "Kelas ")}`], ["Tahun akademik", R.labelSemester || ""], ["Dosen pengampu", tim]];
  if (lengkap) b.push(["Kualifikasi / jenjang", [q.kualifikasi, q.jenjang].filter(Boolean).join(", ") || "[Kualifikasi, jenjang]"], ["Kontak dosen", I.kontak || "[Surel / telepon / jam konsultasi]"],
    ["Jadwal dan tempat", I.jadwal || "[Hari, jam, ruang/lokasi]"], ["Mata kuliah prasyarat", (D && isi(D.prasyarat)) || "-"]);
  return b;
}
function bab(h, t) { h.push(par(t, { b: 1, sebelum: 200, sesudah: 80, ukuran: 11 })); }
function poin(h, l, nomor) { l.forEach((t, i) => h.push(par((nomor ? `${i + 1}. ` : "• ") + t, { sesudah: 40 }))); }
function skalaTabel(W, R) {
  const s = (R.otorisasi && R.otorisasi.skala) || [];
  const g = bagi(W, 3), b = [{ c: ["Nilai huruf", "Angka mutu", "Rentang nilai angka"].map(t => ({ t, b: 1, fill: PEACH, rata: "center" })) }];
  (s.length ? s.map(v => [v.h, String(v.m).replace(".", ","), `${String(v.a).replace(".", ",")} – ${String(v.b).replace(".", ",")}`]) : [1, 2, 3, 4, 5].map(() => ["[Huruf]", "[Angka mutu]", "[Rentang]"]))
    .forEach(r => b.push({ c: r.map(t => ({ t, rata: "center" })) }));
  return tabel(g, b);
}
/** I = isian tambahan (contoh): kontak, jadwal, lms, batas, telat, hariUmpan, hariKeberatan, monevTemuan, monevPerbaikan, lain, tempatTgl. */
function kontrak(R, D, logo, I0 = {}) {
  gbr.n = 0;
  const W = 9638, media = mediaLogo(logo), h = [], O = R.otorisasi || {};
  // v0.45.0: data bersama prodi (Data Prodi › Kurikulum › Data bersama templat) mengisi bagian yang kosong
  const I = Object.assign({}, I0), B = { lms: O.lms, telat: O.telat, hariUmpan: O.hariUmpan, hariKeberatan: O.hariKeberatan, tempatTgl: O.tempat ? O.tempat + ", [tanggal pertemuan pertama]" : "" };
  Object.keys(B).forEach(k => { if (!I[k] && B[k]) I[k] = B[k]; });
  h.push(kopTabel(W, "KONTRAK PERKULIAHAN", null, media));
  bab(h, "A. IDENTITAS MATA KULIAH");
  h.push(tabel([2800, W - 2800], identitasBaris(R, D, true, I).map(([a, b]) => ({ c: [{ t: a, b: 1 }, b] }))));
  bab(h, "B. DESKRIPSI MATA KULIAH");
  h.push(par((D && isi(D.deskripsi)) || "[Deskripsi singkat mata kuliah, sama dengan RPS]"));
  bab(h, "C. CAPAIAN PEMBELAJARAN");
  const cpl = (D && D.cpl || []).length ? D.cpl.map(c => `${c.kode}${c.ref ? ` (${c.ref})` : ""}: ${c.t}`) : ["[CPL prodi yang dibebankan, sama dengan RPS]"];
  const cpmk = (D && D.cpmk || []).length ? D.cpmk.map(c => `${c.kode}: ${c.t}`) : ["[CPMK, sama dengan RPS]"];
  h.push(par("CPL yang dibebankan:", { b: 1, sesudah: 40 })); poin(h, cpl);
  h.push(par("Capaian pembelajaran mata kuliah (CPMK):", { b: 1, sebelum: 80, sesudah: 40 })); poin(h, cpmk);
  bab(h, "D. RENCANA KEGIATAN PEMBELAJARAN");
  const gp = [1100, 5000, W - 6100], rp = [{ c: ["Pertemuan", "Topik / bahan kajian", "Bentuk / metode pembelajaran"].map(t => ({ t, b: 1, fill: PEACH, rata: "center" })), hdr: 1 }];
  ((D && D.pertemuan || []).length ? D.pertemuan : Array.from({ length: 16 }, (_, i) => i === 7 ? { ke: "8", ujian: "UTS" } : i === 15 ? { ke: "16", ujian: "UAS" } : { ke: String(i + 1), bahan: "[Topik]", metode: "[Metode]" }))
    .forEach(p => rp.push(p.ujian ? { c: [{ t: p.ke, rata: "center" }, { t: p.ujian, span: 2, b: 1, rata: "center", fill: ABU }] } : { c: [{ t: p.ke, rata: "center" }, isi(p.bahan) || "[Topik]", isi(p.metode) || "[Metode]"] }));
  h.push(tabel(gp, rp));
  bab(h, "E. RENCANA PENILAIAN (unsur 1: kontrak rencana penilaian)");
  const K = komponenNilai(D), gk = [1000, 3900, 1800, W - 7900 - 1000, 1000];
  const rk = [{ c: ["Minggu", "Bentuk penilaian / tugas", "CPMK / Sub-CPMK", "Indikator", "Bobot (%)"].map(t => ({ t, b: 1, fill: PEACH, rata: "center" })), hdr: 1 }];
  (K.length ? K : [{ minggu: "[ ]", bentuk: "[Tugas/praktik]", cpmk: "[CPMK]", indikator: "[Indikator]", bobot: "" }, { minggu: "8", ujian: "UTS", bobot: "" }, { minggu: "16", ujian: "UAS", bobot: "" }])
    .forEach(p => rk.push({ c: [{ t: p.minggu, rata: "center" }, p.ujian ? { t: p.ujian === "UTS" ? "Ujian Tengah Semester (UTS)" : p.ujian === "UAS" ? "Ujian Akhir Semester (UAS)" : p.ujian, b: 1 } : isi(p.bentuk) || "[Bentuk]",
      p.ujian ? "" : [isi(p.cpmk), isi(p.sub)].filter(Boolean).join(" / "), p.ujian ? "" : isi(p.indikator), { t: p.bobot === "" || p.bobot == null ? "[ ]" : String(p.bobot), rata: "center" }] }));
  const tot = K.reduce((a, p) => a + (Number(p.bobot) || 0), 0);
  rk.push({ c: [{ t: "Jumlah", span: 4, b: 1, rata: "right" }, { t: K.length ? String(Math.round(tot * 100) / 100) : "100", b: 1, rata: "center" }] });
  h.push(tabel(gk, rk));
  if (K.length && Math.round(tot * 100) !== 10000) h.push(par(`[Periksa: jumlah bobot dari RPS ${String(Math.round(tot * 100) / 100).replace(".", ",")}%, seharusnya 100%]`, { sebelum: 40 }));
  const tp = teksPenilaian(D);
  bab(h, "F. TEKNIK DAN INSTRUMEN PENILAIAN");
  h.push(par("Teknik penilaian: " + centang(TEKNIK, tp), { sesudah: 40 }));
  h.push(par("Instrumen penilaian: " + centang(INSTRUMEN, tp), { sesudah: 40 }));
  h.push(par("Tanda ☒ diisi otomatis dari RPS; ubah sesuai pelaksanaan. Rubrik setiap penilaian ada pada dokumen Rubrik dan Portofolio Penilaian.", { i: 1, ukuran: 9 }));
  bab(h, "G. KESEPAKATAN PELAKSANAAN PENILAIAN (unsur 2)");
  poin(h, ["Penilaian dilaksanakan sesuai jadwal, bentuk, dan bobot pada bagian E. Perubahan hanya dengan kesepakatan dosen dan mahasiswa, dicatat dan diumumkan di kelas/LMS.",
    `Tugas dikumpulkan melalui ${I.lms || "[LMS/surel/kelas]"} paling lambat ${I.batas || "[batas waktu]"}. Keterlambatan: ${I.telat || "[aturan pengurangan nilai]"}.`,
    "Mahasiswa yang berhalangan ujian dengan alasan sah mengikuti ujian susulan sesuai ketentuan akademik.",
    "Plagiarisme dan kecurangan dikenai sanksi sesuai peraturan akademik Politeknik Pariwisata Bali" + (O.pedoman ? ` (${O.pedoman})` : "") + "."]);
  bab(h, "H. UMPAN BALIK DAN HAK MEMPERTANYAKAN NILAI (unsur 3)");
  poin(h, [`Hasil setiap penilaian dikembalikan dengan umpan balik tertulis/lisan paling lambat ${I.hariUmpan || "[7]"} hari setelah penilaian.`,
    `Mahasiswa dapat mempertanyakan hasil penilaian kepada dosen paling lambat ${I.hariKeberatan || "[3]"} hari kerja setelah nilai diumumkan; dosen menanggapi dan mencatat perubahan bila ada.`]);
  bab(h, "I. DOKUMENTASI PENILAIAN (unsur 4)");
  poin(h, ["Instrumen, hasil kerja, dan rubrik terisi disimpan dosen; rekap nilai diunduh dari SIAKAD (Nilai Perkuliahan › Download Template) setelah semua nilai terisi. Semuanya diunggah ke Repositori UPW (Portofolio Mata Kuliah) setiap semester."]);
  bab(h, "J. PROSEDUR PENILAIAN (unsur 5)");
  poin(h, ["Perencanaan: rencana penilaian disusun di RPS dan disepakati dalam kontrak ini.", "Pemberian tugas atau soal beserta kriteria dan rubriknya.",
    "Observasi kinerja / pelaksanaan penilaian sesuai jadwal.", "Pengembalian hasil observasi dan umpan balik kepada mahasiswa.", "Pemberian nilai akhir berdasarkan bobot pada bagian E."], true);
  bab(h, "K. PELAPORAN NILAI (unsur 6)");
  h.push(par("Nilai akhir = Σ (nilai komponen × bobot). Nilai dilaporkan dalam bentuk angka dan huruf menurut skala berikut:", { sesudah: 80 }));
  h.push(skalaTabel(W, R));
  bab(h, "L. PERBAIKAN BERDASARKAN MONEV PENILAIAN (unsur 7)");
  poin(h, ["Hasil monev penilaian semester sebelumnya: " + (I.monevTemuan || "[temuan, mis. dari survei mahasiswa atau evaluasi GKM]"), "Perbaikan yang diterapkan pada semester ini: " + (I.monevPerbaikan || "[perubahan bentuk, bobot, atau rubrik]")]);
  bab(h, "M. TATA TERTIB PERKULIAHAN");
  poin(h, [`Kehadiran minimal ${O.hadirMin ? O.hadirMin + "%" : "[ … ]%"} dari jumlah pertemuan sebagai syarat mengikuti UAS.`, "Mahasiswa hadir tepat waktu, berpakaian sesuai ketentuan kampus, dan menjaga etika selama kegiatan di kampus maupun di lokasi mitra.",
    I.lain || "[Ketentuan lain yang disepakati]"]);
  h.push(par("Kontrak ini disepakati pada pertemuan pertama dan berlaku selama satu semester.", { sebelum: 200, sesudah: 120 }));
  h.push(par(I.tempatTgl || "[Tempat], [tanggal pertemuan pertama]", { rata: "right", sesudah: 120 }));
  const dsn = (R.tim || []).filter(t => !t.praktisi)[0] || {};
  h.push(tabel(bagi(W, 3), [{ c: [
    { t: `Dosen Pengampu\n\n\n\n${dsn.nama || "[Nama]"}\nNIP: ${dsn.nip || "[NIP]"}`, rata: "center" },
    { t: "Perwakilan Mahasiswa\n\n\n\n[Nama]\nNIM: [NIM]", rata: "center" },
    { t: `Mengetahui,\n${O.kpsJabatan || "Koordinator Program Studi"}\n\n\n${O.kpsNama || "[Nama]"}\nNIP: ${O.kpsNip || "[NIP]"}`, rata: "center" }] }], { tanpaGaris: 1 }));
  return paket(h, { judul: "Kontrak Perkuliahan " + R.mk.nama, penanda: "UPW-KONTRAK v1", media });
}
/** o.hanyaBerubrik: hanya komponen yang punya p.rubrik ([{k, l:[4 deskripsi], b}]) — dipakai untuk contoh. */
function rubrik(R, D, logo, o0 = {}) {
  gbr.n = 0;
  const o = Object.assign({ lms: (R.otorisasi || {}).lms }, o0);
  const W = LEBAR, media = mediaLogo(logo), h = [];
  h.push(kopTabel(W, "RUBRIK DAN PORTOFOLIO PENILAIAN", null, media));
  bab(h, "A. IDENTITAS MATA KULIAH");
  h.push(tabel([3200, W - 3200], identitasBaris(R, D, false).map(([a, b]) => ({ c: [{ t: a, b: 1 }, b] }))));
  bab(h, "B. PRINSIP PENILAIAN (butir 25 A)");
  h.push(tabel([2600, W - 2600], [{ c: [{ t: "Prinsip", b: 1, fill: PEACH }, { t: "Penerapan pada mata kuliah ini", b: 1, fill: PEACH }], hdr: 1 }].concat([
    ["Edukatif", "Hasil penilaian dan umpan balik membantu mahasiswa memperbaiki cara belajar dan mencapai CPMK. [Sesuaikan]"],
    ["Otentik", "Penilaian memakai tugas dan unjuk kerja nyata yang mencerminkan pekerjaan di industri perjalanan wisata" + ((D && D.porto || []).some(p => isi(p.bentuk)) ? ` (${[...new Set(D.porto.map(p => isi(p.bentuk)).filter(Boolean))].slice(0, 4).join("; ")})` : "") + ". [Sesuaikan]"],
    ["Objektif", "Penilaian memakai rubrik dengan kriteria dan rentang skor yang jelas pada bagian C. [Sesuaikan]"],
    ["Akuntabel", "Prosedur, kriteria, dan bobot disepakati pada kontrak perkuliahan dan dipahami mahasiswa sejak awal. [Sesuaikan]"],
    ["Transparan", `Kriteria, bobot, dan hasil penilaian dapat diakses mahasiswa melalui ${o.lms || "[LMS/kelas]"}. [Sesuaikan]`]].map(([a, b]) => ({ c: [{ t: a, b: 1 }, b] })))));
  bab(h, "C. RUBRIK PENILAIAN");
  h.push(par("Rentang skor setiap tingkat dapat disesuaikan. Isi deskripsi kinerja yang dapat diamati untuk setiap kriteria.", { i: 1, ukuran: 9, sesudah: 80 }));
  const K = komponenNilai(D).filter(p => !o.hanyaBerubrik || (p.rubrik || []).length), daftar = K.length ? K : [{ minggu: "[ ]", bentuk: "[Tugas/praktik]", cpmk: "[CPMK]", indikator: "[Kriteria 1]\n[Kriteria 2]", bobot: "" }];
  const gr = [600, 3600].concat(bagi(W - 600 - 3600 - 1100, 4)).concat([1100]);
  daftar.forEach((p, n) => {
    const judul = p.ujian ? `${n + 1}. ${p.ujian} (minggu ${p.minggu}) · bobot ${p.bobot ?? "[ ]"}%` : `${n + 1}. Minggu ${p.minggu} · ${isi(p.bentuk) || "[Bentuk penilaian]"} · ${[isi(p.cpmk), isi(p.sub)].filter(Boolean).join(" / ") || "[CPMK]"} · bobot ${p.bobot === "" || p.bobot == null ? "[ ]" : p.bobot}%`;
    h.push(par(judul, { b: 1, sebelum: 160, sesudah: 60 }));
    const krit = p.ujian ? ["[Kisi-kisi / kriteria soal 1]", "[Kriteria 2]"] : (String(p.indikator || "").split(/\n|(?=\b\d+\.\d+\s)/).map(s => s.replace(/^[•\-\s]+/, "").trim()).filter(s => isi(s)));
    const baris = [{ c: [{ t: "No", b: 1, fill: PEACH, rata: "center" }, { t: "Kriteria / indikator", b: 1, fill: PEACH }].concat(LEVEL.map(([l, r]) => ({ t: `${l}\n(${r})`, b: 1, fill: PEACH, rata: "center" }))).concat([{ t: "Bobot kriteria (%)", b: 1, fill: PEACH, rata: "center" }]), hdr: 1 }];
    if ((p.rubrik || []).length) p.rubrik.forEach((v, i) => baris.push({ c: [{ t: String(i + 1), rata: "center" }, v.k].concat(LEVEL.map((_, j) => (v.l || [])[j] || "[Deskripsi kinerja]")).concat([{ t: v.b != null ? String(v.b) : "[ ]", rata: "center" }]) }));
    else (krit.length ? krit : ["[Kriteria]"]).forEach((k, i) => baris.push({ c: [{ t: String(i + 1), rata: "center" }, k].concat(LEVEL.map(() => "[Deskripsi kinerja]")).concat([{ t: "[ ]", rata: "center" }]) }));
    h.push(tabel(gr, baris));
  });
  bab(h, "D. PORTOFOLIO PENILAIAN");
  poin(h, ["Rekap nilai setiap mahasiswa per komponen dan bobot diambil dari SIAKAD (Kelas Kuliah › Nilai Perkuliahan › Upload Excel › Download Template) setelah perkuliahan selesai, lalu diunggah ke Portofolio MK.",
    "Lampirkan contoh hasil kerja mahasiswa (nilai tinggi, sedang, rendah) dan rubrik terisi untuk setiap penilaian sebagai bukti."]);
  return paket(h, { lanskap: true, judul: "Rubrik dan Portofolio Penilaian " + R.mk.nama, penanda: "UPW-RUBRIK v1", media });
}
/** Lembar Excel portofolio penilaian: peserta × komponen (bobot dari RPS, bisa diubah), nilai akhir, huruf, ketercapaian CPL. */
function portoXlsx(R, D, peserta) {
  const K = komponenNilai(D), komp = K.length ? K : [{ minggu: "", bentuk: "Tugas", bobot: 30 }, { minggu: "8", ujian: "UTS", bobot: 30 }, { minggu: "16", ujian: "UAS", bobot: 40 }];
  const kol = n => { let s = ""; n++; while (n) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
  const a0 = 3, aN = a0 + komp.length - 1, cAkhir = aN + 1, ps = (peserta || []).length ? peserta : Array.from({ length: 5 }, () => ({ nim: "", nama: "" }));
  const skala = ((R.otorisasi && R.otorisasi.skala) || []).slice().sort((p, q) => q.a - p.a);
  const huruf = r => skala.length ? { f: skala.slice(0, -1).reduceRight((acc, s) => `IF(${kol(cAkhir)}${r}>=${s.a},"${s.h}",${acc})`, `"${skala[skala.length - 1].h}"`).replace(/^/, `IF(${kol(cAkhir)}${r}="","",`) + ")" } : "";
  const judul = k => k.ujian ? `${k.ujian}` : `M${k.minggu} ${String(isi(k.bentuk) || "Tugas").slice(0, 40)}`;
  const nilai = [["No", "NIM", "Nama"].concat(komp.map(judul), ["Nilai akhir", "Huruf"]), ["", "", "Bobot (%) →"].concat(komp.map(k => Number(k.bobot) || 0), [{ f: `SUM(${kol(a0)}2:${kol(aN)}2)`, v: komp.reduce((a, k) => a + (Number(k.bobot) || 0), 0) }, ""])];
  ps.forEach((m, i) => { const r = i + 3; nilai.push([i + 1, m.nim || "", m.nama || ""].concat(komp.map(() => ""), [{ f: `IF(COUNT(${kol(a0)}${r}:${kol(aN)}${r})=0,"",SUMPRODUCT(${kol(a0)}${r}:${kol(aN)}${r},${kol(a0)}$2:${kol(aN)}$2)/${kol(cAkhir)}$2)` }, huruf(r)])); });
  const cpl = (D && D.cpl || []).map(c => c.kode);
  const lembar = [{ nama: "Nilai", baris: nilai, lebar: [5, 14, 30].concat(komp.map(() => 14), [12, 8]) }];
  if (cpl.length) {
    const kc = cpl.map(k => komp.map((c, j) => c.ujian ? -1 : (String(c.cpl || "").toUpperCase().replace(/\s/g, "").split(/[,;/]/).includes(k.toUpperCase()) ? j : -1)).filter(j => j >= 0));
    const b = [["No", "NIM", "Nama"].concat(cpl.map((k, i) => `${k}${(D.cpl[i] || {}).ref ? " (" + D.cpl[i].ref + ")" : ""}`))];
    const rumusCpl = (js, r) => {
      const sel = js.map(j => "Nilai!" + kol(a0 + j) + r), bb = js.map(j => "Nilai!" + kol(a0 + j) + "$2");
      return { f: "IF(COUNT(" + sel.join(",") + ")=0,\"\",(" + js.map((j, q) => "N(" + sel[q] + ")*" + bb[q]).join("+") + ")/(" + bb.join("+") + "))" };
    };
    ps.forEach((m, i) => { const r = i + 3; b.push([i + 1, m.nim || "", m.nama || ""].concat(kc.map(js => js.length ? rumusCpl(js, r) : ""))); });
    const n = ps.length;
    b.push(["", "", "Rata-rata kelas"].concat(cpl.map((_, i) => ({ f: `IFERROR(AVERAGE(${kol(3 + i)}2:${kol(3 + i)}${n + 1}),"")` }))));
    lembar.push({ nama: "Ketercapaian CPL", baris: b, lebar: [5, 14, 30].concat(cpl.map(() => 14)) });
  }
  lembar.push({ nama: "Petunjuk", baris: [["Portofolio penilaian " + R.mk.nama + " (" + R.mk.kode + ") · " + (R.labelKelas || "") + " · " + (R.labelSemester || "")],
    ["Isi nilai 0–100 pada lembar Nilai (baris mulai 3). Baris 2 berisi bobot dari RPS; ubah bila kontrak menyepakati bobot lain."],
    ["Nilai akhir = Σ (nilai × bobot) ÷ jumlah bobot. Huruf mengikuti skala nilai di Pengaturan prodi" + (skala.length ? "." : " (belum diatur: kolom Huruf kosong).")],
    ["Lembar Ketercapaian CPL menghitung rata-rata berbobot komponen yang mengukur setiap CPL (dari kolom CPL portofolio penilaian di RPS)."],
    ["Peserta diambil dari Peserta kelas di aplikasi pada saat diunduh."]], lebar: [120] });
  return lembar;
}
G.UPW_RPS = { buat, kosong, baca, periksa, saranMetode, ringkas, waktuBawaan, PENANDA, kontrak, rubrik, portoXlsx };
})();
