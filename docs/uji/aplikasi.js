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
  tugas: null, verif: null, ttd: null, ttdTab: "gambar", ttdTmp: null, ttdSurat: {} };
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
  ttd: '<path d="M3 17c3-1 4-7 6-7s1 6 3 6 2-4 4-4 2 3 5 3"/><path d="M3 21h18"/>'
};
const ic = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;
const MENU_L = { beranda: "Beranda", kegiatan: "Kegiatan", kps: "Antrean KPS", verif: "Verifikasi", ttd: "Tanda Tangan", biodata: "Biodata", cari: "Cari orang", pengguna: "Pengguna", log: "Log aktivitas", akun: "Akun saya" };

function peranAktif() {
  const r = S.pengguna ? S.pengguna.peran : [];
  if (!r.includes(S.peran)) S.peran = r[0];
  return S.peran;
}
function menu() {
  const p = peranAktif(), u = S.pengguna;
  if (u.perluBiodata) return ["biodata", "akun"];
  const m = ["beranda"];
  if (PERAN_KEG.includes(p)) m.push("kegiatan");
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
  if (!S.pengguna) { app.innerHTML = S.layar === "cek" ? layarCek() : S.layar === "lupa" ? layarLupa() : layarMasuk(); return; }
  if (S.pengguna.perluAktivasi) { app.innerHTML = layarAktivasi(); return; }
  if (S.pengguna.wajibGanti) { app.innerHTML = layarGanti(); return; }
  const m = menu(); if (!m.includes(S.view)) S.view = m[0];
  const u = S.pengguna, p = peranAktif();
  if (!S.tugas && !u.perluBiodata) muatTugas();
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
  return `<div class="head"><div><h1>Halo, ${esc(u.nama.split(",")[0])}</h1><p>Anda masuk sebagai <b>${esc(PERAN_L[peranAktif()])}</b>${u.peran.length > 1 ? ". Ganti peran lewat pilihan Peran di bilah atas" : ""}.</p></div></div>
   ${panelTugas()}
   <div class="callout"><b>Uji Coba v${K.versi} · Tanda tangan KPS dan QR.</b> Baru: surat pengantar yang terbit memuat kode QR untuk cek keaslian${u.peran.includes("kps") ? ", dan menu <b>Tanda Tangan Saya</b> untuk membuat atau mengunggah tanda tangan yang ditempel otomatis pada surat yang Anda setujui" : " dan tanda tangan KPS (bila KPS sudah menyimpannya)"}.
   Sudah ada: kegiatan dan surat tugas, unggah bukti bersama, batas hari kerja dan pengingat, verifikasi data, cek keaslian surat, biodata, pencarian orang.
   Bagian berikutnya: Portofolio Saya.</div>
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
  if (L.jenis === "keg") return laciForm();
  if (L.jenis === "kegDetail") return laciDetail();
  if (L.jenis === "surat") return laciSurat();
  if (L.jenis === "akred") return laciAkred();
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
  async keluar() { try { await api("keluar"); } catch (_) {} aturToken(null); S.pengguna = null; S.daftar = null; S.log = null; S.bio = null; S.dir = null; S.ref = null; S.keg = null; S.antrean = null; S.form = null; S.laci = null; S.tugas = null; S.verif = null; S.ttd = null; S.ttdSurat = {}; S.layar = "masuk"; S.akt = { langkah: 1, email: "" }; render(); },
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
function segarkan() { S.keg = null; S.antrean = null; S.verif = null; S.tugas = null; S.ttd = null; }
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
  if (S.token) {
    try { S.pengguna = (await api("saya")).pengguna; if (S.pengguna.perluAktivasi) S.akt.langkah = S.pengguna.wajibGanti ? 1 : 2; }
    catch (_) { aturToken(null); }
  }
  render();
})();
})();
