(function (global) {
  'use strict';

  function ApiError(message, status) {
    this.message = message;
    this.status = status;
  }
  ApiError.prototype = Object.create(Error.prototype);

  function request(path, opts) {
    opts = opts || {};
    var method = opts.method || 'GET';
    var body = opts.body;
    var headers = { 'Content-Type': 'application/json' };
    if (opts.headers) {
      Object.keys(opts.headers).forEach(function (k) { headers[k] = opts.headers[k]; });
    }
    var init = {
      method: method,
      headers: headers,
      credentials: 'include'
    };
    if (body !== undefined && body !== null) {
      init.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    return fetch(path, init).then(function (res) {
      var ct = res.headers.get('content-type') || '';
      var data;
      if (ct.indexOf('application/json') >= 0) {
        data = res.json().catch(function () { return {}; });
      } else {
        data = res.text().then(function (t) { return { raw: t }; });
      }
      return data.then(function (parsed) {
        if (!res.ok) {
          var msg = (parsed && parsed.error) || ('HTTP ' + res.status);
          if (res.status === 401 && !opts.skipAuthRedirect) {
            global.location.hash = '#/login';
          }
          throw new ApiError(msg, res.status);
        }
        return parsed;
      });
    });
  }

  global.ApiClient = {
    request: request,
    get: function (path) { return request(path, { method: 'GET' }); },
    post: function (path, body) { return request(path, { method: 'POST', body: body }); },
    patch: function (path, body) { return request(path, { method: 'PATCH', body: body }); },
    del: function (path) { return request(path, { method: 'DELETE' }); },
    login: function (password) { return request('/api/login', { method: 'POST', body: { password: password } }); },
    logout: function () { return request('/api/logout', { method: 'POST', skipAuthRedirect: true }); },
    me: function () { return request('/api/me', { skipAuthRedirect: true }); }
  };
})(window);