/**
 * v0.51.0: EDOM, evaluasi pembelajaran oleh mahasiswa per mata kuliah, per kelas, dan per dosen/praktisi (butir 23, 22, 25; survei Tahap 2).
 * - Survei bertujuan "edom" (templat TEMPLAT_SURVEI.edom) untuk satu semester (meta.semester, mis. "2026-1"). Butir lev "mk" dinilai sekali per
 *   unit kelas; butir lev "dosen" diulang untuk setiap pengajar unit itu (tim pengajar per kelas/kelompok, Data Prodi › Tim pengajar).
 * - Unit mahasiswa = mata kuliah semesternya beserta kunci peserta (kelas "A", kelompok "A/JEPANG"), sama dengan menu Mata Kuliah Saya
 *   (edomUnitMhs, memakai logika aksiMhsMkSaya). MK tanpa dosen pengampu (magang/TA) dan MK pilihan yang kelompoknya belum dibagi tidak dinilai.
 * - ANONIM: satu baris Jawaban per (mahasiswa, unit) TANPA id/kunci/jam; isi {u, mk:{q:v}, d:{"u:<id>"|"p:<id>":{q:v}}, k}. Unit yang sudah dinilai
 *   dicatat di tabel PengisiSurvei (satu baris per mahasiswa, dibuat sekaligus saat survei dimulai, urut id — bukan urut waktu). Mahasiswa yang
 *   menyelesaikan semua unitnya masuk Survei.pengisi (dipakai daftar sudah/belum dan pengingat yang sudah ada).
 * - Hasil (survei.edomHasil, pengelola) dan hasil pribadi dosen (edom.saya): rata-rata per variabel/butir per unit dan per pengajar; unit atau
 *   pengajar dengan < MIN_KELOMPOK pengisi disembunyikan; saran tampil acak hanya bila unit ≥ MIN_KELOMPOK. Dosen hanya melihat dirinya dan unit yang ia ajar.
 */
function kunciOrang(a) { return (a.t === "p" ? "p:" : "u:") + a.id; }
function semesterSurvei(s) { var m = s.meta || {}; return /^\d{4}-[12]$/.test(m.semester || "") ? m.semester : semesterInfo(s.buka ? keTanggal(s.buka) : new Date()).kode; }

/** Unit (mata kuliah × kelas/kelompok) yang diikuti mahasiswa pada semester itu, beserta pengajarnya. */
function edomUnitMhs(p, smt, ctx, idx, prak) {
  ctx = ctx || konteksPeserta(smt); idx = idx || indeksOrang(); prak = prak || petaPraktisi();
  var saya = { masuk: Number(p.masuk) || 0, kelas: teks(p.kelas).toUpperCase() }, hasil = [];
  if (!ctx.aktif[p.id]) ctx.aktif[p.id] = { id: p.id, masuk: saya.masuk, kelas: saya.kelas };
  mkSemesterIni(smt).forEach(function (m) {
    if (m.tanpaTim) return;
    var angk = angkatanMk(smt, m.semester), ps = pesertaMk(smt, m, ctx), kunci = "";
    Object.keys(ps).forEach(function (k) { if (!kunci && ps[k].ids.indexOf(p.id) >= 0) kunci = k; });
    if (!kunci) {
      if (angk !== saya.masuk || (m.kelompok && m.kelompok.length)) return;
      if (Object.keys(ps).some(function (k) { return k === saya.kelas && ps[k].sumber === "diatur"; })) return;
      kunci = saya.kelas;
    }
    var tim = timUntukKunci(ctx.tim[m.kode], kunci);
    if (!tim.length) return;
    var g = kelompokDariKunci(kunci), kel = g ? (m.kelompok || []).filter(function (x) { return x.n.toUpperCase() === g; })[0] : null;
    hasil.push({ u: m.kode + "|" + kunci, kode: kel && kel.kode ? kel.kode : m.kode, nama: m.nama + (kel ? " (" + kel.n + ")" : ""), kelas: "Kelas " + kunci.split("/")[0],
      pengajar: tim.map(function (a, i) {
        if (a.t === "p") { var x = prak[a.id]; return { k: kunciOrang(a), nama: x ? x.nama : "(praktisi)", praktisi: true, utama: false }; }
        var o = idx.byId[a.id]; return { k: kunciOrang(a), nama: o ? o.nama : "(dosen)", praktisi: false, utama: i === 0 };
      }) });
  });
  return hasil;
}
function barisPengisiSurvei(sid, uid) { return cari("PengisiSurvei", function (r) { return r.survei === sid && r.userId === uid; }); }
/** Dibuat saat survei EDOM dimulai: satu baris per mahasiswa sasaran, urut id (bukan urut waktu pengisian). */
function siapkanPengisiEdom(s) {
  var ada = {}; semua("PengisiSurvei").filter(function (r) { return r.survei === s.id; }).forEach(function (r) { ada[r.userId] = 1; });
  var baru = semua("Pengguna").filter(function (u) { return u.status === "aktif" && cocokSasaran(s, u) && !ada[u.id]; }).map(function (u) { return u.id; }).sort()
    .map(function (id) { return { survei: s.id, userId: id, unit: "[]" }; });
  if (baru.length) tambahBanyak("PengisiSurvei", baru);
}
function ambilSurveiEdom(id) {
  var s = ambilSurvei(String(id || ""));
  if (s.tujuan !== "edom") throw galat("Survei ini bukan EDOM.");
  return s;
}
function soalEdom(s, lev) { return s.pertanyaan.filter(function (q) { return (q.lev || "mk") === lev; }); }

