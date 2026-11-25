/**
 * Undangan rapat (v0.31.0). KPS menerbitkan undangan (surat PDF bertanda tangan + kode verifikasi "UND-…"); Admin Prodi dan GKM boleh menyiapkan draf.
 * Agenda bisa diambil dari poin tindak lanjut yang masih terbuka dan dari butir Matriks; jenis rapat terkait butir instrumen (JENIS_RAPAT).
 * Peserta: dosen/tendik/mahasiswa per orang, mahasiswa per kelas (angkatan-kelas), dan tamu luar (nama + instansi; cukup lewat PDF).
 * Peserta berakun mendapat notifikasi di Beranda dan menjawab Hadir / Tidak hadir (tabel PesertaRapat). Perubahan atau pembatalan setelah terbit
 * memunculkan notifikasi lagi.
 * v0.32.0 (Rilis 2): risalah per agenda (pembahasan + keputusan). Saat KPS memfinalkan risalah, setiap keputusan yang punya penanggung jawab menjadi poin
 * tindak lanjut (sumber "rapat"). Pindaian risalah bertanda tangan dan daftar hadir diunggah ke Drive "Rapat"; pindaian risalah otomatis disalin sebagai versi
 * baru di slot Bank Dokumen yang sesuai jenis rapat (SLOT_RISALAH). Asesor melihat rapat yang risalahnya sudah final (baca saja).
 */
var PERAN_RAPAT_KELOLA = ["kps", "gkm", "admin", "superadmin"];
var JENIS_RAPAT = [
  { k: "iab", l: "Rapat Industry Advisory Board", butir: [3] },
  { k: "rtm", l: "Rapat tinjauan manajemen (siklus PPEPP)", butir: [2] },
  { k: "kurikulum", l: "Evaluasi / lokakarya kurikulum", butir: [7] },
  { k: "rps", l: "Peninjauan RPS dan perangkat pembelajaran", butir: [8] },
  { k: "monev", l: "Monitoring dan evaluasi pembelajaran", butir: [22, 23] },
  { k: "survei", l: "Tindak lanjut hasil survei kepuasan", butir: [42, 71] },
  { k: "kinerja", l: "Evaluasi capaian kinerja", butir: [77] },
  { k: "tl", l: "Rapat tindak lanjut", butir: [] },
  { k: "prodi", l: "Rapat prodi", butir: [] }];
var STATUS_RAPAT = { draf: "Draf", terbit: "Terbit", batal: "Dibatalkan" };
/** Slot Bank Dokumen (kunci "butir-indeks", nomor Lampiran 1) untuk pindaian risalah per jenis rapat. */
var SLOT_RISALAH = { iab: "3-2", rtm: "2-2", kurikulum: "7-1", monev: "23-1", survei: "42-1" };
var EKS_RAPAT = ["pdf", "jpg", "jpeg", "png", "docx"], BERKAS_RAPAT_MAKS = 10 * 1024 * 1024;

