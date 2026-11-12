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
    if (/Sesi berakhir/.test(j.galat || "")) { aturToken(null); S.pengguna = null; S.layar = "masuk"; }
    throw new Error(j.galat || "Terjadi kesalahan.");
  }
  return j;
}
function aturToken(t) { S.token = t; ls.set("token", t); }

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
  mk: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7M8 11h7"/>'
};
const ic = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;
const MENU_L = { beranda: "Beranda", kegiatan: "Kegiatan", kps: "Antrean KPS", verif: "Verifikasi", ttd: "Tanda Tangan", porto: "Portofolio", ilkps: "Tabel iLKPS", dprodi: "Data Prodi", setuju: "Kegiatan disetujui", survei: "Survei", penilaian: "Penilaian", ded: "DED", mk: "Mata Kuliah Saya", biodata: "Biodata", cari: "Cari orang", pengguna: "Pengguna", log: "Log aktivitas", akun: "Akun saya" };

function peranAktif() {
  const r = S.pengguna ? S.pengguna.peran : [];
  if (!r.includes(S.peran)) S.peran = r[0];
  return S.peran;
}
function menu() {
  const p = peranAktif(), u = S.pengguna;
  if (u.perluBiodata) return ["biodata", "akun"];
  if (p === "asesor") return ["beranda", "ilkps", "setuju", "cari", "akun"];
  const m = ["beranda"];
  if (PERAN_KEG.includes(p)) m.push("kegiatan");
  if (u.peran.some(r => PERAN_KEG.includes(r))) m.push("porto");
  if (u.peran.includes("dosen")) m.push("mk");
  if (u.peran.some(r => ["admin", "superadmin", "kps"].includes(r))) m.push("penilaian", "ded", "ilkps", "dprodi", "survei");
  else if (S.tugas && S.tugas.dedPj) m.push("ded");
  if (u.peran.includes("kps")) m.push("kps"); // antrean KPS selalu terlihat, apa pun peran aktifnya, agar pengajuan tidak terlewat
  if (u.peran.some(r => ["admin", "superadmin", "kps", "dosen"].includes(r))) m.push("verif"); // dosen: sebagai pendamping lomba
  if (u.peran.includes("kps")) m.push("ttd");
  if (u.jenisBiodata) m.push("biodata");
  m.push("cari");
  if (p === "superadmin" || p === "admin") m.push("pengguna");
  if (p === "superadmin") m.push("log");
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
}
function gambar() {
  if (S.layar === "survei") { app.innerHTML = layarSurveiPublik(); return; }
  if (!S.pengguna) { app.innerHTML = S.layar === "cek" ? layarCek() : S.layar === "lupa" ? layarLupa() : layarMasuk(); return; }
  if (S.pengguna.perluAktivasi) { app.innerHTML = layarAktivasi(); return; }
  if (S.pengguna.wajibGanti) { app.innerHTML = layarGanti(); return; }
  const m = menu(); if (!m.includes(S.view)) S.view = m[0];
  const u = S.pengguna, p = peranAktif();
  if (!S.tugas && !u.perluBiodata) muatTugas();
  if (!S.svSaya && !u.perluBiodata && !u.wajibGanti && p !== "asesor") sekali("svSaya", async () => { S.svSaya = (await api("survei.saya")).survei; render(); });
  if (S.bukaSetelahMasuk && !u.perluBiodata) { const id = S.bukaSetelahMasuk; S.bukaSetelahMasuk = null; setTimeout(() => AKSI.bukaKeg({ id }), 0); }
  app.innerHTML = `<div class="shell">
   <aside class="side"><div class="brand"><img src="logo.png" alt="Logo Politeknik Pariwisata Bali"><div><b>Repositori UPW</b><span>Akreditasi LAMWisata</span></div></div>
    <nav class="nav" aria-label="Menu utama">${m.map(v => `<button data-go="${v}" ${S.view === v ? 'aria-current="page"' : ""}>${ic(v)}<span>${MENU_L[v]}</span>${lencana(v)}</button>`).join("")}</nav>
    <div class="who"><div class="avatar">${esc(u.nama.split(" ").slice(0, 2).map(x => x[0]).join(""))}</div><div style="min-width:0"><div class="small" style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(u.nama)}</div><div class="small muted">${esc(PERAN_L[p])}</div></div></div></aside>
   <div class="main"><header class="top"><div class="brand-m"><img src="logo.png" alt=""><b>Repositori UPW</b></div>
    <span class="ta">Uji Coba v${K.versi}</span><span class="spacer"></span>
    ${u.peran.length > 1 ? `<label class="row small" style="gap:6px"><span class="muted">Peran</span><select id="peranSel" aria-label="Peran aktif" style="width:auto">${u.peran.map(r => `<option value="${r}" ${r === p ? "selected" : ""}>${PERAN_L[r]}</option>`).join("")}</select></label>` : ""}
    <button class="iconbtn" data-act="keluar" aria-label="Keluar" title="Keluar">${ic("keluar")}</button></header>
    <main class="content">${halaman()}</main></div></div>
   <nav class="tabbar" aria-label="Menu">${m.map(v => `<button data-go="${v}" ${S.view === v ? 'aria-current="page"' : ""}>${ic(v)}<span>${MENU_L[v]}</span>${lencana(v)}</button>`).join("")}</nav>
   ${S.laci ? laci() : ""}`;
}
/** Angka kecil di menu: hal yang menunggu tindakan. */
function lencana(v) {
  const t = S.tugas; if (!t) return "";
  const n = v === "beranda" ? t.tugas.length : v === "verif" ? t.verifikasi : v === "kps" ? t.kps : 0;
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
   <button class="btn sm" type="button" data-act="keCek" style="align-self:flex-start">Cek keaslian surat tugas</button>`);
}
function layarAktivasi() {
  const a = S.akt, u = S.pengguna, langkah = u.emailTerverifikasi ? 3 : (a.langkah);
  const isi = langkah === 1 ? `<h2>Langkah 1 dari 2 · Buat kata sandi baru</h2>
    <p class="muted small">Kata sandi awal (sama dengan NIM/NIP) hanya untuk login pertama. Minimal 8 karakter, memuat huruf dan angka, dan tidak boleh sama dengan NIM/NIP.</p>
    <div class="field"><label for="p1">Kata sandi baru</label><input id="p1" type="password" autocomplete="new-password"></div>
    <div class="field"><label for="p2">Ulangi kata sandi baru</label><input id="p2" type="password" autocomplete="new-password"></div>
    ${galatHtml()}<div class="row">${tombol("aktSandi", "Lanjut")}</div>`
  : `<h2>Langkah 2 dari 2 · Verifikasi email</h2>
    <p class="muted small">Email dipakai untuk kode reset kata sandi dan pengumuman penting. Gunakan email yang aktif Anda buka.</p>
    <div class="field"><label for="em">Email</label><input id="em" type="email" value="${esc(a.email)}" placeholder="Contoh: nama@gmail.com"></div>
    ${a.email && a.terkirim ? `<div class="auto">Kode 6 digit dikirim ke <b>${esc(a.email)}</b>. Periksa juga folder spam.${a.kodeUji ? `<br><b>Mode Uji Coba:</b> kode = <span class="mono">${esc(a.kodeUji)}</span>` : ""}</div>
     <div class="field"><label for="kode">Kode verifikasi</label><input id="kode" type="text" inputmode="numeric" maxlength="6" class="mono" autocomplete="one-time-code"></div>` : ""}
    ${galatHtml()}<div class="row">${a.terkirim ? tombol("aktVerif", "Verifikasi") + tombol("aktKirim", "Kirim ulang kode", "") : tombol("aktKirim", "Kirim kode")}</div>`;
  return bingkai(`Selamat datang, ${esc(u.nama.split(",")[0])}`, "Aktifkan akun Anda dalam dua langkah singkat.",
    `<div class="steps"><i class="on"></i><i class="${langkah >= 2 ? "on" : ""}"></i></div>${isi}<button class="btn" data-act="keluar" style="align-self:flex-start">Batal dan keluar</button>`);
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
   l.langkah === 1 ? `<div class="field"><label for="le">Email terdaftar</label><input id="le" type="email" value="${esc(l.email)}"></div>${galatHtml()}<div class="row">${tombol("lupaKirim", "Kirim kode")}<button class="btn" data-act="keMasuk">Kembali</button></div>`
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
   <div class="callout"><b>Akses baca saja, berlaku sampai ${esc(tglPanjang(u.berlakuSampai))}.</b> Anda dapat melihat <b>Tabel iLKPS</b> dan <b>kegiatan yang datanya sudah diverifikasi</b> beserta bukti, surat tugas, dan kode verifikasinya. Draf, biodata, dan data pribadi lain tidak ditampilkan. Setiap akses tercatat oleh prodi.</div>
   <div class="row"><button class="btn primary" data-go="ilkps">Buka Tabel iLKPS</button><button class="btn" data-go="setuju">Kegiatan disetujui</button></div>
   <section class="panel"><h2>Cara memakai</h2><ol class="small" style="margin:6px 0 0 18px;padding:0;display:grid;gap:4px">
    <li>Di <b>Tabel iLKPS</b>, pilih tabel; klik baris kegiatan untuk membuka detail dan buktinya.</li>
    <li>Tautan bukti di Excel ekspor prodi (kolom "Tautan bukti") juga membuka kegiatan yang sama setelah Anda masuk.</li>
    <li>Keaslian surat tugas dapat dicek dengan kode verifikasi atau QR pada surat.</li></ol></section>`;
  return `<div class="head"><div><h1>Halo, ${esc(u.nama.split(",")[0])}</h1><p>Anda masuk sebagai <b>${esc(PERAN_L[peranAktif()])}</b>${u.peran.length > 1 ? ". Ganti peran lewat pilihan Peran di bilah atas" : ""}.</p></div></div>
   ${panelSurveiSaya()}${panelTugas()}
   <div class="callout"><b>Uji Coba v${K.versi} · Portofolio Mata Kuliah.</b>${menu().includes("mk") ? " Baru: menu <b>Mata Kuliah Saya</b> untuk mengunggah RPS, kontrak kuliah, rubrik, metode, integrasi penelitian/PkM, dan bukti pembelajaran per semester." : ""}${menu().includes("dprodi") ? " Rekap kelengkapannya ada di Data Prodi › Portofolio MK dan ikut tampil di Penilaian butir 8, 22, 25." : ""} Sebelumnya: menu <b>DED</b> (narasi 64 butir, unduh Word) dan <b>Penilaian</b> (simulasi 84 butir). <b>Survei:</b> Baru${menu().includes("survei") ? ": menu <b>Survei</b> (templat Tabel 22 kepuasan mahasiswa dan Tabel 11 pengguna lulusan, anonim atau beridentitas, tautan tanpa login untuk alumni dan pengguna, rekap dan tindak lanjut); Tabel iLKPS kini lengkap 33 lembar" : ": survei dari prodi muncul di Beranda bila ada yang terbuka untuk Anda"}.
   Sudah ada: Portofolio Saya (ekspor PDF/Excel/ZIP), kegiatan dan surat tugas dengan QR${u.peran.includes("kps") ? " dan tanda tangan KPS" : ""}, unggah bukti bersama, batas hari kerja dan pengingat, verifikasi data, cek keaslian surat, biodata, pencarian orang.</div>
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
  (t.mkpBelumRps || []).forEach(m => baris.push(`<div class="item" style="cursor:pointer" data-act="mkpBuka" data-s="${m.semester}" data-kode="${esc(m.kode)}"><div class="body"><div class="title">${esc(m.kode)} · ${esc(m.nama)}</div><div class="meta"><span>Unggah RPS semester ini (Anda pengampu utama)</span></div></div><span class="chip s-revisi">RPS</span></div>`));
  if (t.dedBelum) baris.push(`<div class="item" style="cursor:pointer" data-go="ded"><div class="body"><div class="title">${t.dedBelum} butir DED tanggung jawab Anda belum selesai</div><div class="meta"><span>Dari ${t.dedPj} butir yang ditugaskan kepada Anda</span></div></div><span class="chip s-revisi">DED</span></div>`);
  if (t.kps) baris.push(`<div class="item" style="cursor:pointer" data-go="kps"><div class="body"><div class="title">${t.kps} pengajuan surat tugas menunggu keputusan Anda</div></div><span class="chip s-diajukan">Antrean KPS</span></div>`);
  return `<section class="panel"><h2>Perlu tindakan (${baris.length})</h2><div class="list">${baris.join("") || `<div class="empty">Tidak ada yang perlu ditindaklanjuti. Bagus!</div>`}</div></section>`;
}
function hAkun() {
  return `<div class="head"><div><h1>Akun saya</h1><p>Ganti kata sandi kapan saja. Semua sesi di perangkat lain tetap aktif sampai keluar.</p></div></div>
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
   ${sa ? panelAsesor() : ""}
   <section class="panel"><h2>Impor akun</h2>
    <p class="small muted">Satu baris per orang. Mahasiswa: <b>NIM; Nama lengkap; tahun masuk; kelas</b>.${sa ? " Dosen/tendik: <b>NIP; Nama lengkap; peran</b>, peran dipisah koma, misalnya <span class=\"mono\">dosen,kps</span>." : ""} Bisa ditempel langsung dari Excel (kolom dipisah tab juga diterima).</p>
    <textarea id="imporTeks" style="min-height:110px;margin-top:8px" placeholder="${sa ? "260101; Made Contoh; 2026; A\n198501012010121001; Ni Luh Contoh, M.Par.; dosen" : "260101; Made Contoh; 2026; A\n260102; Ketut Contoh; 2026; B"}">${esc(S.impor.teks)}</textarea>
    ${S.impor.hasil ? `<div class="auto" style="margin-top:8px"><b>${S.impor.hasil.diimpor}</b> akun diimpor.${S.impor.hasil.dilewati.length ? " Dilewati: " + S.impor.hasil.dilewati.map(x => `baris ${x.baris} (${esc(x.alasan)})`).join("; ") : ""}</div>` : ""}
    ${galatHtml()}<div class="row" style="margin-top:8px">${tombol("impor", "Impor")}</div></section>
   <section class="panel"><div class="row" style="justify-content:space-between;margin-bottom:8px"><h2>Daftar akun (${l.length})</h2>
    <div class="row"><input id="cariP" type="search" placeholder="Cari NIM/NIP, nama, email" value="${esc(S.cari)}" style="width:240px"><button class="btn sm" data-act="muatUlang">Muat ulang</button></div></div>
    <div class="tbl-wrap"><table><thead><tr><th>NIM/NIP</th><th>Nama</th>${sa ? "<th>Peran</th>" : ""}<th>Kelas</th><th>Status akun</th><th>Biodata</th><th>Email</th><th>Masuk terakhir</th><th></th></tr></thead><tbody>
    ${l.map(x => `<tr><td class="mono">${esc(x.username)}</td><td>${esc(x.nama)}</td>${sa ? `<td>${x.peran.map(r => `<span class="tag t">${PERAN_L[r]}</span>`).join(" ")}</td>` : ""}<td class="small">${sem(x)}</td><td>${st(x.status)}</td><td>${bio(x)}</td><td class="small">${esc(x.email || "–")}</td><td class="small num">${tgl(x.masukTerakhir)}</td>
     <td><div class="row">${x.jenisBiodata ? `<button class="btn sm" data-act="lihatBio" data-id="${x.id}">Biodata</button>` : ""}${x.jenisBiodata === "mahasiswa" ? `<button class="btn sm" data-act="laciMhs" data-id="${x.id}">Data mhs</button>` : ""}${sa ? `<button class="btn sm" data-act="laciPeran" data-id="${x.id}">Peran</button><button class="btn sm" data-act="resetSandi" data-id="${x.id}">Reset sandi</button>` : ""}</div></td></tr>`).join("")}
    </tbody></table></div></section>`;
}
/* --- akun asesor (v0.9.0, Super Admin) --- */
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
  const nama = id => (S.daftar || []).find(x => x.id === id)?.nama || id || "sistem";
  return `<div class="head"><div><h1>Log aktivitas</h1><p>200 aktivitas terakhir: siapa, apa, kapan.</p></div><button class="btn" data-act="muatLog">Muat ulang</button></div>
   <div class="tbl-wrap"><table><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Detail</th></tr></thead><tbody>
   ${S.log.map(x => `<tr><td class="num small">${tgl(x.waktu)}</td><td>${esc(nama(x.userId))}</td><td class="mono small">${esc(x.aksi)}</td><td class="small mono">${esc(x.detail)}</td></tr>`).join("")}</tbody></table></div>`;
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
function barKelengkapan() {
  const sk = S.bio.paket.skema, all = jumlahWajib(sk), n = all - wajibKosong(sk, S.bio.data).length, p = all ? Math.round(n / all * 100) : 100;
  return { n, all, p };
}
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
   <div class="panel"><div class="row" style="justify-content:space-between"><b>Kelengkapan kolom wajib</b><span class="num" id="bioPct">${k.n} dari ${k.all} · ${k.p}%</span></div><div class="bar" style="margin-top:8px"><i id="bioBar" style="width:${k.p}%"></i></div>
    <p class="small muted" style="margin-top:8px">${mhs ? `Kelas dan semester dihitung otomatis: <b>${pk.semesterMhs ? "Semester " + pk.semesterMhs + " – " : ""}Kelas ${esc(pk.data.kelas || "–")}</b>, ${esc(pk.semester.label)}. ` : ""}Kolom abu-abu diisi dari data akun. Tanda <span style="color:var(--bad)">*</span> = wajib.${pk.diubahPada ? ` Terakhir disimpan ${tgl(pk.diubahPada)}.` : ""}</p></div>
   ${kartuBiodata(pk, S.bio.data, false)}
   ${galatHtml()}<div class="row" style="justify-content:flex-end">${tombol("simpanBio", "Simpan")}</div>`;
}
function perbaruiKelengkapan() {
  const k = barKelengkapan(), a = $("bioPct"), b = $("bioBar");
  if (a) a.textContent = `${k.n} dari ${k.all} · ${k.p}%`;
  if (b) b.style.width = k.p + "%";
}

