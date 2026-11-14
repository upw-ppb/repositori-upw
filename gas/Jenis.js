/**
 * Jenis kegiatan, isian tambahan per jenis, dan pasal Global Code of Ethics for Tourism (GCET).
 * Dibuat dari prototipe (prototipe/index.html, JENIS/EXAMPLE/CTH/GCET_KW). Satu sumber: tampilan menerima daftar ini dari server.
 * who: kelompok yang boleh mencatat (mahasiswa | dosen [dosen, tendik, kalab, laboran] | admin [admin, kps, superadmin]).
 */
var JENIS_KEG = [
 {
  "k": "penelitian",
  "l": "Penelitian",
  "t": "Tabel 12 · 13",
  "who": [
   "dosen",
   "admin"
  ],
  "ex": "Contoh: Preferensi wisatawan Eropa terhadap paket wellness di Ubud",
  "bukti": [
   "SK/surat tugas penelitian",
   "Kontrak atau bukti pendanaan",
   "Laporan akhir",
   "Bukti luaran (artikel, HKI)"
  ],
  "cth": [
   "Penelitian hibah internal: preferensi wisatawan Eropa terhadap paket wellness",
   "Penelitian hibah Kemdiktisaintek tentang digitalisasi biro perjalanan",
   "Penelitian kolaborasi dengan universitas luar negeri tentang pariwisata halal"
  ],
  "kw": "riset penelitian hibah survei kuesioner kajian studi",
  "fx": [
   {
    "l": "Sumber dana",
    "t": "sel",
    "o": [
     "PT / mandiri",
     "Dalam negeri (Kemdiktisaintek, BRIN, pemda, industri)",
     "Luar negeri"
    ]
   },
   {
    "l": "Jumlah dana (Rp)",
    "t": "text",
    "ph": "Contoh: 15000000"
   },
   {
    "l": "Topik peta jalan penelitian",
    "t": "text",
    "ph": "Contoh: Pariwisata berkelanjutan dan desa wisata"
   }
  ]
 },
 {
  "k": "pkm",
  "l": "Pengabdian kepada Masyarakat",
  "t": "Tabel 17 · 18",
  "who": [
   "dosen",
   "admin"
  ],
  "ex": "Contoh: Pendampingan paket wisata Desa Wisata Jatiluwih",
  "bukti": [
   "Surat tugas / SK",
   "Surat permohonan atau MoU mitra",
   "Laporan kegiatan",
   "Daftar hadir dan foto"
  ],
  "cth": [
   "Pendampingan pengemasan paket wisata desa wisata",
   "Pelatihan bahasa Inggris untuk pemandu lokal",
   "Pelatihan pemasaran digital untuk UMKM pariwisata"
  ],
  "kw": "pengabdian pkm pendampingan pelatihan masyarakat desa wisata pokdarwis umkm",
  "fx": [
   {
    "l": "Sumber dana",
    "t": "sel",
    "o": [
     "PT / mandiri",
     "Dalam negeri",
     "Luar negeri"
    ]
   },
   {
    "l": "Jumlah dana (Rp)",
    "t": "text",
    "ph": "Contoh: 7500000"
   },
   {
    "l": "Mitra sasaran",
    "t": "text",
    "ph": "Contoh: Pokdarwis Desa Jatiluwih"
   }
  ]
 },
 {
  "k": "publikasi",
  "l": "Publikasi ilmiah",
  "t": "Tabel 14 · 19",
  "who": [
   "dosen",
   "mahasiswa",
   "admin"
  ],
  "ex": "Contoh: Strategi pemasaran digital biro perjalanan pascapandemi",
  "bukti": [
   "Halaman sampul dan daftar isi jurnal/prosiding",
   "Artikel lengkap (PDF)",
   "Tautan DOI atau URL",
   "Sertifikat pemakalah (seminar)"
  ],
  "cth": [
   "Artikel di jurnal nasional terakreditasi SINTA",
   "Makalah di seminar internasional pariwisata",
   "Presentasi poster hasil penelitian di forum nasional"
  ],
  "kw": "jurnal artikel publikasi prosiding seminar konferensi makalah poster",
  "fx": [
   {
    "l": "Kategori publikasi",
    "t": "sel",
    "o": [
     "Jurnal nasional tidak terakreditasi",
     "Jurnal nasional terakreditasi (SINTA)",
     "Jurnal internasional",
     "Jurnal internasional bereputasi (Scopus/WoS)",
     "Seminar wilayah/lokal/PT",
     "Seminar nasional",
     "Seminar internasional",
     "Pagelaran/pameran/presentasi tingkat wilayah",
     "Pagelaran/pameran/presentasi tingkat nasional",
     "Pagelaran/pameran/presentasi tingkat internasional"
    ]
   },
   {
    "l": "Nama jurnal / seminar",
    "t": "text",
    "ph": "Contoh: Jurnal Kepariwisataan Indonesia, Vol. 18 No. 2"
   },
   {
    "l": "DOI / tautan",
    "t": "text",
    "ph": "Contoh: https://doi.org/10.xxxx/xxxx"
   },
   {
    "l": "Jumlah sitasi (Google Scholar)",
    "t": "text",
    "ph": "Contoh: 3"
   },
   {
    "l": "Luaran dari",
    "t": "sel",
    "o": [
     "Penelitian",
     "PkM"
    ]
   }
  ]
 },
 {
  "k": "hki",
  "l": "HKI / Buku / Produk",
  "t": "Tabel 15",
  "who": [
   "dosen",
   "admin"
  ],
  "ex": "Contoh: Hak cipta modul Tour Planning berbasis Desa Wisata",
  "bukti": [
   "Sertifikat HKI / ISBN",
   "Halaman sampul buku",
   "Bukti penerapan di masyarakat/industri"
  ],
  "cth": [
   "Hak cipta modul ajar Tour Planning",
   "Buku ajar ber-ISBN tentang ticketing",
   "Aplikasi itinerary yang didaftarkan hak ciptanya"
  ],
  "kw": "hki hak cipta paten buku isbn modul book chapter desain",
  "fx": [
   {
    "l": "Jenis",
    "t": "sel",
    "o": [
     "Paten / paten sederhana",
     "Hak cipta",
     "Desain produk industri",
     "Teknologi tepat guna",
     "Produk terstandar/tersertifikasi",
     "Rekayasa sosial",
     "Buku ber-ISBN",
     "Book chapter"
    ]
   },
   {
    "l": "Nomor sertifikat / ISBN",
    "t": "text",
    "ph": "Contoh: EC002026012345"
   }
  ]
 },
 {
  "k": "kerjasama",
  "l": "Kerja sama",
  "t": "Tabel 20",
  "who": [
   "dosen",
   "admin"
  ],
  "ex": "Contoh: MoA praktik kerja dengan PT Bali Tour Nusantara",
  "bukti": [
   "Dokumen MoU/MoA/IA bertanda tangan",
   "Bukti pelaksanaan (laporan, foto, daftar hadir)",
   "Hasil survei kepuasan mitra"
  ],
  "cth": [
   "MoU dengan biro perjalanan untuk magang mahasiswa",
   "MoA penelitian bersama dinas pariwisata",
   "Kerja sama internasional dengan kampus pariwisata di luar negeri"
  ],
  "kw": "mou moa kerja sama kerjasama mitra perjanjian ia",
  "fx": [
   {
    "l": "Bidang",
    "t": "sel",
    "o": [
     "Pendidikan",
     "Penelitian",
     "PkM"
    ]
   },
   {
    "l": "Nama mitra",
    "t": "text",
    "ph": "Contoh: PT Bali Tour Nusantara"
   },
   {
    "l": "Masa berlaku",
    "t": "text",
    "ph": "Contoh: 1 Agustus 2026 – 31 Juli 2029"
   }
  ]
 },
 {
  "k": "rekognisi",
  "l": "Rekognisi dosen",
  "t": "Tabel 23",
  "who": [
   "dosen",
   "admin"
  ],
  "ex": "Contoh: Narasumber Kemenpar tentang standar biro perjalanan wisata",
  "bukti": [
   "Surat undangan / SK",
   "Sertifikat atau piagam",
   "Foto kegiatan"
  ],
  "cth": [
   "Dosen menjadi narasumber Kemenpar",
   "Dosen menjadi reviewer jurnal terakreditasi",
   "Dosen menjadi visiting lecturer di kampus luar negeri, atau juri lomba nasional"
  ],
  "kw": "narasumber pembicara keynote reviewer editor juri penghargaan visiting lecturer asesor konsultan",
  "fx": [
   {
    "l": "Bentuk rekognisi",
    "t": "sel",
    "o": [
     "Visiting lecturer / scholar",
     "Keynote / invited speaker",
     "Editor / mitra bestari jurnal",
     "Staf ahli / narasumber / konsultan",
     "Penghargaan prestasi"
    ]
   }
  ]
 },
 {
  "k": "prestasi_a",
  "l": "Prestasi akademik / lomba",
  "t": "Tabel 7a",
  "who": [
   "mahasiswa",
   "dosen",
   "admin"
  ],
  "ex": "Contoh: Juara 1 Lomba Karya Tulis Pariwisata Berkelanjutan, Kemenpar 2026",
  "bukti": [
   "Sertifikat atau piagam juara",
   "Surat tugas dari prodi",
   "Foto penyerahan"
  ],
  "cth": [
   "Juara lomba karya tulis ilmiah pariwisata",
   "Finalis kompetisi business plan perjalanan wisata",
   "Juara debat bahasa Inggris tingkat nasional"
  ],
  "kw": "lomba juara kompetisi karya tulis debat olimpiade akademik",
  "fx": [
   {
    "l": "Capaian",
    "t": "sel",
    "o": [
     "Juara 1",
     "Juara 2",
     "Juara 3",
     "Juara harapan / finalis",
     "Peserta terpilih"
    ]
   }
  ]
 },
 {
  "k": "prestasi_n",
  "l": "Prestasi non-akademik / lomba",
  "t": "Tabel 7b",
  "who": [
   "mahasiswa",
   "dosen",
   "admin"
  ],
  "ex": "Contoh: Juara 2 Lomba Tour Package Design, ASTINDO Bali 2026",
  "bukti": [
   "Sertifikat atau piagam juara",
   "Surat tugas dari prodi",
   "Foto penyerahan"
  ],
  "cth": [
   "Juara lomba tour package design",
   "Juara lomba pemandu wisata (guiding competition)",
   "Juara seni, olahraga, atau duta wisata"
  ],
  "kw": "lomba juara kompetisi seni olahraga duta wisata guiding nonakademik",
  "fx": [
   {
    "l": "Capaian",
    "t": "sel",
    "o": [
     "Juara 1",
     "Juara 2",
     "Juara 3",
     "Juara harapan / finalis",
     "Peserta terpilih"
    ]
   }
  ]
 },
 {
  "k": "sertifikasi",
  "l": "Sertifikasi kompetensi",
  "t": "DED butir 19",
  "who": [
   "mahasiswa",
   "admin"
  ],
  "ex": "Contoh: Sertifikasi BNSP skema Pemandu Wisata",
  "bukti": [
   "Sertifikat kompetensi",
   "Nomor registrasi BNSP/LSP"
  ],
  "cth": [
   "Sertifikat BNSP Pemandu Wisata",
   "Sertifikat Amadeus atau GDS lain",
   "Sertifikat TOEIC atau IELTS"
  ],
  "kw": "sertifikat sertifikasi bnsp lsp kompetensi toeic ielts amadeus",
  "fx": [
   {
    "l": "Lembaga penerbit",
    "t": "text",
    "ph": "Contoh: LSP Pariwisata Indonesia (BNSP)"
   },
   {
    "l": "Nomor sertifikat",
    "t": "text",
    "ph": "Contoh: 79300 2433 2 0001234 2026"
   }
  ]
 },
 {
  "k": "suasana",
  "l": "Kuliah umum / seminar / himpunan",
  "t": "DED butir 46",
  "who": [
   "mahasiswa",
   "dosen",
   "admin"
  ],
  "ex": "Contoh: Kuliah umum \"Tren MICE Asia Pasifik 2027\" bersama praktisi",
  "bukti": [
   "Poster atau undangan",
   "Daftar hadir",
   "Foto atau rekaman",
   "Notulen / materi"
  ],
  "cth": [
   "Kuliah umum / studium generale terbuka untuk seluruh mahasiswa (bukan bagian jadwal satu mata kuliah)",
   "Seminar, webinar, atau bedah buku pariwisata",
   "Kegiatan himpunan mahasiswa (HIMA) UPW yang bersifat ilmiah"
  ],
  "kw": "kuliah umum studium generale seminar webinar bedah buku hima himpunan talkshow diskusi",
  "fx": [
   {
    "l": "Bentuk",
    "t": "sel",
    "o": [
     "Kuliah umum / studium generale",
     "Seminar ilmiah",
     "Bedah buku",
     "Kegiatan himpunan mahasiswa"
    ]
   }
  ]
 },
 {
  "k": "iab",
  "l": "Rapat Industry Advisory Board",
  "t": "DED butir 3",
  "who": [
   "admin"
  ],
  "ex": "Contoh: Rapat Industry Advisory Board 2026",
  "bukti": [
   "SK anggota IAB",
   "Kerangka acuan (TOR)",
   "Undangan, daftar hadir, notulen"
  ],
  "cth": [
   "Rapat tahunan Industry Advisory Board",
   "Diskusi kurikulum bersama anggota IAB",
   "Penetapan SK anggota IAB"
  ],
  "kw": "industry advisory board iab dewan penasihat industri",
  "fx": []
 },
 {
  "k": "ppepp",
  "l": "Siklus mutu (PPEPP / audit)",
  "t": "DED butir 1–2",
  "who": [
   "admin"
  ],
  "ex": "Contoh: Audit Mutu Internal semester genap 2025/2026",
  "bukti": [
   "Laporan AMI",
   "Daftar temuan dan tindak lanjut",
   "Notulen rapat tinjauan manajemen"
  ],
  "cth": [
   "Audit mutu internal (AMI)",
   "Rapat tinjauan manajemen (RTM)",
   "Penetapan atau revisi standar SPMI"
  ],
  "kw": "audit ami rtm tinjauan manajemen spmi mutu standar ppepp",
  "fx": [
   {
    "l": "Tahap PPEPP",
    "t": "sel",
    "o": [
     "Penetapan",
     "Pelaksanaan",
     "Evaluasi",
     "Pengendalian",
     "Peningkatan"
    ]
   }
  ]
 },
 {
  "k": "praktik",
  "l": "Praktik lapangan / kunjungan industri",
  "t": "DED butir 13",
  "who": [
   "dosen",
   "admin"
  ],
  "ex": "Contoh: Praktik pemanduan wisata di Desa Wisata Penglipuran",
  "bukti": [
   "Rencana praktik dan jadwal",
   "MoU/MoA dengan lokasi praktik",
   "Laporan dan foto"
  ],
  "cth": [
   "Praktik pemanduan di desa wisata mitra",
   "Kunjungan industri ke biro perjalanan atau maskapai",
   "Praktik tour leader membawa rombongan"
  ],
  "kw": "praktik lapangan kunjungan industri field trip study tour tour leader pemanduan",
  "fx": [
   {
    "l": "Mata kuliah terkait",
    "t": "text",
    "ph": "Contoh: Guiding Technique"
   }
  ]
 },
 {
  "k": "pengembangan",
  "l": "Pengembangan dosen (pelatihan, studi lanjut, magang industri)",
  "t": "DED butir 22",
  "who": [
   "dosen",
   "admin"
  ],
  "ex": "Contoh: Pelatihan Amadeus GDS tingkat lanjut",
  "bukti": [
   "Sertifikat pelatihan",
   "Surat tugas",
   "Bukti keterkaitan dengan Renstra SDM"
  ],
  "cth": [
   "Pelatihan Amadeus GDS untuk dosen",
   "Studi lanjut S3",
   "Magang dosen di industri perjalanan"
  ],
  "kw": "pelatihan dosen workshop studi lanjut s3 magang dosen pengembangan diri",
  "fx": [
   {
    "l": "Jenis",
    "t": "sel",
    "o": [
     "Pelatihan / workshop",
     "Studi lanjut",
     "Magang dosen di industri",
     "Sertifikasi kompetensi",
     "Seminar / konferensi"
    ]
   }
  ]
 },
 {
  "k": "bimbingan",
  "l": "Bimbingan tugas akhir",
  "t": "Tabel 5",
  "who": [
   "dosen",
   "admin"
  ],
  "ex": "Contoh: Pembimbing utama TA a.n. Kadek Ayu Lestari",
  "bukti": [
   "SK pembimbing"
  ],
  "cth": [
   "Pembimbing utama tugas akhir",
   "Pembimbing pendamping tugas akhir",
   "Pembimbing tugas akhir mahasiswa prodi lain"
  ],
  "kw": "bimbingan pembimbing tugas akhir skripsi ta",
  "fx": [
   {
    "l": "Prodi mahasiswa",
    "t": "sel",
    "o": [
     "Prodi UPW",
     "Prodi lain di Poltekpar Bali"
    ]
   },
   {
    "l": "Peran",
    "t": "sel",
    "o": [
     "Pembimbing utama",
     "Pembimbing pendamping"
    ]
   },
   {
    "l": "Jumlah mahasiswa (prodi lain)",
    "t": "text",
    "ph": "Isi angka bila mahasiswa dari prodi lain (tidak ditandai), contoh: 3"
   }
  ]
 },
 {
  "k": "produk",
  "l": "Produk/jasa mahasiswa diadopsi industri/masyarakat",
  "t": "Tabel 15",
  "who": [
   "mahasiswa",
   "dosen",
   "admin"
  ],
  "ex": "Contoh: Paket wisata \"Subak Heritage Trail\" dipakai PT Bali Tour Nusantara",
  "bukti": [
   "Surat keterangan adopsi dari mitra",
   "Dokumen produk (itinerary, brosur)",
   "Foto pelaksanaan"
  ],
  "cth": [
   "Paket wisata rancangan mahasiswa dijual biro perjalanan",
   "Itinerary desa wisata karya mahasiswa dipakai pokdarwis",
   "Konten promosi digital karya mahasiswa dipakai dinas pariwisata"
  ],
  "kw": "produk jasa paket wisata itinerary diadopsi dipakai dijual karya mahasiswa",
  "fx": [
   {
    "l": "Pengadopsi",
    "t": "text",
    "ph": "Contoh: PT Bali Tour Nusantara"
   }
  ]
 },
 {
  "k": "kepakaran",
  "l": "Layanan kepakaran prodi",
  "t": "DED butir 40",
  "who": [
   "dosen",
   "admin"
  ],
  "ex": "Contoh: Pelatihan pemandu lokal untuk Dinas Pariwisata Karangasem",
  "bukti": [
   "Surat permintaan dari lembaga",
   "Surat tugas",
   "Laporan"
  ],
  "cth": [
   "Pelatihan pemandu lokal untuk dinas pariwisata",
   "Konsultansi penyusunan paket wisata untuk pemda",
   "Prodi menjadi TUK/LSP untuk sertifikasi pihak luar"
  ],
  "kw": "konsultansi layanan kepakaran pelatihan pemda tuk lsp jasa keahlian",
  "fx": [
   {
    "l": "Lembaga penerima",
    "t": "text",
    "ph": "Contoh: Dinas Pariwisata Kabupaten Karangasem"
   }
  ]
 },
 {
  "k": "mbkm",
  "l": "Magang / MBKM / belajar di luar prodi",
  "t": "DED butir 6",
  "who": [
   "mahasiswa",
   "admin"
  ],
  "ex": "Contoh: Magang 1 semester di Kementerian Pariwisata",
  "bukti": [
   "Surat penerimaan magang",
   "Laporan magang",
   "Konversi nilai / transkrip"
  ],
  "cth": [
   "Magang 1 semester di biro perjalanan",
   "Magang di Kementerian Pariwisata",
   "Pertukaran pelajar atau studi independen"
  ],
  "kw": "magang mbkm kampus merdeka pertukaran pelajar studi independen pkl praktik kerja",
  "fx": [
   {
    "l": "Jenis",
    "t": "sel",
    "o": [
     "Magang industri",
     "Magang kementerian/lembaga",
     "Pertukaran pelajar",
     "Studi independen",
     "Kewirausahaan"
    ]
   },
   {
    "l": "Jumlah sks diakui",
    "t": "text",
    "ph": "Contoh: 20"
   }
  ]
 },
 {
  "k": "kurikulum",
  "l": "Lokakarya / evaluasi kurikulum",
  "t": "DED butir 7",
  "who": [
   "admin"
  ],
  "ex": "Contoh: Lokakarya evaluasi kurikulum UPW bersama ASITA dan alumni",
  "bukti": [
   "Undangan dan daftar hadir",
   "Notulen",
   "Dokumen kurikulum hasil revisi"
  ],
  "cth": [
   "Lokakarya evaluasi kurikulum bersama industri dan alumni",
   "Review kurikulum oleh pakar dan asosiasi (ASITA, ASTINDO)",
   "Penyusunan peta CPL–mata kuliah"
  ],
  "kw": "kurikulum lokakarya evaluasi kurikulum cpl obe review",
  "fx": []
 },
 {
  "k": "layanan",
  "l": "Layanan kemahasiswaan (konseling, karier, kewirausahaan)",
  "t": "DED butir 48",
  "who": [
   "dosen",
   "admin"
  ],
  "ex": "Contoh: Bimbingan karier dan bursa kerja industri perjalanan",
  "bukti": [
   "Jadwal layanan",
   "Daftar peserta",
   "Laporan"
  ],
  "cth": [
   "Bimbingan karier dan bursa kerja",
   "Layanan konseling mahasiswa",
   "Inkubator bisnis atau pelatihan kewirausahaan"
  ],
  "kw": "karier bursa kerja konseling beasiswa kesehatan kewirausahaan inkubator",
  "fx": [
   {
    "l": "Bidang",
    "t": "sel",
    "o": [
     "Penalaran",
     "Minat dan bakat",
     "Bimbingan dan konseling",
     "Beasiswa",
     "Kesehatan",
     "Karier",
     "Kewirausahaan / inkubator bisnis"
    ]
   }
  ]
 },
 {
  "k": "benchmark",
  "l": "Benchmarking / studi banding",
  "t": "DED butir 1",
  "who": [
   "admin"
  ],
  "ex": "Contoh: Studi banding ke prodi pariwisata terakreditasi Unggul",
  "bukti": [
   "Surat tugas",
   "Laporan dan rekomendasi",
   "Tindak lanjut yang diterapkan"
  ],
  "cth": [
   "Studi banding ke prodi pariwisata terakreditasi Unggul",
   "Benchmarking kurikulum dengan kampus luar negeri",
   "Kunjungan benchmarking SPMI"
  ],
  "kw": "benchmark benchmarking studi banding",
  "fx": []
 },
 {
  "k": "kuliahtamu",
  "l": "Kuliah tamu dalam mata kuliah (narasumber praktisi/pejabat)",
  "t": "Butir 22 · IBE",
  "who": [
   "dosen",
   "admin"
  ],
  "ex": "Contoh: Kuliah tamu Kepala Kantor Imigrasi Bali: kebijakan visa dan izin tinggal wisatawan mancanegara",
  "bukti": [
   "Surat undangan atau surat tugas narasumber",
   "Daftar hadir mahasiswa",
   "Materi presentasi narasumber",
   "Foto atau rekaman sesi"
  ],
  "cth": [
   "Kuliah tamu praktisi biro perjalanan dalam mata kuliah Tour Planning",
   "Kuliah tamu pejabat imigrasi dalam mata kuliah Ticketing",
   "Narasumber maskapai untuk satu pertemuan mata kuliah"
  ],
  "kw": "kuliah tamu dosen tamu narasumber praktisi guest lecture",
  "fx": [
   {
    "l": "Mata kuliah terkait",
    "t": "text",
    "ph": "Contoh: UPW202 Ticketing"
   },
   {
    "l": "Nama dan jabatan narasumber",
    "t": "text",
    "ph": "Contoh: Kepala Kantor Imigrasi Kelas I TPI Denpasar"
   },
   {
    "l": "Instansi / perusahaan",
    "t": "text",
    "ph": "Contoh: Direktorat Jenderal Imigrasi"
   },
   {
    "l": "Topik",
    "t": "text",
    "ph": "Contoh: Kebijakan visa on arrival dan izin tinggal wisatawan"
   }
  ]
 },
 {
  "k": "lainnya",
  "l": "Lainnya (belum ada di daftar)…",
  "t": "Dipetakan Admin",
  "who": [
   "mahasiswa",
   "dosen",
   "admin"
  ],
  "ex": "Contoh: Famtrip bersama ASITA Bali",
  "bukti": [
   "Surat tugas atau undangan",
   "Laporan atau dokumentasi"
  ],
  "cth": [
   "Famtrip bersama asosiasi",
   "Kegiatan sosial prodi",
   "Kegiatan lain yang belum ada jenisnya"
  ],
  "kw": "lainnya famtrip",
  "fx": [
   {
    "l": "Sebutkan jenis kegiatannya",
    "t": "text",
    "ph": "Contoh: Familiarization trip"
   }
  ]
 }
];
var GCET = ["1. Pariwisata untuk saling pengertian dan penghormatan antarbangsa","2. Pariwisata sebagai sarana pemenuhan diri individu dan kolektif","3. Pariwisata sebagai faktor pembangunan berkelanjutan","4. Pariwisata yang memanfaatkan dan melestarikan warisan budaya","5. Pariwisata yang bermanfaat bagi masyarakat tuan rumah","6. Kewajiban para pemangku kepentingan pariwisata","7. Hak atas pariwisata","8. Kebebasan pergerakan wisatawan","9. Hak pekerja dan pengusaha di industri pariwisata","10. Penerapan prinsip-prinsip Kode Etik"];
var GCET_KW = {"1":["budaya","lintas budaya","toleransi","antarbangsa","internasional","wisatawan asing","multikultural","bahasa","pemanduan","pemandu","guiding","hospitality","wisatawan mancanegara","pertukaran","exchange","toleran","antarbudaya","bahasa asing"],"2":["pendidikan","edukasi","pelatihan","wellness","rekreasi","pengembangan diri","pembelajaran","kuliah","seminar","workshop","webinar","studi","kunjungan","ekskursi","edukatif","field trip","outing","kuliah tamu","praktik","pengalaman"],"3":["berkelanjutan","sustainable","lingkungan","hijau","green","ekowisata","sampah","konservasi","sdg","iklim","karbon","subak","alam","ramah lingkungan","daur ulang","penghijauan","mangrove","pantai","bersih","limbah","plastik","energi"],"4":["warisan","heritage","budaya","cagar","pura","museum","tradisi","adat","sejarah","tari","kerajinan","kebudayaan","kesenian","seni","festival","upacara","kuliner","arsitektur","situs"],"5":["desa wisata","masyarakat","pokdarwis","umkm","pemberdayaan","community","cbt","lokal","pengabdian","pendampingan","ekonomi","kampung","warga","kearifan lokal","homestay","ukm","usaha kecil","pengabdian masyarakat","kkn"],"6":["regulasi","standar","hukum","kebijakan","keselamatan","asuransi","perlindungan konsumen","biro perjalanan","itinerary","tanggung jawab","izin","informasi wisatawan","tour","paket wisata","travel","agen perjalanan","tour operator","pemasaran","promosi","kontrak","pelayanan","mice","event","pameran","perjalanan wisata"],"7":["aksesibel","disabilitas","inklusif","lansia","difabel","ramah","semua kalangan","wisata sosial","keluarga","pelajar","anak","murah","terjangkau"],"8":["visa","imigrasi","ticketing","reservasi","transportasi","bandara","maskapai","mobilitas","paspor","gds","amadeus","perjalanan","tiket","penerbangan","kereta","transport","bagasi","dokumen perjalanan"],"9":["pekerja","tenaga kerja","karier","kompetensi","sertifikasi","magang","bursa kerja","k3","profesi","bnsp","pkl","kerja","rekrutmen","uji kompetensi","lsp","industri","kewirausahaan","wirausaha","lomba","kompetisi"],"10":["kode etik","code of ethics","gcet","unwto","etika pariwisata","etika","ethics","integritas"]};
var TINGKAT = ["Lokal/Wilayah", "Nasional", "Internasional"];
/** Jenis yang biasanya tidak memerlukan surat tugas (kotak "Ajukan surat tugas" tidak dicentang otomatis). */
var TANPA_ST = ["publikasi", "hki", "bimbingan", "sertifikasi"];
