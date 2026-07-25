# -*- coding: utf-8 -*-
import pdfplumber, re, json, os

PDF = r"D:\trae solo\english study\chuzhong danci\初中英语词汇词根＋联想记忆法- 乱序版.pdf"

# 清理 PDF 私有区域字符(音标符号都在这些区)
def clean_phonetic(s):
    # U+E000-U+F8FF 是 Unicode Private Use Area, PDF 字体映射常常落在这里
    # U+F0000-U+FFFFD 是 Supplementary Private Use Area-A
    cleaned = re.sub(r'[\uE000-\uF8FF]', '', s)
    cleaned = re.sub(r'[\uF0000-\uFFFFD]', '', cleaned)
    return cleaned.strip()

def parse_book():
    all_words = []
    seen = set()
    with pdfplumber.open(PDF) as pdf:
        for page_idx, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            lines = [l.strip() for l in text.split(chr(10))]
            i = 0
            while i < len(lines):
                line = lines[i]
                # 单词头:只含英文(可能有空格分隔多个同根词)
                if re.match(r'^[a-zA-Z][a-zA-Z\-\s]+$', line) and len(line) > 2:
                    # 下一行是音标
                    if i + 1 < len(lines):
                        nxt = lines[i+1]
                        if nxt.startswith('[') or nxt.startswith('［'):
                            m = re.search(r'[\[［](.+?)[\]］]', nxt)
                            if m:
                                phonetic_raw = clean_phonetic(m.group(1))
                                # 如果整行只有一个单词且是单词头
                                # 处理同行多词(如 "fourteenth season dentist worth"): 只取第一个
                                first_word_in_line = line.strip().split()[0]
                                # 找下一行的 pos + 中文释义
                                j = i + 2
                                pos = ''
                                translation = ''
                                example = ''
                                while j < len(lines) and j < i + 12:
                                    ln = lines[j]
                                    if not ln:
                                        j += 1
                                        continue
                                    pos_m = re.match(r'^([nvai]\. ?|adj\.|adv\.|prep\.|conj\.|pron\.|art\.|num\.|interj\.|aux\.|vi\.|vt\.|abbr\.)', ln)
                                    if pos_m:
                                        pos = pos_m.group(1).rstrip('.').strip()
                                        rest = ln[pos_m.end():].strip()
                                        trans_lines = [rest] if rest else []
                                        k = j + 1
                                        while k < len(lines) and k < j + 3:
                                            nn = lines[k].strip()
                                            if not nn or any(nn.startswith(p) for p in ['例', '记', '联想', '派生', '搭', '近', '反', '辨析', '同根', '[', '［']):
                                                break
                                            trans_lines.append(nn)
                                            k += 1
                                        translation = ' '.join(trans_lines).replace('；', ';')[:200]
                                        if k < len(lines) and lines[k].strip().startswith('例'):
                                            example = lines[k].strip()[1:].strip()[:150]
                                        break
                                    if ln.startswith('例') and not translation:
                                        example = ln[1:].strip()[:150]
                                        break
                                    if any(ln.startswith(p) for p in ['记', '联想', '派生', '搭', '近', '反', '辨析', '同根']):
                                        break
                                    j += 1
                                if translation:
                                    wd = first_word_in_line.lower()
                                    # 如果是同根词组的第一个词,但词族展示页通常没 pos(直接进入 "派生"/"同根"块)
                                    if wd not in seen:
                                        seen.add(wd)
                                        all_words.append({
                                            'word': wd,
                                            'phonetic': '/' + phonetic_raw + '/',
                                            'pos': pos,
                                            'translation': translation,
                                            'example': example,
                                            'page': page_idx + 1
                                        })
                                    i = max(j + 1, i + 1)
                                    continue
                i += 1
    return all_words

if __name__ == '__main__':
    import sys
    print('Parsing PDF...', file=sys.stderr)
    words = parse_book()
    print(f'Total: {len(words)} unique words')
    pages = set(w['page'] for w in words)
    print(f'Pages: {min(pages)} ~ {max(pages)} ({len(pages)} pages)')
    for w in words[:8]:
        print(f'  [{w["page"]:3d}] {w["word"]:18s} {w["phonetic"]:30s} {w["pos"]:6s} {w["translation"][:50]}')
    with open(r'D:\trae solo\english study\chuzhong-extracted.json', 'w', encoding='utf-8') as f:
        json.dump(words, f, ensure_ascii=False, indent=2)
    print('Saved')
