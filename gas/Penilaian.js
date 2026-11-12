/**
 * Simulasi penilaian mandiri (v0.12.0) mengikuti Matriks Penilaian LAMWisata IAPS 1.0 Unggul Sarjana Terapan.
 * - 84 butir berbobot (MATRIKS, total bobot 100), skor 0–4, nilai = Σ bobot × skor (maks. 400).
 * - Butir "a" dihitung dari data aplikasi (Tabel iLKPS, Data Prodi, lulusan, survei, dana) memakai rumus di Matriks;
 *   butir "m" diisi skor GPM (0–4) dengan rubrik; butir "c" menggabungkan keduanya sesuai rumus butir.
 * - Bila data belum ada, skor otomatis 0 dan ditandai "data belum lengkap".
 * - Tafsiran yang tidak dirinci di Matriks (PTW, PPS, PBS, TKM, komposisi publikasi butir 48) ditulis di keterangan butir.
 * Ini perkiraan internal, bukan nilai resmi asesor.
 */
var PERAN_NILAI = ["admin", "superadmin", "kps"];

function cap4(x) { return Math.max(0, Math.min(4, x)); }
/** Pola RI/RN/RW pada Matriks (prestasi, penelitian, PkM, publikasi, tempat kerja, kerja sama). */
function riSkor(ri, rn, rw, a, b, c) {
  if (ri >= a) return 4;
  if (rn >= b) return 3 + ri / a;
  if (ri > 0 || rn > 0) return cap4(2 + 2 * (ri / a) + (rn / b) - (ri * rn) / (a * b));
  if (rw >= c) return 2;
  return 2 * rw / c;
}
function persen(x) { return String(Math.round(x * 1000) / 10).replace(".", ",") + "%"; }
function dua(x) { return String(Math.round(x * 100) / 100).replace(".", ","); }
function rataL(l) { return l.length ? l.reduce(function (s, v) { return s + v; }, 0) / l.length : null; }
function kurang(info) { return { s: 0, info: info, kurang: true }; }

/** Kumpulan data untuk TS tertentu. */
function konteksNilai(ts) {
  var I = susunIlkps(ts), T = {};
  I.tabel.forEach(function (t) { T[t.kode] = t; });
  var dosen = daftarDosen(), dts = dosenTs(ts);
  var dtps = dosen.filter(function (x) { return x.status === STATUS_TETAP[0]; });
  var mhsAktif = semua("Pengguna").filter(function (p) { return p.status !== "nonaktif" && peranDari(p).indexOf("mahasiswa") >= 0 && (p.statusMhs || "A") === "A"; });
  var tsL = [ts - 2, ts - 1, ts];
  var setuju = semuaKegiatan().filter(function (k) { return k.status === "disetujui"; });
  var dalamTs = function (k) { var a = taKegiatan(k); return a !== null && a >= ts - 2 && a <= ts; };
  return { ts: ts, T: T, dosen: dosen, dts: dts, dtps: dtps, NDTPS: dtps.length, mhs: mhsAktif, NM: mhsAktif.length, tsL: tsL,
    setuju: setuju, setujuTs: setuju.filter(dalamTs), lulusan: semuaLulusan(), pmb: semuaPenerimaan(), mk: semuaMk() };
}
function prmin(nl) { return nl >= 300 ? 0.3 : 0.5 - (nl / 300) * 0.2; }
function sesuaikanResponden(s, nj, nl, label) {
  if (!nl) return { s: s, ket: "" };
  var pj = nj / nl, pm = prmin(nl);
  return pj >= pm ? { s: s, ket: "; " + label + " " + persen(pj) + " (minimum " + persen(pm) + ")" }
    : { s: s * pj / pm, ket: "; " + label + " " + persen(pj) + " < minimum " + persen(pm) + ", skor disesuaikan × " + dua(pj / pm) };
}
function tracerTs(X) {
  var L = X.lulusan.filter(function (x) { var a = taLulus(x); return a !== null && a >= X.ts - 4 && a <= X.ts - 2; });
  return { L: L, NL: L.length, J: L.filter(terlacak) };
}
function kohort(X) {
  var c = [], diterima = 0, lulus = [];
  for (var m = X.ts - 6; m <= X.ts - 3; m++) {
    var p = X.pmb.filter(function (x) { return x.tahun === m; })[0];
    if (p && p.diterima) diterima += p.diterima;
    X.lulusan.forEach(function (x) { if (x.masuk === m && taLulus(x) !== null && taLulus(x) <= X.ts) lulus.push(x); });
    c.push(m);
  }
  return { tahun: c, diterima: diterima, lulus: lulus };
}
function barisJumlah(t) { return t && t.baris.length ? t.baris[t.baris.length - 1] : null; }
function kolomTotal(t, i) { return t ? t.baris[i][5] : 0; }

