/**
 * Gugus Kendali Mutu Program Studi (GKM) dan kesiapan akreditasi (v0.25.0).
 * - Peran "gkm": anggota GKM (diberikan Super Admin). GKM menilai butir rubrik di Penilaian, melihat Tabel iLKPS, Data Prodi, Bank Dokumen,
 *   DED, rekap portofolio MK, survei, dan sumber data; tanpa menghapus/mengubah data kegiatan.
 * - Laporan GKM per semester (satu laporan per semester, disusun bersama anggota GKM): monev pembelajaran, capaian, temuan, rekomendasi,
 *   tindak lanjut, dan lampiran. Draf → Dikirim (ke KPS) → Diterima | Perlu revisi. Batas bawaan: 14 hari setelah semester berakhir,
 *   bisa diubah Admin/Super Admin per semester (Pengaturan "batasLaporanGkm:<semester>").
 *   Dasar: Matriks butir 1 (SPMI: unsur pelaksana penjaminan mutu, siklus PPEPP, bukti efektivitas) dan butir pemantauan pembelajaran
 *   (monev periodik terhadap RPS, hasil terdokumentasi dan dipakai untuk perbaikan).
 * - Kesiapan akreditasi: ringkasan Penilaian untuk Beranda KPS, Admin Prodi, Super Admin, dan GKM.
 */
var PERAN_GKM_LIHAT = ["gkm", "kps", "admin", "superadmin"];
var BAGIAN_LAPORAN_GKM = [
  { k: "monev", l: "Hasil monitoring dan evaluasi pembelajaran", h: "Kesesuaian perkuliahan dengan RPS, kehadiran dosen dan mahasiswa, kelengkapan portofolio mata kuliah, hasil survei kepuasan mahasiswa." },
  { k: "capaian", l: "Capaian standar mutu dan indikator kinerja", h: "Capaian semester ini terhadap standar SPMI/indikator prodi, memakai data Penilaian dan Tabel iLKPS di aplikasi." },
  { k: "temuan", l: "Temuan dan analisis penyebab", h: "Ketidaksesuaian, butir penilaian yang lemah, data yang belum ada, beserta penyebabnya." },
  { k: "rekomendasi", l: "Rekomendasi perbaikan", h: "Tindakan pengendalian dan peningkatan, penanggung jawab, dan target waktu." },
  { k: "tindakLanjut", l: "Tindak lanjut rekomendasi semester sebelumnya", h: "Status setiap rekomendasi laporan sebelumnya: selesai, berjalan, atau belum, beserta alasannya." }];
var STATUS_LAPORAN_GKM = { belum: "Belum dibuat", draf: "Draf", dikirim: "Menunggu KPS", revisi: "Perlu revisi", diterima: "Diterima KPS" };
var LAMPIRAN_GKM_MAKS = 10 * 1024 * 1024, LAMPIRAN_GKM_JUMLAH = 15, BATAS_GKM_HARI = 14;
/** Butir Matriks yang memakai laporan GKM sebagai bukti: SPMI (1), PPEPP (2), laporan SPMI (4), monev pembelajaran (23), evaluasi kinerja (77). */
var BUTIR_LAPORAN_GKM = [1, 2, 4, 23, 77];
var EKS_GKM = ["pdf", "docx", "xlsx", "pptx", "jpg", "jpeg", "png"];

