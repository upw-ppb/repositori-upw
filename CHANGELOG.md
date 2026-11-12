# Riwayat versi — Repositori Akreditasi UPW

Format: versi, tanggal, lingkungan, isi, penyetuju. Produksi hanya berubah setelah pemilik menulis "setuju tayang".
Rilis Uji Coba tidak memerlukan persetujuan tayang (aturan tetap no. 1–2 di CLAUDE.md).

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
