# Petunjuk untuk asisten AI (semua alat)

Catatan proyek lengkap ada di **[CLAUDE.md](CLAUDE.md)**. Baca seluruhnya sebelum mengubah apa pun: isinya tujuan aplikasi, keputusan
pemilik, alamat server Uji Coba dan Produksi, riwayat setiap versi, dan pelajaran dari bug sebelumnya. Riwayat rilis: CHANGELOG.md.
Daftar periksa Produksi: PRODUKSI.md.

Ringkasan aturan yang tidak boleh dilanggar (rincian di CLAUDE.md):
1. Pemilik bukan programmer: jelaskan dalam Bahasa Indonesia sederhana.
2. Urutan rilis selalu Uji Coba (docs/uji + server Uji Coba) lalu Produksi. Produksi (docs/ dan server Produksi) HANYA diubah setelah
   pemilik menulis "setuju tayang" di chat; kutip persetujuan itu di CHANGELOG.md.
3. Jangan pernah mengetik atau menulis kata sandi pemilik, dan jangan menaruh kata sandi di berkas yang di-commit (repositori publik).
4. Jangan `git checkout` cabang lain di folder OneDrive ini. Kerja di cabang fase-1/fondasi; perbarui main dengan
   `git push origin fase-1/fondasi:main`.
5. Jangan ubah docs/*.js langsung: tampilan Produksi dibuat oleh `node alat/tampilan.mjs produksi <URL> docs` dari docs/uji.
6. Tanpa build step, tanpa node_modules, tanpa pustaka luar.
7. Sebelum rilis: `bash alat/uji/jalankan.sh uji` harus 0 gagal, dan perubahan tampilan diuji lewat server lokal
   (`bash alat/uji/jalankan.sh server`, http://localhost:8790).
