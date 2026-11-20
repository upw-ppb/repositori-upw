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

/** Waktu bawaan menurut SKS (Permendikbudristek 53/2023: 1 sks kuliah = 50' tatap muka + 60' terstruktur + 60' mandiri per minggu; 1 sks praktik = 170' per minggu). */
function waktuBawaan(mk) {
  const t = Number(mk.sksT) || 0, p = Number(mk.sksP) || 0, h = [];
  if (t) h.push(`TM: ${t} × 50'`, `PT: ${t} × 60'`, `KM: ${t} × 60'`);
  if (p) h.push(`Praktik: ${p} × 170'`);
  return h.join("\n") || "[Waktu, mis. TM: 2 × 50']";
}

/** Data templat baru dari bahan server (mkp.rpsRef). pilihCpl = daftar kode CPL prodi yang dipilih dosen. */
function kosong(R, pilihCpl, hariIni) {
  const L = R.terakhir && R.terakhir.data, mk = R.mk, prodi = {}; (R.cplProdi || []).forEach(c => { prodi[c.k] = c; });
  const sksT = (Number(mk.sksKuliah) || 0) + (Number(mk.sksSeminar) || 0), sksP = Number(mk.sksPraktik) || 0;
  const dasar = {
    v: 1, mk: { nama: mk.nama, kode: mk.kode, rumpun: (L && L.mk && L.mk.rumpun) || "", sks: String(mk.sks), semester: String(mk.semester), tgl: hariIni || "", sksT, sksP },
    labor: (L && L.labor) || R.otorisasi.labor || "", kualifikasi: (L && L.kualifikasi) || "", jenjang: (L && L.jenjang) || "",
    otor: { pengembang: R.tim.filter(t => !t.praktisi).slice(0, 3).map(t => ({ nama: t.nama, nip: t.nip })),
      kps: { nama: R.otorisasi.kpsNama, nip: R.otorisasi.kpsNip, jabatan: R.otorisasi.kpsJabatan }, kajur: { nama: R.otorisasi.kajurNama, nip: R.otorisasi.kajurNip, jabatan: R.otorisasi.kajurJabatan } },
    dosen: R.tim.map(t => t.nama + (t.praktisi ? " (praktisi)" : ""))
  };
  const pilih = (pilihCpl || []).filter(k => prodi[k]);
  const cplLama = L ? (L.cpl || []).filter(c => !pilih.length || pilih.includes(String(c.ref || "").toUpperCase())) : [];
  const cpl = pilih.length ? pilih.map((k, i) => { const l = cplLama.find(c => String(c.ref).toUpperCase() === k); return { kode: l ? l.kode : "CPL" + (i + 1), ref: k, t: prodi[k].t }; })
    : cplLama.length ? cplLama : [];
  if (L) {
    return Object.assign({}, L, dasar, { cpl, pertemuan: (L.pertemuan || []).map(p => Object.assign({}, p, { waktu: p.waktu || (p.ujian ? "" : waktuBawaan(dasar.mk)) })) });
  }
  const wkt = waktuBawaan(dasar.mk), pertemuan = [];
  for (let i = 1; i <= 16; i++) pertemuan.push(i === 8 || i === 16 ? { ke: String(i), ujian: i === 8 ? "UTS" : "UAS", bobot: "" }
    : { ke: String(i), sub: "[Sub-CPMK …]", bahan: "[Topik/bahan kajian]", metode: "[Bentuk: kuliah/praktik; Metode: PjBL/CBL/…; Media]", waktu: wkt,
      pengalaman: "[Tugas mahasiswa]", kriteria: "[Kriteria dan indikator penilaian]", bobot: "", ref: "[No. pustaka]" });
  return Object.assign(dasar, {
    cpl, cpmk: [1, 2, 3].map(i => ({ kode: "CPMK " + i, t: "[Rumusan CPMK, diakhiri kode CPL yang didukung, mis. (CPL1, CPL2)]", cpl: [] })),
    sub: [1, 2, 3, 4].map(i => ({ kode: "Sub-CPMK " + i, t: "[Kemampuan akhir yang direncanakan]" })), kor: {},
    deskripsi: "[Deskripsi singkat mata kuliah]", bahan: "[Bahan kajian / unit kompetensi]", pustakaUtama: ["[Penulis. Tahun. Judul. Kota: Penerbit.]"],
    pustakaPendukung: ["[Pustaka pendukung]"], media: "[Perangkat lunak dan perangkat keras]", tempat: "Kampus Politeknik Pariwisata Bali", prasyarat: "-",
    pertemuan, porto: pertemuan.map(p => p.ujian ? { minggu: p.ke, ujian: p.ujian, bobot: "" } : { minggu: p.ke, cpl: "[CPL…]", cpmk: "[CPMK…]", sub: "[Sub-CPMK…]", indikator: "[Indikator]", bentuk: "[Bentuk penilaian]", bobot: "" })
  });
}

