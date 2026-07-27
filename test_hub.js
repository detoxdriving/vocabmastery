// Simple smoke test for history-view.js & integration with app.js
// Run with: node test_hub.js

const fs = require('fs');
const path = require('path');

// Load storage / study-lists / history-view into a Node test harness
const harness = {};
global.window = global;
global.localStorage = {
  _data: {},
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; },
  clear() { this._data = {}; }
};
global.console = console;

function loadScript(file) {
  const code = fs.readFileSync(path.join(__dirname, 'js', file), 'utf8');
  eval(code);
}

// Minimal Storage mock (only what we need)
global.Storage = {
  STAGE_NAMES: { gaoyi: '高一' },
  todayStr: () => '2026-07-27'
};

loadScript('history-view.js');

console.log('[1] HistoryView exports:', Object.keys(global.HistoryView));

// recordSession test
const item = global.HistoryView.recordSession({
  type: 'test',
  mode: 'T2_enToZh',
  modeName: 'T2 看英选义',
  stage: 'gaoyi',
  wordCount: 20,
  correctCount: 17,
  totalTime: 95000,
  score: 85,
  wrongWords: [{ wordId: 1, word: 'apple', translation: '苹果', userAnswer: 'aple' }]
});
console.log('[2] Recorded item id =', item.id);

const all = global.HistoryView.getAll();
console.log('[3] getAll() count =', all.length, 'first score =', all[0].score);

const detail = global.HistoryView.getById(item.id);
console.log('[4] detail stage =', detail.stage, 'wrongWords =', detail.wrongWords.length);

global.HistoryView.recordSession({
  type: 'recite',
  mode: 'L1_viewEn',
  modeName: 'L1 看英回忆',
  stage: 'gaoyi',
  wordCount: 30,
  correctCount: 28,
  totalTime: 60000,
  score: 93
});
console.log('[5] After 2 records getAll() count =', global.HistoryView.getAll().length);

const tests = global.HistoryView.getByType('test');
const recites = global.HistoryView.getByType('recite');
console.log('[6] tests =', tests.length, 'recites =', recites.length);

const gaoyiItems = global.HistoryView.getByStage('gaoyi');
console.log('[7] gaoyi items =', gaoyiItems.length);

global.HistoryView.clear('test');
console.log('[8] After clear(test) tests =', global.HistoryView.getByType('test').length, 'recites =', global.HistoryView.getByType('recite').length);

global.HistoryView.clear();
console.log('[9] After clear() all =', global.HistoryView.getAll().length);

console.log('\n✓ All smoke tests passed');