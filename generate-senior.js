#!/usr/bin/env node
/**
 * VocabMastery · 合并高中词库到 data/senior.json
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
  delete require.cache[require.resolve(file)];
  const data = require(file);
  console.log(`✓ ${grade}: ${data.length} 词`);
  allWords = allWords.concat(data);
}

// 合并现有 senior.json
let existing = [];
if (fs.existsSync(OUT)) {
  existing = JSON.parse(fs.readFileSync(OUT, 'utf-8')).words || [];
  console.log(`✓ 现有 senior.json: ${existing.length} 词`);
}

const existingSet = new Set(existing.map(w => w.word.toLowerCase()));
const newWords = allWords.filter(w => !existingSet.has(w.word.toLowerCase()));
console.log(`✓ 新增词(去重): ${newWords.length}`);

let nextId = Math.max(...existing.map(w => w.id || 0), 0) + 1;
for (const w of newWords) {
  w.id = nextId++;
  existing.push(w);
}

existing.sort((a, b) => (a.id || 0) - (b.id || 0));

const out = {
  stage: 'senior',
  name: '高中英语词库(高考3500词·高一上下)',
  words: existing
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf-8');
console.log(`✅ 总词数: ${existing.length}, 已保存到 ${OUT}`);