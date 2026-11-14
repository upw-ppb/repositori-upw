/* Pembuat ikon aplikasi (konsep D: koper arsip + "UPW"), v0.23.1.
   Cara pakai: buka tampilan lokal (bash alat/uji/jalankan.sh siapkan, lalu preview "uji-lokal"), tempel isi berkas ini di konsol
   atau javascript_tool, lalu kirim window.__ikon ke alat/uji/terima.py (POST JSON ke 127.0.0.1:8799).
   Hasil: ikon-512.png, ikon-192.png (kotak macOS standar 412/512), ikon-maskable-512.png (Android, isi di dalam lingkaran aman),
   ikon-apple-180.png (iPhone; sudut dibulatkan iOS). Salin ke docs/uji/ dan aset/ikon-aplikasi-upw-512.png.
   Proporsi koper + tulisan dibuat hampir persegi agar memenuhi kotak ke atas-bawah dan kiri-kanan (permintaan pemilik 14 Nov 2026). */
await document.fonts.load('800 100px "Plus Jakarta Sans"'); await document.fonts.ready;
const NAVY = "#0A5188", EMAS = "#E3B23C", FONT = n => `800 ${n}px "Plus Jakarta Sans", "Helvetica Neue", Arial, sans-serif`;
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
const W = 300, H = 138, HW = 104, HH = 50, LW = 17, GAP = 22;   // lebar/tinggi koper, pegangan, jarak ke tulisan
const uk = document.createElement("canvas").getContext("2d");
uk.font = FONT(100); const m = uk.measureText("UPW"); const fs = 100 * W / (m.actualBoundingBoxRight + m.actualBoundingBoxLeft);
uk.font = FONT(fs); const m2 = uk.measureText("UPW"), asc = m2.actualBoundingBoxAscent;
const atas = -LW / 2, badanY = HH - 14, bawahBadan = badanY + H, garisDasar = bawahBadan + GAP + asc, tinggi = garisDasar - atas;
function isi(g, cx, cy, sisi) {
  const k = sisi / Math.max(W, tinggi); g.save(); g.translate(cx, cy); g.scale(k, k); g.translate(-W / 2, -(atas + tinggi / 2));
  g.lineWidth = LW; g.strokeStyle = EMAS; rr(g, (W - HW) / 2, 0, HW, HH, 17); g.stroke();
  g.fillStyle = EMAS; rr(g, 0, badanY, W, H, 26); g.fill();
  g.fillStyle = NAVY; g.fillRect(W * 0.19 - 7, badanY, 14, H); g.fillRect(W * 0.81 - 7, badanY, 14, H);
  const lw = 84, lh = 100, lx = (W - lw) / 2, ly = badanY + (H - lh) / 2;
  g.fillStyle = "#FFFFFF"; rr(g, lx, ly, lw, lh, 10); g.fill();
  g.strokeStyle = NAVY; g.lineWidth = 9; g.lineCap = "round";
  [0.3, 0.5, 0.7].forEach((t, i) => { g.beginPath(); g.moveTo(lx + 17, ly + lh * t); g.lineTo(lx + lw - (i === 2 ? 34 : 17), ly + lh * t); g.stroke(); });
  g.fillStyle = "#FFFFFF"; g.font = FONT(fs); g.textAlign = "left"; g.textBaseline = "alphabetic";
  g.fillText("UPW", m2.actualBoundingBoxLeft, garisDasar);
  g.restore();
}
function buat(ukuran, mode) {
  const c = document.createElement("canvas"); c.width = c.height = ukuran; const g = c.getContext("2d"); g.scale(ukuran / 512, ukuran / 512);
  if (mode === "mac") { g.fillStyle = NAVY; rr(g, 50, 50, 412, 412, 92); g.fill(); isi(g, 256, 256, 412 * 0.82); }
  else if (mode === "mask") { g.fillStyle = NAVY; g.fillRect(0, 0, 512, 512); isi(g, 256, 256, 512 * 0.56); }
  else { g.fillStyle = NAVY; g.fillRect(0, 0, 512, 512); isi(g, 256, 256, 512 * 0.82); }
  return c;
}
const kanvas = { "ikon-512.png": buat(512, "mac"), "ikon-192.png": buat(192, "mac"), "ikon-maskable-512.png": buat(512, "mask"), "ikon-apple-180.png": buat(180, "apple") };
window.__ikon = Object.entries(kanvas).map(([nama, c]) => ({ nama, b64: c.toDataURL("image/png").split(",")[1] }));