function smtValid(s) { return /^\d{4}-[12]$/.test(String(s || "")); }
function akhirSmt(kode) { var a = Number(kode.slice(0, 4)); return kode.slice(5) === "1" ? a + "-12-31" : (a + 1) + "-06-30"; }
function tambahHariTgl(s, n) { var d = new Date(s + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function smtSebelum(kode) { var a = Number(kode.slice(0, 4)); return kode.slice(5) === "1" ? (a - 1) + "-2" : a + "-1"; }
function batasLaporanGkm(kode) {
  var v = teks(pengaturan("batasLaporanGkm:" + kode, ""));
  return tanggalSah(v) ? v : tambahHariTgl(akhirSmt(kode), BATAS_GKM_HARI);
}
function laporanGkmDari(r) {
  if (!r) return null;
  return { _r: r, semester: teks(r.semester), bagian: jsonDari(r.bagian, {}), lampiran: jsonDari(r.lampiran, []), status: teks(r.status) || "draf",
    catatan: teks(r.catatan), riwayat: jsonDari(r.riwayat, []), diubah: r.diubah ? new Date(r.diubah).toISOString() : "",
    dikirimPada: r.dikirimPada ? new Date(r.dikirimPada).toISOString() : "", putusPada: r.putusPada ? new Date(r.putusPada).toISOString() : "" };
}
function ambilLaporanGkm(kode) { return laporanGkmDari(cari("LaporanGkm", function (x) { return teks(x.semester) === kode; })); }
function ringkasLaporanGkm(kode, kini) {
  var L = ambilLaporanGkm(kode), st = L ? L.status : "belum", b = batasLaporanGkm(kode);
  return { semester: kode, label: labelSmt(kode), status: st, statusLabel: STATUS_LAPORAN_GKM[st], batas: b,
    // "terlambat" hanya untuk semester berjalan dan satu semester sebelumnya (semester lama sebelum aplikasi dipakai tidak ditandai)
    terlambat: (st === "belum" || st === "draf" || st === "revisi") && (kini || hariIni()) > b && kode >= smtSebelum(semesterInfo().kode) };
}
function laporanKeKlien(L, kode, idx) {
  var nama = function (id) { var o = idx.byId[id]; return o ? o.nama : ""; };
  return { semester: kode, label: labelSmt(kode), batas: batasLaporanGkm(kode), status: L ? L.status : "belum",
    statusLabel: STATUS_LAPORAN_GKM[L ? L.status : "belum"], bagian: L ? L.bagian : {}, catatan: L ? L.catatan : "",
    lampiran: (L ? L.lampiran : []).map(function (x) { return { fileId: x.fileId, nama: x.nama, ukuran: x.ukuran, oleh: nama(x.o), waktu: x.w }; }),
    riwayat: (L ? L.riwayat : []).map(function (x) { return { waktu: x.w, oleh: nama(x.o), aksi: x.a, catatan: x.c || "" }; }),
    diubah: L ? L.diubah : "", dikirimPada: L ? L.dikirimPada : "", putusPada: L ? L.putusPada : "" };
}
function wajibGkmUbah(p, L) {
  wajibPeran(p, ["gkm"]);
  if (L && (L.status === "dikirim" || L.status === "diterima")) throw galat(L.status === "dikirim" ? "Laporan sudah dikirim ke KPS dan menunggu keputusan." : "Laporan sudah diterima KPS dan tidak bisa diubah.");
}
function simpanLaporanGkm(kode, L, ubahan) {
  var o = { semester: kode, bagian: JSON.stringify(ubahan.bagian || (L ? L.bagian : {})), lampiran: JSON.stringify(ubahan.lampiran || (L ? L.lampiran : [])),
    status: ubahan.status || (L ? L.status : "draf"), catatan: ubahan.catatan !== undefined ? ubahan.catatan : (L ? L.catatan : ""),
    riwayat: JSON.stringify(ubahan.riwayat || (L ? L.riwayat : [])), diubah: new Date() };
  if (ubahan.dikirimPada) o.dikirimPada = ubahan.dikirimPada;
  if (ubahan.putusPada) o.putusPada = ubahan.putusPada;
  if (L) ubah("LaporanGkm", L._r, o); else tambah("LaporanGkm", o);
}
function semesterDiminta(d) {
  var kini = semesterInfo().kode, s = d.semester ? String(d.semester) : kini;
  if (!smtValid(s)) throw galat("Semester tidak valid.");
  if (s > kini) throw galat("Laporan semester yang belum berjalan belum bisa dibuat.");
  return s;
}

/* ---------- aksi laporan ---------- */

function aksiGkmData(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_GKM_LIHAT);
  var kini = semesterInfo().kode, s = semesterDiminta(d), idx = indeksOrang(), daftar = [], k = kini;
  for (var i = 0; i < 6; i++) { daftar.push(ringkasLaporanGkm(k)); k = smtSebelum(k); }
  var L = ambilLaporanGkm(s);
  return { semesterKini: kini, daftar: daftar, laporan: laporanKeKlien(L, s, idx), bagianDef: BAGIAN_LAPORAN_GKM, status: STATUS_LAPORAN_GKM,
    bolehUbah: punyaPeran(p, ["gkm"]) && !(L && (L.status === "dikirim" || L.status === "diterima")),
    bolehPutus: punyaPeran(p, ["kps", "superadmin"]) && !!L && L.status === "dikirim",
    bolehBatas: punyaPeran(p, ["admin", "superadmin"]),
    sebelumnya: (function () { var q = ambilLaporanGkm(smtSebelum(s)); return q ? { label: labelSmt(smtSebelum(s)), rekomendasi: teks(q.bagian.rekomendasi), status: q.status } : null; })() };
}
function aksiGkmSimpan(d, token) {
  var p = penggunaDariToken(token), s = semesterDiminta(d), kirim = !!d.kirim;
  return kunciTulis(function () {
    var L = ambilLaporanGkm(s);
    wajibGkmUbah(p, L);
    var b = {}; BAGIAN_LAPORAN_GKM.forEach(function (x) { b[x.k] = potong((d.bagian || {})[x.k], 8000).trim(); });
    var rw = (L ? L.riwayat : []).slice(), kini = new Date(), u = { bagian: b, riwayat: rw };
    if (kirim) {
      var kosong = BAGIAN_LAPORAN_GKM.filter(function (x) { return b[x.k].length < 10; });
      if (kosong.length) throw galat("Lengkapi dulu bagian: " + kosong.map(function (x) { return x.l; }).join("; ") + " (minimal 10 huruf).");
      u.status = "dikirim"; u.dikirimPada = kini; u.catatan = "";
      rw.push({ w: kini.toISOString(), o: p.id, a: L && L.status === "revisi" ? "kirim_ulang" : "kirim" });
    } else {
      u.status = L ? L.status : "draf";
      if (!L) rw.push({ w: kini.toISOString(), o: p.id, a: "buat" });
    }
    simpanLaporanGkm(s, L, u);
    catat(p.id, kirim ? "gkm.kirim" : "gkm.simpan", { semester: s });
    return {};
  });
}
function aksiGkmUnggah(d, token) {
  var p = penggunaDariToken(token), s = semesterDiminta(d);
  var nama = namaAman(d.nama), eks = (nama.split(".").pop() || "").toLowerCase();
  if (EKS_GKM.indexOf(eks) < 0) throw galat("Lampiran berupa PDF, Word, Excel, PowerPoint, atau gambar (JPG/PNG).");
  var bytes = Utilities.base64Decode(teks(d.isi));
  if (!bytes.length) throw galat("Berkas kosong.");
  if (bytes.length > LAMPIRAN_GKM_MAKS) throw galat("Lampiran maksimal 10 MB.");
  if (!isiSesuai(eks, bytes)) throw galat("Isi berkas tidak sesuai dengan jenisnya (." + eks + ").");
  return kunciTulis(function () {
    var L = ambilLaporanGkm(s);
    wajibGkmUbah(p, L);
    var l = (L ? L.lampiran : []).slice();
    if (l.length >= LAMPIRAN_GKM_JUMLAH) throw galat("Maksimal " + LAMPIRAN_GKM_JUMLAH + " lampiran per laporan.");
    var induk = folderAnak(folderAnak(DriveApp.getFolderById(prop("FOLDER_ID")), "Laporan GKM"), s);
    var f = induk.createFile(Utilities.newBlob(bytes, BUKTI_EKS[eks], nama));
    l.push({ fileId: f.getId(), nama: nama, mime: BUKTI_EKS[eks], ukuran: bytes.length, o: p.id, w: new Date().toISOString() });
    simpanLaporanGkm(s, L, { lampiran: l, status: L ? L.status : "draf", riwayat: L ? L.riwayat : [{ w: new Date().toISOString(), o: p.id, a: "buat" }] });
    catat(p.id, "gkm.unggah", { semester: s, nama: nama });
    return {};
  });
}
function aksiGkmHapusLampiran(d, token) {
  var p = penggunaDariToken(token), s = semesterDiminta(d);
  return kunciTulis(function () {
    var L = ambilLaporanGkm(s);
    if (!L) throw galat("Laporan tidak ditemukan.");
    wajibGkmUbah(p, L);
    var x = L.lampiran.filter(function (a) { return a.fileId === teks(d.fileId); })[0];
    if (!x) throw galat("Lampiran tidak ditemukan.");
    try { DriveApp.getFileById(x.fileId).setTrashed(true); } catch (e) {}
    simpanLaporanGkm(s, L, { lampiran: L.lampiran.filter(function (a) { return a !== x; }) });
    catat(p.id, "gkm.hapusLampiran", { semester: s, nama: x.nama });
    return {};
  });
}
function aksiGkmLampiran(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_GKM_LIHAT);
  var L = ambilLaporanGkm(semesterDiminta(d)), x = L ? L.lampiran.filter(function (a) { return a.fileId === teks(d.fileId); })[0] : null;
  if (!x) throw galat("Lampiran tidak ditemukan.");
  return { nama: x.nama, mime: x.mime, isi: Utilities.base64Encode(DriveApp.getFileById(x.fileId).getBlob().getBytes()) };
}
function aksiGkmPutuskan(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["kps", "superadmin"]);
  var s = semesterDiminta(d), kep = String(d.keputusan || ""), cat = potong(d.catatan, 2000).trim();
  if (["diterima", "revisi"].indexOf(kep) < 0) throw galat("Keputusan tidak dikenal.");
  if (kep === "revisi" && cat.length < 5) throw galat("Tulis catatan perbaikan untuk GKM (minimal 5 huruf).");
  return kunciTulis(function () {
    var L = ambilLaporanGkm(s);
    if (!L || L.status !== "dikirim") throw galat("Laporan ini belum dikirim atau sudah diputuskan.");
    var rw = L.riwayat.slice(), kini = new Date();
    rw.push({ w: kini.toISOString(), o: p.id, a: kep, c: cat });
    simpanLaporanGkm(s, L, { status: kep, catatan: cat, riwayat: rw, putusPada: kini });
    catat(p.id, "gkm.putuskan", { semester: s, keputusan: kep });
    return {};
  });
}
function aksiGkmBatas(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["admin", "superadmin"]);
  var s = String(d.semester || ""), t = teks(d.tanggal);
  if (!smtValid(s)) throw galat("Semester tidak valid.");
  if (!tanggalSah(t)) throw galat("Isi tanggal batas (YYYY-MM-DD).");
  return kunciTulis(function () {
    var kunci = "batasLaporanGkm:" + s, r = cari("Pengaturan", function (x) { return x.kunci === kunci; });
    if (r) ubah("Pengaturan", r, { nilai: t }); else tambah("Pengaturan", { kunci: kunci, nilai: t, keterangan: "Batas pengumpulan Laporan GKM " + labelSmt(s) });
    catat(p.id, "gkm.batas", { semester: s, tanggal: t });
    return {};
  });
}

