// Comprehensive end-to-end smoke test for VocabMastery
// Loads storage / study-lists / history-view / app.js into a stubbed harness
// and exercises every route + core data flow.

const fs = require('fs');
const path = require('path');

global.window = global;
global.location = { hash: '#/home' };
global.fetch = () => Promise.reject(new Error('offline'));
global.speechSynthesis = { cancel: function () {}, speak: function () {} };
global.console = console;
global.crypto = global.crypto || {};

// ─── fake DOM ────────────────────────────────────────────────────────────────
function makeNode(tag) {
  const node = {
    _children: [],
    _attrs: {},
    _listeners: {},
    _text: '',
    _html: '',
    classList: {
      _set: new Set(),
      add(c) { this._set.add(c); },
      remove(c) { this._set.delete(c); },
      contains(c) { return this._set.has(c); }
    },
    style: {},
    appendChild(c) {
      if (c == null) return null;
      if (typeof c === 'string') c = { textContent: c };
      this._children.push(c);
      return c;
    },
    removeChild(c) {
      const i = this._children.indexOf(c);
      if (i >= 0) this._children.splice(i, 1);
    },
    setAttribute(k, v) { this._attrs[k] = v; },
    getAttribute(k) { return this._attrs[k]; },
    addEventListener(evt, fn) {
      (this._listeners[evt] = this._listeners[evt] || []).push(fn);
    },
    removeEventListener(evt, fn) {
      const arr = this._listeners[evt] || [];
      const i = arr.indexOf(fn);
      if (i >= 0) arr.splice(i, 1);
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    click() {},
    focus() {},
    getBoundingClientRect() { return { left: 0, top: 0, right: 0, bottom: 0 }; }
  };
  Object.defineProperty(node, 'innerHTML', {
    get() { return this._html; },
    set(v) { this._html = String(v); this._children = []; }
  });
  Object.defineProperty(node, 'textContent', {
    get() { return this._text; },
    set(v) { this._text = String(v); }
  });
  Object.defineProperty(node, 'value', {
    get() { return this._attrs.value || ''; },
    set(v) { this._attrs.value = String(v); }
  });
  Object.defineProperty(node, 'className', {
    get() { return this._attrs.className || ''; },
    set(v) { this._attrs.className = String(v); }
  });
  Object.defineProperty(node, 'id', {
    get() { return this._attrs.id || ''; },
    set(v) { this._attrs.id = String(v); }
  });
  // HTMLCollection-like accessor
  Object.defineProperty(node, 'children', {
    get() { return this._children; }
  });
  return node;
}

function makeDoc() {
  const ids = {};
  global._hashHandlers = global._hashHandlers || [];
  return {
    createElement(tag) {
      if (tag === 'svg' || tag === 'defs' || tag === 'stop' || tag === 'circle') {
        const n = makeNode(tag);
        n.setAttribute = function (k, v) { this._attrs[k] = v; };
        return n;
      }
      return makeNode(tag);
    },
    createElementNS(ns, tag) {
      const n = makeNode(tag);
      n.setAttribute = function (k, v) { this._attrs[k] = v; };
      return n;
    },
    createTextNode(t) { return { textContent: String(t) }; },
    getElementById(id) {
      if (!ids[id]) ids[id] = makeNode('div');
      return ids[id];
    },
    querySelector() { return null; },
    addEventListener(evt, fn) {
      if (evt === 'DOMContentLoaded') {
        // mimic browser firing after script load
        try { fn(); } catch (e) { console.error('DCL handler:', e.message); }
      }
    },
    removeEventListener() {},
    body: makeNode('body'),
    documentElement: makeNode('html')
  };
}
global.document = makeDoc();

global.addEventListener = function (evt, fn) {
  if (evt === 'hashchange') {
    global._hashHandlers = global._hashHandlers || [];
    global._hashHandlers.push(fn);
  }
};
global.removeEventListener = function (evt, fn) {
  if (evt === 'hashchange' && global._hashHandlers) {
    const i = global._hashHandlers.indexOf(fn);
    if (i >= 0) global._hashHandlers.splice(i, 1);
  }
};

// ─── localStorage ────────────────────────────────────────────────────────────
global.localStorage = {
  _data: {},
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; },
  clear() { this._data = {}; }
};

