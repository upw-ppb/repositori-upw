# Riwayat versi — Repositori Akreditasi UPW

Format: versi, tanggal, lingkungan, isi, penyetuju. Produksi hanya berubah setelah pemilik menulis "setuju tayang".
Rilis Uji Coba tidak memerlukan persetujuan tayang (aturan tetap no. 1–2 di CLAUDE.md).

## v0.32.0 — 18 Nov 2026 — Uji Coba
Ringkas: Risalah rapat per agenda (keputusan otomatis menjadi tindak lanjut), templat Word, daftar hadir PDF, dan pindaian risalah yang otomatis masuk Bank Dokumen.
Rilis 2 dari 2 fitur Rapat & Tindak Lanjut (rencana disetujui pemilik 18 Nov 2026).
- **Risalah** (detail rapat yang sudah terbit): pimpinan rapat, notulis, jam, jumlah hadir, **pembahasan dan keputusan per agenda** (penanggung jawab, tenggat,
  butir Matriks), lain-lain. Disimpan sebagai draf oleh KPS, GKM, Admin Prodi, atau Super Admin. **KPS memfinalkan** pada atau setelah tanggal rapat: risalah terkunci,
  dan setiap keputusan yang punya penanggung jawab **otomatis menjadi poin tindak lanjut** (sumber "Keputusan rapat"; butir dari keputusan atau dari agenda).
  Keputusan tanpa penanggung jawab dicatat sebagai informasi. Setelah final, undangan tidak bisa diubah atau dibatalkan.
- **Unduhan**: Templat risalah (Word, agenda terisi, sebelum risalah dibuat), Risalah (Word dan PDF), dan **Daftar hadir (PDF)** berisi peserta undangan
  (dengan NIP/NIM), tamu, dan baris kosong, untuk ditandatangani.
- **Pindaian**: risalah bertanda tangan (setelah final) dan daftar hadir, berupa PDF/JPG/PNG/Word atau tautan, di folder Drive "Rapat". Pindaian risalah rapat
  IAB, tinjauan manajemen, evaluasi kurikulum, monev, dan tindak lanjut survei **otomatis disalin sebagai versi baru di Bank Dokumen** (butir 3, 2, 7, 23, 42);
  versi lama di Bank tetap tersimpan.
- **Asesor** dapat membuka menu Rapat (baca saja) untuk rapat yang risalahnya sudah final, beserta pindaiannya, dan tindak lanjut yang terverifikasi.
- Panduan Info: topik baru "Risalah rapat, daftar hadir, dan bukti ke Bank Dokumen".
- Struktur data versi 25: kolom baru di akhir tabel Rapat (risalah, berkas); ditambahkan otomatis, cadangan dibuat lebih dulu. Rollback ke v0.31.0 tanpa pemulihan
  data (risalah dan berkas diabaikan; tindak lanjut hasil risalah tetap ada).
- Uji: 654 + 44 uji server lulus (20 uji baru di uji-v32-bagian.mjs). Uji tampilan di server lokal (terbitkan undangan, tulis dan finalkan risalah, keputusan menjadi
  tindak lanjut, templat dan risalah Word divalidasi, risalah dan daftar hadir PDF, unggah pindaian otomatis ke Bank Dokumen, tombol ubah/batal hilang setelah final)
  dan penjelajah 60 halaman: tanpa masalah. Server Uji Coba: deployment @31 (cek langsung 15/15).
  Penyetuju: tidak diperlukan (Uji Coba).

## v0.31.0 — 18 Nov 2026 — Produksi
- Produksi diperbarui ke v0.31.0 (server Apps Script Produksi deployment @11, tampilan docs/): menu Rapat & Tindak Lanjut (undangan rapat KPS dengan surat PDF,
  notifikasi dan jawaban kehadiran; tindak lanjut sampai terverifikasi; tombol di Laporan GKM; ringkasan tindak lanjut di Penilaian).
- Cadangan: dibuat otomatis oleh server pada permintaan pertama setelah pembaruan ("Cadangan / sebelum v0.31.0 (struktur data 23 → 24)").
- Rollback: v0.30.0 tetap bisa membaca data tanpa pemulihan (tabel TindakLanjut, Rapat, PesertaRapat diabaikan).
- Penyetuju: pemilik, di chat 18 Nov 2026: "setuju tayang v0.31.0".

## v0.31.0 — 18 Nov 2026 — Uji Coba
Ringkas: Menu baru Rapat & Tindak Lanjut: undangan rapat dari KPS dengan surat PDF dan notifikasi peserta, serta daftar tindak lanjut sampai terverifikasi.
Permintaan pemilik (Rilis 1 dari 2; rencana disetujui di chat 18 Nov 2026): rapat dan tindak lanjutnya terdata sesuai siklus PPEPP. Dasar instrumen (nomor Lampiran 1):
butir 2 (PPEPP), 3 (IAB: pertemuan minimal setahun sekali dengan dokumentasi), 7 (evaluasi kurikulum bersama pemangku kepentingan), 8, 22–23 (monev ditindaklanjuti),
25, 42/71 (analisis dan tindak lanjut kepuasan), 76–78. Instrumen tidak menyebut "risalah rapat" secara harfiah; yang dinilai adalah bukti sahih dan tindak lanjutnya.
- **Tindak lanjut**: poin berisi uraian, butir Matriks, sumber (temuan GKM, keputusan rapat, survei, Penilaian, audit, lainnya), penanggung jawab (dosen/tendik), tenggat.
  Status Belum → Berjalan → Selesai (wajib keterangan dan bukti berkas/tautan; berkas di folder Drive "Tindak Lanjut") → Terverifikasi oleh KPS atau GKM
  (bukan penanggung jawabnya sendiri); bisa dikembalikan dengan catatan. Riwayat setiap perubahan tercatat. Poin lewat tenggat ditandai merah.
  Penanggung jawab melihat poinnya di Beranda; KPS/GKM melihat jumlah yang menunggu verifikasi. Laporan GKM: tombol "Jadikan poin tindak lanjut" di bagian Rekomendasi.
  Keterangan butir di Penilaian menampilkan jumlah tindak lanjut terverifikasi dan yang belum tuntas.
- **Undangan rapat**: KPS menerbitkan; Admin Prodi dan GKM boleh menyiapkan draf. Jenis rapat terkait butir (IAB 3, tinjauan manajemen 2, kurikulum 7, RPS 8,
  monev 22–23, survei 42/71, kinerja 77, tindak lanjut, rapat prodi). Agenda bisa diambil dari tindak lanjut terbuka dan dari butir Matriks (syarat skor 4 ikut).
  Tempat dan/atau tautan daring. Peserta: dosen, tendik, mahasiswa per kelas atau per orang, dan tamu luar (nama + instansi, lewat PDF).
  **Surat PDF** (nomor surat opsional, daftar undangan terlampir, tanda tangan KPS, kode verifikasi UND-… dan QR; cek keaslian di halaman cek surat).
  Peserta berakun mendapat **notifikasi di Beranda** dan menjawab **Hadir / Tidak hadir** (alasan wajib bila tidak); rekap jawaban untuk pengelola.
  KPS bisa mengubah undangan yang sudah terbit (surat diperbarui, peserta diberi tahu ulang) atau membatalkan dengan alasan.
- Panduan Info: topik baru "Undangan rapat (KPS)" dan "Tindak lanjut". Risalah, templat Word, daftar hadir, dan bukti otomatis ke Bank Dokumen menyusul di Rilis 2.
- Struktur data versi 24: tabel baru TindakLanjut, Rapat, PesertaRapat (ditambahkan otomatis, cadangan dibuat lebih dulu). Versi lama tetap bisa membaca data
  (tabel baru diabaikan); rollback ke v0.30.0 tanpa pemulihan data.
- Uji: 634 + 44 uji server lulus (42 uji baru di uji-v31-bagian.mjs). Uji tampilan di server lokal (buat tindak lanjut, susun dan terbitkan undangan dengan agenda dari
  tindak lanjut dan butir, peserta per orang/kelas/tamu, surat PDF, notifikasi dan jawaban mahasiswa, tombol di Laporan GKM, cek keaslian, lebar ponsel) dan penjelajah
  50 halaman: tanpa masalah. Server Uji Coba: deployment @30 (cek langsung 15/15). Penyetuju: tidak diperlukan (Uji Coba).

## v0.30.0 — 18 Nov 2026 — Produksi
- Produksi diperbarui ke v0.30.0 (tampilan docs/ dan server Apps Script Produksi deployment @10, server hanya naik nomor versi): tombol (i) berisi definisi,
  kriteria skor 4–0, rumus, petunjuk DED, dan keterangan Tabel iLKPS dari instrumen LAMWisata di Penilaian, DED, Bank Dokumen, Tabel iLKPS, Data Prodi, Biodata, dan halaman lain.
- Tidak ada perubahan struktur data, jadi server tidak membuat cadangan baru; data tidak diubah oleh rilis ini. Rollback ke v0.29.0 cukup tampilan (tag v0.29.0)
  dan deployment versi milik v0.29.0.
- Penyetuju: pemilik, di chat 18 Nov 2026: "setuju tayang v0.30.0".

## v0.30.0 — 18 Nov 2026 — Uji Coba
Ringkas: Tombol (i) di setiap bagian yang terkait instrumen LAMWisata: definisi, kriteria skor 4 sampai 0, rumus, petunjuk DED, dan saran.
Permintaan pemilik: setiap instrumen yang punya keterangan/definisi diberi tombol (i), agar pengguna paham apa yang harus dipenuhi; ringkasan dan saran yang sudah ada tetap.
- **Isi jendela (i)** (teks instrumen disalin apa adanya, dengan sumbernya): elemen dan indikator (definisi) menurut Matriks, **kriteria skor 4–0** per bagian (A, B, C, …),
  rumus skor dan keterangan istilah (mis. MKKI, MKK, PMKI), catatan nomor butir; **petunjuk DED** butir terkait; **keterangan kolom Tabel iLKPS** dari DED; definisi
  **jenis dosen** (DT, DTPT, DTPS, dosen tidak tetap, dosen industri/praktisi). Bagian "Yang sebaiknya dilakukan" memuat syarat skor 4 dan saran yang sudah ada.
  Bisa berpindah ke tabel, petunjuk DED, atau butir terkait, lalu ← Kembali; tutup dengan ✕ atau Esc. Jendela (i) bisa dibuka di atas jendela lain (mis. nilai GKM).