function jenisRapatDef(k) { for (var i = 0; i < JENIS_RAPAT.length; i++) if (JENIS_RAPAT[i].k === k) return JENIS_RAPAT[i]; return null; }
function rapatDari(r) {
  return { _r: r, id: r.id, jenis: teks(r.jenis), judul: teks(r.judul), agenda: jsonDari(r.agenda, []), tgl: teksTgl(r.tgl), jamMulai: teks(r.jamMulai), jamSelesai: teks(r.jamSelesai),
    tempat: teks(r.tempat), tautan: teks(r.tautan), pengantar: teks(r.pengantar), nomor: teks(r.nomor), peserta: jsonDari(r.peserta, { u: [], kelas: [], tamu: [] }),
    status: teks(r.status) || "draf", kode: teks(r.kode), tglSurat: teksTgl(r.tglSurat), kpsId: teks(r.kpsId), lampiran: jsonDari(r.lampiran, null),
    riwayat: jsonDari(r.riwayat, []), oleh: teks(r.oleh), dibuat: r.dibuat ? new Date(r.dibuat).toISOString() : "",
    risalah: jsonDari(r.risalah, null), berkas: jsonDari(r.berkas, {}) || {} };
}
function risalahFinal(rp) { return !!(rp.risalah && rp.risalah.status === "final"); }
function semuaRapat() { return semua("Rapat").filter(function (r) { return !r.dihapus; }).map(rapatDari); }
function ambilRapat(id) {
  var r = cari("Rapat", function (x) { return x.id === String(id || "") && !x.dihapus; });
  if (!r) throw galat("Rapat tidak ditemukan.");
  return rapatDari(r);
}
/** userId peserta berakun (per orang + semua mahasiswa aktif di kelas yang dipilih). */
function pesertaRapatIds(rp, idx) {
  var ada = {}, l = [];
  (rp.peserta.u || []).forEach(function (id) { if (idx.byId[id] && idx.byId[id].jenis !== "lain" && !ada[id]) { ada[id] = 1; l.push(id); } });
  var kls = {}; (rp.peserta.kelas || []).forEach(function (k) { kls[k] = 1; });
  idx.mhs.forEach(function (m) { if (kls[kunciKelas(m)] && m.statusMhs === "A" && !ada[m.id]) { ada[m.id] = 1; l.push(m.id); } });
  return l;
}
function unsurOrang(o) {
  if (!o) return "";
  if (o.jenis === "mahasiswa") { var s = o.masuk ? semesterMhs(o.masuk) : ""; return "Mahasiswa" + (o.kelas ? " kelas " + o.kelas : "") + (s ? ", semester " + s : ""); }
  return o.jenis === "dosen" ? "Dosen" : "Tenaga kependidikan";
}
/** Lampiran beku saat terbit: daftar undangan (orang, kelompok kelas, tamu), KPS penanda tangan, tempat surat. */
function lampiranRapat(rp, idx, p) {
  var daftar = [], set = pengaturanSurat();
  (rp.peserta.u || []).forEach(function (id) { var o = idx.byId[id]; if (o && o.jenis !== "lain") daftar.push({ nama: o.nama, no: o.username, unsur: unsurOrang(o) }); });
  var kel = daftarKelas(idx);
  (rp.peserta.kelas || []).forEach(function (k) { var c = kel.filter(function (x) { return x.key === k; })[0]; if (c) daftar.push({ nama: "Mahasiswa angkatan " + c.masuk + " kelas " + c.kelas, no: "", unsur: c.n + " mahasiswa (semester " + c.semester + ")" }); });
  (rp.peserta.tamu || []).forEach(function (t) { daftar.push({ nama: t.nama, no: "", unsur: t.instansi || "Tamu" }); });
  var ttd = ttdAktif(p.id);
  return { daftar: daftar, kps: { nama: p.nama, nip: String(p.username) }, set: { tempat: set.tempat, unit: set.unit }, ttd: ttd ? ttd.id : "" };
}
function buatKodeUndangan() {
  var ada = {}; semua("Rapat").forEach(function (r) { if (r.kode) ada[r.kode] = 1; });
  var kode;
  do { kode = "UND-" + Utilities.formatDate(new Date(), "Asia/Makassar", "yyyyMM").slice(2) + "-" + Utilities.getUuid().replace(/-/g, "").slice(0, 8).toUpperCase(); } while (ada[kode]);
  return kode;
}
function pesertaRapatBaris(rapatId) { return semua("PesertaRapat").filter(function (x) { return x.rapatId === rapatId; }); }
/** Samakan baris PesertaRapat dengan daftar peserta: tambah yang baru, hapus yang dikeluarkan, tandai belum dibaca (notifikasi ulang). */
function sinkronPesertaRapat(rp, idx, tandaiUlang) {
  var ids = pesertaRapatIds(rp, idx), mau = {}; ids.forEach(function (id) { mau[id] = 1; });
  var lama = pesertaRapatBaris(rp.id), punya = {};
  lama.filter(function (x) { return !mau[x.userId]; }).sort(function (a, b) { return b._baris - a._baris; }).forEach(function (x) { hapusBaris("PesertaRapat", x); });
  lama.forEach(function (x) { punya[x.userId] = 1; });
  if (tandaiUlang) semua("PesertaRapat").filter(function (x) { return x.rapatId === rp.id && mau[x.userId] && x.dibaca; }).forEach(function (x) { ubah("PesertaRapat", x, { dibaca: "" }); });
  var baru = ids.filter(function (id) { return !punya[id]; }).map(function (id) { return { rapatId: rp.id, userId: id, jawab: "", alasan: "", waktu: "", dibaca: "" }; });
  if (baru.length) tambahBanyak("PesertaRapat", baru);
  return ids.length;
}
function rapatKeKlien(rp, p, idx, lengkap) {
  var kelola = punyaPeran(p, PERAN_RAPAT_KELOLA), j = jenisRapatDef(rp.jenis) || { l: rp.jenis, butir: [] };
  var baris = pesertaRapatBaris(rp.id), saya = baris.filter(function (x) { return x.userId === p.id; })[0];
  var o = { id: rp.id, jenis: rp.jenis, jenisL: j.l, butirJenis: j.butir, judul: rp.judul, tgl: rp.tgl, jamMulai: rp.jamMulai, jamSelesai: rp.jamSelesai, tempat: rp.tempat, tautan: rp.tautan,
    status: rp.status, statusL: STATUS_RAPAT[rp.status], kode: rp.kode, nomor: rp.nomor, tglSurat: rp.tglSurat, jumlahUndangan: baris.length + (rp.peserta.tamu || []).length,
    saya: saya ? { jawab: teks(saya.jawab), alasan: teks(saya.alasan), dibaca: !!saya.dibaca } : null,
    bolehUbah: kelola && (rp.status === "draf" || (rp.status === "terbit" && punyaPeran(p, ["kps"]) && !risalahFinal(rp))), bolehBatal: rp.status === "terbit" && punyaPeran(p, ["kps"]) && !risalahFinal(rp), bolehTerbit: punyaPeran(p, ["kps"]) && rp.status === "draf",
    risalahStatus: rp.risalah ? rp.risalah.status : "", slotBank: SLOT_RISALAH[rp.jenis] ? namaSlotRisalah(rp.jenis) : "" };
  if (lengkap) {
    o.agenda = rp.agenda; o.pengantar = rp.pengantar; o.lampiran = rp.lampiran;
    if (kelola || (rp.risalah && rp.risalah.status === "final")) o.risalah = rp.risalah;
    o.berkas = {}; ["risalah", "hadir"].forEach(function (k) { var b = rp.berkas[k]; if (b) o.berkas[k] = b.t === "tautan" ? { t: "tautan", url: b.url, w: b.w } : { t: "file", nama: b.nama, ukuran: b.ukuran, w: b.w }; });
    o.bolehRisalah = kelola && rp.status === "terbit" && (!rp.risalah || rp.risalah.status !== "final");
    o.bolehFinal = punyaPeran(p, ["kps"]) && rp.status === "terbit" && !!rp.risalah && rp.risalah.status !== "final";
    o.bolehUnggah = kelola && rp.status === "terbit";
    if (kelola) {
      o.peserta = rp.peserta;
      o.rekap = { hadir: 0, tidak: 0, belum: 0, daftar: baris.map(function (x) { var u = idx.byId[x.userId]; return { nama: u ? u.nama : "(akun nonaktif)", no: u ? u.username : "", unsur: unsurOrang(u), jawab: teks(x.jawab), alasan: teks(x.alasan) }; }) };
      o.pegawai = idx.pegawai.map(function (q) { return { id: q.id, nama: q.nama, jenis: q.jenis }; }).sort(function (a, b) { return a.nama.localeCompare(b.nama); });
      o.rekap.daftar.forEach(function (x) { o.rekap[x.jawab === "hadir" ? "hadir" : x.jawab === "tidak" ? "tidak" : "belum"]++; });
      o.riwayat = rp.riwayat.map(function (h) { var x = idx.byId[h.o]; return { w: h.w, a: h.a, c: h.c || "", oleh: x ? x.nama : "" }; });
    }
  }
  return o;
}
function bolehLihatRapat(p, rp) {
  if (punyaPeran(p, PERAN_RAPAT_KELOLA)) return true;
  if (punyaPeran(p, ["asesor"]) && rp.risalah && rp.risalah.status === "final") return true;
  return rp.status !== "draf" && pesertaRapatBaris(rp.id).some(function (x) { return x.userId === p.id; });
}
/** Notifikasi undangan di Beranda (dipanggil dari aksiTugasSaya). */
function tugasRapat(p) {
  var kini = hariIni(), rapat = {};
  semuaRapat().forEach(function (r) { rapat[r.id] = r; });
  var l = semua("PesertaRapat").filter(function (x) { return x.userId === p.id; }).map(function (x) {
    var r = rapat[x.rapatId]; if (!r || r.status === "draf" || r.tgl < kini) return null;
    if (r.status === "batal" && x.dibaca) return null;
    if (r.status === "terbit" && teks(x.jawab) && x.dibaca) return null;
    return { id: r.id, judul: r.judul, tgl: r.tgl, jamMulai: r.jamMulai, tempat: r.tempat, tautan: r.tautan, status: r.status, jawab: teks(x.jawab), diperbarui: !x.dibaca && !!teks(x.jawab) };
  }).filter(Boolean);
  return { undangan: l };
}
function catatRiwayatRapat(rp, p, a, c) { rp.riwayat.push({ w: new Date().toISOString(), o: p.id, a: a, c: c || "" }); }

