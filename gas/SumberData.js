/**
 * Sumber data penilaian (v0.24.0).
 * - Setiap butir Penilaian bisa ditelusuri ke data asalnya: kegiatan (semua status, ditandai mana yang dihitung) dan data lain
 *   (dosen, mahasiswa, kurikulum, lulusan, PMB, keuangan, survei, skor GPM, Bank Dokumen).
 * - Halaman "Data Terkumpul" (Super Admin): semua kegiatan beserta kategorinya (jenis, Tabel iLKPS, butir penilaian), dan tindakan
 *   Super Admin: terima, minta revisi, tolak (juga atas data yang sudah disetujui), hapus (bisa dipulihkan), pulihkan.
 * Admin Prodi dan KPS boleh MELIHAT sumber data butir dari halaman Penilaian; tindakan hanya Super Admin.
 */
var PERAN_SUMBER_LIHAT = ["admin", "superadmin", "kps"];
var SUMBER_HAPUS_MAKS = 200;
/** Rumus otomatis → jenis kegiatan yang dihitung. "*" = semua kegiatan yang memilih pasal GCET. */
var F_JENIS = { pa: ["prestasi_a"], pn: ["prestasi_n"], pen: ["penelitian"], ppdm: ["penelitian"], dpd: ["penelitian"], pkm: ["pkm"], ppkmdm: ["pkm"],
  dpkmd: ["pkm"], pub: ["publikasi"], pubpkm: ["publikasi"], rs: ["publikasi"], napj: ["produk"], rrd: ["rekognisi"], ks: ["kerjasama"],
  suasana: ["suasana"], sertmhs: ["sertifikasi"], rdpu: ["bimbingan"], gcet: "*" };
/** Rumus otomatis → data lain yang dipakai. */
var F_DATA = { ndtps: ["dosen"], pds3: ["dosen"], pdsk: ["dosen"], pdtpsl: ["dosen"], sertdos: ["dosen"], pgblkl: ["dosen"], pdtt: ["dosen"],
  rmdtps: ["dosen", "mhs"], pmki: ["mk", "dosen"], pjp: ["mk"], ewmp: ["dosen", "mk"], rdpu: ["dosen"], pa: ["mhs"], pn: ["mhs"],
  ripk: ["lulusan"], ms: ["lulusan", "pmb"], ptw: ["lulusan", "pmb"], pps: ["lulusan", "pmb"], wt: ["lulusan"], pbs: ["lulusan"], tk: ["lulusan"],
  tkp: ["survei"], tkm: ["survei"], animo: ["pmb"], dop: ["dana", "mhs"], dpd: ["dana", "dosen"], dpkmd: ["dana", "dosen"],
  pen: ["dosen"], pkm: ["dosen"], pub: ["dosen"], pubpkm: ["dosen"], rs: ["dosen"], rrd: ["dosen"], ks: ["dosen"], sertmhs: ["mhs"] };
var LABEL_STATUS_DATA = { draf: "Draf (belum diajukan)", diajukan: "Menunggu verifikasi", diajukan_ulang: "Diajukan ulang", revisi: "Perlu revisi",
  disetujui: "Disetujui", ditolak: "Ditolak" };

/** Nomor butir DED yang disebut di keterangan jenis kegiatan ("DED butir 46", "DED butir 1–2", "Butir 22 · IBE"). */
function dedDariJenis(def) {
  var m = /(?:DED\s+)?[Bb]utir\s+(\d+)(?:\s*[–-]\s*(\d+))?/.exec(def.t || ""), l = [];
  if (!m || /^Tabel/.test(def.t)) return l;
  for (var i = Number(m[1]); i <= Number(m[2] || m[1]); i++) l.push(i);
  return l;
}
/** Peta jenis kegiatan → butir penilaian (Matriks) yang memakainya, dengan cara pemakaiannya. */
function petaJenisButir() {
  var peta = {};
  JENIS_KEG.forEach(function (j) { peta[j.k] = []; });
  MATRIKS.forEach(function (m) {
    var fj = m.f ? F_JENIS[m.f] : null;
    JENIS_KEG.forEach(function (j) {
      if (fj && fj !== "*" && fj.indexOf(j.k) >= 0) peta[j.k].push({ n: m.n, cara: "dihitung" });
      else if (m.t !== "a" && dedDariJenis(j).indexOf(Number(m.ded)) >= 0) peta[j.k].push({ n: m.n, cara: "bahan GPM" });
    });
  });
  return peta;
}
function butirGcet() { var m = MATRIKS.filter(function (x) { return x.f === "gcet"; })[0]; return m ? m.n : null; }
function dalamTs(k, ts, hanyaTs) { var a = taKegiatan(k); return a !== null && (hanyaTs ? a === ts : a >= ts - 2 && a <= ts); }

