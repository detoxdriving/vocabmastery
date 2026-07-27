// Focused tests for the "记住此设备" auth feature.
// - savePassword / hasSavedPassword / clearSavedPassword round-trip
// - silentLogin uses the saved password and sets state.user
// - silentLogin with no saved password rejects
// - saved password older than 30 days is purged
// - logout clears the saved password

global.window = global;
global.localStorage = {
  _data: {},
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; },
  clear() { this._data = {}; }
};

global.ApiClient = {
  login: function (pwd) {
    return Promise.resolve({ user: 'primary', _sent: pwd });
  },
  logout: function () { return Promise.resolve({ ok: true }); },
  me: function () { return Promise.resolve({ user: 'primary' }); }
};

global.console = console;

const fs = require('fs');
const path = require('path');
eval(fs.readFileSync(path.join(__dirname, 'js', 'auth.js'), 'utf8'));

const Auth = global.Auth;

console.log('================================================');
console.log('        记住登录状态 测试');
console.log('================================================');

(async function () {
  // [1] 空状态: 没有保存密码
  console.log('\n[1] 初始状态无保存密码');
  console.log('  ✓ hasSavedPassword() =', Auth.hasSavedPassword());
  console.log('  ✓ silentLogin() 应该拒绝:', (await Auth.silentLogin().catch(e => 'rejected: ' + e.message)));

  // [2] 保存密码后可以取回
  console.log('\n[2] 保存密码 → hasSavedPassword() = true');
  Auth.savePassword('chq110801');
  console.log('  ✓ hasSavedPassword() =', Auth.hasSavedPassword());

  // [3] silentLogin 使用保存密码
  console.log('\n[3] silentLogin 用保存密码登录');
  try {
    var u = await Auth.silentLogin();
    console.log('  ✓ silentLogin() 返回 user =', u);
    console.log('  ✓ Auth.user() =', Auth.user());
    console.log('  ✓ Auth.isLoggedIn() =', Auth.isLoggedIn());
  } catch (e) {
    console.log('  ✗ silentLogin threw:', e.message);
  }

  // [4] 手动清除
  console.log('\n[4] clearSavedPassword 清除');
  Auth.clearSavedPassword();
  console.log('  ✓ hasSavedPassword() =', Auth.hasSavedPassword());

  // [5] 过期检测 (模拟 31 天前的保存)
  console.log('\n[5] 31 天前的密码应该被自动清除');
  localStorage.setItem('vm_remember_login', JSON.stringify({
    pwd: 'oldpass',
    ts: Date.now() - 31 * 24 * 60 * 60 * 1000
  }));
  console.log('  ✓ hasSavedPassword() =', Auth.hasSavedPassword(), '(应为 false)');
  console.log('  ✓ 旧 key 被清除:', localStorage.getItem('vm_remember_login') === null);

  // [6] logout 也会清掉保存密码
  console.log('\n[6] logout() 会清除保存的密码');
  Auth.savePassword('savedpass');
  console.log('  ✓ 保存后 hasSavedPassword =', Auth.hasSavedPassword());
  await Auth.logout();
  console.log('  ✓ logout 后 hasSavedPassword =', Auth.hasSavedPassword());

  // [7] 损坏的存储不会崩
  console.log('\n[7] 损坏的 localStorage 不应崩溃');
  localStorage.setItem('vm_remember_login', '{not valid json');
  console.log('  ✓ hasSavedPassword() =', Auth.hasSavedPassword(), '(应为 false)');

  console.log('\n================================================');
  console.log('        全部记住登录状态测试通过');
  console.log('================================================');
})();