/** Skor otomatis per kunci rumus. Mengembalikan {s, info, kurang?}. */
function rumusOtomatis(f, X) {
  var n = X.NDTPS, T = X.T, nd = !n;
  switch (f) {
    case "ndtps": return { s: n >= 6 ? 4 : n >= 3 ? 2 * n / 3 : 0, info: "NDTPS = " + n + " (dosen berstatus DTPS di biodata)" };
    case "pds3": { if (nd) return kurang("NDTPS = 0"); var a = X.dtps.filter(function (x) { return x.pendS3; }).length, p = a / n; return { s: p >= 0.5 ? 4 : 2 + 4 * p, info: "PDS3 = " + a + "/" + n + " = " + persen(p) }; }
    case "pdsk": { if (nd) return kurang("NDT = 0"); var a = X.dtps.filter(function (x) { return teks((X.dts[x.id] || {}).dasarSesuai) === "Ya"; }).length, p = a / n;
      return { s: p >= 0.4 ? 4 : p >= 0.2 ? 3 : p >= 0.1 ? 2 : p > 0 ? 1 : 0, info: "PDSK = " + a + "/" + n + " = " + persen(p) + " (Data Prodi › Data dosen TS: pendidikan dasar sesuai)" }; }
    case "pdtpsl": { if (nd) return kurang("NDTPS = 0"); var a = X.dtps.filter(function (x) { return teks((X.dts[x.id] || {}).linier) === "Ya"; }).length, p = a / n;
      return { s: p >= 0.4 ? 4 : p >= 0.2 ? 3 : p >= 0.1 ? 2 : 1, info: "PDTPSL = " + a + "/" + n + " = " + persen(p) + " (Data dosen TS: pendidikan tertinggi linier)" }; }
    case "sertdos": { if (nd) return kurang("NDTPS = 0"); var a = X.dtps.filter(function (x) { return x.sertKomp; }).length, p = a / n; return { s: p >= 0.5 ? 4 : cap4(1 + 6 * p), info: "PDSK = " + a + "/" + n + " DTPS bersertifikat kompetensi = " + persen(p) }; }
    case "pgblkl": { if (nd) return kurang("NDTPS = 0"); var a = X.dtps.filter(function (x) { return ["Lektor", "Lektor Kepala", "Guru Besar"].indexOf(x.jabfung) >= 0; }).length, p = a / n;
      return { s: p >= 0.7 ? 4 : 2 + 20 * p / 7, info: "PGBLKL = " + a + "/" + n + " = " + persen(p) }; }
    case "pmki": {
      var kode = {}; [kodeSmt(X.ts, true), kodeSmt(X.ts, false)].forEach(function (smt) { var tim = timSemester(smt); Object.keys(tim).forEach(function (kd) { kode[kd] = (kode[kd] || []).concat(tim[kd].anggota); }); });
      var industri = {}; X.dosen.forEach(function (x) { if (x.status === "Dosen industri / praktisi") industri[x.id] = 1; });
      var mkk = X.mk.filter(function (m) { return m.kompetensi && kode[m.kode]; }), mkki = mkk.filter(function (m) { return kode[m.kode].some(function (a) { return a.t === "p" || industri[a.id]; }); });
      if (!mkk.length) return kurang("Belum ada MK kompetensi dengan tim pengajar pada TS (Data Prodi)");
      var p = mkki.length / mkk.length; return { s: p >= 0.3 ? 4 : cap4(2 + 10 * p), info: "PMKI = " + mkki.length + "/" + mkk.length + " MK kompetensi diampu praktisi = " + persen(p) }; }
    case "pdtt": { var tt = X.dosen.filter(function (x) { return x.status === "Dosen tidak tetap"; }).length, dtpt = X.dosen.filter(function (x) { return x.status === STATUS_TETAP[1]; }).length;
      if (!(n + dtpt)) return kurang("Belum ada dosen tetap");
      var p = tt / (n + dtpt); return { s: p <= 0.1 ? 4 : p <= 0.4 ? (14 - 20 * p) / 3 : 0, info: "PDTT = " + tt + "/(" + n + " + " + dtpt + ") = " + persen(p) }; }
    case "pjp": { var jb = X.mk.reduce(function (s, m) { return s + sksMk(m); }, 0), jp = X.mk.reduce(function (s, m) { return s + m.sksPraktik; }, 0);
      if (!jb) return kurang("Kurikulum belum diisi (Data Prodi)"); var p = jp / jb; return { s: p >= 0.2 ? 4 : 20 * p, info: "PJP = " + jp + "/" + jb + " sks = " + persen(p) }; }
    case "rmdtps": { if (nd) return kurang("NDTPS = 0"); var r = X.NM / n; return { s: r >= 15 && r <= 25 ? 4 : r > 25 && r <= 35 ? 3 : r > 35 && r <= 45 ? 2 : 1, info: "RMDTPS = " + X.NM + "/" + n + " = " + dua(r) }; }
    case "rdpu": { var v = (T["5"] ? T["5"].baris : []).filter(function (r, i) { return X.dtps.some(function (d) { return d.nama === r[1]; }) && r[10] > 0; }).map(function (r) { return r[10]; });
      if (!v.length) return kurang("Belum ada kegiatan bimbingan TA (pembimbing utama) yang disetujui"); var r = rataL(v);
      return { s: r <= 6 ? 4 : r <= 10 ? 7 - r / 2 : 0, info: "RDPU = " + dua(r) + " mahasiswa per pembimbing (Tabel 5)" }; }
    case "ewmp": { var v = (T["6"] ? T["6"].baris : []).filter(function (r) { return r[2] === "V"; }).map(function (r) { return r[10]; });
      if (!v.length || !v.some(function (x) { return x > 0; })) return kurang("EWMP belum terisi (Tabel 6)"); var e = rataL(v);
      return { s: e >= 12 && e <= 16 ? 4 : e >= 6 && e < 12 ? (2 * e - 12) / 3 : e > 16 && e <= 18 ? 36 - 2 * e : 0, info: "EWMP rata-rata DTPS = " + dua(e) + " sks/semester" }; }
    case "pa": case "pn": { if (!X.NM) return kurang("NM = 0"); var t = T[f === "pa" ? "7a" : "7b"], h = [0, 0, 0];
      t.baris.forEach(function (r) { if (r[5] === "V") h[0]++; else if (r[4] === "V") h[1]++; else if (r[3] === "V") h[2]++; });
      var fa = f === "pa" ? [0.001, 0.01, 0.02] : [0.002, 0.02, 0.04];
      return { s: riSkor(h[0] / X.NM, h[1] / X.NM, h[2] / X.NM, fa[0], fa[1], fa[2]), info: "Internasional " + h[0] + ", nasional " + h[1] + ", wilayah " + h[2] + " (NM " + X.NM + ")" }; }
    case "ripk": { var v = X.lulusan.filter(function (x) { var a = taLulus(x); return a !== null && a >= X.ts - 2 && a <= X.ts && x.ipk !== null; }).map(function (x) { return x.ipk; });
      if (!v.length) return kurang("Belum ada IPK lulusan TS-2 s.d. TS"); var r = rataL(v); return { s: r >= 3.25 ? 4 : Math.max(2, (8 * r - 6) / 5), info: "RIPK = " + dua(r) + " (" + v.length + " lulusan)" }; }
    case "ms": { var k = kohort(X), v = k.lulus.map(masaStudi).filter(function (x) { return x !== null; });
      if (!v.length) return kurang("Belum ada lulusan angkatan TS-6 s.d. TS-3"); var m = rataL(v);
      return { s: m > 3.5 && m <= 4.5 ? 4 : m > 3 && m <= 3.5 ? 8 * m - 24 : m > 4.5 && m <= 7 ? (56 - 8 * m) / 5 : 0, info: "MS = " + dua(m) + " tahun (angkatan " + k.tahun[0] + "–" + k.tahun[3] + ")" }; }
    case "ptw": { var k = kohort(X); if (!k.diterima) return kurang("Jumlah diterima angkatan TS-6 s.d. TS-3 belum diisi (Data Prodi › PMB)");
      var tw = k.lulus.filter(function (x) { var m = masaStudi(x); return m !== null && m <= 4.25; }).length, p = tw / k.diterima;
      return { s: p >= 0.7 ? 4 : 1 + 30 * p / 7, info: "PTW = " + tw + "/" + k.diterima + " = " + persen(p) + " (tafsiran: lulus ≤ 4 tahun 3 bulan, angkatan TS-6 s.d. TS-3)" }; }
    case "pps": { var k = kohort(X); if (!k.diterima) return kurang("Jumlah diterima angkatan TS-6 s.d. TS-3 belum diisi (Data Prodi › PMB)");
      var p = k.lulus.length / k.diterima; return { s: p >= 0.85 ? 4 : p >= 0.3 ? (80 * p - 24) / 11 : 0, info: "PPS = " + k.lulus.length + "/" + k.diterima + " lulus s.d. akhir TS = " + persen(p) + " (tafsiran: angkatan TS-6 s.d. TS-3)" }; }
    case "wt": case "pbs": case "tk": { var tr = tracerTs(X); if (!tr.J.length) return kurang("Belum ada lulusan TS-4 s.d. TS-2 yang terlacak (Data Prodi › Lulusan)"); var s, info;
      if (f === "wt") { var v = tr.J.filter(function (x) { return x.wtBulan !== null; }).map(function (x) { return x.wtBulan; }); if (!v.length) return kurang("Waktu tunggu belum terisi"); var w = rataL(v); s = w < 3 ? 4 : w <= 6 ? (24 - 4 * w) / 3 : 0; info = "WT = " + dua(w) + " bulan"; }
      else if (f === "pbs") { var v2 = tr.J.filter(function (x) { return x.kesesuaian; }); if (!v2.length) return kurang("Kesesuaian bidang kerja belum terisi"); var p = v2.filter(function (x) { return x.kesesuaian !== "Rendah"; }).length / v2.length; s = p >= 0.6 ? 4 : 20 * p / 3; info = "PBS = " + persen(p) + " kesesuaian sedang/tinggi (tafsiran)"; }
      else { var v3 = tr.J.filter(function (x) { return x.tempatKerja; }), nj = v3.length; if (!nj) return kurang("Tempat kerja belum terisi");
        var c = function (i) { return v3.filter(function (x) { return x.tempatKerja === TEMPAT_KERJA[i]; }).length; }; s = riSkor(c(2) / nj, c(1) / nj, c(0) / nj, 0.05, 0.2, 0.9); info = "Internasional " + c(2) + ", nasional " + c(1) + ", lokal " + c(0) + " dari " + nj; }
      var a = sesuaikanResponden(s, tr.J.length, tr.NL, "lulusan terlacak"); return { s: a.s, info: info + a.ket }; }
    case "tkp": { var t = T["11"], v = t.baris.slice(0, 7).filter(function (r) { return r[2] + r[3] + r[4] + r[5] > 0; }).map(function (r) { return (4 * r[2] + 3 * r[3] + 2 * r[4] + r[5]) / 100; });
      if (!v.length) return kurang("Belum ada survei pengguna lulusan (Tabel 11)"); var A = rataL(v), r11 = barisJumlah(T.ref11a), adj = sesuaikanResponden(A, r11 ? r11[2] : 0, r11 ? r11[1] : 0, "responden pengguna");
      return { s: adj.s, info: "Skor kepuasan 7 aspek = " + dua(A) + adj.ket, auto: true }; }
    case "pen": case "pkm": { if (nd) return kurang("NDTPS = 0"); var t = T[f === "pen" ? "12" : "17"], nl = kolomTotal(t, 0), nn = kolomTotal(t, 1), ni = kolomTotal(t, 2), fa = f === "pen" ? [0.05, 0.3, 1] : [0.07, 0.5, 1.5];
      return { s: riSkor(ni / 3 / n, nn / 3 / n, nl / 3 / n, fa[0], fa[1], fa[2]), info: "Dana luar negeri " + ni + ", dalam negeri " + nn + ", PT/mandiri " + nl + " judul (3 tahun, NDTPS " + n + ")" }; }
    case "ppdm": case "ppkmdm": { var tot = kolomTotal(T[f === "ppdm" ? "12" : "17"], 3); if (!tot) return kurang("Belum ada " + (f === "ppdm" ? "penelitian" : "PkM") + " DTPS yang disetujui");
      var m = T[f === "ppdm" ? "13" : "18"].baris.length, p = m / tot; return { s: p >= 0.25 ? 4 : 2 + 8 * p, info: (f === "ppdm" ? "PPDM" : "PPkMDM") + " = " + m + "/" + tot + " = " + persen(p) }; }
    case "pub": case "pubpkm": { if (nd) return kurang("NDTPS = 0"); var b = T[f === "pub" ? "14" : "19"].baris, v = function (i) { return b[i][5]; };
      var ri = (v(3) + v(6) + v(9)) / n, rn = (v(1) + v(2) + v(5) + v(8)) / n, rw = (v(0) + v(4) + v(7)) / n, fa = f === "pub" ? [0.2, 2, 4] : [0.01, 0.1, 0.5];
      return { s: riSkor(ri, rn, rw, fa[0], fa[1], fa[2]), info: "Internasional " + (v(3) + v(6) + v(9)) + ", nasional " + (v(1) + v(2) + v(5) + v(8)) + ", wilayah " + (v(0) + v(4) + v(7)) + " (NDTPS " + n + ")" + (f === "pub" ? "; komposisi RI/RN/RW mengikuti butir luaran PkM (tafsiran)" : "") }; }
    case "napj": { var c = X.setujuTs.filter(function (k) { return k.jenis === "produk"; }).length; return { s: c >= 2 ? 4 : c === 1 ? 3 : 2, info: "NAPJ = " + c + " produk/jasa diadopsi (3 tahun)" }; }
    case "rs": case "rrd": { if (nd) return kurang("NDTPS = 0"); var c = T[f === "rs" ? "16" : "23"].baris.length, r = c / n; return { s: r >= 0.5 ? 4 : 2 + 4 * r, info: (f === "rs" ? "RS" : "RRD") + " = " + c + "/" + n + " = " + dua(r) }; }
    case "ks": { if (nd) return kurang("NDTPS = 0"); var tb = ["20-1", "20-2", "20-3"].map(function (k) { return T[k].baris; }), N = tb.map(function (b) { return b.length; }), ni = 0, nn = 0, nw = 0;
      tb.forEach(function (b) { b.forEach(function (r) { if (r[2] === "V") ni++; else if (r[3] === "V") nn++; else if (r[4] === "V") nw++; }); });
      var rk = (3 * N[0] + N[1] + 2 * N[2]) / n, A = Math.min(4, rk), B = riSkor(ni, nn, nw, 2, 6, 9);
      return { s: (2 * A + B) / 3, info: "RK = " + dua(rk) + " (pendidikan " + N[0] + ", penelitian " + N[1] + ", PkM " + N[2] + "); internasional " + ni + ", nasional " + nn + ", wilayah " + nw }; }
    case "suasana": { var bulan = {};
      X.setuju.filter(function (k) { return k.jenis === "suasana" && taKegiatan(k) === X.ts; }).forEach(function (k) { var d = keTanggal(k.tgl); bulan[(d.getMonth() + 6) % 12] = 1; });
      var l = Object.keys(bulan).map(Number).sort(function (a, b) { return a - b; });
      if (!l.length) return { s: 1, info: "Belum ada kegiatan suasana akademik yang disetujui pada TS", kurang: true };
      var gap = l.length === 1 ? 12 : Math.max.apply(null, l.map(function (v, i) { return i ? v - l[i - 1] : v + 12 - l[l.length - 1]; }));
      return { s: gap <= 1 ? 4 : gap <= 3 ? 3 : gap <= 6 ? 2 : 1, info: l.length + " dari 12 bulan ada kegiatan; jarak terpanjang " + gap + " bulan (TA " + labelTa(X.ts) + ")" }; }
    case "animo": { var a = X.pmb.filter(function (x) { return x.tahun === X.ts - 2; })[0], b = X.pmb.filter(function (x) { return x.tahun === X.ts; })[0];
      if (!a || !b || !a.pendaftar) return kurang("Data pendaftar " + (X.ts - 2) + " dan " + X.ts + " belum diisi (Data Prodi › PMB)");
      var tr = (b.pendaftar - a.pendaftar) / a.pendaftar; return { s: tr > 0.1 ? 4 : tr > 0 ? 3 : tr === 0 ? 2 : 1, info: "Tren pendaftar " + (X.ts - 2) + "–" + X.ts + " = " + (tr >= 0 ? "+" : "") + persen(tr), auto: true }; }
    case "dop": case "dpd": case "dpkmd": { if (f === "dop" ? !X.NM : nd) return kurang(f === "dop" ? "NM = 0" : "NDTPS = 0");
      var dana = {}; semua("Dana").forEach(function (r) { var a = Number(r.ta); if (X.tsL.indexOf(a) >= 0) { dana[teks(r.jenis)] = dana[teks(r.jenis)] || { upps: 0, ps: 0 }; dana[teks(r.jenis)].upps += angka(r.upps, 1e13); dana[teks(r.jenis)].ps += angka(r.ps, 1e13); } });
      var jum = function (ks, kol) { return ks.reduce(function (s, k) { return s + ((dana[k] || {})[kol] || 0); }, 0); };
      if (f === "dop") { var ks = ["dosen", "tendik", "opsBelajar", "opsTakLangsung", "kemahasiswaan"], kol = jum(ks, "upps") ? "upps" : "ps", bop = jum(ks, kol) / 1e6;
        if (!bop) return kurang("Penggunaan dana belum diisi (Data Prodi › Keuangan)"); var d = bop / 3 / X.NM;
        return { s: d >= 20 ? 4 : d / 5, info: "DOP = Rp" + dua(d) + " juta/mahasiswa/tahun (kolom " + (kol === "upps" ? "UPPS" : "prodi") + ", NM " + X.NM + ")" }; }
      var jenis = f === "dpd" ? "penelitian" : "pkm", dk = X.setujuTs.filter(function (k) { return k.jenis === jenis; }).reduce(function (s, k) { return s + angka(String(k.isian["Jumlah dana (Rp)"] || "").replace(/[^\d]/g, ""), 1e13); }, 0);
      var dp = (dk || jum([jenis], "ps")) / 1e6, sumber = dk ? "isian dana kegiatan" : "Data Prodi › Keuangan";
      if (!dp) return kurang("Dana " + (jenis === "pkm" ? "PkM" : "penelitian") + " belum tercatat (isian Jumlah dana pada kegiatan, atau Data Prodi › Keuangan)"); var v = dp / 3 / n;
      return f === "dpd" ? { s: v >= 10 ? 4 : 2 * v / 5, info: "DPD = Rp" + dua(v) + " juta/DTPS/tahun (" + sumber + ")" } : { s: v >= 5 ? 4 : 4 * v / 5, info: "DPkMD = Rp" + dua(v) + " juta/DTPS/tahun (" + sumber + ")" }; }
    case "tkm": { var v = T["22"].baris.slice(0, 5).filter(function (r) { return r[2] + r[3] + r[4] + r[5] > 0; }).map(function (r) { return (4 * r[2] + 3 * r[3] + 2 * r[4] + r[5]) / 100; });
      if (!v.length) return kurang("Belum ada survei kepuasan mahasiswa pada TS (Tabel 22)"); var tkm = rataL(v) / 4;
      return { s: tkm >= 0.75 ? 4 : tkm >= 0.25 ? 8 * tkm - 2 : 0, info: "TKM = " + persen(tkm) + " (rata-rata 5 aspek ÷ 4; tafsiran)", auto: true }; }
    case "gcet": { var ps = {}; X.setujuTs.forEach(function (k) { (k.gcet || []).forEach(function (g) { ps[g] = 1; }); }); var c = Object.keys(ps).length;
      return { s: c >= 8 ? 4 : c >= 5 ? 3 : c >= 1 ? 2 : 1, info: c + " dari 10 pasal GCET diterapkan pada kegiatan yang disetujui (3 tahun)" }; }
    case "sertmhs": { var s78 = X.mhs.filter(function (p) { var s = semesterMhs(p.masuk); return s === 7 || s === 8; });
      if (!s78.length) return kurang("Belum ada mahasiswa aktif semester 7–8");
      var dok = {}; semua("DokumenPribadi").forEach(function (r) { if (!r.dihapus && /kompetensi/i.test(teks(r.jenis))) dok[r.userId] = 1; });
      var idx = indeksOrang(); X.setuju.filter(function (k) { return k.jenis === "sertifikasi"; }).forEach(function (k) { mhsPeserta(k, idx).forEach(function (m) { dok[m.id] = 1; }); });
      var p = s78.filter(function (x) { return dok[x.id]; }).length / s78.length;
      return { s: p > 0.7 ? 4 : p >= 0.5 ? 3 : p >= 0.25 ? 2 : p > 0 ? 1 : 0, info: persen(p) + " mahasiswa semester 7–8 bersertifikat kompetensi (dokumen pribadi/kegiatan sertifikasi)", auto: true }; }
  }
  return null;
}
/** Gabungkan bagian otomatis dan skor GPM untuk butir "c". */
function gabung(n, auto, gpm) {
  var g = gpm === null ? 0 : gpm;
  if (n === 26) return (g + auto) / 2;
  if (n === 42) return (2 * auto + g) / 3;
  if (n === 64) return (2 * g + auto) / 3;
  if (n === 71) return (auto + 2 * g) / 3;
  return g;
}

