/**
 * Riwayat keputusan (v0.20.0): log tetap semua keputusan KPS atas pengajuan surat tugas (terbit/ditunda/revisi/ditolak) dan
 * keputusan verifikasi data (disetujui/revisi/ditolak), diambil dari riwayat setiap kegiatan. Tidak bisa diubah dari aplikasi.
 * Dilihat KPS, Admin Prodi, Super Admin.
 */
var LABEL_KEPUTUSAN = { terbit: "Disetujui (surat terbit)", ditunda: "Ditunda", revisi_aju: "Diminta revisi", ditolak_aju: "Ditolak",
  disetujui: "Data disetujui", revisi: "Data diminta revisi", ditolak: "Data ditolak" };
function aksiKpsRiwayat(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["kps", "admin", "superadmin"]);
  var idx = indeksOrang(), l = [];
  semuaKegiatan().forEach(function (k) {
    (k.riwayat || []).forEach(function (r) {
      var surat = KEPUTUSAN_KPS.indexOf(r.a) >= 0, data = KEPUTUSAN_DATA.indexOf(r.a) >= 0;
      if (!surat && !data) return;
      var o = idx.byId[r.o], aju = idx.byId[k.olehId];
      l.push({ waktu: r.w, jenis: surat ? "surat" : "data", keputusan: r.a, label: LABEL_KEPUTUSAN[r.a], catatan: teks(r.c), oleh: o ? o.nama : "",
        id: k.id, judul: k.judul, jenisKeg: k.jenis, pengaju: aju ? aju.nama : "", kodeSurat: r.a === "terbit" ? teks(k.kodeSurat) : "", tgl: k.tgl || "" });
    });
  });
  l.sort(function (a, b) { return String(b.waktu).localeCompare(String(a.waktu)); });
  var tahun = []; l.forEach(function (x) { var t = String(x.waktu).slice(0, 4); if (tahun.indexOf(t) < 0) tahun.push(t); });
  return { riwayat: l, tahun: tahun, label: LABEL_KEPUTUSAN };
}
