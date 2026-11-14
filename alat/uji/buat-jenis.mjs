import fs from "node:fs"; import vm from "node:vm";
const [, , html, data, out] = process.argv;
const L = fs.readFileSync(html, "utf8").split("\n");
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(data, "utf8"), ctx);
vm.runInContext(L.slice(236, 336).join("\n").replace(/^const (\w+)\s*=/gm, "var $1 =") , ctx);
const J = ctx.JENIS, E = ctx.EXAMPLE;
// kuliah tamu (prototipe baris 1217-1218; mata kuliah jadi isian teks sampai kurikulum ada di aplikasi)
const lain = J.lainnya; delete J.lainnya;
J.kuliahtamu = { l: "Kuliah tamu dalam mata kuliah (narasumber praktisi/pejabat)", t: "Butir 22 · IBE", who: ["dosen", "admin"] };
J.lainnya = lain;
const kt = L[1217].match(/fx:\[(.*)\]\};?\s*$/);
E.kuliahtamu = { ex: "Contoh: Kuliah tamu Kepala Kantor Imigrasi Bali: kebijakan visa dan izin tinggal wisatawan mancanegara",
  bukti: ["Surat undangan atau surat tugas narasumber", "Daftar hadir mahasiswa", "Materi presentasi narasumber", "Foto atau rekaman sesi"],
  fx: [["Mata kuliah terkait", "text", "Contoh: UPW202 Ticketing"], ["Nama dan jabatan narasumber", "text", "Contoh: Kepala Kantor Imigrasi Kelas I TPI Denpasar"],
       ["Instansi / perusahaan", "text", "Contoh: Direktorat Jenderal Imigrasi"], ["Topik", "text", "Contoh: Kebijakan visa on arrival dan izin tinggal wisatawan"]],
  cth: ["Kuliah tamu praktisi biro perjalanan dalam mata kuliah Tour Planning", "Kuliah tamu pejabat imigrasi dalam mata kuliah Ticketing", "Narasumber maskapai untuk satu pertemuan mata kuliah"],
  kw: "kuliah tamu dosen tamu narasumber praktisi guest lecture" };
const daftar = Object.keys(J).map(k => ({ k, l: J[k].l, t: J[k].t, who: J[k].who, ex: E[k]?.ex || "", bukti: E[k]?.bukti || [], cth: E[k]?.cth || [], kw: E[k]?.kw || "",
  fx: (E[k]?.fx || []).map(([l, t, o]) => t === "sel" ? { l, t: "sel", o } : { l, t: "text", ph: o }) }));
const txt = `/**
 * Jenis kegiatan, isian tambahan per jenis, dan pasal Global Code of Ethics for Tourism (GCET).
 * Dibuat dari prototipe (prototipe/index.html, JENIS/EXAMPLE/CTH/GCET_KW). Satu sumber: tampilan menerima daftar ini dari server.
 * who: kelompok yang boleh mencatat (mahasiswa | dosen [dosen, tendik, kalab, laboran] | admin [admin, kps, superadmin]).
 */
var JENIS_KEG = ${JSON.stringify(daftar, null, 1)};
var GCET = ${JSON.stringify(ctx.window.GCET)};
var GCET_KW = ${JSON.stringify(ctx.GCET_KW)};
var TINGKAT = ["Lokal/Wilayah", "Nasional", "Internasional"];
/** Jenis yang biasanya tidak memerlukan surat tugas (kotak "Ajukan surat tugas" tidak dicentang otomatis). */
var TANPA_ST = ["publikasi", "hki", "bimbingan", "sertifikasi"];
`;
fs.writeFileSync(out, txt);
console.log(daftar.length, "jenis;", daftar.map(d => d.k).join(" "));
