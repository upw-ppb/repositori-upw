window.jelajah = async function () {
  const tunggu = ms => new Promise(r => setTimeout(r, ms));
  const masalah = [], dicek = [];
  if (!window.__kons) { window.__kons = []; const ce = console.error; console.error = (...a) => { window.__kons.push(a.map(String).join(" ")); ce(...a); }; window.addEventListener("error", e => window.__kons.push("onerror: " + e.message)); window.addEventListener("unhandledrejection", e => window.__kons.push("promise: " + (e.reason && e.reason.message || e.reason))); }
  window.open = () => ({ document: { write() {} }, close() {}, location: {} }); window.print = () => {}; HTMLAnchorElement.prototype.click = function () {}; window.confirm = () => false;
  const selesaiMuat = async () => { for (let i = 0; i < 40; i++) { if (!document.querySelector(".memuat")) return true; await tunggu(150); } return false; };
  const periksa = async (konteks) => {
    const ok = await selesaiMuat(); if (!ok) masalah.push(konteks + ": masih 'Memuat…' setelah 6 detik");
    const teks = (document.querySelector("main")?.innerText || "") + " " + (document.querySelector(".drawer")?.innerText || "");
    const g = [...document.querySelectorAll(".galat")].map(x => x.innerText).filter(Boolean); if (g.length) masalah.push(konteks + ": galat tampil → " + g.join(" | "));
    const t = document.getElementById("toast"); if (t && !t.hidden && /kesalahan|gagal|tidak|error/i.test(t.textContent)) masalah.push(konteks + ": toast → " + t.textContent);
    const m = teks.match(/\b(undefined|NaN|\[object Object\]|null)\b/g); if (m) masalah.push(konteks + ": teks rusak → " + [...new Set(m)].join(","));
    if (document.documentElement.scrollWidth > innerWidth + 2) masalah.push(konteks + ": halaman melebar " + document.documentElement.scrollWidth + "px > layar " + innerWidth + "px");
    if (window.__kons.length) { masalah.push(konteks + ": konsol → " + window.__kons.join(" | ")); window.__kons.length = 0; }
    dicek.push(konteks);
  };
  const TAB = ["dpTab", "kpsTab", "dedTab", "ttdTab", "dirTabBtn", "svTab"], BUKA = ["bukaKeg", "bankBuka", "mkpBuka", "dedBuka", "mskDetail", "labUbah", "sdBuka", "dpMkUbah", "dpTimAtur", "dpPrakUbah", "lihatBio", "laciMhs", "laciPeran", "gpmBuka", "svHasil", "dbBuka"];
  const peranSel = document.getElementById("peranSel"), daftarPeran = peranSel ? [...peranSel.options].map(o => o.value) : [null];
  for (const pr of daftarPeran) {
    if (pr && peranSel) { const s = document.getElementById("peranSel"); s.value = pr; s.dispatchEvent(new Event("change", { bubbles: true })); await tunggu(800); }
    const menu = [...document.querySelectorAll(".nav [data-go]")].map(b => b.dataset.go).concat(["info"]);
    for (const v of menu) {
      const b = document.querySelector(`.nav [data-go="${v}"]`) || document.querySelector(`[data-go="${v}"]`); if (!b) { masalah.push(`${pr}/${v}: tombol menu tidak ada`); continue; }
      b.click(); await tunggu(300); await periksa(`${pr}/${v}`);
      const tabs = [...document.querySelectorAll("main [data-act]")].filter(x => TAB.includes(x.dataset.act)).map(x => [x.dataset.act, x.dataset.t]);
      for (const [a, t] of tabs) { const x = document.querySelector(`main [data-act="${a}"][data-t="${t}"]`); if (!x) continue; x.click(); await tunggu(300); await periksa(`${pr}/${v}/tab:${t}`); }
      const buka = [...document.querySelectorAll("main [data-act]")].find(x => BUKA.includes(x.dataset.act));
      if (buka) { buka.click(); await tunggu(400); await periksa(`${pr}/${v}/laci:${buka.dataset.act}`); const tt = document.querySelector('.drawer [data-act="tutup"]'); if (tt) { tt.click(); await tunggu(200); } }
    }
  }
  return { jumlahDicek: dicek.length, masalah };
};
"ok"
