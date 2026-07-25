# -*- coding: utf-8 -*-
import os, re, zipfile, json
SRC_DIR = r"D:\trae solo\english study\gaozhong danci"
files = sorted([f for f in os.listdir(SRC_DIR) if "学生版" in f and "英汉互译" not in f])
print(f"基本学生版文件: {len(files)}")

LINE_RE = re.compile(
    r"^\s*\d+\.\s*(?P<word>[A-Za-z][\w\-\(\)\s]*?)\s*\[(?P<phon>[^\]]+)\]\s*(?P<pos>[nvai]\.|[a-z]\.[\.]?)\s*(?P<trans>.+?)\s*$"
)

def extract(path):
    try:
        with zipfile.ZipFile(os.path.join(SRC_DIR, path)) as z:
            xml = z.read("word/document.xml").decode("utf-8", errors="ignore")
        paras = re.findall(r"<w:p[> ].*?</w:p>", xml, re.DOTALL)
        lines = []
        for p in paras:
            runs = re.findall(r"<w:t[^>]*>([^<]*)</w:t>", p)
            t = "".join(runs).strip()
            if t:
                lines.append(t)
        full = "\n".join(lines)
        if "维度一" not in full:
            return []
        d1 = full[full.index("维度一"):]
        for m in ["维度二", "英译汉版"]:
            if m in d1:
                d1 = d1[:d1.index(m)]
        words = []
        for ln in d1.split("\n"):
            ln = ln.strip()
            m = LINE_RE.match(ln)
            if m:
                words.append({
                    "word": m.group("word").strip().split()[0].strip("()"),
                    "phonetic": "/" + m.group("phon").strip() + "/",
                    "pos": m.group("pos").strip().rstrip("."),
                    "translation": m.group("trans").strip().replace(" , ", ", ").rstrip("."),
                })
        return words
    except Exception as e:
        return []

def grade_of(name):
    m = re.search(r"第\s*(\d+)\s*天", name)
    if not m:
        return None
    d = int(m.group(1))
    return "gaoyi-shang" if d <= 35 else "gaoyi-xia" if d <= 70 else None

seen = set()
shang, xia = [], []
for f in files:
    g = grade_of(f)
    if not g:
        continue
    for w in extract(f):
        k = w["word"].lower()
        if k in seen:
            continue
        seen.add(k)
        w.update({
            "grade": g,
            "definition": w["translation"],
            "root": "",
            "family": [],
            "examples": [],
            "collocations": [],
            "synonyms": [],
            "antonyms": [],
            "keyword": "",
            "image": "📘",
            "topic": "high-school",
            "frequency": 4500,
            "difficulty": 2,
        })
        (shang if g == "gaoyi-shang" else xia).append(w)

print(f"gaoyi-shang: {len(shang)} 词")
print(f"gaoyi-xia:   {len(xia)} 词")
print(f"总计:        {len(shang) + len(xia)} 词")

def to_js(words, label):
    keys = ["word","phonetic","pos","translation","definition","root","family","examples","collocations","synonyms","antonyms","keyword","image","topic","grade","frequency","difficulty"]
    out = [f"// 高中{label} · {len(words)} 词", "// 来源:高考 3500 词汇一遍过 2024 版", "module.exports = ["]
    for w in words:
        pairs = []
        for k in keys:
            v = w.get(k, "")
            if isinstance(v, list):
                pairs.append('"' + k + '":' + json.dumps(v, ensure_ascii=False))
            elif isinstance(v, (int, float)):
                pairs.append('"' + k + '":' + str(v))
            else:
                pairs.append('"' + k + '":' + json.dumps(str(v), ensure_ascii=False))
        out.append("{" + ",".join(pairs) + "},")
    out.append("];")
    return "\n".join(out)

os.makedirs(r"D:\trae solo\english study\word-data", exist_ok=True)
with open(r"D:\trae solo\english study\word-data\gaoyi-shang.js", "w", encoding="utf-8") as f:
    f.write(to_js(shang, "高一上 gaoyi-shang"))
with open(r"D:\trae solo\english study\word-data\gaoyi-xia.js", "w", encoding="utf-8") as f:
    f.write(to_js(xia, "高一下 gaoyi-xia"))
print("✓ gaoyi-shang.js 已写入")
print("✓ gaoyi-xia.js 已写入")