/* ---------- aksi ---------- */

function aksiRapatRef(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_RAPAT_KELOLA);
  var idx = indeksOrang();
  return { jenis: JENIS_RAPAT, kelas: daftarKelas(idx), hariIni: hariIni(), bolehTerbit: punyaPeran(p, ["kps"]),
    pegawai: idx.pegawai.map(function (o) { return { id: o.id, nama: o.nama, no: o.username, jenis: o.jenis, inisial: o.inisial }; }).sort(function (a, b) { return a.nama.localeCompare(b.nama); }),
    mhs: idx.mhs.filter(function (m) { return m.statusMhs === "A"; }).map(function (m) { return { id: m.id, nama: m.nama, no: m.username, kelas: m.masuk ? kunciKelas(m) : "" }; }).sort(function (a, b) { return a.nama.localeCompare(b.nama); }),
    tlTerbuka: semuaTl().filter(function (t) { return t.status !== "terverifikasi"; }).map(function (t) { return { id: t.id, uraian: t.uraian, butir: t.butir, status: t.status }; }),
    butir: MATRIKS.map(function (m) { return { n: m.n, nm: m.nm, s4: m.s4 }; }) };
}
function aksiRapatDaftar(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SAH);
  var idx = indeksOrang();
  var l = semuaRapat().filter(function (r) { return bolehLihatRapat(p, r); }).map(function (r) { return rapatKeKlien(r, p, idx, false); });
  l.sort(function (a, b) { return String(b.tgl || "").localeCompare(String(a.tgl || "")) || b.id.localeCompare(a.id); });
  return { rapat: l, kelola: punyaPeran(p, PERAN_RAPAT_KELOLA), hariIni: hariIni() };
}
function aksiRapatDetail(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SAH);
  var rp = ambilRapat(d.id);
  if (!bolehLihatRapat(p, rp)) throw galat("Anda tidak memiliki izin untuk melihat rapat ini.");
  return { rapat: rapatKeKlien(rp, p, indeksOrang(), true) };
}
function bersihRapat(x, idx) {
  var j = jenisRapatDef(x.jenis);
  if (!j) throw galat("Pilih jenis rapat.");
  var tlAda = {}, svAda = {}; semuaTl().forEach(function (t) { tlAda[t.id] = 1; }); semuaSurvei().forEach(function (s) { svAda[s.id] = 1; });
  var o = { jenis: j.k, judul: potong(x.judul, 200).trim(), tgl: teks(x.tgl).trim(), jamMulai: teks(x.jamMulai).trim(), jamSelesai: teks(x.jamSelesai).trim(),
    tempat: potong(x.tempat, 200).trim(), tautan: teks(x.tautan).trim(), pengantar: potong(x.pengantar, 1000).trim(), nomor: potong(x.nomor, 100).trim() };
  if (!o.judul) throw galat("Tulis nama/judul rapat.");
  if (o.tgl && !tanggalSah(o.tgl)) throw galat("Tanggal rapat tidak valid.");
  [o.jamMulai, o.jamSelesai].forEach(function (v) { if (v && !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) throw galat("Jam ditulis HH:MM, misalnya 09:00."); });
  if (o.jamMulai && o.jamSelesai && o.jamSelesai <= o.jamMulai) throw galat("Jam selesai harus setelah jam mulai.");
  if (o.tautan && (!/^https:\/\/[^\s<>"]+$/.test(o.tautan) || o.tautan.length > 500)) throw galat("Tautan rapat daring harus diawali https:// dan tanpa spasi.");
  o.agenda = (Array.isArray(x.agenda) ? x.agenda : []).map(function (a) {
    return { t: potong(a && a.t, 600).trim(), butir: bersihButir(a && a.butir), tl: a && tlAda[a.tl] ? String(a.tl) : "", sv: a && svAda[a.sv] ? String(a.sv) : "" };
  }).filter(function (a) { return a.t; }).slice(0, 30);
  var pz = x.peserta || {}, kel = {}; daftarKelas(idx).forEach(function (c) { kel[c.key] = 1; });
  o.peserta = {
    u: (Array.isArray(pz.u) ? pz.u : []).map(String).filter(function (id, i, l) { var q = idx.byId[id]; return q && q.jenis !== "lain" && l.indexOf(id) === i; }).slice(0, 500),
    kelas: (Array.isArray(pz.kelas) ? pz.kelas : []).map(String).filter(function (k, i, l) { return kel[k] && l.indexOf(k) === i; }),
    tamu: (Array.isArray(pz.tamu) ? pz.tamu : []).map(function (t) { return { nama: potong(t && t.nama, 150).trim(), instansi: potong(t && t.instansi, 150).trim() }; }).filter(function (t) { return t.nama; }).slice(0, 100)
  };
  return o;
}
function wajibLengkapRapat(o) {
  if (!o.tgl) throw galat("Isi tanggal rapat.");
  if (!o.jamMulai) throw galat("Isi jam mulai rapat.");
  if (!o.tempat && !o.tautan) throw galat("Isi tempat rapat atau tautan rapat daring.");
  if (!o.agenda.length) throw galat("Tambahkan minimal satu agenda.");
  if (!o.peserta.u.length && !o.peserta.kelas.length && !o.peserta.tamu.length) throw galat("Pilih peserta yang diundang.");
}
function barisRapat(o) {
  return { jenis: o.jenis, judul: o.judul, agenda: JSON.stringify(o.agenda), tgl: o.tgl, jamMulai: o.jamMulai, jamSelesai: o.jamSelesai, tempat: o.tempat, tautan: o.tautan,
    pengantar: o.pengantar, nomor: o.nomor, peserta: JSON.stringify(o.peserta) };
}
/** Simpan draf (KPS, Admin Prodi, GKM, Super Admin) atau ubah undangan yang sudah terbit (hanya KPS; surat diperbarui, peserta diberi tahu). */
function aksiRapatSimpan(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_RAPAT_KELOLA);
  var idx = indeksOrang(), x = d.data || {}, o = bersihRapat(x, idx);
  return kunciTulis(function () {
    var kini = new Date();
    if (!x.id) {
      var id = "rp" + acak(10);
      tambah("Rapat", Object.assign(barisRapat(o), { id: id, status: "draf", riwayat: JSON.stringify([{ w: kini.toISOString(), o: p.id, a: "buat", c: "" }]), oleh: p.id, dibuat: kini, diubah: kini, dihapus: "" }));
      catat(p.id, "rapat.buat", { id: id });
      return { id: id };
    }
    var rp = ambilRapat(x.id);
    if (rp.status === "batal") throw galat("Rapat yang dibatalkan tidak bisa diubah.");
    if (rp.status === "terbit" && !punyaPeran(p, ["kps"])) throw galat("Undangan yang sudah terbit hanya bisa diubah KPS.");
    if (risalahFinal(rp)) throw galat("Risalah rapat ini sudah final; undangan tidak bisa diubah lagi.");
    var ubahan = barisRapat(o);
    if (rp.status === "terbit") {
      wajibLengkapRapat(o);
      Object.assign(rp, o);
      ubahan.lampiran = JSON.stringify(Object.assign(lampiranRapat(rp, idx, p), { diperbarui: hariIni() }));
      catatRiwayatRapat(rp, p, "ubah_terbit", potong(d.alasan, 300));
      ubahan.kpsId = p.id;
    } else catatRiwayatRapat(rp, p, "ubah", "");
    ubah("Rapat", rp._r, Object.assign(ubahan, { riwayat: JSON.stringify(rp.riwayat), diubah: kini }));
    if (rp.status === "terbit") sinkronPesertaRapat(ambilRapat(rp.id), idx, true);
    catat(p.id, "rapat.ubah", { id: rp.id, status: rp.status });
    return { id: rp.id };
  });
}
function aksiRapatTerbit(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["kps"]);
  var idx = indeksOrang();
  return kunciTulis(function () {
    var rp = ambilRapat(d.id);
    if (rp.status !== "draf") throw galat("Undangan ini sudah " + STATUS_RAPAT[rp.status].toLowerCase() + ".");
    wajibLengkapRapat(rp);
    if (rp.tgl < hariIni()) throw galat("Tanggal rapat sudah lewat. Ubah tanggalnya dulu.");
    catatRiwayatRapat(rp, p, "terbit", "");
    ubah("Rapat", rp._r, { status: "terbit", kode: buatKodeUndangan(), tglSurat: hariIni(), kpsId: p.id, lampiran: JSON.stringify(lampiranRapat(rp, idx, p)),
      riwayat: JSON.stringify(rp.riwayat), diubah: new Date() });
    var n = sinkronPesertaRapat(ambilRapat(rp.id), idx, false);
    catat(p.id, "rapat.terbit", { id: rp.id, peserta: n });
    return { id: rp.id, peserta: n };
  });
}
function aksiRapatBatal(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["kps"]);
  var alasan = potong(d.alasan, 500).trim();
  if (alasan.length < 5) throw galat("Tulis alasan pembatalan (minimal 5 huruf).");
  return kunciTulis(function () {
    var rp = ambilRapat(d.id);
    if (rp.status !== "terbit") throw galat("Hanya undangan yang sudah terbit yang bisa dibatalkan.");
    if (risalahFinal(rp)) throw galat("Rapat ini sudah berlangsung dan risalahnya final; tidak bisa dibatalkan.");
    catatRiwayatRapat(rp, p, "batal", alasan);
    ubah("Rapat", rp._r, { status: "batal", riwayat: JSON.stringify(rp.riwayat), diubah: new Date() });
    semua("PesertaRapat").filter(function (x) { return x.rapatId === rp.id && x.dibaca; }).forEach(function (x) { ubah("PesertaRapat", x, { dibaca: "" }); });
    catat(p.id, "rapat.batal", { id: rp.id });
    return {};
  });
}
function aksiRapatHapus(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_RAPAT_KELOLA);
  return kunciTulis(function () {
    var rp = ambilRapat(d.id);
    if (rp.status !== "draf") throw galat("Hanya draf yang bisa dihapus. Undangan yang sudah terbit bisa dibatalkan KPS.");
    ubah("Rapat", rp._r, { dihapus: new Date() });
    catat(p.id, "rapat.hapus", { id: rp.id });
    return {};
  });
}
/** Peserta menjawab undangan: hadir / tidak (alasan wajib bila tidak). */
function aksiRapatJawab(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SAH);
  var jawab = String(d.jawab || ""), alasan = potong(d.alasan, 300).trim();
  if (["hadir", "tidak"].indexOf(jawab) < 0) throw galat("Pilih Hadir atau Tidak hadir.");
  if (jawab === "tidak" && alasan.length < 3) throw galat("Tulis alasan tidak hadir.");
  return kunciTulis(function () {
    var rp = ambilRapat(d.id);
    if (rp.status !== "terbit") throw galat("Undangan ini " + (rp.status === "batal" ? "sudah dibatalkan." : "belum terbit."));
    if (rp.tgl < hariIni()) throw galat("Rapat ini sudah lewat.");
    var x = semua("PesertaRapat").filter(function (y) { return y.rapatId === rp.id && y.userId === p.id; })[0];
    if (!x) throw galat("Anda tidak termasuk peserta undangan ini.");
    ubah("PesertaRapat", x, { jawab: jawab, alasan: jawab === "tidak" ? alasan : "", waktu: new Date(), dibaca: new Date() });
    catat(p.id, "rapat.jawab", { id: rp.id, jawab: jawab });
    return {};
  });
}
/** Tandai pemberitahuan (pembatalan/perubahan) sudah dibaca. */
function aksiRapatBaca(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SAH);
  return kunciTulis(function () {
    var x = semua("PesertaRapat").filter(function (y) { return y.rapatId === String(d.id || "") && y.userId === p.id; })[0];
    if (x) ubah("PesertaRapat", x, { dibaca: new Date() });
    return {};
  });
}
function aksiRapatTtd(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SAH);
  var rp = ambilRapat(d.id);
  if (!bolehLihatRapat(p, rp)) throw galat("Anda tidak memiliki izin untuk melihat surat ini.");
  if (rp.status === "draf" || !rp.lampiran || !rp.lampiran.ttd) return { gambar: "" };
  var r = cari("TandaTangan", function (x) { return x.id === rp.lampiran.ttd; });
  return { gambar: r ? bacaTtd(r) : "" };
}
/** Bagian aksiSuratCek untuk kode undangan "UND-…" (tanpa login; data umum saja, tanpa daftar nama). */
function cekUndangan(kode) {
  var r = cari("Rapat", function (x) { return x.kode === kode && !x.dihapus; });
  if (!r) return { sah: false };
  var rp = rapatDari(r), l = rp.lampiran || {};
  return { sah: rp.status !== "draf", jenisSurat: "undangan", batal: rp.status === "batal", kode: kode, judul: rp.judul, tgl: rp.tgl, sampai: rp.tgl, tempat: rp.tempat || "Daring",
    tglSurat: rp.tglSurat, kps: l.kps ? l.kps.nama : "", jumlahUndangan: (l.daftar || []).length };
}

