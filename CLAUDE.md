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

## Alat uji (disimpan di proyek sejak 14 Nov 2026)
- alat/uji/ berisi semua skrip uji (dulu di scratchpad). Jalankan dari folder proyek:
  `bash alat/uji/jalankan.sh uji` (semua uji server, harus 0 gagal), `bash alat/uji/jalankan.sh server` (server lokal :8790 untuk uji
  tampilan; konfigurasi "uji-lokal" di .claude/launch.json), `bash alat/uji/jalankan.sh langsung` (cek baca-saja ke server Uji Coba).
  Skrip menyalin gas/ dan docs/uji ke /tmp/upw-uji lalu mengganti api menjadi "/api". Pratinjau di aplikasi Claude tidak bisa membaca
  OneDrive: jalankan dulu `bash alat/uji/jalankan.sh siapkan`, lalu preview "uji-lokal" (berjalan dari /tmp/upw-uji). Uji fitur baru: tambah uji-<versi>-bagian.mjs
  dan panggil dari uji-keg.mjs. Penjelajah halaman: alat/uji/jelajah.js (dimuat di halaman lokal, window.jelajah()).
- Kata sandi di skrip hanya untuk server tiruan lokal. Kata sandi akun Uji Coba sungguhan tetap di akun-uji-coba.local.md (gitignored).
- AGENTS.md = penunjuk untuk AI lain ke berkas ini.

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
- Tautan bukti untuk asesor lewat halaman aplikasi (login asesor; tersedia sejak v0.9.0), sampai UPT TIK menjawab.
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
  Cabang kerja Fase 1: fase-1/fondasi. GitHub Pages dari cabang main, folder /docs (dipindah 13 Nov 2026).
  JANGAN `git checkout` cabang lain di folder OneDrive ini: OneDrive menamai ulang folder yang dihapus-buat ulang menjadi
  "gas 2", "docs 2", "alat 2" (terjadi 13 Nov 2026; dipulihkan dengan mv setelah dicek isinya sama dengan HEAD).
  Perbarui main dengan `git push origin fase-1/fondasi:main` (main selalu fast-forward dari fase-1/fondasi).
