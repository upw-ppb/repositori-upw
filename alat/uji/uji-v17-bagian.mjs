// Uji v0.17.0: log memakai username, inisial di direktori, angkatan dari NIM, label lomba.
export function jalankan({ g, cek, ok, salah, ID, tKps, tDsn, tAdm, tM, tD2, tSA }) {
  console.log("27. Perbaikan v0.17.0");
  const L = ok("admin.log", {}, tSA).log;
  cek("log: username dan nama pengguna, bukan kode acak", L.some(x => x.username === "superadmin.uji" && x.nama) && L.every(x => !x.userId || x.username), L.slice(0, 2));
  let j = ok("admin.impor", { baris: [{ username: "240555", nama: "Tanpa Tahun Masuk", kelas: "B" }, { username: "M-777", nama: "NIM aneh", kelas: "A" }] }, tAdm);
  cek("impor mahasiswa tanpa tahun masuk: dari 2 angka NIM (24 → 2024); NIM tanpa angka di depan ditolak", j.diimpor === 1 && j.dilewati.length === 1 && /Tahun masuk/.test(j.dilewati[0].alasan), j);
  const D = ok("direktori", {}, tAdm).orang;
  cek("direktori: angkatan 2024 dari NIM", D.find(x => x.username === "240555").masuk === "2024");
  cek("direktori: inisial dosen tersedia untuk pencarian", D.filter(x => x.jenis === "dosen").every(x => "inisial" in x));
  const R = ok("kegiatan.ref", {}, tM);
  cek("label: Prestasi akademik / lomba dan non-akademik / lomba", ["Prestasi akademik / lomba", "Prestasi non-akademik / lomba"].every(l => R.jenis.some(x => x.l === l)));
  cek("kata kunci GCET bertambah (tour, lomba)", R.gcetKw["6"].includes("tour") && R.gcetKw["9"].includes("lomba"));
}
