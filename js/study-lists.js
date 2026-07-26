(function (global) {
  'use strict';

  var KEY = 'study_lists';
  var SESSION_KEY = 'study_sessions';

  function load() {
    try {
      var raw = localStorage.getItem('vm_' + KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function save(lists) {
    try {
      localStorage.setItem('vm_' + KEY, JSON.stringify(lists));
      return true;
    } catch (e) {
      return false;
    }
  }

  function loadSessions() {
    try {
      var raw = localStorage.getItem('vm_' + SESSION_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveSessions(sessions) {
    try {
      if (sessions.length > 1000) {
        sessions = sessions.slice(sessions.length - 1000);
      }
      localStorage.setItem('vm_' + SESSION_KEY, JSON.stringify(sessions));
      return true;
    } catch (e) {
      return false;
    }
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function createList(opts) {
    opts = opts || {};
    var list = {
      id: uid(),
      name: opts.name || ('清单 ' + todayStr()),
      stage: opts.stage || 'junior',
      grade: opts.grade || 'all',
      wordIds: opts.wordIds || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      description: opts.description || ''
    };
    var lists = load();
    lists.push(list);
    save(lists);
    return list;
  }

  function getAllLists() {
    return load().sort(function (a, b) { return b.updatedAt - a.updatedAt; });
  }

  function getList(id) {
    var lists = load();
    for (var i = 0; i < lists.length; i++) {
      if (lists[i].id === id) return lists[i];
    }
    return null;
  }

  function updateList(id, patch) {
    var lists = load();
    for (var i = 0; i < lists.length; i++) {
      if (lists[i].id === id) {
        Object.keys(patch).forEach(function (k) {
          lists[i][k] = patch[k];
        });
        lists[i].updatedAt = Date.now();
        save(lists);
        return lists[i];
      }
    }
    return null;
  }

  function deleteList(id) {
    var lists = load().filter(function (l) { return l.id !== id; });
    save(lists);
    var sessions = loadSessions().filter(function (s) { return s.listId !== id; });
    saveSessions(sessions);
    return true;
  }

  function addWordToList(listId, wordId) {
    var list = getList(listId);
    if (!list) return null;
    if (list.wordIds.indexOf(wordId) >= 0) return list;
    list.wordIds.push(wordId);
    return updateList(listId, { wordIds: list.wordIds });
  }

  function removeWordFromList(listId, wordId) {
    var list = getList(listId);
    if (!list) return null;
    list.wordIds = list.wordIds.filter(function (id) { return id !== wordId; });
    return updateList(listId, { wordIds: list.wordIds });
  }

  function recordSession(opts) {
    opts = opts || {};
    var session = {
      id: uid(),
      listId: opts.listId || null,
      stage: opts.stage || 'junior',
      type: opts.type || 'study',
      mode: opts.mode || '',
      wordCount: opts.wordCount || 0,
      correctCount: opts.correctCount || 0,
      totalTime: opts.totalTime || 0,
      score: opts.score || 0,
      wrongWordIds: opts.wrongWordIds || [],
      createdAt: Date.now(),
      finishedAt: Date.now()
    };
    var sessions = loadSessions();
    sessions.push(session);
    saveSessions(sessions);
    if (session.listId) {
      var list = getList(session.listId);
      if (list) updateList(session.listId, { updatedAt: Date.now() });
    }
    return session;
  }

  function getSessionsByList(listId) {
    return loadSessions()
      .filter(function (s) { return s.listId === listId; })
      .sort(function (a, b) { return a.createdAt - b.createdAt; });
  }

  function getSession(id) {
    var sessions = loadSessions();
    for (var i = 0; i < sessions.length; i++) {
      if (sessions[i].id === id) return sessions[i];
    }
    return null;
  }

  function getRecentSessions(stage, n) {
    n = n || 20;
    var sessions = loadSessions();
    if (stage) {
      sessions = sessions.filter(function (s) { return !s.stage || s.stage === stage; });
    }
    return sessions.sort(function (a, b) { return b.createdAt - a.createdAt; }).slice(0, n);
  }

  function getListStats(listId) {
    var list = getList(listId);
    if (!list) return null;
    var sessions = getSessionsByList(listId);
    var studySessions = sessions.filter(function (s) { return s.type === 'study'; });
    var testSessions = sessions.filter(function (s) { return s.type === 'test'; });
    function aggregate(arr) {
      if (arr.length === 0) {
        return { count: 0, totalWords: 0, totalCorrect: 0, totalTime: 0, avgScore: 0, bestScore: 0, lastAt: null };
      }
      var tw = 0, tc = 0, tt = 0, sumScore = 0, best = 0, last = 0;
      arr.forEach(function (s) {
        tw += s.wordCount || 0;
        tc += s.correctCount || 0;
        tt += s.totalTime || 0;
        sumScore += s.score || 0;
        if ((s.score || 0) > best) best = s.score;
        if (s.createdAt > last) last = s.createdAt;
      });
      return {
        count: arr.length,
        totalWords: tw,
        totalCorrect: tc,
        totalTime: tt,
        avgScore: arr.length > 0 ? Math.round(sumScore / arr.length * 10) / 10 : 0,
        bestScore: best,
        lastAt: last
      };
    }
    return {
      list: list,
      wordCount: list.wordIds.length,
      study: aggregate(studySessions),
      test: aggregate(testSessions),
      allSessions: sessions
    };
  }

  function getListTrend(listId, type) {
    var sessions = getSessionsByList(listId);
    if (type) sessions = sessions.filter(function (s) { return s.type === type; });
    return sessions.map(function (s) {
      var d = new Date(s.createdAt);
      return {
        date: d.getFullYear() + '-' +
          String(d.getMonth() + 1).padStart(2, '0') + '-' +
          String(d.getDate()).padStart(2, '0'),
        score: s.score || 0,
        wordCount: s.wordCount || 0,
        correct: s.correctCount || 0,
        time: s.totalTime || 0,
        timestamp: s.createdAt
      };
    });
  }

  global.StudyLists = {
    createList: createList,
    getAllLists: getAllLists,
    getList: getList,
    updateList: updateList,
    deleteList: deleteList,
    addWordToList: addWordToList,
    removeWordFromList: removeWordFromList,
    recordSession: recordSession,
    getSessionsByList: getSessionsByList,
    getSession: getSession,
    getRecentSessions: getRecentSessions,
    getListStats: getListStats,
    getListTrend: getListTrend
  };
})(window);