function hitungPenilaian(ts) {
  var X = konteksNilai(ts), gpm = {};
  semua("SkorGpm").filter(function (r) { return Number(r.ts) === ts; }).forEach(function (r) { gpm[Number(r.butir)] = { skor: r.skor === "" ? null : Number(r.skor), catatan: teks(r.catatan), oleh: teks(r.oleh), waktu: r.waktu ? new Date(r.waktu).toISOString() : "" }; });
  var idx = indeksOrang(), mkp = infoMkpTs(ts);
  var rows = MATRIKS.map(function (m) {
    var g = gpm[m.n] || { skor: null, catatan: "" }, r = m.f ? rumusOtomatis(m.f, X) : null, s, info, auto = null;
    if (m.t === "a") { s = r.s; info = r.info; }
    else if (m.t === "c" && r) { auto = r.s; s = gabung(m.n, r.s, g.skor); info = r.info + "; skor GPM " + (g.skor === null ? "belum diisi" : g.skor); }
    else { s = g.skor === null ? 0 : g.skor; info = g.skor === null ? "Belum dinilai GPM" : "Dinilai GPM"; }
    if (mkp[m.n]) info += "; " + mkp[m.n];
    s = Math.round(cap4(s) * 100) / 100;
    var o = idx.byId[g.oleh];
    return { n: m.n, k: m.k, nm: m.nm, w: m.w, t: m.t, ded: m.ded, src: m.src, s4: m.s4, sr: m.sr, skor: s, nilai: Math.round(m.w * s * 1000) / 1000, info: info,
      kurang: !!(r && r.kurang), auto: auto === null ? null : Math.round(cap4(auto) * 100) / 100, gpm: m.t === "a" ? null : g.skor, perluGpm: m.t !== "a",
      catatan: g.catatan || "", olehGpm: o ? o.nama : "", waktuGpm: g.waktu || "", gain: Math.round(m.w * (4 - s) * 1000) / 1000 };
  });
  var total = rows.reduce(function (a, r) { return a + r.w * r.skor; }, 0);
  var per = Object.keys(KRITERIA).map(function (k) { var rr = rows.filter(function (r) { return r.k === k; }), w = rr.reduce(function (a, r) { return a + r.w; }, 0), v = rr.reduce(function (a, r) { return a + r.w * r.skor; }, 0);
    return { k: k, l: KRITERIA[k], bobot: Math.round(w * 1000) / 1000, nilai: Math.round(v * 100) / 100, maks: Math.round(4 * w * 100) / 100 }; });
  return { ts: { awal: ts, label: labelTa(ts) }, total: Math.round(total * 100) / 100, rows: rows, kriteria: per, target: Number(pengaturan("targetNilai", 361)) || 361,
    belumGpm: rows.filter(function (r) { return r.perluGpm && r.gpm === null; }).length, kurangData: rows.filter(function (r) { return r.kurang; }).length,
    ringkas: { NDTPS: X.NDTPS, NM: X.NM } };
}

