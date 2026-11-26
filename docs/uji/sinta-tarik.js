/*
 * v0.59.0: penarik data SINTA. Dijalankan DI TAB SINTA lewat penanda buku "Tarik ke Repositori UPW" (dibuat di aplikasi: Data Prodi › SINTA),
 * karena SINTA menolak akses dari server/situs lain. Penanda buku mengisi window.UPW_SINTA = {api, lingkungan} lalu memuat berkas ini.
 * Langkah: kode sekali pakai (#upw=… di alamat tab, atau diketik) → sinta.daftar (DTPS ber-ID SINTA) → baca profil tiap dosen
 * (?view=researches = penelitian, ?view=services = PkM; 10 terbaru tanpa login) → sinta.kirim per kelompok → ringkasan.
 * Pembaca HTML berbasis pola teks (bacaDaftarSinta) agar bisa diuji di Node (alat/uji/uji-v59-bagian.mjs).
 */
(function () {
  const G = typeof window !== "undefined" ? window : globalThis;
  const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  const dekode = s => String(s || "").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : (ENT[e.toLowerCase()] ?? m))
    .replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  /** HTML halaman profil SINTA (view researches/services) → {nama, item[]} */
  function bacaDaftarSinta(html, jenis, dari) {
    const nama = dekode((html.match(/<h3>\s*<a[^>]*>([\s\S]*?)<\/a>/) || [])[1]);
    const bagian = String(html).split(/<div class="ar-list-item\b[^"]*">/).slice(1);
    const item = bagian.map(h => {
      h = h.split(/<div class="ar-list-item\b/)[0];
      const judul = dekode((h.match(/class="ar-title">\s*<a[^>]*>([\s\S]*?)<\/a>/) || [])[1]);
      const ketua = dekode((h.match(/Leader\s*:\s*([^<]*)</) || [])[1]);
      const skema = dekode((h.match(/class="ar-pub"[^>]*>([\s\S]*?)<\/a>/) || [])[1]);
      const pers = (h.split(/Personils\s*:/)[1] || "").split(/<div class="ar-meta">/)[0];
      const anggota = []; pers.replace(/<a[^>]*href="[^"]*\/authors\/profile\/(\d+)[^"]*"[^>]*>([\s\S]*?)<\/a>/g, (m, id, n) => { anggota.push({ sinta: id, nama: dekode(n) }); return m; });
      const tahun = Number((h.match(/class="ar-year"[^>]*>[\s\S]*?(\d{4})/) || [])[1]) || 0;
      const label = []; h.replace(/class="ar-quartile[^"]*"[^>]*>([\s\S]*?)<\/a>/g, (m, t) => { label.push(dekode(t)); return m; });
      const rp = label.find(t => /^Rp/i.test(t)) || "", dana = Number(rp.replace(/,\d{1,2}$/, "").replace(/\D/g, "")) || 0;
      const lain = label.filter(t => !/^Rp/i.test(t));
      return { jenis, judul, ketua, skema, anggota, tahun, dana, status: lain[0] || "", sumber: lain[1] || "", dari: String(dari) };
    }).filter(x => x.judul && x.tahun);
    return { nama, item };
  }
  G.UPW_SINTA_BACA = bacaDaftarSinta;
  if (typeof document === "undefined" || !G.UPW_SINTA || !G.UPW_SINTA.api) return;   // dimuat untuk uji saja

  /* ---------- dijalankan di tab SINTA ---------- */
  const C = G.UPW_SINTA, jeda = ms => new Promise(r => setTimeout(r, ms));
  if (!/(^|\.)sinta\.kemdiktisaintek\.go\.id$/.test(location.hostname)) { alert("Buka halaman SINTA (sinta.kemdiktisaintek.go.id) dulu, lalu klik penanda buku ini lagi."); return; }
  if (document.getElementById("upw-sinta")) return;
  const kotak = document.createElement("div"); kotak.id = "upw-sinta";
  kotak.style.cssText = "position:fixed;top:12px;right:12px;z-index:2147483647;width:min(420px,92vw);max-height:80vh;overflow:auto;background:#fff;color:#111;border:2px solid #0A5188;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.25);font:14px/1.45 system-ui,sans-serif;padding:12px 14px";
  kotak.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b style="color:#0A5188">Repositori UPW · Tarik data SINTA${C.lingkungan === "uji" ? " (Uji Coba)" : ""}</b><button id="upw-sinta-x" style="border:0;background:none;font-size:18px;cursor:pointer" aria-label="Tutup">✕</button></div><div id="upw-sinta-log" style="margin-top:8px"></div>`;
  document.body.appendChild(kotak);
  document.getElementById("upw-sinta-x").onclick = () => kotak.remove();
  const log = (t, warna) => { const p = document.createElement("div"); p.textContent = t; if (warna) p.style.color = warna; document.getElementById("upw-sinta-log").appendChild(p); kotak.scrollTop = kotak.scrollHeight; };
  const api = async (aksi, data) => {
    const r = await fetch(C.api, { method: "POST", body: JSON.stringify({ aksi, data }) });
    const j = await r.json(); if (j.ok === false) throw new Error(j.galat || "Gagal"); return j;
  };
  (async () => {
    try {
      let kode = (location.hash.match(/upw=([a-z0-9]{24})/) || [])[1];
      if (!kode) kode = (prompt("Tempel kode penarikan dari aplikasi Repositori UPW (Data Prodi › SINTA):") || "").trim();
      if (!kode) { log("Dibatalkan: kode tidak diisi.", "#b00"); return; }
      log("Mengambil daftar dosen dari aplikasi…");
      const L = (await api("sinta.daftar", { kode })).dosen;
      log(L.length + " dosen DTPS ber-ID SINTA.");
      const semua = [], nama = {}, gagal = [];
      for (const d of L) {
        for (const [view, jenis] of [["researches", "penelitian"], ["services", "pkm"]]) {
          try {
            const r = await fetch(`/authors/profile/${encodeURIComponent(d.sinta)}?view=${view}`, { credentials: "include" });
            if (!r.ok) throw new Error("HTTP " + r.status);
            const h = bacaDaftarSinta(await r.text(), jenis, d.sinta);
            if (h.nama) nama[d.sinta] = h.nama;
            semua.push(...h.item);
            log(`${d.nama}: ${h.item.length} ${jenis === "pkm" ? "PkM" : "penelitian"}`);
          } catch (e) { gagal.push(`${d.nama} (${jenis}): ${e.message}`); log(`${d.nama} (${jenis}): gagal – ${e.message}`, "#b00"); }
          await jeda(700);   // sopan terhadap server SINTA
        }
      }
      // ketua yang juga dosen UPW (dikenali dari nama di profil SINTA-nya sendiri)
      const keSinta = {}; Object.keys(nama).forEach(s => { keSinta[nama[s].toUpperCase()] = s; });
      semua.forEach(x => { x.ketuaSinta = keSinta[x.ketua.toUpperCase()] || ""; });
      if (!semua.length && gagal.length) throw new Error("Tidak ada data yang terbaca. Tampilan SINTA mungkin berubah; hubungi pengelola aplikasi.");
      log(`Mengirim ${semua.length} entri ke aplikasi (yang sama tidak dibuat ganda)…`);
      const tot = { baru: 0, sudah: 0, tertaut: 0, ditandai: 0, diabaikan: 0, dilewati: 0 };
      for (let i = 0; i < semua.length || i === 0; i += 40) {
        const akhir = i + 40 >= semua.length;
        const j = await api("sinta.kirim", { kode, item: semua.slice(i, i + 40), selesai: akhir, ringkas: akhir ? { dosen: L.length, item: semua.length, gagal, baru: tot.baru } : undefined });
        Object.keys(tot).forEach(k => { tot[k] += j[k] || 0; });
        if (akhir) break;
      }
      log(`Selesai. Baru: ${tot.baru} · sudah tercatat: ${tot.sudah} · ditautkan ke data dosen: ${tot.tertaut} · dosen ditandai: ${tot.ditandai}${tot.diabaikan ? " · dilewati (pernah dihapus): " + tot.diabaikan : ""}.`, "#0a6b2b");
      log("Kembali ke aplikasi lalu tekan Muat ulang di Data Prodi › SINTA. Data baru berstatus draf sampai dosen melengkapi bukti dan diverifikasi.");
    } catch (e) { log("Gagal: " + e.message, "#b00"); }
  })();
})();
