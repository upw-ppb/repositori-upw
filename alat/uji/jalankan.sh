#!/bin/bash
# Alat uji Repositori UPW. Jalankan dari folder proyek:
#   bash alat/uji/jalankan.sh uji       -> semua uji otomatis server (tiruan Apps Script, tanpa internet)
#   bash alat/uji/jalankan.sh siapkan   -> hanya menyalin ke /tmp/upw-uji (lalu preview "uji-lokal" di aplikasi Claude)
#   bash alat/uji/jalankan.sh server    -> server lokal http://localhost:8790 (tampilan docs/uji + /api tiruan) untuk uji tampilan
#   bash alat/uji/jalankan.sh langsung  -> pemeriksaan baca-saja ke server Uji Coba sungguhan (butuh akun-uji-coba.local.md)
# Folder OneDrive tidak selalu bisa dibaca langsung, jadi semua disalin dulu ke folder kerja sementara.
set -e
export PATH="$HOME/.local/node/bin:$HOME/.local/bin:$PATH"
PROYEK="$(cd "$(dirname "$0")/../.." && pwd)"
KERJA="/tmp/upw-uji"   # tetap, agar .claude/launch.json ("uji-lokal") bisa menjalankannya
rm -rf "$KERJA"; mkdir -p "$KERJA"
cp "$PROYEK"/alat/uji/*.mjs "$PROYEK"/alat/uji/*.js "$PROYEK"/alat/uji/*.py "$KERJA"/
cp -R "$PROYEK/gas" "$KERJA/gas"
cp -R "$PROYEK/docs/uji" "$KERJA/web"
cp "$PROYEK/alat/uji/jelajah.js" "$KERJA/web/jelajah.js"
# WAJIB: tampilan lokal harus memanggil /api tiruan, bukan server Uji Coba sungguhan.
sed -i '' 's|api: "[^"]*"|api: "/api"|' "$KERJA/web/konfig.js"
cd "$KERJA"
case "$1" in
  siapkan)  echo "siap di $KERJA" ;;
  uji)      node uji-keg.mjs gas && node uji-bio.mjs gas ;;
  server)   exec node server-uji.mjs gas web "${2:-8790}" ;;
  langsung) node uji-langsung.mjs "$PROYEK/akun-uji-coba.local.md" ;;
  *) echo "Pakai: bash alat/uji/jalankan.sh uji | siapkan | server | langsung"; exit 1 ;;
esac
