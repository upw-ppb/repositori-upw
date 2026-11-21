// Pengukur waktu tunggu per halaman (dimuat di halaman lokal uji, lalu: await window.ukurHalaman({ jeda: 2000 })).
// Setiap permintaan ke /api ditunda `jeda` ms SETELAH server lokal menjawab, meniru biaya tetap Apps Script (diukur ±1,5–2,6 detik per permintaan).
// Hasil per halaman: waktu sampai tampil lengkap (tidak ada "Memuat…" dan tidak ada permintaan berjalan), jumlah permintaan, rantai berurutan, ukuran jawaban.
// Setiap halaman diukur dua kali: kunjungan pertama dan kunjungan ulang (setelah pindah ke Beranda), untuk melihat efek data yang sudah tersimpan.
window.ukurHalaman = async function ({ jeda = 2000, peran = null } = {}) {
  const tunggu = ms => new Promise(r => setTimeout(r, ms));
  const asli = window.__fetchAsli || (window.__fetchAsli = window.fetch.bind(window));
  let berjalan = 0, catat = [];
  window.fetch = async (u, o) => {
    if (!/\/api$/.test(String(u))) return asli(u, o);
    berjalan++; const t0 = performance.now(); let aksi = "?"; try { aksi = JSON.parse(o.body).aksi; } catch (_) {}
    try { const r = await asli(u, o), teks = await r.clone().text(), lokal = performance.now() - t0; await tunggu(jeda); catat.push({ aksi, t0, t1: performance.now(), lokal, kb: teks.length / 1024 }); return r; }
    finally { berjalan--; }
  };
  window.open = () => ({ document: { write() {} }, close() {}, location: {} }); HTMLAnchorElement.prototype.click = function () {}; window.confirm = () => false;
  const diam = async () => {   // tunggu sampai tidak ada permintaan dan tidak ada "Memuat…" selama 400 ms (maks 60 dtk)
    let tenang = 0; const a = performance.now();
    while (performance.now() - a < 60000) { await tunggu(100); if (berjalan === 0 && !document.querySelector(".memuat")) { tenang += 100; if (tenang >= 400) return performance.now() - 400; } else tenang = 0; }
    return performance.now();
  };
  const ukur = async (aksiKlik) => {
    catat = []; const a = performance.now(); aksiKlik(); const b = await diam();
    // rantai berurutan = jumlah "gelombang" permintaan (permintaan yang mulai setelah permintaan lain selesai)
    let gel = 0, akhir = -1; catat.slice().sort((x, y) => x.t0 - y.t0).forEach(c => { if (c.t0 > akhir) { gel++; } akhir = Math.max(akhir, c.t1); });
    return { detik: Math.round((b - a) / 100) / 10, n: catat.length, gelombang: gel, kb: Math.round(catat.reduce((s, c) => s + c.kb, 0)), aksi: catat.map(c => c.aksi).join(" "),
      lokalMs: Math.round(catat.reduce((s, c) => s + c.lokal, 0)) };
  };
  const TAB = ["dpTab", "kpsTab", "dedTab", "ttdTab", "dirTabBtn", "svTab", "rapatTab"];
  const hasil = [], sel = document.getElementById("peranSel"), daftar = peran || (sel ? [...sel.options].map(o => o.value) : [null]);
  for (const pr of daftar) {
    if (pr && sel) { const s = document.getElementById("peranSel"); s.value = pr; s.dispatchEvent(new Event("change", { bubbles: true })); await diam(); }
    const menu = [...document.querySelectorAll(".nav [data-go]")].map(b => b.dataset.go).filter((v, i, l) => l.indexOf(v) === i);
    for (const v of menu) {
      const klik = () => (document.querySelector(`.nav [data-go="${v}"]`) || document.querySelector(`[data-go="${v}"]`)).click();
      const r1 = await ukur(klik);
      if (v !== "beranda") await ukur(() => document.querySelector('.nav [data-go="beranda"]').click());
      const r2 = await ukur(klik);
      hasil.push({ peran: pr, halaman: v, pertama: r1, ulang: r2 });
      const tabs = [...document.querySelectorAll("main [data-act]")].filter(x => TAB.includes(x.dataset.act)).map(x => [x.dataset.act, x.dataset.t]);
      for (const [a, t] of tabs) {
        const x = () => document.querySelector(`main [data-act="${a}"][data-t="${t}"]`); if (!x()) continue;
        const r = await ukur(() => x().click()); hasil.push({ peran: pr, halaman: v + " › " + t, pertama: r, ulang: null });
      }
    }
  }
  window.fetch = asli;
  return hasil;
};
"ok";
