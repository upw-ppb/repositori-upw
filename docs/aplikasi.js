/* Repositori Akreditasi UPW — tampilan (tanpa proses build). Berbicara dengan server Apps Script lewat api(). */
(function () {
"use strict";
const K = window.UPW_KONFIG;
const PERAN_L = { superadmin: "Super Admin", admin: "Admin Prodi", kps: "Koordinator Program Studi", kalab: "Kepala Laboratorium",
  laboran: "Laboran", dosen: "Dosen", tendik: "Tendik", mahasiswa: "Mahasiswa", asesor: "Asesor" };

/* ---------- penyimpanan lokal (aman bila diblokir) ---------- */
const ls = {
  get(k) { try { return localStorage.getItem(K.kunciPenyimpanan + ":" + k); } catch (_) { return null; } },
  set(k, v) { try { v == null ? localStorage.removeItem(K.kunciPenyimpanan + ":" + k) : localStorage.setItem(K.kunciPenyimpanan + ":" + k, v); } catch (_) {} }
};

const S = { token: ls.get("token"), pengguna: null, peran: ls.get("peran"), view: "beranda", sibuk: false,
  akt: { langkah: 1, email: "", kodeUji: "" }, lupa: { langkah: 1, email: "", kodeUji: "" }, layar: "masuk",
  daftar: null, cari: "", impor: { teks: "", hasil: null }, log: null, laci: null, galat: "",
  bio: null, wil: null, dir: null, dirTab: "pegawai", dirQ: "", dirAngk: "", dirKelas: "",
  ref: null, keg: null, kegLingkup: "saya", kegQ: "", antrean: null, form: null, formSt: "", cek: { kode: "", hasil: null },
  tugas: null, verif: null, ttd: null, ttdTab: "gambar", ttdTmp: null, ttdSurat: {}, porto: null, dokForm: null, ilkps: null, ilkpsTab: "1", ilkpsTs: null, bukaSetelahMasuk: null,
  dp: null, dpTab: "kurikulum", dpSmt: null, dpTa: null, dpImpor: false, asesor: null, setuju: null, setujuQ: "", lul: null, lulTa: null, lulImpor: false,
  sv: null, svForm: null, svSaya: null, svPub: null, nilai: null, nilaiTs: null, nilaiF: "", ded: null, dedTab: "narasi", dedF: "" };
/** Keadaan awal; dipakai untuk membersihkan SEMUA data saat keluar/sesi berakhir agar akun berikutnya tidak melihat data akun sebelumnya (v0.15.0). */
const S_AWAL = JSON.stringify(S), TETAP_S = ["token", "peran", "layar", "akt", "lupa", "cek"];
function bersihkanData() {
  const awal = JSON.parse(S_AWAL);
  Object.keys(S).forEach(k => { if (TETAP_S.includes(k)) return; if (k in awal) S[k] = awal[k]; else delete S[k]; });
}
const STATUS_MHS = { A: "Aktif", C: "Cuti", N: "Non-aktif", L: "Lulus", D: "Drop out / dikeluarkan", K: "Mengundurkan diri / keluar", M: "Mutasi / pindah", W: "Wafat" };

/* ---------- server ---------- */
async function api(aksi, data) {
  let r;
  try {
    r = await fetch(K.api, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ aksi, token: S.token || "", data: data || {} }) });
  } catch (_) { throw new Error("Tidak dapat terhubung ke server. Periksa koneksi internet Anda."); }
  let j;
  try { j = await r.json(); } catch (_) { throw new Error("Jawaban server tidak terbaca. Coba lagi."); }
  if (!j.ok) {
    if (/Sesi berakhir/.test(j.galat || "")) { aturToken(null); bersihkanData(); S.layar = "masuk"; }
    throw new Error(j.galat || "Terjadi kesalahan.");
  }
  return j;
}
/** Label versi: "Uji Coba v…" di Uji Coba, "v…" di Produksi (v0.15.1). */
const LABEL_VERSI = (K.lingkungan === "uji" ? "Uji Coba v" : "v") + K.versi;
function aturToken(t) { S.token = t; ls.set("token", t); if (!t) ls.set("profil", null); }

/* ---------- utilitas ---------- */
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const $ = id => document.getElementById(id);
let tt;
function toast(m) { const el = $("toast"); el.textContent = m; el.hidden = false; clearTimeout(tt); tt = setTimeout(() => el.hidden = true, 3200); }
const tgl = s => s ? new Date(s).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "–";
const I = {
  beranda: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>',
  pengguna: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c1-3.5 3.6-5.5 7-5.5s6 2 7 5.5"/><path d="M16 4.5a3.5 3.5 0 010 7M19 14.8c1.5.9 2.5 2.6 3 5.2"/>',
  log: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  akun: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  biodata: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="11" r="2.5"/><path d="M5.5 17c.7-1.8 2-2.7 3.5-2.7s2.8.9 3.5 2.7M15 9h3M15 13h3"/>',
  cari: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  kegiatan: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M8 14h3M8 17h6"/>',
  kps: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9"/>',
  keluar: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/>',
  verif: '<path d="M9 12l2 2 4-4"/><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>',
  ttd: '<path d="M3 17c3-1 4-7 6-7s1 6 3 6 2-4 4-4 2 3 5 3"/><path d="M3 21h18"/>',
  porto: '<path d="M4 7h16v13H4z"/><path d="M9 7V4h6v3"/><path d="M4 12h16"/>',
  ilkps: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14h18M9 4v16"/>',
  dprodi: '<path d="M3 21h18M5 21V9l7-5 7 5v12"/><path d="M9 21v-6h6v6"/>',
  setuju: '<path d="M9 12l2 2 4-4"/><rect x="3" y="4" width="18" height="16" rx="2"/>',
  survei: '<path d="M9 5h10M9 12h10M9 19h10"/><path d="M4 5l1 1 2-2M4 12l1 1 2-2M4 19l1 1 2-2"/>',
  penilaian: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  ded: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h7M9 16h7"/>',
  mk: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7M8 11h7"/>',
  bank: '<path d="M3 7l9-4 9 4"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18"/>',
  versi: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  lab: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3"/><path d="M7.5 15h9"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  masukan: '<path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/>',
  data: '<ellipse cx="12" cy="5.5" rx="7.5" ry="2.8"/><path d="M4.5 5.5v6.5c0 1.6 3.4 2.8 7.5 2.8s7.5-1.2 7.5-2.8V5.5"/><path d="M4.5 12v6.5c0 1.6 3.4 2.8 7.5 2.8s7.5-1.2 7.5-2.8V12"/>'
};
const ic = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;
const MENU_L = { beranda: "Beranda", kegiatan: "Kegiatan", kps: "Antrean KPS", verif: "Verifikasi", ttd: "Tanda Tangan", porto: "Portofolio", ilkps: "Tabel iLKPS", dprodi: "Data Prodi", setuju: "Kegiatan disetujui", survei: "Survei", penilaian: "Penilaian", ded: "DED", mk: "Mata Kuliah Saya", bank: "Bank Dokumen", versi: "Riwayat Versi", lab: "Laboratorium", masukan: "Masukan", data: "Data Terkumpul", biodata: "Biodata", cari: "Cari orang", pengguna: "Pengguna", log: "Log aktivitas", akun: "Akun saya" };

function peranAktif() {
  const r = S.pengguna ? S.pengguna.peran : [];
  if (!r.includes(S.peran)) S.peran = r[0];
  return S.peran;
}
function menu() {
  const p = peranAktif(), u = S.pengguna;
  if (u.perluBiodata) return ["biodata", "akun"];
  if (p === "asesor") return ["beranda", "ilkps", "setuju", "bank", "cari", "akun"];
  const m = ["beranda"];
  if (PERAN_KEG.includes(p)) m.push("kegiatan");
  if (u.peran.some(r => PERAN_KEG.includes(r))) m.push("porto");
  if (u.peran.includes("dosen")) m.push("mk");
  if (["admin", "superadmin", "kps"].includes(p)) m.push("penilaian", "ded", "bank", "ilkps", "dprodi", "survei");
  if (p === "superadmin") m.push("data"); // v0.24.0: Data Terkumpul
  else { if (S.tugas && S.tugas.dedPj) m.push("ded"); if (S.tugas && S.tugas.bankPj) m.push("bank"); }
  // Menu mengikuti PERAN AKTIF (v0.17.0): KPS yang memilih peran Dosen melihat menu seperti dosen lain.
  if (p === "kps") m.push("kps");
  if (["admin", "superadmin", "kps", "dosen"].includes(p)) m.push("verif"); // dosen: sebagai pendamping lomba
  if (p === "kps" || (p === "dosen" && u.bolehTtd && !u.peran.includes("kps"))) m.push("ttd"); // KPS berperan Dosen: menu seperti dosen lain
  if (["kalab", "laboran", "admin", "superadmin", "kps"].includes(p)) m.push("lab");
  if (u.jenisBiodata) m.push("biodata");
  m.push("cari");
  if (p === "superadmin" || p === "admin") m.push("pengguna");
  if (p === "superadmin" || p === "admin") m.push("masukan");
  if (p === "superadmin") m.push("log", "versi");
  m.push("akun");
  return m;
}

/* ---------- render ---------- */
const app = $("app");
function render() {
  // Simpan posisi gulir laci, agar menggambar ulang (misalnya setelah mencentang kelas) tidak melompat ke atas.
  const lama = document.querySelector(".drawer"), gulir = lama ? lama.scrollTop : 0;
  gambar();
  const baru = document.querySelector(".drawer"); if (baru && gulir) baru.scrollTop = gulir;
  pasangLihatSandi();
  // Simpan profil terakhir agar muat ulang berikutnya langsung tampil (v0.21.0); diperiksa ulang ke server di belakang.
  try { if (S.token && S.pengguna) { const v = JSON.stringify(S.pengguna); if (v !== simpanProfilTerakhir) { ls.set("profil", v); simpanProfilTerakhir = v; } } } catch (_) {}
}
let simpanProfilTerakhir = "";
const MATA_BUKA = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const MATA_TUTUP = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.7-1.3"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
/** Tombol mata di setiap kolom kata sandi (v0.17.0; ikon sejak v0.22.0). */
function pasangLihatSandi() {
  document.querySelectorAll('input[type="password"]:not([data-lihat])').forEach(el => {
    el.dataset.lihat = "1";
    const bungkus = document.createElement("div"); bungkus.className = "sandi-bungkus";
    el.parentNode.insertBefore(bungkus, el); bungkus.appendChild(el);
    const b = document.createElement("button"); b.type = "button"; b.className = "sandi-lihat"; b.innerHTML = MATA_BUKA; b.title = "Tampilkan kata sandi";
    b.setAttribute("aria-label", "Tampilkan kata sandi"); b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => { const buka = el.type === "password"; el.type = buka ? "text" : "password"; b.innerHTML = buka ? MATA_TUTUP : MATA_BUKA; b.title = buka ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"; b.setAttribute("aria-pressed", String(buka)); b.setAttribute("aria-label", b.title); el.focus(); });
    bungkus.appendChild(b);
  });
}
function gambar() {
  if (S.layar === "survei") { app.innerHTML = layarSurveiPublik(); return; }
  if (!S.pengguna) { app.innerHTML = S.layar === "cek" ? layarCek() : S.layar === "lupa" ? layarLupa() : layarMasuk(); return; }
  if (S.pengguna.perluAktivasi) { app.innerHTML = layarAktivasi(); return; }
  if (S.pengguna.wajibGanti) { app.innerHTML = layarGanti(); return; }
  if (S.pengguna.perluVerifikasiEmail) { app.innerHTML = layarVerifEmail(); return; }
  const m = menu(); if (!m.includes(S.view) && S.view !== "info") S.view = m[0];
  if (S.view !== "info") S.viewTerakhir = S.view; // untuk mengisi "Bagian aplikasi" pada formulir masukan
  const u = S.pengguna, p = peranAktif();
  if (!S.tugas && !u.perluBiodata) muatTugas();
  muatFotoSaya();
  if (!S.svSaya && !u.perluBiodata && !u.wajibGanti && p !== "asesor") sekali("svSaya", async () => { S.svSaya = (await api("survei.saya")).survei; render(); });
  if (S.bukaSetelahMasuk && !u.perluBiodata) { const id = S.bukaSetelahMasuk; S.bukaSetelahMasuk = null; setTimeout(() => AKSI.bukaKeg({ id }), 0); }
  app.innerHTML = `<div class="shell">
   <aside class="side"><div class="brand"><img src="logo.png" alt="Logo Politeknik Pariwisata Bali"><div><b>Repositori UPW</b><span>Akreditasi LAMWisata</span></div></div>
    <nav class="nav" aria-label="Menu utama">${m.map(v => `<button data-go="${v}" ${S.view === v ? 'aria-current="page"' : ""}>${ic(v)}<span>${MENU_L[v]}</span>${lencana(v)}</button>`).join("")}</nav>
    <div class="who" style="cursor:pointer" data-go="akun" title="Akun saya">${avatar(S.fotoSaya && S.fotoSaya.kecil, u.nama)}<div style="min-width:0"><div class="small" style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(u.nama)}</div><div class="small muted">${esc(PERAN_L[p])}</div></div></div></aside>
   <div class="main"><header class="top"><div class="brand-m"><img src="logo.png" alt=""><b>Repositori UPW</b></div>
    <span class="ta">${LABEL_VERSI}</span><span class="spacer"></span>
    ${u.peran.length > 1 ? `<label class="row small" style="gap:6px"><span class="muted">Peran</span><select id="peranSel" aria-label="Peran aktif" style="width:auto">${u.peran.map(r => `<option value="${r}" ${r === p ? "selected" : ""}>${PERAN_L[r]}</option>`).join("")}</select></label>` : ""}
    <button class="iconbtn" data-go="info" aria-label="Info dan panduan" title="Info dan panduan" ${S.view === "info" ? 'aria-current="page"' : ""}>${ic("info")}</button>
    <button class="iconbtn" data-act="keluar" aria-label="Keluar" title="Keluar">${ic("keluar")}</button></header>
    <main class="content">${halaman()}</main></div></div>
   <nav class="tabbar" aria-label="Menu">${m.map(v => `<button data-go="${v}" ${S.view === v ? 'aria-current="page"' : ""}>${ic(v)}<span>${MENU_L[v]}</span>${lencana(v)}</button>`).join("")}</nav>
   ${S.laci ? laci() : ""}`;
}
/** Angka kecil di menu: hal yang menunggu tindakan. */
function lencana(v) {
  const t = S.tugas; if (!t) return "";
  const n = v === "beranda" ? t.tugas.length : v === "verif" ? t.verifikasi : v === "kps" && peranAktif() === "kps" ? t.kps : 0;
  return n ? `<span class="count num" aria-label="${n} menunggu">${n}</span>` : "";
}
function halaman() {
  if (S.view === "pengguna") return hPengguna();
  if (S.view === "log") return hLog();
  if (S.view === "akun") return hAkun();
  if (S.view === "biodata") return hBiodata();
  if (S.view === "cari") return hCari();
  if (S.view === "kegiatan") return hKegiatan();
  if (S.view === "kps") return hKps();
  if (S.view === "verif") return hVerif();
  if (S.view === "ttd") return hTtd();
  if (S.view === "porto") return hPorto();
  if (S.view === "ilkps") return hIlkps();
  if (S.view === "dprodi") return hDprodi();
  if (S.view === "setuju") return hSetuju();
  if (S.view === "survei") return hSurvei();
  if (S.view === "penilaian") return hPenilaian();
  if (S.view === "ded") return hDed();
  if (S.view === "mk") return hMk();
  if (S.view === "bank") return hBank();
  if (S.view === "lab") return hLab();
  if (S.view === "info") return hInfo();
  if (S.view === "masukan") return hMasukan();
  if (S.view === "data") return hData();
  if (S.view === "versi") return hRiwayat();
  return hBeranda();
}
const tombol = (act, label, kelas = "primary", attr = "") => `<button class="btn ${kelas}" data-act="${act}" ${attr} ${S.sibuk ? "disabled" : ""}>${S.sibuk ? "Memproses…" : label}</button>`;
const galatHtml = () => S.galat ? `<p class="galat" role="alert">${esc(S.galat)}</p>` : "";

/* ---------- layar masuk & aktivasi ---------- */
function bingkai(judul, sub, isi) {
  return `<div class="login"><section class="art"><img src="logo.png" alt="Logo Politeknik Pariwisata Bali">
   <div style="position:relative;z-index:1;display:flex;flex-direction:column;gap:12px"><h1>${judul}</h1><p>${sub}</p></div>
   <div class="crit"><span>Budaya Mutu</span><span>Relevansi</span><span>Akuntabilitas</span><span>Diferensiasi Misi</span></div></section>
   <section class="form">${isi}</section></div>`;
}
function layarMasuk() {
  return bingkai("Repositori Kegiatan Prodi Usaha Perjalanan Wisata", "Satu tempat untuk mencatat kegiatan prodi, langsung terpetakan ke instrumen akreditasi LAMWisata.",
   `<div><h2 style="font-size:1.3rem">Masuk</h2><p class="muted small" style="margin-top:4px">Gunakan NIM (mahasiswa) atau NIP (dosen dan tendik).</p></div>
   <form id="fMasuk" style="display:flex;flex-direction:column;gap:12px">
    <div class="field"><label for="mu">NIM / NIP</label><input id="mu" type="text" autocomplete="username" required></div>
    <div class="field"><label for="ms">Kata sandi</label><input id="ms" type="password" autocomplete="current-password" required><span class="hint">Login pertama: kata sandi sama dengan NIM/NIP Anda.</span></div>
    ${galatHtml()}<button class="btn primary" type="submit" style="justify-content:center" ${S.sibuk ? "disabled" : ""}>${S.sibuk ? "Memproses…" : "Masuk"}</button>
    <button class="btn" type="button" data-act="keLupa" style="justify-content:center">Lupa kata sandi</button></form>
   <button class="btn sm" type="button" data-act="keCek" style="align-self:flex-start">Cek keaslian surat tugas</button>
   <details class="small"><summary style="cursor:pointer;font-weight:600">Panduan masuk pertama kali</summary><ol style="margin:8px 0 0 18px;padding:0;display:grid;gap:4px">${TUTORIAL[0].l.map(x => `<li>${x}</li>`).join("")}</ol></details>`);
}
function layarAktivasi() {
  const a = S.akt, u = S.pengguna, langkah = u.emailTerverifikasi ? 3 : (a.langkah);
  const isi = langkah === 1 ? `<h2>Langkah 1 dari 2 · Buat kata sandi baru</h2>
    <p class="muted small">Kata sandi awal (sama dengan NIM/NIP) hanya untuk login pertama. Minimal 8 karakter, memuat huruf dan angka, dan tidak boleh sama dengan NIM/NIP.</p>
    <div class="field"><label for="p1">Kata sandi baru</label><input id="p1" type="password" autocomplete="new-password"></div>
    <div class="field"><label for="p2">Ulangi kata sandi baru</label><input id="p2" type="password" autocomplete="new-password"></div>
    ${galatHtml()}<div class="row">${tombol("aktSandi", "Lanjut")}</div>`
  : u.tanpaEmail ? `<h2>Langkah 2 dari 2 · Email Anda</h2>
    <p class="muted small">Tuliskan email yang aktif Anda buka. Untuk sementara email kampus belum bisa mengirim kode, jadi akun langsung aktif; Anda akan diminta memverifikasi email ini nanti setelah layanan email pulih. Bila lupa kata sandi, minta Super Admin prodi untuk mereset.</p>
    <div class="field"><label for="em">Email</label><input id="em" type="email" value="${esc(a.email)}" placeholder="Contoh: nama@gmail.com" autocomplete="email"></div>
    ${galatHtml()}<div class="row">${tombol("aktTanpaEmail", "Simpan email dan mulai")}</div>`
  : `<h2>Langkah 2 dari 2 · Verifikasi email</h2>
    <p class="muted small">Email dipakai untuk kode reset kata sandi dan pengumuman penting. Gunakan email yang aktif Anda buka.</p>
    <div class="field"><label for="em">Email</label><input id="em" type="email" value="${esc(a.email)}" placeholder="Contoh: nama@gmail.com"></div>
    ${a.email && a.terkirim ? `<div class="auto">Kode 6 digit dikirim ke <b>${esc(a.email)}</b>. Periksa juga folder spam.${a.kodeUji ? `<br><b>Mode Uji Coba:</b> kode = <span class="mono">${esc(a.kodeUji)}</span>` : ""}</div>
     <div class="field"><label for="kode">Kode verifikasi</label><input id="kode" type="text" inputmode="numeric" maxlength="6" class="mono" autocomplete="one-time-code"></div>` : ""}
    ${galatHtml()}<div class="row">${a.terkirim ? tombol("aktVerif", "Verifikasi") + tombol("aktKirim", "Kirim ulang kode", "") : tombol("aktKirim", "Kirim kode")}</div>`;
  return bingkai(`Selamat datang, ${esc(u.nama.split(",")[0])}`, "Aktifkan akun Anda dalam dua langkah singkat.",
    `<div class="steps"><i class="on"></i><i class="${langkah >= 2 ? "on" : ""}"></i></div>${isi}<button class="btn" data-act="keluar" style="align-self:flex-start">Batal dan keluar</button>`);
}
/** Verifikasi email susulan untuk akun yang diaktifkan tanpa email (v0.16.0). */
function layarVerifEmail() {
  const u = S.pengguna, v = S.vem = S.vem || { email: u.email || "", terkirim: false, kodeUji: "" };
  return bingkai(`Halo, ${esc(u.nama.split(",")[0])}`, "Layanan email sudah pulih. Verifikasi email Anda sekali saja untuk melanjutkan.",
   `<p class="muted small">Akun Anda diaktifkan saat email kampus belum bisa mengirim kode. Sekarang kirim kode ke email Anda (boleh diganti bila alamatnya keliru), lalu masukkan kodenya.</p>
    <div class="field"><label for="vem">Email</label><input id="vem" type="email" value="${esc(v.email)}" autocomplete="email"></div>
    ${v.terkirim ? `<div class="auto">Kode 6 digit dikirim ke <b>${esc(v.email)}</b>. Periksa juga folder spam.${v.kodeUji ? `<br><b>Mode Uji Coba:</b> kode = <span class="mono">${esc(v.kodeUji)}</span>` : ""}</div>
     <div class="field"><label for="vkode">Kode verifikasi</label><input id="vkode" type="text" inputmode="numeric" maxlength="6" class="mono" autocomplete="one-time-code"></div>` : ""}
    ${galatHtml()}<div class="row">${v.terkirim ? tombol("vemVerif", "Verifikasi") + tombol("vemKirim", "Kirim ulang kode", "") : tombol("vemKirim", "Kirim kode")}</div>
    <button class="btn" data-act="keluar" style="align-self:flex-start">Keluar</button>`);
}
function layarGanti() {
  return bingkai("Ganti kata sandi", "Kata sandi Anda baru direset. Buat kata sandi baru untuk melanjutkan.",
   `<div class="field"><label for="g1">Kata sandi baru</label><input id="g1" type="password" autocomplete="new-password"></div>
    <div class="field"><label for="g2">Ulangi kata sandi baru</label><input id="g2" type="password" autocomplete="new-password"></div>
    ${galatHtml()}<div class="row">${tombol("gantiWajib", "Simpan")}<button class="btn" data-act="keluar">Keluar</button></div>`);
}
function layarLupa() {
  const l = S.lupa;
  return bingkai("Lupa kata sandi", "Kode reset dikirim ke email yang Anda daftarkan saat aktivasi.",
   l.langkah === 1 ? `<div class="field"><label for="le">Email terdaftar</label><input id="le" type="email" value="${esc(l.email)}"></div><p class="small muted">Tidak menerima kode? Hubungi Super Admin prodi untuk mereset kata sandi Anda.</p>${galatHtml()}<div class="row">${tombol("lupaKirim", "Kirim kode")}<button class="btn" data-act="keMasuk">Kembali</button></div>`
   : `<div class="auto">Bila email terdaftar, kode sudah dikirim ke <b>${esc(l.email)}</b>. Kode berlaku 15 menit.${l.kodeUji ? `<br><b>Mode Uji Coba:</b> kode = <span class="mono">${esc(l.kodeUji)}</span>` : ""}</div>
     <div class="field"><label for="lk">Kode</label><input id="lk" type="text" inputmode="numeric" maxlength="6" class="mono" autocomplete="one-time-code"></div>
     <div class="field"><label for="l1">Kata sandi baru</label><input id="l1" type="password" autocomplete="new-password"></div>
     <div class="field"><label for="l2">Ulangi kata sandi baru</label><input id="l2" type="password" autocomplete="new-password"></div>
     ${galatHtml()}<div class="row">${tombol("lupaReset", "Simpan kata sandi baru")}<button class="btn" data-act="keMasuk">Kembali</button></div>`);
}

/* ---------- halaman setelah masuk ---------- */
function hBeranda() {
  const u = S.pengguna;
  if (peranAktif() === "asesor") return `<div class="head"><div><h1>Selamat datang, ${esc(namaPendek(u.nama))}</h1><p>Akun asesor${u.instansi ? " · " + esc(u.instansi) : ""} untuk akreditasi Prodi Usaha Perjalanan Wisata, Politeknik Pariwisata Bali.</p></div></div>
   <div class="callout"><b>Akses baca saja, berlaku sampai ${esc(tglPanjang(u.berlakuSampai))}.</b> Anda dapat melihat <b>Tabel iLKPS</b>, <b>Bank Dokumen</b> (dokumen mutu versi berlaku), dan <b>kegiatan yang datanya sudah diverifikasi</b> beserta bukti, surat tugas, dan kode verifikasinya. Draf, biodata, dan data pribadi lain tidak ditampilkan. Setiap akses tercatat oleh prodi.</div>
   <div class="row" style="flex-wrap:wrap"><button class="btn primary" data-go="ilkps">Buka Tabel iLKPS</button><button class="btn" data-go="setuju">Kegiatan disetujui</button><button class="btn" data-go="bank">Bank Dokumen</button></div>
   <section class="panel"><h2>Cara memakai</h2><ol class="small" style="margin:6px 0 0 18px;padding:0;display:grid;gap:4px">
    <li>Di <b>Tabel iLKPS</b>, pilih tabel; klik baris kegiatan untuk membuka detail dan buktinya.</li>
    <li>Tautan bukti di Excel ekspor prodi (kolom "Tautan bukti") juga membuka kegiatan yang sama setelah Anda masuk.</li>
    <li>Keaslian surat tugas dapat dicek dengan kode verifikasi atau QR pada surat.</li></ol></section>`;
  return `<div class="head"><div><h1>Halo, ${esc(u.nama.split(",")[0])}</h1><p>Anda masuk sebagai <b>${esc(PERAN_L[peranAktif()])}</b>${u.peran.length > 1 ? ". Ganti peran lewat pilihan Peran di bilah atas" : ""}.</p></div></div>
   ${panelSurveiSaya()}${panelTugas()}
   ${K.lingkungan === "uji" ? `<div class="callout"><b>${LABEL_VERSI} · Perbaikan dari catatan prodi.</b> Baru di v0.24.0: <b>foto profil</b> (menu Akun saya) dan, untuk Super Admin, menu <b>Data Terkumpul</b> serta tombol <b>Sumber data</b> di setiap butir Penilaian (terima, minta revisi, tolak, hapus, pulihkan). v0.23.1: ikon aplikasi diperbesar (koper dan UPW memenuhi kotak). Baru di v0.23.0: tombol <b>Kirim masukan</b> di Info (masalah, saran, permintaan fitur; boleh lampirkan tangkapan layar), menu Masukan untuk Admin dan Super Admin. Di v0.22.0: gambar panduan bernomor di Info, ikon mata pada kata sandi, persentase biodata dari semua kolom, tombol unggah ijazah mengikuti pendidikan yang diisi, simpan unduhan ke folder pilihan (aplikasi terpasang), pintasan di ikon Dock. Tahap 3–5: tombol <b>Info</b> (ikon i di bilah atas) berisi panduan sesuai peran; dokumen pendukung biodata dosen dan pengingat; riwayat keputusan KPS; tanda tangan di atas nama; menu Laboratorium; tautan bukti di portofolio; aplikasi lebih cepat. Sebelumnya: impor dari Excel dengan templat (akun, biodata dosen, kurikulum, lulusan), unduh daftar akun, Data Prodi › Status dosen; tombol <b>Lihat</b> pada kolom kata sandi, pencarian dosen dengan inisial, angkatan dari NIM, menu mengikuti peran aktif, saran Pasal GCET saat mengetik judul, ikon aplikasi baru.${menu().includes("bank") ? " Sebelumnya: menu <b>Bank Dokumen</b>: 94 slot dokumen mutu untuk 47 butir Matriks yang dinilai GPM, dengan penanggung jawab, masa berlaku, dan riwayat versi; jumlah dokumen berlaku ikut tampil di Penilaian." : ""}${menu().includes("mk") ? " Sebelumnya: menu <b>Mata Kuliah Saya</b> (RPS, kontrak, rubrik, metode, integrasi, bukti pembelajaran)." : ""} Sudah ada juga: <b>DED</b> (narasi 64 butir, unduh Word) dan <b>Penilaian</b> (simulasi 84 butir). <b>Survei:</b> Baru${menu().includes("survei") ? ": menu <b>Survei</b> (templat Tabel 22 kepuasan mahasiswa dan Tabel 11 pengguna lulusan, anonim atau beridentitas, tautan tanpa login untuk alumni dan pengguna, rekap dan tindak lanjut); Tabel iLKPS kini lengkap 33 lembar" : ": survei dari prodi muncul di Beranda bila ada yang terbuka untuk Anda"}.
   Sudah ada: Portofolio Saya (ekspor PDF/Excel/ZIP), kegiatan dan surat tugas dengan QR${u.peran.includes("kps") ? " dan tanda tangan KPS" : ""}, unggah bukti bersama, batas hari kerja dan pengingat, verifikasi data, cek keaslian surat, biodata, pencarian orang.</div>` : ""}
   ${menu().includes("kegiatan") ? `<div class="row"><button class="btn primary" data-go="kegiatan">Buka Kegiatan</button>${menu().includes("kps") ? `<button class="btn" data-go="kps">Buka Antrean KPS</button>` : ""}</div>` : ""}
   <section class="panel"><h2>Akun Anda</h2><div class="tbl-wrap"><table><tbody>
    <tr><td>NIM/NIP</td><td class="mono">${esc(u.username)}</td></tr><tr><td>Email</td><td>${esc(u.email || "–")}</td></tr>
    ${u.jenisBiodata === "mahasiswa" ? `<tr><td>Kelas</td><td>${u.semesterMhs ? `Semester ${u.semesterMhs} – Kelas ${esc(u.kelas)}` : esc(u.kelas || "–")} · masuk ${esc(u.masuk || "–")} · ${esc(u.semesterKini.label)}</td></tr>` : ""}
    <tr><td>Peran</td><td>${u.peran.map(r => `<span class="tag t">${PERAN_L[r]}</span>`).join(" ")}</td></tr></tbody></table></div></section>`;
}
function panelTugas() {
  const t = S.tugas;
  if (!t) return "";
  const baris = t.tugas.map(x => {
    const [judul, isi, kelas] = x.jenis === "bukti" ? [x.terlambat ? "Bukti terlambat" : "Lengkapi bukti", `${x.ada} dari ${x.perlu} dokumen · batas ${tglPendek(x.batas)}`, x.terlambat ? "s-ditolak" : "s-revisi"]
      : x.jenis === "revisiData" ? ["Perbaiki data", x.catatan || "Lihat catatan verifikator", "s-revisi"]
      : x.jenis === "revisiAju" ? [x.st === "ditunda" ? "Pengajuan ditunda KPS" : "Revisi pengajuan surat", x.catatan || "", "s-revisi"]
      : ["Draf belum diajukan", `Bukti ${x.ada} dari ${x.perlu}`, "s-draf"];
    return `<div class="item" style="cursor:pointer" data-act="bukaKeg" data-id="${x.id}"><div class="body"><div class="title">${esc(x.judul)}</div><div class="meta"><span>${esc(isi)}</span></div></div><span class="chip ${kelas}">${judul}</span></div>`;
  });
  if (t.verifikasi) baris.push(`<div class="item" style="cursor:pointer" data-go="verif"><div class="body"><div class="title">${t.verifikasi} data kegiatan menunggu verifikasi Anda</div></div><span class="chip s-diajukan">Verifikasi</span></div>`);
  (t.pengingat || []).forEach(x => baris.push(`<div class="item"><div class="body"><div class="title">${esc(x.pesan)}</div><div class="meta"><span>Pengingat dari ${esc(namaPendek(x.dari))} · ${esc(tglJam(x.dibuat))}</span></div></div><div class="row bk-aksi">${x.jenis === "dokumen" ? `<button class="btn sm" data-go="biodata">Buka Biodata</button>` : ""}<button class="btn sm" data-act="pengingatSelesai" data-id="${x.id}">Selesai</button></div></div>`));
  if (t.dokBelum && t.dokBelum.length && !(t.pengingat || []).some(x => x.jenis === "dokumen")) baris.push(`<div class="item" style="cursor:pointer" data-go="biodata"><div class="body"><div class="title">Lengkapi dokumen pendukung biodata</div><div class="meta"><span>Belum diunggah: ${esc(t.dokBelum.join(", "))}</span></div></div><span class="chip s-revisi">Biodata</span></div>`);
  (t.mkpBelumRps || []).forEach(m => baris.push(`<div class="item" style="cursor:pointer" data-act="mkpBuka" data-s="${m.semester}" data-kode="${esc(m.kode)}"><div class="body"><div class="title">${esc(m.kode)} · ${esc(m.nama)}</div><div class="meta"><span>Unggah RPS semester ini (Anda pengampu utama)</span></div></div><span class="chip s-revisi">RPS</span></div>`));
  (t.bankPerlu || []).forEach(x => baris.push(`<div class="item" style="cursor:pointer" data-go="bank"><div class="body"><div class="title">${esc(x.nama)}</div><div class="meta"><span>Bank Dokumen · butir ${x.butir} · Anda penanggung jawab</span></div></div><span class="chip ${ST_BANK[x.status][1]}">${ST_BANK[x.status][0]}</span></div>`));
  if (t.masukanBaru && ["superadmin", "admin"].includes(peranAktif())) baris.push(`<div class="item" style="cursor:pointer" data-go="masukan"><div class="body"><div class="title">${t.masukanBaru} masukan baru dari pengguna</div><div class="meta"><span>Laporan masalah, permintaan fitur, dan saran</span></div></div><span class="chip s-diajukan">Masukan</span></div>`);
  if (t.dedBelum) baris.push(`<div class="item" style="cursor:pointer" data-go="ded"><div class="body"><div class="title">${t.dedBelum} butir DED tanggung jawab Anda belum selesai</div><div class="meta"><span>Dari ${t.dedPj} butir yang ditugaskan kepada Anda</span></div></div><span class="chip s-revisi">DED</span></div>`);
  if (t.kps && peranAktif() === "kps") baris.push(`<div class="item" style="cursor:pointer" data-go="kps"><div class="body"><div class="title">${t.kps} pengajuan surat tugas menunggu keputusan Anda</div></div><span class="chip s-diajukan">Antrean KPS</span></div>`);
  return `<section class="panel"><h2>Perlu tindakan (${baris.length})</h2><div class="list">${baris.join("") || `<div class="empty">Tidak ada yang perlu ditindaklanjuti. Bagus!</div>`}</div></section>`;
}
function hAkun() {
  return `<div class="head"><div><h1>Akun saya</h1><p>Foto profil dan kata sandi. Semua sesi di perangkat lain tetap aktif sampai keluar.</p></div></div>
   ${panelFotoProfil()}
   <section class="panel" style="max-width:520px"><h2>Ganti kata sandi</h2><div class="grid" style="gap:10px">
    <div class="field"><label for="a0">Kata sandi lama</label><input id="a0" type="password" autocomplete="current-password"></div>
    <div class="field"><label for="a1">Kata sandi baru</label><input id="a1" type="password" autocomplete="new-password"><span class="hint">Minimal 8 karakter, memuat huruf dan angka.</span></div>
    <div class="field"><label for="a2">Ulangi kata sandi baru</label><input id="a2" type="password" autocomplete="new-password"></div>
    ${galatHtml()}<div class="row">${tombol("gantiSandi", "Simpan")}</div></div></section>`;
}
function hPengguna() {
  const sa = peranAktif() === "superadmin";
  if (!S.daftar) { muatPengguna(); return `<div class="memuat">Memuat daftar pengguna…</div>`; }
  const q = S.cari.trim().toLowerCase();
  const l = S.daftar.filter(x => !q || (x.username + " " + x.nama + " " + (x.email || "")).toLowerCase().includes(q));
  const sem = x => x.masuk ? (x.statusMhs === "A" && x.semesterMhs ? `Smt ${x.semesterMhs} – ${esc(x.kelas)}` : `Kelas ${esc(x.kelas)}`) + `<div class="small muted">masuk ${x.masuk} · ${esc(x.statusMhs)}</div>` : "–";
  const bio = x => !x.jenisBiodata ? '<span class="muted small">–</span>' : x.biodataLengkap ? '<span class="chip s-disetujui">Lengkap</span>' : '<span class="chip s-draf">Belum</span>';
  const st = s => s === "aktif" ? '<span class="chip s-disetujui">Aktif</span>' : s === "impor" ? '<span class="chip s-draf">Belum aktivasi</span>' : '<span class="chip s-ditolak">Nonaktif</span>';
  return `<div class="head"><div><h1>Pengguna</h1><p>${sa ? "Semua akun. Super Admin dapat mengimpor semua peran, mereset kata sandi, dan mengatur peran." : "Akun mahasiswa. Admin Prodi dapat mengimpor mahasiswa."}</p></div></div>
   ${sa ? panelTanpaEmail() + panelPenandaTangan() + panelAsesor() : ""}
   <section class="panel"><h2>Impor akun</h2>
    <p class="small muted">Satu baris per orang. Mahasiswa: <b>NIM; Nama lengkap; tahun masuk; kelas</b> (tahun masuk boleh dilewati, cukup <b>NIM; Nama; kelas</b>: angkatan diambil dari 2 angka pertama NIM, misalnya 25… = 2025).${sa ? " Dosen/tendik: <b>NIP; Nama lengkap; peran</b>, peran dipisah koma, misalnya <span class=\"mono\">dosen,kps</span>." : ""} Bisa ditempel langsung dari Excel (kolom dipisah tab juga diterima).</p>
    <textarea id="imporTeks" style="min-height:110px;margin-top:8px" placeholder="${sa ? "260101; Made Contoh; 2026; A\n198501012010121001; Ni Luh Contoh, M.Par.; dosen" : "260101; Made Contoh; 2026; A\n260102; Ketut Contoh; 2026; B"}">${esc(S.impor.teks)}</textarea>
    ${S.impor.hasil ? `<div class="auto" style="margin-top:8px"><b>${S.impor.hasil.diimpor}</b> akun diimpor.${S.impor.hasil.dilewati.length ? " Dilewati: " + S.impor.hasil.dilewati.map(x => `baris ${x.baris} (${esc(x.alasan)})`).join("; ") : ""}</div>` : ""}
    ${galatHtml()}<div class="row" style="margin-top:8px">${tombol("impor", "Impor")}</div>
    ${panelImporExcel("mhs")}${sa ? panelImporExcel("pegawai") : ""}${panelImporExcel("biodata")}
    <div class="row" style="margin-top:10px"><button class="btn sm" data-act="eksporAkun">Unduh daftar akun (Excel)</button></div></section>
   <section class="panel"><div class="row" style="justify-content:space-between;margin-bottom:8px"><h2>Daftar akun (${l.length})</h2>
    <div class="row"><input id="cariP" type="search" placeholder="Cari NIM/NIP, nama, email" value="${esc(S.cari)}" style="width:240px"><button class="btn sm" data-act="muatUlang">Muat ulang</button></div></div>
    <div class="tbl-wrap"><table><thead><tr><th>NIM/NIP</th><th>Nama</th>${sa ? "<th>Peran</th>" : ""}<th>Kelas</th><th>Status akun</th><th>Biodata</th><th>Email</th><th>Masuk terakhir</th><th></th></tr></thead><tbody>
    ${l.map(x => `<tr><td class="mono">${esc(x.username)}</td><td>${esc(x.nama)}</td>${sa ? `<td>${x.peran.map(r => `<span class="tag t">${PERAN_L[r]}</span>`).join(" ")}</td>` : ""}<td class="small">${sem(x)}</td><td>${st(x.status)}</td><td>${bio(x)}</td><td class="small">${esc(x.email || "–")}${x.emailTertunda ? '<div class="muted">belum terverifikasi</div>' : ""}</td><td class="small num">${tgl(x.masukTerakhir)}</td>
     <td><div class="row">${x.jenisBiodata ? `<button class="btn sm" data-act="lihatBio" data-id="${x.id}">Biodata</button>` : ""}${x.jenisBiodata === "mahasiswa" ? `<button class="btn sm" data-act="laciMhs" data-id="${x.id}">Data mhs</button>` : ""}${sa ? `<button class="btn sm" data-act="laciPeran" data-id="${x.id}">Peran</button><button class="btn sm" data-act="resetSandi" data-id="${x.id}">Reset sandi</button>` : ""}</div></td></tr>`).join("")}
    </tbody></table></div></section>`;
}
/* --- akun asesor (v0.9.0, Super Admin) --- */
function panelTanpaEmail() {
  const T = S.tanpaEmail;
  if (!T) { sekali("tanpaEmail", async () => { S.tanpaEmail = await api("admin.tanpaEmail"); render(); }); return `<section class="panel"><h2>Aktivasi akun</h2><div class="memuat" style="min-height:60px">Memuat…</div></section>`; }
  return `<section class="panel"><div class="row" style="justify-content:space-between;flex-wrap:wrap"><h2 style="margin:0">Aktivasi akun</h2>${T.nyala ? '<span class="chip s-diajukan">Tanpa email (sementara)</span>' : '<span class="chip s-disetujui">Dengan kode email</span>'}</div>
   <p class="small">${T.nyala ? "<b>Aktivasi tanpa email sedang menyala.</b> Pengguna baru cukup mengganti kata sandi dan menuliskan email, lalu langsung aktif. Lupa kata sandi: reset dari daftar akun di bawah." : "Pengguna baru mengaktifkan akun dengan kode yang dikirim ke email. Nyalakan aktivasi tanpa email <b>hanya</b> bila email kampus belum bisa terkirim (DKIM ppb.ac.id belum dipasang)."}
    ${T.tertunda ? ` <b>${T.tertunda}</b> akun aktif dengan email belum terverifikasi${T.nyala ? "; mereka akan diminta memverifikasi setelah mode ini dimatikan." : " sedang diminta memverifikasi email saat masuk."}` : ""}</p>
   ${galatHtml()}<div class="row">${tombol("aturTanpaEmail", T.nyala ? "Matikan (email kampus sudah bisa terkirim)" : "Nyalakan aktivasi tanpa email", T.nyala ? "" : "primary")}</div></section>`;
}
function panelAsesor() {
  if (!S.asesor) { sekali("asesor", async () => { S.asesor = await api("asesor.daftar"); render(); }); return `<section class="panel"><h2>Akun asesor</h2><div class="memuat" style="min-height:80px">Memuat…</div></section>`; }
  const A = S.asesor, dis = S.sibuk ? "disabled" : "";
  const st = x => x.status === "nonaktif" ? '<span class="chip s-ditolak">Nonaktif</span>' : x.kedaluwarsa ? '<span class="chip s-ditolak">Kedaluwarsa</span>' : x.wajibGanti ? '<span class="chip s-draf">Belum masuk</span>' : '<span class="chip s-disetujui">Aktif</span>';
  return `<section class="panel"><h2>Akun asesor</h2>
   <p class="small muted">Akses <b>baca saja</b> untuk asesor: Tabel iLKPS dan kegiatan yang datanya sudah disetujui beserta bukti dan suratnya. Langsung aktif tanpa email, kata sandi sementara wajib diganti saat masuk pertama, dan berakhir otomatis (maks. ${A.maksHari} hari). Setiap akses tercatat.</p>
   <div class="grid g3" style="gap:10px;margin-top:8px"><div class="field"><label for="asNama">Nama asesor${wajib}</label><input id="asNama" type="text" placeholder="Contoh: Prof. Dr. Ni Made Ayu, M.Par."></div>
    <div class="field"><label for="asInst">Instansi</label><input id="asInst" type="text" placeholder="Contoh: LAMWisata / Universitas …"></div>
    <div class="field"><label for="asSampai">Berlaku sampai${wajib}</label><input id="asSampai" type="date" value="${esc(A.bawaanSampai)}"></div></div>
   ${galatHtml()}<div class="row">${tombol("asBuat", "Buat akun asesor")}</div>
   ${A.asesor.length ? `<div class="tbl-wrap" style="margin-top:10px"><table><thead><tr><th>Asesor</th><th>Nama pengguna</th><th>Berlaku sampai</th><th>Status</th><th>Akses</th><th>Masuk terakhir</th><th></th></tr></thead><tbody>
    ${A.asesor.map(x => `<tr><td>${esc(x.nama)}${x.instansi ? `<br><span class="small muted">${esc(x.instansi)}</span>` : ""}</td><td class="mono small">${esc(x.username)}</td>
     <td><input id="asTgl-${x.id}" type="date" value="${esc(x.berlakuSampai)}" style="width:auto" aria-label="Berlaku sampai ${esc(x.nama)}"></td><td>${st(x)}</td><td class="num">${x.akses}</td><td class="small num">${tgl(x.masukTerakhir)}</td>
     <td><div class="row" style="flex-wrap:wrap"><button class="btn sm" data-act="asPerpanjang" data-id="${x.id}" ${dis}>Simpan tanggal</button>
      <button class="btn sm ${x.status === "nonaktif" ? "" : "bad"}" data-act="asAktif" data-id="${x.id}" data-a="${x.status === "nonaktif" ? 1 : 0}" ${dis}>${x.status === "nonaktif" ? "Aktifkan" : "Nonaktifkan"}</button>
      <button class="btn sm" data-act="asReset" data-id="${x.id}" ${dis}>Reset sandi</button></div></td></tr>`).join("")}</tbody></table></div>` : ""}
   ${A.log.length ? `<details style="margin-top:10px"><summary class="small" style="cursor:pointer"><b>Log akses asesor</b> (${A.log.length} terakhir)</summary><div class="tbl-wrap" style="margin-top:6px"><table><thead><tr><th>Waktu</th><th>Asesor</th><th>Aksi</th><th>Rincian</th></tr></thead><tbody>
    ${A.log.map(l => `<tr><td class="small num">${tgl(l.waktu)}</td><td class="small">${esc(namaPendek(l.nama))}</td><td class="small">${esc(LOG_ASESOR[l.aksi] || l.aksi)}</td><td class="small mono">${esc(l.detail)}</td></tr>`).join("")}</tbody></table></div></details>` : ""}
  </section>`;
}
const LOG_ASESOR = { masuk: "Masuk", "asesor.ilkps": "Membuka Tabel iLKPS", "asesor.lihatKegiatan": "Membuka kegiatan", "asesor.lihatBukti": "Membuka bukti",
  "asesor.daftarKegiatan": "Membuka daftar kegiatan", "asesor.direktori": "Membuka Cari orang", "asesor.masukDitolak": "Masuk ditolak (kedaluwarsa)" };
const AKSI_ASESOR = {
  asBuat() {
    const data = { nama: $("asNama").value, instansi: $("asInst").value, berlakuSampai: $("asSampai").value };
    jalankan(async () => {
      const j = await api("asesor.buat", data);
      S.laci = { jenis: "sandi", nama: data.nama, username: j.username, sandi: j.sandiSementara, sampai: j.berlakuSampai }; S.asesor = null; S.daftar = null;
    });
  },
  asPerpanjang(d) { const v = $("asTgl-" + d.id).value; jalankan(async () => { await api("asesor.ubah", { userId: d.id, berlakuSampai: v }).catch(e => { toast(e.message); throw e; }); S.asesor = null; toast("Masa akses diperbarui."); }); },
  asAktif(d) {
    if (d.a !== "1" && !confirm("Nonaktifkan akun asesor ini? Sesi yang sedang berjalan langsung berakhir.")) return;
    jalankan(async () => { await api("asesor.ubah", { userId: d.id, aktif: d.a === "1" }).catch(e => { toast(e.message); throw e; }); S.asesor = null; S.daftar = null; toast(d.a === "1" ? "Akun diaktifkan." : "Akun dinonaktifkan."); });
  },
  asReset(d) {
    if (!confirm("Buat kata sandi sementara baru untuk asesor ini?")) return;
    const x = S.asesor.asesor.find(y => y.id === d.id);
    jalankan(async () => { const j = await api("admin.resetSandi", { userId: d.id }); S.laci = { jenis: "sandi", nama: x.nama, username: x.username, sandi: j.sandiSementara, sampai: x.berlakuSampai }; });
  }
};

/* --- kegiatan disetujui (asesor) --- */
function hSetuju() {
  if (!S.setuju) { sekali("setuju", async () => { S.setuju = (await api("kegiatan.disetujui")).kegiatan; render(); }); return `<div class="memuat">Memuat kegiatan…</div>`; }
  const q = S.setujuQ.trim().toLowerCase(), l = S.setuju.filter(k => !q || [k.judul, k.jenisLabel, k.tabel, k.olehNama, k.tempat, k.kodeSurat, k.semester].join(" ").toLowerCase().includes(q));
  return `<div class="head"><div><h1>Kegiatan disetujui</h1><p>Kegiatan yang data dan buktinya sudah diverifikasi prodi. Klik untuk melihat detail, bukti, dan surat tugas.</p></div></div>
   <section class="panel"><div class="row" style="justify-content:space-between;flex-wrap:wrap;margin-bottom:10px"><span class="small muted">${l.length} dari ${S.setuju.length} kegiatan</span>
    <input id="cariSetuju" type="search" placeholder="Cari judul, jenis, tabel, semester, kode surat" value="${esc(S.setujuQ)}" style="width:300px"></div>
    <div class="list">${l.map(k => `<div class="item" style="cursor:pointer" data-act="bukaKeg" data-id="${k.id}"><div class="body">
      <div class="row" style="justify-content:space-between;gap:8px"><div class="title">${esc(k.judul)}</div>${k.tabel ? `<span class="tag t">${esc(k.tabel)}</span>` : ""}</div>
      <div class="meta"><span>${esc(k.jenisLabel)}</span><span class="num">${esc(rentangPendek(k.tgl, k.sampai))}</span>${k.tingkat ? `<span>${esc(k.tingkat)}</span>` : ""}${k.semester ? `<span>${esc(k.semester)}</span>` : ""}<span>Bukti ${k.buktiAda}/${k.buktiPerlu}</span></div></div></div>`).join("")
      || `<div class="empty">${q ? "Tidak ada yang cocok." : "Belum ada kegiatan yang disetujui."}</div>`}</div></section>`;
}
document.addEventListener("input", ketikUlang("cariSetuju", v => { S.setujuQ = v; }));

function hLog() {
  if (!S.log) { api("admin.log").then(j => { S.log = j.log; render(); }).catch(e => toast(e.message)); return `<div class="memuat">Memuat log…</div>`; }
  const nama = x => x.username ? `${x.username}<div class="small muted">${esc(x.nama)}</div>` : esc(x.userId || "sistem");
  return `<div class="head"><div><h1>Log aktivitas</h1><p>200 aktivitas terakhir: siapa, apa, kapan.</p></div><button class="btn" data-act="muatLog">Muat ulang</button></div>
   <div class="tbl-wrap"><table><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Detail</th></tr></thead><tbody>
   ${S.log.map(x => `<tr><td class="num small">${tgl(x.waktu)}</td><td class="mono small">${nama(x)}</td><td class="mono small">${esc(x.aksi)}</td><td class="small mono">${esc(x.detail)}</td></tr>`).join("")}</tbody></table></div>`;
}
function laci() {
  const L = S.laci;
  if (L.jenis === "keg") return laciForm();
  if (L.jenis === "kegDetail") return laciDetail();
  if (L.jenis === "surat") return laciSurat();
  if (L.jenis === "akred") return laciAkred();
  if (L.jenis === "mk") return laciMk();
  if (L.jenis === "tim") return laciTim();
  if (L.jenis === "praktisi") return laciPraktisi();
  if (L.jenis === "svForm") return laciSvForm();
  if (L.jenis === "svHasil") return laciSvHasil();
  if (L.jenis === "svTautan") return laciSvTautan();
  if (L.jenis === "svIsi") return laciSvIsi();
  if (L.jenis === "gpm") return laciGpm();
  if (L.jenis === "ded") return laciDed();
  if (L.jenis === "mkp") return laciMkp();
  if (L.jenis === "bank") return laciBank();
  if (L.jenis === "sdos") return laciStatusDosen();
  if (L.jenis === "lab") return laciLab();
  if (L.jenis === "labLog") return laciLabLog();
  if (L.jenis === "masukan") return laciMasukan();
  if (L.jenis === "sumber") return laciSumber();
  if (L.jenis === "sumberAksi") return laciSumberAksi();
  if (L.jenis === "mskDetail") return laciMasukanDetail();
  if (L.jenis === "bankBaru") return laciBankBaru();
  if (L.jenis === "sandi") return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Kata sandi sementara">
   <div class="dh"><h2>Kata sandi sementara</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   <p>Berikan ${L.username ? "nama pengguna dan " : ""}kata sandi ini kepada <b>${esc(L.nama)}</b> secara langsung (bukan lewat grup percakapan). Kata sandi hanya ditampilkan sekali dan wajib diganti saat masuk pertama.</p>
   ${L.username ? `<p class="small">Nama pengguna: <b class="mono">${esc(L.username)}</b>${L.sampai ? ` · berlaku sampai <b>${esc(tglPanjang(L.sampai))}</b>` : ""}<br>Alamat: <span class="mono">${esc(location.origin + location.pathname)}</span></p>` : ""}
   <div class="sandi-baru">${esc(L.sandi)}</div><button class="btn" data-act="salinSandi">Salin</button></div></div>`;
  const x = S.daftar.find(y => y.id === L.id);
  if (L.jenis === "bio" || L.jenis === "mhs") return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="${L.jenis === "bio" ? "Biodata" : "Data mahasiswa"}">
   <div class="dh"><h2>${L.jenis === "bio" ? "Biodata" : "Data mahasiswa"} · ${esc(x.nama)}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   ${L.jenis === "bio" ? laciBiodata(L) : laciMhs(x)}</div></div>`;
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Atur peran">
   <div class="dh"><h2>Peran ${esc(x.nama)}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   <div class="classgrid">${Object.keys(PERAN_L).map(r => `<label><input type="checkbox" data-peran="${r}" ${x.peran.includes(r) ? "checked" : ""}><span>${PERAN_L[r]}</span></label>`).join("")}</div>
   ${galatHtml()}<div class="row" style="justify-content:flex-end;margin-top:auto">${tombol("simpanPeran", "Simpan peran")}</div></div></div>`;
}

/* ---------- biodata ---------- */
/* Isian biodata disimpan di S.bio.data setiap kali diketik/dipilih, jadi menggambar ulang layar tidak pernah menghapus isian. */
const LAIN = "__lain";
const wajibKosong = (skema, d) => skema.flatMap(g => g.f).filter(f => f.req && f.t !== "ro" && !String(d[f.k] || "").trim());
const jumlahWajib = skema => skema.flatMap(g => g.f).filter(f => f.req && f.t !== "ro").length;
function usia(t) { if (!t) return ""; const b = new Date(t + "T00:00:00"), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a; }
let memuat = {};
async function sekali(kunci, fn) { if (memuat[kunci]) return; memuat[kunci] = true; try { await fn(); } catch (e) { toast(e.message); } finally { memuat[kunci] = false; } }
async function muatBiodata() {
  return sekali("bio", async () => { const j = await api("biodata.saya"); S.wil = j.wilayah; S.bio = { paket: j.biodata, data: Object.assign({}, j.biodata.data), lain: {} }; render(); });
}
function kabDari(prov) { const w = (S.wil || []).find(x => x[0] === prov); return w ? w[1] : []; }
function bidang(f, d, lama, ro) {
  const id = "bf-" + f.k, v = d[f.k] ?? "";
  const lab = `<label for="${id}">${esc(f.l)}${f.t === "ro" ? "" : f.req ? ' <span style="color:var(--bad)" aria-label="wajib">*</span>' : ' <span class="muted small">(opsional)</span>'}${lama.includes(f.k) ? ' <span class="tag t" title="Terisi dari formulir lama; periksa dan koreksi bila perlu">data lama</span>' : ""}</label>`;
  let c;
  if (ro || f.t === "ro") c = `<input id="${id}" type="text" value="${esc(v)}" readonly style="background:var(--surface-2)" placeholder="–">`;
  else if (f.t === "text" || f.t === "date") c = `<input id="${id}" data-bk="${f.k}" type="${f.t}" value="${esc(v)}" placeholder="Belum diisi"${f.t === "date" ? ` max="${new Date().getFullYear() - 10}-12-31"` : ""}>`;
  else if (f.t === "sel") {
    const lainnya = f.other && (S.bio.lain[f.k] || (v && !f.o.includes(v)));
    c = `<select id="${id}" data-bk="${f.k}"><option value="">Pilih…</option>${f.o.map(o => `<option ${!lainnya && v === o ? "selected" : ""}>${esc(o)}</option>`).join("")}${f.other ? `<option value="${LAIN}" ${lainnya ? "selected" : ""}>Lainnya…</option>` : ""}</select>`;
    if (lainnya) c += `<input id="${id}-lain" data-bk-lain="${f.k}" type="text" value="${esc(v)}" placeholder="Tuliskan jawaban lainnya" aria-label="${esc(f.l)}: jawaban lainnya">`;
  } else if (f.t === "prov") {
    c = `<select id="${id}" data-bk="${f.k}" data-prov="1"><option value="">Pilih provinsi…</option>${(S.wil || []).map(([p]) => `<option ${v === p ? "selected" : ""}>${esc(p)}</option>`).join("")}<option ${v === "Luar negeri" ? "selected" : ""}>Luar negeri</option></select>`;
  } else if (f.t === "kab") {
    const p = d[f.p];
    if (!p) c = `<select id="${id}" disabled><option>Pilih provinsi dulu</option></select>`;
    else if (p === "Luar negeri") c = `<input id="${id}" data-bk="${f.k}" type="text" value="${esc(v)}" placeholder="Kota dan negara, contoh: Dili, Timor-Leste">`;
    else { const ks = kabDari(p); c = `<select id="${id}" data-bk="${f.k}"><option value="">Pilih kabupaten/kota di ${esc(p)}…</option>${ks.map(k => `<option ${v === k ? "selected" : ""}>${esc(k)}</option>`).join("")}</select><span class="hint">${ks.length} kabupaten/kota di ${esc(p)}</span>`; }
  }
  const hint = f.k === "tgllahir" && v ? `<span class="hint">Usia saat ini: <b>${usia(v)} tahun</b> (dihitung otomatis)</span>` : f.hint ? `<span class="hint">${esc(f.hint)}</span>` : "";
  return `<div class="field">${lab}${c}${hint}</div>`;
}
function kartuBiodata(paket, d, ro) {
  const sem = paket.semester, sudah = paket.sudahSemesterIni;
  return `<div class="grid g2">${paket.skema.map(g => `<section class="panel" ${g.sem ? 'style="border-color:var(--gold)"' : ""}>
   <div class="row" style="justify-content:space-between;margin-bottom:12px"><h2>${esc(g.g)}${g.priv ? ' <span class="tag">hanya Admin</span>' : ""}</h2>
    ${g.sem ? (sudah ? `<span class="chip s-disetujui">Sudah diperbarui ${esc(sem.label)}</span>` : `<span class="chip s-revisi">Perbarui untuk ${esc(sem.label)}</span>`) : ""}</div>
   ${g.sem ? `<p class="small muted" style="margin:-4px 0 12px">Bagian ini diperbarui setiap awal semester; riwayatnya disimpan untuk analisis masa studi.</p>` : ""}
   <div class="grid" style="gap:12px">${g.f.map(f => bidang(f, d, ro ? [] : paket.lama, ro)).join("")}</div>
   ${g.sem && paket.riwayat && paket.riwayat.length ? `<details style="margin-top:10px"><summary class="small" style="cursor:pointer">Riwayat per semester (${paket.riwayat.length})</summary><div class="tbl-wrap" style="margin-top:8px"><table><thead><tr><th>Semester</th><th>Tempat tinggal</th><th>Bekerja</th><th>Bahasa Inggris</th><th>Transportasi</th></tr></thead><tbody>${paket.riwayat.map(r => `<tr><td>${esc(r.label)}</td><td>${esc(r.tinggal)}</td><td>${esc(r.kerja)}</td><td>${esc(r.inggris)}</td><td>${esc(r.transport || "–")}</td></tr>`).join("")}</tbody></table></div></details>` : ""}
  </section>`).join("")}</div>`;
}
/* v0.22.0: persentase dari SEMUA kolom isian (kecuali yang petunjuknya "Kosongkan bila belum/tidak ada");
   kolom wajib tetap menjadi syarat menyimpan dan dilaporkan terpisah. */
const kolomIsian = skema => skema.flatMap(g => g.f).filter(f => f.t !== "ro" && !/^Kosongkan/i.test(f.hint || ""));
function barKelengkapan() {
  const sk = S.bio.paket.skema, kol = kolomIsian(sk), all = kol.length, n = kol.filter(f => String(S.bio.data[f.k] || "").trim()).length;
  const p = all ? Math.floor(n / all * 100) : 100, wajib = wajibKosong(sk, S.bio.data).length;
  return { n, all, p, wajib };
}
const teksWajib = k => k.wajib ? `${k.wajib} kolom wajib (*) belum diisi` : "Semua kolom wajib (*) sudah terisi";
function hBiodata() {
  if (!S.bio) { muatBiodata(); return `<div class="memuat">Memuat biodata…</div>`; }
  const u = S.pengguna, pk = S.bio.paket, mhs = pk.jenis === "mahasiswa", k = barKelengkapan();
  const gerbang = u.perluBiodata ? (pk.kurang.length === 0 && mhs && !pk.sudahSemesterIni
      ? `<div class="callout" style="border-color:var(--gold)"><b>Semester baru: ${esc(pk.semester.label)}.</b> Periksa bagian <b>Kehidupan kuliah</b> (tempat tinggal, status bekerja, bahasa Inggris), ubah bila ada yang berubah, lalu tekan <b>Simpan</b>. Menu lain terbuka setelah itu.</div>`
      : `<div class="callout" style="border-color:var(--gold)"><b>Langkah terakhir: lengkapi biodata.</b> Menu lain terbuka setelah semua kolom bertanda <span style="color:var(--bad)">*</span> terisi dan disimpan. Anda boleh menyimpan sebagian dulu lalu melanjutkan nanti.</div>`) : "";
  return `<div class="head"><div><h1>Biodata</h1><p>${mhs ? "Isian mengikuti kuesioner mahasiswa baru Prodi UPW dan mendukung butir DED 47–48 LAMWisata." : "Kolom mengikuti Tabel iLKPS dan butir DED LAMWisata tentang profil dosen dan tenaga kependidikan."}</p></div>
   ${tombol("simpanBio", "Simpan")}</div>
   ${gerbang}
   ${mhs ? `<div class="callout">Data ini rahasia dan hanya dipakai untuk penjaminan mutu internal serta akreditasi LAMWisata. Bagian <b>Keluarga dan ekonomi</b> hanya terlihat oleh Admin Prodi, dan di laporan hanya muncul sebagai rekap tanpa nama.</div>` : ""}
   ${pk.lama.length ? `<div class="auto">${pk.lama.length} kolom sudah terisi dari <b>formulir lama Anda</b> (bertanda <span class="tag t">data lama</span>). Periksa dan koreksi bila perlu, lalu tekan <b>Simpan</b>.</div>` : ""}
   <div class="panel"><div class="row" style="justify-content:space-between"><b>Kelengkapan biodata</b><span class="num" id="bioPct">${k.n} dari ${k.all} kolom · ${k.p}%</span></div><div class="bar ${k.p < 100 ? "gold" : ""}" style="margin-top:8px"><i id="bioBar" style="width:${k.p}%"></i></div>
    <p class="small" id="bioWajib" style="margin-top:6px;${k.wajib ? "color:var(--bad)" : ""}">${teksWajib(k)}${!k.wajib && k.p < 100 ? ". Anda sudah bisa melanjutkan; lengkapi kolom lain bila sempat." : "."}</p>
    <p class="small muted" style="margin-top:8px">${mhs ? `Kelas dan semester dihitung otomatis: <b>${pk.semesterMhs ? "Semester " + pk.semesterMhs + " – " : ""}Kelas ${esc(pk.data.kelas || "–")}</b>, ${esc(pk.semester.label)}. ` : ""}Kolom abu-abu diisi dari data akun. Tanda <span style="color:var(--bad)">*</span> = wajib.${pk.diubahPada ? ` Terakhir disimpan ${tgl(pk.diubahPada)}.` : ""}</p></div>
   ${kartuBiodata(pk, S.bio.data, false)}
   ${galatHtml()}<div class="row" style="justify-content:flex-end">${tombol("simpanBio", "Simpan")}</div>
   ${!mhs ? panelDokBiodata() : ""}`;
}
function perbaruiKelengkapan() {
  const k = barKelengkapan(), a = $("bioPct"), b = $("bioBar");
  if (a) a.textContent = `${k.n} dari ${k.all} kolom · ${k.p}%`;
  if (b) { b.style.width = k.p + "%"; b.parentElement.classList.toggle("gold", k.p < 100); }
  const w = $("bioWajib"); if (w) { w.textContent = teksWajib(k) + (!k.wajib && k.p < 100 ? ". Anda sudah bisa melanjutkan; lengkapi kolom lain bila sempat." : "."); w.style.color = k.wajib ? "var(--bad)" : ""; }
}

/* ---------- cari orang ---------- */
function muatDirektori() { return sekali("dir", async () => { const j = await api("direktori"); S.dir = j.orang; render(); }); }
const PERAN_PENDEK = { kps: "KPS", kalab: "Kalab", laboran: "Laboran", admin: "Admin Prodi" };
function hCari() {
  if (!S.dir) { muatDirektori(); return `<div class="memuat">Memuat direktori…</div>`; }
  const tab = S.dirTab, q = S.dirQ.trim().toLowerCase(), staf = peranAktif() !== "mahasiswa";
  const peg = S.dir.filter(x => x.jenis !== "mahasiswa"), mhs = S.dir.filter(x => x.jenis === "mahasiswa");
  const cocok = x => !q || [x.nama, x.username, x.inisial, x.bidang, x.jabTendik, x.jabfung].join(" ").toLowerCase().includes(q);
  const angk = [...new Set(mhs.map(x => x.masuk).filter(Boolean))].sort().reverse();
  const kls = [...new Set(mhs.map(x => x.kelas).filter(Boolean))].sort();
  const sel = (tab === "pegawai" ? peg : mhs).filter(cocok).filter(x => tab === "pegawai" || ((!S.dirAngk || x.masuk === S.dirAngk) && (!S.dirKelas || x.kelas === S.dirKelas)));
  const belum = x => x.aktif ? "" : ' <span class="tag" title="Akun belum diaktivasi">belum aktivasi</span>';
  muatFotoDirektori(sel.map(x => x.id));
  const fotoD = x => avatar(S.dirFoto && S.dirFoto[x.id], x.nama, 30);
  const tabel = tab === "pegawai"
    ? `<table><thead><tr><th>Nama</th><th>NIP</th><th>Jabatan</th><th>Bidang keahlian</th><th>Kontak</th></tr></thead><tbody>
      ${sel.map(x => `<tr><td><div class="row" style="gap:8px;flex-wrap:nowrap;align-items:flex-start">${fotoD(x)}<div>${esc(x.nama)}${belum(x)}<div class="small muted">${x.jenis === "dosen" ? "Dosen" + (x.inisial ? ` · <span class="mono">${esc(x.inisial)}</span>` : "") : "Tendik"}${x.peran.length ? " · " + x.peran.map(r => PERAN_PENDEK[r]).join(", ") : ""}</div></div></div></td><td class="mono small">${esc(x.username)}</td>
       <td class="small">${esc(x.jabfung || x.jabTendik || "–")}</td><td class="small">${esc(x.bidang || "–")}</td><td class="small">${x.emailKampus ? `<a href="mailto:${esc(x.emailKampus)}">${esc(x.emailKampus)}</a>` : ""}${x.hp ? `<div>${esc(x.hp)}</div>` : ""}${!x.emailKampus && !x.hp ? "–" : ""}</td></tr>`).join("") || `<tr><td colspan="5" class="empty">Tidak ada yang cocok.</td></tr>`}</tbody></table>`
    : `<table><thead><tr><th>NIM</th><th>Nama</th><th>Semester · kelas</th><th>Angkatan</th>${staf ? "<th>Status</th>" : ""}</tr></thead><tbody>
      ${sel.map(x => `<tr><td class="mono">${esc(x.username)}</td><td><div class="row" style="gap:8px;flex-wrap:nowrap">${fotoD(x)}<span>${esc(x.nama)}${belum(x)}</span></div></td><td>${x.statusMhs === "A" && x.semester ? `Semester ${x.semester} – Kelas ${esc(x.kelas)}` : "Kelas " + esc(x.kelas || "–")}</td><td class="num">${esc(x.masuk || "–")}</td>${staf ? `<td><span class="chip ${x.statusMhs === "A" ? "s-disetujui" : "s-draf"}">${esc(x.statusMhs)} · ${esc(STATUS_MHS[x.statusMhs] || "")}</span></td>` : ""}</tr>`).join("") || `<tr><td colspan="5" class="empty">Tidak ada yang cocok.</td></tr>`}</tbody></table>`;
  return `<div class="head"><div><h1>Cari orang</h1><p>Temukan dosen, tendik, dan mahasiswa, misalnya untuk memilih dosen pendamping atau anggota tim lomba. Data pribadi tidak ditampilkan di sini.</p></div></div>
   <section class="panel"><div class="row" style="justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px">
    <div class="seg" role="group" aria-label="Kelompok"><button data-act="dirTab" data-tab="pegawai" aria-pressed="${tab === "pegawai"}">Dosen dan tendik (${peg.length})</button><button data-act="dirTab" data-tab="mahasiswa" aria-pressed="${tab === "mahasiswa"}">Mahasiswa (${mhs.length})</button></div>
    <div class="row" style="flex-wrap:wrap">${tab === "mahasiswa" ? `<select id="dirAngk" aria-label="Angkatan" style="width:auto"><option value="">Semua angkatan</option>${angk.map(a => `<option ${S.dirAngk === a ? "selected" : ""}>${esc(a)}</option>`).join("")}</select>
     <select id="dirKelas" aria-label="Kelas" style="width:auto"><option value="">Semua kelas</option>${kls.map(a => `<option ${S.dirKelas === a ? "selected" : ""}>${esc(a)}</option>`).join("")}</select>` : ""}
     <input id="cariD" type="search" placeholder="${tab === "pegawai" ? "Nama, Inisial, NIP atau bidang keahlian" : "Nama atau NIM"}" value="${esc(S.dirQ)}" style="width:240px"></div></div>
    <p class="small muted" style="margin-bottom:8px">${sel.length} orang ditampilkan.</p>
    <div class="tbl-wrap">${tabel}</div></section>`;
}

/* ---------- laci tambahan (Admin) ---------- */
function laciBiodata(L) {
  const pk = L.paket;
  if (!pk.jenis) return `<p>Akun ini tidak memerlukan biodata.</p>`;
  const k = wajibKosong(pk.skema, pk.data);
  return `<p class="small muted">${k.length ? `<b style="color:var(--warn)">${k.length} kolom wajib belum diisi.</b>` : "Semua kolom wajib terisi."}${pk.diubahPada ? " Terakhir disimpan " + tgl(pk.diubahPada) + "." : " Belum pernah disimpan."}</p>
   ${pk.skema.map(g => `<section class="picker"><b>${esc(g.g)}${g.priv ? ' <span class="tag">hanya Admin</span>' : ""}</b><div class="tbl-wrap"><table><tbody>${g.f.map(f => `<tr><td class="small muted" style="width:45%">${esc(f.l)}</td><td class="small">${esc(pk.data[f.k] || "–")}</td></tr>`).join("")}</tbody></table></div></section>`).join("")}
   ${pk.riwayat && pk.riwayat.length ? `<section class="picker"><b>Riwayat per semester</b><div class="tbl-wrap"><table><thead><tr><th>Semester</th><th>Tinggal</th><th>Bekerja</th><th>B. Inggris</th></tr></thead><tbody>${pk.riwayat.map(r => `<tr><td class="small">${esc(r.label)}</td><td class="small">${esc(r.tinggal)}</td><td class="small">${esc(r.kerja)}</td><td class="small">${esc(r.inggris)}</td></tr>`).join("")}</tbody></table></div></section>` : ""}`;
}
function laciMhs(x) {
  return `<p class="small muted">Tahun masuk dan kelas menentukan semester yang dihitung otomatis dan penandaan per kelas.</p>
   <div class="grid g2" style="gap:10px"><div class="field"><label for="dmMasuk">Tahun masuk</label><input id="dmMasuk" type="number" min="2000" max="2100" value="${esc(x.masuk || "")}"></div>
    <div class="field"><label for="dmKelas">Kelas</label><input id="dmKelas" type="text" maxlength="3" value="${esc(x.kelas || "")}" placeholder="A"></div></div>
   <div class="field"><label for="dmStatus">Status mahasiswa</label><select id="dmStatus">${Object.entries(STATUS_MHS).map(([k, l]) => `<option value="${k}" ${(x.statusMhs || "A") === k ? "selected" : ""}>${k} · ${l}</option>`).join("")}</select>
    <span class="hint">Status selain Aktif tidak diminta memperbarui biodata tiap semester dan tidak dihitung sebagai mahasiswa aktif.</span></div>
   ${galatHtml()}<div class="row" style="justify-content:flex-end;margin-top:auto">${tombol("simpanMhs", "Simpan")}</div>`;
}

/* ---------- aksi ---------- */
/* Isian dibaca SEBELUM layar digambar ulang (status "Memproses…"), lalu dikembalikan bila terjadi kesalahan. */
let SNAP = {}, CENTANG = [];
function potretIsian() {
  SNAP = {}; CENTANG = [];
  document.querySelectorAll("#app input, #app textarea, #app select").forEach(el => {
    if (!el.id) { if (el.type === "checkbox" && el.checked) CENTANG.push(el.dataset); return; }
    SNAP[el.id] = el.type === "checkbox" ? el.checked : el.value;
  });
}
function kembalikanIsian() {
  Object.keys(SNAP).forEach(id => { const el = $(id); if (el && el.type !== "checkbox" && el.type !== "password") el.value = SNAP[id]; });
}
async function jalankan(fn) {
  if (S.sibuk) return;
  potretIsian();
  S.sibuk = true; S.galat = ""; render();
  let gagal = false;
  try { await fn(); } catch (e) { S.galat = e.message; gagal = true; }
  S.sibuk = false; render();
  if (gagal) kembalikanIsian();
}
const nilai = id => String((id in SNAP ? SNAP[id] : $(id)?.value) || "").trim();
const mentah = id => String((id in SNAP ? SNAP[id] : $(id)?.value) || "");
function cocok(a, b) { if (!a) throw new Error("Isi kata sandi baru."); if (a !== b) throw new Error("Kedua kata sandi tidak sama."); }
async function muatPengguna() { try { S.daftar = (await api("admin.pengguna")).pengguna; render(); } catch (e) { toast(e.message); } }

const AKSI = {
  keLupa() { S.layar = "lupa"; S.lupa = { langkah: 1, email: "" }; S.galat = ""; render(); },
  keMasuk() { S.layar = "masuk"; S.galat = ""; render(); },
  async keluar() { try { await api("keluar"); } catch (_) {} aturToken(null); bersihkanData(); S.layar = "masuk"; S.akt = { langkah: 1, email: "" }; render(); },
  aktSandi: () => jalankan(async () => { const a = mentah("p1"); cocok(a, mentah("p2")); S.pengguna = (await api("aktivasi.sandi", { sandiBaru: a })).pengguna; S.akt.langkah = 2; }),
  aktKirim: () => jalankan(async () => { const em = nilai("em"); S.akt.email = em; const j = await api("aktivasi.kirimKode", { email: em }); S.akt.terkirim = true; S.akt.kodeUji = j.kodeUji || ""; toast("Kode dikirim ke " + j.terkirimKe); }),
  aktTanpaEmail: () => jalankan(async () => { const em = nilai("em"); S.akt.email = em; S.pengguna = (await api("aktivasi.tanpaEmail", { email: em })).pengguna; S.view = S.pengguna.perluBiodata ? "biodata" : "beranda"; toast("Akun aktif. Selamat datang!"); }),
  vemKirim: () => jalankan(async () => { const em = nilai("vem"); S.vem.email = em; const j = await api("email.kirimKode", { email: em }); S.vem.terkirim = true; S.vem.kodeUji = j.kodeUji || ""; toast("Kode dikirim ke " + j.terkirimKe); }),
  vemVerif: () => jalankan(async () => { S.pengguna = (await api("email.verifikasi", { kode: nilai("vkode") })).pengguna; S.vem = null; toast("Email terverifikasi. Terima kasih!"); }),
  aktVerif: () => jalankan(async () => { S.pengguna = (await api("aktivasi.verifikasi", { kode: nilai("kode") })).pengguna; S.view = S.pengguna.perluBiodata ? "biodata" : "beranda"; toast("Akun aktif. Selamat datang!"); }),
  lupaKirim: () => jalankan(async () => { S.lupa.email = nilai("le"); if (!S.lupa.email) throw new Error("Isi email terdaftar."); const j = await api("lupa.kirimKode", { email: S.lupa.email }); S.lupa.langkah = 2; S.lupa.kodeUji = j.kodeUji || ""; }),
  lupaReset: () => jalankan(async () => { const a = mentah("l1"); cocok(a, mentah("l2")); const j = await api("lupa.reset", { email: S.lupa.email, kode: nilai("lk"), sandiBaru: a }); S.layar = "masuk"; toast(j.pesan); }),
  gantiWajib: () => jalankan(async () => { const a = mentah("g1"); cocok(a, mentah("g2")); S.pengguna = (await api("ganti.sandi", { sandiBaru: a })).pengguna; toast("Kata sandi tersimpan."); }),
  gantiSandi: () => jalankan(async () => { const a = mentah("a1"); cocok(a, mentah("a2")); S.pengguna = (await api("ganti.sandi", { sandiLama: mentah("a0"), sandiBaru: a })).pengguna; toast("Kata sandi berhasil diganti."); }),
  impor: () => jalankan(async () => {
    S.impor.teks = mentah("imporTeks");
    const baris = S.impor.teks.split(/\r?\n/).map(x => x.trim()).filter(Boolean).map(x => {
      const c = x.split(/\t|;/).map(y => y.trim());
      // NIM; Nama; tahun masuk; kelas  |  NIM; Nama; kelas (tahun masuk dari 2 angka pertama NIM)  |  NIP; Nama; peran
      if (/^\d{4}$/.test(c[2] || "")) return { username: c[0], nama: c[1], peran: "mahasiswa", masuk: c[2], kelas: c[3] || "" };
      if (/^[A-Za-z0-9]{1,3}$/.test(c[2] || "") && !c[3] && !PERAN_L[(c[2] || "").toLowerCase()]) return { username: c[0], nama: c[1], peran: "mahasiswa", masuk: "", kelas: c[2] };
      return { username: c[0], nama: c[1], peran: c[2] || "mahasiswa", masuk: c[3] || "", kelas: c[4] || "" };
    });
    if (!baris.length) throw new Error("Tempel minimal satu baris data.");
    S.impor.hasil = await api("admin.impor", { baris }); S.impor.teks = ""; S.daftar = null; toast(S.impor.hasil.diimpor + " akun diimpor.");
  }),
  muatUlang() { S.daftar = null; render(); },
  muatLog() { S.log = null; render(); },
  laciPeran(d) { S.laci = { jenis: "peran", id: d.id }; S.galat = ""; render(); },
  resetSandi: d => jalankan(async () => { const x = S.daftar.find(y => y.id === d.id); const j = await api("admin.resetSandi", { userId: d.id }); S.laci = { jenis: "sandi", nama: x.nama, sandi: j.sandiSementara }; }),
  simpanPeran: () => jalankan(async () => { const peran = CENTANG.filter(x => x.peran).map(x => x.peran); await api("admin.peran", { userId: S.laci.id, peran }); S.laci = null; S.daftar = null; toast("Peran disimpan."); }),
  simpanBio: () => jalankan(async () => {
    const j = await api("biodata.simpan", { data: S.bio.data });
    const tadinya = S.pengguna.perluBiodata;
    S.bio = { paket: j.biodata, data: Object.assign({}, j.biodata.data), lain: {} }; S.pengguna = j.pengguna; S.dir = null;
    if (j.biodata.kurang.length) toast(`Tersimpan. ${j.biodata.kurang.length} kolom wajib belum diisi, misalnya "${j.biodata.kurang[0]}".`);
    else if (tadinya && !S.pengguna.perluBiodata) { toast("Biodata lengkap. Semua menu sudah terbuka."); S.view = "beranda"; }
    else toast("Biodata tersimpan.");
  }),
  dirTab(d) { S.dirTab = d.tab; S.dirQ = ""; render(); },
  lihatBio: d => jalankan(async () => { const j = await api("biodata.lihat", { userId: d.id }); S.laci = { jenis: "bio", id: d.id, paket: j.biodata }; }),
  laciMhs(d) { S.laci = { jenis: "mhs", id: d.id }; S.galat = ""; render(); },
  simpanMhs: () => jalankan(async () => {
    await api("admin.ubahMhs", { userId: S.laci.id, masuk: nilai("dmMasuk"), kelas: nilai("dmKelas"), statusMhs: nilai("dmStatus") });
    S.laci = null; S.daftar = null; S.dir = null; toast("Data mahasiswa disimpan.");
  }),
  salinSandi() { navigator.clipboard?.writeText(S.laci.sandi).then(() => toast("Disalin."), () => toast("Pilih teksnya lalu salin manual.")); },
  tutup() { if (!bolehTutup()) return; S.laci = null; S.galat = ""; render(); },
  tutupLuar(d, e) { if (e.target === e.currentTarget || e.target.classList.contains("overlay")) { if (!bolehTutup()) return; S.laci = null; render(); } }
};

document.addEventListener("click", e => {
  const b = e.target.closest("[data-go],[data-act]"); if (!b) return;
  if (b.tagName === "A" && b.getAttribute("href") === "#") e.preventDefault();
  if (b.dataset.go) { S.view = b.dataset.go; S.galat = ""; S.laci = null; if (b.dataset.go === "penilaian") S.nilai = null; /* penilaian bergantung pada hampir semua data: selalu hitung ulang */ render(); window.scrollTo(0, 0); return; }
  const a = AKSI[b.dataset.act];
  if (a) { if (b.dataset.act === "tutupLuar" && e.target !== b) return; a(b.dataset, e); }
});
document.addEventListener("submit", e => {
  if (e.target.id !== "fMasuk") return;
  e.preventDefault();
  jalankan(async () => {
    const j = await api("masuk", { username: nilai("mu"), sandi: mentah("ms"), perangkat: navigator.userAgent });
    aturToken(j.token); S.pengguna = j.pengguna; S.view = "beranda"; S.akt = { langkah: j.pengguna.perluAktivasi && !j.pengguna.wajibGanti ? 2 : 1, email: "" };
  });
});
document.addEventListener("change", e => {
  const t = e.target;
  if (t.id === "peranSel") { S.peran = t.value; ls.set("peran", S.peran); S.view = "beranda"; S.ref = null; S.keg = null; S.tugas = null; S.verif = null; S.kegLingkup = "saya"; S.laci = null; render(); return; }
  if (t.id === "dirAngk") { S.dirAngk = t.value; render(); return; }
  if (t.id === "dirKelas") { S.dirKelas = t.value; render(); return; }
  if (t.tagName === "SELECT" && t.dataset.bk && S.bio) {
    const k = t.dataset.bk;
    if (t.value === LAIN) { S.bio.lain[k] = true; S.bio.data[k] = ""; }
    else { S.bio.lain[k] = false; S.bio.data[k] = t.value; }
    if (t.dataset.prov) S.bio.paket.skema.flatMap(g => g.f).filter(f => f.p === k).forEach(f => { S.bio.data[f.k] = ""; });
    render();
    const fokus = $(t.value === LAIN ? t.id + "-lain" : t.id); if (fokus) fokus.focus();
  }
});
function ketikUlang(id, fn) { return e => { if (e.target.id !== id) return; fn(e.target.value); const pos = e.target.selectionStart; render(); const el = $(id); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (_) {} } }; }
document.addEventListener("input", ketikUlang("cariP", v => { S.cari = v; }));
document.addEventListener("input", ketikUlang("cariD", v => { S.dirQ = v; }));
document.addEventListener("input", e => {
  const t = e.target; if (!S.bio) return;
  if (t.dataset.bkLain) { S.bio.data[t.dataset.bkLain] = t.value; perbaruiKelengkapan(); return; }
  if (t.dataset.bk && t.tagName === "INPUT") {
    S.bio.data[t.dataset.bk] = t.value; perbaruiKelengkapan();
    if (["pendS1", "pendS2", "pendS3", "serdos", "sertKomp"].includes(t.dataset.bk)) segarkanDokBio();
    if (t.type === "date" && t.value) {
      let h = t.parentElement.querySelector(".hint");
      if (!h) { h = document.createElement("span"); h.className = "hint"; t.after(h); }
      h.innerHTML = `Usia saat ini: <b>${usia(t.value)} tahun</b> (dihitung otomatis)`;
    }
  }
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && S.laci) { S.laci = null; render(); } });

/* ---------- kegiatan dan surat tugas (v0.3.0) ---------- */
/* Isian formulir disimpan di S.form setiap kali diketik/dipilih. Kotak teks TIDAK menggambar ulang layar (agar klik tombol tidak hilang);
   hanya pratinjau surat dan saran GCET yang diperbarui di tempat. Pilihan, centang, dan tombol menggambar ulang. */
const ST_L = { draf_aju: ["Draf pengajuan", "s-draf"], menunggu_kps: ["Menunggu KPS", "s-diajukan"], ditunda: ["Ditunda KPS", "s-revisi"],
  revisi_aju: ["Perlu revisi pengajuan", "s-revisi"], ditolak_aju: ["Pengajuan ditolak", "s-ditolak"], terbit: ["Surat terbit", "s-disetujui"] };
const STATUS_L = { draf: ["Draf", "s-draf"], diajukan: ["Menunggu verifikasi data", "s-diajukan"], diajukan_ulang: ["Diajukan ulang", "s-diajukan"], revisi: ["Perlu revisi data", "s-revisi"],
  disetujui: ["Data disetujui", "s-disetujui"], ditolak: ["Data ditolak", "s-ditolak"] };
const AKSI_L = { buat: "Membuat catatan kegiatan", ajukan: "Mengajukan", ajukan_ulang: "Mengajukan ulang", terbit: "Menyetujui; surat terbit",
  ditunda: "Menunda pengajuan", revisi_aju: "Meminta revisi", ditolak_aju: "Menolak pengajuan",
  bukti: "Mengunggah bukti", bukti_batal: "Membatalkan bukti", ajukan_data: "Diajukan untuk verifikasi data", ajukan_ulang_data: "Mengajukan ulang data",
  akreditasi: "Melengkapi data akreditasi", disetujui: "Menyetujui data", revisi: "Meminta revisi data", ditolak: "Menolak data", hapus_sa: "Menghapus kegiatan (Super Admin)", pulihkan: "Memulihkan kegiatan" };
const PERAN_KEG = ["mahasiswa", "dosen", "tendik", "kalab", "laboran", "kps", "admin", "superadmin"];
const lihatSemuaKeg = () => ["superadmin", "admin", "kps"].includes(peranAktif());
function chipKeg(k) {
  let l, c;
  if (k.st !== "tanpa" && k.st !== "terbit") [l, c] = ST_L[k.st] || [k.st, "s-draf"];
  else if (k.status === "draf" && k.st === "terbit") [l, c] = k.terlambat ? [`Bukti terlambat ${k.buktiAda}/${k.buktiPerlu}`, "s-ditolak"] : [`Lengkapi bukti ${k.buktiAda}/${k.buktiPerlu}`, "s-revisi"];
  else if (k.status === "draf") [l, c] = [`Draf · bukti ${k.buktiAda}/${k.buktiPerlu}`, "s-draf"];
  else [l, c] = STATUS_L[k.status] || [k.status, "s-draf"];
  return `<span class="chip ${c}">${l}</span>`;
}
const keTgl = s => new Date(s + "T12:00:00");
const tglPanjang = s => s ? keTgl(s).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
const tglPendek = s => s ? keTgl(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "–";
const tglSurat = s => keTgl(s).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
const rentang = (a, b) => !a ? "" : !b || b === a ? tglPanjang(a) : tglPanjang(a) + " – " + tglPanjang(b);
const rentangPendek = (a, b) => !a ? "Tanggal belum diisi" : !b || b === a ? tglPendek(a) : tglPendek(a) + " – " + tglPendek(b);
function semesterDari(t) { if (!t) return null; const [y, m] = t.split("-").map(Number); const g = m >= 7, a = g ? y : y - 1; return { label: (g ? "Ganjil " : "Genap ") + a + "/" + (a + 1), awal: a, ganjil: g }; }
const smtMhs = (masuk, s) => { if (!masuk || !s) return null; const n = 2 * (s.awal - masuk) + (s.ganjil ? 1 : 2); return n > 0 ? n : null; };
const nipTampil = n => /^\d{18}$/.test(n) ? n.slice(0, 8) + " " + n.slice(8, 14) + " " + n.slice(14, 15) + " " + n.slice(15) : n;
const namaPendek = n => String(n || "").split(",")[0];

async function muatRef() {
  return sekali("ref", async () => { S.ref = await api("kegiatan.ref", { peran: peranAktif() }); render(); });
}
async function muatKeg() {
  return sekali("keg", async () => { S.keg = (await api("kegiatan.daftar", { lingkup: S.kegLingkup })).kegiatan; render(); });
}
async function muatTugas() {
  return sekali("tugas", async () => { S.tugas = await api("tugas.saya"); render(); });
}
async function muatVerif() {
  return sekali("verif", async () => { S.verif = (await api("verifikasi.antrean")).kegiatan; render(); });
}
/** Setelah ada perubahan data: muat ulang daftar, antrean, dan pengingat saat dibutuhkan. */
function segarkan() { S.sdata = null; S.mskAdm = null; S.rkep = null; S.lab = null; S.dokd = null; S.dokBio = null; S.sdos = null; S.bank = null; S.mkp = null; S.mkpRekap = null; S.keg = null; S.antrean = null; S.verif = null; S.tugas = null; S.ttd = null; S.porto = null; S.ilkps = null; S.nilai = null; }
async function muatAntrean() {
  return sekali("antrean", async () => { S.antrean = (await api("kps.antrean")).kegiatan; render(); });
}

/* --- kalimat surat (dipakai pratinjau formulir dan kertas surat) --- */
const kosong = ph => `<mark class="isi-kosong">[${ph}]</mark>`;
const isiT = (v, ph) => v && String(v).trim() ? esc(String(v).trim()) : kosong(ph);
function unsur(peg) { const d = peg.some(p => p.jenis === "dosen"), t = peg.some(p => p.jenis === "tendik"); return d && t ? "dosen dan tenaga kependidikan" : t ? "tenaga kependidikan" : "dosen"; }
function kalimatMhs(i) {
  return `Sehubungan dengan rencana pelaksanaan ${isiT(i.judul, "nama kegiatan")} pada hari ${i.tgl ? esc(rentang(i.tgl, i.sampai)) : kosong("tanggal")}${i.aktivitas && i.aktivitas.trim() ? " " + esc(i.aktivitas.trim()) : ""} di ${isiT(i.tempat, "tempat")}${i.ket && i.ket.trim() ? " (" + esc(i.ket.trim()) + ")" : ""}. Melalui surat ini kami mohon untuk dapat dibuatkan surat penugasan kepada mahasiswa dengan nama-nama terlampir.`;
}
const kalimatDosen = (set, peg) => `Mohon bantuan ${esc(set.sapaanDosen)} untuk menerbitkan surat penugasan untuk ${unsur(peg)} dengan nama terlampir:`;
const barisDosen = (i, set, n) => [["Unit Kerja", esc(set.unit)], ["Bentuk Kegiatan", isiT(i.bentuk, "bentuk kegiatan")], ["Kegiatan", isiT(i.kegDosen || i.judul, "kegiatan")],
  ["Hari/Tanggal", i.tgl ? esc(rentang(i.tgl, i.sampai)) : kosong("tanggal")], ["Tempat", isiT(i.tempat, "tempat")], ["Peserta", "Terlampir (" + n + " orang)"]];
const tabelBaris = rows => `<table class="surat-baris">${rows.map(([a, b]) => `<tr><td>${a}</td><td>:</td><td>${b}</td></tr>`).join("")}</table>`;

function kertasSurat(k, jenis) {
  const L = k.lampiran, i = L.isi, set = L.set, dsn = jenis === "dosen", terbit = k.st === "terbit";
  const tg = terbit ? L.tglSurat : (S.ref ? S.ref.hariIni : new Date().toISOString().slice(0, 10));
  const kps = L.kps || { nama: "[nama Koordinator Program Studi]", nip: "–" };
  const url = location.origin + location.pathname + "?cek=" + encodeURIComponent(k.kodeSurat || "");
  const gbr = terbit && L.ttd ? S.ttdSurat[k.id] : "";
  const ttd = `<div class="ttd">${dsn ? "Koordinator Program Studi Usaha Perjalanan Wisata" : "Koordinator Program Studi<br>Usaha Perjalanan Wisata (UPW)"}
    ${terbit ? `<div class="ttd-area">${gbr ? `<img class="ttd-img" src="${gbr}" alt="Tanda tangan ${esc(kps.nama)}">` : ""}</div>` : `<div class="draf-ttd">DRAF: belum disetujui KPS</div>`}
    <div class="ttd-nama"><b><u>${esc(kps.nama)}</u></b><br>NIP. ${esc(nipTampil(kps.nip))}</div>
    ${terbit ? `<div class="sah-baris"><div class="qr">${window.UPW_QR ? UPW_QR.svg(url) : ""}</div><div class="sah">Disetujui secara elektronik melalui Repositori UPW pada ${esc(tglSurat(tg))}.<br>Kode verifikasi: <b>${esc(k.kodeSurat)}</b><br>Pindai QR atau buka: ${esc(url)}</div></div>` : ""}</div>`;
  const isi = dsn
    ? `<p>Kepada Yth.<br>${esc(set.tujuanDosen)}<br>Politeknik Pariwisata Bali<br>di - Tempat</p><p style="margin-top:12px">Dengan hormat,<br>${kalimatDosen(set, L.pegawai)}</p>
       ${tabelBaris(barisDosen(i, set, L.pegawai.length))}<p>Demikian kami sampaikan, atas bantuan dan kerja samanya kami ucapkan terima kasih.</p>`
    : `<p>Kepada,<br>Yth. ${esc(set.tujuanMhs)}<br>Di-<br>tempat</p><p style="margin-top:12px">Dengan hormat,</p><p style="text-align:justify">${kalimatMhs(i)}</p>
       <p>Demikian yang kami sampaikan, atas perhatian dan kerja samanya kami ucapkan terima kasih.</p>`;
  const kepala = h => `<thead><tr>${h.map(x => `<th>${x}</th>`).join("")}</tr></thead>`;
  const lamp = dsn
    ? `<table class="lamp">${kepala(["No", "NIP / NIDN / ID", "Nama"])}<tbody>${L.pegawai.map((d, n) => `<tr><td class="c">${n + 1}</td><td>${esc(nipTampil(d.nip))}</td><td>${esc(d.nama)}</td></tr>`).join("")}</tbody></table>`
    : `<table class="lamp">${kepala(["No", "NIM", "Nama", "Semester", "Kelas"])}<tbody>${L.mhs.map((s, n) => `<tr><td class="c">${n + 1}</td><td>${esc(s.nim)}</td><td>${esc(s.nama)}</td><td class="c">${esc(s.semester || "–")}</td><td class="c">${esc(s.kelas)}</td></tr>`).join("")}</tbody></table>`;
  const tanda = terbit ? "" : `<div class="draf-tanda">DRAF</div>`;
  return `<div class="kertas">${tanda}<p style="text-align:right">${esc(set.tempat)}, ${esc(tglSurat(tg))}</p>${isi}${ttd}</div>
    <div class="kertas">${tanda}<p style="font-size:10pt;color:#444">Lampiran surat ${terbit ? "dengan kode verifikasi " + esc(k.kodeSurat) : "(kode verifikasi terbit setelah disetujui KPS)"}</p>
     <p style="text-align:center;font-weight:700;margin:6px 0 12px">Daftar ${dsn ? (unsur(L.pegawai) === "dosen" ? "Dosen" : "Dosen dan Tenaga Kependidikan") : "Mahasiswa"} yang Ditugaskan<br>${esc(i.judul)}</p>${lamp}</div>`;
}
function cetakSurat(html) {
  let c = $("cetak");
  if (!c) { c = document.createElement("div"); c.id = "cetak"; document.body.appendChild(c); }
  c.innerHTML = html; window.print();
}

/* --- daftar kegiatan --- */
function hKegiatan() {
  if (!S.ref) { muatRef(); return `<div class="memuat">Memuat…</div>`; }
  if (!S.keg) { muatKeg(); return `<div class="memuat">Memuat kegiatan…</div>`; }
  const q = S.kegQ.trim().toLowerCase();
  const l = S.keg.filter(k => !q || [k.judul, k.jenisLabel, k.olehNama, k.tempat, k.kodeSurat].join(" ").toLowerCase().includes(q));
  return `<div class="head"><div><h1>Kegiatan</h1><p>Catat kegiatan dan ajukan surat tugas ke KPS. Kegiatan tempat Anda ditandai (sebagai dosen, tendik, atau mahasiswa) juga muncul di sini.</p></div>
    ${S.ref.kelompok ? `<button class="btn primary" data-act="kegBaru">+ Catat kegiatan</button>` : ""}</div>
   <section class="panel"><div class="row" style="justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px">
    ${lihatSemuaKeg() ? `<div class="seg" role="group" aria-label="Lingkup"><button data-act="kegLingkup" data-l="saya" aria-pressed="${S.kegLingkup === "saya"}">Kegiatan saya</button><button data-act="kegLingkup" data-l="semua" aria-pressed="${S.kegLingkup === "semua"}">Semua kegiatan</button></div>` : "<span></span>"}
    <div class="row"><input id="cariK" type="search" placeholder="Cari judul, jenis, pengaju, kode surat" value="${esc(S.kegQ)}" style="width:260px"><button class="btn sm" data-act="kegMuatUlang">Muat ulang</button></div></div>
    <div class="list">${l.map(k => `<div class="item" style="cursor:pointer" data-act="bukaKeg" data-id="${k.id}"><div class="body">
      <div class="row" style="justify-content:space-between;gap:8px"><div class="title">${esc(k.judul)}</div>${chipKeg(k)}</div>
      <div class="meta"><span>${esc(k.jenisLabel)}</span><span class="num">${esc(rentangPendek(k.tgl, k.sampai))}</span>${k.tempat ? `<span>${esc(k.tempat)}</span>` : ""}${k.semester ? `<span>${esc(k.semester)}</span>` : ""}
       <span>${k.milikSaya ? "Anda pengaju" : "Pengaju: " + esc(namaPendek(k.olehNama))}</span><span>${k.jumlahPegawai} dosen/tendik · ${k.jumlahMhs} mahasiswa</span></div></div></div>`).join("")
      || `<div class="empty">${q ? "Tidak ada yang cocok." : "Belum ada kegiatan. Tekan <b>+ Catat kegiatan</b> untuk mulai."}</div>`}</div></section>`;
}

/* --- detail --- */
function langkahKeg(k) {
  const sd = { draf: 0, revisi: 0, diajukan: 1, diajukan_ulang: 1, ditolak: 1, disetujui: 2 }[k.status] || 0;
  const L = k.st === "tanpa" ? ["Catat dan unggah bukti", "Verifikasi data", "Data disetujui"] : ["Pengajuan", "Verifikasi KPS", "Surat terbit", "Pelengkapan bukti", "Verifikasi data", "Data disetujui"];
  const cur = k.st === "tanpa" ? sd : ["draf_aju", "revisi_aju"].includes(k.st) ? 0 : k.st === "terbit" ? 3 + sd : 1;
  return `<div class="row" style="gap:4px;flex-wrap:wrap">${L.map((s, i) => `<span class="tag ${i <= cur ? "t" : ""}" style="${i === cur ? "font-weight:800" : ""}">${i < cur ? "✓ " : ""}${i + 1}. ${s}</span>`).join("")}</div>`;
}
function keteranganKeg(k) {
  if (k.st === "terbit" || k.st === "tanpa") return keteranganData(k);
  const terakhir = [...k.riwayat].reverse().find(r => ["ditunda", "revisi_aju", "ditolak_aju"].includes(r.aksi));
  const cat = terakhir && k.st === terakhir.aksi ? `<div style="margin-top:6px"><b>Catatan KPS:</b> ${esc(terakhir.catatan)}</div>` : "";
  const t = { draf_aju: "Draf pengajuan belum dikirim ke KPS.", menunggu_kps: "Menunggu verifikasi KPS. Surat pengantar terbit otomatis setelah disetujui.",
    ditunda: "KPS menunda pengajuan ini. Perbaiki sesuai catatan, lalu kirim ulang.", revisi_aju: "KPS meminta perbaikan pengajuan. Ubah sesuai catatan, lalu kirim ulang.",
    ditolak_aju: "Pengajuan ditolak KPS." }[k.st] || "";
  return `<div class="callout">${chipKeg(k)} ${t}${cat}</div>`;
}
const tglJam = s => s ? new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "";
function keteranganData(k) {
  const v = esc(k.verifikator || "verifikator"), r = [...k.riwayat].reverse().find(x => ["revisi", "ditolak"].includes(x.aksi));
  const cat = r && k.status === r.aksi ? `<div style="margin-top:6px"><b>Catatan ${esc(namaPendek(r.oleh))}:</b> ${esc(r.catatan)}</div>` : "";
  const surat = k.st === "terbit" ? `Surat pengantar KPS terbit ${tglJam(k.tglSurat)}; unduh PDF-nya untuk diajukan ke bagian administrasi. ` : "";
  const t = { draf: k.st === "terbit" ? `Lengkapi bukti di bawah paling lambat <b>${esc(tglPendek(k.batas))}</b> (${k.hk} hari kerja setelah kegiatan selesai). Cukup satu orang mengunggah tiap dokumen. Setelah semua bukti wajib ada, data otomatis diajukan untuk diverifikasi ${v}.`
      : `Unggah bukti di bawah, lalu tekan <b>Ajukan verifikasi</b>. Data diverifikasi ${v}.`,
    diajukan: `Menunggu verifikasi data oleh ${v}.`, diajukan_ulang: `Diajukan ulang; menunggu verifikasi data oleh ${v}.`,
    revisi: "Verifikator meminta perbaikan. Perbaiki bukti atau data sesuai catatan, lalu tekan <b>Ajukan ulang</b>.",
    disetujui: `Data disetujui${k.verifNama ? " oleh " + esc(namaPendek(k.verifNama)) : ""}${k.tglVerif ? " pada " + tglJam(k.tglVerif) : ""}. Kegiatan ini masuk data akreditasi.`,
    ditolak: "Data ditolak verifikator." }[k.status] || "";
  return `<div class="callout">${chipKeg(k)} ${surat}${t}${cat}</div>`;
}
function laciDetail() {
  const L = S.laci, k = L.k;
  if (!k) return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Detail kegiatan"><div class="memuat">Memuat…</div></div></div>`;
  const lp = k.lampiran, isian = Object.entries(k.isian || {});
  const baris = [["Jenis", esc(k.jenisLabel) + (k.jenisLain ? " · " + esc(k.jenisLain) : "") + (k.tabel ? ` <span class="tag t">${esc(k.tabel)}</span>` : "")],
    ["Tanggal", esc(rentang(k.tgl, k.sampai) || "–")], ["Semester", esc(k.semester || "–")], ["Tingkat", esc(k.tingkat || "–")], ["Pengaju", esc(k.olehNama)],
    ...(k.perluST ? [["Tempat", esc(k.tempat || "–")]] : []), ...isian.map(([a, b]) => [esc(a), esc(b)]),
    ...(k.gcet.length ? [["Pasal GCET", k.gcet.map(n => "pasal " + n).join(", ")]] : []),
    ...(k.kodeSurat ? [["Kode verifikasi surat", `<span class="mono">${esc(k.kodeSurat)}</span>`]] : [])];
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Detail kegiatan" style="width:min(680px,100%)">
   <div class="dh"><h2>${esc(k.judul)}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   ${langkahKeg(k)}${keteranganKeg(k)}
   ${lp.surat.dosen || lp.surat.mhs ? `<div class="row">${lp.surat.dosen ? `<button class="btn sm" data-act="lihatSurat" data-w="dosen">${k.st === "terbit" ? "Surat dosen/tendik (PDF)" : "Draf surat dosen/tendik"}</button>` : ""}${lp.surat.mhs ? `<button class="btn sm" data-act="lihatSurat" data-w="mhs">${k.st === "terbit" ? "Surat mahasiswa (PDF)" : "Draf surat mahasiswa"}</button>` : ""}</div>` : ""}
   <div class="tbl-wrap"><table><tbody>${baris.map(([a, b]) => `<tr><td class="small muted" style="width:34%">${a}</td><td class="small">${b}</td></tr>`).join("")}</tbody></table></div>
   <div><h3>Dosen dan tendik (${lp.pegawai.length})</h3><div class="chips" style="margin-top:6px">${lp.pegawai.map(p => `<span class="pchip">${esc(namaPendek(p.nama))} <span class="muted small">${p.jenis === "tendik" ? "tendik" : ""}</span>&nbsp;</span>`).join("") || '<span class="muted small">–</span>'}</div></div>
   <div><h3>Mahasiswa (${lp.mhs.length})</h3>${lp.mhs.length ? `<details style="margin-top:6px"><summary class="small" style="cursor:pointer">Lihat daftar nama</summary><div class="tbl-wrap" style="margin-top:6px"><table><thead><tr><th>NIM</th><th>Nama</th><th>Smt</th><th>Kelas</th></tr></thead><tbody>${lp.mhs.map(m => `<tr><td class="mono small">${esc(m.nim)}</td><td class="small">${esc(m.nama)}</td><td class="small">${esc(m.semester || "–")}</td><td class="small">${esc(m.kelas)}</td></tr>`).join("")}</tbody></table></div></details>` : '<span class="muted small">–</span>'}</div>
   ${blokBukti(k)}
   ${k.bisaVerifikasi ? `<div class="picker" style="border-color:var(--brand)"><b>Verifikasi data</b><span class="small muted">Periksa bukti dan isian di atas. Data yang disetujui masuk data akreditasi (Tabel iLKPS).</span>
     <div class="field"><label for="vCat">Catatan untuk pengunggah</label><textarea id="vCat" placeholder="Wajib diisi bila meminta revisi atau menolak"></textarea></div>
     <div class="row" style="flex-wrap:wrap">${tombol("verPutus", "Setujui data", "ok sm", 'data-k="disetujui"')}${tombol("verPutus", "Minta revisi", "warn sm", 'data-k="revisi"')}${tombol("verPutus", "Tolak", "bad sm", 'data-k="ditolak"')}</div></div>` : ""}
   <div><h3>Riwayat</h3><div class="list" style="margin-top:6px">${k.riwayat.map(r => `<div class="item"><div class="body"><div class="small"><b>${esc(AKSI_L[r.aksi] || r.aksi)}</b> · ${esc(namaPendek(r.oleh))}</div><div class="meta"><span class="num">${tgl(r.waktu)}</span></div>${r.catatan ? `<div class="small" style="margin-top:4px">${esc(r.catatan)}</div>` : ""}</div></div>`).join("")}</div></div>
   ${galatHtml()}
   ${k.bisaUbah || k.bisaHapus || k.bisaAjukanData || k.bisaUbahAkreditasi ? `<div class="row" style="justify-content:flex-end;margin-top:auto;flex-wrap:wrap">${k.bisaHapus ? tombol("hapusKeg", "Hapus draf", "bad") : ""}${k.bisaUbahAkreditasi ? tombol("ubahAkred", "Lengkapi data akreditasi", "") : ""}${k.bisaUbah ? tombol("ubahKeg", ["revisi_aju", "ditunda"].includes(k.st) ? "Perbaiki dan kirim ulang" : "Ubah", k.bisaAjukanData ? "" : "primary") : ""}${k.bisaAjukanData ? tombol("ajukanData", k.status === "revisi" ? "Ajukan ulang" : "Ajukan verifikasi") : ""}</div>` : ""}
  </div></div>`;
}
const ukuranT = n => n >= 1048576 ? (n / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
const TERIMA = ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx";
function blokBukti(k) {
  if (!k.slot || !k.slot.length) return "";
  const bm = S.laci.bm, dis = S.sibuk ? "disabled" : "";
  const baris = k.slot.map(s => {
    const e = s.isi;
    const ket = e ? (e.t === "file" ? `${esc(e.nama)} · ${ukuranT(e.ukuran)}` : e.t === "tautan" ? `Tautan: <a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${esc(e.url.length > 60 ? e.url.slice(0, 57) + "…" : e.url)}</a>` : `Tidak tersedia: ${esc(e.ket)}`)
      + ` · ${esc(namaPendek(e.oleh))}, ${tglJam(e.w)}` : esc(s.h);
    let aksi;
    if (e) aksi = `${e.t !== "ket" ? `<button class="btn sm" data-act="lihatBk" data-slot="${s.k}" ${dis}>${e.t === "tautan" ? "Buka" : "Lihat"}</button>` : ""}${e.bisaBatal ? `<button class="btn sm bad" data-act="batalBk" data-slot="${s.k}" ${dis}>Batalkan</button>` : ""}<span class="chip s-disetujui">Ada</span>`;
    else if (k.bisaUnggah) aksi = `<label class="btn sm" ${S.sibuk ? 'aria-disabled="true"' : ""}>Unggah file<input type="file" data-bfile="${s.k}" accept="${TERIMA}" hidden ${dis}></label><button class="btn sm" data-act="bkMode" data-slot="${s.k}" data-m="tautan" ${dis}>Tautan</button>${s.opsional ? "" : `<button class="btn sm" data-act="bkMode" data-slot="${s.k}" data-m="ket" ${dis}>Tidak ada</button>`}`;
    else aksi = s.opsional ? `<span class="small muted">–</span>` : `<span class="chip s-revisi">Belum</span>`;
    const form = bm && bm.slot === s.k ? `<div class="row" style="margin-top:6px;flex-wrap:nowrap">${bm.m === "tautan"
        ? `<input id="bkIsi" type="url" inputmode="url" placeholder="https://drive.google.com/…" aria-label="Tautan ${esc(s.l)}">`
        : `<input id="bkIsi" type="text" placeholder="Alasan, misalnya: lomba daring, tidak ada daftar hadir" aria-label="Alasan ${esc(s.l)} tidak tersedia">`}
        ${tombol("simpanBk", "Simpan", "primary sm")}<button class="btn sm" data-act="bkMode" data-slot="">Batal</button></div>
        <span class="hint">${bm.m === "tautan" ? "Pastikan tautan Google Drive bisa dibuka oleh akun prodi (upw@ppb.ac.id) atau siapa saja dengan tautan." : "Verifikator akan menilai apakah alasan ini dapat diterima."}</span>` : "";
    return `<div class="item bk"><div class="body"><div class="title" style="font-weight:600">${esc(s.l)}</div><div class="meta"><span>${ket}</span></div>${form}</div><div class="row bk-aksi">${aksi}</div></div>`;
  }).join("");
  return `<div><div class="row" style="justify-content:space-between;flex-wrap:wrap"><h3>Bukti kegiatan (${k.buktiAda}/${k.buktiPerlu})</h3>
     ${k.batas ? `<span class="small" style="${k.terlambat ? "color:var(--bad);font-weight:700" : "color:var(--muted)"}">${k.terlambat ? "Terlambat · " : ""}Batas: ${esc(tglPendek(k.batas))} (${k.hk} hari kerja setelah selesai)</span>` : ""}</div>
    ${k.bisaUnggah ? `<p class="small muted" style="margin-top:4px">Satu dokumen cukup diunggah sekali oleh siapa pun yang terlibat; setelah terunggah, dokumen terkunci dan hanya pengunggahnya yang bisa membatalkan. File maks. 10 MB (PDF, gambar, Word, Excel, PowerPoint); video atau album: pakai <b>Tautan</b>.</p>` : ""}
    <div class="list" style="margin-top:6px">${baris}</div></div>`;
}

/* --- data akreditasi setelah surat terbit --- */
function laciAkred() {
  const k = Object.assign({}, S.laci.k, S.laci.draf || {}), def = S.ref.jenis.find(j => j.k === k.jenis) || { fx: [] };
  const fx = def.fx.map((x, n) => `<div class="field"><label for="ak${n}">${esc(x.l)}</label><input id="ak${n}" data-akfx="${esc(x.l)}" type="text" value="${esc(k.isian[x.l] || "")}" ${x.t === "sel" ? `list="akl${n}"` : `placeholder="${esc(x.ph || "")}"`}>
    ${x.t === "sel" ? `<datalist id="akl${n}">${x.o.map(o => `<option value="${esc(o)}">`).join("")}</datalist><span class="hint">Pilih dari daftar atau tulis jawaban lain.</span>` : ""}</div>`).join("");
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Data akreditasi" style="width:min(640px,100%)">
   <div class="dh"><h2>Data akreditasi</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   <p class="small muted">${esc(k.judul)}. Isi surat yang sudah terbit tidak berubah; yang diperbarui hanya data untuk akreditasi.</p>
   <div class="field"><label for="akTingkat">Tingkat${wajib}</label><select id="akTingkat"><option value="">Pilih…</option>${S.ref.tingkat.map(x => `<option ${k.tingkat === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
   ${fx ? `<div class="grid g2" style="gap:12px">${fx}</div>` : ""}
   <div class="picker"><b>Pasal Global Code of Ethics for Tourism yang diterapkan</b> <span class="small muted">(opsional)</span>
    <div class="classgrid">${S.ref.gcet.map((g, n) => `<label><input type="checkbox" data-akgc="${n + 1}" ${k.gcet.includes(n + 1) ? "checked" : ""}><span>${esc(g)}</span></label>`).join("")}</div></div>
   ${galatHtml()}
   <div class="row" style="justify-content:flex-end;margin-top:auto">${tombol("kembaliDetail", "Batal", "")}${tombol("simpanAkred", "Simpan")}</div></div></div>`;
}

/* --- verifikasi data --- */
function hVerif() {
  if (!S.verif) { muatVerif(); return `<div class="memuat">Memuat antrean verifikasi…</div>`; }
  const adm = S.pengguna.peran.some(r => ["admin", "superadmin", "kps"].includes(r));
  return `<div class="head"><div><h1>Verifikasi data</h1><p>${adm ? "Data kegiatan dosen, tendik, dan mahasiswa yang buktinya sudah lengkap. Lomba mahasiswa diverifikasi dosen pendamping, jadi tidak muncul di sini kecuali Anda pendampingnya." : "Kegiatan lomba mahasiswa yang menunjuk Anda sebagai dosen pendamping."} Kegiatan yang Anda ajukan sendiri diverifikasi orang lain.</p></div><button class="btn" data-act="muatVerif">Muat ulang</button></div>
   <section class="panel"><h2>Menunggu (${S.verif.length})</h2><div class="list">${S.verif.map(k => `<div class="item" style="cursor:pointer" data-act="bukaKeg" data-id="${k.id}"><div class="body">
     <div class="row" style="justify-content:space-between;gap:8px"><div class="title">${esc(k.judul)}</div>${chipKeg(k)}</div>
     <div class="meta"><span>${esc(k.jenisLabel)}</span>${k.tabel ? `<span class="tag t">${esc(k.tabel)}</span>` : ""}<span class="num">${esc(rentangPendek(k.tgl, k.sampai))}</span><span>${esc(k.tingkat || "")}</span><span>Pengaju: ${esc(namaPendek(k.olehNama))}</span><span class="num">Bukti ${k.buktiAda}/${k.buktiPerlu}</span></div></div>
     <button class="btn sm primary" data-act="bukaKeg" data-id="${k.id}">Periksa</button></div>`).join("") || `<div class="empty">Tidak ada data yang menunggu verifikasi.</div>`}</div></section>`;
}

function laciSurat() {
  const L = S.laci, k = L.k, dsn = L.w === "dosen";
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Pratinjau surat" style="width:min(820px,100%)">
   <div class="dh"><h2>${dsn ? "Pengajuan surat penugasan dosen/tendik" : "Permohonan surat tugas mahasiswa"}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   <div class="row"><button class="btn primary" data-act="cetakSurat">${k.st === "terbit" ? "Unduh PDF" : "Unduh draf PDF"}</button><button class="btn" data-act="kembaliDetail">Kembali ke detail</button></div>
   <p class="small muted">Tekan <b>Unduh PDF</b>, lalu pada jendela cetak pilih <b>Simpan sebagai PDF</b> (Save as PDF). Ukuran kertas A4.</p>
   <div style="overflow-x:auto;display:flex;flex-direction:column;gap:16px">${kertasSurat(k, L.w)}</div></div></div>`;
}

/* --- formulir --- */
function formBaru() {
  const R = S.ref, j = R.jenis.filter(x => x.boleh)[0].k, saya = S.pengguna.id;
  return { id: "", jenis: j, jenisLain: "", judul: "", tgl: R.hariIni, sampai: R.hariIni, tingkat: "", isian: {}, lainIsian: {}, gcet: [],
    perluST: !R.tanpaSt.includes(j), tempat: "", aktivitas: "", ket: "", bentuk: "", kegDosen: "",
    pegawai: R.kelompok === "dosen" && R.pegawai.some(p => p.id === saya) ? [saya] : [], kelas: [], mhs: [], excl: [], pendampingId: "",
    cariP: "", cariM: "", jq: "", daftarNama: false };
}
function formDari(k) {
  const f = formBaru();
  ["id", "jenis", "jenisLain", "judul", "tgl", "sampai", "tingkat", "perluST", "tempat", "aktivitas", "ket", "bentuk", "kegDosen", "pendampingId"].forEach(c => { f[c] = k[c] ?? ""; });
  ["isian", "gcet", "pegawai", "kelas", "mhs", "excl"].forEach(c => { f[c] = JSON.parse(JSON.stringify(k[c] || (c === "isian" ? {} : []))); });
  f.perluST = !!k.perluST;
  return f;
}
const defJenis = k => S.ref.jenis.find(j => j.k === k);
const orangId = id => S.ref.pegawai.find(p => p.id === id) || S.ref.mhs.find(m => m.id === id);
function mhsTerpilih(f) {
  const ada = new Set(), l = [], s = semesterDari(f.tgl);
  const tambah = m => { if (m && !ada.has(m.id)) { ada.add(m.id); l.push({ ...m, semester: smtMhs(m.masuk, s) }); } };
  f.kelas.forEach(key => S.ref.mhs.filter(m => m.masuk + "-" + m.kelas === key && !f.excl.includes(m.id)).forEach(tambah));
  f.mhs.forEach(id => tambah(S.ref.mhs.find(m => m.id === id)));
  if (S.ref.kelompok === "mahasiswa") tambah(S.ref.mhs.find(m => m.id === S.pengguna.id));
  return l;
}
function saranGcet(f) {
  const txt = (f.judul + " " + Object.values(f.isian || {}).join(" ")).toLowerCase();
  if (txt.trim().length < 4) return [];
  // Kata kunci ≥ 5 huruf cocok juga di dalam kata berimbuhan ("budaya" → "kebudayaan"); yang pendek harus kata utuh (v0.17.0).
  const ada = k => k.length >= 5 ? txt.includes(k) : new RegExp("(^|[^a-z0-9])" + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-z0-9]|$)").test(txt);
  return Object.entries(S.ref.gcetKw).map(([p, kw]) => ({ p: +p, w: kw.filter(ada) })).filter(x => x.w.length).sort((a, b) => b.w.length - a.w.length).slice(0, 4);
}
function htmlSaranGcet(f) {
  const s = saranGcet(f);
  return s.length ? `Saran dari judul dan isian Anda: ${s.map(x => `<b>pasal ${x.p}</b> <span class="muted">(${esc(x.w.join(", "))})</span>`).join("; ")}. Periksa dulu, lalu centang yang benar-benar diterapkan. <button class="btn sm" data-act="gcetSemua" style="margin-top:6px">Centang semua saran</button>`
    : (f.judul || "").trim().length >= 4 ? `Belum ada pasal yang cocok dengan kata di judul dan isian. Bila kegiatan ini menerapkan salah satu pasal di bawah, centang secara manual.`
    : `Ketik judul kegiatan; aplikasi akan menyarankan pasal yang relevan berdasarkan kata kunci.`;
}
function kandidatJenis(q) {
  q = (q || "").toLowerCase().trim(); if (q.length < 2) return [];
  const kata = q.split(/\s+/).filter(w => w.length >= 3);
  return S.ref.jenis.filter(j => j.boleh).map(j => { const h = (j.l + " " + j.kw + " " + j.cth.join(" ")).toLowerCase(), cocok = []; if (h.includes(q)) cocok.push(q); kata.forEach(w => { if (w !== q && h.includes(w)) cocok.push(w); }); return [j, [...new Set(cocok)]]; })
    .filter(x => x[1].length).sort((a, b) => b[1].length - a[1].length).slice(0, 3);
}
function htmlPratinjau(f) {
  const R = S.ref, mhsK = R.kelompok === "mahasiswa", peg = f.pegawai.map(orangId).filter(Boolean), sd = !mhsK && peg.length > 0, sm = mhsTerpilih(f).length > 0;
  if (!sd && !sm) return `<span class="hint">Tandai dosen/tendik atau mahasiswa di bawah untuk melihat pratinjau kalimat surat.</span>`;
  return `<div class="pratinjau"><div class="small" style="color:#555;font-weight:700;margin-bottom:4px">PRATINJAU KALIMAT SURAT</div>
    ${sd ? `<div style="margin-bottom:8px"><i style="color:#555">Surat penugasan dosen/tendik:</i><br>${kalimatDosen(R.surat, peg)}${tabelBaris(barisDosen(f, R.surat, peg.length))}</div>` : ""}
    ${sm ? `<div><i style="color:#555">Surat tugas mahasiswa:</i><br>${kalimatMhs(f)}</div>` : ""}
    <div class="small" style="color:#555;margin-top:6px">Bagian bertanda kuning belum terisi. Nama peserta otomatis masuk lampiran.</div></div>`;
}
const wajib = ' <span style="color:var(--bad)" aria-label="wajib">*</span>';
function laciForm() {
  const f = S.form, R = S.ref, boleh = R.jenis.filter(j => j.boleh), def = defJenis(f.jenis), mhsK = R.kelompok === "mahasiswa";
  const peserta = mhsTerpilih(f), sem = semesterDari(f.tgl), peg = f.pegawai.map(orangId).filter(Boolean);
  const sd = !mhsK && peg.length > 0, prestasi = f.jenis.indexOf("prestasi") === 0;
  const qp = f.cariP.trim().toLowerCase(), qm = f.cariM.trim().toLowerCase();
  const kandP = qp.length >= 2 ? R.pegawai.filter(p => !f.pegawai.includes(p.id) && (p.nama + " " + p.username + " " + (p.inisial || "")).toLowerCase().includes(qp)).slice(0, 6) : [];
  const dalamKelas = m => f.kelas.includes(m.masuk + "-" + m.kelas) && !f.excl.includes(m.id);
  const kandM = qm.length >= 2 ? R.mhs.filter(m => !f.mhs.includes(m.id) && !dalamKelas(m) && m.id !== (mhsK ? S.pengguna.id : "") && (m.nama + " " + m.username).toLowerCase().includes(qm)).slice(0, 6) : [];
  const angk = [...new Set(R.kelas.map(c => c.masuk))];
  const kls = c => `Semester ${c.semester || "?"} – Kelas ${esc(c.kelas)}`;
  const fx = def.fx.map((x, n) => {
    const v = f.isian[x.l] || "", id = "fx" + n;
    if (x.t !== "sel") return `<div class="field"><label for="${id}">${esc(x.l)}</label><input id="${id}" data-kfx="${esc(x.l)}" type="text" value="${esc(v)}" placeholder="${esc(x.ph || "")}"></div>`;
    const lain = f.lainIsian[x.l] || (v && !x.o.includes(v));
    return `<div class="field"><label for="${id}">${esc(x.l)}</label><select id="${id}" data-kfx="${esc(x.l)}"><option value="">Pilih…</option>${x.o.map(o => `<option ${!lain && v === o ? "selected" : ""}>${esc(o)}</option>`).join("")}<option value="${LAIN}" ${lain ? "selected" : ""}>Lainnya…</option></select>
      ${lain ? `<input id="${id}-lain" data-kfxl="${esc(x.l)}" type="text" value="${esc(v)}" placeholder="Tuliskan jawaban lainnya" aria-label="${esc(x.l)}: jawaban lainnya">` : ""}</div>`;
  }).join("");
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Formulir kegiatan" style="width:min(720px,100%)">
  <div class="dh"><h2>${f.id ? "Ubah kegiatan" : "Catat kegiatan"}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
  <div class="auto"><b>Alur:</b> 1 Pengajuan → 2 Verifikasi KPS → 3 Surat pengantar PDF terbit → 4 Pelengkapan bukti (maks. ${R.surat.hk} hari kerja setelah selesai). Di tahap pengajuan cukup isi detail untuk surat; detail lain bisa dilengkapi setelah kegiatan.</div>
  <div class="field"><label for="kfJenis">Jenis kegiatan${wajib}</label><select id="kfJenis" data-kf="jenis" ${f.id ? "" : ""}>${boleh.map(j => `<option value="${j.k}" ${f.jenis === j.k ? "selected" : ""}>${esc(j.l)}</option>`).join("")}</select>
   <span class="hint">Masuk ke <b>${esc(def.t)}</b>. Kolom formulir mengikuti tabel tersebut.</span>
   ${def.cth.length ? `<div class="small" style="margin-top:2px"><span class="muted">Contoh kegiatan jenis ini:</span><ul style="margin:2px 0 0 18px;padding:0">${def.cth.map(c => `<li>${esc(c)}</li>`).join("")}</ul></div>` : ""}</div>
  <details class="picker" ${f.jq ? "open" : ""}><summary style="cursor:pointer" class="small"><b>Bingung memilih jenis?</b> Ketik kata kunci kegiatan Anda</summary>
   <input id="kfJq" type="search" value="${esc(f.jq)}" placeholder="Contoh: dosen tamu, lomba, MoU, desa wisata, magang" aria-label="Cari jenis kegiatan" style="margin-top:8px">
   ${kandidatJenis(f.jq).map(([j, w]) => `<button class="btn sm" data-act="pilihJenis" data-j="${j.k}" style="justify-content:flex-start;white-space:normal;text-align:left">${esc(j.l)} <span class="muted small">· ${esc(j.t)} · cocok: ${esc(w.join(", "))}</span></button>`).join("")
     || (f.jq.trim().length >= 2 ? `<span class="small muted">Belum ada yang cocok. Pilih "Lainnya" bila jenisnya memang belum tersedia; Admin akan memetakannya.</span>` : "")}
  </details>
  ${f.jenis === "lainnya" ? `<div class="field"><label for="kfJl">Sebutkan jenis kegiatannya${wajib}</label><input id="kfJl" data-kf="jenisLain" type="text" value="${esc(f.jenisLain)}" placeholder="Contoh: Familiarization trip"></div>` : ""}
  <div class="field"><label for="kfJudul">Judul / nama kegiatan${wajib}</label><input id="kfJudul" data-kf="judul" type="text" value="${esc(f.judul)}" placeholder="${esc(def.ex || "Tulis judul lengkap kegiatan")}"><span class="hint">Tulis judul lengkap seperti di surat tugas atau sertifikat, tanpa singkatan. ${f.perluST ? "Tanpa tanggal dan tempat, karena keduanya ditulis terpisah di surat." : ""}</span></div>
  ${fx ? `<div class="grid g2" style="gap:12px">${fx}</div>` : ""}
  <div class="grid g3" style="gap:12px">
   <div class="field"><label for="kfTgl">Tanggal mulai${wajib}</label><input id="kfTgl" data-kf="tgl" type="date" value="${esc(f.tgl)}"></div>
   <div class="field"><label for="kfSampai">Tanggal selesai</label><input id="kfSampai" data-kf="sampai" type="date" value="${esc(f.sampai)}" min="${esc(f.tgl)}"></div>
   <div class="field"><label for="kfTingkat">Tingkat${wajib}</label><select id="kfTingkat" data-kf="tingkat"><option value="">Pilih…</option>${R.tingkat.map(x => `<option ${f.tingkat === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
  </div>
  <div class="auto" id="semOto">Otomatis: <b>${sem ? esc(sem.label) : "pilih tanggal"}</b>. Kegiatan satu hari: tanggal selesai sama dengan tanggal mulai.</div>
  ${prestasi && mhsK ? `<div class="field"><label for="kfPd">Dosen pendamping (verifikator)${wajib}</label><select id="kfPd" data-kf="pendampingId"><option value="">Pilih dosen</option>${R.pegawai.filter(p => p.jenis === "dosen").map(p => `<option value="${p.id}" ${f.pendampingId === p.id ? "selected" : ""}>${esc(namaPendek(p.nama))}${p.inisial ? " (" + esc(p.inisial) + ")" : ""}</option>`).join("")}</select><span class="hint">Kegiatan lomba mahasiswa diverifikasi oleh dosen pendamping.</span></div>` : ""}
  <div class="picker"><label class="row" style="gap:8px"><input type="checkbox" id="kfST" data-kcek="perluST" ${f.perluST ? "checked" : ""}><b>Ajukan surat tugas melalui KPS</b></label>
   <span class="hint">${f.perluST ? (mhsK ? "Sebagai mahasiswa, Anda mengajukan surat tugas untuk mahasiswa saja. Dosen yang ditandai mengajukan surat tugas dosennya sendiri." : "Anda dapat mengajukan surat penugasan dosen/tendik sekaligus surat tugas mahasiswa yang ditandai.") : "Tidak perlu surat tugas, misalnya publikasi atau kegiatan lama yang surat tugasnya sudah ada."}</span>
   ${f.perluST ? `<p class="small" style="margin-top:4px"><b>Data untuk surat.</b> Kalimat surat disusun otomatis dari isian ini, termasuk nama kegiatan dan tanggal di atas.</p>
    <div class="field"><label for="kfTempat">Tempat${wajib}</label><input id="kfTempat" data-kf="tempat" type="text" value="${esc(f.tempat)}" placeholder="Contoh: Karangasem dan Bangli, Provinsi Bali"><span class="hint">Nama lokasi lengkap dengan kabupaten/kota; muncul setelah kata "di".</span></div>
    <div class="grid g2" style="gap:10px"><div class="field"><label for="kfAkt">Kegiatan mahasiswa di lokasi</label><input id="kfAkt" data-kf="aktivitas" type="text" value="${esc(f.aktivitas)}" placeholder="Contoh: mengunjungi beberapa Daya Tarik Wisata"><span class="hint">Diawali kata kerja, huruf kecil. Muncul setelah tanggal (surat mahasiswa).</span></div>
     <div class="field"><label for="kfKet">Rincian (opsional)</label><input id="kfKet" data-kf="ket" type="text" value="${esc(f.ket)}" placeholder="Contoh: seperti Jemeluk, Tirta Gangga, Tenganan, dan lainnya"><span class="hint">Ditulis di dalam kurung setelah tempat.</span></div></div>
    ${sd ? `<div class="grid g2" style="gap:10px"><div class="field"><label for="kfBentuk">Bentuk kegiatan (surat dosen/tendik)${wajib}</label><input id="kfBentuk" data-kf="bentuk" type="text" value="${esc(f.bentuk)}" placeholder="Contoh: Pendampingan Praktik Kuliah Lapangan"></div>
     <div class="field"><label for="kfKegD">Kegiatan (surat dosen/tendik)</label><input id="kfKegD" data-kf="kegDosen" type="text" value="${esc(f.kegDosen)}" placeholder="${esc(f.judul || "Kosongkan untuk memakai nama kegiatan")}"><span class="hint">Kosongkan untuk memakai nama kegiatan.</span></div></div>` : ""}
    <div id="pratinjau">${htmlPratinjau(f)}</div>` : ""}</div>
  <div class="picker"><b>Tandai dosen / tendik</b>
   <div class="chips">${peg.map(p => `<span class="pchip">${esc(namaPendek(p.nama))}${p.jenis === "tendik" ? ' <span class="muted small">tendik</span>' : ""}<button data-act="rmPeg" data-id="${p.id}" aria-label="Hapus ${esc(namaPendek(p.nama))}">×</button></span>`).join("") || '<span class="small muted">Belum ada</span>'}</div>
   <input id="kfCariP" type="search" placeholder="Ketik nama, NIP, atau inisial" value="${esc(f.cariP)}" aria-label="Cari dosen atau tendik">
   ${kandP.length ? `<div class="chips">${kandP.map(p => `<button class="btn sm" data-act="addPeg" data-id="${p.id}">+ ${esc(namaPendek(p.nama))} <span class="muted">${p.jenis === "tendik" ? "tendik" : esc(p.inisial || "dosen")}</span></button>`).join("")}</div>` : qp.length >= 2 ? `<span class="small muted">Tidak ada yang cocok.</span>` : ""}
  </div>
  <div class="picker"><div class="row" style="justify-content:space-between"><b>Tandai mahasiswa (per kelas atau satu per satu)</b><span class="small num" style="color:var(--brand);font-weight:700">${peserta.length} mahasiswa</span></div>
   ${mhsK ? `<span class="small muted">Anda (pengaju) otomatis ikut sebagai peserta.</span>` : ""}
   ${R.kelas.length ? `<div class="row small" style="flex-wrap:wrap">Pilih cepat: ${angk.map(m => `<button class="btn sm" data-act="pilihAngkatan" data-m="${m}">Angkatan ${m} semua</button>`).join("")}</div>
   <div class="classgrid">${R.kelas.map(c => `<label><input type="checkbox" data-kls="${c.key}" ${f.kelas.includes(c.key) ? "checked" : ""}><span>${kls(c)}<br><span class="muted num">${c.n} mhs · masuk ${c.masuk}</span></span></label>`).join("")}</div>` : `<span class="small muted">Belum ada data kelas mahasiswa aktif.</span>`}
   ${f.kelas.length ? `<div class="row small"><button class="btn sm" data-act="daftarNama">${f.daftarNama ? "Tutup daftar nama" : "Sesuaikan daftar nama"}</button>${f.excl.length ? `<span style="color:var(--warn)"><b class="num">${f.excl.length}</b> mahasiswa dikecualikan</span>` : `<span class="muted">Hilangkan centang mahasiswa yang tidak ikut</span>`}</div>
    ${f.daftarNama ? f.kelas.map(key => { const c = R.kelas.find(x => x.key === key), ls = R.mhs.filter(m => m.masuk + "-" + m.kelas === key), ex = ls.filter(m => f.excl.includes(m.id)).length;
      return `<div class="field"><div class="row" style="justify-content:space-between"><b class="small">${c ? kls(c) : esc(key)}</b><span class="small num">${ls.length - ex} dari ${ls.length} ikut</span></div><div class="classgrid" style="max-height:220px;overflow:auto">${ls.map(m => `<label><input type="checkbox" data-exc="${m.id}" ${f.excl.includes(m.id) ? "" : "checked"}><span>${esc(m.nama)} <span class="mono muted">${esc(m.username)}</span></span></label>`).join("")}</div></div>`; }).join("") : ""}` : ""}
   <div class="field" style="border-top:1px solid var(--line);padding-top:10px"><label for="kfCariM" class="small">Pilih satu per satu, misalnya peserta lomba dari beberapa kelas</label><input id="kfCariM" type="search" value="${esc(f.cariM)}" placeholder="Ketik nama atau NIM"></div>
   ${kandM.length ? `<div class="chips">${kandM.map(m => `<button class="btn sm" data-act="addMhs" data-id="${m.id}">+ ${esc(m.nama)} <span class="mono muted">${esc(m.username)} · Kelas ${esc(m.kelas)}</span></button>`).join("")}</div>` : qm.length >= 2 ? `<span class="small muted">Tidak ada yang cocok.</span>` : ""}
   ${f.mhs.length ? `<div class="small muted">Dipilih satu per satu (${f.mhs.length}):</div><div class="chips">${f.mhs.map(id => { const m = orangId(id); return `<span class="pchip">${esc(m ? m.nama : id)} <span class="mono muted">${esc(m ? m.username : "")}</span><button data-act="rmMhs" data-id="${id}" aria-label="Hapus ${esc(m ? m.nama : id)}">×</button></span>`; }).join("")}</div>` : ""}
  </div>
  <details class="picker" ${f.gcet.length || saranGcet(f).length ? "open" : ""}><summary style="cursor:pointer"><b>Pasal Global Code of Ethics for Tourism yang diterapkan</b> <span class="small muted">(opsional, untuk butir matriks 75)</span> <span id="saranJml" class="chip s-diajukan" ${saranGcet(f).length ? "" : "hidden"}>${saranGcet(f).length} saran</span></summary>
   <div class="auto" id="saranGcet" style="margin-top:8px">${htmlSaranGcet(f)}</div>
   <div class="classgrid" style="margin-top:8px">${R.gcet.map((g, n) => `<label><input type="checkbox" data-gc="${n + 1}" ${f.gcet.includes(n + 1) ? "checked" : ""}><span>${esc(g)}</span></label>`).join("")}</div></details>
  <div class="picker"><b>Bukti</b>
   ${f.perluST ? `<span class="small muted">Bukti diunggah di halaman detail setelah surat tugas terbit, paling lambat ${R.surat.hk} hari kerja setelah kegiatan selesai: surat tugas resmi, laporan, daftar hadir, dokumentasi, dan dokumen sesuai jenis kegiatan.</span>`
     : `${def.bukti.length ? `<div class="small"><span class="muted">Dokumen yang diunggah setelah disimpan:</span><ul style="margin:4px 0 0 18px;padding:0">${def.bukti.map(b => `<li>${esc(b)}</li>`).join("")}</ul></div>` : ""}<span class="small muted">Simpan dulu, lalu unggah bukti di halaman detail dan tekan <b>Ajukan verifikasi</b>.</span>`}</div>
  ${galatHtml()}
  <div class="row" style="justify-content:flex-end;margin-top:auto;flex-wrap:wrap">${f.perluST ? tombol("simpanKeg", "Simpan draf", "") + tombol("kirimKeg", ["revisi_aju", "ditunda"].includes(S.formSt) ? "Kirim ulang ke KPS" : "Ajukan ke KPS") : tombol("simpanKeg", "Simpan, lalu unggah bukti")}</div>
 </div></div>`;
}
function dataForm(f) {
  const isian = {}; Object.entries(f.isian).forEach(([a, b]) => { if (String(b || "").trim()) isian[a] = b; });
  return { id: f.id || undefined, jenis: f.jenis, jenisLain: f.jenisLain, judul: f.judul, tgl: f.tgl, sampai: f.sampai, tingkat: f.tingkat, isian, gcet: f.gcet,
    perluST: f.perluST, tempat: f.tempat, aktivitas: f.aktivitas, ket: f.ket, bentuk: f.bentuk, kegDosen: f.kegDosen,
    pegawai: f.pegawai, kelas: f.kelas, mhs: f.mhs, excl: f.excl.filter(id => { const m = orangId(id); return m && f.kelas.includes(m.masuk + "-" + m.kelas); }), pendampingId: f.pendampingId };
}
function perbaruiDiTempat() {
  const p = $("pratinjau"); if (p && S.form) p.innerHTML = htmlPratinjau(S.form);
  const g = $("saranGcet"); if (g && S.form) {
    g.innerHTML = htmlSaranGcet(S.form);
    const n = saranGcet(S.form).length, j = $("saranJml"), d = g.closest("details");
    if (j) { j.hidden = !n; j.textContent = n + " saran"; }
    if (n && d && !d.open && !d.dataset.ditutup) d.open = true; // buka sekali saat saran muncul; bila pengguna menutupnya, biarkan
  }
}

/* --- antrean KPS --- */
function hKps() {
  if (!S.antrean) { muatAntrean(); return `<div class="memuat">Memuat antrean…</div>`; }
  const q = S.antrean;
  return `${S.tugas && S.tugas.ttd === false ? `<div class="callout" style="margin-bottom:12px">Anda belum menyimpan tanda tangan. Surat yang Anda setujui memakai pernyataan persetujuan elektronik, kode verifikasi, dan QR saja. <button class="btn sm" data-go="ttd" style="margin-left:6px">Tambahkan tanda tangan</button></div>` : ""}<div class="head"><div><h1>Antrean KPS</h1><p>Pengajuan surat tugas dari dosen, tendik, dan mahasiswa. Periksa draf surat, lalu setujui, tunda, minta revisi, atau tolak.</p></div><button class="btn" data-act="muatAntrean">Muat ulang</button></div>
   <div class="seg" role="group" aria-label="Bagian" style="margin-bottom:12px"><button data-act="kpsTab" data-t="" aria-pressed="${!S.kpsTab}">Antrean (${q.length})</button><button data-act="kpsTab" data-t="riwayat" aria-pressed="${S.kpsTab === "riwayat"}">Riwayat keputusan</button></div>
   ${S.kpsTab === "riwayat" ? hRiwayatKeputusan() : `
   <section class="panel"><h2>Pengajuan surat tugas (${q.length})</h2><div class="list">${q.map(k => `<div class="item"><div class="body">
    <div class="row" style="justify-content:space-between"><div class="title">${esc(k.judul)}</div>${chipKeg(k)}</div>
    <div class="meta"><span>${esc(k.jenisLabel)}</span><span class="num">${esc(rentangPendek(k.tgl, k.sampai))}</span><span>${esc(k.tempat || "")}</span><span>Diajukan oleh ${esc(namaPendek(k.olehNama))}</span><span>${k.lampiran.pegawai.length} dosen/tendik · ${k.lampiran.mhs.length} mahasiswa</span></div>
    ${k.tunggakan && k.tunggakan.length ? `<div class="callout" style="margin-top:8px;border-color:var(--bad)"><b style="color:var(--bad)">Perhatian:</b> pengaju/peserta masih punya ${k.tunggakan.length} kegiatan yang buktinya belum lengkap melewati batas: ${k.tunggakan.map(o => `<a href="#" data-act="bukaKeg" data-id="${o.id}">${esc(o.judul)}</a> (batas ${esc(tglPendek(o.batas))})`).join("; ")}. Anda dapat <b>menunda</b> pengajuan ini sampai bukti tersebut lengkap.</div>` : ""}
    <div class="row" style="margin-top:8px">${k.lampiran.surat.dosen ? `<button class="btn sm" data-act="kpsSurat" data-id="${k.id}" data-w="dosen">Draf surat dosen/tendik</button>` : ""}${k.lampiran.surat.mhs ? `<button class="btn sm" data-act="kpsSurat" data-id="${k.id}" data-w="mhs">Draf surat mahasiswa</button>` : ""}<button class="btn sm" data-act="bukaKeg" data-id="${k.id}">Detail</button></div>
    <div class="field" style="margin-top:8px"><label for="kc${k.id}">Catatan KPS untuk pengaju</label><textarea id="kc${k.id}" placeholder="Wajib diisi bila menunda, meminta revisi, atau menolak"></textarea></div>
    <div class="row" style="margin-top:6px;flex-wrap:wrap">${tombol("kpsPutus", "Setujui dan terbitkan surat", "ok sm", `data-id="${k.id}" data-k="terbit"`)}${tombol("kpsPutus", "Tunda", "warn sm", `data-id="${k.id}" data-k="ditunda"`)}${tombol("kpsPutus", "Minta revisi", "warn sm", `data-id="${k.id}" data-k="revisi_aju"`)}${tombol("kpsPutus", "Tolak", "bad sm", `data-id="${k.id}" data-k="ditolak_aju"`)}</div>
   </div></div>`).join("") || `<div class="empty">Tidak ada pengajuan yang menunggu.</div>`}</div></section>
   ${S.galat ? `<div class="panel">${galatHtml()}</div>` : ""}`}`;
}

/* --- cek keaslian surat (tanpa login) --- */
function layarCek() {
  const c = S.cek;
  return bingkai("Cek keaslian surat", "Masukkan kode verifikasi yang tertera di surat pengantar Koordinator Program Studi.",
   `<div class="field"><label for="cekKode">Kode verifikasi</label><input id="cekKode" type="text" class="mono" value="${esc(c.kode)}" placeholder="UPW-2611-XXXXXXXX"></div>
    ${c.hasil ? (c.hasil.sah ? `<div class="auto"><b>Surat sah.</b> Diterbitkan melalui Repositori UPW pada ${esc(tglSurat(c.hasil.tglSurat))} dan disetujui oleh <b>${esc(c.hasil.kps)}</b>.<br>
      Kegiatan: <b>${esc(c.hasil.judul)}</b><br>${esc(rentang(c.hasil.tgl, c.hasil.sampai))}${c.hasil.tempat ? " · " + esc(c.hasil.tempat) : ""}<br>Peserta: ${c.hasil.jumlahPegawai} dosen/tendik, ${c.hasil.jumlahMhs} mahasiswa.</div>`
      : `<div class="callout" style="border-color:var(--bad)"><b style="color:var(--bad)">Kode tidak ditemukan.</b> Periksa kembali penulisan kode, atau hubungi Prodi UPW.</div>`) : ""}
    ${galatHtml()}<div class="row">${tombol("cekSurat", "Periksa")}<button class="btn" data-act="keluarCek">Ke halaman masuk</button></div>`);
}

Object.assign(AKSI, {
  kegBaru() { if (!S.ref) return; S.form = formBaru(); S.formSt = ""; S.laci = { jenis: "keg" }; S.galat = ""; render(); },
  kegLingkup(d) { S.kegLingkup = d.l; S.keg = null; render(); },
  kegMuatUlang() { S.keg = null; S.ref = null; S.tugas = null; render(); },
  muatAntrean() { S.antrean = null; S.tugas = null; render(); },
  async bukaKeg(d) {
    S.laci = { jenis: "kegDetail", id: d.id }; S.galat = ""; render();
    try { const j = await api("kegiatan.detail", { id: d.id }); if (S.laci && S.laci.id === d.id) { S.laci.k = j.kegiatan; render(); } }
    catch (e) { S.laci = null; render(); toast(e.message); }
  },
  async ubahKeg() { if (!S.ref) { await muatRef(); } if (!S.ref) return; S.form = formDari(S.laci.k); S.formSt = S.laci.k.st; S.laci = { jenis: "keg" }; S.galat = ""; render(); },
  hapusKeg: () => { if (!confirm("Hapus draf kegiatan ini?")) return; jalankan(async () => { await api("kegiatan.hapus", { id: S.laci.k.id }); S.laci = null; segarkan(); toast("Draf dihapus."); }); },
  simpanKeg: () => kirimForm(false),
  kirimKeg: () => kirimForm(true),
  pilihJenis(d) { gantiJenis(d.j); S.form.jq = ""; render(); },
  addPeg(d) { S.form.pegawai.push(d.id); S.form.cariP = ""; render(); fokus("kfCariP"); },
  rmPeg(d) { S.form.pegawai = S.form.pegawai.filter(x => x !== d.id); render(); },
  addMhs(d) { S.form.mhs.push(d.id); S.form.excl = S.form.excl.filter(x => x !== d.id); S.form.cariM = ""; render(); fokus("kfCariM"); },
  rmMhs(d) { S.form.mhs = S.form.mhs.filter(x => x !== d.id); render(); },
  pilihAngkatan(d) { S.ref.kelas.filter(c => String(c.masuk) === d.m).forEach(c => { if (!S.form.kelas.includes(c.key)) S.form.kelas.push(c.key); }); render(); },
  daftarNama() { S.form.daftarNama = !S.form.daftarNama; render(); },
  gcetSemua() { saranGcet(S.form).forEach(s => { if (!S.form.gcet.includes(s.p)) S.form.gcet.push(s.p); }); S.form.gcet.sort((a, b) => a - b); render(); },
  async lihatSurat(d) {
    const k = S.laci.k;
    if (k.st === "terbit" && k.lampiran.ttd && !(k.id in S.ttdSurat)) {
      try { S.ttdSurat[k.id] = (await api("surat.ttd", { id: k.id })).gambar; } catch (e) { toast("Tanda tangan tidak termuat: " + e.message); }
    }
    S.laci = { jenis: "surat", k, w: d.w, dari: "detail" }; render();
  },
  kpsSurat(d) { S.laci = { jenis: "surat", k: S.antrean.find(x => x.id === d.id), w: d.w, dari: "kps" }; render(); },
  kembaliDetail() { const k = S.laci.k; S.laci = { jenis: "kegDetail", id: k.id, k }; render(); },
  cetakSurat() { cetakSurat(kertasSurat(S.laci.k, S.laci.w)); },
  kpsPutus: d => {
    if (d.k === "terbit" && !confirm("Setujui pengajuan ini dan terbitkan surat? Surat memuat " + (S.tugas && S.tugas.ttd ? "tanda tangan Anda, " : "") + "kode verifikasi dan QR, dan tidak bisa ditarik setelah terbit.")) return;
    jalankan(async () => {
      // Galat juga ditampilkan sebagai toast, karena pesan galat di bawah daftar bisa tidak terlihat bila antrean panjang.
      const j = await api("kps.putuskan", { id: d.id, keputusan: d.k, catatan: nilai("kc" + d.id) }).catch(e => { toast(e.message); throw e; });
      segarkan();
      toast({ terbit: "Disetujui. Surat terbit dengan kode " + j.kegiatan.kodeSurat + ".", ditunda: "Pengajuan ditunda.", revisi_aju: "Revisi diminta.", ditolak_aju: "Pengajuan ditolak." }[d.k]);
    });
  },
  cekSurat: () => jalankan(async () => { S.cek.kode = nilai("cekKode"); S.cek.hasil = await api("surat.cek", { kode: S.cek.kode }); }),
  keluarCek() { if (location.search) location.replace(location.pathname); else { S.layar = "masuk"; S.galat = ""; render(); } },
  keCek() { S.layar = "cek"; S.cek = { kode: "", hasil: null }; S.galat = ""; render(); }
});
/* --- bukti, data akreditasi, verifikasi (v0.4.0) --- */
function gantiDetail(id, k) { if (S.laci && S.laci.k && S.laci.k.id === id) { S.laci.k = k; S.laci.bm = null; } }
const bacaBase64 = file => new Promise((ok, no) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result).split(",")[1] || "");
  r.onerror = () => no(new Error("File tidak bisa dibaca. Coba pilih ulang."));
  r.readAsDataURL(file);
});
function unggahBk(slot, isi) {
  const id = S.laci.k.id;
  if (isi.isi) toast("Mengunggah…");
  jalankan(async () => {
    const j = await api("bukti.unggah", Object.assign({ id, slot }, isi)).catch(e => { toast(e.message); throw e; });
    gantiDetail(id, j.kegiatan); segarkan();
    toast(j.otomatis ? "Bukti lengkap. Data otomatis diajukan untuk verifikasi." : "Tersimpan dan terkunci; anggota lain tidak perlu mengunggah lagi.");
  });
}
async function lihatBukti(id, slot, e) {
  if (e.t === "tautan") { window.open(e.url, "_blank", "noopener,noreferrer"); return; }
  const w = window.open("", "_blank");
  if (w) w.document.write('<p style="font-family:sans-serif;padding:16px">Membuka berkas…</p>');
  try {
    const j = await api("bukti.lihat", { id, slot });
    const bin = atob(j.isi), arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([arr], { type: j.mime }));
    if (w && /pdf|image/.test(j.mime)) w.location.href = url;
    else { if (w) w.close(); simpanBerkas(new Blob([arr], { type: j.mime }), j.nama); }
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  } catch (err) { if (w) w.close(); toast(err.message); }
}
Object.assign(AKSI, {
  muatVerif() { S.verif = null; S.tugas = null; render(); },
  ttdTab(d) { S.ttdTab = d.t; S.ttdTmp = null; render(); },
  ttdBersih() { const c = $("ttdPad"); if (c) { c.getContext("2d").clearRect(0, 0, c.width, c.height); c.dataset.isi = ""; } },
  ttdSimpan() {
    if (!$("ttdSetuju")?.checked) { toast("Centang persetujuan pemakaian tanda tangan dulu."); return; }
    let gbr = null;
    if (S.ttdTab === "gambar") { const c = $("ttdPad"); if (!c || c.dataset.isi !== "1") { toast("Tanda tangani kotak putih dulu."); return; } gbr = rapikanTtd(c); }
    else { gbr = S.ttdTmp; if (!gbr) { toast("Pilih gambar tanda tangan dulu."); return; } }
    if (!gbr) { toast("Tanda tangan tidak terbaca. Coba lagi dengan goresan yang lebih tegas."); return; }
    const cara = S.ttdTab;
    jalankan(async () => { S.ttd = await api("ttd.simpan", { gambar: gbr, setuju: true, cara }); S.ttdTmp = null; S.tugas = null; toast("Tanda tangan tersimpan. Dipakai pada surat yang Anda setujui berikutnya."); });
  },
  ttdHapus() {
    if (!confirm("Hapus tanda tangan? Surat yang sudah terbit tetap memakai tanda tangan lama; surat berikutnya memakai pernyataan elektronik saja.")) return;
    jalankan(async () => { S.ttd = await api("ttd.hapus"); S.tugas = null; toast("Tanda tangan dihapus."); });
  },
  bkMode(d) { S.laci.bm = d.slot ? { slot: d.slot, m: d.m } : null; S.galat = ""; render(); if (d.slot) fokus("bkIsi"); },
  simpanBk() { const bm = S.laci.bm; if (!bm) return; const v = String($("bkIsi")?.value || "").trim(); unggahBk(bm.slot, bm.m === "tautan" ? { tautan: v } : { ket: v }); },
  batalBk(d) {
    if (!confirm("Batalkan dokumen ini? File dipindahkan ke sampah Drive dan anggota lain bisa mengunggah ulang.")) return;
    const id = S.laci.k.id;
    jalankan(async () => { const j = await api("bukti.batal", { id, slot: d.slot }).catch(e => { toast(e.message); throw e; }); gantiDetail(id, j.kegiatan); segarkan(); toast("Unggahan dibatalkan."); });
  },
  lihatBk(d) { const s = S.laci.k.slot.find(x => x.k === d.slot); if (s && s.isi) lihatBukti(S.laci.k.id, d.slot, s.isi); },
  ajukanData() {
    const id = S.laci.k.id;
    jalankan(async () => { const j = await api("kegiatan.ajukanData", { id }).catch(e => { toast(e.message); throw e; }); gantiDetail(id, j.kegiatan); segarkan(); toast("Diajukan untuk verifikasi data."); });
  },
  async ubahAkred() { if (!S.ref) await muatRef(); if (!S.ref || !S.laci) return; S.laci = { jenis: "akred", id: S.laci.k.id, k: S.laci.k }; S.galat = ""; render(); },
  simpanAkred() {
    const isian = {}; document.querySelectorAll("[data-akfx]").forEach(el => { if (el.value.trim()) isian[el.dataset.akfx] = el.value.trim(); });
    const draf = { tingkat: $("akTingkat").value, isian, gcet: [...document.querySelectorAll("[data-akgc]:checked")].map(el => Number(el.dataset.akgc)) };
    S.laci.draf = draf;
    jalankan(async () => { const j = await api("kegiatan.akreditasi", { id: S.laci.k.id, data: draf }); S.laci = { jenis: "kegDetail", id: j.kegiatan.id, k: j.kegiatan }; segarkan(); toast("Data akreditasi tersimpan."); });
  },
  verPutus(d) {
    if (d.k === "disetujui" && !confirm("Setujui data kegiatan ini? Data yang disetujui masuk data akreditasi dan buktinya terkunci.")) return;
    const id = S.laci.k.id;
    jalankan(async () => {
      const j = await api("verifikasi.putuskan", { id, keputusan: d.k, catatan: nilai("vCat") }).catch(e => { toast(e.message); throw e; });
      gantiDetail(id, j.kegiatan); segarkan();
      toast({ disetujui: "Data disetujui.", revisi: "Revisi diminta; pengunggah melihat catatan Anda.", ditolak: "Data ditolak." }[d.k]);
    });
  }
});
document.addEventListener("change", e => {
  const t = e.target; if (!t.dataset || !t.dataset.bfile || !S.laci || !S.laci.k) return;
  const f = t.files && t.files[0], slot = t.dataset.bfile; t.value = "";
  if (!f) return;
  if (f.size > 10 * 1024 * 1024) { toast("Ukuran file maksimal 10 MB. Untuk file lebih besar, unggah ke Google Drive lalu pakai Tautan."); return; }
  bacaBase64(f).then(isi => unggahBk(slot, { nama: f.name, isi }), err => toast(err.message));
});
/* --- Data Prodi (v0.8.0) --- */
const smtL = k => { const m = /^(\d{4})-([12])$/.exec(k || ""); return m ? (m[2] === "1" ? "Ganjil " : "Genap ") + m[1] + "/" + (+m[1] + 1) : k; };
const dpPersen = x => (Math.round(x * 1000) / 10).toLocaleString("id-ID") + "%";
function muatDp() { sekali("dp", async () => { S.dp = await api("dp.data", { semester: S.dpSmt || undefined, ta: S.dpTa || undefined }); render(); }); }
const namaAnggota = a => { const D = S.dp; if (a.t === "p") { const x = D.praktisi.find(y => y.id === a.id); return x ? x.nama + " (praktisi)" : "(praktisi dihapus)"; } const x = D.dosen.find(y => y.id === a.id); return x ? namaPendek(x.nama) + (x.inisial ? " (" + x.inisial + ")" : "") : "(akun nonaktif)"; };
function hDprodi() {
  if (!S.dp) { muatDp(); return `<div class="memuat">Memuat data prodi…</div>`; }
  const D = S.dp, ub = D.bolehUbah, tabs = [["kurikulum", "Kurikulum"], ["tim", "Tim pengajar"], ["mkp", "Portofolio MK"], ["praktisi", "Praktisi"], ["dosents", "Data dosen TS"], ["sdos", "Status dosen"], ["dokd", "Dokumen dosen"], ["lulusan", "Lulusan"], ["pmb", "PMB"], ["keuangan", "Keuangan"]];
  let isi = "";
  if (["lulusan", "pmb", "keuangan"].includes(S.dpTab)) isi = isiLulusan();
  if (S.dpTab === "mkp") isi = isiMkpRekap();
  if (S.dpTab === "sdos") isi = isiStatusDosen();
  if (S.dpTab === "dokd") isi = isiDokDosen();
  if (S.dpTab === "kurikulum") {
    const tot = D.mk.reduce((s, m) => s + m.sks, 0), prak = D.mk.reduce((s, m) => s + m.sksPraktik, 0);
    isi = `<div class="grid g3"><div class="panel stat"><span class="v num">${D.mk.length}</span><span class="l">Mata kuliah</span></div><div class="panel stat"><span class="v num">${tot.toLocaleString("id-ID")}</span><span class="l">Total sks</span></div>
      <div class="panel stat"><span class="v num">${tot ? dpPersen(prak / tot) : "–"}</span><span class="l">PJP: sks praktik/praktikum ÷ total sks (${prak.toLocaleString("id-ID")} sks praktik)</span></div></div>
     ${ub ? `<div class="row" style="flex-wrap:wrap">${tombol("dpMkBaru", "+ Tambah mata kuliah", "primary")}<button class="btn" data-act="dpImporBuka">${S.dpImpor ? "Tutup impor" : "Impor (tempel atau berkas Excel)"}</button></div>` : ""}
     ${S.dpImpor ? `<section class="panel"><h2>Impor kurikulum</h2><p class="small">Salin baris dari Excel lalu tempel di sini. Urutan kolom: <b>Kode; Nama mata kuliah; Semester (1–8); sks kuliah; sks seminar; sks praktik/praktikum; Kompetensi (Ya/Tidak)</b>. Pemisah boleh tab (hasil salin Excel) atau titik koma. Kode yang sudah ada akan diperbarui.</p>
       <textarea id="dpImporTeks" rows="6" placeholder="UPW201&#9;Travel Agency Operation&#9;2&#9;1&#9;0&#9;2&#9;Ya"></textarea>${galatHtml()}<div class="row" style="justify-content:flex-end">${tombol("dpImporSimpan", "Impor")}</div>${panelImporExcel("mk")}</section>` : ""}
     <div class="tbl-wrap"><table><thead><tr><th>Smt</th><th>Kode</th><th>Mata kuliah</th><th>Kompetensi</th><th>Kuliah</th><th>Seminar</th><th>Praktik</th><th>CPL</th><th>RPS</th>${ub ? "<th></th>" : ""}</tr></thead><tbody>
     ${D.mk.map(m => `<tr><td class="num">${m.semester}</td><td class="mono">${esc(m.kode)}</td><td>${esc(m.nama)}</td><td>${m.kompetensi ? '<span class="tag t">Ya</span>' : "–"}</td><td class="num">${m.sksKuliah}</td><td class="num">${m.sksSeminar}</td><td class="num">${m.sksPraktik}</td>
       <td class="small">${[["S", m.cplSikap], ["P", m.cplPengetahuan], ["KU", m.cplKu], ["KK", m.cplKk]].filter(x => x[1]).map(x => x[0]).join(", ") || "–"}</td><td class="small">${m.rps ? (m.rps === "Ada" ? "Ada" : `<a href="${esc(m.rps)}" target="_blank" rel="noopener noreferrer">Tautan</a>`) : '<span class="chip s-revisi">Belum</span>'}</td>
       ${ub ? `<td><button class="btn sm" data-act="dpMkUbah" data-kode="${esc(m.kode)}">Ubah</button></td>` : ""}</tr>`).join("") || `<tr><td colspan="10"><div class="empty">Belum ada mata kuliah. ${ub ? "Tambahkan satu per satu atau impor dari Excel." : ""}</div></td></tr>`}</tbody></table></div>`;
  }
  if (S.dpTab === "tim") {
    const isiN = D.tim.filter(t => t.anggota.length).length;
    isi = `<div class="row" style="justify-content:space-between;flex-wrap:wrap"><label class="row small" style="gap:6px"><b>Semester</b><select id="dpSmt" style="width:auto">${D.pilihanSemester.map(s => `<option value="${s.kode}" ${s.kode === D.semester ? "selected" : ""}>${esc(s.label)}</option>`).join("")}</select></label>
      <span class="small num">${isiN} dari ${D.tim.length} mata kuliah ${/-1$/.test(D.semester) ? "ganjil" : "genap"} sudah punya tim</span></div>
     <div class="callout">Tim pengajar berlaku <b>satu semester</b>: satu <b>pengampu utama</b> (dosen) dan maksimal 3 orang per tim, termasuk praktisi. Data ini mengisi kolom mata kuliah yang diampu (Tabel 1–3) dan EWMP (Tabel 6).</div>
     <div class="tbl-wrap"><table><thead><tr><th>Kode</th><th>Mata kuliah</th><th>Sks</th><th>Tim pengajar ${esc(D.labelSemester)}</th>${ub ? "<th></th>" : ""}</tr></thead><tbody>
     ${D.tim.map(t => `<tr><td class="mono">${esc(t.kode)}</td><td>${esc(t.nama)}</td><td class="num">${t.sks}</td><td class="small">${t.anggota.length ? t.anggota.map((a, i) => i === 0 ? `<b>${esc(namaAnggota(a))}</b> <span class="muted">(utama)</span>` : esc(namaAnggota(a))).join(", ") : '<span class="chip s-revisi">Belum ditetapkan</span>'}</td>
       ${ub ? `<td><button class="btn sm" data-act="dpTimAtur" data-kode="${esc(t.kode)}">${t.anggota.length ? "Ubah tim" : "Tetapkan tim"}</button></td>` : ""}</tr>`).join("") || `<tr><td colspan="5"><div class="empty">Belum ada mata kuliah ${/-1$/.test(D.semester) ? "semester ganjil" : "semester genap"} di kurikulum.</div></td></tr>`}</tbody></table></div>
     ${ub ? `<div class="row">${tombol("dpTimSalin", "Salin dari " + D.salinDari, "")}</div>` : ""}`;
  }
  if (S.dpTab === "praktisi") {
    isi = `<p class="small muted">Dosen industri/praktisi yang mengajar dalam tim pengajar (Tabel 2). Praktisi tidak perlu akun aplikasi.</p>
     ${ub ? `<div class="row">${tombol("dpPrakBaru", "+ Tambah praktisi", "primary")}</div>` : ""}
     <div class="tbl-wrap"><table><thead><tr><th>Nama</th><th>Perusahaan/industri</th><th>Pendidikan</th><th>Bidang keahlian</th><th>Sertifikat</th>${ub ? "<th></th>" : ""}</tr></thead><tbody>
     ${D.praktisi.map(x => `<tr><td>${esc(x.nama)}${x.nidk ? `<br><span class="mono small muted">NIDK ${esc(x.nidk)}</span>` : ""}</td><td class="small">${esc(x.perusahaan)}</td><td class="small">${esc(x.pendidikan || "–")}</td><td class="small">${esc(x.bidang || "–")}</td><td class="small">${esc(x.sertifikat || "–")}</td>
       ${ub ? `<td><button class="btn sm" data-act="dpPrakUbah" data-id="${x.id}">Ubah</button></td>` : ""}</tr>`).join("") || `<tr><td colspan="6"><div class="empty">Belum ada praktisi.</div></td></tr>`}</tbody></table></div>`;
  }
  if (S.dpTab === "dosents") {
    const th = new Date().getFullYear(), pil = []; for (let a = th; a >= 2018; a--) pil.push(a);
    const f = (x, k, ph) => `<input id="dt-${x.id}-${k}" type="text" inputmode="decimal" value="${x[k] === "" || x[k] == null ? "" : String(x[k]).replace(".", ",")}" placeholder="${ph || "0"}" style="width:64px" ${ub ? "" : "disabled"} aria-label="${k} ${esc(x.nama)}">`;
    isi = `<div class="row" style="justify-content:space-between;flex-wrap:wrap"><label class="row small" style="gap:6px"><b>Tahun akademik</b><select id="dpTa" style="width:auto">${pil.map(a => `<option value="${a}" ${a === D.ta ? "selected" : ""}>${a}/${a + 1}</option>`).join("")}</select></label></div>
     <div class="callout">Satuan sks per tahun akademik (Ganjil + Genap), untuk Tabel 6 (EWMP). Kolom <b>PS</b> otomatis dari tim pengajar (sks MK dibagi rata ke dosen dalam tim); isi angka untuk menimpanya, misalnya dari BKD. <b>Kesesuaian</b>: bidang keahlian ~ MK yang diampu (Tabel 1 dan 3), pendidikan dasar D3/D4/S1 sesuai kompetensi inti prodi (butir 12), dan pendidikan tertinggi linier (butir 13).</div>
     <div class="tbl-wrap"><table><thead><tr><th>Dosen</th><th>PS</th><th>PS lain (PT)</th><th>Luar PT</th><th>Penelitian</th><th>PkM</th><th>Tugas tambahan</th><th>Kesesuaian</th>${ub ? "<th></th>" : ""}</tr></thead><tbody>
     ${D.dosenTs.map(x => `<tr><td class="small"><b>${esc(namaPendek(x.nama))}</b><br><span class="muted">${esc(x.status || "Status dosen belum diisi di biodata")}</span>${x.mk.length ? `<br><span class="muted">${esc(x.mk.join("; "))}</span>` : ""}</td>
       <td>${f(x, "ps", String(x.sksPsHitung).replace(".", ","))}</td><td>${f(x, "psLain")}</td><td>${f(x, "luarPt")}</td><td>${f(x, "penelitian")}</td><td>${f(x, "pkm")}</td><td>${f(x, "tambahan")}</td>
       <td>${["sesuai", "dasarSesuai", "linier"].map(k => `<label class="row small" style="gap:4px;flex-wrap:nowrap;margin-bottom:2px"><select id="dt-${x.id}-${k}" style="width:auto" ${ub ? "" : "disabled"} aria-label="${k} ${esc(x.nama)}"><option value="">–</option><option ${x[k] === "Ya" ? "selected" : ""}>Ya</option><option ${x[k] === "Tidak" ? "selected" : ""}>Tidak</option></select><span class="muted">${{ sesuai: "Bidang ~ MK", dasarSesuai: "Pend. dasar", linier: "Linier" }[k]}</span></label>`).join("")}</td>
       ${ub ? `<td><button class="btn sm" data-act="dpDtSimpan" data-id="${x.id}" ${S.sibuk ? "disabled" : ""}>Simpan</button></td>` : ""}</tr>`).join("") || `<tr><td colspan="9"><div class="empty">Belum ada akun dosen.</div></td></tr>`}</tbody></table></div>`;
  }
  return `<div class="head"><div><h1>Data Prodi</h1><p>Sumber Tabel iLKPS 1–6: kurikulum, tim pengajar per semester, dosen industri/praktisi, dan data dosen per tahun akademik. ${ub ? "" : "Anda dapat melihat; perubahan oleh Admin Prodi."}</p></div><button class="btn" data-go="ilkps">Lihat Tabel iLKPS</button></div>
   <div class="seg" role="group" aria-label="Bagian" style="margin-bottom:12px;flex-wrap:wrap">${tabs.map(([k, l]) => `<button data-act="dpTab" data-t="${k}" aria-pressed="${S.dpTab === k}">${l}</button>`).join("")}</div>
   ${S.laci ? "" : galatHtml()}${isi}`;
}
function laciMk() {
  const m = S.laci.m || { kode: "", nama: "", semester: 1, kompetensi: false, sksKuliah: "", sksSeminar: "", sksPraktik: "", cplSikap: false, cplPengetahuan: false, cplKu: false, cplKk: false, rps: "", unit: "Prodi UPW" };
  const cek = (id, l, v) => `<label><input type="checkbox" id="${id}" ${v ? "checked" : ""}><span>${l}</span></label>`;
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Mata kuliah" style="width:min(620px,100%)">
   <div class="dh"><h2>${S.laci.m ? "Ubah mata kuliah" : "Tambah mata kuliah"}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   <div class="grid g3" style="gap:10px"><div class="field"><label for="mkKode">Kode${wajib}</label><input id="mkKode" type="text" value="${esc(m.kode)}" placeholder="UPW201"></div>
    <div class="field" style="grid-column:span 2"><label for="mkNama">Nama mata kuliah${wajib}</label><input id="mkNama" type="text" value="${esc(m.nama)}" placeholder="Travel Agency Operation"></div></div>
   <div class="grid g3" style="gap:10px"><div class="field"><label for="mkSmt">Semester${wajib}</label><select id="mkSmt">${[1, 2, 3, 4, 5, 6, 7, 8].map(n => `<option ${m.semester === n ? "selected" : ""}>${n}</option>`).join("")}</select></div>
    <div class="field"><label for="mkUnit">Unit penyelenggara</label><input id="mkUnit" type="text" value="${esc(m.unit)}"></div>
    <div class="field"><span style="font-weight:600;font-size:.82rem">Mata kuliah kompetensi</span><div class="classgrid">${cek("mkKomp", "Ya", m.kompetensi)}</div></div></div>
   <div class="grid g3" style="gap:10px"><div class="field"><label for="mkK">Sks kuliah/responsi/tutorial</label><input id="mkK" type="text" inputmode="decimal" value="${m.sksKuliah}"></div>
    <div class="field"><label for="mkS">Sks seminar</label><input id="mkS" type="text" inputmode="decimal" value="${m.sksSeminar}"></div>
    <div class="field"><label for="mkP">Sks praktikum/praktik/PKL</label><input id="mkP" type="text" inputmode="decimal" value="${m.sksPraktik}"></div></div>
   <div class="field"><span style="font-weight:600;font-size:.82rem">Capaian pembelajaran yang didukung</span><div class="classgrid">${cek("mkCs", "Sikap", m.cplSikap)}${cek("mkCp", "Pengetahuan", m.cplPengetahuan)}${cek("mkCku", "Keterampilan umum", m.cplKu)}${cek("mkCkk", "Keterampilan khusus", m.cplKk)}</div></div>
   <div class="field"><label for="mkRps">Dokumen rencana pembelajaran (RPS)</label><input id="mkRps" type="text" value="${esc(m.rps)}" placeholder="https://drive.google.com/… atau tulis Ada"><span class="hint">Tautan RPS di Drive prodi, atau tulis <b>Ada</b> bila tersimpan di tempat lain.</span></div>
   ${galatHtml()}<div class="row" style="justify-content:space-between;margin-top:auto">${S.laci.m ? tombol("dpMkHapus", "Hapus", "bad") : "<span></span>"}${tombol("dpMkSimpan", "Simpan")}</div></div></div>`;
}
function laciTim() {
  const D = S.dp, t = D.tim.find(x => x.kode === S.laci.kode), a = t.anggota;
  const opsi = (sel, prak) => `<option value="">${prak ? "– tidak ada –" : "Pilih dosen"}</option><optgroup label="Dosen">${D.dosen.map(x => `<option value="u:${x.id}" ${sel === "u:" + x.id ? "selected" : ""}>${esc(namaPendek(x.nama))}${x.inisial ? " (" + esc(x.inisial) + ")" : ""}</option>`).join("")}</optgroup>
    ${prak ? `<optgroup label="Praktisi">${D.praktisi.map(x => `<option value="p:${x.id}" ${sel === "p:" + x.id ? "selected" : ""}>${esc(x.nama)} · ${esc(x.perusahaan)}</option>`).join("")}</optgroup>` : ""}`;
  const v = i => a[i] ? a[i].t + ":" + a[i].id : "";
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Tim pengajar" style="width:min(560px,100%)">
   <div class="dh"><h2>Tim pengajar ${esc(t.kode)}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   <p class="small">${esc(t.nama)} · ${t.sks} sks · <b>${esc(D.labelSemester)}</b></p>
   <div class="field"><label for="tim0">Pengampu utama${wajib}</label><select id="tim0">${opsi(v(0), false)}</select></div>
   <div class="field"><label for="tim1">Anggota tim 2</label><select id="tim1">${opsi(v(1), true)}</select></div>
   <div class="field"><label for="tim2">Anggota tim 3</label><select id="tim2">${opsi(v(2), true)}</select></div>
   <span class="hint">Praktisi belum ada di daftar? Tambahkan dulu di tab Praktisi. Kosongkan pengampu utama untuk menghapus tim semester ini.</span>
   ${galatHtml()}<div class="row" style="justify-content:flex-end;margin-top:auto">${tombol("dpTimSimpan", "Simpan tim")}</div></div></div>`;
}
function laciPraktisi() {
  const x = S.laci.x || {};
  const f = (id, k, l, ph, req) => `<div class="field"><label for="${id}">${l}${req ? wajib : ""}</label><input id="${id}" type="text" value="${esc(x[k] || "")}" placeholder="${esc(ph)}"></div>`;
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Praktisi" style="width:min(560px,100%)">
   <div class="dh"><h2>${x.id ? "Ubah praktisi" : "Tambah praktisi"}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   ${f("prNama", "nama", "Nama lengkap dengan gelar", "Contoh: Made Wirawan, S.Par.", 1)}${f("prPer", "perusahaan", "Perusahaan / industri", "Contoh: PT Bali Tour Nusantara", 1)}
   <div class="grid g2" style="gap:10px">${f("prNidk", "nidk", "NIDK (bila ada)", "")}${f("prPend", "pendidikan", "Pendidikan tertinggi", "Contoh: S1 Pariwisata")}</div>
   ${f("prBid", "bidang", "Bidang keahlian", "Contoh: Tour operation; Ticketing")}${f("prSert", "sertifikat", "Sertifikat profesi/kompetensi/industri", "Contoh: Tour Leader – LSP Pariwisata (BNSP), 2022")}
   ${galatHtml()}<div class="row" style="justify-content:space-between;margin-top:auto">${x.id ? tombol("dpPrakHapus", "Hapus", "bad") : "<span></span>"}${tombol("dpPrakSimpan", "Simpan")}</div></div></div>`;
}
const angkaId = v => String(v || "").trim().replace(",", ".");
function pecahImpor(teks) {
  return teks.split(/\r?\n/).map(b => b.trim()).filter(Boolean).map((b, i) => {
    const c = b.split(/\t|;/).map(x => x.trim());
    if (c.length < 4) throw new Error("Baris " + (i + 1) + " kurang kolom: " + b);
    return { kode: c[0], nama: c[1], semester: Number(c[2]), sksKuliah: angkaId(c[3]), sksSeminar: angkaId(c[4]), sksPraktik: angkaId(c[5]), kompetensi: /^(ya|y|v|1)$/i.test(c[6] || "") };
  }).filter(r => !/^kode$/i.test(r.kode));
}
Object.assign(AKSI, {
  dpTab(d) { S.dpTab = d.t; S.galat = ""; render(); },
  dpImporBuka() { S.dpImpor = !S.dpImpor; S.galat = ""; render(); },
  dpImporSimpan() {
    let daftar; try { daftar = pecahImpor($("dpImporTeks").value); } catch (e) { S.galat = e.message; render(); return; }
    if (!daftar.length) { S.galat = "Tempel minimal satu baris."; render(); return; }
    jalankan(async () => { const j = await api("dp.mkSimpan", { daftar }); S.dp = null; S.ilkps = null; S.dpImpor = false; toast(`Impor selesai: ${j.baru} baru, ${j.diubah} diperbarui.`); });
  },
  dpMkBaru() { S.laci = { jenis: "mk" }; S.galat = ""; render(); fokus("mkKode"); },
  dpMkUbah(d) { S.laci = { jenis: "mk", m: S.dp.mk.find(m => m.kode === d.kode) }; S.galat = ""; render(); },
  dpMkSimpan() {
    const data = { kode: $("mkKode").value, nama: $("mkNama").value, semester: Number($("mkSmt").value), unit: $("mkUnit").value, kompetensi: $("mkKomp").checked,
      sksKuliah: angkaId($("mkK").value), sksSeminar: angkaId($("mkS").value), sksPraktik: angkaId($("mkP").value), cplSikap: $("mkCs").checked, cplPengetahuan: $("mkCp").checked,
      cplKu: $("mkCku").checked, cplKk: $("mkCkk").checked, rps: $("mkRps").value.trim() };
    const lama = S.laci.m ? S.laci.m.kode : undefined;
    S.laci.m = Object.assign({}, S.laci.m || {}, data);
    jalankan(async () => { await api("dp.mkSimpan", { kodeLama: lama, data }); S.laci = null; S.dp = null; S.ilkps = null; toast("Mata kuliah tersimpan."); });
  },
  dpMkHapus() {
    if (!confirm("Hapus mata kuliah ini dari kurikulum?")) return;
    jalankan(async () => { await api("dp.mkHapus", { kode: S.laci.m.kode }); S.laci = null; S.dp = null; S.ilkps = null; toast("Mata kuliah dihapus."); });
  },
  dpTimAtur(d) { S.laci = { jenis: "tim", kode: d.kode }; S.galat = ""; render(); },
  dpTimSimpan() {
    const anggota = ["tim0", "tim1", "tim2"].map(id => $(id).value).filter(Boolean).map(v => ({ t: v[0], id: v.slice(2) }));
    if (!anggota.length && !confirm("Hapus tim pengajar mata kuliah ini untuk semester ini?")) return;
    if (anggota.length && $("tim0").value === "") { S.galat = "Pilih pengampu utama dulu."; render(); return; }
    jalankan(async () => { await api("dp.timSimpan", { semester: S.dp.semester, kodeMk: S.laci.kode, anggota }); S.laci = null; S.dpSmt = S.dp.semester; S.dp = null; S.ilkps = null; toast("Tim pengajar tersimpan."); });
  },
  dpTimSalin() {
    jalankan(async () => { const j = await api("dp.timSalin", { semester: S.dp.semester }); S.dpSmt = S.dp.semester; S.dp = null; S.ilkps = null; toast(j.disalin ? `${j.disalin} tim disalin dari ${j.dari}.` : `Tidak ada tim yang perlu disalin dari ${j.dari}.`); });
  },
  dpPrakBaru() { S.laci = { jenis: "praktisi" }; S.galat = ""; render(); fokus("prNama"); },
  dpPrakUbah(d) { S.laci = { jenis: "praktisi", x: S.dp.praktisi.find(x => x.id === d.id) }; S.galat = ""; render(); },
  dpPrakSimpan() {
    const data = { id: S.laci.x ? S.laci.x.id : undefined, nama: $("prNama").value, perusahaan: $("prPer").value, nidk: $("prNidk").value, pendidikan: $("prPend").value, bidang: $("prBid").value, sertifikat: $("prSert").value };
    S.laci.x = Object.assign({}, S.laci.x || {}, data);
    jalankan(async () => { await api("dp.praktisiSimpan", { data }); S.laci = null; S.dp = null; S.ilkps = null; toast("Praktisi tersimpan."); });
  },
  dpPrakHapus() {
    if (!confirm("Hapus praktisi ini? Tim pengajar yang memuatnya akan menampilkan '(praktisi dihapus)'.")) return;
    jalankan(async () => { await api("dp.praktisiHapus", { id: S.laci.x.id }); S.laci = null; S.dp = null; S.ilkps = null; toast("Praktisi dihapus."); });
  },
  dpDtSimpan(d) {
    const v = k => angkaId($(`dt-${d.id}-${k}`).value), data = { userId: d.id, ps: v("ps"), psLain: v("psLain"), luarPt: v("luarPt"), penelitian: v("penelitian"), pkm: v("pkm"), tambahan: v("tambahan"),
      sesuai: $(`dt-${d.id}-sesuai`).value, dasarSesuai: $(`dt-${d.id}-dasarSesuai`).value, linier: $(`dt-${d.id}-linier`).value };
    for (const k of ["ps", "psLain", "luarPt", "penelitian", "pkm", "tambahan"]) if (data[k] !== "" && !(Number(data[k]) >= 0)) { toast("Isi angka (sks) yang valid."); return; }
    jalankan(async () => { await api("dp.dosenTsSimpan", { ta: S.dp.ta, data }).catch(e => { toast(e.message); throw e; }); S.dpTa = S.dp.ta; S.dp = null; S.ilkps = null; toast("Data dosen tersimpan."); });
  }
});
document.addEventListener("change", e => {
  if (e.target.id === "dpSmt") { S.dpSmt = e.target.value; S.dp = null; render(); }
  if (e.target.id === "dpTa") { S.dpTa = Number(e.target.value); S.dp = null; render(); }
});

/* --- Lulusan, PMB, keuangan (v0.10.0) --- */
const rp = n => n ? "Rp" + Number(n).toLocaleString("id-ID") : "–";
function isiLulusan() {
  if (!S.lul) { sekali("lul", async () => { S.lul = await api("lul.data", { ta: S.lulTa || undefined }); render(); }); return `<div class="memuat" style="min-height:120px">Memuat…</div>`; }
  const L = S.lul, ub = L.bolehUbah, dis = S.sibuk ? "disabled" : "";
  if (S.dpTab === "lulusan") {
    const ip = L.lulusan.filter(x => x.ipk != null), rata = ip.length ? ip.reduce((s, x) => s + x.ipk, 0) / ip.length : 0;
    return `<div class="grid g3"><div class="panel stat"><span class="v num">${L.lulusan.length}</span><span class="l">Lulusan tercatat</span></div>
      <div class="panel stat"><span class="v num">${L.lulusan.filter(x => x.terlacak).length}</span><span class="l">Terlacak (tracer study terisi)</span></div>
      <div class="panel stat"><span class="v num">${ip.length ? rata.toLocaleString("id-ID", { maximumFractionDigits: 2 }) : "–"}</span><span class="l">Rata-rata IPK</span></div></div>
     ${ub ? `<div class="row"><button class="btn primary" data-act="lulImporBuka">${S.lulImpor ? "Tutup impor" : "Impor / perbarui (tempel atau berkas Excel)"}</button></div>` : ""}
     ${S.lulImpor ? `<section class="panel"><h2>Impor lulusan</h2><p class="small">Salin baris dari Excel lalu tempel. Urutan kolom: <b>NIM; Nama; Tahun masuk; Tanggal lulus; IPK; Waktu tunggu kerja (bulan); Kesesuaian bidang kerja (Rendah/Sedang/Tinggi); Tempat kerja (Lokal/Nasional/Internasional)</b>.
       Tanggal boleh 2025-08-20 atau 20/08/2025; koma desimal boleh. Kolom tracer (3 terakhir) boleh kosong bila lulusan belum terlacak. NIM yang sudah ada akan diperbarui, dan akun mahasiswa dengan NIM itu otomatis berstatus <b>Lulus</b>.</p>
       <textarea id="lulTeks" rows="7" placeholder="210101&#9;Kadek Contoh&#9;2021&#9;20/08/2025&#9;3,52&#9;2&#9;Tinggi&#9;Nasional"></textarea>${galatHtml()}<div class="row" style="justify-content:flex-end">${tombol("lulImporSimpan", "Impor")}</div>${panelImporExcel("lulusan")}</section>` : ""}
     <div class="tbl-wrap"><table><thead><tr><th>NIM</th><th>Nama</th><th>Masuk</th><th>Lulus</th><th>IPK</th><th>Waktu tunggu</th><th>Kesesuaian</th><th>Tempat kerja</th>${ub ? "<th></th>" : ""}</tr></thead><tbody>
     ${L.lulusan.map(x => `<tr><td class="mono small">${esc(x.nim)}</td><td class="small">${esc(x.nama)}</td><td class="num">${x.masuk}</td><td class="small num">${esc(tglPendek(x.tglLulus))}<br><span class="muted">TA ${x.taLulus}/${x.taLulus + 1}</span></td>
       <td class="num">${x.ipk != null ? x.ipk.toLocaleString("id-ID") : "–"}</td><td class="num">${x.wtBulan != null ? x.wtBulan.toLocaleString("id-ID") + " bln" : "–"}</td><td class="small">${esc(x.kesesuaian || "–")}</td><td class="small">${esc(x.tempatKerja || "–")}</td>
       ${ub ? `<td><button class="btn sm bad" data-act="lulHapus" data-nim="${esc(x.nim)}" ${dis}>Hapus</button></td>` : ""}</tr>`).join("") || `<tr><td colspan="9"><div class="empty">Belum ada data lulusan.</div></td></tr>`}</tbody></table></div>`;
  }
  if (S.dpTab === "pmb") {
    const th = new Date().getFullYear(), baris = L.penerimaan.slice();
    if (ub && !baris.some(x => x.tahun === th)) baris.unshift({ tahun: th, dayaTampung: "", pendaftar: "", lulusSeleksi: "", diterima: "", baru: true });
    const f = (x, k) => `<input id="pmb-${x.tahun}-${k}" type="text" inputmode="numeric" value="${x[k] === "" ? "" : x[k]}" style="width:90px" ${ub ? "" : "disabled"} aria-label="${k} ${x.tahun}">`;
    return `<div class="callout">Penerimaan mahasiswa baru per tahun. <b>Diterima</b> = mahasiswa yang daftar ulang; dipakai sebagai "Jumlah Mahasiswa Diterima" di Tabel 9. Isi juga tahun-tahun lama (sampai TS-6) agar Tabel 9 lengkap.</div>
     <div class="tbl-wrap"><table><thead><tr><th>Tahun</th><th>Daya tampung</th><th>Pendaftar</th><th>Lulus seleksi</th><th>Diterima (daftar ulang)</th><th>Rasio pendaftar</th>${ub ? "<th></th>" : ""}</tr></thead><tbody>
     ${baris.map(x => `<tr><td>${x.baru ? `<input id="pmbTahunBaru" type="text" inputmode="numeric" value="${x.tahun}" style="width:70px" aria-label="Tahun">` : `<b class="num">${x.tahun}</b>`}</td><td>${f(x, "dayaTampung")}</td><td>${f(x, "pendaftar")}</td><td>${f(x, "lulusSeleksi")}</td><td>${f(x, "diterima")}</td>
       <td class="num small">${x.dayaTampung && x.pendaftar ? (x.pendaftar / x.dayaTampung).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "×" : "–"}</td>${ub ? `<td><button class="btn sm" data-act="pmbSimpan" data-th="${x.tahun}" data-baru="${x.baru ? 1 : ""}" ${dis}>Simpan</button></td>` : ""}</tr>`).join("")}</tbody></table></div>
     ${ub ? `<p class="small muted">Untuk tahun lain, ganti angka tahun di baris pertama lalu Simpan.</p>` : ""}`;
  }
  const th = new Date().getFullYear(), pil = []; for (let a = th; a >= 2015; a--) pil.push(a);
  const f = (j, k) => `<input id="dana-${j.k}-${k}" type="text" inputmode="numeric" value="${(L.dana[j.k] || {})[k] || ""}" placeholder="0" style="width:140px" ${ub ? "" : "disabled"} aria-label="${k === "upps" ? "UPPS" : "Prodi"} ${esc(j.l)}">`;
  return `<div class="row" style="justify-content:space-between;flex-wrap:wrap"><label class="row small" style="gap:6px"><b>Tahun akademik</b><select id="lulTa" style="width:auto">${pil.map(a => `<option value="${a}" ${a === L.ta ? "selected" : ""}>${a}/${a + 1}</option>`).join("")}</select></label></div>
   <div class="callout">Penggunaan dana dalam rupiah per tahun akademik, untuk Tabel 21: kolom <b>UPPS</b> (Unit Pengelola Program Studi, mis. jurusan/politeknik) dan <b>Prodi</b>. Isi angka tanpa titik, mis. 250000000.</div>
   <div class="tbl-wrap"><table><thead><tr><th>Jenis penggunaan</th><th>UPPS (Rp)</th><th>Prodi (Rp)</th></tr></thead><tbody>
   ${L.jenisDana.map(j => `<tr><td class="small">${esc(j.l)}</td><td>${f(j, "upps")}</td><td>${f(j, "ps")}</td></tr>`).join("")}</tbody></table></div>
   ${ub ? `<div class="row" style="justify-content:flex-end">${tombol("danaSimpan", "Simpan " + L.labelTa)}</div>` : ""}`;
}
function pecahLulusan(teks) {
  return teks.split(/\r?\n/).map(b => b.trim()).filter(Boolean).map(b => b.split(/\t|;/).map(x => x.trim()))
    .filter(c => !/^nim$/i.test(c[0])).map(c => ({ nim: c[0], nama: c[1], masuk: c[2], tglLulus: c[3], ipk: c[4] || "", wtBulan: c[5] || "", kesesuaian: c[6] || "", tempatKerja: c[7] || "" }));
}
const angkaBulat = v => String(v || "").replace(/[^\d]/g, "");
Object.assign(AKSI, {
  lulImporBuka() { S.lulImpor = !S.lulImpor; S.galat = ""; render(); },
  lulImporSimpan() {
    const daftar = pecahLulusan($("lulTeks").value);
    if (!daftar.length) { S.galat = "Tempel minimal satu baris."; render(); return; }
    jalankan(async () => { const j = await api("lul.impor", { daftar }); S.lul = null; S.ilkps = null; S.daftar = null; S.lulImpor = false;
      toast(`Impor selesai: ${j.baru} baru, ${j.diubah} diperbarui${j.akunLulus ? `; ${j.akunLulus} akun mahasiswa ditandai Lulus` : ""}.`); });
  },
  lulHapus(d) {
    if (!confirm("Hapus data lulusan " + d.nim + "?")) return;
    jalankan(async () => { await api("lul.hapus", { nim: d.nim }).catch(e => { toast(e.message); throw e; }); S.lul = null; S.ilkps = null; toast("Data lulusan dihapus."); });
  },
  pmbSimpan(d) {
    const th = d.baru ? $("pmbTahunBaru").value : d.th, v = k => angkaBulat($(`pmb-${d.th}-${k}`).value);
    const data = { tahun: Number(th), dayaTampung: v("dayaTampung"), pendaftar: v("pendaftar"), lulusSeleksi: v("lulusSeleksi"), diterima: v("diterima") };
    jalankan(async () => { await api("lul.pmbSimpan", { data }).catch(e => { toast(e.message); throw e; }); S.lul = null; S.ilkps = null; toast("Data PMB " + th + " tersimpan."); });
  },
  danaSimpan() {
    const data = {}; S.lul.jenisDana.forEach(j => { data[j.k] = { upps: angkaBulat($(`dana-${j.k}-upps`).value), ps: angkaBulat($(`dana-${j.k}-ps`).value) }; });
    const ta = S.lul.ta;
    jalankan(async () => { await api("lul.danaSimpan", { ta, data }); S.lulTa = ta; S.lul = null; S.ilkps = null; toast("Penggunaan dana " + ta + "/" + (ta + 1) + " tersimpan."); });
  }
});
document.addEventListener("change", e => { if (e.target.id === "lulTa") { S.lulTa = Number(e.target.value); S.lul = null; render(); } });

/* --- DED (v0.13.0) --- */
/** Cegah kehilangan narasi yang belum disimpan saat menutup editor. */
function bolehTutup() {
  if (!S.laci || S.laci.jenis !== "ded") return true;
  const t = $("dedTeks");
  return !t || t.value === S.laci.awal || confirm("Narasi belum disimpan. Tutup dan buang perubahan?");
}
const ST_DED = { belum: ["Belum", "s-draf"], draf: ["Draf", "s-revisi"], selesai: ["Selesai", "s-disetujui"] };
const KODE_TABEL_L = k => ({ ref11a: "Ref 11a" }[k] || "Tabel " + k);
function perkiraanHalaman(D) { const kata = D.butir.reduce((s, b) => s + b.kata, 0); return Math.round(kata / 380 + D.butir.reduce((s, b) => s + b.tabel.length, 0) * 0.8 + 6); }
function hDed() {
  if (!S.ded) { sekali("ded", async () => { S.ded = await api("ded.data"); render(); }); return `<div class="memuat">Memuat DED…</div>`; }
  const D = S.ded, dis = S.sibuk ? "disabled" : "", hit = k => D.butir.filter(b => b.status === k).length, f = S.dedF;
  const l = D.butir.filter(b => !f || (f === "saya" ? b.pj === S.pengguna.id : b.status === f));
  const kata = D.butir.reduce((s, b) => s + b.kata, 0), hal = perkiraanHalaman(D);
  const th = new Date().getFullYear(), pil = []; for (let a = th; a >= 2018; a--) pil.push(a);
  const tabNarasi = `<section class="panel"><div class="row" style="justify-content:space-between;flex-wrap:wrap;margin-bottom:8px"><h2>Narasi ${D.kelola ? "64 butir" : "butir tanggung jawab Anda"}</h2>
      <select id="dedF" style="width:auto" aria-label="Saring butir"><option value="">Semua</option><option value="belum" ${f === "belum" ? "selected" : ""}>Belum</option><option value="draf" ${f === "draf" ? "selected" : ""}>Draf</option><option value="selesai" ${f === "selesai" ? "selected" : ""}>Selesai</option><option value="saya" ${f === "saya" ? "selected" : ""}>Tanggung jawab saya</option></select></div>
     <div class="tbl-wrap"><table><thead><tr><th>Butir</th><th>Judul</th><th>Penanggung jawab</th><th>Status</th><th>Kata</th><th>Diubah</th></tr></thead><tbody>
     ${l.map(b => `<tr style="cursor:pointer" data-act="dedBuka" data-n="${b.n}"><td class="num">${b.n}</td><td>${esc(b.judul)}${b.tabel.length ? `<div class="small muted">${b.tabel.map(KODE_TABEL_L).join(", ")} otomatis</div>` : ""}</td>
       <td class="small">${esc(b.pjNama ? namaPendek(b.pjNama) : "–")}</td><td><span class="chip ${ST_DED[b.status][1]}">${ST_DED[b.status][0]}</span></td><td class="num">${b.kata.toLocaleString("id-ID")}</td><td class="small num">${b.diubah ? tgl(b.diubah) : "–"}</td></tr>`).join("") || `<tr><td colspan="6"><div class="empty">Tidak ada butir.</div></td></tr>`}</tbody></table></div></section>`;
  const tabId = !D.kelola ? "" : (() => {
    const isian = D.identitas.map(x => `<div class="field"><label for="di-${x.k}">${esc(x.l)}</label><input id="di-${x.k}" data-did="${x.k}" type="text" value="${esc(x.v)}"></div>`).join("");
    const ps = D.daftarPs.length ? D.daftarPs : [{ nama: "Usaha Perjalanan Wisata", jenis: "Sarjana Terapan", peringkat: "", sk: "", kedaluwarsa: "", mhs: "" }];
    const tim = D.tim.length ? D.tim : [{ userId: "", nama: "", nidn: "", jabatan: "", tanggal: "" }];
    return `<section class="panel"><h2>Identitas pengusul</h2><div class="grid g2" style="gap:10px">${isian}</div></section>
     <section class="panel"><h2>Daftar program studi di UPPS</h2><div class="tbl-wrap"><table><thead><tr><th>Nama PS</th><th>Jenis program</th><th>Status/peringkat</th><th>No. dan tgl. SK</th><th>Tgl. kedaluwarsa</th><th>Mahasiswa saat TS</th><th></th></tr></thead><tbody id="dedPs">
      ${ps.map((r, i) => `<tr data-psi="${i}">${["nama", "jenis", "peringkat", "sk", "kedaluwarsa", "mhs"].map(k => `<td><input data-psk="${k}" type="text" value="${esc(r[k] ?? "")}" aria-label="${k} ${i + 1}" style="min-width:${k === "mhs" ? 70 : 120}px"></td>`).join("")}<td><button class="btn sm bad" data-act="dedPsHapus" data-i="${i}" aria-label="Hapus baris">×</button></td></tr>`).join("")}</tbody></table></div>
      <div class="row"><button class="btn sm" data-act="dedPsTambah">+ Baris</button></div></section>
     <section class="panel"><h2>Tim penyusun</h2><p class="small muted">Nama dan NIDN diambil dari akun dosen bila dipilih. Tanda tangan dibubuhkan pada dokumen cetak.</p><div class="tbl-wrap"><table><thead><tr><th>Dosen / nama</th><th>NIDN</th><th>Jabatan</th><th>Tanggal pengisian</th><th></th></tr></thead><tbody>
      ${tim.map((r, i) => `<tr data-timi="${i}"><td><select data-timk="userId" style="min-width:180px" aria-label="Dosen ${i + 1}"><option value="">– nama lain –</option>${D.dosen.map(o => `<option value="${o.id}" ${r.userId === o.id ? "selected" : ""}>${esc(namaPendek(o.nama))}</option>`).join("")}</select>
        <input data-timk="nama" type="text" value="${esc(r.userId ? "" : r.nama)}" placeholder="Nama (bila bukan akun dosen)" aria-label="Nama ${i + 1}" style="margin-top:4px;${r.userId ? "display:none" : ""}"></td>
        <td><input data-timk="nidn" type="text" value="${esc(r.nidn || (r.userId ? D.nidn[r.userId] || "" : ""))}" style="width:120px" aria-label="NIDN ${i + 1}"></td><td><input data-timk="jabatan" type="text" value="${esc(r.jabatan)}" placeholder="Contoh: Ketua Tim / GPM" aria-label="Jabatan ${i + 1}"></td>
        <td><input data-timk="tanggal" type="date" value="${esc(r.tanggal)}" aria-label="Tanggal ${i + 1}"></td><td><button class="btn sm bad" data-act="dedTimHapus" data-i="${i}" aria-label="Hapus anggota">×</button></td></tr>`).join("")}</tbody></table></div>
      <div class="row" style="justify-content:space-between;flex-wrap:wrap"><button class="btn sm" data-act="dedTimTambah">+ Anggota</button>${tombol("dedIdSimpan", "Simpan identitas dan tim")}</div></section>`;
  })();
  return `<div class="head"><div><h1>Dokumen Evaluasi Diri (DED)</h1><p>Tulis narasi 64 butir DED LAMWisata. Ekspor Word menyusun halaman muka, identitas pengusul, tim penyusun, narasi, dan Tabel 1–23 dari Tabel iLKPS di posisinya, dengan format Calibri 12, spasi 1, A4, margin 3–4–3–3 cm.</p></div></div>
   <div class="grid g3">
    <div class="panel stat"><span class="l">Kemajuan</span><span class="v num">${hit("selesai")}<span class="muted" style="font-size:1rem"> / ${D.butir.length} selesai</span></span><div class="bar" style="margin-top:6px"><i style="width:${D.butir.length ? hit("selesai") / D.butir.length * 100 : 0}%"></i></div><span class="l">${hit("draf")} draf · ${hit("belum")} belum</span></div>
    <div class="panel stat"><span class="l">Panjang naskah</span><span class="v num">${kata.toLocaleString("id-ID")}</span><span class="l">kata · perkiraan <b>${hal}</b> halaman dari maksimal 120 halaman isi${hal > 120 ? ` <b style="color:var(--bad)">(melebihi)</b>` : ""}</span></div>
    <div class="panel stat"><span class="l">Unduh Word (.docx)</span>
     <div class="row small" style="gap:6px;flex-wrap:wrap;margin-top:4px"><label class="row" style="gap:4px">TS <select id="dedTs" style="width:auto">${pil.map(a => `<option value="${a}" ${a === D.ts.awal ? "selected" : ""}>${a}/${a + 1}</option>`).join("")}</select></label>
      <label class="row" style="gap:4px;flex-wrap:nowrap"><input type="checkbox" id="dedPetunjuk" checked style="flex:none"> Sertakan petunjuk butir</label></div>
     <button class="btn primary" data-act="dedUnduh" ${dis} style="margin-top:8px">${S.sibuk ? "Menyusun…" : "Unduh DED (.docx)"}</button></div></div>
   ${D.kelola ? `<div class="seg" role="group" aria-label="Bagian" style="margin-bottom:12px"><button data-act="dedTab" data-t="narasi" aria-pressed="${S.dedTab === "narasi"}">Narasi 64 butir</button><button data-act="dedTab" data-t="identitas" aria-pressed="${S.dedTab === "identitas"}">Identitas &amp; tim</button></div>` : ""}
   ${S.laci ? "" : galatHtml()}${S.dedTab === "identitas" && D.kelola ? tabId : tabNarasi}`;
}
function laciDed() {
  const D = S.ded, b = D.butir.find(x => x.n === S.laci.n);
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Butir DED" style="width:min(820px,100%)">
   <div class="dh"><h2>Butir ${b.n}. ${esc(b.judul)}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   <details class="picker" open><summary class="small" style="cursor:pointer"><b>Petunjuk DED</b></summary><div class="small" style="white-space:pre-wrap;margin-top:6px">${esc(b.petunjuk)}</div>
    ${b.tabel.length ? `<div class="auto" style="margin-top:6px">${b.tabel.map(KODE_TABEL_L).join(", ")} disisipkan otomatis dari Tabel iLKPS setelah narasi ini saat ekspor Word. Narasi cukup menganalisis isinya.</div>` : ""}</details>
   ${b.matriks.length ? `<details class="picker"><summary class="small" style="cursor:pointer"><b>Butir matriks terkait (${b.matriks.length})</b> · syarat skor 4</summary>${b.matriks.map(m => `<div class="small" style="margin-top:6px"><b>${m.n}. ${esc(m.nm)}</b> (bobot ${String(m.w).replace(".", ",")}): ${esc(m.s4)} <span class="muted">Sumber: ${esc(m.src)}</span></div>`).join("")}</details>` : ""}
   <div class="field"><label for="dedTeks">Narasi</label><textarea id="dedTeks" rows="16" ${b.bolehUbah ? "" : "readonly"} placeholder="Pola yang disarankan: (1) kondisi saat ini dengan data dan bukti, (2) analisis keberhasilan dan kendala, (3) tindak lanjut. Pisahkan paragraf dengan baris kosong; awali baris dengan '- ' untuk butir daftar.">${esc(b.teks)}</textarea>
    <span class="hint"><span id="dedKata">${b.kata.toLocaleString("id-ID")}</span> kata. Gunakan angka dari halaman Penilaian dan Tabel iLKPS agar narasi konsisten dengan data.</span></div>
   <div class="grid g2" style="gap:10px"><div class="field"><label for="dedStatus">Status</label><select id="dedStatus" ${b.bolehUbah ? "" : "disabled"}>${Object.entries(ST_DED).map(([k, v]) => `<option value="${k}" ${b.status === k ? "selected" : ""}>${v[0]}</option>`).join("")}</select></div>
    ${D.kelola ? `<div class="field"><label for="dedPj">Penanggung jawab</label><select id="dedPj"><option value="">– belum ditunjuk –</option>${D.dosen.map(o => `<option value="${o.id}" ${b.pj === o.id ? "selected" : ""}>${esc(namaPendek(o.nama))}</option>`).join("")}</select><span class="hint">Dosen yang ditunjuk bisa menulis butir ini dari menu DED miliknya.</span></div>` : `<div class="field"><span class="small muted">Penanggung jawab: ${esc(b.pjNama || "–")}</span></div>`}</div>
   ${b.oleh ? `<p class="small muted">Terakhir diubah ${esc(namaPendek(b.oleh))}, ${tgl(b.diubah)}.</p>` : ""}
   ${galatHtml()}${b.bolehUbah ? `<div class="row" style="justify-content:flex-end;margin-top:auto">${tombol("dedSimpan", "Simpan")}</div>` : ""}</div></div>`;
}
function kumpulIdentitas() {
  const identitas = {}; document.querySelectorAll("[data-did]").forEach(el => { identitas[el.dataset.did] = el.value; });
  const daftarPs = [...document.querySelectorAll("[data-psi]")].map(tr => { const o = {}; tr.querySelectorAll("[data-psk]").forEach(el => { o[el.dataset.psk] = el.value; }); return o; });
  const tim = [...document.querySelectorAll("[data-timi]")].map(tr => { const o = {}; tr.querySelectorAll("[data-timk]").forEach(el => { o[el.dataset.timk] = el.value; }); return o; });
  return { identitas, daftarPs, tim };
}
function terapkanIdentitas(x) { // simpan sementara isian di S.ded agar menambah/menghapus baris tidak menghapus ketikan
  S.ded.identitas.forEach(f => { if (x.identitas[f.k] !== undefined) f.v = x.identitas[f.k]; });
  S.ded.daftarPs = x.daftarPs; S.ded.tim = x.tim.map(t => Object.assign(t, { nama: t.userId ? (S.ded.dosen.find(o => o.id === t.userId) || {}).nama || "" : t.nama }));
}
async function eksporDed(ts, petunjuk) {
  const D = S.ded, I = await api("ilkps.data", { ts }), T = {}; I.tabel.forEach(t => { T[t.kode] = t; });
  const v = k => (D.identitas.find(x => x.k === k) || {}).v || "", d = UPW_DOCX.baru();
  // logo (perbandingan sisi asli)
  let logo = null, rasio = 1;
  try {
    const r = await fetch("logo.png"); logo = new Uint8Array(await r.arrayBuffer());
    // Ukuran asli dibaca dari kepala PNG (lebar/tinggi di bait 16–23), tanpa menunggu gambar digambar browser.
    const dv = new DataView(logo.buffer); const w = dv.getUint32(16), h = dv.getUint32(20); if (w && h) rasio = h / w;
  } catch (_) { logo = null; }
  d.p("", { sesudah: 60 });
  if (logo) d.gambar(logo, 4.5, 4.5 * rasio, { rata: "center", sesudah: 24 });
  [["DOKUMEN AKREDITASI PROGRAM STUDI", 16], ["AKREDITASI PROGRAM STUDI", 14], ["PROGRAM " + v("jenis").toUpperCase() + " " + v("ps").toUpperCase(), 14]].forEach(([t, u]) => d.p(t, { b: 1, ukuran: u, rata: "center", sesudah: 6 }));
  d.p("", { sesudah: 80 });
  [v("pt").toUpperCase(), v("kota").toUpperCase(), "TAHUN " + (v("tahun") || new Date().getFullYear())].forEach(t => d.p(t, { b: 1, ukuran: 14, rata: "center", sesudah: 6 }));
  d.p("IDENTITAS PENGUSUL", { b: 1, ukuran: 14, rata: "center", halamanBaru: 1, sesudah: 12 });
  d.tabel(D.identitas.filter(x => !["kota", "tahun"].includes(x.k)).map(x => [x.l, ": " + (x.v || "…")]), { judul: false, ukuran: 11, lebar: [6.5, 7.5] });
  d.p("Daftar Program Studi di Unit Pengelola Program Studi (UPPS)", { b: 1, sebelum: 6 });
  const ps = D.daftarPs;
  d.tabel([["No.", "Jenis Program", "Nama Program Studi", "Status/Peringkat", "No. dan Tgl. SK", "Tgl. Kedaluwarsa", "Jumlah mahasiswa saat TS"]].concat(ps.map((r, i) => [i + 1, r.jenis, r.nama, r.peringkat, r.sk, r.kedaluwarsa, Number(r.mhs) || ""]),
    [["Jumlah", "", "", "", "", "", ps.reduce((s, r) => s + (Number(r.mhs) || 0), 0)]]), { ukuran: 9 });
  d.p("IDENTITAS TIM PENYUSUN DOKUMEN AKREDITASI PROGRAM STUDI", { b: 1, ukuran: 14, rata: "center", halamanBaru: 1, sesudah: 12 });
  (D.tim.length ? D.tim : [{ nama: "", nidn: "", jabatan: "", tanggal: "" }]).forEach(t => {
    const tg = t.tanggal ? t.tanggal.split("-").reverse().join(" – ") : "DD – MM – YYYY";
    d.tabel([["Nama", ": " + (t.nama || "")], ["NIDN", ": " + (t.nidn || "")], ["Jabatan", ": " + (t.jabatan || "")], ["Tanggal Pengisian", ": " + tg], ["Tanda Tangan", ":\n\n"]], { judul: false, ukuran: 11, lebar: [4.5, 9.5] });
  });
  d.p("INDIKATOR KINERJA UTAMA", { b: 1, ukuran: 14, rata: "center", halamanBaru: 1, sesudah: 12 });
  D.butir.forEach(b => {
    d.p(b.n + ". " + b.judul, { b: 1, sebelum: 12, sesudah: 4, tetap: 1 });
    if (petunjuk) d.p(b.petunjuk.replace(/\n/g, " "), { i: 1, ukuran: 10, warna: "555555", sesudah: 6 });
    const par = String(b.teks || "").split(/\n\s*\n|\n/).map(s => s.trim()).filter(Boolean);
    if (!par.length) d.p("[Narasi butir ini belum diisi]", { i: 1, warna: "C00000" });
    par.forEach(s => /^[-•]\s+/.test(s) ? d.p("•	" + s.replace(/^[-•]\s+/, ""), { rata: "justify", inden: 1, gantung: 0.5, sesudah: 3 }) : d.p(s, { rata: "justify" }));
    b.tabel.forEach(k => { const t = T[k]; if (!t) return;
      d.p(t.judul + " — TS " + I.ts.label, { b: 1, ukuran: 10, sebelum: 6, sesudah: 3, tetap: 1 });
      d.tabel([t.kolom].concat(t.baris), { ukuran: t.kolom.length > 9 ? 7 : t.kolom.length > 6 ? 8 : 9 });
      if (t.catatan) d.p("Catatan: " + t.catatan, { i: 1, ukuran: 8, warna: "555555" }); });
  });
  unduh(d.blob({ judul: "DED Prodi " + v("ps"), kaki: "DED " + v("ps") + " – TS " + I.ts.label }), "DED " + namaBerkas(v("ps")) + " - TS " + I.ts.label.replace("/", "-") + ".docx");
}
Object.assign(AKSI, {
  dedTab(d) { if (S.dedTab === "identitas" && S.ded) terapkanIdentitas(kumpulIdentitas()); S.dedTab = d.t; S.galat = ""; render(); },
  dedBuka(d) { const b = S.ded.butir.find(x => x.n === Number(d.n)); S.laci = { jenis: "ded", n: b.n, awal: b.teks, versi: b.diubah }; S.galat = ""; render(); },
  dedSimpan() {
    const L = S.laci, teks = $("dedTeks").value, status = $("dedStatus").value, pj = $("dedPj") ? $("dedPj").value : undefined;
    const b = S.ded.butir.find(x => x.n === L.n), data = { butir: L.n, teks, status: status === "belum" && teks.trim() ? "draf" : status, versi: L.versi || "" };
    if (pj !== undefined && pj !== b.pj) data.pj = pj;
    jalankan(async () => {
      const j = await api("ded.simpan", data).catch(e => { toast(e.message); throw e; });
      Object.assign(b, { teks, status: data.status, kata: (teks.trim().match(/\S+/g) || []).length, diubah: j.diubah, oleh: S.pengguna.nama });
      if (data.pj !== undefined) { b.pj = data.pj; b.pjNama = (S.ded.dosen.find(o => o.id === data.pj) || {}).nama || ""; }
      L.awal = teks; L.versi = j.diubah; S.laci = null; S.tugas = null; toast("Butir " + L.n + " tersimpan.");
    });
  },
  dedPsTambah() { const x = kumpulIdentitas(); x.daftarPs.push({ nama: "", jenis: "", peringkat: "", sk: "", kedaluwarsa: "", mhs: "" }); terapkanIdentitas(x); render(); },
  dedPsHapus(d) { const x = kumpulIdentitas(); x.daftarPs.splice(Number(d.i), 1); terapkanIdentitas(x); render(); },
  dedTimTambah() { const x = kumpulIdentitas(); x.tim.push({ userId: "", nama: "", nidn: "", jabatan: "", tanggal: "" }); terapkanIdentitas(x); render(); },
  dedTimHapus(d) { const x = kumpulIdentitas(); x.tim.splice(Number(d.i), 1); terapkanIdentitas(x); render(); },
  dedIdSimpan() {
    const x = kumpulIdentitas(); terapkanIdentitas(x);
    jalankan(async () => { await api("ded.identitas", x); S.ded = null; toast("Identitas dan tim penyusun tersimpan."); });
  },
  dedUnduh() {
    const ts = Number($("dedTs").value), pet = $("dedPetunjuk").checked;
    if (S.dedTab === "identitas" && S.ded.kelola) terapkanIdentitas(kumpulIdentitas());
    jalankan(async () => { toast("Menyusun dokumen Word…"); await eksporDed(ts, pet); toast("DED (.docx) dibuat."); });
  }
});
document.addEventListener("input", e => { if (e.target.id === "dedTeks") { const n = (e.target.value.trim().match(/\S+/g) || []).length; const el = $("dedKata"); if (el) el.textContent = n.toLocaleString("id-ID"); } });
document.addEventListener("change", e => {
  if (e.target.id === "dedF") { S.dedF = e.target.value; render(); }
  if (e.target.dataset && e.target.dataset.timk === "userId") {
    const tr = e.target.closest("[data-timi]"), nama = tr.querySelector('[data-timk="nama"]'), nidn = tr.querySelector('[data-timk="nidn"]');
    nama.style.display = e.target.value ? "none" : ""; if (e.target.value && !nidn.value) nidn.value = S.ded.nidn[e.target.value] || "";
  }
});

/* --- Portofolio Mata Kuliah (v0.14.0) --- */
const KOMP_SING = { rps: "RPS", kontrak: "Kontrak", rubrik: "Rubrik", metode: "Metode", integ: "Integrasi", interaksi: "Interaksi" };
function muatMkp() { sekali("mkp", async () => { S.mkp = await api("mkp.saya", { semester: S.mkpSmt || undefined }); render(); }); }
function pilihSmtMkp(id, D) {
  return `<label class="row small" style="gap:6px"><b>Semester</b><select id="${id}" style="width:auto">${D.pilihanSemester.map(s => `<option value="${s.kode}" ${s.kode === D.semester ? "selected" : ""}>${esc(s.label)}${s.kode === D.semesterKini ? " (berjalan)" : ""}</option>`).join("")}</select></label>`;
}
const tandaKomp = (x, k) => x.lengkap.includes(k) ? '<span style="color:var(--ok)" aria-label="ada">✓</span>' : '<span style="color:var(--warn)" aria-label="belum">–</span>';
function hMk() {
  if (!S.mkp) { muatMkp(); return `<div class="memuat">Memuat mata kuliah…</div>`; }
  const D = S.mkp, n = D.komp.length;
  return `<div class="head"><div><h1>Mata Kuliah Saya</h1><p>Mata kuliah yang Anda ampu sesuai tim pengajar yang ditetapkan Admin Prodi. Kelengkapannya dipakai untuk butir 8 (RPS), 22 (proses pembelajaran), dan 25 (penilaian).</p></div>${pilihSmtMkp("mkpSmt", D)}</div>
   ${D.semester < D.semesterKini ? `<div class="callout">Anda melihat <b>${esc(D.labelSemester)}</b>. Semester yang sudah lewat hanya bisa dilihat.</div>` : ""}
   <div class="callout"><b>Siapa mengisi apa?</b> <b>Pengampu utama</b> mengunggah RPS, kontrak kuliah, rubrik, dan memilih metode pembelajaran. <b>Semua dosen dalam tim</b> bisa menambahkan catatan integrasi penelitian/PkM dan bukti pembelajaran dari sesi yang diampu.</div>
   <div class="grid g2">${D.mk.map(x => {
     const a = x.lengkap.length, utama = x.peran === "utama";
     return `<article class="panel" style="display:flex;flex-direction:column;gap:8px"><div class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><b>${esc(x.kode)} · ${esc(x.nama)}</b>${utama ? '<span class="chip s-diajukan">Pengampu utama</span>' : '<span class="chip s-draf">Anggota tim</span>'}</div>
      <div class="small muted">${x.sks} sks · tim: ${x.tim.map((t, i) => esc(namaPendek(t.nama)) + (i === 0 ? " (utama)" : "") + (t.t === "p" ? " (praktisi)" : "")).join(", ")}</div>
      <div class="bar ${a < n ? "gold" : ""}"><i style="width:${a / n * 100}%"></i></div>
      <div class="small">${D.komp.map(c => `<div>${x.lengkap.includes(c.k) ? '<span style="color:var(--ok)">✓</span>' : '<span style="color:var(--warn)">○</span>'} ${esc(c.l)} <span class="muted">${c.u ? (utama ? "· tugas Anda" : "· oleh pengampu utama") : "· semua anggota"}</span></div>`).join("")}</div>
      <button class="btn sm ${x.bolehAnggota ? "primary" : ""}" data-act="mkpBuka" data-s="${x.semester}" data-kode="${esc(x.kode)}" style="align-self:flex-start">${!x.buka ? "Lihat" : utama ? "Lengkapi" : "Tambah bagian saya"}</button></article>`;
   }).join("") || `<div class="empty panel">Anda tidak tercatat mengampu mata kuliah pada ${esc(D.labelSemester)}. Tim pengajar ditetapkan Admin Prodi di Data Prodi.</div>`}</div>`;
}
function isiMkpRekap() {
  const R = S.mkpRekap;
  if (!R) { sekali("mkpRekap", async () => { S.mkpRekap = await api("mkp.rekap", { semester: S.mkpRekapSmt || (S.dp && S.dp.semester) || undefined }); render(); }); return `<div class="memuat">Memuat portofolio mata kuliah…</div>`; }
  return `<div class="row" style="justify-content:space-between;flex-wrap:wrap">${pilihSmtMkp("mkpRekapSmt", R)}<span class="small muted">Diisi dosen di menu Mata Kuliah Saya; data pendukung butir 8, 22, dan 25.</span></div>
   ${R.tanpaTim ? `<div class="callout">${R.tanpaTim} mata kuliah ${/-1$/.test(R.semester) ? "ganjil" : "genap"} belum punya tim pengajar sehingga belum dihitung. Tetapkan di tab <b>Tim pengajar</b>.</div>` : ""}
   <div class="grid g3">${R.komp.map(c => `<div class="panel stat"><span class="v num">${R.persen.n ? dpPersen(R.persen[c.k]) : "–"}</span><span class="l">${esc(c.l)}</span><div class="bar ${R.persen[c.k] < 0.75 ? "gold" : ""}" style="margin-top:6px"><i style="width:${R.persen[c.k] * 100}%"></i></div></div>`).join("")}</div>
   <div class="tbl-wrap"><table><thead><tr><th>Mata kuliah</th><th>Tim</th>${R.komp.map(c => `<th>${KOMP_SING[c.k]}</th>`).join("")}</tr></thead><tbody>
   ${R.mk.map(x => `<tr><td><button class="lnk" data-act="mkpBuka" data-s="${x.semester}" data-kode="${esc(x.kode)}">${esc(x.kode)} · ${esc(x.nama)}</button></td><td class="small">${x.tim.map((t, i) => esc(namaPendek(t.nama)) + (i === 0 ? " (utama)" : "")).join(", ")}</td>${R.komp.map(c => `<td>${tandaKomp(x, c.k)}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="8"><div class="empty">Belum ada tim pengajar untuk ${esc(R.labelSemester)}.</div></td></tr>`}</tbody></table></div>`;
}
function entriMkp(e, komp, hapus) {
  const dis = S.sibuk ? "disabled" : "";
  const ket = e.t === "file" ? `${esc(e.nama)} · ${ukuranT(e.ukuran)}` : `Tautan: <a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${esc(e.url.length > 60 ? e.url.slice(0, 57) + "…" : e.url)}</a>`;
  return `<div class="item bk"><div class="body"><div class="meta"><span>${ket}${e.ket ? " · " + esc(e.ket) : ""} · ${esc(namaPendek(e.oleh))}, ${tglJam(e.w)}</span></div></div>
   <div class="row bk-aksi"><button class="btn sm" data-act="mkpLihat" data-komp="${komp}" data-id="${e.id || ""}" ${dis}>${e.t === "tautan" ? "Buka" : "Lihat"}</button>${hapus ? `<button class="btn sm bad" data-act="mkpHapus" data-komp="${komp}" data-id="${e.id || ""}" ${dis}>Hapus</button>` : ""}</div></div>`;
}
function formTautanMkp(komp, ket) {
  const m = S.laci.tm;
  if (!m || m !== komp) return "";
  return `<div class="grid" style="gap:6px;margin-top:6px"><input id="mkpUrl" type="url" inputmode="url" placeholder="https://drive.google.com/…" aria-label="Tautan">
   ${ket ? `<input id="mkpKetT" type="text" maxlength="200" placeholder="Keterangan, misalnya: kelas LMS pertemuan 1–7" aria-label="Keterangan">` : ""}
   <div class="row">${tombol("mkpSimpanTautan", "Simpan tautan", "primary sm")}<button class="btn sm" data-act="mkpTautan" data-komp="">Batal</button></div>
   <span class="hint">Pastikan tautan bisa dibuka oleh akun prodi (upw@ppb.ac.id) atau siapa saja dengan tautan.</span></div>`;
}
function laciMkp() {
  const x = S.laci.x, saya = S.pengguna.id, dis = S.sibuk ? "disabled" : "";
  const blok = c => {
    const kepala = `<div class="row" style="justify-content:space-between;flex-wrap:wrap"><h3 style="margin:0">${esc(c.l)}</h3><span class="small muted">${c.u ? "Pengampu utama" : "Semua dosen dalam tim"}</span></div><span class="hint">${esc(c.h)}</span>`;
    const boleh = c.u ? x.bolehUtama : x.bolehAnggota;
    if (c.jenis === "dok") {
      const e = x[c.k];
      return `<div class="picker">${kepala}${e ? entriMkp(e, c.k, boleh) : `<div class="row" style="justify-content:space-between"><span class="chip s-revisi">Belum</span></div>`}
        ${boleh ? `<div class="row small" style="flex-wrap:wrap"><label class="btn sm" ${S.sibuk ? 'aria-disabled="true"' : ""}>${e ? "Ganti dengan file" : "Unggah file"}<input type="file" data-mfile="${c.k}" accept="${TERIMA}" hidden ${dis}></label><button class="btn sm" data-act="mkpTautan" data-komp="${c.k}" ${dis}>${e ? "Ganti dengan tautan" : "Tempel tautan"}</button></div>${formTautanMkp(c.k, false)}` : ""}</div>`;
    }
    if (c.jenis === "metode") {
      const m = x.metode;
      if (!boleh) return `<div class="picker">${kepala}<div class="small">${m.v.length || m.lain ? esc(m.v.concat(m.lain ? [m.lain] : []).join(", ")) + (m.oleh ? ` <span class="muted">· ${esc(namaPendek(m.oleh))}, ${tglJam(m.w)}</span>` : "") : '<span class="chip s-revisi">Belum</span>'}</div></div>`;
      return `<div class="picker">${kepala}<div class="classgrid">${x.daftarMetode.map(v => `<label><input type="checkbox" data-mmet="${esc(v)}" ${m.v.includes(v) ? "checked" : ""}><span>${esc(v)}</span></label>`).join("")}</div>
        <div class="field"><label for="mkpLain">Metode lain (opsional)</label><input id="mkpLain" type="text" maxlength="200" value="${esc(m.lain)}" placeholder="Contoh: simulasi reservasi GDS"></div>
        <div class="row">${tombol("mkpMetode", "Simpan metode", "sm")}</div></div>`;
    }
    if (c.jenis === "catatan") {
      return `<div class="picker">${kepala}${x.integ.map(e => `<div class="item bk"><div class="body"><div class="small" style="border-left:3px solid var(--brand);padding-left:8px">${esc(e.teks)}</div><div class="meta"><span>${esc(namaPendek(e.oleh))}, ${tglJam(e.w)}</span></div></div>${boleh && e.o === saya ? `<div class="row bk-aksi"><button class="btn sm bad" data-act="mkpHapus" data-komp="integ" data-id="${e.id}" ${dis}>Hapus</button></div>` : ""}</div>`).join("") || '<span class="small muted">Belum ada catatan integrasi.</span>'}
        ${boleh ? `<div class="field"><label for="mkpInteg">Tambahkan catatan Anda</label><textarea id="mkpInteg" rows="3" maxlength="1000" placeholder="Contoh: mahasiswa menganalisis data penelitian saya tentang preferensi wisatawan sebagai studi kasus tugas akhir MK."></textarea></div><div class="row">${tombol("mkpInteg", "Tambahkan", "sm")}</div>` : ""}</div>`;
    }
    return `<div class="picker">${kepala}${x.interaksi.map(e => entriMkp(e, "interaksi", boleh && e.o === saya)).join("") || '<span class="small muted">Belum ada bukti.</span>'}
      ${boleh ? `<div class="field"><label for="mkpKet">Keterangan untuk file (opsional)</label><input id="mkpKet" type="text" maxlength="200" placeholder="Contoh: dokumentasi praktik pemanduan, pertemuan 5"></div>
      <div class="row small" style="flex-wrap:wrap"><label class="btn sm" ${S.sibuk ? 'aria-disabled="true"' : ""}>Unggah file<input type="file" data-mfile="interaksi" accept="${TERIMA}" hidden ${dis}></label><button class="btn sm" data-act="mkpTautan" data-komp="interaksi" ${dis}>Tempel tautan</button></div>${formTautanMkp("interaksi", true)}` : ""}</div>`;
  };
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Portofolio mata kuliah" style="width:min(680px,100%)">
   <div class="dh"><h2>${esc(x.kode)} · ${esc(x.nama)}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   <p class="small muted">${esc(x.labelSemester)} · ${x.sks} sks (${x.sksPraktik} sks praktik) · tim: ${x.tim.map((t, i) => (i === 0 ? "<b>" : "") + esc(t.nama) + (i === 0 ? "</b> (utama)" : "") + (t.t === "p" ? " (praktisi)" : "")).join(", ")}</p>
   ${!x.buka ? `<div class="callout">Semester sudah lewat: hanya bisa dilihat.</div>` : !x.peran ? `<div class="callout">Tampilan pemantauan: hanya melihat. Dokumen diisi oleh tim pengajar.</div>` : ""}
   ${x.peran ? `<p class="small muted" style="margin:0">File maks. 10 MB (PDF, gambar, Word, Excel, PowerPoint); video atau album: pakai tautan. Mengganti file memindahkan file lama ke sampah Drive.</p>` : ""}
   ${galatHtml()}
   ${x.komp.map(blok).join("")}
   ${x.kuliahTamu && x.kuliahTamu.length ? `<div class="picker"><h3 style="margin:0">Kuliah tamu tercatat</h3>${x.kuliahTamu.map(k => `<div class="item" style="cursor:pointer" data-act="bukaKeg" data-id="${k.id}"><div class="body"><div class="title">${esc(k.judul)}</div><div class="meta"><span>${esc(tglPendek(k.tgl))}</span></div></div></div>`).join("")}</div>` : ""}
  </div></div>`;
}
function gantiMkp(j) { if (S.laci && S.laci.jenis === "mkp") { S.laci.x = j; S.laci.tm = null; } S.mkp = null; S.mkpRekap = null; S.tugas = null; S.nilai = null; }
function unggahMkp(komp, isi) {
  const x = S.laci.x;
  if (isi.isi) toast("Mengunggah…");
  jalankan(async () => { gantiMkp(await api("mkp.unggah", Object.assign({ semester: x.semester, kode: x.kode, komp }, isi))); toast("Tersimpan."); });
}
Object.assign(AKSI, {
  mkpBuka(d) {
    sekali("mkpBuka", async () => { const j = await api("mkp.detail", { semester: d.s, kode: d.kode }); S.laci = { jenis: "mkp", x: j, tm: null }; S.galat = ""; render(); });
  },
  mkpTautan(d) { S.laci.tm = d.komp || null; S.galat = ""; render(); if (d.komp) fokus("mkpUrl"); },
  mkpSimpanTautan() {
    const komp = S.laci.tm; if (!komp) return;
    const isi = { tautan: String($("mkpUrl")?.value || "").trim() };
    if ($("mkpKetT")) isi.ket = String($("mkpKetT").value || "").trim();
    unggahMkp(komp, isi);
  },
  mkpMetode() {
    const x = S.laci.x, metode = [...document.querySelectorAll("[data-mmet]:checked")].map(el => el.dataset.mmet), lain = String($("mkpLain")?.value || "").trim();
    jalankan(async () => { gantiMkp(await api("mkp.metode", { semester: x.semester, kode: x.kode, metode, lain })); toast("Metode pembelajaran tersimpan."); });
  },
  mkpInteg() {
    const x = S.laci.x, teks = String($("mkpInteg")?.value || "").trim();
    jalankan(async () => { gantiMkp(await api("mkp.integ", { semester: x.semester, kode: x.kode, teks })); toast("Catatan integrasi ditambahkan."); });
  },
  mkpHapus(d) {
    if (!confirm("Hapus isian ini? File dipindahkan ke sampah Drive.")) return;
    const x = S.laci.x;
    jalankan(async () => { gantiMkp(await api("mkp.hapus", { semester: x.semester, kode: x.kode, komp: d.komp, id: d.id || undefined })); toast("Dihapus."); });
  },
  async mkpLihat(d) {
    const x = S.laci.x, c = x.komp.find(y => y.k === d.komp), e = c.jenis === "dok" ? x[d.komp] : x[d.komp].find(y => y.id === d.id);
    if (!e) return;
    if (e.t === "tautan") { window.open(e.url, "_blank", "noopener,noreferrer"); return; }
    const w = window.open("", "_blank");
    if (w) w.document.write('<p style="font-family:sans-serif;padding:16px">Membuka berkas…</p>');
    try {
      const j = await api("mkp.lihat", { semester: x.semester, kode: x.kode, komp: d.komp, id: d.id || undefined });
      const bin = atob(j.isi), arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([arr], { type: j.mime }));
      if (w && /pdf|image/.test(j.mime)) w.location.href = url;
      else { if (w) w.close(); simpanBerkas(new Blob([arr], { type: j.mime }), j.nama); }
      setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch (err) { if (w) w.close(); toast(err.message); }
  }
});
document.addEventListener("change", e => {
  const t = e.target;
  if (t.id === "mkpSmt") { S.mkpSmt = t.value; S.mkp = null; render(); return; }
  if (t.id === "mkpRekapSmt") { S.mkpRekapSmt = t.value; S.mkpRekap = null; render(); return; }
  if (!t.dataset || !t.dataset.mfile || !S.laci || S.laci.jenis !== "mkp") return;
  const f = t.files && t.files[0], komp = t.dataset.mfile; t.value = "";
  if (!f) return;
  if (f.size > 10 * 1024 * 1024) { toast("Ukuran file maksimal 10 MB. Untuk file lebih besar, unggah ke Google Drive lalu pakai tautan."); return; }
  const ket = komp === "interaksi" ? String($("mkpKet")?.value || "").trim() : undefined;
  bacaBase64(f).then(isi => unggahMkp(komp, ket !== undefined ? { nama: f.name, isi, ket } : { nama: f.name, isi }), err => toast(err.message));
});

/* --- Bank Dokumen (v0.15.0) --- */
const ST_BANK = { belum: ["Belum ada", "s-revisi"], ada: ["Berlaku", "s-disetujui"], segera: ["Segera berakhir", "s-diajukan"], kedaluwarsa: ["Kedaluwarsa", "s-ditolak"] };
const chipBank = s => `<span class="chip ${ST_BANK[s][1]}">${ST_BANK[s][0]}</span>`;
function muatBank() { sekali("bank", async () => { S.bank = await api("bank.data"); render(); }); }
function hBank() {
  if (!S.bank) { muatBank(); return `<div class="memuat">Memuat Bank Dokumen…</div>`; }
  const B = S.bank, f = S.bankF || "", saya = S.pengguna.id;
  const hit = k => B.slot.filter(s => s.status === k).length, n = B.slot.length, ada = hit("ada") + hit("segera");
  const cocok = s => !f || (f === "perlu" ? s.status !== "ada" : f === "saya" ? s.pj === saya : f === "tanpaPj" ? !s.pj : false);
  const butir = B.butir.filter(b => (!/^k:/.test(f) || b.k === f.slice(2)) && B.slot.some(s => s.butir === b.n && (/^k:/.test(f) || cocok(s))));
  const info = B.asesor ? `<p>Dokumen mutu prodi per butir Matriks LAMWisata, versi yang berlaku. Setiap dokumen yang Anda buka tercatat oleh prodi.</p>`
    : `<p>Slot dokumen untuk butir Matriks yang dinilai GPM. Setiap slot punya penanggung jawab (PJ) dan masa berlaku; versi lama tetap tersimpan sebagai riwayat. Jumlah dokumen berlaku ikut tampil di Penilaian.</p>`;
  return `<div class="head"><div><h1>Bank Dokumen</h1>${info}</div></div>
   ${B.asesor ? "" : `<div class="grid g3"><div class="panel stat"><span class="v num">${ada}/${n}</span><span class="l">Dokumen berlaku</span><div class="bar ${ada < n ? "gold" : ""}" style="margin-top:6px"><i style="width:${n ? ada / n * 100 : 0}%"></i></div></div>
    <div class="panel stat"><span class="v num">${hit("belum")}</span><span class="l">Belum diunggah</span></div>
    <div class="panel stat"><span class="v num">${hit("kedaluwarsa") + hit("segera")}</span><span class="l">Kedaluwarsa atau berakhir ≤ ${B.hariSegera} hari</span></div></div>`}
   <div class="filters"><select id="bankF" aria-label="Saring dokumen" style="width:auto"><option value="">Semua butir</option>
    ${B.asesor ? "" : `<option value="perlu" ${f === "perlu" ? "selected" : ""}>Perlu tindakan (belum/kedaluwarsa/segera)</option>`}
    ${B.kelola ? `<option value="tanpaPj" ${f === "tanpaPj" ? "selected" : ""}>Belum ada penanggung jawab</option>` : ""}
    ${!B.kelola && !B.asesor ? "" : B.kelola ? `<option value="saya" ${f === "saya" ? "selected" : ""}>Tanggung jawab saya</option>` : ""}
    ${Object.entries(B.kriteria).map(([k, l]) => `<option value="k:${k}" ${f === "k:" + k ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>
   ${butir.map(b => `<section class="panel"><div class="row" style="justify-content:space-between;align-items:flex-start;margin-bottom:6px"><h2 style="font-size:.95rem;margin:0">${b.n}. ${esc(b.nm)}</h2><span class="tag">${esc(B.kriteria[b.k] || b.k)} · bobot ${String(b.w).replace(".", ",")}</span></div>
     ${B.asesor ? "" : `<p class="small muted" style="margin:0 0 8px">Agar skor 4: ${esc(b.s4)}</p>`}
     <div class="list">${B.slot.filter(s => s.butir === b.n && (/^k:/.test(f) || cocok(s))).map(s => {
       const v = s.versi[s.versi.length - 1];
       const ket = v ? `${v.t === "file" ? esc(v.nama) : "Tautan"}${v.berlaku ? " · berlaku s.d. " + esc(tglPendek(v.berlaku)) : " · tanpa batas berlaku"} · ${esc(namaPendek(v.oleh))}, ${tglJam(v.w)}${s.versi.length > 1 ? ` · ${s.versi.length} versi` : ""}` : "Belum ada dokumen";
       return `<div class="item bk"><div class="body"><div class="title" style="font-weight:600">${esc(s.nama)}${s.baku ? "" : ' <span class="tag">tambahan</span>'}</div><div class="meta"><span>${ket}</span>${B.asesor ? "" : `<span>PJ: ${s.pjNama ? esc(namaPendek(s.pjNama)) : "belum ditunjuk"}</span>`}</div></div>
        <div class="row bk-aksi">${v ? `<button class="btn sm" data-act="bankLihat" data-kunci="${s.kunci}" data-id="${v.id}">${v.t === "tautan" ? "Buka" : "Lihat"}</button>` : ""}${B.asesor ? "" : `<button class="btn sm ${s.bolehUnggah && s.status !== "ada" ? "primary" : ""}" data-act="bankBuka" data-kunci="${s.kunci}">${s.bolehUnggah ? (v ? "Kelola" : "Unggah") : "Riwayat"}</button>`}${B.asesor ? "" : chipBank(s.status)}</div></div>`;
     }).join("")}</div>
     ${B.kelola ? `<div class="row" style="margin-top:8px"><button class="btn sm" data-act="bankBaruBuka" data-n="${b.n}">+ Dokumen lain untuk butir ${b.n}</button></div>` : ""}</section>`).join("") || `<div class="empty panel">Tidak ada dokumen yang cocok dengan saringan.</div>`}
   ${B.kelola ? `<div class="row"><button class="btn" data-act="bankBaruBuka" data-n="">+ Dokumen untuk butir lain</button></div>` : ""}`;
}
function laciBank() {
  const L = S.laci, B = S.bank, s = B.slot.find(x => x.kunci === L.kunci);
  if (!s) return "";
  const b = B.butir.find(x => x.n === s.butir), m = L.mode || "file", dis = S.sibuk ? "disabled" : "";
  const versi = s.versi.slice().reverse();
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Dokumen" style="width:min(640px,100%)">
   <div class="dh"><h2>${esc(s.nama)}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   <p class="small muted" style="margin:0">Butir ${s.butir}${b ? " · " + esc(b.nm) : ""} · ${chipBank(s.status)}</p>
   ${galatHtml()}
   ${B.kelola ? `<div class="picker"><h3 style="margin:0">Pengaturan slot</h3>
     <div class="field"><label for="bankPj">Penanggung jawab</label><select id="bankPj"><option value="">– belum ditunjuk –</option>${B.pegawai.map(o => `<option value="${o.id}" ${o.id === s.pj ? "selected" : ""}>${esc(o.nama)}</option>`).join("")}</select><span class="hint">PJ bisa mengunggah dokumen ini dan mendapat pengingat di Beranda bila belum ada atau kedaluwarsa.</span></div>
     ${s.baku ? "" : `<div class="field"><label for="bankNama">Nama dokumen</label><input id="bankNama" type="text" maxlength="150" value="${esc(s.nama)}"></div>`}
     <div class="row" style="flex-wrap:wrap">${tombol("bankAturSimpan", "Simpan pengaturan", "sm")}${!s.baku && !s.versi.length ? tombol("bankSlotHapus", "Hapus slot", "bad sm") : ""}</div></div>` : ""}
   ${s.bolehUnggah ? `<div class="picker"><h3 style="margin:0">${s.versi.length ? "Unggah versi baru" : "Unggah dokumen"}</h3>
     ${s.versi.length ? `<p class="small muted" style="margin:0">Versi lama tetap tersimpan sebagai riwayat; yang dipakai adalah versi terbaru.</p>` : ""}
     <div class="seg" role="group" aria-label="Bentuk dokumen"><button data-act="bankMode" data-m="file" aria-pressed="${m === "file"}">File</button><button data-act="bankMode" data-m="tautan" aria-pressed="${m === "tautan"}">Tautan</button></div>
     ${m === "file" ? `<div class="field"><label for="bankFile">File (maks. 10 MB: PDF, gambar, Word, Excel, PowerPoint)</label><input id="bankFile" type="file" accept="${TERIMA}" ${dis}>${L.berkas ? `<span class="hint">Dipilih: ${esc(L.berkas.nama)} · ${ukuranT(L.berkas.ukuran)}</span>` : ""}</div>`
       : `<div class="field"><label for="bankUrl">Tautan</label><input id="bankUrl" type="url" inputmode="url" placeholder="https://drive.google.com/…" value="${esc(L.isi.url || "")}"><span class="hint">Pastikan bisa dibuka oleh akun prodi (upw@ppb.ac.id) atau siapa saja dengan tautan.</span></div>`}
     <div class="field"><label for="bankBerlaku">Berlaku sampai (kosongkan bila tidak ada batas)</label><input id="bankBerlaku" type="date" value="${esc(L.isi.berlaku || "")}"></div>
     <div class="field"><label for="bankKet">Keterangan (opsional)</label><input id="bankKet" type="text" maxlength="200" placeholder="Contoh: SK Direktur No. 123 Tahun 2026" value="${esc(L.isi.ket || "")}"></div>
     <div class="row">${tombol("bankSimpan", "Simpan dokumen")}</div></div>` : ""}
   <div class="picker"><h3 style="margin:0">Riwayat versi (${s.versi.length})</h3>
    ${versi.map((v, i) => `<div class="item bk"><div class="body"><div class="title" style="font-weight:600">${i === 0 ? "Versi berlaku" : "Versi " + (s.versi.length - i)}</div><div class="meta"><span>${v.t === "file" ? esc(v.nama) + " · " + ukuranT(v.ukuran) : "Tautan"}${v.berlaku ? " · berlaku s.d. " + esc(tglPendek(v.berlaku)) : ""}${v.ket ? " · " + esc(v.ket) : ""} · ${esc(namaPendek(v.oleh))}, ${tglJam(v.w)}</span></div></div>
      <div class="row bk-aksi"><button class="btn sm" data-act="bankLihat" data-kunci="${s.kunci}" data-id="${v.id}" ${dis}>${v.t === "tautan" ? "Buka" : "Lihat"}</button>${i === 0 && s.bolehHapusAkhir ? `<button class="btn sm bad" data-act="bankHapus" data-kunci="${s.kunci}" data-id="${v.id}" ${dis}>Hapus</button>` : ""}</div></div>`).join("") || '<span class="small muted">Belum ada dokumen.</span>'}</div>
  </div></div>`;
}
function laciBankBaru() {
  const B = S.bank, n = S.laci.n;
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Tambah dokumen">
   <div class="dh"><h2>Tambah slot dokumen</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   <p class="small">Untuk dokumen pendukung di luar daftar baku, misalnya SOP atau laporan khusus prodi.</p>
   <div class="field"><label for="bankBaruN">Butir Matriks</label><select id="bankBaruN">${S.bankMatriks.map(m => `<option value="${m.n}" ${m.n === n ? "selected" : ""}>${m.n}. ${esc(m.nm)}</option>`).join("")}</select></div>
   <div class="field"><label for="bankBaruNama">Nama dokumen</label><input id="bankBaruNama" type="text" maxlength="150" placeholder="Contoh: SOP peninjauan RPS"></div>
   <div class="field"><label for="bankBaruPj">Penanggung jawab (opsional)</label><select id="bankBaruPj"><option value="">– belum ditunjuk –</option>${B.pegawai.map(o => `<option value="${o.id}">${esc(o.nama)}</option>`).join("")}</select></div>
   ${galatHtml()}<div class="row" style="justify-content:flex-end;margin-top:auto">${tombol("bankBaruSimpan", "Tambah")}</div></div></div>`;
}
Object.assign(AKSI, {
  bankBuka(d) { S.laci = { jenis: "bank", kunci: d.kunci, mode: "file", berkas: null, isi: {} }; S.galat = ""; render(); },
  bankMode(d) { S.laci.mode = d.m; S.laci.berkas = null; render(); },
  async bankBaruBuka(d) {
    if (!S.bankMatriks) { try { S.bankMatriks = (await api("penilaian.data")).rows.filter(r => r.perluGpm).map(r => ({ n: r.n, nm: r.nm })); } catch (e) { toast(e.message); return; } }
    S.laci = { jenis: "bankBaru", n: d.n ? Number(d.n) : null }; S.galat = ""; render();
  },
  bankBaruSimpan() {
    const data = { baru: 1, butir: Number($("bankBaruN").value), nama: String($("bankBaruNama").value || "").trim(), pj: $("bankBaruPj").value };
    jalankan(async () => { S.bank = await api("bank.atur", data); S.laci = null; S.nilai = null; toast("Slot dokumen ditambahkan."); });
  },
  bankAturSimpan() {
    const data = { kunci: S.laci.kunci, pj: $("bankPj").value };
    if ($("bankNama")) data.nama = String($("bankNama").value || "").trim();
    jalankan(async () => { S.bank = await api("bank.atur", data); S.tugas = null; toast("Pengaturan tersimpan."); });
  },
  bankSlotHapus() {
    if (!confirm("Hapus slot dokumen tambahan ini?")) return;
    const kunci = S.laci.kunci;
    jalankan(async () => { S.bank = await api("bank.atur", { kunci, hapus: 1 }); S.laci = null; S.nilai = null; toast("Slot dihapus."); });
  },
  bankSimpan() {
    const L = S.laci, data = { kunci: L.kunci, berlaku: $("bankBerlaku").value, ket: String($("bankKet").value || "").trim() };
    if (L.mode === "tautan") data.tautan = String($("bankUrl").value || "").trim();
    else { if (!L.berkas) { S.galat = "Pilih file dulu, atau pakai Tautan."; render(); return; } data.nama = L.berkas.nama; data.isi = L.berkas.isi; toast("Mengunggah…"); }
    jalankan(async () => { S.bank = await api("bank.unggah", data); S.laci.berkas = null; S.laci.isi = {}; S.tugas = null; S.nilai = null; toast("Dokumen tersimpan."); });
  },
  bankHapus(d) {
    if (!confirm("Hapus versi terbaru ini? File dipindahkan ke sampah Drive; versi sebelumnya (bila ada) kembali berlaku.")) return;
    jalankan(async () => { S.bank = await api("bank.hapus", { kunci: d.kunci, id: d.id }); S.tugas = null; S.nilai = null; toast("Versi dihapus."); });
  },
  async bankLihat(d) {
    const s = S.bank.slot.find(x => x.kunci === d.kunci), v = s && s.versi.find(x => x.id === d.id);
    if (!v) return;
    if (v.t === "tautan") { window.open(v.url, "_blank", "noopener,noreferrer"); if (S.bank.asesor) api("bank.lihat", { kunci: d.kunci, id: d.id }).catch(() => {}); return; }
    const w = window.open("", "_blank");
    if (w) w.document.write('<p style="font-family:sans-serif;padding:16px">Membuka berkas…</p>');
    try {
      const j = await api("bank.lihat", { kunci: d.kunci, id: d.id });
      const bin = atob(j.isi), arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([arr], { type: j.mime }));
      if (w && /pdf|image/.test(j.mime)) w.location.href = url;
      else { if (w) w.close(); simpanBerkas(new Blob([arr], { type: j.mime }), j.nama); }
      setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch (err) { if (w) w.close(); toast(err.message); }
  }
});
document.addEventListener("change", e => {
  const t = e.target;
  if (t.id === "bankF") { S.bankF = t.value; render(); return; }
  if (t.id !== "bankFile" || !S.laci || S.laci.jenis !== "bank") return;
  const f = t.files && t.files[0];
  if (!f) return;
  if (f.size > 10 * 1024 * 1024) { t.value = ""; toast("Ukuran file maksimal 10 MB. Untuk file lebih besar, unggah ke Google Drive lalu pakai Tautan."); return; }
  const L = S.laci;
  bacaBase64(f).then(isi => { L.berkas = { nama: f.name, ukuran: f.size, isi }; render(); }, err => toast(err.message));
});

/* --- Riwayat Versi (v0.15.1; hanya Super Admin; dari CHANGELOG.md lewat alat/tampilan.mjs) --- */
function hRiwayat() {
  if (!S.riwayat) {
    sekali("riwayat", async () => { const r = await fetch("riwayat.json?v=" + encodeURIComponent(K.versi), { cache: "no-store" }); if (!r.ok) throw new Error("Riwayat versi belum tersedia."); S.riwayat = await r.json(); render(); });
    return `<div class="memuat">Memuat riwayat versi…</div>`;
  }
  const baris = l => { const m = /^(\s*)- (.*)$/.exec(l); return m ? `<li style="margin-left:${m[1].length * 6}px">${esc(m[2])}</li>` : `<li style="list-style:none">${esc(l.trim())}</li>`; };
  return `<div class="head"><div><h1>Riwayat Versi</h1><p>Semua rilis aplikasi: versi, tanggal, lingkungan, isi, dan penyetuju. Versi yang sedang dipakai: <b>v${esc(K.versi)}</b>. Pengembalian versi hanya atas permintaan tertulis pemilik (lihat panduan darurat).</p></div></div>
   <section class="panel"><h2>Cadangan data</h2><p class="small">Salinan spreadsheet + daftar file Drive disimpan di folder Cadangan. Wajib dibuat sebelum setiap rilis (aturan tetap no. 3); server juga mencadangkan otomatis setiap kali struktur data berubah.</p>
    <div class="row" style="flex-wrap:wrap;align-items:flex-end"><div class="field" style="flex:1;min-width:200px"><label for="cadLabel">Label cadangan</label><input id="cadLabel" type="text" maxlength="60" placeholder="Contoh: sebelum v0.16.0"></div>${tombol("buatCadangan", "Buat cadangan sekarang", "")}</div>
    ${S.cadangan ? `<p class="small">Tersimpan: <b>${esc(S.cadangan.nama)}</b> (${S.cadangan.jumlahFile} file Drive tercatat) · <a href="${esc(S.cadangan.url)}" target="_blank" rel="noopener noreferrer">Buka salinan</a></p>` : ""}${galatHtml()}</section>
   ${S.riwayat.map(v => `<section class="panel"><div class="row" style="justify-content:space-between;flex-wrap:wrap"><h2 style="margin:0">${esc(v.versi)}${v.versi === "v" + K.versi ? ' <span class="chip s-disetujui">dipakai</span>' : ""}</h2><span class="small muted">${esc(v.tanggal)} · ${esc(v.lingkungan)}</span></div>
     <ul class="small" style="margin:8px 0 0 18px;padding:0;display:grid;gap:3px">${v.isi.map(baris).join("")}</ul></section>`).join("")}`;
}
Object.assign(AKSI, {
  buatCadangan() { const label = nilaiLangsung("cadLabel") || "manual"; jalankan(async () => { S.cadangan = await api("admin.cadangkan", { label }); toast("Cadangan dibuat."); }); }
});
function nilaiLangsung(id) { return String($(id)?.value || "").trim(); }
Object.assign(AKSI, {
  aturTanpaEmail() {
    const nyala = !S.tanpaEmail.nyala;
    if (!confirm(nyala ? "Nyalakan aktivasi tanpa email? Pengguna baru langsung aktif tanpa kode email." : "Matikan aktivasi tanpa email? Pastikan email kampus sudah bisa terkirim: akun yang emailnya belum terverifikasi akan diminta memverifikasi saat masuk.")) return;
    jalankan(async () => { S.tanpaEmail = await api("admin.tanpaEmail", { nyala }); toast(nyala ? "Aktivasi tanpa email menyala." : "Aktivasi kembali memakai kode email."); });
  }
});
/* --- Impor dari Excel dengan templat (v0.18.0) ---
   Templat: lembar "Data" (kepala kolom "Label [kunci]"), "Contoh", dan "Petunjuk". Kolom NIM/NIP berformat Teks agar angka panjang tidak rusak. */
const YA_TIDAK = ["Ya", "Tidak"];
const JENIS_IMPOR = {
  mhs: { judul: "Akun mahasiswa", satuan: "mahasiswa", kolom: [
      { k: "username", l: "NIM", wajib: 1, teks: 1, h: "Dua angka pertama = angkatan (25… = 2025)" },
      { k: "nama", l: "Nama lengkap", wajib: 1 },
      { k: "masuk", l: "Tahun masuk", h: "Boleh dikosongkan: diambil dari 2 angka pertama NIM" },
      { k: "kelas", l: "Kelas", wajib: 1, o: ["A", "B", "C", "D"], h: "Huruf/angka kelas, maksimal 3 karakter" }],
    contoh: ["250101", "Ni Made Contoh Sari", "", "A"],
    kirim: b => api("admin.impor", { baris: b.map(r => Object.assign({ peran: "mahasiswa" }, r)) }),
    pesan: j => `${j.diimpor} akun diimpor${j.dilewati.length ? `, ${j.dilewati.length} dilewati` : ""}.`, lewati: j => j.dilewati, segarkan: () => { S.daftar = null; } },
  pegawai: { judul: "Akun dosen dan tendik", satuan: "orang", kolom: [
      { k: "username", l: "NIP", wajib: 1, teks: 1, h: "NIP/nomor pegawai tanpa spasi" },
      { k: "nama", l: "Nama lengkap dengan gelar", wajib: 1 },
      { k: "peran", l: "Peran", wajib: 1, h: "dosen, tendik, atau gabungan dipisah koma: dosen,kps · dosen,kalab · tendik,admin · tendik,laboran" }],
    contoh: ["198501012010121001", "Dr. Ni Luh Contoh, M.Par.", "dosen"],
    kirim: b => api("admin.impor", { baris: b }),
    pesan: j => `${j.diimpor} akun diimpor${j.dilewati.length ? `, ${j.dilewati.length} dilewati` : ""}.`, lewati: j => j.dilewati, segarkan: () => { S.daftar = null; } },
  biodata: { judul: "Biodata dosen dan tendik", satuan: "orang", kolom: null, contoh: null,
    kirim: b => api("biodata.massal", { baris: b }),
    pesan: j => `${j.diperbarui} biodata diperbarui${j.dilewati.length ? `, ${j.dilewati.length} dilewati` : ""}. Sel kosong tidak mengubah isian lama.`, lewati: j => j.dilewati, segarkan: () => { S.daftar = null; } },
  mk: { judul: "Kurikulum (mata kuliah)", satuan: "mata kuliah", kolom: [
      { k: "kode", l: "Kode MK", wajib: 1, teks: 1 }, { k: "nama", l: "Nama mata kuliah", wajib: 1 },
      { k: "semester", l: "Semester", wajib: 1, o: ["1", "2", "3", "4", "5", "6", "7", "8"] },
      { k: "sksKuliah", l: "sks kuliah" }, { k: "sksSeminar", l: "sks seminar" }, { k: "sksPraktik", l: "sks praktik/praktikum" },
      { k: "kompetensi", l: "MK kompetensi", o: YA_TIDAK }, { k: "cplSikap", l: "CPL sikap", o: YA_TIDAK }, { k: "cplPengetahuan", l: "CPL pengetahuan", o: YA_TIDAK },
      { k: "cplKu", l: "CPL keterampilan umum", o: YA_TIDAK }, { k: "cplKk", l: "CPL keterampilan khusus", o: YA_TIDAK },
      { k: "rps", l: "RPS", h: "Tautan https://… atau tulis Ada" }, { k: "unit", l: "Unit penyelenggara", h: "Kosongkan bila Prodi UPW" }],
    contoh: ["UPW201", "Travel Agency Operation", "2", "1", "0", "2", "Ya", "Ya", "Ya", "Tidak", "Ya", "Ada", ""],
    kirim: b => api("dp.mkSimpan", { daftar: b.map(r => Object.assign({}, r, { semester: Number(r.semester), sksKuliah: angkaId(r.sksKuliah), sksSeminar: angkaId(r.sksSeminar), sksPraktik: angkaId(r.sksPraktik),
      kompetensi: /^ya$/i.test(r.kompetensi || ""), cplSikap: /^ya$/i.test(r.cplSikap || ""), cplPengetahuan: /^ya$/i.test(r.cplPengetahuan || ""), cplKu: /^ya$/i.test(r.cplKu || ""), cplKk: /^ya$/i.test(r.cplKk || ""),
      unit: r.unit || "Prodi UPW" })) }),
    pesan: j => `Impor selesai: ${j.baru} baru, ${j.diubah} diperbarui.`, segarkan: () => { S.dp = null; S.ilkps = null; } },
  lulusan: { judul: "Data lulusan", satuan: "lulusan", kolom: [
      { k: "nim", l: "NIM", wajib: 1, teks: 1 }, { k: "nama", l: "Nama", wajib: 1 }, { k: "masuk", l: "Tahun masuk", wajib: 1 },
      { k: "tglLulus", l: "Tanggal lulus", wajib: 1, tgl: 1, h: "Tanggal Excel atau 20/08/2025" }, { k: "ipk", l: "IPK", h: "Contoh 3,52" },
      { k: "wtBulan", l: "Waktu tunggu kerja (bulan)", h: "Kosongkan bila belum terlacak" }, { k: "kesesuaian", l: "Kesesuaian bidang kerja", o: ["Rendah", "Sedang", "Tinggi"] },
      { k: "tempatKerja", l: "Tempat kerja", o: ["Lokal", "Nasional", "Internasional"] }],
    contoh: ["210101", "Kadek Contoh", "2021", "20/08/2025", "3,52", "2", "Tinggi", "Nasional"],
    kirim: b => api("lul.impor", { daftar: b }),
    pesan: j => `Impor selesai: ${j.baru} baru, ${j.diubah} diperbarui${j.akunLulus ? `; ${j.akunLulus} akun mahasiswa ditandai Lulus` : ""}.`, segarkan: () => { S.lul = null; S.ilkps = null; S.daftar = null; } }
};
async function kolomImpor(jenis) {
  const J = JENIS_IMPOR[jenis];
  if (J.kolom) return J.kolom;
  const T = await api("impor.templat");
  J.kolom = T.biodataPegawai.map(f => ({ k: f.k, l: f.l, wajib: f.wajib, teks: f.k === "nip" || f.k === "nidn" || f.k === "hp" ? 1 : 0, o: f.o, h: [f.untuk ? "Hanya " + f.untuk : "", f.hint].filter(Boolean).join(". ") }));
  J.contoh = J.kolom.map(f => f.k === "nip" ? "199001152015041001" : f.o ? f.o[0] : "");
  return J.kolom;
}
function unduhBlob(blob, nama) { return simpanBerkas(blob, nama); }
function panelImporExcel(jenis) {
  const J = JENIS_IMPOR[jenis], X = S.imx && S.imx.jenis === jenis ? S.imx : null, dis = S.sibuk ? "disabled" : "";
  const contohBaris = X && X.baris.length ? `<div class="tbl-wrap" style="margin-top:6px"><table><thead><tr>${X.kolom.map(k => `<th>${esc(k.l)}</th>`).join("")}</tr></thead><tbody>
    ${X.baris.slice(0, 5).map(r => `<tr>${X.kolom.map(k => `<td class="small">${esc(r[k.k] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${X.baris.length > 5 ? `<p class="small muted">… dan ${X.baris.length - 5} baris lainnya.</p>` : ""}` : "";
  return `<div class="picker" style="margin-top:10px"><div class="row" style="justify-content:space-between;flex-wrap:wrap"><b>Impor dari Excel · ${esc(J.judul)}</b>
     <div class="row small" style="flex-wrap:wrap"><button class="btn sm" data-act="imxTemplat" data-j="${jenis}" ${dis}>Unduh templat Excel</button>
     <label class="btn sm primary" ${S.sibuk ? 'aria-disabled="true"' : ""}>Unggah berkas Excel<input type="file" data-imx="${jenis}" accept=".xlsx" hidden ${dis}></label></div></div>
    <span class="hint">1) Unduh templat · 2) isi lembar <b>Data</b> di Excel/Google Sheets (lihat lembar Petunjuk dan Contoh) · 3) unggah berkasnya (.xlsx), periksa pratinjau, lalu tekan Impor.</span>
    ${X ? `<div class="auto">Berkas <b>${esc(X.nama)}</b>: <b>${X.baris.length}</b> baris siap diimpor${X.masalah.length ? `, <b>${X.masalah.length}</b> perlu diperbaiki` : ""}.</div>
      ${X.masalah.length ? `<ul class="small" style="margin:0 0 0 18px;color:var(--bad)">${X.masalah.slice(0, 10).map(m => `<li>${esc(m)}</li>`).join("")}${X.masalah.length > 10 ? `<li>… ${X.masalah.length - 10} lainnya</li>` : ""}</ul>` : ""}
      ${contohBaris}
      ${X.hasil ? `<div class="auto">${esc(X.hasil)}${X.lewati && X.lewati.length ? `<ul class="small" style="margin:4px 0 0 18px">${X.lewati.slice(0, 15).map(l => `<li>Baris ${l.baris}${l.nip ? " (" + esc(l.nip) + ")" : ""}: ${esc(l.alasan)}</li>`).join("")}</ul>` : ""}</div>` : ""}
      <div class="row">${X.baris.length && !X.hasil ? tombol("imxKirim", `Impor ${X.baris.length} ${J.satuan}`, "primary sm") : ""}<button class="btn sm" data-act="imxBatal" ${dis}>${X.hasil ? "Selesai" : "Batal"}</button></div>` : ""}
  </div>`;
}
const tglExcel = n => new Date(Math.round((n - 25569) * 864e5)).toISOString().slice(0, 10);
async function bacaImpor(jenis, file) {
  const kolom = await kolomImpor(jenis), lembar = await UPW_ZIP.bacaXlsx(await file.arrayBuffer());
  const L = lembar.find(l => /^data$/i.test(l.nama)) || lembar.find(l => !/^(petunjuk|contoh)$/i.test(l.nama));
  if (!L || !L.baris.length) throw new Error("Lembar Data tidak ditemukan atau kosong. Pakai templat dari tombol Unduh templat Excel.");
  const kepala = (L.baris[0] || []).map(v => String(v || "").trim()), peta = {};
  kepala.forEach((h, i) => { const m = /\[(\w+)\]\s*$/.exec(h), k = m ? m[1] : (kolom.find(c => c.l.toLowerCase() === h.toLowerCase()) || {}).k; if (k) peta[k] = i; });
  const hilang = kolom.filter(c => c.wajib && !(c.k in peta)).map(c => c.l);
  if (hilang.length) throw new Error("Kolom wajib tidak ditemukan: " + hilang.join(", ") + ". Pakai templat terbaru dari aplikasi.");
  const baris = [], masalah = [];
  L.baris.slice(1).forEach((r, i) => {
    if (!r.some(v => String(v ?? "").trim() !== "")) return;
    const o = {}, no = i + 2; let salah = false;
    kolom.forEach(c => {
      if (!(c.k in peta)) return;
      let v = r[peta[c.k]];
      if (typeof v === "number") {
        if (c.tgl && v > 20000 && v < 80000) v = tglExcel(v);
        else if (c.teks && Math.abs(v) >= 1e15) { masalah.push(`Baris ${no}: ${c.l} terbaca sebagai angka besar sehingga digit terakhir hilang. Format kolom sebagai Teks, lalu ketik ulang.`); salah = true; v = ""; }
        else v = Number.isInteger(v) ? String(v) : String(v).replace(".", ",");
      }
      v = String(v ?? "").trim();
      if (c.wajib && !v && !salah) { masalah.push(`Baris ${no}: ${c.l} kosong.`); salah = true; }
      o[c.k] = v;
    });
    if (!salah) baris.push(o);
  });
  if (baris.length > 500) throw new Error("Maksimal 500 baris per impor; bagi berkas menjadi beberapa bagian.");
  return { jenis, nama: file.name, kolom: kolom.filter(c => c.k in peta), baris, masalah };
}
Object.assign(AKSI, {
  async imxTemplat(d) {
    try {
      const J = JENIS_IMPOR[d.j], kolom = await kolomImpor(d.j), kep = kolom.map(c => `${c.l}${c.wajib ? " *" : ""} [${c.k}]`);
      const teks = kolom.map((c, i) => c.teks ? i : -1).filter(i => i >= 0), pilihan = {}; kolom.forEach((c, i) => { if (c.o) pilihan[i] = c.o; });
      const blob = UPW_ZIP.xlsx([
        { nama: "Data", baris: [kep], teks, pilihan },
        { nama: "Contoh", baris: [kep, J.contoh], teks },
        { nama: "Petunjuk", baris: [["Kolom", "Wajib", "Keterangan / pilihan"], ...kolom.map(c => [c.l, c.wajib ? "Ya" : "", [c.h, c.o ? "Pilihan: " + c.o.join(" / ") : ""].filter(Boolean).join(". ")]),
          [], ["Cara mengisi", "", "Isi lembar Data mulai baris 2, satu baris per " + J.satuan + ". Jangan mengubah baris judul (baris 1). Kolom bertanda * wajib. Simpan sebagai .xlsx lalu unggah di aplikasi."]] }]);
      unduhBlob(blob, `Templat ${J.judul}.xlsx`);
    } catch (e) { toast(e.message); }
  },
  imxBatal() { S.imx = null; S.galat = ""; render(); },
  imxKirim() {
    const X = S.imx, J = JENIS_IMPOR[X.jenis];
    jalankan(async () => { const j = await J.kirim(X.baris); X.hasil = J.pesan(j); X.lewati = J.lewati ? J.lewati(j) : []; J.segarkan(); toast(X.hasil); });
  },
  async eksporAkun() {
    try { const E = await api("admin.eksporAkun"); unduhBlob(UPW_ZIP.xlsx([{ nama: "Akun", baris: [E.kepala, ...E.baris], teks: [0] }]), `Daftar akun Repositori UPW ${new Date().toISOString().slice(0, 10)}.xlsx`); }
    catch (e) { toast(e.message); }
  }
});
document.addEventListener("change", e => {
  const t = e.target; if (!t.dataset || !t.dataset.imx) return;
  const f = t.files && t.files[0], jenis = t.dataset.imx; t.value = ""; if (!f) return;
  if (f.size > 5 * 1024 * 1024) { toast("Berkas Excel maksimal 5 MB."); return; }
  toast("Membaca berkas…");
  bacaImpor(jenis, f).then(x => { S.imx = x; S.galat = ""; render(); }, err => { S.imx = null; toast(err.message); });
});

/* --- Status dosen (v0.18.0) --- */
function lamaPeriode(a, b) {
  const x = new Date(a + "T00:00:00"), y = new Date(b + "T00:00:00"); if (!(y >= x)) return "";
  let th = y.getFullYear() - x.getFullYear(), bl = y.getMonth() - x.getMonth(), hr = y.getDate() - x.getDate();
  if (hr < 0) { bl--; hr += new Date(y.getFullYear(), y.getMonth(), 0).getDate(); }
  if (bl < 0) { th--; bl += 12; }
  return [th ? th + " tahun" : "", bl ? bl + " bulan" : "", hr ? hr + " hari" : ""].filter(Boolean).join(" ") || "0 hari";
}
const CHIP_SD = { aktif: "s-disetujui", tugas_belajar: "s-diajukan", pensiun: "s-draf" };
function isiStatusDosen() {
  const D = S.sdos;
  if (!D) { sekali("sdos", async () => { S.sdos = await api("dp.status"); render(); }); return `<div class="memuat">Memuat status dosen…</div>`; }
  return `<div class="callout">Status dosen per tanggal: <b>Aktif</b>, <b>Tugas belajar</b> (dengan tanggal mulai dan selesai saat kembali ke kampus; lama tugas belajar dihitung otomatis), atau <b>Pensiun</b>. Tanpa catatan, dosen dianggap aktif. ${D.bolehUbah ? "" : "Anda dapat melihat; perubahan oleh Admin Prodi."}</div>
   <div class="tbl-wrap"><table><thead><tr><th>Dosen</th><th>Status hari ini</th><th>Riwayat</th>${D.bolehUbah ? "<th></th>" : ""}</tr></thead><tbody>
   ${D.dosen.map(x => `<tr><td class="small"><b>${esc(namaPendek(x.nama))}</b>${x.inisial ? ` <span class="mono muted">${esc(x.inisial)}</span>` : ""}<div class="muted">${esc(x.statusDosen || "")}</div></td>
     <td><span class="chip ${CHIP_SD[x.kini.status]}">${esc(D.label[x.kini.status])}</span>${x.kini.sejak ? `<div class="small muted">sejak ${esc(tglPendek(x.kini.sejak))}</div>` : ""}</td>
     <td class="small">${x.periode.map(p => `<div style="margin-bottom:4px"><b>${esc(D.label[p.status])}</b> ${esc(tglPendek(p.mulai))}${p.status === "tugas_belajar" ? ` – ${p.selesai ? esc(tglPendek(p.selesai)) : "sekarang"} · <span class="num">${esc(lamaPeriode(p.mulai, p.selesai || D.hariIni))}</span>${p.selesai ? " (kembali ke kampus)" : ""}` : ""}${p.ket ? `<div class="muted">${esc(p.ket)}</div>` : ""}
       ${D.bolehUbah ? `<div class="row" style="gap:4px;margin-top:2px">${p.status === "tugas_belajar" && !p.selesai ? `<button class="btn sm" data-act="sdBuka" data-u="${x.id}" data-id="${p.id}" data-akhiri="1">Kembali ke kampus</button>` : ""}<button class="btn sm" data-act="sdBuka" data-u="${x.id}" data-id="${p.id}">Ubah</button><button class="btn sm bad" data-act="sdHapus" data-id="${p.id}">Hapus</button></div>` : ""}</div>`).join("") || '<span class="muted">–</span>'}</td>
     ${D.bolehUbah ? `<td><button class="btn sm" data-act="sdBuka" data-u="${x.id}">+ Status</button></td>` : ""}</tr>`).join("") || `<tr><td colspan="4"><div class="empty">Belum ada akun dosen.</div></td></tr>`}</tbody></table></div>`;
}
function laciStatusDosen() {
  const L = S.laci, D = S.sdos, x = D.dosen.find(y => y.id === L.u), p = L.id ? x.periode.find(y => y.id === L.id) : null, st = L.status || (p ? p.status : "tugas_belajar");
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Status dosen">
   <div class="dh"><h2>${L.akhiri ? "Kembali dari tugas belajar" : p ? "Ubah status" : "Tambah status"}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   <p class="small"><b>${esc(x.nama)}</b></p>
   <div class="field"><label for="sdSt">Status</label><select id="sdSt" ${L.akhiri ? "disabled" : ""}><option value="tugas_belajar" ${st === "tugas_belajar" ? "selected" : ""}>Tugas belajar</option><option value="pensiun" ${st === "pensiun" ? "selected" : ""}>Pensiun</option></select></div>
   <div class="field"><label for="sdMulai">Tanggal mulai</label><input id="sdMulai" type="date" value="${esc(p ? p.mulai : "")}" ${L.akhiri ? "disabled" : ""}></div>
   ${st === "tugas_belajar" ? `<div class="field"><label for="sdSelesai">Tanggal selesai / kembali ke kampus ${L.akhiri ? "" : "(kosongkan bila masih berjalan)"}</label><input id="sdSelesai" type="date" value="${esc(p ? p.selesai : "")}"></div>` : ""}
   <div class="field"><label for="sdKet">Keterangan (opsional)</label><input id="sdKet" type="text" maxlength="300" value="${esc(p ? p.ket : "")}" placeholder="${st === "tugas_belajar" ? "Contoh: S3 Pariwisata, Universitas Udayana" : "Contoh: SK pensiun No. …"}"></div>
   ${galatHtml()}<div class="row" style="justify-content:flex-end;margin-top:auto">${tombol("sdSimpan", "Simpan")}</div></div></div>`;
}
Object.assign(AKSI, {
  sdBuka(d) { S.laci = { jenis: "sdos", u: d.u, id: d.id || "", akhiri: !!d.akhiri }; S.galat = ""; render(); if (d.akhiri) fokus("sdSelesai"); },
  sdSimpan() {
    const L = S.laci, data = { userId: L.u, id: L.id || undefined, status: $("sdSt").value, mulai: $("sdMulai").value, selesai: $("sdSelesai") ? $("sdSelesai").value : "", ket: $("sdKet").value };
    if (L.akhiri && !data.selesai) { S.galat = "Isi tanggal kembali ke kampus."; render(); return; }
    jalankan(async () => { S.sdos = await api("dp.statusSimpan", data); S.laci = null; toast("Status dosen tersimpan."); });
  },
  sdHapus(d) {
    if (!confirm("Hapus catatan status ini?")) return;
    jalankan(async () => { S.sdos = await api("dp.statusHapus", { id: d.id }); toast("Catatan status dihapus."); });
  }
});
document.addEventListener("change", e => { if (e.target.id === "sdSt" && S.laci && S.laci.jenis === "sdos") { S.laci.status = e.target.value; render(); } });

/* --- Dokumen pendukung biodata dan pengingat (v0.19.0) --- */
/* v0.22.0: slot unggah mengikuti isian biodata saat ini (langsung berubah ketika pendidikan/sertifikat diketik). */
function slotDokBiodata() {
  const d = (S.bio && S.bio.data) || {}, dosen = S.pengguna.peran.includes("dosen"), ada = k => String(d[k] || "").trim(), l = [];
  const pt = String(d.pendTerakhir || "");
  if (dosen || /S1|S2|S3/.test(pt)) l.push({ k: "s1", jenis: ["Ijazah D4/S1"], label: "Ijazah D4/S1", isi: d.pendS1 });
  if (ada("pendS2") || /S2|S3/.test(pt)) l.push({ k: "s2", jenis: ["Ijazah S2"], label: "Ijazah S2 (magister)", isi: d.pendS2 });
  if (ada("pendS3") || /S3/.test(pt)) l.push({ k: "s3", jenis: ["Ijazah S3"], label: "Ijazah S3 (doktor)", isi: d.pendS3 });
  if (ada("serdos")) l.push({ k: "serdos", jenis: ["Sertifikat pendidik (Serdos)"], label: "Sertifikat pendidik (Serdos)", isi: d.serdos });
  if (ada("sertKomp")) l.push({ k: "sert", jenis: ["Sertifikat kompetensi (BNSP/LSP)", "Sertifikat profesi"], label: "Sertifikat kompetensi / profesi", isi: d.sertKomp, banyak: 1 });
  return l;
}
function panelDokBiodata() {
  const D = S.dokBio;
  if (!D) { sekali("dokBio", async () => { S.dokBio = await api("dok.biodata"); render(); }); return `<section class="panel" id="dokBio"><h2>Dokumen pendukung</h2><div class="memuat" style="min-height:60px">Memuat…</div></section>`; }
  const F = S.dokBioF, dis = S.sibuk ? "disabled" : "", slot = slotDokBiodata();
  const dokDi = sl => D.dokumen.filter(x => sl.jenis.includes(x.jenis)), terpakai = new Set(slot.flatMap(sl => sl.jenis));
  const lain = D.dokumen.filter(x => !terpakai.has(x.jenis)), lengkap = slot.filter(sl => dokDi(sl).length).length;
  const barisDok = x => `<div class="item bk"><div class="body"><div class="title" style="font-weight:600">${esc(x.nama)}</div><div class="meta"><span>${esc(x.jenis)} · ${esc(x.tahun)} · ${x.t === "file" ? esc(x.namaFile) + " · " + ukuranT(x.ukuran) : "Tautan"}</span></div></div>
     <div class="row bk-aksi"><button class="btn sm" data-act="dbLihat" data-id="${x.id}" ${dis}>${x.t === "tautan" ? "Buka" : "Lihat"}</button><button class="btn sm bad" data-act="dbHapus" data-id="${x.id}" ${dis}>Hapus</button></div></div>`;
  const form = sl => {
    const jenis = F.jenis && sl.jenis.includes(F.jenis) ? F.jenis : sl.jenis[0];
    const contoh = { s1: "Ijazah S.Tr.Par. Politeknik Pariwisata Bali", s2: "Ijazah M.Par. Universitas Udayana", s3: "Ijazah Doktor Pariwisata", serdos: "Sertifikat Pendidik Dosen", sert: "Tour Leader – LSP Pariwisata Indonesia" }[sl.k] || "";
    return `<div class="picker" style="margin-top:6px">${sl.jenis.length > 1 ? `<div class="field"><label for="dbJenis">Jenis</label><select id="dbJenis">${sl.jenis.map(j => `<option ${j === jenis ? "selected" : ""}>${esc(j)}</option>`).join("")}</select></div>` : ""}
     <div class="grid g2" style="gap:8px"><div class="field"><label for="dbNama">Nama ${sl.banyak ? "sertifikat" : "dokumen"}</label><input id="dbNama" type="text" maxlength="200" placeholder="${esc(contoh)}" value="${esc(F.nama || "")}"></div>
      <div class="field"><label for="dbTahun">Tahun</label><input id="dbTahun" type="text" inputmode="numeric" maxlength="4" placeholder="Contoh: 2015" value="${esc(F.tahun || "")}"></div></div>
     <div class="seg" role="group" aria-label="Bentuk"><button data-act="dbMode" data-m="file" aria-pressed="${F.mode === "file"}">File</button><button data-act="dbMode" data-m="tautan" aria-pressed="${F.mode === "tautan"}">Tautan</button></div>
     ${F.mode === "file" ? `<div class="field"><label for="dbFile">File (PDF/gambar, maks. 10 MB)</label><input id="dbFile" type="file" accept="${TERIMA}" ${dis}>${F.berkas ? `<span class="hint">Dipilih: ${esc(F.berkas.nama)} · ${ukuranT(F.berkas.ukuran)}</span>` : ""}</div>`
       : `<div class="field"><label for="dbUrl">Tautan</label><input id="dbUrl" type="url" placeholder="https://drive.google.com/…" value="${esc(F.url || "")}"></div>`}
     <div class="row">${tombol("dbSimpan", "Simpan", "primary sm")}<button class="btn sm" data-act="dbTutup">Batal</button></div></div>`;
  };
  return `<section class="panel" id="dokBio"><div class="row" style="justify-content:space-between;flex-wrap:wrap"><h2 style="margin:0">Dokumen pendukung (opsional)</h2>${slot.length ? `<span class="small">${lengkap} dari ${slot.length} lengkap</span>` : ""}</div>
   <p class="small muted">Tombol unggah mengikuti isian Anda di atas: setiap jenjang pendidikan yang diisi meminta ijazahnya; nomor Serdos meminta sertifikat pendidik; kolom sertifikat meminta sertifikatnya (boleh lebih dari satu, masing-masing dengan nama). Tidak wajib, tetapi Beranda mengingatkan bila belum lengkap.</p>
   ${slot.map(sl => { const ds = dokDi(sl), buka = F && F.slot === sl.k;
     return `<div class="picker" style="margin-top:8px"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:6px"><div><span class="chip ${ds.length ? "s-disetujui" : "s-revisi"}">${ds.length ? "✓" : "○"}</span> <b>${esc(sl.label)}</b>${sl.isi ? `<div class="small muted">${esc(String(sl.isi).slice(0, 90))}</div>` : ""}</div>
       ${buka ? "" : `<button class="btn sm ${ds.length ? "" : "primary"}" data-act="dbBuka" data-slot="${sl.k}" ${dis}>${ds.length ? (sl.banyak ? "+ Tambah sertifikat" : "Ganti / tambah") : "Unggah"}</button>`}</div>
       ${ds.map(barisDok).join("")}${buka ? form(sl) : ""}</div>`; }).join("") || '<p class="small muted">Isi pendidikan dan sertifikat di atas; tombol unggah akan muncul di sini.</p>'}
   ${lain.length ? `<div class="picker" style="margin-top:8px"><b>Dokumen lain</b>${lain.map(barisDok).join("")}</div>` : ""}</section>`;
}
function segarkanDokBio() { const el = $("dokBio"); if (el && S.dokBio) el.outerHTML = panelDokBiodata(); }
function isiDokDosen() {
  const D = S.dokd;
  if (!D) { sekali("dokd", async () => { S.dokd = await api("dp.dokDosen"); render(); }); return `<div class="memuat">Memuat kelengkapan dokumen…</div>`; }
  const belum = D.dosen.filter(x => x.kurang);
  return `<div class="callout">Kelengkapan dokumen pendukung biodata dosen: ijazah untuk setiap jenjang yang diisi, sertifikat pendidik bila nomor Serdos diisi, dan sertifikat kompetensi/profesi bila kolomnya diisi. Pengingat dikirim di aplikasi (tampil di Beranda dosen), tanpa email.</div>
   <div class="row" style="flex-wrap:wrap;justify-content:space-between"><span class="small"><b>${D.dosen.length - belum.length}</b> dari ${D.dosen.length} dosen lengkap</span>
    ${belum.length ? tombol("dokdIngatkanSemua", `Ingatkan ${belum.length} dosen yang belum lengkap`, "") : ""}</div>
   <div class="tbl-wrap"><table><thead><tr><th>Dosen</th><th>Dokumen</th><th>Pengingat</th><th></th></tr></thead><tbody>
   ${D.dosen.map(x => `<tr><td class="small"><b>${esc(namaPendek(x.nama))}</b>${x.inisial ? ` <span class="mono muted">${esc(x.inisial)}</span>` : ""}</td>
     <td class="small">${x.butuh.map(b => `<span class="chip ${b.ada ? "s-disetujui" : "s-revisi"}" style="margin:0 4px 4px 0">${b.ada ? "✓" : "○"} ${esc(b.jenis)}</span>`).join("") || '<span class="muted">Biodata pendidikan/sertifikat belum diisi</span>'}</td>
     <td class="small">${x.diingatkan ? "Diingatkan " + esc(tglJam(x.diingatkan)) : "–"}</td>
     <td>${x.kurang ? `<button class="btn sm" data-act="dokdIngatkan" data-id="${x.id}" ${S.sibuk ? "disabled" : ""}>Ingatkan</button>` : ""}</td></tr>`).join("") || `<tr><td colspan="4"><div class="empty">Belum ada akun dosen.</div></td></tr>`}</tbody></table></div>`;
}
const pesanDok = x => "Mohon lengkapi dokumen pendukung di menu Biodata" + (x ? ": " + x.butuh.filter(b => !b.ada).map(b => b.jenis).join(", ") : " (ijazah dan sertifikat)") + ". Terima kasih.";
Object.assign(AKSI, {
  dbBuka(d) { const sl = slotDokBiodata().find(x => x.k === d.slot); S.dokBioF = { slot: d.slot, jenis: sl ? sl.jenis[0] : "", mode: "file", berkas: null }; S.galat = ""; render(); fokus("dbNama"); },
  dbTutup() { S.dokBioF = null; render(); },
  dbMode(d) { S.dokBioF.mode = d.m; S.dokBioF.berkas = null; render(); },
  dbSimpan() {
    const F = S.dokBioF, sl = slotDokBiodata().find(x => x.k === F.slot), data = { dariBiodata: 1, jenis: $("dbJenis") ? $("dbJenis").value : (sl ? sl.jenis[0] : F.jenis), tahun: String($("dbTahun").value || "").trim(), nama: String($("dbNama").value || "").trim() };
    if (F.mode === "tautan") data.tautan = String($("dbUrl").value || "").trim();
    else { if (!F.berkas) { S.galat = "Pilih file dulu, atau pakai Tautan."; render(); return; } data.namaFile = F.berkas.nama; data.isi = F.berkas.isi; toast("Mengunggah…"); }
    jalankan(async () => { await api("dok.simpan", data); S.dokBio = null; S.dokBioF = null; S.tugas = null; S.porto = null; S.dokd = null; toast("Dokumen tersimpan."); });
  },
  dbHapus(d) {
    if (!confirm("Hapus dokumen ini? File dipindahkan ke sampah Drive.")) return;
    jalankan(async () => { await api("dok.hapus", { id: d.id, dariBiodata: 1 }); S.dokBio = null; S.tugas = null; S.porto = null; toast("Dokumen dihapus."); });
  },
  async dbLihat(d) {
    const x = S.dokBio.dokumen.find(y => y.id === d.id); if (!x) return;
    const w = window.open("", "_blank");
    try {
      const j = await api("dok.lihat", { id: d.id, dariBiodata: 1 });
      if (j.t !== "file") { if (w) w.location.href = j.url; else window.open(j.url, "_blank", "noopener"); return; }
      const bin = atob(j.isi), arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([arr], { type: j.mime }));
      if (w && /pdf|image/.test(j.mime)) w.location.href = url; else { if (w) w.close(); unduhBlob(new Blob([arr], { type: j.mime }), j.nama); }
    } catch (e) { if (w) w.close(); toast(e.message); }
  },
  dokdIngatkan(d) {
    const x = S.dokd.dosen.find(y => y.id === d.id);
    jalankan(async () => { await api("pengingat.kirim", { untuk: [d.id], pesan: pesanDok(x), jenis: "dokumen" }); S.dokd = null; toast("Pengingat dikirim ke " + namaPendek(x.nama) + "."); });
  },
  dokdIngatkanSemua() {
    const l = S.dokd.dosen.filter(x => x.kurang);
    if (!confirm(`Kirim pengingat ke ${l.length} dosen yang dokumennya belum lengkap?`)) return;
    jalankan(async () => { for (const x of l) await api("pengingat.kirim", { untuk: [x.id], pesan: pesanDok(x), jenis: "dokumen" }); S.dokd = null; toast(`Pengingat dikirim ke ${l.length} dosen.`); });
  },
  pengingatSelesai(d) { jalankan(async () => { const j = await api("pengingat.selesai", { id: d.id }); if (S.tugas) S.tugas.pengingat = j.pengingat; toast("Pengingat ditandai selesai."); }); }
});
// Isian formulir unggah disimpan saat diketik, agar tidak hilang ketika layar digambar ulang (mis. setelah memilih file).
document.addEventListener("input", e => {
  const t = e.target, peta = { dbTahun: "tahun", dbNama: "nama", dbUrl: "url" }, petaBank = { bankUrl: "url", bankBerlaku: "berlaku", bankKet: "ket" };
  if (peta[t.id] && S.dokBioF) S.dokBioF[peta[t.id]] = t.value;
  if (petaBank[t.id] && S.laci && S.laci.jenis === "bank") S.laci.isi[petaBank[t.id]] = t.value;
});
document.addEventListener("change", e => {
  const t = e.target;
  if (t.id === "bankBerlaku" && S.laci && S.laci.jenis === "bank") S.laci.isi.berlaku = t.value;
  if (t.id === "dbJenis" && S.dokBioF) { S.dokBioF.jenis = t.value; return; }
  if (t.id !== "dbFile" || !S.dokBioF) return;
  const f = t.files && t.files[0]; if (!f) return;
  if (f.size > 10 * 1024 * 1024) { t.value = ""; toast("Ukuran file maksimal 10 MB. Untuk file lebih besar, pakai Tautan."); return; }
  const F = S.dokBioF; bacaBase64(f).then(isi => { F.berkas = { nama: f.name, ukuran: f.size, isi }; render(); }, err => toast(err.message));
});

/* --- Riwayat keputusan KPS dan verifikasi (v0.20.0) --- */
const CHIP_KEP = { terbit: "s-disetujui", disetujui: "s-disetujui", ditunda: "s-diajukan", revisi_aju: "s-revisi", revisi: "s-revisi", ditolak_aju: "s-ditolak", ditolak: "s-ditolak" };
function hRiwayatKeputusan() {
  const R = S.rkep;
  if (!R) { sekali("rkep", async () => { S.rkep = await api("kps.riwayat"); render(); }); return `<div class="memuat">Memuat riwayat keputusan…</div>`; }
  const f = S.rkepF = S.rkepF || { tahun: "", jenis: "", kep: "" };
  const l = R.riwayat.filter(x => (!f.tahun || String(x.waktu).startsWith(f.tahun)) && (!f.jenis || x.jenis === f.jenis) && (!f.kep || x.keputusan === f.kep));
  const hit = k => l.filter(x => x.keputusan === k).length;
  return `<div class="filters" style="flex-wrap:wrap"><select id="rkTahun" aria-label="Tahun" style="width:auto"><option value="">Semua tahun</option>${R.tahun.map(t => `<option ${f.tahun === t ? "selected" : ""}>${t}</option>`).join("")}</select>
     <select id="rkJenis" aria-label="Jenis" style="width:auto"><option value="">Surat tugas dan verifikasi data</option><option value="surat" ${f.jenis === "surat" ? "selected" : ""}>Keputusan surat tugas (KPS)</option><option value="data" ${f.jenis === "data" ? "selected" : ""}>Verifikasi data kegiatan</option></select>
     <select id="rkKep" aria-label="Keputusan" style="width:auto"><option value="">Semua keputusan</option>${Object.entries(R.label).map(([k, v]) => `<option value="${k}" ${f.kep === k ? "selected" : ""}>${esc(v)}</option>`).join("")}</select>
     <button class="btn sm" data-act="rkXlsx">Unduh Excel</button></div>
   <p class="small muted">${l.length} keputusan · disetujui/terbit ${hit("terbit") + hit("disetujui")} · ditunda ${hit("ditunda")} · revisi ${hit("revisi_aju") + hit("revisi")} · ditolak ${hit("ditolak_aju") + hit("ditolak")}. Riwayat ini tetap tersimpan dan tidak bisa diubah.</p>
   <div class="tbl-wrap"><table><thead><tr><th>Waktu</th><th>Keputusan</th><th>Kegiatan</th><th>Pengaju</th><th>Oleh</th><th>Catatan</th></tr></thead><tbody>
   ${l.slice(0, 300).map(x => `<tr><td class="small num">${tgl(x.waktu)}</td><td><span class="chip ${CHIP_KEP[x.keputusan] || ""}">${esc(x.label)}</span>${x.kodeSurat ? `<div class="small mono">${esc(x.kodeSurat)}</div>` : ""}</td>
     <td class="small"><button class="lnk" data-act="bukaKeg" data-id="${x.id}">${esc(x.judul)}</button></td><td class="small">${esc(namaPendek(x.pengaju))}</td><td class="small">${esc(namaPendek(x.oleh))}</td><td class="small">${esc(x.catatan || "–")}</td></tr>`).join("") || `<tr><td colspan="6"><div class="empty">Belum ada keputusan.</div></td></tr>`}</tbody></table></div>`;
}
document.addEventListener("change", e => {
  const m = { rkTahun: "tahun", rkJenis: "jenis", rkKep: "kep" }[e.target.id]; if (!m || !S.rkepF) return;
  S.rkepF[m] = e.target.value; render();
});

/* --- Penanda tangan selain KPS (v0.20.0, Super Admin) --- */
function panelPenandaTangan() {
  const T = S.pttd;
  if (!T) { sekali("pttd", async () => { S.pttd = await api("admin.penandaTangan"); render(); }); return `<section class="panel"><h2>Penanda tangan surat</h2><div class="memuat" style="min-height:60px">Memuat…</div></section>`; }
  return `<section class="panel"><h2>Penanda tangan surat</h2><p class="small">KPS selalu bisa menyiapkan tanda tangannya. Centang dosen lain yang perlu menyiapkan tanda tangan juga (mis. calon KPS atau pelaksana harian). Tanda tangan dipakai pada surat yang disetujui akun itu saat memegang peran KPS.</p>
   <div class="classgrid">${T.dosen.map(o => `<label><input type="checkbox" data-pttd="${o.id}" ${o.dipilih || o.kps ? "checked" : ""} ${o.kps ? "disabled" : ""}><span>${esc(namaPendek(o.nama))}${o.kps ? " (KPS)" : ""}${o.adaTtd ? " · ✓ tersimpan" : ""}</span></label>`).join("")}</div>
   <div class="row" style="margin-top:8px">${tombol("pttdSimpan", "Simpan penanda tangan", "sm")}</div></section>`;
}

/* --- Laboratorium dan sarana (v0.20.0) --- */
function hLab() {
  const L = S.lab;
  if (!L) { sekali("lab", async () => { S.lab = await api("lab.data"); render(); }); return `<div class="memuat">Memuat data laboratorium…</div>`; }
  const ub = L.bolehUbah, nLab = L.sarana.filter(x => x.jenis === "Laboratorium").length;
  return `<div class="head"><div><h1>Laboratorium dan sarana</h1><p>Data sarana, laboratorium, perawatan, dan pemakaian untuk butir Matriks sarana dan prasarana (19–21) LAMWisata. Diisi Kepala Lab dan Laboran${ub ? "" : "; Anda dapat melihat"}.</p></div>${ub ? tombol("labBaru", "+ Tambah sarana", "primary") : ""}</div>
   <div class="grid g3"><div class="panel stat"><span class="v num">${L.sarana.length}</span><span class="l">Sarana tercatat (${nLab} laboratorium)</span></div>
    <div class="panel stat"><span class="v num">${L.sarana.filter(x => x.kondisi === "Baik").length}</span><span class="l">Kondisi baik</span></div>
    <div class="panel stat"><span class="v num">${L.sarana.reduce((a, x) => a + x.pakaiSetahun, 0)}</span><span class="l">Pemakaian tercatat 12 bulan terakhir</span></div></div>
   <div class="callout">Dokumen pendukung (SOP lab, jadwal perawatan, foto) disimpan di <b>Bank Dokumen</b> butir 18 dan 21. Di sini dicatat datanya: siapa penanggung jawab, kondisi, kapan dirawat, dan untuk apa dipakai.</div>
   <div class="grid g2">${L.sarana.map(x => `<article class="panel" style="display:flex;flex-direction:column;gap:6px">
     <div class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><b>${esc(x.nama)}</b><span class="chip ${x.kondisi === "Baik" ? "s-disetujui" : "s-revisi"}">${esc(x.kondisi)}</span></div>
     <div class="small muted">${esc(x.jenis)} · ${esc(x.kepemilikan)}${x.lokasi ? " · " + esc(x.lokasi) : ""} · kapasitas <span class="num">${x.kapasitas}</span></div>
     ${x.perangkat ? `<div class="small"><b>Perangkat:</b> ${esc(x.perangkat)}</div>` : ""}${x.mk ? `<div class="small"><b>Dipakai MK:</b> ${esc(x.mk)}</div>` : ""}
     <div class="small">PJ: ${esc(x.pjNama ? namaPendek(x.pjNama) : "belum ditunjuk")} · perawatan terakhir: ${x.rawatTerakhir ? esc(tglPendek(x.rawatTerakhir)) : "–"} · ${x.pakaiSetahun} pemakaian (${String(x.jamSetahun).replace(".", ",")} jam) setahun</div>
     ${ub ? `<div class="row" style="flex-wrap:wrap">${tombol("labLogBuka", "+ Perawatan", "sm", `data-id="${x.id}" data-t="rawat"`)}${tombol("labLogBuka", "+ Pemakaian", "sm", `data-id="${x.id}" data-t="pakai"`)}<button class="btn sm" data-act="labUbah" data-id="${x.id}">Ubah</button></div>` : ""}
   </article>`).join("") || `<div class="empty panel">Belum ada sarana. ${ub ? "Tekan <b>+ Tambah sarana</b>." : ""}</div>`}</div>
   <section class="panel"><div class="row" style="justify-content:space-between"><h2 style="margin:0">Catatan perawatan dan pemakaian</h2><button class="btn sm" data-act="labXlsx">Unduh Excel</button></div>
    <div class="tbl-wrap" style="margin-top:8px"><table><thead><tr><th>Tanggal</th><th>Sarana</th><th>Jenis</th><th>Kegiatan / keperluan</th><th>MK / kelas</th><th>Pengguna</th><th>Jam</th><th>Dicatat</th>${ub ? "<th></th>" : ""}</tr></thead><tbody>
    ${L.log.slice(0, 100).map(g => `<tr><td class="small num">${esc(tglPendek(g.tgl))}</td><td class="small">${esc((L.sarana.find(x => x.id === g.saranaId) || {}).nama || "–")}</td><td class="small">${g.tipe === "rawat" ? "Perawatan" : "Pemakaian"}</td><td class="small">${esc(g.isi)}</td><td class="small">${esc(g.mk || "–")}</td><td class="small num">${g.jumlah || "–"}</td><td class="small num">${g.jam ? String(g.jam).replace(".", ",") : "–"}</td><td class="small">${esc(namaPendek(g.oleh))}</td>
      ${ub ? `<td><button class="btn sm bad" data-act="labLogHapus" data-id="${g.id}">Hapus</button></td>` : ""}</tr>`).join("") || `<tr><td colspan="9"><div class="empty">Belum ada catatan.</div></td></tr>`}</tbody></table></div></section>`;
}
function laciLab() {
  const L = S.laci, P = S.lab.pilihan, x = L.id ? S.lab.sarana.find(y => y.id === L.id) : { nama: "", jenis: P.jenis[0], lokasi: "", kapasitas: "", kepemilikan: P.kepemilikan[0], kondisi: "Baik", perangkat: "", mk: "", pj: "", ket: "" };
  const sel = (id, l, opsi, v) => `<div class="field"><label for="${id}">${l}</label><select id="${id}">${opsi.map(o => `<option ${o === v ? "selected" : ""}>${esc(o)}</option>`).join("")}</select></div>`;
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Sarana" style="width:min(620px,100%)">
   <div class="dh"><h2>${L.id ? "Ubah sarana" : "Tambah sarana"}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   <div class="field"><label for="lbNama">Nama</label><input id="lbNama" type="text" maxlength="150" value="${esc(x.nama)}" placeholder="Contoh: Laboratorium Travel Agent dan GDS (Amadeus)"></div>
   <div class="grid g2" style="gap:8px">${sel("lbJenis", "Jenis", P.jenis, x.jenis)}<div class="field"><label for="lbKap">Kapasitas (orang)</label><input id="lbKap" type="text" inputmode="numeric" value="${esc(x.kapasitas)}"></div>
    ${sel("lbMilik", "Kepemilikan", P.kepemilikan, x.kepemilikan)}${sel("lbKondisi", "Kondisi", P.kondisi, x.kondisi)}</div>
   <div class="field"><label for="lbLokasi">Lokasi</label><input id="lbLokasi" type="text" maxlength="150" value="${esc(x.lokasi)}" placeholder="Contoh: Gedung C lantai 2"></div>
   <div class="field"><label for="lbPerangkat">Perangkat / perangkat lunak</label><textarea id="lbPerangkat" rows="2" maxlength="1000" placeholder="Contoh: 30 PC, Amadeus GDS, proyektor">${esc(x.perangkat)}</textarea></div>
   <div class="field"><label for="lbMk">Dipakai untuk mata kuliah</label><input id="lbMk" type="text" maxlength="500" value="${esc(x.mk)}" placeholder="Contoh: UPW202 Ticketing; UPW301 Tour Planning"></div>
   <div class="field"><label for="lbPj">Penanggung jawab</label><select id="lbPj"><option value="">– belum ditunjuk –</option>${S.lab.pegawai.map(o => `<option value="${o.id}" ${o.id === x.pj ? "selected" : ""}>${esc(o.nama)}</option>`).join("")}</select></div>
   <div class="field"><label for="lbKet">Keterangan</label><input id="lbKet" type="text" maxlength="500" value="${esc(x.ket)}"></div>
   ${galatHtml()}<div class="row" style="justify-content:space-between;margin-top:auto">${L.id ? tombol("labHapus", "Hapus", "bad") : "<span></span>"}${tombol("labSimpan", "Simpan")}</div></div></div>`;
}
function laciLabLog() {
  const L = S.laci, x = S.lab.sarana.find(y => y.id === L.id), rawat = L.t === "rawat";
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Catatan">
   <div class="dh"><h2>${rawat ? "Catat perawatan" : "Catat pemakaian"}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   <p class="small"><b>${esc(x.nama)}</b></p>
   <div class="field"><label for="lgTgl">Tanggal</label><input id="lgTgl" type="date" max="${esc(S.lab.hariIni)}" value="${esc(S.lab.hariIni)}"></div>
   <div class="field"><label for="lgIsi">${rawat ? "Kegiatan perawatan" : "Keperluan"}</label><input id="lgIsi" type="text" maxlength="500" placeholder="${rawat ? "Contoh: servis berkala 30 PC, pembaruan lisensi GDS" : "Contoh: praktik reservasi tiket"}"></div>
   ${rawat ? "" : `<div class="field"><label for="lgMk">Mata kuliah dan kelas / kegiatan</label><input id="lgMk" type="text" maxlength="150" placeholder="Contoh: UPW202 Ticketing kelas 3A"></div>
    <div class="grid g2" style="gap:8px"><div class="field"><label for="lgJml">Jumlah pengguna</label><input id="lgJml" type="text" inputmode="numeric"></div><div class="field"><label for="lgJam">Lama (jam)</label><input id="lgJam" type="text" inputmode="decimal" placeholder="Contoh: 2,5"></div></div>`}
   ${galatHtml()}<div class="row" style="justify-content:flex-end;margin-top:auto">${tombol("labLogSimpan", "Simpan")}</div></div></div>`;
}
Object.assign(AKSI, {
  rkXlsx() {
    const R = S.rkep, f = S.rkepF || {}, l = R.riwayat.filter(x => (!f.tahun || String(x.waktu).startsWith(f.tahun)) && (!f.jenis || x.jenis === f.jenis) && (!f.kep || x.keputusan === f.kep));
    unduhBlob(UPW_ZIP.xlsx([{ nama: "Riwayat keputusan", baris: [["Waktu", "Jenis", "Keputusan", "Kegiatan", "Tanggal kegiatan", "Pengaju", "Diputuskan oleh", "Kode surat", "Catatan", "Tautan"]]
      .concat(l.map(x => [tgl(x.waktu), x.jenis === "surat" ? "Surat tugas" : "Verifikasi data", x.label, x.judul, x.tgl, x.pengaju, x.oleh, x.kodeSurat, x.catatan, tautanKeg(x.id)])) }]), "Riwayat keputusan " + (f.tahun || "semua") + ".xlsx");
  },
  kpsTab(d) { S.kpsTab = d.t; render(); },
  pttdSimpan() {
    const ids = [...document.querySelectorAll("[data-pttd]:checked:not(:disabled)")].map(el => el.dataset.pttd);
    jalankan(async () => { S.pttd = await api("admin.penandaTangan", { ids }); toast("Penanda tangan tersimpan."); });
  },
  labBaru() { S.laci = { jenis: "lab" }; S.galat = ""; render(); fokus("lbNama"); },
  labUbah(d) { S.laci = { jenis: "lab", id: d.id }; S.galat = ""; render(); },
  labSimpan() {
    const v = id => $(id).value, data = { nama: v("lbNama"), jenis: v("lbJenis"), kapasitas: angkaBulat(v("lbKap")) || 0, kepemilikan: v("lbMilik"), kondisi: v("lbKondisi"), lokasi: v("lbLokasi"), perangkat: v("lbPerangkat"), mk: v("lbMk"), pj: v("lbPj"), ket: v("lbKet") };
    const id = S.laci.id;
    jalankan(async () => { S.lab = await api("lab.simpan", { id, data }); S.laci = null; S.nilai = null; toast("Sarana tersimpan."); });
  },
  labHapus() {
    if (!confirm("Hapus sarana ini beserta tampilannya? Catatan perawatan/pemakaian tetap tersimpan di arsip.")) return;
    const id = S.laci.id; jalankan(async () => { S.lab = await api("lab.hapus", { id }); S.laci = null; S.nilai = null; toast("Sarana dihapus."); });
  },
  labLogBuka(d) { S.laci = { jenis: "labLog", id: d.id, t: d.t }; S.galat = ""; render(); fokus("lgIsi"); },
  labLogSimpan() {
    const L = S.laci, data = { saranaId: L.id, tipe: L.t, tgl: $("lgTgl").value, isi: $("lgIsi").value, mk: $("lgMk") ? $("lgMk").value : "", jumlah: $("lgJml") ? angkaBulat($("lgJml").value) : 0, jam: $("lgJam") ? $("lgJam").value : 0 };
    jalankan(async () => { S.lab = await api("lab.log", { data }); S.laci = null; S.nilai = null; toast("Catatan tersimpan."); });
  },
  labLogHapus(d) { if (!confirm("Hapus catatan ini?")) return; jalankan(async () => { S.lab = await api("lab.logHapus", { id: d.id }); toast("Catatan dihapus."); }); },
  labXlsx() {
    const L = S.lab, nama = id => (L.sarana.find(x => x.id === id) || {}).nama || "";
    unduhBlob(UPW_ZIP.xlsx([
      { nama: "Sarana", baris: [["Nama", "Jenis", "Lokasi", "Kapasitas", "Kepemilikan", "Kondisi", "Perangkat", "Mata kuliah", "Penanggung jawab", "Perawatan terakhir", "Pemakaian 12 bulan", "Jam pemakaian 12 bulan", "Keterangan"]]
        .concat(L.sarana.map(x => [x.nama, x.jenis, x.lokasi, x.kapasitas, x.kepemilikan, x.kondisi, x.perangkat, x.mk, x.pjNama, x.rawatTerakhir, x.pakaiSetahun, x.jamSetahun, x.ket])) },
      { nama: "Catatan", baris: [["Tanggal", "Sarana", "Jenis", "Kegiatan / keperluan", "MK / kelas", "Jumlah pengguna", "Jam", "Dicatat oleh"]]
        .concat(L.log.map(g => [g.tgl, nama(g.saranaId), g.tipe === "rawat" ? "Perawatan" : "Pemakaian", g.isi, g.mk, g.jumlah, g.jam, g.oleh])) }]), "Laboratorium dan sarana UPW.xlsx");
  }
});

/* --- Info: tentang aplikasi dan tutorial per peran (v0.21.0) --- */
const SEMUA_PERAN = ["mahasiswa", "dosen", "tendik", "kps", "kalab", "laboran", "admin", "superadmin", "asesor"];
const TUTORIAL = [
  { j: "Masuk pertama kali dan aktivasi akun", g: ["01-masuk", "02-beranda"], p: SEMUA_PERAN.filter(x => x !== "asesor"), l: [
    "Buka alamat aplikasi yang dibagikan prodi.",
    "Isi <b>NIM</b> (mahasiswa) atau <b>NIP</b> (dosen/tendik) di kolom pertama. Kata sandi awal sama dengan NIM/NIP Anda. Tekan <b>Masuk</b>.",
    "Langkah 1: buat kata sandi baru (minimal 8 karakter, memuat huruf dan angka, tidak sama dengan NIM/NIP). Tekan tombol <b>Lihat</b> di ujung kolom untuk memeriksa ketikan.",
    "Langkah 2: tuliskan email yang aktif Anda buka. Bila prodi menyalakan aktivasi tanpa email, akun langsung aktif; bila tidak, masukkan kode 6 digit yang dikirim ke email Anda.",
    "Lengkapi <b>Biodata</b>: kolom bertanda * wajib. Menu lain terbuka setelah biodata tersimpan."], c: "Kata sandi awal berlaku terbatas. Bila kedaluwarsa, hubungi Admin Prodi." },
  { j: "Foto profil", p: SEMUA_PERAN, l: [
    "Buka menu <b>Akun saya</b> (atau klik nama Anda di bawah menu), tekan <b>Pilih foto</b>, lalu pilih foto wajah (JPG/PNG).",
    "Bagian tengah foto dipotong persegi dan diperkecil otomatis. Foto tampil di bilah samping dan di <b>Cari orang</b>.",
    "Tekan <b>Ganti foto</b> untuk mengganti, atau <b>Hapus foto</b> untuk kembali ke inisial nama."] },
  { j: "Data Terkumpul dan sumber data penilaian", p: ["superadmin"], l: [
    "Menu <b>Data Terkumpul</b> menampilkan semua kegiatan (semua status) beserta jenisnya, Tabel iLKPS, dan nomor butir Penilaian yang memakainya.",
    "Saring menurut status, jenis, butir penilaian, atau cari nama pengaju. Tombol <b>Terima</b>, <b>Minta revisi</b>, <b>Tolak</b>, dan <b>Hapus</b> berlaku juga untuk data yang sudah disetujui.",
    "Centang beberapa kegiatan lalu <b>Hapus terpilih</b> untuk membersihkan data uji coba sekaligus. Alasan wajib diisi. Kegiatan terhapus bisa dipulihkan dari tab <b>Terhapus</b>.",
    "Di menu <b>Penilaian</b>, tombol <b>Sumber data</b> pada setiap butir menunjukkan kegiatan dan data lain (dosen, lulusan, PMB, keuangan, survei, skor GPM) yang menjadi dasar skornya."] },
  { j: "Ganti kata sandi dan lupa kata sandi", p: SEMUA_PERAN, l: [
    "Ganti: buka menu <b>Akun saya</b>, isi kata sandi lama dan kata sandi baru dua kali, lalu <b>Simpan</b>.",
    "Lupa: di halaman masuk, tekan <b>Lupa kata sandi</b>, isi email terdaftar, lalu masukkan kode dari email dan kata sandi baru.",
    "Bila kode tidak datang, hubungi <b>Super Admin</b> prodi untuk mereset kata sandi; Anda akan diminta membuat kata sandi baru saat masuk."] },
  { j: "Memasang aplikasi di komputer atau ponsel", p: SEMUA_PERAN, l: [
    "Mac/Windows (Chrome atau Edge): buka aplikasi, klik ikon <b>Pasang</b> di ujung kanan bilah alamat, lalu <b>Pasang</b>. Ikon logo Poltekpar Bali muncul di Dock/menu Start.",
    "Android (Chrome): menu ⋮ → <b>Tambahkan ke layar utama</b> / <b>Instal aplikasi</b>.",
    "iPhone/iPad (Safari): tombol Bagikan → <b>Tambah ke Layar Utama</b>."] },
  { j: "Mengisi dan memperbarui biodata", g: ["06-biodata", "07-dokumen"], p: ["mahasiswa", "dosen", "tendik"], l: [
    "Buka menu <b>Biodata</b>. Isi semua kolom bertanda *; kolom abu-abu diisi otomatis dari akun.",
    "Mahasiswa: setiap awal semester periksa bagian <b>Kehidupan kuliah</b> (tempat tinggal, bekerja, bahasa Inggris), ubah bila berubah, lalu <b>Simpan</b>.",
    "Dosen: di bagian bawah ada <b>Dokumen pendukung</b>. Pilih jenis (ijazah per jenjang, sertifikat pendidik, sertifikat kompetensi/profesi), isi tahun dan nama, pilih file atau tempel tautan, lalu <b>Simpan dokumen</b>. Sertifikat boleh lebih dari satu.",
    "Dokumen pendukung opsional, tetapi Beranda akan mengingatkan bila belum lengkap."] },
  { j: "Mencatat kegiatan dan mengajukan surat tugas", g: ["03-kegiatan", "04-peserta"], p: ["mahasiswa", "dosen", "tendik", "kps", "kalab", "laboran", "admin", "superadmin"], l: [
    "Buka menu <b>Kegiatan</b> → <b>+ Catat kegiatan</b>.",
    "Cari jenis kegiatan (mis. ketik \"lomba\", \"PkM\", \"pelatihan\"), lalu isi judul (tanpa tanggal/tempat), tanggal mulai–selesai, tingkat, dan tempat.",
    "Tandai peserta: dosen/tendik dicari dengan nama, NIP, atau <b>inisial</b>; mahasiswa per kelas (bisa mengecualikan orang tertentu) atau satu per satu.",
    "Lomba mahasiswa: pilih dosen pendamping (verifikator data).",
    "Bagian <b>Pasal Global Code of Ethics for Tourism</b> menampilkan saran pasal dari kata di judul; centang yang benar-benar diterapkan.",
    "Centang <b>Perlu surat tugas</b> bila perlu surat, periksa pratinjau surat, lalu <b>Kirim ke KPS</b>. Status bisa dipantau di daftar kegiatan dan Beranda."] },
  { j: "Mengunggah bukti dan mengajukan verifikasi data", g: ["05-bukti"], p: ["mahasiswa", "dosen", "tendik", "kps", "kalab", "laboran", "admin", "superadmin"], l: [
    "Setelah surat terbit (atau langsung untuk kegiatan tanpa surat), buka kegiatan → bagian <b>Bukti kegiatan</b>.",
    "Setiap dokumen cukup diunggah sekali oleh salah satu anggota: <b>Unggah file</b> (maks. 10 MB), <b>Tautan</b> (untuk video/album), atau <b>Tidak ada</b> dengan alasan.",
    "Perhatikan <b>batas hari kerja</b> setelah kegiatan selesai; keterlambatan tampil merah di Beranda.",
    "Kegiatan bersurat otomatis diajukan untuk verifikasi saat bukti wajib lengkap; kegiatan tanpa surat diajukan dengan tombol <b>Ajukan verifikasi</b>.",
    "Bila diminta revisi, catatan verifikator tampil di Beranda; perbaiki lalu ajukan ulang."] },
  { j: "Portofolio Saya dan ekspor", p: ["mahasiswa", "dosen", "tendik", "kps", "kalab", "laboran", "admin", "superadmin"], l: [
    "Menu <b>Portofolio</b> berisi semua kegiatan yang melibatkan Anda dan dokumen pribadi.",
    "<b>Unduh PDF</b>: pilih Simpan sebagai PDF di jendela cetak. Setiap kegiatan memuat tautan <b>Bukti kegiatan</b> dan <b>cek keaslian</b> surat.",
    "<b>Unduh Excel</b>: berisi kolom tautan kegiatan/bukti dan tautan cek surat. <b>Unduh ZIP</b>: semua file bukti dalam satu berkas."] },
  { j: "Mata Kuliah Saya (portofolio MK)", p: ["dosen", "kps", "kalab"], l: [
    "Buka menu <b>Mata Kuliah Saya</b>, pilih semester.",
    "Pengampu utama: unggah RPS, kontrak kuliah, rubrik (file atau tautan), dan pilih metode pembelajaran.",
    "Semua anggota tim: tambahkan catatan integrasi penelitian/PkM dan bukti pembelajaran (tautan LMS, foto sesi)."] },
  { j: "Verifikasi data sebagai dosen pendamping", p: ["dosen"], l: [
    "Menu <b>Verifikasi</b> menampilkan data lomba mahasiswa yang Anda dampingi.",
    "Buka kegiatan, periksa bukti, lalu pilih <b>Setujui</b>, <b>Minta revisi</b> (wajib catatan), atau <b>Tolak</b>."] },
  { j: "Menyetujui surat tugas (Antrean KPS)", g: ["08-kps"], p: ["kps"], l: [
    "Pastikan peran aktif di bilah atas adalah <b>Koordinator Program Studi</b>.",
    "Menu <b>Antrean KPS</b> → buka pengajuan, periksa draf surat dan peringatan tunggakan bukti.",
    "Pilih <b>Setujui</b> (surat terbit dengan kode verifikasi dan QR), <b>Tunda</b>, <b>Minta revisi</b>, atau <b>Tolak</b> (tiga terakhir wajib catatan).",
    "Tab <b>Riwayat keputusan</b> mencatat semua keputusan surat dan verifikasi data; bisa disaring per tahun dan diunduh ke Excel."] },
  { j: "Tanda tangan di surat", p: ["kps", "dosen"], l: [
    "Menu <b>Tanda Tangan</b> (untuk KPS dan dosen yang ditunjuk Super Admin).",
    "Pilih <b>Gambar langsung</b> (tanda tangani kotak putih dengan mouse/jari) atau <b>Unggah gambar</b> (PNG/JPG tanda tangan di kertas putih; latar putih dibuang otomatis).",
    "Centang persetujuan pemakaian, lalu <b>Simpan</b>. Tanda tangan tampil di atas nama Anda pada surat yang Anda setujui, dengan QR dan kode verifikasi di bawahnya."] },
  { j: "Laboratorium dan sarana", g: ["09-lab"], p: ["kalab", "laboran", "admin", "superadmin", "kps"], l: [
    "Menu <b>Laboratorium</b> → <b>+ Tambah sarana</b>: isi nama, jenis, kapasitas, kepemilikan, kondisi, perangkat, mata kuliah pengguna, dan penanggung jawab.",
    "Pada kartu sarana, tekan <b>+ Perawatan</b> untuk mencatat servis/pemeliharaan, atau <b>+ Pemakaian</b> untuk mencatat praktik (MK/kelas, jumlah pengguna, lama).",
    "Unduh rekap dengan <b>Unduh Excel</b>. Dokumen pendukung (SOP, jadwal, foto) disimpan di Bank Dokumen butir 18/21."] },
  { j: "Data Prodi: kurikulum, tim pengajar, dosen, lulusan", p: ["admin", "superadmin", "kps"], l: [
    "Menu <b>Data Prodi</b>. Tab <b>Kurikulum</b>: tambah satu per satu atau <b>Impor</b> (tempel dari Excel atau unggah berkas templat).",
    "Tab <b>Tim pengajar</b>: tetapkan pengampu utama dan anggota per semester; <b>Salin dari</b> semester yang sama tahun lalu.",
    "Tab <b>Status dosen</b>: catat tugas belajar (mulai dan tanggal kembali ke kampus; lamanya dihitung otomatis) atau pensiun.",
    "Tab <b>Dokumen dosen</b>: lihat kelengkapan ijazah/sertifikat setiap dosen dan tekan <b>Ingatkan</b>; pesan tampil di Beranda dosen.",
    "Tab <b>Lulusan</b>, <b>PMB</b>, <b>Keuangan</b>: isi data untuk Tabel iLKPS 8–10 dan 21."] },
  { j: "Impor dari Excel dengan templat", g: ["10-impor"], p: ["admin", "superadmin"], l: [
    "Pada panel impor (Pengguna, Kurikulum, Lulusan), tekan <b>Unduh templat Excel</b>.",
    "Isi lembar <b>Data</b> mulai baris 2 (lihat lembar Petunjuk dan Contoh). Kolom NIM/NIP sudah berformat Teks; jangan mengubah baris judul.",
    "Tekan <b>Unggah berkas Excel</b>, periksa pratinjau dan daftar baris yang perlu diperbaiki, lalu tekan <b>Impor</b>.",
    "Biodata dosen massal: sel kosong tidak menghapus isian lama."] },
  { j: "Akun mahasiswa", p: ["admin", "superadmin"], l: [
    "Menu <b>Pengguna</b> → <b>Impor akun</b>: tempel \"NIM; Nama; kelas\" (angkatan diambil dari 2 angka pertama NIM) atau pakai templat Excel.",
    "Ubah kelas/status mahasiswa lewat tombol <b>Data mhs</b> di daftar akun. <b>Unduh daftar akun (Excel)</b> tersedia di panel impor."] },
  { j: "Tabel iLKPS, Penilaian, DED, Bank Dokumen, Survei", p: ["admin", "superadmin", "kps"], l: [
    "<b>Tabel iLKPS</b>: 33 tabel terisi otomatis dari data yang disetujui; unduh Excel sesuai format LAMWisata.",
    "<b>Penilaian</b>: simulasi skor 84 butir; butir rubrik dinilai GPM dengan catatan bukti.",
    "<b>DED</b>: tulis narasi 64 butir (bisa ditugaskan ke dosen PJ) lalu <b>Unduh DED (.docx)</b>.",
    "<b>Bank Dokumen</b>: tunjuk PJ per slot, unggah dokumen dengan masa berlaku; versi lama tersimpan.",
    "<b>Survei</b>: buat dari templat, buka, bagikan tautan, lihat rekap dan tindak lanjut."] },
  { j: "Tugas khusus Super Admin", p: ["superadmin"], l: [
    "Menu <b>Pengguna</b>: impor akun dosen/tendik (NIP; Nama; peran), atur peran, reset kata sandi.",
    "<b>Aktivasi akun</b>: nyalakan aktivasi tanpa email selama email kampus belum terkirim; matikan setelah DKIM beres.",
    "<b>Penanda tangan surat</b>: centang dosen lain yang boleh menyiapkan tanda tangan.",
    "<b>Akun asesor</b>: buat akun baca-saja berkedaluwarsa untuk asesor LAMWisata.",
    "Menu <b>Log aktivitas</b> (siapa melakukan apa) dan <b>Riwayat Versi</b> (catatan rilis; <b>Buat cadangan sekarang</b> sebelum setiap rilis)."] },
  { j: "Panduan asesor", p: ["asesor"], l: [
    "<b>Tabel iLKPS</b>: pilih tabel; klik baris kegiatan untuk membuka detail dan buktinya.",
    "<b>Kegiatan disetujui</b>: daftar kegiatan yang datanya sudah diverifikasi prodi.",
    "<b>Bank Dokumen</b>: dokumen mutu versi berlaku per butir Matriks.",
    "Keaslian surat tugas dapat dicek dengan kode atau QR pada surat. Setiap akses tercatat oleh prodi."] }
];
/* Gambar panduan bertanda nomor (v0.22.0): tangkapan layar dari data contoh; penanda [x%, y%, nomor, keterangan]. */
const GAMBAR_PANDUAN = {"01-masuk": {"j": "Halaman masuk", "t": [[55.6, 34.3, 1, "Kolom NIM / NIP"], [55.6, 44.9, 2, "Kolom kata sandi"], [87.4, 44.9, 3, "Ikon mata: tampilkan atau sembunyikan kata sandi"], [55.6, 55.2, 4, "Tombol Masuk"], [55.6, 62.2, 5, "Lupa kata sandi"], [55.6, 74.8, 6, "Panduan masuk pertama kali"]]}, "02-beranda": {"j": "Beranda setelah masuk", "t": [[1.1, 19, 1, "Menu: pilih halaman"], [24.8, 26, 2, "Perlu tindakan: hal yang menunggu Anda"], [74.2, 4.5, 3, "Pilihan peran (bila Anda punya lebih dari satu)"], [90.4, 4.5, 4, "Info dan panduan"], [94.5, 4.5, 5, "Keluar"]]}, "03-kegiatan": {"j": "Catat kegiatan (bagian atas)", "t": [[36.4, 28.4, 1, "Pilih jenis kegiatan"], [36.4, 52.2, 2, "Bingung memilih jenis? Cari dengan kata kunci"], [36.4, 64.2, 3, "Judul kegiatan, tanpa tanggal dan tempat"]]}, "04-peserta": {"j": "Catat kegiatan (peserta dan GCET)", "t": [[37.4, 15.3, 1, "Tandai dosen/tendik: ketik nama, NIP, atau inisial"], [37.4, 35.0, 2, "Tandai mahasiswa per kelas/angkatan atau satu per satu"], [37.4, 74.4, 3, "Saran Pasal GCET dari judul: centang yang benar-benar diterapkan"]]}, "05-bukti": {"j": "Detail kegiatan dan bukti", "t": [[40, 10.9, 1, "Tahapan kegiatan"], [40, 37.5, 2, "Unduh surat tugas (PDF)"], [40, 62.7, 3, "Bukti kegiatan dan batas waktunya"], [75.4, 75.7, 4, "Unggah file"], [84.5, 75.7, 5, "Tempel tautan (video/album)"], [90.9, 75.7, 6, "Tidak ada (tulis alasannya)"]]}, "06-biodata": {"j": "Biodata", "t": [[24.9, 25.8, 1, "Persentase kelengkapan semua kolom"], [24.9, 31.7, 2, "Status kolom wajib (*)"], [62.8, 70.9, 3, "Contoh kolom pendidikan S2"], [94, 16.8, 4, "Simpan"]]}, "07-dokumen": {"j": "Dokumen pendukung biodata dosen", "t": [[24.9, 66.5, 1, "Dokumen pendukung (opsional)"], [26.1, 80.1, 2, "Slot ijazah D4/S1"], [26.1, 90.1, 3, "Slot ijazah S2 muncul karena kolom S2 diisi"], [92.1, 81.6, 4, "Tombol Unggah"]]}, "08-kps": {"j": "Antrean KPS", "t": [[71, 4.4, 1, "Peran aktif: Koordinator Program Studi"], [23.4, 42.2, 2, "Tab Antrean"], [33.1, 42.2, 3, "Tab Riwayat keputusan"], [24.9, 75.2, 4, "Lihat draf surat"], [24.9, 86.5, 5, "Catatan untuk pengaju"], [24.9, 94.3, 6, "Setujui dan terbitkan surat"], [42.1, 94.3, 7, "Tunda, minta revisi, atau tolak"]]}, "09-lab": {"j": "Laboratorium dan sarana", "t": [[23.4, 26.7, 1, "Tambah sarana"], [24.9, 62.8, 2, "Kartu sarana"], [25, 84.2, 3, "Catat perawatan"], [34.6, 84.2, 4, "Catat pemakaian"], [87.5, 97, 5, "Unduh Excel"]]}, "10-impor": {"j": "Impor akun", "t": [[24.9, 28.6, 1, "Tempel baris dari Excel"], [24.9, 45.6, 2, "Tombol Impor"], [67.5, 53.2, 3, "Unduh templat Excel"], [81.8, 53.2, 4, "Unggah berkas Excel yang sudah diisi"], [24.9, 96, 5, "Unduh daftar akun (Excel)"]]}};
function htmlGambar(id) {
  const g = GAMBAR_PANDUAN[id]; if (!g) return "";
  const batas = (v, a, b) => Math.min(b, Math.max(a, v));
  return `<figure class="gbr-panduan"><div class="gbr"><img src="panduan/${id}.jpg" alt="${esc(g.j)}" loading="lazy" width="800" height="524">
    ${g.t.map(([x, y, n]) => `<span class="tanda" style="left:${batas(x - 1.7, 2.5, 97.5)}%;top:${batas(y - 3.6, 3.5, 96.5)}%" aria-hidden="true">${n}</span>`).join("")}</div>
    <figcaption><b>${esc(g.j)}</b><ol>${g.t.map(([, , n, k]) => `<li value="${n}">${esc(k)}</li>`).join("")}</ol></figcaption></figure>`;
}
function hInfo() {
  const u = S.pengguna, p = peranAktif(), punya = u.peran, pilih = S.infoPeran && punya.includes(S.infoPeran) ? S.infoPeran : p;
  const l = TUTORIAL.filter(t => t.p.includes(pilih) || (pilih === "superadmin" && t.p.includes("admin")));
  return `<div class="head"><div><h1>Info</h1><p>Tentang aplikasi, masukan dan saran, serta panduan pemakaian sesuai peran Anda.</p></div><button class="btn primary" data-act="mskBuka">Kirim masukan</button></div>
   <section class="panel"><h2>Tentang aplikasi</h2>
    <div class="row" style="gap:14px;align-items:center;flex-wrap:nowrap"><img src="ikon-192.png" alt="" style="width:56px;height:56px"><div>
     <b>Repositori Akreditasi UPW</b> · <span class="num">${esc(LABEL_VERSI)}</span><br>
     <span class="small">Repositori kegiatan Prodi Usaha Perjalanan Wisata, Politeknik Pariwisata Bali, untuk akreditasi LAMWisata IAPS 1.0.</span><br>
     <span class="small">Dikembangkan oleh <b>@adeprimanda</b> bersama <b>Claude Opus 5.5</b> (Anthropic).</span></div></div>
    ${punya.includes("superadmin") ? `<p class="small" style="margin-top:8px">Catatan setiap versi ada di menu <b>Riwayat Versi</b>.</p>` : ""}</section>
   ${panelMasukanSaya()}
   <section class="panel"><div class="row" style="justify-content:space-between;flex-wrap:wrap"><h2 style="margin:0">Panduan untuk ${esc(PERAN_L[pilih])}</h2>
    ${punya.length > 1 ? `<label class="row small" style="gap:6px"><span class="muted">Lihat panduan peran</span><select id="infoPeran" style="width:auto">${punya.map(r => `<option value="${r}" ${r === pilih ? "selected" : ""}>${PERAN_L[r]}</option>`).join("")}</select></label>` : ""}</div>
    <p class="small muted">Klik judul untuk membuka langkah-langkahnya.</p>
    ${l.map((t, i) => `<details class="picker" style="margin-top:8px" ${i === 0 ? "open" : ""}><summary style="cursor:pointer"><b>${esc(t.j)}</b></summary>
      <ol class="small" style="margin:8px 0 0 18px;padding:0;display:grid;gap:6px">${t.l.map(x => `<li>${x}</li>`).join("")}</ol>${t.c ? `<p class="small muted" style="margin-top:6px">${t.c}</p>` : ""}
      ${(t.g || []).map(htmlGambar).join("")}</details>`).join("")}
   </section>
   <p class="small muted">Butuh bantuan? Hubungi Admin Prodi UPW. Gambar panduan memakai data contoh; angka bulat pada gambar sesuai keterangan di bawahnya.</p>`;
}
document.addEventListener("change", e => { if (e.target.id === "infoPeran") { S.infoPeran = e.target.value; render(); } });

/* --- Masukan dan saran (v0.23.0) --- */
const CHIP_MSK = { baru: "s-diajukan", ditinjau: "s-revisi", direncanakan: "s-revisi", selesai: "s-disetujui", ditolak: "s-ditolak" };
function panelMasukanSaya() {
  const M = S.mskSaya;
  if (!M) { sekali("mskSaya", async () => { S.mskSaya = await api("masukan.saya"); render(); }); return `<section class="panel" id="masukan"><h2>Masukan dan saran</h2><div class="memuat" style="min-height:60px">Memuat…</div></section>`; }
  return `<section class="panel" id="masukan"><div class="row" style="justify-content:space-between;flex-wrap:wrap"><h2 style="margin:0">Masukan dan saran</h2>${tombol("mskBuka", "Kirim masukan", "primary")}</div>
   <p class="small">Laporkan masalah yang Anda alami, minta fitur baru, atau sampaikan saran. Masukan tersimpan di sistem prodi dan ditanggapi oleh Admin Prodi. Status dan tanggapannya tampil di bawah.</p>
   <div class="list">${M.masukan.map(x => `<div class="item"><div class="body"><div class="row" style="justify-content:space-between;gap:6px"><div class="title">${esc(x.judul)}</div><span class="chip ${CHIP_MSK[x.status] || ""}">${esc(M.status[x.status] || x.status)}</span></div>
     <div class="meta"><span>${esc(x.jenis)}</span>${x.menu ? `<span>${esc(x.menu)}</span>` : ""}<span>${esc(tglJam(x.waktu))}</span>${x.lampiran ? "<span>1 lampiran</span>" : ""}</div>
     ${x.tanggapan ? `<div class="small" style="margin-top:4px;border-left:3px solid var(--brand);padding-left:8px"><b>Tanggapan ${esc(namaPendek(x.olehTanggapan))}:</b> ${esc(x.tanggapan)}</div>` : ""}</div></div>`).join("") || '<div class="empty">Belum ada masukan dari Anda.</div>'}</div></section>`;
}
function laciMasukan() {
  const F = S.laci, J = (S.mskSaya || {}).jenis || ["Masalah / error", "Permintaan fitur baru", "Saran perbaikan", "Pertanyaan", "Lainnya"], dis = S.sibuk ? "disabled" : "";
  const menuL = menu().filter(v => v !== "info").map(v => MENU_L[v]).concat(["Halaman masuk / aktivasi", "Lainnya"]);
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Kirim masukan" style="width:min(620px,100%)">
   <div class="dh"><h2>Kirim masukan</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   <div class="field"><label for="mskJenis">Jenis</label><select id="mskJenis">${J.map(j => `<option ${j === F.jm ? "selected" : ""}>${esc(j)}</option>`).join("")}</select></div>
   <div class="field"><label for="mskMenu">Bagian aplikasi yang terkait</label><select id="mskMenu">${menuL.map(m => `<option ${m === F.menu ? "selected" : ""}>${esc(m)}</option>`).join("")}</select></div>
   <div class="field"><label for="mskJudul">Judul singkat</label><input id="mskJudul" type="text" maxlength="150" value="${esc(F.judul || "")}" placeholder="Contoh: Tombol unggah bukti tidak bereaksi"></div>
   <div class="field"><label for="mskIsi">Uraian</label><textarea id="mskIsi" rows="6" maxlength="3000" placeholder="Untuk masalah: apa yang Anda lakukan, apa yang terjadi, dan apa yang seharusnya terjadi. Untuk fitur: apa yang dibutuhkan dan untuk apa.">${esc(F.isi || "")}</textarea></div>
   <div class="field"><label for="mskFile">Tangkapan layar (opsional; gambar atau PDF, maks. 5 MB)</label><input id="mskFile" type="file" accept=".png,.jpg,.jpeg,.webp,.pdf" ${dis}>${F.berkas ? `<span class="hint">Dipilih: ${esc(F.berkas.nama)} · ${ukuranT(F.berkas.ukuran)}</span>` : `<span class="hint">Di Mac: tekan Cmd+Shift+4 untuk memotret sebagian layar; di Windows: Win+Shift+S.</span>`}</div>
   <p class="small muted">Ikut terkirim otomatis: versi aplikasi (${esc(K.versi)}), peran aktif (${esc(PERAN_L[peranAktif()])}), dan jenis perangkat/browser, untuk membantu menelusuri masalah.</p>
   ${galatHtml()}<div class="row" style="justify-content:flex-end;margin-top:auto">${tombol("mskKirim", "Kirim")}</div></div></div>`;
}
const infoPerangkat = () => { const u = navigator.userAgent; const os = /Mac/.test(u) ? "Mac" : /Windows/.test(u) ? "Windows" : /Android/.test(u) ? "Android" : /iPhone|iPad/.test(u) ? "iPhone/iPad" : "Lainnya";
  const br = /Edg\//.test(u) ? "Edge" : /Chrome\//.test(u) ? "Chrome" : /Safari\//.test(u) ? "Safari" : /Firefox\//.test(u) ? "Firefox" : "Browser lain";
  return `${br} di ${os}${terpasang() ? " (aplikasi terpasang)" : ""} · layar ${innerWidth}×${innerHeight}`; };
function hMasukan() {
  const D = S.mskAdm;
  if (!D) { sekali("mskAdm", async () => { S.mskAdm = await api("masukan.daftar"); render(); }); return `<div class="memuat">Memuat masukan…</div>`; }
  const f = S.mskF = S.mskF || { status: "", jenis: "" }, l = D.masukan.filter(x => (!f.status || x.status === f.status) && (!f.jenis || x.jenis === f.jenis));
  const hit = st => D.masukan.filter(x => x.status === st).length;
  return `<div class="head"><div><h1>Masukan pengguna</h1><p>Laporan masalah, permintaan fitur, dan saran dari pengguna. Data juga tersimpan di sheet <b>Masukan</b> pada spreadsheet aplikasi.</p></div><button class="btn" data-act="mskXlsx">Unduh Excel</button></div>
   <div class="grid g3"><div class="panel stat"><span class="v num">${hit("baru")}</span><span class="l">Baru</span></div><div class="panel stat"><span class="v num">${hit("ditinjau") + hit("direncanakan")}</span><span class="l">Ditinjau / direncanakan</span></div><div class="panel stat"><span class="v num">${hit("selesai")}</span><span class="l">Selesai</span></div></div>
   <div class="filters" style="flex-wrap:wrap"><select id="mskFStatus" aria-label="Status" style="width:auto"><option value="">Semua status</option>${Object.entries(D.status).map(([k, v]) => `<option value="${k}" ${f.status === k ? "selected" : ""}>${esc(v)}</option>`).join("")}</select>
    <select id="mskFJenis" aria-label="Jenis" style="width:auto"><option value="">Semua jenis</option>${D.jenis.map(j => `<option ${f.jenis === j ? "selected" : ""}>${esc(j)}</option>`).join("")}</select></div>
   <div class="list">${l.map(x => `<div class="item" style="cursor:pointer" data-act="mskDetail" data-id="${x.id}"><div class="body"><div class="row" style="justify-content:space-between;gap:6px"><div class="title">${esc(x.judul)}</div><span class="chip ${CHIP_MSK[x.status] || ""}">${esc(D.status[x.status] || x.status)}</span></div>
     <div class="meta"><span>${esc(x.jenis)}</span>${x.menu ? `<span>${esc(x.menu)}</span>` : ""}<span>${esc(namaPendek(x.nama))} (${esc(PERAN_L[x.peran] || x.peran)})</span><span>${esc(tglJam(x.waktu))}</span>${x.lampiran ? "<span>lampiran</span>" : ""}</div></div></div>`).join("") || '<div class="empty panel">Belum ada masukan.</div>'}</div>`;
}
function laciMasukanDetail() {
  const D = S.mskAdm, x = D.masukan.find(y => y.id === S.laci.id);
  if (!x) return "";
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Masukan" style="width:min(620px,100%)">
   <div class="dh"><h2>${esc(x.judul)}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   <p class="small muted">${esc(x.jenis)}${x.menu ? " · " + esc(x.menu) : ""} · ${esc(x.nama)} (${esc(x.username)}, ${esc(PERAN_L[x.peran] || x.peran)}) · ${esc(tglJam(x.waktu))}<br>Versi ${esc(x.versi || "–")} · ${esc(x.perangkat || "–")}</p>
   <div class="picker" style="white-space:pre-wrap">${esc(x.isi)}</div>
   ${x.lampiran ? `<div class="row"><button class="btn sm" data-act="mskLampiran" data-id="${x.id}">Lihat lampiran (${esc(x.lampiran.nama)})</button></div>` : ""}
   <div class="field"><label for="mskStatus">Status</label><select id="mskStatus">${Object.entries(D.status).map(([k, v]) => `<option value="${k}" ${x.status === k ? "selected" : ""}>${esc(v)}</option>`).join("")}</select></div>
   <div class="field"><label for="mskTanggapan">Tanggapan untuk pengirim (tampil di halaman Info miliknya)</label><textarea id="mskTanggapan" rows="4" maxlength="2000">${esc(x.tanggapan)}</textarea>${x.olehTanggapan ? `<span class="hint">Terakhir oleh ${esc(x.olehTanggapan)}, ${esc(tglJam(x.waktuTanggapan))}</span>` : ""}</div>
   ${galatHtml()}<div class="row" style="justify-content:flex-end;margin-top:auto">${tombol("mskSimpan", "Simpan")}</div></div></div>`;
}
Object.assign(AKSI, {
  mskBuka() { const v = MENU_L[S.view !== "info" ? S.view : S.viewTerakhir]; S.laci = { jenis: "masukan", jm: "", menu: v || "", judul: "", isi: "", berkas: null }; S.galat = ""; render(); fokus("mskJudul"); },
  mskKirim() {
    const F = S.laci, data = { jenis: $("mskJenis").value, menu: $("mskMenu").value, judul: String($("mskJudul").value || "").trim(), isi: String($("mskIsi").value || "").trim(),
      peran: peranAktif(), versi: K.versi, perangkat: infoPerangkat() };
    if (F.berkas) data.lampiran = { nama: F.berkas.nama, isi: F.berkas.isi };
    jalankan(async () => { const j = await api("masukan.kirim", data); S.mskSaya = Object.assign(S.mskSaya || {}, { masukan: j.masukan }); S.laci = null; toast("Terima kasih! Masukan Anda tersimpan."); });
  },
  mskDetail(d) { S.laci = { jenis: "mskDetail", id: d.id }; S.galat = ""; render(); },
  mskSimpan() {
    const data = { id: S.laci.id, status: $("mskStatus").value, tanggapan: $("mskTanggapan").value };
    jalankan(async () => { S.mskAdm = await api("masukan.ubah", data); S.laci = null; S.tugas = null; toast("Status masukan tersimpan."); });
  },
  async mskLampiran(d) {
    const w = window.open("", "_blank");
    try {
      const j = await api("masukan.lampiran", { id: d.id }), bin = atob(j.isi), arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const blob = new Blob([arr], { type: j.mime }); if (w) w.location.href = URL.createObjectURL(blob); else simpanBerkas(blob, j.nama);
    } catch (e) { if (w) w.close(); toast(e.message); }
  },
  mskXlsx() {
    const D = S.mskAdm;
    unduhBlob(UPW_ZIP.xlsx([{ nama: "Masukan", baris: [["Waktu", "Status", "Jenis", "Bagian aplikasi", "Judul", "Uraian", "Pengirim", "NIM/NIP", "Peran", "Versi", "Perangkat", "Lampiran", "Tanggapan", "Ditanggapi oleh", "Waktu tanggapan"]]
      .concat(D.masukan.map(x => [tgl(x.waktu), D.status[x.status] || x.status, x.jenis, x.menu, x.judul, x.isi, x.nama, x.username, PERAN_L[x.peran] || x.peran, x.versi, x.perangkat, x.lampiran ? x.lampiran.nama : "", x.tanggapan, x.olehTanggapan, x.waktuTanggapan ? tgl(x.waktuTanggapan) : ""])), teks: [7] }]),
      "Masukan pengguna Repositori UPW " + new Date().toISOString().slice(0, 10) + ".xlsx");
  }
});
document.addEventListener("input", e => {
  const t = e.target, m = { mskJudul: "judul", mskIsi: "isi" }[t.id];
  if (m && S.laci && S.laci.jenis === "masukan") S.laci[m] = t.value;
});
document.addEventListener("change", e => {
  const t = e.target;
  if (t.id === "mskFStatus" || t.id === "mskFJenis") { S.mskF[t.id === "mskFStatus" ? "status" : "jenis"] = t.value; render(); return; }
  if ((t.id === "mskJenis" || t.id === "mskMenu") && S.laci && S.laci.jenis === "masukan") { S.laci[t.id === "mskJenis" ? "jm" : "menu"] = t.value; return; }
  if (t.id !== "mskFile" || !S.laci || S.laci.jenis !== "masukan") return;
  const f = t.files && t.files[0]; if (!f) return;
  if (f.size > 5 * 1024 * 1024) { t.value = ""; toast("Lampiran maksimal 5 MB."); return; }
  const F = S.laci; bacaBase64(f).then(isi => { F.berkas = { nama: f.name, ukuran: f.size, isi }; render(); }, err => toast(err.message));
});

/* --- Foto profil (v0.24.0) --- */
const inisial = nama => esc(String(nama || "").split(" ").filter(Boolean).slice(0, 2).map(x => x[0]).join(""));
/** Bulatan foto (atau inisial bila belum ada foto). */
const avatar = (src, nama, uk = 34) => src
  ? `<img class="avatar" src="${esc(src)}" alt="" style="width:${uk}px;height:${uk}px;object-fit:cover">`
  : `<div class="avatar" style="width:${uk}px;height:${uk}px;${uk > 50 ? "font-size:1.6rem" : ""}">${inisial(nama)}</div>`;
function muatFotoSaya() {
  const u = S.pengguna; if (!u || S.fotoSaya || u.status !== "aktif") return;
  try { const c = JSON.parse(ls.get("foto:" + u.id) || "null"); if (c) S.fotoSaya = c; } catch (_) {}
  sekali("fotoSaya", async () => {
    const j = await api("foto.saya"), v = { foto: j.foto, kecil: j.kecil };
    const lama = JSON.stringify(S.fotoSaya || {}); S.fotoSaya = v;
    ls.set("foto:" + u.id, j.foto ? JSON.stringify(v) : null);
    if (lama !== JSON.stringify(v)) render();
  });
}
/** Potong tengah menjadi persegi, perkecil, simpan sebagai JPEG di bawah batas ukuran. */
async function fotoPersegi(file, sisi, maks) {
  if (!/^image\//.test(file.type)) throw new Error("Pilih berkas gambar (JPG atau PNG).");
  if (file.size > 15 * 1024 * 1024) throw new Error("Gambar terlalu besar (maksimal 15 MB).");
  let bmp;
  try { bmp = await createImageBitmap(file); }
  catch (_) { throw new Error("Gambar tidak bisa dibaca di perangkat ini. Pakai JPG atau PNG (foto HEIC dari iPhone: ubah dulu ke JPG)."); }
  const s = Math.min(bmp.width, bmp.height), c = document.createElement("canvas"); c.width = c.height = sisi;
  const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, sisi, sisi);
  g.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, sisi, sisi);
  for (let q = 0.86; q > 0.3; q -= 0.08) { const d = c.toDataURL("image/jpeg", q); if (d.length <= maks) return d; }
  throw new Error("Gambar tidak bisa diperkecil. Pilih gambar lain.");
}
function panelFotoProfil() {
  const u = S.pengguna, f = S.fotoSaya || {}, dis = S.sibuk ? "disabled" : "";
  return `<section class="panel" style="max-width:520px"><h2>Foto profil</h2>
   <div class="row" style="gap:16px;align-items:center;flex-wrap:wrap">${avatar(f.foto, u.nama, 96)}
    <div class="grid" style="gap:8px"><p class="small muted">Foto tampil di bilah samping dan di Cari orang. Pilih foto wajah yang jelas; bagian tengah gambar dipotong persegi otomatis.</p>
     <div class="row" style="flex-wrap:wrap"><label class="btn primary" style="cursor:pointer" ${dis}>${f.foto ? "Ganti foto" : "Pilih foto"}<input id="fotoBerkas" type="file" accept="image/jpeg,image/png,image/webp" hidden ${dis}></label>
      ${f.foto ? `<button class="btn" data-act="fotoHapus" ${dis}>Hapus foto</button>` : ""}</div></div></div></section>`;
}
document.addEventListener("change", e => {
  if (e.target.id !== "fotoBerkas" || !e.target.files[0]) return;
  const file = e.target.files[0];
  jalankan(async () => {
    const foto = await fotoPersegi(file, 256, 46000), kecil = await fotoPersegi(file, 64, 11000);
    const j = await api("foto.simpan", { foto, kecil });
    S.fotoSaya = { foto: j.foto, kecil: j.kecil }; ls.set("foto:" + S.pengguna.id, JSON.stringify(S.fotoSaya)); S.dirFoto = null;
    toast("Foto profil disimpan.");
  });
});
/** Foto kecil orang-orang di Cari orang (dimuat bertahap, disimpan sementara). */
function muatFotoDirektori(ids) {
  S.dirFoto = S.dirFoto || {};
  const perlu = ids.filter(i => !(i in S.dirFoto)).slice(0, 120);
  if (!perlu.length) return;
  sekali("dirFoto", async () => {
    const j = await api("foto.kecil", { ids: perlu });
    perlu.forEach(i => { S.dirFoto[i] = j.foto[i] || ""; });
    render();
  });
}

/* --- Sumber data penilaian dan Data Terkumpul (v0.24.0) --- */
const CHIP_DATA = { draf: "s-draf", diajukan: "s-diajukan", diajukan_ulang: "s-diajukan", revisi: "s-revisi", disetujui: "s-disetujui", ditolak: "s-ditolak" };
const chipData = k => `<span class="chip ${CHIP_DATA[k.status] || "s-draf"}">${esc(k.statusLabel)}</span>`;
const tahapSurat = k => k.st && k.st !== "terbit" && k.st !== "tanpa";
/** Tombol tindakan Super Admin untuk satu kegiatan. */
function tombolTinjau(k) {
  if (tahapSurat(k)) return `<span class="small muted" title="Masih menunggu keputusan surat tugas di Antrean KPS">Proses surat tugas</span>`;
  const b = (aksi, label, kls = "") => k.status === aksi ? "" : `<button class="btn sm ${kls}" data-act="sdAksi" data-id="${k.id}" data-a="${aksi}">${label}</button>`;
  return `<div class="row" style="gap:4px;flex-wrap:wrap">${b("disetujui", "Terima")}${b("revisi", "Minta revisi")}${b("ditolak", "Tolak")}<button class="btn sm" data-act="sdAksi" data-id="${k.id}" data-a="hapus" style="color:var(--bad)">Hapus</button></div>`;
}
function tabelLain(t) {
  return `<section style="margin-top:14px"><div class="row" style="justify-content:space-between;gap:6px;flex-wrap:wrap"><h3 style="font-size:1rem">${esc(t.judul)}</h3>
    ${t.menu && t.menu !== S.view && menu().includes(t.menu) ? `<button class="btn sm" data-go="${t.menu}">Buka ${esc(MENU_L[t.menu])}</button>` : ""}</div>
   ${t.baris.length ? `<div class="tbl-wrap" style="margin-top:6px;max-height:280px;overflow:auto"><table><thead><tr>${t.kolom.map(c => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>
    ${t.baris.map(r => `<tr>${r.map(v => `<td class="small">${esc(v === null || v === undefined || v === "" ? "–" : v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`
    : `<p class="small muted" style="margin-top:4px">Belum ada data.</p>`}</section>`;
}
function laciSumber() {
  const L = S.laci, B = L.data;
  const kepala = `<div class="dh"><h2>Sumber data butir ${L.n}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>`;
  if (!B) return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" style="width:min(860px,100%)">${kepala}<div class="memuat">Menelusuri data…</div></div></div>`;
  const b = B.butir, hitung = B.kegiatan.filter(k => k.dihitungButir).length;
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Sumber data butir" style="width:min(860px,100%)">${kepala}
   <div><b>${esc(b.nm)}</b><div class="small muted">${CARA_L[b.t]} · DED butir ${b.ded} · Sumber menurut Matriks: ${esc(b.src)} · TS ${esc(B.ts.label)}</div></div>
   ${B.jenis.length ? `<section><h3 style="font-size:1rem">Kegiatan (${B.kegiatan.length})</h3>
     <p class="small muted">Jenis: ${B.jenis.map(esc).join(", ")} · rentang ${esc(B.rentang)}. ${b.t === "a" || b.t === "c" ? `<b>${hitung}</b> kegiatan berstatus Disetujui ikut dihitung; status lain belum dihitung.` : "Kegiatan ini menjadi bahan penilaian GPM (tidak dihitung otomatis)."}</p>
     ${B.kegiatan.length ? `<div class="tbl-wrap" style="margin-top:6px"><table><thead><tr><th>Kegiatan</th><th>Pengaju</th><th>Status</th></tr></thead><tbody>
      ${B.kegiatan.map(k => `<tr><td style="min-width:220px"><a href="#" data-act="bukaKeg" data-id="${k.id}"><b>${esc(k.judul)}</b></a><div class="small muted">${esc(k.jenisLabel)} · ${esc(k.tgl || "–")}${k.dihitungButir ? ' · <b style="color:var(--ok)">dihitung</b>' : ""}</div>${B.bolehUbah ? `<div style="margin-top:6px">${tombolTinjau(k)}</div>` : ""}</td>
       <td class="small">${esc(k.olehNama)}<div class="muted mono">${esc(k.olehUser)}</div></td><td>${chipData(k)}${k.verifNama ? `<div class="small muted">oleh ${esc(k.verifNama)}</div>` : ""}</td></tr>`).join("")}</tbody></table></div>` : `<p class="small muted">Belum ada kegiatan pada rentang ini.</p>`}</section>` : ""}
   ${B.lain.map(tabelLain).join("")}
   ${!B.jenis.length && !B.lain.length ? `<p class="small muted">Butir ini tidak memakai data aplikasi.</p>` : ""}
   ${B.bolehUbah ? "" : `<p class="small muted" style="margin-top:10px">Menerima, meminta revisi, menolak, atau menghapus data hanya bisa dilakukan Super Admin.</p>`}</div></div>`;
}
/** Laci konfirmasi tindakan Super Admin (satu kegiatan atau beberapa sekaligus untuk hapus). */
function laciSumberAksi() {
  const L = S.laci, a = L.a, banyak = L.ids.length > 1;
  const judul = { disetujui: "Terima data", revisi: "Minta revisi", ditolak: "Tolak data", hapus: banyak ? `Hapus ${L.ids.length} kegiatan` : "Hapus kegiatan" }[a];
  const ket = { disetujui: "Data akan berstatus Disetujui dan ikut dihitung di Tabel iLKPS dan Penilaian.",
    revisi: "Pengunggah melihat alasan Anda dan dapat memperbaiki lalu mengajukan ulang. Selama revisi, data tidak dihitung.",
    ditolak: "Data tidak dihitung. Pengunggah melihat alasan Anda.",
    hapus: "Kegiatan hilang dari semua daftar, Tabel iLKPS, dan Penilaian. Tidak benar-benar dibuang: masih bisa dipulihkan dari tab Terhapus di menu Data Terkumpul." }[a];
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="${esc(judul)}" style="width:min(520px,100%)">
   <div class="dh"><h2>${esc(judul)}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   ${L.judul ? `<p><b>${esc(L.judul)}</b></p>` : ""}<p class="small">${ket}</p>
   <div class="field"><label for="sdAlasan">${a === "disetujui" ? "Catatan (opsional)" : "Alasan (wajib)"}</label><textarea id="sdAlasan" rows="3" placeholder="${a === "hapus" ? "Contoh: data uji coba yang terselip" : "Contoh: tanggal kegiatan tidak sesuai dengan surat tugas"}">${esc(L.alasan || "")}</textarea></div>
   ${galatHtml()}<div class="row" style="justify-content:flex-end;margin-top:auto"><button class="btn" data-act="sdKembali">Batal</button>${tombol("sdLakukan", judul, "primary", a === "hapus" || a === "ditolak" ? 'style="background:var(--bad);border-color:var(--bad)"' : "")}</div></div></div>`;
}
function hData() {
  const D = S.sdata;
  if (!D) { sekali("sdata", async () => { S.sdata = await api("sumber.kegiatan"); render(); }); return `<div class="memuat">Mengumpulkan data…</div>`; }
  const f = S.sdF = S.sdF || { q: "", status: "", jenis: "", butir: "", tab: "aktif" }, pilih = S.sdPilih = S.sdPilih || {};
  const q = f.q.trim().toLowerCase(), nmB = n => (D.butirNama.find(x => x.n === n) || {}).nm || "";
  const l = D.kegiatan.filter(k => (!f.status || k.status === f.status) && (!f.jenis || k.jenis === f.jenis) && (!f.butir || k.butir.some(b => b.n === Number(f.butir)))
    && (!q || (k.judul + " " + k.olehNama + " " + k.olehUser).toLowerCase().includes(q)));
  const nPilih = Object.keys(pilih).filter(i => pilih[i] && D.kegiatan.some(k => k.id === i)).length, semuaDipilih = l.length && l.every(k => pilih[k.id]);
  const hit = s => D.kegiatan.filter(k => k.status === s).length;
  const daftarAktif = `<div class="filters" style="flex-wrap:wrap"><input id="sdCari" type="search" placeholder="Judul, nama atau NIM/NIP pengaju" value="${esc(f.q)}" style="width:240px">
     <select id="sdFStatus" aria-label="Status" style="width:auto"><option value="">Semua status</option>${Object.entries(D.status).map(([k, v]) => `<option value="${k}" ${f.status === k ? "selected" : ""}>${esc(v)} (${hit(k)})</option>`).join("")}</select>
     <select id="sdFJenis" aria-label="Jenis kegiatan" style="width:auto"><option value="">Semua jenis</option>${D.jenis.map(j => `<option value="${j.k}" ${f.jenis === j.k ? "selected" : ""}>${esc(j.l)}</option>`).join("")}</select>
     <select id="sdFButir" aria-label="Butir penilaian" style="width:auto;max-width:280px"><option value="">Semua butir penilaian</option>${D.butirNama.filter(b => D.kegiatan.some(k => k.butir.some(x => x.n === b.n))).map(b => `<option value="${b.n}" ${String(f.butir) === String(b.n) ? "selected" : ""}>${b.n}. ${esc(b.nm)}</option>`).join("")}</select></div>
    <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px;margin:8px 0"><span class="small muted">${l.length} dari ${D.kegiatan.length} kegiatan${nPilih ? ` · <b>${nPilih} dipilih</b>` : ""}</span>
     <div class="row" style="gap:6px">${nPilih ? `<button class="btn sm" data-act="sdBatalPilih">Batal pilih</button><button class="btn sm" data-act="sdHapusPilih" style="color:var(--bad)">Hapus ${nPilih} terpilih</button>` : ""}<button class="btn sm" data-act="sdXlsx">Unduh Excel</button></div></div>
    <div class="tbl-wrap"><table><thead><tr><th><input type="checkbox" id="sdSemua" aria-label="Pilih semua yang tampil" ${semuaDipilih ? "checked" : ""}></th><th>Kegiatan dan tindakan</th><th>Pengaju</th><th>Status</th><th>Masuk penilaian</th></tr></thead><tbody>
    ${l.map(k => `<tr><td><input type="checkbox" data-sdpilih="${k.id}" aria-label="Pilih ${esc(k.judul)}" ${pilih[k.id] ? "checked" : ""}></td>
     <td style="min-width:220px"><a href="#" data-act="bukaKeg" data-id="${k.id}"><b>${esc(k.judul)}</b></a><div class="small muted">${esc(k.jenisLabel)}${k.jenisLain ? ": " + esc(k.jenisLain) : ""} · ${esc(k.tabel || "–")} · ${esc(k.tgl || "–")}${k.ta ? ` (TA ${k.ta}/${k.ta + 1})` : ""}</div><div style="margin-top:6px">${tombolTinjau(k)}</div></td>
     <td class="small">${esc(k.olehNama)}<div class="muted mono">${esc(k.olehUser)}</div></td>
     <td>${chipData(k)}${tahapSurat(k) ? `<div class="small muted">surat tugas: ${esc(k.st)}</div>` : ""}${k.verifNama ? `<div class="small muted">oleh ${esc(k.verifNama)}</div>` : ""}</td>
     <td class="small" style="min-width:160px">${k.butir.length ? k.butir.map(b => `<span class="tag" title="${esc(nmB(b.n))}${b.cara === "bahan GPM" ? " (bahan penilaian GPM)" : " (dihitung otomatis bila disetujui)"}" style="${b.cara === "bahan GPM" ? "opacity:.7" : ""}">${b.n}</span>`).join(" ") : '<span class="muted">Tidak dipakai butir mana pun</span>'}</td></tr>`).join("") || `<tr><td colspan="5" class="empty">Tidak ada kegiatan yang cocok.</td></tr>`}</tbody></table></div>
    <p class="small muted" style="margin-top:6px">Nomor di kolom "Masuk penilaian" adalah butir Matriks Penilaian. Nomor tebal dihitung otomatis bila data Disetujui; nomor pudar menjadi bahan penilaian GPM. Arahkan kursor ke nomor untuk melihat nama butir.</p>`;
  const daftarHapus = D.terhapus.length ? `<div class="tbl-wrap"><table><thead><tr><th>Kegiatan</th><th>Pengaju</th><th>Dihapus</th><th>Alasan</th><th></th></tr></thead><tbody>
    ${D.terhapus.map(k => `<tr><td><b>${esc(k.judul)}</b><div class="small muted">${esc(k.jenisLabel)} · ${esc(k.tgl || "–")} · status terakhir ${esc(D.status[k.status] || k.status)}</div></td><td class="small">${esc(k.olehNama)}</td>
     <td class="small">${tgl(k.waktuHapus)}${k.dihapusOleh ? `<div class="muted">oleh ${esc(k.dihapusOleh)}</div>` : ""}</td><td class="small">${esc(k.alasan)}</td><td><button class="btn sm" data-act="sdPulihkan" data-id="${k.id}">Pulihkan</button></td></tr>`).join("")}</tbody></table></div>`
    : `<div class="empty">Belum ada kegiatan yang dihapus.</div>`;
  return `<div class="head"><div><h1>Data Terkumpul</h1><p>Semua data yang masuk ke aplikasi dan dipakai untuk Tabel iLKPS dan Penilaian. Periksa asal setiap data, lalu terima, minta revisi, tolak, atau hapus (misalnya data uji coba yang terselip). Hanya Super Admin.</p></div>
    <button class="btn" data-act="sdMuatUlang">Muat ulang</button></div>
   <section class="panel"><h2>Data selain kegiatan</h2><p class="small muted" style="margin-bottom:8px">Diisi lewat menu masing-masing; periksa dan perbaiki di sana.</p>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px">${D.ringkas.map(r => `<button class="btn" data-go="${r.menu}" style="display:block;text-align:left;height:auto;padding:10px 12px"><span class="row" style="justify-content:space-between"><span>${esc(r.judul)}</span><b class="num">${r.jumlah}</b></span><span class="small muted">${esc(MENU_L[r.menu] || "")}</span></button>`).join("")}</div></section>
   <section class="panel"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px"><h2>Kegiatan</h2>
    <div class="seg" role="group" aria-label="Tampilan"><button data-act="sdTab" data-tab="aktif" aria-pressed="${f.tab === "aktif"}">Semua kegiatan (${D.kegiatan.length})</button><button data-act="sdTab" data-tab="hapus" aria-pressed="${f.tab === "hapus"}">Terhapus (${D.terhapus.length})</button></div></div>
    ${f.tab === "hapus" ? daftarHapus : daftarAktif}</section>`;
}
document.addEventListener("input", ketikUlang("sdCari", v => { S.sdF.q = v; }));
document.addEventListener("change", e => {
  const t = e.target;
  if (t.id === "sdFStatus" || t.id === "sdFJenis" || t.id === "sdFButir") { S.sdF[{ sdFStatus: "status", sdFJenis: "jenis", sdFButir: "butir" }[t.id]] = t.value; render(); return; }
  if (t.dataset.sdpilih) { S.sdPilih[t.dataset.sdpilih] = t.checked; render(); return; }
  if (t.id === "sdSemua") {
    const D = S.sdata, f = S.sdF, q = f.q.trim().toLowerCase();
    D.kegiatan.filter(k => (!f.status || k.status === f.status) && (!f.jenis || k.jenis === f.jenis) && (!f.butir || k.butir.some(b => b.n === Number(f.butir)))
      && (!q || (k.judul + " " + k.olehNama + " " + k.olehUser).toLowerCase().includes(q))).forEach(k => { S.sdPilih[k.id] = t.checked; });
    render();
  }
});
document.addEventListener("input", e => { if (e.target.id === "sdAlasan" && S.laci && S.laci.jenis === "sumberAksi") S.laci.alasan = e.target.value; });
const cariKegSumber = id => (S.sdata && S.sdata.kegiatan.find(k => k.id === id)) || (S.laci && S.laci.data && S.laci.data.kegiatan.find(k => k.id === id))
  || (S.laciLama && S.laciLama.data && S.laciLama.data.kegiatan.find(k => k.id === id));
Object.assign(AKSI, {
  async sumberBuka(d) {
    const n = Number(d.n), ts = S.nilai.ts.awal;
    S.laci = { jenis: "sumber", n, ts, data: null }; S.galat = ""; render();
    try { const j = await api("sumber.butir", { ts, butir: n }); if (S.laci && S.laci.jenis === "sumber" && S.laci.n === n) { S.laci.data = j; render(); } }
    catch (e) { S.laci = null; render(); toast(e.message); }
  },
  sdAksi(d) {
    const k = cariKegSumber(d.id);
    S.laciLama = S.laci && S.laci.jenis === "sumber" ? S.laci : null;
    S.laci = { jenis: "sumberAksi", a: d.a, ids: [d.id], judul: k ? k.judul : "", alasan: "" }; S.galat = ""; render();
  },
  sdHapusPilih() {
    const ids = Object.keys(S.sdPilih).filter(i => S.sdPilih[i] && S.sdata.kegiatan.some(k => k.id === i));
    S.laciLama = null; S.laci = { jenis: "sumberAksi", a: "hapus", ids, judul: "", alasan: "" }; S.galat = ""; render();
  },
  sdBatalPilih() { S.sdPilih = {}; render(); },
  sdKembali() { S.laci = S.laciLama || null; S.laciLama = null; S.galat = ""; render(); },
  sdLakukan() {
    const L = S.laci;
    jalankan(async () => {
      const alasan = nilai("sdAlasan"); // dibaca DI DALAM jalankan (pelajaran v0.4.0)
      if (L.a === "hapus") await api("sumber.hapus", { ids: L.ids, alasan });
      else await api("sumber.tinjau", { id: L.ids[0], keputusan: L.a, catatan: alasan });
      const lama = S.laciLama; S.laciLama = null;
      L.ids.forEach(i => { delete (S.sdPilih || {})[i]; });
      segarkan(); S.sdata = null;
      toast({ disetujui: "Data diterima.", revisi: "Revisi diminta; pengunggah melihat alasan Anda.", ditolak: "Data ditolak.", hapus: L.ids.length > 1 ? L.ids.length + " kegiatan dihapus." : "Kegiatan dihapus." }[L.a]);
      if (lama) { S.laci = { jenis: "sumber", n: lama.n, ts: lama.ts, data: await api("sumber.butir", { ts: lama.ts, butir: lama.n }) }; }
      else S.laci = null;
    });
  },
  sdPulihkan(d) {
    jalankan(async () => { await api("sumber.pulihkan", { id: d.id }); segarkan(); S.sdata = null; toast("Kegiatan dipulihkan."); });
  },
  sdTab(d) { S.sdF.tab = d.tab; render(); },
  sdMuatUlang() { S.sdata = null; render(); },
  sdXlsx() {
    const D = S.sdata, nmB = n => (D.butirNama.find(x => x.n === n) || {}).nm || "";
    unduhBlob(UPW_ZIP.xlsx([{ nama: "Data Terkumpul", baris: [["Judul", "Jenis", "Tabel/DED", "Tanggal", "TA", "Pengaju", "NIM/NIP", "Status", "Diverifikasi oleh", "Butir dihitung", "Butir bahan GPM"]]
      .concat(D.kegiatan.map(k => [k.judul, k.jenisLabel, k.tabel, k.tgl, k.ta ? k.ta + "/" + (k.ta + 1) : "", k.olehNama, k.olehUser, k.statusLabel, k.verifNama,
        k.butir.filter(b => b.cara === "dihitung").map(b => b.n + ". " + nmB(b.n)).join("; "), k.butir.filter(b => b.cara !== "dihitung").map(b => b.n + ". " + nmB(b.n)).join("; ")])) },
      { nama: "Terhapus", baris: [["Judul", "Jenis", "Tanggal", "Pengaju", "Dihapus", "Oleh", "Alasan"]].concat(D.terhapus.map(k => [k.judul, k.jenisLabel, k.tgl, k.olehNama, k.waktuHapus.slice(0, 10), k.dihapusOleh, k.alasan])) }]),
      "Data Terkumpul " + new Date().toISOString().slice(0, 10) + ".xlsx");
  },
  async fotoHapus() {
    if (!confirm("Hapus foto profil?")) return;
    jalankan(async () => { await api("foto.hapus"); S.fotoSaya = { foto: "", kecil: "" }; ls.set("foto:" + S.pengguna.id, null); S.dirFoto = null; toast("Foto profil dihapus."); });
  }
});

/* --- Penilaian (v0.12.0) --- */
const CARA_L = { a: "Otomatis dari data", m: "Penilaian GPM (rubrik)", c: "Data + penilaian GPM" };
const warnaSkor = s => s >= 3.5 ? "var(--ok)" : s >= 2.5 ? "var(--brand)" : s >= 1.5 ? "var(--warn)" : "var(--bad)";
const angkaId2 = (x, d = 2) => Number(x).toLocaleString("id-ID", { maximumFractionDigits: d });
function hPenilaian() {
  if (!S.nilai) { sekali("nilai", async () => { S.nilai = await api("penilaian.data", S.nilaiTs ? { ts: S.nilaiTs } : {}); render(); }); return `<div class="memuat">Menghitung penilaian…</div>`; }
  const P = S.nilai, p = P.total / 400, f = S.nilaiF, dis = S.sibuk ? "disabled" : "";
  const th = new Date().getFullYear(), pil = []; for (let a = th; a >= 2018; a--) pil.push(a);
  const top = P.rows.filter(r => r.gain > 0.05).sort((a, b) => b.gain - a.gain).slice(0, 8);
  const rows = P.rows.filter(r => !f || (f === "rendah" ? r.skor < 3 : f === "gpm" ? r.perluGpm && r.gpm === null : f === "kurang" ? r.kurang : r.k === f));
  return `<div class="head"><div><h1>Penilaian</h1><p>Simulasi penilaian mandiri mengikuti Matriks Penilaian LAMWisata IAPS 1.0 Unggul Sarjana Terapan: 84 butir berbobot (total bobot 100), skor 0–4, nilai maksimum 400. Butir otomatis dihitung dari data aplikasi; butir lain dinilai GPM/Admin/KPS dengan rubrik.</p></div>
    <div class="row" style="flex-wrap:wrap"><label class="row small" style="gap:6px">TS <select id="nilaiTs" style="width:auto">${pil.map(a => `<option value="${a}" ${a === P.ts.awal ? "selected" : ""}>${a}/${a + 1}</option>`).join("")}</select></label><button class="btn" data-act="nilaiXlsx" ${dis}>Ekspor Excel</button></div></div>
   <div class="grid g3">
    <div class="panel stat"><span class="l">Nilai simulasi TS ${esc(P.ts.label)}</span><span class="v num" style="font-size:2.1rem">${angkaId2(P.total, 1)}<span class="muted" style="font-size:1rem"> / 400</span></span><div class="bar" style="margin-top:6px"><i style="width:${(p * 100).toFixed(1)}%"></i></div><span class="l num">${angkaId2(p * 100, 1)}% dari nilai maksimum</span></div>
    <div class="panel stat"><span class="l">Target</span><span class="v num">${angkaId2(P.target, 1)}</span><span class="l">${P.total >= P.target ? `<b style="color:var(--ok)">Sudah mencapai target</b>` : `Kurang <b class="num" style="color:var(--warn)">${angkaId2(P.target - P.total, 1)}</b> poin`}</span>
     ${P.bolehTarget ? `<div class="row small" style="margin-top:6px;flex-wrap:nowrap"><input id="nilaiTarget" type="text" inputmode="decimal" value="${String(P.target).replace(".", ",")}" style="width:80px" aria-label="Target nilai"><button class="btn sm" data-act="nilaiTargetSimpan" ${dis}>Ubah target</button></div>` : ""}</div>
    <div class="panel stat"><span class="l">Kelengkapan</span><span class="small"><b>${P.belumGpm}</b> butir belum dinilai GPM · <b>${P.kurangData}</b> butir otomatis datanya belum lengkap</span>
     <span class="small muted">${P.rows.filter(r => r.t === "a").length} otomatis · ${P.rows.filter(r => r.t === "c").length} gabungan · ${P.rows.filter(r => r.t === "m").length} GPM · NDTPS ${P.ringkas.NDTPS} · mahasiswa aktif ${P.ringkas.NM}</span></div></div>
   <div class="callout">Perkiraan internal, bukan nilai resmi asesor. Butir yang belum dinilai atau datanya belum lengkap dihitung 0, jadi nilai akan naik setelah data dilengkapi. Ambang peringkat Unggul tidak tercantum di DED/Matriks; target mengacu PerBAN-PT 17/2025 dan bisa diubah Admin. Beberapa rumus memakai tafsiran yang ditulis pada keterangan butir.</div>
   <section class="panel"><h2>Capaian per kriteria</h2><div class="list">${P.kriteria.map(k => { const q = k.maks ? k.nilai / k.maks : 0; return `<div class="item"><div class="body"><div class="row" style="justify-content:space-between"><b>${esc(k.l)}</b><span class="num small">${angkaId2(k.nilai, 1)} / ${angkaId2(k.maks, 1)} · <b>${angkaId2(q * 100, 0)}%</b></span></div><div class="bar ${q < 0.75 ? "gold" : ""}" style="margin-top:6px"><i style="width:${(q * 100).toFixed(1)}%"></i></div><div class="small muted" style="margin-top:2px">Bobot ${angkaId2(k.bobot, 3)}</div></div></div>`; }).join("")}</div></section>
   <section class="panel"><h2>Prioritas perbaikan</h2><p class="small muted" style="margin-bottom:8px">Diurutkan dari potensi kenaikan nilai terbesar: bobot × (4 − skor saat ini).</p>
    <div class="list">${top.map(r => `<div class="item" style="cursor:pointer" data-act="gpmBuka" data-n="${r.n}"><div class="body"><div class="title">${r.n}. ${esc(r.nm)} <span class="tag">${esc(P.kriteria.find(k => k.k === r.k).l)}</span></div><div class="meta"><span class="num">Skor ${angkaId2(r.skor)}</span><span class="num">Bobot ${angkaId2(r.w, 3)}</span><span>${esc(r.info)}</span></div><div class="small" style="margin-top:6px"><b>Agar skor 4:</b> ${esc(r.s4)}</div><div class="small" style="margin-top:4px;color:var(--brand)"><b>Saran:</b> ${esc(r.sr)}</div></div><div style="text-align:right"><div class="num" style="font-weight:800;color:var(--warn)">+${angkaId2(r.gain)}</div><div class="small muted">poin</div></div></div>`).join("") || `<div class="empty">Semua butir sudah skor 4.</div>`}</div></section>
   <section class="panel"><div class="row" style="justify-content:space-between;margin-bottom:10px;flex-wrap:wrap"><h2>84 butir</h2>
    <select id="nilaiF" style="width:auto" aria-label="Saring butir"><option value="">Semua butir</option><option value="gpm" ${f === "gpm" ? "selected" : ""}>Belum dinilai GPM</option><option value="kurang" ${f === "kurang" ? "selected" : ""}>Data belum lengkap</option><option value="rendah" ${f === "rendah" ? "selected" : ""}>Skor di bawah 3</option>${P.kriteria.map(k => `<option value="${k.k}" ${f === k.k ? "selected" : ""}>${esc(k.l)}</option>`).join("")}</select></div>
    <div class="tbl-wrap"><table><thead><tr><th>No</th><th>Butir</th><th>Bobot</th><th>Skor</th><th>Nilai</th><th>Cara</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td class="num">${r.n}</td><td style="min-width:260px"><b>${esc(r.nm)}</b><div class="small ${r.kurang ? "" : "muted"}" ${r.kurang ? 'style="color:var(--warn)"' : ""}>${esc(r.info)}</div>${r.catatan ? `<div class="small" style="margin-top:2px">Catatan GPM: ${esc(r.catatan)}</div>` : ""}
      <details class="small" style="margin-top:4px"><summary style="cursor:pointer;color:var(--brand)">Syarat skor 4 dan saran</summary><p style="margin-top:4px">${esc(r.s4)}</p><p style="margin-top:4px"><b>Saran:</b> ${esc(r.sr)}</p><p class="muted" style="margin-top:4px">Sumber: ${esc(r.src)} · DED butir ${r.ded}</p></details></td>
      <td class="num">${angkaId2(r.w, 3)}</td><td class="num" style="font-weight:800;color:${warnaSkor(r.skor)}">${angkaId2(r.skor)}</td><td class="num">${angkaId2(r.nilai)}</td>
      <td class="small">${CARA_L[r.t]}<br><button class="btn sm" data-act="sumberBuka" data-n="${r.n}" style="margin-top:4px">Sumber data</button>${r.perluGpm ? `<br>GPM: <b>${r.gpm === null ? "belum" : angkaId2(r.gpm)}</b>${r.auto !== null ? ` · data: ${angkaId2(r.auto)}` : ""}<br><button class="btn sm" data-act="gpmBuka" data-n="${r.n}" style="margin-top:4px">${r.gpm === null ? "Nilai" : "Ubah"}</button>` : ""}</td></tr>`).join("")}
    </tbody></table></div></section>`;
}
function laciGpm() {
  const r = S.nilai.rows.find(x => x.n === S.laci.n);
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Nilai butir" style="width:min(620px,100%)">
   <div class="dh"><h2>Butir ${r.n}. ${esc(r.nm)}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   <div class="small muted">Bobot ${angkaId2(r.w, 3)} · ${CARA_L[r.t]} · DED butir ${r.ded} · Sumber: ${esc(r.src)}</div>
   <div class="callout"><b>Agar skor 4:</b> ${esc(r.s4)}<div style="margin-top:6px"><b>Saran:</b> ${esc(r.sr)}</div></div>
   ${r.auto !== null ? `<div class="auto">Bagian otomatis: <b>${angkaId2(r.auto)}</b>. ${esc(r.info.split("; skor GPM")[0])}</div>` : ""}
   ${r.perluGpm ? `<div class="field"><label for="gpmSkor">Skor GPM (0–4) sesuai rubrik Matriks</label><select id="gpmSkor"><option value="">– belum dinilai –</option>${[4, 3, 2, 1, 0].map(v => `<option value="${v}" ${r.gpm === v ? "selected" : ""}>${v}</option>`).join("")}</select></div>
    <div class="field"><label for="gpmCatatan">Catatan / bukti yang dinilai</label><textarea id="gpmCatatan" rows="4" placeholder="Contoh: SPMI memenuhi aspek 1–4; benchmarking eksternal belum ada.">${esc(r.catatan)}</textarea></div>
    ${r.olehGpm ? `<p class="small muted">Terakhir dinilai ${esc(namaPendek(r.olehGpm))}, ${tgl(r.waktuGpm)}.</p>` : ""}
    ${galatHtml()}<div class="row" style="justify-content:flex-end;margin-top:auto">${tombol("gpmSimpan", "Simpan skor")}</div>` : `<p class="small">Butir ini dihitung otomatis. Untuk menaikkan skor, lengkapi atau perbaiki datanya (lihat keterangan).</p>`}</div></div>`;
}
Object.assign(AKSI, {
  gpmBuka(d) { S.laci = { jenis: "gpm", n: Number(d.n) }; S.galat = ""; render(); },
  gpmSimpan() {
    const n = S.laci.n, skor = $("gpmSkor").value, catatan = $("gpmCatatan").value, ts = S.nilai.ts.awal;
    jalankan(async () => { await api("penilaian.skor", { ts, butir: n, skor, catatan }); S.nilaiTs = ts; S.nilai = null; S.laci = null; toast("Skor butir " + n + " tersimpan."); });
  },
  nilaiTargetSimpan() {
    const t = Number(String($("nilaiTarget").value).replace(",", "."));
    jalankan(async () => { await api("penilaian.target", { target: t }).catch(e => { toast(e.message); throw e; }); S.nilaiTs = S.nilai.ts.awal; S.nilai = null; toast("Target diubah."); });
  },
  nilaiXlsx() {
    const P = S.nilai, kr = k => P.kriteria.find(x => x.k === k).l;
    const ring = [["Simulasi penilaian LAMWisata IAPS 1.0 Unggul — Prodi Usaha Perjalanan Wisata"], ["TS", P.ts.label], ["Nilai", P.total], ["Target", P.target], ["Dihitung", tglCetak()],
      ["Catatan", "Perkiraan internal, bukan nilai resmi asesor. Butir belum dinilai/data belum lengkap dihitung 0."], [], ["Kriteria", "Bobot", "Nilai", "Maksimum", "Capaian (%)"],
      ...P.kriteria.map(k => [k.l, k.bobot, k.nilai, k.maks, k.maks ? Math.round(k.nilai / k.maks * 1000) / 10 : 0])];
    const bt = [["No", "Kriteria", "Butir", "Bobot", "Cara", "Skor otomatis", "Skor GPM", "Skor", "Nilai", "Potensi kenaikan", "Keterangan", "Catatan GPM", "Syarat skor 4", "Saran", "DED butir"]]
      .concat(P.rows.map(r => [r.n, kr(r.k), r.nm, r.w, CARA_L[r.t], r.t === "a" ? r.skor : r.auto ?? "", r.gpm ?? "", r.skor, r.nilai, r.gain, r.info, r.catatan, r.s4, r.sr, r.ded]));
    unduh(UPW_ZIP.xlsx([{ nama: "Ringkasan", baris: ring }, { nama: "84 butir", baris: bt }]), "Simulasi penilaian TS " + P.ts.label.replace("/", "-") + ".xlsx");
  }
});
document.addEventListener("change", e => {
  if (e.target.id === "nilaiTs") { S.nilaiTs = Number(e.target.value); S.nilai = null; render(); }
  if (e.target.id === "nilaiF") { S.nilaiF = e.target.value; render(); }
});

/* --- Survei (v0.11.0) --- */
const ST_SV = { draf: ["Draf", "s-draf"], dibuka: ["Dibuka", "s-disetujui"], terjadwal: ["Terjadwal", "s-diajukan"], ditutup: ["Ditutup", "s-draf"] };
const TIPE_L = { likert: "Skala 4 (Kurang–Sangat baik)", pilihan: "Pilihan ganda", centang: "Kotak centang", singkat: "Isian singkat", paragraf: "Paragraf" };
const tautanSurvei = kode => location.origin + location.pathname + "?survei=" + encodeURIComponent(kode);
function panelSurveiSaya() {
  const l = S.svSaya || [];
  return l.length ? `<section class="panel" style="border-color:var(--gold)"><h2>Survei terbuka untuk Anda (${l.length})</h2><div class="list">${l.map(s => `<div class="item"><div class="body"><div class="title">${esc(s.judul)}</div>
    <div class="meta"><span>${s.jumlahSoal} pertanyaan</span><span>${s.anonim ? "Anonim: nama Anda tidak disimpan" : "Dengan identitas"}</span>${s.tutup ? `<span>Ditutup ${esc(tglPendek(s.tutup))}</span>` : ""}</div></div>
    <button class="btn primary sm" data-act="svIsiBuka" data-id="${s.id}">Isi sekarang</button></div>`).join("")}</div></section>` : "";
}
/** Formulir jawaban (dipakai pengisian dengan login dan halaman publik). */
function htmlSoal(soal, likert) {
  return soal.map((q, i) => {
    const nm = "sq-" + q.id, w = q.wajib ? wajib : "";
    let isi;
    if (q.t === "likert") isi = `<div class="likert" role="radiogroup" aria-label="${esc(q.teks)}">${likert.map((l, k) => `<label><input type="radio" name="${nm}" value="${k + 1}"><span>${esc(l)}</span></label>`).join("")}</div>`;
    else if (q.t === "pilihan") isi = `<div class="classgrid">${q.opsi.map(o => `<label><input type="radio" name="${nm}" value="${esc(o)}"><span>${esc(o)}</span></label>`).join("")}</div>`;
    else if (q.t === "centang") isi = `<div class="classgrid">${q.opsi.map(o => `<label><input type="checkbox" name="${nm}" value="${esc(o)}"><span>${esc(o)}</span></label>`).join("")}</div>`;
    else if (q.t === "singkat") isi = `<input id="${nm}" type="text" maxlength="300" aria-label="${esc(q.teks)}">`;
    else isi = `<textarea id="${nm}" rows="3" maxlength="3000" aria-label="${esc(q.teks)}"></textarea>`;
    return `<div class="soal"><div class="small"><b>${i + 1}. ${esc(q.teks)}</b>${w}</div>${isi}</div>`;
  }).join("");
}
function kumpulkanJawaban(soal) {
  const j = {};
  soal.forEach((q, i) => {
    const nm = "sq-" + q.id;
    let v;
    if (q.t === "likert" || q.t === "pilihan") { const el = document.querySelector(`input[name="${nm}"]:checked`); v = el ? (q.t === "likert" ? Number(el.value) : el.value) : ""; }
    else if (q.t === "centang") v = [...document.querySelectorAll(`input[name="${nm}"]:checked`)].map(x => x.value);
    else v = ($(nm)?.value || "").trim();
    if (q.wajib && (v === "" || (Array.isArray(v) && !v.length))) { const e = new Error("Pertanyaan " + (i + 1) + " wajib dijawab."); throw e; }
    if (v !== "" && !(Array.isArray(v) && !v.length)) j[q.id] = v;
  });
  return j;
}
/** Kirim jawaban tanpa menggambar ulang formulir saat gagal, agar jawaban yang sudah diisi tidak hilang. */
async function kirimJawaban(act, fn) {
  if (S.sibuk) return;
  const b = document.querySelector(`[data-act="${act}"]`), label = b ? b.textContent : "";
  document.querySelectorAll(".soal").forEach(x => { x.style.outline = ""; });
  S.sibuk = true; if (b) { b.disabled = true; b.textContent = "Mengirim…"; }
  try { await fn(); S.sibuk = false; S.galat = ""; render(); }
  catch (e) {
    S.sibuk = false; if (b) { b.disabled = false; b.textContent = label; }
    const m = /Pertanyaan (\d+)/.exec(e.message), el = m ? document.querySelectorAll(".soal")[Number(m[1]) - 1] : null;
    if (el) { el.style.outline = "2px solid var(--bad)"; el.style.outlineOffset = "4px"; el.scrollIntoView({ block: "center", behavior: "smooth" }); }
    const g = $("svGalat"); if (g) { g.textContent = e.message; g.hidden = false; }
    toast(e.message);
  }
}
function laciSvIsi() {
  const L = S.laci, s = L.s;
  if (!s) return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Isi survei"><div class="memuat">Memuat…</div></div></div>`;
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Isi survei" style="width:min(680px,100%)">
   <div class="dh"><h2>${esc(s.judul)}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   <div class="callout small">${s.anonim ? "Survei ini <b>anonim</b>: nama Anda tidak disimpan bersama jawaban. Aplikasi hanya mencatat bahwa Anda sudah mengisi agar tidak terisi dua kali." : "Survei ini <b>dengan identitas</b>: jawaban tersimpan bersama nama akun Anda."}${s.tutup ? " Ditutup " + esc(tglPanjang(s.tutup)) + "." : ""}</div>
   ${htmlSoal(s.soal, s.likert)}<p id="svGalat" class="galat" role="alert" hidden></p><div class="row" style="justify-content:flex-end;margin-top:auto">${tombol("svIsiKirim", "Kirim jawaban")}</div></div></div>`;
}
function layarSurveiPublik() {
  const P = S.svPub;
  const kepala = `<header><img src="logo.png" alt="Logo Politeknik Pariwisata Bali"><div><b>Prodi Usaha Perjalanan Wisata</b><div class="small muted">Politeknik Pariwisata Bali</div></div></header>`;
  if (P.galat && !P.data) return `<div class="survei-publik">${kepala}<section class="panel"><h1 style="font-size:1.2rem">Survei tidak tersedia</h1><p>${esc(P.galat)}</p></section></div>`;
  if (!P.data) return `<div class="survei-publik">${kepala}<div class="memuat">Memuat survei…</div></div>`;
  if (P.terkirim) return `<div class="survei-publik">${kepala}<section class="panel"><h1 style="font-size:1.3rem">Terima kasih</h1><p>Jawaban Anda untuk survei <b>${esc(P.data.judul)}</b> sudah kami terima. Masukan Anda membantu Prodi UPW meningkatkan mutu lulusan dan layanan.</p></section></div>`;
  const s = P.data;
  return `<div class="survei-publik">${kepala}<section class="panel" style="display:flex;flex-direction:column;gap:12px"><h1 style="font-size:1.3rem">${esc(s.judul)}</h1>
    <p class="small muted">${s.anonim ? "Survei anonim." : "Mohon isi identitas pada pertanyaan yang tersedia."}${s.tutup ? " Survei ditutup " + esc(tglPanjang(s.tutup)) + "." : ""} Skala: 1 Kurang · 2 Cukup · 3 Baik · 4 Sangat baik.</p>
    ${htmlSoal(s.soal, s.likert)}
    <div class="jebakan" aria-hidden="true"><label>Situs web <input id="svSitus" type="text" tabindex="-1" autocomplete="off"></label></div>
    <p id="svGalat" class="galat" role="alert" hidden></p><div class="row" style="justify-content:flex-end">${tombol("svPubKirim", "Kirim jawaban")}</div></section>
    <p class="small muted" style="text-align:center">Repositori Akreditasi UPW · data hanya dipakai untuk penjaminan mutu prodi.</p></div>`;
}
function hSurvei() {
  if (!S.sv) { sekali("sv", async () => { S.sv = await api("survei.daftar"); render(); }); return `<div class="memuat">Memuat survei…</div>`; }
  const V = S.sv, ub = V.bolehUbah, dis = S.sibuk ? "disabled" : "";
  return `<div class="head"><div><h1>Survei</h1><p>Buat survei kepuasan dengan templat sesuai instrumen. Survei bertujuan <b>Tabel 22</b> dan <b>Tabel 11</b> otomatis mengisi Tabel iLKPS pada tahun akademik saat survei dibuka. Responden yang punya akun melihat survei di Beranda; alumni dan pengguna lulusan memakai tautan tanpa login.</p></div>
    ${ub ? `<button class="btn primary" data-act="svBaru">+ Buat survei</button>` : ""}</div>
   <section class="panel"><div class="list">${V.survei.map(s => { const [l, c] = ST_SV[s.statusEfektif] || [s.statusEfektif, "s-draf"], pct = s.target ? Math.min(100, Math.round(s.jumlahJawaban / s.target * 100)) : null;
     return `<div class="item"><div class="body"><div class="row" style="justify-content:space-between;gap:8px"><div class="title">${esc(s.judul)}</div><span class="chip ${c}">${l}</span></div>
      <div class="meta"><span class="tag t">${esc(s.labelTujuan)}</span><span>${s.sasaran.map(x => esc(V.sasaran[x] || x)).join(", ")}</span><span class="num">${s.buka ? esc(tglPendek(s.buka)) : "?"} – ${s.tutup ? esc(tglPendek(s.tutup)) : "?"}</span><span>${s.anonim ? "Anonim" : "Dengan identitas"}</span><span>${s.pertanyaan.length} pertanyaan</span></div>
      ${s.status !== "draf" ? `<div class="small num" style="margin-top:6px">${s.jumlahJawaban} jawaban${s.target ? ` dari ${s.target} sasaran (${pct}%)` : ""}</div>${pct !== null ? `<div class="bar" style="margin-top:4px;max-width:320px"><i style="width:${pct}%"></i></div>` : ""}` : ""}
      <div class="row" style="margin-top:8px;flex-wrap:wrap">
       ${ub ? `<button class="btn sm" data-act="svUbah" data-id="${s.id}" ${dis}>${s.status === "draf" ? "Ubah" : "Ubah judul/tanggal"}</button>` : ""}
       ${ub && s.status === "draf" ? `<button class="btn sm primary" data-act="svStatus" data-id="${s.id}" data-a="buka" ${dis}>Buka survei</button><button class="btn sm bad" data-act="svStatus" data-id="${s.id}" data-a="hapus" ${dis}>Hapus</button>` : ""}
       ${s.status !== "draf" && s.sasaran.includes("publik") ? `<button class="btn sm primary" data-act="svTautan" data-id="${s.id}">Tautan &amp; bagikan</button>` : ""}
       ${s.status !== "draf" ? `<button class="btn sm" data-act="svHasil" data-id="${s.id}" ${dis}>Hasil</button>` : ""}
       ${ub && s.status === "dibuka" ? `<button class="btn sm" data-act="svStatus" data-id="${s.id}" data-a="tutup" ${dis}>Tutup</button>` : ""}
       ${ub && s.status === "ditutup" ? `<button class="btn sm" data-act="svStatus" data-id="${s.id}" data-a="buka" ${dis}>Buka lagi</button>` : ""}</div></div></div>`; }).join("")
     || `<div class="empty">Belum ada survei. ${ub ? "Tekan <b>+ Buat survei</b> dan pilih templat." : ""}</div>`}</div></section>
   ${S.laci ? "" : galatHtml()}`;
}
function svBaru(t) { return t ? JSON.parse(JSON.stringify(Object.assign({ buka: "", tutup: "" }, t))) : { judul: "", tujuan: "lainnya", sasaran: [], buka: "", tutup: "", anonim: true, pertanyaan: [] }; }
function laciSvForm() {
  const V = S.sv, f = S.svForm, terkunci = f.status && f.status !== "draf", asp = f.tujuan === "t22" ? V.aspek.t22 : f.tujuan === "t11" ? V.aspek.t11 : [], dis = terkunci ? "disabled" : "";
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Survei" style="width:min(760px,100%)">
   <div class="dh"><h2>${f.id ? "Ubah survei" : "Buat survei"}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   ${terkunci ? `<div class="callout small">Survei sudah dibuka: hanya <b>judul</b> dan <b>tanggal ditutup</b> yang bisa diubah, agar jawaban yang sudah masuk tetap sebanding.</div>`
     : `<div class="picker"><b>Mulai dari templat sesuai instrumen</b><div class="row small" style="flex-wrap:wrap">${Object.entries(V.templat).map(([k, t]) => `<button class="btn sm" data-act="svTemplat" data-k="${k}">${esc(V.tujuan[t.tujuan] || t.judul)}</button>`).join("")}</div>
       <span class="hint">Templat memakai skala Kurang–Cukup–Baik–Sangat baik dan aspek sesuai Tabel iLKPS, sehingga hasilnya langsung terhitung. Memilih templat mengganti pertanyaan yang ada.</span></div>`}
   <div class="field"><label for="svJudul">Judul survei${wajib}</label><input id="svJudul" data-svf="judul" type="text" value="${esc(f.judul)}" placeholder="Contoh: Kepuasan mahasiswa Ganjil 2026/2027"></div>
   <div class="grid g3" style="gap:10px"><div class="field"><label for="svTujuan">Dipakai untuk</label><select id="svTujuan" data-svs="tujuan" ${dis}>${Object.entries(V.tujuan).map(([k, l]) => `<option value="${k}" ${f.tujuan === k ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>
    <div class="field"><label for="svBuka">Dibuka</label><input id="svBuka" data-svf="buka" type="date" value="${esc(f.buka || "")}" ${dis}></div>
    <div class="field"><label for="svTutup">Ditutup${wajib}</label><input id="svTutup" data-svf="tutup" type="date" value="${esc(f.tutup || "")}"></div></div>
   <div class="field"><span style="font-weight:600;font-size:.82rem">Sasaran responden${wajib}</span><div class="classgrid">${Object.entries(V.sasaran).map(([k, l]) => `<label><input type="checkbox" data-svsas="${k}" ${f.sasaran.includes(k) ? "checked" : ""} ${dis}><span>${esc(l)}</span></label>`).join("")}</div></div>
   <label class="row small" style="gap:8px;flex-wrap:nowrap"><input type="checkbox" data-svcek="anonim" ${f.anonim ? "checked" : ""} ${dis} style="flex:none"><span>Jawaban anonim (nama responden tidak disimpan)</span></label>
   <div class="picker"><b>Pertanyaan (${f.pertanyaan.length})</b>
    ${f.pertanyaan.map((q, i) => `<div class="soal"><div class="row" style="justify-content:space-between;flex-wrap:wrap"><span class="small muted">${i + 1}. ${TIPE_L[q.t]}</span>
      ${terkunci ? "" : `<div class="row"><button class="btn sm" data-act="svNaik" data-i="${i}" ${i ? "" : "disabled"} aria-label="Naikkan">↑</button><button class="btn sm" data-act="svTurun" data-i="${i}" ${i < f.pertanyaan.length - 1 ? "" : "disabled"} aria-label="Turunkan">↓</button><button class="btn sm bad" data-act="svHapusQ" data-i="${i}">Hapus</button></div>`}</div>
      <input type="text" data-svq="${i}" value="${esc(q.teks)}" placeholder="Tulis pertanyaan" aria-label="Pertanyaan ${i + 1}" ${dis}>
      ${q.t === "pilihan" || q.t === "centang" ? `<textarea data-svo="${i}" rows="3" placeholder="Satu pilihan per baris" aria-label="Pilihan jawaban ${i + 1}" ${dis}>${esc((q.opsi || []).join("\n"))}</textarea>` : ""}
      <div class="row small" style="flex-wrap:wrap;gap:12px"><label class="row" style="gap:6px"><input type="checkbox" data-svw="${i}" ${q.wajib ? "checked" : ""} ${dis}> Wajib</label>
       ${q.t === "likert" && asp.length ? `<label class="row" style="gap:6px">Aspek <select data-sva="${i}" style="width:auto" ${dis}><option value="">– tidak dihitung –</option>${asp.map((a, k) => `<option value="${k}" ${q.aspek === k ? "selected" : ""}>${esc(a)}</option>`).join("")}</select></label>` : ""}
       ${q.t === "singkat" && f.tujuan === "t11" ? `<label class="row" style="gap:6px"><input type="checkbox" data-svth="${i}" ${q.peran === "tahunLulus" ? "checked" : ""} ${dis}> Ini pertanyaan tahun lulus alumni (Ref 11a)</label>` : ""}</div></div>`).join("")}
    ${terkunci ? "" : `<div class="row small" style="flex-wrap:wrap">Tambah: ${Object.entries(TIPE_L).map(([k, l]) => `<button class="btn sm" data-act="svTambahQ" data-t="${k}">${l.split(" (")[0]}</button>`).join("")}</div>`}</div>
   ${galatHtml()}<div class="row" style="justify-content:flex-end;margin-top:auto">${tombol("svSimpan", f.id ? "Simpan" : "Simpan draf")}</div></div></div>`;
}
function laciSvTautan() {
  const s = S.sv.survei.find(x => x.id === S.laci.id), url = tautanSurvei(s.kode);
  const pesan = `Yth. Bapak/Ibu, mohon kesediaannya mengisi survei "${s.judul}" dari Prodi Usaha Perjalanan Wisata, Politeknik Pariwisata Bali${s.tutup ? " sebelum " + tglPanjang(s.tutup) : ""}: ${url}`;
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Tautan survei" style="width:min(620px,100%)">
   <div class="dh"><h2>Tautan &amp; bagikan</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   <p class="small">${esc(s.judul)}</p>
   <div class="field"><label for="svUrl">Tautan survei (tanpa login)</label><div class="row" style="flex-wrap:nowrap"><input id="svUrl" type="text" readonly value="${esc(url)}" class="mono"><button class="btn" data-act="svSalin">Salin</button></div>
    <span class="hint">Siapa pun yang memegang tautan bisa mengisi selama survei dibuka${s.tutup ? " (sampai " + esc(tglPanjang(s.tutup)) + ")" : ""}. Setelah ditutup, tautan menampilkan pesan bahwa survei sudah ditutup.</span></div>
   <div class="field"><label for="svPesan">Contoh pesan</label><textarea id="svPesan" rows="4" readonly>${esc(pesan)}</textarea></div>
   <div class="row" style="flex-wrap:wrap"><a class="btn primary" href="https://wa.me/?text=${encodeURIComponent(pesan)}" target="_blank" rel="noopener noreferrer">Bagikan lewat WhatsApp</a><a class="btn" href="mailto:?subject=${encodeURIComponent("Survei " + s.judul)}&body=${encodeURIComponent(pesan)}">Kirim lewat email</a><a class="btn" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Buka pratinjau</a></div></div></div>`;
}
function laciSvHasil() {
  const H = S.laci.h;
  if (!H) return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Hasil survei"><div class="memuat">Memuat hasil…</div></div></div>`;
  const s = H.survei, ub = S.sv ? S.sv.bolehUbah : false;
  const isi = H.rekap.map((q, i) => {
    let b;
    if (q.t === "likert") b = q.hitung.map((n, k) => ({ l: H.likert[k], n })).reverse().map(x => `<div class="batang"><span style="width:84px">${esc(x.l)}</span><div class="bar"><i style="width:${q.n ? x.n / q.n * 100 : 0}%"></i></div><span class="num" style="width:74px;text-align:right">${x.n} (${q.n ? Math.round(x.n / q.n * 100) : 0}%)</span></div>`).join("")
      + `<div class="small muted">Rata-rata ${q.rata != null ? q.rata.toLocaleString("id-ID") : "–"} dari 4${q.aspek != null && H.aspek.length ? " · aspek " + esc(H.aspek[q.aspek]) : ""}</div>`;
    else if (q.hitung) b = q.hitung.map(x => `<div class="batang"><span style="width:140px">${esc(x.opsi)}</span><div class="bar"><i style="width:${q.n ? x.n / q.n * 100 : 0}%"></i></div><span class="num" style="width:40px;text-align:right">${x.n}</span></div>`).join("");
    else b = q.teksJawaban.length ? `<details><summary class="small" style="cursor:pointer">${q.teksJawaban.length} jawaban</summary><ul class="small" style="margin:6px 0 0 18px;padding:0">${q.teksJawaban.map(v => `<li>${esc(v)}</li>`).join("")}</ul></details>` : `<span class="small muted">Belum ada jawaban.</span>`;
    return `<div class="soal"><div class="small"><b>${i + 1}. ${esc(q.teks)}</b> <span class="muted">(${q.n} jawaban)</span></div>${b}</div>`;
  }).join("");
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Hasil survei" style="width:min(760px,100%)">
   <div class="dh"><h2>Hasil: ${esc(s.judul)}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   <div class="row" style="justify-content:space-between;flex-wrap:wrap"><span class="small"><b>${s.jumlahJawaban}</b> jawaban${s.target ? ` dari ${s.target} sasaran` : ""} · ${esc(s.labelTujuan)}</span><button class="btn sm" data-act="svXlsx">Ekspor Excel</button></div>
   ${isi}
   ${H.aspek.length ? `<div class="picker"><b>Rencana tindak lanjut per aspek</b> <span class="small muted">(kolom terakhir Tabel ${s.tujuan === "t22" ? "22" : "11"})</span>
     ${H.aspek.map((a, k) => `<div class="field"><label for="svTl${k}" class="small">${esc(a)}</label><textarea id="svTl${k}" rows="2" ${ub ? "" : "disabled"}>${esc((s.tindakLanjut || {})[k] || "")}</textarea></div>`).join("")}
     ${ub ? `<div class="row" style="justify-content:flex-end">${tombol("svTlSimpan", "Simpan tindak lanjut")}</div>` : ""}</div>` : ""}
   ${galatHtml()}</div></div>`;
}
const svF = () => S.svForm;
Object.assign(AKSI, {
  async svIsiBuka(d) {
    S.laci = { jenis: "svIsi", id: d.id }; S.galat = ""; render();
    try { const j = await api("survei.ambil", { id: d.id }); if (S.laci && S.laci.id === d.id) { S.laci.s = j.survei; render(); } }
    catch (e) { S.laci = null; S.svSaya = null; render(); toast(e.message); }
  },
  svIsiKirim() {
    const id = S.laci.s.id, soal = S.laci.s.soal;
    kirimJawaban("svIsiKirim", async () => { const jawaban = kumpulkanJawaban(soal); await api("survei.jawab", { id, jawaban }); S.laci = null; S.svSaya = null; toast("Terima kasih, jawaban Anda tersimpan."); });
  },
  svPubKirim() {
    kirimJawaban("svPubKirim", async () => { const jawaban = kumpulkanJawaban(S.svPub.data.soal); await api("survei.jawabPublik", { kode: S.svPub.kode, jawaban, situs: $("svSitus")?.value || "" }); S.svPub.terkirim = true; window.scrollTo(0, 0); });
  },
  svBaru() { S.svForm = svBaru(); S.laci = { jenis: "svForm" }; S.galat = ""; render(); fokus("svJudul"); },
  svUbah(d) { S.svForm = JSON.parse(JSON.stringify(S.sv.survei.find(s => s.id === d.id))); S.laci = { jenis: "svForm" }; S.galat = ""; render(); },
  svTemplat(d) {
    if (svF().pertanyaan.length && !confirm("Ganti pertanyaan yang ada dengan templat?")) return;
    const f = svF(), t = svBaru(S.sv.templat[d.k]); t.buka = f.buka; t.tutup = f.tutup; t.id = f.id; S.svForm = t; render();
  },
  svTambahQ(d) { svF().pertanyaan.push({ t: d.t, teks: "", wajib: d.t === "likert", opsi: d.t === "pilihan" || d.t === "centang" ? [] : undefined }); render(); const el = document.querySelectorAll("[data-svq]"); if (el.length) el[el.length - 1].focus(); },
  svHapusQ(d) { svF().pertanyaan.splice(Number(d.i), 1); render(); },
  svNaik(d) { const a = svF().pertanyaan, i = Number(d.i); [a[i - 1], a[i]] = [a[i], a[i - 1]]; render(); },
  svTurun(d) { const a = svF().pertanyaan, i = Number(d.i); [a[i + 1], a[i]] = [a[i], a[i + 1]]; render(); },
  svSimpan() {
    const f = svF(), data = JSON.parse(JSON.stringify(f));
    jalankan(async () => { const j = await api("survei.simpan", { data }); S.laci = null; S.svForm = null; S.sv = null; S.ilkps = null; toast(f.id ? "Survei disimpan." : "Draf survei tersimpan. Tekan Buka survei bila sudah siap."); });
  },
  svStatus(d) {
    const pesan = { buka: "Buka survei ini? Responden sasaran akan melihatnya; setelah dibuka, pertanyaan tidak bisa diubah.", tutup: "Tutup survei ini sekarang?", hapus: "Hapus draf survei ini?" }[d.a];
    if (!confirm(pesan)) return;
    jalankan(async () => { await api("survei.status", { id: d.id, aksi: d.a }).catch(e => { toast(e.message); throw e; }); S.sv = null; S.svSaya = null; S.ilkps = null; toast({ buka: "Survei dibuka.", tutup: "Survei ditutup.", hapus: "Draf dihapus." }[d.a]); });
  },
  svTautan(d) { S.laci = { jenis: "svTautan", id: d.id }; render(); },
  svSalin() { const v = $("svUrl").value; navigator.clipboard?.writeText(v).then(() => toast("Tautan disalin."), () => { $("svUrl").select(); toast("Pilih tautan lalu salin manual."); }); },
  async svHasil(d) {
    S.laci = { jenis: "svHasil", id: d.id }; S.galat = ""; render();
    try { const h = await api("survei.hasil", { id: d.id }); if (S.laci && S.laci.id === d.id) { S.laci.h = h; render(); } } catch (e) { S.laci = null; render(); toast(e.message); }
  },
  svTlSimpan() {
    const H = S.laci.h, data = {}; H.aspek.forEach((_, k) => { data[k] = $("svTl" + k).value; });
    jalankan(async () => { await api("survei.tindakLanjut", { id: H.survei.id, data }); H.survei.tindakLanjut = data; S.ilkps = null; toast("Rencana tindak lanjut tersimpan."); });
  },
  svXlsx() {
    const H = S.laci.h, s = H.survei;
    const rk = [["No", "Pertanyaan", "Jenis", "Jumlah jawaban", ...H.likert.slice().reverse(), "Rata-rata"]].concat(H.rekap.map((q, i) => q.t === "likert" ? [i + 1, q.teks, "Skala 4", q.n, ...q.hitung.slice().reverse(), q.rata ?? ""] : [i + 1, q.teks, TIPE_L[q.t], q.n]));
    const soal = s.pertanyaan, mentah = [["Waktu", ...soal.map((q, i) => (i + 1) + ". " + q.teks)]].concat(H.jawaban.map(r => [new Date(r.waktu).toLocaleString("id-ID"), ...soal.map(q => { const v = r.jawaban[q.id]; return Array.isArray(v) ? v.join("; ") : v ?? ""; })]));
    const lembar = [{ nama: "Rekap", baris: [[s.judul], [s.labelTujuan + " · " + s.jumlahJawaban + " jawaban · " + (s.anonim ? "anonim" : "dengan identitas")], [], ...rk] }];
    if (H.jawaban.length) lembar.push({ nama: "Jawaban", baris: mentah });
    unduh(UPW_ZIP.xlsx(lembar), "Survei - " + namaBerkas(s.judul) + ".xlsx");
  }
});
document.addEventListener("input", e => {
  const t = e.target, f = S.svForm; if (!f || !S.laci || S.laci.jenis !== "svForm") return;
  if (t.dataset.svf) f[t.dataset.svf] = t.value;
  else if (t.dataset.svq !== undefined) f.pertanyaan[+t.dataset.svq].teks = t.value;
  else if (t.dataset.svo !== undefined) f.pertanyaan[+t.dataset.svo].opsi = t.value.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
});
document.addEventListener("change", e => {
  const t = e.target, f = S.svForm; if (!f || !S.laci || S.laci.jenis !== "svForm") return;
  if (t.dataset.svf) f[t.dataset.svf] = t.value;
  if (t.dataset.svs) { f[t.dataset.svs] = t.value; render(); }
  if (t.dataset.svsas) { f.sasaran = t.checked ? [...f.sasaran, t.dataset.svsas] : f.sasaran.filter(x => x !== t.dataset.svsas); }
  if (t.dataset.svcek) f[t.dataset.svcek] = t.checked;
  if (t.dataset.svw !== undefined) f.pertanyaan[+t.dataset.svw].wajib = t.checked;
  if (t.dataset.sva !== undefined) { const q = f.pertanyaan[+t.dataset.sva]; if (t.value === "") delete q.aspek; else q.aspek = Number(t.value); }
  if (t.dataset.svth !== undefined) { const q = f.pertanyaan[+t.dataset.svth]; if (t.checked) q.peran = "tahunLulus"; else delete q.peran; }
});

/* --- Tabel iLKPS (v0.7.0) --- */
const tautanKeg = id => location.origin + location.pathname + "?keg=" + encodeURIComponent(id);
const tautanCek = kode => location.origin + location.pathname + "?cek=" + encodeURIComponent(kode);
function hIlkps() {
  if (!S.ilkps) {
    sekali("ilkps", async () => { S.ilkps = await api("ilkps.data", S.ilkpsTs ? { ts: S.ilkpsTs } : {}); render(); });
    return `<div class="memuat">Menyusun tabel…</div>`;
  }
  const D = S.ilkps, t = D.tabel.find(x => x.kode === S.ilkpsTab) || D.tabel[0], dis = S.sibuk ? "disabled" : "";
  const thnKini = new Date().getFullYear(), pilihan = []; for (let a = thnKini; a >= 2018; a--) pilihan.push(a);
  const isiTabel = t.bentuk === "daftar"
    ? (t.baris.length ? `<div class="tbl-wrap"><table><thead><tr>${t.kolom.map(k => `<th>${esc(k)}</th>`).join("")}</tr></thead><tbody>${t.baris.map((r, i) => `<tr ${t.id ? `style="cursor:pointer" data-act="bukaKeg" data-id="${t.id[i]}"` : ""}>${r.map(v => `<td class="small">${esc(typeof v === "number" ? v.toLocaleString("id-ID") : v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`
      : `<div class="empty">${t.id ? "Belum ada kegiatan disetujui untuk tabel ini pada rentang TS." : "Belum ada data. Lengkapi di menu Data Prodi atau biodata dosen."}</div>`)
    : `<div class="tbl-wrap"><table><thead><tr>${t.kolom.map(k => `<th>${esc(k)}</th>`).join("")}</tr></thead><tbody>${t.baris.map(r => `<tr>${r.map((v, j) => `<td class="small ${j > 1 ? "num" : ""}" ${r[0] === "Jumlah" ? 'style="font-weight:700"' : ""}>${esc(typeof v === "number" ? v.toLocaleString("id-ID") : v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
      ${t.idBaris.some(x => x.length) ? `<details style="margin-top:8px"><summary class="small" style="cursor:pointer">Kegiatan yang dihitung</summary><div class="list" style="margin-top:6px">${t.idBaris.map((ids, i) => ids.map(id => `<div class="item" style="cursor:pointer" data-act="bukaKeg" data-id="${id}"><div class="body small">${esc(t.baris[i][1])}: <span class="mono">${esc(id)}</span> (buka detail)</div></div>`).join("")).join("")}</div></details>` : ""}`;
  return `<div class="head"><div><h1>Tabel iLKPS</h1><p>Tabel 1–6 tersusun dari biodata dosen dan <b>Data Prodi</b>; tabel lain dari kegiatan yang datanya sudah <b>disetujui</b> verifikator. Format mengikuti Tabel iLKPS LAMWisata (varian Vokasi untuk Tabel 14 dan 19). Klik baris kegiatan untuk membuka buktinya.</p></div>
     <button class="btn primary" data-act="ilkpsXlsx" ${dis}>Ekspor Excel</button></div>
   <section class="panel"><div class="row" style="flex-wrap:wrap;gap:10px;justify-content:space-between">
     <div><b>TS = ${esc(D.ts.label)}</b> <span class="small muted">· rentang ${D.ts.rentang.map(esc).join(", ")}${D.ts.awal !== D.tsTersimpan ? " · pratinjau (TS tersimpan " + D.tsTersimpan + "/" + (D.tsTersimpan + 1) + ")" : ""}</span></div>
     <div class="row" style="flex-wrap:wrap"><label class="row small" style="gap:6px">Lihat TS <select id="ilkpsTs" style="width:auto">${pilihan.map(a => `<option value="${a}" ${a === D.ts.awal ? "selected" : ""}>${a}/${a + 1}</option>`).join("")}</select></label>
      ${D.bolehAtur && D.ts.awal !== D.tsTersimpan ? tombol("ilkpsSimpanTs", "Tetapkan sebagai TS", "sm") : ""}</div></div>
     <p class="small muted" style="margin-top:6px">${D.jumlahDisetujui} kegiatan disetujui pada rentang ini${D.jumlahProses ? `; <b>${D.jumlahProses}</b> kegiatan lain masih dalam proses (belum dihitung)` : ""}. ${D.bolehAtur ? "TS ditetapkan Admin dan dipakai semua pengguna." : "TS ditetapkan Admin Prodi."}</p></section>
   <section class="panel"><div class="field"><label for="ilkpsTab">Tabel</label><select id="ilkpsTab">${D.tabel.map(x => `<option value="${x.kode}" ${x.kode === t.kode ? "selected" : ""}>${esc(x.judul)} (${x.bentuk === "daftar" ? x.baris.length + " baris" : x.baris[x.baris.length - 1][5] + " judul"})</option>`).join("")}</select></div>
     <h2 style="margin-top:10px">${esc(t.judul)}</h2>
     ${t.proses ? `<div class="callout" style="margin:8px 0">${t.proses} kegiatan jenis ini pada rentang TS masih dalam proses (draf, bukti belum lengkap, atau menunggu verifikasi), jadi belum masuk tabel.</div>` : ""}
     ${isiTabel}${t.catatan ? `<p class="small muted" style="margin-top:6px">${esc(t.catatan)}</p>` : ""}</section>
   ${D.belum.length ? "" : "<!--"}<section class="panel"><h2>Belum diisi otomatis</h2><p class="small muted">Lembar berikut bersumber dari data selain kegiatan dan akan ditambahkan pada rilis berikutnya.</p>
     <div class="tbl-wrap"><table><thead><tr><th>Tabel</th><th>Isi</th><th>Sumber data yang diperlukan</th></tr></thead><tbody>${D.belum.map(r => `<tr>${r.map(v => `<td class="small">${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div></section>${D.belum.length ? "" : "-->"}`;
}
function lembarIlkps(D) {
  const ringkas = [["Tabel iLKPS LAMWisata — Prodi Usaha Perjalanan Wisata, Politeknik Pariwisata Bali"], ["TS", D.ts.label], ["Rentang", D.ts.rentang.join(", ")], ["Disusun", tglCetak()],
    ["Catatan", "Disusun otomatis dari kegiatan yang datanya disetujui di Repositori UPW. Salin nilai ke berkas resmi Tabel iLKPS_Lamwisata.xlsx; kolom 'Tautan bukti' membuka kegiatan di aplikasi (perlu masuk)."], [],
    ["Tabel", "Judul", "Isi"], ...D.tabel.map(t => ["Tabel " + t.kode, t.judul, t.bentuk === "daftar" ? t.baris.length + " baris" : t.baris[t.baris.length - 1][5] + " judul"])];
  const L = [{ nama: "Ringkasan", baris: ringkas }];
  D.tabel.forEach(t => {
    const b = [[t.judul], ["TS = " + D.ts.label + " (" + D.ts.rentang.join(", ") + ")"], []];
    if (t.bentuk === "daftar" && t.id) { b.push([...t.kolom, "Tautan bukti"]); t.baris.forEach((r, i) => b.push([...r, tautanKeg(t.id[i])])); }
    else if (t.bentuk === "daftar") { b.push(t.kolom); t.baris.forEach(r => b.push(r)); }
    else { b.push(t.kolom); t.baris.forEach(r => b.push(r)); }
    if (t.catatan) b.push([], ["Catatan: " + t.catatan]);
    L.push({ nama: "Tabel " + t.kode, baris: b });
  });
  const rinci = [["Tabel", "Baris", "Kode kegiatan", "Tautan bukti"]];
  D.tabel.filter(t => t.bentuk === "hitung").forEach(t => t.idBaris.forEach((ids, i) => ids.forEach(id => rinci.push(["Tabel " + t.kode, t.baris[i][1], id, tautanKeg(id)]))));
  L.push({ nama: "Rincian tabel hitung", baris: rinci });
  return L;
}
Object.assign(AKSI, {
  ilkpsXlsx() { const D = S.ilkps; unduh(UPW_ZIP.xlsx(lembarIlkps(D)), "Tabel iLKPS UPW - TS " + D.ts.label.replace("/", "-") + ".xlsx"); },
  ilkpsSimpanTs() {
    const ts = S.ilkps.ts.awal;
    if (!confirm("Tetapkan TS = " + ts + "/" + (ts + 1) + " untuk semua pengguna?")) return;
    jalankan(async () => { S.ilkps = await api("ilkps.ts", { ts }); S.ilkpsTs = null; toast("TS ditetapkan: " + S.ilkps.ts.label + "."); });
  }
});
document.addEventListener("change", e => {
  if (e.target.id === "ilkpsTab") { S.ilkpsTab = e.target.value; render(); }
  if (e.target.id === "ilkpsTs") { S.ilkpsTs = Number(e.target.value); S.ilkps = null; render(); }
});

/* --- portofolio saya (v0.6.0) --- */
function statusTeks(k) {
  if (k.st !== "tanpa" && k.st !== "terbit") return (ST_L[k.st] || [k.st])[0];
  if (k.status === "draf") return k.st === "terbit" ? `${k.terlambat ? "Bukti terlambat" : "Lengkapi bukti"} ${k.buktiAda}/${k.buktiPerlu}` : "Draf";
  return (STATUS_L[k.status] || [k.status])[0];
}
function perSemester(l) { const g = {}; l.forEach(k => { const s = k.semester || "Tanpa tanggal"; (g[s] = g[s] || []).push(k); }); return Object.entries(g); }
function hPorto() {
  if (!S.porto) { sekali("porto", async () => { S.porto = await api("portofolio.saya"); render(); }); return `<div class="memuat">Memuat portofolio…</div>`; }
  const P = S.porto, l = P.kegiatan, dis = S.sibuk ? "disabled" : "";
  const setuju = l.filter(k => k.status === "disetujui").length, adaBukti = l.filter(k => k.buktiPerlu > 0), lengkap = adaBukti.filter(k => k.buktiLengkap).length;
  const F = S.dokForm;
  return `<div class="head"><div><h1>Portofolio Saya</h1><p>Semua kegiatan yang melibatkan Anda, sebagai pengaju, peserta yang ditandai, atau dosen pendamping, ditambah dokumen pribadi Anda.</p></div>
    <div class="row" style="flex-wrap:wrap"><button class="btn" data-act="portoPdf" ${dis}>PDF portofolio</button><button class="btn" data-act="portoXlsx" ${dis}>Excel</button><button class="btn" data-act="portoZip" ${dis}>Unduh bukti (ZIP)</button></div></div>
   <div class="grid g3">
    <div class="panel stat"><span class="v num">${l.length}</span><span class="l">Kegiatan</span></div>
    <div class="panel stat"><span class="v num">${setuju}</span><span class="l">Data disetujui (masuk akreditasi)</span></div>
    <div class="panel stat"><span class="v num">${lengkap}/${adaBukti.length}</span><span class="l">Kegiatan dengan bukti lengkap</span><div class="bar" style="margin-top:6px"><i style="width:${adaBukti.length ? Math.round(lengkap / adaBukti.length * 100) : 0}%"></i></div></div>
   </div>
   <div class="grid g2">
    <section class="panel"><h2>Kegiatan per semester</h2>${perSemester(l).map(([s, ks]) => `<h3 style="margin:12px 0 4px;color:var(--brand)">${esc(s)}</h3><div class="list">${ks.map(k => `<div class="item" style="cursor:pointer" data-act="bukaKeg" data-id="${k.id}"><div class="body">
       <div class="row" style="justify-content:space-between;gap:8px"><div class="title">${esc(k.judul)}</div>${chipKeg(k)}</div>
       <div class="meta"><span>${esc(k.jenisLabel)}</span><span class="num">${esc(rentangPendek(k.tgl, k.sampai))}</span><span class="tag">${esc(k.peranSaya)}</span></div></div></div>`).join("")}</div>`).join("") || `<div class="empty">Belum ada kegiatan.</div>`}</section>
    <section class="panel"><div class="row" style="justify-content:space-between;margin-bottom:10px"><h2>Dokumen pribadi (${P.dokumen.length})</h2>${F ? "" : `<button class="btn sm" data-act="dokBaru">+ Tambah</button>`}</div>
     ${F ? `<div class="picker" style="margin-bottom:10px">
       <div class="field"><label for="dokNama">Nama dokumen${wajib}</label><input id="dokNama" type="text" placeholder="Contoh: Sertifikat Kompetensi Pemandu Wisata Muda"></div>
       <div class="grid g2" style="gap:10px"><div class="field"><label for="dokJenis">Jenis${wajib}</label><select id="dokJenis"><option value="">Pilih…</option>${P.jenisDok.map(j => `<option>${esc(j)}</option>`).join("")}</select></div>
        <div class="field"><label for="dokTahun">Tahun${wajib}</label><input id="dokTahun" type="text" inputmode="numeric" maxlength="4" value="${new Date().getFullYear()}"></div></div>
       <div class="seg" role="group" aria-label="Bentuk"><button data-act="dokMode" data-m="file" aria-pressed="${F.t === "file"}">File</button><button data-act="dokMode" data-m="tautan" aria-pressed="${F.t === "tautan"}">Tautan</button></div>
       ${F.t === "file" ? `<input id="dokFile" type="file" accept="${TERIMA}" aria-label="Pilih file dokumen"><span class="hint">PDF, gambar, Word, Excel, atau PowerPoint; maks. 10 MB.</span>`
         : `<input id="dokUrl" type="url" placeholder="https://drive.google.com/…" aria-label="Tautan dokumen">`}
       ${galatHtml()}<div class="row" style="justify-content:flex-end">${tombol("dokBatal", "Batal", "")}${tombol("dokSimpan", "Simpan")}</div></div>` : ""}
     <div class="list">${P.dokumen.map(d => `<div class="item bk"><div class="body"><div class="title">${esc(d.nama)}</div><div class="meta"><span>${esc(d.jenis)}</span><span class="num">${esc(d.tahun)}</span><span>${d.t === "file" ? esc(d.namaFile) + " · " + ukuranT(d.ukuran) : "Tautan"}</span></div></div>
       <div class="row bk-aksi"><button class="btn sm" data-act="dokLihat" data-id="${d.id}" ${dis}>${d.t === "tautan" ? "Buka" : "Lihat"}</button><button class="btn sm bad" data-act="dokHapus" data-id="${d.id}" ${dis}>Hapus</button></div></div>`).join("")
       || (F ? "" : `<div class="empty">Belum ada dokumen. Tambahkan sertifikat kompetensi, sertifikat bahasa, pelatihan, atau SK Anda.</div>`)}</div>
    </section></div>`;
}
const tglCetak = () => new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
function identitasPorto(P) {
  const o = P.orang;
  return [["Nama", o.nama], [o.jenis === "mahasiswa" ? "NIM" : "NIP / ID", o.jenis === "mahasiswa" ? o.username : nipTampil(o.username)],
    ...(o.jenis === "mahasiswa" ? [["Kelas", (o.semesterMhs ? "Semester " + o.semesterMhs + " – " : "") + "Kelas " + (o.kelas || "–") + " (masuk " + (o.masuk || "–") + ")"]] : []),
    ["Program studi", "Usaha Perjalanan Wisata, Politeknik Pariwisata Bali"]];
}
function htmlPortoCetak(P) {
  const id = identitasPorto(P), k = P.kegiatan;
  return `<div class="kertas"><p style="text-align:center;font-weight:700;font-size:13pt;margin-bottom:10px">PORTOFOLIO KEGIATAN</p>
    ${tabelBaris(id.map(([a, b]) => [esc(a), esc(b)]))}
    <p style="margin-top:10px">Jumlah kegiatan: <b>${k.length}</b>, data disetujui: <b>${k.filter(x => x.status === "disetujui").length}</b>. Dokumen pribadi: <b>${P.dokumen.length}</b>.</p>
    ${perSemester(k).map(([s, ks]) => `<p style="font-weight:700;margin:14px 0 4px">${esc(s)}</p>
     <table class="lamp"><thead><tr><th>No</th><th>Kegiatan</th><th>Jenis</th><th>Tanggal</th><th>Tingkat</th><th>Peran</th><th>Status</th></tr></thead><tbody>
     ${ks.map((x, n) => `<tr><td class="c">${n + 1}</td><td>${esc(x.judul)}<br><span style="font-size:8.5pt;color:#555"><a href="${esc(tautanKeg(x.id))}">Bukti kegiatan</a>${x.kodeSurat ? ` · Surat ${esc(x.kodeSurat)}: <a href="${esc(tautanCek(x.kodeSurat))}">cek keaslian</a>` : ""}</span></td><td>${esc(x.jenisLabel)}</td><td>${esc(rentangPendek(x.tgl, x.sampai))}</td><td>${esc(x.tingkat || "–")}</td><td>${esc(x.peranSaya)}</td><td>${esc(statusTeks(x))}</td></tr>`).join("")}</tbody></table>`).join("")}
    ${P.dokumen.length ? `<p style="font-weight:700;margin:14px 0 4px">Dokumen pribadi</p><table class="lamp"><thead><tr><th>No</th><th>Dokumen</th><th>Jenis</th><th>Tahun</th></tr></thead><tbody>
     ${P.dokumen.map((d, n) => `<tr><td class="c">${n + 1}</td><td>${esc(d.nama)}</td><td>${esc(d.jenis)}</td><td class="c">${esc(d.tahun)}</td></tr>`).join("")}</tbody></table>` : ""}
    <p style="margin-top:14px;font-size:9pt;color:#555">Dicetak dari Repositori UPW pada ${esc(tglCetak())}. Status "Data disetujui" berarti data dan buktinya sudah diverifikasi prodi. Tautan "Bukti kegiatan" membuka kegiatan dan buktinya di aplikasi (perlu masuk); tautan "cek keaslian" membuka halaman verifikasi surat tanpa masuk.</p></div>`;
}
function lembarPorto(P) {
  const kg = [["No", "Semester", "Judul / nama kegiatan", "Jenis", "Tabel", "Tanggal mulai", "Tanggal selesai", "Tingkat", "Peran saya", "Status", "Kode surat", "Bukti wajib terunggah", "Bukti wajib diperlukan", "Tautan kegiatan dan bukti", "Tautan cek surat tugas"]]
    .concat(P.kegiatan.map((k, n) => [n + 1, k.semester || "", k.judul, k.jenisLabel + (k.jenisLain ? " · " + k.jenisLain : ""), k.tabel || "", k.tgl || "", k.sampai || "", k.tingkat || "", k.peranSaya, statusTeks(k), k.kodeSurat || "", k.buktiAda, k.buktiPerlu, tautanKeg(k.id), k.kodeSurat ? tautanCek(k.kodeSurat) : ""]));
  const bk = [["Kegiatan", "Dokumen", "Bentuk", "Nama file / tautan / keterangan", "Tautan"]];
  P.kegiatan.forEach(k => k.daftarBukti.forEach(b => bk.push([k.judul, b.l, b.t === "file" ? "File" : b.t === "tautan" ? "Tautan" : "Tidak tersedia", b.t === "file" ? b.nama : b.t === "tautan" ? b.url : b.ket, b.t === "tautan" ? b.url : b.t === "file" ? tautanKeg(k.id) : ""])));
  const dk = [["No", "Nama dokumen", "Jenis", "Tahun", "Bentuk", "Nama file / tautan"]].concat(P.dokumen.map((d, n) => [n + 1, d.nama, d.jenis, d.tahun, d.t === "file" ? "File" : "Tautan", d.t === "file" ? d.namaFile : d.url]));
  return [{ nama: "Identitas", baris: [["Keterangan", "Isi"], ...identitasPorto(P), ["Dicetak", tglCetak()]] }, { nama: "Kegiatan", baris: kg }, { nama: "Bukti", baris: bk }, { nama: "Dokumen pribadi", baris: dk }];
}
function unduh(blob, nama) { return simpanBerkas(blob, nama); }
/** Semua unduhan lewat sini (v0.22.0). Di aplikasi terpasang (jendela sendiri), tombol "Buka folder" milik Chrome sering tidak berfungsi
    di macOS; karena itu dibuka jendela "Simpan ke…" agar pengguna memilih foldernya sendiri. Bila tidak tersedia (atau jendela tidak bisa
    muncul), berkas diunduh biasa ke folder Unduhan/Downloads dan letaknya diberitahukan. */
const terpasang = () => { try { return matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: window-controls-overlay)").matches || navigator.standalone === true; } catch (_) { return false; } };
async function simpanBerkas(blob, nama) {
  if (terpasang() && window.showSaveFilePicker) {
    try {
      const eks = (nama.match(/\.[^.]+$/) || [""])[0], tipe = blob.type || "application/octet-stream";
      const h = await window.showSaveFilePicker({ suggestedName: nama, types: eks ? [{ description: "Berkas " + eks.slice(1).toUpperCase(), accept: { [tipe]: [eks] } }] : undefined });
      const w = await h.createWritable(); await w.write(blob); await w.close();
      toast("Tersimpan: " + h.name + " (di folder yang Anda pilih)."); return;
    } catch (e) { if (e && e.name === "AbortError") { toast("Penyimpanan dibatalkan."); return; } }
  }
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = nama; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 120000);
  if (terpasang()) toast("Berkas " + nama + " tersimpan di folder Unduhan (Downloads). Buka lewat Finder › Unduhan.");
}
const namaBerkas = s => String(s || "").replace(/[\\/:*?"<>| -]/g, "_").replace(/\s+/g, " ").trim().slice(0, 80) || "berkas";
const dariBase64 = b => { const s = atob(b), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
const judulPorto = P => "Portofolio " + P.orang.username + " " + namaBerkas(namaPendek(P.orang.nama));
Object.assign(AKSI, {
  dokBaru() { S.dokForm = { t: "file" }; S.galat = ""; render(); fokus("dokNama"); },
  dokBatal() { S.dokForm = null; S.galat = ""; render(); },
  dokMode(d) { const simpan = { nama: $("dokNama")?.value, jenis: $("dokJenis")?.value, tahun: $("dokTahun")?.value }; S.dokForm.t = d.m; render();
    if (simpan.nama != null) { $("dokNama").value = simpan.nama; $("dokJenis").value = simpan.jenis; $("dokTahun").value = simpan.tahun; } },
  async dokSimpan() {
    const data = { nama: $("dokNama").value, jenis: $("dokJenis").value, tahun: $("dokTahun").value };
    if (S.dokForm.t === "tautan") data.tautan = $("dokUrl").value;
    else {
      const f = $("dokFile").files[0];
      if (!f) { S.galat = "Pilih file dokumen, atau pilih Tautan."; render(); return; }
      if (f.size > 10 * 1024 * 1024) { S.galat = "Ukuran file maksimal 10 MB. Untuk file lebih besar, pakai Tautan."; render(); return; }
      data.namaFile = f.name; data.isi = await bacaBase64(f);
    }
    jalankan(async () => { const j = await api("dok.simpan", data); S.porto.dokumen = j.dokumen; S.dokForm = null; toast("Dokumen tersimpan."); });
  },
  dokHapus(d) {
    if (!confirm("Hapus dokumen ini dari portofolio? File dipindahkan ke sampah Drive.")) return;
    jalankan(async () => { const j = await api("dok.hapus", { id: d.id }).catch(e => { toast(e.message); throw e; }); S.porto.dokumen = j.dokumen; toast("Dokumen dihapus."); });
  },
  async dokLihat(d) {
    const x = S.porto.dokumen.find(y => y.id === d.id); if (!x) return;
    if (x.t === "tautan") { window.open(x.url, "_blank", "noopener,noreferrer"); return; }
    const w = window.open("", "_blank");
    try {
      const j = await api("dok.lihat", { id: d.id }), blob = new Blob([dariBase64(j.isi)], { type: j.mime });
      if (w && /pdf|image/.test(j.mime)) { w.location.href = URL.createObjectURL(blob); } else { if (w) w.close(); unduh(blob, j.nama); }
    } catch (e) { if (w) w.close(); toast(e.message); }
  },
  portoPdf() { cetakSurat(htmlPortoCetak(S.porto)); },
  portoXlsx() { const P = S.porto; unduh(UPW_ZIP.xlsx(lembarPorto(P)), judulPorto(P) + ".xlsx"); },
  portoZip() {
    const P = S.porto, tugas = [];
    P.kegiatan.forEach(k => k.daftarBukti.filter(b => b.t === "file").forEach(b => tugas.push({ jenis: "bukti", id: k.id, slot: b.slot,
      jalur: `Kegiatan/${namaBerkas(k.semester || "Tanpa tanggal")}/${namaBerkas((k.tgl || "") + " " + k.judul)}/${namaBerkas(b.l)} - ${namaBerkas(b.nama)}` })));
    P.dokumen.filter(d => d.t === "file").forEach(d => tugas.push({ jenis: "dok", id: d.id, jalur: `Dokumen pribadi/${namaBerkas(d.tahun + " " + d.nama)} - ${namaBerkas(d.namaFile)}` }));
    if (!tugas.length) { toast("Belum ada file bukti atau dokumen untuk diunduh. Tautan dan keterangan tercantum di file Excel."); return; }
    jalankan(async () => {
      const berkas = [], ada = new Set(), gagal = [];
      for (let i = 0; i < tugas.length; i++) {
        const t = tugas[i]; toast(`Mengambil file ${i + 1} dari ${tugas.length}…`);
        try {
          const j = t.jenis === "bukti" ? await api("bukti.lihat", { id: t.id, slot: t.slot }) : await api("dok.lihat", { id: t.id });
          let jalur = t.jalur, n = 2; while (ada.has(jalur)) jalur = t.jalur.replace(/(\.[^.\/]+)?$/, ` (${n++})$1`); ada.add(jalur);
          berkas.push({ nama: jalur, data: dariBase64(j.isi) });
        } catch (e) { gagal.push(t.jalur + ": " + e.message); }
      }
      const daftar = await UPW_ZIP.xlsx(lembarPorto(P)).arrayBuffer();
      berkas.unshift({ nama: "Daftar isi portofolio.xlsx", data: new Uint8Array(daftar) });
      if (gagal.length) berkas.push({ nama: "GAGAL DIAMBIL.txt", data: gagal.join("\r\n") });
      unduh(UPW_ZIP.zip(berkas), judulPorto(P) + " - bukti.zip");
      toast(gagal.length ? `ZIP dibuat; ${gagal.length} file gagal diambil (lihat GAGAL DIAMBIL.txt).` : `ZIP dibuat berisi ${berkas.length - 1} file.`);
    });
  }
});

/* --- tanda tangan saya (KPS) --- */
function hTtd() {
  if (!S.ttd) { sekali("ttd", async () => { S.ttd = await api("ttd.saya"); render(); }); return `<div class="memuat">Memuat…</div>`; }
  const T = S.ttd;
  return `<div class="head"><div><h1>Tanda Tangan Saya</h1><p>Tanda tangan Anda ditempel otomatis hanya pada surat pengantar yang Anda setujui sebagai KPS, selalu bersama pernyataan persetujuan elektronik, kode verifikasi, dan QR. Admin dan Super Admin tidak dapat melihat, mengganti, atau memakainya di aplikasi.</p></div></div>
   <div class="grid g2">
    <section class="panel"><h2>Tanda tangan tersimpan</h2>
     ${T.ada ? `<div class="ttd-kotak"><img src="${T.gambar}" alt="Tanda tangan tersimpan"></div>
       <p class="small muted" style="margin-top:8px">${T.cara === "unggah" ? "Diunggah dari gambar" : "Dibuat langsung di aplikasi"} · disimpan ${esc(tglJam(T.dibuat))}</p>
       <div class="row" style="margin-top:8px">${tombol("ttdHapus", "Hapus tanda tangan", "bad sm")}</div>`
     : `<div class="empty" style="border:1px dashed var(--line);border-radius:8px">Belum ada tanda tangan. Surat yang Anda setujui memakai pernyataan persetujuan elektronik, kode verifikasi, dan QR saja.</div>`}
     <div class="callout" style="margin-top:12px"><b>Pengamanan:</b> gambar disimpan tersandi di Drive prodi (tidak bisa dibuka langsung sebagai gambar). Mengganti atau menghapus tanda tangan tidak mengubah surat yang sudah terbit. Setiap pemakaian tercatat di bawah.</div>
    </section>
    <section class="panel"><h2>${T.ada ? "Ganti" : "Tambahkan"} tanda tangan</h2>
     <div class="seg" role="group" aria-label="Cara" style="margin-bottom:10px"><button data-act="ttdTab" data-t="gambar" aria-pressed="${S.ttdTab === "gambar"}">Buat langsung</button><button data-act="ttdTab" data-t="unggah" aria-pressed="${S.ttdTab === "unggah"}">Unggah gambar</button></div>
     ${S.ttdTab === "gambar" ? `<p class="small muted" style="margin-bottom:6px">Tanda tangani kotak putih memakai mouse, trackpad, jari, atau stylus.</p>
       <canvas id="ttdPad" width="640" height="220" aria-label="Kotak tanda tangan"></canvas>
       <div class="row" style="margin-top:6px"><button class="btn sm" data-act="ttdBersih">Bersihkan</button><label class="row small" style="gap:6px">Ketebalan <select id="ttdTebal" style="width:auto"><option value="2">Tipis</option><option value="3" selected>Sedang</option><option value="4.5">Tebal</option></select></label></div>`
     : `<p class="small muted" style="margin-bottom:6px">Foto atau pindai tanda tangan di kertas putih polos (PNG atau JPG). Latar putih otomatis dibuat transparan dan gambar dirapikan.</p>
       <input id="ttdFile" type="file" accept="image/png,image/jpeg" aria-label="Pilih gambar tanda tangan">
       ${S.ttdTmp ? `<div class="ttd-kotak" style="margin-top:8px"><img src="${S.ttdTmp}" alt="Pratinjau tanda tangan"></div><p class="small muted" style="margin-top:4px">Pratinjau setelah latar dibersihkan.</p>` : ""}`}
     <label class="row small" style="gap:8px;margin-top:10px;align-items:flex-start;flex-wrap:nowrap"><input type="checkbox" id="ttdSetuju" style="flex:none;margin-top:3px"><span>Saya menyetujui tanda tangan ini ditempel otomatis hanya pada surat yang saya setujui melalui Repositori UPW.</span></label>
     ${galatHtml()}<div class="row" style="margin-top:10px">${tombol("ttdSimpan", "Simpan tanda tangan")}</div>
    </section></div>
   <section class="panel"><h2>Log pemakaian tanda tangan (${T.pemakaian.length})</h2>${T.pemakaian.length ? `<div class="tbl-wrap"><table><thead><tr><th>Tanggal surat</th><th>Kegiatan</th><th>Kode verifikasi</th></tr></thead><tbody>${T.pemakaian.map(r => `<tr><td class="num">${esc(tglPendek(r.tgl))}</td><td>${esc(r.judul)}</td><td class="mono">${esc(r.kode)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="small muted">Belum ada surat yang memakai tanda tangan Anda.</p>`}</section>`;
}
/** Latar putih → transparan, goresan dipertegas, tepi kosong dipangkas, lebar maks. 600 px. */
function rapikanTtd(sumber) {
  const c = document.createElement("canvas"); c.width = sumber.naturalWidth || sumber.width; c.height = sumber.naturalHeight || sumber.height;
  const x = c.getContext("2d"); x.drawImage(sumber, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data; let minX = c.width, minY = c.height, maxX = -1, maxY = -1;
  for (let i = 0; i < p.length; i += 4) {
    const v = (p[i] + p[i + 1] + p[i + 2]) / 3;
    if (v > 200 || p[i + 3] < 20) p[i + 3] = 0;
    else { const n = i / 4, X = n % c.width, Y = (n - X) / c.width; if (X < minX) minX = X; if (X > maxX) maxX = X; if (Y < minY) minY = Y; if (Y > maxY) maxY = Y; p[i] = p[i + 1] = p[i + 2] = Math.min(v, 60); p[i + 3] = 255; }
  }
  x.putImageData(d, 0, 0); if (maxX < 0) return null;
  const pad = 8, w = maxX - minX + 1 + 2 * pad, h = maxY - minY + 1 + 2 * pad, sk = Math.min(1, 600 / w, 240 / h);
  const o = document.createElement("canvas"); o.width = Math.round(w * sk); o.height = Math.round(h * sk);
  o.getContext("2d").drawImage(c, minX - pad, minY - pad, w, h, 0, 0, o.width, o.height);
  return o.toDataURL("image/png");
}
let coret = null;
const posKanvas = (e, c) => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) * c.width / r.width, (e.clientY - r.top) * c.height / r.height]; };
document.addEventListener("pointerdown", e => {
  if (e.target.id !== "ttdPad") return;
  const c = e.target, x = c.getContext("2d"); x.lineCap = "round"; x.lineJoin = "round"; x.strokeStyle = "#111";
  x.lineWidth = Number($("ttdTebal")?.value || 3) * c.width / c.getBoundingClientRect().width;
  const [px, py] = posKanvas(e, c); x.beginPath(); x.moveTo(px, py); x.lineTo(px + 0.1, py); x.stroke();
  coret = { c, x }; c.setPointerCapture(e.pointerId); c.dataset.isi = "1"; e.preventDefault();
});
document.addEventListener("pointermove", e => { if (!coret || e.target !== coret.c) return; const [px, py] = posKanvas(e, coret.c); coret.x.lineTo(px, py); coret.x.stroke(); });
document.addEventListener("pointerup", () => { coret = null; });
document.addEventListener("change", e => {
  if (e.target.id !== "ttdFile" || !e.target.files[0]) return;
  const f = e.target.files[0];
  if (f.size > 8 * 1024 * 1024) { toast("Gambar terlalu besar (maks. 8 MB)."); return; }
  const fr = new FileReader();
  fr.onload = () => { const im = new Image(); im.onload = () => { S.ttdTmp = rapikanTtd(im); if (!S.ttdTmp) toast("Tidak ada goresan yang terbaca pada gambar."); render(); }; im.onerror = () => toast("Gambar tidak bisa dibuka. Gunakan PNG atau JPG."); im.src = fr.result; };
  fr.readAsDataURL(f);
});
function fokus(id) { const el = $(id); if (el) el.focus(); }
Object.assign(AKSI, AKSI_ASESOR); // didefinisikan lebih awal (dekat halaman Pengguna), didaftarkan setelah AKSI ada
function gantiJenis(j) {
  const f = S.form, lama = f.jenis; f.jenis = j;
  if (lama !== j) { f.isian = {}; f.lainIsian = {}; f.perluST = !S.ref.tanpaSt.includes(j); }
}
function kirimForm(kirim) {
  jalankan(async () => {
    const j = await api("kegiatan.simpan", { peran: peranAktif(), kirim, data: dataForm(S.form) });
    S.form = null; segarkan();
    S.laci = { jenis: "kegDetail", id: j.kegiatan.id, k: j.kegiatan };
    toast(kirim ? (j.kegiatan.st === "menunggu_kps" ? "Terkirim ke KPS." : "Kegiatan diajukan.") : j.kegiatan.st === "tanpa" ? "Tersimpan. Sekarang unggah buktinya." : "Draf tersimpan.");
  });
}
document.addEventListener("change", e => {
  const t = e.target, f = S.form; if (!f || !S.laci || S.laci.jenis !== "keg") return;
  if (t.dataset.kf && t.tagName === "SELECT") {
    if (t.dataset.kf === "jenis") { gantiJenis(t.value); render(); return; }
    f[t.dataset.kf] = t.value; return;
  }
  if (t.dataset.kfx !== undefined && t.tagName === "SELECT") {
    const l = t.dataset.kfx;
    if (t.value === LAIN) { f.lainIsian[l] = true; f.isian[l] = ""; render(); fokus(t.id + "-lain"); }
    else { const tadi = f.lainIsian[l]; f.lainIsian[l] = false; f.isian[l] = t.value; perbaruiDiTempat(); if (tadi) render(); }
    return;
  }
  if (t.dataset.kcek) { f[t.dataset.kcek] = t.checked; render(); return; }
  if (t.dataset.kls) { f.kelas = t.checked ? [...f.kelas, t.dataset.kls] : f.kelas.filter(x => x !== t.dataset.kls); render(); return; }
  if (t.dataset.exc) { f.excl = t.checked ? f.excl.filter(x => x !== t.dataset.exc) : [...f.excl, t.dataset.exc]; render(); return; }
  if (t.dataset.gc) { const n = Number(t.dataset.gc); f.gcet = t.checked ? [...f.gcet, n].sort((a, b) => a - b) : f.gcet.filter(x => x !== n); return; }
});
document.addEventListener("input", e => {
  const t = e.target, f = S.form; if (!f || !S.laci || S.laci.jenis !== "keg") return;
  if (t.dataset.kf && t.tagName === "INPUT") {
    f[t.dataset.kf] = t.value;
    if (t.dataset.kf === "tgl" && t.value) {
      const s = $("kfSampai"); if (s) { s.min = t.value; if (!f.sampai || f.sampai < t.value) { f.sampai = t.value; s.value = t.value; } }
      const sem = semesterDari(t.value), o = $("semOto"); if (o && sem) o.querySelector("b").textContent = sem.label;
    }
    perbaruiDiTempat(); return;
  }
  if (t.dataset.kfx !== undefined && t.tagName === "INPUT") { f.isian[t.dataset.kfx] = t.value; perbaruiDiTempat(); return; }
  if (t.dataset.kfxl !== undefined) { f.isian[t.dataset.kfxl] = t.value; perbaruiDiTempat(); return; }
});
document.addEventListener("input", ketikUlang("kfCariP", v => { S.form.cariP = v; }));
document.addEventListener("input", ketikUlang("kfCariM", v => { S.form.cariM = v; }));
document.addEventListener("input", ketikUlang("kfJq", v => { S.form.jq = v; }));
document.addEventListener("input", ketikUlang("cariK", v => { S.kegQ = v; }));

/* ---------- mulai ---------- */
(async function mulai() {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  const kodeCek = new URLSearchParams(location.search).get("cek");
  if (kodeCek) {
    S.layar = "cek"; S.cek = { kode: kodeCek, hasil: null }; render();
    try { S.cek.hasil = await api("surat.cek", { kode: kodeCek }); } catch (e) { S.galat = e.message; }
    render(); return;
  }
  const kodeSv = new URLSearchParams(location.search).get("survei");
  if (kodeSv) {
    S.layar = "survei"; S.svPub = { kode: kodeSv, data: null }; render();
    try { S.svPub.data = (await api("survei.publik", { kode: kodeSv })).survei; } catch (e) { S.svPub.galat = e.message; }
    render(); return;
  }
  // Pintasan dari ikon aplikasi (klik kanan di Dock): ?buka=info|kegiatan|beranda (v0.22.0)
  const buka = new URLSearchParams(location.search).get("buka");
  if (buka && /^(info|kegiatan|beranda)$/.test(buka)) { S.view = buka; history.replaceState(null, "", location.pathname); }
  const kodeKeg = new URLSearchParams(location.search).get("keg");
  if (kodeKeg && /^k[0-9a-z]+$/i.test(kodeKeg)) { S.bukaSetelahMasuk = kodeKeg; history.replaceState(null, "", location.pathname); }
  if (S.token) {
    // Tampilkan dulu dari profil tersimpan (instan), lalu periksa ke server.
    let simpanan = null; try { simpanan = JSON.parse(ls.get("profil") || "null"); } catch (_) {}
    if (simpanan && !simpanan.perluAktivasi && !simpanan.wajibGanti && !simpanan.perluVerifikasiEmail) { S.pengguna = simpanan; render(); }
    try { S.pengguna = (await api("saya")).pengguna; if (S.pengguna.perluAktivasi) S.akt.langkah = S.pengguna.wajibGanti ? 1 : 2; }
    catch (e) {
      if (simpanan && S.pengguna && !/Sesi berakhir|tidak aktif|berakhir|Akun/.test(e.message || "")) toast("Belum tersambung ke server. Data akan dimuat ulang saat sambungan pulih.");
      else { aturToken(null); bersihkanData(); }
    }
  }
  render();
})();
})();
