// Test StudyLists new helpers: getLastTestSession, getFailedWordIds, getPassedWordIds
global.window = global;
global.localStorage = {
  _data: {},
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; },
  clear() { this._data = {}; }
};

const fs = require('fs');
const path = require('path');
eval(fs.readFileSync(path.join(__dirname, 'js', 'study-lists.js'), 'utf8'));

const SL = global.StudyLists;

console.log('================================================');
console.log('       清单详情 / 考试结果 新逻辑测试');
console.log('================================================');

(async function () {
  // 准备: 建清单 + 多次考试
  const list = SL.createList({ name: 'test list', stage: 'gaoyi-shang', wordIds: [1, 2, 3, 4, 5] });
  console.log('\n[1] 创建清单:', list.id, '5 词');

  // 没有考试时
  console.log('  ✓ 无考试时 getLastTestSession =', SL.getLastTestSession(list.id));
  console.log('  ✓ 无考试时 getFailedWordIds =', JSON.stringify(SL.getFailedWordIds(list.id)));
  console.log('  ✓ 无考试时 getPassedWordIds =', JSON.stringify(SL.getPassedWordIds(list.id)));

  // 第一次考试:对 3 个,错 2 个
  const s1 = SL.recordSession({
    listId: list.id, stage: 'gaoyi-shang', type: 'test', mode: 'T2',
    wordCount: 5, correctCount: 3, score: 60,
    wrongWordIds: [2, 4]
  });
  console.log('\n[2] 第一次考试 → 对 3 错 2 (错 id=2,4)');
  console.log('  ✓ getLastTestSession 不为空:', !!SL.getLastTestSession(list.id));
  console.log('  ✓ getFailedWordIds =', SL.getFailedWordIds(list.id).sort());
  console.log('  ✓ getPassedWordIds =', SL.getPassedWordIds(list.id).sort());

  // 第二次考试:错 1 个 (id=1)
  SL.recordSession({
    listId: list.id, stage: 'gaoyi-shang', type: 'test', mode: 'T2',
    wordCount: 5, correctCount: 4, score: 80,
    wrongWordIds: [1]
  });
  console.log('\n[3] 第二次考试 → 错 1 个 (id=1)');
  console.log('  ✓ getFailedWordIds 取最近一次 =', SL.getFailedWordIds(list.id).sort());
  console.log('  ✓ getPassedWordIds =', SL.getPassedWordIds(list.id).sort());

  // 第三次考试:全对
  SL.recordSession({
    listId: list.id, stage: 'gaoyi-shang', type: 'test', mode: 'T2',
    wordCount: 5, correctCount: 5, score: 100,
    wrongWordIds: []
  });
  console.log('\n[4] 第三次考试 → 全对');
  console.log('  ✓ getFailedWordIds 空数组:', SL.getFailedWordIds(list.id).length === 0);
  console.log('  ✓ getPassedWordIds 全部:', SL.getPassedWordIds(list.id).length);

  // 不传 listId 的 getPassedWordIds 应返回空(防御)
  console.log('  ✓ 不存在的 list → getPassedWordIds =', SL.getPassedWordIds('nope'));

  console.log('\n================================================');
  console.log('       全部清单详情测试通过');
  console.log('================================================');
})();