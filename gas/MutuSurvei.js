/**
 * Siklus mutu survei (v0.52.0, survei poin 7–8; butir 78 aspek 3–6, butir 23, 42, 71).
 * 1. Survei ditutup → ringkasHasil(s): angka agregat tanpa jawaban perorangan dan tanpa teks bebas (EDOM: tingkat prodi saja, tanpa nama dosen/kelas).
 * 2. usulanPembahasan(R): hal yang perlu dibahas (variabel di bawah ambang Baik/75% puas, prioritas IPA, NPS negatif, indikator tracer).
 *    Formulir rapat menampilkannya sebagai "Rekomendasi dari hasil survei"; agenda yang ditambahkan menyimpan sv = id survei (Rapat.agenda[].sv).
 * 3. Risalah: keputusan bisa diberi tanda pub ("umumkan"). Keputusan berpenanggung jawab menjadi Tindak Lanjut seperti biasa (v0.32.0).
 * 4. Publikasi (tabel PublikasiSurvei): temuan + kesimpulan + potret angka saat terbit, untuk sasaran pembaca; keputusan rapat bertanda pub yang terkait
 *    survei tampil di bawahnya beserta status tindak lanjut terkini ("Anda menyampaikan, kami melakukan"). Keputusan pub yang tidak terkait survei tampil
 *    sebagai "Keputusan rapat yang diumumkan". Pembaca dicatat (id, tanpa waktu) sebagai bukti publikasi mudah diakses.
 * Nama penanggung jawab TIDAK ditampilkan kepada dosen/mahasiswa (hindari ketersinggungan); pengelola melihatnya di menu Tindak Lanjut.
 */
var PERAN_PUB_UBAH = ["admin", "superadmin", "kps"];
var SASARAN_PUB = { mahasiswa: "Mahasiswa", dosen: "Dosen", tendik: "Tenaga kependidikan" };
var BUTIR_TUJUAN_SV = { t22: [71, 78], t11: [42, 78], tracer: [38, 39, 40, 41], edom: [23], mitra: [73, 78], kurikulum: [7, 3], layanan: [65], dosen: [78], tendik: [78], exit: [78] };
/** Kelompok pemangku kepentingan butir 78 yang diukur oleh tiap tujuan survei. */
var KELOMPOK_78 = { mahasiswa: ["t22", "layanan", "edom"], dosen: ["dosen"], tendik: ["tendik"], lulusan: ["exit", "tracer"], pengguna: ["t11"], mitra: ["mitra"] };
var HARI_MUTU = 400;  // survei yang ditutup dalam ±13 bulan terakhir masih diingatkan untuk dibahas/dipublikasikan

function pubDari(r) {
  return { _r: r, id: teks(r.id), survei: teks(r.survei), judul: teks(r.judul), ringkas: jsonDari(r.ringkas, null), temuan: teks(r.temuan), kesimpulan: teks(r.kesimpulan),
    sasaran: jsonDari(r.sasaran, []), status: teks(r.status) || "draf", terbit: teksTgl(r.terbit), oleh: teks(r.oleh), diubah: r.diubah ? new Date(r.diubah).toISOString() : "",
    baca: jsonDari(r.baca, []) };
}
function semuaPub() { return semua("PublikasiSurvei").map(pubDari); }
function pubSurvei(id) { return semuaPub().filter(function (x) { return x.survei === id; })[0] || null; }
function rataMutu(l) { l = l.filter(function (v) { return v != null; }); return l.length ? bulat(l.reduce(function (a, b) { return a + b; }, 0) / l.length, 2) : null; }
function indeksDari(r) { return r == null ? null : bulat((r - 1) / 3 * 100, 1); }
function tglTutupSurvei(s) { return s.tutup || (s.diubah ? String(s.diubah).slice(0, 10) : ""); }
function surveiSelesai(s) { return statusEfektif(s) === "ditutup"; }