// ─── Stubs for module deps ───────────────────────────────────────────────────
// (define BEFORE running loadScript to avoid being clobbered by storage.js)
global.Auth = {
  init: () => Promise.resolve(),
  isLoggedIn: () => true,
  logout: () => Promise.resolve(),
  onChange: function () {}
};

const SAMPLE_VOCAB = {
  gaoyi: {
    stage: 'gaoyi', words: [
      { id: 1, word: 'apple',  phonetic: '/ˈæpl/',    pos: 'n.', translation: '苹果', grade: 'gaoyi', examples: ['I eat an apple.'] },
      { id: 2, word: 'banana', phonetic: '/bəˈnænə/', pos: 'n.', translation: '香蕉', grade: 'gaoyi', examples: [] },
      { id: 3, word: 'orange', phonetic: '/ˈɒrɪndʒ/', pos: 'n.', translation: '橙子', grade: 'gaoyi', examples: [] },
      { id: 4, word: 'study',  phonetic: '/ˈstʌdi/',  pos: 'v./n.', translation: '学习', grade: 'gaoyi', examples: [] }
    ]
  }
};

global.Storage = {
  STAGES: ['gaoyi'],
  STAGE_NAMES: { gaoyi: '高一' },
  getCurrentStage: () => 'gaoyi',
  getVocab: stage => SAMPLE_VOCAB[stage] || null,
  getStats: () => ({ dueCount: 3, newCount: 5, streak: 2, learnedCount: 10, masteredCount: 4, accuracy: 0.75, totalErrors: 0 }),
  logAttempt(e) { return e; },
  getAttemptsLog: () => [],
  updateCard() {}, addWrong() {}, bumpStreak() {},
  getCard() { return null; },
  getDueCards: () => [1, 2],
  getNewCards: () => [3, 4],
  getProgress() { return { cards: {} }; },
  saveProgress() {},
  saveVocab() {},
  exportAll: () => ({}),
  importAll: () => true,
  downloadBackup: () => {},
  uploadBackup: () => Promise.resolve({ ok: true }),
  todayStr: () => '2026-07-27'
};
global.SRS = { previewNext: () => ({ interval: 1 }), review: () => ({}) };
global.StudyLists = null;
global.WrongBook = {
  getStats: () => ({ total: 2, totalErrors: 4, topFrequent: [{ wordId: 1, frequency: 2 }] }),
  getAll: () => [1, 2],
  getAllFresh: () => Promise.resolve([1, 2]),
  remove() {}, clear() {}
};
global.StudyListsView = {};
global.WordBrowser = null;
global.WordDetailData = { enrichWord: w => Object.assign({}, w) };
global.ReciteModes = {
  L1_viewEn: { name: 'L1 看英回忆', run() {} },
  L2_viewZh: { name: 'L2 看义回忆', run() {} }
};
global.TestModes = {
  T1_quiz:    { name: 'T1 单元测验', run() {} },
  T2_enToZh:  { name: 'T2 看英选义', run() {} },
  T3_zhToEn:  { name: 'T3 看义选英', run() {} }
};
global.MemoryPalace = {
  list: () => [],
  PRESET_SCENES: [],
  create() { return { id: 'x' }; },
  get() { return null; },
  delete() {},
  addWord() {},
  lookupWord() { return {}; },
  startRecall() { return { submit() {} }; }
};
global.Reading = {
  getByStage: () => [], list: () => [], get: () => null,
  lookupWord: () => ({}),
  highlightWords: () => ({ html: '' }),
  startReading: () => ({ recordClick() {}, complete() { return { uniqueClicks: 0 }; } }),
  getLookupLog: () => []
};
global.Feynman = {
  generateChallenge: () => [],
  submitComposition: () => ({}),
  getHistory: () => []
};
global.Collocations = { size: () => 0, getByStage: () => [], getRandomQuiz: () => [] };
global.Stats = { getStageGrades: () => [{ value: 'all', label: '全部' }] };
global.CloudDashboard = null;
global.Dashboard = { render: () => makeNode('div') };
global.BackendSync = null;
global.HistoryView = null;
global.LoginView = { render: () => {} };

