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
  function Sheet(nama) { this.nama = nama; sheets[nama] = sheets[nama] || []; this.maxCol = 26; }
  Sheet.prototype = {
    get rows() { return sheets[this.nama]; },
    getName() { return this.nama; },
    setName(n) { sheets[n] = sheets[this.nama]; delete sheets[this.nama]; this.nama = n; return this; },
    getLastRow() { return this.rows.length; },
    getLastColumn() { return this.rows.reduce((m, r) => Math.max(m, r.reduce((a, v, i) => v !== "" && v !== undefined ? i + 1 : a, 0)), 0); },
    getMaxColumns() { return Math.max(this.maxCol, this.getLastColumn()); },
    insertColumnsAfter(c, n) { this.maxCol += n; },
    setFrozenRows() {},
    appendRow(r) { this.rows.push(r.map(masukan)); },
    deleteRow(i) { this.rows.splice(i - 1, 1); },
    getRange(r, c, nr = 1, nc = 1) {
      const sh = this;
      return {
        getValues() { const o = []; for (let i = 0; i < nr; i++) { const row = sh.rows[r - 1 + i] || []; const x = []; for (let j = 0; j < nc; j++) x.push(row[c - 1 + j] ?? ""); o.push(x); } return o; },
        setValues(v) { v.forEach((row, i) => { const ri = r - 1 + i; while (sh.rows.length <= ri) sh.rows.push([]); row.forEach((x, j) => { sh.rows[ri][c - 1 + j] = masukan(x); }); }); return this; },
        setValue(x) { return this.setValues([[x]]); },
        setFontWeight() { return this; }, setBackground() { return this; }
      };
    }
  };
  const bukuObj = { getId: () => "ss1", getUrl: () => "https://contoh/ss1",
    getSheets: () => Object.keys(sheets).map(n => new Sheet(n)),
    getSheetByName: n => (n in sheets ? new Sheet(n) : null),
    insertSheet: n => new Sheet(n),
    deleteSheet: s => { delete sheets[s.nama]; } };
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
  const fmt = (d, tz, pola) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: tz || zona, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(d).map(x => [x.type, x.value]));
    return pola.replace("yyyy", p.year).replace("MM", p.month).replace("dd", p.day).replace("HH", p.hour).replace("mm", p.minute)
      .replace(/\bM\b/, String(Number(p.month)));
  };
  const keBuffer = x => Buffer.isBuffer(x) ? x : Array.isArray(x) ? Buffer.from(x.map(b => b & 255)) : Buffer.from(String(x), "utf8");
  const ctx = {
    console, Date: opsi.Date || Date, JSON, Math, Object, Array, String, Number, Boolean, RegExp, Error, isNaN, parseInt, Buffer,
    SpreadsheetApp: { openById: () => bukuObj, create: () => { new Sheet("Sheet1"); return bukuObj; }, getActive: () => bukuObj },
    PropertiesService: { getScriptProperties: () => ({ getProperties: () => Object.assign({}, props), getProperty: k => props[k] ?? null, setProperty: (k, v) => { props[k] = String(v); }, setProperties: o => Object.entries(o).forEach(([k, v]) => { props[k] = String(v); }) }) },
    CacheService: { getScriptCache: () => ({ get: k => cache[k] ?? null, put: (k, v) => { cache[k] = v; }, remove: k => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      base64EncodeWebSafe: b => keBuffer(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_"),
      computeHmacSha256Signature: (v, k) => Array.from(crypto.createHmac("sha256", keBuffer(k)).update(keBuffer(v)).digest()).map(b => (b << 24) >> 24),
      newBlob: (s, mime, nama) => { const by = typeof s === "string" ? Array.from(Buffer.from(s, "utf8")) : Array.from(s).map(b => (b << 24) >> 24); return { getBytes: () => by.slice(), getContentType: () => mime || "", getName: () => nama || "" }; },
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
  return { ctx, panggil, sheets, props, surat, files };
}
