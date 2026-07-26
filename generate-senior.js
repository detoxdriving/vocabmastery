#!/usr/bin/env node
/**
 * VocabMastery · 把 word-data/gaoyi-*.js 等转成 data/senior.json
 * (类似 generate-junior.js)
 * 用法: node generate-senior.js
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join('data', 'senior.json');
const DATA_DIR = path.join(__dirname, 'word-data');

const grades = ['gaoyi-shang', 'gaoyi-xia'];
let allWords = [];

for (const grade of grades) {
  const file = path.join(DATA_DIR, grade + '.js');
  if (!fs.existsSync(file)) {
    console.log('⚠ 缺少文件:' + file);
    continue;
  }
  const data = require(file);
  console.log(`✓ ${grade}: ${data.length} 词`);
  allWords = allWords.concat(data);
}

console.log(`✓ 合计: ${allWords.length} 词`);

// 合并现有 senior.json(如果存在,去重)
let existing = [];
if (fs.existsSync(OUT)) {
  try {
    existing = JSON.parse(fs.readFileSync(OUT, 'utf-8')).words || [];
    console.log(`✓ 现有 senior.json: ${existing.length} 词`);
  } catch (e) {
    console.log('⚠ 现有 senior.json 解析失败,跳过合并');
  }
}

const existingSet = new Set(existing.map(w => String(w.word || '').toLowerCase()));
const newWords = allWords.filter(w => !existingSet.has(String(w.word || '').toLowerCase()));
console.log(`✓ 新增词(去重): ${newWords.length}`);

let nextId = Math.max(...existing.map(w => w.id || 0), 0) + 1;
for (const w of newWords) {
  w.id = nextId++;
  if (!w.stage) w.stage = 'senior';
}

// 合并输出:优先保留 word-data 的完整字段,缺字段才用现有
const merged = existing.slice();
const wordMap = new Map(merged.map(w => [String(w.word || '').toLowerCase(), w]));
for (const w of newWords) {
  const key = String(w.word || '').toLowerCase();
  if (wordMap.has(key)) {
    Object.assign(wordMap.get(key), w);
  } else {
    merged.push(w);
    wordMap.set(key, w);
  }
}

const out = {
  stage: 'senior',
  name: '高中词汇',
  total: merged.length,
  words: merged
};

fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf-8');
console.log(`\n✅ 已写入 ${OUT}`);
console.log(`   词数:${merged.length}`);
console.log(`   文件大小:${Math.round(fs.statSync(OUT).size / 1024)} KB`);