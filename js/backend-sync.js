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

  function strict(fn) {
    return fn().catch(function (e) {
      console.error('[BackendSync] strict fail:', (e && e.message) || e);
      throw e;
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
      // 关键:把单词级别数据塞进 results jsonb,这样跨设备拉取时能还原"已学"状态
      // - 单词学习(L1):wordId=单个词,studiedWordIds=[相同]
      // - 批量测试:可不传(只需 wrongWordIds)
      var results = [];
      var wid = payload.wordId;
      var studyIds = payload.studiedWordIds || [];
      if (wid != null) {
        results.push({ kind: 'study', wordId: wid });
      }
      if (studyIds && studyIds.length) {
        studyIds.forEach(function (id) {
          if (id !== wid) results.push({ kind: 'study', wordId: id });
        });
      }
      // 错词也存档(冗余但便于分析)
      if (payload.wrongWordIds && payload.wrongWordIds.length) {
        payload.wrongWordIds.forEach(function (id) {
          results.push({ kind: 'wrong', wordId: id });
        });
      }
      if (results.length > 0) body.results = results;
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

    // 把云端 session 行(携带 results jsonb)还原成本地 session 对象
    // 本地 session 期望字段:{ id, listId, wordId, studiedWordIds, wrongWordIds, ... }
    _normalizeRemote: function (row) {
      if (!row) return null;
      var studiedWordIds = [];
      var wordId = null;
      var resultsArr = row.results;
      // results 既可能是数组,也可能是 {type, mode, ...} 汇总对象
      if (Array.isArray(resultsArr)) {
        resultsArr.forEach(function (r) {
          if (r && r.kind === 'study' && r.wordId != null) {
            if (wordId == null) wordId = r.wordId;
            studiedWordIds.push(r.wordId);
          }
        });
      }
      return {
        id: row.id,
        listId: row.list_id || row.listId,
        stage: row.stage || 'junior',
        type: row.type || 'study',
        mode: row.mode || '',
        wordCount: row.word_count || 0,
        correctCount: row.correct_count || 0,
        totalTime: row.total_time || 0,
        score: row.score || 0,
        wrongWordIds: row.wrong_word_ids || [],
        wordId: wordId,
        studiedWordIds: studiedWordIds,
        createdAt: row.started_at ? new Date(row.started_at).getTime() : Date.now(),
        finishedAt: row.finished_at ? new Date(row.finished_at).getTime() : Date.now()
      };
    },

    listByList: function (listId) {
      return silent(function () {
        return ApiClient.get('/api/sessions?list_id=' + encodeURIComponent(listId));
      }).then(function (rows) {
        if (Array.isArray(rows) && rows.length) {
          // 全部规范化
          return rows.map(function (r) { return Sessions._normalizeRemote(r); }).filter(Boolean);
        }
        var c = loadCache();
        return c.sessions.filter(function (s) {
          return (s.list_id || s.listId) === listId;
        });
      });
    },

    // 跨设备拉所有 sessions(用于 pullFromBackend 还原 learned 状态)
    recentAll: function () {
      return silent(function () {
        return ApiClient.get('/api/sessions?limit=500');
      }).then(function (rows) {
        if (Array.isArray(rows) && rows.length) {
          return rows.map(function (r) { return Sessions._normalizeRemote(r); }).filter(Boolean);
        }
        return loadCache().sessions || [];
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

  // ===== Network state (供 app.js 顶部 banner 使用) =====
  var online = (typeof navigator !== 'undefined' && navigator.onLine !== false);
  function isOnline() { return online; }
  if (typeof window !== 'undefined') {
    window.addEventListener('online', function () { online = true; });
    window.addEventListener('offline', function () { online = false; });
  }

  // ===== Progress (v2 · word_progress 表 · 严格) =====
  var PROGRESS_CACHE_KEY = 'vm_progress_cache';
  var progressCache = null;
  function loadProgressCache() {
    if (progressCache) return progressCache;
    try {
      var raw = localStorage.getItem(PROGRESS_CACHE_KEY);
      progressCache = raw ? JSON.parse(raw) : {};
    } catch (e) { progressCache = {}; }
    return progressCache;
  }
  function saveProgressCache() {
    try { localStorage.setItem(PROGRESS_CACHE_KEY, JSON.stringify(progressCache)); } catch (e) {}
  }
  function setProgressCache(stage, wordId, row) {
    var c = loadProgressCache();
    c[stage] = c[stage] || {};
    c[stage][wordId] = row;
    saveProgressCache();
  }
  function setProgressBulk(rows) {
    var c = loadProgressCache();
    (rows || []).forEach(function (r) {
      c[r.stage] = c[r.stage] || {};
      c[r.stage][r.word_id] = r;
    });
    saveProgressCache();
  }
  function getProgressCache(stage) {
    var c = loadProgressCache();
    return (c[stage] && Object.values(c[stage])) || [];
  }
  function getCardFromCache(stage, wordId) {
    var c = loadProgressCache();
    return (c[stage] && c[stage][wordId]) || null;
  }

  var Progress = {
    list: function (stage) {
      var q = stage ? ('?stage=' + encodeURIComponent(stage)) : '';
      return strict(function () {
        return ApiClient.get('/api/progress' + q);
      }).then(function (rows) {
        if (Array.isArray(rows) && stage) {
          var c = loadProgressCache(); c[stage] = {};
          rows.forEach(function (r) { c[stage][r.word_id] = r; });
          saveProgressCache();
        } else if (Array.isArray(rows)) {
          rows.forEach(function (r) { setProgressCache(r.stage, r.word_id, r); });
        }
        return rows || [];
      });
    },

    listAll: function () {
      return strict(function () {
        return ApiClient.get('/api/progress');
      }).then(function (rows) {
        if (Array.isArray(rows)) {
          progressCache = {};
          rows.forEach(function (r) { setProgressCache(r.stage, r.word_id, r); });
        }
        return rows || [];
      });
    },

    get: function (stage, wordId) {
      var cached = getCardFromCache(stage, wordId);
      return strict(function () {
        return ApiClient.get('/api/progress?stage=' + encodeURIComponent(stage));
      }).then(function (rows) {
        var hit = null;
        if (Array.isArray(rows)) {
          hit = rows.find(function (r) { return r.word_id === wordId; }) || null;
          if (hit) setProgressCache(stage, wordId, hit);
        }
        return hit || cached;
      });
    },

    upsert: function (stage, card) {
      var row = {
        stage: stage,
        word_id: card.wordId || card.word_id,
        ef: typeof card.ef === 'number' ? card.ef : 2.5,
        interval_days: card.interval || card.interval_days || 0,
        repetitions: card.repetitions || 0,
        due_date: card.dueDate || card.due_date || null,
        last_reviewed: card.lastReviewed || card.last_reviewed || new Date().toISOString(),
        lapses: card.lapses || 0,
        stats: card.stats || {}
      };
      return strict(function () {
        return ApiClient.post('/api/progress', { rows: [row] });
      }).then(function (out) {
        var saved = (Array.isArray(out) && out[0]) || (out && out[0]) || Object.assign({ user_id: 'primary' }, row);
        setProgressCache(stage, row.word_id, saved);
        return saved;
      });
    },

    upsertBatch: function (rows) {
      if (!rows || !rows.length) return Promise.resolve([]);
      var payload = rows.map(function (card) {
        return {
          stage: card.stage,
          word_id: card.wordId || card.word_id,
          ef: typeof card.ef === 'number' ? card.ef : 2.5,
          interval_days: card.interval || card.interval_days || 0,
          repetitions: card.repetitions || 0,
          due_date: card.dueDate || card.due_date || null,
          last_reviewed: card.lastReviewed || card.last_reviewed || new Date().toISOString(),
          lapses: card.lapses || 0,
          stats: card.stats || {}
        };
      });
      return strict(function () {
        return ApiClient.post('/api/progress', { rows: payload });
      }).then(function (out) {
        if (Array.isArray(out)) setProgressBulk(out);
        return out || payload;
      });
    },

    remove: function (stage, wordId) {
      return strict(function () {
        return ApiClient.del('/api/progress?stage=' + encodeURIComponent(stage) + '&word_id=' + wordId);
      }).then(function () {
        var c = loadProgressCache();
        if (c[stage]) { delete c[stage][wordId]; saveProgressCache(); }
        return true;
      });
    },

    getCardCached: function (stage, wordId) {
      return getCardFromCache(stage, wordId);
    },

    getStageCached: function (stage) {
      return getProgressCache(stage);
    }
  };

  // ===== Attempts (v2 · attempts 表 · 严格) =====
  var Attempts = {
    list: function (opts) {
      opts = opts || {};
      var q = [];
      if (opts.stage) q.push('stage=' + encodeURIComponent(opts.stage));
      if (opts.wordId) q.push('word_id=' + opts.wordId);
      if (opts.limit) q.push('limit=' + opts.limit);
      var qs = q.length ? ('?' + q.join('&')) : '';
      return strict(function () {
        return ApiClient.get('/api/attempts' + qs);
      }).then(function (rows) { return rows || []; });
    },

    record: function (entry) {
      var row = {
        stage: entry.stage || 'junior',
        word_id: entry.wordId || entry.word_id,
        mode: entry.mode || 'unknown',
        correct: !!entry.correct,
        time_ms: entry.timeMs || entry.time_ms || 0,
        list_id: entry.listId || entry.list_id || null,
        session_id: entry.sessionId || entry.session_id || null
      };
      return strict(function () {
        return ApiClient.post('/api/attempts', { rows: [row] });
      }).then(function (out) { return (Array.isArray(out) && out[0]) || row; });
    },

    recordBatch: function (entries) {
      if (!entries || !entries.length) return Promise.resolve([]);
      var payload = entries.map(function (e) {
        return {
          stage: e.stage || 'junior',
          word_id: e.wordId || e.word_id,
          mode: e.mode || 'unknown',
          correct: !!e.correct,
          time_ms: e.timeMs || e.time_ms || 0,
          list_id: e.listId || e.list_id || null,
          session_id: e.sessionId || e.session_id || null
        };
      });
      return strict(function () {
        return ApiClient.post('/api/attempts', { rows: payload });
      }).then(function (out) { return out || payload; });
    }
  };

  // ===== WrongBook v2 (切换到 wrong_book 表 · 严格) =====
  var WRONG_CACHE_KEY = 'vm_wrong_v2_cache';
  var wrongCache = null;
  function loadWrongCache() {
    if (wrongCache) return wrongCache;
    try {
      var raw = localStorage.getItem(WRONG_CACHE_KEY);
      wrongCache = raw ? JSON.parse(raw) : { items: [] };
    } catch (e) { wrongCache = { items: [] }; }
    return wrongCache;
  }
  function saveWrongCache() {
    try { localStorage.setItem(WRONG_CACHE_KEY, JSON.stringify(wrongCache)); } catch (e) {}
  }

  WrongBook.list = function (stage) {
    var q = stage ? ('?stage=' + encodeURIComponent(stage)) : '';
    return strict(function () {
      return ApiClient.get('/api/wrongbook-v2' + q);
    }).then(function (rows) {
      wrongCache = { items: rows || [] };
      saveWrongCache();
      return rows || [];
    });
  };

  WrongBook.add = function (stage, wordId, source) {
    return strict(function () {
      return ApiClient.post('/api/wrongbook-v2', {
        rows: [{
          stage: stage,
          word_id: wordId,
          wrong_count: 1,
          latest_at: new Date().toISOString(),
          resolved: false,
          source: source || 'manual'
        }]
      });
    }).then(function (out) {
      var c = loadWrongCache();
      var idx = c.items.findIndex(function (x) { return x.stage === stage && x.word_id === wordId; });
      var row = (Array.isArray(out) && out[0]) || {
        stage: stage, word_id: wordId, wrong_count: 1, resolved: false
      };
      if (idx >= 0) c.items[idx] = Object.assign({}, c.items[idx], row);
      else c.items.unshift(row);
      saveWrongCache();
      return row;
    });
  };

  WrongBook.bump = function (stage, wordId, source) {
    return strict(function () {
      return ApiClient.patch('/api/wrongbook-v2', {
        stage: stage,
        word_id: wordId,
        latest_at: new Date().toISOString(),
        source: source || 'manual'
      });
    }).then(function (row) { return row; });
  };

  WrongBook.markResolved = function (stage, wordId) {
    return strict(function () {
      return ApiClient.patch('/api/wrongbook-v2', {
        stage: stage, word_id: wordId, resolved: true
      });
    }).then(function (row) {
      var c = loadWrongCache();
      var item = c.items.find(function (x) { return x.stage === stage && x.word_id === wordId; });
      if (item) item.resolved = true;
      saveWrongCache();
      return row;
    });
  };

  WrongBook.markUnresolved = function (stage, wordId) {
    return strict(function () {
      return ApiClient.patch('/api/wrongbook-v2', {
        stage: stage, word_id: wordId, resolved: false
      });
    }).then(function (row) { return row; });
  };

  WrongBook.remove = function (stage, wordId) {
    return strict(function () {
      return ApiClient.del('/api/wrongbook-v2?stage=' + encodeURIComponent(stage) + '&word_id=' + wordId);
    }).then(function () {
      var c = loadWrongCache();
      c.items = c.items.filter(function (x) { return !(x.stage === stage && x.word_id === wordId); });
      saveWrongCache();
      return true;
    });
  };

  WrongBook.getCached = function () {
    return loadWrongCache().items || [];
  };

  global.BackendSync = {
    Lists: Lists,
    Sessions: Sessions,
    Quizzes: Quizzes,
    Tests: Tests,
    WrongBook: WrongBook,
    Stats: Stats,
    Progress: Progress,
    Attempts: Attempts,
    uuid: uuid,
    buildRounds: buildRounds,
    isOnline: isOnline,
    _setOnline: function (v) { online = !!v; }
  };
})(window);
