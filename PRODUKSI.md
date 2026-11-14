# Daftar periksa Produksi — Repositori Akreditasi UPW

**TAYANG 13 Nov 2026: v0.16.0** di https://upw-ppb.github.io/repositori-upw/ (persetujuan pemilik: "Setuju tayang v0.16.0").
**Diperbarui 14 Nov 2026: v0.23.0** (deployment @3; persetujuan: "Setuju tayang v0.23.0").
Email kampus (DKIM) belum beres → pakai aktivasi tanpa email sementara (v0.16.0). Bagian A tetap berlaku untuk DKIM.

Langkah pemilik setelah tayang: masuk sebagai `superadmin` (sandi sementara dari log) → ganti sandi → Pengguna › Aktivasi akun →
Nyalakan aktivasi tanpa email → Riwayat Versi › Buat cadangan sekarang → impor akun (dosen/tendik oleh Super Admin, mahasiswa oleh Admin Prodi).

Rilis Produksi berikutnya: uji di Uji Coba → "setuju tayang vX.Y.Z" → cadangan (Riwayat Versi) → push server Produksi (lihat bawah) →
`node alat/tampilan.mjs produksi <URL> docs` → CHANGELOG (Produksi, kutip persetujuan) → commit di main, tag vX.Y.Z, push.

Disusun 13 Nov 2026 (v0.15.1). Produksi **belum dibuka**. Aturan tetap: Produksi hanya diubah setelah pemilik menulis
**"setuju tayang"** di chat, dan setiap perubahan dicoba di Uji Coba lebih dulu (CLAUDE.md, aturan no. 1–2).

## A. Penghalang (wajib beres sebelum tayang)

| | Hal | Status 13 Nov 2026 | Siapa |
|---|---|---|---|
| 1 | **Email kampus (DKIM).** Email dari aplikasi ditolak (550 5.7.26 DMARC) karena kunci DKIM `google._domainkey.ppb.ac.id` kosong, sementara DMARC `p=reject`. Tanpa ini pengguna Produksi **tidak bisa menerima kode verifikasi** (aktivasi akun, lupa sandi). | Belum. Dicek ulang lewat DNS: masih `v=DKIM1; p=` | UPT TIK (admin Workspace + DNS) |
| 2 | Persetujuan pemilik: tulisan "setuju tayang" di chat. | Belum | Pemilik |

Langkah untuk UPT TIK (sekali saja):
1. Admin Console Google Workspace → Aplikasi → Google Workspace → Gmail → **Autentikasi email** → domain `ppb.ac.id` → **Buat catatan baru** (2048 bit).
2. Pasang catatan TXT `google._domainkey` hasil langkah 1 di DNS `ppb.ac.id` (menggantikan catatan kosong yang sekarang).
3. Tunggu DNS menyebar (hingga 48 jam), lalu tekan **Mulai autentikasi** di halaman yang sama.

Setelah itu prodi cukup memberi tahu; pengecekan dan uji kirim email dilakukan di Uji Coba.

## B. Keputusan pemilik

1. **Kapan membuat server Produksi.** Proyek Apps Script, spreadsheet, dan folder Drive Produksi terpisah dari Uji Coba.
   Boleh dibuat lebih dulu (belum bisa diakses siapa pun sebelum alamatnya diumumkan), atau menunggu DKIM beres.
2. **Data awal yang disiapkan prodi:**
   - Dosen dan tendik: Nama, NIP (diimpor Super Admin).
   - Mahasiswa aktif: NIM; Nama; tahun masuk; kelas (diimpor Admin Prodi).
   - Kurikulum, tim pengajar semester berjalan, praktisi (Data Prodi).
   - Penanggung jawab Bank Dokumen dan butir DED.
3. **Biodata lama dari PDF:** migrasi sekali sebelum peluncuran (fitur belum dibuat; perlu contoh berkasnya).
4. **Siapa Super Admin dan Admin Prodi** di Produksi (akun upw@ppb.ac.id tetap pemilik semua layanan).

## Status server Produksi (13 Nov 2026)

- Proyek Apps Script **Repositori UPW (Produksi)** sudah dibuat (atas permintaan pemilik "Buat sekarang"), terpisah dari Uji Coba.
  Data proyek: `alat/produksi.json` (scriptId, deploymentId, URL).
- Kode v0.15.1 sudah dikirim dan diterapkan (deployment @1).
- 13 Nov 2026: pemilik menjalankan `izinkanServer` dan `siapkanProduksi` di editor. Server menjawab `lingkungan: "produksi"`.
  Spreadsheet "Repositori UPW — Data" dan folder "Repositori UPW" ada di Drive upw@. Akun `superadmin` dengan kata sandi
  sementara yang hanya diketahui pemilik (wajib diganti saat masuk pertama, setelah tampilan Produksi dibuka).
