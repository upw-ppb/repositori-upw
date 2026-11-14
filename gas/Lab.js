/**
 * Laboratorium dan sarana prodi (v0.20.0), mendukung butir Matriks sarana/prasarana (19–21) LAMWisata:
 * daftar sarana/laboratorium, perawatan (log), dan pemakaian (log). Diisi Kepala Lab / Laboran (juga Admin Prodi / Super Admin);
 * KPS melihat.
 * Tabel Sarana { id, nama, jenis, lokasi, kapasitas, kepemilikan, kondisi, perangkat, mk, pj, ket, dibuat, diubah, dihapus }
 * Tabel LogSarana { id, saranaId, tipe: "rawat"|"pakai", tgl, isi, mk, jumlah, jam, oleh, dibuat, dihapus }
 */
var PERAN_LAB_UBAH = ["kalab", "laboran", "admin", "superadmin"];
var PERAN_LAB_LIHAT = PERAN_LAB_UBAH.concat(["kps"]);
var JENIS_SARANA = ["Laboratorium", "Studio / ruang praktik", "Ruang kelas", "Sarana pendukung (perangkat/perangkat lunak)", "Lainnya"];
var MILIK_SARANA = ["Milik sendiri", "Sewa", "Kerja sama / mitra"];
var KONDISI_SARANA = ["Baik", "Rusak ringan", "Rusak berat"];

