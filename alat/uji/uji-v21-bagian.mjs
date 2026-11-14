// Uji v0.21.0: hash kata sandi lama tetap bisa masuk lalu diperbarui; penulisan sheet langsung wajib membuang cache.
import fs from "node:fs"; import path from "node:path";
export function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tD2, tSA }) {
  console.log("31. Kecepatan: hash berversi dan cache per permintaan");
  const p = g.ctx.cari("Pengguna", x => String(x.username) === "250107");
  const lama = g.ctx.hashIterasi("Lama12345x", p.garam, g.ctx.ITERASI_HASH);
  g.ctx.ubah("Pengguna", p, { hash: lama, wajibGanti: false });
  cek("hash format lama tanpa awalan", !String(lama).startsWith("h2:"));
  const j = g.panggil("masuk", { username: "250107", sandi: "Lama12345x" });
  cek("masuk dengan kata sandi berhash lama berhasil", j.ok, j);
  const p2 = g.ctx.cari("Pengguna", x => String(x.username) === "250107");
  cek("hash diperbarui ke format baru (h2:) setelah masuk", String(p2.hash).startsWith("h2:"));
  cek("masuk lagi dengan format baru tetap berhasil; sandi salah ditolak", g.panggil("masuk", { username: "250107", sandi: "Lama12345x" }).ok && !g.panggil("masuk", { username: "250107", sandi: "Salah12345x" }).ok);
  const dir = process.argv[2], langsung = fs.readdirSync(dir).filter(f => f.endsWith(".js") && f !== "Db.js").filter(f => {
    const s = fs.readFileSync(path.join(dir, f), "utf8"); return /\.(setValues?|appendRow|deleteRow)\(/.test(s) && !/delete _isi\[/.test(s);
  });
  cek("setiap penulisan sheet langsung (di luar Db.js) membuang cache", !langsung.length, langsung);
}