- **Letak tombol**: Penilaian (setiap butir, prioritas perbaikan, jendela nilai GKM), DED (butir dan butir Matriks terkait), Bank Dokumen (setiap butir),
  Tabel iLKPS (setiap tabel), Data Prodi (setiap tab), Biodata (isian Status dosen), Mata Kuliah Saya, Laboratorium, Laporan GKM, dan Survei.
  Tombol hanya muncul di halaman yang memang bisa dibuka peran itu.
- **Penomoran**: aplikasi memakai nomor Lampiran 1 (bobot). Di tabel Matriks, butir 27 Lampiran 1 (rasio mahasiswa/DTPS) adalah bagian C butir 9, dan butir 28–84
  Lampiran 1 = baris 27–83 tabel Matriks; jendela (i) menuliskan catatan ini. Baris SDG's (tanpa nomor) ditampilkan di butir 75 dengan catatan bahwa itu untuk prodi bidang kreatif.
- Sumber teks: Matriks (PDF, dibaca per halaman dan dicocokkan kata per kata dengan versi Word) dan DED di folder OneDrive Akreditasi/LAMWisata.
  Transkripsi di alat/instrumen/, dibangun dengan `node alat/instrumen.mjs` menjadi docs/uji/instrumen.js (193 KB, dimuat saat tombol (i) pertama kali ditekan, tersedia luring).
- Panduan Info: topik baru "Tombol (i): definisi dan kriteria instrumen LAMWisata".
- Tidak ada perubahan struktur data; server hanya naik nomor versi. Rollback cukup tampilan.
- Uji: 592 + 44 uji server lulus (9 uji baru di uji-v30-bagian.mjs: kelengkapan 84 butir, skor 0–4, penomoran, rujukan tombol). Uji tampilan di server lokal (buka (i) di
  Data Prodi, Penilaian, jendela GKM, Tabel iLKPS, Biodata; pindah dan kembali; Esc; lebar ponsel) dan penjelajah 42 halaman: tanpa masalah. Server Uji Coba: deployment @29 (cek langsung 12/12).
  Penyetuju: tidak diperlukan (Uji Coba).

## v0.29.0 — 18 Nov 2026 — Produksi
- Produksi diperbarui ke v0.29.0 (server Apps Script Produksi deployment @9, tampilan docs/): data dan bukti dosen praktisi (jabatan, pengalaman,
  memimpin tim, penerbit sertifikat, dasar kerja sama; unggah CV/ijazah/sertifikat/bukti jabatan/kerja sama), dan MK diampu TS-2 s.d. TS di Tabel 1–3.
- Cadangan: dibuat otomatis oleh server pada permintaan pertama setelah pembaruan ("Cadangan / sebelum v0.29.0 (struktur data 22 → 23)").
- Rollback: v0.28.0 tetap bisa membaca data tanpa pemulihan; isian dan bukti praktisi baru tidak tampil di versi lama.
- Penyetuju: pemilik, di chat 18 Nov 2026: "setuju tayang v0.29.0".

## v0.29.0 — 18 Nov 2026 — Uji Coba
Ringkas: Data dan bukti dosen praktisi sesuai syarat LAMWisata, serta mata kuliah yang diampu di Tabel 1–3 kini mencakup TS-2 sampai TS.
Permintaan pemilik, setelah instrumen dibaca ulang (Matriks butir 16 dan DED Tabel 2–3):
- **Data Prodi › Praktisi**: isian baru **jabatan**, **lama pengalaman kerja** (tahun), **pernah memimpin tim**, **lembaga penerbit sertifikat**, dan
  **dasar kerja sama/penugasan**. Kolom **Kriteria** menunjukkan "Memenuhi" bila pengalaman ≥ 5 tahun dan/atau memimpin tim (Matriks butir 16).
- **Bukti praktisi** (PDF/JPG/PNG maks. 10 MB, atau tautan): CV/portofolio, ijazah pendidikan tertinggi, sertifikat, bukti jabatan/surat keterangan kerja,
  dokumen kerja sama/surat penugasan. Disimpan di folder Drive "Praktisi/<nama>"; bukti yang diganti/dihapus pindah ke sampah Drive.
  Admin Prodi dan Super Admin mengubah; KPS dan GKM bisa melihat (tombol Lihat). Praktisi baru: jendela tetap terbuka setelah Simpan agar bukti bisa langsung diunggah.
- **Tabel 2**: kolom sertifikat ditulis bersama lembaga penerbitnya, misalnya "Tour Leader (BNSP)" (DED Tabel 2 catatan 4).
- **Perbaikan Tabel 1, 2, 3**: "mata kuliah yang diampu" kini diambil dari tim pengajar **TS-2 s.d. TS** (DED), sebelumnya hanya TS. Bobot sks Tabel 2 = jumlah sks
  MK itu (tiap MK sekali). EWMP (Tabel 6) dan Data dosen TS tetap memakai TS saja. PMKI (butir 16) tidak berubah.
- Struktur data versi 23: kolom baru di akhir tabel Praktisi (jabatan, pengalaman, memimpinTim, penerbit, kerjaSama, bukti); ditambahkan otomatis, cadangan dibuat lebih dulu.
  Rollback ke v0.28.0 tetap bisa membaca data tanpa pemulihan (kolom baru diabaikan; menyimpan praktisi di versi lama tidak menghapus isian baru).
- Panduan Info (Data Prodi) diperbarui.
- Uji: 583 + 44 uji server lulus (20 uji baru di uji-v29-bagian.mjs). Uji tampilan di server lokal (tambah praktisi, unggah CV, tautan, buka bukti, isian tidak hilang
  saat unggah, tampilan baca-saja KPS, lebar ponsel) dan penjelajah 52 halaman: tanpa masalah. Server Uji Coba: deployment @28 (cek langsung 12/12).
  Penyetuju: tidak diperlukan (Uji Coba).

## v0.28.0 — 18 Nov 2026 — Produksi
- Produksi diperbarui ke v0.28.0 (server Apps Script Produksi deployment @8, tampilan docs/): tim pengajar per kelas (sama untuk semua kelas
  atau berbeda untuk kelas A/B), EWMP dihitung per kelas yang diajar, Portofolio MK mengenali pengampu utama setiap kelas.
- Cadangan: dibuat otomatis oleh server pada permintaan pertama setelah pembaruan ("Cadangan / sebelum v0.28.0 (struktur data 21 → 22)").
- Rollback: v0.27.0 tetap bisa membaca data tanpa pemulihan; tim yang diisi per kelas akan tampil kurang tepat di versi lama sampai v0.28.0 dipasang lagi.
- Penyetuju: pemilik, di chat 18 Nov 2026: "setuju tayang v0.28.0".

## v0.28.0 — 18 Nov 2026 — Uji Coba
Ringkas: Tim pengajar kini bisa diisi per kelas: sama untuk semua kelas, atau berbeda untuk kelas A dan kelas B.
Permintaan pemilik: setiap mata kuliah punya dua kelas (A dan B) dengan pengajar yang bisa sama atau berbeda; sebelumnya hanya bisa satu tim.
- **Data Prodi › Tim pengajar**: di jendela Tetapkan/Ubah tim ada pilihan **Sama untuk semua kelas** (seperti sebelumnya) atau **Berbeda per kelas**.
  Per kelas: setiap kelas punya pengampu utama sendiri dan maksimal 3 orang (termasuk praktisi); kelas yang belum ditetapkan boleh dikosongkan.
  Saat pindah pilihan, isian yang sudah dipilih ikut terbawa. Daftar tim menampilkan pengajar per kelas ("Kelas A …", "Kelas B …").
  Daftar kelas diambil dari kelas mahasiswa angkatan yang mengambil mata kuliah itu (bila belum ada: kelas mahasiswa aktif; bawaan A dan B).
- **Salin dari semester lalu** ikut menyalin tim per kelas.
- **EWMP (Data dosen TS, Tabel 6)**: sks dihitung per kelas yang diajar (disetujui pemilik): dosen yang mengajar kelas A dan B mendapat dua kali
  bagian sks. Tim "sama untuk semua kelas" (termasuk data lama) dihitung untuk setiap kelas mata kuliah itu, sehingga angka EWMP data lama bisa naik.
  Mata kuliah yang diampu (Tabel 1–3) dan bobot sks praktisi (Tabel 2) tetap dihitung sekali per mata kuliah.
- **Portofolio Mata Kuliah**: tetap satu per mata kuliah per semester; bila pengampu utama kelas A dan B berbeda, keduanya berperan **utama**
  (boleh mengisi RPS, kontrak, rubrik, metode) dan ditandai "(utama)" di daftar tim.
- Struktur data versi 22: kolom baru "kelas" di akhir tabel TimPengajar (ditambahkan otomatis, cadangan dibuat lebih dulu). Data lama (kelas kosong)
  dibaca sebagai "sama untuk semua kelas". Rollback ke v0.27.0 tetap bisa membaca data tanpa pemulihan, tetapi tim per kelas akan tampil sebagai
  beberapa tim untuk satu mata kuliah (yang terbaca hanya salah satunya) sampai v0.28.0 dipasang lagi.
- Panduan Info (Data Prodi, Mata Kuliah Saya) diperbarui.
- Uji: 563 + 44 uji server lulus (21 uji baru di uji-v28-bagian.mjs; dua uji EWMP lama disesuaikan ke hitungan per kelas). Uji tampilan di server lokal
  (isi per kelas, pindah pilihan, validasi pengampu utama, isi permintaan terkirim, Portofolio MK, lebar ponsel) dan penjelajah 42 halaman: tanpa masalah.
  Server Uji Coba: deployment @27 (ping versi 0.28.0; cek langsung lulus). Penyetuju: tidak diperlukan (Uji Coba).

## v0.27.0 — 15 Nov 2026 — Produksi
- Produksi diperbarui ke v0.27.0 (server Apps Script Produksi deployment @7): saringan dan urutan daftar akun, rekap per angkatan/kelas,
  status mahasiswa dengan alasan, bukti, dan riwayat, serta riwayat versi di Info.
