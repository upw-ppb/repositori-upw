// Uji v0.57.0: praktisi — inisial tiga huruf (unik dengan dosen), SK/surat tugas per semester, sertifikat banyak berkas,
// kelengkapan per praktisi, pengingat Beranda bila praktisi mengajar semester berjalan tanpa SK.
import fs from "node:fs";
export async function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tD2, tSA }) {
  console.log("73. Praktisi: inisial, SK per semester, sertifikat banyak, kelengkapan");
  const C = g.ctx, pdf = n => Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(n || 40, 66)]).toString("base64");
  cek("migrasi: kolom inisial di akhir tabel Praktisi; SKEMA_VERSI 37", g.sheets.Praktisi[0].slice(-1)[0] === "inisial" && Number(g.props.SKEMA_VERSI) >= 37);
  const dasar = { nama: "Wayan Uji Praktisi Inisial, S.Tr.Par.", perusahaan: "PT Uji Inisial", pendidikan: "D4 UPW", bidang: "Ticketing", sertifikat: "", jabatan: "Manager", pengalaman: "8", memimpinTim: true };
  cek("inisial harus tepat 3 huruf", /tepat 3 huruf/.test(salah("dp.praktisiSimpan", { data: { ...dasar, inisial: "AB" } }, tAdm)) && /tepat 3 huruf/.test(salah("dp.praktisiSimpan", { data: { ...dasar, inisial: "A1C" } }, tAdm)));
  let D = ok("dp.data", {}, tAdm);
  const dIns = D.dosen.find(x => /^[A-Z]{3}$/.test(x.inisial || ""));
  if (dIns) cek("inisial yang sudah dipakai dosen ditolak (huruf kecil pun)", new RegExp("sudah dipakai .*\\(dosen\\)").test(salah("dp.praktisiSimpan", { data: { ...dasar, inisial: dIns.inisial.toLowerCase() } }, tAdm)));
  ok("dp.praktisiSimpan", { data: { ...dasar, inisial: "wup" } }, tAdm);
  D = ok("dp.data", {}, tAdm);
  let x = D.praktisi.find(p => p.nama === dasar.nama);
  cek("inisial tersimpan huruf kapital; kelengkapan awal mendaftar bukti yang belum ada", x && x.inisial === "WUP" && x.kurang.includes("CV belum ada") && x.kurang.includes("Dokumen kerja sama dengan perusahaan belum ada") && !x.kurang.some(k => /Inisial/.test(k)), x && x.kurang);
  cek("praktisi lain tidak boleh memakai inisial yang sama", /sudah dipakai Wayan Uji Praktisi Inisial.*\(praktisi\)/.test(salah("dp.praktisiSimpan", { data: { ...dasar, nama: "Praktisi Lain", inisial: "WUP" } }, tAdm)));
  ok("dp.praktisiSimpan", { data: { ...dasar, id: x.id, inisial: "WUP" } }, tAdm);
  cek("menyimpan ulang praktisi yang sama dengan inisialnya sendiri boleh", true);
  // dosen tidak boleh mengganti inisial menjadi milik praktisi
  const bs = ok("biodata.saya", {}, tD2).biodata, isi = Object.assign({}, bs.data, { inisial: "WUP" });
  cek("dosen tidak bisa memakai inisial praktisi di biodata", /sudah dipakai Wayan Uji Praktisi Inisial/.test(salah("biodata.simpan", { data: isi }, tD2)));
  // bukti lama: sertifikat satu objek → daftar; kerjasama lama ditandai
  const r = C.cari("Praktisi", y => y.id === x.id);
  C.ubah("Praktisi", r, { bukti: JSON.stringify({ sertifikat: { t: "tautan", url: "https://drive.google.com/sert-lama", o: "", w: "2026-01-01" }, kerjasama: { t: "tautan", url: "https://drive.google.com/ks-lama", o: "", w: "2026-01-01" } }) }); C._isi = {};
  x = ok("dp.data", {}, tAdm).praktisi.find(p => p.id === x.id);
  cek("data lama: sertifikat satu berkas terbaca sebagai daftar; dokumen kerja sama lama ditandai 'lama'", Array.isArray(x.bukti.sertifikat) && x.bukti.sertifikat.length === 1 && x.bukti.sertifikat[0].id === "e0"
    && x.bukti.kerjasama.lama === 1 && !x.kurang.some(k => /kerja sama/.test(k)));
  // banyak berkas
  ok("dp.praktisiBukti", { id: x.id, slot: "pelatihan", berkas: { nama: "Pelatihan A.pdf", isi: pdf() } }, tAdm);
  let j = ok("dp.praktisiBukti", { id: x.id, slot: "pelatihan", berkas: { nama: "Pelatihan B.pdf", isi: pdf(60) } }, tAdm);
  cek("sertifikat pelatihan: dua berkas tersimpan berdampingan", j.bukti.pelatihan.length === 2 && j.bukti.pelatihan.map(q => q.nama).join() === "Pelatihan A.pdf,Pelatihan B.pdf" && j.bukti.pelatihan[0].id !== j.bukti.pelatihan[1].id);
  const [pa, pb] = j.bukti.pelatihan;
  const L = ok("dp.praktisiBuktiLihat", { id: x.id, slot: "pelatihan", eid: pb.id }, tKps);
  cek("buka salah satu berkas pelatihan (KPS)", L.nama === "Pelatihan B.pdf" && L.mime === "application/pdf");
  cek("hapus berkas di slot banyak wajib menyebut berkasnya", /Pilih berkas/.test(salah("dp.praktisiBukti", { id: x.id, slot: "pelatihan", hapus: true }, tAdm)));
  const fA = Object.values(g.files).find(f => f.nama === "pelatihan - Pelatihan A.pdf");
  j = ok("dp.praktisiBukti", { id: x.id, slot: "pelatihan", eid: pa.id, hapus: true }, tAdm);
  cek("hapus satu berkas pelatihan: yang lain tetap, berkas ke sampah Drive", j.bukti.pelatihan.length === 1 && j.bukti.pelatihan[0].nama === "Pelatihan B.pdf" && fA && fA.terbuang === true);
  ok("dp.praktisiBukti", { id: x.id, slot: "sertifikat", tautan: "https://drive.google.com/sert-baru" }, tAdm);
  cek("sertifikat profesi: tambahan tidak menimpa berkas lama", ok("dp.data", {}, tAdm).praktisi.find(p => p.id === x.id).bukti.sertifikat.length === 2);
  // SK per semester + tim semester berjalan
  const smt = D.smtKini, timK = ok("dp.data", { semester: smt }, tAdm).tim.find(t => !t.tanpaTim && !(t.kelompok || []).length);
  ok("dp.timSimpan", { semester: smt, kodeMk: timK.kode, anggota: [{ t: "u", id: ID("199001152015041001") }, { t: "p", id: x.id }] }, tAdm);
  x = ok("dp.data", {}, tAdm).praktisi.find(p => p.id === x.id);
  const lblSk = "SK " + D.labelSmtKini + " belum ada";
  cek("praktisi di tim semester berjalan tanpa SK: tercantum di kelengkapan", x.diTimKini === true && x.kurang.includes(lblSk), x.kurang);
  let T = ok("tugas.saya", {}, tAdm);
  cek("Beranda Admin Prodi: pengingat praktisi tanpa SK (nama + inisial)", T.prakTanpaSk && T.prakTanpaSk.semester === smt && T.prakTanpaSk.daftar.some(q => q.id === x.id && q.inisial === "WUP"));
  cek("Beranda KPS juga; dosen dan mahasiswa tidak", !!ok("tugas.saya", {}, tKps).prakTanpaSk && !ok("tugas.saya", {}, tDsn).prakTanpaSk && !ok("tugas.saya", {}, tM).prakTanpaSk);
  cek("SK wajib menyebut semester yang valid", /Pilih semester/.test(salah("dp.praktisiBukti", { id: x.id, slot: "sk", berkas: { nama: "SK.pdf", isi: pdf() } }, tAdm)));
  const smtLain = D.pilihanSemester.find(q => q.kode !== smt).kode;
  ok("dp.praktisiBukti", { id: x.id, slot: "sk", semester: smtLain, berkas: { nama: "SK lain.pdf", isi: pdf() } }, tAdm);
  cek("SK semester lain tidak menghapus pengingat semester berjalan", !!ok("tugas.saya", {}, tAdm).prakTanpaSk);
  j = ok("dp.praktisiBukti", { id: x.id, slot: "sk", semester: smt, berkas: { nama: "SK mengajar.pdf", isi: pdf() } }, tAdm);
  const fSk = Object.values(g.files).find(f => f.nama === `sk ${smt} - SK mengajar.pdf`);
  cek("SK tersimpan per semester (dua semester berdampingan), nama berkas memuat semester; kelengkapan diperbarui di jawaban", j.bukti.sk[smt].nama === "SK mengajar.pdf" && j.bukti.sk[smtLain] && fSk && !j.kurang.includes(lblSk));
  T = ok("tugas.saya", {}, tAdm);
  cek("setelah SK diunggah, pengingat Beranda hilang", !(T.prakTanpaSk && T.prakTanpaSk.daftar.some(q => q.id === x.id)));
  cek("buka SK per semester", ok("dp.praktisiBuktiLihat", { id: x.id, slot: "sk", semester: smt }, tKps).nama === "SK mengajar.pdf");
  const fSk2 = Object.values(g.files).find(f => f.nama === `sk ${smtLain} - SK lain.pdf`);
  j = ok("dp.praktisiBukti", { id: x.id, slot: "sk", semester: smtLain, hapus: true }, tAdm);
  cek("hapus SK satu semester: semester lain tetap", !j.bukti.sk[smtLain] && j.bukti.sk[smt] && fSk2.terbuang === true);
  // tim memakai inisial praktisi
  const app = fs.readFileSync("web/aplikasi.js", "utf8");
  cek("tampilan: isian inisial, slot SK per semester dan banyak berkas, kolom Kelengkapan, pengingat Beranda, inisial di tim dan pencocok templat",
    /id="prIns"|f\("prIns"/.test(app) && /data-psmt/.test(app) && /\+ Tambah file/.test(app) && /<th>Kelengkapan<\/th>/.test(app) && /prakTanpaSk/.test(app)
    && /labelPrakLama\(x\), x\.nama, x\.inisial/.test(app) && /x\.inisial \? x\.inisial \+ ", " : ""\) \+ "praktisi\)"/.test(app));
}
