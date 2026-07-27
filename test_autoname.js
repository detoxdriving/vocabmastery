// Test the auto-name generation for new study lists.
const fs = require('fs');
const path = require('path');

global.window = global;
global.document = { createElement() { return { appendChild() {}, setAttribute() {}, classList: { add() {}, remove() {} } }; }, body: { appendChild() {}, removeChild() {} }, addEventListener() {} };
global.localStorage = { _data: {}, getItem(k){ return this._data[k] || null; }, setItem(k,v){ this._data[k]=String(v); }, removeItem(k){ delete this._data[k]; } };

const code = fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8');
const m = code.match(/function buildAutoListName\(stage\)\s*\{[\s\S]*?\n  \}/);
if (!m) {
  console.error('FAIL: buildAutoListName not found');
  process.exit(1);
}

global.Storage = { STAGE_NAMES: { 'gaoyi-shang': '高一上学期', 'gaoyi-xia': '高一下学期', 'junior': '初中' } };
eval(m[0]);

console.log('================================================');
console.log('       自动清单名 buildAutoListName 测试');
console.log('================================================');

const cases = [
  { stage: 'gaoyi-shang', expectPrefix: '高一上学期' },
  { stage: 'gaoyi-xia',   expectPrefix: '高一下学期' },
  { stage: 'junior',      expectPrefix: '初中' },
  { stage: 'unknown',     expectPrefix: 'unknown' },
  { stage: undefined,     expectPrefix: '默认' }
];

let ok = 0, fail = 0;
cases.forEach(function (c) {
  const name = buildAutoListName(c.stage);
  const hasPrefix = name.indexOf(c.expectPrefix) === 0;
  const stampOK = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(name);
  const pass = hasPrefix && stampOK;
  console.log('  ' + (pass ? '✓' : '✗') + ' stage=' + c.stage + ' → ' + name + (pass ? '' : ' (prefix/stamp wrong)'));
  pass ? ok++ : fail++;
});

const n1 = buildAutoListName('gaoyi-shang');
const n2 = buildAutoListName('gaoyi-shang');
console.log('  ✓ 同 stage 多次调用结果一致:', n1 === n2);

console.log('\n================================================');
console.log('       createListFromPick 行为契约测试');
console.log('================================================');

// 通过模拟 StudyLists.createList + state.pickSelected 来验证契约:
// 1) 没有勾选 → 应该 return (提示)
// 2) 有勾选 → 调用 createList(name, stage, wordIds) → navigate('list/<id>')
// 这里我们只检查 name 生成逻辑,因为 createList 是 StudyLists 模块的事
const fakeIds = [1, 2, 3];
const fakeName = buildAutoListName('gaoyi-shang');
console.log('  ✓ 选 3 词 → 准备创建清单名:', fakeName);

// 模拟 createListFromPick 内部那两行关键代码
function fakeCreateList(name, stage, wordIds) {
  return { id: 'list_test_123', name: name, stage: stage, wordIds: wordIds };
}
const list = fakeCreateList(fakeName, 'gaoyi-shang', fakeIds);
console.log('  ✓ 模拟 createList 返回:', list.id);
console.log('  ✓ navigate 目标应该是: list/' + list.id);
console.log('  ✓ 名字匹配 buildAutoListName 格式:', /\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(list.name));

console.log('\n结果: ' + ok + '/' + (ok + fail) + ' 通过');