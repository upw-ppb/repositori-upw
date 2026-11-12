/**
 * Dokumen Evaluasi Diri (DED) (v0.13.0): narasi 64 butir, identitas pengusul, daftar PS di UPPS, dan tim penyusun.
 * - Admin Prodi / KPS / Super Admin mengelola semua butir dan menunjuk penanggung jawab (PJ).
 * - Dosen yang ditunjuk sebagai PJ dapat menulis butirnya sendiri (menu DED tampil bila ada butir untuknya).
 * - Penyimpanan narasi memeriksa versi: bila butir sudah diubah orang lain sejak dibuka, simpan ditolak agar tidak saling menimpa.
 * - Ekspor Word dibuat di tampilan (docx) dari data ini + Tabel iLKPS.
 */
var PERAN_DED = ["admin", "superadmin", "kps"];
var STATUS_DED = ["belum", "draf", "selesai"];
var IDENTITAS_DED = [
  ["pt", "Perguruan Tinggi", "Politeknik Pariwisata Bali"], ["upps", "Unit Pengelola Program Studi", ""], ["jenis", "Jenis Program", "Sarjana Terapan"],
  ["ps", "Nama Program Studi", "Usaha Perjalanan Wisata"], ["alamat", "Alamat", ""], ["telepon", "Nomor Telepon", ""], ["email", "E-Mail dan Website", ""],
  ["skPt", "Nomor SK Pendirian PT", ""], ["tglSkPt", "Tanggal SK Pendirian PT", ""], ["pejabatSkPt", "Pejabat Penandatangan SK Pendirian PT", ""],
  ["skPs", "Nomor SK Pembukaan PS", ""], ["tglSkPs", "Tanggal SK Pembukaan PS", ""], ["pejabatSkPs", "Pejabat Penandatangan SK Pembukaan PS", ""],
  ["tahunPertama", "Tahun Pertama Kali Menerima Mahasiswa", ""], ["peringkat", "Peringkat Terbaru Akreditasi PS", ""], ["skAkreditasi", "Nomor SK BAN-PT/LAM", ""],
  ["kota", "Nama kota kedudukan PT (halaman muka)", "Badung"], ["tahun", "Tahun (halaman muka)", ""]];

function jsonPengaturan(k, bawaan) { return jsonDari(pengaturan(k, ""), bawaan); }
function simpanPengaturan(k, v, ket) {
  var r = cari("Pengaturan", function (x) { return x.kunci === k; }), s = JSON.stringify(v);
  if (s.length > 45000) throw galat("Data terlalu panjang.");
  if (r) ubah("Pengaturan", r, { nilai: s }); else tambah("Pengaturan", { kunci: k, nilai: s, keterangan: ket });
}
function narasiSemua() {
  var m = {};
  semua("DedNarasi").forEach(function (r) { m[Number(r.butir)] = { _r: r, teks: teks(r.teks), status: teks(r.status) || "belum", pj: teks(r.pj), oleh: teks(r.oleh), diubah: r.diubah ? new Date(r.diubah).toISOString() : "" }; });
  return m;
}
function bolehKelolaDed(p) { return punyaPeran(p, PERAN_DED); }
function aksesDed(p) {
  if (bolehKelolaDed(p)) return true;
  if (!punyaPeran(p, ["dosen"])) return false;
  var n = narasiSemua(); return Object.keys(n).some(function (k) { return n[k].pj === p.id; });
}
function hitungKata(s) { var m = String(s || "").trim().match(/\S+/g); return m ? m.length : 0; }

function aksiDedData(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_DED.concat(["dosen"]));
  if (!aksesDed(p)) throw galat("Anda tidak memiliki izin untuk tindakan ini.");
  var kelola = bolehKelolaDed(p), nar = narasiSemua(), idx = indeksOrang(), mat = {};
  MATRIKS.forEach(function (m) { (mat[m.ded] = mat[m.ded] || []).push({ n: m.n, nm: m.nm, w: m.w, s4: m.s4, src: m.src }); });
  var butir = DED_BUTIR.map(function (b) {
    var x = nar[b[0]] || { teks: "", status: "belum", pj: "", oleh: "", diubah: "" }, pj = idx.byId[x.pj], ol = idx.byId[x.oleh], pt = DED_PETUNJUK[String(b[0])];
    return { n: b[0], judul: b[1], petunjuk: pt.p, tabel: pt.t, matriks: mat[b[0]] || [], teks: kelola || x.pj === p.id ? x.teks : "", status: x.status, pj: x.pj, pjNama: pj ? pj.nama : "",
      oleh: ol ? ol.nama : "", diubah: x.diubah, kata: hitungKata(x.teks), bolehUbah: kelola || x.pj === p.id };
  });
  return {
    kelola: kelola, butir: kelola ? butir : butir.filter(function (b) { return b.bolehUbah; }),
    identitas: IDENTITAS_DED.map(function (f) { var v = jsonPengaturan("dedIdentitas", {}); return { k: f[0], l: f[1], v: v[f[0]] !== undefined ? v[f[0]] : f[2] }; }),
    daftarPs: jsonPengaturan("dedDaftarPs", []), tim: jsonPengaturan("dedTim", []),
    dosen: idx.pegawai.filter(function (o) { return o.jenis === "dosen"; }).map(function (o) { return { id: o.id, nama: o.nama }; }),
    nidn: (function () { var m = {}; semua("BiodataPegawai").forEach(function (b) { m[b.userId] = teks(b.nidn); }); return m; })(),
    ts: { awal: tsAwal(), label: labelTa(tsAwal()) }
  };
}