/** Ringkasan agregat satu survei (dipakai pratinjau, potret publikasi, dan usulan rapat). */
function ringkasHasil(s) {
  var js = jawabanSurvei(s.id), T = hitungTarget(s);
  var o = { tujuan: s.tujuan, labelTujuan: TUJUAN_SURVEI[s.tujuan] || s.tujuan, n: js.length, populasi: T.populasi || 0, min: T.min || null,
    butir: BUTIR_TUJUAN_SV[s.tujuan] || [], buka: s.buka, tutup: s.tutup, anonim: s.anonim, variabel: [], indikator: [], sorotan: [], ipa: [], nps: null, keseluruhan: null };
  if (s.tujuan === "edom") {
    var jj = js.map(function (r) { return jsonDari(r.jawaban, {}); }).filter(function (j) { return j && j.u; });
    o.n = (s.pengisi || []).length; o.nPenilaian = jj.length; o.labelSemester = labelSmt(semesterSurvei(s));
    if (jj.length < MIN_KELOMPOK) { o.tertahan = true; return o; }
    var sMk = soalEdom(s, "mk"), sDs = soalEdom(s, "dosen");
    var mk = nilaiPer(jj.map(function (j) { return j.mk; }), sMk);
    var ds = nilaiPer([].concat.apply([], jj.map(function (j) { return Object.keys(j.d || {}).map(function (k) { return j.d[k]; }); })), sDs);
    o.variabel = mk.variabel.map(function (v) { return { "var": "Mata kuliah · " + v["var"], rata: v.rata, puas: v.puas, indeks: indeksDari(v.rata) }; })
      .concat(ds.variabel.map(function (v) { return { "var": "Pengajar · " + v["var"], rata: v.rata, puas: v.puas, indeks: indeksDari(v.rata) }; }));
    o.keseluruhan = { rata: rataMutu([mk.rata, ds.rata]), indeks: indeksDari(rataMutu([mk.rata, ds.rata])) };
    o.indikator = [{ l: "Rata-rata mata kuliah", v: mk.rata }, { l: "Rata-rata pengajar", v: ds.rata }];
    var perU = {}; jj.forEach(function (j) { (perU[j.u] = perU[j.u] || []).push(j); });
    var uk = Object.keys(perU), tampak = uk.filter(function (u) { return perU[u].length >= MIN_KELOMPOK; });
    o.kelasDinilai = uk.length; o.kelasTampak = tampak.length;
    o.kelasRendah = tampak.filter(function (u) { var r = nilaiPer(perU[u].map(function (j) { return j.mk; }), sMk).rata; return r != null && r < 3; }).length;
    o.sorotan.push(o.n + " mahasiswa selesai menilai semua mata kuliahnya; " + jj.length + " penilaian dari " + uk.length + " kelas mata kuliah (" + tampak.length + " kelas memenuhi minimal " + MIN_KELOMPOK + " pengisi).");
  } else if (s.tujuan === "tracer") {
    if (!js.length) { o.tertahan = true; return o; }
    var ind = {}; s.pertanyaan.forEach(function (q) { if (q.ind) ind[q.ind] = q.id; });
    var jw = js.map(function (r) { return jsonDari(r.jawaban, {}); }), peta = jw.map(function (j) { return petaTracer(j, ind); });
    var wt = peta.map(function (x) { return x.wtBulan; }).filter(function (v) { return v != null; }), ks = peta.map(function (x) { return x.kesesuaian; }).filter(Boolean);
    var pct = function (a, b) { return b ? bulat(a / b * 100, 1) : null; };
    o.indikator = [{ l: "Rata-rata waktu tunggu (bulan)", v: rataMutu(wt), butir: 39, ambang: "skor 4 bila < 3 bulan" },
      { l: "Waktu tunggu < 3 bulan (%)", v: pct(wt.filter(function (v) { return v < 3; }).length, wt.length), butir: 39 },
      { l: "Kesesuaian bidang kerja tinggi (%)", v: pct(ks.filter(function (v) { return v === "Tinggi"; }).length, ks.length), butir: 40, ambang: "skor 4 bila ≥ 60%" }];
    var qs = s.pertanyaan.filter(function (q) { return q.ind === "F8"; })[0];
    if (qs) { var hit = {}; jw.forEach(function (j) { var v = teks(j[qs.id]); if (v) hit[v] = (hit[v] || 0) + 1; });
      o.sorotan.push("Status saat ini: " + Object.keys(hit).sort(function (a, b) { return hit[b] - hit[a]; }).map(function (k) { return k + " " + pct(hit[k], js.length) + "%"; }).join(", ") + "."); }
    if (o.min) o.sorotan.push(js.length + " alumni menjawab; target minimal instrumen " + o.min + " dari " + o.populasi + " lulusan TS-4 s.d. TS-2.");
  } else {
    if (!js.length || (s.anonim && js.length < MIN_ANONIM)) { o.tertahan = true; return o; }
    var A = analisisSurvei(s, js);
    o.variabel = A.variabel.map(function (v) { return { "var": v["var"], rata: v.rata, puas: v.puas, indeks: indeksDari(v.rata) }; });
    o.keseluruhan = { rata: A.keseluruhan.rata, indeks: A.keseluruhan.indeks, alpha: A.keseluruhan.alpha };
    o.ipa = A.ipa.filter(function (r) { return /^I /.test(r.kuadran || ""); }).map(function (r) { return r["var"]; });
    var np = (A.nps || []).filter(function (x) { return x.n; })[0]; if (np) o.nps = { nps: np.nps, n: np.n };
    if (o.min) o.sorotan.push(js.length + " jawaban; target minimal " + o.min + " dari populasi " + o.populasi + ".");
  }
  var urut = o.variabel.filter(function (v) { return v.rata != null; }).sort(function (a, b) { return a.rata - b.rata; });
  o.lemah = urut.filter(function (v) { return v.rata < 3 || (v.puas != null && v.puas < 75); }).slice(0, 6).map(function (v) { return v["var"]; });
  o.kuat = urut.slice().reverse().filter(function (v) { return v.rata >= 3 && o.lemah.indexOf(v["var"]) < 0; }).slice(0, 3).map(function (v) { return v["var"]; });
  return o;
}
var angkaId = function (v) { return v == null ? "–" : String(v).replace(".", ","); };
/** Hal yang dianjurkan untuk dibahas di rapat (tanpa nama orang). */
function usulanPembahasan(R) {
  if (!R || R.tertahan) return [];
  var u = [], cari = function (nm) { return R.variabel.filter(function (v) { return v["var"] === nm; })[0] || {}; };
  R.lemah.forEach(function (nm) { var v = cari(nm); u.push(nm + ": rata-rata " + angkaId(v.rata) + (v.puas != null ? ", " + angkaId(v.puas) + "% puas" : "") + " (di bawah Baik 3,0 / 75% puas)."); });
  if (R.ipa.length) u.push("Prioritas utama IPA (penting bagi responden, kinerja masih rendah): " + R.ipa.join(", ") + ".");
  if (R.nps && R.nps.nps < 0) u.push("NPS " + R.nps.nps + " (lebih banyak yang tidak merekomendasikan daripada yang merekomendasikan).");
  if (R.tujuan === "tracer") {
    var wt = R.indikator[0].v, ks = R.indikator[2].v;
    if (wt != null && wt >= 3) u.push("Waktu tunggu kerja pertama rata-rata " + angkaId(wt) + " bulan (butir 39: skor 4 bila < 3 bulan).");
    if (ks != null && ks < 60) u.push("Kesesuaian bidang kerja tinggi baru " + angkaId(ks) + "% (butir 40: skor 4 bila ≥ 60%).");
  }
  if (R.tujuan === "edom" && R.kelasRendah) u.push(R.kelasRendah + " kelas mata kuliah rata-ratanya di bawah 3,0: KPS menindaklanjuti dengan dosen terkait secara tertutup (nama tidak dicantumkan di agenda).");
  if (R.min && R.n < R.min) u.push("Jumlah responden " + R.n + " di bawah target minimal " + R.min + ": rencanakan cara menaikkan partisipasi.");
  if (!u.length) u.push("Semua variabel memenuhi ambang Baik: bahas cara mempertahankan dan target peningkatan berikutnya.");
  u.push("Tetapkan tindak lanjut (penanggung jawab, tenggat) dan keputusan yang diumumkan kepada dosen/mahasiswa.");
  return u;
}
/** Rapat (bukan batal) yang agendanya terkait survei: { svId: [{ id, judul, tgl, final, agenda: [i] }] }. */
function rapatPerSurvei() {
  var m = {};
  semuaRapat().forEach(function (rp) {
    if (rp.status === "batal") return;
    rp.agenda.forEach(function (a, i) {
      if (!a.sv) return;
      var l = m[a.sv] = m[a.sv] || [], x = l.filter(function (y) { return y.id === rp.id; })[0];
      if (!x) { x = { id: rp.id, judul: rp.judul, tgl: rp.tgl, status: rp.status, final: risalahFinal(rp), agenda: [] }; l.push(x); }
      x.agenda.push(i);
    });
  });
  return m;
}
/** Keputusan rapat (risalah final) bertanda umumkan: terkait survei (sv) atau umum (sv kosong). Status dari Tindak Lanjut terkini. */
function keputusanDiumumkan() {
  var tl = {}; semuaTl().forEach(function (t) { tl[t.id] = t; });
  var hasil = [];
  semuaRapat().forEach(function (rp) {
    if (rp.status === "batal" || !risalahFinal(rp)) return;
    rp.risalah.agenda.forEach(function (a, i) {
      var ag = rp.agenda[i] || {};
      (a.keputusan || []).forEach(function (k) {
        if (!k.pub) return;
        var t = k.tl ? tl[k.tl] : null;
        hasil.push({ sv: ag.sv || "", rapat: rp.judul, tgl: rp.tgl, agenda: ag.t || "", t: k.t, tenggat: k.tenggat || "", butir: k.butir && k.butir.length ? k.butir : (ag.butir || []),
          status: t ? t.status : "dicatat", statusL: t ? STATUS_TL[t.status] || t.status : "Dicatat (tanpa penanggung jawab)", terlambat: t ? !!tlTerlambat(t) : false,
          bukti: !!(t && t.bukti && (t.status === "selesai" || t.status === "terverifikasi")) });
      });
    });
  });
  return hasil.sort(function (a, b) { return String(b.tgl).localeCompare(String(a.tgl)); });
}
function pubTerlihat(p, x) {
  if (x.status !== "terbit") return false;
  if (punyaPeran(p, PERAN_SURVEI_LIHAT) || punyaPeran(p, ["asesor"])) return true;
  return x.sasaran.some(function (k) { return punyaPeran(p, [k]); });
}
function jenisPembaca(ids, idx) {
  var h = { mahasiswa: 0, dosen: 0, tendik: 0, lain: 0 };
  ids.forEach(function (id) { var o = idx.byId[id]; var j = o ? o.jenis : "lain"; h[h[j] !== undefined ? j : "lain"]++; });
  return h;
}
function pubKeKlien(x, p, idx, kep) {
  var o = { id: x.id, survei: x.survei, judul: x.judul, ringkas: x.ringkas, temuan: x.temuan, kesimpulan: x.kesimpulan, sasaran: x.sasaran, status: x.status, terbit: x.terbit,
    diubah: x.diubah, sudahBaca: x.baca.indexOf(p.id) >= 0, tindakLanjut: kep.filter(function (k) { return k.sv === x.survei; }) };
  if (punyaPeran(p, PERAN_SURVEI_LIHAT)) { o.pembaca = jenisPembaca(x.baca, idx); o.jumlahBaca = x.baca.length; }
  return o;
}
/** Survei selesai yang perlu dibahas/dipublikasikan (dipakai Beranda dan formulir rapat). */
function surveiPerluMutu() {
  var batas = tglGeser(hariIni(), -HARI_MUTU), rp = rapatPerSurvei(), pub = {}; semuaPub().forEach(function (x) { pub[x.survei] = x; });
  return semuaSurvei().filter(function (s) { return surveiSelesai(s) && tglTutupSurvei(s) >= batas; }).map(function (s) {
    var n = jawabanSurvei(s.id).length;
    return { s: s, n: n, cukup: s.tujuan === "edom" ? n >= MIN_KELOMPOK : n >= (s.anonim ? MIN_ANONIM : 1), rapat: rp[s.id] || [], pub: pub[s.id] || null };
  }).filter(function (x) { return x.cukup; });
}
/** Pengingat Beranda: pengelola → survei belum dibahas / belum dipublikasikan; semua → publikasi dan keputusan baru yang belum dibaca. */
function tugasMutu(p) {
  var h = { mutuBaru: 0 };
  semuaPub().forEach(function (x) { if (pubTerlihat(p, x) && x.baca.indexOf(p.id) < 0) h.mutuBaru++; });
  if (punyaPeran(p, PERAN_RAPAT_KELOLA)) {
    var l = surveiPerluMutu();
    h.svBelumDibahas = l.filter(function (x) { return !x.rapat.length; }).map(function (x) { return { id: x.s.id, judul: x.s.judul, tutup: x.s.tutup }; });
    h.svBelumTerbit = l.filter(function (x) { return !x.pub || x.pub.status !== "terbit"; }).map(function (x) { return { id: x.s.id, judul: x.s.judul, tutup: x.s.tutup, dibahas: x.rapat.length > 0 }; });
  }
  return h;
}
/** Keterangan butir 78 di Penilaian (6 kelompok, dibahas, dipublikasikan) untuk survei yang ditutup pada TS (12 bulan terakhir). */
function infoSurvei78() {
  var batas = tglGeser(hariIni(), -366), l = semuaSurvei().filter(function (s) { return surveiSelesai(s) && tglTutupSurvei(s) >= batas && jawabanSurvei(s.id).length; });
  if (!l.length) return "";
  var kel = Object.keys(KELOMPOK_78).filter(function (k) { return l.some(function (s) { return KELOMPOK_78[k].indexOf(s.tujuan) >= 0; }); });
  var rp = rapatPerSurvei(), pub = {}; semuaPub().forEach(function (x) { if (x.status === "terbit") pub[x.survei] = 1; });
  return "Survei 12 bulan terakhir: " + kel.length + " dari 6 kelompok terukur (" + kel.join(", ") + "); " + l.filter(function (s) { return rp[s.id]; }).length + " dari " + l.length +
    " dibahas di rapat; " + l.filter(function (s) { return pub[s.id]; }).length + " dipublikasikan";
}