function saranaDari(r) {
  return { _r: r, id: r.id, nama: teks(r.nama), jenis: teks(r.jenis), lokasi: teks(r.lokasi), kapasitas: Number(r.kapasitas) || 0, kepemilikan: teks(r.kepemilikan),
    kondisi: teks(r.kondisi), perangkat: teks(r.perangkat), mk: teks(r.mk), pj: teks(r.pj), ket: teks(r.ket), diubah: r.diubah ? new Date(r.diubah).toISOString() : "" };
}
function aksiLabData(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_LAB_LIHAT);
  var idx = indeksOrang(), kini = hariIni(), setahun = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  var log = semua("LogSarana").filter(function (r) { return !r.dihapus; }).map(function (r) {
    var o = idx.byId[r.oleh]; return { id: r.id, saranaId: r.saranaId, tipe: r.tipe, tgl: teksTgl(r.tgl), isi: teks(r.isi), mk: teks(r.mk), jumlah: Number(r.jumlah) || 0, jam: Number(r.jam) || 0, oleh: o ? o.nama : "" };
  }).sort(function (a, b) { return b.tgl.localeCompare(a.tgl); });
  var sarana = semua("Sarana").filter(function (r) { return !r.dihapus; }).map(function (r) {
    var s = saranaDari(r); delete s._r; var pj = idx.byId[s.pj]; s.pjNama = pj ? pj.nama : "";
    var lg = log.filter(function (x) { return x.saranaId === s.id; });
    s.rawatTerakhir = (lg.filter(function (x) { return x.tipe === "rawat"; })[0] || {}).tgl || "";
    s.pakaiSetahun = lg.filter(function (x) { return x.tipe === "pakai" && x.tgl >= setahun; }).length;
    s.jamSetahun = lg.filter(function (x) { return x.tipe === "pakai" && x.tgl >= setahun; }).reduce(function (a, x) { return a + x.jam; }, 0);
    return s;
  }).sort(function (a, b) { return a.nama.localeCompare(b.nama); });
  return { bolehUbah: punyaPeran(p, PERAN_LAB_UBAH), hariIni: kini, sarana: sarana, log: log.slice(0, 500),
    pilihan: { jenis: JENIS_SARANA, kepemilikan: MILIK_SARANA, kondisi: KONDISI_SARANA },
    pegawai: idx.pegawai.map(function (o) { return { id: o.id, nama: o.nama }; }) };
}
function aksiLabSimpan(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_LAB_UBAH);
  var x = d.data || {}, nama = potong(x.nama, 150).trim();
  if (nama.length < 3) throw galat("Nama sarana/laboratorium wajib diisi.");
  if (JENIS_SARANA.indexOf(x.jenis) < 0) throw galat("Pilih jenis sarana.");
  if (MILIK_SARANA.indexOf(x.kepemilikan) < 0) throw galat("Pilih status kepemilikan.");
  if (KONDISI_SARANA.indexOf(x.kondisi) < 0) throw galat("Pilih kondisi.");
  var kap = Number(x.kapasitas); if (!(kap >= 0 && kap <= 10000)) throw galat("Kapasitas harus angka.");
  if (x.pj && !indeksOrang().byId[x.pj]) throw galat("Penanggung jawab tidak ditemukan.");
  var o = { nama: nama, jenis: x.jenis, lokasi: potong(x.lokasi, 150), kapasitas: Math.round(kap), kepemilikan: x.kepemilikan, kondisi: x.kondisi,
    perangkat: potong(x.perangkat, 1000), mk: potong(x.mk, 500), pj: teks(x.pj), ket: potong(x.ket, 500), diubah: new Date() };
  return kunciTulis(function () {
    if (d.id) {
      var r = cari("Sarana", function (y) { return y.id === teks(d.id) && !y.dihapus; });
      if (!r) throw galat("Sarana tidak ditemukan.");
      ubah("Sarana", r, o);
    } else { o.id = "sr" + acak(8); o.dibuat = new Date(); tambah("Sarana", o); }
    catat(p.id, "lab.simpan", { nama: nama });
    return aksiLabData({}, token);
  });
}
function aksiLabHapus(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_LAB_UBAH);
  return kunciTulis(function () {
    var r = cari("Sarana", function (y) { return y.id === teks(d.id) && !y.dihapus; });
    if (!r) throw galat("Sarana tidak ditemukan.");
    ubah("Sarana", r, { dihapus: new Date() });
    catat(p.id, "lab.hapus", { id: r.id });
    return aksiLabData({}, token);
  });
}
function aksiLabLog(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_LAB_UBAH);
  var x = d.data || {};
  if (!cari("Sarana", function (y) { return y.id === teks(x.saranaId) && !y.dihapus; })) throw galat("Sarana tidak ditemukan.");
  if (["rawat", "pakai"].indexOf(x.tipe) < 0) throw galat("Jenis catatan tidak dikenal.");
  if (!tanggalSah(teks(x.tgl))) throw galat("Tanggal wajib diisi.");
  if (teks(x.tgl) > hariIni()) throw galat("Tanggal tidak boleh di masa depan.");
  var isi = potong(x.isi, 500).trim();
  if (isi.length < 3) throw galat(x.tipe === "rawat" ? "Tulis kegiatan perawatan." : "Tulis keperluan pemakaian.");
  var o = { id: "lg" + acak(8), saranaId: teks(x.saranaId), tipe: x.tipe, tgl: teks(x.tgl), isi: isi, mk: potong(x.mk, 150), jumlah: Math.max(0, Math.round(Number(x.jumlah) || 0)),
    jam: Math.max(0, Math.round((Number(String(x.jam || "").replace(",", ".")) || 0) * 10) / 10), oleh: p.id, dibuat: new Date() };
  return kunciTulis(function () { tambah("LogSarana", o); catat(p.id, "lab.log", { tipe: o.tipe }); return aksiLabData({}, token); });
}
function aksiLabLogHapus(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_LAB_UBAH);
  return kunciTulis(function () {
    var r = cari("LogSarana", function (y) { return y.id === teks(d.id) && !y.dihapus; });
    if (!r) throw galat("Catatan tidak ditemukan.");
    ubah("LogSarana", r, { dihapus: new Date() });
    return aksiLabData({}, token);
  });
}
/** Ringkasan untuk Penilaian (butir sarana). */
function ringkasLab() {
  var s = semua("Sarana").filter(function (r) { return !r.dihapus; }), setahun = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  var lg = semua("LogSarana").filter(function (r) { return !r.dihapus && teksTgl(r.tgl) >= setahun; });
  return { n: s.length, lab: s.filter(function (r) { return r.jenis === "Laboratorium"; }).length, baik: s.filter(function (r) { return r.kondisi === "Baik"; }).length,
    rawat: lg.filter(function (r) { return r.tipe === "rawat"; }).length, pakai: lg.filter(function (r) { return r.tipe === "pakai"; }).length };
}
