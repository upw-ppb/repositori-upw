import fs from "fs"; import vm from "vm";
const ctx = { window: {}, Blob, TextEncoder, Uint8Array, DataView, console }; ctx.self = ctx.window; vm.createContext(ctx);
for (const f of ["zip.js","docx.js"]) { vm.runInContext(fs.readFileSync("web/"+f,"utf8"), ctx); Object.assign(ctx, ctx.window); }
const D = (ctx.window.UPW_DOCX || ctx.UPW_DOCX).baru();
D.p("Judul", { b: 1, rata: "center" }); D.p("Bab baru", { halamanBaru: 1, b: 1 }); D.tabel([["No","Nama"],["1","A & B <x>"]], { judul: 1 });
const b = await D.blob({ judul: "Uji", kaki: "kaki" }); fs.writeFileSync("ekspor/cek.docx", Buffer.from(await b.arrayBuffer())); console.log("ok", b.size);
