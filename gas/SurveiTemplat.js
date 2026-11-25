/**
 * v0.50.0: templat survei komprehensif (permintaan pemilik 24–25 Nov 2026: banyak variabel dan indikator, bisa dianalisis dengan beberapa teknik,
 * mengikuti bahkan melampaui instrumen LAMWisata IAPS 1.0 D4 Unggul). Setiap pertanyaan skala memuat:
 *   var  = variabel/dimensi (dipakai rata-rata per dimensi, Cronbach α, IPA, perbandingan kelompok),
 *   ind  = kode indikator (kolom data mentah untuk analisis lanjutan di Excel/SPSS/R),
 *   jelas= penjelasan untuk responden (apa yang dinilai + contoh), agar penilaian tidak bias,
 *   aspek= nomor aspek Tabel 22 / Tabel 11 (dihitung otomatis ke Tabel iLKPS),
 *   na   = boleh "Tidak tahu / tidak berlaku" (nilai 0, tidak ikut dirata-rata),
 *   lab  = set label skala: "puas" (Kurang–Sangat baik, sesuai Tabel 11/22), "penting" (tingkat kepentingan, untuk IPA), "setuju".
 *   pent = pertanyaan tingkat kepentingan untuk variabel tertentu (pasangan IPA), seg = pertanyaan kelompok (perbandingan antarkelompok),
 *   nps  = pertanyaan rekomendasi 0–10 (Net Promoter Score), bagian = judul bagian yang tampil sebelum pertanyaan.
 * meta.pengantar (tujuan, kerahasiaan, cara mengisi) dan meta.skala (arti 1–4) ditampilkan di atas formulir.
 * Sumber: Matriks D4 Unggul (butir 3, 7, 22, 23, 25, 38–42, 65, 71, 73, 78), DED Tabel 10–11 dan 22, kuesioner inti tracer study Kemdiktisaintek.
 */
var LABEL_SKALA = {
  puas: ["Kurang", "Cukup", "Baik", "Sangat baik"],
  penting: ["Kurang penting", "Cukup penting", "Penting", "Sangat penting"],
  setuju: ["Tidak setuju", "Kurang setuju", "Setuju", "Sangat setuju"]
};
var SKALA_LAYANAN = ["1 Kurang: jauh di bawah harapan, sering tidak terpenuhi", "2 Cukup: sebagian sesuai harapan, kekurangan masih sering terjadi",
  "3 Baik: sesuai harapan, kekurangan jarang terjadi", "4 Sangat baik: melebihi harapan, konsisten tanpa kekurangan berarti"];
var SKALA_KINERJA = ["1 Kurang: belum memenuhi standar kerja, masih perlu banyak bimbingan", "2 Cukup: memenuhi sebagian standar, sesekali perlu bimbingan",
  "3 Baik: memenuhi standar kerja secara mandiri", "4 Sangat baik: melampaui standar, menjadi contoh bagi rekan kerja"];
var KERAHASIAAN_ANONIM = "Survei ini ANONIM: nama Anda tidak disimpan bersama jawaban dan tidak ada seorang pun di prodi, termasuk dosen dan pengelola, yang dapat melihat siapa menjawab apa. Aplikasi hanya mencatat bahwa Anda sudah mengisi agar tidak terisi dua kali. Hasil hanya ditampilkan bila jumlah pengisi cukup banyak sehingga tidak bisa ditebak. Jawablah sejujurnya berdasarkan pengalaman Anda sendiri selama semester ini, bukan berdasarkan cerita orang lain.";

function qs(t, teks, jelas, x) { var o = { t: t, teks: teks, wajib: true }; if (jelas) o.jelas = jelas; Object.keys(x || {}).forEach(function (k) { o[k] = x[k]; }); return o; }
function sk(teks, jelas, v, ind, x) { return qs("likert", teks, jelas, Object.assign({ "var": v, ind: ind }, x || {})); }
function bag(judul, list) { if (list.length) list[0].bagian = judul; return list; }
function rata(list) { return [].concat.apply([], list); }
var NPS_OPSI = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

