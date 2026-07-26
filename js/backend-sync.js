/**
 * BackendSync - 对接 Supabase 后端 API
 * - 提供统一的 CRUD 接口
 * - 失败时静默降级到本地缓存
 * - 由 ApiClient 自动附加 cookie 鉴权
 */
(function (global) {
  'use strict';

  var CACHE_KEY = 'vm_backend_cache';
  var cache = null;

  function loadCache() {
    if (cache) return cache;
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      cache = raw ? JSON.parse(raw) : { lists: [], sessions: [], quizzes: [], tests: [] };
    } catch (e) {
      cache = { lists: [], sessions: [], quizzes: [], tests: [] };
    }
    return cache;
  }

  function saveCache() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {}
  }

  function uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10) +
           Math.random().toString(36).slice(2, 10);
  }

  function ok(value) { return Promise.resolve(value); }

  function silent(fn) {
    return fn().catch(function (e) {
      console.warn('[BackendSync] silent fallback:', (e && e.message) || e);
      return null;
    });
  }

  // ===== Lists =====
  var Lists = {
    list: function () {
      return silent(function () {
        return ApiClient.get('/api/lists').then(function (rows) {
          var c = loadCache();
          c.lists = Array.isArray(rows) ? rows : [];
          saveCache();
          return c.lists;
        });
      }).then(function (rows) { return rows || loadCache().lists; });
    },

    get: function (id) {
      return silent(function () {
        return ApiClient.get('/api/lists/' + encodeURIComponent(id));
      }).then(function (row) {
        if (row) return row;
        var c = loadCache();
        return c.lists.find(function (l) { return l.id === id; }) || null;
      });
    },

    create: function (payload) {
      return silent(function () {
        return ApiClient.post('/api/lists', {
          name: payload.name,
          stage: payload.stage,
          grade: payload.grade || 'all',
          word_ids: payload.wordIds || []
        });
      }).then(function (row) {
        if (row && row.id) {
          var c = loadCache();
          c.lists.unshift(row);
          saveCache();
          return row;
        }
        // 后端不可用 → 本地 fallback
        var local = {
          id: uuid(),
          name: payload.name || '清单',
          stage: payload.stage || 'junior',
          grade: payload.grade || 'all',
          wordIds: payload.wordIds || [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          _local: true
        };
        var c2 = loadCache();
        c2.lists.unshift(local);
        saveCache();
        return local;
      });
    },

    update: function (id, patch) {
      var body = {};
      if (patch.name !== undefined) body.name = patch.name;
      if (patch.grade !== undefined) body.grade = patch.grade;
      if (patch.wordIds !== undefined) body.word_ids = patch.wordIds;
      if (patch.archived !== undefined) body.archived = !!patch.archived;
      return silent(function () {
        return ApiClient.patch('/api/lists/' + encodeURIComponent(id), body);
      }).then(function (row) {
        var c = loadCache();
        var idx = c.lists.findIndex(function (l) { return l.id === id; });
        if (idx >= 0) {
          c.lists[idx] = Object.assign({}, c.lists[idx], patch, row || {});
          saveCache();
        }
        return row || (idx >= 0 ? c.lists[idx] : null);
      });
    },

    remove: function (id) {
      return silent(function () {
        return ApiClient.del('/api/lists/' + encodeURIComponent(id));
      }).then(function () {
        var c = loadCache();
        c.lists = c.lists.filter(function (l) { return l.id !== id; });
        saveCache();
        return true;
      });
    },

    addWord: function (id, wordId) {
      return Lists.get(id).then(function (list) {
        if (!list) return null;
        var ids = (list.word_ids || list.wordIds || []).slice();
        if (ids.indexOf(wordId) < 0) ids.push(wordId);
        return Lists.update(id, { wordIds: ids });
      });
    },

    removeWord: function (id, wordId) {
      return Lists.get(id).then(function (list) {
        if (!list) return null;
        var ids = (list.word_ids || list.wordIds || []).filter(function (x) { return x !== wordId; });
        return Lists.update(id, { wordIds: ids });
      });
    }
  };

  // ===== Sessions =====
  var Sessions = {
    record: function (payload) {
      var body = {
        list_id: payload.listId || null,
        stage: payload.stage || 'junior',
        type: payload.type || 'study',
        mode: payload.mode || '',
        word_count: payload.wordCount || 0,
        correct_count: payload.correctCount || 0,
        total_time: payload.totalTime || 0,
        score: payload.score || 0,
        wrong_word_ids: payload.wrongWordIds || [],
        started_at: payload.startedAt || new Date().toISOString(),
        finished_at: payload.finishedAt || new Date().toISOString()
      };
      return silent(function () {
        return ApiClient.post('/api/sessions', body);
      }).then(function (row) {
        var c = loadCache();
        if (row && row.id) c.sessions.unshift(row);
        else c.sessions.unshift(Object.assign({ id: uuid(), _local: true }, body));
        if (c.sessions.length > 1000) c.sessions = c.sessions.slice(0, 1000);
        saveCache();
        return row;
      });
    },

    listByList: function (listId) {
      return silent(function () {
        return ApiClient.get('/api/sessions?list_id=' + encodeURIComponent(listId));
      }).then(function (rows) {
        if (Array.isArray(rows) && rows.length) return rows;
        var c = loadCache();
        return c.sessions.filter(function (s) {
          return (s.list_id || s.listId) === listId;
        });
      });
    },

    recent: function () {
      return silent(function () {
        return ApiClient.get('/api/sessions?limit=100');
      }).then(function (rows) {
        if (Array.isArray(rows) && rows.length) {
          var c = loadCache();
          c.sessions = rows;
          saveCache();
          return rows;
        }
        return loadCache().sessions;
      });
    }
  };

  // ===== Quizzes =====
  var Quizzes = {
    record: function (payload) {
      var body = {
        list_id: payload.listId || null,
        stage: payload.stage || 'junior',
        mode: payload.mode || '',
        started_at: payload.startedAt || new Date().toISOString(),
        finished_at: payload.finishedAt || new Date().toISOString(),
        passed_at: payload.passedAt || null,
        score: payload.score || 0,
        word_count: payload.wordCount || 0,
        correct_count: payload.correctCount || 0,
        rounds: payload.rounds || []
      };
      return silent(function () {
        return ApiClient.post('/api/quizzes', body);
      }).then(function (row) {
        if (row && row.id) {
          var c = loadCache();
          c.quizzes.unshift(row);
          if (c.quizzes.length > 500) c.quizzes = c.quizzes.slice(0, 500);
          saveCache();
        }
        return row;
      });
    },

    list: function () {
      return silent(function () {
        return ApiClient.get('/api/quizzes?limit=200');
      }).then(function (rows) {
        if (Array.isArray(rows)) {
          var c = loadCache();
          c.quizzes = rows;
          saveCache();
          return rows;
        }
        return loadCache().quizzes;
      });
    }
  };

  // ===== Tests =====
  var Tests = {
    record: function (payload) {
      var body = {
        list_id: payload.listId || null,
        stage: payload.stage || 'junior',
        scope: payload.scope || 'all',
        mode: payload.mode || '',
        started_at: payload.startedAt || new Date().toISOString(),
        finished_at: payload.finishedAt || new Date().toISOString(),
        score: payload.score || 0,
        word_count: payload.wordCount || 0,
        correct_count: payload.correctCount || 0,
        total_time: payload.totalTime || 0,
        wrong_word_ids: payload.wrongWordIds || []
      };
      return silent(function () {
        return ApiClient.post('/api/tests', body);
      }).then(function (row) {
        if (row && row.id) {
          var c = loadCache();
          c.tests.unshift(row);
          if (c.tests.length > 500) c.tests = c.tests.slice(0, 500);
          saveCache();
        }
        return row;
      });
    },

    list: function () {
      return silent(function () {
        return ApiClient.get('/api/tests?limit=200');
      }).then(function (rows) {
        if (Array.isArray(rows)) {
          var c = loadCache();
          c.tests = rows;
          saveCache();
          return rows;
        }
        return loadCache().tests;
      });
    }
  };

  // ===== Wrong Book =====
  var WrongBook = {
    list: function () {
      return silent(function () {
        return ApiClient.get('/api/wrongbook');
      }).then(function (rows) {
        if (Array.isArray(rows)) return rows;
        return [];
      });
    },

    markResolved: function (wordId) {
      return silent(function () {
        return ApiClient.post('/api/wrongbook/' + encodeURIComponent(wordId) + '/resolve', {});
      }).then(function (row) { return row; });
    },

    remove: function (wordId) {
      return silent(function () {
        return ApiClient.del('/api/wrongbook/' + encodeURIComponent(wordId));
      }).then(function () { return true; });
    },

    isResolved: function (wordId) {
      return silent(function () {
        return ApiClient.get('/api/wrongbook/' + encodeURIComponent(wordId) + '/resolved');
      }).then(function (row) {
        return !!(row && row.resolved);
      });
    }
  };

  // ===== Stats =====
  var Stats = {
    summary: function (params) {
      var q = toQuery(params || {});
      return silent(function () {
        return ApiClient.get('/api/stats' + q);
      }).then(function (row) { return row || null; });
    },

    timeline: function (params) {
      var q = toQuery(params || {});
      return silent(function () {
        return ApiClient.get('/api/stats/timeline' + q);
      }).then(function (row) { return row || null; });
    },

    wrongbook: function () {
      return silent(function () {
        return ApiClient.get('/api/stats/wrongbook');
      }).then(function (row) { return row || null; });
    },

    resolve: function (wordId, source) {
      return silent(function () {
        return ApiClient.post('/api/stats/wrongbook', {
          word_id: wordId,
          source: source || 'manual'
        });
      }).then(function (row) { return row; });
    }
  };

  function toQuery(obj) {
    var parts = [];
    Object.keys(obj).forEach(function (k) {
      if (obj[k] != null && obj[k] !== '') {
        parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]));
      }
    });
    return parts.length ? '?' + parts.join('&') : '';
  }

  // ===== Round helper (用 word_id 数组构造 rounds) =====
  function buildRounds(wrongWordIds) {
    return (wrongWordIds || []).map(function (wid) {
      return { word_id: wid, passed: false, attempts: 1 };
    });
  }

  global.BackendSync = {
    Lists: Lists,
    Sessions: Sessions,
    Quizzes: Quizzes,
    Tests: Tests,
    WrongBook: WrongBook,
    Stats: Stats,
    uuid: uuid,
    buildRounds: buildRounds
  };
})(window);
