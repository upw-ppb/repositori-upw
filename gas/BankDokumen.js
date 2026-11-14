/**
 * Bank Dokumen (v0.15.0): slot dokumen wajib per butir Matriks yang dinilai GPM (rubrik), dengan penanggung jawab (PJ) dan masa berlaku.
 * Daftar slot baku SLOT_BANK dibuat dari prototipe (objek DOCS); Admin Prodi/KPS dapat menambah slot "dokumen lain" per butir.
 * Satu baris BankDokumen per slot (kunci "n-i" untuk slot baku, "n-x<id>" untuk tambahan); kolom versi = JSON
 *   [{ id, t: "file"|"tautan", fileId, nama, mime, ukuran, url, berlaku: "YYYY-MM-DD"|"", ket, o, w }] — versi terakhir = yang berlaku.
 * Versi lama TIDAK dibuang saat diganti (riwayat dokumen mutu); hanya versi terakhir yang bisa dihapus (pengunggah atau pengelola).
 * Status: belum | ada | segera (berakhir ≤ 60 hari) | kedaluwarsa.
 * Akses: Admin Prodi / KPS / Super Admin mengelola semua; pegawai yang ditunjuk PJ mengunggah slotnya; asesor melihat (tercatat di log).
 */
var SLOT_BANK = {"1":["SK unit/gugus penjaminan mutu","Kebijakan SPMI","Manual SPMI","Standar SPMI","Formulir SPMI","Laporan benchmarking eksternal"],"2":["Dokumen penetapan standar","Laporan audit mutu internal","Notulen rapat tinjauan manajemen","Bukti peningkatan standar"],"3":["SK anggota IAB","Kerangka acuan IAB","Notulen rapat IAB tahun berjalan"],"4":["Laporan implementasi SPMI","Bukti pelaporan PDDikti","Notulen pemanfaatan laporan untuk keputusan"],"5":["Sertifikat akreditasi/sertifikasi lain"],"6":["Kebijakan kurikulum OBE","Pedoman penyusunan dan evaluasi kurikulum"],"7":["Dokumen kurikulum","Notulen lokakarya kurikulum","Peta kurikulum CPL–MK","Hasil review pakar/industri/asosiasi"],"9":["Renstra SDM","Analisis kebutuhan dosen dan tendik"],"18":["Rekap tendik dan laboran","Sertifikat laboran"],"19":["Daftar sarana (menu Data Prodi)","Bukti pemutakhiran sarana"],"20":["Rencana praktik lapangan","MoU/MoA lokasi praktik"],"21":["Daftar laboratorium","Jadwal perawatan","Log pemakaian"],"22":["Rekap metode pembelajaran (Portofolio MK)","Bukti pembelajaran daring/luring"],"23":["Laporan monev pembelajaran","Bukti tindak lanjut monev"],"25":["Rekap rubrik penilaian (Portofolio MK)","Prosedur penilaian"],"26":["Jadwal uji kompetensi","Kerja sama LSP"],"30":["Rencana pengembangan dosen","Bukti pelaksanaan pengembangan"],"31":["Laporan analisis CPL 3 tahun"],"38":["Laporan tracer study","Kuesioner tracer","Bukti pemanfaatan hasil tracer"],"42":["Laporan analisis kepuasan pengguna","Bukti tindak lanjut"],"43":["Renstra penelitian","Peta jalan penelitian"],"44":["Pedoman penelitian","SK reviewer","Berita acara monev penelitian"],"47":["Laporan analisis luaran penelitian"],"51":["Renstra PkM","Peta jalan PkM","Pedoman PkM"],"52":["SK reviewer PkM","Berita acara monev PkM"],"55":["Laporan analisis luaran PkM"],"57":["Bukti layanan kepakaran lembaga"],"58":["Statuta","Struktur organisasi dan tata kerja"],"60":["Pedoman pengawasan","Register risiko","Rekap pengaduan dan penyelesaian"],"61":["Kebijakan pengelolaan data"],"62":["Pedoman pengelolaan 11 aspek","Bukti POSAC"],"64":["Kebijakan PMB afirmatif","Kebijakan RPL","Data beasiswa"],"65":["Pedoman layanan kemahasiswaan","Laporan layanan"],"69":["Rencana dan realisasi investasi"],"70":["Laporan keuangan 3 tahun","Proyeksi dana 3 tahun"],"71":["Laporan analisis kepuasan mahasiswa per semester"],"73":["Laporan survei kepuasan mitra"],"74":["Renstra PT/UPPS","Dokumen diferensiasi misi"],"76":["Dokumen strategi","Laporan monev strategi"],"77":["Laporan kinerja tahunan"],"78":["Laporan kepuasan pemangku kepentingan","Bukti publikasi hasil"],"79":["Daftar indikator kinerja tambahan dan capaiannya"],"80":["Narasi profil UPPS (editor DED)"],"81":["Narasi analisis capaian kinerja (editor DED)"],"82":["Narasi analisis SWOT (editor DED)"],"83":["Narasi program pengembangan (editor DED)"],"84":["Narasi program keberlanjutan (editor DED)"]};
var PERAN_BANK = ["admin", "superadmin", "kps"];
var HARI_SEGERA = 60;