var TEMPLAT_SURVEI = {
  /* ============ 1. Kepuasan mahasiswa (Tabel 22, butir 71, 78) ============ */
  t22: { judul: "Kepuasan mahasiswa terhadap layanan Prodi UPW", tujuan: "t22", sasaran: ["mahasiswa"], anonim: true,
    meta: { skala: SKALA_LAYANAN, pengantar: "Survei ini mengukur kepuasan Anda terhadap layanan akademik dan nonakademik Prodi Usaha Perjalanan Wisata pada semester ini, mengikuti lima aspek mutu layanan (keandalan, daya tanggap, kepastian, empati, dan sarana-prasarana) dalam instrumen akreditasi LAMWisata. Hasilnya dibahas dalam rapat prodi dan ditindaklanjuti. " + KERAHASIAAN_ANONIM },
    pertanyaan: rata([
      bag("A. Tentang Anda (untuk perbandingan antarkelompok, tidak mengungkap identitas)", [
        qs("pilihan", "Saat ini Anda berada di semester", "Dipakai untuk membandingkan kepuasan mahasiswa tahun awal dan tahun akhir. Kelompok yang terlalu kecil tidak ditampilkan.", { opsi: ["Semester 1–2", "Semester 3–4", "Semester 5–6", "Semester 7–8"], seg: true, ind: "SMT" })]),
      bag("B. Keandalan (reliability): layanan diberikan tepat, benar, dan sesuai janji", [
        sk("Perkuliahan dan praktik berlangsung sesuai jadwal dan RPS yang dibagikan di awal semester.", "Pikirkan seberapa sering kelas dimulai tepat waktu, tidak dibatalkan mendadak, dan materinya sesuai rencana pembelajaran (RPS/kontrak kuliah). Pergantian jadwal yang diberitahukan jauh hari tidak dihitung sebagai kekurangan.", "Keandalan", "REL1", { aspek: 0 }),
        sk("Dosen menguasai materi dan menjelaskannya dengan benar dan mudah dipahami.", "Nilai kejelasan penjelasan, ketepatan isi, dan kemampuan dosen menjawab pertanyaan. Nilai secara umum untuk semua mata kuliah semester ini, bukan satu dosen tertentu.", "Keandalan", "REL2", { aspek: 0 }),
        sk("Nilai tugas dan ujian diberikan tepat waktu, transparan, dan sesuai kriteria penilaian.", "Apakah nilai keluar sesuai jadwal, Anda tahu dasar penilaiannya (rubrik/bobot), dan nilai di SIAKAD sesuai hasil yang diumumkan.", "Keandalan", "REL3", { aspek: 0 }),
        sk("Layanan administrasi akademik (surat, KRS, transkrip, legalisir) selesai tepat waktu dan tanpa kesalahan.", "Pikirkan pengalaman terakhir Anda mengurus dokumen di prodi/jurusan. Bila semester ini Anda tidak pernah mengurus apa pun, pilih \"Tidak tahu / tidak berlaku\".", "Keandalan", "REL4", { aspek: 0, na: true }),
        sk("Informasi akademik (jadwal, perubahan kelas, pengumuman) disampaikan akurat dan tidak berubah-ubah.", "Nilai ketepatan dan kejelasan informasi dari prodi melalui grup, LMS, atau papan pengumuman.", "Keandalan", "REL5", { aspek: 0 })]),
      bag("C. Daya tanggap (responsiveness): kesediaan dan kecepatan membantu", [
        sk("Dosen bersedia dan cepat menanggapi pertanyaan atau permintaan bimbingan, di dalam maupun di luar kelas.", "Misalnya membalas pesan dalam waktu wajar (1–2 hari kerja) atau menyediakan waktu konsultasi.", "Daya tanggap", "RES1", { aspek: 1 }),
        sk("Tendik dan pengelola prodi cepat membantu urusan administrasi Anda.", "Waktu tunggu dilayani, kejelasan langkah yang harus Anda lakukan, dan tidak dilempar ke sana kemari.", "Daya tanggap", "RES2", { aspek: 1, na: true }),
        sk("Keluhan atau masukan mahasiswa ditanggapi dan ada perbaikan yang terlihat.", "Contoh: keluhan tentang ruang kelas, jadwal, atau layanan disampaikan lewat perwakilan kelas atau aplikasi, lalu ada jawaban atau perubahan nyata.", "Daya tanggap", "RES3", { aspek: 1, na: true }),
        sk("Dosen memberi umpan balik atas tugas dan ujian yang membantu Anda memperbaiki diri.", "Bukan hanya angka: ada penjelasan apa yang sudah baik dan apa yang perlu diperbaiki, paling lambat sekitar 2 minggu setelah dikumpulkan.", "Daya tanggap", "RES4", { aspek: 1 }),
        sk("Dosen pembimbing akademik mudah dihubungi dan membantu ketika Anda mengalami kesulitan studi.", "Termasuk konsultasi KRS, rencana studi, dan masalah akademik lain.", "Daya tanggap", "RES5", { aspek: 1 })]),
      bag("D. Kepastian (assurance): kompetensi, kesopanan, dan jaminan layanan sesuai aturan", [
        sk("Dosen dan praktisi yang mengajar memiliki keahlian dan pengalaman industri yang relevan dengan materi.", "Misalnya dosen memberi contoh nyata dari industri perjalanan wisata, praktisi berbagi pengalaman kerja yang aktual.", "Kepastian", "ASU1", { aspek: 2 }),
        sk("Aturan akademik (kehadiran, penilaian, sanksi, keberatan nilai) jelas dan diterapkan secara adil kepada semua mahasiswa.", "Nilai apakah aturan sama untuk semua dan diterapkan konsisten, tanpa perlakuan khusus.", "Kepastian", "ASU2", { aspek: 2 }),
        sk("Layanan diberikan dengan sopan, ramah, dan menghargai mahasiswa.", "Sikap dosen, tendik, dan pengelola saat berinteraksi dengan Anda.", "Kepastian", "ASU3", { aspek: 2 }),
        sk("Saya yakin pembelajaran di prodi membekali kompetensi yang dibutuhkan industri perjalanan wisata.", "Pertimbangkan kesesuaian materi dan praktik dengan pekerjaan nyata (tour planning, ticketing, pemanduan, MICE, digital marketing, dll.).", "Kepastian", "ASU4", { aspek: 2 }),
        sk("Kerahasiaan data pribadi dan nilai saya terjaga.", "Data dan nilai Anda tidak diumumkan atau dibagikan tanpa izin.", "Kepastian", "ASU5", { aspek: 2 })]),
      bag("E. Empati (empathy): perhatian terhadap kebutuhan mahasiswa", [
        sk("Dosen memahami perbedaan kemampuan dan kondisi mahasiswa dan membantu yang tertinggal.", "Misalnya memberi penjelasan ulang, materi tambahan, atau kesempatan perbaikan yang wajar.", "Empati", "EMP1", { aspek: 3 }),
        sk("Prodi memperhatikan kesejahteraan mahasiswa (kesehatan, kesulitan ekonomi, masalah pribadi yang memengaruhi studi).", "Apakah ada tempat bertanya atau meminta bantuan, dan informasi beasiswa atau konseling tersedia.", "Empati", "EMP2", { aspek: 3 }),
        sk("Waktu layanan dan konsultasi menyesuaikan jadwal mahasiswa.", "Misalnya layanan tersedia di luar jam kuliah atau dapat dijadwalkan melalui janji.", "Empati", "EMP3", { aspek: 3 }),
        sk("Prodi mendorong dan mendukung pengembangan minat, bakat, dan prestasi mahasiswa.", "Dukungan untuk lomba, organisasi, sertifikasi, atau kegiatan di luar kelas.", "Empati", "EMP4", { aspek: 3 }),
        sk("Mahasiswa diperlakukan setara tanpa membedakan asal, agama, jenis kelamin, atau kondisi ekonomi.", "Nilai berdasarkan pengalaman Anda sendiri dan yang Anda saksikan langsung.", "Empati", "EMP5", { aspek: 3 })]),
      bag("F. Sarana dan prasarana (tangible)", [
        sk("Ruang kelas nyaman dan peralatannya berfungsi (proyektor, pendingin udara, kursi, pengeras suara).", "Kondisi rata-rata ruang yang Anda pakai semester ini.", "Sarana", "TAN1", { aspek: 4 }),
        sk("Laboratorium/studio praktik (GDS/reservasi, desain, bahasa, travel agent) memadai jumlah dan kondisinya.", "Apakah setiap mahasiswa mendapat kesempatan praktik yang cukup dengan perangkat yang berfungsi.", "Sarana", "TAN2", { aspek: 4, na: true }),
        sk("Akses internet kampus stabil dan cukup cepat untuk kebutuhan belajar.", "Nilai di area tempat Anda biasa belajar di kampus.", "Sarana", "TAN3", { aspek: 4 }),
        sk("Perpustakaan dan sumber belajar (buku, jurnal, e-book, LMS) mudah diakses dan relevan.", "Ketersediaan bahan yang Anda butuhkan untuk tugas dan perkuliahan.", "Sarana", "TAN4", { aspek: 4 }),
        sk("Fasilitas umum (toilet, tempat ibadah, kantin, area diskusi) bersih dan layak.", "Kebersihan dan kecukupan fasilitas pendukung.", "Sarana", "TAN5", { aspek: 4 })]),
      bag("G. Seberapa PENTING setiap aspek ini bagi Anda? (untuk menentukan prioritas perbaikan)", [
        sk("Keandalan layanan (tepat jadwal, benar, sesuai janji)", "Seberapa penting aspek ini bagi keberhasilan studi Anda, terlepas dari kondisi saat ini.", "Kepentingan", "IMP1", { lab: "penting", pent: "Keandalan" }),
        sk("Daya tanggap (cepat membantu dan menanggapi)", "", "Kepentingan", "IMP2", { lab: "penting", pent: "Daya tanggap" }),
        sk("Kepastian (kompetensi, keadilan, kesopanan)", "", "Kepentingan", "IMP3", { lab: "penting", pent: "Kepastian" }),
        sk("Empati (perhatian pada kebutuhan mahasiswa)", "", "Kepentingan", "IMP4", { lab: "penting", pent: "Empati" }),
        sk("Sarana dan prasarana", "", "Kepentingan", "IMP5", { lab: "penting", pent: "Sarana" })]),
      bag("H. Penilaian keseluruhan", [
        sk("Secara keseluruhan, seberapa puas Anda dengan layanan Prodi UPW semester ini?", "Penilaian umum Anda setelah mempertimbangkan semua hal di atas.", "Kepuasan umum", "OVR1"),
        qs("pilihan", "Seberapa besar kemungkinan Anda merekomendasikan Prodi UPW kepada teman atau kerabat? (0 = sangat tidak mungkin, 10 = sangat mungkin)", "Dipakai untuk menghitung Net Promoter Score (NPS), ukuran loyalitas yang umum di industri pariwisata.", { opsi: NPS_OPSI, nps: true, "var": "Loyalitas", ind: "NPS" }),
        qs("paragraf", "Hal apa yang paling Anda hargai dari layanan prodi?", "Sebutkan contoh konkret.", { wajib: false, ind: "OPN1" }),
        qs("paragraf", "Hal apa yang paling perlu segera diperbaiki? Mohon sebutkan contoh dan usulan Anda.", "Usulan yang spesifik (apa, di mana, kapan) lebih mudah ditindaklanjuti. Hindari menyebut nama orang.", { wajib: false, ind: "OPN2" })])
    ]) },

  /* ============ 2. Kepuasan pengguna lulusan (Tabel 11, Ref 11a, butir 42) ============ */
  t11: { judul: "Kepuasan pengguna lulusan Prodi UPW", tujuan: "t11", sasaran: ["publik"], anonim: false,
    meta: { skala: SKALA_KINERJA, pengantar: "Yth. Bapak/Ibu pimpinan atau atasan langsung alumni Program Studi Usaha Perjalanan Wisata (D4), Politeknik Pariwisata Bali. Survei ini menilai kinerja alumni kami di tempat kerja Bapak/Ibu pada tujuh kemampuan yang ditetapkan instrumen akreditasi LAMWisata, ditambah beberapa kemampuan khas industri perjalanan wisata. Satu formulir untuk satu alumni; bila Bapak/Ibu membawahi beberapa alumni, mohon isi satu formulir per alumni. Data dipakai hanya untuk penjaminan mutu dan perbaikan kurikulum; nama penilai tidak dipublikasikan. Waktu pengisian sekitar 10 menit." },
    pertanyaan: rata([
      bag("A. Identitas instansi dan penilai", [
        qs("singkat", "Nama instansi / perusahaan", "Nama resmi tempat alumni bekerja.", { ind: "ID1" }),
        qs("pilihan", "Jenis instansi", "", { opsi: ["Biro perjalanan / tour operator", "Online travel agent / perusahaan digital pariwisata", "Hotel / resor / akomodasi", "Maskapai / transportasi", "MICE / event organizer", "Instansi pemerintah", "BUMN / BUMD", "Desa wisata / komunitas", "Lainnya"], ind: "ID2", seg: true }),
        qs("pilihan", "Tingkat / cakupan usaha instansi", "Dipakai untuk analisis tingkat tempat kerja (Tabel 10c).", { opsi: ["Lokal/wilayah", "Nasional", "Multinasional/internasional"], ind: "ID3", seg: true }),
        qs("singkat", "Nama dan jabatan penilai", "Penilai sebaiknya atasan langsung yang mengamati kerja alumni sehari-hari.", { ind: "ID4" }),
        qs("singkat", "Nama alumni Prodi UPW yang dinilai", "", { ind: "ID5" }),
        qs("singkat", "Tahun lulus alumni (YYYY)", "Diperlukan untuk menghitung jumlah tanggapan per tahun lulusan (Ref 11a).", { peran: "tahunLulus", ind: "ID6" }),
        qs("pilihan", "Sudah berapa lama alumni bekerja di instansi Bapak/Ibu?", "", { opsi: ["< 6 bulan", "6–12 bulan", "1–2 tahun", "> 2 tahun"], ind: "ID7", seg: true }),
        qs("singkat", "Posisi / jabatan alumni saat ini", "", { ind: "ID8" })]),
      bag("B. Etika", [
        sk("Integritas dan kejujuran dalam bekerja", "Misalnya jujur dalam transaksi dan laporan, tidak menyalahgunakan wewenang atau data pelanggan.", "Etika", "ETI1", { aspek: 0 }),
        sk("Disiplin, tanggung jawab, dan ketepatan waktu", "Hadir tepat waktu, menyelesaikan tugas sesuai tenggat, dan bertanggung jawab atas hasilnya.", "Etika", "ETI2", { aspek: 0 }),
        sk("Sikap melayani (hospitality) dan sopan santun kepada tamu, rekan, dan atasan", "Sikap ramah, menghargai tamu dari beragam budaya, dan menjaga citra perusahaan.", "Etika", "ETI3", { aspek: 0 })]),
      bag("C. Keahlian pada bidang ilmu (kompetensi utama perjalanan wisata)", [
        sk("Merancang dan menghitung paket wisata / itinerary", "Menyusun rencana perjalanan, menghitung harga pokok dan harga jual secara tepat.", "Keahlian", "KEA1", { aspek: 1, na: true }),
        sk("Reservasi dan tiket (GDS/sistem reservasi), dokumen perjalanan", "Mengoperasikan sistem reservasi, menerbitkan tiket/voucher, memahami dokumen perjalanan.", "Keahlian", "KEA2", { aspek: 1, na: true }),
        sk("Operasional tur, pemanduan, dan penanganan tamu di lapangan", "Mengelola pelaksanaan tur, memandu, dan menangani keluhan atau keadaan darurat.", "Keahlian", "KEA3", { aspek: 1, na: true }),
        sk("Pemasaran dan penjualan produk perjalanan wisata", "Menawarkan produk, membuat materi promosi, dan mencapai target penjualan.", "Keahlian", "KEA4", { aspek: 1, na: true })]),
      bag("D. Kemampuan berbahasa asing", [
        sk("Bahasa Inggris lisan untuk melayani tamu dan bernegosiasi", "Percakapan langsung, telepon, presentasi.", "Bahasa asing", "BHS1", { aspek: 2 }),
        sk("Bahasa Inggris tulis untuk korespondensi bisnis", "Email, penawaran, laporan.", "Bahasa asing", "BHS2", { aspek: 2 }),
        sk("Bahasa asing lain (Jepang/Jerman/Perancis/lainnya) sesuai kebutuhan pekerjaan", "Pilih \"Tidak tahu / tidak berlaku\" bila pekerjaan tidak memerlukannya.", "Bahasa asing", "BHS3", { aspek: 2, na: true })]),
      bag("E. Penggunaan teknologi informasi", [
        sk("Mengoperasikan perangkat lunak kantor dan sistem perusahaan", "Spreadsheet, dokumen, sistem reservasi/CRM perusahaan.", "Teknologi informasi", "TIK1", { aspek: 3 }),
        sk("Memanfaatkan media digital untuk promosi dan layanan pelanggan", "Media sosial, konten digital, marketplace/OTA.", "Teknologi informasi", "TIK2", { aspek: 3 }),
        sk("Cepat mempelajari teknologi atau aplikasi baru", "Adaptasi terhadap sistem baru yang diterapkan perusahaan.", "Teknologi informasi", "TIK3", { aspek: 3 })]),
      bag("F. Kemampuan berkomunikasi", [
        sk("Menyampaikan informasi dengan jelas kepada tamu dan rekan kerja", "Lisan maupun tulisan, terstruktur dan mudah dipahami.", "Komunikasi", "KOM1", { aspek: 4 }),
        sk("Mendengarkan, memahami kebutuhan, dan menangani keluhan pelanggan", "Empati dan penyelesaian keluhan secara profesional.", "Komunikasi", "KOM2", { aspek: 4 }),
        sk("Presentasi dan negosiasi dengan mitra/pemasok", "Misalnya negosiasi harga dengan hotel, transportasi, atau vendor.", "Komunikasi", "KOM3", { aspek: 4, na: true })]),
      bag("G. Kerja sama", [
        sk("Bekerja sama dalam tim dan lintas bagian", "Berbagi informasi, saling membantu, menyelesaikan tugas bersama.", "Kerja sama", "KER1", { aspek: 5 }),
        sk("Menyesuaikan diri dengan rekan dan budaya kerja yang beragam", "Bekerja dengan orang dari latar belakang berbeda.", "Kerja sama", "KER2", { aspek: 5 }),
        sk("Mengelola konflik secara konstruktif", "Menyelesaikan perbedaan pendapat tanpa mengganggu pekerjaan.", "Kerja sama", "KER3", { aspek: 5 })]),
      bag("H. Pengembangan diri", [
        sk("Inisiatif untuk belajar dan meningkatkan kompetensi", "Mengikuti pelatihan, sertifikasi, atau belajar mandiri.", "Pengembangan diri", "PDR1", { aspek: 6 }),
        sk("Kemampuan memecahkan masalah dan berinovasi", "Menawarkan solusi atau cara kerja yang lebih baik.", "Pengembangan diri", "PDR2", { aspek: 6 }),
        sk("Potensi kepemimpinan dan kesiapan memikul tanggung jawab lebih besar", "Kesiapan untuk dipromosikan atau memimpin tim.", "Pengembangan diri", "PDR3", { aspek: 6 })]),
      bag("I. Penilaian keseluruhan dan kebutuhan", [
        sk("Secara keseluruhan, seberapa puas Bapak/Ibu dengan kinerja alumni ini?", "", "Kepuasan umum", "OVR1"),
        qs("pilihan", "Dibandingkan lulusan perguruan tinggi lain pada posisi yang sama, kinerja alumni ini", "", { opsi: ["Lebih rendah", "Setara", "Lebih tinggi", "Belum ada pembanding"], ind: "OVR2" }),
        qs("pilihan", "Seberapa besar kemungkinan Bapak/Ibu merekrut lulusan Prodi UPW lagi? (0 = sangat tidak mungkin, 10 = sangat mungkin)", "", { opsi: NPS_OPSI, nps: true, "var": "Loyalitas", ind: "NPS" }),
        qs("centang", "Kemampuan yang paling perlu diperkuat Prodi UPW untuk lulusan berikutnya (boleh lebih dari satu)", "Masukan ini dibawa ke rapat kurikulum dan Industry Advisory Board.", { wajib: false, opsi: ["Bahasa asing", "Digital marketing dan konten", "Sistem reservasi/GDS", "Perhitungan harga dan keuangan", "Pelayanan dan penanganan keluhan", "Negosiasi dan penjualan", "Kepemimpinan", "Etos kerja dan disiplin", "Lainnya"], ind: "BUT1" }),
        qs("paragraf", "Saran untuk Prodi UPW", "", { wajib: false, ind: "OPN1" })])
    ]) },

  /* ============ 3. Tracer study: pertanyaan inti Kemdiktisaintek (butir 38–41, Tabel 10a–c) ============ */
  tracer: { judul: "Tracer study alumni Prodi UPW", tujuan: "tracer", sasaran: ["publik"], anonim: false,
    meta: { skala: SKALA_LAYANAN, pengantar: "Yth. alumni Prodi Usaha Perjalanan Wisata. Tracer study ini memakai pertanyaan inti tracer study Kemdiktisaintek dan dilaksanakan setiap tahun untuk lulusan 2–4 tahun terakhir. Jawaban Anda menentukan penilaian akreditasi prodi (waktu tunggu, kesesuaian bidang kerja, dan tingkat tempat kerja) serta menjadi dasar perbaikan kurikulum. Identitas diperlukan agar data tidak tercatat ganda dan dapat dicocokkan dengan data lulusan; data pribadi tidak dipublikasikan. Waktu pengisian sekitar 10–15 menit." },
    pertanyaan: rata([
      bag("A. Identitas alumni", [
        qs("singkat", "NIM", "", { ind: "NIMHSMSMH" }), qs("singkat", "Nama lengkap", "", { ind: "NMMHSMSMH" }),
        qs("singkat", "Tahun lulus (YYYY)", "", { peran: "tahunLulus", ind: "THNLULUS" }),
        qs("singkat", "Email aktif", "Untuk tracer tahun berikutnya; tidak dipublikasikan.", { ind: "EMAILMSMH" }),
        qs("singkat", "Nomor HP/WhatsApp", "", { wajib: false, ind: "TELPMSMH" })]),
      bag("B. Status dan pekerjaan (kuesioner inti)", [
        qs("pilihan", "Jelaskan status Anda saat ini", "Pilih yang paling sesuai saat mengisi survei ini.", { opsi: ["Bekerja (full time/part time)", "Wiraswasta", "Melanjutkan pendidikan", "Tidak kerja tetapi sedang mencari kerja", "Belum memungkinkan bekerja"], ind: "F8", seg: true }),
        qs("pilihan", "Apakah Anda mendapatkan pekerjaan ≤ 6 bulan setelah lulus (termasuk bekerja sebelum lulus)?", "", { wajib: false, opsi: ["Ya", "Tidak"], ind: "F504" }),
        qs("pilihan", "Dalam berapa bulan setelah lulus Anda mendapatkan pekerjaan pertama?", "Hitung dari tanggal lulus/yudisium. Pilih \"0\" bila sudah bekerja sebelum atau saat lulus. Dipakai untuk waktu tunggu (butir 39, Tabel 10a: kurang dari 3, 3–6, lebih dari 6 bulan).", { wajib: false, opsi: ["0 (sudah bekerja sebelum/saat lulus)", "1 bulan", "2 bulan", "3 bulan", "4 bulan", "5 bulan", "6 bulan", "7–12 bulan", "Lebih dari 12 bulan", "Belum bekerja"], ind: "F502" }),
        qs("pilihan", "Rata-rata pendapatan Anda per bulan (take home pay)", "", { wajib: false, opsi: ["< Rp3 juta", "Rp3–5 juta", "Rp5–7,5 juta", "Rp7,5–10 juta", "> Rp10 juta", "Belum berpendapatan"], ind: "F505" }),
        qs("singkat", "Lokasi tempat kerja (kabupaten/kota, provinsi atau negara)", "", { wajib: false, ind: "F5A" }),
        qs("pilihan", "Jenis perusahaan/instansi tempat Anda bekerja", "", { wajib: false, opsi: ["Instansi pemerintah", "Organisasi non-profit/LSM", "Perusahaan swasta", "Wiraswasta/perusahaan sendiri", "BUMN/BUMD", "Institusi/organisasi multilateral", "Lainnya"], ind: "F1101", seg: true }),
        qs("singkat", "Nama perusahaan/kantor tempat Anda bekerja", "", { wajib: false, ind: "F5B" }),
        qs("pilihan", "Posisi/jabatan Anda (khusus wiraswasta)", "", { wajib: false, opsi: ["Founder", "Co-Founder", "Staff", "Freelance/kerja lepas"], ind: "F5C" }),
        qs("pilihan", "Tingkat tempat kerja Anda", "Lokal/wilayah termasuk wiraswasta tidak berbadan hukum; nasional termasuk wiraswasta berbadan hukum. Dipakai untuk Tabel 10c (butir 41).", { wajib: false, opsi: ["Lokal/wilayah", "Nasional", "Multinasional/internasional"], ind: "F5D", seg: true }),
        qs("pilihan", "Seberapa erat hubungan bidang studi dengan pekerjaan Anda?", "Dipakai untuk kesesuaian bidang kerja (butir 40).", { wajib: false, opsi: ["Sangat erat", "Erat", "Cukup erat", "Kurang erat", "Tidak sama sekali"], ind: "F14" }),
        qs("pilihan", "Tingkat pendidikan apa yang paling tepat untuk pekerjaan Anda saat ini?", "", { wajib: false, opsi: ["Setingkat lebih tinggi", "Tingkat yang sama", "Setingkat lebih rendah", "Tidak perlu pendidikan tinggi"], ind: "F15" }),
        qs("centang", "Jika pekerjaan Anda tidak sesuai pendidikan, mengapa Anda mengambilnya?", "", { wajib: false, opsi: ["Belum mendapat pekerjaan yang lebih sesuai", "Prospek karier lebih baik", "Lebih menyukai pekerjaan ini", "Pendapatan lebih tinggi", "Lokasi lebih dekat/aman", "Lainnya"], ind: "F16" })]),
      bag("C. Melanjutkan studi dan pembiayaan", [
        qs("singkat", "Bila melanjutkan studi: nama perguruan tinggi dan program studi", "", { wajib: false, ind: "F18" }),
        qs("pilihan", "Sumber dana utama pembiayaan kuliah Anda di Prodi UPW", "", { wajib: false, opsi: ["Biaya sendiri/keluarga", "Beasiswa ADIK", "Beasiswa BIDIKMISI/KIP Kuliah", "Beasiswa PPA", "Beasiswa afirmasi", "Beasiswa perusahaan/swasta", "Lainnya"], ind: "F1201" })]),
      bag("D. Proses mencari kerja", [
        qs("pilihan", "Kapan Anda mulai mencari pekerjaan?", "", { wajib: false, opsi: ["Sebelum lulus", "Setelah lulus", "Saya tidak mencari kerja"], ind: "F301" }),
        qs("centang", "Bagaimana Anda mencari pekerjaan tersebut?", "", { wajib: false, opsi: ["Iklan media cetak/online", "Melamar tanpa mengetahui lowongan", "Bursa kerja/job fair", "Internet/situs lowongan/media sosial", "Dihubungi perusahaan", "Agen tenaga kerja", "Pusat karier/alumni kampus", "Jejaring sejak kuliah", "Relasi (dosen, keluarga, teman)", "Membangun bisnis sendiri", "Penempatan dari magang", "Bekerja di tempat kerja semasa kuliah", "Lainnya"], ind: "F4" }),
        qs("pilihan", "Berapa perusahaan/instansi yang Anda lamar sebelum mendapat pekerjaan pertama?", "", { wajib: false, opsi: ["1–2", "3–5", "6–10", "11–20", "> 20", "Tidak melamar"], ind: "F6" }),
        qs("pilihan", "Berapa yang mengundang Anda wawancara?", "", { wajib: false, opsi: ["0", "1–2", "3–5", "> 5"], ind: "F7A" })]),
      bag("E. Kompetensi: tingkat Anda saat lulus (1 sangat rendah – 5 sangat tinggi)", ["Etika", "Keahlian berdasarkan bidang ilmu", "Bahasa Inggris", "Penggunaan teknologi informasi", "Komunikasi", "Kerja sama tim", "Pengembangan diri"].map(function (k, i) {
        return qs("pilihan", k + " (saat lulus)", i ? "" : "Bandingkan kemampuan Anda saat lulus (bagian ini) dengan tingkat yang diperlukan pekerjaan (bagian berikutnya). Selisihnya menunjukkan kesenjangan kompetensi yang perlu ditutup kurikulum.", { opsi: ["1", "2", "3", "4", "5"], ind: "F17" + (61 + i * 2), "var": "Kompetensi saat lulus" }); })),
      bag("F. Kompetensi: tingkat yang DIPERLUKAN pekerjaan Anda (1 sangat rendah – 5 sangat tinggi)", ["Etika", "Keahlian berdasarkan bidang ilmu", "Bahasa Inggris", "Penggunaan teknologi informasi", "Komunikasi", "Kerja sama tim", "Pengembangan diri"].map(function (k, i) {
        return qs("pilihan", k + " (diperlukan pekerjaan)", "", { opsi: ["1", "2", "3", "4", "5"], ind: "F17" + (62 + i * 2), "var": "Kompetensi diperlukan" }); })),
      bag("G. Penekanan metode pembelajaran di Prodi UPW (1 tidak sama sekali – 5 sangat besar)", ["Perkuliahan", "Demonstrasi", "Partisipasi dalam proyek riset", "Magang", "Praktikum", "Kerja lapangan", "Diskusi"].map(function (k, i) {
        return qs("pilihan", k, "", { opsi: ["1", "2", "3", "4", "5"], ind: "F2" + (1 + i), "var": "Metode pembelajaran" }); })),
      bag("H. Masukan", [
        qs("paragraf", "Masukan untuk kurikulum Prodi UPW berdasarkan pengalaman kerja Anda", "Mata kuliah, keterampilan, atau sertifikasi yang menurut Anda perlu ditambah atau diperkuat.", { wajib: false, ind: "OPN1" })])
    ]) },

  /* ============ 4. Layanan kemahasiswaan (butir 65 B) ============ */
  layanan: { judul: "Kepuasan mahasiswa terhadap layanan kemahasiswaan", tujuan: "layanan", sasaran: ["mahasiswa"], anonim: true,
    meta: { skala: SKALA_LAYANAN, pengantar: "Survei ini menilai akses dan mutu layanan kemahasiswaan (butir 65 instrumen LAMWisata): pengembangan minat dan bakat, bimbingan dan konseling, beasiswa, kesehatan, pengembangan karier, dan informasi. Untuk layanan yang belum pernah Anda gunakan, pilih \"Tidak tahu / tidak berlaku\" pada pertanyaan mutu. " + KERAHASIAAN_ANONIM },
    pertanyaan: rata([
      bag("A. Tentang Anda", [qs("pilihan", "Saat ini Anda berada di semester", "", { opsi: ["Semester 1–2", "Semester 3–4", "Semester 5–6", "Semester 7–8"], seg: true, ind: "SMT" })]),
      bag("B. Pengembangan minat, bakat, dan penalaran", [
        sk("Informasi kegiatan minat-bakat (UKM, himpunan, lomba) mudah diperoleh.", "", "Minat bakat", "MB1"),
        sk("Prodi/kampus memfasilitasi lomba dan kompetisi (pembimbing, dana, izin).", "", "Minat bakat", "MB2", { na: true }),
        sk("Kegiatan himpunan/organisasi mahasiswa mengembangkan kepemimpinan dan soft skill.", "", "Minat bakat", "MB3", { na: true })]),
      bag("C. Bimbingan dan konseling", [
        sk("Tersedia tempat atau orang untuk berkonsultasi masalah pribadi dan akademik.", "Dosen pembimbing akademik atau layanan konseling kampus.", "Konseling", "BK1"),
        sk("Kerahasiaan dalam layanan konseling terjaga.", "", "Konseling", "BK2", { na: true }),
        sk("Layanan konseling membantu menyelesaikan masalah Anda.", "", "Konseling", "BK3", { na: true })]),
      bag("D. Beasiswa", [
        sk("Informasi beasiswa diumumkan terbuka, lengkap, dan tepat waktu.", "", "Beasiswa", "BS1"),
        sk("Proses seleksi beasiswa adil dan transparan.", "", "Beasiswa", "BS2", { na: true }),
        sk("Pencairan dan pendampingan penerima beasiswa berjalan lancar.", "", "Beasiswa", "BS3", { na: true })]),
      bag("E. Kesehatan dan kesejahteraan", [
        sk("Layanan kesehatan (klinik/P3K) mudah diakses saat dibutuhkan.", "", "Kesehatan", "KS1", { na: true }),
        sk("Lingkungan kampus aman dan bebas perundungan, kekerasan, dan pelecehan.", "Termasuk kekerasan seksual; laporan dapat disampaikan ke Satgas PPKS.", "Kesehatan", "KS2")]),
      bag("F. Pengembangan karier dan kewirausahaan", [
        sk("Informasi magang, lowongan kerja, dan sertifikasi tersedia dan relevan.", "", "Karier", "KR1"),
        sk("Ada pembekalan karier (CV, wawancara, etika kerja) sebelum magang/lulus.", "", "Karier", "KR2", { na: true }),
        sk("Prodi mendukung mahasiswa yang ingin berwirausaha di bidang perjalanan wisata.", "", "Karier", "KR3", { na: true })]),
      bag("G. Seberapa PENTING layanan berikut bagi Anda?", [
        sk("Pengembangan minat dan bakat", "", "Kepentingan", "IMP1", { lab: "penting", pent: "Minat bakat" }),
        sk("Bimbingan dan konseling", "", "Kepentingan", "IMP2", { lab: "penting", pent: "Konseling" }),
        sk("Beasiswa", "", "Kepentingan", "IMP3", { lab: "penting", pent: "Beasiswa" }),
        sk("Kesehatan dan keamanan", "", "Kepentingan", "IMP4", { lab: "penting", pent: "Kesehatan" }),
        sk("Pengembangan karier dan kewirausahaan", "", "Kepentingan", "IMP5", { lab: "penting", pent: "Karier" })]),
      bag("H. Keseluruhan", [
        sk("Secara keseluruhan, seberapa puas Anda dengan layanan kemahasiswaan?", "", "Kepuasan umum", "OVR1"),
        qs("paragraf", "Layanan kemahasiswaan apa yang belum ada atau perlu diperbaiki?", "", { wajib: false, ind: "OPN1" })])
    ]) },

  /* ============ 5. Kepuasan dosen (butir 78) ============ */
  dosen: { judul: "Kepuasan dosen terhadap tata kelola dan layanan", tujuan: "dosen", sasaran: ["dosen"], anonim: true,
    meta: { skala: SKALA_LAYANAN, pengantar: "Survei ini mengukur kepuasan dosen terhadap tata kelola, layanan, dan dukungan pengembangan di Prodi UPW dan Politeknik (butir 78 instrumen LAMWisata: kepuasan pemangku kepentingan). " + KERAHASIAAN_ANONIM },
    pertanyaan: rata([
      bag("A. Tata kelola dan kepemimpinan", [
        sk("Visi, misi, dan rencana prodi dikomunikasikan dengan jelas dan melibatkan dosen.", "", "Tata kelola", "TK1"),
        sk("Pembagian tugas mengajar dan beban kerja adil dan transparan.", "Termasuk penetapan tim pengajar dan beban SKS.", "Tata kelola", "TK2"),
        sk("Keputusan prodi diambil berdasarkan data dan rapat yang terdokumentasi.", "", "Tata kelola", "TK3"),
        sk("Pimpinan terbuka terhadap masukan dan kritik.", "", "Tata kelola", "TK4")]),
      bag("B. Layanan administrasi dan kepegawaian", [
        sk("Layanan administrasi (surat tugas, keuangan, kepegawaian) cepat dan jelas.", "", "Administrasi", "AD1"),
        sk("Informasi kenaikan jabatan fungsional dan sertifikasi dosen mudah diperoleh dan dibantu.", "", "Administrasi", "AD2"),
        sk("Sistem informasi (SIAKAD, aplikasi repositori, LMS) mendukung pekerjaan dosen.", "", "Administrasi", "AD3")]),
      bag("C. Dukungan penelitian dan PkM", [
        sk("Pendanaan internal penelitian dan PkM tersedia dan prosesnya jelas.", "", "Penelitian & PkM", "PP1"),
        sk("Ada dukungan untuk publikasi (biaya, pendampingan, klinik penulisan).", "", "Penelitian & PkM", "PP2"),
        sk("Kerja sama dengan mitra/industri untuk penelitian dan PkM difasilitasi.", "", "Penelitian & PkM", "PP3")]),
      bag("D. Pengembangan diri", [
        sk("Kesempatan studi lanjut, pelatihan, magang industri, dan sertifikasi kompetensi terbuka dan adil.", "", "Pengembangan diri", "PD1"),
        sk("Ada penghargaan atas kinerja dan prestasi dosen.", "", "Pengembangan diri", "PD2")]),
      bag("E. Sarana, prasarana, dan suasana kerja", [
        sk("Ruang kerja, perangkat, dan laboratorium memadai untuk mengajar dan meneliti.", "", "Sarana", "SR1"),
        sk("Suasana kerja kolegial, saling menghargai, dan mendukung.", "", "Suasana kerja", "SK1"),
        sk("Kesejahteraan (honor, tunjangan, insentif) sesuai beban kerja.", "", "Kesejahteraan", "KJ1")]),
      bag("F. Keseluruhan", [
        sk("Secara keseluruhan, seberapa puas Anda bekerja sebagai dosen di Prodi UPW?", "", "Kepuasan umum", "OVR1"),
        qs("paragraf", "Hal yang paling perlu diperbaiki (tanpa menyebut nama orang)", "", { wajib: false, ind: "OPN1" })])
    ]) },

  /* ============ 6. Kepuasan tendik (butir 78) ============ */
  tendik: { judul: "Kepuasan tenaga kependidikan terhadap tata kelola dan layanan", tujuan: "tendik", sasaran: ["tendik"], anonim: true,
    meta: { skala: SKALA_LAYANAN, pengantar: "Survei ini mengukur kepuasan tenaga kependidikan terhadap tata kelola, beban kerja, pengembangan, dan suasana kerja (butir 78 instrumen LAMWisata). " + KERAHASIAAN_ANONIM + " Karena jumlah tendik sedikit, hasil hanya ditampilkan sebagai ringkasan bila pengisi cukup." },
    pertanyaan: rata([
      bag("A. Tugas dan tata kelola", [
        sk("Uraian tugas dan tanggung jawab saya jelas.", "", "Tata kelola", "TK1"),
        sk("Beban kerja wajar dan dibagi secara adil.", "", "Tata kelola", "TK2"),
        sk("Prosedur kerja (SOP) tersedia dan dipatuhi.", "", "Tata kelola", "TK3")]),
      bag("B. Pengembangan dan penghargaan", [
        sk("Kesempatan pelatihan dan pengembangan kompetensi tersedia.", "", "Pengembangan diri", "PD1"),
        sk("Kinerja dinilai secara objektif dan ada penghargaan atas prestasi.", "", "Pengembangan diri", "PD2"),
        sk("Kesempatan pengembangan karier (kenaikan pangkat/jabatan) jelas.", "", "Pengembangan diri", "PD3")]),
      bag("C. Sarana dan suasana kerja", [
        sk("Peralatan dan sistem kerja (komputer, aplikasi, jaringan) memadai.", "", "Sarana", "SR1"),
        sk("Komunikasi dengan pimpinan dan dosen berjalan baik.", "", "Suasana kerja", "SK1"),
        sk("Suasana kerja saling menghargai dan mendukung.", "", "Suasana kerja", "SK2"),
        sk("Kesejahteraan sesuai beban kerja.", "", "Kesejahteraan", "KJ1")]),
      bag("D. Keseluruhan", [
        sk("Secara keseluruhan, seberapa puas Anda bekerja di Prodi UPW?", "", "Kepuasan umum", "OVR1"),
        qs("paragraf", "Hal yang paling perlu diperbaiki (tanpa menyebut nama orang)", "", { wajib: false, ind: "OPN1" })])
    ]) },

  /* ============ 7. Kepuasan mitra (butir 73, 78) ============ */
  mitra: { judul: "Kepuasan mitra kerja sama Prodi UPW", tujuan: "mitra", sasaran: ["publik"], anonim: false,
    meta: { skala: SKALA_LAYANAN, pengantar: "Yth. Bapak/Ibu mitra Program Studi Usaha Perjalanan Wisata, Politeknik Pariwisata Bali. Survei ini menilai pelaksanaan dan manfaat kerja sama (pendidikan, magang, penelitian, PkM) sebagai bukti kepuasan mitra dalam akreditasi LAMWisata (butir 73) dan bahan perbaikan. Mohon diisi satu formulir per lembaga. Waktu pengisian sekitar 7 menit." },
    pertanyaan: rata([
      bag("A. Identitas mitra", [
        qs("singkat", "Nama lembaga mitra", "", { ind: "ID1" }),
        qs("pilihan", "Jenis lembaga", "", { opsi: ["Biro perjalanan/tour operator", "Hotel/akomodasi", "Maskapai/transportasi", "Instansi pemerintah", "Asosiasi profesi", "Perguruan tinggi", "Desa wisata/komunitas", "Lainnya"], ind: "ID2", seg: true }),
        qs("centang", "Bentuk kerja sama yang dijalankan", "", { opsi: ["Magang/praktik kerja", "Dosen tamu/praktisi mengajar", "Penelitian bersama", "PkM bersama", "Rekrutmen lulusan", "Sertifikasi", "Lainnya"], ind: "ID3" }),
        qs("pilihan", "Tingkat kerja sama", "", { opsi: ["Lokal/wilayah", "Nasional", "Internasional"], ind: "ID4", seg: true }),
        qs("singkat", "Nama dan jabatan pengisi", "", { ind: "ID5" })]),
      bag("B. Pelaksanaan kerja sama", [
        sk("Kegiatan kerja sama dilaksanakan sesuai kesepakatan (MoU/IA).", "", "Pelaksanaan", "PL1"),
        sk("Koordinasi dan komunikasi dengan prodi lancar dan responsif.", "", "Pelaksanaan", "PL2"),
        sk("Prodi menindaklanjuti masukan dan keluhan mitra.", "", "Pelaksanaan", "PL3")]),
      bag("C. Kompetensi mahasiswa/dosen yang terlibat", [
        sk("Mahasiswa magang/praktik siap bekerja (sikap, keterampilan, bahasa).", "", "Kompetensi", "KP1", { na: true }),
        sk("Dosen yang terlibat kompeten dan profesional.", "", "Kompetensi", "KP2", { na: true })]),
      bag("D. Manfaat", [
        sk("Kerja sama memberi manfaat nyata bagi lembaga Bapak/Ibu.", "Misalnya tenaga magang yang membantu, hasil penelitian/PkM yang dipakai, atau rekrutmen.", "Manfaat", "MF1"),
        sk("Kerja sama meningkatkan citra atau jejaring lembaga Bapak/Ibu.", "", "Manfaat", "MF2")]),
      bag("E. Keberlanjutan", [
        sk("Secara keseluruhan, seberapa puas Bapak/Ibu dengan kerja sama ini?", "", "Kepuasan umum", "OVR1"),
        qs("pilihan", "Apakah Bapak/Ibu bersedia melanjutkan atau memperluas kerja sama?", "", { opsi: ["Ya, memperluas", "Ya, melanjutkan", "Mungkin", "Tidak"], ind: "KB1" }),
        qs("paragraf", "Usulan bentuk kerja sama berikutnya dan saran untuk prodi", "", { wajib: false, ind: "OPN1" })])
    ]) },

  /* ============ 8. Exit survey lulusan (butir 78: kelompok lulusan) ============ */
  exit: { judul: "Survei kepuasan lulusan (exit survey)", tujuan: "exit", sasaran: ["mahasiswaAkhir"], anonim: true,
    meta: { skala: SKALA_LAYANAN, pengantar: "Survei ini untuk mahasiswa yang akan lulus atau baru menyelesaikan studi di Prodi UPW. Anda menilai pengalaman belajar selama di prodi secara keseluruhan (butir 78 instrumen LAMWisata: kepuasan lulusan). " + KERAHASIAAN_ANONIM },
    pertanyaan: rata([
      bag("A. Kurikulum dan pembelajaran", [
        sk("Kurikulum relevan dengan kebutuhan industri perjalanan wisata.", "", "Kurikulum", "KU1"),
        sk("Porsi praktik, praktik lapangan, dan magang cukup untuk membangun keterampilan kerja.", "", "Kurikulum", "KU2"),
        sk("Mata kuliah bahasa asing membekali kemampuan berkomunikasi dengan tamu.", "", "Kurikulum", "KU3"),
        sk("Pembelajaran melatih kemampuan digital (GDS, pemasaran digital, aplikasi).", "", "Kurikulum", "KU4")]),
      bag("B. Dosen dan pembimbingan", [
        sk("Dosen kompeten dan memberi contoh dari praktik industri.", "", "Dosen", "DS1"),
        sk("Pembimbingan tugas akhir/proyek akhir efektif dan tepat waktu.", "", "Dosen", "DS2", { na: true }),
        sk("Pembimbingan magang (kampus dan industri) membantu Anda berkembang.", "", "Dosen", "DS3", { na: true })]),
      bag("C. Layanan dan sarana", [
        sk("Layanan akademik dan administrasi selama studi memuaskan.", "", "Layanan", "LY1"),
        sk("Sarana praktik (laboratorium, perangkat lunak) memadai.", "", "Layanan", "LY2")]),
      bag("D. Capaian dan kesiapan kerja", [
        sk("Saya merasa siap bekerja di industri perjalanan wisata.", "", "Kesiapan kerja", "KS1", { lab: "setuju" }),
        sk("Saya menguasai kompetensi utama lulusan (perencanaan perjalanan, reservasi/tiket, pemanduan, pemasaran).", "", "Kesiapan kerja", "KS2", { lab: "setuju" }),
        sk("Sertifikasi kompetensi yang saya peroleh bermanfaat untuk melamar kerja.", "", "Kesiapan kerja", "KS3", { lab: "setuju", na: true })]),
      bag("E. Rencana setelah lulus", [
        qs("pilihan", "Rencana utama Anda setelah lulus", "", { opsi: ["Bekerja di industri perjalanan wisata", "Bekerja di bidang lain", "Berwirausaha", "Melanjutkan studi", "Bekerja di luar negeri", "Belum tahu"], ind: "RC1", seg: true }),
        qs("pilihan", "Apakah Anda sudah mendapat pekerjaan atau tawaran kerja?", "", { opsi: ["Sudah bekerja", "Sudah mendapat tawaran", "Sedang melamar", "Belum mencari"], ind: "RC2" })]),
      bag("F. Keseluruhan", [
        sk("Secara keseluruhan, seberapa puas Anda dengan pengalaman studi di Prodi UPW?", "", "Kepuasan umum", "OVR1"),
        qs("pilihan", "Seberapa besar kemungkinan Anda merekomendasikan Prodi UPW kepada calon mahasiswa? (0 = sangat tidak mungkin, 10 = sangat mungkin)", "", { opsi: NPS_OPSI, nps: true, "var": "Loyalitas", ind: "NPS" }),
        qs("paragraf", "Pesan dan saran untuk Prodi UPW", "", { wajib: false, ind: "OPN1" })])
    ]) },

  /* ============ 9. Masukan kurikulum dari pemangku kepentingan (butir 7, 3) ============ */
  kurikulum: { judul: "Masukan pemangku kepentingan untuk kurikulum Prodi UPW", tujuan: "kurikulum", sasaran: ["publik", "dosen"], anonim: false,
    meta: { skala: SKALA_LAYANAN, pengantar: "Survei ini menghimpun masukan anggota Industry Advisory Board, pengguna lulusan, alumni, asosiasi, dan dosen untuk evaluasi kurikulum Prodi Usaha Perjalanan Wisata (butir 7 dan 3 instrumen LAMWisata). Hasilnya dibahas dalam rapat kurikulum/IAB. Waktu pengisian sekitar 10 menit." },
    pertanyaan: rata([
      bag("A. Identitas", [
        qs("singkat", "Nama", "", { ind: "ID1" }), qs("singkat", "Lembaga / perusahaan", "", { wajib: false, ind: "ID2" }),
        qs("pilihan", "Peran Anda", "", { opsi: ["Anggota Industry Advisory Board", "Pengguna lulusan", "Alumni", "Asosiasi profesi", "Dosen", "Lainnya"], ind: "ID3", seg: true })]),
      bag("B. Relevansi capaian pembelajaran (CPL) dan profil lulusan", [
        sk("Profil lulusan Prodi UPW sesuai kebutuhan industri perjalanan wisata saat ini.", "Profil lulusan: perencana perjalanan, staf reservasi/tiket, pemandu/pemimpin perjalanan, pemasar produk perjalanan, wirausaha perjalanan.", "Relevansi CPL", "RC1"),
        sk("CPL keterampilan khusus mencakup kompetensi teknis yang dibutuhkan (perencanaan paket, reservasi, operasional tur, pemasaran).", "", "Relevansi CPL", "RC2"),
        sk("CPL selaras dengan standar kompetensi ASEAN MRA-TP dan SKKNI pariwisata.", "", "Relevansi CPL", "RC3", { na: true })]),
      bag("C. Struktur dan isi kurikulum", [
        sk("Proporsi praktik (praktik, praktik lapangan, magang) memadai untuk pendidikan vokasi.", "", "Struktur kurikulum", "SK1"),
        sk("Kurikulum memuat kompetensi digital (GDS, OTA, digital marketing, analitik data) yang memadai.", "", "Struktur kurikulum", "SK2"),
        sk("Kurikulum memuat keberlanjutan (pariwisata berkelanjutan, ekowisata, CHSE).", "", "Struktur kurikulum", "SK3"),
        sk("Kurikulum membangun kewirausahaan.", "", "Struktur kurikulum", "SK4")]),
      bag("D. Keterlibatan industri", [
        sk("Industri dilibatkan dalam penyusunan dan evaluasi kurikulum.", "", "Keterlibatan industri", "KI1"),
        sk("Praktisi industri cukup terlibat dalam pembelajaran (dosen tamu, team teaching, magang).", "", "Keterlibatan industri", "KI2")]),
      bag("E. Usulan", [
        qs("centang", "Kompetensi yang perlu ditambah atau diperkuat (boleh lebih dari satu)", "", { wajib: false, opsi: ["Bahasa asing", "Digital marketing dan konten", "GDS/sistem reservasi", "Data dan analitik", "MICE", "Wisata minat khusus", "Pariwisata berkelanjutan", "Kewirausahaan", "Manajemen krisis/keselamatan", "Lainnya"], ind: "US1" }),
        qs("paragraf", "Mata kuliah yang sebaiknya ditambah, digabung, atau dihapus, beserta alasannya", "", { wajib: false, ind: "OPN1" }),
        qs("paragraf", "Tren industri 3–5 tahun ke depan yang perlu diantisipasi kurikulum", "", { wajib: false, ind: "OPN2" })])
    ]) }
};

