// Uji v0.53.0: lampiran pengajuan surat, benchmarking boleh untuk dosen, mesin saran (konteks + frasa tidak berurutan), urut NIM bawaan,
// tautan rapat bisa diklik di undangan, posisi gulir tetap saat mencentang.
import fs from "node:fs";
import vm from "node:vm";
export async function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tD2, tSA }) {
  console.log("69. Lampiran pengajuan, jenis benchmarking, saran butir");
  const dsn = ID("199001152015041001");
  const pdf = n => Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(n || 40, 66)]).toString("base64");
  cek("kolom lampiranAju di akhir tabel Kegiatan; SKEMA_VERSI ≥ 35", g.sheets.Kegiatan[0].slice(-1)[0] === "lampiranAju" && Number(g.props.SKEMA_VERSI) >= 35);
  const ref = ok("kegiatan.ref", { peran: "dosen" }, tDsn);
  cek("jenis Benchmarking / studi banding kini bisa dipilih dosen; IAB/PPEPP tetap Admin", ref.jenis.find(j => j.k === "benchmark").boleh === true && ref.jenis.find(j => j.k === "iab").boleh === false);
  const data = { jenis: "benchmark", judul: "Benchmarking kurikulum ke Prodi Pariwisata kampus lain", tgl: "2026-12-10", tingkat: "Nasional", perluST: true,
    pegawai: [dsn], kelas: [], excl: [], tempat: "Yogyakarta", bentuk: "Benchmarking kurikulum" };
  let k = ok("kegiatan.simpan", { peran: "dosen", data }, tDsn).kegiatan;
  cek("draf baru: belum ada lampiran, pengaju boleh menambah", k.lampiranAju.length === 0 && k.bisaLampiranAju === true);
  cek("berkas yang isinya tidak sesuai ditolak; selain pengaju ditolak", /tidak sesuai/.test(salah("kegiatan.lampiranUnggah", { id: k.id, j: "Proposal", nama: "p.pdf", isi: Buffer.from("bukan pdf").toString("base64") }, tDsn))
    && /hanya bisa ditambah pengaju/.test(salah("kegiatan.lampiranUnggah", { id: k.id, j: "Proposal", nama: "p.pdf", isi: pdf() }, tKps)));
  k = ok("kegiatan.lampiranUnggah", { id: k.id, j: "Proposal", nama: "Proposal benchmarking.pdf", isi: pdf(200) }, tDsn).kegiatan;
  k = ok("kegiatan.lampiranUnggah", { id: k.id, j: "Jenis aneh", tautan: "https://drive.google.com/file/d/abc" }, tDsn).kegiatan;
  cek("lampiran tersimpan (berkas + tautan; jenis tak dikenal → Lainnya), tanpa fileId ke tampilan", k.lampiranAju.length === 2 && k.lampiranAju[0].nama === "Proposal benchmarking.pdf" && k.lampiranAju[1].j === "Lainnya"
    && !JSON.stringify(k.lampiranAju).includes("fileId") && /https:\/\//.test(salah("kegiatan.lampiranUnggah", { id: k.id, j: "Proposal", tautan: "http://x" }, tDsn)));
  k = ok("kegiatan.simpan", { peran: "dosen", kirim: true, data: { ...data, id: k.id } }, tDsn).kegiatan;
  cek("mengubah dan mengajukan kegiatan tidak menghapus lampiran; masih boleh menambah saat menunggu KPS", k.st === "menunggu_kps" && k.lampiranAju.length === 2 && k.bisaLampiranAju);
  const A = ok("kps.antrean", {}, tKps).kegiatan.find(x => x.id === k.id);
  cek("KPS melihat lampiran di antrean dan bisa membukanya", A && A.lampiranAju.length === 2 && ok("kegiatan.lampiranLihat", { id: k.id, lid: A.lampiranAju[0].id }, tKps).mime === "application/pdf"
    && ok("kegiatan.lampiranLihat", { id: k.id, lid: A.lampiranAju[1].id }, tKps).url === "https://drive.google.com/file/d/abc");
  cek("mahasiswa yang tidak terlibat tidak bisa membuka lampiran", /izin/.test(salah("kegiatan.lampiranLihat", { id: k.id, lid: A.lampiranAju[0].id }, tM)));
  k = ok("kegiatan.lampiranHapus", { id: k.id, lid: A.lampiranAju[1].id }, tDsn).kegiatan;
  cek("hapus lampiran + riwayat tercatat", k.lampiranAju.length === 1 && k.riwayat.some(r => r.aksi === "lampiran_aju_hapus"));
  for (let i = 0; i < 4; i++) ok("kegiatan.lampiranUnggah", { id: k.id, j: "Lainnya", tautan: "https://contoh.id/" + i }, tDsn);
  cek("maksimal 5 lampiran", /maksimal 5/.test(salah("kegiatan.lampiranUnggah", { id: k.id, j: "Lainnya", tautan: "https://contoh.id/x" }, tDsn)));
  ok("kps.putuskan", { id: k.id, keputusan: "terbit" }, tKps);
  const kt = ok("kegiatan.detail", { id: k.id }, tDsn).kegiatan;
  cek("setelah surat terbit: lampiran tetap terlihat, tidak bisa diubah", kt.lampiranAju.length === 5 && kt.bisaLampiranAju === false && /sebelum KPS/.test(salah("kegiatan.lampiranHapus", { id: k.id, lid: kt.lampiranAju[0].id }, tDsn)));
  cek("lampiran pengajuan tidak masuk lampiran surat", !JSON.stringify(kt.lampiran).includes("Proposal benchmarking"));

  // mesin saran
  const c = { window: {} }; c.globalThis = c; vm.createContext(c); vm.runInContext(fs.readFileSync("web/saran.js", "utf8"), c);
  const S = c.window.UPW_SARAN, top = (t, o) => S.butir(t, 4, o).map(x => x.n);
  cek("saran: benchmarking kurikulum → butir 7; kerja sama magang → 59", top("Benchmarking kurikulum ke kampus lain")[0] === 7 && top("Kerja sama dengan biro perjalanan untuk magang mahasiswa").slice(0, 3).includes(59));
  const t = "Evaluasi pelaksanaan kegiatan bersama mitra", tanpa = S.butir(t, 6), dengan = S.butir(t, 6, { konteks: [73] });
  cek("saran: konteks (jenis rapat/agenda) menaikkan butir yang cocok tanpa menambah yang tidak cocok", (dengan.findIndex(x => x.n === 73) <= Math.max(0, tanpa.findIndex(x => x.n === 73))) && dengan.every(x => tanpa.some(y => y.n === x.n)));
  cek("saran: frasa kamus dihitung walau kata tidak berurutan", top("kepuasan terhadap lulusan dari para pengguna").slice(0, 2).includes(42));
  const app = fs.readFileSync("web/aplikasi.js", "utf8");
  cek("tampilan: urut bawaan NIM, posisi kotak .gulir dipertahankan, tautan rapat <a href> di undangan, lampiran pengajuan di formulir/detail/antrean, saran sisa yang lemah disaring",
    /urut: "nim"/.test(app) && /kotak\[i\]\) e\.scrollTop = kotak\[i\]/.test(app) && /Daring: <a href="\$\{esc\(r\.tautan\)\}"/.test(app) && /function blokLampiranAju/.test(app) && /daftarLampiranAju\(k, false\)/.test(app)
    && /id="kfLamp"/.test(app) && /x\.skor >= 0\.45 \* atas/.test(app));
}