function aksiDedSimpan(d, token) {
  var p = penggunaDariToken(token), n = Number(d.butir);
  wajibPeran(p, PERAN_DED.concat(["dosen"]));
  if (!(n >= 1 && n <= 64 && Math.floor(n) === n)) throw galat("Butir DED tidak dikenal.");
  var kelola = bolehKelolaDed(p);
  return kunciTulis(function () {
    var nar = narasiSemua(), x = nar[n];
    if (!kelola && (!x || x.pj !== p.id)) throw galat("Anda bukan penanggung jawab butir ini.");
    if (x && x.diubah && d.versi !== undefined && teks(d.versi) !== x.diubah) {
      var o = indeksOrang().byId[x.oleh];
      throw galat("Butir ini sudah diubah " + (o ? o.nama : "orang lain") + " sejak Anda membukanya. Salin teks Anda, tutup, buka lagi, lalu gabungkan.");
    }
    var o2 = { butir: n, diubah: new Date(), oleh: p.id };
    if (d.teks !== undefined) o2.teks = potong(d.teks, 40000);
    if (d.status !== undefined) { if (STATUS_DED.indexOf(d.status) < 0) throw galat("Status tidak dikenal."); o2.status = d.status; }
    if (d.pj !== undefined) {
      if (!kelola) throw galat("Hanya Admin Prodi/KPS yang menunjuk penanggung jawab.");
      if (d.pj && !indeksOrang().byId[d.pj]) throw galat("Penanggung jawab tidak ditemukan.");
      o2.pj = teks(d.pj);
    }
    if (x) ubah("DedNarasi", x._r, o2);
    else { o2.teks = o2.teks || ""; o2.status = o2.status || (o2.teks ? "draf" : "belum"); o2.pj = o2.pj || ""; tambah("DedNarasi", o2); }
    catat(p.id, "ded.simpan", { butir: n, status: o2.status || "", kata: hitungKata(o2.teks) });
    return { diubah: o2.diubah.toISOString() };
  });
}

function aksiDedIdentitas(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_DED);
  var v = {}, x = d.identitas || {};
  IDENTITAS_DED.forEach(function (f) { if (x[f[0]] !== undefined) v[f[0]] = potong(x[f[0]], 300).trim(); });
  var ps = (Array.isArray(d.daftarPs) ? d.daftarPs : []).slice(0, 30).map(function (r) {
    return { nama: potong(r.nama, 150), jenis: potong(r.jenis, 60), peringkat: potong(r.peringkat, 60), sk: potong(r.sk, 150), kedaluwarsa: potong(r.kedaluwarsa, 30), mhs: angka(r.mhs, 1e5) };
  }).filter(function (r) { return r.nama; });
  var idx = indeksOrang();
  var tim = (Array.isArray(d.tim) ? d.tim : []).slice(0, 20).map(function (r) {
    var o = idx.byId[teks(r.userId)];
    return { userId: o ? o.id : "", nama: o ? o.nama : potong(r.nama, 150), nidn: potong(r.nidn, 30), jabatan: potong(r.jabatan, 150), tanggal: tanggalSah(teks(r.tanggal)) ? teks(r.tanggal) : "" };
  }).filter(function (r) { return r.nama; });
  return kunciTulis(function () {
    simpanPengaturan("dedIdentitas", v, "Identitas pengusul DED (JSON)");
    simpanPengaturan("dedDaftarPs", ps, "Daftar program studi di UPPS untuk DED (JSON)");
    simpanPengaturan("dedTim", tim, "Tim penyusun DED (JSON)");
    catat(p.id, "ded.identitas", { ps: ps.length, tim: tim.length });
    return {};
  });
}
