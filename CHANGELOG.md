# Riwayat versi — Repositori Akreditasi UPW

Format: versi, tanggal, lingkungan, isi, penyetuju. Produksi hanya berubah setelah pemilik menulis "setuju tayang".
Rilis Uji Coba tidak memerlukan persetujuan tayang (aturan tetap no. 1–2 di CLAUDE.md).

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
