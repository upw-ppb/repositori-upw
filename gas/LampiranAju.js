/**
 * Lampiran pengajuan surat tugas (v0.53.0, permintaan pemilik): berkas pendukung opsional untuk KPS, misalnya proposal, jadwal, atau undangan dari penyelenggara.
 * Disimpan di kolom Kegiatan.lampiranAju (JSON [{id, j, t:"file"|"tautan", fileId?, nama?, mime?, ukuran?, url?, o, w}]); berkas di folder Drive bukti kegiatan itu.
 * Hanya pengaju yang menambah/menghapus, selama surat belum diputuskan (draf_aju, menunggu_kps, revisi_aju, ditunda). Dilihat oleh pengaju, peserta, KPS, dan pengelola.
 * Lampiran ini BUKAN bukti kegiatan dan tidak ikut masuk lampiran surat.
 */
var JENIS_LAMPIRAN_AJU = ["Proposal", "Jadwal / rundown", "Undangan / surat dari penyelenggara", "Kerangka acuan (TOR)", "Lainnya"];
var LAMPIRAN_AJU_MAKS = 5;
var ST_LAMPIRAN_AJU = ["draf_aju", "menunggu_kps", "revisi_aju", "ditunda"];

function bolehUbahLampiranAju(k, p) { return k.olehId === p.id && k.perluST && ST_LAMPIRAN_AJU.indexOf(k.st) >= 0; }
function bolehLihatLampiranAju(k, p, idx) { return terlibat(k, p, idx) || boleLihatSemua(p) || punyaPeran(p, ["kps"]); }
function lampiranAjuKeKlien(k, p, idx) {
  return (k.lampiranAju || []).map(function (x) {
    var o = idx.byId[x.o];
    return { id: x.id, j: x.j, t: x.t, nama: x.nama || "", ukuran: x.ukuran || 0, url: x.t === "tautan" ? x.url : "", oleh: o ? o.nama : "", w: x.w };
  });
}
/** d = { id, j, nama, isi } atau { id, j, tautan }. */
function aksiKegiatanLampiranUnggah(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_KEGIATAN);
  var awal = ambilKegiatan(String(d.id || ""));
  if (!bolehUbahLampiranAju(awal, p)) throw galat("Lampiran pengajuan hanya bisa ditambah pengaju sebelum KPS memutuskan surat.");
  var j = JENIS_LAMPIRAN_AJU.indexOf(d.j) >= 0 ? d.j : "Lainnya", entri, file = null;
  if (d.tautan !== undefined) {
    var url = teks(d.tautan).trim();
    if (!/^https:\/\/[^\s<>"]+$/.test(url) || url.length > 500) throw galat("Tautan harus diawali https:// dan tanpa spasi.");
    entri = { t: "tautan", url: url };
  } else {
    var nama = namaAman(d.nama), eks = (nama.split(".").pop() || "").toLowerCase(), mime = BUKTI_EKS[eks];
    if (nama.indexOf(".") < 0 || !mime) throw galat("Jenis file tidak didukung. Gunakan PDF, JPG, PNG, Word, Excel, atau PowerPoint.");
    var isi = teks(d.isi);
    if (!isi || isi.length > Math.ceil(BUKTI_MAKS / 3) * 4 + 8) throw galat("Ukuran file maksimal 10 MB. Untuk file lebih besar, pakai tautan Google Drive.");
    var bytes = Utilities.base64Decode(isi);
    if (bytes.length > BUKTI_MAKS) throw galat("Ukuran file maksimal 10 MB. Untuk file lebih besar, pakai tautan Google Drive.");
    if (!isiSesuai(eks, bytes)) throw galat("Isi file tidak sesuai dengan jenisnya (." + eks + "). Simpan ulang file dari aplikasi aslinya, lalu coba lagi.");
    file = folderBuktiKeg(awal).createFile(Utilities.newBlob(bytes, mime, namaAman("Lampiran pengajuan - " + j.split(" /")[0] + " - " + nama)));
    entri = { t: "file", fileId: file.getId(), nama: nama, mime: mime, ukuran: bytes.length };
  }
  try {
    return kunciTulis(function () {
      var k = ambilKegiatan(awal.id), idx = indeksOrang();
      if (!bolehUbahLampiranAju(k, p)) throw galat("Lampiran pengajuan hanya bisa ditambah pengaju sebelum KPS memutuskan surat.");
      k.lampiranAju = k.lampiranAju || [];
      if (k.lampiranAju.length >= LAMPIRAN_AJU_MAKS) throw galat("Lampiran pengajuan maksimal " + LAMPIRAN_AJU_MAKS + " berkas.");
      entri.id = "la" + acak(8); entri.j = j; entri.o = p.id; entri.w = new Date().toISOString();
      k.lampiranAju.push(entri);
      k.riwayat.push({ w: entri.w, o: p.id, a: "lampiran_aju", c: j + (entri.nama ? ": " + entri.nama : "") });
      simpanKegiatan(k);
      catat(p.id, "kegiatan.lampiran", { id: k.id, t: entri.t });
      return { kegiatan: kegiatanKeKlien(ambilKegiatan(k.id), p, idx, true) };
    });
  } catch (e) {
    if (file) try { file.setTrashed(true); } catch (_) {}
    throw e;
  }
}
function aksiKegiatanLampiranHapus(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_KEGIATAN);
  return kunciTulis(function () {
    var k = ambilKegiatan(String(d.id || "")), idx = indeksOrang();
    if (!bolehUbahLampiranAju(k, p)) throw galat("Lampiran pengajuan hanya bisa dihapus pengaju sebelum KPS memutuskan surat.");
    var l = k.lampiranAju || [], x = l.filter(function (y) { return y.id === String(d.lid || ""); })[0];
    if (!x) throw galat("Lampiran tidak ditemukan.");
    k.lampiranAju = l.filter(function (y) { return y !== x; });
    if (x.t === "file") try { DriveApp.getFileById(x.fileId).setTrashed(true); } catch (_) {}
    k.riwayat.push({ w: new Date().toISOString(), o: p.id, a: "lampiran_aju_hapus", c: x.j + (x.nama ? ": " + x.nama : "") });
    simpanKegiatan(k);
    catat(p.id, "kegiatan.lampiranHapus", { id: k.id });
    return { kegiatan: kegiatanKeKlien(ambilKegiatan(k.id), p, idx, true) };
  });
}
function aksiKegiatanLampiranLihat(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_KEGIATAN);
  var k = ambilKegiatan(String(d.id || "")), idx = indeksOrang();
  if (!bolehLihatLampiranAju(k, p, idx)) throw galat("Anda tidak memiliki izin untuk melihat lampiran ini.");
  var x = (k.lampiranAju || []).filter(function (y) { return y.id === String(d.lid || ""); })[0];
  if (!x) throw galat("Lampiran tidak ditemukan.");
  if (x.t !== "file") return { t: x.t, url: x.url };
  var b = DriveApp.getFileById(x.fileId).getBlob();
  return { t: "file", nama: x.nama, mime: x.mime, isi: Utilities.base64Encode(b.getBytes()) };
}