function kegiatanSumber(k, idx, peta, nGcet) {
  var def = jenisDef(k.jenis), o = idx.byId[k.olehId], v = idx.byId[k.verifId];
  var butir = (peta[k.jenis] || []).slice();
  if (nGcet && (k.gcet || []).length) butir.push({ n: nGcet, cara: "dihitung" });
  return { id: k.id, judul: k.judul, jenis: k.jenis, jenisLabel: def ? def.l : k.jenis, jenisLain: k.jenisLain, tabel: def ? def.t : "",
    tgl: k.tgl, sampai: k.sampai, ta: taKegiatan(k), olehNama: o ? o.nama : "(akun dihapus)", olehUser: o ? o.username : "", kelompok: k.kelompok,
    status: k.status, statusLabel: LABEL_STATUS_DATA[k.status] || k.status, st: k.st, dihitung: k.status === "disetujui",
    verifNama: v ? v.nama : "", tglVerif: k.tglVerif, gcet: (k.gcet || []).length, butir: butir,
    dibuat: k.dibuat ? new Date(k.dibuat).toISOString() : "" };
}

/** Data lain (bukan kegiatan) untuk satu butir. */
function dataLainButir(m, ts, X) {
  var kunci = (m.f && F_DATA[m.f]) || [], hasil = [], idx = null;
  kunci.forEach(function (k) {
    if (k === "dosen") {
      hasil.push({ kunci: k, judul: "Dosen (biodata dan Data Prodi › Data dosen TS)", menu: "dprodi",
        kolom: ["Nama", "NIP", "Status dosen", "Dihitung DTPS", "Jabatan", "S3", "Sertifikat kompetensi", "Pendidikan dasar sesuai", "Linier"],
        baris: X.dosen.map(function (x) { var t = X.dts[x.id] || {};
          return [x.nama, x.nip, x.status || "(belum diisi)", x.status === STATUS_TETAP[0] ? "Ya" : "Tidak", x.jabfung, x.pendS3 ? "Ya" : "", x.sertKomp ? "Ya" : "", teks(t.dasarSesuai), teks(t.linier)]; }) });
    } else if (k === "mhs") {
      var per = {}; X.mhs.forEach(function (p) { var a = teks(p.masuk) || "?"; per[a] = (per[a] || 0) + 1; });
      hasil.push({ kunci: k, judul: "Mahasiswa aktif (akun berstatus A) per angkatan", menu: "pengguna", kolom: ["Angkatan", "Jumlah"],
        baris: Object.keys(per).sort().map(function (a) { return [a, per[a]]; }).concat([["Jumlah", X.NM]]) });
    } else if (k === "mk") {
      hasil.push({ kunci: k, judul: "Kurikulum (Data Prodi › Kurikulum)", menu: "dprodi", kolom: ["Kode", "Mata kuliah", "Semester", "sks", "sks praktik", "MK kompetensi"],
        baris: X.mk.map(function (x) { return [x.kode, x.nama, x.semester, sksMk(x), x.sksPraktik, x.kompetensi ? "Ya" : ""]; }) });
    } else if (k === "lulusan") {
      hasil.push({ kunci: k, judul: "Lulusan (Data Prodi › Lulusan)", menu: "dprodi", kolom: ["NIM", "Nama", "Masuk", "Tanggal lulus", "IPK", "Waktu tunggu (bln)", "Kesesuaian", "Tempat kerja"],
        baris: X.lulusan.map(function (x) { return [x.nim, x.nama, x.masuk || "", x.tglLulus, x.ipk === null ? "" : x.ipk, x.wtBulan === null ? "" : x.wtBulan, x.kesesuaian, x.tempatKerja]; }) });
    } else if (k === "pmb") {
      hasil.push({ kunci: k, judul: "Penerimaan mahasiswa baru (Data Prodi › PMB)", menu: "dprodi", kolom: ["Tahun", "Daya tampung", "Pendaftar", "Lulus seleksi", "Diterima"],
        baris: X.pmb.map(function (x) { return [x.tahun, x.dayaTampung, x.pendaftar, x.lulusSeleksi, x.diterima]; }) });
    } else if (k === "dana") {
      hasil.push({ kunci: k, judul: "Keuangan TS-2 s.d. TS (Data Prodi › Keuangan, juta rupiah)", menu: "dprodi", kolom: ["TA", "Jenis", "UPPS", "Program studi"],
        baris: semua("Dana").filter(function (r) { return X.tsL.indexOf(Number(r.ta)) >= 0; }).map(function (r) { return [labelTa(Number(r.ta)), teks(r.jenis), r.upps, r.ps]; }) });
    } else if (k === "survei") {
      var jw = {}; semua("Jawaban").forEach(function (r) { jw[r.survei] = (jw[r.survei] || 0) + 1; });
      hasil.push({ kunci: k, judul: "Survei dan jumlah jawaban (menu Survei)", menu: "survei", kolom: ["Judul", "Tujuan", "Status", "Jawaban"],
        baris: semua("Survei").filter(function (r) { return !r.dihapus; }).map(function (r) { return [teks(r.judul), teks(r.tujuan), teks(r.status), jw[r.id] || 0]; }) });
    }
  });
  if (m.t !== "a") {
    var g = semua("SkorGpm").filter(function (r) { return Number(r.ts) === ts && Number(r.butir) === m.n; })[0];
    idx = idx || indeksOrang();
    hasil.push({ kunci: "gpm", judul: "Skor GPM (halaman Penilaian)", menu: "penilaian", kolom: ["Skor", "Catatan", "Oleh", "Waktu"],
      baris: g ? [[g.skor === "" ? "(kosong)" : g.skor, teks(g.catatan), (idx.byId[g.oleh] || {}).nama || "", g.waktu ? new Date(g.waktu).toISOString().slice(0, 10) : ""]] : [] });
  }
  var b = ringkasBank()[m.n];
  if (b) hasil.push({ kunci: "bank", judul: "Bank Dokumen butir " + m.n, menu: "bank", kolom: ["Dokumen berlaku", "Slot dokumen"], baris: [[b.ada, b.n]] });
  return hasil;
}

