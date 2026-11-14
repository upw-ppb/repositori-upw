// Uji v0.13.0: DED.
export function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tD2, tSA }) {
  console.log("23. DED");
  cek("mahasiswa dan dosen tanpa tugas tidak bisa membuka", /izin/.test(salah("ded.data", {}, tM)) && /izin/.test(salah("ded.data", {}, tD2)));
  let D = ok("ded.data", {}, tAdm);
  cek("64 butir dengan petunjuk; tabel ditempatkan (butir 10: Tabel 1–3; 51: Tabel 22)", D.butir.length === 64 && D.butir.every(b => b.petunjuk.length > 20) && D.butir[9].tabel.join() === "1,2,3" && D.butir[50].tabel.join() === "22", D.butir[9]);
  cek("33 kode tabel tersebar tanpa ganda", (() => { const t = D.butir.flatMap(b => b.tabel); return t.length === 33 && new Set(t).size === 33; })());
  cek("butir terkait matriks (butir 1 → matriks 1)", D.butir[0].matriks.some(m => m.n === 1 && m.s4));
  cek("identitas bawaan: PT dan PS terisi", D.identitas.find(x => x.k === "pt").v === "Politeknik Pariwisata Bali" && D.identitas.find(x => x.k === "ps").v === "Usaha Perjalanan Wisata");
  let j = ok("ded.simpan", { butir: 1, teks: "Prodi UPW telah melaksanakan SPMI dengan lima aspek.", status: "draf", versi: "" }, tAdm);
  const v1 = j.diubah;
  cek("simpan narasi: status draf, jumlah kata", (D = ok("ded.data", {}, tAdm)).butir[0].status === "draf" && D.butir[0].kata === 8 && D.butir[0].diubah === v1, D.butir[0]);
  cek("versi lama ditolak (tidak saling menimpa)", /sudah diubah/.test(salah("ded.simpan", { butir: 1, teks: "x", versi: "2020-01-01T00:00:00.000Z" }, tKps)));
  j = ok("ded.simpan", { butir: 1, teks: "Narasi butir 1 diperbarui KPS.", status: "selesai", versi: v1 }, tKps);
  cek("KPS menyimpan dengan versi terbaru", ok("ded.data", {}, tAdm).butir[0].status === "selesai");
  cek("dosen tidak bisa menunjuk PJ", /izin|Hanya Admin|bukan penanggung jawab/.test(salah("ded.simpan", { butir: 30, pj: ID("199001152015041001") }, tDsn)));
  ok("ded.simpan", { butir: 30, pj: ID("199001152015041001") }, tAdm);
  D = ok("ded.data", {}, tDsn);
  cek("dosen PJ melihat hanya butirnya", !D.kelola && D.butir.length === 1 && D.butir[0].n === 30, D.butir.map(b => b.n));
  const v30 = D.butir[0].diubah;
  ok("ded.simpan", { butir: 30, teks: "Penelitian DTPS 3 tahun terakhir…", status: "draf", versi: v30 }, tDsn);
  cek("dosen PJ tidak bisa menulis butir lain", /bukan penanggung jawab/.test(salah("ded.simpan", { butir: 31, teks: "x" }, tDsn)));
  cek("dosen PJ tidak bisa memindah PJ", /Hanya Admin/.test(salah("ded.simpan", { butir: 30, pj: "", versi: ok("ded.data", {}, tDsn).butir[0].diubah }, tDsn)));
  cek("butir tak dikenal ditolak", /tidak dikenal/.test(salah("ded.simpan", { butir: 65, teks: "x" }, tAdm)));
  cek("status tak dikenal ditolak", /Status/.test(salah("ded.simpan", { butir: 2, status: "x" }, tAdm)));
  ok("ded.identitas", { identitas: { upps: "Jurusan Kepariwisataan", skPs: "123/2010", tahun: "2027", asing: "abaikan" },
    daftarPs: [{ nama: "Usaha Perjalanan Wisata", jenis: "Sarjana Terapan", peringkat: "Baik Sekali", mhs: "240" }, { nama: "" }],
    tim: [{ userId: ID("197911302005012001"), nidn: "0830117901", jabatan: "Koordinator Program Studi", tanggal: "2026-11-13" }, { nama: "Penyusun luar", jabatan: "GPM" }] }, tAdm);
  D = ok("ded.data", {}, tAdm);
  cek("identitas, daftar PS, tim tersimpan (nama tim dari akun)", D.identitas.find(x => x.k === "upps").v === "Jurusan Kepariwisataan" && D.daftarPs.length === 1 && D.daftarPs[0].mhs === 240 && D.tim.length === 2 && /Widiastuti/.test(D.tim[0].nama) && D.tim[1].tanggal === "");
  cek("KPS boleh mengubah identitas; dosen tidak", /izin/.test(salah("ded.identitas", { identitas: {} }, tDsn)));
  cek("migrasi: DedNarasi", !!g.sheets.DedNarasi);
}
