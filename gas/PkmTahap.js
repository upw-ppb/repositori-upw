/**
 * PkM bertahap (v0.56.0, keputusan pemilik 26 Nov 2026): satu judul PkM prodi = penjajakan (surat tugas + laporan penjajakan, TIDAK dihitung)
 * → proposal (nomor registrasi P3M/Sinergi) → pelaksanaan (surat tugas + laporan; DIHITUNG sekali di Tabel 17/18 pada TA pelaksanaannya).
 * Kegiatan pelaksanaan menyimpan Kegiatan.induk = id kegiatan penjajakannya. Instrumen menghitung JUDUL PkM (DED Tabel 17), jadi penjajakan tidak dihitung.
 * Sumber dana (DED Tabel 12/17): a) Perguruan Tinggi dan b) Mandiri (dana dosen) dicatat terpisah, dijumlahkan sebagai NL pada rumus butir 45/52.
 */
function tahapPkm(k) { return /^Penjajakan/i.test(teks((k.isian || {})["Tahap PkM"])) ? "penjajakan" : "pelaksanaan"; }
function dihitungPkm(k) { return k.jenis !== "pkm" || tahapPkm(k) === "pelaksanaan"; }
/** Rangkaian untuk tampilan: penjajakan terkait (untuk pelaksanaan) atau pelaksanaan yang merujuknya (untuk penjajakan). */
function rangkaianPkm(k) {
  if (k.jenis !== "pkm") return null;
  var semuaK = semuaKegiatan(), r = function (x) { return { id: x.id, judul: x.judul, tgl: x.tgl, tahap: tahapPkm(x), status: x.status }; };
  if (tahapPkm(k) === "pelaksanaan") { var p = k.induk ? semuaK.filter(function (x) { return x.id === k.induk; })[0] : null; return { tahap: "pelaksanaan", penjajakan: p ? r(p) : null }; }
  return { tahap: "penjajakan", pelaksanaan: semuaK.filter(function (x) { return x.induk === k.id; }).map(r) };
}
/** Penjajakan PkM yang bisa dipilih saat mencatat pelaksanaan. */
function pilihanPenjajakan() {
  return semuaKegiatan().filter(function (k) { return k.jenis === "pkm" && tahapPkm(k) === "penjajakan" && k.status !== "ditolak"; })
    .map(function (k) { return { id: k.id, judul: k.judul, tgl: k.tgl }; }).sort(function (a, b) { return String(b.tgl).localeCompare(String(a.tgl)); }).slice(0, 200);
}
function bersihInduk(x, k0) {
  var v = teks(x.induk); if (!v || x.jenis !== "pkm" || /^Penjajakan/i.test(teks((x.isian || {})["Tahap PkM"]))) return "";
  var k = semuaKegiatan().filter(function (y) { return y.id === v; })[0];
  if (!k || k.jenis !== "pkm" || tahapPkm(k) !== "penjajakan" || (k0 && k.id === k0.id)) throw galat("Penjajakan PkM terkait tidak ditemukan.");
  return v;
}
/** Status dosen per TA ditetapkan Admin Prodi (Data Prodi › Data dosen TS). Cadangan: TA terakhir sebelumnya, lalu isian lama di biodata. */
var STATUS_DOSEN_ADMIN = ["Dosen tetap program studi (DTPS)", "Dosen tetap PT di luar program studi", "Dosen tidak tetap"];
function petaStatusDosen(ta) {
  var m = {}, l = semua("DosenTs").filter(function (r) { return teks(r.status); }).sort(function (a, b) { return Number(a.ta) - Number(b.ta); });
  l.forEach(function (r) { if (Number(r.ta) <= ta) m[r.userId] = { status: teks(r.status), ta: Number(r.ta) }; });
  // belum ada ketetapan sampai TA itu: pakai ketetapan paling awal sesudahnya (mis. status ditetapkan tahun ini juga berlaku untuk TS lalu)
  l.forEach(function (r) { if (Number(r.ta) > ta && !m[r.userId]) m[r.userId] = { status: teks(r.status), ta: Number(r.ta) }; });
  return m;
}
