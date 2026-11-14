/* Service worker: tampilan diambil dari jaringan lebih dulu (agar pembaruan langsung terasa),
   lalu cadangan dari cache bila sedang offline. Permintaan ke server Apps Script tidak di-cache. */
const CACHE = "upw-uji-v0.24.0";
const INTI = ["./", "index.html", "gaya.css", "konfig.js", "aplikasi.js", "qr.js", "zip.js", "docx.js", "logo.png", "ikon-192.png", "ikon-512.png", "ikon-apple-180.png", "wilayah.json"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(INTI)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  // Hanya melayani berkas aplikasi ini: Produksi (folder utama) tidak mencampuri halaman Uji Coba di subfolder uji/ (v0.15.1).
  const dasar = new URL("./", self.location).pathname;
  if (!url.pathname.startsWith(dasar) || url.pathname.startsWith(dasar + "uji/")) return;
  e.respondWith(fetch(e.request).then(r => { const salin = r.clone(); caches.open(CACHE).then(c => c.put(e.request, salin)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
});