- Tampilan Produksi (folder `docs/`) tetap halaman "belum dibuka". Alamat server tidak diumumkan.
- Berikutnya: menunggu DKIM (A.1) dan "setuju tayang" (A.2), lalu langkah C.5 dan seterusnya.

Memperbarui kode server Produksi (HANYA setelah "setuju tayang"): salin `gas/*.js`, `gas/appsscript.json`, `gas/.claspignore`
ke folder sementara, buat `.clasp.json` berisi scriptId dari `alat/produksi.json`, lalu `clasp push -f` dan
`clasp redeploy <deploymentId> --description "vX.Y.Z"` (URL tetap).

## C. Urutan rilis Produksi (setelah A beres dan "setuju tayang")

1. Rilis yang akan ditayangkan sudah lulus di Uji Coba (uji otomatis, uji tampilan, pemeriksaan server langsung).
2. ~~Buat proyek Apps Script Produksi~~ (sudah, 13 Nov 2026). Kirim kode `gas/` versi rilis ke proyek itu
   (lihat "Memperbarui kode server Produksi" di atas; `gas/.clasp.json` tetap milik Uji Coba).
3. ~~Pemilik menjalankan izinkanServer dan siapkanProduksi~~ (sudah, 13 Nov 2026). Catatan cara:
   - jalankan fungsi `izinkanServer` (memberi izin Sheets, Drive, email);
   - jalankan fungsi `siapkanProduksi`; nama pengguna dan kata sandi awal Super Admin tampil di **Log eksekusi**. Kata sandi ini
     hanya dilihat pemilik, tidak ditulis di chat atau berkas.
   - (Penyiapan Produksi lewat web sudah ditutup sejak v0.15.1.)
4. ~~Terapkan sebagai Web App~~ (sudah: deployment tetap di `alat/produksi.json`; rilis berikutnya cukup `clasp redeploy`).
5. Pemilik masuk sebagai Super Admin di Produksi, ganti kata sandi, verifikasi email (butuh DKIM), lalu buat cadangan pertama
   (menu Riwayat Versi → Buat cadangan sekarang).
6. Gabungkan cabang `fase-1/fondasi` ke `main`; GitHub Pages diarahkan ke `main` folder `/docs`.
7. Susun tampilan Produksi: `node alat/tampilan.mjs produksi <URL /exec> docs` (mengganti halaman "belum dibuka" di folder `docs/`;
   folder `docs/uji` tidak berubah). Commit, tag `vX.Y.Z`, dorong ke GitHub.
8. Uji asap di https://upw-ppb.github.io/repositori-upw/ : masuk, buka Beranda, Kegiatan, Penilaian; pastikan tidak ada pita UJI COBA
   dan kode verifikasi tidak tampil di layar.
9. Catat di CHANGELOG.md: versi, tanggal, "Produksi", isi, dan **kutipan persetujuan pemilik**. Halaman Riwayat Versi ikut diperbarui.
10. Impor akun nyata (dosen/tendik oleh Super Admin, mahasiswa oleh Admin Prodi), lalu umumkan alamat Produksi.

## D. Pengembalian versi (rollback) — ringkas

Hanya atas permintaan pemilik ("kembalikan ke versi X"):
1. Tampilan: pasang ulang isi folder `docs/` dari tag `vX` di GitHub.
2. Server: di Apps Script Produksi → Terapkan → Kelola penerapan → ubah versi penerapan ke versi bernomor milik `vX` (URL tetap).
3. Data pengguna **tidak** ikut dikembalikan. Pemulihan data dari cadangan hanya atas keputusan tertulis pemilik
   (isian setelah tanggal cadangan akan hilang).
4. Catat kejadian dan alasannya di CHANGELOG.md.

Panduan darurat **bergambar** (aturan no. 7) dibuat setelah proyek Produksi ada, dengan tangkapan layar GitHub dan Apps Script
Produksi yang sebenarnya, lalu disimpan di Drive prodi.

## E. Yang tidak ikut ke Produksi

- Akun contoh, data contoh, dan Mode Uji (kode verifikasi di layar). Semuanya hanya ada bila lingkungan = uji.
- Spreadsheet dan folder Drive Uji Coba (Produksi memakai milik sendiri).
- Pita "UJI COBA" dan catatan "Baru di Uji Coba" di Beranda.
