/**
 * Portofolio Saya (v0.6.0): semua kegiatan yang melibatkan pengguna (pengaju, peserta, dosen pendamping)
 * dan dokumen pribadi (sertifikat, pelatihan, SK, dll.). Ekspor PDF/Excel/ZIP dibuat di tampilan dari data ini.
 * Dokumen pribadi disimpan di Drive: Repositori UPW / Portofolio / <NIM/NIP> <nama> / <jenis> - <nama dokumen> - <berkas>.
 */
var JENIS_DOK = ["Sertifikat kompetensi (BNSP/LSP)", "Sertifikat profesi", "Sertifikat pendidik (Serdos)", "Bahasa asing (TOEIC/TOEFL/IELTS)",
  "Pelatihan / workshop", "Lomba / penghargaan", "SK jabatan / penugasan", "Ijazah / transkrip", "Lainnya",
  /* v0.19.0: dokumen pendukung biodata dosen */ "Ijazah D4/S1", "Ijazah S2", "Ijazah S3"];
var JENIS_DOK_BIODATA = ["Ijazah D4/S1", "Ijazah S2", "Ijazah S3", "Sertifikat pendidik (Serdos)", "Sertifikat kompetensi (BNSP/LSP)", "Sertifikat profesi"];
/** Seperti wajibPeran, tetapi dokumen pendukung biodata boleh diunggah sebelum biodata lengkap. */
function wajibPeranDok(p, d) {
  if (d && d.dariBiodata && JENIS_DOK_BIODATA.indexOf(d.jenis) >= 0) {
    if (p.status !== "aktif") throw galat("Selesaikan aktivasi akun terlebih dahulu.");
    if (p.wajibGanti === true || p.wajibGanti === "TRUE") throw galat("Ganti kata sandi Anda terlebih dahulu.");
    if (!punyaPeran(p, ["dosen", "tendik"])) throw galat("Anda tidak memiliki izin untuk tindakan ini.");
    return;
  }
  wajibPeran(p, PERAN_KEGIATAN);
}

function peranDiKegiatan(k, p, idx) {
  if (k.olehId === p.id) return "Pengaju";
  if (k.pendampingId === p.id) return "Dosen pendamping";
  if (k.pegawai.indexOf(p.id) >= 0 || mhsPeserta(k, idx).some(function (m) { return m.id === p.id; })) return "Peserta";
  return "";
}
function dokumenDari(r) {
  return { _r: r, id: r.id, userId: r.userId, nama: teks(r.nama), jenis: teks(r.jenis), tahun: teks(r.tahun), t: r.t, fileId: teks(r.fileId),
    namaFile: teks(r.namaFile), mime: teks(r.mime), ukuran: Number(r.ukuran) || 0, url: teks(r.url), dibuat: r.dibuat ? new Date(r.dibuat).toISOString() : "" };
}
function dokumenSaya(userId) { return semua("DokumenPribadi").filter(function (r) { return r.userId === userId && !r.dihapus; }).map(dokumenDari); }
function dokumenKeKlien(x) {
  return { id: x.id, nama: x.nama, jenis: x.jenis, tahun: x.tahun, t: x.t, namaFile: x.namaFile, mime: x.mime, ukuran: x.ukuran, url: x.url, dibuat: x.dibuat };
}

function aksiPortofolioSaya(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_KEGIATAN);
  var idx = indeksOrang(), set = pengaturanSurat(), o = idx.byId[p.id] || {};
  var l = semuaKegiatan().filter(function (k) {
    var r = peranDiKegiatan(k, p, idx);
    if (!r) return false;
    var draf = k.st === "draf_aju" || (k.st === "tanpa" && k.status === "draf");
    return k.olehId === p.id || !draf; // draf orang lain belum ditampilkan
  });
  l.sort(function (a, b) { return (b.tgl || "9").localeCompare(a.tgl || "9"); });
  return {
    orang: { nama: p.nama, username: String(p.username), peran: peranDari(p), jenis: o.jenis || "", masuk: o.masuk || "", kelas: o.kelas || "",
      semesterMhs: o.masuk ? semesterMhs(o.masuk) : null },
    semesterKini: semesterInfo().label,
    kegiatan: l.map(function (k) {
      var x = kegiatanKeKlien(k, p, idx, false, set), bk = k.bukti || {};
      x.peranSaya = peranDiKegiatan(k, p, idx);
      x.daftarBukti = statBukti(k, idx).slot.filter(function (s) { return bk[s.k]; }).map(function (s) {
        var e = bk[s.k]; return { slot: s.k, l: s.l, t: e.t, nama: e.nama || "", url: e.url || "", ket: e.ket || "" };
      });
      return x;
    }),
    dokumen: dokumenSaya(p.id).map(dokumenKeKlien),
    jenisDok: JENIS_DOK
  };
}

