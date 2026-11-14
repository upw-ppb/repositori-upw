import zipfile, re, sys
z = zipfile.ZipFile(sys.argv[1]); x = z.read("word/document.xml").decode("utf8")
paras = []
for p in re.findall(r"<w:p[ >].*?</w:p>", x, re.S):
    t = "".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", p))
    if t.strip(): paras.append(t)
open(sys.argv[2], "w").write("\n".join(paras)); print(len(paras), "paragraf")
