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

  function syncListToBackend(localList) {
    if (!global.BackendSync) return;
    if (localList._synced) return;
    BackendSync.Lists.create({
      name: localList.name,
      stage: localList.stage,
      grade: localList.grade || 'all',
      wordIds: localList.wordIds || []
    }).then(function (remote) {
      if (remote && remote.id) {
        var all = load();
        var idx = all.findIndex(function (l) { return l.id === localList.id; });
        if (idx >= 0) {
          all[idx]._synced = true;
          all[idx].remoteId = remote.id;
          save(all);
        }
      }
    }).catch(function () {});
  }

  function syncListUpdateToBackend(localList) {
    if (!global.BackendSync || !localList.remoteId) return;
    BackendSync.Lists.update(localList.remoteId, {
      name: localList.name,
      grade: localList.grade || 'all',
      wordIds: localList.wordIds || []
    }).catch(function () {});
  }

  function pullFromBackend() {
    if (!global.BackendSync) return Promise.resolve([]);
    return BackendSync.Lists.list().then(function (remote) {
      if (!Array.isArray(remote) || remote.length === 0) return load();
      var local = load();
      var merged = [];
      var processedIds = {};
      remote.forEach(function (r) {
        var localMatch = local.find(function (l) { return l.remoteId === r.id || l.id === r.id; });
        var remoteUpdatedAt = r.updated_at ? new Date(r.updated_at).getTime() : 0;
        var localUpdatedAt = localMatch ? (localMatch.updatedAt || 0) : 0;
        var finalWordIds = (localMatch && localMatch.wordIds) || (r.word_ids || r.wordIds || []);
        if (localMatch && localUpdatedAt > remoteUpdatedAt) {
          finalWordIds = localMatch.wordIds || [];
        }
        var entry = {
          id: r.id,
          remoteId: r.id,
          name: r.name,
          stage: r.stage,
          grade: r.grade || 'all',
          wordIds: finalWordIds,
          createdAt: localMatch ? (localMatch.createdAt || Date.now()) : Date.now(),
          updatedAt: Math.max(localUpdatedAt, remoteUpdatedAt) || Date.now(),
          _synced: true
        };
        if (localMatch) entry._localDirty = localMatch._localDirty || false;
        merged.push(entry);
        processedIds[r.id] = true;
      });
      local.forEach(function (l) {
        var alreadyIn = merged.find(function (m) { return m.id === l.id || (l.remoteId && m.id === l.remoteId); });
        if (!alreadyIn) {
          merged.push(l);
          if (!l.remoteId) syncListToBackend(l);
        }
      });
      save(merged);
      return merged;
    });
  }

  function markLocalDirty(listId, dirty) {
    var lists = load();
    for (var i = 0; i < lists.length; i++) {
      if (lists[i].id === listId) {
        lists[i]._localDirty = !!dirty;
        save(lists);
        return lists[i];
      }
    }
    return null;
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
    syncListToBackend(list);
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
        syncListUpdateToBackend(lists[i]);
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
    var target = load().find(function (l) { return l.id === id; });
    if (target && target.remoteId && global.BackendSync) {
      BackendSync.Lists.remove(target.remoteId).catch(function () {});
    }
    return true;
  }

  function addWordToList(listId, wordId) {
    var list = getList(listId);
    if (!list) return { ok: false, reason: 'not_found' };
    if (list.wordIds.indexOf(wordId) >= 0) {
      return { ok: true, list: list, added: false, duplicate: true };
    }
    list.wordIds.push(wordId);
    var saved = saveAllForList(listId, list, { wordIds: list.wordIds });
    if (!saved) return { ok: false, reason: 'save_failed' };
    syncListUpdateToBackend(saved);
    return { ok: true, list: saved, added: true, duplicate: false };
  }

  function saveAllForList(listId, sourceList, patch) {
    var lists = load();
    var idx = -1;
    for (var i = 0; i < lists.length; i++) {
      if (lists[i].id === listId) { idx = i; break; }
    }
    if (idx < 0) return null;
    Object.keys(patch).forEach(function (k) {
      lists[idx][k] = patch[k];
    });
    lists[idx].updatedAt = Date.now();
    if (!save(lists)) return null;
    return lists[idx];
  }

  function removeWordFromList(listId, wordId) {
    var list = getList(listId);
    if (!list) return { ok: false, reason: 'not_found' };
    list.wordIds = list.wordIds.filter(function (id) { return id !== wordId; });
    var saved = saveAllForList(listId, list, { wordIds: list.wordIds });
    if (!saved) return { ok: false, reason: 'save_failed' };
    syncListUpdateToBackend(saved);
    return { ok: true, list: saved };
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
      wordId: opts.wordId != null ? opts.wordId : null,
      studiedWordIds: opts.studiedWordIds || [],
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
    if (global.BackendSync) {
      var remoteListId = null;
      if (session.listId) {
        var l2 = getList(session.listId);
        if (l2 && l2.remoteId) remoteListId = l2.remoteId;
      }
      BackendSync.Sessions.record({
        listId: remoteListId,
        stage: session.stage,
        type: session.type,
        mode: session.mode,
        wordCount: session.wordCount,
        correctCount: session.correctCount,
        totalTime: session.totalTime,
        score: session.score,
        wrongWordIds: session.wrongWordIds,
        startedAt: new Date(session.createdAt).toISOString(),
        finishedAt: new Date(session.finishedAt).toISOString()
      }).catch(function () {});
    }
    return session;
  }

  function getSessionsByList(listId) {
    return loadSessions()
      .filter(function (s) { return s.listId === listId; })
      .sort(function (a, b) { return a.createdAt - b.createdAt; });
  }

  // 获取清单最近一次考试(取最近 1 条 type='test' 的 session)
  function getLastTestSession(listId) {
    var all = getSessionsByList(listId).filter(function (s) { return s.type === 'test'; });
    if (all.length === 0) return null;
    return all[all.length - 1];
  }

  // 获取清单中"上次考试不合格"的词 id 列表(最新一次 test session 的 wrongWordIds)
  function getFailedWordIds(listId) {
    var last = getLastTestSession(listId);
    return last && last.wrongWordIds ? last.wrongWordIds.slice() : [];
  }

  // 获取清单中"上次考试已通过"的词 id 列表(最新 test 的 rightWordIds)
  // 我们没存 rightWordIds,从 wordIds - wrongWordIds 推算
  function getPassedWordIds(listId) {
    var list = getList(listId);
    if (!list) return [];
    var last = getLastTestSession(listId);
    if (!last) return [];
    var wrongSet = {};
    (last.wrongWordIds || []).forEach(function (id) { wrongSet[id] = true; });
    return (list.wordIds || []).filter(function (id) { return !wrongSet[id]; });
  }

  // 获取清单中"已被学过的词"(有 study session 记录)
  function getStudiedWordIds(listId) {
    var sessions = getSessionsByList(listId).filter(function (s) { return s.type === 'study'; });
    var seen = {};
    sessions.forEach(function (s) {
      if (s.wordId != null) seen[s.wordId] = true;
      (s.studiedWordIds || []).forEach(function (id) { seen[id] = true; });
    });
    return Object.keys(seen);
  }

  // 跨清单聚合(按学期): 收集某 stage 下所有清单中"上次考试已通过"的词 id
  function getAllPassedWordIds(stage, grade) {
    var lists = getAllLists().filter(function (l) { return l.stage === stage; });
    if (grade && grade !== 'all') {
      lists = lists.filter(function (l) { return (l.grade || 'all') === grade; });
    }
    var set = {};
    lists.forEach(function (l) {
      getPassedWordIds(l.id).forEach(function (id) { set[id] = l.id; });
    });
    return Object.keys(set);
  }

  // 跨清单聚合(按学期): 收集某 stage 下所有清单中"上次考试未通过"的词 id
  function getAllFailedWordIds(stage, grade) {
    var lists = getAllLists().filter(function (l) { return l.stage === stage; });
    if (grade && grade !== 'all') {
      lists = lists.filter(function (l) { return (l.grade || 'all') === grade; });
    }
    var set = {};
    lists.forEach(function (l) {
      getFailedWordIds(l.id).forEach(function (id) { set[id] = l.id; });
    });
    return Object.keys(set);
  }

  // 跨清单聚合(按学期): 收集某 stage 下所有清单中"已被学过"的词 id
  function getAllStudiedWordIds(stage, grade) {
    var lists = getAllLists().filter(function (l) { return l.stage === stage; });
    if (grade && grade !== 'all') {
      lists = lists.filter(function (l) { return (l.grade || 'all') === grade; });
    }
    var set = {};
    lists.forEach(function (l) {
      getStudiedWordIds(l.id).forEach(function (id) { set[id] = true; });
    });
    return Object.keys(set);
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
    getLastTestSession: getLastTestSession,
    getFailedWordIds: getFailedWordIds,
    getPassedWordIds: getPassedWordIds,
    getStudiedWordIds: getStudiedWordIds,
    getAllPassedWordIds: getAllPassedWordIds,
    getAllFailedWordIds: getAllFailedWordIds,
    getAllStudiedWordIds: getAllStudiedWordIds,
    getSession: getSession,
    getRecentSessions: getRecentSessions,
    getListStats: getListStats,
    getListTrend: getListTrend,
    pullFromBackend: pullFromBackend,
    syncListToBackend: syncListToBackend,
    markLocalDirty: markLocalDirty
  };
})(window);