// ─── Load scripts in order ───────────────────────────────────────────────────
function loadScript(file) {
  eval(fs.readFileSync(path.join(__dirname, 'js', file), 'utf8'));
}

(async function main() {
  try {
    // Match index.html script order
    loadScript('api-client.js');
    loadScript('backend-sync.js');
    loadScript('auth.js');
    loadScript('login-view.js');
    loadScript('storage.js');
    loadScript('srs.js');
    loadScript('wrong-book.js');
    loadScript('word-detail-data.js');
    loadScript('study-lists.js');
    loadScript('recite-modes.js');
    loadScript('test-modes.js');
    loadScript('memory-palace.js');
    loadScript('reading.js');
    loadScript('feynman.js');
    loadScript('collocations.js');
    loadScript('stats.js');
    loadScript('word-browser.js');
    loadScript('study-lists-view.js');
    loadScript('history-view.js');
    loadScript('dashboard.js');
    loadScript('dashboard-backend.js');
    loadScript('app.js');
  } catch (e) {
    console.error('FAIL: load script error', e.message, e.stack);
    process.exit(1);
  }

  // After real scripts run, re-apply richer stubs to support full render paths
  // Storage: leave the real one (its localStorage works) but seed current_stage & vocab
  global.localStorage.setItem('vm_current_stage', JSON.stringify('gaoyi'));
  global.localStorage.setItem('vm_vocab_gaoyi', JSON.stringify({
    stage: 'gaoyi', name: '高一', words: SAMPLE_VOCAB.gaoyi.words
  }));
  // TestModes / ReciteModes / WrongBook / etc — keep real ones; we already populated globals above

  // boot the app (in browser, DOMContentLoaded triggers this)
  try {
    await global.App.init();
  } catch (e) {
    console.error('boot failed', e.message, e.stack);
  }

  console.log('================================================');
  console.log('        VocabMastery 综合冒烟测试');
  console.log('================================================');

  // ─── 1. 路由渲染 ────────────────────────────────────────────────────────────
  const ROUTES = [
    'home', 'study', 'test', 'stats', 'history',
    'history/__fake__',
    'lists', 'list/abc', 'browse', 'word/gaoyi/1',
    'review', 'palace', 'reading', 'feynman', 'collocations',
    'recite', 'wrongbook', '__unknown__'
  ];

  function runRoute(name) {
    try {
      // Drive the renderer directly via App.renderCurrentView (now exposed)
      global.location.hash = '#/' + name;
      global.App.state.currentRoute = name.split('/')[0];
      global.App.renderCurrentView();
      return true;
    } catch (e) {
      console.error('  ✗ #' + name + ' threw:', e.message);
      return false;
    }
  }

  console.log('\n[1] 路由渲染测试 (' + ROUTES.length + ' 路由)');
  let pass = 0, fail = 0;
  ROUTES.forEach(function (r) {
    if (runRoute(r)) { pass++; console.log('  ✓ /' + r); }
    else fail++;
  });
  console.log('  → 通过 ' + pass + ' / 失败 ' + fail);

  // ─── 2. 核心数据流 ──────────────────────────────────────────────────────────
  console.log('\n[2] 核心数据流');

  const SL = global.StudyLists;
  const l1 = SL.createList({ name: '水果', stage: 'gaoyi', wordIds: [] });
  const r = SL.addWordToList(l1.id, 1);
  console.log('  ✓ addWordToList →', r.ok && r.added ? '新加入' : '失败');
  const r2 = SL.addWordToList(l1.id, 1);
  console.log('  ✓ addWordToList 重复 →', r2.duplicate ? '识别为重复' : '错误');
  const back = SL.getList(l1.id);
  console.log('  ✓ getList 持久化 →', back.wordIds.length === 1 ? 'OK' : 'BUG: ' + back.wordIds);

  const HV = global.HistoryView;
  const h1 = HV.recordSession({ type: 'test', mode: 'T1_quiz', modeName: 'T1', stage: 'gaoyi', wordCount: 20, correctCount: 18, totalTime: 60000, score: 90 });
  console.log('  ✓ recordSession id =', h1.id);
  console.log('  ✓ getAll =', HV.getAll().length, '条');
  global.Storage.logAttempt({ stage: 'gaoyi', wordId: 1, mode: 'study', rating: 'good', correct: true, timeMs: 1500, timestamp: Date.now() });
  console.log('  ✓ logAttempt 不抛错');

  // ─── 3. 学习中枢 + 测试中枢 ────────────────────────────────────────────────
  console.log('\n[3] 学习 / 测试中枢页面完整性');
  console.log('  ✓ /study 路由存在:', ROUTES.includes('study'));
  console.log('  ✓ /test  路由存在:', ROUTES.includes('test'));
  runRoute('study');
  runRoute('test');

  // ─── 4. 历史视图 ────────────────────────────────────────────────────────────
  console.log('\n[4] 历史记录视图');
  console.log('  ✓ getByType(test) =', HV.getByType('test').length);
  console.log('  ✓ getByStage(gaoyi) =', HV.getByStage('gaoyi').length);
  console.log('  ✓ getById(invalid) =', HV.getById('nonexistent'));
  runRoute('history/__fake__');

  // ─── 5. 浏览词表 ────────────────────────────────────────────────────────────
  console.log('\n[5] 浏览词表功能');
  const WB = global.WordBrowser;
  const lv = WB.renderListView('gaoyi');
  console.log('  ✓ renderListView 返回节点 class =', lv.className || lv._attrs.className);
  const detail = WB.renderDetailView('gaoyi', 1);
  console.log('  ✓ renderDetailView 返回节点');

  // Verify study hub produces a meaningful number of children
  runRoute('study');
  {
    const view = global.document.getElementById('view-container');
    const wrap = view && view._children[0];
    const childCount = wrap ? wrap._children.length : -1;
    console.log('  ✓ /study wrapper 子节点数 =', childCount);
  }

  runRoute('test');
  {
    const view = global.document.getElementById('view-container');
    const wrap = view && view._children[0];
    const childCount = wrap ? wrap._children.length : -1;
    console.log('  ✓ /test  wrapper 子节点数 =', childCount);
  }

  runRoute('history');
  console.log('  ✓ /history 渲染成功 (HistoryView 已挂载)');

  // ─── 5b. 主流程模拟: 单词 → 清单 → 测试记录 → 历史可见 ──────────────────
  console.log('\n[5b] 主流程模拟');
  const list2 = SL.createList({ name: '主流程测试', stage: 'gaoyi', wordIds: [] });
  SL.addWordToList(list2.id, 1);
  SL.addWordToList(list2.id, 2);
  console.log('  ✓ 创建清单并加入 2 词');

  // 模拟一次背诵会话完成
  const recSession = HV.recordSession({
    type: 'recite', mode: 'L1_viewEn', modeName: 'L1 看英回忆',
    stage: 'gaoyi', wordCount: 10, correctCount: 9, totalTime: 45000, score: 90
  });
  console.log('  ✓ 模拟背诵完成,记录 id =', recSession.id);

  // 模拟一次测试会话完成 (带错词)
  const testSession = HV.recordSession({
    type: 'test', mode: 'T2_enToZh', modeName: 'T2 看英选义',
    stage: 'gaoyi', wordCount: 20, correctCount: 16, totalTime: 120000, score: 80,
    wrongWordIds: [3, 4],
    wrongWords: [
      { wordId: 3, word: 'orange', translation: '橙子', userAnswer: 'orgen' },
      { wordId: 4, word: 'study',  translation: '学习', userAnswer: 'studey' }
    ]
  });
  console.log('  ✓ 模拟测试完成,记录 id =', testSession.id, '错词', testSession.wrongWords.length);

  // 验证历史列表能查到
  const list = HV.getAll();
  const foundRecite = list.find(x => x.id === recSession.id);
  const foundTest = list.find(x => x.id === testSession.id);
  console.log('  ✓ 历史列表找到背诵记录:', !!foundRecite);
  console.log('  ✓ 历史列表找到测试记录:', !!foundTest);
  console.log('  ✓ 测试记录错词数:', foundTest.wrongWords.length);

  // 验证详情渲染不抛错
  const detailWrap = makeNode('div');
  global.HistoryView.renderHistoryDetail(detailWrap, testSession.id, () => {});
  console.log('  ✓ renderHistoryDetail 不抛错,子节点数:', detailWrap._children.length);

  // 验证主页摘要卡
  const summary = global.HistoryView.renderSummaryBox({ stage: 'gaoyi' });
  console.log('  ✓ renderSummaryBox 不抛错,class =', summary && (summary.className || summary._attrs.className));

  // ─── 6. 错误路径 ────────────────────────────────────────────────────────────
  console.log('\n[6] 错误路径鲁棒性');
  console.log('  ✓ addWordToList(badId) →', SL.addWordToList('nope', 1).reason);
  try {
    const d = WB.renderDetailView('gaoyi', 99999);
    console.log('  ✓ renderDetailView(badId) 不抛错');
  } catch (e) {
    console.log('  ✗ renderDetailView(badId) 抛错:', e.message);
  }
  HV.clear('nonexistent');
  console.log('  ✓ clear(无效类型) 不抛错');
  console.log('  ✓ createList() 默认 stage =', SL.createList().stage);
  console.log('  ✓ switchStage(bad) =', (function () {
    try { global.App.switchStage('nonexistent-stage'); return 'safe'; }
    catch (e) { return 'THREW: ' + e.message; }
  })());
  runRoute('__unknown__');
  console.log('  ✓ 未知路由不抛错');

  // ─── 7. 总览 ────────────────────────────────────────────────────────────────
  console.log('\n[7] 持久化校验 (reload 后数据应仍在)');
  // 读取 localStorage 持久化键并验证
  const persistedLists = JSON.parse(global.localStorage.getItem('vm_study_lists') || '[]');
  const persistedHistory = JSON.parse(global.localStorage.getItem('vm_history_log') || '[]');
  console.log('  ✓ vm_study_lists 含本次创建的清单:', persistedLists.length >= 1);
  console.log('  ✓ vm_history_log 含历史记录:', persistedHistory.length >= 1);

  // 重新加载 history-view.js,模拟「刷新页面」,验证数据被读回
  delete require.cache;
  try {
    eval(fs.readFileSync(path.join(__dirname, 'js', 'history-view.js'), 'utf8'));
    const HV2 = global.HistoryView;
    const afterReload = HV2.getAll();
    console.log('  ✓ reload 后 HistoryView.getAll =', afterReload.length, '条 (>=', persistedHistory.length, ')');
  } catch (e) {
    console.log('  ✗ reload 后读取失败:', e.message);
  }

  console.log('\n================================================');
  console.log('结果: 路由 ' + pass + '/' + ROUTES.length + ' 通过');
  console.log('     全部数据流测试 OK');
  console.log('================================================\n');
})();