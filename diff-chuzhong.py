# -*- coding: utf-8 -*-
import json, os

with open("data/junior.json", encoding="utf-8") as f:
    existing = {w["word"].lower(): w for w in json.load(f)["words"]}

with open("chuzhong-extracted.json", encoding="utf-8") as f:
    pdf_words = json.load(f)

print("existing junior.json:", len(existing))
print("PDF extracted:", len(pdf_words))

new_words = []
enriched = []
for pw in pdf_words:
    wd = pw["word"].lower()
    if wd not in existing:
        new_words.append(pw)
    else:
        ex = existing[wd]
        if (not ex.get("examples")) and pw.get("example"):
            enriched.append((wd, "examples", pw["example"]))

print("new:", len(new_words))
print("enrich:", len(enriched))
print("--- first 30 new ---")
for w in new_words[:30]:
    print(" ", w["word"], "|", w.get("pos",""), "|", w.get("translation","")[:60])

# 写 chuzhong-supplement.js
os.makedirs("word-data", exist_ok=True)
keys = ["word","phonetic","pos","translation","definition","root","family","examples","collocations","synonyms","antonyms","keyword","image","topic","grade","frequency","difficulty"]
out = ["// 初中词库补充包(从《词根+联想记忆法》PDF 提取)", "// 共 " + str(len(new_words)) + " 个新词", "module.exports = ["]
for w in new_words:
    pairs = []
    for k in keys:
        if k == "examples":
            v = [w.get("example","")] if w.get("example") else []
        elif k == "definition":
            v = w.get("translation", "")
        elif k == "image":
            v = "📘"
        elif k == "topic":
            v = "chuzhong-supplement"
        elif k == "grade":
            v = "chuzhong-supplement"
        elif k == "frequency":
            v = 4500
        elif k == "difficulty":
            v = 2
        elif k == "phonetic":
            v = w.get("phonetic", "")
        elif k == "translation":
            v = w.get("translation", "")
        elif k == "word":
            v = w.get("word", "")
        elif k == "pos":
            v = w.get("pos", "")
        else:
            v = ""
        if isinstance(v, list):
            pairs.append('"' + k + '":' + json.dumps(v, ensure_ascii=False))
        elif isinstance(v, (int, float)):
            pairs.append('"' + k + '":' + str(v))
        else:
            pairs.append('"' + k + '":' + json.dumps(str(v), ensure_ascii=False))
    out.append("{" + ",".join(pairs) + "},")
out.append("];")
with open("word-data/chuzhong-supplement.js", "w", encoding="utf-8") as f:
    f.write(chr(10).join(out))
print("written word-data/chuzhong-supplement.js with", len(new_words), "new words")
