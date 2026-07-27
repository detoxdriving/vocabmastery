(function (global) {
  'use strict';

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'className') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k === 'on' && typeof attrs[k] === 'object') {
          Object.keys(attrs.on).forEach(function (evt) {
            node.addEventListener(evt, attrs.on[evt]);
          });
        } else if (k === 'type' || k === 'autocomplete' || k === 'placeholder' || k === 'value' || k === 'id' || k === 'name' || k === 'autofocus') {
          node[k] = attrs[k];
        } else {
          node.setAttribute(k, attrs[k]);
        }
      });
    }
    if (children && children.length) {
      children.forEach(function (c) {
        if (c == null) return;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return node;
  }

  var errorMessages = {
    'Invalid password': '密码错误',
    'Password required': '请输入密码',
    'APP_PASSWORD not configured': '服务端未配置密码',
    'Unauthorized': '登录已过期，请重新登录'
  };

  function translateError(msg) {
    return errorMessages[msg] || msg || '登录失败';
  }

  function render(container) {
    container.innerHTML = '';

    var input = el('input', {
      type: 'password',
      className: 'login-input',
      placeholder: '请输入登录密码',
      autocomplete: 'current-password',
      autofocus: 'autofocus'
    });
    var rememberBox = el('label', { className: 'login-remember' }, [
      el('input', {
        type: 'checkbox',
        className: 'login-remember-check',
        checked: Auth.hasSavedPassword() ? 'checked' : null
      }),
      el('span', { text: '记住此设备(30 天内自动登录)' })
    ]);
    var errorBox = el('div', { className: 'login-error', text: '' });

    function submit() {
      var pwd = input.value;
      if (!pwd) {
        errorBox.textContent = '请输入密码';
        input.focus();
        return;
      }
      btn.disabled = true;
      btn.textContent = '登录中...';
      errorBox.textContent = '';

      Auth.login(pwd)
        .then(function () {
          // 勾选"记住此设备"时把密码存到 localStorage,30 天内可静默登录
          var cb = rememberBox.querySelector('.login-remember-check');
          if (cb && cb.checked) {
            Auth.savePassword(pwd);
          } else {
            Auth.clearSavedPassword();
          }
          global.location.hash = '#/';
        })
        .catch(function (err) {
          errorBox.textContent = translateError(err && err.message);
          btn.disabled = false;
          btn.textContent = '登 录';
          input.value = '';
          input.focus();
        });
    }

    var btn = el('button', {
      className: 'btn btn-primary login-btn',
      text: '登 录',
      on: { click: submit }
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') submit();
    });

    var card = el('div', { className: 'login-card' }, [
      el('div', { className: 'login-brand' }, [
        el('div', { className: 'brand-logo', text: 'V' }),
        el('div', { className: 'login-brand-text', text: 'VocabMastery' })
      ]),
      el('div', { className: 'login-subtitle', text: '英语单词科学记忆' }),
      el('div', { className: 'login-form' }, [input, btn]),
      rememberBox,
      errorBox,
      el('div', { className: 'login-hint', text: '默认密码由管理员设置 · 勾选「记住此设备」可自动登录' })
    ]);

    container.appendChild(el('div', { className: 'login-view' }, [card]));

    // 自动用保存的密码填充(隐藏,仅本地便利)
    var saved = Auth.hasSavedPassword() ? '已知登录态,30 天内免输入' : null;
    if (saved) errorBox.textContent = saved;

    setTimeout(function () { input.focus(); }, 50);
  }

  global.LoginView = { render: render };
})(window);