/* ---------- aksi ---------- */

function aksiSumberButir(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, PERAN_SUMBER_LIHAT);
  var ts = d.ts ? Number(d.ts) : tsAwal(), n = Number(d.butir), m = MATRIKS.filter(function (x) { return x.n === n; })[0];
  if (!(ts >= 2000 && ts < 2100)) throw galat("TS tidak valid.");
  if (!m) throw galat("Butir tidak dikenal.");
  var X = konteksNilai(ts), idx = indeksOrang(), peta = petaJenisButir(), nG = butirGcet();
  var fj = m.f ? F_JENIS[m.f] : null, dedJ = m.t === "a" ? [] : JENIS_KEG.filter(function (j) { return dedDariJenis(j).indexOf(Number(m.ded)) >= 0; }).map(function (j) { return j.k; });
  var cocok = function (k) {
    if (fj === "*") return (k.gcet || []).length > 0;
    return (fj && fj.indexOf(k.jenis) >= 0) || dedJ.indexOf(k.jenis) >= 0;
  };
  var keg = semuaKegiatan().filter(function (k) { return cocok(k) && dalamTs(k, ts, m.f === "suasana"); })
    .map(function (k) { var o = kegiatanSumber(k, idx, peta, nG); o.dihitungButir = !!(fj && o.dihitung && (fj === "*" || fj.indexOf(k.jenis) >= 0)); return o; });
  keg.sort(function (a, b) { return (b.dihitung - a.dihitung) || String(b.tgl).localeCompare(String(a.tgl)); });
  return { butir: { n: m.n, nm: m.nm, t: m.t, ded: m.ded, src: m.src, f: m.f || "" }, ts: { awal: ts, label: labelTa(ts) },
    jenis: (fj === "*" ? ["(semua jenis yang memilih pasal GCET)"] : (fj || []).concat(dedJ)).map(function (k) { var j = jenisDef(k); return j ? j.l : k; }),
    rentang: m.f === "suasana" ? "TA " + labelTa(ts) + " saja" : "TS-2 s.d. TS (" + labelTa(ts - 2) + " – " + labelTa(ts) + ")",
    kegiatan: keg, lain: dataLainButir(m, ts, X), bolehUbah: punyaPeran(p, ["superadmin"]) };
}

