/* Repositori Akreditasi UPW — tampilan (tanpa proses build). Berbicara dengan server Apps Script lewat api(). */
(function () {
"use strict";
const K = window.UPW_KONFIG;
const PERAN_L = { superadmin: "Super Admin", admin: "Admin Prodi", kps: "Koordinator Program Studi", gkm: "GKM (Gugus Kendali Mutu)", kalab: "Kepala Laboratorium",
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
  mkm: null, mkmSmt: "", sv: null, svForm: null, svSaya: null, svPub: null, nilai: null, nilaiTs: null, nilaiF: "", ded: null, dedTab: "narasi", dedF: "" };
/** Keadaan awal; dipakai untuk membersihkan SEMUA data saat keluar/sesi berakhir agar akun berikutnya tidak melihat data akun sebelumnya (v0.15.0). */
const S_AWAL = JSON.stringify(S), TETAP_S = ["token", "peran", "layar", "akt", "lupa", "cek"];
function bersihkanData() {
  const awal = JSON.parse(S_AWAL);
  Object.keys(S).forEach(k => { if (TETAP_S.includes(k)) return; if (k in awal) S[k] = awal[k]; else delete S[k]; });
}
const STATUS_MHS = { A: "Aktif", C: "Cuti", N: "Non-aktif", L: "Lulus", D: "Drop out / dikeluarkan", K: "Mengundurkan diri / keluar", M: "Mutasi / pindah", W: "Wafat" };

/* ---------- server ---------- */
/* v0.49.0: permintaan yang dikirim bersamaan (dalam satu putaran kode, mis. saat aplikasi dibuka atau halaman dimuat) digabung menjadi SATU
   panggilan "banyak". Setiap panggilan ke Apps Script membawa biaya tetap ±2 detik dan Apps Script membatasi proses bersamaan per akun pemilik,
   jadi lebih sedikit panggilan = lebih cepat dan lebih aman saat banyak pengguna membuka aplikasi bersamaan. */
const TANPA_GABUNG = new Set(["masuk", "keluar", "siapkan", "ping"]), MAKS_GABUNG = 12;
let ANTRE = null;
function api(aksi, data) {
  if (TANPA_GABUNG.has(aksi) || !S.token) return apiTunggal(aksi, data);
  return new Promise((res, rej) => {
    if (!ANTRE) { ANTRE = []; setTimeout(kirimAntre, 0); }
    ANTRE.push({ aksi, data: data || {}, res, rej });
  });
}
/* v0.49.1: batas waktu tunggu + coba ulang. Diamati di Produksi 22 Nov 2026: sesekali satu permintaan TIDAK PERNAH dijawab server Google
   (bank.data menggantung > 3 menit, permintaan yang sama dikirim ulang selesai dalam 5 dtk). Dulu aplikasi menunggu tanpa batas, sehingga
   halaman tetap "Memuat…" selamanya. Kini: permintaan baca dibatalkan setelah BATAS_BACA lalu dikirim ulang sekali; permintaan tulis tidak
   dikirim ulang otomatis (agar tidak tersimpan dua kali) dan pengguna diberi tahu untuk memeriksa hasilnya dulu. */
const BATAS_BACA = 30000, BATAS_TULIS = 120000, BATAS_BESAR = 300000;
const AKSI_BACA = /(^|\.)(data|daftar|saya|ref|rekap|antrean|riwayat|detail|lihat|kecil|status|biodata|dokDosen|rpsRef|saranInteg|cplMk|log|pengguna|publik|cek)$|^(saya|direktori|ping)$/;
const bolehUlang = aksi => AKSI_BACA.test(aksi) && !/^admin\.status/.test(aksi);
class GalatWaktu extends Error {}
async function kirimMentah(badan, batas) {
  const isi = JSON.stringify(badan), ac = typeof AbortController === "function" ? new AbortController() : null;
  const ms = batas || (isi.length > 500000 ? BATAS_BESAR : BATAS_TULIS);
  const jam = ac ? setTimeout(() => ac.abort(), ms) : null;
  let r;
  try { r = await fetch(K.api, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: isi, signal: ac ? ac.signal : undefined }); }
  catch (e) {
    clearTimeout(jam);
    if (ac && ac.signal.aborted) throw new GalatWaktu("Server tidak menjawab dalam " + Math.round(ms / 1000) + " detik.");
    throw new Error("Tidak dapat terhubung ke server. Periksa koneksi internet Anda.");
  }
  try { return await r.json(); } catch (_) { throw new Error("Jawaban server tidak terbaca. Coba lagi."); }
  finally { clearTimeout(jam); }
}
/** Kirim dengan batas waktu; permintaan baca dicoba sekali lagi bila server tidak menjawab atau koneksi putus. */
async function kirimAman(badan, semuaBaca) {
  try { return await kirimMentah(badan, semuaBaca ? BATAS_BACA : 0); }
  catch (e) {
    if (!semuaBaca) throw e instanceof GalatWaktu ? new Error(e.message + " Periksa dulu apakah perubahan Anda sudah tersimpan (muat ulang halaman) sebelum mencoba lagi.") : e;
    try { return await kirimMentah(badan, BATAS_BACA); }
    catch (e2) { throw new Error((e2 instanceof GalatWaktu ? e2.message : e2.message) + " Sudah dicoba dua kali; tekan Coba lagi sebentar lagi."); }
  }
}
function periksaJawaban(j) {
  if (!j || !j.ok) {
    if (/Sesi berakhir/.test((j && j.galat) || "")) { aturToken(null); bersihkanData(); S.layar = "masuk"; }
    throw new Error((j && j.galat) || "Terjadi kesalahan.");
  }
  return j;
}
async function apiTunggal(aksi, data) { return periksaJawaban(await kirimAman({ aksi, token: S.token || "", data: data || {} }, bolehUlang(aksi))); }
function kirimAntre() {
  const L = ANTRE || []; ANTRE = null;
  if (L.length === 1) { apiTunggal(L[0].aksi, L[0].data).then(L[0].res, L[0].rej); return; }
  for (let i = 0; i < L.length; i += MAKS_GABUNG) kirimGabung(L.slice(i, i + MAKS_GABUNG));
}
async function kirimGabung(B) {
  let j;
  const semuaBaca = B.every(x => bolehUlang(x.aksi));
  try { j = await kirimMentah({ aksi: "banyak", token: S.token || "", daftar: B.map(x => ({ aksi: x.aksi, data: x.data })) }, semuaBaca ? BATAS_BACA : 0); }
  catch (e) {
    // gabungan macet/putus: butir baca dikirim ulang satu per satu (agar satu permintaan lambat tidak menahan yang lain); butir tulis dilaporkan
    B.forEach(x => { if (bolehUlang(x.aksi)) apiTunggal(x.aksi, x.data).then(x.res, x.rej); else x.rej(e instanceof GalatWaktu ? new Error(e.message + " Periksa dulu apakah perubahan Anda sudah tersimpan sebelum mencoba lagi.") : e); });
    return;
  }
  if (!j || !Array.isArray(j.hasil)) {
    // server lama (tanpa aksi "banyak"): kirim satu per satu
    if (/tidak dikenal/i.test((j && j.galat) || "")) { B.forEach(x => apiTunggal(x.aksi, x.data).then(x.res, x.rej)); return; }
    B.forEach(x => { try { periksaJawaban(j); } catch (e) { x.rej(e); } }); return;
  }
  B.forEach((x, i) => { try { x.res(periksaJawaban(j.hasil[i])); } catch (e) { x.rej(e); } });
}
/** Label versi: "Uji Coba v…" di Uji Coba, "v…" di Produksi (v0.15.1). */
const LABEL_VERSI = (K.lingkungan === "uji" ? "Uji Coba v" : "v") + K.versi;
function aturToken(t) { S.token = t; ls.set("token", t); if (!t) ls.set("profil", null); }

/* ---------- utilitas ---------- */
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const $ = id => document.getElementById(id);
/** Tanggal hari ini menurut jam perangkat (bukan UTC), untuk nama berkas unduhan (v0.25.2). */
const hariIniLokal = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
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
  kembali: '<path d="M15 5l-7 7 7 7"/>',
  maju: '<path d="M9 5l7 7-7 7"/>',
  unduhan: '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 19h14"/>',
  gkm: '<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  rapat: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h3M8 17h6"/><path d="M15 15l1.5 1.5L19 14"/>',
  data: '<ellipse cx="12" cy="5.5" rx="7.5" ry="2.8"/><path d="M4.5 5.5v6.5c0 1.6 3.4 2.8 7.5 2.8s7.5-1.2 7.5-2.8V5.5"/><path d="M4.5 12v6.5c0 1.6 3.4 2.8 7.5 2.8s7.5-1.2 7.5-2.8V12"/>'
};
I.mkm = I.mk; // v0.39.0: Mata Kuliah Saya untuk mahasiswa
const ic = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;
const MENU_L = { beranda: "Beranda", kegiatan: "Kegiatan", kps: "Antrean KPS", verif: "Verifikasi", ttd: "Tanda Tangan", porto: "Portofolio", ilkps: "Tabel iLKPS", dprodi: "Data Prodi", setuju: "Kegiatan disetujui", survei: "Survei", penilaian: "Penilaian", ded: "DED", mk: "Mata Kuliah Saya", mkm: "Mata Kuliah Saya", bank: "Bank Dokumen", versi: "Riwayat Versi", lab: "Laboratorium", masukan: "Masukan", data: "Data Terkumpul", gkm: "Laporan GKM", rapat: "Rapat & Tindak Lanjut", biodata: "Biodata", cari: "Cari orang", pengguna: "Pengguna", log: "Log aktivitas", akun: "Akun saya" };

function peranAktif() {
  const r = S.pengguna ? S.pengguna.peran : [];
  if (!r.includes(S.peran)) S.peran = r[0];
  return S.peran;
}
function menu() {
  const p = peranAktif(), u = S.pengguna;
  if (u.perluBiodata) return ["biodata", "akun"];
  if (p === "asesor") return ["beranda", "ilkps", "setuju", "bank", "rapat", "cari", "akun"]; // v0.32.0: rapat dengan risalah final
  const m = ["beranda"];
  if (PERAN_KEG.includes(p)) m.push("kegiatan");
  if (u.peran.some(r => PERAN_KEG.includes(r))) m.push("porto");
  if (u.peran.includes("dosen")) m.push("mk");
  if (p === "mahasiswa") m.push("mkm"); // v0.39.0: MK yang diikuti + dosen pengajar
  if (["admin", "superadmin", "kps", "gkm"].includes(p)) m.push("penilaian", "ded", "bank", "ilkps", "dprodi", "survei", "gkm"); // v0.25.0: GKM
  if (["kps", "gkm", "admin", "superadmin", "dosen", "tendik", "kalab", "laboran"].includes(p)) m.push("rapat"); // v0.31.0: Rapat & Tindak Lanjut
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
  return [...new Set(m)]; // tanpa menu ganda (mis. GKM yang juga PJ Bank Dokumen)
}

/* ---------- render ---------- */
const app = $("app");
function render() {
  catatNavigasi();
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
   <div class="main"><header class="top">${tombolNavigasi()}<div class="brand-m"><img src="logo.png" alt=""><b>Repositori UPW</b></div>
    <span class="ta">${LABEL_VERSI}</span><span class="spacer"></span>
    ${u.peran.length > 1 ? `<label class="row small" style="gap:6px"><span class="muted">Peran</span><select id="peranSel" aria-label="Peran aktif" style="width:auto">${u.peran.map(r => `<option value="${r}" ${r === p ? "selected" : ""}>${PERAN_L[r]}</option>`).join("")}</select></label>` : ""}
    <button class="iconbtn" data-go="info" aria-label="Info dan panduan" title="Info dan panduan" ${S.view === "info" ? 'aria-current="page"' : ""}>${ic("info")}</button>
    <button class="iconbtn" data-act="keluar" aria-label="Keluar" title="Keluar">${ic("keluar")}</button></header>
    <main class="content">${kotakGagalMuat()}${halaman()}</main></div></div>
   <nav class="tabbar" aria-label="Menu">${m.map(v => `<button data-go="${v}" ${S.view === v ? 'aria-current="page"' : ""}>${ic(v)}<span>${MENU_L[v]}</span>${lencana(v)}</button>`).join("")}</nav>
   ${S.laci ? laci() : ""}${S.instr ? laciInstr() : ""}`;
}

/* ---------- Kembali / Maju (v0.25.2) ----------
   Setiap pindah halaman (menu) dicatat ke riwayat browser, sehingga tombol ← → di bilah atas, tombol mundur/maju mouse, dan gestur geser
   trackpad bekerja seperti di Chrome — juga di aplikasi terpasang yang tidak punya bilah alamat. */
let navI = history.state && history.state.upw ? history.state.i : 0, navMax = navI, navLihat = null, navDariPop = false;
function catatNavigasi() {
  if (!S.pengguna || S.layar === "survei") { navLihat = null; return; }
  if (navLihat === null) { navLihat = S.view; history.replaceState({ upw: 1, i: navI, v: S.view }, ""); return; }
  if (S.view === navLihat) return;
  navLihat = S.view;
  if (navDariPop) return;
  navI++; navMax = navI; history.pushState({ upw: 1, i: navI, v: S.view }, "");
}
window.addEventListener("popstate", e => {
  if (penLewati) { penLewati = false; return; }                 // v0.48.2: langkah mundur dari tombol Tutup penampil
  if (PEN) { tutupPenampil(true); return; }                     // tombol mundur menutup penampil berkas, halaman tetap
  const st = e.state; if (st && st.pen) { history.back(); return; }   // maju ke penampil yang sudah ditutup: lewati
  if (!st || !st.upw || !S.pengguna) return;
  if (!bolehTutup()) { history.go(st.i < navI ? 1 : -1); return; }
  navDariPop = true; navI = st.i; if (navI > navMax) navMax = navI;
  S.view = st.v; S.laci = null; S.galat = ""; if (st.v === "penilaian") S.nilai = null;
  render(); window.scrollTo(0, 0); navDariPop = false;
});
function tombolNavigasi() {
  if (!S.pengguna) return "";
  return `<div class="row nav-hist" style="gap:4px;flex-wrap:nowrap"><button class="iconbtn" data-act="navKembali" aria-label="Kembali ke halaman sebelumnya" title="Kembali" ${navI > 0 ? "" : "disabled"}>${ic("kembali")}</button>
    <button class="iconbtn" data-act="navMaju" aria-label="Maju ke halaman berikutnya" title="Maju" ${navI < navMax ? "" : "disabled"}>${ic("maju")}</button></div>`;
}

/* ---------- Penampil berkas di dalam aplikasi (v0.48.2) ----------
   Permintaan pemilik: PDF/gambar yang dibuka dari aplikasi dulu tampil di jendela baru yang mirip aplikasi, sehingga pengguna ragu menutupnya.
   Kini berkas tampil di lapisan penuh DI DALAM aplikasi dengan tombol "Kembali ke aplikasi" / ✕ / Esc / tombol mundur (browser, mouse, ← di bilah atas).
   penampil() dipanggil langsung saat klik (pengganti jendela kosong window.open) dan mengembalikan pengendali yang meniru jendela:
   w.tampil(url, nama, mime), w.location.href = url, w.close(), w.document.write() (diabaikan). Tautan ke situs lain tetap dibuka di jendela browser.
   Lapisan ini di luar render() (elemen sendiri di body) agar PDF tidak dimuat ulang setiap layar digambar ulang. */
let PEN = null, penLewati = false;
function penampil() {
  if (PEN) { PEN.muat(); return PEN; }
  const el = document.createElement("div");
  el.className = "penampil"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Penampil berkas");
  el.innerHTML = `<div class="pen-bar"><button class="btn sm primary pen-kembali" data-pen="tutup">${ic("kembali")}<span>Kembali ke aplikasi</span></button>
    <b class="pen-nama">Membuka berkas…</b><span class="pen-aksi row" style="gap:6px;flex-wrap:nowrap"></span>
    <button class="iconbtn" data-pen="tutup" aria-label="Tutup berkas" title="Tutup berkas (Esc)">✕</button></div><div class="pen-isi"></div>`;
  el.addEventListener("click", e => { if (e.target.closest("[data-pen=tutup]")) tutupPenampil(); });
  document.body.appendChild(el); document.body.classList.add("pen-buka");
  const c = {
    el,
    muat() { el.querySelector(".pen-nama").textContent = "Membuka berkas…"; el.querySelector(".pen-aksi").innerHTML = ""; el.querySelector(".pen-isi").innerHTML = '<div class="memuat">Membuka berkas…</div>'; },
    tampil(url, nama, mime) {
      let luar = false; try { luar = !/^blob:/.test(url) && new URL(url, location.href).origin !== location.origin; } catch (_) {}
      if (luar) {   // tautan situs lain: dibuka di browser; bila diblokir (dibuka setelah menunggu server), tampilkan tombolnya
        const jw = window.open(url, "_blank", "noopener"); if (jw) { tutupPenampil(); return; }
        el.querySelector(".pen-nama").textContent = "Tautan"; el.querySelector(".pen-aksi").innerHTML = "";
        el.querySelector(".pen-isi").innerHTML = `<div class="pen-gambar"><a class="btn primary" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Buka tautan di browser</a></div>`; return;
      }
      const n = nama || decodeURIComponent((String(url).split("?")[0].split("/").pop() || "berkas")).replace(/^[0-9a-f-]{36}$/, "berkas");
      el.querySelector(".pen-nama").textContent = n;
      el.querySelector(".pen-aksi").innerHTML = `<a class="btn sm" href="${esc(url)}" download="${esc(n)}">Unduh</a><a class="btn sm" href="${esc(url)}" target="_blank" rel="noopener" title="Bila berkas tidak tampil di sini">Buka di jendela baru</a>`;
      el.querySelector(".pen-isi").innerHTML = /^image\//.test(mime || "") ? `<div class="pen-gambar"><img src="${esc(url)}" alt="${esc(n)}"></div>` : `<iframe src="${esc(url)}" title="${esc(n)}"></iframe>`;
      el.querySelector(".pen-kembali").focus();
    },
    close() { tutupPenampil(); },
    location: { set href(u) { c.tampil(u); } },
    document: { write() {} }
  };
  c.muat(); PEN = c;
  history.pushState(Object.assign({}, history.state || {}, { pen: 1 }), "");
  return c;
}
function tutupPenampil(dariPop) {
  if (!PEN) return;
  PEN.el.remove(); PEN = null; document.body.classList.remove("pen-buka");
  if (!dariPop && history.state && history.state.pen) { penLewati = true; history.back(); }
}
/** Buka berkas statis (contoh PDF) di penampil. */
async function lihatBerkasUrl(url, nama) {
  // diambil dulu lalu dijadikan Blob berjenis tepat, agar PDF selalu tampil (bukan terunduh) walau server mengirim jenis berkas umum
  const w = penampil(), mime = /\.(png|jpe?g|webp)$/i.test(url.split("?")[0]) ? "image/" + (url.split("?")[0].split(".").pop().replace("jpg", "jpeg")) : "application/pdf";
  try { const r = await fetch(url); if (!r.ok) throw new Error("Berkas tidak bisa dibuka (" + r.status + ")."); w.tampil(URL.createObjectURL(new Blob([await r.arrayBuffer()], { type: mime })), nama, mime); }
  catch (e) { w.close(); toast(e.message || "Berkas tidak bisa dibuka."); }
}

/* ---------- Unduhan ----------
   v0.48.1 (permintaan pemilik): daftar unduhan buatan aplikasi (v0.25.2) dihapus. Semua berkas diunduh biasa oleh browser sehingga muncul di
   tombol unduhan Chrome/Edge (bisa dibuka langsung atau ditampilkan di Finder/File Explorer). Daftar lama di localStorage dibersihkan. */
try { Object.keys(localStorage).filter(k => /unduhan:/.test(k)).forEach(k => localStorage.removeItem(k)); } catch (_) {}
/** Angka kecil di menu: hal yang menunggu tindakan. */
function lencana(v) {
  const t = S.tugas; if (!t) return "";
  const n = v === "beranda" ? t.tugas.length + (t.undangan || []).length + (t.tlSaya || []).length : v === "verif" ? t.verifikasi : v === "kps" && peranAktif() === "kps" ? t.kps
    : v === "rapat" ? (["kps", "gkm"].includes(peranAktif()) ? t.tlVerif || 0 : 0) + (t.tlSaya || []).filter(x => x.terlambat).length : 0;
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
  if (S.view === "mkm") return hMkMhs();
  if (S.view === "bank") return hBank();
  if (S.view === "lab") return hLab();
  if (S.view === "info") return hInfo();
  if (S.view === "masukan") return hMasukan();
  if (S.view === "data") return hData();
  if (S.view === "gkm") return hGkm();
  if (S.view === "rapat") return hRapat();
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
   <details class="small"><summary style="cursor:pointer;font-weight:600">Panduan masuk pertama kali</summary><ol style="margin:8px 0 0 18px;padding:0;display:grid;gap:4px">${langkahMasuk().map(x => `<li>${x}</li>`).join("")}</ol></details>`);
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
   ${panelSurveiSaya()}${panelTugas()}${panelKesiapan()}
   ${K.lingkungan === "uji" ? `<div class="callout"><b>${LABEL_VERSI} · Perbaikan dari catatan prodi.</b> Baru di v0.49.1: halaman tidak lagi <b>Memuat…</b> selamanya bila server Google tidak menjawab: permintaan dibatalkan setelah 30 detik dan dikirim ulang otomatis, lalu muncul tombol <b>Coba lagi</b>. v0.49.0: aplikasi <b>lebih ringan dan tahan lama</b>: permintaan yang bersamaan digabung (membuka aplikasi kini 2 permintaan, bukan 5), Penilaian/iLKPS/Kesiapan disimpan sementara sampai data berubah, dan server merawat spreadsheet setiap hari agar tidak menyentuh batas 10 juta sel Google (Super Admin: Riwayat Versi › Kesehatan data). v0.48.2: PDF dan gambar kini dibuka <b>di dalam aplikasi</b>, dengan tombol <b>Kembali ke aplikasi</b> (juga ✕, Esc, atau tombol mundur). v0.48.1: tombol unduhan di dalam aplikasi dihapus; berkas yang diunduh kini muncul di <b>tombol unduhan Chrome/Edge</b> (bisa dibuka langsung atau ditampilkan di Finder). v0.48.0: <b>Pembebanan CPL per MK dari Excel</b> (Data Prodi › Kurikulum): CPL utama (wajib diukur di RPS), CPL penunjang, dan rasional untuk semua MK sekaligus, dengan pratinjau dan unduhan pemetaan + rekap per CPL. v0.47.0: tombol <b>Ubah nama / hapus</b> di daftar akun (Super Admin: ubah nama, nonaktifkan, hapus akun yang belum dipakai; Admin Prodi: ubah nama mahasiswa). v0.46.0: <b>CPL yang dibebankan per MK</b> ditetapkan KPS/Admin Prodi dan <b>unit kompetensi</b> per MK (Data Prodi › Kurikulum › CPL &amp; unit), dipakai templat dan pemeriksaan RPS serta Tabel 4; <b>Cocokkan dengan PDDikti</b> di Status dosen. v0.45.0: <b>nilai dari SIAKAD</b> (unggah template nilai per kelas, dibaca dan diperiksa otomatis), contoh dalam <b>PDF</b> (dibuka langsung), dan <b>Data bersama templat</b> (LMS, tempat, batas umpan balik, keterlambatan, peraturan akademik). v0.44.0: <b>Contoh</b> di setiap bagian Portofolio MK (contoh RPS, kontrak, rubrik, dan lembar penilaian lengkap) dan <b>saran penelitian/PkM tim</b> yang cocok dengan RPS untuk catatan integrasi. v0.43.1: keterangan <b>urutan pengisian</b> Portofolio MK (RPS dulu, lalu templat kontrak, rubrik, dan lembar penilaian). v0.43.0: templat <b>kontrak kuliah</b>, <b>rubrik penilaian</b>, dan <b>lembar portofolio penilaian (Excel)</b> terisi dari RPS; RPS resmi PDF + Word sumber untuk pemeriksaan; catatan <b>tanda tangan</b>; kualifikasi/jenjang dan jam sajian otomatis. v0.42.0: <b>templat RPS terisi otomatis</b> dan <b>pembaca RPS Word</b> di Portofolio MK (pemeriksaan butir 8, saran metode, CPL Tabel 4 otomatis), daftar 68 CPL prodi, Otorisasi templat RPS di Data Prodi › Kurikulum. v0.41.0: <b>unduh semua bukti Portofolio MK (ZIP)</b> per semester, per mata kuliah, atau per kelas (Data Prodi › Portofolio MK dan laci mata kuliah). v0.40.0: <b>Portofolio MK per kelas</b> (setiap kelas terpisah dan hanya terlihat oleh tim kelas itu; RPS bersama hanya untuk tim yang sama), dosen hanya melihat <b>peserta kelasnya</b>. v0.39.2: templat tim pengajar menerima <b>nama yang diketik</b> (tanpa gelar, inisial, NIP, atau minimal 2 kata nama) dengan tanda "Terbaca sebagai", dan pratinjau menampilkan <b>beban SKS per orang</b>. v0.39.1: Tabel 4 iLKPS menulis <b>semua kode kelompok</b> MK pilihan (mis. 231041217 / 231041215 / 231041216) dalam satu baris. v0.39.0: <b>peserta kelas</b> (otomatis per kelas, diatur per orang, dibagi per kelompok bahasa; juga lewat Excel), menu <b>Mata Kuliah Saya</b> untuk mahasiswa (MK dan dosen pengajar); SKS dibagi ke semua anggota tim termasuk praktisi. v0.38.0: <b>MK pilihan dengan kelompok paralel</b> (Bahasa Asing Pilihan Jepang/Jerman/Perancis): tim per kelas × kelompok, SKS penuh per kelompok, Portofolio MK per kelompok. v0.37.0: tombol <b>Edit</b> pada riwayat status mahasiswa (ganti SK yang salah, perbaiki tanggal/alasan/status; tercatat di Log). v0.36.1: templat tim pengajar selalu berisi <b>baris kelas A dan B</b> per mata kuliah, dan daftar nama selalu terbaru. v0.36.0: penanda <b>tanpa dosen pengampu</b> untuk Magang dan Tugas Akhir di Kurikulum. v0.35.0: <b>templat Excel tim pengajar</b> (KPS dan Admin Prodi) dengan hitungan <b>beban SKS per dosen</b> otomatis. v0.34.0: <b>kop surat prodi</b> di halaman pertama surat tugas, undangan rapat, risalah, daftar hadir, dan Laporan GKM. v0.33.0: <b>saran butir Matriks otomatis</b> saat mengetik agenda rapat, tindak lanjut, keputusan risalah, nama dokumen Bank, dan judul kegiatan, serta kotak <b>Cari butir</b> di Penilaian. v0.32.0: <b>risalah rapat</b> per agenda (keputusan otomatis jadi tindak lanjut), templat Word, daftar hadir PDF, dan pindaian risalah yang otomatis masuk Bank Dokumen. v0.31.0: menu <b>Rapat &amp; Tindak Lanjut</b>: undangan rapat dari KPS (surat PDF bertanda tangan, notifikasi dan jawaban kehadiran peserta) dan daftar tindak lanjut sampai terverifikasi. v0.30.0: tombol <b>i</b> berisi definisi dan kriteria skor instrumen LAMWisata di Penilaian, DED, Bank Dokumen, Tabel iLKPS, Data Prodi, Biodata, dan halaman lain. v0.29.0: <b>data dan bukti dosen praktisi</b> (Data Prodi › Praktisi) dan mata kuliah diampu TS-2 s.d. TS di Tabel 1–3. v0.28.0: <b>tim pengajar per kelas</b> di Data Prodi › Tim pengajar (sama untuk semua kelas, atau berbeda untuk kelas A dan kelas B). v0.27.0: daftar akun bisa disaring dan diurutkan, rekap per angkatan/kelas, <b>Ubah status</b> mahasiswa dengan alasan dan bukti (bisa banyak sekaligus), riwayat versi di Info. v0.26.0: halaman <b>Info</b> berisi 53 topik panduan sesuai peran, 30 gambar asli bertanda (nomor, kotak, panah; klik untuk memperbesar), dan kolom pencarian yang memahami pertanyaan. v0.25.2: tombol <b>← →</b> (kembali/maju) di bilah atas dan ikon <b>Unduhan</b> di pojok kanan atas, seperti di Chrome. v0.25.1: pratinjau impor Excel kini menampilkan <b>semua baris</b> dalam kotak bergulir (dengan nomor baris dan tahun masuk dari NIM); daftar panjang lain (riwayat keputusan, catatan lab, masalah impor) juga lengkap dan bisa digulir. Baru di v0.25.0: panel <b>Kesiapan akreditasi</b> di Beranda (KPS, Admin Prodi, Super Admin, GKM) berisi apa yang kurang dan saran tindakannya; peran baru <b>GKM (Gugus Kendali Mutu)</b> dan menu <b>Laporan GKM</b> per semester; istilah GPM diganti GKM. Di v0.24.0: <b>foto profil</b> (menu Akun saya) dan, untuk Super Admin, menu <b>Data Terkumpul</b> serta tombol <b>Sumber data</b> di setiap butir Penilaian (terima, minta revisi, tolak, hapus, pulihkan). v0.23.1: ikon aplikasi diperbesar (koper dan UPW memenuhi kotak). Baru di v0.23.0: tombol <b>Kirim masukan</b> di Info (masalah, saran, permintaan fitur; boleh lampirkan tangkapan layar), menu Masukan untuk Admin dan Super Admin. Di v0.22.0: gambar panduan bernomor di Info, ikon mata pada kata sandi, persentase biodata dari semua kolom, tombol unggah ijazah mengikuti pendidikan yang diisi, simpan unduhan ke folder pilihan (aplikasi terpasang), pintasan di ikon Dock. Tahap 3–5: tombol <b>Info</b> (ikon i di bilah atas) berisi panduan sesuai peran; dokumen pendukung biodata dosen dan pengingat; riwayat keputusan KPS; tanda tangan di atas nama; menu Laboratorium; tautan bukti di portofolio; aplikasi lebih cepat. Sebelumnya: impor dari Excel dengan templat (akun, biodata dosen, kurikulum, lulusan), unduh daftar akun, Data Prodi › Status dosen; tombol <b>Lihat</b> pada kolom kata sandi, pencarian dosen dengan inisial, angkatan dari NIM, menu mengikuti peran aktif, saran Pasal GCET saat mengetik judul, ikon aplikasi baru.${menu().includes("bank") ? " Sebelumnya: menu <b>Bank Dokumen</b>: 94 slot dokumen mutu untuk 47 butir Matriks yang dinilai GKM, dengan penanggung jawab, masa berlaku, dan riwayat versi; jumlah dokumen berlaku ikut tampil di Penilaian." : ""}${menu().includes("mk") ? " Sebelumnya: menu <b>Mata Kuliah Saya</b> (RPS, kontrak, rubrik, metode, integrasi, bukti pembelajaran)." : ""} Sudah ada juga: <b>DED</b> (narasi 64 butir, unduh Word) dan <b>Penilaian</b> (simulasi 84 butir). <b>Survei:</b> Baru${menu().includes("survei") ? ": menu <b>Survei</b> (templat Tabel 22 kepuasan mahasiswa dan Tabel 11 pengguna lulusan, anonim atau beridentitas, tautan tanpa login untuk alumni dan pengguna, rekap dan tindak lanjut); Tabel iLKPS kini lengkap 33 lembar" : ": survei dari prodi muncul di Beranda bila ada yang terbuka untuk Anda"}.
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
  (t.undangan || []).forEach(x => baris.push(`<div class="item" style="cursor:pointer" data-act="rapatBuka" data-id="${x.id}"><div class="body"><div class="title">${esc(x.judul)}</div><div class="meta"><span class="num">${esc(tglPanjang(x.tgl))}${x.jamMulai ? " · " + esc(x.jamMulai) : ""}</span><span>${esc(x.tempat || (x.tautan ? "Daring" : ""))}</span></div></div>
    ${x.status === "batal" ? `<div class="row bk-aksi"><span class="chip s-ditolak">Rapat dibatalkan</span><button class="btn sm" data-act="rapatBaca" data-id="${x.id}">Tutup</button></div>` : x.diperbarui ? `<div class="row bk-aksi"><span class="chip s-revisi">Undangan diperbarui</span><button class="btn sm" data-act="rapatBaca" data-id="${x.id}">Sudah dibaca</button></div>` : `<span class="chip s-diajukan">Undangan rapat</span>`}</div>`));
  (t.tlSaya || []).forEach(x => baris.push(`<div class="item" style="cursor:pointer" data-act="tlBukaDari" data-id="${x.id}"><div class="body"><div class="title">${esc(x.uraian)}</div><div class="meta"><span>Tindak lanjut tanggung jawab Anda</span>${x.tenggat ? `<span class="num">tenggat ${esc(tglPendek(x.tenggat))}</span>` : ""}</div></div><span class="chip ${x.terlambat ? "s-ditolak" : "s-revisi"}">${x.terlambat ? "Lewat tenggat" : "Tindak lanjut"}</span></div>`));
  if (t.tlVerif && ["kps", "gkm"].includes(peranAktif())) baris.push(`<div class="item" style="cursor:pointer" data-act="tlKeVerif"><div class="body"><div class="title">${t.tlVerif} tindak lanjut selesai menunggu verifikasi Anda</div></div><span class="chip s-diajukan">Verifikasi</span></div>`);
  if (t.verifikasi) baris.push(`<div class="item" style="cursor:pointer" data-go="verif"><div class="body"><div class="title">${t.verifikasi} data kegiatan menunggu verifikasi Anda</div></div><span class="chip s-diajukan">Verifikasi</span></div>`);
  (t.pengingat || []).forEach(x => baris.push(`<div class="item"><div class="body"><div class="title">${esc(x.pesan)}</div><div class="meta"><span>Pengingat dari ${esc(namaPendek(x.dari))} · ${esc(tglJam(x.dibuat))}</span></div></div><div class="row bk-aksi">${x.jenis === "dokumen" ? `<button class="btn sm" data-go="biodata">Buka Biodata</button>` : ""}<button class="btn sm" data-act="pengingatSelesai" data-id="${x.id}">Selesai</button></div></div>`));
  if (t.dokBelum && t.dokBelum.length && !(t.pengingat || []).some(x => x.jenis === "dokumen")) baris.push(`<div class="item" style="cursor:pointer" data-go="biodata"><div class="body"><div class="title">Lengkapi dokumen pendukung biodata</div><div class="meta"><span>Belum diunggah: ${esc(t.dokBelum.join(", "))}</span></div></div><span class="chip s-revisi">Biodata</span></div>`);
  (t.mkpBelumRps || []).forEach(m => baris.push(`<div class="item" style="cursor:pointer" data-act="mkpBuka" data-s="${m.semester}" data-kode="${esc(m.kode)}"><div class="body"><div class="title">${esc(m.kode)} · ${esc(m.nama)}</div><div class="meta"><span>Unggah RPS semester ini (Anda pengampu utama)</span></div></div><span class="chip s-revisi">RPS</span></div>`));
  (t.bankPerlu || []).forEach(x => baris.push(`<div class="item" style="cursor:pointer" data-go="bank"><div class="body"><div class="title">${esc(x.nama)}</div><div class="meta"><span>Bank Dokumen · butir ${x.butir} · Anda penanggung jawab</span></div></div><span class="chip ${ST_BANK[x.status][1]}">${ST_BANK[x.status][0]}</span></div>`));
  if (t.masukanBaru && ["superadmin", "admin"].includes(peranAktif())) baris.push(`<div class="item" style="cursor:pointer" data-go="masukan"><div class="body"><div class="title">${t.masukanBaru} masukan baru dari pengguna</div><div class="meta"><span>Laporan masalah, permintaan fitur, dan saran</span></div></div><span class="chip s-diajukan">Masukan</span></div>`);
  if (t.dedBelum) baris.push(`<div class="item" style="cursor:pointer" data-go="ded"><div class="body"><div class="title">${t.dedBelum} butir DED tanggung jawab Anda belum selesai</div><div class="meta"><span>Dari ${t.dedPj} butir yang ditugaskan kepada Anda</span></div></div><span class="chip s-revisi">DED</span></div>`);
  baris.push(...barisTugasGkm(t));
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
   ${hDaftarAkun(sa)}`;
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
  if (L.jenis === "peserta") return laciPeserta();
  if (L.jenis === "cplMk") return laciCplMk();
  if (L.jenis === "akunKelola") return laciAkunKelola();
  if (L.jenis === "tim") return laciTim();
  if (L.jenis === "rapat") return laciRapat();
  if (L.jenis === "rapatForm") return laciRapatForm();
  if (L.jenis === "tl") return laciTl();
  if (L.jenis === "tlForm") return laciTlForm();
  if (L.jenis === "risalahForm") return laciRisalahForm();
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
  if (L.jenis === "gbrBesar") return laciGambarBesar();
  if (L.jenis === "statusMhs") return laciStatusMhs();
  if (L.jenis === "statusMhsEdit") return laciStatusMhsEdit();
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
async function sekali(kunci, fn) {
  if (memuat[kunci]) return; memuat[kunci] = true;
  try { await fn(); if (S.gagalMuat && S.gagalMuat.kunci === kunci) { S.gagalMuat = null; render(); } }
  catch (e) { toast(e.message); if (S.token) { S.gagalMuat = { kunci, pesan: e.message, view: S.view }; render(); } }   // v0.49.1: tampilkan Coba lagi
  finally { memuat[kunci] = false; }
}
/** v0.49.1: kotak di atas halaman bila data gagal dimuat. Coba lagi = gambar ulang halaman, yang memicu pemuatan ulang data yang belum ada. */
function kotakGagalMuat() {
  const G = S.gagalMuat; if (!G || G.view !== S.view) return "";
  return `<div class="callout" role="alert" style="border-color:var(--bad)"><b>Data belum berhasil dimuat.</b> ${esc(G.pesan)}
    <div class="row" style="justify-content:flex-end;margin-top:6px"><button class="btn sm primary" data-act="cobaMuat">Coba lagi</button></div></div>`;
}
async function muatBiodata() {
  return sekali("bio", async () => { const j = await api("biodata.saya"); S.wil = j.wilayah; S.bio = { paket: j.biodata, data: Object.assign({}, j.biodata.data), lain: {} }; render(); });
}
function kabDari(prov) { const w = (S.wil || []).find(x => x[0] === prov); return w ? w[1] : []; }
function bidang(f, d, lama, ro) {
  const id = "bf-" + f.k, v = d[f.k] ?? "";
  const lab = `<label for="${id}">${esc(f.l)}${f.k === "statusDosen" ? " " + iBtn("def:dosen", "Status dosen") : ""}${f.t === "ro" ? "" : f.req ? ' <span style="color:var(--bad)" aria-label="wajib">*</span>' : ' <span class="muted small">(opsional)</span>'}${lama.includes(f.k) ? ' <span class="tag t" title="Terisi dari formulir lama; periksa dan koreksi bila perlu">data lama</span>' : ""}</label>`;
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
  if (!S.bio) {   // v0.49.0: dokumen pendukung (pegawai) dimuat bersamaan dengan biodata, digabung jadi satu permintaan
    muatBiodata(); if (!S.dokBio && S.pengguna && S.pengguna.jenisBiodata && S.pengguna.jenisBiodata !== "mahasiswa") muatDokBio();
    return `<div class="memuat">Memuat biodata…</div>`;
  }
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
   <p class="small">Status mahasiswa sekarang: ${chipSmhs(x.statusMhs || "A")}. Untuk mengubahnya (lulus, cuti, mengundurkan diri, dll.) beserta alasan dan bukti, pakai tombol <b>Ubah status</b> di daftar akun.</p>
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
    await api("admin.ubahMhs", { userId: S.laci.id, masuk: nilai("dmMasuk"), kelas: nilai("dmKelas"), statusMhs: (S.daftar.find(x => x.id === S.laci.id) || {}).statusMhs || "A" });
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
document.addEventListener("keydown", e => { if (e.key === "Escape" && PEN) { tutupPenampil(); return; } if (e.key === "Escape" && S.instr) { S.instr = null; render(); return; } if (e.key === "Escape" && S.laci) { S.laci = null; render(); } });

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
function segarkan() { S.rapat = null; S.tl = null; S.rapatRef = null; S.kesiapan = null; S.gkm = null; S.sdata = null; S.mskAdm = null; S.rkep = null; S.lab = null; S.dokd = null; S.dokBio = null; S.sdos = null; S.bank = null; S.mkp = null; S.mkpRekap = null; S.keg = null; S.antrean = null; S.verif = null; S.tugas = null; S.ttd = null; S.porto = null; S.ilkps = null; S.nilai = null; }
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
  const tg = terbit ? L.tglSurat : (S.ref ? S.ref.hariIni : hariIniLokal());
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
  return `<div class="kertas">${kopHtml()}${tanda}<p style="text-align:right">${esc(set.tempat)}, ${esc(tglSurat(tg))}</p>${isi}${ttd}</div>
    <div class="kertas">${tanda}<p style="font-size:10pt;color:#444">Lampiran surat ${terbit ? "dengan kode verifikasi " + esc(k.kodeSurat) : "(kode verifikasi terbit setelah disetujui KPS)"}</p>
     <p style="text-align:center;font-weight:700;margin:6px 0 12px">Daftar ${dsn ? (unsur(L.pegawai) === "dosen" ? "Dosen" : "Dosen dan Tenaga Kependidikan") : "Mahasiswa"} yang Ditugaskan<br>${esc(i.judul)}</p>${lamp}</div>`;
}
/* ---------- kop surat prodi (v0.34.0): hanya di halaman pertama ----------
   Sumber: "Kop Prodi UPW - Politeknik Pariwisata Bali Bahasa Indonesia [update 19 Nov 2026].docx" (Sekretaris Prodi). Logo: logo-kop.jpg (229 × 232 px).
   PDF: kop ada di ISI kertas pertama (bukan kepala halaman berulang), jadi tidak muncul lagi di halaman berikutnya. Word: UPW_DOCX blob({kop}).
   Di PDF baris kecil 9 pt (alamat 10 pt = 13,65 cm, lebih lebar dari ruang ±12,8 cm di samping logo); di Word tetap 10 pt (kolom 14,4 cm). */
const KOP = { rasio: 232 / 229, baris: [{ t: "PROGRAM STUDI SARJANA TERAPAN", b: 1, ukuran: 12 }, { t: "USAHA PERJALANAN WISATA", b: 1, ukuran: 16 },
  { t: "Jln. Dharmawangsa Kampial, Kel. Benoa, Kec. Kuta Selatan, Kab. Badung - Bali 80363", ukuran: 10 },
  { t: "Telepon (0361) 773537-773538-774818-774819; Pos-el: info@ppb.ac.id", ukuran: 10 }, { t: "Laman: www.ppb.ac.id", ukuran: 10 }] };
const kopHtml = () => `<div class="kop"><img src="logo-kop.jpg" alt="Logo Politeknik Pariwisata Bali"><div class="kop-teks">${KOP.baris.map(b => `<div style="font-size:${b.ukuran === 10 ? 9 : b.ukuran}pt;${b.b ? "font-weight:700" : ""}">${esc(b.t)}</div>`).join("")}</div></div>`;
let logoKopBytes = null;
/** Logo kop untuk dokumen Word (diambil sekali). */
async function kopWord() {
  if (!logoKopBytes) logoKopBytes = new Uint8Array(await (await fetch("logo-kop.jpg")).arrayBuffer());
  return { logo: logoKopBytes, rasio: KOP.rasio, baris: KOP.baris };
}
function cetakSurat(html) {
  let c = $("cetak");
  if (!c) { c = document.createElement("div"); c.id = "cetak"; document.body.appendChild(c); }
  // Halaman pertama yang berkop memakai margin atas lebih kecil (seperti berkas kop Word); halaman lain tetap 2,5 cm.
  c.innerHTML = (html.includes('class="kop"') ? "<style>@page :first{margin-top:1cm}</style>" : "") + html;
  const gbr = [...c.querySelectorAll("img")].filter(i => !i.complete);
  if (!gbr.length) { window.print(); return; }
  let sisa = gbr.length, selesai = false;
  const cetak = () => { if (!selesai) { selesai = true; window.print(); } };
  gbr.forEach(i => { i.onload = i.onerror = () => { if (--sisa <= 0) cetak(); }; });
  setTimeout(cetak, 3000);
}

/* --- daftar kegiatan --- */
function hKegiatan() {
  if (!S.ref || !S.keg) { if (!S.ref) muatRef(); if (!S.keg) muatKeg(); return `<div class="memuat">Memuat kegiatan…</div>`; }   // v0.49.0: dimuat bersamaan
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
   <span class="hint">Masuk ke <b>${esc(def.t)}</b>. Kolom formulir mengikuti tabel tersebut.${window.UPW_SARAN && UPW_SARAN.butirJenis(f.jenis).length ? ` Dipakai untuk butir Matriks: ${UPW_SARAN.butirJenis(f.jenis).map(n => n + " " + iBtn("b" + n, "Butir " + n)).join(", ")}` : ""}</span>
   ${def.cth.length ? `<div class="small" style="margin-top:2px"><span class="muted">Contoh kegiatan jenis ini:</span><ul style="margin:2px 0 0 18px;padding:0">${def.cth.map(c => `<li>${esc(c)}</li>`).join("")}</ul></div>` : ""}</div>
  <details class="picker" ${f.jq ? "open" : ""}><summary style="cursor:pointer" class="small"><b>Bingung memilih jenis?</b> Ketik kata kunci kegiatan Anda</summary>
   <input id="kfJq" type="search" value="${esc(f.jq)}" placeholder="Contoh: dosen tamu, lomba, MoU, desa wisata, magang" aria-label="Cari jenis kegiatan" style="margin-top:8px">
   ${kandidatJenis(f.jq).map(([j, w]) => `<button class="btn sm" data-act="pilihJenis" data-j="${j.k}" style="justify-content:flex-start;white-space:normal;text-align:left">${esc(j.l)} <span class="muted small">· ${esc(j.t)} · cocok: ${esc(w.join(", "))}</span></button>`).join("")
     || (f.jq.trim().length >= 2 ? `<span class="small muted">Belum ada yang cocok. Pilih "Lainnya" bila jenisnya memang belum tersedia; Admin akan memetakannya.</span>` : "")}
  </details>
  ${f.jenis === "lainnya" ? `<div class="field"><label for="kfJl">Sebutkan jenis kegiatannya${wajib}</label><input id="kfJl" data-kf="jenisLain" type="text" value="${esc(f.jenisLain)}" placeholder="Contoh: Familiarization trip"></div>` : ""}
  <div class="field"><label for="kfJudul">Judul / nama kegiatan${wajib}</label><input id="kfJudul" data-kf="judul" type="text" value="${esc(f.judul)}" placeholder="${esc(def.ex || "Tulis judul lengkap kegiatan")}" data-saran="kegjenis" data-saran-out="saKeg"><span class="hint">Tulis judul lengkap seperti di surat tugas atau sertifikat, tanpa singkatan. ${f.perluST ? "Tanpa tanggal dan tempat, karena keduanya ditulis terpisah di surat." : ""}</span>
   <div id="saKeg">${f.id ? "" : htmlSaran("kegjenis", f.judul, [f.jenis])}</div></div>
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
   `<div class="field"><label for="cekKode">Kode verifikasi</label><input id="cekKode" type="text" class="mono" value="${esc(c.kode)}" placeholder="UPW-2611-XXXXXXXX atau UND-2611-XXXXXXXX"></div>
    ${c.hasil && c.hasil.sah && c.hasil.jenisSurat === "undangan" ? `<div class="auto"><b>Undangan sah${c.hasil.batal ? `, tetapi rapat ini sudah <span style="color:var(--bad)">DIBATALKAN</span>` : ""}.</b> Diterbitkan melalui Repositori UPW pada ${esc(tglSurat(c.hasil.tglSurat))} oleh <b>${esc(c.hasil.kps)}</b>.<br>
      Undangan: <b>${esc(c.hasil.judul)}</b><br>${esc(tglPanjang(c.hasil.tgl))}${c.hasil.tempat ? " · " + esc(c.hasil.tempat) : ""}<br>Daftar undangan: ${c.hasil.jumlahUndangan} baris.</div>` :
    c.hasil ? (c.hasil.sah ? `<div class="auto"><b>Surat sah.</b> Diterbitkan melalui Repositori UPW pada ${esc(tglSurat(c.hasil.tglSurat))} dan disetujui oleh <b>${esc(c.hasil.kps)}</b>.<br>
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
  const w = penampil();
  if (w) w.document.write('<p style="font-family:sans-serif;padding:16px">Membuka berkas…</p>');
  try {
    const j = await api("bukti.lihat", { id, slot });
    const bin = atob(j.isi), arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([arr], { type: j.mime }));
    if (w && /pdf|image/.test(j.mime)) w.tampil(url, j.nama, j.mime);
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
/* v0.28.0: tim pengajar per kelas. */
const daftarTim = ang => ang.map((a, i) => i === 0 ? `<b>${esc(namaAnggota(a))}</b> <span class="muted">(utama)</span>` : esc(namaAnggota(a))).join(", ");
// v0.38.0: MK berkelompok paralel → kunci "KELAS/KELOMPOK" (kelas A dan B, ditambah kelas angkatan) × kelompok kurikulum.
const teksKelompok = l => typeof l === "string" ? l : (Array.isArray(l) ? l : []).map(g => g.n + (g.kode ? " (" + g.kode + ")" : "")).join(", "); // teks saat formulir sedang disimpan
const berkel = t => (t.kelompok || []).length > 0;
const kelasTim = t => berkel(t)
  ? [...new Set(["A", "B", ...(t.daftarKelas || []), ...Object.keys(t.kelas || {}).filter(k => k.includes("/")).map(k => k.split("/")[0])])].sort().flatMap(k => t.kelompok.map(g => k + "/" + g.n.toUpperCase()))
  : [...new Set([...(t.daftarKelas || []), ...Object.keys(t.kelas || {}).filter(Boolean)])].sort();
/** Label kunci tim: "A" → "Kelas A"; "A/JEPANG" → "Kelas A · Jepang". */
const labelKunciTim = (t, k) => { if (!k.includes("/")) return "Kelas " + k; const [kl, g] = k.split("/"), x = (t.kelompok || []).find(y => y.n.toUpperCase() === g); return "Kelas " + kl + " · " + (x ? x.n : g); };
/** Teks kunci untuk templat Excel: "A/Jepang". */
const teksKunciTim = (t, k) => { if (!k.includes("/")) return k; const [kl, g] = k.split("/"), x = (t.kelompok || []).find(y => y.n.toUpperCase() === g); return kl + "/" + (x ? x.n : g); };
function selTim(t) {
  if (t.tanpaTim) return '<span class="chip s-draf">Tanpa pengampu (magang/TA)</span>';
  if (!t.anggota.length) return '<span class="chip s-revisi">Belum ditetapkan</span>' + (berkel(t) ? `<div class="small muted">MK pilihan, kelompok: ${esc(t.kelompok.map(g => g.n).join(", "))}</div>` : "");
  if (!t.perKelas) return `${daftarTim(t.anggota)}${(t.daftarKelas || []).length > 1 ? ` <span class="muted">· semua kelas</span>` : ""}`;
  return kelasTim(t).map(k => `<div><span class="tag">${esc(labelKunciTim(t, k))}</span> ${(t.kelas[k] || []).length ? daftarTim(t.kelas[k]) : '<span class="chip s-revisi">Belum ditetapkan</span>'}</div>`).join("");
}
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
     ${ub ? `<div class="row" style="flex-wrap:wrap">${tombol("dpMkBaru", "+ Tambah mata kuliah", "primary")}<button class="btn" data-act="dpImporBuka">${S.dpImpor ? "Tutup impor" : "Impor (tempel atau berkas Excel)"}</button><button class="btn" data-act="rpsOtorBuka">${S.rpsOtorBuka ? "Tutup data bersama templat" : "Data bersama templat"}</button></div>` : ""}
     ${D.bolehCplMk ? `<div class="row" style="flex-wrap:wrap"><button class="btn" data-act="cplImporBuka">${S.cplImpor ? "Tutup pembebanan CPL" : "Pembebanan CPL per MK (Excel)"}</button></div>` : ""}
     ${S.cplImpor && D.bolehCplMk ? panelCplImpor() : ""}
     ${S.rpsOtorBuka ? panelOtorRps() : ""}
     ${S.dpImpor ? `<section class="panel"><h2>Impor kurikulum</h2><p class="small">Salin baris dari Excel lalu tempel di sini. Urutan kolom: <b>Kode; Nama mata kuliah; Semester (1–8); sks kuliah; sks seminar; sks praktik/praktikum; Kompetensi (Ya/Tidak)</b>. Pemisah boleh tab (hasil salin Excel) atau titik koma. Kode yang sudah ada akan diperbarui.</p>
       <textarea id="dpImporTeks" rows="6" placeholder="UPW201&#9;Travel Agency Operation&#9;2&#9;1&#9;0&#9;2&#9;Ya"></textarea>${galatHtml()}<div class="row" style="justify-content:flex-end">${tombol("dpImporSimpan", "Impor")}</div>${panelImporExcel("mk")}</section>` : ""}
     <div class="tbl-wrap"><table><thead><tr><th>Smt</th><th>Kode</th><th>Mata kuliah</th><th>Kompetensi</th><th>Kuliah</th><th>Seminar</th><th>Praktik</th><th>CPL</th><th>RPS</th>${ub ? "<th></th>" : ""}</tr></thead><tbody>
     ${D.mk.map(m => `<tr><td class="num">${m.semester}</td><td class="mono">${esc(m.kode)}</td><td>${esc(m.nama)}${m.tanpaTim ? ' <span class="tag" title="Tanpa dosen pengampu">tanpa pengampu</span>' : ""}${(m.kelompok || []).length ? `<div class="small muted">Kelompok: ${m.kelompok.map(g => esc(g.n) + (g.kode ? ` <span class="mono">${esc(g.kode)}</span>` : "")).join(", ")}</div>` : ""}</td><td>${m.kompetensi ? '<span class="tag t">Ya</span>' : "–"}</td><td class="num">${m.sksKuliah}</td><td class="num">${m.sksSeminar}</td><td class="num">${m.sksPraktik}</td>
       <td class="small">${(m.cplMk || []).length ? `<span class="chip s-disetujui" title="${esc("Utama: " + m.cplMk.join(", ") + ((m.cplSek || []).length ? " · Penunjang: " + m.cplSek.join(", ") : ""))}">${m.cplMk.length} CPL utama${(m.cplSek || []).length ? ` + ${m.cplSek.length} penunjang` : ""}</span>` : [["S", m.cplSikap], ["P", m.cplPengetahuan], ["KU", m.cplKu], ["KK", m.cplKk]].filter(x => x[1] || (m.rpsBaca && m.rpsBaca.unsur.includes(x[0]))).map(x => x[0]).join(", ") || "–"}
         <div><button class="lnk" data-act="cplMkBuka" data-kode="${esc(m.kode)}">CPL &amp; unit${(m.unitKomp || []).length ? ` (${m.unitKomp.length} unit)` : ""}</button></div></td><td class="small">${m.rps ? (m.rps === "Ada" ? "Ada" : `<a href="${esc(m.rps)}" target="_blank" rel="noopener noreferrer">Tautan</a>`) : m.rpsBaca ? `<span class="chip s-disetujui" title="Dari RPS Word yang diunggah di Portofolio MK">RPS ${esc(m.rpsBaca.label)}</span>` : '<span class="chip s-revisi">Belum</span>'}</td>
       ${ub ? `<td><button class="btn sm" data-act="dpMkUbah" data-kode="${esc(m.kode)}">Ubah</button></td>` : ""}</tr>`).join("") || `<tr><td colspan="10"><div class="empty">Belum ada mata kuliah. ${ub ? "Tambahkan satu per satu atau impor dari Excel." : ""}</div></td></tr>`}</tbody></table></div>`;
  }
  if (S.dpTab === "tim") {
    const isiN = D.tim.filter(t => t.anggota.length && !t.tanpaTim).length, perluTim = D.tim.filter(t => !t.tanpaTim).length, nTanpa = D.tim.length - perluTim;
    isi = `<div class="row" style="justify-content:space-between;flex-wrap:wrap"><label class="row small" style="gap:6px"><b>Semester</b><select id="dpSmt" style="width:auto">${D.pilihanSemester.map(s => `<option value="${s.kode}" ${s.kode === D.semester ? "selected" : ""}>${esc(s.label)}</option>`).join("")}</select></label>
      <span class="small num">${isiN} dari ${perluTim} mata kuliah ${/-1$/.test(D.semester) ? "ganjil" : "genap"} sudah punya tim${nTanpa ? ` · ${nTanpa} tanpa pengampu (magang/TA)` : ""}</span></div>
     <div class="callout">Tim pengajar berlaku <b>satu semester</b>: satu <b>pengampu utama</b> (dosen) dan maksimal 3 orang per tim, termasuk praktisi. Tim bisa <b>sama untuk semua kelas</b> atau <b>berbeda per kelas</b> (kelas A, kelas B). Data ini mengisi kolom mata kuliah yang diampu (Tabel 1–3) dan EWMP (Tabel 6; sks dihitung per kelas yang diajar).</div>
     ${D.bolehImporTim && ["kps", "admin"].includes(peranAktif()) ? panelImporExcel("tim") : ""}
     <div class="tbl-wrap"><table><thead><tr><th>Kode</th><th>Mata kuliah</th><th>Sks</th><th>Tim pengajar ${esc(D.labelSemester)}</th>${ub ? "<th></th>" : ""}<th></th></tr></thead><tbody>
     ${D.tim.map(t => `<tr><td class="mono">${esc(t.kode)}</td><td>${esc(t.nama)}</td><td class="num">${t.sks}</td><td class="small">${selTim(t)}</td>
       ${ub ? `<td>${t.tanpaTim ? "" : `<button class="btn sm" data-act="dpTimAtur" data-kode="${esc(t.kode)}">${t.anggota.length ? "Ubah tim" : "Tetapkan tim"}</button>`}</td>` : ""}
       <td>${t.tanpaTim ? "" : `<button class="btn sm" data-act="pesertaBuka" data-s="${esc(D.semester)}" data-kode="${esc(t.kode)}">Peserta</button>`}</td></tr>`).join("") || `<tr><td colspan="5"><div class="empty">Belum ada mata kuliah ${/-1$/.test(D.semester) ? "semester ganjil" : "semester genap"} di kurikulum.</div></td></tr>`}</tbody></table></div>
     ${ub ? `<div class="row">${tombol("dpTimSalin", "Salin dari " + D.salinDari, "")}</div>` : ""}`;
  }
  if (S.dpTab === "praktisi") {
    const nSlot = (D.slotBuktiPraktisi || []).length;
    isi = `<p class="small muted">Dosen industri/praktisi yang mengajar dalam tim pengajar (Tabel 2). Praktisi tidak perlu akun aplikasi.</p>
     <div class="callout"><b>Kriteria LAMWisata (Matriks butir 16):</b> karyawan atau pemilik usaha dengan pengalaman kerja sesuai bidang prodi, dinilai dari
      <b>portofolio dan latar belakang pendidikan</b>: pengalaman kerja <b>minimal 5 tahun</b> dan/atau <b>pernah memimpin tim</b>; direkrut melalui
      <b>kerja sama</b> dengan perusahaan/industri. Simpan buktinya (CV, ijazah, sertifikat, bukti jabatan, dokumen kerja sama) lewat tombol ${ub ? "Ubah" : "Lihat"}.</div>
     ${ub ? `<div class="row">${tombol("dpPrakBaru", "+ Tambah praktisi", "primary")}</div>` : ""}
     <div class="tbl-wrap"><table><thead><tr><th>Nama</th><th>Perusahaan/industri</th><th>Jabatan &amp; pengalaman</th><th>Pendidikan</th><th>Bidang keahlian</th><th>Sertifikat</th><th>Kriteria</th><th>Bukti</th><th></th></tr></thead><tbody>
     ${D.praktisi.map(x => { const nb = Object.keys(x.bukti || {}).length; return `<tr><td>${esc(x.nama)}${x.nidk ? `<br><span class="mono small muted">NIDK ${esc(x.nidk)}</span>` : ""}</td><td class="small">${esc(x.perusahaan)}</td>
       <td class="small">${esc(x.jabatan || "–")}${x.pengalaman !== "" && x.pengalaman !== undefined ? `<br><span class="muted">${esc(String(x.pengalaman).replace(".", ","))} tahun</span>` : ""}${x.memimpinTim ? `<br><span class="muted">memimpin tim</span>` : ""}</td>
       <td class="small">${esc(x.pendidikan || "–")}</td><td class="small">${esc(x.bidang || "–")}</td><td class="small">${esc(x.sertifikat || "–")}${x.penerbit ? `<br><span class="muted">${esc(x.penerbit)}</span>` : ""}</td>
       <td>${x.memenuhi ? '<span class="chip s-disetujui">Memenuhi</span>' : '<span class="chip s-revisi">Lengkapi</span>'}</td><td class="small num">${nb}/${nSlot}</td>
       <td><button class="btn sm" data-act="dpPrakUbah" data-id="${x.id}">${ub ? "Ubah" : "Lihat"}</button></td></tr>`; }).join("") || `<tr><td colspan="9"><div class="empty">Belum ada praktisi.</div></td></tr>`}</tbody></table></div>`;
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
   ${REF_DP[S.dpTab] ? `<div class="row small" style="margin:-4px 0 10px;flex-wrap:wrap;gap:6px"><span class="muted">Definisi dan kriteria LAMWisata untuk data di tab ini:</span>${iTombol(REF_DP[S.dpTab])}</div>` : ""}
   ${S.laci ? "" : galatHtml()}${isi}`;
}
// v0.36.0: MK baru bernama Magang / Tugas Akhir / Skripsi / PKL → "tanpa dosen pengampu" tercentang otomatis (selama belum diubah manual).
const POLA_TANPA_TIM = /magang|tugas akhir|skripsi|praktik kerja lapang|praktek kerja lapang|\bpkl\b|internship|on the job training|\bojt\b/i;
document.addEventListener("input", e => { if (e.target.id === "mkNama" && S.laci && S.laci.jenis === "mk" && !S.laci.m && !S.laci.tanpaDisentuh && $("mkTanpa")) $("mkTanpa").checked = POLA_TANPA_TIM.test(e.target.value); });
document.addEventListener("change", e => { if (e.target.id === "mkTanpa" && S.laci) S.laci.tanpaDisentuh = true; });
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
   <div class="field"><label for="mkKel">Kelompok paralel (MK pilihan)</label><input id="mkKel" type="text" maxlength="300" value="${esc(teksKelompok(m.kelompok))}" placeholder="Contoh: Jepang (231041217), Jerman (231041215), Perancis (231041216)">
    <span class="hint">Isi hanya untuk MK pilihan yang kelasnya dipecah menjadi kelompok dengan dosen berbeda, mis. Bahasa Asing Pilihan. Tulis nama kelompok dan kode MK-nya dalam kurung, dipisah koma. Setiap kelompok dihitung satu kelas utuh (SKS penuh untuk pengampunya). Kosongkan untuk MK biasa.</span></div>
   <div class="field"><span style="font-weight:600;font-size:.82rem">Dosen pengampu</span><div class="classgrid">${cek("mkTanpa", "Tanpa dosen pengampu (magang / tugas akhir)", m.tanpaTim === undefined ? false : m.tanpaTim)}</div>
    <span class="hint">Centang untuk MK yang tidak diajar tim dosen: mahasiswa langsung ke industri (magang) atau ke pembimbing masing-masing (tugas akhir). MK ini tidak perlu tim pengajar dan tidak masuk beban SKS. Tercentang otomatis untuk MK baru bernama Magang, Tugas Akhir, Skripsi, atau PKL.</span></div>
   ${galatHtml()}<div class="row" style="justify-content:space-between;margin-top:auto">${S.laci.m ? tombol("dpMkHapus", "Hapus", "bad") : "<span></span>"}${tombol("dpMkSimpan", "Simpan")}</div></div></div>`;
}
function laciTim() {
  const D = S.dp, t = D.tim.find(x => x.kode === S.laci.kode), L = S.laci, kls = kelasTim(t);
  const nilaiA = ang => [0, 1, 2].map(i => ang && ang[i] ? ang[i].t + ":" + ang[i].id : "");
  if (!L.isi) {
    L.mode = t.perKelas || berkel(t) ? "kelas" : "sama";
    L.isi = { "": nilaiA(t.perKelas ? null : t.kelas[""]) };
    kls.forEach(k => { L.isi[k] = nilaiA(t.perKelas ? t.kelas[k] : t.kelas[""]); });
  }
  const opsi = (sel, prak) => `<option value="">${prak ? "– tidak ada –" : "Pilih dosen"}</option><optgroup label="Dosen">${D.dosen.map(x => `<option value="u:${x.id}" ${sel === "u:" + x.id ? "selected" : ""}>${esc(namaPendek(x.nama))}${x.inisial ? " (" + esc(x.inisial) + ")" : ""}</option>`).join("")}</optgroup>
    ${prak ? `<optgroup label="Praktisi">${D.praktisi.map(x => `<option value="p:${x.id}" ${sel === "p:" + x.id ? "selected" : ""}>${esc(x.nama)} · ${esc(x.perusahaan)}</option>`).join("")}</optgroup>` : ""}`;
  const id = (k, i) => k === "" ? "tim" + i : `timK-${k}-${i}`;
  const isian = k => { const v = L.isi[k] || ["", "", ""]; return `<div class="field"><label for="${id(k, 0)}">Pengampu utama${k ? " " + esc(labelKunciTim(t, k).replace(/^Kelas/, "kelas")) : ""}${wajib}</label><select id="${id(k, 0)}" data-tpk="${esc(k)}" data-tpi="0">${opsi(v[0], false)}</select></div>
   <div class="field"><label for="${id(k, 1)}">Anggota tim 2</label><select id="${id(k, 1)}" data-tpk="${esc(k)}" data-tpi="1">${opsi(v[1], true)}</select></div>
   <div class="field"><label for="${id(k, 2)}">Anggota tim 3</label><select id="${id(k, 2)}" data-tpk="${esc(k)}" data-tpi="2">${opsi(v[2], true)}</select></div>`; };
  const pilih = (v, l, h) => `<label class="row small" style="gap:8px;align-items:flex-start;cursor:pointer"><input type="radio" name="timMode" value="${v}" ${L.mode === v ? "checked" : ""} style="width:auto;margin-top:3px"><span><b>${l}</b><br><span class="muted">${h}</span></span></label>`;
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Tim pengajar" style="width:min(560px,100%)">
   <div class="dh"><h2>Tim pengajar ${esc(t.kode)}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   <p class="small">${esc(t.nama)} · ${t.sks} sks · <b>${esc(D.labelSemester)}</b>${kls.length ? ` · kelas ${kls.map(esc).join(", ")}` : ""}</p>
   ${berkel(t) ? `<div class="callout small">MK pilihan dengan kelompok paralel (${esc(t.kelompok.map(g => g.n + (g.kode ? " " + g.kode : "")).join(", "))}). Tetapkan pengampu setiap kelompok di setiap kelas; setiap kelompok dihitung satu kelas utuh (SKS penuh untuk pengampu tunggal).</div>` : ""}
   ${kls.length > 1 && !berkel(t) ? `<fieldset class="field" style="border:0;padding:0;margin:0"><legend style="font-weight:600;font-size:.82rem;margin-bottom:6px">Pengajar di setiap kelas</legend><div class="grid" style="gap:8px">
     ${pilih("sama", "Sama untuk semua kelas", "Tim yang sama mengajar kelas " + kls.map(esc).join(" dan ") + ".")}${pilih("kelas", "Berbeda per kelas", "Setiap kelas punya tim sendiri (boleh sebagian sama).")}</div></fieldset>` : ""}
   ${L.mode === "kelas" ? kls.map(k => `<section class="card" style="padding:12px;margin:0 0 10px"><h3 style="margin:0 0 8px;font-size:.95rem">${esc(labelKunciTim(t, k))}</h3>${isian(k)}</section>`).join("") : isian("")}
   <span class="hint">Praktisi belum ada di daftar? Tambahkan dulu di tab Praktisi. ${L.mode === "kelas" ? "Kosongkan pengampu utama suatu kelas bila tim kelas itu belum ditetapkan." : "Kosongkan pengampu utama untuk menghapus tim semester ini."} Sks EWMP dihitung per kelas yang diajar.</span>
   ${galatHtml()}<div class="row" style="justify-content:flex-end;margin-top:auto">${tombol("dpTimSimpan", "Simpan tim")}</div></div></div>`;
}
document.addEventListener("change", e => {
  const el = e.target; if (!S.laci || S.laci.jenis !== "tim" || !S.laci.isi) return;
  if (el.dataset && el.dataset.tpk !== undefined) { const k = el.dataset.tpk; (S.laci.isi[k] = S.laci.isi[k] || ["", "", ""])[Number(el.dataset.tpi)] = el.value; return; }
  if (el.name === "timMode" && el.value !== S.laci.mode) {
    const L = S.laci, kls = Object.keys(L.isi).filter(Boolean);
    // Pindah mode: isian yang sudah dipilih dibawa (sama → semua kelas diisi tim yang sama; per kelas → tim kelas pertama).
    if (el.value === "kelas" && L.isi[""].some(Boolean)) kls.forEach(k => { if (!L.isi[k].some(Boolean)) L.isi[k] = L.isi[""].slice(); });
    if (el.value === "sama" && !L.isi[""].some(Boolean)) { const k = kls.find(x => L.isi[x].some(Boolean)); if (k) L.isi[""] = L.isi[k].slice(); }
    L.mode = el.value; S.galat = ""; render();
  }
});
function laciPraktisi() {
  const D = S.dp, x = S.laci.x || {}, ub = D.bolehUbah, dis = S.sibuk ? "disabled" : "";
  const f = (id, k, l, ph, req, extra) => `<div class="field"><label for="${id}">${l}${req && ub ? wajib : ""}</label><input id="${id}" type="text" value="${esc(x[k] === undefined || x[k] === null ? "" : String(x[k]))}" placeholder="${esc(ph)}" ${ub ? "" : "disabled"} ${extra || ""}></div>`;
  const B = x.bukti || {}, tSlot = S.laci.tautSlot;
  const baris = s0 => { const e = B[s0.k];
    const status = !e ? '<span class="chip s-revisi">Belum ada</span>' : e.t === "tautan" ? `<a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">Buka tautan</a>`
      : `<button class="lnk" data-act="dpPrakLihat" data-slot="${s0.k}">${esc(e.nama)}</button> <span class="muted">${ukuranT(e.ukuran || 0)}</span>`;
    return `<div style="padding:8px 0;border-top:1px solid var(--line)"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:6px"><b class="small">${esc(s0.l)}</b><span class="small">${status}</span></div>
      ${ub ? `<div class="row small" style="flex-wrap:wrap;gap:6px;margin-top:6px"><label class="btn sm" ${S.sibuk ? 'aria-disabled="true"' : ""}>${e ? "Ganti dengan file" : "Unggah file"}<input type="file" data-pfile="${s0.k}" accept=".pdf,.jpg,.jpeg,.png" hidden ${dis}></label>
        <button class="btn sm" data-act="dpPrakTautan" data-slot="${s0.k}" ${dis}>${e ? "Ganti dengan tautan" : "Tempel tautan"}</button>${e ? `<button class="btn sm bad" data-act="dpPrakBuktiHapus" data-slot="${s0.k}" ${dis}>Hapus</button>` : ""}</div>
        ${tSlot === s0.k ? `<div class="row" style="gap:6px;margin-top:6px"><input id="prTaut" type="url" placeholder="https://drive.google.com/…" aria-label="Tautan ${esc(s0.l)}" style="flex:1"><button class="btn sm primary" data-act="dpPrakTautanSimpan" data-slot="${s0.k}" ${dis}>Simpan tautan</button></div>` : ""}` : ""}</div>`; };
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Praktisi" style="width:min(600px,100%)">
   <div class="dh"><h2>${!ub ? "Data praktisi" : x.id ? "Ubah praktisi" : "Tambah praktisi"}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   ${f("prNama", "nama", "Nama lengkap dengan gelar", "Contoh: Made Wirawan, S.Par.", 1)}${f("prPer", "perusahaan", "Perusahaan / industri asal", "Contoh: PT Bali Tour Nusantara", 1)}
   <div class="grid g2" style="gap:10px">${f("prJab", "jabatan", "Jabatan di perusahaan", "Contoh: General Manager; Owner")}${f("prPeng", "pengalaman", "Lama pengalaman kerja sesuai bidang (tahun)", "Contoh: 12", 0, 'inputmode="decimal"')}</div>
   <label class="row small" style="gap:8px;margin:-4px 0 10px"><input id="prPimpin" type="checkbox" ${x.memimpinTim ? "checked" : ""} ${ub ? "" : "disabled"} style="width:auto"> Pernah memimpin tim di tempat kerjanya (mis. manajer, kepala divisi, pemilik usaha)</label>
   <div class="grid g2" style="gap:10px">${f("prNidk", "nidk", "NIDK (bila ada)", "")}${f("prPend", "pendidikan", "Pendidikan tertinggi", "Contoh: S1 Pariwisata")}</div>
   ${f("prBid", "bidang", "Bidang keahlian (sesuai pendidikan tertinggi)", "Contoh: Tour operation; Ticketing")}
   <div class="grid g2" style="gap:10px">${f("prSert", "sertifikat", "Sertifikat profesi/kompetensi/industri", "Contoh: Tour Leader, 2022")}${f("prPen", "penerbit", "Lembaga penerbit sertifikat", "Contoh: LSP Pariwisata (BNSP)")}</div>
   ${f("prKs", "kerjaSama", "Dasar kerja sama / penugasan", "Contoh: PKS No. 12/PPB/2026 dengan PT Bali Tour Nusantara")}
   <span class="hint">${x.pengalaman !== undefined && x.pengalaman !== "" && Number(x.pengalaman) >= 5 || x.memimpinTim ? "✓ Memenuhi kriteria Matriks butir 16 (pengalaman ≥ 5 tahun dan/atau memimpin tim)." : "Kriteria Matriks butir 16: pengalaman kerja ≥ 5 tahun sesuai bidang dan/atau pernah memimpin tim."}</span>
   ${ub ? `<div class="row" style="justify-content:space-between;margin:10px 0">${x.id ? tombol("dpPrakHapus", "Hapus", "bad") : "<span></span>"}${tombol("dpPrakSimpan", "Simpan")}</div>` : ""}
   ${galatHtml()}
   <h3 style="margin:14px 0 4px;font-size:.95rem">Bukti</h3>
   ${x.id ? `<p class="small muted" style="margin:0 0 4px">PDF atau gambar (JPG/PNG), maks. 10 MB, atau tautan Google Drive. Disimpan di folder Drive "Praktisi".</p>${(D.slotBuktiPraktisi || []).map(baris).join("")}`
     : `<p class="small muted">Simpan data praktisi dulu, lalu unggah buktinya di sini.</p>`}
   </div></div>`;
}
const PR_ISIAN = { prNama: "nama", prPer: "perusahaan", prJab: "jabatan", prPeng: "pengalaman", prNidk: "nidk", prPend: "pendidikan", prBid: "bidang", prSert: "sertifikat", prPen: "penerbit", prKs: "kerjaSama" };
// Isian laci praktisi disimpan ke state saat diketik (unggah bukti menggambar ulang laci).
document.addEventListener("input", e => { const k = PR_ISIAN[e.target.id]; if (k && S.laci && S.laci.jenis === "praktisi") { S.laci.x = S.laci.x || {}; S.laci.x[k] = e.target.value; } });
document.addEventListener("change", e => {
  const t = e.target; if (!S.laci || S.laci.jenis !== "praktisi") return;
  if (t.id === "prPimpin") { S.laci.x = S.laci.x || {}; S.laci.x.memimpinTim = t.checked; return; }
  if (!t.dataset || !t.dataset.pfile || !S.laci.x || !S.laci.x.id) return;
  const f = t.files && t.files[0], slot = t.dataset.pfile; t.value = "";
  if (!f) return;
  if (f.size > 10 * 1024 * 1024) { toast("Ukuran file maksimal 10 MB. Untuk file lebih besar, unggah ke Google Drive lalu pakai Tautan."); return; }
  bacaBase64(f).then(isi => buktiPraktisi({ slot, berkas: { nama: f.name, isi } }, "Bukti terunggah."), err => toast(err.message));
});
function buktiPraktisi(o, pesan) {
  const id = S.laci.x.id;
  jalankan(async () => {
    const j = await api("dp.praktisiBukti", Object.assign({ id }, o));
    if (S.laci && S.laci.x && S.laci.x.id === id) { S.laci.x.bukti = j.bukti; S.laci.tautSlot = null; }
    const p = S.dp && S.dp.praktisi.find(y => y.id === id); if (p) p.bukti = j.bukti;
    S.ilkps = null; toast(pesan);
  });
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
      cplKu: $("mkCku").checked, cplKk: $("mkCkk").checked, rps: $("mkRps").value.trim(), tanpaTim: $("mkTanpa").checked, kelompok: $("mkKel").value.trim() };
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
    const L = S.laci, keAng = v => v.filter(Boolean).map(x => ({ t: x[0], id: x.slice(2) }));
    document.querySelectorAll("[data-tpk]").forEach(el => { (L.isi[el.dataset.tpk] = L.isi[el.dataset.tpk] || ["", "", ""])[Number(el.dataset.tpi)] = el.value; });
    if (L.mode === "kelas") {
      const kls = Object.keys(L.isi).filter(Boolean).sort(), perKelas = {};
      const kurang = kls.find(k => L.isi[k].some(Boolean) && !L.isi[k][0]);
      if (kurang) { S.galat = `Pilih pengampu utama ${labelKunciTim(S.dp.tim.find(x => x.kode === L.kode), kurang).replace(/^Kelas/, "kelas")} dulu.`; render(); return; }
      kls.forEach(k => { perKelas[k] = keAng(L.isi[k]); });
      if (!kls.some(k => perKelas[k].length) && !confirm("Hapus tim pengajar mata kuliah ini untuk semester ini?")) return;
      jalankan(async () => { await api("dp.timSimpan", { semester: S.dp.semester, kodeMk: L.kode, perKelas }); S.laci = null; S.dpSmt = S.dp.semester; S.dp = null; S.ilkps = null; toast("Tim pengajar per kelas tersimpan."); });
      return;
    }
    const anggota = keAng(L.isi[""]);
    if (!anggota.length && !confirm("Hapus tim pengajar mata kuliah ini untuk semester ini?")) return;
    if (anggota.length && !L.isi[""][0]) { S.galat = "Pilih pengampu utama dulu."; render(); return; }
    jalankan(async () => { await api("dp.timSimpan", { semester: S.dp.semester, kodeMk: L.kode, anggota }); S.laci = null; S.dpSmt = S.dp.semester; S.dp = null; S.ilkps = null; toast("Tim pengajar tersimpan."); });
  },
  dpTimSalin() {
    jalankan(async () => { const j = await api("dp.timSalin", { semester: S.dp.semester }); S.dpSmt = S.dp.semester; S.dp = null; S.ilkps = null; toast(j.disalin ? `${j.disalin} tim disalin dari ${j.dari}.` : `Tidak ada tim yang perlu disalin dari ${j.dari}.`); });
  },
  dpPrakBaru() { S.laci = { jenis: "praktisi" }; S.galat = ""; render(); fokus("prNama"); },
  dpPrakUbah(d) { S.laci = { jenis: "praktisi", x: Object.assign({}, S.dp.praktisi.find(x => x.id === d.id)) }; S.galat = ""; render(); },
  dpPrakSimpan() {
    const data = { id: S.laci.x ? S.laci.x.id : undefined, nama: $("prNama").value, perusahaan: $("prPer").value, nidk: $("prNidk").value, pendidikan: $("prPend").value, bidang: $("prBid").value, sertifikat: $("prSert").value,
      jabatan: $("prJab").value, pengalaman: angkaId($("prPeng").value), memimpinTim: $("prPimpin").checked, penerbit: $("prPen").value, kerjaSama: $("prKs").value };
    S.laci.x = Object.assign({}, S.laci.x || {}, data);
    const baru = !data.id;
    jalankan(async () => {
      await api("dp.praktisiSimpan", { data }); S.ilkps = null;
      S.dp = await api("dp.data", { semester: S.dp.semester, ta: S.dp.ta });
      // Praktisi baru: laci tetap terbuka agar bukti bisa langsung diunggah.
      const p = baru ? S.dp.praktisi.filter(y => y.nama === data.nama.trim() && y.perusahaan === data.perusahaan.trim()).pop() : null;
      if (p) { S.laci = { jenis: "praktisi", x: p }; toast("Praktisi tersimpan. Unggah buktinya di bagian Bukti."); }
      else { S.laci = null; toast("Praktisi tersimpan."); }
    });
  },
  dpPrakTautan(d) { S.laci.tautSlot = S.laci.tautSlot === d.slot ? null : d.slot; render(); fokus("prTaut"); },
  dpPrakTautanSimpan(d) {
    const url = $("prTaut").value.trim();
    if (!/^https:\/\//.test(url)) { S.galat = "Tautan harus diawali https://"; render(); return; }
    buktiPraktisi({ slot: d.slot, tautan: url }, "Tautan bukti tersimpan.");
  },
  dpPrakBuktiHapus(d) {
    if (!confirm("Hapus bukti ini? File dipindahkan ke sampah Drive.")) return;
    buktiPraktisi({ slot: d.slot, hapus: true }, "Bukti dihapus.");
  },
  async dpPrakLihat(d) {
    const w = penampil();
    try { const j = await api("dp.praktisiBuktiLihat", { id: S.laci.x.id, slot: d.slot }); const blob = new Blob([dariBase64(j.isi)], { type: j.mime }); if (w && /pdf|image/.test(j.mime)) w.tampil(URL.createObjectURL(blob), j.nama, j.mime); else { if (w) w.close(); simpanBerkas(blob, j.nama); } }
    catch (e) { if (w) w.close(); toast(e.message); }
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
        <td><input data-timk="nidn" type="text" value="${esc(r.nidn || (r.userId ? D.nidn[r.userId] || "" : ""))}" style="width:120px" aria-label="NIDN ${i + 1}"></td><td><input data-timk="jabatan" type="text" value="${esc(r.jabatan)}" placeholder="Contoh: Ketua Tim / GKM" aria-label="Jabatan ${i + 1}"></td>
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
   <div class="dh"><h2>Butir ${b.n}. ${esc(b.judul)} ${iBtn("d" + b.n, b.judul)}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   <details class="picker" open><summary class="small" style="cursor:pointer"><b>Petunjuk DED</b></summary><div class="small" style="white-space:pre-wrap;margin-top:6px">${esc(b.petunjuk)}</div>
    ${b.tabel.length ? `<div class="auto" style="margin-top:6px">${b.tabel.map(KODE_TABEL_L).join(", ")} disisipkan otomatis dari Tabel iLKPS setelah narasi ini saat ekspor Word. Narasi cukup menganalisis isinya.</div>` : ""}</details>
   ${b.matriks.length ? `<details class="picker"><summary class="small" style="cursor:pointer"><b>Butir matriks terkait (${b.matriks.length})</b> · syarat skor 4</summary>${b.matriks.map(m => `<div class="small" style="margin-top:6px"><b>${m.n}. ${esc(m.nm)}</b> ${iBtn("b" + m.n, m.nm)} (bobot ${String(m.w).replace(".", ",")}): ${esc(m.s4)} <span class="muted">Sumber: ${esc(m.src)}</span></div>`).join("")}</details>` : ""}
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
  return `<div class="head"><div><h1>Mata Kuliah Saya</h1><p>Mata kuliah yang Anda ampu sesuai tim pengajar yang ditetapkan Admin Prodi. Kelengkapannya dipakai untuk butir 8 (RPS), 22 (proses pembelajaran), dan 25 (penilaian).</p><div style="margin-top:6px">${iTombol("b8,b22,b25")}</div></div>${pilihSmtMkp("mkpSmt", D)}</div>
   ${D.semester < D.semesterKini ? `<div class="callout">Anda melihat <b>${esc(D.labelSemester)}</b>. Semester yang sudah lewat hanya bisa dilihat.</div>` : ""}
   <div class="callout"><b>Siapa mengisi apa?</b> Portofolio diisi <b>per kelas</b>: setiap kelas yang Anda ajar punya kartu sendiri, juga bila Anda mengajar kelas A dan B. <b>Pengampu utama</b> kelas itu mengunggah RPS, kontrak kuliah, rubrik, dan memilih metode; <b>semua dosen dalam tim kelas itu</b> menambahkan catatan integrasi penelitian/PkM dan bukti pembelajaran. RPS cukup sekali untuk kelas-kelas dengan tim yang sama.<div style="margin-top:6px"><b>Urutan pengisian (pengampu utama):</b> <b>1.</b> Unggah <b>RPS</b> dulu: PDF bertanda tangan lalu Word sumbernya (atau langsung Word). <b>2.</b> Unduh templat <b>kontrak kuliah</b> dan <b>rubrik</b>: rencana penilaian, bobot, CPMK, dan indikator sudah terisi dari RPS. <b>3.</b> Lengkapi, tandatangani, lalu unggah sebagai PDF. <b>4.</b> Setelah perkuliahan selesai, unggah <b>nilai dari SIAKAD</b> di bagian Rubrik / portofolio penilaian.</div></div>
   <div class="grid g2">${D.mk.flatMap(x => (x.kelas || []).map(u => ({ x, u }))).map(({ x, u }) => {
     const a = u.lengkap.length, utama = u.peran === "utama";
     return `<article class="panel" style="display:flex;flex-direction:column;gap:8px"><div class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><b>${esc(u.gKode || x.kode)} · ${esc(x.nama)} <span class="tag">${esc(u.label)}</span></b>${utama ? '<span class="chip s-diajukan">Pengampu utama</span>' : '<span class="chip s-draf">Anggota tim</span>'}</div>
      <div class="small muted">${x.sks} sks · tim: ${u.tim.map((t, i) => esc(namaPendek(t.nama)) + (i === 0 && t.t === "u" ? " (utama)" : "") + (t.t === "p" ? " (praktisi)" : "")).join(", ")}${u.rpsBersama.length ? ` · RPS bersama ${esc(u.rpsBersama.map(k => "Kelas " + k.replace("/", " · ")).join(", "))}` : ""}</div>
      <div class="bar ${a < n ? "gold" : ""}"><i style="width:${a / n * 100}%"></i></div>
      <div class="small">${D.komp.map(c => `<div>${u.lengkap.includes(c.k) ? '<span style="color:var(--ok)">✓</span>' : '<span style="color:var(--warn)">○</span>'} ${esc(c.l)} <span class="muted">${c.u ? (utama ? "· tugas Anda" : "· oleh pengampu utama") : "· semua anggota"}</span></div>`).join("")}</div>
      <button class="btn sm ${u.bolehAnggota ? "primary" : ""}" data-act="mkpBuka" data-s="${x.semester}" data-kode="${esc(x.kode)}" data-kunci="${esc(u.k)}" style="align-self:flex-start">${!x.buka ? "Lihat" : utama ? "Lengkapi" : "Tambah bagian saya"}</button></article>`;
   }).join("") || `<div class="empty panel">Anda tidak tercatat mengampu mata kuliah pada ${esc(D.labelSemester)}. Tim pengajar ditetapkan Admin Prodi di Data Prodi.</div>`}</div>`;
}
function isiMkpRekap() {
  const R = S.mkpRekap;
  if (!R) { sekali("mkpRekap", async () => { S.mkpRekap = await api("mkp.rekap", { semester: S.mkpRekapSmt || (S.dp && S.dp.semester) || undefined }); render(); }); return `<div class="memuat">Memuat portofolio mata kuliah…</div>`; }
  return `<div class="row" style="justify-content:space-between;flex-wrap:wrap">${pilihSmtMkp("mkpRekapSmt", R)}<span class="small muted">Diisi dosen di menu Mata Kuliah Saya; data pendukung butir 8, 22, dan 25.</span>${R.mk.length ? `<button class="btn sm" data-act="mkpZip" data-s="${esc(R.semester)}" ${S.sibuk ? "disabled" : ""}>Unduh semua bukti (ZIP)</button>` : ""}</div>
   ${R.tanpaTim ? `<div class="callout">${R.tanpaTim} mata kuliah ${/-1$/.test(R.semester) ? "ganjil" : "genap"} belum punya tim pengajar sehingga belum dihitung. Tetapkan di tab <b>Tim pengajar</b>.</div>` : ""}
   <div class="grid g3">${R.komp.map(c => `<div class="panel stat"><span class="v num">${R.persen.n ? dpPersen(R.persen[c.k]) : "–"}</span><span class="l">${esc(c.l)}</span><div class="bar ${R.persen[c.k] < 0.75 ? "gold" : ""}" style="margin-top:6px"><i style="width:${R.persen[c.k] * 100}%"></i></div></div>`).join("")}</div>
   <div class="tbl-wrap"><table><thead><tr><th>Mata kuliah</th><th>Tim</th>${R.komp.map(c => `<th>${KOMP_SING[c.k]}</th>`).join("")}</tr></thead><tbody>
   ${R.mk.flatMap(x => (x.kelas || []).map(u => ({ x, u }))).map(({ x, u }) => `<tr><td><button class="lnk" data-act="mkpBuka" data-s="${x.semester}" data-kode="${esc(x.kode)}" data-kunci="${esc(u.k)}">${esc(u.gKode || x.kode)} · ${esc(x.nama)}</button> <span class="tag">${esc(u.label)}</span></td><td class="small">${u.tim.map((t, i) => esc(namaPendek(t.nama)) + (i === 0 && t.t === "u" ? " (utama)" : "")).join(", ")}</td>${R.komp.map(c => `<td>${tandaKomp(u, c.k)}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="8"><div class="empty">Belum ada tim pengajar untuk ${esc(R.labelSemester)}.</div></td></tr>`}</tbody></table></div>`;
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
/* ---------- Peserta kelas (v0.39.0) ----------
   Admin Prodi/KPS mengatur peserta (MK biasa: otomatis per kelas, bisa disesuaikan per orang; MK berkelompok: mahasiswa dibagi ke kelompok,
   juga lewat templat Excel). Dosen tim melihat daftar peserta; mahasiswa melihat MK-nya dan dosen pengajar di menu Mata Kuliah Saya. */
const labelKunciPs = (P, k) => labelKunciTim({ kelompok: P.kelompok }, k);
function laciPeserta() {
  const L = S.laci, P = L.p, dis = S.sibuk ? "disabled" : "";
  if (!P) return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Peserta kelas"><div class="dh"><h2>Peserta kelas</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div><div class="memuat">Memuat peserta…</div></div></div>`;
  const berkel = (P.kelompok || []).length > 0, dosen = l => l.length ? l.map(d => esc(namaPendek(d.nama)) + (d.praktisi ? " (praktisi)" : "")).join(", ") : '<span class="muted">pengajar belum ditetapkan</span>';
  const orang = x => `${esc(x.nama)} <span class="mono muted">${esc(x.nim)}</span>${x.masuk !== P.angkatan ? ` <span class="tag">angkatan ${esc(x.masuk || "–")}</span>` : ""}`;
  const tambah = (tujuan) => P.boleh ? `<div class="field" style="margin-top:6px"><label for="psTambah_${esc(tujuan)}" class="small">Tambah mahasiswa angkatan lain (mis. mengulang): ketik NIM</label>
     <div class="row" style="gap:6px"><input id="psTambah_${esc(tujuan)}" list="psLain" type="search" placeholder="NIM atau nama" style="flex:1"><button class="btn sm" data-act="psTambah" data-t="${esc(tujuan)}" ${dis}>Tambah</button></div></div>` : "";
  let isi;
  if (berkel) {
    const kelasL = [...new Set(P.kunci.map(k => k.k.split("/")[0]))];
    const nilai = id => L.bagi[id] !== undefined ? L.bagi[id] : (P.kunci.find(k => k.peserta.some(x => x.id === id)) || {}).k || "";
    const daftarKelas = kl => { const ids = new Set(P.kandidat.filter(x => x.kelas === kl && x.masuk === P.angkatan).map(x => x.id));
      P.kunci.filter(k => k.k.startsWith(kl + "/")).forEach(k => k.peserta.forEach(x => ids.add(x.id))); (L.tambahan[kl] || []).forEach(id => ids.add(id));
      return [...ids].map(id => P.kandidat.find(x => x.id === id) || P.lainnya.find(x => x.id === id)).filter(Boolean).sort((a, b) => a.nama.localeCompare(b.nama)); };
    isi = `<div class="callout small">MK pilihan: setiap mahasiswa masuk <b>satu kelompok</b>. Pilih kelompok per mahasiswa${P.boleh ? ", atau isi lewat templat Excel," : ""} lalu tekan <b>Simpan pembagian</b>. Mahasiswa tanpa kelompok belum melihat dosennya di menu Mata Kuliah Saya.</div>
      ${P.boleh ? `<div class="row small" style="flex-wrap:wrap"><button class="btn sm" data-act="psTemplat" ${dis}>Unduh templat Excel</button><label class="btn sm" ${S.sibuk ? 'aria-disabled="true"' : ""}>Unggah berkas Excel<input type="file" id="psBerkas" accept=".xlsx" hidden ${dis}></label></div>` : ""}
      ${L.pesan ? `<div class="auto small">${esc(L.pesan)}</div>` : ""}
      ${kelasL.map(kl => { const ds = daftarKelas(kl), kk = P.kunci.filter(k => k.k.startsWith(kl + "/"));
        return `<section class="card" style="padding:12px;margin:0 0 10px"><h3 style="margin:0 0 6px;font-size:.95rem">Kelas ${esc(kl)}</h3>
        <div class="small muted" style="margin-bottom:6px">${kk.map(k => `<div><b>${esc(labelKunciPs(P, k.k).replace(/^Kelas \S+ · /, ""))}</b>: ${ds.filter(x => nilai(x.id) === k.k).length} mahasiswa · ${dosen(k.dosen)}</div>`).join("")}<div>Belum dibagi: ${ds.filter(x => !nilai(x.id)).length}</div></div>
        <div class="tbl-wrap gulir"><table><thead><tr><th>Mahasiswa</th><th>Kelompok</th></tr></thead><tbody>${ds.map(x => `<tr><td class="small">${orang(x)}</td><td>${P.boleh
          ? `<select data-psbagi="${x.id}" aria-label="Kelompok ${esc(x.nama)}" style="width:auto"><option value="">– belum –</option>${kk.map(k => `<option value="${esc(k.k)}" ${nilai(x.id) === k.k ? "selected" : ""}>${esc(labelKunciPs(P, k.k).replace(/^Kelas \S+ · /, ""))}</option>`).join("")}</select>`
          : esc(nilai(x.id) ? labelKunciPs(P, nilai(x.id)).replace(/^Kelas \S+ · /, "") : "–")}</td></tr>`).join("") || '<tr><td colspan="2" class="small muted">Belum ada mahasiswa aktif di kelas ini.</td></tr>'}</tbody></table></div>
        ${tambah(kl)}</section>`; }).join("")}
      ${P.boleh ? `<div class="row" style="justify-content:flex-end">${tombol("psBagiSimpan", "Simpan pembagian")}</div>` : ""}`;
  } else {
    isi = `<div class="callout small">Peserta otomatis = mahasiswa aktif angkatan ${esc(P.angkatan)} di kelas itu. ${P.boleh ? "Tekan <b>Atur</b> untuk menyesuaikan per orang (mis. mahasiswa mengulang atau pindah kelas)." : ""}</div>
      ${P.kunci.map(k => { const atur = L.atur === k.k;
        if (atur) { const pilih = L.pilih, ds = [...new Set([...P.kandidat.map(x => x.id), ...k.peserta.map(x => x.id), ...(L.tambahan[k.k] || [])])].map(id => P.kandidat.find(x => x.id === id) || P.lainnya.find(x => x.id === id)).filter(Boolean)
            .sort((a, b) => (a.kelas === k.k ? 0 : 1) - (b.kelas === k.k ? 0 : 1) || a.nama.localeCompare(b.nama));
          return `<section class="card" style="padding:12px;margin:0 0 10px"><h3 style="margin:0 0 6px;font-size:.95rem">Kelas ${esc(k.k)} · atur peserta</h3>
            <div class="classgrid gulir">${ds.map(x => `<label><input type="checkbox" data-pspilih="${x.id}" ${pilih[x.id] ? "checked" : ""}><span>${orang(x)} <span class="muted">kelas ${esc(x.kelas || "–")}</span></span></label>`).join("")}</div>
            ${tambah(k.k)}<div class="row" style="justify-content:flex-end;margin-top:6px"><button class="btn sm" data-act="psAturBatal" ${dis}>Batal</button>${tombol("psAturSimpan", "Simpan peserta kelas " + k.k, "primary sm")}</div></section>`; }
        return `<section class="card" style="padding:12px;margin:0 0 10px"><div class="row" style="justify-content:space-between;flex-wrap:wrap"><h3 style="margin:0;font-size:.95rem">Kelas ${esc(k.k)} · ${k.peserta.length} mahasiswa <span class="tag">${k.sumber === "diatur" ? "diatur" : "otomatis"}</span></h3>
          ${P.boleh ? `<span class="row" style="gap:6px">${k.sumber === "diatur" ? `<button class="btn sm" data-act="psOtomatis" data-k="${esc(k.k)}" ${dis}>Kembalikan otomatis</button>` : ""}<button class="btn sm" data-act="psAtur" data-k="${esc(k.k)}" ${dis}>Atur</button></span>` : ""}</div>
          <div class="small muted">Pengajar: ${dosen(k.dosen)}</div>
          <details class="small" style="margin-top:4px"><summary>Daftar peserta</summary><ol style="margin:4px 0 0 18px">${k.peserta.map(x => `<li>${orang(x)}</li>`).join("") || "<li class='muted'>Belum ada</li>"}</ol></details></section>`; }).join("")}`;
  }
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Peserta kelas" style="width:min(680px,100%)">
   <div class="dh"><h2>Peserta · ${esc(P.kode)}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   <p class="small">${esc(P.nama)} · ${P.sks} sks · <b>${esc(P.labelSemester)}</b> · angkatan ${esc(P.angkatan)}${berkel ? ` · kelompok ${esc(P.kelompok.map(g => g.n).join(", "))}` : ""}</p>
   ${galatHtml()}${isi}
   <datalist id="psLain">${(P.lainnya || []).map(x => `<option value="${esc(x.nim)}">${esc(x.nama)} · angkatan ${esc(x.masuk || "–")} kelas ${esc(x.kelas || "–")}</option>`).join("")}</datalist></div></div>`;
}
document.addEventListener("change", e => {
  const t = e.target; if (!S.laci || S.laci.jenis !== "peserta") return;
  if (t.dataset && t.dataset.psbagi) { S.laci.bagi[t.dataset.psbagi] = t.value; render(); return; }
  if (t.dataset && t.dataset.pspilih) { S.laci.pilih[t.dataset.pspilih] = t.checked; return; }
  if (t.id === "psBerkas" && t.files[0]) { const f = t.files[0]; t.value = ""; bacaTemplatPeserta(f).catch(err => toast(err.message)); }
});
async function muatPeserta(smt, kode) { const p = await api("peserta.data", { semester: smt, kodeMk: kode }); if (S.laci && S.laci.jenis === "peserta") { S.laci.p = p; render(); } }
function templatPeserta() {
  const P = S.laci.p, L = S.laci, tag = "[peserta:" + P.semester + ":" + P.kode + "]";
  const nilai = id => L.bagi[id] !== undefined ? L.bagi[id] : (P.kunci.find(k => k.peserta.some(x => x.id === id)) || {}).k || "";
  const nk = k => k ? k.split("/")[1] : "", namaK = g => (P.kelompok.find(x => x.n.toUpperCase() === g) || {}).n || g;
  const ids = new Set(P.kandidat.filter(x => x.masuk === P.angkatan).map(x => x.id)); P.kunci.forEach(k => k.peserta.forEach(x => ids.add(x.id)));
  const baris = [...ids].map(id => P.kandidat.find(x => x.id === id)).filter(Boolean).sort((a, b) => a.kelas.localeCompare(b.kelas) || a.nama.localeCompare(b.nama))
    .map(x => [x.nim, x.nama, x.kelas, nilai(x.id) ? namaK(nk(nilai(x.id))) : ""]);
  return UPW_ZIP.xlsx([{ nama: "Data", baris: [["NIM [nim]", "Nama [nama]", "Kelas [kelas]", "Kelompok [kelompok]"]].concat(baris), teks: [0], pilihan: { 3: P.kelompok.map(g => g.n) }, lebar: [14, 40, 8, 16] },
    { nama: "Petunjuk", baris: [["Bagian", "Keterangan", ""], ["Mata kuliah", P.kode + " " + P.nama + " · " + P.labelSemester, tag],
      ["Cara mengisi", "Pilih kelompok (" + P.kelompok.map(g => g.n).join(" / ") + ") untuk setiap mahasiswa di kolom Kelompok. Kosongkan bila belum memilih. Jangan mengubah NIM dan baris judul.", ""],
      ["Mengunggah", "Simpan sebagai .xlsx lalu unggah di aplikasi (Peserta MK ini), periksa, lalu tekan Simpan pembagian. Kelas diambil dari data akun mahasiswa.", ""]], lebar: [14, 100, 30] }]);
}
async function bacaTemplatPeserta(f) {
  const P = S.laci.p, L = S.laci, lembar = await UPW_ZIP.bacaXlsx(await f.arrayBuffer());
  const pt = lembar.find(l => /^petunjuk$/i.test(l.nama)), tag = pt ? pt.baris.flat().map(v => /\[peserta:(\d{4}-[12]):([^\]]+)\]/.exec(String(v || ""))).find(Boolean) : null;
  if (!tag) throw new Error("Berkas ini bukan templat peserta dari aplikasi. Unduh templat dari tombol Unduh templat Excel.");
  if (tag[1] !== P.semester || tag[2] !== P.kode) throw new Error(`Berkas ini untuk ${tag[2]} semester ${labelSmtTampil(tag[1])}, bukan ${P.kode} ${P.labelSemester}.`);
  const D = lembar.find(l => /^data$/i.test(l.nama)); if (!D) throw new Error("Lembar Data tidak ditemukan.");
  const kep = D.baris[0].map(v => (/\[(\w+)\]/.exec(String(v || "")) || [])[1]), iN = kep.indexOf("nim"), iK = kep.indexOf("kelompok");
  const semuaOrang = P.kandidat.concat(P.lainnya), masalah = []; let n = 0;
  D.baris.slice(1).forEach((r, i) => {
    const nim = String(r[iN] ?? "").trim(); if (!nim) return;
    const x = semuaOrang.find(y => y.nim === nim); if (!x) { masalah.push(`Baris ${i + 2}: NIM ${nim} tidak ditemukan (bukan mahasiswa aktif).`); return; }
    const g = String(r[iK] ?? "").trim();
    if (!g) { L.bagi[x.id] = ""; n++; return; }
    const kel = P.kelompok.find(y => y.n.toLowerCase() === g.toLowerCase()); if (!kel) { masalah.push(`Baris ${i + 2}: kelompok "${g}" tidak dikenal (${P.kelompok.map(y => y.n).join(", ")}).`); return; }
    const k = (x.kelas || "A").toUpperCase() + "/" + kel.n.toUpperCase();
    if (!P.kunci.some(z => z.k === k)) { masalah.push(`Baris ${i + 2}: kelas ${x.kelas || "–"} tidak dikenal untuk MK ini.`); return; }
    L.bagi[x.id] = k; if (x.masuk !== P.angkatan) { L.tambahan[x.kelas] = L.tambahan[x.kelas] || []; L.tambahan[x.kelas].push(x.id); } n++;
  });
  L.pesan = `Berkas ${f.name}: ${n} mahasiswa terbaca${masalah.length ? `, ${masalah.length} dilewati: ` + masalah.slice(0, 5).map(m => m.replace(/\.$/, "")).join("; ") + (masalah.length > 5 ? "; …" : "") : ""}. Periksa, lalu tekan Simpan pembagian.`;
  render();
}
Object.assign(AKSI, {
  pesertaBuka(d) { S.laci = { jenis: "peserta", s: d.s, kode: d.kode, p: null, bagi: {}, pilih: {}, atur: "", tambahan: {}, pesan: "" }; S.galat = ""; render(); muatPeserta(d.s, d.kode).catch(e => { S.laci = null; toast(e.message); render(); }); },
  psAtur(d) { const L = S.laci, k = L.p.kunci.find(x => x.k === d.k); L.atur = d.k; L.pilih = {}; k.peserta.forEach(x => { L.pilih[x.id] = true; }); render(); },
  psAturBatal() { S.laci.atur = ""; render(); },
  psTambah(d) {
    const L = S.laci, P = L.p, v = String(($("psTambah_" + d.t) || {}).value || "").trim().toLowerCase();
    const x = P.lainnya.concat(P.kandidat).find(y => y.nim.toLowerCase() === v || y.nama.toLowerCase() === v);
    if (!x) { toast("Mahasiswa tidak ditemukan. Ketik NIM lengkap dari daftar."); return; }
    L.tambahan[d.t] = L.tambahan[d.t] || []; if (!L.tambahan[d.t].includes(x.id)) L.tambahan[d.t].push(x.id);
    if (L.atur) L.pilih[x.id] = true; render();
  },
  psAturSimpan() {
    const L = S.laci, ids = Object.keys(L.pilih).filter(id => L.pilih[id]);
    jalankan(async () => { L.p = await api("peserta.simpan", { semester: L.p.semester, kodeMk: L.p.kode, kunci: L.atur, userIds: ids }); L.atur = ""; L.tambahan = {}; toast("Peserta tersimpan."); });
  },
  psOtomatis(d) {
    if (!confirm("Kembalikan peserta kelas " + d.k + " ke daftar otomatis (seluruh mahasiswa aktif kelas itu)?")) return;
    const L = S.laci; jalankan(async () => { L.p = await api("peserta.simpan", { semester: L.p.semester, kodeMk: L.p.kode, kunci: d.k, otomatis: true }); toast("Peserta kembali otomatis."); });
  },
  psBagiSimpan() {
    const L = S.laci; if (!Object.keys(L.bagi).length) { toast("Belum ada perubahan."); return; }
    jalankan(async () => { L.p = await api("peserta.bagi", { semester: L.p.semester, kodeMk: L.p.kode, bagi: L.bagi }); L.bagi = {}; L.tambahan = {}; L.pesan = ""; toast("Pembagian kelompok tersimpan."); });
  },
  psTemplat() { try { const P = S.laci.p; simpanBerkas(templatPeserta(), `Peserta ${P.kode} ${P.labelSemester.replace("/", "-")}.xlsx`); } catch (e) { toast(e.message); } },
  mkmSmt(d) { S.mkm = null; S.mkmSmt = d.s; render(); }
});
/** Mahasiswa: Mata Kuliah Saya (v0.39.0). */
function hMkMhs() {
  if (!S.mkm) { sekali("mkm", async () => { S.mkm = await api("mhs.mkSaya", { semester: S.mkmSmt || undefined }); render(); }); return `<div class="memuat">Memuat mata kuliah…</div>`; }
  const D = S.mkm, dosen = l => l.map(x => `${esc(x.nama)}${x.praktisi ? ' <span class="muted">(praktisi)</span>' : x.utama ? ' <span class="muted">(pengampu utama)</span>' : ""}`).join("<br>");
  return `<div class="head"><div><h1>Mata Kuliah Saya</h1><p>Mata kuliah yang Anda ikuti dan dosen pengajarnya.</p></div>
    <label class="row small" style="gap:6px"><b>Semester</b><select id="mkmSmt" style="width:auto">${D.pilihanSemester.map(x => `<option value="${x.kode}" ${x.kode === D.semester ? "selected" : ""}>${esc(x.label)}</option>`).join("")}</select></label></div>
   ${D.mk.length ? `<div class="grid g2">${D.mk.map(m => `<article class="panel" style="display:flex;flex-direction:column;gap:6px">
      <b>${esc(m.kelompok && m.kelompok.kode ? m.kelompok.kode : m.kode)} · ${esc(m.nama)}</b>
      <div class="small muted">${m.sks} sks · semester ${m.smtMk} · kelas ${esc(m.kelas || "–")}${m.kelompok ? ` · kelompok <b>${esc(m.kelompok.n)}</b>` : ""}</div>
      ${m.tanpaTim ? `<div class="small">Tanpa dosen pengampu (magang/tugas akhir): Anda dibimbing pembimbing masing-masing.</div>`
        : m.belumDibagi ? `<div class="small"><span class="chip s-revisi">Kelompok belum ditentukan</span> Pilihan: ${esc(m.pilihanKelompok.join(", "))}. Hubungi Admin Prodi bila Anda sudah memilih.</div>`
        : m.dosen.length ? `<div class="small"><b>Dosen pengajar</b><br>${dosen(m.dosen)}</div>` : `<div class="small muted">Dosen pengajar belum ditetapkan.</div>`}</article>`).join("")}</div>`
    : `<div class="empty">Belum ada mata kuliah untuk ${esc(D.labelSemester)}. Pastikan tahun masuk dan kelas di akun Anda sudah benar.</div>`}`;
}
document.addEventListener("change", e => { if (e.target.id === "mkmSmt") AKSI.mkmSmt({ s: e.target.value }); });
/** v0.38.0: MK berkelompok paralel → isian pengampu utama (RPS, kontrak, rubrik, metode) dilihat/diisi per kelompok yang dipilih (S.laci.kel). */
function viewMkp() {
  // v0.40.0: Portofolio MK per kelas. x.kelas = kelas yang boleh dilihat (dosen: kelas yang ia ajar); S.laci.kel = kunci kelas terpilih.
  const x = S.laci.x, kl = x.kelas || [];
  const G = kl.find(g => g.k === S.laci.kel) || kl.find(g => g.peran) || kl[0] || null;
  if (G) S.laci.kel = G.k;
  return { x, G, xv: G ? Object.assign({}, x, { tim: G.tim, rps: G.rps, kontrak: G.kontrak, rubrik: G.rubrik, metode: G.metode, integ: G.integ, interaksi: G.interaksi,
    bolehUtama: G.bolehUtama, bolehAnggota: G.bolehAnggota, peran: G.peran }) : x };
}
function laciMkp() {
  const { x: x0, G, xv } = viewMkp(), x = x0, saya = S.pengguna.id, dis = S.sibuk ? "disabled" : "";
  const blok = c => {
    const x = xv; // eslint-disable-line no-shadow
    const kepala = `<div class="row" style="justify-content:space-between;flex-wrap:wrap"><h3 style="margin:0">${esc(c.l)}${G && (x0.kelas || []).length > 1 ? ` · <span class="tag">${esc(G.label)}</span>` : ""}</h3><span class="small muted">${c.u ? "Pengampu utama kelas ini" : "Semua dosen dalam tim kelas ini"}</span></div><span class="hint">${esc(c.h)}</span>${contohMkpHtml(c.k)}`;
    const boleh = c.u ? x.bolehUtama : x.bolehAnggota;
    if (c.jenis === "dok") {
      const e = x[c.k];
      return `<div class="picker">${kepala}${e ? entriMkp(e, c.k, boleh) : `<div class="row" style="justify-content:space-between"><span class="chip s-revisi">Belum</span></div>`}
        ${boleh ? `<div class="row small" style="flex-wrap:wrap"><label class="btn sm" ${S.sibuk ? 'aria-disabled="true"' : ""}>${e ? "Ganti dengan file" : "Unggah file"}<input type="file" data-mfile="${c.k}" accept="${TERIMA}" hidden ${dis}></label><button class="btn sm" data-act="mkpTautan" data-komp="${c.k}" ${dis}>${e ? "Ganti dengan tautan" : "Tempel tautan"}</button></div>${formTautanMkp(c.k, false)}` : ""}${e && e.t === "file" && x0.ttdMkp && x0.ttdMkp[c.k] ? ttdMkpHtml(c.k, e, boleh, x0) : ""}${c.k === "rps" ? bagianRps(x0, G) : ""}${c.k === "kontrak" || c.k === "rubrik" ? bagianTemplatNilai(c.k, G) : ""}</div>`;
    }
    if (c.jenis === "metode") {
      const m = x.metode;
      if (!boleh) return `<div class="picker">${kepala}${saranMetodeRps(G, false)}<div class="small">${m.v.length || m.lain ? esc(m.v.concat(m.lain ? [m.lain] : []).join(", ")) + (m.oleh ? ` <span class="muted">· ${esc(namaPendek(m.oleh))}, ${tglJam(m.w)}</span>` : "") : '<span class="chip s-revisi">Belum</span>'}</div></div>`;
      return `<div class="picker">${kepala}${saranMetodeRps(G, true)}<div class="classgrid">${x.daftarMetode.map(v => `<label><input type="checkbox" data-mmet="${esc(v)}" ${m.v.includes(v) ? "checked" : ""}><span>${esc(v)}</span></label>`).join("")}</div>
        <div class="field"><label for="mkpLain">Metode lain (opsional)</label><input id="mkpLain" type="text" maxlength="200" value="${esc(m.lain)}" placeholder="Contoh: simulasi reservasi GDS"></div>
        <div class="row">${tombol("mkpMetode", "Simpan metode", "sm")}</div></div>`;
    }
    if (c.jenis === "catatan") {
      return `<div class="picker">${kepala}${x.integ.map(e => `<div class="item bk"><div class="body"><div class="small" style="border-left:3px solid var(--brand);padding-left:8px">${esc(e.teks)}</div>${e.keg ? `<div class="small" style="margin-top:3px">Tertaut ke ${esc(LABEL_JENIS_INTEG[e.kjn] || "kegiatan")}: <button class="lnk" data-act="bukaKeg" data-id="${esc(e.keg)}">${esc(e.kj)}</button></div>` : ""}<div class="meta"><span>${esc(namaPendek(e.oleh))}, ${tglJam(e.w)}</span></div></div>${boleh && e.o === saya ? `<div class="row bk-aksi"><button class="btn sm bad" data-act="mkpHapus" data-komp="integ" data-id="${e.id}" ${dis}>Hapus</button></div>` : ""}</div>`).join("") || '<span class="small muted">Belum ada catatan integrasi.</span>'}
        ${boleh ? `<div class="field"><label for="mkpInteg">Tambahkan catatan Anda</label><textarea id="mkpInteg" rows="3" maxlength="1000" placeholder="Contoh: mahasiswa menganalisis data penelitian saya tentang preferensi wisatawan sebagai studi kasus tugas akhir MK."></textarea></div>${S.laci.integKeg ? `<div class="small">Tertaut ke: <b>${esc(S.laci.integKeg.judul)}</b> <button class="lnk" data-act="integLepas">lepas</button></div>` : ""}<div class="row">${tombol("mkpInteg", "Tambahkan", "sm")}</div>${saranIntegHtml(G)}` : ""}</div>`;
    }
    return `<div class="picker">${kepala}${x.interaksi.map(e => entriMkp(e, "interaksi", boleh && e.o === saya)).join("") || '<span class="small muted">Belum ada bukti.</span>'}
      ${boleh ? `<div class="field"><label for="mkpKet">Keterangan untuk file (opsional)</label><input id="mkpKet" type="text" maxlength="200" placeholder="Contoh: dokumentasi praktik pemanduan, pertemuan 5"></div>
      <div class="row small" style="flex-wrap:wrap"><label class="btn sm" ${S.sibuk ? 'aria-disabled="true"' : ""}>Unggah file<input type="file" data-mfile="interaksi" accept="${TERIMA}" hidden ${dis}></label><button class="btn sm" data-act="mkpTautan" data-komp="interaksi" ${dis}>Tempel tautan</button></div>${formTautanMkp("interaksi", true)}` : ""}</div>`;
  };
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Portofolio mata kuliah" style="width:min(680px,100%)">
   <div class="dh"><h2>${esc(x.kode)} · ${esc(x.nama)}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   <p class="small muted">${esc(x.labelSemester)} · ${x.sks} sks (${x.sksPraktik} sks praktik) · tim: ${x.tim.map((t, i) => ((t.utama ?? i === 0) ? "<b>" : "") + esc(t.nama) + ((t.utama ?? i === 0) ? "</b> (utama)" : "") + (t.t === "p" ? " (praktisi)" : "")).join(", ")}</p>
   ${!x.buka ? `<div class="callout">Semester sudah lewat: hanya bisa dilihat.</div>` : !x.peran ? `<div class="callout">Tampilan pemantauan: hanya melihat. Dokumen diisi oleh tim pengajar.</div>` : ""}
   ${G && G.bolehUtama && !G.rpsBaca ? `<div class="callout small"><b>Urutan pengisian (pengampu utama):</b> <b>1.</b> Unggah <b>RPS</b> dulu: PDF bertanda tangan lalu Word sumbernya (atau langsung Word). <b>2.</b> Unduh templat <b>kontrak kuliah</b> dan <b>rubrik</b>: rencana penilaian, bobot, CPMK, dan indikator sudah terisi dari RPS. <b>3.</b> Lengkapi, tandatangani, lalu unggah sebagai PDF. <b>4.</b> Setelah perkuliahan selesai, unggah <b>nilai dari SIAKAD</b> di bagian Rubrik / portofolio penilaian.</div>` : ""}
   ${x.peran ? `<p class="small muted" style="margin:0">File maks. 10 MB (PDF, gambar, Word, Excel, PowerPoint); video atau album: pakai tautan. Mengganti file memindahkan file lama ke sampah Drive.</p>` : ""}
   ${galatHtml()}
   ${G ? `<div class="picker"><b>${(x0.kelas || []).length > 1 ? "Pilih kelas" : esc(G.label)}</b><span class="hint">Setiap kelas punya isian sendiri dan hanya terlihat oleh tim kelas itu. RPS dipakai bersama hanya oleh kelas dengan tim pengajar yang sama.</span>
     ${(x0.kelas || []).length > 1 ? `<div class="seg" role="group" style="flex-wrap:wrap">${x0.kelas.map(g => `<button data-act="mkpKel" data-k="${esc(g.k)}" aria-pressed="${g.k === G.k}">${esc(g.label)}${g.gKode ? ` <span class="mono small">${esc(g.gKode)}</span>` : ""} · ${g.lengkap.length}/${x0.komp.length}${g.peran ? " · Anda" : ""}</button>`).join("")}</div>` : ""}
     <span class="small muted">Tim ${esc(G.label)}: ${G.tim.length ? G.tim.map((t, i) => esc(namaPendek(t.nama)) + (i === 0 && t.t === "u" ? " (utama)" : "") + (t.t === "p" ? " (praktisi)" : "")).join(", ") : "belum ditetapkan"}${G.rpsBersama && G.rpsBersama.length ? ` · RPS berlaku juga untuk ${esc(G.rpsBersama.map(k => "Kelas " + k.replace("/", " · ")).join(", "))} (tim sama)` : ""}</span></div>` : ""}
   <div class="row" style="flex-wrap:wrap"><button class="btn sm" data-act="pesertaBuka" data-s="${esc(x.semester)}" data-kode="${esc(x.kode)}">Lihat peserta kelas</button>${G ? `<button class="btn sm" data-act="mkpZip" data-s="${esc(x.semester)}" data-kode="${esc(x.kode)}" data-kunci="${esc(G.k)}" ${dis}>Unduh ${esc(G.label)} (ZIP)</button>` : ""}${G && (x0.kelas || []).length > 1 ? `<button class="btn sm" data-act="mkpZip" data-s="${esc(x.semester)}" data-kode="${esc(x.kode)}" ${dis}>Unduh semua kelas (ZIP)</button>` : ""}</div>
   ${x0.komp.map(blok).join("")}
   ${x.kuliahTamu && x.kuliahTamu.length ? `<div class="picker"><h3 style="margin:0">Kuliah tamu tercatat</h3>${x.kuliahTamu.map(k => `<div class="item" style="cursor:pointer" data-act="bukaKeg" data-id="${k.id}"><div class="body"><div class="title">${esc(k.judul)}</div><div class="meta"><span>${esc(tglPendek(k.tgl))}</span></div></div></div>`).join("")}</div>` : ""}
  </div></div>`;
}
/* ---------- Unduh bukti Portofolio MK sebagai ZIP (v0.41.0) ----------
   mkp.daftarZip → daftar isian per MK × kelas; berkas diambil beberapa sekaligus lewat mkp.ambilZip (± 8 MB per panggilan).
   Struktur: Portofolio MK <semester>/<kode nama>/<Kelas …>/1 RPS - …, 2 Kontrak kuliah - …, 3 Rubrik - …, Bukti pembelajaran/…, Catatan dan tautan.txt;
   di akar: Daftar isi.xlsx dan berkas-gagal.txt (bila ada). RPS bersama ikut di setiap kelas yang memakainya. */
const namaZip = (s, n = 80) => String(s || "").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").replace(/\s+/g, " ").trim().slice(0, n).trim() || "berkas";
const NO_DOK_MKP = { rps: 1, kontrak: 2, rubrik: 3, nilai: 4 };
function teksCatatanMkp(D, m, u) {
  const b = [`${m.kode} ${m.nama} — ${u.label}`, D.labelSemester, `Tim: ${u.tim.join(", ") || "belum ditetapkan"}`];
  if (u.rpsBersama.length) b.push(`RPS dipakai bersama dengan: ${u.rpsBersama.map(k => "Kelas " + k.replace("/", " · ")).join(", ")} (tim sama)`);
  b.push("", "Kelengkapan: " + D.komp.map(c => `${c.l} ${u.lengkap.includes(c.k) ? "✓" : "belum"}`).join("; "), "");
  b.push("METODE PEMBELAJARAN", u.metode ? u.metode.v.concat(u.metode.lain ? [u.metode.lain] : []).join(", ") + (u.metode.oleh ? `  (${u.metode.oleh}, ${tglJam(u.metode.w)})` : "") : "(belum diisi)", "");
  const integ = u.berkas.filter(e => e.komp === "integ");
  b.push("INTEGRASI PENELITIAN / PkM");
  if (integ.length) integ.forEach((e, i) => b.push(`${i + 1}. ${e.teks}  (${e.oleh}, ${tglJam(e.w)})`)); else b.push("(belum diisi)");
  const taut = u.berkas.filter(e => e.t === "tautan");
  b.push("", "TAUTAN");
  if (taut.length) taut.forEach(e => b.push(`- ${e.l}${e.ket ? " (" + e.ket + ")" : ""}: ${e.url}  (${e.oleh}, ${tglJam(e.w)})`)); else b.push("(tidak ada)");
  return b.join("\r\n") + "\r\n";
}
function lembarZipMkp(D, jalurPeta, gagalPeta) {
  const ring = [["Kode", "Mata kuliah", "SKS", "Semester MK", "Kelas", "Kode kelompok", "Tim pengajar", ...D.komp.map(c => c.l), "Jumlah file", "Jumlah tautan"]];
  const isi = [["Kode", "Mata kuliah", "Kelas", "Komponen", "Bentuk", "Nama file / tautan / catatan", "Keterangan", "Oleh", "Waktu", "Letak di ZIP"]];
  D.mk.forEach(m => m.kelas.forEach(u => {
    ring.push([m.kode, m.nama, m.sks, m.smtMk, u.label, u.gKode, u.tim.join(", "), ...D.komp.map(c => u.lengkap.includes(c.k) ? "Ada" : "Belum"),
      u.berkas.filter(e => e.t === "file").length, u.berkas.filter(e => e.t === "tautan").length]);
    if (u.metode) isi.push([m.kode, m.nama, u.label, "Metode pembelajaran", "Isian", u.metode.v.concat(u.metode.lain ? [u.metode.lain] : []).join(", "), "", u.metode.oleh, u.metode.w ? tglJam(u.metode.w) : "", "Catatan dan tautan.txt"]);
    u.berkas.forEach(e => {
      const k = m.kode + "|" + u.k + "|" + e.komp + "|" + e.id;
      isi.push([m.kode, m.nama, u.label, e.l, e.t === "file" ? "File" : e.t === "tautan" ? "Tautan" : "Catatan", e.t === "file" ? e.nama : e.t === "tautan" ? e.url : e.teks, e.ket,
        e.oleh, e.w ? tglJam(e.w) : "", e.t === "file" ? (gagalPeta[k] ? "GAGAL: " + gagalPeta[k] : jalurPeta[k] || "") : "Catatan dan tautan.txt"]);
    });
  }));
  return [{ nama: "Ringkasan", baris: [["Portofolio Mata Kuliah", D.labelSemester], ["Dicetak", tglCetak()], [], ...ring] }, { nama: "Isian", baris: isi }];
}
async function buatZipMkp(arg, judul) {
  const D = await api("mkp.daftarZip", arg);
  const unit = D.mk.reduce((a, m) => a + m.kelas.length, 0);
  if (!unit) { toast("Belum ada mata kuliah bertim pengajar pada semester ini."); return; }
  const ada = D.mk.some(m => m.kelas.some(u => u.berkas.length || u.metode));
  if (!ada) { toast("Belum ada isian portofolio untuk diunduh."); return; }
  const besar = D.ukuran > 300 * 1048576;
  if (!confirm(`${judul}\n${D.jumlahFile} file (± ${ukuranT(D.ukuran || 0)}) dari ${unit} kelas akan diambil dan disusun menjadi satu ZIP.` +
    (besar ? "\n\nUkurannya besar: proses bisa lama dan memerlukan banyak memori. Bila gagal, unduh per mata kuliah dari laci mata kuliahnya." : "") + "\n\nLanjutkan?")) return;
  const akar = namaZip("Portofolio MK " + D.labelSemester.replace("/", "-"), 60);
  const tugas = [], berkas = [], ada2 = new Set(), jalurPeta = {}, gagalPeta = {}, gagal = [];
  const unik = j => { let x = j, n = 2; while (ada2.has(x.toLowerCase())) x = j.replace(/(\.[^.\/]+)?$/, ` (${n++})$1`); ada2.add(x.toLowerCase()); return x; };
  D.mk.forEach(m => {
    const fMk = `${akar}/${namaZip(m.kode + " " + m.nama)}`;
    m.kelas.forEach(u => {
      const fK = `${fMk}/${namaZip(u.label + (u.gKode ? " " + u.gKode : ""), 60)}`;
      berkas.push({ nama: unik(`${fK}/Catatan dan tautan.txt`), data: teksCatatanMkp(D, m, u) });
      u.berkas.filter(e => e.t === "file").forEach(e => {
        const j = NO_DOK_MKP[e.komp] ? `${fK}/${NO_DOK_MKP[e.komp]} ${namaZip(e.l, 40)} - ${namaZip(e.nama, 100)}` : `${fK}/Bukti pembelajaran/${e.ket ? namaZip(e.ket, 50) + " - " : ""}${namaZip(e.nama, 100)}`;
        tugas.push({ kode: m.kode, kunci: u.k, komp: e.komp, id: e.id, ukuran: e.ukuran || 0, jalur: unik(j), kunciPeta: m.kode + "|" + u.k + "|" + e.komp + "|" + e.id });
      });
    });
  });
  let i = 0;
  const batas = D.batch || 8 * 1048576;
  while (i < tugas.length) {
    const kirim = []; let sz = 0;
    while (i + kirim.length < tugas.length && kirim.length < 60) { const t = tugas[i + kirim.length]; if (kirim.length && sz + t.ukuran > batas) break; kirim.push(t); sz += t.ukuran; }
    toast(`Mengambil file ${i + 1}–${i + kirim.length} dari ${tugas.length}…`);
    let j;
    try { j = await api("mkp.ambilZip", { semester: D.semester, item: kirim.map(t => ({ kode: t.kode, kunci: t.kunci, komp: t.komp, id: t.id || undefined })) }); }
    catch (e) { kirim.forEach(t => { gagalPeta[t.kunciPeta] = e.message; gagal.push(t.jalur + ": " + e.message); }); i += kirim.length; continue; }
    const n = Math.max(1, Math.min(j.selesai || j.hasil.length, kirim.length));
    for (let q = 0; q < n; q++) {
      const t = kirim[q], h = j.hasil[q] || { ok: false, galat: "tidak ada jawaban" };
      if (h.ok) { berkas.push({ nama: t.jalur, data: dariBase64(h.isi) }); jalurPeta[t.kunciPeta] = t.jalur.slice(akar.length + 1); }
      else { gagalPeta[t.kunciPeta] = h.galat; gagal.push(t.jalur + ": " + h.galat); }
    }
    i += n;
  }
  toast("Menyusun ZIP…");
  const daftar = await UPW_ZIP.xlsx(lembarZipMkp(D, jalurPeta, gagalPeta)).arrayBuffer();
  berkas.unshift({ nama: `${akar}/Daftar isi.xlsx`, data: new Uint8Array(daftar) });
  if (gagal.length) berkas.push({ nama: `${akar}/berkas-gagal.txt`, data: "File berikut gagal diambil. Coba unduh ulang, atau buka langsung dari aplikasi.\r\n\r\n" + gagal.join("\r\n") + "\r\n" });
  const nm = arg.kode ? `${akar} - ${namaZip(arg.kode)}${arg.kunci ? " " + namaZip(arg.kunci.replace("/", " ")) : ""}.zip` : `${akar}.zip`;
  unduh(UPW_ZIP.zip(berkas), nm);
  toast(gagal.length ? `ZIP dibuat; ${gagal.length} file gagal diambil (lihat berkas-gagal.txt).` : `ZIP dibuat: ${tugas.length} file dari ${unit} kelas.`);
}
Object.assign(AKSI, {
  mkpZip(d) {
    const arg = { semester: d.s, kode: d.kode || undefined, kunci: d.kunci || undefined };
    const judul = d.kunci ? "Unduh bukti kelas ini." : d.kode ? "Unduh bukti semua kelas mata kuliah ini." : "Unduh semua bukti Portofolio MK semester ini.";
    jalankan(async () => { try { await buatZipMkp(arg, judul); } catch (e) { toast(e.message); } });
  }
});
/* ---------- RPS (v0.42.0): templat terisi, baca RPS Word, pemeriksaan butir 8, saran metode ---------- */
let janjiRps = null;
function muatRps() {
  if (window.UPW_RPS) return Promise.resolve();
  if (!janjiRps) janjiRps = new Promise((ok, no) => {
    const sc = document.createElement("script"); sc.src = "rps.js?v=" + encodeURIComponent(K.versi);
    sc.onload = () => { ok(); if (S.laci) render(); }; sc.onerror = () => { janjiRps = null; no(new Error("Modul RPS gagal dimuat. Periksa koneksi, lalu coba lagi.")); };
    document.head.appendChild(sc);
  });
  return janjiRps;
}
const TINGKAT_RPS = { wajib: ["Perlu diperbaiki", "s-ditolak"], saran: ["Saran", "s-diajukan"], ok: ["Sesuai", "s-disetujui"] };
const refPeriksaRps = (x0, G) => ({ cplProdi: x0.cplProdi || [], kualifikasi: x0.kualifikasiMk || null, cplMk: x0.cplMk || [], cplSek: x0.cplSek || [], unit: x0.unitMk || [], mk: { kode: (G && G.gKode) || x0.kode, sks: x0.sks, semester: x0.smtMk }, tim: ((G ? G.tim : x0.tim) || []).map(t => ({ nama: t.nama })) });
function bagianRps(x0, G) {
  if (!G) return "";
  const B = G.rpsBaca, e = G.rps, T = S.laci.rpsT;
  let h = `<div class="row small" style="flex-wrap:wrap;margin-top:6px"><button class="btn sm" data-act="rpsTemplat" ${S.sibuk ? "disabled" : ""}>${T ? "Tutup templat" : "Unduh templat RPS (terisi)"}</button>
    ${G.bolehUtama && e && e.t === "file" && !/\.docx$/i.test(e.nama || "") ? `<label class="btn sm" ${S.sibuk ? 'aria-disabled="true"' : ""}>${B ? "Perbarui" : "Unggah"} Word sumber untuk pemeriksaan<input type="file" data-mfile="rpsSumber" accept=".docx" hidden ${S.sibuk ? "disabled" : ""}></label>` : ""}
    <span class="hint">Unggah RPS resmi bertanda tangan dalam <b>PDF</b>, lalu tambahkan file <b>Word (.docx)</b> sumbernya agar aplikasi membaca CPL, CPMK, metode, dan bobot serta memeriksa kelengkapannya. Bisa juga langsung mengunggah Word.</span></div>`;
  if (T) h += panelTemplatRps(T);
  if (B && B.data) {
    if (!window.UPW_RPS) { muatRps().catch(() => {}); return h + `<div class="small muted">Memuat hasil baca RPS…</div>`; }
    const D = B.data, r = UPW_RPS.ringkas(D), cek = UPW_RPS.periksa(D, refPeriksaRps(x0, G)), nW = cek.filter(c => c.t === "wajib").length;
    h += `<div class="callout" style="margin-top:6px"><b>Hasil baca RPS</b> <span class="small muted">(${D.sumber === "templat" ? "dari templat aplikasi" : "format lain, dibaca sebisanya"})</span>:
      ${r.cpl} CPL${D.cpl.length ? ` (${esc(D.cpl.map(c => c.ref || c.kode).join(", "))})` : ""}, ${r.cpmk} CPMK, ${r.sub} Sub-CPMK, ${r.pertemuan} pertemuan, jumlah bobot ${String(r.bobot).replace(".", ",")}%.
      <div style="margin-top:6px"><b>Pemeriksaan butir 8</b> ${nW ? `<span class="chip s-ditolak">${nW} perlu diperbaiki</span>` : `<span class="chip s-disetujui">Unsur wajib lengkap</span>`}</div>
      <ul class="small" style="margin:4px 0 0 18px;padding:0">${cek.map(c => `<li style="margin-bottom:3px"><span class="chip ${TINGKAT_RPS[c.t][1]}">${TINGKAT_RPS[c.t][0]}</span> ${esc(c.teks)}</li>`).join("")}</ul>
      <span class="hint">Pemeriksaan otomatis memastikan unsur RPS lengkap (capaian pembelajaran, bahan kajian, metode, waktu dan tahapan, asesmen). Kedalaman dan keluasan isi tetap dinilai GKM.</span></div>`;
  } else if (e && e.t === "file") h += `<div class="hint" style="margin-top:4px">RPS ini belum diperiksa otomatis. Tambahkan file Word (.docx) sumbernya agar aplikasi bisa memeriksanya dan mengisi CPL di Tabel 4.</div>`;
  return h;
}
function panelTemplatRps(T) {
  if (!T.ref) return `<div class="memuat">Menyiapkan templat…</div>`;
  const R = T.ref, U = R.unsurCpl || {};
  return `<div class="picker" style="margin-top:6px"><b>Templat RPS ${esc(R.mk.kode)} · ${esc(R.labelKelas)}</b>
   <span class="hint">Sudah terisi: identitas mata kuliah dari kurikulum, dosen pengampu ${esc(R.labelKelas)}, otorisasi KPS dan Ketua Jurusan, waktu per pertemuan menurut sks${R.terakhir ? `, dan seluruh isi RPS ${esc(R.terakhir.labelSemester)} (tinggal ditinjau dan diperbarui)` : ""}. Bagian bertanda [ … ] diisi dosen.</span>
   ${R.otorisasi.kajurNama ? "" : `<div class="callout small">Nama Ketua Jurusan belum diatur. Admin Prodi mengisinya di Data Prodi › Kurikulum › Data bersama templat.</div>`}
   ${(R.cplMk || []).length ? `<div class="small"><b>CPL utama yang dibebankan (ditetapkan prodi, Data Prodi › Kurikulum; wajib diukur di RPS):</b><ul style="margin:4px 0 0 18px;padding:0">${R.cplMk.map(k => { const c = (R.cplProdi || []).find(v => v.k === k) || {}; return `<li><b>${esc(k)}</b> ${esc(c.t || "")}</li>`; }).join("")}</ul>${(R.cplSek || []).length ? `<div class="muted" style="margin-top:4px">CPL penunjang (boleh dicantumkan, tidak wajib diukur): ${esc(R.cplSek.join(", "))}</div>` : ""}</div>`
     : `<div class="callout small">Prodi belum menetapkan CPL mata kuliah ini (Data Prodi › Kurikulum › CPL &amp; unit). Sementara, pilih CPL yang dibebankan:</div>
   <b class="small">Pilih CPL prodi yang dibebankan pada mata kuliah ini (<span id="rpsCplN">${T.pilih.size}</span> dipilih)</b>
   <div class="gulir" style="max-height:260px">${Object.keys(U).map(u => `<div class="small" style="margin-top:6px"><b>${esc(U[u])}</b></div>` + (R.cplProdi || []).filter(c => c.u === u).map(c => `<label class="row small" style="align-items:flex-start;gap:6px;flex-wrap:nowrap"><input type="checkbox" data-rpscpl="${esc(c.k)}" ${T.pilih.has(c.k) ? "checked" : ""}><span><b>${esc(c.k)}</b> ${esc(c.t)}</span></label>`).join("")).join("")}</div>`}
   ${(R.unitKomp || []).length ? `<div class="small" style="margin-top:4px"><b>Bahan kajian (unit kompetensi kurikulum):</b> ${esc(R.unitKomp.map(u => u.k).join(", "))}</div>` : ""}
   <div class="row">${tombol("rpsUnduhTemplat", "Unduh templat (.docx)", "primary sm")}</div></div>`;
}
function saranMetodeRps(G, boleh) {
  if (!G || !G.rpsBaca || !G.rpsBaca.data) return "";
  if (!window.UPW_RPS) { muatRps().catch(() => {}); return ""; }
  const s = UPW_RPS.saranMetode(G.rpsBaca.data, S.laci.x.daftarMetode), ada = s.filter(v => v.ada), tb = s.filter(v => !v.ada && v.tambah);
  return `<div class="callout small" style="margin-top:6px"><b>Saran dari RPS:</b> ${ada.length ? ada.map(v => `<b>${esc(v.m)}</b> <span class="muted">(${esc(v.alasan)})</span>`).join("; ") : "metode belum terbaca dari RPS"}.
    ${tb.length ? `<div style="margin-top:4px"><b>Pertimbangkan:</b> ${tb.map(v => `${esc(v.m)}: ${esc(v.tambah)}`).join(" ")}</div>` : ""}
    ${boleh && ada.length ? `<div class="row" style="margin-top:4px"><button class="btn sm" data-act="mkpMetodeRps">Centang sesuai RPS</button><span class="hint">lalu periksa dan tekan Simpan metode</span></div>` : ""}</div>`;
}
async function unggahRpsWord(f) {
  let data = null;
  try {
    await muatRps();
    data = await UPW_RPS.baca(await f.arrayBuffer());
    let j = JSON.stringify(data);
    if (j.length > 47000) { data.pertemuan.forEach(p => { ["bahan", "pengalaman", "kriteria"].forEach(k => { if (p[k] && p[k].length > 300) p[k] = p[k].slice(0, 297) + "…"; }); }); j = JSON.stringify(data); }
    if (j.length > 47000) throw new Error("isi RPS terlalu panjang untuk dibaca otomatis");
  } catch (err) {
    data = null;
    if (!confirm(`RPS tidak bisa dibaca otomatis: ${err.message}\n\nTetap unggah tanpa pemeriksaan otomatis?`)) return;
  }
  try { const isi = await bacaBase64(f); unggahMkp("rps", data ? { nama: f.name, isi, rps: JSON.stringify(data) } : { nama: f.name, isi }); }
  catch (err) { toast(err.message); }
}
/** Word sumber untuk RPS resmi (PDF): dibaca di browser, hanya hasil bacanya yang dikirim (v0.43.0). */
async function bacaRpsSumber(f) {
  if (!/\.docx$/i.test(f.name)) { toast("Pilih file Word (.docx) sumber RPS."); return; }
  try {
    await muatRps();
    const data = await UPW_RPS.baca(await f.arrayBuffer());
    const x = S.laci.x;
    jalankan(async () => { gantiMkp(await api("mkp.rpsBaca", { semester: x.semester, kode: x.kode, kunci: S.laci.kel || undefined, rps: JSON.stringify(data) })); toast("RPS Word dibaca dan diperiksa."); });
  } catch (err) { toast("RPS tidak bisa dibaca otomatis: " + err.message); }
}
/** Centang tanda tangan pada dokumen resmi + catatan bila belum lengkap (dokumen tetap diterima). */
function ttdMkpHtml(k, e, boleh, x0) {
  const D = x0.ttdMkp[k], t = e.ttd || {}, kurang = D.filter(([kk]) => !t[kk]);
  const catatan = e.ttd ? (kurang.length ? `<span class="chip s-diajukan">Catatan</span> Belum bertanda tangan: ${esc(kurang.map(v => v[1]).join(", "))}. Dokumen tetap diterima; unggah ulang setelah lengkap.` : `<span class="chip s-disetujui">Tanda tangan lengkap</span>`)
    : `<span class="chip s-diajukan">Catatan</span> Tanda tangan pada dokumen belum dikonfirmasi.`;
  return `<div class="small" style="margin-top:6px">${catatan}
    ${boleh ? `<div class="row small" style="flex-wrap:wrap;gap:10px;margin-top:4px"><span class="muted">Sudah ditandatangani:</span>${D.map(([kk, l]) => `<label class="row" style="gap:4px"><input type="checkbox" data-mttd="${k}:${kk}" ${t[kk] ? "checked" : ""}>${esc(l)}</label>`).join("")}<button class="btn sm" data-act="mkpTtd" data-komp="${k}" ${S.sibuk ? "disabled" : ""}>Simpan</button></div>` : ""}</div>`;
}
/** Tahap 2 (v0.43.0): templat kontrak kuliah, rubrik, dan lembar portofolio penilaian, terisi dari RPS terbaca kelas ini (atau RPS terakhir MK). */
function bagianTemplatNilai(k, G) {
  const dis = S.sibuk ? "disabled" : "", ada = !!(G && G.rpsBaca && G.rpsBaca.data);
  const tombolT = k === "kontrak" ? `<button class="btn sm" data-act="mkpTemplat" data-j="kontrak" ${dis}>Unduh templat kontrak kuliah (terisi)</button>`
    : `<button class="btn sm" data-act="mkpTemplat" data-j="rubrik" ${dis}>Unduh templat rubrik penilaian (terisi)</button>`;
  const hint = k === "kontrak" ? "Memuat 7 unsur pelaksanaan penilaian butir 25 (rencana penilaian, kesepakatan, umpan balik, dokumentasi, prosedur, pelaporan nilai, perbaikan dari monev), teknik dan instrumen penilaian, serta tanda tangan dosen, perwakilan mahasiswa, dan KPS."
    : "Rubrik per penilaian (kriteria dari indikator RPS, empat tingkat kinerja) dan 5 prinsip penilaian butir 25.";
  return `${k === "rubrik" ? bagianNilaiSiakad(G) : ""}<div class="row small" style="flex-wrap:wrap;margin-top:6px">${tombolT}</div><span class="hint">${hint} ${ada ? "Terisi dari RPS kelas ini." : `<b>RPS kelas ini belum terbaca:</b> unggah RPS lebih dulu (PDF + Word sumber, atau Word) agar rencana penilaian, bobot, CPMK, dan indikator terisi otomatis. Tanpa RPS, templat berisi isian [ … ] untuk diisi sendiri.`} Unggah hasil akhirnya dalam PDF bertanda tangan.</span>`;
}
async function refTemplat() {
  const x = S.laci.x, k = S.laci.kel || "", c = S.laci.refT;
  if (c && c.k === k && c.s === x.semester) return c.R;
  const R = await api("mkp.rpsRef", { semester: x.semester, kode: x.kode, kunci: k || undefined });
  S.laci.refT = { k, s: x.semester, R }; return R;
}
/* ---------- Tahap 3 (v0.44.0): contoh dan templat tiap isian, saran integrasi penelitian/PkM ---------- */
const LABEL_JENIS_INTEG = { penelitian: "penelitian", pkm: "PkM", publikasi: "publikasi" };
const CONTOH_MKP = {
  rps: { teks: ["CPL prodi ditulis dengan kode dan rumusan yang sama dengan kurikulum, mis. <i>CPL1 (S9) Menunjukkan sikap bertanggung jawab atas pekerjaan di bidang keahliannya secara mandiri</i>.",
      "Setiap CPMK diakhiri CPL yang didukung, mis. <i>CPMK 2: Mampu merancang dan memproduksi buku profil wisata … (CPL3, CPL2)</i>.",
      "Setiap pertemuan berisi Sub-CPMK, bahan kajian, metode, <b>waktu</b> (mis. <i>Praktik: 4 JP × 50' = 200'</i>), tugas, kriteria/indikator, bobot, dan nomor pustaka. Jumlah bobot termasuk UTS dan UAS = 100%."],
    pdf: [["rps", "Lihat contoh RPS lengkap (PDF)"]] },
  kontrak: { teks: ["Memuat 7 unsur butir 25: rencana penilaian dan bobot, kesepakatan pelaksanaan (batas tugas, keterlambatan), umpan balik dan hak mempertanyakan nilai, dokumentasi penilaian, prosedur penilaian, pelaporan nilai huruf dan angka, serta perbaikan dari monev.",
      "Ditandatangani dosen, perwakilan mahasiswa, dan KPS pada pertemuan pertama, lalu diunggah dalam PDF."], pdf: [["kontrak", "Lihat contoh kontrak kuliah (PDF)"]] },
  rubrik: { teks: ["Satu rubrik untuk setiap penilaian: kriteria dari indikator RPS dengan deskripsi kinerja untuk tiap tingkat, mis. <i>Kualitas storytelling visual — Sangat baik: foto hero dan pendukung kuat, Rule of Thirds tepat …</i>.",
      "Contoh lain: rubrik presentasi itinerary, lembar observasi praktik pemanduan, rubrik buku profil wisata. Rekap nilai per mahasiswa diunggah dari SIAKAD setelah perkuliahan selesai."],
    pdf: [["rubrik", "Lihat contoh rubrik (PDF)"]] },
  metode: { teks: ["<b>Project based learning</b>: mahasiswa memproduksi buku profil desa wisata bersama mitra sepanjang semester.", "<b>Case based learning</b>: menganalisis kasus keluhan wisatawan pada biro perjalanan nyata.",
    "<b>Research based education</b>: mahasiswa mengolah data survei penelitian dosen tentang preferensi wisatawan.", "<b>Industry based education</b>: praktisi biro perjalanan mengajar GDS; tugas dari kasus perusahaan mitra.",
    "<b>Teaching industry/factory</b>: mahasiswa melayani pemesanan nyata di unit usaha perjalanan kampus.", "<b>Praktik lapangan di destinasi</b>: kunjungan ke daya tarik wisata untuk dokumentasi dan wawancara.", "<b>Daring/blended</b>: materi dan kuis di LMS, praktik tatap muka."] },
  integ: { teks: ["Penelitian: <i>Hasil penelitian dosen \"Preferensi wisatawan Eropa terhadap paket wellness\" (2025) dipakai sebagai studi kasus pertemuan 6–7: mahasiswa merancang paket berdasarkan temuan penelitian, dinilai dengan rubrik paket wisata.</i>",
    "PkM: <i>Tugas proyek dilaksanakan di desa wisata mitra PkM dosen (pendampingan paket wisata 2026): mahasiswa memproduksi buku profil desa tersebut; hasilnya diserahkan kepada mitra.</i>",
    "Tuliskan penelitian/PkM yang dipakai, pada pertemuan berapa, apa yang dikerjakan mahasiswa, hasilnya, dan cara menilainya (SN Dikti: hasil, isi, proses, penilaian; butir 22 C–D). Tautkan ke kegiatannya bila tercatat di aplikasi."] },
  interaksi: { teks: ["Butir 22 A skor 4: interaksi dosen–mahasiswa–sumber belajar secara <b>daring dan luring</b> yang <b>terdokumentasi audio-visual</b>.",
    "Contoh: tautan kelas LMS (daring), foto/video sesi studio dan kunjungan lapangan (luring) dengan keterangan pertemuan, rekaman presentasi akhir. Video atau album: pakai tautan."] }
};
function contohMkpHtml(k) {
  const C = CONTOH_MKP[k]; if (!C) return "";
  return `<details class="small" style="margin-top:4px"><summary style="cursor:pointer;color:var(--brand)">Contoh</summary><ul style="margin:4px 0 4px 18px;padding:0">${C.teks.map(t => `<li style="margin-bottom:3px">${t}</li>`).join("")}</ul>
    ${C.pdf ? `<div class="row" style="flex-wrap:wrap">${C.pdf.map(([j, l]) => `<button class="btn sm" data-act="lihatContoh" data-j="${j}" data-l="${esc(l)}">${l}</button>`).join("")}</div><span class="hint">Contoh hanya gambaran (dibuka di dalam aplikasi; tutup dengan Kembali ke aplikasi), dari RPS Praktik Desain dan Media Digital Prodi UPW tanpa nama pejabat. Untuk mengerjakan, pakai tombol templat (terisi).</span>` : ""}</details>`;
}
Object.assign(AKSI, { lihatContoh(d) { lihatBerkasUrl(`contoh/${d.j}.pdf?v=${encodeURIComponent(K.versi)}`, String(d.l || d.j).replace(/^Lihat\s+/i, "").replace(/\s*\(PDF\)\s*/i, "").replace(/^./, c => c.toUpperCase()) + ".pdf"); } });
/** Render ulang tanpa menghapus catatan integrasi yang sedang diketik. */
function renderJagaInteg() { const v = $("mkpInteg") ? $("mkpInteg").value : null; render(); const e = $("mkpInteg"); if (e && v !== null) e.value = v; }
/** Saran integrasi: penelitian/PkM/publikasi tim kelas ini, diurutkan menurut kecocokan kata dengan RPS kelas ini (tanpa AI). */
const STOP_INTEG = new Set("dan yang untuk dengan pada dalam dari atau serta oleh sebagai bagi ini itu akan para melalui terhadap secara mahasiswa mata kuliah pertemuan wisata pariwisata wisatawan bali indonesia program studi politeknik tahun semester kegiatan perjalanan usaha travel tour biro".split(" "));
function kataInteg(t) {
  const h = new Set();
  String(t || "").toLowerCase().replace(/[^a-z0-9à-ÿ\s-]/g, " ").split(/[\s-]+/).filter(w => w.length >= 4 && !STOP_INTEG.has(w) && !/^\d+$/.test(w)).forEach(w => akarKata(w).forEach(v => { if (v.length >= 4) h.add(v); }));
  return h;
}
function saranIntegHtml(G) {
  const T = S.laci.integS;
  if (!T) return `<div class="row small" style="margin-top:6px"><button class="btn sm" data-act="integSaran" ${S.sibuk ? "disabled" : ""}>Cari penelitian/PkM tim yang cocok dengan RPS</button></div>`;
  if (!T.data) return `<div class="memuat">Mencari penelitian dan PkM tim…</div>`;
  const D = G && G.rpsBaca && G.rpsBaca.data, x = S.laci.x;
  const sumber = D ? [D.deskripsi, D.bahan, (D.cpmk || []).map(c => c.t).join(" "), (D.sub || []).map(c => c.t).join(" "), (D.pertemuan || []).map(p => p.bahan).join(" ")].join(" ") : x.nama;
  const kRps = kataInteg(sumber + " " + x.nama);
  const l = T.data.kegiatan.map(k => { const kj = kataInteg(k.judul), kk = kataInteg(k.ket), cocok = [...new Set([...kj].filter(w => kRps.has(w)).concat([...kk].filter(w => kRps.has(w))))];
    return Object.assign({}, k, { skor: [...kj].filter(w => kRps.has(w)).length * 2 + [...kk].filter(w => kRps.has(w)).length, cocok }); }).sort((a, b) => b.skor - a.skor);
  const baris = k => `<div class="item"><div class="body"><div class="title" style="font-size:13px">${esc(k.judul)}</div><div class="meta"><span class="tag">${esc(k.jenisLabel)}</span><span>${esc(String(k.tgl || "").slice(0, 4))}</span><span>${esc(k.dosen.map(namaPendek).join(", "))}</span>${k.cocok.length ? `<span>cocok: ${esc(k.cocok.slice(0, 5).join(", "))}</span>` : ""}</div></div>
    <div class="row bk-aksi"><button class="btn sm" data-act="integPakai" data-id="${esc(k.id)}">Pakai</button><button class="btn sm" data-act="bukaKeg" data-id="${esc(k.id)}">Lihat</button></div></div>`;
  const atas = l.filter(k => k.skor > 0), lain = l.filter(k => !k.skor);
  return `<div class="picker" style="margin-top:6px"><b>Penelitian/PkM tim yang bisa diintegrasikan</b><span class="hint">${D ? "Diurutkan menurut kecocokan kata dengan RPS kelas ini." : "RPS kelas ini belum terbaca: diurutkan menurut nama mata kuliah. Unggah RPS Word agar pencocokan lebih tepat."} Sumber: kegiatan penelitian, PkM, dan publikasi 5 tahun terakhir milik dosen tim kelas ini.</span>
    ${l.length ? (atas.length ? atas.slice(0, 6).map(baris).join("") : `<div class="small muted">Belum ada yang cocok dengan isi RPS.</div>`) + (lain.length ? `<details class="small"><summary>Lainnya (${lain.length})</summary>${lain.slice(0, 20).map(baris).join("")}</details>` : "")
      : `<div class="small muted">Belum ada penelitian/PkM tim yang tercatat. Catat di menu Kegiatan agar bisa ditautkan.</div>`}</div>`;
}
/* ---------- v0.45.0: rekap nilai dari SIAKAD (portofolio penilaian) ----------
   Berkas "Download Template" SIAKAD (Kelas Kuliah → Nilai Perkuliahan → Upload Excel): lembar "Form Inputan" berisi No, NIM, Nama Mahasiswa,
   komponen "NAMA (bobot%)", lalu Nilai, Grade, Keterangan (Nilai/Grade bernilai 0 di template; dihitung di sini). Dibaca di browser; yang dikirim hanya ringkasan. */
const JALUR_SIAKAD = "SIAKAD: <b>Kelas Kuliah → Nilai Perkuliahan → Upload Excel → Download Template</b>";
function bacaNilaiSiakad(lembar, o = {}) {
  const L = lembar.find(l => l.baris.some(r => r.some(v => /^NIM$/i.test(String(v).trim())))) || lembar[0];
  if (!L) throw new Error("Lembar nilai tidak ditemukan.");
  const y0 = L.baris.findIndex(r => r.some(v => /^NIM$/i.test(String(v).trim())));
  if (y0 < 0) throw new Error("Kolom NIM tidak ditemukan. Pastikan berkas dari Download Template SIAKAD.");
  const H = L.baris[y0].map(v => String(v ?? "").trim()), iNim = H.findIndex(v => /^NIM$/i.test(v)), iNama = H.findIndex(v => /^Nama/i.test(v));
  const komp = H.map((v, i) => { const m = v.match(/^(.*?)\s*\(\s*(\d+(?:[.,]\d+)?)\s*%\s*\)\s*$/); return m && i > iNim ? { i, n: m[1].trim(), b: Number(m[2].replace(",", ".")) } : null; }).filter(Boolean);
  if (!komp.length) throw new Error("Kolom komponen dengan bobot (mis. \"UTS (25%)\") tidak ditemukan.");
  const angka = v => { if (v === "" || v == null) return null; const n = typeof v === "number" ? v : Number(String(v).replace(",", ".")); return isFinite(n) ? n : null; };
  const mhs = L.baris.slice(y0 + 1).filter(r => String(r[iNim] ?? "").trim()).map(r => ({ nim: String(r[iNim]).trim(), nama: String(r[iNama] ?? "").trim(), v: komp.map(k => angka(r[k.i])) }));
  if (!mhs.length) throw new Error("Tidak ada baris mahasiswa (NIM) di berkas.");
  const totalBobot = Math.round(komp.reduce((a, k) => a + k.b, 0) * 100) / 100;
  const komponen = komp.map((k, j) => { const isi = mhs.map(m => m.v[j]).filter(v => v != null); return { n: k.n, b: k.b, rata: isi.length ? Math.round(isi.reduce((a, v) => a + v, 0) / isi.length * 100) / 100 : null, kosong: mhs.length - isi.length }; });
  const lengkap = mhs.filter(m => m.v.every(v => v != null)), akhir = lengkap.map(m => m.v.reduce((a, v, j) => a + v * komp[j].b, 0) / (totalBobot || 100));
  const skala = (o.skala || []).slice().sort((a, b) => b.a - a.a), sebaran = {};
  if (skala.length) akhir.forEach(v => { const g = (skala.find(s => v >= s.a) || skala[skala.length - 1]).h; sebaran[g] = (sebaran[g] || 0) + 1; });
  const catatan = [];
  if (totalBobot !== 100) catatan.push(`Jumlah bobot ${String(totalBobot).replace(".", ",")}%, seharusnya 100%.`);
  komponen.filter(k => k.kosong).forEach(k => catatan.push(k.kosong === mhs.length ? `${k.n} belum diisi.` : `${k.n} kosong untuk ${k.kosong} dari ${mhs.length} mahasiswa.`));
  const kodeBerkas = (String(o.namaBerkas || "").match(/_(\d{6,})_/) || [])[1] || "";
  if (kodeBerkas && o.kodeMk && !o.kodeMk.some(k => String(k).replace(/\s/g, "") === kodeBerkas)) catatan.push(`Kode MK di nama berkas (${kodeBerkas}) berbeda dengan mata kuliah ini (${o.kodeMk.filter(Boolean).join(" / ")}).`);
  let cocokNim = null;
  if (o.nimPeserta && o.nimPeserta.length) { const set = new Set(o.nimPeserta.map(String)), c = mhs.filter(m => set.has(m.nim)).length; cocokNim = { cocok: c, total: mhs.length, peserta: o.nimPeserta.length };
    if (c < mhs.length * 0.8) catatan.push(`Hanya ${c} dari ${mhs.length} NIM cocok dengan peserta kelas di aplikasi; pastikan berkas kelas yang benar.`); }
  (o.ujianRps || []).forEach(u => { const k = komp.find(v => new RegExp("^" + u.ujian + "\\b", "i").test(v.n)); if (k && u.bobot != null && k.b !== u.bobot) catatan.push(`Bobot ${u.ujian} di SIAKAD ${k.b}%, di RPS ${u.bobot}% (butir 25: penilaian sesuai kontrak/RPS).`); });
  return { komponen, totalBobot, nMhs: mhs.length, lengkap: lengkap.length, rataAkhir: akhir.length ? Math.round(akhir.reduce((a, v) => a + v, 0) / akhir.length * 100) / 100 : null, sebaran, kodeBerkas, cocokNim, catatan };
}
function bagianNilaiSiakad(G) {
  if (!G) return "";
  const e = G.nilai, R = e && e.ring, dis = S.sibuk ? "disabled" : "", f = v => v == null ? "–" : String(v).replace(".", ",");
  return `<div class="picker" style="margin:6px 0"><b>Rekap nilai dari SIAKAD (portofolio penilaian)</b>
    <span class="hint">Diambil dari ${JALUR_SIAKAD}. Unggah <b>setelah perkuliahan selesai</b>, saat semua bobot dan nilai (termasuk UAS) sudah terisi di SIAKAD. Berkas diunggah apa adanya (.xls); aplikasi membaca komponen, bobot, dan nilai, lalu menghitung nilai akhir.</span>
    ${e ? `${entriMkp(e, "nilai", false)}
      ${R ? `<div class="tbl-wrap"><table><thead><tr><th>Komponen</th><th>Bobot</th><th>Rata-rata</th><th>Kosong</th></tr></thead><tbody>${R.komponen.map(k => `<tr><td>${esc(k.n)}</td><td class="num">${f(k.b)}%</td><td class="num">${f(k.rata)}</td><td class="num">${k.kosong || ""}</td></tr>`).join("")}
        <tr><td><b>Jumlah</b></td><td class="num"><b>${f(R.totalBobot)}%</b></td><td colspan="2"></td></tr></tbody></table></div>
        <div class="small">${R.nMhs} mahasiswa · nilai lengkap ${R.lengkap} · rata-rata nilai akhir ${f(R.rataAkhir)}${Object.keys(R.sebaran || {}).length ? ` · sebaran: ${Object.entries(R.sebaran).map(([h, n]) => `${esc(h)} ${n}`).join(", ")}` : ""}</div>
        <div class="small" style="margin-top:4px">${R.catatan.length ? R.catatan.map(c => `<div><span class="chip s-diajukan">Catatan</span> ${esc(c)}</div>`).join("") + '<span class="hint">Berkas tetap diterima. Lengkapi nilai di SIAKAD, unduh ulang templatnya, lalu unggah lagi.</span>' : '<span class="chip s-disetujui">Bobot 100% dan semua nilai terisi</span>'}</div>` : ""}` : ""}
    ${G.bolehUtama ? `<div class="row small" style="flex-wrap:wrap;margin-top:4px"><label class="btn sm" ${S.sibuk ? 'aria-disabled="true"' : ""}>${e ? "Ganti" : "Unggah"} nilai dari SIAKAD (.xls)<input type="file" data-mfile="nilai" accept=".xls,.xlsx" hidden ${dis}></label>${e ? `<button class="btn sm bad" data-act="mkpNilaiHapus" ${dis}>Hapus</button>` : ""}</div>` : ""}</div>`;
}
async function unggahNilaiSiakad(f) {
  if (!/\.xlsx?$/i.test(f.name)) { toast("Pilih berkas Excel dari SIAKAD (.xls)."); return; }
  const x = S.laci.x, { G } = viewMkp();
  jalankan(async () => {
    const buf = await f.arrayBuffer(); let lembar;
    try { lembar = await UPW_ZIP.bacaXlsx(buf); } catch (_) { throw new Error("Berkas tidak terbaca sebagai Excel. Unduh ulang dari SIAKAD (Download Template), lalu unggah tanpa diubah."); }
    let skala = [], nim = null;
    try { skala = ((await refTemplat()).otorisasi || {}).skala || []; } catch (_) { /* tanpa skala */ }
    try { const P = await api("peserta.data", { semester: x.semester, kodeMk: x.kode }); const kk = (P.kunci || []).find(q => q.k === S.laci.kel) || null; nim = kk ? kk.peserta.map(m => m.nim) : null; } catch (_) { /* tanpa cek NIM */ }
    const D = G && G.rpsBaca && G.rpsBaca.data, ujianRps = D ? ["UTS", "UAS"].map(u => ({ ujian: u, bobot: ((D.porto || []).find(p => p.ujian === u) || (D.pertemuan || []).find(p => p.ujian === u) || {}).bobot })).filter(u => u.bobot != null) : [];
    const ring = bacaNilaiSiakad(lembar, { skala, namaBerkas: f.name, kodeMk: [x.kode, G && G.gKode], nimPeserta: nim, ujianRps });
    const isi = await bacaBase64(f);
    gantiMkp(await api("mkp.nilaiUnggah", { semester: x.semester, kode: x.kode, kunci: S.laci.kel || undefined, nama: f.name, isi, ring: JSON.stringify(ring) }));
    toast(ring.catatan.length ? `Nilai diunggah dengan ${ring.catatan.length} catatan.` : "Nilai diunggah: bobot 100% dan semua nilai terisi.");
  });
}
/* ---------- v0.46.0: CPL yang dibebankan dan unit kompetensi per mata kuliah (Data Prodi › Kurikulum) ---------- */
const teksUnit = l => (l || []).map(u => [u.k, u.en, u.id].join(" | ")).join("\n");
const bacaTeksUnit = t => String(t || "").split("\n").map(s => s.trim()).filter(Boolean).map(s => { const p = s.split("|").map(v => v.trim()); return { k: p[0] || "", en: p[1] || "", id: p[2] || "" }; });
function laciCplMk() {
  const L = S.laci, X = L.x, dis = S.sibuk ? "disabled" : "", U = X.unsurCpl || {}, us = X.usulan || { rps: [], unit: [] };
  const lencana = k => (us.rps.includes(k) ? ` <span class="tag" title="Dipakai di RPS ${esc(us.rpsSemester)}">RPS</span>` : "") + (us.unit.includes(k) ? ` <span class="tag" title="Cocok dengan unit kompetensi">unit</span>` : "");
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="CPL dan unit kompetensi" style="width:min(720px,100%)">
   <div class="dh"><h2>${esc(X.kode)} · ${esc(X.nama)}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   <p class="small muted">Semester ${X.semester}. CPL yang dibebankan adalah keputusan kurikulum prodi: setelah ditetapkan, templat RPS memakainya, pemeriksaan RPS membandingkannya, dan Tabel 4 iLKPS mengambil unsur CPL dari sini.</p>
   ${galatHtml()}
   <div class="picker"><b>CPL yang dibebankan</b> ${X.ditetapkan.length ? `<span class="chip s-disetujui">Ditetapkan${X.oleh ? ` oleh ${esc(namaPendek(X.oleh))}` : ""}${X.pada ? `, ${esc(tglPendek(X.pada))}` : ""}${X.sumber === "impor" ? " (impor Excel)" : ""}</span>` : `<span class="chip s-revisi">Belum ditetapkan</span>`}
     <span class="hint">Tanda <span class="tag">RPS</span> = dipakai di RPS terakhir${us.rpsSemester ? ` (${esc(us.rpsSemester)})` : ""}; <span class="tag">unit</span> = kata rumusan CPL cocok dengan unit kompetensi MK ini (usulan lemah, hanya titik awal). CPL Sikap dan Keterampilan Umum tidak bisa diusulkan otomatis.</span>
     ${X.boleh && (us.rps.length || us.unit.length) ? `<div class="row small" style="flex-wrap:wrap">${us.rps.length ? `<button class="btn sm" data-act="cplMkUsul" data-dari="rps">Centang usulan dari RPS</button>` : ""}${us.unit.length ? `<button class="btn sm" data-act="cplMkUsul" data-dari="unit">Tambah usulan dari unit</button>` : ""}</div>` : ""}
     <div class="gulir" style="max-height:340px">${Object.keys(U).map(u => `<div class="small" style="margin-top:6px"><b>${esc(U[u])}</b></div>` + X.cplProdi.filter(c => c.u === u).map(c => `<div class="row small" style="align-items:flex-start;gap:6px;flex-wrap:nowrap;justify-content:space-between"><label class="row small" style="align-items:flex-start;gap:6px;flex-wrap:nowrap"><input type="checkbox" data-cplmk="${esc(c.k)}" ${L.pilih.has(c.k) ? "checked" : ""} ${X.boleh ? "" : "disabled"}><span><b>${esc(c.k)}</b>${lencana(c.k)} ${esc(c.t)}</span></label>
       <label class="small muted" style="white-space:nowrap" title="CPL penunjang (sekunder): didukung MK ini, tidak wajib diukur di RPS"><input type="checkbox" data-cplsek="${esc(c.k)}" ${L.sek.has(c.k) ? "checked" : ""} ${X.boleh ? "" : "disabled"}> penunjang</label></div>`).join("")).join("")}</div>
     <span class="hint">Centang kiri = <b>CPL utama</b> (primer, wajib diukur di RPS dan masuk Tabel 4). Centang <b>penunjang</b> = CPL sekunder yang didukung MK ini tetapi tidak wajib diukur.</span>
     ${X.boleh ? `<label class="small">Rasional pembebanan (boleh kosong)<textarea id="cplMkAlasan" rows="2" maxlength="600" placeholder="Mengapa CPL ini dibebankan pada MK ini dan bagaimana diases">${esc(L.alasan)}</textarea></label>` : X.alasan ? `<div class="small"><b>Rasional:</b> ${esc(X.alasan)}</div>` : ""}
     ${X.boleh ? `<div class="row" style="justify-content:space-between;flex-wrap:wrap"><span class="small"><span id="cplMkN">${L.pilih.size}</span> CPL utama, <span id="cplMkS">${L.sek.size}</span> penunjang</span>${tombol("cplMkSimpan", "Tetapkan CPL", "primary sm")}</div>` : ""}</div>
   <div class="picker"><b>Unit kompetensi (bahan kajian)</b> <span class="tag">${X.unitBawaan ? "bawaan dokumen kurikulum" : "diubah prodi"}</span>
     <span class="hint">Dari lembar "Pembentukan Mata Kuliah" berkas Pemetaan Kurikulum UPW ASEAN MRA-TP 2023 (dicocokkan dengan nama MK). Mengisi kolom Bahan Kajian di templat RPS.</span>
     ${X.boleh ? `<textarea id="cplMkUnit" rows="${Math.max(3, X.unit.length + 1)}" placeholder="Kode | nama unit (Inggris) | nama Indonesia, satu unit per baris">${esc(teksUnit(X.unit))}</textarea>
       <div class="row" style="flex-wrap:wrap;justify-content:flex-end">${X.unitBawaan ? "" : `<button class="btn sm" data-act="cplMkUnitBawaan" ${dis}>Kembalikan ke bawaan</button>`}${tombol("cplMkUnitSimpan", "Simpan unit", "sm")}</div>`
       : X.unit.length ? `<ul class="small" style="margin:4px 0 0 18px;padding:0">${X.unit.map(u => `<li><b>${esc(u.k)}</b> ${esc(u.en)}${u.id ? ` <span class="muted">(${esc(u.id)})</span>` : ""}</li>`).join("")}</ul>` : '<div class="small muted">Tidak ada unit kompetensi untuk MK ini.</div>'}</div>
  </div></div>`;
}
function bukaCplMk(j) { S.laci = { jenis: "cplMk", x: j, pilih: new Set(j.ditetapkan), sek: new Set(j.sekunder || []), alasan: j.alasan || "" }; S.galat = ""; render(); }
Object.assign(AKSI, {
  cplMkBuka(d) { sekali("cplMk", async () => bukaCplMk(await api("dp.cplMk", { kode: d.kode }))); },
  cplMkUsul(d) { const us = S.laci.x.usulan, v = $("cplMkUnit") ? $("cplMkUnit").value : null; if ($("cplMkAlasan")) S.laci.alasan = $("cplMkAlasan").value;
    if (d.dari === "rps") S.laci.pilih = new Set(us.rps); else us.unit.forEach(k => S.laci.pilih.add(k)); S.laci.pilih.forEach(k => S.laci.sek.delete(k)); render(); if (v !== null && $("cplMkUnit")) $("cplMkUnit").value = v; },
  cplMkSimpan() {
    const X = S.laci.x;
    if (!S.laci.pilih.size && !confirm("Hapus penetapan CPL untuk mata kuliah ini?")) return;
    jalankan(async () => { const j = await api("dp.cplMkSimpan", { kode: X.kode, cpl: [...S.laci.pilih], sek: [...S.laci.sek].filter(k => !S.laci.pilih.has(k)), alasan: $("cplMkAlasan") ? $("cplMkAlasan").value : S.laci.alasan }); bukaCplMk(j); S.dp = null; toast("CPL mata kuliah ditetapkan."); });
  },
  cplMkUnitSimpan() {
    const X = S.laci.x, unit = bacaTeksUnit($("cplMkUnit")?.value);
    jalankan(async () => { const j = await api("dp.cplMkSimpan", { kode: X.kode, unit }); bukaCplMk(j); S.dp = null; toast("Unit kompetensi disimpan."); });
  },
  cplMkUnitBawaan() {
    const X = S.laci.x;
    jalankan(async () => { const j = await api("dp.cplMkSimpan", { kode: X.kode, unitBawaan: true }); bukaCplMk(j); S.dp = null; toast("Unit kompetensi kembali ke bawaan."); });
  }
});
/* ---------- v0.48.0: pembebanan CPL per MK dari Excel (impor + unduh), Data Prodi › Kurikulum ---------- */
/** Cari lembar & baris judul berisi "Kode MK" dan "CPL Primer/Utama"; kembalikan baris pemetaan {no, semester, kode, nama, primer, sek, alasan}. */
function bacaPemetaanCpl(lembar) {
  const cocok = (h, re) => h.findIndex(v => re.test(String(v == null ? "" : v).trim()));
  for (const L of lembar) {
    for (let i = 0; i < Math.min(L.baris.length, 30); i++) {
      const h = (L.baris[i] || []).map(v => String(v == null ? "" : v));
      const c = { kode: cocok(h, /^kode\s*m(k|ata\s*kuliah)/i), nama: cocok(h, /^(nama\s*)?mata\s*kuliah/i), primer: cocok(h, /cpl\s*(primer|utama)/i), sek: cocok(h, /cpl\s*(sekunder|penunjang)/i),
        alasan: cocok(h, /rasional|alasan/i), no: cocok(h, /^no\.?$/i), semester: cocok(h, /^semester|^smt/i) };
      if (c.primer < 0 || (c.kode < 0 && c.nama < 0)) continue;
      const ambil = (r, k) => c[k] < 0 ? "" : String(r[c[k]] == null ? "" : r[c[k]]).trim();
      const baris = L.baris.slice(i + 1).map(r => r || []).filter(r => (ambil(r, "kode") || ambil(r, "nama")) && ambil(r, "primer"))
        .map(r => ({ no: ambil(r, "no").replace(/\.0$/, ""), semester: ambil(r, "semester"), kode: ambil(r, "kode").replace(/\.0$/, ""), nama: ambil(r, "nama"), primer: ambil(r, "primer"), sek: ambil(r, "sek"), alasan: ambil(r, "alasan") }));
      if (baris.length) return { lembar: L.nama, baris };
    }
  }
  throw new Error('Kolom "Kode MK" (atau "Nama Mata Kuliah") dan "CPL Primer" tidak ditemukan. Pakai lembar pemetaan dengan judul kolom seperti berkas unduhan "Unduh pemetaan (Excel)".');
}
function panelCplImpor() {
  const X = S.cplImp, dis = S.sibuk ? "disabled" : "", P = X && X.hasil;
  const daftar = l => (l || []).length ? esc(l.join(", ")) : '<span class="muted">–</span>';
  return `<section class="panel"><h2>Pembebanan CPL per mata kuliah</h2>
   <p class="small">Unggah berkas Excel pemetaan CPL–MK yang sudah diputuskan prodi. Kolom yang dibaca: <b>Kode MK</b>, <b>Nama Mata Kuliah</b>, <b>CPL Primer</b> (CPL utama, wajib diukur di RPS), <b>CPL Sekunder</b> (penunjang), dan <b>Rasional</b> (boleh kosong).
     Kode beberapa MK pilihan boleh ditulis dengan garis miring (mis. 231041217 / 231041215 / 231041216). Periksa pratinjau, lalu tekan Terapkan: penetapan lama untuk MK yang ada di berkas akan diganti, MK lain tidak berubah.</p>
   <div class="row small" style="flex-wrap:wrap"><button class="btn sm" data-act="cplUnduh" ${dis}>Unduh pemetaan saat ini (Excel)</button>
     <label class="btn sm primary" ${S.sibuk ? 'aria-disabled="true"' : ""}>Unggah berkas Excel<input type="file" data-cplimpor="1" accept=".xlsx" hidden ${dis}></label></div>
   ${galatHtml()}
   ${P ? `<div class="auto">Berkas <b>${esc(X.nama)}</b> (lembar ${esc(X.lembar)}): <b>${P.baris.length}</b> baris, <b>${P.siap}</b> siap diterapkan${P.gagal ? `, <b style="color:var(--bad)">${P.gagal}</b> perlu diperbaiki` : ""}.
       ${P.tidakTercakup.length ? `<br>CPL prodi yang belum menjadi CPL utama di MK mana pun: <b>${esc(P.tidakTercakup.join(", "))}</b>.` : "<br>Seluruh CPL prodi menjadi CPL utama di sedikitnya satu MK."}
       ${P.tanpaBaris.length ? `<br>MK di kurikulum aplikasi yang tidak ada di berkas (tidak diubah): ${esc(P.tanpaBaris.map(m => m.kode + " " + m.nama).join("; "))}.` : ""}
       ${P.diterapkan ? `<br><b>Sudah diterapkan ke ${P.diterapkan} mata kuliah.</b>` : ""}</div>
     <div class="tbl-wrap gulir tinggi"><table><thead><tr><th>No</th><th>Di berkas</th><th>MK di aplikasi</th><th>CPL utama</th><th>CPL penunjang</th><th>Catatan</th></tr></thead><tbody>
     ${P.baris.map(r => `<tr><td class="small num muted">${esc(r.no)}</td><td class="small">${esc(r.kode)}<div class="muted">${esc(r.nama)}</div></td>
       <td class="small">${r.mk ? `<b>${esc(r.mk.kode)}</b> ${esc(r.mk.nama)}<div class="muted">Smt ${r.mk.semester}${r.mk.lama.length ? ` · sebelumnya ${esc(r.mk.lama.join(", "))}` : ""}</div>` : '<span class="chip s-ditolak">Tidak cocok</span>'}</td>
       <td class="small">${daftar(r.primer)}</td><td class="small">${daftar(r.sek)}</td>
       <td class="small">${r.galat.map(g => `<div style="color:var(--bad)">${esc(g)}</div>`).join("")}${r.catatan.map(g => `<div class="muted">${esc(g)}</div>`).join("")}</td></tr>`).join("")}</tbody></table></div>
     ${P.diterapkan ? "" : `<div class="row" style="justify-content:flex-end">${P.siap ? tombol("cplImporTerapkan", `Terapkan ke ${P.siap} mata kuliah`, "primary") : ""}</div>`}` : ""}
  </section>`;
}
/** Lembar unduhan: pemetaan per MK (format sama dengan berkas impor) + rekap per CPL (MK mana yang mengukur/menunjang). */
function lembarPemetaanCpl(D) {
  const mk = D.mk.slice().sort((a, b) => a.semester - b.semester || a.kode.localeCompare(b.kode));
  const kodeMk = m => [m.kode, ...(m.kelompok || []).map(g => g.kode).filter(k => k && k !== m.kode)].join(" / ");
  const b1 = [["No", "Semester", "Kode MK", "Nama Mata Kuliah", "Total SKS", "CPL Primer (Wajib Diukur di RPS)", "CPL Sekunder (Penunjang)", "Jml CPL Primer", "Rasional"]]
    .concat(mk.map((m, i) => [i + 1, "Semester " + m.semester, kodeMk(m), m.nama, m.sks, (m.cplMk || []).join(", "), (m.cplSek || []).join(", "), (m.cplMk || []).length, m.cplAlasan || ""]));
  const cpl = (S.cplRef || []);
  const b2 = [["Kode CPL", "Rumusan CPL", "MK yang mengukur (primer)", "Jumlah MK primer", "MK penunjang (sekunder)"]]
    .concat(cpl.map(c => { const p = mk.filter(m => (m.cplMk || []).includes(c.k)), s = mk.filter(m => (m.cplSek || []).includes(c.k)); return [c.k, c.t, p.map(m => m.nama).join("; "), p.length, s.map(m => m.nama).join("; ")]; }));
  return [{ nama: "Pemetaan CPL-MK", baris: b1, teks: [2], lebar: [5, 12, 26, 44, 9, 30, 24, 10, 70] }].concat(cpl.length ? [{ nama: "Rekap per CPL", baris: b2, lebar: [10, 70, 60, 10, 50] }] : []);
}
Object.assign(AKSI, {
  cplImporBuka() { S.cplImpor = !S.cplImpor; S.galat = ""; render(); },
  cplUnduh() {
    jalankan(async () => {
      if (!S.cplRef && S.dp.mk.length) { const j = await api("dp.cplMk", { kode: S.dp.mk[0] ? S.dp.mk[0].kode : "" }); S.cplRef = j.cplProdi; }
      unduh(UPW_ZIP.xlsx(lembarPemetaanCpl(S.dp)), `Pemetaan CPL-MK UPW ${hariIniLokal()}.xlsx`);
    });
  },
  cplImporTerapkan() {
    const X = S.cplImp; if (!X || !X.hasil) return;
    if (!confirm(`Terapkan pembebanan CPL ke ${X.hasil.siap} mata kuliah? Penetapan lama MK tersebut akan diganti.`)) return;
    jalankan(async () => { const j = await api("dp.cplMkImpor", { baris: X.kirim, simpan: true }); S.cplImp = Object.assign({}, X, { hasil: j }); S.dp = null; S.ilkps = null; toast(`Pembebanan CPL diterapkan ke ${j.diterapkan} mata kuliah.`); });
  }
});
document.addEventListener("change", e => {
  const t = e.target; if (!t.dataset || !t.dataset.cplimpor) return;
  const f = t.files && t.files[0]; t.value = ""; if (!f) return;
  if (f.size > 5 * 1024 * 1024) { toast("Berkas Excel maksimal 5 MB."); return; }
  jalankan(async () => {
    let lembar; try { lembar = await UPW_ZIP.bacaXlsx(await f.arrayBuffer()); } catch (_) { throw new Error("Berkas tidak terbaca sebagai Excel (.xlsx)."); }
    const B = bacaPemetaanCpl(lembar), hasil = await api("dp.cplMkImpor", { baris: B.baris });
    S.cplImp = { nama: f.name, lembar: B.lembar, kirim: B.baris, hasil };
  });
});
/* ---------- v0.46.0: cocokkan dosen dengan daftar dosen prodi di PDDikti ----------
   Admin menempelkan daftar dari PDDikti (No, Nama, NIDN, NUPTK, Pendidikan, Status, Ikatan). Nama dicocokkan dengan akun dosen (tanpa gelar);
   yang cocok diberi status "Dosen tetap program studi (DTPS)", NIDN, dan "Terdaftar di PDDikti: Ya" lewat impor biodata massal. Daftar tidak disimpan. */
const STATUS_DTPS = "Dosen tetap program studi (DTPS)";
function bacaPddikti(teks, dosen) {
  const cocok = buatPencocokNama({ dosen, praktisi: [] });
  const baris = String(teks || "").split(/\n/).map(s => s.trim()).filter(Boolean).map(s => {
    let p = s.includes("\t") ? s.split("\t").map(v => v.trim()).filter(v => v !== "") : null;
    if (!p) { const m = s.match(/^\s*\d{1,3}\.?\s+(.+?)\s+(\d{10})(?:\s+|$)(\d{16})?\s*(S[123]|D[34]|Profesi)?\s*(Aktif|Tidak Aktif|Tugas Belajar|Ijin Belajar|Cuti|Pensiun|Keluar)?\s*(.*)$/i); if (!m) return null; p = ["", m[1], m[2], m[3] || "", m[4] || "", m[5] || "", m[6] || ""]; }
    const iN = p.findIndex(v => /^\d{10}$/.test(v)); if (iN < 1) return null;
    const sisa = p.slice(iN + 1);
    return { nama: p.slice(0, iN).filter(v => !/^\d{1,3}\.?$/.test(v)).join(" ").trim(), nidn: p[iN], nuptk: sisa.find(v => /^\d{16}$/.test(v)) || "",
      pend: sisa.find(v => /^(S[123]|D[34]|Profesi)$/i.test(v)) || "", aktif: sisa.find(v => /^(aktif|tidak aktif|tugas belajar|ijin belajar|cuti|pensiun|keluar)$/i.test(v)) || "", ikatan: sisa.find(v => /dosen/i.test(v)) || "" };
  }).filter(Boolean);
  return baris.map(b => { const c = cocok(b.nama), d = c.a ? dosen.find(x => x.id === c.a.id) : null; return Object.assign(b, { d, cara: c.cara || "", kandidat: (c.kandidat || []).map(k => k.l) }); });
}
function panelPddikti(D) {
  const P = S.pddikti || {};
  if (!P.buka) return `<div class="row" style="margin-bottom:8px"><button class="btn" data-act="pddiktiBuka">Cocokkan dengan PDDikti</button><span class="hint">Tandai dosen tetap prodi (DTPS) dan NIDN dari daftar dosen prodi di PDDikti.</span></div>`;
  const H = P.hasil, cocok = H ? H.filter(b => b.d) : [], tak = H ? H.filter(b => !b.d) : [], idCocok = new Set(cocok.map(b => b.d.id));
  const luar = H ? D.dosen.filter(x => !idCocok.has(x.id)) : [];
  return `<section class="panel"><h2>Cocokkan dengan PDDikti</h2>
   <p class="small">Salin daftar dosen <b>Program Studi Usaha Perjalanan Wisata</b> dari laman PDDikti (kolom No, Nama, NIDN, NUPTK, Pendidikan, Status, Ikatan), lalu tempel di sini. Daftar hanya dibaca di layar ini dan tidak disimpan; yang disimpan hanya NIDN dan status dosen di biodata masing-masing.</p>
   <textarea id="pddiktiTeks" rows="6" placeholder="1&#9;NAMA DOSEN&#9;3800000000&#9;0000000000000000&#9;S2&#9;Aktif&#9;Dosen Tetap">${esc(P.teks || "")}</textarea>
   <div class="row" style="flex-wrap:wrap">${tombol("pddiktiPeriksa", "Periksa", "sm")}<button class="btn sm" data-act="pddiktiTutup">Tutup</button></div>${galatHtml()}
   ${H ? `<div class="tbl-wrap gulir"><table><thead><tr><th>Nama di PDDikti</th><th>NIDN</th><th>Akun di aplikasi</th><th>Status sekarang → baru</th></tr></thead><tbody>
     ${H.map(b => `<tr><td class="small">${esc(b.nama)}<div class="muted">${esc([b.pend, b.aktif, b.ikatan].filter(Boolean).join(" · "))}</div></td><td class="mono small">${esc(b.nidn)}</td>
       <td class="small">${b.d ? `${esc(b.d.nama)}${b.cara && b.cara !== "persis" ? ` <span class="tag">${esc(b.cara)}</span>` : ""}` : `<span class="chip s-ditolak">Tidak cocok</span>${b.kandidat.length ? `<div class="muted">Kandidat: ${esc(b.kandidat.join("; "))}</div>` : `<div class="muted">Belum punya akun dosen, atau nama berbeda</div>`}`}</td>
       <td class="small">${b.d ? `${esc(b.d.statusDosen || "(kosong)")} → <b>DTPS</b>${b.d.nidn && b.d.nidn !== b.nidn ? `<div class="muted">NIDN ${esc(b.d.nidn)} → ${esc(b.nidn)}</div>` : ""}` : ""}</td></tr>`).join("")}</tbody></table></div>
     <div class="small" style="margin-top:6px">${cocok.length} dari ${H.length} cocok dengan akun dosen.${tak.length ? ` ${tak.length} tidak cocok: buat akunnya (Super Admin) atau samakan namanya.` : ""}</div>
     ${luar.length ? `<div class="callout small" style="margin-top:6px"><b>Akun dosen yang tidak ada di daftar PDDikti prodi (${luar.length}):</b> ${luar.map(x => `${esc(namaPendek(x.nama))} <span class="muted">(${esc(x.statusDosen || "status kosong")})</span>`).join("; ")}.
       Menurut instrumen, mereka bukan dosen tetap prodi: pilih di biodata masing-masing <b>Dosen tetap PT di luar program studi</b> (dosen tetap prodi lain di Poltekpar), <b>Dosen tidak tetap</b> (dosen kampus lain, atau pengajar yang tidak terdaftar di PDDikti), atau <b>Dosen industri / praktisi</b>.${luar.some(x => x.statusDosen === STATUS_DTPS) ? " <b>Perhatian:</b> ada yang masih berstatus DTPS." : ""}</div>` : ""}
     ${cocok.length ? `<div class="row" style="justify-content:flex-end">${tombol("pddiktiTerapkan", `Terapkan ke ${cocok.length} dosen`, "primary")}</div>` : ""}` : ""}</section>`;
}
Object.assign(AKSI, {
  pddiktiBuka() { S.pddikti = { buka: true }; S.galat = ""; render(); },
  pddiktiTutup() { S.pddikti = null; S.galat = ""; render(); },
  pddiktiPeriksa() {
    const t = String($("pddiktiTeks")?.value || "");
    const H = bacaPddikti(t, S.sdos.dosen);
    S.pddikti = { buka: true, teks: t, hasil: H.length ? H : null }; S.galat = H.length ? "" : "Tidak ada baris yang terbaca. Pastikan setiap baris berisi nama dan NIDN 10 digit.";
    render();
  },
  pddiktiTerapkan() {
    const cocok = (S.pddikti.hasil || []).filter(b => b.d);
    if (!confirm(`Tandai ${cocok.length} dosen sebagai Dosen tetap program studi (DTPS), isi NIDN, dan Terdaftar di PDDikti: Ya?`)) return;
    jalankan(async () => {
      const j = await api("biodata.massal", { baris: cocok.map(b => ({ nip: b.d.nip, nidn: b.nidn, statusDosen: STATUS_DTPS, pddikti: "Ya" })) });
      S.sdos = null; S.dp = null; S.pddikti = { buka: true, teks: S.pddikti.teks, hasil: null };
      toast(`${j.diperbarui} dosen diperbarui${j.dilewati.length ? `, ${j.dilewati.length} dilewati (${j.dilewati.map(x => x.alasan).join("; ")})` : ""}.`);
    });
  }
});
/* ---------- v0.47.0: ubah nama (Super Admin: semua akun; Admin Prodi: mahasiswa), nonaktifkan/aktifkan dan hapus akun (Super Admin) ---------- */
const LABEL_TABEL_AKUN = { Kegiatan: "kegiatan", TimPengajar: "tim pengajar", PesertaKelas: "peserta kelas", DokumenPribadi: "dokumen pribadi", TandaTangan: "tanda tangan",
  Jawaban: "jawaban survei", PesertaRapat: "peserta rapat", Rapat: "rapat", TindakLanjut: "tindak lanjut", DedNarasi: "narasi DED", PortofolioMk: "portofolio mata kuliah",
  RpsData: "RPS", StatusDosen: "status dosen", DosenTs: "data dosen TS", RiwayatStatusMhs: "riwayat status mahasiswa", Masukan: "masukan", Pengaturan: "pengaturan",
  BankDokumen: "bank dokumen", SkorGpm: "penilaian GKM", Sarana: "sarana lab", LogSarana: "catatan lab", Survei: "survei", LaporanGkm: "laporan GKM", MataKuliah: "kurikulum" };
function laciAkunKelola() {
  const L = S.laci, x = (S.daftar || []).find(v => v.id === L.id), sa = peranAktif() === "superadmin", dis = S.sibuk ? "disabled" : "";
  if (!x) return "";
  const diriSendiri = x.id === S.pengguna.id, R = L.rujukan;
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Kelola akun" style="width:min(560px,100%)">
   <div class="dh"><h2>${esc(x.nama)}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   <p class="small muted mono">${esc(x.username)} · ${x.status === "impor" ? "belum aktivasi" : x.status === "nonaktif" ? "nonaktif" : "aktif"}</p>
   ${galatHtml()}
   <div class="picker"><b>Ubah nama</b><span class="hint">Tulis nama lengkap dengan gelar, sama dengan PDDikti/SK. Perubahan tercatat di Log.</span>
     <input id="akunNama" type="text" maxlength="150" value="${esc(x.nama)}" aria-label="Nama baru">
     <div class="row" style="justify-content:flex-end">${tombol("akunUbahNama", "Simpan nama", "sm")}</div></div>
   ${sa && !diriSendiri ? `<div class="picker"><b>${x.status === "nonaktif" ? "Aktifkan kembali" : "Nonaktifkan akun"}</b>
     <span class="hint">${x.status === "nonaktif" ? "Akun bisa masuk lagi dan kembali dihitung di data prodi." : "Akun tidak bisa masuk dan tidak dihitung di data aktif (dosen, mahasiswa aktif, direktori), tetapi semua data yang pernah dicatatnya tetap utuh. Bisa diaktifkan kembali."}</span>
     <div class="row" style="justify-content:flex-end"><button class="btn sm ${x.status === "nonaktif" ? "" : "bad"}" data-act="akunStatus" data-aktif="${x.status === "nonaktif" ? 1 : 0}" ${dis}>${x.status === "nonaktif" ? "Aktifkan kembali" : "Nonaktifkan"}</button></div></div>
   <div class="picker"><b>Hapus akun permanen</b>
     <span class="hint">Hanya untuk akun yang salah dibuat dan <b>belum dipakai di data mana pun</b> (biasanya yang belum aktivasi). Akun, biodata, dan sesinya dihapus dan <b>tidak bisa dikembalikan</b>. Bila akun sudah dipakai (kegiatan, tim pengajar, peserta kelas, dll.), aplikasi menolak menghapus; nonaktifkan saja.</span>
     ${R ? `<div class="callout small"><b>Tidak dihapus:</b> akun ini masih dipakai di ${esc(R.map(v => `${LABEL_TABEL_AKUN[v.tabel] || v.tabel} (${v.n})`).join(", "))}. Lepaskan dulu dari data itu (mis. ganti di tim pengajar), atau nonaktifkan akun.</div>` : ""}
     <label class="small" for="akunHapusKonf">Ketik NIM/NIP <b class="mono">${esc(x.username)}</b> untuk mengonfirmasi</label><input id="akunHapusKonf" type="text" autocomplete="off">
     <div class="row" style="justify-content:flex-end"><button class="btn sm bad" data-act="akunHapus" ${dis}>Hapus permanen</button></div></div>` : ""}
   ${diriSendiri ? `<p class="small muted">Akun Anda sendiri tidak dapat dinonaktifkan atau dihapus.</p>` : ""}
  </div></div>`;
}
Object.assign(AKSI, {
  akunKelola(d) { S.laci = { jenis: "akunKelola", id: d.id }; S.galat = ""; render(); },
  akunUbahNama() {
    const nama = String($("akunNama")?.value || "").trim(), id = S.laci.id;
    jalankan(async () => { const j = await api("admin.ubahNama", { userId: id, nama }); const x = S.daftar.find(v => v.id === id); if (x) x.nama = j.pengguna.nama; toast("Nama diubah."); });
  },
  akunStatus(d) {
    const id = S.laci.id, aktif = d.aktif === "1";
    if (!aktif && !confirm("Nonaktifkan akun ini? Pemiliknya tidak bisa masuk sampai diaktifkan kembali.")) return;
    jalankan(async () => { const j = await api("admin.statusAkun", { userId: id, aktif }); const x = S.daftar.find(v => v.id === id); if (x) x.status = j.pengguna.status; toast(aktif ? "Akun diaktifkan kembali." : "Akun dinonaktifkan."); });
  },
  akunHapus() {
    const id = S.laci.id, x = S.daftar.find(v => v.id === id), konf = String($("akunHapusKonf")?.value || "").trim();
    if (!confirm(`Hapus permanen akun ${x ? x.nama : ""}? Tindakan ini tidak bisa dibatalkan.`)) return;
    jalankan(async () => {
      const j = await api("admin.hapusAkun", { userId: id, konfirmasi: konf });
      if (!j.dihapus) { S.laci.rujukan = j.rujukan; toast("Akun masih dipakai di data lain; tidak dihapus."); return; }
      S.laci = null; S.daftar = S.daftar.filter(v => v.id !== id); toast("Akun dihapus.");
    });
  }
});
let ambilLogoRps = null;
const logoRps = () => ambilLogoRps || (ambilLogoRps = Promise.all(["kemenpar", "poltekpar", "asean", "banpt"].map(async k => {
  try { const r = await fetch(`templat/logo-${k}.png`); return [k, r.ok ? new Uint8Array(await r.arrayBuffer()) : null]; } catch (_) { return [k, null]; }
})).then(l => Object.fromEntries(l.filter(v => v[1]))));
function panelOtorRps() {
  const O = S.rpsOtor;
  if (!O) { sekali("rpsOtor", async () => { S.rpsOtor = await api("rps.otorisasi"); render(); }); return `<div class="memuat">Memuat otorisasi RPS…</div>`; }
  const o = O.otorisasi, dis = O.boleh ? "" : "disabled";
  const f = (id, l, v, ph) => `<div class="field"><label for="ro_${id}">${l}</label><input id="ro_${id}" type="text" maxlength="120" value="${esc(v || "")}" placeholder="${esc(ph || "")}" ${dis}></div>`;
  return `<section class="panel"><h2>Data bersama templat (RPS, kontrak kuliah, rubrik)</h2>
   <p class="small">Diisi sekali untuk semua mata kuliah; mengisi otomatis templat yang diunduh dosen di Portofolio MK. Isian yang dikosongkan tampil sebagai [ … ] di templat. Bila nama KPS dikosongkan, dipakai akun berperan KPS${o.kpsDariAkun ? ` (${esc(o.kpsNama)})` : ""}.</p>
   <div class="grid g3">${f("labor", "Labor division (ASEAN MRA-TP)", o.labor, "Travel Agencies dan Tour Operation")}${f("kajurJabatan", "Jabatan Ketua Jurusan", o.kajurJabatan)}${f("kajurNama", "Nama Ketua Jurusan (dengan gelar)", o.kajurNama)}
   ${f("kajurNip", "NIP Ketua Jurusan", o.kajurNip)}${f("kpsJabatan", "Jabatan KPS", o.kpsJabatan)}${f("kpsNama", "Nama KPS (kosong = akun KPS)", o.kpsDariAkun ? "" : o.kpsNama)}${f("kpsNip", "NIP KPS", o.kpsDariAkun ? "" : o.kpsNip)}
   ${f("hadirMin", "Kehadiran minimal untuk ikut UAS (%)", o.hadirMin, "mis. 80")}${f("tempat", "Tempat penandatanganan", o.tempat, "mis. Nusa Dua")}${f("lms", "Nama LMS kampus", o.lms, "mis. LMS Poltekpar Bali")}
   ${f("hariUmpan", "Batas umpan balik hasil penilaian (hari)", o.hariUmpan, "mis. 7")}${f("hariKeberatan", "Batas mempertanyakan nilai (hari kerja)", o.hariKeberatan, "mis. 3")}${f("telat", "Aturan keterlambatan tugas", o.telat, "mis. nilai dikurangi 10 per hari, maksimal 3 hari")}
   ${f("pedoman", "Peraturan akademik yang berlaku", o.pedoman, "mis. Peraturan Direktur No. … Tahun … tentang Pedoman Akademik")}</div>
   <div class="field"><label for="ro_skalaNilai">Skala nilai (kontrak kuliah dan portofolio penilaian): satu baris per huruf, format <b>Huruf; angka mutu; rentang</b></label><textarea id="ro_skalaNilai" rows="6" maxlength="600" placeholder="A; 4; 85–100&#10;B; 3; 70–84,99" ${dis}>${esc(o.skalaNilai || "")}</textarea><span class="hint">Sesuai pedoman akademik Poltekpar Bali. Kosong = templat memuat isian [ … ] untuk diisi dosen.</span></div>
   ${galatHtml()}${O.boleh ? `<div class="row" style="justify-content:flex-end">${tombol("rpsOtorSimpan", "Simpan")}</div>` : ""}</section>`;
}
Object.assign(AKSI, {
  rpsTemplat() {
    if (S.laci.rpsT) { S.laci.rpsT = null; render(); return; }
    const x = S.laci.x; S.laci.rpsT = { ref: null, pilih: new Set() }; render();
    Promise.all([api("mkp.rpsRef", { semester: x.semester, kode: x.kode, kunci: S.laci.kel || undefined }), muatRps()]).then(([R]) => {
      if (!S.laci || !S.laci.rpsT) return;
      S.laci.rpsT.ref = R;
      S.laci.rpsT.pilih = new Set(R.terakhir ? (R.terakhir.data.cpl || []).map(c => String(c.ref || "").toUpperCase()).filter(k => R.cplProdi.some(p => p.k === k)) : []);
      render();
    }, err => { if (S.laci) S.laci.rpsT = null; toast(err.message); render(); });
  },
  rpsUnduhTemplat() {
    const T = S.laci && S.laci.rpsT; if (!T || !T.ref) return;
    const R = T.ref;
    jalankan(async () => {
      await muatRps();
      const D = UPW_RPS.kosong(R, [...T.pilih], tglCetak());
      unduh(UPW_RPS.buat(D, await logoRps()), namaZip(`RPS ${R.mk.kode} ${R.mk.nama} - ${R.labelKelas} - ${R.labelSemester.replace("/", "-")}`, 120) + ".docx");
      toast("Templat RPS diunduh. Isi bagian bertanda [ … ], lalu unggah kembali sebagai Word (.docx).");
    });
  },
  mkpMetodeRps() {
    const { G } = viewMkp(); if (!G || !G.rpsBaca || !window.UPW_RPS) return;
    const ada = new Set(UPW_RPS.saranMetode(G.rpsBaca.data, S.laci.x.daftarMetode).filter(v => v.ada).map(v => v.m));
    document.querySelectorAll("[data-mmet]").forEach(el => { if (ada.has(el.dataset.mmet)) el.checked = true; });
    toast("Metode dari RPS dicentang. Periksa, lalu tekan Simpan metode.");
  },
  rpsOtorBuka() { S.rpsOtorBuka = !S.rpsOtorBuka; S.galat = ""; render(); },
  mkpTemplat(d) {
    jalankan(async () => {
      await muatRps();
      const R = await refTemplat(), { G } = viewMkp(), x = S.laci.x;
      const D = (G && G.rpsBaca && G.rpsBaca.data) || (R.terakhir && R.terakhir.data) || null;
      const nm = s => namaZip(`${s} ${R.mk.kode} ${R.mk.nama} - ${R.labelKelas} - ${R.labelSemester.replace("/", "-")}`, 120);
      if (d.j === "kontrak") unduh(UPW_RPS.kontrak(R, D, await logoRps()), nm("Kontrak kuliah") + ".docx");
      else if (d.j === "rubrik") unduh(UPW_RPS.rubrik(R, D, await logoRps()), nm("Rubrik penilaian") + ".docx");
      else {
        let ps = [];
        try { const P = await api("peserta.data", { semester: x.semester, kodeMk: x.kode }); const kk = (P.kunci || []).find(q => q.k === R.kunci) || (P.kunci || [])[0]; ps = kk ? kk.peserta : []; } catch (_) { /* tanpa peserta: baris kosong */ }
        unduh(UPW_ZIP.xlsx(UPW_RPS.portoXlsx(R, D, ps)), nm("Portofolio penilaian") + ".xlsx");
      }
      toast(D ? `Templat diunduh, sudah terisi dari RPS${G && G.rpsBaca ? "" : " " + (R.terakhir ? R.terakhir.labelSemester : "")}.` : "Templat diunduh dengan isian [ … ]. Unggah RPS kelas ini lebih dulu agar templat terisi otomatis.");
    });
  },
  integSaran() {
    const x = S.laci.x; S.laci.integS = { data: null }; renderJagaInteg();
    api("mkp.saranInteg", { semester: x.semester, kode: x.kode, kunci: S.laci.kel || undefined }).then(j => { if (S.laci && S.laci.integS) { S.laci.integS.data = j; renderJagaInteg(); } }, e => { if (S.laci) S.laci.integS = null; toast(e.message); renderJagaInteg(); });
  },
  integPakai(d) {
    const k = (S.laci.integS && S.laci.integS.data ? S.laci.integS.data.kegiatan : []).find(v => v.id === d.id); if (!k) return;
    const el = $("mkpInteg"), jn = LABEL_JENIS_INTEG[k.jenis] || "kegiatan";
    S.laci.integKeg = { id: k.id, judul: k.judul };
    const teks = `Hasil ${jn} "${k.judul}" (${String(k.tgl || "").slice(0, 4)}, ${k.dosen.map(namaPendek).join(", ")}) dipakai pada pertemuan [ … ]: mahasiswa [apa yang dikerjakan]; hasilnya [luaran]; dinilai dengan [rubrik/instrumen].`;
    const lama = el ? el.value : "";
    render();
    const e2 = $("mkpInteg"); if (e2) { e2.value = lama && lama.trim() ? lama : teks; e2.focus(); }
    toast("Lengkapi bagian [ … ], lalu tekan Tambahkan.");
  },
  mkpNilaiHapus() {
    if (!confirm("Hapus berkas nilai SIAKAD kelas ini? File dipindahkan ke sampah Drive.")) return;
    const x = S.laci.x;
    jalankan(async () => { gantiMkp(await api("mkp.nilaiHapus", { semester: x.semester, kode: x.kode, kunci: S.laci.kel || undefined })); toast("Dihapus."); });
  },
  integLepas() { S.laci.integKeg = null; renderJagaInteg(); },
  mkpTtd(d) {
    const x = S.laci.x, ttd = {};
    document.querySelectorAll(`[data-mttd^="${d.komp}:"]`).forEach(el => { ttd[el.dataset.mttd.split(":")[1]] = el.checked; });
    jalankan(async () => { gantiMkp(await api("mkp.ttd", { semester: x.semester, kode: x.kode, komp: d.komp, ttd, kunci: S.laci.kel || undefined })); toast("Tanda tangan dicatat."); });
  },
  rpsOtorSimpan() {
    const d = { simpan: 1 };
    ["labor", "kajurJabatan", "kajurNama", "kajurNip", "kpsJabatan", "kpsNama", "kpsNip", "skalaNilai", "hadirMin", "tempat", "lms", "hariUmpan", "hariKeberatan", "telat", "pedoman"].forEach(k => { d[k] = String($("ro_" + k)?.value || "").trim(); });
    jalankan(async () => { S.rpsOtor = await api("rps.otorisasi", d); toast("Data bersama templat tersimpan."); });
  }
});
function gantiMkp(j) { if (S.laci && S.laci.jenis === "mkp") { S.laci.x = j; S.laci.tm = null; } S.mkp = null; S.mkpRekap = null; S.tugas = null; S.nilai = null; }
function unggahMkp(komp, isi) {
  const x = S.laci.x;
  if (isi.isi) toast("Mengunggah…");
  jalankan(async () => { gantiMkp(await api("mkp.unggah", Object.assign({ semester: x.semester, kode: x.kode, komp, kunci: S.laci.kel || undefined }, isi))); toast("Tersimpan."); });
}
Object.assign(AKSI, {
  mkpBuka(d) {
    sekali("mkpBuka", async () => { const j = await api("mkp.detail", { semester: d.s, kode: d.kode, kunci: d.kunci || undefined }); S.laci = { jenis: "mkp", x: j, tm: null, kel: d.kunci || j.kunci }; S.galat = ""; render(); });
  },
  mkpTautan(d) { S.laci.tm = d.komp || null; S.galat = ""; render(); if (d.komp) fokus("mkpUrl"); },
  mkpKel(d) { S.laci.kel = d.k; S.laci.tm = null; S.galat = ""; render(); },
  mkpSimpanTautan() {
    const komp = S.laci.tm; if (!komp) return;
    const isi = { tautan: String($("mkpUrl")?.value || "").trim() };
    if ($("mkpKetT")) isi.ket = String($("mkpKetT").value || "").trim();
    unggahMkp(komp, isi);
  },
  mkpMetode() {
    const x = S.laci.x, metode = [...document.querySelectorAll("[data-mmet]:checked")].map(el => el.dataset.mmet), lain = String($("mkpLain")?.value || "").trim();
    jalankan(async () => { gantiMkp(await api("mkp.metode", { semester: x.semester, kode: x.kode, metode, lain, kunci: S.laci.kel || undefined })); toast("Metode pembelajaran tersimpan."); });
  },
  mkpInteg() {
    const x = S.laci.x, teks = String($("mkpInteg")?.value || "").trim(), keg = S.laci.integKeg ? S.laci.integKeg.id : undefined;
    jalankan(async () => { gantiMkp(await api("mkp.integ", { semester: x.semester, kode: x.kode, teks, keg, kunci: S.laci.kel || undefined })); S.laci.integKeg = null; toast("Catatan integrasi ditambahkan."); });
  },
  mkpHapus(d) {
    if (!confirm("Hapus isian ini? File dipindahkan ke sampah Drive.")) return;
    const x = S.laci.x;
    jalankan(async () => { gantiMkp(await api("mkp.hapus", { semester: x.semester, kode: x.kode, komp: d.komp, id: d.id || undefined, kunci: S.laci.kel || undefined })); toast("Dihapus."); });
  },
  async mkpLihat(d) {
    const { x, xv, G } = viewMkp(), c = d.komp === "nilai" ? { jenis: "dok" } : x.komp.find(y => y.k === d.komp), e = d.komp === "nilai" ? (G && G.nilai) : c.jenis === "dok" ? xv[d.komp] : x[d.komp].find(y => y.id === d.id);
    if (!e) return;
    if (e.t === "tautan") { window.open(e.url, "_blank", "noopener,noreferrer"); return; }
    const w = penampil();
    if (w) w.document.write('<p style="font-family:sans-serif;padding:16px">Membuka berkas…</p>');
    try {
      const j = await api("mkp.lihat", { semester: x.semester, kode: x.kode, komp: d.komp, id: d.id || undefined, kunci: S.laci.kel || undefined });
      const bin = atob(j.isi), arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([arr], { type: j.mime }));
      if (w && /pdf|image/.test(j.mime)) w.tampil(url, j.nama, j.mime);
      else { if (w) w.close(); simpanBerkas(new Blob([arr], { type: j.mime }), j.nama); }
      setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch (err) { if (w) w.close(); toast(err.message); }
  }
});
document.addEventListener("change", e => {
  const t = e.target;
  if (t.id === "mkpSmt") { S.mkpSmt = t.value; S.mkp = null; render(); return; }
  if (t.id === "mkpRekapSmt") { S.mkpRekapSmt = t.value; S.mkpRekap = null; render(); return; }
  if (t.dataset && (t.dataset.cplmk || t.dataset.cplsek) && S.laci && S.laci.jenis === "cplMk") {   // v0.48.0: utama dan penunjang saling meniadakan
    const L = S.laci, k = t.dataset.cplmk || t.dataset.cplsek, utama = !!t.dataset.cplmk, ini = utama ? L.pilih : L.sek, lain = utama ? L.sek : L.pilih;
    if (t.checked) { ini.add(k); lain.delete(k); const o = document.querySelector(`input[data-${utama ? "cplsek" : "cplmk"}="${k}"]`); if (o) o.checked = false; } else ini.delete(k);
    const n = $("cplMkN"), m = $("cplMkS"); if (n) n.textContent = L.pilih.size; if (m) m.textContent = L.sek.size; return; }
  if (t.dataset && t.dataset.rpscpl && S.laci && S.laci.rpsT) { if (t.checked) S.laci.rpsT.pilih.add(t.dataset.rpscpl); else S.laci.rpsT.pilih.delete(t.dataset.rpscpl); const n = $("rpsCplN"); if (n) n.textContent = S.laci.rpsT.pilih.size; return; }
  if (!t.dataset || !t.dataset.mfile || !S.laci || S.laci.jenis !== "mkp") return;
  const f = t.files && t.files[0], komp = t.dataset.mfile; t.value = "";
  if (!f) return;
  if (f.size > 10 * 1024 * 1024) { toast("Ukuran file maksimal 10 MB. Untuk file lebih besar, unggah ke Google Drive lalu pakai tautan."); return; }
  if (komp === "rps" && /\.docx$/i.test(f.name)) { unggahRpsWord(f); return; }
  if (komp === "rpsSumber") { bacaRpsSumber(f); return; }
  if (komp === "nilai") { unggahNilaiSiakad(f); return; }
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
    : `<p>Slot dokumen untuk butir Matriks yang dinilai GKM. Setiap slot punya penanggung jawab (PJ) dan masa berlaku; versi lama tetap tersimpan sebagai riwayat. Jumlah dokumen berlaku ikut tampil di Penilaian.</p>`;
  return `<div class="head"><div><h1>Bank Dokumen</h1>${info}</div></div>
   ${B.asesor ? "" : `<div class="grid g3"><div class="panel stat"><span class="v num">${ada}/${n}</span><span class="l">Dokumen berlaku</span><div class="bar ${ada < n ? "gold" : ""}" style="margin-top:6px"><i style="width:${n ? ada / n * 100 : 0}%"></i></div></div>
    <div class="panel stat"><span class="v num">${hit("belum")}</span><span class="l">Belum diunggah</span></div>
    <div class="panel stat"><span class="v num">${hit("kedaluwarsa") + hit("segera")}</span><span class="l">Kedaluwarsa atau berakhir ≤ ${B.hariSegera} hari</span></div></div>`}
   <div class="filters"><select id="bankF" aria-label="Saring dokumen" style="width:auto"><option value="">Semua butir</option>
    ${B.asesor ? "" : `<option value="perlu" ${f === "perlu" ? "selected" : ""}>Perlu tindakan (belum/kedaluwarsa/segera)</option>`}
    ${B.kelola ? `<option value="tanpaPj" ${f === "tanpaPj" ? "selected" : ""}>Belum ada penanggung jawab</option>` : ""}
    ${!B.kelola && !B.asesor ? "" : B.kelola ? `<option value="saya" ${f === "saya" ? "selected" : ""}>Tanggung jawab saya</option>` : ""}
    ${Object.entries(B.kriteria).map(([k, l]) => `<option value="k:${k}" ${f === "k:" + k ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>
   ${butir.map(b => `<section class="panel"><div class="row" style="justify-content:space-between;align-items:flex-start;margin-bottom:6px"><h2 style="font-size:.95rem;margin:0">${b.n}. ${esc(b.nm)} ${iBtn("b" + b.n, b.nm)}</h2><span class="tag">${esc(B.kriteria[b.k] || b.k)} · bobot ${String(b.w).replace(".", ",")}</span></div>
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
   <div class="field"><label for="bankBaruNama">Nama dokumen</label><input id="bankBaruNama" type="text" maxlength="150" data-saran="bank" data-saran-out="saBank" value="${esc(S.laci.namaKetik || "")}" placeholder="Contoh: SOP peninjauan RPS">
    <span class="hint">Ketik nama dokumen; aplikasi menyarankan butir yang sesuai.</span><div id="saBank">${htmlSaran("bank", S.laci.namaKetik, [n])}</div></div>
   <div class="field"><label for="bankBaruPj">Penanggung jawab (opsional)</label><select id="bankBaruPj"><option value="">– belum ditunjuk –</option>${B.pegawai.map(o => `<option value="${o.id}" ${S.laci.pj === o.id ? "selected" : ""}>${esc(o.nama)}</option>`).join("")}</select></div>
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
    const w = penampil();
    if (w) w.document.write('<p style="font-family:sans-serif;padding:16px">Membuka berkas…</p>');
    try {
      const j = await api("bank.lihat", { kunci: d.kunci, id: d.id });
      const bin = atob(j.isi), arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([arr], { type: j.mime }));
      if (w && /pdf|image/.test(j.mime)) w.tampil(url, j.nama, j.mime);
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
   ${panelRawat()}
   ${S.riwayat.map(v => `<section class="panel"><div class="row" style="justify-content:space-between;flex-wrap:wrap"><h2 style="margin:0">${esc(v.versi)}${v.versi === "v" + K.versi ? ' <span class="chip s-disetujui">dipakai</span>' : ""}</h2><span class="small muted">${esc(v.tanggal)} · ${esc(v.lingkungan)}</span></div>
     <ul class="small" style="margin:8px 0 0 18px;padding:0;display:grid;gap:3px">${v.isi.map(baris).join("")}</ul></section>`).join("")}`;
}
/** v0.49.0: kesehatan spreadsheet (batas Google Sheets 10 juta sel) dan perawatan harian (Perawatan.js). */
const angka = n => Number(n || 0).toLocaleString("id-ID");
function panelRawat() {
  const R = S.rawat;
  if (!R) { sekali("rawat", async () => { S.rawat = await api("admin.rawat"); render(); }); return `<section class="panel"><h2>Kesehatan data</h2><div class="memuat" style="min-height:40px">Memeriksa…</div></section>`; }
  const x = R.sel, h = R.hasil || R.lalu, warna = x.persen >= 70 ? "var(--bad)" : x.persen >= 40 ? "var(--gold)" : "var(--ok)";
  return `<section class="panel"><h2>Kesehatan data</h2>
    <p class="small">Google Sheets membatasi satu spreadsheet <b>10 juta sel</b> (termasuk baris/kolom kosong). Bila batas tercapai, aplikasi tidak bisa menyimpan apa pun.
      Server merawatnya otomatis sekali sehari: menghapus sesi dan kode yang sudah kedaluwarsa, memindah catatan aktivitas (log) yang lebih tua dari 1 tahun ke spreadsheet
      <b>Arsip Log</b>${R.arsipLog ? ` (<a href="${esc(R.arsipLog)}" target="_blank" rel="noopener noreferrer">buka</a>)` : ""}, dan membuang baris/kolom kosong.</p>
    <div class="bar" style="height:10px;background:var(--surface-2);border-radius:6px;overflow:hidden"><div style="height:100%;width:${Math.min(100, x.persen)}%;background:${warna}"></div></div>
    <p class="small"><b>${x.total.toLocaleString("id-ID")}</b> sel dari 10.000.000 (${String(x.persen).replace(".", ",")}%). Terbesar: ${x.terbesar.map(t => `${esc(t.lembar)} ${t.sel.toLocaleString("id-ID")}`).join(" · ")}.</p>
    <p class="small muted">Perhitungan sel: ${R.terakhirUkuran ? esc(tglPendek(R.terakhirUkuran)) : "baru saja"} (diperbarui seminggu sekali saat baris/kolom kosong dirapikan). Perawatan harian terakhir: ${R.terakhir ? esc(tglPendek(R.terakhir)) : "belum pernah"}${h ? ` · dihapus ${angka(h.sesi)} sesi dan ${angka(h.kode)} kode kedaluwarsa, ${angka(h.log)} baris log diarsipkan, ${angka(h.ukuran.baris)} baris dan ${angka(h.ukuran.kolom)} kolom kosong dibuang` : ""}.</p>
    <div class="row" style="justify-content:flex-end">${tombol("rawatSekarang", "Jalankan perawatan sekarang", "sm")}</div></section>`;
}
Object.assign(AKSI, {
  rawatSekarang() { jalankan(async () => { S.rawat = await api("admin.rawat", { jalankan: true }); toast(S.rawat.hasil ? "Perawatan selesai." : "Server sedang sibuk; coba lagi sebentar."); }); },
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
      { k: "rps", l: "RPS", h: "Tautan https://… atau tulis Ada" }, { k: "unit", l: "Unit penyelenggara", h: "Kosongkan bila Prodi UPW" },
      { k: "tanpaTim", l: "Tanpa dosen pengampu", o: YA_TIDAK, h: "Ya untuk magang/tugas akhir. Kosong: MK lama tidak diubah; MK baru ditebak dari nama (Magang, Tugas Akhir, Skripsi, PKL)" },
      { k: "kelompok", l: "Kelompok paralel (MK pilihan)", h: "Mis. Jepang (231041217), Jerman (231041215), Perancis (231041216). Kosong: MK lama tidak diubah" }],
    contoh: ["UPW201", "Travel Agency Operation", "2", "1", "0", "2", "Ya", "Ya", "Ya", "Tidak", "Ya", "Ada", "", "Tidak", ""],
    kirim: b => api("dp.mkSimpan", { daftar: b.map(r => Object.assign({}, r, { semester: Number(r.semester), sksKuliah: angkaId(r.sksKuliah), sksSeminar: angkaId(r.sksSeminar), sksPraktik: angkaId(r.sksPraktik),
      kompetensi: /^ya$/i.test(r.kompetensi || ""), cplSikap: /^ya$/i.test(r.cplSikap || ""), cplPengetahuan: /^ya$/i.test(r.cplPengetahuan || ""), cplKu: /^ya$/i.test(r.cplKu || ""), cplKk: /^ya$/i.test(r.cplKk || ""),
      unit: r.unit || "Prodi UPW", tanpaTim: r.tanpaTim ? /^ya$/i.test(r.tanpaTim) : undefined, kelompok: r.kelompok ? r.kelompok : undefined })) }),
    pesan: j => `Impor selesai: ${j.baru} baru, ${j.diubah} diperbarui.`, segarkan: () => { S.dp = null; S.ilkps = null; } },
  lulusan: { judul: "Data lulusan", satuan: "lulusan", kolom: [
      { k: "nim", l: "NIM", wajib: 1, teks: 1 }, { k: "nama", l: "Nama", wajib: 1 }, { k: "masuk", l: "Tahun masuk", wajib: 1 },
      { k: "tglLulus", l: "Tanggal lulus", wajib: 1, tgl: 1, h: "Tanggal Excel atau 20/08/2025" }, { k: "ipk", l: "IPK", h: "Contoh 3,52" },
      { k: "wtBulan", l: "Waktu tunggu kerja (bulan)", h: "Kosongkan bila belum terlacak" }, { k: "kesesuaian", l: "Kesesuaian bidang kerja", o: ["Rendah", "Sedang", "Tinggi"] },
      { k: "tempatKerja", l: "Tempat kerja", o: ["Lokal", "Nasional", "Internasional"] }],
    contoh: ["210101", "Kadek Contoh", "2021", "20/08/2025", "3,52", "2", "Tinggi", "Nasional"],
    kirim: b => api("lul.impor", { daftar: b }),
    pesan: j => `Impor selesai: ${j.baru} baru, ${j.diubah} diperbarui${j.akunLulus ? `; ${j.akunLulus} akun mahasiswa ditandai Lulus` : ""}.`, segarkan: () => { S.lul = null; S.ilkps = null; S.daftar = null; } },
  // v0.35.0: tim pengajar satu semester (HANYA KPS dan Admin Prodi). Templat terisi tim yang ada + rumus beban SKS per orang; lihat templatTim().
  tim: { judul: "Tim pengajar", satuan: "baris tim", kolom: [
      { k: "kode", l: "Kode MK", wajib: 1, teks: 1 }, { k: "kelas", l: "Kelas" }, { k: "u1", l: "Pengampu utama (dosen)" }, { k: "u2", l: "Anggota 2" }, { k: "u3", l: "Anggota 3" }],
    hint: "1) Unduh templat (sudah berisi mata kuliah dan tim semester ini) · 2) pilih nama dari daftar di lembar <b>Data</b>; beban SKS tiap dosen terhitung otomatis di lembar <b>Beban SKS</b> · 3) unggah berkasnya, periksa pratinjau, lalu tekan Impor. Mata kuliah tanpa nama tidak diubah.",
    templat: async () => { await segarkanDpTim(); return templatTim(); }, periksa: async (X, lembar) => { await segarkanDpTim(); periksaImporTim(X, lembar); },
    kirim: (b, X) => api("dp.timImpor", { semester: X.semester, daftar: X.daftar.map(x => x.data) }),
    pesan: j => `${j.disimpan} mata kuliah tersimpan${j.dilewati.length ? `, ${j.dilewati.length} dilewati` : ""}.`,
    lewati: (j, X) => j.dilewati.map(l => ({ baris: (X.daftar[l.baris - 1] || {}).baris || l.baris, nip: l.nip, alasan: l.alasan })),
    segarkan: () => { S.dpSmt = S.dp ? S.dp.semester : S.dpSmt; S.dp = null; S.ilkps = null; } }
};
/* --- Templat impor tim pengajar (v0.35.0) ---
   Lembar: Data (satu baris per MK, atau per kelas bila tim berbeda per kelas), Beban SKS (rumus: SKS per dosen semester ini), Mata kuliah (rujukan rumus), Petunjuk.
   SKS per orang = SKS MK × (jumlah kelas MK bila kolom Kelas kosong, atau 1 untuk baris satu kelas) ÷ jumlah orang di tim baris itu (dosen tunggal = penuh). */
/** Kelas di templat: selalu A dan B, ditambah kelas lain yang sudah ada (mis. C). */
/** v0.36.1: ambil ulang data tim, dosen, dan praktisi dari server sebelum menyusun/memeriksa templat, agar nama yang baru ditambahkan langsung tercantum. */
async function segarkanDpTim() { const smt = S.dp.semester; S.dp = await api("dp.data", { semester: smt, ta: S.dp.ta }); S.dpSmt = smt; }
const kelasTemplat = t => berkel(t) ? kelasTim(t) : [...new Set(["A", "B", ...kelasTim(t)])].sort();
const labelSmtTampil = k => { const th = Number(String(k).slice(0, 4)); return (/-1$/.test(k) ? "Ganjil " : "Genap ") + th + "/" + (th + 1); };
const labelDosenTim = x => x.nama + (x.inisial ? " (" + x.inisial + ")" : "");
const labelPrakTim = x => x.nama + " (praktisi" + (x.perusahaan ? ", " + x.perusahaan : "") + ")";
function templatTim() {
  const D = S.dp, lDos = D.dosen.map(labelDosenTim), lPrak = D.praktisi.map(labelPrakTim), semuaL = lDos.concat(lPrak), nama = {};
  D.dosen.forEach((x, i) => { nama["u:" + x.id] = lDos[i]; }); D.praktisi.forEach((x, i) => { nama["p:" + x.id] = lPrak[i]; });
  const orang = ang => [0, 1, 2].map(i => ang && ang[i] ? nama[ang[i].t + ":" + ang[i].id] || "" : "");
  const isi = [];
  // v0.36.1 (permintaan pemilik): setiap MK SELALU dua baris (kelas A dan B, ditambah kelas lain bila ada) agar mudah diisi; tim "sama untuk semua kelas" diisi di kedua baris.
  D.tim.filter(t => !t.tanpaTim).forEach(t => kelasTemplat(t).forEach(k => isi.push([t.kode, teksKunciTim(t, k), orang(t.perKelas || berkel(t) ? t.kelas[k] : (t.kelas[""] || t.anggota))])));
  const N = isi.length + 60, akhir = N + 1, mkRef = "'Mata kuliah'!$A:$E";
  // Hasil awal setiap rumus dihitung di sini juga (aturan yang sama), agar angka langsung tampil walau Excel belum menghitung ulang.
  const infoMk = {}; D.tim.forEach(t => { const k = kelasTemplat(t); infoMk[t.kode] = [t.kode, t.nama, t.sks, k.map(x => teksKunciTim(t, x)).join(", "), k.length]; });
  const vl = (y, c, kode) => ({ f: `IFERROR(VLOOKUP($A${y},${mkRef},${c},FALSE),"")`, v: kode && infoMk[kode] ? infoMk[kode][c - 1] : "" });
  const per = {};
  const data = [["Kode MK * [kode]", "Nama mata kuliah (otomatis) [nama]", "SKS (otomatis) [sks]", "Kelas (A / B) [kelas]", "Pengampu utama (dosen) * [u1]", "Anggota 2 [u2]", "Anggota 3 [u3]", "Jumlah kelas MK (otomatis) [nk]", "SKS per orang (otomatis) [sksOrang]"]];
  for (let i = 0; i < N; i++) {
    const y = i + 2, r = isi[i] || ["", "", ["", "", ""]];
    const n = r[2].filter(Boolean).length, m = infoMk[r[0]], sOrang = r[0] && n && m ? m[2] * (r[1] ? 1 : m[4]) / n : "";
    if (sOrang !== "") r[2].filter(Boolean).forEach(l => { per[l] = per[l] || [0, 0]; per[l][0]++; per[l][1] += sOrang; });
    data.push([r[0], vl(y, 2, r[0]), vl(y, 3, r[0]), r[1], r[2][0], r[2][1], r[2][2], vl(y, 5, r[0]), { f: `IF(OR($A${y}="",COUNTA($E${y}:$G${y})=0),"",$C${y}*IF($D${y}="",$H${y},1)/COUNTA($E${y}:$G${y}))`, v: sOrang }]);
  }
  const rg = c => `Data!$${c}$2:$${c}$${akhir}`;
  const beban = [["Nama dosen / praktisi", "Jenis", "Jumlah MK-kelas", "Total SKS semester ini"]];
  semuaL.forEach((l, i) => { const y = i + 2, cocok = `(${rg("E")}=$A${y})+(${rg("F")}=$A${y})+(${rg("G")}=$A${y})`;
    const h = per[l] || [0, 0];
    beban.push([l, i < lDos.length ? "Dosen" : "Praktisi", { f: `SUMPRODUCT(${cocok})`, v: h[0] }, { f: `SUMPRODUCT(${cocok},${rg("I")})`, v: Math.round(h[1] * 1e6) / 1e6 }]); });
  const tot = Object.values(per).reduce((a, h) => [a[0] + h[0], a[1] + h[1]], [0, 0]);
  beban.push(["Jumlah", "", { f: `SUM(C2:C${semuaL.length + 1})`, v: tot[0] }, { f: `SUM(D2:D${semuaL.length + 1})`, v: Math.round(tot[1] * 1e6) / 1e6 }]);
  const mk = [["Kode MK", "Nama mata kuliah", "SKS", "Kelas di templat", "Jumlah kelas"]].concat(D.tim.filter(t => !t.tanpaTim).map(t => infoMk[t.kode]));
  const kelasL = [...new Set(D.tim.flatMap(t => kelasTemplat(t).map(k => teksKunciTim(t, k))))].sort();
  const pilihan = { 3: kelasL.length ? kelasL : null, 4: lDos.length ? { ref: `'Beban SKS'!$A$2:$A$${lDos.length + 1}` } : null, 5: semuaL.length ? { ref: `'Beban SKS'!$A$2:$A$${semuaL.length + 1}` } : null };
  pilihan[6] = pilihan[5];
  const petunjuk = [["Bagian", "Keterangan", ""],
    ["Semester", D.labelSemester, "[smt:" + D.semester + "]"],
    ["Cara mengisi", "Isi lembar Data: satu baris per mata kuliah. Pilih nama dari daftar (klik sel, lalu panah). Kolom bertanda * wajib. Jangan mengubah baris judul (baris 1) dan kolom berlabel (otomatis).", ""],
    ["Kelas", "Setiap mata kuliah punya baris kelas A dan kelas B. Bila pengampunya sama, tulis nama yang sama di kedua baris. Kelas yang dikosongkan dianggap belum punya pengampu. Bila kedua baris sama persis, aplikasi menyimpannya sebagai tim yang sama untuk semua kelas.", ""],
    ["MK pilihan", "Mata kuliah berkelompok paralel (mis. Bahasa Asing Pilihan) punya baris per kelas dan kelompok, mis. A/Jepang, A/Jerman, A/Perancis, B/Jepang, … Setiap kelompok dihitung satu kelas utuh: pengampu tunggal mendapat SKS penuh.", ""],
    ["Tim", "Pengampu utama harus dosen. Anggota 2 dan 3 boleh dosen atau praktisi. Maksimal 3 orang per tim. Dosen tunggal: isi pengampu utama saja.", ""],
    ["Beban SKS", "Lembar Beban SKS menghitung otomatis per baris kelas: dosen tunggal mendapat SKS penuh; tim (team teaching) membagi SKS rata (mis. 3 SKS untuk 3 orang = 1 SKS per orang). Dosen yang mengajar kelas A dan B mendapat SKS dari kedua kelas.", ""],
    ["Mengunggah", "Simpan sebagai .xlsx lalu unggah di aplikasi: Data Prodi › Tim pengajar (semester yang sama). Mata kuliah tanpa nama tidak diubah; menghapus tim dilakukan lewat tombol Ubah tim.", ""],
    ["Tanpa pengampu", (D.tim.filter(t => t.tanpaTim).map(t => t.kode + " " + t.nama).join("; ") || "–") + ". Mata kuliah ini ditandai tanpa dosen pengampu (magang/tugas akhir) di Kurikulum, jadi tidak dimasukkan ke templat dan beban SKS.", ""],
    ["Menulis nama", "Paling aman pilih dari daftar (dropdown). Nama juga boleh diketik: nama lengkap (dengan atau tanpa gelar), inisial, NIP, atau minimal 2 kata nama. Bila cocok dengan lebih dari satu orang, baris itu ditandai untuk diperbaiki. Nama yang diketik tidak terhitung di lembar Beban SKS Excel, tetapi beban SKS-nya tetap tampil di pratinjau aplikasi saat diunggah.", ""],
    ["Catatan", "Daftar nama diambil dari aplikasi saat templat diunduh (dosen berakun dan praktisi di tab Praktisi). Ada dosen/praktisi baru? Unduh templat baru. Hanya nama dari daftar yang dihitung di Beban SKS.", ""]];
  return UPW_ZIP.xlsx([
    { nama: "Data", baris: data, teks: [0], pilihan, lebar: [14, 34, 13, 26, 40, 36, 36, 24, 24] },
    { nama: "Beban SKS", baris: beban, lebar: [50, 10, 16, 20] },
    { nama: "Mata kuliah", baris: mk, teks: [0], lebar: [12, 40, 6, 20, 12] },
    { nama: "Petunjuk", baris: petunjuk, lebar: [14, 110, 16] }]);
}
/* v0.39.2: pencocokan nama bertahap untuk unggahan templat tim (nama boleh diketik, tidak harus dari dropdown).
   1) persis: pilihan dropdown, nama lengkap, inisial, NIP; 2) nama tanpa gelar sama persis; 3) minimal 2 kata nama sama (setidaknya satu bukan
   kata nama umum Bali seperti Made, Komang, Ni, Luh) dan hanya SATU orang yang paling cocok. Lebih dari satu kandidat → tidak ditebak. */
const GELAR_NAMA = new Set("dr drs dra ir prof h hj hc st sst sstpar sstp se sh spd spar sos sip sikom skom sm mm mpar mpd msi msc mba ma mt mhum mkom mtr mkes mh ph phd cht cha ak cpa".split(" "));
const KATA_NAMA_UMUM = new Set("i ni luh putu made kadek nyoman komang ketut wayan gede kade nengah ida bagus ayu gusti agung anak dewa desak sang cokorda gst ngurah ag a".split(" "));
function intiNama(v) {
  let t = String(v || "").toLowerCase().replace(/\([^)]*\)/g, " ");          // buang "(KSW)", "(praktisi, PT …)", "(contoh)"
  t = t.split(",")[0];                                                       // gelar belakang setelah koma
  return t.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w && !GELAR_NAMA.has(w));
}
function buatPencocokNama(D) {
  const kunci = v => String(v || "").trim().toLowerCase().replace(/\s+/g, " "), orang = [], persis = new Map();
  D.dosen.forEach(x => { const a = { t: "u", id: x.id, l: labelDosenTim(x), inti: intiNama(x.nama) }; orang.push(a);
    [labelDosenTim(x), x.nama, x.inisial, x.nip, String(x.nip || "").replace(/\s+/g, "")].filter(Boolean).forEach(v => persis.set(kunci(v), a)); });
  D.praktisi.forEach(x => { const a = { t: "p", id: x.id, l: labelPrakTim(x), inti: intiNama(x.nama) }; orang.push(a);
    [labelPrakTim(x), x.nama].forEach(v => { if (!persis.has(kunci(v))) persis.set(kunci(v), a); }); });
  return v => {
    const p = persis.get(kunci(v)) || persis.get(kunci(v).replace(/\s+/g, "")); if (p) return { a: p, cara: "persis" };
    const ti = intiNama(v), sama = orang.filter(o => o.inti.join(" ") === ti.join(" "));
    if (ti.length && sama.length === 1) return { a: sama[0], cara: "tanpa gelar" };
    if (sama.length > 1) return { kandidat: sama };
    const kata = [...new Set(ti.filter(w => w.length >= 2))];
    if (kata.length < 2) return { satuKata: kata.length === 1 };
    const skor = orang.map(o => { const cocok = kata.filter(w => o.inti.includes(w)); return { o, n: cocok.length, khas: cocok.some(w => !KATA_NAMA_UMUM.has(w)) }; })
      .filter(x => x.n >= 2 && x.khas).sort((a, b) => b.n - a.n);
    if (!skor.length) return {};
    const terbaik = skor.filter(x => x.n === skor[0].n);
    return terbaik.length === 1 ? { a: terbaik[0].o, cara: "mirip" } : { kandidat: terbaik.map(x => x.o) };
  };
}
/** Periksa hasil baca templat tim: semester berkas, nama → id, pengelompokan per MK. Masalah di satu baris membatalkan MK itu saja. */
function periksaImporTim(X, lembar) {
  const D = S.dp, P = lembar.find(l => /^petunjuk$/i.test(l.nama));
  const tanda = P ? P.baris.flat().map(v => /\[smt:(\d{4}-[12])\]/.exec(String(v || ""))).find(Boolean) : null;
  if (!tanda) throw new Error("Berkas ini bukan templat tim pengajar dari aplikasi (lembar Petunjuk tidak dikenali). Unduh templat dari tombol Unduh templat Excel.");
  if (tanda[1] !== D.semester) throw new Error(`Berkas ini untuk semester ${labelSmtTampil(tanda[1])}, sedangkan yang dipilih ${D.labelSemester}. Ganti pilihan semester di atas atau unduh templat semester ini.`);
  const cocokkan = buatPencocokNama(D);
  const mk = {}; D.tim.forEach(t => { mk[t.kode] = t; });
  const grup = {}, masalah = X.masalah, buruk = new Set();
  X.baris.forEach(r => {
    const no = r._no, kode = String(r.kode || "").trim().toUpperCase(), nm = [r.u1, r.u2, r.u3].map(v => String(v || "").trim());
    if (!nm.some(Boolean)) return;                                // baris tanpa nama: MK tidak diubah
    const salah = m => { masalah.push(`Baris ${no} (${kode}): ${m}`); buruk.add(kode); };
    if (!mk[kode]) { masalah.push(`Baris ${no}: kode ${kode} bukan mata kuliah ${/-1$/.test(D.semester) ? "ganjil" : "genap"} di kurikulum.`); return; }
    if (mk[kode].tanpaTim) { masalah.push(`Baris ${no}: ${kode} ditandai tanpa dosen pengampu (magang/tugas akhir); ubah penandanya di Kurikulum bila memang perlu tim.`); return; }
    const kelas = String(r.kelas || "").trim().toUpperCase().replace(/\s*[\/·]\s*/, "/");
    if (berkel(mk[kode])) { if (!kelasTim(mk[kode]).includes(kelas)) salah(`MK pilihan: isi kolom Kelas dengan kelas/kelompok, mis. ${teksKunciTim(mk[kode], kelasTim(mk[kode])[0])} (pilihan kelompok: ${mk[kode].kelompok.map(g => g.n).join(", ")}).`); }
    else if (kelas && !/^[A-Z0-9]{1,3}$/.test(kelas)) salah(`kelas "${r.kelas}" tidak valid.`);
    if (!nm[0]) salah("pengampu utama kosong.");
    const ang = [], tafsir = [];
    nm.forEach((v, i) => { if (!v) return; const h = cocokkan(v), a = h.a;
      if (!a) salah(h.kandidat ? `"${v}" cocok dengan lebih dari satu orang (${h.kandidat.map(o => o.l).join("; ")}). Tulis lebih lengkap atau pilih dari daftar.`
        : h.satuKata ? `"${v}" hanya satu kata; tulis minimal 2 kata nama, inisial, NIP, atau pilih dari daftar.` : `"${v}" tidak ada di daftar dosen/praktisi.`);
      else if (i === 0 && a.t !== "u") salah("pengampu utama harus dosen, bukan praktisi.");
      else if (ang.some(z => z.id === a.id)) salah(`"${v}" tercantum dua kali.`);
      else { ang.push(a); if (h.cara !== "persis") tafsir.push(`"${v}" → ${a.l}`); } });
    r._tafsir = tafsir.join("; ");
    (grup[kode] = grup[kode] || { kode, baris: no, kelas: {} });
    if (kelas in grup[kode].kelas) salah(kelas ? `kelas ${kelas} muncul dua kali.` : "mata kuliah muncul dua kali tanpa kelas.");
    grup[kode].kelas[kelas] = ang; r._ang = ang;
  });
  const daftar = [];
  Object.values(grup).forEach(g => {
    const kls = Object.keys(g.kelas);
    if (kls.includes("") && kls.length > 1) { masalah.push(`${g.kode}: ada baris tanpa kelas dan baris per kelas sekaligus. Pakai salah satu: kosong (semua kelas) atau satu baris per kelas.`); buruk.add(g.kode); }
    if (buruk.has(g.kode)) return;
    const keAng = l => l.map(a => ({ t: a.t, id: a.id })), sid = l => l.map(a => a.t + a.id).join();
    // v0.36.1: semua baris kelas MK terisi dan sama persis → simpan sebagai tim "sama untuk semua kelas" (hitungan EWMP sama: SKS × jumlah kelas).
    const semuaKls = kelasTim(mk[g.kode]), sama = !berkel(mk[g.kode]) && !kls.includes("") && kls.length > 1 && kls.every(k => sid(g.kelas[k]) === sid(g.kelas[kls[0]]))
      && semuaKls.length === kls.length && semuaKls.every(k => kls.includes(k));
    daftar.push({ baris: g.baris, kode: g.kode, data: kls.includes("") ? { kodeMk: g.kode, anggota: keAng(g.kelas[""]) } : sama ? { kodeMk: g.kode, anggota: keAng(g.kelas[kls[0]]) }
      : { kodeMk: g.kode, perKelas: Object.fromEntries(kls.map(k => [k, keAng(g.kelas[k])])) } });
  });
  X.semester = D.semester; X.daftar = daftar;
  X.baris = X.baris.filter(r => r._ang && daftar.some(x => x.kode === String(r.kode || "").trim().toUpperCase()));
  X.baris.forEach(r => { r.u1 = r._ang[0] ? r._ang[0].l : ""; r.u2 = r._ang[1] ? r._ang[1].l : ""; r.u3 = r._ang[2] ? r._ang[2].l : ""; r.kelas = r.kelas ? String(r.kelas) : "semua"; r.tafsir = r._tafsir || ""; });
  const nTafsir = X.baris.filter(r => r.tafsir).length;
  if (nTafsir) X.kolom = X.kolom.concat([{ k: "tafsir", l: "Terbaca sebagai (periksa)" }]);
  X.ringkas = `${daftar.length} mata kuliah akan disimpan${nTafsir ? `; ${nTafsir} baris berisi nama yang dicocokkan otomatis, periksa kolom terakhir` : ""}`;
  // v0.39.2: beban SKS per orang dari baris berkas ini (sama dengan aturan templat: SKS × jumlah kelas bila tanpa kelas, ÷ jumlah orang).
  const beban = {};
  X.baris.forEach(r => { const t = mk[String(r.kode || "").trim().toUpperCase()]; if (!t || !r._ang.length) return;
    const kali = r.kelas === "semua" ? kelasTemplat(t).length : 1;
    r._ang.forEach(a => { const b = beban[a.id] = beban[a.id] || { l: a.l, n: 0, sks: 0 }; b.n++; b.sks += t.sks * kali / r._ang.length; }); });
  const bl = Object.values(beban).sort((a, b) => b.sks - a.sks);
  X.tambahanHtml = bl.length ? `<details class="small" style="margin-top:6px" open><summary><b>Beban SKS per orang menurut berkas ini</b> (dihitung aplikasi, juga untuk nama yang diketik)</summary>
    <div class="tbl-wrap gulir" style="margin-top:4px"><table><thead><tr><th>Nama</th><th>MK-kelas</th><th>SKS</th></tr></thead><tbody>${bl.map(b => `<tr><td>${esc(b.l)}</td><td class="num">${b.n}</td><td class="num">${(Math.round(b.sks * 100) / 100).toLocaleString("id-ID")}</td></tr>`).join("")}</tbody></table></div>
    <span class="hint">Hanya MK yang ada di berkas ini. Mata kuliah lain (yang tidak diunggah) tidak ikut terhitung di sini.</span></details>` : "";
}
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
  // v0.25.1: SEMUA baris ditampilkan di kotak bergulir agar bisa diperiksa satu per satu sebelum diimpor.
  const contohBaris = X && X.baris.length ? `<p class="small muted" style="margin-top:6px">Semua ${X.baris.length} baris ditampilkan${X.baris.length > 5 ? "; gulir di dalam kotak untuk memeriksa satu per satu" : ""}.</p>
    <div class="tbl-wrap gulir" style="margin-top:4px"><table><thead><tr><th>No</th>${X.kolom.map(k => `<th>${esc(k.l)}</th>`).join("")}</tr></thead><tbody>
    ${X.baris.map((r, i) => `<tr><td class="small num muted">${i + 1}</td>${X.kolom.map(k => `<td class="small">${k.k === "masuk" && !r.masuk && /^\d{2}/.test(String(r.username || "")) ? `<span class="muted">20${esc(String(r.username).slice(0, 2))} (dari NIM)</span>` : esc(r[k.k] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : "";
  return `<div class="picker" style="margin-top:10px"><div class="row" style="justify-content:space-between;flex-wrap:wrap"><b>Impor dari Excel · ${esc(J.judul)}</b>
     <div class="row small" style="flex-wrap:wrap"><button class="btn sm" data-act="imxTemplat" data-j="${jenis}" ${dis}>Unduh templat Excel</button>
     <label class="btn sm primary" ${S.sibuk ? 'aria-disabled="true"' : ""}>Unggah berkas Excel<input type="file" data-imx="${jenis}" accept=".xlsx" hidden ${dis}></label></div></div>
    <span class="hint">${J.hint || "1) Unduh templat · 2) isi lembar <b>Data</b> di Excel/Google Sheets (lihat lembar Petunjuk dan Contoh) · 3) unggah berkasnya (.xlsx), periksa pratinjau, lalu tekan Impor."}</span>
    ${X ? `<div class="auto">Berkas <b>${esc(X.nama)}</b>: <b>${X.baris.length}</b> baris siap diimpor${X.ringkas ? ` (${esc(X.ringkas)})` : ""}${X.masalah.length ? `, <b>${X.masalah.length}</b> perlu diperbaiki` : ""}.</div>
      ${X.masalah.length ? `<ul class="small gulir" style="margin:0 0 0 18px;color:var(--bad)">${X.masalah.map(m => `<li>${esc(m)}</li>`).join("")}</ul>` : ""}
      ${contohBaris}${X.tambahanHtml || ""}
      ${X.hasil ? `<div class="auto">${esc(X.hasil)}${X.lewati && X.lewati.length ? `<ul class="small gulir" style="margin:4px 0 0 18px">${X.lewati.map(l => `<li>Baris ${l.baris}${l.nip ? " (" + esc(l.nip) + ")" : ""}: ${esc(l.alasan)}</li>`).join("")}</ul>` : ""}</div>` : ""}
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
    const o = { _no: i + 2 }, no = i + 2; let salah = false;
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
  const X = { jenis, nama: file.name, kolom: kolom.filter(c => c.k in peta), baris, masalah };
  if (JENIS_IMPOR[jenis].periksa) await JENIS_IMPOR[jenis].periksa(X, lembar);
  return X;
}
Object.assign(AKSI, {
  async imxTemplat(d) {
    try {
      if (JENIS_IMPOR[d.j].templat) { toast("Menyusun templat…"); const b = await JENIS_IMPOR[d.j].templat(); unduhBlob(b, `Templat tim pengajar ${S.dp.labelSemester.replace("/", "-")}.xlsx`); render(); return; }
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
    jalankan(async () => { const j = await J.kirim(X.baris, X); X.hasil = J.pesan(j); X.lewati = J.lewati ? J.lewati(j, X) : []; J.segarkan(); toast(X.hasil); });
  },
  async eksporAkun() {
    try { const E = await api("admin.eksporAkun"); unduhBlob(UPW_ZIP.xlsx([{ nama: "Akun", baris: [E.kepala, ...E.baris], teks: [0] }]), `Daftar akun Repositori UPW ${hariIniLokal()}.xlsx`); }
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
  return `${D.bolehUbah ? panelPddikti(D) : ""}<div class="callout">Status dosen per tanggal: <b>Aktif</b>, <b>Tugas belajar</b> (dengan tanggal mulai dan selesai saat kembali ke kampus; lama tugas belajar dihitung otomatis), atau <b>Pensiun</b>. Tanpa catatan, dosen dianggap aktif. ${D.bolehUbah ? "" : "Anda dapat melihat; perubahan oleh Admin Prodi."}</div>
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
const muatDokBio = () => sekali("dokBio", async () => { S.dokBio = await api("dok.biodata"); render(); });
function panelDokBiodata() {
  const D = S.dokBio;
  if (!D) { muatDokBio(); return `<section class="panel" id="dokBio"><h2>Dokumen pendukung</h2><div class="memuat" style="min-height:60px">Memuat…</div></section>`; }
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
    const w = penampil();
    try {
      const j = await api("dok.lihat", { id: d.id, dariBiodata: 1 });
      if (j.t !== "file") { if (w) w.location.href = j.url; else window.open(j.url, "_blank", "noopener"); return; }
      const bin = atob(j.isi), arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([arr], { type: j.mime }));
      if (w && /pdf|image/.test(j.mime)) w.tampil(url, j.nama, j.mime); else { if (w) w.close(); unduhBlob(new Blob([arr], { type: j.mime }), j.nama); }
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
   <div class="tbl-wrap gulir tinggi"><table><thead><tr><th>Waktu</th><th>Keputusan</th><th>Kegiatan</th><th>Pengaju</th><th>Oleh</th><th>Catatan</th></tr></thead><tbody>
   ${l.map(x => `<tr><td class="small num">${tgl(x.waktu)}</td><td><span class="chip ${CHIP_KEP[x.keputusan] || ""}">${esc(x.label)}</span>${x.kodeSurat ? `<div class="small mono">${esc(x.kodeSurat)}</div>` : ""}</td>
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
  return `<div class="head"><div><h1>Laboratorium dan sarana</h1><p>Data sarana, laboratorium, perawatan, dan pemakaian untuk butir Matriks sarana dan prasarana (19–21) LAMWisata. Diisi Kepala Lab dan Laboran${ub ? "" : "; Anda dapat melihat"}.</p><div style="margin-top:6px">${iTombol("b19,b20,b21,b18")}</div></div>${ub ? tombol("labBaru", "+ Tambah sarana", "primary") : ""}</div>
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
    <div class="tbl-wrap gulir tinggi" style="margin-top:8px"><table><thead><tr><th>Tanggal</th><th>Sarana</th><th>Jenis</th><th>Kegiatan / keperluan</th><th>MK / kelas</th><th>Pengguna</th><th>Jam</th><th>Dicatat</th>${ub ? "<th></th>" : ""}</tr></thead><tbody>
    ${L.log.map(g => `<tr><td class="small num">${esc(tglPendek(g.tgl))}</td><td class="small">${esc((L.sarana.find(x => x.id === g.saranaId) || {}).nama || "–")}</td><td class="small">${g.tipe === "rawat" ? "Perawatan" : "Pemakaian"}</td><td class="small">${esc(g.isi)}</td><td class="small">${esc(g.mk || "–")}</td><td class="small num">${g.jumlah || "–"}</td><td class="small num">${g.jam ? String(g.jam).replace(".", ",") : "–"}</td><td class="small">${esc(namaPendek(g.oleh))}</td>
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

/* --- Info dan panduan (v0.26.0) ---
   Isi panduan ada di panduan.js (window.UPW_PANDUAN): topik per peran, gambar asli bertanda (nomor, kotak, panah), dan kamus sinonim.
   Pencarian berjalan di perangkat, tanpa AI dan tanpa internet: kata dinormalkan (imbuhan dibuang, sinonim disamakan, salah ketik ditoleransi),
   lalu topik diberi skor. Saran muncul saat mengetik. */
const SEMUA_PERAN = ["mahasiswa", "dosen", "tendik", "kps", "gkm", "kalab", "laboran", "admin", "superadmin", "asesor"];
const PDN = () => window.UPW_PANDUAN || { topik: [], gambar: {}, sinonim: [], kategori: [] };
const PERAN_TOPIK = (t, r) => t.p === "semua" ? r !== "asesor" || t.asesor : t.p.includes(r);
/** Langkah masuk pertama kali (juga dipakai di halaman masuk). */
const langkahMasuk = () => (PDN().topik.find(t => t.id === "masuk-pertama") || { l: [] }).l;

/* ---- gambar bertanda ---- */
function htmlGambar(id, besar) {
  const g = PDN().gambar[id]; if (!g) return "";
  const W = 1100, H = 720, uid = "g" + id.replace(/\W/g, "") + (besar ? "b" : "");
  const kotak = g.a.map(a => {
    let s = a.w ? `<rect data-n="${a.n}" x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" rx="7" class="gk"/>` : "";
    if (a.bx != null) {
      const tx = a.w ? Math.min(Math.max(a.bx, a.x), a.x + a.w) : a.x, ty = a.w ? Math.min(Math.max(a.by, a.y), a.y + a.h) : a.y;
      s += `<line x1="${a.bx}" y1="${a.by}" x2="${tx}" y2="${ty}" class="gp" marker-end="url(#${uid}m)"/>`;
    }
    return s;
  }).join("");
  const tanda = g.a.map(a => { const bx = a.bx != null ? a.bx : a.x, by = a.by != null ? a.by : a.y;
    return `<span class="tanda" data-n="${a.n}" style="left:${(Math.min(Math.max(bx, 12), W - 12) / W * 100).toFixed(2)}%;top:${(Math.min(Math.max(by, 12), H - 12) / H * 100).toFixed(2)}%">${a.n}</span>`; }).join("");
  return `<figure class="gbr-panduan" data-gbr="${esc(id)}"><div class="gbr" ${besar ? "" : `data-act="gbrBesar" data-id="${esc(id)}" title="Klik untuk memperbesar"`}>
     <img src="panduan/${esc(id)}.webp" alt="${esc(g.j)}" loading="lazy" width="1600" height="1047">
     <svg class="gsvg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="${uid}m" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="gm"/></marker></defs>${kotak}</svg>${tanda}
     ${besar ? "" : `<span class="gbr-zoom" aria-hidden="true">Perbesar</span>`}</div>
    <figcaption><b>${esc(g.j)}</b><ol>${g.a.map(a => `<li value="${a.n}" data-sorot="${a.n}">${esc(a.k)}</li>`).join("")}</ol></figcaption></figure>`;
}
document.addEventListener("mouseover", e => {
  const li = e.target.closest && e.target.closest("[data-sorot]"); const fig = e.target.closest && e.target.closest(".gbr-panduan");
  document.querySelectorAll(".gbr-panduan.sorot").forEach(f => { if (f !== fig || !li) { f.classList.remove("sorot"); f.querySelectorAll(".aktif").forEach(x => x.classList.remove("aktif")); } });
  if (!li || !fig) return;
  fig.classList.add("sorot"); fig.querySelectorAll(".aktif").forEach(x => x.classList.remove("aktif"));
  fig.querySelectorAll(`[data-n="${li.dataset.sorot}"]`).forEach(x => x.classList.add("aktif"));
});
function laciGambarBesar() {
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Gambar panduan" style="width:min(1180px,100%)">
   <div class="dh"><h2>${esc((PDN().gambar[S.laci.id] || {}).j || "Gambar")}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>${htmlGambar(S.laci.id, true)}</div></div>`;
}

/* ---- mesin pencari (tanpa AI) ---- */
const STOP_CARI = new Set(("yang di ke dari dan atau untuk dengan pada dalam ini itu saya aku gue kami kita anda bapak ibu pak bu bagaimana gimana bgmn cara caranya apa apakah "
  + "mengapa dimana mana kapan sudah udah belum ada adalah jadi juga lagi saja aja dong deh sih ya yg utk dgn tdk sy mau ingin pengen tolong mohon bisa dapat "
  + "bisakah boleh harus perlu kalau kalo jika agar supaya biar oleh tentang seperti tsb tersebut sebuah suatu nya the how to i my").split(" "));
const MASALAH_CARI = new Set("tidak tdk gagal error eror galat lupa kenapa kok terkunci kunci hilang salah macet lambat lemot tak gak nggak ga ngga belum kosong muncul rusak".split(" "));
/* Kata penanda masalah yang terlalu umum untuk dicocokkan sebagai isi (tetap menaikkan topik "Masalah umum"). */
const UMUM_CARI = new Set("tidak tdk kenapa kok tak gak nggak ga ngga belum".split(" "));
function bersihTeks(s) { return String(s || "").toLowerCase().replace(/<[^>]+>/g, " ").replace(/[’'`]/g, "").replace(/[^a-z0-9\s-]/g, " ").replace(/-/g, " "); }
/** Bentuk dasar kata (kasar, cukup untuk mencocokkan): buang akhiran lalu awalan; awalan peN-/meN- menghasilkan beberapa kemungkinan. */
function akarKata(w) {
  const v = new Set([w]); let x = w;
  if (x.length > 5) x = x.replace(/(nya|lah|kah|pun)$/, "");
  if (x.length > 5) x = x.replace(/(kan|an)$/, ""); else if (x.length > 6) x = x.replace(/i$/, "");
  v.add(x);
  const vok = c => /[aiueo]/.test(c || "");
  const aw = [["meng", ["k", ""]], ["peng", ["k", ""]], ["meny", ["s"]], ["peny", ["s"]], ["mem", ["p", "m"]], ["pem", ["p", "m"]], ["men", ["t", "n"]], ["pen", ["t", "n"]],
    ["me", [""]], ["pe", [""]], ["ber", [""]], ["be", [""]], ["ter", [""]], ["per", [""]], ["di", [""]], ["ke", [""]], ["se", [""]]];
  for (const [a, ganti] of aw) {
    if (!x.startsWith(a) || x.length - a.length < 3) continue;
    const sisa = x.slice(a.length);
    if (["meng", "peng", "meny", "peny", "mem", "pem", "men", "pen"].includes(a) && !vok(sisa[0])) { v.add(sisa); break; }
    ganti.forEach(g => v.add(g + sisa));
    break;
  }
  return [...v].filter(s => s.length >= 2);
}
let KAMUS_CARI = null;
function kamusCari() {
  if (KAMUS_CARI) return KAMUS_CARI;
  const kanon = new Map(), frasa = [];
  (PDN().sinonim || []).forEach(gr => { const utama = bersihTeks(gr[0]).trim(); gr.forEach(w => { const b = bersihTeks(w).trim(); if (b.includes(" ")) frasa.push([b, utama.split(" ")[0]]); else akarKata(b).forEach(a => kanon.set(a, utama.split(" ")[0])); }); });
  frasa.sort((a, b) => b[0].length - a[0].length);
  const token = s => {
    let t = " " + bersihTeks(s) + " ";
    frasa.forEach(([f, u]) => { t = t.split(" " + f + " ").join(" " + u + " "); });
    return t.split(/\s+/).filter(Boolean);
  };
  const varian = [...kanon.keys()].filter(x => x.length >= 4);
  const kunci = w => {
    const a = akarKata(w); for (const x of a) if (kanon.has(x)) return [kanon.get(x)];
    // salah ketik pada kata bersinonim (mis. "pasword" → sandi)
    if (w.length >= 5) { const v = varian.find(x => jarak(x, w) <= (w.length >= 8 ? 2 : 1)); if (v) return [kanon.get(v)]; }
    return a;
  };
  const indeks = PDN().topik.map(t => {
    const bidang = { j: t.j, kw: (t.kw || "") + " " + (t.menuL || ""), r: t.r || "", l: (t.l || []).join(" ") + " " + (t.tips || []).join(" ") };
    const set = {}; Object.keys(bidang).forEach(b => { set[b] = new Set(); token(bidang[b]).forEach(w => { if (!STOP_CARI.has(w)) kunci(w).forEach(k => set[b].add(k)); }); });
    return { t, set, judul: bersihTeks(t.j) };
  });
  // kata yang sedang diketik (belum selesai): cocokkan awalannya dengan semua bentuk sinonim, mis. "upl" → upload → unggah
  const awalan = w => { const l = new Set(); kanon.forEach((u, v) => { if (v.startsWith(w)) l.add(u); }); return [...l]; };
  KAMUS_CARI = { token, kunci, indeks, awalan };
  return KAMUS_CARI;
}
function jarak(a, b) { if (Math.abs(a.length - b.length) > 2) return 9; const d = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) { let p = d[0]; d[0] = i; for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; } }
  return d[b.length]; }
/** Cari topik. Mengembalikan [{t, skor}] urut menurun. */
function cariPanduan(q, peran) {
  const K = kamusCari(), kata = K.token(q), akhirSedang = !/\s$/.test(q);
  const masalah = kata.some(w => MASALAH_CARI.has(w));
  const isi = kata.filter(w => !STOP_CARI.has(w) && !UMUM_CARI.has(w));
  if (!isi.length && !masalah) return [];
  const BOBOT = { j: 6, kw: 4, r: 2.5, l: 1 };
  const hasil = K.indeks.map(x => {
    let skor = 0, cocok = 0;
    isi.forEach((w, i) => {
      const awalan = akhirSedang && i === isi.length - 1 && w.length >= 2, kk = K.kunci(w).concat(awalan && w.length >= 3 ? K.awalan(w) : []);
      let terbaik = 0;
      Object.keys(BOBOT).forEach(b => {
        const s = x.set[b];
        if (kk.some(k => s.has(k))) terbaik = Math.max(terbaik, BOBOT[b]);
        else if (awalan && [...s].some(k => k.startsWith(w))) terbaik = Math.max(terbaik, BOBOT[b] * 0.8);
        else if (w.length >= 4 && [...s].some(k => k.length >= 4 && jarak(k, w) <= (w.length >= 8 ? 2 : 1))) terbaik = Math.max(terbaik, BOBOT[b] * 0.6);
      });
      if (terbaik) { skor += terbaik; cocok++; }
    });
    if (isi.length && cocok === 0) return { t: x.t, skor: 0 };
    skor *= 0.5 + 0.5 * (isi.length ? cocok / isi.length : 1);
    const frasa = bersihTeks(q).trim(); if (frasa.length >= 4 && x.judul.includes(frasa)) skor += 6;
    if (masalah && x.t.kat === "masalah") skor = skor * 1.6 + 2;
    if (!PERAN_TOPIK(x.t, peran)) skor *= 0.55;
    return { t: x.t, skor };
  }).filter(x => x.skor > 0.9).sort((a, b) => b.skor - a.skor);
  const atas = hasil.length ? hasil[0].skor : 0;
  return hasil.filter(x => x.skor >= atas * 0.35);
}
function htmlSaranCari() {
  const q = S.infoQ || "", p = S.infoPeranLihat || peranAktif();
  if (q.trim().length < 2) return "";
  const l = cariPanduan(q, p).slice(0, 7);
  const kat = Object.fromEntries((PDN().kategori || []).map(k => [k.k, k.l]));
  return `<div class="cari-saran" role="listbox" aria-label="Saran topik">${l.map((x, i) => `<button class="cari-item ${i === (S.infoPilih || 0) ? "aktif" : ""}" role="option" data-act="infoBukaTopik" data-id="${x.t.id}">
      <b>${esc(x.t.j)}</b><span class="small muted">${esc(kat[x.t.kat] || "")}${PERAN_TOPIK(x.t, p) ? "" : " · untuk " + esc(x.t.p === "semua" ? "semua peran" : x.t.p.map(r => PERAN_L[r]).join(", "))}</span>
      <span class="small">${esc(x.t.r || "")}</span></button>`).join("")
    || `<div class="cari-kosong small">Belum ada topik yang cocok dengan "<b>${esc(q)}</b>". Coba kata lain (misalnya "unggah bukti", "lupa sandi"), atau <button class="lnk" data-act="infoTanya">kirim pertanyaan ini ke Admin Prodi</button>.</div>`}</div>`;
}
function perbaruiSaranCari() { const el = $("cariSaranWadah"); if (el) el.innerHTML = htmlSaranCari(); }
document.addEventListener("input", e => { if (e.target.id === "infoCari") { S.infoQ = e.target.value; S.infoPilih = 0; perbaruiSaranCari(); } });
document.addEventListener("keydown", e => {
  if (e.target.id !== "infoCari") return;
  const n = document.querySelectorAll(".cari-item").length;
  if (e.key === "ArrowDown" && n) { e.preventDefault(); S.infoPilih = ((S.infoPilih || 0) + 1) % n; perbaruiSaranCari(); }
  else if (e.key === "ArrowUp" && n) { e.preventDefault(); S.infoPilih = ((S.infoPilih || 0) - 1 + n) % n; perbaruiSaranCari(); }
  else if (e.key === "Enter") { e.preventDefault(); const b = document.querySelectorAll(".cari-item")[S.infoPilih || 0]; if (b) AKSI.infoBukaTopik(b.dataset); }
  else if (e.key === "Escape") { S.infoQ = ""; e.target.value = ""; perbaruiSaranCari(); }
});

/* ---- riwayat versi singkat di Tentang aplikasi (v0.27.0): baris "Ringkas" dari CHANGELOG lewat riwayat.json ---- */
const angkaVersi = v => String(v).replace(/^v/, "").split(".").map(Number).reduce((a, x) => a * 1000 + x, 0);
function htmlVersiTerakhir() {
  if (!S.versiInfo) { sekali("versiInfo", async () => { const r = await fetch("riwayat.json?v=" + encodeURIComponent(K.versi), { cache: "no-store" }); S.versiInfo = r.ok ? await r.json() : []; render(); }); return `<p class="small muted" style="margin-top:8px">Memuat riwayat versi…</p>`; }
  const kini = angkaVersi(K.versi), ada = new Set();
  const l = S.versiInfo.filter(x => x.ringkas && angkaVersi(x.versi) <= kini && !ada.has(x.versi) && ada.add(x.versi)).slice(0, 10);
  if (!l.length) return "";
  return `<h3 style="font-size:1rem;margin-top:12px">Pembaruan terakhir</h3>
   <ol class="versi-daftar">${l.map(x => `<li><b class="num">${esc(x.versi)}</b> <span class="small muted">· ${esc(x.tanggal)}${x.versi === "v" + K.versi ? " · versi Anda sekarang" : ""}</span><div class="small">${esc(x.ringkas)}</div></li>`).join("")}</ol>`;
}

/* ---- halaman Info ---- */
function htmlTopik(t, buka) {
  const terkait = (t.terkait || []).map(id => PDN().topik.find(x => x.id === id)).filter(Boolean);
  return `<details class="topik" id="topik-${t.id}" ${buka ? "open" : ""}><summary><b>${esc(t.j)}</b>${t.r ? `<span class="small muted">${esc(t.r)}</span>` : ""}</summary>
    <div class="topik-isi">
     ${t.siapa ? `<p class="small"><b>Siapa:</b> ${t.siapa}</p>` : ""}
     ${(t.g || []).length ? (t.g || []).map(id => htmlGambar(id)).join("") : ""}
     ${(t.l || []).length ? `<h4>Langkah</h4><ol class="langkah">${t.l.map(x => `<li>${x}</li>`).join("")}</ol>` : ""}
     ${(t.tips || []).length ? `<div class="callout small"><b>Perlu diketahui</b><ul>${t.tips.map(x => `<li>${x}</li>`).join("")}</ul></div>` : ""}
     <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:8px">${t.menu && menu().includes(t.menu) ? `<button class="btn sm primary" data-go="${t.menu}">Buka menu ${esc(MENU_L[t.menu])}</button>` : ""}
      ${terkait.map(x => `<button class="btn sm" data-act="infoBukaTopik" data-id="${x.id}">${esc(x.j)}</button>`).join("")}</div></div></details>`;
}
function hInfo() {
  const u = S.pengguna, punya = u.peran, pilih = S.infoPeranLihat && punya.includes(S.infoPeranLihat) ? S.infoPeranLihat : peranAktif();
  const D = PDN(), l = D.topik.filter(t => PERAN_TOPIK(t, pilih)), mulai = l.filter(t => (t.mulai || []).includes(pilih));
  return `<div class="head"><div><h1>Info dan panduan</h1><p>Penjelasan setiap fitur sesuai peran Anda, dengan gambar asli aplikasi. Ketik pertanyaan Anda di kolom pencarian.</p></div><button class="btn primary" data-act="mskBuka">Kirim masukan</button></div>
   <section class="panel cari-panel"><label for="infoCari" class="small muted">Cari fitur atau tulis pertanyaan</label>
    <div class="cari-wadah"><input id="infoCari" type="search" autocomplete="off" placeholder="Contoh: cara unggah bukti lomba, lupa kata sandi, surat tugas ditunda" value="${esc(S.infoQ || "")}">
     <div id="cariSaranWadah">${htmlSaranCari()}</div></div>
    ${punya.length > 1 ? `<label class="row small" style="gap:6px;margin-top:8px"><span class="muted">Panduan untuk peran</span><select id="infoPeranPilih" style="width:auto">${punya.map(r => `<option value="${r}" ${r === pilih ? "selected" : ""}>${PERAN_L[r]}</option>`).join("")}</select></label>` : ""}</section>
   ${mulai.length ? `<section class="panel"><h2>Mulai di sini</h2><p class="small muted">Hal terpenting untuk ${esc(PERAN_L[pilih])}.</p>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px">${mulai.map(t => `<button class="btn" data-act="infoBukaTopik" data-id="${t.id}" style="display:block;text-align:left;height:auto;padding:10px 12px;white-space:normal"><b>${esc(t.j)}</b><span class="small muted" style="display:block;margin-top:2px">${esc(t.r || "")}</span></button>`).join("")}</div></section>` : ""}
   ${(D.kategori || []).map(k => { const tk = l.filter(t => t.kat === k.k); return tk.length ? `<section class="panel"><h2>${esc(k.l)} <span class="small muted">(${tk.length})</span></h2>${k.r ? `<p class="small muted">${esc(k.r)}</p>` : ""}${tk.map(t => htmlTopik(t, S.infoTopik === t.id)).join("")}</section>` : ""; }).join("")}
   ${panelMasukanSaya()}
   <section class="panel"><h2>Tentang aplikasi</h2>
    <div class="row" style="gap:14px;align-items:center;flex-wrap:nowrap"><img src="ikon-192.png" alt="" style="width:56px;height:56px"><div>
     <b>Repositori Akreditasi UPW</b> · <span class="num">${esc(LABEL_VERSI)}</span><br>
     <span class="small">Repositori kegiatan Prodi Usaha Perjalanan Wisata, Politeknik Pariwisata Bali, untuk akreditasi LAMWisata IAPS 1.0.</span><br>
     <span class="small">Dikembangkan oleh <b>@adeprimanda</b> bersama <b>Claude Opus 5.5</b> (Anthropic).</span></div></div>
    ${htmlVersiTerakhir()}
    ${punya.includes("superadmin") ? `<p class="small" style="margin-top:8px">Catatan teknis lengkap setiap versi ada di menu <b>Riwayat Versi</b>.</p>` : ""}</section>
   <p class="small muted">Gambar panduan memakai data contoh. Nomor pada gambar sesuai daftar di bawahnya; arahkan kursor ke daftar untuk menyorot bagiannya, klik gambar untuk memperbesar.</p>`;
}
document.addEventListener("change", e => { if (e.target.id === "infoPeranPilih") { S.infoPeranLihat = e.target.value; S.infoTopik = null; render(); } });
Object.assign(AKSI, {
  infoBukaTopik(d) {
    const t = PDN().topik.find(x => x.id === d.id); if (!t) return;
    if (!PERAN_TOPIK(t, S.infoPeranLihat || peranAktif())) { const r = S.pengguna.peran.find(x => PERAN_TOPIK(t, x)); if (r) S.infoPeranLihat = r; }
    S.view = "info"; S.infoTopik = t.id; S.laci = null; render();
    setTimeout(() => { const el = $("topik-" + t.id); if (el) { el.open = true; el.scrollIntoView({ behavior: "smooth", block: "start" }); } }, 30);
  },
  gbrBesar(d) { S.laci = { jenis: "gbrBesar", id: d.id }; render(); },
  infoTanya() { const q = S.infoQ || ""; AKSI.mskBuka(); if (S.laci) { S.laci.jm = "Pertanyaan"; S.laci.judul = q.slice(0, 150); render(); } }
});


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
    const w = penampil();
    try {
      const j = await api("masukan.lampiran", { id: d.id }), bin = atob(j.isi), arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const blob = new Blob([arr], { type: j.mime }); if (w && /pdf|image/.test(j.mime)) w.tampil(URL.createObjectURL(blob), j.nama, j.mime); else { if (w) w.close(); simpanBerkas(blob, j.nama); }
    } catch (e) { if (w) w.close(); toast(e.message); }
  },
  mskXlsx() {
    const D = S.mskAdm;
    unduhBlob(UPW_ZIP.xlsx([{ nama: "Masukan", baris: [["Waktu", "Status", "Jenis", "Bagian aplikasi", "Judul", "Uraian", "Pengirim", "NIM/NIP", "Peran", "Versi", "Perangkat", "Lampiran", "Tanggapan", "Ditanggapi oleh", "Waktu tanggapan"]]
      .concat(D.masukan.map(x => [tgl(x.waktu), D.status[x.status] || x.status, x.jenis, x.menu, x.judul, x.isi, x.nama, x.username, PERAN_L[x.peran] || x.peran, x.versi, x.perangkat, x.lampiran ? x.lampiran.nama : "", x.tanggapan, x.olehTanggapan, x.waktuTanggapan ? tgl(x.waktuTanggapan) : ""])), teks: [7] }]),
      "Masukan pengguna Repositori UPW " + hariIniLokal() + ".xlsx");
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
     <p class="small muted">Jenis: ${B.jenis.map(esc).join(", ")} · rentang ${esc(B.rentang)}. ${b.t === "a" || b.t === "c" ? `<b>${hitung}</b> kegiatan berstatus Disetujui ikut dihitung; status lain belum dihitung.` : "Kegiatan ini menjadi bahan penilaian GKM (tidak dihitung otomatis)."}</p>
     ${B.kegiatan.length ? `<div class="tbl-wrap" style="margin-top:6px"><table><thead><tr><th>Kegiatan</th><th>Pengaju</th><th>Status</th></tr></thead><tbody>
      ${B.kegiatan.map(k => `<tr><td style="min-width:220px"><a href="#" data-act="bukaKeg" data-id="${k.id}"><b>${esc(k.judul)}</b></a><div class="small muted">${esc(k.jenisLabel)} · ${esc(k.tgl || "–")}${k.dihitungButir ? ' · <b style="color:var(--ok)">dihitung</b>' : ""}</div>${B.bolehUbah ? `<div style="margin-top:6px">${tombolTinjau(k)}</div>` : ""}</td>
       <td class="small">${esc(k.olehNama)}<div class="muted mono">${esc(k.olehUser)}</div>${k.akunSistem ? '<span class="tag">akun Super Admin · tidak dihitung</span>' : ""}</td><td>${chipData(k)}${k.verifNama ? `<div class="small muted">oleh ${esc(k.verifNama)}</div>` : ""}</td></tr>`).join("")}</tbody></table></div>` : `<p class="small muted">Belum ada kegiatan pada rentang ini.</p>`}</section>` : ""}
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
     <td class="small">${esc(k.olehNama)}<div class="muted mono">${esc(k.olehUser)}</div>${k.akunSistem ? '<span class="tag" title="Kegiatan yang diajukan akun Super Admin tidak dihitung di Tabel iLKPS dan Penilaian">akun Super Admin · tidak dihitung</span>' : ""}</td>
     <td>${chipData(k)}${tahapSurat(k) ? `<div class="small muted">surat tugas: ${esc(k.st)}</div>` : ""}${k.verifNama ? `<div class="small muted">oleh ${esc(k.verifNama)}</div>` : ""}</td>
     <td class="small" style="min-width:160px">${k.butir.length ? k.butir.map(b => `<span class="tag" title="${esc(nmB(b.n))}${b.cara === "bahan GKM" ? " (bahan penilaian GKM)" : " (dihitung otomatis bila disetujui)"}" style="${b.cara === "bahan GKM" ? "opacity:.7" : ""}">${b.n}</span>`).join(" ") : '<span class="muted">Tidak dipakai butir mana pun</span>'}</td></tr>`).join("") || `<tr><td colspan="5" class="empty">Tidak ada kegiatan yang cocok.</td></tr>`}</tbody></table></div>
    <p class="small muted" style="margin-top:6px">Nomor di kolom "Masuk penilaian" adalah butir Matriks Penilaian. Nomor tebal dihitung otomatis bila data Disetujui; nomor pudar menjadi bahan penilaian GKM. Arahkan kursor ke nomor untuk melihat nama butir.</p>`;
  const daftarHapus = D.terhapus.length ? `<div class="tbl-wrap"><table><thead><tr><th>Kegiatan</th><th>Pengaju</th><th>Dihapus</th><th>Alasan</th><th></th></tr></thead><tbody>
    ${D.terhapus.map(k => `<tr><td><b>${esc(k.judul)}</b><div class="small muted">${esc(k.jenisLabel)} · ${esc(k.tgl || "–")} · status terakhir ${esc(D.status[k.status] || k.status)}</div></td><td class="small">${esc(k.olehNama)}</td>
     <td class="small">${tgl(k.waktuHapus)}${k.dihapusOleh ? `<div class="muted">oleh ${esc(k.dihapusOleh)}</div>` : ""}</td><td class="small">${esc(k.alasan)}</td><td><button class="btn sm" data-act="sdPulihkan" data-id="${k.id}">Pulihkan</button></td></tr>`).join("")}</tbody></table></div>`
    : `<div class="empty">Belum ada kegiatan yang dihapus.</div>`;
  return `<div class="head"><div><h1>Data Terkumpul</h1><p>Semua data yang masuk ke aplikasi dan dipakai untuk Tabel iLKPS dan Penilaian. Periksa asal setiap data, lalu terima, minta revisi, tolak, atau hapus (misalnya data uji coba yang terselip). Hanya Super Admin.</p></div>
    <button class="btn" data-act="sdMuatUlang">Muat ulang</button></div>
   <section class="panel"><h2>Data selain kegiatan</h2><p class="small muted" style="margin-bottom:8px">Diisi lewat menu masing-masing; periksa dan perbaiki di sana.</p>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px">${D.ringkas.map(r => `<button class="btn" data-go="${r.menu}" style="display:block;text-align:left;height:auto;padding:10px 12px;white-space:normal"><span class="row" style="justify-content:space-between"><span>${esc(r.judul)}</span><b class="num">${r.jumlah}</b></span><span class="small muted">${esc(MENU_L[r.menu] || "")}</span></button>`).join("")}</div></section>
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
    unduhBlob(UPW_ZIP.xlsx([{ nama: "Data Terkumpul", baris: [["Judul", "Jenis", "Tabel/DED", "Tanggal", "TA", "Pengaju", "NIM/NIP", "Status", "Diverifikasi oleh", "Butir dihitung", "Butir bahan GKM"]]
      .concat(D.kegiatan.map(k => [k.judul, k.jenisLabel, k.tabel, k.tgl, k.ta ? k.ta + "/" + (k.ta + 1) : "", k.olehNama, k.olehUser, k.statusLabel, k.verifNama,
        k.butir.filter(b => b.cara === "dihitung").map(b => b.n + ". " + nmB(b.n)).join("; "), k.butir.filter(b => b.cara !== "dihitung").map(b => b.n + ". " + nmB(b.n)).join("; ")])) },
      { nama: "Terhapus", baris: [["Judul", "Jenis", "Tanggal", "Pengaju", "Dihapus", "Oleh", "Alasan"]].concat(D.terhapus.map(k => [k.judul, k.jenisLabel, k.tgl, k.olehNama, k.waktuHapus.slice(0, 10), k.dihapusOleh, k.alasan])) }]),
      "Data Terkumpul " + hariIniLokal() + ".xlsx");
  },
  async fotoHapus() {
    if (!confirm("Hapus foto profil?")) return;
    jalankan(async () => { await api("foto.hapus"); S.fotoSaya = { foto: "", kecil: "" }; ls.set("foto:" + S.pengguna.id, null); S.dirFoto = null; toast("Foto profil dihapus."); });
  }
});

/* Aksi kembali/maju dan Unduhan (v0.25.2); didaftarkan di sini karena AKSI baru ada setelah bagian bilah atas. */
Object.assign(AKSI, {
  cobaMuat() { S.gagalMuat = null; render(); },
  navKembali() { if (navI > 0) history.back(); },
  navMaju() { if (navI < navMax) history.forward(); },
});

/* --- Kesiapan akreditasi di Beranda dan Laporan GKM (v0.25.0) --- */
const PERAN_KESIAPAN = ["kps", "admin", "superadmin", "gkm"];
const CHIP_LAP = { belum: "s-draf", draf: "s-draf", dikirim: "s-diajukan", revisi: "s-revisi", diterima: "s-disetujui" };
const chipLap = r => `<span class="chip ${CHIP_LAP[r.status] || "s-draf"}">${esc(r.statusLabel)}</span>`;
const tombolSaran = l => l.map(x => menu().includes(x.menu) ? `<button class="btn sm" data-go="${x.menu}">${esc(x.teks)}</button>` : `<span class="tag">${esc(x.teks)}</span>`).join(" ");
function panelKesiapan() {
  if (!PERAN_KESIAPAN.includes(peranAktif())) return "";
  const K2 = S.kesiapan;
  if (!K2) { sekali("kesiapan", async () => { S.kesiapan = await api("kesiapan.data"); render(); }); return `<section class="panel"><h2>Kesiapan akreditasi</h2><div class="memuat">Menghitung kesiapan…</div></section>`; }
  const p = K2.total / 400, cap = K2.total >= K2.target;
  const butirItem = r => `<div class="item"><div class="body"><div class="title" style="font-size:.92rem">${r.n}. ${esc(r.nm)} <span class="tag">${{ a: "otomatis", m: "dinilai GKM", c: "gabungan" }[r.t]}</span></div>
     <div class="meta"><span class="num">Skor ${angkaId2(r.skor)}</span><span>${esc(r.info)}</span></div>
     <div class="small" style="margin-top:4px"><b>Agar skor 4:</b> ${esc(r.s4)}</div><div class="small" style="margin-top:2px;color:var(--brand)"><b>Saran:</b> ${esc(r.sr)}</div>
     ${r.saran.length ? `<div class="row" style="gap:4px;flex-wrap:wrap;margin-top:6px">${tombolSaran(r.saran)}</div>` : ""}</div>
     ${r.gain > 0.05 ? `<div style="text-align:right"><div class="num" style="font-weight:800;color:var(--warn)">+${angkaId2(r.gain)}</div><div class="small muted">poin</div></div>` : ""}</div>`;
  return `<section class="panel"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><h2>Kesiapan akreditasi · TS ${esc(K2.ts.label)}</h2>
     <div class="row" style="gap:6px"><button class="btn sm" data-act="kesiapanUlang">Hitung ulang</button>${menu().includes("penilaian") ? `<button class="btn sm primary" data-go="penilaian">Buka Penilaian</button>` : ""}</div></div>
    <div class="row" style="align-items:baseline;gap:6px;margin-top:6px"><span class="num" style="font-size:2rem;font-weight:800">${angkaId2(K2.total, 1)}</span><span class="muted">/ 400 · target ${angkaId2(K2.target, 1)} · ${cap ? `<b style="color:var(--ok)">tercapai</b>` : `kurang <b class="num" style="color:var(--warn)">${angkaId2(K2.target - K2.total, 1)}</b> poin`}</span></div>
    <div class="bar" style="margin:6px 0 10px"><i style="width:${(p * 100).toFixed(1)}%"></i></div>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px">
     <button class="btn" data-act="kesiapanSaring" data-f="gpm" style="display:block;text-align:left;height:auto;padding:10px 12px;white-space:normal"><b class="num" style="font-size:1.3rem">${K2.belumGkm}</b><span class="small muted" style="display:block">butir belum dinilai GKM</span></button>
     <button class="btn" data-act="kesiapanSaring" data-f="kurang" style="display:block;text-align:left;height:auto;padding:10px 12px;white-space:normal"><b class="num" style="font-size:1.3rem">${K2.kurangData}</b><span class="small muted" style="display:block">butir otomatis datanya belum ada</span></button>
     <button class="btn" data-go="ilkps" style="display:block;text-align:left;height:auto;padding:10px 12px;white-space:normal"><b class="num" style="font-size:1.3rem">${K2.tabelKosong.length}</b><span class="small muted" style="display:block">Tabel iLKPS masih kosong</span></button>
     <button class="btn" data-go="bank" style="display:block;text-align:left;height:auto;padding:10px 12px;white-space:normal"><b class="num" style="font-size:1.3rem">${K2.bankKosong}</b><span class="small muted" style="display:block">dari ${K2.bankTotal} dokumen Bank Dokumen belum ada</span></button></div>
    <div class="small" style="margin-top:10px"><b>Kriteria terlemah:</b> ${K2.kriteria.map(k => `${esc(k.l)} <span class="num">${k.persen}%</span>`).join(" · ")}</div>
    <div class="small" style="margin-top:4px"><b>Laporan GKM:</b> ${K2.laporanGkm.map(r => `${esc(r.label)} ${chipLap(r)}${r.terlambat ? ' <b style="color:var(--bad)">terlambat</b>' : ""}`).join(" · ")} ${menu().includes("gkm") ? `<button class="btn sm" data-go="gkm">Buka Laporan GKM</button>` : ""}</div>
    <h3 style="font-size:1rem;margin-top:14px">5 prioritas perbaikan dan saran tindakannya</h3>
    <div class="list">${K2.prioritas.map(butirItem).join("") || `<div class="empty">Semua butir sudah skor 4.</div>`}</div>
    ${K2.kurang.length ? `<details style="margin-top:10px"><summary style="cursor:pointer;color:var(--brand)"><b>Data yang belum ada (${K2.kurang.length} butir)</b> dan kegiatan/data yang perlu dikumpulkan</summary><div class="list" style="margin-top:6px">${K2.kurang.map(butirItem).join("")}</div></details>` : ""}
    ${K2.tabelKosong.length ? `<details style="margin-top:6px"><summary style="cursor:pointer;color:var(--brand)"><b>Tabel iLKPS yang masih kosong (${K2.tabelKosong.length})</b></summary><ul class="small" style="margin:6px 0 0 18px">${K2.tabelKosong.map(t => `<li>${esc(t.judul)}</li>`).join("")}</ul></details>` : ""}
    ${K2.belum.length ? `<details style="margin-top:6px"><summary style="cursor:pointer;color:var(--brand)"><b>Butir rubrik belum dinilai GKM (${K2.belumGkm})</b>, bobot terbesar lebih dulu</summary><ul class="small gulir" style="margin:6px 0 0 18px">${K2.belum.map(b => `<li>${b.n}. ${esc(b.nm)}</li>`).join("")}</ul></details>` : ""}
   </section>`;
}
/** Baris pengingat GKM/KPS untuk panel "Perlu tindakan". */
function barisTugasGkm(t) {
  const l = [];
  if (t.gkm && peranAktif() === "gkm") {
    if (t.gkm.belumNilai) l.push(`<div class="item" style="cursor:pointer" data-act="kesiapanSaring" data-f="gpm"><div class="body"><div class="title">${t.gkm.belumNilai} butir rubrik belum dinilai GKM</div><div class="meta"><span>TS ${esc(t.gkm.ts)} · nilai dengan rubrik Matriks di menu Penilaian</span></div></div><span class="chip s-revisi">Penilaian</span></div>`);
    t.gkm.laporan.forEach(r => l.push(`<div class="item" style="cursor:pointer" data-act="gkmBuka" data-s="${r.semester}"><div class="body"><div class="title">${r.status === "revisi" ? "Perbaiki" : "Susun dan kirim"} Laporan GKM ${esc(r.label)}</div><div class="meta"><span>Batas ${tglPendek(r.batas)}${r.terlambat ? " · terlambat" : ""}</span></div></div><span class="chip ${r.terlambat ? "s-ditolak" : "s-revisi"}">${esc(r.statusLabel)}</span></div>`));
  }
  if (t.gkmTunggu && ["kps", "superadmin"].includes(peranAktif())) t.gkmTunggu.forEach(r => l.push(`<div class="item" style="cursor:pointer" data-act="gkmBuka" data-s="${r.semester}"><div class="body"><div class="title">Laporan GKM ${esc(r.label)} menunggu keputusan Anda</div></div><span class="chip s-diajukan">Laporan GKM</span></div>`));
  return l;
}
function hGkm() {
  const D = S.gkm;
  if (!D) { sekali("gkm", async () => { S.gkm = await api("gkm.data", S.gkmSmt ? { semester: S.gkmSmt } : {}); S.gkmIsi = Object.assign({}, S.gkm.laporan.bagian); render(); }); return `<div class="memuat">Memuat laporan GKM…</div>`; }
  const L = D.laporan, isi = S.gkmIsi || {}, dis = S.sibuk ? "disabled" : "";
  return `<div class="head"><div><h1>Laporan GKM</h1><p>Laporan Gugus Kendali Mutu Program Studi per semester: hasil monev pembelajaran, capaian, temuan, rekomendasi, dan tindak lanjut (siklus PPEPP). Disusun anggota GKM, dikirim ke KPS. Laporan yang diterima menjadi bukti butir Matriks 1, 2, 4, 23, dan 77.</p><div style="margin-top:6px">${iTombol("b1,b2,b4,b23,b77")}</div></div>
     <button class="btn" data-act="gkmWord" ${dis}>Unduh Word</button></div>
   <section class="panel"><h2>Semester</h2><div class="tbl-wrap"><table><thead><tr><th>Semester</th><th>Status</th><th>Batas</th><th></th></tr></thead><tbody>
    ${D.daftar.map(r => `<tr ${r.semester === L.semester ? 'style="background:var(--soft,rgba(10,81,136,.08))"' : ""}><td>${esc(r.label)}${r.semester === D.semesterKini ? ' <span class="tag">berjalan</span>' : ""}</td><td>${chipLap(r)}${r.terlambat ? ' <b class="small" style="color:var(--bad)">terlambat</b>' : ""}</td><td class="small">${tglPendek(r.batas)}</td>
      <td><button class="btn sm" data-act="gkmBuka" data-s="${r.semester}" ${r.semester === L.semester ? "disabled" : ""}>${r.semester === L.semester ? "Dibuka" : "Buka"}</button></td></tr>`).join("")}</tbody></table></div></section>
   <section class="panel"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><h2>Laporan ${esc(L.label)}</h2><span>${chipLap(L)}</span></div>
    <p class="small muted">Batas pengumpulan ${tglPendek(L.batas)}${L.dikirimPada ? ` · dikirim ${tgl(L.dikirimPada)}` : ""}${L.putusPada ? ` · diputuskan ${tgl(L.putusPada)}` : ""}${L.diubah ? ` · terakhir diubah ${tgl(L.diubah)}` : ""}.</p>
    ${D.bolehBatas ? `<div class="row small" style="gap:6px;margin:6px 0;flex-wrap:wrap"><label for="gkmBatas">Ubah batas</label><input id="gkmBatas" type="date" value="${esc(L.batas)}" style="width:auto"><button class="btn sm" data-act="gkmBatasSimpan" ${dis}>Simpan batas</button></div>` : ""}
    ${L.status === "revisi" && L.catatan ? `<div class="callout"><b>Catatan KPS untuk perbaikan:</b> ${esc(L.catatan)}</div>` : ""}
    ${D.sebelumnya && D.sebelumnya.rekomendasi ? `<details class="small" style="margin:6px 0"><summary style="cursor:pointer;color:var(--brand)">Rekomendasi laporan ${esc(D.sebelumnya.label)} (untuk bagian tindak lanjut)</summary><p style="white-space:pre-wrap;margin-top:4px">${esc(D.sebelumnya.rekomendasi)}</p></details>` : ""}
    ${D.bagianDef.map(b => `<div class="field"><label for="gkmB_${b.k}">${esc(b.l)}</label>${D.bolehUbah
      ? `<textarea id="gkmB_${b.k}" data-gkmb="${b.k}" rows="5" placeholder="${esc(b.h)}">${esc(isi[b.k] || "")}</textarea><span class="hint">${esc(b.h)}</span>`
      : `<div class="small" style="white-space:pre-wrap;border:1px solid var(--line);border-radius:8px;padding:8px">${esc(L.bagian[b.k] || "–")}</div>`}
      ${b.k === "rekomendasi" ? `<div class="row small" style="gap:6px;margin-top:4px;flex-wrap:wrap"><button class="btn sm" data-act="tlDariGkm" data-s="${esc(L.semester)}">+ Jadikan poin tindak lanjut</button><span class="muted">Setiap rekomendasi sebaiknya menjadi satu poin dengan penanggung jawab dan tenggat, agar bisa dilacak sampai terverifikasi.</span></div>` : ""}</div>`).join("")}
    <h3 style="font-size:1rem;margin-top:8px">Lampiran (${L.lampiran.length})</h3>
    <div class="list">${L.lampiran.map(a => `<div class="item"><div class="body"><div class="title" style="font-size:.9rem">${esc(a.nama)}</div><div class="meta"><span>${ukuranBerkas(a.ukuran)}</span><span>${esc(a.oleh)}</span></div></div>
      <div class="row" style="gap:4px"><button class="btn sm" data-act="gkmLihat" data-id="${esc(a.fileId)}">Lihat</button>${D.bolehUbah ? `<button class="btn sm" data-act="gkmHapusLamp" data-id="${esc(a.fileId)}" style="color:var(--bad)">Hapus</button>` : ""}</div></div>`).join("") || `<div class="empty">Belum ada lampiran.</div>`}</div>
    ${D.bolehUbah ? `<p class="small muted" style="margin-top:6px">Contoh lampiran: instrumen dan rekap monev, notulen rapat tinjauan, daftar hadir, hasil survei. PDF, Word, Excel, PowerPoint, atau gambar; maksimal 10 MB per berkas.</p>
     <label class="btn" style="cursor:pointer;margin-top:4px">Tambah lampiran<input id="gkmBerkas" type="file" accept=".pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png" hidden ${dis}></label>
     ${galatHtml()}<div class="row" style="justify-content:flex-end;gap:6px;margin-top:10px;flex-wrap:wrap"><button class="btn" data-act="gkmSimpan" ${dis}>Simpan draf</button>${tombol("gkmKirim", L.status === "revisi" ? "Kirim ulang ke KPS" : "Kirim ke KPS")}</div>` : ""}
    ${!D.bolehUbah && peranAktif() === "gkm" && L.status === "dikirim" ? `<p class="small muted" style="margin-top:8px">Laporan sudah dikirim dan menunggu keputusan KPS.</p>` : ""}
    ${D.bolehPutus ? `<div class="field" style="margin-top:12px"><label for="gkmCatatan">Catatan KPS (wajib bila meminta revisi)</label><textarea id="gkmCatatan" rows="3"></textarea></div>
     ${galatHtml()}<div class="row" style="justify-content:flex-end;gap:6px"><button class="btn" data-act="gkmPutus" data-k="revisi" ${dis}>Minta revisi</button>${tombol("gkmPutus", "Terima laporan", "primary", 'data-k="diterima"')}</div>` : ""}
    ${L.riwayat.length ? `<details class="small" style="margin-top:10px"><summary style="cursor:pointer">Riwayat</summary><ul style="margin:6px 0 0 18px">${L.riwayat.map(r => `<li>${tgl(r.waktu)} · ${esc(r.oleh)} · ${esc({ buat: "membuat", kirim: "mengirim ke KPS", kirim_ulang: "mengirim ulang", diterima: "menerima", revisi: "meminta revisi" }[r.aksi] || r.aksi)}${r.catatan ? ": " + esc(r.catatan) : ""}</li>`).join("")}</ul></details>` : ""}
   </section>`;
}
const ukuranBerkas = n => n >= 1048576 ? (n / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
document.addEventListener("input", e => { const k = e.target.dataset && e.target.dataset.gkmb; if (k) { S.gkmIsi = S.gkmIsi || {}; S.gkmIsi[k] = e.target.value; } });
document.addEventListener("change", e => {
  if (e.target.id !== "gkmBerkas" || !e.target.files[0]) return;
  const f = e.target.files[0];
  jalankan(async () => {
    if (f.size > 10 * 1024 * 1024) throw new Error("Lampiran maksimal 10 MB.");
    await api("gkm.unggah", { semester: S.gkm.laporan.semester, nama: f.name, isi: await bacaBase64(f) });
    await muatUlangGkm(); toast("Lampiran ditambahkan.");
  });
});
async function muatUlangGkm() { const isi = S.gkmIsi; S.gkm = await api("gkm.data", { semester: S.gkm.laporan.semester }); S.gkmIsi = isi || Object.assign({}, S.gkm.laporan.bagian); S.tugas = null; S.kesiapan = null; }
Object.assign(AKSI, {
  kesiapanUlang() { S.kesiapan = null; render(); },
  kesiapanSaring(d) { S.nilaiF = d.f; S.nilai = null; S.view = "penilaian"; S.laci = null; render(); window.scrollTo(0, 0); },
  gkmBuka(d) { S.gkmSmt = d.s; S.gkm = null; S.gkmIsi = null; S.view = "gkm"; S.laci = null; S.galat = ""; render(); window.scrollTo(0, 0); },
  gkmSimpan() { jalankan(async () => { await api("gkm.simpan", { semester: S.gkm.laporan.semester, bagian: S.gkmIsi || {} }); await muatUlangGkm(); toast("Draf laporan disimpan."); }); },
  gkmKirim() {
    if (!confirm("Kirim laporan ke KPS? Setelah dikirim, laporan tidak bisa diubah kecuali KPS meminta revisi.")) return;
    jalankan(async () => { await api("gkm.simpan", { semester: S.gkm.laporan.semester, bagian: S.gkmIsi || {}, kirim: true }); await muatUlangGkm(); toast("Laporan dikirim ke KPS."); });
  },
  gkmPutus(d) {
    jalankan(async () => { await api("gkm.putuskan", { semester: S.gkm.laporan.semester, keputusan: d.k, catatan: nilai("gkmCatatan") }); await muatUlangGkm(); toast(d.k === "diterima" ? "Laporan diterima." : "Revisi diminta."); });
  },
  gkmBatasSimpan() { jalankan(async () => { await api("gkm.batas", { semester: S.gkm.laporan.semester, tanggal: nilai("gkmBatas") }); await muatUlangGkm(); toast("Batas disimpan."); }); },
  async gkmLihat(d) {
    const w = penampil();
    try {
      const j = await api("gkm.lampiran", { semester: S.gkm.laporan.semester, fileId: d.id }), bin = atob(j.isi), arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const blob = new Blob([arr], { type: j.mime }); if (w && /pdf|image/.test(j.mime)) w.tampil(URL.createObjectURL(blob), j.nama, j.mime); else { if (w) w.close(); simpanBerkas(blob, j.nama); }
    } catch (e) { if (w) w.close(); toast(e.message); }
  },
  gkmHapusLamp(d) {
    if (!confirm("Hapus lampiran ini?")) return;
    jalankan(async () => { await api("gkm.hapusLampiran", { semester: S.gkm.laporan.semester, fileId: d.id }); await muatUlangGkm(); toast("Lampiran dihapus."); });
  },
  async gkmWord() {
    let kop; try { kop = await kopWord(); } catch (e) { toast("Logo kop gagal dimuat: " + e.message); return; }
    const D = S.gkm, L = D.laporan, isi = D.bolehUbah ? (S.gkmIsi || {}) : L.bagian, d = UPW_DOCX.baru();
    d.p("LAPORAN GUGUS KENDALI MUTU PROGRAM STUDI", { b: 1, ukuran: 14, rata: "center", sesudah: 4 });
    d.p("Semester " + L.label, { b: 1, rata: "center", sesudah: 16 });
    d.tabel([["Status", L.statusLabel], ["Batas pengumpulan", L.batas], ["Dikirim", L.dikirimPada ? tgl(L.dikirimPada) : "–"], ["Diputuskan KPS", L.putusPada ? tgl(L.putusPada) : "–"]], { judul: false, ukuran: 10, lebar: [5, 9] });
    D.bagianDef.forEach((b, i) => {
      d.p((i + 1) + ". " + b.l, { b: 1, sebelum: 12, sesudah: 4, tetap: 1 });
      const par = String(isi[b.k] || "").split(/\n+/).map(s => s.trim()).filter(Boolean);
      if (!par.length) d.p("[Belum diisi]", { i: 1, warna: "C00000" });
      par.forEach(s => d.p(s, { rata: "justify" }));
    });
    d.p("Lampiran", { b: 1, sebelum: 12, sesudah: 4 });
    if (L.lampiran.length) L.lampiran.forEach((a, i) => d.p((i + 1) + ". " + a.nama)); else d.p("Tidak ada lampiran.", { i: 1 });
    unduh(d.blob({ judul: "Laporan GKM " + L.label, kaki: "Laporan GKM UPW – " + L.label, kop }), "Laporan GKM " + L.label.replace("/", "-") + ".docx");
  }
});

/* --- Daftar akun: saring, urut, rekap; status mahasiswa dengan alasan dan bukti (v0.27.0) --- */
const JENIS_AKUN_L = { mahasiswa: "Mahasiswa", dosen: "Dosen", tendik: "Tendik", asesor: "Asesor", lain: "Lainnya (Super Admin, dll.)" };
const jenisAkun = x => x.jenisBiodata === "mahasiswa" ? "mahasiswa" : !x.peran ? "lain" : x.peran.includes("dosen") ? "dosen" : x.peran.includes("tendik") ? "tendik" : x.peran.includes("asesor") ? "asesor" : "lain";
const CHIP_SMHS = { A: "s-disetujui", L: "s-diajukan", C: "s-revisi", N: "s-revisi" };
const chipSmhs = k => `<span class="chip ${CHIP_SMHS[k] || "s-ditolak"}">${esc(STATUS_MHS[k] || k || "–")}</span>`;
const PF_AWAL = () => ({ jenis: "", akun: "", angkatan: "", kelas: "", smhs: "", bio: "", urut: "nama", arah: 1 });
function saringAkun(l) {
  const f = S.pf = S.pf || PF_AWAL(), q = (S.cari || "").trim().toLowerCase();
  return l.filter(x => (!q || (x.username + " " + x.nama + " " + (x.email || "")).toLowerCase().includes(q))
    && (!f.jenis || jenisAkun(x) === f.jenis) && (!f.akun || x.status === f.akun)
    && (!f.angkatan || String(x.masuk || "") === f.angkatan) && (!f.kelas || (x.kelas || "") === f.kelas)
    && (!f.smhs || (x.statusMhs || "A") === f.smhs && x.jenisBiodata === "mahasiswa")
    && (!f.bio || (f.bio === "lengkap" ? x.biodataLengkap : x.jenisBiodata && !x.biodataLengkap)));
}
function urutAkun(l) {
  const f = S.pf, k = f.urut, a = f.arah;
  const nilaiU = x => k === "nim" ? String(x.username) : k === "kelas" ? (String(x.masuk || "9999") + (x.kelas || "")) : k === "smhs" ? (x.statusMhs || "") : k === "akun" ? x.status
    : k === "masuk" ? (x.masukTerakhir || "") : k === "jenis" ? jenisAkun(x) : String(x.nama || "").toLowerCase();
  return l.slice().sort((p, q) => (nilaiU(p) < nilaiU(q) ? -1 : nilaiU(p) > nilaiU(q) ? 1 : String(p.nama).localeCompare(String(q.nama))) * a);
}
const thUrut = (k, label) => { const f = S.pf; return `<th><button class="lnk" data-act="pUrut" data-k="${k}" style="font:inherit;color:inherit;text-transform:inherit;letter-spacing:inherit">${label}${f.urut === k ? (f.arah > 0 ? " ▲" : " ▼") : ""}</button></th>`; };
function rekapMhs() {
  const m = (S.daftar || []).filter(x => x.jenisBiodata === "mahasiswa"); if (!m.length) return "";
  const g = {}; m.forEach(x => { const k = (x.masuk || "?") + "|" + (x.kelas || "?"); const r = g[k] = g[k] || { masuk: x.masuk || "?", kelas: x.kelas || "?", n: 0, aktif: 0, impor: 0, bio: 0, st: {} }; r.n++; if (x.status === "aktif") r.aktif++; if (x.status === "impor") r.impor++; if (!x.biodataLengkap) r.bio++; const s = x.statusMhs || "A"; r.st[s] = (r.st[s] || 0) + 1; });
  const rows = Object.values(g).sort((a, b) => String(b.masuk).localeCompare(String(a.masuk)) || String(a.kelas).localeCompare(String(b.kelas)));
  const jml = k => rows.reduce((s, r) => s + r[k], 0);
  return `<details class="picker" style="margin-bottom:10px" ${S.rekapBuka ? "open" : ""}><summary style="cursor:pointer" data-act="rekapToggle"><b>Rekap mahasiswa per angkatan dan kelas</b> <span class="small muted">· ${m.length} mahasiswa · ${jml("impor")} belum aktivasi · ${jml("bio")} biodata belum lengkap</span></summary>
    <p class="small muted" style="margin:6px 0">Klik baris untuk menampilkan mahasiswa angkatan dan kelas itu di daftar akun.</p>
    <div class="tbl-wrap gulir"><table><thead><tr><th>Angkatan</th><th>Kelas</th><th>Jumlah</th><th>Sudah aktif</th><th>Belum aktivasi</th><th>Biodata belum lengkap</th><th>Status mahasiswa</th></tr></thead><tbody>
    ${rows.map(r => `<tr style="cursor:pointer" data-act="rekapPilih" data-masuk="${esc(r.masuk)}" data-kelas="${esc(r.kelas)}"><td class="num">${esc(r.masuk)}</td><td>${esc(r.kelas)}</td><td class="num">${r.n}</td><td class="num">${r.aktif}</td>
      <td class="num">${r.impor ? `<b style="color:var(--warn)">${r.impor}</b>` : 0}</td><td class="num">${r.bio}</td><td class="small">${Object.entries(r.st).map(([k, n]) => `${esc(STATUS_MHS[k] || k)} ${n}`).join(" · ")}</td></tr>`).join("")}</tbody></table></div></details>`;
}
function hDaftarAkun(sa) {
  const f = S.pf = S.pf || PF_AWAL(), pilih = S.pilihMhs = S.pilihMhs || {};
  const semua = S.daftar, l = urutAkun(saringAkun(semua));
  const opsi = (arr, nilai) => arr.map(([v, t]) => `<option value="${esc(v)}" ${nilai === String(v) ? "selected" : ""}>${esc(t)}</option>`).join("");
  const angk = [...new Set(semua.map(x => x.masuk).filter(Boolean))].sort().reverse(), kls = [...new Set(semua.map(x => x.kelas).filter(Boolean))].sort();
  const nPilih = Object.keys(pilih).filter(i => pilih[i]).length, mhsTampil = l.filter(x => x.jenisBiodata === "mahasiswa");
  const semuaDipilih = mhsTampil.length && mhsTampil.every(x => pilih[x.id]);
  const st = s => s === "aktif" ? '<span class="chip s-disetujui">Aktif</span>' : s === "impor" ? '<span class="chip s-draf">Belum aktivasi</span>' : '<span class="chip s-ditolak">Nonaktif</span>';
  const bio = x => !x.jenisBiodata ? '<span class="muted small">–</span>' : x.biodataLengkap ? '<span class="chip s-disetujui">Lengkap</span>' : '<span class="chip s-draf">Belum</span>';
  const adaSaring = Object.entries(f).some(([k, v]) => !["urut", "arah"].includes(k) && v) || (S.cari || "").trim();
  return `<section class="panel"><div class="row" style="justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px"><h2>Daftar akun (${l.length}${l.length !== semua.length ? " dari " + semua.length : ""})</h2>
     <div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn sm" data-act="pXlsx">Unduh hasil saringan (Excel)</button><button class="btn sm" data-act="muatUlang">Muat ulang</button></div></div>
    ${rekapMhs()}
    <div class="filters" style="flex-wrap:wrap"><input id="cariP" type="search" placeholder="Cari NIM/NIP, nama, email" value="${esc(S.cari)}" style="width:220px">
     ${sa ? `<select id="pfJenis" aria-label="Jenis akun" style="width:auto"><option value="">Semua jenis</option>${opsi(Object.entries(JENIS_AKUN_L), f.jenis)}</select>` : ""}
     <select id="pfAkun" aria-label="Status akun" style="width:auto"><option value="">Semua status akun</option>${opsi([["aktif", "Sudah aktif"], ["impor", "Belum aktivasi"], ["nonaktif", "Nonaktif"]], f.akun)}</select>
     <select id="pfAngkatan" aria-label="Angkatan" style="width:auto"><option value="">Semua angkatan</option>${opsi(angk.map(a => [a, "Angkatan " + a]), f.angkatan)}</select>
     <select id="pfKelas" aria-label="Kelas" style="width:auto"><option value="">Semua kelas</option>${opsi(kls.map(k => [k, "Kelas " + k]), f.kelas)}</select>
     <select id="pfSmhs" aria-label="Status mahasiswa" style="width:auto"><option value="">Semua status mahasiswa</option>${opsi(Object.entries(STATUS_MHS), f.smhs)}</select>
     <select id="pfBio" aria-label="Biodata" style="width:auto"><option value="">Biodata: semua</option>${opsi([["lengkap", "Biodata lengkap"], ["belum", "Biodata belum lengkap"]], f.bio)}</select>
     ${adaSaring ? `<button class="btn sm" data-act="pReset">Hapus saringan</button>` : ""}</div>
    ${nPilih ? `<div class="auto row" style="justify-content:space-between;flex-wrap:wrap;gap:6px;margin-top:8px"><span><b>${nPilih}</b> mahasiswa dipilih</span><span class="row" style="gap:6px"><button class="btn sm primary" data-act="smhsBuka" data-banyak="1">Ubah status ${nPilih} mahasiswa</button><button class="btn sm" data-act="pBatalPilih">Batal pilih</button></span></div>` : ""}
    <div class="tbl-wrap gulir tinggi" style="margin-top:8px"><table><thead><tr><th>${mhsTampil.length ? `<input type="checkbox" id="pPilihSemua" aria-label="Pilih semua mahasiswa yang tampil" ${semuaDipilih ? "checked" : ""}>` : ""}</th>
      ${thUrut("nim", "NIM/NIP")}${thUrut("nama", "Nama")}${sa ? thUrut("jenis", "Jenis · peran") : ""}${thUrut("kelas", "Angkatan · kelas")}${thUrut("smhs", "Status mahasiswa")}${thUrut("akun", "Status akun")}<th>Biodata</th><th>Email</th>${thUrut("masuk", "Masuk terakhir")}<th></th></tr></thead><tbody>
    ${l.map(x => { const mhs = x.jenisBiodata === "mahasiswa";
      return `<tr><td>${mhs ? `<input type="checkbox" data-pilihmhs="${x.id}" aria-label="Pilih ${esc(x.nama)}" ${pilih[x.id] ? "checked" : ""}>` : ""}</td><td class="mono">${esc(x.username)}</td><td>${esc(x.nama)}</td>
       ${sa ? `<td class="small">${esc(JENIS_AKUN_L[jenisAkun(x)])}<div>${(x.peran || []).map(r => `<span class="tag t">${PERAN_L[r]}</span>`).join(" ")}</div></td>` : ""}
       <td class="small">${mhs ? `${esc(x.masuk || "–")} · Kelas ${esc(x.kelas || "–")}${x.statusMhs === "A" && x.semesterMhs ? `<div class="muted">Semester ${x.semesterMhs}</div>` : ""}` : "–"}</td>
       <td>${mhs ? `${chipSmhs(x.statusMhs || "A")}<div><button class="btn sm" data-act="smhsBuka" data-id="${x.id}" style="margin-top:4px">Ubah status</button></div>` : '<span class="muted small">–</span>'}</td>
       <td>${st(x.status)}</td><td>${bio(x)}</td><td class="small">${esc(x.email || "–")}${x.emailTertunda ? '<div class="muted">belum terverifikasi</div>' : ""}</td><td class="small num">${tgl(x.masukTerakhir)}</td>
       <td><div class="row">${x.jenisBiodata ? `<button class="btn sm" data-act="lihatBio" data-id="${x.id}">Biodata</button>` : ""}${mhs ? `<button class="btn sm" data-act="laciMhs" data-id="${x.id}">Angkatan & kelas</button>` : ""}${sa ? `<button class="btn sm" data-act="laciPeran" data-id="${x.id}">Peran</button><button class="btn sm" data-act="resetSandi" data-id="${x.id}">Reset sandi</button>` : ""}${sa || mhs ? `<button class="btn sm" data-act="akunKelola" data-id="${x.id}">${sa ? "Ubah nama / hapus" : "Ubah nama"}</button>` : ""}</div></td></tr>`; }).join("") || `<tr><td colspan="11" class="empty">Tidak ada akun yang cocok dengan saringan.</td></tr>`}
    </tbody></table></div></section>`;
}
/* v0.37.0: perbaiki (edit) satu baris riwayat status mahasiswa; alasan perbaikan wajib; tercatat di Log dan di riwayat koreksi. */
const LABEL_UBAH_SM = { tanggal: "tanggal", alasan: "alasan", bukti: "bukti", ke: "status" };
function laciStatusMhsEdit() {
  const L = S.laci, r = L.r, m = S.daftar.find(x => x.id === L.userId) || {};
  const pilih = (v, l) => `<button data-act="smeMode" data-m="${v}" aria-pressed="${L.mode === v}">${l}</button>`;
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Perbaiki riwayat status" style="width:min(620px,100%)">
   <div class="dh"><h2>Perbaiki riwayat status</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   <p><b>${esc(m.nama || "")}</b> · <span class="mono">${esc(m.username || "")}</span><br>Perubahan ${esc(STATUS_MHS[r.dari] || r.dari)} → <b>${esc(STATUS_MHS[r.ke] || r.ke)}</b>, dicatat ${esc(r.oleh)} ${tgl(r.waktu)}</p>
   <div class="callout small">Perbaikan dicatat di Log beserta nilai sebelumnya dan alasan perbaikan. File bukti lama yang diganti dipindah ke Sampah Google Drive (bisa dipulihkan Super Admin sekitar 30 hari).</div>
   <div class="grid g2" style="gap:10px"><div class="field"><label for="smeKe">Status tujuan</label>${r.terakhir ? `<select id="smeKe" data-sme="ke">${Object.entries(STATUS_MHS).filter(([k]) => k !== r.dari).map(([k, t]) => `<option value="${k}" ${L.ke === k ? "selected" : ""}>${k} · ${esc(t)}</option>`).join("")}</select><span class="hint">Mengubah status ini juga mengubah status mahasiswa saat ini.</span>`
      : `<input id="smeKe" type="text" value="${esc(STATUS_MHS[r.ke] || r.ke)}" disabled><span class="hint">Status tujuan hanya bisa diperbaiki pada perubahan terakhir.</span>`}</div>
    <div class="field"><label for="smeTgl">Tanggal efektif</label><input id="smeTgl" data-sme="tanggal" type="date" value="${esc(L.tanggal)}"></div></div>
   <div class="field"><label for="smeAlasan">Alasan perubahan status</label><textarea id="smeAlasan" data-sme="alasan" rows="2">${esc(L.alasan)}</textarea></div>
   <div class="field"><label>Bukti</label><div class="small" style="margin-bottom:4px">Sekarang: ${r.bukti ? (r.bukti.t === "tautan" ? `<a href="${esc(r.bukti.url)}" target="_blank" rel="noopener noreferrer">tautan</a>` : `<button class="lnk" data-act="smBukti" data-id="${r.id}">${esc(r.bukti.nama)}</button>`) : "tanpa bukti"}</div>
    <div class="seg" role="group">${pilih("tetap", "Tetap")}${pilih("file", "Ganti file")}${pilih("tautan", "Ganti tautan")}${r.bukti ? pilih("hapus", "Hapus bukti") : ""}</div>
    ${L.mode === "file" ? `<input id="smeBerkas" type="file" accept=".pdf,.jpg,.jpeg,.png" style="margin-top:6px"><span class="hint">${L.berkas ? "Terpilih: " + esc(L.berkas.nama) + " · " : ""}PDF atau gambar, maks. 10 MB.</span>` : ""}
    ${L.mode === "tautan" ? `<input id="smeTautan" data-sme="tautan" type="url" value="${esc(L.tautan)}" placeholder="https://drive.google.com/…" style="margin-top:6px">` : ""}</div>
   ${r.sebatch > 1 ? `<label class="row small" style="gap:8px;align-items:flex-start"><input type="checkbox" id="smeBatch" ${L.semuaBatch ? "checked" : ""} style="width:auto;margin-top:3px"><span>Terapkan perbaikan bukti, tanggal, dan alasan juga ke <b>${r.sebatch - 1} mahasiswa lain</b> yang diubah bersamaan (perubahan yang sama). Status tujuan hanya untuk mahasiswa ini.</span></label>` : ""}
   <div class="field"><label for="smeKoreksi">Alasan perbaikan${wajib}</label><textarea id="smeKoreksi" data-sme="alasanKoreksi" rows="2" placeholder="Contoh: Salah unggah SK; diganti SK Direktur No. 123/2026">${esc(L.alasanKoreksi)}</textarea></div>
   ${(r.koreksi || []).length ? `<details class="small"><summary>Riwayat perbaikan (${r.koreksi.length})</summary><ul style="margin:4px 0 0 18px">${r.koreksi.map(k => `<li>${tgl(k.waktu)} · ${esc(k.oleh)} · ${esc((k.ubah || []).map(x => LABEL_UBAH_SM[x] || x).join(", "))}: ${esc(k.alasan)}</li>`).join("")}</ul></details>` : ""}
   ${galatHtml()}<div class="row" style="justify-content:space-between;margin-top:auto"><button class="btn" data-act="smeKembali" ${S.sibuk ? "disabled" : ""}>Kembali</button>${tombol("smeSimpan", "Simpan perbaikan")}</div></div></div>`;
}
document.addEventListener("input", e => { const k = e.target.dataset && e.target.dataset.sme; if (k && S.laci && S.laci.jenis === "statusMhsEdit") S.laci[k] = e.target.value; });
document.addEventListener("change", e => {
  if (!S.laci || S.laci.jenis !== "statusMhsEdit") return;
  const t = e.target;
  if (t.dataset && t.dataset.sme) S.laci[t.dataset.sme] = t.value;
  if (t.id === "smeBatch") S.laci.semuaBatch = t.checked;
  if (t.id === "smeBerkas" && t.files[0]) {
    const f = t.files[0]; if (f.size > 10 * 1024 * 1024) { toast("Bukti maksimal 10 MB."); return; }
    bacaBase64(f).then(isi => { S.laci.berkas = { nama: f.name, isi }; render(); }, err => toast(err.message));
  }
});
Object.assign(AKSI, {
  smEdit(d) {
    const L = S.laci, r = (L.riwayat || []).find(x => x.id === d.id); if (!r) return;
    S.laci = { jenis: "statusMhsEdit", r, userId: L.ids[0], ke: r.ke, tanggal: r.tanggal, alasan: r.alasan, mode: "tetap", berkas: null, tautan: "", alasanKoreksi: "", semuaBatch: r.sebatch > 1 };
    S.galat = ""; render(); fokus("smeKoreksi");
  },
  smeMode(d) { S.laci.mode = d.m; render(); },
  smeKembali() { AKSI.smhsBuka({ id: S.laci.userId }); },
  smeSimpan() {
    const L = S.laci;
    if ((L.alasanKoreksi || "").trim().length < 5) { S.galat = "Tulis alasan perbaikan (minimal 5 huruf)."; render(); fokus("smeKoreksi"); return; }
    if (L.mode === "file" && !L.berkas) { S.galat = "Pilih file bukti pengganti."; render(); return; }
    if (L.mode === "hapus" && !confirm("Hapus bukti dari riwayat ini? File lama dipindah ke Sampah Google Drive.")) return;
    jalankan(async () => {
      const data = { id: L.r.id, tanggal: L.tanggal, alasan: L.alasan, ke: L.r.terakhir ? L.ke : "", buktiMode: L.mode, alasanKoreksi: L.alasanKoreksi, semuaBatch: !!L.semuaBatch };
      if (L.mode === "file") data.berkas = { nama: L.berkas.nama, isi: L.berkas.isi };
      if (L.mode === "tautan") data.tautan = L.tautan;
      const j = await api("admin.statusMhsKoreksi", data);
      const m = S.daftar.find(x => x.id === L.userId); if (m && L.r.terakhir && L.ke) m.statusMhs = L.ke;
      toast(`Perbaikan tersimpan untuk ${j.diperbaiki} riwayat${j.fileDibuang ? "; file bukti lama dipindah ke Sampah Drive" : ""}.`);
      AKSI.smhsBuka({ id: L.userId }); S.dir = null;
    });
  }
});
function laciStatusMhs() {
  const L = S.laci, org = L.ids.map(i => S.daftar.find(x => x.id === i)).filter(Boolean), satu = org.length === 1 ? org[0] : null, dis = S.sibuk ? "disabled" : "";
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Ubah status mahasiswa" style="width:min(620px,100%)">
   <div class="dh"><h2>Ubah status mahasiswa</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   ${satu ? `<p><b>${esc(satu.nama)}</b> · <span class="mono">${esc(satu.username)}</span> · angkatan ${esc(satu.masuk || "–")} kelas ${esc(satu.kelas || "–")}<br>Status sekarang: ${chipSmhs(satu.statusMhs || "A")}</p>`
     : `<p><b>${org.length} mahasiswa</b> dipilih${org.length <= 8 ? ": " + org.map(x => esc(x.nama)).join(", ") : ""}. Mahasiswa yang statusnya sudah sama dilewati.</p>`}
   <div class="grid g2" style="gap:10px"><div class="field"><label for="smKe">Status baru</label><select id="smKe" data-smhs="ke">${Object.entries(STATUS_MHS).map(([k, t]) => `<option value="${k}" ${L.ke === k ? "selected" : ""}>${k} · ${esc(t)}</option>`).join("")}</select></div>
    <div class="field"><label for="smTgl">Tanggal efektif</label><input id="smTgl" data-smhs="tanggal" type="date" value="${esc(L.tanggal)}"></div></div>
   <div class="field"><label for="smAlasan">Alasan (wajib)</label><textarea id="smAlasan" data-smhs="alasan" rows="3" placeholder="Contoh: Lulus yudisium 20 Agustus 2026, SK Direktur No. …">${esc(L.alasan)}</textarea></div>
   <div class="field"><label>Bukti pendukung (opsional, sangat disarankan)</label>
    <div class="seg" role="group"><button data-act="smMode" data-m="file" aria-pressed="${L.mode === "file"}">Unggah file</button><button data-act="smMode" data-m="tautan" aria-pressed="${L.mode === "tautan"}">Tautan</button><button data-act="smMode" data-m="" aria-pressed="${!L.mode}">Tanpa bukti</button></div>
    ${L.mode === "file" ? `<input id="smBerkas" type="file" accept=".pdf,.jpg,.jpeg,.png" style="margin-top:6px"><span class="hint">${L.berkas ? "Terpilih: " + esc(L.berkas.nama) + " · " : ""}PDF atau gambar, maks. 10 MB (mis. SK yudisium, surat cuti, surat pengunduran diri).</span>` : ""}
    ${L.mode === "tautan" ? `<input id="smTautan" data-smhs="tautan" type="url" value="${esc(L.tautan)}" placeholder="https://drive.google.com/…" style="margin-top:6px">` : ""}</div>
   ${satu ? `<h3 style="font-size:1rem;margin-top:6px">Riwayat status</h3>${L.riwayat ? (L.riwayat.length ? `<ul class="small gulir" style="margin:4px 0 0 18px">${L.riwayat.map(r => `<li>${esc(r.tanggal)}: ${esc(STATUS_MHS[r.dari] || r.dari)} → <b>${esc(STATUS_MHS[r.ke] || r.ke)}</b> · ${esc(r.alasan)} <span class="muted">(${esc(r.oleh)}, ${tgl(r.waktu)})</span>
      ${r.bukti ? (r.bukti.t === "tautan" ? ` · <a href="${esc(r.bukti.url)}" target="_blank" rel="noopener noreferrer">bukti</a>` : ` · <button class="lnk" data-act="smBukti" data-id="${r.id}">${esc(r.bukti.nama)}</button>`) : ' · <span class="muted">tanpa bukti</span>'}
      · <button class="btn sm" data-act="smEdit" data-id="${r.id}" ${S.sibuk ? "disabled" : ""}>Edit</button>
      ${(r.koreksi || []).length ? `<div class="muted" style="margin:2px 0 4px">Diperbaiki ${r.koreksi.length}×; terakhir oleh ${esc(r.koreksi.at(-1).oleh)} pada ${tgl(r.koreksi.at(-1).waktu)}: ${esc(r.koreksi.at(-1).alasan)}</div>` : ""}</li>`).join("")}</ul>` : `<p class="small muted">Belum ada perubahan status yang tercatat.</p>`) : `<p class="small muted">Memuat riwayat…</p>`}` : ""}
   ${galatHtml()}<div class="row" style="justify-content:flex-end;margin-top:auto">${tombol("smSimpan", satu ? "Simpan status" : `Simpan status ${org.length} mahasiswa`)}</div></div></div>`;
}
document.addEventListener("change", e => {
  const t = e.target, peta = { pfJenis: "jenis", pfAkun: "akun", pfAngkatan: "angkatan", pfKelas: "kelas", pfSmhs: "smhs", pfBio: "bio" };
  if (peta[t.id]) { S.pf[peta[t.id]] = t.value; render(); return; }
  if (t.dataset.pilihmhs) { S.pilihMhs[t.dataset.pilihmhs] = t.checked; render(); return; }
  if (t.id === "pPilihSemua") { urutAkun(saringAkun(S.daftar)).filter(x => x.jenisBiodata === "mahasiswa").forEach(x => { S.pilihMhs[x.id] = t.checked; }); render(); return; }
  if (t.id === "smBerkas" && t.files[0] && S.laci && S.laci.jenis === "statusMhs") {
    const f = t.files[0]; if (f.size > 10 * 1024 * 1024) { toast("Bukti maksimal 10 MB."); return; }
    bacaBase64(f).then(isi => { S.laci.berkas = { nama: f.name, isi }; render(); }, err => toast(err.message));
  }
});
document.addEventListener("input", e => { const k = e.target.dataset && e.target.dataset.smhs; if (k && S.laci && S.laci.jenis === "statusMhs") S.laci[k] = e.target.value; });
Object.assign(AKSI, {
  pUrut(d) { const f = S.pf; if (f.urut === d.k) f.arah = -f.arah; else { f.urut = d.k; f.arah = 1; } render(); },
  pReset() { S.pf = PF_AWAL(); S.cari = ""; render(); },
  pBatalPilih() { S.pilihMhs = {}; render(); },
  rekapToggle(d, e) { e.preventDefault(); S.rekapBuka = !S.rekapBuka; render(); },
  rekapPilih(d) { S.pf.angkatan = String(d.masuk === "?" ? "" : d.masuk); S.pf.kelas = d.kelas === "?" ? "" : d.kelas; S.pf.jenis = ""; render(); },
  smhsBuka(d) {
    const ids = d.banyak ? Object.keys(S.pilihMhs).filter(i => S.pilihMhs[i]) : [d.id];
    const satu = ids.length === 1 ? S.daftar.find(x => x.id === ids[0]) : null;
    S.laci = { jenis: "statusMhs", ids, ke: satu ? (satu.statusMhs === "A" ? "L" : "A") : "L", tanggal: hariIniLokal(), alasan: "", mode: "file", berkas: null, tautan: "", riwayat: satu ? null : [] };
    S.galat = ""; render();
    if (satu) api("admin.riwayatStatusMhs", { userId: satu.id }).then(j => { if (S.laci && S.laci.jenis === "statusMhs") { S.laci.riwayat = j.riwayat; render(); } }, err => toast(err.message));
  },
  smMode(d) { S.laci.mode = d.m; render(); },
  smSimpan() {
    const L = S.laci;
    jalankan(async () => {
      const data = { userIds: L.ids, statusMhs: L.ke, tanggal: L.tanggal, alasan: L.alasan };
      if (L.mode === "file" && L.berkas) data.berkas = { nama: L.berkas.nama, isi: L.berkas.isi };
      if (L.mode === "tautan" && L.tautan) data.tautan = L.tautan;
      const j = await api("admin.statusMhs", data);
      S.laci = null; S.daftar = null; S.dir = null; S.pilihMhs = {};
      toast(`Status ${j.diubah} mahasiswa diubah menjadi ${STATUS_MHS[L.ke]}${j.sama ? `; ${j.sama} dilewati karena statusnya sudah sama` : ""}.`);
    });
  },
  async smBukti(d) {
    const w = penampil();
    try { const j = await api("admin.buktiStatusMhs", { id: d.id }); const blob = new Blob([dariBase64(j.isi)], { type: j.mime }); if (w && /pdf|image/.test(j.mime)) w.tampil(URL.createObjectURL(blob), j.nama, j.mime); else { if (w) w.close(); simpanBerkas(blob, j.nama); } }
    catch (e) { if (w) w.close(); toast(e.message); }
  },
  pXlsx() {
    const l = urutAkun(saringAkun(S.daftar)), sa = peranAktif() === "superadmin";
    unduhBlob(UPW_ZIP.xlsx([{ nama: "Akun", teks: [0], baris: [["NIM/NIP", "Nama", "Jenis", "Angkatan", "Kelas", "Status mahasiswa", "Status akun", "Biodata", "Email", "Masuk terakhir"]]
      .concat(l.map(x => [String(x.username), x.nama, JENIS_AKUN_L[jenisAkun(x)] || "", x.masuk || "", x.kelas || "", x.jenisBiodata === "mahasiswa" ? STATUS_MHS[x.statusMhs || "A"] : "",
        x.status === "aktif" ? "Sudah aktif" : x.status === "impor" ? "Belum aktivasi" : "Nonaktif", !x.jenisBiodata ? "" : x.biodataLengkap ? "Lengkap" : "Belum", x.email || "", x.masukTerakhir ? tgl(x.masukTerakhir) : ""])) }]),
      "Daftar akun (saringan) " + hariIniLokal() + ".xlsx");
  }
});

/* --- Penilaian (v0.12.0) --- */
const CARA_L = { a: "Otomatis dari data", m: "Penilaian GKM (rubrik)", c: "Data + penilaian GKM" };
const warnaSkor = s => s >= 3.5 ? "var(--ok)" : s >= 2.5 ? "var(--brand)" : s >= 1.5 ? "var(--warn)" : "var(--bad)";
const angkaId2 = (x, d = 2) => Number(x).toLocaleString("id-ID", { maximumFractionDigits: d });
function hPenilaian() {
  if (!S.nilai) { sekali("nilai", async () => { S.nilai = await api("penilaian.data", S.nilaiTs ? { ts: S.nilaiTs } : {}); render(); }); return `<div class="memuat">Menghitung penilaian…</div>`; }
  const P = S.nilai, p = P.total / 400, f = S.nilaiF, dis = S.sibuk ? "disabled" : "";
  const th = new Date().getFullYear(), pil = []; for (let a = th; a >= 2018; a--) pil.push(a);
  const top = P.rows.filter(r => r.gain > 0.05).sort((a, b) => b.gain - a.gain).slice(0, 8);
  const rows = P.rows.filter(r => !f || (f === "rendah" ? r.skor < 3 : f === "gpm" ? r.perluGpm && r.gpm === null : f === "kurang" ? r.kurang : r.k === f));
  return `<div class="head"><div><h1>Penilaian</h1><p>Simulasi penilaian mandiri mengikuti Matriks Penilaian LAMWisata IAPS 1.0 Unggul Sarjana Terapan: 84 butir berbobot (total bobot 100), skor 0–4, nilai maksimum 400. Butir otomatis dihitung dari data aplikasi; butir lain dinilai GKM/Admin/KPS dengan rubrik.</p></div>
    <div class="row" style="flex-wrap:wrap"><label class="row small" style="gap:6px">TS <select id="nilaiTs" style="width:auto">${pil.map(a => `<option value="${a}" ${a === P.ts.awal ? "selected" : ""}>${a}/${a + 1}</option>`).join("")}</select></label><button class="btn" data-act="nilaiXlsx" ${dis}>Ekspor Excel</button></div></div>
   <div class="grid g3">
    <div class="panel stat"><span class="l">Nilai simulasi TS ${esc(P.ts.label)}</span><span class="v num" style="font-size:2.1rem">${angkaId2(P.total, 1)}<span class="muted" style="font-size:1rem"> / 400</span></span><div class="bar" style="margin-top:6px"><i style="width:${(p * 100).toFixed(1)}%"></i></div><span class="l num">${angkaId2(p * 100, 1)}% dari nilai maksimum</span></div>
    <div class="panel stat"><span class="l">Target</span><span class="v num">${angkaId2(P.target, 1)}</span><span class="l">${P.total >= P.target ? `<b style="color:var(--ok)">Sudah mencapai target</b>` : `Kurang <b class="num" style="color:var(--warn)">${angkaId2(P.target - P.total, 1)}</b> poin`}</span>
     ${P.bolehTarget ? `<div class="row small" style="margin-top:6px;flex-wrap:nowrap"><input id="nilaiTarget" type="text" inputmode="decimal" value="${String(P.target).replace(".", ",")}" style="width:80px" aria-label="Target nilai"><button class="btn sm" data-act="nilaiTargetSimpan" ${dis}>Ubah target</button></div>` : ""}</div>
    <div class="panel stat"><span class="l">Kelengkapan</span><span class="small"><b>${P.belumGpm}</b> butir belum dinilai GKM · <b>${P.kurangData}</b> butir otomatis datanya belum lengkap</span>
     <span class="small muted">${P.rows.filter(r => r.t === "a").length} otomatis · ${P.rows.filter(r => r.t === "c").length} gabungan · ${P.rows.filter(r => r.t === "m").length} GKM · NDTPS ${P.ringkas.NDTPS} · mahasiswa aktif ${P.ringkas.NM}</span></div></div>
   <div class="callout">Perkiraan internal, bukan nilai resmi asesor. Butir yang belum dinilai atau datanya belum lengkap dihitung 0, jadi nilai akan naik setelah data dilengkapi. Ambang peringkat Unggul tidak tercantum di DED/Matriks; target mengacu PerBAN-PT 17/2025 dan bisa diubah Admin. Beberapa rumus memakai tafsiran yang ditulis pada keterangan butir.</div>
   <section class="panel"><h2>Capaian per kriteria</h2><div class="list">${P.kriteria.map(k => { const q = k.maks ? k.nilai / k.maks : 0; return `<div class="item"><div class="body"><div class="row" style="justify-content:space-between"><b>${esc(k.l)}</b><span class="num small">${angkaId2(k.nilai, 1)} / ${angkaId2(k.maks, 1)} · <b>${angkaId2(q * 100, 0)}%</b></span></div><div class="bar ${q < 0.75 ? "gold" : ""}" style="margin-top:6px"><i style="width:${(q * 100).toFixed(1)}%"></i></div><div class="small muted" style="margin-top:2px">Bobot ${angkaId2(k.bobot, 3)}</div></div></div>`; }).join("")}</div></section>
   <section class="panel"><h2>Prioritas perbaikan</h2><p class="small muted" style="margin-bottom:8px">Diurutkan dari potensi kenaikan nilai terbesar: bobot × (4 − skor saat ini).</p>
    <div class="list">${top.map(r => `<div class="item" style="cursor:pointer" data-act="gpmBuka" data-n="${r.n}"><div class="body"><div class="title">${r.n}. ${esc(r.nm)} ${iBtn("b" + r.n, r.nm)} <span class="tag">${esc(P.kriteria.find(k => k.k === r.k).l)}</span></div><div class="meta"><span class="num">Skor ${angkaId2(r.skor)}</span><span class="num">Bobot ${angkaId2(r.w, 3)}</span><span>${esc(r.info)}</span></div><div class="small" style="margin-top:6px"><b>Agar skor 4:</b> ${esc(r.s4)}</div><div class="small" style="margin-top:4px;color:var(--brand)"><b>Saran:</b> ${esc(r.sr)}</div></div><div style="text-align:right"><div class="num" style="font-weight:800;color:var(--warn)">+${angkaId2(r.gain)}</div><div class="small muted">poin</div></div></div>`).join("") || `<div class="empty">Semua butir sudah skor 4.</div>`}</div></section>
   <section class="panel"><h2>Cari butir</h2><p class="small muted" style="margin:0 0 6px">Tidak hafal nomor butir? Ketik kegiatan atau dokumennya dengan kata sehari-hari, misalnya "evaluasi perkuliahan", "rapat dengan industri", "kepuasan alumni".</p>
    <input id="cariButir" type="search" data-saran="cari" data-saran-out="saCari" value="${esc(S.cariButir || "")}" placeholder="Ketik kegiatan, dokumen, atau masalah…" aria-label="Cari butir Matriks"><div id="saCari" style="margin-top:8px">${htmlSaran("cari", S.cariButir, [], 6)}</div></section>
   <section class="panel"><div class="row" style="justify-content:space-between;margin-bottom:10px;flex-wrap:wrap"><h2>84 butir</h2>
    <select id="nilaiF" style="width:auto" aria-label="Saring butir"><option value="">Semua butir</option><option value="gpm" ${f === "gpm" ? "selected" : ""}>Belum dinilai GKM</option><option value="kurang" ${f === "kurang" ? "selected" : ""}>Data belum lengkap</option><option value="rendah" ${f === "rendah" ? "selected" : ""}>Skor di bawah 3</option>${P.kriteria.map(k => `<option value="${k.k}" ${f === k.k ? "selected" : ""}>${esc(k.l)}</option>`).join("")}</select></div>
    <div class="tbl-wrap"><table><thead><tr><th>No</th><th>Butir</th><th>Bobot</th><th>Skor</th><th>Nilai</th><th>Cara</th></tr></thead><tbody>
    ${rows.map(r => `<tr data-baris-butir="${r.n}"><td class="num">${r.n}</td><td style="min-width:260px"><b>${esc(r.nm)}</b> ${iBtn("b" + r.n, r.nm)}<div class="small ${r.kurang ? "" : "muted"}" ${r.kurang ? 'style="color:var(--warn)"' : ""}>${esc(r.info)}</div>${r.catatan ? `<div class="small" style="margin-top:2px">Catatan GKM: ${esc(r.catatan)}</div>` : ""}
      <details class="small" style="margin-top:4px"><summary style="cursor:pointer;color:var(--brand)">Syarat skor 4 dan saran</summary><p style="margin-top:4px">${esc(r.s4)}</p><p style="margin-top:4px"><b>Saran:</b> ${esc(r.sr)}</p><p class="muted" style="margin-top:4px">Sumber: ${esc(r.src)} · DED butir ${r.ded}</p></details></td>
      <td class="num">${angkaId2(r.w, 3)}</td><td class="num" style="font-weight:800;color:${warnaSkor(r.skor)}">${angkaId2(r.skor)}</td><td class="num">${angkaId2(r.nilai)}</td>
      <td class="small">${CARA_L[r.t]}<br><button class="btn sm" data-act="sumberBuka" data-n="${r.n}" style="margin-top:4px">Sumber data</button>${r.perluGpm ? `<br>GKM: <b>${r.gpm === null ? "belum" : angkaId2(r.gpm)}</b>${r.auto !== null ? ` · data: ${angkaId2(r.auto)}` : ""}<br><button class="btn sm" data-act="gpmBuka" data-n="${r.n}" style="margin-top:4px">${r.gpm === null ? "Nilai" : "Ubah"}</button>` : ""}</td></tr>`).join("")}
    </tbody></table></div></section>`;
}
function laciGpm() {
  const r = S.nilai.rows.find(x => x.n === S.laci.n);
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Nilai butir" style="width:min(620px,100%)">
   <div class="dh"><h2>Butir ${r.n}. ${esc(r.nm)}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   <div class="small muted">Bobot ${angkaId2(r.w, 3)} · ${CARA_L[r.t]} · DED butir ${r.ded} · Sumber: ${esc(r.src)}</div>
   <div>${iTombol("b" + r.n, "Rubrik skor 0–4 menurut Matriks")}</div>
   <div class="callout"><b>Agar skor 4:</b> ${esc(r.s4)}<div style="margin-top:6px"><b>Saran:</b> ${esc(r.sr)}</div></div>
   ${r.auto !== null ? `<div class="auto">Bagian otomatis: <b>${angkaId2(r.auto)}</b>. ${esc(r.info.split("; skor GKM")[0])}</div>` : ""}
   ${r.perluGpm ? `<div class="field"><label for="gpmSkor">Skor GKM (0–4) sesuai rubrik Matriks</label><select id="gpmSkor"><option value="">– belum dinilai –</option>${[4, 3, 2, 1, 0].map(v => `<option value="${v}" ${r.gpm === v ? "selected" : ""}>${v}</option>`).join("")}</select></div>
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
    const bt = [["No", "Kriteria", "Butir", "Bobot", "Cara", "Skor otomatis", "Skor GKM", "Skor", "Nilai", "Potensi kenaikan", "Keterangan", "Catatan GKM", "Syarat skor 4", "Saran", "DED butir"]]
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
  return `<div class="head"><div><h1>Survei</h1><p>Buat survei kepuasan dengan templat sesuai instrumen. Survei bertujuan <b>Tabel 22</b> dan <b>Tabel 11</b> otomatis mengisi Tabel iLKPS pada tahun akademik saat survei dibuka. Responden yang punya akun melihat survei di Beranda; alumni dan pengguna lulusan memakai tautan tanpa login.</p><div style="margin-top:6px">${iTombol("b42,b71,b78,t11,t22")}</div></div>
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
     <h2 style="margin-top:10px">${esc(t.judul)} ${iBtn("t" + t.kode, t.judul)}</h2>
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
const terpasang = () => { try { return matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: window-controls-overlay)").matches || navigator.standalone === true; } catch (_) { return false; } };
/** Semua unduhan lewat sini. v0.48.1: selalu unduhan biasa browser (tanpa jendela "Simpan ke…" dan tanpa daftar sendiri) agar berkas tampil
    di tombol unduhan Chrome/Edge. Folder tujuan mengikuti pengaturan browser ("Tanyakan lokasi penyimpanan" bila ingin memilih folder). */
function simpanBerkas(blob, nama) {
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = nama; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
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
    const w = penampil();
    try {
      const j = await api("dok.lihat", { id: d.id }), blob = new Blob([dariBase64(j.isi)], { type: j.mime });
      if (w && /pdf|image/.test(j.mime)) { w.tampil(URL.createObjectURL(blob), j.nama, j.mime); } else { if (w) w.close(); unduh(blob, j.nama); }
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

/* ---------- Rapat & Tindak Lanjut (v0.31.0) ---------- */
const PERAN_TL_KELOLA = ["kps", "gkm", "admin", "superadmin"];
const kelolaRapat = () => PERAN_TL_KELOLA.includes(peranAktif());
const CHIP_TL = { belum: "s-draf", berjalan: "s-revisi", selesai: "s-diajukan", terverifikasi: "s-disetujui" };
const CHIP_RAPAT = { draf: "s-draf", terbit: "s-disetujui", batal: "s-ditolak" };
const jamRapat = r => r.jamMulai ? r.jamMulai + (r.jamSelesai ? "–" + r.jamSelesai : "") + " WITA" : "";
const tempatRapat = r => [r.tempat, r.tautan ? "Daring" : ""].filter(Boolean).join(" · ");
const butirChip = n => `<span class="tag t">Butir ${n}</span>${iBtn("b" + n, "Butir " + n)}`;
async function muatRapat() { return sekali("rapat", async () => { S.rapat = await api("rapat.daftar"); render(); }); }
async function muatTl() { return sekali("tl", async () => { S.tl = await api("tl.daftar"); render(); }); }
function hRapat() {
  const tab = S.rapatTab || "rapat", kel = kelolaRapat();
  const seg = `<div class="seg" role="group" aria-label="Bagian" style="margin-bottom:12px"><button data-act="rapatTab" data-t="rapat" aria-pressed="${tab === "rapat"}">Rapat dan undangan</button><button data-act="rapatTab" data-t="tl" aria-pressed="${tab === "tl"}">Tindak lanjut</button></div>`;
  const head = `<div class="head"><div><h1>Rapat &amp; Tindak Lanjut</h1><p>${peranAktif() === "asesor" ? "Rapat yang risalahnya sudah final beserta pindaian risalah dan daftar hadir, serta tindak lanjut yang sudah terverifikasi (baca saja)." : kel ? "Undangan rapat dari KPS (surat PDF bertanda tangan, notifikasi ke peserta) dan daftar tindak lanjut yang dilacak sampai terverifikasi, sesuai siklus PPEPP." : "Undangan rapat untuk Anda dan tindak lanjut yang menjadi tanggung jawab Anda."}</p>
    <div style="margin-top:6px">${iTombol("b2,b3,b7,b22,b23,b42,b71,b77")}</div></div></div>`;
  if (tab === "tl") return head + seg + isiTl();
  if (!S.rapat) { muatRapat(); return head + seg + `<div class="memuat">Memuat rapat…</div>`; }
  const R = S.rapat, kini = R.hariIni;
  const baris = R.rapat.map(r => `<div class="item" style="cursor:pointer" data-act="rapatBuka" data-id="${r.id}"><div class="body">
     <div class="row" style="justify-content:space-between;gap:8px"><div class="title">${esc(r.judul)}</div><span class="chip ${CHIP_RAPAT[r.status]}">${esc(r.statusL)}</span></div>
     <div class="meta"><span>${esc(r.jenisL)}</span>${r.tgl ? `<span class="num">${esc(tglPanjang(r.tgl))}${r.jamMulai ? " · " + esc(jamRapat(r)) : ""}</span>` : "<span>Tanggal belum diisi</span>"}${tempatRapat(r) ? `<span>${esc(tempatRapat(r))}</span>` : ""}
      ${r.status !== "draf" ? `<span>${r.jumlahUndangan} undangan</span>` : ""}${r.saya ? `<span>${r.saya.jawab === "hadir" ? "Anda: hadir" : r.saya.jawab === "tidak" ? "Anda: tidak hadir" : "Belum Anda jawab"}</span>` : ""}${r.tgl && r.tgl < kini ? `<span class="muted">sudah lewat</span>` : ""}</div></div></div>`).join("");
  return head + seg + `<section class="panel">${R.kelola ? `<div class="row" style="margin-bottom:10px">${tombol("rapatBaru", "+ Buat undangan rapat", "primary")}</div>` : ""}
    <div class="list">${baris || `<div class="empty">${R.kelola ? "Belum ada rapat. Tekan <b>+ Buat undangan rapat</b>." : "Belum ada undangan rapat untuk Anda."}</div>`}</div></section>`;
}
function isiTl() {
  if (!S.tl) { muatTl(); return `<div class="memuat">Memuat tindak lanjut…</div>`; }
  const T = S.tl, f = S.tlF || "terbuka";
  const cocok = t => f === "semua" || (f === "terbuka" ? ["belum", "berjalan"].includes(t.status) : f === "verif" ? t.status === "selesai" : f === "saya" ? t.pj === S.pengguna.id : t.status === f);
  const l = T.tl.filter(cocok), hit = k => T.tl.filter(t => t.status === k).length;
  return `<div class="grid g3"><div class="panel stat"><span class="v num">${hit("belum") + hit("berjalan")}</span><span class="l">Belum tuntas${T.tl.some(t => t.terlambat) ? ` · <b style="color:var(--bad)">${T.tl.filter(t => t.terlambat).length} lewat tenggat</b>` : ""}</span></div>
     <div class="panel stat"><span class="v num">${hit("selesai")}</span><span class="l">Selesai, menunggu verifikasi</span></div><div class="panel stat"><span class="v num">${hit("terverifikasi")}</span><span class="l">Terverifikasi (tuntas)</span></div></div>
   <section class="panel"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px">
     <select id="tlF" style="width:auto" aria-label="Saring tindak lanjut">${[["terbuka", "Belum tuntas"], ["verif", "Menunggu verifikasi"], ["terverifikasi", "Terverifikasi"], ["saya", "Tanggung jawab saya"], ["semua", "Semua"]].map(([k, v]) => `<option value="${k}" ${f === k ? "selected" : ""}>${v}</option>`).join("")}</select>
     ${T.kelola ? tombol("tlBaru", "+ Tindak lanjut", "primary") : ""}</div>
    <div class="list">${l.map(t => `<div class="item" style="cursor:pointer" data-act="tlBuka" data-id="${t.id}"><div class="body">
      <div class="row" style="justify-content:space-between;gap:8px;align-items:flex-start"><div class="title" style="font-weight:600">${esc(t.uraian)}</div><span class="chip ${CHIP_TL[t.status]}">${esc(t.statusL)}</span></div>
      <div class="meta"><span>PJ: ${esc(namaPendek(t.pjNama) || "–")}</span>${t.tenggat ? `<span class="num" ${t.terlambat ? 'style="color:var(--bad);font-weight:700"' : ""}>Tenggat ${esc(tglPendek(t.tenggat))}${t.terlambat ? " (lewat)" : ""}</span>` : ""}<span>${esc(t.sumberL)}${t.sumberRef ? " " + esc(t.sumberRef) : ""}</span>
       ${t.butir.length ? `<span>Butir ${t.butir.join(", ")}</span>` : ""}</div></div></div>`).join("") || `<div class="empty">Tidak ada poin pada saringan ini.</div>`}</div></section>`;
}
/* --- laci tindak lanjut --- */
function laciTlForm() {
  const L = S.laci, x = L.f, T = S.tl, dis = S.sibuk ? "disabled" : "";
  const nmButir = n => (T.butir.find(b => b.n === n) || {}).nm || "";
  const btr = String(x.butirTeks || "").split(/[\s,;]+/).map(Number).filter(n => n >= 1 && n <= 84);
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Tindak lanjut" style="width:min(600px,100%)">
   <div class="dh"><h2>${x.id ? "Ubah tindak lanjut" : "Tindak lanjut baru"}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   <div class="field"><label for="tlU">Uraian tindak lanjut${wajib}</label><textarea id="tlU" data-tf="uraian" data-saran="tl" data-saran-out="saTl" rows="4" placeholder="Contoh: Revisi RPS mata kuliah yang belum memuat rubrik penilaian">${esc(x.uraian || "")}</textarea><span class="hint">Satu poin = satu tindakan yang bisa diperiksa selesai atau belum.</span>
    <div id="saTl">${htmlSaran("tl", x.uraian, angkaButir(x.butirTeks))}</div></div>
   <div class="grid g2" style="gap:10px"><div class="field"><label for="tlPj">Penanggung jawab${wajib}</label><select id="tlPj" data-tf="pj"><option value="">Pilih dosen/tendik</option>${T.pegawai.map(o => `<option value="${o.id}" ${x.pj === o.id ? "selected" : ""}>${esc(namaPendek(o.nama))}${o.jenis === "tendik" ? " (tendik)" : ""}</option>`).join("")}</select></div>
    <div class="field"><label for="tlTg">Tenggat</label><input id="tlTg" data-tf="tenggat" type="date" value="${esc(x.tenggat || "")}"></div></div>
   <div class="grid g2" style="gap:10px"><div class="field"><label for="tlS">Sumber</label><select id="tlS" data-tf="sumber">${Object.entries(T.sumber).map(([k, v]) => `<option value="${k}" ${x.sumber === k ? "selected" : ""}>${esc(v)}</option>`).join("")}</select></div>
    <div class="field"><label for="tlR">Rujukan sumber (opsional)</label><input id="tlR" data-tf="sumberRef" type="text" value="${esc(x.sumberRef || "")}" placeholder="Contoh: Laporan GKM 2026-1"></div></div>
   <div class="field"><label for="tlB">Butir Matriks terkait</label><input id="tlB" data-tf="butirTeks" type="text" inputmode="numeric" value="${esc(x.butirTeks || "")}" placeholder="Contoh: 8, 25"><span class="hint">Nomor butir seperti di Penilaian, pisahkan dengan koma. ${btr.map(n => `<br>${n}. ${esc(nmButir(n))} ${iBtn("b" + n, nmButir(n))}`).join("")}</span></div>
   ${galatHtml()}<div class="row" style="justify-content:flex-end;margin-top:auto"><button class="btn" data-act="tutup" ${dis}>Batal</button>${tombol("tlSimpan", "Simpan")}</div></div></div>`;
}
function laciTl() {
  const t = S.tl.tl.find(x => x.id === S.laci.id);
  if (!t) return "";
  const L = S.laci, dis = S.sibuk ? "disabled" : "";
  const bukti = t.bukti ? `<div class="auto"><b>Bukti penyelesaian:</b> ${t.bukti.t === "tautan" ? `<a href="${esc(t.bukti.url)}" target="_blank" rel="noopener noreferrer">Buka tautan</a>` : `<button class="lnk" data-act="tlLihatBukti" data-id="${t.id}">${esc(t.bukti.nama)}</button>`}<div style="margin-top:4px">${esc(t.bukti.ket)}</div></div>` : "";
  const kerja = t.bolehKerjakan ? `<section class="card" style="padding:12px;margin:10px 0"><h3 style="margin:0 0 8px;font-size:.95rem">Perbarui status</h3>
     ${t.status === "belum" ? `<div class="row" style="margin-bottom:8px">${tombol("tlStatus", "Tandai sedang berjalan", "", 'data-s="berjalan"')}</div>` : ""}
     <div class="field"><label for="tlKet">Apa yang sudah dilakukan</label><textarea id="tlKet" data-tk="ket" rows="3" placeholder="Contoh: 12 RPS sudah direvisi dan memuat rubrik; disahkan rapat prodi 20 Nov 2026">${esc(L.ket || "")}</textarea></div>
     <div class="field"><label for="tlFile">Bukti (PDF/gambar/Word/Excel, maks. 10 MB)</label><input id="tlFile" type="file" accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx" ${dis}>${L.berkas ? `<span class="hint">Dipilih: ${esc(L.berkas.nama)}</span>` : ""}</div>
     <div class="field"><label for="tlTaut">atau tautan bukti</label><input id="tlTaut" data-tk="tautan" type="url" value="${esc(L.tautan || "")}" placeholder="https://drive.google.com/…"></div>
     <div class="row" style="justify-content:flex-end">${tombol("tlStatus", "Tandai selesai dan kirim untuk verifikasi", "primary", 'data-s="selesai"')}</div></section>` : "";
  const verif = t.bolehVerif ? `<section class="card" style="padding:12px;margin:10px 0"><h3 style="margin:0 0 8px;font-size:.95rem">Verifikasi</h3>
     <div class="field"><label for="tlCat">Catatan (wajib bila dikembalikan)</label><textarea id="tlCat" data-tk="catatan" rows="2">${esc(L.catatan || "")}</textarea></div>
     <div class="row" style="justify-content:flex-end;gap:6px">${tombol("tlVerif", "Kembalikan", "", 'data-v="0"')}${tombol("tlVerif", "Verifikasi tuntas", "primary", 'data-v="1"')}</div></section>` : "";
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Tindak lanjut" style="width:min(640px,100%)">
   <div class="dh"><h2>Tindak lanjut</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   <p style="font-weight:600;margin:0 0 6px">${esc(t.uraian)}</p>
   <div class="row" style="flex-wrap:wrap;gap:6px;margin-bottom:6px"><span class="chip ${CHIP_TL[t.status]}">${esc(t.statusL)}</span>${t.butir.map(butirChip).join(" ")}</div>
   ${tabelBaris([["Penanggung jawab", esc(t.pjNama || "–")], ["Tenggat", t.tenggat ? esc(tglPanjang(t.tenggat)) + (t.terlambat ? ' <b style="color:var(--bad)">(lewat)</b>' : "") : "–"], ["Sumber", esc(t.sumberL + (t.sumberRef ? " · " + t.sumberRef : ""))], ["Dicatat oleh", esc(t.oleh || "–")]])}
   ${t.catatan && t.status !== "terverifikasi" ? `<div class="callout"><b>Catatan verifikator:</b> ${esc(t.catatan)}</div>` : ""}${bukti}${kerja}${verif}
   ${galatHtml()}
   <details class="small" style="margin-top:8px"><summary style="cursor:pointer">Riwayat (${t.riwayat.length})</summary>${t.riwayat.map(h => `<div style="margin-top:4px">${esc(tglJam(h.w))} · ${esc(namaPendek(h.oleh))} · <b>${esc(h.a)}</b>${h.c ? ": " + esc(h.c) : ""}</div>`).join("")}</details>
   ${t.bolehUbah ? `<div class="row" style="justify-content:space-between;margin-top:auto;padding-top:10px">${tombol("tlHapus", "Hapus", "bad")}${tombol("tlUbah", "Ubah", "")}</div>` : ""}</div></div>`;
}
/* --- formulir undangan --- */
function rapatKosong() { return { jenis: "", judul: "", nomor: "", tgl: "", jamMulai: "", jamSelesai: "", tempat: "", tautan: "", pengantar: "", agenda: [{ t: "", butir: [], tl: "" }], peserta: { u: [], kelas: [], tamu: [] } }; }
function laciRapatForm() {
  const L = S.laci, x = L.f, R = S.rapatRef, dis = S.sibuk ? "disabled" : "";
  if (!R) return `<div class="overlay"><div class="drawer"><div class="memuat">Memuat…</div></div></div>`;
  const j = R.jenis.find(y => y.k === x.jenis), q = (L.q || "").trim().toLowerCase();
  const fld = (id, k, l, type, ph, extra) => `<div class="field"><label for="${id}">${l}</label><input id="${id}" data-rf="${k}" type="${type || "text"}" value="${esc(x[k] || "")}" placeholder="${esc(ph || "")}" ${extra || ""}></div>`;
  const pilih = new Set(x.peserta.u), kelas = new Set(x.peserta.kelas);
  const peg = jenis => R.pegawai.filter(o => o.jenis === jenis);
  const cekOrang = o => `<label class="row small" style="gap:6px"><input type="checkbox" data-rpu="${o.id}" ${pilih.has(o.id) ? "checked" : ""} style="width:auto"> ${esc(namaPendek(o.nama))}${o.inisial ? ` <span class="muted mono">${esc(o.inisial)}</span>` : ""}</label>`;
  const mhsPilih = R.mhs.filter(m => pilih.has(m.id)), hasilCari = q.length >= 2 ? R.mhs.filter(m => (m.nama + " " + m.no).toLowerCase().includes(q)).slice(0, 15) : [];
  const nAkun = new Set([...x.peserta.u, ...R.mhs.filter(m => kelas.has(m.kelas)).map(m => m.id)]).size;
  const agenda = x.agenda.map((a, i) => { const tl = a.tl ? R.tlTerbuka.find(t => t.id === a.tl) : null;
    return `<div class="row" style="gap:6px;align-items:flex-start;margin-bottom:6px"><span class="num" style="padding-top:8px">${i + 1}.</span><div style="flex:1">
      <textarea data-ra="${i}" data-raf="t" data-saran="agenda:${i}" data-saran-out="sa_${i}" rows="2" aria-label="Agenda ${i + 1}" placeholder="Contoh: Evaluasi capaian pembelajaran semester ganjil">${esc(a.t)}</textarea>
      <div class="row small" style="gap:6px;flex-wrap:wrap;margin-top:2px">${tl ? `<span class="tag">Tindak lanjut: ${esc(tl.uraian.slice(0, 60))}</span>` : ""}${(a.butir || []).map(n => `<span class="tag t">Butir ${n} <button type="button" class="lnk" data-act="rapatButirLepas" data-i="${i}" data-n="${n}" aria-label="Lepas butir ${n}">×</button></span>${iBtn("b" + n, "Butir " + n)}`).join(" ")}</div>
      <div id="sa_${i}">${htmlSaran("agenda:" + i, a.t, a.butir)}</div></div>
      <button class="btn sm bad" data-act="rapatAgendaHapus" data-i="${i}" aria-label="Hapus agenda ${i + 1}" ${dis}>×</button></div>`; }).join("");
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Undangan rapat" style="width:min(760px,100%)">
   <div class="dh"><h2>${x.id ? (L.terbit ? "Ubah undangan terbit" : "Ubah draf undangan") : "Undangan rapat baru"}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   ${L.terbit ? `<div class="callout">Undangan ini sudah terbit. Setelah disimpan, surat diperbarui dan peserta mendapat pemberitahuan ulang. Jawaban kehadiran tetap tersimpan.</div>` : ""}
   <div class="field"><label for="rfJ">Jenis rapat${wajib}</label><select id="rfJ" data-rf="jenis"><option value="">Pilih jenis rapat</option>${R.jenis.map(y => `<option value="${y.k}" ${x.jenis === y.k ? "selected" : ""}>${esc(y.l)}${y.butir.length ? " (butir " + y.butir.join(", ") + ")" : ""}</option>`).join("")}</select>
    ${j && j.butir.length ? `<span class="hint">Terkait instrumen: ${j.butir.map(n => `butir ${n} ${iBtn("b" + n, "Butir " + n)}`).join(", ")}</span>` : ""}</div>
   ${fld("rfJu", "judul", "Nama rapat" + wajib, "text", "Contoh: Rapat Industry Advisory Board 2026")}
   ${fld("rfNo", "nomor", "Nomor surat (opsional)", "text", "Nomor resmi dari bagian umum, bila ada")}
   <div class="grid g3" style="gap:10px">${fld("rfT", "tgl", "Tanggal" + wajib, "date")}${fld("rfM", "jamMulai", "Jam mulai" + wajib, "time")}${fld("rfS", "jamSelesai", "Jam selesai", "time")}</div>
   <div class="grid g2" style="gap:10px">${fld("rfTp", "tempat", "Tempat", "text", "Contoh: Ruang Rapat Prodi UPW")}${fld("rfTa", "tautan", "Tautan rapat daring", "url", "https://meet.google.com/…")}</div>
   <span class="hint" style="margin-top:-6px;display:block">Isi tempat, tautan, atau keduanya (rapat luring dan daring).</span>
   <div class="field"><label for="rfP">Kalimat tambahan (opsional)</label><textarea id="rfP" data-rf="pengantar" rows="2" placeholder="Contoh: Mohon membawa dokumen RPS mata kuliah yang diampu.">${esc(x.pengantar || "")}</textarea></div>
   <h3 class="instr-h">Agenda${wajib}</h3>${agenda}
   <div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn sm" data-act="rapatAgendaTambah" ${dis}>+ Agenda</button>
    <select id="rfTl" style="width:auto;max-width:260px" aria-label="Agenda dari tindak lanjut"><option value="">+ Dari tindak lanjut terbuka (${R.tlTerbuka.length})</option>${R.tlTerbuka.map(t => `<option value="${t.id}">${esc(t.uraian.slice(0, 80))}</option>`).join("")}</select>
    <select id="rfBtr" style="width:auto;max-width:260px" aria-label="Agenda dari butir Matriks"><option value="">+ Dari butir Matriks</option>${R.butir.map(b => `<option value="${b.n}">${b.n}. ${esc(b.nm)}</option>`).join("")}</select></div>
   <h3 class="instr-h">Peserta · ${nAkun} akun${x.peserta.tamu.length ? " + " + x.peserta.tamu.length + " tamu" : ""}</h3>
   <details class="picker" open><summary class="small" style="cursor:pointer"><b>Dosen</b> (${peg("dosen").filter(o => pilih.has(o.id)).length}/${peg("dosen").length}) <button class="btn sm" data-act="rapatSemua" data-j="dosen" style="margin-left:6px">Pilih semua</button></summary><div class="grid g2" style="gap:2px 10px;margin-top:6px">${peg("dosen").map(cekOrang).join("")}</div></details>
   <details class="picker"><summary class="small" style="cursor:pointer"><b>Tenaga kependidikan</b> (${peg("tendik").filter(o => pilih.has(o.id)).length}/${peg("tendik").length}) <button class="btn sm" data-act="rapatSemua" data-j="tendik" style="margin-left:6px">Pilih semua</button></summary><div class="grid g2" style="gap:2px 10px;margin-top:6px">${peg("tendik").map(cekOrang).join("")}</div></details>
   <details class="picker"><summary class="small" style="cursor:pointer"><b>Mahasiswa per kelas</b> (${x.peserta.kelas.length} kelas)</summary><div class="grid g2" style="gap:2px 10px;margin-top:6px">${R.kelas.map(c => `<label class="row small" style="gap:6px"><input type="checkbox" data-rpk="${c.key}" ${kelas.has(c.key) ? "checked" : ""} style="width:auto"> Angkatan ${c.masuk} kelas ${esc(c.kelas)} <span class="muted">(${c.n} mhs, smt ${c.semester})</span></label>`).join("")}</div></details>
   <details class="picker" ${mhsPilih.length || q ? "open" : ""}><summary class="small" style="cursor:pointer"><b>Mahasiswa per orang</b> (${mhsPilih.length})</summary>
    <input id="rpCari" type="search" value="${esc(L.q || "")}" placeholder="Ketik nama atau NIM (min. 2 huruf)" style="margin-top:6px">
    <div style="margin-top:6px">${hasilCari.map(m => `<label class="row small" style="gap:6px"><input type="checkbox" data-rpu="${m.id}" ${pilih.has(m.id) ? "checked" : ""} style="width:auto"> ${esc(m.nama)} <span class="muted mono">${esc(m.no)}</span></label>`).join("")}</div>
    ${mhsPilih.length ? `<div class="row small" style="gap:4px;flex-wrap:wrap;margin-top:6px">${mhsPilih.map(m => `<span class="tag">${esc(namaPendek(m.nama))} <button class="lnk" data-act="rapatLepas" data-id="${m.id}" aria-label="Keluarkan ${esc(m.nama)}">×</button></span>`).join("")}</div>` : ""}</details>
   <details class="picker" ${x.peserta.tamu.length ? "open" : ""}><summary class="small" style="cursor:pointer"><b>Tamu dari luar</b> (${x.peserta.tamu.length}) · cukup lewat surat PDF</summary>
    ${x.peserta.tamu.map((t, i) => `<div class="row" style="gap:6px;margin-top:6px"><input data-rt="${i}" data-rtf="nama" type="text" value="${esc(t.nama)}" placeholder="Nama dan gelar" aria-label="Nama tamu ${i + 1}"><input data-rt="${i}" data-rtf="instansi" type="text" value="${esc(t.instansi)}" placeholder="Instansi/perusahaan" aria-label="Instansi tamu ${i + 1}"><button class="btn sm bad" data-act="rapatTamuHapus" data-i="${i}" aria-label="Hapus tamu ${i + 1}">×</button></div>`).join("")}
    <button class="btn sm" data-act="rapatTamuTambah" style="margin-top:6px">+ Tamu</button></details>
   ${galatHtml()}<div class="row" style="justify-content:flex-end;gap:6px;margin-top:12px;flex-wrap:wrap"><button class="btn" data-act="tutup" ${dis}>Batal</button>
    ${tombol("rapatSimpan", L.terbit ? "Simpan dan perbarui undangan" : "Simpan draf", L.terbit ? "primary" : "")}${!L.terbit && R.bolehTerbit ? tombol("rapatSimpan", "Simpan dan terbitkan", "primary", 'data-terbit="1"') : ""}</div></div></div>`;
}
/* --- detail undangan --- */
function laciRapat() {
  const r = S.laci.r, dis = S.sibuk ? "disabled" : "";
  if (!r) return `<div class="overlay" data-act="tutupLuar"><div class="drawer"><div class="memuat">Memuat undangan…</div></div></div>`;
  const kel = !!r.rekap, kini = S.rapat ? S.rapat.hariIni : hariIniLokal();
  const jawab = r.saya && r.status === "terbit" && r.tgl >= kini ? `<section class="card" style="padding:12px;margin:10px 0"><h3 style="margin:0 0 8px;font-size:.95rem">Kehadiran Anda${r.saya.jawab ? `: <b>${r.saya.jawab === "hadir" ? "Hadir" : "Tidak hadir"}</b>` : ""}</h3>
     <div class="field"><label for="rjA">Alasan bila tidak hadir</label><input id="rjA" type="text" value="${esc(r.saya.alasan || "")}" placeholder="Contoh: Mengajar di kelas lain"></div>
     <div class="row" style="gap:6px">${tombol("rapatJawab", "Hadir", "primary", 'data-j="hadir"')}${tombol("rapatJawab", "Tidak hadir", "", 'data-j="tidak"')}</div></section>` : "";
  const rek = kel && r.status !== "draf" ? `<details class="picker"><summary class="small" style="cursor:pointer"><b>Jawaban peserta</b>: ${r.rekap.hadir} hadir · ${r.rekap.tidak} tidak hadir · ${r.rekap.belum} belum menjawab</summary>
     <div class="gulir" style="margin-top:6px"><table><thead><tr><th>Nama</th><th>Unsur</th><th>Jawaban</th></tr></thead><tbody>${r.rekap.daftar.map(x => `<tr><td class="small">${esc(x.nama)}</td><td class="small">${esc(x.unsur)}</td><td class="small">${x.jawab === "hadir" ? "Hadir" : x.jawab === "tidak" ? "Tidak hadir" + (x.alasan ? ": " + esc(x.alasan) : "") : '<span class="muted">Belum</span>'}</td></tr>`).join("")}</tbody></table></div></details>` : "";
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Undangan rapat" style="width:min(680px,100%)">
   <div class="dh"><h2>${esc(r.judul)}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   <div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:6px"><span class="chip ${CHIP_RAPAT[r.status]}">${esc(r.statusL)}</span><span class="tag">${esc(r.jenisL)}</span>${(r.butirJenis || []).map(butirChip).join(" ")}</div>
   ${r.status === "batal" ? `<div class="callout" style="border-color:var(--bad)"><b style="color:var(--bad)">Rapat ini dibatalkan.</b>${kel ? "" : " Abaikan undangan sebelumnya."}</div>` : ""}
   ${tabelBaris([["Hari/tanggal", r.tgl ? esc(tglPanjang(r.tgl)) : "–"], ["Waktu", esc(jamRapat(r) || "–")], ["Tempat", esc(r.tempat || (r.tautan ? "Daring" : "–"))], ...(r.tautan ? [["Tautan", `<a href="${esc(r.tautan)}" target="_blank" rel="noopener noreferrer">${esc(r.tautan)}</a>`]] : []), ...(r.kode ? [["Kode verifikasi", `<span class="mono">${esc(r.kode)}</span>`]] : [])])}
   <h3 class="instr-h">Agenda</h3><ol style="margin:0 0 8px 18px;padding:0">${(r.agenda || []).map(a => `<li style="margin-bottom:4px">${esc(a.t)} ${(a.butir || []).map(n => iBtn("b" + n, "Butir " + n)).join("")}</li>`).join("")}</ol>
   ${r.pengantar ? `<p class="small">${esc(r.pengantar)}</p>` : ""}${jawab}${rek}${bagianRisalah(r)}
   ${galatHtml()}
   <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:auto;padding-top:10px;justify-content:flex-end">
    ${r.status !== "draf" || kel ? tombol("rapatPdf", r.status === "draf" ? "Pratinjau PDF (draf)" : "Unduh surat PDF", "") : ""}
    ${r.bolehUbah ? tombol("rapatUbah", "Ubah", "") : ""}${kel && r.status === "draf" ? tombol("rapatHapus", "Hapus draf", "bad") : ""}
    ${r.bolehBatal ? tombol("rapatBatal", "Batalkan rapat", "bad") : ""}${r.bolehTerbit ? tombol("rapatTerbit", "Terbitkan undangan", "primary") : ""}</div></div></div>`;
}
function kertasUndangan(r, gbr) {
  const L = r.lampiran || { daftar: [], kps: null, set: { tempat: "Nusa Dua" } }, terbit = r.status !== "draf";
  const kps = L.kps || { nama: "[nama Koordinator Program Studi]", nip: "–" };
  const url = location.origin + location.pathname + "?cek=" + encodeURIComponent(r.kode || "");
  const tg = terbit ? (L.diperbarui || r.tglSurat) : hariIniLokal(), tanda = terbit ? (r.status === "batal" ? `<div class="draf-tanda">DIBATALKAN</div>` : "") : `<div class="draf-tanda">DRAF</div>`;
  const ttd = `<div class="ttd">Koordinator Program Studi<br>Usaha Perjalanan Wisata (UPW)
    ${terbit ? `<div class="ttd-area">${gbr ? `<img class="ttd-img" src="${gbr}" alt="Tanda tangan ${esc(kps.nama)}">` : ""}</div>` : `<div class="draf-ttd">DRAF: belum diterbitkan KPS</div>`}
    <div class="ttd-nama"><b><u>${esc(kps.nama)}</u></b><br>NIP. ${esc(nipTampil(kps.nip))}</div>
    ${terbit ? `<div class="sah-baris"><div class="qr">${window.UPW_QR ? UPW_QR.svg(url) : ""}</div><div class="sah">Diterbitkan secara elektronik melalui Repositori UPW pada ${esc(tglSurat(tg))}.<br>Kode verifikasi: <b>${esc(r.kode)}</b><br>Pindai QR atau buka: ${esc(url)}</div></div>` : ""}</div>`;
  const waktu = jamRapat(r) || "[jam]", tempat = [r.tempat, r.tautan ? "Daring: " + r.tautan : ""].filter(Boolean).join("; ") || "[tempat]";
  return `<div class="kertas">${kopHtml()}${tanda}<p style="text-align:right">${esc(L.set.tempat || "Nusa Dua")}, ${esc(tglSurat(tg))}</p>
    ${tabelBaris([["Nomor", esc(r.nomor || "–")], ["Lampiran", "1 (satu) berkas"], ["Hal", "<b>Undangan " + esc(r.judul) + "</b>"]])}
    <p style="margin-top:12px">Kepada Yth.<br>Bapak/Ibu/Saudara/i sebagaimana daftar terlampir<br>di Tempat</p>
    <p style="margin-top:12px">Dengan hormat,</p><p style="text-align:justify">Dengan ini kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri <b>${esc(r.judul)}</b> yang akan dilaksanakan pada:</p>
    ${tabelBaris([["Hari/Tanggal", r.tgl ? esc(tglPanjang(r.tgl)) : kosong("tanggal")], ["Waktu", esc(waktu)], ["Tempat", esc(tempat)]])}
    <p style="margin-bottom:4px">dengan agenda:</p><ol style="margin:0 0 10px 22px;padding:0">${(r.agenda || []).map(a => `<li>${esc(a.t)}</li>`).join("")}</ol>
    ${r.pengantar ? `<p style="text-align:justify">${esc(r.pengantar)}</p>` : ""}
    <p style="text-align:justify">Mengingat pentingnya acara tersebut, kami mohon kehadiran Bapak/Ibu/Saudara/i tepat waktu. Atas perhatian dan kerja samanya kami ucapkan terima kasih.</p>${ttd}</div>
   <div class="kertas">${tanda}<p style="font-size:10pt;color:#444">Lampiran surat ${terbit ? "dengan kode verifikasi " + esc(r.kode) : "(kode verifikasi terbit setelah diterbitkan KPS)"}</p>
    <p style="text-align:center;font-weight:700;margin:6px 0 12px">Daftar Undangan<br>${esc(r.judul)}</p>
    <table class="lamp"><thead><tr><th>No</th><th>Nama</th><th>NIP / NIM</th><th>Unsur / Instansi</th></tr></thead><tbody>${(terbit ? L.daftar : (S.laci.daftarDraf || [])).map((d, n) => `<tr><td class="c">${n + 1}</td><td>${esc(d.nama)}</td><td>${esc(d.no ? nipTampil(d.no) : "")}</td><td>${esc(d.unsur)}</td></tr>`).join("")}</tbody></table></div>`;
}
function daftarDrafRapat(r) {
  const R = S.rapatRef; if (!R || !r.peserta) return [];
  const o = [];
  r.peserta.u.forEach(id => { const p = R.pegawai.find(x => x.id === id) || R.mhs.find(x => x.id === id); if (p) o.push({ nama: p.nama, no: p.no, unsur: p.jenis === "dosen" ? "Dosen" : p.jenis === "tendik" ? "Tenaga kependidikan" : "Mahasiswa" }); });
  r.peserta.kelas.forEach(k => { const c = R.kelas.find(x => x.key === k); if (c) o.push({ nama: "Mahasiswa angkatan " + c.masuk + " kelas " + c.kelas, no: "", unsur: c.n + " mahasiswa" }); });
  r.peserta.tamu.forEach(t => o.push({ nama: t.nama, no: "", unsur: t.instansi || "Tamu" }));
  return o;
}
async function bukaRapat(id) {
  S.laci = { jenis: "rapat", id, r: null }; S.galat = ""; render();
  try { const j = await api("rapat.detail", { id }); if (S.laci && S.laci.id === id) { S.laci.r = j.rapat; render(); } } catch (e) { S.laci = null; render(); toast(e.message); }
}
async function siapkanRefRapat() { if (!S.rapatRef) S.rapatRef = await api("rapat.ref"); }
async function siapkanTl() { if (!S.tl) S.tl = await api("tl.daftar"); }
function salinIsianRapat() {
  const L = S.laci; if (!L || L.jenis !== "rapatForm") return;
  document.querySelectorAll("[data-rf]").forEach(el => { L.f[el.dataset.rf] = el.value; });
  document.querySelectorAll("[data-ra]").forEach(el => { L.f.agenda[Number(el.dataset.ra)][el.dataset.raf] = el.value; });
  document.querySelectorAll("[data-rt]").forEach(el => { L.f.peserta.tamu[Number(el.dataset.rt)][el.dataset.rtf] = el.value; });
}
document.addEventListener("input", e => {
  const t = e.target, L = S.laci; if (!L) return;
  if (L.jenis === "rapatForm") {
    if (t.dataset.rf) L.f[t.dataset.rf] = t.value;
    else if (t.dataset.ra !== undefined) L.f.agenda[Number(t.dataset.ra)][t.dataset.raf] = t.value;
    else if (t.dataset.rt !== undefined) L.f.peserta.tamu[Number(t.dataset.rt)][t.dataset.rtf] = t.value;
  } else if (L.jenis === "tlForm" && t.dataset.tf) { L.f[t.dataset.tf] = t.value; }
  else if (L.jenis === "tl" && t.dataset.tk) { L[t.dataset.tk] = t.value; }
});
document.addEventListener("input", ketikUlang("rpCari", v => { salinIsianRapat(); S.laci.q = v; }));
document.addEventListener("input", ketikUlang("tlB", v => { S.laci.f.butirTeks = v; }));
document.addEventListener("change", e => {
  const t = e.target, L = S.laci;
  if (t.id === "tlF") { S.tlF = t.value; render(); return; }
  if (!L) return;
  if (L.jenis === "tlForm" && t.dataset.tf) { L.f[t.dataset.tf] = t.value; return; }
  if (L.jenis === "rapatForm") {
    salinIsianRapat();
    const P = L.f.peserta;
    if (t.dataset.rpu) { const i = P.u.indexOf(t.dataset.rpu); if (t.checked && i < 0) P.u.push(t.dataset.rpu); if (!t.checked && i >= 0) P.u.splice(i, 1); render(); return; }
    if (t.dataset.rpk) { const i = P.kelas.indexOf(t.dataset.rpk); if (t.checked && i < 0) P.kelas.push(t.dataset.rpk); if (!t.checked && i >= 0) P.kelas.splice(i, 1); render(); return; }
    if (t.id === "rfJ") { const j = S.rapatRef.jenis.find(y => y.k === t.value); if (j && !L.f.judul) L.f.judul = j.l + " " + new Date().getFullYear(); render(); return; }
    if (t.id === "rfTl" && t.value) { const tl = S.rapatRef.tlTerbuka.find(x => x.id === t.value); if (tl) { L.f.agenda = L.f.agenda.filter(a => a.t.trim()); L.f.agenda.push({ t: "Tindak lanjut: " + tl.uraian, butir: tl.butir, tl: tl.id }); } render(); return; }
    if (t.id === "rfBtr" && t.value) { const b = S.rapatRef.butir.find(x => x.n === Number(t.value)); if (b) { L.f.agenda = L.f.agenda.filter(a => a.t.trim()); L.f.agenda.push({ t: `Pembahasan butir ${b.n} (${b.nm}): syarat skor 4 — ${b.s4}`, butir: [b.n], tl: "" }); } render(); return; }
  }
  if (L.jenis === "tl" && t.id === "tlFile") {
    const f = t.files && t.files[0]; t.value = "";
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast("Ukuran file maksimal 10 MB. Pakai tautan untuk berkas besar."); return; }
    bacaBase64(f).then(isi => { L.berkas = { nama: f.name, isi }; render(); }, err => toast(err.message));
  }
});
Object.assign(AKSI, {
  rapatTab(d) { S.rapatTab = d.t; render(); },
  tlKeVerif() { S.view = "rapat"; S.rapatTab = "tl"; S.tlF = "verif"; S.laci = null; render(); },
  rapatBuka(d) { bukaRapat(d.id); },
  async rapatBaru() {
    jalankan(async () => { await siapkanRefRapat(); S.laci = { jenis: "rapatForm", f: rapatKosong(), q: "" }; });
  },
  rapatUbah() {
    const r = S.laci.r;
    jalankan(async () => { await siapkanRefRapat(); S.laci = { jenis: "rapatForm", terbit: r.status === "terbit", q: "",
      f: { id: r.id, jenis: r.jenis, judul: r.judul, nomor: r.nomor, tgl: r.tgl, jamMulai: r.jamMulai, jamSelesai: r.jamSelesai, tempat: r.tempat, tautan: r.tautan, pengantar: r.pengantar || "",
        agenda: (r.agenda || []).map(a => Object.assign({ butir: [], tl: "" }, a)), peserta: JSON.parse(JSON.stringify(r.peserta || { u: [], kelas: [], tamu: [] })) } }; });
  },
  rapatAgendaTambah() { salinIsianRapat(); S.laci.f.agenda.push({ t: "", butir: [], tl: "" }); render(); },
  rapatAgendaHapus(d) { salinIsianRapat(); S.laci.f.agenda.splice(Number(d.i), 1); if (!S.laci.f.agenda.length) S.laci.f.agenda.push({ t: "", butir: [], tl: "" }); render(); },
  rapatTamuTambah() { salinIsianRapat(); S.laci.f.peserta.tamu.push({ nama: "", instansi: "" }); render(); },
  rapatTamuHapus(d) { salinIsianRapat(); S.laci.f.peserta.tamu.splice(Number(d.i), 1); render(); },
  rapatLepas(d) { salinIsianRapat(); const P = S.laci.f.peserta; P.u = P.u.filter(x => x !== d.id); render(); },
  rapatSemua(d, e) { e && e.preventDefault(); salinIsianRapat(); const P = S.laci.f.peserta; S.rapatRef.pegawai.filter(o => o.jenis === d.j).forEach(o => { if (!P.u.includes(o.id)) P.u.push(o.id); }); render(); },
  rapatSimpan(d) {
    salinIsianRapat();
    const L = S.laci, f = L.f, terbit = d.terbit === "1";
    if (L.terbit && !confirm("Simpan perubahan? Surat diperbarui dan semua peserta mendapat pemberitahuan ulang.")) return;
    if (terbit && !confirm("Terbitkan undangan ini? Surat bertanda tangan Anda terbit dan peserta mendapat notifikasi.")) return;
    jalankan(async () => {
      const j = await api("rapat.simpan", { data: Object.assign({}, f, { agenda: f.agenda.filter(a => a.t.trim()) }) });
      if (terbit) await api("rapat.terbit", { id: j.id });
      S.rapat = null; S.tugas = null; S.tl = null; toast(terbit ? "Undangan terbit. Peserta mendapat notifikasi." : L.terbit ? "Undangan diperbarui." : "Draf undangan tersimpan.");
      bukaRapat(j.id);
    });
  },
  rapatTerbit() {
    const r = S.laci.r;
    if (!confirm("Terbitkan undangan ini? Surat bertanda tangan Anda terbit dan peserta mendapat notifikasi.")) return;
    jalankan(async () => { await api("rapat.terbit", { id: r.id }); S.rapat = null; S.tugas = null; toast("Undangan terbit."); bukaRapat(r.id); });
  },
  rapatBatal() {
    const r = S.laci.r, alasan = prompt("Alasan pembatalan (akan tercatat; peserta mendapat pemberitahuan):");
    if (alasan === null) return;
    jalankan(async () => { await api("rapat.batal", { id: r.id, alasan }); S.rapat = null; S.tugas = null; toast("Rapat dibatalkan."); bukaRapat(r.id); });
  },
  rapatHapus() {
    const r = S.laci.r; if (!confirm("Hapus draf undangan ini?")) return;
    jalankan(async () => { await api("rapat.hapus", { id: r.id }); S.laci = null; S.rapat = null; toast("Draf dihapus."); });
  },
  rapatJawab(d) {
    const r = S.laci.r, alasan = ($("rjA") || {}).value || "";
    jalankan(async () => { await api("rapat.jawab", { id: r.id, jawab: d.j, alasan }); S.tugas = null; S.rapat = null; toast(d.j === "hadir" ? "Terima kasih, kehadiran Anda tercatat." : "Ketidakhadiran Anda tercatat."); bukaRapat(r.id); });
  },
  rapatBaca(d) { jalankan(async () => { await api("rapat.baca", { id: d.id }); S.tugas = null; }); },
  async rapatPdf() {
    const r = S.laci.r;
    try {
      if (r.status === "draf") { await siapkanRefRapat(); S.laci.daftarDraf = daftarDrafRapat(r); }
      S.ttdRapat = S.ttdRapat || {};
      if (r.status !== "draf" && !(r.id in S.ttdRapat)) S.ttdRapat[r.id] = (await api("rapat.ttd", { id: r.id })).gambar || "";
      cetakSurat(kertasUndangan(r, S.ttdRapat[r.id] || ""));
    } catch (e) { toast(e.message); }
  },
  tlBuka(d) { S.laci = { jenis: "tl", id: d.id }; S.galat = ""; render(); },
  async tlBukaDari(d) { jalankan(async () => { await siapkanTl(); S.rapatTab = "tl"; S.laci = { jenis: "tl", id: d.id }; }); },
  tlBaru() { S.laci = { jenis: "tlForm", f: { sumber: "lain", butirTeks: "" } }; S.galat = ""; render(); fokus("tlU"); },
  tlDariGkm(d) {
    const rek = (S.gkmIsi && S.gkmIsi.rekomendasi) || "";
    jalankan(async () => { await siapkanTl(); S.laci = { jenis: "tlForm", dariGkm: true, f: { sumber: "gkm", sumberRef: "Laporan GKM " + d.s, uraian: rek.split(/\n+/).map(x => x.trim()).filter(Boolean)[0] || "", butirTeks: "" } }; });
  },
  tlUbah() { const t = S.tl.tl.find(x => x.id === S.laci.id); S.laci = { jenis: "tlForm", f: { id: t.id, uraian: t.uraian, pj: t.pj, tenggat: t.tenggat, sumber: t.sumber, sumberRef: t.sumberRef, butirTeks: t.butir.join(", ") } }; S.galat = ""; render(); },
  tlSimpan() {
    const f = S.laci.f, dariGkm = S.laci.dariGkm;
    document.querySelectorAll("[data-tf]").forEach(el => { f[el.dataset.tf] = el.value; });
    jalankan(async () => { const j = await api("tl.simpan", { data: Object.assign({}, f, { butir: String(f.butirTeks || "").split(/[\s,;]+/).filter(Boolean) }) }); S.tl = await api("tl.daftar"); S.tugas = null; S.nilai = null;
      S.laci = dariGkm ? null : { jenis: "tl", id: j.id }; toast(dariGkm ? "Poin tindak lanjut tercatat di menu Rapat & Tindak Lanjut." : "Tindak lanjut tersimpan."); });
  },
  tlStatus(d) {
    const L = S.laci, id = L.id, o = { id, status: d.s, keterangan: L.ket || "" };
    if (d.s === "selesai") { if (L.berkas) o.berkas = { nama: L.berkas.nama, isi: L.berkas.isi }; else if ((L.tautan || "").trim()) o.tautan = L.tautan.trim(); }
    jalankan(async () => { await api("tl.status", o); S.tl = await api("tl.daftar"); S.tugas = null; S.nilai = null; S.laci = { jenis: "tl", id }; toast(d.s === "selesai" ? "Terkirim untuk verifikasi KPS/GKM." : "Status diperbarui."); });
  },
  tlVerif(d) {
    const L = S.laci, id = L.id;
    jalankan(async () => { await api("tl.verifikasi", { id, setuju: d.v === "1", catatan: L.catatan || "" }); S.tl = await api("tl.daftar"); S.tugas = null; S.nilai = null; S.laci = { jenis: "tl", id }; toast(d.v === "1" ? "Tindak lanjut terverifikasi." : "Dikembalikan ke penanggung jawab."); });
  },
  tlHapus() {
    const id = S.laci.id; if (!confirm("Hapus poin tindak lanjut ini?")) return;
    jalankan(async () => { await api("tl.hapus", { id }); S.tl = await api("tl.daftar"); S.laci = null; S.nilai = null; toast("Poin dihapus."); });
  },
  async tlLihatBukti(d) {
    const w = penampil();
    try { const j = await api("tl.bukti", { id: d.id }); const blob = new Blob([dariBase64(j.isi)], { type: j.mime }); if (w && /pdf|image/.test(j.mime)) w.tampil(URL.createObjectURL(blob), j.nama, j.mime); else { if (w) w.close(); simpanBerkas(blob, j.nama); } }
    catch (e) { if (w) w.close(); toast(e.message); }
  }
});

/* --- Rilis 2 (v0.32.0): risalah, daftar hadir, pindaian --- */
const ST_RISALAH = { "": "Belum dibuat", draf: "Draf", final: "Final" };
function risalahAwal(r) {
  const x = r.risalah ? JSON.parse(JSON.stringify(r.risalah)) : { pimpinan: "", notulis: "", mulai: r.jamMulai || "", selesai: r.jamSelesai || "", jumlahHadir: r.rekap && r.rekap.hadir ? r.rekap.hadir : "", lain: "", agenda: [] };
  x.agenda = (r.agenda || []).map((a, i) => Object.assign({ pembahasan: "", keputusan: [] }, x.agenda[i] || {}));
  x.agenda.forEach(a => a.keputusan.forEach(k => { k.butirTeks = (k.butir || []).join(", "); }));
  return x;
}
function bagianRisalah(r) {
  if (r.status !== "terbit" && !r.risalah) return "";
  const kel = !!r.rekap, R = r.risalah, dis = S.sibuk ? "disabled" : "";
  const kep = R && R.status === "final" ? R.agenda.flatMap((a, i) => a.keputusan.map(k => ({ ...k, i }))) : [];
  const berkas = k => { const b = (r.berkas || {})[k]; return b ? (b.t === "tautan" ? `<a href="${esc(b.url)}" target="_blank" rel="noopener noreferrer">Buka tautan</a>` : `<button class="lnk" data-act="rapatBerkasLihat" data-j="${k}">${esc(b.nama)}</button>`) + ` <span class="muted">${esc(tglJam(b.w))}</span>` : '<span class="muted">belum ada</span>'; };
  const unggah = (k, l) => r.bolehUnggah && (k !== "risalah" || (R && R.status === "final")) ? `<div class="row small" style="gap:6px;flex-wrap:wrap;margin-top:4px"><label class="btn sm" ${S.sibuk ? 'aria-disabled="true"' : ""}>Unggah ${l}<input type="file" data-rbk="${k}" accept=".pdf,.jpg,.jpeg,.png,.docx" hidden ${dis}></label><button class="btn sm" data-act="rapatBerkasTautan" data-j="${k}" ${dis}>Tempel tautan</button></div>` : "";
  return `<h3 class="instr-h">Risalah dan bukti rapat</h3>
   <div class="row" style="gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:6px"><span class="chip ${R && R.status === "final" ? "s-disetujui" : R ? "s-revisi" : "s-draf"}">Risalah: ${ST_RISALAH[R ? R.status : ""]}</span>
    ${r.bolehRisalah ? tombol("risalahTulis", R ? "Lanjutkan risalah" : "Tulis risalah", R ? "" : "primary") : ""}${r.bolehFinal ? tombol("risalahFinal", "Finalkan risalah", "primary") : ""}</div>
   <div class="row" style="gap:6px;flex-wrap:wrap">${kel ? `<button class="btn sm" data-act="risalahWord" ${dis}>${R ? "Risalah (Word)" : "Templat risalah (Word)"}</button>` : ""}${R && R.status === "final" ? `<button class="btn sm" data-act="risalahPdf" ${dis}>Risalah (PDF)</button>` : ""}${kel ? `<button class="btn sm" data-act="hadirPdf" ${dis}>Daftar hadir (PDF)</button>` : ""}</div>
   ${kep.length ? `<div class="small" style="margin-top:8px"><b>Keputusan rapat</b>${kep.map(k => `<div style="margin-top:4px">• ${esc(k.t)}${k.tl ? ` <button class="lnk" data-act="tlBukaDari" data-id="${k.tl}">→ tindak lanjut</button>` : ' <span class="muted">(informasi)</span>'}</div>`).join("")}</div>` : ""}
   ${kel ? `<div class="small" style="margin-top:8px;display:grid;gap:8px"><div><b>Pindaian risalah bertanda tangan:</b> ${berkas("risalah")}${unggah("risalah", "pindaian risalah")}${!R || R.status !== "final" ? `<div class="muted">Bisa diunggah setelah risalah final.</div>` : ""}${r.slotBank ? `<div class="muted">Otomatis disalin ke Bank Dokumen › ${esc(r.slotBank)}.</div>` : ""}</div>
     <div><b>Daftar hadir bertanda tangan:</b> ${berkas("hadir")}${unggah("hadir", "daftar hadir")}</div>
     ${S.laci.tautJ ? `<div class="row" style="gap:6px"><input id="rbTaut" type="url" placeholder="https://drive.google.com/…" aria-label="Tautan berkas" style="flex:1">${tombol("rapatBerkasTautanSimpan", "Simpan tautan", "primary sm")}</div>` : ""}</div>` : ""}`;
}
function laciRisalahForm() {
  const L = S.laci, x = L.f, r = L.r, peg = r.pegawai || [], dis = S.sibuk ? "disabled" : "";
  const fld = (k, l, type, ph) => `<div class="field"><label for="rs_${k}">${l}</label><input id="rs_${k}" data-rs="${k}" type="${type || "text"}" value="${esc(x[k] ?? "")}" placeholder="${esc(ph || "")}"></div>`;
  const kepBaris = (k, i, j) => `<div class="card" style="padding:8px;margin:6px 0"><div class="row" style="gap:6px;align-items:flex-start"><span class="num small" style="padding-top:8px">${j + 1}.</span>
     <div style="flex:1;display:grid;gap:6px"><input data-rk="${i}.${j}" data-rkf="t" data-saran="kep:${i}.${j}" data-saran-out="sk_${i}_${j}" type="text" value="${esc(k.t || "")}" placeholder="Keputusan, mis. Revisi CPL bahasa asing" aria-label="Keputusan ${j + 1} agenda ${i + 1}">
      <div class="grid g3" style="gap:6px"><select data-rk="${i}.${j}" data-rkf="pj" aria-label="Penanggung jawab"><option value="">Tanpa PJ (informasi)</option>${peg.map(o => `<option value="${o.id}" ${k.pj === o.id ? "selected" : ""}>${esc(namaPendek(o.nama))}</option>`).join("")}</select>
       <input data-rk="${i}.${j}" data-rkf="tenggat" type="date" value="${esc(k.tenggat || "")}" aria-label="Tenggat"><input data-rk="${i}.${j}" data-rkf="butirTeks" type="text" value="${esc(k.butirTeks || "")}" placeholder="Butir, mis. 7" aria-label="Butir Matriks"></div>
      <div id="sk_${i}_${j}">${htmlSaran("kep:" + i + "." + j, k.t, angkaButir(k.butirTeks))}</div></div>
     <button class="btn sm bad" data-act="risalahKepHapus" data-i="${i}" data-j="${j}" aria-label="Hapus keputusan" ${dis}>×</button></div></div>`;
  return `<div class="overlay" data-act="tutupLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Risalah rapat" style="width:min(780px,100%)">
   <div class="dh"><h2>Risalah: ${esc(r.judul)}</h2><button class="iconbtn" data-act="tutup" aria-label="Tutup">✕</button></div>
   <p class="small muted" style="margin:0 0 8px">${esc(tglPanjang(r.tgl))} · ${esc(jamRapat(r))} · ${esc(r.tempat || "Daring")}. Keputusan yang punya penanggung jawab otomatis menjadi poin tindak lanjut saat KPS memfinalkan risalah.</p>
   <div class="grid g2" style="gap:10px">${fld("pimpinan", "Pimpinan rapat" + wajib, "text", "Contoh: Koordinator Program Studi")}${fld("notulis", "Notulis" + wajib, "text", "Nama notulis")}</div>
   <div class="grid g3" style="gap:10px">${fld("mulai", "Mulai", "time")}${fld("selesai", "Selesai", "time")}${fld("jumlahHadir", "Jumlah hadir", "number")}</div>
   ${x.agenda.map((a, i) => `<section class="card" style="padding:12px;margin:10px 0"><h3 style="margin:0 0 6px;font-size:.95rem">Agenda ${i + 1}. ${esc(r.agenda[i].t)} ${(r.agenda[i].butir || []).map(n => iBtn("b" + n, "Butir " + n)).join("")}</h3>
     <div class="field"><label for="rs_p${i}">Pembahasan</label><textarea id="rs_p${i}" data-rp="${i}" rows="4" placeholder="Ringkasan pembahasan, pendapat peserta, data yang dipakai">${esc(a.pembahasan || "")}</textarea></div>
     <b class="small">Keputusan / tindak lanjut</b>${a.keputusan.map((k, j) => kepBaris(k, i, j)).join("")}
     <button class="btn sm" data-act="risalahKepTambah" data-i="${i}" ${dis}>+ Keputusan</button></section>`).join("")}
   <div class="field"><label for="rs_lain">Lain-lain</label><textarea id="rs_lain" data-rs="lain" rows="3">${esc(x.lain || "")}</textarea></div>
   ${galatHtml()}<div class="row" style="justify-content:flex-end;gap:6px;margin-top:10px;flex-wrap:wrap"><button class="btn" data-act="tutup" ${dis}>Batal</button>${tombol("risalahSimpan", "Simpan draf", "")}${peranAktif() === "kps" ? tombol("risalahSimpan", "Simpan dan finalkan", "primary", 'data-final="1"') : ""}</div></div></div>`;
}
function salinRisalah() {
  const L = S.laci; if (!L || L.jenis !== "risalahForm") return;
  document.querySelectorAll("[data-rs]").forEach(el => { L.f[el.dataset.rs] = el.value; });
  document.querySelectorAll("[data-rp]").forEach(el => { L.f.agenda[Number(el.dataset.rp)].pembahasan = el.value; });
  document.querySelectorAll("[data-rk]").forEach(el => { const [i, j] = el.dataset.rk.split(".").map(Number); L.f.agenda[i].keputusan[j][el.dataset.rkf] = el.value; });
}
document.addEventListener("input", e => { if (S.laci && S.laci.jenis === "risalahForm" && (e.target.dataset.rs || e.target.dataset.rp !== undefined || e.target.dataset.rk)) salinRisalah(); });
document.addEventListener("change", e => {
  const t = e.target, L = S.laci;
  if (L && L.jenis === "risalahForm" && t.dataset.rk) { salinRisalah(); return; }
  if (!L || L.jenis !== "rapat" || !t.dataset.rbk) return;
  const f = t.files && t.files[0], j = t.dataset.rbk; t.value = "";
  if (!f) return;
  if (f.size > 10 * 1024 * 1024) { toast("Ukuran file maksimal 10 MB. Pakai tautan untuk berkas besar."); return; }
  bacaBase64(f).then(isi => kirimBerkasRapat(j, { berkas: { nama: f.name, isi } }), err => toast(err.message));
});
function kirimBerkasRapat(j, o) {
  const id = S.laci.r.id;
  jalankan(async () => { const h = await api("rapat.berkas", Object.assign({ id, jenis: j }, o)); S.bank = null; toast(h.bank ? "Tersimpan dan otomatis masuk Bank Dokumen › " + h.bank + "." : "Berkas tersimpan."); bukaRapat(id); });
}
function teksKep(r) { return (r.risalah ? r.risalah.agenda : []).map(a => a.keputusan); }
function namaPj(r, id) { const o = (r.pegawai || []).find(x => x.id === id); return o ? o.nama : ""; }
function risalahDocx(r, kop) {
  const R = r.risalah, d = UPW_DOCX.baru(), kosong = "…………………………………………";
  d.p("RISALAH RAPAT", { b: 1, ukuran: 14, rata: "center", sesudah: 12 });
  d.tabel([["Nama rapat", r.judul], ["Jenis", r.jenisL], ["Hari/tanggal", tglPanjang(r.tgl)], ["Waktu", R ? [R.mulai, R.selesai].filter(Boolean).join("–") + " WITA" : jamRapat(r)], ["Tempat", [r.tempat, r.tautan ? "Daring: " + r.tautan : ""].filter(Boolean).join("; ")],
    ["Pimpinan rapat", (R && R.pimpinan) || kosong], ["Notulis", (R && R.notulis) || kosong], ["Jumlah hadir", R && R.jumlahHadir !== "" ? String(R.jumlahHadir) + " orang (daftar hadir terlampir)" : kosong + " orang"], ["Kode undangan", r.kode || "–"]], { judul: false, ukuran: 10, lebar: [4, 10] });
  r.agenda.forEach((a, i) => {
    const g = R ? R.agenda[i] || { pembahasan: "", keputusan: [] } : { pembahasan: "", keputusan: [] };
    d.p("Agenda " + (i + 1) + ". " + a.t, { b: 1, sebelum: 12, sesudah: 4, tetap: 1 });
    d.p("Pembahasan:", { i: 1, sesudah: 2 });
    const par = String(g.pembahasan || "").split(/\n+/).map(s => s.trim()).filter(Boolean);
    if (par.length) par.forEach(s => d.p(s, { rata: "justify" })); else for (let k = 0; k < 4; k++) d.p(kosong + kosong);
    d.p("Keputusan / tindak lanjut:", { i: 1, sebelum: 6, sesudah: 2 });
    const rows = [["No", "Keputusan", "Penanggung jawab", "Tenggat"]].concat(g.keputusan.length ? g.keputusan.map((k, n) => [String(n + 1), k.t, namaPj(r, k.pj) || "–", k.tenggat ? tglPendek(k.tenggat) : "–"]) : [["1", "", "", ""], ["2", "", "", ""], ["3", "", "", ""]]);
    d.tabel(rows, { judul: 1, ukuran: 10, lebar: [1.2, 7.3, 3.5, 2.5] });
  });
  d.p("Lain-lain", { b: 1, sebelum: 12, sesudah: 4 });
  (R && R.lain ? R.lain.split(/\n+/).filter(Boolean) : [kosong + kosong, kosong + kosong]).forEach(s => d.p(s));
  d.p("", { sesudah: 12 });
  d.tabel([["Pimpinan rapat", "Notulis"], ["\n\n\n" + ((R && R.pimpinan) || kosong), "\n\n\n" + ((R && R.notulis) || kosong)]], { judul: 1, ukuran: 11, lebar: [7, 7] });
  d.p("Lampiran: daftar hadir rapat.", { i: 1, sebelum: 8, ukuran: 10 });
  return d.blob({ judul: "Risalah " + r.judul, kaki: "Risalah " + r.judul + " – " + r.tgl, kop });
}
function kertasRisalah(r) {
  const R = r.risalah;
  return `<div class="kertas">${kopHtml()}<p style="text-align:center;font-weight:700;font-size:13pt;margin:0 0 12px">RISALAH RAPAT</p>
    ${tabelBaris([["Nama rapat", esc(r.judul)], ["Hari/tanggal", esc(tglPanjang(r.tgl))], ["Waktu", esc([R.mulai, R.selesai].filter(Boolean).join("–") + " WITA")], ["Tempat", esc([r.tempat, r.tautan ? "Daring" : ""].filter(Boolean).join("; "))],
      ["Pimpinan rapat", esc(R.pimpinan)], ["Notulis", esc(R.notulis)], ["Jumlah hadir", esc(R.jumlahHadir === "" ? "–" : R.jumlahHadir + " orang")], ["Kode undangan", esc(r.kode || "–")]])}
    ${r.agenda.map((a, i) => { const g = R.agenda[i] || { pembahasan: "", keputusan: [] }; return `<p style="font-weight:700;margin:12px 0 4px">Agenda ${i + 1}. ${esc(a.t)}</p><p style="text-align:justify;white-space:pre-wrap;margin:0 0 6px">${esc(g.pembahasan || "–")}</p>
      ${g.keputusan.length ? `<table class="lamp"><thead><tr><th>No</th><th>Keputusan</th><th>Penanggung jawab</th><th>Tenggat</th></tr></thead><tbody>${g.keputusan.map((k, n) => `<tr><td class="c">${n + 1}</td><td>${esc(k.t)}</td><td>${esc(namaPj(r, k.pj) || "–")}</td><td>${esc(k.tenggat ? tglPendek(k.tenggat) : "–")}</td></tr>`).join("")}</tbody></table>` : ""}`; }).join("")}
    ${R.lain ? `<p style="font-weight:700;margin:12px 0 4px">Lain-lain</p><p style="white-space:pre-wrap">${esc(R.lain)}</p>` : ""}
    <table style="width:100%;margin-top:28px"><tr><td style="text-align:center;width:50%">Pimpinan rapat<br><br><br><br><b><u>${esc(R.pimpinan)}</u></b></td><td style="text-align:center">Notulis<br><br><br><br><b><u>${esc(R.notulis)}</u></b></td></tr></table>
    <p style="font-size:9pt;color:#555;margin-top:16px">Risalah ini final di Repositori UPW${R.finalPada ? " pada " + esc(tglSurat(R.finalPada.slice(0, 10))) : ""}. Lampiran: daftar hadir.</p></div>`;
}
function kertasHadir(r) {
  const daftar = (r.rekap ? r.rekap.daftar : []).map(x => [x.nama, x.no ? nipTampil(x.no) : "", x.unsur]).concat(((r.peserta || {}).tamu || []).map(t => [t.nama, "", t.instansi || "Tamu"]));
  for (let i = 0; i < 5; i++) daftar.push(["", "", ""]);
  return `<div class="kertas">${kopHtml()}<p style="text-align:center;font-weight:700;font-size:13pt;margin:0">DAFTAR HADIR</p><p style="text-align:center;margin:2px 0 10px"><b>${esc(r.judul)}</b><br>${esc(tglPanjang(r.tgl))} · ${esc(jamRapat(r))} · ${esc(r.tempat || "Daring")}</p>
    <table class="lamp"><thead><tr><th>No</th><th>Nama</th><th>NIP / NIM</th><th>Unsur / Instansi</th><th style="width:22%">Tanda tangan</th></tr></thead>
    <tbody>${daftar.map((d, n) => `<tr style="height:30px"><td class="c">${n + 1}</td><td>${esc(d[0])}</td><td>${esc(d[1])}</td><td>${esc(d[2])}</td><td>${n % 2 ? '<span style="padding-left:40%">' + (n + 1) + ".</span>" : (n + 1) + "."}</td></tr>`).join("")}</tbody></table>
    <p style="font-size:9pt;color:#555;margin-top:10px">Kode undangan: ${esc(r.kode || "–")}. Baris kosong untuk peserta yang tidak tercantum.</p></div>`;
}
Object.assign(AKSI, {
  risalahTulis() { const r = S.laci.r; S.laci = { jenis: "risalahForm", r, f: risalahAwal(r) }; S.galat = ""; render(); },
  risalahKepTambah(d) { salinRisalah(); S.laci.f.agenda[Number(d.i)].keputusan.push({ t: "", pj: "", tenggat: "", butirTeks: "" }); render(); },
  risalahKepHapus(d) { salinRisalah(); S.laci.f.agenda[Number(d.i)].keputusan.splice(Number(d.j), 1); render(); },
  risalahSimpan(d) {
    salinRisalah();
    const L = S.laci, r = L.r, final = d.final === "1";
    if (final && !confirm("Finalkan risalah? Setelah final risalah tidak bisa diubah, dan setiap keputusan yang punya penanggung jawab menjadi poin tindak lanjut.")) return;
    const risalah = Object.assign({}, L.f, { agenda: L.f.agenda.map(a => ({ pembahasan: a.pembahasan, keputusan: a.keputusan.map(k => ({ t: k.t, pj: k.pj, tenggat: k.tenggat, butir: String(k.butirTeks || "").split(/[\s,;]+/).filter(Boolean) })) })) });
    jalankan(async () => {
      await api("rapat.risalahSimpan", { id: r.id, risalah });
      let pesan = "Draf risalah tersimpan.";
      if (final) { const h = await api("rapat.risalahFinal", { id: r.id }); pesan = "Risalah final. " + h.tindakLanjut + " keputusan menjadi poin tindak lanjut."; S.tl = null; S.tugas = null; S.nilai = null; }
      toast(pesan); bukaRapat(r.id);
    });
  },
  risalahFinal() {
    const r = S.laci.r;
    if (!confirm("Finalkan risalah? Setelah final risalah tidak bisa diubah, dan setiap keputusan yang punya penanggung jawab menjadi poin tindak lanjut.")) return;
    jalankan(async () => { const h = await api("rapat.risalahFinal", { id: r.id }); S.tl = null; S.tugas = null; S.nilai = null; toast("Risalah final. " + h.tindakLanjut + " keputusan menjadi poin tindak lanjut."); bukaRapat(r.id); });
  },
  async risalahWord() { const r = S.laci.r; try { await simpanBerkas(risalahDocx(r, await kopWord()), (r.risalah ? "Risalah " : "Templat risalah ") + r.judul.replace(/[\\/:*?"<>|]/g, "-") + " " + r.tgl + ".docx"); } catch (e) { toast(e.message); } },
  risalahPdf() { cetakSurat(kertasRisalah(S.laci.r)); },
  hadirPdf() { cetakSurat(kertasHadir(S.laci.r)); },
  rapatBerkasTautan(d) { S.laci.tautJ = S.laci.tautJ === d.j ? "" : d.j; render(); fokus("rbTaut"); },
  rapatBerkasTautanSimpan() { const url = ($("rbTaut") || {}).value || "", j = S.laci.tautJ; S.laci.tautJ = ""; kirimBerkasRapat(j, { tautan: url.trim() }); },
  async rapatBerkasLihat(d) {
    const w = penampil();
    try { const j = await api("rapat.berkasLihat", { id: S.laci.r.id, jenis: d.j }); const blob = new Blob([dariBase64(j.isi)], { type: j.mime }); if (w && /pdf|image/.test(j.mime)) w.tampil(URL.createObjectURL(blob), j.nama, j.mime); else { if (w) w.close(); simpanBerkas(blob, j.nama); } }
    catch (e) { if (w) w.close(); toast(e.message); }
  }
});

/* ---------- saran butir Matriks dan jenis kegiatan (v0.33.0, tanpa AI; mesin di saran.js dari alat/saran.mjs) ---------- */
let janjiSaran = null;
function muatSaran() {
  if (window.UPW_SARAN) return Promise.resolve();
  if (!janjiSaran) janjiSaran = new Promise((ok, no) => {
    const sc = document.createElement("script"); sc.src = "saran.js?v=" + encodeURIComponent(K.versi);
    sc.onload = () => { ok(); if (S.laci || ["penilaian"].includes(S.view)) render(); }; sc.onerror = () => { janjiSaran = null; no(new Error("Saran butir gagal dimuat.")); };
    document.head.appendChild(sc);
  });
  return janjiSaran;
}
/** Kotak saran: jenis = "agenda:i" | "tl" | "kep:i.j" | "bank" | "kegjenis" | "cari"; teks = isian sumber; kecuali = butir/jenis yang sudah dipilih. */
function htmlSaran(jenis, teks, kecuali, batas) {
  if (!window.UPW_SARAN) { if (String(teks || "").trim().length >= 3) muatSaran().catch(() => {}); return ""; }
  const t = String(teks || "").trim(); if (t.length < 3) return "";
  if (jenis === "kegjenis") {
    const boleh = S.ref ? S.ref.jenis.filter(j => j.boleh).map(j => j.k) : null;
    const h = UPW_SARAN.jenis(t, boleh, 3).filter(x => !(kecuali || []).includes(x.k));
    return h.length ? `<div class="saran-baris"><span class="muted">Saran jenis dari judul:</span>${h.map(x => `<button type="button" class="chip-saran" data-act="saranPilih" data-j="kegjenis" data-k="${x.k}" title="Cocok: ${esc(x.alasan.join(", "))}">${esc(x.l)}</button>`).join("")}</div>` : "";
  }
  let h = UPW_SARAN.butir(t, 6);
  if (jenis === "bank" && S.bankMatriks) h = h.filter(x => S.bankMatriks.some(m => m.n === x.n));
  h = h.filter(x => !(kecuali || []).includes(x.n)).slice(0, batas || 4);
  if (!h.length) return jenis === "cari" ? `<p class="small muted">Belum ada butir yang cocok. Coba kata lain, misalnya "kepuasan alumni", "RPS", "rapat industri".</p>` : "";
  if (jenis === "cari") return `<div class="list">${h.map(x => `<div class="item"><div class="body"><div class="title">${x.n}. ${esc(x.nm)} ${iBtn("b" + x.n, x.nm)}</div><div class="meta"><span>Cocok: ${esc(x.alasan.join(", "))}</span></div></div><button class="btn sm" data-act="saranPilih" data-j="cari" data-n="${x.n}">Lihat di tabel</button></div>`).join("")}</div>`;
  return `<div class="saran-baris"><span class="muted">Saran butir:</span>${h.map(x => `<span class="chip-saran-w"><button type="button" class="chip-saran" data-act="saranPilih" data-j="${esc(jenis)}" data-n="${x.n}" title="Cocok: ${esc(x.alasan.join(", "))}">+ ${x.n}. ${esc(x.nm)}</button>${iBtn("b" + x.n, x.nm)}</span>`).join("")}</div>`;
}
const angkaButir = s => String(s || "").split(/[\s,;]+/).map(Number).filter(n => n >= 1 && n <= 84);
const tambahAngka = (s, n) => { const l = angkaButir(s); if (!l.includes(n)) l.push(n); return l.join(", "); };
/** Isian yang punya kotak saran: data-saran="jenis" + data-saran-out="idKotak". Kotak diperbarui tanpa menggambar ulang (fokus tetap). */
let jedaSaran = null;
document.addEventListener("input", e => {
  const el = e.target, jenis = el.dataset && el.dataset.saran; if (!jenis) return;
  clearTimeout(jedaSaran);
  jedaSaran = setTimeout(() => muatSaran().then(() => {
    const kotak = $(el.dataset.saranOut); if (!kotak) return;
    let kecuali = [];
    if (jenis.startsWith("agenda:") && S.laci && S.laci.f) kecuali = (S.laci.f.agenda[Number(jenis.slice(7))] || {}).butir || [];
    else if (jenis === "tl" && S.laci && S.laci.f) kecuali = angkaButir(S.laci.f.butirTeks);
    else if (jenis.startsWith("kep:") && S.laci && S.laci.f) { const [i, j] = jenis.slice(4).split(".").map(Number); kecuali = angkaButir(((S.laci.f.agenda[i] || {}).keputusan || [])[j]?.butirTeks); }
    else if (jenis === "kegjenis" && S.form) kecuali = [S.form.jenis];
    if (jenis === "cari") S.cariButir = el.value;
    kotak.innerHTML = htmlSaran(jenis, el.value, kecuali, jenis === "cari" ? 6 : 4);
  }).catch(() => {}), 220);
});
Object.assign(AKSI, {
  saranPilih(d) {
    const j = d.j, n = Number(d.n), L = S.laci;
    if (j.startsWith("agenda:")) { salinIsianRapat(); const a = L.f.agenda[Number(j.slice(7))]; a.butir = [...new Set([...(a.butir || []), n])]; render(); return; }
    if (j === "tl") { document.querySelectorAll("[data-tf]").forEach(el => { L.f[el.dataset.tf] = el.value; }); L.f.butirTeks = tambahAngka(L.f.butirTeks, n); render(); return; }
    if (j.startsWith("kep:")) { salinRisalah(); const [i, k] = j.slice(4).split(".").map(Number); const kp = L.f.agenda[i].keputusan[k]; kp.butirTeks = tambahAngka(kp.butirTeks, n); render(); return; }
    if (j === "bank") { const s = $("bankBaruN"); if (s) s.value = String(n); L.n = n; L.namaKetik = ($("bankBaruNama") || {}).value || ""; L.pj = ($("bankBaruPj") || {}).value || ""; render(); return; }
    if (j === "kegjenis") { AKSI.pilihJenis({ j: d.k }); return; }
    if (j === "cari") { S.cariButir = ($("cariButir") || {}).value || ""; S.nilaiF = ""; render(); setTimeout(() => { const tr = document.querySelector(`[data-baris-butir="${n}"]`); if (tr) { tr.scrollIntoView({ block: "center" }); tr.classList.add("sorot"); setTimeout(() => tr.classList.remove("sorot"), 2500); } }, 50); }
  },
  rapatButirLepas(d) { salinIsianRapat(); const a = S.laci.f.agenda[Number(d.i)]; a.butir = (a.butir || []).filter(x => x !== Number(d.n)); render(); }
});

/* ---------- tombol (i): penjelasan instrumen LAMWisata (v0.30.0) ---------- */
/* Teks instrumen ada di instrumen.js (dibuat alat/instrumen.mjs), dimuat saat tombol (i) pertama kali ditekan.
   ref: "b16" = butir Lampiran 1 nomor 16, "t2" = Tabel iLKPS kode 2, "d10" = butir DED 10, "def:dosen" = definisi jenis dosen; beberapa ref dipisah koma. */
const iBtn = (ref, label) => `<button type="button" class="ibtn" data-act="instr" data-ref="${esc(ref)}" title="Menurut instrumen LAMWisata" aria-label="Penjelasan instrumen LAMWisata${label ? ": " + esc(label) : ""}">i</button>`;
const iTombol = (ref, teks) => `<button type="button" class="btn sm ibtn-l" data-act="instr" data-ref="${esc(ref)}"><span class="ibtn" aria-hidden="true">i</span>${esc(teks || "Menurut instrumen")}</button>`;
const REF_DP = { kurikulum: "t4,b7,b8,b24,b16", tim: "b16,b17,b29,t1,t2,t3,t6", mkp: "b8,b22,b25", praktisi: "b16,t2", dosents: "t1,t6,b10,b11,b12,b13,b14,b15,b29",
  sdos: "def:dosen,b10,b17,t1,t3", dokd: "b12,b13,b14,b15", lulusan: "t8,t9,t10a,t10b,t10c,b34,b35,b36,b37,b38,b39,b40,b41", pmb: "b64", keuangan: "t21,b66,b67,b68,b69,b70" };
let janjiInstrumen = null;
function muatInstrumen() {
  if (window.UPW_INSTRUMEN) return Promise.resolve();
  if (!janjiInstrumen) janjiInstrumen = new Promise((ok, no) => {
    const sc = document.createElement("script"); sc.src = "instrumen.js?v=" + encodeURIComponent(K.versi);
    sc.onload = () => ok(); sc.onerror = () => { janjiInstrumen = null; no(new Error("Teks instrumen gagal dimuat. Periksa koneksi lalu coba lagi.")); };
    document.head.appendChild(sc);
  });
  return janjiInstrumen;
}
function judulRef(ref) {
  const I = window.UPW_INSTRUMEN, m = /^([btd])(.+)$/.exec(ref);
  if (ref === "def:dosen") return "Jenis dosen (DT, DTPT, DTPS, DTT, praktisi)";
  if (!m || !I) return ref;
  if (m[1] === "b") { const b = I.butir[m[2]]; return b ? `Butir ${b.n}. ${b.nm}` : ref; }
  if (m[1] === "t") { const t = I.tabel[m[2]]; return t ? t.judul : "Tabel " + m[2]; }
  const d = I.ded[m[2]]; return d ? `DED butir ${d.n}. ${d.nm}` : ref;
}
const LABEL_SKOR = k => k.includes("-") ? `Skor ${k.split("-")[0]}–${k.split("-")[1]}` : `Skor ${k}`;
function isiInstrButir(b) {
  const I = window.UPW_INSTRUMEN, CARA = { a: "dihitung otomatis dari data", m: "dinilai GKM dengan rubrik", c: "gabungan data dan penilaian GKM" };
  const bag = x => `<div class="instr-bag">${x.i ? `<p class="instr-ind">${esc(x.i)}</p>` : ""}
    ${x.s.length ? `<div class="tbl-wrap"><table class="instr-skor"><tbody>${x.s.map(([k, v]) => `<tr><th scope="row">${LABEL_SKOR(k)}</th><td>${esc(v)}</td></tr>`).join("")}</tbody></table></div>` : ""}
    ${x.k.length ? `<div class="instr-ket">${x.k.map(v => `<div>${esc(v)}</div>`).join("")}</div>` : ""}</div>`;
  return `<div class="row" style="flex-wrap:wrap;gap:6px;margin-bottom:6px"><span class="tag t">${esc(I.kriteria[b.k] || b.k)}</span><span class="tag">bobot ${String(b.w).replace(".", ",")}</span><span class="tag">${CARA[b.cara] || ""}</span></div>
   <h3 class="instr-h">Elemen di Matriks</h3><p style="margin:0 0 8px">${esc(b.el)}</p>
   <h3 class="instr-h">Indikator dan kriteria skor</h3>${b.b.map(bag).join("")}
   ${b.r ? `<p class="small"><b>Rumus skor butir:</b> <span class="mono">${esc(b.r)}</span></p>` : ""}
   ${b.catatan ? `<p class="small muted">${esc(b.catatan)}</p>` : ""}
   <div class="callout"><b>Yang sebaiknya dilakukan</b><div style="margin-top:4px"><b>Agar skor 4:</b> ${esc(b.s4)}</div><div style="margin-top:4px"><b>Saran:</b> ${esc(b.sr)}</div><div class="small muted" style="margin-top:4px">Ringkasan dan saran ini dari prodi (aplikasi), bukan teks instrumen. Sumber data: ${esc(b.src)}.</div></div>
   <div class="row" style="flex-wrap:wrap;gap:6px">${[["d" + b.ded, "Petunjuk DED butir " + b.ded]].concat(b.tabel.filter(t => I.tabel[t]).map(t => ["t" + t, I.tabel[t].judul])).map(([r, l]) => `<button class="btn sm" data-act="instrKe" data-ref="${r}">${esc(l)}</button>`).join("")}</div>`;
}
function isiInstrTabel(t) {
  const I = window.UPW_INSTRUMEN;
  return `${t.p ? `<h3 class="instr-h">Petunjuk pengisian (DED)</h3><p>${esc(t.p)}</p>` : ""}
   ${t.k.length ? `<h3 class="instr-h">Keterangan kolom (DED)</h3><div class="instr-ket">${t.k.map(v => `<div>${esc(v)}</div>`).join("")}</div>` : (t.p ? "" : `<p class="small muted">DED tidak memberi keterangan kolom tambahan untuk tabel ini.</p>`)}
   ${t.butir.length ? `<h3 class="instr-h">Dipakai untuk butir Matriks</h3><div class="row" style="flex-wrap:wrap;gap:6px">${t.butir.map(n => `<button class="btn sm" data-act="instrKe" data-ref="b${n}">${n}. ${esc(I.butir[n].nm)}</button>`).join("")}</div>` : ""}
   ${t.ded.length ? `<h3 class="instr-h">Disisipkan di DED butir</h3><div class="row" style="flex-wrap:wrap;gap:6px">${t.ded.map(n => `<button class="btn sm" data-act="instrKe" data-ref="d${n}">${n}. ${esc(I.ded[n].nm)}</button>`).join("")}</div>` : ""}`;
}
function isiInstrDed(d) {
  const I = window.UPW_INSTRUMEN;
  return `<h3 class="instr-h">Petunjuk DED</h3><p style="white-space:pre-wrap">${esc(d.p)}</p>
   ${d.butir.length ? `<h3 class="instr-h">Butir Matriks yang dinilai dari narasi ini</h3><div class="row" style="flex-wrap:wrap;gap:6px">${d.butir.map(n => `<button class="btn sm" data-act="instrKe" data-ref="b${n}">${n}. ${esc(I.butir[n].nm)}</button>`).join("")}</div>` : ""}
   ${d.t.length ? `<h3 class="instr-h">Tabel iLKPS di butir ini</h3><div class="row" style="flex-wrap:wrap;gap:6px">${d.t.filter(t => I.tabel[t]).map(t => `<button class="btn sm" data-act="instrKe" data-ref="t${t}">${esc(I.tabel[t].judul)}</button>`).join("")}</div>` : ""}`;
}
function isiInstrDef() {
  const I = window.UPW_INSTRUMEN;
  return `<p class="small muted">Istilah yang dipakai DED dan Matriks. Pilih status dosen di biodata sesuai definisi ini; status menentukan tabel iLKPS tempat dosen dicatat.</p>
   <div class="instr-ket">${I.definisi.dosen.map(([k, v]) => `<div><b>${esc(k)}</b>: ${esc(v.replace(/^[A-Z]+ ?= ?/, ""))}</div>`).join("")}</div>
   <div class="callout small">Di aplikasi: <b>DTPS</b> dan <b>dosen tetap PT di luar prodi</b> masuk Tabel 1, <b>dosen tidak tetap</b> masuk Tabel 3, <b>dosen industri/praktisi</b> masuk Tabel 2 (isi lewat Data Prodi › Praktisi, tanpa akun).</div>
   <div class="row" style="flex-wrap:wrap;gap:6px">${["t1", "t2", "t3", "b10", "b16", "b17"].map(r => `<button class="btn sm" data-act="instrKe" data-ref="${r}">${esc(judulRef(r))}</button>`).join("")}</div>`;
}
function laciInstr() {
  const X = S.instr, I = window.UPW_INSTRUMEN;
  let isi;
  if (!I) isi = `<div class="memuat">Memuat teks instrumen…</div>`;
  else {
    const ref = X.ref, m = /^([btd])(.+)$/.exec(ref);
    isi = ref === "def:dosen" ? isiInstrDef() : !m ? "" : m[1] === "b" ? (I.butir[m[2]] ? isiInstrButir(I.butir[m[2]]) : "") : m[1] === "t" ? (I.tabel[m[2]] ? isiInstrTabel(I.tabel[m[2]]) : "") : (I.ded[m[2]] ? isiInstrDed(I.ded[m[2]]) : "");
    if (!isi) isi = `<p class="small muted">Belum ada teks instrumen untuk bagian ini.</p>`;
  }
  const daftar = X.daftar.length > 1 ? `<div class="instr-pilih" role="tablist" aria-label="Bagian instrumen">${X.daftar.map(r => `<button role="tab" class="btn sm" data-act="instrKe" data-ref="${r}" data-akar="1" aria-selected="${r === X.ref && !X.riwayat.length}">${esc(I ? judulRef(r) : r)}</button>`).join("")}</div>` : "";
  return `<div class="overlay instr-lapis" data-act="instrLuar"><div class="drawer" role="dialog" aria-modal="true" aria-label="Menurut instrumen LAMWisata" style="width:min(720px,100%)">
   <div class="dh"><div><div class="small muted">Menurut instrumen LAMWisata · Unggul Sarjana Terapan</div><h2 style="margin:2px 0 0">${esc(I ? judulRef(X.ref) : "Instrumen")}</h2></div><button class="iconbtn" data-act="instrTutup" aria-label="Tutup">✕</button></div>
   ${daftar}${X.riwayat.length ? `<div><button class="btn sm" data-act="instrKembali">← Kembali</button></div>` : ""}
   <div class="instr-isi">${isi}</div>
   ${I ? `<p class="small muted" style="margin-top:auto;padding-top:10px">${esc(I.sumber)}</p>` : ""}</div></div>`;
}
Object.assign(AKSI, {
  instr(d) {
    const daftar = String(d.ref || "").split(",").map(x => x.trim()).filter(Boolean);
    if (!daftar.length) return;
    S.instr = { daftar, ref: daftar[0], riwayat: [] }; render();
    muatInstrumen().then(() => { if (S.instr) render(); }, e => { S.instr = null; render(); toast(e.message); });
  },
  instrKe(d) {
    const X = S.instr; if (!X) return;
    if (d.akar) { X.riwayat = []; X.ref = d.ref; } else { X.riwayat.push(X.ref); X.ref = d.ref; }
    render(); const el = document.querySelector(".instr-lapis .drawer"); if (el) el.scrollTop = 0;
  },
  instrKembali() { const X = S.instr; if (X && X.riwayat.length) { X.ref = X.riwayat.pop(); render(); } },
  instrTutup() { S.instr = null; render(); },
  instrLuar(d, e) { if (e.target.classList.contains("instr-lapis")) { S.instr = null; render(); } }
});

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