/** Mahasiswa: daftar unit yang perlu dinilai beserta status. */
function aksiSurveiEdomAmbil(d, token) {
  var p = penggunaDariToken(token), s = ambilSurveiEdom(d.id);
  if (statusEfektif(s) !== "dibuka" || !cocokSasaran(s, p)) throw galat("Survei ini tidak terbuka untuk Anda.");
  var r = barisPengisiSurvei(s.id, p.id), selesai = r ? jsonDari(r.unit, []) : [];
  var unit = edomUnitMhs(p, semesterSurvei(s)).map(function (x) { x.selesai = selesai.indexOf(x.u) >= 0; return x; });
  var o = surveiKeResponden(s); o.semester = labelSmt(semesterSurvei(s)); o.unit = unit; o.soalMk = soalKeKlien({ pertanyaan: soalEdom(s, "mk") }); o.soalDosen = soalKeKlien({ pertanyaan: soalEdom(s, "dosen") });
  delete o.soal;
  return { survei: o };
}
function periksaNilaiEdom(list, j, label) {
  var o = {};
  list.forEach(function (x, i) {
    var v = j ? j[x.id] : undefined, kosong = v === undefined || v === null || v === "";
    if (kosong) { if (x.wajib) throw galat(label + ": pertanyaan " + (i + 1) + " wajib dijawab."); return; }
    if (x.t === "likert") { v = Number(v); if (!((v >= 1 && v <= 4) || (x.na && v === 0)) || Math.floor(v) !== v) throw galat(label + ": jawaban pertanyaan " + (i + 1) + " tidak valid."); }
    else v = potong(v, 2000).trim();
    o[x.id] = v;
  });
  return o;
}
/** Mahasiswa: kirim penilaian satu unit (mata kuliah × kelas). */
function aksiSurveiEdomJawab(d, token) {
  var p = penggunaDariToken(token);
  return kunciTulis(function () {
    var s = ambilSurveiEdom(d.id);
    if (statusEfektif(s) !== "dibuka" || !cocokSasaran(s, p)) throw galat("Survei ini tidak terbuka untuk Anda.");
    var unit = edomUnitMhs(p, semesterSurvei(s)), u = unit.filter(function (x) { return x.u === teks(d.u); })[0];
    if (!u) throw galat("Mata kuliah ini tidak termasuk mata kuliah Anda pada semester survei.");
    var r = barisPengisiSurvei(s.id, p.id), selesai = r ? jsonDari(r.unit, []) : [];
    if (selesai.indexOf(u.u) >= 0) throw galat("Mata kuliah ini sudah Anda nilai.");
    var mk = periksaNilaiEdom(soalEdom(s, "mk"), d.mk, "Mata kuliah"), dsn = {}, isiDsn = d.d || {};
    u.pengajar.forEach(function (a) { dsn[a.k] = periksaNilaiEdom(soalEdom(s, "dosen"), isiDsn[a.k], a.nama); });
    tambah("Jawaban", { id: "j" + acak(10), survei: s.id, userId: "", kunci: "", jawaban: JSON.stringify({ u: u.u, mk: mk, d: dsn }), waktu: hariIni() });
    selesai.push(u.u);
    if (r) ubah("PengisiSurvei", r, { unit: JSON.stringify(selesai) }); else tambah("PengisiSurvei", { survei: s.id, userId: p.id, unit: JSON.stringify(selesai) });
    var semuaSelesai = unit.every(function (x) { return selesai.indexOf(x.u) >= 0; });
    if (semuaSelesai) {
      ubah("Survei", s._r, { pengisi: JSON.stringify(tambahPengisi(s, p.id)) });
      semua("Pengingat").filter(function (g) { return g.untuk === p.id && !g.selesai && g.jenis === "survei:" + s.id; }).forEach(function (g) { ubah("Pengingat", g, { selesai: new Date() }); });
    }
    return { selesai: selesai.length, total: unit.length, semuaSelesai: semuaSelesai };
  });
}

