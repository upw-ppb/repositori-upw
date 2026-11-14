# Alat uji

Lihat bagian "Alat uji" di CLAUDE.md. Singkatnya, dari folder proyek:

    bash alat/uji/jalankan.sh uji        # semua uji server (tiruan Apps Script)
    bash alat/uji/jalankan.sh server     # http://localhost:8790, tampilan docs/uji dengan server tiruan
    bash alat/uji/jalankan.sh langsung   # cek baca-saja ke server Uji Coba sungguhan

- gas-tiruan.mjs: tiruan Apps Script (Sheets, Drive, Properties, dll.) yang menjalankan gas/*.js asli sebagai satu skrip.
- uji-keg.mjs memanggil semua uji-*-bagian.mjs; uji-bio.mjs menguji biodata.
- server-uji.mjs: server lokal dengan akun dan data contoh (kata sandi tiruan, hanya untuk lokal).
- jelajah.js: penjelajah semua menu/tab/laci (muat di halaman lokal lalu panggil window.jelajah()).
- terima.py: penerima berkas dari halaman pratinjau (127.0.0.1:8799), dipakai saat membuat gambar panduan/ikon.
- baca-docx.py, baca-xlsx.py, buat-jenis.mjs, cek-docx.mjs: pembaca instrumen dan pemeriksa berkas Word.