- PRODUKSI TAYANG 13 Nov 2026 (v0.16.0, "Setuju tayang v0.16.0"): https://upw-ppb.github.io/repositori-upw/ = docs/ (dibuat
  alat/tampilan.mjs dari docs/uji; JANGAN ubah docs/*.js langsung). Pages dari cabang main /docs. Kerja tetap di cabang
  fase-1/fondasi; setiap rilis Uji Coba juga DIGABUNG ke main (Pages membaca main) — aman karena rilis uji hanya mengubah docs/uji,
  sedangkan berkas Produksi di docs/ hanya dibangun ulang alat saat rilis Produksi (setelah "setuju tayang").
- Tampilan Uji Coba: https://upw-ppb.github.io/repositori-upw/uji/ (docs/uji). Tanpa build step; versi di docs/uji/konfig.js dan nama cache di docs/uji/sw.js (naikkan tiap rilis).
- Server Uji Coba (Apps Script): scriptId 1R2S8BM3glkyOYqsqX36XvdHMW24r77mcaKlHEF22pjva-4Gp3G6kvEvf (gas/.clasp.json),
  deployment AKfycbyILM_1zheYuMXf-zt7GYIhVr7o1z8S3bCfucZkW1VP9Jj6Wa3Zu4UWXQOq8vrVPBMb.
  Perbarui: `cd gas && clasp push -f && clasp redeploy <deploymentId> --description "..."` (URL tetap).
- Data Uji Coba: spreadsheet "Repositori UPW — Data (Uji Coba)" 1rZ82bHhMfNK8ik2cuUXfn7cokGOAGrPVuTsXfKzldvk,
  folder Drive "Repositori UPW (Uji Coba)" 1jVQDYt8rbdCWSLSEI8X6Vt2z0P2-bJhb (Bukti, Surat, Tanda Tangan, Cadangan).
  Rahasia server (MERICA) di Script Properties, BUKAN di repo.
- Server Produksi DIBUAT 13 Nov 2026 (pemilik: "Buat sekarang"): proyek "Repositori UPW (Produksi)", scriptId
  1zQ7xhO3bgX4NsfHiRCeMdr3T8VH8L5u_TlTuilPp3KXUxU3JYR_lhXr0, deployment AKfycbylF-ZVlYYDbAmQE3OBH0q7P_cOBaAFO-WSK0OKsErHLyEf4JmbWe4jrkV3VZVk2uK3
  (v0.24.0 sejak 14 Nov 2026, @4, "Setuju tayang v0.24.0"). Semua di alat/produksi.json. 13 Nov 2026: pemilik sudah menjalankan izinkanServer + siapkanProduksi (ping: lingkungan
  produksi); kata sandi Super Admin Produksi hanya diketahui pemilik. JANGAN panggil aksi "siapkan" ke URL Produksi.
  Cek dari luar cukup ping (curl -sL --data '{"aksi":"ping"}', tanpa -X POST agar redirect jadi GET). Spreadsheet/Drive Produksi dibuat oleh siapkanProduksi. gas/.clasp.json TETAP Uji Coba; push ke Produksi
  dari folder sementara (lihat PRODUKSI.md) dan HANYA setelah "setuju tayang".
- Kredensial uji: akun-uji-coba.local.md (gitignored). JANGAN tulis kata sandi di chat atau di berkas yang ter-commit.
- Mode Uji: server mengembalikan kodeUji (kode verifikasi) agar bisa diuji otomatis; dimatikan otomatis di Produksi.
- Uji otomatis server: lihat "Alat uji" (alat/uji/).
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
  .claude/launch.json). Kini tersimpan di alat/uji/ (lihat "Alat uji").
- clasp login kedaluwarsa berkala (Workspace, galat invalid_rapt). Browser pemilik otomatis memilih Gmail pribadi:
  minta pemilik membuka tautan login di jendela incognito dan masuk sebagai upw@ppb.ac.id; cek dengan
  `clasp show-authorized-user` sebelum push.
- Kata sandi Admin Prodi uji di akun-uji-coba.local.md sudah diperbarui (11 Nov 2026). Bila gagal, jangan coba berulang (kunci 5x).
- MASALAH EMAIL (11 Nov 2026): email dari aplikasi (MailApp) DITOLAK ke semua penerima: 550 5.7.26 DMARC.
  DNS ppb.ac.id: DMARC p=reject, adkim=s, aspf=s; DKIM google._domainkey berisi "v=DKIM1; p=" (kunci kosong).
  Perbaikan hanya oleh admin Workspace/DNS kampus (UPT TIK): Admin Console → Gmail → Autentikasi email → buat kunci DKIM,
  pasang TXT google._domainkey di DNS, lalu "Mulai autentikasi". WAJIB beres sebelum Produksi. Sementara di Uji Coba,
  kode verifikasi tampil di layar (Mode Uji Coba), jadi pengujian tetap bisa.

- v0.3.0 (12 Nov 2026, Uji Coba): kegiatan + surat tugas. Jenis kegiatan di gas/Jenis.js (dibuat dari prototipe dengan
  scratchpad buat-jenis.mjs; satu sumber, dikirim lewat kegiatan.ref). Tabel Kegiatan (VERSI_SKEMA 3): peserta disimpan
  sebagai JSON (pegawai, kelas "masuk-kelas", mhs, excl = userId); kolom st (alur surat) terpisah dari status (verifikasi data).
  Lampiran surat dibekukan saat KPS setuju. PDF = jendela cetak browser (#cetak, @media print). Cek surat: ?cek=KODE.
  Uji: scratchpad uji-keg.mjs (56 skenario); server-uji.mjs menyiapkan akun uji lengkap biodata (sandi uji di skrip).

- v0.4.0 (12 Nov 2026, Uji Coba, deployment @5): gas/Bukti.js — bukti per slot di kolom Kegiatan.bukti (JSON), file di Drive
  Bukti/<semester>/<id judul>, dibuka lewat aksi bukti.lihat (base64), maks 10 MB + cek tanda tangan berkas. Slot: bersurat = daftar
  baku (slotBukti), tanpa surat = JENIS_KEG.bukti. Batas = tambahHariKerja(sampai, Pengaturan batasHariKerja, hariLibur).
  Status data: draf → diajukan (otomatis saat lengkap bila bersurat) → revisi → diajukan_ulang → disetujui | ditolak.
  Verifikator: pendampingId, selain itu admin/superadmin/kps; pengaju tidak memverifikasi miliknya. Pengingat = aksi tugas.saya
  (dihitung saat diminta, tanpa email/trigger). VERSI_SKEMA 4. Uji: uji-keg.mjs + uji-bukti-bagian.mjs (113 skenario).
  Catatan UI: jangan panggil nilai() di luar jalankan() (bisa membaca potret isian lama).

- v0.5.0 (12 Nov 2026, Uji Coba): docs/uji/qr.js = pembuat QR buatan sendiri (mode byte, tingkat M, versi 1–10; JANGAN ganti dengan
  pustaka luar tanpa izin pemilik). gas/TandaTangan.js: tabel TandaTangan (VERSI_SKEMA 5), PNG tersandi (sandiTtd, HMAC-SHA256 aliran)
  di folder Drive "Tanda Tangan"; surat terbit menyimpan lampiran.ttd = id versi tanda tangan; gambar diambil lewat surat.ttd.
  Uji: uji-ttd-bagian.mjs (dipanggil dari uji-keg.mjs; total 134 skenario). Menjalankan kode unduhan (npm) di Mac ini diblokir.

- v0.6.0 (12 Nov 2026, Uji Coba): gas/Portofolio.js (portofolio.saya, dok.simpan/hapus/lihat; tabel DokumenPribadi, VERSI_SKEMA 6).
  docs/uji/zip.js = penulis ZIP (tanpa kompresi) + .xlsx buatan sendiri. Uji: uji-porto-bagian.mjs (total 152 skenario).
  Saat menguji unduhan di browser pratinjau: tahan unduhan (ganti HTMLAnchorElement.click) agar tidak masuk ke Downloads pemilik.
  grep di Mac ini kadang tidak membaca aplikasi.js (OneDrive); periksa isi dengan Python.

- v0.7.0 (12 Nov 2026, Uji Coba): gas/Ilkps.js — susunIlkps(ts) membangun tabel (bentuk "daftar" atau "hitung" TS-2..TS) dari
  kegiatan status "disetujui"; peta jenis → tabel ada di sana. TS = Pengaturan tsAwal (bawaan TA lalu). Tautan ?keg=ID.
  Format resmi dibaca dengan scratchpad baca-xlsx.py (Python, tanpa pustaka). Uji: uji-ilkps-bagian.mjs (total 170 skenario).

- v0.8.0 (12 Nov 2026, Uji Coba): gas/DataProdi.js — MataKuliah, Praktisi, TimPengajar (semester "2025-1"/"2025-2", anggota JSON
  {t:"u"|"p", id}, [0] = utama), DosenTs (per TA). tabelDosen(ts) = Tabel 1–6, dipanggil susunIlkps. VERSI_SKEMA 7.
  Isian biodata baru: beri tanda `baru: 1` di skema → kolomnya otomatis di akhir sheet (tabelBiodata). Uji: uji-dp-bagian.mjs (200 skenario).

- v0.9.0 (12 Nov 2026, Uji Coba): gas/Asesor.js — akun asesor-saja (peran tepat "asesor"), kolom Pengguna.berlakuSampai/instansi
  (VERSI_SKEMA 8); kedaluwarsa diperiksa di penggunaDariToken dan aksiMasuk. Akses baca lewat asesorBolehLihat (status data disetujui);
  catatAsesor mencatat ke Log. Uji: uji-asesor-bagian.mjs (223 skenario). PELAJARAN: node --check tidak menangkap pemakaian
  const sebelum dideklarasikan (AKSI); uji UI wajib memuat halaman dari awal.

- v0.10.0 (12 Nov 2026, Uji Coba): gas/Lulusan.js — tabel Lulusan (kunci NIM), Penerimaan (per tahun), Dana (per TA × jenis);
  tabelLulusan(ts) = Tabel 8, 9, 10a–c, ref11a, 21; susunIlkps mengurutkan dengan URUTAN_TABEL. VERSI_SKEMA 9. Uji: uji-lul-bagian.mjs (247).

- v0.11.0 (12 Nov 2026, Uji Coba): gas/Survei.js — tabel Survei (pertanyaan JSON, kode publik) dan Jawaban (kunci = HMAC userId:survei
  untuk anonim). TEMPLAT_SURVEI di server. tabelKepuasan(ts) = Tabel 11/22; tanggapanPengguna() untuk Ref 11a. VERSI_SKEMA 10.
  Tabel iLKPS lengkap 33 lembar. Uji: uji-survei-bagian.mjs (282). Formulir jawaban: kirimJawaban() tidak menggambar ulang saat galat.

- v0.12.0 (13 Nov 2026, Uji Coba): gas/Matriks.js DIBUAT OTOMATIS dari prototipe/data-akreditasi.js (MATRIKS, KRITERIA, DED_BUTIR).
  gas/Penilaian.js: konteksNilai(ts) memakai susunIlkps + data mentah; rumusOtomatis(f) sesuai teks Matriks (Downloads/Vokasi_Matriks_D4_
  Akreditasi_Unggul_Word.docx, diekstrak scratchpad baca-docx.py); gabung() untuk butir c (26, 42, 64, 71). SkorGpm per TS. VERSI_SKEMA 11.
  Uji: uji-nilai-bagian.mjs (302). Tafsiran tercatat di keterangan butir dan CHANGELOG.

- v0.13.0 (13 Nov 2026, Uji Coba): gas/Ded.js — tabel DedNarasi (butir, teks, status, pj; VERSI_SKEMA 12), cek versi saat simpan
  (d.versi = diubah), dosen hanya butir PJ-nya; identitas/daftar PS/tim di Pengaturan (dedIdentitas, dedDaftarPs, dedTim).
  gas/DedPetunjuk.js DIBUAT OTOMATIS dari Downloads/DED_Vokasi_Unggul_Word.docx (petunjuk + penempatan Tabel iLKPS per butir).
  docs/uji/docx.js = penulis .docx buatan sendiri (UPW_DOCX; dipaketkan UPW_ZIP). Ekspor DED di tampilan (eksporDed); ukuran logo dibaca
  dari kepala PNG (jangan pakai Image.decode — macet saat panel tersembunyi). Uji: uji-ded-bagian.mjs (total 319 + 44 skenario);
  uji dijalankan `node uji-keg.mjs gas` dari scratchpad (salin gas/ dulu). Docx divalidasi unzip + XML + textutil + Quick Look,
  belum dibuka di Microsoft Word asli.

- v0.14.0 (13 Nov 2026, Uji Coba): gas/PortofolioMk.js — tabel PortofolioMk (semester, kodeMk, isi JSON; VERSI_SKEMA 13). Komponen KOMP_MKP
  (rps/kontrak/rubrik/metode = pengampu utama anggota[0]; integ/interaksi = semua dosen tim). Bisa diisi semester berjalan + sesudahnya.
  infoMkpTs(ts) menambah keterangan butir 8/22/25 di Penilaian. Uji: uji-mkp-bagian.mjs (total 349 + 44).
  PELAJARAN: saat menyalin docs/uji ke scratchpad/web untuk uji UI, WAJIB ganti api di web/konfig.js menjadi "/api",
  kalau tidak permintaan pergi ke server Uji Coba sungguhan.

- v0.15.0 (13 Nov 2026, Uji Coba): gas/BankDokumen.js — SLOT_BANK (dari prototipe DOCS, 94 slot/47 butir), tabel BankDokumen
  (kunci "n-i" baku / "n-x<id>" tambahan; versi JSON, versi lama disimpan; VERSI_SKEMA 14). ringkasBank() → info Penilaian.
  Asesor: bank.data/bank.lihat versi berlaku saja + catatAsesor. Uji: uji-bank-bagian.mjs (total 375 + 44).
  PELAJARAN: semua gas/*.js satu ruang nama — nama fungsi ganda diam-diam menimpa (tambahHari di Asesor.js). uji-keg.mjs kini
  memeriksa nama global ganda. Tampilan: bersihkanData() mengembalikan S ke keadaan awal saat keluar/sesi berakhir
  (jangan lagi menghapus field satu per satu).

- v0.15.1 (13 Nov 2026, Uji Coba): persiapan Produksi. Produksi disiapkan HANYA lewat fungsi siapkanProduksi() di editor Apps Script
  (oleh pemilik; aksi web "siapkan" ditolak untuk produksi). alat/tampilan.mjs: `riwayat` (tulis docs/uji/riwayat.json dari
  CHANGELOG.md — jalankan SETIAP rilis setelah menulis CHANGELOG) dan `produksi <URL /exec> <tujuan>` (susun tampilan Produksi dari
  docs/uji; tujuan docs HANYA setelah "setuju tayang"). Halaman Riwayat Versi (Super Admin). LABEL_VERSI & catatan "Baru" hanya di uji.
  sw.js mengabaikan permintaan di luar foldernya dan subfolder uji/. Daftar periksa Produksi: PRODUKSI.md.

- v0.16.0 (13 Nov 2026, Uji Coba): aktivasi tanpa email sementara (pemilik memilih ini karena DKIM belum bisa dibereskan).
  Pengaturan "aktivasiTanpaEmail" = ya/tidak (admin.tanpaEmail, Super Admin). aktivasi.tanpaEmail → status aktif,
  emailTerverifikasi "tertunda"; perluVerifikasiEmail = tertunda && mode mati (dicek di wajibPeran); email.kirimKode/email.verifikasi.
  Uji: uji-email-bagian.mjs (total 400 + 44). Di Produksi mode ini perlu DINYALAKAN Super Admin setelah tayang.

- v0.17.0–v0.21.0 (14 Nov 2026, Uji Coba): 21 catatan prodi. Baru: gas/Impor.js (impor massal, templat, ekspor akun), StatusDosen.js,
  DokumenDosen.js (kelengkapan + Pengingat), RiwayatKeputusan.js, Lab.js (Sarana, LogSarana), penanda tangan (Pengaturan penandaTangan).
  docs/uji/zip.js punya bacaXlsx (DecompressionStream) + kolom Teks/dropdown di templat. Tampilan: pasangLihatSandi, LABEL_VERSI, hInfo/TUTORIAL,
  profil disimpan di localStorage (upw-uji:profil) untuk muat ulang instan. Menu mengikuti PERAN AKTIF.
  KECEPATAN: Db.js menyimpan isi sheet (_isi) dan properti (_prop) per permintaan; dibuang saat tulis/kunciTulis/awal doPost.
  WAJIB: penulisan sheet langsung di luar Db.js harus `delete _isi[nama]` (diuji otomatis). Hash sandi baru "h2:" (300 putaran);
  rollback ke < v0.21.0 membuat akun berhash h2 tidak bisa masuk (perlu reset oleh Super Admin).
  PELAJARAN: isian formulir yang bisa memicu render (pilih file) harus disimpan ke state saat diketik (event input).
  Uji: uji-v17..v21-bagian.mjs (total 459 + 44).

- v0.22.0 (14 Nov 2026, Uji Coba): docs/uji/panduan/*.jpg = gambar panduan (tangkapan layar versi Produksi + data contoh, 1100x720)
  dengan penanda di GAMBAR_PANDUAN (aplikasi.js; [x%, y%, nomor, keterangan], diletakkan dengan membaca gambar — screenshot pratinjau
  TIDAK mengikuti gulir di dalam laci/drawer, hanya gulir halaman). alat/tampilan.mjs kini menyalin sub-folder. Unduhan lewat simpanBerkas()
  (showSaveFilePicker di aplikasi terpasang). manifest shortcuts ?buka=info|kegiatan|beranda. Menu macOS tidak bisa ditambah aplikasi web.

- v0.22.1 (14 Nov 2026, Uji Coba): ikon aplikasi = konsep D (koper arsip + "UPW"), dipilih pemilik; sumber 512 px di aset/ikon-aplikasi-upw-512.png.
  Ikon digambar dengan canvas di pratinjau (bukan dari logo Poltekpar); logo Poltekpar tetap di header dan surat.
  v0.23.1: ikon diperbesar (isi memenuhi kotak); kode pembuatnya alat/ikon.js.

- v0.23.0 (14 Nov 2026, Uji Coba): gas/Masukan.js — tabel Masukan (VERSI_SKEMA 18), aksi masukan.kirim/saya/daftar/ubah/lampiran, lampiran di
  folder Drive "Masukan"; tombol Kirim masukan di Info, menu Masukan (superadmin/admin). Field formulir jenis = S.laci.jm (S.laci.jenis = nama laci!).
  Uji menyeluruh: scratchpad jelajah.js (penjelajah semua menu/tab/laci per peran, cek galat/teks rusak/konsol/lebar layar) + uji-v23-bagian.mjs.

- v0.24.0 (14 Nov 2026, Uji Coba): gas/Foto.js (FotoProfil, VERSI_SKEMA 19; JPEG data URL di sheet: foto ≤48k, kecil ≤12k karakter; foto.saya/simpan/hapus/kecil).
  gas/SumberData.js: F_JENIS/F_DATA (rumus → jenis kegiatan/data lain), petaJenisButir (juga lewat "DED butir N" di Jenis.t untuk butir GPM),
  sumber.butir (lihat: admin/superadmin/kps), sumber.kegiatan/tinjau/hapus/pulihkan (superadmin; hapus = kolom dihapus + riwayat "hapus_sa").
  Tampilan: menu "data" (Data Terkumpul), laci "sumber"/"sumberAksi", avatar(). Klik data-go kini menutup laci. Uji: alat/uji/uji-v24-bagian.mjs.

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
