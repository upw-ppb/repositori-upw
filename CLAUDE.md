# Repositori Akreditasi UPW — catatan proyek

Aplikasi repositori kegiatan Prodi Usaha Perjalanan Wisata (UPW), Politeknik Pariwisata Bali,
untuk akreditasi LAMWisata IAPS 1.0 status Unggul, program Sarjana Terapan.

Pemilik proyek bukan programmer: jelaskan dalam Bahasa Indonesia yang sederhana, minta persetujuan
sebelum menayangkan ke Produksi, dan jangan pernah mengetik kata sandi atas nama pemilik.

## Dokumen acuan
- Rancangan aplikasi (Claude Docs): https://claude.ai/artifact/W4zXNRq8xCk6kQ6y5HKMvo
- Panduan persiapan (Claude Docs): https://claude.ai/artifact/K8gBRVdwqQS9WGfhuugKSc
- Instrumen LAMWisata (DED, Matriks D4 Unggul, Tabel iLKPS): folder Downloads pemilik,
  "LAMWISATA_IAPS 1.0 Status Terakreditasi Unggul Program Sarjana Terapan".
- Logo: aset/logo-poltekpar-bali.png (asal: artifact "Aset Logo Poltekpar Bali").

## Keputusan utama
- PWA di GitHub Pages (alamat bawaan github.io) + Google Apps Script sebagai server,
  Google Sheets sebagai database, Drive untuk bukti, Gmail untuk kode & pengumuman.
- Pemilik semua akun: upw@ppb.ac.id (Google Workspace kampus, dan akun GitHub prodi).
- Akun hanya dibuat lewat impor (mahasiswa oleh Admin: Nama, NIM, tahun masuk, kelas;
  dosen/tendik oleh Super Admin: Nama, NIP). Login awal username = kata sandi = NIM/NIP,
  lalu wajib ganti sandi + verifikasi email, lalu wajib lengkapi biodata.
- Peran: Super Admin, Admin/GPM, Dosen, Tendik, Mahasiswa, Asesor (baca saja, berkedaluwarsa).
- Alur status: Draf → Diajukan → Perlu Revisi (catatan) → Diajukan Ulang → Disetujui / Ditolak.
  Kegiatan non-akademik/lomba mahasiswa diverifikasi dosen pendamping; lainnya oleh Admin.
- Semester: Ganjil = Juli–Desember, Genap = Januari–Juni. Jul–Des 2026 = Ganjil 2026/2027;
  Jan–Jun 2026 = Genap 2025/2026. Semester mahasiswa = 2 × (tahun awal TA − tahun masuk) + (1 ganjil | 2 genap).
- Penandaan per orang, per kelas (semester + kelas), beberapa kelas, atau satu angkatan.
- Portofolio Saya per pengguna, bisa diekspor (PDF, Excel, ZIP bukti).
- Notifikasi default di aplikasi; email hanya untuk kode dan pengumuman pilihan Admin.
- Dwibahasa (ID/EN) untuk tampilan. Warna aksen #0A5188, emas dari logo sebagai aksen kedua.
- Tautan bukti untuk asesor lewat halaman aplikasi (login asesor), sampai UPT TIK menjawab.
- Dua lingkungan: Uji Coba dan Produksi. Perubahan selalu dicoba di Uji Coba dulu.
- Biodata mahasiswa = Kuesioner Mahasiswa Baru Bagian I (skema PM_SCHEMA di prototipe):
  wajib kecuali penghasilan, transportasi, skor tes, bahasa lain, disabilitas; setiap pilihan ganda punya "Lainnya".
  Diperbarui tiap semester (dengan riwayat): status tempat tinggal, status bekerja, bahasa Inggris.
- Wilayah: data/wilayah-kepmendagri-2025.json (38 provinsi, 514 kab/kota; sumber github.com/cahyadsn/wilayah, MIT),
  dropdown provinsi → kabupaten/kota untuk asal mahasiswa dan lokasi sekolah.