function slotBankBaku() {
  var l = [];
  Object.keys(SLOT_BANK).forEach(function (n) { SLOT_BANK[n].forEach(function (nama, i) { l.push({ kunci: n + "-" + i, butir: Number(n), nama: nama, baku: true }); }); });
  return l;
}
function barisBank() {
  var m = {};
  semua("BankDokumen").forEach(function (r) { m[teks(r.kunci)] = r; });
  return m;
}
/** Semua slot (baku + tambahan yang belum dihapus) beserta isinya. */
function semuaSlotBank() {
  var b = barisBank(), l = slotBankBaku().map(function (s) { var r = b[s.kunci]; s._r = r || null; return s; });
  Object.keys(b).forEach(function (k) {
    var r = b[k]; if (/^\d+-\d+$/.test(k) || r.dihapus) return;
    l.push({ kunci: k, butir: Number(r.butir), nama: teks(r.nama), baku: false, _r: r });
  });
  l.forEach(function (s) { var r = s._r; s.pj = r ? teks(r.pj) : ""; s.versi = r ? jsonDari(r.versi, []) : []; });
  return l.sort(function (a, b2) { return a.butir - b2.butir || (a.baku === b2.baku ? 0 : a.baku ? -1 : 1); });
}
function tambahHariBank(s, n) { var d = new Date(s + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function statusBank(s, kini) {
  var v = s.versi[s.versi.length - 1];
  if (!v) return "belum";
  if (v.berlaku && v.berlaku < kini) return "kedaluwarsa";
  if (v.berlaku && v.berlaku <= tambahHariBank(kini, HARI_SEGERA)) return "segera";
  return "ada";
}
function bankAkses(p) { return punyaPeran(p, PERAN_BANK) || punyaPeran(p, ["asesor"]); }
function versiKeKlien(v, idx) { var o = idx.byId[v.o]; return { id: v.id, t: v.t, nama: v.nama || "", ukuran: v.ukuran || 0, url: v.t === "tautan" ? v.url : "", berlaku: v.berlaku || "", ket: v.ket || "", oleh: o ? o.nama : "", w: v.w }; }
function slotKeKlien(s, p, idx, kini) {
  var pj = idx.byId[s.pj], kelola = punyaPeran(p, PERAN_BANK), akhir = s.versi[s.versi.length - 1];
  return { kunci: s.kunci, butir: s.butir, nama: s.nama, baku: s.baku, pj: s.pj, pjNama: pj ? pj.nama : "", status: statusBank(s, kini),
    versi: s.versi.map(function (v) { return versiKeKlien(v, idx); }),
    bolehUnggah: kelola || (!!s.pj && s.pj === p.id),
    bolehHapusAkhir: !!akhir && (kelola || akhir.o === p.id) };
}
/** Ringkasan per butir untuk Penilaian: { n: { ada, n } } (ada = berlaku, termasuk segera berakhir). */
function ringkasBank() {
  var kini = hariIni(), m = {};
  semuaSlotBank().forEach(function (s) { var x = m[s.butir] = m[s.butir] || { ada: 0, n: 0 }; x.n++; var st = statusBank(s, kini); if (st === "ada" || st === "segera") x.ada++; });
  return m;
}
/** Slot yang menjadi tanggung jawab akun ini dan belum ada / kedaluwarsa / segera berakhir. */
function bankTugas(p) {
  var kini = hariIni();
  return semuaSlotBank().filter(function (s) { return s.pj === p.id; }).map(function (s) { return { kunci: s.kunci, butir: s.butir, nama: s.nama, status: statusBank(s, kini) }; });
}

/* ---------- aksi ---------- */

function aksiBankData(d, token) {
  var p = penggunaDariToken(token);
  var pjSaya = bankTugas(p).length > 0;
  if (!bankAkses(p) && !pjSaya) throw galat("Anda tidak memiliki izin untuk tindakan ini.");
  var idx = indeksOrang(), kini = hariIni(), kelola = punyaPeran(p, PERAN_BANK), asesorSaja = punyaPeran(p, ["asesor"]) && !punyaPeran(p, PERAN_KEGIATAN);
  var slot = semuaSlotBank();
  if (!bankAkses(p)) slot = slot.filter(function (s) { return s.pj === p.id; });
  if (asesorSaja) slot = slot.filter(function (s) { return s.versi.length; });
  catatAsesor(p, "bankDaftar", {});
  var mat = {};
  MATRIKS.forEach(function (m) { mat[m.n] = { n: m.n, k: m.k, nm: m.nm, w: m.w, s4: m.s4 }; });
  var butir = [];
  slot.forEach(function (s) { if (butir.indexOf(s.butir) < 0) butir.push(s.butir); });
  return {
    kelola: kelola, asesor: asesorSaja, hariIni: kini, hariSegera: HARI_SEGERA,
    butir: butir.map(function (n) { return mat[n]; }).filter(Boolean),
    slot: slot.map(function (s) {
      var x = slotKeKlien(s, p, idx, kini);
      if (asesorSaja) { x.versi = x.versi.slice(-1); x.bolehUnggah = false; x.bolehHapusAkhir = false; x.pj = ""; x.pjNama = ""; }
      return x;
    }),
    kriteria: KRITERIA,
    pegawai: kelola ? idx.pegawai.map(function (o) { return { id: o.id, nama: o.nama }; }).sort(function (a, b) { return a.nama.localeCompare(b.nama); }) : []
  };
}
function ambilSlot(kunci) {
  var s = semuaSlotBank().filter(function (x) { return x.kunci === kunci; })[0];
  if (!s) throw galat("Slot dokumen tidak ditemukan.");
  return s;
}
function simpanSlot(s, perubahan, p) {
  var o = Object.assign({ kunci: s.kunci, butir: s.butir, nama: s.nama, baku: s.baku ? 1 : "", pj: s.pj, versi: JSON.stringify(s.versi), diubah: new Date(), oleh: p.id }, perubahan);
  if (String(o.versi).length > 45000) throw galat("Riwayat versi dokumen ini terlalu panjang. Hubungi Super Admin.");
  if (s._r) ubah("BankDokumen", s._r, o); else tambah("BankDokumen", o);
}
function folderBank(n) {
  var induk = folderAnak(folderAnak(DriveApp.getFolderById(prop("FOLDER_ID")), "Bukti"), "Bank Dokumen");
  return folderAnak(induk, "Butir " + (n < 10 ? "0" : "") + n);
}

function aksiBankUnggah(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_KEGIATAN);
  var kunci = teks(d.kunci), s0 = ambilSlot(kunci);
  if (!punyaPeran(p, PERAN_BANK) && s0.pj !== p.id) throw galat("Hanya penanggung jawab dokumen ini atau Admin Prodi/KPS yang bisa mengunggah.");
  var berlaku = teks(d.berlaku).trim();
  if (berlaku && !tanggalSah(berlaku)) throw galat("Tanggal berlaku tidak valid.");
  var entri, file = null;
  if (d.tautan !== undefined) {
    var url = teks(d.tautan).trim();
    if (!/^https:\/\/[^\s<>"]+$/.test(url) || url.length > 500) throw galat("Tautan harus diawali https:// dan tanpa spasi.");
    entri = { t: "tautan", url: url };
  } else {
    var nama = namaAman(d.nama), eks = (nama.split(".").pop() || "").toLowerCase(), mime = BUKTI_EKS[eks];
    if (nama.indexOf(".") < 0 || !mime) throw galat("Jenis file tidak didukung. Gunakan PDF, JPG, PNG, WEBP, Word, Excel, atau PowerPoint.");
    var isi = teks(d.isi);
    if (!isi || isi.length > Math.ceil(BUKTI_MAKS / 3) * 4 + 8) throw galat("Ukuran file maksimal 10 MB. Untuk file lebih besar, unggah ke Google Drive lalu pakai Tautan.");
    var bytes = Utilities.base64Decode(isi);
    if (bytes.length > BUKTI_MAKS) throw galat("Ukuran file maksimal 10 MB. Untuk file lebih besar, unggah ke Google Drive lalu pakai Tautan.");
    if (!isiSesuai(eks, bytes)) throw galat("Isi file tidak sesuai dengan jenisnya (." + eks + "). Simpan ulang file dari aplikasi aslinya, lalu coba lagi.");
    file = folderBank(s0.butir).createFile(Utilities.newBlob(bytes, mime, namaAman(s0.nama.slice(0, 60) + " - " + nama)));
    entri = { t: "file", fileId: file.getId(), nama: nama, mime: mime, ukuran: bytes.length };
  }
  entri.id = Utilities.getUuid().slice(0, 8); entri.berlaku = berlaku; entri.ket = potong(d.ket, 200).trim(); entri.o = p.id; entri.w = new Date().toISOString();
  try {
    kunciTulis(function () {
      var s = ambilSlot(kunci);
      if (s.versi.length >= 20) throw galat("Riwayat dokumen ini sudah 20 versi. Hapus versi terakhir yang salah atau hubungi Super Admin.");
      s.versi.push(entri);
      simpanSlot(s, {}, p);
    });
  } catch (e) { if (file) try { file.setTrashed(true); } catch (_) {} throw e; }
  catat(p.id, "bank.unggah", { kunci: kunci, t: entri.t });
  return aksiBankData({}, token);
}

function aksiBankHapus(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_KEGIATAN);
  var kunci = teks(d.kunci), dibuang = null;
  kunciTulis(function () {
    var s = ambilSlot(kunci), v = s.versi[s.versi.length - 1];
    if (!v) throw galat("Belum ada dokumen pada slot ini.");
    if (v.id !== teks(d.id)) throw galat("Hanya versi terakhir yang bisa dihapus. Muat ulang halaman.");
    if (!punyaPeran(p, PERAN_BANK) && v.o !== p.id) throw galat("Hanya pengunggah atau Admin Prodi/KPS yang bisa menghapus versi ini.");
    dibuang = s.versi.pop();
    simpanSlot(s, {}, p);
  });
  if (dibuang && dibuang.t === "file") try { DriveApp.getFileById(dibuang.fileId).setTrashed(true); } catch (_) {}
  catat(p.id, "bank.hapus", { kunci: kunci });
  return aksiBankData({}, token);
}

/** Admin Prodi/KPS: tunjuk PJ, tambah slot lain, ubah nama/hapus slot tambahan. */
function aksiBankAtur(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_BANK);
  var idx = indeksOrang();
  kunciTulis(function () {
    if (d.baru) {
      var n = Number(d.butir), nama = potong(d.nama, 150).trim();
      if (!MATRIKS.some(function (m) { return m.n === n; })) throw galat("Butir matriks tidak dikenal.");
      if (nama.length < 3) throw galat("Nama dokumen wajib diisi.");
      var pj0 = teks(d.pj);
      if (pj0 && !idx.byId[pj0]) throw galat("Penanggung jawab tidak ditemukan.");
      tambah("BankDokumen", { kunci: n + "-x" + Utilities.getUuid().slice(0, 6), butir: n, nama: nama, baku: "", pj: pj0, versi: "[]", diubah: new Date(), oleh: p.id });
      catat(p.id, "bank.slotBaru", { butir: n });
      return;
    }
    var s = ambilSlot(teks(d.kunci)), ubahan = {};
    if (d.pj !== undefined) { if (d.pj && !idx.byId[d.pj]) throw galat("Penanggung jawab tidak ditemukan."); s.pj = teks(d.pj); }
    if (d.nama !== undefined) { if (s.baku) throw galat("Nama slot baku tidak bisa diubah."); var nm = potong(d.nama, 150).trim(); if (nm.length < 3) throw galat("Nama dokumen wajib diisi."); s.nama = nm; }
    if (d.hapus) {
      if (s.baku) throw galat("Slot baku tidak bisa dihapus.");
      if (s.versi.length) throw galat("Hapus dulu semua versi dokumen pada slot ini.");
      ubahan.dihapus = new Date();
    }
    simpanSlot(s, ubahan, p);
    catat(p.id, "bank.atur", { kunci: s.kunci, pj: d.pj !== undefined, hapus: !!d.hapus });
  });
  return aksiBankData({}, token);
}

function aksiBankLihat(d, token) {
  var p = penggunaDariToken(token), s = ambilSlot(teks(d.kunci));
  if (!bankAkses(p) && s.pj !== p.id) throw galat("Anda tidak memiliki izin untuk tindakan ini.");
  var asesorSaja = punyaPeran(p, ["asesor"]) && !punyaPeran(p, PERAN_KEGIATAN);
  var v = s.versi.filter(function (x) { return x.id === teks(d.id); })[0];
  if (!v) throw galat("Versi dokumen tidak ditemukan.");
  if (asesorSaja && v !== s.versi[s.versi.length - 1]) throw galat("Asesor hanya dapat membuka versi yang berlaku.");
  catatAsesor(p, "bankLihat", { kunci: s.kunci });
  if (v.t !== "file") return { t: v.t, url: v.url };
  var b = DriveApp.getFileById(v.fileId).getBlob();
  return { t: "file", nama: v.nama, mime: v.mime, isi: Utilities.base64Encode(b.getBytes()) };
}
