/**
 * Pengesahan elektronik RPS dan kontrak kuliah (v0.54.0, keputusan pemilik 26 Nov 2026: "Kerjakan v0.54.0").
 * - RPS dan kontrak kuliah HANYA diunggah sebagai templat Word aplikasi yang sudah diisi (.docx berpenanda UPW-RPS v1 / UPW-KONTRAK v1), agar bisa
 *   diperiksa dan dibubuhi tanda tangan elektronik (QR) oleh aplikasi. PDF dan tautan tidak diterima lagi untuk kedua komponen ini (data lama tetap terbaca).
 * - Alur RPS: dosen pengampu utama mengajukan → KPS memeriksa → Ketua Jurusan mengesahkan.
 *   Alur kontrak: dosen pengampu utama mengajukan (memilih perwakilan mahasiswa kelas itu) → perwakilan mahasiswa menyetujui → KPS mengetahui.
 *   Setiap pihak bisa mengembalikan dengan catatan (status "revisi"); dosen mengajukan ulang (berkas sama) atau mengunggah Word baru (persetujuan lama gugur).
 * - Catatan di entri: entri.hash (SHA-256 berkas asli), entri.sah = { st, kode, ttd: {dosen|kps|kajur|mhs: {o, w}}, mhsId, baca: [userId], riw: [{a, o, w, c}] }.
 *   Berkas asli tidak diubah di Drive; versi bertanda tangan dibuat di browser saat diunduh (UPW_RPS.capSah) dan bisa diverifikasi lewat ?cek=SAH-….
 * - Dasar: UU ITE Ps. 11 dan PP 71/2019 (tanda tangan elektronik tidak tersertifikasi); SK Direktur/manual SPMI tidak mengatur bentuk tanda tangan dokumen internal prodi (pemilik).
 */
var KOMP_SAH = ["rps", "kontrak"];
var PENANDA_SAH = { rps: "UPW-RPS v1", kontrak: "UPW-KONTRAK v1" };
var ALUR_SAH = { rps: ["dosen", "kps", "kajur"], kontrak: ["dosen", "mhs", "kps"] };
var LABEL_SAH = { dosen: "Dosen pengampu", kps: "Koordinator Program Studi", kajur: "Ketua Jurusan", mhs: "Perwakilan mahasiswa" };
var LABEL_ST_SAH = { draf: "Belum diajukan", kps: "Menunggu pemeriksaan KPS", kajur: "Menunggu pengesahan Ketua Jurusan", mhs: "Menunggu persetujuan perwakilan mahasiswa",
  revisi: "Dikembalikan untuk revisi", sah: "Sah (bertanda tangan elektronik)" };