function aksiDokSimpan(d, token) {
  var p = penggunaDariToken(token);
  wajibPeranDok(p, d);
  var nama = potong(d.nama, 200).trim(), jenis = JENIS_DOK.indexOf(d.jenis) >= 0 ? d.jenis : "", tahun = teks(d.tahun).trim();
  if (!nama) throw galat("Isi nama dokumen, misalnya: Sertifikat Kompetensi Pemandu Wisata.");
  if (!jenis) throw galat("Pilih jenis dokumen.");
  if (!/^(19|20)\d{2}$/.test(tahun) || Number(tahun) > new Date().getFullYear() + 1) throw galat("Isi tahun dokumen (4 angka), misalnya 2026.");
  if (semua("DokumenPribadi").filter(function (r) { return r.userId === p.id && !r.dihapus; }).length >= 200) throw galat("Dokumen pribadi maksimal 200.");
  var x = { id: "d" + acak(10), userId: p.id, nama: nama, jenis: jenis, tahun: tahun, dibuat: new Date(), dihapus: "" }, file = null;
  if (d.tautan !== undefined) {
    var url = teks(d.tautan).trim();
    if (!/^https:\/\/[^\s<>"]+$/.test(url) || url.length > 500) throw galat("Tautan harus diawali https:// dan tanpa spasi.");
    x.t = "tautan"; x.url = url;
  } else {
    var nf = namaAman(d.namaFile), eks = (nf.split(".").pop() || "").toLowerCase(), mime = BUKTI_EKS[eks];
    if (nf.indexOf(".") < 0 || !mime) throw galat("Jenis file tidak didukung. Gunakan PDF, JPG, PNG, WEBP, Word, Excel, atau PowerPoint.");
    var isi = teks(d.isi);
    if (!isi || isi.length > Math.ceil(BUKTI_MAKS / 3) * 4 + 8) throw galat("Ukuran file maksimal 10 MB. Untuk file lebih besar, unggah ke Google Drive lalu pakai Tautan.");
    var bytes = Utilities.base64Decode(isi);
    if (bytes.length > BUKTI_MAKS) throw galat("Ukuran file maksimal 10 MB.");
    if (!isiSesuai(eks, bytes)) throw galat("Isi file tidak sesuai dengan jenisnya (." + eks + "). Simpan ulang file dari aplikasi aslinya, lalu coba lagi.");
    var induk = folderAnak(DriveApp.getFolderById(konfig().getProperty("FOLDER_ID")), "Portofolio");
    var f = folderAnak(induk, String(p.username) + " " + namaAman(p.nama).slice(0, 60));
    file = f.createFile(Utilities.newBlob(bytes, mime, namaAman(jenis.split(" (")[0] + " - " + nama).slice(0, 80) + " - " + nf));
    x.t = "file"; x.fileId = file.getId(); x.namaFile = nf; x.mime = mime; x.ukuran = bytes.length;
  }
  try {
    kunciTulis(function () { tambah("DokumenPribadi", x); });
  } catch (e) { if (file) try { file.setTrashed(true); } catch (_) {} throw e; }
  catat(p.id, "dok.simpan", { id: x.id, t: x.t });
  return { dokumen: dokumenSaya(p.id).map(dokumenKeKlien) };
}

function ambilDokSaya(p, id) {
  var r = cari("DokumenPribadi", function (x) { return x.id === id; });
  if (!r || r.dihapus || r.userId !== p.id) throw galat("Dokumen tidak ditemukan.");
  return dokumenDari(r);
}
function aksiDokHapus(d, token) {
  var p = penggunaDariToken(token);
  wajibPeranDok(p, d && d.dariBiodata ? { dariBiodata: 1, jenis: (cari("DokumenPribadi", function (x) { return x.id === String(d.id || ""); }) || {}).jenis } : d);
  return kunciTulis(function () {
    var x = ambilDokSaya(p, String(d.id || ""));
    ubah("DokumenPribadi", x._r, { dihapus: new Date() });
    if (x.t === "file") try { DriveApp.getFileById(x.fileId).setTrashed(true); } catch (_) {}
    catat(p.id, "dok.hapus", { id: x.id });
    return { dokumen: dokumenSaya(p.id).map(dokumenKeKlien) };
  });
}
function aksiDokLihat(d, token) {
  var p = penggunaDariToken(token);
  wajibPeranDok(p, d && d.dariBiodata ? { dariBiodata: 1, jenis: (cari("DokumenPribadi", function (x) { return x.id === String(d.id || ""); }) || {}).jenis } : d);
  var x = ambilDokSaya(p, String(d.id || ""));
  if (x.t !== "file") return { t: x.t, url: x.url };
  return { t: "file", nama: x.namaFile, mime: x.mime, isi: Utilities.base64Encode(DriveApp.getFileById(x.fileId).getBlob().getBytes()) };
}