/** Pengingat GKM untuk Beranda (dipanggil dari tugas.saya). */
function tugasGkm(p) {
  var h = {};
  if (punyaPeran(p, ["gkm"])) {
    var ts = tsAwal(), skor = {};
    semua("SkorGpm").forEach(function (r) { if (Number(r.ts) === ts && r.skor !== "") skor[Number(r.butir)] = 1; });
    var belum = MATRIKS.filter(function (m) { return m.t !== "a" && !skor[m.n]; });
    var kini = hariIni(), s = semesterInfo().kode, l = [];
    [smtSebelum(s), s].forEach(function (k) {
      var r = ringkasLaporanGkm(k, kini), dekat = tambahHariTgl(akhirSmt(k), -30) <= kini;
      if (r.status === "revisi" || ((r.status === "belum" || r.status === "draf") && (k !== s || dekat))) l.push(r);
    });
    h.gkm = { ts: labelTa(ts), belumNilai: belum.length, laporan: l };
  }
  if (punyaPeran(p, ["kps", "superadmin"])) h.gkmTunggu = semua("LaporanGkm").filter(function (r) { return teks(r.status) === "dikirim"; }).map(function (r) { return { semester: teks(r.semester), label: labelSmt(teks(r.semester)) }; });
  return h;
}
/** Laporan GKM yang diterima pada rentang TS (bukti butir SPMI). */
function laporanGkmTs(ts) {
  return semua("LaporanGkm").filter(function (r) { var a = Number(String(r.semester).slice(0, 4)); return teks(r.status) === "diterima" && a >= ts - 2 && a <= ts; })
    .map(function (r) { return { semester: teks(r.semester), label: labelSmt(teks(r.semester)), putusPada: r.putusPada ? new Date(r.putusPada).toISOString().slice(0, 10) : "" }; })
    .sort(function (a, b) { return a.semester.localeCompare(b.semester); });
}