/* ---------- aksi ---------- */

function aksiPenilaianData(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_NILAI);
  var ts = d.ts ? Number(d.ts) : tsAwal();
  if (!(ts >= 2000 && ts < 2100)) throw galat("TS tidak valid.");
  var h = hitungPenilaian(ts);
  h.tsTersimpan = tsAwal(); h.bolehTarget = punyaPeran(p, ["admin", "superadmin"]);
  return h;
}
function aksiPenilaianSkor(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_NILAI);
  var ts = Number(d.ts), n = Number(d.butir), m = MATRIKS.filter(function (x) { return x.n === n; })[0];
  if (!(ts >= 2000 && ts < 2100)) throw galat("TS tidak valid.");
  if (!m) throw galat("Butir tidak dikenal.");
  if (m.t === "a") throw galat("Butir " + n + " dihitung otomatis dari data; perbaiki datanya, bukan skornya.");
  var skor = d.skor === "" || d.skor === null || d.skor === undefined ? "" : Number(d.skor);
  if (skor !== "" && !(skor >= 0 && skor <= 4 && Math.round(skor * 100) === skor * 100)) throw galat("Skor harus 0–4.");
  var cat = potong(d.catatan, 2000).trim();
  return kunciTulis(function () {
    var r = cari("SkorGpm", function (x) { return Number(x.ts) === ts && Number(x.butir) === n; }), o = { ts: ts, butir: n, skor: skor, catatan: cat, oleh: p.id, waktu: new Date() };
    if (r) ubah("SkorGpm", r, o); else tambah("SkorGpm", o);
    catat(p.id, "penilaian.skor", { ts: ts, butir: n, skor: skor });
    return {};
  });
}
function aksiPenilaianTarget(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["admin", "superadmin"]);
  var t = Number(d.target);
  if (!(t > 0 && t <= 400)) throw galat("Target harus 1–400.");
  return kunciTulis(function () {
    var r = cari("Pengaturan", function (x) { return x.kunci === "targetNilai"; });
    if (r) ubah("Pengaturan", r, { nilai: t }); else tambah("Pengaturan", { kunci: "targetNilai", nilai: t, keterangan: "Target nilai simulasi penilaian (maks. 400); ambang Unggul mengacu PerBAN-PT 17/2025" });
    catat(p.id, "penilaian.target", { target: t });
    return {};
  });
}
