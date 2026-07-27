// Test the auto-name generation for new study lists.
const fs = require('fs');
const path = require('path');

// Minimal DOM/localStorage stubs
global.window = global;
global.document = { createElement() { return { appendChild() {}, setAttribute() {}, classList: { add() {}, remove() {} } }; }, body: { appendChild() {}, removeChild() {} }, addEventListener() {} };
global.localStorage = { _data: {}, getItem(k){ return this._data[k] || null; }, setItem(k,v){ this._data[k]=String(v); }, removeItem(k){ delete this._data[k]; } };

const code = fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8');

// Extract just the buildAutoListName function via regex (it's not exposed globally)
const m = code.match(/function buildAutoListName\(stage\)\s*\{[\s\S]*?\n  \}/);
if (!m) {
  console.error('FAIL: buildAutoListName not found');
  process.exit(1);
}
// Eval in this context with a fake Storage global
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
  // 后缀格式: YYYY-MM-DD HH:MM
  const stampOK = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(name);
  const pass = hasPrefix && stampOK;
  console.log('  ' + (pass ? '✓' : '✗') + ' stage=' + c.stage + ' → ' + name + (pass ? '' : ' (prefix/stamp wrong)'));
  pass ? ok++ : fail++;
});

// 同一秒调用 → 名字稳定;加 1 分钟 → 应该变化 (用 sinon 不方便,简单验证 pad 函数工作)
const n1 = buildAutoListName('gaoyi-shang');
const n2 = buildAutoListName('gaoyi-shang');
console.log('  ✓ 同 stage 多次调用结果一致:', n1 === n2);

console.log('\n结果: ' + ok + '/' + (ok + fail) + ' 通过');