/* ============ 10. EDOM: evaluasi pembelajaran oleh mahasiswa per mata kuliah, per kelas, per dosen (butir 23, 22, 25) ============
   Formulir khusus: mahasiswa menilai SETIAP mata kuliah yang diikutinya semester itu. lev "mk" = dinilai sekali per mata kuliah/kelas;
   lev "dosen" = diulang untuk setiap dosen/praktisi dalam tim kelas itu (dari Data Prodi › Tim pengajar dan peserta kelas). */
TEMPLAT_SURVEI.edom = { judul: "Evaluasi pembelajaran oleh mahasiswa (EDOM)", tujuan: "edom", sasaran: ["mahasiswa"], anonim: true,
  meta: { skala: SKALA_LAYANAN, pengantar: "EDOM menilai setiap mata kuliah yang Anda ikuti semester ini dan setiap dosen/praktisi pengajarnya. Hasilnya dipakai untuk pemantauan dan evaluasi pembelajaran (butir 23 instrumen LAMWisata) dan menjadi masukan bagi dosen untuk memperbaiki cara mengajar. Isi satu per satu; Anda boleh berhenti dan melanjutkan nanti. " + KERAHASIAAN_ANONIM + " Dosen hanya melihat ringkasan kelasnya bila pengisinya minimal 5 orang, tanpa nama." },
  pertanyaan: rata([
    bag("A. Mata kuliah", [
      sk("RPS dan kontrak kuliah dijelaskan pada pertemuan pertama.", "Anda mengetahui capaian pembelajaran, jadwal materi, bobot penilaian, dan aturan kelas sejak awal.", "Perencanaan", "MK1", { lev: "mk" }),
      sk("Materi dan kegiatan yang dilaksanakan sesuai RPS.", "Topik per pertemuan berjalan sesuai rencana; perubahan dijelaskan alasannya.", "Perencanaan", "MK2", { lev: "mk" }),
      sk("Beban tugas sesuai bobot SKS.", "Waktu yang Anda perlukan untuk tugas wajar dibanding SKS mata kuliah (1 SKS ≈ 170 menit belajar per minggu, termasuk tatap muka).", "Beban belajar", "MK3", { lev: "mk" }),
      sk("Materi relevan dengan kebutuhan industri perjalanan wisata.", "Contoh, kasus, dan praktik mencerminkan pekerjaan nyata.", "Relevansi", "MK4", { lev: "mk" }),
      sk("Metode pembelajaran (praktik, studi kasus, proyek) membantu saya menguasai kompetensi.", "Bukan hanya ceramah; ada kegiatan yang membuat Anda berlatih.", "Relevansi", "MK5", { lev: "mk" }),
      sk("Penilaian dilakukan sesuai kriteria/rubrik yang diumumkan.", "Nilai sesuai bobot dan rubrik di kontrak kuliah; tidak ada komponen penilaian yang tiba-tiba muncul.", "Penilaian", "MK6", { lev: "mk" }),
      sk("Hasil tugas/ujian dikembalikan dengan umpan balik yang membantu.", "Ada penjelasan apa yang sudah baik dan apa yang perlu diperbaiki.", "Penilaian", "MK7", { lev: "mk" }),
      sk("Media, LMS, dan sarana praktik mata kuliah ini memadai.", "Materi tersedia di LMS, perangkat lunak/laboratorium berfungsi.", "Sarana", "MK8", { lev: "mk", na: true })]),
    bag("B. Dosen / praktisi pengajar (dinilai untuk setiap pengajar)", [
      sk("Menguasai materi dan menjawab pertanyaan dengan tepat.", "", "Kompetensi pedagogik", "DS1", { lev: "dosen", na: true }),
      sk("Menyampaikan materi dengan jelas, runtut, dan mudah dipahami.", "", "Kompetensi pedagogik", "DS2", { lev: "dosen", na: true }),
      sk("Hadir dan memulai/mengakhiri kelas tepat waktu sesuai jadwal.", "", "Kedisiplinan", "DS3", { lev: "dosen", na: true }),
      sk("Mendorong diskusi dan memberi kesempatan bertanya.", "", "Interaksi", "DS4", { lev: "dosen", na: true }),
      sk("Memberi contoh dari praktik industri, penelitian, atau pengabdian.", "", "Interaksi", "DS5", { lev: "dosen", na: true }),
      sk("Bersikap adil, sopan, dan menghargai mahasiswa.", "", "Kepribadian", "DS6", { lev: "dosen", na: true }),
      sk("Mudah dihubungi untuk konsultasi di luar kelas.", "", "Kepribadian", "DS7", { lev: "dosen", na: true })]),
    bag("C. Saran", [qs("paragraf", "Saran untuk mata kuliah ini (tanpa menyebut nama orang)", "Apa yang perlu dipertahankan dan apa yang perlu diperbaiki? Contoh konkret lebih membantu.", { wajib: false, ind: "SRN", lev: "mk" })])
  ]) };
