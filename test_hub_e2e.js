// E2E-ish: load app.js with minimal stubs and verify hubs don't throw
const fs = require('fs');
const path = require('path');

global.window = global;
global.location = { hash: '#/home' };
global.document = makeFakeDom();
global.localStorage = {
  _data: {},
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; },
  clear() { this._data = {}; }
};
global.fetch = function () { return Promise.reject(new Error('offline')); };
global.speechSynthesis = { cancel: function() {}, speak: function() {} };
global.console = console;
global.Auth = {
  init: () => Promise.resolve(),
  isLoggedIn: () => true,
  logout: () => Promise.resolve(),
  onChange: function () {}
};
global.Storage = {
  STAGES: ['gaoyi'],
  STAGE_NAMES: { gaoyi: '高一' },
  getCurrentStage: () => 'gaoyi',
  getVocab: () => ({ stage: 'gaoyi', words: [
    { id: 1, word: 'apple', translation: '苹果' },
    { id: 2, word: 'banana', translation: '香蕉' }
  ] }),
  getStats: () => ({ dueCount: 5, newCount: 10, streak: 3, learnedCount: 50, masteredCount: 20, accuracy: 0.78 }),
  logAttempt: function () { return null; },
  updateCard: function () {},
  addWrong: function () {},
  bumpStreak: function () {},
  getCard: function () { return null; },
  getDueCards: function () { return []; },
  getNewCards: function () { return []; },
  exportAll: function () { return {}; },
  importAll: function () { return true; },
  downloadBackup: function () {},
  todayStr: () => '2026-07-27'
};
global.SRS = {
  previewNext: () => ({ interval: 1 }),
  review: () => ({})
};
global.StudyLists = {
  getAllLists: () => [{ id: 'l1', name: '水果清单', stage: 'gaoyi', wordIds: [1,2], updatedAt: Date.now() }]
};
global.WrongBook = {
  getStats: () => ({ total: 3, totalErrors: 5, topFrequent: [] }),
  getAll: () => [],
  getAllFresh: () => Promise.resolve([]),
  remove: function () {},
  clear: function () {}
};
global.StudyListsView = {};
global.WordBrowser = {
  renderListView: function () {
    return { className: '', appendChild: function () {} };
  }
};
global.WordDetailData = { enrichWord: function (w) { return w; } };
global.ReciteModes = { L1_viewEn: { name: 'L1', run: function () {} } };
global.TestModes = {
  T1_quiz: { name: 'T1', run: function () {} },
  T2_enToZh: { name: 'T2', run: function () {} }
};
global.MemoryPalace = { list: () => [], PRESET_SCENES: [], create: function(){} , get: function(){return null}, delete: function(){}, addWord: function(){}, lookupWord: function(){return {}}, startRecall: function(){} };
global.Reading = { getByStage: () => [], list: () => [], get: () => null, lookupWord: () => ({}), highlightWords: () => ({ html: '' }), startReading: () => ({ recordClick: () => {}, complete: () => ({ uniqueClicks: 0 }) }), getLookupLog: () => [] };
global.Feynman = { generateChallenge: () => [], submitComposition: () => ({}), getHistory: () => [] };
global.Collocations = { size: () => 0, getByStage: () => [], getRandomQuiz: () => [] };
global.Stats = { getStageGrades: () => [{ value: 'all', label: '全部' }] };
global.CloudDashboard = null;
global.Dashboard = { render: () => ({}) };
global.BackendSync = null;
global.HistoryView = null;

function makeFakeDom() {
  const listeners = {};
  const fakeEl = {
    _children: [], _attrs: {},
    appendChild: function (c) { this._children.push(c); return c; },
    setAttribute: function (k, v) { this._attrs[k] = v; },
    addEventListener: function (evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); },
    querySelector: function () { return null; },
    innerHTML: '', textContent: '',
    classList: { add: function() {}, remove: function() {}, contains: function() { return false; } },
    style: {}
  };
  const fakeDoc = {
    createElement: function () { return Object.assign({}, fakeEl); },
    createTextNode: function (t) { return { textContent: t }; },
    createElementNS: function () { return Object.assign({}, fakeEl); },
    getElementById: function (id) { return id === 'view-container' ? Object.assign({}, fakeEl, { appendChild: function () {} }) : null; },
    querySelector: function () { return null; },
    body: { appendChild: function() {}, removeChild: function() {} },
    addEventListener: function () {},
    documentElement: { addEventListener: function() {} }
  };
  return fakeDoc;
}

const code = fs.readFileSync(path.join(__dirname, 'js', 'history-view.js'), 'utf8');
eval(code);

const appCode = fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8');
try {
  eval(appCode);
  console.log('✓ app.js loaded without throwing');
  console.log('  App exports =', Object.keys(global.App || {}));

  // Trigger renderHome by setting route
  global.location.hash = '#/home';
  global.App.state.currentRoute = 'home';
  if (global.App.renderCurrentView) global.App.renderCurrentView();

  global.location.hash = '#/study';
  global.App.state.currentRoute = 'study';
  if (global.App.renderCurrentView) global.App.renderCurrentView();
  console.log('✓ study hub rendered');

  global.location.hash = '#/test';
  global.App.state.currentRoute = 'test';
  if (global.App.renderCurrentView) global.App.renderCurrentView();
  console.log('✓ test hub rendered');

  global.location.hash = '#/history';
  global.App.state.currentRoute = 'history';
  if (global.App.renderCurrentView) global.App.renderCurrentView();
  console.log('✓ history rendered');

  global.location.hash = '#/history/abc123';
  global.App.state.currentRoute = 'history';
  if (global.App.renderCurrentView) global.App.renderCurrentView();
  console.log('✓ history-detail rendered (with stub fallback)');

  console.log('\n✓ All hubs loaded successfully');
} catch (err) {
  console.error('✗ Failed:', err.message);
  console.error(err.stack);
  process.exit(1);
}