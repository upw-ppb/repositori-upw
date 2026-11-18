/* Mesin saran butir Matriks dan jenis kegiatan (v0.33.0), tanpa AI. Disalin apa adanya ke docs/uji/saran.js oleh alat/saran.mjs, setelah DATA.
   Cara kerja: teks dinormalkan (huruf kecil, imbuhan dibuang, sinonim/frasa prodi diseragamkan), lalu dicocokkan dengan indeks setiap butir
   (nama butir, elemen dan indikator Matriks, syarat skor 4, saran, kamus istilah prodi). Nilai = Σ bobot bidang × IDF; frasa kamus yang muncul utuh
   mendapat nilai tambahan; kata yang salah ketik (beda 1 huruf) dan kata yang belum selesai diketik ikut dihitung dengan nilai lebih kecil.
   API: UPW_SARAN.butir(teks, n) → [{n, nm, skor, alasan[]}], UPW_SARAN.jenis(teks, daftarKode, n) → [{k, l, skor, alasan[]}], UPW_SARAN.butirJenis(k) → [n]. */
(function (akar) {
"use strict";
const STOP = new Set(("yang di ke dari dan atau untuk dengan pada dalam ini itu saya kami kita anda bapak ibu pak bu bagaimana cara apa apakah mengapa dimana kapan "
  + "sudah belum ada adalah jadi juga lagi saja yg utk dgn tdk mau ingin bisa dapat boleh harus perlu kalau jika agar supaya oleh tentang seperti tsb tersebut "
  + "sebuah suatu nya the of and for to in on a an tahun semester ganjil genap prodi program studi upw upps poltekpar bali politeknik pariwisata kegiatan acara "
  + "rapat pertemuan agenda pembahasan membahas bahas terkait mengenai tentang hal hasil nomor no dll lain lainnya baru 2023 2024 2025 2026 2027 2028 "
  + "bersama memuat membuat melakukan dilakukan sudah masih tetap setiap semua banyak sedikit kurang lebih soal siang pagi sore makan minum hari minggu bulan").split(" "));
const bersih = s => String(s || "").toLowerCase().replace(/[’'`]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
function varian(w) {
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
function buatNorm(sinonim) {
  const kanon = new Map(), frasa = [];
  sinonim.forEach(gr => {
    const u = "_" + bersih(gr[0]).replace(/ /g, "_");
    gr.forEach(w => { const b = bersih(w); if (b.includes(" ")) frasa.push([b, u]); else varian(b).forEach(a => { if (!kanon.has(a)) kanon.set(a, u); }); });
  });
  frasa.sort((a, b) => b[0].length - a[0].length);
  const permukaan = []; sinonim.forEach(gr => { const u = "_" + bersih(gr[0]).replace(/ /g, "_"); gr.forEach(x => permukaan.push([bersih(x), u])); });
  const kata = w => { if (/^_/.test(w)) return w; const vs = varian(w); for (const a of vs) if (kanon.has(a)) return kanon.get(a); return vs.sort((a, b) => a.length - b.length || a.localeCompare(b))[0]; };
  /** Token kanonik + kata asli (untuk alasan). */
  const f = s => {
    let t = " " + bersih(s) + " ";
    frasa.forEach(([f, u]) => { t = t.split(" " + f + " ").join(" " + u + " "); });
    const out = [];
    t.split(" ").filter(Boolean).forEach(w => { if (STOP.has(w) || w.length < 2) return; const k = kata(w); if (!STOP.has(k)) out.push([k, w.replace(/^_/, "").replace(/_/g, " ")]); });
    return out;
  };
  /** Kata yang belum selesai diketik → kanonik sinonim yang diawali kata itu (mis. "perkul" → pembelajaran). */
  f.awalan = w => { w = bersih(w); if (w.length < 4) return ""; const x = permukaan.find(([p]) => p.startsWith(w) && p !== w); return x ? x[1] : ""; };
  return f;
}
function jarak1(a, b) {
  if (Math.abs(a.length - b.length) > 1 || a === b) return a === b ? 0 : 9;
  let i = 0, j = 0, beda = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++beda > 1) return 9;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return beda + (a.length - i) + (b.length - j);
}
function buatMesin(D) {
  const norm = buatNorm(D.sinonim);
  const indeks = (docs, BOBOT) => {
    const L = docs.map(d => {
      const m = new Map(), frs = [];
      Object.keys(BOBOT).forEach(f => [].concat(d[f] || []).forEach(teks => {
        const tk = norm(teks); tk.forEach(([k]) => m.set(k, Math.max(m.get(k) || 0, BOBOT[f])));
        if (f === "kamus" && tk.length >= 2) frs.push({ k: tk.map(x => x[0]), teks });
      }));
      return { d, m, frs };
    });
    const df = new Map(); L.forEach(x => x.m.forEach((_, k) => df.set(k, (df.get(k) || 0) + 1)));
    const idf = k => Math.log(1 + L.length / (df.get(k) || L.length));
    const kosakata = [...df.keys()].filter(k => !/^_/.test(k) && k.length >= 5);
    return { L, idf, kosakata };
  };
  const IB = indeks(D.butir, { kamus: 4, nm: 3.5, el: 2.5, ind: 1.2, s4: 1.2, sr: 1.2, skor: 0.5, ket: 0.5 });
  const IJ = indeks(D.jenis, { kamus: 3.5, l: 3.5, kw: 3, cth: 1.5, ex: 1 });
  function cari(I, teks, saring, n) {
    const q = norm(teks); if (!q.length) return [];
    const akhirSedang = !/\s$/.test(String(teks)), qk = q.map(x => x[0]);
    const hasil = I.L.filter(x => !saring || saring(x.d)).map(x => {
      let s = 0; const alasan = new Set(), dipakai = new Set();
      q.forEach(([k, asli], i) => {
        if (dipakai.has(k)) return; dipakai.add(k);
        if (x.m.has(k)) { s += I.idf(k) * x.m.get(k); alasan.add(asli); return; }
        if (asli.length >= 6) { const v = I.kosakata.find(z => x.m.has(z) && jarak1(z, k) <= 1); if (v) { s += 0.7 * I.idf(v) * x.m.get(v); alasan.add(asli); return; } }
        if (akhirSedang && i === q.length - 1 && asli.length >= 4) {
          const ks = norm.awalan(asli); if (ks && x.m.has(ks)) { s += 0.6 * I.idf(ks) * x.m.get(ks); alasan.add(asli + "…"); return; }
          for (const [z, w] of x.m) if (z.startsWith(k) && z !== k) { s += 0.5 * I.idf(z) * w; alasan.add(asli + "…"); break; }
        }
      });
      x.frs.forEach(f => { for (let i = 0; i + f.k.length <= qk.length; i++) if (f.k.every((t, j) => qk[i + j] === t)) { s += 3 * f.k.length; alasan.add(f.teks); break; } });
      return { x, s, alasan: [...alasan] };
    }).filter(h => h.s > 0).sort((a, b) => b.s - a.s);
    if (!hasil.length) return [];
    const top = hasil[0].s;
    return hasil.filter(h => h.s >= Math.max(6, 0.3 * top)).slice(0, n || 5);
  }
  return {
    butir: (teks, n) => cari(IB, teks, null, n).map(h => ({ n: h.x.d.n, nm: h.x.d.nm, skor: Math.round(h.s * 10) / 10, alasan: h.alasan.slice(0, 4) })),
    jenis: (teks, kode, n) => cari(IJ, teks, kode ? d => kode.includes(d.k) : null, n).map(h => ({ k: h.x.d.k, l: h.x.d.l, skor: Math.round(h.s * 10) / 10, alasan: h.alasan.slice(0, 4) })),
    butirJenis: k => (D.peta[k] || []).slice(),
    norm
  };
}
const akarGlobal = typeof window !== "undefined" ? window : globalThis;
akarGlobal.UPW_SARAN = buatMesin(akar);
})(DATA_SARAN);
