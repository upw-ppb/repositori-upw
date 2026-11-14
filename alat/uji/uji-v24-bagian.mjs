// Uji v0.24.0: foto profil dan sumber data penilaian (Super Admin).
export function jalankan({ g, cek, ok, salah, tKps, tDsn, tAdm, tM, tSA }) {
  console.log("33. Foto profil");
  const jpg = n => "data:image/jpeg;base64," + Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(n)]).toString("base64");
  const png = "data:image/jpeg;base64," + Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]).toString("base64");
  cek("belum ada foto", ok("foto.saya", {}, tM).foto === "");
  cek("foto harus JPEG sah dan tidak terlalu besar", /bukan gambar JPEG/.test(salah("foto.simpan", { foto: png, kecil: jpg(100) }, tM))
    && /tidak sah/.test(salah("foto.simpan", { foto: "data:image/png;base64,AAAA", kecil: jpg(100) }, tM))
    && /terlalu besar/.test(salah("foto.simpan", { foto: jpg(40000), kecil: jpg(100) }, tM)));
  ok("foto.simpan", { foto: jpg(2000), kecil: jpg(300) }, tM);
  cek("mahasiswa memasang foto; terbaca kembali", ok("foto.saya", {}, tM).foto === jpg(2000));
  ok("foto.simpan", { foto: jpg(2500), kecil: jpg(310) }, tM);
  cek("ganti foto tidak menambah baris", g.sheets.FotoProfil.length === 2);
  ok("foto.simpan", { foto: jpg(1000), kecil: jpg(200) }, tDsn);
  const saya = ok("saya", {}, tM).pengguna.id, dsn = ok("saya", {}, tDsn).pengguna.id;
  const K = ok("foto.kecil", { ids: [saya, dsn, "tidakada"] }, tKps).foto;
  cek("foto kecil beberapa orang (Cari orang)", K[saya] === jpg(310) && K[dsn] === jpg(200) && !K.tidakada);
  ok("foto.hapus", {}, tM);
  cek("hapus foto", ok("foto.saya", {}, tM).foto === "" && !ok("foto.kecil", { ids: [saya] }, tKps).foto[saya]);

  console.log("34. Sumber data penilaian dan tindakan Super Admin");
  cek("Data Terkumpul hanya Super Admin", /izin/.test(salah("sumber.kegiatan", {}, tAdm)) && /izin/.test(salah("sumber.kegiatan", {}, tKps)));
  const D = ok("sumber.kegiatan", {}, tSA);
  cek("Data Terkumpul: semua kegiatan dengan kategori dan ringkasan data lain", D.kegiatan.length > 3 && D.kegiatan.every(k => k.jenisLabel && Array.isArray(k.butir)) && D.ringkas.length === 10);
  const pen = D.kegiatan.find(k => k.jenis === "penelitian");
  cek("kegiatan penelitian masuk butir 45, 46, 67 (dihitung)", pen && [45, 46, 67].every(n => pen.butir.some(b => b.n === n && b.cara === "dihitung")));
  const sua = D.kegiatan.find(k => k.jenis === "suasana") || { butir: [{ n: 63 }] };
  cek("kegiatan suasana masuk butir 63", sua.butir.some(b => b.n === 63));
  const ts = ok("penilaian.data", {}, tSA).ts.awal;
  const B10 = ok("sumber.butir", { ts, butir: 10 }, tAdm);
  cek("sumber butir 10 (Admin Prodi boleh lihat): tabel dosen, tanpa izin ubah", B10.lain.some(x => x.kunci === "dosen" && x.baris.length) && B10.bolehUbah === false && B10.kegiatan.length === 0);
  const B1 = ok("sumber.butir", { ts, butir: 1 }, tKps);
  cek("butir GPM: skor GPM dan kegiatan bahan (PPEPP/benchmark)", B1.lain.some(x => x.kunci === "gpm") && B1.jenis.some(j => /PPEPP|Benchmark/i.test(j)));
  cek("mahasiswa/dosen tidak bisa melihat sumber data", /izin/.test(salah("sumber.butir", { ts, butir: 10 }, tM)) && /izin/.test(salah("sumber.butir", { ts, butir: 10 }, tDsn)));
  const setuju = D.kegiatan.find(k => k.status === "disetujui");
  cek("ada kegiatan disetujui untuk diuji", !!setuju);
  cek("hanya Super Admin yang bisa meninjau ulang/hapus", /izin/.test(salah("sumber.tinjau", { id: setuju.id, keputusan: "revisi", catatan: "Data uji" }, tAdm)) && /izin/.test(salah("sumber.hapus", { ids: [setuju.id], alasan: "data uji coba" }, tAdm)));
  cek("revisi/tolak wajib alasan; status sama ditolak", /alasan/.test(salah("sumber.tinjau", { id: setuju.id, keputusan: "revisi", catatan: "" }, tSA)) && /sudah/.test(salah("sumber.tinjau", { id: setuju.id, keputusan: "disetujui" }, tSA)));
  ok("sumber.tinjau", { id: setuju.id, keputusan: "revisi", catatan: "Periksa lagi tanggal dan bukti" }, tSA);
  let k = ok("sumber.kegiatan", {}, tSA).kegiatan.find(x => x.id === setuju.id);
  cek("Super Admin meminta revisi atas data yang sudah disetujui: tidak lagi dihitung", k.status === "revisi" && !k.dihitung);
  const rk = ok("kps.riwayat", {}, tSA).riwayat.find(r => r.id === setuju.id && r.keputusan === "revisi");
  cek("tercatat di Riwayat keputusan dengan alasan", rk && /Super Admin: Periksa/.test(rk.catatan));
  ok("sumber.tinjau", { id: setuju.id, keputusan: "disetujui" }, tSA);
  cek("Super Admin menerima kembali", ok("sumber.kegiatan", {}, tSA).kegiatan.find(x => x.id === setuju.id).status === "disetujui");
  cek("hapus wajib alasan", /alasan/.test(salah("sumber.hapus", { ids: [setuju.id], alasan: "" }, tSA)));
  const n0 = ok("ilkps.data", { ts }, tSA).jumlahDisetujui;
  ok("sumber.hapus", { ids: [setuju.id], alasan: "Data uji coba terselip" }, tSA);
  const D2 = ok("sumber.kegiatan", {}, tSA);
  cek("hapus: hilang dari daftar dan iLKPS; masuk daftar terhapus dengan alasan", !D2.kegiatan.some(x => x.id === setuju.id) && D2.terhapus.some(x => x.id === setuju.id && /uji coba/.test(x.alasan)) && ok("ilkps.data", { ts }, tSA).jumlahDisetujui <= n0);
  cek("kegiatan terhapus tidak bisa dibuka pengaju", /tidak ditemukan/.test(salah("kegiatan.detail", { id: setuju.id }, tSA)));
  cek("hapus ulang ditolak", /tidak ditemukan/.test(salah("sumber.hapus", { ids: [setuju.id], alasan: "lagi lagi" }, tSA)));
  ok("sumber.pulihkan", { id: setuju.id }, tSA);
  const D3 = ok("sumber.kegiatan", {}, tSA);
  cek("pulihkan: kembali dengan status semula", D3.kegiatan.some(x => x.id === setuju.id && x.status === "disetujui") && !D3.terhapus.some(x => x.id === setuju.id));
  cek("migrasi: FotoProfil; SKEMA_VERSI 19", g.sheets.FotoProfil && g.props.SKEMA_VERSI === "19");
}