/* ---------- hasil ---------- */

function nilaiPer(list, soal) {
  var per = {}; soal.forEach(function (q) { if (q.t === "likert") per[q.id] = []; });
  list.forEach(function (o) { Object.keys(per).forEach(function (id) { var v = Number((o || {})[id]); if (v >= 1 && v <= 4) per[id].push(v); }); });
  var vars = [], byVar = {};
  soal.filter(function (q) { return q.t === "likert"; }).forEach(function (q) { var v = q["var"] || "Lainnya"; if (!byVar[v]) { byVar[v] = []; vars.push(v); } byVar[v] = byVar[v].concat(per[q.id]); });
  var semuaV = [].concat.apply([], Object.keys(per).map(function (k) { return per[k]; }));
  return { butir: soal.filter(function (q) { return q.t === "likert"; }).map(function (q) { var st = rataSd(per[q.id]); return { id: q.id, ind: q.ind, teks: q.teks, "var": q["var"], n: per[q.id].length, rata: st.rata }; }),
    variabel: vars.map(function (v) { var st = rataSd(byVar[v]); return { "var": v, rata: st.rata, sd: st.sd, puas: byVar[v].length ? bulat(byVar[v].filter(function (y) { return y >= 3; }).length / byVar[v].length * 100, 1) : null }; }),
    rata: rataSd(semuaV).rata, indeks: rataSd(semuaV).rata == null ? null : bulat((rataSd(semuaV).rata - 1) / 3 * 100, 1) };
}
/** Ringkasan EDOM untuk satu survei. Bila hanyaOrang diisi ("u:<id>"), hanya unit yang diajar orang itu dan nilai dirinya. */
function susunEdom(s, hanyaOrang) {
  var smt = semesterSurvei(s), js = jawabanSurvei(s.id).map(function (r) { return jsonDari(r.jawaban, {}); }).filter(function (j) { return j && j.u; });
  var soalMk = soalEdom(s, "mk"), soalDs = soalEdom(s, "dosen"), saran = soalMk.filter(function (q) { return q.t === "paragraf"; }).map(function (q) { return q.id; });
  var ctx = konteksPeserta(smt), idx = indeksOrang(), prak = petaPraktisi(), mkPeta = {}; semuaMk().forEach(function (m) { mkPeta[m.kode] = m; });
  var namaOrang = function (k) { var id = k.slice(2); if (k[0] === "p") { var x = prak[id]; return x ? x.nama + " (praktisi)" : "(praktisi)"; } var o = idx.byId[id]; return o ? o.nama : "(dosen)"; };
  var perU = {}; js.forEach(function (j) { (perU[j.u] = perU[j.u] || []).push(j); });
  var unit = [], perOrang = {};
  Object.keys(perU).sort().forEach(function (u) {
    var l = perU[u], kode = u.split("|")[0], kunci = u.split("|")[1], m = mkPeta[kode], tim = m ? timUntukKunci(ctx.tim[kode], kunci) : [], orangKunci = tim.map(kunciOrang);
    Object.keys(l.reduce(function (a, j) { Object.keys(j.d || {}).forEach(function (k) { a[k] = 1; }); return a; }, {})).forEach(function (k) { if (orangKunci.indexOf(k) < 0) orangKunci.push(k); });
    if (hanyaOrang && orangKunci.indexOf(hanyaOrang) < 0) return;
    var peserta = 0; if (m) { var ps = pesertaMk(smt, m, ctx); peserta = ps[kunci] ? ps[kunci].ids.length : 0; }
    var x = { u: u, kode: kode, nama: m ? m.nama : kode, kelas: kunci, n: l.length, peserta: peserta };
    if (l.length < MIN_KELOMPOK) { x.tersembunyi = true; unit.push(x); return; }
    x.mk = nilaiPer(l.map(function (j) { return j.mk; }), soalMk);
    x.saran = acakUrutan([].concat.apply([], l.map(function (j) { return saran.map(function (id) { return teks((j.mk || {})[id]); }); })).filter(String)).slice(0, 200);
    x.pengajar = orangKunci.filter(function (k) { return !hanyaOrang || k === hanyaOrang; }).map(function (k) {
      var dl = l.map(function (j) { return (j.d || {})[k]; }).filter(Boolean), r = nilaiPer(dl, soalDs);
      (perOrang[k] = perOrang[k] || []).push.apply(perOrang[k], dl);
      return Object.assign({ k: k, nama: namaOrang(k), n: dl.length }, r);
    });
    unit.push(x);
  });
  var pengajar = Object.keys(perOrang).filter(function (k) { return !hanyaOrang || k === hanyaOrang; }).map(function (k) {
    var r = nilaiPer(perOrang[k], soalDs); return Object.assign({ k: k, nama: namaOrang(k), n: perOrang[k].length, unit: unit.filter(function (u) { return (u.pengajar || []).some(function (p) { return p.k === k; }); }).length }, r);
  }).sort(function (a, b) { return a.nama.localeCompare(b.nama); });
  return { semester: smt, labelSemester: labelSmt(smt), unit: unit, pengajar: pengajar, jumlahJawaban: js.length, minKelompok: MIN_KELOMPOK,
    soalMk: soalMk.filter(function (q) { return q.t === "likert"; }).map(function (q) { return { id: q.id, ind: q.ind, teks: q.teks, "var": q["var"] }; }),
    soalDosen: soalDs.map(function (q) { return { id: q.id, ind: q.ind, teks: q.teks, "var": q["var"] }; }) };
}
function aksiSurveiEdomHasil(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SURVEI_LIHAT);
  var s = ambilSurveiEdom(d.id), h = susunEdom(s, null);
  h.survei = surveiKeAdmin(s, h.jumlahJawaban);
  var pg = semua("PengisiSurvei").filter(function (r) { return r.survei === s.id; });
  h.sebagian = pg.filter(function (r) { return jsonDari(r.unit, []).length > 0; }).length;
  return h;
}
/** Dosen: hasil EDOM dirinya (semua survei EDOM yang sudah dimulai), hanya unit yang ia ajar dan hanya bila pengisi ≥ MIN_KELOMPOK. */
function aksiEdomSaya(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["dosen"]);
  var k = "u:" + p.id;
  return { edom: semuaSurvei().filter(function (s) { return s.tujuan === "edom" && s.status !== "draf"; }).sort(function (a, b) { return a.buka < b.buka ? 1 : -1; }).slice(0, 8).map(function (s) {
    var h = susunEdom(s, k); return { id: s.id, judul: s.judul, status: statusEfektif(s), labelSemester: h.labelSemester, unit: h.unit, diri: h.pengajar[0] || null, soalDosen: h.soalDosen, soalMk: h.soalMk, minKelompok: MIN_KELOMPOK };
  }).filter(function (x) { return x.unit.length; }) };
}
