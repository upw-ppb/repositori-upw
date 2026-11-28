// Uji v0.60.2: perbaikan keamanan — ganti kata sandi mengeluarkan perangkat lain, batas permintaan kode email, tautan SINTA hanya https,
// Content Security Policy di halaman, tanpa onclick sebaris, tanpa alamat Gmail di berkas uji.
import fs from "node:fs";
export async function jalankan({ g, cek, ok, salah, tAdm }) {
  console.log("78. Keamanan v0.60.2");
  const SANDI = "Uji12345a", u = "199001152015041001";
  const t1 = ok("masuk", { username: u, sandi: SANDI }).token, t2 = ok("masuk", { username: u, sandi: SANDI }).token;
  ok("ganti.sandi", { sandiLama: SANDI, sandiBaru: "Uji12345b" }, t1);
  cek("ganti kata sandi: perangkat lain otomatis keluar, perangkat ini tetap masuk", /Sesi berakhir/.test(salah("saya", {}, t2)) && ok("saya", {}, t1).pengguna);
  ok("ganti.sandi", { sandiLama: "Uji12345b", sandiBaru: SANDI }, t1);   // kembalikan untuk uji berikutnya

  // lupa kata sandi: maks. 3 kode per jam per akun; jawaban tetap sama (tidak membocorkan apa pun)
  const em = g.ctx.cari("Pengguna", x => x.username === u).email;
  const kirim = () => ok("lupa.kirimKode", { email: em });
  const a = [kirim(), kirim(), kirim(), kirim()];
  cek("lupa kata sandi dibatasi 3 kode per jam (ke-4 tidak dikirim, pesan sama)", a.slice(0, 3).every(x => x.kodeUji) && !a[3].kodeUji && a[3].pesan === a[0].pesan);
  cek("email tidak terdaftar: pesan sama", ok("lupa.kirimKode", { email: "tidak.ada@contoh.id" }).pesan === a[0].pesan);

  // tautan SINTA: hanya https, karakter berbahaya disandikan
  const M = ok("sinta.mulai", {}, tAdm);
  const P = (judul, url, doi) => ({ jenis: "publikasi", sumber: "garuda", judul, url, jurnal: "Jurnal Keamanan Uji", tahun: 2026, sitasi: null, doi: doi || "", akred: "", kuartil: "", tipe: "", penulis: [], dari: "9000001" });
  ok("sinta.kirim", { kode: M.kode, item: [P("Uji Tautan Berbahaya Satu", "javascript:alert(1)", "javascript:x"), P("Uji Tautan Petik Dua", "https://scholar.example/?q=+intitle:'a b'\"><x")] }, null);
  const k1 = g.ctx.semuaKegiatan().find(k => k.judul === "Uji Tautan Berbahaya Satu"), k2 = g.ctx.semuaKegiatan().find(k => k.judul === "Uji Tautan Petik Dua");
  const m1 = JSON.parse(k1.sinta), m2 = JSON.parse(k2.sinta);
  cek("tautan bukan https dibuang; DOI tidak sah dibuang", !m1.url && !m1.doi && !k1.isian["DOI / tautan"], m1);
  cek("tautan https: spasi, petik, dan < > disandikan", /^https:\/\/scholar\.example\/\?q=\+intitle:%27a%20b%27%22%3E%3Cx$/.test(m2.url), m2.url);

  const html = fs.readFileSync("web/index.html", "utf8"), app = fs.readFileSync("web/aplikasi.js", "utf8");
  const csp = (html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1] || "";
  cek("halaman: Content Security Policy (skrip hanya dari aplikasi sendiri, data hanya ke Apps Script)", /script-src 'self';/.test(csp) && !/script-src[^;]*unsafe/.test(csp)
    && /connect-src 'self' data: blob: https:\/\/script\.google\.com https:\/\/script\.googleusercontent\.com;/.test(csp) && /object-src 'none'/.test(csp), csp);
  cek("tampilan: tanpa penangan kejadian sebaris (onclick=) yang akan diblokir CSP", !/\son(click|load|error|input|change|submit)="/.test(app));
  const uji = fs.readdirSync(".").filter(f => /^uji-.*\.mjs$/.test(f)).map(f => fs.readFileSync(f, "utf8")).join("\n");
  cek("berkas uji tanpa alamat Gmail", !/@gmail\.com/i.test(uji));
}
