/*
 * v0.58.0: membaca kalender akademik Poltekpar Bali dari teks hasil OCR (Google Drive → PDF → UPW_PDF.teksPdf).
 * Urutan teks OCR dari tabel pindaian tidak selalu baris per baris (kolom bisa bercampur), jadi pembacaan bertumpu pada pola yang pasti:
 *  - setiap baris tabel = satu minggu Senin–Jumat → minggu dikenali dari tanggal Senin/Jumat (tanggal lain diabaikan);
 *  - nomor "minggu ke-" = angka yang tepat sebelum tanggal Senin → baris T/P; nomor yang hilang diisi bila urutannya pas;
 *  - kegiatan sebelum minggu 1 (her registrasi, KRS, kuliah perdana) berurutan mulai dari minggu tempat kegiatan pertama terbaca;
 *  - UTS = minggu tanpa nomor di antara minggu kuliah, terdekat dengan tulisan "UTS"; KIMPA dan UAS berurutan setelah minggu ke-14;
 *  - hari libur ("17 Agt - Proklamasi …") dibaca per tanggal lalu dimasukkan ke minggunya.
 * Hasil SELALU diperiksa Admin sebelum disetujui (tampilan menandai bagian yang ditebak).
 */
(function () {
  const G = typeof window !== "undefined" ? window : globalThis;
  const BULAN = { januari: 1, februari: 2, pebruari: 2, maret: 3, april: 4, mei: 5, juni: 6, juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, nopember: 11, desember: 12 };
  const BLN_PENDEK = { jan: 1, feb: 2, peb: 2, mar: 3, apr: 4, mei: 5, jun: 6, jul: 7, agt: 8, agu: 8, ags: 8, agst: 8, sep: 9, sept: 9, okt: 10, nov: 11, nop: 11, des: 12 };
  const NAMA_BLN = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  const RE_TGL = /(\d{1,2})\s*(januari|februari|pebruari|maret|april|mei|juni|juli|agustus|september|oktober|november|nopember|desember)\s*(\d{4})/gi;
  const RE_LIBUR = /(\d{1,2})(?:\s*(?:-|–|dan|&|s\/d)\s*(\d{1,2}))?\s*(jan|feb|peb|mar|apr|mei|jun|jul|agt|agu|ags|agst|sep|sept|okt|nov|nop|des)(?![a-z])\.?(?!\s*\d{4})\s*[-–:]?\s*/gi;
  const KEG = [
    { k: "her", re: /HER\s*-?\s*REGIST?RASI(\s*\/?\s*Perwalian\s*\(?KRS\)?)?/gi, l: m => /KRS/i.test(m) ? "HER REGISTRASI / Perwalian (KRS)" : "HER REGISTRASI" },
    { k: "krs", re: /PSDP\s*\/?\s*Perwalian\s*\(?KRS\)?|(?<!REGISTRASI\s*\/?\s*)Perwalian\s*\(KRS\)/gi, l: m => /PSDP/i.test(m) ? "PSDP / Perwalian (KRS)" : "Perwalian (KRS)" },
    { k: "perdana", re: /KULIAH\s*PERDANA(\s*\/?\s*MATRIKULASI)?/gi, l: m => /MATRIK/i.test(m) ? "KULIAH PERDANA / MATRIKULASI" : "KULIAH PERDANA" },
    { k: "uts", re: /UTS\s*\(?\s*T\s*\/\s*P\s*\)?|UTS\b/gi, l: () => "UTS (T/P)" },
    { k: "kimpa", re: /KIMPA/gi, l: () => "KIMPA" },
    { k: "uasp", re: /UAS\s*\(\s*P\s*\)/gi, l: () => "UAS (P)" },
    { k: "uast", re: /UAS\s*\(\s*T\s*\)/gi, l: () => "UAS (T)" },
    { k: "tp", re: /(?<![A-Z(]\s?)\bT\s*\/\s*P\b(?!\s*\))/g, l: () => "T/P" }
  ];
  const PRA = ["her", "krs", "perdana"], PASCA = ["kimpa", "uasp", "uast"];
  const iso = (y, m, d) => y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
  const keTgl = s => new Date(s + "T12:00:00Z");
  const geser = (s, n) => { const d = keTgl(s); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const hari = s => keTgl(s).getUTCDay();   // 1 = Senin, 5 = Jumat
  const smtDari = s => { const y = Number(s.slice(0, 4)), m = Number(s.slice(5, 7)); return m >= 7 ? y + "-1" : (y - 1) + "-2"; };
  const labelSmt = k => { const a = Number(k.slice(0, 4)); return (/-1$/.test(k) ? "Ganjil " : "Genap ") + a + "/" + (a + 1); };
  const tglPendek = s => Number(s.slice(8, 10)) + " " + NAMA_BLN[Number(s.slice(5, 7))];

  /** teks OCR → { semester: [{ semester, label, baris[{mulai, sampai, minggu, keg, ket, tebak}], libur[{tgl, l}], catatan[] }] } */
  function baca(teks) {
    const baris = String(teks || "").split(/\r?\n/).map(x => x.replace(/\s+/g, " ").trim()).filter(Boolean);
    // 1) token berurutan: tanggal, angka minggu, kegiatan, kepala semester
    const tok = [], kepala = [];
    baris.forEach((b, nb) => {
      const mk = /Semester\s*(Ganjil|Genap)\s*(?:TA\s*)?(\d{4})\s*\/\s*(\d{4})/i.exec(b + " " + (baris[nb + 1] || ""));
      if (mk && /Semester/i.test(b)) kepala.push({ pos: tok.length, kode: mk[2] + (/ganjil/i.test(mk[1]) ? "-1" : "-2") });
      if (/^\d{1,2}$/.test(b)) { tok.push({ t: "n", v: Number(b), nb }); return; }
      const hal = [];
      const abaikan = /s\s*\/\s*d/i.test(b) || /Nusa Dua|Denpasar|Mengetahui|NIP/i.test(b);
      let m; RE_TGL.lastIndex = 0;
      while ((m = RE_TGL.exec(b))) {
        const d = Number(m[1]), bl = BULAN[m[2].toLowerCase()], y = Number(m[3]);
        if (!abaikan && d >= 1 && d <= 31 && y > 2000 && y < 2100) { const s = iso(y, bl, d); if (!isNaN(keTgl(s)) && keTgl(s).getUTCDate() === d) hal.push({ i: m.index, t: "d", v: s, nb }); }
      }
      const angkaDepan = /^(\d{1,2})\s+\d{1,2}\s*[A-Za-z]/.exec(b);
      if (angkaDepan && hal.length) tok.push({ t: "n", v: Number(angkaDepan[1]), nb });
      if (!/\d{4}/.test(b) || hal.length) KEG.forEach(K => { K.re.lastIndex = 0; let x; while ((x = K.re.exec(b))) hal.push({ i: x.index, t: "k", k: K.k, l: K.l(x[0]), nb }); });
      hal.sort((a, c) => a.i - c.i).forEach(h => { if (!(h.t === "k" && h.k === "uts" && hal.some(o => o !== h && o.t === "k" && o.k === "uts" && o.i < h.i && h.i - o.i < 4))) tok.push(h); });
    });
    tok.forEach((t, i) => { t.pos = i; });
    // 2) minggu (Senin) per semester
    const minggu = new Map();   // senin → {pos[]}
    tok.forEach(t => { if (t.t !== "d") return; const h = hari(t.v), sen = h === 1 ? t.v : h === 5 ? geser(t.v, -4) : null; if (!sen) return; t.sen = sen;
      if (!minggu.has(sen)) minggu.set(sen, { pos: [] }); minggu.get(sen).pos.push(t.pos); });
    const perSmt = {};
    [...minggu.keys()].forEach(sen => { const k = smtDari(geser(sen, 4)); (perSmt[k] = perSmt[k] || []).push(sen); });
    const kodeKepala = kepala.map(x => x.kode);
    // semester setiap token kegiatan = semester tanggal (Senin/Jumat) terdekat sebelumnya; bila tidak ada, sesudahnya
    tok.forEach(t => { if (t.t !== "k") return;
      for (let p = t.pos - 1; p >= 0; p--) if (tok[p].sen) { t.smt = smtDari(geser(tok[p].sen, 4)); return; }
      for (let p = t.pos + 1; p < tok.length; p++) if (tok[p].sen) { t.smt = smtDari(geser(tok[p].sen, 4)); return; } });
    const hasil = [];
    Object.keys(perSmt).sort().forEach(kode => {
      let sen = perSmt[kode].sort();
      if (!kodeKepala.includes(kode) && sen.length < 10) return;   // tanggal tanda tangan dll.
      const a = Number(kode.slice(0, 4)), ganjil = /-1$/.test(kode), awal = ganjil ? iso(a, 7, 1) : iso(a + 1, 1, 1), akhir = ganjil ? iso(a, 12, 31) : iso(a + 1, 6, 30);
      sen = sen.filter(s => s >= geser(awal, -6) && s <= akhir);
      if (!sen.length) return;
      const grid = []; for (let s = sen[0]; s <= sen[sen.length - 1]; s = geser(s, 7)) grid.push(s);
      const R = grid.map(s => ({ mulai: s, sampai: geser(s, 4), minggu: "", keg: "", ket: "", tebak: !minggu.has(s), _pos: minggu.has(s) ? minggu.get(s).pos : [] }));
      const idx = s => grid.indexOf(s), catatan = [];
      // 3) nomor minggu: angka tepat sebelum tanggal Senin
      tok.forEach((t, i) => { if (t.t !== "n" || t.v < 1 || t.v > 20) return; const n = tok[i + 1]; if (n && n.t === "d" && hari(n.v) === 1 && idx(n.v) >= 0 && !R[idx(n.v)].minggu) R[idx(n.v)].minggu = t.v; });
      // buang nomor yang tidak naik (rantai naik terpanjang)
      const ber = R.map((r, i) => ({ i, n: r.minggu })).filter(x => x.n);
      const pjg = ber.map(() => 1), sbl = ber.map(() => -1);
      for (let i = 0; i < ber.length; i++) for (let j = 0; j < i; j++) if (ber[j].n < ber[i].n && ber[i].n - ber[j].n <= ber[i].i - ber[j].i && pjg[j] + 1 > pjg[i]) { pjg[i] = pjg[j] + 1; sbl[i] = j; }
      let ujung = pjg.indexOf(Math.max(0, ...pjg)); const sah = new Set(); while (ujung >= 0) { sah.add(ber[ujung].i); ujung = sbl[ujung]; }
      R.forEach((r, i) => { if (r.minggu && !sah.has(i)) r.minggu = ""; });
      // isi nomor yang hilang bila jaraknya pas (mis. 2 … 4 dengan satu minggu di antaranya)
      const no = R.map((r, i) => r.minggu ? i : -1).filter(i => i >= 0);
      for (let q = 0; q + 1 < no.length; q++) { const i = no[q], j = no[q + 1]; if (j - i > 1 && R[j].minggu - R[i].minggu === j - i) for (let k = i + 1; k < j; k++) { R[k].minggu = R[i].minggu + (k - i); R[k].tebakNo = 1; } }
      const iM1 = R.findIndex(r => r.minggu === 1), nomor = R.map((r, i) => r.minggu ? i : -1).filter(i => i >= 0), iAkhir = nomor.length ? nomor[nomor.length - 1] : -1;
      R.forEach(r => { if (r.minggu) r.keg = "T/P"; });
      if (iM1 < 0) catatan.push("Minggu kuliah ke-1 tidak terbaca: isi kolom Minggu dan Kegiatan secara manual.");
      // token kegiatan milik semester ini: token yang posisinya dekat tanggal semester ini
      const kegTok = tok.filter(t => t.t === "k" && t.smt === kode).map(t => Object.assign({}, t));
      const sebelumDekat = t => { for (let p = t.pos - 1; p >= 0; p--) { const x = tok[p]; if (x.t === "d" && x.sen && idx(x.sen) >= 0) return idx(x.sen); if (x.t === "k" && x.k !== t.k && x.k !== "tp") return -1; } return -1; };
      // 4) sebelum minggu 1
      if (iM1 > 0) {
        // gabungkan "HER REGISTRASI" + "Perwalian (KRS)" yang terbaca terpisah (baris berikutnya), lalu urutkan baku
        const pr0 = []; kegTok.filter(t => PRA.includes(t.k)).sort((x, y) => x.pos - y.pos).forEach(t => { const lalu = pr0[pr0.length - 1];
          if (t.k === "krs" && !/PSDP/.test(t.l) && lalu && lalu.k === "her" && !/KRS/.test(lalu.l) && t.nb - lalu.nb <= 1) lalu.l = "HER REGISTRASI / Perwalian (KRS)"; else pr0.push(t); });
        const pr = pr0.sort((x, y) => PRA.indexOf(x.k) - PRA.indexOf(y.k) || x.pos - y.pos);
        if (pr.length) {
          const herKrs = pr.filter(t => t.k === "her" && /KRS/.test(t.l)).length; if (herKrs) pr.forEach(t => { if (t.k === "her") t.l = "HER REGISTRASI / Perwalian (KRS)"; });
          const pertama = pr.slice().sort((x, y) => x.pos - y.pos)[0];
          let i0 = sebelumDekat(pertama);
          if (!(i0 >= 0 && i0 < iM1 && i0 + pr.length <= iM1)) i0 = Math.max(0, iM1 - pr.length);
          pr.forEach((t, k) => { if (i0 + k < iM1) R[i0 + k].keg = t.l; });
        }
      }
      // 5) UTS: minggu tanpa nomor di antara minggu kuliah
      const uts = kegTok.filter(t => t.k === "uts");
      if (iM1 >= 0 && uts.length) {
        const celah = R.map((r, i) => i).filter(i => i > iM1 && i < iAkhir && !R[i].minggu);
        const pakai = new Set();
        uts.forEach(t => { let i = sebelumDekat(t); if (!celah.includes(i) || pakai.has(i)) i = celah.filter(c => !pakai.has(c)).sort((x, y) => Math.abs(R[x]._pos[0] - t.pos) - Math.abs(R[y]._pos[0] - t.pos))[0]; if (i !== undefined && i >= 0) { pakai.add(i); R[i].keg = "UTS (T/P)"; } });
        // UTS dua minggu berturut-turut: bila satu tulisan UTS, minggu tanpa nomor tepat di sebelahnya yang juga tanpa keterangan libur tidak diubah (dibiarkan untuk diperiksa)
      }
      // 6) setelah minggu terakhir: KIMPA, UAS (P), UAS (T) berurutan
      if (iAkhir >= 0) {
        const pasca = kegTok.filter(t => PASCA.includes(t.k)).sort((x, y) => PASCA.indexOf(x.k) - PASCA.indexOf(y.k) || x.pos - y.pos);
        const unik = []; pasca.forEach(t => { if (!unik.some(u => u.k === t.k)) unik.push(t); });
        unik.slice(0, R.length - iAkhir - 1).forEach((t, k) => { R[iAkhir + 1 + k].keg = t.l; });
      }
      // 7) hari libur (keterangan)
      const libur = bacaLibur(baris, kode);
      libur.forEach(h => { const r = R.find(x => h.tgl >= x.mulai && h.tgl <= geser(x.mulai, 6)); if (r && h.label) r.ket += (r.ket ? "; " : "") + h.label; });
      R.forEach(r => { r.tebak = r.tebak || !!r.tebakNo; delete r._pos; delete r.tebakNo; });
      if (!kodeKepala.includes(kode)) catatan.push("Judul semester tidak terbaca; semester ditentukan dari tanggal.");
      hasil.push({ semester: kode, label: labelSmt(kode), baris: R, libur: libur.map(h => ({ tgl: h.tgl, l: h.l })), catatan });
    });
    return { semester: hasil };
  }
  /** "17 Agt - Proklamasi Kemerdekaan", "10-11 Mar-Idul Fitri", "18 dan 19 Mei-Cuti Bersama" → [{tgl, l, label}] (tahun dari semester). */
  function bacaLibur(baris, kode) {
    const a = Number(kode.slice(0, 4)), ganjil = /-1$/.test(kode);
    const bukanLanjut = b => /\d{4}|^\d+$|^(T\s*\/\s*P|KIMPA|UTS|UAS|HER|KULIAH|PSDP|MINGGU|PERIODE|KEGIATAN|KETERANGAN)/i.test(b) || /Mengetahui|Direktur|Nusa Dua|NIP|Kepala|Administrasi|Kerjasama|POLITEKNIK|PARIWISATA|KEMENTERIAN|REPUBLI|Semester|Telepon|Situs|Kampial/i.test(b) || !/[a-z]/.test(b);
    // segmen semester: dari kepala semester ini sampai kepala berikutnya (teks sebelum kepala pertama ikut kepala pertama)
    const kep = []; baris.forEach((b, i) => { const m = /Semester\s*(Ganjil|Genap)\s*(?:TA\s*)?(\d{4})\s*\/\s*(\d{4})/i.exec(b + " " + (baris[i + 1] || "")); if (m && /Semester/i.test(b)) kep.push({ i, kode: m[2] + (/ganjil/i.test(m[1]) ? "-1" : "-2") }); });
    let dari = 0, sampai = baris.length;
    if (kep.length) { const j = kep.findIndex(x => x.kode === kode); if (j >= 0) { dari = j === 0 ? 0 : kep[j].i; sampai = j + 1 < kep.length ? kep[j + 1].i : baris.length; } }
    const aliran = []; let cur = null;
    for (let i = dari; i < sampai; i++) {
      const b = baris[i]; RE_LIBUR.lastIndex = 0;
      if (RE_LIBUR.test(b) && !/\d{1,2}\s*(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|nopember|desember)\s*\d{4}/i.test(b)) { if (!cur) { cur = []; aliran.push(cur); } cur.push(b); }
      else if (cur && !bukanLanjut(b) && b.length < 60) cur.push(b);
      else cur = null;
    }
    const hasil = [];
    aliran.forEach(l => {
      const s = l.join(" "); const m = []; let x; RE_LIBUR.lastIndex = 0;
      while ((x = RE_LIBUR.exec(s))) m.push({ i: x.index, j: RE_LIBUR.lastIndex, d1: Number(x[1]), d2: x[2] ? Number(x[2]) : null, bl: BLN_PENDEK[x[3].toLowerCase()] });
      m.forEach((q, k) => {
        const ket = s.slice(q.j, k + 1 < m.length ? m[k + 1].i : s.length).replace(/^[-–:\s]+|[-–\s]+$/g, "").replace(/\s+/g, " ").trim();
        if (!ket || !q.bl) return;
        const y = ganjil ? (q.bl >= 7 ? a : a + 1) : (q.bl <= 6 ? a + 1 : a);
        const tgl = []; for (let d = q.d1; d <= (q.d2 && q.d2 >= q.d1 && q.d2 - q.d1 < 7 ? q.d2 : q.d1); d++) tgl.push(d);
        tgl.forEach(d => { const t = iso(y, q.bl, d); if (keTgl(t).getUTCDate() === d) hasil.push({ tgl: t, l: ket.slice(0, 120), label: (q.d2 && q.d2 !== q.d1 ? q.d1 + "–" + q.d2 : q.d1) + " " + NAMA_BLN[q.bl] + " – " + ket }); });
      });
    });
    // label sama untuk rentang (10–11 Mar) cukup sekali di keterangan; tanggal + nama sama tidak diulang
    const lihat = new Set(), unik = [];
    hasil.forEach(h => { if (unik.some(x => x.tgl === h.tgl && x.l === h.l)) return; if (lihat.has(h.label)) h.label = ""; else lihat.add(h.label); unik.push(h); });
    return unik.sort((p, q) => p.tgl < q.tgl ? -1 : p.tgl > q.tgl ? 1 : 0);
  }
  G.UPW_KALENDER = { baca, bacaLibur, labelSmt, tglPendek, geser, KEGIATAN: ["", "HER REGISTRASI", "HER REGISTRASI / Perwalian (KRS)", "PSDP / Perwalian (KRS)", "KULIAH PERDANA", "KULIAH PERDANA / MATRIKULASI", "T/P", "UTS (T/P)", "KIMPA", "UAS (P)", "UAS (T)"] };
})();
