/**
 * Impor massal dari Excel (v0.18.0). Tampilan membaca berkas .xlsx (templat dari aplikasi), lalu mengirim baris ke aksi yang sudah ada
 * (admin.impor, dp.mkSimpan, lul.impor) atau ke aksi di bawah ini.
 * Templat memakai kepala kolom "Label [kunci]"; kunci di dalam kurung siku dipakai untuk mencocokkan kolom.
 */

/** Kolom templat biodata dosen/tendik (dari skema BIO_PEG; kolom yang dibaca dari akun tidak ikut kecuali nama). */
function kolomBiodataPegawai() {
  var l = [{ k: "nip", l: "NIP / nomor pegawai", wajib: 1, hint: "Harus sama dengan NIP akun yang sudah diimpor" }];
  BIO_PEG.forEach(function (g) { g.f.forEach(function (f) {
    if (f.t === "ro") return;
    l.push({ k: f.k, l: f.l, o: f.o || null, untuk: f.untuk || g.untuk || "", hint: f.hint || "", req: f.req ? 1 : 0 });
  }); });
  return l;
}
function aksiImporTemplat(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["superadmin", "admin"]);
  return { biodataPegawai: kolomBiodataPegawai() };
}

/** Super Admin / Admin Prodi: isi atau perbarui biodata banyak dosen/tendik sekaligus. Sel kosong = tidak mengubah isian lama. */
function aksiBiodataMassal(d, token) {
  var p0 = penggunaDariToken(token);
  wajibPeran(p0, ["superadmin", "admin"]);
  var baris = Array.isArray(d.baris) ? d.baris : [];
  if (!baris.length) throw galat("Tidak ada data untuk diimpor.");
  if (baris.length > 300) throw galat("Maksimal 300 baris per impor.");
  return kunciTulis(function () {
    var akun = {}; semua("Pengguna").forEach(function (x) { akun[normalUser(x.username)] = x; });
    var ok = 0, lewati = [], kini = new Date();
    baris.forEach(function (r, i) {
      try {
        var p = akun[normalUser(r.nip)];
        if (!p) throw galat("NIP tidak terdaftar sebagai akun");
        if (jenisBiodata(p) !== "pegawai") throw galat("Akun ini bukan dosen/tendik");
        var skema = skemaUntuk(p), b = ambilBaris("pegawai", p.id), rekam = { userId: p.id, diubahPada: kini };
        kunciSimpan(BIO_PEG).concat(kunciSimpan(BIO_PEG, true)).forEach(function (k) { rekam[k] = b ? b[k] : ""; });
        rekam.lama = b ? b.lama : "";
        var nama = p.nama;
        skema.forEach(function (g) { g.f.forEach(function (f) {
          if (f.t === "ro") return;
          var v = r[f.k]; if (v === undefined || v === null || String(v).trim() === "") return;
          var bersih = bersihkan(f, v, r);
          if (f.k === "nama") nama = bersih; else rekam[f.k] = bersih;
        }); });
        if (b) ubah("BiodataPegawai", b, rekam); else tambah("BiodataPegawai", rekam);
        var kurang = kurangDari(p, nilaiBiodata(Object.assign({}, p, { nama: nama }), rekam));
        ubah("Pengguna", p, { nama: nama, biodataLengkap: kurang.length === 0, biodataPada: kini, diubahPada: kini });
        ok++;
      } catch (e) { lewati.push({ baris: i + 1, nip: teks(r.nip), alasan: e.message }); }
    });
    catat(p0.id, "biodata.massal", { jumlah: ok, dilewati: lewati.length });
    return { diperbarui: ok, dilewati: lewati };
  });
}

/** Daftar akun untuk diunduh ke Excel (Super Admin: semua; Admin Prodi: mahasiswa). */
function aksiAdminEksporAkun(d, token) {
  var p = penggunaDariToken(token);
  wajibPeran(p, ["superadmin", "admin"]);
  var sa = punyaPeran(p, ["superadmin"]);
  var l = semua("Pengguna").filter(function (x) { return sa || peranDari(x).indexOf("mahasiswa") >= 0; }).map(function (x) {
    return [String(x.username), x.nama, sa ? peranDari(x).join(", ") : "mahasiswa", teks(x.masuk), teks(x.kelas), teks(x.statusMhs), x.status,
      teks(x.email), x.emailTerverifikasi === true || x.emailTerverifikasi === "TRUE" ? "Ya" : x.emailTerverifikasi === "tertunda" ? "Belum (tertunda)" : "Tidak",
      x.biodataLengkap === true || x.biodataLengkap === "TRUE" ? "Lengkap" : "Belum", x.masukTerakhir ? Utilities.formatDate(new Date(x.masukTerakhir), "Asia/Makassar", "yyyy-MM-dd HH:mm") : ""];
  });
  catat(p.id, "admin.eksporAkun", { jumlah: l.length });
  return { kepala: ["NIM/NIP", "Nama", "Peran", "Tahun masuk", "Kelas", "Status mahasiswa", "Status akun", "Email", "Email terverifikasi", "Biodata", "Masuk terakhir"], baris: l };
}