/** Semua kegiatan (semua status) dengan kategorinya. Super Admin. */
function aksiSumberKegiatan(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["superadmin"]);
  var idx = indeksOrang(), peta = petaJenisButir(), nG = butirGcet();
  var l = semuaKegiatan().map(function (k) { return kegiatanSumber(k, idx, peta, nG); });
  l.sort(function (a, b) { return String(b.dibuat).localeCompare(String(a.dibuat)); });
  var hitung = function (nama) { try { return semua(nama).filter(function (r) { return !r.dihapus; }).length; } catch (e) { return 0; } };
  var ringkas = [
    { judul: "Dosen", jumlah: daftarDosen().length, menu: "dprodi" },
    { judul: "Mahasiswa aktif", jumlah: semua("Pengguna").filter(function (x) { return x.status !== "nonaktif" && peranDari(x).indexOf("mahasiswa") >= 0 && (x.statusMhs || "A") === "A"; }).length, menu: "pengguna" },
    { judul: "Mata kuliah", jumlah: hitung("MataKuliah"), menu: "dprodi" },
    { judul: "Lulusan", jumlah: hitung("Lulusan"), menu: "dprodi" },
    { judul: "Data PMB (tahun)", jumlah: semua("Penerimaan").length, menu: "dprodi" },
    { judul: "Data keuangan (baris)", jumlah: semua("Dana").length, menu: "dprodi" },
    { judul: "Survei", jumlah: hitung("Survei"), menu: "survei" },
    { judul: "Jawaban survei", jumlah: semua("Jawaban").length, menu: "survei" },
    { judul: "Skor GPM", jumlah: semua("SkorGpm").filter(function (r) { return r.skor !== ""; }).length, menu: "penilaian" },
    { judul: "Dokumen Bank Dokumen", jumlah: semua("BankDokumen").length, menu: "bank" }];
  return { kegiatan: l, ringkas: ringkas, status: LABEL_STATUS_DATA, jenis: JENIS_KEG.map(function (j) { return { k: j.k, l: j.l }; }),
    butirNama: MATRIKS.map(function (m) { return { n: m.n, nm: m.nm }; }), terhapus: daftarTerhapus(idx) };
}
function daftarTerhapus(idx) {
  return semua("Kegiatan").filter(function (r) { return r.dihapus; }).map(function (r) {
    var k = kegiatanDari(r), o = idx.byId[k.olehId], h = (k.riwayat || []).filter(function (x) { return x.a === "hapus_sa" || x.a === "hapus"; }).pop();
    var oleh = h ? idx.byId[h.o] : null;
    return { id: k.id, judul: k.judul, jenisLabel: (jenisDef(k.jenis) || { l: k.jenis }).l, tgl: k.tgl, olehNama: o ? o.nama : "", status: k.status,
      waktuHapus: new Date(r.dihapus).toISOString(), alasan: h ? teks(h.c) : "Dihapus pengaju (draf)", dihapusOleh: oleh ? oleh.nama : (h ? "" : (o ? o.nama : "")) };
  }).sort(function (a, b) { return b.waktuHapus.localeCompare(a.waktuHapus); });
}