/* ---------- kesiapan akreditasi (Beranda) ---------- */

var LABEL_DATA_LAIN = { dosen: ["Biodata dosen dan Data Prodi › Data dosen TS", "dprodi"], mhs: ["Akun mahasiswa aktif (impor Admin Prodi)", "pengguna"],
  mk: ["Data Prodi › Kurikulum dan tim pengajar", "dprodi"], lulusan: ["Data Prodi › Lulusan (tracer study)", "dprodi"], pmb: ["Data Prodi › PMB", "dprodi"],
  dana: ["Data Prodi › Keuangan", "dprodi"], survei: ["Survei kepuasan (menu Survei)", "survei"] };
function saranData(m) {
  var l = [], fj = m.f ? F_JENIS[m.f] : null;
  if (fj === "*") l.push({ teks: "Catat kegiatan dan pilih pasal GCET yang diterapkan", menu: "kegiatan" });
  else if (fj) fj.forEach(function (k) { var j = jenisDef(k); l.push({ teks: "Catat kegiatan: " + (j ? j.l : k), menu: "kegiatan" }); });
  ((m.f && F_DATA[m.f]) || []).forEach(function (k) { var x = LABEL_DATA_LAIN[k]; if (x) l.push({ teks: "Isi " + x[0], menu: x[1] }); });
  if (m.t !== "a") {
    JENIS_KEG.forEach(function (j) { if (dedDariJenis(j).indexOf(Number(m.ded)) >= 0) l.push({ teks: "Catat kegiatan: " + j.l, menu: "kegiatan" }); });
    l.push({ teks: "Unggah dokumen di Bank Dokumen butir " + m.n, menu: "bank" });
  }
  return l;
}
function aksiKesiapanData(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_GKM_LIHAT);
  var ts = tsAwal(), X = konteksNilai(ts), H = hitungPenilaian(ts, X), M = {};
  MATRIKS.forEach(function (m) { M[m.n] = m; });
  var butir = function (r) { return { n: r.n, nm: r.nm, t: r.t, skor: r.skor, gain: r.gain, info: r.info, s4: r.s4, sr: r.sr, saran: saranData(M[r.n]) }; };
  var kosongT = Object.keys(X.T).map(function (k) { return X.T[k]; }).filter(function (t) {
    if (t.bentuk === "hitung") { var j = t.baris[t.baris.length - 1]; return !j || !Number(j[5]); }
    return !t.baris.length;
  }).map(function (t) { return { kode: t.kode, judul: t.judul }; });
  var bank = ringkasBank(), bankKosong = 0, bankTotal = 0;
  Object.keys(bank).forEach(function (n) { bankTotal += bank[n].n; bankKosong += bank[n].n - bank[n].ada; });
  var kini = semesterInfo().kode;
  return { ts: H.ts, total: H.total, target: H.target, belumGkm: H.belumGpm, kurangData: H.kurangData,
    prioritas: H.rows.filter(function (r) { return r.gain > 0.05; }).sort(function (a, b) { return b.gain - a.gain; }).slice(0, 5).map(butir),
    kurang: H.rows.filter(function (r) { return r.kurang; }).sort(function (a, b) { return b.w - a.w; }).map(butir),
    belum: H.rows.filter(function (r) { return r.perluGpm && r.gpm === null; }).sort(function (a, b) { return b.w - a.w; }).map(function (r) { return { n: r.n, nm: r.nm }; }),
    kriteria: H.kriteria.map(function (k) { return { l: k.l, persen: k.maks ? Math.round(k.nilai / k.maks * 100) : 0 }; }).sort(function (a, b) { return a.persen - b.persen; }).slice(0, 3),
    tabelKosong: kosongT, bankKosong: bankKosong, bankTotal: bankTotal,
    laporanGkm: [ringkasLaporanGkm(smtSebelum(kini)), ringkasLaporanGkm(kini)] };
}
