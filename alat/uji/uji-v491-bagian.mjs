// Uji v0.49.1: batas waktu tunggu permintaan + kirim ulang otomatis untuk permintaan baca, kotak "Coba lagi" bila data gagal dimuat
// (Produksi 22 Nov 2026: sesekali satu permintaan tidak pernah dijawab server Google; dulu halaman "Memuat…" selamanya).
import fs from "node:fs";
import vm from "node:vm";
export async function jalankan({ cek }) {
  console.log("65. Batas waktu tunggu dan coba lagi");
  const app = fs.readFileSync("web/aplikasi.js", "utf8"), awal = app.indexOf("const BATAS_BACA"), akhir = app.indexOf("async function apiTunggal");
  cek("permintaan memakai AbortController dengan batas waktu (baca 30 dtk, tulis 120 dtk, berkas besar 300 dtk)", /BATAS_BACA = 30000, BATAS_TULIS = 120000, BATAS_BESAR = 300000/.test(app) && /ac\.abort\(\)/.test(app) && /signal: ac \? ac\.signal/.test(app));
  // jalankan potongan kode dengan fetch tiruan yang tidak pernah menjawab pada percobaan pertama
  let panggil = 0;
  const c = { console, setTimeout: (f, ms) => setTimeout(f, Math.min(ms, 30)), clearTimeout, AbortController, JSON, Error, Math, DOMException,
    K: { api: "/api" }, fetch: (u, o) => { panggil++; return new Promise((res, rej) => { o.signal.addEventListener("abort", () => rej(new DOMException("x", "AbortError"))); if (panggil > 1 && !/gagal/.test(o.body)) res({ json: async () => ({ ok: true, isi: 1 }) }); }); } };
  vm.createContext(c); vm.runInContext(app.slice(awal, akhir) + ";globalThis.kirimAman = kirimAman; globalThis.bolehUlang = bolehUlang;", c);
  const h = await c.kirimAman({ aksi: "bank.data" }, true);
  cek("permintaan baca yang tidak dijawab dibatalkan lalu dikirim ulang sekali dan berhasil", h.ok && panggil === 2);
  panggil = 0; let galat = ""; try { await c.kirimAman({ aksi: "kegiatan.simpan" }, false); } catch (e) { galat = e.message; }
  cek("permintaan tulis tidak dikirim ulang otomatis; pengguna diminta memeriksa apakah sudah tersimpan", panggil === 1 && /tidak menjawab/.test(galat) && /sudah tersimpan/.test(galat));
  panggil = 0; galat = ""; try { await c.kirimAman({ aksi: "survei.daftar", gagal: 1 }, true); } catch (e) { galat = e.message; }
  cek("dua kali tidak dijawab: pesan jelas dengan ajakan Coba lagi", panggil === 2 && /dua kali/.test(galat));
  cek("penggolongan baca/tulis", ["bank.data", "tugas.saya", "kegiatan.daftar", "foto.kecil", "dp.status", "admin.pengguna", "saya", "direktori", "bukti.lihat"].every(a => c.bolehUlang(a))
    && !["kegiatan.simpan", "bukti.unggah", "admin.statusAkun", "admin.statusMhs", "verifikasi.putuskan", "masuk", "admin.hapusAkun", "dp.cplMkImpor"].some(a => c.bolehUlang(a)));
  cek("halaman yang gagal dimuat menampilkan kotak Coba lagi (bukan Memuat… selamanya)", /function kotakGagalMuat/.test(app) && /\$\{kotakGagalMuat\(\)\}\$\{halaman\(\)\}/.test(app) && /cobaMuat\(\)/.test(app)
    && /S\.gagalMuat = \{ kunci, pesan: e\.message, view: S\.view \}/.test(app));
}
