// Pemeriksaan server Uji Coba sungguhan (hanya membaca; masuk pertama memicu migrasi struktur 18 + cadangan).
import fs from "node:fs";
const API = "https://script.google.com/macros/s/AKfycbyILM_1zheYuMXf-zt7GYIhVr7o1z8S3bCfucZkW1VP9Jj6Wa3Zu4UWXQOq8vrVPBMb/exec";
const sandi = fs.readFileSync(process.argv[2], "utf8").match(/\| pppk-2021-0107 \| ([^ |]+) \|/)[1];
const panggil = async (aksi, data = {}, token = "") => (await (await fetch(API, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ aksi, data, token }) })).json());
const c = (n, k, i) => console.log((k ? "  ✓ " : "  ✗ ") + n, k ? "" : JSON.stringify(i).slice(0, 400));
const VERSI = fs.readFileSync(process.argv[2].replace(/[^/]+$/, "") + "docs/uji/konfig.js", "utf8").match(/versi: "([^"]+)"/)[1];
let j = await panggil("ping"); c("ping versi " + VERSI, j.versi === VERSI, j);
j = await panggil("masuk", { username: "pppk-2021-0107", sandi }); c("Admin Prodi masuk ", j.ok, j.galat);
if (!j.ok) process.exit(1);
const t = j.token;
j = await panggil("masukan.saya", {}, t); c("masukan.saya", j.ok, j);
j = await panggil("masukan.daftar", {}, t); c("masukan.daftar (Admin Prodi)", j.ok, j); if (j.ok) console.log("  jumlah masukan:", (j.masukan || []).length);
j = await panggil("tugas.saya", {}, t); c("tugas.saya memuat masukanBaru", j.ok && "masukanBaru" in j, j);
j = await panggil("kegiatan.daftar", { lingkup: "semua" }, t); c("kegiatan.daftar masih jalan", j.ok, j.galat);
j = await panggil("foto.saya", {}, t); c("foto.saya (v0.24.0)", j.ok && "foto" in j, j);
j = await panggil("sumber.butir", { butir: 45 }, t); c("sumber.butir 45 (Admin Prodi: lihat saja)", j.ok && Array.isArray(j.kegiatan) && j.bolehUbah === false, j);
j = await panggil("sumber.kegiatan", {}, t); c("Data Terkumpul tertutup untuk Admin Prodi", !j.ok && /izin/.test(j.galat), j);
await panggil("keluar", {}, t);