- Data lama biodata dari PDF (kolom berbeda): migrasi sekali sebelum peluncuran; kolom cocok diisi, sisanya kosong,
  ditandai "data lama", dan wajib dikonfirmasi/dikoreksi mahasiswa sebelum disimpan.
- Pembuat survei untuk Admin (Draf → Dibuka → Ditutup; anonim/beridentitas; tautan tanpa login untuk alumni/pengguna).
  Kuesioner mahasiswa baru Bagian II dst. akan disusun kemudian dengan fitur ini.

## ATURAN TETAP: rilis dan pengembalian versi (disetujui pemilik, 9 Nov 2026)
Rincian lengkap: bagian "Prosedur rilis dan pengembalian versi" di dokumen rancangan.
1. Tidak ada perubahan yang langsung tayang ke Produksi. Urutan: Prototipe (data contoh) → Uji Coba (alamat,
   spreadsheet, dan Drive terpisah) → Produksi. Perbaikan kecil tanpa perubahan tampilan boleh melewati Prototipe,
   tetapi TIDAK boleh melewati Uji Coba.
2. Produksi hanya diubah setelah pemilik menulis "setuju tayang" di chat. Kutip persetujuan itu di catatan rilis.
3. Sebelum setiap rilis: cadangan otomatis spreadsheet + daftar file Drive ("Cadangan / sebelum vX.Y.Z").
4. Versi vX.Y.Z (X = perubahan besar/struktur data, Y = fitur, Z = perbaikan). Setiap rilis: tag Git, versi
   deployment Apps Script bernomor, entri CHANGELOG.md (versi, tanggal, isi, penyetuju), tampil di halaman
   Riwayat Versi (hanya Super Admin).
5. Pengembalian versi atas permintaan pemilik ("kembalikan ke versi X"): pasang ulang tag Pages + deployment
   Apps Script versi itu. Data pengguna TIDAK ikut dikembalikan. Pemulihan data dari cadangan hanya atas keputusan
   tertulis pemilik (isian setelah tanggal cadangan hilang). Catat kejadian + alasan di CHANGELOG.
6. Rilis yang mengubah struktur data: sebelum minta persetujuan, jelaskan apakah versi lama masih bisa membaca
   data baru; bila tidak, sebutkan bahwa rollback perlu pemulihan data.
7. Pelihara panduan darurat bergambar (di Drive prodi) agar Super Admin bisa rollback sendiri via GitHub & Apps Script.
8. Jangan hapus folder proyek di OneDrive maupun akun GitHub prodi; sesi baru di folder ini melanjutkan pekerjaan.

## Infrastruktur (dibuat 9 Nov 2026)
- Repositori publik: https://github.com/upw-ppb/repositori-upw (git lokal di folder ini; core.fileMode=false karena OneDrive).
  Cabang kerja Fase 1: fase-1/fondasi. GitHub Pages sementara dari cabang fase-1/fondasi, folder /docs
  (pindahkan ke main saat cabang digabung).
- Tampilan Uji Coba: https://upw-ppb.github.io/repositori-upw/uji/ (docs/uji). Alamat Produksi (docs/) masih halaman
  "belum dibuka". Tanpa build step; versi di docs/uji/konfig.js dan nama cache di docs/uji/sw.js (naikkan tiap rilis).
- Server Uji Coba (Apps Script): scriptId 1R2S8BM3glkyOYqsqX36XvdHMW24r77mcaKlHEF22pjva-4Gp3G6kvEvf (gas/.clasp.json),
  deployment AKfycbyILM_1zheYuMXf-zt7GYIhVr7o1z8S3bCfucZkW1VP9Jj6Wa3Zu4UWXQOq8vrVPBMb.
  Perbarui: `cd gas && clasp push -f && clasp redeploy <deploymentId> --description "..."` (URL tetap).
