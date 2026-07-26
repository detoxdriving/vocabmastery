(function (global) {
  'use strict';

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
      notify();
    }).catch(function () {
      state.user = null;
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
    user: function () { return state.user; },
    isLoggedIn: function () { return !!state.user; },
    isReady: function () { return state.ready; },
    onChange: onChange
  };
})(window);