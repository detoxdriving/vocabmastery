#!/usr/bin/env node
/**
 * VocabMastery · 把 word-data/ 里的每个学期文件转成 data/<stage>.json
 *
 * 顶层 stage 直接是"高一上学期 / 高一下学期 / 初一上学期..."这种细粒度学期,
 * 不再是"高中 / 初中"这种中间层。这样用户在浏览器顶栏下拉直接选学期即可。
 *
 * 用法: node generate-all.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'word-data');
const OUT_DIR = path.join(ROOT, 'data');

const STAGE_NAME_ZH = {
  'chuyi-shang': '初一上学期',
  'chuyi-xia':   '初一下学期',
  'chuer-shang': '初二上学期',
  'chuer-xia':   '初二下学期',
  'chusan-shang':'初三上学期',
  'chusan-xia':  '初三下学期',
  'gaoyi-shang': '高一上学期',
  'gaoyi-xia':   '高一下学期',
  'gaoer-shang': '高二上学期',
  'gaoer-xia':   '高二下学期',
  'gaosan-shang':'高三上学期',
  'gaosan-xia':  '高三下学期',
  'chuzhong-supplement': '初中补充包'
};

const STAGES = Object.keys(STAGE_NAME_ZH);

console.log('=== 把 word-data 转成 data/*.json ===\n');

let totalAll = 0;
for (const stage of STAGES) {
  const file = path.join(DATA_DIR, stage + '.js');
  if (!fs.existsSync(file)) {
    console.log('  ⚠ 跳过 ' + stage + ' (无源文件)');
    continue;
  }
  const words = require(file);
  // 强制 stage 字段统一 + 给每个 word 写递增 id
  let nextId = 1;
  for (const w of words) {
    if (!w.stage) w.stage = stage;
    if (!w.grade) w.grade = stage;
    if (!w.id) w.id = nextId++;
  }
  const out = {
    stage: stage,
    name: STAGE_NAME_ZH[stage],
    total: words.length,
    words: words
  };
  const outPath = path.join(OUT_DIR, stage + '.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf-8');
  const kb = Math.round(fs.statSync(outPath).size / 1024);
  console.log('  ✅ ' + stage.padEnd(22) + ' → ' + outPath + ' (' + kb + ' KB, ' + words.length + ' 词)');
  totalAll += words.length;
}

console.log('\n合计: ' + totalAll + ' 词');
console.log('\n现在 data/ 目录下的 json:');
fs.readdirSync(OUT_DIR).filter(function (f) { return f.endsWith('.json'); }).forEach(function (f) {
  const stat = fs.statSync(path.join(OUT_DIR, f));
  console.log('  ' + f.padEnd(28) + '  ' + Math.round(stat.size / 1024) + ' KB');
});