- Data Uji Coba: spreadsheet "Repositori UPW — Data (Uji Coba)" 1rZ82bHhMfNK8ik2cuUXfn7cokGOAGrPVuTsXfKzldvk,
  folder Drive "Repositori UPW (Uji Coba)" 1jVQDYt8rbdCWSLSEI8X6Vt2z0P2-bJhb (Bukti, Surat, Tanda Tangan, Cadangan).
  Rahasia server (MERICA) di Script Properties, BUKAN di repo.
- Produksi nanti = proyek Apps Script + spreadsheet TERPISAH (aksi "siapkan" dengan lingkungan "produksi").
- Kredensial uji: akun-uji-coba.local.md (gitignored). JANGAN tulis kata sandi di chat atau di berkas yang ter-commit.
- Mode Uji: server mengembalikan kodeUji (kode verifikasi) agar bisa diuji otomatis; dimatikan otomatis di Produksi.
- Uji otomatis server: skrip node di scratchpad (uji-api.mjs) — 25 skenario lulus 9 Nov 2026.
- Batasan agen: jangan mengetik kata sandi di browser untuk alamat github.io (bukan host lokal/uji); uji login lewat API/skrip.
- PELAJARAN v0.1.1: uji API saja tidak cukup. Setiap rilis tampilan WAJIB diuji lewat UI: salin docs/uji ke scratchpad,
  sajikan di localhost (preview), ganti window.fetch dengan server tiruan, isi formulir dan tekan tombol, lalu cek isi
  permintaan yang terkirim. (Bug v0.1.0: render "Memproses…" menghapus isian sebelum dibaca → semua login gagal.)

- v0.2.0 (11 Nov 2026, Uji Coba, tag v0.2.0-uji): biodata (skema HANYA di gas/Biodata.js, dikirim ke tampilan),
  Cari orang, impor mahasiswa "NIM; Nama; tahun masuk; kelas", struktur data v2 (VERSI_SKEMA di gas/Db.js; kolom baru
  SELALU di akhir; server mencadangkan + memigrasi otomatis saat permintaan pertama). Teks diawali angka/=+-@ disimpan
  dengan awalan ' (amankan). Riwayat rilis di CHANGELOG.md.