- Cadangan: dibuat otomatis oleh server pada permintaan pertama ("Cadangan / sebelum v0.27.0 (struktur data 20 → 21)").
- Rollback: v0.26.0 tetap bisa membaca data (tabel RiwayatStatusMhs diabaikan); tanpa pemulihan data.
- Penyetuju: pemilik, di chat 15 Nov 2026: "Setuju tayang v0.27.0".

## v0.27.0 — 15 Nov 2026 — Uji Coba
Ringkas: Penambahan saringan dan urutan pada daftar akun, rekap per angkatan dan kelas, ubah status mahasiswa dengan alasan dan bukti, serta riwayat versi di halaman Info.
- **Daftar akun** (menu Pengguna): saring menurut jenis (mahasiswa, dosen, tendik, asesor; Super Admin), status akun (sudah aktif / belum aktivasi /
  nonaktif), angkatan, kelas, status mahasiswa, dan kelengkapan biodata; urutkan dengan klik judul kolom; unduh hasil saringan ke Excel.
  **Rekap mahasiswa per angkatan dan kelas**: jumlah, sudah aktif, belum aktivasi, biodata belum lengkap, dan status mahasiswa; klik baris untuk menyaring.
- **Status mahasiswa** (aktif, cuti, non-aktif, lulus, drop out, mengundurkan diri, mutasi, wafat): kolom sendiri di daftar akun dengan tombol
  **Ubah status**; tanggal efektif, **alasan wajib**, dan **bukti** (unggah PDF/gambar ke Drive "Status Mahasiswa", atau tautan). Bisa untuk
  **banyak mahasiswa sekaligus** (centang, lalu Ubah status N mahasiswa; mis. satu angkatan lulus dengan satu SK yudisium). **Riwayat status** per
  mahasiswa tercatat (dari, ke, tanggal, alasan, oleh siapa, bukti). Sebelumnya status hanya bisa diubah lewat tombol "Data mhs" di ujung kanan
  tabel tanpa alasan/bukti; tombol itu kini bernama "Angkatan & kelas".
- **Riwayat versi di Info › Tentang aplikasi**: 10 pembaruan terakhir dengan ringkasan perubahan dalam bahasa sederhana (baris "Ringkas" di CHANGELOG).
- Struktur data versi 21: tabel baru "RiwayatStatusMhs" (ditambahkan otomatis, cadangan dibuat lebih dulu). Versi lama tetap bisa membaca data;
  rollback ke v0.26.0 aman tanpa pemulihan data (riwayat status diabaikan).
- Uji: 542 + 44 uji server lulus (11 uji baru). Penyetuju: tidak diperlukan (Uji Coba).

## v0.26.0 — 15 Nov 2026 — Produksi
- Tampilan Produksi diperbarui ke v0.26.0: halaman Info dengan 53 topik panduan per peran, 30 gambar asli bertanda, dan pencarian pintar.
- Hanya tampilan yang berubah; server Produksi tetap v0.25.1 (deployment @6) dan data tidak tersentuh, sehingga tidak ada cadangan baru.
  Rollback ke v0.25.2 cukup tampilan (tag v0.25.2).
- Penyetuju: pemilik, di chat 15 Nov 2026: "Setuju tayang v0.26.0".

## v0.26.0 — 15 Nov 2026 — Uji Coba
Ringkas: Halaman Info baru: panduan lengkap sesuai peran dengan gambar asli bertanda, dan kolom pencarian yang memahami pertanyaan.
Permintaan pemilik: panduan lengkap di Info agar pengguna tidak perlu dijelaskan satu per satu.
- **Info dan panduan** ditulis ulang: 53 topik dalam 7 kategori (dasar, kegiatan, mata kuliah dan dokumen dosen, akreditasi dan mutu, data prodi,
  pengelolaan, masalah umum). Setiap topik: ringkasan, siapa yang memakainya, langkah bernomor, hal yang perlu diketahui, tombol menuju menunya,
  dan topik terkait. **Isi mengikuti peran**: mahasiswa, dosen, tendik, KPS, GKM, kepala lab, laboran, Admin Prodi, Super Admin, dan asesor
  masing-masing melihat topik untuk perannya (pengguna berperan ganda bisa memilih peran panduan). Bagian **Mulai di sini** berisi topik terpenting per peran.
- **30 gambar asli aplikasi** (data contoh) dengan penanda nomor, kotak, dan panah; daftar keterangan di bawah gambar menyorot bagiannya saat
  disentuh kursor; klik gambar untuk memperbesar. Gambar tajam 1600 px (dua kali lipat) dalam format WebP rata-rata 73 KB, dan baru dimuat saat
  topiknya dibuka sehingga halaman tetap ringan. Gambar lama (JPG buram) dihapus.
