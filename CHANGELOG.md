# Riwayat versi — Repositori Akreditasi UPW

Format: versi, tanggal, lingkungan, isi, penyetuju. Produksi hanya berubah setelah pemilik menulis "setuju tayang".
Rilis Uji Coba tidak memerlukan persetujuan tayang (aturan tetap no. 1–2 di CLAUDE.md).

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