/** Pemeriksaan berkas Word saat diunggah: harus templat aplikasi untuk komponennya. Mengembalikan hash SHA-256 (hex). */
function periksaWordSah(komp, bytes, mime) {
  var penanda = PENANDA_SAH[komp], core = "";
  try {
    Utilities.unzip(Utilities.newBlob(bytes, mime, "dok.zip")).forEach(function (b) { if (b.getName() === "docProps/core.xml") core = b.getDataAsString(); });
  } catch (e) { throw galat("Berkas Word tidak bisa dibuka. Simpan ulang dari Microsoft Word sebagai .docx, lalu unggah lagi."); }
  if (core.indexOf(penanda) < 0) throw galat((komp === "rps" ? "RPS" : "Kontrak kuliah") + " harus memakai templat Word dari aplikasi (tombol Unduh templat " + (komp === "rps" ? "RPS" : "kontrak kuliah") + "), diisi, lalu diunggah dalam format .docx.");
  return hashHex(bytes);
}
function hashHex(bytes) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes).map(function (b) { var v = (b + 256) % 256; return (v < 16 ? "0" : "") + v.toString(16); }).join("");
}
function buatKodeSah() { var d = new Date(); return "SAH-" + String(d.getFullYear()).slice(2) + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + acak(8).toUpperCase().replace(/[^0-9A-F]/g, function () { return "ABCDEF0123456789".charAt(Math.floor(Math.random() * 16)); }); }
/** Semua wadah kelas yang memuat entri berkas yang sama (RPS bersama ditulis ke beberapa kelas). */
function entriSama(s, komp, fileId) {
  var h = []; Object.keys(s.kls || {}).forEach(function (k) { var e = s.kls[k][komp]; if (e && e.t === "file" && e.fileId === fileId) h.push(e); });
  return h;
}
function stSah(e) { return e && e.sah ? e.sah.st : (e && e.tpl ? "draf" : ""); }
/** Langkah berikutnya: peran yang menunggu, atau "" bila sah/draf/revisi. */
function giliranSah(komp, e) { var st = stSah(e); return ["kps", "kajur", "mhs"].indexOf(st) >= 0 ? st : ""; }
function bolehPutusSah(p, komp, e) {
  var g = giliranSah(komp, e);
  if (g === "kps") return punyaPeran(p, ["kps"]);
  if (g === "kajur") return punyaPeran(p, ["kajur"]);
  if (g === "mhs") return e.sah.mhsId === p.id;
  return false;
}
function sahKeKlien(e, idx) {
  if (!e || !e.sah) return e && e.tpl ? { st: "draf", label: LABEL_ST_SAH.draf, ttd: [] } : null;
  var s = e.sah, m = idx.byId[s.mhsId];
  return { st: s.st, label: LABEL_ST_SAH[s.st] || s.st, kode: s.kode, mhsId: s.mhsId || "", mhsNama: m ? m.nama : "", jumlahBaca: (s.baca || []).length,
    ttd: Object.keys(s.ttd || {}).map(function (k) { var o = idx.byId[s.ttd[k].o]; return { k: k, sebagai: LABEL_SAH[k], nama: o ? o.nama : "", nomor: o ? o.username : "", w: s.ttd[k].w }; }),
    riw: (s.riw || []).map(function (r) { var o = idx.byId[r.o]; return { a: r.a, oleh: o ? o.nama : "", w: r.w, c: r.c || "" }; }) };
}
/** Cari MK, unit, dan entri untuk aksi pengesahan (tanpa cek hak isi; hak dicek di masing-masing aksi). */
function konteksSah(d) {
  var smt = semesterSah(d.semester), kode = teks(d.kode), komp = String(d.komp || "");
  if (KOMP_SAH.indexOf(komp) < 0) throw galat("Dokumen ini tidak memakai pengesahan elektronik.");
  var x = mkBertim(smt).filter(function (y) { return y.mk.kode === kode; })[0];
  if (!x) throw galat("Mata kuliah ini belum punya tim pengajar pada " + labelSmt(smt) + ".");
  var k = String(d.kunci || "").toUpperCase(), u = unitKelas(x).filter(function (v) { return v.k === k; })[0];
  if (!u) throw galat("Kelas tidak dikenal untuk mata kuliah ini.");
  var r = semuaMkpSemester(smt)[kode], e = r ? isiUnit(r.isi, u)[komp] : null;
  if (!e || e.t !== "file" || !e.tpl) throw galat("Belum ada " + (komp === "rps" ? "RPS" : "kontrak kuliah") + " Word dari templat untuk kelas ini.");
  return { smt: smt, kode: kode, komp: komp, x: x, u: u, e: e };
}
function ubahSah(C, p, fn) {
  return ubahMkp(C.smt, C.kode, p, function (s) {
    var l = entriSama(s, C.komp, C.e.fileId); if (!l.length) throw galat("Dokumen berubah; muat ulang halaman.");
    var hasil; l.forEach(function (e, i) { var h = fn(e); if (i === 0) hasil = h; });
    return hasil;
  });
}
/** Peserta kelas (untuk memilih perwakilan dan hak baca kontrak). */
function pesertaUnit(C) {
  var ctx = konteksPeserta(C.smt), ps = pesertaMk(C.smt, C.x.mk, ctx), key = C.u.k;
  return (ps[key] ? ps[key].ids : []);
}

/* ---------- aksi ---------- */