var JELAS_EDOM = {
  DS1: "Pengajar memahami materi secara mendalam dan dapat menjawab pertanyaan. Pilih \"Tidak tahu\" bila pengajar ini hanya mengajar sangat sedikit pertemuan.",
  DS2: "Penjelasan terstruktur, contoh jelas, dan kecepatan sesuai kemampuan kelas.",
  DS3: "Kehadiran sesuai jadwal; perubahan jadwal diberitahukan sebelumnya.",
  DS4: "Suasana kelas membuat Anda berani bertanya dan berpendapat.",
  DS5: "Materi dikaitkan dengan pengalaman industri atau hasil penelitian/PkM dosen.",
  DS6: "Perlakuan setara kepada semua mahasiswa, tanpa merendahkan.",
  DS7: "Merespons pesan atau menyediakan waktu konsultasi dalam waktu wajar." };

/* Penjelasan tambahan untuk setiap pertanyaan skala yang belum berpenjelasan (dipasang saat berkas dimuat), agar semua butir memberi gambaran
   apa yang dinilai dan contohnya. Kunci: templat → kode indikator. */
var JELAS_TAMBAHAN = {
  t22: { IMP2: "Seberapa penting aspek ini bagi Anda, terlepas dari kondisi saat ini.", IMP3: "Seberapa penting aspek ini bagi Anda, terlepas dari kondisi saat ini.", IMP4: "Seberapa penting aspek ini bagi Anda, terlepas dari kondisi saat ini.", IMP5: "Seberapa penting aspek ini bagi Anda, terlepas dari kondisi saat ini." },
  t11: { OVR1: "Penilaian umum setelah mempertimbangkan seluruh kemampuan di atas." },
  layanan: {
    MB1: "Apakah Anda mudah mengetahui UKM, himpunan, dan lomba yang bisa diikuti (pengumuman, media sosial, grup kelas).",
    MB2: "Dukungan prodi/kampus saat mahasiswa ikut lomba: dosen pembimbing, bantuan biaya, surat tugas, dan dispensasi kuliah.",
    MB3: "Apakah kegiatan organisasi melatih kepemimpinan, kerja sama, dan pengelolaan acara.",
    BK1: "Ada dosen pembimbing akademik atau layanan konseling yang bisa ditemui ketika Anda punya masalah studi atau pribadi.",
    BK2: "Hal yang Anda ceritakan tidak disebarkan kepada orang lain tanpa izin.",
    BK3: "Setelah konsultasi, masalah Anda menjadi lebih jelas jalan keluarnya.",
    BS1: "Jenis beasiswa, syarat, dan tenggat diumumkan kepada semua mahasiswa dengan waktu persiapan yang cukup.",
    BS2: "Kriteria seleksi jelas dan hasilnya dapat dipertanggungjawabkan.",
    BS3: "Dana beasiswa cair sesuai jadwal dan ada pendampingan/pemantauan penerima.",
    KS1: "Pertolongan pertama dan layanan kesehatan tersedia di kampus atau ada rujukan yang jelas.",
    KR1: "Informasi magang, lowongan, dan sertifikasi kompetensi yang relevan dengan perjalanan wisata disampaikan secara rutin.",
    KR2: "Pelatihan menulis CV, simulasi wawancara, dan etika kerja sebelum magang atau lulus.",
    KR3: "Pendampingan, inkubasi, atau akses modal/pameran untuk usaha mahasiswa.",
    IMP1: "Seberapa penting layanan ini bagi Anda, terlepas dari kondisi saat ini.", IMP2: "Seberapa penting layanan ini bagi Anda, terlepas dari kondisi saat ini.",
    IMP3: "Seberapa penting layanan ini bagi Anda, terlepas dari kondisi saat ini.", IMP4: "Seberapa penting layanan ini bagi Anda, terlepas dari kondisi saat ini.",
    IMP5: "Seberapa penting layanan ini bagi Anda, terlepas dari kondisi saat ini.", OVR1: "Penilaian umum setelah mempertimbangkan semua layanan di atas." },
  dosen: {
    TK1: "Dosen mengetahui arah prodi dan dilibatkan menyusun rencana (rencana strategis, rencana kerja tahunan, rapat).",
    TK2: "Dasar pembagian mata kuliah, tim pengajar, dan tugas tambahan diketahui dan wajar dibanding beban dosen lain.",
    TK3: "Keputusan penting (kurikulum, pembagian tugas, anggaran) diambil melalui rapat dan data, dan hasilnya dapat diakses.",
    TK4: "Masukan dosen didengar dan ditanggapi tanpa rasa sungkan.",
    AD1: "Kecepatan dan kejelasan layanan surat tugas, perjalanan dinas, keuangan, dan kepegawaian.",
    AD2: "Informasi syarat kenaikan jabatan, angka kredit, dan serdos jelas, serta ada pendampingan pengurusan.",
    AD3: "Sistem informasi mudah dipakai, stabil, dan mengurangi pekerjaan administrasi berulang.",
    PP1: "Skema hibah internal, jadwal, dan kriteria seleksi diumumkan dan diproses tepat waktu.",
    PP2: "Bantuan biaya publikasi, pendampingan penulisan, atau akses basis data jurnal.",
    PP3: "Bantuan mencari mitra, menyusun MoU/IA, dan memperoleh izin penelitian/PkM.",
    PD1: "Kesempatan diumumkan terbuka dan dibagi adil antar-dosen.",
    PD2: "Prestasi (publikasi, hibah, penghargaan, kinerja mengajar) diakui dan dihargai.",
    SR1: "Kecukupan ruang dosen, komputer, perangkat lunak, dan peralatan laboratorium/praktik.",
    SK1: "Hubungan antar-dosen dan dengan pimpinan saling menghargai dan mendukung.",
    KJ1: "Kesesuaian honor, tunjangan, dan insentif dengan beban kerja dan prestasi.",
    OVR1: "Penilaian umum setelah mempertimbangkan semua hal di atas." },
  tendik: {
    TK1: "Anda tahu persis tugas, wewenang, dan kepada siapa Anda bertanggung jawab.",
    TK2: "Beban kerja Anda sebanding dengan rekan lain dan masih dapat diselesaikan dalam jam kerja.",
    TK3: "Ada SOP tertulis untuk layanan yang Anda kerjakan, dan semua pihak mematuhinya.",
    PD1: "Kesempatan mengikuti pelatihan teknis, sertifikasi, atau studi lanjut.",
    PD2: "Penilaian kinerja (SKP) dilakukan objektif dan prestasi dihargai.",
    PD3: "Syarat kenaikan pangkat/jabatan jelas dan didukung.",
    SR1: "Komputer, printer, jaringan, dan aplikasi kerja berfungsi baik.",
    SK1: "Koordinasi dan komunikasi dengan pimpinan dan dosen lancar dan saling menghargai.",
    SK2: "Lingkungan kerja nyaman, bebas tekanan yang tidak wajar.",
    KJ1: "Kesesuaian penghasilan dan tunjangan dengan beban kerja.",
    OVR1: "Penilaian umum setelah mempertimbangkan semua hal di atas." },
  mitra: {
    PL1: "Kegiatan yang disepakati benar-benar dilaksanakan sesuai jadwal, jumlah, dan mutu yang dijanjikan.",
    PL2: "Prodi mudah dihubungi, memberi informasi yang jelas, dan cepat menanggapi.",
    PL3: "Keluhan atau masukan lembaga Bapak/Ibu dijawab dan ada perbaikan nyata.",
    KP1: "Sikap kerja, keterampilan teknis, dan kemampuan berbahasa mahasiswa saat magang/praktik di lembaga Bapak/Ibu.",
    KP2: "Profesionalisme dan keahlian dosen yang terlibat dalam kerja sama.",
    MF1: "Contoh: tenaga magang yang membantu operasional, hasil penelitian/PkM yang dipakai, atau calon karyawan yang direkrut.",
    MF2: "Kerja sama menambah eksposur, reputasi, atau jejaring lembaga Bapak/Ibu.",
    OVR1: "Penilaian umum atas seluruh kerja sama dengan Prodi UPW." },
  exit: {
    KU1: "Mata kuliah yang Anda tempuh sesuai dengan pekerjaan di biro perjalanan, OTA, MICE, atau bidang terkait.",
    KU2: "Jumlah dan mutu praktik, kunjungan lapangan, dan magang cukup melatih keterampilan kerja.",
    KU3: "Kemampuan bahasa Inggris dan bahasa asing pilihan cukup untuk melayani tamu.",
    KU4: "Anda terlatih memakai GDS/sistem reservasi, aplikasi, dan pemasaran digital.",
    DS1: "Dosen dan praktisi mengajar dengan contoh nyata dari industri.",
    DS2: "Pembimbing proyek akhir mudah ditemui, memberi masukan jelas, dan tepat waktu.",
    DS3: "Pembimbing kampus dan industri memantau dan membantu Anda selama magang.",
    LY1: "Layanan administrasi akademik (KRS, surat, nilai, yudisium) selama studi.",
    LY2: "Ketersediaan laboratorium, perangkat lunak, dan peralatan praktik.",
    KS1: "Seberapa setuju Anda: Anda yakin mampu bekerja di industri perjalanan wisata sejak hari pertama.",
    KS2: "Seberapa setuju Anda: Anda menguasai kompetensi inti lulusan Prodi UPW.",
    KS3: "Seberapa setuju Anda: sertifikasi BNSP/LSP atau lainnya membantu melamar kerja.",
    OVR1: "Penilaian umum atas seluruh pengalaman studi Anda." },
  kurikulum: {
    RC2: "Apakah CPL keterampilan khusus sudah mencakup pekerjaan inti di industri.",
    RC3: "Kesesuaian dengan unit kompetensi ASEAN MRA-TP (Travel Agencies dan Tour Operation) dan SKKNI.",
    SK1: "Kurikulum vokasi D4 idealnya memiliki porsi praktik yang besar.",
    SK2: "Kemampuan memakai teknologi yang digunakan industri saat ini.",
    SK3: "Materi pariwisata berkelanjutan, ekowisata, CHSE, dan pengelolaan destinasi bertanggung jawab.",
    SK4: "Materi dan praktik menyusun rencana bisnis serta menjalankan usaha perjalanan wisata.",
    KI1: "Industri diminta masukan saat menyusun dan mengevaluasi kurikulum (IAB, lokakarya, survei).",
    KI2: "Keterlibatan praktisi sebagai dosen tamu, tim pengajar, pembimbing magang, dan penguji." }
};
JELAS_TAMBAHAN.edom = JELAS_EDOM;
Object.keys(JELAS_TAMBAHAN).forEach(function (t) {
  (TEMPLAT_SURVEI[t].pertanyaan || []).forEach(function (q) { if (!q.jelas && q.ind && JELAS_TAMBAHAN[t][q.ind]) q.jelas = JELAS_TAMBAHAN[t][q.ind]; });
});