function buat(D, logo) {
  gbr.n = 0;
  const h = [];
  const media = [["rIdL1", "logo-kemenpar", logo && logo.kemenpar, 1], ["rIdL2", "logo-poltekpar", logo && logo.poltekpar, 1.04], ["rIdL3", "logo-asean", logo && logo.asean, 1], ["rIdL4", "logo-banpt", logo && logo.banpt, 0.86]].filter(m => m[2]);
  const lg = id => { const m = media.find(q => q[0] === id); return m ? gbr(m[0], m[1], 1.5, m[3]) : par(""); };
  // Kop
  const gk = [2600, 4969, 4969, 2600];
  h.push(tabel(gk, [
    { c: [{ xml: lg("rIdL1") + lg("rIdL2"), vm: "r", va: "center" }, { t: "KEMENTERIAN PARIWISATA REPUBLIK INDONESIA\nPOLITEKNIK PARIWISATA BALI", span: 2, b: 1, rata: "center", ukuran: 12, va: "center" }, { xml: lg("rIdL3") + lg("rIdL4"), vm: "r", va: "center" }], tinggi: 1300 },
    { c: [{ vm: "c" }, { t: "RENCANA PEMBELAJARAN SEMESTER (RPS)\nPROGRAM STUDI USAHA PERJALANAN WISATA", span: 2, b: 1, rata: "center", ukuran: 12, va: "center" }, { vm: "c" }], tinggi: 900 },
    { c: [`No. Dokumen : ${(D.dok && D.dok.no) || ""}`, `No. Revisi : ${(D.dok && D.dok.revisi) || "00"}`,
      { xml: `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>${run("Halaman : ")}<w:fldSimple w:instr=" PAGE ">${run("1")}</w:fldSimple>${run(" dari ")}<w:fldSimple w:instr=" NUMPAGES ">${run("1")}</w:fldSimple></w:p>` },
      `Tanggal Terbit : ${(D.dok && D.dok.terbit) || ""}`] }
  ]));
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
  h.push(par("Catatan: Waktu ditulis per pertemuan (TM = tatap muka, PT = penugasan terstruktur, KM = kegiatan mandiri; praktik 170 menit per sks per minggu). Jumlah bobot seluruh pertemuan termasuk UTS dan UAS = 100%. Kode pustaka pada kolom Referensi merujuk nomor daftar Pustaka.", { i: 1, ukuran: 9, sebelum: 80, sesudah: 120 }));
  // C. Portofolio penilaian
  h.push(par("C. PORTOFOLIO PENILAIAN DAN EVALUASI KETERCAPAIAN CPL MAHASISWA", { b: 1, sesudah: 120, ukuran: 11, halamanBaru: 1 }));
  const gq = [900, 1500, 1500, 1700, 3400, 2300, 900, 1100, 1100, 738];
  const port = [{ c: ["Minggu", "CPL", "CPMK (CLO)", "Sub-CPMK (LLO)", "Indikator", "Bentuk Penilaian", "Bobot (%)", "Nilai Mhs (0–100)", "∑ (Nilai × Bobot)", "Ketercapaian CPL pada MK (%)"].map(t => ph(t)), hdr: 1 }];
  (D.porto || []).forEach(p => port.push(p.ujian
    ? { c: [{ t: p.minggu, rata: "center" }, { t: p.ujian, span: 5, b: 1, rata: "center", fill: ABU }, { t: pc(p.bobot), rata: "center" }, "", "", ""] }
    : { c: [{ t: p.minggu, rata: "center" }, p.cpl || "", p.cpmk || "", p.sub || "", p.indikator || "", p.bentuk || "", { t: pc(p.bobot), rata: "center" }, "", "", ""] }));
  h.push(tabel(gq, port));
  h.push(par("Catatan: Nilai UAS untuk vokasi 30% teori dan 70% praktik; nilai UJK terintegrasi dengan nilai praktik. Rincian instrumen (soal, rubrik, lembar observasi) dilampirkan pada portofolio penilaian mata kuliah.", { i: 1, ukuran: 9, sebelum: 80, sesudah: 240 }));
  // Otorisasi
  h.push(par("OTORISASI", { b: 1, sesudah: 120, ukuran: 11 }));
  const ttd = (jab, orang) => `${jab}\n\n\n\n${orang.map(o => (o.nama || "[Nama]") + (o.nip ? `\nNIP: ${o.nip}` : "")).join("\n\n")}`;
  h.push(tabel(bagi(LEBAR, 3), [{ c: [
    { t: ttd((O.kajur && O.kajur.jabatan) || "Ketua Jurusan", [O.kajur || {}]), rata: "center" },
    { t: ttd((O.kps && O.kps.jabatan) || "Koordinator Program Studi", [O.kps || {}]), rata: "center" },
    { t: ttd("Dosen Pengampu Mata Kuliah", (O.pengembang || []).length ? O.pengembang : [{}]), rata: "center" }] }], { tanpaGaris: 1 }));
  const sect = `<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="1020" w:right="850" w:bottom="1020" w:left="850" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>`;
  const rel = media.map(m => `<Relationship Id="${m[0]}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${m[1]}.png"/>`).join("");
  const f = [
    { nama: "[Content_Types].xml", data: `${KEP}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>` },
    { nama: "_rels/.rels", data: `${KEP}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>` },
    { nama: "docProps/core.xml", data: `${KEP}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${x("RPS " + (M.nama || ""))}</dc:title><dc:creator>Repositori UPW</dc:creator><dc:description>${PENANDA}</dc:description></cp:coreProperties>` },
    { nama: "word/_rels/document.xml.rels", data: `${KEP}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdGaya" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${rel}</Relationships>` },
    { nama: "word/styles.xml", data: `${KEP}<w:styles ${NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="id-ID"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>` },
    { nama: "word/document.xml", data: `${KEP}<w:document ${NS}><w:body>${h.join("")}${sect}</w:body></w:document>` }
  ].concat(media.map(m => ({ nama: `word/media/${m[1]}.png`, data: m[2] })));
  const zip = G.UPW_ZIP.zip(f);
  return typeof Blob !== "undefined" ? new Blob([zip], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }) : zip;
}