/** Dosen pengampu utama mengajukan (atau mengajukan ulang setelah revisi). Kontrak: d.mhsId = perwakilan mahasiswa kelas itu. */
function aksiMkpSahAjukan(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["dosen"]);
  var C = konteksSah(d);
  ambilMkp(C.smt, C.kode, p, true);
  if (peranUnit(C.u, p.id) !== "utama") throw galat("Pengajuan dilakukan oleh pengampu utama kelas ini.");
  var st = stSah(C.e);
  if (st !== "draf" && st !== "revisi") throw galat("Dokumen ini sudah diajukan (" + (LABEL_ST_SAH[st] || st) + ").");
  var mhsId = "";
  if (C.komp === "kontrak") {
    mhsId = teks(d.mhsId);
    if (pesertaUnit(C).indexOf(mhsId) < 0) throw galat("Pilih perwakilan mahasiswa dari peserta kelas ini.");
  }
  var kini = new Date().toISOString();
  ubahSah(C, p, function (e) {
    var s = e.sah || { kode: buatKodeSah(), baca: [], riw: [] };
    s.ttd = { dosen: { o: p.id, w: kini } }; s.st = ALUR_SAH[C.komp][1]; if (mhsId) s.mhsId = mhsId;
    s.riw.push({ a: st === "revisi" ? "ajukan_ulang" : "ajukan", o: p.id, w: kini, c: teks(d.catatan).slice(0, 300) });
    e.sah = s;
  });
  catat(p.id, "sah.ajukan", { semester: C.smt, kode: C.kode, kunci: C.u.k, komp: C.komp });
  return aksiSahDaftar({}, token);
}
/** KPS / Ketua Jurusan / perwakilan mahasiswa: d.keputusan = "setuju" | "revisi" (catatan wajib). */
function aksiMkpSahPutus(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SAH);
  var C = konteksSah(d), g = giliranSah(C.komp, C.e), kep = String(d.keputusan || ""), cat = potong(d.catatan, 1000).trim();
  if (!g) throw galat("Dokumen ini tidak sedang menunggu persetujuan.");
  if (!bolehPutusSah(p, C.komp, C.e)) throw galat("Anda tidak memiliki izin untuk tahap ini (" + LABEL_ST_SAH[g] + ").");
  if (kep !== "setuju" && kep !== "revisi") throw galat("Keputusan tidak dikenal.");
  if (kep === "revisi" && cat.length < 5) throw galat("Tulis catatan revisi untuk dosen (minimal 5 huruf).");
  var alur = ALUR_SAH[C.komp], kini = new Date().toISOString();
  ubahSah(C, p, function (e) {
    var s = e.sah;
    if (kep === "revisi") { s.st = "revisi"; s.ttd = {}; }
    else { s.ttd[g] = { o: p.id, w: kini }; var i = alur.indexOf(g); s.st = i < alur.length - 1 ? alur[i + 1] : "sah"; }
    s.riw.push({ a: kep === "revisi" ? "revisi_" + g : "setuju_" + g, o: p.id, w: kini, c: cat });
  });
  catat(p.id, "sah.putus", { semester: C.smt, kode: C.kode, kunci: C.u.k, komp: C.komp, keputusan: kep, tahap: g });
  return aksiSahDaftar({}, token);
}
/** Mahasiswa peserta kelas menandai kontrak sudah dibaca (tidak menahan alur). */
function aksiMkpSahBaca(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["mahasiswa"]);
  var C = konteksSah(Object.assign({}, d, { komp: "kontrak" }));
  if (pesertaUnit(C).indexOf(p.id) < 0) throw galat("Anda bukan peserta kelas ini.");
  if (!C.e.sah || C.e.sah.st === "draf") throw galat("Kontrak belum diajukan dosen.");
  ubahSah(C, p, function (e) { if ((e.sah.baca || []).indexOf(p.id) < 0) (e.sah.baca = e.sah.baca || []).push(p.id); });
  return aksiSahDaftar({}, token);
}
/** Daftar dokumen yang relevan bagi pengguna: menunggu keputusan saya, kontrak kelas saya (mahasiswa), dan semua (pengelola, KPS, Kajur). */
function aksiSahDaftar(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SAH);
  return daftarSah(p);
}
function daftarSah(p) {
  var idx = indeksOrang(), smts = pilihanSemesterMkp().slice(0, 4).map(function (s) { return s.kode; }), hasil = [];
  var kelola = punyaPeran(p, ["kps", "admin", "superadmin", "gkm"]), kajur = punyaPeran(p, ["kajur"]), mhs = punyaPeran(p, ["mahasiswa"]);
  smts.forEach(function (smt) {
    var isi = semuaMkpSemester(smt), ctx = null, sudah = {};
    mkBertim(smt).forEach(function (x) {
      var r = isi[x.mk.kode]; if (!r) return;
      unitKelas(x).forEach(function (u) {
        var w = isiUnit(r.isi, u);
        KOMP_SAH.forEach(function (komp) {
          var e = w[komp]; if (!e || e.t !== "file" || !e.tpl) return;
          var kunciE = komp + "|" + e.fileId; if (komp === "rps" && sudah[kunciE]) return; sudah[kunciE] = 1;
          var peran = peranUnit(u, p.id), peserta = false;
          if (mhs && komp === "kontrak") { ctx = ctx || konteksPeserta(smt); var ps = pesertaMk(smt, x.mk, ctx); peserta = !!(ps[u.k] && ps[u.k].ids.indexOf(p.id) >= 0); }
          var giliran = bolehPutusSah(p, komp, e);
          var diajukan = !!(e.sah && e.sah.st !== "draf");
          if (!(kelola || peran || giliran || (peserta && diajukan) || (kajur && komp === "rps" && diajukan))) return;
          var o = { semester: smt, labelSemester: labelSmt(smt), kode: x.mk.kode, nama: x.mk.nama, kunci: u.k, label: labelUnit(x, u), komp: komp, nmBerkas: e.nama, ukuran: e.ukuran,
            w: e.w, oleh: (idx.byId[e.o] || {}).nama || "", sah: sahKeKlien(e, idx), giliran: giliran, peranTim: peran, bolehAjukan: peran === "utama" && smtTerbuka(smt) && ["draf", "revisi"].indexOf(stSah(e)) >= 0,
            sudahBaca: !!(e.sah && (e.sah.baca || []).indexOf(p.id) >= 0), peserta: peserta };
          if (komp === "kontrak" && o.bolehAjukan) o.pilihanMhs = pesertaUnit({ smt: smt, x: x, u: u }).map(function (id) { var m = idx.byId[id]; return { id: id, nama: m ? m.nama : "", nim: m ? m.username : "" }; }).sort(function (a, b) { return a.nama.localeCompare(b.nama); });
          hasil.push(o);
        });
      });
    });
  });
  hasil.sort(function (a, b) { return (b.giliran - a.giliran) || String(b.w).localeCompare(String(a.w)); });
  return { dokumen: hasil, labelSt: LABEL_ST_SAH, labelPeran: LABEL_SAH };
}
/** Ambil berkas Word asli + data penandatangan untuk dibubuhi tanda tangan di browser (atau dipratinjau). */
function aksiMkpSahBerkas(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SAH);
  var C = konteksSah(d), idx = indeksOrang();
  var boleh = !!peranUnit(C.u, p.id) || punyaPeran(p, ["kps", "kajur", "admin", "superadmin", "gkm"]) || (C.e.sah && C.e.sah.mhsId === p.id)
    || (C.komp === "kontrak" && punyaPeran(p, ["mahasiswa"]) && C.e.sah && C.e.sah.st !== "draf" && pesertaUnit(C).indexOf(p.id) >= 0)
    || (punyaPeran(p, ["asesor"]) && C.e.sah && C.e.sah.st === "sah");
  if (!boleh) throw galat("Anda tidak memiliki izin untuk membuka dokumen ini.");
  catatAsesor(p, "sahBerkas", { semester: C.smt, kode: C.kode, komp: C.komp });
  var b = DriveApp.getFileById(C.e.fileId).getBlob();
  return { nama: C.e.nama, mime: C.e.mime, isi: Utilities.base64Encode(b.getBytes()), sah: sahKeKlien(C.e, idx), hash: C.e.hash || "",
    judul: (C.komp === "rps" ? "Rencana Pembelajaran Semester " : "Kontrak Perkuliahan ") + C.x.mk.nama + " (" + C.x.mk.kode + "), " + labelUnit(C.x, C.u) + ", " + labelSmt(C.smt) };
}
/** Pengingat Beranda. */
function tugasSah(p) {
  if (!punyaPeran(p, ["kps", "kajur", "mahasiswa", "dosen"])) return {};
  var D = daftarSah(p).dokumen;
  return { sahGiliran: D.filter(function (x) { return x.giliran; }).map(function (x) { return { semester: x.semester, kode: x.kode, nama: x.nama, kunci: x.kunci, label: x.label, komp: x.komp, st: x.sah ? x.sah.st : "" }; }),
    sahRevisi: D.filter(function (x) { return x.peranTim === "utama" && x.sah && x.sah.st === "revisi"; }).map(function (x) { return { semester: x.semester, kode: x.kode, nama: x.nama, kunci: x.kunci, label: x.label, komp: x.komp }; }),
    kontrakBaca: D.filter(function (x) { return x.peserta && !x.sudahBaca && !x.giliran; }).length };
}
/** Verifikasi ?cek=SAH-…: siapa menyetujui apa, kapan, dan sidik berkas aslinya. */
function cekPengesahan(kode) {
  var idx = indeksOrang(), hasil = null;
  semua("PortofolioMk").some(function (r) {
    var s = isiMkpDari(r);
    return Object.keys(s.kls || {}).some(function (k) {
      return KOMP_SAH.some(function (komp) {
        var e = s.kls[k][komp]; if (!e || !e.sah || e.sah.kode !== kode) return false;
        var m = semuaMk().filter(function (x) { return x.kode === teks(r.kodeMk); })[0];
        hasil = { sah: e.sah.st === "sah", jenisSurat: "pengesahan", kode: kode, dokumen: komp === "rps" ? "Rencana Pembelajaran Semester (RPS)" : "Kontrak perkuliahan",
          judul: (m ? m.nama : teks(r.kodeMk)) + " (" + teks(r.kodeMk) + ")", kelas: k, semester: labelSmt(String(r.semester)), status: LABEL_ST_SAH[e.sah.st] || e.sah.st,
          hash: e.hash || "", berkas: e.nama, ttd: sahKeKlien(e, idx).ttd.map(function (t) { return { sebagai: t.sebagai, nama: t.nama, w: t.w }; }) };
        return true;
      });
    });
  });
  return hasil || { sah: false };
}
