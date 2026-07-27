(function (global) {
  'use strict';

  var REMEMBER_KEY = 'vm_remember_login';

  var state = {
    user: null,
    ready: false,
    initPromise: null,
    listeners: []
  };

  function notify() {
    state.listeners.forEach(function (fn) {
      try { fn(state.user); } catch (e) { console.error('[Auth] listener error', e); }
    });
  }

  function getSavedPassword() {
    try {
      var raw = localStorage.getItem(REMEMBER_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || !obj.pwd) return null;
      // 30 天有效期
      if (Date.now() - (obj.ts || 0) > 30 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(REMEMBER_KEY);
        return null;
      }
      return obj.pwd;
    } catch (e) { return null; }
  }

  function savePassword(pwd) {
    try {
      localStorage.setItem(REMEMBER_KEY, JSON.stringify({ pwd: pwd, ts: Date.now() }));
    } catch (e) {}
  }

  function clearSavedPassword() {
    try { localStorage.removeItem(REMEMBER_KEY); } catch (e) {}
  }

  function silentLogin() {
    var pwd = getSavedPassword();
    if (!pwd) return Promise.reject(new Error('No saved password'));
    return ApiClient.login(pwd).then(function (data) {
      state.user = (data && data.user) || 'primary';
      notify();
      return state.user;
    });
  }

  function init() {
    if (state.initPromise) return state.initPromise;
    state.initPromise = ApiClient.me()
      .then(function (data) {
        state.user = (data && data.user) || null;
        state.ready = true;
        notify();
        return state.user;
      })
      .catch(function () {
        state.user = null;
        state.ready = true;
        notify();
        return null;
      });
    return state.initPromise;
  }

  function login(password) {
    return ApiClient.login(password).then(function (data) {
      state.user = (data && data.user) || 'primary';
      notify();
      return state.user;
    });
  }

  function logout() {
    return ApiClient.logout().then(function () {
      state.user = null;
      clearSavedPassword();
      notify();
    }).catch(function () {
      state.user = null;
      clearSavedPassword();
      notify();
    });
  }

  function onChange(fn) {
    state.listeners.push(fn);
    if (state.ready) {
      try { fn(state.user); } catch (e) {}
    }
  }

  global.Auth = {
    init: init,
    login: login,
    logout: logout,
    silentLogin: silentLogin,
    hasSavedPassword: function () { return !!getSavedPassword(); },
    savePassword: savePassword,
    clearSavedPassword: clearSavedPassword,
    user: function () { return state.user; },
    isLoggedIn: function () { return !!state.user; },
    isReady: function () { return state.ready; },
    onChange: onChange
  };
})(window);