/* ---------- pembaca Word ---------- */
const ent = s => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16))).replace(/&amp;/g, "&");
function teksSel(s) {
  const ps = s.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
  return ps.map(p => ent((p.match(/<w:t[^>]*>[^<]*<\/w:t>|<w:tab\/>|<w:br[^>]*\/>/g) || []).map(t => t.startsWith("<w:tab") ? " " : t.startsWith("<w:br") ? "\n" : t.replace(/<[^>]+>/g, "")).join("")))
    .join("\n").replace(/[\uf000-\uf8ff]/g, "").replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").replace(/(\S)\s*•\s*/g, "$1\n• ").replace(/ *\n */g, "\n").trim();
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
  // Capaian pembelajaran
  if (D.cpl.length) {
    const salah = D.cpl.filter(c => c.ref && prodi[c.ref.toUpperCase()] && mirip(c.t, prodi[c.ref.toUpperCase()].t) < 0.6);
    const takDikenal = D.cpl.filter(c => !c.ref || (Object.keys(prodi).length && !prodi[String(c.ref).toUpperCase()]));
    if (takDikenal.length) wajib(`Kode CPL prodi tidak dikenali untuk ${takDikenal.map(c => c.kode).join(", ")} (tulis seperti "CPL1 (S9)").`);
    salah.forEach(c => saran(`Rumusan ${c.kode} (${c.ref}) berbeda dengan CPL prodi ${c.ref}: "${prodi[c.ref.toUpperCase()].t}".`));
    if (!takDikenal.length && !salah.length) ok(`${D.cpl.length} CPL prodi dibebankan dan sesuai daftar CPL kurikulum.`);
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
G.UPW_RPS = { buat, kosong, baca, periksa, saranMetode, ringkas, waktuBawaan, PENANDA };
})();
