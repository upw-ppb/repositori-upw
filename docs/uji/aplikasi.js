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
  daftar: null, cari: "", impor: { teks: "", hasil: null }, log: null, laci: null, galat: "" };

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
  keluar: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/>'
};
const ic = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;
const MENU_L = { beranda: "Beranda", pengguna: "Pengguna", log: "Log aktivitas", akun: "Akun saya" };

function peranAktif() {
  const r = S.pengguna ? S.pengguna.peran : [];
  if (!r.includes(S.peran)) S.peran = r[0];
  return S.peran;
}
function menu() {
  const p = peranAktif(), m = ["beranda"];
  if (p === "superadmin" || p === "admin") m.push("pengguna");
  if (p === "superadmin") m.push("log");
  m.push("akun");
  return m;
}

/* ---------- render ---------- */
const app = $("app");
function render() {
  if (!S.pengguna) { app.innerHTML = S.layar === "lupa" ? layarLupa() : layarMasuk(); return; }
  if (S.pengguna.perluAktivasi) { app.innerHTML = layarAktivasi(); return; }
  if (S.pengguna.wajibGanti) { app.innerHTML = layarGanti(); return; }
  const m = menu(); if (!m.includes(S.view)) S.view = "beranda";
  const u = S.pengguna, p = peranAktif();
  app.innerHTML = `<div class="shell">
   <aside class="side"><div class="brand"><img src="logo.png" alt="Logo Politeknik Pariwisata Bali"><div><b>Repositori UPW</b><span>Akreditasi LAMWisata</span></div></div>
    <nav class="nav" aria-label="Menu utama">${m.map(v => `<button data-go="${v}" ${S.view === v ? 'aria-current="page"' : ""}>${ic(v)}<span>${MENU_L[v]}</span></button>`).join("")}</nav>
    <div class="who"><div class="avatar">${esc(u.nama.split(" ").slice(0, 2).map(x => x[0]).join(""))}</div><div style="min-width:0"><div class="small" style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(u.nama)}</div><div class="small muted">${esc(PERAN_L[p])}</div></div></div></aside>
   <div class="main"><header class="top"><div class="brand-m"><img src="logo.png" alt=""><b>Repositori UPW</b></div>
    <span class="ta">Uji Coba v${K.versi}</span><span class="spacer"></span>
    ${u.peran.length > 1 ? `<label class="row small" style="gap:6px"><span class="muted">Peran</span><select id="peranSel" aria-label="Peran aktif" style="width:auto">${u.peran.map(r => `<option value="${r}" ${r === p ? "selected" : ""}>${PERAN_L[r]}</option>`).join("")}</select></label>` : ""}
    <button class="iconbtn" data-act="keluar" aria-label="Keluar" title="Keluar">${ic("keluar")}</button></header>
    <main class="content">${halaman()}</main></div></div>
   <nav class="tabbar" aria-label="Menu">${m.map(v => `<button data-go="${v}" ${S.view === v ? 'aria-current="page"' : ""}>${ic(v)}<span>${MENU_L[v]}</span></button>`).join("")}</nav>
   ${S.laci ? laci() : ""}`;
}
function halaman() {
  if (S.view === "pengguna") return hPengguna();
  if (S.view === "log") return hLog();
  if (S.view === "akun") return hAkun();
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
    <button class="btn" type="button" data-act="keLupa" style="justify-content:center">Lupa kata sandi</button></form>`);
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
  return `<div class="head"><div><h1>Halo, ${esc(u.nama.split(",")[0])}</h1><p>Anda masuk sebagai <b>${esc(PERAN_L[peranAktif()])}</b>${u.peran.length > 1 ? ". Ganti peran lewat pilihan Peran di bilah atas" : ""}.</p></div></div>
   <div class="callout"><b>Uji Coba v${K.versi} · Fondasi.</b> Yang sudah bisa dicoba: masuk, aktivasi akun dengan verifikasi email, lupa kata sandi, ganti kata sandi, peran ganda${menu().includes("pengguna") ? ", impor dan kelola pengguna" : ""}${menu().includes("log") ? ", serta log aktivitas" : ""}.
   Bagian berikutnya: biodata, kegiatan dan pengajuan surat tugas, verifikasi KPS, portofolio.</div>
   <section class="panel"><h2>Akun Anda</h2><div class="tbl-wrap"><table><tbody>
    <tr><td>NIM/NIP</td><td class="mono">${esc(u.username)}</td></tr><tr><td>Email</td><td>${esc(u.email || "–")}</td></tr>
    <tr><td>Peran</td><td>${u.peran.map(r => `<span class="tag t">${PERAN_L[r]}</span>`).join(" ")}</td></tr></tbody></table></div></section>`;
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
  const st = s => s === "aktif" ? '<span class="chip s-disetujui">Aktif</span>' : s === "impor" ? '<span class="chip s-draf">Belum aktivasi</span>' : '<span class="chip s-ditolak">Nonaktif</span>';
  return `<div class="head"><div><h1>Pengguna</h1><p>${sa ? "Semua akun. Super Admin dapat mengimpor semua peran, mereset kata sandi, dan mengatur peran." : "Akun mahasiswa. Admin Prodi dapat mengimpor mahasiswa."}</p></div></div>
   <section class="panel"><h2>Impor akun</h2>
    <p class="small muted">Satu baris per orang: <b>NIM/NIP; Nama lengkap${sa ? "; peran" : ""}</b>. ${sa ? "Peran dipisah koma, misalnya <span class=\"mono\">dosen,kps</span>. Tanpa peran = mahasiswa." : ""} Bisa ditempel langsung dari Excel (kolom dipisah tab juga diterima).</p>
    <textarea id="imporTeks" style="min-height:110px;margin-top:8px" placeholder="${sa ? "260101; Made Contoh\n198501012010121001; Ni Luh Contoh, M.Par.; dosen" : "260101; Made Contoh\n260102; Ketut Contoh"}">${esc(S.impor.teks)}</textarea>
    ${S.impor.hasil ? `<div class="auto" style="margin-top:8px"><b>${S.impor.hasil.diimpor}</b> akun diimpor.${S.impor.hasil.dilewati.length ? " Dilewati: " + S.impor.hasil.dilewati.map(x => `baris ${x.baris} (${esc(x.alasan)})`).join("; ") : ""}</div>` : ""}
    ${galatHtml()}<div class="row" style="margin-top:8px">${tombol("impor", "Impor")}</div></section>
   <section class="panel"><div class="row" style="justify-content:space-between;margin-bottom:8px"><h2>Daftar akun (${l.length})</h2>
    <div class="row"><input id="cariP" type="search" placeholder="Cari NIM/NIP, nama, email" value="${esc(S.cari)}" style="width:240px"><button class="btn sm" data-act="muatUlang">Muat ulang</button></div></div>
    <div class="tbl-wrap"><table><thead><tr><th>NIM/NIP</th><th>Nama</th>${sa ? "<th>Peran</th>" : ""}<th>Status</th><th>Email</th><th>Masuk terakhir</th>${sa ? "<th></th>" : ""}</tr></thead><tbody>
    ${l.map(x => `<tr><td class="mono">${esc(x.username)}</td><td>${esc(x.nama)}</td>${sa ? `<td>${x.peran.map(r => `<span class="tag t">${PERAN_L[r]}</span>`).join(" ")}</td>` : ""}<td>${st(x.status)}</td><td class="small">${esc(x.email || "–")}</td><td class="small num">${tgl(x.masukTerakhir)}</td>
     ${sa ? `<td><div class="row"><button class="btn sm" data-act="laciPeran" data-id="${x.id}">Peran</button><button class="btn sm" data-act="resetSandi" data-id="${x.id}">Reset sandi</button></div></td>` : ""}</tr>`).join("")}
    </tbody></table></div></section>`;
}
function hLog() {
  if (!S.log) { api("admin.log").then(j => { S.log = j.log; render(); }).catch(e => toast(e.message)); return `<div class="memuat">Memuat log…</div>`; }
  const nama = id => (S.daftar || []).find(x => x.id === id)?.nama || id || "sistem";
  return `<div class="head"><div><h1>Log aktivitas</h1><p>200 aktivitas terakhir: siapa, apa, kapan.</p></div><button class="btn" data-act="muatLog">Muat ulang</button></div>
   <div class="tbl-wrap"><table><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Detail</th></tr></thead><tbody>
   ${S.log.map(x => `<tr><td class="num small">${tgl(x.waktu)}</td><td>${esc(nama(x.userId))}</td><td class="mono small">${esc(x.aksi)}</td><td class="small mono">${esc(x.detail)}</td></tr>`).join("")}</tbody></table></div>`;
}
function laci() {
  const L = S.laci;
  if (L.jenis === "sandi") return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Kata sandi sementara">
   <div class="dh"><h2>Kata sandi sementara</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   <p>Berikan kata sandi ini kepada <b>${esc(L.nama)}</b> secara langsung. Kata sandi hanya ditampilkan sekali dan wajib diganti saat ia masuk.</p>
   <div class="sandi-baru">${esc(L.sandi)}</div><button class="btn" data-act="salinSandi">Salin</button></div></div>`;
  const x = S.daftar.find(y => y.id === L.id);
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Atur peran">
   <div class="dh"><h2>Peran ${esc(x.nama)}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   <div class="classgrid">${Object.keys(PERAN_L).map(r => `<label><input type="checkbox" data-peran="${r}" ${x.peran.includes(r) ? "checked" : ""}><span>${PERAN_L[r]}</span></label>`).join("")}</div>
   ${galatHtml()}<div class="row" style="justify-content:flex-end;margin-top:auto">${tombol("simpanPeran", "Simpan peran")}</div></div></div>`;
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
  async keluar() { try { await api("keluar"); } catch (_) {} aturToken(null); S.pengguna = null; S.daftar = null; S.log = null; S.layar = "masuk"; S.akt = { langkah: 1, email: "" }; render(); },
  aktSandi: () => jalankan(async () => { const a = mentah("p1"); cocok(a, mentah("p2")); S.pengguna = (await api("aktivasi.sandi", { sandiBaru: a })).pengguna; S.akt.langkah = 2; }),
  aktKirim: () => jalankan(async () => { const em = nilai("em"); S.akt.email = em; const j = await api("aktivasi.kirimKode", { email: em }); S.akt.terkirim = true; S.akt.kodeUji = j.kodeUji || ""; toast("Kode dikirim ke " + j.terkirimKe); }),
  aktVerif: () => jalankan(async () => { S.pengguna = (await api("aktivasi.verifikasi", { kode: nilai("kode") })).pengguna; S.view = "beranda"; toast("Akun aktif. Selamat datang!"); }),
  lupaKirim: () => jalankan(async () => { S.lupa.email = nilai("le"); if (!S.lupa.email) throw new Error("Isi email terdaftar."); const j = await api("lupa.kirimKode", { email: S.lupa.email }); S.lupa.langkah = 2; S.lupa.kodeUji = j.kodeUji || ""; }),
  lupaReset: () => jalankan(async () => { const a = mentah("l1"); cocok(a, mentah("l2")); const j = await api("lupa.reset", { email: S.lupa.email, kode: nilai("lk"), sandiBaru: a }); S.layar = "masuk"; toast(j.pesan); }),
  gantiWajib: () => jalankan(async () => { const a = mentah("g1"); cocok(a, mentah("g2")); S.pengguna = (await api("ganti.sandi", { sandiBaru: a })).pengguna; toast("Kata sandi tersimpan."); }),
  gantiSandi: () => jalankan(async () => { const a = mentah("a1"); cocok(a, mentah("a2")); S.pengguna = (await api("ganti.sandi", { sandiLama: mentah("a0"), sandiBaru: a })).pengguna; toast("Kata sandi berhasil diganti."); }),
  impor: () => jalankan(async () => {
    S.impor.teks = mentah("imporTeks");
    const baris = S.impor.teks.split(/\r?\n/).map(x => x.trim()).filter(Boolean).map(x => { const c = x.split(/\t|;/).map(y => y.trim()); return { username: c[0], nama: c[1], peran: c[2] || "mahasiswa" }; });
    if (!baris.length) throw new Error("Tempel minimal satu baris data.");
    S.impor.hasil = await api("admin.impor", { baris }); S.impor.teks = ""; S.daftar = null; toast(S.impor.hasil.diimpor + " akun diimpor.");
  }),
  muatUlang() { S.daftar = null; render(); },
  muatLog() { S.log = null; render(); },
  laciPeran(d) { S.laci = { jenis: "peran", id: d.id }; S.galat = ""; render(); },
  resetSandi: d => jalankan(async () => { const x = S.daftar.find(y => y.id === d.id); const j = await api("admin.resetSandi", { userId: d.id }); S.laci = { jenis: "sandi", nama: x.nama, sandi: j.sandiSementara }; }),
  simpanPeran: () => jalankan(async () => { const peran = CENTANG.filter(x => x.peran).map(x => x.peran); await api("admin.peran", { userId: S.laci.id, peran }); S.laci = null; S.daftar = null; toast("Peran disimpan."); }),
  salinSandi() { navigator.clipboard?.writeText(S.laci.sandi).then(() => toast("Disalin."), () => toast("Pilih teksnya lalu salin manual.")); },
  tutup() { S.laci = null; S.galat = ""; render(); },
  tutupLuar(d, e) { if (e.target === e.currentTarget || e.target.classList.contains("overlay")) { S.laci = null; render(); } }
};

document.addEventListener("click", e => {
  const b = e.target.closest("[data-go],[data-act]"); if (!b) return;
  if (b.dataset.go) { S.view = b.dataset.go; S.galat = ""; render(); window.scrollTo(0, 0); return; }
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
document.addEventListener("change", e => { if (e.target.id === "peranSel") { S.peran = e.target.value; ls.set("peran", S.peran); S.view = "beranda"; render(); } });
document.addEventListener("input", e => { if (e.target.id === "cariP") { S.cari = e.target.value; const pos = e.target.selectionStart; render(); const el = $("cariP"); el.focus(); el.setSelectionRange(pos, pos); } });
document.addEventListener("keydown", e => { if (e.key === "Escape" && S.laci) { S.laci = null; render(); } });

/* ---------- mulai ---------- */
(async function mulai() {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  if (S.token) {
    try { S.pengguna = (await api("saya")).pengguna; if (S.pengguna.perluAktivasi) S.akt.langkah = S.pengguna.wajibGanti ? 1 : 2; }
    catch (_) { aturToken(null); }
  }
  render();
})();
})();