/* ---------- cari orang ---------- */
function muatDirektori() { return sekali("dir", async () => { const j = await api("direktori"); S.dir = j.orang; render(); }); }
const PERAN_PENDEK = { kps: "KPS", kalab: "Kalab", laboran: "Laboran", admin: "Admin Prodi" };
function hCari() {
  if (!S.dir) { muatDirektori(); return `<div class="memuat">Memuat direktori…</div>`; }
  const tab = S.dirTab, q = S.dirQ.trim().toLowerCase(), staf = peranAktif() !== "mahasiswa";
  const peg = S.dir.filter(x => x.jenis !== "mahasiswa"), mhs = S.dir.filter(x => x.jenis === "mahasiswa");
  const cocok = x => !q || [x.nama, x.username, x.bidang, x.jabTendik, x.jabfung].join(" ").toLowerCase().includes(q);
  const angk = [...new Set(mhs.map(x => x.masuk).filter(Boolean))].sort().reverse();
  const kls = [...new Set(mhs.map(x => x.kelas).filter(Boolean))].sort();
  const sel = (tab === "pegawai" ? peg : mhs).filter(cocok).filter(x => tab === "pegawai" || ((!S.dirAngk || x.masuk === S.dirAngk) && (!S.dirKelas || x.kelas === S.dirKelas)));
  const belum = x => x.aktif ? "" : ' <span class="tag" title="Akun belum diaktivasi">belum aktivasi</span>';
  const tabel = tab === "pegawai"
    ? `<table><thead><tr><th>Nama</th><th>NIP</th><th>Jabatan</th><th>Bidang keahlian</th><th>Kontak</th></tr></thead><tbody>
      ${sel.map(x => `<tr><td>${esc(x.nama)}${belum(x)}<div class="small muted">${x.jenis === "dosen" ? "Dosen" : "Tendik"}${x.peran.length ? " · " + x.peran.map(r => PERAN_PENDEK[r]).join(", ") : ""}</div></td><td class="mono small">${esc(x.username)}</td>
       <td class="small">${esc(x.jabfung || x.jabTendik || "–")}</td><td class="small">${esc(x.bidang || "–")}</td><td class="small">${x.emailKampus ? `<a href="mailto:${esc(x.emailKampus)}">${esc(x.emailKampus)}</a>` : ""}${x.hp ? `<div>${esc(x.hp)}</div>` : ""}${!x.emailKampus && !x.hp ? "–" : ""}</td></tr>`).join("") || `<tr><td colspan="5" class="empty">Tidak ada yang cocok.</td></tr>`}</tbody></table>`
    : `<table><thead><tr><th>NIM</th><th>Nama</th><th>Semester · kelas</th><th>Angkatan</th>${staf ? "<th>Status</th>" : ""}</tr></thead><tbody>
      ${sel.map(x => `<tr><td class="mono">${esc(x.username)}</td><td>${esc(x.nama)}${belum(x)}</td><td>${x.statusMhs === "A" && x.semester ? `Semester ${x.semester} – Kelas ${esc(x.kelas)}` : "Kelas " + esc(x.kelas || "–")}</td><td class="num">${esc(x.masuk || "–")}</td>${staf ? `<td><span class="chip ${x.statusMhs === "A" ? "s-disetujui" : "s-draf"}">${esc(x.statusMhs)} · ${esc(STATUS_MHS[x.statusMhs] || "")}</span></td>` : ""}</tr>`).join("") || `<tr><td colspan="5" class="empty">Tidak ada yang cocok.</td></tr>`}</tbody></table>`;
  return `<div class="head"><div><h1>Cari orang</h1><p>Temukan dosen, tendik, dan mahasiswa, misalnya untuk memilih dosen pendamping atau anggota tim lomba. Data pribadi tidak ditampilkan di sini.</p></div></div>
   <section class="panel"><div class="row" style="justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px">
    <div class="seg" role="group" aria-label="Kelompok"><button data-act="dirTab" data-tab="pegawai" aria-pressed="${tab === "pegawai"}">Dosen dan tendik (${peg.length})</button><button data-act="dirTab" data-tab="mahasiswa" aria-pressed="${tab === "mahasiswa"}">Mahasiswa (${mhs.length})</button></div>
    <div class="row" style="flex-wrap:wrap">${tab === "mahasiswa" ? `<select id="dirAngk" aria-label="Angkatan" style="width:auto"><option value="">Semua angkatan</option>${angk.map(a => `<option ${S.dirAngk === a ? "selected" : ""}>${esc(a)}</option>`).join("")}</select>
     <select id="dirKelas" aria-label="Kelas" style="width:auto"><option value="">Semua kelas</option>${kls.map(a => `<option ${S.dirKelas === a ? "selected" : ""}>${esc(a)}</option>`).join("")}</select>` : ""}
     <input id="cariD" type="search" placeholder="${tab === "pegawai" ? "Nama, NIP, atau bidang keahlian" : "Nama atau NIM"}" value="${esc(S.dirQ)}" style="width:240px"></div></div>
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
  async keluar() { try { await api("keluar"); } catch (_) {} aturToken(null); S.pengguna = null; S.daftar = null; S.log = null; S.bio = null; S.dir = null; S.ref = null; S.keg = null; S.antrean = null; S.form = null; S.laci = null; S.tugas = null; S.verif = null; S.ttd = null; S.ttdSurat = {}; S.porto = null; S.dokForm = null; S.ilkps = null; S.ilkpsTs = null; S.dp = null; S.asesor = null; S.setuju = null; S.lul = null; S.sv = null; S.svSaya = null; S.nilai = null; S.ded = null; S.layar = "masuk"; S.akt = { langkah: 1, email: "" }; render(); },
  aktSandi: () => jalankan(async () => { const a = mentah("p1"); cocok(a, mentah("p2")); S.pengguna = (await api("aktivasi.sandi", { sandiBaru: a })).pengguna; S.akt.langkah = 2; }),
  aktKirim: () => jalankan(async () => { const em = nilai("em"); S.akt.email = em; const j = await api("aktivasi.kirimKode", { email: em }); S.akt.terkirim = true; S.akt.kodeUji = j.kodeUji || ""; toast("Kode dikirim ke " + j.terkirimKe); }),
  aktVerif: () => jalankan(async () => { S.pengguna = (await api("aktivasi.verifikasi", { kode: nilai("kode") })).pengguna; S.view = S.pengguna.perluBiodata ? "biodata" : "beranda"; toast("Akun aktif. Selamat datang!"); }),
  lupaKirim: () => jalankan(async () => { S.lupa.email = nilai("le"); if (!S.lupa.email) throw new Error("Isi email terdaftar."); const j = await api("lupa.kirimKode", { email: S.lupa.email }); S.lupa.langkah = 2; S.lupa.kodeUji = j.kodeUji || ""; }),
  lupaReset: () => jalankan(async () => { const a = mentah("l1"); cocok(a, mentah("l2")); const j = await api("lupa.reset", { email: S.lupa.email, kode: nilai("lk"), sandiBaru: a }); S.layar = "masuk"; toast(j.pesan); }),
  gantiWajib: () => jalankan(async () => { const a = mentah("g1"); cocok(a, mentah("g2")); S.pengguna = (await api("ganti.sandi", { sandiBaru: a })).pengguna; toast("Kata sandi tersimpan."); }),
  gantiSandi: () => jalankan(async () => { const a = mentah("a1"); cocok(a, mentah("a2")); S.pengguna = (await api("ganti.sandi", { sandiLama: mentah("a0"), sandiBaru: a })).pengguna; toast("Kata sandi berhasil diganti."); }),
  impor: () => jalankan(async () => {
    S.impor.teks = mentah("imporTeks");
    const baris = S.impor.teks.split(/\r?\n/).map(x => x.trim()).filter(Boolean).map(x => {
      const c = x.split(/\t|;/).map(y => y.trim());
      return /^\d{4}$/.test(c[2] || "") ? { username: c[0], nama: c[1], peran: "mahasiswa", masuk: c[2], kelas: c[3] || "" }
        : { username: c[0], nama: c[1], peran: c[2] || "mahasiswa", masuk: c[3] || "", kelas: c[4] || "" };
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
  if (b.dataset.go) { S.view = b.dataset.go; S.galat = ""; if (b.dataset.go === "penilaian") S.nilai = null; /* penilaian bergantung pada hampir semua data: selalu hitung ulang */ render(); window.scrollTo(0, 0); return; }
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
  akreditasi: "Melengkapi data akreditasi", disetujui: "Menyetujui data", revisi: "Meminta revisi data", ditolak: "Menolak data" };
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
function segarkan() { S.mkp = null; S.mkpRekap = null; S.keg = null; S.antrean = null; S.verif = null; S.tugas = null; S.ttd = null; S.porto = null; S.ilkps = null; S.nilai = null; }
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
    ${terbit ? `<div class="sah-baris"><div class="qr">${window.UPW_QR ? UPW_QR.svg(url) : ""}</div><div class="sah">Disetujui secara elektronik melalui Repositori UPW pada ${esc(tglSurat(tg))}.<br>Kode verifikasi: <b>${esc(k.kodeSurat)}</b><br>Pindai QR atau buka: ${esc(url)}</div></div>
      ${gbr ? `<img class="ttd-img" src="${gbr}" alt="Tanda tangan ${esc(kps.nama)}">` : ""}` : `<div class="draf-ttd">DRAF: belum disetujui KPS</div>`}
    <div><b><u>${esc(kps.nama)}</u></b><br>NIP. ${esc(nipTampil(kps.nip))}</div></div>`;
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
  const ada = k => new RegExp("(^|[^a-z0-9])" + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-z0-9]|$)").test(txt);
  return Object.entries(S.ref.gcetKw).map(([p, kw]) => ({ p: +p, w: kw.filter(ada) })).filter(x => x.w.length).sort((a, b) => b.w.length - a.w.length).slice(0, 4);
}
function htmlSaranGcet(f) {
  const s = saranGcet(f);
  return s.length ? `Saran dari judul dan isian Anda: ${s.map(x => `<b>pasal ${x.p}</b> <span class="muted">(${esc(x.w.join(", "))})</span>`).join("; ")}. Periksa dulu, lalu centang yang benar-benar diterapkan. <button class="btn sm" data-act="gcetSemua" style="margin-top:6px">Centang semua saran</button>`
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
  <details class="picker" ${f.gcet.length || saranGcet(f).length ? "open" : ""}><summary style="cursor:pointer"><b>Pasal Global Code of Ethics for Tourism yang diterapkan</b> <span class="small muted">(opsional, untuk butir matriks 75)</span></summary>
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
  const g = $("saranGcet"); if (g && S.form) g.innerHTML = htmlSaranGcet(S.form);
}

