#!/usr/bin/env node
/**
 * VocabMastery · 合并初中词库到 data/junior.json
 * 用法: node generate-junior.js
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join('data', 'junior.json');
const DATA_DIR = path.join(__dirname, 'word-data');

const grades = ['chuyi-xia', 'chuer-shang', 'chuer-xia', 'chusan-shang', 'chusan-xia'];
let allWords = [];

for (const grade of grades) {
  const file = path.join(DATA_DIR, grade + '.js');
  if (!fs.existsSync(file)) {
    console.log('⚠ 缺少文件:' + file);
    continue;
  }
  // 载入文件,取 module.exports 数组
  const data = require(file);
  console.log(`✓ ${grade}: ${data.length} 词`);
  allWords = allWords.concat(data);
}

// 合并现有 junior.json
let existing = [];
if (fs.existsSync(OUT)) {
  existing = JSON.parse(fs.readFileSync(OUT, 'utf-8')).words || [];
  console.log(`✓ 现有 junior.json: ${existing.length} 词`);
}

const existingSet = new Set(existing.map(w => w.word.toLowerCase()));
const newWords = allWords.filter(w => !existingSet.has(w.word.toLowerCase()));
console.log(`✓ 新增词(去重): ${newWords.length}`);

let nextId = Math.max(...existing.map(w => w.id || 0), 0) + 1;
for (const w of newWords) {
  w.id = nextId++;
  existing.push(w);
}

// 按 id 排序
existing.sort((a, b) => (a.id || 0) - (b.id || 0));

const out = {
  stage: 'junior',
  name: '初中英语词库(北京人教版·完整6学期)',
  words: existing
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf-8');
console.log(`✅ 总词数: ${existing.length}, 已保存到 ${OUT}`);