- Uji lokal penuh: scratchpad gas-tiruan.mjs (tiruan Apps Script menjalankan gas/*.js asli sebagai satu skrip),
  uji-bio.mjs (44 skenario), server-uji.mjs (menyajikan salinan docs/uji + /api tiruan; konfigurasi "uji-lokal" di
  .claude/launch.json). Scratchpad berganti per sesi: buat ulang bila hilang.
- clasp login kedaluwarsa berkala (Workspace, galat invalid_rapt). Browser pemilik otomatis memilih Gmail pribadi:
  minta pemilik membuka tautan login di jendela incognito dan masuk sebagai upw@ppb.ac.id; cek dengan
  `clasp show-authorized-user` sebelum push.
- Kata sandi Admin Prodi uji di akun-uji-coba.local.md sudah diperbarui (11 Nov 2026). Bila gagal, jangan coba berulang (kunci 5x).
- MASALAH EMAIL (11 Nov 2026): email dari aplikasi (MailApp) DITOLAK ke semua penerima: 550 5.7.26 DMARC.
  DNS ppb.ac.id: DMARC p=reject, adkim=s, aspf=s; DKIM google._domainkey berisi "v=DKIM1; p=" (kunci kosong).
  Perbaikan hanya oleh admin Workspace/DNS kampus (UPT TIK): Admin Console → Gmail → Autentikasi email → buat kunci DKIM,
  pasang TXT google._domainkey di DNS, lalu "Mulai autentikasi". WAJIB beres sebelum Produksi. Sementara di Uji Coba,
  kode verifikasi tampil di layar (Mode Uji Coba), jadi pengujian tetap bisa.

## Penilaian & instrumen (dari DED/Matriks versi Word, Downloads)
- prototipe/data-akreditasi.js: MATRIKS (84 butir Lampiran 1, total bobot 100.000 — terverifikasi), KRITERIA,
  DED_BUTIR (64), GCET (10 pasal), STATUS_MHS (A,C,N,L,D,K,M,W). Dipakai ulang di aplikasi sebenarnya.
- Nilai = Σ bobot × skor (maks 400). 36 butir otomatis (rumus di scoreOf), 9 gabungan, 39 dinilai GPM.
- Ambang Unggul TIDAK ada di DED/Matriks; mengacu PerBAN-PT 17/2025. Target bisa diatur Admin (default 361, asumsi).
- Inkonsistensi instrumen: rasio mahasiswa/DTPS terpisah di Lampiran 1 tapi bagian 9C di matriks; PMKI 20–30% tak diatur.
- Format DED: Calibri 12, spasi 1, A4, margin atas 3 kiri 4 bawah 3 kanan 3 cm, maks 120 halaman isi.
- Disetujui & ada di prototipe v0.4: Portofolio Mata Kuliah (dosen: "Mata Kuliah Saya"; rekap di Data Prodi),
  Data Prodi (kurikulum → PJP = sks praktik/total sks, PMKI; PMB → tren animo; sarana & lab),
  Bank Dokumen (slot dokumen per butir kualitatif, objek DOCS), template survei dosen/tendik.

- v0.5: team teaching (MK.peng[0] = pengampu utama, maks 3 orang termasuk praktisi, diatur Admin per semester;
  komponen "u" hanya utama, "s" semua anggota), agenda akreditasi (AGENDA, 15 pengingat), formulir kegiatan dengan
  tanggal mulai–selesai, pencari jenis (CTH), "Lainnya…", tandai mahasiswa satu per satu, saran pasal GCET (GCET_KW,
  pencocokan kata utuh). Kuliah tamu terbuka = jenis "suasana"; praktisi di MK = tim pengajar; dosen UPW jadi tamu = rekognisi.

- v0.6: TIM[semester][kd] = {peng (peng[0] utama), prak}; kurikulum MK terpisah (data tetap). S.mkp kunci "semester|kd".
  SEM_LIST termasuk semester akan datang; "Salin dari" = semester sama tahun lalu (prevSame). PMKI pakai TS_SEMS.
  Jenis "kuliahtamu" (narasumber satu pertemuan dalam MK, KEG.mk) ≠ dosen praktisi tim ≠ visiting lecturer (rekognisi).
  Tandai per kelas bisa mengecualikan mahasiswa (KEG.excl).

- v0.7: akun dengan peran ganda (ACCOUNTS, useAccount, pilihan Peran di header). Peran: superadmin, admin (Admin Prodi,
  tanpa reset sandi/peran), kps, kalab, laboran, dosen, tendik, mahasiswa, asesor.
  Alur pengajuan: KEG.st = draf_aju → menunggu_kps → (ditunda|revisi_aju|ditolak_aju) → terbit; "tanpa" = tanpa surat tugas.
  Surat pengantar PDF (suratDrawer): dosen/tendik → Kabag Administrasi Umum; mahasiswa → Kabag Adm. Akademik, Kemahasiswaan
  & Kerjasama; peserta di lampiran (No, NIM/NIP/NIDN/ID, Nama, Semester, Kelas). Pola dari dokumen PKL Karangasem-Bangli.
  Bukti bersama KEG.bk (slotsOf): sekali unggah oleh anggota mana pun, terkunci, hanya pengunggah bisa batal.
  Batas = 5 hari kerja setelah selesai (SET.hk, SET.libur); pengingat notifikasi + peringatan di form & antrean KPS (tunda).
  JANGAN memakai gambar tanda tangan KPS dari dokumen Word; persetujuan = pernyataan elektronik + kode verifikasi + QR.
- v0.8: menu "Tanda Tangan Saya" (peran KPS): buat di kanvas atau unggah gambar (sigClean: latar putih → transparan, trim),
  wajib centang persetujuan, disimpan per akun (S.sig), ditempel di surat yang disetujui akun itu (KEG.kpsAcct) + log (SIG_LOG).
  Di aplikasi sebenarnya: simpan privat di Drive upw@, tak terlihat Super Admin. Di prototipe hanya di memori (hilang saat reload).
- Halaman Pengguna: bagian "Akun dan peran" dan daftar akun hanya untuk Super Admin; Admin Prodi tidak melihatnya.
- Narasi surat dibangun dari data pengajuan (kalimatMhs, kalimatDosen, barisDosen) — dipakai pratinjau formulir & PDF.
  Kolom: judul (tanpa tanggal/tempat), tgl–sampai, tempat*, aktivitas (kata kerja), ket (rincian dalam kurung),
  bentuk* (surat dosen), kegDosen (default judul). Tendik (TENDIK) bisa ditandai; unsurTxt menyesuaikan dosen/tendik.
- Kedua Kabag tujuan surat saat ini laki-laki: sapaan "Bapak" (SET.sapaanDosen, bisa diubah di Pengaturan Sistem), bukan "Bapak/Ibu".

## Alat di Mac ini (dipasang 8 Nov 2026, tanpa hak admin)
- Node.js v26.13.0: ~/.local/node/bin (npm prefix global: ~/.local/npm-global, diatur di ~/.npmrc)
- GitHub CLI 2.103.3: ~/.local/gh, tautan di ~/.local/bin/gh
- clasp 3.4.1: ~/.local/bin/clasp
- PATH tidak diubah di profil shell; jalankan dengan
  `export PATH="$HOME/.local/node/bin:$HOME/.local/bin:$PATH"`.

## Struktur folder
- prototipe/  — prototipe klik (HTML tunggal, data contoh fiktif), diterbitkan sebagai Artifact:
  https://claude.ai/artifact/CnhsUPCZpQmsgxD8BRHT5g (publish ulang dari prototipe/index.html + logo.png).
  Catatan: server pratinjau lokal tidak bisa membaca folder OneDrive; uji dari salinan di folder sementara.
- aset/       — logo dan aset grafis.

## Status
- [x] Rancangan disetujui pemilik (8 Nov 2026)
- [x] Alat terpasang
- [x] Izin Workspace dites langsung 9 Nov 2026 (tanpa perlu email ke UPT TIK):
      Web App akses "Anyone" (ANYONE_ANONYMOUS, executeAs USER_DEPLOYING) → bisa dibuka tanpa login (HTTP 200);
      berbagi Drive ANYONE_WITH_LINK → diizinkan; kuota email MailApp → 1.500/hari.
      Proyek uji "UPW Uji Izin A/B (hapus setelah tes)" deployment-nya sudah dihapus (404); file proyeknya boleh dihapus manual.
      Kiat: tautan /macros/s/… gagal dibuka bila browser login beberapa akun → pakai /a/macros/ppb.ac.id/s/… atau incognito.
- [x] Akun GitHub prodi: upw-ppb, 2FA aktif (dikonfirmasi pemilik 9 Nov 2026)
- [x] Apps Script API aktif di upw@ppb.ac.id
- [x] Login di Mac ini: gh sebagai upw-ppb (keyring, https; prompt gh dimatikan), clasp sebagai upw@ppb.ac.id
- Keputusan teknis: aplikasi sebenarnya tanpa build step dan tanpa node_modules (aman di OneDrive).
- Tautan bukti untuk asesor: berbagi Drive "siapa saja dengan tautan" diizinkan, tetapi default tetap lewat
  halaman aplikasi (login asesor) karena lebih aman; berbagi tautan dipakai hanya bila diputuskan pemilik.
- [ ] Prototipe dikoreksi tim prodi
