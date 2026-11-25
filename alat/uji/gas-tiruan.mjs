import zlib from "node:zlib";
// Tiruan layanan Google Apps Script di Node, untuk menjalankan kode server asli (gas/*.js) secara lokal.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";

export function buatGas(folderGas, opsi = {}) {
  const sheets = {}; // nama -> array baris (array nilai)
  const props = {};
  const cache = {};
  const surat = [];
  const files = {};
  let idSeq = 0;
  const id = p => p + (++idSeq);

  // Sheets mengubah teks seperti input pengguna: angka → Number, yyyy-mm-dd → Date, awalan ' → teks.
  const masukan = v => {
    if (typeof v !== "string") return v;
    if (v.startsWith("'")) return v.slice(1);
    if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(v + "T00:00:00+08:00");
    if (/^=/.test(v)) return "#RUMUS!";
    return v;
  };
  // v0.49.0: ukuran lembar (baris/kolom) dicatat per buku agar perawatan anggaran sel bisa diuji; arsip = buku terpisah (SpreadsheetApp.create).
  const ukuran = {}, buku2 = {};
  function Sheet(nama, st) { this.st = st || sheets; this.nama = nama; this.st[nama] = this.st[nama] || []; const u = ukuran[this.kunci()] = ukuran[this.kunci()] || { col: 26, row: 1000 }; this.u = u; }
  Sheet.prototype = {
    kunci() { return (this.st === sheets ? "" : "a:") + this.nama; },
    get rows() { return this.st[this.nama]; },
    get maxCol() { return this.u.col; }, set maxCol(v) { this.u.col = v; },
    getName() { return this.nama; },
    setName(n) { this.st[n] = this.st[this.nama]; delete this.st[this.nama]; ukuran[(this.st === sheets ? "" : "a:") + n] = this.u; this.nama = n; return this; },
    getLastRow() { let n = this.rows.length; while (n > 0 && !(this.rows[n - 1] || []).some(v => v !== "" && v !== undefined)) n--; return n; },
    getLastColumn() { return this.rows.reduce((m, r) => Math.max(m, r.reduce((a, v, i) => v !== "" && v !== undefined ? i + 1 : a, 0)), 0); },
    getMaxColumns() { return Math.max(this.maxCol, this.getLastColumn()); },
    getMaxRows() { return Math.max(this.u.row, this.rows.length); },
    deleteColumns(c, n) { if (c <= this.getLastColumn()) throw new Error("tiruan: kolom berisi tidak boleh dihapus"); this.u.col = Math.max(this.getMaxColumns() - n, 1); },
    deleteRows(r, n) { if (r <= this.getLastRow()) throw new Error("tiruan: baris berisi tidak boleh dihapus"); this.rows.splice(r - 1, n); this.u.row = Math.max(this.getMaxRows() - n, this.rows.length); },
    insertColumnsAfter(c, n) { this.maxCol += n; },
    insertRowsAfter(r, n) { this.u.row = this.getMaxRows() + n; },
    setFrozenRows() {},
    appendRow(r) { const n = this.getLastRow(); this.rows.splice(n, this.rows.length - n); this.rows.push(r.map(masukan)); if (this.rows.length > this.u.row) this.u.row = this.rows.length; },
    deleteRow(i) { this.rows.splice(i - 1, 1); },
    getRange(r, c, nr = 1, nc = 1) {
      const sh = this;
      return {
        getValues() { const o = []; for (let i = 0; i < nr; i++) { const row = sh.rows[r - 1 + i] || []; const x = []; for (let j = 0; j < nc; j++) x.push(row[c - 1 + j] ?? ""); o.push(x); } return o; },
        setValues(v) { if (r - 1 + v.length > sh.getMaxRows()) throw new Error("tiruan: rentang di luar ukuran lembar (" + (r - 1 + v.length) + " > " + sh.getMaxRows() + " baris)");
          v.forEach((row, i) => { const ri = r - 1 + i; while (sh.rows.length <= ri) sh.rows.push([]); row.forEach((x, j) => { sh.rows[ri][c - 1 + j] = masukan(x); }); }); return this; },
        setValue(x) { return this.setValues([[x]]); },
        getValue() { return this.getValues()[0][0]; },
        clearContent() { for (let i = 0; i < nr; i++) { const row = sh.rows[r - 1 + i]; if (row) for (let j = 0; j < nc; j++) row[c - 1 + j] = ""; } return this; },
        setFontWeight() { return this; }, setBackground() { return this; }
      };
    }
  };
  const bukuDari = (st, idb) => ({ getId: () => idb, getUrl: () => "https://contoh/" + idb,
    getSheets: () => Object.keys(st).map(n => new Sheet(n, st)),
    getSheetByName: n => (n in st ? new Sheet(n, st) : null),
    insertSheet: n => new Sheet(n, st),
    deleteSheet: s => { delete st[s.nama]; } });
  const bukuObj = bukuDari(sheets, "ss1");
  const folder = (nama) => { const f = { id: id("f"), nama, anak: [], file: [],
    getId: () => f.id, getName: () => f.nama, getUrl: () => "https://contoh/" + f.id,
    createFolder: n => { const c = folder(n); f.anak.push(c); return c; },
    getFoldersByName: n => { const l = f.anak.filter(x => x.nama === n); return { hasNext: () => l.length > 0, next: () => l.shift() }; },
    getFolders: () => { const l = f.anak.slice(); return { hasNext: () => l.length > 0, next: () => l.shift() }; },
    getFiles: () => { const l = f.file.slice(); return { hasNext: () => l.length > 0, next: () => l.shift() }; },
    createFile: (n, isi) => { const x = typeof n === "object" ? berkas(n.getName(), n.getBytes(), n.getContentType()) : berkas(n, isi); f.file.push(x); x.folder = f; return x; } }; files[f.id] = f; return f; };
  const berkas = (nama, isi = "", mime = "") => { const b = { id: id("b"), nama, isi, mime, terbuang: false, getId: () => b.id, getName: () => b.nama, getSize: () => Array.isArray(isi) ? isi.length : String(isi).length,
    setTrashed: v => { b.terbuang = !!v; }, getMimeType: () => b.mime, getBlob: () => ({ getBytes: () => Array.isArray(isi) ? isi.slice() : Array.from(Buffer.from(String(isi))), getContentType: () => b.mime, getName: () => b.nama }),
    getLastUpdated: () => new Date(), getUrl: () => "https://contoh/" + b.id,
    moveTo: f => { f.file.push(b); }, makeCopy: (n, f) => { const c = berkas(n, JSON.stringify(sheets)); f.file.push(c); return c; } }; files[b.id] = b; return b; };
  files["ss1"] = berkas("Spreadsheet"); files["ss1"].id = "ss1";

  const zona = "Asia/Makassar";
  const fmtSimpan = {};
  const fmt = (d, tz, pola) => {
    const f = fmtSimpan[tz || zona] || (fmtSimpan[tz || zona] = new Intl.DateTimeFormat("en-GB", { timeZone: tz || zona, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }));
    const p = Object.fromEntries(f.formatToParts(d).map(x => [x.type, x.value]));
    return pola.replace("yyyy", p.year).replace("MM", p.month).replace("dd", p.day).replace("HH", p.hour).replace("mm", p.minute)
      .replace(/\bM\b/, String(Number(p.month)));
  };
  const keBuffer = x => Buffer.isBuffer(x) ? x : Array.isArray(x) ? Buffer.from(x.map(b => b & 255)) : Buffer.from(String(x), "utf8");
  const ctx = {
    console, Date: opsi.Date || Date, JSON, Math, Object, Array, String, Number, Boolean, RegExp, Error, isNaN, parseInt, Buffer,
    SpreadsheetApp: { openById: i => buku2[i] ? buku2[i].b : bukuObj, getActive: () => bukuObj,
      create: n => { if (!/Arsip/i.test(String(n))) { new Sheet("Sheet1"); return bukuObj; }   /* buku data utama; buku arsip dibuat terpisah */ const i = "ss" + (++idSeq), st = { Sheet1: [] }; buku2[i] = { nama: n, st, b: bukuDari(st, i) }; files[i] = berkas(n); files[i].id = i; return buku2[i].b; } },
    PropertiesService: { getScriptProperties: () => ({ getProperties: () => Object.assign({}, props), getProperty: k => props[k] ?? null, setProperty: (k, v) => { props[k] = String(v); }, setProperties: o => Object.entries(o).forEach(([k, v]) => { props[k] = String(v); }) }) },
    CacheService: { getScriptCache: () => ({ get: k => cache[k] ?? null, put: (k, v) => { if (String(v).length > 100000) throw new Error("tiruan: nilai cache > 100 KB"); cache[k] = v; }, remove: k => { delete cache[k]; },
      getAll: ks => Object.fromEntries(ks.filter(k => k in cache).map(k => [k, cache[k]])), putAll: o => Object.entries(o).forEach(([k, v]) => { if (String(v).length > 100000) throw new Error("tiruan: nilai cache > 100 KB"); cache[k] = v; }),
      removeAll: ks => ks.forEach(k => delete cache[k]) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, tryLock() { return true; }, releaseLock() {} }) },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      base64EncodeWebSafe: b => keBuffer(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_"),
      computeHmacSha256Signature: (v, k) => Array.from(crypto.createHmac("sha256", keBuffer(k)).update(keBuffer(v)).digest()).map(b => (b << 24) >> 24),
      newBlob: (s, mime, nama) => { const by = typeof s === "string" ? Array.from(Buffer.from(s, "utf8")) : Array.from(s).map(b => (b << 24) >> 24); return { getBytes: () => by.slice(), getContentType: () => mime || "", getName: () => nama || "", getDataAsString: () => keBuffer(by).toString("utf8") }; },
      DigestAlgorithm: { SHA_256: "sha256" },
      computeDigest: (alg, b) => Array.from(crypto.createHash(alg).update(keBuffer(typeof b === "string" ? Buffer.from(b, "utf8") : b)).digest()).map(v => (v << 24) >> 24),
      /* tiruan Utilities.unzip: ZIP tersimpan atau deflate (v0.54.0) */
      unzip: blob => { const u = keBuffer(blob.getBytes()), h = []; let e = -1; for (let i = u.length - 22; i >= 0; i--) if (u.readUInt32LE(i) === 0x06054b50) { e = i; break; }
        if (e < 0) throw new Error("tiruan: bukan zip"); let q = u.readUInt32LE(e + 16); const n = u.readUInt16LE(e + 10);
        for (let k = 0; k < n; k++) { const m = u.readUInt16LE(q + 10), besar = u.readUInt32LE(q + 20), nl = u.readUInt16LE(q + 28), el = u.readUInt16LE(q + 30), cl = u.readUInt16LE(q + 32), lok = u.readUInt32LE(q + 42);
          const nama = u.subarray(q + 46, q + 46 + nl).toString("utf8"), awal = lok + 30 + u.readUInt16LE(lok + 26) + u.readUInt16LE(lok + 28), data = u.subarray(awal, awal + besar);
          const isi = m === 0 ? Buffer.from(data) : zlib.inflateRawSync(data); h.push({ getName: () => nama, getBytes: () => Array.from(isi).map(v => (v << 24) >> 24), getDataAsString: () => isi.toString("utf8") }); q += 46 + nl + el + cl; }
        return h; },
      base64Decode: t => Array.from(Buffer.from(String(t), "base64")).map(b => (b << 24) >> 24),
      base64Encode: b => keBuffer(b).toString("base64"),
      formatDate: fmt
    },
    MailApp: { sendEmail: o => surat.push(o), getRemainingDailyQuota: () => 1500 },
    DriveApp: { createFolder: n => folder(n), getFolderById: i => files[i], getFileById: i => files[i], getRootFolder: () => folder("root") },
    MimeType: { CSV: "text/csv" },
    ContentService: { MimeType: { JSON: "json" }, createTextOutput: t => ({ isi: t, setMimeType() { return this; } }) },
    Logger: { log() {} }
  };
  vm.createContext(ctx);
  // Apps Script memuat semua file sebagai satu skrip global (fungsi terlihat lintas file).
  const kode = fs.readdirSync(folderGas).filter(f => f.endsWith(".js")).sort().map(f => "/* " + f + " */\n" + fs.readFileSync(path.join(folderGas, f), "utf8")).join("\n");
  vm.runInContext(kode, ctx, { filename: "gas-gabungan.js" });
  const panggil = (aksi, data, token) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify({ aksi, data, token }) } }).isi);
  return { ctx, panggil, sheets, props, surat, files, ukuran, buku2, cache };
}
