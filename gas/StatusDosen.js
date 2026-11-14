/**
 * Status dosen (v0.18.0): aktif, tugas belajar, pensiun — dengan tanggal dan riwayat. Diisi Admin Prodi / Super Admin; KPS melihat.
 * Tabel StatusDosen: satu baris per periode { id, userId, status, mulai, selesai, ket }. Tugas belajar diakhiri dengan tanggal selesai
 * (dosen kembali ke kampus); lama tugas belajar = selesai − mulai (atau sampai hari ini bila belum selesai).
 * Tanpa periode yang berlaku pada suatu tanggal = aktif.
 */
var STATUS_DOSEN = { tugas_belajar: "Tugas belajar", pensiun: "Pensiun", aktif: "Aktif" };

function periodeDosen() {
  var m = {};
  semua("StatusDosen").filter(function (r) { return !r.dihapus; }).forEach(function (r) {
    (m[r.userId] = m[r.userId] || []).push({ _r: r, id: r.id, status: teks(r.status), mulai: teksTgl(r.mulai), selesai: teksTgl(r.selesai), ket: teks(r.ket) });
  });
  Object.keys(m).forEach(function (k) { m[k].sort(function (a, b) { return a.mulai < b.mulai ? -1 : 1; }); });
  return m;
}
/** Status pada tanggal tertentu (YYYY-MM-DD). */
function statusDosenPada(periode, tgl) {
  var s = { status: "aktif", sejak: "" };
  (periode || []).forEach(function (x) {
    if (x.mulai && x.mulai <= tgl && (!x.selesai || x.selesai >= tgl)) s = { status: x.status, sejak: x.mulai, id: x.id };
  });
  return s;
}
function aksiDpStatus(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_DP_LIHAT);
  var per = periodeDosen(), kini = hariIni();
  return {
    bolehUbah: punyaPeran(p, PERAN_DP_UBAH), hariIni: kini, label: STATUS_DOSEN,
    dosen: daftarDosen().map(function (x) {
      var l = (per[x.id] || []).map(function (y) { var z = Object.assign({}, y); delete z._r; return z; });
      return { id: x.id, nama: x.nama, inisial: x.inisial, statusDosen: x.status, kini: statusDosenPada(per[x.id], kini), periode: l };
    })
  };
}
function aksiDpStatusSimpan(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_DP_UBAH);
  var userId = teks(d.userId), status = teks(d.status), mulai = teks(d.mulai), selesai = teks(d.selesai), ket = potong(d.ket, 300).trim();
  if (!daftarDosen().some(function (x) { return x.id === userId; })) throw galat("Dosen tidak ditemukan.");
  if (["tugas_belajar", "pensiun"].indexOf(status) < 0) throw galat("Status tidak dikenal.");
  if (!tanggalSah(mulai)) throw galat("Tanggal mulai wajib diisi.");
  if (selesai && !tanggalSah(selesai)) throw galat("Tanggal selesai tidak valid.");
  if (selesai && selesai < mulai) throw galat("Tanggal selesai tidak boleh sebelum tanggal mulai.");
  if (status === "pensiun" && selesai) throw galat("Pensiun tidak memiliki tanggal selesai.");
  return kunciTulis(function () {
    var per = periodeDosen()[userId] || [], id = teks(d.id), lama = id ? per.filter(function (x) { return x.id === id; })[0] : null;
    if (id && !lama) throw galat("Riwayat status tidak ditemukan.");
    var bentrok = per.filter(function (x) {
      if (lama && x.id === lama.id) return false;
      var a1 = x.mulai, b1 = x.selesai || "9999-12-31", a2 = mulai, b2 = selesai || "9999-12-31";
      return a1 <= b2 && a2 <= b1;
    })[0];
    if (bentrok) throw galat("Tanggal bertumpuk dengan status " + (STATUS_DOSEN[bentrok.status] || bentrok.status) + " mulai " + bentrok.mulai + ". Akhiri status itu dulu.");
    var o = { userId: userId, status: status, mulai: mulai, selesai: selesai, ket: ket, oleh: p.id, diubah: new Date() };
    if (lama) ubah("StatusDosen", lama._r, o); else { o.id = "sd" + acak(8); o.dibuat = new Date(); tambah("StatusDosen", o); }
    catat(p.id, "dp.status", { userId: userId, status: status, mulai: mulai, selesai: selesai });
    return aksiDpStatus({}, token);
  });
}
function aksiDpStatusHapus(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_DP_UBAH);
  return kunciTulis(function () {
    var r = cari("StatusDosen", function (x) { return x.id === teks(d.id) && !x.dihapus; });
    if (!r) throw galat("Riwayat status tidak ditemukan.");
    ubah("StatusDosen", r, { dihapus: new Date(), oleh: p.id });
    catat(p.id, "dp.statusHapus", { id: r.id });
    return aksiDpStatus({}, token);
  });
}