/* ---------- Rilis 2 (v0.32.0): risalah, pindaian, Bank Dokumen ---------- */

function namaSlotRisalah(jenis) {
  var k = SLOT_RISALAH[jenis]; if (!k) return "";
  var a = k.split("-"); return "Butir " + a[0] + ": " + ((SLOT_BANK[a[0]] || [])[Number(a[1])] || "");
}
function bersihRisalah(x, rp, idx) {
  x = x || {};
  var jam = function (v) { v = teks(v).trim(); if (v && !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) throw galat("Jam ditulis HH:MM, misalnya 09:00."); return v; };
  var ag = Array.isArray(x.agenda) ? x.agenda : [];
  var o = { pimpinan: potong(x.pimpinan, 150).trim(), notulis: potong(x.notulis, 150).trim(), mulai: jam(x.mulai), selesai: jam(x.selesai),
    jumlahHadir: x.jumlahHadir === "" || x.jumlahHadir === undefined || x.jumlahHadir === null ? "" : Math.max(0, Math.min(2000, Math.round(Number(x.jumlahHadir) || 0))),
    lain: potong(x.lain, 3000).trim(),
    agenda: rp.agenda.map(function (a, i) {
      var g = ag[i] || {};
      return { pembahasan: potong(g.pembahasan, 5000).trim(), keputusan: (Array.isArray(g.keputusan) ? g.keputusan : []).map(function (k) {
        var pj = teks(k && k.pj), tg = teks(k && k.tenggat).trim();
        if (pj && (!idx.byId[pj] || ["dosen", "tendik"].indexOf(idx.byId[pj].jenis) < 0)) throw galat("Penanggung jawab keputusan harus dosen/tendik.");
        if (tg && !tanggalSah(tg)) throw galat("Tenggat keputusan tidak valid (YYYY-MM-DD).");
        return { t: potong(k && k.t, 1000).trim(), pj: pj, tenggat: tg, butir: bersihButir(k && k.butir), tl: "", pub: !!(k && k.pub) };
      }).filter(function (k) { return k.t; }).slice(0, 20) };
    }) };
  return o;
}
/** Simpan draf risalah (KPS, Admin Prodi, GKM, Super Admin; notulis bisa siapa saja di antara mereka). */
function aksiRapatRisalahSimpan(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_RAPAT_KELOLA);
  var idx = indeksOrang();
  return kunciTulis(function () {
    var rp = ambilRapat(d.id);
    if (rp.status !== "terbit") throw galat("Risalah hanya untuk rapat yang undangannya sudah terbit (bukan draf/batal).");
    if (rp.risalah && rp.risalah.status === "final") throw galat("Risalah sudah final dan tidak bisa diubah.");
    var o = bersihRisalah(d.risalah, rp, idx);
    o.status = "draf"; o.oleh = p.id; o.diubah = new Date().toISOString();
    ubah("Rapat", rp._r, { risalah: JSON.stringify(o), diubah: new Date() });
    catat(p.id, "rapat.risalah", { id: rp.id });
    return { risalah: o };
  });
}
/** KPS memfinalkan risalah: keputusan berpenanggung jawab menjadi poin tindak lanjut (sumber rapat). Rapat harus sudah berlangsung. */
function aksiRapatRisalahFinal(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["kps"]);
  var idx = indeksOrang();
  return kunciTulis(function () {
    var rp = ambilRapat(d.id), r = rp.risalah;
    if (rp.status !== "terbit") throw galat("Risalah hanya untuk rapat yang undangannya sudah terbit.");
    if (!r) throw galat("Simpan risalah lebih dulu.");
    if (r.status === "final") throw galat("Risalah sudah final.");
    if (rp.tgl > hariIni()) throw galat("Rapat belum berlangsung. Risalah bisa difinalkan pada atau setelah tanggal rapat.");
    if (!r.pimpinan || !r.notulis) throw galat("Isi pimpinan rapat dan notulis.");
    if (!r.agenda.some(function (a) { return a.pembahasan; })) throw galat("Isi pembahasan minimal satu agenda.");
    var kini = new Date(), baru = [], ref = potong(rp.judul + " (" + rp.tgl + ")", 100);
    r.agenda.forEach(function (a, i) {
      a.keputusan.forEach(function (k) {
        if (!k.pj) return;
        var id = "tl" + acak(10);
        baru.push({ id: id, uraian: k.t, butir: JSON.stringify(k.butir.length ? k.butir : bersihButir((rp.agenda[i] || {}).butir)), sumber: "rapat", sumberRef: ref, pj: k.pj, tenggat: k.tenggat,
          status: "belum", bukti: "", catatan: "", riwayat: JSON.stringify([{ w: kini.toISOString(), o: p.id, a: "buat", c: "Keputusan rapat " + ref }]), oleh: p.id, dibuat: kini, diubah: kini, dihapus: "" });
        k.tl = id;
      });
    });
    if (baru.length) tambahBanyak("TindakLanjut", baru);
    r.status = "final"; r.finalOleh = p.id; r.finalPada = kini.toISOString();
    catatRiwayatRapat(rp, p, "risalah_final", baru.length + " keputusan menjadi tindak lanjut");
    ubah("Rapat", rp._r, { risalah: JSON.stringify(r), riwayat: JSON.stringify(rp.riwayat), diubah: kini });
    catat(p.id, "rapat.risalahFinal", { id: rp.id, tl: baru.length });
    return { tindakLanjut: baru.length };
  });
}
/** Unggah pindaian: jenis "risalah" (risalah bertanda tangan; hanya setelah final; disalin ke Bank Dokumen bila ada slotnya) atau "hadir" (daftar hadir). */
function aksiRapatBerkas(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_RAPAT_KELOLA);
  var jenis = String(d.jenis || "");
  if (["risalah", "hadir"].indexOf(jenis) < 0) throw galat("Jenis berkas tidak dikenal.");
  var rp0 = ambilRapat(d.id);
  if (rp0.status !== "terbit") throw galat("Berkas hanya untuk rapat yang undangannya sudah terbit.");
  if (jenis === "risalah" && !(rp0.risalah && rp0.risalah.status === "final")) throw galat("Finalkan risalah lebih dulu, lalu unggah pindaian yang sudah ditandatangani.");
  var w = new Date().toISOString(), entri, file = null, salinan = null;
  if (d.tautan) {
    var url = teks(d.tautan).trim();
    if (!/^https:\/\/[^\s<>"]+$/.test(url) || url.length > 500) throw galat("Tautan harus diawali https:// dan tanpa spasi.");
    entri = { t: "tautan", url: url, o: p.id, w: w };
  } else if (d.berkas && d.berkas.isi) {
    var nama = namaAman(d.berkas.nama), eks = (nama.split(".").pop() || "").toLowerCase();
    if (EKS_RAPAT.indexOf(eks) < 0) throw galat("Berkas berupa PDF, gambar (JPG/PNG), atau Word.");
    var bytes = Utilities.base64Decode(teks(d.berkas.isi));
    if (bytes.length > BERKAS_RAPAT_MAKS) throw galat("Berkas maksimal 10 MB. Untuk berkas besar, pakai tautan Google Drive.");
    if (!isiSesuai(eks, bytes)) throw galat("Isi berkas tidak sesuai dengan jenisnya (." + eks + ").");
    var folder = folderAnak(folderAnak(DriveApp.getFolderById(prop("FOLDER_ID")), "Rapat"), namaAman(rp0.tgl + " " + rp0.judul).slice(0, 100));
    file = folder.createFile(Utilities.newBlob(bytes, BUKTI_EKS[eks], (jenis === "risalah" ? "Risalah" : "Daftar hadir") + " - " + nama));
    entri = { t: "file", fileId: file.getId(), nama: nama, mime: BUKTI_EKS[eks], ukuran: bytes.length, o: p.id, w: w };
  } else throw galat("Pilih berkas atau isi tautan.");
  try {
    var hasil = kunciTulis(function () {
      var rp = ambilRapat(rp0.id), lama = rp.berkas[jenis];
      rp.berkas[jenis] = entri;
      ubah("Rapat", rp._r, { berkas: JSON.stringify(rp.berkas), diubah: new Date() });
      if (lama && lama.t === "file") try { DriveApp.getFileById(lama.fileId).setTrashed(true); } catch (e) {}
      var bank = "";
      if (jenis === "risalah" && SLOT_RISALAH[rp.jenis]) {
        var s = ambilSlot(SLOT_RISALAH[rp.jenis]), ve = { id: Utilities.getUuid().slice(0, 8), berlaku: "", ket: potong("Risalah " + rp.judul + " (" + rp.tgl + "), otomatis dari menu Rapat", 200), o: p.id, w: w, rapat: rp.id };
        if (entri.t === "file") {
          salinan = DriveApp.getFileById(entri.fileId).makeCopy(namaAman(s.nama.slice(0, 60) + " - " + entri.nama), folderBank(s.butir));
          Object.assign(ve, { t: "file", fileId: salinan.getId(), nama: entri.nama, mime: entri.mime, ukuran: entri.ukuran });
        } else Object.assign(ve, { t: "tautan", url: entri.url });
        if (s.versi.length < 20) { s.versi.push(ve); simpanSlot(s, {}, p); bank = namaSlotRisalah(rp.jenis); }
      }
      catat(p.id, "rapat.berkas", { id: rp.id, jenis: jenis, bank: bank });
      return { bank: bank };
    });
    return hasil;
  } catch (e) { if (file) try { file.setTrashed(true); } catch (_) {} if (salinan) try { salinan.setTrashed(true); } catch (_) {} throw e; }
}
function aksiRapatBerkasLihat(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SAH);
  var rp = ambilRapat(d.id), b = rp.berkas[String(d.jenis || "")];
  if (!punyaPeran(p, PERAN_RAPAT_KELOLA) && !(punyaPeran(p, ["asesor"]) && rp.risalah && rp.risalah.status === "final")) throw galat("Anda tidak memiliki izin untuk melihat berkas ini.");
  if (!b || b.t !== "file") throw galat("Berkas tidak ditemukan.");
  if (typeof catatAsesor === "function") catatAsesor(p, "rapat.berkas", { id: rp.id, jenis: d.jenis });
  return { nama: b.nama, mime: b.mime, isi: Utilities.base64Encode(DriveApp.getFileById(b.fileId).getBlob().getBytes()) };
}