- **Pencarian pintar tanpa AI**: saran muncul saat mengetik (tombol panah dan Enter bisa dipakai). Memahami pertanyaan sehari-hari ("kenapa saya
  tidak bisa login"), imbuhan (mengunggah/unggahan → unggah), sinonim (upload, download, password, ttd, dll.), salah ketik ("pasword"), dan kata
  yang belum selesai diketik ("upl"). Pertanyaan bernada masalah mengutamakan topik Masalah umum. Bila tidak ketemu: tombol kirim pertanyaan ke Admin Prodi.
- Isi panduan disusun dari alat/panduan-sumber.js (teks) dan alat/panduan-tanda.json (posisi penanda) dengan `node alat/panduan.mjs`
  (memeriksa gambar dan tautan antartopik); alat tangkap layar tajam di alat/uji/cap.js.
- Tidak ada perubahan server maupun struktur data. Penyetuju: tidak diperlukan (Uji Coba).

## v0.25.2 — 15 Nov 2026 — Produksi
- Produksi diperbarui dari v0.25.0 ke v0.25.2 (tampilan) dengan server v0.25.1 (deployment @6): daftar lengkap dalam kotak bergulir (v0.25.1),
  tombol ← → dan kotak Unduhan seperti Chrome, tanggal lokal di nama berkas (v0.25.2).
- Tidak ada perubahan struktur data, sehingga server tidak membuat cadangan otomatis; data tidak diubah oleh rilis ini. Cadangan terakhir:
  "Cadangan / sebelum v0.25.0" (hari yang sama). Rollback ke v0.25.0 aman (tampilan tag v0.25.0, deployment versi milik v0.25.0).
- Penyetuju: pemilik, di chat 15 Nov 2026: "Setuju tayang v0.25.2".

## v0.25.2 — 15 Nov 2026 — Uji Coba
Ringkas: Penambahan tombol kembali/maju dan kotak Unduhan di bilah atas; perbaikan tanggal pada nama berkas unduhan.
Permintaan pemilik (seperti di Chrome, terutama untuk aplikasi terpasang yang tidak punya bilah alamat):
- **Tombol ← dan →** di kiri bilah atas: kembali ke halaman sebelumnya dan maju lagi. Setiap pindah menu tercatat di riwayat, sehingga tombol
  mundur/maju pada mouse dan gestur geser trackpad juga bekerja. Tombol pudar bila tidak ada halaman sebelumnya/berikutnya.
- **Ikon Unduhan** di pojok kanan atas: setelah mengunduh, kotak "Unduhan terakhir" muncul beberapa detik (nama berkas, ukuran, waktu, dan
  letaknya: folder Unduhan atau folder pilihan), dengan angka penanda. Berkas dari sesi ini bisa dibuka (PDF/gambar) atau diunduh lagi; daftar
  disimpan di perangkat (30 terakhir). Catatan: aplikasi web tidak bisa membuka Finder/File Explorer langsung, jadi letak berkas disebutkan.
- Perbaikan: nama berkas unduhan memakai tanggal menurut jam perangkat (sebelumnya UTC, sehingga pagi hari tertulis tanggal kemarin).
- Bilah atas di ponsel dirapikan agar tombol baru muat tanpa melebar.
- Tidak ada perubahan server maupun struktur data. Penyetuju: tidak diperlukan (Uji Coba).

## v0.25.1 — 15 Nov 2026 — Uji Coba
Ringkas: Perbaikan pratinjau impor Excel dan daftar panjang lain: semua baris kini tampil dalam kotak yang bisa digulir.
- Permintaan pemilik: daftar yang sebelumnya dipotong ("… dan N baris lainnya") kini ditampilkan **lengkap dalam kotak bergulir** dengan kepala
  tabel tetap terlihat:
  - pratinjau impor Excel (semua jenis impor): semua baris, kolom nomor baris, dan tahun masuk yang diambil dari NIM bila kolomnya kosong;
  - daftar masalah dan baris yang dilewati saat impor;
  - Riwayat keputusan (sebelumnya 300 terbaru) dan catatan perawatan/pemakaian Laboratorium (sebelumnya 100 terbaru);
  - daftar butir rubrik yang belum dinilai GKM di panel Kesiapan (sebelumnya 8).
- Tidak ada perubahan struktur data. Penyetuju: tidak diperlukan (Uji Coba).

## v0.25.0 — 15 Nov 2026 — Produksi
- Produksi diperbarui ke v0.25.0 (server Apps Script Produksi deployment @5): panel Kesiapan akreditasi di Beranda, peran dan Laporan GKM,
  istilah GKM, akun Super Admin tidak dihitung sebagai data prodi.
- Cadangan: dibuat otomatis oleh server pada permintaan pertama ("Cadangan / sebelum v0.25.0 (struktur data 19 → 20)").
- Rollback: v0.24.0 tetap bisa membaca data (tabel LaporanGkm dan peran gkm diabaikan); tanpa pemulihan data. Catatan: setelah rollback, akun
  Super Admin yang diberi peran mahasiswa/dosen akan kembali terhitung.
- Penyetuju: pemilik, di chat 15 Nov 2026: "Setuju tayang v0.25.0".

## v0.25.0 — 15 Nov 2026 — Uji Coba
Ringkas: Penambahan panel Kesiapan akreditasi di Beranda, peran GKM dan Laporan GKM per semester; akun Super Admin tidak lagi terhitung sebagai data prodi.
Permintaan pemilik (kesiapan akreditasi dan GKM):
- **Kesiapan akreditasi di Beranda** (KPS, Admin Prodi, Super Admin, GKM): nilai simulasi dibanding target; jumlah butir rubrik belum dinilai,
  butir otomatis yang datanya belum ada, Tabel iLKPS yang masih kosong, dan dokumen Bank Dokumen yang belum ada; 3 kriteria terlemah; status
  Laporan GKM; **5 prioritas perbaikan** dengan syarat skor 4, saran, dan tombol menuju menu tempat kegiatan/data dicatat (mis. "Catat kegiatan:
  Penelitian", "Isi Data Prodi › PMB", "Unggah dokumen di Bank Dokumen butir 42"). Daftar lengkap butir yang datanya belum ada bisa dibuka.
  Sebelumnya rekomendasi hanya ada di menu Penilaian.
- **Istilah GPM diganti GKM** (Gugus Kendali Mutu Program Studi) di seluruh aplikasi. Catatan: istilah GPM/GKM tidak ada di DED/Matriks LAMWisata;
  instrumen menyebut "unsur pelaksana penjaminan mutu" (butir 1 SPMI), siklus PPEPP, dan monev pembelajaran periodik.
- **Peran baru GKM** (diberikan Super Admin di menu Pengguna). GKM menilai butir rubrik di Penilaian, membuka Tabel iLKPS, Data Prodi, Bank Dokumen,
  DED, rekap Portofolio MK, Survei, dan Sumber data; tidak bisa menghapus atau memutuskan data kegiatan, dan tidak bisa mengubah target nilai.
- **Laporan GKM per semester** (menu Laporan GKM): 5 bagian (monev pembelajaran, capaian, temuan, rekomendasi, tindak lanjut semester sebelumnya)
  dan lampiran (PDF/Word/Excel/PowerPoint/gambar, maks. 10 MB, 15 berkas; disimpan di Drive "Laporan GKM/<semester>"). Draf → dikirim ke KPS →
  diterima atau perlu revisi (catatan wajib). Batas bawaan 14 hari setelah semester berakhir, bisa diubah Admin/Super Admin. Unduh Word.
  Laporan yang diterima tampil sebagai bukti di keterangan Penilaian dan Sumber data butir 1, 2, 4, 23, dan 77.
- **Pengingat di Beranda**: GKM melihat jumlah butir rubrik yang belum dinilai pada TS dan laporan semester yang belum dikirim/perlu revisi
  (mulai 30 hari sebelum semester berakhir); KPS melihat laporan yang menunggu keputusan. Tanda "terlambat" hanya untuk semester berjalan dan
  satu semester sebelumnya.
- **Akun Super Admin bukan data prodi** (permintaan pemilik): akun yang memiliki peran Super Admin, walaupun diberi peran lain (mahasiswa, dosen,
  KPS, dst.), tidak dihitung sebagai mahasiswa aktif/dosen (Penilaian, Tabel iLKPS, Data Prodi), tidak memakai biodata, tidak tampil di Cari orang,
  daftar pengguna Admin Prodi, ekspor daftar akun, pilihan peserta kegiatan, maupun sasaran survei, dan tidak dipakai sebagai penanda tangan KPS
  bawaan. Kegiatan yang ia ajukan tetap tersimpan tetapi tidak dihitung di Tabel iLKPS dan Penilaian (ditandai "akun Super Admin · tidak dihitung"
  di Data Terkumpul).
- Perbaikan saat uji tampilan: tab Data Prodi › Dokumen dosen tidak termuat untuk GKM (kini GKM bisa melihat dan mengingatkan); menu ganda (Bank Dokumen) untuk GKM yang juga PJ dokumen; kotak angka di Beranda/Data Terkumpul melebar di layar
  sempit; tanda "terlambat" pada semester lama sebelum aplikasi dipakai.
- Uji: 531 + 44 uji server lulus (34 uji baru); uji tampilan alur GKM (draf, lampiran, kirim, revisi KPS, unduh Word) dan penjelajah semua halaman.
- Struktur data versi 20: tabel baru "LaporanGkm" (ditambahkan otomatis, cadangan dibuat lebih dulu). Versi lama tetap bisa membaca data;
  rollback ke v0.24.0 aman tanpa pemulihan data (peran "gkm" diabaikan versi lama).
- Penyetuju: tidak diperlukan (Uji Coba).

## v0.24.0 — 14 Nov 2026 — Produksi
- Produksi diperbarui ke v0.24.0 (server Apps Script Produksi deployment @4): foto profil, menu Data Terkumpul, tombol Sumber data di Penilaian.
- Cadangan: dibuat otomatis oleh server pada permintaan pertama ("Cadangan / sebelum v0.24.0 (struktur data 18 → 19)") di folder Cadangan Drive Produksi.
- Rollback: versi v0.23.x tetap bisa membaca data (tabel FotoProfil diabaikan); tidak perlu pemulihan data.
- Penyetuju: pemilik, di chat 14 Nov 2026: "Setuju tayang v0.24.0".

## v0.24.0 — 14 Nov 2026 — Uji Coba
Ringkas: Penambahan foto profil untuk semua pengguna, menu Data Terkumpul, dan tombol Sumber data di Penilaian untuk memeriksa asal setiap skor.
Permintaan pemilik (2 butir):
- **Foto profil** untuk semua pengguna (menu Akun saya, atau klik nama di bawah menu): pilih foto JPG/PNG, bagian tengah dipotong persegi dan
  diperkecil otomatis di perangkat; bisa diganti atau dihapus. Tampil di bilah samping dan di Cari orang (yang belum punya foto tetap berinisial).
  Disimpan di sheet "FotoProfil" (bukan Drive, agar cepat dimuat).
- **Data Terkumpul** (menu baru, Super Admin): semua kegiatan dari semua status beserta kategorinya: jenis, Tabel iLKPS/DED, dan nomor butir
  Penilaian yang memakainya (dihitung otomatis atau bahan GPM). Saring menurut status, jenis, butir, atau pengaju; unduh Excel. Ringkasan data lain
  (dosen, mahasiswa, kurikulum, lulusan, PMB, keuangan, survei, skor GPM, Bank Dokumen) dengan tautan ke menunya.
- Tindakan Super Admin atas kegiatan mana pun, termasuk yang sudah disetujui: Terima, Minta revisi (alasan wajib), Tolak (alasan wajib), Hapus
  (alasan wajib; bisa banyak sekaligus dengan centang). Kegiatan terhapus tidak dibuang: tampil di tab Terhapus dan bisa dipulihkan.
  Semua keputusan tercatat di Riwayat keputusan dan Log.
- **Sumber data** di setiap butir Penilaian (Super Admin, Admin Prodi, KPS boleh melihat; tindakan hanya Super Admin): kegiatan pada rentang TS
  (mana yang ikut dihitung) dan data lain yang menjadi dasar skor.
- Catatan: beberapa butir otomatis memang memberi skor minimum walau datanya kosong, sesuai rumus Matriks (mis. butir 49 produk diadopsi = 2,
  butir 63 suasana akademik = 1, butir 75 GCET = 1). Itu bukan data uji coba; tombol Sumber data menunjukkan bahwa kegiatannya kosong.
- Perbaikan saat uji tampilan: alasan tindakan terbaca kosong setelah percobaan pertama gagal (dibaca di luar proses kirim). Diperbaiki sebelum rilis.
- Uji: 496 + 44 uji server lulus (24 uji baru); uji tampilan dengan klik dan isian sungguhan; penjelajah semua halaman di layar komputer dan ponsel.
- Struktur data versi 19: tabel baru "FotoProfil" (ditambahkan otomatis, cadangan dibuat lebih dulu). Versi lama tetap bisa membaca data
  (tabel baru diabaikan), jadi rollback ke v0.23.x aman tanpa pemulihan data.
- Penyetuju: tidak diperlukan (Uji Coba).

## v0.23.1 — 14 Nov 2026 — Produksi
- Tampilan Produksi diperbarui ke v0.23.1: ikon aplikasi diperbesar (koper dan UPW memenuhi kotak).
- Hanya tampilan yang berubah. Kode server tidak berubah, jadi server Produksi tetap v0.23.0 (deployment @3) dan tidak diterapkan ulang.
  Data tidak tersentuh; cadangan terakhir: "Cadangan / sebelum v0.23.0" (hari yang sama). Rollback ke v0.23.0 cukup tampilan (tag v0.23.0).
- Penyetuju: pemilik, di chat 14 Nov 2026: "Setuju tayang v0.23.1".

## v0.23.1 — 14 Nov 2026 — Uji Coba
Ringkas: Perubahan ikon aplikasi: gambar koper dan tulisan UPW diperbesar agar memenuhi kotak.
- Ikon aplikasi diperbesar (permintaan pemilik): koper dan tulisan UPW kini memenuhi kotak biru ke atas-bawah dan kiri-kanan
  (sebelumnya banyak ruang kosong). Bentuk dan warna tetap konsep D. Kode pembuat ikon disimpan di alat/ikon.js.
- Alat uji disimpan di proyek (alat/uji/, dijalankan dengan `bash alat/uji/jalankan.sh uji|server|langsung`) dan AGENTS.md dibuat
  sebagai penunjuk bagi asisten AI lain ke catatan proyek (CLAUDE.md). Tidak mengubah aplikasi.
- Tidak ada perubahan struktur data. Penyetuju: tidak diperlukan (Uji Coba).

## v0.23.0 — 14 Nov 2026 — Produksi
- Produksi diperbarui dari v0.16.0 ke v0.23.0 (server Apps Script Produksi deployment @3). Isi sama dengan Uji Coba v0.17.0–v0.23.0:
  21 + 7 catatan prodi (impor massal, dokumen pendukung biodata, riwayat keputusan, penanda tangan, laboratorium, panduan bergambar,
  ikon baru, dll.) dan fitur Masukan dan saran.
- Cadangan: dibuat otomatis oleh server pada permintaan pertama ("Cadangan / sebelum v0.23.0 (struktur data 14 → 18)") di folder Cadangan
  Drive Produksi. Struktur data 14 → 18 (tabel/kolom baru ditambahkan di akhir).
- Rollback: tampilan dan server v0.16.0 tetap bisa membaca data (tabel baru diabaikan). Catatan: akun yang masuk setelah rilis ini kata sandinya
  disimpan dengan cara baru (h2) dan tidak bisa masuk di versi < v0.21.0 sampai disetel ulang oleh Super Admin.
- Penyetuju: pemilik, di chat 14 Nov 2026: "Setuju tayang v0.23.0".

## v0.23.0 — 14 Nov 2026 — Uji Coba
Ringkas: Penambahan tombol Kirim masukan (masalah, saran, pertanyaan) dan menu Masukan untuk Admin; uji menyeluruh seluruh fitur.
- Masukan dan saran (permintaan pemilik): tombol **Kirim masukan** di Info (juga bisa dibuka sebelum biodata lengkap). Isian: jenis (masalah/error,
  permintaan fitur, saran perbaikan, pertanyaan, lainnya), bagian aplikasi (otomatis terisi halaman terakhir), judul, uraian, lampiran gambar/PDF
  (maks 5 MB, disimpan di folder Drive "Masukan"). Versi aplikasi dan jenis perangkat tercatat otomatis. Pengguna melihat riwayat masukannya
  beserta status dan tanggapan. Batas 20 masukan per orang per hari.
- Menu **Masukan** (Admin Prodi, Super Admin): daftar dengan saringan status/jenis, ubah status (baru, ditinjau, direncanakan, selesai, ditolak)
  dan tulis tanggapan, buka lampiran, unduh Excel. Semua isian tersimpan di sheet "Masukan" pada spreadsheet. Beranda Admin menampilkan jumlah masukan baru.
- Uji menyeluruh sebelum rilis: 515 uji otomatis server (471 + 44 biodata), penjelajahan semua halaman/tab/laci untuk 6 peran (177 pemeriksaan, lebar komputer)
  dan lebar ponsel (36 pemeriksaan), serta 5 alur ujung-ke-ujung (aktivasi mahasiswa baru, pengajuan lomba sampai disetujui, masukan,
  unduhan DED/iLKPS/Penilaian/Lab/Portofolio, survei). Dua perbaikan kecil pada formulir masukan ditemukan dan dibereskan sebelum rilis.
- Struktur data versi 18: tabel baru "Masukan" (ditambahkan otomatis, cadangan dibuat lebih dulu). Versi lama tetap bisa membaca data
  (tabel baru diabaikan), jadi rollback ke v0.22.1 aman tanpa pemulihan data.
- Penyetuju: tidak diperlukan (Uji Coba).

## v0.22.1 — 14 Nov 2026 — Uji Coba
Ringkas: Ikon aplikasi baru (koper arsip dengan tulisan UPW).
- Ikon aplikasi baru (pilihan pemilik: konsep D "koper arsip" dengan tulisan UPW), biru #0A5188 dan emas dari logo Poltekpar Bali;
  ukuran 192, 512, maskable (Android), dan 180 (iPhone). Logo institusi Poltekpar Bali tetap dipakai di dalam aplikasi dan surat.
- Tidak ada perubahan struktur data. Penyetuju: tidak diperlukan (Uji Coba).

## v0.22.0 — 14 Nov 2026 — Uji Coba
Ringkas: Penambahan gambar panduan bernomor, ikon mata pada kata sandi, dan pintasan di ikon aplikasi; perbaikan persentase biodata dan tombol unggah ijazah.
Catatan prodi lanjutan (7 butir):
- Kolom Cari orang: petunjuk "Nama, Inisial, NIP atau bidang keahlian".
- Biodata: persentase kini dari semua kolom isian (kolom "kosongkan bila belum/tidak ada" tidak dihitung), dengan keterangan terpisah
  apakah kolom wajib sudah terisi; pengguna tetap bisa melanjutkan bila kolom wajib lengkap.
- Dokumen pendukung dosen: tombol unggah mengikuti isian saat itu (S1 selalu; S2/S3 bila diisi; Serdos bila nomor diisi; sertifikat
  kompetensi/profesi bila diisi, boleh banyak) dan langsung berubah saat mengetik.
- Tombol lihat kata sandi berupa ikon mata.
- Unduhan di aplikasi terpasang: membuka jendela "Simpan ke…" sehingga folder dipilih sendiri (tombol "Buka folder" milik Chrome sering
  tidak berfungsi di aplikasi terpasang macOS); bila tidak tersedia, aplikasi memberi tahu bahwa berkas ada di folder Unduhan.
- Pintasan aplikasi (klik kanan ikon di Dock/taskbar): Info dan panduan, Catat kegiatan, Beranda. Menu macOS (History, Window) milik
  Chrome/macOS dan tidak bisa ditambah oleh aplikasi web.
- Info: 10 gambar panduan dengan penanda nomor (masuk, Beranda, catat kegiatan, peserta & GCET, bukti, biodata, dokumen pendukung,
  Antrean KPS, Laboratorium, impor Excel).
- Perbaikan: KPS yang memilih peran Dosen tidak lagi melihat menu Tanda Tangan.
- Tidak ada perubahan struktur data (tetap versi 17). Rollback ke v0.21.0 aman.
- Penyetuju: tidak diperlukan (Uji Coba).

## v0.21.0 — 14 Nov 2026 — Uji Coba
Ringkas: Penambahan dokumen pendukung biodata dosen, riwayat keputusan KPS, penanda tangan selain KPS, menu Laboratorium, dan halaman Info; aplikasi lebih cepat.
Catatan prodi tahap 3–5 (versi 0.19.0 dan 0.20.0 tidak dirilis terpisah):
- Biodata dosen: bagian "Dokumen pendukung (opsional)": ijazah per jenjang yang diisi, sertifikat pendidik, sertifikat kompetensi/profesi
  (boleh lebih dari satu, masing-masing dengan nama) (catatan no. 10, 11). Pengingat di Beranda bila belum lengkap (no. 12).
- Data Prodi › Dokumen dosen: kelengkapan dokumen tiap dosen dan tombol Ingatkan (Admin Prodi, Super Admin, KPS); pengingat tampil di Beranda
  dosen dan bisa ditandai selesai (no. 12).
- Antrean KPS › Riwayat keputusan: log tetap semua keputusan surat tugas (disetujui/ditunda/revisi/ditolak) dan verifikasi data, per tahun,
  bisa diunduh Excel (no. 14).
- Tanda tangan: Super Admin dapat mengizinkan dosen selain KPS menyiapkan tanda tangan (menu Pengguna › Penanda tangan surat). Pada surat,
  tanda tangan kini tampil di atas nama penanda tangan (bertumpuk seperti ditandatangani langsung); QR dan kode verifikasi di bawahnya (no. 15).
- Menu Laboratorium (Kepala Lab, Laboran; juga Admin/Super Admin, KPS melihat): data sarana/lab, catatan perawatan dan pemakaian, unduh Excel;
  ringkasannya tampil di Penilaian butir 19 dan 21 (no. 17).
- Portofolio PDF dan Excel memuat tautan bukti kegiatan dan tautan cek keaslian surat tugas (no. 18).
- Kecepatan (no. 5): isi sheet dan pengaturan server dibaca sekali per permintaan; hash kata sandi baru lebih ringan (300 putaran,
  tetap memakai kunci rahasia server; hash lama diperbarui otomatis saat masuk); muat ulang aplikasi langsung tampil dari profil terakhir
  sambil diperiksa ke server.
- Tombol Info (ikon i di bilah atas): tentang aplikasi, versi, kredit pengembang, dan panduan langkah demi langkah sesuai peran;
  panduan masuk pertama juga ada di halaman masuk (no. 20).
- Perbaikan: isian formulir unggah (Bank Dokumen, dokumen biodata) tidak lagi hilang setelah memilih file.
- Struktur data versi 17: tabel baru Pengingat, Sarana, LogSarana (versi 16–17). Cadangan otomatis sebelum perubahan. Versi lama tetap bisa
  membaca data ini, dan rollback tidak memerlukan pemulihan data. PERHATIAN: versi lama hanya mengenal format hash kata sandi lama.
  Bila suatu saat dikembalikan ke versi sebelum v0.21.0, pengguna yang sudah masuk di v0.21.0 perlu direset kata sandinya oleh Super Admin.
- Penyetuju: tidak diperlukan (Uji Coba).

## v0.18.0 — 14 Nov 2026 — Uji Coba
Ringkas: Penambahan impor dari Excel dengan templat, unduh daftar akun, dan status dosen (tugas belajar/pensiun).
Catatan prodi tahap 2:
- Impor dari Excel dengan templat yang bisa diunduh (catatan no. 1 dan 21): akun mahasiswa, akun dosen/tendik (Super Admin),
  biodata dosen/tendik massal (sel kosong tidak menghapus isian lama), kurikulum, dan lulusan. Templat berisi lembar Data, Contoh,
  dan Petunjuk; kolom NIM/NIP berformat Teks dan kolom berpilihan punya daftar pilihan. Sebelum impor tampil pratinjau dan daftar baris
  yang perlu diperbaiki (mis. NIP yang rusak karena tersimpan sebagai angka). Pembaca Excel buatan sendiri, tanpa pustaka luar.
- Unduh daftar akun ke Excel di menu Pengguna (Super Admin: semua akun; Admin Prodi: mahasiswa) (no. 3).
- Data Prodi › Status dosen (no. 13): aktif, tugas belajar (mulai, selesai/kembali ke kampus, lama dihitung otomatis), pensiun;
  riwayat per dosen; diisi Admin Prodi/Super Admin, dilihat KPS. Tanggal bertumpuk ditolak.
- Struktur data versi 15: tabel baru StatusDosen. Cadangan otomatis sebelum perubahan. Versi lama (v0.16.0) tetap bisa membaca data ini;
  rollback tidak memerlukan pemulihan data.
- Penyetuju: tidak diperlukan (Uji Coba).

## v0.17.0 — 14 Nov 2026 — Uji Coba (dirilis bersama v0.18.0)
Perbaikan dari catatan prodi (tahap 1):
- Log aktivitas menampilkan username dan nama pengguna, bukan kode akun (catatan no. 2).
- Tombol "Lihat/Sembunyikan" di semua kolom kata sandi: masuk, aktivasi, ganti dan reset kata sandi (no. 4).
- Cari orang: dosen bisa dicari dengan inisial (three letter code), dan inisial tampil di daftar (no. 6).
- Angkatan mahasiswa dari 2 angka pertama NIM (25… = 2025): impor boleh tanpa tahun masuk ("NIM; Nama; kelas"),
  dan pilihan angkatan di Cari orang mengikuti mahasiswa yang ada (no. 7).
- Jenis kegiatan: "Prestasi akademik / lomba" dan "Prestasi non-akademik / lomba" (no. 8).
- Saran Pasal GCET kini muncul saat judul diketik: bagiannya terbuka sendiri dan menampilkan jumlah saran, kata kunci
  dicocokkan juga pada kata berimbuhan (budaya → kebudayaan), dan kata kunci ditambah (tour, lomba, pemasaran, perjalanan, dll.) (no. 9).
- Menu mengikuti peran aktif: KPS yang memilih peran Dosen melihat menu seperti dosen lain, tanpa Antrean KPS (no. 16).
- Ikon aplikasi baru berbentuk persegi (192, 512, maskable, Apple 180): logo muncul di Dock/peluncur saat dipasang (no. 19).
- Tidak ada perubahan struktur data. Rollback ke v0.16.0 aman.
- Penyetuju: tidak diperlukan (Uji Coba).

## v0.16.0 — 13 Nov 2026 — Produksi
- Rilis Produksi pertama: https://upw-ppb.github.io/repositori-upw/ (server Apps Script "Repositori UPW (Produksi)", deployment @2).
  Isi sama dengan v0.16.0 Uji Coba (semua fitur v0.1.0–v0.16.0), tanpa akun contoh, tanpa Mode Uji, tanpa pita UJI COBA.
- Email kampus belum bisa terkirim (DKIM ppb.ac.id belum dipasang): pemilik memilih aktivasi tanpa email sementara
  (dinyalakan Super Admin di menu Pengguna setelah masuk pertama).
- Cadangan: Produksi baru disiapkan hari ini dan belum berisi data pengguna (hanya akun Super Admin); cadangan pertama dibuat
  pemilik dari menu Riwayat Versi setelah masuk pertama. Struktur data versi 14.
- GitHub Pages dipindah ke cabang main, folder /docs (Uji Coba tetap di /uji/).
- Penyetuju: pemilik, di chat 13 Nov 2026: "Setuju tayang v0.16.0" (sebelumnya "Setuju tayang", sebelum v0.16.0 dibuat).

## v0.16.0 — 13 Nov 2026 — Uji Coba
Ringkas: Rilis Produksi pertama; aktivasi akun tanpa email sementara selama email kampus belum bisa terkirim.
- Aktivasi tanpa email (sementara), karena email kampus belum bisa terkirim (DKIM ppb.ac.id belum dipasang):
  - Super Admin menyalakan/mematikannya di menu Pengguna › Aktivasi akun (bawaan: mati).
  - Selama menyala: pengguna baru mengganti kata sandi awal, menuliskan email, lalu langsung aktif (email ditandai "belum terverifikasi").
    Lupa kata sandi ditangani Super Admin (reset dari daftar akun); halaman Lupa kata sandi kini menyebutkan hal ini.
  - Setelah dimatikan: akun yang emailnya belum terverifikasi diminta memverifikasi sekali (kode lewat email; alamat boleh diganti)
    sebelum bisa memakai aplikasi lagi. Akun lain tidak terpengaruh.
  - Daftar akun menandai email yang belum terverifikasi.
- Tidak ada perubahan struktur data (tetap versi 14; penanda memakai kolom emailTerverifikasi yang sudah ada, nilai "tertunda").
  Rollback ke v0.15.1 aman tanpa pemulihan data; akun "tertunda" tetap bisa masuk di versi lama.
- Penyetuju: tidak diperlukan (Uji Coba).

## v0.15.1 — 13 Nov 2026 — Uji Coba
- Persiapan Produksi (tanpa mengubah Produksi):
  - Keamanan: penyiapan server Produksi tidak bisa lagi dipanggil lewat web; pemilik menjalankan fungsi siapkanProduksi() dari editor
    Apps Script, dan kata sandi awal Super Admin hanya tampil di log eksekusi pemilik.
  - Halaman "Riwayat Versi" (menu khusus Super Admin), dibuat otomatis dari CHANGELOG.md (aturan tetap no. 4).
  - Label versi dan pita "UJI COBA" menyesuaikan lingkungan; alat/tampilan.mjs menyusun tampilan Produksi dari docs/uji
    (konfig Produksi, tanpa pita uji, nama cache sendiri).
  - Service worker hanya melayani berkas aplikasinya sendiri, sehingga Produksi (folder utama) tidak mencampuri Uji Coba (folder uji/).
  - Tombol "Buat cadangan sekarang" di halaman Riwayat Versi (Super Admin), untuk cadangan sebelum rilis (aturan tetap no. 3).
  - Daftar periksa Produksi: PRODUKSI.md (penghalang, keputusan pemilik, urutan rilis, rollback).
- Tidak ada perubahan struktur data (tetap versi 14). Rollback ke v0.15.0 aman tanpa pemulihan data.
- Penyetuju: tidak diperlukan (Uji Coba).

## v0.15.0 — 13 Nov 2026 — Uji Coba
- Menu "Bank Dokumen" (Admin Prodi, KPS, Super Admin; pegawai yang ditunjuk sebagai penanggung jawab; asesor baca saja):
  - 94 slot dokumen baku untuk 47 butir Matriks yang dinilai GPM (daftar dari prototipe), ditambah slot "dokumen lain" per butir oleh Admin/KPS.
  - Setiap slot: penanggung jawab (PJ), unggah file atau tautan, tanggal berlaku, keterangan. Status: belum ada, berlaku,
    segera berakhir (≤ 60 hari), kedaluwarsa. Versi lama TIDAK dibuang saat diganti (riwayat versi); hanya versi terbaru yang bisa dihapus.
  - Saringan: perlu tindakan, belum ada PJ, tanggung jawab saya, per kriteria. Pengingat di Beranda untuk PJ.
  - Asesor melihat versi yang berlaku saja; setiap akses tercatat di log.
- Penilaian: keterangan butir menyebut "Bank Dokumen: x dari n dokumen berlaku".
- Perbaikan: saat keluar atau sesi berakhir, semua data yang termuat kini dibersihkan. Sebelumnya, data menu Mata Kuliah Saya
  (v0.14.0) dan Bank Dokumen bisa tetap tampil bila akun lain masuk di perangkat yang sama tanpa memuat ulang halaman.
- File di Drive: Bukti / Bank Dokumen / Butir NN.
- Struktur data versi 14: tabel baru BankDokumen. Cadangan otomatis sebelum perubahan.
  Versi lama (v0.14.0) tetap bisa membaca data ini; rollback tidak memerlukan pemulihan data.
- Penyetuju: tidak diperlukan (Uji Coba).

## v0.14.0 — 13 Nov 2026 — Uji Coba
- Menu "Mata Kuliah Saya" (dosen): mata kuliah yang diampu per semester sesuai tim pengajar dari Data Prodi.
  - Pengampu utama mengunggah RPS, kontrak kuliah, rubrik/portofolio penilaian (file atau tautan; bisa diganti, file lama ke sampah Drive)
    dan memilih metode pembelajaran (7 pilihan + metode lain).
  - Semua dosen dalam tim menambahkan catatan integrasi penelitian/PkM dan bukti pembelajaran daring/luring (file/tautan + keterangan);
    hanya penulis/pengunggahnya yang bisa menghapus.
  - Semester berjalan dan berikutnya bisa diisi; semester lampau hanya dilihat. Kuliah tamu yang menyebut kode MK ikut ditampilkan.
  - Pengingat di Beranda bagi pengampu utama yang belum mengunggah RPS semester berjalan.
- Data Prodi › Portofolio MK (Admin Prodi, KPS, Super Admin): persentase kelengkapan per komponen dan tabel per mata kuliah; detail hanya dilihat.
- Penilaian butir 8, 22, 25: keterangan otomatis dari Portofolio MK pada TS (persentase RPS, metode, integrasi, interaksi, rubrik, kontrak).
  Skor butir tetap dinilai GPM.
- File disimpan di Drive: Bukti / Portofolio MK / <semester> / <kode dan nama MK>; dibuka lewat aplikasi.
- Struktur data versi 13: tabel baru PortofolioMk. Cadangan otomatis sebelum perubahan.
  Versi lama (v0.13.0) tetap bisa membaca data ini; rollback tidak memerlukan pemulihan data.
- Penyetuju: tidak diperlukan (Uji Coba).

## v0.13.0 — 13 Nov 2026 — Uji Coba
- Menu "DED" (Admin Prodi, KPS, Super Admin; dosen yang ditunjuk sebagai penanggung jawab melihat butirnya sendiri):
  - Editor narasi 64 butir DED LAMWisata dengan petunjuk resmi tiap butir, daftar butir Matriks terkait (bobot, syarat skor 4),
    jumlah kata, status (belum / draf / selesai), dan penanggung jawab (PJ) per butir.
  - Pengingat di Beranda untuk dosen PJ yang butirnya belum selesai.
  - Perlindungan tulisan: bila butir sudah diubah orang lain sejak dibuka, simpan ditolak agar tidak saling menimpa;
    editor juga bertanya sebelum ditutup bila ada teks yang belum disimpan.
  - Identitas pengusul, daftar program studi di UPPS, dan tim penyusun (nama, NIDN, jabatan, tanggal).
  - Kemajuan (butir selesai) dan perkiraan jumlah halaman dari batas 120 halaman isi.
  - Unduh Word (.docx) per TS: halaman muka dengan logo, identitas, tim penyusun, 64 butir narasi (petunjuk boleh disertakan),
    dan Tabel 1–23 iLKPS di posisi sesuai petunjuk DED. Format Calibri 12, spasi 1, A4, margin atas 3, kiri 4, bawah 3, kanan 3 cm,
    nomor halaman di kaki. Pembuat Word buatan sendiri (docs/uji/docx.js), tanpa pustaka luar.
- Struktur data versi 12: tabel baru DedNarasi; identitas, daftar PS, dan tim disimpan di Pengaturan. Cadangan otomatis sebelum perubahan.
  Versi lama (v0.12.0) tetap bisa membaca data ini; rollback tidak memerlukan pemulihan data.
- Penyetuju: tidak diperlukan (Uji Coba).

## v0.12.0 — 13 Nov 2026 — Uji Coba
- Menu "Penilaian" (Admin Prodi, KPS, Super Admin): simulasi penilaian mandiri 84 butir Matriks LAMWisata IAPS 1.0 Unggul Sarjana Terapan
  (bobot total 100, skor 0–4, maks. 400) per TS.
  - 36 butir otomatis dihitung dari data aplikasi (biodata dosen, Data Prodi, kegiatan disetujui, lulusan, PMB, dana, survei) dengan rumus
    Matriks resmi, termasuk penyesuaian persentase responden tracer/pengguna (Prmin). Butir tanpa data dihitung 0 dan ditandai.
  - 39 butir dinilai GPM (skor 0–4 + catatan bukti, tercatat siapa dan kapan); 9 butir gabungan memakai rumus butirnya.
  - Capaian per kriteria, prioritas perbaikan (bobot × kekurangan skor), syarat skor 4 dan saran tiap butir, target (diatur Admin),
    saringan, dan ekspor Excel (ringkasan + 84 butir). Halaman selalu menghitung ulang saat dibuka.
  - Tafsiran yang tidak dirinci Matriks ditulis di keterangan butir: PTW (lulus ≤ 4 tahun 3 bulan, angkatan TS-6..TS-3), PPS, PBS (sedang+tinggi),
    TKM (rata-rata 5 aspek ÷ 4), komposisi publikasi butir 48, sumber dana penelitian/PkM.
- Data Prodi › Data dosen TS: isian baru "pendidikan dasar sesuai kompetensi inti" (butir 12) dan "pendidikan tertinggi linier" (butir 13).
- Struktur data versi 11: tabel baru SkorGpm; kolom baru di akhir DosenTs (dasarSesuai, linier). Cadangan otomatis sebelum perubahan.
  Versi lama (v0.11.0) tetap bisa membaca data ini; rollback tidak memerlukan pemulihan data.
- Penyetuju: tidak diperlukan (Uji Coba).

## v0.11.0 — 12 Nov 2026 — Uji Coba
- Menu "Survei" (Admin Prodi/Super Admin membuat; KPS melihat hasil):
  - Templat sesuai instrumen: Tabel 22 kepuasan mahasiswa (5 aspek), Tabel 11 pengguna lulusan (7 aspek + tahun lulus alumni),
    kepuasan mitra, dosen, dan tendik. Jenis pertanyaan: skala 4 (Kurang–Sangat baik), pilihan ganda, kotak centang, isian singkat, paragraf.
  - Sasaran: mahasiswa, mahasiswa baru, dosen, tendik (kartu di Beranda), dan/atau publik (tautan ?survei=KODE tanpa login,
    dengan pesan siap dibagikan lewat WhatsApp/email). Anonim atau dengan identitas; satu akun hanya bisa mengisi sekali.
  - Draf → Dibuka → Ditutup (otomatis tertutup setelah tanggal tutup; bisa dibuka lagi). Setelah dibuka, pertanyaan terkunci.
  - Hasil: rekap per pertanyaan (persentase dan rata-rata), jawaban teks, ekspor Excel (rekap + jawaban), rencana tindak lanjut per aspek.
- Tabel iLKPS kini lengkap 33 lembar: Tabel 11 dan 22 dari survei yang dibuka pada TA tersebut (persentase per tingkat + tindak lanjut),
  Ref 11a menghitung tanggapan pengguna menurut tahun lulus alumni.
- Formulir survei tidak menghapus jawaban saat ada pertanyaan wajib yang terlewat; pertanyaan itu ditandai dan digulir ke layar.
- Struktur data versi 10: tabel baru Survei dan Jawaban. Cadangan otomatis sebelum perubahan. Versi lama (v0.10.0) tetap bisa membaca
  data ini; rollback tidak memerlukan pemulihan data (survei dan jawaban tetap tersimpan, menu Survei tidak tampil).
- Penyetuju: tidak diperlukan (Uji Coba).

## v0.10.0 — 12 Nov 2026 — Uji Coba
- Data Prodi › Lulusan: impor/perbarui dengan menempel dari Excel (NIM, nama, tahun masuk, tanggal lulus, IPK, waktu tunggu,
  kesesuaian bidang kerja, tempat kerja); tanggal DD/MM/YYYY dan koma desimal diterima; satu baris salah membatalkan impor.
  Akun mahasiswa dengan NIM yang sama otomatis berstatus L (lulus).
- Data Prodi › PMB: daya tampung, pendaftar, lulus seleksi, diterima (daftar ulang) per tahun.
- Data Prodi › Keuangan: penggunaan dana UPPS dan prodi per tahun akademik (10 jenis sesuai Tabel 21).
- Tabel iLKPS kini 31 lembar, berurutan seperti berkas resmi: tambah Tabel 8 (IPK), 9 (masa studi, blok Sarjana Terapan
  TS-6..TS-3), 10a–c (tracer, tahun lulus TS-4..TS-2), Referensi 11a (jumlah lulusan; tanggapan dari survei di rilis berikutnya), 21 (dana).
- Struktur data versi 9: tabel baru Lulusan, Penerimaan, Dana. Cadangan otomatis sebelum perubahan. Versi lama (v0.9.0) tetap bisa
  membaca data ini; rollback tidak memerlukan pemulihan data (status L pada akun mahasiswa tetap).
- Penyetuju: tidak diperlukan (Uji Coba).

## v0.9.0 — 12 Nov 2026 — Uji Coba
- Akun asesor (baca saja, berkedaluwarsa), dikelola Super Admin di halaman Pengguna:
  - Buat akun (nama, instansi, berlaku sampai; maks. 90 hari): nama pengguna otomatis (asesor-<nama>-NN), langsung aktif tanpa
    email, kata sandi sementara ditampilkan sekali dan wajib diganti saat masuk pertama.
  - Ubah tanggal berlaku, nonaktifkan/aktifkan (sesi langsung berakhir), reset kata sandi; jumlah akses dan log akses asesor.
  - Setelah tanggal berlaku lewat, masuk dan sesi lama ditolak dengan pesan jelas (dicatat).
- Menu asesor: Beranda (petunjuk + masa berlaku), Tabel iLKPS (tanpa mengatur TS), Kegiatan disetujui (cari), Cari orang, Akun saya.
  Asesor hanya dapat membuka kegiatan berstatus data disetujui beserta bukti dan surat tugasnya; tautan ?keg= di Excel berfungsi.
  Draf, kegiatan yang belum disetujui, biodata, portofolio, Data Prodi, dan tanda tangan tidak dapat diakses.
- Setiap akses asesor dicatat di Log (asesor.ilkps, asesor.lihatKegiatan, asesor.lihatBukti, asesor.daftarKegiatan, asesor.direktori).
- Struktur data versi 8: kolom baru di akhir tabel Pengguna (berlakuSampai, instansi). Cadangan otomatis sebelum perubahan.
  Versi lama (v0.8.0) tetap bisa membaca data ini; rollback tidak memerlukan pemulihan data, tetapi di versi lama akun asesor
  tidak berkedaluwarsa otomatis (nonaktifkan manual bila perlu).
- Penyetuju: tidak diperlukan (Uji Coba).

## v0.8.0 — 12 Nov 2026 — Uji Coba
- Menu "Data Prodi" (Admin Prodi/Super Admin mengubah; KPS melihat):
  - Kurikulum: tambah/ubah/hapus mata kuliah (kode, semester, kompetensi, sks kuliah/seminar/praktik, CPL, RPS, unit) dan impor
    dengan menempel baris dari Excel; ringkasan total sks dan PJP.
  - Tim pengajar per semester: pengampu utama (dosen) + maks. 3 orang termasuk praktisi; salin dari semester yang sama tahun lalu.
  - Praktisi (dosen industri) tanpa akun aplikasi.
  - Data dosen per tahun akademik untuk EWMP (PS lain, luar PT, penelitian, PkM, tugas tambahan; sks PS otomatis dari tim pengajar,
    bisa ditimpa) dan kesesuaian bidang keahlian dengan MK.
- Tabel iLKPS kini 24 lembar: tambah Tabel 1 (dosen tetap), 2 (dosen industri/praktisi), 3 (dosen tidak tetap), 4 (kurikulum,
  konversi jam = sks × 45), 5 (pembimbing utama TA dari kegiatan bimbingan yang disetujui), 6 (EWMP pada TS).
- Biodata dosen: isian baru "Mata kuliah yang diampu di prodi lain" (kolom baru di akhir sheet BiodataPegawai).
- Jenis kegiatan Bimbingan tugas akhir: isian baru "Jumlah mahasiswa (prodi lain)".
- Struktur data versi 7: tabel baru MataKuliah, Praktisi, TimPengajar, DosenTs; kolom baru mkLain. Cadangan otomatis sebelum perubahan.
  Versi lama (v0.7.0) tetap bisa membaca data ini (tabel/kolom baru diabaikan); rollback tidak memerlukan pemulihan data.
- Penyetuju: tidak diperlukan (Uji Coba).

## v0.7.0 — 12 Nov 2026 — Uji Coba
- Menu "Tabel iLKPS" (Admin Prodi, KPS, Super Admin): 18 lembar tabel LAMWisata tersusun otomatis dari kegiatan yang datanya
  disetujui — 7a, 7b, 12, 13, 14 (Vokasi), 15 Bagian 1–4, 15a, 16, 17, 18, 19 (Vokasi), 20 Bagian 1–3, 23 — mengikuti kolom
  berkas resmi "Tabel iLKPS_Lamwisata.xlsx". Klik baris membuka kegiatan dan buktinya.
- TS (tahun akademik penilaian) ditetapkan Admin Prodi/Super Admin (bawaan 2025/2026); rentang TS-2..TS. Pengguna lain bisa
  melihat pratinjau TS lain tanpa mengubah ketetapan. Jumlah kegiatan yang masih dalam proses ditampilkan per tabel.
- Ekspor Excel: lembar Ringkasan, satu lembar per tabel (dengan kolom "Tautan bukti" per baris), dan Rincian tabel hitung.
- Tautan ?keg=<kode> membuka detail kegiatan setelah masuk (dipakai di Excel; nanti untuk asesor).
- Belum otomatis (sumber data lain): Tabel 1–6, 8–11, 21, 22. Kolom yang belum ada di formulir (manfaat kerja sama, tema
  roadmap PkM, bidang keahlian dosen) dikosongkan dengan catatan.
- Struktur data tetap versi 6 (TS disimpan di Pengaturan "tsAwal"); rollback ke v0.6.0 tidak memerlukan pemulihan data.
- Penyetuju: tidak diperlukan (Uji Coba).

## v0.6.0 — 12 Nov 2026 — Uji Coba
- Menu "Portofolio" untuk semua pengguna yang mencatat kegiatan: semua kegiatan yang melibatkan pengguna (pengaju, peserta yang
  ditandai, atau dosen pendamping) per semester, dengan ringkasan (jumlah kegiatan, data disetujui, kelengkapan bukti).
  Draf milik orang lain tidak ditampilkan.
- Dokumen pribadi: tambah sertifikat, sertifikat bahasa, pelatihan, SK, dll. (nama, jenis, tahun; file maks. 10 MB atau tautan),
  lihat, dan hapus. File disimpan di Drive: Portofolio / <NIM/NIP> <nama>. Hanya pemilik yang bisa melihat dan menghapus.
- Ekspor: PDF portofolio (lewat jendela cetak), Excel .xlsx (lembar Identitas, Kegiatan, Bukti, Dokumen pribadi), dan ZIP berisi
  semua file bukti kegiatan dan dokumen pribadi beserta daftar isinya. Penulis ZIP/Excel ditulis sendiri (docs/uji/zip.js),
  tanpa pustaka luar; hasil diuji dengan unzip, Python zipfile, dan Quick Look macOS.
- Struktur data versi 6: tabel baru DokumenPribadi. Cadangan otomatis sebelum perubahan. Versi lama (v0.5.0) tetap bisa membaca
  data ini (tabel baru diabaikan); rollback tidak memerlukan pemulihan data.
- Penyetuju: tidak diperlukan (Uji Coba).

## v0.5.0 — 12 Nov 2026 — Uji Coba
- Kode QR pada surat pengantar yang terbit, berisi tautan cek keaslian (?cek=KODE). Pembuat QR ditulis sendiri (docs/uji/qr.js,
  tanpa pustaka luar); diuji terbaca oleh pemindai QR Chrome untuk teks 1–213 karakter (versi QR 1–10).
- Menu "Tanda Tangan Saya" (akun berperan KPS): buat langsung di kotak gambar atau unggah foto/pindaian; latar putih
  dibuat transparan dan dirapikan; wajib centang persetujuan. Bisa diganti atau dihapus.
- Tanda tangan disimpan tersandi di Drive (folder Tanda Tangan; kunci di Script Properties KUNCI_TTD). Tidak ada aksi bagi
  Admin/Super Admin untuk melihat atau mengganti tanda tangan KPS di aplikasi.
- Saat KPS menyetujui surat, tanda tangan aktifnya ditempel bersama pernyataan elektronik, kode verifikasi, dan QR.
  Mengganti/menghapus tanda tangan tidak mengubah surat yang sudah terbit. Log pemakaian di halaman Tanda Tangan Saya.
  Antrean KPS mengingatkan bila KPS belum menyimpan tanda tangan.
- Struktur data versi 5: tabel baru TandaTangan. Cadangan otomatis sebelum perubahan. Versi lama (v0.4.0) tetap bisa membaca
  data ini (tabel baru diabaikan; surat tampil tanpa QR dan tanda tangan); rollback tidak memerlukan pemulihan data.
- Belum ada: Portofolio Saya, ekspor iLKPS.
- Penyetuju: tidak diperlukan (Uji Coba).

## v0.4.0 — 12 Nov 2026 — Uji Coba
- Unggah bukti bersama di detail kegiatan: tiap dokumen cukup diunggah sekali oleh pengaju/peserta mana pun, lalu terkunci;
  hanya pengunggah yang bisa membatalkan (file dipindah ke sampah Drive). Bisa berupa file (PDF, gambar, Word, Excel, PowerPoint,
  maks. 10 MB, isi dicek sesuai jenisnya), tautan https (video/album), atau keterangan "tidak tersedia" dengan alasan.
  File disimpan di Drive: Bukti / <semester> / <id> <judul>, tidak dibagikan, dibuka lewat aplikasi.
- Daftar dokumen: kegiatan bersurat tugas memakai daftar baku (surat tugas resmi, laporan dosen/mahasiswa, daftar hadir, foto,
  plus MoU mitra / piagam / materi narasumber sesuai jenis); kegiatan tanpa surat mengikuti daftar bukti jenis kegiatannya.
- Batas pelengkapan bukti = 5 hari kerja setelah kegiatan selesai (Sabtu–Minggu dan hari libur di Pengaturan "hariLibur" tidak dihitung).
  Penanda "Bukti terlambat"; pengingat di Beranda ("Perlu tindakan") dan angka di menu.
- Antrean KPS menampilkan peringatan bila pengaju/peserta masih punya kegiatan yang buktinya terlambat (pertimbangan menunda).
- Verifikasi data: bukti wajib lengkap → otomatis "Menunggu verifikasi data" (kegiatan tanpa surat: tombol "Ajukan verifikasi").
  Menu "Verifikasi": dosen pendamping untuk lomba mahasiswa; Admin Prodi/KPS/Super Admin untuk lainnya; pengaju tidak
  memverifikasi miliknya sendiri. Setujui / minta revisi / tolak (catatan wajib selain setuju) → perbaiki → "Ajukan ulang".
- Pengaju bisa melengkapi data akreditasi (tingkat, isian jenis, pasal GCET) setelah surat terbit tanpa mengubah surat.
- Struktur data versi 4: kolom baru di akhir tabel Kegiatan (bukti, verifId, tglVerif); pengaturan hariLibur.
  Cadangan otomatis sebelum perubahan. Versi lama (v0.3.0) tetap bisa membaca data ini (kolom baru diabaikan);
  rollback tidak memerlukan pemulihan data, tetapi bukti yang sudah diunggah tidak tampil di versi lama.
- Belum ada: tanda tangan KPS dan QR, portofolio, ekspor iLKPS.
- Penyetuju: tidak diperlukan (Uji Coba).

## v0.3.0 — 12 Nov 2026 — Uji Coba
- Menu "Kegiatan": catat kegiatan (23 jenis dari prototipe, isian tambahan per jenis, pencari jenis, "Lainnya"),
  tanggal mulai–selesai, tingkat, semester otomatis, saran pasal GCET.
- Penandaan peserta: dosen/tendik (cari nama/NIP/inisial), mahasiswa per kelas (dengan pengecualian nama) atau satu per satu.
  Mahasiswa pengaju otomatis ikut; lomba mahasiswa wajib memilih dosen pendamping.
- Pengajuan surat tugas ke KPS: draf → menunggu KPS → terbit / ditunda / perlu revisi / ditolak (catatan wajib selain setuju),
  perbaikan dan kirim ulang oleh pengaju, riwayat keputusan.
- Menu "Antrean KPS" (selalu tampil untuk akun berperan KPS): draf surat, setujui, tunda, minta revisi, tolak.
- Surat pengantar KPS (dosen/tendik → Kabag Administrasi Umum; mahasiswa → Kabag Adm. Akademik, Kemahasiswaan & Kerjasama)
  dengan lampiran peserta; unduh PDF lewat jendela cetak (A4). Isi surat dan peserta dibekukan saat disetujui.
- Kode verifikasi surat (UPW-yymm-XXXXXXXX) dan halaman cek keaslian tanpa login (?cek=KODE).
- Struktur data versi 3: tabel Kegiatan baru; pengaturan tujuanDosen/tujuanMhs. Cadangan otomatis sebelum perubahan.
  Versi lama (v0.2.0) tetap berjalan dengan data ini (tabel baru diabaikan); rollback tidak memerlukan pemulihan data.
- Belum ada: unggah bukti, batas 5 hari kerja, verifikasi data Admin, tanda tangan dan QR (rilis berikutnya).
- Apps Script deployment @4; tag v0.3.0-uji.
- Penyetuju: tidak diperlukan (Uji Coba).

## v0.2.0 — 11 Nov 2026 — Uji Coba
- Biodata mahasiswa (Kuesioner Mahasiswa Baru Bagian I): dropdown provinsi → kabupaten/kota, pilihan "Lainnya",
  kolom wajib/opsional, bagian keluarga dan ekonomi hanya untuk Admin, penanda "data lama".
- Pembaruan tiap semester (tempat tinggal, status bekerja, bahasa Inggris, transportasi) dengan riwayat.
- Biodata dosen dan tendik (kolom Tabel iLKPS; kolom khusus dosen/tendik), izin tampilkan nomor HP.
- Wajib lengkapi biodata setelah aktivasi sebelum menu lain terbuka (boleh simpan sebagian).
- Menu "Cari orang": dosen, tendik, mahasiswa (tanpa data pribadi).
- Impor mahasiswa dengan tahun masuk dan kelas; Admin dapat mengubah tahun masuk, kelas, dan status mahasiswa (A/C/N/L/D/K/M/W).
- Admin/Super Admin dapat melihat biodata lengkap; daftar pengguna menampilkan kelas dan kelengkapan biodata.
- Struktur data versi 2: tabel BiodataMahasiswa, BiodataPegawai, RiwayatSemester; kolom baru di akhir tabel Pengguna.
  Server mencadangkan spreadsheet + daftar file Drive otomatis sebelum menyesuaikan struktur.
  Versi lama (v0.1.x) tetap bisa membaca data ini karena kolom lama tidak berubah.
- Keamanan data: teks yang diawali angka atau = + - @ disimpan sebagai teks murni (nol di depan nomor HP tidak hilang,
  isian tidak dijalankan sebagai rumus).
- Penyetuju: tidak diperlukan (Uji Coba).

## v0.1.1 — 9 Nov 2026 — Uji Coba
- Perbaikan: isian formulir terhapus sebelum dikirim sehingga semua login gagal.

## v0.1.0 — 9 Nov 2026 — Uji Coba
- Fondasi: masuk, aktivasi (kata sandi baru + verifikasi email), lupa/ganti kata sandi, peran ganda,
  impor dan kelola pengguna, reset kata sandi oleh Super Admin, log aktivitas.