/* ---------- aksi ---------- */

/** Rekomendasi agenda rapat dari survei yang sudah ditutup. */
function aksiMutuUsulan(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_RAPAT_KELOLA);
  return { survei: surveiPerluMutu().map(function (x) {
    var R = ringkasHasil(x.s), u = usulanPembahasan(R);
    return { id: x.s.id, judul: x.s.judul, tujuan: x.s.tujuan, labelTujuan: TUJUAN_SURVEI[x.s.tujuan] || x.s.tujuan, tutup: x.s.tutup, n: R.n, butir: R.butir, tertahan: !!R.tertahan, usulan: u,
      agenda: potong("Pembahasan hasil " + x.s.judul + " (" + R.n + " responden): " + u.slice(0, 3).join(" "), 600),
      rapat: x.rapat.map(function (r) { return { id: r.id, judul: r.judul, tgl: r.tgl, final: r.final }; }), terbit: !!(x.pub && x.pub.status === "terbit") };
  }).sort(function (a, b) { return (a.rapat.length - b.rapat.length) || String(b.tutup).localeCompare(String(a.tutup)); }) };
}
/** Data penyusunan publikasi satu survei: publikasi tersimpan + pratinjau angka terbaru + keputusan rapat terkait. */
function aksiPubData(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SURVEI_LIHAT);
  var s = ambilSurvei(String(d.survei || "")), x = pubSurvei(s.id), idx = indeksOrang(), R = ringkasHasil(s), kep = keputusanDiumumkan();
  var rp = (rapatPerSurvei()[s.id] || []).map(function (r) { return { id: r.id, judul: r.judul, tgl: r.tgl, final: r.final, status: r.status }; });
  return { survei: { id: s.id, judul: s.judul, tujuan: s.tujuan, labelTujuan: TUJUAN_SURVEI[s.tujuan] || s.tujuan, status: statusEfektif(s), buka: s.buka, tutup: s.tutup },
    publikasi: x ? pubKeKlien(x, p, idx, kep) : null, pratinjau: R, usulan: usulanPembahasan(R), rapat: rp, tindakLanjut: kep.filter(function (k) { return k.sv === s.id; }),
    sasaranPilihan: SASARAN_PUB, bolehUbah: punyaPeran(p, PERAN_PUB_UBAH) };
}
/** Simpan draf atau terbitkan: d = { survei, temuan, kesimpulan, sasaran[], terbit: true|false }. Terbit memotret angka saat itu. */
function aksiPubSimpan(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_PUB_UBAH);
  var s = ambilSurvei(String(d.survei || ""));
  var o = { temuan: potong(d.temuan, 3000).trim(), kesimpulan: potong(d.kesimpulan, 3000).trim(),
    sasaran: (Array.isArray(d.sasaran) ? d.sasaran : []).filter(function (k, i, l) { return SASARAN_PUB[k] && l.indexOf(k) === i; }) };
  var R = null;
  if (d.terbit) {
    if (!surveiSelesai(s)) throw galat("Hasil hanya bisa dipublikasikan setelah survei ditutup.");
    R = ringkasHasil(s);
    if (R.tertahan) throw galat("Jawaban belum cukup untuk dipublikasikan tanpa membuka identitas responden.");
    if (o.kesimpulan.length < 20) throw galat("Tulis kesimpulan untuk pembaca (minimal 20 huruf).");
    if (!o.sasaran.length) throw galat("Pilih minimal satu kelompok pembaca.");
  }
  return kunciTulis(function () {
    var x = pubSurvei(s.id), kini = new Date(), ubahan = { judul: s.judul, temuan: o.temuan, kesimpulan: o.kesimpulan, sasaran: JSON.stringify(o.sasaran), oleh: p.id, diubah: kini };
    if (d.terbit) { ubahan.status = "terbit"; ubahan.ringkas = JSON.stringify(R); ubahan.terbit = x && x.status === "terbit" && x.terbit ? x.terbit : hariIni(); }
    if (x) ubah("PublikasiSurvei", x._r, ubahan);
    else tambah("PublikasiSurvei", Object.assign({ id: "pb" + acak(10), survei: s.id, ringkas: "", status: "draf", terbit: "", baca: "[]", dibuat: kini }, ubahan));
    catat(p.id, d.terbit ? "pub.terbit" : "pub.simpan", { survei: s.id });
    return { status: d.terbit ? "terbit" : (x ? x.status : "draf") };
  });
}
/** Tarik publikasi (kembali ke draf). */
function aksiPubTarik(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_PUB_UBAH);
  return kunciTulis(function () {
    var x = pubSurvei(String(d.survei || ""));
    if (!x || x.status !== "terbit") throw galat("Publikasi belum terbit.");
    ubah("PublikasiSurvei", x._r, { status: "draf", diubah: new Date() });
    catat(p.id, "pub.tarik", { survei: x.survei });
    return { status: "draf" };
  });
}
/** Dashboard mutu untuk semua pengguna: publikasi hasil survei + keputusan rapat yang diumumkan. */
function aksiMutuDashboard(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SAH);
  var idx = indeksOrang(), kep = keputusanDiumumkan(), svAda = {};
  var pub = semuaPub().filter(function (x) { return pubTerlihat(p, x); }).map(function (x) { svAda[x.survei] = 1; return pubKeKlien(x, p, idx, kep); })
    .sort(function (a, b) { return String(b.terbit).localeCompare(String(a.terbit)); });
  return { publikasi: pub, keputusan: kep.filter(function (k) { return !k.sv || !svAda[k.sv]; }).map(function (k) { var o = Object.assign({}, k); delete o.sv; return o; }).slice(0, 100),
    status: STATUS_TL, kelola: punyaPeran(p, PERAN_PUB_UBAH) };
}
/** Tandai publikasi dibaca (bukti publikasi mudah diakses; hanya id, tanpa waktu). */
function aksiMutuBaca(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SAH);
  var x = semuaPub().filter(function (y) { return y.id === String(d.id || ""); })[0];
  if (!x || !pubTerlihat(p, x)) throw galat("Publikasi tidak ditemukan.");
  if (x.baca.indexOf(p.id) >= 0) return { baru: false };
  return kunciTulis(function () {
    var y = semuaPub().filter(function (z) { return z.id === x.id; })[0];
    if (y.baca.indexOf(p.id) < 0) { y.baca.push(p.id); ubah("PublikasiSurvei", y._r, { baca: JSON.stringify(y.baca.sort()) }); }
    return { baru: true };
  });
}
