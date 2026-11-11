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
  bio: null, wil: null, dir: null, dirTab: "pegawai", dirQ: "", dirAngk: "", dirKelas: "" };
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
  keluar: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/>'
};
const ic = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;
const MENU_L = { beranda: "Beranda", biodata: "Biodata", cari: "Cari orang", pengguna: "Pengguna", log: "Log aktivitas", akun: "Akun saya" };

function peranAktif() {
  const r = S.pengguna ? S.pengguna.peran : [];
  if (!r.includes(S.peran)) S.peran = r[0];
  return S.peran;
}
function menu() {
  const p = peranAktif(), u = S.pengguna;
  if (u.perluBiodata) return ["biodata", "akun"];
  const m = ["beranda"];
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
  if (!S.pengguna) { app.innerHTML = S.layar === "lupa" ? layarLupa() : layarMasuk(); return; }
  if (S.pengguna.perluAktivasi) { app.innerHTML = layarAktivasi(); return; }
  if (S.pengguna.wajibGanti) { app.innerHTML = layarGanti(); return; }
  const m = menu(); if (!m.includes(S.view)) S.view = m[0];
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
  if (S.view === "biodata") return hBiodata();
  if (S.view === "cari") return hCari();
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
   <div class="callout"><b>Uji Coba v${K.versi} · Fondasi dan biodata.</b> Yang sudah bisa dicoba: masuk, aktivasi, lupa dan ganti kata sandi, peran ganda,
   ${u.jenisBiodata ? "biodata (dengan pembaruan tiap semester untuk mahasiswa), " : ""}pencarian dosen, tendik, dan mahasiswa${menu().includes("pengguna") ? ", impor dan kelola pengguna" : ""}${menu().includes("log") ? ", serta log aktivitas" : ""}.
   Bagian berikutnya: kegiatan dan pengajuan surat tugas, verifikasi KPS, portofolio.</div>
   <section class="panel"><h2>Akun Anda</h2><div class="tbl-wrap"><table><tbody>
    <tr><td>NIM/NIP</td><td class="mono">${esc(u.username)}</td></tr><tr><td>Email</td><td>${esc(u.email || "–")}</td></tr>
    ${u.jenisBiodata === "mahasiswa" ? `<tr><td>Kelas</td><td>${u.semesterMhs ? `Semester ${u.semesterMhs} – Kelas ${esc(u.kelas)}` : esc(u.kelas || "–")} · masuk ${esc(u.masuk || "–")} · ${esc(u.semesterKini.label)}</td></tr>` : ""}
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
  const sem = x => x.masuk ? (x.statusMhs === "A" && x.semesterMhs ? `Smt ${x.semesterMhs} – ${esc(x.kelas)}` : `Kelas ${esc(x.kelas)}`) + `<div class="small muted">masuk ${x.masuk} · ${esc(x.statusMhs)}</div>` : "–";
  const bio = x => !x.jenisBiodata ? '<span class="muted small">–</span>' : x.biodataLengkap ? '<span class="chip s-disetujui">Lengkap</span>' : '<span class="chip s-draf">Belum</span>';
  const st = s => s === "aktif" ? '<span class="chip s-disetujui">Aktif</span>' : s === "impor" ? '<span class="chip s-draf">Belum aktivasi</span>' : '<span class="chip s-ditolak">Nonaktif</span>';
  return `<div class="head"><div><h1>Pengguna</h1><p>${sa ? "Semua akun. Super Admin dapat mengimpor semua peran, mereset kata sandi, dan mengatur peran." : "Akun mahasiswa. Admin Prodi dapat mengimpor mahasiswa."}</p></div></div>
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
  async keluar() { try { await api("keluar"); } catch (_) {} aturToken(null); S.pengguna = null; S.daftar = null; S.log = null; S.bio = null; S.dir = null; S.layar = "masuk"; S.akt = { langkah: 1, email: "" }; render(); },
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
document.addEventListener("change", e => {
  const t = e.target;
  if (t.id === "peranSel") { S.peran = t.value; ls.set("peran", S.peran); S.view = "beranda"; render(); return; }
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