/** Super Admin memutuskan ulang status data kegiatan (termasuk yang sudah disetujui/ditolak). */
function aksiSumberTinjau(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["superadmin"]);
  var kep = String(d.keputusan || ""), cat = potong(d.catatan, 1000).trim();
  if (KEPUTUSAN_DATA.indexOf(kep) < 0) throw galat("Keputusan tidak dikenal.");
  if (kep !== "disetujui" && cat.length < 5) throw galat("Tulis alasan untuk pengunggah (minimal 5 huruf), wajib bila meminta revisi atau menolak.");
  return kunciTulis(function () {
    var k = ambilKegiatan(String(d.id || ""));
    if (k.st !== "terbit" && k.st !== "tanpa") throw galat("Kegiatan ini masih dalam proses surat tugas di Antrean KPS; status datanya belum bisa diputuskan.");
    if (k.status === kep) throw galat("Status data kegiatan ini sudah \"" + LABEL_STATUS_DATA[kep] + "\".");
    var dulu = k.status;
    k.status = kep; k.verifId = p.id; k.tglVerif = new Date().toISOString();
    k.riwayat.push({ w: k.tglVerif, o: p.id, a: kep, c: "Super Admin" + (cat ? ": " + cat : "") });
    simpanKegiatan(k);
    catat(p.id, "sumber.tinjau", { id: k.id, dari: dulu, ke: kep });
    return {};
  });
}
/** Hapus kegiatan (bisa banyak sekaligus). Tidak dibuang dari sheet: ditandai terhapus dan bisa dipulihkan. */
function aksiSumberHapus(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["superadmin"]);
  var ids = (Array.isArray(d.ids) ? d.ids : [d.id]).map(String).filter(Boolean), alasan = potong(d.alasan, 500).trim();
  if (!ids.length) throw galat("Pilih kegiatan yang akan dihapus.");
  if (ids.length > SUMBER_HAPUS_MAKS) throw galat("Maksimal " + SUMBER_HAPUS_MAKS + " kegiatan sekali hapus.");
  if (alasan.length < 5) throw galat("Tulis alasan penghapusan (minimal 5 huruf), misalnya: data uji coba.");
  return kunciTulis(function () {
    var peta = {}; semua("Kegiatan").forEach(function (r) { if (!r.dihapus) peta[r.id] = r; });
    var kurang = ids.filter(function (i) { return !peta[i]; });
    if (kurang.length) throw galat(kurang.length + " kegiatan tidak ditemukan atau sudah dihapus. Muat ulang halaman.");
    var kini = new Date();
    ids.forEach(function (i) {
      var r = peta[i], rw = jsonDari(r.riwayat, []);
      rw.push({ w: kini.toISOString(), o: p.id, a: "hapus_sa", c: alasan });
      ubah("Kegiatan", r, { dihapus: kini, riwayat: JSON.stringify(rw) });
    });
    catat(p.id, "sumber.hapus", { ids: ids, alasan: alasan });
    return { jumlah: ids.length };
  });
}
function aksiSumberPulihkan(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["superadmin"]);
  return kunciTulis(function () {
    var r = cari("Kegiatan", function (x) { return x.id === String(d.id || "") && x.dihapus; });
    if (!r) throw galat("Kegiatan terhapus tidak ditemukan.");
    var rw = jsonDari(r.riwayat, []);
    rw.push({ w: new Date().toISOString(), o: p.id, a: "pulihkan", c: "" });
    ubah("Kegiatan", r, { dihapus: "", riwayat: JSON.stringify(rw) });
    catat(p.id, "sumber.pulihkan", { id: r.id });
    return {};
  });
}