/* --- antrean KPS --- */
function hKps() {
  if (!S.antrean) { muatAntrean(); return `<div class="memuat">Memuat antrean…</div>`; }
  const q = S.antrean;
  return `${S.tugas && S.tugas.ttd === false ? `<div class="callout" style="margin-bottom:12px">Anda belum menyimpan tanda tangan. Surat yang Anda setujui memakai pernyataan persetujuan elektronik, kode verifikasi, dan QR saja. <button class="btn sm" data-go="ttd" style="margin-left:6px">Tambahkan tanda tangan</button></div>` : ""}<div class="head"><div><h1>Antrean KPS</h1><p>Pengajuan surat tugas dari dosen, tendik, dan mahasiswa. Periksa draf surat, lalu setujui, tunda, minta revisi, atau tolak.</p></div><button class="btn" data-act="muatAntrean">Muat ulang</button></div>
   <section class="panel"><h2>Pengajuan surat tugas (${q.length})</h2><div class="list">${q.map(k => `<div class="item"><div class="body">
    <div class="row" style="justify-content:space-between"><div class="title">${esc(k.judul)}</div>${chipKeg(k)}</div>
    <div class="meta"><span>${esc(k.jenisLabel)}</span><span class="num">${esc(rentangPendek(k.tgl, k.sampai))}</span><span>${esc(k.tempat || "")}</span><span>Diajukan oleh ${esc(namaPendek(k.olehNama))}</span><span>${k.lampiran.pegawai.length} dosen/tendik · ${k.lampiran.mhs.length} mahasiswa</span></div>
    ${k.tunggakan && k.tunggakan.length ? `<div class="callout" style="margin-top:8px;border-color:var(--bad)"><b style="color:var(--bad)">Perhatian:</b> pengaju/peserta masih punya ${k.tunggakan.length} kegiatan yang buktinya belum lengkap melewati batas: ${k.tunggakan.map(o => `<a href="#" data-act="bukaKeg" data-id="${o.id}">${esc(o.judul)}</a> (batas ${esc(tglPendek(o.batas))})`).join("; ")}. Anda dapat <b>menunda</b> pengajuan ini sampai bukti tersebut lengkap.</div>` : ""}
    <div class="row" style="margin-top:8px">${k.lampiran.surat.dosen ? `<button class="btn sm" data-act="kpsSurat" data-id="${k.id}" data-w="dosen">Draf surat dosen/tendik</button>` : ""}${k.lampiran.surat.mhs ? `<button class="btn sm" data-act="kpsSurat" data-id="${k.id}" data-w="mhs">Draf surat mahasiswa</button>` : ""}<button class="btn sm" data-act="bukaKeg" data-id="${k.id}">Detail</button></div>
    <div class="field" style="margin-top:8px"><label for="kc${k.id}">Catatan KPS untuk pengaju</label><textarea id="kc${k.id}" placeholder="Wajib diisi bila menunda, meminta revisi, atau menolak"></textarea></div>
    <div class="row" style="margin-top:6px;flex-wrap:wrap">${tombol("kpsPutus", "Setujui dan terbitkan surat", "ok sm", `data-id="${k.id}" data-k="terbit"`)}${tombol("kpsPutus", "Tunda", "warn sm", `data-id="${k.id}" data-k="ditunda"`)}${tombol("kpsPutus", "Minta revisi", "warn sm", `data-id="${k.id}" data-k="revisi_aju"`)}${tombol("kpsPutus", "Tolak", "bad sm", `data-id="${k.id}" data-k="ditolak_aju"`)}</div>
   </div></div>`).join("") || `<div class="empty">Tidak ada pengajuan yang menunggu.</div>`}</div></section>
   ${S.galat ? `<div class="panel">${galatHtml()}</div>` : ""}`;
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
    else { if (w) w.close(); const a = document.createElement("a"); a.href = url; a.download = j.nama; document.body.appendChild(a); a.click(); a.remove(); }
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
  const D = S.dp, ub = D.bolehUbah, tabs = [["kurikulum", "Kurikulum"], ["tim", "Tim pengajar"], ["mkp", "Portofolio MK"], ["praktisi", "Praktisi"], ["dosents", "Data dosen TS"], ["lulusan", "Lulusan"], ["pmb", "PMB"], ["keuangan", "Keuangan"]];
  let isi = "";
  if (["lulusan", "pmb", "keuangan"].includes(S.dpTab)) isi = isiLulusan();
  if (S.dpTab === "mkp") isi = isiMkpRekap();
  if (S.dpTab === "kurikulum") {
    const tot = D.mk.reduce((s, m) => s + m.sks, 0), prak = D.mk.reduce((s, m) => s + m.sksPraktik, 0);
    isi = `<div class="grid g3"><div class="panel stat"><span class="v num">${D.mk.length}</span><span class="l">Mata kuliah</span></div><div class="panel stat"><span class="v num">${tot.toLocaleString("id-ID")}</span><span class="l">Total sks</span></div>
      <div class="panel stat"><span class="v num">${tot ? dpPersen(prak / tot) : "–"}</span><span class="l">PJP: sks praktik/praktikum ÷ total sks (${prak.toLocaleString("id-ID")} sks praktik)</span></div></div>
     ${ub ? `<div class="row" style="flex-wrap:wrap">${tombol("dpMkBaru", "+ Tambah mata kuliah", "primary")}<button class="btn" data-act="dpImporBuka">${S.dpImpor ? "Tutup impor" : "Impor dari Excel (tempel)"}</button></div>` : ""}
     ${S.dpImpor ? `<section class="panel"><h2>Impor kurikulum</h2><p class="small">Salin baris dari Excel lalu tempel di sini. Urutan kolom: <b>Kode; Nama mata kuliah; Semester (1–8); sks kuliah; sks seminar; sks praktik/praktikum; Kompetensi (Ya/Tidak)</b>. Pemisah boleh tab (hasil salin Excel) atau titik koma. Kode yang sudah ada akan diperbarui.</p>
       <textarea id="dpImporTeks" rows="6" placeholder="UPW201&#9;Travel Agency Operation&#9;2&#9;1&#9;0&#9;2&#9;Ya"></textarea>${galatHtml()}<div class="row" style="justify-content:flex-end">${tombol("dpImporSimpan", "Impor")}</div></section>` : ""}
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
     ${ub ? `<div class="row"><button class="btn primary" data-act="lulImporBuka">${S.lulImpor ? "Tutup impor" : "Impor / perbarui dari Excel (tempel)"}</button></div>` : ""}
     ${S.lulImpor ? `<section class="panel"><h2>Impor lulusan</h2><p class="small">Salin baris dari Excel lalu tempel. Urutan kolom: <b>NIM; Nama; Tahun masuk; Tanggal lulus; IPK; Waktu tunggu kerja (bulan); Kesesuaian bidang kerja (Rendah/Sedang/Tinggi); Tempat kerja (Lokal/Nasional/Internasional)</b>.
       Tanggal boleh 2025-08-20 atau 20/08/2025; koma desimal boleh. Kolom tracer (3 terakhir) boleh kosong bila lulusan belum terlacak. NIM yang sudah ada akan diperbarui, dan akun mahasiswa dengan NIM itu otomatis berstatus <b>Lulus</b>.</p>
       <textarea id="lulTeks" rows="7" placeholder="210101&#9;Kadek Contoh&#9;2021&#9;20/08/2025&#9;3,52&#9;2&#9;Tinggi&#9;Nasional"></textarea>${galatHtml()}<div class="row" style="justify-content:flex-end">${tombol("lulImporSimpan", "Impor")}</div></section>` : ""}
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
      else { if (w) w.close(); const a = document.createElement("a"); a.href = url; a.download = j.nama; document.body.appendChild(a); a.click(); a.remove(); }
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
      <td class="small">${CARA_L[r.t]}${r.perluGpm ? `<br>GPM: <b>${r.gpm === null ? "belum" : angkaId2(r.gpm)}</b>${r.auto !== null ? ` · data: ${angkaId2(r.auto)}` : ""}<br><button class="btn sm" data-act="gpmBuka" data-n="${r.n}" style="margin-top:4px">${r.gpm === null ? "Nilai" : "Ubah"}</button>` : ""}</td></tr>`).join("")}
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
     ${ks.map((x, n) => `<tr><td class="c">${n + 1}</td><td>${esc(x.judul)}${x.kodeSurat ? `<br><span style="font-size:8.5pt;color:#555">Surat: ${esc(x.kodeSurat)}</span>` : ""}</td><td>${esc(x.jenisLabel)}</td><td>${esc(rentangPendek(x.tgl, x.sampai))}</td><td>${esc(x.tingkat || "–")}</td><td>${esc(x.peranSaya)}</td><td>${esc(statusTeks(x))}</td></tr>`).join("")}</tbody></table>`).join("")}
    ${P.dokumen.length ? `<p style="font-weight:700;margin:14px 0 4px">Dokumen pribadi</p><table class="lamp"><thead><tr><th>No</th><th>Dokumen</th><th>Jenis</th><th>Tahun</th></tr></thead><tbody>
     ${P.dokumen.map((d, n) => `<tr><td class="c">${n + 1}</td><td>${esc(d.nama)}</td><td>${esc(d.jenis)}</td><td class="c">${esc(d.tahun)}</td></tr>`).join("")}</tbody></table>` : ""}
    <p style="margin-top:14px;font-size:9pt;color:#555">Dicetak dari Repositori UPW pada ${esc(tglCetak())}. Status "Data disetujui" berarti data dan buktinya sudah diverifikasi prodi. Surat dapat dicek keasliannya dengan kode surat di ${esc(location.origin + location.pathname)}.</p></div>`;
}
function lembarPorto(P) {
  const kg = [["No", "Semester", "Judul / nama kegiatan", "Jenis", "Tabel", "Tanggal mulai", "Tanggal selesai", "Tingkat", "Peran saya", "Status", "Kode surat", "Bukti wajib terunggah", "Bukti wajib diperlukan"]]
    .concat(P.kegiatan.map((k, n) => [n + 1, k.semester || "", k.judul, k.jenisLabel + (k.jenisLain ? " · " + k.jenisLain : ""), k.tabel || "", k.tgl || "", k.sampai || "", k.tingkat || "", k.peranSaya, statusTeks(k), k.kodeSurat || "", k.buktiAda, k.buktiPerlu]));
  const bk = [["Kegiatan", "Dokumen", "Bentuk", "Nama file / tautan / keterangan"]];
  P.kegiatan.forEach(k => k.daftarBukti.forEach(b => bk.push([k.judul, b.l, b.t === "file" ? "File" : b.t === "tautan" ? "Tautan" : "Tidak tersedia", b.t === "file" ? b.nama : b.t === "tautan" ? b.url : b.ket])));
  const dk = [["No", "Nama dokumen", "Jenis", "Tahun", "Bentuk", "Nama file / tautan"]].concat(P.dokumen.map((d, n) => [n + 1, d.nama, d.jenis, d.tahun, d.t === "file" ? "File" : "Tautan", d.t === "file" ? d.namaFile : d.url]));
  return [{ nama: "Identitas", baris: [["Keterangan", "Isi"], ...identitasPorto(P), ["Dicetak", tglCetak()]] }, { nama: "Kegiatan", baris: kg }, { nama: "Bukti", baris: bk }, { nama: "Dokumen pribadi", baris: dk }];
}
function unduh(blob, nama) {
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = nama; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 120000);
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
  const kodeKeg = new URLSearchParams(location.search).get("keg");
  if (kodeKeg && /^k[0-9a-z]+$/i.test(kodeKeg)) { S.bukaSetelahMasuk = kodeKeg; history.replaceState(null, "", location.pathname); }
  if (S.token) {
    try { S.pengguna = (await api("saya")).pengguna; if (S.pengguna.perluAktivasi) S.akt.langkah = S.pengguna.wajibGanti ? 1 : 2; }
    catch (_) { aturToken(null); }
  }
  render();
})();
})();
