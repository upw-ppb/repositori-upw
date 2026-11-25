// Uji v0.52.0: siklus mutu survei — usulan pembahasan → agenda rapat (sv) → keputusan "umumkan" → tindak lanjut → publikasi di Hasil Survei & Perbaikan.
import fs from "node:fs";
export async function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tD2, tSA }) {
  console.log("68. Publikasi hasil survei dan keterkaitan dengan rapat");
  const T = ok("survei.daftar", {}, tAdm).templat, dsn = ID("199001152015041001");
  const hari = n => new Date(Date.now() + n * 864e5).toLocaleDateString("sv-SE", { timeZone: "Asia/Makassar" });
  cek("tabel PublikasiSurvei ada; SKEMA_VERSI ≥ 34", (g.sheets.PublikasiSurvei || [[]])[0].join() === "id,survei,judul,ringkas,temuan,kesimpulan,sasaran,status,terbit,oleh,dibuat,diubah,baca" && Number(g.props.SKEMA_VERSI) >= 34);
  const id = ok("survei.simpan", { data: { ...T.t22, judul: "Kepuasan uji v52", buka: hari(0), tutup: hari(10) } }, tAdm).id;
  ok("survei.status", { id, aksi: "buka" }, tAdm);
  const soal = ok("survei.ambil", { id }, tM).survei.soal;
  const jaw = v => Object.fromEntries(soal.filter(q => q.wajib || q.t === "likert").map(q => [q.id, q.t === "likert" ? v : q.t === "centang" ? [q.opsi[0]] : q.opsi ? q.opsi[0] : "ok"]));
  const C = g.ctx, tok = [tM];
  for (let i = 0; i < 4; i++) { const nim = "25993" + i; ok("admin.impor", { baris: [{ username: nim, nama: "Mhs V52 " + i, masuk: 2025, kelas: "A" }] }, tAdm); tok.push(ok("masuk", { username: nim, sandi: nim }).token);
    C.ubah("Pengguna", C.cari("Pengguna", x => String(x.username) === nim), { status: "aktif", wajibGanti: false }); C._isi = {}; }
  tok.forEach((t, i) => ok("survei.jawab", { id, jawaban: jaw(i < 3 ? 2 : 3) }, t));
  cek("publikasi hanya setelah survei ditutup", /setelah survei ditutup/.test(salah("pub.simpan", { survei: id, kesimpulan: "Kesimpulan uji yang cukup panjang.", sasaran: ["mahasiswa"], terbit: true }, tKps)));
  cek("belum ditutup → belum diusulkan untuk rapat", !ok("mutu.usulan", {}, tKps).survei.some(s => s.id === id));
  ok("survei.status", { id, aksi: "tutup" }, tAdm);
  const U = ok("mutu.usulan", {}, tKps).survei.find(s => s.id === id);
  cek("usulan pembahasan: variabel di bawah Baik, butir 71/78, teks agenda, belum dibahas", U && U.usulan.some(t => /di bawah Baik/.test(t)) && U.butir.join() === "71,78" && /^Pembahasan hasil Kepuasan uji v52/.test(U.agenda) && U.rapat.length === 0 && !U.terbit);
  cek("usulan rapat hanya untuk pengelola", /izin/.test(salah("mutu.usulan", {}, tDsn)));
  let tg = ok("tugas.saya", {}, tKps);
  cek("Beranda KPS: survei belum dibahas dan belum dipublikasikan", tg.svBelumDibahas.some(x => x.id === id) && tg.svBelumTerbit.some(x => x.id === id && !x.dibahas));
  cek("Beranda mahasiswa: tanpa pengingat pengelola", ok("tugas.saya", {}, tM).svBelumDibahas === undefined);
  // rapat dengan agenda dari survei
  const kini = ok("rapat.ref", {}, tAdm).hariIni;
  const rid = ok("rapat.simpan", { data: { jenis: "survei", judul: "Rapat tindak lanjut survei v52", tgl: kini, jamMulai: "09:00", tempat: "Ruang Prodi",
    agenda: [{ t: U.agenda, butir: U.butir, sv: id }, { t: "Lain-lain", butir: [], sv: "tidak-ada" }], peserta: { u: [dsn], kelas: [], tamu: [] } } }, tAdm).id;
  const rp = ok("rapat.detail", { id: rid }, tAdm).rapat;
  cek("agenda menyimpan id survei (id tidak dikenal dibuang)", rp.agenda[0].sv === id && rp.agenda[1].sv === "");
  ok("rapat.terbit", { id: rid }, tKps);
  cek("setelah diagendakan: usulan mencatat rapatnya; pengingat 'belum dibahas' hilang", ok("mutu.usulan", {}, tKps).survei.find(s => s.id === id).rapat[0].id === rid && !ok("tugas.saya", {}, tKps).svBelumDibahas.some(x => x.id === id));
  ok("rapat.risalahSimpan", { id: rid, risalah: { pimpinan: "KPS", notulis: "Admin", agenda: [{ pembahasan: "Daya tanggap rendah.", keputusan: [
    { t: "Layanan konsultasi akademik dibuka setiap Rabu", pj: dsn, tenggat: "2027-02-01", pub: true },
    { t: "Evaluasi internal staf administrasi", pj: dsn, pub: false },
    { t: "Hasil survei disosialisasikan di kelas", pj: "", pub: true }] }, { pembahasan: "-", keputusan: [{ t: "Rapat prodi bulanan diumumkan di grup", pj: "", pub: true }] }] } }, tAdm);
  const D0 = ok("pub.data", { survei: id }, tKps);
  cek("sebelum risalah final: keputusan belum tampil", D0.tindakLanjut.length === 0 && D0.rapat[0].final === false && D0.pratinjau.n === 5 && D0.pratinjau.lemah.length > 0);
  ok("rapat.risalahFinal", { id: rid }, tKps);
  const D = ok("pub.data", { survei: id }, tKps);
  cek("keputusan bertanda umumkan pada agenda survei tampil dengan status tindak lanjut (tanpa nama PJ)", D.tindakLanjut.length === 2 && D.tindakLanjut[0].status === "belum" && D.tindakLanjut[1].status === "dicatat"
    && !JSON.stringify(D.tindakLanjut).includes(dsn) && !D.tindakLanjut.some(k => /Evaluasi internal/.test(k.t)));
  cek("GKM melihat tetapi tidak boleh menerbitkan; dosen tidak bisa membuka", ok("pub.data", { survei: id }, tD2).bolehUbah === false && /izin/.test(salah("pub.simpan", { survei: id }, tD2))
    && /izin/.test(salah("pub.data", { survei: id }, tDsn)) && /izin/.test(salah("pub.simpan", { survei: id }, tDsn)));
  cek("terbit wajib kesimpulan dan pembaca", /kesimpulan/.test(salah("pub.simpan", { survei: id, kesimpulan: "pendek", sasaran: ["mahasiswa"], terbit: true }, tKps))
    && /pembaca/.test(salah("pub.simpan", { survei: id, kesimpulan: "Mahasiswa cukup puas, daya tanggap perlu diperbaiki.", sasaran: ["x"], terbit: true }, tKps)));
  ok("pub.simpan", { survei: id, kesimpulan: "Draf awal kesimpulan.", temuan: "", sasaran: ["mahasiswa"] }, tKps);
  cek("draf tidak tampil untuk mahasiswa", !ok("mutu.daftar", {}, tM).publikasi.some(x => x.survei === id));
  ok("pub.simpan", { survei: id, kesimpulan: "Mahasiswa cukup puas, daya tanggap perlu diperbaiki.", temuan: "Perlu perbaikan: daya tanggap.", sasaran: ["mahasiswa", "dosen"], terbit: true }, tKps);
  const pb = g.sheets.PublikasiSurvei.slice(1).find(r => r[1] === id), kol = g.sheets.PublikasiSurvei[0];
  const R = JSON.parse(pb[kol.indexOf("ringkas")]);
  cek("potret angka tersimpan saat terbit: agregat saja (tanpa jawaban perorangan/teks)", pb[kol.indexOf("status")] === "terbit" && R.n === 5 && R.variabel.length >= 5 && !("jawaban" in R) && !JSON.stringify(R).includes(ID("250103")));
  cek("mahasiswa dan dosen menerima pengingat publikasi baru; tendik/asesor tidak dihitung sebagai sasaran", ok("tugas.saya", {}, tM).mutuBaru >= 1 && ok("tugas.saya", {}, tDsn).mutuBaru >= 1);
  const M = ok("mutu.daftar", {}, tM), x = M.publikasi.find(y => y.survei === id);
  cek("dashboard mahasiswa: publikasi + 'yang kami lakukan'; tanpa hitungan pembaca", x && x.kesimpulan.startsWith("Mahasiswa cukup puas") && x.tindakLanjut.length === 2 && x.jumlahBaca === undefined && !x.sudahBaca);
  cek("keputusan umum (bukan agenda survei) bertanda umumkan tampil terpisah", M.keputusan.some(k => /Rapat prodi bulanan/.test(k.t)) && !M.keputusan.some(k => /konsultasi akademik/.test(k.t)) && !("sv" in M.keputusan[0]));
  ok("mutu.baca", { id: x.id }, tM); ok("mutu.baca", { id: x.id }, tM);
  const xk = ok("mutu.daftar", {}, tKps).publikasi.find(y => y.survei === id);
  cek("pembaca dicatat sekali; pengelola melihat jumlah per kelompok", xk.jumlahBaca === 1 && xk.pembaca.mahasiswa === 1 && ok("mutu.daftar", {}, tM).publikasi.find(y => y.survei === id).sudahBaca === true);
  tg = ok("tugas.saya", {}, tKps);
  cek("setelah terbit: pengingat 'belum dipublikasikan' hilang; kartu survei bertanda terbit", !tg.svBelumTerbit.some(x => x.id === id) && ok("survei.daftar", {}, tAdm).survei.find(s => s.id === id).terbit === true);
  // tindak lanjut selesai → status terbaru tampil
  const tlId = g.sheets.TindakLanjut.slice(1).find(r => /konsultasi akademik/.test(r[1]))[0];
  ok("tl.status", { id: tlId, status: "berjalan" }, tDsn);
  cek("status tindak lanjut di publikasi ikut diperbarui", ok("mutu.daftar", {}, tM).publikasi.find(y => y.survei === id).tindakLanjut.find(k => /konsultasi/.test(k.t)).status === "berjalan");
  ok("pub.tarik", { survei: id }, tKps);
  cek("tarik publikasi → tidak tampil lagi bagi mahasiswa", !ok("mutu.daftar", {}, tM).publikasi.some(y => y.survei === id) && /belum terbit/.test(salah("pub.tarik", { survei: id }, tKps)));
  ok("pub.simpan", { survei: id, kesimpulan: "Mahasiswa cukup puas, daya tanggap perlu diperbaiki.", sasaran: ["mahasiswa"], terbit: true }, tKps);
  const pn = ok("penilaian.data", {}, tKps), b78 = pn.rows.find(b => b.n === 78);
  cek("Penilaian butir 78: keterangan kelompok terukur, dibahas, dipublikasikan", /1 dari 6 kelompok terukur \(mahasiswa\)/.test(b78.info) && /dipublikasikan/.test(b78.info));
  const app = fs.readFileSync("web/aplikasi.js", "utf8");
  cek("tampilan: menu Hasil Survei & Perbaikan, laci publikasi, rekomendasi agenda rapat, centang Umumkan", /function hMutu\(/.test(app) && /function laciPubForm/.test(app) && /rapatAgendaSv/.test(app) && /data-rkpub/.test(app) && /pub: !!k\.pub/.test(app));
}
