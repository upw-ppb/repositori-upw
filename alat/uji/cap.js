/* Alat bantu tangkapan layar panduan (v0.26.0). Dimuat di halaman lokal (server uji), viewport 1100x720.
   window.capTanda(id, judul, butir): butir = [{ n, k, cari, pad, badge }]
     cari: selektor CSS, atau { teks: "Tulisan tombol", tag: "button" }, atau fungsi yang mengembalikan elemen.
     badge: "kiri" | "kanan" | "atas" | "bawah" | [x, y] (posisi nomor; bila jauh dari kotak, digambar panah).
   Koordinat disimpan dalam piksel viewport (1100x720) ke localStorage "capTanda". */
(function () {
  const vis = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight; };
  function temukan(c) {
    if (typeof c === "function") return c();
    if (typeof c === "string") return [...document.querySelectorAll(c)].find(vis) || null;
    const tag = c.tag || "*", t = c.teks.toLowerCase();
    const l = [...document.querySelectorAll(tag)].filter(el => vis(el) && el.textContent.trim().toLowerCase().includes(t));
    // pilih elemen terdalam (teks paling pendek)
    l.sort((a, b) => a.textContent.length - b.textContent.length);
    return l[0] || null;
  }
  window.capTanda = function (id, judul, butir) {
    const hasil = [], hilang = [];
    for (const b of butir) {
      const el = temukan(b.cari);
      if (!el) { hilang.push(b.n + ": " + JSON.stringify(b.cari)); continue; }
      const r = el.getBoundingClientRect(), p = b.pad == null ? 4 : b.pad;
      const x = Math.max(2, Math.round(r.left - p)), y = Math.max(2, Math.round(r.top - p));
      const w = Math.min(1098 - x, Math.round(r.width + 2 * p)), h = Math.min(718 - y, Math.round(r.height + 2 * p));
      const o = { n: b.n, k: b.k, x, y, w, h };
      if (Array.isArray(b.badge)) { o.bx = b.badge[0]; o.by = b.badge[1]; }
      else if (b.badge === "kanan") { o.bx = x + w + 16; o.by = y + h / 2; }
      else if (b.badge === "bawah") { o.bx = x + 14; o.by = y + h + 16; }
      else if (b.badge === "atas") { o.bx = x + 14; o.by = y - 16; }
      else if (b.badge === "kiri") { o.bx = x - 16; o.by = y + h / 2; }
      hasil.push(o);
    }
    const semua = JSON.parse(localStorage.getItem("capTanda") || "{}");
    semua[id] = { j: judul, a: hasil };
    localStorage.setItem("capTanda", JSON.stringify(semua));
    return { id, jumlah: hasil.length, hilang };
  };
  window.capMasuk = async function (username, peran) {
    const r = await (await fetch("/api", { method: "POST", body: JSON.stringify({ aksi: "masuk", data: { username, sandi: "Uji12345a" } }) })).json();
    if (!r.ok) return r.galat;
    const simpan = localStorage.getItem("capTanda");
    localStorage.clear(); if (simpan) localStorage.setItem("capTanda", simpan);
    localStorage.setItem("upw:token", r.token); if (peran) localStorage.setItem("upw:peran", peran);
    location.reload(); return "ok";
  };
  window.capTunggu = ms => new Promise(r => setTimeout(r, ms));
  window.capKlik = async function (c, ms) { const el = temukan(c); if (!el) return "tidak ada: " + JSON.stringify(c); el.click(); await capTunggu(ms || 1500); return "ok"; };
  window.capPergi = async function (menu, ms) { const b = document.querySelector('.nav [data-go="' + menu + '"]') || document.querySelector('[data-go="' + menu + '"]'); if (!b) return "menu tidak ada: " + menu; b.click(); await capTunggu(ms || 1800); window.scrollTo(0, 0); return "ok"; };
  window.capIsi = function (id, v) { const el = document.getElementById(id); if (!el) return "tidak ada " + id; el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); return "ok"; };
  window.capGulir = function (c, atas) { const el = temukan(c); if (!el) return "tidak ada"; window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - (atas == null ? 90 : atas)); return "ok"; };
})();
/* Tangkapan layar tajam (2x): tampilan diperbesar 2x lalu difoto 4 bagian (kolom, baris = 0/1); disatukan dengan capGabung().
   Elemen sticky/fixed digeser agar tetap di tempatnya walau halaman sedang digulir. */
(function () {
  let simpan = null;
  window.capUbin = function (kol, bar) {
    const b = document.body;
    const pertama = !simpan;
    if (!simpan) {
      const y = window.scrollY;
      // Elemen fixed ikut body yang di-transform; geser agar tetap di posisi layar.
      const geser = [...document.querySelectorAll("body *")].filter(el => getComputedStyle(el).position === "fixed")
        .filter(el => !el.parentElement.closest('[data-ubin]'));
      geser.forEach(el => { el.dataset.ubinT = el.style.transform || ""; el.dataset.ubin = "1"; el.style.transform = (el.style.transform || "") + " translateY(" + y + "px)"; });
      simpan = { y, geser };
    }
    b.style.transformOrigin = "0 " + simpan.y + "px";
    b.style.transform = "translate(" + (-kol * 1100) + "px," + (-bar * 720) + "px) scale(2)";
    return new Promise(r => setTimeout(() => r("ubin " + kol + "," + bar), pertama ? 1200 : 600));
  };
  window.capUbinSelesai = function () {
    const b = document.body; b.style.transform = ""; b.style.transformOrigin = "";
    if (simpan) simpan.geser.forEach(el => { el.style.transform = el.dataset.ubinT; delete el.dataset.ubin; });
    simpan = null; return "selesai";
  };
  /* Satukan 4 ubin (diunggah ke /ubin/<id>-<k><b>.jpg) menjadi WebP 1600 px, kirim ke penerima lokal 127.0.0.1:8799. */
  window.capGabung = async function (id, mutu) {
    const W = 1600, H = Math.round(1600 * 720 / 1100), c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
    for (const [k, r] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const img = new Image(); img.src = "/ubin/" + id + "-" + k + r + ".jpg?x=" + Date.now(); await img.decode();
      g.drawImage(img, k * W / 2, r * H / 2, W / 2, H / 2);
    }
    const blob = await new Promise(res => c.toBlob(res, "image/webp", mutu || 0.82));
    const b64 = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(",")[1]); fr.readAsDataURL(blob); });
    await fetch("http://127.0.0.1:8799/", { method: "POST", body: JSON.stringify([{ nama: id + ".webp", b64 }]) });
    return { id, kb: Math.round(blob.size / 1024) };
  };
})();
