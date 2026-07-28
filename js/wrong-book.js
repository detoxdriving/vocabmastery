(function (global) {
  'use strict';

  var CACHE_KEY = 'vm_wrongbook_cache';
  var META_KEY = 'vm_wrong_meta';

  function loadCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return { at: 0, items: [] };
      var obj = JSON.parse(raw);
      if (!Array.isArray(obj.items)) obj.items = [];
      return obj;
    } catch (e) {
      return { at: 0, items: [] };
    }
  }

  function saveCache(items) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        at: Date.now(),
        items: items || []
      }));
    } catch (e) {}
  }

  function loadMeta() {
    try {
      var raw = localStorage.getItem(META_KEY);
      if (!raw) return { frequency: {}, lastAt: {}, cleared: {} };
      var obj = JSON.parse(raw);
      if (!obj.cleared) obj.cleared = {};
      return obj;
    } catch (err) {
      return { frequency: {}, lastAt: {}, cleared: {} };
    }
  }

  function saveMeta(meta) {
    try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (err) {}
  }

  function bumpMeta(stage, wordId) {
    var meta = loadMeta();
    var key = stage + ':' + wordId;
    meta.frequency[key] = (meta.frequency[key] || 0) + 1;
    meta.lastAt[key] = Date.now();
    saveMeta(meta);
  }

  function markCleared(stage, wordId) {
    var meta = loadMeta();
    var key = stage + ':' + wordId;
    if (!meta.cleared[stage]) meta.cleared[stage] = {};
    meta.cleared[stage][wordId] = {
      clearedAt: Date.now(),
      frequency: meta.frequency[key] || 0
    };
    saveMeta(meta);
  }

  function getClearedIds(stage) {
    var meta = loadMeta();
    var bucket = (meta.cleared && meta.cleared[stage]) || {};
    return Object.keys(bucket);
  }

  function joinWithVocab(items, stage) {
    var vocab = Storage.getVocab(stage);
    return (items || []).map(function (it) {
      var w = vocab && vocab.words ? vocab.words.find(function (x) { return x.id === it.word_id; }) : null;
      return {
        wordId: it.word_id,
        word: w ? w.word : ('#' + it.word_id),
        translation: w ? (w.translation || '') : '',
        phonetic: w ? (w.phonetic || '') : '',
        frequency: it.wrong_count || 1,
        lastAt: it.latest_at ? new Date(it.latest_at).getTime() : Date.now(),
        source: it.source || 'test',
        sourceId: it.source_id || null,
        resolved: !!it.resolved
      };
    });
  }

  function getAll(stage) {
    var cache = loadCache();
    var items = cache.items || [];
    return joinWithVocab(items, stage);
  }

  function getAllFresh(stage) {
    if (!global.BackendSync) return Promise.resolve(getAll(stage));
    return BackendSync.WrongBook.list(stage).then(function (rows) {
      if (!Array.isArray(rows)) return getAll(stage);
      var local = loadCache();
      var localItems = local.items || [];
      var byId = {};
      rows.forEach(function (r) {
        if (r && r.word_id !== undefined) byId[r.word_id + '|' + r.stage] = Object.assign({}, r);
      });
      localItems.forEach(function (lit) {
        if (!lit || lit.word_id === undefined) return;
        var k = lit.word_id + '|' + lit.stage;
        if (byId[k]) {
          byId[k].wrong_count = Math.max(byId[k].wrong_count || 0, lit.wrong_count || 0);
          var localTs = lit.latest_at ? new Date(lit.latest_at).getTime() : 0;
          var serverTs = byId[k].latest_at ? new Date(byId[k].latest_at).getTime() : 0;
          if (localTs > serverTs) byId[k].latest_at = lit.latest_at;
        } else {
          byId[k] = Object.assign({}, lit);
        }
      });
      var merged = Object.keys(byId).map(function (k) { return byId[k]; });
      saveCache(merged);
      return joinWithVocab(merged, stage);
    });
  }

  function add(stage, wordId, source) {
    bumpMeta(stage, wordId);
    if (global.BackendSync) {
      BackendSync.WrongBook.add(stage, wordId, source || 'test').then(function () {
        return BackendSync.WrongBook.list(stage);
      }).then(function (rows) {
        if (Array.isArray(rows)) saveCache(rows);
      }).catch(function (e) {
        var cache = loadCache();
        var items = cache.items || [];
        var exists = items.find(function (it) { return it.stage === stage && it.word_id === wordId; });
        if (exists) {
          exists.wrong_count = (exists.wrong_count || 0) + 1;
          exists.latest_at = new Date().toISOString();
        } else {
          items.push({
            stage: stage, word_id: wordId, wrong_count: 1,
            latest_at: new Date().toISOString(),
            source: source || 'test', source_id: null, resolved: false
          });
        }
        saveCache(items);
      });
    } else {
      var cache = loadCache();
      var items = cache.items || [];
      var exists = items.find(function (it) { return it.stage === stage && it.word_id === wordId; });
      if (exists) {
        exists.wrong_count = (exists.wrong_count || 0) + 1;
        exists.latest_at = new Date().toISOString();
      } else {
        items.push({
          stage: stage, word_id: wordId, wrong_count: 1,
          latest_at: new Date().toISOString(),
          source: source || 'test', source_id: null, resolved: false
        });
      }
      saveCache(items);
    }
  }

  function remove(stage, wordId) {
    markCleared(stage, wordId);
    if (global.BackendSync) {
      BackendSync.WrongBook.markResolved(stage, wordId).catch(function () {});
    }
    var cache = loadCache();
    cache.items = (cache.items || []).filter(function (it) {
      return !(it.stage === stage && it.word_id === wordId);
    });
    saveCache(cache.items);
  }

  function isInBook(stage, wordId) {
    var cache = loadCache();
    if (cache && Array.isArray(cache.items)) {
      return cache.items.some(function (it) {
        return it.word_id === wordId && it.stage === stage && !it.resolved;
      });
    }
    return false;
  }

  function getStats(stage) {
    var items = getAll(stage).filter(function (it) { return !it.resolved; });
    var totalErrors = items.reduce(function (s, w) { return s + (w.frequency || 0); }, 0);
    return {
      stage: stage,
      total: items.length,
      uniqueWords: items.length,
      totalErrors: totalErrors,
      topFrequent: items.slice().sort(function (a, b) { return b.frequency - a.frequency; }).slice(0, 10)
    };
  }

  function getMostFrequent(stage, n) {
    n = n || 10;
    return getStats(stage).topFrequent.slice(0, n);
  }

  function clear(stage) {
    var items = (loadCache().items || []).filter(function (it) { return it.stage === stage; });
    items.forEach(function (it) { markCleared(stage, it.word_id); });
    if (global.BackendSync) {
      items.forEach(function (it) {
        BackendSync.WrongBook.markResolved(stage, it.word_id).catch(function () {});
      });
    }
    var cache = loadCache();
    cache.items = (cache.items || []).filter(function (it) { return it.stage !== stage; });
    saveCache(cache.items);
  }

  global.WrongBook = {
    getAll: getAll,
    getAllFresh: getAllFresh,
    add: add,
    remove: remove,
    isInBook: isInBook,
    getStats: getStats,
    getMostFrequent: getMostFrequent,
    getClearedIds: getClearedIds,
    clear: clear
  };
})(window);
