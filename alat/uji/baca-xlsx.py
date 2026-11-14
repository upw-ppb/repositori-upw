import zipfile, re, sys, xml.etree.ElementTree as ET
N = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main", "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
z = zipfile.ZipFile(sys.argv[1]); maks = int(sys.argv[2]) if len(sys.argv) > 2 else 15
ss = []
if "xl/sharedStrings.xml" in z.namelist():
    for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", N):
        ss.append("".join(t.text or "" for t in si.iter("{%s}t" % N["m"])))
wb = ET.fromstring(z.read("xl/workbook.xml"))
rels = {r.get("Id"): r.get("Target") for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))}
only = sys.argv[3] if len(sys.argv) > 3 else None
for s in wb.find("m:sheets", N):
    nama = s.get("name"); tgt = rels[s.get("{%s}id" % N["r"])]
    if only and only != nama: continue
    sh = ET.fromstring(z.read("xl/" + tgt.lstrip("/").replace("xl/", "")))
    rows = sh.findall(".//m:sheetData/m:row", N)
    print("=== LEMBAR:", nama, "| baris:", len(rows))
    for row in rows[:maks]:
        cells = []
        for c in row.findall("m:c", N):
            v = c.find("m:v", N); t = c.get("t")
            if t == "s" and v is not None: val = ss[int(v.text)]
            elif t == "inlineStr": val = "".join(x.text or "" for x in c.iter("{%s}t" % N["m"]))
            else: val = v.text if v is not None else ""
            if val: cells.append(c.get("r") + "=" + val.replace("\n", " ")[:200])
        if cells: print("  ", " | ".join(cells))
